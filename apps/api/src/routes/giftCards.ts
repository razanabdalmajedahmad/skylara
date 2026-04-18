import { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { AuditService } from "../services/auditService";

// ============================================================================
// GIFT CARD ROUTES — Issue, list, redeem, expire
// ============================================================================

const issueGiftCardSchema = z.object({
  amountCents: z.number().int().positive().min(100), // min $1
  recipientName: z.string().min(1).max(255),
  recipientEmail: z.string().email().optional(),
  message: z.string().max(500).optional(),
  expiresInDays: z.number().int().positive().default(365),
});

const redeemGiftCardSchema = z.object({
  code: z.string().min(1),
});

function getUserId(request: any): number {
  return parseInt(request.user?.sub ?? request.user?.id ?? "0");
}

function getDzId(request: any): number {
  return parseInt(request.user?.dropzoneId ?? "0");
}

/** Generate a unique gift card code: SKYLARA-YYYY-XXXXXXXX */
function generateGiftCardCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SKYLARA-${year}-${suffix}`;
}

export async function giftCardRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;
  const auditService = new AuditService(prisma);

  // ── LIST GIFT CARDS ──────────────────────────────────────────────
  fastify.get<{ Querystring: { status?: string; limit?: string } }>(
    "/gift-cards",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN", "STAFF"])],
    },
    async (request, reply) => {
      const dropzoneId = getDzId(request);
      const status = (request.query as any).status;
      const limit = parseInt((request.query as any).limit || "100");

      const where: any = { dropzoneId };
      if (status) where.status = status;

      const giftCards = await prisma.giftCard.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 500),
        include: {
          issuedBy: { select: { id: true, firstName: true, lastName: true } },
          redeemedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Compute aggregate stats
      const allCards = await prisma.giftCard.findMany({
        where: { dropzoneId },
        select: { amountCents: true, balanceCents: true, status: true },
      });

      const stats = {
        totalIssued: allCards.reduce((sum: number, gc: any) => sum + gc.amountCents, 0),
        totalRedeemed: allCards
          .filter((gc: any) => gc.status === "REDEEMED")
          .reduce((sum: number, gc: any) => sum + gc.amountCents, 0),
        outstandingBalance: allCards
          .filter((gc: any) => gc.status === "ACTIVE")
          .reduce((sum: number, gc: any) => sum + gc.balanceCents, 0),
        totalCards: allCards.length,
        activeCards: allCards.filter((gc: any) => gc.status === "ACTIVE").length,
        redeemedCards: allCards.filter((gc: any) => gc.status === "REDEEMED").length,
        expiredCards: allCards.filter((gc: any) => gc.status === "EXPIRED").length,
      };

      reply.send({ success: true, data: { giftCards, stats } });
    }
  );

  // ── ISSUE GIFT CARD ──────────────────────────────────────────────
  fastify.post<{ Body: z.infer<typeof issueGiftCardSchema> }>(
    "/gift-cards",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN", "STAFF"])],
    },
    async (request, reply) => {
      const dropzoneId = getDzId(request);
      const userId = getUserId(request);
      const body = issueGiftCardSchema.parse(request.body);

      // Generate unique code (retry up to 5 times on collision)
      let code = "";
      for (let i = 0; i < 5; i++) {
        code = generateGiftCardCode();
        const existing = await prisma.giftCard.findUnique({ where: { code } });
        if (!existing) break;
        if (i === 4) {
          reply.code(500).send({ success: false, error: "Failed to generate unique code" });
          return;
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);

      const giftCard = await prisma.giftCard.create({
        data: {
          uuid: uuidv4(),
          code,
          dropzoneId,
          issuedById: userId,
          recipientName: body.recipientName,
          recipientEmail: body.recipientEmail,
          amountCents: body.amountCents,
          balanceCents: body.amountCents,
          message: body.message,
          expiresAt,
          status: "ACTIVE",
        },
        include: {
          issuedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "GIFT_CARD_ISSUED",
        entityType: "GiftCard",
        entityId: giftCard.id,
        afterState: {
          code: giftCard.code,
          amountCents: giftCard.amountCents,
          recipientName: giftCard.recipientName,
          recipientEmail: giftCard.recipientEmail,
        },
      });

      reply.code(201).send({ success: true, data: giftCard });
    }
  );

  // ── GET SINGLE GIFT CARD ─────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/gift-cards/:id",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      const dropzoneId = getDzId(request);
      const id = parseInt(request.params.id);

      const giftCard = await prisma.giftCard.findFirst({
        where: { id, dropzoneId },
        include: {
          issuedBy: { select: { id: true, firstName: true, lastName: true } },
          redeemedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!giftCard) {
        reply.code(404).send({ success: false, error: "Gift card not found" });
        return;
      }

      reply.send({ success: true, data: giftCard });
    }
  );

  // ── REDEEM GIFT CARD ─────────────────────────────────────────────
  fastify.post<{ Body: z.infer<typeof redeemGiftCardSchema> }>(
    "/gift-cards/redeem",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const dropzoneId = getDzId(request);
      const { code } = redeemGiftCardSchema.parse(request.body);

      const giftCard = await prisma.giftCard.findUnique({ where: { code } });

      if (!giftCard) {
        reply.code(404).send({ success: false, error: "Gift card not found" });
        return;
      }

      if (giftCard.status !== "ACTIVE") {
        reply.code(400).send({ success: false, error: `Gift card is ${giftCard.status.toLowerCase()}` });
        return;
      }

      if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
        // Mark expired and reject
        await prisma.giftCard.update({
          where: { id: giftCard.id },
          data: { status: "EXPIRED" },
        });
        reply.code(400).send({ success: false, error: "Gift card has expired" });
        return;
      }

      // Find or create wallet for the redeemer
      let wallet = await prisma.wallet.findFirst({
        where: { userId, dropzoneId },
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId, dropzoneId, balance: 0 },
        });
      }

      // Credit the wallet and mark card as redeemed (transaction)
      const [updatedWallet, updatedCard] = await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: giftCard.balanceCents } },
        }),
        prisma.giftCard.update({
          where: { id: giftCard.id },
          data: {
            status: "REDEEMED",
            balanceCents: 0,
            redeemedById: userId,
            redeemedAt: new Date(),
          },
        }),
        prisma.transaction.create({
          data: {
            uuid: uuidv4(),
            walletId: wallet.id,
            type: "CREDIT",
            amount: giftCard.balanceCents,
            balanceAfter: wallet.balance + giftCard.balanceCents,
            description: `Gift card redeemed: ${code}`,
            referenceType: "GIFT_CARD",
            referenceId: giftCard.id,
          },
        }),
      ]);

      await auditService.log({
        userId,
        dropzoneId,
        action: "GIFT_CARD_REDEEMED",
        entityType: "GiftCard",
        entityId: giftCard.id,
        beforeState: { status: "ACTIVE", balanceCents: giftCard.balanceCents },
        afterState: { status: "REDEEMED", balanceCents: 0, redeemedById: userId },
      });

      reply.send({
        success: true,
        data: {
          giftCard: updatedCard,
          creditedAmount: giftCard.balanceCents,
          newWalletBalance: updatedWallet.balance,
        },
      });
    }
  );

  // ── CANCEL GIFT CARD ─────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    "/gift-cards/:id/cancel",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      const dropzoneId = getDzId(request);
      const userId = getUserId(request);
      const id = parseInt(request.params.id);

      const giftCard = await prisma.giftCard.findFirst({
        where: { id, dropzoneId },
      });

      if (!giftCard) {
        reply.code(404).send({ success: false, error: "Gift card not found" });
        return;
      }

      if (giftCard.status !== "ACTIVE") {
        reply.code(400).send({ success: false, error: `Cannot cancel a ${giftCard.status.toLowerCase()} gift card` });
        return;
      }

      const updated = await prisma.giftCard.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "GIFT_CARD_CANCELLED",
        entityType: "GiftCard",
        entityId: id,
        beforeState: { status: "ACTIVE" },
        afterState: { status: "CANCELLED" },
      });

      reply.send({ success: true, data: updated });
    }
  );
}
