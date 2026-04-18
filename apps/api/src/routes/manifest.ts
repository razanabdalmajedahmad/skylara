import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import {
  NotFoundError,
  ValidationError,
  SafetyGateError,
  ConflictLoadError,
  ForbiddenError,
} from "../utils/errors";
import { SlotType, JumpType } from "@prisma/client";
import { AuditService } from "../services/auditService";
import {
  validateLoadTransition,
  LoadStatus,
  checkTransitionWithGates,
  getAvailableTransitions,
  isTimerState,
  getTimerConfig,
} from "../services/loadFsm";
import { performCgCheck } from "../services/cgCalculator";
import { ValidationGatesService } from "../services/validationGates";
import { assignExitOrder, computeExitOrder } from "../services/exitOrderAlgorithm";
import {
  evaluateRigStatus,
  checkManifestGate,
  processCompletedJumpForRig,
} from "../services/rigMaintenanceEngine";
import { publishRigStatusNotifications } from "../services/rigNotificationService";
import { WaitlistService } from "../services/waitlistService";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// SCHEMAS
// ============================================================================

const createLoadSchema = z.object({
  aircraftId: z.string(),
  pilotId: z.string().optional(),
  estimatedJumpersCount: z.number().int().positive().optional(),
  loadNumber: z.number().int().positive(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const transitionLoadSchema = z.object({
  toStatus: z.enum([
    "OPEN", "FILLING", "LOCKED", "THIRTY_MIN", "TWENTY_MIN",
    "TEN_MIN", "BOARDING", "AIRBORNE", "LANDED", "COMPLETE", "CANCELLED",
  ]),
  overrideGate: z.string().optional(),
  overrideReason: z.string().min(10, "Override reason must be at least 10 characters").optional(),
});

const addSlotSchema = z.object({
  userId: z.string(),
  slotType: z.string().default("FUN"),
  jumpType: z.string().optional(),
  position: z.number().int().positive().optional(),
  weight: z.number().positive(),
  instructorId: z.string().optional(),
  rigId: z.number().int().positive().optional(),
});

const cgCheckSchema = z.object({
  fuelWeight: z.number().positive().optional(),
});

const waitlistSchema = z.object({
  slotType: z.string(),
  loadId: z.number().int().positive().optional(),
});

const updateLoadSchema = z.object({
  notes: z.string().optional(),
  fuelWeight: z.number().positive().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function manifestRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);
  const { PolicyEngine } = await import("../services/policyEngine");
  const policyEngine = new PolicyEngine(fastify.prisma);
  const validationGates = new ValidationGatesService(fastify.prisma, policyEngine);
  const waitlistService = new WaitlistService(fastify.prisma);

  // ── Helper: get dropzoneId from user ───────────────────────────────

  function getDzId(request: any): number {
    const dzId = request.user?.dropzoneId
      ? parseInt(request.user.dropzoneId, 10)
      : null;
    if (!dzId) throw new NotFoundError("Dropzone");
    return dzId;
  }

  function getUserId(request: any): number {
    return parseInt(String(request.user.sub));
  }

  // ── LIST LOADS ─────────────────────────────────────────────────────

  fastify.get<{
    Querystring: { status?: string; date?: string; limit?: string; offset?: string };
  }>(
    "/loads",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const status = request.query.status as LoadStatus | undefined;
        const date = request.query.date;
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const query: any = { dropzoneId };
        if (status && (status as string) !== "all") {
          const statuses = status.split(",").map((s) => s.trim());
          query.status = statuses.length === 1 ? statuses[0] : { in: statuses };
        }
        if (date) {
          const dateObj = new Date(date);
          const nextDay = new Date(dateObj);
          nextDay.setDate(nextDay.getDate() + 1);
          query.scheduledAt = { gte: dateObj, lt: nextDay };
        }

        const [loads, total] = await Promise.all([
          fastify.prisma.load.findMany({
            where: query,
            include: {
              aircraft: true,
              slots: { include: { user: true }, orderBy: { position: "asc" } },
              cgChecks: { take: 1, orderBy: { createdAt: "desc" } },
            },
            orderBy: { scheduledAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.load.count({ where: query }),
        ]);

        return reply.code(200).send({
          success: true,
          data: loads.map((load) => ({
            id: load.id,
            uuid: load.uuid,
            loadNumber: load.loadNumber,
            status: load.status,
            aircraftId: load.aircraftId,
            aircraftRegistration: load.aircraft.registration,
            slotsCount: load.slots.length,
            maxCapacity: load.aircraft.maxCapacity,
            lastCgResult: load.cgChecks[0]?.result ?? null,
            availableTransitions: getAvailableTransitions(load.status),
            slots: load.slots.map((s) => ({
              id: s.id,
              position: s.position,
              userId: s.userId,
              userName: s.user ? `${s.user.firstName} ${s.user.lastName}` : "Unassigned",
              slotType: s.slotType,
              jumpType: s.jumpType,
              status: s.status,
              exitGroup: s.exitGroup,
              weight: s.weight,
            })),
            scheduledAt: load.scheduledAt,
            fuelWeight: load.fuelWeight,
            fuelCapacity: load.aircraft.fuelCapacity ?? null,
            fuelPercent: load.aircraft.fuelCapacity
              ? Math.round((load.fuelWeight / load.aircraft.fuelCapacity) * 100)
              : null,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.code(404).send({ success: false, error: error.message });
        }
        return reply.code(500).send({ success: false, error: "Failed to fetch loads" });
      }
    }
  );

  // ── CREATE LOAD ────────────────────────────────────────────────────

  fastify.post<{ Body: z.infer<typeof createLoadSchema> }>(
    "/loads",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const body = createLoadSchema.parse(request.body);
        const dropzoneId = getDzId(request);
        const aircraftId = parseInt(body.aircraftId);
        const pilotId = body.pilotId ? parseInt(body.pilotId) : getUserId(request);

        // Verify aircraft
        const aircraft = await fastify.prisma.aircraft.findUnique({ where: { id: aircraftId } });
        if (!aircraft || aircraft.dropzoneId !== dropzoneId) throw new NotFoundError("Aircraft");

        // Gate 10: Aircraft airworthiness
        const airworthinessCheck = await validationGates.checkAircraftAirworthiness(aircraftId);
        if (airworthinessCheck.status === "FAIL") {
          reply.code(403).send({
            success: false,
            error: airworthinessCheck.message,
            gate: "AIRCRAFT_AIRWORTHINESS",
          });
          return;
        }

        // Gate 9: Pilot duty
        const pilotCheck = await validationGates.checkPilotDuty(pilotId);
        if (pilotCheck.status === "FAIL") {
          reply.code(403).send({
            success: false,
            error: pilotCheck.message,
            gate: "PILOT_DUTY",
          });
          return;
        }

        const defaultBranch = await fastify.prisma.dzBranch.findFirst({
          where: { dropzoneId },
          orderBy: { isDefault: "desc" },
        });
        if (!defaultBranch) throw new NotFoundError("Branch");

        const load = await fastify.prisma.load.create({
          data: {
            uuid: uuidv4(),
            dropzoneId,
            branchId: defaultBranch.id,
            aircraftId,
            pilotId,
            loadNumber: body.loadNumber.toString(),
            status: LoadStatus.OPEN,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
            notes: body.notes,
          },
          include: { aircraft: true },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "LOAD_CREATE",
          entityType: "Load",
          entityId: load.id,
          afterState: { loadNumber: body.loadNumber, aircraftId, pilotId },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "LOAD_CREATED",
          data: {
            id: load.id,
            loadNumber: load.loadNumber,
            status: load.status,
            aircraftRegistration: load.aircraft.registration,
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            id: load.id,
            uuid: load.uuid,
            loadNumber: load.loadNumber,
            status: load.status,
            aircraftId: load.aircraftId,
            aircraftRegistration: load.aircraft.registration,
            availableTransitions: getAvailableTransitions(load.status),
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create load" });
        }
      }
    }
  );

  // ── GET LOAD DETAIL ────────────────────────────────────────────────

  fastify.get<{ Params: { loadId: string } }>(
    "/loads/:loadId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: {
            aircraft: true,
            slots: { include: { user: true }, orderBy: { position: "asc" } },
            cgChecks: { take: 3, orderBy: { createdAt: "desc" } },
            loadNotes: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        });

        if (!load) throw new NotFoundError("Load");

        reply.code(200).send({
          success: true,
          data: {
            id: load.id,
            uuid: load.uuid,
            loadNumber: load.loadNumber,
            status: load.status,
            aircraftId: load.aircraftId,
            aircraftRegistration: load.aircraft.registration,
            maxCapacity: load.aircraft.maxCapacity,
            fuelWeight: load.fuelWeight,
            fuelCapacity: load.aircraft.fuelCapacity ?? null,
            fuelPercent: load.aircraft.fuelCapacity
              ? Math.round((load.fuelWeight / load.aircraft.fuelCapacity) * 100)
              : null,
            availableTransitions: getAvailableTransitions(load.status),
            lastCgResult: load.cgChecks[0]?.result ?? null,
            lastCgCheck: load.cgChecks[0] ?? null,
            isTimerState: isTimerState(load.status),
            timerConfig: getTimerConfig(load.status),
            slots: load.slots.map((s) => ({
              id: s.id,
              position: s.position,
              userId: s.userId,
              userName: s.user ? `${s.user.firstName} ${s.user.lastName}` : "Unassigned",
              slotType: s.slotType,
              jumpType: s.jumpType,
              status: s.status,
              exitGroup: s.exitGroup,
              weight: s.weight,
            })),
            notes: load.loadNotes?.map((n: any) => ({
              id: n.id,
              content: n.content,
              createdAt: n.createdAt,
            })),
            scheduledAt: load.scheduledAt,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch load" });
        }
      }
    }
  );

  // ── TRANSITION LOAD STATUS (canonical endpoint) ────────────────────
  // POST /loads/:loadId/transition
  // Body: { toStatus: LoadStatus, overrideGate?: string, overrideReason?: string }
  // This is the ONLY endpoint for status changes. PUT/PATCH are for metadata only.

  fastify.post<{
    Params: { loadId: string };
    Body: z.infer<typeof transitionLoadSchema>;
  }>(
    "/loads/:loadId/transition",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "PILOT", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const body = transitionLoadSchema.parse(request.body);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: { slots: true },
        });

        if (!load) throw new NotFoundError("Load");

        const fromStatus = load.status;
        const toStatus = body.toStatus;

        // Step 1: Validate FSM transition
        validateLoadTransition(fromStatus, toStatus);

        // Step 2: Check blocking gates
        const gateResult = await checkTransitionWithGates(
          fastify.prisma,
          loadId,
          fromStatus,
          toStatus
        );

        if (!gateResult.allowed) {
          // Check if override is being attempted
          if (body.overrideGate && body.overrideReason) {
            // Verify user has override authority
            const userRoles = request.user.roles || [];
            const canOverride = gateResult.overrideRoles?.some((r) =>
              userRoles.includes(r)
            );

            if (!canOverride) {
              reply.code(403).send({
                success: false,
                error: `Gate ${gateResult.blockedByGate} blocked. Override requires: ${gateResult.overrideRoles?.join(", ")}`,
                blockedByGate: gateResult.blockedByGate,
                gateDescription: gateResult.gateDescription,
              });
              return;
            }

            // Log the override
            await fastify.prisma.overrideLog.create({
              data: {
                userId: getUserId(request),
                dropzoneId,
                action: gateResult.blockedByGate!,
                entityType: "Load",
                entityId: loadId,
                reason: body.overrideReason,
              },
            });

            await auditService.log({
              userId: getUserId(request),
              dropzoneId,
              action: "SAFETY_OVERRIDE",
              entityType: "Load",
              entityId: loadId,
              afterState: {
                gate: gateResult.blockedByGate,
                reason: body.overrideReason,
                fromStatus,
                toStatus,
              },
            });
          } else {
            // Blocked — no override attempted
            reply.code(409).send({
              success: false,
              error: `Transition blocked by ${gateResult.blockedByGate}`,
              blockedByGate: gateResult.blockedByGate,
              gateDescription: gateResult.gateDescription,
              canOverride: gateResult.canOverride,
              overrideRoles: gateResult.overrideRoles,
            });
            return;
          }
        }

        // Step 3: Side effects on specific transitions
        // FILLING → LOCKED: Auto-compute exit order
        if (toStatus === "LOCKED" && load.slots.length === 0) {
          throw new ConflictLoadError("Load must have at least one slot to lock");
        }

        const updated = await fastify.prisma.load.update({
          where: { id: loadId },
          data: { status: toStatus },
          include: { aircraft: true, slots: true },
        });

        // Post-transition side effects
        if (toStatus === "LOCKED") {
          // Assign exit order when load locks
          try {
            await assignExitOrder(fastify.prisma, loadId);
          } catch (err) {
            console.warn("Exit order assignment failed:", err);
          }
        }

        if (toStatus === "COMPLETE") {
          const completedAt = new Date();

          // --- Side effect 1: Auto-create logbook entries for each jumper ---
          for (const slot of updated.slots) {
            if (!slot.userId) continue;
            try {
              // Get athlete's current jump count to assign the next number
              const athlete = await fastify.prisma.athlete.findUnique({
                where: { userId: slot.userId },
              });
              const nextJumpNumber = (athlete?.totalJumps ?? 0) + 1;

              await fastify.prisma.logbookEntry.create({
                data: {
                  userId: slot.userId,
                  loadId,
                  dropzoneId,
                  jumpNumber: nextJumpNumber,
                  jumpType: slot.jumpType,
                  createdAt: completedAt,
                },
              });

              // Increment athlete total jumps
              if (athlete) {
                await fastify.prisma.athlete.update({
                  where: { userId: slot.userId },
                  data: {
                    totalJumps: { increment: 1 },
                    lastJumpDate: completedAt,
                  },
                });

                // --- Achievement auto-grant on jump milestones ---
                const JUMP_MILESTONES = [
                  { count: 1, name: "First Jump", title: "First Jump!" },
                  { count: 100, name: "Century Jumper", title: "100 Jumps" },
                  { count: 200, name: "200 Club", title: "200 Jumps" },
                  { count: 500, name: "500 Club", title: "500 Jumps" },
                  { count: 1000, name: "Grand Master", title: "1,000 Jumps" },
                ];
                const milestone = JUMP_MILESTONES.find(m => m.count === nextJumpNumber);
                if (milestone) {
                  try {
                    const prismaAny = fastify.prisma as any;
                    // Find or skip if achievement doesn't exist yet
                    const achievement = await prismaAny.achievement?.findFirst({
                      where: { name: milestone.name },
                    });
                    if (achievement) {
                      await prismaAny.athleteAchievement?.create({
                        data: {
                          userId: slot.userId,
                          achievementId: achievement.id,
                          context: { jumpNumber: nextJumpNumber, dropzoneId },
                        },
                      }).catch(() => {}); // unique constraint = already earned

                      await prismaAny.activityFeed?.create({
                        data: {
                          userId: slot.userId,
                          dropzoneId,
                          eventType: "ACHIEVEMENT",
                          entityType: "Achievement",
                          entityId: achievement.id,
                          summary: `Earned "${milestone.name}" — ${milestone.title}`,
                          visibility: "PUBLIC",
                        },
                      });
                    }

                    // Also create a milestone on their story
                    let story = await prismaAny.athleteStory?.findUnique({
                      where: { userId: slot.userId },
                    });
                    if (!story) {
                      story = await prismaAny.athleteStory?.create({
                        data: { userId: slot.userId },
                      });
                    }
                    if (story) {
                      await prismaAny.athleteMilestone?.create({
                        data: {
                          storyId: story.id,
                          type: milestone.count === 1 ? "FIRST_JUMP" : "JUMP_COUNT",
                          title: milestone.title,
                          achievedAt: completedAt,
                          jumpNumber: nextJumpNumber,
                        },
                      });
                    }
                  } catch (err) {
                    console.warn(`Achievement auto-grant failed for user ${slot.userId}:`, err);
                  }
                }
              }
            } catch (err) {
              console.warn(`Logbook entry failed for slot ${slot.id}, user ${slot.userId}:`, err);
            }
          }

          // --- Side effect 2: Publish load.complete to event outbox ---
          try {
            await fastify.prisma.eventOutbox.create({
              data: {
                eventType: "load.complete",
                aggregateType: "Load",
                aggregateId: loadId,
                tenantId: dropzoneId,
                payload: {
                  loadId,
                  dropzoneId,
                  slotCount: updated.slots.length,
                  completedAt: completedAt.toISOString(),
                },
                status: "PENDING",
              },
            });
          } catch (err) {
            console.warn("Event outbox write failed for load.complete:", err);
          }

          // --- Side effect 3: Rig maintenance counter increment + notifications ---
          for (const slot of updated.slots) {
            const slotAny = slot as any; // rigId available after Prisma generate
            if (slotAny.rigId && slot.userId) {
              try {
                const result = await processCompletedJumpForRig(
                  fastify.prisma,
                  slotAny.rigId,
                  slot.id,    // slotId used as jumpId
                  loadId,
                  slot.userId,
                  completedAt
                );

                // Fire notification if status escalated (DUE_SOON → DUE_NOW, etc.)
                try {
                  await publishRigStatusNotifications(
                    fastify.prisma,
                    fastify.notificationService,
                    slotAny.rigId,
                    result.previousStatus,
                    result.newStatus
                  );
                } catch (notifErr) {
                  console.warn(`Rig notification failed for rig ${slotAny.rigId}:`, notifErr);
                }
              } catch (err) {
                // Idempotency: unique constraint on (rigId, jumpId) prevents double-count.
                console.warn(`Rig jump hook failed for slot ${slot.id}, rig ${slotAny.rigId}:`, err);
              }
            }
          }
        }

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "LOAD_TRANSITION",
          entityType: "Load",
          entityId: loadId,
          beforeState: { status: fromStatus },
          afterState: { status: toStatus },
        });

        // Broadcast to all connected clients
        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "LOAD_STATUS_CHANGED",
          data: {
            loadId: load.id,
            fromStatus,
            toStatus,
            availableTransitions: getAvailableTransitions(toStatus),
            isTimerState: isTimerState(toStatus),
            timerConfig: getTimerConfig(toStatus),
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            id: updated.id,
            status: updated.status,
            fromStatus,
            toStatus,
            availableTransitions: getAvailableTransitions(toStatus),
            isTimerState: isTimerState(toStatus),
            timerConfig: getTimerConfig(toStatus),
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictLoadError) {
          reply.code(409).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to transition load" });
        }
      }
    }
  );

  // ── UPDATE LOAD (metadata only — not status) ──────────────────────

  fastify.patch<{
    Params: { loadId: string };
    Body: z.infer<typeof updateLoadSchema>;
  }>(
    "/loads/:loadId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const body = updateLoadSchema.parse(request.body);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) throw new NotFoundError("Load");

        const updated = await fastify.prisma.load.update({
          where: { id: loadId },
          data: {
            notes: body.notes !== undefined ? body.notes : load.notes,
            fuelWeight: body.fuelWeight !== undefined ? body.fuelWeight : load.fuelWeight,
          },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "LOAD_UPDATE",
          entityType: "Load",
          entityId: loadId,
          beforeState: { notes: load.notes, fuelWeight: load.fuelWeight },
          afterState: body,
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "LOAD_UPDATED",
          data: { id: updated.id, notes: updated.notes, fuelWeight: updated.fuelWeight },
        });

        reply.code(200).send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update load" });
        }
      }
    }
  );

  // ── DELETE LOAD ────────────────────────────────────────────────────

  fastify.delete<{ Params: { loadId: string } }>(
    "/loads/:loadId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) throw new NotFoundError("Load");

        // Cancel rather than hard-delete — preserve audit trail
        await fastify.prisma.load.update({
          where: { id: loadId },
          data: { status: "CANCELLED" },
        });

        // Cancel all slots
        await fastify.prisma.slot.updateMany({
          where: { loadId },
          data: { status: "CANCELLED" },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "LOAD_DELETE",
          entityType: "Load",
          entityId: loadId,
          beforeState: { status: load.status },
          afterState: { status: "CANCELLED" },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "LOAD_CANCELLED",
          data: { loadId },
        });

        reply.code(200).send({ success: true, data: { message: "Load cancelled" } });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to cancel load" });
        }
      }
    }
  );

  // ── ADD SLOT ───────────────────────────────────────────────────────

  fastify.post<{
    Params: { loadId: string };
    Body: z.infer<typeof addSlotSchema>;
  }>(
    "/loads/:loadId/slots",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN", "ATHLETE"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const body = addSlotSchema.parse(request.body);
        const loadId = parseInt((request.params as any).loadId);
        const userId = parseInt(body.userId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: { slots: true, aircraft: true },
        });
        if (!load) throw new NotFoundError("Load");

        // Can only add slots in OPEN or FILLING
        if (load.status !== LoadStatus.OPEN && load.status !== LoadStatus.FILLING) {
          throw new ConflictLoadError("Load is not open for manifesting");
        }

        // Check capacity
        if (load.aircraft.maxCapacity && load.slots.length >= load.aircraft.maxCapacity) {
          throw new ConflictLoadError("Load is at aircraft capacity");
        }

        // Verify user exists
        const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError("User");

        // Run compliance gates
        const compliance = await validationGates.checkCompliance(
          userId,
          dropzoneId,
          body.weight,
          body.slotType
        );

        const failed = compliance.gates.filter((g) => g.status === "FAIL");
        if (failed.length > 0) {
          reply.code(403).send({
            success: false,
            error: "Safety gates failed",
            failedGates: failed.map((g) => ({
              gate: g.gate,
              message: g.message,
              canOverride: g.canOverride,
              overrideRoles: g.overrideRoles,
            })),
          });
          return;
        }

        // Rig maintenance gate check — if a rig is specified, verify it's usable
        let rigWarnings: Array<{ componentType: string; reason: string }> = [];
        if (body.rigId) {
          try {
            const rigStatus = await evaluateRigStatus(fastify.prisma, body.rigId);
            const gate = checkManifestGate(rigStatus);
            if (!gate.allowed) {
              reply.code(403).send({
                success: false,
                error: "Rig is grounded — cannot manifest",
                rigStatus: rigStatus.overallStatus,
                blockers: gate.blockers,
              });
              return;
            }
            rigWarnings = gate.warnings;
          } catch {
            // Rig not found or evaluation failed — don't block, but don't attach rig
          }
        }

        // Assign next position if not specified
        const position = body.position ?? load.slots.length + 1;

        const slotData: any = {
          loadId,
          userId,
          position,
          weight: body.weight,
          slotType: body.slotType as SlotType,
          jumpType: body.jumpType as JumpType | undefined,
          status: "MANIFESTED",
        };
        if (body.rigId) slotData.rigId = body.rigId;

        const slot = await fastify.prisma.slot.create({
          data: slotData,
          include: { user: true },
        });

        // Auto-transition to FILLING if currently OPEN
        if (load.status === LoadStatus.OPEN) {
          await fastify.prisma.load.update({
            where: { id: loadId },
            data: { status: LoadStatus.FILLING },
          });
        }

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "SLOT_CREATE",
          entityType: "Slot",
          entityId: slot.id,
          afterState: {
            userId,
            position,
            slotType: body.slotType,
            jumpType: body.jumpType,
            weight: body.weight,
          },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "SLOT_ADDED",
          data: {
            loadId,
            slotId: slot.id,
            userId,
            userName: slot.user ? `${slot.user.firstName} ${slot.user.lastName}` : "Unassigned",
            slotType: slot.slotType,
            position: slot.position,
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            id: slot.id,
            userId: slot.userId,
            userName: slot.user ? `${slot.user.firstName} ${slot.user.lastName}` : "Unassigned",
            position: slot.position,
            slotType: slot.slotType,
            jumpType: slot.jumpType,
            status: slot.status,
            weight: slot.weight,
            compliance: compliance.gates,
            rigWarnings: rigWarnings.length > 0 ? rigWarnings : undefined,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictLoadError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to add slot" });
        }
      }
    }
  );

  // ── REMOVE SLOT ────────────────────────────────────────────────────

  fastify.delete<{ Params: { loadId: string; slotId: string } }>(
    "/loads/:loadId/slots/:slotId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);
        const slotId = parseInt((request.params as any).slotId);

        const slot = await fastify.prisma.slot.findFirst({
          where: { id: slotId, loadId, load: { dropzoneId } },
        });
        if (!slot) throw new NotFoundError("Slot");

        // Soft cancel rather than hard delete
        await fastify.prisma.slot.update({
          where: { id: slotId },
          data: { status: "CANCELLED" },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "SLOT_DELETE",
          entityType: "Slot",
          entityId: slotId,
          beforeState: { status: slot.status, userId: slot.userId },
          afterState: { status: "CANCELLED" },
        });

        // Try to promote from waitlist
        const promoted = await waitlistService.promoteNext(
          dropzoneId,
          loadId,
          slot.slotType
        );

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "SLOT_REMOVED",
          data: {
            loadId,
            slotId,
            slotType: slot.slotType,
            promotedFromWaitlist: promoted
              ? { userId: promoted.userId, userName: promoted.userName }
              : null,
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Slot removed",
            promotedFromWaitlist: promoted,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to remove slot" });
        }
      }
    }
  );

  // ── CG CHECK ───────────────────────────────────────────────────────
  // POST /loads/:loadId/cg-check — Perform and record a CG check

  fastify.post<{
    Params: { loadId: string };
    Body: z.infer<typeof cgCheckSchema>;
  }>(
    "/loads/:loadId/cg-check",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "PILOT", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);
        const body = cgCheckSchema.parse(request.body);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) throw new NotFoundError("Load");

        const result = await performCgCheck(
          fastify.prisma,
          loadId,
          getUserId(request),
          body.fuelWeight
        );

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "CG_CHECK",
          entityType: "Load",
          entityId: loadId,
          afterState: {
            result: result.result,
            totalWeight: result.totalWeight,
            calculatedCg: result.calculatedCg,
          },
        });

        // Broadcast CG result
        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "CG_CHECKED",
          data: {
            loadId,
            result: result.result,
            calculatedCg: result.calculatedCg,
            totalWeight: result.totalWeight,
            isOverweight: result.isOverweight,
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            checkId: result.checkId,
            result: result.result,
            totalWeight: result.totalWeight,
            calculatedCg: result.calculatedCg,
            forwardLimit: result.forwardLimit,
            aftLimit: result.aftLimit,
            isOverweight: result.isOverweight,
            weightMargin: result.weightMargin,
            cgMarginForward: result.cgMarginForward,
            cgMarginAft: result.cgMarginAft,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to perform CG check" });
        }
      }
    }
  );

  // ── GET CG STATUS ──────────────────────────────────────────────────

  fastify.get<{ Params: { loadId: string } }>(
    "/loads/:loadId/cg",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) throw new NotFoundError("Load");

        const checks = await fastify.prisma.cgCheck.findMany({
          where: { loadId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            performedBy: { select: { firstName: true, lastName: true } },
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            loadId,
            latestResult: checks[0]?.result ?? null,
            history: checks.map((c) => ({
              id: c.id,
              result: c.result,
              totalWeight: c.totalWeight,
              calculatedCg: c.calculatedCg,
              forwardLimit: c.forwardLimit,
              aftLimit: c.aftLimit,
              performedBy: c.performedBy
                ? `${c.performedBy.firstName} ${c.performedBy.lastName}`
                : "Unknown",
              createdAt: c.createdAt,
            })),
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to get CG data" });
        }
      }
    }
  );

  // ── PILOT CONFIRMATION (Expert Feedback §5) ────────────────────────
  // Aircraft planning is INDICATIVE until pilot confirms.

  fastify.post<{
    Params: { loadId: string };
    Body: { action: string; notes?: string; environmentalInputs?: any };
  }>(
    "/loads/:loadId/pilot-confirmation",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PILOT", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);
        const userId = getUserId(request);
        const { action, notes, environmentalInputs } = request.body;

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) throw new NotFoundError("Load");

        const statusMap: Record<string, string> = {
          confirm: "PILOT_CONFIRMED",
          request_review: "PILOT_REVIEW_REQUIRED",
          override: "PILOT_OVERRIDE_LOGGED",
        };

        const newStatus = statusMap[action];
        if (!newStatus) {
          reply.code(400).send({ success: false, error: `Invalid action "${action}". Use: confirm, request_review, override` });
          return;
        }

        const updated = await fastify.prisma.load.update({
          where: { id: loadId },
          data: {
            pilotConfirmationStatus: newStatus as any,
            pilotConfirmedAt: action === "confirm" || action === "override" ? new Date() : null,
            pilotConfirmedById: userId,
            pilotNotes: notes ?? null,
            environmentalInputs: environmentalInputs ?? undefined,
          },
        });

        await auditService.log({
          userId,
          dropzoneId,
          action: action === "override" ? "SAFETY_OVERRIDE" : "LOAD_UPDATE",
          entityType: "Load",
          entityId: loadId,
          beforeState: { pilotConfirmationStatus: (load as any).pilotConfirmationStatus },
          afterState: { pilotConfirmationStatus: newStatus, notes },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "PILOT_CONFIRMATION_CHANGED",
          data: { loadId, pilotConfirmationStatus: newStatus },
        });

        reply.send({ success: true, data: { loadId, pilotConfirmationStatus: newStatus, pilotConfirmedAt: updated.pilotConfirmedAt } });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update pilot confirmation" });
        }
      }
    }
  );

  // GET /loads/:loadId/planning-status — Get planning estimate with pilot confirmation state
  fastify.get<{ Params: { loadId: string } }>(
    "/loads/:loadId/planning-status",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: { aircraft: true, slots: true, cgChecks: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        if (!load) throw new NotFoundError("Load");

        const latestCg = load.cgChecks[0] ?? null;
        const warningText = await policyEngine.resolve<string>(
          "aircraft.planningLabelText",
          { dropzoneId },
          "Operational estimate only. Final suitability depends on aircraft-specific charts, conditions, and pilot review."
        );

        reply.send({
          success: true,
          data: {
            loadId,
            pilotConfirmationStatus: (load as any).pilotConfirmationStatus ?? "INDICATIVE",
            pilotConfirmedAt: (load as any).pilotConfirmedAt,
            pilotNotes: (load as any).pilotNotes,
            environmentalInputs: (load as any).environmentalInputs,
            warningText,
            estimate: {
              totalWeight: load.currentWeight,
              fuelWeight: load.fuelWeight,
              cgPosition: load.cgPosition,
              latestCgResult: latestCg?.result ?? null,
              aircraftMaxWeight: load.aircraft.maxWeight,
              aircraftEmptyWeight: load.aircraft.emptyWeight,
              slotCount: load.slots.length,
            },
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to get planning status" });
        }
      }
    }
  );

  // ── EXIT ORDER ─────────────────────────────────────────────────────

  fastify.get<{ Params: { loadId: string } }>(
    "/loads/:loadId/exit-order",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) throw new NotFoundError("Load");

        const exitOrder = await computeExitOrder(fastify.prisma, loadId);

        reply.code(200).send({
          success: true,
          data: exitOrder,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to compute exit order" });
        }
      }
    }
  );

  // ── COMPLIANCE CHECK (check-in grid) ───────────────────────────────

  fastify.get<{ Params: { jumperId: string } }>(
    "/jumpers/:jumperId/compliance",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN", "TI", "AFFI"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const jumperId = parseInt((request.params as any).jumperId);

        const compliance = await validationGates.checkCompliance(jumperId, dropzoneId);

        reply.code(200).send({
          success: true,
          data: compliance,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to check compliance" });
        }
      }
    }
  );

  // ── WAITLIST ───────────────────────────────────────────────────────

  fastify.post<{ Body: z.infer<typeof waitlistSchema> }>(
    "/waitlist",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ATHLETE", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const body = waitlistSchema.parse(request.body);

        const entry = await waitlistService.addToWaitlist(
          getUserId(request),
          dropzoneId,
          body.slotType,
          body.loadId
        );

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "WAITLIST_ADDED",
          data: { userId: entry.userId, slotType: entry.slotType, priority: entry.priority },
        });

        reply.code(201).send({ success: true, data: entry });
      } catch (error) {
        if (error instanceof ConflictLoadError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to join waitlist" });
        }
      }
    }
  );

  fastify.get(
    "/waitlist",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = (request.query as any).loadId
          ? parseInt((request.query as any).loadId)
          : undefined;

        const entries = await waitlistService.getWaitlist(dropzoneId, loadId);

        reply.code(200).send({ success: true, data: entries });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch waitlist" });
      }
    }
  );

  // ── QUEUE ALIAS (dashboard calls /queue) ──
  fastify.get(
    "/queue",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = getDzId(request);
      const limit = parseInt((request.query as any).limit || "20");
      const entries = await waitlistService.getWaitlist(dropzoneId);
      reply.send({ success: true, data: entries.slice(0, limit) });
    }
  );

  // ── LOCK LOAD (convenience — same as POST /transition with toStatus=LOCKED) ──

  fastify.post<{ Params: { loadId: string } }>(
    "/loads/:loadId/lock",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: { slots: true },
        });
        if (!load) throw new NotFoundError("Load");

        if (load.slots.length === 0) {
          throw new ConflictLoadError("Load must have at least one slot to lock");
        }

        validateLoadTransition(load.status, LoadStatus.LOCKED);

        const locked = await fastify.prisma.load.update({
          where: { id: loadId },
          data: { status: LoadStatus.LOCKED },
        });

        // Assign exit order
        try {
          await assignExitOrder(fastify.prisma, loadId);
        } catch (err) {
          console.warn("Exit order assignment failed:", err);
        }

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "LOAD_LOCK",
          entityType: "Load",
          entityId: loadId,
          beforeState: { status: load.status },
          afterState: { status: "LOCKED" },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "LOAD_LOCKED",
          data: { loadId },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Load locked",
            status: locked.status,
            availableTransitions: getAvailableTransitions(locked.status),
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictLoadError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to lock load" });
        }
      }
    }
  );

  // ── MANIFEST GROUP ─────────────────────────────────────────────────

  fastify.post<{
    Params: { loadId: string };
    Body: { userIds: string[]; slotType?: string; jumpType?: string };
  }>(
    "/loads/:loadId/manifest-group",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const loadId = parseInt((request.params as any).loadId);
        const body = request.body as { userIds: string[]; slotType?: string; jumpType?: string };

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: { slots: true },
        });
        if (!load) throw new NotFoundError("Load");

        const created: any[] = [];
        const failed: any[] = [];
        let position = load.slots.length + 1;

        for (const userIdStr of body.userIds) {
          const userId = parseInt(userIdStr);
          const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
          if (!user) {
            failed.push({ userId, reason: "User not found" });
            continue;
          }

          // Run compliance
          const compliance = await validationGates.checkCompliance(userId, dropzoneId);
          const failedGates = compliance.gates.filter((g) => g.status === "FAIL");
          if (failedGates.length > 0) {
            failed.push({
              userId,
              userName: `${user.firstName} ${user.lastName}`,
              gates: failedGates.map((g) => g.gate),
            });
            continue;
          }

          const slot = await fastify.prisma.slot.create({
            data: {
              loadId,
              userId,
              position,
              weight: 200, // Default — should be provided
              slotType: (body.slotType || "FUN") as SlotType,
              jumpType: body.jumpType as JumpType | undefined,
              status: "MANIFESTED",
            },
            include: { user: true },
          });

          created.push(slot);
          position++;
        }

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "MANIFEST_GROUP",
          entityType: "Load",
          entityId: loadId,
          afterState: { created: created.length, failed: failed.length },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "GROUP_MANIFESTED",
          data: { loadId, slotsCreated: created.length },
        });

        reply.code(201).send({
          success: true,
          data: {
            slotsCreated: created.length,
            failed,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to manifest group" });
        }
      }
    }
  );

  // ── MANIFEST READINESS BOARD ─────────────────────────────────────────
  // Bulk readiness check for all jumpers on active loads

  fastify.get(
    "/manifest/readiness",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);

        // Get all active loads with their slots and users
        const activeLoads = await fastify.prisma.load.findMany({
          where: {
            dropzoneId,
            status: { notIn: ["COMPLETE", "CANCELLED"] },
          },
          include: {
            slots: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            aircraft: {
              select: { registration: true, maxCapacity: true },
            },
          },
          orderBy: { scheduledAt: "asc" },
        });

        // Check compliance for each unique user across all loads
        const userIds = new Set<number>();
        for (const load of activeLoads) {
          for (const slot of load.slots) {
            if (slot.userId) userIds.add(slot.userId);
          }
        }

        const complianceMap: Record<number, any> = {};
        const complianceChecks = Array.from(userIds).map(async (userId) => {
          try {
            const result = await validationGates.checkCompliance(userId, dropzoneId);
            complianceMap[userId] = result;
          } catch {
            complianceMap[userId] = { allPassed: false, gates: [{ gate: "ERROR", status: "FAIL", message: "Compliance check failed" }] };
          }
        });
        await Promise.all(complianceChecks);

        // Build readiness board
        const board = activeLoads.map((load) => {
          const slots = load.slots.map((slot) => {
            const compliance = slot.userId ? complianceMap[slot.userId] : null;
            const failedGates = compliance?.gates?.filter((g: any) => g.status === "FAIL") || [];
            const warningGates = compliance?.gates?.filter((g: any) => g.status === "WARNING") || [];

            let readinessState = "ready";
            if (failedGates.length > 0) {
              const issues = failedGates.map((g: any) => g.gate);
              if (issues.includes("WAIVER")) readinessState = "missing_waiver";
              else if (issues.includes("LICENSE")) readinessState = "missing_documents";
              else if (issues.includes("WEIGHT")) readinessState = "blocked";
              else if (issues.includes("MEDICAL")) readinessState = "medical_review_needed";
              else readinessState = "review_needed";
            } else if (warningGates.length > 0) {
              readinessState = "review_needed";
            }

            return {
              slotId: slot.id,
              position: slot.position,
              userId: slot.userId,
              userName: slot.user ? `${slot.user.firstName} ${slot.user.lastName}` : "Unknown",
              slotType: slot.slotType,
              weight: slot.weight,
              readinessState,
              failedGates: failedGates.map((g: any) => ({ gate: g.gate, message: g.message, canOverride: g.canOverride })),
              warningGates: warningGates.map((g: any) => ({ gate: g.gate, message: g.message })),
            };
          });

          const readyCount = slots.filter((s) => s.readinessState === "ready").length;
          const blockedCount = slots.filter((s) => s.readinessState !== "ready").length;

          return {
            loadId: load.id,
            loadNumber: load.loadNumber,
            status: load.status,
            aircraft: load.aircraft?.registration || "Unknown",
            capacity: load.aircraft?.maxCapacity || 0,
            scheduledAt: load.scheduledAt,
            slots,
            readyCount,
            blockedCount,
            fillPercent: load.aircraft?.maxCapacity ? Math.round((slots.length / load.aircraft.maxCapacity) * 100) : 0,
          };
        });

        // Summary stats
        const totalSlots = board.reduce((sum, l) => sum + l.slots.length, 0);
        const totalReady = board.reduce((sum, l) => sum + l.readyCount, 0);
        const totalBlocked = board.reduce((sum, l) => sum + l.blockedCount, 0);

        reply.code(200).send({
          success: true,
          data: {
            board,
            summary: {
              activeLoads: board.length,
              totalSlots,
              totalReady,
              totalBlocked,
              readinessPercent: totalSlots > 0 ? Math.round((totalReady / totalSlots) * 100) : 100,
            },
          },
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to compute readiness board" });
      }
    }
  );

  // ── DASHBOARD STATS — quick KPIs for operator dashboard ──────────────

  fastify.get(
    "/manifest/dashboard-stats",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const [activeLoads, completedToday, totalJumpers, waitlistCount, todayRevenue] = await Promise.all([
          fastify.prisma.load.count({ where: { dropzoneId, status: { notIn: ["COMPLETE", "CANCELLED"] as any } } }),
          fastify.prisma.load.count({ where: { dropzoneId, status: "COMPLETE" as any, updatedAt: { gte: todayStart } } }),
          fastify.prisma.slot.count({ where: { load: { dropzoneId, status: { notIn: ["COMPLETE", "CANCELLED"] as any } } } }),
          fastify.prisma.waitlistEntry.count({ where: { dropzoneId, claimedAt: null } }).catch(() => 0),
          // Aggregate today's revenue from completed transactions
          fastify.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              type: "DEBIT",
              createdAt: { gte: todayStart },
              wallet: { dropzoneId },
            },
          }).then(r => Math.abs(r._sum.amount || 0) / 100).catch(() => 0),
        ]);

        const utilization = activeLoads > 0 ? Math.round((totalJumpers / (activeLoads * 15)) * 100) : 0;

        reply.send({
          success: true,
          data: {
            todayRevenue,
            activeLoads,
            totalJumpers,
            waitlistCount,
            utilization: Math.min(utilization, 100),
            complianceAlerts: 0,
            weatherStatus: "Clear",
            completedToday,
          },
        });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to compute dashboard stats" });
      }
    }
  );

  // ── MANIFEST INSIGHTS ────────────────────────────────────────────────
  // Daily operational summary and manifest intelligence

  fastify.get(
    "/manifest/insights",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

        const [
          todayLoads,
          completedLoads,
          todaySlots,
          todayBookings,
          queueCount,
          tandemCount,
          studentCount,
        ] = await Promise.all([
          fastify.prisma.load.count({
            where: { dropzoneId, createdAt: { gte: todayStart, lte: todayEnd } },
          }),
          fastify.prisma.load.count({
            where: { dropzoneId, status: "COMPLETE" as any, updatedAt: { gte: todayStart } },
          }),
          fastify.prisma.slot.count({
            where: { load: { dropzoneId, status: "COMPLETE" as any, updatedAt: { gte: todayStart } } },
          }),
          fastify.prisma.booking.count({
            where: { dropzoneId, scheduledDate: { gte: todayStart, lte: todayEnd } },
          }),
          fastify.prisma.waitlistEntry.count({
            where: { dropzoneId, claimedAt: null },
          }).catch(() => 0),
          fastify.prisma.slot.count({
            where: { load: { dropzoneId, status: { notIn: ["COMPLETE", "CANCELLED"] as any } }, slotType: "TANDEM_PASSENGER" as any },
          }),
          fastify.prisma.slot.count({
            where: { load: { dropzoneId, status: { notIn: ["COMPLETE", "CANCELLED"] as any } }, slotType: "AFF_STUDENT" as any },
          }),
        ]);

        // Compute active load fill rates
        const activeLoadsRaw = await fastify.prisma.load.findMany({
          where: { dropzoneId, status: { notIn: ["COMPLETE", "CANCELLED"] as any } },
          include: {
            aircraft: { select: { registration: true, maxCapacity: true } },
            _count: { select: { slots: true } },
          },
        });

        const activeLoads = activeLoadsRaw.map((l) => ({
          id: l.id,
          loadNumber: l.loadNumber,
          status: l.status,
          aircraftRegistration: l.aircraft.registration,
          maxCapacity: l.aircraft.maxCapacity,
          _count: l._count,
        }));

        const underfilled = activeLoads.filter(
          (l) => l._count.slots < (l.maxCapacity || 14) * 0.5 && ["FILLING", "OPEN"].includes(l.status)
        );

        // Build insights
        const insights: { type: string; title: string; description: string; priority: string; route?: string }[] = [];

        if (underfilled.length > 0) {
          insights.push({
            type: "underfill",
            title: `${underfilled.length} load${underfilled.length > 1 ? "s" : ""} under 50% capacity`,
            description: underfilled.map((l) => `Load ${l.loadNumber} (${l.aircraftRegistration}): ${l._count.slots}/${l.maxCapacity}`).join(", "),
            priority: "MEDIUM",
            route: "/dashboard/manifest",
          });
        }

        if (queueCount > 5) {
          insights.push({
            type: "queue",
            title: `${queueCount} jumpers in queue`,
            description: "Consider opening additional loads to reduce wait times",
            priority: "HIGH",
            route: "/dashboard/manifest",
          });
        }

        if (tandemCount > 0) {
          insights.push({
            type: "tandems",
            title: `${tandemCount} tandems on active loads`,
            description: "Ensure tandem instructors are assigned and media is coordinated",
            priority: "LOW",
            route: "/dashboard/manifest",
          });
        }

        reply.code(200).send({
          success: true,
          data: {
            summary: {
              todayLoads,
              completedLoads,
              todayJumps: todaySlots,
              todayBookings,
              queueLength: queueCount,
              activeTandems: tandemCount,
              activeStudents: studentCount,
              underfillCount: underfilled.length,
            },
            activeLoads: activeLoads.map((l) => ({
              loadNumber: l.loadNumber,
              status: l.status,
              aircraft: l.aircraftRegistration,
              filled: l._count.slots,
              capacity: l.maxCapacity,
              fillPercent: l.maxCapacity ? Math.round((l._count.slots / l.maxCapacity) * 100) : 0,
            })),
            insights,
          },
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to compute insights" });
      }
    }
  );

  // ========================================================================
  // SELF-MANIFEST — One-tap athlete join (Gap Spec §5.2)
  // ========================================================================
  // Athlete calls this to join the next available load in one step.
  // System: finds best load → runs all safety gates → assigns slot → confirms.
  // Does NOT bypass any deterministic safety gate.

  const selfManifestSchema = z.object({
    slotType: z.string().default("FUN"),
    weight: z.number().positive(),
    jumpType: z.string().optional(),
    rigId: z.number().int().positive().optional(),
    preferredLoadId: z.number().int().positive().optional(),
  });

  fastify.post<{ Body: z.infer<typeof selfManifestSchema> }>(
    "/self-manifest",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ATHLETE", "COACH", "TI", "AFFI", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const dropzoneId = getDzId(request);
        const userId = getUserId(request);
        const body = selfManifestSchema.parse(request.body);

        // Step 1: Run all safety gates BEFORE finding a load
        const compliance = await validationGates.checkCompliance(
          userId,
          dropzoneId,
          body.weight,
          body.slotType
        );

        if (!compliance.allPassed) {
          const failures = compliance.gates.filter(g => g.status === "FAIL");
          reply.code(403).send({
            success: false,
            error: "Safety gates not passed",
            gates: failures,
          });
          return;
        }

        // Step 2: Find the best available load
        let targetLoad: any = null;

        if (body.preferredLoadId) {
          // Athlete requested a specific load
          targetLoad = await fastify.prisma.load.findFirst({
            where: {
              id: body.preferredLoadId,
              dropzoneId,
              status: { in: ["OPEN", "FILLING"] },
            },
            include: {
              aircraft: { select: { maxCapacity: true } },
              _count: { select: { slots: true } },
            },
          });
        }

        if (!targetLoad) {
          // Find first open load with capacity
          const candidates = await fastify.prisma.load.findMany({
            where: {
              dropzoneId,
              status: { in: ["OPEN", "FILLING"] },
            },
            include: {
              aircraft: { select: { maxCapacity: true } },
              _count: { select: { slots: true } },
            },
            orderBy: { scheduledAt: "asc" },
          });

          targetLoad = candidates.find(
            (l) => l._count.slots < (l.aircraft.maxCapacity || 999)
          );
        }

        if (!targetLoad) {
          // No available load — offer waitlist
          reply.code(200).send({
            success: false,
            error: "No loads available with capacity",
            suggestion: "JOIN_WAITLIST",
            message: "All loads are full. Would you like to join the waitlist?",
          });
          return;
        }

        // Step 3: Check load-level capacity
        if (targetLoad._count.slots >= (targetLoad.aircraft.maxCapacity || 999)) {
          reply.code(200).send({
            success: false,
            error: "Selected load is full",
            suggestion: "JOIN_WAITLIST",
          });
          return;
        }

        // Step 4: Assign slot
        const nextPosition = targetLoad._count.slots + 1;
        const slot = await fastify.prisma.slot.create({
          data: {
            loadId: targetLoad.id,
            userId,
            slotType: body.slotType as any,
            jumpType: (body.jumpType as any) || "FUN",
            position: nextPosition,
            status: "MANIFESTED",
            weight: body.weight,
            rigId: body.rigId ?? undefined,
            price: 0, // Price computed by payments module
            currency: "USD",
          } as any,
        });

        // Update load slot count
        await fastify.prisma.load.update({
          where: { id: targetLoad.id },
          data: {
            slotCount: { increment: 1 },
            currentWeight: { increment: body.weight },
            // Auto-transition from OPEN to FILLING
            status: targetLoad.status === "OPEN" ? "FILLING" : undefined,
          },
        });

        // Broadcast
        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "SELF_MANIFEST_JOINED",
          data: {
            loadId: targetLoad.id,
            loadNumber: targetLoad.loadNumber,
            userId,
            slotType: body.slotType,
            position: nextPosition,
          },
        });

        await auditService.log({
          userId,
          dropzoneId,
          action: "SELF_MANIFEST",
          entityType: "Slot",
          entityId: slot.id,
          afterState: {
            loadId: targetLoad.id,
            loadNumber: targetLoad.loadNumber,
            slotType: body.slotType,
            weight: body.weight,
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            slotId: slot.id,
            loadId: targetLoad.id,
            loadNumber: targetLoad.loadNumber,
            position: nextPosition,
            status: "MANIFESTED",
            complianceGates: compliance.gates.map(g => ({
              gate: g.gate,
              status: g.status,
            })),
          },
        });
      } catch (error) {
        if (error instanceof SafetyGateError) {
          reply.code(403).send({ success: false, error: error.message, gate: error.gate });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          fastify.log.error(error);
          reply.code(500).send({ success: false, error: "Self-manifest failed" });
        }
      }
    }
  );

  // ========================================================================
  // WAITLIST CLAIM LIFECYCLE (Phase 2 — timed claims)
  // ========================================================================

  // POST /waitlist/:id/confirm — athlete confirms a waitlist offer
  fastify.post<{ Params: { id: string } }>(
    "/waitlist/:id/confirm",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ATHLETE", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const entryId = parseInt(request.params.id);
        const userId = getUserId(request);

        const claimed = await waitlistService.confirmClaim(entryId, userId);

        fastify.broadcastToDropzone(getDzId(request).toString(), {
          type: "WAITLIST_CLAIMED",
          data: { userId: claimed.userId, slotType: claimed.slotType, loadId: claimed.loadId },
        });

        reply.send({ success: true, data: claimed });
      } catch (error) {
        if (error instanceof ConflictLoadError) {
          reply.code(409).send({ success: false, error: error.message });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to confirm claim" });
        }
      }
    }
  );

  // POST /waitlist/expire-offers — expire unclaimed offers and rotate (staff action or cron)
  fastify.post(
    "/waitlist/expire-offers",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const result = await waitlistService.expireUnclaimedOffers(dropzoneId);

        if (result.expired > 0) {
          fastify.broadcastToDropzone(dropzoneId.toString(), {
            type: "WAITLIST_OFFERS_EXPIRED",
            data: { expired: result.expired, rotated: result.rotated.length },
          });
        }

        reply.send({ success: true, data: result });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to expire offers" });
      }
    }
  );

  // DELETE /waitlist/:id — remove self from waitlist
  fastify.delete<{ Params: { id: string } }>(
    "/waitlist/:id",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ATHLETE", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const entryId = parseInt(request.params.id);
        const userId = getUserId(request);

        await waitlistService.removeFromWaitlist(entryId, userId);
        reply.send({ success: true });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to remove from waitlist" });
        }
      }
    }
  );

  // ============================================================================
  // GROUP ROUTES
  // ============================================================================

  const createGroupSchema = z.object({
    name: z.string().min(1).max(255),
    captainId: z.number().int().positive(),
    groupType: z.enum(["RW", "FREEFLY", "ANGLE", "WINGSUIT", "COACHING", "TANDEM_CAMERA", "AFF", "CRW"]),
    isTemplate: z.boolean().optional().default(false),
  });

  const updateGroupSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    groupType: z.enum(["RW", "FREEFLY", "ANGLE", "WINGSUIT", "COACHING", "TANDEM_CAMERA", "AFF", "CRW"]).optional(),
  });

  const addGroupMemberSchema = z.object({
    userId: z.number().int().positive(),
    role: z.enum(["CAPTAIN", "MEMBER"]).optional().default("MEMBER"),
  });

  const createLoadNoteSchema = z.object({
    content: z.string().min(1).max(2000),
  });

  // ── LIST GROUPS ──────────────────────────────────────────────────────

  fastify.get<{
    Querystring: { isTemplate?: string };
  }>(
    "/groups",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const isTemplateParam = request.query.isTemplate;
        const where: any = { dropzoneId };
        if (isTemplateParam !== undefined) {
          where.isTemplate = isTemplateParam === "true";
        }

        const groups = await fastify.prisma.group.findMany({
          where,
          include: {
            captain: { select: { id: true, firstName: true, lastName: true } },
            members: {
              include: { user: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        reply.code(200).send({
          success: true,
          data: groups.map((g) => ({
            id: g.id,
            name: g.name,
            groupType: g.groupType,
            isTemplate: g.isTemplate,
            captainId: g.captainId,
            captainName: g.captain ? `${g.captain.firstName} ${g.captain.lastName}` : null,
            memberCount: g.members.length,
            members: g.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              userName: m.user ? `${m.user.firstName} ${m.user.lastName}` : null,
              role: m.role,
              status: m.status,
            })),
            createdAt: g.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch groups" });
      }
    }
  );

  // ── CREATE GROUP ─────────────────────────────────────────────────────

  fastify.post<{ Body: z.infer<typeof createGroupSchema> }>(
    "/groups",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const body = createGroupSchema.parse(request.body);

        const group = await fastify.prisma.group.create({
          data: {
            dropzoneId,
            name: body.name,
            captainId: body.captainId,
            groupType: body.groupType,
            isTemplate: body.isTemplate,
          },
          include: {
            captain: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "GROUP_CREATE",
          entityType: "Group",
          entityId: group.id,
          afterState: { name: body.name, groupType: body.groupType, captainId: body.captainId },
        });

        reply.code(201).send({ success: true, data: group });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: error.errors });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create group" });
        }
      }
    }
  );

  // ── GET GROUP ────────────────────────────────────────────────────────

  fastify.get<{ Params: { groupId: string } }>(
    "/groups/:groupId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const groupId = parseInt(request.params.groupId);

        const group = await fastify.prisma.group.findFirst({
          where: { id: groupId, dropzoneId },
          include: {
            captain: { select: { id: true, firstName: true, lastName: true } },
            members: {
              include: { user: { select: { id: true, firstName: true, lastName: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!group) {
          reply.code(404).send({ success: false, error: "Group not found" });
          return;
        }

        reply.code(200).send({
          success: true,
          data: {
            id: group.id,
            name: group.name,
            groupType: group.groupType,
            isTemplate: group.isTemplate,
            captainId: group.captainId,
            captainName: group.captain ? `${group.captain.firstName} ${group.captain.lastName}` : null,
            members: group.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              userName: m.user ? `${m.user.firstName} ${m.user.lastName}` : null,
              role: m.role,
              status: m.status,
              createdAt: m.createdAt,
            })),
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
          },
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch group" });
      }
    }
  );

  // ── UPDATE GROUP ─────────────────────────────────────────────────────

  fastify.patch<{ Params: { groupId: string }; Body: z.infer<typeof updateGroupSchema> }>(
    "/groups/:groupId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const groupId = parseInt(request.params.groupId);
        const body = updateGroupSchema.parse(request.body);

        const existing = await fastify.prisma.group.findFirst({
          where: { id: groupId, dropzoneId },
        });
        if (!existing) {
          reply.code(404).send({ success: false, error: "Group not found" });
          return;
        }

        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.groupType !== undefined) updateData.groupType = body.groupType;

        const group = await fastify.prisma.group.update({
          where: { id: groupId },
          data: updateData,
          include: {
            captain: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "GROUP_UPDATE",
          entityType: "Group",
          entityId: groupId,
          beforeState: { name: existing.name, groupType: existing.groupType },
          afterState: updateData,
        });

        reply.code(200).send({ success: true, data: group });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: error.errors });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update group" });
        }
      }
    }
  );

  // ── ADD GROUP MEMBER ─────────────────────────────────────────────────

  fastify.post<{ Params: { groupId: string }; Body: z.infer<typeof addGroupMemberSchema> }>(
    "/groups/:groupId/members",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const groupId = parseInt(request.params.groupId);
        const body = addGroupMemberSchema.parse(request.body);

        const group = await fastify.prisma.group.findFirst({
          where: { id: groupId, dropzoneId },
        });
        if (!group) {
          reply.code(404).send({ success: false, error: "Group not found" });
          return;
        }

        const existingMember = await fastify.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: body.userId } },
        });
        if (existingMember) {
          reply.code(409).send({ success: false, error: "User is already a member of this group" });
          return;
        }

        const member = await fastify.prisma.groupMember.create({
          data: {
            groupId,
            userId: body.userId,
            role: body.role,
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "GROUP_MEMBER_ADD",
          entityType: "GroupMember",
          entityId: member.id,
          afterState: { groupId, userId: body.userId, role: body.role },
        });

        reply.code(201).send({ success: true, data: member });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: error.errors });
        } else {
          reply.code(500).send({ success: false, error: "Failed to add member to group" });
        }
      }
    }
  );

  // ── REMOVE GROUP MEMBER ──────────────────────────────────────────────

  fastify.delete<{ Params: { groupId: string; memberId: string } }>(
    "/groups/:groupId/members/:memberId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const groupId = parseInt(request.params.groupId);
        const memberId = parseInt(request.params.memberId);

        const group = await fastify.prisma.group.findFirst({
          where: { id: groupId, dropzoneId },
        });
        if (!group) {
          reply.code(404).send({ success: false, error: "Group not found" });
          return;
        }

        const member = await fastify.prisma.groupMember.findFirst({
          where: { id: memberId, groupId },
        });
        if (!member) {
          reply.code(404).send({ success: false, error: "Member not found in group" });
          return;
        }

        await fastify.prisma.groupMember.delete({ where: { id: memberId } });

        await auditService.log({
          userId: getUserId(request),
          dropzoneId,
          action: "GROUP_MEMBER_REMOVE",
          entityType: "GroupMember",
          entityId: memberId,
          beforeState: { groupId, userId: member.userId, role: member.role },
        });

        reply.code(200).send({ success: true });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to remove member from group" });
      }
    }
  );

  // ============================================================================
  // LOAD NOTE ROUTES
  // ============================================================================

  // ── CREATE LOAD NOTE ─────────────────────────────────────────────────

  fastify.post<{ Params: { loadId: string }; Body: z.infer<typeof createLoadNoteSchema> }>(
    "/loads/:loadId/notes",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const loadId = parseInt(request.params.loadId);
        const userId = getUserId(request);
        const body = createLoadNoteSchema.parse(request.body);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) {
          reply.code(404).send({ success: false, error: "Load not found" });
          return;
        }

        const note = await fastify.prisma.loadNote.create({
          data: {
            loadId,
            userId,
            content: body.content,
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        await auditService.log({
          userId,
          dropzoneId,
          action: "LOAD_NOTE_CREATE",
          entityType: "LoadNote",
          entityId: note.id,
          afterState: { loadId, content: body.content },
        });

        reply.code(201).send({
          success: true,
          data: {
            id: note.id,
            loadId: note.loadId,
            userId: note.userId,
            userName: note.user ? `${note.user.firstName} ${note.user.lastName}` : null,
            content: note.content,
            createdAt: note.createdAt,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: error.errors });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create load note" });
        }
      }
    }
  );

  // ── LIST LOAD NOTES ──────────────────────────────────────────────────

  fastify.get<{ Params: { loadId: string } }>(
    "/loads/:loadId/notes",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const loadId = parseInt(request.params.loadId);

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) {
          reply.code(404).send({ success: false, error: "Load not found" });
          return;
        }

        const notes = await fastify.prisma.loadNote.findMany({
          where: { loadId },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        reply.code(200).send({
          success: true,
          data: notes.map((n) => ({
            id: n.id,
            loadId: n.loadId,
            userId: n.userId,
            userName: n.user ? `${n.user.firstName} ${n.user.lastName}` : null,
            content: n.content,
            createdAt: n.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch load notes" });
      }
    }
  );

  // ── DELETE LOAD NOTE ─────────────────────────────────────────────────

  fastify.delete<{ Params: { loadId: string; noteId: string } }>(
    "/loads/:loadId/notes/:noteId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const loadId = parseInt(request.params.loadId);
        const noteId = parseInt(request.params.noteId);
        const userId = getUserId(request);
        const userRole = (request as any).user?.role;

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
        });
        if (!load) {
          reply.code(404).send({ success: false, error: "Load not found" });
          return;
        }

        const note = await fastify.prisma.loadNote.findFirst({
          where: { id: noteId, loadId },
        });
        if (!note) {
          reply.code(404).send({ success: false, error: "Note not found" });
          return;
        }

        const staffRoles = ["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"];
        if (note.userId !== userId && !staffRoles.includes(userRole)) {
          reply.code(403).send({ success: false, error: "You can only delete your own notes" });
          return;
        }

        await fastify.prisma.loadNote.delete({ where: { id: noteId } });

        await auditService.log({
          userId,
          dropzoneId,
          action: "LOAD_NOTE_DELETE",
          entityType: "LoadNote",
          entityId: noteId,
          beforeState: { loadId, content: note.content, authorId: note.userId },
        });

        reply.code(200).send({ success: true });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to delete load note" });
      }
    }
  );
}
