import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

// ============================================================================
// PUBLIC WEB PORTAL ROUTES
// Three groups:
//   1. Public endpoints (no auth) — homepage, weather, events, jobs, stays, etc.
//   2. Website management (admin auth) — settings, pages, publish
//   3. Account portal (user auth) — bookings, wallet, waivers, learning
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paginationParams(query: any): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  const offset = Math.max(parseInt(query.offset) || 0, 0);
  return { limit, offset };
}

const VALID_PAGE_TYPES = [
  "HOMEPAGE", "ABOUT", "SERVICES", "TANDEM", "AFF", "WEATHER",
  "EVENTS", "JOBS", "STAYS", "COURSES", "FAQ", "CONTACT", "CUSTOM",
] as const;

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function publicPortalRoutes(fastify: FastifyInstance) {

  // ========================================================================
  // DROPZONE BROWSING (authenticated — mobile app sends auth token)
  // ========================================================================

  // GET /dropzones?q=searchQuery&country=US&activityType=TANDEM&lat=...&lng=...&radius=...
  fastify.get(
    "/dropzones",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const query = request.query as {
          q?: string;
          country?: string;
          activityType?: string;
          lat?: string;
          lng?: string;
          radius?: string;
        };

        const where: any = { status: "active" };

        // Text search by name or slug
        if (query.q) {
          where.OR = [
            { name: { contains: query.q, mode: "insensitive" } },
            { slug: { contains: query.q, mode: "insensitive" } },
          ];
        }

        const dropzones = await fastify.prisma.dropzone.findMany({
          where,
          select: {
            id: true,
            uuid: true,
            name: true,
            slug: true,
            icaoCode: true,
            latitude: true,
            longitude: true,
            timezone: true,
            currency: true,
            windLimitKnots: true,
            status: true,
            organization: {
              select: { id: true, name: true },
            },
          },
          orderBy: { name: "asc" },
          take: 50,
        });

        reply.send({ success: true, data: dropzones });
      } catch (error) {
        fastify.log.error(error, "Dropzone search failed");
        reply.code(500).send({ success: false, error: "Failed to search dropzones" });
      }
    }
  );

  // GET /dropzones/:id — single dropzone detail
  fastify.get<{ Params: { id: string } }>(
    "/dropzones/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.params.id);
        if (isNaN(dzId)) {
          return reply.code(400).send({ success: false, error: "Invalid dropzone ID" });
        }

        const dropzone = await fastify.prisma.dropzone.findUnique({
          where: { id: dzId },
          select: {
            id: true,
            uuid: true,
            name: true,
            slug: true,
            icaoCode: true,
            latitude: true,
            longitude: true,
            timezone: true,
            currency: true,
            windLimitKnots: true,
            status: true,
            organization: {
              select: { id: true, name: true },
            },
            aircrafts: {
              where: { status: "ACTIVE" },
              select: { registration: true, type: true, maxCapacity: true },
            },
          },
        });

        if (!dropzone) {
          return reply.code(404).send({ success: false, error: "Dropzone not found" });
        }

        // Map aircraft to the shape the mobile app expects
        const { aircrafts, ...rest } = dropzone;
        const data = {
          ...rest,
          aircraft: aircrafts.map((a: any) => ({
            name: `${a.type} (${a.registration})`,
            capacity: a.maxCapacity,
          })),
        };

        reply.send({ success: true, data });
      } catch (error) {
        fastify.log.error(error, "Dropzone detail fetch failed");
        reply.code(500).send({ success: false, error: "Failed to fetch dropzone" });
      }
    }
  );

  // ========================================================================
  // GROUP 1: PUBLIC ENDPOINTS (no auth)
  // ========================================================================

  // GET /public/home — homepage content + settings for a dropzone
  fastify.get("/public/home", async (request, reply) => {
    try {
      const { dropzoneId } = request.query as { dropzoneId?: string };
      if (!dropzoneId) {
        return reply.code(400).send({ success: false, error: "dropzoneId query parameter is required" });
      }

      const dzId = parseInt(dropzoneId);
      if (isNaN(dzId)) {
        return reply.code(400).send({ success: false, error: "dropzoneId must be a number" });
      }

      const settings = await fastify.prisma.websiteSettings.findUnique({
        where: { dropzoneId: dzId },
        include: {
          pages: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              pageType: true,
              title: true,
              slug: true,
              metaTitle: true,
              metaDescription: true,
              ogImage: true,
              contentBlocks: true,
              sortOrder: true,
              showInNav: true,
            },
          },
        },
      });

      if (!settings || !settings.isPublished) {
        return reply.code(404).send({ success: false, error: "Website not found or not published" });
      }

      const homepage = settings.pages.find((p) => p.pageType === "HOMEPAGE");
      const navigation = settings.pages
        .filter((p) => p.showInNav)
        .map((p) => ({ title: p.title, slug: p.slug, pageType: p.pageType }));

      return reply.send({
        success: true,
        data: {
          settings: {
            companyName: settings.companyName,
            tagline: settings.tagline,
            description: settings.description,
            primaryColor: settings.primaryColor,
            secondaryColor: settings.secondaryColor,
            accentColor: settings.accentColor,
            logoUrl: settings.logoUrl,
            faviconUrl: settings.faviconUrl,
            heroImageUrl: settings.heroImageUrl,
            publicManifestEnabled: settings.publicManifestEnabled,
            accountPortalEnabled: settings.accountPortalEnabled,
          },
          homepage: homepage || null,
          navigation,
          pages: settings.pages,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load homepage" });
    }
  });

  // GET /public/weather/:dropzoneId — public weather (reuses weather service logic)
  fastify.get("/public/weather/:dropzoneId", async (request, reply) => {
    try {
      const { dropzoneId } = request.params as { dropzoneId: string };
      const dzId = parseInt(dropzoneId);
      if (isNaN(dzId)) {
        return reply.code(400).send({ success: false, error: "Invalid dropzoneId" });
      }

      const dropzone = await fastify.prisma.dropzone.findUnique({
        where: { id: dzId },
        select: { id: true, name: true, latitude: true, longitude: true, windLimitKnots: true, timezone: true },
      });

      if (!dropzone) {
        return reply.code(404).send({ success: false, error: "Dropzone not found" });
      }

      const lat = Number(dropzone.latitude);
      const lon = Number(dropzone.longitude);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,visibility,weather_code&daily=sunset&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) {
        return reply.code(502).send({ success: false, error: "Weather service unavailable" });
      }

      const weather: any = await res.json();
      const current = weather.current;

      if (!current) {
        return reply.code(502).send({ success: false, error: "No current weather data available" });
      }

      const windKnots = Math.round(current.wind_speed_10m * 0.539957);
      const WIND_DIRECTIONS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
      const windDir = WIND_DIRECTIONS[Math.round(current.wind_direction_10m / 22.5) % 16];
      const visibilityMiles = Math.round((current.visibility / 1609.34) * 10) / 10;

      // Simple jumpability score
      let jumpability = 100;
      if (windKnots > 10) jumpability -= (windKnots - 10) * 2;
      if (windKnots > 20) jumpability -= (windKnots - 20) * 3;
      if (windKnots > 30) jumpability -= 20;
      if (visibilityMiles < 3) jumpability -= 30;
      else if (visibilityMiles < 5) jumpability -= 15;
      if (current.cloud_cover > 80) jumpability -= 15;
      else if (current.cloud_cover > 50) jumpability -= 5;
      // Precipitation codes
      if ([61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(current.weather_code)) jumpability -= 40;
      else if ([51,53,55,56,57].includes(current.weather_code)) jumpability -= 20;
      jumpability = Math.max(0, Math.min(100, jumpability));

      return reply.send({
        success: true,
        data: {
          dropzone: { id: dropzone.id, name: dropzone.name },
          current: {
            temperatureC: Math.round(current.temperature_2m),
            temperatureF: Math.round(current.temperature_2m * 9 / 5 + 32),
            windSpeedKnots: windKnots,
            windDirection: windDir,
            cloudCover: current.cloud_cover,
            visibilityMiles,
            weatherCode: current.weather_code,
          },
          jumpability: {
            score: jumpability,
            label: jumpability >= 80 ? "GREAT" : jumpability >= 60 ? "GOOD" : jumpability >= 40 ? "MARGINAL" : "NO_GO",
            windLimit: dropzone.windLimitKnots,
            isWindHold: windKnots > dropzone.windLimitKnots,
          },
          sunset: weather.daily?.sunset?.[0] || null,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to fetch weather" });
    }
  });

  // GET /public/events — public events list (published boogies)
  fastify.get("/public/events", async (request, reply) => {
    try {
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const dropzoneId = query.dropzoneId ? parseInt(query.dropzoneId) : undefined;

      const where: any = {
        status: { in: ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS"] },
        visibility: "PUBLIC",
        endDate: { gte: new Date() },
      };
      if (dropzoneId) where.dropzoneId = dropzoneId;

      const [events, total] = await Promise.all([
        fastify.prisma.boogie.findMany({
          where,
          orderBy: { startDate: "asc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            uuid: true,
            title: true,
            slug: true,
            subtitle: true,
            shortDescription: true,
            eventType: true,
            discipline: true,
            organizerName: true,
            country: true,
            city: true,
            startDate: true,
            endDate: true,
            status: true,
            maxParticipants: true,
            currentParticipants: true,
            heroImageUrl: true,
            depositRequired: true,
            depositAmountCents: true,
            currency: true,
            minLicense: true,
            minJumps: true,
            dropzone: { select: { id: true, name: true, slug: true } },
          },
        }),
        fastify.prisma.boogie.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { events, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load events" });
    }
  });

  // GET /public/events/:id — event detail
  fastify.get("/public/events/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const eventId = parseInt(id);

      const event = await fastify.prisma.boogie.findFirst({
        where: {
          id: isNaN(eventId) ? undefined : eventId,
          status: { in: ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS", "COMPLETED"] },
          visibility: "PUBLIC",
        },
        select: {
          id: true,
          uuid: true,
          title: true,
          slug: true,
          subtitle: true,
          shortDescription: true,
          fullDescription: true,
          eventType: true,
          discipline: true,
          organizerName: true,
          country: true,
          city: true,
          timezone: true,
          startDate: true,
          endDate: true,
          registrationOpenAt: true,
          registrationCloseAt: true,
          status: true,
          maxParticipants: true,
          currentParticipants: true,
          waitlistEnabled: true,
          depositRequired: true,
          depositAmountCents: true,
          currency: true,
          heroImageUrl: true,
          promoVideoUrl: true,
          termsText: true,
          cancellationPolicy: true,
          minLicense: true,
          minJumps: true,
          minTunnelHours: true,
          aadRequired: true,
          gearApprovalRequired: true,
          ownRigRequired: true,
          rentalAvailable: true,
          formSchema: true,
          dropzone: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!event) {
        return reply.code(404).send({ success: false, error: "Event not found" });
      }

      return reply.send({ success: true, data: event });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load event" });
    }
  });

  // GET /public/jobs — public job board (published jobs with PUBLIC visibility)
  fastify.get("/public/jobs", async (request, reply) => {
    try {
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const dropzoneId = query.dropzoneId ? parseInt(query.dropzoneId) : undefined;
      const roleCategory = query.roleCategory as string | undefined;

      const where: any = {
        status: "PUBLISHED",
        visibilityType: { in: ["PUBLIC_LINK", "PUBLIC_MARKETPLACE"] },
      };
      if (dropzoneId) where.dropzoneId = dropzoneId;
      if (roleCategory) where.roleCategory = roleCategory;

      const [jobs, total] = await Promise.all([
        fastify.prisma.jobPost.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            uuid: true,
            title: true,
            slug: true,
            roleCategory: true,
            employmentType: true,
            locationMode: true,
            city: true,
            country: true,
            description: true,
            compensationJson: true,
            companyProfileSnapshot: true,
            createdAt: true,
            closeAt: true,
            dropzone: { select: { id: true, name: true, slug: true } },
          },
        }),
        fastify.prisma.jobPost.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { jobs, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load jobs" });
    }
  });

  // GET /public/jobs/:id — job detail
  fastify.get("/public/jobs/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const jobId = parseInt(id);

      const job = await fastify.prisma.jobPost.findFirst({
        where: {
          id: isNaN(jobId) ? undefined : jobId,
          status: "PUBLISHED",
          visibilityType: { in: ["PUBLIC_LINK", "PUBLIC_MARKETPLACE"] },
        },
        select: {
          id: true,
          uuid: true,
          title: true,
          slug: true,
          roleCategory: true,
          employmentType: true,
          priority: true,
          locationMode: true,
          city: true,
          country: true,
          description: true,
          responsibilitiesJson: true,
          requirementsJson: true,
          compensationJson: true,
          applicationQuestionsJson: true,
          companyProfileSnapshot: true,
          applicationMode: true,
          externalShareUrl: true,
          createdAt: true,
          closeAt: true,
          dropzone: { select: { id: true, name: true, slug: true } },
          organization: { select: { id: true, name: true } },
        },
      });

      if (!job) {
        return reply.code(404).send({ success: false, error: "Job not found" });
      }

      // Increment view count (fire-and-forget)
      fastify.prisma.jobPost.update({
        where: { id: job.id },
        data: { viewsCount: { increment: 1 } },
      }).catch(() => {});

      return reply.send({ success: true, data: job });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load job" });
    }
  });

  // GET /public/stays — public rentals (published + approved listings)
  fastify.get("/public/stays", async (request, reply) => {
    try {
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const dropzoneId = query.dropzoneId ? parseInt(query.dropzoneId) : undefined;
      const city = query.city as string | undefined;
      const listingType = query.listingType as string | undefined;

      const where: any = {
        visibility: "PUBLISHED",
        complianceStatus: "APPROVED",
      };
      if (dropzoneId) where.dropzoneId = dropzoneId;
      if (city) where.city = { contains: city };
      if (listingType) where.listingType = listingType;

      const [stays, total] = await Promise.all([
        fastify.prisma.rentalListing.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            listingType: true,
            hostType: true,
            city: true,
            country: true,
            distanceToDropzone: true,
            sleepingCapacity: true,
            bathrooms: true,
            petPolicy: true,
            cancellationPolicy: true,
            bookingMode: true,
            basePrice: true,
            currency: true,
            weeklyDiscount: true,
            monthlyDiscount: true,
            amenities: true,
            skydiverAmenities: true,
            heroImageUrl: true,
          },
        }),
        fastify.prisma.rentalListing.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { stays, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load stays" });
    }
  });

  // GET /public/stays/:id — stay detail
  fastify.get("/public/stays/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const listingId = parseInt(id);

      const stay = await fastify.prisma.rentalListing.findFirst({
        where: {
          id: isNaN(listingId) ? undefined : listingId,
          visibility: "PUBLISHED",
          complianceStatus: "APPROVED",
        },
        include: {
          photos: { select: { id: true, url: true, caption: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
          reviews: {
            select: { id: true, rating: true, title: true, body: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!stay) {
        return reply.code(404).send({ success: false, error: "Stay not found" });
      }

      return reply.send({ success: true, data: stay });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load stay" });
    }
  });

  // GET /public/courses — public course catalog
  fastify.get("/public/courses", async (request, reply) => {
    try {
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const dropzoneId = query.dropzoneId ? parseInt(query.dropzoneId) : undefined;
      const category = query.category as string | undefined;
      const level = query.level as string | undefined;

      const where: any = {
        status: "PUBLISHED",
        visibility: { in: ["PUBLIC", "PLATFORM_ONLY"] },
      };
      if (dropzoneId) where.dropzoneId = dropzoneId;
      if (category) where.category = category;
      if (level) where.level = level;

      const [courses, total] = await Promise.all([
        fastify.prisma.learningCourse.findMany({
          where,
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
          skip: offset,
          take: limit,
          select: {
            id: true,
            uuid: true,
            title: true,
            slug: true,
            shortDescription: true,
            category: true,
            level: true,
            accessType: true,
            coverImageUrl: true,
            estimatedDurationMinutes: true,
            isFeatured: true,
            dropzone: { select: { id: true, name: true, slug: true } },
          },
        }),
        fastify.prisma.learningCourse.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { courses, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load courses" });
    }
  });

  // GET /public/coaches — public coach directory
  fastify.get("/public/coaches", async (request, reply) => {
    try {
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const dropzoneId = query.dropzoneId ? parseInt(query.dropzoneId) : undefined;

      // Coaches are users with COACH, TI, or AFFI roles at a dropzone
      const where: any = {
        role: { name: { in: ["COACH", "TI", "AFFI"] } },
      };
      if (dropzoneId) where.dropzoneId = dropzoneId;

      const [coaches, total] = await Promise.all([
        fastify.prisma.userRole.findMany({
          where,
          skip: offset,
          take: limit,
          select: {
            id: true,
            role: { select: { name: true, displayName: true } },
            dropzone: { select: { id: true, name: true, slug: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profile: {
                  select: {
                    avatar: true,
                    bio: true,
                  },
                },
              },
            },
          },
        }),
        fastify.prisma.userRole.count({ where }),
      ]);

      // Deduplicate by user (a coach may have multiple roles)
      const seen = new Set<number>();
      const uniqueCoaches = coaches.filter((c) => {
        if (seen.has(c.user.id)) return false;
        seen.add(c.user.id);
        return true;
      }).map((c) => ({
        id: c.user.id,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        avatar: c.user.profile?.avatar || null,
        bio: c.user.profile?.bio || null,
        role: c.role.displayName,
        dropzone: c.dropzone,
      }));

      return reply.send({
        success: true,
        data: { coaches: uniqueCoaches, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load coaches" });
    }
  });

  // GET /public/coaches/:id — coach profile detail
  fastify.get("/public/coaches/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const coachId = parseInt(id);
      if (isNaN(coachId)) {
        return reply.code(400).send({ success: false, error: "Invalid coach id" });
      }

      // Verify user has a coach/TI/AFFI role
      const coachRole = await fastify.prisma.userRole.findFirst({
        where: {
          userId: coachId,
          role: { name: { in: ["COACH", "TI", "AFFI"] } },
        },
        select: {
          role: { select: { name: true, displayName: true } },
          dropzone: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!coachRole) {
        return reply.code(404).send({ success: false, error: "Coach not found" });
      }

      // Fetch user profile + all coach roles + instructor skills
      const [user, roles, skills] = await Promise.all([
        fastify.prisma.user.findUnique({
          where: { id: coachId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatar: true,
                bio: true,
              },
            },
          },
        }),
        fastify.prisma.userRole.findMany({
          where: {
            userId: coachId,
            role: { name: { in: ["COACH", "TI", "AFFI"] } },
          },
          select: {
            role: { select: { name: true, displayName: true } },
            dropzone: { select: { id: true, name: true, slug: true } },
          },
        }),
        fastify.prisma.instructorSkill.findMany({
          where: { userId: coachId },
          select: {
            id: true,
            certifiedAt: true,
            expiresAt: true,
            rating: true,
            skillType: {
              select: { code: true, name: true, description: true },
            },
          },
        }),
      ]);

      if (!user) {
        return reply.code(404).send({ success: false, error: "Coach not found" });
      }

      // Compute average rating from instructor skills that have ratings
      const ratedSkills = skills.filter((s) => s.rating != null);
      const averageRating = ratedSkills.length > 0
        ? Math.round((ratedSkills.reduce((sum, s) => sum + s.rating!, 0) / ratedSkills.length) * 10) / 10
        : null;

      return reply.send({
        success: true,
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.profile?.avatar || null,
          bio: user.profile?.bio || null,
          roles: roles.map((r) => ({
            role: r.role.displayName,
            roleCode: r.role.name,
            dropzone: r.dropzone,
          })),
          skills: skills.map((s) => ({
            id: s.id,
            code: s.skillType.code,
            name: s.skillType.name,
            description: s.skillType.description,
            certifiedAt: s.certifiedAt,
            expiresAt: s.expiresAt,
            rating: s.rating,
          })),
          averageRating,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load coach profile" });
    }
  });

  // GET /public/faq — common skydiving FAQs (static, no model needed)
  fastify.get("/public/faq", async (_request, reply) => {
    const faqs = [
      {
        id: 1,
        question: "Is skydiving safe?",
        answer: "Skydiving is an adventure sport with inherent risks, but modern equipment, training protocols, and strict safety regulations have made it remarkably safe. All tandem instructors hold current ratings, and equipment is inspected regularly.",
        category: "SAFETY",
      },
      {
        id: 2,
        question: "What are the age and weight requirements?",
        answer: "You must be at least 18 years old to skydive. Weight limits vary by dropzone but typically range from 200-230 lbs (90-105 kg) for tandem jumps. Contact your local dropzone for specific requirements.",
        category: "REQUIREMENTS",
      },
      {
        id: 3,
        question: "What should I wear?",
        answer: "Wear comfortable, weather-appropriate clothing that allows freedom of movement. Sneakers or athletic shoes that lace up securely are required. Avoid loose jewelry, sandals, or boots.",
        category: "PREPARATION",
      },
      {
        id: 4,
        question: "How long does the whole experience take?",
        answer: "Plan for about 3-4 hours for your first tandem skydive. This includes check-in, training, gearing up, the flight to altitude, and the jump itself. The freefall lasts about 60 seconds, followed by a 5-7 minute canopy ride.",
        category: "EXPERIENCE",
      },
      {
        id: 5,
        question: "What if the weather is bad?",
        answer: "Safety comes first. If conditions are not suitable for jumping (high winds, low clouds, rain, or thunderstorms), your jump will be rescheduled. Weather holds are common and your safety is always the priority.",
        category: "WEATHER",
      },
      {
        id: 6,
        question: "How do I start learning to skydive solo?",
        answer: "The most common paths are the Accelerated Freefall (AFF) program or the static line program. AFF involves ground school followed by a series of instructor-accompanied jumps where you progressively learn skills until you can jump independently.",
        category: "LEARNING",
      },
      {
        id: 7,
        question: "What licenses exist in skydiving?",
        answer: "The USPA (United States Parachute Association) issues A, B, C, and D licenses based on jump count and demonstrated skills. An A license requires 25 jumps, B requires 50, C requires 200, and D requires 500 jumps.",
        category: "LICENSING",
      },
      {
        id: 8,
        question: "Can I bring spectators?",
        answer: "Absolutely! Friends and family are welcome to watch from designated viewing areas. Most dropzones have comfortable spaces where spectators can enjoy the action. Some dropzones also offer video and photo packages.",
        category: "EXPERIENCE",
      },
      {
        id: 9,
        question: "What happens if a parachute does not open?",
        answer: "Every skydiver wears two parachutes - a main and a reserve. If the main parachute malfunctions, skydivers are trained to deploy the reserve. Additionally, an Automatic Activation Device (AAD) will deploy the reserve automatically if needed.",
        category: "SAFETY",
      },
      {
        id: 10,
        question: "How much does it cost to start skydiving?",
        answer: "A tandem skydive typically costs between $200-$300. An AFF course to get your A license can range from $2,500-$4,000 depending on the dropzone and how many additional jumps you need. Many dropzones offer package deals and payment plans.",
        category: "PRICING",
      },
    ];

    return reply.send({ success: true, data: { faqs } });
  });

  // GET /public/announcements — public news items
  fastify.get("/public/announcements", async (request, reply) => {
    try {
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const dropzoneId = query.dropzoneId ? parseInt(query.dropzoneId) : undefined;
      const category = query.category as string | undefined;

      const now = new Date();
      const where: any = {
        publishedAt: { not: null, lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      };
      if (dropzoneId) where.dropzoneId = dropzoneId;
      if (category) where.category = category;

      const [announcements, total] = await Promise.all([
        fastify.prisma.localNewsItem.findMany({
          where,
          orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
          skip: offset,
          take: limit,
          select: {
            id: true,
            title: true,
            body: true,
            category: true,
            imageUrl: true,
            linkUrl: true,
            isPinned: true,
            publishedAt: true,
          },
        }),
        fastify.prisma.localNewsItem.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { announcements, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load announcements" });
    }
  });

  // ========================================================================
  // GROUP 2: WEBSITE MANAGEMENT (admin auth)
  // ========================================================================

  // GET /website/settings — get settings for the user's dropzone
  fastify.get("/website/settings", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    try {
      const dropzoneId = parseInt(String(request.user.dropzoneId));
      if (!dropzoneId || isNaN(dropzoneId)) {
        return reply.code(400).send({ success: false, error: "No dropzone context" });
      }

      let settings = await fastify.prisma.websiteSettings.findUnique({
        where: { dropzoneId },
        include: { pages: { orderBy: { sortOrder: "asc" } } },
      });

      // Auto-create settings if none exist
      if (!settings) {
        const dz = await fastify.prisma.dropzone.findUnique({
          where: { id: dropzoneId },
          select: { name: true },
        });

        settings = await fastify.prisma.websiteSettings.create({
          data: {
            dropzoneId,
            companyName: dz?.name || null,
          },
          include: { pages: { orderBy: { sortOrder: "asc" } } },
        });
      }

      return reply.send({ success: true, data: settings });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load website settings" });
    }
  });

  // PATCH /website/settings — update settings
  fastify.patch("/website/settings", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    try {
      const dropzoneId = parseInt(String(request.user.dropzoneId));
      if (!dropzoneId || isNaN(dropzoneId)) {
        return reply.code(400).send({ success: false, error: "No dropzone context" });
      }

      const body = request.body as any;
      const allowedFields = [
        "companyName", "tagline", "description",
        "primaryColor", "secondaryColor", "accentColor",
        "logoUrl", "faviconUrl", "heroImageUrl",
        "ga4MeasurementId", "gtmContainerId", "metaPixelId",
        "customDomain", "publicManifestEnabled", "accountPortalEnabled",
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Validate color fields
      for (const colorField of ["primaryColor", "secondaryColor", "accentColor"]) {
        if (updateData[colorField] && !HEX_COLOR_REGEX.test(updateData[colorField])) {
          return reply.code(400).send({ success: false, error: `${colorField} must be a valid hex color (e.g. #1A4F8A)` });
        }
      }

      const settings = await fastify.prisma.websiteSettings.upsert({
        where: { dropzoneId },
        create: { dropzoneId, ...updateData },
        update: updateData,
        include: { pages: { orderBy: { sortOrder: "asc" } } },
      });

      return reply.send({ success: true, data: settings });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to update website settings" });
    }
  });

  // GET /website/pages — list pages for the user's dropzone website
  fastify.get("/website/pages", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    try {
      const dropzoneId = parseInt(String(request.user.dropzoneId));
      if (!dropzoneId || isNaN(dropzoneId)) {
        return reply.code(400).send({ success: false, error: "No dropzone context" });
      }

      const settings = await fastify.prisma.websiteSettings.findUnique({
        where: { dropzoneId },
      });

      if (!settings) {
        return reply.send({ success: true, data: { pages: [] } });
      }

      const pages = await fastify.prisma.websitePage.findMany({
        where: { settingsId: settings.id },
        orderBy: { sortOrder: "asc" },
      });

      return reply.send({ success: true, data: { pages } });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load pages" });
    }
  });

  // POST /website/pages — create a page
  fastify.post("/website/pages", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    try {
      const dropzoneId = parseInt(String(request.user.dropzoneId));
      if (!dropzoneId || isNaN(dropzoneId)) {
        return reply.code(400).send({ success: false, error: "No dropzone context" });
      }

      const body = request.body as any;
      const { pageType, title, slug, metaTitle, metaDescription, ogImage, contentBlocks, isPublished, sortOrder, showInNav } = body;

      if (!pageType || !title || !slug) {
        return reply.code(400).send({ success: false, error: "pageType, title, and slug are required" });
      }

      if (!VALID_PAGE_TYPES.includes(pageType)) {
        return reply.code(400).send({ success: false, error: `Invalid pageType. Must be one of: ${VALID_PAGE_TYPES.join(", ")}` });
      }

      // Slug validation: lowercase, alphanumeric with dashes
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
        return reply.code(400).send({ success: false, error: "slug must be lowercase alphanumeric with dashes" });
      }

      // Ensure settings exist (auto-create)
      let settings = await fastify.prisma.websiteSettings.findUnique({ where: { dropzoneId } });
      if (!settings) {
        settings = await fastify.prisma.websiteSettings.create({ data: { dropzoneId } });
      }

      // Check for duplicate slug
      const existing = await fastify.prisma.websitePage.findUnique({
        where: { settingsId_slug: { settingsId: settings.id, slug } },
      });
      if (existing) {
        return reply.code(409).send({ success: false, error: "A page with this slug already exists" });
      }

      const page = await fastify.prisma.websitePage.create({
        data: {
          settingsId: settings.id,
          pageType,
          title,
          slug,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          ogImage: ogImage || null,
          contentBlocks: contentBlocks || null,
          isPublished: isPublished ?? false,
          sortOrder: sortOrder ?? 0,
          showInNav: showInNav ?? true,
        },
      });

      return reply.code(201).send({ success: true, data: page });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to create page" });
    }
  });

  // PATCH /website/pages/:id — update a page
  fastify.patch("/website/pages/:id", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    try {
      const dropzoneId = parseInt(String(request.user.dropzoneId));
      if (!dropzoneId || isNaN(dropzoneId)) {
        return reply.code(400).send({ success: false, error: "No dropzone context" });
      }

      const { id } = request.params as { id: string };
      const pageId = parseInt(id);
      if (isNaN(pageId)) {
        return reply.code(400).send({ success: false, error: "Invalid page id" });
      }

      // Verify page belongs to user's dropzone
      const settings = await fastify.prisma.websiteSettings.findUnique({ where: { dropzoneId } });
      if (!settings) {
        return reply.code(404).send({ success: false, error: "Website settings not found" });
      }

      const existingPage = await fastify.prisma.websitePage.findFirst({
        where: { id: pageId, settingsId: settings.id },
      });
      if (!existingPage) {
        return reply.code(404).send({ success: false, error: "Page not found" });
      }

      const body = request.body as any;
      const allowedFields = [
        "pageType", "title", "slug", "metaTitle", "metaDescription",
        "ogImage", "contentBlocks", "isPublished", "sortOrder", "showInNav",
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Validate pageType if provided
      if (updateData.pageType && !VALID_PAGE_TYPES.includes(updateData.pageType)) {
        return reply.code(400).send({ success: false, error: `Invalid pageType` });
      }

      // Validate slug if changed
      if (updateData.slug && updateData.slug !== existingPage.slug) {
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(updateData.slug)) {
          return reply.code(400).send({ success: false, error: "slug must be lowercase alphanumeric with dashes" });
        }
        const dupeSlug = await fastify.prisma.websitePage.findUnique({
          where: { settingsId_slug: { settingsId: settings.id, slug: updateData.slug } },
        });
        if (dupeSlug) {
          return reply.code(409).send({ success: false, error: "A page with this slug already exists" });
        }
      }

      const page = await fastify.prisma.websitePage.update({
        where: { id: pageId },
        data: updateData,
      });

      return reply.send({ success: true, data: page });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to update page" });
    }
  });

  // POST /website/publish — publish (or unpublish) website
  fastify.post("/website/publish", {
    preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
  }, async (request, reply) => {
    try {
      const dropzoneId = parseInt(String(request.user.dropzoneId));
      if (!dropzoneId || isNaN(dropzoneId)) {
        return reply.code(400).send({ success: false, error: "No dropzone context" });
      }

      const body = request.body as { publish?: boolean };
      const publish = body.publish !== false; // default true

      const settings = await fastify.prisma.websiteSettings.findUnique({ where: { dropzoneId } });
      if (!settings) {
        return reply.code(404).send({ success: false, error: "Website settings not found. Configure your website first." });
      }

      // Validation: must have at least one published page before publishing
      if (publish) {
        const publishedPageCount = await fastify.prisma.websitePage.count({
          where: { settingsId: settings.id, isPublished: true },
        });
        if (publishedPageCount === 0) {
          return reply.code(400).send({ success: false, error: "Cannot publish website without at least one published page" });
        }
      }

      const updated = await fastify.prisma.websiteSettings.update({
        where: { id: settings.id },
        data: { isPublished: publish },
      });

      return reply.send({
        success: true,
        data: {
          isPublished: updated.isPublished,
          message: publish ? "Website is now live" : "Website has been unpublished",
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to update publish status" });
    }
  });

  // ========================================================================
  // GROUP 3: ACCOUNT PORTAL (user auth)
  // ========================================================================

  // GET /account/overview — user's dashboard summary
  fastify.get("/account/overview", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));
      const dropzoneId = request.user.dropzoneId ? parseInt(String(request.user.dropzoneId)) : undefined;

      const [bookingsCount, wallet, activeWaivers, enrollmentsCount] = await Promise.all([
        // Active bookings count
        fastify.prisma.booking.count({
          where: {
            userId,
            status: { in: ["PENDING", "CONFIRMED"] },
            ...(dropzoneId ? { dropzoneId } : {}),
          },
        }),

        // Wallet balance (for current dropzone if scoped)
        dropzoneId
          ? fastify.prisma.wallet.findUnique({
              where: { userId_dropzoneId: { userId, dropzoneId } },
              select: { balance: true, currency: true },
            })
          : null,

        // Active waivers count
        fastify.prisma.waiverSubmission.count({
          where: {
            userId,
            submissionStatus: { in: ["submitted", "signed"] },
          },
        }),

        // Active learning enrollments
        fastify.prisma.learningEnrollment.count({
          where: {
            userId,
            enrollmentStatus: "ENROLLED",
          },
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          bookings: { activeCount: bookingsCount },
          wallet: wallet ? { balanceCents: wallet.balance, currency: wallet.currency } : null,
          waivers: { activeCount: activeWaivers },
          learning: { enrolledCount: enrollmentsCount },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load account overview" });
    }
  });

  // GET /account/bookings — user's bookings
  fastify.get("/account/bookings", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);
      const status = query.status as string | undefined;

      const where: any = { userId };
      if (status) where.status = status;

      const [bookings, total] = await Promise.all([
        fastify.prisma.booking.findMany({
          where,
          orderBy: { scheduledDate: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            uuid: true,
            bookingType: true,
            scheduledDate: true,
            scheduledTime: true,
            status: true,
            notes: true,
            createdAt: true,
            dropzone: { select: { id: true, name: true } },
            package: { select: { id: true, name: true } },
          },
        }),
        fastify.prisma.booking.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { bookings, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load bookings" });
    }
  });

  // GET /account/wallet — wallet balance + recent transactions
  fastify.get("/account/wallet", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));
      const dropzoneId = request.user.dropzoneId ? parseInt(String(request.user.dropzoneId)) : undefined;

      if (!dropzoneId) {
        // Return all wallets if no dropzone context
        const wallets = await fastify.prisma.wallet.findMany({
          where: { userId },
          select: {
            id: true,
            balance: true,
            currency: true,
            dropzone: { select: { id: true, name: true } },
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: {
                id: true,
                type: true,
                amount: true,
                balanceAfter: true,
                description: true,
                createdAt: true,
              },
            },
          },
        });

        return reply.send({ success: true, data: { wallets } });
      }

      const wallet = await fastify.prisma.wallet.findUnique({
        where: { userId_dropzoneId: { userId, dropzoneId } },
        select: {
          id: true,
          balance: true,
          currency: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              type: true,
              amount: true,
              balanceAfter: true,
              description: true,
              createdAt: true,
            },
          },
        },
      });

      if (!wallet) {
        return reply.send({
          success: true,
          data: { wallet: null, message: "No wallet found for this dropzone" },
        });
      }

      return reply.send({ success: true, data: { wallet } });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load wallet" });
    }
  });

  // GET /account/waivers — waiver status
  fastify.get("/account/waivers", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));
      const query = request.query as any;
      const { limit, offset } = paginationParams(query);

      const [waivers, total] = await Promise.all([
        fastify.prisma.waiverSubmission.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            uuid: true,
            submissionStatus: true,
            signerName: true,
            submittedAt: true,
            sourceChannel: true,
            createdAt: true,
            version: {
              select: {
                id: true,
                version: true,
                titleSnapshot: true,
              },
            },
          },
        }),
        fastify.prisma.waiverSubmission.count({ where: { userId } }),
      ]);

      return reply.send({
        success: true,
        data: { waivers, total, limit, offset },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load waivers" });
    }
  });

  // GET /account/learning — enrolled courses + certificates
  fastify.get("/account/learning", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));

      const [enrollments, certificates] = await Promise.all([
        fastify.prisma.learningEnrollment.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            uuid: true,
            enrollmentStatus: true,
            completionPercent: true,
            startedAt: true,
            completedAt: true,
            lastAccessedAt: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                shortDescription: true,
                coverImageUrl: true,
                category: true,
                level: true,
                estimatedDurationMinutes: true,
              },
            },
          },
        }),

        fastify.prisma.learningCertificate.findMany({
          where: { userId, revokedAt: null },
          orderBy: { issueDate: "desc" },
          select: {
            id: true,
            uuid: true,
            title: true,
            certificateType: true,
            issueDate: true,
            expiresAt: true,
            verificationCode: true,
            pdfUrl: true,
            course: {
              select: { id: true, title: true, slug: true },
            },
          },
        }),
      ]);

      return reply.send({
        success: true,
        data: { enrollments, certificates },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load learning data" });
    }
  });

  // GET /account/events — user's event (boogie) registrations
  fastify.get("/account/events", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));

      const registrations = await fastify.prisma.boogieRegistration.findMany({
        where: { userId },
        orderBy: { registeredAt: "desc" },
        select: {
          id: true,
          uuid: true,
          status: true,
          paymentStatus: true,
          registeredAt: true,
          boogie: {
            select: {
              id: true,
              title: true,
              slug: true,
              startDate: true,
              endDate: true,
              status: true,
              eventType: true,
              heroImageUrl: true,
              dropzone: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: {
          registrations: registrations.map((r) => ({
            id: r.id,
            uuid: r.uuid,
            status: r.status,
            paymentStatus: r.paymentStatus,
            registeredAt: r.registeredAt,
            event: {
              id: r.boogie.id,
              title: r.boogie.title,
              slug: r.boogie.slug,
              startDate: r.boogie.startDate,
              endDate: r.boogie.endDate,
              status: r.boogie.status,
              eventType: r.boogie.eventType,
              heroImageUrl: r.boogie.heroImageUrl,
              dropzone: r.boogie.dropzone,
            },
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to load event registrations" });
    }
  });

  // PATCH /account/settings — update user profile fields
  fastify.patch("/account/settings", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const userId = parseInt(String(request.user.sub));
      const body = request.body as {
        firstName?: string;
        lastName?: string;
        phone?: string;
        preferredLanguage?: string;
      };

      // Validate: at least one field must be provided
      const { firstName, lastName, phone, preferredLanguage } = body;
      if (!firstName && !lastName && phone === undefined && !preferredLanguage) {
        return reply.code(400).send({
          success: false,
          error: "At least one field is required: firstName, lastName, phone, preferredLanguage",
        });
      }

      // Build update data with only provided fields
      const updateData: Record<string, string> = {};
      if (firstName) {
        const trimmed = firstName.trim();
        if (trimmed.length < 1 || trimmed.length > 100) {
          return reply.code(400).send({ success: false, error: "firstName must be 1-100 characters" });
        }
        updateData.firstName = trimmed;
      }
      if (lastName) {
        const trimmed = lastName.trim();
        if (trimmed.length < 1 || trimmed.length > 100) {
          return reply.code(400).send({ success: false, error: "lastName must be 1-100 characters" });
        }
        updateData.lastName = trimmed;
      }
      if (phone !== undefined) {
        // Allow empty string to clear phone, otherwise validate length
        const trimmed = phone.trim();
        if (trimmed.length > 20) {
          return reply.code(400).send({ success: false, error: "phone must be at most 20 characters" });
        }
        updateData.phone = trimmed || "";
      }
      if (preferredLanguage) {
        const trimmed = preferredLanguage.trim().toLowerCase();
        if (trimmed.length < 2 || trimmed.length > 10) {
          return reply.code(400).send({ success: false, error: "preferredLanguage must be 2-10 characters (e.g. 'en', 'es', 'pt-BR')" });
        }
        updateData.preferredLanguage = trimmed;
      }

      const updatedUser = await fastify.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          preferredLanguage: true,
          updatedAt: true,
        },
      });

      return reply.send({ success: true, data: updatedUser });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: "Failed to update settings" });
    }
  });
}
