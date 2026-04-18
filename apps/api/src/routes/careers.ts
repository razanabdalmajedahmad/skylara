import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import crypto from "crypto";

// ============================================================================
// CAREERS & RECRUITMENT ROUTES
// Job posting, application management, interview scheduling, talent sourcing,
// and candidate-facing endpoints.
// ============================================================================

// ---------------------------------------------------------------------------
// Valid enum values (mirrors Prisma enums for runtime validation)
// ---------------------------------------------------------------------------
const VALID_JOB_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "ARCHIVED",
] as const;

const VALID_APPLICATION_STAGES = [
  "APPLIED",
  "INITIAL_REVIEW",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "TECHNICAL_EVALUATION",
  "FINAL_REVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

const VALID_INTERVIEW_TYPES = [
  "VIDEO",
  "PHONE",
  "IN_PERSON",
  "TECHNICAL_JUMP",
  "TRIAL_DAY",
] as const;

const VALID_INTERVIEW_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

const VALID_VISIBILITY_TYPES = [
  "INTERNAL_TARGETED",
  "INTERNAL_PROFESSIONAL_POOL",
  "ORGANIZATION_ONLY",
  "DROPZONE_ONLY",
  "INVITE_ONLY",
  "PUBLIC_LINK",
  "PUBLIC_MARKETPLACE",
] as const;

const VALID_ROLE_CATEGORIES = [
  "TI",
  "AFFI",
  "COACH",
  "PILOT",
  "RIGGER",
  "MANIFEST_STAFF",
  "DZ_MANAGER",
  "CAMERA",
  "PACKER",
  "OTHER",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}

function parseDropzoneId(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const parsed = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseUserId(sub: string | number | undefined): number {
  return parseInt(String(sub), 10);
}

// ---------------------------------------------------------------------------
// Route module
// ---------------------------------------------------------------------------

export async function careersRoutes(fastify: FastifyInstance) {
  // ========================================================================
  // PUBLIC JOB BROWSE (any authenticated user)
  // ========================================================================

  // GET /careers/browse — Browse open/public jobs (athlete-facing)
  fastify.get<{
    Querystring: {
      roleCategory?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/careers/browse",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const where: any = { status: "PUBLISHED" };
        if (request.query.roleCategory) {
          where.roleCategory = request.query.roleCategory;
        }

        const [jobs, total] = await Promise.all([
          fastify.prisma.jobPost.findMany({
            where,
            select: {
              id: true,
              title: true,
              roleCategory: true,
              employmentType: true,
              locationMode: true,
              city: true,
              country: true,
              status: true,
              visibilityType: true,
              description: true,
              requirementsJson: true,
              compensationJson: true,
              createdAt: true,
              dropzone: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.jobPost.count({ where }),
        ]);

        reply.send({
          success: true,
          data: jobs.map((j) => ({
            id: j.id,
            title: j.title,
            roleCategory: j.roleCategory,
            employmentType: j.employmentType,
            location: [j.city, j.country].filter(Boolean).join(", ") || j.locationMode,
            status: j.status,
            visibility: j.visibilityType,
            description: j.description,
            requirements: j.requirementsJson,
            compensation: j.compensationJson,
            dropzone: j.dropzone,
            createdAt: j.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/browse failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch jobs" });
      }
    }
  );

  // ========================================================================
  // GROUP 1: JOB MANAGEMENT (Admin — DZ_MANAGER)
  // ========================================================================

  // GET /careers/jobs — List jobs for the tenant
  fastify.get<{
    Querystring: {
      status?: string;
      roleCategory?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/careers/jobs",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { status, roleCategory } = request.query;
        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
        const offset = parseInt(request.query.offset || "0", 10);

        const where: any = { dropzoneId };
        if (status && VALID_JOB_STATUSES.includes(status as any)) {
          where.status = status;
        }
        if (
          roleCategory &&
          VALID_ROLE_CATEGORIES.includes(roleCategory as any)
        ) {
          where.roleCategory = roleCategory;
        }

        const [jobs, total] = await Promise.all([
          fastify.prisma.jobPost.findMany({
            where,
            include: {
              _count: { select: { applications: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.jobPost.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: jobs.map((j: any) => ({
            id: j.id,
            uuid: j.uuid,
            title: j.title,
            slug: j.slug,
            roleCategory: j.roleCategory,
            employmentType: j.employmentType,
            priority: j.priority,
            locationMode: j.locationMode,
            city: j.city,
            country: j.country,
            visibilityType: j.visibilityType,
            status: j.status,
            applicationsCount: j._count.applications,
            viewsCount: j.viewsCount,
            publishAt: j.publishAt,
            closeAt: j.closeAt,
            createdAt: j.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/jobs failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch jobs" });
      }
    }
  );

  // POST /careers/jobs — Create job draft
  fastify.post<{ Body: Record<string, any> }>(
    "/careers/jobs",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "title is required" });
        }
        if (
          !body.roleCategory ||
          !VALID_ROLE_CATEGORIES.includes(body.roleCategory as any)
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              error: `roleCategory must be one of: ${VALID_ROLE_CATEGORIES.join(", ")}`,
            });
        }

        const uuid = crypto.randomUUID();
        const slug = generateSlug(body.title);

        const job = await fastify.prisma.jobPost.create({
          data: {
            uuid,
            dropzoneId,
            organizationId: body.organizationId ?? null,
            createdBy: userId,
            title: body.title.trim(),
            slug,
            roleCategory: body.roleCategory,
            employmentType: body.employmentType ?? "FULL_TIME",
            priority: body.priority ?? "NORMAL",
            locationMode: body.locationMode ?? "ON_SITE",
            city: body.city ?? null,
            country: body.country ?? null,
            visibilityType: body.visibilityType ?? "INTERNAL_TARGETED",
            applicationMode: body.applicationMode ?? "INTERNAL",
            status: "DRAFT",
            description: body.description ?? null,
            responsibilitiesJson: body.responsibilitiesJson ?? [],
            requirementsJson: body.requirementsJson ?? [],
            compensationJson: body.compensationJson ?? {},
            applicationQuestionsJson: body.applicationQuestionsJson ?? [],
            recruiterNote: body.recruiterNote ?? null,
            companyProfileSnapshot: body.companyProfileSnapshot ?? {},
            publicShareEnabled: body.publicShareEnabled ?? false,
            externalShareUrl: body.externalShareUrl ?? null,
            closeAt: body.closeAt ? new Date(body.closeAt) : null,
          },
        });

        // Create targets if provided
        if (Array.isArray(body.targets) && body.targets.length > 0) {
          await fastify.prisma.jobPostTarget.createMany({
            data: body.targets.map((t: any) => ({
              jobPostId: job.id,
              targetType: t.targetType,
              operator: t.operator ?? "EQUALS",
              valueJson: t.valueJson ?? t.value ?? {},
            })),
          });
        }

        const created = await fastify.prisma.jobPost.findUnique({
          where: { id: job.id },
          include: { targets: true },
        });

        return reply.code(201).send({ success: true, data: created });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create job" });
      }
    }
  );

  // GET /careers/jobs/:id — Job detail (admin)
  fastify.get<{ Params: { id: string } }>(
    "/careers/jobs/:id",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        if (!Number.isFinite(jobId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid job ID" });
        }

        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
          include: {
            targets: true,
            _count: {
              select: {
                applications: true,
                audienceSnapshots: true,
              },
            },
          },
        });

        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }

        return reply.send({ success: true, data: job });
      } catch (error) {
        request.log.error(error, "GET /careers/jobs/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch job" });
      }
    }
  );

  // PATCH /careers/jobs/:id — Update job (only DRAFT or PAUSED)
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/careers/jobs/:id",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        if (!Number.isFinite(jobId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid job ID" });
        }

        const existing = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }
        if (existing.status !== "DRAFT" && existing.status !== "PAUSED") {
          return reply.code(409).send({
            success: false,
            error: `Cannot update a job in ${existing.status} status. Only DRAFT or PAUSED jobs can be edited.`,
          });
        }

        const body = request.body as Record<string, any>;

        // Build update payload — only include provided fields
        const updateData: Record<string, any> = {};
        const allowedFields = [
          "title",
          "roleCategory",
          "employmentType",
          "priority",
          "locationMode",
          "city",
          "country",
          "visibilityType",
          "applicationMode",
          "description",
          "responsibilitiesJson",
          "requirementsJson",
          "compensationJson",
          "applicationQuestionsJson",
          "recruiterNote",
          "companyProfileSnapshot",
          "publicShareEnabled",
          "externalShareUrl",
          "closeAt",
        ];

        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            if (field === "closeAt") {
              updateData[field] = body[field] ? new Date(body[field]) : null;
            } else {
              updateData[field] = body[field];
            }
          }
        }

        // Regenerate slug if title changed
        if (updateData.title) {
          updateData.slug = generateSlug(updateData.title);
        }

        const updated = await fastify.prisma.jobPost.update({
          where: { id: jobId },
          data: updateData,
          include: { targets: true },
        });

        // Replace targets if provided
        if (Array.isArray(body.targets)) {
          await fastify.prisma.jobPostTarget.deleteMany({
            where: { jobPostId: jobId },
          });
          if (body.targets.length > 0) {
            await fastify.prisma.jobPostTarget.createMany({
              data: body.targets.map((t: any) => ({
                jobPostId: jobId,
                targetType: t.targetType,
                operator: t.operator ?? "EQUALS",
                valueJson: t.valueJson ?? t.value ?? {},
              })),
            });
          }
        }

        const result = await fastify.prisma.jobPost.findUnique({
          where: { id: jobId },
          include: { targets: true },
        });

        return reply.send({ success: true, data: result });
      } catch (error) {
        request.log.error(error, "PATCH /careers/jobs/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update job" });
      }
    }
  );

  // POST /careers/jobs/:id/publish — Publish a job
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/publish",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        if (!Number.isFinite(jobId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid job ID" });
        }

        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }
        if (job.status !== "DRAFT" && job.status !== "PAUSED") {
          return reply.code(409).send({
            success: false,
            error: `Cannot publish a job in ${job.status} status`,
          });
        }

        // Validate required fields before publishing
        const missing: string[] = [];
        if (!job.title) missing.push("title");
        if (!job.roleCategory) missing.push("roleCategory");
        if (!job.description) missing.push("description");
        if (missing.length > 0) {
          return reply.code(400).send({
            success: false,
            error: `Missing required fields for publishing: ${missing.join(", ")}`,
          });
        }

        const published = await fastify.prisma.jobPost.update({
          where: { id: jobId },
          data: {
            status: "PUBLISHED",
            publishAt: new Date(),
          },
        });

        return reply.send({ success: true, data: published });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:id/publish failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to publish job" });
      }
    }
  );

  // POST /careers/jobs/:id/pause — Pause a published job
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/pause",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }
        if (job.status !== "PUBLISHED") {
          return reply.code(409).send({
            success: false,
            error: `Can only pause a PUBLISHED job. Current status: ${job.status}`,
          });
        }

        const paused = await fastify.prisma.jobPost.update({
          where: { id: jobId },
          data: { status: "PAUSED" },
        });

        return reply.send({ success: true, data: paused });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:id/pause failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to pause job" });
      }
    }
  );

  // POST /careers/jobs/:id/close — Close a job
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/close",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }
        if (job.status === "CLOSED" || job.status === "ARCHIVED") {
          return reply.code(409).send({
            success: false,
            error: `Job is already ${job.status}`,
          });
        }

        const closed = await fastify.prisma.jobPost.update({
          where: { id: jobId },
          data: { status: "CLOSED" },
        });

        return reply.send({ success: true, data: closed });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:id/close failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to close job" });
      }
    }
  );

  // POST /careers/jobs/:id/archive — Archive a job
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/archive",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }
        if (job.status === "ARCHIVED") {
          return reply.code(409).send({
            success: false,
            error: "Job is already archived",
          });
        }

        const archived = await fastify.prisma.jobPost.update({
          where: { id: jobId },
          data: { status: "ARCHIVED" },
        });

        return reply.send({ success: true, data: archived });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:id/archive failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to archive job" });
      }
    }
  );

  // POST /careers/jobs/:id/audience-preview — Build & preview audience
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/audience-preview",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
          include: { targets: true },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }

        // Build dynamic user query from targets
        const userWhere: any = { status: "ACTIVE" };
        const athleteWhere: any = {};
        const skillFilters: string[] = [];
        const roleFilters: string[] = [];
        const licenseFilters: string[] = [];
        let requiresAthlete = false;
        let requiresSkills = false;
        let requiresLicense = false;
        let requiresProfile = false;
        const profileWhere: any = {};

        for (const target of job.targets) {
          const val = target.valueJson as any;

          switch (target.targetType) {
            case "ROLE":
              if (target.operator === "IN" && Array.isArray(val)) {
                roleFilters.push(...val);
              } else if (target.operator === "EQUALS" && typeof val === "string") {
                roleFilters.push(val);
              } else if (typeof val?.value === "string") {
                roleFilters.push(val.value);
              }
              break;

            case "MIN_JUMPS":
              requiresAthlete = true;
              const minVal =
                typeof val === "number" ? val : parseInt(val?.value ?? val, 10);
              if (Number.isFinite(minVal)) {
                athleteWhere.totalJumps = { gte: minVal };
              }
              break;

            case "LICENSE_LEVEL":
              requiresLicense = true;
              if (target.operator === "IN" && Array.isArray(val)) {
                licenseFilters.push(...val);
              } else if (typeof val === "string") {
                licenseFilters.push(val);
              } else if (val?.value) {
                licenseFilters.push(val.value);
              }
              break;

            case "DISCIPLINE":
              requiresAthlete = true;
              // Discipline is stored as JSON array on Athlete
              // We'll filter in-memory after query for JSON array containment
              break;

            case "LOCATION":
              requiresProfile = true;
              if (typeof val === "string") {
                profileWhere.nationality = val;
              } else if (val?.value) {
                profileWhere.nationality = val.value;
              }
              break;

            case "VERIFIED_STATUS":
              requiresSkills = true;
              // Will filter by verified skills in-memory
              break;

            default:
              break;
          }
        }

        // Build the user query with nested relations
        const include: any = {
          userRoles: { include: { role: true } },
          athlete: true,
          profile: true,
          instructorSkills: { include: { skillType: true } },
          licenses: true,
        };

        // Role filter via UserRole relation
        if (roleFilters.length > 0) {
          userWhere.userRoles = {
            some: {
              role: { name: { in: roleFilters } },
            },
          };
        }

        // Athlete filters
        if (requiresAthlete && Object.keys(athleteWhere).length > 0) {
          userWhere.athlete = athleteWhere;
        }

        // License filters
        if (requiresLicense && licenseFilters.length > 0) {
          userWhere.licenses = {
            some: { level: { in: licenseFilters } },
          };
        }

        // Profile filters
        if (requiresProfile && Object.keys(profileWhere).length > 0) {
          userWhere.profile = profileWhere;
        }

        const matchedUsers = await fastify.prisma.user.findMany({
          where: userWhere,
          include,
          take: 500, // safety cap
        });

        // Score and categorize each user
        const snapshots: Array<{
          userId: number;
          matchScore: number;
          matchTier: string;
          reasonMatched: string;
          user: any;
        }> = [];

        for (const user of matchedUsers) {
          let score = 0;
          const reasons: string[] = [];

          // Role match
          const userRoleNames = (user as any).userRoles?.map(
            (ur: any) => ur.role?.name
          ) ?? [];
          if (roleFilters.length > 0) {
            const matched = roleFilters.filter((r) =>
              userRoleNames.includes(r)
            );
            if (matched.length > 0) {
              score += 30;
              reasons.push(`Role match: ${matched.join(", ")}`);
            }
          }

          // Jump count match
          const athlete = (user as any).athlete;
          if (athlete && athleteWhere.totalJumps) {
            if (athlete.totalJumps >= athleteWhere.totalJumps.gte) {
              score += 20;
              reasons.push(`Jumps: ${athlete.totalJumps}`);
            }
          }

          // License match
          const userLicenses = (user as any).licenses ?? [];
          if (licenseFilters.length > 0) {
            const matched = userLicenses.filter((l: any) =>
              licenseFilters.includes(l.level)
            );
            if (matched.length > 0) {
              score += 20;
              reasons.push(
                `License: ${matched.map((l: any) => l.level).join(", ")}`
              );
            }
          }

          // Instructor skills match
          const skills = (user as any).instructorSkills ?? [];
          if (skills.length > 0) {
            score += 15;
            reasons.push(
              `Skills: ${skills.map((s: any) => s.skillType?.code ?? s.skillTypeId).join(", ")}`
            );
          }

          // Profile match (nationality/location)
          const profile = (user as any).profile;
          if (
            requiresProfile &&
            profile &&
            profileWhere.nationality &&
            profile.nationality === profileWhere.nationality
          ) {
            score += 15;
            reasons.push(`Location: ${profile.nationality}`);
          }

          // Determine tier
          let matchTier = "MANUAL_REVIEW";
          if (score >= 80) matchTier = "EXACT";
          else if (score >= 50) matchTier = "STRONG";
          else if (score >= 25) matchTier = "PARTIAL";

          snapshots.push({
            userId: user.id,
            matchScore: Math.min(score, 100),
            matchTier,
            reasonMatched: reasons.join("; "),
            user,
          });
        }

        // Sort by score descending
        snapshots.sort((a, b) => b.matchScore - a.matchScore);

        // Persist snapshots (upsert to avoid duplicates)
        for (const snap of snapshots) {
          await fastify.prisma.jobPostAudienceSnapshot.upsert({
            where: {
              jobPostId_userId: {
                jobPostId: jobId,
                userId: snap.userId,
              },
            },
            update: {
              matchScore: snap.matchScore,
              matchTier: snap.matchTier,
              reasonMatched: snap.reasonMatched,
              matchedAt: new Date(),
            },
            create: {
              jobPostId: jobId,
              userId: snap.userId,
              matchScore: snap.matchScore,
              matchTier: snap.matchTier,
              reasonMatched: snap.reasonMatched,
              notificationChannels: [],
            },
          });
        }

        // Build summary
        const byRole: Record<string, number> = {};
        const byMatchTier: Record<string, number> = {};

        for (const s of snapshots) {
          // Count by match tier
          byMatchTier[s.matchTier] = (byMatchTier[s.matchTier] || 0) + 1;

          // Count by role
          const roles = (s.user as any).userRoles?.map(
            (ur: any) => ur.role?.name
          ) ?? [];
          for (const role of roles) {
            if (role) byRole[role] = (byRole[role] || 0) + 1;
          }
        }

        const sample = snapshots.slice(0, 10).map((s) => ({
          userId: s.userId,
          name: `${s.user.firstName} ${s.user.lastName}`,
          email: s.user.email,
          matchScore: s.matchScore,
          matchTier: s.matchTier,
          reasonMatched: s.reasonMatched,
        }));

        return reply.send({
          success: true,
          data: {
            total: snapshots.length,
            byRole,
            byMatchTier,
            sample,
          },
        });
      } catch (error) {
        request.log.error(
          error,
          "POST /careers/jobs/:id/audience-preview failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to build audience preview" });
      }
    }
  );

  // POST /careers/jobs/:id/notify — Notify matched audience
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/notify",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const jobId = parseInt(request.params.id, 10);
        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, dropzoneId },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }

        // Find un-notified audience snapshots
        const snapshots =
          await fastify.prisma.jobPostAudienceSnapshot.findMany({
            where: {
              jobPostId: jobId,
              notifiedAt: null,
            },
            include: { user: true },
          });

        if (snapshots.length === 0) {
          return reply.send({
            success: true,
            data: { notifiedCount: 0, message: "No un-notified audience members" },
          });
        }

        // Create notification for each user
        const notificationData = snapshots.map((snap) => ({
          userId: snap.userId,
          dropzoneId,
          title: `New opportunity: ${job.title}`,
          body: `A ${job.roleCategory} position matching your profile is available. Check it out!`,
          type: "CAREERS_JOB_MATCH" as any,
          channel: "IN_APP" as any,
          status: "PENDING" as any,
          data: {
            jobPostId: job.id,
            jobUuid: job.uuid,
            slug: job.slug,
            matchScore: snap.matchScore,
            matchTier: snap.matchTier,
          },
        }));

        await fastify.prisma.notification.createMany({
          data: notificationData,
        });

        // Mark snapshots as notified
        await fastify.prisma.jobPostAudienceSnapshot.updateMany({
          where: {
            jobPostId: jobId,
            notifiedAt: null,
          },
          data: {
            notifiedAt: new Date(),
            notificationChannels: ["IN_APP"],
          },
        });

        return reply.send({
          success: true,
          data: { notifiedCount: snapshots.length },
        });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:id/notify failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to notify audience" });
      }
    }
  );

  // ========================================================================
  // GROUP 2: APPLICATION MANAGEMENT (Admin — DZ_MANAGER)
  // ========================================================================

  // GET /careers/applications — List applications for tenant's jobs
  fastify.get<{
    Querystring: {
      stage?: string;
      jobPostId?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/careers/applications",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { stage, jobPostId, status } = request.query;
        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
        const offset = parseInt(request.query.offset || "0", 10);

        const where: any = {
          jobPost: { dropzoneId },
        };

        if (
          stage &&
          VALID_APPLICATION_STAGES.includes(stage as any)
        ) {
          where.currentStage = stage;
        }
        if (jobPostId) {
          const jpId = parseInt(jobPostId, 10);
          if (Number.isFinite(jpId)) {
            where.jobPostId = jpId;
          }
        }
        if (status) {
          where.status = status;
        }

        const [applications, total] = await Promise.all([
          fastify.prisma.jobApplication.findMany({
            where,
            include: {
              jobPost: { select: { id: true, title: true, slug: true, roleCategory: true } },
            },
            orderBy: { submittedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.jobApplication.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: applications.map((a: any) => ({
            id: a.id,
            uuid: a.uuid,
            applicantName: a.applicantName,
            applicantEmail: a.applicantEmail,
            currentStage: a.currentStage,
            status: a.status,
            sourceType: a.sourceType,
            submittedAt: a.submittedAt,
            jobPost: a.jobPost,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/applications failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch applications" });
      }
    }
  );

  // GET /careers/applications/:id — Full application detail (admin)
  fastify.get<{ Params: { id: string } }>(
    "/careers/applications/:id",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const appId = parseInt(request.params.id, 10);
        if (!Number.isFinite(appId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid application ID" });
        }

        const application = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: appId,
            jobPost: { dropzoneId },
          },
          include: {
            jobPost: {
              select: { id: true, title: true, slug: true, roleCategory: true, dropzoneId: true },
            },
            answers: true,
            documents: true,
            recruiterNotes: {
              include: {
                author: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            stageEvents: { orderBy: { createdAt: "desc" } },
            interviews: {
              include: {
                feedback: {
                  include: {
                    reviewer: {
                      select: { id: true, firstName: true, lastName: true },
                    },
                  },
                },
                scheduler: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
              orderBy: { startsAt: "desc" },
            },
          },
        });

        if (!application) {
          return reply
            .code(404)
            .send({ success: false, error: "Application not found" });
        }

        return reply.send({ success: true, data: application });
      } catch (error) {
        request.log.error(error, "GET /careers/applications/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch application" });
      }
    }
  );

  // PATCH /careers/applications/:id/stage — Change application stage
  fastify.patch<{
    Params: { id: string };
    Body: { toStage: string; reason?: string };
  }>(
    "/careers/applications/:id/stage",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const appId = parseInt(request.params.id, 10);
        const body = request.body as { toStage: string; reason?: string };

        if (
          !body.toStage ||
          !VALID_APPLICATION_STAGES.includes(body.toStage as any)
        ) {
          return reply.code(400).send({
            success: false,
            error: `toStage must be one of: ${VALID_APPLICATION_STAGES.join(", ")}`,
          });
        }

        const application = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: appId,
            jobPost: { dropzoneId },
          },
          include: {
            jobPost: { select: { id: true, title: true } },
          },
        });

        if (!application) {
          return reply
            .code(404)
            .send({ success: false, error: "Application not found" });
        }

        if (application.currentStage === body.toStage) {
          return reply.code(409).send({
            success: false,
            error: `Application is already at stage ${body.toStage}`,
          });
        }

        const fromStage = application.currentStage;

        // Update stage and create event in a transaction
        const [updated] = await fastify.prisma.$transaction([
          fastify.prisma.jobApplication.update({
            where: { id: appId },
            data: { currentStage: body.toStage as any },
          }),
          fastify.prisma.applicationStageEvent.create({
            data: {
              applicationId: appId,
              fromStage: fromStage as any,
              toStage: body.toStage as any,
              changedBy: userId,
              reason: body.reason ?? null,
            },
          }),
        ]);

        // Notify applicant if they are a platform user
        if (application.applicantUserId) {
          await fastify.prisma.notification.create({
            data: {
              userId: application.applicantUserId,
              dropzoneId,
              title: "Application status updated",
              body: `Your application for "${(application as any).jobPost.title}" has moved to ${body.toStage.replace(/_/g, " ").toLowerCase()}.`,
              type: "CAREERS_APPLICATION_STAGE_CHANGED" as any,
              channel: "IN_APP",
              status: "PENDING",
              data: {
                applicationId: application.id,
                applicationUuid: application.uuid,
                fromStage,
                toStage: body.toStage,
              },
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            uuid: updated.uuid,
            currentStage: updated.currentStage,
            previousStage: fromStage,
          },
        });
      } catch (error) {
        request.log.error(
          error,
          "PATCH /careers/applications/:id/stage failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to change application stage" });
      }
    }
  );

  // POST /careers/applications/:id/note — Add recruiter note
  fastify.post<{
    Params: { id: string };
    Body: {
      noteType?: string;
      noteText: string;
      visibilityScope?: string;
    };
  }>(
    "/careers/applications/:id/note",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const appId = parseInt(request.params.id, 10);
        const body = request.body as {
          noteType?: string;
          noteText: string;
          visibilityScope?: string;
        };

        if (!body.noteText || typeof body.noteText !== "string" || !body.noteText.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "noteText is required" });
        }

        // Verify application belongs to tenant
        const application = await fastify.prisma.jobApplication.findFirst({
          where: { id: appId, jobPost: { dropzoneId } },
        });
        if (!application) {
          return reply
            .code(404)
            .send({ success: false, error: "Application not found" });
        }

        const note = await fastify.prisma.recruiterNote.create({
          data: {
            applicationId: appId,
            createdBy: userId,
            noteType: body.noteType ?? "GENERAL",
            noteText: body.noteText.trim(),
            visibilityScope: body.visibilityScope ?? "TEAM",
          },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        return reply.code(201).send({ success: true, data: note });
      } catch (error) {
        request.log.error(
          error,
          "POST /careers/applications/:id/note failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to add note" });
      }
    }
  );

  // POST /careers/applications/:id/request-documents — Request more info
  fastify.post<{
    Params: { id: string };
    Body: { documentTypes: string[]; message: string };
  }>(
    "/careers/applications/:id/request-documents",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const appId = parseInt(request.params.id, 10);
        const body = request.body as {
          documentTypes: string[];
          message: string;
        };

        if (
          !Array.isArray(body.documentTypes) ||
          body.documentTypes.length === 0
        ) {
          return reply.code(400).send({
            success: false,
            error: "documentTypes array is required and must not be empty",
          });
        }
        if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "message is required" });
        }

        const application = await fastify.prisma.jobApplication.findFirst({
          where: { id: appId, jobPost: { dropzoneId } },
          include: {
            jobPost: { select: { title: true } },
          },
        });
        if (!application) {
          return reply
            .code(404)
            .send({ success: false, error: "Application not found" });
        }

        // Notify applicant
        if (application.applicantUserId) {
          await fastify.prisma.notification.create({
            data: {
              userId: application.applicantUserId,
              dropzoneId,
              title: "Additional documents requested",
              body: body.message.trim(),
              type: "CAREERS_REQUEST_MORE_INFO" as any,
              channel: "IN_APP",
              status: "PENDING",
              data: {
                applicationId: application.id,
                applicationUuid: application.uuid,
                documentTypes: body.documentTypes,
                jobTitle: (application as any).jobPost.title,
              },
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            notified: !!application.applicantUserId,
            documentTypes: body.documentTypes,
          },
        });
      } catch (error) {
        request.log.error(
          error,
          "POST /careers/applications/:id/request-documents failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to request documents" });
      }
    }
  );

  // ========================================================================
  // GROUP 3: INTERVIEW MANAGEMENT (Admin — DZ_MANAGER)
  // ========================================================================

  // POST /careers/applications/:appId/interviews — Schedule interview
  fastify.post<{
    Params: { appId: string };
    Body: {
      interviewType: string;
      startsAt: string;
      endsAt: string;
      timezone?: string;
      locationOrLink?: string;
      notes?: string;
    };
  }>(
    "/careers/applications/:appId/interviews",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const appId = parseInt(request.params.appId, 10);
        const body = request.body as {
          interviewType: string;
          startsAt: string;
          endsAt: string;
          timezone?: string;
          locationOrLink?: string;
          notes?: string;
        };

        if (
          !body.interviewType ||
          !VALID_INTERVIEW_TYPES.includes(body.interviewType as any)
        ) {
          return reply.code(400).send({
            success: false,
            error: `interviewType must be one of: ${VALID_INTERVIEW_TYPES.join(", ")}`,
          });
        }
        if (!body.startsAt || !body.endsAt) {
          return reply.code(400).send({
            success: false,
            error: "startsAt and endsAt are required",
          });
        }

        const startsAt = new Date(body.startsAt);
        const endsAt = new Date(body.endsAt);
        if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid date format for startsAt or endsAt" });
        }
        if (endsAt <= startsAt) {
          return reply
            .code(400)
            .send({ success: false, error: "endsAt must be after startsAt" });
        }

        // Verify application belongs to tenant
        const application = await fastify.prisma.jobApplication.findFirst({
          where: { id: appId, jobPost: { dropzoneId } },
          include: { jobPost: { select: { title: true } } },
        });
        if (!application) {
          return reply
            .code(404)
            .send({ success: false, error: "Application not found" });
        }

        const uuid = crypto.randomUUID();

        const interview = await fastify.prisma.interviewSchedule.create({
          data: {
            uuid,
            applicationId: appId,
            interviewType: body.interviewType as any,
            startsAt,
            endsAt,
            timezone: body.timezone ?? "UTC",
            locationOrLink: body.locationOrLink ?? null,
            scheduledBy: userId,
            status: "SCHEDULED",
            notes: body.notes ?? null,
          },
          include: {
            scheduler: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        // Notify applicant
        if (application.applicantUserId) {
          await fastify.prisma.notification.create({
            data: {
              userId: application.applicantUserId,
              dropzoneId,
              title: "Interview scheduled",
              body: `An interview for "${(application as any).jobPost.title}" has been scheduled for ${startsAt.toISOString()}.`,
              type: "CAREERS_INTERVIEW_SCHEDULED" as any,
              channel: "IN_APP",
              status: "PENDING",
              data: {
                interviewId: interview.id,
                interviewUuid: interview.uuid,
                interviewType: body.interviewType,
                startsAt: startsAt.toISOString(),
                applicationUuid: application.uuid,
              },
            },
          });
        }

        return reply.code(201).send({ success: true, data: interview });
      } catch (error) {
        request.log.error(
          error,
          "POST /careers/applications/:appId/interviews failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to schedule interview" });
      }
    }
  );

  // GET /careers/interviews — List upcoming interviews across tenant's jobs
  fastify.get<{
    Querystring: {
      status?: string;
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/careers/interviews",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { status, from, to } = request.query;
        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
        const offset = parseInt(request.query.offset || "0", 10);

        const where: any = {
          application: { jobPost: { dropzoneId } },
        };

        if (
          status &&
          VALID_INTERVIEW_STATUSES.includes(status as any)
        ) {
          where.status = status;
        }

        // Date range filter
        if (from || to) {
          where.startsAt = {};
          if (from) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime())) where.startsAt.gte = fromDate;
          }
          if (to) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime())) where.startsAt.lte = toDate;
          }
          if (Object.keys(where.startsAt).length === 0) delete where.startsAt;
        }

        const [interviews, total] = await Promise.all([
          fastify.prisma.interviewSchedule.findMany({
            where,
            include: {
              application: {
                select: {
                  id: true,
                  uuid: true,
                  applicantName: true,
                  applicantEmail: true,
                  jobPost: {
                    select: { id: true, title: true, roleCategory: true },
                  },
                },
              },
              scheduler: {
                select: { id: true, firstName: true, lastName: true },
              },
              _count: { select: { feedback: true } },
            },
            orderBy: { startsAt: "asc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.interviewSchedule.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: interviews,
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/interviews failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch interviews" });
      }
    }
  );

  // PATCH /careers/interviews/:id — Update interview (reschedule, cancel)
  fastify.patch<{
    Params: { id: string };
    Body: {
      startsAt?: string;
      endsAt?: string;
      timezone?: string;
      locationOrLink?: string;
      status?: string;
      notes?: string;
    };
  }>(
    "/careers/interviews/:id",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const interviewId = parseInt(request.params.id, 10);
        if (!Number.isFinite(interviewId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid interview ID" });
        }

        const body = request.body as Record<string, any>;

        const interview = await fastify.prisma.interviewSchedule.findFirst({
          where: {
            id: interviewId,
            application: { jobPost: { dropzoneId } },
          },
          include: {
            application: {
              select: {
                id: true,
                applicantUserId: true,
                jobPost: { select: { title: true } },
              },
            },
          },
        });

        if (!interview) {
          return reply
            .code(404)
            .send({ success: false, error: "Interview not found" });
        }

        const updateData: Record<string, any> = {};

        if (body.startsAt) {
          const dt = new Date(body.startsAt);
          if (isNaN(dt.getTime())) {
            return reply
              .code(400)
              .send({ success: false, error: "Invalid startsAt date" });
          }
          updateData.startsAt = dt;
        }
        if (body.endsAt) {
          const dt = new Date(body.endsAt);
          if (isNaN(dt.getTime())) {
            return reply
              .code(400)
              .send({ success: false, error: "Invalid endsAt date" });
          }
          updateData.endsAt = dt;
        }
        if (body.timezone) updateData.timezone = body.timezone;
        if (body.locationOrLink !== undefined)
          updateData.locationOrLink = body.locationOrLink;
        if (body.notes !== undefined) updateData.notes = body.notes;
        if (
          body.status &&
          VALID_INTERVIEW_STATUSES.includes(body.status as any)
        ) {
          updateData.status = body.status;
        }

        // Validate endsAt > startsAt if both provided
        const finalStart = updateData.startsAt ?? interview.startsAt;
        const finalEnd = updateData.endsAt ?? interview.endsAt;
        if (finalEnd <= finalStart) {
          return reply
            .code(400)
            .send({ success: false, error: "endsAt must be after startsAt" });
        }

        const updated = await fastify.prisma.interviewSchedule.update({
          where: { id: interviewId },
          data: updateData,
          include: {
            scheduler: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        // Notify applicant of reschedule/cancellation
        const app = interview.application as any;
        if (app.applicantUserId && (updateData.startsAt || updateData.status === "CANCELLED")) {
          const isCancel = updateData.status === "CANCELLED";
          await fastify.prisma.notification.create({
            data: {
              userId: app.applicantUserId,
              dropzoneId,
              title: isCancel
                ? "Interview cancelled"
                : "Interview rescheduled",
              body: isCancel
                ? `Your interview for "${app.jobPost.title}" has been cancelled.`
                : `Your interview for "${app.jobPost.title}" has been rescheduled to ${(updateData.startsAt as Date).toISOString()}.`,
              type: "CAREERS_INTERVIEW_SCHEDULED" as any,
              channel: "IN_APP",
              status: "PENDING",
              data: {
                interviewId: updated.id,
                interviewUuid: updated.uuid,
                action: isCancel ? "CANCELLED" : "RESCHEDULED",
              },
            },
          });
        }

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "PATCH /careers/interviews/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update interview" });
      }
    }
  );

  // POST /careers/interviews/:id/feedback — Submit interview feedback
  fastify.post<{
    Params: { id: string };
    Body: {
      score?: number;
      notes?: string;
      recommendation?: string;
    };
  }>(
    "/careers/interviews/:id/feedback",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const interviewId = parseInt(request.params.id, 10);
        if (!Number.isFinite(interviewId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid interview ID" });
        }

        const body = request.body as {
          score?: number;
          notes?: string;
          recommendation?: string;
        };

        // Validate score range
        if (body.score !== undefined && body.score !== null) {
          if (!Number.isFinite(body.score) || body.score < 1 || body.score > 5) {
            return reply.code(400).send({
              success: false,
              error: "score must be between 1 and 5",
            });
          }
        }

        const validRecommendations = [
          "STRONG_HIRE",
          "HIRE",
          "HOLD",
          "NO_HIRE",
          "STRONG_NO_HIRE",
        ];
        if (
          body.recommendation &&
          !validRecommendations.includes(body.recommendation)
        ) {
          return reply.code(400).send({
            success: false,
            error: `recommendation must be one of: ${validRecommendations.join(", ")}`,
          });
        }

        // Verify interview belongs to tenant
        const interview = await fastify.prisma.interviewSchedule.findFirst({
          where: {
            id: interviewId,
            application: { jobPost: { dropzoneId } },
          },
        });
        if (!interview) {
          return reply
            .code(404)
            .send({ success: false, error: "Interview not found" });
        }

        // Upsert feedback (one per reviewer per interview)
        const feedback = await fastify.prisma.interviewFeedback.upsert({
          where: {
            interviewId_reviewerUserId: {
              interviewId,
              reviewerUserId: userId,
            },
          },
          update: {
            score: body.score ?? null,
            notes: body.notes ?? null,
            recommendation: body.recommendation ?? null,
          },
          create: {
            interviewId,
            reviewerUserId: userId,
            score: body.score ?? null,
            notes: body.notes ?? null,
            recommendation: body.recommendation ?? null,
          },
          include: {
            reviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        return reply.code(201).send({ success: true, data: feedback });
      } catch (error) {
        request.log.error(
          error,
          "POST /careers/interviews/:id/feedback failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to submit feedback" });
      }
    }
  );

  // ========================================================================
  // GROUP 4: TALENT SEARCH (Admin — DZ_MANAGER)
  // ========================================================================

  // POST /careers/talent-search — Search platform users by criteria
  fastify.post<{
    Body: {
      roles?: string[];
      minJumps?: number;
      licenseLevel?: string[];
      skills?: string[];
      nationality?: string;
      verified?: boolean;
    };
  }>(
    "/careers/talent-search",
    { preHandler: [authenticate, authorize(["DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const body = request.body as {
          roles?: string[];
          minJumps?: number;
          licenseLevel?: string[];
          skills?: string[];
          nationality?: string;
          verified?: boolean;
        };

        const where: any = { status: "ACTIVE" };

        // Filter by roles
        if (Array.isArray(body.roles) && body.roles.length > 0) {
          where.userRoles = {
            some: {
              role: { name: { in: body.roles } },
            },
          };
        }

        // Filter by minimum jumps
        if (body.minJumps && Number.isFinite(body.minJumps)) {
          where.athlete = {
            ...(where.athlete || {}),
            totalJumps: { gte: body.minJumps },
          };
        }

        // Filter by license level
        if (Array.isArray(body.licenseLevel) && body.licenseLevel.length > 0) {
          where.licenses = {
            some: { level: { in: body.licenseLevel } },
          };
        }

        // Filter by instructor skills (skill type codes)
        if (Array.isArray(body.skills) && body.skills.length > 0) {
          where.instructorSkills = {
            some: {
              skillType: { code: { in: body.skills } },
            },
          };
        }

        // Filter by nationality
        if (body.nationality) {
          where.profile = {
            nationality: body.nationality,
          };
        }

        // Filter by verified instructor skills
        if (body.verified === true) {
          where.instructorSkills = {
            ...(where.instructorSkills || {}),
            some: {
              ...(where.instructorSkills?.some || {}),
              verifiedBy: { not: null },
            },
          };
        }

        const users = await fastify.prisma.user.findMany({
          where,
          select: {
            id: true,
            uuid: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            profile: {
              select: {
                nationality: true,
                bio: true,
              },
            },
            athlete: {
              select: {
                totalJumps: true,
                licenseLevel: true,
                disciplines: true,
              },
            },
            instructorSkills: {
              select: {
                skillType: { select: { code: true, name: true } },
                certifiedAt: true,
                expiresAt: true,
                rating: true,
                verifiedBy: true,
              },
            },
            licenses: {
              select: {
                type: true,
                level: true,
                expiresAt: true,
                verifiedAt: true,
              },
            },
            userRoles: {
              select: {
                role: { select: { name: true, displayName: true } },
                dropzone: { select: { id: true, name: true } },
              },
            },
          },
          take: 50,
          orderBy: { firstName: "asc" },
        });

        return reply.send({
          success: true,
          data: users,
          meta: { total: users.length, limit: 50 },
        });
      } catch (error) {
        request.log.error(error, "POST /careers/talent-search failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to search talent" });
      }
    }
  );

  // ========================================================================
  // GROUP 5: CANDIDATE-FACING (Authenticated user)
  // ========================================================================

  // GET /careers/jobs/available — Jobs visible to the current user
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/careers/jobs/available",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
        const offset = parseInt(request.query.offset || "0", 10);

        // Fetch user roles and profile for visibility engine
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: { include: { role: true } },
            athlete: true,
            instructorSkills: { include: { skillType: true } },
          },
        });

        if (!user) {
          return reply
            .code(404)
            .send({ success: false, error: "User not found" });
        }

        const userRoleNames = user.userRoles.map((ur) => ur.role.name);
        const isStudent = userRoleNames.includes("STUDENT") && userRoleNames.length === 1;
        const hasInstructorSkills = user.instructorSkills.length > 0;
        const isProfessional =
          hasInstructorSkills ||
          userRoleNames.some((r) =>
            [
              "TI",
              "AFFI",
              "COACH",
              "PILOT",
              "RIGGER",
              "MANIFEST_STAFF",
              "DZ_MANAGER",
              "DZ_OWNER",
            ].includes(r)
          );

        // Students see nothing targeted
        if (isStudent) {
          return reply.send({
            success: true,
            data: [],
            meta: { total: 0, limit, offset },
          });
        }

        // Build visibility filter
        const visibilityConditions: any[] = [];

        // All authenticated non-student users can see PUBLIC jobs
        visibilityConditions.push(
          { visibilityType: "PUBLIC_LINK" },
          { visibilityType: "PUBLIC_MARKETPLACE" }
        );

        if (isProfessional) {
          // Professionals see INTERNAL_PROFESSIONAL_POOL
          visibilityConditions.push({
            visibilityType: "INTERNAL_PROFESSIONAL_POOL",
          });

          // INTERNAL_TARGETED if matched in audience snapshots
          visibilityConditions.push({
            visibilityType: "INTERNAL_TARGETED",
            audienceSnapshots: {
              some: { userId },
            },
          });
        }

        // Users in the same dropzone see DROPZONE_ONLY
        const userDropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (userDropzoneId) {
          visibilityConditions.push({
            visibilityType: "DROPZONE_ONLY",
            dropzoneId: userDropzoneId,
          });
        }

        // INVITE_ONLY — only if in audience snapshot
        visibilityConditions.push({
          visibilityType: "INVITE_ONLY",
          audienceSnapshots: {
            some: { userId },
          },
        });

        const where = {
          status: "PUBLISHED" as const,
          OR: visibilityConditions,
        };

        const [jobs, total] = await Promise.all([
          fastify.prisma.jobPost.findMany({
            where,
            select: {
              id: true,
              uuid: true,
              title: true,
              slug: true,
              roleCategory: true,
              employmentType: true,
              locationMode: true,
              city: true,
              country: true,
              visibilityType: true,
              description: true,
              compensationJson: true,
              publishAt: true,
              closeAt: true,
              createdAt: true,
            },
            orderBy: { publishAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.jobPost.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: jobs,
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/jobs/available failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch available jobs" });
      }
    }
  );

  // GET /careers/jobs/view/:slug — Public job detail (sanitized)
  // Allows unauthenticated access for PUBLIC_LINK / PUBLIC_MARKETPLACE
  fastify.get<{ Params: { slug: string } }>(
    "/careers/jobs/view/:slug",
    async (request, reply) => {
      try {
        const slug = request.params.slug;
        if (!slug || typeof slug !== "string") {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid slug" });
        }

        const job = await fastify.prisma.jobPost.findFirst({
          where: {
            slug,
            status: "PUBLISHED",
          },
          include: {
            dropzone: {
              select: { id: true, name: true },
            },
          },
        });

        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }

        // If not a public job, require authentication
        const isPublic =
          job.visibilityType === "PUBLIC_LINK" ||
          job.visibilityType === "PUBLIC_MARKETPLACE";

        if (!isPublic) {
          // Try to authenticate — if no token, deny
          try {
            await authenticate(request, reply);
          } catch {
            // authenticate already sent 401
          }
          if (!request.user) {
            return reply.code(401).send({
              success: false,
              error: "Authentication required to view this job",
            });
          }
        }

        // Increment view count (fire-and-forget)
        fastify.prisma.jobPost
          .update({
            where: { id: job.id },
            data: { viewsCount: { increment: 1 } },
          })
          .catch(() => {
            /* silently ignore view count errors */
          });

        // Return sanitized data — no recruiterNote, no internal fields
        return reply.send({
          success: true,
          data: {
            id: job.id,
            uuid: job.uuid,
            title: job.title,
            slug: job.slug,
            roleCategory: job.roleCategory,
            employmentType: job.employmentType,
            priority: job.priority,
            locationMode: job.locationMode,
            city: job.city,
            country: job.country,
            description: job.description,
            responsibilitiesJson: job.responsibilitiesJson,
            requirementsJson: job.requirementsJson,
            compensationJson: job.compensationJson,
            applicationQuestionsJson: job.applicationQuestionsJson,
            publishAt: job.publishAt,
            closeAt: job.closeAt,
            dropzone: job.dropzone
              ? { name: (job.dropzone as any).name }
              : null,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/jobs/view/:slug failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch job" });
      }
    }
  );

  // POST /careers/jobs/:slug/apply — Submit application
  fastify.post<{
    Params: { slug: string };
    Body: {
      coverLetter?: string;
      resumeUrl?: string;
      availabilityDate?: string;
      relocationWilling?: boolean;
      salaryExpectation?: string;
      answers?: Array<{ questionKey: string; answerValueJson: any }>;
    };
  }>(
    "/careers/jobs/:slug/apply",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const slug = request.params.slug;

        const body = request.body as {
          coverLetter?: string;
          resumeUrl?: string;
          availabilityDate?: string;
          relocationWilling?: boolean;
          salaryExpectation?: string;
          answers?: Array<{ questionKey: string; answerValueJson: any }>;
        };

        // Find the job by slug
        const job = await fastify.prisma.jobPost.findFirst({
          where: { slug, status: "PUBLISHED" },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found or no longer accepting applications" });
        }

        // Check if the job has a close date that has passed
        if (job.closeAt && new Date(job.closeAt) < new Date()) {
          return reply.code(409).send({
            success: false,
            error: "This job posting has closed",
          });
        }

        // Fetch user profile for snapshot
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            athlete: true,
            instructorSkills: { include: { skillType: true } },
            licenses: true,
          },
        });
        if (!user) {
          return reply
            .code(404)
            .send({ success: false, error: "User not found" });
        }

        // Check for duplicate application
        const existing = await fastify.prisma.jobApplication.findFirst({
          where: {
            jobPostId: job.id,
            applicantUserId: userId,
          },
        });
        if (existing) {
          return reply.code(409).send({
            success: false,
            error: "You have already applied to this position",
            data: { applicationUuid: existing.uuid },
          });
        }

        const uuid = crypto.randomUUID();
        const now = new Date();

        // Build snapshots
        const profileSnapshot = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          nationality: user.profile?.nationality ?? null,
          bio: user.profile?.bio ?? null,
        };

        const jumpsSnapshot = {
          totalJumps: user.athlete?.totalJumps ?? 0,
          licenseLevel: user.athlete?.licenseLevel ?? "NONE",
          disciplines: user.athlete?.disciplines ?? [],
        };

        const ratingsSnapshot = {
          instructorSkills: (user.instructorSkills ?? []).map((s: any) => ({
            code: s.skillType?.code ?? null,
            name: s.skillType?.name ?? null,
            rating: s.rating,
            certifiedAt: s.certifiedAt,
            expiresAt: s.expiresAt,
            verified: s.verifiedBy != null,
          })),
          licenses: (user.licenses ?? []).map((l: any) => ({
            type: l.type,
            level: l.level,
            expiresAt: l.expiresAt,
            verified: l.verifiedAt != null,
          })),
        };

        // Create application in a transaction
        const application = await fastify.prisma.$transaction(async (tx) => {
          const app = await tx.jobApplication.create({
            data: {
              uuid,
              jobPostId: job.id,
              applicantUserId: userId,
              applicantEmail: user.email,
              applicantName: `${user.firstName} ${user.lastName}`,
              applicantPhone: user.phone ?? null,
              currentStage: "APPLIED",
              status: "ACTIVE",
              sourceType: "INTERNAL",
              profileSnapshotJson: profileSnapshot,
              jumpsSnapshotJson: jumpsSnapshot,
              ratingsSnapshotJson: ratingsSnapshot,
              coverLetter: body.coverLetter ?? null,
              resumeUrl: body.resumeUrl ?? null,
              availabilityDate: body.availabilityDate
                ? new Date(body.availabilityDate)
                : null,
              relocationWilling: body.relocationWilling ?? false,
              salaryExpectation: body.salaryExpectation ?? null,
              submittedAt: now,
            },
          });

          // Create answers if provided
          if (Array.isArray(body.answers) && body.answers.length > 0) {
            await tx.jobApplicationAnswer.createMany({
              data: body.answers.map((a) => ({
                applicationId: app.id,
                questionKey: a.questionKey,
                answerValueJson: a.answerValueJson ?? {},
              })),
            });
          }

          // Increment applications count on the job
          await tx.jobPost.update({
            where: { id: job.id },
            data: { applicationsCount: { increment: 1 } },
          });

          return app;
        });

        // Notify job creator
        await fastify.prisma.notification.create({
          data: {
            userId: job.createdBy,
            dropzoneId: job.dropzoneId,
            title: "New application received",
            body: `${user.firstName} ${user.lastName} applied for "${job.title}".`,
            type: "CAREERS_APPLICATION_RECEIVED" as any,
            channel: "IN_APP",
            status: "PENDING",
            data: {
              applicationId: application.id,
              applicationUuid: application.uuid,
              jobPostId: job.id,
              applicantName: `${user.firstName} ${user.lastName}`,
            },
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: application.id,
            uuid: application.uuid,
            currentStage: application.currentStage,
            submittedAt: application.submittedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:slug/apply failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to submit application" });
      }
    }
  );

  // GET /careers/my-applications — Current user's applications
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/careers/my-applications",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
        const offset = parseInt(request.query.offset || "0", 10);

        const where = { applicantUserId: userId };

        const [applications, total] = await Promise.all([
          fastify.prisma.jobApplication.findMany({
            where,
            include: {
              jobPost: {
                select: {
                  id: true,
                  uuid: true,
                  title: true,
                  slug: true,
                  roleCategory: true,
                  employmentType: true,
                  city: true,
                  country: true,
                  status: true,
                },
              },
            },
            orderBy: { submittedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.jobApplication.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: applications.map((a: any) => ({
            id: a.id,
            uuid: a.uuid,
            currentStage: a.currentStage,
            status: a.status,
            submittedAt: a.submittedAt,
            jobPost: a.jobPost,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /careers/my-applications failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch your applications" });
      }
    }
  );

  // GET /careers/my-applications/:id — Application detail for applicant
  fastify.get<{ Params: { id: string } }>(
    "/careers/my-applications/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const appId = parseInt(request.params.id, 10);
        if (!Number.isFinite(appId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid application ID" });
        }

        const application = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: appId,
            applicantUserId: userId,
          },
          include: {
            jobPost: {
              select: {
                id: true,
                uuid: true,
                title: true,
                slug: true,
                roleCategory: true,
                employmentType: true,
                city: true,
                country: true,
                description: true,
              },
            },
            answers: true,
            documents: {
              select: {
                id: true,
                documentType: true,
                title: true,
                fileUrl: true,
                verificationStatus: true,
                uploadedAt: true,
              },
            },
            stageEvents: {
              select: {
                fromStage: true,
                toStage: true,
                reason: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            interviews: {
              select: {
                id: true,
                uuid: true,
                interviewType: true,
                startsAt: true,
                endsAt: true,
                timezone: true,
                locationOrLink: true,
                status: true,
                notes: true,
              },
              orderBy: { startsAt: "desc" },
            },
            // Recruiter notes are NOT included for candidates
          },
        });

        if (!application) {
          return reply
            .code(404)
            .send({ success: false, error: "Application not found" });
        }

        return reply.send({ success: true, data: application });
      } catch (error) {
        request.log.error(error, "GET /careers/my-applications/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch application" });
      }
    }
  );

  // POST /careers/jobs/:id/save — Save/bookmark a job
  fastify.post<{ Params: { id: string } }>(
    "/careers/jobs/:id/save",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const jobId = parseInt(request.params.id, 10);
        if (!Number.isFinite(jobId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid job ID" });
        }

        // Verify job exists and is published
        const job = await fastify.prisma.jobPost.findFirst({
          where: { id: jobId, status: "PUBLISHED" },
        });
        if (!job) {
          return reply
            .code(404)
            .send({ success: false, error: "Job not found" });
        }

        // Upsert an audience snapshot as a saved/bookmarked record
        await fastify.prisma.jobPostAudienceSnapshot.upsert({
          where: {
            jobPostId_userId: {
              jobPostId: jobId,
              userId,
            },
          },
          update: {
            // No-op update — the record already exists, so the bookmark is already saved
          },
          create: {
            jobPostId: jobId,
            userId,
            matchScore: 0,
            matchTier: "MANUAL_REVIEW",
            reasonMatched: "User bookmarked",
            notificationChannels: [],
          },
        });

        return reply.send({
          success: true,
          data: { saved: true, jobId },
        });
      } catch (error) {
        request.log.error(error, "POST /careers/jobs/:id/save failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to save job" });
      }
    }
  );
}
