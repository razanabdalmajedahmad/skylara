// ============================================================================
// SKYLARA CANONICAL TYPES — Aligned with CANONICAL_TRUTH.md
// ============================================================================

// ============================================================================
// USER & IDENTITY ENUMS
// ============================================================================

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED'
}

export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  DZ_OWNER = 'DZ_OWNER',
  DZ_MANAGER = 'DZ_MANAGER',
  MANIFEST_STAFF = 'MANIFEST_STAFF',
  TI = 'TI',
  AFFI = 'AFFI',
  COACH = 'COACH',
  PILOT = 'PILOT',
  RIGGER = 'RIGGER',
  ATHLETE = 'ATHLETE',
  STUDENT = 'STUDENT',
  SPECTATOR = 'SPECTATOR'
}

// ============================================================================
// LOAD & MANIFEST ENUMS (11 FSM states per Canonical Truth)
// ============================================================================

export enum LoadStatus {
  OPEN = 'OPEN',
  FILLING = 'FILLING',
  LOCKED = 'LOCKED',
  THIRTY_MIN = 'THIRTY_MIN',
  TWENTY_MIN = 'TWENTY_MIN',
  TEN_MIN = 'TEN_MIN',
  BOARDING = 'BOARDING',
  AIRBORNE = 'AIRBORNE',
  LANDED = 'LANDED',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED'
}

export enum SlotType {
  FUN = 'FUN',
  TANDEM_PASSENGER = 'TANDEM_PASSENGER',
  TANDEM_INSTRUCTOR = 'TANDEM_INSTRUCTOR',
  AFF_STUDENT = 'AFF_STUDENT',
  AFF_INSTRUCTOR = 'AFF_INSTRUCTOR',
  COACH = 'COACH',
  CAMERA = 'CAMERA',
  WINGSUIT = 'WINGSUIT',
  HOP_N_POP = 'HOP_N_POP',
  CRW = 'CRW'
}

export enum SlotStatus {
  MANIFESTED = 'MANIFESTED',
  CHECKED_IN = 'CHECKED_IN',
  BOARDING = 'BOARDING',
  JUMPED = 'JUMPED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED'
}

export enum JumpType {
  TANDEM = 'TANDEM',
  AFF = 'AFF',
  FUN_JUMP = 'FUN_JUMP',
  COACH = 'COACH',
  HOP_POP = 'HOP_POP',
  NIGHT = 'NIGHT',
  WINGSUIT = 'WINGSUIT',
  CRW = 'CRW'
}

// ============================================================================
// GROUP & TEAM ENUMS
// ============================================================================

export enum GroupType {
  RW = 'RW',
  FREEFLY = 'FREEFLY',
  ANGLE = 'ANGLE',
  WINGSUIT = 'WINGSUIT',
  COACHING = 'COACHING',
  TANDEM_CAMERA = 'TANDEM_CAMERA',
  AFF = 'AFF',
  CRW = 'CRW'
}

export enum GroupMemberRole {
  CAPTAIN = 'CAPTAIN',
  MEMBER = 'MEMBER'
}

export enum GroupMemberStatus {
  INVITED = 'INVITED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

// ============================================================================
// QR & IDENTITY ENUMS
// ============================================================================

export enum QrTokenType {
  PERMANENT = 'PERMANENT',
  DAILY = 'DAILY',
  BOOKING = 'BOOKING'
}

// ============================================================================
// LICENSE & COMPLIANCE ENUMS
// ============================================================================

export enum LicenseLevel {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  STUDENT = 'STUDENT',
  NONE = 'NONE'
}

export enum VerificationMethod {
  SELF_REPORTED = 'SELF_REPORTED',
  STAFF_VISUAL = 'STAFF_VISUAL',
  STAFF_ENTRY = 'STAFF_ENTRY',
  PHOTO_UPLOAD = 'PHOTO_UPLOAD',
  FUTURE_API = 'FUTURE_API'
}

// ============================================================================
// WAIVER ENUMS
// ============================================================================

export enum WaiverType {
  TANDEM = 'TANDEM',
  AFF = 'AFF',
  EXPERIENCED = 'EXPERIENCED',
  MINOR = 'MINOR',
  SPECTATOR = 'SPECTATOR',
  MEDIA = 'MEDIA'
}

export enum WaiverStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

// ============================================================================
// GEAR ENUMS
// ============================================================================

export enum GearType {
  CONTAINER = 'CONTAINER',
  MAIN = 'MAIN',
  RESERVE = 'RESERVE',
  AAD = 'AAD',
  HELMET = 'HELMET',
  ALTIMETER = 'ALTIMETER',
  SUIT = 'SUIT'
}

export enum GearCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR'
}

export enum GearCheckResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  GROUNDED = 'GROUNDED'
}

export enum GearStatus {
  ACTIVE = 'ACTIVE',
  GROUNDED = 'GROUNDED',
  RETIRED = 'RETIRED',
  IN_REPAIR = 'IN_REPAIR'
}

// ============================================================================
// AIRCRAFT ENUMS
// ============================================================================

export enum AircraftStatus {
  ACTIVE = 'ACTIVE',
  MX_HOLD = 'MX_HOLD',
  RETIRED = 'RETIRED'
}

// ============================================================================
// CG & SAFETY ENUMS
// ============================================================================

export enum CgResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  MARGINAL = 'MARGINAL'
}

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  ELEVATED = 'ELEVATED',
  HIGH = 'HIGH',
  EXTREME = 'EXTREME'
}

// ============================================================================
// FINANCIAL ENUMS
// ============================================================================

export enum TransactionType {
  TICKET_PURCHASE = 'TICKET_PURCHASE',
  BOOKING = 'BOOKING',
  RENTAL = 'RENTAL',
  SHOP = 'SHOP',
  REFUND = 'REFUND',
  CREDIT = 'CREDIT',
  PAYOUT = 'PAYOUT',
  FEE = 'FEE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CAPTURED = 'CAPTURED',
  SETTLED = 'SETTLED',
  REFUNDED = 'REFUNDED'
}

// ============================================================================
// BOOKING ENUMS
// ============================================================================

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  EXPIRED = 'EXPIRED'
}

export enum BookingRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// ============================================================================
// SAFETY & INCIDENT ENUMS
// ============================================================================

export enum IncidentSeverity {
  NEAR_MISS = 'NEAR_MISS',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SERIOUS = 'SERIOUS',
  FATAL = 'FATAL'
}

export enum IncidentCategory {
  NEAR_MISS = 'NEAR_MISS',
  INJURY = 'INJURY',
  MALFUNCTION = 'MALFUNCTION',
  FATALITY = 'FATALITY',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  ADMINISTRATIVE = 'ADMINISTRATIVE'
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// ============================================================================
// INSTRUCTOR ENUMS
// ============================================================================

export enum InstructorSkillCode {
  TANDEM = 'TANDEM',
  AFF = 'AFF',
  OVERWEIGHT = 'OVERWEIGHT',
  HANDICAP = 'HANDICAP',
  CAMERA = 'CAMERA',
  FREEFLY = 'FREEFLY',
  WINGSUIT = 'WINGSUIT',
  COACH = 'COACH'
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  FREELANCE = 'FREELANCE',
  SEASONAL = 'SEASONAL'
}

// ============================================================================
// NOTIFICATION ENUMS
// ============================================================================

export enum NotificationType {
  LOAD_READY = 'LOAD_READY',
  LOAD_BOARDING = 'LOAD_BOARDING',
  LOAD_DEPARTURE = 'LOAD_DEPARTURE',
  CALL_30MIN = 'CALL_30MIN',
  CALL_20MIN = 'CALL_20MIN',
  CALL_10MIN = 'CALL_10MIN',
  SLOT_ASSIGNMENT = 'SLOT_ASSIGNMENT',
  SLOT_CONFIRMATION = 'SLOT_CONFIRMATION',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INSTRUCTOR_ASSIGNMENT = 'INSTRUCTOR_ASSIGNMENT',
  WEATHER_WARNING = 'WEATHER_WARNING',
  WEATHER_HOLD = 'WEATHER_HOLD',
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  WAIVER_REQUIRED = 'WAIVER_REQUIRED',
  GEAR_CHECK_FAILED = 'GEAR_CHECK_FAILED',
  REPACK_DUE = 'REPACK_DUE',
  AAD_EXPIRING = 'AAD_EXPIRING',
  INCIDENT_REPORTED = 'INCIDENT_REPORTED',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  // Rig Maintenance notifications
  RIG_DUE_SOON = 'RIG_DUE_SOON',
  RIG_DUE_NOW = 'RIG_DUE_NOW',
  RIG_OVERDUE = 'RIG_OVERDUE',
  RIG_GROUNDED = 'RIG_GROUNDED',
  RIG_GROUNDING_CLEARED = 'RIG_GROUNDING_CLEARED',
  RIG_MAINTENANCE_COMPLETED = 'RIG_MAINTENANCE_COMPLETED'
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ'
}

export enum NotificationPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// ============================================================================
// SYNC & OFFLINE ENUMS
// ============================================================================

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}

export enum EventOutboxStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED'
}

// ============================================================================
// AUDIT & COMPLIANCE ENUMS
// ============================================================================

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  ROLE_GRANT = 'ROLE_GRANT',
  ROLE_REVOKE = 'ROLE_REVOKE',
  INCIDENT_REPORT = 'INCIDENT_REPORT',
  GEAR_CHECK = 'GEAR_CHECK',
  GEAR_ASSIGN = 'GEAR_ASSIGN',
  WAIVER_SIGN = 'WAIVER_SIGN',
  LOAD_CREATE = 'LOAD_CREATE',
  LOAD_CANCEL = 'LOAD_CANCEL',
  LOAD_DEPART = 'LOAD_DEPART',
  LOAD_UPDATE = 'LOAD_UPDATE',
  LOAD_DELETE = 'LOAD_DELETE',
  LOAD_LOCK = 'LOAD_LOCK',
  SLOT_ASSIGN = 'SLOT_ASSIGN',
  SLOT_CANCEL = 'SLOT_CANCEL',
  SLOT_CREATE = 'SLOT_CREATE',
  SLOT_DELETE = 'SLOT_DELETE',
  MANIFEST_GROUP = 'MANIFEST_GROUP',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  EMERGENCY_ACTIVATE = 'EMERGENCY_ACTIVATE',
  EMERGENCY_DEACTIVATE = 'EMERGENCY_DEACTIVATE',
  CG_CHECK = 'CG_CHECK',
  CG_OVERRIDE = 'CG_OVERRIDE',
  OVERRIDE = 'OVERRIDE',
  BOOKING_CREATE = 'BOOKING_CREATE',
  BOOKING_CANCEL = 'BOOKING_CANCEL',
  AFF_EVALUATE = 'AFF_EVALUATE',
  INSTRUCTOR_ASSIGN = 'INSTRUCTOR_ASSIGN',
  REPACK_LOG = 'REPACK_LOG',
  // Rig Maintenance audit actions
  RIG_CREATE = 'RIG_CREATE',
  RIG_UPDATE = 'RIG_UPDATE',
  RIG_GROUND = 'RIG_GROUND',
  RIG_CLEAR_GROUNDING = 'RIG_CLEAR_GROUNDING',
  RIG_MAINTENANCE_EVENT = 'RIG_MAINTENANCE_EVENT',
  RIG_COUNTER_RESET = 'RIG_COUNTER_RESET',
  RIG_COUNTER_INCREMENT = 'RIG_COUNTER_INCREMENT',
  RIG_RULE_CREATE = 'RIG_RULE_CREATE',
  RIG_RULE_UPDATE = 'RIG_RULE_UPDATE'
}

// ============================================================================
// SAFETY TIER LEVELS (for permission checks)
// ============================================================================

export enum SafetyTier {
  CRITICAL = 'CRITICAL',   // CG override, emergency, weather hold override
  HIGH = 'HIGH',           // Post-LOCKED manifest changes, instructor reassignment
  STANDARD = 'STANDARD',   // Create load, assign slots, check-in
  BASIC = 'BASIC'          // View load board, self-manifest
}

// ============================================================================
// DOMAIN INTERFACES
// ============================================================================

export interface User {
  id: number;
  uuid: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  roles?: string[];
}

export interface Athlete {
  id: number;
  userId: number;
  homeDropzoneId?: number;
  uspaMemberId?: string;
  licenseLevel: LicenseLevel;
  totalJumps: number;
  lastJumpDate?: Date;
  disciplines: string[];
}

export interface Load {
  id: number;
  uuid: string;
  dropzoneId: number;
  branchId: number;
  aircraftId: number;
  pilotId: number;
  loadNumber: string;
  status: LoadStatus;
  scheduledAt: Date;
  actualDepartureAt?: Date;
  slotCount: number;
  currentWeight: number;
  fuelWeight: number;
  cgPosition: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Slot {
  id: number;
  loadId: number;
  userId?: number;
  instructorId?: number;
  cameraId?: number;
  position: number;
  slotType: SlotType;
  jumpType?: JumpType;
  status: SlotStatus;
  weight: number;
  exitGroup?: number;
  exitOrder?: number;
  checkedIn: boolean;
  checkedInAt?: Date;
}

export interface CgCheck {
  id: number;
  loadId: number;
  aircraftId: number;
  performedById: number;
  totalWeight: number;
  fuelWeight: number;
  pilotWeight: number;
  passengerWeight: number;
  calculatedCg: number;
  forwardLimit: number;
  aftLimit: number;
  result: CgResult;
  overrideReason?: string;
  createdAt: Date;
}

export interface LogbookEntry {
  id: number;
  userId: number;
  loadId?: number;
  dropzoneId: number;
  jumpNumber: number;
  altitude?: number;
  freefallTime?: number;
  deploymentAltitude?: number;
  jumpType?: JumpType;
  notes?: string;
  createdAt: Date;
}

export interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  ownerId: number;
  subscriptionTier: string;
}

export interface Dropzone {
  id: number;
  uuid: string;
  organizationId: number;
  name: string;
  slug: string;
  icaoCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  windLimitKnots: number;
  currency: string;
  status: string;
}

export interface Transaction {
  id: number;
  uuid: string;
  walletId: number;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType?: string;
  referenceId?: number;
  stripePaymentId?: string;
  createdAt: Date;
}

export interface Notification {
  id: number;
  userId: number;
  dropzoneId?: number;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  sentAt?: Date;
  readAt?: Date;
}

export interface Incident {
  id: number;
  uuid: string;
  dropzoneId: number;
  reportedById: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  loadId?: number;
  location?: string;
}

export interface Booking {
  id: number;
  uuid: string;
  dropzoneId: number;
  userId: number;
  packageId?: number;
  bookingType: string;
  scheduledDate: Date;
  status: BookingStatus;
  notes?: string;
}

export interface AuditLog {
  id: number;
  userId?: number;
  dropzoneId?: number;
  action: AuditAction;
  entityType: string;
  entityId: number;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface TokenPayload {
  userId: number;
  email: string;
  roles: string[];
  organizationId?: number;
  dropzoneId?: number;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenVersion: number;
  iat: number;
  exp: number;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateLoadRequest {
  dropzoneId: number;
  branchId: number;
  aircraftId: number;
  pilotId: number;
  loadNumber: string;
  scheduledAt: Date;
  slotCount: number;
  notes?: string;
}

export interface AssignSlotRequest {
  loadId: number;
  userId: number;
  slotType: SlotType;
  jumpType?: JumpType;
  weight: number;
  instructorId?: number;
  cameraId?: number;
}

export interface CreateIncidentRequest {
  dropzoneId: number;
  severity: IncidentSeverity;
  title: string;
  description: string;
  loadId?: number;
  gearItemId?: number;
  location?: string;
}

export interface CgCheckRequest {
  loadId: number;
  fuelWeight: number;
  pilotWeight: number;
}

export interface TransitionLoadRequest {
  toStatus: LoadStatus;
  overrideReason?: string;
}

// ============================================================================
// RIG MAINTENANCE TYPES
// Per SkyLara_Rig_Maintenance_Complete_Master_File.md
// ============================================================================

export enum RigType {
  SPORT = 'SPORT',
  TANDEM = 'TANDEM',
  STUDENT = 'STUDENT',
  RENTAL = 'RENTAL',
  OTHER = 'OTHER'
}

export enum RigActiveStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RETIRED = 'RETIRED'
}

export enum RigComponentType {
  RIG = 'RIG',
  CONTAINER = 'CONTAINER',
  MAIN = 'MAIN',
  LINESET = 'LINESET',
  RESERVE = 'RESERVE',
  AAD = 'AAD',
  BRAKE_LINES = 'BRAKE_LINES',
  RISERS = 'RISERS',
  CUSTOM = 'CUSTOM'
}

export enum MaintenanceRuleType {
  INSPECTION = 'INSPECTION',
  REPLACEMENT_REMINDER = 'REPLACEMENT_REMINDER',
  SERVICE = 'SERVICE',
  COMPLIANCE = 'COMPLIANCE',
  GROUNDING_POLICY = 'GROUNDING_POLICY'
}

export enum MaintenanceResult {
  PASSED = 'PASSED',
  MONITOR = 'MONITOR',
  SERVICE_REQUIRED = 'SERVICE_REQUIRED',
  DUE_SOON = 'DUE_SOON',
  DUE_NOW = 'DUE_NOW',
  OVERDUE = 'OVERDUE',
  GROUNDED = 'GROUNDED',
  COMPLETED = 'COMPLETED'
}

export enum MaintenanceStatus {
  OK = 'OK',
  DUE_SOON = 'DUE_SOON',
  DUE_NOW = 'DUE_NOW',
  OVERDUE = 'OVERDUE',
  GROUNDED = 'GROUNDED'
}

export enum RuleSourceType {
  DZ_DEFAULT = 'DZ_DEFAULT',
  MANUFACTURER = 'MANUFACTURER',
  RIGGER = 'RIGGER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN'
}

// ============================================================================
// RIG MAINTENANCE INTERFACES
// ============================================================================

export interface RigSummary {
  id: number;
  rigName: string;
  rigType: RigType;
  activeStatus: RigActiveStatus;
  totalJumps: number;
  overallMaintenanceStatus: MaintenanceStatus;
  componentStatuses: ComponentStatusEntry[];
  activeGroundings: number;
}

export interface ComponentStatusEntry {
  componentType: RigComponentType;
  status: MaintenanceStatus;
  reason?: string;
  jumpsSinceService?: number;
  daysSinceService?: number;
  triggerValue?: number;
  currentValue?: number;
}

export interface RigStatusResponse {
  rigId: number;
  overallStatus: MaintenanceStatus;
  components: ComponentStatusEntry[];
  activeGroundings: GroundingInfo[];
  lastEvaluatedAt: string;
}

export interface GroundingInfo {
  id: number;
  componentType: RigComponentType;
  reason: string;
  policySource?: string;
  groundedAt: string;
  groundedBy: string;
  active: boolean;
}

export interface MaintenanceSummaryResponse {
  dueSoonCount: number;
  dueNowCount: number;
  overdueCount: number;
  groundedCount: number;
  reserveRepackUpcoming: number;
  aadServiceUpcoming: number;
}

export interface CreateRigRequest {
  rigName: string;
  rigType: RigType;
  dropzoneId?: number;
  isSharedRig?: boolean;
  notes?: string;
  container?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    manufactureDate?: string;
    size?: string;
  };
  mainCanopy?: {
    manufacturer?: string;
    model?: string;
    size?: string;
    serialNumber?: string;
    fabricType?: string;
    lineType?: string;
    installDate?: string;
    totalJumps?: number;
  };
  reserve?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    repackDate?: string;
    repackDueDate?: string;
  };
  aad?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    lastServiceDate?: string;
    nextServiceDueDate?: string;
    batteryDueDate?: string;
    endOfLifeDate?: string;
  };
}

export interface CreateMaintenanceEventRequest {
  componentType: RigComponentType;
  maintenanceType: string;
  eventDate: string;
  result: MaintenanceResult;
  findings?: string;
  actionTaken?: string;
  performedByName?: string;
  resetCounterTypes?: RigComponentType[];
  notes?: string;
}

export interface CreateMaintenanceRuleRequest {
  componentType: RigComponentType;
  ruleType: MaintenanceRuleType;
  triggerByJumps?: number;
  triggerByDays?: number;
  dueSoonPercent?: number;
  overduePercent?: number;
  hardStop?: boolean;
  sourceType?: RuleSourceType;
  appliesToRigType?: RigType;
  label?: string;
  notes?: string;
}
