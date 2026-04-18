import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine(
      (val) => !val.includes("change-me") && !val.includes("dev-secret"),
      {
        message: "JWT_SECRET must not use default dev value in production",
      }
    )
    .optional()
    .or(z.literal(undefined)),

  // Server
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // JWT keys (optional — RS256 in production)
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),

  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(31).default(12),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // WebAuthn (optional)
  WEBAUTHN_RP_ID: z.string().default("localhost"),
  WEBAUTHN_ORIGIN: z.string().default("http://localhost:3000"),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Redis (optional — used for caching, rate limiting, real-time)
  REDIS_URL: z.string().optional(),

  // AWS S3 (optional — file uploads)
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  // SendGrid (optional — email)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // Twilio (optional — SMS / WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // Push — Expo (abstracts FCM/APNs for mobile)
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // Push — Web Push VAPID (browser push notifications)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // Frontend URL (for email links, redirects)
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Sentry (optional — error tracking)
  SENTRY_DSN: z.string().optional(),

  // Weather API (optional)
  WEATHER_API_KEY: z.string().optional(),
  WEATHER_API_URL: z.string().optional(),

  // Anthropic Claude (optional — assistant; no key = local fallback)
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().int().positive().max(200_000).optional(),
  ANTHROPIC_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).optional(),
  ANTHROPIC_API_VERSION: z.string().optional(),
  ANTHROPIC_MAX_RETRIES: z.coerce.number().int().min(0).max(8).optional(),
  ANTHROPIC_RETRY_BASE_MS: z.coerce.number().int().positive().max(10_000).optional(),
  ANTHROPIC_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().max(60_000).optional(),

  // Assistant context cache (optional — requires REDIS_URL; no-op when Redis absent)
  ASSISTANT_CONTEXT_CACHE_TTL_WEATHER_SEC: z.coerce.number().int().positive().max(3600).optional(),
  ASSISTANT_CONTEXT_CACHE_TTL_OPS_SEC: z.coerce.number().int().positive().max(3600).optional(),

  // Assistant governance (Phase 7)
  ASSISTANT_PROMPT_VERSION: z.string().max(120).optional(),
  /** When `"false"`, Phase 26 org experiments are ignored (org pin / env / default still apply). */
  ASSISTANT_PROMPT_EXPERIMENTS_ENABLED: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** Approximate total input token budget (system + messages). */
  ASSISTANT_INPUT_TOKEN_BUDGET: z.coerce.number().int().positive().max(200_000).optional(),
  /** Optional extra cap on max output tokens (in addition to provider config). */
  ASSISTANT_OUTPUT_MAX_TOKENS: z.coerce.number().int().positive().max(200_000).optional(),

  // Phase 9 — usage controls + rollout guardrails
  /** When false, SSE route will run JSON-only fallback mode (still SSE response). */
  ASSISTANT_STREAMING_ENABLED: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** When true, force JSON-only mode even if streaming is enabled. */
  ASSISTANT_JSON_ONLY_MODE: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** Soft daily limit per user (requests/day) — logs only by default. */
  ASSISTANT_USAGE_SOFT_LIMIT_PER_DAY: z.coerce.number().int().positive().max(100000).optional(),
  /** Hard daily limit per user (requests/day) — blocks assistant calls. */
  ASSISTANT_USAGE_HARD_LIMIT_PER_DAY: z.coerce.number().int().positive().max(100000).optional(),
  /** Behavior when soft limit exceeded. */
  ASSISTANT_USAGE_SOFT_LIMIT_MODE: z.enum(["log_only", "block"]).optional(),

  /**
   * Optional JSON map of per-plan/per-tier assistant limits.
   * Keyed by `Organization.subscriptionTier` (e.g., "starter", "pro", "enterprise").
   *
   * Example:
   * {
   *   "starter": { "hardLimitPerDay": 50 },
   *   "pro": { "hardLimitPerDay": 250, "softLimitPerDay": 200, "softLimitMode": "log_only" },
   *   "enterprise": { "hardLimitPerDay": null }
   * }
   */
  ASSISTANT_USAGE_LIMITS_BY_TIER_JSON: z.string().max(10_000).optional(),

  // Phase 13 — external metrics/export
  /** Optional bearer token to protect /metrics endpoints. */
  METRICS_BEARER_TOKEN: z.string().min(16).max(200).optional(),
  /** Cache TTL for Prometheus scrape output. */
  METRICS_PROMETHEUS_CACHE_TTL_MS: z.coerce.number().int().positive().max(300_000).optional(),
  /** Max scrapes per time window (route-level). */
  METRICS_PROMETHEUS_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(10_000).optional(),
  /** Rate limit time window (ms) for scrapes. */
  METRICS_PROMETHEUS_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(3_600_000).optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/** Clears cached env so the next `getEnv()` / `validateEnv()` re-reads `process.env` (tests only). */
export function resetEnvCacheForTests(): void {
  _env = null;
}

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`\n❌ Invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }

  // Production-specific checks
  if (result.data.NODE_ENV === "production") {
    const warnings: string[] = [];

    if (result.data.CORS_ORIGIN === "*" || result.data.CORS_ORIGIN === "http://localhost:3000") {
      warnings.push("CORS_ORIGIN should not be wildcard or localhost in production");
    }

    if (!result.data.JWT_PRIVATE_KEY || !result.data.JWT_PUBLIC_KEY) {
      warnings.push("RS256 keys (JWT_PRIVATE_KEY, JWT_PUBLIC_KEY) recommended for production");
    }

    if (!result.data.SENDGRID_API_KEY) {
      warnings.push("SENDGRID_API_KEY not set — email delivery disabled");
    }

    if (!result.data.TWILIO_ACCOUNT_SID) {
      warnings.push("TWILIO_ACCOUNT_SID not set — SMS/WhatsApp delivery disabled");
    }

    if (!result.data.VAPID_PUBLIC_KEY || !result.data.VAPID_PRIVATE_KEY) {
      warnings.push("VAPID keys not set — web push notifications disabled");
    }

    if (warnings.length > 0) {
      console.warn(`\n⚠️  Production warnings:\n${warnings.map((w) => `  - ${w}`).join("\n")}\n`);
    }
  }

  _env = result.data;
  return result.data;
}

export function getEnv(): Env {
  if (!_env) {
    return validateEnv();
  }
  return _env;
}
