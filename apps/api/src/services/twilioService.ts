import { FastifyInstance } from "fastify";

/**
 * Twilio Service — SMS and WhatsApp delivery via Twilio API.
 *
 * Dev mode: logs to console when TWILIO_ACCOUNT_SID is not configured.
 * Production: real Twilio API calls wrapped in circuit breaker.
 */

interface TwilioMessageResult {
  sid: string;
  status: string;
}

export class TwilioService {
  private client: any = null;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.initClient();
  }

  private initClient(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      this.fastify.log.info("[TwilioService] No credentials configured — SMS/WhatsApp will log to console");
      return;
    }

    try {
      // Lazy-load Twilio SDK to avoid import errors when not installed in dev
      const twilio = require("twilio");
      this.client = twilio(accountSid, authToken);
      this.fastify.log.info("[TwilioService] Client initialized");
    } catch (err) {
      this.fastify.log.warn("[TwilioService] Could not initialize Twilio client — SDK may not be installed");
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async sendSMS(to: string, body: string): Promise<TwilioMessageResult> {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    // Dev mode fallback
    if (!this.isAvailable()) {
      this.fastify.log.info({ to, body: body.substring(0, 80) }, "DEV MODE SMS (Twilio not configured)");
      return { sid: `dev_sms_${Date.now()}`, status: "dev_logged" };
    }

    if (!fromNumber) {
      this.fastify.log.warn("TWILIO_PHONE_NUMBER not set — cannot send SMS");
      throw new Error("TWILIO_PHONE_NUMBER not configured");
    }

    // Wrap in circuit breaker
    const breaker = this.fastify.circuitBreakers.get("twilio");
    return breaker.exec(async () => {
      const message = await this.client.messages.create({
        from: fromNumber,
        to,
        body,
      });

      this.fastify.log.info({ sid: message.sid, to, status: message.status }, "SMS sent via Twilio");
      return { sid: message.sid, status: message.status };
    });
  }

  async sendWhatsApp(to: string, body: string): Promise<TwilioMessageResult> {
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // Dev mode fallback
    if (!this.isAvailable()) {
      this.fastify.log.info({ to, body: body.substring(0, 80) }, "DEV MODE WHATSAPP (Twilio not configured)");
      return { sid: `dev_wa_${Date.now()}`, status: "dev_logged" };
    }

    if (!fromNumber) {
      this.fastify.log.warn("TWILIO_WHATSAPP_NUMBER not set — cannot send WhatsApp");
      throw new Error("TWILIO_WHATSAPP_NUMBER not configured");
    }

    // Normalize phone number format for WhatsApp
    const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const whatsappFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

    // Wrap in circuit breaker
    const breaker = this.fastify.circuitBreakers.get("twilio");
    return breaker.exec(async () => {
      const message = await this.client.messages.create({
        from: whatsappFrom,
        to: whatsappTo,
        body,
      });

      this.fastify.log.info({ sid: message.sid, to, status: message.status }, "WhatsApp sent via Twilio");
      return { sid: message.sid, status: message.status };
    });
  }
}
