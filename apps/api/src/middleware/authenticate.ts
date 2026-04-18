import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = extractTokenFromHeader(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedError("Missing authorization token");
    }

    const payload = verifyToken(token);
    if (payload.type !== "access") {
      throw new UnauthorizedError("Invalid token type");
    }

    request.user = payload;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";
    return reply.code(401).send({
      success: false,
      error: message,
    });
  }
}

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  if (!request.user) {
    reply.code(401).send({
      success: false,
      error: "Unauthorized",
    });
    return false;
  }
  return true;
}
