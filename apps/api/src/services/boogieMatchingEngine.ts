import { PrismaClient } from "@prisma/client";

// ============================================================================
// BOOGIE SMART MATCHING ENGINE — Safety-aware participant grouping
// ============================================================================

export interface MatchAssessment {
  registrationId: number;
  participantName: string;
  freefallFitScore: number;     // 0-100
  canopySafetyScore: number;    // 0-100
  tunnelReadinessScore: number; // 0-100
  gearReadinessScore: number;   // 0-100
  overallScore: number;         // 0-100
  suggestedGroup: string | null;
  suggestedDiscipline: string | null;
  blockers: string[];
  warnings: string[];
  explanation: string;
  confidence: 'STRONG_FIT' | 'GOOD_FIT' | 'NEEDS_REVIEW' | 'RISKY' | 'BLOCKED';
}

interface EventRequirements {
  minJumps?: number | null;
  minLicense?: string | null;
  minTunnelHours?: number | null;
  aadRequired?: boolean;
  ownRigRequired?: boolean;
  discipline?: string | null;
}

const LICENSE_RANK: Record<string, number> = { STUDENT: 0, A: 1, B: 2, C: 3, D: 4 };

export class BoogieMatchingEngine {
  constructor(private prisma: PrismaClient) {}

  async assessAll(boogieId: number): Promise<MatchAssessment[]> {
    const boogie = await this.prisma.boogie.findUnique({ where: { id: boogieId } });
    if (!boogie) return [];

    const registrations = await this.prisma.boogieRegistration.findMany({
      where: { boogieId, status: { in: ['APPROVED', 'PENDING'] } },
    });

    const requirements: EventRequirements = {
      minJumps: boogie.minJumps,
      minLicense: boogie.minLicense,
      minTunnelHours: boogie.minTunnelHours,
      aadRequired: boogie.aadRequired,
      ownRigRequired: boogie.ownRigRequired,
      discipline: boogie.discipline,
    };

    return registrations.map(reg => this.assessOne(reg, requirements));
  }

  private assessOne(reg: any, req: EventRequirements): MatchAssessment {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Freefall Fit Score
    let freefallFit = 50;
    const jumps = reg.numberOfJumps || 0;
    if (jumps >= 500) freefallFit = 95;
    else if (jumps >= 200) freefallFit = 80;
    else if (jumps >= 100) freefallFit = 65;
    else if (jumps >= 50) freefallFit = 50;
    else if (jumps >= 25) freefallFit = 35;
    else freefallFit = 20;

    // Min jumps check
    if (req.minJumps && jumps < req.minJumps) {
      blockers.push(`Minimum ${req.minJumps} jumps required, has ${jumps}`);
      freefallFit = Math.max(0, freefallFit - 30);
    }

    // License check
    const licenseLevel = LICENSE_RANK[reg.licenseType?.toUpperCase()] ?? -1;
    const reqLevel = req.minLicense ? (LICENSE_RANK[req.minLicense.toUpperCase()] ?? 0) : 0;
    if (licenseLevel < reqLevel) {
      blockers.push(`Minimum ${req.minLicense} license required, has ${reg.licenseType || 'None'}`);
    }

    // Canopy Safety Score — uses canopy size, wing loading, and experience
    let canopyScore = 70;
    const canopySize = reg.canopySize || 0;
    const wingLoad = reg.wingLoading ? parseFloat(String(reg.wingLoading)) : 0;

    if (wingLoad > 1.8) { canopyScore = 30; warnings.push(`High wing loading (${wingLoad}) — recommend canopy coaching`); }
    else if (wingLoad > 1.5 && jumps < 500) { canopyScore = 45; warnings.push(`Wing loading ${wingLoad} with ${jumps} jumps — monitor canopy choices`); }
    else if (wingLoad > 1.3 && jumps < 200) { canopyScore = 35; blockers.push(`Dangerous wing loading (${wingLoad}) for experience level (${jumps} jumps)`); }

    if (canopySize > 0 && canopySize < 120 && jumps < 500) { warnings.push(`Small canopy (${canopySize} sqft) for ${jumps} jumps`); canopyScore -= 10; }
    if (jumps < 100) { canopyScore = Math.min(canopyScore, 40); warnings.push('Low experience — recommend canopy coaching'); }
    else if (jumps < 200) { canopyScore = Math.min(canopyScore, 60); }

    // Recency check
    const recentJumps = reg.jumpsLast90Days || 0;
    if (recentJumps === 0 && jumps > 0) { warnings.push('No jumps in last 90 days — currency concern'); canopyScore -= 10; freefallFit -= 10; }
    else if (recentJumps < 5 && jumps > 100) { warnings.push(`Only ${recentJumps} jumps in last 90 days`); }

    // Tunnel Readiness
    let tunnelScore = 50;
    const tunnel = reg.tunnelTime || 0;
    if (tunnel >= 10) tunnelScore = 90;
    else if (tunnel >= 5) tunnelScore = 70;
    else if (tunnel >= 2) tunnelScore = 50;
    else if (tunnel > 0) tunnelScore = 30;
    else tunnelScore = 10;

    if (req.minTunnelHours && tunnel < req.minTunnelHours) {
      warnings.push(`Recommended ${req.minTunnelHours}h tunnel time, has ${tunnel}h`);
    }

    // Gear Readiness
    let gearScore = 100;
    if (req.aadRequired && !reg.aadConfirmed) {
      blockers.push('AAD confirmation required');
      gearScore -= 40;
    }
    if (req.ownRigRequired && reg.gearOwnership !== 'OWN_RIG') {
      blockers.push('Own rig required, participant needs rental');
      gearScore -= 30;
    }
    if (reg.gearOwnership === 'RENTAL_NEEDED') {
      warnings.push('Needs rental gear — verify availability');
      gearScore -= 10;
    }

    // Overall score
    const overall = Math.round(
      freefallFit * 0.35 + canopyScore * 0.20 + tunnelScore * 0.15 + gearScore * 0.30
    );

    // Confidence level
    let confidence: MatchAssessment['confidence'] = 'GOOD_FIT';
    if (blockers.length > 0) confidence = 'BLOCKED';
    else if (overall >= 80) confidence = 'STRONG_FIT';
    else if (overall >= 60) confidence = 'GOOD_FIT';
    else if (overall >= 40) confidence = 'NEEDS_REVIEW';
    else confidence = 'RISKY';

    // Suggested group
    let suggestedGroup = null;
    const suggestedDiscipline = req.discipline || null;
    if (jumps >= 500) suggestedGroup = 'Advanced';
    else if (jumps >= 200) suggestedGroup = 'Intermediate+';
    else if (jumps >= 100) suggestedGroup = 'Intermediate';
    else suggestedGroup = 'Beginner/Coach';

    const explanation = blockers.length > 0
      ? `BLOCKED: ${blockers.join('; ')}`
      : `${confidence}: ${jumps} jumps, ${tunnel}h tunnel, ${reg.licenseType || 'no'} license. ${warnings.join('. ')}`;

    return {
      registrationId: reg.id,
      participantName: `${reg.firstName} ${reg.lastName}`,
      freefallFitScore: Math.max(0, Math.min(100, freefallFit)),
      canopySafetyScore: Math.max(0, Math.min(100, canopyScore)),
      tunnelReadinessScore: Math.max(0, Math.min(100, tunnelScore)),
      gearReadinessScore: Math.max(0, Math.min(100, gearScore)),
      overallScore: Math.max(0, Math.min(100, overall)),
      suggestedGroup,
      suggestedDiscipline,
      blockers,
      warnings,
      explanation,
      confidence,
    };
  }

  /**
   * Auto-build recommended groups from assessments.
   * Groups participants by skill band, respecting maxGroupSize.
   */
  async autoBuildGroups(boogieId: number, maxGroupSize: number = 8): Promise<{ groupsCreated: number; assignments: number }> {
    const assessments = await this.assessAll(boogieId);
    const eligible = assessments.filter(a => a.confidence !== 'BLOCKED');

    // Bucket by suggested group
    const buckets: Record<string, typeof eligible> = {};
    for (const a of eligible) {
      const band = a.suggestedGroup || 'Mixed';
      if (!buckets[band]) buckets[band] = [];
      buckets[band].push(a);
    }

    let groupsCreated = 0;
    let assignments = 0;

    for (const [band, members] of Object.entries(buckets)) {
      // Split into groups of maxGroupSize
      for (let i = 0; i < members.length; i += maxGroupSize) {
        const chunk = members.slice(i, i + maxGroupSize);
        const groupNum = Math.floor(i / maxGroupSize) + 1;

        const group = await this.prisma.boogieGroup.create({
          data: {
            boogieId,
            name: `${band} ${groupNum}`,
            groupType: 'JUMP',
            targetSkillBand: band.toUpperCase().replace(/[^A-Z]/g, '_'),
            maxSize: maxGroupSize,
            safetyFlags: [],
          },
        });

        for (const member of chunk) {
          await this.prisma.boogieGroupMember.create({
            data: {
              groupId: group.id,
              registrationId: member.registrationId,
              role: 'PARTICIPANT',
              fitScore: member.overallScore,
            },
          }).catch(() => {}); // Skip if already assigned
          assignments++;
        }
        groupsCreated++;
      }
    }

    return { groupsCreated, assignments };
  }
}
