import type { SlotType } from '@repo/types';

// ============================================================================
// SAFETY & OPERATIONAL CONSTANTS
// ============================================================================

export const WIND_LIMITS = {
  TANDEM: 15, // knots
  AFF: 12, // knots
  RW: 14, // knots
  FREEFLY: 16, // knots
  WINGSUIT: 10, // knots
  EXPERIENCED: 18 // knots
} as const;

export const WEIGHT_LIMITS = {
  TANDEM_PASSENGER_MIN: 100, // lbs
  TANDEM_PASSENGER_MAX: 250, // lbs
  CONTAINER_CAPACITY: 350, // lbs (empty + rig + person)
  AIRCRAFT_RESERVE: 1000 // lbs for fuel, pilot, safety equipment
} as const;

export const CG_LIMITS = {
  FORWARD_MIN: 0.235, // % MAC (mean aerodynamic chord)
  FORWARD_MAX: 0.25,
  AFT_MIN: 0.25,
  AFT_MAX: 0.32,
  MARGIN: 0.01 // safety margin %
} as const;

// ============================================================================
// LOAD FSM (FINITE STATE MACHINE) TRANSITIONS
// ============================================================================

/**
 * Load FSM — 11 canonical states.
 * Timer cascade: LOCKED → THIRTY_MIN → TWENTY_MIN → TEN_MIN → BOARDING
 *   (30→20: 10 min, 20→10: 10 min, 10→BOARDING: 5 min)
 * CG BLOCKING GATE: transition from LOCKED → THIRTY_MIN requires CG PASS.
 *   Without a passing CgCheck, the load CANNOT advance past LOCKED.
 */
export const LOAD_FSM_TRANSITIONS = {
  OPEN: ['FILLING', 'CANCELLED'],
  FILLING: ['OPEN', 'LOCKED', 'CANCELLED'],
  LOCKED: ['THIRTY_MIN', 'CANCELLED'],        // CG gate blocks this transition
  THIRTY_MIN: ['TWENTY_MIN', 'CANCELLED'],     // auto after 10 min
  TWENTY_MIN: ['TEN_MIN', 'CANCELLED'],        // auto after 10 min
  TEN_MIN: ['BOARDING', 'CANCELLED'],           // auto after 5 min
  BOARDING: ['AIRBORNE', 'CANCELLED'],
  AIRBORNE: ['LANDED'],
  LANDED: ['COMPLETE', 'CANCELLED'],
  COMPLETE: [],
  CANCELLED: []
} as const;

/** Transitions that require a safety gate to pass before they execute. */
export const LOAD_FSM_GATES: Record<string, { from: string; to: string; gate: string }[]> = {
  CG_PASS: [{ from: 'LOCKED', to: 'THIRTY_MIN', gate: 'CG_PASS' }]
};

/** Timer durations for auto-advancing countdown states (milliseconds). */
export const LOAD_TIMER_DURATIONS = {
  THIRTY_MIN_TO_TWENTY_MIN: 10 * 60 * 1000,  // 10 minutes
  TWENTY_MIN_TO_TEN_MIN: 10 * 60 * 1000,     // 10 minutes
  TEN_MIN_TO_BOARDING: 5 * 60 * 1000          // 5 minutes
} as const;

// ============================================================================
// SLOT & MANIFEST RULES
// ============================================================================

export const SLOT_RULES = {
  EXIT_ALTITUDE_FUN: 10000, // feet
  EXIT_ALTITUDE_AFF: 10500, // feet
  EXIT_ALTITUDE_TANDEM: 10000, // feet
  EXIT_ALTITUDE_WINGSUIT: 12000, // feet
  MIN_STUDENTS_PER_INSTRUCTOR: 1,
  MAX_STUDENTS_PER_INSTRUCTOR: 2,
  MAX_SLOTS_PER_AIRCRAFT_LOAD: 20,
  RESERVE_PARACHUTE_REPACK_DAYS: 180,
  AAD_ANNUAL_SERVICE_DAYS: 365
} as const;

// ============================================================================
// WAIVER & COMPLIANCE
// ============================================================================

export const WAIVER_CONFIG = {
  MIN_AGE_TANDEM: 18,
  MIN_AGE_AFF: 18,
  MIN_AGE_EXPERIENCED: 18,
  MIN_AGE_SPECTATOR: 0,
  EXPIRY_DAYS_TANDEM: 365,
  EXPIRY_DAYS_AFF: 365,
  EXPIRY_DAYS_EXPERIENCED: 365,
  EXPIRY_DAYS_MEDIA: 30
} as const;

// ============================================================================
// PAYMENT & PRICING
// ============================================================================

export const PRICING = {
  SLOT_FUN: 17500, // cents ($175.00)
  SLOT_AFF_STUDENT: 15000, // cents ($150.00)
  SLOT_TANDEM: 29900, // cents ($299.00)
  TANDEM_EQUIPMENT_SURCHARGE: 2500, // cents ($25.00)
  CAMERA_SLOT: 5000, // cents ($50.00)
  INSTRUCTOR_BONUS_MULTIPLIER: 1.5
} as const;

export const COMMISSION_TIERS = {
  STARTER: {
    percentages: 0.15, // 15%
    minMonthlyVolume: 0
  },
  PRO: {
    percentages: 0.12, // 12%
    minMonthlyVolume: 50000 // cents
  },
  ENTERPRISE: {
    percentages: 0.1, // 10%
    minMonthlyVolume: 200000 // cents
  }
} as const;

// ============================================================================
// NOTIFICATION & COMMUNICATION
// ============================================================================

export const NOTIFICATION_TIMEOUTS = {
  LOAD_READY_MINUTES_BEFORE: 30,
  SLOT_CONFIRMATION_DEADLINE_HOURS: 24,
  PAYMENT_DUE_HOURS: 48,
  INSTRUCTOR_ASSIGNMENT_HOURS: 4
} as const;

export const MAX_NOTIFICATIONS_PER_HOUR = 10; // fatigue budget

// ============================================================================
// OFFLINE & SYNC
// ============================================================================

export const OFFLINE_CACHE_CONFIG = {
  MAX_OUTBOX_SIZE: 1000,
  CONFLICT_RESOLUTION_STRATEGY: 'SERVER_AUTHORITY' as const, // SERVER_AUTHORITY | LAST_WRITE_WINS | FIELD_MERGE
  SYNC_RETRY_MAX_ATTEMPTS: 5,
  SYNC_RETRY_DELAY_MS: 5000,
  SYNC_BATCH_SIZE: 100
} as const;

// ============================================================================
// PERFORMANCE & RATE LIMITING
// ============================================================================

export const RATE_LIMITS = {
  API_CALLS_PER_MINUTE: 120,
  LOGIN_ATTEMPTS_PER_HOUR: 10,
  PASSWORD_RESET_PER_HOUR: 5,
  SIGNUP_PER_IP_PER_HOUR: 10
} as const;

export const CACHE_TTL = {
  USER_PROFILE_SECONDS: 300, // 5 minutes
  LOAD_LIST_SECONDS: 30, // 30 seconds
  WEATHER_DATA_SECONDS: 600, // 10 minutes
  INSTRUCTOR_AVAILABILITY_SECONDS: 60, // 1 minute
  DROPZONE_CONFIG_SECONDS: 3600 // 1 hour
} as const;

// ============================================================================
// AUDIT & LOGGING
// ============================================================================

export const AUDIT_CONFIG = {
  LOG_RETENTION_DAYS: 365,
  SENSITIVE_FIELDS: [
    'passwordHash',
    'jwt_secret',
    'stripe_key',
    'ssn',
    'bankAccount',
    'creditCard'
  ] as const,
  HASH_ALGORITHM: 'SHA-256' as const
} as const;

// ============================================================================
// SAFETY RULES ENGINE
// ============================================================================

export const SAFETY_RULES = {
  TANDEM: {
    allowedSlotTypes: ['TANDEM_PASSENGER', 'TANDEM_INSTRUCTOR'] as const,
    minExitAltitude: SLOT_RULES.EXIT_ALTITUDE_TANDEM,
    maxOpeningDelay: 120, // seconds
    requiresWaiver: true,
    requiresEmergencyProfile: true
  },
  AFF: {
    allowedSlotTypes: ['AFF_STUDENT', 'AFF_INSTRUCTOR'] as const,
    minExitAltitude: SLOT_RULES.EXIT_ALTITUDE_AFF,
    maxOpeningDelay: 90, // seconds
    requiresWaiver: true,
    requiresEmergencyProfile: false
  },
  WINGSUIT: {
    allowedSlotTypes: ['WINGSUIT'] as const,
    minExitAltitude: SLOT_RULES.EXIT_ALTITUDE_WINGSUIT,
    maxOpeningDelay: 120, // seconds
    requiresWaiver: false,
    requiresEmergencyProfile: false,
    minJumpsRequired: 500
  }
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  STRIPE_PAYMENTS: process.env.FEATURE_STRIPE_PAYMENTS === 'true',
  OFFLINE_SYNC: process.env.FEATURE_OFFLINE_SYNC === 'true',
  MULTI_DZ: process.env.FEATURE_MULTI_DZ === 'true',
  ANALYTICS: process.env.FEATURE_ANALYTICS === 'true',
  AI_INSIGHTS: process.env.FEATURE_AI_INSIGHTS === 'true',
  MOBILE_APP: process.env.FEATURE_MOBILE_APP === 'true'
} as const;

// ============================================================================
// INSTRUCTOR SKILL TYPES
// ============================================================================

export const INSTRUCTOR_SKILLS = {
  TANDEM: 'tandem',
  AFF: 'aff',
  FREEFLY: 'freefly',
  RW: 'rw',
  CAMERA: 'camera',
  COACH: 'coach',
  ADVANCED_MEDICAL: 'advanced_medical'
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-()]{7,}$/,
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_REQUIRES_UPPERCASE: true,
  PASSWORD_REQUIRES_LOWERCASE: true,
  PASSWORD_REQUIRES_NUMBERS: true,
  PASSWORD_REQUIRES_SPECIAL: true,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/
} as const;

// ============================================================================
// LOCALIZATION
// ============================================================================

export const SUPPORTED_LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  JA: 'ja',
  ZH: 'zh',
  AR: 'ar', // RTL
  HE: 'he', // RTL
  KO: 'ko',
  RU: 'ru',
  PL: 'pl',
  TR: 'tr',
  NL: 'nl'
} as const;

export const RTL_LANGUAGES = ['ar', 'he'] as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Auth errors (1xxxx)
  INVALID_CREDENTIALS: '10001',
  ACCOUNT_SUSPENDED: '10002',
  EMAIL_NOT_VERIFIED: '10003',
  INVALID_TOKEN: '10004',
  TOKEN_EXPIRED: '10005',
  MFA_REQUIRED: '10006',

  // Validation errors (2xxxx)
  INVALID_INPUT: '20001',
  MISSING_REQUIRED_FIELD: '20002',
  INVALID_EMAIL_FORMAT: '20003',
  PASSWORD_WEAK: '20004',
  DUPLICATE_EMAIL: '20005',

  // Load/Manifest errors (3xxxx)
  LOAD_NOT_FOUND: '30001',
  SLOT_NOT_AVAILABLE: '30002',
  CG_OUT_OF_LIMITS: '30003',
  WEIGHT_LIMIT_EXCEEDED: '30004',
  INVALID_LOAD_STATUS: '30005',
  NO_AVAILABLE_AIRCRAFT: '30006',

  // Payment errors (4xxxx)
  PAYMENT_FAILED: '40001',
  INSUFFICIENT_BALANCE: '40002',
  INVALID_PAYMENT_METHOD: '40003',
  PAYMENT_TIMEOUT: '40004',

  // Safety errors (5xxxx)
  WIND_LIMIT_EXCEEDED: '50001',
  WAIVER_EXPIRED: '50002',
  MEDICAL_CLEARANCE_REQUIRED: '50003',
  GEAR_NOT_SERVICEABLE: '50004',
  INCIDENT_REPORTED: '50005',

  // Resource errors (6xxxx)
  NOT_FOUND: '60001',
  FORBIDDEN: '60002',
  CONFLICT: '60003',
  GONE: '60004',

  // Server errors (7xxxx)
  INTERNAL_ERROR: '70001',
  DATABASE_ERROR: '70002',
  EXTERNAL_SERVICE_ERROR: '70003',
  SERVICE_UNAVAILABLE: '70004'
} as const;

// ============================================================================
// HTTP TIMEOUTS (ms)
// ============================================================================

export const HTTP_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  PAYMENT: 60000, // 60 seconds
  FILE_UPLOAD: 120000, // 2 minutes
  WEATHER_API: 10000, // 10 seconds
  LOCATION_API: 15000 // 15 seconds
} as const;
