import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { getEnv } from "../utils/env";
import { buildAssistantPrometheusMetrics } from "../services/ai/assistantPrometheusExport";
import { getAssistantPrometheusMetricsCached } from "../services/ai/assistantPrometheusCache";

// ============================================================================
// OBSERVABILITY PLUGIN
// Structured request logging, response time tracking, metrics endpoint.
// ============================================================================

interface RequestMetrics {
  totalRequests: number;
  totalErrors: number;
  statusCodes: Record<string, number>;
  routeLatencies: Record<string, { count: number; totalMs: number; maxMs: number }>;
  startedAt: Date;
}

const metrics: RequestMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  statusCodes: {},
  routeLatencies: {},
  startedAt: new Date(),
};

async function observabilityPlugin(fastify: FastifyInstance) {
  // Add request timing
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    (request as any).__startTime = process.hrtime.bigint();
  });

  // Log completed requests with structured data
  fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).__startTime as bigint | undefined;
    const durationMs = startTime
      ? Number(process.hrtime.bigint() - startTime) / 1_000_000
      : 0;

    const statusCode = reply.statusCode;
    const route = request.routeOptions?.url || request.url;
    const method = request.method;
    const routeKey = `${method} ${route}`;

    // Update metrics
    metrics.totalRequests++;
    metrics.statusCodes[String(statusCode)] = (metrics.statusCodes[String(statusCode)] || 0) + 1;

    if (statusCode >= 500) {
      metrics.totalErrors++;
    }

    if (!metrics.routeLatencies[routeKey]) {
      metrics.routeLatencies[routeKey] = { count: 0, totalMs: 0, maxMs: 0 };
    }
    const routeMetric = metrics.routeLatencies[routeKey];
    routeMetric.count++;
    routeMetric.totalMs += durationMs;
    if (durationMs > routeMetric.maxMs) routeMetric.maxMs = durationMs;

    // Structured log for slow requests (>1s) or errors
    if (durationMs > 1000 || statusCode >= 500) {
      fastify.log.warn({
        msg: "slow_or_error_request",
        method,
        url: request.url,
        route,
        statusCode,
        durationMs: Math.round(durationMs),
        userId: (request as any).user?.sub,
        dropzoneId: (request as any).user?.dropzoneId,
        requestId: request.id,
      });
    }
  });

  // GET /metrics — lightweight metrics endpoint (admin only)
  fastify.get("/metrics", async (_request, reply) => {
    const uptimeMs = Date.now() - metrics.startedAt.getTime();

    // Compute top routes by latency
    const topRoutes = Object.entries(metrics.routeLatencies)
      .map(([route, m]) => ({
        route,
        count: m.count,
        avgMs: Math.round(m.totalMs / m.count),
        maxMs: Math.round(m.maxMs),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    reply.code(200).send({
      success: true,
      data: {
        uptime: {
          ms: uptimeMs,
          human: `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m`,
        },
        requests: {
          total: metrics.totalRequests,
          errors: metrics.totalErrors,
          errorRate: metrics.totalRequests > 0
            ? `${((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2)}%`
            : "0%",
        },
        statusCodes: metrics.statusCodes,
        topRoutes,
      },
    });
  });

  // GET /metrics/prometheus — scrape-friendly export (Phase 13)
  fastify.get("/metrics/prometheus", {
    config: {
      rateLimit: {
        max: getEnv().METRICS_PROMETHEUS_RATE_LIMIT_MAX ?? 60,
        timeWindow: getEnv().METRICS_PROMETHEUS_RATE_LIMIT_WINDOW_MS ?? 60_000,
      },
    },
  }, async (request, reply) => {
    const env = getEnv();
    const bearer = env.METRICS_BEARER_TOKEN;
    // In production, require auth by default. In dev/test, allow unauthenticated unless token is set.
    const requireAuth = env.NODE_ENV === "production" || Boolean(bearer);
    if (requireAuth) {
      const auth = request.headers.authorization || "";
      if (!bearer || auth !== `Bearer ${bearer}`) {
        return reply.code(401).send({ success: false, error: "Unauthorized" });
      }
    }

    const prisma = (fastify as any).prisma as any;
    if (!prisma) {
      return reply.code(503).send("# prisma_unavailable 1\n");
    }

    const ttlMs = env.METRICS_PROMETHEUS_CACHE_TTL_MS ?? 10_000;
    const cached = await getAssistantPrometheusMetricsCached(prisma, { ttlMs }).catch(() => null);
    const body = cached?.body ?? (await buildAssistantPrometheusMetrics(prisma).catch(() => "# metrics_build_failed 1\n"));
    reply.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    reply.header("Cache-Control", "no-store"); // avoid intermediaries caching sensitive operational data
    if (cached) {
      reply.header("X-Metrics-Cache", cached.cache.hit ? (cached.cache.stale ? "stale" : "hit") : "miss");
      reply.header("X-Metrics-Cache-Age-Ms", String(Math.max(0, Math.floor(cached.cache.ageMs))));
    }
    return reply.code(200).send(body);
  });
}

export default fp(observabilityPlugin, {
  name: "observability",
});
