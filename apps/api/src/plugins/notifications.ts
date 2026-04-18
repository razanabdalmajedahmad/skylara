import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { NotificationService } from "../services/notificationService";
import { PushService } from "../services/pushService";
import { TwilioService } from "../services/twilioService";
import { EscalationManager } from "../services/escalationManager";

export default fp(async (fastify: FastifyInstance) => {
  // Initialize provider services
  const pushService = new PushService(fastify);
  const twilioService = new TwilioService(fastify);
  const escalationManager = new EscalationManager(fastify);

  // Decorate fastify so NotificationService and routes can access them
  fastify.decorate("pushService", pushService);
  fastify.decorate("twilioService", twilioService);
  fastify.decorate("escalationManager", escalationManager);

  // Initialize the main notification orchestrator
  const notificationService = new NotificationService(fastify);
  fastify.decorate("notificationService", notificationService);

  fastify.log.info("[Notifications] All notification services initialized (push, sms, whatsapp, email, escalation)");
});

declare module "fastify" {
  interface FastifyInstance {
    notificationService: NotificationService;
    pushService: PushService;
    twilioService: TwilioService;
    escalationManager: EscalationManager;
  }
}
