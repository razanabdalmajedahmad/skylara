/**
 * SCENARIO: Multi-Branch Organization
 *
 * "AeroJump International" — An enterprise org operating 2 dropzones
 * (DeLand, FL and Eloy, AZ) under a single owner. Each DZ has its own
 * staff, athletes, aircraft, loads, gear, rigs, branches, and events.
 *
 * This scenario tests multi-tenant data isolation across dropzones
 * within the same organization, branch-level segmentation, and
 * cross-DZ reporting capabilities.
 */

import {
  ScenarioData,
  StaffData,
  AthleteData,
  AircraftData,
  RigData,
  DropzoneData,
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

export function buildMultiBranchScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // DZ 1: AeroJump East — DeLand, FL
  // ============================================================================
  const eastDz = buildEastDz(EMAIL_DOMAIN);

  // ============================================================================
  // DZ 2: AeroJump West — Eloy, AZ
  // ============================================================================
  const westDz = buildWestDz(EMAIL_DOMAIN);

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'multi-branch',
      name: 'Multi-Branch Organization',
      description: 'Enterprise org with 2 dropzones (DeLand + Eloy), each with separate staff, athletes, aircraft, branches, and operations. Tests multi-tenant isolation within a single organization.',
      tags: ['multi-branch', 'multi-dz', 'enterprise', 'organization'],
      estimatedRecords: {
        users: 1 + (8 + 30) + (6 + 20), // owner + DZ1 staff/athletes + DZ2 staff/athletes
        aircraft: 2,
        loads: 6 + 4,
        slots: 60 + 40,
        rigs: 12 + 8,
        gearItems: 10 + 8,
        wallets: 30 + 20,
        waiverTemplates: WAIVER_TEMPLATES.length * 2,
        bookingPackages: BOOKING_PACKAGES.length * 2,
        incidents: 3 + 2,
        boogies: 2,
        jobPosts: 4 + 2,
        courses: 4 + 2,
        campaigns: 6 + 3,
      },
    },
    organizations: [
      {
        name: 'AeroJump International',
        slug: 'aerojump-international',
        owner: {
          email: 'richard.harmon@demo.skylara.dev',
          firstName: 'Richard',
          lastName: 'Harmon',
          phone: '+13865550100',
        },
        dropzones: [eastDz, westDz],
      },
    ],
  };
}

// ============================================================================
// DZ 1: AeroJump East — DeLand
// ============================================================================

function buildEastDz(emailDomain: string): DropzoneData {
  // --- Staff (8) ---
  const staff: StaffData[] = [
    { ...n(), email: makeEmail('dana', 'whitfield', emailDomain), roles: ['DZ_MANAGER', 'SAFETY_OFFICER'], bio: 'DZ Manager for AeroJump East. D-license, 3800 jumps. S&TA rated.' },
    { ...n(), email: makeEmail('pete', 'langley', emailDomain), roles: ['DZ_MANAGER'], bio: 'Operations Manager. Oversees manifest and daily scheduling.' },
    { ...n(), email: makeEmail('nina', 'rossi', emailDomain), roles: ['MANIFEST_STAFF'], bio: 'Lead manifest coordinator. Weekend and event operations.' },
    { ...n(), email: makeEmail('carl', 'ingram', emailDomain), roles: ['PILOT'], bio: 'Chief pilot. Grand Caravan type-rated. 5,200+ PIC hours.' },
    { ...n(), email: makeEmail('julia', 'vance', emailDomain), roles: ['TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR'], bio: 'Dual-rated TI/AFFI. 5,100 total jumps. Lead tandem instructor.' },
    { ...n(), email: makeEmail('derek', 'nash', emailDomain), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI with 3,200 tandems. Outside video specialist.' },
    { ...n(), email: makeEmail('tara', 'bloom', emailDomain), roles: ['AFF_INSTRUCTOR', 'COACH'], bio: 'AFFI and belly coach. 2,800 jumps. National competitor.' },
    { ...n(), email: makeEmail('victor', 'kane', emailDomain), roles: ['RIGGER'], bio: 'FAA Senior Rigger. Manages DZ fleet of 12 rigs plus customer repacks.' },
  ];

  // --- Athletes (30) ---
  const athletes: AthleteData[] = [];

  // D-license (10)
  for (let i = 0; i < 10; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
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

  // C-license (8)
  for (let i = 0; i < 8; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 200 + Math.floor(Math.random() * 300),
      licenseType: 'C',
      licenseNumber: `C-${40000 + Math.floor(Math.random() * 10000)}`,
      weight: 140 + Math.floor(Math.random() * 70),
      walletBalance: Math.floor(Math.random() * 300),
      dateOfBirth: isoDate(randomDate(new Date(1980, 0), new Date(2000, 0))),
    });
  }

  // B-license (5)
  for (let i = 0; i < 5; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 50 + Math.floor(Math.random() * 150),
      licenseType: 'B',
      licenseNumber: `B-${50000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 200),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2003, 0))),
    });
  }

  // A-license (4)
  for (let i = 0; i < 4; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 25 + Math.floor(Math.random() * 25),
      licenseType: 'A',
      licenseNumber: `A-${60000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 150),
      dateOfBirth: isoDate(randomDate(new Date(1990, 0), new Date(2005, 0))),
    });
  }

  // Tandem students (3)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 0,
      weight: 140 + Math.floor(Math.random() * 80),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2006, 0))),
    });
  }

  // --- Aircraft (1) ---
  const aircraft: AircraftData[] = [
    {
      registration: 'N208AJ',
      type: 'Cessna 208B Grand Caravan',
      maxCapacity: 15,
      maxWeight: 3980,
      emptyWeight: 2145,
    },
  ];

  // --- Rigs (12) ---
  const rigs: RigData[] = [];

  // DZ-owned tandem rigs (3)
  for (let i = 0; i < 3; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // DZ-owned student rigs (3)
  for (let i = 0; i < 3; i++) {
    rigs.push(generateRig('STUDENT'));
  }

  // DZ-owned rental rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('RENTAL'));
  }

  // Personal rigs for experienced jumpers (4)
  for (let i = 0; i < 4; i++) {
    rigs.push(generateRig('SPORT', i)); // ownerIndex 0-3 = first 4 D-license jumpers
  }

  // --- Loads (6) ---
  const eastBaseTime = new Date();
  eastBaseTime.setHours(8, 0, 0, 0);

  const loads = Array.from({ length: 6 }, (_, i) => {
    const loadTime = new Date(eastBaseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 30); // 30-min turn time

    const slotsCount = Math.floor(8 + Math.random() * 7);
    const athletePool = [...Array(athletes.length).keys()];

    const slots = Array.from({ length: Math.min(slotsCount, athletePool.length) }, () => {
      const athleteIdx = athletePool.splice(Math.floor(Math.random() * athletePool.length), 1)[0];
      const athlete = athletes[athleteIdx];
      const jumpTypes = athlete.jumpCount === 0 ? ['TANDEM'] :
                        (athlete.roles?.includes('STUDENT') ? ['AFF'] :
                        ['FUN_JUMP', 'FUN_JUMP', 'FUN_JUMP', 'COACH', 'HOP_POP']);
      return {
        athleteIndex: athleteIdx,
        jumpType: pick(jumpTypes),
        altitude: athlete.jumpCount === 0 ? 14000 : pick([14000, 13500, 13000, 5500]),
        exitWeight: (athlete.weight || 170) + 25,
      };
    });

    const statuses = ['COMPLETE', 'COMPLETE', 'COMPLETE', 'LANDED', 'FILLING', 'OPEN'];

    return {
      loadNumber: i + 1,
      aircraftIndex: 0,
      status: statuses[i] || 'OPEN',
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // --- Gear items (10) ---
  const gear = [
    // Helmets (4)
    ...Array.from({ length: 4 }, () => ({
      type: 'HELMET', manufacturer: pick(['Cookie', 'Tonfly', 'Parasport']),
      model: pick(['G4', 'G35', 'TFX', 'Z1']),
      serial: generateSerial('HLM'), status: 'APPROVED',
    })),
    // Altimeters (3)
    ...Array.from({ length: 3 }, () => ({
      type: 'ALTIMETER', manufacturer: pick(['Altimaster', 'L&B', 'Dekunu']),
      model: pick(['Galaxy', 'Viso II+', 'One+']),
      serial: generateSerial('ALT'), status: 'APPROVED',
    })),
    // Audibles (2)
    ...Array.from({ length: 2 }, () => ({
      type: 'AUDIBLE', manufacturer: pick(['L&B', 'Altimaster', 'AON2']),
      model: pick(['Solo II', 'Optima II', 'Brilliant Pebbles', 'X2']),
      serial: generateSerial('AUD'), status: 'APPROVED',
    })),
    // Jumpsuit (1)
    {
      type: 'SUIT', manufacturer: pick(['Tonfly', 'Bev Suits', 'Vertical']),
      model: pick(['Uno.630', 'Formation Suit', 'Freefly Suit']),
      serial: generateSerial('SUT'), status: 'APPROVED',
    },
  ];

  // --- Boogie ---
  const boogies = [
    {
      name: 'East Coast Freefly Festival',
      description: 'Three-day freefly and angle event featuring world-class organizers, tunnel sessions, and nightly socials at DeLand.',
      startDate: isoDate(daysFromNow(45)),
      endDate: isoDate(daysFromNow(47)),
      maxParticipants: 150,
      packages: [
        { name: 'Full Festival Pass', price: 179, description: 'All 3 days, unlimited organized jumps, evening events' },
        { name: 'Day Pass', price: 69, description: 'Single day access with organized jumps' },
      ],
    },
  ];

  // --- Incidents (3) ---
  const incidents = INCIDENT_TEMPLATES.slice(0, 3).map((t) => ({
    ...t,
    status: 'OPEN' as const,
    reporterIndex: 0,
  }));

  return {
    name: 'AeroJump East — DeLand',
    slug: 'aerojump-deland',
    icaoCode: 'KDED',
    latitude: 29.0667,
    longitude: -81.2833,
    timezone: 'America/New_York',
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
    incidents,
    boogies,
    jobPosts: JOB_TEMPLATES.slice(0, 4),
    courses: COURSE_TEMPLATES,
    campaigns: CAMPAIGN_TEMPLATES,
  };
}

// ============================================================================
// DZ 2: AeroJump West — Eloy
// ============================================================================

function buildWestDz(emailDomain: string): DropzoneData {
  // --- Staff (6) ---
  const staff: StaffData[] = [
    { ...n(), email: makeEmail('grant', 'meza', emailDomain), roles: ['DZ_MANAGER', 'SAFETY_OFFICER'], bio: 'DZ Manager for AeroJump West. D-license, 4100 jumps. Former competitor.' },
    { ...n(), email: makeEmail('lynn', 'frey', emailDomain), roles: ['MANIFEST_STAFF'], bio: 'Lead manifest and front desk. Keeps Eloy operations running smooth.' },
    { ...n(), email: makeEmail('hank', 'salazar', emailDomain), roles: ['PILOT'], bio: 'Chief pilot. PAC 750XL specialist. 3,800+ PIC hours.' },
    { ...n(), email: makeEmail('rachel', 'mccord', emailDomain), roles: ['TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR'], bio: 'Dual-rated TI/AFFI. 4,600 total jumps. Tandem program lead.' },
    { ...n(), email: makeEmail('omar', 'bishop', emailDomain), roles: ['TANDEM_INSTRUCTOR', 'COACH'], bio: 'TI and freefly coach. 2,900 tandems. Tunnel coaching certified.' },
    { ...n(), email: makeEmail('beth', 'pryor', emailDomain), roles: ['RIGGER'], bio: 'FAA Senior Rigger. Manages 8-rig fleet and customer service repacks.' },
  ];

  // --- Athletes (20) ---
  const athletes: AthleteData[] = [];

  // D-license (5)
  for (let i = 0; i < 5; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 500 + Math.floor(Math.random() * 4500),
      licenseType: 'D',
      licenseNumber: `D-${31000 + Math.floor(Math.random() * 10000)}`,
      weight: 150 + Math.floor(Math.random() * 60),
      walletBalance: Math.floor(Math.random() * 500),
      dateOfBirth: isoDate(randomDate(new Date(1970, 0), new Date(1995, 0))),
      emergencyContactName: `${pick(['Mom', 'Dad', 'Partner', 'Spouse'])} ${last}`,
      emergencyContactPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
    });
  }

  // C-license (5)
  for (let i = 0; i < 5; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 200 + Math.floor(Math.random() * 300),
      licenseType: 'C',
      licenseNumber: `C-${41000 + Math.floor(Math.random() * 10000)}`,
      weight: 140 + Math.floor(Math.random() * 70),
      walletBalance: Math.floor(Math.random() * 300),
      dateOfBirth: isoDate(randomDate(new Date(1980, 0), new Date(2000, 0))),
    });
  }

  // B-license (4)
  for (let i = 0; i < 4; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 50 + Math.floor(Math.random() * 150),
      licenseType: 'B',
      licenseNumber: `B-${51000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 200),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2003, 0))),
    });
  }

  // A-license (3)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 25 + Math.floor(Math.random() * 25),
      licenseType: 'A',
      licenseNumber: `A-${61000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 150),
      dateOfBirth: isoDate(randomDate(new Date(1990, 0), new Date(2005, 0))),
    });
  }

  // Tandem students (3)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, emailDomain),
      jumpCount: 0,
      weight: 140 + Math.floor(Math.random() * 80),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2006, 0))),
    });
  }

  // --- Aircraft (1) ---
  const aircraft: AircraftData[] = [
    {
      registration: 'N750AJ',
      type: 'PAC 750XL',
      maxCapacity: 16,
      maxWeight: 3402,
      emptyWeight: 1406,
    },
  ];

  // --- Rigs (8) ---
  const rigs: RigData[] = [];

  // DZ-owned tandem rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // DZ-owned student rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('STUDENT'));
  }

  // DZ-owned rental rigs (1)
  rigs.push(generateRig('RENTAL'));

  // Personal rigs for experienced jumpers (3)
  for (let i = 0; i < 3; i++) {
    rigs.push(generateRig('SPORT', i)); // ownerIndex 0-2 = first 3 D-license jumpers
  }

  // --- Loads (4) ---
  const westBaseTime = new Date();
  westBaseTime.setHours(7, 0, 0, 0); // Arizona starts early to beat the heat

  const loads = Array.from({ length: 4 }, (_, i) => {
    const loadTime = new Date(westBaseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 30);

    const slotsCount = Math.floor(8 + Math.random() * 8);
    const athletePool = [...Array(athletes.length).keys()];

    const slots = Array.from({ length: Math.min(slotsCount, athletePool.length) }, () => {
      const athleteIdx = athletePool.splice(Math.floor(Math.random() * athletePool.length), 1)[0];
      const athlete = athletes[athleteIdx];
      const jumpTypes = athlete.jumpCount === 0 ? ['TANDEM'] :
                        (athlete.roles?.includes('STUDENT') ? ['AFF'] :
                        ['FUN_JUMP', 'FUN_JUMP', 'FUN_JUMP', 'COACH', 'HOP_POP']);
      return {
        athleteIndex: athleteIdx,
        jumpType: pick(jumpTypes),
        altitude: athlete.jumpCount === 0 ? 14000 : pick([14000, 13500, 13000, 5500]),
        exitWeight: (athlete.weight || 170) + 25,
      };
    });

    const statuses = ['COMPLETE', 'COMPLETE', 'FILLING', 'OPEN'];

    return {
      loadNumber: i + 1,
      aircraftIndex: 0,
      status: statuses[i] || 'OPEN',
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // --- Gear items (8) ---
  const gear = [
    // Helmets (3)
    ...Array.from({ length: 3 }, () => ({
      type: 'HELMET', manufacturer: pick(['Cookie', 'Tonfly', 'Parasport']),
      model: pick(['G4', 'G35', 'TFX', 'Z1']),
      serial: generateSerial('HLM'), status: 'APPROVED',
    })),
    // Altimeters (2)
    ...Array.from({ length: 2 }, () => ({
      type: 'ALTIMETER', manufacturer: pick(['Altimaster', 'L&B', 'Dekunu']),
      model: pick(['Galaxy', 'Viso II+', 'One+']),
      serial: generateSerial('ALT'), status: 'APPROVED',
    })),
    // Audibles (2)
    ...Array.from({ length: 2 }, () => ({
      type: 'AUDIBLE', manufacturer: pick(['L&B', 'Altimaster', 'AON2']),
      model: pick(['Solo II', 'Optima II', 'Brilliant Pebbles', 'X2']),
      serial: generateSerial('AUD'), status: 'APPROVED',
    })),
    // Jumpsuit (1)
    {
      type: 'SUIT', manufacturer: pick(['Tonfly', 'Bev Suits', 'Vertical']),
      model: pick(['Uno.630', 'Formation Suit', 'Freefly Suit']),
      serial: generateSerial('SUT'), status: 'APPROVED',
    },
  ];

  // --- Boogie ---
  const boogies = [
    {
      name: 'Desert Sunset Boogie',
      description: 'Two-day desert boogie with sunset loads, formation and freefly organizers, and poolside after-party at Eloy.',
      startDate: isoDate(daysFromNow(60)),
      endDate: isoDate(daysFromNow(61)),
      maxParticipants: 80,
      packages: [
        { name: 'Full Boogie Pass', price: 129, description: 'Both days, unlimited organized jumps, evening events' },
        { name: 'Day Pass', price: 59, description: 'Single day access' },
      ],
    },
  ];

  // --- Incidents (2) ---
  const incidents = INCIDENT_TEMPLATES.slice(0, 2).map((t) => ({
    ...t,
    status: 'OPEN' as const,
    reporterIndex: 0,
  }));

  return {
    name: 'AeroJump West — Eloy',
    slug: 'aerojump-eloy',
    icaoCode: 'KE60',
    latitude: 32.8067,
    longitude: -111.5867,
    timezone: 'America/Phoenix',
    windLimitKnots: 25,
    currency: 'USD',
    branches: [
      { name: 'Main Operations', isDefault: true },
      { name: 'Events', isDefault: false },
    ],
    staff,
    athletes,
    aircraft,
    loads,
    gear,
    rigs,
    waiverTemplates: WAIVER_TEMPLATES,
    bookingPackages: BOOKING_PACKAGES,
    incidents,
    boogies,
    jobPosts: JOB_TEMPLATES.slice(0, 2),
    courses: COURSE_TEMPLATES.slice(0, 2),
    campaigns: CAMPAIGN_TEMPLATES.slice(0, 3),
  };
}

// Helper to generate name pair
function n(): { firstName: string; lastName: string } {
  const { first, last } = uniqueName();
  return { firstName: first, lastName: last };
}
