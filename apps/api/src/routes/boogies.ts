import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ConflictError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import { v4 as uuidv4 } from "uuid";
import { BoogieMatchingEngine } from "../services/boogieMatchingEngine";

const createBoogieSchema = z.object({
  title: z.string().min(3).max(200),
  subtitle: z.string().max(300).optional(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  eventType: z.string(),
  discipline: z.string().optional(),
  organizerName: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  maxParticipants: z.number().int().positive().default(100),
  currency: z.string().default("AED"),
  approvalMode: z.string().default("AUTO_APPROVE"),
  visibility: z.string().default("PUBLIC"),
  waitlistEnabled: z.boolean().default(true),
  depositRequired: z.boolean().default(false),
  depositAmountCents: z.number().optional(),
  minLicense: z.string().optional(),
  minJumps: z.number().optional(),
  aadRequired: z.boolean().default(true),
  ownRigRequired: z.boolean().default(false),
  rentalAvailable: z.boolean().default(true),
  heroImageUrl: z.string().optional(),
  termsText: z.string().optional(),
  cancellationPolicy: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  homeDropzone: z.string().optional(),
  numberOfJumps: z.number().optional(),
  tunnelTime: z.number().optional(),
  licenseType: z.string().optional(),
  licenseNumber: z.string().optional(),
  aadConfirmed: z.boolean().default(false),
  gearOwnership: z.string().optional(),
  accommodationChoice: z.string().optional(),
  jerseySize: z.string().optional(),
  foodRestrictions: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
  waiverAccepted: z.boolean().default(false),
  termsAccepted: z.boolean().default(false),
  packageId: z.number().optional(),
  formData: z.record(z.any()).optional(),
});

export async function boogieRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // LIST boogies
  fastify.get("/boogies", { preHandler: [authenticate, tenantScope] }, async (request, reply) => {
    const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
    const query = request.query as { status?: string; limit?: string };
    const where: any = { dropzoneId };
    if (query.status) where.status = query.status;

    const boogies = await fastify.prisma.boogie.findMany({
      where,
      include: { _count: { select: { registrations: true, packages: true } } },
      orderBy: { startDate: "desc" },
      take: parseInt(query.limit || "50"),
    });

    reply.send({ success: true, data: boogies });
  });

  // CREATE boogie
  fastify.post("/boogies", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
    const userId = parseInt(String(request.user!.sub));
    const body = createBoogieSchema.parse(request.body);
    const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const boogie = await fastify.prisma.boogie.create({
      data: {
        uuid: uuidv4(), dropzoneId, createdBy: userId, slug,
        title: body.title, subtitle: body.subtitle, shortDescription: body.shortDescription,
        fullDescription: body.fullDescription, eventType: body.eventType, discipline: body.discipline,
        organizerName: body.organizerName, country: body.country, city: body.city,
        startDate: new Date(body.startDate), endDate: new Date(body.endDate),
        maxParticipants: body.maxParticipants, currency: body.currency,
        approvalMode: body.approvalMode, visibility: body.visibility,
        waitlistEnabled: body.waitlistEnabled, depositRequired: body.depositRequired,
        depositAmountCents: body.depositAmountCents,
        minLicense: body.minLicense, minJumps: body.minJumps,
        aadRequired: body.aadRequired, ownRigRequired: body.ownRigRequired,
        rentalAvailable: body.rentalAvailable, heroImageUrl: body.heroImageUrl,
        termsText: body.termsText, cancellationPolicy: body.cancellationPolicy,
      },
    });

    await auditService.log({ userId, dropzoneId, action: "CREATE", entityType: "Boogie", entityId: boogie.id, afterState: { title: body.title, eventType: body.eventType } });
    reply.code(201).send({ success: true, data: boogie });
  });

  // GET single boogie
  fastify.get<{ Params: { id: string } }>("/boogies/:id", { preHandler: [authenticate, tenantScope] }, async (request, reply) => {
    const id = parseInt((request.params as any).id);
    const boogie = await fastify.prisma.boogie.findUnique({
      where: { id },
      include: { registrations: true, packages: { orderBy: { sortOrder: "asc" } }, _count: { select: { registrations: true } } },
    });
    if (!boogie) throw new NotFoundError("Boogie");
    reply.send({ success: true, data: boogie });
  });

  // UPDATE boogie
  fastify.patch<{ Params: { id: string } }>("/boogies/:id", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const id = parseInt((request.params as any).id);
    const body = request.body as any;
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    const updated = await fastify.prisma.boogie.update({ where: { id }, data: body });
    reply.send({ success: true, data: updated });
  });

  // PUBLISH
  fastify.post<{ Params: { id: string } }>("/boogies/:id/publish", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const id = parseInt((request.params as any).id);
    const updated = await fastify.prisma.boogie.update({ where: { id }, data: { status: "PUBLISHED" } });
    reply.send({ success: true, data: updated });
  });

  // DUPLICATE
  fastify.post<{ Params: { id: string } }>("/boogies/:id/duplicate", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const id = parseInt((request.params as any).id);
    const original = await fastify.prisma.boogie.findUnique({ where: { id } });
    if (!original) throw new NotFoundError("Boogie");
    const dup = await fastify.prisma.boogie.create({
      data: {
        uuid: uuidv4(), dropzoneId: original.dropzoneId, title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`, status: "DRAFT",
        createdBy: parseInt(String(request.user!.sub)),
        eventType: original.eventType, discipline: original.discipline,
        startDate: original.startDate, endDate: original.endDate,
        maxParticipants: original.maxParticipants, currency: original.currency,
        subtitle: original.subtitle, shortDescription: original.shortDescription,
        fullDescription: original.fullDescription, organizerName: original.organizerName,
        country: original.country, city: original.city, timezone: original.timezone,
        approvalMode: original.approvalMode, visibility: original.visibility,
        waitlistEnabled: original.waitlistEnabled, depositRequired: original.depositRequired,
        depositAmountCents: original.depositAmountCents,
        minLicense: original.minLicense, minJumps: original.minJumps,
        aadRequired: original.aadRequired, ownRigRequired: original.ownRigRequired,
        rentalAvailable: original.rentalAvailable,
        termsText: original.termsText, cancellationPolicy: original.cancellationPolicy,
      },
    });
    reply.code(201).send({ success: true, data: dup });
  });

  // ARCHIVE
  fastify.post<{ Params: { id: string } }>("/boogies/:id/archive", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const updated = await fastify.prisma.boogie.update({ where: { id: parseInt((request.params as any).id) }, data: { status: "ARCHIVED" } });
    reply.send({ success: true, data: updated });
  });

  // DELETE
  fastify.delete<{ Params: { id: string } }>("/boogies/:id", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    await fastify.prisma.boogie.delete({ where: { id: parseInt((request.params as any).id) } });
    reply.send({ success: true, data: { message: "Boogie deleted" } });
  });

  // === REGISTRATIONS ===

  // List registrations
  fastify.get<{ Params: { id: string } }>("/boogies/:id/registrations", { preHandler: [authenticate, tenantScope] }, async (request, reply) => {
    const boogieId = parseInt((request.params as any).id);
    const regs = await fastify.prisma.boogieRegistration.findMany({
      where: { boogieId }, orderBy: { registeredAt: "desc" },
    });
    reply.send({ success: true, data: regs });
  });

  // Register for boogie
  fastify.post<{ Params: { id: string } }>("/boogies/:id/registrations", { preHandler: [authenticate] }, async (request, reply) => {
    const boogieId = parseInt((request.params as any).id);
    const body = registerSchema.parse(request.body);
    const userId = request.user ? parseInt(String(request.user.sub)) : null;

    const boogie = await fastify.prisma.boogie.findUnique({ where: { id: boogieId } });
    if (!boogie) throw new NotFoundError("Boogie");

    // Check capacity
    if (boogie.currentParticipants >= boogie.maxParticipants && !boogie.waitlistEnabled) {
      throw new ConflictError("Event is full");
    }

    const status = boogie.currentParticipants >= boogie.maxParticipants ? "WAITLISTED"
      : boogie.approvalMode === "AUTO_APPROVE" ? "APPROVED"
      : boogie.approvalMode === "WAITLIST_FIRST" ? "WAITLISTED"
      : "PENDING";

    const reg = await fastify.prisma.boogieRegistration.create({
      data: { uuid: uuidv4(), boogieId, userId, status, ...body, formData: body.formData || {} },
    });

    if (status === "APPROVED") {
      await fastify.prisma.boogie.update({ where: { id: boogieId }, data: { currentParticipants: { increment: 1 } } });
    }

    reply.code(201).send({ success: true, data: reg });
  });

  // Approve registration
  fastify.post<{ Params: { id: string; registrationId: string } }>("/boogies/:id/registrations/:registrationId/approve", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const regId = parseInt((request.params as any).registrationId);
    const reg = await fastify.prisma.boogieRegistration.update({
      where: { id: regId }, data: { status: "APPROVED", approvedAt: new Date(), approvedBy: parseInt(String(request.user!.sub)) },
    });
    await fastify.prisma.boogie.update({ where: { id: parseInt((request.params as any).id) }, data: { currentParticipants: { increment: 1 } } });
    reply.send({ success: true, data: reg });
  });

  // Reject registration
  fastify.post<{ Params: { id: string; registrationId: string } }>("/boogies/:id/registrations/:registrationId/reject", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const reg = await fastify.prisma.boogieRegistration.update({ where: { id: parseInt((request.params as any).registrationId) }, data: { status: "REJECTED" } });
    reply.send({ success: true, data: reg });
  });

  // Waitlist registration
  fastify.post<{ Params: { id: string; registrationId: string } }>("/boogies/:id/registrations/:registrationId/waitlist", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const reg = await fastify.prisma.boogieRegistration.update({ where: { id: parseInt((request.params as any).registrationId) }, data: { status: "WAITLISTED" } });
    reply.send({ success: true, data: reg });
  });

  // === PACKAGES ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/packages", { preHandler: [authenticate] }, async (request, reply) => {
    const packages = await fastify.prisma.boogiePackage.findMany({
      where: { boogieId: parseInt((request.params as any).id) }, orderBy: { sortOrder: "asc" },
    });
    reply.send({ success: true, data: packages });
  });

  fastify.post<{ Params: { id: string } }>("/boogies/:id/packages", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const pkg = await fastify.prisma.boogiePackage.create({
      data: { boogieId: parseInt((request.params as any).id), name: body.name, description: body.description, priceCents: body.priceCents, currency: body.currency || "AED", packageType: body.packageType, includes: body.includes || [], sortOrder: body.sortOrder || 0 },
    });
    reply.code(201).send({ success: true, data: pkg });
  });

  // === CALENDAR BLOCKS ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/calendar", { preHandler: [authenticate] }, async (request, reply) => {
    const blocks = await fastify.prisma.boogieCalendarBlock.findMany({
      where: { boogieId: parseInt((request.params as any).id) }, orderBy: [{ dayIndex: "asc" }, { sortOrder: "asc" }],
    });
    reply.send({ success: true, data: blocks });
  });

  fastify.post<{ Params: { id: string } }>("/boogies/:id/calendar/blocks", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const block = await fastify.prisma.boogieCalendarBlock.create({
      data: { boogieId: parseInt((request.params as any).id), title: body.title, blockType: body.blockType, dayIndex: body.dayIndex, startTime: body.startTime, endTime: body.endTime, notes: body.notes, color: body.color, groupIds: body.groupIds || [], instructorIds: body.instructorIds || [], sortOrder: body.sortOrder || 0 },
    });
    reply.code(201).send({ success: true, data: block });
  });

  fastify.patch<{ Params: { id: string; blockId: string } }>("/boogies/:id/calendar/blocks/:blockId", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const updated = await fastify.prisma.boogieCalendarBlock.update({ where: { id: parseInt((request.params as any).blockId) }, data: body });
    reply.send({ success: true, data: updated });
  });

  fastify.delete<{ Params: { id: string; blockId: string } }>("/boogies/:id/calendar/blocks/:blockId", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    await fastify.prisma.boogieCalendarBlock.delete({ where: { id: parseInt((request.params as any).blockId) } });
    reply.send({ success: true, data: { message: "Block deleted" } });
  });

  // === GROUPS ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/groups", { preHandler: [authenticate] }, async (request, reply) => {
    const groups = await fastify.prisma.boogieGroup.findMany({
      where: { boogieId: parseInt((request.params as any).id) },
      include: { members: true, instructor: { select: { firstName: true, lastName: true } } },
      orderBy: { sortOrder: "asc" },
    });
    reply.send({ success: true, data: groups });
  });

  fastify.post<{ Params: { id: string } }>("/boogies/:id/groups", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const group = await fastify.prisma.boogieGroup.create({
      data: { boogieId: parseInt((request.params as any).id), name: body.name, groupType: body.groupType || "JUMP", discipline: body.discipline, maxSize: body.maxSize || 8, instructorId: body.instructorId, sortOrder: body.sortOrder || 0 },
    });
    reply.code(201).send({ success: true, data: group });
  });

  fastify.patch<{ Params: { id: string; groupId: string } }>("/boogies/:id/groups/:groupId", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const updated = await fastify.prisma.boogieGroup.update({ where: { id: parseInt((request.params as any).groupId) }, data: body });
    reply.send({ success: true, data: updated });
  });

  fastify.post<{ Params: { id: string; groupId: string } }>("/boogies/:id/groups/:groupId/lock", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const updated = await fastify.prisma.boogieGroup.update({ where: { id: parseInt((request.params as any).groupId) }, data: { isLocked: true } });
    reply.send({ success: true, data: updated });
  });

  fastify.post<{ Params: { id: string; groupId: string } }>("/boogies/:id/groups/:groupId/unlock", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const updated = await fastify.prisma.boogieGroup.update({ where: { id: parseInt((request.params as any).groupId) }, data: { isLocked: false } });
    reply.send({ success: true, data: updated });
  });

  // === GROUP MEMBERS (persist drag-and-drop) ===

  fastify.post<{ Params: { id: string; groupId: string } }>("/boogies/:id/groups/:groupId/members", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const groupId = parseInt((request.params as any).groupId);
    const body = request.body as { registrationId: number; role?: string; fitScore?: number; notes?: string };
    const member = await fastify.prisma.boogieGroupMember.create({
      data: { groupId, registrationId: body.registrationId, role: body.role || "PARTICIPANT", fitScore: body.fitScore, notes: body.notes },
    });
    await auditService.log({ userId: parseInt(String(request.user!.sub)), dropzoneId: parseInt(request.user!.dropzoneId!, 10), action: "CREATE", entityType: "BoogieGroupMember", entityId: member.id, afterState: { groupId, registrationId: body.registrationId } });
    reply.code(201).send({ success: true, data: member });
  });

  fastify.delete<{ Params: { id: string; groupId: string; memberId: string } }>("/boogies/:id/groups/:groupId/members/:memberId", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const memberId = parseInt((request.params as any).memberId);
    await fastify.prisma.boogieGroupMember.delete({ where: { id: memberId } });
    await auditService.log({ userId: parseInt(String(request.user!.sub)), dropzoneId: parseInt(request.user!.dropzoneId!, 10), action: "DELETE", entityType: "BoogieGroupMember", entityId: memberId });
    reply.send({ success: true, data: { message: "Member removed" } });
  });

  // === STAFF ASSIGNMENTS ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/staffing", { preHandler: [authenticate, tenantScope] }, async (request, reply) => {
    const assignments = await fastify.prisma.boogieStaffAssignment.findMany({
      where: { boogieId: parseInt((request.params as any).id) },
      include: { staff: { select: { firstName: true, lastName: true } }, group: { select: { name: true, groupType: true } }, assigner: { select: { firstName: true, lastName: true } } },
      orderBy: { assignedAt: "desc" },
    });
    reply.send({ success: true, data: assignments });
  });

  fastify.post<{ Params: { id: string } }>("/boogies/:id/staffing", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const boogieId = parseInt((request.params as any).id);
    const body = request.body as { staffId: number; groupId?: number; calendarBlockId?: number; roleType: string; disciplines?: string[]; notes?: string };
    const assignment = await fastify.prisma.boogieStaffAssignment.create({
      data: { boogieId, staffId: body.staffId, groupId: body.groupId, calendarBlockId: body.calendarBlockId, roleType: body.roleType, disciplines: body.disciplines || [], assignedBy: parseInt(String(request.user!.sub)), notes: body.notes },
    });
    await auditService.log({ userId: parseInt(String(request.user!.sub)), dropzoneId: parseInt(request.user!.dropzoneId!, 10), action: "CREATE", entityType: "BoogieStaffAssignment", entityId: assignment.id, afterState: { staffId: body.staffId, roleType: body.roleType, groupId: body.groupId } });
    reply.code(201).send({ success: true, data: assignment });
  });

  fastify.patch<{ Params: { id: string; assignmentId: string } }>("/boogies/:id/staffing/:assignmentId", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const updated = await fastify.prisma.boogieStaffAssignment.update({ where: { id: parseInt((request.params as any).assignmentId) }, data: body });
    reply.send({ success: true, data: updated });
  });

  fastify.delete<{ Params: { id: string; assignmentId: string } }>("/boogies/:id/staffing/:assignmentId", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    await fastify.prisma.boogieStaffAssignment.delete({ where: { id: parseInt((request.params as any).assignmentId) } });
    reply.send({ success: true, data: { message: "Staff assignment removed" } });
  });

  // === ANNOUNCEMENTS ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/announcements", { preHandler: [authenticate] }, async (request, reply) => {
    const announcements = await fastify.prisma.boogieAnnouncement.findMany({
      where: { boogieId: parseInt((request.params as any).id) },
      include: { creator: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    reply.send({ success: true, data: announcements });
  });

  fastify.post<{ Params: { id: string } }>("/boogies/:id/announcements", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const ann = await fastify.prisma.boogieAnnouncement.create({
      data: { boogieId: parseInt((request.params as any).id), title: body.title, body: body.body, channel: body.channel || "IN_APP", triggerType: body.triggerType, createdBy: parseInt(String(request.user!.sub)) },
    });
    reply.code(201).send({ success: true, data: ann });
  });

  fastify.post<{ Params: { id: string; announcementId: string } }>("/boogies/:id/announcements/:announcementId/send", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const updated = await fastify.prisma.boogieAnnouncement.update({
      where: { id: parseInt((request.params as any).announcementId) }, data: { sentAt: new Date() },
    });
    reply.send({ success: true, data: { message: "Announcement sent", sentAt: updated.sentAt } });
  });

  // === FORM SCHEMA ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/form-schema", { preHandler: [authenticate] }, async (request, reply) => {
    const boogie = await fastify.prisma.boogie.findUnique({ where: { id: parseInt((request.params as any).id) }, select: { formSchema: true } });
    if (!boogie) throw new NotFoundError("Boogie");
    reply.send({ success: true, data: boogie.formSchema });
  });

  fastify.put<{ Params: { id: string } }>("/boogies/:id/form-schema", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const updated = await fastify.prisma.boogie.update({ where: { id: parseInt((request.params as any).id) }, data: { formSchema: body.schema || body } });
    reply.send({ success: true, data: updated.formSchema });
  });

  // === TEMPLATES ===

  fastify.get("/boogie-templates", { preHandler: [authenticate] }, async (request, reply) => {
    const templates = await fastify.prisma.boogieTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    reply.send({ success: true, data: templates });
  });

  fastify.post("/boogie-templates", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as any;
    const template = await fastify.prisma.boogieTemplate.create({
      data: { name: body.name, templateType: body.templateType, description: body.description, defaultData: body.defaultData || {}, formSchema: body.formSchema || [] },
    });
    reply.code(201).send({ success: true, data: template });
  });

  fastify.post<{ Params: { templateId: string } }>("/boogie-templates/:templateId/apply", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const template = await fastify.prisma.boogieTemplate.findUnique({ where: { id: parseInt((request.params as any).templateId) } });
    if (!template) throw new NotFoundError("Template");
    reply.send({ success: true, data: { defaultData: template.defaultData, formSchema: template.formSchema, templateType: template.templateType } });
  });

  // === MATCHING ENGINE ===

  fastify.get<{ Params: { id: string } }>("/boogies/:id/matching", {
    preHandler: [authenticate, tenantScope],
  }, async (request, reply) => {
    const engine = new BoogieMatchingEngine(fastify.prisma);
    const assessments = await engine.assessAll(parseInt((request.params as any).id));
    reply.send({ success: true, data: assessments });
  });

  fastify.post<{ Params: { id: string } }>("/boogies/:id/matching/recalculate", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const engine = new BoogieMatchingEngine(fastify.prisma);
    const assessments = await engine.assessAll(parseInt((request.params as any).id));
    reply.send({ success: true, data: assessments, meta: { recalculatedAt: new Date() } });
  });

  // Auto-build recommended groups from matching scores
  fastify.post<{ Params: { id: string } }>("/boogies/:id/matching/auto-build", {
    preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    const body = request.body as { maxGroupSize?: number } || {};
    const engine = new BoogieMatchingEngine(fastify.prisma);
    const result = await engine.autoBuildGroups(parseInt((request.params as any).id), body.maxGroupSize || 8);
    await auditService.log({ userId: parseInt(String(request.user!.sub)), dropzoneId: parseInt(request.user!.dropzoneId!, 10), action: "CREATE", entityType: "BoogieAutoGroupBuild", entityId: parseInt((request.params as any).id), afterState: result });
    reply.send({ success: true, data: result });
  });
}
