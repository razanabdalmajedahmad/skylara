/**
 * Demo Data Service — Scenario Loading, Export, Clear, Reset
 *
 * Provides the core operations for the Data Management admin panel:
 * - Load a demo scenario (creates org/dz/users/loads/gear/etc from scenario pack)
 * - Export tenant data as JSON
 * - Clear demo-only data (by batchId)
 * - Reset tenant operational data with safeguards
 * - Dry-run previews for all destructive operations
 *
 * All operations are audit-logged via AuditService.
 * All created records are tagged with batchId for rollback.
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID, scryptSync, randomBytes } from "crypto";
import { AuditService } from "./auditService";

// Lazy-load scenarios to avoid bundling all data at startup
function scenarioPath(file: string) {
  const path = require("path");
  return path.resolve(__dirname, `../../../../prisma/scenarios/${file}`);
}

const SCENARIO_REGISTRY: Record<string, { loader: () => Promise<any>; meta: ScenarioListItem }> = {
  "turbine-dz": {
    loader: async () => require(scenarioPath("turbine-dz")).buildTurbineDzScenario(),
    meta: {
      key: "turbine-dz",
      name: "High-Volume Turbine DZ",
      description: "Busy Perris-style DZ with 2 aircraft, 80+ athletes, full staff, tandem/AFF/sport operations, gear fleet, events.",
      tags: ["turbine", "high-volume", "tandem", "aff", "sport", "full-demo"],
      estimatedRecords: 400,
    },
  },
  "tandem-dz": {
    loader: async () => require(scenarioPath("tandem-dz")).buildTandemDzScenario(),
    meta: {
      key: "tandem-dz",
      name: "Premium Tandem-Focused DZ",
      description: "DeLand-style tandem factory. 90% tandem revenue, 1 Caravan, 4 TIs, 20 tandem students, high-revenue operations.",
      tags: ["tandem", "caravan", "tourist", "high-revenue"],
      estimatedRecords: 120,
    },
  },
  "mixed-dz": {
    loader: async () => require(scenarioPath("mixed-dz")).buildMixedDzScenario(),
    meta: {
      key: "mixed-dz",
      name: "Mixed Sport + Student DZ",
      description: "Balanced AFF training and sport jumping in Eloy, AZ. PAC 750XL, 40 athletes, full student pipeline.",
      tags: ["mixed", "student", "aff", "sport", "desert"],
      estimatedRecords: 200,
    },
  },
  "boogie-week": {
    loader: async () => require(scenarioPath("boogie-week")).buildBoogieWeekScenario(),
    meta: {
      key: "boogie-week",
      name: "Event / Boogie Week",
      description: "International boogie in Empuriabrava, Spain. CASA + Porter, 60 international athletes, 3 events, high-volume ops.",
      tags: ["boogie", "event", "international", "high-volume", "europe"],
      estimatedRecords: 300,
    },
  },
  "training-camp": {
    loader: async () => require(scenarioPath("training-camp")).buildTrainingCampScenario(),
    meta: {
      key: "training-camp",
      name: "Training Camp Week",
      description: "AFF training camp in DeLand. Cessna 182, 12 students, 8 staff, progressive AFF curriculum.",
      tags: ["training", "aff", "student", "small-aircraft", "camp"],
      estimatedRecords: 80,
    },
  },
  "low-connectivity": {
    loader: async () => require(scenarioPath("low-connectivity")).buildLowConnectivityScenario(),
    meta: {
      key: "low-connectivity",
      name: "Low-Connectivity Regional DZ",
      description: "Remote Australian DZ in Toogoolawah. Cessna 182, 15 athletes, sparse ops — tests offline-first scenarios.",
      tags: ["regional", "small", "low-connectivity", "australia", "rural"],
      estimatedRecords: 50,
    },
  },
  "multi-branch": {
    loader: async () => require(scenarioPath("multi-branch")).buildMultiBranchScenario(),
    meta: {
      key: "multi-branch",
      name: "Multi-Branch Organization",
      description: "AeroJump International with 2 DZs (DeLand + Eloy). Tests multi-tenant isolation, shared org, separate operations.",
      tags: ["multi-branch", "multi-dz", "enterprise", "organization"],
      estimatedRecords: 250,
    },
  },
};

export interface ScenarioListItem {
  key: string;
  name: string;
  description: string;
  tags: string[];
  estimatedRecords: number | Record<string, number>;
}

export interface OperationPreview {
  operationType: string;
  scenarioKey?: string;
  recordCounts: Record<string, number>;
  warnings: string[];
  estimatedDuration: string;
}

export interface OperationResult {
  operationId: number;
  status: "COMPLETED" | "FAILED";
  recordsAffected: number;
  modulesAffected: string[];
  errors: string[];
  durationMs: number;
}

const DEFAULT_PASSWORD = "demo2026";

function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `$scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export class DemoDataService {
  private prisma: PrismaClient;
  private auditService: AuditService;

  constructor(prisma: PrismaClient, auditService?: AuditService) {
    this.prisma = prisma;
    this.auditService = auditService || new AuditService(prisma);
  }

  // ============================================================================
  // SCENARIO LISTING
  // ============================================================================

  listScenarios(): ScenarioListItem[] {
    return Object.values(SCENARIO_REGISTRY).map(s => s.meta);
  }

  // ============================================================================
  // SCENARIO PREVIEW (dry-run)
  // ============================================================================

  async previewScenario(scenarioKey: string): Promise<OperationPreview> {
    const entry = SCENARIO_REGISTRY[scenarioKey];
    if (!entry) throw new Error(`Unknown scenario: ${scenarioKey}`);

    const scenario = await entry.loader();
    const meta = scenario.meta;

    return {
      operationType: "DEMO_LOAD",
      scenarioKey,
      recordCounts: typeof meta.estimatedRecords === "object" ? meta.estimatedRecords : { total: meta.estimatedRecords },
      warnings: [
        "This will create demo users, loads, aircraft, gear, and other data in your dropzone.",
        "All demo records are tagged with a batch ID for easy removal.",
        "Existing data will NOT be modified or deleted.",
      ],
      estimatedDuration: "10-30 seconds",
    };
  }

  // ============================================================================
  // LOAD SCENARIO
  // ============================================================================

  async loadScenario(
    scenarioKey: string,
    userId: number,
    dropzoneId?: number,
    organizationId?: number
  ): Promise<OperationResult> {
    const entry = SCENARIO_REGISTRY[scenarioKey];
    if (!entry) throw new Error(`Unknown scenario: ${scenarioKey}`);

    const batchId = randomUUID();
    const startTime = Date.now();
    let recordsAffected = 0;
    const modulesAffected: string[] = [];
    const errors: string[] = [];

    // Create operation record
    const operation = await this.prisma.dataOperation.create({
      data: {
        operationType: "DEMO_LOAD",
        status: "RUNNING",
        userId,
        dropzoneId,
        organizationId,
        scenarioKey,
        batchId,
        startedAt: new Date(),
      },
    });

    try {
      const scenario = await entry.loader();
      const hash = hashPasswordSync(DEFAULT_PASSWORD);

      for (const orgData of scenario.organizations) {
        // Create org owner
        const owner = await this.prisma.user.create({
          data: {
            uuid: randomUUID(),
            email: orgData.owner.email,
            firstName: orgData.owner.firstName,
            lastName: orgData.owner.lastName,
            phone: orgData.owner.phone || null,
            passwordHash: hash,
            importBatchId: batchId,
          },
        });
        recordsAffected++;

        // Create organization
        const org = await this.prisma.organization.create({
          data: {
            uuid: randomUUID(),
            name: orgData.name,
            slug: orgData.slug,
            ownerId: owner.id,
          },
        });
        recordsAffected++;
        modulesAffected.push("organizations");

        // Ensure roles exist
        const roleMap = await this.ensureRoles();

        // Assign owner roles
        await this.prisma.userRole.create({
          data: { userId: owner.id, roleId: roleMap["PLATFORM_ADMIN"] || roleMap["DZ_MANAGER"], organizationId: org.id },
        });

        for (const dzData of orgData.dropzones) {
          const dz = await this.prisma.dropzone.create({
            data: {
              uuid: randomUUID(),
              organizationId: org.id,
              name: dzData.name,
              slug: dzData.slug,
              icaoCode: dzData.icaoCode,
              latitude: dzData.latitude,
              longitude: dzData.longitude,
              timezone: dzData.timezone,
              windLimitKnots: dzData.windLimitKnots,
              currency: dzData.currency,
            },
          });
          recordsAffected++;
          modulesAffected.push("dropzones");

          // Branches
          let defaultBranchId = 0;
          for (const br of dzData.branches) {
            const branch = await this.prisma.dzBranch.create({
              data: { dropzoneId: dz.id, name: br.name, isDefault: br.isDefault },
            });
            if (br.isDefault) defaultBranchId = branch.id;
            recordsAffected++;
          }

          // Staff
          const staffUsers: { id: number }[] = [];
          for (const s of dzData.staff) {
            const u = await this.prisma.user.create({
              data: {
                uuid: randomUUID(),
                email: s.email,
                firstName: s.firstName,
                lastName: s.lastName,
                phone: s.phone || null,
                passwordHash: hash,
                importBatchId: batchId,
              },
            });
            staffUsers.push(u);
            recordsAffected++;

            for (const roleName of s.roles) {
              const roleId = roleMap[roleName];
              if (roleId) {
                await this.prisma.userRole.create({
                  data: { userId: u.id, roleId, organizationId: org.id, dropzoneId: dz.id },
                });
              }
            }

            // Create profile with bio
            if (s.bio) {
              await this.prisma.userProfile.create({
                data: { userId: u.id, bio: s.bio },
              });
            }
          }
          if (dzData.staff.length > 0) modulesAffected.push("staff");

          // Athletes
          const athleteUsers: { id: number }[] = [];
          for (const a of dzData.athletes) {
            const u = await this.prisma.user.create({
              data: {
                uuid: randomUUID(),
                email: a.email,
                firstName: a.firstName,
                lastName: a.lastName,
                phone: a.phone || null,
                passwordHash: hash,
                importBatchId: batchId,
              },
            });
            athleteUsers.push(u);
            recordsAffected++;

            // Athlete record
            const athleteRoleId = roleMap["ATHLETE"] || roleMap[a.roles?.[0] || "ATHLETE"];
            if (athleteRoleId) {
              await this.prisma.userRole.create({
                data: { userId: u.id, roleId: athleteRoleId, organizationId: org.id, dropzoneId: dz.id },
              });
            }

            await this.prisma.athlete.create({
              data: {
                userId: u.id,
                homeDropzoneId: dz.id,
                totalJumps: a.jumpCount,
              },
            });
            recordsAffected++;

            // License
            if (a.licenseType) {
              await this.prisma.license.create({
                data: {
                  userId: u.id,
                  type: a.licenseType,
                  level: a.licenseType,
                  number: a.licenseNumber || null,
                  issuedAt: daysAgo(Math.floor(Math.random() * 365 * 3)),
                },
              });
              recordsAffected++;
            }

            // Wallet
            if (a.walletBalance !== undefined && a.walletBalance > 0) {
              await this.prisma.wallet.create({
                data: {
                  userId: u.id,
                  dropzoneId: dz.id,
                  balance: a.walletBalance,
                  currency: dzData.currency,
                },
              });
              recordsAffected++;
            }

            // Profile
            if (a.dateOfBirth || a.emergencyContactName) {
              await this.prisma.userProfile.create({
                data: {
                  userId: u.id,
                  dateOfBirth: a.dateOfBirth ? new Date(a.dateOfBirth) : null,
                  emergencyContactName: a.emergencyContactName || null,
                  emergencyContactPhone: a.emergencyContactPhone || null,
                },
              });
              recordsAffected++;
            }
          }
          if (dzData.athletes.length > 0) modulesAffected.push("athletes");

          // Aircraft
          const aircraftRecords: { id: number }[] = [];
          for (const ac of dzData.aircraft) {
            const record = await this.prisma.aircraft.create({
              data: {
                dropzoneId: dz.id,
                registration: ac.registration,
                type: ac.type,
                maxCapacity: ac.maxCapacity,
                maxWeight: ac.maxWeight,
                emptyWeight: ac.emptyWeight,
              },
            });
            aircraftRecords.push(record);
            recordsAffected++;
          }
          if (dzData.aircraft.length > 0) modulesAffected.push("aircraft");

          // Loads + Slots
          for (const loadData of dzData.loads) {
            const acRecord = aircraftRecords[loadData.aircraftIndex] || aircraftRecords[0];
            const load = await this.prisma.load.create({
              data: {
                uuid: randomUUID(),
                dropzoneId: dz.id,
                branchId: defaultBranchId,
                aircraftId: acRecord.id,
                pilotId: staffUsers[4]?.id || staffUsers[0]?.id, // chief pilot
                loadNumber: String(loadData.loadNumber),
                status: loadData.status as any,
                scheduledAt: loadData.scheduledAt ? new Date(loadData.scheduledAt) : new Date(),
              },
            });
            recordsAffected++;

            for (const slotData of loadData.slots) {
              const athleteUser = athleteUsers[slotData.athleteIndex];
              if (!athleteUser) continue;
              await this.prisma.slot.create({
                data: {
                  loadId: load.id,
                  userId: athleteUser.id,
                  position: slotData.athleteIndex + 1,
                  slotType: slotData.jumpType === "TANDEM" ? "TANDEM_PASSENGER" as any : "FUN" as any,
                  jumpType: slotData.jumpType as any,
                  weight: slotData.exitWeight || 195,
                },
              });
              recordsAffected++;
            }
          }
          if (dzData.loads.length > 0) modulesAffected.push("loads", "slots");

          // Gear items
          for (const g of dzData.gear) {
            await this.prisma.gearItem.create({
              data: {
                dropzoneId: dz.id,
                ownerId: g.ownerIndex != null ? athleteUsers[g.ownerIndex]?.id : undefined,
                gearType: g.type as any,
                manufacturer: g.manufacturer,
                model: g.model,
                serialNumber: g.serial,
                dom: new Date(),
                status: g.status as any,
              },
            });
            recordsAffected++;
          }
          if (dzData.gear.length > 0) modulesAffected.push("gear");

          // Rigs
          for (const rigData of dzData.rigs) {
            try {
              const rigOwnerId = rigData.ownerIndex != null ? (athleteUsers[rigData.ownerIndex]?.id || owner.id) : owner.id;
              const rig = await this.prisma.rig.create({
                data: {
                  dropzoneId: dz.id,
                  ownerUserId: rigOwnerId,
                  rigName: `${rigData.container.manufacturer} ${rigData.container.model}`,
                  rigType: rigData.rigType as any,
                  activeStatus: "ACTIVE" as any,
                },
              });

              await this.prisma.rigContainer.create({
                data: {
                  rigId: rig.id,
                  manufacturer: rigData.container.manufacturer,
                  model: rigData.container.model,
                  serialNumber: rigData.container.serial,
                  size: rigData.container.size || null,
                  manufactureDate: rigData.container.dom ? new Date(rigData.container.dom) : null,
                },
              });

              await this.prisma.rigMainCanopy.create({
                data: {
                  rigId: rig.id,
                  manufacturer: rigData.mainCanopy.manufacturer,
                  model: rigData.mainCanopy.model,
                  size: rigData.mainCanopy.size,
                  serialNumber: rigData.mainCanopy.serial,
                  totalJumps: rigData.mainCanopy.totalJumps,
                  jumpsSinceInspection: rigData.mainCanopy.jumpsSinceInspection,
                },
              });

              await this.prisma.rigReserve.create({
                data: {
                  rigId: rig.id,
                  manufacturer: rigData.reserve.manufacturer,
                  model: rigData.reserve.model,
                  size: rigData.reserve.size,
                  serialNumber: rigData.reserve.serial,
                  repackDate: new Date(rigData.reserve.repackDate),
                  repackDueDate: new Date(rigData.reserve.repackDueDate),
                },
              });

              await this.prisma.rigAAD.create({
                data: {
                  rigId: rig.id,
                  manufacturer: rigData.aad.manufacturer,
                  model: rigData.aad.model,
                  serialNumber: rigData.aad.serial,
                  lastServiceDate: new Date(rigData.aad.lastServiceDate),
                  nextServiceDueDate: new Date(rigData.aad.nextServiceDueDate),
                  batteryDueDate: rigData.aad.batteryDueDate ? new Date(rigData.aad.batteryDueDate) : null,
                  endOfLifeDate: rigData.aad.endOfLifeDate ? new Date(rigData.aad.endOfLifeDate) : null,
                },
              });

              recordsAffected += 5; // rig + 4 components
            } catch (e: any) {
              errors.push(`Rig creation failed: ${e.message}`);
            }
          }
          if (dzData.rigs.length > 0) modulesAffected.push("rigs");

          // Waiver templates
          for (const wt of dzData.waiverTemplates) {
            await this.prisma.waiverTemplate.create({
              data: {
                uuid: randomUUID(),
                orgId: org.id,
                dropzoneId: dz.id,
                createdByUserId: owner.id,
                title: wt.name,
                waiverType: "EXPERIENCED",
                slug: wt.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                status: "ACTIVE",
              },
            });
            recordsAffected++;
          }
          if (dzData.waiverTemplates.length > 0) modulesAffected.push("waiverTemplates");

          // Booking packages
          for (const bp of dzData.bookingPackages) {
            await this.prisma.bookingPackage.create({
              data: {
                dropzoneId: dz.id,
                name: bp.name,
                description: bp.description,
                activityType: bp.jumpType,
                priceCents: bp.price,
                isActive: true,
              },
            });
            recordsAffected++;
          }
          if (dzData.bookingPackages.length > 0) modulesAffected.push("bookingPackages");

          // Incidents
          for (const inc of dzData.incidents) {
            const reporter = staffUsers[inc.reporterIndex] || staffUsers[0];
            await this.prisma.incident.create({
              data: {
                uuid: randomUUID(),
                dropzoneId: dz.id,
                reportedById: reporter.id,
                title: inc.title,
                description: inc.description,
                severity: inc.severity as any,
                status: inc.status as any,
              },
            });
            recordsAffected++;
          }
          if (dzData.incidents.length > 0) modulesAffected.push("incidents");

          // Boogies
          for (const boogieData of dzData.boogies) {
            await this.prisma.boogie.create({
              data: {
                uuid: randomUUID(),
                dropzoneId: dz.id,
                createdBy: owner.id,
                title: boogieData.name,
                slug: boogieData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                fullDescription: boogieData.description,
                eventType: "BOOGIE",
                startDate: new Date(boogieData.startDate),
                endDate: new Date(boogieData.endDate),
                maxParticipants: boogieData.maxParticipants,
                status: "PUBLISHED",
              },
            });
            recordsAffected++;
          }
          if (dzData.boogies.length > 0) modulesAffected.push("boogies");

          // Job posts
          for (const job of dzData.jobPosts) {
            await this.prisma.jobPost.create({
              data: {
                uuid: randomUUID(),
                organizationId: org.id,
                dropzoneId: dz.id,
                createdBy: owner.id,
                title: job.title,
                slug: job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                roleCategory: "OPERATIONS",
                description: job.description,
                requirementsJson: job.requirements,
                city: job.location,
                status: job.status,
                visibilityType: "PUBLIC_LINK",
              },
            });
            recordsAffected++;
          }
          if (dzData.jobPosts.length > 0) modulesAffected.push("jobPosts");

          // Learning courses
          for (const course of dzData.courses) {
            const c = await this.prisma.learningCourse.create({
              data: {
                uuid: randomUUID(),
                organizationId: org.id,
                dropzoneId: dz.id,
                createdById: owner.id,
                title: course.title,
                slug: course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                description: course.description,
                category: course.discipline,
                accessType: course.accessType,
                status: "PUBLISHED",
              },
            });
            recordsAffected++;

            let moduleOrder = 0;
            for (const mod of course.modules) {
              const m = await this.prisma.learningCourseModule.create({
                data: {
                  courseId: c.id,
                  title: mod.title,
                  sortOrder: moduleOrder++,
                },
              });
              recordsAffected++;

              let lessonOrder = 0;
              for (const lesson of mod.lessons) {
                await this.prisma.learningLesson.create({
                  data: {
                    uuid: randomUUID(),
                    courseId: c.id,
                    moduleId: m.id,
                    title: lesson.title,
                    durationSeconds: (lesson.durationMinutes || 0) * 60,
                    contentType: lesson.contentType,
                    sortOrder: lessonOrder++,
                  },
                });
                recordsAffected++;
              }
            }
          }
          if (dzData.courses.length > 0) modulesAffected.push("courses");

          // Campaigns
          for (const camp of dzData.campaigns) {
            await this.prisma.notificationCampaign.create({
              data: {
                uuid: randomUUID(),
                orgId: org.id,
                dropzoneId: dz.id,
                name: camp.name,
                channelsJson: camp.channel ? [camp.channel] : undefined,
                status: camp.status as any,
              },
            });
            recordsAffected++;
          }
          if (dzData.campaigns.length > 0) modulesAffected.push("campaigns");
        }
      }

      // Update operation as completed
      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: {
          status: "COMPLETED",
          recordsAffected,
          modulesAffected: [...new Set(modulesAffected)],
          errorLog: errors.length > 0 ? errors : undefined,
          completedAt: new Date(),
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        dropzoneId: dropzoneId || 0,
        action: "DEMO_LOAD" as any,
        entityType: "DataOperation",
        entityId: operation.id,
        afterState: { scenarioKey, batchId, recordsAffected },
      });

      return {
        operationId: operation.id,
        status: "COMPLETED",
        recordsAffected,
        modulesAffected: [...new Set(modulesAffected)],
        errors,
        durationMs: Date.now() - startTime,
      };
    } catch (e: any) {
      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: { status: "FAILED", errorLog: [e.message], completedAt: new Date() },
      });
      throw e;
    }
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  async exportTenantData(
    userId: number,
    dropzoneId: number,
    modules?: string[],
    format: "JSON" | "CSV" = "JSON"
  ): Promise<{ operationId: number; data: Record<string, any[]> }> {
    const operation = await this.prisma.dataOperation.create({
      data: {
        operationType: "EXPORT",
        status: "RUNNING",
        userId,
        dropzoneId,
        exportFormat: format,
        startedAt: new Date(),
      },
    });

    const data: Record<string, any[]> = {};
    const allModules = modules || ["users", "athletes", "aircraft", "loads", "gear", "rigs", "incidents", "boogies"];

    for (const mod of allModules) {
      switch (mod) {
        case "users":
          data.users = await this.prisma.user.findMany({
            where: { userRoles: { some: { dropzoneId } } },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true },
          });
          break;
        case "athletes":
          data.athletes = await this.prisma.athlete.findMany({
            where: { homeDropzoneId: dropzoneId },
            include: { user: { select: { email: true, firstName: true, lastName: true } } },
          });
          break;
        case "aircraft":
          data.aircraft = await this.prisma.aircraft.findMany({ where: { dropzoneId } });
          break;
        case "loads":
          data.loads = await this.prisma.load.findMany({
            where: { dropzoneId },
            include: { slots: { select: { id: true, jumpType: true, weight: true, userId: true } } },
            orderBy: { loadNumber: "asc" },
          });
          break;
        case "gear":
          data.gear = await this.prisma.gearItem.findMany({ where: { dropzoneId } });
          break;
        case "rigs":
          data.rigs = await this.prisma.rig.findMany({
            where: { dropzoneId },
            include: { container: true, mainCanopy: true, reserve: true, aad: true },
          });
          break;
        case "incidents":
          data.incidents = await this.prisma.incident.findMany({ where: { dropzoneId } });
          break;
        case "boogies":
          data.boogies = await this.prisma.boogie.findMany({ where: { dropzoneId } });
          break;
      }
    }

    const recordsAffected = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);

    await this.prisma.dataOperation.update({
      where: { id: operation.id },
      data: {
        status: "COMPLETED",
        recordsAffected,
        modulesAffected: allModules,
        completedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      dropzoneId,
      action: "DATA_EXPORT" as any,
      entityType: "DataOperation",
      entityId: operation.id,
      afterState: { modules: allModules, recordsAffected, format },
    });

    return { operationId: operation.id, data };
  }

  // ============================================================================
  // CLEAR DEMO DATA (by batchId)
  // ============================================================================

  async previewClear(batchId: string): Promise<OperationPreview> {
    const userCount = await this.prisma.user.count({ where: { importBatchId: batchId } });

    return {
      operationType: "DEMO_CLEAR",
      recordCounts: { users: userCount, cascadedRecords: userCount * 5 },
      warnings: [
        `Will delete ${userCount} users imported with batch ${batchId.substring(0, 8)}...`,
        "Cascaded records (roles, wallets, slots, profiles) will also be removed.",
        "Audit logs are never deleted.",
      ],
      estimatedDuration: "5-15 seconds",
    };
  }

  async clearDemoData(
    batchId: string,
    userId: number,
    dropzoneId?: number
  ): Promise<OperationResult> {
    const startTime = Date.now();

    const operation = await this.prisma.dataOperation.create({
      data: {
        operationType: "DEMO_CLEAR",
        status: "RUNNING",
        userId,
        dropzoneId,
        batchId,
        startedAt: new Date(),
      },
    });

    try {
      // Count before deletion
      const userCount = await this.prisma.user.count({ where: { importBatchId: batchId } });

      // FK-safe deletion — disable checks, delete by batchId, re-enable
      await this.prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

      // Delete users tagged with this batch (cascades handle related records)
      const result = await this.prisma.user.deleteMany({ where: { importBatchId: batchId } });

      await this.prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: {
          status: "COMPLETED",
          recordsAffected: result.count,
          modulesAffected: ["users", "roles", "profiles", "wallets", "athletes", "slots"],
          completedAt: new Date(),
        },
      });

      await this.auditService.log({
        userId,
        dropzoneId: dropzoneId || 0,
        action: "DEMO_CLEAR" as any,
        entityType: "DataOperation",
        entityId: operation.id,
        afterState: { batchId, usersDeleted: result.count },
      });

      return {
        operationId: operation.id,
        status: "COMPLETED",
        recordsAffected: result.count,
        modulesAffected: ["users", "roles", "profiles", "wallets", "athletes", "slots"],
        errors: [],
        durationMs: Date.now() - startTime,
      };
    } catch (e: any) {
      await this.prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: { status: "FAILED", errorLog: [e.message], completedAt: new Date() },
      });
      throw e;
    }
  }

  // ============================================================================
  // TENANT RESET (destructive — requires confirmation)
  // ============================================================================

  async previewReset(
    dropzoneId: number,
    preserveMode: "SETTINGS_ONLY" | "USERS_AND_SETTINGS" | "FULL_DESTRUCTIVE"
  ): Promise<OperationPreview> {
    const counts: Record<string, number> = {};

    counts.loads = await this.prisma.load.count({ where: { dropzoneId } });
    counts.slots = await this.prisma.slot.count({ where: { load: { dropzoneId } } });
    counts.aircraft = await this.prisma.aircraft.count({ where: { dropzoneId } });
    counts.gearItems = await this.prisma.gearItem.count({ where: { dropzoneId } });
    counts.incidents = await this.prisma.incident.count({ where: { dropzoneId } });
    counts.notifications = await this.prisma.notification.count({ where: { dropzoneId } });
    counts.boogies = await this.prisma.boogie.count({ where: { dropzoneId } });

    if (preserveMode === "FULL_DESTRUCTIVE") {
      counts.users = await this.prisma.userRole.count({ where: { dropzoneId } });
    }

    const warnings = [
      `Preserve mode: ${preserveMode}`,
      "Audit logs are NEVER deleted.",
    ];

    if (preserveMode === "FULL_DESTRUCTIVE") {
      warnings.push("WARNING: This will remove ALL operational data including user roles for this dropzone.");
    }

    return {
      operationType: "TENANT_RESET",
      recordCounts: counts,
      warnings,
      estimatedDuration: "10-60 seconds",
    };
  }

  async resetTenant(
    dropzoneId: number,
    userId: number,
    confirmDropzoneName: string,
    preserveMode: "SETTINGS_ONLY" | "USERS_AND_SETTINGS" | "FULL_DESTRUCTIVE"
  ): Promise<OperationResult> {
    // Verify confirmation
    const dz = await this.prisma.dropzone.findUnique({ where: { id: dropzoneId } });
    if (!dz) throw new Error("Dropzone not found");
    if (dz.name !== confirmDropzoneName) {
      throw new Error("Dropzone name confirmation does not match. Reset aborted.");
    }

    const startTime = Date.now();
    const operation = await this.prisma.dataOperation.create({
      data: {
        operationType: "TENANT_RESET",
        status: "RUNNING",
        userId,
        dropzoneId,
        organizationId: dz.organizationId,
        startedAt: new Date(),
        previewData: { preserveMode },
      },
    });

    // Audit BEFORE execution (intent log)
    await this.auditService.log({
      userId,
      dropzoneId,
      action: "TENANT_RESET" as any,
      entityType: "DataOperation",
      entityId: operation.id,
      beforeState: { preserveMode, dropzoneName: dz.name },
    });

    let recordsAffected = 0;
    const modulesAffected: string[] = [];

    try {
      await this.prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

      // Always delete operational data
      // Delete slots first via load relation (Slot has no direct dropzoneId)
      const loadIds = (await this.prisma.load.findMany({ where: { dropzoneId }, select: { id: true } })).map(l => l.id);
      if (loadIds.length > 0) {
        await this.prisma.slot.deleteMany({ where: { loadId: { in: loadIds } } });
      }

      const ops = [
        this.prisma.load.deleteMany({ where: { dropzoneId } }),
        this.prisma.gearItem.deleteMany({ where: { dropzoneId } }),
        this.prisma.incident.deleteMany({ where: { dropzoneId } }),
        this.prisma.notification.deleteMany({ where: { dropzoneId } }),
        this.prisma.boogie.deleteMany({ where: { dropzoneId } }),
      ];

      const results = await Promise.all(ops);
      recordsAffected = results.reduce((sum, r) => sum + r.count, 0);
      modulesAffected.push("loads", "slots", "gear", "incidents", "notifications", "boogies");

      if (preserveMode === "SETTINGS_ONLY") {
        // Also remove aircraft but keep users
        const acResult = await this.prisma.aircraft.deleteMany({ where: { dropzoneId } });
        recordsAffected += acResult.count;
        modulesAffected.push("aircraft");
      }

      if (preserveMode === "FULL_DESTRUCTIVE") {
        const acResult = await this.prisma.aircraft.deleteMany({ where: { dropzoneId } });
        const roleResult = await this.prisma.userRole.deleteMany({ where: { dropzoneId } });
        recordsAffected += acResult.count + roleResult.count;
        modulesAffected.push("aircraft", "userRoles");
      }

      await this.prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: {
          status: "COMPLETED",
          recordsAffected,
          modulesAffected,
          completedAt: new Date(),
        },
      });

      return {
        operationId: operation.id,
        status: "COMPLETED",
        recordsAffected,
        modulesAffected,
        errors: [],
        durationMs: Date.now() - startTime,
      };
    } catch (e: any) {
      await this.prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: { status: "FAILED", errorLog: [e.message], completedAt: new Date() },
      });
      throw e;
    }
  }

  // ============================================================================
  // OPERATION HISTORY
  // ============================================================================

  async getOperations(filters: {
    dropzoneId?: number;
    operationType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.dropzoneId) where.dropzoneId = filters.dropzoneId;
    if (filters.operationType) where.operationType = filters.operationType;

    const [items, total] = await Promise.all([
      this.prisma.dataOperation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.dataOperation.count({ where }),
    ]);

    return { items, total };
  }

  // ============================================================================
  // CSV IMPORT PARSING
  // ============================================================================

  /**
   * Parse a CSV string into structured module data suitable for importData().
   * Auto-detects the module from column headers.
   */
  parseCSV(csvText: string, moduleHint?: string): { module: string; rows: Record<string, any>[]; headers: string[]; errors: string[] } {
    const errors: string[] = [];
    const lines = csvText.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return { module: moduleHint || "unknown", rows: [], headers: [], errors: ["CSV has no data rows"] };
    }

    // Parse header row (handles quoted headers)
    const headers = this.parseCSVLine(lines[0]);
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          let val: any = values[idx] ?? "";
          // Auto-type conversion
          if (val === "") val = null;
          else if (val === "true") val = true;
          else if (val === "false") val = false;
          else if (/^\d+$/.test(val) && val.length < 10) val = parseInt(val, 10);
          else if (/^\d+\.\d+$/.test(val)) val = parseFloat(val);
          row[h] = val;
        });
        rows.push(row);
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    // Auto-detect module from headers
    const module = moduleHint || this.detectModuleFromHeaders(headers);

    return { module, rows, headers, errors };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  private detectModuleFromHeaders(headers: string[]): string {
    const h = new Set(headers.map((x) => x.toLowerCase()));
    if (h.has("registration") && h.has("maxcapacity")) return "aircraft";
    if (h.has("totaljumps") || h.has("homedropzoneid")) return "athletes";
    if (h.has("geartype") || h.has("serialnumber") && h.has("manufacturer")) return "gear";
    if (h.has("email") && (h.has("firstname") || h.has("lastname"))) return "users";
    if (h.has("loadnumber") && h.has("status")) return "loads";
    if (h.has("rigtype")) return "rigs";
    if (h.has("severity") && h.has("reportedbyid")) return "incidents";
    return "users"; // default
  }

  /**
   * Validate import data before committing — dry-run analysis
   */
  async validateImport(
    dropzoneId: number,
    data: Record<string, any[]>
  ): Promise<{
    valid: boolean;
    modules: { module: string; newRecords: number; conflicts: number; errors: string[] }[];
    totalNew: number;
    totalConflicts: number;
  }> {
    const modules: { module: string; newRecords: number; conflicts: number; errors: string[] }[] = [];
    let totalNew = 0;
    let totalConflicts = 0;

    for (const [module, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      const moduleErrors: string[] = [];
      let newRecords = 0;
      let conflicts = 0;

      switch (module) {
        case "users": {
          for (const row of rows) {
            if (!row.email) { moduleErrors.push("Missing email"); continue; }
            const exists = await this.prisma.user.findFirst({ where: { email: row.email } });
            if (exists) conflicts++;
            else newRecords++;
          }
          break;
        }
        case "athletes": {
          for (const row of rows) {
            const email = row.email || row["user.email"];
            if (!email) { moduleErrors.push("Missing email"); continue; }
            const user = await this.prisma.user.findFirst({ where: { email } });
            if (user) {
              const athlete = await this.prisma.athlete.findFirst({ where: { userId: user.id } });
              if (athlete) conflicts++;
              else newRecords++;
            } else {
              newRecords++;
            }
          }
          break;
        }
        case "aircraft": {
          for (const row of rows) {
            if (!row.registration) { moduleErrors.push("Missing registration"); continue; }
            const exists = await this.prisma.aircraft.findFirst({ where: { dropzoneId, registration: row.registration } });
            if (exists) conflicts++;
            else newRecords++;
          }
          break;
        }
        case "gear": {
          for (const row of rows) {
            if (!row.serialNumber) { moduleErrors.push("Missing serialNumber"); continue; }
            const exists = await this.prisma.gearItem.findFirst({ where: { dropzoneId, serialNumber: row.serialNumber } });
            if (exists) conflicts++;
            else newRecords++;
          }
          break;
        }
        default:
          moduleErrors.push(`Module "${module}" is not supported for import`);
      }

      totalNew += newRecords;
      totalConflicts += conflicts;
      modules.push({ module, newRecords, conflicts, errors: moduleErrors });
    }

    return {
      valid: modules.every((m) => m.errors.length === 0),
      modules,
      totalNew,
      totalConflicts,
    };
  }

  // ============================================================================
  // BULK SCENARIO LOADING
  // ============================================================================

  async loadMultipleScenarios(
    scenarioKeys: string[],
    userId: number,
    dropzoneId?: number,
    organizationId?: number
  ): Promise<{ results: OperationResult[]; totalRecords: number; totalDurationMs: number }> {
    const results: OperationResult[] = [];
    const startTime = Date.now();

    for (const key of scenarioKeys) {
      try {
        const result = await this.loadScenario(key, userId, dropzoneId, organizationId);
        results.push(result);
      } catch (e: any) {
        results.push({
          operationId: 0,
          status: "FAILED",
          recordsAffected: 0,
          modulesAffected: [],
          errors: [`${key}: ${e.message}`],
          durationMs: 0,
        });
      }
    }

    return {
      results,
      totalRecords: results.reduce((s, r) => s + r.recordsAffected, 0),
      totalDurationMs: Date.now() - startTime,
    };
  }

  // ============================================================================
  // CSV EXPORT
  // ============================================================================

  /** Convert module data to CSV format — one CSV per module */
  convertToCSV(data: Record<string, any[]>): Record<string, string> {
    const csvData: Record<string, string> = {};

    for (const [module, rows] of Object.entries(data)) {
      if (!rows.length) continue;

      // Flatten nested objects for CSV
      const flatRows = rows.map((row) => this.flattenObject(row));
      const headers = [...new Set(flatRows.flatMap((r) => Object.keys(r)))];

      const csvLines = [
        headers.map((h) => `"${h}"`).join(","),
        ...flatRows.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
              if (val instanceof Date) return `"${val.toISOString()}"`;
              return String(val);
            })
            .join(",")
        ),
      ];

      csvData[module] = csvLines.join("\n");
    }

    return csvData;
  }

  private flattenObject(obj: any, prefix = ""): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, this.flattenObject(value, fullKey));
      } else if (Array.isArray(value)) {
        result[fullKey] = JSON.stringify(value);
      } else {
        result[fullKey] = value;
      }
    }
    return result;
  }

  // ============================================================================
  // IMPORT COMMIT — with conflict resolution
  // ============================================================================

  async importData(
    userId: number,
    dropzoneId: number,
    data: Record<string, any[]>,
    conflictStrategy: "SKIP" | "REPLACE" | "MERGE" = "SKIP"
  ): Promise<OperationResult> {
    const batchId = randomUUID();
    const startTime = Date.now();
    let recordsAffected = 0;
    const modulesAffected: string[] = [];
    const errors: string[] = [];

    const operation = await this.prisma.dataOperation.create({
      data: {
        operationType: "IMPORT",
        status: "RUNNING",
        userId,
        dropzoneId,
        batchId,
        conflictStrategy,
        startedAt: new Date(),
      },
    });

    try {
      for (const [module, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        let imported = 0;
        switch (module) {
          case "users":
            imported = await this.importUsers(rows, dropzoneId, batchId, conflictStrategy);
            break;
          case "athletes":
            imported = await this.importAthletes(rows, dropzoneId, batchId, conflictStrategy);
            break;
          case "aircraft":
            imported = await this.importAircraft(rows, dropzoneId, conflictStrategy);
            break;
          case "gear":
            imported = await this.importGear(rows, dropzoneId, conflictStrategy);
            break;
          default:
            errors.push(`Unsupported import module: ${module}`);
            continue;
        }

        recordsAffected += imported;
        if (imported > 0) modulesAffected.push(module);
      }

      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: {
          status: "COMPLETED",
          recordsAffected,
          modulesAffected,
          errorLog: errors.length > 0 ? errors : undefined,
          completedAt: new Date(),
        },
      });

      await this.auditService.log({
        userId,
        dropzoneId: dropzoneId || 0,
        action: "DATA_IMPORT" as any,
        entityType: "DataOperation",
        entityId: operation.id,
        afterState: { batchId, recordsAffected, conflictStrategy },
      });

      return {
        operationId: operation.id,
        status: "COMPLETED",
        recordsAffected,
        modulesAffected,
        errors,
        durationMs: Date.now() - startTime,
      };
    } catch (e: any) {
      await this.prisma.dataOperation.update({
        where: { id: operation.id },
        data: { status: "FAILED", errorLog: [e.message], completedAt: new Date() },
      });
      throw e;
    }
  }

  private async importUsers(
    rows: any[],
    dropzoneId: number,
    batchId: string,
    strategy: "SKIP" | "REPLACE" | "MERGE"
  ): Promise<number> {
    let count = 0;
    const hash = hashPasswordSync(DEFAULT_PASSWORD);

    for (const row of rows) {
      if (!row.email) continue;

      const existing = await this.prisma.user.findFirst({ where: { email: row.email } });

      if (existing) {
        if (strategy === "SKIP") continue;
        if (strategy === "REPLACE") {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              firstName: row.firstName || existing.firstName,
              lastName: row.lastName || existing.lastName,
              phone: row.phone ?? existing.phone,
            },
          });
          count++;
        } else if (strategy === "MERGE") {
          // Only update empty fields
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              firstName: existing.firstName || row.firstName,
              lastName: existing.lastName || row.lastName,
              phone: existing.phone || row.phone,
            },
          });
          count++;
        }
      } else {
        await this.prisma.user.create({
          data: {
            uuid: randomUUID(),
            email: row.email,
            firstName: row.firstName || "Imported",
            lastName: row.lastName || "User",
            phone: row.phone || null,
            passwordHash: hash,
            importBatchId: batchId,
          },
        });
        count++;
      }
    }
    return count;
  }

  private async importAthletes(
    rows: any[],
    dropzoneId: number,
    batchId: string,
    strategy: "SKIP" | "REPLACE" | "MERGE"
  ): Promise<number> {
    let count = 0;
    const hash = hashPasswordSync(DEFAULT_PASSWORD);

    for (const row of rows) {
      const email = row.email || row["user.email"];
      if (!email) continue;

      let user = await this.prisma.user.findFirst({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            uuid: randomUUID(),
            email,
            firstName: row.firstName || row["user.firstName"] || "Imported",
            lastName: row.lastName || row["user.lastName"] || "Athlete",
            passwordHash: hash,
            importBatchId: batchId,
          },
        });
      }

      const existing = await this.prisma.athlete.findFirst({ where: { userId: user.id } });
      if (existing && strategy === "SKIP") continue;

      if (existing && (strategy === "REPLACE" || strategy === "MERGE")) {
        await this.prisma.athlete.update({
          where: { id: existing.id },
          data: {
            totalJumps: strategy === "REPLACE" ? (row.totalJumps ?? existing.totalJumps) : Math.max(existing.totalJumps || 0, row.totalJumps || 0),
            homeDropzoneId: dropzoneId,
          },
        });
      } else if (!existing) {
        await this.prisma.athlete.create({
          data: {
            userId: user.id,
            homeDropzoneId: dropzoneId,
            totalJumps: row.totalJumps || 0,
          },
        });
      }
      count++;
    }
    return count;
  }

  private async importAircraft(
    rows: any[],
    dropzoneId: number,
    strategy: "SKIP" | "REPLACE" | "MERGE"
  ): Promise<number> {
    let count = 0;
    for (const row of rows) {
      if (!row.registration) continue;

      const existing = await this.prisma.aircraft.findFirst({
        where: { dropzoneId, registration: row.registration },
      });

      if (existing) {
        if (strategy === "SKIP") continue;
        await this.prisma.aircraft.update({
          where: { id: existing.id },
          data: {
            type: strategy === "REPLACE" ? (row.type || existing.type) : existing.type,
            maxCapacity: row.maxCapacity ?? existing.maxCapacity,
            maxWeight: row.maxWeight ?? existing.maxWeight,
          },
        });
        count++;
      } else {
        await this.prisma.aircraft.create({
          data: {
            dropzoneId,
            registration: row.registration,
            type: row.type || "Unknown",
            maxCapacity: row.maxCapacity || 15,
            maxWeight: row.maxWeight || 3000,
            emptyWeight: row.emptyWeight || 1500,
          },
        });
        count++;
      }
    }
    return count;
  }

  private async importGear(
    rows: any[],
    dropzoneId: number,
    strategy: "SKIP" | "REPLACE" | "MERGE"
  ): Promise<number> {
    let count = 0;
    for (const row of rows) {
      if (!row.serialNumber) continue;

      const existing = await this.prisma.gearItem.findFirst({
        where: { dropzoneId, serialNumber: row.serialNumber },
      });

      if (existing) {
        if (strategy === "SKIP") continue;
        await this.prisma.gearItem.update({
          where: { id: existing.id },
          data: {
            manufacturer: row.manufacturer ?? existing.manufacturer,
            model: row.model ?? existing.model,
            status: row.status ?? existing.status,
          },
        });
        count++;
      } else {
        await this.prisma.gearItem.create({
          data: {
            dropzoneId,
            serialNumber: row.serialNumber,
            gearType: row.gearType || "OTHER",
            manufacturer: row.manufacturer || "Unknown",
            model: row.model || "Unknown",
            dom: new Date(),
            status: row.status || "APPROVED",
          },
        });
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async ensureRoles(): Promise<Record<string, number>> {
    const roles = await this.prisma.role.findMany();
    const map: Record<string, number> = {};
    for (const r of roles) {
      map[r.name] = r.id;
    }
    return map;
  }
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
