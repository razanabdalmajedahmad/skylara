import { PolicyEngine } from "./policyEngine";

/**
 * WEATHER THRESHOLD ENGINE — DZ-configurable per-activity weather limits
 *
 * Per gap spec §5.5 and Expert Feedback §3.1:
 * - Each DZ can configure wind, visibility, and cloud ceiling thresholds
 * - Thresholds vary by activity type (student, tandem, fun jump, wingsuit, etc.)
 * - Engine returns CLEAR / WARNING / HOLD recommendation per activity
 * - Does NOT auto-ground — generates recommendations for staff decision
 * - Manual observation overrides are logged separately
 */

export interface WeatherConditions {
  windSpeedKnots: number;
  windGustKnots?: number;
  visibilityMiles: number;
  cloudCeilingFt?: number;
  temperature?: number;        // Fahrenheit
  precipitationCode?: number;  // WMO weather code
}

export type ActivityType =
  | "STUDENT"
  | "TANDEM"
  | "FUN_JUMP"
  | "WINGSUIT"
  | "CANOPY_COURSE"
  | "NIGHT_JUMP"
  | "DEMO_JUMP"
  | "HOP_N_POP";

export type WeatherDecision = "CLEAR" | "WARNING" | "HOLD";

export interface ThresholdConfig {
  maxWindKnots: number;
  maxGustKnots: number;
  minVisibilityMiles: number;
  minCeilingFt: number;
  warningWindKnots: number;     // warning threshold (below max)
  warningVisibilityMiles: number;
  noPrecipitation: boolean;      // block if any precipitation
}

export interface ActivityWeatherResult {
  activity: ActivityType;
  decision: WeatherDecision;
  reasons: string[];
  thresholds: ThresholdConfig;
}

export interface WeatherEvaluation {
  overallDecision: WeatherDecision;
  activities: ActivityWeatherResult[];
  conditions: WeatherConditions;
  evaluatedAt: Date;
}

/** Conservative defaults — DZ can loosen or tighten via policy engine. */
const DEFAULT_THRESHOLDS: Record<ActivityType, ThresholdConfig> = {
  STUDENT: {
    maxWindKnots: 14,
    maxGustKnots: 18,
    minVisibilityMiles: 5,
    minCeilingFt: 5000,
    warningWindKnots: 10,
    warningVisibilityMiles: 7,
    noPrecipitation: true,
  },
  TANDEM: {
    maxWindKnots: 18,
    maxGustKnots: 22,
    minVisibilityMiles: 5,
    minCeilingFt: 5000,
    warningWindKnots: 14,
    warningVisibilityMiles: 7,
    noPrecipitation: true,
  },
  FUN_JUMP: {
    maxWindKnots: 25,
    maxGustKnots: 30,
    minVisibilityMiles: 3,
    minCeilingFt: 4000,
    warningWindKnots: 20,
    warningVisibilityMiles: 5,
    noPrecipitation: false,
  },
  WINGSUIT: {
    maxWindKnots: 20,
    maxGustKnots: 25,
    minVisibilityMiles: 5,
    minCeilingFt: 8000,
    warningWindKnots: 15,
    warningVisibilityMiles: 7,
    noPrecipitation: true,
  },
  CANOPY_COURSE: {
    maxWindKnots: 15,
    maxGustKnots: 20,
    minVisibilityMiles: 5,
    minCeilingFt: 4000,
    warningWindKnots: 12,
    warningVisibilityMiles: 7,
    noPrecipitation: true,
  },
  NIGHT_JUMP: {
    maxWindKnots: 15,
    maxGustKnots: 20,
    minVisibilityMiles: 5,
    minCeilingFt: 5000,
    warningWindKnots: 10,
    warningVisibilityMiles: 7,
    noPrecipitation: true,
  },
  DEMO_JUMP: {
    maxWindKnots: 15,
    maxGustKnots: 18,
    minVisibilityMiles: 5,
    minCeilingFt: 5000,
    warningWindKnots: 10,
    warningVisibilityMiles: 7,
    noPrecipitation: true,
  },
  HOP_N_POP: {
    maxWindKnots: 25,
    maxGustKnots: 30,
    minVisibilityMiles: 3,
    minCeilingFt: 3000,
    warningWindKnots: 20,
    warningVisibilityMiles: 5,
    noPrecipitation: false,
  },
};

export class WeatherThresholdEngine {
  private policyEngine: PolicyEngine | null;

  constructor(policyEngine?: PolicyEngine) {
    this.policyEngine = policyEngine ?? null;
  }

  /**
   * Get thresholds for an activity, merging DZ policy overrides with defaults.
   */
  async getThresholds(
    activity: ActivityType,
    context?: { dropzoneId?: number; branchId?: number }
  ): Promise<ThresholdConfig> {
    const defaults = DEFAULT_THRESHOLDS[activity] ?? DEFAULT_THRESHOLDS.FUN_JUMP;

    if (!this.policyEngine || !context?.dropzoneId) return defaults;

    // Try to load DZ-specific overrides from policy engine
    try {
      const policyKey = `weather.thresholds.${activity}`;
      const override = await this.policyEngine.resolve<Partial<ThresholdConfig> | null>(
        policyKey,
        context,
        null as any
      );
      if (override && typeof override === "object") {
        return { ...defaults, ...override };
      }
    } catch {
      // Policy not set — use defaults
    }

    return defaults;
  }

  /**
   * Evaluate weather conditions against thresholds for a single activity.
   */
  evaluateActivity(
    conditions: WeatherConditions,
    activity: ActivityType,
    thresholds: ThresholdConfig
  ): ActivityWeatherResult {
    const reasons: string[] = [];
    let decision: WeatherDecision = "CLEAR";

    const effectiveWind = conditions.windGustKnots ?? conditions.windSpeedKnots;

    // Wind check
    if (conditions.windSpeedKnots > thresholds.maxWindKnots) {
      decision = "HOLD";
      reasons.push(`Wind ${conditions.windSpeedKnots} kts exceeds max ${thresholds.maxWindKnots} kts`);
    } else if (conditions.windSpeedKnots > thresholds.warningWindKnots) {
      if (decision === "CLEAR") decision = "WARNING";
      reasons.push(`Wind ${conditions.windSpeedKnots} kts above warning threshold ${thresholds.warningWindKnots} kts`);
    }

    // Gust check
    if (effectiveWind > thresholds.maxGustKnots) {
      decision = "HOLD";
      reasons.push(`Gusts ${effectiveWind} kts exceed max ${thresholds.maxGustKnots} kts`);
    }

    // Visibility check
    if (conditions.visibilityMiles < thresholds.minVisibilityMiles) {
      decision = "HOLD";
      reasons.push(`Visibility ${conditions.visibilityMiles} mi below minimum ${thresholds.minVisibilityMiles} mi`);
    } else if (conditions.visibilityMiles < thresholds.warningVisibilityMiles) {
      if (decision === "CLEAR") decision = "WARNING";
      reasons.push(`Visibility ${conditions.visibilityMiles} mi below warning threshold ${thresholds.warningVisibilityMiles} mi`);
    }

    // Cloud ceiling check
    if (conditions.cloudCeilingFt !== undefined && conditions.cloudCeilingFt < thresholds.minCeilingFt) {
      decision = "HOLD";
      reasons.push(`Ceiling ${conditions.cloudCeilingFt} ft below minimum ${thresholds.minCeilingFt} ft`);
    }

    // Precipitation check
    if (thresholds.noPrecipitation && conditions.precipitationCode !== undefined) {
      if (conditions.precipitationCode >= 50) { // WMO drizzle+
        decision = "HOLD";
        reasons.push("Precipitation detected — activity requires clear conditions");
      }
    }

    if (reasons.length === 0) {
      reasons.push("All conditions within limits");
    }

    return { activity, decision, reasons, thresholds };
  }

  /**
   * Evaluate weather conditions against all activity types for a DZ.
   * Returns per-activity results and an overall decision (worst of all).
   */
  async evaluate(
    conditions: WeatherConditions,
    activities?: ActivityType[],
    context?: { dropzoneId?: number; branchId?: number }
  ): Promise<WeatherEvaluation> {
    const targetActivities = activities ?? (Object.keys(DEFAULT_THRESHOLDS) as ActivityType[]);

    const results: ActivityWeatherResult[] = [];
    for (const activity of targetActivities) {
      const thresholds = await this.getThresholds(activity, context);
      results.push(this.evaluateActivity(conditions, activity, thresholds));
    }

    // Overall = worst of all activities
    let overallDecision: WeatherDecision = "CLEAR";
    for (const r of results) {
      if (r.decision === "HOLD") { overallDecision = "HOLD"; break; }
      if (r.decision === "WARNING") overallDecision = "WARNING";
    }

    return {
      overallDecision,
      activities: results,
      conditions,
      evaluatedAt: new Date(),
    };
  }
}
