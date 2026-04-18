/**
 * SCENARIO: Premium Tandem-Focused DZ
 *
 * "SkyVenture Florida" — A high-volume tandem factory in DeLand, FL running
 * a single Grand Caravan. 90% of revenue comes from tandem operations with
 * 4 dedicated tandem instructors, a camera coach, and a steady stream of
 * first-time students. A small cadre of fun jumpers rounds out the manifest.
 *
 * This scenario focuses on tandem-heavy operations with tourist clientele.
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

export function buildTandemDzScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // STAFF (8 people)
  // ============================================================================
  const staff: StaffData[] = [
    // DZ Manager
    { ...n(), email: makeEmail('diana', 'marsh', EMAIL_DOMAIN), roles: ['DZ_MANAGER'], bio: 'DZ Manager and owner. 15 years in the sport. Runs the tightest tandem operation in Florida.' },
    // Manifest
    { ...n(), email: makeEmail('brett', 'collins', EMAIL_DOMAIN), roles: ['MANIFEST_STAFF'], bio: 'Lead manifest. Keeps the Caravan turning and the tandem pipeline flowing.' },
    // Pilot
    { ...n(), email: makeEmail('capt.rico', 'alvarez', EMAIL_DOMAIN), roles: ['PILOT'], bio: 'Chief pilot. Caravan type-rated. 5,200+ PIC hours. Former bush pilot.' },
    // Tandem Instructors (4)
    { ...n(), email: makeEmail('derek', 'nash', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'Lead TI. 8,000+ tandems. Known for calming nervous first-timers.' },
    { ...n(), email: makeEmail('tanya', 'price', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI with 3,200 tandems. Bilingual English/Portuguese.' },
    { ...n(), email: makeEmail('jason', 'bell', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI with 2,800 tandems. Weekend warrior turned full-time.' },
    { ...n(), email: makeEmail('kristen', 'fox', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI with 1,500 tandems. Former competitive gymnast.' },
    // Camera Coach
    { ...n(), email: makeEmail('leo', 'voss', EMAIL_DOMAIN), roles: ['CAMERA_COACH'], bio: 'Outside video specialist. 4,000+ camera jumps. Produces all tandem media packages.' },
  ];

  // ============================================================================
  // ATHLETES (25 — 20 tandem students + 5 fun jumpers)
  // ============================================================================
  const athletes: AthleteData[] = [];

  // Tandem students (20 — today's bookings, no license, 0 jumps)
  for (let i = 0; i < 20; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 0,
      weight: 140 + Math.floor(Math.random() * 80),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2006, 0))),
    });
  }

  // Fun jumpers (5 — B/C license regulars with low jump counts)
  for (let i = 0; i < 5; i++) {
    const { first, last } = uniqueName();
    const license = pick(['B', 'C']);
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 50 + Math.floor(Math.random() * 200),
      licenseType: license,
      licenseNumber: `${license}-${40000 + Math.floor(Math.random() * 10000)}`,
      weight: 140 + Math.floor(Math.random() * 70),
      walletBalance: Math.floor(Math.random() * 200),
      dateOfBirth: isoDate(randomDate(new Date(1980, 0), new Date(2000, 0))),
      emergencyContactName: `${pick(['Mom', 'Dad', 'Partner', 'Spouse'])} ${last}`,
      emergencyContactPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
    });
  }

  // ============================================================================
  // AIRCRAFT (1)
  // ============================================================================
  const aircraft: AircraftData[] = [
    {
      registration: 'N482SF',
      type: 'Cessna 208B Grand Caravan',
      maxCapacity: 15,
      maxWeight: 3980,
      emptyWeight: 2145,
    },
  ];

  // ============================================================================
  // RIGS (10 — 8 tandem DZ-owned + 2 sport)
  // ============================================================================
  const rigs: RigData[] = [];

  // DZ-owned tandem rigs (8)
  for (let i = 0; i < 8; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // Sport rigs for fun jumpers (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('SPORT', 20 + i)); // ownerIndex 20-21 = first 2 fun jumpers
  }

  // ============================================================================
  // LOADS (8 — tandem-heavy Saturday operations)
  // ============================================================================
  const baseTime = new Date();
  baseTime.setHours(9, 0, 0, 0); // 9:00 AM start

  const loads = Array.from({ length: 8 }, (_, i) => {
    const loadTime = new Date(baseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 30); // 30-min turn time for single aircraft

    // 6-8 tandem pairs per load, plus occasional fun jumper
    const tandemCount = 6 + Math.floor(Math.random() * 3); // 6, 7, or 8 tandems
    const slots: { athleteIndex: number; jumpType: string; altitude: number; exitWeight: number }[] = [];

    // Fill tandem student slots
    for (let j = 0; j < Math.min(tandemCount, 20); j++) {
      const athleteIdx = (i * 3 + j) % 20; // rotate through tandem students
      const athlete = athletes[athleteIdx];
      slots.push({
        athleteIndex: athleteIdx,
        jumpType: 'TANDEM',
        altitude: 14000,
        exitWeight: (athlete.weight || 170) + 25,
      });
    }

    // Add a fun jumper on some loads
    if (i % 2 === 0 && i < 6) {
      const funIdx = 20 + (i % 5); // fun jumpers are indices 20-24
      const funAthlete = athletes[funIdx];
      slots.push({
        athleteIndex: funIdx,
        jumpType: 'FUN_JUMP',
        altitude: pick([14000, 13500, 13000]),
        exitWeight: (funAthlete.weight || 170) + 25,
      });
    }

    const statuses = ['COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE',
                      'LANDED', 'FILLING', 'OPEN'];

    return {
      loadNumber: i + 1,
      aircraftIndex: 0, // single aircraft
      status: statuses[i] || 'OPEN',
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // ============================================================================
  // GEAR ITEMS (10 — helmets and cameras for tandem ops)
  // ============================================================================
  const gear = [
    // Tandem helmets with built-in mounts
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'HELMET', manufacturer: pick(['Cookie', 'Tonfly', 'Bonehead']),
      model: pick(['G4', 'G35', 'Flat Top Pro']),
      serial: generateSerial('HLM'), status: 'APPROVED',
    })),
    // Tandem video cameras
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'CAMERA', manufacturer: pick(['GoPro', 'GoPro', 'DJI']),
      model: pick(['Hero 12 Black', 'Hero 11 Black', 'Action 4']),
      serial: generateSerial('CAM'), status: 'APPROVED',
    })),
  ];

  // ============================================================================
  // BOOGIES & EVENTS
  // ============================================================================
  const boogies = [
    {
      name: 'Tandem Thrill Weekend',
      description: 'Two days of non-stop tandem action with group discounts, live DJ, food trucks, and photo booths. Perfect for birthday parties, corporate outings, and bachelor/bachelorette groups.',
      startDate: isoDate(daysFromNow(21)),
      endDate: isoDate(daysFromNow(22)),
      maxParticipants: 100,
      packages: [
        { name: 'Thrill Seeker Pass', price: 269, description: 'Tandem jump + event access + commemorative T-shirt' },
        { name: 'Group Package (4+)', price: 239, description: 'Discounted tandem for groups of 4 or more' },
        { name: 'VIP Experience', price: 399, description: 'Tandem jump + professional video + photos + champagne toast' },
      ],
    },
  ];

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'tandem-dz',
      name: 'Premium Tandem-Focused DZ',
      description: 'High-volume tandem factory in DeLand, FL with 1 Caravan, 8 staff, 25 athletes (20 tandem students + 5 fun jumpers), and tandem-heavy operations.',
      tags: ['tandem', 'caravan', 'tourist', 'high-revenue'],
      estimatedRecords: {
        users: 34, // 1 owner + 8 staff + 25 athletes
        aircraft: 1,
        loads: 8,
        slots: 60,
        rigs: 10,
        gearItems: 10,
        wallets: 5,
        waiverTemplates: WAIVER_TEMPLATES.length,
        bookingPackages: BOOKING_PACKAGES.length,
        incidents: 3,
        boogies: 1,
        jobPosts: 2,
        courses: 1,
        campaigns: 3,
      },
    },
    organizations: [
      {
        name: 'SkyVenture Florida',
        slug: 'skyventure-florida',
        owner: {
          email: 'diana.marsh@demo.skylara.dev',
          firstName: 'Diana',
          lastName: 'Marsh',
          phone: '+13865550100',
        },
        dropzones: [
          {
            name: 'SkyVenture DeLand',
            slug: 'skyventure-deland',
            icaoCode: 'KDED',
            latitude: 29.0667,
            longitude: -81.2833,
            timezone: 'America/New_York',
            windLimitKnots: 20,
            currency: 'USD',
            branches: [
              { name: 'Main Operations', isDefault: true },
            ],
            staff,
            athletes,
            aircraft,
            loads,
            gear,
            rigs,
            waiverTemplates: WAIVER_TEMPLATES,
            bookingPackages: BOOKING_PACKAGES,
            incidents: INCIDENT_TEMPLATES.slice(0, 3).map((t) => ({ ...t, status: 'OPEN', reporterIndex: 0 })),
            boogies,
            jobPosts: JOB_TEMPLATES.slice(0, 2),
            courses: COURSE_TEMPLATES.slice(0, 1),
            campaigns: CAMPAIGN_TEMPLATES.slice(0, 3),
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
