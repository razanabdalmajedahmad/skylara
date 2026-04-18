/**
 * PHASE 7: DEMO STATE CONFIGURATION
 * Role-specific demo configurations and scenario flows
 */

export interface DemoAlert {
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
}

export interface DemoRoleConfig {
  email: string;
  name: string;
  greeting: string;
  alerts: DemoAlert[];
  quickActions: string[];
  showTourPrompt: boolean;
  tourSlug: string;
}

export interface DemoScenarioStep {
  title: string;
  description: string;
  action: string;
  expectedResult: string;
}

export interface DemoScenario {
  name: string;
  role: string;
  description: string;
  steps: DemoScenarioStep[];
  estimatedTime: string;
}

/**
 * Role-specific demo configurations
 */
export const DEMO_ROLES: Record<string, DemoRoleConfig> = {
  DZ_MANAGER: {
    email: 'admin@skylara.dev',
    name: 'Ali Kwika',
    greeting: 'Welcome back, Ali. Your DZ is running smoothly.',
    alerts: [
      {
        type: 'info',
        message: 'Load 1 is filling — 8/15 slots',
      },
      {
        type: 'warning',
        message: 'Wind picking up: 18 knots gusting 22',
      },
      {
        type: 'success',
        message: 'Revenue today: $4,250',
      },
    ],
    quickActions: [
      'View Manifest',
      'Check Weather',
      'Review Reports',
      'Manage Staff',
    ],
    showTourPrompt: true,
    tourSlug: 'dz-manager-tour',
  },

  MANIFEST_STAFF: {
    email: 'manifest@skylara.dev',
    name: 'Sarah Chen',
    greeting: 'Good morning, Sarah. 3 loads active.',
    alerts: [
      {
        type: 'info',
        message: 'Load 2 needs 2 more jumpers',
      },
      {
        type: 'warning',
        message:
          'Athlete #15 waiver expired — blocked from manifest',
      },
    ],
    quickActions: [
      'Open Manifest',
      'Check In Athletes',
      'View Waitlist',
    ],
    showTourPrompt: true,
    tourSlug: 'manifest-staff-tour',
  },

  COACH: {
    email: 'coach1@skylara.dev',
    name: 'Alex Kim',
    greeting: 'Hey Alex. You have 2 sessions today.',
    alerts: [
      {
        type: 'info',
        message: 'AFF Level 3 student on Load 2',
      },
    ],
    quickActions: [
      'My Schedule',
      'View Students',
      'Log Session',
    ],
    showTourPrompt: true,
    tourSlug: 'coach-tour',
  },

  ATHLETE: {
    email: 'athlete1@skylara.dev',
    name: 'Jordan Hayes',
    greeting: 'Welcome to SkyHigh DZ, Jordan!',
    alerts: [
      {
        type: 'success',
        message: 'Wallet balance: $275.00',
      },
      {
        type: 'info',
        message: 'Next jump: Load 1, Slot 5',
      },
    ],
    quickActions: [
      'Show QR',
      'View Loads',
      'My Logbook',
      'Emergency Card',
    ],
    showTourPrompt: true,
    tourSlug: 'athlete-tour',
  },
};

/**
 * Demo scenarios for each role
 */
export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  'dz-manager-full-day': {
    name: 'Full Day DZ Manager',
    role: 'DZ_MANAGER',
    description:
      'Experience a typical day managing your dropzone from opening to closing',
    steps: [
      {
        title: 'Morning Briefing',
        description:
          'Check weather, aircraft status, and staff availability',
        action: 'Go to Dashboard',
        expectedResult:
          'See KPIs: active loads, revenue, weather, and staff status',
      },
      {
        title: 'Create First Load',
        description: 'Create a load with the Cessna 208 for 9:00 AM',
        action: 'Click "Create Load" on Manifest Board',
        expectedResult:
          'New load appears with status OPEN and 15 available slots',
      },
      {
        title: 'Add Jumpers',
        description: 'Search and add athletes to fill the load',
        action: 'Click slots and search for athletes by name or scan QR',
        expectedResult:
          'Athletes appear in slots, load fills to 12/15 capacity',
      },
      {
        title: 'Lock and Verify',
        description: 'Verify waivers and check center of gravity',
        action: 'Click "Lock Load" button',
        expectedResult:
          'Load transitions to LOCKED status after CG and waiver checks',
      },
      {
        title: 'Check-in Athletes',
        description:
          'Scan athletes into boarding queue as they arrive',
        action: 'Go to Check-In, scan QR codes',
        expectedResult:
          'Athletes move to CHECKED_IN status, appear in boarding list',
      },
      {
        title: 'Monitor Flight',
        description: 'Track load status as it boards, launches, and lands',
        action: 'Watch Manifest Board updates',
        expectedResult:
          'Load progresses through BOARDING -> AIRBORNE -> LANDED',
      },
      {
        title: 'Review Revenue',
        description:
          'Check revenue and jump credits collected for the day',
        action: 'Go to Reports Dashboard',
        expectedResult:
          'See daily revenue breakdown, jumper stats, and aircraft utilization',
      },
      {
        title: 'Manage Staff',
        description: 'View staff assignments, set permissions, manage roles',
        action: 'Go to Settings > Staff Management',
        expectedResult:
          'See all staff members, their roles, and can adjust permissions',
      },
    ],
    estimatedTime: '15 minutes',
  },

  'manifest-staff-load-cycle': {
    name: 'Load Cycle - Manifest Staff',
    role: 'MANIFEST_STAFF',
    description:
      'Experience the full cycle of creating, manifesting, and closing a load',
    steps: [
      {
        title: 'Create Load',
        description: 'Create a new load for the Cessna 208',
        action: 'Click "New Load" on Manifest Board',
        expectedResult: 'Load form opens with aircraft and time selection',
      },
      {
        title: 'Set Details',
        description:
          'Choose aircraft, exit time, and door configuration',
        action: 'Select Cessna 208, set exit time to 10:30 AM',
        expectedResult: 'Load is created and appears on board with OPEN status',
      },
      {
        title: 'Add First Jumper',
        description:
          'Search for an athlete to add to the load',
        action: 'Click first empty slot, search "Jordan"',
        expectedResult:
          'Jordan Hayes appears in search results, click to add',
      },
      {
        title: 'Scan QR Code',
        description:
          'Use QR scanner for faster athlete identification',
        action: 'Click "Scan QR" and scan an athlete code',
        expectedResult:
          'Athlete is instantly identified and added to next available slot',
      },
      {
        title: 'Add Group',
        description: 'Manifest a team of jumpers together',
        action: 'Click "Add Group", select an existing group',
        expectedResult:
          'All group members are added to consecutive or custom slots',
      },
      {
        title: 'Lock Load',
        description:
          'Verify waivers and CG before locking for boarding',
        action: 'Click "Lock Load" button',
        expectedResult:
          'System checks all waivers, calculates CG, transitions to LOCKED',
      },
      {
        title: 'Check In Athletes',
        description:
          'Process check-in as athletes arrive at the DZ',
        action: 'Go to Check-In, scan or search each athlete',
        expectedResult:
          'Athletes move to CHECKED_IN status, are ready to board',
      },
      {
        title: 'Board Load',
        description: 'Update load status as athletes board aircraft',
        action: 'Click "Board" on the load',
        expectedResult:
          'Load status changes to BOARDING, athletes board in order',
      },
      {
        title: 'Launch and Track',
        description:
          'Monitor load status as it launches and returns',
        action: 'Watch board updates',
        expectedResult:
          'Load transitions BOARDING -> AIRBORNE -> LANDED automatically',
      },
    ],
    estimatedTime: '12 minutes',
  },

  'coach-student-progression': {
    name: 'Coach Student Progression',
    role: 'COACH',
    description: 'Guide a student through AFF progression and skill sign-offs',
    steps: [
      {
        title: 'View Schedule',
        description: 'Check your assigned coaching sessions for today',
        action: 'Go to Coach Dashboard',
        expectedResult:
          'See 2 scheduled coaching sessions with student names',
      },
      {
        title: 'View Students',
        description: 'See all your assigned students and their progress',
        action: 'Click "My Students"',
        expectedResult:
          'List shows student names, levels, jump counts, and last training date',
      },
      {
        title: 'Check Assignments',
        description: 'See which students are assigned to which loads',
        action: 'Click a student name',
        expectedResult:
          'Student detail shows: level, skills completed, next goals, assigned loads',
      },
      {
        title: 'Log Session',
        description: 'Record a coaching session after jumping',
        action: 'Click "Log Session" for a student',
        expectedResult: 'Session form opens with date, load, and skills fields',
      },
      {
        title: 'Sign Off Skills',
        description: 'Mark completed skills and progression',
        action:
          'Check boxes for skills: "Stable exit", "Body position", "Tracking"',
        expectedResult: 'Skills are marked complete, student progresses to next level',
      },
      {
        title: 'Add Notes',
        description:
          'Document coaching feedback and student performance',
        action: 'Enter notes about student performance and improvements',
        expectedResult: 'Notes are saved and visible in student history',
      },
      {
        title: 'View Student Report',
        description: 'See your coaching statistics and effectiveness',
        action: 'Go to Coach Reports',
        expectedResult:
          'See hours logged, students trained, skill completion rates, ratings',
      },
    ],
    estimatedTime: '10 minutes',
  },

  'athlete-first-jump': {
    name: 'First Time Jumper',
    role: 'ATHLETE',
    description:
      'Experience booking your first jump from profile setup to boarding',
    steps: [
      {
        title: 'Complete Profile',
        description: 'Set up your athlete profile with certifications',
        action: 'Go to Profile Settings',
        expectedResult:
          'See fields for jump count, certification, emergency contacts',
      },
      {
        title: 'View QR Code',
        description:
          'Generate and display your unique athlete QR code',
        action: 'Click "Show My QR Code"',
        expectedResult:
          'Your personal QR code displays, screenshot for offline use',
      },
      {
        title: 'Update Emergency Info',
        description:
          'Add medical info and emergency contacts for safety',
        action: 'Go to Emergency Card',
        expectedResult:
          'Emergency card shows blood type, allergies, medications, contacts',
      },
      {
        title: 'Check Wallet',
        description: 'View your jump credits and payment options',
        action: 'Go to Wallet',
        expectedResult:
          'See credit balance, transaction history, package options',
      },
      {
        title: 'Buy Tickets',
        description: 'Purchase jump ticket package to save money',
        action: 'Click "Buy Tickets", select 10-pack',
        expectedResult:
          'See 15% discount pricing, checkout, payment confirmation',
      },
      {
        title: 'View Available Loads',
        description:
          'Browse loads available for booking today',
        action: 'Go to Manifest Board',
        expectedResult: 'See open loads with aircraft, time, and available slots',
      },
      {
        title: 'Self-Manifest',
        description:
          'Book yourself on a load and secure a slot',
        action: 'Click open load, click empty slot, confirm',
        expectedResult:
          'Your name appears in the slot, load shows you as ASSIGNED',
      },
      {
        title: 'Prepare for Jump',
        description: 'Review your gear and get checked in',
        action: 'Go to Gear Check station',
        expectedResult:
          'Gear inspector checks your rig, reserves, AAD, approves with checkmark',
      },
      {
        title: 'Check In',
        description:
          'Scan your QR code to check into boarding',
        action: 'Show your QR to staff or scan at check-in',
        expectedResult:
          'You move to CHECKED_IN status, appear in boarding queue',
      },
      {
        title: 'Review Logbook',
        description:
          'After the jump, see it recorded in your logbook',
        action: 'Go to Logbook',
        expectedResult:
          'Jump appears with date, aircraft, altitude, and jump stats',
      },
    ],
    estimatedTime: '18 minutes',
  },
};

/**
 * Get demo config for a role
 */
export function getDemoConfig(role: string): DemoRoleConfig | null {
  return DEMO_ROLES[role] || null;
}

/**
 * Get demo scenario by ID
 */
export function getDemoScenario(scenarioId: string): DemoScenario | null {
  return DEMO_SCENARIOS[scenarioId] || null;
}

/**
 * Get all scenarios for a role
 */
export function getDemoScenariosForRole(role: string): DemoScenario[] {
  return Object.values(DEMO_SCENARIOS).filter(
    (scenario) => scenario.role === role
  );
}

/**
 * Get all available demo roles
 */
export function getAvailableDemoRoles(): string[] {
  return Object.keys(DEMO_ROLES);
}

/**
 * Get all demo scenarios
 */
export function getAllDemoScenarios(): DemoScenario[] {
  return Object.values(DEMO_SCENARIOS);
}

/**
 * Helper: Format scenario for display
 */
export function formatScenarioForDisplay(scenario: DemoScenario): {
  id: string;
  title: string;
  role: string;
  description: string;
  stepCount: number;
  estimatedTime: string;
} {
  const id = Object.entries(DEMO_SCENARIOS).find(
    ([_, s]) => s === scenario
  )?.[0] || 'unknown';

  return {
    id,
    title: scenario.name,
    role: scenario.role,
    description: scenario.description,
    stepCount: scenario.steps.length,
    estimatedTime: scenario.estimatedTime,
  };
}

/**
 * Helper: Get demo welcome message
 */
export function getDemoWelcomeMessage(role: string): string {
  const config = getDemoConfig(role);
  if (!config) return 'Welcome to SkyLara Demo';
  return `Welcome back, ${config.name}. ${config.greeting}`;
}

/**
 * Demo setup helper - returns what needs to be initialized
 */
export function getDemoSetupSteps(): string[] {
  return [
    'Initialize demo database with sample data',
    'Load offline help articles and feature registry',
    'Set up demo user accounts for each role',
    'Initialize websocket connections',
    'Load mock aircraft and DZ data',
    'Prepare demo scenario flows',
  ];
}
