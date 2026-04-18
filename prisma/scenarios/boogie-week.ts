/**
 * SCENARIO: Event / Boogie Week
 *
 * "SkyCosta Events" — A massive boogie/event week at Empuriabrava, Spain
 * with international athletes, high-capacity aircraft (CASA C-212 Aviocar +
 * Pilatus PC-6 Porter), 60 athletes ranging from tandem students to
 * D-license competitors with 8,000+ jumps, and 3 concurrent events
 * including a wingsuit world cup qualifier.
 *
 * Focus: international boogie operations, high-volume loads, event logistics.
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
  BOOKING_PACKAGES,
  WAIVER_TEMPLATES,
  INCIDENT_TEMPLATES,
  JOB_TEMPLATES,
  COURSE_TEMPLATES,
  CAMPAIGN_TEMPLATES,
} from './types';

export function buildBoogieWeekScenario(): ScenarioData {
  resetNamePool();
  const EMAIL_DOMAIN = 'demo.skylara.dev';

  // ============================================================================
  // STAFF (12 people)
  // ============================================================================
  const staff: StaffData[] = [
    // DZ Manager
    { ...n(), email: makeEmail('pablo', 'moreno', EMAIL_DOMAIN), roles: ['DZ_MANAGER'], bio: 'Event Operations Manager. 15 years running boogies across Europe. D-license, 5,200 jumps.' },
    // Manifest Staff (2)
    { ...n(), email: makeEmail('lucia', 'garcia', EMAIL_DOMAIN), roles: ['MANIFEST_STAFF'], bio: 'Lead manifest coordinator. Trilingual: Spanish, English, French. Expert at high-volume load management.' },
    { ...n(), email: makeEmail('marta', 'lopez', EMAIL_DOMAIN), roles: ['MANIFEST_STAFF'], bio: 'Weekend manifest. Handles 30+ loads per day during boogies.' },
    // Pilots (2)
    { ...n(), email: makeEmail('capt.jordi', 'benet', EMAIL_DOMAIN), roles: ['PILOT'], bio: 'Chief pilot. CASA C-212 type-rated. 9,500+ PIC hours. Former Spanish Air Force.' },
    { ...n(), email: makeEmail('andreas', 'weber', EMAIL_DOMAIN), roles: ['PILOT'], bio: 'Porter pilot. 3,200 PIC hours. Flies the sunset and night loads.' },
    // Coaches (3)
    { ...n(), email: makeEmail('pierre', 'duchamp', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Freefly world champion 2022. Head organizer for Mediterranean Boogie. 11,000 jumps.' },
    { ...n(), email: makeEmail('katja', 'bergmann', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Formation skydiving coach. 4-way and 8-way national team. 6,800 jumps.' },
    { ...n(), email: makeEmail('luca', 'rossi', EMAIL_DOMAIN), roles: ['COACH'], bio: 'Wingsuit coach and BASE jumper. World Cup qualifier judge. 4,500 jumps.' },
    // Tandem Instructors (2)
    { ...n(), email: makeEmail('carlos', 'navarro', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'Lead TI. 8,000+ tandems. Bilingual Spanish/English.' },
    { ...n(), email: makeEmail('ines', 'silva', EMAIL_DOMAIN), roles: ['TANDEM_INSTRUCTOR'], bio: 'TI and videographer. 3,200 tandems. Speaks 4 languages.' },
    // Camera Coach (1)
    { ...n(), email: makeEmail('marco', 'vitale', EMAIL_DOMAIN), roles: ['CAMERA_COACH'], bio: 'Professional aerial cinematographer. Shoots all boogie promo content. 5,600 jumps.' },
    // Rigger (1)
    { ...n(), email: makeEmail('hans', 'keller', EMAIL_DOMAIN), roles: ['RIGGER'], bio: 'Master rigger. 20+ years experience. Manages all boogie gear inspections and rental fleet.' },
  ];

  // ============================================================================
  // ATHLETES (60 — international boogie participants)
  // ============================================================================
  const athletes: AthleteData[] = [];

  // D-license international competitors (25) — high jump counts
  for (let i = 0; i < 25; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 1000 + Math.floor(Math.random() * 7000),
      licenseType: 'D',
      licenseNumber: `D-${30000 + Math.floor(Math.random() * 10000)}`,
      weight: 150 + Math.floor(Math.random() * 60),
      walletBalance: Math.floor(Math.random() * 800),
      dateOfBirth: isoDate(randomDate(new Date(1970, 0), new Date(1995, 0))),
      emergencyContactName: `${pick(['Mom', 'Dad', 'Partner', 'Spouse'])} ${last}`,
      emergencyContactPhone: `+${pick(['34', '49', '33', '44', '31', '46', '39', '1'])}${Math.floor(1000000000 + Math.random() * 9000000000)}`,
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
      walletBalance: Math.floor(Math.random() * 400),
      dateOfBirth: isoDate(randomDate(new Date(1980, 0), new Date(2000, 0))),
    });
  }

  // B-license (10)
  for (let i = 0; i < 10; i++) {
    const { first, last } = uniqueName();
    athletes.push({
      firstName: first, lastName: last,
      email: makeEmail(first, last, EMAIL_DOMAIN),
      jumpCount: 50 + Math.floor(Math.random() * 150),
      licenseType: 'B',
      licenseNumber: `B-${50000 + Math.floor(Math.random() * 10000)}`,
      weight: 130 + Math.floor(Math.random() * 80),
      walletBalance: Math.floor(Math.random() * 250),
      dateOfBirth: isoDate(randomDate(new Date(1985, 0), new Date(2003, 0))),
    });
  }

  // A-license new jumpers (5)
  for (let i = 0; i < 5; i++) {
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

  // Tandem students (5 — boogie walk-ins / gift vouchers)
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
  // AIRCRAFT (2) — European EC- registrations
  // ============================================================================
  const aircraft: AircraftData[] = [
    {
      registration: 'EC-MBX',
      type: 'CASA C-212 Aviocar',
      maxCapacity: 30,
      maxWeight: 8000,
      emptyWeight: 4400,
    },
    {
      registration: 'EC-GPK',
      type: 'Pilatus PC-6 Porter',
      maxCapacity: 10,
      maxWeight: 2800,
      emptyWeight: 1270,
    },
  ];

  // ============================================================================
  // RIGS (20 — tandem, rental, personal sport)
  // ============================================================================
  const rigs: RigData[] = [];

  // DZ-owned tandem rigs (3)
  for (let i = 0; i < 3; i++) {
    rigs.push(generateRig('TANDEM'));
  }

  // DZ-owned rental rigs (2)
  for (let i = 0; i < 2; i++) {
    rigs.push(generateRig('RENTAL'));
  }

  // Personal sport rigs for experienced jumpers (15)
  for (let i = 0; i < 15; i++) {
    rigs.push(generateRig('SPORT', i)); // ownerIndex 0-14 = first 15 D-license athletes
  }

  // ============================================================================
  // GEAR ITEMS (15 — helmets, cameras, wingsuits)
  // ============================================================================
  const gear = [
    // Helmets (5)
    ...Array.from({ length: 5 }, () => ({
      type: 'HELMET',
      manufacturer: pick(['Cookie', 'Tonfly', 'Parasport', 'KISS']),
      model: pick(['G4', 'G35', 'TFX', 'Z1', 'Fuel']),
      serial: generateSerial('HLM'),
      status: 'APPROVED',
    })),
    // Cameras (5)
    ...Array.from({ length: 5 }, () => ({
      type: 'CAMERA',
      manufacturer: pick(['GoPro', 'Insta360', 'FlySight', 'Cookie']),
      model: pick(['Hero 12 Black', 'X4', 'Rev2', 'Roller Mount', 'Flatlock Mount']),
      serial: generateSerial('CAM'),
      status: 'APPROVED',
    })),
    // Wingsuits (5)
    ...Array.from({ length: 5 }, () => ({
      type: 'WINGSUIT',
      manufacturer: pick(['Squirrel', 'TonySuit', 'Phoenix-Fly', 'Intrudair']),
      model: pick(['COLUGO 4', 'Swift 4', 'Havok Carve', 'Phantom Edge', 'Shadow']),
      serial: generateSerial('WNG'),
      status: 'APPROVED',
    })),
  ];

  // ============================================================================
  // LOADS (10 — boogie day operations, high capacity)
  // ============================================================================
  const baseTime = new Date();
  baseTime.setHours(9, 0, 0, 0); // 9:00 AM start — European morning

  const loads = Array.from({ length: 10 }, (_, i) => {
    // Alternate: CASA loads (even indexes) and Porter loads (odd indexes)
    const acIdx = i % 2 === 0 ? 0 : 1;
    const loadTime = new Date(baseTime);
    loadTime.setMinutes(loadTime.getMinutes() + i * 20); // 20-min turn time during boogie

    // CASA: 20-28 jumpers; Porter: 8-10 jumpers
    const slotsCount = acIdx === 0
      ? 20 + Math.floor(Math.random() * 9) // 20-28
      : 8 + Math.floor(Math.random() * 3); // 8-10
    const athletePool = [...Array(athletes.length).keys()];

    const slots = Array.from({ length: Math.min(slotsCount, athletePool.length) }, () => {
      const athleteIdx = athletePool.splice(Math.floor(Math.random() * athletePool.length), 1)[0];
      const athlete = athletes[athleteIdx];
      const jumpTypes = athlete.jumpCount === 0
        ? ['TANDEM']
        : athlete.jumpCount < 50
          ? ['FUN_JUMP', 'COACH']
          : ['FUN_JUMP', 'FUN_JUMP', 'FUN_JUMP', 'WINGSUIT', 'ANGLE', 'COACH', 'HOP_POP'];
      return {
        athleteIndex: athleteIdx,
        jumpType: pick(jumpTypes),
        altitude: athlete.jumpCount === 0 ? 14000 : pick([15000, 14000, 13500, 13000]),
        exitWeight: (athlete.weight || 170) + 25,
      };
    });

    // Most loads complete or filling during active boogie day
    const statuses = [
      'COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE',
      'COMPLETE', 'COMPLETE', 'COMPLETE', 'FILLING', 'FILLING',
    ];

    return {
      loadNumber: i + 1,
      aircraftIndex: acIdx,
      status: statuses[i] || 'FILLING',
      scheduledAt: loadTime.toISOString(),
      slots,
    };
  });

  // ============================================================================
  // BOOGIES & EVENTS (3)
  // ============================================================================
  const boogies = [
    {
      name: 'Mediterranean Boogie 2026',
      description: 'The biggest boogie on the Costa Brava. 5 days of world-class organizing, freefly, formation, angle, and wingsuit loads. Beach parties every night, DJs, live bands, and awards ceremony. International athletes from 30+ countries.',
      startDate: isoDate(daysFromNow(7)),
      endDate: isoDate(daysFromNow(12)),
      maxParticipants: 400,
      packages: [
        { name: 'Full Boogie Pass', price: 249, description: 'All 5 days, unlimited organized jumps, all evening events, boogie T-shirt' },
        { name: '3-Day Pass', price: 179, description: 'Any 3 days of your choice, organized jumps included' },
        { name: 'Weekend Pass', price: 129, description: 'Saturday & Sunday access with organized jumps' },
        { name: 'Day Pass', price: 59, description: 'Single day entry with organized loads' },
        { name: 'Party Only Pass', price: 35, description: 'Evening events access only — no jumping' },
      ],
    },
    {
      name: 'Night Jump Festival',
      description: 'Licensed jumpers only (C+). Spectacular night jump event over the Mediterranean coast with illuminated landing area, glow sticks, and pyrotechnics. Maximum 2 CASA loads.',
      startDate: isoDate(daysFromNow(10)),
      endDate: isoDate(daysFromNow(10)),
      maxParticipants: 60,
      packages: [
        { name: 'Night Jump Ticket', price: 65, description: 'One night jump with glow kit, light-up smoke, and commemorative patch' },
        { name: 'Night Jump Double', price: 110, description: 'Two night jumps across both loads' },
      ],
    },
    {
      name: 'Wingsuit World Cup Qualifier',
      description: 'Official FAI wingsuit performance flying qualifier. 3-day competition with GPS tracking, live scoring, and international judges. Open to all wingsuit pilots with 200+ wingsuit jumps.',
      startDate: isoDate(daysFromNow(14)),
      endDate: isoDate(daysFromNow(17)),
      maxParticipants: 100,
      packages: [
        { name: 'Competitor Entry', price: 299, description: 'Full competition entry, practice rounds, GPS tracker rental, awards dinner' },
        { name: 'Spectator Pass', price: 25, description: 'Ground viewing area, live scoring screen, food court access' },
      ],
    },
  ];

  // ============================================================================
  // INCIDENTS (3)
  // ============================================================================
  const incidents = INCIDENT_TEMPLATES.slice(0, 3).map((t) => ({
    ...t,
    status: 'OPEN' as const,
    reporterIndex: 0,
  }));

  // ============================================================================
  // ASSEMBLE SCENARIO
  // ============================================================================
  return {
    meta: {
      key: 'boogie-week',
      name: 'Event / Boogie Week',
      description: 'Massive boogie/event week at Empuriabrava, Spain with international athletes, high-capacity CASA C-212, 3 concurrent events including a wingsuit world cup qualifier, and 60 participants from 30+ countries.',
      tags: ['boogie', 'event', 'international', 'high-volume', 'europe'],
      estimatedRecords: {
        users: 73, // 1 owner + 12 staff + 60 athletes
        aircraft: 2,
        loads: 10,
        slots: 180,
        rigs: 20,
        gearItems: 15,
        wallets: 60,
        waiverTemplates: WAIVER_TEMPLATES.length,
        bookingPackages: BOOKING_PACKAGES.length,
        incidents: 3,
        boogies: 3,
        jobPosts: 4,
        courses: 3,
        campaigns: CAMPAIGN_TEMPLATES.length,
      },
    },
    organizations: [
      {
        name: 'SkyCosta Events',
        slug: 'skycosta-events',
        owner: {
          email: 'miguel.fernandez@demo.skylara.dev',
          firstName: 'Miguel',
          lastName: 'Fernandez',
          phone: '+34655000100',
        },
        dropzones: [
          {
            name: 'SkyCosta Empuriabrava',
            slug: 'skycosta-empuriabrava',
            icaoCode: 'LEAP',
            latitude: 42.2594,
            longitude: 3.1106,
            timezone: 'Europe/Madrid',
            windLimitKnots: 22,
            currency: 'EUR',
            branches: [
              { name: 'Event Operations', isDefault: true },
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
            courses: COURSE_TEMPLATES.slice(0, 3),
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
