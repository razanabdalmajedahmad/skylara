import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { getDefaultLlmChatProvider } from '../services/llm';
import type { LlmChatMessage } from '../services/llm';
import {
  buildPortalAssistantSystemPrompt,
  buildPortalPlatformContext,
  fetchOpsSnapshotForAssistant,
  fetchWeatherFactsForAssistant,
} from '../services/ai/assistantContextAssembly';
import {
  classifyAssistantSurface,
  deriveAssistantRoleFocusTags,
  fetchAssistantProfileForShaping,
  instructionalStaffFromJwtRoles,
} from '../services/ai/assistantShaping';
import { getDefaultAssistantContextCache } from '../services/ai/assistantContextCache';
import { applyAssistantInputTokenBudget } from '../services/ai/assistantGovernance';
import {
  buildAssistantLimitMessage,
  decideAssistantUsage,
  getAssistantRolloutDecision,
  getAssistantUsagePolicy,
  getAssistantUsagePolicyForTenant,
} from '../services/ai/assistantUsageControl';
import { getAssistantUsedToday, incrementAssistantUsedToday } from '../services/ai/assistantUsageStore';
import {
  getAssistantUsedTodayPersistent,
  incrementAssistantUsedTodayPersistent,
} from '../services/ai/assistantUsagePersistentStore';
import {
  getAssistantTenantPlanContext,
  type AssistantTenantPlanContext,
} from '../services/ai/assistantTenantPlan';
import { resolveOrganizationAssistantPromptExperimentAssignment } from '../services/ai/assistantPromptExperimentRollout';
import { resolveAssistantPromptTemplateSelection } from '../services/ai/assistantPromptTemplateResolve';
import { recordAssistantMetricEvent } from '../services/ai/assistantMetricEvents';
import {
  buildAssistantMetricPromptTags,
  mergeAssistantMetricTags,
} from '../services/ai/assistantMetricPromptTags';
import { getEnv } from '../utils/env';

// Type alias for TypeBoxTypeProvider from declarations.d.ts
type TypeBoxTypeProvider = any;

/**
 * AI-powered assistant module for the SkyLara portal.
 * Handles conversations, context-aware suggestions, and integrated help resources.
 *
 * Features:
 * - Multi-turn conversations with context awareness
 * - Claude API integration with fallback to local knowledge
 * - PII masking and security rules enforcement
 * - Analytics tracking for assistant interactions
 * - Role-based suggestions and personalized recommendations
 */

// ============================================================================
// SCHEMAS
// ============================================================================

const AssistantMessageSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 2000 }),
  conversationId: Type.Optional(Type.String({ format: 'uuid' })),
  context: Type.Optional(
    Type.Object({
      currentRoute: Type.Optional(Type.String()),
      currentPage: Type.Optional(Type.String()),
    })
  ),
});

const AssistantResponseSchema = Type.Object({
  response: Type.String(),
  sources: Type.Array(
    Type.Object({
      type: Type.Enum({ article: 'article', feature: 'feature' }),
      title: Type.String(),
      route: Type.Optional(Type.String()),
    })
  ),
  conversationId: Type.String(),
});

const ConversationSummarySchema = Type.Object({
  id: Type.String(),
  title: Type.Optional(Type.String()),
  messageCount: Type.Number(),
  createdAt: Type.String({ format: 'date-time' }),
});

const ConversationDetailSchema = Type.Object({
  id: Type.String(),
  title: Type.Optional(Type.String()),
  messages: Type.Array(
    Type.Object({
      role: Type.Enum({ user: 'user', assistant: 'assistant' }),
      content: Type.String(),
      timestamp: Type.String({ format: 'date-time' }),
    })
  ),
  messageCount: Type.Number(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const FeedbackSchema = Type.Object({
  queryId: Type.String(),
  helpful: Type.Boolean(),
  comment: Type.Optional(Type.String({ maxLength: 500 })),
});

const SearchSchema = Type.Object({
  q: Type.String({ minLength: 1 }),
  category: Type.Optional(Type.String()),
});

const SuggestionSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.String(),
  route: Type.String(),
  applicableRoles: Type.Array(Type.String()),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate or retrieve conversation title from initial message.
 */
function generateConversationTitle(message: string): string {
  const words = message.split(' ').slice(0, 5).join(' ');
  return words.length > 50 ? words.substring(0, 47) + '...' : words;
}

/**
 * Search help articles and features for relevant matches.
 */
async function searchKnowledgeBase(
  prisma: any,
  query: string,
  limit: number = 5
) {
  const q = query.trim();
  if (!q) {
    return [];
  }

  try {
    const [articles, features] = await Promise.all([
      prisma.helpArticle.findMany({
        where: {
          OR: [{ title: { contains: q } }, { shortAnswer: { contains: q } }],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          keywords: true,
          shortAnswer: true,
          detailedSteps: true,
          category: true,
        },
      }),
      prisma.featureRegistry.findMany({
        where: {
          OR: [{ featureName: { contains: q } }, { description: { contains: q } }],
        },
        take: limit,
        select: {
          id: true,
          featureName: true,
          description: true,
          route: true,
          rolesRequired: true,
        },
      }),
    ]);

    const ql = q.toLowerCase();
    const keywordsMatch = (kw: unknown): boolean => {
      if (Array.isArray(kw)) {
        return kw.some((k) => typeof k === 'string' && k.toLowerCase().includes(ql));
      }
      return false;
    };

    const scoredArticles = articles.map((a: any) => ({
      type: 'article' as const,
      score: a.title.toLowerCase().includes(ql)
        ? 100
        : keywordsMatch(a.keywords)
          ? 50
          : a.shortAnswer?.toLowerCase().includes(ql)
            ? 25
            : 10,
      ...a,
    }));

    const scoredFeatures = features.map((f: any) => ({
      type: 'feature' as const,
      score: f.featureName?.toLowerCase().includes(ql) ? 100 : 50,
      name: f.featureName,
      description: f.description,
      route: f.route,
      requiredRoles: f.rolesRequired,
      id: f.id,
    }));

    return [...scoredArticles, ...scoredFeatures].sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

/**
 * Build fallback response when Claude API is unavailable.
 */
function buildFallbackResponse(
  matches: any[],
  userMessage: string
): { response: string; sources: any[] } {
  const articles = matches.filter(m => m.type === 'article');
  const features = matches.filter(m => m.type === 'feature');

  let response = '';

  if (articles.length > 0) {
    response = `I found some helpful resources for you:\n\n`;
    response += articles
      .slice(0, 2)
      .map(a => `**${a.title}**\n${a.shortAnswer}\n${a.detailedSteps ? `\nSteps: ${a.detailedSteps.substring(0, 100)}...` : ''}`)
      .join('\n\n');
  } else if (features.length > 0) {
    response = `I found these features that might help:\n\n`;
    response += features
      .slice(0, 2)
      .map(f => `**${f.name}** → Go to: ${f.route}\n${f.description}`)
      .join('\n\n');
  } else {
    response = `I couldn't find specific resources for "${userMessage}". Please try:\n- Browsing the help center\n- Checking the documentation\n- Contacting support for detailed assistance`;
  }

  const sources = matches.slice(0, 3).map(m => ({
    type: m.type,
    title: m.type === 'article' ? m.title : m.name,
    route: m.route || m.category,
  }));

  return { response, sources };
}

type AssistantMessageBody = { message: string; conversationId?: string; context?: any };

/**
 * Shared portal assistant turn: conversation, KB matches, prompts, history (for JSON and SSE routes).
 */
async function prepareAssistantMessageContext(
  prisma: any,
  userId: number,
  jwtRoles: string[],
  body: AssistantMessageBody,
  assistantCtxLog: { info: (o: Record<string, unknown>) => void; warn: (o: Record<string, unknown>) => void },
  tenant: AssistantTenantPlanContext
): Promise<
  | { ok: false; statusCode: number; payload: { error: string } }
  | {
      ok: true;
      conversation: any;
      matches: any[];
      systemPrompt: string;
      messageHistory: LlmChatMessage[];
      message: string;
      context?: any;
      shapingMeta: {
        surfaceClass: string;
        roleFocusTags: string[];
        jumpProfile: string;
        jumpBand: string;
        licenseBand: string;
        progressionStage: string;
        disciplineBreadth: string;
        instructionalStaffCapacity: string;
      };
      templateSelection: {
        templateId: string;
        headerVersion: string;
        selectionSource: 'organization' | 'experiment' | 'environment' | 'registry_default';
        requestedPin: string | null;
        experimentId: number | null;
        experimentKey: string | null;
      };
    }
> {
  const { message, conversationId, context } = body;

  let conversation = conversationId
    ? await prisma.assistantConversation.findUnique({
        where: { id: conversationId },
      })
    : null;

  if (conversationId && !conversation) {
    return { ok: false, statusCode: 404, payload: { error: 'Conversation not found' } };
  }

  if (!conversation) {
    conversation = await prisma.assistantConversation.create({
      data: {
        userId,
        title: generateConversationTitle(message),
        messages: [],
        messageCount: 0,
      },
    });
  }

  const matches = await searchKnowledgeBase(prisma, message);

  const assistantCtxCache = getDefaultAssistantContextCache();

  const [opsSnapshot, weatherSnapshot, athleteSnap] = await Promise.all([
    fetchOpsSnapshotForAssistant(prisma, userId, message, {
      cache: assistantCtxCache,
      log: assistantCtxLog,
    }),
    fetchWeatherFactsForAssistant(prisma, userId, message, {
      cache: assistantCtxCache,
      log: assistantCtxLog,
      fetchImpl: globalThis.fetch,
    }),
    fetchAssistantProfileForShaping(prisma, userId),
  ]);

  const primaryRole = jwtRoles[0] || 'USER';
  const roleFocusTags = deriveAssistantRoleFocusTags(jwtRoles);
  const surfaceClass = classifyAssistantSurface(context?.currentRoute, context?.currentPage);
  const instructionalStaffCapacity = instructionalStaffFromJwtRoles(jwtRoles);
  const shaping = {
    roleFocusTags,
    surfaceClass,
    jumpProfile: athleteSnap.jumpProfile,
    jumpBand: athleteSnap.jumpBand,
    licenseBand: athleteSnap.licenseBand,
    progressionStage: athleteSnap.progressionStage,
    disciplineBreadth: athleteSnap.disciplineBreadth,
    instructionalStaffCapacity,
  };

  const platformContext = buildPortalPlatformContext({
    currentPageLabel: context?.currentPage || 'General',
    currentRoute: context?.currentRoute,
    weatherSnapshot,
    opsSnapshot,
  });

  const env = getEnv();
  const experimentsGloballyOn = env.ASSISTANT_PROMPT_EXPERIMENTS_ENABLED !== false;
  const experimentAssignment =
    tenant.orgId != null
      ? await resolveOrganizationAssistantPromptExperimentAssignment(prisma, {
          organizationId: tenant.orgId,
          userId,
          subscriptionTier: tenant.subscriptionTier,
          experimentsGloballyEnabled: experimentsGloballyOn,
        })
      : null;

  const templateSelection = resolveAssistantPromptTemplateSelection({
    orgAssistantPromptTemplateId: tenant.assistantPromptTemplateId,
    experimentAssignedTemplateId: experimentAssignment?.templateId,
    experimentRecordId: experimentAssignment?.experimentId,
    experimentKey: experimentAssignment?.experimentKey,
    envAssistantPromptVersion: env.ASSISTANT_PROMPT_VERSION ?? process.env.ASSISTANT_PROMPT_VERSION,
  });

  const systemPrompt = buildPortalAssistantSystemPrompt({
    userRole: primaryRole,
    currentRoute: context?.currentRoute,
    matches,
    platformContext,
    promptVersion: templateSelection.headerVersion,
    shaping,
  });

  const messageHistory: LlmChatMessage[] = (conversation.messages as any[]).map((m) => ({
    role: m.role as LlmChatMessage['role'],
    content: m.content,
  }));
  messageHistory.push({ role: 'user', content: message });

  return {
    ok: true,
    conversation,
    matches,
    systemPrompt,
    messageHistory,
    message,
    context,
    shapingMeta: {
      surfaceClass,
      roleFocusTags,
      jumpProfile: athleteSnap.jumpProfile,
      jumpBand: athleteSnap.jumpBand,
      licenseBand: athleteSnap.licenseBand,
      progressionStage: athleteSnap.progressionStage,
      disciplineBreadth: athleteSnap.disciplineBreadth,
      instructionalStaffCapacity,
    },
    templateSelection,
  };
}

function writeAssistantSse(res: { write: (c: string | Buffer) => boolean }, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function chunkAssistantText(s: string, maxChars: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += maxChars) {
    parts.push(s.slice(i, i + maxChars));
  }
  return parts.length ? parts : [''];
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export async function assistantAdvancedRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;

  /**
   * POST /assistant/message
   * Send a message to the assistant and get a response.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().post<{ Body: Static<typeof AssistantMessageSchema> }>(
    '/assistant/message',
    {
      schema: {
        body: AssistantMessageSchema,
        response: { 200: AssistantResponseSchema },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const body = request.body as AssistantMessageBody;

      try {
        const assistantCtxLog = {
          info: (o: Record<string, unknown>) => fastify.log.info(o),
          warn: (o: Record<string, unknown>) => fastify.log.warn(o),
        };

        const jwtDzId = parseInt(request.user.dropzoneId || '0') || null;
        const tenant = await getAssistantTenantPlanContext(prisma, userId, jwtDzId);

        const prep = await prepareAssistantMessageContext(
          prisma,
          userId,
          request.user.roles || [],
          body,
          assistantCtxLog,
          tenant
        );
        if (!prep.ok) {
          return reply.status(prep.statusCode).send(prep.payload);
        }

        const { conversation, matches, systemPrompt, messageHistory, message, context, shapingMeta, templateSelection } =
          prep;

        const promptTags = buildAssistantMetricPromptTags(templateSelection);
        const llmProvider = getDefaultLlmChatProvider();
        const env = getEnv();
        const maxInputTokens = env.ASSISTANT_INPUT_TOKEN_BUDGET ?? 6500;
        const usagePolicy = getAssistantUsagePolicy(env);
        const usagePolicyForTenant = getAssistantUsagePolicyForTenant(env, {
          subscriptionTier: tenant.subscriptionTier,
        });
        let usedToday = 0;
        let usageSource: 'persistent' | 'in_memory_fallback' = 'persistent';
        try {
          usedToday = await getAssistantUsedTodayPersistent(prisma, { userId, orgId: tenant.orgId });
        } catch {
          usageSource = 'in_memory_fallback';
          usedToday = getAssistantUsedToday(userId);
        }
        const usageDecision = decideAssistantUsage(usagePolicyForTenant, usedToday);
        const budgeted = applyAssistantInputTokenBudget({
          system: systemPrompt,
          messages: messageHistory,
          maxInputTokens,
          minKeepMessages: 2,
        });
        fastify.log.info({
          event: 'assistant.message.governance',
          promptVersion: templateSelection.headerVersion,
          assistantPromptTemplateId: templateSelection.templateId,
          assistantPromptTemplateSource: templateSelection.selectionSource,
          assistantPromptTemplateRequested: templateSelection.requestedPin,
          assistantPromptExperimentId: templateSelection.experimentId,
          assistantPromptExperimentKey: templateSelection.experimentKey,
          orgId: tenant.orgId,
          dropzoneId: tenant.dropzoneId,
          inputTokensEstimated: budgeted.estimatedInputTokens,
          inputTokenBudget: maxInputTokens,
          droppedMessageCount: budgeted.droppedMessageCount,
          truncatedSystem: budgeted.truncatedSystem,
          transport: 'json',
          usedToday,
          exceededSoftLimit: usageDecision.allow ? usageDecision.exceededSoftLimit : null,
          usageSource,
          subscriptionTier: tenant.subscriptionTier ?? null,
          policySource: usagePolicyForTenant.policySource,
          assistantSurfaceClass: shapingMeta.surfaceClass,
          assistantRoleFocusTags: shapingMeta.roleFocusTags,
          assistantJumpProfile: shapingMeta.jumpProfile,
          assistantJumpBand: shapingMeta.jumpBand,
          assistantLicenseBand: shapingMeta.licenseBand,
          assistantProgressionStage: shapingMeta.progressionStage,
          assistantDisciplineBreadth: shapingMeta.disciplineBreadth,
          assistantInstructionalStaff: shapingMeta.instructionalStaffCapacity,
          athleteProfileClass: shapingMeta.progressionStage,
        });
        if (usageDecision.allow && usageDecision.exceededSoftLimit) {
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.usage.soft_limit',
            transport: 'json',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              policySource: usagePolicyForTenant.policySource,
              usageSource,
            }),
          });
        }
        if (budgeted.truncatedSystem || budgeted.droppedMessageCount > 0) {
          fastify.log.info({
            event: 'assistant.metric',
            metric: 'assistant.budget.truncation',
            value: 1,
            droppedMessageCount: budgeted.droppedMessageCount,
            truncatedSystem: budgeted.truncatedSystem,
          });
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.budget.truncation',
            transport: 'json',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              droppedMessageCount: budgeted.droppedMessageCount,
              truncatedSystem: budgeted.truncatedSystem,
            }),
          });
        }

        if (!usageDecision.allow) {
          const msg = buildAssistantLimitMessage();

          const updatedMessages = [
            ...messageHistory,
            { role: 'assistant', content: msg },
          ];
          await prisma.assistantConversation.update({
            where: { id: conversation.id },
            data: {
              messages: updatedMessages,
              messageCount: updatedMessages.length,
            },
          });

          await prisma.assistantQuery
            .create({
              data: {
                query: message,
                intent: 'chat',
                role: request.user.roles[0] || 'unknown',
                currentRoute: context?.currentRoute || null,
                resultType: 'blocked_usage_limit',
                matchedFeatureId: matches.find((m: any) => m.type === 'feature')?.id || null,
                matchedArticleId: matches.find((m: any) => m.type === 'article')?.id || null,
              },
            })
            .catch(() => {});

          fastify.log.warn({
            event: 'assistant.usage.blocked',
            reason: usageDecision.reason,
            transport: 'json',
            usedToday,
            softLimit: usagePolicyForTenant.softLimitPerDay ?? null,
            hardLimit: usagePolicyForTenant.hardLimitPerDay ?? null,
            subscriptionTier: tenant.subscriptionTier ?? null,
            policySource: usagePolicyForTenant.policySource,
            usageSource,
          });
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.usage.blocked',
            transport: 'json',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              reason: usageDecision.reason,
              policySource: usagePolicyForTenant.policySource,
              usageSource,
            }),
          });

          return reply.send({
            response: msg,
            sources: [],
            conversationId: conversation.id,
          });
        }

        const llmResult = await llmProvider.complete(
          { system: budgeted.system, messages: budgeted.messages },
          {
            log: {
              warn: (o) => fastify.log.warn(o),
              error: (o) => fastify.log.error(o),
              info: (o) => fastify.log.info(o),
            },
          }
        );
        const assistantLlmLog: Record<string, unknown> = {
          event: 'assistant.message.llm',
          outcome: llmResult.outcome,
          usedLlmText: Boolean(llmResult.text),
        };
        if (llmResult.attemptsUsed != null) {
          assistantLlmLog.attemptsUsed = llmResult.attemptsUsed;
        }
        if (!llmResult.text && llmResult.failureCategory) {
          assistantLlmLog.failureCategory = llmResult.failureCategory;
        }
        fastify.log.info(assistantLlmLog);
        fastify.log.info({
          event: 'assistant.metric',
          metric: llmResult.text ? 'assistant.json.success' : 'assistant.json.fallback',
          value: 1,
          outcome: llmResult.outcome,
          failureCategory: llmResult.failureCategory ?? null,
        });
        void recordAssistantMetricEvent(prisma, {
          metric: llmResult.text ? 'assistant.json.success' : 'assistant.json.fallback',
          transport: 'json',
          outcome: llmResult.outcome,
          failureCategory: llmResult.failureCategory ?? null,
          userId,
          orgId: tenant.orgId,
          subscriptionTier: tenant.subscriptionTier,
          tags: mergeAssistantMetricTags(promptTags, {
            policySource: usagePolicyForTenant.policySource,
            usageSource,
          }),
        });
        if (!llmResult.text && llmResult.failureCategory) {
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.provider.failure',
            transport: 'json',
            outcome: llmResult.outcome,
            failureCategory: llmResult.failureCategory,
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {}),
          });
        }
        let assistantResponse = llmResult.text;

        // Use fallback if API unavailable
        let sources: any[] = [];
        if (!assistantResponse) {
          const fallback = buildFallbackResponse(matches, message);
          assistantResponse = fallback.response;
          sources = fallback.sources;
        } else {
          sources = matches.slice(0, 3).map(m => ({
            type: m.type,
            title: m.type === 'article' ? m.title : m.name,
            route: m.route || m.category,
          }));
        }

        // Update conversation
        const updatedMessages = [
          ...messageHistory,
          { role: 'assistant', content: assistantResponse },
        ];

        const updatedConversation = await prisma.assistantConversation.update({
          where: { id: conversation.id },
          data: {
            messages: updatedMessages,
            messageCount: updatedMessages.length,
          },
        });

        // Log query for analytics
        try {
          await prisma.assistantQuery.create({
            data: {
              query: message,
              intent: 'chat',
              role: request.user.roles[0] || 'unknown',
              currentRoute: context?.currentRoute || null,
              resultType: matches.length > 0 ? 'matched' : 'fallback',
              matchedFeatureId: matches.find((m: any) => m.type === 'feature')?.id || null,
              matchedArticleId: matches.find((m: any) => m.type === 'article')?.id || null,
            },
          });
        } catch {
          // Non-critical — analytics logging failure should not break the response
        }
        try {
          await incrementAssistantUsedTodayPersistent(prisma, { userId, orgId: tenant.orgId });
        } catch {
          incrementAssistantUsedToday(userId);
        }

        return reply.send({
          response: assistantResponse,
          sources,
          conversationId: conversation.id,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to process message' });
      }
    }
  );

  /**
   * POST /assistant/message/stream
   * SSE stream of assistant tokens; same body as POST /assistant/message.
   * Events: `delta` ({ c }), optional `replace` ({ mode: 'full' }) before fallback replay, `done` ({ conversationId, sources, usedLlmText, streamFallback }), `error` ({ code }).
   * Non-streaming clients should keep using POST /assistant/message.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().post<{ Body: Static<typeof AssistantMessageSchema> }>(
    '/assistant/message/stream',
    {
      schema: { body: AssistantMessageSchema },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const body = request.body as AssistantMessageBody;

      try {
        const assistantCtxLog = {
          info: (o: Record<string, unknown>) => fastify.log.info(o),
          warn: (o: Record<string, unknown>) => fastify.log.warn(o),
        };

        const jwtDzIdStream = parseInt(request.user.dropzoneId || '0') || null;
        const tenant = await getAssistantTenantPlanContext(prisma, userId, jwtDzIdStream);

        const prep = await prepareAssistantMessageContext(
          prisma,
          userId,
          request.user.roles || [],
          body,
          assistantCtxLog,
          tenant
        );
        if (!prep.ok) {
          return reply.status(prep.statusCode).send(prep.payload);
        }

        const { conversation, matches, systemPrompt, messageHistory, message, context, shapingMeta, templateSelection } =
          prep;

        const promptTags = buildAssistantMetricPromptTags(templateSelection);
        reply.hijack();
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        const clientAbort = new AbortController();
        let clientClosed = false;
        let abortedByClient = false;
        const onClientClose = () => {
          clientClosed = true;
          abortedByClient = true;
          clientAbort.abort();
        };
        request.raw.on('close', onClientClose);

        const llmLog = {
          warn: (o: Record<string, unknown>) => fastify.log.warn(o),
          error: (o: Record<string, unknown>) => fastify.log.error(o),
          info: (o: Record<string, unknown>) => fastify.log.info(o),
        };

        const llmProvider = getDefaultLlmChatProvider();
        const env = getEnv();
        const maxInputTokens = env.ASSISTANT_INPUT_TOKEN_BUDGET ?? 6500;
        const rollout = getAssistantRolloutDecision(env);
        const usagePolicy = getAssistantUsagePolicy(env);
        const usagePolicyForTenant = getAssistantUsagePolicyForTenant(env, {
          subscriptionTier: tenant.subscriptionTier,
        });
        let usedToday = 0;
        let usageSource: 'persistent' | 'in_memory_fallback' = 'persistent';
        try {
          usedToday = await getAssistantUsedTodayPersistent(prisma, { userId, orgId: tenant.orgId });
        } catch {
          usageSource = 'in_memory_fallback';
          usedToday = getAssistantUsedToday(userId);
        }
        const usageDecision = decideAssistantUsage(usagePolicyForTenant, usedToday);
        const budgeted = applyAssistantInputTokenBudget({
          system: systemPrompt,
          messages: messageHistory,
          maxInputTokens,
          minKeepMessages: 2,
        });
        fastify.log.info({
          event: 'assistant.message.governance',
          promptVersion: templateSelection.headerVersion,
          assistantPromptTemplateId: templateSelection.templateId,
          assistantPromptTemplateSource: templateSelection.selectionSource,
          assistantPromptTemplateRequested: templateSelection.requestedPin,
          assistantPromptExperimentId: templateSelection.experimentId,
          assistantPromptExperimentKey: templateSelection.experimentKey,
          orgId: tenant.orgId,
          dropzoneId: tenant.dropzoneId,
          inputTokensEstimated: budgeted.estimatedInputTokens,
          inputTokenBudget: maxInputTokens,
          droppedMessageCount: budgeted.droppedMessageCount,
          truncatedSystem: budgeted.truncatedSystem,
          transport: 'sse',
          usedToday,
          exceededSoftLimit: usageDecision.allow ? usageDecision.exceededSoftLimit : null,
          usageSource,
          subscriptionTier: tenant.subscriptionTier ?? null,
          policySource: usagePolicyForTenant.policySource,
          jsonOnlyMode: rollout.jsonOnlyMode,
          assistantSurfaceClass: shapingMeta.surfaceClass,
          assistantRoleFocusTags: shapingMeta.roleFocusTags,
          assistantJumpProfile: shapingMeta.jumpProfile,
          assistantJumpBand: shapingMeta.jumpBand,
          assistantLicenseBand: shapingMeta.licenseBand,
          assistantProgressionStage: shapingMeta.progressionStage,
          assistantDisciplineBreadth: shapingMeta.disciplineBreadth,
          assistantInstructionalStaff: shapingMeta.instructionalStaffCapacity,
          athleteProfileClass: shapingMeta.progressionStage,
        });
        if (usageDecision.allow && usageDecision.exceededSoftLimit) {
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.usage.soft_limit',
            transport: 'sse',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              policySource: usagePolicyForTenant.policySource,
              usageSource,
            }),
          });
        }
        if (budgeted.truncatedSystem || budgeted.droppedMessageCount > 0) {
          fastify.log.info({
            event: 'assistant.metric',
            metric: 'assistant.budget.truncation',
            value: 1,
            droppedMessageCount: budgeted.droppedMessageCount,
            truncatedSystem: budgeted.truncatedSystem,
            transport: 'sse',
          });
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.budget.truncation',
            transport: 'sse',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              droppedMessageCount: budgeted.droppedMessageCount,
              truncatedSystem: budgeted.truncatedSystem,
            }),
          });
        }

        const llmParams = { system: budgeted.system, messages: budgeted.messages };

        let accumulated = '';
        let streamFatal = false;
        let openedStream = false;
        let deltaChunksWritten = 0;
        let streamingUnsupported = false;
        let streamBlockedByRollout = false;

        if (!usageDecision.allow) {
          const msg = buildAssistantLimitMessage();

          const updatedMessages = [
            ...messageHistory,
            { role: 'assistant', content: msg },
          ];
          await prisma.assistantConversation.update({
            where: { id: conversation.id },
            data: { messages: updatedMessages, messageCount: updatedMessages.length },
          });

          await prisma.assistantQuery
            .create({
              data: {
                query: message,
                intent: 'chat',
                role: request.user.roles[0] || 'unknown',
                currentRoute: context?.currentRoute || null,
                resultType: 'blocked_usage_limit',
                matchedFeatureId: matches.find((m: any) => m.type === 'feature')?.id || null,
                matchedArticleId: matches.find((m: any) => m.type === 'article')?.id || null,
              },
            })
            .catch(() => {});

          if (!clientClosed) {
            writeAssistantSse(reply.raw, 'delta', { c: msg });
            writeAssistantSse(reply.raw, 'done', {
              conversationId: conversation.id,
              sources: [],
              usedLlmText: false,
              streamFallback: true,
            });
          }
          void recordAssistantMetricEvent(prisma, {
            metric: 'assistant.usage.blocked',
            transport: 'sse',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              reason: usageDecision.reason,
              policySource: usagePolicyForTenant.policySource,
              usageSource,
            }),
          });
          request.raw.removeListener('close', onClientClose);
          reply.raw.end();
          return;
        }

        try {
          if (!rollout.allowStreaming) {
            streamFatal = true;
            streamBlockedByRollout = true;
            fastify.log.info({
              event: 'assistant.stream.rollout_blocked',
              jsonOnlyMode: rollout.jsonOnlyMode,
            });
          } else if (typeof llmProvider.openCompletionStream === 'function') {
            const streamInit = await llmProvider.openCompletionStream(llmParams, {
              log: llmLog,
              signal: clientAbort.signal,
            });
            if (streamInit.ok) {
              openedStream = true;
              try {
                for await (const ev of streamInit.events) {
                  if (clientClosed) break;
                  if (ev.kind === 'delta') {
                    accumulated += ev.text;
                    writeAssistantSse(reply.raw, 'delta', { c: ev.text });
                    deltaChunksWritten += 1;
                  } else if (ev.kind === 'end') {
                    break;
                  } else if (ev.kind === 'error') {
                    streamFatal = true;
                    fastify.log.warn({
                      event: 'assistant.message.stream.provider_error',
                      outcome: ev.outcome,
                      failureCategory: ev.failureCategory,
                      httpStatus: ev.httpStatus,
                    });
                    void recordAssistantMetricEvent(prisma, {
                      metric: 'assistant.provider.failure',
                      transport: 'sse',
                      outcome: ev.outcome,
                      failureCategory: ev.failureCategory,
                      userId,
                      orgId: tenant.orgId,
                      subscriptionTier: tenant.subscriptionTier,
                      tags: mergeAssistantMetricTags(promptTags, { httpStatus: ev.httpStatus ?? null }),
                    });
                    break;
                  }
                }
              } finally {
                streamInit.abort();
              }
            } else {
              streamFatal = true;
            }
          } else {
            streamFatal = true;
            streamingUnsupported = true;
            fastify.log.info({
              event: 'assistant.message.stream.unsupported',
              providerId: llmProvider.providerId,
            });
          }

          const streamContentOk = openedStream && !streamFatal && accumulated.length > 0;
          let assistantResponse: string;
          let sources: any[] = [];
          let usedLlmText: boolean;

          if (streamContentOk) {
            assistantResponse = accumulated;
            usedLlmText = true;
            sources = matches.slice(0, 3).map((m: any) => ({
              type: m.type,
              title: m.type === 'article' ? m.title : m.name,
              route: m.route || m.category,
            }));
            fastify.log.info({
              event: 'assistant.message.llm',
              outcome: 'success',
              usedLlmText: true,
              sseStream: true,
            });
          } else {
            if (openedStream && accumulated.length > 0 && !clientClosed) {
              writeAssistantSse(reply.raw, 'replace', { mode: 'full' });
            }
            const llmResult = await llmProvider.complete(llmParams, { log: llmLog });
            const assistantLlmLog: Record<string, unknown> = {
              event: 'assistant.message.llm',
              outcome: llmResult.outcome,
              usedLlmText: Boolean(llmResult.text),
              sseStream: true,
              streamFallback: true,
            };
            if (llmResult.attemptsUsed != null) assistantLlmLog.attemptsUsed = llmResult.attemptsUsed;
            if (!llmResult.text && llmResult.failureCategory) {
              assistantLlmLog.failureCategory = llmResult.failureCategory;
            }
            fastify.log.info(assistantLlmLog);

            if (llmResult.text) {
              assistantResponse = llmResult.text;
              usedLlmText = true;
              sources = matches.slice(0, 3).map((m: any) => ({
                type: m.type,
                title: m.type === 'article' ? m.title : m.name,
                route: m.route || m.category,
              }));
            } else {
              const fallback = buildFallbackResponse(matches, message);
              assistantResponse = fallback.response;
              sources = fallback.sources;
              usedLlmText = false;
            }

            if (!clientClosed) {
              for (const part of chunkAssistantText(assistantResponse, 768)) {
                writeAssistantSse(reply.raw, 'delta', { c: part });
                deltaChunksWritten += 1;
              }
            }
          }

          const updatedMessages = [
            ...messageHistory,
            { role: 'assistant', content: assistantResponse },
          ];

          const updatedConversation = await prisma.assistantConversation.update({
            where: { id: conversation.id },
            data: {
              messages: updatedMessages,
              messageCount: updatedMessages.length,
            },
          });

          try {
            await prisma.assistantQuery.create({
              data: {
                query: message,
                intent: 'chat',
                role: request.user.roles[0] || 'unknown',
                currentRoute: context?.currentRoute || null,
                resultType: matches.length > 0 ? 'matched' : 'fallback',
                matchedFeatureId: matches.find((m: any) => m.type === 'feature')?.id || null,
                matchedArticleId: matches.find((m: any) => m.type === 'article')?.id || null,
              },
            });
          } catch {
            // Non-critical
          }
          try {
            await incrementAssistantUsedTodayPersistent(prisma, { userId, orgId: tenant.orgId });
          } catch {
            incrementAssistantUsedToday(userId);
          }

          fastify.log.info({
            event: 'assistant.message.stream.summary',
            deltaChunksWritten,
            charCount: assistantResponse.length,
            usedLlmText,
            streamContentOk,
            streamFallback: !streamContentOk,
            streamingUnsupported,
            streamBlockedByRollout,
            conversationId: updatedConversation.id,
          });

          fastify.log.info({
            event: 'assistant.metric',
            metric: streamContentOk ? 'assistant.stream.success' : 'assistant.stream.fallback',
            value: 1,
          });
          void recordAssistantMetricEvent(prisma, {
            metric: streamContentOk ? 'assistant.stream.success' : 'assistant.stream.fallback',
            transport: 'sse',
            userId,
            orgId: tenant.orgId,
            subscriptionTier: tenant.subscriptionTier,
            tags: mergeAssistantMetricTags(promptTags, {
              streamFallback: !streamContentOk,
              streamingUnsupported,
              streamBlockedByRollout,
            }),
          });
          if (streamingUnsupported) {
            void recordAssistantMetricEvent(prisma, {
              metric: 'assistant.stream.unsupported_client',
              transport: 'sse',
              userId,
              orgId: tenant.orgId,
              subscriptionTier: tenant.subscriptionTier,
              tags: mergeAssistantMetricTags(promptTags, { providerId: llmProvider.providerId }),
            });
          }
          if (abortedByClient) {
            void recordAssistantMetricEvent(prisma, {
              metric: 'assistant.stream.aborted',
              transport: 'sse',
              userId,
              orgId: tenant.orgId,
              subscriptionTier: tenant.subscriptionTier,
              tags: mergeAssistantMetricTags(promptTags, {}),
            });
          }

          if (!clientClosed) {
            writeAssistantSse(reply.raw, 'done', {
              conversationId: updatedConversation.id,
              sources,
              usedLlmText,
              streamFallback: !streamContentOk,
            });
          }
        } catch (streamErr) {
          fastify.log.error(streamErr);
          if (!clientClosed) {
            writeAssistantSse(reply.raw, 'error', { code: 'processing_failed' });
          }
        } finally {
          request.raw.removeListener('close', onClientClose);
          reply.raw.end();
        }
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to process message' });
      }
    }
  );

  /**
   * GET /assistant/conversations
   * Get user's conversation list with pagination.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get<{
    Querystring: { skip?: number; take?: number };
  }>(
    '/assistant/conversations',
    {
      schema: {
        response: {
          200: Type.Object({
            conversations: Type.Array(ConversationSummarySchema),
            total: Type.Number(),
          }),
        },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const query = request.query as { skip?: number; take?: number };
      const skip = Math.max(0, query.skip || 0);
      const take = Math.min(50, query.take || 20);

      try {
        const [conversations, total] = await Promise.all([
          prisma.assistantConversation.findMany({
            where: { userId },
            select: {
              id: true,
              title: true,
              messageCount: true,
              createdAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
          }),
          prisma.assistantConversation.count({ where: { userId } }),
        ]);

        return reply.send({
          conversations: conversations.map((c: any) => ({
            id: c.id,
            title: c.title || 'Untitled',
            messageCount: c.messageCount,
            createdAt: c.createdAt.toISOString(),
          })),
          total,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch conversations' });
      }
    }
  );

  /**
   * GET /assistant/conversations/:id
   * Get full conversation with all messages.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get<{ Params: { id: string } }>(
    '/assistant/conversations/:id',
    {
      schema: { response: { 200: ConversationDetailSchema } },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };

      try {
        const conversation = await prisma.assistantConversation.findUnique({
          where: { id },
        });

        if (!conversation || conversation.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        const messages = (conversation.messages as any[]).map((m, idx) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(conversation.createdAt.getTime() + idx * 1000).toISOString(),
        }));

        return reply.send({
          id: conversation.id,
          title: conversation.title,
          messages,
          messageCount: conversation.messageCount,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch conversation' });
      }
    }
  );

  /**
   * DELETE /assistant/conversations/:id
   * Delete a conversation.
   */
  fastify.delete<{ Params: { id: string } }>(
    '/assistant/conversations/:id',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const { id } = request.params as { id: string };

      try {
        const conversation = await prisma.assistantConversation.findUnique({
          where: { id },
        });

        if (!conversation || conversation.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }

        await prisma.assistantConversation.delete({ where: { id } });
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete conversation' });
      }
    }
  );

  /**
   * GET /assistant/suggestions
   * Get contextual suggestions for the current user.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get(
    '/assistant/advanced/suggestions',
    {
      schema: { response: { 200: Type.Array(SuggestionSchema) } },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userRole = request.user.roles[0];

        const suggestions = await prisma.assistantSuggestion.findMany({
          where: {
            applicableRoles: { array_contains: [userRole] },
          },
          select: {
            id: true,
            prompt: true,
            description: true,
            suggestedRoute: true,
            applicableRoles: true,
          },
          take: 5,
        });

        return reply.send(suggestions.map((s: any) => ({
          id: s.id,
          title: s.prompt,
          description: s.description,
          route: s.suggestedRoute,
          applicableRoles: s.applicableRoles,
        })));
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch suggestions' });
      }
    }
  );

  /**
   * POST /assistant/feedback
   * Log feedback about an assistant response.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().post<{ Body: Static<typeof FeedbackSchema> }>(
    '/assistant/advanced/feedback',
    {
      schema: { body: FeedbackSchema },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const body = request.body as { queryId: string; helpful: boolean; comment?: string };
      const { queryId, helpful, comment } = body;

      try {
        await prisma.assistantFeedback.create({
          data: {
            queryId,
            helpful,
            comment,
          },
        });

        return reply.status(201).send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to log feedback' });
      }
    }
  );

  /**
   * GET /assistant/search
   * Search help articles and features by query.
   */
  fastify.withTypeProvider<TypeBoxTypeProvider>().get<{
    Querystring: Static<typeof SearchSchema>;
  }>(
    '/assistant/search',
    {
      schema: {
        querystring: SearchSchema,
        response: {
          200: Type.Object({
            results: Type.Array(
              Type.Object({
                type: Type.String(),
                id: Type.String(),
                title: Type.String(),
                description: Type.String(),
                route: Type.Optional(Type.String()),
              })
            ),
          }),
        },
      },
      onRequest: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q, category } = request.query as { q: string; category?: string };

      try {
        const [articles, features] = await Promise.all([
          prisma.helpArticle.findMany({
            where: {
              ...(category ? { category } : {}),
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { keywords: { contains: q, mode: 'insensitive' } },
                { shortAnswer: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              title: true,
              shortAnswer: true,
              category: true,
            },
            take: 10,
          }),
          prisma.featureRegistry.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              name: true,
              description: true,
              route: true,
            },
            take: 10,
          }),
        ]);

        const results = [
          ...articles.map((a: any) => ({
            type: 'article',
            id: a.id,
            title: a.title,
            description: a.shortAnswer,
            category: a.category,
          })),
          ...features.map((f: any) => ({
            type: 'feature',
            id: f.id,
            title: f.name,
            description: f.description,
            route: f.route,
          })),
        ];

        return reply.send({ results });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Search failed' });
      }
    }
  );

  // ============================================================================
  // LIVE OPS CONTEXT — queries real platform data for AI answers
  // ============================================================================

  /**
   * GET /assistant/ops-context
   * Returns a structured snapshot of current operational state for AI context injection.
   */
  fastify.get(
    '/assistant/ops-context',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);

      try {
        // Get user's dropzone scope
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { dropzoneId: true, orgId: true },
        });
        const dzId = user?.dropzoneId;

        // Parallel queries for operational state
        const [
          activeLoads,
          todayBookings,
          expiringWaivers,
          pendingOnboarding,
          recentIncidents,
          weatherData,
          todaySlotCount,
        ] = await Promise.all([
          // Active loads (not COMPLETE or CANCELLED)
          prisma.load.findMany({
            where: {
              ...(dzId ? { dropzoneId: dzId } : {}),
              status: { notIn: ['COMPLETE', 'CANCELLED'] },
            },
            select: {
              id: true, loadNumber: true, status: true, aircraftRegistration: true,
              maxCapacity: true, scheduledAt: true,
              _count: { select: { slots: true } },
            },
            orderBy: { scheduledAt: 'asc' },
            take: 20,
          }).catch(() => []),

          // Today's bookings
          prisma.booking.count({
            where: {
              ...(dzId ? { dropzoneId: dzId } : {}),
              scheduledDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          }).catch(() => 0),

          // Waivers expiring within 7 days
          prisma.waiverSubmission.count({
            where: {
              status: 'SIGNED',
              expiresAt: {
                gte: new Date(),
                lte: new Date(Date.now() + 7 * 86400000),
              },
            },
          }).catch(() => 0),

          // Pending onboarding applications
          prisma.onboardingApplication.count({
            where: {
              ...(dzId ? { dropzoneId: dzId } : {}),
              status: 'SUBMITTED',
            },
          }).catch(() => 0),

          // Recent incidents (last 7 days)
          prisma.incident.count({
            where: {
              createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
          }).catch(() => 0),

          // Latest weather
          prisma.weatherData.findFirst({
            where: dzId ? { dropzoneId: dzId } : {},
            orderBy: { recordedAt: 'desc' },
            select: {
              windSpeed: true, windGust: true, windDirection: true,
              temperature: true, cloudBase: true, visibility: true,
              recordedAt: true,
            },
          }).catch(() => null),

          // Today's completed jumps
          prisma.slot.count({
            where: {
              load: {
                ...(dzId ? { dropzoneId: dzId } : {}),
                status: 'COMPLETE',
                completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            },
          }).catch(() => 0),
        ]);

        // Compute derived insights
        const underfilled = (activeLoads as any[]).filter(
          (l: any) => l._count.slots < (l.maxCapacity || 14) * 0.5 && ['FILLING', 'OPEN'].includes(l.status)
        );

        const context = {
          activeLoads: (activeLoads as any[]).map((l: any) => ({
            id: l.loadNumber || l.id,
            status: l.status,
            aircraft: l.aircraftRegistration,
            filled: l._count.slots,
            capacity: l.maxCapacity,
            scheduled: l.scheduledAt,
          })),
          underfillCount: underfilled.length,
          todayBookings,
          expiringWaivers,
          pendingOnboarding,
          recentIncidents,
          todayJumps: todaySlotCount,
          weather: weatherData ? {
            wind: `${(weatherData as any).windSpeed || 0}kt` + ((weatherData as any).windGust ? ` gusting ${(weatherData as any).windGust}kt` : ''),
            temp: (weatherData as any).temperature,
            cloudBase: (weatherData as any).cloudBase,
            visibility: (weatherData as any).visibility,
            recordedAt: (weatherData as any).recordedAt,
          } : null,
          summary: `${(activeLoads as any[]).length} active loads (${underfilled.length} underfilled), ${todayBookings} bookings today, ${todaySlotCount} jumps completed, ${expiringWaivers} waivers expiring soon, ${pendingOnboarding} pending onboarding, ${recentIncidents} incidents this week`,
        };

        return reply.send({ success: true, data: context });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch ops context' });
      }
    }
  );

  // ============================================================================
  // RECOMMENDATIONS ENGINE — generates actionable ops recommendations
  // ============================================================================

  /**
   * GET /assistant/recommendations
   * Returns AI-generated operational recommendations based on current platform state.
   */
  fastify.get(
    '/assistant/recommendations',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { dropzoneId: true, orgId: true },
        });
        const dzId = user?.dropzoneId;

        // Fetch persisted recommendations
        const persisted = await prisma.assistantRecommendation.findMany({
          where: {
            ...(dzId ? { dropzoneId: dzId } : {}),
            status: 'PENDING',
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        // Also generate live recommendations from current state
        const liveRecs: any[] = [];

        // Check for expiring waivers
        const expiringWaivers = await prisma.waiverSubmission.findMany({
          where: {
            status: 'SIGNED',
            expiresAt: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 86400000),
            },
          },
          select: { id: true, participantName: true, expiresAt: true },
          take: 10,
        }).catch(() => []);

        if ((expiringWaivers as any[]).length > 0) {
          liveRecs.push({
            id: `live_waiver_${Date.now()}`,
            type: 'SEND_REMINDER',
            title: `${(expiringWaivers as any[]).length} waivers expiring soon`,
            description: `${(expiringWaivers as any[]).map((w: any) => w.participantName).slice(0, 3).join(', ')}${(expiringWaivers as any[]).length > 3 ? ` and ${(expiringWaivers as any[]).length - 3} more` : ''} have waivers expiring within 7 days.`,
            priority: 'HIGH',
            status: 'PENDING',
            category: 'compliance',
            actionLabel: 'Send Reminders',
            actionRoute: '/dashboard/waivers',
            createdAt: new Date().toISOString(),
          });
        }

        // Check for underfilled loads
        const underfilled = await prisma.load.findMany({
          where: {
            ...(dzId ? { dropzoneId: dzId } : {}),
            status: { in: ['FILLING', 'OPEN'] },
          },
          select: {
            id: true, loadNumber: true, maxCapacity: true, aircraftRegistration: true,
            _count: { select: { slots: true } },
          },
        }).catch(() => []);

        const underfilledLoads = (underfilled as any[]).filter(
          (l: any) => l._count.slots < (l.maxCapacity || 14) * 0.5
        );

        if (underfilledLoads.length > 0) {
          liveRecs.push({
            id: `live_underfill_${Date.now()}`,
            type: 'FOLLOW_UP',
            title: `${underfilledLoads.length} underfilled loads`,
            description: underfilledLoads.map((l: any) =>
              `Load ${l.loadNumber || l.id} (${l.aircraftRegistration}): ${l._count.slots}/${l.maxCapacity} filled`
            ).join('. '),
            priority: 'MEDIUM',
            status: 'PENDING',
            category: 'manifest',
            actionLabel: 'View Manifest',
            actionRoute: '/dashboard/manifest',
            createdAt: new Date().toISOString(),
          });
        }

        // Check for pending onboarding
        const pendingApps = await prisma.onboardingApplication.findMany({
          where: {
            ...(dzId ? { dropzoneId: dzId } : {}),
            status: 'SUBMITTED',
          },
          select: { id: true, createdAt: true },
          take: 5,
        }).catch(() => []);

        if ((pendingApps as any[]).length > 0) {
          liveRecs.push({
            id: `live_onboarding_${Date.now()}`,
            type: 'ESCALATE',
            title: `${(pendingApps as any[]).length} onboarding applications awaiting review`,
            description: 'Applications are waiting for approval. Review them to unblock new athletes.',
            priority: 'MEDIUM',
            status: 'PENDING',
            category: 'onboarding',
            actionLabel: 'Review Applications',
            actionRoute: '/dashboard/admin/onboarding/dropzones',
            createdAt: new Date().toISOString(),
          });
        }

        // Merge persisted + live
        const allRecs = [
          ...liveRecs,
          ...persisted.map((r: any) => ({
            id: String(r.id),
            type: r.type,
            title: r.title,
            description: r.description,
            priority: r.priority,
            status: r.status,
            category: r.type?.toLowerCase() || 'general',
            actionLabel: 'View',
            actionRoute: '/dashboard/ai/recommendations',
            createdAt: r.createdAt.toISOString(),
          })),
        ];

        return reply.send({ success: true, data: allRecs });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to generate recommendations' });
      }
    }
  );

  /**
   * POST /assistant/recommendations/:id/action
   * Accept, dismiss, or act on a recommendation.
   */
  fastify.post<{
    Params: { id: string };
    Body: { action: string; reason?: string; editedPayload?: any };
  }>(
    '/assistant/recommendations/:id/action',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { action, reason, editedPayload } = request.body as {
        action: string; reason?: string; editedPayload?: any;
      };
      const userId = parseInt(request.user.sub);

      const numId = parseInt(id);
      if (isNaN(numId)) {
        return reply.status(400).send({ success: false, error: 'Invalid recommendation ID' });
      }

      const statusMap: Record<string, string> = {
        accept: 'ACCEPTED',
        reject: 'REJECTED',
        edit: 'EDITED',
        dismiss: 'DISMISSED',
      };

      const newStatus = statusMap[action];
      if (!newStatus) {
        return reply.status(400).send({
          success: false,
          error: `Invalid action "${action}". Use: accept, reject, edit, dismiss`,
        });
      }

      // Reject requires a reason
      if (action === 'reject' && !reason) {
        return reply.status(400).send({
          success: false,
          error: 'Reason is required when rejecting a recommendation',
        });
      }

      // Edit requires editedPayload
      if (action === 'edit' && !editedPayload) {
        return reply.status(400).send({
          success: false,
          error: 'editedPayload is required when editing a recommendation',
        });
      }

      try {
        const existing = await prisma.assistantRecommendation.findUnique({
          where: { id: numId },
        });

        if (!existing) {
          return reply.status(404).send({ success: false, error: 'Recommendation not found' });
        }

        if (existing.status !== 'PENDING') {
          return reply.status(409).send({
            success: false,
            error: `Recommendation already ${existing.status} — cannot ${action}`,
          });
        }

        const updated = await prisma.assistantRecommendation.update({
          where: { id: numId },
          data: {
            status: newStatus as any,
            actionTakenAt: new Date(),
            actionByUserId: userId,
            actionReason: reason ?? null,
            editedPayload: action === 'edit' ? editedPayload : undefined,
          } as any,
        });

        // Audit trail
        await prisma.auditLog.create({
          data: {
            userId,
            dropzoneId: existing.dropzoneId,
            action: 'UPDATE' as any,
            entityType: 'AssistantRecommendation',
            entityId: numId,
            beforeState: { status: existing.status },
            afterState: { status: newStatus, action, reason },
            checksum: 'pending',
          },
        });

        return reply.send({ success: true, data: updated });
      } catch (error) {
        return reply.status(500).send({ success: false, error: 'Failed to update recommendation' });
      }
    }
  );

  // ============================================================================
  // PREDICTION ENGINE — heuristic-based operational predictions
  // ============================================================================

  /**
   * GET /assistant/predictions
   * Returns prediction scores for current operational state.
   * Includes no-show risk, delay risk, and bottleneck detection.
   */
  fastify.get(
    '/assistant/predictions',
    { onRequest: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const dzId = parseInt(request.user.dropzoneId || '0') || 1;

        const { PredictionEngine } = await import('../services/predictionEngine');
        const engine = new PredictionEngine(prisma);

        // Run bottleneck detection
        const bottlenecks = await engine.detectBottlenecks(dzId);

        // Get active load delay predictions
        const activeLoads = await prisma.load.findMany({
          where: {
            dropzoneId: dzId,
            status: { notIn: ['COMPLETE', 'CANCELLED'] },
          },
          select: { id: true },
          take: 10,
        }).catch(() => []);

        const delayPredictions = await Promise.all(
          (activeLoads as any[]).slice(0, 5).map((l: any) => engine.predictLoadDelay(l.id, dzId))
        );

        // Get no-show predictions for manifested users
        const manifestedUsers = await prisma.slot.findMany({
          where: {
            load: {
              dropzoneId: dzId,
              status: { in: ['FILLING', 'LOCKED', 'OPEN'] },
            },
          },
          select: { userId: true },
          distinct: ['userId'],
          take: 20,
        }).catch(() => []);

        const noShowPredictions = await Promise.all(
          (manifestedUsers as any[]).slice(0, 10).map((s: any) => engine.predictNoShow(s.userId, dzId))
        );

        // Filter to only significant predictions (score >= 20)
        const allPredictions = [
          ...bottlenecks,
          ...delayPredictions.filter(p => p.score >= 20),
          ...noShowPredictions.filter(p => p.score >= 25),
        ].sort((a, b) => b.score - a.score);

        return reply.send({
          success: true,
          data: {
            predictions: allPredictions,
            summary: {
              total: allPredictions.length,
              highRisk: allPredictions.filter(p => p.score >= 50).length,
              mediumRisk: allPredictions.filter(p => p.score >= 25 && p.score < 50).length,
              types: {
                noShow: noShowPredictions.filter(p => p.score >= 25).length,
                delay: delayPredictions.filter(p => p.score >= 20).length,
                bottleneck: bottlenecks.length,
              },
            },
            computedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to compute predictions' });
      }
    }
  );

  /**
   * GET /assistant/revenue-forecast
   * 7-day revenue forecast for the operator's dropzone.
   */
  fastify.get(
    '/assistant/revenue-forecast',
    { preHandler: [authenticate, authorize(['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN'])] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.user.dropzoneId || '0');
        if (!dzId) return reply.status(400).send({ success: false, error: 'dropzoneId required' });

        const { PredictionEngine } = await import('../services/predictionEngine');
        const engine = new PredictionEngine(fastify.prisma);
        const forecast = await engine.forecastRevenue(dzId);

        return reply.send({ success: true, data: forecast });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to compute forecast' });
      }
    }
  );

  /**
   * GET /assistant/churn-risk/:userId
   * Churn risk score for a specific athlete.
   */
  fastify.get<{ Params: { userId: string } }>(
    '/assistant/churn-risk/:userId',
    { preHandler: [authenticate, authorize(['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN', 'MANIFEST_STAFF'])] },
    async (request, reply) => {
      try {
        const dzId = parseInt(request.user.dropzoneId || '0');
        const userId = parseInt(request.params.userId);
        if (!dzId || !userId) return reply.status(400).send({ success: false, error: 'Invalid parameters' });

        const { PredictionEngine } = await import('../services/predictionEngine');
        const engine = new PredictionEngine(fastify.prisma);
        const risk = await engine.predictChurnRisk(userId, dzId);

        return reply.send({ success: true, data: risk });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to compute churn risk' });
      }
    }
  );
}
