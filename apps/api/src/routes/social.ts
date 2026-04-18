import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";

// ============================================================================
// SOCIAL / STORY ROUTES
// Per gap spec §7.9, schema ref §9, §14
// ============================================================================
//
// Covers: social posts, comments, reactions, follows,
//         athlete story/milestones, achievements, activity feed
// ============================================================================

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
  dropzoneId: z.number().int().positive().optional(),
  loadId: z.number().int().positive().optional(),
  mediaIds: z.array(z.number().int().positive()).default([]),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const reactSchema = z.object({
  emoji: z.string().min(1).max(10),
});

const updateStorySchema = z.object({
  tagline: z.string().max(255).optional(),
  narrative: z.string().max(5000).optional(),
  disciplines: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const createMilestoneSchema = z.object({
  type: z.enum(["FIRST_JUMP", "LICENSE_EARNED", "JUMP_COUNT", "DISCIPLINE", "COMPETITION", "CUSTOM"]),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  achievedAt: z.string().datetime(),
  jumpNumber: z.number().int().positive().optional(),
});

function getUserId(request: any): number {
  return parseInt(request.user?.sub ?? request.user?.id ?? "0");
}

export async function socialRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  const prisma = fastify.prisma as any;

  // ========================================================================
  // SOCIAL POSTS
  // ========================================================================

  // GET /social/feed — paginated feed (public + followed users)
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    "/social/feed",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const page = parseInt(request.query.page ?? "1");
        const limit = Math.min(parseInt(request.query.limit ?? "20"), 50);
        const skip = (page - 1) * limit;

        // Get user's followed IDs
        const follows = await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        });
        const followedIds = follows.map((f: any) => f.followingId);

        const where = {
          deletedAt: null,
          OR: [
            { visibility: "PUBLIC" },
            { userId, visibility: { in: ["PUBLIC", "FOLLOWERS", "PRIVATE"] } },
            { userId: { in: followedIds }, visibility: { in: ["PUBLIC", "FOLLOWERS"] } },
          ],
        };

        const [posts, total] = await Promise.all([
          prisma.socialPost.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            include: {
              comments: { take: 3, orderBy: { createdAt: "desc" } },
              reactions: true,
              _count: { select: { comments: true, reactions: true } },
            },
          }),
          prisma.socialPost.count({ where }),
        ]);

        reply.send({
          success: true,
          data: { posts, total, page, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch feed" });
      }
    }
  );

  // POST /social/posts — Create a post
  fastify.post<{ Body: z.infer<typeof createPostSchema> }>(
    "/social/posts",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const body = createPostSchema.parse(request.body);

        const post = await prisma.socialPost.create({
          data: {
            userId,
            content: body.content,
            visibility: body.visibility,
            dropzoneId: body.dropzoneId ?? null,
            loadId: body.loadId ?? null,
            mediaIds: JSON.stringify(body.mediaIds),
          },
        });

        // Activity feed entry
        await prisma.activityFeed.create({
          data: {
            userId,
            dropzoneId: body.dropzoneId ?? null,
            eventType: "POST",
            entityType: "SocialPost",
            entityId: post.id,
            summary: body.content.substring(0, 200),
            visibility: body.visibility,
          },
        });

        reply.code(201).send({ success: true, data: post });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to create post" });
      }
    }
  );

  // DELETE /social/posts/:id — Soft-delete own post
  fastify.delete<{ Params: { id: string } }>(
    "/social/posts/:id",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const postId = parseInt(request.params.id);

        const post = await prisma.socialPost.findUnique({ where: { id: postId } });
        if (!post || post.userId !== userId) {
          reply.code(404).send({ success: false, error: "Post not found" });
          return;
        }

        await prisma.socialPost.update({
          where: { id: postId },
          data: { deletedAt: new Date() },
        });

        reply.send({ success: true });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to delete post" });
      }
    }
  );

  // ========================================================================
  // COMMENTS
  // ========================================================================

  // POST /social/posts/:id/comments
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof createCommentSchema> }>(
    "/social/posts/:id/comments",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const postId = parseInt(request.params.id);
        const body = createCommentSchema.parse(request.body);

        const comment = await prisma.socialComment.create({
          data: { postId, userId, content: body.content },
        });

        reply.code(201).send({ success: true, data: comment });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to add comment" });
      }
    }
  );

  // ========================================================================
  // REACTIONS
  // ========================================================================

  // POST /social/posts/:id/reactions — toggle reaction
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof reactSchema> }>(
    "/social/posts/:id/reactions",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const postId = parseInt(request.params.id);
        const { emoji } = reactSchema.parse(request.body);

        // Toggle: if exists, remove; otherwise create
        const existing = await prisma.socialReaction.findUnique({
          where: { postId_userId_emoji: { postId, userId, emoji } },
        });

        if (existing) {
          await prisma.socialReaction.delete({ where: { id: existing.id } });
          reply.send({ success: true, action: "removed" });
        } else {
          await prisma.socialReaction.create({
            data: { postId, userId, emoji },
          });
          reply.send({ success: true, action: "added" });
        }
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to toggle reaction" });
      }
    }
  );

  // ========================================================================
  // FOLLOWS
  // ========================================================================

  // POST /social/follow/:userId — toggle follow
  fastify.post<{ Params: { userId: string } }>(
    "/social/follow/:userId",
    async (request, reply) => {
      try {
        const followerId = getUserId(request);
        const followingId = parseInt(request.params.userId);

        if (followerId === followingId) {
          reply.code(400).send({ success: false, error: "Cannot follow yourself" });
          return;
        }

        const existing = await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId, followingId } },
        });

        if (existing) {
          await prisma.follow.delete({ where: { id: existing.id } });
          reply.send({ success: true, action: "unfollowed" });
        } else {
          await prisma.follow.create({ data: { followerId, followingId } });

          // Activity feed
          await prisma.activityFeed.create({
            data: {
              userId: followerId,
              eventType: "FOLLOW",
              entityType: "User",
              entityId: followingId,
              summary: `Started following a skydiver`,
              visibility: "PUBLIC",
            },
          });

          reply.send({ success: true, action: "followed" });
        }
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to toggle follow" });
      }
    }
  );

  // GET /social/followers — my followers count + list
  fastify.get("/social/followers", async (request, reply) => {
    try {
      const userId = getUserId(request);
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { followingId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
      ]);
      reply.send({ success: true, data: { followers, following } });
    } catch (error) {
      reply.code(500).send({ success: false, error: "Failed to fetch followers" });
    }
  });

  // ========================================================================
  // ATHLETE STORY
  // ========================================================================

  // GET /social/story — get my story
  fastify.get("/social/story", async (request, reply) => {
    try {
      const userId = getUserId(request);
      const story = await prisma.athleteStory.findUnique({
        where: { userId },
        include: { milestones: { orderBy: { achievedAt: "desc" } } },
      });

      reply.send({ success: true, data: story });
    } catch (error) {
      reply.code(500).send({ success: false, error: "Failed to fetch story" });
    }
  });

  // PUT /social/story — create or update my story
  fastify.put<{ Body: z.infer<typeof updateStorySchema> }>(
    "/social/story",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const body = updateStorySchema.parse(request.body);

        const story = await prisma.athleteStory.upsert({
          where: { userId },
          create: { userId, ...body },
          update: body,
        });

        reply.send({ success: true, data: story });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to update story" });
      }
    }
  );

  // POST /social/story/milestones — add a milestone
  fastify.post<{ Body: z.infer<typeof createMilestoneSchema> }>(
    "/social/story/milestones",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const body = createMilestoneSchema.parse(request.body);

        // Ensure story exists
        let story = await prisma.athleteStory.findUnique({ where: { userId } });
        if (!story) {
          story = await prisma.athleteStory.create({ data: { userId } });
        }

        const milestone = await prisma.athleteMilestone.create({
          data: {
            storyId: story.id,
            type: body.type,
            title: body.title,
            description: body.description ?? null,
            achievedAt: new Date(body.achievedAt),
            jumpNumber: body.jumpNumber ?? null,
          },
        });

        // Activity feed
        await prisma.activityFeed.create({
          data: {
            userId,
            eventType: "MILESTONE",
            entityType: "AthleteMilestone",
            entityId: milestone.id,
            summary: body.title,
            visibility: "PUBLIC",
          },
        });

        reply.code(201).send({ success: true, data: milestone });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to add milestone" });
      }
    }
  );

  // ========================================================================
  // ACHIEVEMENTS
  // ========================================================================

  // GET /social/achievements — list all available achievements
  fastify.get("/social/achievements", async (request, reply) => {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: { displayOrder: "asc" },
      });
      reply.send({ success: true, data: { achievements } });
    } catch (error) {
      reply.code(500).send({ success: false, error: "Failed to fetch achievements" });
    }
  });

  // GET /social/my-achievements — list my earned achievements
  fastify.get("/social/my-achievements", async (request, reply) => {
    try {
      const userId = getUserId(request);
      const earned = await prisma.athleteAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { earnedAt: "desc" },
      });
      reply.send({ success: true, data: { achievements: earned } });
    } catch (error) {
      reply.code(500).send({ success: false, error: "Failed to fetch achievements" });
    }
  });

  // ========================================================================
  // ACTIVITY FEED
  // ========================================================================

  // GET /social/activity — my activity feed
  fastify.get<{ Querystring: { limit?: string } }>(
    "/social/activity",
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const limit = Math.min(parseInt(request.query.limit ?? "20"), 50);

        const items = await prisma.activityFeed.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        reply.send({ success: true, data: { items } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch activity" });
      }
    }
  );

  // ========================================================================
  // LEADERBOARD
  // ========================================================================

  // GET /social/leaderboard?period=WEEK|MONTH|ALL_TIME&category=MOST_JUMPS|LONGEST_STREAK|MOST_DISCIPLINES
  fastify.get<{
    Querystring: { period?: string; category?: string };
  }>("/social/leaderboard", async (request, reply) => {
    try {
      const user = request.user as any;
      const dropzoneId = parseInt(user?.dropzoneId ?? "0");

      if (!dropzoneId) {
        return reply.code(400).send({
          success: false,
          error: "dropzoneId not available for this user",
        });
      }

      const period = request.query.period ?? "ALL_TIME";
      const category = request.query.category ?? "MOST_JUMPS";

      // Build date filter based on period
      let dateFilter: { gte?: Date } = {};
      const now = new Date();
      if (period === "WEEK") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { gte: weekAgo };
      } else if (period === "MONTH") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { gte: monthAgo };
      }
      // ALL_TIME = no date filter

      const where: any = { dropzoneId };
      if (dateFilter.gte) {
        where.createdAt = dateFilter;
      }

      // For all categories, count LogbookEntry per user (simplified: same data for now)
      const entries = await prisma.logbookEntry.groupBy({
        by: ["userId"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      if (entries.length === 0) {
        return reply.send({ success: true, data: { entries: [] } });
      }

      // Fetch user info for the top users
      const userIds = entries.map((e: any) => e.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profile: { select: { avatar: true } },
        },
      });

      const userMap = new Map<number, any>(users.map((u: any) => [u.id, u]));

      const leaderboard = entries.map((entry: any, index: number) => {
        const u = userMap.get(entry.userId);
        return {
          rank: index + 1,
          userId: entry.userId,
          firstName: u?.firstName ?? "Unknown",
          lastName: u?.lastName ?? "",
          value: entry._count.id,
          avatarUrl: u?.profile?.avatar ?? null,
        };
      });

      reply.send({ success: true, data: { entries: leaderboard } });
    } catch (error) {
      fastify.log.error(error, "Leaderboard fetch failed");
      reply.code(500).send({ success: false, error: "Failed to fetch leaderboard" });
    }
  });

  // ========================================================================
  // WHO'S GOING
  // ========================================================================

  // GET /social/whos-going — users checked in or on today's upcoming loads
  fastify.get("/social/whos-going", async (request, reply) => {
    try {
      const user = request.user as any;
      const dropzoneId = parseInt(user?.dropzoneId ?? "0");

      if (!dropzoneId) {
        return reply.code(400).send({
          success: false,
          error: "dropzoneId not available for this user",
        });
      }

      // Today's date range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Find slots on today's loads that are OPEN, FILLING, or LOCKED
      const slots = await prisma.slot.findMany({
        where: {
          userId: { not: null },
          load: {
            dropzoneId,
            status: { in: ["OPEN", "FILLING", "LOCKED", "THIRTY_MIN", "TWENTY_MIN", "TEN_MIN", "BOARDING"] },
            scheduledAt: { gte: todayStart, lte: todayEnd },
          },
        },
        select: {
          userId: true,
          jumpType: true,
          load: {
            select: { loadNumber: true },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: { select: { avatar: true } },
            },
          },
        },
        orderBy: { load: { scheduledAt: "asc" } },
      });

      // Deduplicate by userId (keep first appearance)
      const seen = new Set<number>();
      const jumpers: Array<{
        id: number;
        firstName: string;
        lastName: string;
        jumpType: string | null;
        loadNumber: string;
        avatarUrl: string | null;
      }> = [];

      for (const slot of slots as any[]) {
        const uid = slot.userId;
        if (!uid || seen.has(uid)) continue;
        seen.add(uid);
        const u = slot.user;
        jumpers.push({
          id: u?.id ?? uid,
          firstName: u?.firstName ?? "Unknown",
          lastName: u?.lastName ?? "",
          jumpType: slot.jumpType,
          loadNumber: slot.load?.loadNumber ?? "",
          avatarUrl: u?.profile?.avatar ?? null,
        });
      }

      reply.send({
        success: true,
        data: { jumpers, count: jumpers.length },
      });
    } catch (error) {
      fastify.log.error(error, "Who's going fetch failed");
      reply.code(500).send({ success: false, error: "Failed to fetch who's going" });
    }
  });

  // POST /social/whos-going/add — placeholder for manual "I'm going" toggle
  fastify.post("/social/whos-going/add", async (request, reply) => {
    try {
      const userId = getUserId(request);
      // Store intent in activity feed as a lightweight signal
      await prisma.activityFeed.create({
        data: {
          userId,
          eventType: "GOING_TODAY",
          entityType: "User",
          entityId: userId,
          summary: "Marked as going today",
          visibility: "PUBLIC",
        },
      });
      reply.send({ success: true });
    } catch (error) {
      reply.code(500).send({ success: false, error: "Failed to mark going" });
    }
  });

  // POST /social/whos-going/remove — placeholder for "not going" toggle
  fastify.post("/social/whos-going/remove", async (request, reply) => {
    try {
      const userId = getUserId(request);
      // Remove latest GOING_TODAY entry for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const entry = await prisma.activityFeed.findFirst({
        where: {
          userId,
          eventType: "GOING_TODAY",
          createdAt: { gte: todayStart },
        },
        orderBy: { createdAt: "desc" },
      });

      if (entry) {
        await prisma.activityFeed.delete({ where: { id: entry.id } });
      }

      reply.send({ success: true });
    } catch (error) {
      reply.code(500).send({ success: false, error: "Failed to remove going status" });
    }
  });
}
