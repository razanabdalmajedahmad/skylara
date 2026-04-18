import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  timezone: z.string().optional(),
  maxAltitude: z.number().optional(),
  minAltitude: z.number().optional(),
  minBreakTime: z.number().optional(),
  maxLoadsPerDay: z.number().optional(),
  operatingHoursStart: z.string().optional(),
  operatingHoursEnd: z.string().optional(),
  maxWindSpeed: z.number().optional(),
  minVisibility: z.number().optional(),
  requiredCerts: z.array(z.string()).optional(),
  primaryWeatherStationId: z.string().optional(),
  // Language & Locale
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  weightUnit: z.string().optional(),
  altitudeUnit: z.string().optional(),
  currency: z.string().optional(),
  // Integration keys
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  weatherApiKey: z.string().optional(),
  uspaApiKey: z.string().optional(),
}).passthrough();

export async function adminRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // Query audit logs
  fastify.get<{
    Querystring: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/audit-logs",
    {
      preHandler: [authenticate, tenantScope, authorize(["ADMIN", "OPERATOR"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const filters = {
          userId: request.query.userId ? parseInt(request.query.userId) : undefined,
          action: request.query.action as any,
          resourceType: request.query.resourceType,
          startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
          endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
          limit: parseInt(request.query.limit || "100"),
          offset: parseInt(request.query.offset || "0"),
        };

        const logs = await fastify.prisma.auditLog.findMany({
          where: {
            dropzoneId,
            userId: filters.userId,
            action: filters.action,
            entityType: filters.resourceType,
            createdAt: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          },
          orderBy: { createdAt: "desc" },
          take: filters.limit,
          skip: filters.offset,
        });

        reply.code(200).send({
          success: true,
          data: logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            beforeState: log.beforeState,
            afterState: log.afterState,
            createdAt: log.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch audit logs",
        });
      }
    }
  );

  // Generate report
  fastify.get<{
    Params: { type: string };
    Querystring: { startDate?: string; endDate?: string };
  }>(
    "/reports/:type",
    {
      preHandler: [authenticate, tenantScope, authorize(["ADMIN"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const reportType = request.params.type;
        const startDate = request.query.startDate ? new Date(request.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        let report: any = {};

        switch (reportType) {
          case "jumps":
            const jumpCount = await fastify.prisma.slot.count({
              where: {
                load: {
                  dropzoneId,
                  status: "COMPLETE",
                  updatedAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            });

            report = {
              type: "jumps",
              period: { startDate, endDate },
              totalJumps: jumpCount,
            };
            break;

          case "revenue":
            const transactions = await fastify.prisma.transaction.findMany({
              where: {
                wallet: {
                  dropzoneId,
                },
                type: "DEBIT",
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            });

            const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);

            report = {
              type: "revenue",
              period: { startDate, endDate },
              totalRevenue,
              transactionCount: transactions.length,
            };
            break;

          case "users":
            const userCount = await fastify.prisma.user.count({
              where: {
                userRoles: {
                  some: { dropzoneId },
                },
              },
            });

            report = {
              type: "users",
              totalUsers: userCount,
            };
            break;

          default:
            throw new NotFoundError(`Report type: ${reportType}`);
        }

        reply.code(200).send({
          success: true,
          data: report,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to generate report",
          });
        }
      }
    }
  );

  // ===================== DZ SETTINGS (GET + SAVE) =====================
  // Uses the DzSettings model which has language, dateFormat, weightUnit, altitudeUnit, currency etc.

  const ROLES_SETTINGS = ["PLATFORM_ADMIN", "DZ_MANAGER", "DZ_OWNER", "DZ_OPERATOR", "ADMIN"];

  // Shared handler: load settings
  const loadSettingsHandler = async (request: any, reply: any) => {
    try {
      if (!request.user) throw new NotFoundError("User");
      const dropzoneId = parseInt(request.user.dropzoneId || "0");
      const dropzone = await fastify.prisma.dropzone.findUnique({ where: { id: dropzoneId } });
      if (!dropzone) throw new NotFoundError("Dropzone");

      // Get or create DzSettings
      let settings = await fastify.prisma.dzSettings.findUnique({ where: { dropzoneId } });
      if (!settings) {
        settings = await fastify.prisma.dzSettings.create({ data: { dropzoneId } });
      }

      reply.send({
        success: true,
        data: {
          name: dropzone.name,
          ...settings,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ success: false, error: "Failed to load settings" });
    }
  };

  // Shared handler: save settings
  const saveSettingsHandler = async (request: any, reply: any) => {
    try {
      if (!request.user) throw new NotFoundError("User");
      const dropzoneId = parseInt(request.user.dropzoneId || "0");
      const body = request.body as any;

      const dropzone = await fastify.prisma.dropzone.findUnique({ where: { id: dropzoneId } });
      if (!dropzone) throw new NotFoundError("Dropzone");

      // Update Dropzone name/timezone if provided
      if (body.name || body.timezone) {
        const dzUpdate: any = {};
        if (body.name) dzUpdate.name = body.name;
        if (body.timezone) dzUpdate.timezone = body.timezone;
        await fastify.prisma.dropzone.update({ where: { id: dropzoneId }, data: dzUpdate });
      }

      // Upsert DzSettings with all provided fields
      const settingsData: any = {};
      const settingsFields = [
        "language", "currency", "dateFormat", "weightUnit", "altitudeUnit", "timezone",
        "maxAltitude", "minBreakTime", "maxLoadsPerDay", "operatingHoursStart", "operatingHoursEnd",
        "maxWindSpeed", "minVisibility", "emailNotifications", "smsNotifications", "pushNotifications",
      ];
      for (const field of settingsFields) {
        if (body[field] !== undefined) settingsData[field] = body[field];
      }

      const settings = await fastify.prisma.dzSettings.upsert({
        where: { dropzoneId },
        update: settingsData,
        create: { dropzoneId, ...settingsData },
      });

      await auditService.log({
        userId: parseInt(String(request.user.sub)),
        dropzoneId,
        action: "UPDATE",
        entityType: "DzSettings",
        entityId: settings.id,
        afterState: settingsData,
      });

      reply.code(200).send({ success: true, data: settings, message: "Settings saved successfully" });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ success: false, error: "Failed to update settings" });
    }
  };

  // GET /settings
  fastify.get("/settings", { preHandler: [authenticate, tenantScope, authorize(ROLES_SETTINGS)] }, loadSettingsHandler);
  // GET /admin/settings (alias used by frontend)
  fastify.get("/admin/settings", { preHandler: [authenticate, tenantScope, authorize(ROLES_SETTINGS)] }, loadSettingsHandler);
  // PATCH /settings
  fastify.patch("/settings", { preHandler: [authenticate, tenantScope, authorize(ROLES_SETTINGS)] }, saveSettingsHandler);
  // PUT /settings
  fastify.put("/settings", { preHandler: [authenticate, tenantScope, authorize(ROLES_SETTINGS)] }, saveSettingsHandler);
  // PUT /admin/settings (alias used by frontend)
  fastify.put("/admin/settings", { preHandler: [authenticate, tenantScope, authorize(ROLES_SETTINGS)] }, saveSettingsHandler);

  // List organizations for current user
  fastify.get(
    "/organizations",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        // Get user's roles with organizations
        const userRoles = await fastify.prisma.userRole.findMany({
          where: { userId: parseInt(String(request.user.sub)) },
          include: { organization: true },
          distinct: ["organizationId"],
        });

        const organizations = userRoles
          .filter((ur) => ur.organization)
          .map((ur) => ({
            id: ur.organization!.id,
            name: ur.organization!.name,
            slug: ur.organization!.slug,
          }));

        reply.code(200).send({
          success: true,
          data: organizations,
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch organizations",
        });
      }
    }
  );

  // List dropzones for organization
  fastify.get<{
    Params: { orgId: string };
  }>(
    "/organizations/:orgId/dropzones",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const params = request.params as { orgId: string };
        const organizationId = parseInt(params.orgId);
        const dropzones = await fastify.prisma.dropzone.findMany({
          where: {
            organizationId,
          },
        });

        reply.code(200).send({
          success: true,
          data: dropzones.map((dz) => ({
            id: dz.id,
            name: dz.name,
            slug: dz.slug,
            timezone: dz.timezone,
            status: dz.status,
          })),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch dropzones",
        });
      }
    }
  );

  // ── ROLE MANAGEMENT ────────────────────────────────────────────────

  // List all roles with user counts for this DZ
  fastify.get(
    "/admin/roles",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "DZ_OPERATOR", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

        const roles = await fastify.prisma.role.findMany({
          orderBy: { id: "asc" },
          include: {
            userRoles: {
              where: { dropzoneId },
              select: { id: true },
            },
          },
        });

        reply.send({
          success: true,
          data: roles.map((r) => ({
            id: r.name,
            dbId: r.id,
            name: r.displayName,
            description: r.description || "",
            userCount: r.userRoles.length,
            active: true,
            system: true,
          })),
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to fetch roles" });
      }
    }
  );

  // List all users with their roles for this DZ (for role assignment UI)
  fastify.get(
    "/admin/roles/users",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "DZ_OPERATOR", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

        const users = await fastify.prisma.user.findMany({
          where: {
            userRoles: {
              some: { dropzoneId },
            },
          },
          include: {
            userRoles: {
              where: { dropzoneId },
              include: { role: true },
            },
          },
          orderBy: { firstName: "asc" },
          take: 200,
        });

        reply.send({
          success: true,
          data: users.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            email: u.email,
            roles: u.userRoles.map((ur) => ur.role.name),
            userRoleIds: u.userRoles.reduce(
              (acc, ur) => ({ ...acc, [ur.role.name]: ur.id }),
              {} as Record<string, number>
            ),
            lastLogin: u.updatedAt.toISOString(),
            status: "active" as const,
          })),
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to fetch users with roles" });
      }
    }
  );

  // Assign role to user at this DZ
  fastify.post(
    "/admin/roles/assign",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = request.body as { userId: number; roleName: string };

      const role = await fastify.prisma.role.findFirst({ where: { name: body.roleName } });
      if (!role) { reply.code(404).send({ success: false, error: "Role not found" }); return; }

      const existing = await fastify.prisma.userRole.findFirst({
        where: { userId: body.userId, roleId: role.id, dropzoneId },
      });
      if (existing) { reply.code(409).send({ success: false, error: "User already has this role" }); return; }

      const ur = await fastify.prisma.userRole.create({
        data: { userId: body.userId, roleId: role.id, dropzoneId },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "ROLE_GRANT",
        entityType: "UserRole",
        entityId: ur.id,
        afterState: { userId: body.userId, roleName: body.roleName },
      });

      reply.code(201).send({ success: true, data: ur });
    }
  );

  // Revoke role
  fastify.delete<{ Params: { userRoleId: string } }>(
    "/admin/roles/:userRoleId",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      const userRoleId = parseInt((request.params as any).userRoleId);
      const ur = await fastify.prisma.userRole.findUnique({ where: { id: userRoleId } });
      if (!ur) { reply.code(404).send({ success: false, error: "UserRole not found" }); return; }

      await fastify.prisma.userRole.delete({ where: { id: userRoleId } });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId: parseInt(request.user!.dropzoneId!, 10),
        action: "ROLE_REVOKE",
        entityType: "UserRole",
        entityId: userRoleId,
      });

      reply.send({ success: true, data: { message: "Role revoked" } });
    }
  );

  // ── CSV IMPORT (Legacy Migration) ──────────────────────────────────

  fastify.post(
    "/admin/import",
    {
      preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = request.body as { entityType: string; data: any[] };
      const results = { imported: 0, skipped: 0, errors: [] as string[] };

      const { randomUUID } = await import("crypto");
      const { scryptSync, randomBytes } = await import("crypto");

      for (const row of body.data) {
        try {
          if (body.entityType === "athletes") {
            if (!row.firstName || !row.lastName) { results.skipped++; continue; }
            const email = row.email || `import-${Date.now()}-${Math.random().toString(36).slice(2)}@skylara.local`;
            const existing = await fastify.prisma.user.findFirst({ where: { email } });
            if (existing) { results.skipped++; continue; }

            const salt = randomBytes(16);
            const derived = scryptSync("imported2026", salt, 64, { N: 16384, r: 8, p: 1 });
            const hash = `$scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;

            const user = await fastify.prisma.user.create({
              data: { uuid: randomUUID(), email, phone: row.phone, firstName: row.firstName, lastName: row.lastName, passwordHash: hash },
            });

            const athleteRole = await fastify.prisma.role.findFirst({ where: { name: "ATHLETE" } });
            if (athleteRole) {
              await fastify.prisma.userRole.create({ data: { userId: user.id, roleId: athleteRole.id, dropzoneId } });
            }

            if (row.totalJumps || row.license) {
              await fastify.prisma.athlete.create({
                data: {
                  userId: user.id, homeDropzoneId: dropzoneId,
                  uspaMemberId: row.uspaNumber || null,
                  licenseLevel: ({ A: "A", B: "B", C: "C", D: "D" }[row.license?.toUpperCase() as string] || "NONE") as any,
                  totalJumps: parseInt(row.totalJumps) || 0,
                  disciplines: [],
                },
              }).catch(() => {});
            }
            results.imported++;
          } else if (body.entityType === "gear") {
            if (!row.serialNumber) { results.skipped++; continue; }
            await fastify.prisma.gearItem.create({
              data: {
                dropzoneId, serialNumber: row.serialNumber,
                gearType: (row.type?.toUpperCase() || "CONTAINER") as any,
                manufacturer: row.manufacturer || "Unknown", model: row.model || "Unknown",
                dom: row.dom ? new Date(row.dom) : new Date(),
              },
            }).catch(() => { results.skipped++; });
            results.imported++;
          }
        } catch (err: any) {
          results.errors.push(`${row.firstName || row.serialNumber}: ${err.message}`);
        }
      }

      reply.send({ success: true, data: results });
    }
  );

  // ── PILOT PRE-FLIGHT CHECKLIST ─────────────────────────────────────

  fastify.get<{ Params: { loadId: string } }>(
    "/loads/:loadId/preflight",
    {
      preHandler: [authenticate, tenantScope, authorize(["PILOT", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const loadId = parseInt((request.params as any).loadId);

      const load = await fastify.prisma.load.findFirst({
        where: { id: loadId, dropzoneId },
        include: {
          aircraft: true,
          slots: { where: { status: "MANIFESTED" }, select: { id: true, weight: true } },
          cgChecks: { take: 1, orderBy: { createdAt: "desc" } },
        },
      });
      if (!load) throw new NotFoundError("Load");

      const totalWeight = load.slots.reduce((sum, s) => sum + s.weight, 0);
      const cgResult = load.cgChecks[0]?.result ?? "NOT_CHECKED";

      const checks = [
        { item: "Weight & Balance", status: cgResult === "PASS" ? "PASS" : cgResult === "MARGINAL" ? "WARNING" : "FAIL", detail: `Payload: ${totalWeight} lbs, CG: ${cgResult}`, auto: true },
        { item: "Aircraft Airworthy", status: load.aircraft.status === "ACTIVE" ? "PASS" : "FAIL", detail: `Status: ${load.aircraft.status}`, auto: true },
        { item: "Fuel Sufficient", status: load.fuelWeight && load.fuelWeight > 50 ? "PASS" : "WARNING", detail: `Fuel: ${load.fuelWeight ?? "Not set"} lbs`, auto: false },
        { item: "Jumper Count", status: load.slots.length <= load.aircraft.maxCapacity ? "PASS" : "FAIL", detail: `${load.slots.length}/${load.aircraft.maxCapacity}`, auto: true },
        { item: "ATC Notified", status: "PENDING", detail: "Pilot must confirm", auto: false },
        { item: "Door Secure", status: "PENDING", detail: "Pilot must confirm", auto: false },
      ];

      reply.send({
        success: true,
        data: {
          loadId, loadNumber: load.loadNumber, aircraft: load.aircraft.registration,
          jumperCount: load.slots.length, totalWeight, checks,
          canDepart: checks.filter(c => c.auto).every(c => c.status === "PASS"),
        },
      });
    }
  );

  // ── LOAD CLOCK (countdown timers for all active loads) ─────────────

  fastify.get(
    "/loads/clock",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const timerLoads = await fastify.prisma.load.findMany({
        where: {
          dropzoneId,
          status: { in: ["THIRTY_MIN", "TWENTY_MIN", "TEN_MIN", "BOARDING", "LOCKED"] },
        },
        include: {
          aircraft: { select: { registration: true } },
          slots: { where: { status: "MANIFESTED" }, select: { id: true } },
        },
        orderBy: { updatedAt: "asc" },
      });

      const clocks = timerLoads.map((load) => {
        const elapsed = Date.now() - load.updatedAt.getTime();
        let countdownMs = 0;
        let label = "";

        switch (load.status) {
          case "LOCKED": countdownMs = 0; label = "CG CHECK REQUIRED"; break;
          case "THIRTY_MIN": countdownMs = Math.max(0, 600000 - elapsed); label = "30 MIN CALL"; break;
          case "TWENTY_MIN": countdownMs = Math.max(0, 600000 - elapsed); label = "20 MIN CALL"; break;
          case "TEN_MIN": countdownMs = Math.max(0, 300000 - elapsed); label = "10 MIN CALL"; break;
          case "BOARDING": countdownMs = 0; label = "NOW BOARDING"; break;
        }

        const mins = Math.floor(countdownMs / 60000);
        const secs = Math.floor((countdownMs % 60000) / 1000);

        return {
          loadId: load.id, loadNumber: load.loadNumber,
          aircraft: load.aircraft.registration, status: load.status,
          jumperCount: load.slots.length, label,
          countdown: countdownMs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : label,
          countdownMs,
        };
      });

      reply.send({ success: true, data: clocks });
    }
  );

  // ========================================================================
  // STAFF SCHEDULES — View and manage staff schedules for a dropzone
  // ========================================================================

  // GET /admin/staff-schedules — List staff schedules for the dropzone
  fastify.get<{
    Querystring: { userId?: string; dayOfWeek?: string; limit?: string; offset?: string };
  }>(
    "/admin/staff-schedules",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(String(request.user.dropzoneId), 10)
          : null;
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { userId, dayOfWeek } = request.query;
        const limit = Math.min(
          parseInt(request.query.limit || "50", 10) || 50,
          100
        );
        const offset = parseInt(request.query.offset || "0", 10) || 0;

        const where: any = { dropzoneId };
        if (userId) {
          const uid = parseInt(userId, 10);
          if (Number.isFinite(uid)) where.userId = uid;
        }
        if (dayOfWeek !== undefined) {
          const dow = parseInt(dayOfWeek, 10);
          if (Number.isFinite(dow) && dow >= 0 && dow <= 6) where.dayOfWeek = dow;
        }

        const [schedules, total] = await Promise.all([
          fastify.prisma.staffSchedule.findMany({
            where,
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            take: limit,
            skip: offset,
          }),
          fastify.prisma.staffSchedule.count({ where }),
        ]);

        reply.send({
          success: true,
          data: schedules.map((s: any) => ({
            id: s.id,
            dropzoneId: s.dropzoneId,
            userId: s.userId,
            userName: s.user
              ? `${s.user.firstName || ""} ${s.user.lastName || ""}`.trim()
              : null,
            userEmail: s.user?.email || null,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            employmentType: s.employmentType,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch staff schedules",
        });
      }
    }
  );

  // POST /admin/staff-schedules — Create a staff schedule entry
  fastify.post<{ Body: Record<string, any> }>(
    "/admin/staff-schedules",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(String(request.user.dropzoneId), 10)
          : null;
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const body = request.body as Record<string, any>;

        if (!body.userId) {
          return reply
            .code(400)
            .send({ success: false, error: "userId is required" });
        }

        const userId = parseInt(String(body.userId), 10);
        if (!Number.isFinite(userId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid userId" });
        }

        if (body.dayOfWeek === undefined || body.dayOfWeek === null) {
          return reply
            .code(400)
            .send({ success: false, error: "dayOfWeek is required (0=Sun to 6=Sat)" });
        }
        const dayOfWeek = parseInt(String(body.dayOfWeek), 10);
        if (!Number.isFinite(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
          return reply
            .code(400)
            .send({ success: false, error: "dayOfWeek must be 0-6" });
        }

        if (!body.startTime || !body.endTime) {
          return reply
            .code(400)
            .send({ success: false, error: "startTime and endTime are required (HH:MM format)" });
        }

        const schedule = await fastify.prisma.staffSchedule.create({
          data: {
            dropzoneId,
            userId,
            dayOfWeek,
            startTime: String(body.startTime),
            endTime: String(body.endTime),
            employmentType: body.employmentType || "FULL_TIME",
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            id: schedule.id,
            dropzoneId: schedule.dropzoneId,
            userId: schedule.userId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            employmentType: schedule.employmentType,
            createdAt: schedule.createdAt,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to create staff schedule",
        });
      }
    }
  );

  // PATCH /admin/staff-schedules/:id — Update a staff schedule entry
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/admin/staff-schedules/:id",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(String(request.user.dropzoneId), 10)
          : null;
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const scheduleId = parseInt(request.params.id, 10);
        if (!Number.isFinite(scheduleId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid schedule ID" });
        }

        const existing = await fastify.prisma.staffSchedule.findFirst({
          where: { id: scheduleId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Staff schedule not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.dayOfWeek !== undefined) {
          const dow = parseInt(String(body.dayOfWeek), 10);
          if (Number.isFinite(dow) && dow >= 0 && dow <= 6) updateData.dayOfWeek = dow;
        }
        if (body.startTime !== undefined) updateData.startTime = String(body.startTime);
        if (body.endTime !== undefined) updateData.endTime = String(body.endTime);
        if (body.employmentType !== undefined) updateData.employmentType = body.employmentType;

        const updated = await fastify.prisma.staffSchedule.update({
          where: { id: scheduleId },
          data: updateData,
        });

        reply.send({
          success: true,
          data: {
            id: updated.id,
            dropzoneId: updated.dropzoneId,
            userId: updated.userId,
            dayOfWeek: updated.dayOfWeek,
            startTime: updated.startTime,
            endTime: updated.endTime,
            employmentType: updated.employmentType,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to update staff schedule",
        });
      }
    }
  );

  // DELETE /admin/staff-schedules/:id — Delete a staff schedule entry
  fastify.delete<{ Params: { id: string } }>(
    "/admin/staff-schedules/:id",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(String(request.user.dropzoneId), 10)
          : null;
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const scheduleId = parseInt(request.params.id, 10);
        if (!Number.isFinite(scheduleId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid schedule ID" });
        }

        const existing = await fastify.prisma.staffSchedule.findFirst({
          where: { id: scheduleId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Staff schedule not found" });
        }

        await fastify.prisma.staffSchedule.delete({
          where: { id: scheduleId },
        });

        reply.send({ success: true, data: { id: scheduleId } });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to delete staff schedule",
        });
      }
    }
  );
}
