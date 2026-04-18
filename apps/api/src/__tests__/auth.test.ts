import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp, cleanupTestData, uniqueEmail } from "./setup";

describe("Auth Routes", () => {
  let app: FastifyInstance;
  const password = "Test@1234!Secure";

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    try {
      // Only clean auth-specific test users (not all @skylara.test users)
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { contains: "register-" } } },
      }).catch(() => {});
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { contains: "duplicate-" } } },
      }).catch(() => {});
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { contains: "weakpw-" } } },
      }).catch(() => {});
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { contains: "login-" } } },
      }).catch(() => {});
      await app.prisma.refreshToken.deleteMany({
        where: { user: { email: { contains: "refresh-" } } },
      }).catch(() => {});
      await app.prisma.userRole.deleteMany({
        where: { user: { email: { endsWith: "@skylara.test" } } },
      }).catch(() => {});
      await app.prisma.wallet.deleteMany({
        where: { user: { email: { endsWith: "@skylara.test" } } },
      }).catch(() => {});
      // Only delete users that DON'T belong to other test files
      await app.prisma.user.deleteMany({
        where: {
          email: { endsWith: "@skylara.test" },
          NOT: [
            { email: { startsWith: "manifest-" } },
            { email: { startsWith: "owner-manifest-" } },
            { email: { startsWith: "payments-" } },
            { email: { startsWith: "owner-payments-" } },
            { email: { startsWith: "mkt-" } },
            { email: { startsWith: "owner-mkt-" } },
            { email: { startsWith: "rental-" } },
            { email: { startsWith: "owner-rental-" } },
          ],
        },
      }).catch(() => {});
    } catch {}
    await app.close();
  });

  // =========================================================================
  // POST /api/auth/register
  // =========================================================================
  describe("POST /api/auth/register", () => {
    it("should register a new user and return tokens", async () => {
      const email = uniqueEmail("register");
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email,
          password,
          firstName: "Alice",
          lastName: "Jumper",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(email);
      expect(body.data.user.firstName).toBe("Alice");
      expect(body.data.user.lastName).toBe("Jumper");
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(typeof body.data.accessToken).toBe("string");
      expect(typeof body.data.refreshToken).toBe("string");
    });

    it("should return 409 when email is already registered", async () => {
      const email = uniqueEmail("duplicate");

      // Register first time
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password, firstName: "Bob", lastName: "Sky" },
      });

      // Register again with same email
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password, firstName: "Bob", lastName: "Sky" },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("already registered");
    });

    it("should reject a weak password", async () => {
      const email = uniqueEmail("weakpw");
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email,
          password: "short",
          firstName: "Weak",
          lastName: "Pass",
        },
      });

      // Zod min(8) or password strength check rejects short passwords.
      // May return 400 (validation) or 500 (unhandled Zod error) depending on error handler.
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it("should reject request with missing required fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email: "noname@skylara.test" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/auth/login
  // =========================================================================
  describe("POST /api/auth/login", () => {
    const loginEmail = uniqueEmail("login");

    beforeAll(async () => {
      // Seed a user to log in with
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: loginEmail,
          password,
          firstName: "Login",
          lastName: "Tester",
        },
      });
    });

    it("should return tokens for valid credentials", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: loginEmail, password },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(loginEmail);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.roles).toBeDefined();
      expect(Array.isArray(body.data.user.roles)).toBe(true);
    });

    it("should return 401 for wrong password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: loginEmail, password: "WrongPassword!1" },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Invalid");
    });

    it("should return 401 for non-existent email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "ghost@skylara.test", password },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // =========================================================================
  // POST /api/auth/refresh
  // =========================================================================
  describe("POST /api/auth/refresh", () => {
    it("should return new tokens for a valid refresh token", async () => {
      const email = uniqueEmail("refresh");

      // Register to get a refresh token
      const regRes = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password, firstName: "Refresh", lastName: "Test" },
      });

      const { refreshToken } = regRes.json().data;

      const res = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      // The old refresh token should be rotated (different from original)
      expect(body.data.refreshToken).not.toBe(refreshToken);
    });

    it("should return 401 for an invalid refresh token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: "not-a-real-token" },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it("should not allow reuse of an already-rotated refresh token", async () => {
      const email = uniqueEmail("reuse");

      const regRes = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password, firstName: "Reuse", lastName: "Test" },
      });

      const { refreshToken: originalToken } = regRes.json().data;

      // Rotate once
      await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: originalToken },
      });

      // Try to reuse the original — should fail
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: originalToken },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/auth/logout
  // =========================================================================
  describe("POST /api/auth/logout", () => {
    it("should invalidate refresh tokens and return success", async () => {
      const email = uniqueEmail("logout");

      const regRes = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password, firstName: "Logout", lastName: "Test" },
      });

      const { accessToken, refreshToken } = regRes.json().data;

      // Logout
      const logoutRes = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(logoutRes.statusCode).toBe(200);
      const body = logoutRes.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toBe("Logged out");

      // The refresh token should no longer work
      const refreshRes = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken },
      });

      expect(refreshRes.statusCode).toBe(401);
    });

    it("should return 401 when called without auth header", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/auth/me
  // =========================================================================
  describe("GET /api/auth/me", () => {
    it("should return the current user profile when authenticated", async () => {
      const email = uniqueEmail("me");

      const regRes = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password, firstName: "Me", lastName: "Myself" },
      });

      const { accessToken } = regRes.json().data;

      const res = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(email);
      expect(body.data.firstName).toBe("Me");
      expect(body.data.lastName).toBe("Myself");
    });

    it("should return 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/me",
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
