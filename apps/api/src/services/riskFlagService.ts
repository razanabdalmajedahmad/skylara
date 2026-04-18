/**
 * Risk Flag Service — Scenario 4
 * Automated risk assessment for flyers. Checks multiple safety dimensions
 * and returns flags that DZ managers can act on (approve/block).
 *
 * Extends: existing validationGates.ts (10 safety gates) + auditService.ts
 */

interface RiskFlag {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  message: string;
  details?: string;
  autoBlock: boolean; // If true, flyer is automatically blocked
}

interface RiskAssessmentResult {
  userId: number;
  overallRisk: 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
  flags: RiskFlag[];
  score: number; // 0 = no risk, 100 = maximum risk
  assessedAt: Date;
  canJump: boolean;
}

export class RiskFlagService {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  /**
   * Run full risk assessment on a user/athlete
   */
  async assessRisk(userId: number, dropzoneId: number): Promise<RiskAssessmentResult> {
    const flags: RiskFlag[] = [];
    const now = new Date();

    // 1. Get user data with all relations
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        waiverSignatures: { orderBy: { signedAt: 'desc' }, take: 1 },
        gearItems: { where: { status: 'ACTIVE' } },
        gearChecks: { orderBy: { checkedAt: 'desc' }, take: 1 },
        incidents: { where: { createdAt: { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } } },
        logbookEntries: { orderBy: { jumpDate: 'desc' }, take: 1 },
      },
    }).catch(() => null);

    if (!user) {
      return { userId, overallRisk: 'BLOCKED', flags: [{ id: 'user-not-found', severity: 'CRITICAL', category: 'Identity', message: 'User not found in system', autoBlock: true }], score: 100, assessedAt: now, canJump: false };
    }

    // 2. License check
    const license = await this.prisma.license.findFirst({ where: { userId, status: 'ACTIVE' } }).catch(() => null);
    if (!license) {
      flags.push({ id: 'no-license', severity: 'HIGH', category: 'License', message: 'No active license on file', details: 'Requires at minimum a student rating or tandem certificate', autoBlock: false });
    } else if (license.expiryDate && new Date(license.expiryDate) < now) {
      flags.push({ id: 'expired-license', severity: 'CRITICAL', category: 'License', message: `License expired on ${new Date(license.expiryDate).toLocaleDateString()}`, autoBlock: true });
    }

    // 3. Waiver check
    const waiver = user.waiverSignatures?.[0];
    if (!waiver) {
      flags.push({ id: 'no-waiver', severity: 'CRITICAL', category: 'Waiver', message: 'No signed waiver on file', autoBlock: true });
    } else {
      const waiverAge = (now.getTime() - new Date(waiver.signedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (waiverAge > 365) {
        flags.push({ id: 'expired-waiver', severity: 'HIGH', category: 'Waiver', message: 'Waiver expired (>12 months)', autoBlock: false });
      }
    }

    // 4. Gear repack check (reserve must be repacked within 180 days)
    const gearItems = user.gearItems || [];
    for (const gear of gearItems) {
      if (gear.type === 'RESERVE' && gear.lastRepackDate) {
        const repackAge = (now.getTime() - new Date(gear.lastRepackDate).getTime()) / (1000 * 60 * 60 * 24);
        if (repackAge > 180) {
          flags.push({ id: `reserve-overdue-${gear.id}`, severity: 'CRITICAL', category: 'Gear', message: `Reserve repack overdue (${Math.floor(repackAge)} days since last repack)`, autoBlock: true });
        } else if (repackAge > 150) {
          flags.push({ id: `reserve-due-soon-${gear.id}`, severity: 'MEDIUM', category: 'Gear', message: `Reserve repack due soon (${Math.floor(180 - repackAge)} days remaining)`, autoBlock: false });
        }
      }
    }

    // 5. Currency check (must have jumped within last 90 days for licensed jumpers)
    const lastJump = user.logbookEntries?.[0];
    if (lastJump) {
      const daysSinceJump = (now.getTime() - new Date(lastJump.jumpDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceJump > 90) {
        flags.push({ id: 'currency-lapsed', severity: 'MEDIUM', category: 'Currency', message: `Last jump was ${Math.floor(daysSinceJump)} days ago`, details: 'May need refresher training or supervised jump', autoBlock: false });
      }
    }

    // 6. Incident history — recent incidents are a flag
    const recentIncidents = user.incidents || [];
    if (recentIncidents.length >= 3) {
      flags.push({ id: 'multiple-incidents', severity: 'HIGH', category: 'Safety', message: `${recentIncidents.length} incidents in the last 12 months`, details: 'Requires safety officer review before jumping', autoBlock: false });
    } else if (recentIncidents.length >= 1) {
      flags.push({ id: 'recent-incident', severity: 'MEDIUM', category: 'Safety', message: `${recentIncidents.length} incident(s) in the last 12 months`, autoBlock: false });
    }

    // 7. Weight check — if user has weight data and it's outside limits
    if (user.weight) {
      if (user.weight > 113) { // 250 lbs — typical tandem limit
        flags.push({ id: 'weight-limit', severity: 'HIGH', category: 'Weight', message: `Weight ${user.weight}kg exceeds tandem limit`, autoBlock: false });
      }
    }

    // 8. Check if user is already blocked
    const existingBlock = await this.prisma.riskAssessment.findFirst({
      where: { userId, dropzoneId, status: 'BLOCKED' },
    }).catch(() => null);
    if (existingBlock) {
      flags.push({ id: 'manually-blocked', severity: 'CRITICAL', category: 'Admin', message: 'User is currently blocked by DZ management', details: existingBlock.notes || 'Contact front desk', autoBlock: true });
    }

    // Calculate risk score
    let score = 0;
    for (const flag of flags) {
      switch (flag.severity) {
        case 'CRITICAL': score += 30; break;
        case 'HIGH': score += 20; break;
        case 'MEDIUM': score += 10; break;
        case 'LOW': score += 5; break;
      }
    }
    score = Math.min(score, 100);

    // Determine overall risk level
    const hasAutoBlock = flags.some(f => f.autoBlock);
    const overallRisk = hasAutoBlock ? 'BLOCKED' as const
      : score >= 50 ? 'HIGH' as const
      : score >= 25 ? 'MEDIUM' as const
      : score > 0 ? 'LOW' as const
      : 'CLEAR' as const;

    const result: RiskAssessmentResult = {
      userId, overallRisk, flags, score, assessedAt: now,
      canJump: !hasAutoBlock && score < 50,
    };

    // Store assessment
    await this.prisma.riskAssessment.create({
      data: {
        userId, dropzoneId,
        riskScore: score,
        status: overallRisk,
        flags: flags,
        notes: flags.map(f => `[${f.severity}] ${f.message}`).join('; '),
      },
    }).catch(() => {});

    return result;
  }

  /**
   * Block a flyer (DZ manager action)
   */
  async blockFlyer(userId: number, dropzoneId: number, reason: string, blockedBy: number): Promise<void> {
    await this.prisma.riskAssessment.create({
      data: {
        userId, dropzoneId, riskScore: 100, status: 'BLOCKED',
        flags: [{ id: 'manual-block', severity: 'CRITICAL', category: 'Admin', message: reason, autoBlock: true }],
        notes: reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: blockedBy, dropzoneId, action: 'UPDATE',
        entityType: 'RiskAssessment', entityId: userId,
        afterState: { event: 'flyer_blocked', reason, targetUserId: userId },
      },
    });
  }

  /**
   * Unblock a flyer (DZ manager action)
   */
  async unblockFlyer(userId: number, dropzoneId: number, unblockedBy: number): Promise<void> {
    await this.prisma.riskAssessment.updateMany({
      where: { userId, dropzoneId, status: 'BLOCKED' },
      data: { status: 'CLEARED' },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: unblockedBy, dropzoneId, action: 'UPDATE',
        entityType: 'RiskAssessment', entityId: userId,
        afterState: { event: 'flyer_unblocked', targetUserId: userId },
      },
    });
  }
}
