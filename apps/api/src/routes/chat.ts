import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate";

// ============================================================================
// CHAT ROUTES — DZ messaging (channels, direct messages, load chats)
// ============================================================================

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);

  // ── GET /chat/channels — List channels the user belongs to ────────

  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>("/chat/channels", async (request, reply) => {
    const userId = parseInt(String(request.user!.sub));
    const dropzoneId = parseInt(request.user!.dropzoneId || "0");
    const limit = Math.min(parseInt(request.query.limit || "50"), 100);
    const offset = parseInt(request.query.offset || "0");

    // Get channels where user is a member
    const memberships = await fastify.prisma.chatMember.findMany({
      where: { userId },
      include: {
        channel: {
          include: {
            members: {
              select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              include: {
                sender: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      take: limit,
      skip: offset,
    });

    const channels = memberships.map((m) => {
      const ch = m.channel;
      const lastMsg = ch.messages[0] || null;

      // For DIRECT channels, derive name from the other member
      let channelName = ch.name;
      if (!channelName && ch.type === "DIRECT") {
        const other = ch.members.find((mem: any) => mem.userId !== userId);
        channelName = other?.user
          ? `${other.user.firstName} ${other.user.lastName}`
          : "Direct Message";
      }

      // Count unread: messages after lastReadAt
      // (simplified — we'll count via a subquery for accuracy)
      return {
        id: ch.id,
        name: channelName || ch.name,
        type: ch.type,
        avatarUrl: ch.avatarUrl,
        memberCount: ch.members.length,
        unreadCount: 0, // Will be filled below
        lastMessage: lastMsg?.body || null,
        lastMessageTime: lastMsg?.createdAt || null,
        lastMessageSender: lastMsg
          ? `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`
          : null,
        createdAt: ch.createdAt,
      };
    });

    // Get unread counts per channel
    for (const ch of channels) {
      const membership = memberships.find((m) => m.channelId === ch.id);
      if (membership?.lastReadAt) {
        ch.unreadCount = await fastify.prisma.chatMessage.count({
          where: {
            channelId: ch.id,
            createdAt: { gt: membership.lastReadAt },
            senderId: { not: userId },
          },
        });
      } else if (membership) {
        ch.unreadCount = await fastify.prisma.chatMessage.count({
          where: {
            channelId: ch.id,
            createdAt: { gt: membership.joinedAt },
            senderId: { not: userId },
          },
        });
      }
    }

    // Sort by latest activity
    channels.sort((a, b) => {
      const aTime = a.lastMessageTime || a.createdAt;
      const bTime = b.lastMessageTime || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    reply.send({ success: true, data: channels });
  });

  // ── GET /chat/channels/:channelId/messages — Paginated messages ───

  fastify.get<{
    Params: { channelId: string };
    Querystring: { before?: string; limit?: string };
  }>("/chat/channels/:channelId/messages", async (request, reply) => {
    const userId = parseInt(String(request.user!.sub));
    const channelId = parseInt(request.params.channelId);
    const limit = Math.min(parseInt(request.query.limit || "50"), 100);
    const beforeId = request.query.before
      ? parseInt(request.query.before)
      : undefined;

    // Verify membership
    const membership = await fastify.prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });

    if (!membership) {
      return reply
        .code(403)
        .send({ success: false, error: "Not a member of this channel" });
    }

    const where: any = { channelId };
    if (beforeId) {
      where.id = { lt: beforeId };
    }

    const messages = await fastify.prisma.chatMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 to detect hasMore
    });

    const hasMore = messages.length > limit;
    const trimmed = hasMore ? messages.slice(0, limit) : messages;

    const data = trimmed.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      senderId: m.senderId,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      senderInitials: `${m.sender.firstName[0]}${m.sender.lastName[0]}`,
      body: m.body,
      replyToId: m.replyToId,
      createdAt: m.createdAt,
    }));

    reply.send({ success: true, data: { messages: data, hasMore } });
  });

  // ── POST /chat/channels — Create a new channel ────────────────────

  fastify.post<{
    Body: { name?: string; type: "DIRECT" | "GROUP"; memberIds: number[] };
  }>("/chat/channels", async (request, reply) => {
    const userId = parseInt(String(request.user!.sub));
    const dropzoneId = parseInt(request.user!.dropzoneId || "0");
    const { name, type, memberIds } = request.body;

    if (!type || !["DIRECT", "GROUP"].includes(type)) {
      return reply
        .code(400)
        .send({ success: false, error: "type must be DIRECT or GROUP" });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return reply
        .code(400)
        .send({ success: false, error: "memberIds must be a non-empty array" });
    }

    // For DIRECT channels, check if one already exists
    if (type === "DIRECT") {
      if (memberIds.length !== 1) {
        return reply.code(400).send({
          success: false,
          error: "DIRECT channels must have exactly one other member",
        });
      }

      const otherUserId = memberIds[0];

      // Find existing direct channel between these two users
      const existingMemberships = await fastify.prisma.chatMember.findMany({
        where: { userId },
        include: {
          channel: {
            include: { members: true },
          },
        },
      });

      const existingDirect = existingMemberships.find((m) => {
        const ch = m.channel;
        return (
          ch.type === "DIRECT" &&
          ch.dropzoneId === dropzoneId &&
          ch.members.length === 2 &&
          ch.members.some((mem) => mem.userId === otherUserId)
        );
      });

      if (existingDirect) {
        return reply.send({
          success: true,
          data: {
            id: existingDirect.channel.id,
            name: existingDirect.channel.name,
            type: existingDirect.channel.type,
          },
          existing: true,
        });
      }
    }

    // Create channel with members
    const channel = await fastify.prisma.chatChannel.create({
      data: {
        name: name || (type === "DIRECT" ? null : "New Group"),
        type,
        dropzoneId,
        members: {
          create: [
            { userId, role: "admin" },
            ...memberIds
              .filter((id) => id !== userId)
              .map((id) => ({ userId: id, role: "member" as const })),
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    reply.code(201).send({ success: true, data: channel });
  });

  // ── POST /chat/channels/:channelId/messages — Send a message ──────

  fastify.post<{
    Params: { channelId: string };
    Body: { body: string; replyToId?: number };
  }>("/chat/channels/:channelId/messages", async (request, reply) => {
    const userId = parseInt(String(request.user!.sub));
    const channelId = parseInt(request.params.channelId);
    const { body: messageBody, replyToId } = request.body;

    if (!messageBody || messageBody.trim().length === 0) {
      return reply
        .code(400)
        .send({ success: false, error: "Message body is required" });
    }

    // Verify membership
    const membership = await fastify.prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });

    if (!membership) {
      return reply
        .code(403)
        .send({ success: false, error: "Not a member of this channel" });
    }

    const message = await fastify.prisma.chatMessage.create({
      data: {
        channelId,
        senderId: userId,
        body: messageBody.trim(),
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
      },
    });

    // Update channel timestamp
    await fastify.prisma.chatChannel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    });

    const fullMessage = {
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      senderInitials: `${message.sender.firstName[0]}${message.sender.lastName[0]}`,
      body: message.body,
      replyToId: message.replyToId,
      createdAt: message.createdAt,
    };

    // Broadcast via WebSocket for real-time delivery
    try {
      const dropzoneId = request.user!.dropzoneId || "0";
      (fastify as any).broadcastToDropzone?.(dropzoneId, {
        type: "CHAT_MESSAGE",
        data: fullMessage,
      });
    } catch {
      // WebSocket broadcast is best-effort
    }

    reply.code(201).send({ success: true, data: fullMessage });
  });

  // ── POST /chat/channels/:channelId/read — Mark channel as read ────

  fastify.post<{
    Params: { channelId: string };
  }>("/chat/channels/:channelId/read", async (request, reply) => {
    const userId = parseInt(String(request.user!.sub));
    const channelId = parseInt(request.params.channelId);

    const membership = await fastify.prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });

    if (!membership) {
      return reply
        .code(404)
        .send({ success: false, error: "Membership not found" });
    }

    await fastify.prisma.chatMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    reply.send({ success: true });
  });

  // ── GET /chat/users — List DZ users for new-chat picker ───────────

  fastify.get<{
    Querystring: { search?: string; limit?: string };
  }>("/chat/users", async (request, reply) => {
    const userId = parseInt(String(request.user!.sub));
    const dropzoneId = parseInt(request.user!.dropzoneId || "0");
    const search = request.query.search?.trim() || "";
    const limit = Math.min(parseInt(request.query.limit || "50"), 100);

    const where: any = {
      id: { not: userId },
      status: "ACTIVE",
      deletedAt: null,
      userRoles: {
        some: { dropzoneId },
      },
    };

    if (search.length > 0) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await fastify.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: limit,
    });

    reply.send({ success: true, data: users });
  });
}
