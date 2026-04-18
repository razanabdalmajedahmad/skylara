import Stripe from 'stripe';

interface CreatePaymentWithSplitsParams {
  userId: number;
  dropzoneId: number | null;
  amount: number;
  currency: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  splits: Array<{
    recipientType: 'DROPZONE' | 'COACH' | 'PLATFORM';
    recipientId: number;
    percentage: number;
  }>;
}

interface SplitConfig {
  [recipientType: string]: number;
}

interface DailyReconciliation {
  matched: number;
  mismatched: number;
  missing: number;
}

export class PaymentService {
  private stripe: Stripe;
  private prisma: any;

  constructor(prisma: any) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey && process.env.NODE_ENV === 'production') {
      throw new Error('[PAYMENT] STRIPE_SECRET_KEY is required in production — refusing to start without it');
    }
    if (!stripeKey && process.env.NODE_ENV !== 'production') {
      // Dev mode: Stripe calls will fail gracefully — set STRIPE_SECRET_KEY in .env for payment features
    }
    this.stripe = new Stripe(stripeKey || 'sk_test_placeholder_will_fail', {
      apiVersion: '2024-12-18.acacia' as any,
    });
    this.prisma = prisma;
  }

  /**
   * Create a Stripe Connect account for a user or dropzone
   */
  async createConnectedAccount(
    userId: number,
    dropzoneId: number | null,
    type: 'express' | 'standard'
  ): Promise<{ accountLink: string; stripeAccountId: string }> {
    // Resolve country from DZ settings if available, otherwise use env default
    let country = process.env.DEFAULT_STRIPE_COUNTRY || 'US';
    if (dropzoneId) {
      const dz = await this.prisma.dropzone.findUnique({
        where: { id: dropzoneId },
        select: { currency: true },
      });
      // Map currency to country code (best-effort)
      const currencyToCountry: Record<string, string> = {
        AED: 'AE', USD: 'US', EUR: 'DE', GBP: 'GB', SAR: 'SA',
        AUD: 'AU', CAD: 'CA', CHF: 'CH', BRL: 'BR', JPY: 'JP',
      };
      if (dz?.currency && currencyToCountry[dz.currency]) {
        country = currencyToCountry[dz.currency];
      }
    }

    const account = await this.stripe.accounts.create({
      type,
      business_type: dropzoneId ? 'non_profit' : 'individual',
      country,
      email: `user_${userId}@skylara.local`, // Will be overridden in onboarding
    });

    // Store in StripeAccount model
    const stripeAccount = await this.prisma.stripeAccount.create({
      data: {
        stripeAccountId: account.id,
        userId: userId || null,
        dropzoneId: dropzoneId || null,
        accountType: type,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
        detailsSubmitted: false,
        defaultCurrency: 'usd',
        metadata: {
          createdAt: new Date().toISOString(),
        },
      },
    });

    // Get onboarding link
    const accountLink = await this.stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      refresh_url: `${process.env.FRONTEND_URL}/payments/connect/refresh`,
      return_url: `${process.env.FRONTEND_URL}/payments/connect/success`,
    });

    return {
      accountLink: accountLink.url,
      stripeAccountId: account.id,
    };
  }

  /**
   * Get a fresh onboarding link for an existing Stripe Connect account
   */
  async getOnboardingLink(
    stripeAccountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<string> {
    const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return accountLink.url;
  }

  /**
   * Create a payment intent with automatic split calculation
   */
  async createPaymentWithSplits(params: CreatePaymentWithSplitsParams): Promise<{
    paymentIntentId: number;
    clientSecret: string;
    splits: Array<{ recipientType: string; amount: number }>;
  }> {
    const {
      userId,
      dropzoneId,
      amount,
      currency,
      description,
      referenceType,
      referenceId,
      splits: requestedSplits,
    } = params;

    // Validate splits sum to 100%
    const splitTotal = requestedSplits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(splitTotal - 100) > 0.01) {
      throw new Error(`Split percentages must sum to 100%, got ${splitTotal}`);
    }

    // Create PaymentIntent in DB first (status: CREATED)
    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        uuid: this.generateUUID(),
        userId,
        dropzoneId,
        amount,
        currency,
        status: 'CREATED',
        description,
        referenceType,
        referenceId,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      },
    });

    // Calculate split amounts
    const calculatedSplits: Array<{
      recipientType: 'DROPZONE' | 'COACH' | 'PLATFORM';
      recipientId: number;
      percentage: number;
      amount: number;
      platformFee: number;
    }> = [];

    for (const split of requestedSplits) {
      const splitAmount = Math.round((amount * split.percentage) / 100);
      const platformFee = this.calculatePlatformFee(splitAmount);

      calculatedSplits.push({
        recipientType: split.recipientType,
        recipientId: split.recipientId,
        percentage: split.percentage,
        amount: splitAmount,
        platformFee,
      });
    }

    // Create Stripe PaymentIntent with transfer_group for automatic splits
    const stripeIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      description,
      metadata: {
        paymentIntentId: paymentIntent.id.toString(),
        referenceType: referenceType || '',
        referenceId: referenceId || '',
      },
      transfer_group: `payment_${paymentIntent.id}`,
    });

    // Update PaymentIntent with Stripe ID
    await this.prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        stripePaymentIntentId: stripeIntent.id,
      },
    });

    // Create PaymentSplit records
    for (const split of calculatedSplits) {
      await this.prisma.paymentSplit.create({
        data: {
          paymentIntentId: paymentIntent.id,
          recipientType: split.recipientType,
          recipientId: split.recipientId,
          amount: split.amount,
          platformFee: split.platformFee,
          status: 'PENDING',
        },
      });
    }

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: stripeIntent.client_secret!,
      splits: calculatedSplits.map((s) => ({
        recipientType: s.recipientType,
        amount: s.amount,
      })),
    };
  }

  /**
   * Confirm payment after Stripe webhook or polling
   */
  async confirmPayment(paymentIntentId: number): Promise<void> {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: { splits: true },
    });

    if (!paymentIntent) {
      throw new Error(`PaymentIntent ${paymentIntentId} not found`);
    }

    if (paymentIntent.status === 'SUCCEEDED') {
      return; // Already processed
    }

    // Update PaymentIntent status
    await this.prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: 'SUCCEEDED' },
    });

    // Execute transfers to connected accounts
    for (const split of paymentIntent.splits) {
      if (split.recipientType === 'PLATFORM') {
        // Platform fees go to main account, no transfer needed
        continue;
      }

      // Get connected account
      const connectedAccount = await this.getConnectedAccountForRecipient(
        split.recipientType,
        split.recipientId
      );

      if (!connectedAccount) {
        console.warn(
          `No connected account for ${split.recipientType} ${split.recipientId}`
        );
        continue;
      }

      // Create transfer
      const transfer = await this.stripe.transfers.create({
        amount: split.amount - split.platformFee,
        currency: paymentIntent.currency,
        destination: connectedAccount.stripeAccountId,
        transfer_group: `payment_${paymentIntentId}`,
        metadata: {
          paymentIntentId: paymentIntentId.toString(),
          splitId: split.id.toString(),
        },
      });

      // Update split status
      await this.prisma.paymentSplit.update({
        where: { id: split.id },
        data: {
          stripeTransferId: transfer.id,
          status: 'COMPLETED',
        },
      });
    }

    // Create double-entry ledger records
    // DEBIT: customer account
    await this.prisma.ledgerEntry.create({
      data: {
        paymentIntentId,
        accountType: 'CUSTOMER',
        accountId: paymentIntent.userId,
        entryType: 'DEBIT',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        balanceAfter: await this.getAccountBalance(paymentIntent.userId),
        description: `Payment: ${paymentIntent.description || 'Skydiving Service'}`,
      },
    });

    // CREDIT: each recipient
    for (const split of paymentIntent.splits) {
      await this.prisma.ledgerEntry.create({
        data: {
          paymentIntentId,
          accountType: split.recipientType,
          accountId: split.recipientId,
          entryType: 'CREDIT',
          amount: split.amount - split.platformFee,
          currency: paymentIntent.currency,
          balanceAfter: await this.getAccountBalance(split.recipientId),
          description: `Payment received: ${paymentIntent.description || 'Service fee'}`,
        },
      });
    }
  }

  /**
   * Process a refund (full or partial)
   */
  async processRefund(paymentIntentId: number, amount?: number): Promise<void> {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: { splits: true },
    });

    if (!paymentIntent) {
      throw new Error(`PaymentIntent ${paymentIntentId} not found`);
    }

    const refundAmount = amount || paymentIntent.amount;

    if (refundAmount > paymentIntent.amount - paymentIntent.refundedAmount) {
      throw new Error(
        `Refund amount ${refundAmount} exceeds available amount ${paymentIntent.amount - paymentIntent.refundedAmount}`
      );
    }

    // Create Stripe refund
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntent.stripePaymentIntentId!,
      amount: refundAmount,
    });

    // Reverse transfers proportionally
    const refundRatio = refundAmount / paymentIntent.amount;
    for (const split of paymentIntent.splits) {
      if (!split.stripeTransferId) continue;

      const reverseAmount = Math.round(split.amount * refundRatio);
      const reverseTransfer = await this.stripe.transfers.create({
        amount: reverseAmount,
        currency: paymentIntent.currency,
        destination: paymentIntent.userId.toString(), // Back to original payer
        transfer_group: `refund_${paymentIntentId}`,
        metadata: {
          originalTransferId: split.stripeTransferId,
          refundId: refund.id,
        },
      });

      await this.prisma.paymentSplit.update({
        where: { id: split.id },
        data: {
          status: refundAmount === paymentIntent.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
    }

    // Create reversal ledger entries
    await this.prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status:
          refundAmount === paymentIntent.amount
            ? 'REFUNDED'
            : 'PARTIALLY_REFUNDED',
        refundedAmount: paymentIntent.refundedAmount + refundAmount,
      },
    });

    // CREDIT: customer (reversal)
    await this.prisma.ledgerEntry.create({
      data: {
        paymentIntentId,
        accountType: 'CUSTOMER',
        accountId: paymentIntent.userId,
        entryType: 'CREDIT',
        amount: refundAmount,
        currency: paymentIntent.currency,
        balanceAfter: await this.getAccountBalance(paymentIntent.userId),
        description: `Refund: ${paymentIntent.description || 'Skydiving Service'}`,
      },
    });

    // DEBIT: each recipient
    for (const split of paymentIntent.splits) {
      const reverseAmount = Math.round(split.amount * refundRatio);
      await this.prisma.ledgerEntry.create({
        data: {
          paymentIntentId,
          accountType: split.recipientType,
          accountId: split.recipientId,
          entryType: 'DEBIT',
          amount: reverseAmount,
          currency: paymentIntent.currency,
          balanceAfter: await this.getAccountBalance(split.recipientId),
          description: `Refund: ${paymentIntent.description || 'Service fee'}`,
        },
      });
    }
  }

  /**
   * Initiate a payout from a connected account
   */
  async initiatePayout(
    stripeAccountId: string,
    amount: number,
    currency: string
  ): Promise<{ payoutId: number; stripePayoutId: string; scheduledFor: Date }> {
    const stripePayout = await this.stripe.payouts.create(
      {
        amount,
        currency,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    const dbAccount = await this.prisma.stripeAccount.findUnique({
      where: { stripeAccountId },
    });

    if (!dbAccount) {
      throw new Error(`StripeAccount ${stripeAccountId} not found`);
    }

    const payout = await this.prisma.payout.create({
      data: {
        stripeAccountId: dbAccount.id,
        amount,
        currency,
        stripePayoutId: stripePayout.id,
        status: stripePayout.status.toUpperCase() as any,
        initiatedAt: new Date(),
        scheduledAt: stripePayout.arrival_date
          ? new Date(stripePayout.arrival_date * 1000)
          : null,
      },
    });

    return {
      payoutId: payout.id,
      stripePayoutId: stripePayout.id,
      scheduledFor: payout.scheduledAt || new Date(),
    };
  }

  /**
   * Handle Stripe webhooks — idempotent, with retry safety and dispute support
   */
  async handleWebhook(rawEvent: Stripe.Event): Promise<void> {
    // Cast to access standard Stripe event fields (id, type, created, data)
    const event = rawEvent as Stripe.Event & { id: string; created: number };

    // === IDEMPOTENCY CHECK: prevent duplicate processing ===
    const existingEvent = await this.prisma.eventOutbox.findFirst({
      where: { aggregateType: 'STRIPE_WEBHOOK', aggregateId: event.id },
    });
    if (existingEvent && existingEvent.status === 'DELIVERED') {
      // Duplicate Stripe event — already processed, skip
      return;
    }

    // Log event receipt for audit trail
    await this.prisma.eventOutbox.create({
      data: {
        eventType: event.type,
        aggregateType: 'STRIPE_WEBHOOK',
        aggregateId: event.id,
        tenantId: 0,
        payload: { stripeEventId: event.id, type: event.type, created: event.created },
        status: 'PROCESSING',
      },
    }).catch(() => { /* ignore if unique constraint fails — already logged */ });

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const intent = event.data.object as any;
          const paymentIntentId = parseInt(intent.metadata?.paymentIntentId || '0');
          if (paymentIntentId) {
            await this.confirmPayment(paymentIntentId);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const intent = event.data.object as any;
          const paymentIntentId = parseInt(intent.metadata?.paymentIntentId || '0');
          if (paymentIntentId) {
            await this.prisma.paymentIntent.update({
              where: { id: paymentIntentId },
              data: { status: 'FAILED' },
            });
          }
          break;
        }

        case 'charge.dispute.created': {
          const dispute = event.data.object as any;
          const chargeId = dispute.charge;
          // Find matching payment and create ledger hold
          const payment = await this.prisma.paymentIntent.findFirst({
            where: { stripePaymentIntentId: dispute.payment_intent },
          });
          if (payment) {
            await this.prisma.paymentIntent.update({
              where: { id: payment.id },
              data: { status: 'DISPUTED', metadata: { ...(payment.metadata as any || {}), disputeId: dispute.id, disputeAmount: dispute.amount, disputeReason: dispute.reason } },
            });
            // Create hold ledger entry — don't subtract yet
            await this.prisma.ledgerEntry.create({
              data: { accountId: payment.dropzoneId || 0, entryType: 'HOLD', amount: dispute.amount, currency: dispute.currency, balanceAfter: 0, description: `Dispute hold: ${dispute.reason} (${dispute.id})` },
            });
          }
          break;
        }

        case 'charge.dispute.closed': {
          const dispute = event.data.object as any;
          const payment = await this.prisma.paymentIntent.findFirst({
            where: { stripePaymentIntentId: dispute.payment_intent },
          });
          if (payment) {
            const won = dispute.status === 'won';
            await this.prisma.paymentIntent.update({
              where: { id: payment.id },
              data: { status: won ? 'COMPLETED' : 'REFUNDED', metadata: { ...(payment.metadata as any || {}), disputeOutcome: dispute.status } },
            });
            if (!won) {
              // Lost dispute — reverse the payment splits
              await this.processRefund(payment.id, dispute.amount);
            }
          }
          break;
        }

        case 'payout.paid': {
          const payout = event.data.object as any;
          await this.prisma.payout.update({
            where: { stripePayoutId: payout.id },
            data: { status: 'PAID', paidAt: new Date(payout.arrival_date * 1000) },
          });
          break;
        }

        case 'payout.failed': {
          const payout = event.data.object as any;
          await this.prisma.payout.update({
            where: { stripePayoutId: payout.id },
            data: { status: 'FAILED', failureReason: payout.failure_reason || 'Unknown' },
          });
          break;
        }

        case 'account.updated': {
          const account = event.data.object as any;
          const dbAccount = await this.prisma.stripeAccount.findUnique({
            where: { stripeAccountId: account.id },
          });
          if (dbAccount) {
            // Detect bank detail change for audit
            const prevPayoutsEnabled = dbAccount.payoutsEnabled;
            await this.prisma.stripeAccount.update({
              where: { id: dbAccount.id },
              data: {
                chargesEnabled: account.charges_enabled || false,
                payoutsEnabled: account.payouts_enabled || false,
                onboardingComplete: account.charges_enabled && account.payouts_enabled,
                detailsSubmitted: account.details_submitted || false,
                defaultCurrency: account.default_currency || 'usd',
                metadata: { ...dbAccount.metadata, lastUpdated: new Date().toISOString() },
              },
            });
            // Audit log bank detail changes
            if (account.external_accounts?.data?.length) {
              await this.prisma.auditLog.create({
                data: { userId: dbAccount.userId || 0, dropzoneId: dbAccount.dropzoneId || 0, action: 'UPDATE', entityType: 'StripeAccount', entityId: dbAccount.id, afterState: { event: 'bank_detail_change', stripeAccountId: account.id, payoutsEnabled: account.payouts_enabled } },
              }).catch(() => {});
            }
          }
          break;
        }

        default:
          break;
      }

      // Mark webhook as successfully processed
      await this.prisma.eventOutbox.updateMany({
        where: { aggregateType: 'STRIPE_WEBHOOK', aggregateId: event.id },
        data: { status: 'DELIVERED', publishedAt: new Date() },
      });
    } catch (error) {
      // Mark as failed for retry by outbox relay
      await this.prisma.eventOutbox.updateMany({
        where: { aggregateType: 'STRIPE_WEBHOOK', aggregateId: event.id },
        data: { status: 'PENDING', retryCount: { increment: 1 } },
      }).catch(() => {});
      throw error; // Re-throw so Stripe knows to retry
    }
  }

  /**
   * Get payment split configuration based on reference type
   */
  getPaymentSplitConfig(referenceType: string, dropzoneId: number): SplitConfig {
    const configs: { [key: string]: SplitConfig } = {
      tandem_booking: { dropzone: 85, coach: 10, platform: 5 },
      fun_jump: { dropzone: 95, platform: 5 },
      coaching: { coach: 80, dropzone: 15, platform: 5 },
      shop: { dropzone: 90, platform: 10 },
    };

    return configs[referenceType] || { dropzone: 85, platform: 15 };
  }

  /**
   * Get daily reconciliation between Stripe and local ledger
   */
  async getDailyReconciliation(
    dropzoneId: number,
    date: Date
  ): Promise<DailyReconciliation> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get local ledger entries for the day
    const localEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        accountId: dropzoneId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Get Stripe transactions for the day
    const stripeTransactions = await (this.stripe as any).balanceTransactions.list({
      limit: 100,
      created: {
        gte: Math.floor(startOfDay.getTime() / 1000),
        lte: Math.floor(endOfDay.getTime() / 1000),
      },
    });

    // Simple reconciliation logic
    let matched = 0;
    let mismatched = 0;
    let missing = 0;

    for (const stripeTransaction of stripeTransactions.data) {
      const localMatch = localEntries.find(
        (e: any) =>
          e.amount === stripeTransaction.net &&
          Math.abs(
            e.createdAt.getTime() - stripeTransaction.created * 1000
          ) < 60000 // Within 1 minute
      );

      if (localMatch) {
        matched++;
      } else {
        missing++;
      }
    }

    mismatched = localEntries.length - matched;

    return { matched, mismatched, missing };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount / 100); // Convert from cents
  }

  // ========== Private Helpers ==========

  private calculatePlatformFee(amount: number): number {
    // 2.9% + $0.30 per transaction (standard Stripe fee)
    return Math.round(amount * 0.029 + 30);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async getConnectedAccountForRecipient(
    recipientType: 'DROPZONE' | 'COACH' | 'PLATFORM',
    recipientId: number
  ): Promise<any> {
    if (recipientType === 'PLATFORM') {
      return null;
    }

    return this.prisma.stripeAccount.findFirst({
      where: {
        ...(recipientType === 'DROPZONE'
          ? { dropzoneId: recipientId }
          : { userId: recipientId }),
        onboardingComplete: true,
      },
    });
  }

  private async getAccountBalance(accountId: number): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { accountId },
      _sum: {
        amount: true,
      },
    });

    return result._sum?.amount || 0;
  }
}

