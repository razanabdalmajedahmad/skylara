import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PolicyEngine } from "../services/policyEngine";

// ============================================================================
// POLICY ENGINE TESTS
// Tests hierarchy resolution, caching, and override creation
// ============================================================================

// Mock PrismaClient
function createMockPrisma() {
  const definitions = [
    { id: 1, category: "WIND", key: "wind.maxKnots.tandem", label: "Tandem Wind Limit", dataType: "number", defaultValue: 14 },
    { id: 2, category: "COMPLIANCE", key: "compliance.currencyWindow.A", label: "A License Currency", dataType: "number", defaultValue: 60 },
  ];

  const values: any[] = [];
  const auditLogs: any[] = [];

  return {
    policyDefinition: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where?.key) return definitions.find(d => d.key === where.key) ?? null;
        return definitions[0];
      }),
      findMany: vi.fn(async ({ where }: any) => {
        if (where?.key?.in) return definitions.filter(d => where.key.in.includes(d.key));
        if (where?.category) return definitions.filter(d => d.category === where.category);
        return definitions;
      }),
    },
    policyValue: {
      findMany: vi.fn(async () => values),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => {
        const v = { id: values.length + 1, ...data };
        values.push(v);
        return v;
      }),
      update: vi.fn(async ({ data }: any) => data),
    },
    policyAuditLog: {
      create: vi.fn(async ({ data }: any) => {
        auditLogs.push(data);
        return data;
      }),
      findMany: vi.fn(async () => auditLogs),
    },
    _values: values,
    _auditLogs: auditLogs,
  } as any;
}

describe("PolicyEngine", () => {
  describe("resolvePolicy", () => {
    it("returns platform default when no overrides exist", async () => {
      const prisma = createMockPrisma();
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolvePolicy("wind.maxKnots.tandem", {});

      expect(result.value).toBe(14);
      expect(result.resolvedScope).toBe("PLATFORM");
      expect(result.definitionId).toBe(1);
    });

    it("returns null for unknown key", async () => {
      const prisma = createMockPrisma();
      prisma.policyDefinition.findFirst.mockResolvedValueOnce(null);
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolvePolicy("unknown.key", {});

      expect(result.value).toBeNull();
      expect(result.resolvedScope).toBe("NOT_FOUND");
    });

    it("returns DZ override when it exists", async () => {
      const prisma = createMockPrisma();
      prisma.policyValue.findMany.mockResolvedValueOnce([
        { scope: "DROPZONE", dropzoneId: 1, value: 18, effectiveUntil: null },
      ]);
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolvePolicy("wind.maxKnots.tandem", { dropzoneId: 1 });

      expect(result.value).toBe(18);
      expect(result.resolvedScope).toBe("DROPZONE");
    });

    it("branch override wins over DZ override", async () => {
      const prisma = createMockPrisma();
      prisma.policyValue.findMany.mockResolvedValueOnce([
        { scope: "DROPZONE", dropzoneId: 1, value: 18, effectiveUntil: null },
        { scope: "BRANCH", branchId: 1, value: 20, effectiveUntil: null },
      ]);
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolvePolicy("wind.maxKnots.tandem", { dropzoneId: 1, branchId: 1 });

      expect(result.value).toBe(20);
      expect(result.resolvedScope).toBe("BRANCH");
    });

    it("operational-day override wins over everything", async () => {
      const prisma = createMockPrisma();
      prisma.policyValue.findMany.mockResolvedValueOnce([
        { scope: "DROPZONE", dropzoneId: 1, value: 18, effectiveUntil: null },
        { scope: "BRANCH", branchId: 1, value: 20, effectiveUntil: null },
        { scope: "OPERATIONAL_DAY", branchId: 1, value: 12, effectiveUntil: null },
      ]);
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolvePolicy("wind.maxKnots.tandem", {
        dropzoneId: 1, branchId: 1, date: "2026-04-10",
      });

      expect(result.value).toBe(12);
      expect(result.resolvedScope).toBe("OPERATIONAL_DAY");
    });

    it("ignores expired overrides", async () => {
      const prisma = createMockPrisma();
      prisma.policyValue.findMany.mockResolvedValueOnce([
        { scope: "DROPZONE", dropzoneId: 1, value: 18, effectiveUntil: new Date("2020-01-01") },
      ]);
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolvePolicy("wind.maxKnots.tandem", { dropzoneId: 1 });

      expect(result.value).toBe(14); // falls through to default
      expect(result.resolvedScope).toBe("PLATFORM");
    });
  });

  describe("caching", () => {
    it("caches results and returns from cache on second call", async () => {
      const prisma = createMockPrisma();
      const engine = new PolicyEngine(prisma);

      await engine.resolvePolicy("wind.maxKnots.tandem", {});
      await engine.resolvePolicy("wind.maxKnots.tandem", {});

      // findFirst called only once (cached on second)
      expect(prisma.policyDefinition.findFirst).toHaveBeenCalledTimes(1);
    });

    it("invalidateAll clears cache", async () => {
      const prisma = createMockPrisma();
      const engine = new PolicyEngine(prisma);

      await engine.resolvePolicy("wind.maxKnots.tandem", {});
      engine.invalidateAll();
      await engine.resolvePolicy("wind.maxKnots.tandem", {});

      expect(prisma.policyDefinition.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe("resolvePolicies (batch)", () => {
    it("resolves multiple keys in one call", async () => {
      const prisma = createMockPrisma();
      const engine = new PolicyEngine(prisma);

      const results = await engine.resolvePolicies(
        ["wind.maxKnots.tandem", "compliance.currencyWindow.A"],
        {}
      );

      expect(results["wind.maxKnots.tandem"].value).toBe(14);
      expect(results["compliance.currencyWindow.A"].value).toBe(60);
    });
  });

  describe("setPolicyValue", () => {
    it("creates a new value and audit log", async () => {
      const prisma = createMockPrisma();
      const engine = new PolicyEngine(prisma);

      await engine.setPolicyValue({
        key: "wind.maxKnots.tandem",
        scope: "DROPZONE",
        dropzoneId: 1,
        value: 18,
        userId: 1,
        reason: "Higher wind tolerance for this DZ",
      });

      expect(prisma.policyValue.create).toHaveBeenCalled();
      expect(prisma.policyAuditLog.create).toHaveBeenCalled();

      const auditCall = prisma.policyAuditLog.create.mock.calls[0][0].data;
      expect(auditCall.newValue).toBe(18);
      expect(auditCall.reason).toBe("Higher wind tolerance for this DZ");
    });

    it("throws for unknown key", async () => {
      const prisma = createMockPrisma();
      prisma.policyDefinition.findFirst.mockResolvedValueOnce(null);
      const engine = new PolicyEngine(prisma);

      await expect(
        engine.setPolicyValue({ key: "unknown", scope: "PLATFORM", value: 1, userId: 1 })
      ).rejects.toThrow("Policy definition not found");
    });
  });

  describe("resolve convenience method", () => {
    it("returns fallback when not found", async () => {
      const prisma = createMockPrisma();
      prisma.policyDefinition.findFirst.mockResolvedValueOnce(null);
      const engine = new PolicyEngine(prisma);

      const result = await engine.resolve("unknown", {}, 42);

      expect(result).toBe(42);
    });
  });
});
