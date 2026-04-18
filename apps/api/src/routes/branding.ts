import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import { AuditService } from "../services/auditService";

// ============================================================================
// WHITE-LABEL BRANDING API — Per-dropzone brand profile CRUD
// ============================================================================

const HEX_REGEX = /^#[0-9A-Fa-f]{3,8}$/;

const updateBrandSchema = z.object({
  brandName: z.string().max(100).optional(),
  shortName: z.string().max(30).optional(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  logoDarkUrl: z.string().url().max(500).optional().nullable(),
  iconUrl: z.string().url().max(500).optional().nullable(),
  faviconUrl: z.string().url().max(500).optional().nullable(),
  primaryColor: z.string().regex(HEX_REGEX).optional(),
  secondaryColor: z.string().regex(HEX_REGEX).optional(),
  accentColor: z.string().regex(HEX_REGEX).optional(),
  successColor: z.string().regex(HEX_REGEX).optional(),
  warningColor: z.string().regex(HEX_REGEX).optional(),
  dangerColor: z.string().regex(HEX_REGEX).optional(),
  backgroundColor: z.string().regex(HEX_REGEX).optional(),
  surfaceColor: z.string().regex(HEX_REGEX).optional(),
  navColor: z.string().regex(HEX_REGEX).optional(),
  cardStyle: z.enum(["flat", "soft", "outlined", "elevated"]).optional(),
  borderRadius: z.enum(["sm", "md", "lg", "xl"]).optional(),
  navStyle: z.enum(["sidebar", "topbar"]).optional(),
  layoutMode: z.enum(["default", "clean", "premium", "compact", "enterprise"]).optional(),
  fontFamily: z.string().max(100).optional().nullable(),
  headerTitle: z.string().max(200).optional().nullable(),
  loginTitle: z.string().max(100).optional(),
  loginSubtitle: z.string().max(200).optional(),
  welcomeMessage: z.string().max(2000).optional().nullable(),
  supportEmail: z.string().email().max(200).optional().nullable(),
  supportPhone: z.string().max(30).optional().nullable(),
  footerText: z.string().max(500).optional().nullable(),
  textOverrides: z.record(z.string()).optional(),
});

export async function brandingRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // GET branding for current DZ (public — any authenticated user)
  fastify.get(
    "/branding",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const profile = await fastify.prisma.dropzoneBrandProfile.findUnique({
        where: { dropzoneId },
      });

      // Return defaults if no profile exists
      if (!profile) {
        const dz = await fastify.prisma.dropzone.findUnique({
          where: { id: dropzoneId },
          select: { name: true },
        });
        reply.send({
          success: true,
          data: {
            brandName: dz?.name || "SkyLara",
            shortName: null,
            logoUrl: null,
            primaryColor: "#1A4F8A",
            secondaryColor: "#0EA5E9",
            accentColor: "#F59E0B",
            successColor: "#10B981",
            warningColor: "#F59E0B",
            dangerColor: "#EF4444",
            backgroundColor: "#F0F4F8",
            surfaceColor: "#FFFFFF",
            navColor: "#0B1E38",
            cardStyle: "soft",
            borderRadius: "md",
            navStyle: "sidebar",
            layoutMode: "default",
            loginTitle: "SkyLara",
            loginSubtitle: "Skydiving DZ Management",
            textOverrides: {},
            isPublished: false,
            isDefault: true,
          },
        });
        return;
      }

      reply.send({ success: true, data: { ...profile, isDefault: false } });
    }
  );

  // GET branding for a specific DZ by slug (unauthenticated — for login page)
  fastify.get<{ Params: { slug: string } }>(
    "/branding/public/:slug",
    async (request, reply) => {
      const slug = (request.params as any).slug;

      const dz = await fastify.prisma.dropzone.findFirst({
        where: { slug },
        include: { brandProfile: true },
      });

      if (!dz) throw new NotFoundError("Dropzone");

      const brand = dz.brandProfile;
      reply.send({
        success: true,
        data: {
          brandName: brand?.brandName || dz.name,
          logoUrl: brand?.logoUrl || null,
          logoDarkUrl: brand?.logoDarkUrl || null,
          primaryColor: brand?.primaryColor || "#1A4F8A",
          navColor: brand?.navColor || "#0B1E38",
          loginTitle: brand?.loginTitle || "SkyLara",
          loginSubtitle: brand?.loginSubtitle || "Skydiving DZ Management",
          welcomeMessage: brand?.welcomeMessage || null,
          cardStyle: brand?.cardStyle || "soft",
        },
      });
    }
  );

  // UPDATE branding (DZ_OWNER+ only)
  fastify.put(
    "/branding",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_OWNER", "DZ_MANAGER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = updateBrandSchema.parse(request.body);

      const profile = await fastify.prisma.dropzoneBrandProfile.upsert({
        where: { dropzoneId },
        create: {
          dropzoneId,
          ...body,
          textOverrides: body.textOverrides || {},
        },
        update: {
          ...body,
          textOverrides: body.textOverrides || undefined,
        },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "UPDATE",
        entityType: "DropzoneBrandProfile",
        entityId: profile.id,
        afterState: body,
      });

      reply.send({ success: true, data: profile });
    }
  );

  // PUBLISH branding
  fastify.post(
    "/branding/publish",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const profile = await fastify.prisma.dropzoneBrandProfile.update({
        where: { dropzoneId },
        data: { isPublished: true, publishedAt: new Date() },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "UPDATE",
        entityType: "DropzoneBrandProfile",
        entityId: profile.id,
        afterState: { isPublished: true },
      });

      reply.send({ success: true, data: { message: "Branding published", publishedAt: profile.publishedAt } });
    }
  );

  // RESET branding to defaults
  fastify.delete(
    "/branding",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      await fastify.prisma.dropzoneBrandProfile.deleteMany({
        where: { dropzoneId },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "DELETE",
        entityType: "DropzoneBrandProfile",
        entityId: 0,
        afterState: { reset: true },
      });

      reply.send({ success: true, data: { message: "Branding reset to defaults" } });
    }
  );
}
