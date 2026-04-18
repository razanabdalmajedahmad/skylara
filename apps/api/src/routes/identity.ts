import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ValidationError } from "../utils/errors";
import { AuditService } from "../services/auditService";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  preferredLanguage: z.string().max(10).optional(),
  // UserProfile fields
  bio: z.string().max(1000).optional(),
  gender: z.string().max(50).optional(),
  nationality: z.string().max(100).optional(),
  avatar: z.string().optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelation: z.string().max(50).optional(),
  notificationPreferences: z.record(z.any()).optional(),
  visibilityPublic: z.boolean().optional(),
});

const checkInSchema = z.object({
  qrCode: z.string(),
});

export async function identityRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  fastify.get(
    "/users/me",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: parseInt(String(request.user.sub)) },
          include: {
            userRoles: {
              include: { role: true },
            },
            emergencyProfile: true,
            profile: true,
            wallets: true,
          },
        });

        if (!user) {
          throw new NotFoundError("User");
        }

        reply.code(200).send({
          success: true,
          data: {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            preferredLanguage: user.preferredLanguage,
            status: user.status,
            roles: user.userRoles.map((ur) => ur.role.name),
            emergencyProfile: user.emergencyProfile,
            profile: user.profile,
            wallets: user.wallets,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch profile",
        });
      }
    }
  );

  fastify.patch(
    "/users/me",
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string" },
            dateOfBirth: { type: "string" },
            preferredLanguage: { type: "string" },
            bio: { type: "string" },
            gender: { type: "string" },
            nationality: { type: "string" },
            avatar: { type: "string" },
            emergencyContactName: { type: "string" },
            emergencyContactPhone: { type: "string" },
            emergencyContactRelation: { type: "string" },
            notificationPreferences: { type: "object" },
            visibilityPublic: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const body = updateProfileSchema.parse(request.body);
        const userId = parseInt(String(request.user.sub));

        // Update core User fields
        const userUpdate: any = {};
        if (body.firstName) userUpdate.firstName = body.firstName;
        if (body.lastName) userUpdate.lastName = body.lastName;
        if (body.phone !== undefined) userUpdate.phone = body.phone;
        if (body.preferredLanguage) userUpdate.preferredLanguage = body.preferredLanguage;

        const user = await fastify.prisma.user.update({
          where: { id: userId },
          data: userUpdate,
          include: {
            userRoles: { include: { role: true } },
            profile: true,
          },
        });

        // Update UserProfile fields
        const profileUpdate: any = {};
        if (body.dateOfBirth) profileUpdate.dateOfBirth = new Date(body.dateOfBirth);
        if (body.bio !== undefined) profileUpdate.bio = body.bio;
        if (body.gender !== undefined) profileUpdate.gender = body.gender;
        if (body.nationality !== undefined) profileUpdate.nationality = body.nationality;
        if (body.avatar !== undefined) profileUpdate.avatar = body.avatar;
        if (body.emergencyContactName !== undefined) profileUpdate.emergencyContactName = body.emergencyContactName;
        if (body.emergencyContactPhone !== undefined) profileUpdate.emergencyContactPhone = body.emergencyContactPhone;
        if (body.emergencyContactRelation !== undefined) profileUpdate.emergencyContactRelation = body.emergencyContactRelation;
        if (body.notificationPreferences !== undefined) profileUpdate.notificationPreferences = body.notificationPreferences;
        if (body.visibilityPublic !== undefined) profileUpdate.visibilityPublic = body.visibilityPublic;

        if (Object.keys(profileUpdate).length > 0) {
          await fastify.prisma.userProfile.upsert({
            where: { userId },
            update: profileUpdate,
            create: { userId, ...profileUpdate },
          });
        }

        await auditService.log({
          userId,
          dropzoneId: 0,
          action: "PROFILE_UPDATE",
          entityType: "User",
          entityId: user.id,
          afterState: body,
        });

        // Re-fetch full profile
        const updated = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: { include: { role: true } },
            profile: true,
            emergencyProfile: true,
            wallets: true,
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            id: updated!.id,
            uuid: updated!.uuid,
            email: updated!.email,
            firstName: updated!.firstName,
            lastName: updated!.lastName,
            phone: updated!.phone,
            preferredLanguage: updated!.preferredLanguage,
            status: updated!.status,
            roles: updated!.userRoles.map((ur) => ur.role.name),
            profile: updated!.profile,
            emergencyProfile: updated!.emergencyProfile,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to update profile",
        });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    "/users/:id",
    {
      preHandler: [authenticate, authorize(["OPERATOR", "ADMIN"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const userId = parseInt(request.params.id);
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: {
              include: { role: true },
            },
            wallets: true,
          },
        });

        if (!user) {
          throw new NotFoundError("User");
        }

        reply.code(200).send({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            roles: user.userRoles.map((ur) => ur.role.name),
            wallets: user.wallets,
          },
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
            error: "Failed to fetch user",
          });
        }
      }
    }
  );

  fastify.get<{ Querystring: { search?: string; role?: string; limit?: string; offset?: string } }>(
    "/users",
    {
      preHandler: [
        authenticate,
        authorize([
          "OPERATOR",
          "MANIFEST_STAFF",
          "DZ_MANAGER",
          "DZ_OWNER",
          "PLATFORM_ADMIN",
        ]),
      ],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const search = request.query.search || "";
        const roleFilter = request.query.role || "";
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const whereClause: any = {
          userRoles: {
            some: {
              dropzoneId,
              ...(roleFilter ? { role: { name: roleFilter } } : {}),
            },
          },
        };

        // Only add search filter when a search string is provided
        if (search) {
          whereClause.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ];
        }

        const users = await fastify.prisma.user.findMany({
          where: whereClause,
          include: {
            userRoles: {
              where: { dropzoneId },
              include: { role: true },
            },
            profile: true,
            athlete: true,
            waiverSignatures: {
              take: 1,
              orderBy: { signedAt: "desc" },
            },
          },
          take: limit,
          skip: offset,
        });

        // Compute currency status based on license level and last jump date
        const now = new Date();
        const computeCurrency = (athlete: any) => {
          if (!athlete || !athlete.lastJumpDate) {
            return { currencyStatus: "expired" as const, currencyDaysValid: -999 };
          }

          // Currency windows per USPA BSR: Student 30d, A/B 60d, C/D 90d
          const windowDays: Record<string, number> = {
            STUDENT: 30,
            A: 60,
            B: 60,
            C: 90,
            D: 90,
            NONE: 30,
          };

          const level = athlete.licenseLevel || "NONE";
          const window = windowDays[level] || 60;
          const lastJump = new Date(athlete.lastJumpDate);
          const expiresAt = new Date(lastJump.getTime() + window * 86400000);
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);

          if (daysLeft <= 0) return { currencyStatus: "expired" as const, currencyDaysValid: daysLeft };
          if (daysLeft <= 15) return { currencyStatus: "expiring" as const, currencyDaysValid: daysLeft };
          return { currencyStatus: "current" as const, currencyDaysValid: daysLeft };
        };

        // Map license level enum to display label
        const licenseLabelMap: Record<string, string> = {
          A: "A",
          B: "B",
          C: "C",
          D: "D",
          STUDENT: "Student",
          NONE: "Visitor",
        };

        reply.code(200).send({
          success: true,
          data: users.map((u) => {
            const athlete = (u as any).athlete;
            const profile = (u as any).profile;
            const waiverSigs = (u as any).waiverSignatures || [];
            const currency = computeCurrency(athlete);

            return {
              id: u.id,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              status: u.status,
              nationality: profile?.nationality || "",
              licenseType: licenseLabelMap[athlete?.licenseLevel || "NONE"] || "Visitor",
              totalJumps: athlete?.totalJumps || 0,
              lastJumpDate: athlete?.lastJumpDate
                ? new Date(athlete.lastJumpDate).toISOString().split("T")[0]
                : null,
              currencyStatus: currency.currencyStatus,
              currencyDaysValid: currency.currencyDaysValid,
              waiverSigned: waiverSigs.length > 0,
              roles: u.userRoles.map((ur) => ur.role.name),
            };
          }),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to search users",
        });
      }
    }
  );

  fastify.post<{ Params: { id: string }; Body: z.infer<typeof checkInSchema> }>(
    "/users/:id/checkin",
    {
      schema: {
        body: {
          type: "object",
          required: ["qrCode"],
          properties: {
            qrCode: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // QR check-in can be public or low-auth
        // For MVP, we'll require no auth but log the check-in

        const userId = parseInt(request.params.id);
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            qrTokens: {
              where: { isRevoked: false },
            },
          },
        });

        if (!user) {
          throw new NotFoundError("User");
        }

        // Verify QR code is valid
        const qrToken = user.qrTokens.find((qt) => {
          const payload = typeof qt.payload === "string" ? JSON.parse(qt.payload) : qt.payload;
          return qt.expiresAt > new Date() && payload.code === request.body.qrCode;
        });

        if (!qrToken) {
          throw new ValidationError({}, "Invalid or expired QR code");
        }

        reply.code(200).send({
          success: true,
          data: {
            message: "Checked in successfully",
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof ValidationError) {
          reply.code(400).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Check-in failed",
          });
        }
      }
    }
  );

  // ── WALK-IN REGISTRATION (P0 — critical for tandem revenue) ────────
  // Creates a new user + profile + emergency contact for same-day customers
  fastify.post(
    "/walk-in",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
        const body = request.body as {
          firstName: string;
          lastName: string;
          email?: string;
          phone?: string;
          weight?: number;
          dateOfBirth?: string;
          emergencyContactName?: string;
          emergencyContactPhone?: string;
          jumpType?: string; // TANDEM, AFF, FUN
        };

        if (!body.firstName || !body.lastName) {
          reply.code(400).send({ success: false, error: "First and last name required" });
          return;
        }

        const { randomUUID } = await import("crypto");
        const { scryptSync, randomBytes } = await import("crypto");

        // Create a temporary password (walk-in can set real password later)
        const tempPassword = randomBytes(12).toString("hex");
        const salt = randomBytes(16);
        const derived = scryptSync(tempPassword, salt, 64, { N: 16384, r: 8, p: 1 });
        const passwordHash = `$scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;

        // Walk-ins without email get a DZ-scoped placeholder email
        // These are temporary tandem passengers; they can claim the account later by setting a real email
        const email = body.email || `walkin+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${dropzoneId}.local.skylara.app`;

        // Create user
        const user = await fastify.prisma.user.create({
          data: {
            uuid: randomUUID(),
            email,
            phone: body.phone,
            firstName: body.firstName,
            lastName: body.lastName,
            passwordHash,
          },
        });

        // Create user profile
        await fastify.prisma.userProfile.create({
          data: {
            userId: user.id,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          },
        });

        // Create emergency profile if contact provided
        if (body.emergencyContactName) {
          await fastify.prisma.emergencyProfile.create({
            data: {
              userId: user.id,
              primaryContactName: body.emergencyContactName,
              primaryContactPhone: body.emergencyContactPhone || "",
              primaryContactRelation: "Emergency Contact",
              weightLbs: body.weight,
            },
          });
        }

        // Assign ATHLETE role at this DZ
        const athleteRole = await fastify.prisma.role.findFirst({ where: { name: "ATHLETE" } });
        if (athleteRole) {
          await fastify.prisma.userRole.create({
            data: { userId: user.id, roleId: athleteRole.id, dropzoneId },
          });
        }

        // Create QR token for check-in
        const { createHmac } = await import("crypto");
        const tokenPayload = { userId: user.id, type: "walkin" };
        const hmac = createHmac("sha256", process.env.JWT_SECRET || "secret")
          .update(JSON.stringify(tokenPayload))
          .digest("hex");
        await fastify.prisma.qrToken.create({
          data: {
            userId: user.id,
            dropzoneId,
            tokenType: "PERMANENT",
            payload: tokenPayload,
            hmacSignature: hmac,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user!.sub)),
          dropzoneId,
          action: "CREATE",
          entityType: "User",
          entityId: user.id,
          afterState: { source: "walk-in", jumpType: body.jumpType },
        });

        reply.code(201).send({
          success: true,
          data: {
            userId: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: body.email ? user.email : undefined,
            jumpType: body.jumpType || "TANDEM",
            message: body.email
              ? "Walk-in registered. They can set a password via email."
              : "Walk-in registered as temporary profile.",
          },
        });
      } catch (error: any) {
        if (error?.code === "P2002") {
          reply.code(409).send({ success: false, error: "Email already registered" });
        } else {
          reply.code(500).send({ success: false, error: "Failed to register walk-in" });
        }
      }
    }
  );

  // ==========================================================================
  // /jumpers/me — Aliases for mobile app compatibility
  // ==========================================================================

  // GET /jumpers/me → same as GET /users/me
  fastify.get(
    "/jumpers/me",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: { include: { role: true } },
            emergencyProfile: true,
            profile: true,
            wallets: true,
          },
        });
        if (!user) throw new NotFoundError("User");

        // Fetch athlete record if exists
        const athlete = await fastify.prisma.athlete.findUnique({
          where: { userId },
        }).catch(() => null);

        reply.code(200).send({
          success: true,
          data: {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            status: user.status,
            roles: user.userRoles.map((ur) => ({
              role: ur.role.name,
              dropzoneId: ur.dropzoneId,
              organizationId: ur.organizationId,
            })),
            profile: user.profile
              ? {
                  avatar: user.profile.avatar,
                  dateOfBirth: user.profile.dateOfBirth,
                  weight: (user.emergencyProfile as any)?.weightLbs || null,
                  nationality: user.profile.nationality,
                }
              : null,
            athlete: athlete
              ? {
                  licenseLevel: athlete.licenseLevel,
                  totalJumps: athlete.totalJumps,
                  lastJumpDate: athlete.lastJumpDate,
                  homeDropzoneId: athlete.homeDropzoneId,
                }
              : null,
            emergencyProfile: user.emergencyProfile,
            wallets: user.wallets,
          },
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch profile" });
      }
    }
  );

  // PATCH /jumpers/me → same as PATCH /users/me
  fastify.patch(
    "/jumpers/me",
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const body = request.body as any;
        const userUpdate: any = {};
        if (body.firstName) userUpdate.firstName = body.firstName;
        if (body.lastName) userUpdate.lastName = body.lastName;
        if (body.phone !== undefined) userUpdate.phone = body.phone;

        const user = await fastify.prisma.user.update({
          where: { id: userId },
          data: userUpdate,
        });
        reply.code(200).send({ success: true, data: user });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to update profile" });
      }
    }
  );

  // GET /jumpers/me/dropzones — list dropzones the user belongs to
  fastify.get(
    "/jumpers/me/dropzones",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const roles = await fastify.prisma.userRole.findMany({
          where: { userId },
          include: {
            dropzone: true,
          },
        });

        const dzMap = new Map<number, any>();
        for (const r of roles) {
          if (r.dropzone && !dzMap.has(r.dropzone.id)) {
            dzMap.set(r.dropzone.id, {
              id: r.dropzone.id,
              uuid: r.dropzone.uuid,
              name: r.dropzone.name,
              slug: r.dropzone.slug,
              icaoCode: r.dropzone.icaoCode,
              latitude: r.dropzone.latitude,
              longitude: r.dropzone.longitude,
              timezone: r.dropzone.timezone,
              currency: r.dropzone.currency,
            });
          }
        }
        reply.code(200).send({ success: true, data: Array.from(dzMap.values()) });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch dropzones" });
      }
    }
  );

  // GET /jumpers/me/gear — list user's gear
  fastify.get(
    "/jumpers/me/gear",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const gear = await fastify.prisma.gearItem.findMany({
          where: { ownerId: userId },
          orderBy: { createdAt: "desc" },
        });
        const mapped = gear.map((g) => ({
          id: g.id,
          type: g.gearType.charAt(0) + g.gearType.slice(1).toLowerCase(),
          brand: g.manufacturer,
          model: g.model,
          serialNumber: g.serialNumber,
          jumpsOnGear: 0,
          status: g.status === "ACTIVE" ? "Active" : g.status === "GROUNDED" ? "Grounded" : "In Repair",
          lastRePack: g.lastRepackAt?.toISOString() || null,
          lastInspection: null,
          aadExpiryDate: null,
        }));
        reply.code(200).send({ success: true, data: mapped });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch gear" });
      }
    }
  );

  // GET /jumpers/me/notifications — list user's notifications
  fastify.get(
    "/jumpers/me/notifications",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const notifications = await fastify.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        reply.code(200).send({ success: true, data: notifications });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch notifications" });
      }
    }
  );

  // GET /jumpers/me/documents — list user's documents
  fastify.get(
    "/jumpers/me/documents",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const docs = await fastify.prisma.document.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        reply.code(200).send({ success: true, data: docs });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch documents" });
      }
    }
  );

  // PATCH /jumpers/me/athlete — update athlete profile
  fastify.patch(
    "/jumpers/me/athlete",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const body = request.body as any;
        const athlete = await fastify.prisma.athlete.upsert({
          where: { userId },
          create: { userId, homeDropzoneId: body.homeDropzoneId, licenseLevel: body.licenseLevel || "NONE", totalJumps: body.totalJumps || 0 },
          update: body,
        });
        reply.code(200).send({ success: true, data: athlete });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to update athlete profile" });
      }
    }
  );

  // GET /jumpers/me/checkin-validation — validate if user can check in today
  fastify.get(
    "/jumpers/me/checkin-validation",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        if (!request.user) throw new NotFoundError("User");
        const userId = parseInt(String(request.user.sub));
        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          return reply.code(400).send({ success: false, error: "No dropzone selected" });
        }

        const blockers: Array<{ type: string; message: string }> = [];
        const warnings: Array<{ type: string; message: string }> = [];

        // Fetch user, athlete, waivers, and rigs in parallel
        const [user, athlete, waiverSigs, rigs] = await Promise.all([
          fastify.prisma.user.findUnique({ where: { id: userId } }),
          fastify.prisma.athlete.findUnique({ where: { userId } }),
          fastify.prisma.waiverSignature.findMany({
            where: { userId },
            include: { waiver: true },
          }),
          fastify.prisma.rig.findMany({
            where: { ownerUserId: userId },
            include: { reserve: true, aad: true },
          }),
        ]);

        // Account status
        if (!user || user.status !== "ACTIVE") {
          blockers.push({ type: "ACCOUNT_SUSPENDED", message: "Your account is not active. Contact the DZ." });
        }

        // License check
        if (!athlete || athlete.licenseLevel === "NONE") {
          blockers.push({ type: "LICENSE_MISSING", message: "No skydiving license on file." });
        }

        // Waiver check — require at least one signed waiver for DZ
        const dzWaivers = await fastify.prisma.waiver.findMany({ where: { dropzoneId } });
        if (dzWaivers.length > 0) {
          const signedWaiverIds = new Set(waiverSigs.map((s) => s.waiverId));
          const missingWaivers = dzWaivers.filter((w) => !signedWaiverIds.has(w.id));
          if (missingWaivers.length > 0) {
            blockers.push({ type: "WAIVER_MISSING", message: `${missingWaivers.length} required waiver(s) not signed.` });
          }

          // Waiver expiry check (waivers older than 1 year)
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const expiredSigs = waiverSigs.filter((s) => s.signedAt < oneYearAgo);
          if (expiredSigs.length > 0) {
            blockers.push({ type: "WAIVER_EXPIRED", message: `${expiredSigs.length} waiver(s) expired (older than 1 year).` });
          }

          // Expiring soon (within 30 days)
          const thirtyDaysOut = new Date();
          thirtyDaysOut.setFullYear(thirtyDaysOut.getFullYear() - 1);
          thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
          const expiringSigs = waiverSigs.filter((s) => s.signedAt >= oneYearAgo && s.signedAt < thirtyDaysOut);
          if (expiringSigs.length > 0) {
            warnings.push({ type: "WAIVER_EXPIRING", message: `${expiringSigs.length} waiver(s) expiring within 30 days.` });
          }
        }

        // Rig/gear checks
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        for (const rig of rigs) {
          if (rig.activeStatus !== "ACTIVE" || (rig.maintenanceStatus as string) === "GROUNDED") {
            blockers.push({ type: "GEAR_GROUNDED", message: `Rig "${rig.rigName}" is grounded.` });
          }
          if (rig.reserve?.repackDueDate) {
            const repackDate = new Date(rig.reserve.repackDueDate);
            if (repackDate < now) {
              blockers.push({ type: "RESERVE_OVERDUE", message: `Reserve repack overdue on "${rig.rigName}".` });
            } else if (repackDate < thirtyDaysFromNow) {
              warnings.push({ type: "REPACK_SOON", message: `Reserve repack due soon on "${rig.rigName}".` });
            }
          }
          if (rig.aad?.nextServiceDueDate) {
            const aadDate = new Date(rig.aad.nextServiceDueDate);
            if (aadDate < now) {
              blockers.push({ type: "AAD_EXPIRED", message: `AAD service overdue on "${rig.rigName}".` });
            } else if (aadDate < thirtyDaysFromNow) {
              warnings.push({ type: "AAD_EXPIRING", message: `AAD service due soon on "${rig.rigName}".` });
            }
          }
        }

        // Jump currency warning (no jump in 60+ days)
        if (athlete?.lastJumpDate) {
          const daysSinceJump = Math.floor((now.getTime() - new Date(athlete.lastJumpDate).getTime()) / 86400000);
          if (daysSinceJump > 60) {
            warnings.push({ type: "LOW_JUMP_CURRENCY", message: `Last jump was ${daysSinceJump} days ago. Consider a refresher.` });
          }
        }

        return reply.code(200).send({
          success: true,
          data: {
            canCheckin: blockers.length === 0,
            blockers,
            warnings,
          },
        });
      } catch (error) {
        return reply.code(500).send({ success: false, error: "Failed to validate check-in" });
      }
    }
  );
}
