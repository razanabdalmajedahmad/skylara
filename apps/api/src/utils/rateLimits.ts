/**
 * Endpoint-specific rate limit configs.
 * Apply via { config: { rateLimit: authRateLimit } } on sensitive routes.
 *
 * @fastify/rate-limit supports per-route overrides when passed in route config.
 */

/** Auth endpoints: login, register, forgot-password — 10 req/min per IP */
export const authRateLimit = {
  max: 10,
  timeWindow: "1 minute",
  keyGenerator: (request: any) => request.ip,
};

/** Payment mutations: charge, refund, payout — 20 req/min per user */
export const paymentRateLimit = {
  max: 20,
  timeWindow: "1 minute",
  keyGenerator: (request: any) => {
    const user = request.user;
    return user?.sub ? `pay:${user.sub}` : request.ip;
  },
};

/** Webhook endpoints (Stripe, etc.) — higher limit, keyed by IP */
export const webhookRateLimit = {
  max: 200,
  timeWindow: "1 minute",
  keyGenerator: (request: any) => `webhook:${request.ip}`,
};

/** Admin/bulk endpoints — moderate limit per user */
export const adminRateLimit = {
  max: 30,
  timeWindow: "1 minute",
  keyGenerator: (request: any) => {
    const user = request.user;
    return user?.sub ? `admin:${user.sub}` : request.ip;
  },
};
