import { FastifyInstance } from "fastify";
import { EventEmitter } from "events";
import crypto from "crypto";
import https from "https";

// ============================================================================
// EVENT CATALOG & TYPES
// ============================================================================

export const EVENTS = {
  // Auth events
  USER_REGISTERED: "user.registered",
  USER_LOGIN_NEW_DEVICE: "user.login_new_device",
  PASSWORD_CHANGED: "user.password_changed",
  MFA_ENABLED: "user.mfa_enabled",

  // Manifest events
  LOAD_CREATED: "load.created",
  LOAD_CANCELLED: "load.cancelled",
  LOAD_BOARDING: "load.boarding",
  LOAD_DEPARTED: "load.departed",
  SLOT_ASSIGNED: "slot.assigned",
  SLOT_CANCELLED: "slot.cancelled",

  // Booking events
  BOOKING_CONFIRMED: "booking.confirmed",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_REMINDER_24H: "booking.reminder_24h",
  BOOKING_REMINDER_1H: "booking.reminder_1h",

  // Payment events
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_FAILED: "payment.failed",
  REFUND_ISSUED: "refund.issued",
  PAYOUT_READY: "payout.ready",
  PAYOUT_SENT: "payout.sent",
  PAYOUT_FAILED: "payout.failed",

  // Coaching events
  COACHING_SCHEDULED: "coaching.scheduled",
  COACHING_COMPLETED: "coaching.completed",
  COACH_RATING_RECEIVED: "coach.rating_received",

  // Safety events
  WEATHER_ALERT: "safety.weather_alert",
  WIND_LIMIT_EXCEEDED: "safety.wind_limit_exceeded",
  INCIDENT_REPORTED: "safety.incident_reported",
  EMERGENCY_ACTIVATED: "safety.emergency_activated",
  GEAR_CHECK_FAILED: "safety.gear_check_failed",

  // Onboarding events
  ONBOARDING_STARTED: "onboarding.started",
  ONBOARDING_STEP_COMPLETED: "onboarding.step_completed",
  ONBOARDING_COMPLETED: "onboarding.completed",
  ONBOARDING_ABANDONED: "onboarding.abandoned",

  // Rig maintenance events
  RIG_DUE_SOON: "rig.due_soon",
  RIG_DUE_NOW: "rig.due_now",
  RIG_OVERDUE: "rig.overdue",
  RIG_GROUNDED: "rig.grounded",
  RIG_GROUNDING_CLEARED: "rig.grounding_cleared",
  RIG_MAINTENANCE_COMPLETED: "rig.maintenance_completed",

  // System events
  ANNOUNCEMENT: "system.announcement",
  WAIVER_EXPIRING: "system.waiver_expiring",
  WAIVER_REQUIRED: "system.waiver_required",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

interface BaseEventPayload {
  timestamp: number;
  userId: number;
  dropzoneId: number;
}

// Auth payloads
interface UserRegisteredPayload extends BaseEventPayload {
  email: string;
  firstName: string;
}

interface UserLoginNewDevicePayload extends BaseEventPayload {
  deviceName: string;
  ipAddress: string;
}

interface PasswordChangedPayload extends BaseEventPayload {
  email: string;
}

interface MFAEnabledPayload extends BaseEventPayload {
  method: "totp" | "sms";
}

// Manifest payloads
interface LoadCreatedPayload extends BaseEventPayload {
  loadNumber: number;
  aircraft: string;
  jumpCount: number;
}

interface LoadCancelledPayload extends BaseEventPayload {
  loadNumber: number;
  reason: string;
}

interface LoadBoardingPayload extends BaseEventPayload {
  loadNumber: number;
  estimatedExitTime: string;
}

interface LoadDepartedPayload extends BaseEventPayload {
  loadNumber: number;
  actualExitTime: string;
}

interface SlotAssignedPayload extends BaseEventPayload {
  loadNumber: number;
  slotPosition: number;
  activityType: string;
}

interface SlotCancelledPayload extends BaseEventPayload {
  loadNumber: number;
  slotPosition: number;
  reason: string;
}

// Booking payloads
interface BookingConfirmedPayload extends BaseEventPayload {
  bookingId: string;
  dzName: string;
  jumpDate: string;
  confirmationNumber: string;
}

interface BookingCancelledPayload extends BaseEventPayload {
  bookingId: string;
  dzName: string;
  refundAmount: number;
  currency: string;
}

interface BookingReminderPayload extends BaseEventPayload {
  bookingId: string;
  dzName: string;
  jumpDate: string;
  hoursUntilJump: number;
}

// Payment payloads
interface PaymentReceivedPayload extends BaseEventPayload {
  amount: number;
  currency: string;
  transactionId: string;
  description: string;
}

interface PaymentFailedPayload extends BaseEventPayload {
  amount: number;
  currency: string;
  transactionId: string;
  reason: string;
}

interface RefundIssuedPayload extends BaseEventPayload {
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
}

interface PayoutReadyPayload extends BaseEventPayload {
  amount: number;
  currency: string;
  payoutDate: string;
  bankAccount: string;
}

interface PayoutSentPayload extends BaseEventPayload {
  payoutId: string;
  amount: number;
  currency: string;
}

interface PayoutFailedPayload extends BaseEventPayload {
  payoutId: string;
  amount: number;
  currency: string;
  reason: string;
}

// Coaching payloads
interface CoachingScheduledPayload extends BaseEventPayload {
  coachingId: string;
  coachName: string;
  scheduledDate: string;
  coachingType: string;
}

interface CoachingCompletedPayload extends BaseEventPayload {
  coachingId: string;
  coachName: string;
  completionDate: string;
}

interface CoachRatingReceivedPayload extends BaseEventPayload {
  coachingId: string;
  coachName: string;
  rating: number;
  feedback: string;
}

// Safety payloads
interface WeatherAlertPayload extends BaseEventPayload {
  severity: "low" | "medium" | "high";
  condition: string;
  affectedArea: string;
  recommendations: string;
}

interface WindLimitExceededPayload extends BaseEventPayload {
  currentWindSpeed: number;
  limit: number;
  unit: "knots" | "kph";
  affectedActivityTypes: string[];
}

interface IncidentReportedPayload extends BaseEventPayload {
  incidentId: string;
  type: string;
  description: string;
  severity: "minor" | "serious" | "critical";
}

interface EmergencyActivatedPayload extends BaseEventPayload {
  emergencyType: string;
  location: string;
  coordinates: { lat: number; lng: number };
}

interface GearCheckFailedPayload extends BaseEventPayload {
  checkType: string;
  failureReason: string;
  equipment: string;
}

// Onboarding payloads
interface OnboardingStartedPayload extends BaseEventPayload {
  userType: "athlete" | "instructor" | "admin";
  estimatedMinutes: number;
}

interface OnboardingStepCompletedPayload extends BaseEventPayload {
  step: string;
  progress: number;
  nextStep?: string;
}

interface OnboardingCompletedPayload extends BaseEventPayload {
  userType: string;
  totalTimeMinutes: number;
  certifications: string[];
}

interface OnboardingAbandonedPayload extends BaseEventPayload {
  userType: string;
  lastCompletedStep: string;
  progress: number;
}

// System payloads
interface AnnouncementPayload extends BaseEventPayload {
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  targetRoles: string[];
}

interface WaiverExpiringPayload extends BaseEventPayload {
  waiverType: string;
  expiryDate: string;
  daysRemaining: number;
}

interface WaiverRequiredPayload extends BaseEventPayload {
  waiverType: string;
  requiredBy: string;
}

// Rig maintenance payloads
export interface RigMaintenanceAlertPayload extends BaseEventPayload {
  rigId: number;
  rigName: string;
  serialNumber: string | null;
  componentType: string;
  status: string;              // OK, DUE_SOON, DUE_NOW, OVERDUE, GROUNDED
  previousStatus?: string;
  reason: string;
  triggerType: string;         // JUMPS, DAYS, COMBINED, GROUNDING
  triggerValue: number | null; // the threshold that was hit
  currentValue: number | null; // the current counter value
  ownerUserId: number | null;
}

export interface RigGroundingClearedPayload extends BaseEventPayload {
  rigId: number;
  rigName: string;
  componentType: string;
  clearedByName: string;
  clearanceNotes: string;
}

export interface RigMaintenanceCompletedPayload extends BaseEventPayload {
  rigId: number;
  rigName: string;
  componentType: string;
  maintenanceType: string;
  result: string;
  performedByName: string;
}

export type EventPayload =
  | UserRegisteredPayload
  | UserLoginNewDevicePayload
  | PasswordChangedPayload
  | MFAEnabledPayload
  | LoadCreatedPayload
  | LoadCancelledPayload
  | LoadBoardingPayload
  | LoadDepartedPayload
  | SlotAssignedPayload
  | SlotCancelledPayload
  | BookingConfirmedPayload
  | BookingCancelledPayload
  | BookingReminderPayload
  | PaymentReceivedPayload
  | PaymentFailedPayload
  | RefundIssuedPayload
  | PayoutReadyPayload
  | PayoutSentPayload
  | PayoutFailedPayload
  | CoachingScheduledPayload
  | CoachingCompletedPayload
  | CoachRatingReceivedPayload
  | WeatherAlertPayload
  | WindLimitExceededPayload
  | IncidentReportedPayload
  | EmergencyActivatedPayload
  | GearCheckFailedPayload
  | OnboardingStartedPayload
  | OnboardingStepCompletedPayload
  | OnboardingCompletedPayload
  | OnboardingAbandonedPayload
  | AnnouncementPayload
  | WaiverExpiringPayload
  | WaiverRequiredPayload
  | RigMaintenanceAlertPayload
  | RigGroundingClearedPayload
  | RigMaintenanceCompletedPayload;

// ============================================================================
// EVENT BUS
// ============================================================================

export type EventHandler = (payload: EventPayload) => Promise<void> | void;

export class EventBus {
  private emitter: EventEmitter;
  private handlers: Map<EventType, Set<EventHandler>> = new Map();

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  subscribe(eventType: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    const unsubscribe = () => {
      this.handlers.get(eventType)?.delete(handler);
    };

    return unsubscribe;
  }

  async publish(eventType: EventType, payload: EventPayload): Promise<void> {
    const handlers = this.handlers.get(eventType) || new Set();
    const promises = Array.from(handlers).map((handler) =>
      Promise.resolve(handler(payload)).catch((err) => {
        console.error(`Error in event handler for ${eventType}:`, err);
      })
    );
    await Promise.all(promises);
  }
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationChannel = "in_app" | "email" | "whatsapp" | "sms" | "push";

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  mutedEvents: EventType[];
  timezone?: string;
}

export interface NotificationTemplate {
  id: string;
  eventType: EventType;
  channel: NotificationChannel;
  locale: string;
  subject?: string;
  body: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: number;
  dropzoneId: number;
  eventType: EventType;
  eventPayload: Record<string, any>;
  channels: NotificationChannel[];
  read: boolean;
  createdAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: "pending" | "sent" | "failed" | "bounced";
  sentAt?: Date;
  failureReason?: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface Webhook {
  id: string;
  dropzoneId: number;
  url: string;
  secret: string;
  eventTypes: EventType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
}

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  private eventBus: EventBus;
  private fastify: FastifyInstance;
  private notificationsSent24h: Map<number, number> = new Map();
  private readonly FATIGUE_BUDGET = 10;
  private readonly EMERGENCY_EVENTS = new Set([
    EVENTS.EMERGENCY_ACTIVATED,
    EVENTS.INCIDENT_REPORTED,
    EVENTS.GEAR_CHECK_FAILED,
    EVENTS.RIG_GROUNDED,
    EVENTS.RIG_OVERDUE,
    EVENTS.WEATHER_ALERT,
    EVENTS.WIND_LIMIT_EXCEEDED,
  ]);

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.eventBus = new EventBus();
    this.setupChannelHandlers();
    this.resetFatigueBudget();
  }

  // ========== MAIN API ==========

  async notify(
    userId: number,
    eventType: EventType,
    data: EventPayload,
    options?: {
      overridePriority?: boolean;
      forceChannels?: NotificationChannel[];
    }
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId);

    // Check muted events
    if (prefs.mutedEvents.includes(eventType)) {
      return;
    }

    // Check quiet hours
    if (
      !options?.overridePriority &&
      prefs.quietHoursStart &&
      prefs.quietHoursEnd &&
      this.isQuietHours(userId, prefs.timezone)
    ) {
      return;
    }

    // Check fatigue budget (skip for emergency events)
    if (!this.EMERGENCY_EVENTS.has(eventType as any)) {
      const sent = this.notificationsSent24h.get(userId) || 0;
      if (sent >= this.FATIGUE_BUDGET) {
        return;
      }
      this.notificationsSent24h.set(userId, sent + 1);
    }

    // Determine channels
    const channels = this.determineChannels(
      eventType,
      prefs,
      options?.forceChannels
    );

    if (channels.length === 0) {
      return;
    }

    // Create notification record
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId,
      dropzoneId: data.dropzoneId,
      eventType,
      eventPayload: data,
      channels,
      read: false,
      createdAt: new Date(),
    };

    // Store in DB
    try {
      await (this.fastify.prisma as any).notification.create({
        data: {
          id: notification.id,
          userId,
          dropzoneId: data.dropzoneId,
          eventType,
          eventPayload: data,
          channels: channels.join(","),
          read: false,
        },
      });
    } catch (err) {
      this.fastify.log.error({ err }, "Failed to create notification record");
    }

    // Create delivery records
    for (const channel of channels) {
      try {
        await (this.fastify.prisma as any).notificationDelivery.create({
          data: {
            id: crypto.randomUUID(),
            notificationId: notification.id,
            channel,
            status: "pending",
          },
        });
      } catch (err) {
        this.fastify.log.error({ err }, `Failed to create delivery record for channel ${channel}`);
      }
    }

    // Dispatch to channel handlers
    for (const channel of channels) {
      this.dispatchToChannel(notification, channel).catch((err) => {
        this.fastify.log.error({ err }, `Failed to dispatch notification to ${channel}`);
      });
    }

    // Publish to event bus
    await this.eventBus.publish(eventType, data);

    // Trigger webhooks
    await this.triggerWebhooks(
      data.dropzoneId,
      eventType,
      data
    ).catch((err) => {
      this.fastify.log.error({ err }, "Failed to trigger webhooks");
    });

    // Start escalation chain for emergency events
    // EscalationManager handles SMS (30s) and WhatsApp (2min) fallback
    if (this.EMERGENCY_EVENTS.has(eventType as any) && (this.fastify as any).escalationManager) {
      const template = await this.resolveTemplate(eventType, "sms", "en", data);
      const title = template?.subject || eventType;
      const body = template?.body || `Emergency: ${eventType}`;
      (this.fastify as any).escalationManager.startEscalation(
        userId,
        notification.id,
        eventType,
        title,
        body
      ).catch((err: any) => {
        this.fastify.log.error({ err }, "Failed to start escalation chain");
      });
    }
  }

  // ========== CHANNEL HANDLERS ==========

  private setupChannelHandlers(): void {
    this.eventBus.subscribe(
      EVENTS.BOOKING_CONFIRMED,
      async (payload: EventPayload) => {
        if ("bookingId" in payload) {
          const user = await (this.fastify.prisma as any).user.findUnique({
            where: { id: payload.userId },
          });
          if (user && user.email) {
            await this.sendEmail({
              userId: payload.userId,
              dropzoneId: payload.dropzoneId,
              channel: "email",
              eventType: EVENTS.BOOKING_CONFIRMED,
              variables: {
                firstName: user.firstName || "Jumper",
                dzName: (payload as any).dzName,
                jumpDate: (payload as any).jumpDate,
                confirmationNumber: (payload as any).confirmationNumber,
              },
            } as any);
          }
        }
      }
    );
  }

  async sendPush(notification: Notification): Promise<void> {
    const pushService = (this.fastify as any).pushService;
    if (!pushService) {
      this.fastify.log.warn("PushService not available — push notification skipped");
      return;
    }

    const template = await this.resolveTemplate(
      notification.eventType,
      "push",
      "en",
      notification.eventPayload
    );

    const title = template?.subject || notification.eventType;
    let body = template?.body || "New notification";

    // Replace template variables
    for (const [key, value] of Object.entries(notification.eventPayload)) {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, "g"), String(value));
    }

    try {
      const result = await pushService.sendPush(
        notification.userId,
        title,
        body,
        {
          notificationId: notification.id,
          eventType: notification.eventType,
          dropzoneId: notification.dropzoneId,
        },
        notification.eventType
      );

      const totalSent = result.mobile.sent + result.web.sent;
      if (totalSent > 0) {
        // Update delivery status
        await (this.fastify.prisma as any).notificationDelivery.updateMany({
          where: {
            notificationId: notification.id,
            channel: "PUSH",
          },
          data: {
            status: "SENT",
            lastAttemptAt: new Date(),
          },
        });
      }
    } catch (err) {
      this.fastify.log.error({ err }, "Push notification send failed");
    }
  }

  async sendInApp(notification: Notification): Promise<void> {
    const user = await (this.fastify.prisma as any).user.findUnique({
      where: { id: notification.userId },
    });

    if (!user) return;

    // Emit WebSocket event if socket adapter available
    if ((this.fastify as any).broadcastToDropzone) {
      (this.fastify as any).broadcastToDropzone(
        notification.dropzoneId,
        "notification:new",
        {
          id: notification.id,
          eventType: notification.eventType,
          createdAt: notification.createdAt,
        }
      );
    }
  }

  async sendEmail(
    notificationData: any
  ): Promise<void> {
    const template = await this.resolveTemplate(
      notificationData.eventType,
      "email",
      "en",
      notificationData.variables
    );

    if (!template) {
      this.fastify.log.warn(
        `No email template for event: ${notificationData.eventType}`
      );
      return;
    }

    const user = await (this.fastify.prisma as any).user.findUnique({
      where: { id: notificationData.userId },
    });

    if (!user || !user.email) {
      return;
    }

    // Compose email
    let body = template.body;
    let subject = template.subject || "Notification";

    for (const [key, value] of Object.entries(notificationData.variables)) {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, "g"), String(value));
      subject = subject.replace(new RegExp(placeholder, "g"), String(value));
    }

    const htmlBody = this.composeEmailBody(subject, body);

    // Dev mode: log email
    if (process.env.NODE_ENV !== "production" && !process.env.SENDGRID_API_KEY) {
      this.fastify.log.info({ to: user.email, subject, preview: body.substring(0, 100) }, "DEV MODE EMAIL");
      return;
    }

    // Send via emailService using the resolved template (not hardcoded welcome email)
    try {
      const { sendEmailViaProvider } = require("./emailService");
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || `noreply@${process.env.APP_DOMAIN || "skylara.app"}`;

      // Send the actual notification email with the composed template
      const providerMessageId = await sendEmailViaProvider(user.email, subject, htmlBody, fromEmail);

      this.fastify.log.info(
        { to: user.email, subject, eventType: notificationData.eventType, providerMessageId },
        "Notification email sent"
      );

      // Update delivery status
      await (this.fastify.prisma as any).notificationDelivery.updateMany({
        where: {
          notificationId: notificationData.id || undefined,
          channel: "EMAIL",
        },
        data: {
          status: "SENT",
          providerMessageId: providerMessageId || undefined,
          lastAttemptAt: new Date(),
        },
      }).catch(() => {});
    } catch (err) {
      this.fastify.log.error({ err }, "Email send failed");
    }
  }

  async sendWhatsApp(
    notificationData: any
  ): Promise<void> {
    const template = await this.resolveTemplate(
      notificationData.eventType,
      "whatsapp",
      "en",
      notificationData.variables
    );

    if (!template) {
      this.fastify.log.warn(
        `No WhatsApp template for event: ${notificationData.eventType}`
      );
      return;
    }

    const user = await (this.fastify.prisma as any).user.findUnique({
      where: { id: notificationData.userId },
    });

    if (!user || !user.phoneNumber) {
      return;
    }

    let message = template.body;
    for (const [key, value] of Object.entries(notificationData.variables)) {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, "g"), String(value));
    }

    // Use TwilioService (handles dev mode fallback internally)
    const twilioService = (this.fastify as any).twilioService;
    if (!twilioService) {
      this.fastify.log.info({ to: user.phoneNumber, message }, "DEV MODE WHATSAPP (TwilioService not available)");
      return;
    }

    try {
      const result = await twilioService.sendWhatsApp(user.phoneNumber, message);

      // Update delivery status
      await (this.fastify.prisma as any).notificationDelivery.updateMany({
        where: {
          notificationId: notificationData.id || undefined,
          channel: "SMS", // WhatsApp shares SMS channel in schema
        },
        data: {
          status: "SENT",
          providerMessageId: result.sid,
          lastAttemptAt: new Date(),
        },
      }).catch(() => {});
    } catch (err) {
      this.fastify.log.error({ err }, "WhatsApp send failed via Twilio");
    }
  }

  async sendSMS(
    notificationData: any
  ): Promise<void> {
    const template = await this.resolveTemplate(
      notificationData.eventType,
      "sms",
      "en",
      notificationData.variables
    );

    if (!template) {
      this.fastify.log.warn(
        `No SMS template for event: ${notificationData.eventType}`
      );
      return;
    }

    const user = await (this.fastify.prisma as any).user.findUnique({
      where: { id: notificationData.userId },
    });

    if (!user || !user.phoneNumber) {
      return;
    }

    let message = template.body;
    for (const [key, value] of Object.entries(notificationData.variables)) {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, "g"), String(value));
    }

    // Use TwilioService (handles dev mode fallback internally)
    const twilioService = (this.fastify as any).twilioService;
    if (!twilioService) {
      this.fastify.log.info({ to: user.phoneNumber, message }, "DEV MODE SMS (TwilioService not available)");
      return;
    }

    try {
      const result = await twilioService.sendSMS(user.phoneNumber, message);

      // Update delivery status
      await (this.fastify.prisma as any).notificationDelivery.updateMany({
        where: {
          notificationId: notificationData.id || undefined,
          channel: "SMS",
        },
        data: {
          status: "SENT",
          providerMessageId: result.sid,
          lastAttemptAt: new Date(),
        },
      }).catch(() => {});
    } catch (err) {
      this.fastify.log.error({ err }, "SMS send failed via Twilio");
    }
  }

  // ========== TEMPLATE RESOLUTION ==========

  async resolveTemplate(
    eventType: EventType,
    channel: NotificationChannel,
    locale: string,
    variables: Record<string, any>
  ): Promise<NotificationTemplate | null> {
    // Try to fetch from DB
    try {
      const template = await (this.fastify.prisma as any)
        .notificationTemplate.findFirst({
        where: {
          eventType,
          channel,
          locale,
        },
      });

      if (template) {
        return template;
      }
    } catch (err) {
      this.fastify.log.error({ err }, "Failed to fetch template from DB");
    }

    // Fall back to hardcoded defaults
    return this.getDefaultTemplate(eventType, channel, locale);
  }

  private getDefaultTemplate(
    eventType: EventType,
    channel: NotificationChannel,
    locale: string
  ): NotificationTemplate | null {
    const templates: Record<EventType, Record<NotificationChannel, any>> = {
      [EVENTS.USER_REGISTERED]: {
        email: {
          subject: "Welcome to SkyLara, {{firstName}}!",
          body: "Thanks for signing up. Start your skydiving journey today.",
          variables: ["firstName"],
        },
        in_app: {
          body: "Welcome to SkyLara!",
          variables: [],
        },
        whatsapp: {
          body: "Welcome to SkyLara, {{firstName}}!",
          variables: ["firstName"],
        },
        sms: {
          body: "Welcome to SkyLara! Visit skylara.app to get started.",
          variables: [],
        },
      },
      [EVENTS.BOOKING_CONFIRMED]: {
        email: {
          subject: "Your booking at {{dzName}} is confirmed",
          body: "Jump scheduled for {{jumpDate}}. Confirmation: {{confirmationNumber}}",
          variables: ["dzName", "jumpDate", "confirmationNumber"],
        },
        in_app: {
          body: "Booking confirmed for {{jumpDate}}",
          variables: ["jumpDate"],
        },
        whatsapp: {
          body: "Booked at {{dzName}} for {{jumpDate}}. Ref: {{confirmationNumber}}",
          variables: ["dzName", "jumpDate", "confirmationNumber"],
        },
        sms: {
          body: "Booking confirmed. Jump {{jumpDate}}. Ref: {{confirmationNumber}}",
          variables: ["jumpDate", "confirmationNumber"],
        },
      },
      [EVENTS.PAYMENT_RECEIVED]: {
        email: {
          subject: "Payment received - {{amount}} {{currency}}",
          body: "Thank you for your payment of {{amount}} {{currency}}. Transaction: {{transactionId}}",
          variables: ["amount", "currency", "transactionId"],
        },
        in_app: {
          body: "Payment received: {{amount}} {{currency}}",
          variables: ["amount", "currency"],
        },
        whatsapp: {
          body: "Payment received: {{amount}} {{currency}}",
          variables: ["amount", "currency"],
        },
        sms: {
          body: "Payment {{amount}} {{currency}} received. Ref: {{transactionId}}",
          variables: ["amount", "currency", "transactionId"],
        },
      },
      [EVENTS.EMERGENCY_ACTIVATED]: {
        email: {
          subject: "EMERGENCY ALERT",
          body: "Emergency activated at {{location}}. Emergency services notified.",
          variables: ["location"],
        },
        in_app: {
          body: "EMERGENCY ACTIVATED",
          variables: [],
        },
        whatsapp: {
          body: "EMERGENCY at {{location}}",
          variables: ["location"],
        },
        sms: {
          body: "EMERGENCY {{location}}",
          variables: ["location"],
        },
      },
      [EVENTS.WEATHER_ALERT]: {
        email: {
          subject: "Weather alert: {{condition}}",
          body: "{{severity}} weather alert: {{condition}} in {{affectedArea}}. {{recommendations}}",
          variables: [
            "severity",
            "condition",
            "affectedArea",
            "recommendations",
          ],
        },
        in_app: {
          body: "{{severity}} weather: {{condition}}",
          variables: ["severity", "condition"],
        },
        whatsapp: {
          body: "Weather alert: {{condition}} in {{affectedArea}}",
          variables: ["condition", "affectedArea"],
        },
        sms: {
          body: "Weather: {{condition}} in {{affectedArea}}",
          variables: ["condition", "affectedArea"],
        },
      },
    } as any;

    const eventTemplates = templates[eventType];
    if (!eventTemplates) {
      return null;
    }

    const channelTemplate = eventTemplates[channel];
    if (!channelTemplate) {
      return null;
    }

    return {
      id: `default-${eventType}-${channel}`,
      eventType,
      channel,
      locale,
      subject: channelTemplate.subject,
      body: channelTemplate.body,
      variables: channelTemplate.variables,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ========== PREFERENCES ==========

  async getUserPreferences(userId: number): Promise<NotificationPreferences> {
    try {
      const user = await (this.fastify.prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          notificationPreferences: true,
        },
      });

      if (user?.notificationPreferences) {
        return user.notificationPreferences;
      }
    } catch (err) {
      this.fastify.log.error({ err }, "Failed to fetch user preferences");
    }

    return this.getDefaultPreferences();
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      inApp: true,
      email: true,
      push: true,
      whatsapp: false,
      sms: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      mutedEvents: [],
      timezone: "UTC",
    };
  }

  isQuietHours(userId: number, timezone?: string): boolean {
    const prefs = this.notificationsSent24h.get(userId);
    if (!timezone) {
      return false;
    }

    // Simple time check (extend for real timezone handling)
    const now = new Date();
    const hour = now.getHours();
    return hour >= 22 || hour < 8; // Default: 10pm-8am
  }

  // ========== WEBHOOKS ==========

  async triggerWebhooks(
    dropzoneId: number,
    eventType: EventType,
    payload: EventPayload
  ): Promise<void> {
    try {
      const webhooks = await (this.fastify.prisma as any).webhook.findMany({
        where: {
          dropzoneId,
          isActive: true,
          eventTypes: {
            has: eventType,
          },
        },
      });

      for (const webhook of webhooks) {
        this.fireWebhook(webhook, eventType, payload).catch((err) => {
          this.fastify.log.error(
            `Failed to fire webhook ${webhook.id}`,
            err
          );
        });
      }
    } catch (err) {
      this.fastify.log.error({ err }, "Failed to fetch webhooks");
    }
  }

  private fireWebhook(
    webhook: Webhook,
    eventType: EventType,
    payload: EventPayload
  ): Promise<void> {
    return new Promise((resolve) => {
      const signature = this.signPayload(payload, webhook.secret);
      const body = JSON.stringify(payload);

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-Signature": signature,
          "X-Event-Type": eventType,
          "X-Timestamp": Date.now().toString(),
        },
      };

      const req = https.request(webhook.url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve();
        });
      });

      req.on("error", (err) => {
        this.fastify.log.error({ err }, `Webhook request failed: ${webhook.url}`);
        resolve();
      });

      req.write(body);
      req.end();
    });
  }

  private signPayload(payload: any, secret: string): string {
    const body = JSON.stringify(payload);
    return crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
  }

  // ========== HELPERS ==========

  private determineChannels(
    eventType: EventType,
    prefs: NotificationPreferences,
    forceChannels?: NotificationChannel[]
  ): NotificationChannel[] {
    if (forceChannels) {
      return forceChannels;
    }

    const channels: NotificationChannel[] = [];

    if (prefs.inApp) channels.push("in_app");
    if (prefs.push) channels.push("push");
    if (prefs.email) channels.push("email");
    if (prefs.whatsapp) channels.push("whatsapp");
    if (prefs.sms) channels.push("sms");

    // Emergency events: push + in_app immediately
    // SMS/WhatsApp handled by EscalationManager fallback chain
    if (this.EMERGENCY_EVENTS.has(eventType as any)) {
      return ["in_app", "push", "email"];
    }

    return channels;
  }

  private async dispatchToChannel(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    const notificationData = {
      ...notification,
      variables: notification.eventPayload,
    };

    switch (channel) {
      case "in_app":
        await this.sendInApp(notification);
        break;
      case "push":
        await this.sendPush(notification);
        break;
      case "email":
        await this.sendEmail(notificationData);
        break;
      case "whatsapp":
        await this.sendWhatsApp(notificationData);
        break;
      case "sms":
        await this.sendSMS(notificationData);
        break;
    }
  }

  private composeEmailBody(subject: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${subject}</h1>
          </div>
          <div class="content">
            <p>${message.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="footer">
            <p>SkyLara Global Skydiving Platform</p>
            <p><a href="https://skylara.app">Visit SkyLara</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private resetFatigueBudget(): void {
    setInterval(() => {
      this.notificationsSent24h.clear();
    }, 24 * 60 * 60 * 1000);
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }
}

// Re-exports handled by inline `export` declarations above
