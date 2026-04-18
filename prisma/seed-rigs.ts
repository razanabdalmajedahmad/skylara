/**
 * Seed script: Rig data for SkyHigh DZ (Perris)
 * Creates 8 rigs with full component records (container, main canopy, reserve, AAD)
 *
 * Rig breakdown:
 *   2 DZ-owned TANDEM rigs (admin-owned, shared)
 *   2 DZ-owned STUDENT rigs (admin-owned, shared)
 *   1 RENTAL rig (admin-owned, shared)
 *   3 personal SPORT rigs (athlete-owned)
 */

import {
  PrismaClient,
  RigType,
  RigActiveStatus,
  MaintenanceStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

// ---------------------------------------------------------------------------
// Rig definitions
// ---------------------------------------------------------------------------

interface RigSeed {
  rig: {
    ownerEmail?: string; // resolved at runtime
    ownerIndex?: number; // index into otherAthletes array
    dropzoneId: number | null;
    rigName: string;
    serialNumber: string;
    rigType: RigType;
    activeStatus: RigActiveStatus;
    maintenanceStatus: MaintenanceStatus;
    totalJumps: number;
    isSharedRig: boolean;
    defaultManifestSelectable: boolean;
    notes: string | null;
  };
  container: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    manufactureDate: Date;
    size: string;
  };
  mainCanopy: {
    manufacturer: string;
    model: string;
    size: string;
    serialNumber: string;
    fabricType: string;
    lineType: string;
    installDate: Date;
    totalJumps: number;
    jumpsSinceInspection: number;
    jumpsSinceReline: number;
    lastInspectionDate: Date;
    lastRelineDate: Date | null;
  };
  reserve: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    size: string;
    installDate: Date;
    repackDate: Date;
    repackDueDate: Date;
    rides: number;
  };
  aad: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    installDate: Date;
    lastServiceDate: Date;
    nextServiceDueDate: Date;
    batteryDueDate: Date;
    endOfLifeDate: Date;
  };
}

const DROPZONE_ID = 44;

const rigDefinitions: RigSeed[] = [
  // -----------------------------------------------------------------------
  // 1. TANDEM rig #1 — Sigma / Icarus 365 / PD Optimum 360
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerEmail: 'admin@skylara.dev',
      dropzoneId: DROPZONE_ID,
      rigName: 'Tandem 1 — Sigma',
      serialNumber: 'UPT-T-2021-0451',
      rigType: RigType.TANDEM,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 1420,
      isSharedRig: true,
      defaultManifestSelectable: true,
      notes: 'Primary tandem rig. Inspected Q1 2026.',
    },
    container: {
      manufacturer: 'United Parachute Technologies',
      model: 'Sigma',
      serialNumber: 'UPT-S-2021-0451',
      manufactureDate: yearsAgo(5),
      size: 'Tandem',
    },
    mainCanopy: {
      manufacturer: 'Icarus',
      model: 'Icarus Tandem 365',
      size: '365',
      serialNumber: 'IC-365-2021-1088',
      fabricType: 'ZP',
      lineType: 'Dacron',
      installDate: yearsAgo(2),
      totalJumps: 580,
      jumpsSinceInspection: 32,
      jumpsSinceReline: 580,
      lastInspectionDate: daysAgo(45),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Performance Designs',
      model: 'PD 360-R',
      serialNumber: 'PD-360R-2021-0290',
      size: '360',
      installDate: yearsAgo(5),
      repackDate: daysAgo(60),
      repackDueDate: daysFromNow(120),
      rides: 0,
    },
    aad: {
      manufacturer: 'Airtec',
      model: 'Cypres 2 Tandem',
      serialNumber: 'CYP2T-304517',
      installDate: yearsAgo(4),
      lastServiceDate: daysAgo(180),
      nextServiceDueDate: daysFromNow(545),
      batteryDueDate: daysFromNow(900),
      endOfLifeDate: yearsAgo(-8), // 8 years from now
    },
  },

  // -----------------------------------------------------------------------
  // 2. TANDEM rig #2 — Sigma / Icarus 330 / PD Optimum 360
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerEmail: 'admin@skylara.dev',
      dropzoneId: DROPZONE_ID,
      rigName: 'Tandem 2 — Sigma',
      serialNumber: 'UPT-T-2022-0783',
      rigType: RigType.TANDEM,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 890,
      isSharedRig: true,
      defaultManifestSelectable: true,
      notes: 'Secondary tandem rig.',
    },
    container: {
      manufacturer: 'United Parachute Technologies',
      model: 'Sigma',
      serialNumber: 'UPT-S-2022-0783',
      manufactureDate: yearsAgo(4),
      size: 'Tandem',
    },
    mainCanopy: {
      manufacturer: 'Icarus',
      model: 'Icarus Tandem 330',
      size: '330',
      serialNumber: 'IC-330-2022-2044',
      fabricType: 'ZP',
      lineType: 'Dacron',
      installDate: yearsAgo(1),
      totalJumps: 310,
      jumpsSinceInspection: 18,
      jumpsSinceReline: 310,
      lastInspectionDate: daysAgo(30),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Performance Designs',
      model: 'PD 360-R',
      serialNumber: 'PD-360R-2022-0511',
      size: '360',
      installDate: yearsAgo(4),
      repackDate: daysAgo(45),
      repackDueDate: daysFromNow(135),
      rides: 0,
    },
    aad: {
      manufacturer: 'Airtec',
      model: 'Cypres 2 Tandem',
      serialNumber: 'CYP2T-318722',
      installDate: yearsAgo(3),
      lastServiceDate: daysAgo(240),
      nextServiceDueDate: daysFromNow(490),
      batteryDueDate: daysFromNow(1100),
      endOfLifeDate: yearsAgo(-9),
    },
  },

  // -----------------------------------------------------------------------
  // 3. STUDENT rig #1 — Navigator 260 / Javelin
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerEmail: 'admin@skylara.dev',
      dropzoneId: DROPZONE_ID,
      rigName: 'Student 1 — Navigator',
      serialNumber: 'SP-J-2023-1102',
      rigType: RigType.STUDENT,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 340,
      isSharedRig: true,
      defaultManifestSelectable: true,
      notes: 'AFF student rig. Navigator 260 main.',
    },
    container: {
      manufacturer: 'Sun Path Products',
      model: 'Javelin Odyssey',
      serialNumber: 'SP-JO-2023-1102',
      manufactureDate: yearsAgo(3),
      size: 'J5',
    },
    mainCanopy: {
      manufacturer: 'Performance Designs',
      model: 'Navigator 260',
      size: '260',
      serialNumber: 'PD-NAV260-2023-0419',
      fabricType: 'ZP',
      lineType: 'Dacron',
      installDate: yearsAgo(3),
      totalJumps: 340,
      jumpsSinceInspection: 22,
      jumpsSinceReline: 340,
      lastInspectionDate: daysAgo(35),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Performance Designs',
      model: 'PD Optimum 253',
      serialNumber: 'PD-OPT253-2023-0107',
      size: '253',
      installDate: yearsAgo(3),
      repackDate: daysAgo(80),
      repackDueDate: daysFromNow(100),
      rides: 0,
    },
    aad: {
      manufacturer: 'Airtec',
      model: 'Cypres 2 Student',
      serialNumber: 'CYP2S-401288',
      installDate: yearsAgo(3),
      lastServiceDate: daysAgo(300),
      nextServiceDueDate: daysFromNow(430),
      batteryDueDate: daysFromNow(800),
      endOfLifeDate: yearsAgo(-9),
    },
  },

  // -----------------------------------------------------------------------
  // 4. STUDENT rig #2 — Navigator 220 / Mirage
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerEmail: 'admin@skylara.dev',
      dropzoneId: DROPZONE_ID,
      rigName: 'Student 2 — Navigator',
      serialNumber: 'MG-G4-2022-0567',
      rigType: RigType.STUDENT,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.DUE_SOON,
      totalJumps: 520,
      isSharedRig: true,
      defaultManifestSelectable: true,
      notes: 'Intermediate student rig. Reserve repack approaching.',
    },
    container: {
      manufacturer: 'Mirage Systems',
      model: 'Mirage G4',
      serialNumber: 'MG-G4-2022-0567',
      manufactureDate: yearsAgo(4),
      size: 'M6',
    },
    mainCanopy: {
      manufacturer: 'Performance Designs',
      model: 'Navigator 220',
      size: '220',
      serialNumber: 'PD-NAV220-2022-0831',
      fabricType: 'ZP',
      lineType: 'Dacron',
      installDate: yearsAgo(4),
      totalJumps: 520,
      jumpsSinceInspection: 38,
      jumpsSinceReline: 520,
      lastInspectionDate: daysAgo(55),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Aerodyne',
      model: 'Smart 220',
      serialNumber: 'AD-SM220-2022-0201',
      size: '220',
      installDate: yearsAgo(4),
      repackDate: daysAgo(150),
      repackDueDate: daysFromNow(30),
      rides: 0,
    },
    aad: {
      manufacturer: 'AAD',
      model: 'Vigil 2+',
      serialNumber: 'VIG2P-208744',
      installDate: yearsAgo(4),
      lastServiceDate: daysAgo(400),
      nextServiceDueDate: daysFromNow(330),
      batteryDueDate: daysFromNow(600),
      endOfLifeDate: yearsAgo(-8),
    },
  },

  // -----------------------------------------------------------------------
  // 5. RENTAL rig — Pilot 188 / Vector 3
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerEmail: 'admin@skylara.dev',
      dropzoneId: DROPZONE_ID,
      rigName: 'Rental 1 — Pilot 188',
      serialNumber: 'UPT-V3-2023-2210',
      rigType: RigType.RENTAL,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 210,
      isSharedRig: true,
      defaultManifestSelectable: true,
      notes: 'Available for licensed jumpers who need gear rental.',
    },
    container: {
      manufacturer: 'United Parachute Technologies',
      model: 'Vector 3',
      serialNumber: 'UPT-V3-2023-2210',
      manufactureDate: yearsAgo(3),
      size: 'V310',
    },
    mainCanopy: {
      manufacturer: 'Aerodyne',
      model: 'Pilot 188',
      size: '188',
      serialNumber: 'AD-PLT188-2023-0455',
      fabricType: 'ZP',
      lineType: 'HMA',
      installDate: yearsAgo(3),
      totalJumps: 210,
      jumpsSinceInspection: 12,
      jumpsSinceReline: 210,
      lastInspectionDate: daysAgo(20),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Performance Designs',
      model: 'PD Optimum 176',
      serialNumber: 'PD-OPT176-2023-0340',
      size: '176',
      installDate: yearsAgo(3),
      repackDate: daysAgo(50),
      repackDueDate: daysFromNow(130),
      rides: 0,
    },
    aad: {
      manufacturer: 'Airtec',
      model: 'Cypres 2 Expert',
      serialNumber: 'CYP2E-455120',
      installDate: yearsAgo(2),
      lastServiceDate: daysAgo(120),
      nextServiceDueDate: daysFromNow(610),
      batteryDueDate: daysFromNow(1000),
      endOfLifeDate: yearsAgo(-10),
    },
  },

  // -----------------------------------------------------------------------
  // 6. SPORT rig — athlete1@skylara.dev — Sabre 3 150 / Vector 3
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerEmail: 'athlete1@skylara.dev',
      dropzoneId: null,
      rigName: 'My Sabre 3 Rig',
      serialNumber: 'UPT-V3-2024-3101',
      rigType: RigType.SPORT,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 285,
      isSharedRig: false,
      defaultManifestSelectable: true,
      notes: null,
    },
    container: {
      manufacturer: 'United Parachute Technologies',
      model: 'Vector 3',
      serialNumber: 'UPT-V3-2024-3101',
      manufactureDate: yearsAgo(2),
      size: 'V308',
    },
    mainCanopy: {
      manufacturer: 'Performance Designs',
      model: 'Sabre 3 150',
      size: '150',
      serialNumber: 'PD-SAB3-150-2024-1220',
      fabricType: 'ZP',
      lineType: 'Vectran',
      installDate: yearsAgo(2),
      totalJumps: 285,
      jumpsSinceInspection: 15,
      jumpsSinceReline: 285,
      lastInspectionDate: daysAgo(25),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Performance Designs',
      model: 'PD Optimum 160',
      serialNumber: 'PD-OPT160-2024-0098',
      size: '160',
      installDate: yearsAgo(2),
      repackDate: daysAgo(70),
      repackDueDate: daysFromNow(110),
      rides: 0,
    },
    aad: {
      manufacturer: 'Airtec',
      model: 'Cypres 2 Expert',
      serialNumber: 'CYP2E-489301',
      installDate: yearsAgo(2),
      lastServiceDate: daysAgo(90),
      nextServiceDueDate: daysFromNow(640),
      batteryDueDate: daysFromNow(1100),
      endOfLifeDate: yearsAgo(-10),
    },
  },

  // -----------------------------------------------------------------------
  // 7. SPORT rig — otherAthlete[0] — Crossfire 3 129 / Javelin Odyssey
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerIndex: 0,
      dropzoneId: null,
      rigName: 'Crossfire 3 Setup',
      serialNumber: 'SP-JO-2023-4480',
      rigType: RigType.SPORT,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 610,
      isSharedRig: false,
      defaultManifestSelectable: true,
      notes: null,
    },
    container: {
      manufacturer: 'Sun Path Products',
      model: 'Javelin Odyssey',
      serialNumber: 'SP-JO-2023-4480',
      manufactureDate: yearsAgo(3),
      size: 'J3K',
    },
    mainCanopy: {
      manufacturer: 'NZ Aerosports',
      model: 'Crossfire 3 129',
      size: '129',
      serialNumber: 'NZ-XF3-129-2023-0772',
      fabricType: 'ZP',
      lineType: 'HMA',
      installDate: yearsAgo(3),
      totalJumps: 610,
      jumpsSinceInspection: 40,
      jumpsSinceReline: 610,
      lastInspectionDate: daysAgo(60),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Icarus',
      model: 'Nano 143',
      serialNumber: 'IC-NANO143-2023-0188',
      size: '143',
      installDate: yearsAgo(3),
      repackDate: daysAgo(30),
      repackDueDate: daysFromNow(150),
      rides: 0,
    },
    aad: {
      manufacturer: 'AAD',
      model: 'Vigil 2+',
      serialNumber: 'VIG2P-331056',
      installDate: yearsAgo(3),
      lastServiceDate: daysAgo(200),
      nextServiceDueDate: daysFromNow(530),
      batteryDueDate: daysFromNow(700),
      endOfLifeDate: yearsAgo(-9),
    },
  },

  // -----------------------------------------------------------------------
  // 8. SPORT rig — otherAthlete[1] — Pilot 168 / Mirage G4
  // -----------------------------------------------------------------------
  {
    rig: {
      ownerIndex: 1,
      dropzoneId: null,
      rigName: 'Pilot 168 Weekend Rig',
      serialNumber: 'MG-G4-2024-1899',
      rigType: RigType.SPORT,
      activeStatus: RigActiveStatus.ACTIVE,
      maintenanceStatus: MaintenanceStatus.OK,
      totalJumps: 95,
      isSharedRig: false,
      defaultManifestSelectable: true,
      notes: null,
    },
    container: {
      manufacturer: 'Mirage Systems',
      model: 'Mirage G4',
      serialNumber: 'MG-G4-2024-1899',
      manufactureDate: yearsAgo(1),
      size: 'M4',
    },
    mainCanopy: {
      manufacturer: 'Aerodyne',
      model: 'Pilot 168',
      size: '168',
      serialNumber: 'AD-PLT168-2024-0611',
      fabricType: 'ZP',
      lineType: 'HMA',
      installDate: yearsAgo(1),
      totalJumps: 95,
      jumpsSinceInspection: 8,
      jumpsSinceReline: 95,
      lastInspectionDate: daysAgo(15),
      lastRelineDate: null,
    },
    reserve: {
      manufacturer: 'Aerodyne',
      model: 'Smart 150',
      serialNumber: 'AD-SM150-2024-0305',
      size: '150',
      installDate: yearsAgo(1),
      repackDate: daysAgo(85),
      repackDueDate: daysFromNow(95),
      rides: 0,
    },
    aad: {
      manufacturer: 'Airtec',
      model: 'Cypres 2 Expert',
      serialNumber: 'CYP2E-501877',
      installDate: yearsAgo(1),
      lastServiceDate: daysAgo(60),
      nextServiceDueDate: daysFromNow(670),
      batteryDueDate: daysFromNow(1200),
      endOfLifeDate: yearsAgo(-11),
    },
  },
];

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('--- Seed Rigs: starting ---');

  // 1. Look up users
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@skylara.dev' },
  });
  if (!admin) throw new Error('Admin user (admin@skylara.dev) not found');

  const athlete1 = await prisma.user.findFirst({
    where: { email: 'athlete1@skylara.dev' },
  });
  if (!athlete1) throw new Error('Athlete1 user (athlete1@skylara.dev) not found');

  const otherAthletes = await prisma.user.findMany({
    where: {
      email: {
        notIn: ['admin@skylara.dev', 'athlete1@skylara.dev'],
      },
    },
    take: 2,
    orderBy: { id: 'asc' },
  });

  if (otherAthletes.length < 2) {
    throw new Error(
      `Need at least 2 other users for sport rigs. Found ${otherAthletes.length}.`
    );
  }

  console.log(`  Admin user: id=${admin.id} (${admin.email})`);
  console.log(`  Athlete1  : id=${athlete1.id} (${athlete1.email})`);
  console.log(
    `  Other athletes: ${otherAthletes.map((u) => `id=${u.id} (${u.email})`).join(', ')}`
  );

  // 2. Resolve owner IDs
  function resolveOwnerId(def: RigSeed['rig']): number {
    if (def.ownerEmail === 'admin@skylara.dev') return admin.id;
    if (def.ownerEmail === 'athlete1@skylara.dev') return athlete1.id;
    if (def.ownerIndex !== undefined) return otherAthletes[def.ownerIndex].id;
    throw new Error('Cannot resolve owner for rig');
  }

  // 3. Create rigs and components
  let created = 0;
  for (const def of rigDefinitions) {
    const ownerId = resolveOwnerId(def.rig);

    const rig = await prisma.rig.create({
      data: {
        ownerUserId: ownerId,
        dropzoneId: def.rig.dropzoneId,
        rigName: def.rig.rigName,
        serialNumber: def.rig.serialNumber,
        rigType: def.rig.rigType,
        activeStatus: def.rig.activeStatus,
        maintenanceStatus: def.rig.maintenanceStatus,
        totalJumps: def.rig.totalJumps,
        isSharedRig: def.rig.isSharedRig,
        defaultManifestSelectable: def.rig.defaultManifestSelectable,
        notes: def.rig.notes,
      },
    });

    await Promise.all([
      prisma.rigContainer.create({
        data: {
          rigId: rig.id,
          manufacturer: def.container.manufacturer,
          model: def.container.model,
          serialNumber: def.container.serialNumber,
          manufactureDate: def.container.manufactureDate,
          size: def.container.size,
        },
      }),
      prisma.rigMainCanopy.create({
        data: {
          rigId: rig.id,
          manufacturer: def.mainCanopy.manufacturer,
          model: def.mainCanopy.model,
          size: def.mainCanopy.size,
          serialNumber: def.mainCanopy.serialNumber,
          fabricType: def.mainCanopy.fabricType,
          lineType: def.mainCanopy.lineType,
          installDate: def.mainCanopy.installDate,
          totalJumps: def.mainCanopy.totalJumps,
          jumpsSinceInspection: def.mainCanopy.jumpsSinceInspection,
          jumpsSinceReline: def.mainCanopy.jumpsSinceReline,
          lastInspectionDate: def.mainCanopy.lastInspectionDate,
          lastRelineDate: def.mainCanopy.lastRelineDate,
        },
      }),
      prisma.rigReserve.create({
        data: {
          rigId: rig.id,
          manufacturer: def.reserve.manufacturer,
          model: def.reserve.model,
          serialNumber: def.reserve.serialNumber,
          size: def.reserve.size,
          installDate: def.reserve.installDate,
          repackDate: def.reserve.repackDate,
          repackDueDate: def.reserve.repackDueDate,
          rides: def.reserve.rides,
        },
      }),
      prisma.rigAAD.create({
        data: {
          rigId: rig.id,
          manufacturer: def.aad.manufacturer,
          model: def.aad.model,
          serialNumber: def.aad.serialNumber,
          installDate: def.aad.installDate,
          lastServiceDate: def.aad.lastServiceDate,
          nextServiceDueDate: def.aad.nextServiceDueDate,
          batteryDueDate: def.aad.batteryDueDate,
          endOfLifeDate: def.aad.endOfLifeDate,
        },
      }),
    ]);

    console.log(
      `  Created rig #${rig.id}: ${def.rig.rigName} (${def.rig.rigType}, owner=${ownerId})`
    );
    created++;
  }

  // 4. Verification
  const totalRigs = await prisma.rig.count();
  const totalContainers = await prisma.rigContainer.count();
  const totalCanopies = await prisma.rigMainCanopy.count();
  const totalReserves = await prisma.rigReserve.count();
  const totalAads = await prisma.rigAAD.count();

  console.log(`\n--- Seed Rigs: complete ---`);
  console.log(`  Rigs created this run: ${created}`);
  console.log(`  Total Rig records:          ${totalRigs}`);
  console.log(`  Total RigContainer records: ${totalContainers}`);
  console.log(`  Total RigMainCanopy records:${totalCanopies}`);
  console.log(`  Total RigReserve records:   ${totalReserves}`);
  console.log(`  Total RigAAD records:       ${totalAads}`);
}

main()
  .catch((e) => {
    console.error('Seed Rigs failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
