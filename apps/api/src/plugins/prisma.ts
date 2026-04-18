import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaRead: PrismaClient | undefined;
}

const logConfig = process.env.NODE_ENV === "development"
  ? ["query"] as const
  : ["error", "warn"] as const;

// Primary (read-write) client
const prisma =
  global.prisma ||
  new PrismaClient({
    log: [...logConfig],
    // Connection pool configured via DATABASE_URL query params:
    //   ?connection_limit=10&pool_timeout=10
    // Production: connection_limit = (num_cpu * 2) + 1
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

// Read replica client — uses DATABASE_READ_URL if configured, otherwise falls back to primary.
// Routes read-heavy queries (dashboards, reports, load board polling) to the replica,
// keeping the primary available for writes.
const readUrl = process.env.DATABASE_READ_URL;
let prismaRead: PrismaClient;

if (readUrl && readUrl !== process.env.DATABASE_URL) {
  prismaRead =
    global.prismaRead ||
    new PrismaClient({
      datasourceUrl: readUrl,
      log: [...logConfig],
    });
  if (process.env.NODE_ENV !== "production") global.prismaRead = prismaRead;
} else {
  // No read replica — use primary for everything
  prismaRead = prisma;
}

export default fp(async (fastify: FastifyInstance) => {
  await prisma.$connect();
  if (prismaRead !== prisma) {
    await prismaRead.$connect();
    fastify.log.info("[Prisma] Read replica connected");
  }

  fastify.decorate("prisma", prisma);
  fastify.decorate("prismaRead", prismaRead);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
    if (prismaRead !== prisma) {
      await prismaRead.$disconnect();
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient & Record<string, any>;
    prismaRead: PrismaClient & Record<string, any>;
  }
}
