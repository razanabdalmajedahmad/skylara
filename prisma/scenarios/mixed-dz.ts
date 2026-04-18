/**
 * SCENARIO: Mixed Sport + Student DZ
 *
 * "Desert Skydivers Inc" — A balanced Eloy-style DZ running 1 PAC 750XL
 * with a mix of AFF student training and sport jumping operations. Strong
 * student pipeline alongside experienced sport jumpers in a desert setting.
 *
 * This scenario demonstrates a mid-size DZ balancing training and sport.
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
  generateTailNumber,
  generateSerial,
  generateRig,
  pick,
  pickN,
  daysFromNow,
  daysAgo,
  isoDate,
  randomDate,
  AIRCRAFT_TYPES,
  BOOKING_PACKAGES,
  WAIVER_TEMPLATES,
  INCIDENT_TEMPLATES,
  JOB_TEMPLATES,
  COURSE_TEMPLATES,
  CAMPAIGN_TEMPLATES,
} from './types';

export function buildMixedDzScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // STAFF (10 people)
  // ============================================================================
  const staff: StaffData[] = [
    // DZ Manager
    { ...n(), email: makeEmail('lisa', 'cortez', EMAIL_DOMAIN), roles: ['DZ_MANAGER'], bio: 'DZ Manager for 6 years. D-license, 3,100 jumps. Oversees all operations.' },
    // Manifest
    { ...n(), email: makeEmail('chris', 'nagel', EMAIL_DOMAIN), roles: ['MANIFEST_STAFF'], bio: 'Lead manifest and scheduling. 4 years on SkyLara platform.' },
    // Pilot
    { ...n(), email: makeEmail('pete', 'hawkins', EMAIL_DOMAIN), roles: ['PILOT'], bio: 'Chief pilot. PAC 750XL type-rated. 5,500+ PIC hours. Former bush pilot.' },
    // AFF Instructors (2)
    { ...n(), email: makeEmail('maria', 'vega', EMAIL_DOMAIN), roles: ['AFF_INSTRUCTOR'], bio: 'Lead AFFI. 1,800 AFF jumps. Specializes in progression coaching.' },
    { ...n(), email: makeEmail('derek', 'shaw', EMAIL_DOMAIN), roles: ['AFF_INSTRUCTOR'], bio: 'AFFI with 900 AFF jumps. Patient with first-time students.' },
    // Coaches (2)
    { ...n(), email: makeEmail('tara', 'beck', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Freefly and belly coach. 2,800 jumps. Tunnel instructor certified.' },
    { ...n(), email: makeEmail('jamal', 'price', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Formation skydiving coach. 4-way competitor. 3,200 jumps.' },
    // Tandem Instructor
    { ...n(), email: makeEmail('nick', 'ramos', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI with 3,400 tandems. Weekend tandem lead.' },
    // Rigger
    { ...n(), email: makeEmail('glen', 'torres', EMAIL_DOMAIN), roles: ['RIGGER'], bio: 'FAA Senior Rigger. 10 years experience. Manages 15-rig fleet.' },
    // Front Desk
    { ...n(), email: makeEmail('amy', 'lin', EMAIL_DOMAIN), roles: ['FRONT_DESK'], bio: 'Front desk and check-in coordinator. First point of contact for students.' },
  ];

  // ============================================================================
  // ATHLETES (40 jumpers — balanced mix of sport and student)
  // ============================================================================
  const athletes: AthleteData[] = [];

  // D-license experienced (8)
  for (let i = 0; i < 8; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 500 + Math.floor(Math.random() * 4500),
      licenseType: 'D',
      licenseNumber: `D-${30000 + Math.floor(Math.random() * 10000)}`,
      weight: 150 + Math.floor(Math.random() * 60),
      walletBalance: Math.floor(Math.random() * 500),
      dateOfBirth: isoDate(randomDate(new Date(1970, 0), new Date(1995, 0))),
      emergencyContactName: `${pick(['Mom', 'Dad', 'Partner', 'Spouse'])} ${last}`,
      emergencyContactPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
    });
  }

  // C-license intermediate (8)
  for (let i = 0; i < 8; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 200 + Math.floor(Math.random() * 300),
      licenseType: 'C',
      licenseNumber: `C-${40000 + Math.floor(Math.random() * 10000)}`,
      weight: 140 + Math.floor(Math.random() * 70),
      walletBalance: Math.floor(Math.random() * 300),
      dateOfBirth: isoDate(randomDate(new Date(1980, 0), new Date(2000, 0))),
    });
  }

  // B-license (8)
  for (let i = 0; i < 8; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 50 + Math.floor(Math.random() * 150),
      licenseType: 'B',
      licenseNumber: `B-${50000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 200),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2003, 0))),
    });
  }

  // A-license new jumpers (8)
  for (let i = 0; i < 8; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 25 + Math.floor(Math.random() * 25),
      licenseType: 'A',
      licenseNumber: `A-${60000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 150),
      dateOfBirth: isoDate(randomDate(new Date(1990, 0), new Date(2005, 0))),
    });
  }

  // AFF students (5)
  for (let i = 0; i < 5; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      roles: ['STUDENT'],
      jumpCount: Math.floor(Math.random() * 8),
      weight: 140 + Math.floor(Math.random() * 60),
      walletBalance: Math.floor(Math.random() * 100),
      dateOfBirth: isoDate(randomDate(new Date(1990, 0), new Date(2006, 0))),
    });
  }

  // Tandem students (3 — today's walk-ins)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 0,
      weight: 140 + Math.floor(Math.random() * 80),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2006, 0))),
    });
  }

  // ============================================================================
  // AIRCRAFT (1)
  // ============================================================================
  const aircraft: AircraftData[] = [
    {
      registration: 'N750DS',
      type: 'PAC 750XL',
      maxCapacity: 16,
      maxWeight: 3402,
      emptyWeight: 1406,
    },
  ];

  // ============================================================================
  // RIGS (15 — mix of DZ-owned and personal)
  // ============================================================================
  const rigs: RigData[] = [];

  // DZ-owned student rigs (3)
  for (let i = 0; i < 3; i++) {
    rigs.push(generateRig('STUDENT'));
  }

  // DZ-owned tandem rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // DZ-owned rental rigs (3)
  for (let i = 0; i < 3; i++) {
    rigs.push(generateRig('RENTAL'));
  }

  // Personal rigs for experienced jumpers (7)
  for (let i = 0; i < 7; i++) {
    rigs.push(generateRig('SPORT', i)); // ownerIndex 0-6 = first 7 D/C license jumpers
  }

  // ============================================================================
  // LOADS (8 — mix of student and sport loads)
  // ============================================================================
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0); // 8:00 AM start

  const loads = Array.from({ length: 8 }, (_, i) => {
    const loadTime = new Date(baseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 25); // 25-min turn time

    const slotsCount = Math.floor(8 + Math.random() * 8); // 8-15 slots per load
    const athletePool = [...Array(athletes.length).keys()];

    const slots = Array.from({ length: Math.min(slotsCount, athletePool.length) }, (_, j) => {
      const athleteIdx = athletePool.splice(Math.floor(Math.random() * athletePool.length), 1)[0];
      const athlete = athletes[athleteIdx];
      const jumpTypes = athlete.jumpCount === 0 ? ['TANDEM'] :
                        (athlete.roles?.includes('STUDENT') ? ['AFF'] :
                        ['FUN_JUMP', 'FUN_JUMP', 'FUN_JUMP', 'COACH', 'HOP_POP']);
      return {
        athleteIndex: athleteIdx,
        jumpType: pick(jumpTypes),
        altitude: athlete.jumpCount === 0 ? 14000 : pick([14000, 13500, 13000, 5500]),
        exitWeight: (athlete.weight || 170) + 25, // gear weight
      };
    });

    const statuses = ['COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE',
                      'LANDED', 'AIRBORNE', 'LOCKED', 'FILLING'];

    return {
      loadNumber: i + 1,
      aircraftIndex: 0, // single aircraft
      status: statuses[i] || 'OPEN',
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // ============================================================================
  // GEAR ITEMS (12 — helmets, altimeters, audibles)
  // ============================================================================
  const gear = [
    // DZ-owned helmets
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'HELMET', manufacturer: pick(['Cookie', 'Tonfly', 'Parasport']),
      model: pick(['G4', 'G35', 'TFX', 'Z1']),
      serial: generateSerial('HLM'), status: 'APPROVED',
    })),
    // DZ-owned altimeters
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'ALTIMETER', manufacturer: pick(['Altimaster', 'L&B', 'Dekunu']),
      model: pick(['Galaxy', 'Viso II+', 'One+']),
      serial: generateSerial('ALT'), status: 'APPROVED',
    })),
    // DZ-owned audibles
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'AUDIBLE', manufacturer: pick(['L&B', 'Altimaster', 'AON2']),
      model: pick(['Solo II', 'Optima II', 'Brilliant Pebbles', 'X2']),
      serial: generateSerial('AUD'), status: 'APPROVED',
    })),
  ];

  // ============================================================================
  // BOOGIES & EVENTS
  // ============================================================================
  const boogies = [
    {
      name: 'Desert Skills Camp',
      description: 'Three-day skills camp with world-class coaches. AFF progression, belly, freefly, and canopy courses. Desert sunsets and evening debriefs.',
      startDate: isoDate(daysFromNow(21)),
      endDate: isoDate(daysFromNow(23)),
      maxParticipants: 80,
      packages: [
        { name: 'Full Camp Pass', price: 249, description: 'All 3 days, unlimited coached jumps, evening events' },
        { name: 'Day Pass', price: 99, description: 'Single day access with coached jumps' },
      ],
    },
  ];

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'mixed-dz',
      name: 'Mixed Sport + Student DZ',
      description: 'Balanced Eloy-style DZ with 1 PAC 750XL, 40 athletes, AFF student training and sport jumping, gear fleet, desert operations, and training-focused events.',
      tags: ['mixed', 'student', 'aff', 'sport', 'desert'],
      estimatedRecords: {
        users: 51, // 1 owner + 10 staff + 40 athletes
        aircraft: 1,
        loads: 8,
        slots: 80,
        rigs: 15,
        gearItems: 12,
        wallets: 40,
        waiverTemplates: WAIVER_TEMPLATES.length,
        bookingPackages: BOOKING_PACKAGES.length,
        incidents: INCIDENT_TEMPLATES.length,
        boogies: 1,
        jobPosts: 3,
        courses: 2,
        campaigns: 4,
      },
    },
    organizations: [
      {
        name: 'Desert Skydivers Inc',
        slug: 'desert-skydivers',
        owner: {
          email: 'frank.reilly@demo.skylara.dev',
          firstName: 'Frank',
          lastName: 'Reilly',
          phone: '+14805550100',
        },
        dropzones: [
          {
            name: 'Desert Skydivers — Eloy',
            slug: 'desert-skydivers-eloy',
            icaoCode: 'KE60',
            latitude: 32.8067,
            longitude: -111.5867,
            timezone: 'America/Phoenix',
            windLimitKnots: 30,
            currency: 'USD',
            branches: [
              { name: 'Main Operations', isDefault: true },
              { name: 'Student Training Center', isDefault: false },
            ],
            staff,
            athletes,
            aircraft,
            loads,
            gear,
            rigs,
            waiverTemplates: WAIVER_TEMPLATES,
            bookingPackages: BOOKING_PACKAGES,
            incidents: INCIDENT_TEMPLATES.map((t, i) => ({ ...t, status: i % 2 === 0 ? 'OPEN' : 'CLOSED', reporterIndex: 0 })),
            boogies,
            jobPosts: JOB_TEMPLATES.slice(0, 3),
            courses: COURSE_TEMPLATES.slice(0, 2),
            campaigns: CAMPAIGN_TEMPLATES.slice(0, 4),
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
