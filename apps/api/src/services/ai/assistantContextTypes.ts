/**
 * Types for portal assistant context assembly (KB matches + ops snapshot).
 * Keeps PCI boundaries: no payment fields; matches are help/feature metadata only.
 */

export interface AssistantKnowledgeMatch {
  type: 'article' | 'feature';
  score?: number;
  id?: string | number;
  title?: string;
  name?: string;
  keywords?: string | null;
  shortAnswer?: string | null;
  detailedSteps?: string | null;
  category?: string | null;
  description?: string | null;
  route?: string | null;
  requiredRoles?: string | null;
}
