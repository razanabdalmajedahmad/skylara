import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { NotFoundError, ValidationError } from "../utils/errors";

// Schemas for validation
const assistantQuerySchema = z.object({
  query: z.string().min(1).max(500),
  role: z.string().default("ATHLETE"),
  currentRoute: z.string().optional(),
});

const assistantFeedbackSchema = z.object({
  queryId: z.string(),
  helpful: z.boolean(),
  comment: z.string().max(500).optional(),
});

const suggestionsQuerySchema = z.object({
  role: z.string().default("ATHLETE"),
  route: z.string().optional(),
});

// Intent detection patterns
type QueryIntent =
  | "how_to"
  | "location"
  | "explanation"
  | "permissions"
  | "troubleshoot"
  | "action_request"
  | "other";

// === SAFETY GUARDRAILS (Scenario 9) ===
const BLOCKED_ACTION_PATTERNS = [
  /delete\s+(all|every|my)\s+(user|account|data|record)/i,
  /change\s+(my|the)\s+role/i,
  /make\s+me\s+(admin|manager|owner)/i,
  /bypass\s+(auth|security|verification|waiver)/i,
  /remove\s+(all|every)\s+(waiver|safety|check)/i,
  /override\s+(safety|compliance|block)/i,
  /access\s+other.*account/i,
  /export\s+all\s+(user|customer|payment)\s+data/i,
  /disable\s+(mfa|2fa|verification)/i,
];

function isBlockedAction(query: string): boolean {
  return BLOCKED_ACTION_PATTERNS.some(pattern => pattern.test(query));
}

function detectIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase();

  // Check for blocked actions first
  if (isBlockedAction(query)) {
    return "action_request";
  }

  if (lowerQuery.match(/^how\s+do\s+i|^how\s+can\s+i|^how\s+to/)) {
    return "how_to";
  }
  if (lowerQuery.match(/^where\s+is|^where\s+can\s+i/)) {
    return "location";
  }
  if (lowerQuery.match(/^what\s+does|^what\s+is|^what\s+are/)) {
    return "explanation";
  }
  if (lowerQuery.match(/^who\s+can|^can\s+i|^am\s+i/)) {
    return "permissions";
  }
  if (lowerQuery.match(/^what\s+if|^why|^troubleshoot|^problem/)) {
    return "troubleshoot";
  }

  // Detect action requests (mutating operations)
  if (lowerQuery.match(/^(create|delete|remove|update|change|modify|set|assign|transfer|refund)/)) {
    return "action_request";
  }

  return "other";
}

// RBAC-filtered suggestions by role
const ROLE_SUGGESTIONS: Record<string, string[]> = {
  ATHLETE: ["How do I check in?", "Where is my wallet?", "How do I view my logbook?", "What is jumpability?"],
  JUMPER: ["How do I check in?", "How do I manifest?", "Where is my logbook?", "What is jumpability?"],
  COACH: ["How do I set my availability?", "How do I view my sessions?", "How do I track student progression?"],
  TI: ["How do I manage tandem students?", "How do I complete a tandem check-in?", "How do I view my schedule?"],
  AFFI: ["How do I track AFF levels?", "How do I log a student jump?", "How do I view student progression?"],
  MANIFEST_STAFF: ["How do I create a load?", "How do I check in a walk-in?", "What are load statuses?", "How do I handle a weather hold?"],
  SAFETY_OFFICER: ["How do I report an incident?", "How do I review risk assessments?", "How do I activate emergency mode?"],
  PILOT: ["How do I view my CG sheet?", "How do I log hobbs hours?", "How do I view the weather?"],
  DZ_MANAGER: ["How do I review applications?", "How do I manage pricing?", "How do I set up branding?", "How do I view reports?"],
  PLATFORM_ADMIN: ["How do I manage dropzones?", "How do I review applications?", "How do I view audit logs?"],
};

// Extract keywords from query
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    "i",
    "a",
    "an",
    "the",
    "and",
    "or",
    "is",
    "are",
    "am",
    "to",
    "do",
    "how",
    "what",
    "where",
    "who",
    "can",
    "my",
    "me",
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => !stopWords.has(word) && word.length > 2)
    .slice(0, 5);
}

export async function portalAssistantRoutes(fastify: FastifyInstance) {
  // POST /api/assistant/query - Process assistant query with pattern matching
  fastify.post<{ Body: z.infer<typeof assistantQuerySchema> }>(
    "/assistant/query",
    {
      schema: {
        body: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
            role: { type: "string" },
            currentRoute: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = assistantQuerySchema.parse(request.body);
        const intent = detectIntent(body.query);
        const keywords = extractKeywords(body.query);

        // === SAFETY GUARDRAIL: Block dangerous action requests ===
        if (intent === "action_request" && isBlockedAction(body.query)) {
          reply.send({
            success: true,
            data: {
              answer: "I can't perform that action. For security reasons, operations like role changes, data deletion, and security overrides must be done manually by an authorized administrator through the proper dashboard interface. If you need help with this, please contact your DZ manager or system admin.",
              intent: "blocked_action",
              responseType: "safety-block",
              suggestedActions: ["Contact DZ Manager", "View Help Center", "Browse Settings"],
            },
          });
          // Log the blocked attempt
          await (fastify.prisma as any).assistantQuery.create({
            data: { query: body.query, intent: "blocked_action", keywords, responseType: "safety-block", matchedFeatureId: null, matchedArticleId: null },
          }).catch(() => {});
          return;
        }

        // Search feature registry
        const matchedFeatures = await fastify.prisma.featureRegistry.findMany({
          where: {
            status: "available",
            OR: [
              { featureName: { contains: keywords.join(" ") } },
              { description: { contains: keywords.join(" ") } },
            ],
          },
          take: 3,
          select: {
            id: true,
            featureName: true,
            description: true,
            module: true,
          },
        });

        // Search help articles
        const matchedArticles = await fastify.prisma.helpArticle.findMany({
          where: {
            OR: [
              { title: { contains: keywords.join(" ") } },
            ],
          },
          take: 3,
          select: {
            id: true,
            slug: true,
            title: true,
            shortAnswer: true,
            category: true,
            rolesAllowed: true,
          },
        });

        // Filter articles by role in-app
        const roleAllowedArticles = matchedArticles.filter((article) => {
          const allowedRoles = Array.isArray(article.rolesAllowed) ? article.rolesAllowed : [];
          return allowedRoles.length === 0 || allowedRoles.includes(body.role);
        });

        // Determine response type and data
        let responseType: "feature-found" | "help-article" | "not-found" | "suggestion" =
          "not-found";
        let data: any = null;
        let suggestedActions: string[] = [];

        if (matchedFeatures.length > 0) {
          responseType = "feature-found";
          data = matchedFeatures[0];
          suggestedActions = [
            `Open ${matchedFeatures[0].featureName}`,
            `Learn more about ${matchedFeatures[0].featureName}`,
            `View related features`,
          ];
        } else if (roleAllowedArticles.length > 0) {
          responseType = "help-article";
          data = roleAllowedArticles[0];
          suggestedActions = [
            `Read full article: "${roleAllowedArticles[0].title}"`,
            `Show related articles`,
          ];
        } else {
          responseType = "suggestion";
          suggestedActions = [
            "Submit feature request",
            "Browse help categories",
            "Contact support",
          ];
        }

        // Store query for analytics
        const queryId = await (fastify.prisma as any).assistantQuery.create({
          data: {
            query: body.query,
            intent,
            role: body.role,
            currentRoute: body.currentRoute || null,
            resultType: responseType,
            matchedFeatureId: matchedFeatures[0]?.id || null,
            matchedArticleId: roleAllowedArticles[0]?.id || null,
          },
          select: {
            id: true,
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            queryId: queryId.id,
            query: body.query,
            type: responseType,
            answer:
              responseType === "help-article"
                ? roleAllowedArticles[0]?.shortAnswer
                : responseType === "feature-found"
                  ? matchedFeatures[0]?.description
                  : "I couldn't find an answer to your question. Try browsing help articles or submit a feature request.",
            data,
            suggestedActions,
            intent,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Invalid query parameters",
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Assistant query failed",
          });
        }
      }
    }
  );

  // GET /api/assistant/suggestions - Get role-specific suggested prompts
  fastify.get<{ Querystring: z.infer<typeof suggestionsQuerySchema> }>(
    "/assistant/suggestions",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            role: { type: "string" },
            route: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = suggestionsQuerySchema.parse(request.query);

        // Fetch suggestions based on role and route
        const suggestions = await (fastify.prisma as any).assistantSuggestion.findMany({
          where: {
            OR:
              query.route && query.route !== ""
                ? [{ suggestedRoute: query.route }, { suggestedRoute: null }]
                : undefined,
          },
          take: 10,
          select: {
            id: true,
            prompt: true,
            description: true,
            category: true,
            appliedRoute: true,
            applicableRoles: true,
          },
          orderBy: { displayOrder: "asc" },
        });

        // Filter suggestions by role in-app
        const roleAllowedSuggestions = suggestions.filter((suggestion: any) => {
          const allowedRoles = Array.isArray(suggestion.applicableRoles)
            ? suggestion.applicableRoles
            : [];
          return allowedRoles.length === 0 || allowedRoles.includes(query.role);
        });

        reply.code(200).send({
          success: true,
          data: {
            suggestions: roleAllowedSuggestions.slice(0, 8),
            count: Math.min(roleAllowedSuggestions.length, 8),
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch suggestions",
        });
      }
    }
  );

  // POST /api/assistant/feedback - Save feedback on assistant response
  fastify.post<{ Body: z.infer<typeof assistantFeedbackSchema> }>(
    "/assistant/feedback",
    {
      schema: {
        body: {
          type: "object",
          required: ["queryId", "helpful"],
          properties: {
            queryId: { type: "string" },
            helpful: { type: "boolean" },
            comment: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = assistantFeedbackSchema.parse(request.body);

        // Verify query exists
        const existingQuery = await (fastify.prisma as any).assistantQuery.findUnique({
          where: { id: body.queryId },
        });

        if (!existingQuery) {
          throw new NotFoundError("Query");
        }

        // Save feedback
        const feedback = await (fastify.prisma as any).assistantFeedback.create({
          data: {
            queryId: body.queryId,
            helpful: body.helpful,
            comment: body.comment || null,
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            id: feedback.id,
            message: "Feedback saved",
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Invalid feedback data",
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to save feedback",
          });
        }
      }
    }
  );
}
