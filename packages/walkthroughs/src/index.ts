// ============================================================================
// WALKTHROUGHS AND GUIDED TOURS TYPES
// ============================================================================

export interface WalkthroughStep {
  id: string;
  targetSelector: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  route: string; // Route where this step occurs
  action?: string; // Optional action label (e.g., "Click Submit")
  helpArticleSlug?: string; // Reference to knowledge base article
}

export interface WalkthroughTour {
  id: string;
  slug: string;
  role: string; // DZ_MANAGER | MANIFEST_STAFF | COACH | ATHLETE
  title: string;
  description: string;
  steps: WalkthroughStep[];
  isActive: boolean;
  sortOrder: number;
  estimatedMinutes: number;
}

// ============================================================================
// DZ MANAGER TOUR (6 steps)
// Dashboard → Manifest → Athletes → Gear → Reports → Settings
// ============================================================================

export const DZ_MANAGER_TOUR: WalkthroughTour = {
  id: 'tour-dz-manager',
  slug: 'dz-manager-intro',
  role: 'DZ_MANAGER',
  title: 'DZ Manager Quick Start',
  description: 'Learn the essential features for managing your dropzone operations',
  estimatedMinutes: 8,
  isActive: true,
  sortOrder: 1,
  steps: [
    {
      id: 'dz-step-1',
      targetSelector: '[data-tour="dashboard-summary"]',
      title: 'Welcome to Your Dashboard',
      description:
        'This is your command center. View key metrics like today\'s jump count, revenue, and system status. Updates in real-time throughout the day.',
      position: 'bottom',
      route: '/dashboard',
      action: 'Next Step'
    },
    {
      id: 'dz-step-2',
      targetSelector: '[data-tour="manifest-board-link"]',
      title: 'Access the Manifest Board',
      description:
        'Click here to open the manifest board. This is where you manage all loads, assign jumpers, and coordinate operations on jump days.',
      position: 'right',
      route: '/dashboard',
      action: 'Go to Manifest'
    },
    {
      id: 'dz-step-3',
      targetSelector: '[data-tour="manifest-board"]',
      title: 'The Manifest Board',
      description:
        'All active and upcoming loads are listed here. Add jumpers, assign slots, and lock loads when ready. The board updates in real-time as check-ins happen.',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Review Loads',
      helpArticleSlug: 'manifest-board-guide'
    },
    {
      id: 'dz-step-4',
      targetSelector: '[data-tour="athletes-page"]',
      title: 'Manage Your Athletes',
      description:
        'View all jumpers in your system, manage their profiles, track certifications, and manage roles. Athletes can also be coaches or staff members.',
      position: 'bottom',
      route: '/athletes',
      action: 'View Athletes'
    },
    {
      id: 'dz-step-5',
      targetSelector: '[data-tour="gear-management"]',
      title: 'Gear Inventory and Checks',
      description:
        'Track all gear including parachutes, helmets, and altimeters. Record inspections, maintenance, and track repack dates to ensure safety compliance.',
      position: 'bottom',
      route: '/gear/management',
      action: 'Manage Gear',
      helpArticleSlug: 'gear-check-requirements'
    },
    {
      id: 'dz-step-6',
      targetSelector: '[data-tour="settings-sidebar"]',
      title: 'Configuration and Reports',
      description:
        'Settings let you configure dropzones, aircraft, staff roles, and waivers. Reports provide analytics on operations, revenue, and safety metrics.',
      position: 'right',
      route: '/settings',
      action: 'Complete Setup'
    }
  ]
};

// ============================================================================
// MANIFEST STAFF TOUR (5 steps)
// Manifest Board → Add Load → Add Jumper → Lock Load → Check-in
// ============================================================================

export const MANIFEST_STAFF_TOUR: WalkthroughTour = {
  id: 'tour-manifest-staff',
  slug: 'manifest-staff-intro',
  role: 'MANIFEST_STAFF',
  title: 'Manifest Staff Quick Start',
  description: 'Master the daily operations workflow for managing loads and check-ins',
  estimatedMinutes: 6,
  isActive: true,
  sortOrder: 2,
  steps: [
    {
      id: 'manifest-step-1',
      targetSelector: '[data-tour="manifest-board"]',
      title: 'The Manifest Board',
      description:
        'All loads are displayed here with current capacity and assignments. This is your main workspace for daily operations.',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Next'
    },
    {
      id: 'manifest-step-2',
      targetSelector: '[data-tour="add-load-button"]',
      title: 'Create a New Load',
      description:
        'Click to schedule a new jump load. Select aircraft, pilot, and time. Loads start in OPEN status and fill throughout the day.',
      position: 'right',
      route: '/manifest/board',
      action: 'Add Load',
      helpArticleSlug: 'manifest-board-guide'
    },
    {
      id: 'manifest-step-3',
      targetSelector: '[data-tour="add-jumper-button"]',
      title: 'Add Jumpers to a Load',
      description:
        'Click to add a jumper. Assign their slot type (FUN, TANDEM, AFF, etc.), weight, and exit order. Verify their waivers are signed.',
      position: 'right',
      route: '/manifest/board',
      action: 'Add Jumper'
    },
    {
      id: 'manifest-step-4',
      targetSelector: '[data-tour="lock-load-button"]',
      title: 'Lock the Load',
      description:
        'Once the load is full or ready for boarding, lock it. This prevents additional changes and marks it ready for briefing.',
      position: 'right',
      route: '/manifest/board',
      action: 'Lock Load'
    },
    {
      id: 'manifest-step-5',
      targetSelector: '[data-tour="qr-checkin"]',
      title: 'QR Check-In Process',
      description:
        'Athletes scan their QR code at check-in. The system verifies them and marks them checked-in. This happens on tablet at the check-in station.',
      position: 'bottom',
      route: '/checkin/qr',
      action: 'Complete',
      helpArticleSlug: 'qr-checkin-process'
    }
  ]
};

// ============================================================================
// COACH TOUR (4 steps)
// Schedule → Students → Sessions → Reports
// ============================================================================

export const COACH_TOUR: WalkthroughTour = {
  id: 'tour-coach',
  slug: 'coach-intro',
  role: 'COACH',
  title: 'Coach Quick Start',
  description: 'Learn how to manage your students and coaching sessions',
  estimatedMinutes: 5,
  isActive: true,
  sortOrder: 3,
  steps: [
    {
      id: 'coach-step-1',
      targetSelector: '[data-tour="schedule-section"]',
      title: 'View Your Schedule',
      description:
        'See all scheduled jumps and coaching sessions. Plan your day and know when your students are jumping.',
      position: 'bottom',
      route: '/coaching/schedule',
      action: 'Next'
    },
    {
      id: 'coach-step-2',
      targetSelector: '[data-tour="students-list"]',
      title: 'Manage Your Students',
      description:
        'View all your students here. Track their certification levels, jump history, and progress. Send messages and coaching feedback.',
      position: 'bottom',
      route: '/coaching/students',
      action: 'View Students'
    },
    {
      id: 'coach-step-3',
      targetSelector: '[data-tour="sessions-tab"]',
      title: 'Create Coaching Sessions',
      description:
        'Schedule individual coaching sessions with your students. Track jump progression and record feedback for each session.',
      position: 'bottom',
      route: '/coaching/sessions',
      action: 'Schedule Session'
    },
    {
      id: 'coach-step-4',
      targetSelector: '[data-tour="coaching-reports"]',
      title: 'Generate Reports',
      description:
        'Create reports on your students\' progress, certifications, and jump statistics. Export for records or share with management.',
      position: 'bottom',
      route: '/coaching/reports',
      action: 'Complete Setup'
    }
  ]
};

// ============================================================================
// ATHLETE TOUR (4 steps)
// Profile/QR → Book Jump → Wallet → Emergency Card
// ============================================================================

export const ATHLETE_TOUR: WalkthroughTour = {
  id: 'tour-athlete',
  slug: 'athlete-intro',
  role: 'ATHLETE',
  title: 'Athlete Quick Start',
  description: 'Get ready for your first jump with SkyLara',
  estimatedMinutes: 4,
  isActive: true,
  sortOrder: 4,
  steps: [
    {
      id: 'athlete-step-1',
      targetSelector: '[data-tour="profile-qr"]',
      title: 'Your QR Code',
      description:
        'This is your personal QR code. Display it at check-in or share it with staff. It verifies your identity and booking status.',
      position: 'bottom',
      route: '/profile',
      action: 'Next',
      helpArticleSlug: 'qr-checkin-process'
    },
    {
      id: 'athlete-step-2',
      targetSelector: '[data-tour="book-jump-button"]',
      title: 'Book Your First Jump',
      description:
        'Click here to book a jump. Choose your load, confirm your slot assignment, and make sure your waivers are signed.',
      position: 'right',
      route: '/booking',
      action: 'Book Jump'
    },
    {
      id: 'athlete-step-3',
      targetSelector: '[data-tour="wallet-balance"]',
      title: 'Your Wallet',
      description:
        'Your wallet shows available credits. Purchase jump tickets or credits to book jumps. Track your balance and transaction history.',
      position: 'bottom',
      route: '/wallet',
      action: 'View Wallet',
      helpArticleSlug: 'wallet-credit-system'
    },
    {
      id: 'athlete-step-4',
      targetSelector: '[data-tour="emergency-card"]',
      title: 'Emergency Information',
      description:
        'Update your emergency contact and medical information. This card is critical for safety and will be available in case of emergency.',
      position: 'bottom',
      route: '/profile/emergency',
      action: 'Complete Setup'
    }
  ]
};

// ============================================================================
// TOUR REGISTRY AND LOOKUP FUNCTIONS
// ============================================================================

const ALL_TOURS: WalkthroughTour[] = [
  DZ_MANAGER_TOUR,
  MANIFEST_STAFF_TOUR,
  COACH_TOUR,
  ATHLETE_TOUR
];

/**
 * Get a tour by slug.
 */
export function getTourBySlug(slug: string): WalkthroughTour | undefined {
  return ALL_TOURS.find((tour) => tour.slug === slug);
}

/**
 * Get a tour by role.
 */
export function getTourByRole(role: string): WalkthroughTour | undefined {
  return ALL_TOURS.find((tour) => tour.role === role);
}

/**
 * Get all active tours.
 */
export function getActiveTours(): WalkthroughTour[] {
  return ALL_TOURS.filter((tour) => tour.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get a specific step within a tour.
 */
export function getTourStep(
  tourSlug: string,
  stepId: string
): WalkthroughStep | undefined {
  const tour = getTourBySlug(tourSlug);
  return tour?.steps.find((step) => step.id === stepId);
}

/**
 * Get the next step in a tour.
 */
export function getNextStep(
  tourSlug: string,
  currentStepId: string
): WalkthroughStep | undefined {
  const tour = getTourBySlug(tourSlug);
  if (!tour) return undefined;

  const currentIndex = tour.steps.findIndex((step) => step.id === currentStepId);
  if (currentIndex === -1 || currentIndex === tour.steps.length - 1) {
    return undefined; // No next step
  }

  return tour.steps[currentIndex + 1];
}

/**
 * Get the previous step in a tour.
 */
export function getPreviousStep(
  tourSlug: string,
  currentStepId: string
): WalkthroughStep | undefined {
  const tour = getTourBySlug(tourSlug);
  if (!tour) return undefined;

  const currentIndex = tour.steps.findIndex((step) => step.id === currentStepId);
  if (currentIndex <= 0) {
    return undefined; // No previous step
  }

  return tour.steps[currentIndex - 1];
}

/**
 * Get all steps for a tour.
 */
export function getTourSteps(tourSlug: string): WalkthroughStep[] {
  const tour = getTourBySlug(tourSlug);
  return tour?.steps || [];
}

/**
 * Get the first step of a tour.
 */
export function getFirstStep(tourSlug: string): WalkthroughStep | undefined {
  const tour = getTourBySlug(tourSlug);
  return tour?.steps[0];
}

/**
 * Get the last step of a tour.
 */
export function getLastStep(tourSlug: string): WalkthroughStep | undefined {
  const tour = getTourBySlug(tourSlug);
  return tour?.steps[tour.steps.length - 1];
}

/**
 * Get the step number (1-indexed) for a given step ID.
 */
export function getStepNumber(tourSlug: string, stepId: string): number | undefined {
  const tour = getTourBySlug(tourSlug);
  if (!tour) return undefined;

  const index = tour.steps.findIndex((step) => step.id === stepId);
  return index === -1 ? undefined : index + 1;
}

/**
 * Calculate progress through a tour.
 */
export function calculateProgress(
  tourSlug: string,
  currentStepId: string
): {
  current: number;
  total: number;
  percentage: number;
} {
  const tour = getTourBySlug(tourSlug);
  if (!tour) {
    return { current: 0, total: 0, percentage: 0 };
  }

  const currentIndex = tour.steps.findIndex((step) => step.id === currentStepId);
  const current = currentIndex === -1 ? 0 : currentIndex + 1;
  const total = tour.steps.length;
  const percentage = Math.round((current / total) * 100);

  return { current, total, percentage };
}

/**
 * Check if a tour is completed (all steps viewed).
 */
export function isTourCompleted(
  tourSlug: string,
  viewedStepIds: Set<string>
): boolean {
  const tour = getTourBySlug(tourSlug);
  if (!tour) return false;

  return tour.steps.every((step) => viewedStepIds.has(step.id));
}

/**
 * Get recommended tours for a user with a specific role.
 * Returns the primary tour for the role plus any supplementary ones.
 */
export function getRecommendedToursForRole(role: string): WalkthroughTour[] {
  const primaryTour = getTourByRole(role);
  return primaryTour ? [primaryTour] : [];
}
