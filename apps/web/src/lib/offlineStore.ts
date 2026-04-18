/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * IndexedDB wrapper using idb library for local data persistence
 * Database: skylara_local, version 1
 * Stores: loads, slots, users, gearChecks, syncOutbox, emergencyProfiles
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuid } from 'uuid';
import type { HelpArticle, FeatureRegistryEntry } from './offlineHelp';

export interface SkylODBSchema extends DBSchema {
  loads: {
    key: string;
    value: {
      id: string;
      dzId: string;
      aircraftId: string;
      status: 'OPEN' | 'FILLING' | 'LOCKED' | 'COMPLETE' | 'CANCELLED';
      slotCount: number;
      filledSlots: number;
      pilotId: string;
      estimatedExitTime?: string;
      cgPass?: boolean;
      cgData?: Record<string, unknown>;
      lastModified: number;
    };
    indexes: { 'by-dz-status': ['dzId', 'status']; 'by-modified': 'lastModified' };
  };
  slots: {
    key: string;
    value: {
      id: string;
      loadId: string;
      dzId: string;
      athleteId?: string;
      slotType: 'FUN' | 'TANDEM' | 'AFF' | 'COACH' | 'CAMERA' | 'UNASSIGNED';
      position: number;
      status: 'OPEN' | 'ASSIGNED' | 'CHECKED_IN' | 'EXITED' | 'CANCELLED';
      weight?: number;
      altitude?: number;
      lastModified: number;
    };
    indexes: { 'by-load': 'loadId'; 'by-athlete': 'athleteId'; 'by-modified': 'lastModified' };
  };
  users: {
    key: string;
    value: {
      id: string;
      dzId: string;
      email: string;
      name: string;
      roles: string[];
      waiverStatus?: 'UNSIGNED' | 'SIGNED' | 'EXPIRED';
      waiverExpiry?: string;
      jumpCount?: number;
      license?: string;
      emergencyContactId?: string;
      lastModified: number;
    };
    indexes: { 'by-dz': 'dzId'; 'by-email': 'email'; 'by-modified': 'lastModified' };
  };
  gearChecks: {
    key: string;
    value: {
      id: string;
      dzId: string;
      gearId: string;
      athleteId: string;
      checkType: 'MAIN' | 'RESERVE' | 'AAD' | 'FULL_RIG';
      status: 'PASS' | 'FAIL' | 'PENDING';
      notes?: string;
      checkedBy: string;
      checkedAt: number;
      lastModified: number;
    };
    indexes: { 'by-gear': 'gearId'; 'by-athlete': 'athleteId'; 'by-status': 'status' };
  };
  syncOutbox: {
    key: string;
    value: {
      id: string;
      idempotencyKey: string;
      entityType: string;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      payload: Record<string, unknown>;
      status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
      retryCount: number;
      lastRetryTime?: number;
      conflictData?: Record<string, unknown>;
      createdAt: number;
      lastModified: number;
    };
    indexes: { 'by-status': 'status'; 'by-idempotencyKey': 'idempotencyKey'; 'by-modified': 'lastModified' };
  };
  emergencyProfiles: {
    key: string;
    value: {
      id: string;
      dzId: string;
      athleteId: string;
      bloodType: string;
      allergies: string[];
      medications: string[];
      emergencyContacts: Array<{
        name: string;
        relationship: string;
        phone: string;
        email?: string;
      }>;
      insuranceProvider?: string;
      policyNumber?: string;
      medicalNotes?: string;
      lastModified: number;
    };
    indexes: { 'by-athlete': 'athleteId'; 'by-dz': 'dzId' };
  };
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

let db: IDBPDatabase<SkylODBSchema> | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initializeOfflineStore(): Promise<IDBPDatabase<SkylODBSchema>> {
  if (db) return db;

  db = await openDB<SkylODBSchema>('skylara_local', 1, {
    upgrade(upgradeDb) {
      if (!upgradeDb.objectStoreNames.contains('loads')) {
        const loadsStore = upgradeDb.createObjectStore('loads', { keyPath: 'id' });
        loadsStore.createIndex('by-dz-status', ['dzId', 'status']);
        loadsStore.createIndex('by-modified', 'lastModified');
      }

      if (!upgradeDb.objectStoreNames.contains('slots')) {
        const slotsStore = upgradeDb.createObjectStore('slots', { keyPath: 'id' });
        slotsStore.createIndex('by-load', 'loadId');
        slotsStore.createIndex('by-athlete', 'athleteId');
        slotsStore.createIndex('by-modified', 'lastModified');
      }

      if (!upgradeDb.objectStoreNames.contains('users')) {
        const usersStore = upgradeDb.createObjectStore('users', { keyPath: 'id' });
        usersStore.createIndex('by-dz', 'dzId');
        usersStore.createIndex('by-email', 'email');
        usersStore.createIndex('by-modified', 'lastModified');
      }

      if (!upgradeDb.objectStoreNames.contains('gearChecks')) {
        const gearChecksStore = upgradeDb.createObjectStore('gearChecks', { keyPath: 'id' });
        gearChecksStore.createIndex('by-gear', 'gearId');
        gearChecksStore.createIndex('by-athlete', 'athleteId');
        gearChecksStore.createIndex('by-status', 'status');
      }

      if (!upgradeDb.objectStoreNames.contains('syncOutbox')) {
        const outboxStore = upgradeDb.createObjectStore('syncOutbox', { keyPath: 'id' });
        outboxStore.createIndex('by-status', 'status');
        outboxStore.createIndex('by-idempotencyKey', 'idempotencyKey');
        outboxStore.createIndex('by-modified', 'lastModified');
      }

      if (!upgradeDb.objectStoreNames.contains('emergencyProfiles')) {
        const emergencyStore = upgradeDb.createObjectStore('emergencyProfiles', { keyPath: 'id' });
        emergencyStore.createIndex('by-athlete', 'athleteId');
        emergencyStore.createIndex('by-dz', 'dzId');
      }

      if (!upgradeDb.objectStoreNames.contains('helpArticles')) {
        const articlesStore = upgradeDb.createObjectStore('helpArticles', { keyPath: 'slug' });
        articlesStore.createIndex('by-category', 'category');
        articlesStore.createIndex('by-module', 'module');
        articlesStore.createIndex('by-updated', 'updatedAt');
      }

      if (!upgradeDb.objectStoreNames.contains('featureRegistry')) {
        const featuresStore = upgradeDb.createObjectStore('featureRegistry', { keyPath: 'id' });
        featuresStore.createIndex('by-status', 'status');
        featuresStore.createIndex('by-category', 'category');
        featuresStore.createIndex('by-module', 'module');
      }
    },
  });

  return db;
}

export async function getDb(): Promise<IDBPDatabase<SkylODBSchema>> {
  return db || initializeOfflineStore();
}

export const loadsStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('loads');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('loads', id);
  },
  async put(load: SkylODBSchema['loads']['value']) {
    const database = await getDb();
    return database.put('loads', { ...load, lastModified: Date.now() });
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('loads', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('loads');
  },
  async getByDzAndStatus(dzId: string, status: string) {
    const database = await getDb();
    return database.getAllFromIndex('loads', 'by-dz-status', [dzId, status] as any);
  },
};

export const slotsStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('slots');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('slots', id);
  },
  async put(slot: SkylODBSchema['slots']['value']) {
    const database = await getDb();
    return database.put('slots', { ...slot, lastModified: Date.now() });
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('slots', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('slots');
  },
  async getByLoad(loadId: string) {
    const database = await getDb();
    return database.getAllFromIndex('slots', 'by-load', loadId as any);
  },
  async getByAthlete(athleteId: string) {
    const database = await getDb();
    return database.getAllFromIndex('slots', 'by-athlete', athleteId as any);
  },
};

export const usersStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('users');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('users', id);
  },
  async put(user: SkylODBSchema['users']['value']) {
    const database = await getDb();
    return database.put('users', { ...user, lastModified: Date.now() });
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('users', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('users');
  },
  async getByDz(dzId: string) {
    const database = await getDb();
    return database.getAllFromIndex('users', 'by-dz', dzId as any);
  },
  async getByEmail(email: string) {
    const database = await getDb();
    return database.getFromIndex('users', 'by-email', email as any);
  },
};

export const gearChecksStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('gearChecks');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('gearChecks', id);
  },
  async put(gearCheck: SkylODBSchema['gearChecks']['value']) {
    const database = await getDb();
    return database.put('gearChecks', { ...gearCheck, lastModified: Date.now() });
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('gearChecks', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('gearChecks');
  },
  async getByGear(gearId: string) {
    const database = await getDb();
    return database.getAllFromIndex('gearChecks', 'by-gear', gearId as any);
  },
  async getByAthlete(athleteId: string) {
    const database = await getDb();
    return database.getAllFromIndex('gearChecks', 'by-athlete', athleteId as any);
  },
  async getByStatus(status: string) {
    const database = await getDb();
    return database.getAllFromIndex('gearChecks', 'by-status', status as any);
  },
};

export const syncOutboxStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('syncOutbox');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('syncOutbox', id);
  },
  async put(item: SkylODBSchema['syncOutbox']['value']) {
    const database = await getDb();
    return database.put('syncOutbox', { ...item, lastModified: Date.now() });
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('syncOutbox', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('syncOutbox');
  },
  async getByStatus(status: string) {
    const database = await getDb();
    return database.getAllFromIndex('syncOutbox', 'by-status', status as any);
  },
  async getByIdempotencyKey(key: string) {
    const database = await getDb();
    return database.getFromIndex('syncOutbox', 'by-idempotencyKey', key as any);
  },
  async getPending() {
    return this.getByStatus('PENDING');
  },
};

export const emergencyProfilesStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('emergencyProfiles');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('emergencyProfiles', id);
  },
  async put(profile: SkylODBSchema['emergencyProfiles']['value']) {
    const database = await getDb();
    return database.put('emergencyProfiles', { ...profile, lastModified: Date.now() });
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('emergencyProfiles', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('emergencyProfiles');
  },
  async getByAthlete(athleteId: string) {
    const database = await getDb();
    return database.getFromIndex('emergencyProfiles', 'by-athlete', athleteId as any);
  },
  async getByDz(dzId: string) {
    const database = await getDb();
    return database.getAllFromIndex('emergencyProfiles', 'by-dz', dzId as any);
  },
};

export const helpArticlesStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('helpArticles');
  },
  async getBySlug(slug: string) {
    const database = await getDb();
    return database.get('helpArticles', slug);
  },
  async put(article: SkylODBSchema['helpArticles']['value']) {
    const database = await getDb();
    return database.put('helpArticles', { ...article, updatedAt: Date.now() });
  },
  async bulkPut(articles: SkylODBSchema['helpArticles']['value'][]) {
    const database = await getDb();
    const tx = database.transaction('helpArticles', 'readwrite');
    for (const article of articles) {
      await tx.store.put({ ...article, updatedAt: Date.now() });
    }
    await tx.done;
    return articles.length;
  },
  async delete(slug: string) {
    const database = await getDb();
    return database.delete('helpArticles', slug);
  },
  async clear() {
    const database = await getDb();
    return database.clear('helpArticles');
  },
  async getByCategory(category: string) {
    const database = await getDb();
    return database.getAllFromIndex('helpArticles', 'by-category', category as any);
  },
  async getByModule(module: string) {
    const database = await getDb();
    return database.getAllFromIndex('helpArticles', 'by-module', module as any);
  },
  async count() {
    const database = await getDb();
    return database.count('helpArticles');
  },
};

export const featureRegistryStore = {
  async getAll() {
    const database = await getDb();
    return database.getAll('featureRegistry');
  },
  async getById(id: string) {
    const database = await getDb();
    return database.get('featureRegistry', id);
  },
  async put(feature: SkylODBSchema['featureRegistry']['value']) {
    const database = await getDb();
    return database.put('featureRegistry', feature);
  },
  async bulkPut(features: SkylODBSchema['featureRegistry']['value'][]) {
    const database = await getDb();
    const tx = database.transaction('featureRegistry', 'readwrite');
    for (const feature of features) {
      await tx.store.put(feature);
    }
    await tx.done;
    return features.length;
  },
  async delete(id: string) {
    const database = await getDb();
    return database.delete('featureRegistry', id);
  },
  async clear() {
    const database = await getDb();
    return database.clear('featureRegistry');
  },
  async getByStatus(status: 'available' | 'coming-soon' | 'not-available') {
    const database = await getDb();
    return database.getAllFromIndex('featureRegistry', 'by-status', status as any);
  },
  async getByCategory(category: string) {
    const database = await getDb();
    return database.getAllFromIndex('featureRegistry', 'by-category', category as any);
  },
  async getByModule(module: string) {
    const database = await getDb();
    return database.getAllFromIndex('featureRegistry', 'by-module', module as any);
  },
  async count() {
    const database = await getDb();
    return database.count('featureRegistry');
  },
};
