'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  ShieldCheck,
  GraduationCap,
  Users,
  AlertTriangle,
  Calendar,
  FileCheck,
  UserCog,
  Cloud,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KnowledgeArticle {
  id: string;
  category: string;
  title: string;
  preview: string;
  content: string;
  updatedAt: string;
}

interface CategoryDef {
  key: string;
  label: string;
  icon: React.ElementType;
}

/* ------------------------------------------------------------------ */
/*  Categories                                                         */
/* ------------------------------------------------------------------ */

const CATEGORIES: CategoryDef[] = [
  { key: 'manifest-sop', label: 'Manifest SOP', icon: ClipboardList },
  { key: 'checkin-sop', label: 'Check-in SOP', icon: CheckCircle },
  { key: 'waiver-rules', label: 'Waiver Rules', icon: FileText },
  { key: 'aff-courses', label: 'AFF & Courses', icon: GraduationCap },
  { key: 'tandem-workflow', label: 'Tandem Workflow', icon: Users },
  { key: 'incident-process', label: 'Incident Process', icon: AlertTriangle },
  { key: 'event-setup', label: 'Event Setup', icon: Calendar },
  { key: 'document-verification', label: 'Document Verification', icon: FileCheck },
  { key: 'staff-operations', label: 'Staff Operations', icon: UserCog },
  { key: 'weather-restrictions', label: 'Weather & Restrictions', icon: Cloud },
];

/* ------------------------------------------------------------------ */
/*  30+ Knowledge Articles                                             */
/* ------------------------------------------------------------------ */

const ARTICLES: KnowledgeArticle[] = [
  // Manifest SOP
  {
    id: 'k-001', category: 'manifest-sop', title: 'Creating a New Load',
    preview: 'Step-by-step guide for creating loads including aircraft selection, altitude, and slot configuration.',
    content: `## Creating a New Load

### Prerequisites
- You must have MANIFEST_STAFF or DZ_MANAGER role
- At least one aircraft must be marked as Airworthy
- Weather conditions must meet minimum jumpability threshold (40+)

### Steps
1. Navigate to Manifest > Create Load
2. Select the aircraft from the available fleet dropdown
3. Set target altitude (standard: 10,000ft, 13,500ft, or 15,000ft)
4. Configure slot count based on aircraft capacity
5. Set estimated call time and departure time
6. Assign a pilot from available pilots
7. Optionally assign a load organizer
8. Click "Create Load" to publish

### Load States
The load follows this lifecycle: OPEN > FILLING > LOCKED > BOARDING > TAXIING > AIRBORNE > LANDED > COMPLETE

### Important Notes
- Loads auto-transition to FILLING when 75% of slots are taken
- Only DZ Manager can override a LOCKED load back to OPEN
- Tandems require paired instructor slots`,
    updatedAt: '2026-04-01',
  },
  {
    id: 'k-002', category: 'manifest-sop', title: 'Moving Jumpers Between Loads',
    preview: 'How to reassign jumpers from one load to another while maintaining slot integrity.',
    content: `## Moving Jumpers Between Loads

### When to Move
- Load cancelled due to weather or mechanical
- Jumper requests a different altitude or time
- Rebalancing loads for weight and balance
- Instructor reassignment

### Steps
1. Go to Manifest > Active Loads
2. Click on the jumper's name in the load card
3. Select "Move to Another Load"
4. Choose the destination load from the dropdown (only OPEN or FILLING loads shown)
5. Confirm the move

### Restrictions
- Cannot move checked-in jumpers without unchecking them first
- Tandem pairs must be moved together
- AFF students must move with their instructor
- Moving does not transfer payment -- payment stays with original booking`,
    updatedAt: '2026-03-28',
  },
  {
    id: 'k-003', category: 'manifest-sop', title: 'Load Weight and Balance',
    preview: 'Calculating CG and weight limits for each aircraft type in the fleet.',
    content: `## Load Weight and Balance

### Overview
Every load requires a weight and balance check before the pilot can mark BOARDING. The system calculates CG automatically based on jumper weights and exit order.

### Weight Sources
- Jumper profile weight (self-reported, verified at check-in)
- Gear weight (auto-calculated from rig assignment)
- Tandem weight includes both passenger and instructor

### CG Calculation
The system uses aircraft-specific envelopes:
- Cessna 208: Max gross 8,785 lbs, CG range 142.0 - 153.0 in
- King Air: Max gross 12,500 lbs, CG range 198.0 - 210.0 in
- Twin Otter: Max gross 12,500 lbs, CG range 260.0 - 280.0 in

### Alerts
- Yellow warning at 90% of max gross weight
- Red alert if CG is outside safe envelope
- Pilot must acknowledge any yellow warnings before departure`,
    updatedAt: '2026-04-05',
  },
  // Check-in SOP
  {
    id: 'k-004', category: 'checkin-sop', title: 'Standard Check-in Process',
    preview: 'Complete check-in flow from arrival through boarding readiness.',
    content: `## Standard Check-in Process

### Pre-Arrival Requirements
Athletes must have:
- Valid waiver on file (signed within last 12 months)
- Updated weight on profile
- Valid license/rating for jump type
- Sufficient wallet balance or active booking

### Check-in Steps
1. Athlete arrives and approaches manifest
2. Staff verifies identity (photo ID for first visit)
3. System checks waiver status, document validity, and balance
4. If all green: athlete is marked CHECK_IN_READY
5. Athlete receives load assignment
6. Physical gear check occurs at boarding

### QR Check-in
For returning athletes:
1. Athlete scans the DZ QR code with their phone
2. App validates all requirements automatically
3. If all pass, athlete is auto-checked in
4. Manifest staff sees a green indicator on the board`,
    updatedAt: '2026-04-03',
  },
  {
    id: 'k-005', category: 'checkin-sop', title: 'Tandem Customer Check-in',
    preview: 'Special check-in procedure for tandem customers including waiver, briefing, and pairing.',
    content: `## Tandem Customer Check-in

### Walk-in vs Pre-booked
- Walk-ins: Full registration at counter, waiver signing on tablet, payment collection
- Pre-booked: Verify booking ID, confirm waiver was pre-signed online, verify payment

### Procedure
1. Greet customer, confirm booking or create new
2. Verify age (18+ or signed parental consent)
3. Check weight (max 220 lbs standard, 240 lbs with heavy-weight TI)
4. Complete waiver signing on tablet
5. Collect payment if not pre-paid
6. Assign to tandem instructor (TI)
7. TI conducts 15-minute ground briefing
8. Assign to next available load
9. Gear fitting by TI

### Important
- Never rush the briefing. Minimum 15 minutes required.
- Customers who arrive intoxicated must be refused. No exceptions.
- Photo/video package should be offered before gearing up.`,
    updatedAt: '2026-03-30',
  },
  {
    id: 'k-006', category: 'checkin-sop', title: 'Handling Late Arrivals',
    preview: 'Policy for athletes who arrive after their scheduled load call time.',
    content: `## Handling Late Arrivals

### Policy
- Up to 10 minutes late: Can still join if load is not yet LOCKED
- 10-30 minutes late: Must wait for next available load, no priority
- 30+ minutes: Booking may be forfeited depending on DZ policy

### Actions
1. Check if original load has departed
2. If not departed and not LOCKED, add to load
3. If LOCKED or departed, offer next available slot
4. Update booking record with new load assignment
5. For tandems: instructor reassignment may be needed if original TI is on another load

### No-Shows
- After 60 minutes past booking time with no contact: mark as NO_SHOW
- Refund policy per DZ settings (typically 50% or full credit for rebook)`,
    updatedAt: '2026-03-25',
  },
  // Waiver Rules
  {
    id: 'k-007', category: 'waiver-rules', title: 'Waiver Validity and Renewal',
    preview: 'Rules for waiver validity periods, renewal requirements, and grace periods.',
    content: `## Waiver Validity and Renewal

### Validity Period
- Standard jump waiver: 12 months from signature date
- Tandem waiver: Single use (one jump) or 12 months for repeat customers
- Minor waiver (with parental consent): Valid until 18th birthday, then must re-sign

### Renewal Process
1. System sends automated reminder 30 days before expiry
2. Second reminder at 7 days
3. Athlete receives in-app notification and email
4. Athlete can re-sign digitally from their dashboard
5. No jump activity permitted with expired waiver

### Grace Period
- No grace period. Expired means no jumping.
- Staff cannot override waiver requirements
- DZ Manager can grant a 24-hour emergency extension in extraordinary circumstances (audit logged)`,
    updatedAt: '2026-04-02',
  },
  {
    id: 'k-008', category: 'waiver-rules', title: 'Minor Athlete Waiver Process',
    preview: 'Special requirements for athletes under 18 including parental consent and supervision.',
    content: `## Minor Athlete Waiver Process

### Requirements
- Minimum age: 16 (or 18 for tandem at most DZs)
- Parent or legal guardian must be present for initial waiver signing
- Guardian must provide government-issued ID
- Guardian must sign the minor waiver addendum
- Guardian must remain at the DZ during all jump activities

### Digital Process
1. Minor creates account (with parent email as secondary)
2. System generates minor waiver package
3. Parent receives email with signing link
4. Parent signs on their device or in-person tablet
5. System records parent identity and consent
6. Minor can then be checked in for jump activities`,
    updatedAt: '2026-03-20',
  },
  {
    id: 'k-009', category: 'waiver-rules', title: 'Waiver Compliance Reporting',
    preview: 'How to generate waiver compliance reports and handle audit requests.',
    content: `## Waiver Compliance Reporting

### Daily Compliance Check
The system runs a daily check at 6 AM and flags:
- Athletes with waivers expiring within 7 days
- Athletes who jumped without a valid waiver (critical alert)
- Waivers pending signature for more than 48 hours

### Reports
Navigate to Reports > Waiver Compliance to see:
- Total active waivers vs total active athletes
- Compliance percentage
- List of non-compliant athletes with details
- Expiring waivers timeline chart

### Audit Trail
Every waiver action is logged:
- Signature timestamp and IP address
- Device fingerprint
- Guardian verification (for minors)
- Any DZ Manager overrides with reason`,
    updatedAt: '2026-04-07',
  },
  // AFF & Courses
  {
    id: 'k-010', category: 'aff-courses', title: 'AFF Level Requirements',
    preview: 'Detailed requirements for each AFF level from 1 through 8 and the graduation checkride.',
    content: `## AFF Level Requirements

### Level 1 - First Jump
- Ground school complete (minimum 6 hours)
- Two AFFI instructors on jump
- Demonstrate: stable exit, altitude awareness, practice pulls, controlled deployment
- Altitude: 10,500ft minimum

### Level 2 - Released Free Fall
- One AFFI instructor
- Demonstrate: solo stability, heading awareness, practice pulls
- Must hold heading within 45 degrees

### Level 3 - Turns
- 90-degree turns left and right
- Altitude awareness within 500ft
- Smooth deployment at assigned altitude

### Levels 4-7 - Progressive Skills
- Level 4: 360-degree turns, forward movement
- Level 5: Figure-8 turns, tracking
- Level 6: Front and back loops
- Level 7: Dive exit, linked maneuvers

### Level 8 - Checkride
- 15-second delay
- Complete set of maneuvers
- Self-supervised exit to deployment
- Graduation to A-License eligible`,
    updatedAt: '2026-04-06',
  },
  {
    id: 'k-011', category: 'aff-courses', title: 'Instructor Sign-off Process',
    preview: 'How instructors evaluate and sign off on student level completions.',
    content: `## Instructor Sign-off Process

### After Each Jump
1. AFFI debriefs student within 30 minutes of landing
2. Opens student record in Courses > Student > Jump Log
3. Marks each skill objective as PASS or REPEAT
4. Adds debrief notes (required for any REPEAT)
5. If all objectives PASS: level is marked COMPLETE
6. If any REPEAT: student remains at current level

### Digital Signature
- AFFI must be logged in with their own credentials
- System records AFFI name, rating number, and timestamp
- Both AFFI and student see the updated progression chart

### Disputes
- Student can request a second opinion from another AFFI
- DZ Manager makes final call on disputed sign-offs`,
    updatedAt: '2026-03-22',
  },
  {
    id: 'k-012', category: 'aff-courses', title: 'Currency Requirements for Students',
    preview: 'Time limits between student jumps and recurrency procedures.',
    content: `## Currency Requirements for Students

### Time Limits
- Less than 30 days since last jump: Current, proceed normally
- 30-60 days: Requires refresher briefing (30 min) by AFFI before next jump
- 60-90 days: Requires ground school review (2 hours) and one supervised jump
- 90+ days: Must repeat last completed level

### System Automation
The system automatically:
- Tracks days since last student jump
- Flags students approaching 30-day limit (at 21 days)
- Sends "We miss you" emails to inactive students
- Blocks check-in for students past 30 days without refresher

### Instructor Responsibility
AFFI must verify currency before manifesting any student. The system will warn but the AFFI has final authority on readiness.`,
    updatedAt: '2026-03-18',
  },
  // Tandem Workflow
  {
    id: 'k-013', category: 'tandem-workflow', title: 'End-to-End Tandem Process',
    preview: 'Complete tandem skydive workflow from booking to post-jump media delivery.',
    content: `## End-to-End Tandem Process

### 1. Booking
- Online: Customer books via portal, selects date/time, pays deposit
- Phone: Staff creates booking, sends waiver link via email
- Walk-in: Full registration at counter

### 2. Day of Jump
- Customer arrives, staff verifies booking
- Waiver completion check
- Payment balance collection
- Weight verification (scale at counter)
- Instructor assignment

### 3. Pre-Jump
- 15-minute ground briefing by TI
- Gear fitting (harness sizing, goggle fit)
- Photo/video briefing if purchased
- Load assignment

### 4. The Jump
- Board aircraft with TI
- Exit at altitude (usually 13,500ft)
- 60 seconds of freefall
- Canopy ride (5-7 minutes)
- Landing in designated tandem area

### 5. Post-Jump
- Debrief and certificate
- Media delivery (same day digital, link via email)
- Upsell: book next jump, AFF course info
- Feedback collection`,
    updatedAt: '2026-04-04',
  },
  {
    id: 'k-014', category: 'tandem-workflow', title: 'Tandem Instructor Assignment',
    preview: 'Rules and rotation system for assigning tandem instructors to bookings.',
    content: `## Tandem Instructor Assignment

### Rotation System
- TIs are assigned in round-robin order by default
- System considers: availability, rest time, passenger weight compatibility
- Minimum 30 minutes between tandem jumps per TI
- Maximum 6 tandems per TI per day

### Weight Matching
- Standard TI: passengers up to 220 lbs
- Heavy-weight certified TI: passengers up to 240 lbs
- System auto-filters TI list based on passenger weight

### Manual Override
- DZ Manager can manually assign any available TI
- Reason for override is logged
- TI can decline if they have a safety concern (documented)`,
    updatedAt: '2026-03-26',
  },
  {
    id: 'k-015', category: 'tandem-workflow', title: 'Tandem Media and Upsells',
    preview: 'Managing photo/video packages and post-jump upsell opportunities.',
    content: `## Tandem Media and Upsells

### Media Packages
- Outside Video: Dedicated camera flyer, edited video
- Handcam: TI-mounted camera, raw footage
- Photo Package: Still photos from camera flyer
- Combo: Video + Photos bundle (most popular)

### Delivery Process
1. Media captured during jump
2. Camera flyer uploads raw files post-landing
3. Editing team processes within 2 hours
4. Customer receives download link via email and SMS
5. Media accessible in customer portal for 90 days

### Upsell Opportunities
After landing, offer:
- AFF first-jump course (conversion target: 5%)
- Group booking discount for friends/family
- Gift certificates
- Annual membership (repeat tandem discount)`,
    updatedAt: '2026-03-15',
  },
  // Incident Process
  {
    id: 'k-016', category: 'incident-process', title: 'Incident Reporting Requirements',
    preview: 'When and how to file an incident report, and what qualifies as a reportable incident.',
    content: `## Incident Reporting Requirements

### What Must Be Reported
- Any injury requiring first aid or medical attention
- Equipment malfunctions (cutaways, AAD fires, partial malfunctions)
- Off-field landings
- Aircraft incidents or emergencies
- Near-misses in freefall or under canopy
- Ground incidents (vehicle, equipment, facility)

### Severity Levels
- NEAR_MISS: No harm occurred but potential existed
- MINOR: First aid only, no lost time
- MODERATE: Medical attention needed, less than 24hr recovery
- SERIOUS: Hospitalization or significant injury
- FATAL: Death or life-threatening injury

### Filing Timeline
- MINOR and NEAR_MISS: Within 24 hours
- MODERATE: Within 4 hours
- SERIOUS or FATAL: Immediately (within 1 hour)`,
    updatedAt: '2026-04-08',
  },
  {
    id: 'k-017', category: 'incident-process', title: 'Incident Investigation Workflow',
    preview: 'How Safety Officers investigate reported incidents from initial review to resolution.',
    content: `## Incident Investigation Workflow

### Stage 1: Initial Review (within 2 hours)
- Safety Officer acknowledges the report
- Assigns severity classification
- Initiates evidence preservation (video, witness list, gear impound)

### Stage 2: Investigation (1-7 days)
- Interview all involved parties
- Review video footage if available
- Inspect equipment (sent for independent inspection if needed)
- Weather data review
- Manifest and load data review

### Stage 3: Findings
- Root cause analysis
- Contributing factors identified
- Recommendations generated
- Report drafted

### Stage 4: Resolution
- Safety Officer submits findings to DZ Manager
- Corrective actions assigned
- Follow-up verification scheduled
- Report closed
- Lessons learned shared (anonymized) with staff`,
    updatedAt: '2026-04-01',
  },
  {
    id: 'k-018', category: 'incident-process', title: 'Emergency Response Procedures',
    preview: 'On-field emergency response protocols for various incident types.',
    content: `## Emergency Response Procedures

### Aircraft Emergency
1. Pilot declares emergency on radio
2. Manifest clears all ground operations
3. Emergency vehicles staged at runway
4. All jumpers accounted for via manifest board
5. Contact ATC if at towered field

### Landing Injury
1. First responder approaches with medical bag
2. Do not move injured person unless in danger
3. Assess consciousness and breathing
4. Call 911 for anything beyond first aid
5. Safety Officer notified immediately
6. Incident report filed

### Off-Field Landing
1. Ground crew tracks canopy direction
2. Contact jumper via cell phone
3. Dispatch retrieval vehicle
4. Verify jumper is uninjured
5. Recover equipment
6. Debrief upon return to DZ`,
    updatedAt: '2026-03-28',
  },
  // Event Setup
  {
    id: 'k-019', category: 'event-setup', title: 'Creating a Boogie Event',
    preview: 'Complete guide to setting up a boogie or special event in the system.',
    content: `## Creating a Boogie Event

### Planning Phase
1. Navigate to Boogies > Create Event
2. Enter event details: name, dates, description
3. Set capacity limit and registration deadline
4. Configure pricing (early bird, standard, day-of)
5. Add event schedule / agenda
6. Upload banner image and promotional materials

### Registration Setup
- Enable online registration
- Configure required fields (experience level, license type)
- Set deposit amount and payment terms
- Enable group registration option
- Configure waitlist behavior

### Operational Setup
- Assign event coordinator
- Set up dedicated loads for event activities
- Configure special landing areas if needed
- Set up scoring / competition rules if applicable

### Go-Live
- Publish event to portal
- Send announcement to athlete mailing list
- Share social media links`,
    updatedAt: '2026-03-10',
  },
  {
    id: 'k-020', category: 'event-setup', title: 'Managing Event Registrations',
    preview: 'How to process, approve, and manage event registrations and payments.',
    content: `## Managing Event Registrations

### Registration Review
1. Go to Boogies > [Event Name] > Registrations
2. Each registration shows: name, license, experience, payment status
3. Approve or waitlist based on capacity and requirements
4. System auto-approves if all criteria met (configurable)

### Payment Tracking
- Dashboard shows total collected, outstanding, refunded
- Send payment reminders with one click
- Process refunds per event cancellation policy
- Generate financial report for event

### Check-in at Event
- Dedicated event check-in screen
- Verify license and waiver on arrival
- Issue event wristband / badge
- Assign to activity groups`,
    updatedAt: '2026-03-12',
  },
  {
    id: 'k-021', category: 'event-setup', title: 'Event Day Operations',
    preview: 'Running operations during a multi-day boogie or event.',
    content: `## Event Day Operations

### Morning Briefing
- Use the event dashboard to review day's schedule
- Check weather forecast and set jumpability status
- Review load plan for the day
- Assign organizers to planned activities

### Load Management
- Event loads are color-coded on manifest board
- Priority loading rules may apply (event participants first)
- Track event-specific jump counts for competitions
- Real-time leaderboard updates

### End of Day
- Generate daily event summary report
- Update competition standings
- Send daily recap email to participants
- Review and prepare for next day's schedule`,
    updatedAt: '2026-03-14',
  },
  // Document Verification
  {
    id: 'k-022', category: 'document-verification', title: 'License Verification Process',
    preview: 'How to verify skydiving licenses and ratings in the system.',
    content: `## License Verification Process

### Accepted License Types
- USPA A, B, C, D licenses
- International equivalents (FAI, BPA, APF, etc.)
- Tandem Instructor rating
- AFF Instructor rating
- Coach rating
- Rigger certificate

### Verification Steps
1. Athlete uploads license photo or scan
2. System extracts: license number, name, issue date, expiry
3. Staff verifies details match profile
4. Mark as VERIFIED or REQUEST_RESUBMIT
5. Verified documents shown with green badge

### Expiry Tracking
- System tracks all document expiry dates
- Automated alerts at 60, 30, 14, and 7 days before expiry
- Expired documents block relevant activities (e.g., expired TI rating blocks tandem assignments)`,
    updatedAt: '2026-04-05',
  },
  {
    id: 'k-023', category: 'document-verification', title: 'Medical Declaration Requirements',
    preview: 'Medical form requirements for different athlete categories.',
    content: `## Medical Declaration Requirements

### Who Needs What
- Tandem customers: Basic medical declaration (part of waiver)
- AFF students: Detailed medical questionnaire + physician sign-off if flagged
- Licensed jumpers: Self-declaration, updated annually
- Instructors: Full medical certificate, updated every 2 years

### Flagged Conditions
The questionnaire flags these for physician review:
- Heart conditions, seizures, diabetes
- Recent surgery (within 6 months)
- Pregnancy
- Medications affecting consciousness
- Back or neck injuries

### System Handling
- Flagged athletes cannot be manifested until medical clearance uploaded
- DZ Manager can grant temporary clearance with physician phone confirmation (logged)`,
    updatedAt: '2026-03-20',
  },
  {
    id: 'k-024', category: 'document-verification', title: 'Rig Card and Reserve Data',
    preview: 'Managing rig inspection cards and reserve repack records.',
    content: `## Rig Card and Reserve Data

### Rig Cards
Every rig in the system has a digital rig card showing:
- Container make, model, serial number
- Main canopy: make, model, size, serial
- Reserve canopy: make, model, size, serial
- AAD: make, model, serial, battery expiry

### Reserve Repack Cycle
- FAA requires reserve repack every 180 days
- System tracks repack date and calculates next due
- Alerts at 30 and 14 days before due
- Overdue rigs are automatically flagged and cannot be assigned to loads

### Repack Logging
1. Rigger opens gear record
2. Enters repack details: date, seal number, rigger certificate number
3. Uploads photo of packed reserve (optional)
4. System updates next due date
5. Notification sent to rig owner`,
    updatedAt: '2026-04-03',
  },
  // Staff Operations
  {
    id: 'k-025', category: 'staff-operations', title: 'Staff Scheduling and Availability',
    preview: 'Managing daily staff schedules and availability for operations.',
    content: `## Staff Scheduling and Availability

### Setting Availability
Staff members set their availability via:
1. Dashboard > My Schedule > Set Availability
2. Mark days as Available, Unavailable, or Half-Day
3. Set preferred time blocks (AM, PM, Full Day)
4. Submit at least 1 week in advance

### DZ Manager View
The manager dashboard shows:
- Daily staff grid with all roles
- Color-coded availability (green/yellow/red)
- Minimum staffing alerts
- One-click schedule publish

### Minimum Staffing Rules
- At least 1 DZ Manager or delegated authority
- At least 2 TIs for tandem operations
- At least 1 AFFI for student operations
- At least 1 Pilot per aircraft in use
- At least 1 Manifest Staff
- Safety Officer on call (not required on-site at all times)`,
    updatedAt: '2026-03-25',
  },
  {
    id: 'k-026', category: 'staff-operations', title: 'Instructor Rating Management',
    preview: 'Tracking and renewing instructor ratings and certifications.',
    content: `## Instructor Rating Management

### Rating Types Tracked
- Tandem Instructor (TI) - Requires currency: 1 tandem per 90 days
- AFF Instructor (AFFI) - Requires currency: 1 AFF jump per 90 days
- Coach - Requires currency: 1 coached jump per 180 days
- Strong Instructor (above 500 TI jumps) - eligible for heavy-weight tandems

### Renewal Process
1. System alerts 60 days before rating expiry
2. Instructor uploads renewed rating card
3. Staff verifies with issuing organization
4. Updated in system, instructor remains active

### Lapsed Ratings
- Lapsed instructors are automatically removed from assignment pool
- Cannot be manifested for instructor duties
- Must complete recurrency requirements per organization rules`,
    updatedAt: '2026-03-22',
  },
  {
    id: 'k-027', category: 'staff-operations', title: 'End of Day Procedures',
    preview: 'Closing procedures for manifest staff at the end of operations.',
    content: `## End of Day Procedures

### Manifest Close-out
1. Verify all loads are in COMPLETE or CANCELLED status
2. Reconcile jump counts: total manifested vs total jumped
3. Process any outstanding payments
4. Handle no-shows and cancellations

### Financial Reconciliation
- Run daily sales report
- Verify cash drawer matches system total
- Process credit card batch settlement
- Note any discrepancies with explanation

### Safety Review
- Review any incidents from the day
- Ensure all incident reports are filed
- Check gear return (all rental gear accounted for)
- Lock gear room

### System Tasks
- Run end-of-day report (auto-sends to DZ Manager)
- Back up manifest data (automated)
- Set next day's weather watch alerts`,
    updatedAt: '2026-04-07',
  },
  // Weather & Restrictions
  {
    id: 'k-028', category: 'weather-restrictions', title: 'Jumpability Index Explained',
    preview: 'How the jumpability score is calculated and what each range means.',
    content: `## Jumpability Index Explained

### Score Ranges
- 80-100: Excellent conditions. Full operations.
- 60-79: Good conditions. Normal operations with awareness.
- 40-59: Marginal. Experienced jumpers only, students may be held.
- 20-39: Poor. All operations suspended except emergency.
- 0-19: Dangerous. DZ closed.

### Input Factors
The index weighs:
- Wind speed at ground (30%): Ideal < 15 mph, limit 25 mph
- Wind speed at altitude (20%): Ideal < 30 mph, limit 50 mph
- Cloud ceiling (20%): Must be above jump altitude
- Visibility (15%): Minimum 3 statute miles
- Precipitation (10%): Any precip reduces score significantly
- Temperature (5%): Extreme cold/heat affects score

### Data Sources
Primary: On-site weather station (updated every 5 min)
Secondary: METAR/TAF from nearest airport
Backup: Commercial weather API`,
    updatedAt: '2026-04-08',
  },
  {
    id: 'k-029', category: 'weather-restrictions', title: 'Weather Hold Procedures',
    preview: 'Protocol for implementing and lifting weather holds.',
    content: `## Weather Hold Procedures

### Initiating a Hold
1. Jumpability drops below 40 OR pilot reports unsafe conditions
2. DZ Manager or Safety Officer declares weather hold
3. System sets all OPEN loads to HOLD status
4. Notification sent to all checked-in athletes
5. PA announcement at DZ

### During Hold
- No new loads created
- Existing loads remain in queue (not cancelled)
- Staff monitors conditions every 15 minutes
- Updates posted to app and PA system
- Estimated resume time posted when possible

### Lifting Hold
1. Conditions improve: jumpability above 50 for 15+ minutes
2. Pilot confirms acceptable conditions
3. DZ Manager lifts hold
4. Loads return to previous status
5. Notification sent to all athletes
6. Operations resume with next load in queue`,
    updatedAt: '2026-04-06',
  },
  {
    id: 'k-030', category: 'weather-restrictions', title: 'Student Wind Limits',
    preview: 'Maximum wind speed limits for student skydivers by level.',
    content: `## Student Wind Limits

### Ground Wind Limits
- AFF Level 1-3: Maximum 10 mph sustained, 15 mph gusts
- AFF Level 4-6: Maximum 14 mph sustained, 18 mph gusts
- AFF Level 7-8: Maximum 18 mph sustained, 22 mph gusts
- A-License (new): Maximum 18 mph sustained, 22 mph gusts

### Upper Wind Limits
- All students: Maximum 30 mph at any altitude between exit and opening
- System checks winds aloft forecast before student load approval

### Enforcement
- System automatically blocks student manifesting when winds exceed limits
- AFFI can override with justification (logged)
- DZ Manager reviews all student wind overrides weekly

### Notes
- Limits are for sustained winds; gusts add additional restriction
- Crosswind component matters more than total wind speed for landing
- When in doubt, hold students. Safety first.`,
    updatedAt: '2026-04-02',
  },
  {
    id: 'k-031', category: 'weather-restrictions', title: 'Sunset and Airspace Restrictions',
    preview: 'Operational limits based on daylight, NOTAMs, and airspace.',
    content: `## Sunset and Airspace Restrictions

### Daylight Rules
- Last load call: 45 minutes before official sunset
- System auto-calculates sunset time based on DZ coordinates
- Night jumps require special authorization and equipment

### Airspace
- DZ operates within designated airspace (typically Class G or E)
- NOTAM must be active during jump operations
- System can auto-file NOTAMs (if configured with FAA integration)
- TFR (Temporary Flight Restrictions) automatically flag and block operations

### Special Events
- Airshows, VIP movements, or military exercises may restrict operations
- DZ Manager checks NOTAMs each morning as part of opening procedures
- System alerts if a new TFR is published affecting the DZ`,
    updatedAt: '2026-03-30',
  },
  {
    id: 'k-032', category: 'manifest-sop', title: 'Handling Equipment Returns',
    preview: 'Procedures for managing rental gear returns and accountability after loads.',
    content: `## Handling Equipment Returns

### Post-Jump Gear Return
1. Jumper returns to gear area after landing
2. Return all rental gear to designated rack
3. Manifest staff scans gear barcode to mark returned
4. System updates gear status from DEPLOYED to AVAILABLE

### Missing Gear
- If gear not returned within 30 minutes of landing, send reminder
- After 60 minutes, escalate to DZ Manager
- Unreturned gear blocks jumper from future manifesting
- Log all missing gear incidents

### Gear Damage
- Jumper reports any damage at return
- Staff inspects and documents
- Damaged gear marked as NEEDS_INSPECTION
- Rigger reviews before returning to service`,
    updatedAt: '2026-04-01',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [loading] = useState(false);

  const filteredArticles = useMemo(() => {
    let arts = ARTICLES;
    if (selectedCategory) {
      arts = arts.filter((a) => a.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      arts = arts.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.preview.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      );
    }
    return arts;
  }, [selectedCategory, searchQuery]);

  const handleFeedback = async (articleId: string, helpful: boolean) => {
    setFeedbackGiven((prev) => ({ ...prev, [articleId]: helpful ? 'up' : 'down' }));
    try {
      await apiPost('/assistant/knowledge/feedback', { articleId, helpful });
    } catch { /* silent */ }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant/knowledge" />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Knowledge Base</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        SOPs, guides, and operational procedures
      </p>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedArticle(null); }}
          placeholder="Search knowledge base..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Categories</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => { setSelectedCategory(null); setSelectedArticle(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                All Articles
                <span className="ml-auto text-xs opacity-60">{ARTICLES.length}</span>
              </button>
            </li>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = ARTICLES.filter((a) => a.category === cat.key).length;
              return (
                <li key={cat.key}>
                  <button
                    onClick={() => { setSelectedCategory(cat.key); setSelectedArticle(null); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      selectedCategory === cat.key
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                    <span className="ml-auto text-xs opacity-60">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            </div>
          )}

          {/* Article detail view */}
          {selectedArticle && !loading && (
            <div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> Back to articles
              </button>
              <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedArticle.title}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Updated {selectedArticle.updatedAt}
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedArticle.content.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-6 mb-3 text-gray-900 dark:text-white">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">{line.replace('### ', '')}</h3>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-700 dark:text-gray-300 text-sm">{line.replace('- ', '')}</li>;
                    if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-gray-700 dark:text-gray-300 text-sm list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="text-gray-700 dark:text-gray-300 text-sm mb-2">{line}</p>;
                  })}
                </div>

                {/* Feedback */}
                <div className="mt-8 pt-4 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 flex items-center gap-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Was this helpful?</span>
                  <button
                    onClick={() => handleFeedback(selectedArticle.id, true)}
                    className={`p-2 rounded-lg transition-colors ${
                      feedbackGiven[selectedArticle.id] === 'up'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFeedback(selectedArticle.id, false)}
                    className={`p-2 rounded-lg transition-colors ${
                      feedbackGiven[selectedArticle.id] === 'down'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Article list */}
          {!selectedArticle && !loading && (
            <>
              {filteredArticles.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No articles found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Try a different search or category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredArticles.map((article) => {
                    const catDef = CATEGORIES.find((c) => c.key === article.category);
                    return (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="w-full text-left p-4 bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {catDef?.label || article.category}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {article.title}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{article.preview}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 whitespace-nowrap">{article.updatedAt}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
