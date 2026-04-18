/**
 * PHASE 6: SEED DATA — PRODUCTION QUALITY
 * Comprehensive seed for SkyLara MVP demo with realistic, operationally believable data
 * Matches exact Prisma schema field names and types
 * Scenario: Saturday operations at a busy DZ with 12 loads, 35+ athletes, full staff
 */

import {
  PrismaClient,
  LoadStatus,
  SlotType,
  GroupType,
  GroupMemberRole,
  GroupMemberStatus,
  GearType,
  GearStatus,
  GearCheckResult,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  IncidentSeverity,
  IncidentStatus,
  AuditAction,
  WaiverType,
  QrTokenType,
  TransactionType,
  OnboardingCategory,
  OnboardingAccessMode,
  OnboardingStepType,
  OnboardingApplicationStatus,
  CampaignStatus,
  CampaignTriggerType,
  AutomationTriggerEvent,
  ConsentStatus,
} from '@prisma/client';
import { randomUUID, scryptSync, randomBytes } from 'crypto';
import { seedPolicyDefinitions } from '../apps/api/src/services/policySeeder';

const prisma = new PrismaClient();
const PASSWORD = 'skylara2026';

/** Pure-JS password hash using Node's built-in scrypt — no native deps */
function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `$scrypt$16384$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
}

async function main() {
  console.log('🌱 Seeding SkyLara database with realistic Saturday operations...');

  // Disable FK checks for clean slate
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  // Clear all tables in dependency order (Phase 3-6 new models first)
  // Chat, Jobs, Learning tables
  await (prisma as any).chatMessage?.deleteMany().catch(() => {});
  await (prisma as any).chatMember?.deleteMany().catch(() => {});
  await (prisma as any).chatChannel?.deleteMany().catch(() => {});
  await (prisma as any).jobApplication?.deleteMany().catch(() => {});
  await (prisma as any).jobPostTarget?.deleteMany().catch(() => {});
  await (prisma as any).jobPost?.deleteMany().catch(() => {});
  await (prisma as any).learningLessonProgress?.deleteMany().catch(() => {});
  await (prisma as any).learningEnrollment?.deleteMany().catch(() => {});
  await (prisma as any).learningLesson?.deleteMany().catch(() => {});
  await (prisma as any).learningCourseModule?.deleteMany().catch(() => {});
  await (prisma as any).learningCourse?.deleteMany().catch(() => {});

  // Onboarding & Notification tables
  await prisma.notificationEvent.deleteMany();
  await prisma.notificationCampaign.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.communicationPreference.deleteMany();
  await prisma.whatsAppConsent.deleteMany();
  await prisma.pushDevice.deleteMany();
  await prisma.applicationStepResponse.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.waiverAcknowledgement.deleteMany();
  await prisma.approvalRule.deleteMany();
  await prisma.onboardingApplication.deleteMany();
  await prisma.onboardingTemplateStep.deleteMany();
  await prisma.onboardingTemplate.deleteMany();
  await prisma.onboardingSession.deleteMany();
  await prisma.assistantRecommendation.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.notificationDelivery.deleteMany();

  await prisma.eventOutbox.deleteMany();
  await prisma.overrideLog.deleteMany();
  await prisma.bookingRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.bookingPackage.deleteMany();
  await prisma.dzPricing.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.instructorAssignment.deleteMany();
  await prisma.instructorAvailability.deleteMany();
  await prisma.instructorSkill.deleteMany();
  await prisma.instructorSkillType.deleteMany();
  await prisma.affRecord.deleteMany();
  await prisma.logbookEntry.deleteMany();
  await prisma.currencyCheck.deleteMany();
  await prisma.license.deleteMany();
  await prisma.cgCheck.deleteMany();
  await prisma.loadNote.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.gearRental.deleteMany();
  await prisma.weatherData.deleteMany();
  await prisma.weatherHold.deleteMany();
  await prisma.incidentInvolvedParty.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.athlete.deleteMany();

  // Original tables
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.gearCheck.deleteMany();
  await prisma.gearItem.deleteMany();
  await prisma.waiverSignature.deleteMany();
  await prisma.waiver.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.jumpTicket.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.load.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.syncOutbox.deleteMany();
  await prisma.emergencyProfile.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.userTourProgress.deleteMany();
  await prisma.ideaNote.deleteMany();
  await prisma.venueBooking.deleteMany();
  await prisma.venueSpaceAvailability.deleteMany();
  await prisma.venueSpace.deleteMany();
  await prisma.dzBranch.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.dropzone.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // Re-enable FK checks
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  const hash = hashPasswordSync(PASSWORD);
  const now = new Date();

  // ============================================================================
  // ROLES
  // ============================================================================
  const roleNames = [
    { name: 'PLATFORM_ADMIN', displayName: 'Platform Admin' },
    { name: 'DZ_OPERATOR', displayName: 'DZ Operator' },
    { name: 'DZ_MANAGER', displayName: 'DZ Manager' },
    { name: 'MANIFEST_STAFF', displayName: 'Manifest Staff' },
    { name: 'SAFETY_OFFICER', displayName: 'Safety Officer' },
    { name: 'PILOT', displayName: 'Pilot' },
    { name: 'RIGGER', displayName: 'Rigger' },
    { name: 'TANDEM_INSTRUCTOR', displayName: 'Tandem Instructor' },
    { name: 'AFF_INSTRUCTOR', displayName: 'AFF Instructor' },
    { name: 'COACH', displayName: 'Coach' },
    { name: 'CAMERA_COACH', displayName: 'Camera Coach' },
    { name: 'ATHLETE', displayName: 'Athlete' },
    { name: 'FRONT_DESK', displayName: 'Front Desk' },
    { name: 'COMMERCIAL_ADMIN', displayName: 'Commercial Admin' },
    { name: 'AD_OPS_ADMIN', displayName: 'Ad Ops Admin' },
    { name: 'MARKETING_MANAGER', displayName: 'Marketing Manager' },
    { name: 'FACILITY_MANAGER', displayName: 'Facility Manager' },
    { name: 'AD_OPS_STAFF', displayName: 'Ad Ops Staff' },
    { name: 'MAINTENANCE_STAFF', displayName: 'Maintenance Staff' },
    { name: 'DZ_OWNER', displayName: 'Dropzone Owner' },
  ];

  const roles: Record<string, number> = {};
  for (const r of roleNames) {
    const created = await prisma.role.create({ data: r });
    roles[r.name] = created.id;
  }

  // ============================================================================
  // ORGANIZATION & DROPZONE
  // ============================================================================
  const adminUser = await prisma.user.create({
    data: {
      uuid: randomUUID(),
      email: 'admin@skylara.dev',
      firstName: 'Ali',
      lastName: 'Kwika',
      passwordHash: hash,
    },
  });

  const org = await prisma.organization.create({
    data: {
      uuid: randomUUID(),
      name: 'SkyHigh Aviation LLC',
      slug: 'skyhigh-aviation',
      ownerId: adminUser.id,
    },
  });

  const dz = await prisma.dropzone.create({
    data: {
      uuid: randomUUID(),
      organizationId: org.id,
      name: 'SkyHigh DZ — Perris',
      slug: 'skyhigh-perris',
      icaoCode: 'KPRZ',
      latitude: 33.7672,
      longitude: -117.2157,
      timezone: 'America/Los_Angeles',
      windLimitKnots: 25,
      currency: 'USD',
    },
  });

  const branch = await prisma.dzBranch.create({
    data: { dropzoneId: dz.id, name: 'Main Operations', isDefault: true },
  });

  // ============================================================================
  // STAFF USERS (11 people)
  // ============================================================================
  async function mkStaff(email: string, first: string, last: string, roleKeys: string[]) {
    const u = await prisma.user.create({
      data: { uuid: randomUUID(), email, firstName: first, lastName: last, passwordHash: hash },
    });
    for (const rk of roleKeys) {
      await prisma.userRole.create({
        data: { userId: u.id, roleId: roles[rk], organizationId: org.id, dropzoneId: dz.id },
      });
    }
    return u;
  }

  // Admin roles
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: roles.PLATFORM_ADMIN, organizationId: org.id, dropzoneId: dz.id },
  });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: roles.DZ_MANAGER, organizationId: org.id, dropzoneId: dz.id },
  });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: roles.COMMERCIAL_ADMIN, organizationId: org.id, dropzoneId: dz.id },
  });

  const manifestUser = await mkStaff('manifest@skylara.dev', 'Sarah', 'Chen', ['MANIFEST_STAFF']);
  const safetyUser = await mkStaff('safety@skylara.dev', 'Mike', 'Rodriguez', ['SAFETY_OFFICER']);
  const pilotUser1 = await mkStaff('pilot1@skylara.dev', 'Tom', 'Wilson', ['PILOT']);
  const pilotUser2 = await mkStaff('pilot2@skylara.dev', 'Carlos', 'Mendez', ['PILOT']);
  const riggerUser = await mkStaff('rigger@skylara.dev', 'Emma', 'Davis', ['RIGGER']);
  const frontDesk = await mkStaff('front@skylara.dev', 'Lisa', 'Park', ['FRONT_DESK']);
  const tandem1 = await mkStaff('tandem1@skylara.dev', 'Jake', 'Hunter', ['TANDEM_INSTRUCTOR', 'CAMERA_COACH']);
  const tandem2 = await mkStaff('tandem2@skylara.dev', 'Maria', 'Santos', ['TANDEM_INSTRUCTOR']);
  const affi = await mkStaff('aff1@skylara.dev', 'Chris', 'Blake', ['AFF_INSTRUCTOR']);
  const coach = await mkStaff('coach1@skylara.dev', 'Alex', 'Kim', ['COACH']);

  // ============================================================================
  // AIRCRAFT (3)
  // ============================================================================
  const ac208 = await prisma.aircraft.create({
    data: {
      dropzoneId: dz.id,
      registration: 'N208SH',
      type: 'Cessna 208B Grand Caravan',
      maxCapacity: 15,
      maxWeight: 3800,
      emptyWeight: 2145,
    },
  });

  const ac182 = await prisma.aircraft.create({
    data: {
      dropzoneId: dz.id,
      registration: 'N182SH',
      type: 'Cessna 182',
      maxCapacity: 4,
      maxWeight: 1100,
      emptyWeight: 720,
    },
  });

  const acKingAir = await prisma.aircraft.create({
    data: {
      dropzoneId: dz.id,
      registration: 'N750XL',
      type: 'Beechcraft King Air',
      maxCapacity: 23,
      maxWeight: 5500,
      emptyWeight: 3150,
    },
  });

  // ============================================================================
  // ATHLETES (35+ people) — International realistic names & backgrounds
  // ============================================================================
  const athleteData = [
    // Licensed Fun Jumpers (8) - C/D license, 100-3000+ jumps
    { email: 'athlete1@skylara.dev', first: 'Hassan', last: 'Al-Rashid', jumps: 500, license: 'D', country: 'United Arab Emirates' },
    { email: 'athlete2@skylara.dev', first: 'Yuki', last: 'Tanaka', jumps: 1200, license: 'D', country: 'Japan' },
    { email: 'athlete3@skylara.dev', first: 'Klaus', last: 'Schmidt', jumps: 800, license: 'C', country: 'Germany' },
    { email: 'athlete4@skylara.dev', first: 'Ana', last: 'Silva', jumps: 350, license: 'C', country: 'Brazil' },
    { email: 'athlete5@skylara.dev', first: 'Priya', last: 'Kapoor', jumps: 650, license: 'D', country: 'India' },
    { email: 'athlete6@skylara.dev', first: 'Pierre', last: 'Dubois', jumps: 950, license: 'C', country: 'France' },
    { email: 'athlete7@skylara.dev', first: 'Sofia', last: 'Rossi', jumps: 420, license: 'C', country: 'Italy' },
    { email: 'athlete8@skylara.dev', first: 'Erik', last: 'Nilsson', jumps: 1100, license: 'D', country: 'Sweden' },

    // AFF Students (6) - Levels 1-8
    { email: 'athlete9@skylara.dev', first: 'Jamie', last: 'Chen', jumps: 2, license: 'STUDENT_1', country: 'Canada' },
    { email: 'athlete10@skylara.dev', first: 'Marcus', last: 'Johnson', jumps: 5, license: 'STUDENT_2', country: 'USA' },
    { email: 'athlete11@skylara.dev', first: 'Elena', last: 'Petrova', jumps: 12, license: 'STUDENT_4', country: 'Russia' },
    { email: 'athlete12@skylara.dev', first: 'Diego', last: 'Garcia', jumps: 25, license: 'STUDENT_6', country: 'Mexico' },
    { email: 'athlete13@skylara.dev', first: 'Sophie', last: 'Laurent', jumps: 8, license: 'STUDENT_3', country: 'Switzerland' },
    { email: 'athlete14@skylara.dev', first: 'David', last: 'Cohen', jumps: 18, license: 'STUDENT_5', country: 'Israel' },

    // Tandem Customers (5) - First-timers & returning
    { email: 'athlete15@skylara.dev', first: 'Jennifer', last: 'Walters', jumps: 0, license: 'TANDEM', country: 'USA' },
    { email: 'athlete16@skylara.dev', first: 'Robert', last: 'Williams', jumps: 1, license: 'TANDEM', country: 'USA' },
    { email: 'athlete17@skylara.dev', first: 'Maria', last: 'Hernandez', jumps: 0, license: 'TANDEM', country: 'USA' },
    { email: 'athlete18@skylara.dev', first: 'Michael', last: 'Lee', jumps: 2, license: 'TANDEM', country: 'USA' },
    { email: 'athlete19@skylara.dev', first: 'Amanda', last: 'Brown', jumps: 1, license: 'TANDEM', country: 'USA' },

    // Visiting Jumpers from other DZs (4) - Various nationalities
    { email: 'athlete20@skylara.dev', first: 'Dirk', last: 'Huber', jumps: 780, license: 'D', country: 'Austria' },
    { email: 'athlete21@skylara.dev', first: 'Marta', last: 'Lopez', jumps: 920, license: 'C', country: 'Spain' },
    { email: 'athlete22@skylara.dev', first: 'Kenji', last: 'Yamamoto', jumps: 600, license: 'C', country: 'Japan' },
    { email: 'athlete23@skylara.dev', first: 'Laurent', last: 'Blanc', jumps: 1100, license: 'D', country: 'Belgium' },

    // Wingsuit Flyers (3) - D license, 500+ jumps
    { email: 'athlete24@skylara.dev', first: 'Sergei', last: 'Volkoff', jumps: 650, license: 'D', country: 'Ukraine' },
    { email: 'athlete25@skylara.dev', first: 'Ingrid', last: 'Johansson', jumps: 720, license: 'D', country: 'Norway' },
    { email: 'athlete26@skylara.dev', first: 'Fabio', last: 'Iacono', jumps: 560, license: 'D', country: 'Italy' },

    // Coaches & Organizers (3)
    { email: 'athlete27@skylara.dev', first: 'Heather', last: 'Rivera', jumps: 1850, license: 'D', country: 'USA' },
    { email: 'athlete28@skylara.dev', first: 'James', last: 'Murphy', jumps: 2100, license: 'D', country: 'USA' },
    { email: 'athlete29@skylara.dev', first: 'Lisa', last: 'Anderson', jumps: 1400, license: 'D', country: 'USA' },

    // Inactive/Suspended (3)
    { email: 'athlete30@skylara.dev', first: 'Marcus', last: 'Powell', jumps: 245, license: 'EXPIRED', country: 'USA' },
    { email: 'athlete31@skylara.dev', first: 'Patricia', last: 'Khan', jumps: 420, license: 'SUSPENDED', country: 'USA' },
    { email: 'athlete32@skylara.dev', first: 'Kevin', last: 'Zhang', jumps: 180, license: 'EXPIRED', country: 'USA' },

    // Additional athletes to reach 35
    { email: 'athlete33@skylara.dev', first: 'Alexandra', last: 'Morgenstern', jumps: 340, license: 'C', country: 'Australia' },
    { email: 'athlete34@skylara.dev', first: 'Paulo', last: 'Ferreira', jumps: 880, license: 'D', country: 'Portugal' },
    { email: 'athlete35@skylara.dev', first: 'Natasha', last: 'Sokolov', jumps: 1250, license: 'D', country: 'Belarus' },
  ];

  const athletes: Record<string, Awaited<ReturnType<typeof mkStaff>>> = {};
  for (const a of athleteData) {
    const u = await mkStaff(a.email, a.first, a.last, ['ATHLETE']);
    athletes[a.email] = u;

    // Create user profile with realistic data
    await prisma.userProfile.create({
      data: {
        userId: u.id,
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
        nationality: a.country,
        bio: `${a.jumps} jumps | ${a.license} license | From ${a.country}`,
        emergencyContactName: `${a.first}'s Emergency Contact`,
        emergencyContactPhone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        emergencyContactRelation: ['Spouse', 'Parent', 'Sibling', 'Friend'][Math.floor(Math.random() * 4)],
      },
    });

    // Create emergency profile for active athletes
    if (!['EXPIRED', 'SUSPENDED'].includes(a.license)) {
      await prisma.emergencyProfile.create({
        data: {
          userId: u.id,
          bloodType: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'][Math.floor(Math.random() * 8)],
          allergies: Math.random() > 0.7 ? 'Penicillin' : null,
          medicalConditions: Math.random() > 0.8 ? 'Asthma controlled with inhaler' : null,
          primaryContactName: `${a.first}'s Emergency Contact`,
          primaryContactPhone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          primaryContactRelation: ['Spouse', 'Parent', 'Sibling', 'Friend'][Math.floor(Math.random() * 4)],
        },
      });
    }
  }

  // ============================================================================
  // LOADS (12 for Saturday)
  // ============================================================================
  const loads = [];

  // Load 001: COMPLETE - departed 08:15, landed 08:40
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser1.id,
        loadNumber: 'L-001',
        status: LoadStatus.COMPLETE,
        scheduledAt: new Date(now.getTime() - 5 * 3600_000),
        actualDepartureAt: new Date(now.getTime() - 5 * 3600_000 + 15 * 60_000),
        slotCount: 15,
      },
    }),
  );

  // Load 002: COMPLETE - departed 08:30, landed 08:50
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac182.id,
        pilotId: pilotUser2.id,
        loadNumber: 'L-002',
        status: LoadStatus.COMPLETE,
        scheduledAt: new Date(now.getTime() - 5 * 3600_000 + 15 * 60_000),
        actualDepartureAt: new Date(now.getTime() - 5 * 3600_000 + 30 * 60_000),
        slotCount: 4,
      },
    }),
  );

  // Load 003: COMPLETE - departed 09:00, landed 09:25
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser1.id,
        loadNumber: 'L-003',
        status: LoadStatus.COMPLETE,
        scheduledAt: new Date(now.getTime() - 4 * 3600_000 - 30 * 60_000),
        actualDepartureAt: new Date(now.getTime() - 4 * 3600_000),
        slotCount: 15,
      },
    }),
  );

  // Load 004: COMPLETE - departed 09:45, landed 10:10
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser2.id,
        loadNumber: 'L-004',
        status: LoadStatus.COMPLETE,
        scheduledAt: new Date(now.getTime() - 3 * 3600_000 - 45 * 60_000),
        actualDepartureAt: new Date(now.getTime() - 3 * 3600_000 - 30 * 60_000),
        slotCount: 15,
      },
    }),
  );

  // Load 005: LANDED - departed 10:00
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac182.id,
        pilotId: pilotUser1.id,
        loadNumber: 'L-005',
        status: LoadStatus.LANDED,
        scheduledAt: new Date(now.getTime() - 3 * 3600_000),
        actualDepartureAt: new Date(now.getTime() - 3 * 3600_000),
        slotCount: 4,
      },
    }),
  );

  // Load 006: AIRBORNE - departed now - 10 minutes
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser2.id,
        loadNumber: 'L-006',
        status: LoadStatus.AIRBORNE,
        scheduledAt: new Date(now.getTime() - 30 * 60_000),
        actualDepartureAt: new Date(now.getTime() - 10 * 60_000),
        slotCount: 15,
      },
    }),
  );

  // Load 007: BOARDING - scheduled now + 5 min
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser1.id,
        loadNumber: 'L-007',
        status: LoadStatus.BOARDING,
        scheduledAt: new Date(now.getTime() + 5 * 60_000),
        slotCount: 15,
      },
    }),
  );

  // Load 008: LOCKED - scheduled now + 20 min
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: acKingAir.id,
        pilotId: pilotUser2.id,
        loadNumber: 'L-008',
        status: LoadStatus.LOCKED,
        scheduledAt: new Date(now.getTime() + 20 * 60_000),
        slotCount: 23,
      },
    }),
  );

  // Load 009: FILLING - scheduled now + 45 min
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser1.id,
        loadNumber: 'L-009',
        status: LoadStatus.FILLING,
        scheduledAt: new Date(now.getTime() + 45 * 60_000),
        slotCount: 15,
      },
    }),
  );

  // Load 010: OPEN - scheduled now + 90 min
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac208.id,
        pilotId: pilotUser2.id,
        loadNumber: 'L-010',
        status: LoadStatus.OPEN,
        scheduledAt: new Date(now.getTime() + 90 * 60_000),
        slotCount: 15,
      },
    }),
  );

  // Load 011: OPEN - scheduled now + 120 min
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: ac182.id,
        pilotId: pilotUser1.id,
        loadNumber: 'L-011',
        status: LoadStatus.OPEN,
        scheduledAt: new Date(now.getTime() + 120 * 60_000),
        slotCount: 4,
      },
    }),
  );

  // Load 012: OPEN - scheduled now + 150 min
  loads.push(
    await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        branchId: branch.id,
        aircraftId: acKingAir.id,
        pilotId: pilotUser2.id,
        loadNumber: 'L-012',
        status: LoadStatus.OPEN,
        scheduledAt: new Date(now.getTime() + 150 * 60_000),
        slotCount: 23,
      },
    }),
  );

  // ============================================================================
  // SLOTS & JUMPERS (fill loads realistically)
  // ============================================================================
  const athleteEmails = Object.keys(athletes);
  let emailIdx = 0;

  async function allocateSlots(
    loadId: number,
    count: number,
    slotDefs: { type: SlotType; instructor?: Awaited<ReturnType<typeof mkStaff>>; weight: number }[],
  ) {
    for (let pos = 1; pos <= count; pos++) {
      let slotDef = slotDefs[(pos - 1) % slotDefs.length];
      let userEmail = athleteEmails[emailIdx % athleteEmails.length];
      let user = athletes[userEmail];
      emailIdx++;

      await prisma.slot.create({
        data: {
          loadId,
          position: pos,
          slotType: slotDef.type,
          userId: slotDef.type === SlotType.TANDEM_INSTRUCTOR || slotDef.type === SlotType.AFF_INSTRUCTOR ? slotDef.instructor?.id : user.id,
          instructorId: slotDef.instructor?.id || null,
          weight: slotDef.weight,
          checkedIn: [LoadStatus.COMPLETE, LoadStatus.LANDED, LoadStatus.AIRBORNE].includes(loads.find(l => l.id === loadId)?.status || LoadStatus.OPEN) ? true : Math.random() > 0.3,
        },
      });
    }
  }

  // L-001 (COMPLETE, 14/15): RW + Tandem + AFF + Camera
  await allocateSlots(loads[0].id, 14, [
    { type: SlotType.FUN, weight: 185 },
    { type: SlotType.FUN, weight: 160 },
    { type: SlotType.FUN, weight: 205 },
    { type: SlotType.FUN, weight: 175 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem1, weight: 155 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem1, weight: 200 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 165 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 195 },
    { type: SlotType.CAMERA, weight: 180 },
    { type: SlotType.WINGSUIT, weight: 170 },
    { type: SlotType.HOP_N_POP, weight: 190 },
    { type: SlotType.COACH, weight: 175 },
    { type: SlotType.FUN, weight: 155 },
    { type: SlotType.FUN, weight: 210 },
  ]);

  // L-002 (COMPLETE, 4/4): Small plane
  await allocateSlots(loads[1].id, 4, [
    { type: SlotType.FUN, weight: 180 },
    { type: SlotType.FUN, weight: 165 },
    { type: SlotType.WINGSUIT, weight: 175 },
    { type: SlotType.COACH, weight: 185 },
  ]);

  // L-003 (COMPLETE, 15/15): Mixed
  await allocateSlots(loads[2].id, 15, [
    { type: SlotType.FUN, weight: 195 },
    { type: SlotType.FUN, weight: 170 },
    { type: SlotType.FUN, weight: 155 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem2, weight: 160 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem2, weight: 210 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 168 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 198 },
    { type: SlotType.CAMERA, weight: 178 },
    { type: SlotType.WINGSUIT, weight: 182 },
    { type: SlotType.FUN, weight: 165 },
    { type: SlotType.COACH, weight: 188 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem1, weight: 155 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem1, weight: 205 },
    { type: SlotType.HOP_N_POP, weight: 175 },
    { type: SlotType.FUN, weight: 200 },
  ]);

  // L-004 (COMPLETE, 13/15): 2 empty
  await allocateSlots(loads[3].id, 13, [
    { type: SlotType.FUN, weight: 180 },
    { type: SlotType.FUN, weight: 165 },
    { type: SlotType.FUN, weight: 190 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem2, weight: 158 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem2, weight: 208 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 170 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 192 },
    { type: SlotType.CAMERA, weight: 176 },
    { type: SlotType.WINGSUIT, weight: 185 },
    { type: SlotType.FUN, weight: 155 },
    { type: SlotType.COACH, weight: 180 },
    { type: SlotType.WINGSUIT, weight: 178 },
    { type: SlotType.FUN, weight: 165 },
  ]);

  // L-005 (LANDED, 4/4)
  await allocateSlots(loads[4].id, 4, [
    { type: SlotType.FUN, weight: 185 },
    { type: SlotType.FUN, weight: 170 },
    { type: SlotType.COACH, weight: 190 },
    { type: SlotType.FUN, weight: 155 },
  ]);

  // L-006 (AIRBORNE, 15/15)
  await allocateSlots(loads[5].id, 15, [
    { type: SlotType.FUN, weight: 190 },
    { type: SlotType.FUN, weight: 165 },
    { type: SlotType.FUN, weight: 175 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem1, weight: 160 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem1, weight: 202 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 172 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 194 },
    { type: SlotType.CAMERA, weight: 177 },
    { type: SlotType.WINGSUIT, weight: 181 },
    { type: SlotType.FUN, weight: 158 },
    { type: SlotType.COACH, weight: 186 },
    { type: SlotType.HOP_N_POP, weight: 173 },
    { type: SlotType.FUN, weight: 168 },
    { type: SlotType.WINGSUIT, weight: 179 },
    { type: SlotType.FUN, weight: 162 },
  ]);

  // L-007 (BOARDING, 14/15)
  await allocateSlots(loads[6].id, 14, [
    { type: SlotType.FUN, weight: 185 },
    { type: SlotType.FUN, weight: 170 },
    { type: SlotType.FUN, weight: 195 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem2, weight: 162 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem2, weight: 206 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 174 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 196 },
    { type: SlotType.CAMERA, weight: 180 },
    { type: SlotType.WINGSUIT, weight: 183 },
    { type: SlotType.FUN, weight: 156 },
    { type: SlotType.COACH, weight: 189 },
    { type: SlotType.FUN, weight: 167 },
    { type: SlotType.FUN, weight: 172 },
    { type: SlotType.WINGSUIT, weight: 177 },
  ]);

  // L-008 (LOCKED, King Air 20/23)
  await allocateSlots(loads[7].id, 20, [
    { type: SlotType.FUN, weight: 188 },
    { type: SlotType.FUN, weight: 173 },
    { type: SlotType.FUN, weight: 198 },
    { type: SlotType.FUN, weight: 161 },
    { type: SlotType.FUN, weight: 182 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem1, weight: 159 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem1, weight: 204 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem2, weight: 164 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem2, weight: 209 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 171 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 193 },
    { type: SlotType.CAMERA, weight: 179 },
    { type: SlotType.WINGSUIT, weight: 180 },
    { type: SlotType.WINGSUIT, weight: 176 },
    { type: SlotType.COACH, weight: 187 },
    { type: SlotType.FUN, weight: 155 },
    { type: SlotType.FUN, weight: 170 },
    { type: SlotType.HOP_N_POP, weight: 174 },
    { type: SlotType.COACH, weight: 184 },
    { type: SlotType.FUN, weight: 160 },
  ]);

  // L-009 (FILLING, 9/15)
  await allocateSlots(loads[8].id, 9, [
    { type: SlotType.FUN, weight: 192 },
    { type: SlotType.FUN, weight: 166 },
    { type: SlotType.TANDEM_PASSENGER, instructor: tandem1, weight: 163 },
    { type: SlotType.TANDEM_INSTRUCTOR, instructor: tandem1, weight: 207 },
    { type: SlotType.AFF_STUDENT, instructor: affi, weight: 169 },
    { type: SlotType.AFF_INSTRUCTOR, instructor: affi, weight: 191 },
    { type: SlotType.CAMERA, weight: 175 },
    { type: SlotType.FUN, weight: 159 },
    { type: SlotType.COACH, weight: 185 },
  ]);

  // L-010 (OPEN, 3/15)
  await allocateSlots(loads[9].id, 3, [
    { type: SlotType.FUN, weight: 188 },
    { type: SlotType.FUN, weight: 172 },
    { type: SlotType.FUN, weight: 153 },
  ]);

  // L-011 (OPEN, 0/4) - leave empty
  // L-012 (OPEN, 0/23) - leave empty

  // ============================================================================
  // WALLETS (for 30+ active athletes)
  // ============================================================================
  const athleteList = athleteEmails.slice(0, 30).map((e) => athletes[e]);
  for (const a of athleteList) {
    const balance = Math.floor(Math.random() * 80000) + 5000; // $50-$850
    await prisma.wallet.create({
      data: { userId: a.id, dropzoneId: dz.id, balance },
    });
  }

  // ============================================================================
  // JUMP TICKETS (for 15 athletes)
  // ============================================================================
  const ticketHolders = athleteList.slice(0, 15);
  for (const a of ticketHolders) {
    const ticketType = Math.random() > 0.5 ? '10-PACK' : '5-PACK';
    const remaining = ['10-PACK', '5-PACK'].includes(ticketType) ? Math.floor(Math.random() * 10) + 1 : 0;

    await prisma.jumpTicket.create({
      data: {
        userId: a.id,
        dropzoneId: dz.id,
        ticketType,
        remainingJumps: remaining,
        expiresAt: new Date(now.getTime() + 90 * 24 * 3600_000),
      },
    });
  }

  // ============================================================================
  // TRANSACTIONS (25 realistic ones)
  // ============================================================================
  const transactionData = [
    // Wallet top-ups (CREDIT)
    { userId: athleteList[0].id, type: TransactionType.CREDIT, amount: 50000, description: 'Wallet top-up' },
    { userId: athleteList[1].id, type: TransactionType.CREDIT, amount: 100000, description: '10-pack gift card' },
    { userId: athleteList[2].id, type: TransactionType.CREDIT, amount: 75000, description: 'Wallet top-up' },

    // Jump ticket purchases (DEBIT)
    { userId: athleteList[3].id, type: TransactionType.DEBIT, amount: 110000, description: '10-jump pack' },
    { userId: athleteList[4].id, type: TransactionType.DEBIT, amount: 65000, description: '5-jump pack' },
    { userId: athleteList[5].id, type: TransactionType.DEBIT, amount: 110000, description: '10-jump pack' },

    // Tandem jump fees (DEBIT)
    { userId: athleteList[6].id, type: TransactionType.DEBIT, amount: 29999, description: 'Tandem jump fee' },
    { userId: athleteList[7].id, type: TransactionType.DEBIT, amount: 29999, description: 'Tandem jump fee' },
    { userId: athleteList[8].id, type: TransactionType.DEBIT, amount: 29999, description: 'Tandem jump + video' },

    // Video package upsells (DEBIT)
    { userId: athleteList[9].id, type: TransactionType.DEBIT, amount: 8999, description: 'Video download package' },
    { userId: athleteList[10].id, type: TransactionType.DEBIT, amount: 8999, description: 'Photo+video package' },

    // Gear rental (DEBIT)
    { userId: athleteList[11].id, type: TransactionType.DEBIT, amount: 2500, description: 'Helmet rental' },
    { userId: athleteList[12].id, type: TransactionType.DEBIT, amount: 3000, description: 'Altimeter rental' },

    // Weather cancellation refund (REFUND)
    { userId: athleteList[13].id, type: TransactionType.REFUND, amount: 29999, description: 'Tandem refund - weather' },
    { userId: athleteList[14].id, type: TransactionType.REFUND, amount: 15000, description: 'Jump ticket refund - personal' },

    // More top-ups
    { userId: athleteList[0].id, type: TransactionType.CREDIT, amount: 40000, description: 'Wallet top-up' },
    { userId: athleteList[1].id, type: TransactionType.CREDIT, amount: 60000, description: 'Wallet top-up' },

    // Subscription/membership
    { userId: athleteList[2].id, type: TransactionType.DEBIT, amount: 12000, description: 'Monthly membership fee' },
    { userId: athleteList[3].id, type: TransactionType.DEBIT, amount: 12000, description: 'Monthly membership fee' },

    // AFF progression fees
    { userId: athleteList[4].id, type: TransactionType.DEBIT, amount: 18000, description: 'AFF Level 3 course' },
    { userId: athleteList[5].id, type: TransactionType.DEBIT, amount: 18000, description: 'AFF Level 4 course' },

    // More refunds and adjustments
    { userId: athleteList[6].id, type: TransactionType.REFUND, amount: 5000, description: 'Equipment rental credit' },
    { userId: athleteList[7].id, type: TransactionType.CREDIT, amount: 10000, description: 'Birthday bonus credit' },
    { userId: athleteList[8].id, type: TransactionType.CREDIT, amount: 25000, description: 'Loyalty reward' },
  ];

  for (const t of transactionData) {
    const wallet = await prisma.wallet.findFirst({
      where: { userId: t.userId, dropzoneId: dz.id },
    });

    if (wallet) {
      await prisma.transaction.create({
        data: {
          uuid: randomUUID(),
          walletId: wallet.id,
          type: t.type,
          amount: t.amount,
          balanceAfter: wallet.balance + (t.type === TransactionType.CREDIT ? t.amount : -t.amount),
          description: t.description,
        },
      });
    }
  }

  // ============================================================================
  // GROUPS (6)
  // ============================================================================
  const group1 = await prisma.group.create({
    data: {
      dropzoneId: dz.id,
      name: 'Saturday RW Team',
      captainId: athleteList[0].id,
      groupType: GroupType.RW,
    },
  });
  for (const uid of [athleteList[1].id, athleteList[2].id, athleteList[3].id]) {
    await prisma.groupMember.create({
      data: { groupId: group1.id, userId: uid, role: GroupMemberRole.MEMBER, status: GroupMemberStatus.CONFIRMED },
    });
  }

  const group2 = await prisma.group.create({
    data: {
      dropzoneId: dz.id,
      name: 'Freefly Camp',
      captainId: athleteList[4].id,
      groupType: GroupType.FREEFLY,
    },
  });
  for (const uid of [athleteList[5].id, athleteList[6].id]) {
    await prisma.groupMember.create({
      data: { groupId: group2.id, userId: uid, role: GroupMemberRole.MEMBER, status: GroupMemberStatus.CONFIRMED },
    });
  }

  const group3 = await prisma.group.create({
    data: {
      dropzoneId: dz.id,
      name: 'Wingsuit First Flight',
      captainId: coach.id,
      groupType: GroupType.WINGSUIT,
    },
  });
  for (const uid of [athleteList[7].id, athleteList[8].id]) {
    await prisma.groupMember.create({
      data: { groupId: group3.id, userId: uid, role: GroupMemberRole.MEMBER, status: GroupMemberStatus.INVITED },
    });
  }

  const group4 = await prisma.group.create({
    data: {
      dropzoneId: dz.id,
      name: 'AFF Level 5 Group',
      captainId: affi.id,
      groupType: GroupType.AFF,
    },
  });
  for (const uid of [athleteList[9].id, athleteList[10].id]) {
    await prisma.groupMember.create({
      data: { groupId: group4.id, userId: uid, role: GroupMemberRole.MEMBER, status: GroupMemberStatus.CONFIRMED },
    });
  }

  const group5 = await prisma.group.create({
    data: {
      dropzoneId: dz.id,
      name: 'Angle Flying 101',
      captainId: athleteList[11].id,
      groupType: GroupType.ANGLE,
    },
  });
  for (const uid of [athleteList[12].id, athleteList[13].id]) {
    await prisma.groupMember.create({
      data: { groupId: group5.id, userId: uid, role: GroupMemberRole.MEMBER, status: GroupMemberStatus.CONFIRMED },
    });
  }

  const group6 = await prisma.group.create({
    data: {
      dropzoneId: dz.id,
      name: 'CRW Dogs',
      captainId: athleteList[14].id,
      groupType: GroupType.CRW,
    },
  });
  for (const uid of [athleteList[0].id, athleteList[1].id, athleteList[2].id]) {
    await prisma.groupMember.create({
      data: { groupId: group6.id, userId: uid, role: GroupMemberRole.MEMBER, status: GroupMemberStatus.CONFIRMED },
    });
  }

  // ============================================================================
  // WAIVERS (3 types + signatures)
  // ============================================================================
  const waiverExp = await prisma.waiver.create({
    data: {
      dropzoneId: dz.id,
      title: 'Standard Liability Waiver',
      waiverType: WaiverType.EXPERIENCED,
      content: 'The skydiver acknowledges the inherent risks of skydiving and assumes full responsibility for any injury or death...',
    },
  });

  const waiverTandem = await prisma.waiver.create({
    data: {
      dropzoneId: dz.id,
      title: 'Tandem Participant Waiver',
      waiverType: WaiverType.TANDEM,
      content: 'Tandem skydiving involves significant risk of death or serious injury...',
    },
  });

  const waiverAff = await prisma.waiver.create({
    data: {
      dropzoneId: dz.id,
      title: 'AFF Student Waiver',
      waiverType: WaiverType.AFF,
      content: 'AFF training involves progressive freefall instruction with inherent risks...',
    },
  });

  // Sign experienced jumpers
  for (const a of athleteList.slice(0, 20)) {
    await prisma.waiverSignature.create({
      data: { waiverId: waiverExp.id, userId: a.id, signedAt: new Date(now.getTime() - 30 * 24 * 3600_000) },
    });
  }

  // Sign tandem customers
  for (const a of athleteList.slice(15, 20)) {
    await prisma.waiverSignature.create({
      data: { waiverId: waiverTandem.id, userId: a.id, signedAt: new Date(now.getTime() - 1 * 24 * 3600_000) },
    });
  }

  // Sign AFF students
  for (const a of athleteList.slice(8, 14)) {
    await prisma.waiverSignature.create({
      data: { waiverId: waiverAff.id, userId: a.id, signedAt: new Date(now.getTime() - 7 * 24 * 3600_000) },
    });
  }

  // ============================================================================
  // GEAR ITEMS (20)
  // ============================================================================
  const gearManufacturers = [
    'United Parachute Technologies',
    'Sun Path',
    'Aerodyne Research',
    'Performance Designs',
  ];

  const gearModels = ['Vector V3', 'Javelin', 'Microraptor', 'Sabre2 225', 'PD9', 'Velocity 108'];

  // Rental rigs (6)
  for (let i = 0; i < 6; i++) {
    await prisma.gearItem.create({
      data: {
        dropzoneId: dz.id,
        serialNumber: `RIG-${String(i + 1).padStart(3, '0')}`,
        gearType: GearType.CONTAINER,
        manufacturer: gearManufacturers[i % 4],
        model: gearModels[i % 6],
        dom: new Date(2018 + Math.floor(Math.random() * 5), 0, 1),
        lastRepackAt: new Date(now.getTime() - Math.floor(Math.random() * 120) * 24 * 3600_000),
        nextRepackDue: new Date(now.getTime() + Math.floor(Math.random() * 120 - 60) * 24 * 3600_000),
        isRental: true,
        status: GearStatus.ACTIVE,
      },
    });
  }

  // Student rigs (4)
  for (let i = 6; i < 10; i++) {
    await prisma.gearItem.create({
      data: {
        dropzoneId: dz.id,
        serialNumber: `STU-${String(i - 5).padStart(3, '0')}`,
        gearType: GearType.CONTAINER,
        manufacturer: gearManufacturers[i % 4],
        model: gearModels[i % 6],
        dom: new Date(2019 + Math.floor(Math.random() * 5), 0, 1),
        lastRepackAt: new Date(now.getTime() - Math.floor(Math.random() * 90) * 24 * 3600_000),
        nextRepackDue: new Date(now.getTime() + Math.floor(Math.random() * 90 - 45) * 24 * 3600_000),
        isRental: false,
        status: GearStatus.ACTIVE,
      },
    });
  }

  // Tandem rigs (5)
  for (let i = 10; i < 15; i++) {
    await prisma.gearItem.create({
      data: {
        dropzoneId: dz.id,
        serialNumber: `TAN-${String(i - 9).padStart(3, '0')}`,
        gearType: GearType.CONTAINER,
        manufacturer: gearManufacturers[i % 4],
        model: gearModels[i % 6],
        dom: new Date(2017 + Math.floor(Math.random() * 6), 0, 1),
        lastRepackAt: new Date(now.getTime() - Math.floor(Math.random() * 150) * 24 * 3600_000),
        nextRepackDue: new Date(now.getTime() + Math.floor(Math.random() * 100 - 50) * 24 * 3600_000),
        isRental: true,
        status: GearStatus.ACTIVE,
      },
    });
  }

  // Personal owned rigs (3)
  for (let i = 15; i < 18; i++) {
    await prisma.gearItem.create({
      data: {
        dropzoneId: dz.id,
        serialNumber: `OWN-${String(i - 14).padStart(3, '0')}`,
        gearType: GearType.CONTAINER,
        manufacturer: gearManufacturers[i % 4],
        model: gearModels[i % 6],
        dom: new Date(2020 + Math.floor(Math.random() * 5), 0, 1),
        lastRepackAt: new Date(now.getTime() - Math.floor(Math.random() * 60) * 24 * 3600_000),
        nextRepackDue: new Date(now.getTime() + Math.floor(Math.random() * 60) * 24 * 3600_000),
        isRental: false,
        status: Math.random() > 0.9 ? GearStatus.IN_REPAIR : GearStatus.ACTIVE,
      },
    });
  }

  // Helmets (2)
  for (let i = 18; i < 20; i++) {
    await prisma.gearItem.create({
      data: {
        dropzoneId: dz.id,
        serialNumber: `HLM-${String(i - 17).padStart(3, '0')}`,
        gearType: GearType.HELMET,
        manufacturer: 'Cookie Composites',
        model: 'G3',
        dom: new Date(2021, 0, 1),
        isRental: true,
        status: GearStatus.ACTIVE,
      },
    });
  }

  // ============================================================================
  // GEAR CHECKS (15 today)
  // ============================================================================
  const allGearItems = await prisma.gearItem.findMany({
    where: { dropzoneId: dz.id },
    select: { id: true },
  });

  for (let i = 0; i < 15; i++) {
    const results = [GearCheckResult.PASS, GearCheckResult.PASS, GearCheckResult.PASS, GearCheckResult.CONDITIONAL, GearCheckResult.FAIL];
    const result = results[Math.floor(Math.random() * results.length)];
    const gearItem = allGearItems[Math.floor(Math.random() * allGearItems.length)];

    await prisma.gearCheck.create({
      data: {
        gearItemId: gearItem.id,
        userId: riggerUser.id,
        checkedById: riggerUser.id,
        result,
        notes: result === GearCheckResult.FAIL ? 'Worn closing loop needs replacement' : result === GearCheckResult.CONDITIONAL ? 'Minor wear noted, acceptable for this jump' : null,
        checkedAt: new Date(now.getTime() - Math.floor(Math.random() * 480) * 60_000),
      },
    });
  }

  // ============================================================================
  // INCIDENTS (5)
  // ============================================================================
  await prisma.incident.create({
    data: {
      uuid: randomUUID(),
      dropzoneId: dz.id,
      reportedById: safetyUser.id,
      severity: IncidentSeverity.MINOR,
      status: IncidentStatus.RESOLVED,
      title: 'Off-landing in farmer field',
      description: 'Athlete landed off DZ in adjacent field, no injuries. Wind shifted post-exit. Recovered equipment and athlete safely.',
    },
  });

  await prisma.incident.create({
    data: {
      uuid: randomUUID(),
      dropzoneId: dz.id,
      reportedById: tandem1.id,
      severity: IncidentSeverity.SERIOUS,
      status: IncidentStatus.INVESTIGATING,
      title: 'AAD fire during hop-n-pop',
      description: 'Automatic Activation Device deployed during hop-and-pop maneuver. Likely altitude entry. Investigation in progress.',
    },
  });

  await prisma.incident.create({
    data: {
      uuid: randomUUID(),
      dropzoneId: dz.id,
      reportedById: safetyUser.id,
      severity: IncidentSeverity.MODERATE,
      status: IncidentStatus.REPORTED,
      title: 'Near-miss canopy collision',
      description: 'Two jumpers narrowly avoided collision under canopy at 2000 feet. Both landed safely. No injuries.',
    },
  });

  await prisma.incident.create({
    data: {
      uuid: randomUUID(),
      dropzoneId: dz.id,
      reportedById: safetyUser.id,
      severity: IncidentSeverity.MINOR,
      status: IncidentStatus.RESOLVED,
      title: 'Hard landing - no injury',
      description: 'AFF student executed hard landing due to wind gust. Student reports no pain or injury. Cleared to continue training.',
    },
  });

  await prisma.incident.create({
    data: {
      uuid: randomUUID(),
      dropzoneId: dz.id,
      reportedById: safetyUser.id,
      severity: IncidentSeverity.SERIOUS,
      status: IncidentStatus.INVESTIGATING,
      title: 'Premature container opening during freefall',
      description: 'Jumper experienced premature main container opening at approximately 7000 feet during freefall. Deployed reserve safely. FAA notification initiated.',
    },
  });

  // ============================================================================
  // NOTIFICATIONS (20)
  // ============================================================================
  const notificationData = [
    { userId: athleteList[0].id, type: NotificationType.LOAD_READY, title: 'Load ready', body: 'Load L-007 is ready, board in 5 minutes' },
    { userId: athleteList[1].id, type: NotificationType.SLOT_ASSIGNMENT, title: 'Slot assigned', body: 'You have been assigned to Load L-008' },
    { userId: athleteList[2].id, type: NotificationType.WAIVER_REQUIRED, title: 'Waiver expiring', body: 'Your waiver expires in 14 days' },
    { userId: manifestUser.id, type: NotificationType.LOAD_BOARDING, title: 'Load boarding', body: 'Load L-007 is now boarding' },
    { userId: tandem1.id, type: NotificationType.INSTRUCTOR_ASSIGNMENT, title: 'Tandem assigned', body: 'You have 2 tandems on Load L-008' },
    { userId: tandem2.id, type: NotificationType.LOAD_DEPARTURE, title: 'Load departed', body: 'Load L-006 has departed with 15 jumpers' },
    { userId: affi.id, type: NotificationType.SLOT_CONFIRMATION, title: 'AFF slot confirmed', body: 'Level 3 progression jump on L-009' },
    { userId: athleteList[3].id, type: NotificationType.PAYMENT_RECEIVED, title: 'Payment received', body: 'Tandem jump payment of $299.99 confirmed' },
    { userId: athleteList[4].id, type: NotificationType.BOOKING_CONFIRMATION, title: 'Booking confirmed', body: 'Your tandem jump on L-006 is confirmed' },
    { userId: coach.id, type: NotificationType.WEATHER_WARNING, title: 'Weather alert', body: 'Wind gusts expected after 14:00. All loads must be down by then.' },
    { userId: safetyUser.id, type: NotificationType.INCIDENT_REPORTED, title: 'Incident reported', body: 'New incident: Off-landing in farmer field' },
    { userId: athleteList[5].id, type: NotificationType.GEAR_CHECK_FAILED, title: 'Gear check failed', body: 'Your rig failed inspection. Please see rigger.' },
    { userId: athleteList[6].id, type: NotificationType.PROFILE_UPDATE, title: 'Update required', body: 'Please update your emergency contact information' },
    { userId: manifestUser.id, type: NotificationType.LOAD_READY, body: 'Load L-009 needs one more jumper for CG', title: 'Load needs manifest' },
    { userId: athleteList[7].id, type: NotificationType.BOOKING_CANCELLED, title: 'Booking cancelled', body: 'Your tandem jump on L-005 was cancelled due to weather' },
    { userId: athleteList[8].id, type: NotificationType.PAYMENT_FAILED, title: 'Payment failed', body: 'Your payment for the 10-pack could not be processed' },
    { userId: riggerUser.id, type: NotificationType.GEAR_CHECK_FAILED, title: 'Gear flagged', body: '3 rigs need inspection before next load' },
    { userId: pilotUser1.id, type: NotificationType.LOAD_READY, title: 'New load assigned', body: 'You have been assigned to pilot Load L-010' },
    { userId: athleteList[9].id, type: NotificationType.SLOT_ASSIGNMENT, title: 'Manifested', body: 'You are manifested on L-009' },
    { userId: athleteList[10].id, type: NotificationType.WAIVER_REQUIRED, title: 'Waiver required', body: 'You must sign the AFF waiver before your next jump' },
  ];

  for (const n of notificationData) {
    await prisma.notification.create({
      data: {
        ...n,
        dropzoneId: dz.id,
        channel: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP][Math.floor(Math.random() * 3)],
        status: Math.random() > 0.5 ? NotificationStatus.READ : NotificationStatus.DELIVERED,
        readAt: Math.random() > 0.5 ? new Date(now.getTime() - Math.floor(Math.random() * 240) * 60_000) : null,
      },
    });
  }

  // ============================================================================
  // QR TOKENS (for 15 athletes)
  // ============================================================================
  for (const a of athleteList.slice(0, 15)) {
    await prisma.qrToken.create({
      data: {
        userId: a.id,
        dropzoneId: dz.id,
        tokenType: QrTokenType.PERMANENT,
        payload: { userId: a.id, type: 'checkin', token: randomUUID() },
        hmacSignature: randomUUID().replace(/-/g, ''),
        expiresAt: new Date(now.getTime() + 365 * 24 * 3600_000),
      },
    });
  }

  // ============================================================================
  // AUDIT LOGS (10 recent)
  // ============================================================================
  const auditActions = [
    { userId: adminUser.id, action: AuditAction.LOAD_CREATE, entityType: 'Load', entityId: loads[0].id },
    { userId: manifestUser.id, action: AuditAction.SLOT_ASSIGN, entityType: 'Slot', entityId: 1 },
    { userId: safetyUser.id, action: AuditAction.INCIDENT_REPORT, entityType: 'Incident', entityId: 1 },
    { userId: riggerUser.id, action: AuditAction.GEAR_CHECK, entityType: 'GearCheck', entityId: 1 },
    { userId: tandem1.id, action: AuditAction.LOAD_DEPART, entityType: 'Load', entityId: loads[5].id },
    { userId: athleteList[0].id, action: AuditAction.WAIVER_SIGN, entityType: 'Waiver', entityId: waiverExp.id },
    { userId: manifestUser.id, action: AuditAction.LOAD_CREATE, entityType: 'Load', entityId: loads[6].id },
    { userId: safetyUser.id, action: AuditAction.EMERGENCY_ACTIVATE, entityType: 'Emergency', entityId: 1 },
    { userId: athleteList[1].id, action: AuditAction.PAYMENT, entityType: 'Transaction', entityId: 1 },
    { userId: adminUser.id, action: AuditAction.ROLE_GRANT, entityType: 'UserRole', entityId: manifestUser.id },
  ];

  let prevChecksum: string | null = null;
  for (const a of auditActions) {
    const payload = JSON.stringify({ userId: a.userId, action: a.action, entityType: a.entityType, entityId: a.entityId, prevChecksum });
    const { createHash } = await import('crypto');
    const checksum = createHash('sha256').update(payload).digest('hex');
    await prisma.auditLog.create({
      data: {
        userId: a.userId,
        dropzoneId: dz.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        checksum,
        prevChecksum,
        createdAt: new Date(now.getTime() - Math.floor(Math.random() * 480) * 60_000),
      },
    });
    prevChecksum = checksum;
  }

  // ============================================================================
  // PHASE 3-6 NEW MODELS — Athlete, License, InstructorSkill, AFF, Booking, Pricing
  // ============================================================================

  // INSTRUCTOR SKILL TYPES (global reference data)
  const skillTypes = [
    { code: 'TANDEM', name: 'Tandem Instructor', description: 'Certified to conduct tandem jumps', renewalMonths: 24 },
    { code: 'AFF', name: 'AFF Instructor', description: 'Accelerated Freefall instructor', renewalMonths: 24 },
    { code: 'COACH', name: 'Coach', description: 'Licensed skydiving coach', renewalMonths: 12 },
    { code: 'CAMERA', name: 'Camera Flyer', description: 'Camera/video specialist', renewalMonths: 12 },
    { code: 'FREEFLY', name: 'Freefly Coach', description: 'Freefly discipline coach', renewalMonths: 12 },
    { code: 'WINGSUIT', name: 'Wingsuit Coach', description: 'Wingsuit discipline coach', renewalMonths: 12 },
  ] as const;

  const skillTypeIds: Record<string, number> = {};
  for (const st of skillTypes) {
    const created = await prisma.instructorSkillType.create({ data: st as any });
    skillTypeIds[st.code] = created.id;
  }

  // ATHLETE PROFILES (for licensed jumpers — link existing users)
  const licensedAthletes = athleteData.filter(a => !['TANDEM', 'EXPIRED', 'SUSPENDED'].includes(a.license));
  for (const a of licensedAthletes) {
    const user = athletes[a.email];
    if (!user) continue;
    const level = a.license.startsWith('STUDENT') ? 'STUDENT' : (a.license as any);
    try {
      await prisma.athlete.create({
        data: {
          userId: user.id,
          homeDropzoneId: dz.id,
          uspaMemberId: `USPA-${100000 + user.id}`,
          licenseLevel: (['A', 'B', 'C', 'D', 'STUDENT', 'NONE'].includes(level) ? level : 'STUDENT') as any,
          totalJumps: a.jumps,
          lastJumpDate: new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000),
          disciplines: JSON.stringify(a.jumps > 500 ? ['freefly', 'rw'] : ['belly']),
        },
      });
    } catch { /* skip duplicates */ }
  }

  // LICENSES (for D/C license holders)
  for (const a of athleteData.filter(ad => ['C', 'D'].includes(ad.license))) {
    const user = athletes[a.email];
    if (!user) continue;
    await prisma.license.create({
      data: {
        userId: user.id,
        type: 'USPA',
        number: `USPA-${200000 + user.id}`,
        level: a.license as any,
        issuedAt: new Date(now.getTime() - 365 * 86400000),
        expiresAt: new Date(now.getTime() + 365 * 86400000),
      },
    });
  }

  // INSTRUCTOR SKILLS — Staff members
  const staffMap = await prisma.user.findMany({
    where: { email: { in: ['tandem1@skylara.dev', 'tandem2@skylara.dev', 'aff1@skylara.dev', 'coach1@skylara.dev'] } },
  });
  for (const staff of staffMap) {
    if (staff.email.startsWith('tandem')) {
      await prisma.instructorSkill.create({
        data: { userId: staff.id, skillTypeId: skillTypeIds.TANDEM, certifiedAt: new Date(now.getTime() - 180 * 86400000), rating: 5 },
      });
      await prisma.instructorSkill.create({
        data: { userId: staff.id, skillTypeId: skillTypeIds.CAMERA, certifiedAt: new Date(now.getTime() - 90 * 86400000), rating: 4 },
      });
    }
    if (staff.email === 'aff1@skylara.dev') {
      await prisma.instructorSkill.create({
        data: { userId: staff.id, skillTypeId: skillTypeIds.AFF, certifiedAt: new Date(now.getTime() - 365 * 86400000), rating: 5 },
      });
    }
    if (staff.email === 'coach1@skylara.dev') {
      await prisma.instructorSkill.create({
        data: { userId: staff.id, skillTypeId: skillTypeIds.COACH, certifiedAt: new Date(now.getTime() - 120 * 86400000), rating: 4 },
      });
      await prisma.instructorSkill.create({
        data: { userId: staff.id, skillTypeId: skillTypeIds.FREEFLY, certifiedAt: new Date(now.getTime() - 60 * 86400000), rating: 3 },
      });
    }

    // Instructor availability (weekends)
    for (const day of [0, 6]) { // Sat, Sun
      await prisma.instructorAvailability.create({
        data: { userId: staff.id, dropzoneId: dz.id, dayOfWeek: day, startTime: '07:00', endTime: '18:00', isRecurring: true },
      });
    }
  }

  // AFF RECORDS (student progression)
  const affInstructor = staffMap.find(s => s.email === 'aff1@skylara.dev');
  if (affInstructor) {
    const affStudents = athleteData.filter(a => a.license.startsWith('STUDENT'));
    for (const student of affStudents) {
      const user = athletes[student.email];
      if (!user) continue;
      const maxLevel = parseInt(student.license.replace('STUDENT_', '')) || 1;
      for (let level = 1; level <= maxLevel; level++) {
        await prisma.affRecord.create({
          data: {
            studentId: user.id,
            instructorId: affInstructor.id,
            dropzoneId: dz.id,
            level,
            passed: true,
            evaluationNotes: `Level ${level} passed — solid performance`,
          },
        });
      }
    }
  }

  // BOOKING PACKAGES
  const packages = [
    { name: 'Tandem Skydive', activityType: 'TANDEM', priceCents: 29900, description: 'First-time tandem jump from 10,000 ft' },
    { name: 'Tandem + Video', activityType: 'TANDEM_VIDEO', priceCents: 34900, description: 'Tandem jump with HD video package' },
    { name: 'AFF Level 1', activityType: 'AFF', priceCents: 27500, description: 'Accelerated Freefall first jump course' },
    { name: 'Fun Jump (ticket)', activityType: 'FUN', priceCents: 2800, description: 'Single fun jump ticket' },
    { name: '10-Jump Pack', activityType: 'FUN_PACK', priceCents: 25000, description: '10 fun jump tickets (save $30)' },
  ];
  for (const pkg of packages) {
    await prisma.bookingPackage.create({ data: { dropzoneId: dz.id, ...pkg, currency: 'USD', includes: [], isActive: true } });
  }

  // DZ PRICING
  const pricing = [
    { activityType: 'TANDEM', basePriceCents: 29900 },
    { activityType: 'AFF', basePriceCents: 27500 },
    { activityType: 'FUN_JUMP', basePriceCents: 2800 },
    { activityType: 'COACHING', basePriceCents: 5000 },
    { activityType: 'WINGSUIT', basePriceCents: 3500 },
  ];
  for (const p of pricing) {
    await prisma.dzPricing.create({ data: { dropzoneId: dz.id, ...p, currency: 'USD' } });
  }

  // BOOKINGS (upcoming and past)
  const tandemPkg = await prisma.bookingPackage.findFirst({ where: { dropzoneId: dz.id, activityType: 'TANDEM' } });
  const tandemUsers = athleteData.filter(a => a.license === 'TANDEM');
  for (let i = 0; i < Math.min(3, tandemUsers.length); i++) {
    const user = athletes[tandemUsers[i].email];
    if (!user || !tandemPkg) continue;
    await prisma.booking.create({
      data: {
        uuid: randomUUID(),
        dropzoneId: dz.id,
        userId: user.id,
        packageId: tandemPkg.id,
        bookingType: 'TANDEM',
        scheduledDate: now,
        scheduledTime: `${9 + i}:00`,
        status: i === 0 ? 'CONFIRMED' : 'PENDING',
      },
    });
  }

  // LOGBOOK ENTRIES (for experienced jumpers — last 5 jumps each)
  const expJumpers = athleteData.filter(a => ['C', 'D'].includes(a.license)).slice(0, 8);
  let jumpNum = 1;
  for (const j of expJumpers) {
    const user = athletes[j.email];
    if (!user) continue;
    for (let i = 0; i < 5; i++) {
      await prisma.logbookEntry.create({
        data: {
          userId: user.id,
          dropzoneId: dz.id,
          jumpNumber: j.jumps - 4 + i,
          altitude: 13000,
          freefallTime: 60,
          jumpType: i % 2 === 0 ? 'FUN_JUMP' : 'COACH',
          disciplines: [],
          createdAt: new Date(now.getTime() - (5 - i) * 7 * 86400000),
        },
      });
    }
  }

  // ============================================================================
  // MEDICAL DECLARATIONS (5-6 records for various athletes/staff)
  // ============================================================================
  await prisma.medicalDeclaration.createMany({
    data: [
      {
        userId: adminUser.id,
        dropzoneId: dz.id,
        hasConditions: false,
        medications: null,
        lastPhysical: new Date(now.getTime() - 180 * 86400000),
        clearedToJump: true,
        doctorName: 'Dr. Sarah Mitchell',
        doctorPhone: '+1-555-0101',
        signedAt: new Date(now.getTime() - 10 * 86400000),
        expiresAt: new Date(now.getTime() + 350 * 86400000),
      },
      {
        userId: safetyUser.id,
        dropzoneId: dz.id,
        hasConditions: false,
        medications: null,
        lastPhysical: new Date(now.getTime() - 120 * 86400000),
        clearedToJump: true,
        doctorName: 'Dr. James Wong',
        doctorPhone: '+1-555-0102',
        signedAt: new Date(now.getTime() - 5 * 86400000),
        expiresAt: new Date(now.getTime() + 355 * 86400000),
      },
      {
        userId: athleteList[0].id,
        dropzoneId: dz.id,
        hasConditions: true,
        conditions: 'Mild asthma (controlled with inhaler)',
        medications: 'Albuterol inhaler as needed',
        lastPhysical: new Date(now.getTime() - 60 * 86400000),
        clearedToJump: true,
        doctorName: 'Dr. Emily Chen',
        doctorPhone: '+1-555-0103',
        notes: 'Approved for jumping with rescue inhaler on person',
        signedAt: new Date(now.getTime() - 3 * 86400000),
        expiresAt: new Date(now.getTime() + 357 * 86400000),
      },
      {
        userId: athleteList[5].id,
        dropzoneId: dz.id,
        hasConditions: false,
        medications: 'Vitamin D supplement daily',
        lastPhysical: new Date(now.getTime() - 90 * 86400000),
        clearedToJump: true,
        doctorName: 'Dr. Robert Patel',
        doctorPhone: '+1-555-0104',
        signedAt: new Date(now.getTime() - 8 * 86400000),
        expiresAt: new Date(now.getTime() + 352 * 86400000),
      },
      {
        userId: tandem1.id,
        dropzoneId: dz.id,
        hasConditions: false,
        medications: null,
        lastPhysical: new Date(now.getTime() - 150 * 86400000),
        clearedToJump: true,
        doctorName: 'Dr. Lisa Anderson',
        doctorPhone: '+1-555-0105',
        signedAt: new Date(now.getTime() - 15 * 86400000),
        expiresAt: new Date(now.getTime() + 345 * 86400000),
      },
      {
        userId: athleteList[12].id,
        dropzoneId: dz.id,
        hasConditions: false,
        medications: null,
        lastPhysical: new Date(now.getTime() - 45 * 86400000),
        clearedToJump: true,
        doctorName: 'Dr. Michael Torres',
        doctorPhone: '+1-555-0106',
        signedAt: now,
        expiresAt: new Date(now.getTime() + 365 * 86400000),
      },
    ],
  });

  // ============================================================================
  // DOCUMENTS (8-10 records for various document types)
  // ============================================================================
  await prisma.document.createMany({
    data: [
      {
        userId: athleteList[0].id,
        dropzoneId: dz.id,
        documentType: 'ID',
        title: 'Passport - USA',
        fileUrl: 's3://skylara-docs/athlete1-passport.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        issuedAt: new Date(2019, 5, 15),
        expiresAt: new Date(2029, 5, 14),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 90 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: athleteList[2].id,
        dropzoneId: dz.id,
        documentType: 'INSURANCE',
        title: 'Skydiving Insurance - Annual Policy',
        fileUrl: 's3://skylara-docs/athlete2-insurance.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        issuedAt: new Date(now.getFullYear(), 0, 1),
        expiresAt: new Date(now.getFullYear() + 1, 0, 1),
        verifiedBy: adminUser.id,
        verifiedAt: now,
        status: 'VERIFIED',
      },
      {
        userId: affi.id,
        dropzoneId: dz.id,
        documentType: 'CERT',
        title: 'USPA AFF Instructor Certification',
        fileUrl: 's3://skylara-docs/aff1-cert.pdf',
        fileSize: 768000,
        mimeType: 'application/pdf',
        issuedAt: new Date(2015, 3, 20),
        expiresAt: new Date(now.getTime() + 730 * 86400000),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 60 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: riggerUser.id,
        dropzoneId: dz.id,
        documentType: 'RIG_CARD',
        title: 'Parachute Rigger Certificate - Master',
        fileUrl: 's3://skylara-docs/rigger1-rigcard.pdf',
        fileSize: 896000,
        mimeType: 'application/pdf',
        issuedAt: new Date(2012, 7, 10),
        expiresAt: new Date(now.getTime() + 1825 * 86400000),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 30 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: athleteList[8].id,
        dropzoneId: dz.id,
        documentType: 'MEDICAL',
        title: 'Medical Exam Report 2026',
        fileUrl: 's3://skylara-docs/athlete8-medical.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        issuedAt: new Date(now.getTime() - 30 * 86400000),
        expiresAt: new Date(now.getTime() + 330 * 86400000),
        verifiedBy: safetyUser.id,
        verifiedAt: new Date(now.getTime() - 20 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: athleteList[15].id,
        dropzoneId: dz.id,
        documentType: 'ID',
        title: 'Driver License - Canada',
        fileUrl: 's3://skylara-docs/athlete15-drivers-license.pdf',
        fileSize: 640000,
        mimeType: 'application/pdf',
        issuedAt: new Date(2020, 2, 5),
        expiresAt: new Date(2026, 2, 4),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 45 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: athleteList[20].id,
        dropzoneId: dz.id,
        documentType: 'INSURANCE',
        title: 'Tandem Jump Waiver & Insurance',
        fileUrl: 's3://skylara-docs/athlete20-tandem-insurance.pdf',
        fileSize: 384000,
        mimeType: 'application/pdf',
        issuedAt: new Date(now.getTime() - 5 * 86400000),
        expiresAt: null,
        verifiedBy: manifestUser.id,
        verifiedAt: new Date(now.getTime() - 4 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: coach.id,
        dropzoneId: dz.id,
        documentType: 'CERT',
        title: 'USPA Coach Certification',
        fileUrl: 's3://skylara-docs/coach1-cert.pdf',
        fileSize: 720000,
        mimeType: 'application/pdf',
        issuedAt: new Date(2018, 5, 12),
        expiresAt: new Date(now.getTime() + 540 * 86400000),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 120 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: tandem2.id,
        dropzoneId: dz.id,
        documentType: 'CERT',
        title: 'USPA Tandem Instructor Certification',
        fileUrl: 's3://skylara-docs/tandem2-cert.pdf',
        fileSize: 832000,
        mimeType: 'application/pdf',
        issuedAt: new Date(2016, 8, 25),
        expiresAt: new Date(now.getTime() + 650 * 86400000),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 90 * 86400000),
        status: 'VERIFIED',
      },
      {
        userId: athleteList[25].id,
        dropzoneId: dz.id,
        documentType: 'OTHER',
        title: 'Background Check - Cleared',
        fileUrl: 's3://skylara-docs/athlete25-bgcheck.pdf',
        fileSize: 256000,
        mimeType: 'application/pdf',
        issuedAt: new Date(now.getTime() - 180 * 86400000),
        expiresAt: null,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(now.getTime() - 179 * 86400000),
        status: 'VERIFIED',
      },
    ],
  });

  // ============================================================================
  // TASKS (8-10 operational tasks)
  // ============================================================================
  await prisma.task.createMany({
    data: [
      {
        dropzoneId: dz.id,
        assignedToId: safetyUser.id,
        createdById: adminUser.id,
        title: 'Review incident AAD-2026-003',
        description: 'Complete investigation into premature AAD deployment incident reported on Load L-004. Interview witnesses, inspect equipment.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        category: 'SAFETY',
        dueDate: new Date(now.getTime() + 3 * 86400000),
      },
      {
        dropzoneId: dz.id,
        assignedToId: riggerUser.id,
        createdById: adminUser.id,
        title: 'Replace ripcord housings on RIG-005',
        description: 'Complete repack cycle and replace worn ripcord housings. Test emergency procedure after maintenance.',
        priority: 'URGENT',
        status: 'OPEN',
        category: 'MAINTENANCE',
        dueDate: now,
      },
      {
        dropzoneId: dz.id,
        assignedToId: manifestUser.id,
        createdById: adminUser.id,
        title: 'Update load manifest for afternoon loads',
        description: 'Manifest 15 athletes for afternoon loads L-009 through L-011. Verify center of gravity and dispatch.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        category: 'OPERATIONS',
        dueDate: new Date(now.getTime() + 6 * 3600000),
      },
      {
        dropzoneId: dz.id,
        assignedToId: tandem1.id,
        createdById: adminUser.id,
        title: 'Training: Tandem emergency procedures',
        description: 'Conduct quarterly emergency procedure training with all tandem staff. Cover reserve deployment, emergency exits, and ground procedures.',
        priority: 'MEDIUM',
        status: 'OPEN',
        category: 'TRAINING',
        dueDate: new Date(now.getTime() + 10 * 86400000),
      },
      {
        dropzoneId: dz.id,
        assignedToId: pilotUser1.id,
        createdById: adminUser.id,
        title: 'Aircraft G-1000 system check',
        description: 'Perform full avionics check on G-1000 glass cockpit system. Verify all instruments and autopilot functionality.',
        priority: 'HIGH',
        status: 'DONE',
        category: 'MAINTENANCE',
        dueDate: new Date(now.getTime() - 1 * 86400000),
        completedAt: new Date(now.getTime() - 0.5 * 86400000),
      },
      {
        dropzoneId: dz.id,
        assignedToId: adminUser.id,
        createdById: adminUser.id,
        title: 'Monthly safety report compilation',
        description: 'Compile all incidents, near-misses, and safety metrics for April. Generate report for FAA and internal distribution.',
        priority: 'MEDIUM',
        status: 'OPEN',
        category: 'ADMIN',
        dueDate: new Date(now.getTime() + 15 * 86400000),
      },
      {
        dropzoneId: dz.id,
        assignedToId: affi.id,
        createdById: adminUser.id,
        title: 'AFF Level 2 progression assessment',
        description: 'Evaluate 3 AFF students for Level 2 progression. Document skills assessment and approve advancement.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        category: 'TRAINING',
        dueDate: new Date(now.getTime() + 5 * 86400000),
      },
      {
        dropzoneId: dz.id,
        assignedToId: coach.id,
        createdById: adminUser.id,
        title: 'Schedule coaching sessions for May',
        description: 'Coordinate coaching availability and schedule sessions with 8 advanced athletes for May. Update master schedule.',
        priority: 'LOW',
        status: 'OPEN',
        category: 'TRAINING',
        dueDate: new Date(now.getTime() + 20 * 86400000),
      },
    ],
  });

  // ============================================================================
  // DZ SETTINGS (1 record for the main dropzone)
  // ============================================================================
  await prisma.dzSettings.create({
    data: {
      dropzoneId: dz.id,
      timezone: 'America/Denver',
      language: 'en-US',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      weightUnit: 'lbs',
      altitudeUnit: 'ft',
      maxAltitude: 15000,
      minBreakTime: 30,
      maxLoadsPerDay: 12,
      operatingHoursStart: '07:00',
      operatingHoursEnd: '18:00',
      maxWindSpeed: 20,
      minVisibility: 5,
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
    },
  });

  // ============================================================================
  // ONBOARDING TEMPLATES (12 templates matching all categories)
  // ============================================================================
  console.log('');
  console.log('🎯 Seeding Onboarding & Notification Center data...');

  const templateDefs = [
    { category: OnboardingCategory.VISITING_JUMPER, name: 'Visiting Licensed Jumper', flowKey: 'visiting-jumper', slug: 'visiting-jumper', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'license-upload', 'waiver-sign', 'emergency-contact', 'local-rules', 'review-submit'] },
    { category: OnboardingCategory.STUDENT, name: 'AFF Student Registration', flowKey: 'aff-student', slug: 'aff-student', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'medical-declaration', 'waiver-sign', 'emergency-contact', 'course-selection', 'payment-info', 'review-submit'] },
    { category: OnboardingCategory.TANDEM, name: 'Tandem Experience', flowKey: 'tandem-customer', slug: 'tandem-customer', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'waiver-sign', 'emergency-contact', 'media-package', 'review-submit'] },
    { category: OnboardingCategory.COACH, name: 'Coach Application', flowKey: 'coach-application', slug: 'coach-pathway', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'license-upload', 'rating-upload', 'experience-details', 'references', 'waiver-sign', 'review-submit'] },
    { category: OnboardingCategory.INSTRUCTOR, name: 'Instructor Application', flowKey: 'instructor-application', slug: 'instructor-pathway', access: OnboardingAccessMode.INVITE_ONLY, steps: ['personal-info', 'license-upload', 'rating-upload', 'medical-cert', 'experience-log', 'waiver-sign', 'review-submit'] },
    { category: OnboardingCategory.STAFF, name: 'Staff Onboarding', flowKey: 'staff-onboarding', slug: null, access: OnboardingAccessMode.INTERNAL_ONLY, steps: ['personal-info', 'emergency-contact', 'background-check', 'training-ack', 'policy-sign', 'review-submit'] },
    { category: OnboardingCategory.DZ_MANAGER, name: 'DZ Manager Setup', flowKey: 'dz-manager-setup', slug: null, access: OnboardingAccessMode.TOKEN, steps: ['personal-info', 'dz-info', 'insurance-docs', 'safety-plan', 'pricing-setup', 'review-submit'] },
    { category: OnboardingCategory.ATHLETE, name: 'Fun Jumper Registration', flowKey: 'fun-jumper', slug: 'fun-jumper', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'license-upload', 'gear-info', 'waiver-sign', 'emergency-contact', 'review-submit'] },
    { category: OnboardingCategory.EVENT_REGISTRATION, name: 'Boogie Registration', flowKey: 'boogie-registration', slug: 'boogie-register', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'license-upload', 'event-selection', 'waiver-sign', 'payment-info', 'review-submit'] },
    { category: OnboardingCategory.VISITING_JUMPER, name: 'International Jumper', flowKey: 'international-jumper', slug: 'international-jumper', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'passport-upload', 'license-upload', 'insurance-proof', 'waiver-sign', 'review-submit'] },
    { category: OnboardingCategory.STUDENT, name: 'Tunnel-to-Sky Program', flowKey: 'tunnel-to-sky', slug: 'tunnel-to-sky', access: OnboardingAccessMode.INVITE_ONLY, steps: ['personal-info', 'tunnel-cert-upload', 'medical-declaration', 'waiver-sign', 'review-submit'] },
    { category: OnboardingCategory.ATHLETE, name: 'Returning Jumper Reactivation', flowKey: 'returning-jumper', slug: 'returning-jumper', access: OnboardingAccessMode.PUBLIC, steps: ['personal-info', 'license-upload', 'currency-check', 'waiver-sign', 'review-submit'] },
  ];

  const stepTypeMap: Record<string, OnboardingStepType> = {
    'personal-info': OnboardingStepType.FORM, 'license-upload': OnboardingStepType.LICENSE_UPLOAD,
    'waiver-sign': OnboardingStepType.WAIVER_SIGN, 'emergency-contact': OnboardingStepType.EMERGENCY_CONTACT,
    'local-rules': OnboardingStepType.FORM, 'review-submit': OnboardingStepType.REVIEW_SUBMIT,
    'medical-declaration': OnboardingStepType.MEDICAL_DECLARATION, 'course-selection': OnboardingStepType.FORM,
    'payment-info': OnboardingStepType.FORM, 'media-package': OnboardingStepType.FORM,
    'rating-upload': OnboardingStepType.RATING_UPLOAD, 'experience-details': OnboardingStepType.FORM,
    'references': OnboardingStepType.FORM, 'medical-cert': OnboardingStepType.DOCUMENT_UPLOAD,
    'experience-log': OnboardingStepType.FORM, 'background-check': OnboardingStepType.DOCUMENT_UPLOAD,
    'training-ack': OnboardingStepType.FORM, 'policy-sign': OnboardingStepType.WAIVER_SIGN,
    'dz-info': OnboardingStepType.FORM, 'insurance-docs': OnboardingStepType.DOCUMENT_UPLOAD,
    'safety-plan': OnboardingStepType.DOCUMENT_UPLOAD, 'pricing-setup': OnboardingStepType.FORM,
    'gear-info': OnboardingStepType.GEAR_INFO, 'event-selection': OnboardingStepType.FORM,
    'passport-upload': OnboardingStepType.DOCUMENT_UPLOAD, 'insurance-proof': OnboardingStepType.DOCUMENT_UPLOAD,
    'tunnel-cert-upload': OnboardingStepType.DOCUMENT_UPLOAD, 'currency-check': OnboardingStepType.FORM,
  };

  const stepLabels: Record<string, string> = {
    'personal-info': 'Personal Information', 'license-upload': 'License Upload',
    'waiver-sign': 'Waiver Signing', 'emergency-contact': 'Emergency Contact',
    'local-rules': 'Local Rules Acknowledgement', 'review-submit': 'Review & Submit',
    'medical-declaration': 'Medical Declaration', 'course-selection': 'Course Selection',
    'payment-info': 'Payment Information', 'media-package': 'Media Package Selection',
    'rating-upload': 'Rating Upload', 'experience-details': 'Experience Details',
    'references': 'Professional References', 'medical-cert': 'Medical Certificate',
    'experience-log': 'Experience Log', 'background-check': 'Background Check',
    'training-ack': 'Training Acknowledgement', 'policy-sign': 'Policy Agreement',
    'dz-info': 'Drop Zone Information', 'insurance-docs': 'Insurance Documents',
    'safety-plan': 'Safety Plan', 'pricing-setup': 'Pricing Setup',
    'gear-info': 'Gear Information', 'event-selection': 'Event Selection',
    'passport-upload': 'Passport Upload', 'insurance-proof': 'Insurance Proof',
    'tunnel-cert-upload': 'Tunnel Certificate Upload', 'currency-check': 'Currency Check',
  };

  const templates: { id: number; category: OnboardingCategory; stepIds: number[] }[] = [];
  for (const def of templateDefs) {
    const t = await prisma.onboardingTemplate.create({
      data: {
        uuid: randomUUID(),
        orgId: org.id,
        dropzoneId: dz.id,
        category: def.category,
        name: def.name,
        flowKey: def.flowKey,
        externalSlug: def.slug,
        internalRoute: `/app/onboarding/${def.flowKey}`,
        accessMode: def.access,
        requireLogin: def.access !== OnboardingAccessMode.PUBLIC,
        allowGuestMode: def.access === OnboardingAccessMode.PUBLIC,
        status: 'ACTIVE',
        version: 1,
      },
    });

    const stepIds: number[] = [];
    for (let i = 0; i < def.steps.length; i++) {
      const key = def.steps[i];
      const step = await prisma.onboardingTemplateStep.create({
        data: {
          templateId: t.id,
          key,
          label: stepLabels[key] || key,
          type: stepTypeMap[key] || OnboardingStepType.FORM,
          orderIndex: i,
          required: true,
        },
      });
      stepIds.push(step.id);
    }
    templates.push({ id: t.id, category: def.category, stepIds });
  }

  console.log(`   • ${templates.length} onboarding templates with steps`);

  // ============================================================================
  // ONBOARDING APPLICATIONS (20 applications across various templates/statuses)
  // ============================================================================
  const allUsers = await prisma.user.findMany({ take: 35, orderBy: { id: 'asc' } });
  const appStatuses: OnboardingApplicationStatus[] = [
    OnboardingApplicationStatus.APPROVED, OnboardingApplicationStatus.APPROVED,
    OnboardingApplicationStatus.SUBMITTED, OnboardingApplicationStatus.UNDER_REVIEW,
    OnboardingApplicationStatus.IN_PROGRESS, OnboardingApplicationStatus.IN_PROGRESS,
    OnboardingApplicationStatus.APPROVED, OnboardingApplicationStatus.DOCUMENTS_MISSING,
    OnboardingApplicationStatus.REJECTED, OnboardingApplicationStatus.APPROVED,
    OnboardingApplicationStatus.SUBMITTED, OnboardingApplicationStatus.CONDITIONALLY_APPROVED,
    OnboardingApplicationStatus.IN_PROGRESS, OnboardingApplicationStatus.APPROVED,
    OnboardingApplicationStatus.SUBMITTED, OnboardingApplicationStatus.DRAFT,
    OnboardingApplicationStatus.APPROVED, OnboardingApplicationStatus.UNDER_REVIEW,
    OnboardingApplicationStatus.IN_PROGRESS, OnboardingApplicationStatus.APPROVED,
  ];

  const externalApplicants = [
    { name: 'Marcus Williams', email: 'marcus.w@email.com', phone: '+1-555-0111' },
    { name: 'Sarah Park', email: 'sarah.park@email.com', phone: '+1-555-0222' },
    { name: 'Jake Morrison', email: 'jake.m@email.com', phone: '+1-555-0333' },
    { name: 'Emily Chen', email: 'emily.chen@email.com', phone: '+44-7700-900111' },
    { name: 'David Kim', email: 'david.kim@email.com', phone: '+1-555-0444' },
  ];

  let appCount = 0;
  for (let i = 0; i < 20; i++) {
    const tpl = templates[i % templates.length];
    const status = appStatuses[i];
    const isExternal = i >= 15; // last 5 are external/guest
    const extApp = isExternal ? externalApplicants[i - 15] : null;
    const user = !isExternal ? allUsers[i % allUsers.length] : null;
    const pct = status === OnboardingApplicationStatus.APPROVED ? 100
      : status === OnboardingApplicationStatus.SUBMITTED ? 100
      : status === OnboardingApplicationStatus.UNDER_REVIEW ? 85
      : status === OnboardingApplicationStatus.CONDITIONALLY_APPROVED ? 90
      : status === OnboardingApplicationStatus.DOCUMENTS_MISSING ? 60
      : status === OnboardingApplicationStatus.IN_PROGRESS ? Math.floor(30 + Math.random() * 50)
      : status === OnboardingApplicationStatus.DRAFT ? Math.floor(5 + Math.random() * 20)
      : status === OnboardingApplicationStatus.REJECTED ? 100
      : 0;

    const app = await prisma.onboardingApplication.create({
      data: {
        uuid: randomUUID(),
        orgId: org.id,
        dropzoneId: dz.id,
        templateId: tpl.id,
        userId: user?.id || null,
        externalContactEmail: extApp?.email || null,
        externalContactPhone: extApp?.phone || null,
        externalContactName: extApp?.name || null,
        sourceChannel: isExternal ? 'EXTERNAL_LINK' : 'INTERNAL',
        status,
        completionPercent: pct,
        submittedAt: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONDITIONALLY_APPROVED'].includes(status) ? new Date(now.getTime() - (20 - i) * 86400000) : null,
        approvedAt: status === OnboardingApplicationStatus.APPROVED ? new Date(now.getTime() - (15 - i) * 86400000) : null,
        rejectedAt: status === OnboardingApplicationStatus.REJECTED ? new Date(now.getTime() - 3 * 86400000) : null,
        assignedReviewerId: ['UNDER_REVIEW', 'DOCUMENTS_MISSING'].includes(status) ? adminUser.id : null,
      },
    });

    // Add step responses for completed steps
    const completedSteps = Math.floor(tpl.stepIds.length * pct / 100);
    for (let s = 0; s < completedSteps && s < tpl.stepIds.length; s++) {
      await prisma.applicationStepResponse.create({
        data: {
          applicationId: app.id,
          stepId: tpl.stepIds[s],
          valueJson: { filled: true },
          completed: true,
          completedAt: new Date(now.getTime() - (25 - i - s) * 86400000),
        },
      });
    }
    appCount++;
  }

  console.log(`   • ${appCount} onboarding applications with step responses`);

  // ============================================================================
  // SEGMENTS (25 audience segments)
  // ============================================================================
  const segDefs = [
    { name: 'All Athletes', desc: 'Every registered athlete', rules: [{ field: 'role', op: 'eq', value: 'ATHLETE' }], count: 350 },
    { name: 'Licensed Jumpers', desc: 'Athletes with valid USPA license', rules: [{ field: 'license.status', op: 'eq', value: 'VALID' }], count: 280 },
    { name: 'AFF Students', desc: 'Currently enrolled AFF students', rules: [{ field: 'onboarding.category', op: 'eq', value: 'STUDENT' }], count: 45 },
    { name: 'Active Last 30 Days', desc: 'Jumped in last 30 days', rules: [{ field: 'lastJump', op: 'within', value: '30d' }], count: 120 },
    { name: 'Inactive 60+ Days', desc: 'No jumps in 60+ days', rules: [{ field: 'lastJump', op: 'older', value: '60d' }], count: 85 },
    { name: 'Tandem Customers', desc: 'Completed tandem experience', rules: [{ field: 'onboarding.category', op: 'eq', value: 'TANDEM' }], count: 200 },
    { name: 'VIP Jumpers', desc: '500+ total jumps', rules: [{ field: 'jumpCount', op: 'gte', value: 500 }], count: 25 },
    { name: 'New This Month', desc: 'Registered this calendar month', rules: [{ field: 'createdAt', op: 'within', value: '30d' }], count: 18 },
    { name: 'Coaches & Instructors', desc: 'All coach and instructor roles', rules: [{ field: 'role', op: 'in', value: ['COACH', 'AFF_INSTRUCTOR', 'TANDEM_INSTRUCTOR'] }], count: 15 },
    { name: 'Waiver Expiring Soon', desc: 'Waiver expires within 30 days', rules: [{ field: 'waiver.expiresAt', op: 'within', value: '30d' }], count: 32 },
    { name: 'No Push Token', desc: 'Users without a push device registered', rules: [{ field: 'pushDevice', op: 'is_null', value: true }], count: 150 },
    { name: 'Email Only', desc: 'Users who prefer email-only notifications', rules: [{ field: 'prefs.pushEnabled', op: 'eq', value: false }], count: 90 },
    { name: '200+ Jumps', desc: 'Intermediate to experienced jumpers', rules: [{ field: 'jumpCount', op: 'gte', value: 200 }], count: 65 },
    { name: 'Competition Interested', desc: 'Athletes tagged for competition interest', rules: [{ field: 'interest', op: 'contains', value: 'competition' }], count: 40 },
    { name: 'Camera Flyers', desc: 'Athletes doing camera work', rules: [{ field: 'interest', op: 'contains', value: 'camera' }], count: 20 },
    { name: 'Wingsuit Rated', desc: 'Wingsuit-rated jumpers', rules: [{ field: 'rating', op: 'contains', value: 'wingsuit' }], count: 35 },
    { name: 'Unapproved Applications', desc: 'Pending onboarding applications', rules: [{ field: 'app.status', op: 'in', value: ['SUBMITTED', 'UNDER_REVIEW'] }], count: 12 },
    { name: 'Coaches Missing Docs', desc: 'Coaches with incomplete documents', rules: [{ field: 'app.status', op: 'eq', value: 'DOCUMENTS_MISSING' }, { field: 'role', op: 'eq', value: 'COACH' }], count: 3 },
    { name: 'English Speakers', desc: 'Preferred language English', rules: [{ field: 'prefs.language', op: 'eq', value: 'en' }], count: 310 },
    { name: 'Spanish Speakers', desc: 'Preferred language Spanish', rules: [{ field: 'prefs.language', op: 'eq', value: 'es' }], count: 25 },
    { name: 'Weekend Warriors', desc: 'Jump primarily on weekends', rules: [{ field: 'jumpPattern', op: 'eq', value: 'weekends' }], count: 95 },
    { name: 'Freefly Community', desc: 'Freefly discipline jumpers', rules: [{ field: 'discipline', op: 'contains', value: 'freefly' }], count: 55 },
    { name: 'RW/Formation', desc: 'Relative work / formation jumpers', rules: [{ field: 'discipline', op: 'contains', value: 'RW' }], count: 70 },
    { name: 'Visiting Jumpers', desc: 'Non-home DZ jumpers', rules: [{ field: 'onboarding.category', op: 'eq', value: 'VISITING_JUMPER' }], count: 42 },
    { name: 'Birthday This Month', desc: 'Athletes with birthday this month', rules: [{ field: 'birthMonth', op: 'eq', value: 'current' }], count: 8 },
  ];

  const segments: { id: number; name: string }[] = [];
  for (const s of segDefs) {
    const seg = await prisma.segment.create({
      data: {
        uuid: randomUUID(),
        orgId: org.id,
        dropzoneId: dz.id,
        name: s.name,
        description: s.desc,
        rulesJson: s.rules,
        active: true,
        cachedCount: s.count,
        lastComputedAt: now,
      },
    });
    segments.push({ id: seg.id, name: s.name });
  }

  console.log(`   • ${segments.length} notification segments`);

  // ============================================================================
  // AUTOMATION RULES (8 rules)
  // ============================================================================
  const automationDefs = [
    { name: 'Welcome Email on Registration', category: 'ONBOARDING', trigger: AutomationTriggerEvent.ONBOARDING_STARTED, actions: [{ type: 'send_notification', channel: 'EMAIL', template: 'welcome-email' }] },
    { name: 'Remind Incomplete Applications (48h)', category: 'ONBOARDING', trigger: AutomationTriggerEvent.ONBOARDING_STEP_COMPLETED, actions: [{ type: 'send_notification', channel: 'EMAIL', template: 'incomplete-reminder', delay: '48h' }] },
    { name: 'Notify Reviewer on Submission', category: 'APPROVAL', trigger: AutomationTriggerEvent.ONBOARDING_SUBMITTED, actions: [{ type: 'send_notification', channel: 'IN_APP', template: 'reviewer-notification' }] },
    { name: 'Approval Confirmation Email', category: 'APPROVAL', trigger: AutomationTriggerEvent.ONBOARDING_APPROVED, actions: [{ type: 'send_notification', channel: 'EMAIL', template: 'approval-confirmation' }] },
    { name: 'Document Expiry Warning (30d)', category: 'NOTIFICATION', trigger: AutomationTriggerEvent.DOCUMENT_EXPIRING, actions: [{ type: 'send_notification', channel: 'EMAIL', template: 'doc-expiry-warning' }] },
    { name: 'Waiver Expiring Push Alert', category: 'NOTIFICATION', trigger: AutomationTriggerEvent.WAIVER_EXPIRING, actions: [{ type: 'send_notification', channel: 'PUSH', template: 'waiver-expiry-push' }] },
    { name: 'Follow-up After User Registration', category: 'FOLLOWUP', trigger: AutomationTriggerEvent.USER_REGISTERED, actions: [{ type: 'send_notification', channel: 'EMAIL', template: 'registration-followup' }] },
    { name: 'Re-engage Inactive Applications', category: 'FOLLOWUP', trigger: AutomationTriggerEvent.APPLICATION_INACTIVE, actions: [{ type: 'send_notification', channel: 'EMAIL', template: 're-engage' }] },
  ];

  for (const a of automationDefs) {
    await prisma.automationRule.create({
      data: {
        uuid: randomUUID(),
        orgId: org.id,
        dropzoneId: dz.id,
        name: a.name,
        category: a.category,
        triggerEvent: a.trigger,
        actionsJson: a.actions,
        active: true,
        runCount: Math.floor(Math.random() * 200),
        lastRunAt: new Date(now.getTime() - Math.floor(Math.random() * 7) * 86400000),
      },
    });
  }

  console.log(`   • ${automationDefs.length} automation rules`);

  // ============================================================================
  // NOTIFICATION CAMPAIGNS (6 campaigns)
  // ============================================================================
  const campaignDefs = [
    { name: 'Spring Season Welcome', segIdx: 0, channels: ['EMAIL', 'PUSH'], status: CampaignStatus.COMPLETED, trigger: CampaignTriggerType.MANUAL, sent: 340, open: 210, click: 85, fail: 5 },
    { name: 'Waiver Renewal Reminder', segIdx: 9, channels: ['EMAIL', 'WHATSAPP'], status: CampaignStatus.ACTIVE, trigger: CampaignTriggerType.SCHEDULED, sent: 32, open: 20, click: 15, fail: 1 },
    { name: 'Boogie 2026 Announcement', segIdx: 0, channels: ['EMAIL', 'PUSH', 'IN_APP'], status: CampaignStatus.ACTIVE, trigger: CampaignTriggerType.MANUAL, sent: 280, open: 190, click: 120, fail: 3 },
    { name: 'Inactive Jumper Re-Engagement', segIdx: 4, channels: ['EMAIL'], status: CampaignStatus.COMPLETED, trigger: CampaignTriggerType.SEGMENT_BASED, sent: 85, open: 30, click: 12, fail: 8 },
    { name: 'Safety Update Newsletter', segIdx: 1, channels: ['EMAIL'], status: CampaignStatus.DRAFT, trigger: CampaignTriggerType.MANUAL, sent: 0, open: 0, click: 0, fail: 0 },
    { name: 'Weekend Weather Alert', segIdx: 20, channels: ['PUSH', 'IN_APP'], status: CampaignStatus.SCHEDULED, trigger: CampaignTriggerType.SCHEDULED, sent: 0, open: 0, click: 0, fail: 0 },
  ];

  for (const c of campaignDefs) {
    await prisma.notificationCampaign.create({
      data: {
        uuid: randomUUID(),
        orgId: org.id,
        dropzoneId: dz.id,
        name: c.name,
        segmentId: segments[c.segIdx]?.id,
        channelsJson: c.channels,
        triggerType: c.trigger,
        status: c.status,
        sentCount: c.sent,
        openCount: c.open,
        clickCount: c.click,
        failCount: c.fail,
        startedAt: c.sent > 0 ? new Date(now.getTime() - 14 * 86400000) : null,
        completedAt: c.status === CampaignStatus.COMPLETED ? new Date(now.getTime() - 7 * 86400000) : null,
      },
    });
  }

  console.log(`   • ${campaignDefs.length} notification campaigns`);

  // ============================================================================
  // NOTIFICATION EVENTS (sample delivery events)
  // ============================================================================
  const eventTypes = ['ONBOARDING_WELCOME', 'WAIVER_REMINDER', 'LOAD_READY', 'SLOT_ASSIGNED', 'APPROVAL_NEEDED', 'PAYMENT_RECEIPT', 'BOOGIE_REMINDER', 'DOCUMENT_EXPIRING'];
  const channels: NotificationChannel[] = [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.SMS];
  const eventStatuses: NotificationStatus[] = [NotificationStatus.SENT, NotificationStatus.SENT, NotificationStatus.SENT, NotificationStatus.READ, NotificationStatus.FAILED, NotificationStatus.PENDING];

  let eventCount = 0;
  for (let i = 0; i < 30; i++) {
    const u = allUsers[i % allUsers.length];
    const ch = channels[i % channels.length];
    const st = eventStatuses[i % eventStatuses.length];
    await prisma.notificationEvent.create({
      data: {
        orgId: org.id,
        userId: u.id,
        eventType: eventTypes[i % eventTypes.length],
        channel: ch,
        subject: `${eventTypes[i % eventTypes.length].replace(/_/g, ' ')} for ${u.firstName}`,
        body: `This is a ${String(ch).toLowerCase()} notification for ${u.firstName} ${u.lastName}.`,
        status: st,
        attempts: st === NotificationStatus.FAILED ? 3 : 1,
        sentAt: st !== NotificationStatus.PENDING ? new Date(now.getTime() - i * 3600000) : null,
        deliveredAt: st === NotificationStatus.READ ? new Date(now.getTime() - i * 3600000 + 60000) : null,
        openedAt: st === NotificationStatus.READ ? new Date(now.getTime() - i * 3600000 + 120000) : null,
        failureReason: st === NotificationStatus.FAILED ? 'Delivery timeout after 3 attempts' : null,
      },
    });
    eventCount++;
  }

  console.log(`   • ${eventCount} notification events`);

  // ============================================================================
  // PUSH DEVICES & WHATSAPP CONSENTS & COMMUNICATION PREFERENCES
  // ============================================================================
  const pushPlatforms = ['IOS', 'ANDROID', 'WEB'];
  let pushCount = 0;
  for (let i = 0; i < Math.min(15, allUsers.length); i++) {
    await prisma.pushDevice.create({
      data: {
        userId: allUsers[i].id,
        platform: pushPlatforms[i % 3],
        pushToken: `fcm_token_${randomUUID().slice(0, 16)}`,
        appVersion: i % 3 === 0 ? '2.1.0' : i % 3 === 1 ? '2.0.5' : '1.9.3',
        deviceName: i % 3 === 0 ? 'iPhone 15 Pro' : i % 3 === 1 ? 'Pixel 8' : 'Chrome Web',
        active: i < 12,
      },
    });
    pushCount++;
  }

  let waCount = 0;
  for (let i = 0; i < Math.min(10, allUsers.length); i++) {
    await prisma.whatsAppConsent.create({
      data: {
        userId: allUsers[i].id,
        phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
        status: i < 7 ? ConsentStatus.OPTED_IN : ConsentStatus.PENDING,
        optedInAt: i < 7 ? new Date(now.getTime() - i * 86400000 * 7) : null,
      },
    });
    waCount++;
  }

  let prefCount = 0;
  for (const u of allUsers.slice(0, 20)) {
    await prisma.communicationPreference.create({
      data: {
        userId: u.id,
        emailEnabled: true,
        whatsappEnabled: Math.random() > 0.5,
        pushEnabled: Math.random() > 0.3,
        inAppEnabled: true,
        smsEnabled: false,
        preferredLanguage: Math.random() > 0.85 ? 'es' : 'en',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      },
    });
    prefCount++;
  }

  console.log(`   • ${pushCount} push devices, ${waCount} WhatsApp consents, ${prefCount} communication preferences`);

  // ============================================================================
  // NOTIFICATION TEMPLATES (event-type templates)
  // ============================================================================
  const notifTplDefs = [
    { event: 'ONBOARDING_WELCOME', channel: NotificationChannel.EMAIL, subject: 'Welcome to {{dzName}}!', body: 'Hi {{firstName}}, welcome aboard! Complete your onboarding at {{onboardingUrl}}.' },
    { event: 'ONBOARDING_WELCOME', channel: NotificationChannel.PUSH, subject: 'Welcome!', body: '{{firstName}}, welcome to {{dzName}}! Tap to complete your profile.' },
    { event: 'WAIVER_REMINDER', channel: NotificationChannel.EMAIL, subject: 'Your waiver needs attention', body: 'Hi {{firstName}}, your waiver expires on {{expiryDate}}. Please renew.' },
    { event: 'WAIVER_REMINDER', channel: NotificationChannel.SMS, subject: '', body: 'Hi {{firstName}}, your waiver at {{dzName}} is expiring soon. Tap to renew: {{renewUrl}}' },
    { event: 'APPROVAL_NEEDED', channel: NotificationChannel.EMAIL, subject: 'Application requires review', body: 'A new {{category}} application from {{applicantName}} needs your review.' },
    { event: 'APPROVAL_NEEDED', channel: NotificationChannel.IN_APP, subject: 'New application for review', body: '{{applicantName}} submitted a {{category}} application.' },
    { event: 'LOAD_READY', channel: NotificationChannel.PUSH, subject: 'Load Ready!', body: 'Load #{{loadNumber}} is ready for boarding. Head to the manifest area.' },
    { event: 'PAYMENT_RECEIPT', channel: NotificationChannel.EMAIL, subject: 'Payment Confirmation - ${{amount}}', body: 'Hi {{firstName}}, your payment of ${{amount}} has been received. Transaction ID: {{txnId}}.' },
  ];

  for (const t of notifTplDefs) {
    await prisma.notificationTemplate.create({
      data: {
        eventType: t.event,
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        variables: {},
      },
    });
  }

  console.log(`   • ${notifTplDefs.length} notification templates`);

  console.log('   • Instructor skill types & certifications');
  console.log('   • Athlete profiles with licenses');
  console.log('   • AFF progression records');
  console.log('   • 5 booking packages + DZ pricing');
  console.log('   • 3 tandem bookings');
  console.log('   • 40 logbook entries');
  console.log('   • 6 medical declarations');
  console.log('   • 10 documents (ID, insurance, certifications)');
  console.log('   • 8 operational tasks');
  console.log('   • 1 DZ settings record');

  // ============================================================================
  // CHAT CHANNELS & MESSAGES — Operational communications
  // ============================================================================
  console.log('');
  console.log('💬 Seeding chat channels & messages...');

  const chatChannels: any[] = [];
  try {
    // DZ General channel
    const chGeneral = await (prisma as any).chatChannel.create({
      data: { name: 'DZ General', type: 'GROUP', dropzoneId: dz.id },
    });
    chatChannels.push(chGeneral);

    // Load-specific channels for active loads
    const chLoad9 = await (prisma as any).chatChannel.create({
      data: { name: 'Load L-009 Chat', type: 'LOAD', dropzoneId: dz.id },
    });
    chatChannels.push(chLoad9);

    const chLoad10 = await (prisma as any).chatChannel.create({
      data: { name: 'Load L-010 Chat', type: 'LOAD', dropzoneId: dz.id },
    });
    chatChannels.push(chLoad10);

    // Staff channel
    const chStaff = await (prisma as any).chatChannel.create({
      data: { name: 'Staff Lounge', type: 'GROUP', dropzoneId: dz.id },
    });
    chatChannels.push(chStaff);

    // Safety channel
    const chSafety = await (prisma as any).chatChannel.create({
      data: { name: 'Safety Alerts', type: 'GROUP', dropzoneId: dz.id },
    });
    chatChannels.push(chSafety);

    // Direct message channel
    const chDM = await (prisma as any).chatChannel.create({
      data: { name: null, type: 'DIRECT', dropzoneId: dz.id },
    });
    chatChannels.push(chDM);

    // Add members to channels
    const allStaffIds = [adminUser.id, manifestUser.id, safetyUser.id, pilotUser1.id, pilotUser2.id, riggerUser.id, frontDesk.id, tandem1.id, tandem2.id, affi.id, coach.id];
    const someAthleteIds = athleteList.slice(0, 12).map((a: any) => a.id);

    // General — all staff + first 12 athletes
    for (const uid of [...allStaffIds, ...someAthleteIds]) {
      await (prisma as any).chatMember.create({ data: { channelId: chGeneral.id, userId: uid, role: allStaffIds.includes(uid) ? 'admin' : 'member' } });
    }

    // Load 9 — manifest + pilot + 4 athletes
    for (const uid of [manifestUser.id, pilotUser1.id, ...someAthleteIds.slice(0, 4)]) {
      await (prisma as any).chatMember.create({ data: { channelId: chLoad9.id, userId: uid } });
    }

    // Load 10 — manifest + pilot + 4 athletes
    for (const uid of [manifestUser.id, pilotUser2.id, ...someAthleteIds.slice(4, 8)]) {
      await (prisma as any).chatMember.create({ data: { channelId: chLoad10.id, userId: uid } });
    }

    // Staff — all staff
    for (const uid of allStaffIds) {
      await (prisma as any).chatMember.create({ data: { channelId: chStaff.id, userId: uid } });
    }

    // Safety — safety officer + admin + pilots
    for (const uid of [safetyUser.id, adminUser.id, pilotUser1.id, pilotUser2.id, riggerUser.id]) {
      await (prisma as any).chatMember.create({ data: { channelId: chSafety.id, userId: uid } });
    }

    // DM — coach and athlete1
    await (prisma as any).chatMember.create({ data: { channelId: chDM.id, userId: coach.id } });
    await (prisma as any).chatMember.create({ data: { channelId: chDM.id, userId: athleteList[0].id } });

    // Chat messages — realistic operational conversations
    const chatMessages = [
      // General channel
      { channelId: chGeneral.id, senderId: adminUser.id, body: 'Good morning everyone! Beautiful day for jumping. Winds are calm, clear skies. Let\'s have a safe and fun day!' },
      { channelId: chGeneral.id, senderId: manifestUser.id, body: 'Manifest is open! First load goes up at 09:00. Come check in early to get on the board.' },
      { channelId: chGeneral.id, senderId: athleteList[0].id, body: 'Awesome! Looking forward to a full day of freefly. Anyone want to organize a 4-way?' },
      { channelId: chGeneral.id, senderId: athleteList[1].id, body: 'I\'m in for the 4-way! Let me grab my camera helmet too.' },
      { channelId: chGeneral.id, senderId: coach.id, body: 'I can coach the 4-way if you guys want. Meet at the organizers tent after load 3.' },
      { channelId: chGeneral.id, senderId: athleteList[2].id, body: 'Count me in! Just checked in with manifest. Let\'s do this!' },
      { channelId: chGeneral.id, senderId: pilotUser1.id, body: 'Heads up — N208SH (Caravan) is the primary aircraft today. King Air goes up for load 5+ if we need it.' },
      { channelId: chGeneral.id, senderId: safetyUser.id, body: '⚠️ Reminder: winds are expected to pick up after 14:00. Plan your jumps accordingly.' },
      { channelId: chGeneral.id, senderId: athleteList[3].id, body: 'Thanks for the wind update. I\'ll get my wingsuit jumps done this morning then.' },
      { channelId: chGeneral.id, senderId: frontDesk.id, body: 'We have a group of 3 tandem customers arriving at 10:30. TIs please be ready.' },

      // Load 9 channel
      { channelId: chLoad9.id, senderId: manifestUser.id, body: 'Load L-009 is filling up. 3 spots left on the Caravan. Exit order: RW 4-way, then 2 solos.' },
      { channelId: chLoad9.id, senderId: athleteList[0].id, body: 'I\'m on this one. Going belly, exit first?' },
      { channelId: chLoad9.id, senderId: manifestUser.id, body: 'Correct, belly group exits first. Freefly pair goes second.' },
      { channelId: chLoad9.id, senderId: pilotUser1.id, body: 'Roger. Full power climb, expect 15-min ride to altitude. Buckle up!' },

      // Load 10 channel
      { channelId: chLoad10.id, senderId: manifestUser.id, body: 'Load L-010 forming now. Looking for 2 more to fill. Anyone want a hop-n-pop?' },
      { channelId: chLoad10.id, senderId: athleteList[5].id, body: 'I\'ll take a hop-n-pop slot. 5,000ft exit.' },
      { channelId: chLoad10.id, senderId: pilotUser2.id, body: 'L-010 aircraft is fueled and ready. Boarding in 10 minutes.' },

      // Staff channel
      { channelId: chStaff.id, senderId: adminUser.id, body: 'Team — we have a busy day ahead. 35+ jumpers checked in. Let\'s stay sharp on safety.' },
      { channelId: chStaff.id, senderId: riggerUser.id, body: 'All rental rigs inspected and packed. 8 student rigs ready, 5 tandem rigs ready.' },
      { channelId: chStaff.id, senderId: tandem1.id, body: 'I can take 4 tandems today. Maria, can you handle the afternoon slots?' },
      { channelId: chStaff.id, senderId: tandem2.id, body: 'Yes, I\'ve got the 13:00 and 15:00 tandems covered.' },
      { channelId: chStaff.id, senderId: manifestUser.id, body: 'Great. I\'ll assign tandem students as they arrive. Keep your radios on.' },
      { channelId: chStaff.id, senderId: affi.id, body: 'I have 2 AFF Level 1 students this morning. Briefing starts at 08:30.' },

      // Safety channel
      { channelId: chSafety.id, senderId: safetyUser.id, body: 'Morning safety briefing: Winds 8kts from NW. Jumping index is GREEN. Landing area clear.' },
      { channelId: chSafety.id, senderId: pilotUser1.id, body: 'ATIS information Bravo current. Ceiling unlimited, visibility 10+. Great conditions.' },
      { channelId: chSafety.id, senderId: safetyUser.id, body: 'All pilots: we have student jumpers on loads 3 and 4. Extra separation on exit please.' },
      { channelId: chSafety.id, senderId: riggerUser.id, body: 'Flagged: Rig SN-1234 has a worn closing loop. Grounded until replaced. Owner notified.' },

      // DM — coach to athlete coaching notes
      { channelId: chDM.id, senderId: coach.id, body: 'Hey Hassan! Great freefly jump yesterday. Your head-down is looking solid. Let\'s work on transitions next session.' },
      { channelId: chDM.id, senderId: athleteList[0].id, body: 'Thanks Alex! Yeah I felt much more stable. When are you available for the next coaching jump?' },
      { channelId: chDM.id, senderId: coach.id, body: 'I\'m on the DZ all day Saturday. Let\'s plan for Load 5 or 6. I\'ll put us on the board.' },
      { channelId: chDM.id, senderId: athleteList[0].id, body: 'Perfect. I\'ll be there early. See you Saturday!' },
    ];

    for (let i = 0; i < chatMessages.length; i++) {
      const msg = chatMessages[i];
      await (prisma as any).chatMessage.create({
        data: {
          ...msg,
          createdAt: new Date(now.getTime() - (chatMessages.length - i) * 5 * 60_000), // 5 min apart
        },
      });
    }

    console.log(`   ✅ ${chatChannels.length} chat channels, ${chatMessages.length} messages`);
  } catch (e) {
    console.log('   ⚠ Chat models not yet migrated — skipping');
  }

  // ============================================================================
  // JOB POSTINGS — Careers module
  // ============================================================================
  console.log('💼 Seeding job postings...');

  try {
    const jobPosts = [
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        createdBy: adminUser.id,
        title: 'Tandem Instructor — Full Time',
        slug: 'tandem-instructor-full-time',
        roleCategory: 'TI',
        employmentType: 'FULL_TIME' as any,
        priority: 'HIGH',
        locationMode: 'ON_SITE',
        city: 'Perris',
        country: 'USA',
        visibilityType: 'PUBLIC_MARKETPLACE' as any,
        status: 'PUBLISHED' as any,
        description: 'Join one of Southern California\'s busiest dropzones as a full-time Tandem Instructor. We operate 7 days a week with 3 aircraft, completing 80+ tandems per weekend. Looking for experienced TIs who are passionate about introducing new people to skydiving.',
        responsibilitiesJson: JSON.stringify(['Conduct 4-6 tandem skydives per day', 'Provide pre-jump ground training to students', 'Maintain tandem equipment and perform daily inspections', 'Assist with video editing and customer experience']),
        requirementsJson: JSON.stringify(['USPA Tandem Instructor rating', 'Minimum 500 total jumps', '100+ tandem jumps', 'Current FAA Class 3 medical', 'Strong Sigma or UPT certified']),
        compensationJson: JSON.stringify({ min: 50000, max: 75000, currency: 'USD', period: 'yearly', benefits: ['Health insurance', 'Free jumps', 'Gear maintenance'] }),
        applicationsCount: 8,
        viewsCount: 245,
        publishAt: new Date(now.getTime() - 14 * 86400000),
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        createdBy: adminUser.id,
        title: 'AFF Instructor — Seasonal',
        slug: 'aff-instructor-seasonal',
        roleCategory: 'AFFI',
        employmentType: 'SEASONAL' as any,
        priority: 'NORMAL',
        locationMode: 'ON_SITE',
        city: 'Perris',
        country: 'USA',
        visibilityType: 'PUBLIC_MARKETPLACE' as any,
        status: 'PUBLISHED' as any,
        description: 'Seasonal AFF Instructor position for the busy spring/summer season (April–September). Teach students from Level 1 through graduation. Great team environment with experienced staff.',
        responsibilitiesJson: JSON.stringify(['Conduct AFF Level 1-8 jumps', 'Ground school instruction', 'Student progression tracking', 'Equipment briefings']),
        requirementsJson: JSON.stringify(['USPA AFF Instructor rating', 'Minimum 800 total jumps', '200+ AFF jumps', 'Strong communication skills']),
        compensationJson: JSON.stringify({ min: 200, max: 300, currency: 'USD', period: 'per_jump', benefits: ['Free jumps', 'Discounted gear'] }),
        applicationsCount: 5,
        viewsCount: 180,
        publishAt: new Date(now.getTime() - 7 * 86400000),
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        createdBy: adminUser.id,
        title: 'Experienced Pilot — Twin Turbine',
        slug: 'pilot-twin-turbine',
        roleCategory: 'PILOT',
        employmentType: 'FULL_TIME' as any,
        priority: 'URGENT',
        locationMode: 'ON_SITE',
        city: 'Perris',
        country: 'USA',
        visibilityType: 'PUBLIC_MARKETPLACE' as any,
        status: 'PUBLISHED' as any,
        description: 'Experienced jump pilot needed for our King Air. Must be comfortable with high-density altitude operations and rapid turnaround flights. We fly 20+ loads per day on busy weekends.',
        responsibilitiesJson: JSON.stringify(['Fly King Air and Caravan aircraft', 'Manage fuel and weight calculations', 'Coordinate with manifest on load schedules', 'Maintain aircraft logs']),
        requirementsJson: JSON.stringify(['Commercial Pilot License with multi-engine rating', '1500+ total flight hours', '500+ jump pilot hours', 'King Air type experience preferred']),
        compensationJson: JSON.stringify({ min: 65000, max: 90000, currency: 'USD', period: 'yearly', benefits: ['Health insurance', '401k', 'Flight hour building'] }),
        applicationsCount: 3,
        viewsCount: 320,
        publishAt: new Date(now.getTime() - 3 * 86400000),
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        createdBy: adminUser.id,
        title: 'Senior Rigger — FAA Certified',
        slug: 'senior-rigger-faa',
        roleCategory: 'RIGGER',
        employmentType: 'FULL_TIME' as any,
        priority: 'HIGH',
        locationMode: 'ON_SITE',
        city: 'Perris',
        country: 'USA',
        visibilityType: 'INTERNAL_PROFESSIONAL_POOL' as any,
        status: 'PUBLISHED' as any,
        description: 'Senior Rigger position to manage our fleet of 30+ rigs. Responsible for repacks, inspections, maintenance, and mentoring junior staff.',
        responsibilitiesJson: JSON.stringify(['Reserve repacks and inspections', 'Main canopy maintenance', 'AAD servicing coordination', 'Student gear fleet management']),
        requirementsJson: JSON.stringify(['FAA Senior or Master Rigger certificate', '5+ years rigging experience', 'Strong STC and PIA knowledge', 'Experience with Sigma, Vector, and Javelin containers']),
        compensationJson: JSON.stringify({ min: 55000, max: 70000, currency: 'USD', period: 'yearly', benefits: ['Health insurance', 'Free jumps', 'Tool allowance'] }),
        applicationsCount: 2,
        viewsCount: 95,
        publishAt: new Date(now.getTime() - 21 * 86400000),
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        createdBy: adminUser.id,
        title: 'Freefly Coach — Weekend',
        slug: 'freefly-coach-weekend',
        roleCategory: 'COACH',
        employmentType: 'PART_TIME' as any,
        priority: 'NORMAL',
        locationMode: 'ON_SITE',
        city: 'Perris',
        country: 'USA',
        visibilityType: 'PUBLIC_MARKETPLACE' as any,
        status: 'PUBLISHED' as any,
        description: 'Weekend freefly coach to work with intermediate and advanced skydivers. Help athletes progress in head-up, head-down, and dynamic flying.',
        responsibilitiesJson: JSON.stringify(['Coach freefly skills from intermediate to advanced', 'Video debrief sessions', 'Organize freefly events and load organizes']),
        requirementsJson: JSON.stringify(['USPA Coach rating', 'D License with 1000+ jumps', 'Strong freefly skills', 'Teaching experience preferred']),
        compensationJson: JSON.stringify({ min: 150, max: 200, currency: 'USD', period: 'per_jump', benefits: ['Free jumps on coaching days'] }),
        applicationsCount: 6,
        viewsCount: 150,
        publishAt: new Date(now.getTime() - 10 * 86400000),
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        createdBy: adminUser.id,
        title: 'Camera Flyer — Tandem Video',
        slug: 'camera-flyer-tandem',
        roleCategory: 'CAMERA',
        employmentType: 'FREELANCE' as any,
        priority: 'NORMAL',
        locationMode: 'ON_SITE',
        city: 'Perris',
        country: 'USA',
        visibilityType: 'PUBLIC_MARKETPLACE' as any,
        status: 'PUBLISHED' as any,
        description: 'Freelance camera flyer for tandem video packages. Fly outside video on tandems and produce same-day edit packages for customers.',
        responsibilitiesJson: JSON.stringify(['Fly outside video for tandem jumps', 'Edit and deliver video packages same-day', 'Maintain camera equipment']),
        requirementsJson: JSON.stringify(['C License minimum', '500+ jumps', 'Camera helmet experience', 'Video editing skills']),
        compensationJson: JSON.stringify({ min: 50, max: 75, currency: 'USD', period: 'per_jump', benefits: ['Equipment provided'] }),
        applicationsCount: 4,
        viewsCount: 110,
        publishAt: new Date(now.getTime() - 5 * 86400000),
      },
    ];

    for (const jp of jobPosts) {
      await (prisma as any).jobPost.create({ data: jp });
    }

    // Add a few job applications
    const tandemJob = await (prisma as any).jobPost.findFirst({ where: { slug: 'tandem-instructor-full-time' } });
    if (tandemJob) {
      const applicantAthletes = [
        { user: athleteList[0], stage: 'SHORTLISTED', cover: 'Experienced D-license jumper with 500+ jumps. Strong Sigma certified.' },
        { user: athleteList[1], stage: 'INTERVIEW_SCHEDULED', cover: '1200-jump veteran looking to transition into full-time instruction.' },
        { user: athleteList[4], stage: 'APPLIED', cover: '650 jumps, currently coaching at my home DZ. Ready for TI career.' },
      ];
      for (const app of applicantAthletes) {
        await (prisma as any).jobApplication.create({
          data: {
            uuid: randomUUID(),
            jobPostId: tandemJob.id,
            applicantUserId: app.user.id,
            applicantEmail: app.user.email,
            applicantName: `${app.user.firstName} ${app.user.lastName}`,
            currentStage: app.stage,
            status: 'ACTIVE',
            sourceType: 'INTERNAL',
            coverLetter: app.cover,
            submittedAt: new Date(now.getTime() - Math.floor(Math.random() * 7) * 86400000),
          },
        });
      }
    }

    console.log(`   ✅ ${jobPosts.length} job postings, 3 applications`);
  } catch (e) {
    console.log('   ⚠ JobPost models not yet migrated — skipping');
  }

  // ============================================================================
  // LEARNING COURSES — Training module
  // ============================================================================
  console.log('📚 Seeding learning courses...');

  try {
    const courses = [
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        title: 'AFF Ground School — Complete Course',
        slug: 'aff-ground-school-complete',
        description: 'Comprehensive Accelerated Freefall ground training covering all 8 levels. Includes body position, emergency procedures, canopy flight, and landing patterns.',
        shortDescription: 'Master AFF fundamentals from Level 1 to graduation',
        category: 'AFF',
        level: 'BEGINNER',
        accessType: 'PAID' as any,
        visibility: 'PUBLIC' as any,
        status: 'PUBLISHED' as any,
        estimatedDurationMinutes: 480,
        isFeatured: true,
        createdById: affi.id,
        publishedAt: new Date(now.getTime() - 60 * 86400000),
        modules: [
          { title: 'Introduction to Skydiving', lessons: ['Welcome & Course Overview', 'History of Skydiving', 'Equipment Overview'] },
          { title: 'Freefall Fundamentals', lessons: ['Body Position', 'Stability & Heading', 'Altitude Awareness'] },
          { title: 'Emergency Procedures', lessons: ['Malfunction Recognition', 'Cutaway Procedures', 'Reserve Deployment'] },
          { title: 'Canopy Flight', lessons: ['Canopy Control Basics', 'Landing Patterns', 'Traffic & Right-of-Way'] },
        ],
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        title: 'Canopy Piloting — Intermediate',
        slug: 'canopy-piloting-intermediate',
        description: 'Advanced canopy skills for B-license holders and above. Learn high-performance landings, rear-riser turns, and emergency scenarios.',
        shortDescription: 'Level up your canopy skills safely',
        category: 'CANOPY',
        level: 'INTERMEDIATE',
        accessType: 'PAID' as any,
        visibility: 'PUBLIC' as any,
        status: 'PUBLISHED' as any,
        estimatedDurationMinutes: 240,
        isFeatured: false,
        createdById: coach.id,
        publishedAt: new Date(now.getTime() - 30 * 86400000),
        modules: [
          { title: 'Understanding Your Canopy', lessons: ['Wing Loading Concepts', 'Line Trim & Performance'] },
          { title: 'Advanced Techniques', lessons: ['Rear-Riser Turns', 'Front-Riser Approaches', 'Crosswind Landings'] },
        ],
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        title: 'Freefly Fundamentals',
        slug: 'freefly-fundamentals',
        description: 'Learn head-up and head-down flying from the ground up. This course covers body position, transitions, and safety considerations for freefly.',
        shortDescription: 'Start your freefly journey the right way',
        category: 'FREEFLY',
        level: 'INTERMEDIATE',
        accessType: 'FREE' as any,
        visibility: 'PUBLIC' as any,
        status: 'PUBLISHED' as any,
        estimatedDurationMinutes: 180,
        isFeatured: true,
        createdById: coach.id,
        publishedAt: new Date(now.getTime() - 45 * 86400000),
        modules: [
          { title: 'Head-Up Flying', lessons: ['Sit-Fly Basics', 'Movement & Turns', 'Docking'] },
          { title: 'Head-Down Flying', lessons: ['Head-Down Basics', 'Stability & Exits', 'Speed Control'] },
        ],
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        title: 'Wingsuit First Flight Course',
        slug: 'wingsuit-first-flight',
        description: 'Everything you need to know before your first wingsuit flight. Covers equipment, body position, emergency procedures, and flight planning.',
        shortDescription: 'Safe preparation for your first wingsuit jump',
        category: 'WINGSUIT',
        level: 'ADVANCED',
        accessType: 'PAID' as any,
        visibility: 'PUBLIC' as any,
        status: 'PUBLISHED' as any,
        estimatedDurationMinutes: 300,
        isFeatured: false,
        createdById: coach.id,
        publishedAt: new Date(now.getTime() - 15 * 86400000),
        modules: [
          { title: 'Wingsuit Basics', lessons: ['Equipment & Suit Selection', 'Pre-Flight Checks', 'Exit & Deployment'] },
          { title: 'Flight Skills', lessons: ['Glide Ratio & Speed', 'Turns & Flocking', 'Emergency Procedures'] },
        ],
      },
      {
        uuid: randomUUID(),
        organizationId: org.id,
        dropzoneId: dz.id,
        title: 'Safety & Emergency Refresher',
        slug: 'safety-emergency-refresher',
        description: 'Annual safety refresher covering the latest emergency procedures, equipment updates, and incident analysis. Required for all active jumpers.',
        shortDescription: 'Stay current on safety procedures',
        category: 'SAFETY',
        level: 'ALL_LEVELS',
        accessType: 'FREE' as any,
        visibility: 'PLATFORM_ONLY' as any,
        status: 'PUBLISHED' as any,
        estimatedDurationMinutes: 90,
        isFeatured: true,
        createdById: safetyUser.id,
        publishedAt: new Date(now.getTime() - 90 * 86400000),
        modules: [
          { title: 'Emergency Procedures Review', lessons: ['Malfunction Types', 'Decision Altitude', 'Reserve Procedures'] },
          { title: 'Recent Incidents Analysis', lessons: ['Case Studies 2025', 'Lessons Learned', 'Best Practices Update'] },
        ],
      },
    ];

    for (const courseDef of courses) {
      const { modules: moduleDefs, ...courseData } = courseDef;
      const course = await (prisma as any).learningCourse.create({ data: courseData });

      for (let mi = 0; mi < moduleDefs.length; mi++) {
        const mod = await (prisma as any).learningCourseModule.create({
          data: { courseId: course.id, title: moduleDefs[mi].title, sortOrder: mi },
        });

        for (let li = 0; li < moduleDefs[mi].lessons.length; li++) {
          await (prisma as any).learningLesson.create({
            data: {
              uuid: randomUUID(),
              courseId: course.id,
              moduleId: mod.id,
              title: moduleDefs[mi].lessons[li],
              contentType: 'VIDEO',
              durationSeconds: 600 + Math.floor(Math.random() * 1200),
              sortOrder: li,
              isPublished: true,
            },
          });
        }
      }
    }

    // Enroll some athletes in courses
    const affCourse = await (prisma as any).learningCourse.findFirst({ where: { slug: 'aff-ground-school-complete' } });
    const safetyCourse = await (prisma as any).learningCourse.findFirst({ where: { slug: 'safety-emergency-refresher' } });
    const freeflyCourse = await (prisma as any).learningCourse.findFirst({ where: { slug: 'freefly-fundamentals' } });

    if (affCourse) {
      // AFF students enrolled
      for (const student of athleteList.slice(8, 14)) {
        await (prisma as any).learningEnrollment.create({
          data: {
            uuid: randomUUID(),
            userId: student.id,
            courseId: affCourse.id,
            sourceType: 'ADMIN_ASSIGNED',
            enrollmentStatus: 'IN_PROGRESS',
            completionPercent: 20 + Math.floor(Math.random() * 60),
            startedAt: new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000),
          },
        });
      }
    }

    if (safetyCourse) {
      // Staff + experienced athletes in safety course
      for (const u of [adminUser, safetyUser, tandem1, tandem2, affi, coach, ...athleteList.slice(0, 8)]) {
        await (prisma as any).learningEnrollment.create({
          data: {
            uuid: randomUUID(),
            userId: u.id,
            courseId: safetyCourse.id,
            sourceType: 'DZ_REQUIRED',
            enrollmentStatus: Math.random() > 0.3 ? 'COMPLETED' : 'IN_PROGRESS',
            completionPercent: Math.random() > 0.3 ? 100 : 50 + Math.floor(Math.random() * 40),
            startedAt: new Date(now.getTime() - 60 * 86400000),
            completedAt: Math.random() > 0.3 ? new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000) : null,
          },
        });
      }
    }

    if (freeflyCourse) {
      // Experienced jumpers in freefly course
      for (const a of athleteList.slice(0, 5)) {
        await (prisma as any).learningEnrollment.create({
          data: {
            uuid: randomUUID(),
            userId: a.id,
            courseId: freeflyCourse.id,
            sourceType: 'SELF',
            enrollmentStatus: 'IN_PROGRESS',
            completionPercent: Math.floor(Math.random() * 80),
            startedAt: new Date(now.getTime() - Math.floor(Math.random() * 20) * 86400000),
          },
        });
      }
    }

    console.log(`   ✅ ${courses.length} courses with modules/lessons, 25+ enrollments`);
  } catch (e) {
    console.log('   ⚠ Learning models not yet migrated — skipping');
  }

  // ============================================================================
  // MORE GEAR ITEMS — Expanded gear locker
  // ============================================================================
  console.log('🪂 Seeding additional gear items...');

  const additionalGear = [
    // Personal rigs for experienced jumpers
    { serialNumber: 'JAV-2023-1842', gearType: GearType.CONTAINER, manufacturer: 'Sun Path', model: 'Javelin Odyssey', ownerId: athleteList[0].id, dom: new Date(2023, 2, 15), status: GearStatus.ACTIVE },
    { serialNumber: 'SAB-2022-0534', gearType: GearType.MAIN, manufacturer: 'Performance Designs', model: 'Sabre 3 170', ownerId: athleteList[0].id, dom: new Date(2022, 5, 1), status: GearStatus.ACTIVE },
    { serialNumber: 'OPT-2023-7712', gearType: GearType.RESERVE, manufacturer: 'Performance Designs', model: 'Optimum 176', ownerId: athleteList[0].id, dom: new Date(2023, 2, 15), lastRepackAt: new Date(now.getTime() - 90 * 86400000), nextRepackDue: new Date(now.getTime() + 90 * 86400000), status: GearStatus.ACTIVE },
    { serialNumber: 'CYP-2024-0088', gearType: GearType.AAD, manufacturer: 'Airtec', model: 'Cypres 2', ownerId: athleteList[0].id, dom: new Date(2024, 0, 10), aadFiresRemaining: 4, status: GearStatus.ACTIVE },
    { serialNumber: 'VCT-2021-3301', gearType: GearType.CONTAINER, manufacturer: 'UPT', model: 'Vector 3 M5', ownerId: athleteList[1].id, dom: new Date(2021, 7, 20), status: GearStatus.ACTIVE },
    { serialNumber: 'VLK-2022-1190', gearType: GearType.MAIN, manufacturer: 'Performance Designs', model: 'Valkyrie 84', ownerId: athleteList[1].id, dom: new Date(2022, 3, 5), status: GearStatus.ACTIVE },
    { serialNumber: 'PDR-2021-4456', gearType: GearType.RESERVE, manufacturer: 'Performance Designs', model: 'PD Reserve 113', ownerId: athleteList[1].id, dom: new Date(2021, 7, 20), lastRepackAt: new Date(now.getTime() - 150 * 86400000), nextRepackDue: new Date(now.getTime() + 30 * 86400000), status: GearStatus.ACTIVE },
    // Rental fleet
    { serialNumber: 'RNT-STU-001', gearType: GearType.CONTAINER, manufacturer: 'Sun Path', model: 'Javelin Student', isRental: true, dom: new Date(2022, 1, 1), status: GearStatus.ACTIVE },
    { serialNumber: 'RNT-STU-002', gearType: GearType.CONTAINER, manufacturer: 'Sun Path', model: 'Javelin Student', isRental: true, dom: new Date(2022, 1, 1), status: GearStatus.ACTIVE },
    { serialNumber: 'RNT-NAV-001', gearType: GearType.MAIN, manufacturer: 'Performance Designs', model: 'Navigator 260', isRental: true, dom: new Date(2022, 6, 15), status: GearStatus.ACTIVE },
    { serialNumber: 'RNT-NAV-002', gearType: GearType.MAIN, manufacturer: 'Performance Designs', model: 'Navigator 240', isRental: true, dom: new Date(2022, 6, 15), status: GearStatus.ACTIVE },
    { serialNumber: 'HLM-G4-001', gearType: GearType.HELMET, manufacturer: 'Cookie', model: 'G4', ownerId: athleteList[2].id, dom: new Date(2023, 5, 1), status: GearStatus.ACTIVE },
    { serialNumber: 'ALT-VPR-001', gearType: GearType.ALTIMETER, manufacturer: 'L&B', model: 'Viso II+', ownerId: athleteList[0].id, dom: new Date(2024, 0, 1), status: GearStatus.ACTIVE },
    // Grounded gear
    { serialNumber: 'RNT-TDM-003', gearType: GearType.CONTAINER, manufacturer: 'UPT', model: 'Sigma Tandem', isRental: true, dom: new Date(2019, 3, 10), status: GearStatus.GROUNDED },
    // In repair
    { serialNumber: 'JAV-2020-0911', gearType: GearType.CONTAINER, manufacturer: 'Sun Path', model: 'Javelin Odyssey', ownerId: athleteList[3].id, dom: new Date(2020, 8, 1), status: GearStatus.IN_REPAIR },
  ];

  for (const g of additionalGear) {
    await prisma.gearItem.create({ data: { dropzoneId: dz.id, ...g } });
  }
  console.log(`   ✅ ${additionalGear.length} additional gear items`);

  // ============================================================================
  // SEED COMPLETE
  // ============================================================================
  console.log('');
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('');
  console.log('📊 Saturday Operations Summary:');
  console.log('   • 12 loads scheduled (3 completed, 1 landed, 1 airborne, 8 upcoming)');
  console.log('   • 35+ athletes from 25+ countries');
  console.log('   • 11 staff members');
  console.log('   • 3 aircraft types');
  console.log('   • 35+ gear items (rental fleet + personal rigs + accessories)');
  console.log('   • 6 jumping groups (RW, Freefly, Wingsuit, AFF, Angle, CRW)');
  console.log('   • 5 safety incidents under investigation');
  console.log('   • 3 waiver types (Experienced, Tandem, AFF)');
  console.log('   • 25 financial transactions');
  console.log('   • 6 chat channels with 30+ messages');
  console.log('   • 6 job postings with 3 applications');
  console.log('   • 5 learning courses with modules, lessons & enrollments');
  console.log('   • 40+ logbook entries across 8 experienced jumpers');
  console.log('');
  console.log('🔐 Demo Accounts (password: skylara2026):');
  console.log('   DZ Manager:     admin@skylara.dev');
  console.log('   Manifest Staff: manifest@skylara.dev');
  console.log('   Safety Officer: safety@skylara.dev');
  console.log('   Pilot #1:       pilot1@skylara.dev');
  console.log('   Pilot #2:       pilot2@skylara.dev');
  console.log('   Rigger:         rigger@skylara.dev');
  console.log('   Tandem #1:      tandem1@skylara.dev (also Camera Coach)');
  console.log('   Tandem #2:      tandem2@skylara.dev');
  console.log('   AFF Instructor: aff1@skylara.dev');
  console.log('   Coach:          coach1@skylara.dev');
  console.log('   Front Desk:     front@skylara.dev');
  console.log('');
  console.log('🪂 Sample Athletes:');
  console.log('   athlete1@skylara.dev ... athlete35@skylara.dev');
  console.log('');

  // ========================================================================
  // OPS MESSAGE TEMPLATES — Private manifest-to-athlete messages
  // ========================================================================
  console.log('💬 Seeding ops message templates...');
  const opsTemplates = [
    { key: 'move_load', title: 'Load Change', body: 'You have been moved to a different load. Please check the load board for your updated assignment.' },
    { key: 'add_money', title: 'Account Balance', body: 'Your account balance is low. Please add funds at the manifest desk or via the app to continue jumping.' },
    { key: 'see_manifest', title: 'Please See Manifest', body: 'Please come to the manifest desk when you have a moment. We need to speak with you.' },
    { key: 'gear_issue', title: 'Gear Issue — Do Not Board', body: 'A gear issue has been flagged. Please do not board until cleared by the gear manager.' },
    { key: 'boarding_early', title: 'Early Boarding', body: 'Your load is boarding earlier than scheduled. Please head to the boarding area now.' },
    { key: 'coach_changed', title: 'Coach Change', body: 'Your assigned coach/instructor has been changed. Check your load details for the update.' },
    { key: 'waitlist_open', title: 'Waitlist Slot Available', body: 'A spot has opened up on a load. Claim it now from the load board before it fills!' },
    { key: 'weather_hold', title: 'Weather Hold', body: 'A weather hold has been activated. Please stand by — we will notify you when operations resume.' },
    { key: 'confirm_attendance', title: 'Confirm Attendance', body: 'Please confirm you are still at the dropzone and available for your upcoming load.' },
  ];

  for (const tmpl of opsTemplates) {
    await (prisma as any).opsMessageTemplate?.upsert({
      where: { dropzoneId_key: { dropzoneId: null as any, key: tmpl.key } },
      create: { key: tmpl.key, title: tmpl.title, body: tmpl.body, dropzoneId: null },
      update: { title: tmpl.title, body: tmpl.body },
    }).catch(() => console.log(`   ⚠ OpsMessageTemplate not yet migrated — skipping ${tmpl.key}`));
  }
  console.log(`   ✅ ${opsTemplates.length} ops templates seeded`);

  // ========================================================================
  // POLICY DEFINITIONS — Configurable rules catalog
  // ========================================================================
  console.log('📋 Seeding policy definitions...');
  const policyCount = await seedPolicyDefinitions(prisma);
  console.log(`   ✅ ${policyCount} policy definitions seeded`);

  // ========================================================================
  // ACHIEVEMENTS — Jump milestone badges
  // ========================================================================
  console.log('🏆 Seeding achievements...');
  const achievements = [
    { name: 'First Jump', description: 'Completed your first skydive!', criteria: { type: 'jump_count', value: 1 }, icon: '🪂', badgeColor: '#10B981', displayOrder: 1 },
    { name: 'Century Jumper', description: 'Reached 100 total jumps', criteria: { type: 'jump_count', value: 100 }, icon: '💯', badgeColor: '#3B82F6', displayOrder: 2 },
    { name: '200 Club', description: 'Reached 200 total jumps', criteria: { type: 'jump_count', value: 200 }, icon: '🔥', badgeColor: '#8B5CF6', displayOrder: 3 },
    { name: '500 Club', description: 'Reached 500 total jumps — elite status', criteria: { type: 'jump_count', value: 500 }, icon: '⭐', badgeColor: '#F59E0B', displayOrder: 4 },
    { name: 'Grand Master', description: 'Reached 1,000 total jumps — legendary', criteria: { type: 'jump_count', value: 1000 }, icon: '👑', badgeColor: '#EAB308', displayOrder: 5 },
    { name: 'A License', description: 'Earned USPA A License', criteria: { type: 'license', value: 'A' }, icon: '🅰️', badgeColor: '#10B981', displayOrder: 10 },
    { name: 'B License', description: 'Earned USPA B License', criteria: { type: 'license', value: 'B' }, icon: '🅱️', badgeColor: '#3B82F6', displayOrder: 11 },
    { name: 'C License', description: 'Earned USPA C License', criteria: { type: 'license', value: 'C' }, icon: '©️', badgeColor: '#8B5CF6', displayOrder: 12 },
    { name: 'D License', description: 'Earned USPA D License — expert', criteria: { type: 'license', value: 'D' }, icon: '🏅', badgeColor: '#F59E0B', displayOrder: 13 },
  ];

  for (const ach of achievements) {
    await (prisma as any).achievement.upsert({
      where: { name: ach.name },
      create: ach,
      update: { description: ach.description, criteria: ach.criteria, icon: ach.icon, badgeColor: ach.badgeColor, displayOrder: ach.displayOrder },
    }).catch(() => console.log(`   ⚠ Achievement model not yet migrated — skipping ${ach.name}`));
  }
  console.log(`   ✅ ${achievements.length} achievements seeded`);

  // ========================================================================
  // SUPPORTED CURRENCIES
  // ========================================================================
  console.log('💱 Seeding currencies...');
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, exchangeRate: 1.0 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, exchangeRate: 0.92 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, exchangeRate: 0.79 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, exchangeRate: 0.88 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, exchangeRate: 1.53 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalPlaces: 2, exchangeRate: 1.68 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, exchangeRate: 5.05 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2, exchangeRate: 18.2 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, exchangeRate: 3.67 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimalPlaces: 2, exchangeRate: 3.75 },
  ];

  for (const cur of currencies) {
    await (prisma as any).supportedCurrency.upsert({
      where: { code: cur.code },
      create: cur,
      update: { name: cur.name, symbol: cur.symbol, exchangeRate: cur.exchangeRate },
    }).catch(() => console.log(`   ⚠ Currency model not yet migrated — skipping ${cur.code}`));
  }
  console.log(`   ✅ ${currencies.length} currencies seeded`);

  // ========================================================================
  // LANGUAGES
  // ========================================================================
  console.log('🌐 Seeding languages...');
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', isRtl: false, completeness: 100 },
    { code: 'es', name: 'Spanish', nativeName: 'Español', isRtl: false, completeness: 0 },
    { code: 'fr', name: 'French', nativeName: 'Français', isRtl: false, completeness: 0 },
    { code: 'de', name: 'German', nativeName: 'Deutsch', isRtl: false, completeness: 0 },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', isRtl: false, completeness: 0 },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true, completeness: 0 },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', isRtl: true, completeness: 0 },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', isRtl: false, completeness: 0 },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', isRtl: false, completeness: 0 },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', isRtl: false, completeness: 0 },
    { code: 'zh', name: 'Chinese', nativeName: '中文', isRtl: false, completeness: 0 },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', isRtl: false, completeness: 0 },
    { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', isRtl: false, completeness: 0 },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', isRtl: false, completeness: 0 },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', isRtl: false, completeness: 0 },
  ];

  for (const lang of languages) {
    await (prisma as any).language.upsert({
      where: { code: lang.code },
      create: lang,
      update: { name: lang.name, nativeName: lang.nativeName, isRtl: lang.isRtl },
    }).catch(() => console.log(`   ⚠ Language model not yet migrated — skipping ${lang.code}`));
  }
  console.log(`   ✅ ${languages.length} languages seeded`);

  // ========================================================================
  // TRANSLATION NAMESPACES
  // ========================================================================
  console.log('📝 Seeding translation namespaces...');
  const namespaces = [
    'common', 'manifest', 'safety', 'booking', 'training',
    'gear', 'payments', 'social', 'notifications', 'shop',
    'emails', 'landing', 'admin',
  ];

  for (const ns of namespaces) {
    await (prisma as any).translationNamespace.upsert({
      where: { name: ns },
      create: { name: ns, description: `${ns.charAt(0).toUpperCase() + ns.slice(1)} module translations` },
      update: {},
    }).catch(() => console.log(`   ⚠ TranslationNamespace model not yet migrated — skipping ${ns}`));
  }
  console.log(`   ✅ ${namespaces.length} namespaces seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
