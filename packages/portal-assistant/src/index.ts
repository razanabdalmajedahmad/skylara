import type {
  HelpArticle,
  FeatureRegistryEntry,
  KnowledgeSearchResult
} from '@skylara/knowledge-base';
import {
  searchKnowledgeBase,
  lookupFeature,
  searchFeatures,
  getFeaturesForRole
} from '@skylara/knowledge-base';

// ============================================================================
// PORTAL ASSISTANT TYPES
// ============================================================================

export interface AssistantContext {
  userRole?: string;
  currentRoute?: string;
  userId?: string;
}

export interface AssistantMessage {
  id: string;
  query: string;
  type: 'answer' | 'suggestion' | 'not-found' | 'feature-request';
  title?: string;
  content: string;
  route?: string;
  steps?: string[];
  helpArticleId?: string;
  relatedFeatures?: FeatureRegistryEntry[];
  suggestedPrompts?: string[];
  timestamp: Date;
}

export interface AIProvider {
  processWithAI(query: string, context: AssistantContext): Promise<AssistantMessage>;
}

// ============================================================================
// PATTERN-MATCHING LOGIC
// ============================================================================

interface QueryPattern {
  pattern: RegExp;
  handler: (
    match: RegExpMatchArray,
    context: AssistantContext
  ) => Promise<AssistantMessage>;
}

/**
 * Core assistant engine that processes user queries using pattern matching.
 * Falls back to "feature request" for unknown queries.
 * No external AI dependency for MVP.
 */
export async function processAssistantQuery(
  query: string,
  context: AssistantContext
): Promise<AssistantMessage> {
  const messageId = generateId();
  const normalizedQuery = query.trim().toLowerCase();

  // Pattern 1: "How do I..." questions
  const howPattern = /how\s+(?:do\s+)?i\s+(.+)\?/i;
  const howMatch = query.match(howPattern);
  if (howMatch) {
    return handleHowQuestion(messageId, query, howMatch, context);
  }

  // Pattern 2: "Where is..." or "What is..." questions
  const whereWhatPattern = /(?:where\s+is|what\s+(?:is|are))\s+(.+)\?/i;
  const whereWhatMatch = query.match(whereWhatPattern);
  if (whereWhatMatch) {
    return handleWhereWhatQuestion(messageId, query, whereWhatMatch, context);
  }

  // Pattern 3: "What permissions..." or "Who can..." questions
  const permissionPattern = /(?:what\s+permissions|who\s+can)\s+(.+)\?/i;
  const permissionMatch = query.match(permissionPattern);
  if (permissionMatch) {
    return handlePermissionQuestion(messageId, query, permissionMatch, context);
  }

  // Pattern 4: Feature lookup by name
  const featureLookup = lookupFeature(normalizedQuery);
  if (featureLookup) {
    return handleFeatureLookup(messageId, query, featureLookup, context);
  }

  // Pattern 5: Generic search across knowledge base
  const searchResults = searchKnowledgeBase(normalizedQuery, context.userRole);
  if (searchResults.articles.length > 0) {
    return handleSearchResult(messageId, query, searchResults, context);
  }

  // Pattern 6: Not found - suggest feature request
  return handleNotFound(messageId, query, context);
}

/**
 * Handle "How do I..." questions by searching for related help articles.
 */
async function handleHowQuestion(
  messageId: string,
  originalQuery: string,
  match: RegExpMatchArray,
  context: AssistantContext
): Promise<AssistantMessage> {
  const actionQuery = match[1];
  const searchResults = searchKnowledgeBase(actionQuery, context.userRole);

  if (searchResults.articles.length > 0) {
    const topArticle = searchResults.articles[0];
    return {
      id: messageId,
      query: originalQuery,
      type: 'answer',
      title: topArticle.title,
      content: topArticle.shortAnswer,
      route: topArticle.routeReference,
      steps: topArticle.detailedSteps,
      helpArticleId: topArticle.id,
      relatedFeatures: searchFeatures(actionQuery),
      suggestedPrompts: generateSuggestedPromptsForRole(context.userRole),
      timestamp: new Date()
    };
  }

  return handleNotFound(messageId, originalQuery, context);
}

/**
 * Handle "Where is..." and "What is..." questions.
 */
async function handleWhereWhatQuestion(
  messageId: string,
  originalQuery: string,
  match: RegExpMatchArray,
  context: AssistantContext
): Promise<AssistantMessage> {
  const searchTerm = match[1];
  const searchResults = searchKnowledgeBase(searchTerm, context.userRole);

  if (searchResults.articles.length > 0) {
    const topArticle = searchResults.articles[0];
    return {
      id: messageId,
      query: originalQuery,
      type: 'answer',
      title: topArticle.title,
      content: topArticle.shortAnswer,
      route: topArticle.routeReference,
      steps: topArticle.detailedSteps.slice(0, 3), // First 3 steps
      helpArticleId: topArticle.id,
      suggestedPrompts: generateSuggestedPromptsForRole(context.userRole),
      timestamp: new Date()
    };
  }

  const featureLookup = lookupFeature(searchTerm);
  if (featureLookup) {
    return handleFeatureLookup(messageId, originalQuery, featureLookup, context);
  }

  return handleNotFound(messageId, originalQuery, context);
}

/**
 * Handle role and permission questions.
 */
async function handlePermissionQuestion(
  messageId: string,
  originalQuery: string,
  match: RegExpMatchArray,
  context: AssistantContext
): Promise<AssistantMessage> {
  // Search for role/permission related articles
  const searchResults = searchKnowledgeBase('permissions role access', context.userRole);

  if (searchResults.articles.length > 0) {
    const permissionArticle = searchResults.articles.find(
      (a) => a.category === 'role-permissions'
    ) || searchResults.articles[0];

    return {
      id: messageId,
      query: originalQuery,
      type: 'answer',
      title: permissionArticle.title,
      content: permissionArticle.shortAnswer,
      route: permissionArticle.routeReference,
      steps: permissionArticle.detailedSteps,
      helpArticleId: permissionArticle.id,
      suggestedPrompts: generateSuggestedPromptsForRole(context.userRole),
      timestamp: new Date()
    };
  }

  return handleNotFound(messageId, originalQuery, context);
}

/**
 * Handle direct feature lookups.
 */
async function handleFeatureLookup(
  messageId: string,
  originalQuery: string,
  feature: FeatureRegistryEntry,
  context: AssistantContext
): Promise<AssistantMessage> {
  const helpArticle = feature.helpArticleId
    ? searchKnowledgeBase('', context.userRole).articles.find(
        (a) => a.id === feature.helpArticleId
      )
    : undefined;

  return {
    id: messageId,
    query: originalQuery,
    type: 'answer',
    title: feature.featureName,
    content:
      feature.status === 'available'
        ? feature.description
        : `${feature.description} (Status: ${feature.status})`,
    route: feature.status === 'available' ? feature.route : undefined,
    helpArticleId: helpArticle?.id,
    suggestedPrompts: generateSuggestedPromptsForRole(context.userRole),
    timestamp: new Date()
  };
}

/**
 * Handle generic search results.
 */
async function handleSearchResult(
  messageId: string,
  originalQuery: string,
  searchResults: KnowledgeSearchResult,
  context: AssistantContext
): Promise<AssistantMessage> {
  const topArticle = searchResults.articles[0];

  return {
    id: messageId,
    query: originalQuery,
    type: 'answer',
    title: topArticle.title,
    content: topArticle.shortAnswer,
    route: topArticle.routeReference,
    steps: topArticle.detailedSteps.slice(0, 4),
    helpArticleId: topArticle.id,
    relatedFeatures: searchResults.features,
    suggestedPrompts: generateSuggestedPromptsForRole(context.userRole),
    timestamp: new Date()
  };
}

/**
 * Handle queries that don't match any pattern.
 */
async function handleNotFound(
  messageId: string,
  originalQuery: string,
  context: AssistantContext
): Promise<AssistantMessage> {
  return {
    id: messageId,
    query: originalQuery,
    type: 'not-found',
    title: 'Feature Not Found',
    content:
      'This feature is not yet available in the knowledge base. Would you like to submit a feature request?',
    suggestedPrompts: generateSuggestedPromptsForRole(context.userRole),
    timestamp: new Date()
  };
}

// ============================================================================
// ROLE-BASED SUGGESTED PROMPTS (20 per role)
// ============================================================================

const ROLE_PROMPTS: Record<string, string[]> = {
  DZ_MANAGER: [
    'How do I set up a new dropzone?',
    'How do I manage staff roles?',
    'How do I view financial reports?',
    'How do I configure aircraft?',
    'How do I set up payment processing?',
    'How do I manage gear inventory?',
    'How do I view incident reports?',
    'How do I schedule loads?',
    'How do I configure waiver templates?',
    'How do I set up automated notifications?',
    'What is the manifest board?',
    'Where can I find compliance reports?',
    'Who can access the incident reporting system?',
    'How do I export data?',
    'How do I configure offline mode?',
    'What permissions does the manifest staff role have?',
    'How do I view real-time jump analytics?',
    'How do I manage weather alerts?',
    'How do I integrate with external systems?',
    'Where are the system settings?'
  ],
  MANIFEST_STAFF: [
    'How do I use the manifest board?',
    'How do I add a jumper to a load?',
    'How do I perform QR check-in?',
    'How do I lock a load?',
    'How do I assign slot types?',
    'How do I view current loads?',
    'How do I scan QR codes?',
    'How do I handle check-in issues?',
    'How do I report an incident?',
    'How do I view jumper waivers?',
    'How do I manage load boarding?',
    'How do I verify athlete bookings?',
    'How do I set exit order?',
    'What is the QR check-in process?',
    'Where do I find load assignments?',
    'How do I resolve duplicate check-ins?',
    'How do I access offline mode?',
    'What gear checks are required?',
    'How do I cancel a jumper from a load?',
    'Where is the incident reporting system?'
  ],
  COACH: [
    'How do I schedule coaching sessions?',
    'How do I view my students\' progress?',
    'How do I track jump certifications?',
    'How do I create training plans?',
    'How do I view session reports?',
    'How do I message my students?',
    'How do I manage course progression?',
    'How do I create student groups?',
    'How do I track student fees?',
    'How do I view student jump history?',
    'What coaching tools are available?',
    'How do I generate training reports?',
    'How do I set student goals?',
    'Where can I find coaching resources?',
    'How do I schedule practice jumps?',
    'How do I review student video?',
    'How do I create custom drills?',
    'How do I track student certifications?',
    'Where are student profiles?',
    'How do I manage student availability?'
  ],
  ATHLETE: [
    'How do I book a jump?',
    'How do I view my wallet balance?',
    'How do I purchase jump credits?',
    'How do I generate my QR code?',
    'How do I check in for my jump?',
    'How do I view my jump history?',
    'How do I manage my profile?',
    'How do I update my emergency contact?',
    'How do I sign waivers?',
    'How do I view available loads?',
    'What is the wallet system?',
    'Where can I find my QR code?',
    'How do I update my payment method?',
    'How do I view my jump certificate?',
    'How do I contact my coach?',
    'Where are my upcoming jumps?',
    'How do I manage my preferences?',
    'How do I view my gear assignments?',
    'What ticket packages are available?',
    'How do I report an issue?'
  ]
};

function generateSuggestedPromptsForRole(role?: string): string[] {
  if (!role || !ROLE_PROMPTS[role]) {
    // Default prompts for unknown/no role
    return [
      'How do I get started?',
      'What features are available?',
      'How do I contact support?',
      'Where can I find documentation?',
      'What is my role?'
    ];
  }

  // Shuffle and return 5 random prompts for the role
  const prompts = ROLE_PROMPTS[role];
  const shuffled = [...prompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Provider interface for future AI integration.
 * Allows swapping in an actual LLM or external AI service without changing core logic.
 *
 * Example usage:
 * ```
 * const aiProvider: AIProvider = {
 *   async processWithAI(query: string, context: AssistantContext): Promise<AssistantMessage> {
 *     const response = await openai.createChatCompletion({ ... });
 *     return parseAIResponse(response);
 *   }
 * };
 * ```
 */
export interface AIProviderInterface extends AIProvider {}

/**
 * Get all suggested prompts for a specific role.
 * Useful for UI suggestions and help discovery.
 */
export function getAllSuggestedPromptsForRole(role: string): string[] {
  return ROLE_PROMPTS[role] || [];
}

/**
 * Get available features for the current user role and suggest prompts.
 */
export function getContextualHelp(
  role: string,
  route?: string
): {
  features: FeatureRegistryEntry[];
  prompts: string[];
} {
  const features = getFeaturesForRole(role);
  const prompts = generateSuggestedPromptsForRole(role);

  return { features, prompts };
}
