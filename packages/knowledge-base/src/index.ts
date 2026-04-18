// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

export type HelpCategory =
  | 'getting-started'
  | 'manifest'
  | 'checkin'
  | 'qr'
  | 'compliance'
  | 'wallet-tickets'
  | 'gear'
  | 'incidents-emergency'
  | 'reports'
  | 'role-permissions'
  | 'offline-mode';

export interface HelpArticle {
  id: string;
  slug: string;
  category: HelpCategory;
  title: string;
  shortAnswer: string;
  detailedSteps: string[];
  rolesAllowed: string[];
  routeReference: string;
  relatedActions: string[];
  keywords: string[];
  module: string;
}

export interface FeatureRegistryEntry {
  id: string;
  featureName: string;
  description: string;
  module: string;
  route: string;
  rolesRequired: string[];
  status: 'available' | 'coming-soon' | 'not-available';
  helpArticleId?: string;
}

export interface KnowledgeSearchResult {
  articles: HelpArticle[];
  features: FeatureRegistryEntry[];
  totalResults: number;
}

// ============================================================================
// LOCAL KNOWLEDGE BASE DATA
// ============================================================================

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'article-1',
    slug: 'getting-started-overview',
    category: 'getting-started',
    title: 'Getting Started with SkyLara',
    shortAnswer: 'SkyLara is a comprehensive dropzone management platform for skydiving operations.',
    detailedSteps: [
      'Visit the SkyLara dashboard at /dashboard',
      'Click your profile icon to set up your organization',
      'Invite team members with appropriate roles',
      'Configure your first dropzone in Settings',
      'Create an aircraft and staff roster',
      'Schedule your first load'
    ],
    rolesAllowed: ['DZ_MANAGER', 'ADMIN'],
    routeReference: '/dashboard',
    relatedActions: ['setup-organization', 'invite-users', 'create-dropzone'],
    keywords: ['getting started', 'setup', 'onboarding', 'first time'],
    module: 'core'
  },
  {
    id: 'article-2',
    slug: 'manifest-board-guide',
    category: 'manifest',
    title: 'Using the Manifest Board',
    shortAnswer: 'The manifest board displays all jumpers and their assigned loads.',
    detailedSteps: [
      'Open the Manifest Board from the left sidebar',
      'View current and upcoming loads',
      'Add jumpers to a load by clicking "Add Jumper"',
      'Assign slot types (FUN, TANDEM, AFF, etc.)',
      'Set exit order and weight distribution',
      'Lock the load when full or ready for briefing'
    ],
    rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
    routeReference: '/manifest/board',
    relatedActions: ['add-jumper', 'assign-slot', 'lock-load', 'check-in-load'],
    keywords: ['manifest', 'load', 'jumpers', 'assignments', 'board'],
    module: 'manifest'
  },
  {
    id: 'article-3',
    slug: 'qr-checkin-process',
    category: 'qr',
    title: 'QR Code Check-In Process',
    shortAnswer: 'Athletes use QR codes to check in before their jumps.',
    detailedSteps: [
      'Generate a QR code token in the athlete profile',
      'Display QR code on tablet or phone at the check-in station',
      'Staff member scans QR code with the mobile app',
      'System verifies athlete identity and booking status',
      'Check-in marked complete and athlete added to load roster',
      'Athlete receives jump confirmation notification'
    ],
    rolesAllowed: ['ATHLETE', 'MANIFEST_STAFF', 'DZ_MANAGER'],
    routeReference: '/checkin/qr',
    relatedActions: ['generate-qr', 'scan-qr', 'verify-booking'],
    keywords: ['qr code', 'check-in', 'scanner', 'mobile', 'athlete'],
    module: 'checkin'
  },
  {
    id: 'article-4',
    slug: 'wallet-credit-system',
    category: 'wallet-tickets',
    title: 'Wallet and Credit System',
    shortAnswer: 'Manage jump credits and payments through the integrated wallet system.',
    detailedSteps: [
      'Open Wallet from your dashboard',
      'View current balance and transaction history',
      'Add credit by clicking "Purchase Credits"',
      'Choose ticket package (5, 10, 25 jumps)',
      'Complete payment via credit card or other method',
      'Credits are immediately available for bookings'
    ],
    rolesAllowed: ['ATHLETE', 'COACH'],
    routeReference: '/wallet',
    relatedActions: ['purchase-credits', 'view-balance', 'book-jump'],
    keywords: ['wallet', 'credits', 'tickets', 'payment', 'purchase'],
    module: 'wallet'
  },
  {
    id: 'article-5',
    slug: 'gear-check-requirements',
    category: 'gear',
    title: 'Gear Check and Inspection Process',
    shortAnswer: 'All gear must be checked before every jump for safety compliance.',
    detailedSteps: [
      'Navigate to Gear Management from the sidebar',
      'Select the jumper and their assigned gear',
      'Perform visual inspection of parachute container',
      'Check reserve ripcord and pin conditions',
      'Verify AAD is within firing range and battery status',
      'Document any issues or damage',
      'Mark gear check as PASS, FAIL, or CONDITIONAL'
    ],
    rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
    routeReference: '/gear/checks',
    relatedActions: ['create-gear-check', 'resolve-issue', 'ground-gear'],
    keywords: ['gear', 'inspection', 'check', 'safety', 'equipment', 'parachute'],
    module: 'gear'
  },
  {
    id: 'article-6',
    slug: 'emergency-incident-reporting',
    category: 'incidents-emergency',
    title: 'Reporting Incidents and Emergencies',
    shortAnswer: 'Immediately report any incident or safety concern through the incident system.',
    detailedSteps: [
      'Open Incidents from the main menu',
      'Click "Report Incident" button',
      'Select severity level (Near Miss, Minor, Moderate, Serious, Fatal)',
      'Describe what happened in detail',
      'Identify involved personnel and equipment',
      'Select affected load (if applicable)',
      'Submit for immediate review',
      'Incident is auto-escalated to management'
    ],
    rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'ATHLETE', 'COACH'],
    routeReference: '/incidents/report',
    relatedActions: ['activate-emergency', 'notify-management', 'document-incident'],
    keywords: ['incident', 'emergency', 'report', 'accident', 'safety', 'serious'],
    module: 'incidents'
  },
  {
    id: 'article-7',
    slug: 'role-based-permissions',
    category: 'role-permissions',
    title: 'Understanding Roles and Permissions',
    shortAnswer: 'Each user role has specific permissions and access levels in SkyLara.',
    detailedSteps: [
      'Access Role Management from Settings (DZ Managers only)',
      'Review role definitions: DZ_MANAGER, MANIFEST_STAFF, COACH, ATHLETE',
      'DZ_MANAGER: Full access to all features and settings',
      'MANIFEST_STAFF: Access to loads, check-ins, and basic reporting',
      'COACH: Access to their students and coaching modules',
      'ATHLETE: Access to their profile, bookings, and wallet',
      'Assign or revoke roles from Users page',
      'Changes take effect immediately'
    ],
    rolesAllowed: ['DZ_MANAGER'],
    routeReference: '/settings/roles',
    relatedActions: ['assign-role', 'revoke-role', 'edit-permissions'],
    keywords: ['role', 'permissions', 'access', 'management', 'security'],
    module: 'core'
  },
  {
    id: 'article-8',
    slug: 'offline-mode-sync',
    category: 'offline-mode',
    title: 'Offline Mode and Data Synchronization',
    shortAnswer: 'SkyLara works offline and automatically syncs when connection is restored.',
    detailedSteps: [
      'Enable offline mode in app settings (mobile only)',
      'SkyLara caches essential data locally on your device',
      'Continue check-ins and load management without internet',
      'All changes are queued for synchronization',
      'When connection is restored, sync begins automatically',
      'Conflicts are highlighted for manual resolution',
      'Monitor sync status in the status bar'
    ],
    rolesAllowed: ['MANIFEST_STAFF', 'DZ_MANAGER'],
    routeReference: '/settings/offline',
    relatedActions: ['enable-offline', 'sync-data', 'resolve-conflicts'],
    keywords: ['offline', 'sync', 'internet', 'connection', 'mobile', 'data'],
    module: 'sync'
  },
  {
    id: 'article-9',
    slug: 'reports-and-analytics',
    category: 'reports',
    title: 'Generating Reports and Analytics',
    shortAnswer: 'View operational metrics and generate reports for compliance and analysis.',
    detailedSteps: [
      'Open Reports from the main menu',
      'Select report type (Jump Activity, Revenue, Safety, Compliance)',
      'Choose date range and filters (load, jumper, instructor)',
      'Click "Generate Report"',
      'Review data in table and chart format',
      'Export to PDF or CSV for external use',
      'Schedule recurring reports if needed'
    ],
    rolesAllowed: ['DZ_MANAGER', 'COACH'],
    routeReference: '/reports/analytics',
    relatedActions: ['create-report', 'export-data', 'schedule-report'],
    keywords: ['report', 'analytics', 'data', 'metrics', 'export', 'compliance'],
    module: 'reporting'
  },
  {
    id: 'article-10',
    slug: 'user-account-settings',
    category: 'getting-started',
    title: 'Managing Your Account Settings',
    shortAnswer: 'Update your profile, password, and notification preferences.',
    detailedSteps: [
      'Click your profile icon in the top right',
      'Select "Account Settings"',
      'Update personal information (name, email, phone)',
      'Change password by clicking "Change Password"',
      'Configure notification preferences (push, email, SMS)',
      'Set language and timezone preferences',
      'Save changes'
    ],
    rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'COACH', 'ATHLETE'],
    routeReference: '/settings/account',
    relatedActions: ['update-profile', 'change-password', 'notification-settings'],
    keywords: ['account', 'settings', 'profile', 'password', 'preferences'],
    module: 'core'
  }
];

const FEATURE_REGISTRY: FeatureRegistryEntry[] = [
  {
    id: 'feat-1',
    featureName: 'Manifest Board',
    description: 'Real-time load manifest with jumper assignments and slot management',
    module: 'manifest',
    route: '/manifest/board',
    rolesRequired: ['DZ_MANAGER', 'MANIFEST_STAFF'],
    status: 'available',
    helpArticleId: 'article-2'
  },
  {
    id: 'feat-2',
    featureName: 'QR Check-In',
    description: 'Mobile QR code scanning for fast athlete check-in',
    module: 'checkin',
    route: '/checkin/qr',
    rolesRequired: ['MANIFEST_STAFF', 'DZ_MANAGER'],
    status: 'available',
    helpArticleId: 'article-3'
  },
  {
    id: 'feat-3',
    featureName: 'Wallet and Tickets',
    description: 'Credit-based booking system with payment integration',
    module: 'wallet',
    route: '/wallet',
    rolesRequired: ['ATHLETE', 'COACH'],
    status: 'available',
    helpArticleId: 'article-4'
  },
  {
    id: 'feat-4',
    featureName: 'Gear Management',
    description: 'Track gear inventory, inspections, and maintenance schedules',
    module: 'gear',
    route: '/gear/management',
    rolesRequired: ['DZ_MANAGER', 'MANIFEST_STAFF'],
    status: 'available',
    helpArticleId: 'article-5'
  },
  {
    id: 'feat-5',
    featureName: 'Incident Reporting',
    description: 'Comprehensive incident and safety event tracking',
    module: 'incidents',
    route: '/incidents/report',
    rolesRequired: ['DZ_MANAGER', 'MANIFEST_STAFF', 'ATHLETE', 'COACH'],
    status: 'available',
    helpArticleId: 'article-6'
  },
  {
    id: 'feat-6',
    featureName: 'Role Management',
    description: 'Configure user roles and permission levels',
    module: 'core',
    route: '/settings/roles',
    rolesRequired: ['DZ_MANAGER'],
    status: 'available',
    helpArticleId: 'article-7'
  },
  {
    id: 'feat-7',
    featureName: 'Offline Sync',
    description: 'Offline operation with automatic data synchronization',
    module: 'sync',
    route: '/settings/offline',
    rolesRequired: ['MANIFEST_STAFF', 'DZ_MANAGER'],
    status: 'available',
    helpArticleId: 'article-8'
  },
  {
    id: 'feat-8',
    featureName: 'Reports and Analytics',
    description: 'Generate operational, financial, and compliance reports',
    module: 'reporting',
    route: '/reports/analytics',
    rolesRequired: ['DZ_MANAGER', 'COACH'],
    status: 'available',
    helpArticleId: 'article-9'
  },
  {
    id: 'feat-9',
    featureName: 'Waiver Management',
    description: 'Digital waiver signing and compliance tracking',
    module: 'compliance',
    route: '/compliance/waivers',
    rolesRequired: ['DZ_MANAGER', 'MANIFEST_STAFF'],
    status: 'available'
  },
  {
    id: 'feat-10',
    featureName: 'Coaching Sessions',
    description: 'Schedule and manage coaching sessions for students',
    module: 'coaching',
    route: '/coaching/sessions',
    rolesRequired: ['COACH'],
    status: 'available'
  },
  {
    id: 'feat-11',
    featureName: 'Advanced Weather Integration',
    description: 'Real-time weather data and wind alerts',
    module: 'operations',
    route: '/operations/weather',
    rolesRequired: ['DZ_MANAGER'],
    status: 'coming-soon'
  },
  {
    id: 'feat-12',
    featureName: 'Predictive Analytics',
    description: 'ML-powered forecasting for jump demand and revenue',
    module: 'analytics',
    route: '/analytics/predictive',
    rolesRequired: ['DZ_MANAGER'],
    status: 'coming-soon'
  },
  {
    id: 'feat-13',
    featureName: 'Video Integration',
    description: 'Jump video upload, sharing, and archival',
    module: 'media',
    route: '/media/videos',
    rolesRequired: ['ATHLETE', 'COACH'],
    status: 'coming-soon'
  },
  {
    id: 'feat-14',
    featureName: 'Advanced Scheduling',
    description: 'Automated jump slot scheduling based on preferences',
    module: 'booking',
    route: '/booking/smart-schedule',
    rolesRequired: ['ATHLETE'],
    status: 'coming-soon'
  },
  {
    id: 'feat-15',
    featureName: 'Integration Marketplace',
    description: 'Third-party integrations for accounting, CRM, and more',
    module: 'integrations',
    route: '/integrations/marketplace',
    rolesRequired: ['DZ_MANAGER'],
    status: 'not-available'
  }
];

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search the knowledge base for articles matching a query.
 * Searches title, keywords, shortAnswer, and module fields.
 * Optionally filters by role access.
 */
export function searchKnowledgeBase(
  query: string,
  role?: string
): KnowledgeSearchResult {
  const lowerQuery = query.toLowerCase();

  let results = HELP_ARTICLES.filter((article) => {
    // Check if user's role has access
    if (role && !article.rolesAllowed.includes(role)) {
      return false;
    }

    // Search in multiple fields
    return (
      article.title.toLowerCase().includes(lowerQuery) ||
      article.shortAnswer.toLowerCase().includes(lowerQuery) ||
      article.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery)) ||
      article.module.toLowerCase().includes(lowerQuery) ||
      article.relatedActions.some((action) =>
        action.toLowerCase().includes(lowerQuery)
      )
    );
  });

  // Score results by relevance (title matches first, then keywords, then content)
  results = results.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 2 : 0;
    const aKeywords = a.keywords.some((kw) =>
      kw.toLowerCase().includes(lowerQuery)
    )
      ? 1
      : 0;
    const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 2 : 0;
    const bKeywords = b.keywords.some((kw) =>
      kw.toLowerCase().includes(lowerQuery)
    )
      ? 1
      : 0;

    return bTitle + bKeywords - (aTitle + aKeywords);
  });

  return {
    articles: results,
    features: [],
    totalResults: results.length
  };
}

/**
 * Look up a feature by exact name match.
 * Returns the feature entry if found, undefined otherwise.
 */
export function lookupFeature(featureName: string): FeatureRegistryEntry | undefined {
  return FEATURE_REGISTRY.find(
    (feature) =>
      feature.featureName.toLowerCase() ===
      featureName.toLowerCase()
  );
}

/**
 * Search the feature registry for features matching a query.
 * Searches featureName, description, and module.
 * Optionally filters by availability status.
 */
export function searchFeatures(
  query: string,
  status?: 'available' | 'coming-soon' | 'not-available'
): FeatureRegistryEntry[] {
  const lowerQuery = query.toLowerCase();

  return FEATURE_REGISTRY.filter((feature) => {
    // Filter by status if provided
    if (status && feature.status !== status) {
      return false;
    }

    // Search in multiple fields
    return (
      feature.featureName.toLowerCase().includes(lowerQuery) ||
      feature.description.toLowerCase().includes(lowerQuery) ||
      feature.module.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get all features available to a specific role.
 */
export function getFeaturesForRole(role: string): FeatureRegistryEntry[] {
  return FEATURE_REGISTRY.filter((feature) =>
    feature.rolesRequired.includes(role)
  );
}

/**
 * Get all available features (status = 'available').
 */
export function getAvailableFeatures(): FeatureRegistryEntry[] {
  return FEATURE_REGISTRY.filter((feature) => feature.status === 'available');
}

/**
 * Get all coming-soon features.
 */
export function getComingSoonFeatures(): FeatureRegistryEntry[] {
  return FEATURE_REGISTRY.filter((feature) => feature.status === 'coming-soon');
}

/**
 * Get a help article by slug.
 */
export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.slug === slug);
}

/**
 * Get all help articles for a specific category.
 */
export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.category === category);
}
