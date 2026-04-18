import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp, uniqueEmail, seedTestDropzone } from "./setup";
import { generateTokenPair } from "../utils/jwt";

/**
 * Payments route tests.
 *
 * The wallet/topup endpoint needs [authenticate, tenantScope].
 * The wallet/charge endpoint additionally needs authorize(["OPERATOR"]).
 * We seed a dropzone and grant the test user the OPERATOR role + dropzoneId
 * so all endpoints can be exercised.
 */
describe("Payments Routes", () => {
  let app: FastifyInstance;
  let accessToken: string;
  let userId: number;
  let dropzoneId: number;

  const password = "Test@1234!Secure";
  const email = uniqueEmail("payments");

  beforeAll(async () => {
    app = await buildApp();

    // ---- Seed org > dropzone > branch > aircraft ----
    const seed = await seedTestDropzone(app.prisma, "payments");
    dropzoneId = seed.dropzoneId;

    // ---- Register a user ----
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password, firstName: "Pay", lastName: "Tester" },
    });
    userId = regRes.json().data.user.id;

    // ---- Assign OPERATOR role with dropzoneId ----
    let operatorRole = await app.prisma.role.findFirst({ where: { name: "OPERATOR" } });
    if (!operatorRole) {
      operatorRole = await app.prisma.role.create({ data: { name: "OPERATOR", displayName: "Operator" } });
    }
    await app.prisma.userRole.create({
      data: {
        userId,
        roleId: operatorRole.id,
        dropzoneId,
      },
    });

    // ---- Generate a token with dropzoneId + OPERATOR ----
    const tokens = generateTokenPair({
      sub: String(userId),
      email,
      dropzoneId: String(dropzoneId),
      roles: ["OPERATOR"],
    });
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up ONLY data scoped to this test's dropzone to avoid P2034 conflicts
    // with other test files that share the same database.
    try {
      await app.prisma.transaction.deleteMany({
        where: { wallet: { dropzoneId } },
      }).catch(() => {});
      await app.prisma.wallet.deleteMany({
        where: { dropzoneId },
      }).catch(() => {});
      await app.prisma.auditLog.deleteMany({
        where: { dropzoneId },
      }).catch(() => {});
      await app.prisma.aircraft.deleteMany({ where: { dropzoneId } }).catch(() => {});
      await app.prisma.dzBranch.deleteMany({ where: { dropzoneId } }).catch(() => {});
      await app.prisma.syncOutbox.deleteMany({ where: { dropzoneId } }).catch(() => {});
      // Clean up users created by this test file only (payments-* and nowallet-* emails)
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { startsWith: "payments-" } } },
      }).catch(() => {});
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { startsWith: "nowallet-" } } },
      }).catch(() => {});
      await app.prisma.userRole.deleteMany({
        where: { user: { email: { startsWith: "payments-" } } },
      }).catch(() => {});
      await app.prisma.userRole.deleteMany({
        where: { user: { email: { startsWith: "nowallet-" } } },
      }).catch(() => {});
      await app.prisma.userRole.deleteMany({
        where: { user: { email: { startsWith: "owner-payments-" } } },
      }).catch(() => {});
      // Delete the dropzone and org
      const dz = await app.prisma.dropzone.findUnique({ where: { id: dropzoneId } });
      await app.prisma.dropzone.delete({ where: { id: dropzoneId } }).catch(() => {});
      if (dz?.organizationId) {
        await app.prisma.organization.delete({ where: { id: dz.organizationId } }).catch(() => {});
      }
      // Delete test users
      await app.prisma.user.deleteMany({
        where: { email: { startsWith: "payments-" } },
      }).catch(() => {});
      await app.prisma.user.deleteMany({
        where: { email: { startsWith: "nowallet-" } },
      }).catch(() => {});
      await app.prisma.user.deleteMany({
        where: { email: { startsWith: "owner-payments-" } },
      }).catch(() => {});
    } catch (e) {
      // Swallow cleanup errors to avoid masking test failures
    }
    await app.close();
  });

  // =========================================================================
  // GET /api/wallet
  // =========================================================================
  describe("GET /api/wallet", () => {
    it("should return wallet balance (creating wallet if needed)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/wallet",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.userId).toBe(userId);
      expect(typeof body.data.balance).toBe("number");
      expect(body.data).toHaveProperty("currency");
    });

    it("should return 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/wallet",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/wallet/topup
  // =========================================================================
  describe("POST /api/wallet/topup", () => {
    it("should add funds to the wallet", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/wallet/topup",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          amount: 100,
          paymentMethod: "CASH",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.transactionId).toBeDefined();
      expect(body.data.transactionUuid).toBeDefined();
      expect(body.data.amount).toBe(10000); // 100 * 100 cents
      expect(body.data.newBalance).toBe(10000);
    });

    it("should accumulate balance on subsequent top-ups", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/wallet/topup",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          amount: 50,
          paymentMethod: "CREDIT_CARD",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      // 10000 (from first top-up) + 5000 = 15000
      expect(body.data.newBalance).toBe(15000);
      expect(body.data.amount).toBe(5000);
    });

    it("should reject an invalid payment method", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/wallet/topup",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          amount: 25,
          paymentMethod: "BITCOIN",
        },
      });

      // Fastify schema validation or Zod will reject the enum
      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/wallet/charge
  // =========================================================================
  describe("POST /api/wallet/charge", () => {
    it("should deduct funds from the wallet", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/wallet/charge",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          amount: 25,
          description: "Jump fee",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(2500); // 25 * 100 cents
      // 15000 - 2500 = 12500
      expect(body.data.newBalance).toBe(12500);
    });

    it("should return 400 for insufficient balance", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/wallet/charge",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          amount: 99999,
          description: "Way too much",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Insufficient");
    });

    it("should require OPERATOR role", async () => {
      // Generate a token with only JUMPER role
      const jumperToken = generateTokenPair({
        sub: String(userId),
        email,
        dropzoneId: String(dropzoneId),
        roles: ["JUMPER"],
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/wallet/charge",
        headers: { authorization: `Bearer ${jumperToken.accessToken}` },
        payload: { amount: 10 },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/transactions
  // =========================================================================
  describe("GET /api/transactions", () => {
    it("should return transaction history", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/transactions",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // We did 2 top-ups + 1 charge = at least 3 transactions
      expect(body.data.length).toBeGreaterThanOrEqual(3);

      // Verify transaction shape
      const tx = body.data[0];
      expect(tx).toHaveProperty("id");
      expect(tx).toHaveProperty("uuid");
      expect(tx).toHaveProperty("type");
      expect(tx).toHaveProperty("amount");
      expect(tx).toHaveProperty("balanceAfter");
      expect(tx).toHaveProperty("description");
      expect(tx).toHaveProperty("createdAt");
    });

    it("should return 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/transactions",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should support pagination via limit and offset", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/transactions?limit=1&offset=0",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.length).toBe(1);
    });
  });

  // =========================================================================
  // Wallet auto-creation
  // =========================================================================
  describe("Wallet auto-creation", () => {
    it("should auto-create a wallet on first GET /api/wallet call", async () => {
      // Create a fresh user with no wallet
      const freshEmail = uniqueEmail("nowallet");
      const regRes = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: freshEmail,
          password,
          firstName: "No",
          lastName: "Wallet",
        },
      });
      const freshUserId = regRes.json().data.user.id;

      // Give them OPERATOR role with dropzoneId
      const operatorRole = await app.prisma.role.findFirst({ where: { name: "OPERATOR" } });
      await app.prisma.userRole.create({
        data: {
          userId: freshUserId,
          roleId: operatorRole!.id,
          dropzoneId,
        },
      });

      const freshToken = generateTokenPair({
        sub: String(freshUserId),
        email: freshEmail,
        dropzoneId: String(dropzoneId),
        roles: ["OPERATOR"],
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/wallet",
        headers: { authorization: `Bearer ${freshToken.accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.balance).toBe(0);
      expect(body.data.userId).toBe(freshUserId);
    });
  });
});
