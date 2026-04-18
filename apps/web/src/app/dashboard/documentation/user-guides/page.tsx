'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard/documentation', label: 'Overview' },
  { href: '/dashboard/documentation/user-guides', label: 'User Guides' },
  { href: '/dashboard/documentation/operations', label: 'Operations' },
  { href: '/dashboard/documentation/api', label: 'API Reference' },
  { href: '/dashboard/documentation/integrations', label: 'Integrations' },
  { href: '/dashboard/documentation/process-flows', label: 'Process Flows' },
  { href: '/dashboard/documentation/troubleshooting', label: 'Troubleshooting' },
  { href: '/dashboard/documentation/changelog', label: 'Changelog' },
];

interface GuideTopic {
  title: string;
  description: string;
  readTime: string;
  content: string;
}

interface GuideSection {
  role: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
  topics: GuideTopic[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    role: 'Admin Guide',
    icon: Shield,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    description: 'Complete administration and configuration reference for DZOs and administrators.',
    topics: [
      {
        title: 'Dashboard Overview & KPIs',
        description: 'Understanding your operational metrics at a glance.',
        readTime: '5 min',
        content: 'The SkyLara dashboard provides real-time visibility into your dropzone operations. The top row displays today\'s key metrics: total loads flown, active jumpers on manifest, revenue collected, and current weather status. The activity feed shows a chronological stream of events including check-ins, load dispatches, payments processed, and incident reports. Use the date range selector to view historical trends. The weather widget pulls current conditions from your configured weather API and highlights any wind speed or cloud ceiling thresholds that may affect operations. Click any metric card to drill into the detailed report for that area.',
      },
      {
        title: 'System Settings & Configuration',
        description: 'Global platform settings, timezone, currency, and operational parameters.',
        readTime: '8 min',
        content: 'Navigate to Settings > General to configure your dropzone\'s core operational parameters. Set your facility timezone (critical for accurate load scheduling), default currency for all transactions, and your USPA Group Member Number. Under Operations Settings, define your maximum load capacity per aircraft type, default altitude offerings (typically 10,000, 13,500, and 18,000 feet), and minimum weather thresholds for wind speed (25 mph default), cloud ceiling (3,000 ft default), and visibility (3 miles default). The Jump Pricing section lets you configure base prices for tandems, AFF levels, sport jumps, and coach jumps with optional seasonal multipliers.',
      },
      {
        title: 'Reports & Analytics',
        description: 'Generating and interpreting operational and financial reports.',
        readTime: '7 min',
        content: 'The Reports module provides pre-built and custom report capabilities. Standard reports include: Daily Revenue Summary (broken down by jump type, merchandise, and video), Monthly Load Count by aircraft, Tandem Conversion Rate (booking to completed jump), AFF Student Progression rates, and Staff Hours by role. Navigate to Reports > Custom to build queries using available data fields. Export any report as CSV or PDF. Schedule recurring reports to be emailed to stakeholders. The Analytics dashboard uses charts to visualize trends in revenue, jump volume, customer retention, and weather-related cancellations over configurable time periods.',
      },
      {
        title: 'Branding & White Label',
        description: 'Customize the athlete-facing experience with your dropzone brand.',
        readTime: '4 min',
        content: 'Under Settings > Branding, upload your dropzone logo (recommended 512x512 PNG with transparent background), set primary and secondary brand colors (used throughout the athlete portal and booking pages), and customize the email header/footer template. The Booking Widget section generates an embeddable iframe code for your website that matches your brand colors. Configure your custom domain (e.g., book.yourdropzone.com) under the Domain Settings tab. Preview all changes in real-time before publishing.',
      },
      {
        title: 'Roles & Permissions',
        description: 'Managing user access levels and custom permission sets.',
        readTime: '6 min',
        content: 'SkyLara uses a role-based access control (RBAC) system with the following default roles: DZO (full access), Admin (full access except billing), Manifest (load management, check-in, athlete lookup), Instructor (student management, load view, progression logging), Pilot (load view, aircraft status), Rigger (gear management, pack jobs), and Front Desk (check-in, payments, basic athlete management). Navigate to Settings > Roles to create custom roles. Each permission is granular: you can grant read, write, or admin access to individual modules. Use the Permission Matrix view to see all roles side-by-side. Changes to role permissions take effect on the user\'s next page load.',
      },
      {
        title: 'Aircraft Management',
        description: 'Adding aircraft, setting capacity, and tracking maintenance.',
        readTime: '5 min',
        content: 'Navigate to Settings > Aircraft to manage your fleet. For each aircraft, enter the registration number (tail number), type (e.g., Cessna 208B Grand Caravan, DHC-6 Twin Otter, PAC 750XL), maximum jumper capacity, and current status (Active, Maintenance, Inactive). Set the default climb rate and time-to-altitude for each aircraft type, which the manifest system uses to calculate load scheduling. Track 100-hour inspections and annual certifications with the maintenance scheduler. When an aircraft is set to Maintenance status, it is automatically removed from available aircraft in the manifest system.',
      },
      {
        title: 'Pricing & Packages',
        description: 'Configure jump prices, packages, and seasonal pricing rules.',
        readTime: '6 min',
        content: 'The Pricing module at Settings > Pricing lets you define base prices for each jump type. Create packages that bundle multiple jumps at a discount (e.g., 10-jump block for sport jumpers, AFF course package including all 8 levels). Set up seasonal pricing rules that automatically apply surcharges during peak season (typically May through September) or discounts during slower months. Group rates for tandem bookings (5+ in a party) are configured separately. All price changes are logged with the modifying user and timestamp for audit purposes.',
      },
      {
        title: 'Waiver Management',
        description: 'Digital waiver configuration, templates, and compliance tracking.',
        readTime: '5 min',
        content: 'Under Settings > Waivers, manage your digital liability waiver templates. Upload your attorney-approved waiver text, configure signature capture requirements (typed name, drawn signature, or both), and set waiver expiration periods (typically 12 months). The system tracks waiver status for every athlete and blocks check-in if the waiver is expired or missing. Configure age-verification rules for minors (requires parent/guardian co-signature). View waiver completion rates and export signed waivers as PDF for your records. Waivers are stored with tamper-evident timestamps and IP address logging.',
      },
      {
        title: 'Email & Notification Templates',
        description: 'Customize automated communications sent to athletes and staff.',
        readTime: '4 min',
        content: 'Navigate to Settings > Notifications to customize all automated messages. Template categories include: Booking Confirmation, Booking Reminder (sent 24 hours before), Check-in Instructions, Jump Certificate, Payment Receipt, Weather Cancellation, and Waiver Reminder. Each template uses merge fields (e.g., {{athlete.firstName}}, {{booking.date}}, {{booking.jumpType}}) that auto-populate with real data. Preview templates with sample data before saving. Configure SMS notifications separately under the Twilio integration section for time-sensitive alerts like weather holds and load calls.',
      },
      {
        title: 'Data Export & Backup',
        description: 'Export operational data and manage automated backups.',
        readTime: '3 min',
        content: 'The Data Management section under Settings > Data provides bulk export capabilities. Export athletes, loads, financial transactions, or incident reports in CSV or JSON format. Filter exports by date range, status, or custom criteria. Automated daily backups run at 2:00 AM in your configured timezone. Backup retention is 90 days for daily backups and 2 years for monthly snapshots. Use the Restore function to recover from a specific backup point. All exports include an audit log entry recording who exported what data and when.',
      },
    ],
  },
  {
    role: 'Manifest Staff Guide',
    icon: Users,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    description: 'Day-to-day load management, athlete check-in, and manifest operations.',
    topics: [
      {
        title: 'Creating & Managing Loads',
        description: 'Build loads, assign aircraft, set altitudes, and manage slots.',
        readTime: '8 min',
        content: 'From the Manifest screen, click "New Load" to create a load. Select the aircraft from your active fleet, which auto-populates the maximum capacity. Set the target altitude (standard options or custom), and the system calculates estimated time to altitude based on your aircraft configuration. Assign a pilot from available rated pilots. Slots are auto-created based on aircraft capacity. For each slot, you can assign a jumper type: Solo (sport), Tandem Pair (instructor + student occupies 2 slots), AFF (student + 1 or 2 instructors), or Coach Jump. The load board displays all open loads with real-time slot availability. Drag and drop athletes between loads to rebalance. The system enforces weight and balance limits based on aircraft type and jumper weights.',
      },
      {
        title: 'Athlete Check-in Process',
        description: 'Processing arrivals, verifying credentials, and adding to manifest.',
        readTime: '6 min',
        content: 'When an athlete arrives, open the Check-in screen. Search by name, USPA number, or scan their QR code (if they have the athlete app). The system displays their profile with waiver status, license/rating, currency (last jump date), and account balance. Verify their USPA membership is current (the system auto-checks against the USPA database if the integration is configured). For licensed jumpers, confirm their gear has been inspected and their AAD is current. If all checks pass, mark them as "Checked In" which makes them available for manifest. The check-in screen highlights any issues in red: expired waiver, lapsed membership, overdue gear inspection, or negative account balance.',
      },
      {
        title: 'Walk-in Tandem Customers',
        description: 'Handling unbooked tandem customers from arrival to jump.',
        readTime: '7 min',
        content: 'Walk-in tandem customers follow a streamlined onboarding flow. Click "Walk-in Tandem" from the manifest screen to start the process. Step 1: Collect customer information (name, email, phone, DOB, weight). Step 2: Digital waiver signature on the tablet. Step 3: Process payment (cash, card, or gift certificate). Step 4: Assign a tandem instructor (the system shows available TIs with their current load count for the day). Step 5: Assign to the next available load with tandem slots. Step 6: Print or text the customer their jump time and preparation instructions. The walk-in flow typically takes 5-7 minutes and handles all legal, financial, and scheduling requirements in a single workflow.',
      },
      {
        title: 'Load Status Management',
        description: 'Tracking loads through their lifecycle from open to complete.',
        readTime: '5 min',
        content: 'Each load progresses through defined statuses: OPEN (accepting jumpers), FULL (all slots filled), CALLED (15-minute warning issued), BOARDING (jumpers walking to aircraft), IN_FLIGHT (aircraft departed), JUMPING (jumpers exiting), LANDED (aircraft on ground), and COMPLETE (all post-jump tasks done). Update statuses from the load detail view or the manifest board. The system sends automatic notifications at CALLED (SMS to manifested jumpers), BOARDING (intercom/PA integration), and COMPLETE (triggers jump logging). If a load needs to be held due to weather, set it to WEATHER_HOLD which pauses the status progression and notifies all manifested jumpers.',
      },
      {
        title: 'Weight & Balance',
        description: 'Managing load weight limits and CG calculations.',
        readTime: '4 min',
        content: 'SkyLara calculates real-time weight and balance for each load based on jumper exit weights (body weight + gear weight, typically 25-30 lbs for sport rigs, 55-60 lbs for tandem rigs). The system uses aircraft-specific W&B envelopes configured in the Aircraft Management section. As jumpers are added to a load, the running total updates and a visual indicator shows proximity to max gross weight. Exit order affects CG calculations: the system suggests optimal seating arrangements to maintain CG within limits throughout the jump run. If adding a jumper would exceed weight limits, the system blocks the assignment and displays the remaining weight capacity.',
      },
      {
        title: 'Manifest Board Views',
        description: 'Customizing and using the manifest display for operations.',
        readTime: '3 min',
        content: 'The manifest board offers multiple view modes. Board View shows all active loads as cards with real-time slot counts and status colors. Timeline View displays loads on a horizontal timeline based on scheduled call times. List View provides a sortable table of all loads with filtering by status, aircraft, or altitude. The TV Display mode is a simplified, large-font view designed for lobby monitors showing the next 3-5 loads with athlete names and call times. Configure your default view under user preferences. All views auto-refresh every 10 seconds via WebSocket connection.',
      },
      {
        title: 'Payment Processing at Manifest',
        description: 'Collecting payments, applying credits, and handling refunds.',
        readTime: '5 min',
        content: 'The manifest station handles most point-of-sale transactions. When adding a jumper to a load, the system displays the applicable price based on jump type and any active packages. Accept payment via credit card (Stripe terminal integration), cash (recorded manually with drawer tracking), account credit (pre-loaded athlete wallet), or gift certificate (scan or enter code). Split payments across multiple methods are supported. For refunds due to weather cancellations, select the load and use "Weather Cancel" which automatically processes refunds or credits based on your configured cancellation policy. End-of-day reconciliation compares the cash drawer to recorded cash transactions.',
      },
      {
        title: 'Group Bookings & Events',
        description: 'Managing large parties, corporate events, and group tandems.',
        readTime: '4 min',
        content: 'Group bookings are managed from the Events module accessible from the manifest screen. Create a group event with: organizer contact info, number of participants, date/time, jump type (typically tandem), and any special requirements. The system generates a group booking link that the organizer distributes to participants for individual waiver completion and info collection. On the day of the event, the Group Check-in view shows all participants with their waiver and payment status. Bulk-assign the group across multiple loads with a single action, and the system optimizes load distribution based on instructor availability and aircraft capacity.',
      },
    ],
  },
  {
    role: 'Instructor Guide',
    icon: GraduationCap,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Student management, AFF progression tracking, and tandem operations.',
    topics: [
      {
        title: 'Student Management & Progression',
        description: 'Track AFF students through their learning journey.',
        readTime: '7 min',
        content: 'The Student Management screen shows all your assigned AFF students with their current progression status. Each student card displays: current AFF level (1-8), total jumps completed, last jump date, and any instructor notes. Click a student to view their full progression history including jump-by-jump evaluations, skill checkoffs, and video links. The progression tracker follows USPA Integrated Student Program (ISP) requirements, ensuring all required skills are demonstrated before advancing. When a student completes all requirements for their current level, click "Advance" to move them to the next level. The system prevents advancement if any required skills are unchecked.',
      },
      {
        title: 'AFF Jump Evaluation',
        description: 'Recording jump performance, skills, and advancement decisions.',
        readTime: '6 min',
        content: 'After each AFF jump, complete the evaluation form from the student\'s profile. For each level, the system presents the required skill objectives (e.g., Level 1: stable exit, altitude awareness, practice pulls, assisted deployment). Rate each skill as Satisfactory, Needs Improvement, or Unsatisfactory. Add freeform notes about the student\'s performance, areas for improvement, and recommendations for the next jump. If the student demonstrated all required skills, mark the level as "Passed." If not, mark as "Repeat" with specific focus areas. Upload video from the jump for the student to review. The evaluation is timestamped and signed digitally with your instructor credentials.',
      },
      {
        title: 'Tandem Instructor Workflow',
        description: 'Managing tandem operations from briefing to post-jump.',
        readTime: '5 min',
        content: 'Your tandem assignments appear in the Instructor Dashboard organized by load. For each tandem: review the customer profile (weight, any medical notes, first-time or repeat), confirm gear assignment (drogue-deployed main with matching container size), and note any photo/video package purchased. Use the pre-jump briefing checklist which covers: gear fitting, body position training, altitude awareness, emergency procedures, and landing preparation. After the jump, complete the tandem evaluation (overall experience rating, any issues), confirm video delivery if applicable, and mark the jump as complete. The system automatically generates the customer\'s jump certificate and sends it via email.',
      },
      {
        title: 'Coach Jump Documentation',
        description: 'Logging coached jumps for licensed skydivers.',
        readTime: '4 min',
        content: 'Coach jumps are for licensed skydivers working on specific skills with a rated coach. From the Instructor Dashboard, select a coach jump assignment to see the jump objectives set during booking (e.g., belly flying, freefly transitions, canopy skills). After the jump, log the skills practiced, performance assessment, and recommendations. Coach jumps count toward the athlete\'s license progression if applicable (B-license, C-license requirements). The athlete can view coach notes and video in their logbook. Track your coaching hours for USPA rating currency requirements.',
      },
      {
        title: 'License & Rating Signoffs',
        description: 'Issuing A-license recommendations and rating endorsements.',
        readTime: '5 min',
        content: 'When a student completes all AFF levels and accumulates the required 25 jumps with all A-license skill requirements met, the system flags them for A-license recommendation. Review their complete jump history, verify all skill checkoffs, confirm they meet USPA requirements (minimum freefall time, successful water training if applicable), and submit the recommendation through the integrated USPA submission portal. The system maintains a checklist of all A-license requirements (Category A through H skills) and visually indicates completion status. Similar workflows exist for B, C, and D license endorsements with their respective requirements.',
      },
      {
        title: 'Safety & Currency Tracking',
        description: 'Monitoring instructor currency and safety requirements.',
        readTime: '3 min',
        content: 'The Instructor Dashboard prominently displays your currency status. USPA requires tandem instructors to complete a minimum number of tandems per 12-month period and maintain current ratings through continuing education. AFF instructors must maintain jump currency (jump within the last 60 days). The system tracks all currency requirements and provides 30-day, 14-day, and 7-day warnings before expiration. If an instructor falls out of currency, they are automatically removed from the available instructor pool until currency is restored. View your personal jump log, total student count, and rating history from your instructor profile.',
      },
    ],
  },
  {
    role: 'Athlete Guide',
    icon: UserCheck,
    color: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    description: 'Self-service registration, booking, check-in, and digital logbook.',
    topics: [
      {
        title: 'Registration & Profile Setup',
        description: 'Creating your account and completing your athlete profile.',
        readTime: '4 min',
        content: 'Register at your dropzone\'s booking page or download the SkyLara athlete app. Create your account with email and password, then complete your profile: legal name (must match government ID), date of birth, emergency contact information, body weight (used for load planning), and USPA membership number if you have one. Upload a profile photo for easy identification at the dropzone. If you are an experienced jumper, enter your license level (A, B, C, D), total jump count, and gear information (main canopy size, container type, AAD model and serial number). Your profile must be complete before you can book jumps or check in at the dropzone.',
      },
      {
        title: 'Booking a Jump',
        description: 'How to book tandems, AFF jumps, and sport jumps online.',
        readTime: '5 min',
        content: 'From the Booking page, select your jump type: Tandem (first-time or repeat experience), AFF Level (for students currently in training), Sport Jump (for licensed skydivers), or Coach Jump (for skill-specific training with a coach). Choose your preferred date and time slot from the availability calendar. Tandem customers can add video/photo packages during booking. Review the price summary including any applicable discounts (group rate, package pricing, or promotional codes). Complete payment with a credit card to confirm your booking. You will receive a confirmation email with your scheduled jump time, arrival instructions (arrive 30 minutes before your slot), what to wear, and weight/age restrictions reminder.',
      },
      {
        title: 'Day-of Check-in',
        description: 'What to expect when you arrive at the dropzone.',
        readTime: '3 min',
        content: 'Arrive at the dropzone at least 30 minutes before your scheduled jump time. At the front desk, provide your name or scan the QR code from your confirmation email. The check-in system verifies your waiver status (you can complete the digital waiver in advance through the app or on-site tablets), confirms your booking, and processes any remaining payments. For tandem customers, you will be introduced to your instructor and attend a 15-20 minute ground school briefing. For licensed jumpers, check-in confirms your gear currency and USPA membership. Once checked in, you appear on the manifest board and will be called when your load is ready to board.',
      },
      {
        title: 'Digital Logbook',
        description: 'Viewing your jump history, certificates, and progression.',
        readTime: '4 min',
        content: 'Your digital logbook is accessible from the athlete app or web portal. Every jump logged in SkyLara automatically appears in your logbook with: date, dropzone, aircraft, exit altitude, freefall time, deployment altitude, and canopy type. For AFF jumps, your instructor\'s evaluation and video are attached. For tandems, your jump certificate and any purchased media are available for download and sharing. The logbook tracks your running statistics: total jumps, total freefall time, license progression, and jump frequency. Export your logbook as a PDF that matches the format of a traditional paper logbook for USPA or FAI record-keeping purposes.',
      },
      {
        title: 'Account & Wallet',
        description: 'Managing your balance, purchases, and payment methods.',
        readTime: '3 min',
        content: 'Your athlete wallet displays your current account balance, transaction history, and saved payment methods. Pre-load credit to your wallet for faster check-in at the manifest window (no payment processing delay). Purchase jump packages at a discount (e.g., 10-pack of sport jumps) which appear as available credits in your wallet. View all past transactions including jump charges, package purchases, merchandise, video fees, and any refunds. Saved payment methods are stored securely through Stripe and can be managed from the Payment Methods section. Set up auto-reload to maintain a minimum wallet balance, ensuring you always have credit available for jump days.',
      },
    ],
  },
];

export default function UserGuidesPage() {
  const [search, setSearch] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const toggleTopic = (key: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredSections = useMemo(() => {
    let sections = GUIDE_SECTIONS;
    if (activeRole) {
      sections = sections.filter((s) => s.role === activeRole);
    }
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        topics: section.topics.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.content.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.topics.length > 0);
  }, [search, activeRole]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-800 bg-white dark:bg-slate-800 dark:bg-gray-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  link.href === '/dashboard/documentation/user-guides'
                    ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Guides</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Role-based documentation for every user of the SkyLara platform.
        </p>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search user guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveRole(null)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              !activeRole
                ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                : 'bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            All Roles
          </button>
          {GUIDE_SECTIONS.map((section) => (
            <button
              key={section.role}
              onClick={() => setActiveRole(activeRole === section.role ? null : section.role)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                activeRole === section.role
                  ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                  : 'bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {section.role}
            </button>
          ))}
        </div>

        {/* Guide Sections */}
        {filteredSections.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800">
            <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No guides match your search.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.role} className="bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${section.color}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{section.role}</h2>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {section.topics.length} topics
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">{section.description}</p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {section.topics.map((topic) => {
                      const key = `${section.role}-${topic.title}`;
                      const isExpanded = expandedTopics.has(key);
                      return (
                        <div key={key}>
                          <button
                            onClick={() => toggleTopic(key)}
                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{topic.title}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-0.5">{topic.description}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">{topic.readTime}</span>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-5 pb-4 ml-6">
                              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                  {topic.content}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
