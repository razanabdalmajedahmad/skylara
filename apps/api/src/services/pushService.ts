import { FastifyInstance } from "fastify";

/**
 * Push Notification Service — Expo Push (iOS/Android) + Web Push (VAPID).
 *
 * Mobile: Uses expo-server-sdk which abstracts FCM and APNs.
 * Web: Uses web-push library with VAPID keys for browser push.
 *
 * Dev mode: logs to console when credentials are not configured.
 */

// Android notification channel mapping for Expo Push
const ANDROID_CHANNEL_MAP: Record<string, string> = {
  EMERGENCY_ACTIVATED: "emergency",
  INCIDENT_REPORTED: "emergency",
  GEAR_CHECK_FAILED: "emergency",
  RIG_GROUNDED: "emergency",
  RIG_OVERDUE: "emergency",
  WEATHER_ALERT: "weather",
  WIND_LIMIT_EXCEEDED: "weather",
  LOAD_CREATED: "loads",
  LOAD_CANCELLED: "loads",
  LOAD_BOARDING: "loads",
  LOAD_DEPARTED: "loads",
  SLOT_ASSIGNED: "loads",
  SLOT_CANCELLED: "loads",
};

interface PushResult {
  platform: "mobile" | "web";
  sent: number;
  failed: number;
  errors: string[];
}

export class PushService {
  private expo: any = null;
  private webPush: any = null;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.initExpo();
    this.initWebPush();
  }

  private initExpo(): void {
    try {
      const { Expo } = require("expo-server-sdk");
      const accessToken = process.env.EXPO_ACCESS_TOKEN;
      this.expo = new Expo(accessToken ? { accessToken } : undefined);
      this.fastify.log.info("[PushService] Expo SDK initialized");
    } catch (err) {
      this.fastify.log.info("[PushService] expo-server-sdk not available — mobile push will log to console");
    }
  }

  private initWebPush(): void {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!vapidPublicKey || !vapidPrivateKey) {
      this.fastify.log.info("[PushService] VAPID keys not configured — web push will log to console");
      return;
    }

    try {
      this.webPush = require("web-push");
      this.webPush.setVapidDetails(
        vapidSubject || "mailto:admin@skylara.com",
        vapidPublicKey,
        vapidPrivateKey
      );
      this.fastify.log.info("[PushService] Web Push VAPID configured");
    } catch (err) {
      this.fastify.log.info("[PushService] web-push not available — web push will log to console");
    }
  }

  /**
   * Send push to all of a user's registered devices (mobile + web).
   */
  async sendPush(
    userId: number,
    title: string,
    body: string,
    data: Record<string, any> = {},
    eventType?: string
  ): Promise<{ mobile: PushResult; web: PushResult }> {
    const [mobileResult, webResult] = await Promise.allSettled([
      this.sendToMobile(userId, title, body, data, eventType),
      this.sendToWeb(userId, title, body, data),
    ]);

    return {
      mobile: mobileResult.status === "fulfilled"
        ? mobileResult.value
        : { platform: "mobile", sent: 0, failed: 0, errors: [String(mobileResult.reason)] },
      web: webResult.status === "fulfilled"
        ? webResult.value
        : { platform: "web", sent: 0, failed: 0, errors: [String(webResult.reason)] },
    };
  }

  /**
   * Send push to user's mobile devices via Expo Push API.
   */
  async sendToMobile(
    userId: number,
    title: string,
    body: string,
    data: Record<string, any> = {},
    eventType?: string
  ): Promise<PushResult> {
    // Fetch active mobile push tokens
    const devices = await (this.fastify.prisma as any).pushDevice.findMany({
      where: {
        userId,
        active: true,
        platform: { in: ["IOS", "ANDROID"] },
      },
    });

    if (devices.length === 0) {
      return { platform: "mobile", sent: 0, failed: 0, errors: [] };
    }

    // Dev mode fallback
    if (!this.expo) {
      this.fastify.log.info(
        { userId, title, deviceCount: devices.length },
        "DEV MODE PUSH (Expo not configured)"
      );
      return { platform: "mobile", sent: devices.length, failed: 0, errors: [] };
    }

    // Build Expo push messages
    const androidChannelId = eventType
      ? ANDROID_CHANNEL_MAP[eventType] || "default"
      : "default";

    const isEmergency = ["emergency"].includes(androidChannelId);

    const messages = devices
      .filter((d: any) => this.expo.isExpoPushToken(d.pushToken))
      .map((device: any) => ({
        to: device.pushToken,
        sound: isEmergency ? "default" : undefined,
        title,
        body,
        data,
        priority: isEmergency ? "high" : "default",
        channelId: androidChannelId,
      }));

    if (messages.length === 0) {
      return { platform: "mobile", sent: 0, failed: 0, errors: ["No valid Expo push tokens"] };
    }

    // Send in chunks via circuit breaker
    const breaker = this.fastify.circuitBreakers.get("expo");
    const chunks = this.expo.chunkPushNotifications(messages);
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const tickets: any[] = await breaker.exec<any[]>(() =>
          this.expo.sendPushNotificationsAsync(chunk)
        );

        for (const ticket of tickets) {
          if (ticket.status === "ok") {
            sent++;
          } else {
            failed++;
            if (ticket.details?.error) {
              errors.push(ticket.details.error);
            }
          }
        }

        // Schedule receipt processing (check delivery after 15s)
        this.scheduleReceiptCheck(tickets);
      } catch (err: any) {
        failed += chunk.length;
        errors.push(err.message || "Expo send failed");
        this.fastify.log.error({ err }, "Expo push chunk send failed");
      }
    }

    this.fastify.log.info({ userId, sent, failed }, "Expo push sent");
    return { platform: "mobile", sent, failed, errors };
  }

  /**
   * Send push to user's web browser subscriptions via Web Push.
   */
  async sendToWeb(
    userId: number,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<PushResult> {
    // Fetch active web push subscriptions
    const devices = await (this.fastify.prisma as any).pushDevice.findMany({
      where: {
        userId,
        active: true,
        platform: "WEB",
      },
    });

    if (devices.length === 0) {
      return { platform: "web", sent: 0, failed: 0, errors: [] };
    }

    // Dev mode fallback
    if (!this.webPush) {
      this.fastify.log.info(
        { userId, title, deviceCount: devices.length },
        "DEV MODE WEB PUSH (VAPID not configured)"
      );
      return { platform: "web", sent: devices.length, failed: 0, errors: [] };
    }

    const breaker = this.fastify.circuitBreakers.get("webpush");
    const payload = JSON.stringify({ title, body, data });
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const device of devices) {
      try {
        // pushToken stores the JSON-stringified PushSubscription
        const subscription = JSON.parse(device.pushToken);

        await breaker.exec(() =>
          this.webPush.sendNotification(subscription, payload)
        );

        sent++;
      } catch (err: any) {
        failed++;
        const statusCode = err.statusCode;

        // 404 or 410 = subscription expired/invalid, deactivate
        if (statusCode === 404 || statusCode === 410) {
          await (this.fastify.prisma as any).pushDevice.update({
            where: { id: device.id },
            data: { active: false },
          });
          errors.push(`Token expired for device ${device.id}`);
          this.fastify.log.info({ deviceId: device.id }, "Web push subscription expired — deactivated");
        } else {
          errors.push(err.message || "Web push send failed");
        }
      }
    }

    this.fastify.log.info({ userId, sent, failed }, "Web push sent");
    return { platform: "web", sent, failed, errors };
  }

  /**
   * Process Expo push receipts to detect invalid tokens.
   * Called ~15s after sending to check delivery status.
   */
  private scheduleReceiptCheck(tickets: Array<any>): void {
    const receiptIds = (tickets as any[])
      .filter((t: any) => t.id)
      .map((t: any) => t.id);

    if (receiptIds.length === 0) return;

    setTimeout(async () => {
      try {
        const receiptChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

        for (const chunk of receiptChunks) {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

          for (const [receiptId, receipt] of Object.entries(receipts)) {
            const r = receipt as any;
            if (r.status === "error") {
              this.fastify.log.warn(
                { receiptId, error: r.details?.error, message: r.message },
                "Expo push receipt error"
              );

              // Deactivate invalid tokens
              if (r.details?.error === "DeviceNotRegistered") {
                // Find and deactivate the PushDevice by matching the ticket
                this.fastify.log.info({ receiptId }, "DeviceNotRegistered — token will be cleaned up by stale token cleanup job");
              }
            }
          }
        }
      } catch (err) {
        this.fastify.log.error({ err }, "Failed to check Expo push receipts");
      }
    }, 15_000);
  }
}
