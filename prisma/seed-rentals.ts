/**
 * Seed script: Rental property demo data for SkyHigh DZ (Perris)
 * Creates 6 rental listings near the dropzone with a RentalHost for the admin user.
 *
 * Listing breakdown:
 *   1 BUNKHOUSE  — shared bunkhouse on DZ property
 *   1 CAMPSITE   — tent/RV campsite on DZ grounds
 *   2 ROOM_SHARE — private rooms in nearby house
 *   1 APARTMENT  — studio apartment, 5 min from DZ
 *   1 VILLA      — 3BR house, 10 min from DZ (using VILLA as closest to "house")
 *
 * Run: npx tsx prisma/seed-rentals.ts
 */

import {
  PrismaClient,
  RentalListingType,
  RentalHostType,
  RentalVisibility,
  RentalBookingMode,
  PetPolicy,
  CancellationPolicy,
} from '@prisma/client';

const prisma = new PrismaClient();

const DROPZONE_ID = 44;

// Perris, CA base coordinates
const BASE_LAT = 33.7672;
const BASE_LNG = -117.2157;

interface ListingSeed {
  title: string;
  slug: string;
  description: string;
  listingType: RentalListingType;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  distanceToDropzone: number; // km
  sleepingCapacity: number;
  bathrooms: number;
  petPolicy: PetPolicy;
  cancellationPolicy: CancellationPolicy;
  bookingMode: RentalBookingMode;
  basePrice: number;
  weeklyDiscount: number | null;
  monthlyDiscount: number | null;
  amenities: string[];
  skydiverAmenities: Record<string, boolean>;
}

const listings: ListingSeed[] = [
  {
    title: "Jumper's Bunkhouse",
    slug: 'jumpers-bunkhouse-perris',
    description:
      'Shared bunkhouse right on the DZ property. Bunk beds, communal kitchen, hot showers, and gear storage. Roll out of bed and be on the first load. Perfect for weekend warriors and boogie visitors.',
    listingType: RentalListingType.BUNKHOUSE,
    address: '2091 Goetz Rd, Perris, CA 92570',
    city: 'Perris',
    country: 'US',
    latitude: BASE_LAT + 0.001,
    longitude: BASE_LNG + 0.001,
    distanceToDropzone: 0.1,
    sleepingCapacity: 12,
    bathrooms: 2,
    petPolicy: PetPolicy.NOT_ALLOWED,
    cancellationPolicy: CancellationPolicy.FLEXIBLE,
    bookingMode: RentalBookingMode.INSTANT_BOOK,
    basePrice: 25,
    weeklyDiscount: 15,
    monthlyDiscount: 30,
    amenities: ['wifi', 'kitchen', 'laundry', 'parking', 'shower'],
    skydiverAmenities: {
      gearStorage: true,
      rigLocker: true,
      packingSpace: true,
      shuttle: false,
    },
  },
  {
    title: 'DZ Campsite',
    slug: 'dz-campsite-perris',
    description:
      'Tent and RV campsite on the DZ grounds. Full hookups for RVs, flat tent pads, fire pits, and picnic tables. Watch the sunset canopies from your campfire. Bathrooms and showers available on-site.',
    listingType: RentalListingType.CAMPSITE,
    address: '2091 Goetz Rd, Perris, CA 92570',
    city: 'Perris',
    country: 'US',
    latitude: BASE_LAT + 0.0005,
    longitude: BASE_LNG - 0.001,
    distanceToDropzone: 0.05,
    sleepingCapacity: 4,
    bathrooms: 0,
    petPolicy: PetPolicy.ALLOWED,
    cancellationPolicy: CancellationPolicy.FLEXIBLE,
    bookingMode: RentalBookingMode.INSTANT_BOOK,
    basePrice: 15,
    weeklyDiscount: 20,
    monthlyDiscount: 40,
    amenities: ['parking', 'fire_pit', 'picnic_table', 'rv_hookup', 'shower'],
    skydiverAmenities: {
      gearStorage: false,
      rigLocker: false,
      packingSpace: false,
      shuttle: false,
    },
  },
  {
    title: 'Perris Crashpad — Room A',
    slug: 'perris-crashpad-room-a',
    description:
      'Private room in a shared skydiver house, 2 minutes from the DZ. Queen bed, shared bathroom, full kitchen, and a big backyard. Housemates are all jumpers — great community vibe.',
    listingType: RentalListingType.ROOM_SHARE,
    address: '310 San Jacinto Ave, Perris, CA 92570',
    city: 'Perris',
    country: 'US',
    latitude: BASE_LAT + 0.008,
    longitude: BASE_LNG + 0.005,
    distanceToDropzone: 1.2,
    sleepingCapacity: 2,
    bathrooms: 1,
    petPolicy: PetPolicy.BY_REQUEST,
    cancellationPolicy: CancellationPolicy.MODERATE,
    bookingMode: RentalBookingMode.REQUEST_TO_BOOK,
    basePrice: 60,
    weeklyDiscount: 10,
    monthlyDiscount: 25,
    amenities: ['wifi', 'kitchen', 'laundry', 'parking', 'ac', 'tv'],
    skydiverAmenities: {
      gearStorage: true,
      rigLocker: false,
      packingSpace: true,
      shuttle: false,
    },
  },
  {
    title: 'Perris Crashpad — Room B',
    slug: 'perris-crashpad-room-b',
    description:
      'Second private room in the same skydiver house, 2 minutes from the DZ. Twin beds (sleeps 2), shared bathroom, full kitchen access. Ideal for tandem students or visiting jumpers on a budget.',
    listingType: RentalListingType.ROOM_SHARE,
    address: '310 San Jacinto Ave, Perris, CA 92570',
    city: 'Perris',
    country: 'US',
    latitude: BASE_LAT + 0.008,
    longitude: BASE_LNG + 0.005,
    distanceToDropzone: 1.2,
    sleepingCapacity: 2,
    bathrooms: 1,
    petPolicy: PetPolicy.BY_REQUEST,
    cancellationPolicy: CancellationPolicy.MODERATE,
    bookingMode: RentalBookingMode.REQUEST_TO_BOOK,
    basePrice: 80,
    weeklyDiscount: 10,
    monthlyDiscount: 25,
    amenities: ['wifi', 'kitchen', 'laundry', 'parking', 'ac', 'tv'],
    skydiverAmenities: {
      gearStorage: true,
      rigLocker: false,
      packingSpace: true,
      shuttle: false,
    },
  },
  {
    title: 'Skyhouse Studio',
    slug: 'skyhouse-studio-perris',
    description:
      'Fully furnished studio apartment 5 minutes from the DZ. Private entrance, kitchenette, queen bed, and dedicated workspace. Quiet neighborhood — great for coaches, instructors, or anyone wanting privacy after a day of jumping.',
    listingType: RentalListingType.APARTMENT,
    address: '1425 N Perris Blvd, Perris, CA 92571',
    city: 'Perris',
    country: 'US',
    latitude: BASE_LAT + 0.015,
    longitude: BASE_LNG + 0.012,
    distanceToDropzone: 3.5,
    sleepingCapacity: 2,
    bathrooms: 1,
    petPolicy: PetPolicy.NOT_ALLOWED,
    cancellationPolicy: CancellationPolicy.MODERATE,
    bookingMode: RentalBookingMode.REQUEST_TO_BOOK,
    basePrice: 95,
    weeklyDiscount: 15,
    monthlyDiscount: 30,
    amenities: ['wifi', 'kitchen', 'parking', 'ac', 'tv', 'workspace', 'pool'],
    skydiverAmenities: {
      gearStorage: true,
      rigLocker: true,
      packingSpace: false,
      shuttle: true,
    },
  },
  {
    title: 'Valley View House',
    slug: 'valley-view-house-perris',
    description:
      '3-bedroom house with mountain views, 10 minutes from the DZ. Full kitchen, washer/dryer, 2-car garage, and a backyard with BBQ. Perfect for teams, event groups, or families visiting for tandems. Comfortably sleeps 6.',
    listingType: RentalListingType.VILLA,
    address: '780 Placentia Ave, Perris, CA 92571',
    city: 'Perris',
    country: 'US',
    latitude: BASE_LAT + 0.025,
    longitude: BASE_LNG + 0.02,
    distanceToDropzone: 7.8,
    sleepingCapacity: 6,
    bathrooms: 2,
    petPolicy: PetPolicy.BY_REQUEST,
    cancellationPolicy: CancellationPolicy.STRICT,
    bookingMode: RentalBookingMode.REQUEST_TO_BOOK,
    basePrice: 180,
    weeklyDiscount: 20,
    monthlyDiscount: 35,
    amenities: [
      'wifi',
      'kitchen',
      'laundry',
      'parking',
      'ac',
      'tv',
      'bbq',
      'garage',
      'yard',
      'mountain_view',
    ],
    skydiverAmenities: {
      gearStorage: true,
      rigLocker: false,
      packingSpace: true,
      shuttle: false,
    },
  },
];

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('--- Seed Rentals: starting ---');

  // 1. Look up admin user
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@skylara.dev' },
  });
  if (!admin) throw new Error('Admin user (admin@skylara.dev) not found. Run main seed first.');

  // 2. Verify DZ 44 exists
  const dz = await prisma.dropzone.findUnique({ where: { id: DROPZONE_ID } });
  if (!dz) throw new Error(`Dropzone id=${DROPZONE_ID} not found. Run main seed first.`);

  console.log(`  Admin user : id=${admin.id} (${admin.email})`);
  console.log(`  Dropzone   : id=${dz.id} (${dz.name})`);

  // 3. Upsert RentalHost for admin
  let host = await prisma.rentalHost.findUnique({ where: { userId: admin.id } });
  if (!host) {
    host = await prisma.rentalHost.create({
      data: {
        userId: admin.id,
        displayName: 'SkyHigh DZ Stays',
        bio: 'Official accommodation listings managed by SkyHigh DZ — Perris. On-site and nearby stays for jumpers, teams, and visitors.',
        hostType: RentalHostType.DROPZONE,
        payoutEnabled: true,
      },
    });
    console.log(`  Created RentalHost: id=${host.id}`);
  } else {
    console.log(`  RentalHost already exists: id=${host.id}`);
  }

  // 4. Create rental listings (skip if slug already exists)
  let created = 0;
  let skipped = 0;

  for (const def of listings) {
    const existing = await prisma.rentalListing.findUnique({
      where: { slug: def.slug },
    });

    if (existing) {
      console.log(`  SKIP (already exists): ${def.title} [slug=${def.slug}]`);
      skipped++;
      continue;
    }

    await prisma.rentalListing.create({
      data: {
        dropzoneId: DROPZONE_ID,
        hostId: host.id,
        title: def.title,
        slug: def.slug,
        description: def.description,
        listingType: def.listingType,
        hostType: RentalHostType.DROPZONE,
        address: def.address,
        city: def.city,
        country: def.country,
        latitude: def.latitude,
        longitude: def.longitude,
        distanceToDropzone: def.distanceToDropzone,
        sleepingCapacity: def.sleepingCapacity,
        bathrooms: def.bathrooms,
        petPolicy: def.petPolicy,
        cancellationPolicy: def.cancellationPolicy,
        bookingMode: def.bookingMode,
        visibility: RentalVisibility.PUBLISHED,
        basePrice: def.basePrice,
        currency: 'USD',
        weeklyDiscount: def.weeklyDiscount,
        monthlyDiscount: def.monthlyDiscount,
        amenities: def.amenities,
        skydiverAmenities: def.skydiverAmenities,
      },
    });

    console.log(`  CREATED: ${def.title} ($${def.basePrice}/night, ${def.listingType})`);
    created++;
  }

  // 5. Report totals
  const total = await prisma.rentalListing.count();
  console.log(`\n--- Seed Rentals: done ---`);
  console.log(`  Created: ${created}, Skipped: ${skipped}`);
  console.log(`  Total RentalListing records in DB: ${total}`);
}

main()
  .catch((e) => {
    console.error('Seed Rentals FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
