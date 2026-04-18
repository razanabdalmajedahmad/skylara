/**
 * SCENARIO: Low-Connectivity Regional DZ
 *
 * "Outback Air Sports" — A small rural dropzone at Toogoolawah, QLD Australia.
 * Single Cessna 182 with VH- registration, minimal staff wearing multiple hats,
 * sparse mobile connectivity, and a mixed athlete base from D-license locals to
 * tandem walk-ins. This scenario exercises offline-first workflows, small-load
 * manifest, AUD currency, and Australian timezone handling.
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

export function buildLowConnectivityScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // STAFF (5 people — dual roles common at small DZs)
  // ============================================================================
  const staff: StaffData[] = [
    // DZ Manager
    {
      ...n(), email: makeEmail('bruce', 'callahan', EMAIL_DOMAIN),
      roles: ['DZ_MANAGER', 'SAFETY_OFFICER'],
      bio: 'Owner-operator. D-license, 5,200 jumps. Runs the DZ with a skeleton crew and a lot of heart.',
    },
    // Manifest + Pilot (dual role)
    {
      ...n(), email: makeEmail('shane', 'kerrigan', EMAIL_DOMAIN),
      roles: ['MANIFEST_STAFF', 'PILOT'],
      bio: 'Manifest and 182 pilot. 1,800 PIC hours. Handles load planning, weight & balance, then flies the plane.',
    },
    // Tandem Instructor
    {
      ...n(), email: makeEmail('mel', 'fraser', EMAIL_DOMAIN),
      roles: ['TANDEM_INSTRUCTOR'],
      bio: 'Lead TI. 3,400 tandems. Handles all tandem operations and video. Weekend warrior.',
    },
    // AFF Instructor
    {
      ...n(), email: makeEmail('damo', 'nguyen', EMAIL_DOMAIN),
      roles: ['AFF_INSTRUCTOR', 'COACH'],
      bio: 'AFFI and belly coach. 2,100 jumps. Also runs the wind sock and radio on busy days.',
    },
    // Rigger
    {
      ...n(), email: makeEmail('wendy', 'mitchell', EMAIL_DOMAIN),
      roles: ['RIGGER'],
      bio: 'APF-certified rigger. Maintains the small fleet and personal rigs for locals. Drives up from Brisbane on repack days.',
    },
  ];

  // ============================================================================
  // ATHLETES (15 — small rural community)
  // ============================================================================
  const athletes: AthleteData[] = [];

  // D-license locals (3) — the regulars
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 1000 + Math.floor(Math.random() * 3000),
      licenseType: 'D',
      licenseNumber: `D-${30000 + Math.floor(Math.random() * 10000)}`,
      weight: 150 + Math.floor(Math.random() * 50),
      walletBalance: Math.floor(Math.random() * 400),
      dateOfBirth: isoDate(randomDate(new Date(1975, 0), new Date(1995, 0))),
      emergencyContactName: `${pick(['Partner', 'Spouse', 'Mate'])} ${last}`,
      emergencyContactPhone: `+614${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
  }

  // C-license (3)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 200 + Math.floor(Math.random() * 300),
      licenseType: 'C',
      licenseNumber: `C-${40000 + Math.floor(Math.random() * 10000)}`,
      weight: 140 + Math.floor(Math.random() * 60),
      walletBalance: Math.floor(Math.random() * 250),
      dateOfBirth: isoDate(randomDate(new Date(1980, 0), new Date(2000, 0))),
    });
  }

  // B-license (3)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 50 + Math.floor(Math.random() * 100),
      licenseType: 'B',
      licenseNumber: `B-${50000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 70),
      walletBalance: Math.floor(Math.random() * 200),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2003, 0))),
    });
  }

  // A-license (3)
  for (let i = 0; i < 3; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 25 + Math.floor(Math.random() * 16),
      licenseType: 'A',
      licenseNumber: `A-${60000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 150),
      dateOfBirth: isoDate(randomDate(new Date(1990, 0), new Date(2005, 0))),
    });
  }

  // Tandem students (2) — weekend walk-ins
  for (let i = 0; i < 2; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 0,
      weight: 150 + Math.floor(Math.random() * 70),
      dateOfBirth: isoDate(randomDate(new Date(1988, 0), new Date(2006, 0))),
      emergencyContactName: `${pick(['Mum', 'Dad', 'Partner'])} ${last}`,
      emergencyContactPhone: `+614${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
  }

  // AFF student (1) — learning at this DZ
  {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first,
      lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      roles: ['STUDENT'],
      jumpCount: Math.floor(Math.random() * 5),
      weight: 140 + Math.floor(Math.random() * 50),
      walletBalance: Math.floor(Math.random() * 100),
      dateOfBirth: isoDate(randomDate(new Date(1993, 0), new Date(2005, 0))),
      emergencyContactName: `Mum ${last}`,
      emergencyContactPhone: `+614${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
  }

  // ============================================================================
  // AIRCRAFT (1 — Australian VH- registered Cessna 182)
  // ============================================================================
  const aircraft: AircraftData[] = [
    {
      registration: 'VH-OAS',
      type: 'Cessna 182 Skylane',
      maxCapacity: 4,
      maxWeight: 1406,
      emptyWeight: 794,
    },
  ];

  // ============================================================================
  // RIGS (6 — small fleet)
  // ============================================================================
  const rigs: RigData[] = [];

  // DZ-owned tandem rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // DZ-owned student rig (1)
  rigs.push(generateRig('STUDENT'));

  // DZ-owned rental rig (1)
  rigs.push(generateRig('RENTAL'));

  // Personal sport rigs for D-license locals (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('SPORT', i)); // ownerIndex 0, 1 = first two D-license athletes
  }

  // ============================================================================
  // GEAR ITEMS (6 — helmets and altimeters)
  // ============================================================================
  const gear = [
    // Helmets (3)
    ...Array.from({ length: 3 }, () => ({
      type: 'HELMET',
      manufacturer: pick(['Cookie', 'Tonfly', 'Parasport']),
      model: pick(['G35', 'TFX', 'Z1']),
      serial: generateSerial('HLM'),
      status: 'APPROVED',
    })),
    // Altimeters (3)
    ...Array.from({ length: 3 }, () => ({
      type: 'ALTIMETER',
      manufacturer: pick(['Altimaster', 'L&B', 'Dekunu']),
      model: pick(['Galaxy', 'Viso II+', 'One+']),
      serial: generateSerial('ALT'),
      status: 'APPROVED',
    })),
  ];

  // ============================================================================
  // LOADS (4 — small weekend loads)
  // ============================================================================
  const baseTime = new Date();
  baseTime.setHours(9, 0, 0, 0); // 9 AM start (laid-back regional schedule)

  const loadStatuses = ['COMPLETE', 'FILLING', 'OPEN', 'OPEN'];

  const loads = Array.from({ length: 4 }, (_, i) => {
    const loadTime = new Date(baseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 35); // 35-min turn time

    const slotsCount = 3 + Math.floor(Math.random() * 2); // 3-4 slots
    const athletePool = [...Array(athletes.length).keys()];

    const slots = Array.from({ length: Math.min(slotsCount, athletePool.length) }, () => {
      const athleteIdx = athletePool.splice(Math.floor(Math.random() * athletePool.length), 1)[0];
      const athlete = athletes[athleteIdx];
      const isStudent = athlete.roles?.includes('STUDENT');
      const isTandem = athlete.jumpCount === 0 && !isStudent;
      const jumpType = isTandem ? 'TANDEM' : (isStudent ? 'AFF' : (athlete.jumpCount < 50 ? 'COACH' : 'FUN_JUMP'));
      return {
        athleteIndex: athleteIdx,
        jumpType,
        altitude: isTandem || isStudent ? 14000 : pick([14000, 13500, 5500]),
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
      name: 'Outback Weekend',
      description: '2-day weekend boogie at Toogoolawah. Fun jumps, coached loads, and a Saturday night barbie. All license holders welcome.',
      startDate: isoDate(daysFromNow(14)),
      endDate: isoDate(daysFromNow(15)),
      maxParticipants: 20,
      packages: [
        { name: 'Weekend Pass', price: 99, description: 'Both days — unlimited fun jump manifesting, BBQ dinner Saturday' },
        { name: 'Day Pass', price: 59, description: 'Single day access' },
      ],
    },
  ];

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'low-connectivity',
      name: 'Low-Connectivity Regional DZ',
      description: 'Small rural Australian DZ at Toogoolawah with 1 Cessna 182 (VH-OAS), 5 dual-role staff, 15 athletes, sparse connectivity, AUD currency, and offline-first operations.',
      tags: ['regional', 'small', 'low-connectivity', 'australia', 'rural'],
      estimatedRecords: {
        users: 21, // 1 owner + 5 staff + 15 athletes
        aircraft: 1,
        loads: 4,
        slots: 14,
        rigs: 6,
        gearItems: 6,
        wallets: 15,
        waiverTemplates: WAIVER_TEMPLATES.length,
        bookingPackages: BOOKING_PACKAGES.length,
        incidents: 2,
        boogies: 1,
        jobPosts: 1,
        courses: 1,
        campaigns: 2,
      },
    },
    organizations: [
      {
        name: 'Outback Air Sports',
        slug: 'outback-air-sports',
        owner: {
          email: 'bruce.callahan@demo.skylara.dev',
          firstName: 'Bruce',
          lastName: 'Callahan',
          phone: '+61732550100',
        },
        dropzones: [
          {
            name: 'Outback Skydivers \u2014 Toogoolawah',
            slug: 'outback-toogoolawah',
            icaoCode: 'YTGL',
            latitude: -27.0986,
            longitude: 152.3814,
            timezone: 'Australia/Brisbane',
            windLimitKnots: 20,
            currency: 'AUD',
            branches: [
              { name: 'Main', isDefault: true },
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
            jobPosts: JOB_TEMPLATES.slice(0, 1),
            courses: COURSE_TEMPLATES.slice(0, 1),
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
