import { PrismaClient } from "@prisma/client";

// ============================================================================
// POLICY ENGINE — Hierarchical rules resolution (Expert Feedback §3)
// ============================================================================
//
// Resolution order (most specific wins):
//   OPERATIONAL_DAY(branch+date) → BRANCH → DROPZONE → ORGANIZATION → PLATFORM default
//
// Every write creates a PolicyAuditLog entry.
// Hot-path reads use an in-memory cache with 60s TTL.
// ============================================================================

interface PolicyContext {
  organizationId?: number;
  dropzoneId?: number;
  branchId?: number;
  date?: string; // YYYY-MM-DD for operational-day overrides
}

interface ResolvedPolicy {
  key: string;
  value: any;
  resolvedScope: string; // which level provided the value
  definitionId: number;
}

interface CacheEntry {
  value: any;
  resolvedScope: string;
  definitionId: number;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

export class PolicyEngine {
  private cache = new Map<string, CacheEntry>();

  constructor(private prisma: PrismaClient) {}

  // ── RESOLVE (hot path) ──────────────────────────────────────────────

  /**
   * Resolve a single policy key for a given context.
   * Walks: operational-day → branch → dropzone → org → platform default.
   */
  async resolvePolicy(key: string, context: PolicyContext): Promise<ResolvedPolicy> {
    const cacheKey = this.buildCacheKey(key, context);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { key, value: cached.value, resolvedScope: cached.resolvedScope, definitionId: cached.definitionId };
    }

    // Fetch definition
    const def = await (this.prisma as any).policyDefinition.findFirst({
      where: { key },
    });
    if (!def) {
      return { key, value: null, resolvedScope: "NOT_FOUND", definitionId: 0 };
    }

    // Fetch all applicable values ordered by specificity
    const values = await (this.prisma as any).policyValue.findMany({
      where: {
        definitionId: def.id,
        isActive: true,
        OR: this.buildScopeFilters(context),
      },
      orderBy: { createdAt: "desc" },
    });

    // Walk hierarchy: most specific wins
    const scopes = ["OPERATIONAL_DAY", "BRANCH", "DROPZONE", "ORGANIZATION", "PLATFORM"];
    let resolved: any = def.defaultValue;
    let resolvedScope = "PLATFORM";

    for (const scope of scopes) {
      const match = values.find((v: any) => v.scope === scope);
      if (match) {
        // Check effectiveUntil for expiry
        if (match.effectiveUntil && new Date(match.effectiveUntil) < new Date()) continue;
        resolved = match.value;
        resolvedScope = scope;
        break;
      }
    }

    // Cache the result
    this.cache.set(cacheKey, {
      value: resolved,
      resolvedScope,
      definitionId: def.id,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return { key, value: resolved, resolvedScope, definitionId: def.id };
  }

  /**
   * Batch-resolve multiple policy keys in a single pass.
   */
  async resolvePolicies(keys: string[], context: PolicyContext): Promise<Record<string, ResolvedPolicy>> {
    const results: Record<string, ResolvedPolicy> = {};
    // Check cache first, collect misses
    const misses: string[] = [];
    for (const key of keys) {
      const cacheKey = this.buildCacheKey(key, context);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        results[key] = { key, value: cached.value, resolvedScope: cached.resolvedScope, definitionId: cached.definitionId };
      } else {
        misses.push(key);
      }
    }

    if (misses.length > 0) {
      // Fetch all definitions for misses in one query
      const defs = await (this.prisma as any).policyDefinition.findMany({
        where: { key: { in: misses } },
      });

      const defIds = defs.map((d: any) => d.id);
      const defMap = new Map<string, any>(defs.map((d: any) => [d.key, d]));

      // Fetch all values for these definitions in one query
      const allValues = defIds.length > 0 ? await (this.prisma as any).policyValue.findMany({
        where: {
          definitionId: { in: defIds },
          isActive: true,
          OR: this.buildScopeFilters(context),
        },
      }) : [];

      // Group values by definitionId
      const valuesByDef = new Map<number, any[]>();
      for (const v of allValues) {
        const existing = valuesByDef.get(v.definitionId) || [];
        existing.push(v);
        valuesByDef.set(v.definitionId, existing);
      }

      // Resolve each miss
      for (const key of misses) {
        const def = defMap.get(key);
        if (!def) {
          results[key] = { key, value: null, resolvedScope: "NOT_FOUND", definitionId: 0 };
          continue;
        }

        const values = valuesByDef.get(def.id) || [];
        const scopes = ["OPERATIONAL_DAY", "BRANCH", "DROPZONE", "ORGANIZATION", "PLATFORM"];
        let resolved = def.defaultValue;
        let resolvedScope = "PLATFORM";

        for (const scope of scopes) {
          const match = values.find((v: any) => v.scope === scope);
          if (match && (!match.effectiveUntil || new Date(match.effectiveUntil) >= new Date())) {
            resolved = match.value;
            resolvedScope = scope;
            break;
          }
        }

        results[key] = { key, value: resolved, resolvedScope, definitionId: def.id };

        // Cache
        const cacheKey = this.buildCacheKey(key, context);
        this.cache.set(cacheKey, { value: resolved, resolvedScope, definitionId: def.id, expiresAt: Date.now() + CACHE_TTL_MS });
      }
    }

    return results;
  }

  /**
   * Resolve a single policy value, returning just the value (convenience).
   * Falls back to provided default if not found.
   */
  async resolve<T>(key: string, context: PolicyContext, fallback: T): Promise<T> {
    const result = await this.resolvePolicy(key, context);
    return result.value ?? fallback;
  }

  // ── WRITE (admin path) ──────────────────────────────────────────────

  /**
   * Set a policy value at a specific scope. Creates PolicyAuditLog.
   */
  async setPolicyValue(opts: {
    key: string;
    scope: string;
    organizationId?: number;
    dropzoneId?: number;
    branchId?: number;
    operationalDate?: string;
    value: any;
    userId: number;
    reason?: string;
  }): Promise<any> {
    const def = await (this.prisma as any).policyDefinition.findFirst({
      where: { key: opts.key },
    });
    if (!def) throw new Error(`Policy definition not found: ${opts.key}`);

    // Find existing value at this exact scope
    const existing = await (this.prisma as any).policyValue.findFirst({
      where: {
        definitionId: def.id,
        scope: opts.scope,
        organizationId: opts.organizationId ?? null,
        dropzoneId: opts.dropzoneId ?? null,
        branchId: opts.branchId ?? null,
        operationalDate: opts.operationalDate ? new Date(opts.operationalDate) : null,
      },
    });

    const previousValue = existing?.value ?? null;

    const policyValue = existing
      ? await (this.prisma as any).policyValue.update({
          where: { id: existing.id },
          data: { value: opts.value, setById: opts.userId, reason: opts.reason },
        })
      : await (this.prisma as any).policyValue.create({
          data: {
            definitionId: def.id,
            scope: opts.scope,
            organizationId: opts.organizationId ?? null,
            dropzoneId: opts.dropzoneId ?? null,
            branchId: opts.branchId ?? null,
            operationalDate: opts.operationalDate ? new Date(opts.operationalDate) : null,
            value: opts.value,
            setById: opts.userId,
            reason: opts.reason,
          },
        });

    // Audit log
    await (this.prisma as any).policyAuditLog.create({
      data: {
        policyValueId: policyValue.id,
        definitionId: def.id,
        scope: opts.scope,
        scopeEntityId: opts.dropzoneId ?? opts.organizationId ?? opts.branchId ?? null,
        previousValue,
        newValue: opts.value,
        changedById: opts.userId,
        reason: opts.reason,
      },
    });

    // Bust cache for this key
    this.invalidateKey(opts.key);

    return policyValue;
  }

  // ── READ (admin path) ──────────────────────────────────────────────

  async listDefinitions(category?: string): Promise<any[]> {
    const where: any = {};
    if (category) where.category = category;
    return (this.prisma as any).policyDefinition.findMany({ where, orderBy: { key: "asc" } });
  }

  async listValuesAtScope(scope: string, scopeEntityId: number): Promise<any[]> {
    const where: any = { scope };
    if (scope === "ORGANIZATION") where.organizationId = scopeEntityId;
    else if (scope === "DROPZONE") where.dropzoneId = scopeEntityId;
    else if (scope === "BRANCH") where.branchId = scopeEntityId;
    return (this.prisma as any).policyValue.findMany({
      where,
      include: { definition: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getHistory(definitionId: number, limit = 50): Promise<any[]> {
    return (this.prisma as any).policyAuditLog.findMany({
      where: { definitionId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // ── CACHE HELPERS ──────────────────────────────────────────────────

  private buildCacheKey(key: string, ctx: PolicyContext): string {
    return `${key}:${ctx.organizationId ?? 0}:${ctx.dropzoneId ?? 0}:${ctx.branchId ?? 0}:${ctx.date ?? ""}`;
  }

  private invalidateKey(key: string): void {
    for (const [k] of this.cache) {
      if (k.startsWith(`${key}:`)) this.cache.delete(k);
    }
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private buildScopeFilters(ctx: PolicyContext): any[] {
    const filters: any[] = [{ scope: "PLATFORM" }];
    if (ctx.organizationId) filters.push({ scope: "ORGANIZATION", organizationId: ctx.organizationId });
    if (ctx.dropzoneId) filters.push({ scope: "DROPZONE", dropzoneId: ctx.dropzoneId });
    if (ctx.branchId) filters.push({ scope: "BRANCH", branchId: ctx.branchId });
    if (ctx.branchId && ctx.date) {
      filters.push({ scope: "OPERATIONAL_DAY", branchId: ctx.branchId, operationalDate: new Date(ctx.date) });
    }
    return filters;
  }
}
