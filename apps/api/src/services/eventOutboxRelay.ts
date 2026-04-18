import { PrismaClient } from "@prisma/client";

// ============================================================================
// EVENT OUTBOX RELAY — Transactional outbox pattern for financial events
// ============================================================================
// Polls event_outbox table for PENDING events and publishes them to the
// in-process EventBus. Ensures at-least-once delivery for financial events.
//
// 4 Event Channels:
//   financial  → transactional outbox (this relay) — at-least-once, ordered
//   manifest   → in-process EventBus — at-least-once
//   safety     → in-process EventBus (high priority) — at-least-once
//   ui         → WebSocket broadcast — best-effort
// ============================================================================

export type EventHandler = (event: OutboxEvent) => Promise<void>;

export interface OutboxEvent {
  id: number;
  eventType: string;
  aggregateType: string;
  aggregateId: number;
  tenantId: number; // dropzoneId
  payload: any;
  metadata: any;
  createdAt: Date;
}

const MAX_RETRIES = 5;
const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 50;

export interface Logger {
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
}

const fallbackLogger: Logger = {
  info: (msg, ...args) => console.log(msg, ...args),
  warn: (msg, ...args) => console.warn(msg, ...args),
  error: (msg, ...args) => console.error(msg, ...args),
};

export class EventOutboxRelay {
  private handlers: Map<string, EventHandler[]> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private log: Logger;

  constructor(private prisma: PrismaClient, logger?: Logger) {
    this.log = logger || fallbackLogger;
  }

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Register a handler for all event types (wildcard).
   */
  onAll(handler: EventHandler): void {
    this.on("*", handler);
  }

  /**
   * Start polling the outbox table.
   */
  start(): void {
    if (this.timer) return;
    this.log.info(`[EventOutboxRelay] Starting relay — polling every ${POLL_INTERVAL_MS} ms`);
    this.timer = setInterval(() => this.processBatch(), POLL_INTERVAL_MS);
  }

  /**
   * Stop polling.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log.info("[EventOutboxRelay] Relay stopped");
    }
  }

  /**
   * Process a batch of pending outbox events.
   */
  async processBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      // Fetch pending events ordered by creation time
      const events = await this.prisma.eventOutbox.findMany({
        where: {
          status: "PENDING",
          retryCount: { lt: MAX_RETRIES },
        },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });

      if (events.length === 0) {
        return 0;
      }

      let published = 0;

      for (const event of events) {
        try {
          const outboxEvent: OutboxEvent = {
            id: event.id,
            eventType: event.eventType,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            tenantId: event.tenantId,
            payload: event.payload,
            metadata: event.metadata,
            createdAt: event.createdAt,
          };

          // Dispatch to registered handlers
          await this.dispatch(outboxEvent);

          // Mark as PUBLISHED
          await this.prisma.eventOutbox.update({
            where: { id: event.id },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
            },
          });

          published++;
        } catch (error) {
          // Increment retry count
          const newRetryCount = event.retryCount + 1;
          const newStatus = newRetryCount >= MAX_RETRIES ? "FAILED" : "PENDING";

          await this.prisma.eventOutbox.update({
            where: { id: event.id },
            data: {
              status: newStatus,
              retryCount: newRetryCount,
            },
          });

          this.log.error(
            `[EventOutboxRelay] Event ${event.id} failed (attempt ${newRetryCount}/${MAX_RETRIES}):`,
            error
          );
        }
      }

      if (published > 0) {
        this.log.info(`[EventOutboxRelay] Published ${published}/${events.length} events`);
      }

      return published;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Dispatch an event to all matching handlers.
   */
  private async dispatch(event: OutboxEvent): Promise<void> {
    const specificHandlers = this.handlers.get(event.eventType) || [];
    const wildcardHandlers = this.handlers.get("*") || [];
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      // No handlers — still mark as published (event was successfully relayed)
      return;
    }

    await Promise.all(allHandlers.map((h) => h(event)));
  }

  /**
   * Enqueue a new event into the outbox (called within a transaction).
   * This should be called in the SAME transaction as the business data mutation.
   */
  static async enqueue(
    prisma: PrismaClient,
    params: {
      eventType: string;
      aggregateType: string;
      aggregateId: number;
      tenantId: number;
      payload: any;
      metadata?: any;
    }
  ): Promise<number> {
    const event = await prisma.eventOutbox.create({
      data: {
        eventType: params.eventType,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        tenantId: params.tenantId,
        payload: params.payload,
        metadata: params.metadata ?? {},
        status: "PENDING",
        retryCount: 0,
      },
    });

    return event.id;
  }

  /**
   * Get relay health metrics.
   */
  async getHealth(): Promise<{
    pendingCount: number;
    failedCount: number;
    oldestPending: Date | null;
  }> {
    const [pendingCount, failedCount, oldest] = await Promise.all([
      this.prisma.eventOutbox.count({ where: { status: "PENDING" } }),
      this.prisma.eventOutbox.count({ where: { status: "FAILED" } }),
      this.prisma.eventOutbox.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      pendingCount,
      failedCount,
      oldestPending: oldest?.createdAt ?? null,
    };
  }
}

export function createEventOutboxRelay(prisma: PrismaClient): EventOutboxRelay {
  return new EventOutboxRelay(prisma);
}
