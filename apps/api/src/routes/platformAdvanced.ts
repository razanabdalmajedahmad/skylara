import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

// ============================================================================
// PLATFORM ADVANCED ROUTES
// Command Center, Customer 360, Secure Impersonation, Unified Wallet,
// Reputation Engine, Cross-Facility Intelligence
// Protected: PLATFORM_ADMIN, SUPER_OWNER (unless noted otherwise)
// ============================================================================

/** Create SHA-256 checksum for audit log entry */
function auditChecksum(payload: any): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Write an audit log row — non-blocking, never breaks caller on failure */
async function writeAudit(
  prisma: any,
  opts: {
    userId: number;
    dropzoneId?: number;
    regionId?: number;
    facilityId?: number;
    action: string;
    entityType: string;
    entityId: number;
    afterState?: any;
  }
) {
  const afterState = opts.afterState ?? {};
  const checksum = auditChecksum({ ...opts, afterState });
  await prisma.auditLog
    .create({
      data: {
        userId: opts.userId,
        dropzoneId: opts.dropzoneId ?? null,
        regionId: opts.regionId ?? null,
        facilityId: opts.facilityId ?? null,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        afterState,
        checksum,
      },
    })
    .catch(() => {});
}

export async function platformAdvancedRoutes(fastify: FastifyInstance) {

  // ════════════════════════════════════════════════════════════════════════
  // 1. COMMAND CENTER
  // ════════════════════════════════════════════════════════════════════════

  // GET /platform/command-center — real-time operational overview
  fastify.get(
    "/platform/command-center",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const results = await Promise.allSettled([
          // [0] Active loads
          fastify.prisma.load.count({
            where: { status: { in: ["OPEN", "FILLING", "BOARDING", "LOCKED", "AIRBORNE"] } },
          }),
          // [1] Today's bookings
          fastify.prisma.booking.count({
            where: { scheduledDate: { gte: todayStart, lt: todayEnd } },
          }),
          // [2] Open incidents
          fastify.prisma.incident.count({
            where: { status: { in: ["REPORTED", "INVESTIGATING"] } },
          }),
          // [3] Active aircraft
          fastify.prisma.aircraft.count({
            where: { status: "ACTIVE" },
          }),
          // [4] Recent audit log entries
          fastify.prisma.auditLog.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          }),
          // [5] Facility status breakdown
          fastify.prisma.facility.groupBy({
            by: ["status"],
            _count: { id: true },
          }),
          // [6] Active user sessions (logged in within last 24h)
          fastify.prisma.user.count({
            where: { lastLoginAt: { gte: dayAgo } },
          }),
          // [7] Facility health list
          fastify.prisma.facility.findMany({
            take: 20,
            orderBy: { name: "asc" },
            select: { id: true, name: true, status: true },
          }),
        ]);

        const extract = (r: PromiseSettledResult<any>) =>
          r.status === "fulfilled" ? r.value : null;

        const facilityStatusRaw = extract(results[5]);
        const facilityStatus = Array.isArray(facilityStatusRaw)
          ? facilityStatusRaw.reduce((acc: Record<string, number>, s: any) => {
              acc[s.status] = s._count.id;
              return acc;
            }, {})
          : {};

        // Transform audit logs into activity feed
        const auditLogs = extract(results[4]) ?? [];
        const recentActivity = auditLogs.map((log: any) => ({
          id: String(log.id),
          action: log.action,
          entityType: log.entityType,
          timestamp: log.createdAt,
          actorName: log.user
            ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() || log.user.email
            : undefined,
        }));

        // Transform facility list into health array
        const facilityList = extract(results[7]) ?? [];
        const facilityHealth = facilityList.map((f: any) => ({
          id: f.id,
          name: f.name,
          status: f.status,
          activeLoads: 0,
          onlineStaff: 0,
        }));

        reply.send({
          success: true,
          data: {
            stats: {
              activeLoads: extract(results[0]) ?? 0,
              todaysBookings: extract(results[1]) ?? 0,
              openIncidents: extract(results[2]) ?? 0,
              activeAircraft: extract(results[3]) ?? 0,
              onlineUsers: extract(results[6]) ?? 0,
              activeFacilities: facilityStatus["ACTIVE"] ?? 0,
            },
            recentActivity,
            facilityHealth,
            generatedAt: now.toISOString(),
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load command center data";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════
  // 2. CUSTOMER 360
  // ════════════════════════════════════════════════════════════════════════

  // GET /platform/customers — search users across facilities
  fastify.get(
    "/platform/customers",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { search, facilityId, page, limit } = request.query as {
          search?: string;
          facilityId?: string;
          page?: string;
          limit?: string;
        };

        const take = Math.min(parseInt(limit || "25"), 100);
        const skip = (Math.max(parseInt(page || "1"), 1) - 1) * take;

        const where: any = {};

        if (search) {
          where.OR = [
            { email: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ];
        }

        if (facilityId) {
          // Filter users who have wallets, bookings, or roles at a dropzone linked to this facility
          const facility = await fastify.prisma.facility.findUnique({
            where: { id: parseInt(facilityId) },
            select: { dropzoneId: true },
          });
          if (facility?.dropzoneId) {
            where.wallets = { some: { dropzoneId: facility.dropzoneId } };
          }
        }

        const [users, total] = await Promise.all([
          fastify.prisma.user.findMany({
            where,
            include: {
              profile: true,
              userRoles: { include: { role: { select: { name: true, displayName: true } } } },
              wallets: { select: { id: true, balance: true, currency: true, dropzoneId: true } },
              athlete: { select: { id: true, totalJumps: true, licenseLevel: true, disciplines: true } },
              _count: {
                select: {
                  bookings: true,
                  slots: true,
                  incidents: true,
                  logbookEntries: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
          }),
          fastify.prisma.user.count({ where }),
        ]);

        const sanitized = users.map((u: any) => {
          const totalBalance = (u.wallets || []).reduce((sum: number, w: any) => sum + (Number(w.balance) || 0), 0);
          const roleNames = u.userRoles.map((ur: any) => ur.role?.displayName || ur.role?.name || "User");
          return {
            id: u.id,
            uuid: u.uuid,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            status: u.status,
            lastLogin: u.lastLoginAt,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
            profile: u.profile
              ? { avatar: u.profile.avatar, bio: u.profile.bio, dateOfBirth: u.profile.dateOfBirth }
              : null,
            roles: roleNames,
            totalJumps: u.athlete?.totalJumps ?? u._count?.logbookEntries ?? 0,
            walletBalance: totalBalance,
            wallets: u.wallets,
            athlete: u.athlete,
            counts: u._count,
          };
        });

        reply.send({
          success: true,
          data: sanitized,
          meta: { total, page: Math.max(parseInt(page || "1"), 1), limit: take, totalPages: Math.ceil(total / take) },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to search customers";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/customers/:id — full 360 view of a single user
  fastify.get(
    "/platform/customers/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = parseInt(id);

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            athlete: true,
            wallets: {
              include: {
                transactions: { take: 10, orderBy: { createdAt: "desc" } },
                dropzone: { select: { id: true, name: true } },
              },
            },
            userRoles: {
              include: { role: { select: { id: true, name: true, displayName: true } } },
            },
            bookings: {
              take: 10,
              orderBy: { createdAt: "desc" },
              include: { dropzone: { select: { id: true, name: true } } },
            },
            logbookEntries: {
              take: 10,
              orderBy: { createdAt: "desc" },
            },
            waiverSignatures: {
              take: 10,
              orderBy: { signedAt: "desc" },
            },
            incidents: {
              take: 10,
              orderBy: { createdAt: "desc" },
            },
            facilityReviews: {
              take: 10,
              orderBy: { createdAt: "desc" },
              include: { facility: { select: { id: true, name: true } } },
            },
          },
        });

        if (!user) {
          reply.code(404).send({ success: false, error: "User not found" });
          return;
        }

        // Calculate aggregated stats
        const [totalSpendResult, totalJumpsCount, facilitiesVisited] = await Promise.all([
          // Total spend: sum of all DEBIT transactions across wallets
          fastify.prisma.transaction.aggregate({
            where: { wallet: { userId }, type: "DEBIT" },
            _sum: { amount: true },
          }),
          // Total logbook entries (actual jumps)
          fastify.prisma.logbookEntry.count({ where: { userId } }),
          // Distinct dropzones visited via logbook
          fastify.prisma.logbookEntry.groupBy({
            by: ["dropzoneId"],
            where: { userId },
          }),
        ]);

        const stats = {
          totalSpendCents: totalSpendResult._sum.amount ?? 0,
          totalJumps: user.athlete?.totalJumps ?? totalJumpsCount,
          logbookEntries: totalJumpsCount,
          facilitiesVisited: facilitiesVisited.length,
          totalBookings: await fastify.prisma.booking.count({ where: { userId } }),
          totalIncidents: await fastify.prisma.incident.count({ where: { reportedById: userId } }),
          totalWaivers: await fastify.prisma.waiverSignature.count({ where: { userId } }),
          accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        };

        const roleNames = user.userRoles.map((ur: any) => ur.role?.displayName || ur.role?.name || "User");

        reply.send({
          success: true,
          data: {
            id: user.id,
            uuid: user.uuid,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            emailVerifiedAt: user.emailVerifiedAt,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            profile: user.profile,
            athlete: user.athlete,
            athleteData: user.athlete
              ? { licenseNumber: user.athlete.uspaMemberId || '', jumpCount: user.athlete.totalJumps, rating: user.athlete.licenseLevel }
              : null,
            wallets: (user.wallets || []).map((w: any) => ({
              ...w,
              facilityName: w.dropzone?.name || "General",
              balance: Number(w.balance) || 0,
              currency: w.currency || "USD",
            })),
            roles: roleNames,
            rolesDetailed: user.userRoles.map((ur: any) => ({
              id: ur.id,
              roleName: ur.role?.name,
              displayName: ur.role?.displayName,
              dropzoneId: ur.dropzoneId,
              organizationId: ur.organizationId,
            })),
            stats: {
              ...stats,
              totalBookings: stats.totalBookings,
              totalJumps: stats.totalJumps,
              totalIncidents: stats.totalIncidents,
            },
            recentBookings: (user.bookings || []).map((b: any) => ({
              id: b.id,
              date: b.scheduledDate || b.createdAt,
              type: b.type || "STANDARD",
              status: b.status,
              facilityName: b.dropzone?.name || "Unknown",
            })),
            logbookEntries: user.logbookEntries,
            waiverSignatures: user.waiverSignatures,
            incidents: user.incidents,
            facilityReviews: user.facilityReviews,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load customer profile";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════
  // 3. SECURE IMPERSONATION
  // ════════════════════════════════════════════════════════════════════════

  // POST /platform/impersonate/start — begin impersonation session
  fastify.post(
    "/platform/impersonate/start",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actorId = parseInt((request.user as any).sub);
        const body = request.body as {
          targetUserId: number;
          reason: string;
          targetFacilityId?: number;
        };

        if (!body.targetUserId || !body.reason) {
          reply.code(400).send({ success: false, error: "targetUserId and reason are required" });
          return;
        }

        if (body.targetUserId === actorId) {
          reply.code(400).send({ success: false, error: "Cannot impersonate yourself" });
          return;
        }

        // Check target user exists
        const targetUser = await fastify.prisma.user.findUnique({
          where: { id: body.targetUserId },
          select: { id: true, email: true, firstName: true, lastName: true },
        });

        if (!targetUser) {
          reply.code(404).send({ success: false, error: "Target user not found" });
          return;
        }

        // Check target user roles — cannot impersonate PLATFORM_ADMIN
        const targetRoles = await fastify.prisma.userRole.findMany({
          where: { userId: body.targetUserId },
          include: { role: true },
        });

        const targetRoleNames = targetRoles.map((tr: any) => tr.role?.name).filter(Boolean);
        if (targetRoleNames.includes("PLATFORM_ADMIN") || targetRoleNames.includes("SUPER_OWNER")) {
          reply.code(403).send({
            success: false,
            error: "Cannot impersonate a PLATFORM_ADMIN or SUPER_OWNER",
          });
          return;
        }

        // Verify facility exists if provided
        if (body.targetFacilityId) {
          const facility = await fastify.prisma.facility.findUnique({
            where: { id: body.targetFacilityId },
          });
          if (!facility) {
            reply.code(404).send({ success: false, error: "Target facility not found" });
            return;
          }
        }

        // Create impersonation session
        const session = await fastify.prisma.impersonationSession.create({
          data: {
            actorUserId: actorId,
            targetUserId: body.targetUserId,
            targetFacilityId: body.targetFacilityId || null,
            reason: body.reason,
            active: true,
            startedAt: new Date(),
            ipAddress: request.ip || null,
            userAgent: request.headers["user-agent"] || null,
          },
          include: {
            actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        });

        // Generate JWT for target user with impersonation claims
        const token = fastify.jwt.sign(
          {
            sub: String(body.targetUserId),
            email: targetUser.email,
            roles: targetRoleNames,
            type: "access",
            impersonatedBy: actorId,
            impersonationSessionId: session.id,
          } as any,
          { expiresIn: "1h" }
        );

        // Audit log
        await writeAudit(fastify.prisma, {
          userId: actorId,
          facilityId: body.targetFacilityId,
          action: "IMPERSONATION_START",
          entityType: "ImpersonationSession",
          entityId: session.id,
          afterState: {
            actorUserId: actorId,
            targetUserId: body.targetUserId,
            reason: body.reason,
            targetFacilityId: body.targetFacilityId,
          },
        });

        reply.code(201).send({
          success: true,
          data: { session, token },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start impersonation";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // POST /platform/impersonate/end — end impersonation session
  fastify.post(
    "/platform/impersonate/end",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actorId = parseInt((request.user as any).sub);
        const body = request.body as { sessionId: number };

        if (!body.sessionId) {
          reply.code(400).send({ success: false, error: "sessionId is required" });
          return;
        }

        const session = await fastify.prisma.impersonationSession.findUnique({
          where: { id: body.sessionId },
        });

        if (!session) {
          reply.code(404).send({ success: false, error: "Impersonation session not found" });
          return;
        }

        if (!session.active) {
          reply.code(409).send({ success: false, error: "Impersonation session is already ended" });
          return;
        }

        const updated = await fastify.prisma.impersonationSession.update({
          where: { id: body.sessionId },
          data: {
            active: false,
            endedAt: new Date(),
          },
          include: {
            actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        });

        await writeAudit(fastify.prisma, {
          userId: actorId,
          facilityId: session.targetFacilityId || undefined,
          action: "IMPERSONATION_END",
          entityType: "ImpersonationSession",
          entityId: session.id,
          afterState: {
            sessionId: session.id,
            endedAt: updated.endedAt,
            durationMs: updated.endedAt
              ? new Date(updated.endedAt).getTime() - new Date(session.startedAt).getTime()
              : null,
          },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to end impersonation";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/impersonate/sessions — list impersonation history
  fastify.get(
    "/platform/impersonate/sessions",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { active, page, limit } = request.query as {
          active?: string;
          page?: string;
          limit?: string;
        };

        const take = Math.min(parseInt(limit || "25"), 100);
        const skip = (Math.max(parseInt(page || "1"), 1) - 1) * take;

        const where: any = {};
        if (active === "true") where.active = true;
        if (active === "false") where.active = false;

        const [sessions, total] = await Promise.all([
          fastify.prisma.impersonationSession.findMany({
            where,
            include: {
              actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
              targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
              targetFacility: { select: { id: true, name: true, category: true } },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
          }),
          fastify.prisma.impersonationSession.count({ where }),
        ]);

        reply.send({
          success: true,
          data: sessions,
          meta: { total, page: Math.max(parseInt(page || "1"), 1), limit: take, totalPages: Math.ceil(total / take) },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list impersonation sessions";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════
  // 4. UNIFIED WALLET
  // ════════════════════════════════════════════════════════════════════════

  // GET /platform/wallets — list all wallets across facilities with user info
  fastify.get(
    "/platform/wallets",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId, minBalance, page, limit } = request.query as {
          userId?: string;
          minBalance?: string;
          page?: string;
          limit?: string;
        };

        const take = Math.min(parseInt(limit || "25"), 100);
        const skip = (Math.max(parseInt(page || "1"), 1) - 1) * take;

        const where: any = {};
        if (userId) where.userId = parseInt(userId);
        if (minBalance) where.balance = { gte: parseInt(minBalance) };

        const [wallets, total] = await Promise.all([
          fastify.prisma.wallet.findMany({
            where,
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
              dropzone: { select: { id: true, name: true } },
            },
            orderBy: { balance: "desc" },
            take,
            skip,
          }),
          fastify.prisma.wallet.count({ where }),
        ]);

        reply.send({
          success: true,
          data: wallets,
          meta: { total, page: Math.max(parseInt(page || "1"), 1), limit: take, totalPages: Math.ceil(total / take) },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list wallets";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // POST /platform/wallets/transfer — cross-facility wallet transfer
  fastify.post(
    "/platform/wallets/transfer",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actorId = parseInt((request.user as any).sub);
        const body = request.body as {
          sourceWalletId: number;
          targetWalletId: number;
          amount: number;
          reason: string;
        };

        if (!body.sourceWalletId || !body.targetWalletId || !body.amount || !body.reason) {
          reply.code(400).send({
            success: false,
            error: "sourceWalletId, targetWalletId, amount, and reason are required",
          });
          return;
        }

        if (body.amount <= 0) {
          reply.code(400).send({ success: false, error: "Amount must be positive (in cents)" });
          return;
        }

        if (body.sourceWalletId === body.targetWalletId) {
          reply.code(400).send({ success: false, error: "Source and target wallets must be different" });
          return;
        }

        // Validate both wallets exist
        const [sourceWallet, targetWallet] = await Promise.all([
          fastify.prisma.wallet.findUnique({ where: { id: body.sourceWalletId } }),
          fastify.prisma.wallet.findUnique({ where: { id: body.targetWalletId } }),
        ]);

        if (!sourceWallet) {
          reply.code(404).send({ success: false, error: "Source wallet not found" });
          return;
        }
        if (!targetWallet) {
          reply.code(404).send({ success: false, error: "Target wallet not found" });
          return;
        }

        if (sourceWallet.balance < body.amount) {
          reply.code(422).send({
            success: false,
            error: `Insufficient balance. Source wallet has ${sourceWallet.balance} cents, transfer requires ${body.amount} cents`,
          });
          return;
        }

        // Atomic transaction
        const transfer = await fastify.prisma.$transaction(async (tx: any) => {
          // 1. Decrement source wallet
          const updatedSource = await tx.wallet.update({
            where: { id: body.sourceWalletId },
            data: { balance: { decrement: body.amount } },
          });

          // 2. Increment target wallet
          const updatedTarget = await tx.wallet.update({
            where: { id: body.targetWalletId },
            data: { balance: { increment: body.amount } },
          });

          // 3. Create DEBIT transaction on source wallet
          await tx.transaction.create({
            data: {
              uuid: crypto.randomUUID(),
              walletId: body.sourceWalletId,
              type: "DEBIT",
              amount: body.amount,
              balanceAfter: updatedSource.balance,
              description: `Transfer out: ${body.reason}`,
              referenceType: "WalletTransfer",
            },
          });

          // 4. Create CREDIT transaction on target wallet
          await tx.transaction.create({
            data: {
              uuid: crypto.randomUUID(),
              walletId: body.targetWalletId,
              type: "CREDIT",
              amount: body.amount,
              balanceAfter: updatedTarget.balance,
              description: `Transfer in: ${body.reason}`,
              referenceType: "WalletTransfer",
            },
          });

          // 5. Create WalletTransfer record
          const walletTransfer = await tx.walletTransfer.create({
            data: {
              uuid: crypto.randomUUID(),
              sourceWalletId: body.sourceWalletId,
              targetWalletId: body.targetWalletId,
              amount: body.amount,
              currency: sourceWallet.currency,
              reason: body.reason,
              status: "COMPLETED",
              initiatedBy: actorId,
              completedAt: new Date(),
            },
            include: {
              sourceWallet: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true } },
                  dropzone: { select: { id: true, name: true } },
                },
              },
              targetWallet: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true } },
                  dropzone: { select: { id: true, name: true } },
                },
              },
            },
          });

          return walletTransfer;
        });

        // Audit log (outside transaction — non-blocking)
        await writeAudit(fastify.prisma, {
          userId: actorId,
          action: "WALLET_TRANSFER",
          entityType: "WalletTransfer",
          entityId: transfer.id,
          afterState: {
            sourceWalletId: body.sourceWalletId,
            targetWalletId: body.targetWalletId,
            amount: body.amount,
            reason: body.reason,
            currency: transfer.currency,
          },
        });

        reply.code(201).send({ success: true, data: transfer });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wallet transfer failed";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/wallets/transfers — list transfer history
  fastify.get(
    "/platform/wallets/transfers",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { status, page, limit } = request.query as {
          status?: string;
          page?: string;
          limit?: string;
        };

        const take = Math.min(parseInt(limit || "25"), 100);
        const skip = (Math.max(parseInt(page || "1"), 1) - 1) * take;

        const where: any = {};
        if (status) where.status = status;

        const [transfers, total] = await Promise.all([
          fastify.prisma.walletTransfer.findMany({
            where,
            include: {
              sourceWallet: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true } },
                  dropzone: { select: { id: true, name: true } },
                },
              },
              targetWallet: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true } },
                  dropzone: { select: { id: true, name: true } },
                },
              },
              initiator: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
          }),
          fastify.prisma.walletTransfer.count({ where }),
        ]);

        reply.send({
          success: true,
          data: transfers,
          meta: { total, page: Math.max(parseInt(page || "1"), 1), limit: take, totalPages: Math.ceil(total / take) },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list wallet transfers";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════
  // 5. REPUTATION ENGINE
  // ════════════════════════════════════════════════════════════════════════

  // POST /platform/reviews — submit facility review (any authenticated user)
  fastify.post(
    "/platform/reviews",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = parseInt((request.user as any).sub);
        const body = request.body as {
          facilityId: number;
          rating: number;
          title?: string;
          body?: string;
          category?: string;
        };

        if (!body.facilityId || !body.rating) {
          reply.code(400).send({ success: false, error: "facilityId and rating are required" });
          return;
        }

        if (body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)) {
          reply.code(400).send({ success: false, error: "Rating must be an integer between 1 and 5" });
          return;
        }

        const validCategories = ["safety", "service", "value", "amenities", "overall"];
        if (body.category && !validCategories.includes(body.category)) {
          reply.code(400).send({
            success: false,
            error: `Category must be one of: ${validCategories.join(", ")}`,
          });
          return;
        }

        // Verify facility exists
        const facility = await fastify.prisma.facility.findUnique({
          where: { id: body.facilityId },
        });
        if (!facility) {
          reply.code(404).send({ success: false, error: "Facility not found" });
          return;
        }

        // Check for existing review (unique constraint: facilityId + userId)
        const existing = await fastify.prisma.facilityReview.findUnique({
          where: { facilityId_userId: { facilityId: body.facilityId, userId } },
        });
        if (existing) {
          reply.code(409).send({
            success: false,
            error: "You have already reviewed this facility. Update your existing review instead.",
          });
          return;
        }

        // Create review
        const review = await fastify.prisma.facilityReview.create({
          data: {
            facilityId: body.facilityId,
            userId,
            rating: body.rating,
            title: body.title || null,
            body: body.body || null,
            category: body.category || "overall",
            status: "PUBLISHED",
          },
          include: {
            facility: { select: { id: true, name: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        // Recalculate ReputationScore for this facility
        const allReviews = await fastify.prisma.facilityReview.findMany({
          where: { facilityId: body.facilityId, status: "PUBLISHED" },
          select: { rating: true, category: true },
        });

        const reviewCount = allReviews.length;
        const avgRating = reviewCount > 0
          ? allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
          : 0;

        // Per-category averages
        const categoryScores: Record<string, { sum: number; count: number }> = {};
        for (const r of allReviews) {
          const cat = r.category || "overall";
          if (!categoryScores[cat]) categoryScores[cat] = { sum: 0, count: 0 };
          categoryScores[cat].sum += r.rating;
          categoryScores[cat].count += 1;
        }

        const safetyAvg = categoryScores["safety"]
          ? categoryScores["safety"].sum / categoryScores["safety"].count
          : null;
        const serviceAvg = categoryScores["service"]
          ? categoryScores["service"].sum / categoryScores["service"].count
          : null;
        const valueAvg = categoryScores["value"]
          ? categoryScores["value"].sum / categoryScores["value"].count
          : null;

        // Determine trust level by review count
        let trustLevel: string;
        if (reviewCount < 5) trustLevel = "NEW";
        else if (reviewCount < 20) trustLevel = "STANDARD";
        else if (reviewCount < 50) trustLevel = "TRUSTED";
        else if (reviewCount < 100) trustLevel = "VERIFIED";
        else trustLevel = "ELITE";

        await fastify.prisma.reputationScore.upsert({
          where: { entityType_entityId: { entityType: "facility", entityId: body.facilityId } },
          create: {
            entityType: "facility",
            entityId: body.facilityId,
            overallScore: parseFloat(avgRating.toFixed(2)),
            totalReviews: reviewCount,
            safetyScore: safetyAvg !== null ? parseFloat(safetyAvg.toFixed(2)) : null,
            serviceScore: serviceAvg !== null ? parseFloat(serviceAvg.toFixed(2)) : null,
            valueScore: valueAvg !== null ? parseFloat(valueAvg.toFixed(2)) : null,
            trustLevel,
            lastCalculatedAt: new Date(),
          },
          update: {
            overallScore: parseFloat(avgRating.toFixed(2)),
            totalReviews: reviewCount,
            safetyScore: safetyAvg !== null ? parseFloat(safetyAvg.toFixed(2)) : null,
            serviceScore: serviceAvg !== null ? parseFloat(serviceAvg.toFixed(2)) : null,
            valueScore: valueAvg !== null ? parseFloat(valueAvg.toFixed(2)) : null,
            trustLevel,
            lastCalculatedAt: new Date(),
          },
        });

        await writeAudit(fastify.prisma, {
          userId,
          facilityId: body.facilityId,
          action: "REVIEW_CREATE",
          entityType: "FacilityReview",
          entityId: review.id,
          afterState: { rating: body.rating, category: body.category || "overall", facilityId: body.facilityId },
        });

        reply.code(201).send({ success: true, data: review });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit review";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/reviews — list reviews (filterable)
  fastify.get(
    "/platform/reviews",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { facilityId, rating, status, page, limit } = request.query as {
          facilityId?: string;
          rating?: string;
          status?: string;
          page?: string;
          limit?: string;
        };

        const take = Math.min(parseInt(limit || "25"), 100);
        const skip = (Math.max(parseInt(page || "1"), 1) - 1) * take;

        const where: any = {};
        if (facilityId) where.facilityId = parseInt(facilityId);
        if (rating) where.rating = parseInt(rating);
        if (status) where.status = status;

        const [reviews, total] = await Promise.all([
          fastify.prisma.facilityReview.findMany({
            where,
            include: {
              facility: { select: { id: true, name: true, category: true } },
              user: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
          }),
          fastify.prisma.facilityReview.count({ where }),
        ]);

        const mapped = reviews.map((r: any) => ({
          id: r.id,
          facilityName: r.facility?.name || `Facility #${r.facilityId}`,
          userName: r.user ? `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim() || "Anonymous" : "Anonymous",
          rating: r.rating,
          title: r.title || "",
          body: r.body || "",
          status: r.status,
          category: r.category,
          createdAt: r.createdAt,
          facilityId: r.facilityId,
          userId: r.userId,
        }));

        reply.send({
          success: true,
          data: mapped,
          meta: { total, page: Math.max(parseInt(page || "1"), 1), limit: take, totalPages: Math.ceil(total / take) },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list reviews";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // PATCH /platform/reviews/:id/moderate — moderate a review
  fastify.patch(
    "/platform/reviews/:id/moderate",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const actorId = parseInt((request.user as any).sub);
        const body = request.body as { status: string; facilityResponse?: string };

        if (!body.status) {
          reply.code(400).send({ success: false, error: "status is required" });
          return;
        }

        const validStatuses = ["PUBLISHED", "HIDDEN", "FLAGGED", "PENDING"];
        if (!validStatuses.includes(body.status)) {
          reply.code(400).send({
            success: false,
            error: `Status must be one of: ${validStatuses.join(", ")}`,
          });
          return;
        }

        const existing = await fastify.prisma.facilityReview.findUnique({
          where: { id: parseInt(id) },
        });
        if (!existing) {
          reply.code(404).send({ success: false, error: "Review not found" });
          return;
        }

        const updateData: any = { status: body.status };
        if (body.facilityResponse !== undefined) {
          updateData.facilityResponse = body.facilityResponse;
          updateData.respondedAt = new Date();
          updateData.respondedBy = actorId;
        }

        const review = await fastify.prisma.facilityReview.update({
          where: { id: parseInt(id) },
          data: updateData,
          include: {
            facility: { select: { id: true, name: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        // Recalculate reputation after moderation (status change affects published set)
        const publishedReviews = await fastify.prisma.facilityReview.findMany({
          where: { facilityId: existing.facilityId, status: "PUBLISHED" },
          select: { rating: true, category: true },
        });

        const reviewCount = publishedReviews.length;
        const avgRating = reviewCount > 0
          ? publishedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
          : 0;

        let trustLevel: string;
        if (reviewCount < 5) trustLevel = "NEW";
        else if (reviewCount < 20) trustLevel = "STANDARD";
        else if (reviewCount < 50) trustLevel = "TRUSTED";
        else if (reviewCount < 100) trustLevel = "VERIFIED";
        else trustLevel = "ELITE";

        await fastify.prisma.reputationScore.upsert({
          where: { entityType_entityId: { entityType: "facility", entityId: existing.facilityId } },
          create: {
            entityType: "facility",
            entityId: existing.facilityId,
            overallScore: parseFloat(avgRating.toFixed(2)),
            totalReviews: reviewCount,
            trustLevel,
            lastCalculatedAt: new Date(),
          },
          update: {
            overallScore: parseFloat(avgRating.toFixed(2)),
            totalReviews: reviewCount,
            trustLevel,
            lastCalculatedAt: new Date(),
          },
        });

        await writeAudit(fastify.prisma, {
          userId: actorId,
          facilityId: existing.facilityId,
          action: "REVIEW_MODERATE",
          entityType: "FacilityReview",
          entityId: existing.id,
          afterState: {
            previousStatus: existing.status,
            newStatus: body.status,
            facilityResponse: body.facilityResponse || null,
          },
        });

        reply.send({ success: true, data: review });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to moderate review";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/reputation — reputation scores leaderboard
  fastify.get(
    "/platform/reputation",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { page, limit } = request.query as { page?: string; limit?: string };

        const take = Math.min(parseInt(limit || "25"), 100);
        const skip = (Math.max(parseInt(page || "1"), 1) - 1) * take;

        const [scores, total] = await Promise.all([
          fastify.prisma.reputationScore.findMany({
            where: { entityType: "facility" },
            orderBy: { overallScore: "desc" },
            take,
            skip,
          }),
          fastify.prisma.reputationScore.count({ where: { entityType: "facility" } }),
        ]);

        // Enrich with facility info
        const facilityIds = scores.map((s: any) => s.entityId);
        const facilities = facilityIds.length > 0
          ? await fastify.prisma.facility.findMany({
              where: { id: { in: facilityIds } },
              select: { id: true, name: true, category: true, city: true, state: true, countryCode: true, regionId: true },
            })
          : [];

        const facilityMap = new Map(facilities.map((f: any) => [f.id, f]));

        const enriched = scores.map((s: any) => {
          const fac = facilityMap.get(s.entityId);
          return {
            id: s.entityId,
            name: fac?.name || `Facility #${s.entityId}`,
            overallScore: Number(s.overallScore) || 0,
            reviewCount: s.totalReviews || 0,
            trustLevel: s.trustLevel || "NEW",
            safetyScore: Number(s.safetyScore) || 0,
            serviceScore: Number(s.serviceScore) || 0,
            valueScore: Number(s.valueScore) || 0,
            facility: fac || null,
          };
        });

        reply.send({
          success: true,
          data: enriched,
          meta: { total, page: Math.max(parseInt(page || "1"), 1), limit: take, totalPages: Math.ceil(total / take) },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load reputation leaderboard";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/reputation/:entityType/:entityId — single entity reputation
  fastify.get(
    "/platform/reputation/:entityType/:entityId",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { entityType, entityId } = request.params as { entityType: string; entityId: string };

        const validEntityTypes = ["facility", "user", "organization"];
        if (!validEntityTypes.includes(entityType)) {
          reply.code(400).send({
            success: false,
            error: `entityType must be one of: ${validEntityTypes.join(", ")}`,
          });
          return;
        }

        const score = await fastify.prisma.reputationScore.findUnique({
          where: { entityType_entityId: { entityType, entityId: parseInt(entityId) } },
        });

        if (!score) {
          reply.code(404).send({ success: false, error: "Reputation score not found for this entity" });
          return;
        }

        // Fetch recent reviews if entity is a facility
        let recentReviews: any[] = [];
        if (entityType === "facility") {
          recentReviews = await fastify.prisma.facilityReview.findMany({
            where: { facilityId: parseInt(entityId), status: "PUBLISHED" },
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
        }

        reply.send({
          success: true,
          data: {
            score,
            recentReviews,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load reputation score";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════
  // 6. CROSS-FACILITY INTELLIGENCE
  // ════════════════════════════════════════════════════════════════════════

  // GET /platform/intelligence/overview — aggregated cross-facility metrics
  fastify.get(
    "/platform/intelligence/overview",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        const [
          revenueResult,
          totalUsers,
          totalFacilities,
          totalBookings,
        ] = await Promise.all([
          // Total revenue: sum of all DEBIT transactions
          fastify.prisma.transaction.aggregate({
            where: { type: "DEBIT" },
            _sum: { amount: true },
          }),
          fastify.prisma.user.count(),
          fastify.prisma.facility.count(),
          fastify.prisma.booking.count(),
        ]);

        // User growth: users created per month for last 6 months
        const userGrowth: Array<{ month: string; count: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const count = await fastify.prisma.user.count({
            where: { createdAt: { gte: monthStart, lt: monthEnd } },
          });
          userGrowth.push({
            month: monthStart.toISOString().slice(0, 7),
            count,
          });
        }

        // Facility utilization: bookings per dropzone (top 10)
        const bookingsByDropzone = await fastify.prisma.booking.groupBy({
          by: ["dropzoneId"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        });

        const dzIds = bookingsByDropzone.map((b: any) => b.dropzoneId);
        const dropzones = dzIds.length > 0
          ? await fastify.prisma.dropzone.findMany({
              where: { id: { in: dzIds } },
              select: { id: true, name: true },
            })
          : [];
        const dzMap = new Map(dropzones.map((d: any) => [d.id, d.name]));

        const facilityUtilization = bookingsByDropzone.map((b: any) => ({
          dropzoneId: b.dropzoneId,
          dropzoneName: dzMap.get(b.dropzoneId) || "Unknown",
          bookings: b._count.id,
        }));

        // Top facilities by rating
        const topByRating = await fastify.prisma.reputationScore.findMany({
          where: { entityType: "facility", totalReviews: { gte: 1 } },
          orderBy: { overallScore: "desc" },
          take: 10,
        });

        const topRatingFacilityIds = topByRating.map((s: any) => s.entityId);
        const topFacilities = topRatingFacilityIds.length > 0
          ? await fastify.prisma.facility.findMany({
              where: { id: { in: topRatingFacilityIds } },
              select: { id: true, name: true, category: true, city: true },
            })
          : [];
        const facilityNameMap = new Map(topFacilities.map((f: any) => [f.id, f]));

        const topByRatingEnriched = topByRating.map((s: any) => ({
          ...s,
          facility: facilityNameMap.get(s.entityId) || null,
        }));

        reply.send({
          success: true,
          data: {
            totalRevenueCents: revenueResult._sum.amount ?? 0,
            totalUsers,
            totalFacilities,
            totalBookings,
            userGrowth,
            facilityUtilization,
            topFacilitiesByRating: topByRatingEnriched,
            generatedAt: now.toISOString(),
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load intelligence overview";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  // GET /platform/intelligence/trends — time-series data for metrics
  fastify.get(
    "/platform/intelligence/trends",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { metric, period } = request.query as {
          metric?: string;
          period?: string;
        };

        const validMetrics = ["bookings", "users", "revenue", "incidents"];
        const selectedMetric = metric && validMetrics.includes(metric) ? metric : "bookings";

        const validPeriods = ["7d", "30d", "90d"];
        const selectedPeriod = period && validPeriods.includes(period) ? period : "30d";

        const periodDays = selectedPeriod === "7d" ? 7 : selectedPeriod === "90d" ? 90 : 30;
        const now = new Date();
        const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

        // Determine grouping: daily for 7d/30d, weekly for 90d
        const groupByWeek = periodDays === 90;

        let trendData: Array<{ date: string; value: number }> = [];

        // MySQL date formatting: daily = %Y-%m-%d, weekly = %x-W%v
        const dateFmt = groupByWeek ? '%x-W%v' : '%Y-%m-%d';

        const tableMap: Record<string, { table: string; dateCol: string; sumCol?: string; extraWhere?: string }> = {
          bookings: { table: "bookings", dateCol: "scheduledDate" },
          users: { table: "users", dateCol: "createdAt" },
          revenue: { table: "transactions", dateCol: "createdAt", sumCol: "amount", extraWhere: "AND type = 'DEBIT'" },
          incidents: { table: "incidents", dateCol: "createdAt" },
        };

        const cfg = tableMap[selectedMetric];
        if (cfg) {
          const aggExpr = cfg.sumCol ? `COALESCE(SUM(${cfg.sumCol}), 0)` : 'COUNT(*)';
          const extraWhere = cfg.extraWhere || '';
          const raw: any[] = await fastify.prisma.$queryRawUnsafe(
            `SELECT DATE_FORMAT(${cfg.dateCol}, '${dateFmt}') AS bucket,
                    ${aggExpr} AS value
             FROM ${cfg.table}
             WHERE ${cfg.dateCol} >= ?
             ${extraWhere}
             GROUP BY bucket
             ORDER BY bucket ASC`,
            periodStart
          );
          trendData = raw.map((r: any) => ({
            date: String(r.bucket),
            value: Number(r.value),
          }));
        }

        reply.send({
          success: true,
          data: {
            metric: selectedMetric,
            period: selectedPeriod,
            periodStart: periodStart.toISOString(),
            periodEnd: now.toISOString(),
            grouping: groupByWeek ? "weekly" : "daily",
            series: trendData,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load trend data";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );
}
