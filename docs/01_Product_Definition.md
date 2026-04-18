# SKYLARA

_Source: 01_Product_Definition.docx_

SKYLARA
The Global Operating System for Flying
PRODUCT DEFINITION DOCUMENT
Modules · Features · User Flows · Acceptance Criteria
v1.0  ·  April 2026  ·  CONFIDENTIAL
# Table of Contents
§0    PRODUCT OVERVIEW
Three Layers · 11 Modules · 8 Roles · Real DZ Operations
## 0.1  The Three Platform Layers
## 0.2  User Roles & Permissions Summary
## 0.3  The 11 Product Modules
§1    MANIFEST & LOAD MANAGEMENT
The Operational Core — Real-Time Load Board · FSM · CG Gate · Exit Order
## 1.1  Feature List
## 1.2  User Flow — Create Load & Build to Takeoff
Actors: Manifest Staff · DZ Operator · Athletes · Pilot
Trigger: Staff creates a new load at start of operations or when prior load departs
§2    CHECK-IN & COMPLIANCE ENGINE
8-Point Safety Grid · QR Scan · License Verification · Gear Check
## 2.1  Feature List
## 2.2  User Flow — Athlete Arrival & Check-In
Actors: Athlete · Manifest Staff or S&TA · System
Trigger: Athlete arrives at DZ and approaches manifest desk
## 2.3  User Flow — Gear Check (Rigger / S&TA)
Actors: Rigger or S&TA · Athlete · System
§3    ATHLETE IDENTITY & LOGBOOK
Portable Identity · Digital Logbook · AFF Progression · Currency Tracking
## 3.1  Feature List
## 3.2  User Flow — Post-Jump Log Entry
Actors: Athlete · Instructor (optional sign-off) · System
Trigger: Athlete lands from a jump
§4    PAYMENTS & WALLET
Jump Ticket Escrow · Stripe Connect · Commission Splits · EOD Reconciliation
## 4.1  Feature List
## 4.2  User Flow — Athlete Purchases Jump Tickets
Actors: Athlete · Payment Service · Stripe · System
§5    BOOKING & SCHEDULING
Online Pre-Booking · Tandem & AFF Packages · Availability Management
## 5.1  Feature List
## 5.2  User Flow — Tandem Student Online Booking
Actors: Customer (future tandem student) · DZ Operator (indirect) · System
Trigger: Customer finds DZ on SkyLara marketplace or direct DZ link
§6    NOTIFICATIONS & COMMS
Call Times · Weather Holds · Announcements · Marketing Campaigns
## 6.1  Feature List
§7    AI & INSIGHTS
Load Optimizer · Risk Alerts · Predictive Scheduling · Revenue Intelligence
## 7.1  Feature List
## 7.2  User Flow — Risk Alert in Action
Actors: AI System · Manifest Staff · DZ Operator
Trigger: Background risk scan runs every 5 minutes on all active DZs
§8    WEATHER & AIRSPACE
METAR · TAF · Automated Hold Detection · Forecast Scheduling
## 8.1  Feature List
§9    STORY & SOCIAL
Athlete Identity · Jump Timeline · Achievements · Community Feed
## 9.1  Feature List
## 9.2  User Flow — Milestone Moment (100th Jump)
Actors: Athlete · System · Social Feed
Trigger: Athlete submits their 100th jump log entry
§10    SHOP & MARKETPLACE
DZ Gear Store · Inventory · Athlete Purchases · Future Consignment
## 10.1  Feature List
§11    MULTI-DZ & PLATFORM ADMIN
Branch Management · Cross-DZ Identity · SaaS Admin · Billing
## 11.1  Feature List
## 11.2  User Flow — DZ Operator Onboarding
Actors: DZ Operator · Platform Admin (background) · System
Trigger: Operator signs up for SkyLara at skylara.com/operators
§12    ACCEPTANCE CRITERIA
Definition of Done per Module · QA Gates · Safety-Critical Tests
## 12.1  Safety-Critical Acceptance Criteria (Non-Negotiable)
## 12.2  Performance Acceptance Criteria
## 12.3  Build Priority Summary

| Attribute | Detail |
| --- | --- |
| Role | Product Manager + Engineering Advisory |
| Builds On | SkyLara_ProductionBlueprint_v4.docx (Architecture, DB, Offline, AI) |
| Purpose | Define every module, feature, user story, and user flow for development |
| Audience | Engineering, Design, QA, Investors |
| Total Modules | 11 product modules across 3 platform layers |
| Total User Flows | 18 end-to-end flows covering all primary DZ operations |
| Roles Covered | DZ Operator, Manifest Staff, TI/AFFI, Pilot, Rigger, Athlete, Student, Admin |

| Layer | Description | Primary Users | Revenue Driver |
| --- | --- | --- | --- |
| Layer 1 — Operations (DMS) | Real-time dropzone management: loads, manifest, check-in, CG, call times, compliance | DZ Operator, Manifest Staff, Pilot, Rigger | SaaS subscription per DZ |
| Layer 2 — Platform | Payments, identity, booking, multi-DZ, shop, weather, AI | All roles | Transaction fees + marketplace commission |
| Layer 3 — Story | Athlete identity, jump timeline, milestones, social feed, community | Athletes, Students, Coaches | Athlete engagement → DZ retention |

| Role | Description | Key Capabilities | Mobile Priority |
| --- | --- | --- | --- |
| DZ Operator | Owner or manager of the dropzone | Full admin: pricing, aircraft, staff, reports, AI insights, announcements | High — dashboard on phone |
| Manifest Staff | Front desk / manifest desk operators | Build loads, assign slots, run check-in, CG sign-off, manage waitlist, call times | Critical — primary work device |
| Tandem Instructor (TI) | USPA-rated tandem instructor | View assigned students, manage student bookings, submit post-jump notes | Medium — view loads, call times |
| AFF Instructor (AFFI) | USPA-rated AFF instructor | View assigned AFF students, submit level evaluations, co-manifest | Medium — view loads, evals |
| Pilot | Aircraft pilot for jump operations | View load manifest, confirm boarding, log flight times, aircraft status | Low — view-only mostly |
| Rigger / S&TA | FAA rigger, USPA S&TA safety officer | Gear checks, repack tracking, license verification, exit order config | Medium — gear check on tablet |
| Licensed Athlete | A/B/C/D licensed skydiver | Self-manifest, view load board, jump log, story profile, wallet, shop | High — everything on phone |
| Student | AFF or tandem student | Pre-book, view progression, call time alerts, story profile starter | High — booking + status on phone |

| # | Module | Layer | Core Problem Solved |
| --- | --- | --- | --- |
| 1 | Manifest & Load Management | Operations | Replaces paper manifest board, eliminates miscommunication, enforces safety |
| 2 | Check-In & Compliance Engine | Operations | Replaces manual clipboard, enforces license/gear/weight compliance at entry |
| 3 | Athlete Identity & Logbook | Platform | Portable, verified jumper identity across all dropzones globally |
| 4 | Payments & Wallet | Platform | Jump ticket escrow, commission splits, EOD reconciliation, Stripe Connect |
| 5 | Booking & Scheduling | Platform | Online pre-booking for tandems/AFF, availability management, packages |
| 6 | Notifications & Comms | Platform | Automated call times, weather holds, announcements, marketing campaigns |
| 7 | AI & Insights | Platform | Operational intelligence: load optimization, risk alerts, predictive scheduling |
| 8 | Weather & Airspace | Platform | Real-time aviation weather, automated hold detection, forecast-based scheduling |
| 9 | Story & Social | Story | Athlete profile, jump timeline, milestones, social feed, DZ community |
| 10 | Shop & Marketplace | Platform | DZ gear/apparel store, inventory, athlete purchases, future consignment |
| 11 | Multi-DZ & Admin | Platform | Branch management, cross-DZ identity, platform admin, SaaS billing |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Load Creation | Create a load: select aircraft, altitude, slot count. System assigns load ID and sets status OPEN. | P0 | 1 |
| Real-Time Load Board | Live view of all active loads with status, slots filled, aircraft, call time, exit group summary. WebSocket-driven. | P0 | 1 |
| Slot Assignment | Add an athlete to a load: search by name or USPA#, select jump type, assign slot. Validates compliance before adding. | P0 | 1 |
| Load FSM | 11-state finite state machine: OPEN→FILLING→LOCKED→30MIN→20MIN→10MIN→BOARDING→AIRBORNE→LANDED→COMPLETE|CANCELLED | P0 | 1 |
| CG Blocking Gate | Enter jumper weights, fuel, pilot weight. Calculate CG. PASS required before LOCKED→30MIN transition. | P0 | 1 |
| Exit Order Engine | Auto-assign exit groups (1–9) based on jump type. Configurable by S&TA. AI validates on lock. | P0 | 1 |
| Waitlist Management | Athletes join waitlist. On no-show (5-min timer), first waitlist athlete gets push notification. 5-min claim window. | P0 | 1 |
| Call Time Automation | Automated push/SMS at 30MIN, 20MIN, 10MIN, BOARDING states. Staff can override and send manually. | P0 | 1 |
| Load Cancellation | Cancel load at any state. Refund jump tickets. Notify all manifested athletes. Log reason. | P0 | 1 |
| No-Show Handling | Mark athlete no-show. Ticket deducted or not per DZ policy. Slot opens for waitlist. | P1 | 1 |
| Load Notes | Staff adds notes to a load (weather advisory, special instructions). Visible to all staff on that load. | P1 | 1 |
| Pilot Briefing Sheet | Auto-generated PDF: load ID, aircraft, jump count, exit order by group, call time. Sent to pilot on BOARDING. | P1 | 2 |
| Multi-Aircraft Loads | Assign one load to a specific aircraft. Different loads can run simultaneously on different aircraft. | P0 | 1 |
| Load Templates | Save common load configurations (e.g. "Sunset 14K — Twin Otter Full") for quick recreation. | P2 | 3 |
| Load History | Searchable history of all past loads with jump counts, revenue, completion status. | P1 | 2 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | STAFF | Opens Load Board → taps "New Load" | Modal opens: select aircraft, altitude, slot count, scheduled time | If no aircraft available → show MX Hold status, block creation |
| 2 | SYSTEM | Validates aircraft status (not MX Hold) | Creates Load record (status=OPEN), broadcasts via WebSocket to all staff clients | Aircraft MX Hold → show reason, suggest alternative aircraft |
| 3 | STAFF | Searches athlete by name or USPA# → adds to load | Compliance check runs: license valid? currency OK? weight OK? waiver signed? | FAIL → show specific block reason (e.g. "Currency expired 3 days ago"). Option to override with reason (logs to override_log) |
| 4 | SYSTEM | Slot assigned → load status moves OPEN→FILLING | Athlete receives push: "You are manifested on Load #14, 14,000ft, ~2pm" | Duplicate slot → reject with "Already manifested on this load" |
| 5 | STAFF | Continues adding athletes until capacity | Slot counter updates in real-time. Waitlist button appears at capacity. | If athlete not found → option to create walk-up profile |
| 6 | STAFF | Taps "Lock Load" when ready | Compliance re-check on all slots. System prompts for CG check if not completed. | Any failed compliance → list of athletes flagged, staff must resolve before lock |
| 7 | STAFF | Runs CG Check: enters fuel weight, pilot weight. System shows calculated CG. | CG result displayed: PASS (green) / MARGINAL (amber) / FAIL (red). PASS required to proceed. | FAIL → cannot advance to 30MIN. Staff must adjust: remove athlete, reduce fuel, or get override from DZ Operator |
| 8 | STAFF | Signs off CG → advances load to 30MIN state | System sends 30-min push/SMS to all athletes on load: "Load #14 — gear up, 30 minutes to jump!" | If athlete has notifications off → flag on manifest board for staff to verbally notify |
| 9 | SYSTEM | Auto-sends 20MIN notification at correct time | Athletes receive "Board soon — 20 minutes" | If weather hold triggered → pause countdown, send "Weather hold on Load #14" |
| 10 | SYSTEM | Auto-sends 10MIN notification | Athletes receive "Board now — 10 minutes" | Staff can override timing manually |
| 11 | STAFF | Confirms all athletes boarded → advances to BOARDING | Sends pilot briefing sheet (auto-PDF). Pilot view shows load manifest. | No-show detected → 5-min waitlist claim window opens automatically |
| 12 | PILOT | Confirms aircraft airborne → advances to AIRBORNE | Load board shows AIRBORNE. Timer starts. All stakeholders see status. | If pilot cannot confirm → staff can advance manually |
| 13 | PILOT/STAFF | Confirms landing → advances to LANDED | Athletes receive "Welcome back!" notification. Jump logs prompted. | If landing not confirmed in 90min → alert sent to DZ Operator |
| 14 | SYSTEM | Reconciles all slots (JUMPED / NO_SHOW). Tickets settled. | Load moves to COMPLETE. Revenue logged. EOD report updated. | Unresolved slots → flag in EOD report for manual review |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| QR Code Check-In | Each athlete has a unique QR code (on app or printed). Staff scans on arrival. Runs full compliance check. | P0 | 1 |
| 8-Point Compliance Grid | Checks: (1) License valid, (2) License currency, (3) Weight ≤ DZ limit, (4) Waiver signed, (5) USPA membership active, (6) Gear check current, (7) Reserve in-date, (8) AAD not expired. | P0 | 1 |
| Manual Search Check-In | Staff types name or USPA# to check in without QR scan. | P0 | 1 |
| Walk-Up Registration | Create a new athlete profile on arrival. Collect: name, USPA#, license class, weight, emergency contact, waiver. | P0 | 1 |
| Waiver Management | Digital waiver displayed on athlete device or kiosk. Signed and timestamped. Stored as PDF to S3. | P0 | 1 |
| Gear Check Logging | Rigger or S&TA logs gear check per jump: reserve in-date, AAD armed, container serviceable, closing loop OK. | P0 | 1 |
| Student Pre-Check | For tandem/AFF students: weight verified, health declaration, waiver signed, TI assigned. | P0 | 1 |
| Override & Flag System | Staff can override any compliance block with mandatory reason. Logged to override_log with user ID, timestamp. | P0 | 1 |
| Compliance History | Full audit trail of all check-in results per athlete per DZ per day. | P1 | 2 |
| Re-Check Trigger | If athlete was checked in >4 hours ago, system prompts fresh check before re-manifesting. | P1 | 2 |
| USPA Verification Tiers | 5-tier system: Self-Reported → Staff Visual → Staff Entry → Photo Upload → Future API. | P0 | 1 |
| Compliance Dashboard | DZ Operator sees summary: athletes checked in today, compliance passes/fails, overrides used. | P1 | 2 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | ATHLETE | Opens SkyLara app → taps "Check In" → QR code displayed on screen | App generates display QR from athlete UUID. No network required (cached). | App not installed → athlete gives name, staff searches manually |
| 2 | STAFF | Scans QR with SkyLara staff app (tablet or phone) | System pulls athlete profile. Runs 8-point compliance check in <1 second. | Scan fails → manual name search fallback |
| 3 | SYSTEM | Displays compliance result per check point | Green = pass. Red = fail with specific reason. Amber = advisory. | All green → auto-approve check-in. Any red → block with details |
| 4 | SYSTEM (if block) | Specific fail reason shown: e.g. "Reserve repack overdue — last pack 182 days ago (limit 180)" | Staff sees exact issue and suggested action | Weight over limit → show DZ weight policy, option to verify on scale |
| 5 | STAFF | Reviews any advisories or failures | Staff can: (a) resolve issue with athlete, (b) override with reason (logged), (c) deny entry | Waiver not signed → kiosk or athlete phone presents waiver for immediate digital signature |
| 6 | ATHLETE | Signs waiver on their phone or staff tablet (if needed) | Waiver PDF generated and stored to S3. Signed_at timestamp recorded. | Waiver already signed today → skip this step automatically |
| 7 | SYSTEM | Check-in marked COMPLETE | Athlete status = CHECKED_IN. Athlete can now be manifested on a load. Logbook shows "At [DZ Name] today". | If offline → check-in queued locally, synced on reconnect. Last-known compliance cache used. |
| 8 | ATHLETE | Receives confirmation on app: "Checked in at Elsinore. You are cleared for 14,000ft." | App shows current open loads at this DZ, wallet balance, any DZ announcements. | First visit to this DZ → "Welcome to [DZ]!" message + DZ info card shown |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | RIGGER | Opens SkyLara app → Gear Check tab → scans athlete QR or searches name | Athlete gear bag displayed: all registered gear items with status badges. | Gear not registered → option to add new gear item on the spot |
| 2 | RIGGER | Selects gear to inspect: container, reserve, AAD, helmet, altimeter | Each item shows last check date, reserve repack date, AAD expiry. | Reserve overdue → item flagged red, cannot be approved for this jump |
| 3 | RIGGER | Taps each check point: Reserve in-date | AAD armed | Container serviceable | Closing loop OK | Handles present | Each tap records individual pass/fail per point. | Any single fail → gear_checks record result=FAIL. Athlete blocked from slot until resolved. |
| 4 | SYSTEM | Gear check record created (gear_check_id). Linked to athlete slot on current load. | Slot.gear_check_id populated. Staff manifest view shows gear check badge (green). | If gear check done >2 loads ago → prompt re-check |
| 5 | RIGGER | Submits gear check | Athlete notified: "Gear check passed — you are cleared to jump." | FAIL → athlete notified: "Gear check issue: [reason]. See the rigger before boarding." |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Athlete Profile | Name, avatar, license class, jump count, home DZ, years jumping, disciplines, emergency contact. | P0 | 1 |
| USPA License Registry | Store A/B/C/D/E licenses + AFF + Coach + TI + AFFI ratings. 5-tier verification. Expiry tracking. | P0 | 1 |
| Currency Engine | Auto-calculates currency from logbook: A/B = 90-day, C/D = 180-day. Block at check-in if expired. | P0 | 1 |
| Digital Logbook | Per-jump record: date, DZ, aircraft, altitude, jump type, exit type, freefall seconds, deployment altitude, canopy used, landing notes, coach sign-off. | P0 | 1 |
| AFF Progression Tracker | 8-level tracker (L1–L8 + A-license). Per-level: pass/fail, evaluations, instructor, date, video link. | P0 | 1 |
| Gear Registry | Register owned gear: container, reserve (with repack date), AAD (with expiry), helmet, altimeter. Reserve and AAD alerts. | P0 | 1 |
| Jump Count Milestones | Auto-detect milestone jumps (1st, 25th, 100th, etc.). Flag in logbook and trigger story post. | P1 | 4 |
| Multi-DZ History | Jumps logged across all DZs aggregate into one logbook. DZ logos shown per entry. | P0 | 1 |
| Logbook Export | Export logbook as PDF or CSV. USPA IRM-compliant format. | P1 | 2 |
| Coach Sign-Off | Instructor signs off jump from their own app view. Digital signature recorded. | P1 | 2 |
| Emergency Contact | Stored on profile. Visible to DZ staff at check-in and on manifest. Never shared publicly. | P0 | 1 |
| Visibility Controls | Athlete controls what is public (jump count, DZs visited) vs private (weight, emergency contact). | P1 | 4 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | SYSTEM | Load status transitions to LANDED | Push notification to all athletes on load: "Welcome back! Log your jump and share your story." | If athlete had notifications off → logbook prompt shown next time app opens |
| 2 | ATHLETE | Taps notification → opens Jump Log form (pre-filled from load data) | Form pre-populated: date, DZ, aircraft, altitude, jump type from slot record. | No app → can log via web browser with same experience |
| 3 | ATHLETE | Adds personal details: freefall time, deployment altitude, canopy, landing quality, free text notes, photo/video link | Optional fields. Only mandatory: confirm jump type and altitude (already pre-filled). | Athlete can skip and log later — draft saved automatically |
| 4 | ATHLETE | Taps "Submit Jump" | LogEntry created. Jump count incremented. Currency timer reset. Milestone check runs. | If milestone hit → milestone card created and shown: "Jump #100! You've reached triple digits." |
| 5 | SYSTEM | Checks if instructor sign-off is needed (AFF jump) | If AFF jump: notification sent to assigned AFFI: "[Athlete] has submitted their L4 jump log. Please review and sign off." | If AFFI offline → sign-off request queued, reminder sent after 24h |
| 6 | INSTRUCTOR | Opens sign-off request → reviews jump notes → taps "Sign Off" or "Request Revision" | Sign-off recorded with instructor ID and timestamp. Athlete notified. | Revision requested → athlete sees instructor notes, can update and resubmit |
| 7 | SYSTEM | Jump log finalized. Story post option offered. | Athlete sees: "Share your jump to your story feed?" with preview of auto-generated post. | Athlete taps "Share" → Story post created (type=JUMP_LOG, visibility default=Public) |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Jump Ticket Wallet | Each athlete has a wallet. Tickets are pre-purchased and deducted per jump. Balance visible on app. | P0 | 2 |
| Ticket Purchase (Online) | Buy jump tickets via Stripe: single jump or 10-packs. Card on file, Apple Pay, Google Pay supported. | P0 | 2 |
| Ticket Purchase (At DZ) | Staff sells tickets at manifest desk: card, cash (recorded manually), gift card redemption. | P0 | 2 |
| Walk-Up Payment | Athlete pays for individual jump at time of manifesting. Ticket auto-created and deducted. | P0 | 2 |
| Commission Splits | Per transaction: auto-calculate DZ % and instructor % (configurable, e.g. 70/30). Logged to commission_splits. | P0 | 2 |
| Refund Engine | Full or partial refund on cancellation, no-show (per DZ policy), or weather cancellation. Reversal record created. | P0 | 2 |
| Gift Cards | DZ creates gift card codes. Athlete redeems at checkout. Partial use supported. Balance tracked. | P1 | 3 |
| EOD Reconciliation | End-of-day report: gross revenue, net after fees, ticket counts, cash drawer expected vs actual, variance alerts. | P0 | 2 |
| Stripe Payouts | DZ operator receives weekly payouts via Stripe Connect. Instructor splits paid on settlement. | P0 | 2 |
| Gear Rental Billing | Rental items added to jump ticket or charged separately. Damage deposit hold via Stripe. | P1 | 3 |
| Transaction History | Athlete sees full transaction history: purchases, deductions, refunds, splits received. | P0 | 2 |
| Pricing Config | DZ Operator sets prices per jump type, altitude, and gear rental. Applied at slot creation. | P0 | 1 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | ATHLETE | Opens app → Wallet tab → taps "Buy Tickets" | Ticket options shown: singles and 10-packs by altitude. DZ pricing applied. | If not at a DZ → prompted to select home DZ or nearby DZ for pricing |
| 2 | ATHLETE | Selects ticket type → proceeds to checkout | Stripe payment sheet presented (card on file, Apple Pay, Google Pay). | No payment method → add card flow (Stripe hosted) |
| 3 | ATHLETE | Confirms payment | Stripe payment intent created. Status=PENDING. | Card declined → Stripe returns decline reason. Athlete prompted to try another method. |
| 4 | SYSTEM | Stripe webhook: payment.captured received | Event written to event_outbox in same DB transaction as jump_ticket creation. Outbox relay publishes to Redis Streams. | Webhook delivery failure → Stripe retries 3 days. Outbox ensures no loss even if relay briefly down. |
| 5 | SYSTEM | Wallet balance updated. Ticket record created (status=ACTIVE). | Athlete receives push: "Payment confirmed! 10 x 14,000ft tickets added to your wallet. Balance: 11 tickets." | Race condition: payment received twice → idempotency key on Stripe payment intent prevents double credit |
| 6 | SYSTEM | Transaction record created. Commission_splits record created (DZ 100% for ticket purchase — split happens at jump settlement). | Athlete can view ticket in wallet immediately. | If system offline at time of webhook → Redis Streams consumer retries processing on reconnect |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Tandem Booking | Public-facing booking page for tandem experiences. Select date, altitude, video package. Pay online. | P0 | 2 |
| AFF Booking | Online AFF enrollment: select package (full L1–L7 or individual levels), schedule first jump date. | P0 | 2 |
| Availability Calendar | DZ Operator sets available slots per day/time. Booking page shows real availability. | P0 | 2 |
| Package Builder | Operator creates packages: Tandem + video, AFF complete, gift experience. Configurable pricing. | P1 | 2 |
| Booking Confirmation | Automated email + push: booking details, what to bring, directions, weather policy. | P0 | 2 |
| Pre-Jump Instructions | Auto-sent 24h before: arrival time, what to wear, weight limit reminder, waiver link. | P0 | 2 |
| Reschedule / Cancel | Customer can reschedule or cancel online up to DZ-configured cutoff (e.g. 24h prior). | P0 | 2 |
| Group Bookings | Book multiple tandem students (e.g. 4 friends). Assign to same load. | P1 | 3 |
| Weather Cancellation Policy | DZ configures policy: full refund, credit, or reschedule on weather cancel. | P0 | 2 |
| Booking Integration to Manifest | Booking automatically creates a reserved slot when DZ builds a load for that date. | P0 | 2 |
| Operator Booking Dashboard | View all upcoming bookings by date, type, status. Search, filter, export. | P0 | 2 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | CUSTOMER | Visits DZ booking page (skylara.com/dz/elsinore or embed on DZ website) | Booking page shows DZ info, tandem options, availability calendar, pricing. | DZ not on SkyLara → not applicable. Operator must have active account. |
| 2 | CUSTOMER | Selects date on calendar → selects altitude (14K standard) | Available slots shown for that date. If full → "Join waitlist" option. | Sold out → waitlist: capture email, notify if slot opens |
| 3 | CUSTOMER | Adds video package (optional) → reviews total | Order summary shown with DZ cancellation/weather policy. | Promo code field → validates against gift_cards or discount codes |
| 4 | CUSTOMER | Enters personal details: name, email, phone, weight (self-reported) | Weight checked against DZ limit. If over → polite message: "Please contact us directly." (not automated rejection) | Weight advisory (within 10 lbs of limit) → note shown, DZ notified |
| 5 | CUSTOMER | Pays online via Stripe | Payment captured. Booking record created (status=CONFIRMED). | Payment fail → retry with different method. No booking until payment captured. |
| 6 | SYSTEM | Booking confirmation email sent with: date, time, what to bring, DZ address, cancellation link, waiver link. | Booking appears in DZ Operator booking dashboard. | Booking made <24h before jump → immediate pre-jump instructions sent too |
| 7 | SYSTEM | 24h before: reminder email + push (if app installed): arrival instructions, weather check link, weight reminder. | DZ Operator can see all bookings for tomorrow on dashboard. | Weather looks bad → operator can trigger weather hold communication from dashboard |
| 8 | CUSTOMER (day of) | Arrives at DZ → check-in scans QR or searches booking confirmation number | System matches booking to new athlete profile (or existing if email matches). Runs compliance check. | First-time → walk-up profile created from booking data. Weight verified by staff. |
| 9 | STAFF | Assigns student to load with their TI | Booking status → FULFILLED. TI notified of student assignment. | If assigned TI unavailable → staff reassigns from available TI pool |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Automated Call Times | Push + SMS at load state transitions: 30MIN, 20MIN, 10MIN, BOARDING. Athlete-specific (only on their load). | P0 | 1 |
| Weather Hold Alerts | DZ-wide push/SMS: "Weather hold — all loads paused. Will update in 30 minutes." | P0 | 1 |
| Weather Clear Alerts | Resumption notification when hold lifted. Includes next expected load time. | P0 | 1 |
| DZ Announcements | Operator sends push to all athletes currently checked in at DZ. Also visible on athlete app home. | P0 | 1 |
| Booking Notifications | Confirmation email, reminder email, reschedule/cancel confirmations — all automated. | P0 | 2 |
| Compliance Alerts | Athlete notified: license expiring in 30/7/1 days, reserve repack due in 30 days, AAD expiry. | P0 | 1 |
| Waitlist Notifications | Athlete notified when waitlist slot opens. 5-minute claim window, then next athlete. | P0 | 1 |
| Marketing Campaigns | DZ Operator creates campaigns: email blast to past customers, social media post scheduling. | P1 | 6 |
| Social Media Integration | Connect Instagram, Facebook page. Auto-post: student first jumps (with consent), milestones, DZ news. | P1 | 6 |
| WhatsApp Broadcast | Opt-in WhatsApp groups for DZ regulars. Send weather, cancellations, events. | P1 | 6 |
| Notification Preferences | Athlete controls: push yes/no, SMS yes/no, email yes/no, per notification type. | P0 | 1 |
| Delivery Tracking | Every notification has delivery record: QUEUED → SENT → DELIVERED → FAILED. Staff can see status. | P1 | 2 |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Load Optimizer | On load creation or slot change: Claude analyzes jump mix, instructor-student match, payload. Recommends optimal arrangement. | P1 | 5 |
| Risk Alert Engine | Continuous scan: expired currency boarding, weight imbalance, TI over daily limit, exit order conflict. Pre-computed every 5 min. | P0 | 5 |
| Exit Order Validator | On load lock: validates exit order against safety rules. Flags conflicts. Suggests correction. | P0 | 5 |
| Predictive Scheduling | Daily at 06:00 local: recommends load schedule based on bookings, historical demand, weather forecast, staff roster. | P1 | 5 |
| Revenue Insights (Weekly) | Jump mix analysis, pricing recommendations, slow-day patterns, peak utilization stats. | P1 | 5 |
| Staffing Recommender | On shift change: suggests instructor/pilot assignments based on workload, qualifications, prior assignments. | P2 | 5 |
| Weather-Based Decisions | AI interprets weather data: "Good window 10am–2pm. Recommend 4 loads. Probability of hold after 3pm: 70%." | P1 | 5 |
| Anomaly Detection | Flags unusual patterns: no-show spike, revenue variance, repeated compliance failures from same athlete. | P1 | 5 |
| AI Assistant (Operator) | Context-aware chat: "How many tandems did we do last Saturday vs this Saturday?" Queries reporting data. | P2 | 7 |
| Insight Acknowledgement | Operator/staff taps "Acknowledge" on each insight. Dismissed insights logged for AI feedback loop. | P1 | 5 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | AI SYSTEM | Scans all active loads: checks currency, weight balance, exit order, TI load counts | Risk scoring engine runs rule-based checks first (fast, always-on), then Claude for complex assessment. | If Claude API unavailable → rule-based alerts continue. AI-enhanced alerts skip gracefully. |
| 2 | AI SYSTEM | Detects: "Load #18 — TI Jake Torres has 8 tandem assignments today. FAA recommends max 10, but risk increases at 8+. Current: 8." | Creates ai_insights record (type=RISK_ALERT, priority=HIGH). | Low priority alerts buffered and shown in batch. HIGH/CRITICAL shown immediately. |
| 3 | STAFF | Manifest board shows amber risk badge on Load #18. Taps to view. | Alert detail shown: "Instructor fatigue risk — Jake T. at 8 tandems. Consider reassigning student #9 to Sofia R. (4 tandems today)." | Staff dismisses if already aware → logged to feedback, Claude learns from dismissals |
| 4 | STAFF | Accepts recommendation → reassigns student to Sofia R. | Slot updated. Instructor notification sent: "Student [Name] reassigned to your name for Load #18." | Sofia unavailable → staff searches available TIs manually |
| 5 | AI SYSTEM | Re-scans load → risk resolved → alert cleared | Manifest board badge cleared. Insight marked resolved in ai_insights. | If staff ignores HIGH alert → escalate to DZ Operator notification after 15 minutes |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Real-Time METAR | Current weather at DZ airport: wind speed/direction, gusts, visibility, cloud base, temperature. Refreshed every 5 min. | P0 | 5 |
| TAF Forecast | Terminal aerodrome forecast: 24-hour aviation weather. Shown on operator dashboard and schedule view. | P0 | 5 |
| Jump Run Suitability | AI interprets weather: traffic light indicator (Green=jump, Amber=marginal, Red=hold). Shown on load board. | P1 | 5 |
| Auto Hold Recommendation | If wind > DZ configured limit OR cloud base < DZ minimum: system recommends hold to operator. Operator must confirm. | P0 | 5 |
| Manual Hold Creation | Operator creates weather hold manually. All athletes at DZ notified. Affected loads paused. | P0 | 1 |
| Hold Cleared Alert | Operator clears hold. Athletes notified with estimated resume time. | P0 | 1 |
| NOTAM Feed | Active NOTAMs for DZ ICAO shown on ops dashboard. Staff can dismiss after review. | P1 | 5 |
| Historical Weather | View past weather for any date. Correlate with revenue and jump count. Input to AI scheduling. | P2 | 7 |
| Weather Widget (Athlete) | Athlete app home shows current conditions at their home DZ or nearest DZ. | P1 | 5 |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Athlete Story Profile | Hero card: name, avatar, license badge, jump count, years flying, home DZ, discipline tags, story tagline. | P0 | 4 |
| Journey Map | Interactive map showing all DZs jumped at. Pin count per DZ. Tap to see jumps there. | P1 | 4 |
| Jump Timeline Feed | Chronological feed of logged jumps, interspersed with milestone cards. Tap any entry for full detail. | P0 | 4 |
| Milestone Cards | Auto-generated at: 1st, 25th, 50th, 100th, 200th, 500th, 1K, 2K, 5K, AFF graduation, new license, first international jump. | P0 | 4 |
| Achievement Badges | Earn badges: Milestones, Discipline, Community, DZ-Specific, Gear. Displayed on profile. | P1 | 4 |
| Story Posts (Manual) | Athlete writes a free-form story post about any jump, experience, or journey moment. Text + photos/video. | P0 | 4 |
| Social Feed | Combined feed: your jumps, followed athletes' jumps, DZ announcements, milestone cards. | P1 | 4 |
| Follow / Connect | Follow other athletes. See their public story feed. Receive their milestone notifications. | P1 | 4 |
| DZ-Specific Achievements | DZ Operator creates custom achievements: "Eloy 100 Club", "First Solo at Perris". Own icon and criteria. | P1 | 4 |
| Share Jump | Share individual jump or milestone to Instagram, copy link, or send via WhatsApp. | P1 | 4 |
| Privacy Controls | Each story post: Public / DZ members only / Private. Jump count: show/hide. Weight: always private. | P0 | 4 |
| Instructor Mentions | Athlete can tag their instructor in a jump post. Instructor notified, post appears in their mentions. | P2 | 4 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | ATHLETE | Submits jump log for jump #100 | System detects milestone: total_jumps = 100. | If athlete has milestone sharing turned off → milestone card still created but not auto-posted |
| 2 | SYSTEM | Creates milestone card: "Jump #100! Welcome to the Triple Digit Club." | Achievement earned: "Triple Digit Club" badge added to profile. Athlete notified with badge animation. | Achievement already earned (if count was manually corrected) → no duplicate |
| 3 | SYSTEM | Creates story post (type=MILESTONE): auto-caption with jump count, DZ name, discipline tags. | Post added to athlete's timeline and social feed (visibility=Public by default). | Athlete can edit caption or change visibility before it posts |
| 4 | ATHLETE | Taps notification → sees milestone card on profile | Option: "Share to Instagram", "Share link", "Post to SkyLara feed now" | If SkyLara feed post already auto-created → share sends to Instagram instead |
| 5 | FOLLOWERS | Friends and followers see milestone in their feed | Reactions (fire emoji, like, clap) available. Comments enabled. | DZ home feed also shows milestone if athlete is a member there |
| 6 | DZ OPERATOR | DZ where the 100th jump was logged sees notification (optional) | Operator can opt-in to celebrate milestones at their DZ with a custom shout-out announcement. | Most DZs will love this — builds loyalty and word of mouth |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Product Catalog | DZ creates product listings: gear, apparel, accessories, gift vouchers. Photos, SKU, pricing. | P1 | 6 |
| Inventory Management | Real-time stock tracking. Low-stock alerts to operator. Out-of-stock auto-hides product. | P1 | 6 |
| Athlete Shopping | Browse DZ shop in app. Add to cart. Checkout with wallet balance or card. | P1 | 6 |
| Pickup or Ship | DZ configures: pickup at DZ, or ship to address. Shipping cost configurable. | P1 | 6 |
| Order Fulfillment | Staff marks order fulfilled. Athlete notified. Order history visible to both. | P1 | 6 |
| Gift Cards in Shop | Redeem DZ gift cards at checkout. Partial use supported. | P1 | 6 |
| Jump Ticket Bundles | Buy jump ticket books through the shop (same as wallet purchase, different UX entry point). | P1 | 6 |
| Gear Consignment (V2) | Athletes list personal used gear for sale. Platform takes commission. Buyer contacts seller via DZ. | P2 | V2 |

| Feature | Description | Priority | Phase |
| --- | --- | --- | --- |
| Multi-Branch Management | One DZ organization manages multiple physical locations under one account. Staff scoped per branch or all. | P1 | 7 |
| Branch Switching (Staff) | Staff app shows branch selector. Easy switch between locations. Load board updates to selected branch. | P1 | 7 |
| Cross-DZ Athlete Identity | Athlete profile, logbook, and compliance data travels with them to any DZ. No re-registration needed. | P0 | 1 |
| Cross-DZ Licensing | License verified at one DZ → visible to all DZs. Athlete controls which DZs can see their full profile. | P0 | 1 |
| Platform Admin Dashboard | SkyLara internal: all DZs, subscription tiers, MRR, usage metrics, feature flags, support queue. | P0 | 0 |
| SaaS Billing | Stripe billing for DZ subscriptions: starter/pro/enterprise tiers. Automated invoicing, dunning. | P0 | 0 |
| Feature Flags | Enable/disable features per DZ or tier. Manage beta programs. | P0 | 0 |
| DZ Onboarding Flow | Step-by-step wizard: DZ profile, aircraft setup, pricing config, staff invites, test load walkthrough. | P0 | 1 |
| Data Export | DZ can export all their data: athletes, jump records, transactions, loads. GDPR compliance. | P1 | 7 |
| DZ Suspension / Offboarding | Platform admin can suspend a DZ account. Data retained 90 days then archived per GDPR policy. | P1 | 7 |

| # | Actor | Action | System Response | Edge / Error Case |
| --- | --- | --- | --- | --- |
| 1 | OPERATOR | Visits skylara.com/operators → clicks "Start Free Trial" | Signup form: name, email, DZ name, ICAO code (optional), country. Email verification sent. | Email already exists → "Log in to continue" prompt |
| 2 | OPERATOR | Verifies email → enters DZ Onboarding Wizard (Step 1 of 5) | Step 1: DZ Profile — name, address, timezone, weight limits, DZ photo. | Can skip steps and complete later. Progress saved at each step. |
| 3 | OPERATOR | Step 2: Add Aircraft — tail number, type, seats, max TOW, empty weight, max altitude, maintenance date. | Aircraft added. CG calculation parameters set. | Can add multiple aircraft. Or skip and add later. |
| 4 | OPERATOR | Step 3: Set Pricing — configure per jump type and altitude. | Pricing table pre-populated with industry averages. Operator adjusts. | Can import pricing from CSV if existing system has it |
| 5 | OPERATOR | Step 4: Invite Staff — enter emails, assign roles (Manifest Staff, TI, Pilot, Rigger). | Invitation emails sent with role-specific onboarding instructions. | Invitees who are already SkyLara athletes get role added to existing account |
| 6 | OPERATOR | Step 5: Connect Stripe — create or connect Stripe account for payouts. | Stripe Connect OAuth flow. Account linked. Ready to accept payments. | Can skip Stripe setup — platform still usable but no online payments until connected |
| 7 | SYSTEM | Onboarding complete. DZ marked active. | Operator lands on DZ dashboard. Prompt: "Create your first load!" Tour overlay shown. | Platform admin notified of new DZ activation. Welcome call scheduled (for pro/enterprise) |

| RULE | Any feature touching the load FSM, CG calculation, compliance blocking, or exit order must pass all safety-critical AC before merge. No exceptions. |
| --- | --- |

| AC ID | Module | Criteria | Test Method |
| --- | --- | --- | --- |
| SC-01 | Manifest | LOCKED → 30MIN transition fails if no PASS cg_check record exists for that load_id | Integration test: attempt transition without CG check → expect 422 |
| SC-02 | Manifest | LOCKED → 30MIN transition succeeds only after CG PASS signed by staff with manifest_staff role | Integration test: CG pass created by athlete role → expect 403 |
| SC-03 | Check-In | Athlete with expired license currency is blocked from slot assignment | Integration test: athlete with currency_checks.status=EXPIRED → slot assign → expect 422 |
| SC-04 | Check-In | Override of compliance block requires reason field (min 10 chars) and logs to override_log | Integration test: blank reason → expect 400. Reason provided → override_log row created |
| SC-05 | Exit Order | Wingsuit jumper assigned exit_group=9 (First Exit) by default | Unit test: createExitGroups({jump_type:WINGSUIT}) → group=9 |
| SC-06 | Exit Order | Exit order override by staff creates override_log entry with old_group, new_group, reason | Integration test: update slot.exit_group → override_log.count increases by 1 |
| SC-07 | Payments | payment.captured event must be written to event_outbox in same DB transaction as jump_ticket creation | Integration test: kill outbox relay mid-process → ticket still created; event replays on restart |
| SC-08 | Offline | Offline slot assignment queues in local DB and syncs within 30s of reconnect | E2E test: disable network, add slot, re-enable network, verify slot exists server-side within 30s |
| SC-09 | Weight | Athlete over DZ tandem weight limit cannot be added to TANDEM slot | Integration test: athlete.weight > dz.tandem_weight_limit → slot assign → expect 422 |
| SC-10 | CG | CG result=FAIL prevents any further state advancement on that load until a new PASS result is added | Integration test: FAIL cg_check → transition attempt → expect 422. New PASS → transition succeeds |

| AC ID | Feature | Criteria |
| --- | --- | --- |
| P-01 | Load Board | WebSocket state change visible on all connected clients within 500ms (95th percentile) |
| P-02 | Compliance Check | 8-point compliance check completes in < 800ms (end-to-end API response) |
| P-03 | Offline Sync | All queued offline changes sync within 30 seconds of network reconnect |
| P-04 | CG Calculation | CG calculation result returned within 200ms of form submission |
| P-05 | Notification Delivery | Push notifications dispatched within 5 seconds of trigger event (call time state change) |
| P-06 | AI Insights | AI insight generation (non-blocking) completes and displays within 10 seconds of trigger |
| P-07 | Search (Manifest) | Athlete search returns results within 300ms (name prefix, USPA# lookup) |

| Priority | Features (representative) | Phases | Rationale |
| --- | --- | --- | --- |
| P0 — Must Have (Launch) | Load FSM, CG gate, Slot assignment, Check-in, Compliance, Wallet, Stripe payments, Notifications, QR check-in, Offline manifest | 0–2 | DZ cannot operate without these. Revenue depends on these. |
| P1 — Should Have | Story profile, Jump timeline, Milestones, AI risk alerts, Weather integration, Booking, Gear check logging, Exit order validator, EOD report | 3–5 | Differentiates product. Needed for retention and safety completeness. |
| P2 — Nice to Have | Shop, Marketing campaigns, Social media integration, AI assistant chat, Gear consignment, Pilot briefing PDF, Custom DZ achievements | 6–7 | Adds revenue streams and engagement. Not blocking launch. |