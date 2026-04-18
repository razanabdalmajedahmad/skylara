/**
 * FEDERATION / CROSS-DZ IDENTITY — Doc 17 §45
 *
 * Portable athlete identity across dropzones.
 * Shared: profile, aggregated jump count, license status, ratings.
 * NOT shared: financial records, incident details, internal DZ notes, waiver content.
 *
 * Privacy: athlete controls visibility via profile settings.
 *
 * Endpoints:
 *   GET  /api/federation/athlete/:uuid   — lookup athlete by UUID
 *   GET  /api/federation/verify-license  — verify license across federation
 *   POST /api/federation/link-account    — link athlete identity across DZs
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { AppError, NotFoundError } from "../utils/errors";

export async function federationRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prismaRead; // read replica for federation queries

  // GET /federation/athlete/:uuid — portable athlete profile
  fastify.get<{ Params: { uuid: string } }>(
    "/federation/athlete/:uuid",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { uuid } = request.params as { uuid: string };

        const user = await prisma.user.findUnique({
          where: { uuid },
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            profile: {
              select: { avatar: true, bio: true },
            },
          },
        });

        if (!user) {
          throw new NotFoundError("Athlete");
        }

        // Aggregate jump count across all DZs
        const jumpCount = await prisma.logbookEntry.count({
          where: { user: { uuid } },
        });

        // Get license info (public — level and status only, no PII)
        const license = await prisma.license.findFirst({
          where: { user: { uuid } },
          orderBy: { expiresAt: "desc" },
          select: {
            level: true,
            type: true,
            verifiedBy: true,
            expiresAt: true,
          },
        });

        // Get DZ memberships (names only)
        const memberships = await prisma.userRole.findMany({
          where: { user: { uuid } },
          select: {
            dropzone: { select: { name: true, slug: true } },
            role: { select: { name: true } },
          },
          distinct: ["dropzoneId"],
        });

        // Get achievements
        const achievements = await (prisma as any).athleteAchievement?.findMany({
          where: { athlete: { user: { uuid } } },
          include: { achievement: { select: { name: true, icon: true } } },
          take: 20,
        }).catch(() => []);

        reply.send({
          success: true,
          data: {
            uuid: user.uuid,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.profile?.avatar ?? null,
            bio: user.profile?.bio ?? null,
            memberSince: user.createdAt,
            jumpCount,
            license: license ? {
              level: license.level,
              type: license.type,
              verified: !!license.verifiedBy,
              current: license.expiresAt ? license.expiresAt > new Date() : true,
            } : null,
            dropzones: memberships
              .filter((m: any) => m.dropzone)
              .map((m: any) => ({
                name: m.dropzone.name,
                slug: m.dropzone.slug,
                role: m.role?.name,
              })),
            achievements: (achievements || []).map((a: any) => ({
              name: a.achievement?.name,
              icon: a.achievement?.icon,
            })),
            // Privacy notice
            _privacy: "This profile shows only publicly shared information. Financial records, incidents, and DZ-internal notes are never shared.",
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch athlete profile" });
        }
      }
    }
  );

  // GET /federation/verify-license — cross-DZ license verification
  fastify.get<{ Querystring: { licenseNumber?: string; authority?: string } }>(
    "/federation/verify-license",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { licenseNumber, authority } = request.query as {
          licenseNumber?: string;
          authority?: string;
        };

        if (!licenseNumber) {
          throw new AppError("licenseNumber is required", 400);
        }

        const license = await prisma.license.findFirst({
          where: {
            number: licenseNumber,
            ...(authority ? { type: authority } : {}),
          },
          include: {
            user: {
              select: { uuid: true, firstName: true, lastName: true },
            },
          },
        });

        if (!license) {
          reply.send({
            success: true,
            data: {
              found: false,
              message: "License not found in SkyLara federation",
            },
          });
          return;
        }

        reply.send({
          success: true,
          data: {
            found: true,
            athleteUuid: license.user.uuid,
            athleteName: `${license.user.firstName} ${license.user.lastName}`,
            level: license.level,
            type: license.type,
            verified: !!license.verifiedBy,
            current: license.expiresAt ? license.expiresAt > new Date() : true,
            expiresAt: license.expiresAt,
          },
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "License verification failed" });
        }
      }
    }
  );

  // POST /federation/link-account — link an athlete's identity across DZs
  fastify.post<{ Body: { targetDropzoneId: number } }>(
    "/federation/link-account",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = parseInt((request as any).user?.sub || "0");
        const { targetDropzoneId } = request.body as { targetDropzoneId: number };

        if (!targetDropzoneId) {
          throw new AppError("targetDropzoneId is required", 400);
        }

        // Check if DZ exists
        const dz = await fastify.prisma.dropzone.findUnique({
          where: { id: targetDropzoneId },
          select: { id: true, name: true },
        });
        if (!dz) {
          throw new NotFoundError("Dropzone");
        }

        // Check if user already has a role at this DZ
        const existing = await fastify.prisma.userRole.findFirst({
          where: { userId, dropzoneId: targetDropzoneId },
        });

        if (existing) {
          reply.send({
            success: true,
            data: { linked: true, message: "Already linked to this dropzone" },
          });
          return;
        }

        // Get ATHLETE role
        let athleteRole = await fastify.prisma.role.findFirst({
          where: { name: "ATHLETE" },
        });
        if (!athleteRole) {
          athleteRole = await fastify.prisma.role.create({
            data: { name: "ATHLETE", displayName: "Athlete" },
          });
        }

        // Create role assignment at new DZ
        await fastify.prisma.userRole.create({
          data: {
            userId,
            roleId: athleteRole.id,
            dropzoneId: targetDropzoneId,
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            linked: true,
            dropzone: dz.name,
            message: `Linked to ${dz.name} as ATHLETE`,
          },
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Account linking failed" });
        }
      }
    }
  );
}
