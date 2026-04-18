import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { createAuditService } from "../services/auditService";
import crypto from "crypto";

// ============================================================================
// MARKETING & ENGAGEMENT ROUTES
// Campaigns, surveys, referrals, gamification, local news, and compliance.
// ============================================================================

// ---------------------------------------------------------------------------
// Valid enum values (mirrors Prisma enums for runtime validation)
// ---------------------------------------------------------------------------

const VALID_CAMPAIGN_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

const VALID_CAMPAIGN_TYPES = [
  "EMAIL",
  "SMS",
  "PUSH",
  "IN_APP",
  "MULTI_CHANNEL",
] as const;

const VALID_SURVEY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
] as const;

const VALID_QUESTION_TYPES = [
  "TEXT",
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "RATING",
  "NPS",
  "BOOLEAN",
] as const;

const VALID_NEWS_CATEGORIES = [
  "ANNOUNCEMENT",
  "EVENT",
  "SAFETY",
  "PROMO",
  "COMMUNITY",
  "WEATHER",
  "GENERAL",
  "UPDATE",
] as const;

const VALID_LEADERBOARD_TYPES = [
  "JUMPS",
  "POINTS",
  "REFERRALS",
  "STREAK",
  "CUSTOM",
] as const;

const VALID_BADGE_CATEGORIES = [
  "ACHIEVEMENT",
  "MILESTONE",
  "SEASONAL",
  "COMMUNITY",
  "SAFETY",
  "LEARNING",
] as const;

const VALID_REWARD_RULE_TRIGGERS = [
  "JUMP_COMPLETED",
  "REFERRAL_CONVERTED",
  "COURSE_COMPLETED",
  "SURVEY_COMPLETED",
  "CHECK_IN_STREAK",
  "FIRST_JUMP",
  "BOOKING_COMPLETED",
  "PROFILE_COMPLETED",
  "BADGE_EARNED",
  "CUSTOM",
] as const;

const VALID_COMPLIANCE_ACTIONS = [
  "OPT_IN",
  "OPT_OUT",
  "CONSENT_GRANTED",
  "CONSENT_REVOKED",
  "UNSUBSCRIBE",
  "DATA_EXPORT",
  "DATA_DELETE",
  "PREFERENCE_UPDATE",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDropzoneId(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const parsed = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseUserId(sub: string | number | undefined): number {
  return parseInt(String(sub), 10);
}

function parseIntParam(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function requireString(val: unknown, name: string): string {
  if (typeof val !== "string" || !val.trim()) {
    throw new ValidationError(`${name} is required`);
  }
  return val.trim();
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function generateReferralCode(): string {
  return crypto.randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

// Admin roles that can manage marketing resources
const MARKETING_ADMIN_ROLES = ["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"];

// ---------------------------------------------------------------------------
// Route module
// ---------------------------------------------------------------------------

export async function marketingRoutes(fastify: FastifyInstance) {
  const audit = createAuditService(fastify.prisma);

  // ========================================================================
  // GROUP 1: CAMPAIGNS (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/campaigns — List campaigns for dropzone
  fastify.get<{
    Querystring: {
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/marketing/campaigns",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { status } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { dropzoneId };
        if (status && VALID_CAMPAIGN_STATUSES.includes(status as any)) {
          where.status = status;
        }

        const [campaigns, total] = await Promise.all([
          fastify.prisma.marketingCampaign.findMany({
            where,
            include: {
              _count: { select: { sends: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.marketingCampaign.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: campaigns.map((c: any) => ({
            id: c.id,
            name: c.name,
            channel: c.channel,
            status: c.status,
            description: c.description,
            scheduledAt: c.scheduledAt,
            sentCount: c._count.sends,
            openCount: c.openCount,
            clickCount: c.clickCount,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/campaigns failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch campaigns" });
      }
    }
  );

  // POST /marketing/campaigns — Create campaign
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/campaigns",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let name: string;
        try {
          name = requireString(body.name, "name");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        if (body.channel && !VALID_CAMPAIGN_TYPES.includes(body.channel as any)) {
          return reply.code(400).send({
            success: false,
            error: `channel must be one of: ${VALID_CAMPAIGN_TYPES.join(", ")}`,
          });
        }

        const campaign = await fastify.prisma.marketingCampaign.create({
          data: {
            dropzoneId,
            createdById: userId,
            name,
            channel: body.channel || "EMAIL",
            status: "DRAFT",
            description: body.description || null,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: campaign.id,
            name: campaign.name,
            channel: campaign.channel,
            status: campaign.status,
            description: campaign.description,
            createdAt: campaign.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/campaigns failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create campaign" });
      }
    }
  );

  // PATCH /marketing/campaigns/:id — Update campaign
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/campaigns/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const campaignId = parseInt(request.params.id, 10);
        if (!Number.isFinite(campaignId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid campaign ID" });
        }

        const existing = await fastify.prisma.marketingCampaign.findFirst({
          where: { id: campaignId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Campaign not found" });
        }

        if (existing.status === "COMPLETED" || existing.status === "ARCHIVED") {
          return reply
            .code(409)
            .send({ success: false, error: "Cannot update a completed or archived campaign" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.scheduledAt !== undefined) {
          updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
        }
        if (body.channel && VALID_CAMPAIGN_TYPES.includes(body.channel as any)) {
          updateData.channel = body.channel;
        }

        const updated = await fastify.prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            name: updated.name,
            channel: updated.channel,
            status: updated.status,
            description: updated.description,
            scheduledAt: updated.scheduledAt,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/campaigns/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update campaign" });
      }
    }
  );

  // POST /marketing/campaigns/:id/publish — Publish campaign
  fastify.post<{ Params: { id: string } }>(
    "/marketing/campaigns/:id/publish",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const campaignId = parseInt(request.params.id, 10);
        if (!Number.isFinite(campaignId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid campaign ID" });
        }

        const campaign = await fastify.prisma.marketingCampaign.findFirst({
          where: { id: campaignId, dropzoneId },
        });
        if (!campaign) {
          return reply
            .code(404)
            .send({ success: false, error: "Campaign not found" });
        }

        if (campaign.status !== "DRAFT" && campaign.status !== "PAUSED") {
          return reply.code(409).send({
            success: false,
            error: `Cannot publish campaign in ${campaign.status} status`,
          });
        }

        // Validate campaign has required content
        if (!campaign.description) {
          return reply.code(422).send({
            success: false,
            error: "Campaign must have a description before publishing",
          });
        }

        const updated = await fastify.prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: {
            status: campaign.scheduledAt ? "SCHEDULED" : "PUBLISHED",
            publishedAt: new Date(),
          },
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            status: updated.status,
            publishedAt: updated.publishedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/campaigns/:id/publish failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to publish campaign" });
      }
    }
  );

  // POST /marketing/campaigns/:id/pause — Pause campaign
  fastify.post<{ Params: { id: string } }>(
    "/marketing/campaigns/:id/pause",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const campaignId = parseInt(request.params.id, 10);
        if (!Number.isFinite(campaignId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid campaign ID" });
        }

        const campaign = await fastify.prisma.marketingCampaign.findFirst({
          where: { id: campaignId, dropzoneId },
        });
        if (!campaign) {
          return reply
            .code(404)
            .send({ success: false, error: "Campaign not found" });
        }

        if (campaign.status !== "PUBLISHED" && campaign.status !== "SCHEDULED") {
          return reply.code(409).send({
            success: false,
            error: `Cannot pause campaign in ${campaign.status} status`,
          });
        }

        const updated = await fastify.prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: { status: "PAUSED", pausedAt: new Date() },
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            status: updated.status,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/campaigns/:id/pause failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to pause campaign" });
      }
    }
  );

  // ========================================================================
  // GROUP 2: SURVEYS (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/surveys — List surveys
  fastify.get<{
    Querystring: {
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/marketing/surveys",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { status } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { dropzoneId };
        if (status && VALID_SURVEY_STATUSES.includes(status as any)) {
          where.status = status;
        }

        const [surveys, total] = await Promise.all([
          fastify.prisma.survey.findMany({
            where,
            include: {
              _count: { select: { responses: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.survey.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: surveys.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            status: s.status,
            responsesCount: s._count.responses,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/surveys failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch surveys" });
      }
    }
  );

  // POST /marketing/surveys — Create survey
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/surveys",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let title: string;
        try {
          title = requireString(body.title, "title");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        // Validate questions structure if provided
        if (body.questions && !Array.isArray(body.questions)) {
          return reply
            .code(400)
            .send({ success: false, error: "questions must be an array" });
        }

        if (body.questions) {
          for (let i = 0; i < body.questions.length; i++) {
            const q = body.questions[i];
            if (!q.text || typeof q.text !== "string") {
              return reply.code(400).send({
                success: false,
                error: `questions[${i}].text is required`,
              });
            }
            if (q.type && !VALID_QUESTION_TYPES.includes(q.type as any)) {
              return reply.code(400).send({
                success: false,
                error: `questions[${i}].type must be one of: ${VALID_QUESTION_TYPES.join(", ")}`,
              });
            }
          }
        }

        const survey = await fastify.prisma.survey.create({
          data: {
            dropzoneId,
            createdById: userId,
            title,
            description: body.description || null,
            surveyType: body.surveyType || "GENERAL",
            status: "DRAFT",
            questions: body.questions || [],
            triggerEvent: body.triggerEvent || null,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: survey.id,
            title: survey.title,
            surveyType: survey.surveyType,
            status: survey.status,
            createdAt: survey.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/surveys failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create survey" });
      }
    }
  );

  // PATCH /marketing/surveys/:id — Update survey
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/surveys/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const surveyId = parseInt(request.params.id, 10);
        if (!Number.isFinite(surveyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid survey ID" });
        }

        const existing = await fastify.prisma.survey.findFirst({
          where: { id: surveyId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Survey not found" });
        }

        if (existing.status === "CLOSED") {
          return reply.code(409).send({
            success: false,
            error: "Cannot update a closed survey",
          });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.questions !== undefined) {
          if (!Array.isArray(body.questions)) {
            return reply
              .code(400)
              .send({ success: false, error: "questions must be an array" });
          }
          updateData.questions = body.questions;
        }
        if (body.status !== undefined) {
          if (!VALID_SURVEY_STATUSES.includes(body.status as any)) {
            return reply.code(400).send({
              success: false,
              error: `status must be one of: ${VALID_SURVEY_STATUSES.join(", ")}`,
            });
          }
          updateData.status = body.status;
        }
        if (body.expiresAt !== undefined) {
          updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        }

        const updated = await fastify.prisma.survey.update({
          where: { id: surveyId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            title: updated.title,
            status: updated.status,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/surveys/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update survey" });
      }
    }
  );

  // POST /marketing/surveys/:id/respond — Submit survey response (any authenticated user)
  fastify.post<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/surveys/:id/respond",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const surveyId = parseInt(request.params.id, 10);
        if (!Number.isFinite(surveyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid survey ID" });
        }

        const survey = await fastify.prisma.survey.findFirst({
          where: { id: surveyId, status: "ACTIVE" },
        });
        if (!survey) {
          return reply
            .code(404)
            .send({ success: false, error: "Survey not found or not active" });
        }

        // Check expiration
        const now = new Date();
        if (survey.expiresAt && now > survey.expiresAt) {
          return reply
            .code(409)
            .send({ success: false, error: "Survey has expired" });
        }

        // Prevent duplicate submissions
        const existingResponse = await fastify.prisma.surveyResponse.findFirst({
          where: { surveyId, userId },
        });
        if (existingResponse) {
          return reply
            .code(409)
            .send({ success: false, error: "You have already responded to this survey" });
        }

        const body = request.body as Record<string, any>;
        if (!body.answers || typeof body.answers !== "object") {
          return reply
            .code(400)
            .send({ success: false, error: "answers is required and must be an object" });
        }

        const response = await fastify.prisma.surveyResponse.create({
          data: {
            surveyId,
            userId,
            answers: body.answers,
            npsScore: body.npsScore ?? null,
            csatScore: body.csatScore ?? null,
            comment: body.comment ?? null,
            completedAt: new Date(),
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: response.id,
            surveyId: response.surveyId,
            completedAt: response.completedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/surveys/:id/respond failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to submit survey response" });
      }
    }
  );

  // GET /marketing/surveys/:id/results — Survey results (admin)
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    "/marketing/surveys/:id/results",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const surveyId = parseInt(request.params.id, 10);
        if (!Number.isFinite(surveyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid survey ID" });
        }

        const survey = await fastify.prisma.survey.findFirst({
          where: { id: surveyId, dropzoneId },
        });
        if (!survey) {
          return reply
            .code(404)
            .send({ success: false, error: "Survey not found" });
        }

        const limit = Math.min(parseIntParam(request.query.limit, 50), 200);
        const offset = parseIntParam(request.query.offset, 0);

        const [responses, total] = await Promise.all([
          fastify.prisma.surveyResponse.findMany({
            where: { surveyId },
            orderBy: { completedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.surveyResponse.count({ where: { surveyId } }),
        ]);

        return reply.send({
          success: true,
          data: {
            surveyId: survey.id,
            title: survey.title,
            totalResponses: total,
            responses: responses.map((r: any) => ({
              id: r.id,
              userId: r.userId,
              answers: r.answers,
              npsScore: r.npsScore,
              csatScore: r.csatScore,
              completedAt: r.completedAt,
            })),
          },
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/surveys/:id/results failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch survey results" });
      }
    }
  );

  // ========================================================================
  // GROUP 3: REFERRALS
  // ========================================================================

  // POST /marketing/referrals/create-link — Create referral link (any authenticated user)
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/referrals/create-link",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        const body = request.body as Record<string, any>;

        // Limit active referral links per user
        const activeCount = await fastify.prisma.referralLink.count({
          where: { referrerId: userId, status: "ACTIVE" },
        });
        if (activeCount >= 10) {
          return reply.code(409).send({
            success: false,
            error: "Maximum of 10 active referral links allowed",
          });
        }

        const code = generateReferralCode();

        const link = await fastify.prisma.referralLink.create({
          data: {
            referrerId: userId,
            dropzoneId: dropzoneId || undefined,
            code,
            status: "ACTIVE",
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: link.id,
            code: link.code,
            status: link.status,
            expiresAt: link.expiresAt,
            createdAt: link.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/referrals/create-link failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create referral link" });
      }
    }
  );

  // GET /marketing/referrals/me — My referral links + stats
  fastify.get(
    "/marketing/referrals/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);

        const links = await fastify.prisma.referralLink.findMany({
          where: { referrerId: userId },
          include: {
            _count: { select: { events: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        // Aggregate conversion stats across all links
        const linkIds = links.map((l: any) => l.id);
        const conversionStats = linkIds.length > 0
          ? await fastify.prisma.referralEvent.groupBy({
              by: ["eventType"],
              where: { linkId: { in: linkIds } },
              _count: { _all: true },
            })
          : [];

        const statsSummary: Record<string, number> = {};
        for (const stat of conversionStats) {
          statsSummary[stat.eventType] = stat._count._all;
        }

        return reply.send({
          success: true,
          data: {
            links: links.map((l: any) => ({
              id: l.id,
              code: l.code,
              status: l.status,
              clickCount: l.clickCount,
              conversionCount: l.conversionCount,
              eventsCount: l._count.events,
              expiresAt: l.expiresAt,
              createdAt: l.createdAt,
            })),
            stats: statsSummary,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/referrals/me failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch referral data" });
      }
    }
  );

  // GET /marketing/referrals/analytics — Admin referral analytics
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/marketing/referrals/analytics",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const [links, totalLinks] = await Promise.all([
          fastify.prisma.referralLink.findMany({
            where: { dropzoneId },
            include: {
              _count: { select: { events: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.referralLink.count({ where: { dropzoneId } }),
        ]);

        // Overall event type breakdown for this dropzone
        const allLinkIds = (
          await fastify.prisma.referralLink.findMany({
            where: { dropzoneId },
            select: { id: true },
          })
        ).map((l: any) => l.id);

        const eventBreakdown = allLinkIds.length > 0
          ? await fastify.prisma.referralEvent.groupBy({
              by: ["eventType"],
              where: { linkId: { in: allLinkIds } },
              _count: { _all: true },
            })
          : [];

        const breakdownMap: Record<string, number> = {};
        for (const e of eventBreakdown) {
          breakdownMap[e.eventType] = e._count._all;
        }

        return reply.send({
          success: true,
          data: {
            links: links.map((l: any) => ({
              id: l.id,
              code: l.code,
              status: l.status,
              referrerId: l.referrerId,
              clickCount: l.clickCount,
              conversionCount: l.conversionCount,
              eventsCount: l._count.events,
              createdAt: l.createdAt,
            })),
            eventBreakdown: breakdownMap,
          },
          meta: { totalLinks, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/referrals/analytics failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch referral analytics" });
      }
    }
  );

  // ========================================================================
  // GROUP 4: GAMIFICATION
  // ========================================================================

  // GET /marketing/leaderboards — List leaderboards
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/marketing/leaderboards",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        const limit = Math.min(parseIntParam(request.query.limit, 20), 50);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = {};
        if (dropzoneId) {
          where.OR = [{ dropzoneId }, { dropzoneId: null }]; // global + local
        }

        const [leaderboards, total] = await Promise.all([
          fastify.prisma.gamificationLeaderboard.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.gamificationLeaderboard.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: leaderboards.map((lb: any) => ({
            id: lb.id,
            name: lb.name,
            metric: lb.metric,
            window: lb.window,
            discipline: lb.discipline,
            isActive: lb.isActive,
            dropzoneId: lb.dropzoneId,
            createdAt: lb.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/leaderboards failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch leaderboards" });
      }
    }
  );

  // GET /marketing/leaderboards/:id — Leaderboard detail with entries
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    "/marketing/leaderboards/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const leaderboardId = parseInt(request.params.id, 10);
        if (!Number.isFinite(leaderboardId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid leaderboard ID" });
        }

        const leaderboard = await fastify.prisma.gamificationLeaderboard.findUnique({
          where: { id: leaderboardId },
        });
        if (!leaderboard) {
          return reply
            .code(404)
            .send({ success: false, error: "Leaderboard not found" });
        }

        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const [entries, total] = await Promise.all([
          fastify.prisma.gamificationLeaderboardEntry.findMany({
            where: { leaderboardId },
            orderBy: { rank: "asc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.gamificationLeaderboardEntry.count({
            where: { leaderboardId },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            id: leaderboard.id,
            name: leaderboard.name,
            metric: leaderboard.metric,
            window: leaderboard.window,
            entries: entries.map((e: any) => ({
              rank: e.rank,
              score: e.score,
              userId: e.userId,
              periodStart: e.periodStart,
              periodEnd: e.periodEnd,
            })),
          },
          meta: { totalEntries: total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/leaderboards/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch leaderboard" });
      }
    }
  );

  // GET /marketing/rewards/me — My points, badges, streaks
  fastify.get(
    "/marketing/rewards/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);

        const [pointEvents, badges, streaks] = await Promise.all([
          // Sum all point events
          fastify.prisma.gamificationPointEvent.aggregate({
            where: { userId },
            _sum: { points: true },
          }),
          // User badges
          fastify.prisma.gamificationUserBadge.findMany({
            where: { userId },
            include: {
              badge: {
                select: { id: true, name: true, description: true, iconUrl: true, category: true },
              },
            },
            orderBy: { earnedAt: "desc" },
          }),
          // Active streaks
          fastify.prisma.gamificationStreak.findMany({
            where: { userId },
            orderBy: { currentCount: "desc" },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalPoints: pointEvents._sum.points || 0,
            badges: badges.map((ub: any) => ({
              id: ub.badge.id,
              name: ub.badge.name,
              description: ub.badge.description,
              iconUrl: ub.badge.iconUrl,
              category: ub.badge.category,
              earnedAt: ub.earnedAt,
            })),
            streaks: streaks.map((s: any) => ({
              id: s.id,
              streakType: s.streakType,
              currentCount: s.currentCount,
              longestCount: s.longestCount,
              lastEventAt: s.lastEventAt,
            })),
          },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/rewards/me failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch rewards" });
      }
    }
  );

  // POST /marketing/rewards/claim — Claim a reward (deduct points)
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/rewards/claim",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (!body.ruleId) {
          return reply
            .code(400)
            .send({ success: false, error: "ruleId is required" });
        }

        const ruleId = parseInt(String(body.ruleId), 10);
        if (!Number.isFinite(ruleId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid ruleId" });
        }

        const rule = await fastify.prisma.gamificationRewardRule.findUnique({
          where: { id: ruleId },
        });
        if (!rule) {
          return reply
            .code(404)
            .send({ success: false, error: "Reward rule not found" });
        }
        if (!rule.isActive) {
          return reply
            .code(409)
            .send({ success: false, error: "Reward rule is no longer active" });
        }

        // Check user has enough points
        const pointsAgg = await fastify.prisma.gamificationPointEvent.aggregate({
          where: { userId },
          _sum: { points: true },
        });
        const currentPoints = pointsAgg._sum.points || 0;

        if (currentPoints < rule.pointsCost) {
          return reply.code(422).send({
            success: false,
            error: `Insufficient points. You have ${currentPoints}, need ${rule.pointsCost}`,
          });
        }

        // Atomic: create claim + deduct points in transaction
        const [claim] = await fastify.prisma.$transaction([
          fastify.prisma.gamificationRewardClaim.create({
            data: {
              userId,
              ruleId,
              pointsSpent: rule.pointsCost,
              status: "PENDING",
            },
          }),
          fastify.prisma.gamificationPointEvent.create({
            data: {
              userId,
              points: -rule.pointsCost,
              reason: `Claimed reward: ${rule.name}`,
              referenceType: "REWARD_CLAIM",
              referenceId: ruleId,
            },
          }),
        ]);

        return reply.code(201).send({
          success: true,
          data: {
            id: claim.id,
            ruleId: claim.ruleId,
            pointsSpent: claim.pointsSpent,
            status: claim.status,
            createdAt: claim.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/rewards/claim failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to claim reward" });
      }
    }
  );

  // POST /marketing/spin/:campaignId — Spin the wheel
  fastify.post<{ Params: { campaignId: string } }>(
    "/marketing/spin/:campaignId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseUserId(request.user!.sub);
        const campaignId = parseInt(request.params.campaignId, 10);
        if (!Number.isFinite(campaignId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid campaign ID" });
        }

        const campaign = await fastify.prisma.spinCampaign.findUnique({
          where: { id: campaignId },
        });
        if (!campaign) {
          return reply
            .code(404)
            .send({ success: false, error: "Spin campaign not found" });
        }
        if (campaign.status !== "ACTIVE") {
          return reply
            .code(409)
            .send({ success: false, error: "Spin campaign is not active" });
        }

        // Check date bounds
        const now = new Date();
        if (campaign.startsAt && now < campaign.startsAt) {
          return reply
            .code(409)
            .send({ success: false, error: "Spin campaign has not started yet" });
        }
        if (campaign.endsAt && now > campaign.endsAt) {
          return reply
            .code(409)
            .send({ success: false, error: "Spin campaign has ended" });
        }

        // Check spin limit per user
        const totalSpins = await fastify.prisma.spinResult.count({
          where: {
            campaignId,
            userId,
          },
        });

        const spinLimit = campaign.maxSpinsPerUser || 1;
        if (totalSpins >= spinLimit) {
          return reply.code(429).send({
            success: false,
            error: `Spin limit reached (${spinLimit} per user)`,
          });
        }

        // Determine prize from the prizes (weighted random)
        const prizes: Array<{ name: string; odds: number; value: any }> =
          Array.isArray(campaign.prizes) ? (campaign.prizes as any) : [];

        if (prizes.length === 0) {
          return reply.code(422).send({
            success: false,
            error: "Spin campaign has no prizes configured",
          });
        }

        const totalWeight = prizes.reduce((sum, p) => sum + (p.odds || 1), 0);
        let random = Math.random() * totalWeight;
        let selectedPrize = prizes[0];
        for (const prize of prizes) {
          random -= prize.odds || 1;
          if (random <= 0) {
            selectedPrize = prize;
            break;
          }
        }

        const result = await fastify.prisma.spinResult.create({
          data: {
            campaignId,
            userId,
            prizeName: selectedPrize.name,
            prizeValue: selectedPrize.value ? String(selectedPrize.value) : null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: result.id,
            prizeName: result.prizeName,
            prizeValue: result.prizeValue,
            createdAt: result.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/spin/:campaignId failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to process spin" });
      }
    }
  );

  // POST /marketing/gamification/rules — Admin: create reward rule
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/gamification/rules",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let name: string;
        try {
          name = requireString(body.name, "name");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        if (!body.rewardType || typeof body.rewardType !== "string") {
          return reply
            .code(400)
            .send({ success: false, error: "rewardType is required" });
        }

        if (body.pointsCost != null && typeof body.pointsCost !== "number") {
          return reply
            .code(400)
            .send({ success: false, error: "pointsCost must be a number" });
        }

        const rule = await fastify.prisma.gamificationRewardRule.create({
          data: {
            dropzoneId,
            name,
            description: body.description || null,
            rewardType: body.rewardType,
            rewardValue: body.rewardValue || null,
            pointsCost: body.pointsCost || 0,
            isActive: body.isActive !== false,
            maxClaims: body.maxClaims || null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: rule.id,
            name: rule.name,
            rewardType: rule.rewardType,
            pointsCost: rule.pointsCost,
            isActive: rule.isActive,
            createdAt: rule.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/gamification/rules failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create reward rule" });
      }
    }
  );

  // GET /marketing/gamification/badges — List all badges
  fastify.get<{
    Querystring: { category?: string; limit?: string; offset?: string };
  }>(
    "/marketing/gamification/badges",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { category } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = {};
        if (category && VALID_BADGE_CATEGORIES.includes(category as any)) {
          where.category = category;
        }

        const [badges, total] = await Promise.all([
          fastify.prisma.gamificationBadge.findMany({
            where,
            orderBy: { name: "asc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.gamificationBadge.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: badges.map((b: any) => ({
            id: b.id,
            key: b.key,
            name: b.name,
            description: b.description,
            iconUrl: b.iconUrl,
            category: b.category,
            pointsValue: b.pointsValue,
            isActive: b.isActive,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/gamification/badges failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch badges" });
      }
    }
  );

  // ========================================================================
  // GROUP 5: NEWS
  // ========================================================================

  // GET /marketing/news — List news items (any authenticated user)
  fastify.get<{
    Querystring: {
      category?: string;
      dropzoneId?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/marketing/news",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userDropzoneId = parseDropzoneId(request.user!.dropzoneId);
        const queryDropzoneId = parseDropzoneId(request.query.dropzoneId);
        const effectiveDropzoneId = queryDropzoneId || userDropzoneId;

        const { category } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 20), 50);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { publishedAt: { not: null } };
        if (effectiveDropzoneId) {
          where.dropzoneId = effectiveDropzoneId;
        }
        if (category && VALID_NEWS_CATEGORIES.includes(category as any)) {
          where.category = category;
        }

        const [items, total] = await Promise.all([
          fastify.prisma.localNewsItem.findMany({
            where,
            orderBy: { publishedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.localNewsItem.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: items.map((n: any) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            category: n.category,
            imageUrl: n.imageUrl,
            linkUrl: n.linkUrl,
            isPinned: n.isPinned,
            dropzoneId: n.dropzoneId,
            publishedAt: n.publishedAt,
            createdAt: n.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/news failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch news" });
      }
    }
  );

  // POST /marketing/news — Create news item (admin)
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/news",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let title: string;
        try {
          title = requireString(body.title, "title");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        if (body.category && !VALID_NEWS_CATEGORIES.includes(body.category as any)) {
          return reply.code(400).send({
            success: false,
            error: `category must be one of: ${VALID_NEWS_CATEGORIES.join(", ")}`,
          });
        }

        const shouldPublish = body.publish === true;

        const newsItem = await fastify.prisma.localNewsItem.create({
          data: {
            dropzoneId,
            createdById: userId,
            title,
            body: body.body || "",
            category: body.category || "UPDATE",
            imageUrl: body.imageUrl || null,
            linkUrl: body.linkUrl || null,
            isPinned: body.isPinned === true,
            publishedAt: shouldPublish ? new Date() : null,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: newsItem.id,
            title: newsItem.title,
            category: newsItem.category,
            isPinned: newsItem.isPinned,
            publishedAt: newsItem.publishedAt,
            createdAt: newsItem.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/news failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create news item" });
      }
    }
  );

  // PATCH /marketing/news/:id — Update news item (admin)
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/news/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const newsId = parseInt(request.params.id, 10);
        if (!Number.isFinite(newsId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid news item ID" });
        }

        const existing = await fastify.prisma.localNewsItem.findFirst({
          where: { id: newsId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "News item not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.body !== undefined) updateData.body = body.body;
        if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
        if (body.linkUrl !== undefined) updateData.linkUrl = body.linkUrl;
        if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
        if (body.expiresAt !== undefined) {
          updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        }

        if (body.category !== undefined) {
          if (!VALID_NEWS_CATEGORIES.includes(body.category as any)) {
            return reply.code(400).send({
              success: false,
              error: `category must be one of: ${VALID_NEWS_CATEGORIES.join(", ")}`,
            });
          }
          updateData.category = body.category;
        }

        if (body.publish === true && !existing.publishedAt) {
          updateData.publishedAt = new Date();
        }
        if (body.unpublish === true) {
          updateData.publishedAt = null;
        }

        const updated = await fastify.prisma.localNewsItem.update({
          where: { id: newsId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            title: updated.title,
            category: updated.category,
            isPinned: updated.isPinned,
            publishedAt: updated.publishedAt,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/news/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update news item" });
      }
    }
  );

  // ========================================================================
  // GROUP 6: COMPLIANCE (Admin only)
  // ========================================================================

  // GET /marketing/compliance — Compliance records
  fastify.get<{
    Querystring: {
      action?: string;
      userId?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/marketing/compliance",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { action, userId: queryUserId } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 200);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { dropzoneId };
        if (action && VALID_COMPLIANCE_ACTIONS.includes(action as any)) {
          where.action = action;
        }
        if (queryUserId) {
          const uid = parseInt(queryUserId, 10);
          if (Number.isFinite(uid)) where.actorId = uid;
        }

        const [records, total] = await Promise.all([
          fastify.prisma.marketingComplianceRecord.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.marketingComplianceRecord.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: records.map((r: any) => ({
            id: r.id,
            entityType: r.entityType,
            entityId: r.entityId,
            action: r.action,
            reason: r.reason,
            actorId: r.actorId,
            createdAt: r.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/compliance failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch compliance records" });
      }
    }
  );

  // POST /marketing/compliance — Log compliance action
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/compliance",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const actorId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        if (!body.entityType || typeof body.entityType !== "string") {
          return reply
            .code(400)
            .send({ success: false, error: "entityType is required" });
        }

        if (!body.entityId) {
          return reply
            .code(400)
            .send({ success: false, error: "entityId is required" });
        }

        const entityId = parseInt(String(body.entityId), 10);
        if (!Number.isFinite(entityId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid entityId" });
        }

        if (!body.action || !VALID_COMPLIANCE_ACTIONS.includes(body.action as any)) {
          return reply.code(400).send({
            success: false,
            error: `action must be one of: ${VALID_COMPLIANCE_ACTIONS.join(", ")}`,
          });
        }

        const record = await fastify.prisma.marketingComplianceRecord.create({
          data: {
            dropzoneId,
            entityType: body.entityType,
            entityId,
            action: body.action,
            reason: body.reason || null,
            actorId,
          },
        });

        // If it's an opt-out or unsubscribe, also update user marketing preferences
        if (["OPT_OUT", "UNSUBSCRIBE", "CONSENT_REVOKED"].includes(body.action)) {
          await fastify.prisma.userMarketingPreference.upsert({
            where: {
              userId_dropzoneId: {
                userId: actorId,
                dropzoneId,
              },
            },
            update: {
              emailOptIn: false,
              smsOptIn: false,
              pushOptIn: false,
            },
            create: {
              userId: actorId,
              dropzoneId,
              emailOptIn: false,
              smsOptIn: false,
              pushOptIn: false,
            },
          });
        }

        return reply.code(201).send({
          success: true,
          data: {
            id: record.id,
            entityType: record.entityType,
            entityId: record.entityId,
            action: record.action,
            actorId: record.actorId,
            createdAt: record.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/compliance failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to log compliance action" });
      }
    }
  );

  // ========================================================================
  // GROUP 7: AUDIENCES (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/audiences — List audiences for dropzone
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/marketing/audiences",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { dropzoneId };
        const [audiences, total] = await Promise.all([
          fastify.prisma.marketingAudience.findMany({
            where,
            include: { _count: { select: { campaigns: true } } },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.marketingAudience.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: audiences.map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            filters: a.filters,
            estimatedSize: a.estimatedSize,
            campaignCount: a._count.campaigns,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/audiences failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch audiences" });
      }
    }
  );

  // POST /marketing/audiences — Create audience segment
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/audiences",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let name: string;
        try {
          name = requireString(body.name, "name");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        if (!body.filters || typeof body.filters !== "object") {
          return reply
            .code(400)
            .send({ success: false, error: "filters (JSON object) is required" });
        }

        const audience = await fastify.prisma.marketingAudience.create({
          data: {
            dropzoneId,
            createdById: userId,
            name,
            description: body.description || null,
            filters: body.filters,
            estimatedSize: typeof body.estimatedSize === "number" ? body.estimatedSize : 0,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: audience.id,
            name: audience.name,
            description: audience.description,
            filters: audience.filters,
            estimatedSize: audience.estimatedSize,
            createdAt: audience.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/audiences failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create audience" });
      }
    }
  );

  // GET /marketing/audiences/:id — Get single audience
  fastify.get<{ Params: { id: string } }>(
    "/marketing/audiences/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const audienceId = parseInt(request.params.id, 10);
        if (!Number.isFinite(audienceId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid audience ID" });
        }

        const audience = await fastify.prisma.marketingAudience.findFirst({
          where: { id: audienceId, dropzoneId },
          include: { _count: { select: { campaigns: true } } },
        });

        if (!audience) {
          return reply
            .code(404)
            .send({ success: false, error: "Audience not found" });
        }

        return reply.send({
          success: true,
          data: {
            id: audience.id,
            name: audience.name,
            description: audience.description,
            filters: audience.filters,
            estimatedSize: audience.estimatedSize,
            campaignCount: (audience as any)._count.campaigns,
            createdAt: audience.createdAt,
            updatedAt: audience.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/audiences/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch audience" });
      }
    }
  );

  // PATCH /marketing/audiences/:id — Update audience
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/audiences/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const audienceId = parseInt(request.params.id, 10);
        if (!Number.isFinite(audienceId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid audience ID" });
        }

        const existing = await fastify.prisma.marketingAudience.findFirst({
          where: { id: audienceId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Audience not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.filters !== undefined) updateData.filters = body.filters;
        if (typeof body.estimatedSize === "number") updateData.estimatedSize = body.estimatedSize;

        const updated = await fastify.prisma.marketingAudience.update({
          where: { id: audienceId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            filters: updated.filters,
            estimatedSize: updated.estimatedSize,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/audiences/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update audience" });
      }
    }
  );

  // DELETE /marketing/audiences/:id — Delete audience
  fastify.delete<{ Params: { id: string } }>(
    "/marketing/audiences/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const audienceId = parseInt(request.params.id, 10);
        if (!Number.isFinite(audienceId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid audience ID" });
        }

        const existing = await fastify.prisma.marketingAudience.findFirst({
          where: { id: audienceId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Audience not found" });
        }

        await fastify.prisma.marketingAudience.delete({
          where: { id: audienceId },
        });

        return reply.send({ success: true, data: { id: audienceId } });
      } catch (error) {
        request.log.error(error, "DELETE /marketing/audiences/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to delete audience" });
      }
    }
  );

  // ========================================================================
  // GROUP 8: TEMPLATES (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/templates — List templates for dropzone
  fastify.get<{
    Querystring: { channel?: string; limit?: string; offset?: string };
  }>(
    "/marketing/templates",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { channel } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { dropzoneId };
        if (channel) where.channel = channel;

        const [templates, total] = await Promise.all([
          fastify.prisma.marketingTemplate.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.marketingTemplate.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: templates.map((t: any) => ({
            id: t.id,
            name: t.name,
            channel: t.channel,
            subject: t.subject,
            body: t.body,
            variables: t.variables,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/templates failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch templates" });
      }
    }
  );

  // POST /marketing/templates — Create template
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/templates",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let name: string;
        let bodyContent: string;
        try {
          name = requireString(body.name, "name");
          bodyContent = requireString(body.body, "body");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        if (!body.channel || !VALID_CAMPAIGN_TYPES.includes(body.channel as any)) {
          return reply.code(400).send({
            success: false,
            error: `channel must be one of: ${VALID_CAMPAIGN_TYPES.join(", ")}`,
          });
        }

        const template = await fastify.prisma.marketingTemplate.create({
          data: {
            dropzoneId,
            createdById: userId,
            name,
            channel: body.channel,
            subject: body.subject || null,
            body: bodyContent,
            variables: body.variables || null,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: template.id,
            name: template.name,
            channel: template.channel,
            subject: template.subject,
            body: template.body,
            variables: template.variables,
            createdAt: template.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/templates failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create template" });
      }
    }
  );

  // GET /marketing/templates/:id — Get single template
  fastify.get<{ Params: { id: string } }>(
    "/marketing/templates/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const templateId = parseInt(request.params.id, 10);
        if (!Number.isFinite(templateId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid template ID" });
        }

        const template = await fastify.prisma.marketingTemplate.findFirst({
          where: { id: templateId, dropzoneId },
        });

        if (!template) {
          return reply
            .code(404)
            .send({ success: false, error: "Template not found" });
        }

        return reply.send({
          success: true,
          data: {
            id: template.id,
            name: template.name,
            channel: template.channel,
            subject: template.subject,
            body: template.body,
            variables: template.variables,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/templates/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch template" });
      }
    }
  );

  // PATCH /marketing/templates/:id — Update template
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/templates/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const templateId = parseInt(request.params.id, 10);
        if (!Number.isFinite(templateId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid template ID" });
        }

        const existing = await fastify.prisma.marketingTemplate.findFirst({
          where: { id: templateId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Template not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.channel !== undefined) {
          if (!VALID_CAMPAIGN_TYPES.includes(body.channel as any)) {
            return reply.code(400).send({
              success: false,
              error: `channel must be one of: ${VALID_CAMPAIGN_TYPES.join(", ")}`,
            });
          }
          updateData.channel = body.channel;
        }
        if (body.subject !== undefined) updateData.subject = body.subject;
        if (body.body !== undefined) updateData.body = body.body;
        if (body.variables !== undefined) updateData.variables = body.variables;

        const updated = await fastify.prisma.marketingTemplate.update({
          where: { id: templateId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            name: updated.name,
            channel: updated.channel,
            subject: updated.subject,
            body: updated.body,
            variables: updated.variables,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/templates/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update template" });
      }
    }
  );

  // DELETE /marketing/templates/:id — Delete template
  fastify.delete<{ Params: { id: string } }>(
    "/marketing/templates/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const templateId = parseInt(request.params.id, 10);
        if (!Number.isFinite(templateId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid template ID" });
        }

        const existing = await fastify.prisma.marketingTemplate.findFirst({
          where: { id: templateId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Template not found" });
        }

        await fastify.prisma.marketingTemplate.delete({
          where: { id: templateId },
        });

        return reply.send({ success: true, data: { id: templateId } });
      } catch (error) {
        request.log.error(error, "DELETE /marketing/templates/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to delete template" });
      }
    }
  );

  // ========================================================================
  // GROUP 9: SENDS (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/sends — List sends for a campaign
  fastify.get<{
    Querystring: { campaignId?: string; status?: string; limit?: string; offset?: string };
  }>(
    "/marketing/sends",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const { campaignId, status } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = {};
        if (campaignId) {
          const cid = parseInt(campaignId, 10);
          if (Number.isFinite(cid)) where.campaignId = cid;
        }
        if (status) where.status = status;

        const [sends, total] = await Promise.all([
          fastify.prisma.marketingSend.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.marketingSend.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: sends.map((s: any) => ({
            id: s.id,
            campaignId: s.campaignId,
            userId: s.userId,
            channel: s.channel,
            status: s.status,
            sentAt: s.sentAt,
            deliveredAt: s.deliveredAt,
            openedAt: s.openedAt,
            clickedAt: s.clickedAt,
            failReason: s.failReason,
            createdAt: s.createdAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/sends failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch sends" });
      }
    }
  );

  // POST /marketing/sends — Trigger a send for a campaign
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/sends",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const body = request.body as Record<string, any>;

        if (!body.campaignId) {
          return reply
            .code(400)
            .send({ success: false, error: "campaignId is required" });
        }

        const campaignId = parseInt(String(body.campaignId), 10);
        if (!Number.isFinite(campaignId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid campaignId" });
        }

        if (!body.userId) {
          return reply
            .code(400)
            .send({ success: false, error: "userId is required" });
        }

        const userId = parseInt(String(body.userId), 10);
        if (!Number.isFinite(userId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid userId" });
        }

        const campaign = await fastify.prisma.marketingCampaign.findUnique({
          where: { id: campaignId },
        });
        if (!campaign) {
          return reply
            .code(404)
            .send({ success: false, error: "Campaign not found" });
        }

        const send = await fastify.prisma.marketingSend.create({
          data: {
            campaignId,
            userId,
            channel: body.channel || campaign.channel,
            status: "PENDING",
          },
        });

        // Increment campaign send count
        await fastify.prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: { sendCount: { increment: 1 } },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: send.id,
            campaignId: send.campaignId,
            userId: send.userId,
            channel: send.channel,
            status: send.status,
            createdAt: send.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/sends failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create send" });
      }
    }
  );

  // GET /marketing/sends/:id — Get single send
  fastify.get<{ Params: { id: string } }>(
    "/marketing/sends/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const sendId = parseInt(request.params.id, 10);
        if (!Number.isFinite(sendId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid send ID" });
        }

        const send = await fastify.prisma.marketingSend.findUnique({
          where: { id: sendId },
          include: { campaign: { select: { id: true, name: true, channel: true } } },
        });

        if (!send) {
          return reply
            .code(404)
            .send({ success: false, error: "Send not found" });
        }

        return reply.send({
          success: true,
          data: {
            id: send.id,
            campaignId: send.campaignId,
            campaignName: (send as any).campaign?.name,
            userId: send.userId,
            channel: send.channel,
            status: send.status,
            sentAt: send.sentAt,
            deliveredAt: send.deliveredAt,
            openedAt: send.openedAt,
            clickedAt: send.clickedAt,
            failReason: send.failReason,
            createdAt: send.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/sends/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch send" });
      }
    }
  );

  // ========================================================================
  // GROUP 10: JOURNEYS (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/journeys — List automation journeys
  fastify.get<{
    Querystring: { status?: string; limit?: string; offset?: string };
  }>(
    "/marketing/journeys",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const { status } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { dropzoneId };
        if (status && VALID_CAMPAIGN_STATUSES.includes(status as any)) {
          where.status = status;
        }

        const [journeys, total] = await Promise.all([
          fastify.prisma.marketingJourney.findMany({
            where,
            include: { _count: { select: { enrollments: true } } },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.marketingJourney.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: journeys.map((j: any) => ({
            id: j.id,
            name: j.name,
            description: j.description,
            triggerEvent: j.triggerEvent,
            status: j.status,
            steps: j.steps,
            enrollmentCount: j._count.enrollments,
            createdAt: j.createdAt,
            updatedAt: j.updatedAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/journeys failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch journeys" });
      }
    }
  );

  // POST /marketing/journeys — Create automation journey
  fastify.post<{ Body: Record<string, any> }>(
    "/marketing/journeys",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const userId = parseUserId(request.user!.sub);
        const body = request.body as Record<string, any>;

        let name: string;
        let triggerEvent: string;
        try {
          name = requireString(body.name, "name");
          triggerEvent = requireString(body.triggerEvent, "triggerEvent");
        } catch (e: any) {
          return reply.code(400).send({ success: false, error: e.message });
        }

        const journey = await fastify.prisma.marketingJourney.create({
          data: {
            dropzoneId,
            createdById: userId,
            name,
            description: body.description || null,
            triggerEvent,
            status: "DRAFT",
            steps: body.steps || [],
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: journey.id,
            name: journey.name,
            description: journey.description,
            triggerEvent: journey.triggerEvent,
            status: journey.status,
            steps: journey.steps,
            createdAt: journey.createdAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/journeys failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to create journey" });
      }
    }
  );

  // GET /marketing/journeys/:id — Get single journey
  fastify.get<{ Params: { id: string } }>(
    "/marketing/journeys/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const journeyId = parseInt(request.params.id, 10);
        if (!Number.isFinite(journeyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid journey ID" });
        }

        const journey = await fastify.prisma.marketingJourney.findFirst({
          where: { id: journeyId, dropzoneId },
          include: { _count: { select: { enrollments: true } } },
        });

        if (!journey) {
          return reply
            .code(404)
            .send({ success: false, error: "Journey not found" });
        }

        return reply.send({
          success: true,
          data: {
            id: journey.id,
            name: journey.name,
            description: journey.description,
            triggerEvent: journey.triggerEvent,
            status: journey.status,
            steps: journey.steps,
            enrollmentCount: (journey as any)._count.enrollments,
            createdAt: journey.createdAt,
            updatedAt: journey.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/journeys/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch journey" });
      }
    }
  );

  // PATCH /marketing/journeys/:id — Update journey
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/journeys/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const journeyId = parseInt(request.params.id, 10);
        if (!Number.isFinite(journeyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid journey ID" });
        }

        const existing = await fastify.prisma.marketingJourney.findFirst({
          where: { id: journeyId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Journey not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.triggerEvent !== undefined) updateData.triggerEvent = body.triggerEvent;
        if (body.status !== undefined) {
          if (!VALID_CAMPAIGN_STATUSES.includes(body.status as any)) {
            return reply.code(400).send({
              success: false,
              error: `status must be one of: ${VALID_CAMPAIGN_STATUSES.join(", ")}`,
            });
          }
          updateData.status = body.status;
        }
        if (body.steps !== undefined) updateData.steps = body.steps;

        const updated = await fastify.prisma.marketingJourney.update({
          where: { id: journeyId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            triggerEvent: updated.triggerEvent,
            status: updated.status,
            steps: updated.steps,
            updatedAt: updated.updatedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/journeys/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update journey" });
      }
    }
  );

  // DELETE /marketing/journeys/:id — Delete journey
  fastify.delete<{ Params: { id: string } }>(
    "/marketing/journeys/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const dropzoneId = parseDropzoneId(request.user!.dropzoneId);
        if (!dropzoneId) {
          return reply
            .code(400)
            .send({ success: false, error: "Missing dropzone context" });
        }

        const journeyId = parseInt(request.params.id, 10);
        if (!Number.isFinite(journeyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid journey ID" });
        }

        const existing = await fastify.prisma.marketingJourney.findFirst({
          where: { id: journeyId, dropzoneId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Journey not found" });
        }

        await fastify.prisma.marketingJourney.delete({
          where: { id: journeyId },
        });

        return reply.send({ success: true, data: { id: journeyId } });
      } catch (error) {
        request.log.error(error, "DELETE /marketing/journeys/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to delete journey" });
      }
    }
  );

  // ========================================================================
  // GROUP 11: JOURNEY ENROLLMENTS (Admin — DZ_MANAGER+)
  // ========================================================================

  // GET /marketing/journeys/:journeyId/enrollments — List enrollments for a journey
  fastify.get<{
    Params: { journeyId: string };
    Querystring: { status?: string; limit?: string; offset?: string };
  }>(
    "/marketing/journeys/:journeyId/enrollments",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const journeyId = parseInt(request.params.journeyId, 10);
        if (!Number.isFinite(journeyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid journey ID" });
        }

        const { status } = request.query;
        const limit = Math.min(parseIntParam(request.query.limit, 50), 100);
        const offset = parseIntParam(request.query.offset, 0);

        const where: any = { journeyId };
        if (status) where.status = status;

        const [enrollments, total] = await Promise.all([
          fastify.prisma.journeyEnrollment.findMany({
            where,
            orderBy: { startedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.journeyEnrollment.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: enrollments.map((e: any) => ({
            id: e.id,
            journeyId: e.journeyId,
            userId: e.userId,
            currentStep: e.currentStep,
            status: e.status,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
            lastStepAt: e.lastStepAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        request.log.error(error, "GET /marketing/journeys/:journeyId/enrollments failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to fetch enrollments" });
      }
    }
  );

  // POST /marketing/journeys/:journeyId/enrollments — Enroll a user in a journey
  fastify.post<{ Params: { journeyId: string }; Body: Record<string, any> }>(
    "/marketing/journeys/:journeyId/enrollments",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const journeyId = parseInt(request.params.journeyId, 10);
        if (!Number.isFinite(journeyId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid journey ID" });
        }

        const body = request.body as Record<string, any>;
        if (!body.userId) {
          return reply
            .code(400)
            .send({ success: false, error: "userId is required" });
        }

        const userId = parseInt(String(body.userId), 10);
        if (!Number.isFinite(userId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid userId" });
        }

        // Verify the journey exists
        const journey = await fastify.prisma.marketingJourney.findUnique({
          where: { id: journeyId },
        });
        if (!journey) {
          return reply
            .code(404)
            .send({ success: false, error: "Journey not found" });
        }

        // Check for duplicate enrollment
        const existingEnrollment = await fastify.prisma.journeyEnrollment.findUnique({
          where: { journeyId_userId: { journeyId, userId } },
        });
        if (existingEnrollment) {
          return reply
            .code(409)
            .send({ success: false, error: "User is already enrolled in this journey" });
        }

        const enrollment = await fastify.prisma.journeyEnrollment.create({
          data: {
            journeyId,
            userId,
            currentStep: 0,
            status: "ACTIVE",
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: enrollment.id,
            journeyId: enrollment.journeyId,
            userId: enrollment.userId,
            currentStep: enrollment.currentStep,
            status: enrollment.status,
            startedAt: enrollment.startedAt,
          },
        });
      } catch (error) {
        request.log.error(error, "POST /marketing/journeys/:journeyId/enrollments failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to enroll user" });
      }
    }
  );

  // PATCH /marketing/enrollments/:id — Update enrollment status/step
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/marketing/enrollments/:id",
    { preHandler: [authenticate, authorize(MARKETING_ADMIN_ROLES)] },
    async (request, reply) => {
      try {
        const enrollmentId = parseInt(request.params.id, 10);
        if (!Number.isFinite(enrollmentId)) {
          return reply
            .code(400)
            .send({ success: false, error: "Invalid enrollment ID" });
        }

        const existing = await fastify.prisma.journeyEnrollment.findUnique({
          where: { id: enrollmentId },
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ success: false, error: "Enrollment not found" });
        }

        const body = request.body as Record<string, any>;
        const updateData: any = {};

        if (typeof body.currentStep === "number") {
          updateData.currentStep = body.currentStep;
          updateData.lastStepAt = new Date();
        }
        if (body.status !== undefined) {
          updateData.status = body.status;
          if (body.status === "COMPLETED") {
            updateData.completedAt = new Date();
          }
        }

        const updated = await fastify.prisma.journeyEnrollment.update({
          where: { id: enrollmentId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            journeyId: updated.journeyId,
            userId: updated.userId,
            currentStep: updated.currentStep,
            status: updated.status,
            startedAt: updated.startedAt,
            completedAt: updated.completedAt,
            lastStepAt: updated.lastStepAt,
          },
        });
      } catch (error) {
        request.log.error(error, "PATCH /marketing/enrollments/:id failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to update enrollment" });
      }
    }
  );
}
