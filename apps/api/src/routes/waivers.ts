import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ConflictError } from "../utils/errors";
import { AuditService } from "../services/auditService";

// ============================================================================
// WAIVER ROUTES — Digital waiver signing flow (legal compliance)
// ============================================================================

const signWaiverSchema = z.object({
  waiverId: z.number().int().positive(),
  signatureData: z.string().min(10), // Base64 signature image or typed name
  agreedToTerms: z.boolean().refine((v) => v === true, { message: "Must agree to terms" }),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
});

export async function waiverRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // List active waivers for a DZ (what needs to be signed)
  fastify.get(
    "/waivers",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));

      const waivers = await fastify.prisma.waiver.findMany({
        where: { dropzoneId, isActive: true },
        include: {
          signatures: {
            where: { userId },
            orderBy: { signedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { waiverType: "asc" },
      });

      reply.send({
        success: true,
        data: waivers.map((w) => ({
          id: w.id,
          title: w.title,
          waiverType: w.waiverType,
          version: w.version,
          contentPreview: w.content.substring(0, 200) + "...",
          isSigned: w.signatures.length > 0,
          signedAt: w.signatures[0]?.signedAt ?? null,
          requiresResign: w.signatures.length > 0 && w.signatures[0].signedAt < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        })),
      });
    }
  );

  // Admin: List all waiver signatures for this DZ
  fastify.get(
    "/waivers/admin/signatures",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const query = request.query as { search?: string; limit?: string; offset?: string };
      const limit = Math.min(parseInt(query.limit || "50"), 100);
      const offset = parseInt(query.offset || "0");

      // Get all signatures for active waivers at this DZ
      const signatures = await fastify.prisma.waiverSignature.findMany({
        where: {
          waiver: {
            dropzoneId,
            isActive: true,
          },
          ...(query.search
            ? {
                user: {
                  OR: [
                    { firstName: { contains: query.search } },
                    { lastName: { contains: query.search } },
                    { email: { contains: query.search } },
                  ],
                },
              }
            : {}),
        },
        include: {
          waiver: { select: { id: true, title: true, waiverType: true, version: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { signedAt: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await fastify.prisma.waiverSignature.count({
        where: {
          waiver: { dropzoneId, isActive: true },
          ...(query.search
            ? {
                user: {
                  OR: [
                    { firstName: { contains: query.search } },
                    { lastName: { contains: query.search } },
                    { email: { contains: query.search } },
                  ],
                },
              }
            : {}),
        },
      });

      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      reply.send({
        success: true,
        data: signatures.map((s) => {
          const isExpired = s.signedAt < oneYearAgo;
          return {
            id: String(s.id),
            signerName: `${s.user.firstName} ${s.user.lastName}`,
            signerEmail: s.user.email,
            waiverType: s.waiver.waiverType.toLowerCase(),
            waiverTitle: s.waiver.title,
            signedDate: s.signedAt.toISOString().split("T")[0],
            expiryDate: new Date(s.signedAt.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: isExpired ? "expired" : "valid",
            documentId: `W-${s.waiver.id}-${s.id}`,
          };
        }),
        meta: { total, limit, offset },
      });
    }
  );

  // Get full waiver content for reading before signing
  fastify.get<{ Params: { waiverId: string } }>(
    "/waivers/:waiverId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const waiverId = parseInt((request.params as any).waiverId);

      const waiver = await fastify.prisma.waiver.findFirst({
        where: { id: waiverId, dropzoneId, isActive: true },
      });

      if (!waiver) throw new NotFoundError("Waiver");

      reply.send({
        success: true,
        data: {
          id: waiver.id,
          title: waiver.title,
          waiverType: waiver.waiverType,
          version: waiver.version,
          content: waiver.content,
        },
      });
    }
  );

  // Sign a waiver (the critical legal action)
  fastify.post(
    "/waivers/sign",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const body = signWaiverSchema.parse(request.body);

      // Verify waiver exists and is active
      const waiver = await fastify.prisma.waiver.findFirst({
        where: { id: body.waiverId, dropzoneId, isActive: true },
      });
      if (!waiver) throw new NotFoundError("Waiver");

      // Extract IP and device info from request
      const ipAddress = request.ip || request.headers["x-forwarded-for"]?.toString() || "unknown";
      const deviceInfo = request.headers["user-agent"]?.substring(0, 255) || "unknown";

      // Create the signature (append-only — never update)
      const signature = await fastify.prisma.waiverSignature.create({
        data: {
          waiverId: body.waiverId,
          userId,
          signatureData: body.signatureData,
          ipAddress,
          deviceInfo,
          guardianName: body.guardianName,
        },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "WAIVER_SIGN",
        entityType: "WaiverSignature",
        entityId: signature.id,
        afterState: {
          waiverId: body.waiverId,
          waiverTitle: waiver.title,
          waiverVersion: waiver.version,
          hasGuardian: !!body.guardianName,
        },
      });

      reply.code(201).send({
        success: true,
        data: {
          signatureId: signature.id,
          waiverId: waiver.id,
          waiverTitle: waiver.title,
          signedAt: signature.signedAt,
        },
      });
    }
  );

  // Check waiver status for a user (used by compliance grid)
  fastify.get<{ Params: { userId: string } }>(
    "/waivers/status/:userId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const targetUserId = parseInt((request.params as any).userId);

      const activeWaivers = await fastify.prisma.waiver.findMany({
        where: { dropzoneId, isActive: true },
      });

      const signatures = await fastify.prisma.waiverSignature.findMany({
        where: {
          userId: targetUserId,
          waiver: { dropzoneId, isActive: true },
        },
        orderBy: { signedAt: "desc" },
      });

      const signedWaiverIds = new Set(signatures.map((s) => s.waiverId));

      const status = activeWaivers.map((w) => ({
        waiverId: w.id,
        waiverType: w.waiverType,
        title: w.title,
        signed: signedWaiverIds.has(w.id),
        signedAt: signatures.find((s) => s.waiverId === w.id)?.signedAt ?? null,
      }));

      const allSigned = activeWaivers.every((w) => signedWaiverIds.has(w.id));

      reply.send({
        success: true,
        data: {
          userId: targetUserId,
          allWaiversSigned: allSigned,
          waivers: status,
        },
      });
    }
  );

  // Admin: Create/update waiver template
  fastify.post(
    "/waivers/template",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = request.body as {
        title: string;
        waiverType: string;
        content: string;
      };

      const waiver = await fastify.prisma.waiver.create({
        data: {
          dropzoneId,
          title: body.title,
          waiverType: body.waiverType as any,
          content: body.content,
          version: 1,
          isActive: true,
        },
      });

      reply.code(201).send({ success: true, data: waiver });
    }
  );
}
