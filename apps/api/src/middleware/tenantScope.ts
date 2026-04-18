import { FastifyRequest, FastifyReply } from "fastify";

export async function tenantScope(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return;
  }

  // Attach dropzoneId to request for easy access in routes
  request.dropzoneId = request.user.dropzoneId;

  // Verify that any dropzone parameter matches the user's dropzone
  const dzParam = (request.params as any)?.dzId || (request.params as any)?.dropzoneId;

  if (dzParam && dzParam !== request.user.dropzoneId) {
    reply.code(403).send({
      success: false,
      error: "Access denied: dropzone mismatch",
    });
    return;
  }
}
