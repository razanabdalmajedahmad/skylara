import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

// Type alias — avoids needing the @fastify/type-provider-typebox package
type TypeBoxTypeProvider = any;

/**
 * Drag-and-drop report builder API for SkyLara.
 * Enables users to create, configure, and share custom dashboards with configurable blocks.
 *
 * Features:
 * - Dashboard CRUD with shared dashboards
 * - Modular block system (KPI, charts, tables, heatmaps)
 * - Real-time data queries (revenue, bookings, payouts, coach performance, etc.)
 * - Pre-built dashboard templates
 * - Export to CSV and JSON formats
 */

// ============================================================================
// SCHEMAS
// ============================================================================

const DashboardCreateSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  dropzoneId: Type.Optional(Type.Number()),
  isShared: Type.Optional(Type.Boolean({ default: false })),
});

const DashboardUpdateSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  layout: Type.Optional(Type.Record(Type.String(), Type.Any())),
  isShared: Type.Optional(Type.Boolean()),
});

const BlockSchema = Type.Object({
  blockType: Type.Enum({
    KPI_CARD: 'KPI_CARD',
    LINE_CHART: 'LINE_CHART',
    BAR_CHART: 'BAR_CHART',
    PIE_CHART: 'PIE_CHART',
    DATA_TABLE: 'DATA_TABLE',
    HEATMAP: 'HEATMAP',
    FUNNEL: 'FUNNEL',
  }),
  title: Type.String({ minLength: 1, maxLength: 100 }),
  dataSource: Type.String(),
  query: Type.Optional(Type.Record(Type.String(), Type.Any())),
  position: Type.Optional(Type.Record(Type.String(), Type.Any())),
  size: Type.Optional(Type.Record(Type.String(), Type.Any())),
  config: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

const BlockUpdateSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  config: Type.Optional(Type.Record(Type.String(), Type.Any())),
  position: Type.Optional(Type.Record(Type.String(), Type.Any())),
  size: Type.Optional(Type.Record(Type.String(), Type.Any())),
  query: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

const DashboardSummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  blockCount: Type.Number(),
  isShared: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
});

const DashboardDetailSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  layout: Type.Optional(Type.Record(Type.String(), Type.Any())),
  isShared: Type.Boolean(),
  blocks: Type.Array(
    Type.Object({
      id: Type.String(),
      blockType: Type.String(),
      title: Type.String(),
      dataSource: Type.String(),
      position: Type.Optional(Type.Record(Type.String(), Type.Any())),
      size: Type.Optional(Type.Record(Type.String(), Type.Any())),
      config: Type.Optional(Type.Record(Type.String(), Type.Any())),
    })
  ),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const TemplateSchema = Type.Enum({
  dz_manager: 'dz_manager',
  coach: 'coach',
  manifest: 'manifest',
  admin: 'admin',
});

// ============================================================================
// DATA QUERY FUNCTIONS
// ============================================================================

/**
 * Query revenue data from PaymentIntent.
 * Aggregates by day/week/month with counts and averages.
 */
async function queryRevenue(
  prisma: any,
  startDate: Date,
  endDate: Date,
  groupBy: string = 'day',
  dropzoneId?: number
): Promise<any[]> {
  const paymentIntents = await prisma.paymentIntent.findMany({
    where: {
      status: 'SUCCEEDED',
      createdAt: { gte: startDate, lte: endDate },
      ...(dropzoneId && { dropzoneId }),
    },
    select: {
      id: true,
      amount: true,
      createdAt: true,
    },
  });

  // Group by time period
  const grouped: Record<string, any> = {};
  paymentIntents.forEach((pi: any) => {
    const date = new Date(pi.createdAt);
    let key: string;

    if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      key = date.toISOString().slice(0, 7);
    } else {
      key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) {
      grouped[key] = { total: 0, count: 0, amounts: [] };
    }
    grouped[key].total += pi.amount;
    grouped[key].count += 1;
    grouped[key].amounts.push(pi.amount);
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    total: data.total,
    count: data.count,
    avgAmount: Math.round(data.total / data.count),
  }));
}

/**
 * Query booking and slot data.
 * Includes fill rates, no-show rates, cancellation rates.
 */
async function queryBookings(
  prisma: any,
  startDate: Date,
  endDate: Date,
  groupBy: string = 'day',
  dropzoneId?: number
): Promise<any[]> {
  const loads = await prisma.load.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      ...(dropzoneId && { dropzoneId }),
    },
    include: {
      slots: {
        select: {
          id: true,
          status: true,
          activityType: true,
        },
      },
    },
  });

  const grouped: Record<string, any> = {};

  loads.forEach((load: any) => {
    const date = new Date(load.scheduledAt).toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = {
        totalSlots: 0,
        filledSlots: 0,
        noShows: 0,
        cancellations: 0,
      };
    }

    load.slots.forEach((slot: any) => {
      grouped[date].totalSlots += 1;
      if (slot.status === 'FILLED' || slot.status === 'CHECKED_IN') {
        grouped[date].filledSlots += 1;
      } else if (slot.status === 'NO_SHOW') {
        grouped[date].noShows += 1;
      } else if (slot.status === 'CANCELLED') {
        grouped[date].cancellations += 1;
      }
    });
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    totalSlots: data.totalSlots,
    filledSlots: data.filledSlots,
    fillRate: data.totalSlots > 0 ? Math.round((data.filledSlots / data.totalSlots) * 100) : 0,
    noShowRate: data.totalSlots > 0 ? Math.round((data.noShows / data.totalSlots) * 100) : 0,
    cancelRate: data.totalSlots > 0 ? Math.round((data.cancellations / data.totalSlots) * 100) : 0,
  }));
}

/**
 * Query payout data.
 */
async function queryPayouts(
  prisma: any,
  startDate: Date,
  endDate: Date,
  groupBy: string = 'day',
  dropzoneId?: number
): Promise<any[]> {
  const payouts = await prisma.payout.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(dropzoneId && { dropzoneId }),
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  const grouped: Record<string, any> = {};

  payouts.forEach((payout: any) => {
    const date = new Date(payout.createdAt).toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = {
        totalPaid: 0,
        pendingAmount: 0,
        failedCount: 0,
        amounts: [],
      };
    }

    if (payout.status === 'COMPLETED') {
      grouped[date].totalPaid += payout.amount;
    } else if (payout.status === 'PENDING') {
      grouped[date].pendingAmount += payout.amount;
    } else if (payout.status === 'FAILED') {
      grouped[date].failedCount += 1;
    }
    grouped[date].amounts.push(payout.amount);
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    totalPaid: data.totalPaid,
    pendingAmount: data.pendingAmount,
    failedCount: data.failedCount,
    averagePayout: data.amounts.length > 0 ? Math.round(data.amounts.reduce((a: number, b: number) => a + b, 0) / data.amounts.length) : 0,
  }));
}

/**
 * Query coach/instructor performance metrics.
 */
async function queryCoachPerformance(
  prisma: any,
  startDate: Date,
  endDate: Date,
  dropzoneId?: number
): Promise<any[]> {
  const coaches = await prisma.user.findMany({
    where: {
      role: { in: ['COACH', 'INSTRUCTOR'] },
      ...(dropzoneId && { userDZAssignments: { some: { dropzoneId } } }),
    },
    include: {
      coachingSessions: {
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          participants: true,
        },
      },
      ratings: true,
    },
  });

  return coaches.map((coach: any) => {
    const totalRevenue = coach.coachingSessions.reduce((sum: any, session: any) => sum + (session.rate || 0), 0);
    const totalSessions = coach.coachingSessions.length;
    const avgRating = coach.ratings.length > 0
      ? coach.ratings.reduce((sum: any, r: any) => sum + r.score, 0) / coach.ratings.length
      : 0;

    return {
      coachId: coach.id,
      name: `${coach.firstName} ${coach.lastName}`,
      totalSessions,
      totalRevenue,
      averageRating: Math.round(avgRating * 100) / 100,
      repeatStudentRate: 0, // Calculated from student repeat bookings
    };
  });
}

/**
 * Query aircraft and load utilization.
 */
async function queryManifestUtilization(
  prisma: any,
  startDate: Date,
  endDate: Date,
  dropzoneId?: number
): Promise<any[]> {
  const loads = await prisma.load.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      ...(dropzoneId && { dropzoneId }),
    },
    include: {
      aircraft: { select: { id: true, registration: true } },
      slots: { select: { status: true } },
    },
  });

  const grouped: Record<string, any> = {};

  loads.forEach((load: any) => {
    const date = new Date(load.scheduledAt).toISOString().split('T')[0];
    const hour = new Date(load.scheduledAt).getHours();

    if (!grouped[date]) {
      grouped[date] = {
        totalLoads: 0,
        fillRates: [],
        peakHour: 0,
        hours: {},
        aircraftUsage: {},
      };
    }

    grouped[date].totalLoads += 1;
    const fillRate = load.slots.filter((s: any) => s.status === 'FILLED' || s.status === 'CHECKED_IN').length / load.slots.length;
    grouped[date].fillRates.push(fillRate);

    if (!grouped[date].hours[hour]) grouped[date].hours[hour] = 0;
    grouped[date].hours[hour] += 1;

    const acId = load.aircraftId;
    if (!grouped[date].aircraftUsage[acId]) {
      grouped[date].aircraftUsage[acId] = { loads: 0, reg: load.aircraft.registration };
    }
    grouped[date].aircraftUsage[acId].loads += 1;
  });

  return Object.entries(grouped).map(([date, data]) => {
    const peakHour = Object.entries(data.hours).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 0;
    const avgFillRate = data.fillRates.length > 0
      ? Math.round((data.fillRates.reduce((a: number, b: number) => a + b, 0) / data.fillRates.length) * 100)
      : 0;

    return {
      date,
      totalLoads: data.totalLoads,
      avgFillRate,
      peakHour,
      aircraftUsage: Object.entries(data.aircraftUsage).map(([id, ac]: any) => ({
        aircraftId: id,
        registration: ac.reg,
        loads: ac.loads,
      })),
    };
  });
}

/**
 * Query onboarding session conversion funnel.
 */
async function queryOnboardingConversion(
  prisma: any,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const sessions = await prisma.onboardingSession.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      userRole: true,
      completedAt: true,
      currentStep: true,
      createdAt: true,
    },
  });

  const grouped: Record<string, any> = {};

  sessions.forEach((session: any) => {
    const role = session.userRole;
    if (!grouped[role]) {
      grouped[role] = {
        started: 0,
        completed: 0,
        abandoned: 0,
        times: [],
        steps: {},
      };
    }

    grouped[role].started += 1;
    if (session.completedAt) {
      grouped[role].completed += 1;
      const timeTaken = new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime();
      grouped[role].times.push(timeTaken);
    } else {
      grouped[role].abandoned += 1;
      if (!grouped[role].steps[session.currentStep]) {
        grouped[role].steps[session.currentStep] = 0;
      }
      grouped[role].steps[session.currentStep] += 1;
    }
  });

  return Object.entries(grouped).map(([role, data]) => ({
    role,
    started: data.started,
    completed: data.completed,
    abandonedRate: data.started > 0 ? Math.round((data.abandoned / data.started) * 100) : 0,
    avgCompletionTime: data.times.length > 0
      ? Math.round(data.times.reduce((a: number, b: number) => a + b, 0) / data.times.length / 1000 / 60)
      : 0,
    dropOffStep: Object.entries(data.steps).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || null,
  }));
}

/**
 * Query compliance data (waivers, gear checks, incidents).
 */
async function queryCompliance(
  prisma: any,
  startDate: Date,
  endDate: Date,
  dropzoneId?: number
): Promise<any> {
  const [expiredWaivers, overdueGearChecks, incidents] = await Promise.all([
    prisma.waiverSignature.count({
      where: {
        expiresAt: { lt: new Date() },
        ...(dropzoneId && { dropzoneId }),
      },
    }),
    prisma.gearCheck.count({
      where: {
        nextCheckDue: { lt: new Date() },
        ...(dropzoneId && { dropzoneId }),
      },
    }),
    prisma.incident.findMany({
      where: {
        reportedAt: { gte: startDate, lte: endDate },
        ...(dropzoneId && { dropzoneId }),
      },
      select: { id: true, severity: true, reportedAt: true },
    }),
  ]);

  const incidentsByMonth: Record<string, number> = {};
  incidents.forEach((inc: any) => {
    const month = new Date(inc.reportedAt).toISOString().slice(0, 7);
    incidentsByMonth[month] = (incidentsByMonth[month] || 0) + 1;
  });

  const openIncidents = incidents.filter((i: any) => i.severity !== 'RESOLVED').length;

  return {
    expiredWaivers,
    overdueGearChecks,
    incidentsByMonth: Object.entries(incidentsByMonth).map(([month, count]) => ({ month, count })),
    openIncidents,
  };
}

// ============================================================================
// TEMPLATE CONFIGURATIONS
// ============================================================================

const DASHBOARD_TEMPLATES: Record<string, any> = {
  dz_manager: {
    blocks: [
      {
        blockType: 'KPI_CARD',
        title: 'Revenue (This Month)',
        dataSource: 'revenue',
        config: { metric: 'total', period: 'month' },
        position: { x: 0, y: 0 },
        size: { width: 2, height: 1 },
      },
      {
        blockType: 'LINE_CHART',
        title: 'Revenue (Last 30 Days)',
        dataSource: 'revenue',
        config: { metric: 'total', groupBy: 'day' },
        position: { x: 2, y: 0 },
        size: { width: 4, height: 2 },
      },
      {
        blockType: 'BAR_CHART',
        title: 'Bookings by Activity',
        dataSource: 'bookings',
        config: { groupBy: 'activity' },
        position: { x: 0, y: 1 },
        size: { width: 2, height: 2 },
      },
      {
        blockType: 'KPI_CARD',
        title: 'Manifest Utilization',
        dataSource: 'manifest_utilization',
        config: { metric: 'avgFillRate' },
        position: { x: 0, y: 3 },
        size: { width: 2, height: 1 },
      },
      {
        blockType: 'DATA_TABLE',
        title: 'Top Coaches',
        dataSource: 'coach_performance',
        config: { sortBy: 'totalRevenue', limit: 10 },
        position: { x: 2, y: 2 },
        size: { width: 4, height: 2 },
      },
      {
        blockType: 'PIE_CHART',
        title: 'Safety Compliance',
        dataSource: 'compliance',
        config: { metrics: ['expiredWaivers', 'overdueGearChecks', 'openIncidents'] },
        position: { x: 0, y: 4 },
        size: { width: 3, height: 2 },
      },
    ],
  },

  coach: {
    blocks: [
      {
        blockType: 'KPI_CARD',
        title: 'Total Earnings',
        dataSource: 'coach_performance',
        config: { metric: 'totalRevenue' },
        position: { x: 0, y: 0 },
        size: { width: 2, height: 1 },
      },
      {
        blockType: 'LINE_CHART',
        title: 'Sessions Over Time',
        dataSource: 'coach_performance',
        config: { metric: 'totalSessions', groupBy: 'week' },
        position: { x: 2, y: 0 },
        size: { width: 4, height: 2 },
      },
      {
        blockType: 'DATA_TABLE',
        title: 'My Students',
        dataSource: 'coaching_sessions',
        config: { sortBy: 'recentFirst' },
        position: { x: 0, y: 2 },
        size: { width: 6, height: 2 },
      },
      {
        blockType: 'LINE_CHART',
        title: 'Rating Trend',
        dataSource: 'coach_performance',
        config: { metric: 'averageRating', groupBy: 'week' },
        position: { x: 0, y: 4 },
        size: { width: 3, height: 2 },
      },
    ],
  },

  manifest: {
    blocks: [
      {
        blockType: 'KPI_CARD',
        title: "Today's Loads",
        dataSource: 'manifest_utilization',
        config: { metric: 'totalLoads', period: 'day' },
        position: { x: 0, y: 0 },
        size: { width: 2, height: 1 },
      },
      {
        blockType: 'BAR_CHART',
        title: 'Aircraft Utilization',
        dataSource: 'manifest_utilization',
        config: { metric: 'aircraftUsage' },
        position: { x: 2, y: 0 },
        size: { width: 4, height: 2 },
      },
      {
        blockType: 'LINE_CHART',
        title: 'Fill Rate (30 Days)',
        dataSource: 'bookings',
        config: { metric: 'fillRate', groupBy: 'day' },
        position: { x: 0, y: 2 },
        size: { width: 3, height: 2 },
      },
      {
        blockType: 'DATA_TABLE',
        title: 'Upcoming Loads',
        dataSource: 'loads',
        config: { status: 'SCHEDULED', limit: 10 },
        position: { x: 3, y: 2 },
        size: { width: 3, height: 2 },
      },
    ],
  },

  admin: {
    blocks: [
      {
        blockType: 'KPI_CARD',
        title: 'Platform Revenue',
        dataSource: 'revenue',
        config: { metric: 'total', period: 'month' },
        position: { x: 0, y: 0 },
        size: { width: 2, height: 1 },
      },
      {
        blockType: 'KPI_CARD',
        title: 'Active Dropzones',
        dataSource: 'dropzones',
        config: { metric: 'count', status: 'ACTIVE' },
        position: { x: 2, y: 0 },
        size: { width: 2, height: 1 },
      },
      {
        blockType: 'LINE_CHART',
        title: 'Platform Growth',
        dataSource: 'revenue',
        config: { metric: 'total', groupBy: 'month' },
        position: { x: 4, y: 0 },
        size: { width: 2, height: 2 },
      },
      {
        blockType: 'DATA_TABLE',
        title: 'DZ Comparison',
        dataSource: 'dropzones',
        config: { metrics: ['revenue', 'activeUsers', 'loads'] },
        position: { x: 0, y: 1 },
        size: { width: 4, height: 2 },
      },
      {
        blockType: 'FUNNEL',
        title: 'Onboarding Funnel',
        dataSource: 'onboarding_conversion',
        config: {},
        position: { x: 4, y: 2 },
        size: { width: 2, height: 2 },
      },
      {
        blockType: 'PIE_CHART',
        title: 'Revenue by Dropzone',
        dataSource: 'revenue',
        config: { groupBy: 'dropzone' },
        position: { x: 0, y: 3 },
        size: { width: 3, height: 2 },
      },
    ],
  },
};

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export async function reportBuilderRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;

  /**
   * GET /reports/dashboards
   * Get list of user's dashboards + shared dashboards.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get(
    '/reports/dashboards',
    {
      schema: {
        response: {
          200: Type.Object({
            dashboards: Type.Array(DashboardSummarySchema),
          }),
        },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);

      try {
        const dashboards = await prisma.reportDashboard.findMany({
          where: {
            OR: [
              { userId },
              // Show shared dashboards scoped to the user's dropzone
              ...(request.user?.dropzoneId
                ? [{ isShared: true, dropzoneId: parseInt(request.user.dropzoneId, 10) }]
                : []),
            ],
          },
          include: {
            blocks: { select: { id: true } },
          },
          orderBy: { updatedAt: 'desc' },
        });

        return reply.send({
          dashboards: dashboards.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            blockCount: d.blocks.length,
            isShared: d.isShared,
            createdAt: d.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch dashboards' });
      }
    }
  );

  /**
   * POST /reports/dashboards
   * Create a new dashboard.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().post<{ Body: Static<typeof DashboardCreateSchema> }>(
    '/reports/dashboards',
    {
      schema: {
        body: DashboardCreateSchema,
        response: { 201: DashboardDetailSchema },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const body = request.body as { name: string; description?: string; dropzoneId?: number; isShared?: boolean };
      const { name, description, dropzoneId, isShared } = body;

      try {
        const dashboard = await prisma.reportDashboard.create({
          data: {
            userId,
            name,
            description,
            dropzoneId,
            isShared: isShared || false,
            layout: {},
            messages: [],
          },
        });

        return reply.status(201).send({
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          isShared: dashboard.isShared,
          blocks: [],
          createdAt: dashboard.createdAt.toISOString(),
          updatedAt: dashboard.updatedAt.toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create dashboard' });
      }
    }
  );

  /**
   * GET /reports/dashboards/:id
   * Get dashboard with all blocks.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get<{ Params: { id: string } }>(
    '/reports/dashboards/:id',
    {
      schema: { response: { 200: DashboardDetailSchema } },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const dashboard = await prisma.reportDashboard.findUnique({
          where: { id },
          include: {
            blocks: {
              select: {
                id: true,
                blockType: true,
                title: true,
                dataSource: true,
                position: true,
                size: true,
                config: true,
              },
            },
          },
        });

        if (!dashboard) {
          return reply.status(404).send({ error: 'Dashboard not found' });
        }

        return reply.send({
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          isShared: dashboard.isShared,
          blocks: dashboard.blocks,
          createdAt: dashboard.createdAt.toISOString(),
          updatedAt: dashboard.updatedAt.toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch dashboard' });
      }
    }
  );

  /**
   * PATCH /reports/dashboards/:id
   * Update dashboard properties.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().patch<{
    Params: { id: string };
    Body: Static<typeof DashboardUpdateSchema>;
  }>(
    '/reports/dashboards/:id',
    {
      schema: {
        body: DashboardUpdateSchema,
        response: { 200: DashboardDetailSchema },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };
      const body = request.body as { name?: string; description?: string; layout?: any; isShared?: boolean };
      const { name, description, layout, isShared } = body;

      try {
        const dashboard = await prisma.reportDashboard.findUnique({ where: { id } });

        if (!dashboard || dashboard.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        const updated = await prisma.reportDashboard.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(layout && { layout }),
            ...(isShared !== undefined && { isShared }),
          },
          include: {
            blocks: {
              select: {
                id: true,
                blockType: true,
                title: true,
                dataSource: true,
                position: true,
                size: true,
                config: true,
              },
            },
          },
        });

        return reply.send({
          id: updated.id,
          name: updated.name,
          description: updated.description,
          layout: updated.layout,
          isShared: updated.isShared,
          blocks: updated.blocks,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update dashboard' });
      }
    }
  );

  /**
   * DELETE /reports/dashboards/:id
   * Delete a dashboard.
   */
  fastify.delete<{ Params: { id: string } }>(
    '/reports/dashboards/:id',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };

      try {
        const dashboard = await prisma.reportDashboard.findUnique({ where: { id } });

        if (!dashboard || dashboard.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        await prisma.reportDashboard.delete({ where: { id } });
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete dashboard' });
      }
    }
  );

  /**
   * POST /reports/dashboards/:id/blocks
   * Add a block to a dashboard.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().post<{
    Params: { id: string };
    Body: Static<typeof BlockSchema>;
  }>(
    '/reports/dashboards/:id/blocks',
    {
      schema: { body: BlockSchema },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };
      const body = request.body as { blockType: string; title: string; dataSource: string; query?: any; position?: any; size?: any; config?: any };
      const { blockType, title, dataSource, query, position, size, config } = body;

      try {
        const dashboard = await prisma.reportDashboard.findUnique({ where: { id } });

        if (!dashboard || dashboard.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        const block = await prisma.reportBlock.create({
          data: {
            dashboardId: id,
            blockType,
            title,
            dataSource,
            query: query || {},
            position: position || {},
            size: size || {},
            config: config || {},
          },
        });

        return reply.status(201).send(block);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create block' });
      }
    }
  );

  /**
   * PATCH /reports/blocks/:id
   * Update a block.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().patch<{
    Params: { id: string };
    Body: Static<typeof BlockUpdateSchema>;
  }>(
    '/reports/blocks/:id',
    {
      schema: { body: BlockUpdateSchema },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };
      const { title, config, position, size, query } = request.body as { title?: string; config?: any; position?: any; size?: any; query?: any };

      try {
        const block = await prisma.reportBlock.findUnique({
          where: { id },
          include: { dashboard: true },
        });

        if (!block || block.dashboard.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        const updated = await prisma.reportBlock.update({
          where: { id },
          data: {
            ...(title && { title }),
            ...(config && { config }),
            ...(position && { position }),
            ...(size && { size }),
            ...(query && { query }),
          },
        });

        return reply.send(updated);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update block' });
      }
    }
  );

  /**
   * DELETE /reports/blocks/:id
   * Remove a block from a dashboard.
   */
  fastify.delete<{ Params: { id: string } }>(
    '/reports/blocks/:id',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };

      try {
        const block = await prisma.reportBlock.findUnique({
          where: { id },
          include: { dashboard: true },
        });

        if (!block || block.dashboard.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        await prisma.reportBlock.delete({ where: { id } });
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete block' });
      }
    }
  );

  /**
   * GET /reports/data/:source
   * Execute data query for a specific data source.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get<{
    Params: { source: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
      dropzoneId?: string;
    };
  }>(
    '/reports/data/:source',
    {
      schema: {
        response: { 200: Type.Array(Type.Record(Type.String(), Type.Any())) },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { source } = request.params as { source: string };
      const q = request.query as Record<string, string | undefined>;
      const startDate = q.startDate
        ? new Date(q.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = q.endDate ? new Date(q.endDate) : new Date();
      const groupBy = q.groupBy || 'day';
      const dropzoneId = q.dropzoneId ? parseInt(q.dropzoneId) : undefined;

      try {
        let data: any;

        switch (source) {
          case 'revenue':
            data = await queryRevenue(prisma, startDate, endDate, groupBy, dropzoneId);
            break;
          case 'bookings':
            data = await queryBookings(prisma, startDate, endDate, groupBy, dropzoneId);
            break;
          case 'payouts':
            data = await queryPayouts(prisma, startDate, endDate, groupBy, dropzoneId);
            break;
          case 'coach_performance':
            data = await queryCoachPerformance(prisma, startDate, endDate, dropzoneId);
            break;
          case 'manifest_utilization':
            data = await queryManifestUtilization(prisma, startDate, endDate, dropzoneId);
            break;
          case 'onboarding_conversion':
            data = await queryOnboardingConversion(prisma, startDate, endDate);
            break;
          case 'compliance':
            data = [await queryCompliance(prisma, startDate, endDate, dropzoneId)];
            break;
          default:
            return reply.status(400).send({ error: 'Unknown data source' });
        }

        return reply.send(data);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch data' });
      }
    }
  );

  /**
   * POST /reports/dashboards/from-template
   * Create a dashboard from a pre-built template.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().post<{
    Body: { template: Static<typeof TemplateSchema> };
  }>(
    '/reports/dashboards/from-template',
    {
      schema: {
        body: Type.Object({ template: TemplateSchema }),
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { template } = request.body as { template: string };

      try {
        const templateConfig = DASHBOARD_TEMPLATES[template];
        if (!templateConfig) {
          return reply.status(400).send({ error: 'Unknown template' });
        }

        const dashboard = await prisma.reportDashboard.create({
          data: {
            userId,
            name: `${template.replace('_', ' ').toUpperCase()} Dashboard`,
            layout: {},
            isShared: false,
            blocks: {
              createMany: {
                data: templateConfig.blocks.map((block: any) => ({
                  blockType: block.blockType,
                  title: block.title,
                  dataSource: block.dataSource,
                  position: block.position,
                  size: block.size,
                  config: block.config,
                  query: {},
                })),
              },
            },
          },
          include: {
            blocks: {
              select: {
                id: true,
                blockType: true,
                title: true,
                dataSource: true,
                position: true,
                size: true,
                config: true,
              },
            },
          },
        });

        return reply.status(201).send({
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          isShared: dashboard.isShared,
          blocks: dashboard.blocks,
          createdAt: dashboard.createdAt.toISOString(),
          updatedAt: dashboard.updatedAt.toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create dashboard from template' });
      }
    }
  );

  /**
   * GET /reports/export/:dashboardId
   * Export dashboard data to CSV or JSON.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get<{
    Params: { dashboardId: string };
    Querystring: { format?: 'csv' | 'json' };
  }>(
    '/reports/export/:dashboardId',
    {
      schema: {
        response: { 200: Type.Object({ data: Type.Any() }) },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { dashboardId } = request.params as { dashboardId: string };
      const format = ((request.query as any)?.format as string) || 'json';

      try {
        const dashboard = await prisma.reportDashboard.findUnique({
          where: { id: dashboardId },
          include: { blocks: true },
        });

        if (!dashboard || dashboard.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        const blocksData: Record<string, any> = {};

        for (const block of dashboard.blocks) {
          const data = await fetch(`http://localhost:3000/reports/data/${block.dataSource}`, {
            method: 'GET',
          }).then(r => r.json());
          blocksData[block.title] = data;
        }

        if (format === 'csv') {
          // Convert to CSV format
          let csv = '';
          for (const [title, rows] of Object.entries(blocksData)) {
            csv += `\n${title}\n`;
            if (Array.isArray(rows) && rows.length > 0) {
              const headers = Object.keys(rows[0]);
              csv += headers.join(',') + '\n';
              rows.forEach((row: any) => {
                csv += headers.map(h => row[h]).join(',') + '\n';
              });
            }
          }
          reply.header('Content-Type', 'text/csv');
          return reply.send(csv);
        } else {
          return reply.send({ data: blocksData });
        }
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to export dashboard' });
      }
    }
  );

  // ========================================================================
  // SCHEDULED REPORT DELIVERY
  // ========================================================================

  /**
   * POST /report-builder/schedules
   * Create a scheduled report delivery (recurring or one-time).
   */
  fastify.post(
    '/report-builder/schedules',
    { preHandler: [authenticate, authorize(['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN'])] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.user.dropzoneId || '0');
        if (!dzId) return reply.status(400).send({ success: false, error: 'dropzoneId required' });

        const body = request.body as any;
        const { dashboardId, frequency, recipients, format, timezone } = body;

        if (!dashboardId || !frequency || !recipients?.length) {
          return reply.status(400).send({ success: false, error: 'dashboardId, frequency, and recipients are required' });
        }

        const validFreqs = ['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME'];
        if (!validFreqs.includes(frequency)) {
          return reply.status(400).send({ success: false, error: `frequency must be one of: ${validFreqs.join(', ')}` });
        }

        // Verify dashboard exists
        const dashboard = await fastify.prisma.reportDashboard.findFirst({
          where: { id: parseInt(dashboardId), dropzoneId: dzId },
        });
        if (!dashboard) return reply.status(404).send({ success: false, error: 'Dashboard not found' });

        // Store schedule as a JSON config in the dashboard's metadata
        // In a full implementation this would be a separate table + cron worker
        const schedule = {
          id: `sched_${Date.now()}`,
          dashboardId: dashboard.id,
          dashboardName: dashboard.name,
          frequency,
          recipients: Array.isArray(recipients) ? recipients : [recipients],
          format: format || 'CSV',
          timezone: timezone || 'UTC',
          createdById: parseInt(request.user.sub),
          createdAt: new Date().toISOString(),
          nextRunAt: computeNextRun(frequency),
          status: 'ACTIVE',
        };

        // Store in DzSettings as scheduled_reports array
        const settings = await fastify.prisma.dzSettings.findFirst({ where: { dropzoneId: dzId } });
        const existingSchedules = (settings as any)?.scheduledReports || [];
        const updatedSchedules = [...existingSchedules, schedule];

        if (settings) {
          await fastify.prisma.dzSettings.update({
            where: { id: settings.id },
            data: { scheduledReports: updatedSchedules } as any,
          });
        }

        return reply.status(201).send({ success: true, data: schedule });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to create report schedule' });
      }
    }
  );

  /**
   * GET /report-builder/schedules
   * List all scheduled report deliveries for the dropzone.
   */
  fastify.get(
    '/report-builder/schedules',
    { preHandler: [authenticate, authorize(['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN'])] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.user.dropzoneId || '0');
        if (!dzId) return reply.status(400).send({ success: false, error: 'dropzoneId required' });

        const settings = await fastify.prisma.dzSettings.findFirst({ where: { dropzoneId: dzId } });
        const schedules = (settings as any)?.scheduledReports || [];

        return reply.send({ success: true, data: { schedules } });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to list schedules' });
      }
    }
  );

  /**
   * DELETE /report-builder/schedules/:scheduleId
   * Cancel a scheduled report delivery.
   */
  fastify.delete<{ Params: { scheduleId: string } }>(
    '/report-builder/schedules/:scheduleId',
    { preHandler: [authenticate, authorize(['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN'])] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.user.dropzoneId || '0');
        const { scheduleId } = request.params;

        const settings = await fastify.prisma.dzSettings.findFirst({ where: { dropzoneId: dzId } });
        const existingSchedules: any[] = (settings as any)?.scheduledReports || [];
        const updated = existingSchedules.filter((s: any) => s.id !== scheduleId);

        if (updated.length === existingSchedules.length) {
          return reply.status(404).send({ success: false, error: 'Schedule not found' });
        }

        if (settings) {
          await fastify.prisma.dzSettings.update({
            where: { id: settings.id },
            data: { scheduledReports: updated } as any,
          });
        }

        return reply.send({ success: true, data: { deleted: scheduleId } });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to delete schedule' });
      }
    }
  );
}

function computeNextRun(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'DAILY':
      return new Date(now.getTime() + 24 * 3600000).toISOString();
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 24 * 3600000).toISOString();
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    case 'ONE_TIME':
      return new Date(now.getTime() + 3600000).toISOString(); // 1 hour from now
    default:
      return new Date(now.getTime() + 24 * 3600000).toISOString();
  }
}
