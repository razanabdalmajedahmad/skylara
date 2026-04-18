/**
 * SkyLara Mobile App - Comprehensive TypeScript Types
 * Mobile-specific types and interfaces
 */

// === USER & AUTH ===
export interface AuthUser {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  roles: UserRoleAssignment[];
  profile?: UserProfile;
  athlete?: AthleteProfile;
}

export interface UserRoleAssignment {
  role: string;
  dropzoneId?: number;
  organizationId?: number;
}

export interface UserProfile {
  avatar?: string;
  dateOfBirth?: string;
  weight?: number;
  nationality?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bio?: string;
}

export interface AthleteProfile {
  licenseLevel: string;
  totalJumps: number;
  lastJumpDate?: string;
  homeDropzoneId?: number;
  uspaMemberId?: string;
  disciplines: string[];
  wingLoading?: number;
}

// === DROPZONE ===
export interface Dropzone {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  icaoCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  windLimitKnots: number;
  status: string;
  organization: { id: number; name: string };
}

// === LOAD & MANIFEST ===
export interface Load {
  id: number;
  uuid: string;
  loadNumber: string;
  status: string;
  aircraftId: number;
  aircraft?: Aircraft;
  pilotId: number;
  pilot?: { id: number; firstName: string; lastName: string };
  scheduledAt: string;
  actualDepartureAt?: string;
  slotCount: number;
  slotsAvailable: number;
  slotsFilled: number;
  currentWeight: number;
  maxWeight: number;
  fuelWeight: number;
  cgPosition?: number;
  notes?: string;
  slots: Slot[];
  exitGroups?: ExitGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  id: number;
  loadId: number;
  userId: number;
  user?: SlotUser;
  instructorId?: number;
  instructor?: SlotUser;
  position: number;
  slotType: string;
  jumpType?: string;
  status: string;
  weight: number;
  exitGroup?: number;
  exitOrder?: number;
  checkedIn: boolean;
  checkedInAt?: string;
  paymentMethod?: string;
  formation?: string;
  groupId?: number;
}

export interface SlotUser {
  id: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  licenseLevel?: string;
  totalJumps?: number;
}

export interface ExitGroup {
  id: number;
  order: number;
  formation: string;
  slots: Slot[];
}

export interface Aircraft {
  id: number;
  name: string;
  registration: string;
  type: string;
  maxSlots: number;
  maxWeight: number;
  status: string;
}

// === WALLET & PAYMENTS ===
export interface Wallet {
  id: number;
  balanceCents: number;
  currency: string;
  jumpTickets: number;
  lastTopUpAt?: string;
}

export interface JumpTicket {
  id: number;
  ticketType: string;
  totalJumps: number;
  remainingJumps: number;
  priceCents: number;
  expiresAt?: string;
  purchasedAt: string;
}

export interface Transaction {
  id: number;
  uuid: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType?: string;
  referenceId?: number;
  createdAt: string;
}

// === WEATHER ===
export interface WeatherData {
  current: {
    temperature: number;
    windSpeed: number;
    windGust: number;
    windDirection: number;
    visibility: number;
    cloudCover: number;
    condition: string;
    updatedAt: string;
  };
  jumpability: 'GREEN' | 'YELLOW' | 'RED';
  jumpabilityReasons?: string[];
  hourly?: HourlyForecast[];
  alerts?: WeatherAlert[];
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  condition: string;
  jumpability: 'GREEN' | 'YELLOW' | 'RED';
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  startsAt: string;
  endsAt?: string;
}

// === LOGBOOK ===
export interface LogbookEntry {
  id: number;
  jumpNumber: number;
  date: string;
  dropzoneId: number;
  dropzoneName?: string;
  loadId?: number;
  altitude: number;
  freefallTime?: number;
  deploymentAltitude?: number;
  jumpType: string;
  formation?: string;
  equipment?: string;
  notes?: string;
  mediaUrls?: string[];
  verified: boolean;
  createdAt: string;
}

// === GEAR ===
export interface GearItem {
  id: number;
  userId: number;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  size?: string;
  color?: string;
  dom?: string;
  jumpsOnGear: number;
  status: string;
  lastInspection?: string;
  nextRepackDue?: string;
  aadDueDate?: string;
  notes?: string;
}

export interface GearCheck {
  id: number;
  gearItemId: number;
  performedById: number;
  performedBy?: SlotUser;
  result: string;
  notes?: string;
  createdAt: string;
}

// === CHAT / MESSAGING ===
export interface ChatChannel {
  id: number;
  name: string;
  type: 'DZ_GENERAL' | 'LOAD_CHAT' | 'DIRECT' | 'GROUP';
  lastMessage?: ChatMessage;
  unreadCount: number;
  members?: SlotUser[];
  loadId?: number;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  senderId: number;
  sender?: SlotUser;
  body: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  mediaUrl?: string;
  createdAt: string;
  readBy?: number[];
}

// === NOTIFICATIONS ===
export interface AppNotification {
  id: number;
  type: string;
  channel: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

// === INCIDENT / SAFETY ===
export interface Incident {
  id: number;
  uuid: string;
  severity: string;
  category: string;
  status: string;
  title: string;
  description: string;
  loadId?: number;
  reportedById: number;
  reportedBy?: SlotUser;
  location?: string;
  createdAt: string;
}

// === WAIVER ===
export interface Waiver {
  id: number;
  type: string;
  status: string;
  signedAt?: string;
  expiresAt?: string;
  dropzoneId: number;
  documentUrl?: string;
}

// === BOOKING ===
export interface Booking {
  id: number;
  uuid: string;
  bookingType: string;
  scheduledDate: string;
  status: string;
  packageName?: string;
  notes?: string;
  createdAt: string;
}

// === SEARCH / JUMPER ===
export interface JumperSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  licenseLevel?: string;
  totalJumps?: number;
  isCheckedIn?: boolean;
}

// === API RESPONSE WRAPPERS ===
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, any> };
  meta?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; pageSize: number; pages: number };
}

// === WEBSOCKET EVENT PAYLOADS ===
export interface LoadUpdatePayload {
  loadId: number;
  loadNumber: string;
  type: string;
  fromStatus?: string;
  toStatus?: string;
  slot?: Slot;
  message?: string;
  timestamp: string;
}

export interface EmergencyPayload {
  type: 'activated' | 'deactivated';
  dropzoneId: number;
  activatedBy?: string;
  message?: string;
  timestamp: string;
}

export interface WeatherHoldPayload {
  active: boolean;
  reason?: string;
  estimatedResume?: string;
  timestamp: string;
}

export interface CheckinPayload {
  userId: number;
  userName: string;
  action: 'checkin' | 'checkout';
  timestamp: string;
}
