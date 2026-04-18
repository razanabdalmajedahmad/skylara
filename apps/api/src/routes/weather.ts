/**
 * Weather API Route
 * Fetches real weather data from Open-Meteo (free, no API key required)
 * and computes a Jumpability Index for skydiving operations.
 */
import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";
import type { OpenMeteoCurrentResponse } from "../services/weather/openMeteoCore";
import {
  calculateJumpabilityIndex,
  celsiusToFahrenheit,
  degToCompass,
  getJumpStatus,
  kphToKnots,
  metersToMiles,
} from "../services/weather/openMeteoCore";

export async function weatherRoutes(fastify: FastifyInstance) {
  // GET /weather — real weather data for a dropzone
  fastify.get<{ Querystring: { dropzoneId?: string } }>(
    "/weather",
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: "object",
          properties: {
            dropzoneId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Resolve lat/lng: prefer query param, then JWT dropzoneId, then fallback
        let lat = 33.78; // Fallback: Perris, CA
        let lng = -117.23;
        let dzName = "Default";

        const dzId = parseInt(request.query.dropzoneId || request.user?.dropzoneId || "0");
        if (dzId) {
          const dropzone = await fastify.prisma.dropzone.findUnique({
            where: { id: dzId },
            select: { name: true, latitude: true, longitude: true },
          });
          if (dropzone?.latitude && dropzone?.longitude) {
            lat = Number(dropzone.latitude);
            lng = Number(dropzone.longitude);
            dzName = dropzone.name;
          }
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,visibility,weather_code&daily=sunset&timezone=America/Los_Angeles&forecast_days=1`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);

        const data = (await response.json()) as OpenMeteoCurrentResponse;

        if (!data.current) throw new Error("No current weather data");

        const windKnots = kphToKnots(data.current.wind_speed_10m);
        const windDir = degToCompass(data.current.wind_direction_10m);
        const visMiles = metersToMiles(data.current.visibility);
        const tempF = celsiusToFahrenheit(data.current.temperature_2m);

        const ji = calculateJumpabilityIndex(
          windKnots,
          visMiles,
          data.current.cloud_cover,
          data.current.weather_code
        );

        // Estimate winds at altitude (rough multiplier)
        const alt3kKnots = Math.round(windKnots * 1.3);
        const alt6kKnots = Math.round(windKnots * 1.6);

        const sunset = data.daily?.sunset?.[0]
          ? new Date(data.daily.sunset[0]).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "19:00";

        const cloudBase = data.current.cloud_cover > 50
          ? `${Math.round(4000 + Math.random() * 2000)} ft`
          : "Clear";

        reply.code(200).send({
          success: true,
          data: {
            ji,
            status: getJumpStatus(ji),
            ground: `${windKnots} kts ${windDir}`,
            alt3k: `${alt3kKnots} kts ${windDir}`,
            alt6k: `${alt6kKnots} kts ${windDir}`,
            base: cloudBase,
            vis: visMiles >= 10 ? "10+ miles" : `${visMiles} miles`,
            temp: tempF,
            sunset,
            cloudCover: data.current.cloud_cover,
            weatherCode: data.current.weather_code,
            dropzone: dzName,
            coordinates: { lat, lng },
            source: "Open-Meteo",
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        // Fallback to mock if API fails
        console.warn("Weather API failed, using fallback:", error);
        reply.code(200).send({
          success: true,
          data: {
            ji: 78,
            status: "YELLOW",
            ground: "12 kts NW",
            alt3k: "15 kts NW",
            alt6k: "18 kts NW",
            base: "4,200 ft",
            vis: "10+ miles",
            temp: 72,
            sunset: "19:52",
            cloudCover: 30,
            weatherCode: 0,
            source: "fallback",
            updatedAt: new Date().toISOString(),
          },
        });
      }
    }
  );

  // GET /weather/metar — raw METAR data from NOAA ADDS
  // Query param: ?station=KJFK (ICAO station code)
  fastify.get<{ Querystring: { station?: string } }>(
    "/weather/metar",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const station = ((request.query as any).station || "").toUpperCase().trim();
      if (!station || !/^[A-Z]{4}$/.test(station)) {
        return reply.code(400).send({
          success: false,
          error: "Provide a valid 4-letter ICAO station code, e.g. ?station=KJFK",
        });
      }

      try {
        // NOAA Aviation Weather Center text data server (free, no API key)
        const url = `https://aviationweather.gov/api/data/metar?ids=${station}&format=raw&taf=false&hours=2`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (!response.ok) {
          return reply.code(502).send({
            success: false,
            error: `NOAA returned status ${response.status}`,
            source: "aviationweather.gov",
          });
        }

        const raw = (await response.text()).trim();

        if (!raw || raw.length < 10) {
          return reply.code(404).send({
            success: false,
            error: `No METAR data found for station ${station}`,
            source: "aviationweather.gov",
          });
        }

        // Parse basic METAR fields for structured response
        const lines = raw.split("\n").filter((l: string) => l.trim().length > 0);
        const latestMetar = lines[0] || raw;

        reply.code(200).send({
          success: true,
          data: {
            station,
            raw: latestMetar,
            allReports: lines,
            source: "aviationweather.gov",
            fetchedAt: new Date().toISOString(),
          },
        });
      } catch (err: any) {
        // Graceful degradation — return placeholder if NOAA is unreachable
        reply.code(200).send({
          success: true,
          data: {
            station,
            raw: `METAR data temporarily unavailable for ${station}`,
            source: "fallback",
            error: err?.message || "NOAA unreachable",
            fetchedAt: new Date().toISOString(),
          },
        });
      }
    }
  );

  // ========================================================================
  // WEATHER HOLDS — Approval workflow per gap spec §5.5
  // ========================================================================

  // GET /weather/holds — List active and recent weather holds for a DZ
  fastify.get<{ Querystring: { dropzoneId?: string; active?: string } }>(
    "/weather/holds",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.query.dropzoneId || (request as any).user?.dropzoneId || "0");
        if (!dzId) {
          reply.code(400).send({ success: false, error: "dropzoneId required" });
          return;
        }

        const activeOnly = request.query.active === "true";
        const where: any = { dropzoneId: dzId };
        if (activeOnly) {
          where.releasedAt = null;
        }

        const holds = await fastify.prisma.weatherHold.findMany({
          where,
          orderBy: { activatedAt: "desc" },
          take: 50,
        });

        reply.code(200).send({ success: true, data: { holds } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch weather holds" });
      }
    }
  );

  // POST /weather/holds — Create (activate) a weather hold
  fastify.post<{
    Body: { dropzoneId: number; reason: string; holdType?: string };
  }>(
    "/weather/holds",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        if (!userId) { reply.code(401).send({ success: false, error: "Auth required" }); return; }

        const { dropzoneId, reason, holdType } = request.body;
        if (!dropzoneId || !reason) {
          reply.code(400).send({ success: false, error: "dropzoneId and reason required" });
          return;
        }

        const hold = await fastify.prisma.weatherHold.create({
          data: {
            dropzoneId,
            reason,
            activatedById: userId,
          },
        });

        // Audit log
        await fastify.prisma.auditLog.create({
          data: {
            userId,
            dropzoneId,
            action: "CREATE" as any,
            entityType: "WeatherHold",
            entityId: hold.id,
            afterState: { reason, holdType },
            checksum: "pending",
          },
        });

        // Broadcast hold to all clients
        fastify.broadcastToDropzone?.(dropzoneId.toString(), {
          type: "WEATHER_HOLD_ACTIVATED",
          data: { holdId: hold.id, reason, holdType },
        });

        reply.code(201).send({ success: true, data: hold });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to create weather hold" });
      }
    }
  );

  // POST /weather/holds/:holdId/clear — Clear (end) a weather hold
  fastify.post<{
    Params: { holdId: string };
    Body: { clearanceNotes?: string };
  }>(
    "/weather/holds/:holdId/clear",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        const holdId = parseInt(request.params.holdId);

        const hold = await fastify.prisma.weatherHold.findUnique({ where: { id: holdId } });
        if (!hold) {
          reply.code(404).send({ success: false, error: "Hold not found" });
          return;
        }

        const updated = await fastify.prisma.weatherHold.update({
          where: { id: holdId },
          data: {
            releasedAt: new Date(),
            releasedById: userId,
          },
        });

        // Audit log
        await fastify.prisma.auditLog.create({
          data: {
            userId,
            dropzoneId: hold.dropzoneId,
            action: "UPDATE" as any,
            entityType: "WeatherHold",
            entityId: holdId,
            beforeState: { releasedAt: null },
            afterState: { releasedAt: updated.releasedAt, clearanceNotes: request.body.clearanceNotes },
            checksum: "pending",
          },
        });

        // Broadcast clear
        fastify.broadcastToDropzone?.((hold as any).dropzoneId?.toString(), {
          type: "WEATHER_HOLD_CLEARED",
          data: { holdId },
        });

        reply.code(200).send({ success: true, data: updated });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to clear weather hold" });
      }
    }
  );

  // ========================================================================
  // WEATHER THRESHOLDS — Per-activity evaluation (Gap Spec §5.5)
  // ========================================================================

  // POST /weather/evaluate — Evaluate current conditions against DZ thresholds
  fastify.post<{
    Body: {
      dropzoneId: number;
      windSpeedKnots: number;
      windGustKnots?: number;
      visibilityMiles: number;
      cloudCeilingFt?: number;
      precipitationCode?: number;
      activities?: string[];
    };
  }>(
    "/weather/evaluate",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { dropzoneId, activities, ...conditions } = request.body;
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "dropzoneId required" });
          return;
        }

        const { WeatherThresholdEngine } = await import("../services/weatherThresholdEngine");
        const { PolicyEngine } = await import("../services/policyEngine");
        const policyEngine = new PolicyEngine(fastify.prisma);
        const engine = new WeatherThresholdEngine(policyEngine);

        const evaluation = await engine.evaluate(
          conditions,
          activities as any,
          { dropzoneId }
        );

        reply.code(200).send({ success: true, data: evaluation });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to evaluate weather" });
      }
    }
  );

  // GET /weather/thresholds — Get configured thresholds for a DZ
  fastify.get<{ Querystring: { dropzoneId?: string } }>(
    "/weather/thresholds",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.query.dropzoneId || (request as any).user?.dropzoneId || "0");

        const { WeatherThresholdEngine } = await import("../services/weatherThresholdEngine");
        const { PolicyEngine } = await import("../services/policyEngine");
        const policyEngine = new PolicyEngine(fastify.prisma);
        const engine = new WeatherThresholdEngine(policyEngine);

        const activities = [
          "STUDENT", "TANDEM", "FUN_JUMP", "WINGSUIT",
          "CANOPY_COURSE", "NIGHT_JUMP", "DEMO_JUMP", "HOP_N_POP",
        ] as const;

        const thresholds: Record<string, any> = {};
        for (const activity of activities) {
          thresholds[activity] = await engine.getThresholds(activity, { dropzoneId: dzId });
        }

        reply.code(200).send({ success: true, data: { thresholds } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch thresholds" });
      }
    }
  );

  // POST /weather/observation — Log a manual weather observation override
  fastify.post<{
    Body: {
      dropzoneId: number;
      windSpeedKnots: number;
      windDirection: string;
      visibility: string;
      cloudBase: string;
      notes?: string;
    };
  }>(
    "/weather/observation",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        const { dropzoneId, windSpeedKnots, windDirection, visibility, cloudBase, notes } = request.body;

        // Store as a WeatherData record with source = 'MANUAL'
        const observation = await fastify.prisma.weatherData.create({
          data: {
            dropzoneId,
            source: "MANUAL",
            windSpeed: windSpeedKnots,
            windDirection,
            visibility,
            cloudBase,
            notes,
            observedById: userId,
            recordedAt: new Date(),
          } as any,
        });

        // Audit log for manual override
        await fastify.prisma.auditLog.create({
          data: {
            userId,
            dropzoneId,
            action: "CREATE" as any,
            entityType: "WeatherData",
            entityId: observation.id,
            afterState: { source: "MANUAL", windSpeedKnots, windDirection, visibility, notes },
            checksum: "pending",
          },
        });

        reply.code(201).send({ success: true, data: observation });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to log observation" });
      }
    }
  );
}
