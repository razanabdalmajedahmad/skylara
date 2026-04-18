/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * API sync endpoint for push-pull delta sync
 * POST /api/sync/push - receive batch of outbox items
 * GET /api/sync/pull - return all changes since timestamp
 * POST /api/sync/resolve - resolve conflicts
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';

type EntityType = 'LOAD' | 'SLOT' | 'GEARCHECK' | 'EMERGENCYPROFILE';
type Action = 'CREATE' | 'UPDATE' | 'DELETE';
type Resolution = 'LOCAL' | 'SERVER' | 'MANUAL';

interface PushBody {
  entityType: EntityType;
  entityId?: number;
  action: Action;
  payload: Record<string, unknown>;
  clientUpdatedAt?: string;
  deviceId?: string;
  dropzoneId?: number;
}

interface ResolveBody {
  outboxId: number;
  entityType: EntityType;
  entityId: number;
  resolution: Resolution;
  mergedData?: Record<string, unknown>;
}

export async function syncRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;

  // ─── POST /sync/push ───────────────────────────────────────────────
  fastify.post(
    '/sync/push',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const idempotencyKey = request.headers['idempotency-key'] as string;
      if (!idempotencyKey) {
        return reply.code(400).send({ success: false, error: 'Missing Idempotency-Key header' });
      }

      const { entityType, entityId, action, payload, clientUpdatedAt, deviceId, dropzoneId } =
        request.body as PushBody;

      if (!entityType || !action || !payload) {
        return reply.code(400).send({ success: false, error: 'entityType, action, and payload are required' });
      }

      const userId = parseInt(String(request.user.sub));
      const dzId = dropzoneId ?? parseInt(request.user.dropzoneId || '0');

      try {
        // 1. Idempotency check
        const existing = await prisma.syncOutbox.findUnique({
          where: { idempotencyKey },
        });

        if (existing) {
          if (existing.status === 'SYNCED') {
            return reply.code(200).send({
              success: true,
              entityType: existing.entityType,
              action: existing.action,
              id: existing.entityId,
              cached: true,
            });
          }
          if (existing.status === 'CONFLICT') {
            return reply.code(409).send({
              success: false,
              error: 'CONFLICT',
              outboxId: existing.id,
              serverData: existing.conflictData,
            });
          }
          if (existing.status === 'FAILED') {
            return reply.code(500).send({
              success: false,
              error: 'Previously failed',
            });
          }
          // PENDING — another request may be in-flight
          return reply.code(202).send({
            success: true,
            message: 'Request is being processed',
            outboxId: existing.id,
          });
        }

        // 2. Create outbox record
        const outbox = await prisma.syncOutbox.create({
          data: {
            userId,
            dropzoneId: dzId,
            deviceId: deviceId || 'unknown',
            entityType: entityType.toUpperCase(),
            entityId: entityId ?? 0,
            action: action.toUpperCase(),
            payload: payload as any,
            idempotencyKey,
            status: 'PENDING',
          },
        });

        // 3. Process the action
        try {
          const result = await processAction(
            prisma,
            entityType.toUpperCase() as EntityType,
            action.toUpperCase() as Action,
            entityId ?? null,
            payload,
            userId,
            clientUpdatedAt ? new Date(clientUpdatedAt) : null,
          );

          if (result.conflict) {
            await prisma.syncOutbox.update({
              where: { id: outbox.id },
              data: {
                status: 'CONFLICT',
                conflictData: result.serverData as any,
              },
            });
            return reply.code(409).send({
              success: false,
              error: 'CONFLICT',
              message: result.message,
              outboxId: outbox.id,
              serverData: result.serverData,
            });
          }

          // Mark synced
          await prisma.syncOutbox.update({
            where: { id: outbox.id },
            data: {
              status: 'SYNCED',
              entityId: result.id,
              syncedAt: new Date(),
            },
          });

          return reply.code(200).send({
            success: true,
            entityType,
            action,
            id: result.id,
          });
        } catch (processingError: any) {
          await prisma.syncOutbox.update({
            where: { id: outbox.id },
            data: { status: 'FAILED' },
          });
          throw processingError;
        }
      } catch (error: any) {
        fastify.log.error(error);
        if (error.code === 'P2002') {
          return reply.code(409).send({ success: false, error: 'Duplicate entry' });
        }
        return reply.code(500).send({ success: false, error: 'Internal server error' });
      }
    },
  );

  // ─── GET /sync/pull ─────────────────────────────────────────────────
  fastify.get(
    '/sync/pull',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { since } = request.query as { since?: string };

      if (!since) {
        return reply.code(400).send({ success: false, error: 'Missing required query param: since' });
      }

      const sinceDate = new Date(parseInt(since));
      if (isNaN(sinceDate.getTime())) {
        return reply.code(400).send({ success: false, error: 'Invalid since timestamp' });
      }

      const userId = parseInt(String(request.user.sub));
      const dropzoneId = parseInt(request.user.dropzoneId || '0');

      try {
        const [loads, slots, gearChecks, emergencyProfiles, deletions] = await Promise.all([
          prisma.load.findMany({
            where: {
              dropzoneId,
              updatedAt: { gt: sinceDate },
            },
            orderBy: { updatedAt: 'asc' },
          }),
          prisma.slot.findMany({
            where: {
              load: { dropzoneId },
              updatedAt: { gt: sinceDate },
            },
            orderBy: { updatedAt: 'asc' },
          }),
          prisma.gearCheck.findMany({
            where: {
              checkedAt: { gt: sinceDate },
            },
            orderBy: { checkedAt: 'asc' },
          }),
          prisma.emergencyProfile.findMany({
            where: {
              userId,
              updatedAt: { gt: sinceDate },
            },
          }),
          // Track deletions via synced DELETE outbox entries
          prisma.syncOutbox.findMany({
            where: {
              action: 'DELETE',
              status: 'SYNCED',
              syncedAt: { gt: sinceDate },
            },
            select: {
              entityType: true,
              entityId: true,
              syncedAt: true,
            },
            orderBy: { syncedAt: 'asc' },
          }),
        ]);

        const changes: Array<{ type: string; action: string; items: unknown[] }> = [];

        if (loads.length > 0) changes.push({ type: 'loads', action: 'UPSERT', items: loads });
        if (slots.length > 0) changes.push({ type: 'slots', action: 'UPSERT', items: slots });
        if (gearChecks.length > 0) changes.push({ type: 'gearChecks', action: 'UPSERT', items: gearChecks });
        if (emergencyProfiles.length > 0) changes.push({ type: 'emergencyProfiles', action: 'UPSERT', items: emergencyProfiles });
        if (deletions.length > 0) {
          changes.push({
            type: 'deletions',
            action: 'DELETE',
            items: deletions.map((d) => ({
              entityType: d.entityType,
              entityId: d.entityId,
              deletedAt: d.syncedAt,
            })),
          });
        }

        return reply.code(200).send({
          success: true,
          changes,
          timestamp: Date.now(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ success: false, error: 'Internal server error' });
      }
    },
  );

  // ─── POST /sync/resolve ─────────────────────────────────────────────
  fastify.post(
    '/sync/resolve',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const idempotencyKey = request.headers['idempotency-key'] as string;
      if (!idempotencyKey) {
        return reply.code(400).send({ success: false, error: 'Missing Idempotency-Key header' });
      }

      const { outboxId, entityType, entityId, resolution, mergedData } = request.body as ResolveBody;

      if (!outboxId || !entityType || !resolution) {
        return reply.code(400).send({
          success: false,
          error: 'outboxId, entityType, and resolution are required',
        });
      }

      const userId = parseInt(String(request.user.sub));

      try {
        const outbox = await prisma.syncOutbox.findFirst({
          where: {
            id: outboxId,
            userId,
            status: 'CONFLICT',
          },
        });

        if (!outbox) {
          return reply.code(404).send({
            success: false,
            error: 'No conflict found for the given outbox entry',
          });
        }

        let resultId: number = outbox.entityId;

        switch (resolution) {
          case 'SERVER': {
            // Server wins — mark resolved, no DB change
            await prisma.syncOutbox.update({
              where: { id: outbox.id },
              data: { status: 'SYNCED', syncedAt: new Date(), conflictData: Prisma.DbNull },
            });
            break;
          }

          case 'LOCAL': {
            // Client wins — re-apply original client payload
            const clientPayload = outbox.payload as Record<string, unknown>;
            const applied = await applyEntityWrite(
              prisma,
              entityType.toUpperCase() as EntityType,
              outbox.action as Action,
              outbox.entityId,
              clientPayload,
              userId,
            );

            await prisma.syncOutbox.update({
              where: { id: outbox.id },
              data: { status: 'SYNCED', entityId: applied.id, syncedAt: new Date(), conflictData: Prisma.DbNull },
            });
            resultId = applied.id;
            break;
          }

          case 'MANUAL': {
            if (!mergedData) {
              return reply.code(400).send({
                success: false,
                error: 'mergedData is required for MANUAL resolution',
              });
            }

            const applied = await applyEntityWrite(
              prisma,
              entityType.toUpperCase() as EntityType,
              outbox.action as Action,
              entityId ?? outbox.entityId,
              mergedData,
              userId,
            );

            await prisma.syncOutbox.update({
              where: { id: outbox.id },
              data: {
                status: 'SYNCED',
                entityId: applied.id,
                payload: mergedData as any,
                syncedAt: new Date(),
                conflictData: Prisma.DbNull,
              },
            });
            resultId = applied.id;
            break;
          }

          default:
            return reply.code(400).send({ success: false, error: `Unknown resolution: ${resolution}` });
        }

        return reply.code(200).send({
          success: true,
          outboxId: outbox.id,
          entityType,
          resolution,
          id: resultId,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ success: false, error: 'Internal server error' });
      }
    },
  );
}

// ─── Action Processing ────────────────────────────────────────────────

interface ActionResult {
  id: number;
  conflict?: boolean;
  message?: string;
  serverData?: unknown;
}

async function processAction(
  prisma: any,
  entityType: EntityType,
  action: Action,
  entityId: number | null,
  payload: Record<string, unknown>,
  userId: number,
  clientUpdatedAt: Date | null,
): Promise<ActionResult> {
  if ((action === 'UPDATE' || action === 'DELETE') && entityId && clientUpdatedAt) {
    const conflict = await checkVersionConflict(prisma, entityType, entityId, clientUpdatedAt);
    if (conflict) return conflict;
  }

  return applyEntityWrite(prisma, entityType, action, entityId, payload, userId);
}

async function checkVersionConflict(
  prisma: any,
  entityType: EntityType,
  entityId: number,
  clientUpdatedAt: Date,
): Promise<ActionResult | null> {
  let serverUpdatedAt: Date | null = null;

  switch (entityType) {
    case 'LOAD': {
      const e = await prisma.load.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      serverUpdatedAt = e?.updatedAt ?? null;
      break;
    }
    case 'SLOT': {
      const e = await prisma.slot.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      serverUpdatedAt = e?.updatedAt ?? null;
      break;
    }
    case 'GEARCHECK': {
      const e = await prisma.gearCheck.findUnique({ where: { id: entityId }, select: { checkedAt: true } });
      serverUpdatedAt = e?.checkedAt ?? null;
      break;
    }
    case 'EMERGENCYPROFILE': {
      const e = await prisma.emergencyProfile.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      serverUpdatedAt = e?.updatedAt ?? null;
      break;
    }
  }

  if (!serverUpdatedAt) return null;

  if (serverUpdatedAt.getTime() > clientUpdatedAt.getTime()) {
    const serverData = await fetchFullEntity(prisma, entityType, entityId);
    return {
      id: entityId,
      conflict: true,
      message: `Version conflict: server updated at ${serverUpdatedAt.toISOString()}, client had ${clientUpdatedAt.toISOString()}`,
      serverData,
    };
  }

  return null;
}

async function fetchFullEntity(prisma: any, entityType: EntityType, entityId: number): Promise<unknown> {
  switch (entityType) {
    case 'LOAD': return prisma.load.findUnique({ where: { id: entityId } });
    case 'SLOT': return prisma.slot.findUnique({ where: { id: entityId } });
    case 'GEARCHECK': return prisma.gearCheck.findUnique({ where: { id: entityId } });
    case 'EMERGENCYPROFILE': return prisma.emergencyProfile.findUnique({ where: { id: entityId } });
    default: return null;
  }
}

async function applyEntityWrite(
  prisma: any,
  entityType: EntityType,
  action: Action,
  entityId: number | null,
  payload: Record<string, unknown>,
  userId: number,
): Promise<ActionResult> {
  switch (entityType) {
    case 'LOAD': return applyLoadWrite(prisma, action, entityId, payload);
    case 'SLOT': return applySlotWrite(prisma, action, entityId, payload);
    case 'GEARCHECK': return applyGearCheckWrite(prisma, action, entityId, payload, userId);
    case 'EMERGENCYPROFILE': return applyEmergencyProfileWrite(prisma, action, entityId, payload, userId);
    default: throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

// ─── Entity-Specific Write Handlers ──────────────────────────────────

async function applyLoadWrite(prisma: any, action: Action, entityId: number | null, payload: Record<string, unknown>): Promise<ActionResult> {
  switch (action) {
    case 'CREATE': {
      const load = await prisma.load.create({
        data: {
          dropzoneId: payload.dropzoneId as number,
          loadNumber: payload.loadNumber as number,
          aircraftId: payload.aircraftId as number,
          status: (payload.status as string) || 'OPEN',
          pilotId: (payload.pilotId as number) ?? null,
          estimatedJumpersCount: (payload.estimatedJumpersCount as number) ?? null,
          actualJumpersCount: (payload.actualJumpersCount as number) ?? null,
          estimatedAltitude: (payload.estimatedAltitude as number) ?? null,
          scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt as string) : null,
          notes: (payload.notes as string) ?? null,
        },
      });
      return { id: load.id };
    }
    case 'UPDATE': {
      if (!entityId) throw new Error('entityId required for UPDATE');
      const data: Record<string, unknown> = {};
      for (const key of ['status', 'pilotId', 'estimatedJumpersCount', 'actualJumpersCount', 'estimatedAltitude', 'notes', 'loadNumber', 'aircraftId']) {
        if (payload[key] !== undefined) data[key] = payload[key];
      }
      for (const key of ['scheduledAt', 'boardingAt', 'takeoffAt', 'landedAt']) {
        if (payload[key] !== undefined) data[key] = payload[key] ? new Date(payload[key] as string) : null;
      }
      const load = await prisma.load.update({ where: { id: entityId }, data });
      return { id: load.id };
    }
    case 'DELETE': {
      if (!entityId) throw new Error('entityId required for DELETE');
      await prisma.load.delete({ where: { id: entityId } });
      return { id: entityId };
    }
    default: throw new Error(`Unsupported action: ${action}`);
  }
}

async function applySlotWrite(prisma: any, action: Action, entityId: number | null, payload: Record<string, unknown>): Promise<ActionResult> {
  switch (action) {
    case 'CREATE': {
      const slot = await prisma.slot.create({
        data: {
          loadId: payload.loadId as number,
          userId: (payload.userId as number) ?? null,
          slotType: payload.slotType as string,
          position: payload.position as number,
          status: (payload.status as string) || 'RESERVED',
          instructorId: (payload.instructorId as number) ?? null,
          cameraOperatorId: (payload.cameraOperatorId as number) ?? null,
          price: payload.price as number,
          currency: (payload.currency as string) || 'USD',
          notes: (payload.notes as string) ?? null,
        },
      });
      return { id: slot.id };
    }
    case 'UPDATE': {
      if (!entityId) throw new Error('entityId required for UPDATE');
      const data: Record<string, unknown> = {};
      for (const key of ['userId', 'slotType', 'position', 'status', 'instructorId', 'cameraOperatorId', 'price', 'currency', 'notes']) {
        if (payload[key] !== undefined) data[key] = payload[key];
      }
      const slot = await prisma.slot.update({ where: { id: entityId }, data });
      return { id: slot.id };
    }
    case 'DELETE': {
      if (!entityId) throw new Error('entityId required for DELETE');
      await prisma.slot.delete({ where: { id: entityId } });
      return { id: entityId };
    }
    default: throw new Error(`Unsupported action: ${action}`);
  }
}

async function applyGearCheckWrite(prisma: any, action: Action, entityId: number | null, payload: Record<string, unknown>, userId: number): Promise<ActionResult> {
  switch (action) {
    case 'CREATE': {
      const gc = await prisma.gearCheck.create({
        data: {
          gearItemId: payload.gearItemId as number,
          inspectorId: (payload.inspectorId as number) ?? userId,
          status: payload.status as string,
          notes: (payload.notes as string) ?? null,
          nextCheckDue: payload.nextCheckDue ? new Date(payload.nextCheckDue as string) : null,
          checkedAt: payload.checkedAt ? new Date(payload.checkedAt as string) : new Date(),
        },
      });
      return { id: gc.id };
    }
    case 'UPDATE': {
      if (!entityId) throw new Error('entityId required for UPDATE');
      const data: Record<string, unknown> = {};
      for (const key of ['status', 'notes', 'inspectorId']) {
        if (payload[key] !== undefined) data[key] = payload[key];
      }
      if (payload.nextCheckDue !== undefined) data.nextCheckDue = payload.nextCheckDue ? new Date(payload.nextCheckDue as string) : null;
      const gc = await prisma.gearCheck.update({ where: { id: entityId }, data });
      return { id: gc.id };
    }
    case 'DELETE': {
      if (!entityId) throw new Error('entityId required for DELETE');
      await prisma.gearCheck.delete({ where: { id: entityId } });
      return { id: entityId };
    }
    default: throw new Error(`Unsupported action: ${action}`);
  }
}

async function applyEmergencyProfileWrite(prisma: any, action: Action, entityId: number | null, payload: Record<string, unknown>, userId: number): Promise<ActionResult> {
  switch (action) {
    case 'CREATE': {
      const profile = await prisma.emergencyProfile.upsert({
        where: { userId },
        create: {
          userId,
          bloodType: (payload.bloodType as string) ?? null,
          allergies: (payload.allergies as string) ?? null,
          medications: (payload.medications as string) ?? null,
          medicalConditions: (payload.medicalConditions as string) ?? null,
          insuranceProvider: (payload.insuranceProvider as string) ?? null,
          insuranceNumber: (payload.insuranceNumber as string) ?? null,
          primaryContactName: payload.primaryContactName as string,
          primaryContactPhone: payload.primaryContactPhone as string,
          primaryContactRelation: payload.primaryContactRelation as string,
          hospitalPreference: (payload.hospitalPreference as string) ?? null,
        },
        update: {
          bloodType: (payload.bloodType as string) ?? undefined,
          allergies: (payload.allergies as string) ?? undefined,
          medications: (payload.medications as string) ?? undefined,
          medicalConditions: (payload.medicalConditions as string) ?? undefined,
          insuranceProvider: (payload.insuranceProvider as string) ?? undefined,
          insuranceNumber: (payload.insuranceNumber as string) ?? undefined,
          primaryContactName: payload.primaryContactName as string,
          primaryContactPhone: payload.primaryContactPhone as string,
          primaryContactRelation: payload.primaryContactRelation as string,
          hospitalPreference: (payload.hospitalPreference as string) ?? undefined,
        },
      });
      return { id: profile.id };
    }
    case 'UPDATE': {
      const data: Record<string, unknown> = {};
      for (const key of ['bloodType', 'allergies', 'medications', 'medicalConditions', 'insuranceProvider', 'insuranceNumber', 'primaryContactName', 'primaryContactPhone', 'primaryContactRelation', 'hospitalPreference']) {
        if (payload[key] !== undefined) data[key] = payload[key];
      }
      const profile = entityId
        ? await prisma.emergencyProfile.update({ where: { id: entityId }, data })
        : await prisma.emergencyProfile.update({ where: { userId }, data });
      return { id: profile.id };
    }
    case 'DELETE': {
      if (!entityId) throw new Error('entityId required for DELETE');
      await prisma.emergencyProfile.delete({ where: { id: entityId } });
      return { id: entityId };
    }
    default: throw new Error(`Unsupported action: ${action}`);
  }
}

// ============================================================================
// MOBILE BOOTSTRAP & POLICY ENDPOINTS (Expert Feedback §8.5)
// ============================================================================

export async function mobileBootstrapRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;

  // GET /mobile/bootstrap — one-shot config for app startup
  fastify.get("/mobile/bootstrap", { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = parseInt((request as any).user?.sub ?? "0");
        const dzId = parseInt((request as any).user?.dropzoneId ?? "0");

        const [user, dropzone, flags] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, uuid: true, firstName: true, lastName: true, email: true, preferredLanguage: true },
          }),
          dzId ? prisma.dropzone.findUnique({
            where: { id: dzId },
            select: { id: true, name: true, slug: true, timezone: true, currency: true },
          }) : null,
          dzId ? (prisma as any).featureFlag?.findMany({
            where: { isEnabled: true, OR: [{ dropzoneId: dzId }, { dropzoneId: null }] },
            select: { key: true, rolloutPercent: true },
          }).catch(() => []) : [],
        ]);

        const roles = await prisma.userRole.findMany({
          where: { userId },
          include: { role: { select: { name: true } } },
        });

        reply.send({
          success: true,
          data: {
            user: { ...user, roles: roles.map(r => r.role.name) },
            dropzone,
            featureFlags: (flags ?? []).map((f: any) => f.key),
            serverTime: new Date().toISOString(),
          },
        });
      } catch { reply.code(500).send({ success: false, error: "Bootstrap failed" }); }
    }
  );

  // GET /mobile/policies — resolved policies for DZ
  fastify.get("/mobile/policies", { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const dzId = parseInt((request as any).user?.dropzoneId ?? "0");
        const { PolicyEngine } = await import("../services/policyEngine");
        const engine = new PolicyEngine(prisma);
        const defs = await engine.listDefinitions();
        const resolved = await engine.resolvePolicies(defs.map((d: any) => d.key), { dropzoneId: dzId });
        const policies: Record<string, any> = {};
        for (const [key, val] of Object.entries(resolved)) policies[key] = (val as any).value;
        reply.send({ success: true, data: { policies } });
      } catch { reply.code(500).send({ success: false, error: "Failed to fetch policies" }); }
    }
  );

  // GET /mobile/manifest-context — current loads + weather snapshot
  fastify.get("/mobile/manifest-context", { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const dzId = parseInt((request as any).user?.dropzoneId ?? "0");
        const loads = await prisma.load.findMany({
          where: { dropzoneId: dzId, status: { notIn: ["COMPLETE", "CANCELLED"] as any } },
          include: { aircraft: { select: { registration: true, maxCapacity: true } }, _count: { select: { slots: true } } },
          orderBy: { scheduledAt: "asc" },
          take: 10,
        });
        reply.send({
          success: true,
          data: {
            loads: loads.map((l: any) => ({
              id: l.id, loadNumber: l.loadNumber, status: l.status,
              aircraft: l.aircraft.registration, capacity: l.aircraft.maxCapacity,
              slotCount: l._count.slots, scheduledAt: l.scheduledAt,
              pilotConfirmation: l.pilotConfirmationStatus,
            })),
          },
        });
      } catch { reply.code(500).send({ success: false, error: "Failed to fetch context" }); }
    }
  );
}
