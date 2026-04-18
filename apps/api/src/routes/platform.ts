import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

// ============================================================================
// PLATFORM HIERARCHY ROUTES
// Region → Organization → Facility CRUD + Hierarchy Navigation
// Protected: PLATFORM_ADMIN, REGION_ADMIN, FACILITY_MANAGER
// ============================================================================

/** Create SHA-256 checksum for audit log entry */
function auditChecksum(payload: any): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Write an audit log row — non-blocking, never breaks caller on failure */
async function writeAudit(
  prisma: any,
  opts: {
    userId: number;
    dropzoneId?: number;
    regionId?: number;
    facilityId?: number;
    action: string;
    entityType: string;
    entityId: number;
    afterState?: any;
  }
) {
  const afterState = opts.afterState ?? {};
  const checksum = auditChecksum({ ...opts, afterState });
  await prisma.auditLog
    .create({
      data: {
        userId: opts.userId,
        dropzoneId: opts.dropzoneId ?? null,
        regionId: opts.regionId ?? null,
        facilityId: opts.facilityId ?? null,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        afterState,
        checksum,
      },
    })
    .catch(() => {});
}

export async function platformRoutes(fastify: FastifyInstance) {

  // ── REGION CRUD ──────────────────────────────────────────────────────

  // GET /platform/regions — list all regions (with optional parent filter)
  fastify.get(
    "/platform/regions",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { parentId, countryCode, status } = request.query as {
        parentId?: string;
        countryCode?: string;
        status?: string;
      };

      const where: any = {};
      if (parentId === "null" || parentId === "root") {
        where.parentRegionId = null;
      } else if (parentId) {
        where.parentRegionId = parseInt(parentId);
      }
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;

      const regions = await fastify.prisma.region.findMany({
        where,
        include: {
          childRegions: { select: { id: true, name: true, slug: true, countryCode: true, status: true } },
          _count: { select: { facilities: true } },
        },
        orderBy: { name: "asc" },
      });

      reply.send({
        success: true,
        data: regions.map((r: any) => ({
          ...r,
          childCount: r.childRegions?.length || 0,
          facilityCount: r._count?.facilities || 0,
        })),
      });
    }
  );

  // GET /platform/regions/:id — single region with children + facilities
  fastify.get(
    "/platform/regions/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const region = await fastify.prisma.region.findUnique({
        where: { id: parseInt(id) },
        include: {
          parentRegion: { select: { id: true, name: true, slug: true } },
          childRegions: { select: { id: true, name: true, slug: true, countryCode: true, status: true } },
          facilities: {
            select: { id: true, uuid: true, name: true, slug: true, category: true, status: true, city: true },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!region) {
        reply.code(404).send({ success: false, error: "Region not found" });
        return;
      }

      reply.send({ success: true, data: region });
    }
  );

  // POST /platform/regions — create region
  fastify.post(
    "/platform/regions",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        name: string;
        slug: string;
        countryCode: string;
        subdivisionCode?: string;
        timezone?: string;
        currency?: string;
        parentRegionId?: number;
        metadata?: any;
      };

      if (!body.name || !body.slug || !body.countryCode) {
        reply.code(400).send({ success: false, error: "name, slug, and countryCode are required" });
        return;
      }

      const existing = await fastify.prisma.region.findUnique({ where: { slug: body.slug } });
      if (existing) {
        reply.code(409).send({ success: false, error: "Region slug already exists" });
        return;
      }

      const region = await fastify.prisma.region.create({
        data: {
          name: body.name,
          slug: body.slug,
          countryCode: body.countryCode,
          subdivisionCode: body.subdivisionCode || null,
          timezone: body.timezone || "UTC",
          currency: body.currency || "USD",
          parentRegionId: body.parentRegionId || null,
          metadata: body.metadata || null,
        },
      });

      const userId = parseInt((request.user as any).sub);
      await writeAudit(fastify.prisma, {
        userId,
        regionId: region.id,
        action: "REGION_CREATE",
        entityType: "Region",
        entityId: region.id,
        afterState: { name: region.name, countryCode: region.countryCode, slug: region.slug },
      });

      reply.code(201).send({ success: true, data: region });
    }
  );

  // PUT /platform/regions/:id — update region
  fastify.put(
    "/platform/regions/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        slug?: string;
        countryCode?: string;
        subdivisionCode?: string;
        timezone?: string;
        currency?: string;
        status?: string;
        parentRegionId?: number | null;
        metadata?: any;
      };

      const existing = await fastify.prisma.region.findUnique({ where: { id: parseInt(id) } });
      if (!existing) {
        reply.code(404).send({ success: false, error: "Region not found" });
        return;
      }

      if (body.slug && body.slug !== existing.slug) {
        const slugTaken = await fastify.prisma.region.findUnique({ where: { slug: body.slug } });
        if (slugTaken) {
          reply.code(409).send({ success: false, error: "Region slug already exists" });
          return;
        }
      }

      const region = await fastify.prisma.region.update({
        where: { id: parseInt(id) },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
          ...(body.subdivisionCode !== undefined && { subdivisionCode: body.subdivisionCode }),
          ...(body.timezone !== undefined && { timezone: body.timezone }),
          ...(body.currency !== undefined && { currency: body.currency }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.parentRegionId !== undefined && { parentRegionId: body.parentRegionId }),
          ...(body.metadata !== undefined && { metadata: body.metadata }),
        },
      });

      const userId = parseInt((request.user as any).sub);
      await writeAudit(fastify.prisma, {
        userId,
        regionId: region.id,
        action: "REGION_UPDATE",
        entityType: "Region",
        entityId: region.id,
        afterState: body,
      });

      reply.send({ success: true, data: region });
    }
  );

  // DELETE /platform/regions/:id
  fastify.delete(
    "/platform/regions/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const regionId = parseInt(id);

      const existing = await fastify.prisma.region.findUnique({
        where: { id: regionId },
        include: { _count: { select: { facilities: true, childRegions: true } } },
      });

      if (!existing) {
        reply.code(404).send({ success: false, error: "Region not found" });
        return;
      }

      if (existing._count.facilities > 0 || existing._count.childRegions > 0) {
        reply.code(409).send({
          success: false,
          error: "Cannot delete region with active facilities or child regions. Reassign them first.",
        });
        return;
      }

      await fastify.prisma.region.delete({ where: { id: regionId } });

      const userId = parseInt((request.user as any).sub);
      await writeAudit(fastify.prisma, {
        userId,
        action: "REGION_DELETE",
        entityType: "Region",
        entityId: regionId,
        afterState: { name: existing.name, slug: existing.slug },
      });

      reply.send({ success: true, message: "Region deleted" });
    }
  );

  // ── FACILITY CRUD ────────────────────────────────────────────────────

  // GET /platform/facilities — list facilities with filters
  fastify.get(
    "/platform/facilities",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "FACILITY_MANAGER", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { regionId, organizationId, category, status, page, limit } = request.query as {
        regionId?: string;
        organizationId?: string;
        category?: string;
        status?: string;
        page?: string;
        limit?: string;
      };

      const take = Math.min(parseInt(limit || "50"), 100);
      const skip = (parseInt(page || "1") - 1) * take;

      const where: any = {};
      if (regionId) where.regionId = parseInt(regionId);
      if (organizationId) where.organizationId = parseInt(organizationId);
      if (category) where.category = category;
      if (status) where.status = status;

      const [facilities, total] = await Promise.all([
        fastify.prisma.facility.findMany({
          where,
          include: {
            organization: { select: { id: true, name: true } },
            region: { select: { id: true, name: true, slug: true } },
            _count: { select: { facilityMeta: true, entitlements: true } },
          },
          orderBy: { name: "asc" },
          take,
          skip,
        }),
        fastify.prisma.facility.count({ where }),
      ]);

      reply.send({
        success: true,
        data: facilities,
        meta: { total, page: parseInt(page || "1"), limit: take, totalPages: Math.ceil(total / take) },
      });
    }
  );

  // GET /platform/facilities/:id — single facility with meta + entitlements
  fastify.get(
    "/platform/facilities/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "FACILITY_MANAGER", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const facility = await fastify.prisma.facility.findUnique({
        where: { id: parseInt(id) },
        include: {
          organization: { select: { id: true, name: true } },
          region: { select: { id: true, name: true, slug: true, countryCode: true } },
          dropzone: { select: { id: true, name: true } },
          facilityMeta: true,
          entitlements: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });

      if (!facility) {
        reply.code(404).send({ success: false, error: "Facility not found" });
        return;
      }

      reply.send({ success: true, data: facility });
    }
  );

  // POST /platform/facilities — create facility
  fastify.post(
    "/platform/facilities",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        name: string;
        slug: string;
        organizationId: number;
        regionId?: number;
        dropzoneId?: number;
        category: string;
        description?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
        currency?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        countryCode?: string;
        phone?: string;
        email?: string;
        website?: string;
        capacity?: number;
        operatingHours?: any;
        metadata?: any;
      };

      if (!body.name || !body.slug || !body.organizationId || !body.category) {
        reply.code(400).send({
          success: false,
          error: "name, slug, organizationId, and category are required",
        });
        return;
      }

      const validCategories = ["AVIATION", "HOTEL", "APARTMENT", "BUNKHOUSE", "CAFE", "SHOP", "MIXED"];
      if (!validCategories.includes(body.category)) {
        reply.code(400).send({ success: false, error: `Invalid category. Must be: ${validCategories.join(", ")}` });
        return;
      }

      const org = await fastify.prisma.organization.findUnique({ where: { id: body.organizationId } });
      if (!org) {
        reply.code(404).send({ success: false, error: "Organization not found" });
        return;
      }

      const existingSlug = await fastify.prisma.facility.findFirst({
        where: { organizationId: body.organizationId, slug: body.slug },
      });
      if (existingSlug) {
        reply.code(409).send({ success: false, error: "Facility slug already exists in this organization" });
        return;
      }

      if (body.dropzoneId) {
        const dz = await fastify.prisma.dropzone.findUnique({ where: { id: body.dropzoneId } });
        if (!dz) {
          reply.code(404).send({ success: false, error: "Dropzone not found" });
          return;
        }
        const linkedFacility = await fastify.prisma.facility.findUnique({ where: { dropzoneId: body.dropzoneId } });
        if (linkedFacility) {
          reply.code(409).send({ success: false, error: "Dropzone is already linked to another facility" });
          return;
        }
      }

      const facility = await fastify.prisma.facility.create({
        data: {
          name: body.name,
          slug: body.slug,
          organizationId: body.organizationId,
          regionId: body.regionId || null,
          dropzoneId: body.dropzoneId || null,
          category: body.category as any,
          description: body.description || null,
          latitude: body.latitude || null,
          longitude: body.longitude || null,
          timezone: body.timezone || "UTC",
          currency: body.currency || "USD",
          address: body.address || null,
          city: body.city || null,
          state: body.state || null,
          postalCode: body.postalCode || null,
          countryCode: body.countryCode || null,
          phone: body.phone || null,
          email: body.email || null,
          website: body.website || null,
          capacity: body.capacity || null,
          operatingHours: body.operatingHours || null,
          metadata: body.metadata || null,
        },
        include: {
          organization: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
        },
      });

      const userId = parseInt((request.user as any).sub);
      await writeAudit(fastify.prisma, {
        userId,
        facilityId: facility.id,
        regionId: facility.regionId || undefined,
        action: "FACILITY_CREATE",
        entityType: "Facility",
        entityId: facility.id,
        afterState: { name: facility.name, category: body.category, organizationId: body.organizationId },
      });

      reply.code(201).send({ success: true, data: facility });
    }
  );

  // PUT /platform/facilities/:id — update facility
  fastify.put(
    "/platform/facilities/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "FACILITY_MANAGER", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, any>;

      const existing = await fastify.prisma.facility.findUnique({ where: { id: parseInt(id) } });
      if (!existing) {
        reply.code(404).send({ success: false, error: "Facility not found" });
        return;
      }

      const isStatusChange = body.status && body.status !== existing.status;

      const allowedFields = [
        "name", "slug", "regionId", "dropzoneId", "category", "status", "description",
        "latitude", "longitude", "timezone", "currency", "address", "city", "state",
        "postalCode", "countryCode", "phone", "email", "website", "capacity",
        "operatingHours", "metadata",
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) updateData[field] = body[field];
      }

      const facility = await fastify.prisma.facility.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          organization: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
        },
      });

      const userId = parseInt((request.user as any).sub);
      const auditAction = isStatusChange ? "FACILITY_STATUS_CHANGE" : "FACILITY_UPDATE";
      await writeAudit(fastify.prisma, {
        userId,
        facilityId: facility.id,
        regionId: facility.regionId || undefined,
        action: auditAction,
        entityType: "Facility",
        entityId: facility.id,
        afterState: isStatusChange
          ? { previousStatus: existing.status, newStatus: body.status }
          : updateData,
      });

      reply.send({ success: true, data: facility });
    }
  );

  // DELETE /platform/facilities/:id
  fastify.delete(
    "/platform/facilities/:id",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const facilityId = parseInt(id);

      const existing = await fastify.prisma.facility.findUnique({ where: { id: facilityId } });
      if (!existing) {
        reply.code(404).send({ success: false, error: "Facility not found" });
        return;
      }

      if (existing.status === "ACTIVE") {
        reply.code(409).send({
          success: false,
          error: "Cannot delete active facility. Set status to ARCHIVED first.",
        });
        return;
      }

      await fastify.prisma.facility.delete({ where: { id: facilityId } });

      const userId = parseInt((request.user as any).sub);
      await writeAudit(fastify.prisma, {
        userId,
        action: "FACILITY_DELETE",
        entityType: "Facility",
        entityId: facilityId,
        afterState: { name: existing.name, category: existing.category, organizationId: existing.organizationId },
      });

      reply.send({ success: true, message: "Facility deleted" });
    }
  );

  // ── HIERARCHY NAVIGATION ─────────────────────────────────────────────

  // GET /platform/hierarchy — full platform→region→org→facility tree
  fastify.get(
    "/platform/hierarchy",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { depth } = request.query as { depth?: string };
      const maxDepth = Math.min(parseInt(depth || "3"), 5);

      const regions = await fastify.prisma.region.findMany({
        where: { parentRegionId: null },
        include: {
          childRegions: maxDepth >= 2
            ? {
                include: {
                  childRegions: maxDepth >= 3
                    ? { select: { id: true, name: true, slug: true, status: true } }
                    : undefined,
                  facilities: {
                    select: { id: true, uuid: true, name: true, slug: true, category: true, status: true },
                    orderBy: { name: "asc" },
                  },
                  _count: { select: { facilities: true } },
                },
                orderBy: { name: "asc" },
              }
            : undefined,
          facilities: {
            select: { id: true, uuid: true, name: true, slug: true, category: true, status: true },
            orderBy: { name: "asc" },
          },
          _count: { select: { facilities: true, childRegions: true } },
        },
        orderBy: { name: "asc" },
      });

      const organizations = await fastify.prisma.organization.findMany({
        include: { _count: { select: { facilities: true } } },
        orderBy: { name: "asc" },
      });

      const [regionCount, facilityCount, orgCount] = await Promise.all([
        fastify.prisma.region.count(),
        fastify.prisma.facility.count(),
        fastify.prisma.organization.count(),
      ]);

      const categoryBreakdown = await fastify.prisma.facility.groupBy({
        by: ["category"],
        _count: { id: true },
      });

      const statusBreakdown = await fastify.prisma.facility.groupBy({
        by: ["status"],
        _count: { id: true },
      });

      reply.send({
        success: true,
        data: {
          regions,
          organizations: organizations.map((o: any) => ({
            id: o.id,
            name: o.name,
            facilityCount: o._count?.facilities || 0,
          })),
          stats: {
            totalRegions: regionCount,
            totalFacilities: facilityCount,
            totalOrganizations: orgCount,
            byCategory: categoryBreakdown.reduce((acc: any, c: any) => {
              acc[c.category] = c._count.id;
              return acc;
            }, {}),
            byStatus: statusBreakdown.reduce((acc: any, s: any) => {
              acc[s.status] = s._count.id;
              return acc;
            }, {}),
          },
        },
      });
    }
  );

  // GET /platform/stats — platform-wide summary for dashboard
  fastify.get(
    "/platform/stats",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "REGION_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const [regionCount, facilityCount, orgCount, dropzoneCount, userCount, activeFacilities] =
        await Promise.all([
          fastify.prisma.region.count(),
          fastify.prisma.facility.count(),
          fastify.prisma.organization.count(),
          fastify.prisma.dropzone.count(),
          fastify.prisma.user.count(),
          fastify.prisma.facility.count({ where: { status: "ACTIVE" } }),
        ]);

      const categoryBreakdown = await fastify.prisma.facility.groupBy({
        by: ["category"],
        _count: { id: true },
      });

      reply.send({
        success: true,
        data: {
          totalRegions: regionCount,
          totalFacilities: facilityCount,
          activeFacilities,
          totalOrganizations: orgCount,
          totalDropzones: dropzoneCount,
          totalUsers: userCount,
          byCategory: categoryBreakdown.reduce((acc: any, c: any) => {
            acc[c.category] = c._count.id;
            return acc;
          }, {}),
        },
      });
    }
  );

  // ── ENTITLEMENT MANAGEMENT ───────────────────────────────────────────

  // POST /platform/entitlements — grant entitlement
  fastify.post(
    "/platform/entitlements",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        featureKey: string;
        scope: string;
        scopeId?: number;
        facilityId?: number;
        expiresAt?: string;
        reason?: string;
        metadata?: any;
      };

      if (!body.featureKey || !body.scope) {
        reply.code(400).send({ success: false, error: "featureKey and scope are required" });
        return;
      }

      const validScopes = ["platform", "region", "organization", "facility"];
      if (!validScopes.includes(body.scope)) {
        reply.code(400).send({ success: false, error: `scope must be: ${validScopes.join(", ")}` });
        return;
      }

      const userId = parseInt((request.user as any).sub);

      const grant = await fastify.prisma.entitlementGrant.create({
        data: {
          featureKey: body.featureKey,
          scope: body.scope,
          scopeId: body.scopeId || null,
          facilityId: body.facilityId || null,
          grantedBy: userId,
          state: "PROVISIONED",
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          reason: body.reason || null,
          metadata: body.metadata || null,
        },
      });

      await writeAudit(fastify.prisma, {
        userId,
        facilityId: body.facilityId,
        action: "ENTITLEMENT_GRANT",
        entityType: "EntitlementGrant",
        entityId: grant.id,
        afterState: { featureKey: body.featureKey, scope: body.scope, scopeId: body.scopeId },
      });

      reply.code(201).send({ success: true, data: grant });
    }
  );

  // PATCH /platform/entitlements/:id/state — transition entitlement state
  fastify.patch(
    "/platform/entitlements/:id/state",
    { preHandler: [authenticate, authorize(["PLATFORM_ADMIN", "SUPER_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { state, reason } = request.body as { state: string; reason?: string };

      const validStates = ["PROVISIONED", "ACTIVE", "FROZEN", "HELD", "SUSPENDED", "DEPRECATED", "MIGRATED"];
      if (!validStates.includes(state)) {
        reply.code(400).send({ success: false, error: `state must be: ${validStates.join(", ")}` });
        return;
      }

      const existing = await fastify.prisma.entitlementGrant.findUnique({ where: { id: parseInt(id) } });
      if (!existing) {
        reply.code(404).send({ success: false, error: "Entitlement grant not found" });
        return;
      }

      const updateData: any = { state, reason: reason || existing.reason };
      if (state === "ACTIVE" && !existing.activatedAt) updateData.activatedAt = new Date();
      if (state === "FROZEN") updateData.frozenAt = new Date();
      if (state === "SUSPENDED") updateData.suspendedAt = new Date();

      const grant = await fastify.prisma.entitlementGrant.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      const userId = parseInt((request.user as any).sub);
      await writeAudit(fastify.prisma, {
        userId,
        facilityId: grant.facilityId || undefined,
        action: "ENTITLEMENT_STATE_CHANGE",
        entityType: "EntitlementGrant",
        entityId: grant.id,
        afterState: { previousState: existing.state, newState: state, reason },
      });

      reply.send({ success: true, data: grant });
    }
  );
}
