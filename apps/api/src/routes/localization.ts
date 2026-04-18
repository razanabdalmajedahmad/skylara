import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";

// ============================================================================
// LOCALIZATION ROUTES
// Per gap spec §7.9 — languages, translations, currencies, DZ locale settings
// ============================================================================

const updateLocaleSchema = z.object({
  languageCode: z.string().max(10).optional(),
  currencyCode: z.string().max(3).optional(),
  weightUnit: z.enum(["lbs", "kg"]).optional(),
  altitudeUnit: z.enum(["ft", "m"]).optional(),
  temperatureUnit: z.enum(["F", "C"]).optional(),
  dateFormat: z.string().max(20).optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
});

const upsertTranslationSchema = z.object({
  keyId: z.number().int().positive(),
  languageId: z.number().int().positive(),
  value: z.string().min(1),
});

function getDzId(request: any): number {
  return parseInt(request.user?.dropzoneId ?? "0");
}

export async function localizationRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  // ========================================================================
  // LANGUAGES
  // ========================================================================

  // GET /localization/languages — list supported languages
  fastify.get(
    "/localization/languages",
    { preHandler: [authenticate] },
    async (_request, reply) => {
      try {
        const languages = await prisma.language.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        });
        reply.send({ success: true, data: { languages } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch languages" });
      }
    }
  );

  // ========================================================================
  // CURRENCIES
  // ========================================================================

  // GET /localization/currencies — list supported currencies
  fastify.get(
    "/localization/currencies",
    { preHandler: [authenticate] },
    async (_request, reply) => {
      try {
        const currencies = await prisma.supportedCurrency.findMany({
          where: { isActive: true },
          orderBy: { code: "asc" },
        });
        reply.send({ success: true, data: { currencies } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch currencies" });
      }
    }
  );

  // ========================================================================
  // DZ LOCALE SETTINGS
  // ========================================================================

  // GET /localization/settings — get locale settings for current DZ
  fastify.get(
    "/localization/settings",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const settings = await prisma.dzLocaleSettings.findUnique({
          where: { dropzoneId },
        });

        reply.send({
          success: true,
          data: settings ?? {
            languageCode: "en", currencyCode: "USD", weightUnit: "lbs",
            altitudeUnit: "ft", temperatureUnit: "F", dateFormat: "MM/DD/YYYY", timeFormat: "12h",
          },
        });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch locale settings" });
      }
    }
  );

  // PUT /localization/settings — update DZ locale settings
  fastify.put<{ Body: z.infer<typeof updateLocaleSchema> }>(
    "/localization/settings",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const body = updateLocaleSchema.parse(request.body);

        const settings = await prisma.dzLocaleSettings.upsert({
          where: { dropzoneId },
          create: { dropzoneId, ...body },
          update: body,
        });

        reply.send({ success: true, data: settings });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to update locale settings" });
      }
    }
  );

  // ========================================================================
  // TRANSLATION KEYS & TRANSLATIONS
  // ========================================================================

  // GET /localization/namespaces — list translation namespaces
  fastify.get(
    "/localization/namespaces",
    { preHandler: [authenticate] },
    async (_request, reply) => {
      try {
        const namespaces = await prisma.translationNamespace.findMany({
          orderBy: { name: "asc" },
          include: { _count: { select: { keys: true } } },
        });
        reply.send({ success: true, data: { namespaces } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch namespaces" });
      }
    }
  );

  // GET /localization/keys — list translation keys (optionally by namespace)
  fastify.get<{ Querystring: { namespaceId?: string; search?: string } }>(
    "/localization/keys",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const where: any = {};
        if (request.query.namespaceId) where.namespaceId = parseInt(request.query.namespaceId);
        if (request.query.search) where.key = { contains: request.query.search };

        const keys = await prisma.translationKey.findMany({
          where,
          orderBy: { key: "asc" },
          take: 100,
          include: { translations: true },
        });

        reply.send({ success: true, data: { keys } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch keys" });
      }
    }
  );

  // GET /localization/bundle/:languageCode — get all translations for a language (for client use)
  fastify.get<{ Params: { languageCode: string } }>(
    "/localization/bundle/:languageCode",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { languageCode } = request.params;

        const language = await prisma.language.findUnique({
          where: { code: languageCode },
        });
        if (!language) {
          reply.code(404).send({ success: false, error: "Language not found" });
          return;
        }

        const translations = await prisma.translation.findMany({
          where: { languageId: language.id, reviewStatus: "APPROVED" },
          include: { key: { include: { namespace: true } } },
        });

        // Build nested object: { namespace: { key: value } }
        const bundle: Record<string, Record<string, string>> = {};
        for (const t of translations) {
          const ns = t.key.namespace.name;
          const keyParts = t.key.key.split(".");
          const shortKey = keyParts.slice(1).join(".") || keyParts[0];
          if (!bundle[ns]) bundle[ns] = {};
          bundle[ns][shortKey] = t.value;
        }

        reply.send({
          success: true,
          data: {
            languageCode,
            languageName: language.name,
            isRtl: language.isRtl,
            bundle,
          },
        });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to build bundle" });
      }
    }
  );

  // PUT /localization/translations — upsert a translation
  fastify.put<{ Body: z.infer<typeof upsertTranslationSchema> }>(
    "/localization/translations",
    { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const body = upsertTranslationSchema.parse(request.body);

        const translation = await prisma.translation.upsert({
          where: { keyId_languageId: { keyId: body.keyId, languageId: body.languageId } },
          create: {
            keyId: body.keyId,
            languageId: body.languageId,
            value: body.value,
            reviewStatus: "DRAFT",
          },
          update: {
            value: body.value,
            reviewStatus: "DRAFT",
          },
        });

        reply.send({ success: true, data: translation });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to upsert translation" });
      }
    }
  );

  // PATCH /localization/translations/:id/review — approve/reject a translation
  fastify.patch<{ Params: { id: string }; Body: { reviewStatus: string } }>(
    "/localization/translations/:id/review",
    { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id);
        const userId = parseInt((request as any).user?.sub ?? "0");
        const { reviewStatus } = request.body;

        if (!["DRAFT", "REVIEWED", "APPROVED"].includes(reviewStatus)) {
          reply.code(400).send({ success: false, error: "Invalid reviewStatus" });
          return;
        }

        const translation = await prisma.translation.update({
          where: { id },
          data: {
            reviewStatus,
            reviewedById: userId,
            reviewedAt: new Date(),
          },
        });

        reply.send({ success: true, data: translation });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to update review status" });
      }
    }
  );
}
