/**
 * SCENARIO: High-Volume Turbine DZ
 *
 * "SkyReach Aviation" — A busy Perris-style turbine DZ running 2 aircraft
 * (Grand Caravan + Twin Otter) with 80+ athletes, 15 staff, full manifest
 * operations, gear shop, tandem program, AFF school, coaching, and events.
 *
 * This is the most comprehensive scenario: it touches every module.
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
  MAIN_CANOPY_BRANDS,
  CONTAINER_BRANDS,
} from './types';

export function buildTurbineDzScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // STAFF (15 people)
  // ============================================================================
  const staff: StaffData[] = [
    // DZ Management
    { ...n(), email: makeEmail('rick', 'vargas', EMAIL_DOMAIN), roles: ['DZ_MANAGER', 'SAFETY_OFFICER'], bio: 'DZ Manager since 2018. D-license, 4200 jumps. S&TA rated.' },
    { ...n(), email: makeEmail('karen', 'ostrowski', EMAIL_DOMAIN), roles: ['DZ_MANAGER'], bio: 'Operations Manager. Handles scheduling, staff, and customer service.' },
    // Manifest
    { ...n(), email: makeEmail('jess', 'turner', EMAIL_DOMAIN), roles: ['MANIFEST_STAFF'], bio: 'Lead manifest. 3 years experience on SkyLara platform.' },
    { ...n(), email: makeEmail('dave', 'reeves', EMAIL_DOMAIN), roles: ['MANIFEST_STAFF', 'FRONT_DESK'], bio: 'Weekend manifest and front desk.' },
    // Pilots
    { ...n(), email: makeEmail('capt.tony', 'briggs', EMAIL_DOMAIN), roles: ['PILOT'], bio: 'Chief pilot. Twin Otter & Caravan type-rated. 8,000+ PIC hours.' },
    { ...n(), email: makeEmail('anna', 'petrova', EMAIL_DOMAIN), roles: ['PILOT'], bio: 'Caravan pilot. 2,100 PIC hours. Former aerial survey pilot.' },
    // Tandem Instructors
    { ...n(), email: makeEmail('marcus', 'stone', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR', 'CAMERA_COACH'], bio: 'Lead TI. 6,000+ tandems. Outside video specialist.' },
    { ...n(), email: makeEmail('sofia', 'delgado', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI with 2,500 tandems. Bilingual English/Spanish.' },
    { ...n(), email: makeEmail('ryan', 'holt', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR'], bio: 'Dual-rated TI/AFFI. 4,800 total jumps.' },
    // AFF Instructors
    { ...n(), email: makeEmail('kenji', 'tanaka', EMAIL_DOMAIN), roles: ['AFF_INSTRUCTOR'], bio: 'AFFI with 1,200 AFF jumps. Specializes in nervous first-timers.' },
    { ...n(), email: makeEmail('elena', 'ross', EMAIL_DOMAIN), roles: ['AFF_INSTRUCTOR', 'COACH'], bio: 'AFFI and freefly coach. National 4-way competitor.' },
    // Coaches
    { ...n(), email: makeEmail('kai', 'jensen', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Freefly and angle coach. 3,500 jumps. Tunnel instructor certified.' },
    { ...n(), email: makeEmail('amara', 'diallo', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Formation skydiving coach. 4-way and 8-way teams.' },
    // Rigger
    { ...n(), email: makeEmail('phil', 'novak', EMAIL_DOMAIN), roles: ['RIGGER'], bio: 'FAA Master Rigger. 15 years experience. Manages 45-rig fleet.' },
    // Camera / Front Desk
    { ...n(), email: makeEmail('zoe', 'lambert', EMAIL_DOMAIN), roles: ['CAMERA_COACH', 'FRONT_DESK'], bio: 'Camera flyer and front desk coordinator.' },
  ];

  // ============================================================================
  // ATHLETES (80 jumpers — mix of experience levels)
  // ============================================================================
  const athletes: AthleteData[] = [];

  // D-license experienced (20)
  for (let i = 0; i < 20; i++) {
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

  // C-license intermediate (15)
  for (let i = 0; i < 15; i++) {
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

  // B-license (15)
  for (let i = 0; i < 15; i++) {
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

  // A-license new jumpers (15)
  for (let i = 0; i < 15; i++) {
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

  // AFF students (10)
  for (let i = 0; i < 10; i++) {
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

  // Tandem students (5 — today's walk-ins)
  for (let i = 0; i < 5; i++) {
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
  // AIRCRAFT (2)
  // ============================================================================
  const aircraft: AircraftData[] = [
    {
      registration: 'N208SR',
      type: 'Cessna 208B Grand Caravan',
      maxCapacity: 15,
      maxWeight: 3980,
      emptyWeight: 2145,
    },
    {
      registration: 'N367TO',
      type: 'de Havilland DHC-6 Twin Otter',
      maxCapacity: 22,
      maxWeight: 5670,
      emptyWeight: 3363,
    },
  ];

  // ============================================================================
  // RIGS (30 — mix of personal and DZ-owned)
  // ============================================================================
  const rigs: RigData[] = [];

  // DZ-owned tandem rigs (6)
  for (let i = 0; i < 6; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // DZ-owned student rigs (5)
  for (let i = 0; i < 5; i++) {
    rigs.push(generateRig('STUDENT'));
  }

  // DZ-owned rental rigs (4)
  for (let i = 0; i < 4; i++) {
    rigs.push(generateRig('RENTAL'));
  }

  // Personal rigs for experienced jumpers (15)
  for (let i = 0; i < 15; i++) {
    rigs.push(generateRig('SPORT', i)); // ownerIndex 0-14 = first 15 D/C license jumpers
  }

  // ============================================================================
  // LOADS (12 — Saturday operations)
  // ============================================================================
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0); // 8:00 AM start

  const loads = Array.from({ length: 12 }, (_, i) => {
    const acIdx = i % 2; // alternate aircraft
    const loadTime = new Date(baseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 25); // 25-min turn time

    const slotsCount = acIdx === 0 ? Math.floor(8 + Math.random() * 7) : Math.floor(12 + Math.random() * 10);
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

    const statuses = ['COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE',
                      'COMPLETE', 'COMPLETE', 'LANDED', 'AIRBORNE', 'LOCKED',
                      'FILLING', 'OPEN'];

    return {
      loadNumber: i + 1,
      aircraftIndex: acIdx,
      status: statuses[i] || 'OPEN',
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // ============================================================================
  // GEAR ITEMS (helmets, altimeters, audibles)
  // ============================================================================
  const gear = [
    // DZ-owned helmets
    ...Array.from({ length: 8 }, (_, i) => ({
      type: 'HELMET', manufacturer: pick(['Cookie', 'Tonfly', 'Parasport']),
      model: pick(['G4', 'G35', 'TFX', 'Z1']),
      serial: generateSerial('HLM'), status: 'APPROVED',
    })),
    // DZ-owned altimeters
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'ALTIMETER', manufacturer: pick(['Altimaster', 'L&B', 'Dekunu']),
      model: pick(['Galaxy', 'Viso II+', 'One+']),
      serial: generateSerial('ALT'), status: 'APPROVED',
    })),
    // DZ-owned audibles
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'AUDIBLE', manufacturer: pick(['L&B', 'Altimaster', 'AON2']),
      model: pick(['Solo II', 'Optima II', 'Brilliant Pebbles', 'X2']),
      serial: generateSerial('AUD'), status: 'APPROVED',
    })),
    // DZ jumpsuits
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'SUIT', manufacturer: pick(['Tonfly', 'Bev Suits', 'Vertical']),
      model: pick(['Uno.630', 'Formation Suit', 'Freefly Suit']),
      serial: generateSerial('SUT'), status: 'APPROVED',
    })),
  ];

  // ============================================================================
  // BOOGIES & EVENTS
  // ============================================================================
  const boogies = [
    {
      name: 'Spring Fling Boogie 2026',
      description: 'Annual spring boogie with world-class organizers. Freefly, formation, angle, and wingsuit. Nightly parties and awards.',
      startDate: isoDate(daysFromNow(30)),
      endDate: isoDate(daysFromNow(34)),
      maxParticipants: 250,
      packages: [
        { name: 'Full Boogie Pass', price: 199, description: 'All 5 days, unlimited organized jumps, evening events' },
        { name: 'Weekend Pass', price: 129, description: 'Saturday & Sunday access' },
        { name: 'Day Pass', price: 49, description: 'Single day access' },
      ],
    },
    {
      name: 'Night Jumps — Full Moon',
      description: 'Licensed jumpers only (C+). Night jump series under the full moon with illuminated landing area. Max 2 loads.',
      startDate: isoDate(daysFromNow(15)),
      endDate: isoDate(daysFromNow(15)),
      maxParticipants: 40,
      packages: [
        { name: 'Night Jump Ticket', price: 55, description: 'One night jump + glow stick kit' },
      ],
    },
  ];

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'turbine-dz',
      name: 'High-Volume Turbine DZ',
      description: 'Busy Perris-style DZ with 2 aircraft, 80+ athletes, full staff, tandem/AFF/sport operations, gear fleet, events, and all modules populated.',
      tags: ['turbine', 'high-volume', 'tandem', 'aff', 'sport', 'full-demo'],
      estimatedRecords: {
        users: 96, // 1 owner + 15 staff + 80 athletes
        aircraft: 2,
        loads: 12,
        slots: 120,
        rigs: 30,
        gearItems: 24,
        wallets: 80,
        waiverTemplates: WAIVER_TEMPLATES.length,
        bookingPackages: BOOKING_PACKAGES.length,
        incidents: INCIDENT_TEMPLATES.length,
        boogies: 2,
        jobPosts: JOB_TEMPLATES.length,
        courses: COURSE_TEMPLATES.length,
        campaigns: CAMPAIGN_TEMPLATES.length,
      },
    },
    organizations: [
      {
        name: 'SkyReach Aviation Group',
        slug: 'skyreach-aviation',
        owner: {
          email: `owner@${EMAIL_DOMAIN}`,
          firstName: 'Marcus',
          lastName: 'Reeves',
          phone: '+14155550100',
        },
        dropzones: [
          {
            name: 'SkyReach DZ — Perris',
            slug: 'skyreach-perris',
            icaoCode: 'KPRZ',
            latitude: 33.7672,
            longitude: -117.2157,
            timezone: 'America/Los_Angeles',
            windLimitKnots: 25,
            currency: 'USD',
            branches: [
              { name: 'Main Operations', isDefault: true },
              { name: 'Tandem Center', isDefault: false },
            ],
            staff,
            athletes,
            aircraft,
            loads,
            gear,
            rigs,
            waiverTemplates: WAIVER_TEMPLATES,
            bookingPackages: BOOKING_PACKAGES,
            incidents: INCIDENT_TEMPLATES.map((t, i) => ({ ...t, status: i === 0 ? 'CLOSED' : 'OPEN', reporterIndex: 0 })),
            boogies,
            jobPosts: JOB_TEMPLATES,
            courses: COURSE_TEMPLATES,
            campaigns: CAMPAIGN_TEMPLATES,
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
