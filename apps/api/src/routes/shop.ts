import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// SHOP / MARKETPLACE ROUTES
// Per gap spec §7.9 — products, inventory, orders
// ============================================================================

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().min(1).max(100),
  priceCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  imageUrl: z.string().url().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  priceCents: z.number().int().positive().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
  notes: z.string().optional(),
});

function getUserId(request: any): number {
  return parseInt(request.user?.sub ?? request.user?.id ?? "0");
}

function getDzId(request: any): number {
  return parseInt(request.user?.dropzoneId ?? "0");
}

export async function shopRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  // ========================================================================
  // PRODUCTS
  // ========================================================================

  // GET /shop/products — list products for a DZ
  fastify.get<{ Querystring: { category?: string; active?: string } }>(
    "/shop/products",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const where: any = { dropzoneId };
        if (request.query.category) where.category = request.query.category;
        if (request.query.active !== "false") where.isActive = true;

        const products = await prisma.shopProduct.findMany({
          where,
          orderBy: { name: "asc" },
          include: { inventory: true },
        });

        reply.send({ success: true, data: { products } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch products" });
      }
    }
  );

  // POST /shop/products — create product (staff)
  fastify.post<{ Body: z.infer<typeof createProductSchema> }>(
    "/shop/products",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const body = createProductSchema.parse(request.body);

        const product = await prisma.shopProduct.create({
          data: { dropzoneId, ...body },
        });

        reply.code(201).send({ success: true, data: product });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to create product" });
      }
    }
  );

  // PATCH /shop/products/:id — update product
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof updateProductSchema> }>(
    "/shop/products/:id",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id);
        const body = updateProductSchema.parse(request.body);

        const product = await prisma.shopProduct.update({
          where: { id },
          data: body,
        });

        reply.send({ success: true, data: product });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to update product" });
      }
    }
  );

  // ========================================================================
  // INVENTORY
  // ========================================================================

  // PATCH /shop/products/:id/inventory — update stock
  fastify.patch<{ Params: { id: string }; Body: { quantity: number; branchId?: number } }>(
    "/shop/products/:id/inventory",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "MANIFEST_STAFF", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const productId = parseInt(request.params.id);
        const { quantity, branchId } = request.body;

        const inventory = await prisma.shopInventory.upsert({
          where: { productId_branchId: { productId, branchId: branchId ?? null } },
          create: { productId, branchId: branchId ?? null, quantity },
          update: { quantity },
        });

        reply.send({ success: true, data: inventory });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to update inventory" });
      }
    }
  );

  // ========================================================================
  // ORDERS
  // ========================================================================

  // GET /shop/orders — list orders (staff sees all DZ, athlete sees own)
  fastify.get<{ Querystring: { status?: string; mine?: string } }>(
    "/shop/orders",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const userId = getUserId(request);
        const where: any = { dropzoneId };

        if (request.query.mine === "true") where.userId = userId;
        if (request.query.status) where.status = request.query.status;

        const orders = await prisma.shopOrder.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { items: { include: { product: true } } },
        });

        reply.send({ success: true, data: { orders } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch orders" });
      }
    }
  );

  // POST /shop/orders — create order
  fastify.post<{ Body: z.infer<typeof createOrderSchema> }>(
    "/shop/orders",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const userId = getUserId(request);
        const body = createOrderSchema.parse(request.body);

        // Fetch products to calculate total
        const productIds = body.items.map(i => i.productId);
        const products = await prisma.shopProduct.findMany({
          where: { id: { in: productIds }, dropzoneId, isActive: true },
        });

        if (products.length !== productIds.length) {
          reply.code(400).send({ success: false, error: "One or more products not found or inactive" });
          return;
        }

        const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]));
        let totalCents = 0;
        const orderItems = body.items.map(item => {
          const product = productMap.get(item.productId)!;
          const price = product.priceCents as number;
          totalCents += price * item.quantity;
          return { productId: item.productId, quantity: item.quantity, unitPriceCents: price };
        });

        const order = await prisma.shopOrder.create({
          data: {
            uuid: uuidv4(),
            dropzoneId,
            userId,
            totalCents,
            currency: products[0]?.currency ?? "USD",
            notes: body.notes ?? null,
            items: { create: orderItems },
          },
          include: { items: { include: { product: true } } },
        });

        reply.code(201).send({ success: true, data: order });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to create order" });
      }
    }
  );

  // PATCH /shop/orders/:id/status — update order status (staff)
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    "/shop/orders/:id/status",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "MANIFEST_STAFF", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id);
        const { status } = request.body;

        const validStatuses = ["PENDING", "PAID", "FULFILLED", "CANCELLED_ORDER", "REFUNDED_ORDER"];
        if (!validStatuses.includes(status)) {
          reply.code(400).send({ success: false, error: `Invalid status. Use: ${validStatuses.join(", ")}` });
          return;
        }

        const order = await prisma.shopOrder.update({
          where: { id },
          data: { status },
        });

        reply.send({ success: true, data: order });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to update order" });
      }
    }
  );

  // ========================================================================
  // STRIPE CHECKOUT
  // ========================================================================

  // POST /shop/orders/:id/checkout — Create Stripe payment intent for an order
  fastify.post<{ Params: { id: string } }>(
    "/shop/orders/:id/checkout",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const orderId = parseInt(request.params.id);
        const userId = getUserId(request);

        const order = await prisma.shopOrder.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } } },
        });

        if (!order) {
          reply.code(404).send({ success: false, error: "Order not found" });
          return;
        }
        if (order.userId !== userId) {
          reply.code(403).send({ success: false, error: "Not your order" });
          return;
        }
        if (order.status !== "PENDING") {
          reply.code(400).send({ success: false, error: `Order is ${order.status}, not PENDING` });
          return;
        }

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          reply.code(503).send({ success: false, error: "Payment processing not configured" });
          return;
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        const itemsSummary = order.items
          .map((i: any) => `${i.quantity}x ${i.product.name}`)
          .join(", ");

        const paymentIntent = await stripe.paymentIntents.create({
          amount: order.totalCents,
          currency: order.currency?.toLowerCase() || "usd",
          metadata: {
            orderId: String(orderId),
            userId: String(userId),
            type: "shop_order",
          },
          receipt_email: user?.email,
          description: `SkyLara Shop: ${itemsSummary}`,
        });

        // Store payment intent ID on order
        await prisma.shopOrder.update({
          where: { id: orderId },
          data: { stripePaymentIntentId: paymentIntent.id } as any,
        });

        reply.send({
          success: true,
          data: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: order.totalCents,
            currency: order.currency || "USD",
          },
        });
      } catch (error) {
        console.error("Shop checkout error:", error);
        reply.code(500).send({ success: false, error: "Checkout failed" });
      }
    }
  );

  // POST /shop/orders/:id/confirm-payment — Verify payment and mark order PAID
  fastify.post<{ Params: { id: string }; Body: { paymentIntentId: string } }>(
    "/shop/orders/:id/confirm-payment",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const orderId = parseInt(request.params.id);
        const userId = getUserId(request);
        const { paymentIntentId } = request.body;

        if (!paymentIntentId) {
          reply.code(400).send({ success: false, error: "paymentIntentId required" });
          return;
        }

        const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
        if (!order) {
          reply.code(404).send({ success: false, error: "Order not found" });
          return;
        }
        if (order.userId !== userId) {
          reply.code(403).send({ success: false, error: "Not your order" });
          return;
        }

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          reply.code(503).send({ success: false, error: "Payment processing not configured" });
          return;
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);

        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          reply.code(402).send({ success: false, error: `Payment status: ${pi.status}` });
          return;
        }
        if (pi.metadata.orderId !== String(orderId)) {
          reply.code(403).send({ success: false, error: "Payment does not match this order" });
          return;
        }

        // Mark order as PAID and decrement inventory
        const updated = await prisma.shopOrder.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          } as any,
          include: { items: true },
        });

        // Decrement inventory for each item
        for (const item of updated.items) {
          await prisma.shopInventory.updateMany({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } },
          }).catch(() => {}); // Non-blocking — inventory may not be tracked
        }

        reply.send({ success: true, data: { orderId, status: "PAID" } });
      } catch (error) {
        console.error("Payment confirmation error:", error);
        reply.code(500).send({ success: false, error: "Payment confirmation failed" });
      }
    }
  );
}
