import { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../utils/errors";

// Schemas for validation
const articleListQuerySchema = z.object({
  category: z.string().optional(),
  module: z.string().optional(),
  role: z.string().optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
  role: z.string().optional(),
});

export async function helpCenterRoutes(fastify: FastifyInstance) {
  // GET /api/help/articles - List all help articles with optional filters
  fastify.get<{ Querystring: z.infer<typeof articleListQuerySchema> }>(
    "/help/articles",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            category: { type: "string" },
            module: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = articleListQuerySchema.parse(request.query);

        // Build dynamic where clause
        const where: any = { isPublished: true };
        if (query.category) where.category = query.category;
        if (query.module) where.module = query.module;

        const articles = await fastify.prisma.helpArticle.findMany({
          where,
          select: {
            id: true,
            slug: true,
            title: true,
            shortAnswer: true,
            category: true,
            module: true,
            rolesAllowed: true,
            routeReference: true,
            sortOrder: true,
            createdAt: true,
          },
          orderBy: { sortOrder: "asc" },
        });

        // Filter by role client-side since rolesAllowed is Json
        let filtered = articles;
        if (query.role) {
          filtered = articles.filter((a) => {
            const roles = a.rolesAllowed as string[];
            return !roles || roles.length === 0 || roles.includes(query.role!);
          });
        }

        reply.code(200).send({
          success: true,
          data: {
            articles: filtered,
            count: filtered.length,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Invalid query parameters",
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch articles",
          });
        }
      }
    }
  );

  // GET /api/help/articles/:slug - Get single article by slug
  fastify.get<{ Params: { slug: string } }>(
    "/help/articles/:slug",
    async (request, reply) => {
      try {
        const { slug } = request.params;

        const article = await fastify.prisma.helpArticle.findUnique({
          where: { slug },
        });

        if (!article) {
          throw new NotFoundError("Article");
        }

        reply.code(200).send({
          success: true,
          data: article,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch article",
          });
        }
      }
    }
  );

  // GET /api/help/search - Search across articles
  fastify.get<{ Querystring: z.infer<typeof searchQuerySchema> }>(
    "/help/search",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            q: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = searchQuerySchema.parse(request.query);

        // Search in title and shortAnswer (MySQL doesn't support mode: insensitive)
        const articles = await fastify.prisma.helpArticle.findMany({
          where: {
            isPublished: true,
            OR: [
              { title: { contains: query.q } },
              { shortAnswer: { contains: query.q } },
            ],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            shortAnswer: true,
            category: true,
            module: true,
            rolesAllowed: true,
          },
          take: 20,
        });

        // Filter by role if provided
        let results = articles;
        if (query.role) {
          results = articles.filter((a) => {
            const roles = a.rolesAllowed as string[];
            return !roles || roles.length === 0 || roles.includes(query.role!);
          });
        }

        reply.code(200).send({
          success: true,
          data: {
            results,
            count: results.length,
            query: query.q,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Search query required",
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Search failed",
          });
        }
      }
    }
  );

  // GET /api/help/categories - List unique categories with article counts
  fastify.get("/help/categories", async (request, reply) => {
    try {
      const articles = await fastify.prisma.helpArticle.findMany({
        where: { isPublished: true },
        select: { category: true },
      });

      // Aggregate categories manually since there's no HelpCategory model
      const categoryMap = new Map<string, number>();
      articles.forEach((a) => {
        categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
      });

      const categories = Array.from(categoryMap.entries()).map(
        ([name, count]) => ({
          name,
          articleCount: count,
        })
      );

      reply.code(200).send({
        success: true,
        data: {
          categories,
          count: categories.length,
        },
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: "Failed to fetch categories",
      });
    }
  });

  // GET /api/help/features - List all features from feature registry
  fastify.get("/help/features", async (request, reply) => {
    try {
      const features = await fastify.prisma.featureRegistry.findMany({
        where: { status: "available" },
        select: {
          id: true,
          featureName: true,
          description: true,
          module: true,
          route: true,
          rolesRequired: true,
          status: true,
        },
        orderBy: { featureName: "asc" },
      });

      reply.code(200).send({
        success: true,
        data: {
          features,
          count: features.length,
        },
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: "Failed to fetch features",
      });
    }
  });

  // GET /api/help/features/lookup - Lookup specific feature by name
  fastify.get<{ Querystring: { name: string } }>(
    "/help/features/lookup",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const name = (request.query as { name: string }).name;

        const feature = await fastify.prisma.featureRegistry.findFirst({
          where: {
            featureName: name,
          },
        });

        if (!feature) {
          throw new NotFoundError("Feature");
        }

        reply.code(200).send({
          success: true,
          data: { feature },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Feature lookup failed",
          });
        }
      }
    }
  );
}
