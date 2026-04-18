import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { NotFoundError, ValidationError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import {
  coachApplicationWhereForTenant,
  coachApplicationAccessibleToDropzone,
  getUserIdsWithRoleAtDropzone,
} from "../utils/coachApplicationScope";
import type { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const INSTRUCTOR_TYPES = new Set(["INSTRUCTOR", "TI", "AFFI"]);

const coachSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  homeDropzone: z.string().optional(),
  applicationType: z.enum(["COACH", "INSTRUCTOR", "TI", "AFFI"]).default("COACH"),
  disciplines: z.array(z.string()).default([]),
  coachingTypes: z.array(z.string()).default([]),
  tunnelCoaching: z.boolean().default(false),
  canopyCoaching: z.boolean().default(false),
  totalJumps: z.number().optional(),
  tunnelHours: z.number().optional(),
  languages: z.array(z.string()).default([]),
  availabilityDates: z.string().optional(),
  travelBase: z.string().optional(),
  licenseType: z.string().optional(),
  licenseNumber: z.string().optional(),
  ratingDetails: z.string().optional(),
  insuranceConfirmed: z.boolean().default(false),
  rigStatus: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  bio: z.string().optional(),
  emergencyContact: z.string().optional(),
  /** When set (or via x-dropzone-id header), application is tied to that dropzone for tenant lists and approvals. */
  dropzoneId: z.number().int().positive().optional(),
});

const assignDropzoneSchema = z.object({
  dropzoneId: z.number().int().positive(),
});

const dzSchema = z.object({
  dzName: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  timezone: z.string().default("UTC"),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  aircraftTypes: z.array(z.string()).default([]),
  altitudeOptions: z.array(z.string()).default([]),
  disciplinesSupported: z.array(z.string()).default([]),
  gearRentalAvailable: z.boolean().default(false),
  studentGearAvailable: z.boolean().default(false),
  packingAvailable: z.boolean().default(false),
  accommodationOptions: z.array(z.string()).default([]),
  eventHostingInterest: z.boolean().default(false),
  termsReady: z.boolean().default(false),
  paymentSetupReady: z.boolean().default(false),
  manifestSetupReady: z.boolean().default(false),
  staffRoles: z.array(z.string()).default([]),
});

function isPlatformAdmin(user: { roles?: string[] } | undefined): boolean {
  return (user?.roles ?? []).includes("PLATFORM_ADMIN");
}

function parseDzId(user: { dropzoneId?: string } | undefined): number | null {
  if (!user?.dropzoneId) return null;
  const n = parseInt(user.dropzoneId, 10);
  return Number.isFinite(n) ? n : null;
}

function resolvePublicDropzoneId(request: FastifyRequest, body: { dropzoneId?: number }): number | undefined {
  const raw = request.headers["x-dropzone-id"];
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    return parseInt(raw.trim(), 10);
  }
  if (body.dropzoneId != null && Number.isFinite(body.dropzoneId)) {
    return body.dropzoneId;
  }
  return undefined;
}

async function coachListWhere(
  prisma: PrismaClient,
  request: FastifyRequest,
  base: Prisma.CoachApplicationWhereInput
): Promise<Prisma.CoachApplicationWhereInput> {
  if (isPlatformAdmin(request.user)) return base;
  const dzId = parseDzId(request.user);
  if (dzId == null) return { ...base, id: -1 };
  const userIds = await getUserIdsWithRoleAtDropzone(prisma, dzId);
  return coachApplicationWhereForTenant(dzId, base, userIds);
}

async function assertCoachAppInScope(
  fastify: FastifyInstance,
  request: FastifyRequest,
  id: number
) {
  const app = await fastify.prisma.coachApplication.findUnique({ where: { id } });
  if (!app) throw new NotFoundError("Application");
  if (isPlatformAdmin(request.user)) return app;
  const dzId = parseDzId(request.user);
  if (dzId == null) throw new NotFoundError("Application");
  const ok = await coachApplicationAccessibleToDropzone(fastify.prisma, app, dzId);
  if (!ok) throw new NotFoundError("Application");
  return app;
}

export async function partnerOnboardingRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // === COACH/INSTRUCTOR ONBOARDING (public — shareable links) ===

  fastify.post("/onboarding/coaches", async (request, reply) => {
    const body = coachSchema.parse(request.body);
    const { dropzoneId: bodyDz, ...rest } = body;
    const existingUser = await fastify.prisma.user.findFirst({ where: { email: body.email } });
    const dropzoneId = resolvePublicDropzoneId(request, body) ?? bodyDz;
    const app = await fastify.prisma.coachApplication.create({
      data: {
        uuid: uuidv4(),
        userId: existingUser?.id,
        source: existingUser ? "INTERNAL" : "EXTERNAL",
        status: "SUBMITTED",
        dropzoneId: dropzoneId ?? null,
        ...rest,
      },
    });
    reply.code(201).send({ success: true, data: app });
  });

  fastify.post("/onboarding/instructors", async (request, reply) => {
    const body = coachSchema.parse(request.body);
    const { dropzoneId: bodyDz, ...rest } = body;
    const existingUser = await fastify.prisma.user.findFirst({ where: { email: body.email } });
    const dropzoneId = resolvePublicDropzoneId(request, body) ?? bodyDz;
    const app = await fastify.prisma.coachApplication.create({
      data: {
        uuid: uuidv4(),
        userId: existingUser?.id,
        source: existingUser ? "INTERNAL" : "EXTERNAL",
        status: "SUBMITTED",
        dropzoneId: dropzoneId ?? null,
        ...rest,
        applicationType: body.applicationType || "INSTRUCTOR",
      },
    });
    reply.code(201).send({ success: true, data: app });
  });

  // List coach applications (admin) — COACH type only
  fastify.get("/onboarding/coaches", { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] }, async (request, reply) => {
    const query = request.query as { status?: string };
    const base: Prisma.CoachApplicationWhereInput = { applicationType: "COACH" };
    if (query.status) base.status = query.status;
    const where = await coachListWhere(fastify.prisma, request, base);
    const apps = await fastify.prisma.coachApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    reply.send({ success: true, data: apps });
  });

  fastify.get("/onboarding/instructors", { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] }, async (request, reply) => {
    const query = request.query as { status?: string };
    const base: Prisma.CoachApplicationWhereInput = { applicationType: { in: ["INSTRUCTOR", "TI", "AFFI"] } };
    if (query.status) base.status = query.status;
    const where = await coachListWhere(fastify.prisma, request, base);
    const apps = await fastify.prisma.coachApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    reply.send({ success: true, data: apps });
  });

  // Get single application (scoped)
  fastify.get<{ Params: { id: string } }>("/onboarding/coaches/:id", { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] }, async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
    const app = await assertCoachAppInScope(fastify, request, id);
    if (app.applicationType !== "COACH") throw new NotFoundError("Application");
    reply.send({ success: true, data: app });
  });

  fastify.get<{ Params: { id: string } }>("/onboarding/instructors/:id", { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] }, async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
    const app = await assertCoachAppInScope(fastify, request, id);
    if (!INSTRUCTOR_TYPES.has(app.applicationType)) throw new NotFoundError("Application");
    reply.send({ success: true, data: app });
  });

  fastify.patch<{ Params: { id: string } }>("/onboarding/coaches/:id", { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] }, async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
    await assertCoachAppInScope(fastify, request, id);
    const body = request.body as Record<string, unknown>;
    const updated = await fastify.prisma.coachApplication.update({ where: { id }, data: body as any });
    reply.send({ success: true, data: updated });
  });

  fastify.patch<{ Params: { id: string } }>("/onboarding/instructors/:id", { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] }, async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
    const existing = await assertCoachAppInScope(fastify, request, id);
    if (!INSTRUCTOR_TYPES.has(existing.applicationType)) throw new NotFoundError("Application");
    const body = request.body as Record<string, unknown>;
    const updated = await fastify.prisma.coachApplication.update({ where: { id }, data: body as any });
    reply.send({ success: true, data: updated });
  });

  const approveHandler = (expectType: "COACH" | "INSTRUCTOR_FAMILY") =>
    async (request: FastifyRequest, reply: import("fastify").FastifyReply) => {
      const id = parseInt((request.params as { id: string }).id, 10);
      if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
      const app = await assertCoachAppInScope(fastify, request, id);
      if (expectType === "COACH" && app.applicationType !== "COACH") {
        throw new ValidationError({}, "This endpoint is only for coach applications");
      }
      if (expectType === "INSTRUCTOR_FAMILY" && !INSTRUCTOR_TYPES.has(app.applicationType)) {
        throw new ValidationError({}, "This endpoint is only for instructor applications");
      }
      const body = (request.body as { limitedApproval?: boolean; notes?: string }) || {};
      const status = body.limitedApproval ? "LIMITED_APPROVAL" : "APPROVED";
      const dzId = parseDzId(request.user);
      const updated = await fastify.prisma.coachApplication.update({
        where: { id },
        data: { status, reviewedBy: parseInt(String(request.user!.sub)), reviewedAt: new Date(), reviewNotes: body.notes },
      });
      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId: dzId ?? 0,
        action: "UPDATE",
        entityType: "CoachApplication",
        entityId: updated.id,
        afterState: { status },
      });
      reply.send({ success: true, data: updated });
    };

  const rejectHandler = (expectType: "COACH" | "INSTRUCTOR_FAMILY") =>
    async (request: FastifyRequest, reply: import("fastify").FastifyReply) => {
      const id = parseInt((request.params as { id: string }).id, 10);
      if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
      const app = await assertCoachAppInScope(fastify, request, id);
      if (expectType === "COACH" && app.applicationType !== "COACH") {
        throw new ValidationError({}, "This endpoint is only for coach applications");
      }
      if (expectType === "INSTRUCTOR_FAMILY" && !INSTRUCTOR_TYPES.has(app.applicationType)) {
        throw new ValidationError({}, "This endpoint is only for instructor applications");
      }
      const body = (request.body as { notes?: string }) || {};
      const updated = await fastify.prisma.coachApplication.update({
        where: { id },
        data: {
          status: "DOCUMENTS_MISSING",
          reviewedBy: parseInt(String(request.user!.sub)),
          reviewedAt: new Date(),
          reviewNotes: body.notes || "Needs more information",
        },
      });
      reply.send({ success: true, data: updated });
    };

  const requestDocsHandler = (expectType: "COACH" | "INSTRUCTOR_FAMILY") =>
    async (request: FastifyRequest, reply: import("fastify").FastifyReply) => {
      const id = parseInt((request.params as { id: string }).id, 10);
      if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
      const app = await assertCoachAppInScope(fastify, request, id);
      if (expectType === "COACH" && app.applicationType !== "COACH") {
        throw new ValidationError({}, "This endpoint is only for coach applications");
      }
      if (expectType === "INSTRUCTOR_FAMILY" && !INSTRUCTOR_TYPES.has(app.applicationType)) {
        throw new ValidationError({}, "This endpoint is only for instructor applications");
      }
      const body = (request.body as { notes?: string }) || {};
      const updated = await fastify.prisma.coachApplication.update({
        where: { id },
        data: {
          status: "DOCUMENTS_MISSING",
          reviewedBy: parseInt(String(request.user!.sub)),
          reviewedAt: new Date(),
          reviewNotes: body.notes || "Additional documents required",
        },
      });
      reply.send({ success: true, data: updated });
    };

  const coachAuth: [typeof authenticate, ReturnType<typeof authorize>] = [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])];

  fastify.post<{ Params: { id: string } }>("/onboarding/coaches/:id/approve", { preHandler: coachAuth }, approveHandler("COACH"));
  fastify.post<{ Params: { id: string } }>("/onboarding/coaches/:id/reject", { preHandler: coachAuth }, rejectHandler("COACH"));
  fastify.post<{ Params: { id: string } }>("/onboarding/coaches/:id/request-docs", { preHandler: coachAuth }, requestDocsHandler("COACH"));

  fastify.post<{ Params: { id: string } }>("/onboarding/instructors/:id/approve", { preHandler: coachAuth }, approveHandler("INSTRUCTOR_FAMILY"));
  fastify.post<{ Params: { id: string } }>("/onboarding/instructors/:id/reject", { preHandler: coachAuth }, rejectHandler("INSTRUCTOR_FAMILY"));
  fastify.post<{ Params: { id: string } }>("/onboarding/instructors/:id/request-docs", { preHandler: coachAuth }, requestDocsHandler("INSTRUCTOR_FAMILY"));

  const platformAdminOnly: [typeof authenticate, ReturnType<typeof authorize>] = [
    authenticate,
    authorize(["PLATFORM_ADMIN"]),
  ];

  fastify.get("/onboarding/admin/dropzone-options", { preHandler: platformAdminOnly }, async (_request, reply) => {
    const rows = await fastify.prisma.dropzone.findMany({
      where: { status: "active" },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 500,
    });
    reply.send({ success: true, data: rows });
  });

  fastify.post<{ Params: { id: string } }>("/onboarding/coaches/:id/assign-dropzone", { preHandler: platformAdminOnly }, async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
    const body = assignDropzoneSchema.parse(request.body);
    const dz = await fastify.prisma.dropzone.findUnique({ where: { id: body.dropzoneId } });
    if (!dz) throw new NotFoundError("Dropzone");
    const app = await fastify.prisma.coachApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundError("Application");
    if (app.applicationType !== "COACH") throw new ValidationError({}, "Application is not a coach application");
    const updated = await fastify.prisma.coachApplication.update({
      where: { id },
      data: { dropzoneId: body.dropzoneId },
    });
    await auditService.log({
      userId: parseInt(String(request.user!.sub)),
      dropzoneId: body.dropzoneId,
      action: "UPDATE",
      entityType: "CoachApplication",
      entityId: id,
      afterState: { dropzoneId: body.dropzoneId },
    });
    reply.send({ success: true, data: updated });
  });

  fastify.post<{ Params: { id: string } }>("/onboarding/instructors/:id/assign-dropzone", { preHandler: platformAdminOnly }, async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (!Number.isFinite(id)) throw new ValidationError({}, "Invalid application id");
    const body = assignDropzoneSchema.parse(request.body);
    const dz = await fastify.prisma.dropzone.findUnique({ where: { id: body.dropzoneId } });
    if (!dz) throw new NotFoundError("Dropzone");
    const app = await fastify.prisma.coachApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundError("Application");
    if (!INSTRUCTOR_TYPES.has(app.applicationType)) throw new ValidationError({}, "Application is not an instructor application");
    const updated = await fastify.prisma.coachApplication.update({
      where: { id },
      data: { dropzoneId: body.dropzoneId },
    });
    await auditService.log({
      userId: parseInt(String(request.user!.sub)),
      dropzoneId: body.dropzoneId,
      action: "UPDATE",
      entityType: "CoachApplication",
      entityId: id,
      afterState: { dropzoneId: body.dropzoneId },
    });
    reply.send({ success: true, data: updated });
  });

  // === DROPZONE ONBOARDING (public — shareable link) ===

  fastify.post("/onboarding/dropzones", async (request, reply) => {
    const body = dzSchema.parse(request.body);
    const existingUser = await fastify.prisma.user.findFirst({ where: { email: body.contactEmail } });
    const app = await fastify.prisma.dropzoneApplication.create({
      data: { uuid: uuidv4(), contactUserId: existingUser?.id, status: "SUBMITTED", ...body },
    });
    reply.code(201).send({ success: true, data: app });
  });

  fastify.get("/onboarding/dropzones", { preHandler: [authenticate, authorize(["PLATFORM_ADMIN"])] }, async (request, reply) => {
    const query = request.query as { status?: string };
    const where: any = {};
    if (query.status) where.status = query.status;
    const apps = await fastify.prisma.dropzoneApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    reply.send({ success: true, data: apps });
  });

  fastify.get<{ Params: { id: string } }>("/onboarding/dropzones/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const app = await fastify.prisma.dropzoneApplication.findUnique({ where: { id: parseInt((request.params as any).id) } });
    if (!app) throw new NotFoundError("Application");
    reply.send({ success: true, data: app });
  });

  fastify.patch<{ Params: { id: string } }>("/onboarding/dropzones/:id", { preHandler: [authenticate, authorize(["PLATFORM_ADMIN"])] }, async (request, reply) => {
    const body = request.body as any;
    const updated = await fastify.prisma.dropzoneApplication.update({ where: { id: parseInt((request.params as any).id) }, data: body });
    reply.send({ success: true, data: updated });
  });

  fastify.post<{ Params: { id: string } }>("/onboarding/dropzones/:id/approve", {
    preHandler: [authenticate, authorize(["PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as { notes?: string } || {};
    const updated = await fastify.prisma.dropzoneApplication.update({
      where: { id: parseInt((request.params as any).id) },
      data: { status: "PILOT_READY", reviewedBy: parseInt(String(request.user!.sub)), reviewedAt: new Date(), reviewNotes: body.notes },
    });
    await auditService.log({ userId: parseInt(String(request.user!.sub)), dropzoneId: 0, action: "UPDATE", entityType: "DropzoneApplication", entityId: updated.id, afterState: { status: "PILOT_READY" } });
    reply.send({ success: true, data: updated });
  });
}
