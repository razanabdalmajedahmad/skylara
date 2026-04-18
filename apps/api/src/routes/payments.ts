import { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ValidationError } from "../utils/errors";
import { AuditService } from "../services/auditService";

const topupSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CREDIT_CARD", "ACH", "CASH"]),
});

const chargeSchema = z.object({
  amount: z.number().positive(),
  jumpId: z.string().optional(),
  description: z.string().optional(),
});

const redeemTicketSchema = z.object({
  ticketId: z.string(),
  jumpId: z.string().optional(),
});

export async function paymentsRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // Get wallet balance
  fastify.get<{}>(
    "/wallet",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const wallet = await fastify.prisma.wallet.findFirst({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
          },
        });

        if (!wallet) {
          // Create default wallet if not exists
          const newWallet = await fastify.prisma.wallet.create({
            data: {
              userId: parseInt(String(request.user.sub)),
              dropzoneId,
              balance: 0,
            },
          });

          reply.code(200).send({
            success: true,
            data: {
              userId: newWallet.userId,
              balance: newWallet.balance,
              currency: newWallet.currency,
            },
          });
          return;
        }

        const ticketCount = await fastify.prisma.jumpTicket.count({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
            remainingJumps: { gt: 0 },
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            userId: wallet.userId,
            balance: wallet.balance,
            currency: wallet.currency,
            jumpTickets: ticketCount,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch wallet",
        });
      }
    }
  );

  // Top up wallet
  fastify.post<{
    Body: z.infer<typeof topupSchema>;
  }>(
    "/wallet/topup",
    {
      preHandler: [authenticate, tenantScope],
      schema: {
        body: {
          type: "object",
          required: ["amount", "paymentMethod"],
          properties: {
            amount: { type: "number" },
            paymentMethod: { type: "string", enum: ["CREDIT_CARD", "ACH", "CASH"] },
            description: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const body = topupSchema.parse(request.body);

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const amountInCents = Math.round(body.amount * 100);

        // Get or create wallet
        let wallet = await fastify.prisma.wallet.findFirst({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
          },
        });

        if (!wallet) {
          wallet = await fastify.prisma.wallet.create({
            data: {
              userId: parseInt(String(request.user.sub)),
              dropzoneId,
              balance: 0,
            },
          });
        }

        const newBalance = wallet.balance + amountInCents;

        // Create transaction
        const transaction = await fastify.prisma.transaction.create({
          data: {
            uuid: uuidv4(),
            walletId: wallet.id,
            type: "CREDIT",
            amount: amountInCents,
            balanceAfter: newBalance,
            description: `Top-up via ${body.paymentMethod}`,
          },
        });

        // Update wallet
        const updated = await fastify.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: newBalance,
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "PAYMENT",
          entityType: "Wallet",
          entityId: wallet.id,
          afterState: { amount: body.amount, method: body.paymentMethod },
        });

        reply.code(201).send({
          success: true,
          data: {
            transactionId: transaction.id,
            transactionUuid: transaction.uuid,
            newBalance: updated.balance,
            amount: amountInCents,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to top up wallet",
        });
      }
    }
  );

  // Charge wallet
  fastify.post<{
    Body: z.infer<typeof chargeSchema>;
  }>(
    "/wallet/charge",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR"])],
      schema: {
        body: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "number" },
            jumpId: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const body = chargeSchema.parse(request.body);

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const amountInCents = Math.round(body.amount * 100);

        // Get wallet
        let wallet = await fastify.prisma.wallet.findFirst({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
          },
        });

        if (!wallet) {
          wallet = await fastify.prisma.wallet.create({
            data: {
              userId: parseInt(String(request.user.sub)),
              dropzoneId,
              balance: 0,
            },
          });
        }

        if (wallet.balance < amountInCents) {
          throw new ValidationError({}, "Insufficient balance");
        }

        const newBalance = wallet.balance - amountInCents;

        // Create transaction
        const transaction = await fastify.prisma.transaction.create({
          data: {
            uuid: uuidv4(),
            walletId: wallet.id,
            type: "DEBIT",
            amount: amountInCents,
            balanceAfter: newBalance,
            description: body.description || "Jump charge",
          },
        });

        // Update wallet
        const updated = await fastify.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: newBalance,
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "PAYMENT",
          entityType: "Wallet",
          entityId: wallet.id,
          afterState: { amount: body.amount },
        });

        reply.code(201).send({
          success: true,
          data: {
            transactionId: transaction.id,
            transactionUuid: transaction.uuid,
            newBalance: updated.balance,
            amount: amountInCents,
          },
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          reply.code(400).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to charge wallet",
          });
        }
      }
    }
  );

  // Get transaction history
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/transactions",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }

        // Get wallet first
        const wallet = await fastify.prisma.wallet.findFirst({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
          },
        });

        if (!wallet) {
          reply.code(200).send({
            success: true,
            data: [],
          });
          return;
        }

        const transactions = await fastify.prisma.transaction.findMany({
          where: {
            walletId: wallet.id,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });

        reply.code(200).send({
          success: true,
          data: transactions.map((t) => ({
            id: t.id,
            uuid: t.uuid,
            type: t.type,
            amount: t.amount,
            balanceAfter: t.balanceAfter,
            description: t.description,
            createdAt: t.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch transactions",
        });
      }
    }
  );

  // Get jump tickets
  fastify.get<{}>(
    "/tickets",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const tickets = await fastify.prisma.jumpTicket.findMany({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
            remainingJumps: { gt: 0 },
          },
        });

        reply.code(200).send({
          success: true,
          data: tickets.map((t) => ({
            id: t.id,
            ticketType: t.ticketType,
            remainingJumps: t.remainingJumps,
            expiresAt: t.expiresAt,
            createdAt: t.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch tickets",
        });
      }
    }
  );

  // Get jump tickets (alias for mobile — calls /jump-tickets)
  fastify.get<{}>(
    "/jump-tickets",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const tickets = await fastify.prisma.jumpTicket.findMany({
          where: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
            remainingJumps: { gt: 0 },
          },
        });

        return reply.code(200).send({
          success: true,
          data: tickets.map((t) => ({
            id: t.id,
            ticketType: t.ticketType,
            totalJumps: t.remainingJumps, // best available — no separate totalJumps column
            remainingJumps: t.remainingJumps,
            expiresAt: t.expiresAt,
            purchasedAt: t.purchasedAt,
            createdAt: t.createdAt,
          })),
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch tickets",
        });
      }
    }
  );

  // Purchase jump tickets
  fastify.post<{
    Body: { ticketType: string; quantity: number; paymentMethodId?: string };
  }>(
    "/jump-tickets/purchase",
    {
      preHandler: [authenticate, tenantScope],
      schema: {
        body: {
          type: "object",
          required: ["ticketType", "quantity"],
          properties: {
            ticketType: { type: "string" },
            quantity: { type: "number" },
            paymentMethodId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const { ticketType, quantity } = request.body;
        if (quantity < 1 || quantity > 100) {
          throw new ValidationError({}, "Quantity must be between 1 and 100");
        }

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const ticket = await fastify.prisma.jumpTicket.create({
          data: {
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
            ticketType,
            remainingJumps: quantity,
            expiresAt,
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "PAYMENT",
          entityType: "JumpTicket",
          entityId: ticket.id,
          afterState: { ticketType, quantity },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: ticket.id,
            ticketType: ticket.ticketType,
            remainingJumps: ticket.remainingJumps,
            expiresAt: ticket.expiresAt,
            purchasedAt: ticket.purchasedAt,
          },
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.code(400).send({ success: false, error: error.message });
        }
        return reply.code(500).send({
          success: false,
          error: "Failed to purchase tickets",
        });
      }
    }
  );

  // Redeem ticket
  fastify.post<{
    Body: z.infer<typeof redeemTicketSchema>;
  }>(
    "/tickets/redeem",
    {
      preHandler: [authenticate, tenantScope],
      schema: {
        body: {
          type: "object",
          required: ["ticketId"],
          properties: {
            ticketId: { type: "string" },
            jumpId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const body = redeemTicketSchema.parse(request.body);

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const ticketId = parseInt(body.ticketId);

        const ticket = await fastify.prisma.jumpTicket.findFirst({
          where: {
            id: ticketId,
            userId: parseInt(String(request.user.sub)),
            dropzoneId,
          },
        });

        if (!ticket) {
          throw new NotFoundError("Ticket");
        }

        if (ticket.remainingJumps <= 0) {
          throw new ValidationError({}, "Ticket has no remaining jumps");
        }

        if (new Date() > ticket.expiresAt) {
          throw new ValidationError({}, "Ticket has expired");
        }

        // Redeem ticket - decrement remaining jumps
        const redeemed = await fastify.prisma.jumpTicket.update({
          where: { id: ticketId },
          data: {
            remainingJumps: Math.max(0, ticket.remainingJumps - 1),
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "PAYMENT",
          entityType: "JumpTicket",
          entityId: ticket.id,
          afterState: { remainingJumps: redeemed.remainingJumps },
        });

        reply.code(200).send({
          success: true,
          data: {
            ticketId: redeemed.id,
            remainingJumps: redeemed.remainingJumps,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof ValidationError) {
          reply.code(400).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to redeem ticket",
          });
        }
      }
    }
  );
}
