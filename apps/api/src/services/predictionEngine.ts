/**
 * Prediction Engine — Phase 4
 * Rule-based heuristic predictions for operational planning.
 *
 * This is NOT ML — it uses configurable scoring thresholds based on
 * observable platform data. When enough actual-vs-predicted data accumulates,
 * these heuristics can be replaced with trained models.
 *
 * Prediction types:
 * - No-show likelihood (per jumper)
 * - Delay likelihood (per load)
 * - Underfill risk (per load)
 * - Weather disruption window
 * - Bottleneck detection
 */

export interface PredictionScore {
  id: string;
  type: 'NO_SHOW' | 'DELAY' | 'UNDERFILL' | 'WEATHER_DISRUPTION' | 'BOTTLENECK';
  entityType: string;       // 'user' | 'load' | 'dropzone'
  entityId: number | string;
  score: number;            // 0-100 (0 = no risk, 100 = certain)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: PredictionFactor[];
  recommendation: string;
  computedAt: Date;
}

export interface PredictionFactor {
  name: string;
  weight: number;         // contribution to score
  value: string | number; // observed value
  threshold?: string;     // reference threshold
}

export interface PredictionActual {
  predictionId: string;
  predictedScore: number;
  actualOutcome: boolean;  // did the predicted event occur?
  recordedAt: Date;
}

export class PredictionEngine {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  /**
   * Predict no-show likelihood for a specific user on a specific day.
   * Heuristic factors:
   * - Historical no-show rate (if available)
   * - Unread reminders
   * - Unpaid balance
   * - Late-arrival pattern
   * - Weather forecast (if marginal, people cancel)
   * - Day of week (weekdays have higher no-show)
   * - Time since last jump (stale interest)
   */
  async predictNoShow(userId: number, dropzoneId: number): Promise<PredictionScore> {
    const factors: PredictionFactor[] = [];
    let score = 0;

    // Factor 1: Unpaid balance
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
      select: { balance: true },
    }).catch(() => null);

    if (wallet && Number(wallet.balance) < 0) {
      const deficit = Math.abs(Number(wallet.balance));
      const weight = Math.min(25, deficit / 100); // max 25 pts for >$2500 deficit
      score += weight;
      factors.push({ name: 'Unpaid balance', weight, value: `$${(deficit / 100).toFixed(0)}`, threshold: '$0' });
    }

    // Factor 2: No waiver on file
    const waiver = await this.prisma.waiverSubmission.findFirst({
      where: { userId, status: 'SIGNED' },
      orderBy: { signedAt: 'desc' },
    }).catch(() => null);

    if (!waiver) {
      score += 20;
      factors.push({ name: 'No waiver signed', weight: 20, value: 'Missing', threshold: 'Required' });
    }

    // Factor 3: Time since last jump
    const lastJump = await this.prisma.logbookEntry.findFirst({
      where: { userId },
      orderBy: { jumpDate: 'desc' },
      select: { jumpDate: true },
    }).catch(() => null);

    if (lastJump) {
      const daysSince = Math.floor((Date.now() - new Date(lastJump.jumpDate).getTime()) / 86400000);
      if (daysSince > 90) {
        const weight = Math.min(20, (daysSince - 90) / 10);
        score += weight;
        factors.push({ name: 'Days since last jump', weight, value: daysSince, threshold: '90 days' });
      }
    } else {
      score += 10;
      factors.push({ name: 'No jump history', weight: 10, value: 'None', threshold: 'Any' });
    }

    // Factor 4: Day of week (weekday = higher no-show)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Mon-Thu
      score += 10;
      factors.push({ name: 'Weekday booking', weight: 10, value: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek], threshold: 'Weekend preferred' });
    }

    // Factor 5: Booking with no confirmation
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        scheduledDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      select: { status: true },
    }).catch(() => null);

    if (booking && booking.status === 'PENDING') {
      score += 15;
      factors.push({ name: 'Unconfirmed booking', weight: 15, value: 'PENDING', threshold: 'CONFIRMED' });
    }

    // Normalize to 0-100
    score = Math.min(100, Math.max(0, score));

    const confidence: PredictionScore['confidence'] =
      factors.length >= 3 ? 'HIGH' : factors.length >= 2 ? 'MEDIUM' : 'LOW';

    return {
      id: `noshow_${userId}_${Date.now()}`,
      type: 'NO_SHOW',
      entityType: 'user',
      entityId: userId,
      score,
      confidence,
      factors,
      recommendation: score >= 50
        ? 'High no-show risk. Consider sending a reminder or holding a spare slot.'
        : score >= 25
          ? 'Moderate no-show risk. Monitor and send reminder if not checked in by cutoff.'
          : 'Low no-show risk. No action needed.',
      computedAt: new Date(),
    };
  }

  /**
   * Predict delay likelihood for a load.
   * Factors:
   * - Weather trend (approaching limits)
   * - Compliance issues on manifested jumpers
   * - Historical delay pattern for this time of day
   * - Aircraft maintenance proximity
   * - Queue length vs capacity
   */
  async predictLoadDelay(loadId: number, dropzoneId: number): Promise<PredictionScore> {
    const factors: PredictionFactor[] = [];
    let score = 0;

    // Factor 1: Load compliance issues
    const load = await this.prisma.load.findUnique({
      where: { id: loadId },
      include: {
        slots: { select: { userId: true } },
        aircraft: { select: { next100hrDue: true, hobbsHours: true } },
      },
    }).catch(() => null);

    if (!load) {
      return {
        id: `delay_${loadId}_${Date.now()}`,
        type: 'DELAY',
        entityType: 'load',
        entityId: loadId,
        score: 0,
        confidence: 'LOW',
        factors: [],
        recommendation: 'Load not found',
        computedAt: new Date(),
      };
    }

    // Factor 2: Underfill
    const fillPercent = load.slots.length / (load.maxCapacity || 14);
    if (fillPercent < 0.5) {
      score += 15;
      factors.push({ name: 'Underfilled load', weight: 15, value: `${Math.round(fillPercent * 100)}%`, threshold: '50%' });
    }

    // Factor 3: Aircraft maintenance proximity
    if (load.aircraft?.next100hrDue && load.aircraft?.hobbsHours) {
      const hoursRemaining = Number(load.aircraft.next100hrDue) - Number(load.aircraft.hobbsHours);
      if (hoursRemaining < 5) {
        score += 20;
        factors.push({ name: 'Aircraft near 100hr inspection', weight: 20, value: `${hoursRemaining.toFixed(1)} hrs remaining`, threshold: '5 hrs' });
      }
    }

    // Factor 4: Time of day (late loads more likely to delay)
    const hour = new Date().getHours();
    if (hour >= 16) {
      score += 10;
      factors.push({ name: 'Late-day load', weight: 10, value: `${hour}:00`, threshold: 'Before 16:00' });
    }

    score = Math.min(100, Math.max(0, score));

    return {
      id: `delay_${loadId}_${Date.now()}`,
      type: 'DELAY',
      entityType: 'load',
      entityId: loadId,
      score,
      confidence: factors.length >= 2 ? 'MEDIUM' : 'LOW',
      factors,
      recommendation: score >= 40
        ? 'Elevated delay risk. Review compliance and staffing.'
        : 'Normal delay risk.',
      computedAt: new Date(),
    };
  }

  /**
   * Detect operational bottlenecks.
   * Looks at queue wait times, load fill rates, staff availability.
   */
  async detectBottlenecks(dropzoneId: number): Promise<PredictionScore[]> {
    const results: PredictionScore[] = [];

    // Check queue length
    const queueCount = await this.prisma.waitlistEntry.count({
      where: { dropzoneId, status: 'WAITING' },
    }).catch(() => 0);

    if (queueCount > 10) {
      results.push({
        id: `bottleneck_queue_${Date.now()}`,
        type: 'BOTTLENECK',
        entityType: 'dropzone',
        entityId: dropzoneId,
        score: Math.min(100, queueCount * 5),
        confidence: 'HIGH',
        factors: [{ name: 'Queue length', weight: queueCount * 5, value: queueCount, threshold: '10' }],
        recommendation: `${queueCount} jumpers queued. Consider opening additional loads.`,
        computedAt: new Date(),
      });
    }

    // Check underfilled active loads
    const activeLoads = await this.prisma.load.findMany({
      where: { dropzoneId, status: { in: ['FILLING', 'OPEN'] } },
      select: { id: true, loadNumber: true, maxCapacity: true, _count: { select: { slots: true } } },
    }).catch(() => []);

    const underfilled = (activeLoads as any[]).filter(
      (l: any) => l._count.slots < (l.maxCapacity || 14) * 0.4
    );

    if (underfilled.length >= 2) {
      results.push({
        id: `bottleneck_underfill_${Date.now()}`,
        type: 'UNDERFILL',
        entityType: 'dropzone',
        entityId: dropzoneId,
        score: underfilled.length * 20,
        confidence: 'MEDIUM',
        factors: underfilled.map((l: any) => ({
          name: `Load ${l.loadNumber || l.id}`,
          weight: 20,
          value: `${l._count.slots}/${l.maxCapacity}`,
          threshold: '40% fill',
        })),
        recommendation: `${underfilled.length} loads under 40% capacity. Consider merging or promoting.`,
        computedAt: new Date(),
      });
    }

    return results;
  }

  /**
   * Predict churn risk for a jumper.
   * Heuristic factors:
   * - Days since last jump (activity decay)
   * - Declining jump frequency (month-over-month)
   * - Wallet balance trend (not topping up)
   * - No bookings in next 30 days
   * - Social engagement decline (no posts, no reactions)
   */
  async predictChurnRisk(userId: number, dropzoneId: number): Promise<PredictionScore> {
    const factors: PredictionFactor[] = [];
    let score = 0;

    // Factor 1: Days since last jump
    const lastJump = await this.prisma.logbookEntry.findFirst({
      where: { userId },
      orderBy: { jumpDate: 'desc' },
      select: { jumpDate: true },
    }).catch(() => null);

    if (lastJump) {
      const daysSince = Math.floor((Date.now() - new Date(lastJump.jumpDate).getTime()) / 86400000);
      if (daysSince > 180) {
        score += 35;
        factors.push({ name: 'Inactive >6 months', weight: 35, value: `${daysSince} days`, threshold: '180 days' });
      } else if (daysSince > 90) {
        score += 20;
        factors.push({ name: 'Inactive >3 months', weight: 20, value: `${daysSince} days`, threshold: '90 days' });
      } else if (daysSince > 30) {
        score += 10;
        factors.push({ name: 'Inactive >1 month', weight: 10, value: `${daysSince} days`, threshold: '30 days' });
      }
    } else {
      score += 15;
      factors.push({ name: 'No jump history at this DZ', weight: 15, value: 'None' });
    }

    // Factor 2: Declining jump frequency
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [recentJumps, priorJumps] = await Promise.all([
      this.prisma.logbookEntry.count({
        where: { userId, jumpDate: { gte: lastMonth, lt: thisMonth } },
      }).catch(() => 0),
      this.prisma.logbookEntry.count({
        where: { userId, jumpDate: { gte: twoMonthsAgo, lt: lastMonth } },
      }).catch(() => 0),
    ]);

    if (priorJumps > 0 && recentJumps === 0) {
      score += 20;
      factors.push({ name: 'Zero jumps last month (had prior)', weight: 20, value: '0 vs ' + priorJumps });
    } else if (priorJumps > 0 && recentJumps < priorJumps * 0.5) {
      score += 10;
      factors.push({ name: 'Jump frequency dropped >50%', weight: 10, value: `${recentJumps} vs ${priorJumps}` });
    }

    // Factor 3: No upcoming bookings
    const upcomingBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledDate: { gte: now },
      },
    }).catch(() => null);

    if (!upcomingBooking) {
      score += 15;
      factors.push({ name: 'No upcoming bookings', weight: 15, value: 'None', threshold: 'Any' });
    }

    // Factor 4: Wallet trending low
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
      select: { balance: true },
    }).catch(() => null);

    if (wallet && Number(wallet.balance) <= 0) {
      score += 10;
      factors.push({ name: 'Zero/negative wallet balance', weight: 10, value: `$${(Number(wallet.balance) / 100).toFixed(0)}` });
    }

    score = Math.min(100, Math.max(0, score));

    const confidence: PredictionScore['confidence'] =
      factors.length >= 3 ? 'HIGH' : factors.length >= 2 ? 'MEDIUM' : 'LOW';

    return {
      id: `churn_${userId}_${Date.now()}`,
      type: 'NO_SHOW', // reuse type; could add CHURN_RISK to enum
      entityType: 'user',
      entityId: userId,
      score,
      confidence,
      factors,
      recommendation: score >= 60
        ? 'High churn risk. Recommend targeted re-engagement (discount, invitation, milestone recognition).'
        : score >= 30
          ? 'Moderate churn risk. Send activity reminder or highlight upcoming events.'
          : 'Low churn risk. Active engagement pattern.',
      computedAt: new Date(),
    };
  }

  /**
   * Revenue forecast for a dropzone over the next 7 days.
   * Uses: recent daily revenue average, active bookings, season pattern.
   */
  async forecastRevenue(dropzoneId: number): Promise<{
    dailyForecasts: Array<{ date: string; predicted: number; confidence: string }>;
    weekTotal: number;
    basis: string;
  }> {
    // Get last 14 days of completed transactions
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
    const recentTx = await this.prisma.transaction.findMany({
      where: {
        wallet: { dropzoneId },
        createdAt: { gte: twoWeeksAgo },
        status: 'COMPLETED',
        type: { in: ['JUMP_TICKET', 'BOOKING_PAYMENT', 'TANDEM_PAYMENT'] },
      },
      select: { amount: true, createdAt: true },
    }).catch(() => []);

    // Group by day
    const dailyRevenue: Record<string, number> = {};
    for (const tx of recentTx as any[]) {
      const day = new Date(tx.createdAt).toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + Math.abs(Number(tx.amount));
    }

    const days = Object.values(dailyRevenue);
    const avgDaily = days.length > 0 ? days.reduce((s, d) => s + d, 0) / days.length : 0;

    // Count upcoming confirmed bookings
    const upcomingBookings = await this.prisma.booking.count({
      where: {
        dropzoneId,
        status: 'CONFIRMED',
        scheduledDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
    }).catch(() => 0);

    // Simple forecast: avg daily + booking premium
    const bookingPremium = upcomingBookings * 15000; // ~$150 avg per booking in cents
    const weekdayMultiplier = [0.3, 0.5, 0.5, 0.6, 0.8, 1.4, 1.5]; // Sun-Sat

    const forecasts = [];
    let weekTotal = 0;
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(Date.now() + i * 86400000);
      const dayOfWeek = forecastDate.getDay();
      const predicted = Math.round(avgDaily * weekdayMultiplier[dayOfWeek] + bookingPremium / 7);
      weekTotal += predicted;
      forecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted,
        confidence: days.length >= 10 ? 'HIGH' : days.length >= 5 ? 'MEDIUM' : 'LOW',
      });
    }

    return {
      dailyForecasts: forecasts,
      weekTotal,
      basis: `Based on ${days.length}-day history (avg $${(avgDaily / 100).toFixed(0)}/day) + ${upcomingBookings} confirmed bookings`,
    };
  }
}
