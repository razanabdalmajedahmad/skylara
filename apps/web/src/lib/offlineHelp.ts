/**
 * PHASE 5: OFFLINE HELP SUPPORT
 * Search and cache help articles + feature registry for offline access
 * Fetches from API on first load (online), stores in IndexedDB
 */

import { getDb } from './offlineStore';

/**
 * Help article structure
 */
export interface HelpArticle {
  slug: string;
  category: string;
  title: string;
  shortAnswer: string;
  detailedSteps: string[];
  rolesAllowed: string[];
  routeReference: string;
  relatedActions: string[];
  keywords: string[];
  module: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Feature registry entry
 */
export interface FeatureRegistryEntry {
  id: string;
  name: string;
  status: 'available' | 'coming-soon' | 'not-available';
  description: string;
  category: string;
  releasedAt?: string;
  eta?: string;
  tags: string[];
  module: string;
}

/**
 * Initialize help article cache from API
 * Fetches all help articles and feature registry on first load (online)
 * Stores in IndexedDB for offline access
 */
export async function initializeHelpCache(): Promise<void> {
  const db = await getDb();

  // Check if cache already exists
  const existingArticles = await db.getAll('helpArticles');
  if (existingArticles && existingArticles.length > 0) {
    return; // Cache already initialized
  }

  try {
    // Fetch help articles from API
    const articlesResponse = await fetch('/api/help/articles');
    const features = await fetch('/api/help/features');

    if (articlesResponse.ok && features.ok) {
      const articles: HelpArticle[] = await articlesResponse.json();
      const featureRegistry: FeatureRegistryEntry[] = await features.json();

      // Bulk put articles
      const tx = db.transaction('helpArticles', 'readwrite');
      for (const article of articles) {
        await tx.store.put({ ...article, createdAt: Date.now() });
      }
      await tx.done;

      // Bulk put features
      const featureTx = db.transaction('featureRegistry', 'readwrite');
      for (const feature of featureRegistry) {
        await featureTx.store.put(feature);
      }
      await featureTx.done;
    }
  } catch (error) {
    console.error('Failed to initialize help cache:', error);
    // Offline mode: cache initialization will retry when online
  }
}

/**
 * Search offline help articles by query
 * Searches title, keywords, and category
 */
export async function searchOfflineHelp(query: string): Promise<HelpArticle[]> {
  const db = await getDb();
  const allArticles = await db.getAll('helpArticles');

  if (!allArticles || allArticles.length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase();
  return allArticles.filter((article) => {
    const titleMatch = article.title.toLowerCase().includes(queryLower);
    const keywordMatch = article.keywords.some((kw) =>
      kw.toLowerCase().includes(queryLower)
    );
    const categoryMatch = article.category.toLowerCase().includes(queryLower);

    return titleMatch || keywordMatch || categoryMatch;
  });
}

/**
 * Lookup offline feature by name
 */
export async function lookupOfflineFeature(
  name: string
): Promise<FeatureRegistryEntry | undefined> {
  const db = await getDb();
  const allFeatures = await db.getAll('featureRegistry');

  if (!allFeatures || allFeatures.length === 0) {
    return undefined;
  }

  const nameLower = name.toLowerCase();
  return allFeatures.find(
    (feature) => feature.name.toLowerCase() === nameLower
  );
}

/**
 * Get all features in a specific category
 */
export async function getOfflineFeaturesByCategory(
  category: string
): Promise<FeatureRegistryEntry[]> {
  const db = await getDb();
  const allFeatures = await db.getAll('featureRegistry');

  if (!allFeatures || allFeatures.length === 0) {
    return [];
  }

  const categoryLower = category.toLowerCase();
  return allFeatures.filter(
    (feature) => feature.category.toLowerCase() === categoryLower
  );
}

/**
 * Get all help articles in a specific category
 */
export async function getOfflineHelpByCategory(
  category: string
): Promise<HelpArticle[]> {
  const db = await getDb();
  const allArticles = await db.getAll('helpArticles');

  if (!allArticles || allArticles.length === 0) {
    return [];
  }

  const categoryLower = category.toLowerCase();
  return allArticles.filter(
    (article) => article.category.toLowerCase() === categoryLower
  );
}

/**
 * Get single help article by slug
 */
export async function getOfflineHelpArticle(
  slug: string
): Promise<HelpArticle | undefined> {
  const db = await getDb();
  return db.get('helpArticles', slug);
}

/**
 * Check if help data is cached
 */
export async function isHelpCached(): Promise<boolean> {
  const db = await getDb();
  const count = await db.count('helpArticles');
  return count > 0;
}

/**
 * Get cache status
 */
export async function getHelpCacheStatus(): Promise<{
  isCached: boolean;
  articleCount: number;
  featureCount: number;
  lastUpdated?: number;
}> {
  const db = await getDb();
  const articleCount = await db.count('helpArticles');
  const featureCount = await db.count('featureRegistry');

  // Get last article for timestamp
  const lastArticle = (await db.getAll('helpArticles', undefined, 1)) as any;
  const lastUpdated = lastArticle?.[0]?.updatedAt;

  return {
    isCached: articleCount > 0,
    articleCount,
    featureCount,
    lastUpdated,
  };
}

/**
 * Refresh help cache by fetching latest from API
 */
export async function refreshHelpCache(): Promise<void> {
  const db = await getDb();

  try {
    // Clear existing cache
    await db.clear('helpArticles');
    await db.clear('featureRegistry');

    // Fetch fresh data
    const articlesResponse = await fetch('/api/help/articles');
    const featuresResponse = await fetch('/api/help/features');

    if (articlesResponse.ok && featuresResponse.ok) {
      const articles: HelpArticle[] = await articlesResponse.json();
      const features: FeatureRegistryEntry[] = await featuresResponse.json();

      // Bulk put articles
      const tx = db.transaction('helpArticles', 'readwrite');
      for (const article of articles) {
        await tx.store.put({
          ...article,
          updatedAt: Date.now(),
        });
      }
      await tx.done;

      // Bulk put features
      const featureTx = db.transaction('featureRegistry', 'readwrite');
      for (const feature of features) {
        await featureTx.store.put(feature);
      }
      await featureTx.done;
    }
  } catch (error) {
    console.error('Failed to refresh help cache:', error);
    throw error;
  }
}

/**
 * Get help articles by role
 */
export async function getOfflineHelpByRole(
  role: string
): Promise<HelpArticle[]> {
  const db = await getDb();
  const allArticles = await db.getAll('helpArticles');

  if (!allArticles || allArticles.length === 0) {
    return [];
  }

  return allArticles.filter((article) =>
    article.rolesAllowed.includes(role)
  );
}

/**
 * Get related help articles
 */
export async function getRelatedHelp(
  articleSlug: string
): Promise<HelpArticle[]> {
  const db = await getDb();
  const article = await db.get('helpArticles', articleSlug);

  if (!article || !article.relatedActions) {
    return [];
  }

  const allArticles = await db.getAll('helpArticles');
  return allArticles.filter((a) =>
    article.relatedActions.includes(a.slug)
  );
}
