import { describe, it, expect, vi } from "vitest";
import { VerificationService } from "../services/verificationService";

// ============================================================================
// VERIFICATION SERVICE TESTS
// Tests CRUD, state transitions, role gating, and expiry
// ============================================================================

function createMockPrisma() {
  const verifications: any[] = [];
  const history: any[] = [];

  return {
    verification: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.entityType_entityId) {
          return verifications.find(
            v => v.entityType === where.entityType_entityId.entityType &&
                 v.entityId === where.entityType_entityId.entityId
          ) ?? null;
        }
        return null;
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = verifications.find(
          v => v.entityType === where.entityType_entityId.entityType &&
               v.entityId === where.entityType_entityId.entityId
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const newV = { id: verifications.length + 1, ...create };
        verifications.push(newV);
        return newV;
      }),
      findMany: vi.fn(async () => verifications),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    verificationHistory: {
      create: vi.fn(async ({ data }: any) => {
        history.push(data);
        return data;
      }),
      findMany: vi.fn(async () => history),
    },
    license: {
      update: vi.fn(async () => ({})),
    },
    _verifications: verifications,
    _history: history,
  } as any;
}

describe("VerificationService", () => {
  describe("verify", () => {
    it("creates a new verification and history entry", async () => {
      const prisma = createMockPrisma();
      const service = new VerificationService(prisma);

      const result = await service.verify({
        entityType: "LICENSE",
        entityId: 1,
        dropzoneId: 1,
        status: "STAFF_VERIFIED",
        verifiedById: 10,
        source: "Visual check",
      });

      expect(result.entityType).toBe("LICENSE");
      expect(result.status).toBe("STAFF_VERIFIED");
      expect(prisma.verificationHistory.create).toHaveBeenCalled();
    });

    it("updates existing verification and tracks history", async () => {
      const prisma = createMockPrisma();
      const service = new VerificationService(prisma);

      // First verify as self-declared
      await service.verify({
        entityType: "GEAR_ITEM",
        entityId: 5,
        dropzoneId: 1,
        status: "SELF_DECLARED",
        verifiedById: 20,
      });

      // Then staff verifies
      await service.verify({
        entityType: "GEAR_ITEM",
        entityId: 5,
        dropzoneId: 1,
        status: "STAFF_VERIFIED",
        verifiedById: 10,
        source: "Physical inspection",
      });

      expect(prisma.verificationHistory.create).toHaveBeenCalledTimes(2);
      const lastHistory = prisma._history[1];
      expect(lastHistory.fromStatus).toBe("SELF_DECLARED");
      expect(lastHistory.toStatus).toBe("STAFF_VERIFIED");
    });

    it("also updates legacy License fields for LICENSE entityType", async () => {
      const prisma = createMockPrisma();
      const service = new VerificationService(prisma);

      await service.verify({
        entityType: "LICENSE",
        entityId: 1,
        dropzoneId: 1,
        status: "AUTHORITY_VERIFIED",
        verifiedById: 10,
      });

      expect(prisma.license.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ verifiedBy: 10 }),
      });
    });
  });

  describe("getVerification", () => {
    it("returns null for non-existent entity", async () => {
      const prisma = createMockPrisma();
      const service = new VerificationService(prisma);

      const result = await service.getVerification("LICENSE", 999);

      expect(result).toBeNull();
    });
  });

  describe("getReviewQueue", () => {
    it("returns empty array when no items need review", async () => {
      const prisma = createMockPrisma();
      const service = new VerificationService(prisma);

      const queue = await service.getReviewQueue(1);

      expect(queue).toEqual([]);
    });
  });

  describe("checkExpiry", () => {
    it("calls updateMany to expire old verifications", async () => {
      const prisma = createMockPrisma();
      const service = new VerificationService(prisma);

      const result = await service.checkExpiry();

      expect(result.expired).toBe(0);
      expect(prisma.verification.updateMany).toHaveBeenCalled();
    });
  });

  describe("canSetState (static)", () => {
    it("allows anyone to set SELF_DECLARED", () => {
      expect(VerificationService.canSetState("SELF_DECLARED", ["ATHLETE"])).toBe(true);
    });

    it("requires RIGGER role for RIGGER_VERIFIED", () => {
      expect(VerificationService.canSetState("RIGGER_VERIFIED", ["ATHLETE"])).toBe(false);
      expect(VerificationService.canSetState("RIGGER_VERIFIED", ["RIGGER"])).toBe(true);
    });

    it("requires PILOT for PILOT_CONFIRMED", () => {
      expect(VerificationService.canSetState("PILOT_CONFIRMED", ["MANIFEST_STAFF"])).toBe(false);
      expect(VerificationService.canSetState("PILOT_CONFIRMED", ["PILOT"])).toBe(true);
    });

    it("DZ_MANAGER can set any state", () => {
      expect(VerificationService.canSetState("STAFF_VERIFIED", ["DZ_MANAGER"])).toBe(true);
      expect(VerificationService.canSetState("AUTHORITY_VERIFIED", ["DZ_MANAGER"])).toBe(true);
    });
  });
});
