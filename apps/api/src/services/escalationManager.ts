import { FastifyInstance } from "fastify";

/**
 * Escalation Manager — safety-critical notification fallback chain.
 *
 * For emergency events (weather alerts, gear failures, incidents, etc.):
 *   Step 1 (immediate): push + in_app — dispatched by NotificationService
 *   Step 2 (30s):       if push not delivered → send SMS
 *   Step 3 (2min):      if not acknowledged (readAt null) → send WhatsApp
 *
 * Uses in-memory timers (setTimeout). At production multi-process scale,
 * escalation tracking should move to Redis or a job queue.
 */

interface EscalationState {
  notificationId: string;
  userId: number;
  eventType: string;
  title: string;
  body: string;
  startedAt: number;
  smsEscalated: boolean;
  whatsappEscalated: boolean;
  timers: NodeJS.Timeout[];
}

// Delay before SMS escalation (30 seconds)
const SMS_ESCALATION_DELAY_MS = 30_000;

// Delay before WhatsApp escalation (2 minutes)
const WHATSAPP_ESCALATION_DELAY_MS = 120_000;

export class EscalationManager {
  private fastify: FastifyInstance;
  private activeEscalations = new Map<string, EscalationState>();

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Start the escalation chain for an emergency notification.
   * Push + in_app are already dispatched before this is called.
   */
  async startEscalation(
    userId: number,
    notificationId: string,
    eventType: string,
    title: string,
    body: string
  ): Promise<void> {
    // Avoid duplicate escalations for the same notification
    if (this.activeEscalations.has(notificationId)) {
      return;
    }

    const state: EscalationState = {
      notificationId,
      userId,
      eventType,
      title,
      body,
      startedAt: Date.now(),
      smsEscalated: false,
      whatsappEscalated: false,
      timers: [],
    };

    this.fastify.log.info(
      { notificationId, userId, eventType },
      "ESCALATION: Started safety-critical fallback chain"
    );

    // Step 2: SMS after 30s if push not delivered
    const smsTimer = setTimeout(async () => {
      await this.escalateToSMS(state);
    }, SMS_ESCALATION_DELAY_MS);

    // Step 3: WhatsApp after 2min if not acknowledged
    const whatsappTimer = setTimeout(async () => {
      await this.escalateToWhatsApp(state);
    }, WHATSAPP_ESCALATION_DELAY_MS);

    state.timers.push(smsTimer, whatsappTimer);
    this.activeEscalations.set(notificationId, state);
  }

  /**
   * Cancel escalation if the notification was acknowledged.
   * Called when user reads the notification.
   */
  cancelEscalation(notificationId: string): void {
    const state = this.activeEscalations.get(notificationId);
    if (!state) return;

    for (const timer of state.timers) {
      clearTimeout(timer);
    }

    this.activeEscalations.delete(notificationId);
    this.fastify.log.info(
      { notificationId, userId: state.userId },
      "ESCALATION: Cancelled — notification acknowledged"
    );
  }

  private async escalateToSMS(state: EscalationState): Promise<void> {
    if (state.smsEscalated) return;

    try {
      // Check if push was delivered
      const pushDelivery = await (this.fastify.prisma as any).notificationDelivery.findFirst({
        where: {
          notificationId: state.notificationId,
          channel: "PUSH",
          status: "DELIVERED",
        },
      });

      if (pushDelivery) {
        this.fastify.log.info(
          { notificationId: state.notificationId },
          "ESCALATION: Push confirmed delivered — skipping SMS"
        );
        return;
      }

      // Also check if notification was already read
      const notification = await (this.fastify.prisma as any).notification.findUnique({
        where: { id: state.notificationId },
      });

      if (notification?.readAt) {
        this.cancelEscalation(state.notificationId);
        return;
      }

      // Fetch user phone number
      const user = await (this.fastify.prisma as any).user.findUnique({
        where: { id: state.userId },
        select: { phoneNumber: true },
      });

      if (!user?.phoneNumber) {
        this.fastify.log.warn(
          { userId: state.userId, notificationId: state.notificationId },
          "ESCALATION: No phone number — cannot escalate to SMS"
        );
        return;
      }

      // Send SMS via TwilioService
      const twilioService = (this.fastify as any).twilioService;
      if (twilioService) {
        const smsBody = `[URGENT] ${state.title}: ${state.body}`;
        const result = await twilioService.sendSMS(user.phoneNumber, smsBody);

        // Record delivery
        await (this.fastify.prisma as any).notificationDelivery.create({
          data: {
            notificationId: state.notificationId,
            channel: "SMS",
            status: "SENT",
            providerMessageId: result.sid,
            lastAttemptAt: new Date(),
          },
        });

        state.smsEscalated = true;
        this.fastify.log.warn(
          { notificationId: state.notificationId, userId: state.userId },
          "ESCALATION: Push undelivered after 30s — SMS sent"
        );
      }
    } catch (err) {
      this.fastify.log.error(
        { err, notificationId: state.notificationId },
        "ESCALATION: SMS escalation failed"
      );
    }
  }

  private async escalateToWhatsApp(state: EscalationState): Promise<void> {
    if (state.whatsappEscalated) return;

    try {
      // Check if notification was acknowledged
      const notification = await (this.fastify.prisma as any).notification.findUnique({
        where: { id: state.notificationId },
      });

      if (notification?.readAt) {
        this.cancelEscalation(state.notificationId);
        return;
      }

      // Fetch user phone number
      const user = await (this.fastify.prisma as any).user.findUnique({
        where: { id: state.userId },
        select: { phoneNumber: true },
      });

      if (!user?.phoneNumber) {
        this.fastify.log.warn(
          { userId: state.userId, notificationId: state.notificationId },
          "ESCALATION: No phone number — cannot escalate to WhatsApp"
        );
        this.cleanup(state.notificationId);
        return;
      }

      // Check WhatsApp consent
      const consent = await (this.fastify.prisma as any).whatsAppConsent.findUnique({
        where: { phone: user.phoneNumber },
      });

      if (!consent || consent.status !== "OPTED_IN") {
        this.fastify.log.info(
          { userId: state.userId },
          "ESCALATION: User not opted in for WhatsApp — skipping"
        );
        this.cleanup(state.notificationId);
        return;
      }

      // Send WhatsApp via TwilioService
      const twilioService = (this.fastify as any).twilioService;
      if (twilioService) {
        const waBody = `[URGENT - SkyLara] ${state.title}: ${state.body}`;
        const result = await twilioService.sendWhatsApp(user.phoneNumber, waBody);

        // Record delivery
        await (this.fastify.prisma as any).notificationDelivery.create({
          data: {
            notificationId: state.notificationId,
            channel: "SMS", // WhatsApp uses SMS channel in Prisma enum
            status: "SENT",
            providerMessageId: result.sid,
            lastAttemptAt: new Date(),
          },
        });

        state.whatsappEscalated = true;
        this.fastify.log.warn(
          { notificationId: state.notificationId, userId: state.userId },
          "ESCALATION: Unacknowledged after 2min — WhatsApp sent"
        );
      }
    } catch (err) {
      this.fastify.log.error(
        { err, notificationId: state.notificationId },
        "ESCALATION: WhatsApp escalation failed"
      );
    }

    this.cleanup(state.notificationId);
  }

  private cleanup(notificationId: string): void {
    this.activeEscalations.delete(notificationId);
  }

  /** Get count of active escalations (for monitoring) */
  getActiveCount(): number {
    return this.activeEscalations.size;
  }
}
