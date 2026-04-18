/**
 * SCENARIO: Training Camp Week
 *
 * "SkySchool Academy" — A DeLand, FL training-focused DZ running a week-long
 * AFF progression camp with a single Cessna 182. Small loads (3-4 jumpers),
 * heavy student rotation, conservative wind limits, and a full ground-school
 * staff. This scenario exercises the learning, student-progression, and
 * small-aircraft manifest paths.
 */

import {
  ScenarioData,
  StaffData,
  AthleteData,
  AircraftData,
  RigData,
  uniqueName,
  resetNamePool,
  makeEmail,
  generateSerial,
  generateRig,
  pick,
  pickN,
  daysFromNow,
  daysAgo,
  isoDate,
  randomDate,
  BOOKING_PACKAGES,
  WAIVER_TEMPLATES,
  INCIDENT_TEMPLATES,
  JOB_TEMPLATES,
  COURSE_TEMPLATES,
  CAMPAIGN_TEMPLATES,
} from './types';

export function buildTrainingCampScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // STAFF (8 people)
  // ============================================================================
  const staff: StaffData[] = [
    // DZ Manager
    {
      ...n(), email: makeEmail('janet', 'cooper', EMAIL_DOMAIN),
      roles: ['DZ_MANAGER', 'SAFETY_OFFICER'],
      bio: 'DZ Manager and Chief Instructor. D-license, 3,800 jumps. Runs annual AFF progression camps.',
    },
    // Manifest
    {
      ...n(), email: makeEmail('paul', 'whitfield', EMAIL_DOMAIN),
      roles: ['MANIFEST_STAFF'],
      bio: 'Manifest coordinator. Manages student scheduling and camp logistics.',
    },
    // Pilot
    {
      ...n(), email: makeEmail('terry', 'navarro', EMAIL_DOMAIN),
      roles: ['PILOT'],
      bio: 'Cessna 182 pilot. 2,400 PIC hours. Former banner-tow pilot.',
    },
    // AFF Instructors (3)
    {
      ...n(), email: makeEmail('laura', 'kimble', EMAIL_DOMAIN),
      roles: ['AFF_INSTRUCTOR'],
      bio: 'AFFI with 1,800 AFF jumps. Specializes in body-position drills and student confidence building.',
    },
    {
      ...n(), email: makeEmail('grant', 'fielding', EMAIL_DOMAIN),
      roles: ['AFF_INSTRUCTOR'],
      bio: 'AFFI and ground-school lead. 1,100 AFF jumps. Created the camp progression syllabus.',
    },
    {
      ...n(), email: makeEmail('nadia', 'wells', EMAIL_DOMAIN),
      roles: ['AFF_INSTRUCTOR'],
      bio: 'AFFI with 900 AFF jumps. Known for calm demeanor with anxious first-timers.',
    },
    // Coach
    {
      ...n(), email: makeEmail('derek', 'sato', EMAIL_DOMAIN),
      roles: ['COACH'],
      bio: 'Belly and canopy coach. Works with newly-licensed A and B jumpers on skills progression.',
    },
    // Rigger
    {
      ...n(), email: makeEmail('irene', 'voss', EMAIL_DOMAIN),
      roles: ['RIGGER'],
      bio: 'FAA Senior Rigger. Maintains the student rig fleet and handles all reserve repacks.',
    },
  ];

  // ============================================================================
  // ATHLETES (20 — heavy student mix)
  // ============================================================================
  const athletes: AthleteData[] = [];

  // AFF students (12) — 0-7 jumps, in the camp
  for (let i = 0; i < 12; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      roles: ['STUDENT'],
      jumpCount: Math.floor(Math.random() * 8), // 0-7
      weight: 140 + Math.floor(Math.random() * 60),
      walletBalance: Math.floor(Math.random() * 200),
      dateOfBirth: isoDate(randomDate(new Date(1990, 0), new Date(2006, 0))),
      emergencyContactName: `${pick(['Mom', 'Dad', 'Partner', 'Spouse'])} ${last}`,
      emergencyContactPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
    });
  }

  // A-license (5) — 25-40 jumps, recent graduates helping / continuing progression
  for (let i = 0; i < 5; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 25 + Math.floor(Math.random() * 16), // 25-40
      licenseType: 'A',
      licenseNumber: `A-${60000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 150),
      dateOfBirth: isoDate(randomDate(new Date(1988, 0), new Date(2004, 0))),
    });
  }

  // B-license (3) — 60-120 jumps, camp mentors and fun jumpers
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 60 + Math.floor(Math.random() * 61), // 60-120
      licenseType: 'B',
      licenseNumber: `B-${50000 + Math.floor(Math.random() * 10000)}`,
      weight: 140 + Math.floor(Math.random() * 70),
      walletBalance: Math.floor(Math.random() * 250),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2002, 0))),
    });
  }

  // ============================================================================
  // AIRCRAFT (1 — small Cessna 182)
  // ============================================================================
  const aircraft: AircraftData[] = [
    {
      registration: 'N182SC',
      type: 'Cessna 182 Skylane',
      maxCapacity: 4,
      maxWeight: 1406,
      emptyWeight: 794,
    },
  ];

  // ============================================================================
  // RIGS (10 — mostly student gear)
  // ============================================================================
  const rigs: RigData[] = [];

  // DZ-owned student rigs (6)
  for (let i = 0; i < 6; i++) {
    rigs.push(generateRig('STUDENT'));
  }

  // DZ-owned rental rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('RENTAL'));
  }

  // Personal sport rigs for B-license jumpers (2)
  for (let i = 0; i < 2; i++) {
    // ownerIndex points to B-license athletes (indices 17, 18, 19 — pick first two)
    rigs.push(generateRig('SPORT', 17 + i));
  }

  // ============================================================================
  // GEAR ITEMS (8 — student helmets and altimeters)
  // ============================================================================
  const gear = [
    // Student helmets (4)
    ...Array.from({ length: 4 }, () => ({
      type: 'HELMET',
      manufacturer: pick(['Cookie', 'Tonfly', 'Parasport']),
      model: pick(['G35', 'TFX', 'Z1']),
      serial: generateSerial('HLM'),
      status: 'APPROVED',
    })),
    // Student altimeters (4)
    ...Array.from({ length: 4 }, () => ({
      type: 'ALTIMETER',
      manufacturer: pick(['Altimaster', 'L&B', 'Dekunu']),
      model: pick(['Galaxy', 'Viso II+', 'One+']),
      serial: generateSerial('ALT'),
      status: 'APPROVED',
    })),
  ];

  // ============================================================================
  // LOADS (6 — small loads, mostly AFF, mixed status)
  // ============================================================================
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0);

  const loadStatuses = ['COMPLETE', 'COMPLETE', 'COMPLETE', 'LANDED', 'FILLING', 'OPEN'];

  const loads = Array.from({ length: 6 }, (_, i) => {
    const loadTime = new Date(baseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 30); // 30-min turn time for 182

    const slotsCount = 3 + Math.floor(Math.random() * 2); // 3-4 slots
    const athletePool = [...Array(athletes.length).keys()];

    const slots = Array.from({ length: Math.min(slotsCount, athletePool.length) }, () => {
      const athleteIdx = athletePool.splice(Math.floor(Math.random() * athletePool.length), 1)[0];
      const athlete = athletes[athleteIdx];
      const isStudent = athlete.roles?.includes('STUDENT');
      const jumpType = isStudent ? 'AFF' : (athlete.jumpCount < 50 ? 'COACH' : 'FUN_JUMP');
      return {
        athleteIndex: athleteIdx,
        jumpType,
        altitude: isStudent ? 14000 : pick([14000, 13500, 5500]),
        exitWeight: (athlete.weight || 170) + 25,
      };
    });

    return {
      loadNumber: i + 1,
      aircraftIndex: 0,
      status: loadStatuses[i],
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // ============================================================================
  // BOOGIE / EVENT
  // ============================================================================
  const boogies = [
    {
      name: 'AFF Progression Week',
      description: '5-day intensive AFF training camp. Ground school each morning, jump all afternoon. Goal: take students from Level 1 through solo status.',
      startDate: isoDate(daysFromNow(0)),
      endDate: isoDate(daysFromNow(4)),
      maxParticipants: 30,
      packages: [
        { name: 'Full Camp Pass', price: 1899, description: 'All 5 days, AFF levels 1-7, ground school, gear rental, video debrief' },
        { name: 'Weekend Starter', price: 849, description: 'Saturday & Sunday — AFF levels 1-3 with ground school' },
        { name: 'Single Day Drop-In', price: 399, description: 'One day of AFF training (level placement required)' },
      ],
    },
  ];

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'training-camp',
      name: 'Training Camp Week',
      description: 'DeLand AFF training camp with 1 Cessna 182, 8 staff, 20 athletes (12 students), small loads, conservative wind limits, and full ground-school operations.',
      tags: ['training', 'aff', 'student', 'small-aircraft', 'camp'],
      estimatedRecords: {
        users: 29, // 1 owner + 8 staff + 20 athletes
        aircraft: 1,
        loads: 6,
        slots: 21,
        rigs: 10,
        gearItems: 8,
        wallets: 20,
        waiverTemplates: WAIVER_TEMPLATES.length,
        bookingPackages: BOOKING_PACKAGES.length,
        incidents: 2,
        boogies: 1,
        jobPosts: 2,
        courses: COURSE_TEMPLATES.length,
        campaigns: 2,
      },
    },
    organizations: [
      {
        name: 'SkySchool Academy',
        slug: 'skyschool-academy',
        owner: {
          email: 'janet.cooper@demo.skylara.dev',
          firstName: 'Janet',
          lastName: 'Cooper',
          phone: '+13865550100',
        },
        dropzones: [
          {
            name: 'SkySchool DeLand',
            slug: 'skyschool-deland',
            icaoCode: 'KDED',
            latitude: 29.0667,
            longitude: -81.2833,
            timezone: 'America/New_York',
            windLimitKnots: 18,
            currency: 'USD',
            branches: [
              { name: 'Training Operations', isDefault: true },
            ],
            staff,
            athletes,
            aircraft,
            loads,
            gear,
            rigs,
            waiverTemplates: WAIVER_TEMPLATES,
            bookingPackages: BOOKING_PACKAGES,
            incidents: INCIDENT_TEMPLATES.slice(0, 2).map((t) => ({
              ...t,
              status: 'OPEN',
              reporterIndex: 0,
            })),
            boogies,
            jobPosts: JOB_TEMPLATES.slice(0, 2),
            courses: COURSE_TEMPLATES,
            campaigns: CAMPAIGN_TEMPLATES.slice(0, 2),
          },
        ],
      },
    ],
  };
}

// Helper to generate name pair
function n(): { firstName: string; lastName: string } {
  const { first, last } = uniqueName();
  return { firstName: first, lastName: last };
}
