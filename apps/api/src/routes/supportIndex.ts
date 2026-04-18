import { FastifyInstance } from "fastify";
import { helpCenterRoutes } from "./helpCenter";
import { portalAssistantRoutes } from "./portalAssistant";
import { ideasNotesRoutes } from "./ideasNotes";
import { walkthroughsRoutes } from "./walkthroughs";

/**
 * Support Layer Routes Plugin
 *
 * Registers all Phase 3 support layer routes:
 * - Help Center (public, no auth required)
 * - Portal Assistant (local knowledge base, pattern matching)
 * - Ideas & Notes (user feedback, feature requests)
 * - Walkthroughs & Tours (onboarding, contextual help)
 *
 * All routes are prefixed with /api
 */
export async function supportRoutes(fastify: FastifyInstance) {
  // Register all support-layer route plugins
  await fastify.register(helpCenterRoutes);
  await fastify.register(portalAssistantRoutes);
  await fastify.register(ideasNotesRoutes);
  await fastify.register(walkthroughsRoutes);
}
