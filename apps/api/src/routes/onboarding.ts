import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OnboardingRole } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';

interface StepConfig {
  step: number;
  name: string;
  label: string;
  fields: string[];
  required: boolean;
}

interface OnboardingFlow {
  totalSteps: number;
  steps: StepConfig[];
}

const ONBOARDING_FLOWS: Record<string, OnboardingFlow> = {
  TANDEM_STUDENT: {
    totalSteps: 7,
    steps: [
      {
        step: 1,
        name: 'basic_info',
        label: 'Basic Information',
        fields: [
          'firstName',
          'lastName',
          'dateOfBirth',
          'weight',
          'height',
          'phone',
        ],
        required: true,
      },
      {
        step: 2,
        name: 'emergency_contact',
        label: 'Emergency Contact',
        fields: ['emergencyName', 'emergencyPhone', 'emergencyRelation'],
        required: true,
      },
      {
        step: 3,
        name: 'medical',
        label: 'Medical Disclosure',
        fields: [
          'conditions',
          'medications',
          'allergies',
          'hasHeartCondition',
          'hasSeizures',
          'isPregnant',
        ],
        required: true,
      },
      {
        step: 4,
        name: 'waiver',
        label: 'Digital Waiver',
        fields: ['waiverAccepted', 'signatureData', 'ipAddress', 'deviceInfo'],
        required: true,
      },
      {
        step: 5,
        name: 'safety_video',
        label: 'Safety Video',
        fields: ['videoWatched', 'watchTimeSeconds', 'quizScore'],
        required: true,
      },
      {
        step: 6,
        name: 'booking',
        label: 'Select Your Jump',
        fields: [
          'dropzoneId',
          'activityType',
          'preferredDate',
          'preferredTime',
        ],
        required: true,
      },
      {
        step: 7,
        name: 'payment',
        label: 'Payment',
        fields: ['paymentMethodId'],
        required: true,
      },
    ],
  },
  FUN_JUMPER: {
    totalSteps: 5,
    steps: [
      {
        step: 1,
        name: 'license',
        label: 'License Verification',
        fields: ['licenseNumber', 'rating', 'issuingAuthority', 'photoUrl'],
        required: true,
      },
      {
        step: 2,
        name: 'jump_history',
        label: 'Jump History',
        fields: [
          'totalJumps',
          'lastJumpDate',
          'disciplines',
          'homeDropzone',
        ],
        required: true,
      },
      {
        step: 3,
        name: 'gear',
        label: 'Gear Declaration',
        fields: [
          'hasOwnGear',
          'mainCanopy',
          'reserveCanopy',
          'aadType',
          'containerType',
          'rentalPreference',
        ],
        required: true,
      },
      {
        step: 4,
        name: 'emergency',
        label: 'Emergency Profile',
        fields: [
          'bloodType',
          'allergies',
          'medications',
          'insuranceProvider',
          'insuranceNumber',
          'primaryContactName',
          'primaryContactPhone',
          'primaryContactRelation',
        ],
        required: true,
      },
      {
        step: 5,
        name: 'preferences',
        label: 'Preferences & Identity',
        fields: ['notificationPrefs', 'preferredLanguage'],
        required: false,
      },
    ],
  },
  COACH: {
    totalSteps: 6,
    steps: [
      {
        step: 1,
        name: 'credentials',
        label: 'Credentials & Ratings',
        fields: [
          'licenseNumber',
          'instructorRating',
          'tandemRated',
          'affRated',
          'cameraRated',
          'issuingAuthority',
        ],
        required: true,
      },
      {
        step: 2,
        name: 'experience',
        label: 'Experience',
        fields: ['yearsTeaching', 'totalJumps', 'specialties', 'bio'],
        required: true,
      },
      {
        step: 3,
        name: 'availability',
        label: 'Weekly Availability',
        fields: ['weeklySchedule'],
        required: true,
      },
      {
        step: 4,
        name: 'pricing',
        label: 'Pricing',
        fields: ['hourlyRate', 'currency', 'packages'],
        required: true,
      },
      {
        step: 5,
        name: 'profile',
        label: 'Profile',
        fields: ['avatar', 'bio', 'tagline'],
        required: false,
      },
      {
        step: 6,
        name: 'payment_setup',
        label: 'Payment Setup',
        fields: ['stripeAccountType'],
        required: true,
      },
    ],
  },
  DZ_MANAGER: {
    totalSteps: 5,
    steps: [
      {
        step: 1,
        name: 'dropzone_info',
        label: 'Dropzone Details',
        fields: [
          'name',
          'icaoCode',
          'latitude',
          'longitude',
          'timezone',
          'currency',
          'address',
          'phone',
          'website',
        ],
        required: true,
      },
      {
        step: 2,
        name: 'aircraft',
        label: 'Aircraft Fleet',
        fields: ['aircraft'],
        required: true,
      },
      {
        step: 3,
        name: 'operations',
        label: 'Operations Settings',
        fields: [
          'windLimitKnots',
          'maxLoadsPerDay',
          'loadInterval',
          'pricingTiers',
          'operatingHours',
        ],
        required: true,
      },
      {
        step: 4,
        name: 'staff',
        label: 'Invite Staff',
        fields: ['staffInvitations'],
        required: false,
      },
      {
        step: 5,
        name: 'payment_platform',
        label: 'Payment Platform',
        fields: ['stripeAccountType'],
        required: true,
      },
    ],
  },
  MANIFEST_STAFF: {
    totalSteps: 4,
    steps: [
      {
        step: 1,
        name: 'basic_info',
        label: 'Personal Information',
        fields: ['firstName', 'lastName', 'email', 'phone'],
        required: true,
      },
      {
        step: 2,
        name: 'experience',
        label: 'Manifest Experience',
        fields: ['yearsExperience', 'softwareUsed', 'certifications'],
        required: true,
      },
      {
        step: 3,
        name: 'availability',
        label: 'Schedule & Availability',
        fields: ['weeklySchedule', 'startDate', 'employmentType'],
        required: true,
      },
      {
        step: 4,
        name: 'emergency',
        label: 'Emergency Contact',
        fields: ['emergencyName', 'emergencyPhone', 'emergencyRelation'],
        required: true,
      },
    ],
  },
  PLATFORM_ADMIN: {
    totalSteps: 3,
    steps: [
      {
        step: 1,
        name: 'credentials',
        label: 'Admin Credentials',
        fields: ['firstName', 'lastName', 'email', 'phone', 'adminCode'],
        required: true,
      },
      {
        step: 2,
        name: 'organization',
        label: 'Organization Details',
        fields: ['organizationName', 'role', 'department'],
        required: true,
      },
      {
        step: 3,
        name: 'security',
        label: 'Security Setup',
        fields: ['mfaEnabled', 'securityQuestion', 'securityAnswer'],
        required: true,
      },
    ],
  },
};

/**
 * Validates step data according to step requirements
 */
function validateStepData(
  role: string,
  step: number,
  data: Record<string, any>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const flow = ONBOARDING_FLOWS[role];

  if (!flow) {
    return { valid: false, errors: [`Unknown role: ${role}`] };
  }

  const stepConfig = flow.steps.find((s) => s.step === step);
  if (!stepConfig) {
    return { valid: false, errors: [`Invalid step: ${step}`] };
  }

  // Check required fields
  if (stepConfig.required) {
    for (const field of stepConfig.fields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Required field missing: ${field}`);
      }
    }
  }

  // Role-specific validations
  if (stepConfig.name === 'medical') {
    const conditions = ['hasHeartCondition', 'hasSeizures', 'isPregnant'];
    for (const condition of conditions) {
      if (typeof data[condition] !== 'boolean') {
        errors.push(`${condition} must be a boolean value`);
      }
    }
  }

  if (stepConfig.name === 'safety_video') {
    const watchTime = parseInt(data.watchTimeSeconds, 10);
    if (isNaN(watchTime) || watchTime < 180) {
      errors.push('Safety video must be watched for at least 3 minutes');
    }
    const quizScore = parseInt(data.quizScore, 10);
    if (isNaN(quizScore) || quizScore < 70) {
      errors.push('Quiz score must be at least 70%');
    }
  }

  if (stepConfig.name === 'waiver') {
    if (
      typeof data.signatureData !== 'string' ||
      data.signatureData.trim().length === 0
    ) {
      errors.push('Signature data is required');
    }
    if (data.waiverAccepted !== true) {
      errors.push('Waiver must be accepted');
    }
  }

  if (stepConfig.name === 'basic_info' || stepConfig.name === 'license') {
    const weight = parseFloat(data.weight);
    if (!isNaN(weight) && (weight < 40 || weight > 180)) {
      errors.push('Weight must be between 40 and 180 kg');
    }
    if (data.licenseNumber) {
      if (!/^[A-Z0-9]{5,12}$/.test(data.licenseNumber)) {
        errors.push('Invalid license number format');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deep merge function to merge step data without overwriting previous steps
 */
function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Trigger side effects for specific steps
 */
async function triggerStepSideEffects(
  prisma: any,
  userId: string,
  role: string,
  step: number,
  data: Record<string, any>,
): Promise<void> {
  const flow = ONBOARDING_FLOWS[role];
  const stepConfig = flow.steps.find((s) => s.step === step);

  if (!stepConfig) return;

  switch (stepConfig.name) {
    case 'emergency_contact':
      if (role === 'TANDEM_STUDENT') {
        const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        await prisma.emergencyProfile.upsert({
          where: { userId: numericUserId },
          create: {
            userId: numericUserId,
            primaryContactName: data.emergencyName,
            primaryContactPhone: data.emergencyPhone,
            primaryContactRelation: data.emergencyRelation,
          },
          update: {
            primaryContactName: data.emergencyName,
            primaryContactPhone: data.emergencyPhone,
            primaryContactRelation: data.emergencyRelation,
          },
        });
      }
      break;

    case 'waiver':
      // Find the active waiver for this dropzone, or skip if none exists
      const activeWaiver = await prisma.waiver.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (activeWaiver) {
        await prisma.waiverSignature.create({
          data: {
            waiverId: activeWaiver.id,
            userId: typeof userId === 'string' ? parseInt(userId, 10) : userId,
            signatureData: data.signatureData,
            ipAddress: data.ipAddress,
            deviceInfo: data.deviceInfo,
          },
        });
      }
      break;

    case 'license':
      if (role === 'FUN_JUMPER' || role === 'COACH') {
        const profileUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        await prisma.userProfile.upsert({
          where: { userId: profileUserId },
          create: {
            userId: profileUserId,
            avatar: data.photoUrl,
            bio: data.rating ? `License: ${data.licenseNumber} | Rating: ${data.rating} | Authority: ${data.issuingAuthority}` : undefined,
          },
          update: {
            avatar: data.photoUrl,
            bio: data.rating ? `License: ${data.licenseNumber} | Rating: ${data.rating} | Authority: ${data.issuingAuthority}` : undefined,
          },
        });
      }
      break;

    case 'dropzone_info':
      if (role === 'DZ_MANAGER') {
        const numericMgrId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        // Find or create organization, then create dropzone
        let orgId = data.organizationId;
        if (!orgId && data.organizationName) {
          const org = await prisma.organization.create({
            data: {
              uuid: require('crypto').randomUUID(),
              name: data.organizationName,
              slug: data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              ownerId: numericMgrId,
            },
          });
          orgId = org.id;
        }
        if (orgId && data.dropzoneName) {
          await prisma.dropzone.create({
            data: {
              uuid: require('crypto').randomUUID(),
              organizationId: orgId,
              name: data.dropzoneName,
              slug: data.dropzoneName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              icaoCode: data.icaoCode || null,
              latitude: data.latitude || 0,
              longitude: data.longitude || 0,
              timezone: data.timezone || 'UTC',
              windLimitKnots: data.windLimitKnots || 15,
              currency: data.currency || 'USD',
            },
          });
        }
      }
      break;

    case 'aircraft':
      if (role === 'DZ_MANAGER' && Array.isArray(data.aircraft)) {
        // Create aircraft records from the onboarding wizard aircraft list
        for (const ac of data.aircraft) {
          if (!ac.registration || !ac.type) continue;
          // Find the DZ manager's dropzone
          const dzRole = await prisma.userRole.findFirst({
            where: {
              userId: typeof userId === 'string' ? parseInt(userId, 10) : userId,
              role: { name: 'DZ_MANAGER' },
            },
            include: { role: true },
          });
          const dropzoneId = dzRole?.dropzoneId || data.dropzoneId;
          if (!dropzoneId) break;
          await prisma.aircraft.upsert({
            where: {
              dropzoneId_registration: {
                dropzoneId,
                registration: ac.registration,
              },
            },
            create: {
              uuid: require('crypto').randomUUID(),
              dropzoneId,
              registration: ac.registration,
              type: ac.type,
              maxCapacity: ac.maxCapacity || 23,
              maxWeight: ac.maxWeight || 5000,
              emptyWeight: ac.emptyWeight || 3000,
              fuelBurnRate: ac.fuelBurnRate || 60,
              status: 'ACTIVE',
            },
            update: {
              type: ac.type,
              maxCapacity: ac.maxCapacity,
              maxWeight: ac.maxWeight,
            },
          });
        }
      }
      break;

    case 'staff':
      if (role === 'DZ_MANAGER' && Array.isArray(data.staffInvitations)) {
        // Send invitation emails to staff members
        for (const invite of data.staffInvitations) {
          if (!invite.email) continue;
          try {
            const { sendEmailViaProvider } = require('../services/emailService');
            const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@skylara.app';
            const subject = `You've been invited to join ${data.dropzoneName || 'a dropzone'} on SkyLara`;
            const html = `
              <h2>You're Invited!</h2>
              <p>Hi${invite.name ? ` ${invite.name}` : ''},</p>
              <p>You've been invited to join as <strong>${invite.role || 'Staff'}</strong> on SkyLara.</p>
              <p>Click the link below to create your account and get started:</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?invite=true&email=${encodeURIComponent(invite.email)}"
                 style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
                Accept Invitation
              </a>
            `;
            await sendEmailViaProvider(invite.email, subject, html, fromEmail);
          } catch {
            // Email send failure should not block onboarding
          }
        }
      }
      break;

    default:
      // No side effects for this step
      break;
  }
}

/**
 * Execute post-completion actions
 */
async function triggerCompletionActions(
  prisma: any,
  userId: string,
  role: string,
  data: Record<string, any>,
): Promise<Record<string, any>> {
  const summary: Record<string, any> = { role, completedAt: new Date() };

  switch (role) {
    case 'TANDEM_STUDENT':
      // Create booking if applicable
      if (data.dropzoneId && data.preferredDate) {
        summary.bookingCreated = true;
        summary.bookingDetails = {
          dropzoneId: data.dropzoneId,
          activityType: data.activityType,
          preferredDate: data.preferredDate,
          preferredTime: data.preferredTime,
        };
      }
      break;

    case 'FUN_JUMPER':
      // Generate QR token
      summary.qrTokenGenerated = true;
      summary.qrToken = `FJ-${userId}-${Date.now()}`;
      break;

    case 'COACH':
      // Notify DZ about new coach
      summary.dzNotificationSent = true;
      summary.coachProfile = {
        licenseNumber: data.licenseNumber,
        rating: data.rating,
        yearsTeaching: data.yearsTeaching,
      };
      break;

    case 'DZ_MANAGER':
      // Mark organization as active
      summary.organizationActivated = true;
      summary.dzName = data.name;
      summary.icaoCode = data.icaoCode;
      break;

    default:
      break;
  }

  return summary;
}

export async function onboardingRoutes(fastify: FastifyInstance) {
  // POST /onboarding/start - Begin or resume onboarding
  fastify.post<{ Body: { role: string } }>(
    '/start',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: {
              type: 'string',
              enum: ['TANDEM_STUDENT', 'FUN_JUMPER', 'COACH', 'DZ_MANAGER', 'MANIFEST_STAFF', 'PLATFORM_ADMIN'],
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { role } = request.body as { role: OnboardingRole };

      if (!ONBOARDING_FLOWS[role]) {
        return reply.code(400).send({ error: 'Invalid role' });
      }

      try {
        // Check for existing active session
        const existingSession = await fastify.prisma.onboardingSession.findFirst({
          where: {
            userId: parseInt(request.user.sub, 10),
            role,
            completedAt: null,
            abandonedAt: null,
          },
        });

        if (existingSession) {
          return reply.send({
            session: existingSession,
            flow: ONBOARDING_FLOWS[role],
            progress: {
              current: existingSession.currentStep,
              total: existingSession.totalSteps,
              percentage: Math.round(
                (existingSession.currentStep / existingSession.totalSteps) * 100,
              ),
            },
          });
        }

        // Create new session
        const flow = ONBOARDING_FLOWS[role];
        const newSession = await fastify.prisma.onboardingSession.create({
          data: {
            userId: parseInt(request.user.sub, 10),
            role,
            currentStep: 1,
            totalSteps: flow.totalSteps,
            data: {},
          },
        });

        return reply.code(201).send({
          session: newSession,
          flow,
          progress: {
            current: 1,
            total: flow.totalSteps,
            percentage: Math.round((1 / flow.totalSteps) * 100),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to start onboarding' });
      }
    },
  );

  // GET /onboarding/status - Get current session status
  fastify.get(
    '/status',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const session = await fastify.prisma.onboardingSession.findFirst({
          where: {
            userId: parseInt(request.user.sub, 10),
            completedAt: null,
            abandonedAt: null,
          },
        });

        if (!session) {
          return reply.code(404).send({ error: 'No active onboarding session' });
        }

        const flow = ONBOARDING_FLOWS[session.role];
        const currentStepConfig = flow.steps.find(
          (s) => s.step === session.currentStep,
        );

        return reply.send({
          session,
          currentStep: currentStepConfig,
          flow,
          progress: {
            current: session.currentStep,
            total: session.totalSteps,
            percentage: Math.round(
              (session.currentStep / session.totalSteps) * 100,
            ),
          },
          accumulatedData: session.data,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch status' });
      }
    },
  );

  // PATCH /onboarding/step - Save step data and advance
  fastify.patch<{ Body: { step: number; data: Record<string, any> } }>(
    '/step',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['step', 'data'],
          properties: {
            step: { type: 'number' },
            data: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { step, data } = request.body as {
        step: number;
        data: Record<string, any>;
      };

      try {
        const session = await fastify.prisma.onboardingSession.findFirst({
          where: {
            userId: parseInt(request.user.sub, 10),
            completedAt: null,
            abandonedAt: null,
          },
        });

        if (!session) {
          return reply.code(404).send({ error: 'No active onboarding session' });
        }

        // Validate step is current or next
        if (step !== session.currentStep && step !== session.currentStep + 1) {
          return reply.code(400).send({
            error: `Invalid step. Current step is ${session.currentStep}`,
          });
        }

        // Validate data
        const validation = validateStepData(session.role, step, data);
        if (!validation.valid) {
          return reply.code(400).send({
            error: 'Validation failed',
            errors: validation.errors,
          });
        }

        // Merge data with accumulated data
        const mergedData = deepMerge(
          session.data as Record<string, any>,
          { [`step_${step}`]: data },
        );

        // Trigger side effects
        await triggerStepSideEffects(fastify.prisma, request.user.sub, session.role, step, data);

        // Determine if we should advance
        const flow = ONBOARDING_FLOWS[session.role];
        const stepConfig = flow.steps.find((s) => s.step === step);
        let nextStep = session.currentStep;

        if (stepConfig?.required && validation.valid) {
          nextStep = Math.min(step + 1, flow.totalSteps);
        }

        // Update session
        const updatedSession = await fastify.prisma.onboardingSession.update({
          where: { id: session.id },
          data: {
            data: mergedData,
            currentStep: nextStep,
          },
        });

        const currentStepConfig = flow.steps.find(
          (s) => s.step === updatedSession.currentStep,
        );

        return reply.send({
          session: updatedSession,
          currentStep: currentStepConfig,
          progress: {
            current: updatedSession.currentStep,
            total: updatedSession.totalSteps,
            percentage: Math.round(
              (updatedSession.currentStep / updatedSession.totalSteps) * 100,
            ),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to save step' });
      }
    },
  );

  // POST /onboarding/complete - Complete onboarding
  fastify.post(
    '/complete',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const session = await fastify.prisma.onboardingSession.findFirst({
          where: {
            userId: parseInt(request.user.sub, 10),
            completedAt: null,
            abandonedAt: null,
          },
        });

        if (!session) {
          return reply.code(404).send({ error: 'No active onboarding session' });
        }

        const flow = ONBOARDING_FLOWS[session.role];

        // Validate all required steps are complete
        const allRequiredStepsComplete = flow.steps
          .filter((s) => s.required)
          .every((s) => session.currentStep >= s.step);

        if (!allRequiredStepsComplete) {
          return reply.code(400).send({
            error: 'Not all required steps are complete',
            currentStep: session.currentStep,
            totalSteps: flow.totalSteps,
          });
        }

        // Mark as completed
        const completedSession = await fastify.prisma.onboardingSession.update({
          where: { id: session.id },
          data: { completedAt: new Date() },
        });

        // Trigger completion actions
        const summary = await triggerCompletionActions(
          fastify.prisma,
          request.user.sub,
          session.role,
          session.data as Record<string, any>,
        );

        return reply.send({
          session: completedSession,
          summary,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to complete onboarding' });
      }
    },
  );

  // POST /onboarding/abandon - Abandon onboarding
  fastify.post(
    '/abandon',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const session = await fastify.prisma.onboardingSession.findFirst({
          where: {
            userId: parseInt(request.user.sub, 10),
            completedAt: null,
            abandonedAt: null,
          },
        });

        if (!session) {
          return reply.code(404).send({ error: 'No active onboarding session' });
        }

        const abandonedSession = await fastify.prisma.onboardingSession.update({
          where: { id: session.id },
          data: { abandonedAt: new Date() },
        });

        return reply.send({
          message: 'Onboarding abandoned',
          session: abandonedSession,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to abandon onboarding' });
      }
    },
  );

  // POST /onboarding/resume - Resume most recent session
  fastify.post(
    '/resume',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const session = await fastify.prisma.onboardingSession.findFirst({
          where: {
            userId: parseInt(request.user.sub, 10),
            completedAt: null,
            abandonedAt: null,
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (!session) {
          return reply.code(404).send({
            error: 'No sessions to resume',
          });
        }

        const flow = ONBOARDING_FLOWS[session.role];
        const currentStepConfig = flow.steps.find(
          (s) => s.step === session.currentStep,
        );

        return reply.send({
          session,
          currentStep: currentStepConfig,
          flow,
          progress: {
            current: session.currentStep,
            total: session.totalSteps,
            percentage: Math.round(
              (session.currentStep / session.totalSteps) * 100,
            ),
          },
          accumulatedData: session.data,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to resume onboarding' });
      }
    },
  );
}
