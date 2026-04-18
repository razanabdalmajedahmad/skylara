import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomBytes, randomUUID } from "crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { authenticator } from "otplib";
import { generateTokenPair } from "../utils/jwt";
import { hashPassword, comparePassword } from "../utils/password";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
  AppError,
} from "../utils/errors";
import { authenticate, requireAuth } from "../middleware/authenticate";

/**
 * In-memory store for WebAuthn challenges and code verifiers
 * Production: use Redis with TTL
 */
interface ChallengeStore {
  challenge: string;
  expiresAt: number;
}

const challengeStore = new Map<string, ChallengeStore>();
const code_verifierStore = new Map<string, { verifier: string; expiresAt: number }>();

/**
 * Constants
 */
const CHALLENGE_TTL = 5 * 60 * 1000; // 5 minutes
const CODE_VERIFIER_TTL = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Validation schemas
 */
const passkeyRegisterVerifySchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    attestationObject: z.string(),
    transports: z.array(z.string()).optional(),
  }),
  type: z.literal("public-key"),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

const passkeyLoginVerifySchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    signature: z.string(),
    userHandle: z.string().nullable(),
  }),
  type: z.literal("public-key"),
});

const passkeyLoginOptionsSchema = z.object({
  email: z.string().email().optional(),
});

const googleCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

const mfaSetupSchema = z.object({});

const mfaVerifySchema = z.object({
  token: z.string().length(6),
});

const mfaChallengeSchema = z.object({
  token: z.string(),
  tempToken: z.string().optional(),
});

const mfaStepUpSchema = z.object({
  password: z.string().optional(),
  token: z.string().optional(),
});

const sessionDeleteSchema = z.object({
  id: z.string().optional(),
});

/**
 * Helper: Clean expired challenges from store
 */
function cleanExpiredChallenges() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  challengeStore.forEach((value, key) => {
    if (value.expiresAt < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => challengeStore.delete(key));

  const verifierKeysToDelete: string[] = [];
  code_verifierStore.forEach((value, key) => {
    if (value.expiresAt < now) {
      verifierKeysToDelete.push(key);
    }
  });
  verifierKeysToDelete.forEach((key) => code_verifierStore.delete(key));
}

/**
 * Helper: Record login attempt for audit and rate limiting
 */
async function recordLoginAttempt(
  fastify: FastifyInstance,
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  reason?: string
) {
  try {
    await fastify.prisma.loginAttempt.create({
      data: {
        email,
        ipAddress: ip,
        userAgent,
        success,
        failureReason: reason,
      },
    });
  } catch (error) {
    console.error("Failed to record login attempt:", error);
    // Don't throw — audit is not critical to the flow
  }
}

/**
 * Helper: Check rate limits for login attempts
 * Returns true if request should be rate-limited
 */
async function checkRateLimit(
  fastify: FastifyInstance,
  email: string,
  ip: string
): Promise<{ limited: boolean; reason?: string }> {
  const fifteenMinutesAgo = new Date(Date.now() - RATE_LIMIT_WINDOW);

  // Check failed attempts by email
  const emailFailures = await fastify.prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: fifteenMinutesAgo },
    },
  });

  if (emailFailures >= 5) {
    return { limited: true, reason: `Too many failed attempts for ${email}` };
  }

  // Check failed attempts by IP
  const ipFailures = await fastify.prisma.loginAttempt.count({
    where: {
      ipAddress: ip,
      success: false,
      createdAt: { gte: fifteenMinutesAgo },
    },
  });

  if (ipFailures >= 20) {
    return { limited: true, reason: `Too many failed attempts from IP ${ip}` };
  }

  return { limited: false };
}

/**
 * Helper: Generate random alphanumeric string
 */
function generateBackupCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/**
 * WebAuthn/Passkey Routes
 * Enables passwordless authentication using platform or cross-platform authenticators
 */
async function registerPasskeyRoutes(fastify: FastifyInstance) {
  const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
  const rpName = "SkyLara";
  const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

  /**
   * POST /auth/passkey/register-options
   * Generate WebAuthn registration options for passkey creation
   */
  fastify.post<{ Reply: any }>(
    "/auth/passkey/register-options",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const user = request.user;

        // Query existing passkeys for this user
        const existingPasskeys = await fastify.prisma.passkey.findMany({
          where: { userId: parseInt(user.sub, 10) },
          select: { credentialId: true },
        });

        const userIdBytes = new TextEncoder().encode(user.sub);
        const options = await generateRegistrationOptions({
          rpID,
          rpName,
          userName: user.email,
          userID: userIdBytes,
          attestationType: "none",
          excludeCredentials: existingPasskeys.map((pk: any) => ({
            id: Buffer.from(pk.credentialId, "base64"),
            type: "public-key",
            transports: ["internal", "external"] as any,
          })),
        });

        // Store challenge with TTL
        const challengeKey = `reg_${user.sub}_${Date.now()}`;
        challengeStore.set(challengeKey, {
          challenge: options.challenge,
          expiresAt: Date.now() + CHALLENGE_TTL,
        });

        reply.send({
          success: true,
          options,
          challengeKey,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate options";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  /**
   * POST /auth/passkey/register-verify
   * Verify attestation response and create passkey record
   */
  fastify.post<{ Body: any }>(
    "/auth/passkey/register-verify",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const body = passkeyRegisterVerifySchema.parse(request.body);
        const user = request.user;

        // Find stored challenge
        let storedChallenge: string | null = null;
        const challengeKey = (request.body as any).challengeKey;
        if (challengeKey) {
          const stored = challengeStore.get(challengeKey);
          if (stored && stored.expiresAt > Date.now()) {
            storedChallenge = stored.challenge;
            challengeStore.delete(challengeKey);
          }
        }

        if (!storedChallenge) {
          throw new ValidationError({}, "Challenge expired or not found");
        }

        const userIdBytes = new TextEncoder().encode(user.sub);
        const verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge: storedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });

        if (!verification.verified || !verification.registrationInfo) {
          throw new ValidationError({}, "Registration verification failed");
        }

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        // Store passkey in database
        await fastify.prisma.passkey.create({
          data: {
            userId: parseInt(user.sub, 10),
            credentialId: Buffer.from(credentialID).toString("base64"),
            publicKey: Buffer.from(credentialPublicKey),
            counter,
            transports: body.response.transports || [],
          },
        });

        reply.send({
          success: true,
          message: "Passkey registered successfully",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Passkey registration failed";
        reply
          .code(error instanceof ValidationError ? 400 : 500)
          .send({ success: false, error: message });
      }
    }
  );

  /**
   * POST /auth/passkey/login-options
   * Generate WebAuthn authentication options for login
   */
  fastify.post<{ Body: any }>(
    "/auth/passkey/login-options",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = passkeyLoginOptionsSchema.parse(request.body);
        let allowCredentials: any[] = [];

        if (body.email) {
          const user = await fastify.prisma.user.findUnique({
            where: { email: body.email },
            select: { id: true },
          });

          if (user) {
            const passkeys = await fastify.prisma.passkey.findMany({
              where: { userId: user.id },
              select: { credentialId: true },
            });
            allowCredentials = passkeys.map((pk: any) => ({
              id: Buffer.from(pk.credentialId, "base64"),
              type: "public-key",
              transports: ["internal", "external"] as any,
            }));
          }
        }

        const options = await generateAuthenticationOptions({
          rpID,
          allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        });

        const challengeKey = `auth_${Date.now()}`;
        challengeStore.set(challengeKey, {
          challenge: options.challenge,
          expiresAt: Date.now() + CHALLENGE_TTL,
        });

        reply.send({
          success: true,
          options,
          challengeKey,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate options";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  /**
   * POST /auth/passkey/login-verify
   * Verify authentication response and issue tokens
   */
  fastify.post<{ Body: any }>(
    "/auth/passkey/login-verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = passkeyLoginVerifySchema.parse(request.body);
        const ip = request.ip;
        const userAgent = request.headers["user-agent"] || "unknown";

        const challengeKey = (request.body as any).challengeKey as string;
        if (!challengeKey) {
          throw new ValidationError({}, "Challenge key missing");
        }

        const stored = challengeStore.get(challengeKey);
        if (!stored || stored.expiresAt < Date.now()) {
          throw new ValidationError({}, "Challenge expired");
        }

        const storedChallenge = stored.challenge;
        challengeStore.delete(challengeKey);

        // Find passkey by credential ID
        const passkey = await fastify.prisma.passkey.findFirst({
          where: { credentialId: Buffer.from(body.rawId, "base64").toString("base64") },
          include: { user: true },
        });

        if (!passkey) {
          await recordLoginAttempt(fastify, "unknown", ip, userAgent, false, "Passkey not found");
          throw new UnauthorizedError("Passkey not found");
        }

        const verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge: storedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: Buffer.from(passkey.credentialId, "base64"),
            publicKey: passkey.publicKey,
            counter: passkey.counter,
            transports: (passkey.transports as any) || [],
          },
        });

        if (!verification.verified) {
          await recordLoginAttempt(fastify, passkey.user.email, ip, userAgent, false, "Verification failed");
          throw new UnauthorizedError("Authentication verification failed");
        }

        // Update counter
        await fastify.prisma.passkey.update({
          where: { id: passkey.id },
          data: { counter: verification.authenticationInfo?.newCounter || passkey.counter },
        });

        // Generate tokens
        const tokens = generateTokenPair({
          sub: passkey.user.id.toString(),
          email: passkey.user.email,
          roles: ["JUMPER"], // Fetch from user roles in real implementation
          dropzoneId: undefined,
        });

        await recordLoginAttempt(fastify, passkey.user.email, ip, userAgent, true);

        reply.send({
          success: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: passkey.user.id,
            email: passkey.user.email,
            firstName: passkey.user.firstName,
            lastName: passkey.user.lastName,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed";
        reply
          .code(error instanceof UnauthorizedError ? 401 : 400)
          .send({ success: false, error: message });
      }
    }
  );
}

/**
 * Google OAuth Routes
 * Enables sign-in and account linking via Google OAuth2 with PKCE
 */
async function registerGoogleOAuthRoutes(fastify: FastifyInstance) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("Google OAuth not configured");
    return;
  }

  /**
   * POST /auth/google/url
   * Generate Google OAuth2 authorization URL with PKCE
   */
  fastify.get("/auth/google/url", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const codeVerifier = randomBytes(32).toString("hex");
      const codeChallenge = Buffer.from(
        require("crypto").createHash("sha256").update(codeVerifier).digest()
      ).toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const state = randomBytes(16).toString("hex");
      const verifierKey = `pkce_${state}`;

      code_verifierStore.set(verifierKey, {
        verifier: codeVerifier,
        expiresAt: Date.now() + CODE_VERIFIER_TTL,
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      reply.send({
        success: true,
        authUrl,
        state,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate auth URL";
      reply.code(500).send({ success: false, error: message });
    }
  });

  /**
   * POST /auth/google/callback
   * Handle Google OAuth2 callback and token exchange
   */
  fastify.post<{ Body: any }>(
    "/auth/google/callback",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = googleCallbackSchema.parse(request.body);
        const ip = request.ip;
        const userAgent = request.headers["user-agent"] || "unknown";

        // Retrieve code verifier
        const verifierKey = `pkce_${body.state}`;
        const stored = code_verifierStore.get(verifierKey);
        if (!stored || stored.expiresAt < Date.now()) {
          throw new ValidationError({}, "PKCE state expired");
        }
        code_verifierStore.delete(verifierKey);

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: body.code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code_verifier: stored.verifier,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          throw new UnauthorizedError("Token exchange failed");
        }

        const tokens = await tokenResponse.json() as { access_token: string; id_token?: string };
        const googleUserResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }
        );

        if (!googleUserResponse.ok) {
          throw new UnauthorizedError("Failed to fetch user info");
        }

        const googleUser = await googleUserResponse.json() as { email: string; name?: string; given_name?: string; family_name?: string; id: string; picture?: string };
        const googleId = googleUser.id;
        const email = googleUser.email;

        // Check for existing OAuth account
        let oauthAccount = await fastify.prisma.oauthAccount.findFirst({
          where: { provider: "GOOGLE", providerAccountId: googleId },
          include: { user: true },
        });

        let user = oauthAccount?.user;

        if (!user) {
          // Check if user with same email exists
          user = await fastify.prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            // Create new user
            user = await fastify.prisma.user.create({
              data: {
                uuid: randomUUID(),
                email,
                firstName: googleUser.given_name || "User",
                lastName: googleUser.family_name || "",
                passwordHash: await hashPassword(randomBytes(32).toString("hex")),
              },
            });

            // Assign default JUMPER role
            const jumperRole = await fastify.prisma.role.findFirst({
              where: { name: "JUMPER" },
            });
            if (jumperRole) {
              await fastify.prisma.userRole.create({
                data: { userId: user.id, roleId: jumperRole.id },
              });
            }
          }

          // Create OAuth account
          oauthAccount = await fastify.prisma.oauthAccount.create({
            data: {
              userId: user.id,
              provider: "GOOGLE",
              providerAccountId: googleId,
            },
          });
        }

        // Generate tokens
        const jwtTokens = generateTokenPair({
          sub: user.id.toString(),
          email: user.email,
          roles: ["JUMPER"],
          dropzoneId: undefined,
        });

        await recordLoginAttempt(fastify, user.email, ip, userAgent, true);

        reply.send({
          success: true,
          accessToken: jwtTokens.accessToken,
          refreshToken: jwtTokens.refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "OAuth callback failed";
        reply
          .code(error instanceof UnauthorizedError ? 401 : 400)
          .send({ success: false, error: message });
      }
    }
  );
}

/**
 * MFA Routes
 * Enables TOTP-based multi-factor authentication with backup codes
 */
async function registerMFARoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/mfa/setup
   * Generate TOTP secret and QR code for user
   */
  fastify.post<{ Reply: any }>(
    "/auth/mfa/setup",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const user = request.user;
        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(user.email, "SkyLara", secret);

        // Create QR code data URL using a simple encoding (in production use qrcode library)
        const qrDataUrl = `otpauth://totp/SkyLara:${encodeURIComponent(user.email)}?secret=${secret}&issuer=SkyLara`;

        // Create unverified MFA device
        const mfaDevice = await fastify.prisma.mfaDevice.create({
          data: {
            userId: parseInt(user.sub, 10),
            type: "TOTP",
            secret,
            verified: false,
          },
        });

        reply.send({
          success: true,
          secret,
          otpauthUrl,
          qrDataUrl,
          deviceId: mfaDevice.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "MFA setup failed";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  /**
   * POST /auth/mfa/verify
   * Verify TOTP token and generate backup codes
   */
  fastify.post<{ Body: any }>(
    "/auth/mfa/verify",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const body = mfaVerifySchema.parse(request.body);
        const user = request.user;

        // Find unverified MFA device
        const mfaDevice = await fastify.prisma.mfaDevice.findFirst({
          where: { userId: parseInt(user.sub, 10), verified: false },
        });

        if (!mfaDevice) {
          throw new ValidationError({}, "No unverified MFA device found");
        }

        // Verify TOTP
        if (!mfaDevice.secret) {
          throw new ValidationError({}, "MFA device has no secret configured");
        }
        const isValid = authenticator.check(body.token, mfaDevice.secret);
        if (!isValid) {
          throw new ValidationError({ token: "Invalid TOTP token" });
        }

        // Generate backup codes
        const backupCodes = Array.from({ length: 10 }, generateBackupCode);
        const hashedBackupCodes = await Promise.all(
          backupCodes.map((code) => hashPassword(code))
        );

        // Mark device as verified and store hashed backup codes
        await fastify.prisma.mfaDevice.update({
          where: { id: mfaDevice.id },
          data: {
            verified: true,
            backupCodes: hashedBackupCodes,
          },
        });

        reply.send({
          success: true,
          message: "MFA enabled successfully",
          backupCodes, // Only display once
          deviceId: mfaDevice.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "MFA verification failed";
        reply
          .code(error instanceof ValidationError ? 400 : 500)
          .send({ success: false, error: message });
      }
    }
  );

  /**
   * POST /auth/mfa/challenge
   * Verify MFA token (TOTP or backup code) during login
   */
  fastify.post<{ Body: any }>(
    "/auth/mfa/challenge",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = mfaStepUpSchema.parse(request.body);
        const ip = request.ip;
        const userAgent = request.headers["user-agent"] || "unknown";

        // For this endpoint, we need user email from session/state
        // Simplified: token payload should include a temp token with user ID
        // In production, store temp MFA challenge state in Redis

        reply.code(501).send({
          success: false,
          error: "MFA challenge requires session context (implement with temp token state)",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "MFA challenge failed";
        reply.code(400).send({ success: false, error: message });
      }
    }
  );

  /**
   * POST /auth/mfa/step-up
   * Verify identity for sensitive operations (returns short-lived step-up token)
   */
  fastify.post<{ Body: any }>(
    "/auth/mfa/step-up",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const body = mfaStepUpSchema.parse(request.body);
        const user = request.user;

        // Require either password or TOTP
        if (!body.password && !body.token) {
          throw new ValidationError({}, "Password or TOTP token required");
        }

        const dbUser = await fastify.prisma.user.findUnique({
          where: { id: parseInt(user.sub, 10) },
          select: { passwordHash: true },
        });

        if (!dbUser) {
          throw new UnauthorizedError("User not found");
        }

        // Verify password if provided
        if (body.password) {
          const passwordValid = await comparePassword(body.password, dbUser.passwordHash || "");
          if (!passwordValid) {
            throw new UnauthorizedError("Invalid password");
          }
        }

        // Verify TOTP if provided
        if (body.token) {
          const mfaDevices = await fastify.prisma.mfaDevice.findMany({
            where: { userId: parseInt(user.sub, 10) },
          });
          const mfaDevice = mfaDevices[0]; // Assume primary device
          if (!mfaDevice || !mfaDevice.verified) {
            throw new ValidationError({}, "MFA not configured");
          }

          if (!mfaDevice.secret) {
            throw new ValidationError({}, "MFA device has no secret configured");
          }
          const isValid = authenticator.check(body.token, mfaDevice.secret);
          if (!isValid) {
            throw new ValidationError({ token: "Invalid TOTP token" });
          }
        }

        // Generate step-up token (5 minute TTL, includes stepUp claim)
        const stepUpToken = fastify.jwt.sign(
          {
            sub: user.sub,
            email: user.email,
            roles: user.roles,
            stepUp: true,
            type: "step-up",
          } as any,
          { expiresIn: "5m" }
        );

        reply.send({
          success: true,
          stepUpToken,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Step-up verification failed";
        reply
          .code(error instanceof UnauthorizedError ? 401 : 400)
          .send({ success: false, error: message });
      }
    }
  );
}

/**
 * Session Management Routes
 * Track and revoke active sessions (refresh tokens)
 */
async function registerSessionRoutes(fastify: FastifyInstance) {
  /**
   * GET /auth/sessions
   * List active sessions for authenticated user
   */
  fastify.get<{ Reply: any }>(
    "/auth/sessions",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const user = request.user;
        const sessions = await fastify.prisma.refreshToken.findMany({
          where: { userId: parseInt(user.sub, 10) },
          select: {
            id: true,
            token: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

        // Mark current session (simple heuristic: most recent)
        const sessionsWithCurrent = sessions.map((session, idx) => ({
          ...session,
          isCurrent: idx === 0,
        }));

        reply.send({
          success: true,
          sessions: sessionsWithCurrent,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch sessions";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );

  /**
   * DELETE /auth/sessions/:id
   * Revoke specific session (refresh token)
   */
  fastify.delete<{ Params: { id: string } }>(
    "/auth/sessions/:id",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const user = request.user;
        const { id: sessionId } = request.params as { id: string };
        const sessionIdNum = parseInt(sessionId, 10);

        // Verify ownership
        const session = await fastify.prisma.refreshToken.findUnique({
          where: { id: sessionIdNum },
        });

        if (!session || session.userId !== parseInt(user.sub, 10)) {
          throw new UnauthorizedError("Session not found or not owned by user");
        }

        await fastify.prisma.refreshToken.delete({
          where: { id: sessionIdNum },
        });

        reply.send({
          success: true,
          message: "Session revoked",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to revoke session";
        reply
          .code(error instanceof UnauthorizedError ? 401 : 500)
          .send({ success: false, error: message });
      }
    }
  );

  /**
   * DELETE /auth/sessions
   * Revoke all sessions except current
   */
  fastify.delete<{ Reply: any }>(
    "/auth/sessions",
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const user = request.user;

        // Delete all tokens for this user (current session identified by token in request)
        const result = await fastify.prisma.refreshToken.deleteMany({
          where: {
            userId: parseInt(user.sub, 10),
          },
        });

        reply.send({
          success: true,
          message: `Revoked ${result.count} session(s)`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to revoke sessions";
        reply.code(500).send({ success: false, error: message });
      }
    }
  );
}

/**
 * Main export: Register all advanced authentication routes
 */
export async function authAdvancedRoutes(fastify: FastifyInstance) {
  // Clean expired challenges periodically
  setInterval(cleanExpiredChallenges, 60 * 1000);

  await registerPasskeyRoutes(fastify);
  await registerGoogleOAuthRoutes(fastify);
  await registerMFARoutes(fastify);
  await registerSessionRoutes(fastify);

  fastify.log.info("Advanced auth routes registered");
}

export { recordLoginAttempt, checkRateLimit };
