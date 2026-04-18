import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { generateTokenPair } from "../utils/jwt";
import { hashPassword, comparePassword } from "../utils/password";
import { validatePasswordStrength } from "../utils/passwordValidation";
import { ValidationError, UnauthorizedError, ConflictError } from "../utils/errors";
import { authenticate } from "../middleware/authenticate";
import {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../services/emailService";
import { AuditService } from "../services/auditService";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  licenseeNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  fastify.post<{ Body: z.infer<typeof registerSchema> }>(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "firstName", "lastName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            licenseeNumber: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = registerSchema.parse(request.body);

        // Advanced password validation
        const pwResult = validatePasswordStrength(body.password, body.email);
        if (!pwResult.valid) {
          reply.code(400).send({
            success: false,
            error: pwResult.message,
            passwordValidation: pwResult,
          });
          return;
        }

        // Check if user exists
        const existing = await fastify.prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existing) {
          throw new ConflictError("Email already registered");
        }

        // Hash password
        const hashedPassword = await hashPassword(body.password);

        // Create user
        const user = await fastify.prisma.user.create({
          data: {
            uuid: randomUUID(),
            email: body.email,
            passwordHash: hashedPassword,
            firstName: body.firstName,
            lastName: body.lastName,
          },
        });

        // Assign default JUMPER role
        const jumperRole = await fastify.prisma.role.findFirst({
          where: { name: "JUMPER" },
        });
        if (jumperRole) {
          await fastify.prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: jumperRole.id,
            },
          });
        }

        const userRoles = jumperRole ? ["JUMPER"] : [];

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair({
          sub: String(user.id),
          email: user.email,
          dropzoneId: "",
          roles: userRoles,
        });

        // Store refresh token
        await fastify.prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        const regIp = request.ip || "unknown";
        const regUa = request.headers["user-agent"] || "unknown";
        await auditService.log({
          userId: user.id,
          dropzoneId: 0,
          action: "CREATE",
          entityType: "User",
          entityId: user.id,
          afterState: { email: user.email, source: "auth_register" },
          ipAddress: regIp,
          userAgent: regUa,
        });

        // Send welcome / registration confirmation email
        sendWelcomeEmail(user.email, user.firstName).catch((err) =>
          fastify.log.error(`Failed to send welcome email: ${err}`)
        );

        return reply.code(201).send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              roles: userRoles,
            },
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        if (error instanceof ValidationError || error instanceof ConflictError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: error.message,
          });
        } else {
          fastify.log.error(error);
          return reply.code(500).send({
            success: false,
            error: "Registration failed",
          });
        }
      }
    }
  );

  fastify.post<{ Body: z.infer<typeof loginSchema> }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = loginSchema.parse(request.body);

        const user = await fastify.prisma.user.findUnique({
          where: { email: body.email },
          include: {
            userRoles: {
              include: { role: true },
            },
            wallets: true,
            emergencyProfile: true,
          },
        });

        if (!user) {
          throw new UnauthorizedError("Invalid email or password");
        }

        const passwordValid = await comparePassword(
          body.password,
          user.passwordHash
        );

        if (!passwordValid) {
          throw new UnauthorizedError("Invalid email or password");
        }

        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const primaryDropzoneId = user.userRoles.find((ur) => ur.dropzoneId)?.dropzoneId;

        const { accessToken, refreshToken } = generateTokenPair({
          sub: String(user.id),
          email: user.email,
          dropzoneId: primaryDropzoneId ? String(primaryDropzoneId) : "",
          roles: roleNames,
        });

        // Store refresh token
        await fastify.prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Update lastLoginAt
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const clientIp = request.ip || "unknown";
        const userAgent = request.headers["user-agent"] || "unknown";
        await auditService.log({
          userId: user.id,
          dropzoneId: primaryDropzoneId ?? 0,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          afterState: { email: user.email, method: "password" },
          ipAddress: clientIp,
          userAgent: userAgent,
        });

        // Send login alert email (non-blocking)
        sendLoginAlertEmail(user.email, user.firstName, clientIp, userAgent).catch(
          (err) => fastify.log.error(`Failed to send login alert: ${err}`)
        );

        return reply.code(200).send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              roles: roleNames,
              wallet: user.wallets?.[0] || null,
              emergencyProfile: user.emergencyProfile,
            },
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return reply.code(401).send({
            success: false,
            error: error.message,
          });
        } else {
          return reply.code(500).send({
            success: false,
            error: "Login failed",
          });
        }
      }
    }
  );

  fastify.post<{ Body: z.infer<typeof refreshSchema> }>(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = refreshSchema.parse(request.body);

        const storedToken = await fastify.prisma.refreshToken.findUnique({
          where: { token: body.refreshToken },
          include: {
            user: {
              include: { userRoles: { include: { role: true } } },
            },
          },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
          throw new UnauthorizedError("Invalid or expired refresh token");
        }

        const user = storedToken.user;
        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const primaryDropzoneId = user.userRoles.find((ur) => ur.dropzoneId)?.dropzoneId;

        const { accessToken, refreshToken } = generateTokenPair({
          sub: String(user.id),
          email: user.email,
          dropzoneId: primaryDropzoneId ? String(primaryDropzoneId) : "",
          roles: roleNames,
        });

        // Invalidate old token and store new
        await fastify.prisma.refreshToken.delete({
          where: { token: body.refreshToken },
        });

        await fastify.prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          reply.code(401).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Token refresh failed",
          });
        }
      }
    }
  );

  fastify.post(
    "/auth/logout",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new UnauthorizedError();
        }

        const uid = parseInt(String(request.user.sub), 10);
        const clientIp = request.ip || "unknown";
        const userAgent = request.headers["user-agent"] || "unknown";
        await auditService.log({
          userId: uid,
          dropzoneId: 0,
          action: "LOGOUT",
          entityType: "User",
          entityId: uid,
          afterState: { source: "auth_logout" },
          ipAddress: clientIp,
          userAgent: userAgent,
        });

        // Invalidate all refresh tokens for user
        await fastify.prisma.refreshToken.deleteMany({
          where: { userId: uid },
        });

        reply.code(200).send({
          success: true,
          data: { message: "Logged out" },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Logout failed",
        });
      }
    }
  );

  fastify.get(
    "/auth/me",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new UnauthorizedError();
        }

        const userId = parseInt(request.user.sub, 10);
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: { include: { role: true } },
            wallets: true,
            emergencyProfile: true,
          },
        });

        if (!user) {
          throw new UnauthorizedError();
        }

        // Resolve primary dropzone from user roles
        const primaryRole = user.userRoles.find((ur) => ur.dropzoneId);
        const dropzoneId = primaryRole?.dropzoneId || null;
        const organizationId = primaryRole?.organizationId || null;

        reply.code(200).send({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.userRoles.map((ur) => ur.role.name),
            dropzoneId,
            organizationId,
            wallet: user.wallets?.[0] || null,
            emergencyProfile: user.emergencyProfile,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch user",
        });
      }
    }
  );

  // ============================================================================
  // FORGOT PASSWORD — generates a reset token
  // ============================================================================
  fastify.post<{ Body: z.infer<typeof forgotPasswordSchema> }>(
    "/auth/forgot-password",
    {
      schema: {
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { email } = forgotPasswordSchema.parse(request.body);

        const user = await fastify.prisma.user.findUnique({
          where: { email },
        });

        // Always return success to prevent email enumeration
        if (!user) {
          reply.code(200).send({
            success: true,
            message: "If that email is registered, a reset link has been generated.",
          });
          return;
        }

        // Invalidate any existing tokens
        await fastify.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        // Generate reset token (valid 1 hour)
        const token = randomUUID();
        await fastify.prisma.passwordResetToken.create({
          data: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        });

        // Send password reset email
        sendPasswordResetEmail(user.email, user.firstName, token).catch((err) =>
          fastify.log.error(`Failed to send reset email: ${err}`)
        );
        fastify.log.info(`Password reset token for ${email}: ${token}`);

        reply.code(200).send({
          success: true,
          message: "If that email is registered, a reset link has been generated.",
          // Include token in dev mode so the frontend can use it directly
          ...(process.env.NODE_ENV === "development" && { resetToken: token }),
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          success: false,
          error: "Failed to process password reset",
        });
      }
    }
  );

  // ============================================================================
  // RESET PASSWORD — consumes a token and sets new password
  // ============================================================================
  fastify.post<{ Body: z.infer<typeof resetPasswordSchema> }>(
    "/auth/reset-password",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { token, password } = resetPasswordSchema.parse(request.body);

        // Validate new password strength
        const pwResult = validatePasswordStrength(password);
        if (!pwResult.valid) {
          reply.code(400).send({
            success: false,
            error: pwResult.message,
            passwordValidation: pwResult,
          });
          return;
        }

        const resetToken = await fastify.prisma.passwordResetToken.findUnique({
          where: { token },
          include: { user: true },
        });

        if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
          reply.code(400).send({
            success: false,
            error: "Invalid or expired reset token",
          });
          return;
        }

        // Hash new password & update
        const hashedPassword = await hashPassword(password);
        await fastify.prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash: hashedPassword },
        });

        // Mark token as used
        await fastify.prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        });

        // Invalidate all refresh tokens (force re-login on all devices)
        await fastify.prisma.refreshToken.deleteMany({
          where: { userId: resetToken.userId },
        });

        // Audit log the password reset with device info
        const userAgent = request.headers['user-agent'] || 'unknown';
        const clientIp = request.ip || 'unknown';
        // Find a dropzone the user belongs to for audit context (or use 0 as system-level)
        const userRole = await fastify.prisma.userRole.findFirst({
          where: { userId: resetToken.userId },
          select: { dropzoneId: true },
        });
        const auditPayload = { event: 'password_reset_completed', device: userAgent, ip: clientIp, allSessionsInvalidated: true };
        const payloadStr = JSON.stringify(auditPayload);
        const { createHash } = await import('crypto');
        const checksum = createHash('sha256').update(payloadStr).digest('hex');
        await fastify.prisma.auditLog.create({
          data: {
            userId: resetToken.userId,
            dropzoneId: userRole?.dropzoneId ?? 0,
            action: 'UPDATE',
            entityType: 'PasswordReset',
            entityId: resetToken.userId,
            afterState: auditPayload,
            checksum,
          },
        }).catch(() => {});

        // Send password changed confirmation email
        sendPasswordChangedEmail(resetToken.user.email, resetToken.user.firstName).catch(
          (err) => fastify.log.error(`Failed to send password changed email: ${err}`)
        );

        reply.code(200).send({
          success: true,
          message: "Password has been reset. Please log in with your new password.",
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          success: false,
          error: "Failed to reset password",
        });
      }
    }
  );
}
