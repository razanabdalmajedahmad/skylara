/**
 * Rental Partner Inventory Sync Service
 *
 * Pluggable framework for syncing rental listings from external partner APIs
 * (Booking.com, Airbnb, local property managers).
 *
 * Each partner adapter implements the PartnerAdapter interface.
 * The sync service polls adapters on a configurable schedule and upserts
 * listings into the rental_listings table with sourceType = 'PARTNER_API'.
 */

export interface PartnerListing {
  externalId: string;
  title: string;
  description: string;
  listingType: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  basePrice: number;
  currency: string;
  sleepingCapacity: number;
  bathrooms: number;
  amenities: string[];
  imageUrls: string[];
}

export interface PartnerAdapter {
  name: string;
  /** Fetch all available listings from the partner */
  fetchListings(dropzoneId: number, config: Record<string, string>): Promise<PartnerListing[]>;
  /** Check partner API health */
  healthCheck(): Promise<boolean>;
}

/**
 * Sync listings from a partner adapter into the database.
 * Uses upsert to avoid duplicates based on externalId.
 */
export class RentalPartnerSyncService {
  private prisma: any;
  private adapters: Map<string, PartnerAdapter> = new Map();

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  registerAdapter(adapter: PartnerAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  async syncPartner(
    partnerName: string,
    dropzoneId: number,
    hostId: number,
    config: Record<string, string>
  ): Promise<{ synced: number; errors: number; details: string[] }> {
    const adapter = this.adapters.get(partnerName);
    if (!adapter) {
      return { synced: 0, errors: 1, details: [`Unknown partner: ${partnerName}`] };
    }

    const details: string[] = [];
    let synced = 0;
    let errors = 0;

    try {
      const listings = await adapter.fetchListings(dropzoneId, config);

      for (const listing of listings) {
        try {
          // Generate a deterministic slug from partner + externalId
          const slug = `partner-${partnerName}-${listing.externalId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

          // Find the dropzone for distance calculation
          const dz = await this.prisma.dropzone.findUnique({
            where: { id: dropzoneId },
            select: { latitude: true, longitude: true },
          });

          const distance = dz?.latitude && dz?.longitude
            ? this.haversineKm(
                Number(dz.latitude), Number(dz.longitude),
                listing.latitude, listing.longitude
              )
            : 0;

          await this.prisma.rentalListing.upsert({
            where: { slug },
            create: {
              dropzoneId,
              hostId,
              title: listing.title,
              slug,
              description: listing.description,
              listingType: this.mapListingType(listing.listingType),
              hostType: "PARTNER",
              address: listing.address,
              city: listing.city,
              country: listing.country,
              latitude: listing.latitude,
              longitude: listing.longitude,
              distanceToDropzone: distance,
              sleepingCapacity: listing.sleepingCapacity,
              bathrooms: listing.bathrooms,
              basePrice: listing.basePrice,
              currency: listing.currency,
              amenities: listing.amenities,
              bookingMode: "PARTNER_BOOKING",
              visibility: "PUBLISHED",
              complianceStatus: "APPROVED",
            },
            update: {
              title: listing.title,
              description: listing.description,
              basePrice: listing.basePrice,
              sleepingCapacity: listing.sleepingCapacity,
            },
          });

          // Sync photos
          for (const imageUrl of listing.imageUrls.slice(0, 10)) {
            await this.prisma.rentalPhoto.upsert({
              where: {
                // Use a composite check since there's no unique on URL
                id: -1, // Will always miss — creates new
              },
              create: {
                listingId: (await this.prisma.rentalListing.findUnique({ where: { slug }, select: { id: true } }))!.id,
                url: imageUrl,
                sortOrder: listing.imageUrls.indexOf(imageUrl),
              },
              update: {},
            }).catch(() => {
              // Photo already exists or FK issue — skip
            });
          }

          synced++;
          details.push(`Synced: ${listing.title}`);
        } catch (err: any) {
          errors++;
          details.push(`Error syncing ${listing.externalId}: ${err.message}`);
        }
      }
    } catch (err: any) {
      errors++;
      details.push(`Adapter error: ${err.message}`);
    }

    return { synced, errors, details };
  }

  async listAdapters(): Promise<string[]> {
    return Array.from(this.adapters.keys());
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private mapListingType(type: string): string {
    const map: Record<string, string> = {
      hotel: "HOTEL_ROOM",
      apartment: "APARTMENT",
      villa: "VILLA",
      hostel: "HOSTEL_BED",
      campsite: "CAMPSITE",
      rv: "RV_HOOKUP",
    };
    return map[type.toLowerCase()] || "APARTMENT";
  }
}

// ---------------------------------------------------------------------------
// Helper: fetch with timeout
// ---------------------------------------------------------------------------
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 8000, ...fetchOpts } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { ...fetchOpts, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

// ---------------------------------------------------------------------------
// BookingComAdapter
// ---------------------------------------------------------------------------
/**
 * Adapter for Booking.com Connectivity API.
 *
 * Config expects:
 *   apiKey      - Booking.com API key (use "test" for mock data)
 *   hotelIds    - comma-separated hotel IDs (optional)
 *   latitude    - center latitude for proximity search
 *   longitude   - center longitude for proximity search
 *   radius      - radius in km (default "30")
 */
export class BookingComAdapter implements PartnerAdapter {
  name = "booking_com";

  private static readonly BASE_URL = "https://distribution-xml.booking.com/json";

  private mapPropertyType(type: string): string {
    const map: Record<string, string> = {
      hotel: "hotel",
      hostel: "hostel",
      apartment: "apartment",
      resort: "villa",
      guesthouse: "apartment",
      motel: "hotel",
      villa: "villa",
      campsite: "campsite",
      lodge: "hotel",
    };
    return map[type?.toLowerCase()] || "apartment";
  }

  async fetchListings(
    dropzoneId: number,
    config: Record<string, string>
  ): Promise<PartnerListing[]> {
    const { apiKey, hotelIds, latitude, longitude, radius = "30" } = config;

    // Development / test mode
    if (!apiKey || apiKey === "test") {
      // BookingComAdapter: test mode — returning mock data
      return this.mockListings(latitude, longitude);
    }

    // Real API call
    // BookingComAdapter: fetching real listings
    const listings: PartnerListing[] = [];
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        latitude: latitude || "0",
        longitude: longitude || "0",
        radius: radius,
        rows: String(pageSize),
        offset: String(page * pageSize),
      });
      if (hotelIds) {
        params.set("hotel_ids", hotelIds);
      }

      const url = `${BookingComAdapter.BASE_URL}/bookings.getHotels?${params}`;
      const resp = await fetchWithTimeout(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          Accept: "application/json",
        },
        timeout: 8000,
      });

      if (!resp.ok) {
        throw new Error(`Booking.com API error: ${resp.status} ${resp.statusText}`);
      }

      const data = (await resp.json()) as any;
      const hotels: any[] = data?.result || [];

      for (const h of hotels) {
        listings.push({
          externalId: `bcom-${h.hotel_id}`,
          title: h.name || "Booking.com Property",
          description: h.hotel_description?.trim() || "",
          listingType: this.mapPropertyType(h.hotel_type_id || "hotel"),
          address: h.address || "",
          city: h.city || "",
          country: h.countrycode || "",
          latitude: parseFloat(h.location?.latitude || latitude || "0"),
          longitude: parseFloat(h.location?.longitude || longitude || "0"),
          basePrice: parseFloat(h.minrate || "0"),
          currency: h.currency_code || "EUR",
          sleepingCapacity: parseInt(h.max_persons_in_reservation || "2", 10),
          bathrooms: 1,
          amenities: (h.hotel_facilities || "").split(",").map((s: string) => s.trim()).filter(Boolean),
          imageUrls: h.photos ? h.photos.slice(0, 5).map((p: any) => p.url_max || p.url_original) : [],
        });
      }

      hasMore = hotels.length === pageSize;
      page++;
      // Safety: cap at 5 pages (500 results)
      if (page >= 5) break;
    }

    // BookingComAdapter: fetched listings.length results
    return listings;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetchWithTimeout(`${BookingComAdapter.BASE_URL}/bookings.getHotelTypes`, {
        timeout: 8000,
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  private mockListings(lat?: string, lon?: string): PartnerListing[] {
    const baseLat = parseFloat(lat || "33.78");
    const baseLon = parseFloat(lon || "-117.23");
    return [
      {
        externalId: "bcom-mock-101",
        title: "SkyView Hotel & Suites",
        description: "Modern hotel with airport views, complimentary shuttle, and gear storage room.",
        listingType: "hotel",
        address: "2400 Aviation Way",
        city: "Perris",
        country: "US",
        latitude: baseLat + 0.005,
        longitude: baseLon + 0.003,
        basePrice: 89,
        currency: "USD",
        sleepingCapacity: 2,
        bathrooms: 1,
        amenities: ["wifi", "pool", "shuttle", "gear_storage", "breakfast"],
        imageUrls: [],
      },
      {
        externalId: "bcom-mock-102",
        title: "Jumptown Budget Inn",
        description: "Affordable rooms within walking distance of the dropzone.",
        listingType: "hotel",
        address: "1150 Drop Zone Rd",
        city: "Perris",
        country: "US",
        latitude: baseLat - 0.002,
        longitude: baseLon + 0.001,
        basePrice: 55,
        currency: "USD",
        sleepingCapacity: 2,
        bathrooms: 1,
        amenities: ["wifi", "parking", "laundry"],
        imageUrls: [],
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// AirbnbAdapter
// ---------------------------------------------------------------------------
/**
 * Adapter for Airbnb-compatible listings (via Airbnb API or aggregation layer).
 *
 * Config expects:
 *   accessToken - OAuth access token (use "test" for mock data)
 *   locationId  - Airbnb location/market identifier
 *   latitude    - center latitude
 *   longitude   - center longitude
 *   radius      - radius in km (default "25")
 */
export class AirbnbAdapter implements PartnerAdapter {
  name = "airbnb";

  private static readonly BASE_URL = "https://api.airbnb.com/v2";

  private mapRoomType(type: string): string {
    const map: Record<string, string> = {
      entire_home: "apartment",
      private_room: "hostel",
      shared_room: "hostel",
      hotel_room: "hotel",
    };
    return map[type?.toLowerCase()] || "apartment";
  }

  async fetchListings(
    dropzoneId: number,
    config: Record<string, string>
  ): Promise<PartnerListing[]> {
    const { accessToken, locationId, latitude, longitude, radius = "25" } = config;

    // Development / test mode
    if (!accessToken || accessToken === "test") {
      // AirbnbAdapter: test mode — returning mock data
      return this.mockListings(latitude, longitude);
    }

    // Real API call
    // AirbnbAdapter: fetching real listings

    const params = new URLSearchParams({
      lat: latitude || "0",
      lng: longitude || "0",
      radius: radius,
      _format: "for_search_results_with_minimal_pricing",
    });
    if (locationId) {
      params.set("location_id", locationId);
    }

    const url = `${AirbnbAdapter.BASE_URL}/search_results?${params}`;
    const resp = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "X-Airbnb-API-Key": accessToken,
      },
      timeout: 8000,
    });

    if (!resp.ok) {
      throw new Error(`Airbnb API error: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as any;
    const results: any[] = data?.search_results || [];

    const listings: PartnerListing[] = results.map((r: any) => {
      const listing = r.listing || {};
      const pricing = r.pricing_quote || {};
      return {
        externalId: `airbnb-${listing.id}`,
        title: listing.name || "Airbnb Listing",
        description: listing.public_address || "",
        listingType: this.mapRoomType(listing.room_type || "entire_home"),
        address: listing.public_address || "",
        city: listing.city || "",
        country: listing.country_code || "",
        latitude: parseFloat(listing.lat || latitude || "0"),
        longitude: parseFloat(listing.lng || longitude || "0"),
        basePrice: parseFloat(pricing.rate?.amount || "0"),
        currency: pricing.rate?.currency || "USD",
        sleepingCapacity: parseInt(listing.person_capacity || "2", 10),
        bathrooms: parseInt(listing.bathrooms || "1", 10),
        amenities: (listing.amenities || []).map((a: any) => typeof a === "string" ? a : a.name || ""),
        imageUrls: (listing.picture_urls || []).slice(0, 5),
      };
    });

    // AirbnbAdapter: fetched listings.length results
    return listings;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetchWithTimeout(`${AirbnbAdapter.BASE_URL}/metadata`, { timeout: 8000 });
      // Accept 2xx or 401 (unauthorized but reachable)
      return resp.status < 500;
    } catch {
      return false;
    }
  }

  private mockListings(lat?: string, lon?: string): PartnerListing[] {
    const baseLat = parseFloat(lat || "33.78");
    const baseLon = parseFloat(lon || "-117.23");
    return [
      {
        externalId: "airbnb-mock-201",
        title: "Cozy Loft Near the Drop Zone",
        description: "Bright, modern loft with open layout. 10-minute drive to DZ. Perfect for weekend jumpers.",
        listingType: "apartment",
        address: "780 Citrus Ave",
        city: "Perris",
        country: "US",
        latitude: baseLat + 0.008,
        longitude: baseLon - 0.004,
        basePrice: 72,
        currency: "USD",
        sleepingCapacity: 4,
        bathrooms: 1,
        amenities: ["wifi", "kitchen", "washer", "dryer", "parking", "tv"],
        imageUrls: [],
      },
      {
        externalId: "airbnb-mock-202",
        title: "Skydiver's Ranch House with Pool",
        description: "Spacious ranch-style home with pool and BBQ. Gear drying area in garage.",
        listingType: "villa",
        address: "1920 Valley View Dr",
        city: "Perris",
        country: "US",
        latitude: baseLat - 0.006,
        longitude: baseLon + 0.007,
        basePrice: 145,
        currency: "USD",
        sleepingCapacity: 8,
        bathrooms: 3,
        amenities: ["wifi", "pool", "bbq", "gear_storage", "parking", "kitchen", "washer"],
        imageUrls: [],
      },
      {
        externalId: "airbnb-mock-203",
        title: "Private Room in Shared Jumper House",
        description: "Affordable private room in a house shared with fellow skydivers.",
        listingType: "hostel",
        address: "550 Airport Blvd",
        city: "Perris",
        country: "US",
        latitude: baseLat + 0.001,
        longitude: baseLon - 0.001,
        basePrice: 38,
        currency: "USD",
        sleepingCapacity: 1,
        bathrooms: 1,
        amenities: ["wifi", "kitchen", "parking", "gear_storage"],
        imageUrls: [],
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// ChannelManagerAdapter
// ---------------------------------------------------------------------------
/**
 * Generic adapter for channel managers (Guesty, Hostaway, Lodgify, etc.)
 * that expose a REST JSON API for listing retrieval.
 *
 * Config expects:
 *   apiUrl      - base URL of the channel manager API (use "test" for mock data)
 *   apiKey      - API key for authentication
 *   format      - optional response format hint ("guesty" | "hostaway" | "generic")
 *   fieldMap    - optional JSON string mapping source fields to PartnerListing fields
 *                 e.g. '{"id":"externalId","name":"title","lat":"latitude"}'
 */
export class ChannelManagerAdapter implements PartnerAdapter {
  name = "channel_manager";

  private static readonly DEFAULT_FIELD_MAP: Record<string, string> = {
    id: "externalId",
    external_id: "externalId",
    name: "title",
    title: "title",
    description: "description",
    type: "listingType",
    listing_type: "listingType",
    property_type: "listingType",
    address: "address",
    street: "address",
    city: "city",
    country: "country",
    country_code: "country",
    lat: "latitude",
    latitude: "latitude",
    lng: "longitude",
    longitude: "longitude",
    lon: "longitude",
    price: "basePrice",
    base_price: "basePrice",
    nightly_price: "basePrice",
    currency: "currency",
    capacity: "sleepingCapacity",
    guests: "sleepingCapacity",
    max_guests: "sleepingCapacity",
    sleeping_capacity: "sleepingCapacity",
    bathrooms: "bathrooms",
    amenities: "amenities",
    images: "imageUrls",
    photos: "imageUrls",
    picture_urls: "imageUrls",
  };

  async fetchListings(
    dropzoneId: number,
    config: Record<string, string>
  ): Promise<PartnerListing[]> {
    const { apiUrl, apiKey, format, fieldMap: fieldMapJson } = config;

    // Development / test mode
    if (!apiUrl || apiUrl === "test" || !apiKey || apiKey === "test") {
      // ChannelManagerAdapter: test mode — returning mock data
      return this.mockListings();
    }

    // Parse custom field mapping if provided
    let customFieldMap: Record<string, string> = {};
    if (fieldMapJson) {
      try {
        customFieldMap = JSON.parse(fieldMapJson);
      } catch {
        console.warn("[ChannelManagerAdapter] Invalid fieldMap JSON, using defaults");
      }
    }
    const fieldMap = { ...ChannelManagerAdapter.DEFAULT_FIELD_MAP, ...customFieldMap };

    // ChannelManagerAdapter: fetching real listings

    const resp = await fetchWithTimeout(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      timeout: 8000,
    });

    if (!resp.ok) {
      throw new Error(`Channel manager API error: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as any;

    // Try to locate the listings array in common response shapes
    let rawListings: any[] = [];
    if (Array.isArray(data)) {
      rawListings = data;
    } else if (Array.isArray(data.data)) {
      rawListings = data.data;
    } else if (Array.isArray(data.results)) {
      rawListings = data.results;
    } else if (Array.isArray(data.listings)) {
      rawListings = data.listings;
    } else if (Array.isArray(data.items)) {
      rawListings = data.items;
    }

    const listings: PartnerListing[] = rawListings.map((raw: any) => {
      const mapped = this.applyFieldMap(raw, fieldMap, format || "generic");
      return {
        externalId: String(mapped.externalId || raw.id || raw._id || `cm-${Date.now()}-${Math.random()}`),
        title: String(mapped.title || "Channel Manager Listing"),
        description: String(mapped.description || ""),
        listingType: String(mapped.listingType || "apartment").toLowerCase(),
        address: String(mapped.address || ""),
        city: String(mapped.city || ""),
        country: String(mapped.country || ""),
        latitude: parseFloat(mapped.latitude) || 0,
        longitude: parseFloat(mapped.longitude) || 0,
        basePrice: parseFloat(mapped.basePrice) || 0,
        currency: String(mapped.currency || "USD"),
        sleepingCapacity: parseInt(mapped.sleepingCapacity, 10) || 2,
        bathrooms: parseInt(mapped.bathrooms, 10) || 1,
        amenities: Array.isArray(mapped.amenities) ? mapped.amenities : [],
        imageUrls: Array.isArray(mapped.imageUrls) ? mapped.imageUrls.slice(0, 10) : [],
      };
    });

    // ChannelManagerAdapter: fetched listings.length results
    return listings;
  }

  async healthCheck(): Promise<boolean> {
    // Generic adapter has no fixed endpoint to ping; always return true
    return true;
  }

  private applyFieldMap(
    raw: any,
    fieldMap: Record<string, string>,
    _format: string
  ): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [sourceKey, targetKey] of Object.entries(fieldMap)) {
      if (raw[sourceKey] !== undefined && result[targetKey] === undefined) {
        result[targetKey] = raw[sourceKey];
      }
    }
    // Also check nested address objects common in channel managers
    if (!result.address && raw.address && typeof raw.address === "object") {
      result.address = raw.address.street || raw.address.full || "";
      if (!result.city) result.city = raw.address.city || "";
      if (!result.country) result.country = raw.address.country || raw.address.country_code || "";
    }
    return result;
  }

  private mockListings(): PartnerListing[] {
    return [
      {
        externalId: "cm-mock-301",
        title: "DZ Gateway Apartment (via Guesty)",
        description: "Managed apartment 3 minutes from the dropzone. Keyless entry, full kitchen.",
        listingType: "apartment",
        address: "320 Gateway Blvd",
        city: "Perris",
        country: "US",
        latitude: 33.785,
        longitude: -117.225,
        basePrice: 95,
        currency: "USD",
        sleepingCapacity: 4,
        bathrooms: 2,
        amenities: ["wifi", "kitchen", "smart_lock", "parking", "washer"],
        imageUrls: [],
      },
      {
        externalId: "cm-mock-302",
        title: "Freefall Campsite Spot (via Hostaway)",
        description: "RV and tent spots with power hookups and shower facilities.",
        listingType: "campsite",
        address: "90 Airport Rd",
        city: "Perris",
        country: "US",
        latitude: 33.779,
        longitude: -117.231,
        basePrice: 25,
        currency: "USD",
        sleepingCapacity: 2,
        bathrooms: 0,
        amenities: ["power_hookup", "showers", "fire_pit", "parking"],
        imageUrls: [],
      },
    ];
  }
}

/**
 * Example partner adapter for testing/demo purposes.
 * In production, replace with real API integrations.
 */
export class DemoPartnerAdapter implements PartnerAdapter {
  name = "demo";

  async fetchListings(dropzoneId: number): Promise<PartnerListing[]> {
    return [
      {
        externalId: "demo-001",
        title: "Skydiver's Hostel - 5 min from DZ",
        description: "Budget-friendly hostel with gear storage and DZ shuttle.",
        listingType: "hostel",
        address: "100 Airport Blvd",
        city: "Perris",
        country: "US",
        latitude: 33.7825,
        longitude: -117.2286,
        basePrice: 35,
        currency: "USD",
        sleepingCapacity: 1,
        bathrooms: 1,
        amenities: ["wifi", "gear_storage", "shuttle", "kitchen"],
        imageUrls: [],
      },
    ];
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
