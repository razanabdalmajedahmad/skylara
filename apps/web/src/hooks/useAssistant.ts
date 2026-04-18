'use client';

import { useState, useCallback, useRef } from 'react';
import { apiPost, apiGet } from '@/lib/api';
import { postAssistantMessageStream, sourcesToActionLinks } from '@/lib/assistantMessageClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionLink {
  label: string;
  route: string;
  icon?: string;
}

export interface AssistantResponse {
  answer: string;
  links?: ActionLink[];
  steps?: string[];
  blockers?: string[];
  suggestedFollowUp?: string;
  feature?: { name: string; description: string; route: string; roles: string[] };
  isLocal?: boolean;
  /** True when the user cancelled streaming / the in-flight request was aborted. */
  aborted?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: ActionLink[];
  steps?: string[];
  blockers?: string[];
  suggestedFollowUp?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Route map - deep links for every major SkyLara feature
// ---------------------------------------------------------------------------

const ROUTE_MAP: Record<string, { route: string; label: string; keywords: string[] }> = {
  manifest: { route: '/dashboard/manifest', label: 'Open Manifest', keywords: ['manifest', 'load', 'board', 'jump list'] },
  checkin: { route: '/dashboard/checkin', label: 'Open Check-in', keywords: ['check in', 'checkin', 'qr', 'scan'] },
  athletes: { route: '/dashboard/athletes', label: 'Open Athletes', keywords: ['athlete', 'jumper', 'profile'] },
  bookings: { route: '/dashboard/bookings', label: 'Open Bookings', keywords: ['booking', 'reserve', 'schedule'] },
  wallet: { route: '/dashboard/wallet', label: 'Open Wallet', keywords: ['wallet', 'credit', 'balance', 'payment', 'top up'] },
  payments: { route: '/dashboard/payments', label: 'Open Payments', keywords: ['payment', 'transaction', 'invoice'] },
  courses: { route: '/dashboard/courses', label: 'Open Courses', keywords: ['course', 'aff', 'student', 'progression', 'level', 'training'] },
  waivers: { route: '/dashboard/waivers', label: 'Open Waiver Center', keywords: ['waiver', 'sign', 'liability', 'consent'] },
  documents: { route: '/dashboard/documents', label: 'Open Documents', keywords: ['document', 'upload', 'certificate', 'rig card', 'license'] },
  boogies: { route: '/dashboard/boogies', label: 'Open Boogies & Events', keywords: ['boogie', 'event', 'camp', 'competition'] },
  incidents: { route: '/dashboard/incidents', label: 'Open Incident Reports', keywords: ['incident', 'accident', 'injury', 'safety report'] },
  weather: { route: '/dashboard/weather', label: 'Open Weather', keywords: ['weather', 'wind', 'cloud', 'temperature', 'forecast'] },
  gear: { route: '/dashboard/gear', label: 'Open Gear Tracking', keywords: ['gear', 'equipment', 'reserve', 'aad', 'container', 'canopy'] },
  aircraft: { route: '/dashboard/aircraft', label: 'Open Aircraft', keywords: ['aircraft', 'plane', 'fleet', 'maintenance'] },
  logbook: { route: '/dashboard/logbook', label: 'Open Logbook', keywords: ['logbook', 'jump log', 'jump history'] },
  emergency: { route: '/dashboard/emergency', label: 'Open Emergency Info', keywords: ['emergency', 'contact', 'ems'] },
  staff: { route: '/dashboard/staff', label: 'Open Staff Directory', keywords: ['staff', 'employee', 'team'] },
  coaches: { route: '/dashboard/staff/coaches', label: 'Open Coach Directory', keywords: ['coach directory'] },
  instructors: { route: '/dashboard/staff/instructors', label: 'Open Instructor Directory', keywords: ['instructor directory'] },
  onboarding: { route: '/dashboard/onboarding', label: 'Open Onboarding Center', keywords: ['onboarding', 'onboard'] },
  onboardingAthletes: { route: '/dashboard/onboarding', label: 'Open Athlete Onboarding', keywords: ['athlete onboarding'] },
  onboardingCoaches: { route: '/dashboard/onboarding', label: 'Open Coach Onboarding', keywords: ['coach onboarding', 'coach application'] },
  onboardingStudents: { route: '/dashboard/onboarding', label: 'Open Student Onboarding', keywords: ['student onboarding', 'student intake'] },
  onboardingInstructors: { route: '/dashboard/onboarding', label: 'Open Instructor Onboarding', keywords: ['instructor onboarding', 'instructor application'] },
  approvals: { route: '/dashboard/onboarding', label: 'Open Approval Queue', keywords: ['approval', 'approve', 'reject', 'review queue'] },
  notifications: { route: '/dashboard/notifications', label: 'Open Notification Center', keywords: ['notification', 'message', 'alert', 'campaign'] },
  segments: { route: '/dashboard/notifications', label: 'Open Segments', keywords: ['segment', 'audience', 'target group'] },
  branding: { route: '/dashboard/branding', label: 'Open Branding Settings', keywords: ['brand', 'logo', 'color', 'theme', 'white label'] },
  pricing: { route: '/dashboard/pricing', label: 'Open Pricing', keywords: ['pricing', 'price', 'cost', 'fee', 'rate'] },
  giftcards: { route: '/dashboard/gift-cards', label: 'Open Gift Cards', keywords: ['gift card', 'voucher'] },
  roles: { route: '/dashboard/roles', label: 'Open Roles & Permissions', keywords: ['role', 'permission', 'access'] },
  settings: { route: '/dashboard/settings', label: 'Open Settings', keywords: ['setting', 'config', 'preference'] },
  reports: { route: '/dashboard/reports', label: 'Open Reports', keywords: ['report', 'analytics', 'dashboard', 'metrics'] },
  endofday: { route: '/dashboard/end-of-day', label: 'Open End of Day', keywords: ['end of day', 'eod', 'reconciliation', 'close out'] },
  help: { route: '/dashboard/help', label: 'Open Help Center', keywords: ['help', 'faq', 'support', 'article'] },
  pilot: { route: '/dashboard/pilot', label: 'Open Pilot View', keywords: ['pilot', 'cg', 'flight'] },
  assistant: { route: '/dashboard/portal-assistant', label: 'Open Full Assistant', keywords: ['full assistant', 'ai hub'] },
  documentation: { route: '/dashboard/documentation', label: 'Open Documentation', keywords: ['documentation', 'api', 'docs', 'guide'] },
  coachInterest: { route: '/app/onboarding/coach', label: 'Start Coach Pathway', keywords: ['become coach', 'coach pathway', 'coaching interest'] },
  visitingJumper: { route: '/app/onboarding/visiting-jumper', label: 'Start Visiting Jumper Check-in', keywords: ['visiting jumper', 'visit dz', 'check-in visitor'] },
  studentIntake: { route: '/app/onboarding/student', label: 'Start Student Intake', keywords: ['new student', 'aff intake', 'student registration'] },
  waiverKiosk: { route: '/dashboard/waivers/kiosk', label: 'Open Waiver Kiosk', keywords: ['kiosk', 'tablet sign', 'waiver station'] },
  waiverSend: { route: '/dashboard/waivers/send', label: 'Send Waiver', keywords: ['send waiver', 'waiver link'] },
};

// ---------------------------------------------------------------------------
// Structured knowledge base - replaces the old pattern matching
// ---------------------------------------------------------------------------

interface KnowledgeEntry {
  intents: string[];
  answer: string;
  links: ActionLink[];
  steps?: string[];
  blockers?: string[];
  followUp?: string;
  disambiguate?: { question: string; options: { label: string; intent: string }[] };
}

const KNOWLEDGE: KnowledgeEntry[] = [
  {
    intents: ['onboarding', 'onboard', 'how to onboard'],
    answer: 'SkyLara has a unified Onboarding Center that manages all onboarding types. Which onboarding do you need help with?',
    links: [
      { label: 'Open Onboarding Center', route: '/dashboard/onboarding' },
      { label: 'Athlete Onboarding', route: '/dashboard/onboarding' },
      { label: 'Coach Onboarding', route: '/app/onboarding/coach' },
      { label: 'Student Intake', route: '/app/onboarding/student' },
    ],
    followUp: 'Which type of onboarding do you want to explore: athlete, coach, instructor, student, staff, or DZ manager?',
    disambiguate: {
      question: 'Which onboarding type?',
      options: [
        { label: 'Athlete / Fun Jumper', intent: 'athlete onboarding' },
        { label: 'Coach', intent: 'coach onboarding' },
        { label: 'Student (AFF)', intent: 'student onboarding' },
        { label: 'Staff', intent: 'staff onboarding' },
        { label: 'Instructor', intent: 'instructor onboarding' },
        { label: 'DZ Manager', intent: 'dz manager setup' },
      ],
    },
  },
  {
    intents: ['coach onboarding', 'onboard coach', 'new coach', 'how to onboard a coach', 'coach application'],
    answer: 'Coach onboarding in SkyLara has two paths:\n\n**If the coach already has a rating:** They go through profile completion (upload certs, set availability, acknowledge DZ standards).\n\n**If interested but no rating:** They start the Coach Interest Pathway to assess eligibility.',
    links: [
      { label: 'Start Coach Pathway', route: '/app/onboarding/coach' },
      { label: 'Open Onboarding Center (Coach tab)', route: '/dashboard/onboarding' },
      { label: 'View Approval Queue', route: '/dashboard/onboarding' },
      { label: 'Required Coach Documents', route: '/dashboard/documents' },
    ],
    steps: [
      'Go to Onboarding Center > Coaches tab',
      'Share the external coach link or start internal onboarding',
      'Coach fills out experience, disciplines, and uploads certifications',
      'System checks if they have an existing rating (smart routing)',
      'If rated: route to profile completion. If not: route to interest pathway',
      'Review application in the Approval Queue',
      'Approve, request more info, or reject',
    ],
    blockers: [
      'Missing coach certifications or ratings proof',
      'Missing license details',
      'Incomplete profile or bio',
      'No manager approval yet',
    ],
    followUp: 'Would you like me to walk you through the coach onboarding step by step, or open the coach onboarding page?',
  },
  {
    intents: ['athlete onboarding', 'fun jumper onboarding', 'visiting jumper', 'jumper check-in', 'visiting dz'],
    answer: 'Visiting or new jumpers go through the Visiting Jumper Check-in flow which collects their license, gear info, emergency contact, and waiver.',
    links: [
      { label: 'Start Visiting Jumper Check-in', route: '/app/onboarding/visiting-jumper' },
      { label: 'Open Onboarding Center (Athletes tab)', route: '/dashboard/onboarding' },
      { label: 'Open Waivers', route: '/dashboard/waivers' },
    ],
    steps: [
      'Share the visiting jumper link or start internal check-in',
      'Jumper provides personal info (auto-filled if signed in)',
      'Upload license and enter jump numbers',
      'Enter gear details (main, reserve pack date, AAD)',
      'Provide emergency contact',
      'Sign liability waiver',
      'Acknowledge local DZ rules',
    ],
    followUp: 'Do you want to share the visiting jumper link externally, or start the check-in for a signed-in user?',
  },
  {
    intents: ['student onboarding', 'aff student', 'new student', 'aff intake', 'student intake'],
    answer: 'AFF student onboarding collects medical declaration, emergency contact, waiver, and readiness assessment before the first jump.',
    links: [
      { label: 'Start Student Intake', route: '/app/onboarding/student' },
      { label: 'Open Courses (AFF tab)', route: '/dashboard/courses' },
      { label: 'Open Onboarding Center (Students tab)', route: '/dashboard/onboarding' },
    ],
    steps: [
      'Student fills personal info',
      'Completes medical declaration',
      'Provides emergency contact',
      'Signs student waiver',
      'Reviews and submits',
      'Admin reviews and assigns instructor',
    ],
    followUp: 'Want me to open the student intake page, or view the AFF courses?',
  },
  {
    intents: ['manifest', 'how to manifest', 'create load', 'add to load', 'manifest workflow'],
    answer: 'The Manifest board is the core of DZ operations. Create loads, add jumpers, track states from OPEN through COMPLETE.',
    links: [
      { label: 'Open Manifest', route: '/dashboard/manifest' },
      { label: 'Open Pilot View', route: '/dashboard/pilot' },
      { label: 'Open Check-in', route: '/dashboard/checkin' },
    ],
    steps: [
      'Go to Manifest in the sidebar',
      'Click "Add Load" to create a new load',
      'Select aircraft and set departure time',
      'Add jumpers to available slots',
      'Jumpers check in (status: CHECKED_IN)',
      'Call boarding (status: BOARDING)',
      'Load departs (status: AIRBORNE)',
      'Land and complete (status: COMPLETE)',
    ],
    followUp: 'Do you need help with creating a load, adding jumpers, or the load status workflow?',
  },
  {
    intents: ['check in', 'checkin', 'how to check in', 'qr check in'],
    answer: 'Check-in can be done via the Check-in page using QR codes or manual search.',
    links: [
      { label: 'Open Check-in', route: '/dashboard/checkin' },
      { label: 'Open Manifest', route: '/dashboard/manifest' },
    ],
    steps: [
      'Go to Check-in in the sidebar',
      'Scan QR code or search by name',
      'Verify jumper identity and status',
      'Confirm waiver, gear, and currency',
      'Complete check-in',
    ],
  },
  {
    intents: ['waiver', 'waivers', 'digital waiver', 'sign waiver', 'waiver management'],
    answer: 'SkyLara has a full Waiver Center for creating, publishing, sending, and managing digital waivers with versioning and audit trails.',
    links: [
      { label: 'Open Waiver Center', route: '/dashboard/waivers' },
      { label: 'Send Waiver', route: '/dashboard/waivers/send' },
      { label: 'Waiver Kiosk Mode', route: '/dashboard/waivers/kiosk' },
    ],
    steps: [
      'Go to Waivers in the sidebar',
      'Create or select a waiver template',
      'Build sections (clauses, signature blocks, medical, etc.)',
      'Publish a version',
      'Send via email, WhatsApp, push, or generate QR code',
      'Track signed submissions in the Signed Waivers tab',
    ],
    followUp: 'Do you want to create a new waiver template, send an existing one, or set up the kiosk?',
  },
  {
    intents: ['payment', 'wallet', 'top up', 'credit', 'balance', 'pricing'],
    answer: 'SkyLara handles payments through the Wallet system for jump credits and the Pricing module for setting rates.',
    links: [
      { label: 'Open Wallet', route: '/dashboard/wallet' },
      { label: 'Open Payments', route: '/dashboard/payments' },
      { label: 'Open Pricing', route: '/dashboard/pricing' },
    ],
  },
  {
    intents: ['boogie', 'event', 'camp', 'competition', 'create event'],
    answer: 'Boogies & Events are managed from the Boogies module. Create events with packages, registration forms, schedules, and group management.',
    links: [
      { label: 'Open Boogies & Events', route: '/dashboard/boogies' },
      { label: 'Create New Boogie', route: '/dashboard/boogies/new' },
    ],
    steps: [
      'Go to Boogies in the sidebar',
      'Click "Create Event"',
      'Fill event details (name, dates, location, description)',
      'Add packages with pricing and capacity',
      'Set up registration forms',
      'Publish the event',
      'Share registration link externally',
    ],
    followUp: 'Want to create a new event, or manage an existing one?',
  },
  {
    intents: ['incident', 'safety report', 'accident', 'injury report', 'near miss'],
    answer: 'Report safety incidents through the Incidents module. This is critical for DZ safety compliance.',
    links: [
      { label: 'Open Incidents', route: '/dashboard/incidents' },
      { label: 'Report New Incident', route: '/dashboard/incidents/new' },
    ],
  },
  {
    intents: ['weather', 'wind', 'forecast', 'jumpable', 'weather hold'],
    answer: 'Check current weather and jumpability conditions from the Weather module.',
    links: [
      { label: 'Open Weather', route: '/dashboard/weather' },
      { label: 'Open Manifest', route: '/dashboard/manifest' },
    ],
  },
  {
    intents: ['gear', 'equipment', 'reserve', 'aad', 'repack', 'rig'],
    answer: 'Track gear, manage reserve repack dates, AAD service dates, and CG calculations in the Gear module.',
    links: [
      { label: 'Open Gear Tracking', route: '/dashboard/gear' },
    ],
  },
  {
    intents: ['role', 'permission', 'access', 'who can', 'assign role'],
    answer: 'Roles and permissions are managed in the Roles module. SkyLara supports Platform Admin, DZ Manager, Manifest Staff, Safety Officer, Pilot, Tandem Instructor, AFF Instructor, Coach, and Jumper roles.',
    links: [
      { label: 'Open Roles & Permissions', route: '/dashboard/roles' },
      { label: 'Open Staff Management', route: '/dashboard/staff' },
    ],
  },
  {
    intents: ['report', 'analytics', 'dashboard', 'metrics', 'stats'],
    answer: 'Reports and analytics are available in the Reports module and the custom Report Builder.',
    links: [
      { label: 'Open Reports', route: '/dashboard/reports' },
      { label: 'Open Report Builder', route: '/dashboard/report-builder' },
    ],
  },
  {
    intents: ['setting', 'settings', 'configure', 'timezone', 'language'],
    answer: 'DZ settings cover operations, safety thresholds, integrations (Stripe, SendGrid, Twilio), and notification preferences.',
    links: [
      { label: 'Open Settings', route: '/dashboard/settings' },
      { label: 'Open Branding', route: '/dashboard/branding' },
    ],
  },
  {
    intents: ['brand', 'branding', 'logo', 'white label', 'customize'],
    answer: 'Customize your DZ portal with Enterprise Branding: logo, colors, fonts, and text labels.',
    links: [
      { label: 'Open Branding Settings', route: '/dashboard/branding' },
    ],
  },
  {
    intents: ['notification', 'campaign', 'segment', 'email', 'whatsapp', 'push notification'],
    answer: 'The Notification Center manages all communications: email, WhatsApp, push, and in-app. Create campaigns targeting dynamic segments.',
    links: [
      { label: 'Open Notification Center', route: '/dashboard/notifications' },
      { label: 'Open Onboarding Automations', route: '/dashboard/onboarding' },
    ],
  },
  {
    intents: ['what can i do here', 'what is this page', 'help me', 'where am i'],
    answer: 'I can see you are on a SkyLara page. I can help you understand what you can do here, navigate to other modules, or walk you through a workflow. Just ask!',
    links: [
      { label: 'Open Help Center', route: '/dashboard/help' },
      { label: 'Open Full Assistant', route: '/dashboard/portal-assistant' },
    ],
    followUp: 'What would you like to do? I can explain features, navigate you somewhere, or walk you through a task step by step.',
  },
  {
    intents: ['admin improve', 'what should admin do', 'recommendations', 'follow up', 'what is missing'],
    answer: 'Here are common admin actions to check:\n\n- Review pending approvals in the Onboarding Center\n- Check for expiring documents\n- Follow up on incomplete onboarding applications\n- Review waiver compliance\n- Check staffing for upcoming loads',
    links: [
      { label: 'Open Approval Queue', route: '/dashboard/onboarding' },
      { label: 'Open Documents', route: '/dashboard/documents' },
      { label: 'Open Onboarding Center', route: '/dashboard/onboarding' },
      { label: 'Open Staff', route: '/dashboard/staff' },
    ],
    followUp: 'Would you like me to focus on onboarding approvals, document compliance, or staffing?',
  },
];

// ---------------------------------------------------------------------------
// Match helper
// ---------------------------------------------------------------------------

function findBestMatch(query: string): KnowledgeEntry | null {
  const lower = query.toLowerCase().trim();
  const words = lower.split(/\s+/).filter((w) => w.length > 2);

  // Exact intent match
  for (const entry of KNOWLEDGE) {
    for (const intent of entry.intents) {
      if (lower === intent || lower.includes(intent)) {
        return entry;
      }
    }
  }

  // Word overlap scoring
  let bestScore = 0;
  let bestEntry: KnowledgeEntry | null = null;
  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const intent of entry.intents) {
      const intentWords = intent.split(/\s+/);
      const overlap = words.filter((w) => intentWords.some((iw) => iw.includes(w) || w.includes(iw))).length;
      score = Math.max(score, overlap);
    }
    if (score > bestScore && score >= 1) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestEntry;
}

function findRelevantLinks(query: string): ActionLink[] {
  const lower = query.toLowerCase();
  const links: ActionLink[] = [];
  for (const [, value] of Object.entries(ROUTE_MAP)) {
    for (const kw of value.keywords) {
      if (lower.includes(kw)) {
        links.push({ label: value.label, route: value.route });
        break;
      }
    }
  }
  return links.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Context-aware page description
// ---------------------------------------------------------------------------

function describeCurrentPage(route: string): string {
  const descriptions: Record<string, string> = {
    '/dashboard': 'You are on the main dashboard overview.',
    '/dashboard/manifest': 'You are on the Manifest board. Here you can create loads, add jumpers, and track load status.',
    '/dashboard/checkin': 'You are on the Check-in page. Use QR codes or manual search to check in jumpers.',
    '/dashboard/athletes': 'You are on the Athletes directory. View and manage all jumper profiles.',
    '/dashboard/bookings': 'You are on the Bookings page. Manage jump reservations and schedules.',
    '/dashboard/waivers': 'You are on the Waiver Center. Create, publish, send, and manage digital waivers.',
    '/dashboard/onboarding': 'You are on the Onboarding Center. Manage all onboarding types: athletes, coaches, students, staff.',
    '/dashboard/notifications': 'You are on the Notification Center. Manage campaigns, segments, and delivery across all channels.',
    '/dashboard/boogies': 'You are on the Boogies & Events page. Create and manage events, camps, and competitions.',
    '/dashboard/courses': 'You are on the Courses page. Track AFF student progression and manage training courses.',
    '/dashboard/settings': 'You are on the Settings page. Configure DZ operations, safety thresholds, and integrations.',
  };

  for (const [path, desc] of Object.entries(descriptions)) {
    if (route.startsWith(path) && (route === path || route[path.length] === '/')) {
      return desc;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAssistant() {
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const conversationIdRef = useRef<string | null>(null);
  const assistantAbortRef = useRef<AbortController | null>(null);

  const sendQuery = useCallback(
    async (query: string, role: string, currentRoute: string): Promise<AssistantResponse> => {
      setLoading(true);
      setError(null);
      setStreamBuffer('');

      let activeAc: AbortController | null = null;

      try {
        // Add user message to history
        const userMsg: ConversationMessage = {
          id: `u-${Date.now()}`,
          role: 'user',
          content: query,
          timestamp: Date.now(),
        };
        setConversationHistory((prev) => [...prev, userMsg]);

        // Try local knowledge match first for instant response
        const match = findBestMatch(query);
        const relevantLinks = findRelevantLinks(query);

        // Check if user is asking about current page
        const pageContext = describeCurrentPage(currentRoute);
        const isContextQuestion = /what can i do|what is this|where am i|help me here/i.test(query);

        let response: AssistantResponse;

        if (isContextQuestion && pageContext) {
          response = {
            answer: pageContext + '\n\nI can help you navigate, explain features, or walk you through a workflow.',
            links: relevantLinks.length > 0 ? relevantLinks : [{ label: 'Open Help Center', route: '/dashboard/help' }],
            suggestedFollowUp: 'What would you like to do on this page?',
            isLocal: true,
          };
        } else if (match) {
          response = {
            answer: match.answer,
            links: match.links,
            steps: match.steps,
            blockers: match.blockers,
            suggestedFollowUp: match.followUp,
            isLocal: true,
          };
        } else {
          // Claude + KB: SSE first, then JSON /assistant/message, then legacy /assistant/query
          assistantAbortRef.current?.abort();
          activeAc = new AbortController();
          assistantAbortRef.current = activeAc;

          const messageBody = {
            message: query,
            ...(conversationIdRef.current ? { conversationId: conversationIdRef.current } : {}),
            context: { currentRoute, currentPage: currentRoute },
          };

          const streamResult = await postAssistantMessageStream(messageBody, {
            signal: activeAc.signal,
            onDelta: (acc) => {
              if (!activeAc?.signal.aborted) setStreamBuffer(acc);
            },
          });

          if (streamResult.ok) {
            conversationIdRef.current = streamResult.conversationId;
            const fromSources = sourcesToActionLinks(streamResult.sources);
            response = {
              answer: streamResult.response,
              links: fromSources.length > 0 ? fromSources : relevantLinks,
            };
          } else if (activeAc.signal.aborted || streamResult.reason === 'aborted') {
            response = { answer: '', links: [], aborted: true };
          } else {
            try {
              const json = await apiPost<{
                response: string;
                sources?: { type: string; title: string; route?: string }[];
                conversationId: string;
              }>('/assistant/message', messageBody, { signal: activeAc.signal });
              conversationIdRef.current = json.conversationId;
              const fromSources = json.sources?.length ? sourcesToActionLinks(json.sources) : [];
              response = {
                answer: json.response,
                links: fromSources.length > 0 ? fromSources : relevantLinks,
              };
            } catch {
              try {
                const raw = await apiPost<{ success: boolean; data: any }>(
                  '/assistant/query',
                  {
                    query,
                    role,
                    currentRoute,
                    conversationHistory: conversationHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                  },
                  { signal: activeAc.signal }
                );

                const apiData = raw?.data || raw;
                const answer = apiData?.answer || 'I found some information but couldn\'t format a specific response.';
                const featureData = apiData?.data;
                const feature =
                  featureData && apiData?.type === 'feature-found'
                    ? {
                        name: featureData.featureName || featureData.name || '',
                        description: featureData.description || '',
                        route:
                          featureData.route ||
                          (featureData.module ? `/dashboard/${featureData.module.toLowerCase()}` : ''),
                        roles: featureData.roles || featureData.requiredRoles || [],
                      }
                    : undefined;

                response = {
                  answer,
                  feature,
                  links: relevantLinks,
                };
              } catch {
                response = {
                  answer: `I can help you with SkyLara operations. Here are some things you can ask about:\n\n- Onboarding (athletes, coaches, students, staff)\n- Manifest and loads\n- Waivers and documents\n- Payments and pricing\n- Boogies and events\n- Settings and branding\n- Reports and analytics\n\nJust ask a specific question and I will provide guidance with links.`,
                  links: [
                    { label: 'Open Help Center', route: '/dashboard/help' },
                    { label: 'Open Onboarding Center', route: '/dashboard/onboarding' },
                    { label: 'Open Manifest', route: '/dashboard/manifest' },
                  ],
                  isLocal: true,
                };
              }
            }
          }
        }

        if (!response.aborted) {
          const assistantMsg: ConversationMessage = {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: response.answer,
            links: response.links,
            steps: response.steps,
            blockers: response.blockers,
            suggestedFollowUp: response.suggestedFollowUp,
            timestamp: Date.now(),
          };
          setConversationHistory((prev) => [...prev, assistantMsg]);
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
        setError(errorMessage);
        throw err;
      } finally {
        setStreamBuffer('');
        if (activeAc && assistantAbortRef.current === activeAc) {
          assistantAbortRef.current = null;
        }
        setLoading(false);
      }
    },
    [conversationHistory]
  );

  const getSuggestions = useCallback(async (role: string, currentRoute: string) => {
    try {
      const suggestions = await apiGet<string[]>(`/assistant/suggestions?role=${role}&route=${currentRoute}`);
      return suggestions;
    } catch {
      return [];
    }
  }, []);

  const sendFeedback = useCallback(async (queryId: string, helpful: boolean) => {
    try {
      await apiPost('/assistant/feedback', { queryId, helpful });
    } catch {}
  }, []);

  const clearHistory = useCallback(() => {
    assistantAbortRef.current?.abort();
    assistantAbortRef.current = null;
    setStreamBuffer('');
    setConversationHistory([]);
    conversationIdRef.current = null;
  }, []);

  const abortAssistantRequest = useCallback(() => {
    assistantAbortRef.current?.abort();
    setStreamBuffer('');
    setLoading(false);
  }, []);

  return {
    sendQuery,
    getSuggestions,
    sendFeedback,
    conversationHistory,
    loading,
    error,
    streamBuffer,
    abortAssistantRequest,
    clearHistory,
  };
}
