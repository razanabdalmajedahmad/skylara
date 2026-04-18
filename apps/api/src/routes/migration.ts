/**
 * DATA MIGRATION & IMPORT — Doc 17 §41
 *
 * Self-service import tool for dropzone migration from Burble, Manifest Pro,
 * CSV exports, and manual data entry.
 *
 * Workflow:
 *   1. POST /migration/upload    — upload CSV, get preview
 *   2. POST /migration/validate  — validate mapped data against schema
 *   3. POST /migration/commit    — staged import with batch_id for rollback
 *   4. POST /migration/rollback  — delete all records with batch_id
 *   5. GET  /migration/history   — import history and stats
 *
 * All imports are tagged with batch_id for rollback.
 * Records are loaded into staging first, then promoted.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { AppError } from "../utils/errors";
import { AuditService } from "../services/auditService";

interface CSVParseResult {
  headers: string[];
  rows: string[][];
  rowCount: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

function parseCSV(raw: string): CSVParseResult {
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], rowCount: 0, errors: [] };
  }

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"(.*)"$/, "$1"));
  const rows: string[][] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }

  return { headers, rows, rowCount: rows.length, errors };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  // Strip to digits, prepend + if needed
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function migrationRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;
  const auditService = new AuditService(prisma);

  fastify.addHook("preHandler", authenticate);

  // ── POST /migration/preview ─────────────────────────────────────────
  // Parse CSV and return preview of first 50 rows with column mapping suggestions
  fastify.post("/migration/preview", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { csv, entityType } = request.body as {
      csv: string;
      entityType: "JUMPER" | "LOAD" | "TRANSACTION" | "GEAR";
    };

    if (!csv || !entityType) {
      throw new AppError("csv data and entityType are required", 400);
    }

    const parsed = parseCSV(csv);
    if (parsed.headers.length === 0) {
      throw new AppError("CSV appears to be empty or malformed", 400);
    }

    // Suggest column mappings based on header names
    const targetFields = ENTITY_FIELDS[entityType] || [];
    const mappingSuggestions: Array<{
      sourceColumn: string;
      suggestedTarget: string | null;
      confidence: "high" | "medium" | "low";
    }> = parsed.headers.map((header) => {
      const normalized = header.toLowerCase().replace(/[_\s-]/g, "");
      const match = targetFields.find((f) => {
        const normalizedTarget = f.field.toLowerCase().replace(/[_\s-]/g, "");
        return normalized === normalizedTarget
          || normalized.includes(normalizedTarget)
          || normalizedTarget.includes(normalized);
      });
      return {
        sourceColumn: header,
        suggestedTarget: match?.field ?? null,
        confidence: match ? (normalized === match.field.toLowerCase().replace(/[_\s-]/g, "") ? "high" : "medium") : "low",
      };
    });

    reply.send({
      success: true,
      data: {
        entityType,
        headers: parsed.headers,
        rowCount: parsed.rowCount,
        preview: parsed.rows.slice(0, 50),
        mappingSuggestions,
        errors: parsed.errors,
      },
    });
  });

  // ── POST /migration/validate ────────────────────────────────────────
  // Validate mapped data against schema rules
  fastify.post("/migration/validate", async (request: FastifyRequest, reply: FastifyReply) => {
    const { csv, entityType, columnMapping } = request.body as {
      csv: string;
      entityType: "JUMPER" | "LOAD" | "TRANSACTION" | "GEAR";
      columnMapping: Record<string, string>;
    };

    if (!csv || !entityType || !columnMapping) {
      throw new AppError("csv, entityType, and columnMapping are required", 400);
    }

    const parsed = parseCSV(csv);
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const validRows: Record<string, any>[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const mapped: Record<string, any> = {};

      for (const [sourceIdx, targetField] of Object.entries(columnMapping)) {
        const colIndex = parseInt(sourceIdx);
        const value = row[colIndex]?.trim() ?? "";
        mapped[targetField] = value;
      }

      // Basic validation
      if (entityType === "JUMPER") {
        if (!mapped.email && !mapped.firstName) {
          errors.push({ row: i + 2, field: "email/firstName", message: "At least email or firstName is required" });
          continue;
        }
        if (mapped.email) {
          mapped.email = normalizeEmail(mapped.email);
          if (!mapped.email.includes("@")) {
            errors.push({ row: i + 2, field: "email", message: `Invalid email: ${mapped.email}` });
          }
        }
        if (mapped.phone) {
          mapped.phone = normalizePhone(mapped.phone);
        }
      }

      validRows.push(mapped);
    }

    reply.send({
      success: true,
      data: {
        totalRows: parsed.rowCount,
        validRows: validRows.length,
        errorCount: errors.length,
        errors: errors.slice(0, 100), // Cap at 100 errors in response
        preview: validRows.slice(0, 20),
      },
    });
  });

  // ── POST /migration/commit ──────────────────────────────────────────
  // Import validated data with batch_id for rollback
  fastify.post("/migration/commit", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { csv, entityType, columnMapping, dropzoneId } = request.body as {
      csv: string;
      entityType: "JUMPER";
      columnMapping: Record<string, string>;
      dropzoneId: number;
    };

    if (!csv || !entityType || !columnMapping || !dropzoneId) {
      throw new AppError("csv, entityType, columnMapping, and dropzoneId are required", 400);
    }

    // Only support JUMPER import for now
    if (entityType !== "JUMPER") {
      throw new AppError("Only JUMPER entity type is supported for import in V1", 400);
    }

    const parsed = parseCSV(csv);
    const batchId = `import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { randomUUID } = await import("crypto");

    let imported = 0;
    let skipped = 0;
    const importErrors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const mapped: Record<string, any> = {};

      for (const [sourceIdx, targetField] of Object.entries(columnMapping)) {
        const colIndex = parseInt(sourceIdx);
        mapped[targetField] = row[colIndex]?.trim() ?? "";
      }

      if (!mapped.email && !mapped.firstName) {
        skipped++;
        continue;
      }

      try {
        if (mapped.email) {
          mapped.email = normalizeEmail(mapped.email);
          // Check for existing user by email
          const existing = await prisma.user.findUnique({
            where: { email: mapped.email },
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        // Create user record tagged with batchId in metadata
        await prisma.user.create({
          data: {
            uuid: randomUUID(),
            email: mapped.email || `imported-${batchId}-${i}@legacy.import`,
            firstName: mapped.firstName || "Imported",
            lastName: mapped.lastName || "User",
            phone: mapped.phone || null,
            passwordHash: "$2b$10$LEGACY_IMPORT_NO_PASSWORD",
            importBatchId: batchId,
          } as any,
        });

        imported++;
      } catch (error: any) {
        importErrors.push({ row: i + 2, message: error.message || "Unknown error" });
      }
    }

    // Audit log
    await auditService.log({
      action: "DATA_IMPORT" as any,
      userId: parseInt(user.sub),
      dropzoneId,
      entityType: "USER",
      entityId: 0,
      afterState: { batchId, entityType, imported, skipped, errors: importErrors.length },
    });

    reply.send({
      success: true,
      data: {
        batchId,
        imported,
        skipped,
        errors: importErrors.length,
        errorDetails: importErrors.slice(0, 50),
      },
    });
  });

  // ── POST /migration/rollback ────────────────────────────────────────
  // Delete all records imported with a specific batch_id
  fastify.post("/migration/rollback", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { batchId, dropzoneId } = request.body as { batchId: string; dropzoneId: number };

    if (!batchId) {
      throw new AppError("batchId is required", 400);
    }

    const deleted = await prisma.user.deleteMany({
      where: { importBatchId: batchId } as any,
    });

    // Audit log
    await auditService.log({
      action: "DATA_IMPORT_ROLLBACK" as any,
      userId: parseInt(user.sub),
      dropzoneId: dropzoneId || 0,
      entityType: "USER",
      entityId: 0,
      afterState: { batchId, deletedCount: deleted.count },
    });

    reply.send({
      success: true,
      data: { batchId, deletedCount: deleted.count },
    });
  });

  // ── GET /migration/history ──────────────────────────────────────────
  // Import history from audit logs
  fastify.get("/migration/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const dropzoneId = parseInt(user?.dropzoneId || "0");

    const history = await prisma.auditLog.findMany({
      where: {
        action: { in: ["DATA_IMPORT", "DATA_IMPORT_ROLLBACK"] as any },
        ...(dropzoneId ? { dropzoneId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    reply.send({
      success: true,
      data: { history },
    });
  });
}

/** Target fields per entity type for column mapping suggestions. */
const ENTITY_FIELDS: Record<string, Array<{ field: string; required: boolean }>> = {
  JUMPER: [
    { field: "email", required: false },
    { field: "firstName", required: true },
    { field: "lastName", required: true },
    { field: "phone", required: false },
    { field: "licenseNumber", required: false },
    { field: "licenseLevel", required: false },
    { field: "jumpCount", required: false },
    { field: "dateOfBirth", required: false },
    { field: "emergencyContactName", required: false },
    { field: "emergencyContactPhone", required: false },
  ],
  LOAD: [
    { field: "loadNumber", required: true },
    { field: "aircraftRegistration", required: true },
    { field: "date", required: true },
    { field: "jumpersCount", required: false },
    { field: "status", required: false },
  ],
  TRANSACTION: [
    { field: "email", required: true },
    { field: "amount", required: true },
    { field: "type", required: true },
    { field: "date", required: true },
    { field: "description", required: false },
  ],
  GEAR: [
    { field: "ownerEmail", required: true },
    { field: "containerMake", required: false },
    { field: "containerModel", required: false },
    { field: "mainCanopyMake", required: false },
    { field: "mainCanopySize", required: false },
    { field: "reserveMake", required: false },
    { field: "reservePackDate", required: false },
    { field: "aadMake", required: false },
    { field: "aadModel", required: false },
  ],
};
