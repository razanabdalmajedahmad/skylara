/**
 * Reports & Export Routes
 * CSV export for loads, athletes, transactions, incidents
 * JSON report endpoints for dashboard analytics
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\n");
}

/** Parse date range from query params. Supports startDate/endDate aliases for from/to. */
function parseDateRangeFromQuery(query: {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  period?: string;
}): { from: Date; to: Date } {
  const fromStr = query.startDate || query.from;
  const toStr = query.endDate || query.to;
  const now = new Date();

  if (fromStr && toStr) {
    return { from: new Date(fromStr), to: new Date(toStr) };
  }

  switch (query.period) {
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start, to: now };
    }
    case "month": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { from: start, to: now };
    }
    case "year": {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { from: start, to: now };
    }
    default: {
      // Default: today
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    }
  }
}

/** Format hour as "8 AM" style string */
function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/** Get month abbreviation from month index (0-11) */
function monthAbbrev(monthIndex: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
}

/** Severity color mapping */
function severityColor(severity: string): string {
  switch (severity) {
    case "NEAR_MISS": return "bg-yellow-500";
    case "MINOR": return "bg-blue-500";
    case "MODERATE": return "bg-orange-500";
    case "SERIOUS": return "bg-red-500";
    case "FATAL": return "bg-red-900";
    default: return "bg-gray-500";
  }
}

/** Format severity label for display */
function severityLabel(severity: string): string {
  return severity.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Waiver type color mapping */
function waiverTypeColor(type: string): string {
  switch (type) {
    case "TANDEM": return "bg-blue-500";
    case "AFF": return "bg-green-500";
    case "EXPERIENCED": return "bg-purple-500";
    case "MINOR": return "bg-orange-500";
    case "SPECTATOR": return "bg-gray-500";
    case "MEDIA": return "bg-pink-500";
    default: return "bg-slate-500";
  }
}

/** Gear status color mapping */
function gearStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE": return "bg-emerald-500";
    case "GROUNDED": return "bg-red-500";
    case "RETIRED": return "bg-gray-500";
    case "IN_REPAIR": return "bg-yellow-500";
    default: return "bg-slate-500";
  }
}

/** Gear status display label */
function gearStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE": return "Serviceable";
    case "GROUNDED": return "Grounded";
    case "RETIRED": return "Retired";
    case "IN_REPAIR": return "In Repair";
    default: return status;
  }
}

export async function reportsRoutes(fastify: FastifyInstance) {
  // GET /reports/loads/csv — Export loads as CSV
  fastify.get<{
    Querystring: { date?: string; status?: string };
  }>(
    "/reports/loads/csv",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(request.user.dropzoneId, 10)
          : null;
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const query: any = { dropzoneId };
        if (request.query.status) query.status = request.query.status;
        if (request.query.date) {
          const d = new Date(request.query.date);
          const next = new Date(d);
          next.setDate(next.getDate() + 1);
          query.scheduledAt = { gte: d, lt: next };
        }

        const loads = await fastify.prisma.load.findMany({
          where: query,
          include: {
            aircraft: true,
            slots: { include: { user: true } },
          },
          orderBy: { scheduledAt: "desc" },
          take: 500,
        });

        const headers = [
          "Load #",
          "Status",
          "Aircraft",
          "Pilot ID",
          "Slots Filled",
          "Scheduled At",
          "Created At",
        ];
        const rows = loads.map((l) => [
          l.loadNumber,
          l.status,
          l.aircraft.registration,
          String(l.pilotId || ""),
          String(l.slots.length),
          l.scheduledAt?.toISOString() || "",
          l.createdAt.toISOString(),
        ]);

        const csv = toCSV(headers, rows);
        reply
          .header("Content-Type", "text/csv")
          .header(
            "Content-Disposition",
            `attachment; filename="loads-${new Date().toISOString().slice(0, 10)}.csv"`
          )
          .send(csv);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to export loads CSV" });
      }
    }
  );

  // GET /reports/athletes/csv — Export athletes via UserRole scoped to dropzone
  fastify.get(
    "/reports/athletes/csv",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(request.user.dropzoneId, 10)
          : null;
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        // Users belong to a dropzone through UserRole
        const userRoles = await fastify.prisma.userRole.findMany({
          where: { dropzoneId },
          include: {
            user: {
              include: { profile: true },
            },
          },
          take: 1000,
        });

        // Deduplicate by user ID (a user may have multiple roles at a DZ)
        const seen = new Set<number>();
        const users = userRoles
          .filter((ur) => {
            if (seen.has(ur.userId)) return false;
            seen.add(ur.userId);
            return true;
          })
          .map((ur) => ur.user);

        const headers = [
          "ID",
          "First Name",
          "Last Name",
          "Email",
          "Status",
          "Jump Count",
          "License #",
          "Created At",
        ];
        const rows = users.map((u) => [
          String(u.id),
          u.firstName,
          u.lastName,
          u.email,
          u.status,
          "", // jumpCount tracked elsewhere
          "", // license tracked elsewhere
          u.createdAt.toISOString(),
        ]);

        const csv = toCSV(headers, rows);
        reply
          .header("Content-Type", "text/csv")
          .header(
            "Content-Disposition",
            `attachment; filename="athletes-${new Date().toISOString().slice(0, 10)}.csv"`
          )
          .send(csv);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to export athletes CSV" });
      }
    }
  );

  // GET /reports/transactions/csv — Export transactions via Wallet scoped to dropzone
  fastify.get(
    "/reports/transactions/csv",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_MANAGER"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(request.user.dropzoneId, 10)
          : null;
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        // Transaction belongs to Wallet which has dropzoneId
        const txns = await fastify.prisma.transaction.findMany({
          where: {
            wallet: { dropzoneId },
          },
          include: {
            wallet: {
              include: { user: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });

        const headers = [
          "ID",
          "UUID",
          "User",
          "Type",
          "Amount",
          "Currency",
          "Balance After",
          "Description",
          "Created At",
        ];
        const rows = txns.map((t) => [
          String(t.id),
          t.uuid,
          t.wallet.user ? `${t.wallet.user.firstName} ${t.wallet.user.lastName}` : "",
          t.type,
          String(t.amount),
          t.wallet.currency,
          String(t.balanceAfter),
          t.description || "",
          t.createdAt.toISOString(),
        ]);

        const csv = toCSV(headers, rows);
        reply
          .header("Content-Type", "text/csv")
          .header(
            "Content-Disposition",
            `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`
          )
          .send(csv);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to export transactions CSV" });
      }
    }
  );

  // GET /reports/incidents/csv — Export incidents
  fastify.get(
    "/reports/incidents/csv",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_MANAGER", "SAFETY_OFFICER"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(request.user.dropzoneId, 10)
          : null;
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const incidents = await fastify.prisma.incident.findMany({
          where: { dropzoneId },
          include: { reportedBy: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        });

        const headers = [
          "ID",
          "UUID",
          "Severity",
          "Status",
          "Title",
          "Reported By",
          "Description",
          "Created At",
        ];
        const rows = incidents.map((i) => [
          String(i.id),
          i.uuid,
          i.severity,
          i.status,
          i.title,
          i.reportedBy
            ? `${i.reportedBy.firstName} ${i.reportedBy.lastName}`
            : "",
          i.description,
          i.createdAt.toISOString(),
        ]);

        const csv = toCSV(headers, rows);
        reply
          .header("Content-Type", "text/csv")
          .header(
            "Content-Disposition",
            `attachment; filename="incidents-${new Date().toISOString().slice(0, 10)}.csv"`
          )
          .send(csv);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to export incidents CSV" });
      }
    }
  );

  // GET /reports/summary — JSON summary for dashboard/reports page
  fastify.get(
    "/reports/summary",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = request.user?.dropzoneId
          ? parseInt(request.user.dropzoneId, 10)
          : null;
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
          totalLoadsToday,
          totalJumpersToday,
          activeStaff,
          incidentsThisMonth,
          revenueToday,
        ] = await Promise.all([
          fastify.prisma.load.count({
            where: {
              dropzoneId,
              scheduledAt: { gte: today, lt: tomorrow },
            },
          }),
          fastify.prisma.slot.count({
            where: {
              load: {
                dropzoneId,
                scheduledAt: { gte: today, lt: tomorrow },
              },
            },
          }),
          // Count staff = users who have a non-JUMPER role at this dropzone
          fastify.prisma.userRole.count({
            where: {
              dropzoneId,
              role: { name: { not: "JUMPER" } },
              user: { status: "ACTIVE" },
            },
          }),
          fastify.prisma.incident.count({
            where: {
              dropzoneId,
              createdAt: {
                gte: new Date(today.getFullYear(), today.getMonth(), 1),
              },
            },
          }),
          // Revenue = sum of CREDIT transactions for wallets at this dropzone
          fastify.prisma.transaction.aggregate({
            where: {
              wallet: { dropzoneId },
              createdAt: { gte: today, lt: tomorrow },
              type: "CREDIT",
            },
            _sum: { amount: true },
          }),
        ]);

        reply.code(200).send({
          success: true,
          data: {
            totalLoadsToday,
            totalJumpersToday,
            activeStaff,
            incidentsThisMonth,
            revenueToday: revenueToday._sum?.amount || 0,
            date: today.toISOString().slice(0, 10),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate reports summary" });
      }
    }
  );

  // ========================================================================
  // AGGREGATED REPORTS — Pre-computed with read replica + cache
  // ========================================================================

  // GET /reports/revenue — Revenue breakdown for a period
  // Accepts both from/to and startDate/endDate
  (fastify as any).get(
    "/reports/revenue",
    { preHandler: [authenticate, tenantScope, authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest<{ Querystring: { period?: string; from?: string; to?: string; startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) { reply.code(400).send({ success: false, error: "No dropzone" }); return; }
        const { ReportingAggregator } = await import("../services/reportingAggregator");
        const aggregator = new ReportingAggregator(fastify.prismaRead);
        const fromParam = request.query.startDate || request.query.from;
        const toParam = request.query.endDate || request.query.to;
        const range = ReportingAggregator.parseDateRange(request.query.period, fromParam, toParam);
        reply.send({ success: true, data: await aggregator.getRevenueReport(dropzoneId, range) });
      } catch (error) { fastify.log.error(error); reply.code(500).send({ success: false, error: "Failed to generate revenue report" }); }
    }
  );

  // GET /reports/utilization — Load utilization for a period
  // Accepts both from/to and startDate/endDate
  (fastify as any).get(
    "/reports/utilization",
    { preHandler: [authenticate, tenantScope, authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest<{ Querystring: { period?: string; from?: string; to?: string; startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) { reply.code(400).send({ success: false, error: "No dropzone" }); return; }
        const { ReportingAggregator } = await import("../services/reportingAggregator");
        const aggregator = new ReportingAggregator(fastify.prismaRead);
        const fromParam = request.query.startDate || request.query.from;
        const toParam = request.query.endDate || request.query.to;
        const range = ReportingAggregator.parseDateRange(request.query.period, fromParam, toParam);
        reply.send({ success: true, data: await aggregator.getLoadUtilization(dropzoneId, range) });
      } catch (error) { fastify.log.error(error); reply.code(500).send({ success: false, error: "Failed to generate utilization report" }); }
    }
  );

  // GET /reports/refunds — Refund reporting for a period
  // Accepts both from/to and startDate/endDate
  (fastify as any).get(
    "/reports/refunds",
    { preHandler: [authenticate, tenantScope, authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest<{ Querystring: { period?: string; from?: string; to?: string; startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) { reply.code(400).send({ success: false, error: "No dropzone" }); return; }
        const { ReportingAggregator } = await import("../services/reportingAggregator");
        const aggregator = new ReportingAggregator(fastify.prismaRead);
        const fromParam = request.query.startDate || request.query.from;
        const toParam = request.query.endDate || request.query.to;
        const range = ReportingAggregator.parseDateRange(request.query.period, fromParam, toParam);
        reply.send({ success: true, data: await aggregator.getRefundReport(dropzoneId, range) });
      } catch (error) { fastify.log.error(error); reply.code(500).send({ success: false, error: "Failed to generate refund report" }); }
    }
  );

  // GET /reports/operational — Operational daily summary
  // Accepts both from/to and startDate/endDate
  (fastify as any).get(
    "/reports/operational",
    { preHandler: [authenticate, tenantScope, authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest<{ Querystring: { period?: string; from?: string; to?: string; startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) { reply.code(400).send({ success: false, error: "No dropzone" }); return; }
        const { ReportingAggregator } = await import("../services/reportingAggregator");
        const aggregator = new ReportingAggregator(fastify.prismaRead);
        const fromParam = request.query.startDate || request.query.from;
        const toParam = request.query.endDate || request.query.to;
        const range = ReportingAggregator.parseDateRange(request.query.period, fromParam, toParam);
        reply.send({ success: true, data: await aggregator.getOperationalSummary(dropzoneId, range) });
      } catch (error) { fastify.log.error(error); reply.code(500).send({ success: false, error: "Failed to generate operational summary" }); }
    }
  );

  // ========================================================================
  // FRONTEND REPORT ENDPOINTS — Real data from Prisma models
  // ========================================================================

  // GET /reports/jumps — Jump analytics for a date range
  (fastify as any).get(
    "/reports/jumps",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; from?: string; to?: string; period?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const range = parseDateRangeFromQuery(request.query);

        // Get all slots in date range (JUMPED status = completed jumps)
        const slots = await fastify.prisma.slot.findMany({
          where: {
            load: {
              dropzoneId,
              scheduledAt: { gte: range.from, lte: range.to },
            },
            status: "JUMPED",
          },
          include: {
            load: { select: { scheduledAt: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        const totalJumps = slots.length;

        // Jumps by hour
        const hourBuckets: Record<number, number> = {};
        for (let h = 0; h < 24; h++) hourBuckets[h] = 0;
        for (const s of slots) {
          if (s.load.scheduledAt) {
            const hour = s.load.scheduledAt.getHours();
            hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
          }
        }
        const jumpsByHour = Object.entries(hourBuckets)
          .map(([h, count]) => ({ hour: formatHourLabel(Number(h)), jumps: count }))
          .filter((entry) => entry.jumps > 0);

        // Top jumpers — group by userId
        const jumperMap: Record<number, { name: string; jumps: number; type: string }> = {};
        for (const s of slots) {
          if (!s.userId || !s.user) continue;
          if (!jumperMap[s.userId]) {
            jumperMap[s.userId] = {
              name: `${s.user.firstName} ${s.user.lastName}`,
              jumps: 0,
              type: s.jumpType || s.slotType || "Fun",
            };
          }
          jumperMap[s.userId].jumps += 1;
        }
        const topJumpers = Object.values(jumperMap)
          .sort((a, b) => b.jumps - a.jumps)
          .slice(0, 10)
          .map((j) => ({
            name: j.name,
            jumps: j.jumps,
            revenue: 0, // Revenue per jumper would require joining transactions; leave as 0 for now
            type: j.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          }));

        // Payment methods — aggregate from transactions in this period
        const transactions = await fastify.prisma.transaction.findMany({
          where: {
            wallet: { dropzoneId },
            createdAt: { gte: range.from, lte: range.to },
            type: "CREDIT",
          },
          select: { amount: true, stripePaymentId: true, referenceType: true },
        });

        // Classify payment methods: if stripePaymentId exists it's Card, else Wallet
        let cardTotal = 0;
        let walletTotal = 0;
        for (const t of transactions) {
          if (t.stripePaymentId) {
            cardTotal += t.amount;
          } else {
            walletTotal += t.amount;
          }
        }
        const grandTotal = cardTotal + walletTotal;
        const paymentMethods: { method: string; amount: number; percent: number }[] = [];
        if (cardTotal > 0) {
          paymentMethods.push({
            method: "Card",
            amount: cardTotal,
            percent: grandTotal > 0 ? Math.round((cardTotal / grandTotal) * 100) : 0,
          });
        }
        if (walletTotal > 0) {
          paymentMethods.push({
            method: "Wallet",
            amount: walletTotal,
            percent: grandTotal > 0 ? Math.round((walletTotal / grandTotal) * 100) : 0,
          });
        }

        // Also populate revenue for top jumpers if we have transaction data
        // Link through PaymentIntent by userId for the same period
        const paymentIntents = await fastify.prisma.paymentIntent.findMany({
          where: {
            dropzoneId,
            createdAt: { gte: range.from, lte: range.to },
            status: "SUCCEEDED",
          },
          select: { userId: true, amount: true },
        });
        const revenueByUser: Record<number, number> = {};
        for (const pi of paymentIntents) {
          revenueByUser[pi.userId] = (revenueByUser[pi.userId] || 0) + pi.amount;
        }
        for (const j of topJumpers) {
          const userId = Object.entries(jumperMap).find(([_, v]) => v.name === j.name)?.[0];
          if (userId) {
            j.revenue = revenueByUser[Number(userId)] || 0;
          }
        }

        reply.send({
          success: true,
          totalJumps,
          jumpsByHour,
          topJumpers,
          paymentMethods,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate jumps report" });
      }
    }
  );

  // GET /reports/users — User summary stats
  (fastify as any).get(
    "/reports/users",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Total unique users at this dropzone
        const totalUsersResult = await fastify.prisma.userRole.findMany({
          where: { dropzoneId },
          select: { userId: true },
          distinct: ["userId"],
        });
        const totalUsers = totalUsersResult.length;

        // Active today: users who have a slot in a load scheduled today
        const activeTodayResult = await fastify.prisma.slot.findMany({
          where: {
            load: {
              dropzoneId,
              scheduledAt: { gte: today, lt: tomorrow },
            },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ["userId"],
        });
        const activeToday = activeTodayResult.length;

        // New this month: users whose UserRole was created this month for this DZ
        const newThisMonth = await fastify.prisma.userRole.count({
          where: {
            dropzoneId,
            createdAt: { gte: firstOfMonth },
          },
        });

        reply.send({
          success: true,
          totalUsers,
          activeToday,
          newThisMonth,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate users report" });
      }
    }
  );

  // GET /reports/safety — Safety/incident reporting for a date range
  (fastify as any).get(
    "/reports/safety",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "SAFETY_OFFICER"]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; from?: string; to?: string; period?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const range = parseDateRangeFromQuery(request.query);

        // Fetch incidents in date range
        const incidentRecords = await fastify.prisma.incident.findMany({
          where: {
            dropzoneId,
            createdAt: { gte: range.from, lte: range.to },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

        // Format incidents list
        const incidents = incidentRecords.map((inc) => ({
          id: `INC${String(inc.id).padStart(3, "0")}`,
          severity: severityLabel(inc.severity),
          date: inc.createdAt.toISOString().slice(0, 10),
          description: inc.title || inc.description.slice(0, 200),
          status: inc.status.charAt(0) + inc.status.slice(1).toLowerCase(),
        }));

        // Incidents by severity
        const severityCounts: Record<string, number> = {};
        for (const inc of incidentRecords) {
          severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
        }
        const incidentsBySeverity = Object.entries(severityCounts).map(([sev, count]) => ({
          severity: severityLabel(sev),
          count,
          color: severityColor(sev),
        }));

        // Incidents by month (across the full range)
        const monthCounts: Record<string, number> = {};
        for (const inc of incidentRecords) {
          const key = monthAbbrev(inc.createdAt.getMonth());
          monthCounts[key] = (monthCounts[key] || 0) + 1;
        }
        // Return in calendar order
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const incidentsByMonth = monthOrder
          .filter((m) => monthCounts[m])
          .map((m) => ({ month: m, incidents: monthCounts[m] }));

        reply.send({
          success: true,
          incidents,
          incidentsBySeverity,
          incidentsByMonth,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate safety report" });
      }
    }
  );

  // GET /reports/training — AFF training analytics
  (fastify as any).get(
    "/reports/training",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; from?: string; to?: string; period?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const range = parseDateRangeFromQuery(request.query);

        // AFF records in date range for this dropzone
        const affRecords = await fastify.prisma.affRecord.findMany({
          where: {
            dropzoneId,
            createdAt: { gte: range.from, lte: range.to },
          },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        // AFF students by level
        const levelCounts: Record<number, { count: number; students: Set<number> }> = {};
        for (const rec of affRecords) {
          if (!levelCounts[rec.level]) {
            levelCounts[rec.level] = { count: 0, students: new Set() };
          }
          levelCounts[rec.level].count += 1;
          levelCounts[rec.level].students.add(rec.studentId);
        }
        const affStudents = Object.entries(levelCounts)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([level, data]) => ({
            level: `Level ${level}`,
            count: data.students.size,
            avgTime: "N/A", // Would require tracking progression dates
          }));

        // Instructor workload — group by instructor
        const instructorMap: Record<number, { name: string; affJumps: number; tandems: number }> = {};

        for (const rec of affRecords) {
          if (!instructorMap[rec.instructorId]) {
            instructorMap[rec.instructorId] = {
              name: `${rec.instructor.firstName} ${rec.instructor.lastName}`,
              affJumps: 0,
              tandems: 0,
            };
          }
          instructorMap[rec.instructorId].affJumps += 1;
        }

        // Also count tandem slots for these instructors
        const instructorIds = Object.keys(instructorMap).map(Number);
        if (instructorIds.length > 0) {
          const tandemSlots = await fastify.prisma.slot.findMany({
            where: {
              instructorId: { in: instructorIds },
              slotType: "TANDEM_INSTRUCTOR",
              load: {
                dropzoneId,
                scheduledAt: { gte: range.from, lte: range.to },
              },
              status: "JUMPED",
            },
            select: { instructorId: true },
          });
          for (const ts of tandemSlots) {
            if (ts.instructorId && instructorMap[ts.instructorId]) {
              instructorMap[ts.instructorId].tandems += 1;
            }
          }
        }

        // Also find instructors who have tandem slots but no AFF records
        const tandemOnlySlots = await fastify.prisma.slot.findMany({
          where: {
            instructorId: { notIn: instructorIds.length > 0 ? instructorIds : [-1] },
            slotType: "TANDEM_INSTRUCTOR",
            load: {
              dropzoneId,
              scheduledAt: { gte: range.from, lte: range.to },
            },
            status: "JUMPED",
          },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        for (const ts of tandemOnlySlots) {
          if (ts.instructorId && ts.instructor) {
            if (!instructorMap[ts.instructorId]) {
              instructorMap[ts.instructorId] = {
                name: `${ts.instructor.firstName} ${ts.instructor.lastName}`,
                affJumps: 0,
                tandems: 0,
              };
            }
            instructorMap[ts.instructorId].tandems += 1;
          }
        }

        const instructorWorkload = Object.values(instructorMap)
          .map((iw) => ({
            instructor: iw.name,
            affJumps: iw.affJumps,
            tandems: iw.tandems,
            total: iw.affJumps + iw.tandems,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 20);

        reply.send({
          success: true,
          affStudents,
          instructorWorkload,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate training report" });
      }
    }
  );

  // GET /reports/waivers — Waiver analytics
  (fastify as any).get(
    "/reports/waivers",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; from?: string; to?: string; period?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const range = parseDateRangeFromQuery(request.query);

        // Get all waivers for this dropzone
        const waivers = await fastify.prisma.waiver.findMany({
          where: { dropzoneId, isActive: true },
          include: {
            signatures: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
              orderBy: { signedAt: "desc" },
            },
          },
        });

        // Build waiver type distribution
        const typeCounts: Record<string, number> = {};
        for (const w of waivers) {
          const count = w.signatures.length;
          typeCounts[w.waiverType] = (typeCounts[w.waiverType] || 0) + count;
        }
        const waiverTypeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
          type: type.charAt(0) + type.slice(1).toLowerCase(),
          count,
          color: waiverTypeColor(type),
        }));

        // Find expiring waivers — signatures older than 11 months (approaching 1-year expiry)
        const now = new Date();
        const elevenMonthsAgo = new Date(now);
        elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Get signatures that were signed 11-12 months ago (expiring soon)
        const expiringSignatures = await fastify.prisma.waiverSignature.findMany({
          where: {
            waiver: { dropzoneId, isActive: true },
            signedAt: { gte: oneYearAgo, lte: elevenMonthsAgo },
          },
          include: {
            user: { select: { firstName: true, lastName: true } },
            waiver: { select: { waiverType: true } },
          },
          orderBy: { signedAt: "asc" },
          take: 50,
        });

        const expiringWaivers = expiringSignatures.map((sig) => {
          const expiryDate = new Date(sig.signedAt);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          const daysUntilExpiry = Math.max(
            0,
            Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          );
          return {
            id: `W${String(sig.id).padStart(3, "0")}`,
            name: `${sig.user.firstName} ${sig.user.lastName}`,
            expiresIn: daysUntilExpiry,
            type: sig.waiver.waiverType.charAt(0) + sig.waiver.waiverType.slice(1).toLowerCase(),
          };
        });

        reply.send({
          success: true,
          expiringWaivers,
          waiverTypeDistribution,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate waivers report" });
      }
    }
  );

  // GET /reports/instructors — Instructor performance stats
  (fastify as any).get(
    "/reports/instructors",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "DZ_OPERATOR"]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; from?: string; to?: string; period?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const range = parseDateRangeFromQuery(request.query);

        // Find all instructor roles at this dropzone
        const instructorRoles = await fastify.prisma.userRole.findMany({
          where: {
            dropzoneId,
            role: {
              name: { in: ["TANDEM_INSTRUCTOR", "AFF_INSTRUCTOR", "INSTRUCTOR", "DZ_INSTRUCTOR"] },
            },
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        // Deduplicate instructors
        const instructorUserMap = new Map<number, { firstName: string; lastName: string }>();
        for (const ir of instructorRoles) {
          if (!instructorUserMap.has(ir.userId)) {
            instructorUserMap.set(ir.userId, {
              firstName: ir.user.firstName,
              lastName: ir.user.lastName,
            });
          }
        }

        const instructorIds = Array.from(instructorUserMap.keys());
        if (instructorIds.length === 0) {
          reply.send({ success: true, instructorStats: [] });
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all slots where these users are instructors in the date range
        const [rangeSlots, todaySlots, skills] = await Promise.all([
          fastify.prisma.slot.findMany({
            where: {
              instructorId: { in: instructorIds },
              load: {
                dropzoneId,
                scheduledAt: { gte: range.from, lte: range.to },
              },
              status: "JUMPED",
            },
            select: { instructorId: true, slotType: true },
          }),
          fastify.prisma.slot.findMany({
            where: {
              instructorId: { in: instructorIds },
              load: {
                dropzoneId,
                scheduledAt: { gte: today, lt: tomorrow },
              },
            },
            select: { instructorId: true },
          }),
          fastify.prisma.instructorSkill.findMany({
            where: {
              userId: { in: instructorIds },
            },
            select: { userId: true, rating: true },
          }),
        ]);

        // Build stats per instructor
        const statsMap: Record<number, { tandems: number; aff: number; jumpsToday: number; ratings: number[] }> = {};
        for (const uid of instructorIds) {
          statsMap[uid] = { tandems: 0, aff: 0, jumpsToday: 0, ratings: [] };
        }

        for (const s of rangeSlots) {
          if (!s.instructorId || !statsMap[s.instructorId]) continue;
          if (s.slotType === "TANDEM_INSTRUCTOR" || s.slotType === "TANDEM_PASSENGER") {
            statsMap[s.instructorId].tandems += 1;
          } else if (s.slotType === "AFF_INSTRUCTOR" || s.slotType === "AFF_STUDENT") {
            statsMap[s.instructorId].aff += 1;
          }
        }

        for (const s of todaySlots) {
          if (s.instructorId && statsMap[s.instructorId]) {
            statsMap[s.instructorId].jumpsToday += 1;
          }
        }

        for (const sk of skills) {
          if (sk.rating && statsMap[sk.userId]) {
            statsMap[sk.userId].ratings.push(sk.rating);
          }
        }

        const instructorStats = instructorIds.map((uid) => {
          const user = instructorUserMap.get(uid)!;
          const stat = statsMap[uid];
          const avgRating = stat.ratings.length > 0
            ? Math.round((stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length) * 10) / 10
            : 0;
          return {
            instructor: `${user.firstName} ${user.lastName}`,
            rating: avgRating,
            jumpsToday: stat.jumpsToday,
            tandems: stat.tandems,
            aff: stat.aff,
          };
        }).sort((a, b) => (b.tandems + b.aff) - (a.tandems + a.aff));

        reply.send({
          success: true,
          instructorStats,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate instructors report" });
      }
    }
  );

  // GET /reports/gear — Gear condition and inspection reporting
  (fastify as any).get(
    "/reports/gear",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "DZ_OPERATOR", "RIGGER"]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; from?: string; to?: string; period?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "No dropzone" });
          return;
        }

        const range = parseDateRangeFromQuery(request.query);

        // GearItem conditions — grouped by status
        const gearItems = await fastify.prisma.gearItem.findMany({
          where: { dropzoneId },
          select: { status: true },
        });

        const statusCounts: Record<string, number> = {};
        for (const g of gearItems) {
          statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
        }
        const gearCondition = Object.entries(statusCounts).map(([status, count]) => ({
          condition: gearStatusLabel(status),
          count,
          color: gearStatusColor(status),
        }));

        // Also include Rig maintenance status
        const rigs = await fastify.prisma.rig.findMany({
          where: { dropzoneId },
          select: { maintenanceStatus: true },
        });
        const rigStatusCounts: Record<string, number> = {};
        for (const r of rigs) {
          rigStatusCounts[r.maintenanceStatus] = (rigStatusCounts[r.maintenanceStatus] || 0) + 1;
        }
        // Map rig maintenance statuses to gear condition format
        const rigStatusMap: Record<string, { label: string; color: string }> = {
          OK: { label: "Rig OK", color: "bg-emerald-500" },
          DUE_SOON: { label: "Rig Due Soon", color: "bg-yellow-500" },
          DUE_NOW: { label: "Rig Due Now", color: "bg-orange-500" },
          OVERDUE: { label: "Rig Overdue", color: "bg-red-500" },
          GROUNDED: { label: "Rig Grounded", color: "bg-red-900" },
        };
        for (const [status, count] of Object.entries(rigStatusCounts)) {
          const mapping = rigStatusMap[status] || { label: status, color: "bg-gray-500" };
          gearCondition.push({ condition: mapping.label, count, color: mapping.color });
        }

        // Recent maintenance events (inspections) from Rig module
        const recentEvents = await fastify.prisma.maintenanceEvent.findMany({
          where: {
            rig: { dropzoneId },
            eventDate: { gte: range.from, lte: range.to },
          },
          include: {
            rig: {
              select: { rigName: true, serialNumber: true },
              include: {
                mainCanopy: { select: { manufacturer: true, model: true } },
              },
            },
          },
          orderBy: { eventDate: "desc" },
          take: 50,
        });

        const recentInspections = recentEvents.map((evt) => {
          const nextDue = new Date(evt.eventDate);
          nextDue.setFullYear(nextDue.getFullYear() + 1); // Default 1 year
          return {
            id: `MAIN-${String(evt.id).padStart(3, "0")}`,
            item: evt.rig.rigName || `Rig #${evt.rig.serialNumber || evt.id}`,
            type: evt.componentType.charAt(0) + evt.componentType.slice(1).toLowerCase().replace(/_/g, " "),
            lastInspected: evt.eventDate.toISOString().slice(0, 10),
            nextDue: nextDue.toISOString().slice(0, 10),
          };
        });

        // Also include GearCheck records as inspections
        const recentGearChecks = await fastify.prisma.gearCheck.findMany({
          where: {
            gearItem: { dropzoneId },
            checkedAt: { gte: range.from, lte: range.to },
          },
          include: {
            gearItem: {
              select: { serialNumber: true, gearType: true, manufacturer: true, model: true },
            },
          },
          orderBy: { checkedAt: "desc" },
          take: 50,
        });

        for (const gc of recentGearChecks) {
          const nextDue = new Date(gc.checkedAt);
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          recentInspections.push({
            id: `GC-${String(gc.id).padStart(3, "0")}`,
            item: `${gc.gearItem.manufacturer} ${gc.gearItem.model}`,
            type: gc.gearItem.gearType.charAt(0) + gc.gearItem.gearType.slice(1).toLowerCase(),
            lastInspected: gc.checkedAt.toISOString().slice(0, 10),
            nextDue: nextDue.toISOString().slice(0, 10),
          });
        }

        // Sort combined inspections by lastInspected desc
        recentInspections.sort((a, b) => b.lastInspected.localeCompare(a.lastInspected));

        reply.send({
          success: true,
          gearCondition,
          recentInspections: recentInspections.slice(0, 50),
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate gear report" });
      }
    }
  );
}
