import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp, cleanupTestData, seedTestDropzone } from "./setup";
import { WaitlistService } from "../services/waitlistService";

describe("WaitlistService — Claim Timer", () => {
  let app: FastifyInstance;
  let prisma: any;
  let service: WaitlistService;
  let dropzoneId: number;
  let userId1: number;
  let userId2: number;

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.prisma;
    await cleanupTestData(prisma);

    const seed = await seedTestDropzone(prisma, "waitlist");
    dropzoneId = seed.dropzoneId;

    // Create two test users
    const { randomUUID } = await import("crypto");
    const u1 = await prisma.user.create({
      data: {
        uuid: randomUUID(),
        email: "waitlist-user1@skylara.test",
        firstName: "User",
        lastName: "One",
        passwordHash: "$2b$10$placeholder",
      },
    });
    const u2 = await prisma.user.create({
      data: {
        uuid: randomUUID(),
        email: "waitlist-user2@skylara.test",
        firstName: "User",
        lastName: "Two",
        passwordHash: "$2b$10$placeholder",
      },
    });
    userId1 = u1.id;
    userId2 = u2.id;

    service = new WaitlistService(prisma);
  });

  afterAll(async () => {
    // Clean up waitlist entries
    await prisma.waitlistEntry.deleteMany({
      where: { dropzoneId },
    }).catch(() => {});
    await cleanupTestData(prisma);
    await app.close();
  });

  it("should add users to waitlist with FIFO priority", async () => {
    const entry1 = await service.addToWaitlist(userId1, dropzoneId, "FUN");
    const entry2 = await service.addToWaitlist(userId2, dropzoneId, "FUN");

    expect(entry1.priority).toBe(1);
    expect(entry2.priority).toBe(2);
    expect(entry1.claimedAt).toBeNull();
  });

  it("should prevent duplicate waitlist entries", async () => {
    await expect(
      service.addToWaitlist(userId1, dropzoneId, "FUN")
    ).rejects.toThrow("already on waitlist");
  });

  it("should promote top entry with claim deadline", async () => {
    // Create a fake load for the offer
    const { randomUUID } = await import("crypto");
    const load = await prisma.load.create({
      data: {
        uuid: randomUUID(),
        dropzoneId,
        branchId: (await prisma.dzBranch.findFirst({ where: { dropzoneId } }))!.id,
        aircraftId: (await prisma.aircraft.findFirst({ where: { dropzoneId } }))!.id,
        pilotId: userId1,
        loadNumber: "TEST-WL-1",
        scheduledAt: new Date(),
      },
    });

    const promoted = await service.promoteNext(dropzoneId, load.id, "FUN", 15);
    expect(promoted).not.toBeNull();
    expect(promoted!.userId).toBe(userId1); // FIFO — first in queue
    expect(promoted!.offeredAt).toBeDefined();
    expect(promoted!.claimDeadline).toBeDefined();

    // Claim deadline should be ~15 minutes from now
    const deadline = promoted!.claimDeadline!;
    const diff = deadline.getTime() - Date.now();
    expect(diff).toBeGreaterThan(14 * 60 * 1000);
    expect(diff).toBeLessThan(16 * 60 * 1000);

    // Clean up load
    await prisma.load.delete({ where: { id: load.id } }).catch(() => {});
  });

  it("should return waitlist ordered by priority", async () => {
    const waitlist = await service.getWaitlist(dropzoneId);
    expect(waitlist.length).toBeGreaterThanOrEqual(1);
    // Priorities should be ascending
    for (let i = 1; i < waitlist.length; i++) {
      expect(waitlist[i].priority).toBeGreaterThanOrEqual(waitlist[i - 1].priority);
    }
  });

  it("should remove user from waitlist", async () => {
    const before = await service.getWaitlist(dropzoneId);
    const entry = before.find(e => e.userId === userId2);
    if (entry) {
      await service.removeFromWaitlist(entry.id, userId2);
      const after = await service.getWaitlist(dropzoneId);
      expect(after.find(e => e.userId === userId2)).toBeUndefined();
    }
  });
});
