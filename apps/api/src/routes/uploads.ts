import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { S3Service, UploadCategory } from "../services/s3Service";
import { AppError } from "../utils/errors";

const s3 = new S3Service();

export async function uploadRoutes(fastify: FastifyInstance) {
  // All upload routes require authentication
  fastify.addHook("preHandler", authenticate);

  /**
   * POST /api/uploads/presign
   * Generate a presigned upload URL for direct client-to-S3 upload.
   *
   * Body: { category, fileName, contentType, dropzoneId }
   * Returns: { uploadUrl, fileKey, expiresIn }
   */
  fastify.post("/uploads/presign", async (request: FastifyRequest, reply: FastifyReply) => {
    const { category, fileName, contentType, dropzoneId } = request.body as {
      category: UploadCategory;
      fileName: string;
      contentType: string;
      dropzoneId: string;
    };

    if (!category || !fileName || !contentType || !dropzoneId) {
      throw new AppError("category, fileName, contentType, and dropzoneId are required", 400);
    }

    const config = s3.getUploadConfig(category);
    if (!config) {
      throw new AppError(`Invalid upload category: ${category}`, 400);
    }

    try {
      const result = await s3.getPresignedUploadUrl({
        category,
        fileName,
        contentType,
        dropzoneId,
        userId: (request as any).user.sub,
      });

      reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      throw new AppError(error.message || "Failed to generate upload URL", 400);
    }
  });

  /**
   * POST /api/uploads/download-url
   * Generate a presigned download URL for viewing/downloading a file.
   *
   * Body: { fileKey }
   * Returns: { downloadUrl, expiresIn }
   */
  fastify.post("/uploads/download-url", async (request: FastifyRequest, reply: FastifyReply) => {
    const { fileKey } = request.body as { fileKey: string };

    if (!fileKey) {
      throw new AppError("fileKey is required", 400);
    }

    try {
      const result = await s3.getPresignedDownloadUrl(fileKey);
      reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      throw new AppError(error.message || "Failed to generate download URL", 500);
    }
  });

  /**
   * DELETE /api/uploads/:fileKey
   * Delete a file from S3. Requires DZ_MANAGER or above.
   */
  fastify.delete("/uploads/:fileKey", async (request: FastifyRequest, reply: FastifyReply) => {
    const { fileKey } = request.params as { fileKey: string };

    if (!fileKey) {
      throw new AppError("fileKey is required", 400);
    }

    try {
      await s3.deleteFile(decodeURIComponent(fileKey));
      reply.send({ success: true });
    } catch (error: any) {
      throw new AppError(error.message || "Failed to delete file", 500);
    }
  });

  /**
   * GET /api/uploads/config/:category
   * Get upload constraints for a category (max size, allowed types).
   * Used by frontends to validate before upload.
   */
  fastify.get("/uploads/config/:category", async (request: FastifyRequest, reply: FastifyReply) => {
    const { category } = request.params as { category: UploadCategory };
    const config = s3.getUploadConfig(category);

    if (!config) {
      throw new AppError(`Unknown upload category: ${category}`, 404);
    }

    reply.send({ success: true, data: config });
  });

  // ========================================================================
  // MEDIA UPLOADS — Query persisted media metadata from the database
  // ========================================================================

  /**
   * GET /api/uploads/media
   * List media uploads with optional filters by user, dropzone, or type.
   */
  fastify.get("/uploads/media", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, dropzoneId, mediaType, moderationStatus, limit: rawLimit, offset: rawOffset } =
      request.query as {
        userId?: string;
        dropzoneId?: string;
        mediaType?: string;
        moderationStatus?: string;
        limit?: string;
        offset?: string;
      };

    const limit = Math.min(parseInt(rawLimit || "50", 10) || 50, 100);
    const offset = parseInt(rawOffset || "0", 10) || 0;

    const where: any = {};
    if (userId) {
      const uid = parseInt(userId, 10);
      if (Number.isFinite(uid)) where.userId = uid;
    }
    if (dropzoneId) {
      const did = parseInt(dropzoneId, 10);
      if (Number.isFinite(did)) where.dropzoneId = did;
    }
    if (mediaType) where.mediaType = mediaType;
    if (moderationStatus) where.moderationStatus = moderationStatus;

    const [media, total] = await Promise.all([
      fastify.prisma.mediaUpload.findMany({
        where,
        include: { tags: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      fastify.prisma.mediaUpload.count({ where }),
    ]);

    reply.send({
      success: true,
      data: media.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        dropzoneId: m.dropzoneId,
        loadId: m.loadId,
        fileUrl: m.fileUrl,
        thumbnailUrl: m.thumbnailUrl,
        mediaType: m.mediaType,
        mimeType: m.mimeType,
        fileSizeBytes: m.fileSizeBytes,
        width: m.width,
        height: m.height,
        geoLat: m.geoLat,
        geoLng: m.geoLng,
        moderationStatus: m.moderationStatus,
        tags: m.tags.map((t: any) => ({ id: t.id, taggedUserId: t.taggedUserId })),
        createdAt: m.createdAt,
      })),
      meta: { total, limit, offset },
    });
  });

  /**
   * GET /api/uploads/media/:id
   * Get a single media upload by ID.
   */
  fastify.get("/uploads/media/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const mediaId = parseInt(id, 10);

    if (!Number.isFinite(mediaId)) {
      throw new AppError("Invalid media ID", 400);
    }

    const media = await fastify.prisma.mediaUpload.findUnique({
      where: { id: mediaId },
      include: { tags: true },
    });

    if (!media) {
      throw new AppError("Media not found", 404);
    }

    reply.send({
      success: true,
      data: {
        id: media.id,
        userId: media.userId,
        dropzoneId: media.dropzoneId,
        loadId: media.loadId,
        fileUrl: media.fileUrl,
        thumbnailUrl: media.thumbnailUrl,
        mediaType: media.mediaType,
        mimeType: media.mimeType,
        fileSizeBytes: media.fileSizeBytes,
        width: media.width,
        height: media.height,
        geoLat: media.geoLat,
        geoLng: media.geoLng,
        moderationStatus: media.moderationStatus,
        tags: media.tags.map((t: any) => ({ id: t.id, taggedUserId: t.taggedUserId })),
        createdAt: media.createdAt,
      },
    });
  });

  /**
   * GET /api/uploads/media/tags
   * List media tags, optionally filtered by taggedUserId.
   */
  fastify.get("/uploads/media/tags", async (request: FastifyRequest, reply: FastifyReply) => {
    const { taggedUserId, limit: rawLimit, offset: rawOffset } = request.query as {
      taggedUserId?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(rawLimit || "50", 10) || 50, 100);
    const offset = parseInt(rawOffset || "0", 10) || 0;

    const where: any = {};
    if (taggedUserId) {
      const uid = parseInt(taggedUserId, 10);
      if (Number.isFinite(uid)) where.taggedUserId = uid;
    }

    const [tags, total] = await Promise.all([
      fastify.prisma.mediaTag.findMany({
        where,
        include: {
          media: {
            select: { id: true, fileUrl: true, thumbnailUrl: true, mediaType: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      fastify.prisma.mediaTag.count({ where }),
    ]);

    reply.send({
      success: true,
      data: tags.map((t: any) => ({
        id: t.id,
        mediaId: t.mediaId,
        taggedUserId: t.taggedUserId,
        media: t.media
          ? {
              id: t.media.id,
              fileUrl: t.media.fileUrl,
              thumbnailUrl: t.media.thumbnailUrl,
              mediaType: t.media.mediaType,
            }
          : null,
        createdAt: t.createdAt,
      })),
      meta: { total, limit, offset },
    });
  });
}
