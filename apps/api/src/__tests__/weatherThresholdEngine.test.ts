import { describe, it, expect } from "vitest";
import {
  WeatherThresholdEngine,
  WeatherConditions,
} from "../services/weatherThresholdEngine";

describe("WeatherThresholdEngine", () => {
  const engine = new WeatherThresholdEngine(); // no policy engine — uses defaults

  describe("evaluateActivity — STUDENT", () => {
    it("returns CLEAR for calm conditions", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 8,
        visibilityMiles: 10,
        cloudCeilingFt: 8000,
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("CLEAR");
    });

    it("returns WARNING for moderate wind", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 12,
        visibilityMiles: 10,
        cloudCeilingFt: 8000,
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("WARNING");
      expect(result.reasons[0]).toContain("Wind 12 kts above warning");
    });

    it("returns HOLD for wind over max", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 16,
        visibilityMiles: 10,
        cloudCeilingFt: 8000,
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("HOLD");
    });

    it("returns HOLD for low visibility", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 5,
        visibilityMiles: 2,
        cloudCeilingFt: 8000,
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("HOLD");
      expect(result.reasons[0]).toContain("Visibility");
    });

    it("returns HOLD for low ceiling", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 5,
        visibilityMiles: 10,
        cloudCeilingFt: 3000,
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("HOLD");
      expect(result.reasons[0]).toContain("Ceiling");
    });

    it("returns HOLD for precipitation when noPrecipitation is true", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 5,
        visibilityMiles: 10,
        cloudCeilingFt: 8000,
        precipitationCode: 61, // rain
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("HOLD");
      expect(result.reasons).toEqual(expect.arrayContaining([
        expect.stringContaining("Precipitation"),
      ]));
    });
  });

  describe("evaluate — multi-activity", () => {
    it("returns per-activity results with worst-of overall", async () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 16,
        visibilityMiles: 10,
        cloudCeilingFt: 8000,
      };
      const result = await engine.evaluate(conditions, ["STUDENT", "FUN_JUMP"]);
      expect(result.activities).toHaveLength(2);

      const student = result.activities.find(a => a.activity === "STUDENT");
      const funJump = result.activities.find(a => a.activity === "FUN_JUMP");

      expect(student?.decision).toBe("HOLD"); // 16 > 14 max
      expect(funJump?.decision).toBe("CLEAR"); // 16 < 25 max, < 20 warning
      expect(result.overallDecision).toBe("HOLD"); // worst of all
    });

    it("returns CLEAR when all activities are clear", async () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 5,
        visibilityMiles: 10,
        cloudCeilingFt: 10000,
      };
      const result = await engine.evaluate(conditions, ["FUN_JUMP", "HOP_N_POP"]);
      expect(result.overallDecision).toBe("CLEAR");
    });
  });

  describe("gust handling", () => {
    it("uses gusts for max gust check", () => {
      const conditions: WeatherConditions = {
        windSpeedKnots: 12,
        windGustKnots: 20,
        visibilityMiles: 10,
        cloudCeilingFt: 8000,
      };
      const result = engine.evaluateActivity(conditions, "STUDENT", {
        maxWindKnots: 14, maxGustKnots: 18, minVisibilityMiles: 5,
        minCeilingFt: 5000, warningWindKnots: 10, warningVisibilityMiles: 7,
        noPrecipitation: true,
      });
      expect(result.decision).toBe("HOLD");
      expect(result.reasons).toEqual(expect.arrayContaining([
        expect.stringContaining("Gusts 20 kts exceed max 18"),
      ]));
    });
  });
});
