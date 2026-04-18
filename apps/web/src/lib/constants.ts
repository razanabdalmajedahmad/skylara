export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Open' },
  FILLING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Filling' },
  LOCKED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Locked' },
  THIRTY_MIN: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '30 Min Call' },
  TWENTY_MIN: { bg: 'bg-orange-100', text: 'text-orange-700', label: '20 Min Call' },
  TEN_MIN: { bg: 'bg-rose-100', text: 'text-rose-700', label: '10 Min Call' },
  BOARDING: { bg: 'bg-orange-200', text: 'text-orange-800', label: 'Boarding' },
  AIRBORNE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Airborne' },
  LANDED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Landed' },
  COMPLETE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Complete' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Cancelled' },
};

export const SLOT_TYPES = {
  REGULAR: 'Regular',
  TANDEM: 'Tandem',
  COACH: 'Coach',
  CAMERA: 'Camera',
  MANIFEST: 'Manifest',
};

export const ROLES = {
  ADMIN: 'admin',
  DZO: 'dzo',
  JUMP_MASTER: 'jump_master',
  PACKER: 'packer',
  SAFETY_OFFICER: 'safety_officer',
  ATHLETE: 'athlete',
};

export const ROLE_LABELS: Record<string, string> = {
  // Legacy role names
  admin: 'Administrator',
  dzo: 'Drop Zone Operator',
  jump_master: 'Jump Master',
  packer: 'Packer',
  safety_officer: 'Safety Officer',
  athlete: 'Athlete',
  // New role names from backend
  PLATFORM_ADMIN: 'Platform Administrator',
  DZ_MANAGER: 'Drop Zone Manager',
  DZ_OPERATOR: 'Drop Zone Operator',
  MANIFEST_STAFF: 'Manifest Staff',
  SAFETY_OFFICER: 'Safety Officer',
  PILOT: 'Pilot',
  TANDEM_INSTRUCTOR: 'Tandem Instructor',
  AFF_INSTRUCTOR: 'AFF Instructor',
  COACH: 'Coach',
  JUMPER: 'Jumper',
  // Platform hierarchy roles
  SUPER_OWNER: 'Super Owner',
  REGION_ADMIN: 'Region Administrator',
  FACILITY_MANAGER: 'Facility Manager',
  HOSPITALITY_STAFF: 'Hospitality Staff',
  RETAIL_STAFF: 'Retail Staff',
  REPUTATION_MODERATOR: 'Reputation Moderator',
  COMMERCIAL_ADMIN: 'Commercial Admin',
  AD_OPS_ADMIN: 'Ad Ops Admin',
  MARKETING_MANAGER: 'Marketing Manager',
  AD_OPS_STAFF: 'Ad Ops Staff',
  MAINTENANCE_STAFF: 'Maintenance Staff',
  DZ_OWNER: 'Dropzone Owner',
};

// Menu item type
export interface MenuItem {
  label: string;
  href: string;
  icon: string;
}

// Grouped menu section type
export interface MenuSection {
  group: string;
  items: MenuItem[];
  collapsible?: boolean;
}

// Flat list for non-admin roles (no grouping needed for short menus)
const ALL_MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
  { label: 'Check-in', href: '/dashboard/checkin', icon: 'QrCode' },
  { label: 'Athletes', href: '/dashboard/athletes', icon: 'Users' },
  { label: 'Bookings', href: '/dashboard/bookings', icon: 'Calendar' },
  { label: 'Wallet', href: '/dashboard/wallet', icon: 'Wallet' },
  { label: 'Payments', href: '/dashboard/payments', icon: 'DollarSign' },
  { label: 'Staff', href: '/dashboard/staff', icon: 'UserCog' },
  { label: 'Aircraft', href: '/dashboard/aircraft', icon: 'Plane' },
  { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
  { label: 'Courses', href: '/dashboard/courses', icon: 'GraduationCap' },
  { label: 'Learning', href: '/dashboard/learning', icon: 'BookOpen' },
  { label: 'Gear', href: '/dashboard/gear', icon: 'Backpack' },
  { label: 'Boogies', href: '/dashboard/boogies', icon: 'PartyPopper' },
  { label: 'Documents', href: '/dashboard/documents', icon: 'FolderOpen' },
  { label: 'Waivers', href: '/dashboard/waivers', icon: 'FileSignature' },
  { label: 'Incidents', href: '/dashboard/incidents', icon: 'AlertTriangle' },
  { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart3' },
  { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
  { label: 'End of Day', href: '/dashboard/end-of-day', icon: 'ClipboardCheck' },
  { label: 'Logbook', href: '/dashboard/logbook', icon: 'BookOpen' },
  { label: 'Pricing', href: '/dashboard/pricing', icon: 'Tag' },
  { label: 'Gift Cards', href: '/dashboard/gift-cards', icon: 'Gift' },
  { label: 'Enterprise Branding', href: '/dashboard/branding', icon: 'Palette' },
  { label: 'Careers', href: '/dashboard/careers', icon: 'Briefcase' },
  { label: 'Marketing', href: '/dashboard/marketing', icon: 'Megaphone' },
  { label: 'Rentals', href: '/dashboard/rentals', icon: 'Home' },
  { label: 'Venue spaces', href: '/dashboard/commercial/venue-spaces', icon: 'Warehouse' },
  { label: 'Venue bookings', href: '/dashboard/commercial/venue-bookings', icon: 'ClipboardList' },
  { label: 'Website', href: '/dashboard/website', icon: 'Globe' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'TrendingUp' },
  { label: 'Onboarding Center', href: '/dashboard/onboarding', icon: 'UserCheck' },
  { label: 'Notification Center', href: '/dashboard/notifications', icon: 'Bell' },
  { label: 'Coach Directory', href: '/dashboard/staff/coaches', icon: 'Users' },
  { label: 'Instructor Directory', href: '/dashboard/staff/instructors', icon: 'Award' },
  { label: 'Partner Dropzones', href: '/dashboard/partners/dropzones', icon: 'Building2' },
  { label: 'Coach Applications', href: '/dashboard/onboarding/coaches', icon: 'UserPlus' },
  { label: 'Instructor Applications', href: '/dashboard/onboarding/instructors', icon: 'UserPlus' },
  { label: 'DZ Applications', href: '/dashboard/onboarding/staff', icon: 'Building2' },
  { label: 'Platform', href: '/dashboard/platform', icon: 'Globe' },
  { label: 'Regions', href: '/dashboard/platform/regions', icon: 'Map' },
  { label: 'Facilities', href: '/dashboard/platform/facilities', icon: 'Building2' },
  { label: 'Portal Assistant', href: '/dashboard/portal-assistant', icon: 'MessageSquare' },
  { label: 'AI Hub', href: '/dashboard/ai', icon: 'Bot' },
  { label: 'Documentation', href: '/dashboard/documentation', icon: 'BookOpen' },
  { label: 'Roles & Permissions', href: '/dashboard/roles', icon: 'Shield' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
];

// Grouped menu for admin roles — collapsible sections keep the sidebar manageable
const ADMIN_GROUPED_MENU: MenuSection[] = [
  {
    group: 'Platform',
    collapsible: true,
    items: [
      { label: 'Overview', href: '/dashboard/platform', icon: 'Globe' },
      { label: 'Command Center', href: '/dashboard/platform/command-center', icon: 'Monitor' },
      { label: 'Regions', href: '/dashboard/platform/regions', icon: 'Map' },
      { label: 'Facilities', href: '/dashboard/platform/facilities', icon: 'Building2' },
      { label: 'Customers', href: '/dashboard/platform/customers', icon: 'Users' },
      { label: 'Wallets', href: '/dashboard/platform/wallets', icon: 'Wallet' },
      { label: 'Reputation', href: '/dashboard/platform/reputation', icon: 'Star' },
      { label: 'Intelligence', href: '/dashboard/platform/intelligence', icon: 'TrendingUp' },
      { label: 'Impersonation', href: '/dashboard/platform/impersonation', icon: 'UserCog' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
      { label: 'Check-in', href: '/dashboard/checkin', icon: 'QrCode' },
      { label: 'Athletes', href: '/dashboard/athletes', icon: 'Users' },
      { label: 'Bookings', href: '/dashboard/bookings', icon: 'Calendar' },
      { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
      { label: 'End of Day', href: '/dashboard/end-of-day', icon: 'ClipboardCheck' },
    ],
  },
  {
    group: 'Financial',
    collapsible: true,
    items: [
      { label: 'Wallet', href: '/dashboard/wallet', icon: 'Wallet' },
      { label: 'Payments', href: '/dashboard/payments', icon: 'DollarSign' },
      { label: 'Pricing', href: '/dashboard/pricing', icon: 'Tag' },
      { label: 'Gift Cards', href: '/dashboard/gift-cards', icon: 'Gift' },
    ],
  },
  {
    group: 'Fleet & Safety',
    collapsible: true,
    items: [
      { label: 'Aircraft', href: '/dashboard/aircraft', icon: 'Plane' },
      { label: 'Gear', href: '/dashboard/gear', icon: 'Backpack' },
      { label: 'Incidents', href: '/dashboard/incidents', icon: 'AlertTriangle' },
      { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
      { label: 'Waivers', href: '/dashboard/waivers', icon: 'FileSignature' },
    ],
  },
  {
    group: 'People',
    collapsible: true,
    items: [
      { label: 'Staff', href: '/dashboard/staff', icon: 'UserCog' },
      { label: 'Coaches', href: '/dashboard/staff/coaches', icon: 'Users' },
      { label: 'Instructors', href: '/dashboard/staff/instructors', icon: 'Award' },
      { label: 'Partners', href: '/dashboard/partners/dropzones', icon: 'Building2' },
      { label: 'Onboarding', href: '/dashboard/onboarding', icon: 'UserCheck' },
    ],
  },
  {
    group: 'Training',
    collapsible: true,
    items: [
      { label: 'Courses', href: '/dashboard/courses', icon: 'GraduationCap' },
      { label: 'Learning', href: '/dashboard/learning', icon: 'BookOpen' },
      { label: 'Logbook', href: '/dashboard/logbook', icon: 'BookOpen' },
    ],
  },
  {
    group: 'Growth',
    collapsible: true,
    items: [
      { label: 'Marketing', href: '/dashboard/marketing', icon: 'Megaphone' },
      { label: 'Careers', href: '/dashboard/careers', icon: 'Briefcase' },
      { label: 'Rentals', href: '/dashboard/rentals', icon: 'Home' },
      { label: 'Venue spaces', href: '/dashboard/commercial/venue-spaces', icon: 'Warehouse' },
      { label: 'Venue bookings', href: '/dashboard/commercial/venue-bookings', icon: 'ClipboardList' },
      { label: 'Boogies', href: '/dashboard/boogies', icon: 'PartyPopper' },
      { label: 'Website', href: '/dashboard/website', icon: 'Globe' },
    ],
  },
  {
    group: 'Admin',
    collapsible: true,
    items: [
      { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart3' },
      { label: 'Analytics', href: '/dashboard/analytics', icon: 'TrendingUp' },
      { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell' },
      { label: 'Documents', href: '/dashboard/documents', icon: 'FolderOpen' },
      { label: 'Branding', href: '/dashboard/branding', icon: 'Palette' },
      { label: 'AI Hub', href: '/dashboard/ai', icon: 'Bot' },
      { label: 'Roles', href: '/dashboard/roles', icon: 'Shield' },
      { label: 'Documentation', href: '/dashboard/documentation', icon: 'BookOpen' },
      { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
    ],
  },
];

// Role-based menu mapping using DB role names
export const MENU_ITEMS: Record<string, typeof ALL_MENU_ITEMS> = {
  // Full access roles
  PLATFORM_ADMIN: ALL_MENU_ITEMS,
  DZ_MANAGER: ALL_MENU_ITEMS,
  DZ_OPERATOR: ALL_MENU_ITEMS,
  COMMERCIAL_ADMIN: ALL_MENU_ITEMS,
  FACILITY_MANAGER: ALL_MENU_ITEMS,
  MARKETING_MANAGER: ALL_MENU_ITEMS,
  // Staff roles
  MANIFEST_STAFF: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Check-in', href: '/dashboard/checkin', icon: 'QrCode' },
    { label: 'Athletes', href: '/dashboard/athletes', icon: 'Users' },
    { label: 'Bookings', href: '/dashboard/bookings', icon: 'Calendar' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Documents', href: '/dashboard/documents', icon: 'FolderOpen' },
    { label: 'Waivers', href: '/dashboard/waivers', icon: 'FileSignature' },
    { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart3' },
    { label: 'End of Day', href: '/dashboard/end-of-day', icon: 'ClipboardCheck' },
  ],
  SAFETY_OFFICER: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Gear', href: '/dashboard/gear', icon: 'Backpack' },
    { label: 'Incidents', href: '/dashboard/incidents', icon: 'AlertTriangle' },
    { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
    { label: 'Waivers', href: '/dashboard/waivers', icon: 'FileSignature' },
    { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart3' },
  ],
  PILOT: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Pilot View', href: '/dashboard/pilot', icon: 'Plane' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Aircraft', href: '/dashboard/aircraft', icon: 'Plane' },
    { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
  ],
  TANDEM_INSTRUCTOR: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Check-in', href: '/dashboard/checkin', icon: 'QrCode' },
    { label: 'Athletes', href: '/dashboard/athletes', icon: 'Users' },
    { label: 'Bookings', href: '/dashboard/bookings', icon: 'Calendar' },
    { label: 'Courses', href: '/dashboard/courses', icon: 'GraduationCap' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Wallet', href: '/dashboard/wallet', icon: 'Wallet' },
    { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
  ],
  AFF_INSTRUCTOR: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Check-in', href: '/dashboard/checkin', icon: 'QrCode' },
    { label: 'Athletes', href: '/dashboard/athletes', icon: 'Users' },
    { label: 'Courses', href: '/dashboard/courses', icon: 'GraduationCap' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Wallet', href: '/dashboard/wallet', icon: 'Wallet' },
    { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
  ],
  COACH: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Athletes', href: '/dashboard/athletes', icon: 'Users' },
    { label: 'Courses', href: '/dashboard/courses', icon: 'GraduationCap' },
    { label: 'Wallet', href: '/dashboard/wallet', icon: 'Wallet' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Logbook', href: '/dashboard/logbook', icon: 'BookOpen' },
  ],
  // Default for JUMPER / athletes
  JUMPER: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Manifest', href: '/dashboard/manifest', icon: 'Clipboard' },
    { label: 'Bookings', href: '/dashboard/bookings', icon: 'Calendar' },
    { label: 'Wallet', href: '/dashboard/wallet', icon: 'Wallet' },
    { label: 'Logbook', href: '/dashboard/logbook', icon: 'BookOpen' },
    { label: 'Weather', href: '/dashboard/weather', icon: 'Cloud' },
    { label: 'Emergency', href: '/dashboard/emergency', icon: 'AlertCircle' },
  ],
};

// Helper: given an array of role names, return the most privileged menu set
export function getMenuForRoles(roles: string[]): MenuItem[] {
  const priority = ['PLATFORM_ADMIN', 'DZ_MANAGER', 'DZ_OPERATOR', 'COMMERCIAL_ADMIN', 'FACILITY_MANAGER', 'MARKETING_MANAGER', 'MANIFEST_STAFF', 'SAFETY_OFFICER', 'TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR', 'COACH', 'PILOT', 'JUMPER'];
  for (const role of priority) {
    if (roles.includes(role) && MENU_ITEMS[role]) {
      return MENU_ITEMS[role];
    }
  }
  return MENU_ITEMS.JUMPER;
}

// Helper: return grouped sections for admin roles, flat list for others
export function getGroupedMenuForRoles(roles: string[]): MenuSection[] | null {
  const adminRoles = ['PLATFORM_ADMIN', 'DZ_MANAGER', 'DZ_OPERATOR', 'COMMERCIAL_ADMIN', 'FACILITY_MANAGER', 'MARKETING_MANAGER'];
  if (roles.some(r => adminRoles.includes(r))) {
    return ADMIN_GROUPED_MENU;
  }
  return null; // non-admin roles use flat list
}

export const CG_RANGES = {
  SAFE_MIN: 25,
  SAFE_MAX: 35,
  WARNING_MIN: 20,
  WARNING_MAX: 40,
};
