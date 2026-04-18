import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import WebSocket from "@fastify/websocket";
import { verifyToken, extractTokenFromHeader, JWTPayload } from "../utils/jwt";

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(WebSocket);

  // Rooms keyed by dropzoneId for manifest updates
  const rooms = new Map<string, Set<any>>();

  fastify.decorate("broadcastToDropzone", (dropzoneId: string, event: any) => {
    const room = rooms.get(dropzoneId);
    if (room) {
      room.forEach((socket) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(event));
        }
      });
    }
  });

  fastify.decorate("addToRoom", (dropzoneId: string, socket: any) => {
    if (!rooms.has(dropzoneId)) {
      rooms.set(dropzoneId, new Set());
    }
    rooms.get(dropzoneId)!.add(socket);
  });

  fastify.decorate("removeFromRoom", (dropzoneId: string, socket: any) => {
    const room = rooms.get(dropzoneId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        rooms.delete(dropzoneId);
      }
    }
  });

  fastify.get("/ws/:dropzoneId", { websocket: true }, (socket: any, req) => {
    const dropzoneId = (req.params as any).dropzoneId as string;
    // @fastify/websocket v8: socket may be SocketStream; normalize to the underlying WebSocket
    const ws = socket.socket ?? socket;

    // Authenticate: extract JWT from Sec-WebSocket-Protocol header or query param
    // Browsers cannot set Authorization headers on WebSocket, so we accept the token
    // via the protocol header (client sends: new WebSocket(url, [token])) or ?token= query.
    let token: string | null = null;
    const protocols = req.headers["sec-websocket-protocol"];
    if (protocols) {
      // Protocol header may contain "access_token, <jwt>" — pick the JWT part
      const parts = (typeof protocols === "string" ? protocols : protocols[0]).split(",").map(s => s.trim());
      token = parts.find(p => p.includes(".")) || null;
    }
    if (!token) {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      token = url.searchParams.get("token");
    }
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      fastify.log.warn(`[WS] Connection rejected — no token for room ${dropzoneId}`);
      ws.send(JSON.stringify({ error: "UNAUTHORIZED", message: "Missing authentication token" }));
      ws.close(4401, "Unauthorized");
      return;
    }

    let user: JWTPayload;
    try {
      user = verifyToken(token);
      if (user.type !== "access") {
        throw new Error("Invalid token type");
      }
    } catch {
      fastify.log.warn(`[WS] Connection rejected — invalid token for room ${dropzoneId}`);
      ws.send(JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid or expired token" }));
      ws.close(4401, "Unauthorized");
      return;
    }

    // Verify the user has access to this dropzone
    if (user.dropzoneId && user.dropzoneId !== dropzoneId) {
      fastify.log.warn(`[WS] Connection rejected — user ${user.sub} not authorized for DZ ${dropzoneId}`);
      ws.send(JSON.stringify({ error: "FORBIDDEN", message: "Not authorized for this dropzone" }));
      ws.close(4403, "Forbidden");
      return;
    }

    fastify.addToRoom(dropzoneId, socket);
    fastify.log.info(`[WS] User ${user.sub} joined room ${dropzoneId}`);

    socket.on("message", (data: any) => {
      fastify.log.debug(`[WS] ${dropzoneId} from ${user.sub}: ${data}`);
    });

    socket.on("close", () => {
      fastify.removeFromRoom(dropzoneId, socket);
      fastify.log.info(`[WS] User ${user.sub} left room ${dropzoneId}`);
    });
  });
});

declare module "fastify" {
  interface FastifyInstance {
    broadcastToDropzone: (dropzoneId: string, event: any) => void;
    addToRoom: (dropzoneId: string, socket: any) => void;
    removeFromRoom: (dropzoneId: string, socket: any) => void;
  }
}
