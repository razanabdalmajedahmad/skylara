/**
 * PHASE 5: OFFLINE HELP STORE
 * Extended IndexedDB schema for help articles and feature registry
 * Manages two new object stores: helpArticles and featureRegistry
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { HelpArticle, FeatureRegistryEntry } from './offlineHelp';

export interface HelpODBSchema extends DBSchema {
  helpArticles: {
    key: string;
    value: HelpArticle;
    indexes: {
      'by-category': string;
      'by-module': string;
      'by-updated': number;
    };
  };
  featureRegistry: {
    key: string;
    value: FeatureRegistryEntry;
    indexes: {
      'by-status': string;
      'by-category': string;
      'by-module': string;
    };
  };
}

let helpDb: IDBPDatabase<HelpODBSchema> | null = null;

/**
 * Initialize the help database
 */
export async function initializeHelpStore(): Promise<IDBPDatabase<HelpODBSchema>> {
  if (helpDb) return helpDb;

  helpDb = await openDB<HelpODBSchema>('skylara_help', 1, {
    upgrade(upgradeDb) {
      // Create helpArticles store
      if (!upgradeDb.objectStoreNames.contains('helpArticles')) {
        const articlesStore = upgradeDb.createObjectStore('helpArticles', {
          keyPath: 'slug',
        });
        articlesStore.createIndex('by-category', 'category');
        articlesStore.createIndex('by-module', 'module');
        articlesStore.createIndex('by-updated', 'updatedAt');
      }

      // Create featureRegistry store
      if (!upgradeDb.objectStoreNames.contains('featureRegistry')) {
        const featuresStore = upgradeDb.createObjectStore('featureRegistry', {
          keyPath: 'id',
        });
        featuresStore.createIndex('by-status', 'status');
        featuresStore.createIndex('by-category', 'category');
        featuresStore.createIndex('by-module', 'module');
      }
    },
  });

  return helpDb;
}

export async function getHelpDb(): Promise<IDBPDatabase<HelpODBSchema>> {
  return helpDb || initializeHelpStore();
}

/**
 * Help articles store
 */
export const helpArticlesStore = {
  async getAll() {
    const db = await getHelpDb();
    return db.getAll('helpArticles');
  },

  async getBySlug(slug: string) {
    const db = await getHelpDb();
    return db.get('helpArticles', slug);
  },

  async put(article: HelpArticle) {
    const db = await getHelpDb();
    return db.put('helpArticles', {
      ...article,
      updatedAt: Date.now(),
    });
  },

  async bulkPut(articles: HelpArticle[]) {
    const db = await getHelpDb();
    const tx = db.transaction('helpArticles', 'readwrite');
    for (const article of articles) {
      await tx.store.put({
        ...article,
        createdAt: article.createdAt || Date.now(),
        updatedAt: article.updatedAt || Date.now(),
      });
    }
    await tx.done;
    return articles.length;
  },

  async delete(slug: string) {
    const db = await getHelpDb();
    return db.delete('helpArticles', slug);
  },

  async clear() {
    const db = await getHelpDb();
    return db.clear('helpArticles');
  },

  async getByCategory(category: string) {
    const db = await getHelpDb();
    return db.getAllFromIndex('helpArticles', 'by-category', category);
  },

  async getByModule(module: string) {
    const db = await getHelpDb();
    return db.getAllFromIndex('helpArticles', 'by-module', module);
  },

  async search(query: string) {
    const db = await getHelpDb();
    const allArticles = await db.getAll('helpArticles');
    const queryLower = query.toLowerCase();

    return allArticles.filter((article) => {
      const titleMatch = article.title.toLowerCase().includes(queryLower);
      const keywordMatch = article.keywords.some((kw) =>
        kw.toLowerCase().includes(queryLower)
      );
      const contentMatch =
        article.shortAnswer.toLowerCase().includes(queryLower) ||
        article.detailedSteps.some((step) =>
          step.toLowerCase().includes(queryLower)
        );

      return titleMatch || keywordMatch || contentMatch;
    });
  },

  async count() {
    const db = await getHelpDb();
    return db.count('helpArticles');
  },
};

/**
 * Feature registry store
 */
export const featureRegistryStore = {
  async getAll() {
    const db = await getHelpDb();
    return db.getAll('featureRegistry');
  },

  async getById(id: string) {
    const db = await getHelpDb();
    return db.get('featureRegistry', id);
  },

  async put(feature: FeatureRegistryEntry) {
    const db = await getHelpDb();
    return db.put('featureRegistry', feature);
  },

  async bulkPut(features: FeatureRegistryEntry[]) {
    const db = await getHelpDb();
    const tx = db.transaction('featureRegistry', 'readwrite');
    for (const feature of features) {
      await tx.store.put(feature);
    }
    await tx.done;
    return features.length;
  },

  async delete(id: string) {
    const db = await getHelpDb();
    return db.delete('featureRegistry', id);
  },

  async clear() {
    const db = await getHelpDb();
    return db.clear('featureRegistry');
  },

  async getByStatus(status: 'available' | 'coming-soon' | 'not-available') {
    const db = await getHelpDb();
    return db.getAllFromIndex('featureRegistry', 'by-status', status);
  },

  async getByCategory(category: string) {
    const db = await getHelpDb();
    return db.getAllFromIndex('featureRegistry', 'by-category', category);
  },

  async getByModule(module: string) {
    const db = await getHelpDb();
    return db.getAllFromIndex('featureRegistry', 'by-module', module);
  },

  async getAvailable() {
    return this.getByStatus('available');
  },

  async getComingSoon() {
    return this.getByStatus('coming-soon');
  },

  async getNotAvailable() {
    return this.getByStatus('not-available');
  },

  async search(query: string) {
    const db = await getHelpDb();
    const allFeatures = await db.getAll('featureRegistry');
    const queryLower = query.toLowerCase();

    return allFeatures.filter((feature) => {
      const nameMatch = feature.name.toLowerCase().includes(queryLower);
      const descMatch = feature.description.toLowerCase().includes(queryLower);
      const tagMatch = feature.tags.some((tag) =>
        tag.toLowerCase().includes(queryLower)
      );

      return nameMatch || descMatch || tagMatch;
    });
  },

  async count() {
    const db = await getHelpDb();
    return db.count('featureRegistry');
  },
};
