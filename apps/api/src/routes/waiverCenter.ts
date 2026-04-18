import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

// ============================================================================
// WAIVER CENTER ROUTES — Templates, Versions, Submissions, Delivery
// ============================================================================

const createTemplateSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  waiverType: z.enum(["TANDEM", "AFF", "EXPERIENCED", "MINOR", "SPECTATOR", "MEDIA"]),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  category: z.string().default("general"),
  audienceType: z.enum(["internal_user", "external_guest", "both"]).default("both"),
  requireMinor: z.boolean().default(false),
  requireMedical: z.boolean().default(false),
});

const updateTemplateSchema = createTemplateSchema.partial();

const publishVersionSchema = z.object({
  effectiveFrom: z.string().optional(),
});

const sendRequestSchema = z.object({
  templateId: z.number().int().positive(),
  versionId: z.number().int().positive().optional(),
  channel: z.enum(["EMAIL", "WHATSAPP", "PUSH", "IN_APP", "KIOSK", "QR"]),
  recipients: z.array(z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
    userId: z.number().int().positive().optional(),
  })).min(1),
});

const submitWaiverSchema = z.object({
  answers: z.record(z.any()),
  signerName: z.string().min(1),
  signerEmail: z.string().email().optional(),
  signerPhone: z.string().optional(),
  isMinor: z.boolean().default(false),
  guardianName: z.string().optional(),
  guardianRelation: z.string().optional(),
  signatureName: z.string().min(1),
  signatureMethod: z.enum(["TYPED", "DRAWN", "BIOMETRIC"]).default("TYPED"),
});

export async function waiverCenterRoutes(fastify: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────
  // TEMPLATES CRUD
  // ─────────────────────────────────────────────────────────────

  // List all waiver templates for a dropzone
  fastify.get(
    "/waivers/templates",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const templates = await fastify.prisma.waiverTemplate.findMany({
        where: { dropzoneId },
        include: {
          versions: { select: { id: true, version: true, status: true, publishedAt: true, _count: { select: { sections: true } } }, orderBy: { version: "desc" } },
          _count: { select: { publishLinks: true, signRequests: true } },
          tags: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      // Get submission counts per template
      const templatesWithCounts = await Promise.all(
        templates.map(async (t) => {
          const submissionCount = await fastify.prisma.waiverSubmission.count({
            where: { templateId: t.id },
          });
          return {
            ...t,
            submissionsCount: submissionCount,
            currentVersion: t.versions[0]?.version || 0,
          };
        })
      );

      reply.send(templatesWithCounts);
    }
  );

  // Get single template
  fastify.get(
    "/waivers/templates/:id",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const template = await fastify.prisma.waiverTemplate.findUnique({
        where: { id: parseInt(id) },
        include: {
          versions: {
            include: { sections: { include: { fields: true }, orderBy: { orderIndex: "asc" } } },
            orderBy: { version: "desc" },
          },
          publishLinks: { where: { active: true } },
          tags: true,
        },
      });
      if (!template) throw new NotFoundError("Waiver template not found");
      reply.send(template);
    }
  );

  // Create template
  fastify.post(
    "/waivers/templates",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const body = createTemplateSchema.parse(request.body);
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));

      const template = await fastify.prisma.waiverTemplate.create({
        data: {
          uuid: randomUUID(),
          dropzoneId,
          title: body.title,
          description: body.description,
          waiverType: body.waiverType as any,
          slug: body.slug,
          category: body.category,
          audienceType: body.audienceType,
          requireMinor: body.requireMinor,
          requireMedical: body.requireMedical,
          status: "DRAFT",
          createdByUserId: userId,
        },
      });

      // Create initial draft version
      await fastify.prisma.waiverTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          status: "DRAFT",
          titleSnapshot: body.title,
          descriptionSnapshot: body.description,
          content: { title: body.title, sections: [] },
        },
      });

      // Log audit
      await fastify.prisma.waiverAuditLog.create({
        data: { templateId: template.id, actorUserId: userId, action: "CREATED", details: { title: body.title } },
      });

      reply.status(201).send(template);
    }
  );

  // Update template
  fastify.patch(
    "/waivers/templates/:id",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTemplateSchema.parse(request.body);
      const userId = parseInt(String(request.user!.sub));

      const template = await fastify.prisma.waiverTemplate.update({
        where: { id: parseInt(id) },
        data: { ...body, updatedByUserId: userId, waiverType: body.waiverType as any },
      });

      reply.send(template);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // VERSIONS
  // ─────────────────────────────────────────────────────────────

  // Publish a version
  fastify.post(
    "/waivers/templates/:id/publish",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = publishVersionSchema.parse(request.body || {});
      const userId = parseInt(String(request.user!.sub));
      const templateId = parseInt(id);

      // Find the latest draft version
      const draftVersion = await fastify.prisma.waiverTemplateVersion.findFirst({
        where: { templateId, status: "DRAFT" },
        orderBy: { version: "desc" },
        include: { sections: { include: { fields: true } } },
      });

      if (!draftVersion) throw new NotFoundError("No draft version found to publish");

      // Archive current published version
      await fastify.prisma.waiverTemplateVersion.updateMany({
        where: { templateId, status: "PUBLISHED" },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });

      // Compute checksum of content
      const contentStr = JSON.stringify(draftVersion.content);
      const checksum = createHash("sha256").update(contentStr).digest("hex").substring(0, 64);

      // Publish the draft
      const published = await fastify.prisma.waiverTemplateVersion.update({
        where: { id: draftVersion.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedByUserId: userId,
          checksum,
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        },
      });

      // Update template status and current version
      await fastify.prisma.waiverTemplate.update({
        where: { id: templateId },
        data: { status: "PUBLISHED", currentVersionId: published.id },
      });

      // Audit log
      await fastify.prisma.waiverAuditLog.create({
        data: { templateId, actorUserId: userId, action: "PUBLISHED", details: { version: draftVersion.version } },
      });

      reply.send(published);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SUBMISSIONS
  // ─────────────────────────────────────────────────────────────

  // List submissions (signed waivers)
  fastify.get(
    "/waivers/submissions",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const query = request.query as { status?: string; search?: string; limit?: string; offset?: string };

      const where: any = {};

      // Get template IDs for this dropzone
      const templateIds = (await fastify.prisma.waiverTemplate.findMany({
        where: { dropzoneId },
        select: { id: true },
      })).map((t) => t.id);

      where.templateId = { in: templateIds };
      if (query.status) where.submissionStatus = query.status;
      if (query.search) {
        where.OR = [
          { signerName: { contains: query.search } },
          { signerEmail: { contains: query.search } },
        ];
      }

      const submissions = await fastify.prisma.waiverSubmission.findMany({
        where,
        include: {
          version: { select: { version: true, templateId: true, titleSnapshot: true } },
          signatures: true,
          reviews: true,
        },
        orderBy: { createdAt: "desc" },
        take: parseInt(query.limit || "50"),
        skip: parseInt(query.offset || "0"),
      });

      reply.send(submissions);
    }
  );

  // Get single submission detail
  fastify.get(
    "/waivers/submissions/:id",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const submission = await fastify.prisma.waiverSubmission.findUnique({
        where: { id: parseInt(id) },
        include: {
          version: { include: { template: true } },
          signatures: true,
          reviews: true,
          signRequest: true,
        },
      });
      if (!submission) throw new NotFoundError("Submission not found");
      reply.send(submission);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // EXTERNAL SIGNING (public, no auth required)
  // ─────────────────────────────────────────────────────────────

  // Get waiver for signing (public)
  fastify.get(
    "/waivers/sign/:orgSlug/:waiverSlug",
    async (request, reply) => {
      const { orgSlug, waiverSlug } = request.params as { orgSlug: string; waiverSlug: string };

      // Find the organization by slug
      const org = await fastify.prisma.organization.findUnique({
        where: { slug: orgSlug },
        include: { dropzones: { take: 1 } },
      });

      if (!org || !org.dropzones[0]) throw new NotFoundError("Organization not found");

      const dropzoneId = org.dropzones[0].id;

      // Find template
      const template = await fastify.prisma.waiverTemplate.findFirst({
        where: { dropzoneId, slug: waiverSlug, status: "PUBLISHED" },
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            include: { sections: { include: { fields: true }, orderBy: { orderIndex: "asc" } } },
            take: 1,
          },
        },
      });

      if (!template || !template.versions[0]) throw new NotFoundError("Waiver not found or not published");

      reply.send({
        templateTitle: template.title,
        orgName: org.name,
        version: template.versions[0].version,
        requireMinor: template.requireMinor,
        requireMedical: template.requireMedical,
        sections: template.versions[0].sections.map((s) => ({
          key: s.key,
          title: s.title,
          content: s.content,
          sectionType: s.sectionType,
          required: s.required,
          fields: s.fields.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.fieldType,
            required: f.required,
            placeholder: f.placeholder,
            options: f.optionsJson,
          })),
        })),
      });
    }
  );

  // Submit signed waiver (public)
  fastify.post(
    "/waivers/sign/:orgSlug/:waiverSlug",
    async (request, reply) => {
      const { orgSlug, waiverSlug } = request.params as { orgSlug: string; waiverSlug: string };
      const body = submitWaiverSchema.parse(request.body);

      const org = await fastify.prisma.organization.findUnique({
        where: { slug: orgSlug },
        include: { dropzones: { take: 1 } },
      });
      if (!org || !org.dropzones[0]) throw new NotFoundError("Organization not found");

      const template = await fastify.prisma.waiverTemplate.findFirst({
        where: { dropzoneId: org.dropzones[0].id, slug: waiverSlug, status: "PUBLISHED" },
        include: { versions: { where: { status: "PUBLISHED" }, take: 1 } },
      });
      if (!template || !template.versions[0]) throw new NotFoundError("Waiver not found");

      const version = template.versions[0];
      const ip = (request.headers["x-forwarded-for"] as string) || request.ip;
      const ua = request.headers["user-agent"] || "";

      // Create submission
      const submission = await fastify.prisma.waiverSubmission.create({
        data: {
          uuid: randomUUID(),
          templateId: template.id,
          versionId: version.id,
          submissionStatus: "signed",
          signerType: body.isMinor ? "guardian" : "self",
          signerName: body.signerName,
          signerEmail: body.signerEmail,
          signerPhone: body.signerPhone,
          signerIp: ip,
          signerUserAgent: ua.substring(0, 500),
          locale: "en",
          isMinor: body.isMinor,
          guardianRequired: body.isMinor,
          guardianName: body.guardianName,
          guardianRelation: body.guardianRelation,
          answersJson: body.answers,
          sourceChannel: "WEB",
          submittedAt: new Date(),
        },
      });

      // Create signature record
      await fastify.prisma.waiverSubmissionSignature.create({
        data: {
          submissionId: submission.id,
          signerType: body.isMinor ? "GUARDIAN" : "PARTICIPANT",
          signatureData: body.signatureName,
          signatureMethod: body.signatureMethod,
          ipAddress: ip,
        },
      });

      // Audit log
      await fastify.prisma.waiverAuditLog.create({
        data: {
          templateId: template.id,
          submissionId: submission.id,
          action: "SIGNED",
          details: { signerName: body.signerName, channel: "WEB" },
        },
      });

      reply.status(201).send({
        id: submission.uuid,
        status: "signed",
        templateTitle: template.title,
        version: version.version,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SIGN REQUESTS
  // ─────────────────────────────────────────────────────────────

  // List sign requests
  fastify.get(
    "/waivers/requests",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const templateIds = (await fastify.prisma.waiverTemplate.findMany({
        where: { dropzoneId },
        select: { id: true },
      })).map((t) => t.id);

      const requests = await fastify.prisma.waiverSignRequest.findMany({
        where: { templateId: { in: templateIds } },
        include: {
          template: { select: { title: true } },
          version: { select: { version: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      reply.send(requests);
    }
  );

  // Send waiver request(s)
  fastify.post(
    "/waivers/send",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "MANIFEST_STAFF", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const body = sendRequestSchema.parse(request.body);
      const userId = parseInt(String(request.user!.sub));

      // Find or use latest published version
      let versionId = body.versionId;
      if (!versionId) {
        const version = await fastify.prisma.waiverTemplateVersion.findFirst({
          where: { templateId: body.templateId, status: "PUBLISHED" },
          orderBy: { version: "desc" },
        });
        if (!version) throw new NotFoundError("No published version found");
        versionId = version.id;
      }

      const signRequests = await Promise.all(
        body.recipients.map(async (r) => {
          const sr = await fastify.prisma.waiverSignRequest.create({
            data: {
              uuid: randomUUID(),
              templateId: body.templateId,
              versionId: versionId!,
              userId: r.userId,
              externalName: r.name,
              externalEmail: r.email,
              externalPhone: r.phone,
              requestedViaChannel: body.channel,
              status: "QUEUED",
              createdByUserId: userId,
            },
          });

          // Create delivery log
          await fastify.prisma.waiverDeliveryLog.create({
            data: {
              templateId: body.templateId,
              recipientUserId: r.userId,
              recipientEmail: r.email,
              recipientPhone: r.phone,
              channel: body.channel as any,
              status: "PENDING",
            },
          });

          return sr;
        })
      );

      reply.status(201).send({ sent: signRequests.length, requests: signRequests });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // DELIVERY LOGS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/waivers/delivery-logs",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const templateIds = (await fastify.prisma.waiverTemplate.findMany({
        where: { dropzoneId },
        select: { id: true },
      })).map((t) => t.id);

      const logs = await fastify.prisma.waiverDeliveryLog.findMany({
        where: { templateId: { in: templateIds } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      // Build a title map for templates
      const titleMap = new Map<number, string>();
      for (const t of await fastify.prisma.waiverTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, title: true } })) {
        titleMap.set(t.id, t.title);
      }
      reply.send(logs.map((l) => ({ ...l, templateTitle: titleMap.get(l.templateId) || `Template #${l.templateId}` })));
    }
  );

  // ─────────────────────────────────────────────────────────────
  // ORG INFO (for building public signing URLs)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/waivers/org-info",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const dz = await fastify.prisma.dropzone.findUnique({
        where: { id: dropzoneId },
        include: { organization: { select: { slug: true, name: true } } },
      });
      if (!dz) throw new NotFoundError("Dropzone not found");
      reply.send({ slug: dz.organization.slug, name: dz.organization.name, dropzoneName: dz.name });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/waivers/audit",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const templateIds = (await fastify.prisma.waiverTemplate.findMany({
        where: { dropzoneId },
        select: { id: true },
      })).map((t) => t.id);

      const logs = await fastify.prisma.waiverAuditLog.findMany({
        where: { templateId: { in: templateIds } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const titleMap2 = new Map<number, string>();
      for (const t of await fastify.prisma.waiverTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, title: true } })) {
        titleMap2.set(t.id, t.title);
      }
      reply.send(logs.map((l) => ({ ...l, templateTitle: l.templateId ? titleMap2.get(l.templateId) || `Template #${l.templateId}` : 'System' })));
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SEED — Licensed Jumper Waiver (idempotent)
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/waivers/seed",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));

      // Check if already seeded
      const existing = await fastify.prisma.waiverTemplate.findFirst({
        where: { dropzoneId, slug: "licensed-jumper-waiver" },
      });
      if (existing) {
        return reply.send({ seeded: false, message: "Licensed Jumper Waiver already exists", templateId: existing.id });
      }

      const template = await fastify.prisma.waiverTemplate.create({
        data: {
          uuid: randomUUID(),
          dropzoneId,
          category: "experienced",
          title: "Licensed Jumper Waiver",
          description: "Comprehensive waiver for USPA-licensed skydivers covering liability, assumption of risk, medical declaration, equipment acknowledgement, and emergency contact information.",
          waiverType: "EXPERIENCED",
          slug: "licensed-jumper-waiver",
          audienceType: "both",
          requireMinor: false,
          requireMedical: true,
          status: "PUBLISHED",
          createdByUserId: userId,
          configJson: { expiryMonths: 12, requirePhoto: false },
        },
      });

      const version = await fastify.prisma.waiverTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          status: "PUBLISHED",
          titleSnapshot: "Licensed Jumper Waiver",
          descriptionSnapshot: template.description,
          publishedAt: new Date(),
          publishedByUserId: userId,
          effectiveFrom: new Date(),
          checksum: createHash("sha256").update("licensed-jumper-waiver-v1").digest("hex").substring(0, 64),
          content: {
            title: "Licensed Jumper Waiver",
            sections: [
              { key: "hero", type: "hero", title: "Licensed Jumper Waiver & Release of Liability", subtitle: "SkyHigh Dropzone", required: false },
              { key: "intro", type: "rich_text", title: "Introduction", content: "This document constitutes a legally binding agreement between you (the \"Participant\") and SkyHigh Dropzone (\"the Facility\"). By signing, you acknowledge that you have read, understood, and voluntarily agree to all terms herein.", required: false },
              { key: "participant_info", type: "field_group", title: "Participant Information", required: true, fields: [
                { key: "firstName", label: "First Name", type: "TEXT", required: true },
                { key: "lastName", label: "Last Name", type: "TEXT", required: true },
                { key: "email", label: "Email Address", type: "EMAIL", required: true },
                { key: "phone", label: "Phone Number", type: "PHONE", required: true },
                { key: "dateOfBirth", label: "Date of Birth", type: "DATE", required: true },
                { key: "address", label: "Mailing Address", type: "TEXTAREA", required: false },
              ]},
              { key: "license_info", type: "field_group", title: "USPA License Information", required: true, fields: [
                { key: "uspaNumber", label: "USPA Member Number", type: "TEXT", required: true },
                { key: "licenseClass", label: "License Class", type: "SELECT", required: true, options: ["A", "B", "C", "D"] },
                { key: "totalJumps", label: "Total Jump Count", type: "NUMBER", required: true },
                { key: "lastJumpDate", label: "Date of Last Jump", type: "DATE", required: true },
              ]},
              { key: "assumption_of_risk", type: "rich_text", title: "Assumption of Risk", content: "I understand that skydiving and parachuting activities involve inherent risks including but not limited to: equipment malfunction, mid-air collisions, adverse weather conditions, hard landings, landing in unintended areas, aircraft incidents, and death. I voluntarily and knowingly assume all such risks, both known and unknown.", required: true, requireAcknowledge: true },
              { key: "release_liability", type: "rich_text", title: "Release of Liability", content: "I hereby release, waive, discharge, and covenant not to sue SkyHigh Dropzone, its owners, officers, employees, agents, instructors, pilots, riggers, packers, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury, including death, that may be sustained by me.", required: true, requireAcknowledge: true },
              { key: "indemnification", type: "rich_text", title: "Indemnification Agreement", content: "I agree to indemnify, defend, and hold harmless SkyHigh Dropzone from any and all claims, damages, losses, or expenses (including attorney's fees) arising from my participation in skydiving activities or any breach of this agreement.", required: true, requireAcknowledge: true },
              { key: "equipment_acknowledgement", type: "checkbox_group", title: "Equipment Acknowledgement", required: true, items: [
                { key: "ownGear", label: "I certify that my equipment has been inspected and is in airworthy condition" },
                { key: "aadEquipped", label: "My rig is equipped with a functioning AAD (Automatic Activation Device)" },
                { key: "reserveCurrent", label: "My reserve parachute is within its repack cycle" },
                { key: "gearResponsibility", label: "I accept full responsibility for the condition and operation of my equipment" },
              ]},
              { key: "medical_declaration", type: "checkbox_group", title: "Medical Declaration", required: true, items: [
                { key: "noHeart", label: "I have no known heart conditions or cardiovascular disease" },
                { key: "noSeizures", label: "I have no history of seizures, epilepsy, or neurological disorders" },
                { key: "noBackNeck", label: "I have no current back, neck, or spinal injuries" },
                { key: "noMedication", label: "I am not under the influence of alcohol, drugs, or impairing medication" },
                { key: "physicallyFit", label: "I am physically fit to participate in skydiving activities" },
              ]},
              { key: "medical_conditions", type: "field_group", title: "Medical Conditions (if any)", required: false, fields: [
                { key: "conditions", label: "List any medical conditions, allergies, or medications", type: "TEXTAREA", required: false },
              ]},
              { key: "emergency_contact", type: "field_group", title: "Emergency Contact", required: true, fields: [
                { key: "emergencyName", label: "Emergency Contact Name", type: "TEXT", required: true },
                { key: "emergencyPhone", label: "Emergency Contact Phone", type: "PHONE", required: true },
                { key: "emergencyRelation", label: "Relationship", type: "TEXT", required: true },
              ]},
              { key: "photo_consent", type: "checkbox", title: "Photo & Video Consent", label: "I grant SkyHigh Dropzone permission to use photographs or video recordings taken during my visit for promotional purposes.", required: false },
              { key: "local_rules", type: "checkbox", title: "Local Rules Acknowledgement", label: "I have read and agree to abide by all SkyHigh Dropzone local rules, procedures, and DZ-specific regulations.", required: true },
              { key: "signature_group", type: "signature_group", title: "Signature", required: true, fields: [
                { key: "signatureName", label: "Full Legal Name", type: "SIGNATURE" },
                { key: "signatureDate", label: "Date", type: "DATE" },
              ]},
            ],
          },
        },
      });

      // Create sections and fields in the DB as well
      const sectionDefs = [
        { key: "hero", title: "Licensed Jumper Waiver & Release of Liability", sectionType: "HEADING", orderIndex: 0, required: false, content: "SkyHigh Dropzone" },
        { key: "intro", title: "Introduction", sectionType: "PARAGRAPH", orderIndex: 1, required: false, content: "This document constitutes a legally binding agreement between you (the \"Participant\") and SkyHigh Dropzone (\"the Facility\"). By signing, you acknowledge that you have read, understood, and voluntarily agree to all terms herein." },
        { key: "participant_info", title: "Participant Information", sectionType: "CUSTOM_FIELDS", orderIndex: 2, required: true, content: null,
          fields: [
            { key: "firstName", label: "First Name", fieldType: "TEXT", required: true, orderIndex: 0 },
            { key: "lastName", label: "Last Name", fieldType: "TEXT", required: true, orderIndex: 1 },
            { key: "email", label: "Email Address", fieldType: "EMAIL", required: true, orderIndex: 2 },
            { key: "phone", label: "Phone Number", fieldType: "PHONE", required: true, orderIndex: 3 },
            { key: "dateOfBirth", label: "Date of Birth", fieldType: "DATE", required: true, orderIndex: 4 },
            { key: "address", label: "Mailing Address", fieldType: "TEXTAREA", required: false, orderIndex: 5 },
          ]},
        { key: "license_info", title: "USPA License Information", sectionType: "CUSTOM_FIELDS", orderIndex: 3, required: true, content: null,
          fields: [
            { key: "uspaNumber", label: "USPA Member Number", fieldType: "TEXT", required: true, orderIndex: 0 },
            { key: "licenseClass", label: "License Class", fieldType: "SELECT", required: true, orderIndex: 1, options: ["A", "B", "C", "D"] },
            { key: "totalJumps", label: "Total Jump Count", fieldType: "NUMBER", required: true, orderIndex: 2 },
            { key: "lastJumpDate", label: "Date of Last Jump", fieldType: "DATE", required: true, orderIndex: 3 },
          ]},
        { key: "assumption_of_risk", title: "Assumption of Risk", sectionType: "CLAUSE", orderIndex: 4, required: true, content: "I understand that skydiving and parachuting activities involve inherent risks including but not limited to: equipment malfunction, mid-air collisions, adverse weather conditions, hard landings, landing in unintended areas, aircraft incidents, and death. I voluntarily and knowingly assume all such risks, both known and unknown." },
        { key: "release_liability", title: "Release of Liability", sectionType: "CLAUSE", orderIndex: 5, required: true, content: "I hereby release, waive, discharge, and covenant not to sue SkyHigh Dropzone, its owners, officers, employees, agents, instructors, pilots, riggers, packers, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury, including death, that may be sustained by me." },
        { key: "indemnification", title: "Indemnification Agreement", sectionType: "CLAUSE", orderIndex: 6, required: true, content: "I agree to indemnify, defend, and hold harmless SkyHigh Dropzone from any and all claims, damages, losses, or expenses (including attorney's fees) arising from my participation in skydiving activities or any breach of this agreement." },
        { key: "equipment_acknowledgement", title: "Equipment Acknowledgement", sectionType: "CHECKBOX_GROUP", orderIndex: 7, required: true, content: null,
          fields: [
            { key: "ownGear", label: "I certify that my equipment has been inspected and is in airworthy condition", fieldType: "CHECKBOX", required: true, orderIndex: 0 },
            { key: "aadEquipped", label: "My rig is equipped with a functioning AAD (Automatic Activation Device)", fieldType: "CHECKBOX", required: true, orderIndex: 1 },
            { key: "reserveCurrent", label: "My reserve parachute is within its repack cycle", fieldType: "CHECKBOX", required: true, orderIndex: 2 },
            { key: "gearResponsibility", label: "I accept full responsibility for the condition and operation of my equipment", fieldType: "CHECKBOX", required: true, orderIndex: 3 },
          ]},
        { key: "medical_declaration", title: "Medical Declaration", sectionType: "CHECKBOX_GROUP", orderIndex: 8, required: true, content: null,
          fields: [
            { key: "noHeart", label: "I have no known heart conditions or cardiovascular disease", fieldType: "CHECKBOX", required: true, orderIndex: 0 },
            { key: "noSeizures", label: "I have no history of seizures, epilepsy, or neurological disorders", fieldType: "CHECKBOX", required: true, orderIndex: 1 },
            { key: "noBackNeck", label: "I have no current back, neck, or spinal injuries", fieldType: "CHECKBOX", required: true, orderIndex: 2 },
            { key: "noMedication", label: "I am not under the influence of alcohol, drugs, or impairing medication", fieldType: "CHECKBOX", required: true, orderIndex: 3 },
            { key: "physicallyFit", label: "I am physically fit to participate in skydiving activities", fieldType: "CHECKBOX", required: true, orderIndex: 4 },
          ]},
        { key: "medical_conditions", title: "Medical Conditions (if any)", sectionType: "CUSTOM_FIELDS", orderIndex: 9, required: false, content: null,
          fields: [
            { key: "conditions", label: "List any medical conditions, allergies, or medications", fieldType: "TEXTAREA", required: false, orderIndex: 0 },
          ]},
        { key: "emergency_contact", title: "Emergency Contact", sectionType: "CUSTOM_FIELDS", orderIndex: 10, required: true, content: null,
          fields: [
            { key: "emergencyName", label: "Emergency Contact Name", fieldType: "TEXT", required: true, orderIndex: 0 },
            { key: "emergencyPhone", label: "Emergency Contact Phone", fieldType: "PHONE", required: true, orderIndex: 1 },
            { key: "emergencyRelation", label: "Relationship", fieldType: "TEXT", required: true, orderIndex: 2 },
          ]},
        { key: "photo_consent", title: "Photo & Video Consent", sectionType: "CLAUSE", orderIndex: 11, required: false, content: "I grant SkyHigh Dropzone permission to use photographs or video recordings taken during my visit for promotional purposes." },
        { key: "local_rules", title: "Local Rules Acknowledgement", sectionType: "CLAUSE", orderIndex: 12, required: true, content: "I have read and agree to abide by all SkyHigh Dropzone local rules, procedures, and DZ-specific regulations." },
        { key: "signature", title: "Signature", sectionType: "SIGNATURE_BLOCK", orderIndex: 13, required: true, content: "By signing below, I acknowledge that I have read, understood, and voluntarily agree to all terms stated in this waiver.",
          fields: [
            { key: "signatureName", label: "Full Legal Name", fieldType: "SIGNATURE", required: true, orderIndex: 0 },
            { key: "signatureDate", label: "Date", fieldType: "DATE", required: true, orderIndex: 1 },
          ]},
      ];

      for (const sec of sectionDefs) {
        const { fields: fieldDefs, ...sectionData } = sec as any;
        const section = await fastify.prisma.waiverSection.create({
          data: { versionId: version.id, ...sectionData },
        });
        if (fieldDefs) {
          for (const f of fieldDefs) {
            await fastify.prisma.waiverField.create({
              data: {
                sectionId: section.id,
                key: f.key,
                label: f.label,
                fieldType: f.fieldType as any,
                required: f.required,
                orderIndex: f.orderIndex,
                optionsJson: f.options || [],
              },
            });
          }
        }
      }

      // Update template's currentVersionId
      await fastify.prisma.waiverTemplate.update({
        where: { id: template.id },
        data: { currentVersionId: version.id },
      });

      // Audit log
      await fastify.prisma.waiverAuditLog.create({
        data: { templateId: template.id, actorUserId: userId, action: "SEEDED", details: { title: "Licensed Jumper Waiver", sections: sectionDefs.length } },
      });

      reply.status(201).send({ seeded: true, templateId: template.id, versionId: version.id });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // UPDATE VERSION CONTENT (save builder changes)
  // ─────────────────────────────────────────────────────────────

  fastify.put(
    "/waivers/templates/:id/version/content",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const templateId = parseInt(id);
      const body = request.body as { title?: string; sections: any[] };

      // Find the latest draft version
      let draftVersion = await fastify.prisma.waiverTemplateVersion.findFirst({
        where: { templateId, status: "DRAFT" },
        orderBy: { version: "desc" },
      });

      // If no draft, create a new one based on latest version
      if (!draftVersion) {
        const latestVersion = await fastify.prisma.waiverTemplateVersion.findFirst({
          where: { templateId },
          orderBy: { version: "desc" },
        });
        const newVersionNum = (latestVersion?.version || 0) + 1;
        draftVersion = await fastify.prisma.waiverTemplateVersion.create({
          data: {
            templateId,
            version: newVersionNum,
            status: "DRAFT",
            titleSnapshot: body.title || latestVersion?.titleSnapshot || "Untitled",
            content: { title: body.title, sections: body.sections },
          },
        });
      } else {
        // Update existing draft
        await fastify.prisma.waiverTemplateVersion.update({
          where: { id: draftVersion.id },
          data: {
            titleSnapshot: body.title || draftVersion.titleSnapshot,
            content: { title: body.title, sections: body.sections },
          },
        });
      }

      // Delete existing sections/fields for this version and recreate
      await fastify.prisma.waiverField.deleteMany({
        where: { section: { versionId: draftVersion.id } },
      });
      await fastify.prisma.waiverSection.deleteMany({
        where: { versionId: draftVersion.id },
      });

      // Recreate sections and fields
      for (let i = 0; i < body.sections.length; i++) {
        const sec = body.sections[i];
        const section = await fastify.prisma.waiverSection.create({
          data: {
            versionId: draftVersion.id,
            key: sec.key,
            title: sec.label || sec.title || "",
            content: sec.content || null,
            sectionType: (sec.type || "PARAGRAPH").toUpperCase(),
            orderIndex: i,
            required: sec.required ?? false,
          },
        });
        if (sec.fields?.length) {
          for (let j = 0; j < sec.fields.length; j++) {
            const f = sec.fields[j];
            await fastify.prisma.waiverField.create({
              data: {
                sectionId: section.id,
                key: f.key,
                label: f.label,
                fieldType: (f.type || "TEXT").toUpperCase() as any,
                required: f.required ?? false,
                placeholder: f.placeholder || null,
                optionsJson: f.options || [],
                orderIndex: j,
              },
            });
          }
        }
      }

      // Update template title if provided
      if (body.title) {
        await fastify.prisma.waiverTemplate.update({
          where: { id: templateId },
          data: { title: body.title },
        });
      }

      reply.send({ saved: true, versionId: draftVersion.id, version: draftVersion.version });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // VERSION HISTORY
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/waivers/templates/:id/versions",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const templateId = parseInt(id);

      const versions = await fastify.prisma.waiverTemplateVersion.findMany({
        where: { templateId },
        include: {
          sections: { select: { id: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { version: "desc" },
      });

      reply.send(versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        titleSnapshot: v.titleSnapshot,
        sectionsCount: v.sections.length,
        submissionsCount: v._count.submissions,
        publishedAt: v.publishedAt,
        publishedByUserId: v.publishedByUserId,
        effectiveFrom: v.effectiveFrom,
        createdAt: v.createdAt,
      })));
    }
  );

  // ─────────────────────────────────────────────────────────────
  // VERSION DETAIL (for compare)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/waivers/templates/:id/versions/:versionId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { id, versionId } = request.params as { id: string; versionId: string };
      const version = await fastify.prisma.waiverTemplateVersion.findFirst({
        where: { id: parseInt(versionId), templateId: parseInt(id) },
        include: {
          sections: { include: { fields: true }, orderBy: { orderIndex: "asc" } },
        },
      });
      if (!version) throw new NotFoundError("Version not found");
      reply.send(version);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // ROLLBACK (creates new draft from archived version)
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/waivers/templates/:id/versions/:versionId/rollback",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id, versionId } = request.params as { id: string; versionId: string };
      const templateId = parseInt(id);
      const userId = parseInt(String(request.user!.sub));

      // Get the source version with full content
      const sourceVersion = await fastify.prisma.waiverTemplateVersion.findFirst({
        where: { id: parseInt(versionId), templateId },
        include: { sections: { include: { fields: true }, orderBy: { orderIndex: "asc" } } },
      });
      if (!sourceVersion) throw new NotFoundError("Source version not found");

      // Delete any existing drafts
      const existingDrafts = await fastify.prisma.waiverTemplateVersion.findMany({
        where: { templateId, status: "DRAFT" },
        select: { id: true },
      });
      for (const d of existingDrafts) {
        await fastify.prisma.waiverField.deleteMany({ where: { section: { versionId: d.id } } });
        await fastify.prisma.waiverSection.deleteMany({ where: { versionId: d.id } });
        await fastify.prisma.waiverTemplateVersion.delete({ where: { id: d.id } });
      }

      // Get the highest version number
      const maxVersion = await fastify.prisma.waiverTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (maxVersion?.version || 0) + 1;

      // Create new draft version
      const newDraft = await fastify.prisma.waiverTemplateVersion.create({
        data: {
          templateId,
          version: nextVersion,
          status: "DRAFT",
          titleSnapshot: sourceVersion.titleSnapshot,
          content: sourceVersion.content || undefined,
        },
      });

      // Copy sections and fields
      for (const section of sourceVersion.sections) {
        const newSection = await fastify.prisma.waiverSection.create({
          data: {
            versionId: newDraft.id,
            key: section.key,
            sectionType: section.sectionType,
            title: section.title,
            content: section.content,
            required: section.required,
            orderIndex: section.orderIndex,
            // configJson not in schema — omitted
          },
        });
        for (const field of section.fields) {
          await fastify.prisma.waiverField.create({
            data: {
              sectionId: newSection.id,
              key: field.key,
              label: field.label,
              fieldType: field.fieldType,
              required: field.required,
              placeholder: field.placeholder,
              orderIndex: field.orderIndex,
              optionsJson: field.optionsJson || undefined,
              // validationJson not in schema — omitted
            },
          });
        }
      }

      // Audit log
      await fastify.prisma.waiverAuditLog.create({
        data: {
          templateId,
          actorUserId: userId,
          action: "ROLLBACK",
          details: { fromVersion: sourceVersion.version, newVersion: nextVersion },
        },
      });

      reply.status(201).send({ rolledBack: true, newVersionId: newDraft.id, version: nextVersion, fromVersion: sourceVersion.version });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // ARCHIVE VERSION
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/waivers/templates/:id/versions/:versionId/archive",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id, versionId } = request.params as { id: string; versionId: string };
      const userId = parseInt(String(request.user!.sub));

      const version = await fastify.prisma.waiverTemplateVersion.update({
        where: { id: parseInt(versionId) },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });

      await fastify.prisma.waiverAuditLog.create({
        data: {
          templateId: parseInt(id),
          actorUserId: userId,
          action: "ARCHIVED",
          details: { version: version.version },
        },
      });

      reply.send(version);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SUBMISSION REVIEW
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/waivers/submissions/:id/review",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "MANIFEST_STAFF", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { status: string; notes?: string };
      const userId = parseInt(String(request.user!.sub));

      const review = await fastify.prisma.waiverSubmissionReview.create({
        data: {
          submissionId: parseInt(id),
          reviewerUserId: userId,
          status: body.status,
          notes: body.notes,
        },
      });

      // Update submission based on review action
      if (body.status === "approved") {
        await fastify.prisma.waiverSubmission.update({
          where: { id: parseInt(id) },
          data: { reviewedAt: new Date() },
        });
      } else if (body.status === "invalidated") {
        await fastify.prisma.waiverSubmission.update({
          where: { id: parseInt(id) },
          data: { submissionStatus: "invalidated", invalidatedAt: new Date(), invalidationReason: body.notes },
        });
      }

      reply.send(review);
    }
  );
}
