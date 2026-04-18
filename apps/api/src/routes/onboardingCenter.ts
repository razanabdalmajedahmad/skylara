import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import {
  coachApplicationWhereForTenant,
  getUserIdsWithRoleAtDropzone,
} from "../utils/coachApplicationScope";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

// ============================================================================
// ONBOARDING CENTER ROUTES — Templates, Applications, Smart Routing
// ============================================================================

const createTemplateSchema = z.object({
  name: z.string().min(3).max(255),
  category: z.enum(["ATHLETE", "STUDENT", "TANDEM", "COACH", "INSTRUCTOR", "STAFF", "DZ_MANAGER", "VISITING_JUMPER", "EVENT_REGISTRATION"]),
  flowKey: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  accessMode: z.enum(["PUBLIC", "INVITE_ONLY", "TOKEN", "INTERNAL_ONLY"]).default("PUBLIC"),
  requireLogin: z.boolean().default(false),
  allowGuestMode: z.boolean().default(true),
  externalSlug: z.string().optional(),
  eligibilityRules: z.array(z.any()).optional(),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "DOCUMENTS_MISSING", "APPROVED", "CONDITIONALLY_APPROVED", "REJECTED", "WITHDRAWN"]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// ── Eligibility Rules Engine ──────────────────────────────────────────
// Evaluates JSON-based rules against a user's profile context.
// Rule format: { field: string, operator: string, value: any, action?: string, message?: string }
// Operators: eq, neq, gte, lte, gt, lt, in, not_in, exists, not_exists
// Actions: skip_step, warn, block, route_to
function evaluateEligibilityRules(
  rules: any[],
  ctx: Record<string, any>
): { eligible: boolean; message: string | null; skipSteps: string[]; warnings: string[] } {
  const skipSteps: string[] = [];
  const warnings: string[] = [];
  let eligible = true;
  let message: string | null = null;

  for (const rule of rules) {
    if (!rule.field || !rule.operator) continue;
    const val = ctx[rule.field];
    let match = false;

    switch (rule.operator) {
      case "eq": match = val === rule.value; break;
      case "neq": match = val !== rule.value; break;
      case "gte": match = typeof val === "number" && val >= rule.value; break;
      case "lte": match = typeof val === "number" && val <= rule.value; break;
      case "gt": match = typeof val === "number" && val > rule.value; break;
      case "lt": match = typeof val === "number" && val < rule.value; break;
      case "in": match = Array.isArray(rule.value) && rule.value.includes(val); break;
      case "not_in": match = Array.isArray(rule.value) && !rule.value.includes(val); break;
      case "exists": match = val !== null && val !== undefined; break;
      case "not_exists": match = val === null || val === undefined; break;
      default: break;
    }

    if (match) {
      switch (rule.action) {
        case "skip_step":
          if (rule.stepKey) skipSteps.push(rule.stepKey);
          break;
        case "warn":
          if (rule.message) warnings.push(rule.message);
          break;
        case "block":
          eligible = false;
          if (rule.message) message = rule.message;
          break;
        case "route_to":
          if (rule.message) message = rule.message;
          break;
        default:
          // No action = just informational
          break;
      }
    }
  }

  return { eligible, message, skipSteps, warnings };
}

/** Resolve onboarding application by numeric id or uuid, scoped to dropzone. */
function applicationWhereByParam(id: string, dropzoneId: number) {
  const orClause: Array<{ id: number } | { uuid: string }> = [{ uuid: id }];
  if (/^\d+$/.test(id)) {
    orClause.push({ id: parseInt(id, 10) });
  }
  return { dropzoneId, OR: orClause };
}

export async function onboardingCenterRoutes(fastify: FastifyInstance) {

  // ─────────────────────────────────────────────────────────────
  // OVERVIEW STATS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/overview/stats",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const [inProgress, completedThisMonth, pendingApprovals, templates, totalApps] = await Promise.all([
        fastify.prisma.onboardingApplication.count({ where: { dropzoneId, status: "IN_PROGRESS" } }),
        fastify.prisma.onboardingApplication.count({ where: { dropzoneId, status: "APPROVED", approvedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
        fastify.prisma.onboardingApplication.count({ where: { dropzoneId, status: "SUBMITTED" } }),
        fastify.prisma.onboardingTemplate.count({ where: { dropzoneId, status: "ACTIVE" } }),
        fastify.prisma.onboardingApplication.count({ where: { dropzoneId } }),
      ]);

      const expiringDocs = await fastify.prisma.document.count({
        where: { dropzoneId, expiresAt: { lte: new Date(Date.now() + 30 * 86400000), gte: new Date() } },
      });

      reply.send({
        inProgress,
        completedThisMonth,
        pendingApprovals,
        incompleteProfiles: inProgress,
        expiringDocuments: expiringDocs,
        activeTemplates: templates,
        totalApplications: totalApps,
        conversionRate: totalApps > 0 ? Math.round((completedThisMonth / totalApps) * 100) : 0,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // OVERVIEW ACTIVITY
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/overview/activity",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const recentApps = await fastify.prisma.onboardingApplication.findMany({
        where: { dropzoneId },
        include: {
          template: { select: { name: true, category: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      const typeMap: Record<string, string> = { APPROVED: "completed", SUBMITTED: "action_needed", REJECTED: "rejected", IN_PROGRESS: "started", DOCUMENTS_MISSING: "action_needed", UNDER_REVIEW: "started" };
      const activity = recentApps.map((app) => {
        const person = app.user ? `${app.user.firstName} ${app.user.lastName}` : app.externalContactName || "Guest";
        const type = typeMap[app.status] || "started";
        const verb = app.status === "APPROVED" ? "completed" : app.status === "SUBMITTED" ? "submitted" : app.status === "REJECTED" ? "was rejected for" : "is working on";
        return {
          id: String(app.id),
          text: `${person} ${verb} ${app.template.name}`,
          timestamp: app.updatedAt.toISOString(),
          type,
        };
      });

      reply.send(activity);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // CATEGORY-FILTERED VIEWS (athletes, students, tandem, etc.)
  // ─────────────────────────────────────────────────────────────

  // Note: coaches and instructors are handled by partnerOnboarding.ts (coachApplication model)
  const categoryRoutes: { path: string; categories: string[] }[] = [
    { path: "/onboarding/athletes", categories: ["ATHLETE", "VISITING_JUMPER"] },
    { path: "/onboarding/students", categories: ["STUDENT"] },
    { path: "/onboarding/tandem", categories: ["TANDEM"] },
    { path: "/onboarding/staff", categories: ["STAFF"] },
    { path: "/onboarding/managers", categories: ["DZ_MANAGER"] },
  ];

  for (const route of categoryRoutes) {
    fastify.get(
      route.path,
      { preHandler: [authenticate, tenantScope] },
      async (request, reply) => {
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
        const apps = await fastify.prisma.onboardingApplication.findMany({
          where: { dropzoneId, template: { category: { in: route.categories as any[] } } },
          include: {
            template: { select: { name: true, category: true, flowKey: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            stepResponses: { select: { completed: true, stepId: true } },
            applicationDocuments: { select: { verificationStatus: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const result = apps.map((app) => ({
          id: app.uuid,
          name: app.user ? `${app.user.firstName} ${app.user.lastName}` : app.externalContactName || "Guest",
          email: app.user?.email || app.externalContactEmail || "",
          phone: app.user?.phone || app.externalContactPhone || "",
          template: app.template.name,
          category: app.template.category,
          status: app.status,
          progress: app.completionPercent,
          submittedAt: app.submittedAt?.toISOString() || null,
          approvedAt: app.approvedAt?.toISOString() || null,
          stepsCompleted: app.stepResponses.filter((s) => s.completed).length,
          stepsTotal: app.stepResponses.length || 1,
          documents: app.applicationDocuments.map((d) => ({ title: d.title, status: d.verificationStatus })),
        }));

        reply.send(result);
      }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SEGMENT CONTEXT — aggregated panel data for dashboard sub-tabs
  // ─────────────────────────────────────────────────────────────

  const segmentCategoryMap: Record<string, string[]> = {
    athletes: ["ATHLETE", "VISITING_JUMPER"],
    students: ["STUDENT"],
    tandem: ["TANDEM"],
    staff: ["STAFF"],
    managers: ["DZ_MANAGER"],
  };

  fastify.get(
    "/onboarding/segment/:segment/context",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const segment = (request.params as { segment: string }).segment;
      const rawDz = request.user?.dropzoneId;
      const dropzoneId = rawDz ? parseInt(rawDz, 10) : NaN;
      const isPlatformAdmin = (request.user?.roles ?? []).includes("PLATFORM_ADMIN");

      const empty = {
        documents: [] as any[],
        waivers: [] as any[],
        licenses: [] as any[],
        skills: [] as any[],
        athleteInterests: null as Record<string, boolean> | null,
        coachInterests: null as Record<string, boolean> | null,
        rules: [] as any[],
        notifications: [] as any[],
        history: [] as any[],
        medical: null as { declared: boolean; riskFlags: string[]; reviewedBy: string | null } | null,
      };

      // Coach / instructor — CoachApplication (scoped by dropzoneId when present)
      if (segment === "coaches" || segment === "instructors") {
        if (!isPlatformAdmin && !Number.isFinite(dropzoneId)) {
          return reply.status(403).send({ error: "Dropzone scope required for this segment" });
        }
        const baseCoachWhere: Prisma.CoachApplicationWhereInput =
          segment === "coaches"
            ? { applicationType: "COACH" }
            : { applicationType: { in: ["INSTRUCTOR", "TI", "AFFI"] } };
        let coachWhere: Prisma.CoachApplicationWhereInput = baseCoachWhere;
        if (!isPlatformAdmin) {
          const userIdsAtDz = await getUserIdsWithRoleAtDropzone(fastify.prisma, dropzoneId);
          coachWhere = coachApplicationWhereForTenant(dropzoneId, baseCoachWhere, userIdsAtDz);
        }
        const coachApps = await fastify.prisma.coachApplication.findMany({
          where: coachWhere,
          orderBy: { updatedAt: "desc" },
          take: 100,
        });

        const tplWhere: {
          dropzoneId?: number;
          category: "COACH" | "INSTRUCTOR";
          status: "ACTIVE";
        } = {
          category: segment === "coaches" ? "COACH" : "INSTRUCTOR",
          status: "ACTIVE",
        };
        if (Number.isFinite(dropzoneId)) {
          tplWhere.dropzoneId = dropzoneId;
        }
        const tplIds = await fastify.prisma.onboardingTemplate.findMany({
          where: tplWhere,
          select: { id: true },
          take: 80,
        });
        const templateIdList = tplIds.map((t) => t.id);

        let rules: Awaited<ReturnType<typeof fastify.prisma.approvalRule.findMany>>;
        if (Number.isFinite(dropzoneId)) {
          rules =
            templateIdList.length > 0
              ? await fastify.prisma.approvalRule.findMany({
                  where: { dropzoneId, OR: [{ templateId: { in: templateIdList } }, { templateId: null }] },
                  take: 50,
                })
              : await fastify.prisma.approvalRule.findMany({ where: { dropzoneId }, take: 50 });
        } else {
          rules =
            templateIdList.length > 0
              ? await fastify.prisma.approvalRule.findMany({
                  where: { OR: [{ templateId: { in: templateIdList } }, { templateId: null }] },
                  take: 50,
                })
              : await fastify.prisma.approvalRule.findMany({ take: 50 });
        }

        const userIds = coachApps.map((c) => c.userId).filter((x): x is number => x != null);
        const notifs =
          userIds.length > 0
            ? await fastify.prisma.notificationEvent.findMany({
                where: { userId: { in: userIds } },
                orderBy: { createdAt: "desc" },
                take: 40,
              })
            : [];

        const mapProfileDocStatus = (s: string) => {
          const u = s.toUpperCase();
          if (u === "VERIFIED") return "VERIFIED";
          if (u === "REJECTED") return "REJECTED";
          if (u === "EXPIRED") return "EXPIRED";
          return "PENDING";
        };

        const profileUserIds = [...new Set(coachApps.map((c) => c.userId).filter((x): x is number => x != null))];
        let profileDocs: Awaited<ReturnType<typeof fastify.prisma.document.findMany>> = [];
        if (profileUserIds.length > 0) {
          if (Number.isFinite(dropzoneId)) {
            profileDocs = await fastify.prisma.document.findMany({
              where: {
                userId: { in: profileUserIds },
                OR: [{ dropzoneId }, { dropzoneId: null }],
              },
              orderBy: { updatedAt: "desc" },
              take: 400,
            });
          } else if (isPlatformAdmin) {
            profileDocs = await fastify.prisma.document.findMany({
              where: { userId: { in: profileUserIds } },
              orderBy: { updatedAt: "desc" },
              take: 400,
            });
          }
        }

        const documents: any[] = [];
        const seenDocKeys = new Set<string>();
        for (const c of coachApps) {
          if (!c.userId) continue;
          for (const d of profileDocs) {
            if (d.userId !== c.userId) continue;
            const key = `${c.id}-${d.id}`;
            if (seenDocKeys.has(key)) continue;
            seenDocKeys.add(key);
            documents.push({
              applicationId: c.id,
              id: d.id,
              name: d.title,
              type: d.documentType,
              status: mapProfileDocStatus(d.status),
              source: "PROFILE",
              expiryDate: d.expiresAt ? d.expiresAt.toISOString().split("T")[0] : null,
              uploadedAt: d.createdAt.toISOString().split("T")[0],
            });
          }
        }

        const waivers: any[] = [];
        const licenses: any[] = [];
        const skills: any[] = [];
        for (const c of coachApps) {
          const disciplines = Array.isArray(c.disciplines) ? (c.disciplines as string[]) : [];
          for (const d of disciplines) {
            skills.push({
              type: d,
              selfLevel: "INTERMEDIATE",
              verifiedLevel: null as string | null,
              interest: "HIGH",
            });
          }
          if (c.licenseType || c.licenseNumber) {
            licenses.push({
              id: c.id,
              type: c.licenseType || "License",
              number: c.licenseNumber || "",
              issuingBody: c.homeDropzone || "—",
              issueDate: c.reviewedAt ? c.reviewedAt.toISOString().split("T")[0] : "—",
              expiryDate: null,
              status: c.status === "APPROVED" || c.status === "LIMITED_APPROVAL" ? "ACTIVE" : "PENDING",
            });
          }
          if (c.insuranceConfirmed) {
            const synKey = `${c.id}-decl-ins`;
            if (!seenDocKeys.has(synKey)) {
              seenDocKeys.add(synKey);
              documents.push({
                applicationId: c.id,
                id: c.id * 10000 + 1,
                name: "Insurance confirmation (declaration)",
                type: "INSURANCE",
                status: "VERIFIED",
                source: "DECLARATION",
                expiryDate: null,
                uploadedAt: c.updatedAt.toISOString().split("T")[0],
              });
            }
          }
        }

        const coachInterests: Record<string, boolean> = {
          wantsTiRating: coachApps.some((c) => c.applicationType === "TI"),
          wantsExaminerPath: false,
          wantsEvents: true,
          wantsCamps: true,
          wantsCompetitionCoaching: true,
          wantsTunnelCoaching: coachApps.some((c) => c.tunnelCoaching),
          wantsAffRating: coachApps.some((c) => c.applicationType === "AFFI"),
          wantsFreefly: true,
          wantsWingsuit: true,
          wantsCanopyCoaching: coachApps.some((c) => c.canopyCoaching),
        };

        const history = coachApps.slice(0, 30).map((c) => ({
          id: c.id,
          action: `Coach application ${c.status}`,
          actor: c.reviewedBy ? `User #${c.reviewedBy}` : "System",
          timestamp: c.updatedAt.toISOString(),
          details: c.reviewNotes || `${c.firstName} ${c.lastName} · ${c.email}`,
        }));

        return reply.send({
          ...empty,
          documents,
          waivers,
          licenses,
          skills,
          coachInterests,
          rules: rules.map((r) => ({
            id: r.id,
            name: r.name,
            conditions: JSON.stringify(r.conditionsJson || []),
            active: r.active,
            requiredReviewers: r.requiredReviewers,
          })),
          notifications: notifs.map((n) => ({
            id: n.id,
            channel: n.channel,
            subject: n.subject || n.eventType,
            status: n.status,
            sentAt: n.sentAt?.toISOString() || null,
          })),
          history,
          medical: { declared: false, riskFlags: [] as string[], reviewedBy: null },
        });
      }

      const categories = segmentCategoryMap[segment];
      if (!categories) {
        return reply.status(404).send({ error: "Unknown segment" });
      }

      if (!Number.isFinite(dropzoneId)) {
        return reply.status(403).send({ error: "Dropzone scope required for this segment" });
      }

      const applications = await fastify.prisma.onboardingApplication.findMany({
        where: { dropzoneId, template: { category: { in: categories as any[] } } },
        include: {
          template: { select: { id: true, name: true, category: true } },
          applicationDocuments: true,
          waiverAcknowledgements: {
            include: { waiver: { select: { title: true } } },
          },
          user: {
            include: {
              licenses: true,
              athlete: {
                include: { skills: true, interests: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 150,
      });

      const appIds = applications.map((a) => a.id);

      const documents = applications.flatMap((app) =>
        app.applicationDocuments.map((d) => ({
          id: d.id,
          name: d.title,
          type: d.documentType,
          status: d.verificationStatus,
          expiryDate: d.expiryDate ? d.expiryDate.toISOString().split("T")[0] : null,
          uploadedAt: d.createdAt.toISOString().split("T")[0],
        }))
      );

      const waivers = applications.flatMap((app) =>
        app.waiverAcknowledgements.map((w) => ({
          id: w.id,
          name: w.waiver.title,
          templateName: w.waiver.title,
          signedAt: w.signedAt ? w.signedAt.toISOString() : null,
          status: w.status === "SIGNED" ? "SIGNED" : "PENDING",
          version: w.version,
        }))
      );

      const licenses: any[] = [];
      for (const app of applications) {
        if (!app.user?.licenses) continue;
        for (const l of app.user.licenses) {
          licenses.push({
            id: l.id,
            type: l.type,
            number: l.number || "",
            issuingBody: l.type,
            issueDate: l.issuedAt ? l.issuedAt.toISOString().split("T")[0] : "—",
            expiryDate: l.expiresAt ? l.expiresAt.toISOString().split("T")[0] : null,
            status:
              l.expiresAt && l.expiresAt < new Date()
                ? "EXPIRED"
                : "ACTIVE",
          });
        }
      }

      const skills: any[] = [];
      for (const app of applications) {
        const ath = app.user?.athlete;
        if (!ath?.skills) continue;
        for (const s of ath.skills) {
          skills.push({
            type: s.skillType,
            selfLevel: s.selfAssessedLevel || "None",
            verifiedLevel: s.verifiedLevel,
            interest: s.interestLevel || "LOW",
          });
        }
      }

      const mergedInterests: Record<string, boolean> = {
        wantsCoachPath: false,
        wantsInstructorPath: false,
        wantsTunnelCoaching: false,
        wantsCompetition: false,
        wantsEvents: false,
        wantsCamps: false,
        wantsAff: false,
        wantsTandemTraining: false,
        wantsWingsuit: false,
        wantsFreefly: false,
        wantsCanopyCoaching: false,
      };
      for (const app of applications) {
        const intr = app.user?.athlete?.interests;
        if (!intr) continue;
        mergedInterests.wantsCoachPath ||= intr.wantsCoachPath;
        mergedInterests.wantsInstructorPath ||= intr.wantsInstructorPath;
        mergedInterests.wantsTunnelCoaching ||= intr.wantsTunnelCoaching;
        mergedInterests.wantsCompetition ||= intr.wantsCompetition;
        mergedInterests.wantsEvents ||= intr.wantsEvents;
        mergedInterests.wantsCamps ||= intr.wantsCamps;
        mergedInterests.wantsAff ||= intr.wantsAff;
        mergedInterests.wantsTandemTraining ||= intr.wantsTandemTraining;
        mergedInterests.wantsWingsuit ||= intr.wantsWingsuit;
        mergedInterests.wantsFreefly ||= intr.wantsFreefly;
        mergedInterests.wantsCanopyCoaching ||= intr.wantsCanopyCoaching;
      }

      let medical: { declared: boolean; riskFlags: string[]; reviewedBy: string | null } | null = null;
      for (const app of applications) {
        const meta = app.metadataJson as Record<string, any> | null;
        if (meta?.medical?.declared || meta?.medicalDeclaration) {
          medical = {
            declared: !!(meta.medical?.declared ?? meta.medicalDeclaration),
            riskFlags: Array.isArray(meta.medical?.riskFlags) ? meta.medical.riskFlags : [],
            reviewedBy: typeof meta.medical?.reviewedBy === "string" ? meta.medical.reviewedBy : null,
          };
          break;
        }
      }

      const templateIds = [...new Set(applications.map((a) => a.templateId))];
      const rules = await fastify.prisma.approvalRule.findMany({
        where: {
          dropzoneId,
          OR: [{ templateId: { in: templateIds } }, { templateId: null }],
        },
        take: 50,
      });

      const notifications =
        appIds.length > 0
          ? await fastify.prisma.notificationEvent.findMany({
              where: { applicationId: { in: appIds } },
              orderBy: { createdAt: "desc" },
              take: 40,
            })
          : [];

      const history = applications.slice(0, 25).map((app) => ({
        id: app.id,
        action: `Application ${app.status}`,
        actor: app.user
          ? `${app.user.firstName || ""} ${app.user.lastName || ""}`.trim() || "User"
          : app.externalContactName || "Guest",
        timestamp: app.updatedAt.toISOString(),
        details: app.template.name,
      }));

      return reply.send({
        ...empty,
        documents,
        waivers,
        licenses,
        skills,
        athleteInterests: mergedInterests,
        rules: rules.map((r) => ({
          id: r.id,
          name: r.name,
          conditions: JSON.stringify(r.conditionsJson || []),
          active: r.active,
          requiredReviewers: r.requiredReviewers,
        })),
        notifications: notifications.map((n) => ({
          id: n.id,
          channel: n.channel,
          subject: n.subject || n.eventType,
          status: n.status,
          sentAt: n.sentAt?.toISOString() || null,
        })),
        history,
        medical,
      });
    }
  );

  fastify.get(
    "/onboarding/dropzone-documents",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const docs = await fastify.prisma.document.findMany({
        where: { dropzoneId },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      reply.send({
        documents: docs.map((d) => ({
          id: String(d.id),
          title: d.title,
          documentType: d.documentType,
          status: d.status,
          expiresAt: d.expiresAt?.toISOString() ?? null,
          createdAt: d.createdAt.toISOString(),
          fileUrl: d.fileUrl,
          ownerName: d.user ? `${d.user.firstName} ${d.user.lastName}`.trim() : "Unknown",
          ownerUserId: d.userId,
        })),
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // TEMPLATES CRUD
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/templates",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const templates = await fastify.prisma.onboardingTemplate.findMany({
        where: { dropzoneId },
        include: {
          steps: { orderBy: { orderIndex: "asc" } },
          _count: { select: { applications: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      const result = await Promise.all(templates.map(async (t) => {
        const completed = await fastify.prisma.onboardingApplication.count({
          where: { templateId: t.id, status: "APPROVED" },
        });
        return {
          id: t.uuid,
          name: t.name,
          category: t.category,
          flowKey: t.flowKey,
          accessMode: t.accessMode,
          status: t.status,
          applicationsCount: t._count.applications,
          completionRate: t._count.applications > 0 ? Math.round((completed / t._count.applications) * 100) : 0,
          externalSlug: t.externalSlug,
          version: t.version,
        };
      }));

      reply.send(result);
    }
  );

  fastify.post(
    "/onboarding/templates",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const body = createTemplateSchema.parse(request.body);
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const template = await fastify.prisma.onboardingTemplate.create({
        data: {
          uuid: randomUUID(),
          dropzoneId,
          category: body.category as any,
          name: body.name,
          description: body.description,
          flowKey: body.flowKey,
          externalSlug: body.externalSlug,
          accessMode: body.accessMode as any,
          requireLogin: body.requireLogin,
          allowGuestMode: body.allowGuestMode,
          eligibilityRules: body.eligibilityRules || [],
          status: "ACTIVE",
        },
      });

      reply.status(201).send(template);
    }
  );

  fastify.get(
    "/onboarding/templates/:id",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const orClause: Array<{ uuid: string } | { id: number }> = [{ uuid: id }];
      if (/^\d+$/.test(id)) {
        orClause.push({ id: parseInt(id, 10) });
      }
      const template = await fastify.prisma.onboardingTemplate.findFirst({
        where: { dropzoneId, OR: orClause },
        include: {
          steps: { orderBy: { orderIndex: "asc" } },
          applications: {
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          approvalRules: true,
          _count: { select: { applications: true } },
        },
      });
      if (!template) throw new NotFoundError("Template not found");

      const templateId = template.id;
      const [approvedCount, totalApps] = await Promise.all([
        fastify.prisma.onboardingApplication.count({
          where: {
            templateId,
            status: { in: ["APPROVED", "CONDITIONALLY_APPROVED"] },
          },
        }),
        fastify.prisma.onboardingApplication.count({ where: { templateId } }),
      ]);
      const completionRate = totalApps === 0 ? 0 : Math.round((approvedCount / totalApps) * 100);

      reply.send({
        ...template,
        applicationsCount: totalApps,
        completionRate,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // APPLICATIONS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/applications",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const query = request.query as { status?: string; category?: string; limit?: string };

      const where: any = { dropzoneId };
      if (query.status) where.status = query.status;
      if (query.category) where.template = { category: query.category };

      const apps = await fastify.prisma.onboardingApplication.findMany({
        where,
        include: {
          template: { select: { name: true, category: true, flowKey: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
          stepResponses: true,
        },
        orderBy: { createdAt: "desc" },
        take: parseInt(query.limit || "50"),
      });

      reply.send(apps);
    }
  );

  fastify.get(
    "/onboarding/applications/:id",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const app = await fastify.prisma.onboardingApplication.findFirst({
        where: applicationWhereByParam(id, dropzoneId),
        include: {
          template: { include: { steps: true } },
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          stepResponses: { include: { step: true } },
          applicationDocuments: true,
          waiverAcknowledgements: true,
        },
      });
      if (!app) throw new NotFoundError("Application not found");
      reply.send(app);
    }
  );

  // Update application status (approve/reject)
  fastify.patch(
    "/onboarding/applications/:id/status",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "MANIFEST_STAFF", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = updateApplicationStatusSchema.parse(request.body);
      const userId = parseInt(String(request.user!.sub));

      const existing = await fastify.prisma.onboardingApplication.findFirst({
        where: applicationWhereByParam(id, dropzoneId),
        select: { id: true },
      });
      if (!existing) throw new NotFoundError("Application not found");

      const updateData: any = { status: body.status, reviewNotes: body.reviewNotes };
      if (body.status === "APPROVED") updateData.approvedAt = new Date();
      if (body.status === "REJECTED") {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = body.rejectionReason;
      }
      updateData.assignedReviewerId = userId;

      const updated = await fastify.prisma.onboardingApplication.update({
        where: { id: existing.id },
        data: updateData,
      });

      reply.send(updated);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // APPROVALS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/approvals",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const pendingApps = await fastify.prisma.onboardingApplication.findMany({
        where: { dropzoneId, status: { in: ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_MISSING"] } },
        include: {
          template: { select: { name: true, category: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
          applicationDocuments: { where: { verificationStatus: "PENDING" } },
        },
        orderBy: { submittedAt: "asc" },
      });

      const priorityMap: Record<string, string> = { DOCUMENTS_MISSING: "high", SUBMITTED: "normal", UNDER_REVIEW: "normal" };
      const result = pendingApps.map((app) => ({
        id: String(app.id),
        personName: app.user ? `${app.user.firstName} ${app.user.lastName}` : app.externalContactName || "Guest",
        itemType: "application" as const,
        description: `${app.template.name} (${app.template.category})`,
        submittedAt: app.submittedAt?.toISOString() || app.createdAt.toISOString(),
        priority: priorityMap[app.status] || "normal",
      }));
      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SMART ROUTING — determine correct flow for a user
  // Evaluates template.eligibilityRules + hardcoded fallbacks
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/smart-route/:flowKey",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { flowKey } = request.params as { flowKey: string };
      const userId = parseInt(String(request.user!.sub));
      const dropzoneId = request.user!.dropzoneId ? parseInt(request.user!.dropzoneId, 10) : undefined;

      // Gather user profile data for smart routing
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          athlete: { include: { skills: true, interests: true } },
          instructorSkills: true,
          licenses: true,
          documents: true,
          waiverSignatures: true,
          emergencyProfile: true,
        },
      });

      if (!user) throw new NotFoundError("User not found");

      // Build profile context for rule evaluation
      const totalJumps = user.athlete?.totalJumps || 0;
      const licenseLevel = user.licenses.length > 0 ? user.licenses[0].level || "" : "";
      const hasCoachRating = user.instructorSkills.some((s) => s.skillTypeId && ["COACH", "AFF", "TANDEM"].includes(String(s.skillTypeId)));
      const hasValidLicense = user.licenses.some((l) => l.expiresAt && l.expiresAt > new Date());
      const hasWaiver = user.waiverSignatures.length > 0;
      const hasEmergencyContact = !!user.emergencyProfile;
      const documentCount = user.documents.length;
      const hasProfilePhoto = user.documents.some((d) => d.documentType === "PHOTO_ID");
      const yearsExperience = totalJumps > 0 ? Math.floor(totalJumps / 200) : 0;

      const profileCtx: Record<string, any> = {
        totalJumps,
        licenseLevel,
        hasCoachRating,
        hasValidLicense,
        hasWaiver,
        hasEmergencyContact,
        documentCount,
        hasProfilePhoto,
        yearsExperience,
        age: null, // derived from profile if available
        nationality: null,
        weight: null,
      };

      // Try to find a template with eligibilityRules in the DB
      let recommendedTemplate: string | null = null;
      let skipSteps: string[] = [];
      let message: string | null = null;
      let eligible = true;
      const warnings: string[] = [];

      if (dropzoneId) {
        const templates = await fastify.prisma.onboardingTemplate.findMany({
          where: { dropzoneId, flowKey, status: "ACTIVE" },
        });

        for (const tpl of templates) {
          const rules = tpl.eligibilityRules as any[];
          if (rules && rules.length > 0) {
            const result = evaluateEligibilityRules(rules, profileCtx);
            if (result.eligible) {
              recommendedTemplate = tpl.flowKey;
              message = result.message || null;
              skipSteps = result.skipSteps;
              break;
            } else {
              warnings.push(...result.warnings);
            }
          } else {
            // Template exists but no rules — default eligible
            recommendedTemplate = tpl.flowKey;
          }
        }
      }

      // Fallback to hardcoded routing if no DB template matched
      if (!recommendedTemplate) {
        switch (flowKey) {
          case "coach":
            if (hasCoachRating) {
              recommendedTemplate = "coach-onboarding";
              skipSteps = ["personal-info"];
              message = "Existing coach rating detected. Routed to profile completion.";
            } else if (totalJumps >= 200) {
              recommendedTemplate = "coach-interest";
              skipSteps = ["personal-info"];
              message = "You meet the minimum jump requirement. Complete the interest pathway.";
            } else {
              recommendedTemplate = "coach-interest";
              message = `You have ${totalJumps} jumps. Minimum 200 jumps recommended for coaching path.`;
              eligible = totalJumps >= 50; // Hard minimum
              if (!eligible) warnings.push("You need at least 50 jumps to begin the coaching pathway.");
            }
            break;
          case "instructor":
            if (totalJumps >= 500 && hasValidLicense) {
              recommendedTemplate = "instructor-application";
              skipSteps = ["personal-info"];
              message = "You meet the requirements for instructor application.";
            } else {
              recommendedTemplate = "instructor-interest";
              if (totalJumps < 500) warnings.push(`You have ${totalJumps} jumps. Minimum 500 required for instructor path.`);
              if (!hasValidLicense) warnings.push("A valid license is required to apply as an instructor.");
              eligible = false;
              message = "You do not yet meet the minimum requirements for instructor application.";
            }
            break;
          case "visiting-jumper":
            recommendedTemplate = "visiting-jumper";
            if (hasValidLicense) skipSteps.push("license-upload");
            if (hasWaiver) skipSteps.push("waiver");
            if (hasEmergencyContact) skipSteps.push("emergency");
            skipSteps.push("personal-info");
            break;
          case "tandem":
            recommendedTemplate = "tandem-registration";
            skipSteps = ["personal-info"];
            if (profileCtx.weight && profileCtx.weight > 240) {
              warnings.push("Weight exceeds the maximum limit of 240 lbs for tandem jumps.");
              eligible = false;
            }
            if (profileCtx.age !== null && profileCtx.age < 18) {
              warnings.push("Tandem participants must be at least 18 years old.");
              eligible = false;
            }
            break;
          case "student":
            recommendedTemplate = "aff-student";
            skipSteps = ["personal-info"];
            if (profileCtx.age !== null && profileCtx.age < 18) {
              warnings.push("Students must be at least 18 years old.");
              eligible = false;
            }
            break;
          default:
            recommendedTemplate = flowKey;
        }
      }

      reply.send({
        flowKey,
        recommendedTemplate,
        skipSteps,
        message,
        eligible,
        warnings,
        profile: {
          totalJumps,
          licenseLevel,
          hasCoachRating,
          hasValidLicense,
          hasWaiver,
          hasEmergencyContact,
          documentCount,
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // INTERNAL ONBOARDING — resolve template + submit (authenticated)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/internal/:flowKey",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { flowKey } = request.params as { flowKey: string };
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));

      const template = await fastify.prisma.onboardingTemplate.findFirst({
        where: { dropzoneId, flowKey, status: "ACTIVE" },
        include: { steps: { orderBy: { orderIndex: "asc" } } },
      });

      if (!template) throw new NotFoundError("Onboarding template not found");

      // Gather user profile for smart pre-fill
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          athlete: true,
          licenses: true,
          waiverSignatures: true,
          emergencyProfile: true,
          instructorSkills: true,
        },
      });

      const hasValidLicense = user?.licenses.some((l) => l.expiresAt && l.expiresAt > new Date()) || false;
      const hasWaiver = (user?.waiverSignatures.length || 0) > 0;
      const hasEmergencyContact = !!user?.emergencyProfile;
      const hasCoachRating = user?.instructorSkills.some((s) => s.skillTypeId && ["COACH", "AFF", "TANDEM"].includes(String(s.skillTypeId))) || false;

      // Check for existing in-progress application
      const existingApp = await fastify.prisma.onboardingApplication.findFirst({
        where: { templateId: template.id, userId, status: { in: ["DRAFT", "IN_PROGRESS"] } },
        include: { stepResponses: true },
      });

      const completedStepIds = existingApp?.stepResponses.filter((r) => r.completed).map((r) => r.stepId) || [];
      const completedStepKeys = template.steps.filter((s) => completedStepIds.includes(s.id)).map((s) => s.key);

      reply.send({
        templateId: template.uuid,
        name: template.name,
        description: template.description,
        category: template.category,
        applicationId: existingApp?.uuid || null,
        completedSteps: completedStepKeys,
        prefilled: {
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          totalJumps: user?.athlete?.totalJumps || 0,
        },
        profile: { hasValidLicense, hasWaiver, hasEmergencyContact, hasCoachRating },
        steps: template.steps.map((s) => ({
          key: s.key,
          label: s.label,
          description: s.description,
          type: s.type,
          required: s.required,
          fields: s.fieldsConfig,
          alreadyCompleted: completedStepKeys.includes(s.key),
          skippable: completedStepKeys.includes(s.key),
          conditionRules: s.conditionRules,
        })),
      });
    }
  );

  fastify.post(
    "/onboarding/internal/:flowKey/submit",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { flowKey } = request.params as { flowKey: string };
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const body = request.body as any;

      const template = await fastify.prisma.onboardingTemplate.findFirst({
        where: { dropzoneId, flowKey, status: "ACTIVE" },
        include: { steps: true },
      });

      if (!template) throw new NotFoundError("Template not found");

      // Upsert application
      let application = await fastify.prisma.onboardingApplication.findFirst({
        where: { templateId: template.id, userId, status: { in: ["DRAFT", "IN_PROGRESS"] } },
      });

      if (application) {
        application = await fastify.prisma.onboardingApplication.update({
          where: { id: application.id },
          data: { status: "SUBMITTED", submittedAt: new Date(), completionPercent: 100, metadataJson: body },
        });
      } else {
        application = await fastify.prisma.onboardingApplication.create({
          data: {
            uuid: randomUUID(),
            orgId: template.orgId || undefined,
            dropzoneId,
            templateId: template.id,
            userId,
            sourceChannel: "INTERNAL",
            status: "SUBMITTED",
            submittedAt: new Date(),
            completionPercent: 100,
            metadataJson: body,
          },
        });
      }

      // Save step responses
      for (const [stepKey, values] of Object.entries(body)) {
        const step = template.steps.find((s) => s.key === stepKey);
        if (step) {
          await fastify.prisma.applicationStepResponse.upsert({
            where: { applicationId_stepId: { applicationId: application.id, stepId: step.id } },
            create: { applicationId: application.id, stepId: step.id, valueJson: values as any, completed: true, completedAt: new Date() },
            update: { valueJson: values as any, completed: true, completedAt: new Date() },
          });
        }
      }

      reply.status(201).send({ id: application.uuid, status: "SUBMITTED" });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // EXTERNAL ONBOARDING (public, no auth)
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/external/:orgSlug/:templateSlug",
    async (request, reply) => {
      const { orgSlug, templateSlug } = request.params as { orgSlug: string; templateSlug: string };

      const org = await fastify.prisma.organization.findUnique({
        where: { slug: orgSlug },
        include: { dropzones: { take: 1 } },
      });
      if (!org || !org.dropzones[0]) throw new NotFoundError("Organization not found");

      const template = await fastify.prisma.onboardingTemplate.findFirst({
        where: { dropzoneId: org.dropzones[0].id, externalSlug: templateSlug, status: "ACTIVE" },
        include: { steps: { orderBy: { orderIndex: "asc" } } },
      });
      if (!template) throw new NotFoundError("Onboarding template not found");

      reply.send({
        id: template.uuid,
        name: template.name,
        description: template.description,
        category: template.category,
        orgName: org.name,
        requireLogin: template.requireLogin,
        allowGuestMode: template.allowGuestMode,
        steps: template.steps.map((s) => ({
          key: s.key,
          label: s.label,
          type: s.type,
          required: s.required,
          fields: s.fieldsConfig,
        })),
      });
    }
  );

  // Submit external application
  fastify.post(
    "/onboarding/external/:orgSlug/:templateSlug/submit",
    async (request, reply) => {
      const { orgSlug, templateSlug } = request.params as { orgSlug: string; templateSlug: string };
      const body = request.body as any;

      const org = await fastify.prisma.organization.findUnique({
        where: { slug: orgSlug },
        include: { dropzones: { take: 1 } },
      });
      if (!org || !org.dropzones[0]) throw new NotFoundError("Organization not found");

      const template = await fastify.prisma.onboardingTemplate.findFirst({
        where: { dropzoneId: org.dropzones[0].id, externalSlug: templateSlug, status: "ACTIVE" },
        include: { steps: true },
      });
      if (!template) throw new NotFoundError("Template not found");

      // Create application
      const application = await fastify.prisma.onboardingApplication.create({
        data: {
          uuid: randomUUID(),
          orgId: org.id,
          dropzoneId: org.dropzones[0].id,
          templateId: template.id,
          externalContactEmail: body.email,
          externalContactPhone: body.phone,
          externalContactName: body.firstName ? `${body.firstName} ${body.lastName || ''}`.trim() : undefined,
          sourceChannel: "EXTERNAL_LINK",
          status: "SUBMITTED",
          submittedAt: new Date(),
          completionPercent: 100,
          metadataJson: body,
        },
      });

      // Create step responses
      for (const [stepKey, values] of Object.entries(body)) {
        const step = template.steps.find((s) => s.key === stepKey);
        if (step) {
          await fastify.prisma.applicationStepResponse.create({
            data: {
              applicationId: application.id,
              stepId: step.id,
              valueJson: values as any,
              completed: true,
              completedAt: new Date(),
            },
          });
        }
      }

      reply.status(201).send({ id: application.uuid, status: "SUBMITTED" });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // SEGMENTS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/segments",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const segments = await fastify.prisma.segment.findMany({
        where: { dropzoneId },
        orderBy: { name: "asc" },
      });
      reply.send(segments);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // AUTOMATIONS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/automations",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const automations = await fastify.prisma.automationRule.findMany({
        where: { dropzoneId },
        orderBy: { createdAt: "desc" },
      });
      const result = automations.map((a) => ({
        id: a.uuid,
        name: a.name,
        trigger: a.triggerEvent,
        category: a.category || "GENERAL",
        active: a.active,
        runCount: a.runCount,
        lastRunAt: a.lastRunAt?.toISOString() || null,
      }));
      reply.send(result);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // CREATE AUTOMATION
  // ─────────────────────────────────────────────────────────────

  fastify.post(
    "/onboarding/automations",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const { name, description, category, triggerEvent } = request.body as {
        name: string;
        description?: string;
        category?: string;
        triggerEvent: string;
      };

      if (!name || !triggerEvent) {
        return reply.code(400).send({ error: "name and triggerEvent are required" });
      }

      const automation = await fastify.prisma.automationRule.create({
        data: {
          uuid: crypto.randomUUID(),
          dropzoneId,
          name,
          description: description || null,
          category: category || "NOTIFICATION",
          triggerEvent: triggerEvent as any,
          conditionsJson: [],
          actionsJson: [],
        },
      });

      reply.code(201).send({
        id: automation.uuid,
        name: automation.name,
        trigger: automation.triggerEvent,
        category: automation.category || "GENERAL",
        active: automation.active,
        runCount: automation.runCount,
        lastRunAt: null,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // UPDATE AUTOMATION
  // ─────────────────────────────────────────────────────────────

  fastify.put(
    "/onboarding/automations/:uuid",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };
      const { name, category, triggerEvent, active } = request.body as {
        name?: string;
        category?: string;
        triggerEvent?: string;
        active?: boolean;
      };

      const existing = await fastify.prisma.automationRule.findUnique({ where: { uuid } });
      if (!existing) return reply.code(404).send({ error: "Automation not found" });

      const automation = await fastify.prisma.automationRule.update({
        where: { uuid },
        data: {
          ...(name !== undefined && { name }),
          ...(category !== undefined && { category }),
          ...(triggerEvent !== undefined && { triggerEvent: triggerEvent as any }),
          ...(active !== undefined && { active }),
        },
      });

      reply.send({
        id: automation.uuid,
        name: automation.name,
        trigger: automation.triggerEvent,
        category: automation.category || "GENERAL",
        active: automation.active,
        runCount: automation.runCount,
        lastRunAt: automation.lastRunAt?.toISOString() || null,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────
  // DELETE AUTOMATION
  // ─────────────────────────────────────────────────────────────

  fastify.delete(
    "/onboarding/automations/:uuid",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const { uuid } = request.params as { uuid: string };

      const existing = await fastify.prisma.automationRule.findUnique({ where: { uuid } });
      if (!existing) return reply.code(404).send({ error: "Automation not found" });

      await fastify.prisma.automationRule.delete({ where: { uuid } });
      reply.code(204).send();
    }
  );

  // ─────────────────────────────────────────────────────────────
  // AI RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────

  fastify.get(
    "/onboarding/recommendations",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const recommendations: { id: string; type: string; title: string; description: string; priority: string; action: string }[] = [];

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
      const thirtyDaysOut = new Date(now.getTime() + 30 * 86400000);

      // 1. Stale pending approvals (submitted > 72h ago)
      const stalePending = await fastify.prisma.onboardingApplication.count({
        where: { dropzoneId, status: "SUBMITTED", submittedAt: { lte: threeDaysAgo } },
      });
      if (stalePending > 0) {
        recommendations.push({
          id: "stale-approvals",
          type: "warning",
          title: `Send reminder to ${stalePending} pending approval${stalePending > 1 ? "s" : ""} older than 72 hours`,
          description: "These applications have been waiting for review. Prompt action improves applicant experience.",
          priority: "high",
          action: "Review Applications",
        });
      }

      // 2. Expiring documents
      const expiringDocs = await fastify.prisma.document.count({
        where: { dropzoneId, expiresAt: { lte: thirtyDaysOut, gte: now } },
      });
      if (expiringDocs > 0) {
        recommendations.push({
          id: "expiring-docs",
          type: "warning",
          title: `${expiringDocs} document${expiringDocs > 1 ? "s" : ""} expiring within 30 days`,
          description: "Send renewal reminders before these documents expire to avoid compliance gaps.",
          priority: "high",
          action: "View Documents",
        });
      }

      // 3. Incomplete/abandoned applications
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const abandonedApps = await fastify.prisma.onboardingApplication.count({
        where: { dropzoneId, status: "IN_PROGRESS", updatedAt: { lte: sevenDaysAgo } },
      });
      if (abandonedApps > 0) {
        recommendations.push({
          id: "abandoned-apps",
          type: "action",
          title: `${abandonedApps} application${abandonedApps > 1 ? "s" : ""} inactive for 7+ days`,
          description: "These applicants may need a nudge. Consider sending a follow-up notification to encourage completion.",
          priority: "medium",
          action: "View Applications",
        });
      }

      // 4. No active templates
      const activeTemplates = await fastify.prisma.onboardingTemplate.count({
        where: { dropzoneId, status: "ACTIVE" },
      });
      if (activeTemplates === 0) {
        recommendations.push({
          id: "no-templates",
          type: "action",
          title: "No active onboarding templates — create one to get started",
          description: "Templates define your onboarding flows. Create at least one to begin accepting applications.",
          priority: "high",
          action: "Create Template",
        });
      }

      // 5. High rejection rate
      const [totalApps, rejectedApps] = await Promise.all([
        fastify.prisma.onboardingApplication.count({ where: { dropzoneId } }),
        fastify.prisma.onboardingApplication.count({ where: { dropzoneId, status: "REJECTED" } }),
      ]);
      if (totalApps > 5 && rejectedApps / totalApps > 0.3) {
        recommendations.push({
          id: "high-rejection",
          type: "insight",
          title: `High rejection rate: ${Math.round((rejectedApps / totalApps) * 100)}% of applications rejected`,
          description: "Review your eligibility criteria and onboarding instructions to reduce friction for applicants.",
          priority: "medium",
          action: "Review Templates",
        });
      }

      reply.send(recommendations);
    }
  );
}
