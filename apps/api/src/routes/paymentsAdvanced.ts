import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { PaymentService } from '../services/paymentService';

export async function paymentsAdvancedRoutes(fastify: FastifyInstance) {
  const paymentService = new PaymentService(fastify.prisma);
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey && process.env.NODE_ENV === 'production') {
    throw new Error('[PAYMENTS ADVANCED] STRIPE_SECRET_KEY is required in production — refusing to start without it');
  }
  if (!stripeKey) {
    fastify.log.warn('[PAYMENTS ADVANCED] STRIPE_SECRET_KEY not set — Stripe calls will fail');
  }
  const stripe = new Stripe(stripeKey || 'sk_test_placeholder_will_fail');

  // ========== Stripe Connect Onboarding ==========

  /**
   * POST /payments/connect/create-account
   * Create a new Stripe Connect account for authenticated user
   */
  fastify.post<{
    Body: { accountType: 'express' | 'standard' };
  }>(
    '/payments/connect/create-account',
    {
      schema: {
        body: {
          type: 'object',
          required: ['accountType'],
          properties: {
            accountType: {
              type: 'string',
              enum: ['express', 'standard'],
              description: 'Type of Stripe Connect account',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accountLink: { type: 'string' },
              stripeAccountId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;
      const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId) : null;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const body = request.body as { accountType: string };
        const { accountType } = body;
        const result = await paymentService.createConnectedAccount(
          userId,
          dropzoneId,
          accountType as 'express' | 'standard'
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create account' });
      }
    }
  );

  /**
   * GET /payments/connect/onboarding-link
   * Get fresh onboarding link for existing account
   */
  fastify.get<{
    Querystring: {
      stripeAccountId: string;
      refreshUrl?: string;
      returnUrl?: string;
    };
  }>(
    '/payments/connect/onboarding-link',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['stripeAccountId'],
          properties: {
            stripeAccountId: { type: 'string' },
            refreshUrl: { type: 'string' },
            returnUrl: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const query = request.query as { stripeAccountId: string; refreshUrl?: string; returnUrl?: string };
        const { stripeAccountId, refreshUrl, returnUrl } = query;
        const url = await paymentService.getOnboardingLink(
          stripeAccountId,
          refreshUrl || `${process.env.FRONTEND_URL}/payments/connect/refresh`,
          returnUrl || `${process.env.FRONTEND_URL}/payments/connect/success`
        );

        return reply.send({ url });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to get onboarding link' });
      }
    }
  );

  /**
   * GET /payments/connect/account-status
   * Get current status of connected account
   */
  fastify.get(
    '/payments/connect/account-status',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              chargesEnabled: { type: 'boolean' },
              payoutsEnabled: { type: 'boolean' },
              detailsSubmitted: { type: 'boolean' },
              onboardingComplete: { type: 'boolean' },
              defaultCurrency: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const account = await fastify.prisma.stripeAccount.findFirst({
          where: {
            userId,
          },
        });

        if (!account) {
          return reply.status(404).send({ error: 'No connected account found' });
        }

        return reply.send({
          chargesEnabled: account.chargesEnabled,
          payoutsEnabled: account.payoutsEnabled,
          detailsSubmitted: account.detailsSubmitted,
          onboardingComplete: account.onboardingComplete,
          defaultCurrency: account.defaultCurrency,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to get account status' });
      }
    }
  );

  // ========== Payment Creation ==========

  /**
   * POST /payments/create-intent
   * Create a new payment intent with automatic split calculation
   */
  fastify.post<{
    Body: {
      amount: number;
      currency: string;
      description?: string;
      referenceType?: string;
      referenceId?: string;
      splits?: Array<{
        recipientType: 'DROPZONE' | 'COACH' | 'PLATFORM';
        recipientId: number;
        percentage: number;
      }>;
    };
  }>(
    '/payments/create-intent',
    {
      schema: {
        body: {
          type: 'object',
          required: ['amount', 'currency'],
          properties: {
            amount: { type: 'number', description: 'Amount in cents' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            description: { type: 'string' },
            referenceType: { type: 'string' },
            referenceId: { type: 'string' },
            splits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  recipientType: {
                    type: 'string',
                    enum: ['DROPZONE', 'COACH', 'PLATFORM'],
                  },
                  recipientId: { type: 'number' },
                  percentage: { type: 'number' },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              paymentIntentId: { type: 'number' },
              clientSecret: { type: 'string' },
              splits: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    recipientType: { type: 'string' },
                    amount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;
      const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId) : null;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const body = request.body as {
          amount: number;
          currency: string;
          description?: string;
          referenceType?: string;
          referenceId?: string;
          splits?: Array<{
            recipientType: 'DROPZONE' | 'COACH' | 'PLATFORM';
            recipientId: number;
            percentage: number;
          }>;
        };
        const {
          amount,
          currency,
          description,
          referenceType,
          referenceId,
          splits,
        } = body;

        // Use provided splits or calculate from config
        let finalSplits = splits;
        if (!splits || splits.length === 0) {
          const splitConfig = paymentService.getPaymentSplitConfig(
            referenceType || 'default',
            dropzoneId || 0
          );

          // Convert split config to splits array
          finalSplits = Object.entries(splitConfig).map(([type, percentage]) => ({
            recipientType: type.toUpperCase() as 'DROPZONE' | 'COACH' | 'PLATFORM',
            recipientId: dropzoneId || 0,
            percentage: percentage as number,
          }));
        }

        const result = await paymentService.createPaymentWithSplits({
          userId,
          dropzoneId,
          amount,
          currency,
          description,
          referenceType,
          referenceId,
          splits: finalSplits || [],
        });

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(400)
          .send({ error: error instanceof Error ? error.message : 'Failed to create intent' });
      }
    }
  );

  /**
   * GET /payments/intents
   * List user's payment intents with pagination
   */
  fastify.get<{
    Querystring: {
      status?: string;
      startDate?: string;
      endDate?: string;
      skip?: string;
      take?: string;
    };
  }>(
    '/payments/intents',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            skip: { type: 'string' },
            take: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              intents: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const query = request.query as { status?: string; startDate?: string; endDate?: string; skip?: string; take?: string };
        const skip = parseInt(query.skip || '0');
        const take = parseInt(query.take || '20');

        const where: any = { userId };
        if (query.status) {
          where.status = query.status;
        }
        if (query.startDate || query.endDate) {
          where.createdAt = {};
          if (query.startDate) {
            where.createdAt.gte = new Date(query.startDate);
          }
          if (query.endDate) {
            where.createdAt.lte = new Date(query.endDate);
          }
        }

        const [intents, total] = await Promise.all([
          fastify.prisma.paymentIntent.findMany({
            where,
            include: { splits: true },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
          }),
          fastify.prisma.paymentIntent.count({ where }),
        ]);

        return reply.send({ intents, total });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to list intents' });
      }
    }
  );

  /**
   * GET /payments/intents/:id
   * Get specific payment intent with splits
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/payments/intents/:id',
    {
      schema: {
        response: {
          200: {
            type: 'object',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id);
        const intent = await fastify.prisma.paymentIntent.findUnique({
          where: { id },
          include: { splits: true },
        });

        if (!intent) {
          return reply.status(404).send({ error: 'Intent not found' });
        }

        // Verify user owns this intent
        if (intent.userId !== userId) {
          return reply.status(403).send({ error: 'Forbidden' });
        }

        return reply.send(intent);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to get intent' });
      }
    }
  );

  // ========== Refunds ==========

  /**
   * POST /payments/intents/:id/refund
   * Process full or partial refund
   */
  fastify.post<{
    Params: { id: string };
    Body: { amount?: number };
  }>(
    '/payments/intents/:id/refund',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Amount in cents (omit for full refund)' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id);
        const body = request.body as { amount?: number };

        // Verify ownership
        const intent = await fastify.prisma.paymentIntent.findUnique({
          where: { id },
        });

        if (!intent) {
          return reply.status(404).send({ error: 'Intent not found' });
        }

        if (intent.userId !== userId) {
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // For amounts > $100 (10000 cents), require step-up MFA verification
        if (body.amount && body.amount > 10000) {
          // Validate MFA: check for recent verified MFA session in DB
          const userId = parseInt(request.user.sub);
          const recentMfa = await fastify.prisma.mFAVerification?.findFirst?.({
            where: {
              userId,
              verifiedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // within 15 min
              method: { in: ['TOTP', 'WEBAUTHN', 'EMAIL'] },
            },
            orderBy: { verifiedAt: 'desc' },
          }).catch(() => null);

          // Also accept JWT-level MFA claim as fallback
          const jwtMfaVerified = (request.user as any)?.mfaVerified === true;

          if (!recentMfa && !jwtMfaVerified) {
            return reply.status(403).send({
              error: 'MFA verification required for refunds over $100',
              code: 'MFA_REQUIRED',
            });
          }
        }

        await paymentService.processRefund(id, body.amount);

        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(400)
          .send({ error: error instanceof Error ? error.message : 'Failed to process refund' });
      }
    }
  );

  // ========== Payouts ==========

  /**
   * GET /payments/payouts
   * List payouts for authenticated user's connected account
   */
  fastify.get<{
    Querystring: {
      status?: string;
      startDate?: string;
      endDate?: string;
      skip?: string;
      take?: string;
    };
  }>(
    '/payments/payouts',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            skip: { type: 'string' },
            take: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const query = request.query as { status?: string; startDate?: string; endDate?: string; skip?: string; take?: string };
        const skip = parseInt(query.skip || '0');
        const take = parseInt(query.take || '20');

        // Get user's stripe account
        const stripeAccount = await fastify.prisma.stripeAccount.findFirst({
          where: { userId },
        });

        if (!stripeAccount) {
          return reply.status(404).send({ error: 'No connected account' });
        }

        const where: any = { stripeAccountId: stripeAccount.id };
        if (query.status) {
          where.status = query.status;
        }
        if (query.startDate || query.endDate) {
          where.initiatedAt = {};
          if (query.startDate) {
            where.initiatedAt.gte = new Date(query.startDate);
          }
          if (query.endDate) {
            where.initiatedAt.lte = new Date(query.endDate);
          }
        }

        const [payouts, total] = await Promise.all([
          fastify.prisma.payout.findMany({
            where,
            skip,
            take,
            orderBy: { initiatedAt: 'desc' },
          }),
          fastify.prisma.payout.count({ where }),
        ]);

        return reply.send({ payouts, total });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to list payouts' });
      }
    }
  );

  /**
   * POST /payments/payouts/initiate
   * Manually initiate a payout (admin/DZ manager only)
   */
  fastify.post<{
    Body: { amount: number; currency: string };
  }>(
    '/payments/payouts/initiate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['amount', 'currency'],
          properties: {
            amount: { type: 'number', description: 'Amount in cents' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user?.sub || '0') || undefined;
      const roles = request.user?.roles as string[] | undefined;

      if (!userId || !roles || !roles.includes('ADMIN')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        const body = request.body as { amount: number; currency: string };
        const { amount, currency } = body;

        // Get user's stripe account
        const stripeAccount = await fastify.prisma.stripeAccount.findFirst({
          where: { userId },
        });

        if (!stripeAccount) {
          return reply.status(404).send({ error: 'No connected account' });
        }

        const result = await paymentService.initiatePayout(
          stripeAccount.stripeAccountId,
          amount,
          currency
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(400)
          .send({ error: error instanceof Error ? error.message : 'Failed to initiate payout' });
      }
    }
  );

  // ========== Ledger ==========

  /**
   * GET /payments/ledger
   * Get ledger entries (DZ manager or admin)
   */
  fastify.get<{
    Querystring: {
      accountType?: string;
      startDate?: string;
      endDate?: string;
      entryType?: string;
      skip?: string;
      take?: string;
    };
  }>(
    '/payments/ledger',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            accountType: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            entryType: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            skip: { type: 'string' },
            take: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roles = request.user?.roles as string[] | undefined;

      if (!roles || !roles.some(r => ['ADMIN', 'DZ_MANAGER'].includes(r))) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        const query = request.query as { accountType?: string; startDate?: string; endDate?: string; entryType?: string; skip?: string; take?: string };
        const skip = parseInt(query.skip || '0');
        const take = parseInt(query.take || '50');

        const where: any = {};
        if (query.accountType) {
          where.accountType = query.accountType;
        }
        if (query.entryType) {
          where.entryType = query.entryType;
        }
        if (query.startDate || query.endDate) {
          where.createdAt = {};
          if (query.startDate) {
            where.createdAt.gte = new Date(query.startDate);
          }
          if (query.endDate) {
            where.createdAt.lte = new Date(query.endDate);
          }
        }

        const [entries, total] = await Promise.all([
          fastify.prisma.ledgerEntry.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
          }),
          fastify.prisma.ledgerEntry.count({ where }),
        ]);

        return reply.send({ entries, total });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to get ledger' });
      }
    }
  );

  /**
   * GET /payments/reconciliation
   * Daily reconciliation report (admin only)
   */
  fastify.get<{
    Querystring: { date: string };
  }>(
    '/payments/reconciliation',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roles = request.user?.roles as string[] | undefined;

      if (!roles || !roles.includes('ADMIN')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        const query = request.query as { date: string };
        const date = new Date(query.date);
        if (isNaN(date.getTime())) {
          return reply.status(400).send({ error: 'Invalid date format' });
        }

        // Scope to user's organization if not PLATFORM_ADMIN
        const userRoles = (request as any).user?.roles || [];
        const isPlatformAdmin = userRoles.includes('PLATFORM_ADMIN');
        const userDzId = parseInt((request as any).user?.dropzoneId || '0');

        let dropzones: any[];
        if (isPlatformAdmin) {
          dropzones = await fastify.prisma.dropzone.findMany();
        } else if (userDzId) {
          // DZ admin: scope to own dropzone's organization
          const ownDz = await fastify.prisma.dropzone.findUnique({
            where: { id: userDzId },
            select: { organizationId: true },
          });
          dropzones = ownDz
            ? await fastify.prisma.dropzone.findMany({ where: { organizationId: ownDz.organizationId } })
            : [];
        } else {
          dropzones = [];
        }

        const reconciliations = await Promise.all(
          dropzones.map(async (dz) => ({
            dropzoneId: dz.id,
            dropzoneName: dz.name,
            ...(await paymentService.getDailyReconciliation(dz.id, date)),
          }))
        );

        return reply.send({
          date,
          reconciliations,
          summary: {
            totalMatched: reconciliations.reduce((sum, r) => sum + r.matched, 0),
            totalMismatched: reconciliations.reduce((sum, r) => sum + r.mismatched, 0),
            totalMissing: reconciliations.reduce((sum, r) => sum + r.missing, 0),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to get reconciliation' });
      }
    }
  );

  // ========== Stripe Webhook ==========

  /**
   * POST /payments/webhook
   * Handle Stripe webhooks (public route, verified by signature)
   */
  fastify.post<{
    Body: Stripe.Event;
  }>(
    '/payments/webhook',
    {
      schema: {
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!signature || !webhookSecret) {
        return reply.status(400).send({ error: 'Missing signature or secret' });
      }

      try {
        const event = stripe.webhooks.constructEvent(
          (request.body as any),
          signature,
          webhookSecret
        ) as Stripe.Event;

        await paymentService.handleWebhook(event);

        return reply.send({ received: true });
      } catch (error) {
        fastify.log.error({ err: error }, 'Webhook signature verification failed');
        return reply.status(400).send({ error: 'Webhook signature verification failed' });
      }
    }
  );

  // ========== Multi-Currency ==========

  /**
   * GET /payments/currencies
   * Get supported currencies
   */
  fastify.get(
    '/payments/currencies',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                name: { type: 'string' },
                symbol: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply: FastifyReply) => {
      try {
        // Currency is not a DB model — return a static list of supported currencies
        const currencies = [
          { code: 'USD', name: 'US Dollar', symbol: '$' },
          { code: 'EUR', name: 'Euro', symbol: '€' },
          { code: 'GBP', name: 'British Pound', symbol: '£' },
          { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
          { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
          { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
          { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
          { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
          { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
          { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        ];

        return reply.send({ success: true, data: currencies });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to get currencies' });
      }
    }
  );
}
