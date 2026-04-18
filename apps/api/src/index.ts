import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { AppError } from "./utils/errors";
import { validateEnv } from "./utils/env";

// Validate environment on startup
const env = validateEnv();

// Plugins
import prismaPlugin from "./plugins/prisma";
import authPlugin from "./plugins/auth";
import websocketPlugin from "./plugins/websocket";
import notificationsPlugin from "./plugins/notifications";
import circuitBreakerPlugin from "./plugins/circuitBreaker";
import responseCachePlugin from "./plugins/responseCache";
import observabilityPlugin from "./plugins/observability";

// Middleware
import { authenticate } from "./middleware/authenticate";

// Routes
import { authRoutes } from "./routes/auth";
import { identityRoutes } from "./routes/identity";
import { manifestRoutes } from "./routes/manifest";
import { paymentsRoutes } from "./routes/payments";
import { gearRoutes } from "./routes/gear";
import { safetyRoutes } from "./routes/safety";
import { notificationsRoutes } from "./routes/notifications";
import { adminRoutes } from "./routes/admin";
import { syncRoutes, mobileBootstrapRoutes } from "./routes/sync";
import { supportRoutes } from "./routes/supportIndex";
import { weatherRoutes } from "./routes/weather";
import { reportsRoutes } from "./routes/reports";
import { authAdvancedRoutes } from "./routes/authAdvanced";
import { onboardingRoutes } from "./routes/onboarding";
import { notificationsAdvancedRoutes } from "./routes/notificationsAdvanced";
import { paymentsAdvancedRoutes } from "./routes/paymentsAdvanced";
import { assistantAdvancedRoutes } from "./routes/assistantAdvanced";
import { assistantOrgRolloutRoutes } from "./routes/assistantOrgRollout";
// portalAssistantRoutes registered via supportRoutes (supportIndex.ts)
import { reportBuilderRoutes } from "./routes/reportBuilder";
import { aircraftRoutes } from "./routes/aircraft";
import { instructorRoutes } from "./routes/instructors";
import { trainingRoutes } from "./routes/training";
import { bookingRoutes } from "./routes/booking";
import { waiverRoutes } from "./routes/waivers";
import { waiverCenterRoutes } from "./routes/waiverCenter";
import { onboardingCenterRoutes } from "./routes/onboardingCenter";
import { notificationCenterRoutes } from "./routes/notificationCenter";
import { coachingRoutes } from "./routes/coaching";
import { brandingRoutes } from "./routes/branding";
import { boogieRoutes } from "./routes/boogies";
import { partnerOnboardingRoutes } from "./routes/partnerOnboarding";
import { logbookRoutes } from "./routes/logbook";
import { chatRoutes } from "./routes/chat";
import { rigMaintenanceRoutes } from "./routes/rig-maintenance";
import { socialRoutes } from "./routes/social";
import { shopRoutes } from "./routes/shop";
import { localizationRoutes } from "./routes/localization";
import { policyRoutes } from "./routes/policies";
import { verificationRoutes } from "./routes/verifications";
import { careersRoutes } from "./routes/careers";
import { learningRoutes } from "./routes/learning";
import { featureFlagRoutes } from "./routes/featureFlags";
import { uploadRoutes } from "./routes/uploads";
import { opsMessagingRoutes } from "./routes/opsMessaging";
import { dlqRoutes } from "./routes/dlq";
import { migrationRoutes } from "./routes/migration";
import { dataManagementRoutes } from "./routes/dataManagement";
import { manifestAgentRoutes } from "./routes/manifestAgent";
import { federationRoutes } from "./routes/federation";
import { giftCardRoutes } from "./routes/giftCards";
import { marketingRoutes } from "./routes/marketing";
import { rentalsRoutes } from "./routes/rentals";
import { venueCommercialRoutes } from "./routes/venueCommercial";
import { publicPortalRoutes } from "./routes/publicPortal";
import { platformRoutes } from "./routes/platform";
import { platformAdvancedRoutes } from "./routes/platformAdvanced";
// helpCenterRoutes, ideasNotesRoutes, walkthroughsRoutes registered via supportRoutes
import { createEventOutboxRelay } from "./services/eventOutboxRelay";

async function start() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    bodyLimit: 20_971_520, // 20MB max request body (supports base64 photo uploads in local mode)
  });

  // Security: Helmet for HTTP headers
  await fastify.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
  });

  // Security: CORS — no wildcard in production
  const corsOrigins = env.CORS_ORIGIN.includes(",")
    ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : env.CORS_ORIGIN;
  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Security: Rate limiting — per-user + per-tenant keying
  // Three-tier key: per-user (if auth'd), per-tenant (dropzone), per-IP (anonymous)
  // This prevents one DZ's traffic from starving others.
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    allowList: env.NODE_ENV === "development" ? ["127.0.0.1"] : [],
    keyGenerator: (request) => {
      const user = (request as any).user;
      if (user?.sub && user?.dropzoneId) {
        return `tenant:${user.dropzoneId}:user:${user.sub}`;
      }
      if (user?.sub) return `user:${user.sub}`;
      return request.ip;
    },
  });

  // JWT setup — RS256 in production (with key pair), HS256 in dev
  const useRS256 = !!(env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY);
  await fastify.register(fastifyJwt, {
    secret: useRS256
      ? { public: env.JWT_PUBLIC_KEY!, private: env.JWT_PRIVATE_KEY! }
      : (env.JWT_SECRET || "dev-secret-change-me-in-production-min-32-chars!!"),
    sign: { algorithm: useRS256 ? "RS256" : "HS256" },
  });

  // Prisma plugin
  await fastify.register(prismaPlugin);

  // Auth plugin
  await fastify.register(authPlugin);

  // WebSocket plugin
  await fastify.register(websocketPlugin);

  // Notifications plugin
  await fastify.register(notificationsPlugin);

  // Circuit breaker registry for external services
  await fastify.register(circuitBreakerPlugin);

  // Response cache for high-traffic endpoints
  await fastify.register(responseCachePlugin);
  await fastify.register(observabilityPlugin);

  // Request ID correlation — propagate to responses and downstream services
  fastify.addHook("onSend", async (request, reply, payload) => {
    if (!reply.sent) {
      reply.header("X-Request-Id", request.id);
      reply.header("X-API-Version", "1");
    }
    return payload;
  });

  // API versioning — /api/v1/* rewrites to /api/* for forward compatibility
  // When v2 is needed, add a separate route tree under /api/v2
  fastify.addHook("onRequest", async (request) => {
    if (request.url.startsWith("/api/v1/")) {
      (request as any).raw.url = request.url.replace("/api/v1/", "/api/");
    }
  });

  // Health check endpoint — probes database, Redis, S3, circuit breakers
  fastify.get("/health", async (request, reply) => {
    const checks: Record<string, string> = {};
    let healthy = true;
    let degraded = false;

    // Database connectivity (critical — if down, system is down)
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
      healthy = false;
    }

    // Redis connectivity (non-critical — system degrades but functions)
    if (env.REDIS_URL) {
      try {
        // Lightweight check: attempt TCP connect to Redis host
        const url = new URL(env.REDIS_URL);
        const net = await import("net");
        const redisOk = await new Promise<boolean>((resolve) => {
          const socket = net.createConnection(
            { host: url.hostname, port: parseInt(url.port || "6379"), timeout: 2000 },
            () => { socket.destroy(); resolve(true); }
          );
          socket.on("error", () => { socket.destroy(); resolve(false); });
          socket.on("timeout", () => { socket.destroy(); resolve(false); });
        });
        checks.redis = redisOk ? "ok" : "error";
        if (!redisOk) degraded = true;
      } catch {
        checks.redis = "error";
        degraded = true;
      }
    } else {
      checks.redis = "not_configured";
    }

    // S3 connectivity (non-critical — uploads unavailable but ops continue)
    if (env.S3_BUCKET_NAME && env.AWS_ACCESS_KEY_ID) {
      try {
        const { S3Service } = await import("./services/s3Service");
        const s3 = new S3Service();
        const available = await s3.isAvailable();
        checks.s3 = available ? "ok" : "error";
        if (!available) degraded = true;
      } catch {
        checks.s3 = "error";
        degraded = true;
      }
    } else {
      checks.s3 = "not_configured";
    }

    // Circuit breaker states
    if (fastify.circuitBreakers) {
      const breakers = fastify.circuitBreakers.getAll();
      const openBreakers = breakers.filter(b => b.state === "OPEN");
      checks.circuitBreakers = openBreakers.length === 0
        ? "ok"
        : `degraded (${openBreakers.map(b => b.name).join(", ")} OPEN)`;
      if (openBreakers.length > 0) degraded = true;
    }

    const status = !healthy ? "unhealthy" : degraded ? "degraded" : "ok";

    reply.code(healthy ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      uptime: Math.floor(process.uptime()),
      checks,
    });
  });

  // Register route plugins under /api prefix
  await fastify.register(async function apiRoutes(api) {
    await api.register(authRoutes);
    // Assistant (portal + advanced) — register early; org prompt + rollout live in assistantOrgRolloutRoutes
    await api.register(assistantAdvancedRoutes);
    await api.register(assistantOrgRolloutRoutes);
    await api.register(identityRoutes);
    await api.register(manifestRoutes);
    await api.register(paymentsRoutes);
    await api.register(gearRoutes);
    await api.register(safetyRoutes);
    await api.register(notificationsRoutes);
    await api.register(adminRoutes);
    await api.register(syncRoutes);
    await api.register(mobileBootstrapRoutes);
    await api.register(supportRoutes);
    await api.register(weatherRoutes);
    await api.register(reportsRoutes);
    await api.register(authAdvancedRoutes);
    await api.register(onboardingRoutes);
    await api.register(notificationsAdvancedRoutes);
    await api.register(paymentsAdvancedRoutes);
    // portalAssistantRoutes already registered via supportRoutes (line 137); assistantAdvancedRoutes registered above after authRoutes
    await api.register(reportBuilderRoutes);
    await api.register(aircraftRoutes);
    await api.register(instructorRoutes);
    await api.register(trainingRoutes);
    await api.register(bookingRoutes);
    await api.register(waiverRoutes);
    await api.register(waiverCenterRoutes);
    await api.register(onboardingCenterRoutes);
    await api.register(notificationCenterRoutes);
    await api.register(coachingRoutes);
    await api.register(brandingRoutes);
    await api.register(boogieRoutes);
    await api.register(partnerOnboardingRoutes);
    await api.register(logbookRoutes);
    await api.register(chatRoutes);
    await api.register(rigMaintenanceRoutes);
    await api.register(socialRoutes);
    await api.register(shopRoutes);
    await api.register(localizationRoutes);
    await api.register(policyRoutes);
    await api.register(verificationRoutes);
    await api.register(careersRoutes);
    await api.register(learningRoutes);
    await api.register(featureFlagRoutes);
    await api.register(uploadRoutes);
    await api.register(opsMessagingRoutes);
    await api.register(dlqRoutes);
    await api.register(migrationRoutes);
    await api.register(dataManagementRoutes);
    await api.register(manifestAgentRoutes);
    await api.register(federationRoutes);
    await api.register(giftCardRoutes);
    await api.register(marketingRoutes);
    await api.register(rentalsRoutes);
    await api.register(venueCommercialRoutes);
    await api.register(publicPortalRoutes);
    await api.register(platformRoutes);
    await api.register(platformAdvancedRoutes);
    // helpCenterRoutes, ideasNotesRoutes, walkthroughsRoutes, portalAssistantRoutes
    // are already registered via supportRoutes (supportIndex.ts) at line 137
  }, { prefix: '/api' });

  // ── Local file upload fallback (when S3 is not configured) ──────────────
  // Serves files from the `uploads/` directory at GET /uploads/*
  // and accepts local file uploads at POST /uploads/local
  {
    const fs = await import("fs");
    const pathMod = await import("path");
    const { S3Service } = await import("./services/s3Service");
    const uploadsDir = S3Service.getUploadsDir();

    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // GET /uploads/* — serve local files
    fastify.get("/uploads/*", async (request, reply) => {
      const urlPath = (request.params as { "*": string })["*"];
      if (!urlPath) {
        reply.code(400).send({ error: "Missing file path" });
        return;
      }

      // Prevent path traversal
      const safePath = pathMod.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
      const filePath = pathMod.join(uploadsDir, safePath);

      if (!filePath.startsWith(uploadsDir)) {
        reply.code(403).send({ error: "Forbidden" });
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        reply.code(404).send({ error: "File not found" });
        return;
      }

      // Determine content type from extension
      const ext = pathMod.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf",
        ".mp4": "video/mp4", ".mov": "video/quicktime",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";

      reply.type(contentType);
      return reply.send(fs.createReadStream(filePath));
    });

    // POST /uploads/local — accept base64-encoded file data and save to disk
    fastify.post("/uploads/local", async (request, reply) => {
      try {
        const body = request.body as { fileKey: string; data: string; contentType?: string };

        if (!body.fileKey || !body.data) {
          reply.code(400).send({ success: false, error: "fileKey and data (base64) are required" });
          return;
        }

        // Prevent path traversal
        const safePath = pathMod.normalize(body.fileKey).replace(/^(\.\.(\/|\\|$))+/, "");
        const filePath = pathMod.join(uploadsDir, safePath);

        if (!filePath.startsWith(uploadsDir)) {
          reply.code(403).send({ success: false, error: "Invalid file key" });
          return;
        }

        // Ensure directory exists
        const dir = pathMod.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        const buffer = Buffer.from(body.data, "base64");
        fs.writeFileSync(filePath, buffer);

        const port = env.PORT || 3001;
        const host = env.HOST === "0.0.0.0" ? "localhost" : (env.HOST || "localhost");
        const publicUrl = `http://${host}:${port}/uploads/${safePath}`;

        reply.code(201).send({
          success: true,
          data: { fileKey: safePath, url: publicUrl, size: buffer.length },
        });
      } catch (error: any) {
        reply.code(500).send({ success: false, error: error.message || "Failed to save file" });
      }
    });

    fastify.log.info(`[Uploads] Local file serving enabled at /uploads/ (dir: ${uploadsDir})`);
  }

  // Global error handler — standardized 5-digit error codes from @repo/config
  fastify.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
        requestId,
      });
    } else if (error.statusCode === 429) {
      reply.code(429).send({
        success: false,
        error: "Too many requests. Please try again later.",
        code: "70004",
        requestId,
      });
    } else if (error.statusCode === 400) {
      reply.code(400).send({
        success: false,
        error: "Validation failed",
        code: "20001",
        details: error.message,
        requestId,
      });
    } else {
      fastify.log.error(error);
      reply.code(500).send({
        success: false,
        error: env.NODE_ENV === "production" ? "Internal server error" : error.message,
        code: "70001",
        requestId,
      });
    }
  });

  try {
    // Start event outbox relay for financial event processing
    const outboxRelay = createEventOutboxRelay(fastify.prisma);
    outboxRelay.start();
    fastify.addHook("onClose", () => outboxRelay.stop());

    await fastify.listen({ port: env.PORT, host: env.HOST });
    fastify.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Prevent ERR_HTTP_HEADERS_SENT from crashing the process
// This is a known edge-case with Fastify 4.x + Node.js v24
process.on("uncaughtException", (err) => {
  if ((err as any).code === "ERR_HTTP_HEADERS_SENT") {
    // Non-fatal — response was already delivered to client; suppress crash
    return;
  }
  console.error("[FATAL] Uncaught exception:", err);
  process.exit(1);
});

start();
