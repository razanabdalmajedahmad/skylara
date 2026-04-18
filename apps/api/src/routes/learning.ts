import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import crypto from "crypto";

// ============================================================================
// LEARNING & SUBSCRIPTIONS ROUTES
// Course management, lesson progress tracking, quiz attempts, certificates,
// achievements, subscriptions, event attendance, saved content,
// and learner-facing catalog endpoints.
// ============================================================================

// ---------------------------------------------------------------------------
// Valid enum values (mirrors Prisma enums for runtime validation)
// ---------------------------------------------------------------------------

const VALID_COURSE_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
  "SUSPENDED",
] as const;

const VALID_ACCESS_TYPES = [
  "FREE",
  "PAID",
  "SUBSCRIPTION",
  "INVITATION",
  "ORGANIZATION",
  "DROPZONE",
  "BUNDLE",
] as const;

const VALID_CONTENT_TYPES = [
  "VIDEO",
  "DOCUMENT",
  "QUIZ",
  "CHECKLIST",
  "SAFETY_BRIEF",
  "COACHING_PACK",
  "WEBINAR_REPLAY",
  "LIVE_WORKSHOP",
] as const;

const VALID_VIDEO_PROVIDERS = [
  "MUX",
  "CLOUDFLARE_STREAM",
  "YOUTUBE",
  "EXTERNAL_URL",
  "UPLOADED",
] as const;

const VALID_SUBSCRIPTION_TIERS = [
  "FREE",
  "PRO",
  "TEAM",
  "EVENT_PASS",
] as const;

const VALID_SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PAST_DUE",
  "TRIALING",
] as const;

const VALID_CERTIFICATE_TYPES = [
  "COURSE_COMPLETED",
  "QUIZ_PASSED",
  "ATTENDED_CAMP",
  "ATTENDED_BOOGIE",
  "INTERNAL_CERTIFICATE",
  "SKILL_PATH_COMPLETED",
  "STAFF_ONBOARDING_COMPLETED",
  "SAFETY_REFRESHER_COMPLETED",
] as const;

const VALID_ACHIEVEMENT_TYPES = [
  "COURSE_COMPLETED",
  "QUIZ_PASSED",
  "ATTENDED_CAMP",
  "ATTENDED_BOOGIE",
  "INTERNAL_CERTIFICATE",
  "SKILL_PATH_COMPLETED",
  "STAFF_ONBOARDING_COMPLETED",
  "SAFETY_REFRESHER_COMPLETED",
  "FIRST_LESSON_WATCHED",
  "STREAK_7_DAYS",
  "ALL_MODULES_COMPLETE",
] as const;

const VALID_VISIBILITY = [
  "PUBLIC",
  "PLATFORM_ONLY",
  "DZ_ONLY",
  "PRIVATE",
] as const;

const VALID_ENROLLMENT_STATUSES = [
  "ENROLLED",
  "IN_PROGRESS",
  "COMPLETED",
  "DROPPED",
  "EXPIRED",
] as const;

const VALID_ATTENDANCE_STATUSES = [
  "REGISTERED",
  "ATTENDED",
  "NO_SHOW",
  "CANCELLED",
] as const;

const VALID_SAVED_CONTENT_TYPES = [
  "COURSE",
  "LESSON",
  "QUIZ",
  "CERTIFICATE",
] as const;

const VALID_RECOMMENDATION_CONTENT_TYPES = [
  "COURSE",
  "LESSON",
  "QUIZ",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CERT-${part1}-${part2}`;
}

function parseDropzoneId(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const parsed = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseUserId(sub: string | number | undefined): number {
  return parseInt(String(sub), 10);
}

function parseIntParam(value: string | undefined, defaultVal: number): number {
  if (!value) return defaultVal;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultVal;
}

// ---------------------------------------------------------------------------
// Route module
// ---------------------------------------------------------------------------

export async function learningRoutes(fastify: FastifyInstance) {
  // ========================================================================
  // PUBLIC COURSE BROWSE (any authenticated user / athlete)
  // ========================================================================

  // GET /learning/browse — Browse published courses (athlete-facing)
  fastify.get<{
    Querystring: { category?: string; limit?: string };
  }>(
    "/learning/browse",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const where: any = { status: "PUBLISHED" };
        if (request.query.category) where.category = request.query.category;

        const courses = await fastify.prisma.learningCourse.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            accessType: true,
            level: true,
            coverImageUrl: true,
            estimatedDurationMinutes: true,
            createdAt: true,
            _count: { select: { enrollments: true, modules: true, lessons: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        return reply.send({
          success: true,
          data: courses.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            category: c.category,
            accessType: c.accessType,
            level: c.level,
            thumbnailUrl: c.coverImageUrl,
            estimatedHours: c.estimatedDurationMinutes ? c.estimatedDurationMinutes / 60 : null,
            enrollmentCount: c._count.enrollments,
            moduleCount: c._count.modules,
            lessonCount: c._count.lessons,
            createdAt: c.createdAt,
          })),
        });
      } catch (error) {
        request.log.error(error, "GET /learning/browse failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch courses" });
      }
    }
  );

  // ========================================================================
  // GROUP 1: ADMIN — Course Management
  // Requires PLATFORM_ADMIN, DZ_OWNER, or DZ_MANAGER
  // ========================================================================

  // POST /learning/courses — Create a new course
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/courses",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "title is required" });
        }

        const uuid = crypto.randomUUID();
        const slug = generateSlug(body.title);

        const course = await fastify.prisma.learningCourse.create({
          data: {
            uuid,
            organizationId: body.organizationId ?? null,
            dropzoneId,
            branchId: body.branchId ?? null,
            title: body.title.trim(),
            slug,
            description: body.description ?? null,
            shortDescription: body.shortDescription ?? null,
            category: body.category ?? null,
            level: body.level ?? null,
            accessType: VALID_ACCESS_TYPES.includes(body.accessType)
              ? body.accessType
              : "FREE",
            visibility: VALID_VISIBILITY.includes(body.visibility)
              ? body.visibility
              : "PLATFORM_ONLY",
            status: "DRAFT",
            coverImageUrl: body.coverImageUrl ?? null,
            estimatedDurationMinutes: body.estimatedDurationMinutes ?? null,
            sortOrder: body.sortOrder ?? 0,
            isFeatured: body.isFeatured ?? false,
            prerequisiteCourseId: body.prerequisiteCourseId ?? null,
            createdById: userId,
          },
        });

        return reply.code(201).send({ success: true, data: course });
      } catch (error) {
        request.log.error(error, "POST /learning/courses failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create course" });
      }
    }
  );

  // GET /learning/courses — List courses for admin with filters
  fastify.get<{
    Querystring: {
      status?: string;
      category?: string;
      accessType?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
  }>(
    "/learning/courses",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        const { status, category, accessType, search } = request.query;
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = {};
        if (dropzoneId) where.dropzoneId = dropzoneId;
        if (status && VALID_COURSE_STATUSES.includes(status as any)) {
          where.status = status;
        }
        if (category) where.category = category;
        if (accessType && VALID_ACCESS_TYPES.includes(accessType as any)) {
          where.accessType = accessType;
        }
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
          ];
        }

        const [courses, total] = await Promise.all([
          fastify.prisma.learningCourse.findMany({
            where,
            include: {
              _count: {
                select: {
                  enrollments: true,
                  lessons: true,
                  modules: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningCourse.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: courses,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/courses failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch courses" });
      }
    }
  );

  // GET /learning/courses/:id — Course detail with modules, lessons, quizzes, enrollment count
  fastify.get<{ Params: { id: string } }>(
    "/learning/courses/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.id, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
          include: {
            modules: {
              orderBy: { sortOrder: "asc" },
              include: {
                lessons: { orderBy: { sortOrder: "asc" } },
              },
            },
            lessons: { orderBy: { sortOrder: "asc" } },
            quizzes: { orderBy: { sortOrder: "asc" } },
            _count: { select: { enrollments: true } },
          },
        });

        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        return reply.send({ success: true, data: course });
      } catch (error) {
        request.log.error(error, "GET /learning/courses/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch course" });
      }
    }
  );

  // PATCH /learning/courses/:id — Update course fields
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/learning/courses/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.id, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const existing = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.title !== undefined) updateData.title = body.title.trim();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.level !== undefined) updateData.level = body.level;
        if (body.accessType !== undefined && VALID_ACCESS_TYPES.includes(body.accessType)) {
          updateData.accessType = body.accessType;
        }
        if (body.visibility !== undefined && VALID_VISIBILITY.includes(body.visibility)) {
          updateData.visibility = body.visibility;
        }
        if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl;
        if (body.estimatedDurationMinutes !== undefined) {
          updateData.estimatedDurationMinutes = body.estimatedDurationMinutes;
        }
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
        if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
        if (body.prerequisiteCourseId !== undefined) {
          updateData.prerequisiteCourseId = body.prerequisiteCourseId;
        }

        const updated = await fastify.prisma.learningCourse.update({
          where: { id: courseId },
          data: updateData,
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "PATCH /learning/courses/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update course" });
      }
    }
  );

  // POST /learning/courses/:id/publish — Publish a course
  fastify.post<{ Params: { id: string } }>(
    "/learning/courses/:id/publish",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.id, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const existing = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }
        if (existing.status === "PUBLISHED") {
          return reply
            .code(400)
            .send({ success: false, error: "Course is already published" });
        }

        const updated = await fastify.prisma.learningCourse.update({
          where: { id: courseId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "POST /learning/courses/:id/publish failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to publish course" });
      }
    }
  );

  // POST /learning/courses/:id/archive — Archive a course
  fastify.post<{ Params: { id: string } }>(
    "/learning/courses/:id/archive",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.id, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const existing = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }
        if (existing.status === "ARCHIVED") {
          return reply
            .code(400)
            .send({ success: false, error: "Course is already archived" });
        }

        const updated = await fastify.prisma.learningCourse.update({
          where: { id: courseId },
          data: {
            status: "ARCHIVED",
            archivedAt: new Date(),
          },
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "POST /learning/courses/:id/archive failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to archive course" });
      }
    }
  );

  // ========================================================================
  // GROUP 2: ADMIN — Module & Lesson Management
  // ========================================================================

  // POST /learning/courses/:courseId/modules — Create module
  fastify.post<{ Params: { courseId: string }; Body: Record<string, any> }>(
    "/learning/courses/:courseId/modules",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.courseId, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        const body = request.body as Record<string, any>;
        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "title is required" });
        }

        const mod = await fastify.prisma.learningCourseModule.create({
          data: {
            courseId,
            title: body.title.trim(),
            description: body.description ?? null,
            sortOrder: body.sortOrder ?? 0,
          },
        });

        return reply.code(201).send({ success: true, data: mod });
      } catch (error) {
        request.log.error(error, "POST /learning/courses/:courseId/modules failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create module" });
      }
    }
  );

  // PATCH /learning/modules/:id — Update module
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/learning/modules/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const moduleId = parseInt(request.params.id, 10);
        if (!Number.isFinite(moduleId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid module ID" });
        }

        const existing = await fastify.prisma.learningCourseModule.findUnique({
          where: { id: moduleId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Module not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};
        if (body.title !== undefined) updateData.title = body.title.trim();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

        const updated = await fastify.prisma.learningCourseModule.update({
          where: { id: moduleId },
          data: updateData,
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "PATCH /learning/modules/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update module" });
      }
    }
  );

  // DELETE /learning/modules/:id — Delete module
  fastify.delete<{ Params: { id: string } }>(
    "/learning/modules/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const moduleId = parseInt(request.params.id, 10);
        if (!Number.isFinite(moduleId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid module ID" });
        }

        const existing = await fastify.prisma.learningCourseModule.findUnique({
          where: { id: moduleId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Module not found" });
        }

        await fastify.prisma.learningCourseModule.delete({
          where: { id: moduleId },
        });

        return reply.send({ success: true, data: { deleted: true } });
      } catch (error) {
        request.log.error(error, "DELETE /learning/modules/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to delete module" });
      }
    }
  );

  // POST /learning/courses/:courseId/lessons — Create lesson
  fastify.post<{ Params: { courseId: string }; Body: Record<string, any> }>(
    "/learning/courses/:courseId/lessons",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.courseId, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        const body = request.body as Record<string, any>;
        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "title is required" });
        }

        const uuid = crypto.randomUUID();

        const lesson = await fastify.prisma.learningLesson.create({
          data: {
            uuid,
            courseId,
            moduleId: body.moduleId ?? null,
            title: body.title.trim(),
            description: body.description ?? null,
            contentType: VALID_CONTENT_TYPES.includes(body.contentType)
              ? body.contentType
              : "VIDEO",
            videoProvider: VALID_VIDEO_PROVIDERS.includes(body.videoProvider)
              ? body.videoProvider
              : null,
            videoAssetId: body.videoAssetId ?? null,
            externalVideoUrl: body.externalVideoUrl ?? null,
            playbackId: body.playbackId ?? null,
            transcriptUrl: body.transcriptUrl ?? null,
            attachmentUrls: body.attachmentUrls ?? [],
            durationSeconds: body.durationSeconds ?? null,
            sortOrder: body.sortOrder ?? 0,
            isFree: body.isFree ?? false,
            isPublished: body.isPublished ?? false,
          },
        });

        return reply.code(201).send({ success: true, data: lesson });
      } catch (error) {
        request.log.error(error, "POST /learning/courses/:courseId/lessons failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create lesson" });
      }
    }
  );

  // PATCH /learning/lessons/:id — Update lesson
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/learning/lessons/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const lessonId = parseInt(request.params.id, 10);
        if (!Number.isFinite(lessonId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid lesson ID" });
        }

        const existing = await fastify.prisma.learningLesson.findUnique({
          where: { id: lessonId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Lesson not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.title !== undefined) updateData.title = body.title.trim();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.contentType !== undefined && VALID_CONTENT_TYPES.includes(body.contentType)) {
          updateData.contentType = body.contentType;
        }
        if (body.videoProvider !== undefined && VALID_VIDEO_PROVIDERS.includes(body.videoProvider)) {
          updateData.videoProvider = body.videoProvider;
        }
        if (body.videoAssetId !== undefined) updateData.videoAssetId = body.videoAssetId;
        if (body.externalVideoUrl !== undefined) updateData.externalVideoUrl = body.externalVideoUrl;
        if (body.playbackId !== undefined) updateData.playbackId = body.playbackId;
        if (body.transcriptUrl !== undefined) updateData.transcriptUrl = body.transcriptUrl;
        if (body.attachmentUrls !== undefined) updateData.attachmentUrls = body.attachmentUrls;
        if (body.durationSeconds !== undefined) updateData.durationSeconds = body.durationSeconds;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
        if (body.isFree !== undefined) updateData.isFree = body.isFree;
        if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
        if (body.moduleId !== undefined) updateData.moduleId = body.moduleId;

        const updated = await fastify.prisma.learningLesson.update({
          where: { id: lessonId },
          data: updateData,
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "PATCH /learning/lessons/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update lesson" });
      }
    }
  );

  // DELETE /learning/lessons/:id — Delete lesson
  fastify.delete<{ Params: { id: string } }>(
    "/learning/lessons/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const lessonId = parseInt(request.params.id, 10);
        if (!Number.isFinite(lessonId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid lesson ID" });
        }

        const existing = await fastify.prisma.learningLesson.findUnique({
          where: { id: lessonId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Lesson not found" });
        }

        await fastify.prisma.learningLesson.delete({
          where: { id: lessonId },
        });

        return reply.send({ success: true, data: { deleted: true } });
      } catch (error) {
        request.log.error(error, "DELETE /learning/lessons/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to delete lesson" });
      }
    }
  );

  // ========================================================================
  // GROUP 3: ADMIN — Quiz Management
  // ========================================================================

  // POST /learning/courses/:courseId/quizzes — Create quiz
  fastify.post<{ Params: { courseId: string }; Body: Record<string, any> }>(
    "/learning/courses/:courseId/quizzes",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.courseId, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        const body = request.body as Record<string, any>;
        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "title is required" });
        }
        if (body.passScore == null || typeof body.passScore !== "number") {
          return reply
            .code(400)
            .send({ success: false, error: "passScore is required and must be a number" });
        }
        if (!body.questions || !Array.isArray(body.questions)) {
          return reply
            .code(400)
            .send({ success: false, error: "questions must be a JSON array" });
        }

        const uuid = crypto.randomUUID();

        const quiz = await fastify.prisma.learningQuiz.create({
          data: {
            uuid,
            courseId,
            title: body.title.trim(),
            description: body.description ?? null,
            passScore: body.passScore,
            questions: body.questions,
            timeLimit: body.timeLimit ?? null,
            maxAttempts: body.maxAttempts ?? null,
            sortOrder: body.sortOrder ?? 0,
            isPublished: body.isPublished ?? false,
          },
        });

        return reply.code(201).send({ success: true, data: quiz });
      } catch (error) {
        request.log.error(error, "POST /learning/courses/:courseId/quizzes failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create quiz" });
      }
    }
  );

  // PATCH /learning/quizzes/:id — Update quiz
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/learning/quizzes/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const quizId = parseInt(request.params.id, 10);
        if (!Number.isFinite(quizId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid quiz ID" });
        }

        const existing = await fastify.prisma.learningQuiz.findUnique({
          where: { id: quizId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Quiz not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.title !== undefined) updateData.title = body.title.trim();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.passScore !== undefined) updateData.passScore = body.passScore;
        if (body.questions !== undefined) updateData.questions = body.questions;
        if (body.timeLimit !== undefined) updateData.timeLimit = body.timeLimit;
        if (body.maxAttempts !== undefined) updateData.maxAttempts = body.maxAttempts;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
        if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;

        const updated = await fastify.prisma.learningQuiz.update({
          where: { id: quizId },
          data: updateData,
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "PATCH /learning/quizzes/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update quiz" });
      }
    }
  );

  // DELETE /learning/quizzes/:id — Delete quiz
  fastify.delete<{ Params: { id: string } }>(
    "/learning/quizzes/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const quizId = parseInt(request.params.id, 10);
        if (!Number.isFinite(quizId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid quiz ID" });
        }

        const existing = await fastify.prisma.learningQuiz.findUnique({
          where: { id: quizId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Quiz not found" });
        }

        await fastify.prisma.learningQuiz.delete({
          where: { id: quizId },
        });

        return reply.send({ success: true, data: { deleted: true } });
      } catch (error) {
        request.log.error(error, "DELETE /learning/quizzes/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to delete quiz" });
      }
    }
  );

  // ========================================================================
  // GROUP 4: ADMIN — Certificate Management
  // ========================================================================

  // POST /learning/certificates/issue — Manually issue a certificate
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/certificates/issue",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const issuedById = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (!body.userId || typeof body.userId !== "number") {
          return reply
            .code(400)
            .send({ success: false, error: "userId is required" });
        }
        if (
          !body.certificateType ||
          !VALID_CERTIFICATE_TYPES.includes(body.certificateType)
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              error: `certificateType must be one of: ${VALID_CERTIFICATE_TYPES.join(", ")}`,
            });
        }
        if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
          return reply
            .code(400)
            .send({ success: false, error: "title is required" });
        }

        const uuid = crypto.randomUUID();
        const verificationCode = generateVerificationCode();

        const certificate = await fastify.prisma.learningCertificate.create({
          data: {
            uuid,
            userId: body.userId,
            courseId: body.courseId ?? null,
            eventId: body.eventId ?? null,
            eventType: body.eventType ?? null,
            certificateType: body.certificateType,
            title: body.title.trim(),
            description: body.description ?? null,
            issuedById,
            issueDate: new Date(),
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            verificationCode,
            pdfUrl: body.pdfUrl ?? null,
            visibility: VALID_VISIBILITY.includes(body.visibility)
              ? body.visibility
              : "PLATFORM_ONLY",
            metadata: body.metadata ?? {},
          },
        });

        return reply.code(201).send({ success: true, data: certificate });
      } catch (error) {
        request.log.error(error, "POST /learning/certificates/issue failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to issue certificate" });
      }
    }
  );

  // POST /learning/certificates/:id/revoke — Revoke a certificate
  fastify.post<{ Params: { id: string }; Body: Record<string, any> }>(
    "/learning/certificates/:id/revoke",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const certId = parseInt(request.params.id, 10);
        if (!Number.isFinite(certId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid certificate ID" });
        }

        const existing = await fastify.prisma.learningCertificate.findUnique({
          where: { id: certId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Certificate not found" });
        }
        if (existing.revokedAt) {
          return reply
            .code(400)
            .send({ success: false, error: "Certificate is already revoked" });
        }

        const body = request.body as Record<string, any>;

        const updated = await fastify.prisma.learningCertificate.update({
          where: { id: certId },
          data: {
            revokedAt: new Date(),
            revokeReason: body.revokeReason ?? null,
          },
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "POST /learning/certificates/:id/revoke failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to revoke certificate" });
      }
    }
  );

  // GET /learning/admin/certificates — List all certificates with filters
  fastify.get<{
    Querystring: {
      certificateType?: string;
      userId?: string;
      courseId?: string;
      page?: string;
      limit?: string;
    };
  }>(
    "/learning/admin/certificates",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const { certificateType, userId, courseId } = request.query;
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = {};
        if (
          certificateType &&
          VALID_CERTIFICATE_TYPES.includes(certificateType as any)
        ) {
          where.certificateType = certificateType;
        }
        if (userId) {
          const uid = parseInt(userId, 10);
          if (Number.isFinite(uid)) where.userId = uid;
        }
        if (courseId) {
          const cid = parseInt(courseId, 10);
          if (Number.isFinite(cid)) where.courseId = cid;
        }

        const [certificates, total] = await Promise.all([
          fastify.prisma.learningCertificate.findMany({
            where,
            orderBy: { issueDate: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningCertificate.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: certificates,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/admin/certificates failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch certificates" });
      }
    }
  );

  // ========================================================================
  // GROUP 5: ADMIN — Analytics
  // ========================================================================

  // GET /learning/analytics/overview — Platform-level learning analytics
  fastify.get(
    "/learning/analytics/overview",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);

        const courseWhere: any = {};
        if (dropzoneId) courseWhere.dropzoneId = dropzoneId;

        const [
          totalCourses,
          publishedCourses,
          totalEnrollments,
          completedEnrollments,
          totalCertificates,
          activeSubscriptions,
        ] = await Promise.all([
          fastify.prisma.learningCourse.count({ where: courseWhere }),
          fastify.prisma.learningCourse.count({
            where: { ...courseWhere, status: "PUBLISHED" },
          }),
          fastify.prisma.learningEnrollment.count(),
          fastify.prisma.learningEnrollment.count({
            where: { enrollmentStatus: "COMPLETED" },
          }),
          fastify.prisma.learningCertificate.count(),
          fastify.prisma.learningSubscription.count({
            where: { status: "ACTIVE" },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalCourses,
            publishedCourses,
            totalEnrollments,
            completedEnrollments,
            totalCertificates,
            activeSubscriptions,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/analytics/overview failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch analytics overview" });
      }
    }
  );

  // GET /learning/analytics/course/:id — Course-specific analytics
  fastify.get<{ Params: { id: string } }>(
    "/learning/analytics/course/:id",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const courseId = parseInt(request.params.id, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
          include: {
            lessons: { select: { id: true, title: true } },
          },
        });
        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        const enrollments = await fastify.prisma.learningEnrollment.findMany({
          where: { courseId },
          select: {
            enrollmentStatus: true,
            completionPercent: true,
          },
        });

        const enrollmentCount = enrollments.length;
        const completedCount = enrollments.filter(
          (e: any) => e.enrollmentStatus === "COMPLETED"
        ).length;
        const completionRate =
          enrollmentCount > 0
            ? Math.round((completedCount / enrollmentCount) * 100)
            : 0;
        const avgProgress =
          enrollmentCount > 0
            ? Math.round(
                enrollments.reduce(
                  (sum: number, e: any) => sum + (e.completionPercent || 0),
                  0
                ) / enrollmentCount
              )
            : 0;

        // Lesson completion breakdown
        const lessonIds = course.lessons.map((l: any) => l.id);
        const lessonProgress = await fastify.prisma.learningLessonProgress.groupBy({
          by: ["lessonId"],
          where: {
            lessonId: { in: lessonIds },
            completed: true,
          },
          _count: { id: true },
        });

        const lessonCompletionBreakdown = course.lessons.map((lesson: any) => {
          const progress = lessonProgress.find(
            (lp: any) => lp.lessonId === lesson.id
          );
          return {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            completedCount: progress ? progress._count.id : 0,
          };
        });

        return reply.send({
          success: true,
          data: {
            courseId,
            enrollmentCount,
            completedCount,
            completionRate,
            avgProgress,
            lessonCompletionBreakdown,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/analytics/course/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch course analytics" });
      }
    }
  );

  // ========================================================================
  // GROUP 6: LEARNER — Content Discovery
  // ========================================================================

  // GET /learning/catalog — Browse published courses
  fastify.get<{
    Querystring: {
      category?: string;
      level?: string;
      accessType?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
  }>(
    "/learning/catalog",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const { category, level, accessType, search } = request.query;
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = { status: "PUBLISHED" };
        if (category) where.category = category;
        if (level) where.level = level;
        if (accessType && VALID_ACCESS_TYPES.includes(accessType as any)) {
          where.accessType = accessType;
        }
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
            { shortDescription: { contains: search } },
          ];
        }

        const [courses, total] = await Promise.all([
          fastify.prisma.learningCourse.findMany({
            where,
            include: {
              _count: {
                select: { lessons: true, modules: true, enrollments: true },
              },
            },
            orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
            take: limit,
            skip,
          }),
          fastify.prisma.learningCourse.count({ where }),
        ]);

        // Fetch user's enrollment status for these courses
        const courseIds = courses.map((c: any) => c.id);
        const userEnrollments = await fastify.prisma.learningEnrollment.findMany({
          where: {
            userId,
            courseId: { in: courseIds },
          },
          select: {
            courseId: true,
            enrollmentStatus: true,
            completionPercent: true,
          },
        });

        const enrollmentMap = new Map(
          userEnrollments.map((e: any) => [e.courseId, e])
        );

        const data = courses.map((c: any) => ({
          ...c,
          userEnrollment: enrollmentMap.get(c.id) ?? null,
        }));

        return reply.send({
          success: true,
          data,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/catalog failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch catalog" });
      }
    }
  );

  // GET /learning/catalog/:slug — Course detail for learners
  fastify.get<{ Params: { slug: string } }>(
    "/learning/catalog/:slug",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const { slug } = request.params;

        const course = await fastify.prisma.learningCourse.findFirst({
          where: { slug, status: "PUBLISHED" },
          include: {
            modules: {
              orderBy: { sortOrder: "asc" },
              include: {
                lessons: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    uuid: true,
                    title: true,
                    description: true,
                    contentType: true,
                    durationSeconds: true,
                    sortOrder: true,
                    isFree: true,
                    isPublished: true,
                  },
                },
              },
            },
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                uuid: true,
                title: true,
                description: true,
                contentType: true,
                durationSeconds: true,
                sortOrder: true,
                isFree: true,
                isPublished: true,
                moduleId: true,
              },
            },
            quizzes: {
              where: { isPublished: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                uuid: true,
                title: true,
                description: true,
                passScore: true,
                timeLimit: true,
                maxAttempts: true,
              },
            },
            _count: { select: { enrollments: true } },
          },
        });

        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        // Get user's enrollment
        const enrollment = await fastify.prisma.learningEnrollment.findUnique({
          where: {
            userId_courseId: { userId, courseId: course.id },
          },
        });

        // Get user's progress per lesson
        const lessonIds = course.lessons.map((l: any) => l.id);
        const progressRecords = await fastify.prisma.learningLessonProgress.findMany({
          where: {
            userId,
            lessonId: { in: lessonIds },
          },
        });

        const progressMap = new Map(
          progressRecords.map((p: any) => [p.lessonId, p])
        );

        const lessonsWithProgress = course.lessons.map((l: any) => ({
          ...l,
          userProgress: progressMap.get(l.id) ?? null,
        }));

        return reply.send({
          success: true,
          data: {
            ...course,
            lessons: lessonsWithProgress,
            userEnrollment: enrollment,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/catalog/:slug failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch course detail" });
      }
    }
  );

  // ========================================================================
  // GROUP 7: LEARNER — Enrollment & Progress
  // ========================================================================

  // POST /learning/enroll/:courseId — Enroll in a course
  fastify.post<{ Params: { courseId: string } }>(
    "/learning/enroll/:courseId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const courseId = parseInt(request.params.courseId, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
        });
        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }
        if (course.status !== "PUBLISHED") {
          return reply
            .code(400)
            .send({ success: false, error: "Course is not available for enrollment" });
        }

        // Phase 1: Only allow FREE courses
        if (course.accessType !== "FREE") {
          return reply
            .code(403)
            .send({
              success: false,
              error: "Only free courses are available for enrollment in Phase 1",
            });
        }

        // Check if already enrolled
        const existingEnrollment = await fastify.prisma.learningEnrollment.findUnique({
          where: {
            userId_courseId: { userId, courseId },
          },
        });
        if (existingEnrollment) {
          return reply
            .code(400)
            .send({ success: false, error: "Already enrolled in this course" });
        }

        // Check prerequisite
        if (course.prerequisiteCourseId) {
          const prereqEnrollment = await fastify.prisma.learningEnrollment.findUnique({
            where: {
              userId_courseId: {
                userId,
                courseId: course.prerequisiteCourseId,
              },
            },
          });
          if (!prereqEnrollment || prereqEnrollment.enrollmentStatus !== "COMPLETED") {
            return reply
              .code(403)
              .send({
                success: false,
                error: "Prerequisite course must be completed first",
              });
          }
        }

        const uuid = crypto.randomUUID();

        const enrollment = await fastify.prisma.learningEnrollment.create({
          data: {
            uuid,
            userId,
            courseId,
            sourceType: "SELF",
            enrollmentStatus: "ENROLLED",
            completionPercent: 0,
            startedAt: new Date(),
          },
        });

        return reply.code(201).send({ success: true, data: enrollment });
      } catch (error) {
        request.log.error(error, "POST /learning/enroll/:courseId failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to enroll in course" });
      }
    }
  );

  // GET /learning/my-courses — List user's enrolled courses with progress
  fastify.get<{
    Querystring: {
      status?: string;
      page?: string;
      limit?: string;
    };
  }>(
    "/learning/my-courses",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const { status } = request.query;
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = { userId };
        if (status && VALID_ENROLLMENT_STATUSES.includes(status as any)) {
          where.enrollmentStatus = status;
        }

        const [enrollments, total] = await Promise.all([
          fastify.prisma.learningEnrollment.findMany({
            where,
            include: {
              course: {
                select: {
                  id: true,
                  uuid: true,
                  title: true,
                  slug: true,
                  description: true,
                  shortDescription: true,
                  category: true,
                  level: true,
                  coverImageUrl: true,
                  estimatedDurationMinutes: true,
                  _count: { select: { lessons: true } },
                },
              },
            },
            orderBy: { lastAccessedAt: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningEnrollment.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: enrollments,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/my-courses failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch enrolled courses" });
      }
    }
  );

  // PATCH /learning/progress/:lessonId — Update lesson progress
  fastify.patch<{ Params: { lessonId: string }; Body: Record<string, any> }>(
    "/learning/progress/:lessonId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const lessonId = parseInt(request.params.lessonId, 10);
        if (!Number.isFinite(lessonId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid lesson ID" });
        }

        const lesson = await fastify.prisma.learningLesson.findUnique({
          where: { id: lessonId },
          select: { id: true, courseId: true },
        });
        if (!lesson) {
          return reply
            .code(404)
            .send({ success: false, error: "Lesson not found" });
        }

        // Ensure user is enrolled in the course
        const enrollment = await fastify.prisma.learningEnrollment.findUnique({
          where: {
            userId_courseId: { userId, courseId: lesson.courseId },
          },
        });
        if (!enrollment) {
          return reply
            .code(403)
            .send({ success: false, error: "Not enrolled in this course" });
        }

        const body = request.body as Record<string, any>;
        const now = new Date();
        const completed = body.completed === true;

        // Upsert lesson progress
        const progress = await fastify.prisma.learningLessonProgress.upsert({
          where: {
            userId_lessonId: { userId, lessonId },
          },
          create: {
            userId,
            lessonId,
            progressSeconds: body.progressSeconds ?? 0,
            completed,
            completedAt: completed ? now : null,
            lastWatchedAt: now,
          },
          update: {
            progressSeconds: body.progressSeconds ?? undefined,
            completed,
            completedAt: completed ? now : undefined,
            lastWatchedAt: now,
          },
        });

        // Calculate enrollment completion percent
        const totalLessons = await fastify.prisma.learningLesson.count({
          where: { courseId: lesson.courseId },
        });
        const completedLessons = await fastify.prisma.learningLessonProgress.count({
          where: {
            userId,
            lessonId: {
              in: (
                await fastify.prisma.learningLesson.findMany({
                  where: { courseId: lesson.courseId },
                  select: { id: true },
                })
              ).map((l: any) => l.id),
            },
            completed: true,
          },
        });

        const completionPercent =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        const allComplete = totalLessons > 0 && completedLessons >= totalLessons;

        // Update enrollment
        const enrollmentUpdate: any = {
          completionPercent,
          lastAccessedAt: now,
        };
        if (
          enrollment.enrollmentStatus === "ENROLLED" ||
          enrollment.enrollmentStatus === "IN_PROGRESS"
        ) {
          enrollmentUpdate.enrollmentStatus = allComplete
            ? "COMPLETED"
            : "IN_PROGRESS";
        }
        if (allComplete && !enrollment.completedAt) {
          enrollmentUpdate.completedAt = now;
        }

        await fastify.prisma.learningEnrollment.update({
          where: { id: enrollment.id },
          data: enrollmentUpdate,
        });

        // Auto-issue certificate on completion
        if (allComplete && !enrollment.completedAt) {
          const existingCert = await fastify.prisma.learningCertificate.findFirst({
            where: {
              userId,
              courseId: lesson.courseId,
              certificateType: "COURSE_COMPLETED",
            },
          });

          if (!existingCert) {
            const course = await fastify.prisma.learningCourse.findUnique({
              where: { id: lesson.courseId },
              select: { title: true },
            });

            await fastify.prisma.learningCertificate.create({
              data: {
                uuid: crypto.randomUUID(),
                userId,
                courseId: lesson.courseId,
                certificateType: "COURSE_COMPLETED",
                title: `Course Completed: ${course?.title ?? "Unknown"}`,
                issueDate: now,
                verificationCode: generateVerificationCode(),
                visibility: "PLATFORM_ONLY",
                metadata: {},
              },
            });

            // Also create an achievement
            await fastify.prisma.learningAchievement.create({
              data: {
                uuid: crypto.randomUUID(),
                userId,
                achievementType: "COURSE_COMPLETED",
                sourceType: "COURSE",
                sourceId: lesson.courseId,
                title: `Completed: ${course?.title ?? "Unknown"}`,
                description: "Successfully completed all lessons in this course.",
                visibility: "PLATFORM_ONLY",
                metadata: {},
              },
            });
          }
        }

        // Check for FIRST_LESSON_WATCHED achievement
        if (completed) {
          const totalCompleted = await fastify.prisma.learningLessonProgress.count({
            where: { userId, completed: true },
          });
          if (totalCompleted === 1) {
            const existingAchievement =
              await fastify.prisma.learningAchievement.findFirst({
                where: {
                  userId,
                  achievementType: "FIRST_LESSON_WATCHED",
                },
              });
            if (!existingAchievement) {
              await fastify.prisma.learningAchievement.create({
                data: {
                  uuid: crypto.randomUUID(),
                  userId,
                  achievementType: "FIRST_LESSON_WATCHED",
                  sourceType: "LESSON",
                  sourceId: lessonId,
                  title: "First Lesson Watched",
                  description: "You watched your first lesson!",
                  visibility: "PLATFORM_ONLY",
                  metadata: {},
                },
              });
            }
          }
        }

        return reply.send({
          success: true,
          data: {
            progress,
            completionPercent,
            allComplete,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /learning/progress/:lessonId failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update progress" });
      }
    }
  );

  // GET /learning/progress/course/:courseId — Get user's progress for all lessons in a course
  fastify.get<{ Params: { courseId: string } }>(
    "/learning/progress/course/:courseId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const courseId = parseInt(request.params.courseId, 10);
        if (!Number.isFinite(courseId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid course ID" });
        }

        const course = await fastify.prisma.learningCourse.findUnique({
          where: { id: courseId },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, title: true, sortOrder: true, moduleId: true },
            },
          },
        });
        if (!course) {
          return reply
            .code(404)
            .send({ success: false, error: "Course not found" });
        }

        const enrollment = await fastify.prisma.learningEnrollment.findUnique({
          where: {
            userId_courseId: { userId, courseId },
          },
        });

        const lessonIds = course.lessons.map((l: any) => l.id);
        const progressRecords = await fastify.prisma.learningLessonProgress.findMany({
          where: {
            userId,
            lessonId: { in: lessonIds },
          },
        });

        const progressMap = new Map(
          progressRecords.map((p: any) => [p.lessonId, p])
        );

        const lessons = course.lessons.map((l: any) => ({
          ...l,
          progress: progressMap.get(l.id) ?? null,
        }));

        return reply.send({
          success: true,
          data: {
            courseId,
            enrollment,
            lessons,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/progress/course/:courseId failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch course progress" });
      }
    }
  );

  // ========================================================================
  // GROUP 8: LEARNER — Quiz
  // ========================================================================

  // POST /learning/quiz/:quizId/attempt — Submit quiz attempt
  fastify.post<{ Params: { quizId: string }; Body: Record<string, any> }>(
    "/learning/quiz/:quizId/attempt",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const quizId = parseInt(request.params.quizId, 10);
        if (!Number.isFinite(quizId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid quiz ID" });
        }

        const quiz = await fastify.prisma.learningQuiz.findUnique({
          where: { id: quizId },
        });
        if (!quiz) {
          return reply
            .code(404)
            .send({ success: false, error: "Quiz not found" });
        }
        if (!quiz.isPublished) {
          return reply
            .code(400)
            .send({ success: false, error: "Quiz is not published" });
        }

        // Check max attempts
        if (quiz.maxAttempts) {
          const attemptCount = await fastify.prisma.learningQuizAttempt.count({
            where: { userId, quizId },
          });
          if (attemptCount >= quiz.maxAttempts) {
            return reply
              .code(403)
              .send({
                success: false,
                error: `Maximum attempts (${quiz.maxAttempts}) reached`,
              });
          }
        }

        const body = request.body as Record<string, any>;
        if (!body.answers || !Array.isArray(body.answers)) {
          return reply
            .code(400)
            .send({ success: false, error: "answers must be a JSON array" });
        }

        // Calculate score
        const questions = quiz.questions as any[];
        let correctCount = 0;
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const answer = body.answers[i];
          if (answer && question.correctAnswer !== undefined) {
            if (String(answer.answer) === String(question.correctAnswer)) {
              correctCount++;
            }
          }
        }

        const score =
          questions.length > 0
            ? Math.round((correctCount / questions.length) * 100)
            : 0;
        const passed = score >= (quiz.passScore ?? 0);
        const now = new Date();

        const attempt = await fastify.prisma.learningQuizAttempt.create({
          data: {
            userId,
            quizId,
            score,
            passed,
            answers: body.answers,
            startedAt: body.startedAt ? new Date(body.startedAt) : now,
            completedAt: now,
          },
        });

        // If passed, create achievement
        if (passed) {
          const existingAchievement =
            await fastify.prisma.learningAchievement.findFirst({
              where: {
                userId,
                achievementType: "QUIZ_PASSED",
                sourceType: "QUIZ",
                sourceId: quizId,
              },
            });

          if (!existingAchievement) {
            await fastify.prisma.learningAchievement.create({
              data: {
                uuid: crypto.randomUUID(),
                userId,
                achievementType: "QUIZ_PASSED",
                sourceType: "QUIZ",
                sourceId: quizId,
                title: `Quiz Passed: ${quiz.title}`,
                description: `Scored ${score}% on ${quiz.title}`,
                visibility: "PLATFORM_ONLY",
                metadata: { score, passScore: quiz.passScore },
              },
            });
          }
        }

        return reply.code(201).send({
          success: true,
          data: {
            ...attempt,
            passed,
            score,
            totalQuestions: questions.length,
            correctCount,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /learning/quiz/:quizId/attempt failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to submit quiz attempt" });
      }
    }
  );

  // GET /learning/quiz/:quizId/attempts — Get user's attempts for a quiz
  fastify.get<{ Params: { quizId: string } }>(
    "/learning/quiz/:quizId/attempts",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const quizId = parseInt(request.params.quizId, 10);
        if (!Number.isFinite(quizId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid quiz ID" });
        }

        const quiz = await fastify.prisma.learningQuiz.findUnique({
          where: { id: quizId },
          select: { id: true, title: true, passScore: true, maxAttempts: true },
        });
        if (!quiz) {
          return reply
            .code(404)
            .send({ success: false, error: "Quiz not found" });
        }

        const attempts = await fastify.prisma.learningQuizAttempt.findMany({
          where: { userId, quizId },
          orderBy: { createdAt: "desc" },
        });

        return reply.send({
          success: true,
          data: {
            quiz,
            attempts,
            totalAttempts: attempts.length,
            remainingAttempts: quiz.maxAttempts
              ? Math.max(0, quiz.maxAttempts - attempts.length)
              : null,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/quiz/:quizId/attempts failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch quiz attempts" });
      }
    }
  );

  // ========================================================================
  // GROUP 9: LEARNER — Certificates & Achievements
  // ========================================================================

  // GET /learning/my-certificates — List user's certificates
  fastify.get<{
    Querystring: { page?: string; limit?: string };
  }>(
    "/learning/my-certificates",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = { userId, revokedAt: null };

        const [certificates, total] = await Promise.all([
          fastify.prisma.learningCertificate.findMany({
            where,
            orderBy: { issueDate: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningCertificate.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: certificates,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/my-certificates failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch certificates" });
      }
    }
  );

  // GET /learning/my-achievements — List user's achievements
  fastify.get<{
    Querystring: { page?: string; limit?: string };
  }>(
    "/learning/my-achievements",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const [achievements, total] = await Promise.all([
          fastify.prisma.learningAchievement.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningAchievement.count({ where: { userId } }),
        ]);

        return reply.send({
          success: true,
          data: achievements,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/my-achievements failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch achievements" });
      }
    }
  );

  // GET /learning/certificates/verify/:code — Public certificate verification (NO auth)
  fastify.get<{ Params: { code: string } }>(
    "/learning/certificates/verify/:code",
    async (request, reply) => {
      try {
        const { code } = request.params;
        if (!code || code.length < 8) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid verification code" });
        }

        const certificate = await fastify.prisma.learningCertificate.findFirst({
          where: { verificationCode: code },
          select: {
            uuid: true,
            certificateType: true,
            title: true,
            description: true,
            issueDate: true,
            expiresAt: true,
            revokedAt: true,
            verificationCode: true,
            courseId: true,
            eventId: true,
            eventType: true,
          },
        });

        if (!certificate) {
          return reply
            .code(404)
            .send({ success: false, error: "Certificate not found" });
        }

        const isValid = !certificate.revokedAt;
        const isExpired =
          certificate.expiresAt && new Date(certificate.expiresAt) < new Date();

        return reply.send({
          success: true,
          data: {
            ...certificate,
            isValid: isValid && !isExpired,
            isRevoked: !!certificate.revokedAt,
            isExpired: !!isExpired,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/certificates/verify/:code failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to verify certificate" });
      }
    }
  );

  // ========================================================================
  // GROUP 10: LEARNER — Saved Content & Recommendations
  // ========================================================================

  // POST /learning/save — Save content (upsert)
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/save",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (
          !body.contentType ||
          !VALID_SAVED_CONTENT_TYPES.includes(body.contentType)
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              error: `contentType must be one of: ${VALID_SAVED_CONTENT_TYPES.join(", ")}`,
            });
        }
        if (!body.contentId || typeof body.contentId !== "number") {
          return reply
            .code(400)
            .send({ success: false, error: "contentId is required and must be a number" });
        }

        const saved = await fastify.prisma.learningSavedContent.upsert({
          where: {
            userId_contentType_contentId: {
              userId,
              contentType: body.contentType,
              contentId: body.contentId,
            },
          },
          create: {
            userId,
            contentType: body.contentType,
            contentId: body.contentId,
            savedAt: new Date(),
          },
          update: {
            savedAt: new Date(),
          },
        });

        return reply.code(201).send({ success: true, data: saved });
      } catch (error) {
        request.log.error(error, "POST /learning/save failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to save content" });
      }
    }
  );

  // DELETE /learning/save/:contentType/:contentId — Unsave content
  fastify.delete<{ Params: { contentType: string; contentId: string } }>(
    "/learning/save/:contentType/:contentId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const { contentType, contentId: rawContentId } = request.params;
        const contentId = parseInt(rawContentId, 10);

        if (!Number.isFinite(contentId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid contentId" });
        }

        const existing = await fastify.prisma.learningSavedContent.findUnique({
          where: {
            userId_contentType_contentId: {
              userId,
              contentType,
              contentId,
            },
          },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Saved content not found" });
        }

        await fastify.prisma.learningSavedContent.delete({
          where: {
            userId_contentType_contentId: {
              userId,
              contentType,
              contentId,
            },
          },
        });

        return reply.send({ success: true, data: { deleted: true } });
      } catch (error) {
        request.log.error(error, "DELETE /learning/save/:contentType/:contentId failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to unsave content" });
      }
    }
  );

  // GET /learning/saved — List saved content
  fastify.get<{
    Querystring: { page?: string; limit?: string };
  }>(
    "/learning/saved",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
          fastify.prisma.learningSavedContent.findMany({
            where: { userId },
            orderBy: { savedAt: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningSavedContent.count({ where: { userId } }),
        ]);

        return reply.send({
          success: true,
          data: items,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/saved failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch saved content" });
      }
    }
  );

  // GET /learning/recommendations — Get recommendations for user
  fastify.get<{
    Querystring: { page?: string; limit?: string };
  }>(
    "/learning/recommendations",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = { userId, dismissed: false };

        const [recommendations, total] = await Promise.all([
          fastify.prisma.learningRecommendation.findMany({
            where,
            orderBy: { score: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningRecommendation.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: recommendations,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error, "GET /learning/recommendations failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch recommendations" });
      }
    }
  );

  // POST /learning/recommendations/:id/dismiss — Dismiss a recommendation
  fastify.post<{ Params: { id: string } }>(
    "/learning/recommendations/:id/dismiss",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const recId = parseInt(request.params.id, 10);
        if (!Number.isFinite(recId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid recommendation ID" });
        }

        const existing = await fastify.prisma.learningRecommendation.findFirst({
          where: { id: recId, userId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Recommendation not found" });
        }

        const updated = await fastify.prisma.learningRecommendation.update({
          where: { id: recId },
          data: { dismissed: true },
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        request.log.error(error, "POST /learning/recommendations/:id/dismiss failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to dismiss recommendation" });
      }
    }
  );

  // ========================================================================
  // GROUP 11: Subscriptions (basic in Phase 1)
  // ========================================================================

  // GET /learning/subscription — Get user's current subscription
  fastify.get(
    "/learning/subscription",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);

        const subscription = await fastify.prisma.learningSubscription.findFirst({
          where: {
            userId,
            status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
          },
          orderBy: { createdAt: "desc" },
        });

        return reply.send({
          success: true,
          data: subscription ?? null,
        });
      } catch (error) {
        request.log.error(error, "GET /learning/subscription failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch subscription" });
      }
    }
  );

  // POST /learning/subscription — Create or update subscription (Phase 1: no Stripe)
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/subscription",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (
          !body.subscriptionTier ||
          !VALID_SUBSCRIPTION_TIERS.includes(body.subscriptionTier)
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              error: `subscriptionTier must be one of: ${VALID_SUBSCRIPTION_TIERS.join(", ")}`,
            });
        }

        // Deactivate any existing active subscription
        await fastify.prisma.learningSubscription.updateMany({
          where: {
            userId,
            status: { in: ["ACTIVE", "TRIALING"] },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Replaced by new subscription",
          },
        });

        const uuid = crypto.randomUUID();
        const now = new Date();

        const subscription = await fastify.prisma.learningSubscription.create({
          data: {
            uuid,
            userId,
            subscriptionTier: body.subscriptionTier,
            status: "ACTIVE",
            startsAt: now,
            endsAt: body.endsAt ? new Date(body.endsAt) : null,
            sourceType: body.sourceType ?? "MANUAL",
            sourceRef: body.sourceRef ?? null,
            stripeSubId: null, // Phase 1: no Stripe integration
          },
        });

        return reply.code(201).send({ success: true, data: subscription });
      } catch (error) {
        request.log.error(error, "POST /learning/subscription failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create subscription" });
      }
    }
  );

  // ========================================================================
  // GROUP 11b: Stripe-backed subscription checkout
  // ========================================================================

  /** Subscription tier pricing (cents). Configurable per DZ via policy engine in future. */
  const SUBSCRIPTION_PRICES: Record<string, { amountCents: number; label: string }> = {
    PRO: { amountCents: 1999, label: "Pro — $19.99/month" },
    TEAM: { amountCents: 4999, label: "Team — $49.99/month" },
    EVENT_PASS: { amountCents: 2999, label: "Event Pass — $29.99" },
  };

  // POST /learning/subscription/checkout — Create Stripe payment intent for a tier
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/subscription/checkout",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;
        const tier = body.subscriptionTier as string;

        if (!tier || !SUBSCRIPTION_PRICES[tier]) {
          return reply.code(400).send({
            success: false,
            error: `subscriptionTier must be one of: ${Object.keys(SUBSCRIPTION_PRICES).join(", ")}`,
          });
        }

        const price = SUBSCRIPTION_PRICES[tier];

        // Check if Stripe is configured
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          return reply.code(503).send({
            success: false,
            error: "Payment processing not configured. Contact your DZ admin.",
          });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);

        // Get user email for the payment intent
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        });

        if (!user) {
          return reply.code(404).send({ success: false, error: "User not found" });
        }

        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: price.amountCents,
          currency: "usd",
          metadata: {
            userId: String(userId),
            subscriptionTier: tier,
            type: "learning_subscription",
          },
          receipt_email: user.email,
          description: `SkyLara Learning — ${price.label}`,
        });

        reply.code(200).send({
          success: true,
          data: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: price.amountCents,
            currency: "usd",
            tier,
            label: price.label,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /learning/subscription/checkout failed");
        return reply.code(500).send({ success: false, error: "Checkout failed" });
      }
    }
  );

  // POST /learning/subscription/confirm — Confirm payment and activate subscription
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/subscription/confirm",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;
        const { paymentIntentId, subscriptionTier } = body;

        if (!paymentIntentId || !subscriptionTier) {
          return reply.code(400).send({
            success: false,
            error: "paymentIntentId and subscriptionTier are required",
          });
        }

        // Verify payment intent succeeded
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          return reply.code(503).send({ success: false, error: "Payment processing not configured" });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
          return reply.code(402).send({
            success: false,
            error: `Payment not completed. Status: ${paymentIntent.status}`,
          });
        }

        // Verify metadata matches
        if (paymentIntent.metadata.userId !== String(userId)) {
          return reply.code(403).send({ success: false, error: "Payment does not belong to this user" });
        }

        // Deactivate existing subscriptions
        await fastify.prisma.learningSubscription.updateMany({
          where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
          data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Replaced by new subscription" },
        });

        // Create new subscription
        const uuid = crypto.randomUUID();
        const now = new Date();
        const endsAt = new Date(now);
        endsAt.setMonth(endsAt.getMonth() + (subscriptionTier === "EVENT_PASS" ? 0 : 1));

        const subscription = await fastify.prisma.learningSubscription.create({
          data: {
            uuid,
            userId,
            subscriptionTier,
            status: "ACTIVE",
            startsAt: now,
            endsAt: subscriptionTier === "EVENT_PASS" ? null : endsAt,
            sourceType: "STRIPE",
            sourceRef: paymentIntentId,
            stripeSubId: paymentIntentId,
          },
        });

        reply.code(201).send({ success: true, data: subscription });
      } catch (error) {
        request.log.error(error, "POST /learning/subscription/confirm failed");
        return reply.code(500).send({ success: false, error: "Subscription activation failed" });
      }
    }
  );

  // ========================================================================
  // GROUP 12: Event Attendance (admin)
  // ========================================================================

  // POST /learning/attendance/verify — Mark attendance
  fastify.post<{ Body: Record<string, any> }>(
    "/learning/attendance/verify",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const verifiedById = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (!body.userId || typeof body.userId !== "number") {
          return reply
            .code(400)
            .send({ success: false, error: "userId is required" });
        }
        if (!body.eventType || typeof body.eventType !== "string") {
          return reply
            .code(400)
            .send({ success: false, error: "eventType is required" });
        }
        if (!body.eventId || typeof body.eventId !== "number") {
          return reply
            .code(400)
            .send({ success: false, error: "eventId is required" });
        }
        if (
          !body.attendanceStatus ||
          !VALID_ATTENDANCE_STATUSES.includes(body.attendanceStatus)
        ) {
          return reply
            .code(400)
            .send({
              success: false,
              error: `attendanceStatus must be one of: ${VALID_ATTENDANCE_STATUSES.join(", ")}`,
            });
        }

        const uuid = crypto.randomUUID();
        const now = new Date();

        const attendance = await fastify.prisma.learningEventAttendance.upsert({
          where: {
            userId_eventType_eventId: {
              userId: body.userId,
              eventType: body.eventType,
              eventId: body.eventId,
            },
          },
          create: {
            uuid,
            userId: body.userId,
            eventType: body.eventType,
            eventId: body.eventId,
            attendanceStatus: body.attendanceStatus,
            verifiedById,
            verifiedAt: now,
            notes: body.notes ?? null,
          },
          update: {
            attendanceStatus: body.attendanceStatus,
            verifiedById,
            verifiedAt: now,
            notes: body.notes ?? null,
          },
        });

        return reply.code(201).send({ success: true, data: attendance });
      } catch (error) {
        request.log.error(error, "POST /learning/attendance/verify failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to verify attendance" });
      }
    }
  );

  // GET /learning/attendance/event/:eventType/:eventId — List attendance for event
  fastify.get<{
    Params: { eventType: string; eventId: string };
    Querystring: { page?: string; limit?: string };
  }>(
    "/learning/attendance/event/:eventType/:eventId",
    {
      preHandler: [
        authenticate,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const { eventType } = request.params;
        const eventId = parseInt(request.params.eventId, 10);
        if (!Number.isFinite(eventId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid event ID" });
        }

        const page = parseIntParam(request.query.page, 1);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 100);
        const skip = (page - 1) * limit;

        const where: any = { eventType, eventId };

        const [records, total] = await Promise.all([
          fastify.prisma.learningEventAttendance.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
          fastify.prisma.learningEventAttendance.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: records,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(
          error,
          "GET /learning/attendance/event/:eventType/:eventId failed"
        );
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch attendance records" });
      }
    }
  );
}
