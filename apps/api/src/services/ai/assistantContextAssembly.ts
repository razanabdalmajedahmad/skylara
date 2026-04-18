/**
 * Context assembly for portal assistant requests — single place for system prompt text and ops snapshot.
 * Optional Redis cache for assembled weather/ops slices (see `assistantContextCache.ts`).
 */

import type { WeatherEvaluation } from '../weatherThresholdEngine';
import { WeatherThresholdEngine } from '../weatherThresholdEngine';
import { fetchOpenMeteoAssistantSnapshot, type OpenMeteoAssistantSnapshot } from '../weather/openMeteoSnapshot';
import {
  buildOpsContextCacheKey,
  buildWeatherContextCacheKey,
  utcDayBucket,
  type AssistantContextCache,
} from './assistantContextCache';
import type { AssistantKnowledgeMatch } from './assistantContextTypes';
import type { AssistantShapingInput } from './assistantShaping';
import {
  ASSISTANT_PROMPT_REGISTRY,
  composePortalAssistantSystemPromptFromRegistry,
  DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
  resolveRegisteredAssistantTemplateId,
} from './assistantPromptRegistry';

export { type AssistantKnowledgeMatch } from './assistantContextTypes';
export type { AssistantContextCache } from './assistantContextCache';

/** Options for cache + audit-safe logging (no prompt bodies). */
export interface AssistantContextAssemblyOptions {
  cache?: AssistantContextCache;
  log?: {
    info?: (o: Record<string, unknown>) => void;
    warn?: (o: Record<string, unknown>) => void;
  };
  ttlWeatherSeconds?: number;
  ttlOpsSeconds?: number;
}

function parseAssistantTtlSec(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 3600) : fallback;
}

function resolveAssistantCacheTtls(opts?: AssistantContextAssemblyOptions): { weather: number; ops: number } {
  return {
    weather:
      opts?.ttlWeatherSeconds ??
      parseAssistantTtlSec(process.env.ASSISTANT_CONTEXT_CACHE_TTL_WEATHER_SEC, 90),
    ops:
      opts?.ttlOpsSeconds ?? parseAssistantTtlSec(process.env.ASSISTANT_CONTEXT_CACHE_TTL_OPS_SEC, 45),
  };
}

/** Combined assistant context budget (system prompt grows with this; keep bounded). */
const MAX_PLATFORM_CONTEXT_CHARS = 12_000;

const WEATHER_KEYWORDS =
  /weather|wind|winds|metar|visibility|jumpability|jump\s*ability|\bji\b|forecast|temperature|\btemp\b|cloud|ceiling|rain|thunder|gust|open[\s-]?meteo|sunset/i;

/**
 * Mask sensitive information (PII patterns) from free-text context before LLM.
 * Does not replace server-side gates; informational masking only.
 */
export function maskSensitiveData(text: string): string {
  let out = text;
  out = out.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?(\d{4})\b/g, 'xxxx-xxxx-xxxx-$1');
  out = out.replace(/\b\d{3}-\d{2}-(\d{4})\b/g, 'xxx-xx-$1');
  out = out.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[email]');
  return out;
}

export interface PortalAssistantSystemPromptInput {
  userRole: string;
  currentRoute: string | undefined;
  matches: AssistantKnowledgeMatch[];
  /** e.g. DZ label + route + optional ops snapshot block */
  platformContext: string;
  /** Phase 7: prompt version metadata (no prompt content logging). */
  promptVersion?: string;
  /** Phase 19: additive role/surface/jump-profile shaping (real data only). */
  shaping?: AssistantShapingInput;
}

/**
 * Build the system prompt for the portal assistant (registry-composed, versioned templates).
 */
export function buildPortalAssistantSystemPrompt(input: PortalAssistantSystemPromptInput): string {
  const { userRole, currentRoute, matches, platformContext, promptVersion, shaping } = input;

  const requested = (promptVersion || DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID).trim() || DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID;
  const templateId = resolveRegisteredAssistantTemplateId(requested);
  const headerVersion = ASSISTANT_PROMPT_REGISTRY[requested] ? requested : templateId;

  const shapingParts = shaping
    ? {
        roleFocusTags: shaping.roleFocusTags,
        surfaceClass: shaping.surfaceClass,
        jumpProfile: shaping.jumpProfile,
        jumpBand: shaping.jumpBand,
        licenseBand: shaping.licenseBand,
        progressionStage: shaping.progressionStage,
        disciplineBreadth: shaping.disciplineBreadth,
        instructionalStaffCapacity: shaping.instructionalStaffCapacity,
      }
    : undefined;

  return composePortalAssistantSystemPromptFromRegistry(templateId, {
    promptVersion: headerVersion,
    userRole,
    currentRoute,
    matches,
    platformContext,
    shaping: shapingParts,
  });
}

/**
 * Build the platform context line (DZ + route + optional weather + ops snapshots).
 * Deterministic facts only; never invents data. Truncates if over budget.
 */
export function buildPortalPlatformContext(parts: {
  currentPageLabel?: string;
  currentRoute?: string;
  /** Open-Meteo + threshold hints from `fetchWeatherFactsForAssistant` */
  weatherSnapshot?: string;
  /** DB ops snapshot from `fetchOpsSnapshotForAssistant` */
  opsSnapshot?: string;
}): string {
  const { currentPageLabel, currentRoute, weatherSnapshot, opsSnapshot } = parts;
  const base = `DZ: ${currentPageLabel || 'General'}, Route: ${currentRoute || 'Unknown'}`;
  const combined = `${base}${weatherSnapshot || ''}${opsSnapshot || ''}`;
  return clampAssistantContext(combined, MAX_PLATFORM_CONTEXT_CHARS);
}

export function clampAssistantContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 48))}\n… [context truncated for size]`;
}

const OPS_KEYWORDS =
  /manifest|load|waiver|booking|weather|ready|missing|block|underfill|tandem|student|jump|coach|instructor|pilot|today|queue|check.?in|incident|safety|who|how many|what.*next|hold\b/i;

export interface AssistantDropzoneContext {
  dzId: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/**
 * Resolve primary dropzone for assistant context from the user's role assignment.
 */
export async function resolveDropzoneForAssistant(
  prisma: {
    user: {
      findUnique: (args: unknown) => Promise<{
        userRoles: Array<{
          dropzone: {
            id: number;
            name: string;
            latitude: unknown;
            longitude: unknown;
            timezone: string;
          } | null;
        }>;
      } | null>;
    };
  },
  userId: number
): Promise<AssistantDropzoneContext | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        where: { dropzoneId: { not: null } },
        orderBy: { id: 'asc' },
        take: 1,
        select: {
          dropzone: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              timezone: true,
            },
          },
        },
      },
    },
  });
  const dz = u?.userRoles[0]?.dropzone;
  if (!dz?.id) {
    return null;
  }
  const lat = Number(dz.latitude);
  const lng = Number(dz.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return {
    dzId: dz.id,
    name: dz.name,
    latitude: lat,
    longitude: lng,
    timezone: dz.timezone || 'UTC',
  };
}

function formatWeatherSnapshotBlock(
  snap: OpenMeteoAssistantSnapshot,
  evaluation: WeatherEvaluation
): string {
  const visLabel = snap.visibilityMiles >= 10 ? '10+ mi' : `${snap.visibilityMiles} mi`;
  const thresholdLines: string[] = [`Overall (default thresholds): ${evaluation.overallDecision}`];
  const notable = evaluation.activities.filter((a) => a.decision !== 'CLEAR').slice(0, 5);
  if (notable.length === 0) {
    thresholdLines.push('FUN_JUMP / STUDENT / TANDEM: CLEAR under default thresholds.');
  } else {
    for (const a of notable) {
      thresholdLines.push(`  ${a.activity}: ${a.decision}`);
    }
  }

  const body = `\n\n## Weather (deterministic — Open-Meteo, advisory only)\n` +
    `Dropzone: ${snap.dropzoneName}\n` +
    `Source: ${snap.source} | Fetched: ${snap.fetchedAtIso}\n` +
    `Jumpability index: ${snap.ji} (${snap.jumpStatus}) — heuristic, not a hold order\n` +
    `Ground wind: ${snap.windKnotsGround} kts ${snap.windDirCompass} | Est. 3k/6k: ${snap.windKnotsAlt3k}/${snap.windKnotsAlt6k} kts ${snap.windDirCompass}\n` +
    `Temp: ${snap.tempF}°F | Visibility: ${visLabel} | Cloud cover: ${snap.cloudCoverPct}% | WMO code: ${snap.weatherCode}\n` +
    (snap.sunsetLocal ? `Sunset (local): ${snap.sunsetLocal}\n` : '') +
    `Threshold engine (WeatherThresholdEngine, defaults):\n${thresholdLines.join('\n')}\n` +
    `Human review required for all jump/no-jump decisions.\n`;

  return clampAssistantContext(body, 2800);
}

/**
 * When the message looks weather-related, attach Open-Meteo facts + default threshold evaluation.
 * No fabricated weather — if coordinates or API fail, returns an explicit status line only.
 */
export async function fetchWeatherFactsForAssistant(
  prisma: {
    user: {
      findUnique: (args: unknown) => Promise<{
        userRoles: Array<{
          dropzone: {
            id: number;
            name: string;
            latitude: unknown;
            longitude: unknown;
            timezone: string;
          } | null;
        }>;
      } | null>;
    };
  },
  userId: number,
  message: string,
  options?: AssistantContextAssemblyOptions & { fetchImpl?: typeof fetch }
): Promise<string> {
  if (!WEATHER_KEYWORDS.test(message)) {
    return '';
  }

  try {
    const dz = await resolveDropzoneForAssistant(prisma, userId);
    if (!dz) {
      return '\n\n## Weather (deterministic)\nNo dropzone linked to this user — cannot load Open-Meteo.\n';
    }

    const cache = options?.cache;
    const log = options?.log;
    const ttls = resolveAssistantCacheTtls(options);

    if (cache) {
      const key = buildWeatherContextCacheKey(dz.dzId);
      try {
        const hit = await cache.get(key);
        if (hit !== null) {
          log?.info?.({ event: 'assistant.context.cache', kind: 'weather', result: 'hit' });
          return hit;
        }
      } catch {
        log?.warn?.({ event: 'assistant.context.cache', kind: 'weather', result: 'error' });
      }
    }

    const snap = await fetchOpenMeteoAssistantSnapshot({
      latitude: dz.latitude,
      longitude: dz.longitude,
      timezone: dz.timezone,
      dropzoneName: dz.name,
      fetchImpl: options?.fetchImpl,
    });

    let result: string;
    if (!snap) {
      result =
        '\n\n## Weather (deterministic)\nOpen-Meteo request failed or returned no current data — no weather facts attached.\n';
    } else {
      const engine = new WeatherThresholdEngine();
      const evaluation = await engine.evaluate(
        {
          windSpeedKnots: snap.windKnotsGround,
          visibilityMiles: snap.visibilityMiles,
          precipitationCode: snap.weatherCode,
          temperature: snap.tempF,
        },
        ['FUN_JUMP', 'STUDENT', 'TANDEM'],
        { dropzoneId: dz.dzId }
      );
      result = formatWeatherSnapshotBlock(snap, evaluation);
    }

    if (cache && result.length > 0) {
      try {
        await cache.set(buildWeatherContextCacheKey(dz.dzId), result, ttls.weather);
        log?.info?.({ event: 'assistant.context.cache', kind: 'weather', result: 'miss' });
      } catch {
        log?.warn?.({ event: 'assistant.context.cache', kind: 'weather', result: 'set_error' });
      }
    }

    return result;
  } catch {
    return '\n\n## Weather (deterministic)\nWeather context could not be assembled.\n';
  }
}

/**
 * Fetch a live ops snapshot block when the user message looks operational (legacy behavior preserved).
 */
export async function fetchOpsSnapshotForAssistant(
  prisma: {
    user: {
      findUnique: (args: unknown) => Promise<{
        userRoles: { dropzoneId: number | null }[];
      } | null>;
    };
    load: { findMany: (args: unknown) => Promise<unknown[]> };
    booking: { count: (args: unknown) => Promise<number> };
    waiverSubmission: { count: (args: unknown) => Promise<number> };
    onboardingApplication: { count: (args: unknown) => Promise<number> };
    weatherHold?: { count: (args: unknown) => Promise<number> };
    incident?: { count: (args: unknown) => Promise<number> };
  },
  userId: number,
  message: string,
  options?: AssistantContextAssemblyOptions
): Promise<string> {
  if (!OPS_KEYWORDS.test(message)) {
    return '';
  }

  let dzId: number | null = null;
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        userRoles: {
          where: { dropzoneId: { not: null } },
          orderBy: { id: 'asc' },
          take: 1,
          select: { dropzoneId: true },
        },
      },
    });
    dzId = u?.userRoles[0]?.dropzoneId ?? null;
  } catch {
    return '';
  }
  const day = utcDayBucket();
  const ttls = resolveAssistantCacheTtls(options);
  const cache = options?.cache;
  const log = options?.log;

  if (cache) {
    const key = buildOpsContextCacheKey(dzId, userId, day);
    try {
      const hit = await cache.get(key);
      if (hit !== null) {
        log?.info?.({ event: 'assistant.context.cache', kind: 'ops', result: 'hit' });
        return hit;
      }
    } catch {
      log?.warn?.({ event: 'assistant.context.cache', kind: 'ops', result: 'error' });
    }
  }

  try {
    const [activeLoads, todayBookingCount, recentSignedWaivers, pendingOnboarding, activeWeatherHolds, openIncidents] =
      await Promise.all([
        prisma.load
          .findMany({
            where: { ...(dzId ? { dropzoneId: dzId } : {}), status: { notIn: ['COMPLETE', 'CANCELLED'] } },
            select: {
              loadNumber: true,
              status: true,
              aircraft: { select: { registration: true, maxCapacity: true } },
              _count: { select: { slots: true } },
            },
            take: 10,
          })
          .catch(() => []),
        prisma.booking
          .count({
            where: {
              ...(dzId ? { dropzoneId: dzId } : {}),
              scheduledDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          })
          .catch(() => 0),
        prisma.waiverSubmission
          .count({
            where: {
              userId,
              submissionStatus: 'signed',
              submittedAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
          })
          .catch(() => 0),
        prisma.onboardingApplication
          .count({
            where: { ...(dzId ? { dropzoneId: dzId } : {}), status: 'SUBMITTED' },
          })
          .catch(() => 0),
        dzId && prisma.weatherHold
          ? prisma.weatherHold
              .count({
                where: { dropzoneId: dzId, releasedAt: null },
              })
              .catch(() => 0)
          : Promise.resolve(0),
        dzId && prisma.incident
          ? prisma.incident
              .count({
                where: {
                  dropzoneId: dzId,
                  status: { in: ['REPORTED', 'INVESTIGATING'] },
                },
              })
              .catch(() => 0)
          : Promise.resolve(0),
      ]);

    const loadLines = (activeLoads as any[])
      .map(
        (l: any) =>
          `  Load ${l.loadNumber || '?'} (${l.aircraft?.registration ?? '?'}): ${l.status}, ${l._count.slots}/${l.aircraft?.maxCapacity ?? '?'} filled`
      )
      .join('\n');

    const ops = `\n\n## Live Operational State (real-time)\n` +
      (dzId ? `Dropzone ID: ${dzId}\n` : '') +
      `Active Loads:\n${loadLines || '  No active loads'}\n` +
      `Today's Bookings: ${todayBookingCount}\n` +
      `Signed waivers (last 7d, this user): ${recentSignedWaivers}\n` +
      `Pending Onboarding Applications: ${pendingOnboarding}\n` +
      (dzId ? `Active weather holds: ${activeWeatherHolds}\n` : '') +
      (dzId ? `Open incidents (reported/investigating): ${openIncidents}\n` : '');

    const out = clampAssistantContext(ops, 4500);

    if (cache && out.length > 0) {
      try {
        await cache.set(buildOpsContextCacheKey(dzId, userId, day), out, ttls.ops);
        log?.info?.({ event: 'assistant.context.cache', kind: 'ops', result: 'miss' });
      } catch {
        log?.warn?.({ event: 'assistant.context.cache', kind: 'ops', result: 'set_error' });
      }
    }

    return out;
  } catch {
    return '';
  }
}
