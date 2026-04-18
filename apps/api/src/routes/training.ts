import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import { AuditService } from "../services/auditService";

// ============================================================================
// TRAINING ROUTES — AFF progression, evaluations, logbook, licenses
// ============================================================================

const affEvaluationSchema = z.object({
  level: z.number().int().min(1).max(8),
  passed: z.boolean(),
  evaluationNotes: z.string().optional(),
  videoUrl: z.string().url().optional(),
});

// logbookEntrySchema moved to routes/logbook.ts
const _legacyLogbookEntrySchema = z.object({
  jumpNumber: z.number().int().positive(),
  altitude: z.number().int().positive().optional(),
  freefallTime: z.number().int().positive().optional(),
  deploymentAltitude: z.number().int().positive().optional(),
  canopySize: z.number().int().positive().optional(),
  jumpType: z.string().optional(),
  notes: z.string().optional(),
  loadId: z.number().int().positive().optional(),
});

const licenseSchema = z.object({
  type: z.string(), // USPA, BPA, APF, etc.
  number: z.string(),
  level: z.enum(["A", "B", "C", "D", "STUDENT", "NONE"]),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  evidenceUrl: z.string().url().optional(),
});

export async function trainingRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // ── AFF PROGRESSION ────────────────────────────────────────────────

  // Get all AFF students at dropzone
  fastify.get(
    "/training/aff/students",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["AFFI", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      // Get all AFF records at this DZ with student and instructor info
      const records = await fastify.prisma.affRecord.findMany({
        where: { dropzoneId },
        include: {
          student: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          instructor: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Group by student
      const studentMap = new Map<number, any>();
      for (const record of records) {
        const studentId = record.studentId;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: String(record.student.user.id),
            name: `${record.student.user.firstName} ${record.student.user.lastName}`,
            records: [],
            lastJumpDate: record.createdAt,
            totalJumps: record.student.totalJumps,
          });
        }
        studentMap.get(studentId)!.records.push(record);
        // Track most recent date
        if (record.createdAt > studentMap.get(studentId)!.lastJumpDate) {
          studentMap.get(studentId)!.lastJumpDate = record.createdAt;
        }
      }

      // Calculate progression for each student
      const students = Array.from(studentMap.values()).map((s) => {
        const passedLevels = new Set(
          s.records.filter((r: any) => r.passed).map((r: any) => r.level)
        );
        const maxPassed = passedLevels.size > 0 ? Math.max(...Array.from(passedLevels) as number[]) : 0;
        const currentLevel = Math.min(maxPassed + 1, 8);
        const isGraduated = maxPassed >= 8;

        // Find the most recent instructor
        const latestRecord = s.records[0]; // already sorted desc
        const instructorName = `${latestRecord.instructor.firstName} ${latestRecord.instructor.lastName}`;

        // Determine status
        let status: string;
        if (isGraduated) {
          status = "passed";
        } else if (s.records.some((r: any) => !r.passed && r.level === currentLevel)) {
          status = "in-progress";
        } else if (passedLevels.size > 0) {
          status = "in-progress";
        } else {
          status = "in-progress";
        }

        return {
          id: s.id,
          name: s.name,
          level: isGraduated ? 8 : currentLevel,
          lastJumpDate: s.lastJumpDate.toISOString().split("T")[0],
          instructor: instructorName,
          status,
          progressPercent: Math.round((passedLevels.size / 8) * 100),
        };
      });

      reply.send({ success: true, data: students });
    }
  );

  // Get student AFF progression
  fastify.get<{ Params: { studentId: string } }>(
    "/training/aff/:studentId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["AFFI", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const studentId = parseInt((request.params as any).studentId);
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      // Get athlete record
      const athlete = await fastify.prisma.athlete.findUnique({
        where: { userId: studentId },
      });

      if (!athlete) throw new NotFoundError("Athlete");

      // Get all AFF records for this student at this DZ
      const records = await fastify.prisma.affRecord.findMany({
        where: {
          studentId: athlete.userId,
          dropzoneId,
        },
        include: {
          instructor: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ level: "asc" }, { createdAt: "desc" }],
      });

      // Build level progression map
      const levels: Record<number, any> = {};
      for (let i = 1; i <= 8; i++) {
        const levelRecords = records.filter((r) => r.level === i);
        const passed = levelRecords.find((r) => r.passed);
        levels[i] = {
          level: i,
          status: passed ? "PASSED" : levelRecords.length > 0 ? "IN_PROGRESS" : "NOT_STARTED",
          attempts: levelRecords.length,
          passedAt: passed?.createdAt ?? null,
          passedBy: passed
            ? `${passed.instructor.firstName} ${passed.instructor.lastName}`
            : null,
          history: levelRecords.map((r) => ({
            id: r.id,
            passed: r.passed,
            notes: r.evaluationNotes,
            videoUrl: r.videoUrl,
            instructor: `${r.instructor.firstName} ${r.instructor.lastName}`,
            date: r.createdAt,
          })),
        };
      }

      const currentLevel = Math.max(
        1,
        ...Object.entries(levels)
          .filter(([_, v]) => v.status === "PASSED")
          .map(([k]) => parseInt(k) + 1)
      );

      reply.send({
        success: true,
        data: {
          studentId,
          athleteId: athlete.id,
          totalJumps: athlete.totalJumps,
          currentLevel: Math.min(currentLevel, 8),
          isGraduated: currentLevel > 8,
          levels,
        },
      });
    }
  );

  // Submit AFF evaluation
  fastify.post<{ Params: { studentId: string } }>(
    "/training/aff/:studentId/evaluate",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["AFFI", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const studentId = parseInt((request.params as any).studentId);
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const instructorId = parseInt(String(request.user!.sub));
      const body = affEvaluationSchema.parse(request.body);

      const athlete = await fastify.prisma.athlete.findUnique({
        where: { userId: studentId },
      });
      if (!athlete) throw new NotFoundError("Athlete");

      const record = await fastify.prisma.affRecord.create({
        data: {
          studentId: athlete.userId,
          instructorId,
          dropzoneId,
          level: body.level,
          passed: body.passed,
          evaluationNotes: body.evaluationNotes,
          videoUrl: body.videoUrl,
        },
        include: {
          instructor: { select: { firstName: true, lastName: true } },
        },
      });

      // Update athlete total jumps
      await fastify.prisma.athlete.update({
        where: { userId: studentId },
        data: { totalJumps: { increment: 1 } },
      });

      await auditService.log({
        userId: instructorId,
        dropzoneId,
        action: "AFF_EVALUATE",
        entityType: "AffRecord",
        entityId: record.id,
        afterState: { level: body.level, passed: body.passed, studentId },
      });

      fastify.broadcastToDropzone(dropzoneId.toString(), {
        type: "AFF_EVALUATION",
        data: {
          studentId,
          level: body.level,
          passed: body.passed,
          instructorName: `${record.instructor.firstName} ${record.instructor.lastName}`,
        },
      });

      reply.code(201).send({ success: true, data: record });
    }
  );

  // ── LOGBOOK ────────────────────────────────────────────────────────
  // Logbook CRUD moved to routes/logbook.ts (full implementation with
  // stats, detail, update, delete endpoints)

  // ── LICENSES ───────────────────────────────────────────────────────

  // Get licenses for a user
  fastify.get(
    "/licenses",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = parseInt(String(request.user!.sub));

      const licenses = await fastify.prisma.license.findMany({
        where: { userId },
        orderBy: { issuedAt: "desc" },
      });

      reply.send({ success: true, data: licenses });
    }
  );

  // Add license
  fastify.post(
    "/licenses",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = parseInt(String(request.user!.sub));
      const body = licenseSchema.parse(request.body);

      const license = await fastify.prisma.license.create({
        data: {
          userId,
          type: body.type,
          number: body.number,
          level: body.level as any,
          issuedAt: new Date(body.issuedAt),
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          evidenceUrl: body.evidenceUrl,
        },
      });

      // Update athlete license level
      await fastify.prisma.athlete.updateMany({
        where: { userId },
        data: { licenseLevel: body.level as any },
      });

      reply.code(201).send({ success: true, data: license });
    }
  );

  // ── CURRENCY CHECK ─────────────────────────────────────────────────

  fastify.get(
    "/currency",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = parseInt(String(request.user!.sub));

      const { CurrencyEngine } = await import("../services/currencyEngine");
      const engine = new CurrencyEngine(fastify.prisma);
      const result = await engine.checkCurrency(userId);

      reply.send({ success: true, data: result });
    }
  );
}
