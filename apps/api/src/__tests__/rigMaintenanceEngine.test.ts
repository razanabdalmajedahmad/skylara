import { describe, it, expect } from "vitest";
import {
  evaluateRule,
  MaintenanceStatus,
  RuleEvalInput,
  ComponentCounters,
  checkManifestGate,
  RigStatusResult,
} from "../services/rigMaintenanceEngine";

describe("Rig Maintenance Engine — evaluateRule", () => {
  const makeRule = (overrides: Partial<RuleEvalInput> = {}): RuleEvalInput => ({
    ruleId: 1,
    componentType: "MAIN",
    ruleType: "INSPECTION",
    triggerByJumps: 50,
    triggerByDays: null,
    dueSoonPercent: 80,
    overduePercent: 120,
    hardStop: false,
    ...overrides,
  });

  const makeCounters = (overrides: Partial<ComponentCounters> = {}): ComponentCounters => ({
    componentType: "MAIN",
    jumpsSinceService: 0,
    daysSinceService: 0,
    lastServiceDate: new Date(),
    ...overrides,
  });

  describe("jump-based rules", () => {
    it("returns OK when well under threshold", () => {
      const result = evaluateRule(makeRule(), makeCounters({ jumpsSinceService: 20 }));
      expect(result.status).toBe(MaintenanceStatus.OK);
    });

    it("returns DUE_SOON at 80% of trigger (40/50 jumps)", () => {
      const result = evaluateRule(makeRule(), makeCounters({ jumpsSinceService: 42 }));
      expect(result.status).toBe(MaintenanceStatus.DUE_SOON);
      expect(result.reason).toContain("due soon");
    });

    it("returns DUE_NOW at exactly trigger (50/50 jumps)", () => {
      const result = evaluateRule(makeRule(), makeCounters({ jumpsSinceService: 50 }));
      expect(result.status).toBe(MaintenanceStatus.DUE_NOW);
    });

    it("returns DUE_NOW between trigger and overdue (55/50 jumps)", () => {
      const result = evaluateRule(makeRule(), makeCounters({ jumpsSinceService: 55 }));
      expect(result.status).toBe(MaintenanceStatus.DUE_NOW);
    });

    it("returns OVERDUE past overdue threshold (60/50 jumps, 120%)", () => {
      const result = evaluateRule(makeRule(), makeCounters({ jumpsSinceService: 65 }));
      expect(result.status).toBe(MaintenanceStatus.OVERDUE);
    });

    it("returns GROUNDED when hardStop=true and overdue", () => {
      const result = evaluateRule(
        makeRule({ hardStop: true }),
        makeCounters({ jumpsSinceService: 65 })
      );
      expect(result.status).toBe(MaintenanceStatus.GROUNDED);
    });
  });

  describe("date-based rules", () => {
    it("returns OK when days within threshold", () => {
      const result = evaluateRule(
        makeRule({ triggerByJumps: null, triggerByDays: 180 }),
        makeCounters({ daysSinceService: 100 })
      );
      expect(result.status).toBe(MaintenanceStatus.OK);
    });

    it("returns DUE_SOON at 80% of days (144/180)", () => {
      const result = evaluateRule(
        makeRule({ triggerByJumps: null, triggerByDays: 180 }),
        makeCounters({ daysSinceService: 150 })
      );
      expect(result.status).toBe(MaintenanceStatus.DUE_SOON);
    });

    it("returns DUE_NOW at trigger days", () => {
      const result = evaluateRule(
        makeRule({ triggerByJumps: null, triggerByDays: 180 }),
        makeCounters({ daysSinceService: 185 })
      );
      expect(result.status).toBe(MaintenanceStatus.DUE_NOW);
    });
  });

  describe("combined rules (worst-of)", () => {
    it("returns worst status when both jumps and days are evaluated", () => {
      const result = evaluateRule(
        makeRule({ triggerByJumps: 50, triggerByDays: 180 }),
        makeCounters({ jumpsSinceService: 10, daysSinceService: 185 })
      );
      // Jumps OK, days DUE_NOW → worst = DUE_NOW
      expect(result.status).toBe(MaintenanceStatus.DUE_NOW);
      expect(result.triggerType).toBe("COMBINED");
    });
  });
});

describe("Rig Maintenance Engine — checkManifestGate", () => {
  it("allows manifesting when all components OK", () => {
    const rigStatus: RigStatusResult = {
      rigId: 1,
      overallStatus: MaintenanceStatus.OK,
      components: [
        { componentType: "MAIN", status: MaintenanceStatus.OK, reason: "OK", ruleId: null, jumpsSinceService: 10, daysSinceService: 30, triggerType: "NONE", triggerValue: null, currentValue: null },
      ],
      activeGroundings: [],
      evaluatedAt: new Date(),
    };

    const result = checkManifestGate(rigStatus);
    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks manifesting when any component is GROUNDED", () => {
    const rigStatus: RigStatusResult = {
      rigId: 1,
      overallStatus: MaintenanceStatus.GROUNDED,
      components: [
        { componentType: "MAIN", status: MaintenanceStatus.OK, reason: "OK", ruleId: null, jumpsSinceService: 10, daysSinceService: 30, triggerType: "NONE", triggerValue: null, currentValue: null },
        { componentType: "RESERVE", status: MaintenanceStatus.GROUNDED, reason: "Reserve repack overdue", ruleId: 2, jumpsSinceService: 0, daysSinceService: 200, triggerType: "DAYS", triggerValue: 180, currentValue: 200 },
      ],
      activeGroundings: [],
      evaluatedAt: new Date(),
    };

    const result = checkManifestGate(rigStatus);
    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].componentType).toBe("RESERVE");
  });

  it("returns warnings for DUE_SOON but still allows", () => {
    const rigStatus: RigStatusResult = {
      rigId: 1,
      overallStatus: MaintenanceStatus.DUE_SOON,
      components: [
        { componentType: "MAIN", status: MaintenanceStatus.DUE_SOON, reason: "42/50 jumps", ruleId: 1, jumpsSinceService: 42, daysSinceService: 30, triggerType: "JUMPS", triggerValue: 50, currentValue: 42 },
      ],
      activeGroundings: [],
      evaluatedAt: new Date(),
    };

    const result = checkManifestGate(rigStatus);
    expect(result.allowed).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });
});
