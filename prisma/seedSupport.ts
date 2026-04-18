/**
 * PHASE 6: SEED DATA FOR SUPPORT LAYER
 * Seeds help articles, feature registry, idea notes, and guided tours
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID as uuid } from 'crypto';

const prisma = new PrismaClient();

async function seedHelpArticles() {
  console.log('Seeding help articles...');

  const articles = [
    // GETTING STARTED (3)
    {
      slug: 'how-to-log-in-and-switch-roles',
      category: 'GETTING_STARTED',
      title: 'How to log in and switch roles',
      shortAnswer:
        'Log in with your email and password. If you have multiple roles, switch between them from your profile dropdown without logging out.',
      detailedSteps: [
        'Go to the login page and enter your email',
        'Enter your password',
        'Click "Log In"',
        'If you have multiple roles, click your profile icon (top right)',
        'Select "Switch Role" and choose your role',
        'Click "Confirm" to switch',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'COACH', 'ATHLETE'],
      routeReference: '/auth/login',
      relatedActions: [
        'understanding-the-skylara-dashboard',
        'setting-up-your-athlete-profile',
      ],
      keywords: ['login', 'sign in', 'role', 'switch', 'account'],
      module: 'AUTH',
    },
    {
      slug: 'understanding-the-skylara-dashboard',
      category: 'GETTING_STARTED',
      title: 'Understanding the SkyLara dashboard',
      shortAnswer:
        'Your dashboard shows role-specific metrics, alerts, and quick actions. View loads, revenue, athletes, and more depending on your role.',
      detailedSteps: [
        'Log in to SkyLara',
        'Your dashboard loads automatically',
        'Top cards show KPIs (Key Performance Indicators)',
        'Middle section shows active loads and alerts',
        'Bottom section has quick actions buttons',
        'Click any section to dive deeper',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'COACH', 'ATHLETE'],
      routeReference: '/dashboard',
      relatedActions: ['how-to-log-in-and-switch-roles'],
      keywords: ['dashboard', 'home', 'overview', 'kpi', 'metrics'],
      module: 'DASHBOARD',
    },
    {
      slug: 'setting-up-your-athlete-profile',
      category: 'GETTING_STARTED',
      title: 'Setting up your athlete profile',
      shortAnswer:
        'Complete your athlete profile with your jump count, certifications, emergency contacts, and gear preferences.',
      detailedSteps: [
        'Click your profile icon (top right)',
        'Select "Profile Settings"',
        'Fill in your jump count',
        'Select your highest certification level',
        'Add emergency contacts',
        'Save your changes',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/profile',
      relatedActions: ['how-to-log-in-and-switch-roles'],
      keywords: ['profile', 'athlete', 'certification', 'jump count', 'setup'],
      module: 'PROFILE',
    },

    // MANIFEST (4)
    {
      slug: 'how-to-create-and-manage-loads',
      category: 'MANIFEST',
      title: 'How to create and manage loads',
      shortAnswer:
        'Create new loads by selecting an aircraft and setting the exit time. Manage load status from open through completion.',
      detailedSteps: [
        'Go to Manifest Board',
        'Click "Create New Load"',
        'Select aircraft from dropdown',
        'Enter estimated exit time',
        'Choose door configuration',
        'Click "Create Load"',
        'Load is now open for manifest',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/manifest/board',
      relatedActions: [
        'adding-jumpers-to-a-load',
        'understanding-load-status-transitions',
      ],
      keywords: [
        'load',
        'create',
        'aircraft',
        'manifest',
        'manage',
        'exit time',
      ],
      module: 'MANIFEST',
    },
    {
      slug: 'adding-jumpers-to-a-load',
      category: 'MANIFEST',
      title: 'Adding jumpers to a load',
      shortAnswer:
        'Add athletes to load slots by searching, scanning QR codes, or manifesting groups.',
      detailedSteps: [
        'Open a load',
        'Click an empty slot',
        'Search for athlete by name or ID',
        'Or scan their QR code with your device',
        'Or click "Add Group" to manifest a group together',
        'Confirm slot assignment',
        'Repeat until load is full',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/manifest/board',
      relatedActions: [
        'how-to-create-and-manage-loads',
        'group-manifest-manifesting-a-team',
      ],
      keywords: ['jumper', 'athlete', 'slot', 'add', 'manifest', 'QR'],
      module: 'MANIFEST',
    },
    {
      slug: 'group-manifest-manifesting-a-team',
      category: 'MANIFEST',
      title: 'Group manifest: manifesting a team',
      shortAnswer:
        'Manifest entire teams at once using group manifest. Perfect for RW, freefly, or coaching groups.',
      detailedSteps: [
        'Go to Manifest Board',
        'Click "Add Group" button',
        'Select or create a group',
        'Review group members',
        'Select a load',
        'Assign group to consecutive or scattered slots',
        'Confirm manifest',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/manifest/groups',
      relatedActions: ['adding-jumpers-to-a-load'],
      keywords: ['group', 'team', 'manifest', 'RW', 'freefly', 'captain'],
      module: 'MANIFEST',
    },
    {
      slug: 'understanding-load-status-transitions',
      category: 'MANIFEST',
      title: 'Understanding load status transitions',
      shortAnswer:
        'Loads progress through OPEN -> FILLING -> LOCKED -> BOARDING -> AIRBORNE -> LANDED -> COMPLETE.',
      detailedSteps: [
        'OPEN: Load is accepting manifest',
        'FILLING: Manifest has started',
        'LOCKED: No more changes allowed. CG and waiver checks passed',
        'BOARDING: Athletes are boarding aircraft',
        'AIRBORNE: Aircraft is in flight',
        'LANDED: Aircraft has returned',
        'COMPLETE: Load is finalized',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/manifest/board',
      relatedActions: ['how-to-create-and-manage-loads'],
      keywords: ['status', 'transition', 'open', 'locked', 'boarding', 'flow'],
      module: 'MANIFEST',
    },

    // CHECK-IN (2)
    {
      slug: 'how-to-check-in-athletes-at-the-dz',
      category: 'CHECK_IN',
      title: 'How to check in athletes at the DZ',
      shortAnswer:
        'Check in athletes before boarding using the QR scanner or manual search. Verifies waivers and gear.',
      detailedSteps: [
        'Go to Check-In station',
        'Scan athlete QR code or search by name',
        'System verifies waiver status',
        'Confirm gear check completion',
        'Click "Check In" button',
        'Athlete appears in boarding queue',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/checkin',
      relatedActions: ['what-to-do-when-check-in-is-blocked'],
      keywords: ['check-in', 'boarding', 'QR', 'verify', 'waiver', 'gear'],
      module: 'CHECK_IN',
    },
    {
      slug: 'what-to-do-when-check-in-is-blocked',
      category: 'CHECK_IN',
      title: 'What to do when check-in is blocked',
      shortAnswer:
        'Check-in blocks occur when waivers are expired, gear checks failed, or compliance issues exist.',
      detailedSteps: [
        'Attempt to check in athlete',
        'See "Check-in blocked" message',
        'Note the reason (expired waiver, failed gear check, etc.)',
        'Go to athlete profile',
        'Update waiver or gear status',
        'Retry check-in',
        'If still blocked, contact DZ Manager',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/checkin',
      relatedActions: [
        'how-to-check-in-athletes-at-the-dz',
        'understanding-waiver-requirements',
      ],
      keywords: ['blocked', 'check-in', 'waiver', 'gear', 'failed', 'issue'],
      module: 'CHECK_IN',
    },

    // QR (2)
    {
      slug: 'using-qr-codes-for-identity-and-check-in',
      category: 'QR',
      title: 'Using QR codes for identity and check-in',
      shortAnswer:
        'QR codes uniquely identify athletes. Scan at manifest, check-in, gear check, and boarding.',
      detailedSteps: [
        'Each athlete has a personal QR code in their profile',
        'Use a smartphone or dedicated scanner to scan',
        'System instantly recognizes athlete',
        'Use for manifest: scan to add to load',
        'Use for check-in: scan to check in',
        'Use for gear check: scan to record check',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/athlete/qr',
      relatedActions: [
        'generating-and-sharing-your-personal-qr-code',
        'how-to-check-in-athletes-at-the-dz',
      ],
      keywords: ['QR', 'code', 'scan', 'identity', 'athlete', 'verify'],
      module: 'QR',
    },
    {
      slug: 'generating-and-sharing-your-personal-qr-code',
      category: 'QR',
      title: 'Generating and sharing your personal QR code',
      shortAnswer:
        'Your QR code is auto-generated in your profile. Share it with manifest staff, or screenshot it for offline use.',
      detailedSteps: [
        'Log in to SkyLara',
        'Click profile icon',
        'Click "Show QR Code"',
        'Your unique QR code displays',
        'Screenshot it on your phone',
        'Or text the code to staff',
        'Staff can scan anytime at the DZ',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/profile',
      relatedActions: ['using-qr-codes-for-identity-and-check-in'],
      keywords: ['QR', 'code', 'share', 'profile', 'generate', 'athlete'],
      module: 'QR',
    },

    // COMPLIANCE (2)
    {
      slug: 'understanding-waiver-requirements',
      category: 'COMPLIANCE',
      title: 'Understanding waiver requirements',
      shortAnswer:
        'Waivers certify you are legally able to jump. Different waiver types for tandem, AFF, and experienced jumpers.',
      detailedSteps: [
        'New athletes must sign a waiver before first jump',
        'Tandem passengers: sign TANDEM waiver',
        'AFF students: sign AFF waiver',
        'Experienced jumpers: sign EXPERIENCED waiver',
        'Waivers are valid for 12 months',
        'You must renew before they expire',
        'Check your waiver status in your profile',
      ],
      rolesAllowed: ['ATHLETE', 'DZ_MANAGER', 'MANIFEST_STAFF'],
      routeReference: '/athlete/profile',
      relatedActions: ['what-happens-when-a-waiver-expires'],
      keywords: [
        'waiver',
        'signature',
        'legal',
        'compliance',
        'tandem',
        'AFF',
        'expire',
      ],
      module: 'COMPLIANCE',
    },
    {
      slug: 'what-happens-when-a-waiver-expires',
      category: 'COMPLIANCE',
      title: 'What happens when a waiver expires',
      shortAnswer:
        'When your waiver expires, you cannot jump or be manifested. You must sign a new waiver to continue.',
      detailedSteps: [
        'Your waiver expires after 12 months',
        'You receive email reminder 30 days before',
        'System blocks check-in if waiver is expired',
        'You can still access offline content',
        'To jump again, go to your profile',
        'Click "Renew Waiver"',
        'Sign the new waiver and submit',
        'You can manifest again',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/profile',
      relatedActions: ['understanding-waiver-requirements'],
      keywords: [
        'waiver',
        'expire',
        'expired',
        'renew',
        'signature',
        'blocked',
      ],
      module: 'COMPLIANCE',
    },

    // WALLET & TICKETS (3)
    {
      slug: 'how-wallets-and-jump-credits-work',
      category: 'WALLET',
      title: 'How wallets and jump credits work',
      shortAnswer:
        'Your wallet holds jump credits. Pay per jump or buy packages. Credits deduct automatically at manifest.',
      detailedSteps: [
        'View your wallet balance in your profile',
        'Balance shows total jump credits available',
        'Each jump costs a set number of credits',
        'Tandem: 4 credits, AFF: 3 credits, Fun: 2 credits',
        'When you manifest, credits are reserved',
        'Credits deduct after you exit the aircraft',
        'Remaining balance shows in your wallet',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/wallet',
      relatedActions: [
        'purchasing-and-using-jump-tickets',
        'understanding-transaction-history',
      ],
      keywords: ['wallet', 'credits', 'balance', 'jump', 'payment', 'reserve'],
      module: 'WALLET',
    },
    {
      slug: 'purchasing-and-using-jump-tickets',
      category: 'WALLET',
      title: 'Purchasing and using jump tickets',
      shortAnswer:
        'Buy jump tickets in packages to save money. Use tickets instead of credits for discounted rates.',
      detailedSteps: [
        'Go to your wallet',
        'Click "Buy Tickets"',
        'Choose package size (5, 10, or 25 jumps)',
        'Larger packages offer discounts',
        '10-pack: 15% off, 25-pack: 20% off',
        'Enter payment info',
        'Tickets are added to your wallet',
        'Tickets auto-apply before credits',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/wallet',
      relatedActions: [
        'how-wallets-and-jump-credits-work',
        'understanding-transaction-history',
      ],
      keywords: ['ticket', 'purchase', 'package', 'discount', 'payment', 'buy'],
      module: 'WALLET',
    },
    {
      slug: 'understanding-transaction-history',
      category: 'WALLET',
      title: 'Understanding transaction history',
      shortAnswer:
        'Your transaction history shows every credit purchase, deduction, refund, and adjustment.',
      detailedSteps: [
        'Go to your wallet',
        'Click "Transaction History"',
        'See date, type, amount, and balance',
        'CREDIT: You bought or received credits',
        'DEBIT: Credits used for a jump',
        'REFUND: Credits returned (jump cancelled)',
        'FEE: Admin fee or adjustment',
        'Click any row for details',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/wallet',
      relatedActions: [
        'how-wallets-and-jump-credits-work',
        'purchasing-and-using-jump-tickets',
      ],
      keywords: [
        'transaction',
        'history',
        'credit',
        'debit',
        'refund',
        'record',
        'payment',
      ],
      module: 'WALLET',
    },

    // GEAR (2)
    {
      slug: 'gear-check-process-and-requirements',
      category: 'GEAR',
      title: 'Gear check process and requirements',
      shortAnswer:
        'All gear is checked before boarding. Inspection covers main, reserve, AAD, helmet, and altimeter.',
      detailedSteps: [
        'At the DZ, go to gear check station',
        'Lay out your gear for inspection',
        'Inspector checks main parachute',
        'Inspector checks reserve parachute',
        'Inspector checks AAD (Automatic Activation Device)',
        'Inspector checks helmet, altimeter, jumpsuit',
        'Inspector marks pass or fail',
        'You can board if check passes',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/gear/check',
      relatedActions: ['reserve-repack-tracking-and-alerts'],
      keywords: ['gear', 'check', 'inspection', 'parachute', 'AAD', 'pass'],
      module: 'GEAR',
    },
    {
      slug: 'reserve-repack-tracking-and-alerts',
      category: 'GEAR',
      title: 'Reserve repack tracking and alerts',
      shortAnswer:
        'Your reserve must be repacked every 180 days. SkyLara alerts you when repack is due.',
      detailedSteps: [
        'Go to your gear profile',
        'See reserve repack due date',
        'System sends email reminder at 30 days',
        'You cannot jump if reserve is overdue',
        'Contact a rigger to schedule repack',
        'Rigger records repack in SkyLara',
        'Repack status updates automatically',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/gear',
      relatedActions: ['gear-check-process-and-requirements'],
      keywords: ['repack', 'reserve', 'interval', 'due', 'rigger', 'alert'],
      module: 'GEAR',
    },

    // INCIDENTS & EMERGENCY (2)
    {
      slug: 'how-to-report-an-incident',
      category: 'INCIDENTS',
      title: 'How to report an incident',
      shortAnswer:
        'Report accidents or safety concerns immediately. Fill out incident form and notify DZ management.',
      detailedSteps: [
        'Navigate to Incident Reports',
        'Click "Report Incident"',
        'Enter date and time of incident',
        'Describe what happened in detail',
        'Select severity level',
        'List any injuries or damage',
        'Add witness contacts if available',
        'Submit report',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'ATHLETE'],
      routeReference: '/incidents/report',
      relatedActions: ['emergency-profile-and-activation'],
      keywords: ['incident', 'report', 'accident', 'safety', 'injury', 'alert'],
      module: 'INCIDENTS',
    },
    {
      slug: 'emergency-profile-and-activation',
      category: 'INCIDENTS',
      title: 'Emergency profile and activation',
      shortAnswer:
        'Your emergency profile stores medical info accessed in emergencies. Keep it up to date.',
      detailedSteps: [
        'Log in to your profile',
        'Click "Emergency Card"',
        'Enter your blood type',
        'List any allergies',
        'List medications you take',
        'Add emergency contacts',
        'Add insurance info if available',
        'Save your emergency profile',
      ],
      rolesAllowed: ['ATHLETE'],
      routeReference: '/athlete/emergency',
      relatedActions: ['how-to-report-an-incident'],
      keywords: [
        'emergency',
        'profile',
        'medical',
        'blood type',
        'contact',
        'alert',
      ],
      module: 'INCIDENTS',
    },

    // REPORTS (1)
    {
      slug: 'accessing-and-understanding-reports',
      category: 'REPORTS',
      title: 'Accessing and understanding reports',
      shortAnswer:
        'Reports dashboard shows revenue, utilization, safety metrics, and athlete activity.',
      detailedSteps: [
        'Go to Reports tab',
        'Revenue: Total income by date range',
        'Utilization: Aircraft hours and slot fill rate',
        'Safety: Incidents and near-misses',
        'Athletes: New signups and retention',
        'Coaches: Hours logged and students trained',
        'Export reports as CSV or PDF',
      ],
      rolesAllowed: ['DZ_MANAGER'],
      routeReference: '/reports',
      relatedActions: [],
      keywords: ['report', 'analytics', 'revenue', 'utilization', 'metric'],
      module: 'REPORTS',
    },

    // ROLE PERMISSIONS (2)
    {
      slug: 'role-based-access-what-each-role-can-do',
      category: 'ROLES',
      title: 'Role-based access: what each role can do',
      shortAnswer:
        'SkyLara has 4 roles with different permissions. Role determines what you can create, edit, and view.',
      detailedSteps: [
        'DZ_MANAGER: Full access. Manages all DZ operations, staff, and reports',
        'MANIFEST_STAFF: Create and lock loads. Check in athletes. View manifest board',
        'COACH: View assigned students. Log coaching sessions. View schedule',
        'ATHLETE: Book jumps. View QR code. Manage wallet and gear',
        'You can have multiple roles',
        'Switch roles from your profile dropdown',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'COACH', 'ATHLETE'],
      routeReference: '/auth/roles',
      relatedActions: ['requesting-additional-permissions'],
      keywords: ['role', 'permission', 'access', 'level', 'manager', 'staff'],
      module: 'AUTH',
    },
    {
      slug: 'requesting-additional-permissions',
      category: 'ROLES',
      title: 'Requesting additional permissions',
      shortAnswer:
        'Need more access? Submit a permission request to your DZ manager for review.',
      detailedSteps: [
        'Log in to your account',
        'Click profile icon',
        'Click "Request Permissions"',
        'Select the role or permission you need',
        'Enter reason for request',
        'Submit request',
        'DZ manager reviews and approves/denies',
        'You receive email confirmation',
      ],
      rolesAllowed: ['ATHLETE', 'MANIFEST_STAFF', 'COACH'],
      routeReference: '/auth/request-permission',
      relatedActions: ['role-based-access-what-each-role-can-do'],
      keywords: ['permission', 'request', 'access', 'role', 'approval'],
      module: 'AUTH',
    },

    // OFFLINE MODE (2)
    {
      slug: 'how-offline-mode-works',
      category: 'OFFLINE',
      title: 'How offline mode works',
      shortAnswer:
        'SkyLara caches data so you can work offline. Changes sync when you reconnect.',
      detailedSteps: [
        'SkyLara saves data to your device',
        'Manifest, check-in, gear checks work offline',
        'Changes are queued locally',
        'When you reconnect to internet',
        'Changes sync to the server',
        'Green checkmark shows when synced',
        'No data is lost',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'COACH', 'ATHLETE'],
      routeReference: '/offline',
      relatedActions: ['syncing-data-after-reconnecting'],
      keywords: ['offline', 'mode', 'sync', 'cache', 'internet', 'work'],
      module: 'OFFLINE',
    },
    {
      slug: 'syncing-data-after-reconnecting',
      category: 'OFFLINE',
      title: 'Syncing data after reconnecting',
      shortAnswer:
        'When you reconnect, SkyLara automatically syncs pending changes. Watch the sync indicator.',
      detailedSteps: [
        'You lose internet connection',
        'SkyLara shows "Offline mode" banner',
        'Make changes as usual',
        'When internet returns, sync starts auto',
        'Watch sync indicator (top right)',
        'Green checkmark = all synced',
        'If conflicts exist, resolve them',
        'Refresh page to see latest data',
      ],
      rolesAllowed: ['DZ_MANAGER', 'MANIFEST_STAFF', 'COACH', 'ATHLETE'],
      routeReference: '/offline',
      relatedActions: ['how-offline-mode-works'],
      keywords: ['sync', 'offline', 'reconnect', 'internet', 'data', 'conflict'],
      module: 'OFFLINE',
    },
  ];

  for (const article of articles) {
    await prisma.helpArticle.upsert({
      where: { slug: article.slug },
      update: article,
      create: {
        ...article,
        id: uuid(),
      },
    });
  }

  console.log('Seeded 25 help articles');
}

async function seedFeatureRegistry() {
  console.log('Seeding feature registry...');

  const features = [
    {
      id: 'feat-manifest-board',
      featureName: 'Manifest Board',
      description: 'Create loads, add jumpers, manage manifest in real time',
      module: 'MANIFEST',
      route: '/manifest/board',
      status: 'available',
      rolesRequired: JSON.stringify(['DZ_MANAGER', 'MANIFEST_STAFF']),
    },
    {
      id: 'feat-qr-check-in',
      featureName: 'QR Check-In',
      description: 'Scan QR codes for instant athlete identification and check-in',
      module: 'CHECK_IN',
      route: '/checkin',
      status: 'available',
      rolesRequired: JSON.stringify(['DZ_MANAGER', 'MANIFEST_STAFF']),
    },
    {
      id: 'feat-group-manifest',
      featureName: 'Group Manifest',
      description: 'Manifest teams (RW, freefly, coaching) as units',
      module: 'MANIFEST',
      route: '/manifest/groups',
      status: 'available',
      rolesRequired: JSON.stringify(['DZ_MANAGER', 'MANIFEST_STAFF']),
    },
    {
      id: 'feat-wallet-credits',
      featureName: 'Wallet & Credits',
      description: 'Manage jump credits, view balance, and purchase packages',
      module: 'WALLET',
      route: '/athlete/wallet',
      status: 'available',
      rolesRequired: JSON.stringify(['ATHLETE']),
    },
    {
      id: 'feat-jump-tickets',
      featureName: 'Jump Tickets',
      description: 'Buy jump ticket packages at discounted rates',
      module: 'WALLET',
      route: '/athlete/wallet',
      status: 'available',
      rolesRequired: JSON.stringify(['ATHLETE']),
    },
    {
      id: 'feat-gear-checks',
      featureName: 'Gear Checks',
      description: 'Log and track parachute system inspections',
      module: 'GEAR',
      route: '/gear/check',
      status: 'available',
      rolesRequired: JSON.stringify(['DZ_MANAGER', 'MANIFEST_STAFF']),
    },
    {
      id: 'feat-incident-reports',
      featureName: 'Incident Reports',
      description: 'Report and track safety incidents and near-misses',
      module: 'INCIDENTS',
      route: '/incidents/report',
      status: 'available',
      rolesRequired: JSON.stringify(['DZ_MANAGER', 'MANIFEST_STAFF', 'ATHLETE']),
    },
    {
      id: 'feat-emergency-profiles',
      featureName: 'Emergency Profiles',
      description: 'Store and access medical info and emergency contacts',
      module: 'PROFILE',
      route: '/athlete/emergency',
      status: 'available',
      rolesRequired: JSON.stringify(['ATHLETE']),
    },
    {
      id: 'feat-reports-dashboard',
      featureName: 'Reports Dashboard',
      description: 'Analytics on revenue, utilization, safety, and athlete activity',
      module: 'REPORTS',
      route: '/reports',
      status: 'available',
      rolesRequired: JSON.stringify(['DZ_MANAGER']),
    },
    {
      id: 'feat-ai-optimizer',
      featureName: 'AI Load Optimizer',
      description: 'Auto-suggest optimal load configurations based on aircraft and weather',
      module: 'MANIFEST',
      route: '/manifest/optimizer',
      status: 'coming-soon',
      rolesRequired: JSON.stringify(['DZ_MANAGER', 'MANIFEST_STAFF']),
    },
    {
      id: 'feat-cross-dz-transfer',
      featureName: 'Cross-DZ Transfer',
      description: 'Transfer credits and logbook entries between DZs in the network',
      module: 'WALLET',
      route: '/wallet/transfer',
      status: 'not-available',
      rolesRequired: JSON.stringify(['ATHLETE']),
    },
    {
      id: 'feat-marketplace',
      featureName: 'Marketplace',
      description: 'Buy and sell used gear within the SkyLara community',
      module: 'GEAR',
      route: '/marketplace',
      status: 'not-available',
      rolesRequired: JSON.stringify(['ATHLETE']),
    },
  ];

  for (const feature of features) {
    await prisma.featureRegistry.upsert({
      where: { id: feature.id },
      update: feature,
      create: feature,
    });
  }

  console.log('Seeded 12 feature registry entries');
}

async function seedIdeaNotes(dzId: number, userId: number) {
  console.log('Seeding idea notes...');

  const ideas = [
    {
      title: 'Add night jump scheduling mode',
      description:
        'Support scheduling and manifesting jumps during night hours with special lighting requirements and safety protocols.',
      category: 'OPS',
      priority: 'MEDIUM',
      status: 'NEW',
      affectedModule: 'MANIFEST',
    },
    {
      title: 'Implement dynamic pricing for peak hours',
      description:
        'Adjust jump pricing based on demand, weather, and time of day. Higher prices during peak hours, discounts off-peak.',
      category: 'FINANCE',
      priority: 'HIGH',
      status: 'UNDER_REVIEW',
      affectedModule: 'WALLET',
    },
    {
      title: 'Camera flyer auto-assignment based on skill',
      description:
        'Automatically assign camera flyers to loads based on their skill level and experience to ensure quality footage.',
      category: 'OPS',
      priority: 'MEDIUM',
      status: 'PLANNED',
      affectedModule: 'MANIFEST',
    },
    {
      title: 'WhatsApp integration for notifications',
      description:
        'Send load updates, check-in reminders, and emergency alerts via WhatsApp instead of just email.',
      category: 'ATHLETE',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      affectedModule: 'NOTIFICATIONS',
    },
    {
      title: 'Instructor performance leaderboard',
      description:
        'Show coaching stats (hours, students trained, ratings) to motivate instructors and help athletes pick coaches.',
      category: 'COACHING',
      priority: 'LOW',
      status: 'NEW',
      affectedModule: 'REPORTS',
    },
    {
      title: 'Multi-language waiver support',
      description:
        'Support waiver signing in Spanish, German, French, and other languages for international athletes.',
      category: 'COMPLIANCE',
      priority: 'HIGH',
      status: 'PLANNED',
      affectedModule: 'COMPLIANCE',
    },
    {
      title: 'Weather radar overlay on manifest',
      description: 'Show real-time weather radar on the manifest board for better jump scheduling decisions.',
      category: 'SAFETY',
      priority: 'MEDIUM',
      status: 'NEW',
      affectedModule: 'MANIFEST',
    },
    {
      title: 'Student progression tracking dashboard',
      description:
        'Track AFF student progression through levels with sign-offs, skills completed, and coaching notes.',
      category: 'COACHING',
      priority: 'MEDIUM',
      status: 'UNDER_REVIEW',
      affectedModule: 'COACHING',
    },
    {
      title: 'Mobile app dark mode',
      description: 'Add dark theme option to reduce eye strain during night operations and improve battery life.',
      category: 'UX',
      priority: 'LOW',
      status: 'NEW',
      affectedModule: 'UI',
    },
    {
      title: 'Automated end-of-day financial reconciliation',
      description:
        'Auto-match jump revenues, credit purchases, and payouts at end of day to simplify accounting.',
      category: 'FINANCE',
      priority: 'CRITICAL',
      status: 'PLANNED',
      affectedModule: 'FINANCE',
    },
  ];

  for (const idea of ideas) {
    await prisma.ideaNote.create({
      data: {
        dropzoneId: dzId,
        submittedById: userId,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        priority: idea.priority,
        status: idea.status,
        affectedModule: idea.affectedModule,
        tags: [],
      },
    });
  }

  console.log('Seeded 10 idea notes');
}

async function seedGuidedTours() {
  console.log('Seeding guided tours...');

  // DZ Manager Tour
  const dzManagerTour = await prisma.guidedTour.upsert({
    where: { slug: 'dz-manager-tour' },
    update: {},
    create: {
      id: uuid(),
      slug: 'dz-manager-tour',
      role: 'DZ_MANAGER',
      title: 'DZ Manager Tour',
      description: 'Learn how to manage your dropzone with SkyLara',
      isActive: true,
      sortOrder: 1,
    },
  });

  const dzManagerSteps = [
    {
      stepNumber: 1,
      targetSelector: '#dashboard-kpi',
      title: 'Your command center',
      description: 'See loads, revenue, safety metrics at a glance',
      position: 'bottom',
      route: '/dashboard',
      action: 'View Dashboard',
    },
    {
      stepNumber: 2,
      targetSelector: '#manifest-grid',
      title: 'Live manifest board',
      description: 'All active loads and athletes at a glance',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Open Manifest',
    },
    {
      stepNumber: 3,
      targetSelector: '#athlete-list',
      title: 'Manage athletes',
      description: 'Profiles, licenses, and compliance',
      position: 'bottom',
      route: '/athletes',
      action: 'View Athletes',
    },
    {
      stepNumber: 4,
      targetSelector: '#gear-section',
      title: 'Equipment tracking',
      description: 'Rigs, reserves, AADs, and inspections',
      position: 'bottom',
      route: '/gear',
      action: 'View Gear',
    },
    {
      stepNumber: 5,
      targetSelector: '#reports-dashboard',
      title: 'Reports & analytics',
      description: 'Revenue, utilization, and safety data',
      position: 'bottom',
      route: '/reports',
      action: 'View Reports',
    },
    {
      stepNumber: 6,
      targetSelector: '#dz-settings',
      title: 'DZ configuration',
      description: 'Manage aircraft, staff, and operational rules',
      position: 'bottom',
      route: '/settings',
      action: 'View Settings',
    },
  ];

  for (const step of dzManagerSteps) {
    await prisma.guidedTourStep.upsert({
      where: {
        tourId_stepNumber: { tourId: dzManagerTour.id, stepNumber: step.stepNumber },
      },
      update: step,
      create: {
        id: uuid(),
        tourId: dzManagerTour.id,
        ...step,
      },
    });
  }

  // Manifest Staff Tour
  const manifestStaffTour = await prisma.guidedTour.upsert({
    where: { slug: 'manifest-staff-tour' },
    update: {},
    create: {
      id: uuid(),
      slug: 'manifest-staff-tour',
      role: 'MANIFEST_STAFF',
      title: 'Manifest Staff Tour',
      description: 'Master the manifest board and athlete management',
      isActive: true,
      sortOrder: 2,
    },
  });

  const manifestStaffSteps = [
    {
      stepNumber: 1,
      targetSelector: '#manifest-grid',
      title: 'Your workspace',
      description: 'Create loads, add jumpers, manage the board',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Open Manifest',
    },
    {
      stepNumber: 2,
      targetSelector: '#add-load-btn',
      title: 'Create a new load',
      description: 'Select aircraft, set time, open for manifest',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Create Load',
    },
    {
      stepNumber: 3,
      targetSelector: '#slot-grid',
      title: 'Fill the load',
      description: 'Search, scan QR, or manifest a group',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Add Jumpers',
    },
    {
      stepNumber: 4,
      targetSelector: '#lock-load-btn',
      title: 'Lock and verify',
      description: 'CG check, waiver check, then lock for boarding',
      position: 'bottom',
      route: '/manifest/board',
      action: 'Lock Load',
    },
    {
      stepNumber: 5,
      targetSelector: '#checkin-screen',
      title: 'Check-in athletes',
      description: 'Scan QR or search by name',
      position: 'bottom',
      route: '/checkin',
      action: 'Check In',
    },
  ];

  for (const step of manifestStaffSteps) {
    await prisma.guidedTourStep.upsert({
      where: {
        tourId_stepNumber: { tourId: manifestStaffTour.id, stepNumber: step.stepNumber },
      },
      update: step,
      create: {
        id: uuid(),
        tourId: manifestStaffTour.id,
        ...step,
      },
    });
  }

  // Coach Tour
  const coachTour = await prisma.guidedTour.upsert({
    where: { slug: 'coach-tour' },
    update: {},
    create: {
      id: uuid(),
      slug: 'coach-tour',
      role: 'COACH',
      title: 'Coach Tour',
      description: 'Manage your students and coaching sessions',
      isActive: true,
      sortOrder: 3,
    },
  });

  const coachSteps = [
    {
      stepNumber: 1,
      targetSelector: '#coach-schedule',
      title: 'Your coaching schedule',
      description: 'See assigned sessions and students',
      position: 'bottom',
      route: '/coach/schedule',
      action: 'View Schedule',
    },
    {
      stepNumber: 2,
      targetSelector: '#student-list',
      title: 'Your students',
      description: 'Track progression, sign-offs, and notes',
      position: 'bottom',
      route: '/coach/students',
      action: 'View Students',
    },
    {
      stepNumber: 3,
      targetSelector: '#session-detail',
      title: 'Session details',
      description: 'View assigned loads and coaching groups',
      position: 'bottom',
      route: '/coach/sessions',
      action: 'View Sessions',
    },
    {
      stepNumber: 4,
      targetSelector: '#coach-reports',
      title: 'Your performance',
      description: 'Hours, students trained, and ratings',
      position: 'bottom',
      route: '/coach/reports',
      action: 'View Reports',
    },
  ];

  for (const step of coachSteps) {
    await prisma.guidedTourStep.upsert({
      where: {
        tourId_stepNumber: { tourId: coachTour.id, stepNumber: step.stepNumber },
      },
      update: step,
      create: {
        id: uuid(),
        tourId: coachTour.id,
        ...step,
      },
    });
  }

  // Athlete Tour
  const athleteTour = await prisma.guidedTour.upsert({
    where: { slug: 'athlete-tour' },
    update: {},
    create: {
      id: uuid(),
      slug: 'athlete-tour',
      role: 'ATHLETE',
      title: 'Athlete Tour',
      description: 'Get started with booking your first jump',
      isActive: true,
      sortOrder: 4,
    },
  });

  const athleteSteps = [
    {
      stepNumber: 1,
      targetSelector: '#athlete-profile',
      title: 'Your skydiving identity',
      description: 'QR code, jump count, and certifications',
      position: 'bottom',
      route: '/athlete/profile',
      action: 'View Profile',
    },
    {
      stepNumber: 2,
      targetSelector: '#manifest-board',
      title: 'Get on a load',
      description: 'Self-manifest or join a group',
      position: 'bottom',
      route: '/manifest/board',
      action: 'View Loads',
    },
    {
      stepNumber: 3,
      targetSelector: '#wallet-section',
      title: 'Your wallet',
      description: 'Credits, tickets, and transaction history',
      position: 'bottom',
      route: '/athlete/wallet',
      action: 'View Wallet',
    },
    {
      stepNumber: 4,
      targetSelector: '#emergency-card',
      title: 'Emergency profile',
      description: 'Keep your medical info updated — it saves lives',
      position: 'bottom',
      route: '/athlete/emergency',
      action: 'View Emergency Card',
    },
  ];

  for (const step of athleteSteps) {
    await prisma.guidedTourStep.upsert({
      where: {
        tourId_stepNumber: { tourId: athleteTour.id, stepNumber: step.stepNumber },
      },
      update: step,
      create: {
        id: uuid(),
        tourId: athleteTour.id,
        ...step,
      },
    });
  }

  console.log('Seeded 4 guided tours with 19 total steps');
}

async function main() {
  try {
    console.log('Starting support layer seed...');

    await seedHelpArticles();
    await seedFeatureRegistry();

    // For idea notes and tour, we need at least one dropzone and user
    // In the main seed, these should already exist
    const dz = await prisma.dropzone.findFirst();
    const user = await prisma.user.findFirst();

    if (dz && user) {
      await seedIdeaNotes(dz.id, user.id);
    } else {
      console.log(
        'Skipping idea notes: need at least one dropzone and user created first'
      );
    }

    await seedGuidedTours();

    console.log('Support layer seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
