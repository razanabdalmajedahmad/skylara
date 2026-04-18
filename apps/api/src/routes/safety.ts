import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ValidationError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import { v4 as uuidv4 } from "uuid";

const reportIncidentSchema = z.object({
  incidentType: z.enum(["INJURY", "EQUIPMENT_FAILURE", "NEAR_MISS", "OTHER"]),
  description: z.string().min(10),
  location: z.string(),
  involvedUsers: z.array(z.string()).optional(),
  involvedParties: z.array(z.object({
    userId: z.string(),
    role: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

const medicalDeclarationSchema = z.object({
  hasConditions: z.boolean(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  lastPhysical: z.string().optional(), // ISO date string
  clearedToJump: z.boolean(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().optional(), // ISO date string
});

const updateIncidentSchema = z.object({
  status: z.enum(["REPORTED", "INVESTIGATING", "RESOLVED", "CLOSED"]).optional(),
  notes: z.string().optional(),
  assignedToId: z.number().int().positive().optional(),
  escalatedToFAA: z.boolean().optional(),
});

export async function safetyRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // Report incident
  fastify.post<{
    Body: z.infer<typeof reportIncidentSchema>;
  }>(
    "/incidents",
    {
      preHandler: [authenticate, tenantScope],
      schema: {
        body: {
          type: "object",
          required: ["incidentType", "description", "location"],
          properties: {
            incidentType: { type: "string", enum: ["INJURY", "EQUIPMENT_FAILURE", "NEAR_MISS", "OTHER"] },
            description: { type: "string" },
            location: { type: "string" },
            involvedUsers: { type: "array", items: { type: "string" } },
            involvedParties: { type: "array", items: { type: "object", properties: { userId: { type: "string" }, role: { type: "string" }, notes: { type: "string" } } } },
            severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const body = reportIncidentSchema.parse(request.body);

        // Map incidentType to IncidentSeverity
        const severityMap: Record<string, "NEAR_MISS" | "MINOR" | "MODERATE" | "SERIOUS" | "FATAL"> = {
          INJURY: "SERIOUS",
          EQUIPMENT_FAILURE: "MODERATE",
          NEAR_MISS: "NEAR_MISS",
          OTHER: "MINOR",
        };

        const incident = await fastify.prisma.incident.create({
          data: {
            uuid: uuidv4(),
            dropzoneId,
            reportedById: parseInt(String(request.user.sub)),
            title: `${body.incidentType}: ${body.location}`,
            description: body.description,
            location: body.location,
            severity: body.severity ? (severityMap[body.severity] || "MINOR") : "MINOR",
            status: "REPORTED",
            involvedUserIds: body.involvedUsers ? JSON.stringify(body.involvedUsers.map(id => parseInt(id))) : "[]",
          },
        });

        // Create IncidentInvolvedParty relational records
        if (body.involvedParties && body.involvedParties.length > 0) {
          // Use detailed involvedParties array when provided
          await (fastify.prisma.incidentInvolvedParty as any).createMany({
            data: body.involvedParties.map((party) => ({
              incidentId: incident.id,
              userId: parseInt(party.userId),
              roleInIncident: party.role || "INVOLVED",
              notes: party.notes || null,
            })),
          });
        } else if (body.involvedUsers && body.involvedUsers.length > 0) {
          // Fall back to involvedUsers with default role
          await (fastify.prisma.incidentInvolvedParty as any).createMany({
            data: body.involvedUsers.map((uid) => ({
              incidentId: incident.id,
              userId: parseInt(uid),
              roleInIncident: "INVOLVED",
            })),
          });
        }

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "INCIDENT_REPORT",
          entityType: "Incident",
          entityId: incident.id,
          afterState: body,
        });

        // If critical, broadcast emergency WebSocket event
        if (body.severity === "CRITICAL") {
          fastify.broadcastToDropzone(dropzoneId.toString(), {
            type: "CRITICAL_INCIDENT",
            data: {
              incidentId: incident.id,
              description: body.description,
              location: body.location,
            },
          });
        }

        reply.code(201).send({
          success: true,
          data: {
            incidentId: incident.id,
            uuid: incident.uuid,
            status: incident.status,
            severity: incident.severity,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to report incident",
        });
      }
    }
  );

  // List incidents
  fastify.get<{
    Querystring: { status?: string; severity?: string; limit?: string; offset?: string };
  }>(
    "/incidents",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR", "ADMIN"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const status = request.query.status;
        const severity = request.query.severity;
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const query: any = { dropzoneId };
        if (status) query.status = status;
        if (severity) query.severity = severity;

        const incidents = await fastify.prisma.incident.findMany({
          where: query,
          include: {
            reportedBy: true,
            assignedTo: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });

        reply.code(200).send({
          success: true,
          data: incidents.map((i) => ({
            id: i.id,
            uuid: i.uuid,
            title: i.title,
            description: i.description,
            location: i.location,
            severity: i.severity,
            status: i.status,
            reportedById: i.reportedById,
            reportedByName: `${i.reportedBy.firstName} ${i.reportedBy.lastName}`,
            assignedToId: i.assignedToId,
            assignedToName: i.assignedTo ? `${i.assignedTo.firstName} ${i.assignedTo.lastName}` : null,
            escalatedToFAA: i.escalatedToFAA,
            createdAt: i.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch incidents",
        });
      }
    }
  );

  // Update incident
  fastify.patch<{
    Params: { id: string };
    Body: z.infer<typeof updateIncidentSchema>;
  }>(
    "/incidents/:id",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR", "ADMIN"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }
        const params = request.params as { id: string };
        const incidentId = parseInt(params.id);
        const body = updateIncidentSchema.parse(request.body);

        const incident = await fastify.prisma.incident.findFirst({
          where: {
            id: incidentId,
            dropzoneId,
          },
        });

        if (!incident) {
          throw new NotFoundError("Incident");
        }

        const updateData: any = {};
        if (body.status) updateData.status = body.status;
        if (body.notes !== undefined) updateData.description = body.notes;
        if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
        if (body.escalatedToFAA !== undefined) updateData.escalatedToFAA = body.escalatedToFAA;

        const updated = await fastify.prisma.incident.update({
          where: { id: incidentId },
          data: updateData,
          include: { assignedTo: true },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "INCIDENT_REPORT",
          entityType: "Incident",
          entityId: incident.id,
          afterState: body,
        });

        reply.code(200).send({
          success: true,
          data: {
            incidentId: updated.id,
            uuid: updated.uuid,
            status: updated.status,
            assignedToId: updated.assignedToId,
            assignedToName: updated.assignedTo ? `${updated.assignedTo.firstName} ${updated.assignedTo.lastName}` : null,
            escalatedToFAA: updated.escalatedToFAA,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to update incident",
          });
        }
      }
    }
  );

  // Get emergency profile (public endpoint - no auth required)
  fastify.get<{
    Params: { id: string };
  }>(
    "/users/:id/emergency",
    async (request, reply) => {
      try {
        const userId = parseInt(request.params.id);
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            emergencyProfile: true,
            profile: true,
          },
        });

        if (!user || !user.emergencyProfile) {
          throw new NotFoundError("Emergency profile");
        }

        // Return only emergency-relevant info
        reply.code(200).send({
          success: true,
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.profile?.dateOfBirth,
            emergencyProfile: {
              bloodType: user.emergencyProfile.bloodType,
              medicalConditions: user.emergencyProfile.medicalConditions,
              allergies: user.emergencyProfile.allergies,
              primaryContactName: user.emergencyProfile.primaryContactName,
              primaryContactPhone: user.emergencyProfile.primaryContactPhone,
              insuranceProvider: user.emergencyProfile.insuranceProvider,
              insuranceNumber: user.emergencyProfile.insuranceNumber,
            },
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch emergency profile",
          });
        }
      }
    }
  );

  // Activate emergency mode (broadcast event)
  fastify.post<{}>(
    "/emergency/activate",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR", "ADMIN"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }

        // Log emergency activation as audit
        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "EMERGENCY_ACTIVATE",
          entityType: "Dropzone",
          entityId: dropzoneId,
          afterState: { activated: true },
        });

        // Broadcast emergency WebSocket event
        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "EMERGENCY_MODE",
          data: {
            activated: true,
            activatedAt: new Date(),
            activatedBy: request.user.sub,
            message: "EMERGENCY MODE ACTIVATED",
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Emergency mode activated",
            activatedAt: new Date(),
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to activate emergency mode",
        });
      }
    }
  );

  // ===================== RISK ASSESSMENT (Scenario 4) =====================

  // Assess risk for a flyer
  fastify.get<{ Params: { userId: string } }>(
    "/risk-assessment/:userId",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN", "SAFETY_OFFICER", "MANIFEST_STAFF"])] },
    async (request, reply) => {
      try {
        const { RiskFlagService } = await import("../services/riskFlagService");
        const riskService = new RiskFlagService(fastify.prisma);
        const dropzoneId = parseInt(request.user!.dropzoneId || "0", 10);
        const result = await riskService.assessRisk(parseInt(request.params.userId), dropzoneId);
        reply.send({ success: true, data: result });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to assess risk" });
      }
    }
  );

  // Block a flyer
  fastify.post<{ Params: { userId: string }; Body: { reason: string } }>(
    "/risk-assessment/:userId/block",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN", "SAFETY_OFFICER"])] },
    async (request, reply) => {
      try {
        const { RiskFlagService } = await import("../services/riskFlagService");
        const riskService = new RiskFlagService(fastify.prisma);
        const dropzoneId = parseInt(request.user!.dropzoneId || "0", 10);
        const blockedBy = parseInt(String(request.user!.sub));
        await riskService.blockFlyer(parseInt(request.params.userId), dropzoneId, (request.body as any)?.reason || "Blocked by DZ staff", blockedBy);
        reply.send({ success: true, message: "Flyer blocked" });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to block flyer" });
      }
    }
  );

  // Unblock a flyer
  fastify.post<{ Params: { userId: string } }>(
    "/risk-assessment/:userId/unblock",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const { RiskFlagService } = await import("../services/riskFlagService");
        const riskService = new RiskFlagService(fastify.prisma);
        const dropzoneId = parseInt(request.user!.dropzoneId || "0", 10);
        await riskService.unblockFlyer(parseInt(request.params.userId), dropzoneId, parseInt(String(request.user!.sub)));
        reply.send({ success: true, message: "Flyer unblocked" });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to unblock flyer" });
      }
    }
  );

  // ===================== MEDICAL DECLARATIONS =====================

  // Create or update medical declaration for the authenticated user
  fastify.post<{
    Body: z.infer<typeof medicalDeclarationSchema>;
  }>(
    "/medical-declaration",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }

        const userId = parseInt(String(request.user.sub));
        const body = medicalDeclarationSchema.parse(request.body);

        // Check for existing non-expired declaration for this user+dropzone
        const existing = await (fastify.prisma.medicalDeclaration as any).findFirst({
          where: {
            userId,
            dropzoneId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        const declarationData = {
          hasConditions: body.hasConditions,
          conditions: body.conditions || null,
          medications: body.medications || null,
          lastPhysical: body.lastPhysical ? new Date(body.lastPhysical) : null,
          clearedToJump: body.clearedToJump,
          doctorName: body.doctorName || null,
          doctorPhone: body.doctorPhone || null,
          notes: body.notes || null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          signedAt: new Date(),
        };

        let declaration;
        if (existing) {
          // Update existing declaration
          declaration = await (fastify.prisma.medicalDeclaration as any).update({
            where: { id: existing.id },
            data: declarationData,
          });
        } else {
          // Create new declaration
          declaration = await (fastify.prisma.medicalDeclaration as any).create({
            data: {
              userId,
              dropzoneId,
              ...declarationData,
            },
          });
        }

        await auditService.log({
          userId,
          dropzoneId,
          action: existing ? "UPDATE" : "CREATE",
          entityType: "MedicalDeclaration",
          entityId: declaration.id,
          afterState: { ...body, operation: existing ? "UPDATE" : "CREATE" },
        });

        reply.code(existing ? 200 : 201).send({
          success: true,
          data: {
            id: declaration.id,
            hasConditions: declaration.hasConditions,
            clearedToJump: declaration.clearedToJump,
            signedAt: declaration.signedAt,
            expiresAt: declaration.expiresAt,
            operation: existing ? "updated" : "created",
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Invalid medical declaration data",
            details: error.errors,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to save medical declaration",
          });
        }
      }
    }
  );

  // Get own medical declaration (any authenticated user)
  fastify.get(
    "/medical-declaration/me",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }

        const userId = parseInt(String(request.user.sub));

        const declaration = await (fastify.prisma.medicalDeclaration as any).findFirst({
          where: {
            userId,
            dropzoneId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        if (!declaration) {
          throw new NotFoundError("Medical declaration");
        }

        reply.code(200).send({
          success: true,
          data: {
            id: declaration.id,
            hasConditions: declaration.hasConditions,
            conditions: declaration.conditions,
            medications: declaration.medications,
            lastPhysical: declaration.lastPhysical,
            clearedToJump: declaration.clearedToJump,
            doctorName: declaration.doctorName,
            doctorPhone: declaration.doctorPhone,
            notes: declaration.notes,
            signedAt: declaration.signedAt,
            expiresAt: declaration.expiresAt,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch medical declaration",
          });
        }
      }
    }
  );

  // Get a user's medical declaration (staff-only, medical privacy)
  fastify.get<{
    Params: { userId: string };
  }>(
    "/medical-declaration/:userId",
    {
      preHandler: [authenticate, tenantScope, authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }

        const targetUserId = parseInt(request.params.userId);

        const declaration = await (fastify.prisma.medicalDeclaration as any).findFirst({
          where: {
            userId: targetUserId,
            dropzoneId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        if (!declaration) {
          throw new NotFoundError("Medical declaration");
        }

        reply.code(200).send({
          success: true,
          data: {
            id: declaration.id,
            userId: declaration.userId,
            hasConditions: declaration.hasConditions,
            conditions: declaration.conditions,
            medications: declaration.medications,
            lastPhysical: declaration.lastPhysical,
            clearedToJump: declaration.clearedToJump,
            doctorName: declaration.doctorName,
            doctorPhone: declaration.doctorPhone,
            notes: declaration.notes,
            signedAt: declaration.signedAt,
            expiresAt: declaration.expiresAt,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch medical declaration",
          });
        }
      }
    }
  );
}
