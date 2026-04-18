import { PrismaClient } from "@prisma/client";

// ============================================================================
// INSTRUCTOR MATCHER — Skill-based assignment with availability & workload
// ============================================================================
// Finds the best instructor for a given slot type, considering:
//   1. Required skill match (TANDEM, AFF, COACH, etc.)
//   2. Availability (day/time window or specific date)
//   3. Current workload (loads today — fatigue advisory at 4+)
//   4. Skill rating (1-5, higher preferred)
//   5. Certification expiry (must be current)
// ============================================================================

export interface MatchCandidate {
  userId: number;
  userName: string;
  skillRating: number | null;
  loadsToday: number;
  isFatigueWarning: boolean; // 4+ consecutive loads
  availabilityMatch: boolean;
  certExpired: boolean;
  score: number; // 0-100 composite
}

export interface MatchRequest {
  dropzoneId: number;
  skillCode: string; // TANDEM, AFF, COACH, etc.
  date: Date;
  loadId?: number;
  studentId?: number;
  excludeUserIds?: number[];
}

const FATIGUE_THRESHOLD = 4; // loads before fatigue advisory

export class InstructorMatcher {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find and rank available instructors for a given skill requirement.
   */
  async findMatches(req: MatchRequest): Promise<MatchCandidate[]> {
    const dayOfWeek = req.date.getDay();

    // Step 1: Find instructors with the required skill
    const skillType = await this.prisma.instructorSkillType.findFirst({
      where: { code: req.skillCode as any },
    });

    if (!skillType) return [];

    const skilledInstructors = await this.prisma.instructorSkill.findMany({
      where: {
        skillTypeId: skillType.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const candidates: MatchCandidate[] = [];

    for (const skill of skilledInstructors) {
      const userId = skill.userId;

      // Skip excluded users
      if (req.excludeUserIds?.includes(userId)) continue;

      // Check certification expiry
      const certExpired = skill.expiresAt ? skill.expiresAt < new Date() : false;

      // Step 2: Check availability
      const availability = await this.prisma.instructorAvailability.findFirst({
        where: {
          userId,
          dropzoneId: req.dropzoneId,
          OR: [
            { isRecurring: true, dayOfWeek },
            {
              isRecurring: false,
              specificDate: {
                gte: new Date(req.date.toISOString().split("T")[0]),
                lt: new Date(
                  new Date(req.date.toISOString().split("T")[0]).getTime() + 24 * 60 * 60 * 1000
                ),
              },
            },
          ],
        },
      });

      const availabilityMatch = !!availability;

      // Step 3: Check workload today
      const todayStart = new Date(req.date);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const loadsToday = await this.prisma.instructorAssignment.count({
        where: {
          instructorId: userId,
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      });

      const isFatigueWarning = loadsToday >= FATIGUE_THRESHOLD;

      // Step 4: Compute composite score (0-100)
      let score = 0;

      // Availability: +40 points
      if (availabilityMatch) score += 40;

      // Skill rating: up to +25 points (5 per star)
      const rating = skill.rating ?? 3;
      score += rating * 5;

      // Low workload bonus: +20 if < 2 loads, +10 if < 4
      if (loadsToday < 2) score += 20;
      else if (loadsToday < FATIGUE_THRESHOLD) score += 10;

      // Not expired: +15 points
      if (!certExpired) score += 15;

      // Fatigue penalty: -10
      if (isFatigueWarning) score -= 10;

      candidates.push({
        userId,
        userName: `${skill.user.firstName} ${skill.user.lastName}`,
        skillRating: skill.rating,
        loadsToday,
        isFatigueWarning,
        availabilityMatch,
        certExpired,
        score: Math.max(0, Math.min(100, score)),
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates;
  }

  /**
   * Auto-assign best available instructor and persist the assignment.
   */
  async assignBest(req: MatchRequest): Promise<{
    assigned: boolean;
    candidate?: MatchCandidate;
    assignmentId?: number;
  }> {
    const candidates = await this.findMatches(req);

    // Filter out expired certs and require availability
    const eligible = candidates.filter(
      (c) => !c.certExpired && c.availabilityMatch
    );

    if (eligible.length === 0) {
      return { assigned: false };
    }

    const best = eligible[0];

    const assignment = await this.prisma.instructorAssignment.create({
      data: {
        loadId: req.loadId!,
        instructorId: best.userId,
        studentId: req.studentId,
        assignmentType: req.skillCode,
        score: best.score,
      },
    });

    return {
      assigned: true,
      candidate: best,
      assignmentId: assignment.id,
    };
  }

  /**
   * Get instructor's current load count for fatigue tracking.
   */
  async getWorkloadSummary(
    instructorId: number,
    date?: Date
  ): Promise<{ loadsToday: number; isFatigueWarning: boolean }> {
    const targetDate = date ?? new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const loadsToday = await this.prisma.instructorAssignment.count({
      where: {
        instructorId,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    return {
      loadsToday,
      isFatigueWarning: loadsToday >= FATIGUE_THRESHOLD,
    };
  }
}

export function createInstructorMatcher(prisma: PrismaClient): InstructorMatcher {
  return new InstructorMatcher(prisma);
}
