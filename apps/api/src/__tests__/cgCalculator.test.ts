import { describe, it, expect } from "vitest";
import {
  calculateCG,
  AircraftCgEnvelope,
  CgInput,
  EXAMPLE_AIRCRAFT,
} from "../services/cgCalculator";

describe("CG Calculator — calculateCG", () => {
  const cessna: AircraftCgEnvelope = EXAMPLE_AIRCRAFT.CESSNA_208;

  it("returns PASS for a normal load within envelope", () => {
    const input: CgInput = {
      fuelWeight: 200,
      pilotWeight: 180,
      pilotArmDistance: 50,
      passengers: [
        { position: 2, weight: 180 },
        { position: 3, weight: 200 },
      ],
    };

    const result = calculateCG(cessna, input);
    expect(result.totalWeight).toBe(cessna.emptyWeight + 200 + 180 + 180 + 200);
    expect(result.isOverweight).toBe(false);
    expect(["PASS", "MARGINAL"]).toContain(result.result);
  });

  it("returns FAIL when overweight", () => {
    const input: CgInput = {
      fuelWeight: 500,
      pilotWeight: 220,
      pilotArmDistance: 50,
      passengers: [
        { position: 2, weight: 300 },
        { position: 3, weight: 300 },
        { position: 4, weight: 300 },
      ],
    };

    const result = calculateCG(cessna, input);
    // Cessna MTOW is 5500, empty is 3600, so 3600+500+220+300+300+300 = 5220 — may or may not exceed
    // Let's make sure the overweight detection works with a clearly overweight load
    const heavyInput: CgInput = {
      fuelWeight: 500,
      pilotWeight: 250,
      pilotArmDistance: 50,
      passengers: [
        { position: 2, weight: 400 },
        { position: 3, weight: 400 },
        { position: 4, weight: 400 },
      ],
    };
    const heavyResult = calculateCG(cessna, heavyInput);
    // 3600 + 500 + 250 + 400 + 400 + 400 = 5550 > 5500 MTOW
    expect(heavyResult.isOverweight).toBe(true);
    expect(heavyResult.result).toBe("FAIL");
    expect(heavyResult.weightMargin).toBeLessThan(0);
  });

  it("computes correct total weight", () => {
    const input: CgInput = {
      fuelWeight: 100,
      pilotWeight: 180,
      pilotArmDistance: 50,
      passengers: [
        { position: 2, weight: 170 },
      ],
    };

    const result = calculateCG(cessna, input);
    expect(result.totalWeight).toBe(3600 + 100 + 180 + 170);
  });

  it("computes weight margin correctly", () => {
    const input: CgInput = {
      fuelWeight: 100,
      pilotWeight: 180,
      pilotArmDistance: 50,
      passengers: [],
    };

    const result = calculateCG(cessna, input);
    expect(result.weightMargin).toBe(5500 - (3600 + 100 + 180));
  });

  it("throws on invalid seat position", () => {
    const input: CgInput = {
      fuelWeight: 100,
      pilotWeight: 180,
      pilotArmDistance: 50,
      passengers: [
        { position: 99, weight: 170 }, // doesn't exist
      ],
    };

    expect(() => calculateCG(cessna, input)).toThrow("Invalid seat position: 99");
  });

  it("handles empty passenger list", () => {
    const input: CgInput = {
      fuelWeight: 100,
      pilotWeight: 180,
      pilotArmDistance: 50,
      passengers: [],
    };

    const result = calculateCG(cessna, input);
    expect(result.totalWeight).toBe(3600 + 100 + 180);
    expect(result.isOverweight).toBe(false);
  });

  it("uses King Air envelope for larger aircraft", () => {
    const kingAir = EXAMPLE_AIRCRAFT.KING_AIR;
    const input: CgInput = {
      fuelWeight: 500,
      pilotWeight: 200,
      pilotArmDistance: 58,
      passengers: [
        { position: 2, weight: 180 },
        { position: 3, weight: 200 },
        { position: 4, weight: 190 },
        { position: 5, weight: 210 },
        { position: 6, weight: 180 },
      ],
    };

    const result = calculateCG(kingAir, input);
    // King Air MTOW is 14000, empty is 7200
    // Total: 7200 + 500 + 200 + 180 + 200 + 190 + 210 + 180 = 8860
    expect(result.totalWeight).toBe(8860);
    expect(result.isOverweight).toBe(false);
  });
});
