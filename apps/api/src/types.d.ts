import { FastifyRequest } from "fastify";

interface UserPayload {
  sub: string;
  email: string;
  dropzoneId?: string;
  roles: string[];
  type?: "access" | "refresh";
  jti?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: UserPayload;
    dropzoneId?: string;
  }

  interface FastifyInstance {
    prisma: any;
    authenticate: (request: FastifyRequest) => Promise<void>;
    broadcastToDropzone: (dropzoneId: string, event: any) => void;
    addToRoom: (dropzoneId: string, socket: any) => void;
    removeFromRoom: (dropzoneId: string, socket: any) => void;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

export {};
