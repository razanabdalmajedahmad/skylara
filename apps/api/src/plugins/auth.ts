import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("authenticate", async (request: any) => {
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
      throw new UnauthorizedError(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  });
});
