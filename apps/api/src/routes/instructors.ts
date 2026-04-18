import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import { InstructorMatcher } from "../services/instructorMatcher";

// ============================================================================
// INSTRUCTOR ROUTES — Skills, availability, matching, assignment
// ============================================================================

const assignmentSchema = z.object({
  loadId: z.number().int().positive(),
  skillCode: z.string(),
  studentId: z.number().int().positive().optional(),
});

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isRecurring: z.boolean().default(true),
  specificDate: z.string().datetime().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "FREELANCE", "SEASONAL"]).optional(),
});

export async function instructorRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);
  const matcher = new InstructorMatcher(fastify.prisma);

  // List instructors with skills at this DZ
  fastify.get(
    "/instructors",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      // Find users who have instructor skills at this DZ
      // Query through instructorAvailability to scope by DZ
      const instructors = await fastify.prisma.user.findMany({
        where: {
          instructorSkills: { some: {} },
        },
        include: {
          instructorSkills: {
            include: { skillType: true },
          },
          instructorAvailability: {
            where: { dropzoneId },
          },
          userRoles: true,
        },
      });

      // Filter to those with availability at this DZ or who have DZ-scoped roles
      const dzInstructors = instructors.filter(
        (i) => i.instructorAvailability.length > 0 || i.userRoles.some((r: any) => r.dropzoneId === dropzoneId)
      );

      reply.send({
        success: true,
        data: dzInstructors.map((i) => ({
          userId: i.id,
          name: `${i.firstName} ${i.lastName}`,
          email: i.email,
          skills: i.instructorSkills.map((s) => ({
            code: s.skillType.code,
            name: s.skillType.name,
            rating: s.rating,
            certifiedAt: s.certifiedAt,
            expiresAt: s.expiresAt,
            isCurrent: !s.expiresAt || s.expiresAt > new Date(),
          })),
          availability: i.instructorAvailability.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isRecurring: a.isRecurring,
            specificDate: a.specificDate,
            employmentType: a.employmentType,
          })),
        })),
      });
    }
  );

  // Find available instructors for a skill on a date
  fastify.get(
    "/instructors/available",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const query = request.query as { skill?: string; date?: string };

      if (!query.skill) {
        reply.code(400).send({ success: false, error: "skill parameter required" });
        return;
      }

      const date = query.date ? new Date(query.date) : new Date();

      const candidates = await matcher.findMatches({
        dropzoneId,
        skillCode: query.skill,
        date,
      });

      reply.send({
        success: true,
        data: candidates,
      });
    }
  );

  // Auto-assign instructor to a load
  fastify.post(
    "/instructor-assignments",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = assignmentSchema.parse(request.body);

      const result = await matcher.assignBest({
        dropzoneId,
        skillCode: body.skillCode,
        date: new Date(),
        loadId: body.loadId,
        studentId: body.studentId,
      });

      if (!result.assigned) {
        reply.code(404).send({
          success: false,
          error: "No available instructor found with required skill and availability",
        });
        return;
      }

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "INSTRUCTOR_ASSIGN",
        entityType: "InstructorAssignment",
        entityId: result.assignmentId!,
        afterState: {
          instructorId: result.candidate!.userId,
          skillCode: body.skillCode,
          loadId: body.loadId,
          score: result.candidate!.score,
        },
      });

      fastify.broadcastToDropzone(dropzoneId.toString(), {
        type: "INSTRUCTOR_ASSIGNED",
        data: {
          loadId: body.loadId,
          instructorId: result.candidate!.userId,
          instructorName: result.candidate!.userName,
          skillCode: body.skillCode,
        },
      });

      reply.code(201).send({
        success: true,
        data: {
          assignmentId: result.assignmentId,
          instructor: result.candidate,
        },
      });
    }
  );

  // Set instructor availability
  fastify.post(
    "/instructors/availability",
    {
      preHandler: [
        authenticate,
        authorize(["TI", "AFFI", "COACH", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const userId = parseInt(String(request.user!.sub));
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = availabilitySchema.parse(request.body);

      const avail = await fastify.prisma.instructorAvailability.create({
        data: {
          userId,
          dropzoneId,
          dayOfWeek: body.dayOfWeek,
          startTime: body.startTime,
          endTime: body.endTime,
          isRecurring: body.isRecurring,
          specificDate: body.specificDate ? new Date(body.specificDate) : undefined,
          employmentType: body.employmentType as any,
        },
      });

      reply.code(201).send({ success: true, data: avail });
    }
  );

  // Get instructor workload summary
  fastify.get<{ Params: { instructorId: string } }>(
    "/instructors/:instructorId/workload",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      const instructorId = parseInt((request.params as any).instructorId);
      const dateParam = (request.query as any).date;
      const date = dateParam ? new Date(dateParam) : new Date();

      const workload = await matcher.getWorkloadSummary(instructorId, date);

      reply.send({ success: true, data: workload });
    }
  );
}
