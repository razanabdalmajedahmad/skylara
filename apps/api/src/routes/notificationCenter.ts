import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { authenticate } from "../middleware/authenticate";
import { tenantScope } from "../middleware/tenantScope";

export async function notificationCenterRoutes(fastify: FastifyInstance) {

  // ─────────────────────────────────────────────────────────────
  // OVERVIEW
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/overview",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const [totalSent, delivered, failed, campaigns, segmentCount, pushDevices, automationCount, opened] = await Promise.all([
        fastify.prisma.notificationEvent.count(),
        fastify.prisma.notificationEvent.count({ where: { status: "SENT" } }),
        fastify.prisma.notificationEvent.count({ where: { status: "FAILED" } }),
        fastify.prisma.notificationCampaign.count({ where: { dropzoneId } }),
        fastify.prisma.segment.count({ where: { dropzoneId } }),
        fastify.prisma.pushDevice.count({ where: { active: true } }),
        fastify.prisma.automationRule.count({ where: { dropzoneId, active: true } }),
        fastify.prisma.notificationEvent.count({ where: { openedAt: { not: null } } }),
      ]);

      // Channel breakdown from real DB data
      const channelCounts = await fastify.prisma.notificationEvent.groupBy({
        by: ["channel"],
        _count: { id: true },
      });
      const channelMap: Record<string, number> = {};
      for (const row of channelCounts) {
        channelMap[row.channel] = row._count.id;
      }

      reply.send({
        totalSent,
        delivered,
        failed,
        opened,
        openRate: totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0,
        activeCampaigns: campaigns,
        activeSegments: segmentCount,
        activeAutomations: automationCount,
        pushDevices,
        channelBreakdown: {
          email: channelMap["EMAIL"] || 0,
          push: channelMap["PUSH"] || 0,
          sms: channelMap["SMS"] || 0,
          inApp: channelMap["IN_APP"] || 0,
          whatsapp: channelMap["WHATSAPP"] || 0,
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // CAMPAIGNS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/campaigns",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const campaigns = await fastify.prisma.notificationCampaign.findMany({
        where: { dropzoneId },
        include: { segment: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      });

      const result = campaigns.map((c) => ({
        id: c.uuid,
        name: c.name,
        channels: c.channelsJson || [],
        segmentName: c.segment?.name || "All",
        status: c.status,
        triggerType: c.triggerType,
        sent: c.sentCount,
        opened: c.openCount,
        clicked: c.clickCount,
        failed: c.failCount,
        createdAt: c.createdAt.toISOString(),
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SEGMENTS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/segments",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const segments = await fastify.prisma.segment.findMany({
        where: { dropzoneId },
        orderBy: { name: "asc" },
      });

      const result = segments.map((s) => {
        const rules = (s.rulesJson as any[]) || [];
        return {
          id: s.uuid,
          name: s.name,
          description: s.description,
          active: s.active,
          memberCount: s.cachedCount || 0,
          rulesCount: rules.length,
        };
      });

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // CREATE SEGMENT
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/notifications/segments",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const { name, description, rules } = request.body as {
        name: string;
        description?: string;
        rules?: any[];
      };

      if (!name) return reply.code(400).send({ error: "name is required" });

      const segment = await fastify.prisma.segment.create({
        data: {
          uuid: crypto.randomUUID(),
          dropzoneId,
          name,
          description: description || null,
          rulesJson: rules || [],
          active: true,
        },
      });

      reply.code(201).send({
        id: segment.uuid,
        name: segment.name,
        description: segment.description,
        active: segment.active,
        memberCount: 0,
        rulesCount: ((segment.rulesJson as any[]) || []).length,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // UPDATE SEGMENT
  // ─────────────────────────────────────────────────────────────

  fastify.put(
    "/notifications/segments/:uuid",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };
      const { name, description, active } = request.body as {
        name?: string;
        description?: string;
        active?: boolean;
      };

      const existing = await fastify.prisma.segment.findUnique({ where: { uuid } });
      if (!existing) return reply.code(404).send({ error: "Segment not found" });

      const segment = await fastify.prisma.segment.update({
        where: { uuid },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(active !== undefined && { active }),
        },
      });

      reply.send({
        id: segment.uuid,
        name: segment.name,
        description: segment.description,
        active: segment.active,
        memberCount: segment.cachedCount || 0,
        rulesCount: ((segment.rulesJson as any[]) || []).length,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // DELETE SEGMENT
  // ─────────────────────────────────────────────────────────────

  fastify.delete(
    "/notifications/segments/:uuid",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };

      const existing = await fastify.prisma.segment.findUnique({ where: { uuid } });
      if (!existing) return reply.code(404).send({ error: "Segment not found" });

      await fastify.prisma.segment.delete({ where: { uuid } });
      reply.code(204).send();
    }
  );

  // ─────────────────────────────────────────────────────────────
  // DELIVERY LOGS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/delivery-logs",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const events = await fastify.prisma.notificationEvent.findMany({
        where: { status: { in: ["SENT", "READ"] } },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { sentAt: "desc" },
        take: 50,
      });

      const result = events.map((e) => ({
        id: e.id,
        user: e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown",
        email: e.user?.email || "",
        channel: e.channel,
        eventType: e.eventType,
        subject: e.subject,
        status: e.status,
        sentAt: e.sentAt?.toISOString() || null,
        deliveredAt: e.deliveredAt?.toISOString() || null,
        openedAt: e.openedAt?.toISOString() || null,
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // FAILURES
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/failures",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const failures = await fastify.prisma.notificationEvent.findMany({
        where: { status: "FAILED" },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const result = failures.map((f) => ({
        id: f.id,
        user: f.user ? `${f.user.firstName} ${f.user.lastName}` : "Unknown",
        channel: f.channel,
        eventType: f.eventType,
        failureReason: f.failureReason || "Unknown error",
        attempts: f.attempts,
        lastAttempt: f.createdAt.toISOString(),
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // ALL TEMPLATES (notification templates)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/templates/all",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const templates = await fastify.prisma.notificationTemplate.findMany({
        orderBy: { eventType: "asc" },
      });

      const result = templates.map((t) => ({
        id: t.id,
        name: `${t.eventType} (${String(t.channel).toLowerCase()})`,
        eventType: t.eventType,
        channel: t.channel,
        language: t.locale,
        subject: t.subject,
        active: true,
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // EMAIL EVENTS (channel-filtered view)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/email",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const events = await fastify.prisma.notificationEvent.findMany({
        where: { channel: "EMAIL" },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { sentAt: "desc" },
        take: 50,
      });

      const result = events.map((e) => ({
        id: e.id,
        user: e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown",
        subject: e.subject || e.eventType,
        status: e.status,
        sentAt: e.sentAt?.toISOString() || e.createdAt.toISOString(),
        openedAt: e.openedAt?.toISOString() || null,
        bouncedReason: e.status === "FAILED" ? (e.failureReason || null) : null,
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // PUSH EVENTS (channel-filtered view)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/push",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const devices = await fastify.prisma.pushDevice.findMany({
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });

      const result = devices.map((d) => ({
        id: d.id,
        user: d.user ? `${d.user.firstName} ${d.user.lastName}` : "Unknown",
        platform: d.platform as "iOS" | "Android",
        token: d.pushToken ? `${d.pushToken.substring(0, 8)}...` : "—",
        lastSent: d.updatedAt.toISOString(),
        status: d.active ? "ACTIVE" : "EXPIRED",
        appVersion: d.appVersion || "—",
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // WHATSAPP EVENTS (consent + messages)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/whatsapp",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const consents = await fastify.prisma.whatsAppConsent.findMany({
        include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });

      const result = consents.map((c) => ({
        id: c.id,
        user: c.user ? `${c.user.firstName} ${c.user.lastName}` : "Unknown",
        phone: c.user?.phone || c.phone || "—",
        templateName: "—",
        status: c.status === "OPTED_IN" ? "ACTIVE" : c.status,
        sentAt: c.updatedAt.toISOString(),
        consentStatus: c.status,
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // TRANSACTIONAL EVENTS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/transactional",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const events = await fastify.prisma.notificationEvent.findMany({
        where: { campaignId: null },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const result = events.map((e) => ({
        id: e.id,
        user: e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown",
        eventType: e.eventType,
        channel: e.channel,
        status: e.status,
        sentAt: e.sentAt?.toISOString() || e.createdAt.toISOString(),
        metadata: e.subject || "—",
      }));

      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // CREATE CAMPAIGN
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/notifications/campaigns",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const { name, description, segmentId, channels, triggerType } = request.body as {
        name: string;
        description?: string;
        segmentId?: number;
        channels: string[];
        triggerType?: string;
      };

      if (!name || !channels?.length) {
        return reply.code(400).send({ error: "name and channels are required" });
      }

      const campaign = await fastify.prisma.notificationCampaign.create({
        data: {
          uuid: crypto.randomUUID(),
          dropzoneId,
          name,
          description: description || null,
          segmentId: segmentId || null,
          channelsJson: channels,
          triggerType: (triggerType as any) || "MANUAL",
          status: "DRAFT",
          templateMappingJson: {},
        },
        include: { segment: { select: { name: true } } },
      });

      reply.code(201).send({
        id: campaign.uuid,
        name: campaign.name,
        channels: campaign.channelsJson || [],
        segmentName: campaign.segment?.name || "All",
        status: campaign.status,
        triggerType: campaign.triggerType,
        sent: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        createdAt: campaign.createdAt.toISOString(),
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // UPDATE CAMPAIGN
  // ─────────────────────────────────────────────────────────────

  fastify.put(
    "/notifications/campaigns/:uuid",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };
      const { name, description, segmentId, channels, triggerType, status } = request.body as {
        name?: string;
        description?: string;
        segmentId?: number | null;
        channels?: string[];
        triggerType?: string;
        status?: string;
      };

      const existing = await fastify.prisma.notificationCampaign.findUnique({ where: { uuid } });
      if (!existing) return reply.code(404).send({ error: "Campaign not found" });

      const campaign = await fastify.prisma.notificationCampaign.update({
        where: { uuid },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(segmentId !== undefined && { segmentId }),
          ...(channels !== undefined && { channelsJson: channels }),
          ...(triggerType !== undefined && { triggerType: triggerType as any }),
          ...(status !== undefined && { status: status as any }),
        },
        include: { segment: { select: { name: true } } },
      });

      reply.send({
        id: campaign.uuid,
        name: campaign.name,
        channels: campaign.channelsJson || [],
        segmentName: campaign.segment?.name || "All",
        status: campaign.status,
        triggerType: campaign.triggerType,
        sent: campaign.sentCount,
        opened: campaign.openCount,
        clicked: campaign.clickCount,
        failed: campaign.failCount,
        createdAt: campaign.createdAt.toISOString(),
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // DELETE CAMPAIGN
  // ─────────────────────────────────────────────────────────────

  fastify.delete(
    "/notifications/campaigns/:uuid",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };

      const existing = await fastify.prisma.notificationCampaign.findUnique({ where: { uuid } });
      if (!existing) return reply.code(404).send({ error: "Campaign not found" });

      await fastify.prisma.notificationCampaign.delete({ where: { uuid } });
      reply.code(204).send();
    }
  );

  // ─────────────────────────────────────────────────────────────
  // ACTIVATE / PAUSE CAMPAIGN
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/notifications/campaigns/:uuid/activate",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };

      const existing = await fastify.prisma.notificationCampaign.findUnique({
        where: { uuid },
        include: { segment: { select: { name: true } } },
      });
      if (!existing) return reply.code(404).send({ error: "Campaign not found" });

      const isActive = existing.status === "ACTIVE";
      const campaign = await fastify.prisma.notificationCampaign.update({
        where: { uuid },
        data: {
          status: isActive ? "PAUSED" : "ACTIVE",
          ...(!isActive && !existing.startedAt && { startedAt: new Date() }),
        },
        include: { segment: { select: { name: true } } },
      });

      reply.send({
        id: campaign.uuid,
        name: campaign.name,
        channels: campaign.channelsJson || [],
        segmentName: campaign.segment?.name || "All",
        status: campaign.status,
        triggerType: campaign.triggerType,
        sent: campaign.sentCount,
        opened: campaign.openCount,
        clicked: campaign.clickCount,
        failed: campaign.failCount,
        createdAt: campaign.createdAt.toISOString(),
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // CREATE TEMPLATE
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/notifications/templates/create",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { eventType, channel, locale, subject, body } = request.body as {
        eventType: string;
        channel: string;
        locale?: string;
        subject?: string;
        body: string;
      };

      if (!eventType || !channel || !body) {
        return reply.code(400).send({ error: "eventType, channel, and body are required" });
      }

      const template = await fastify.prisma.notificationTemplate.create({
        data: {
          eventType,
          channel: channel as any,
          locale: locale || "en",
          subject: subject || null,
          body,
          variables: [],
        },
      });

      reply.code(201).send({
        id: template.id,
        name: `${template.eventType} (${String(template.channel).toLowerCase()})`,
        eventType: template.eventType,
        channel: template.channel,
        language: template.locale,
        subject: template.subject,
        active: template.isActive,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // UPDATE TEMPLATE
  // ─────────────────────────────────────────────────────────────

  fastify.put(
    "/notifications/templates/:id",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const id = parseInt((request.params as { id: string }).id, 10);
      const { eventType, channel, locale, subject, body, active } = request.body as {
        eventType?: string;
        channel?: string;
        locale?: string;
        subject?: string;
        body?: string;
        active?: boolean;
      };

      const existing = await fastify.prisma.notificationTemplate.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "Template not found" });

      const template = await fastify.prisma.notificationTemplate.update({
        where: { id },
        data: {
          ...(eventType !== undefined && { eventType }),
          ...(channel !== undefined && { channel: channel as any }),
          ...(locale !== undefined && { locale }),
          ...(subject !== undefined && { subject }),
          ...(body !== undefined && { body }),
          ...(active !== undefined && { isActive: active }),
        },
      });

      reply.send({
        id: template.id,
        name: `${template.eventType} (${String(template.channel).toLowerCase()})`,
        eventType: template.eventType,
        channel: template.channel,
        language: template.locale,
        subject: template.subject,
        active: template.isActive,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // AI RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/notifications/recommendations",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const recommendations: { id: string; type: string; title: string; description: string; priority: string; action: string }[] = [];

      // 1. Check failure rate
      const [totalEvents, failedEvents] = await Promise.all([
        fastify.prisma.notificationEvent.count(),
        fastify.prisma.notificationEvent.count({ where: { status: "FAILED" } }),
      ]);
      if (totalEvents > 0 && failedEvents / totalEvents > 0.1) {
        recommendations.push({
          id: "high-failure-rate",
          type: "warning",
          title: `High failure rate: ${Math.round((failedEvents / totalEvents) * 100)}% of notifications failing`,
          description: `${failedEvents} of ${totalEvents} notifications have failed delivery. Check provider configuration and recipient data quality.`,
          priority: "high",
          action: "Review Failures",
        });
      }

      // 2. Check low open rate
      const openedEvents = await fastify.prisma.notificationEvent.count({ where: { openedAt: { not: null } } });
      const sentEvents = await fastify.prisma.notificationEvent.count({ where: { status: "SENT" } });
      if (sentEvents > 10 && openedEvents / sentEvents < 0.2) {
        recommendations.push({
          id: "low-open-rate",
          type: "insight",
          title: `Low open rate: only ${Math.round((openedEvents / sentEvents) * 100)}% of sent notifications opened`,
          description: "Consider A/B testing subject lines, sending at optimal times, or segmenting your audience for more targeted messaging.",
          priority: "medium",
          action: "View Templates",
        });
      }

      // 3. Check for draft campaigns that could be activated
      const draftCampaigns = await fastify.prisma.notificationCampaign.count({
        where: { dropzoneId, status: "DRAFT" },
      });
      if (draftCampaigns > 0) {
        recommendations.push({
          id: "draft-campaigns",
          type: "action",
          title: `${draftCampaigns} draft campaign${draftCampaigns > 1 ? "s" : ""} ready to activate`,
          description: "You have campaigns in draft status. Review and activate them to start reaching your audience.",
          priority: "low",
          action: "View Campaigns",
        });
      }

      // 4. Check for inactive segments
      const inactiveSegments = await fastify.prisma.segment.count({
        where: { dropzoneId, active: false },
      });
      if (inactiveSegments > 0) {
        recommendations.push({
          id: "inactive-segments",
          type: "insight",
          title: `${inactiveSegments} inactive segment${inactiveSegments > 1 ? "s" : ""} could be cleaned up`,
          description: "Inactive segments add clutter. Consider reactivating useful ones or deleting outdated segments.",
          priority: "low",
          action: "View Segments",
        });
      }

      // 5. Check for paused automations
      const pausedAutomations = await fastify.prisma.automationRule.count({
        where: { dropzoneId, active: false },
      });
      if (pausedAutomations > 0) {
        recommendations.push({
          id: "paused-automations",
          type: "action",
          title: `${pausedAutomations} paused automation${pausedAutomations > 1 ? "s" : ""} — review and reactivate?`,
          description: "Paused automations won't trigger. Re-enable them if they're still relevant to your workflows.",
          priority: "medium",
          action: "View Automations",
        });
      }

      // 6. If no events at all, suggest getting started
      if (totalEvents === 0) {
        recommendations.push({
          id: "getting-started",
          type: "action",
          title: "No notifications sent yet — create your first campaign",
          description: "Set up a campaign to start engaging your audience via email, push, SMS, or in-app notifications.",
          priority: "high",
          action: "Create Campaign",
        });
      }

      reply.send(recommendations);
    }
  );

  // Communication preferences handled by notificationsAdvanced.ts
}
