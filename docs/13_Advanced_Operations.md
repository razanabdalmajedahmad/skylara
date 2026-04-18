# SKYLARA

_Source: 13_Advanced_Operations.docx_

SKYLARA
Advanced Operations & Onboarding
Steps 24–25 + Operational Intelligence Upgrade
Version 1.0  |  April 2026  |  Brutally Honest Edition
Reporting & Analytics • Real-World Scenarios • Smart Automation • Pre-Arrival Onboarding • Digital Waivers • Express Check-In
# Table of Contents
# CHAPTER 24: REPORTING & ANALYTICS SYSTEM
Dual-layer architecture: operational (MySQL real-time, <5s latency) + analytical (ClickHouse warehouse, batch ETL every 15 min). BRUTAL TRUTH: scale kills both layers.
## 24.1 Reporting Architecture
MySQL can't handle complex aggregations across 500+ DZs. Queries for bookings×slots×loads will trigger full table scans. EXPLAIN plans will show join key cardinality issues. Solution: materialized views in ClickHouse, pre-aggregated hourly/daily rollups.
CRITICAL PROBLEM: Data consistency lag.
ClickHouse ETL runs every 15 min. Reports show 7.5 min stale data on average. During peak hours (9am-3pm), ETL can queue up to 45 min behind. Staff making decisions on 'real-time' reports are actually using 45-minute-old data. Executive dashboard label must say '(Updated at HH:MM UTC)' or DZ operators will make decisions on ghost information.
## 24.2 Financial Reports
Revenue must be decomposed by activity type. This is where the first data quality catastrophe happens.
Revenue Decomposition (THE TRAP):
Tandem: booking_items.item_type = 'TANDEM'
AFF: booking_items.item_type = 'AFF_LEVEL_X'
Coaching: booking_items.item_type = 'COACHING'
Fun jump: booking_items.item_type = 'FUN_JUMP'
Media: booking_items.item_type = 'MEDIA_PACKAGE'
Subscriptions: subscriptions table (separate domain)
Shop: booking_items.item_type = 'SHOP_GEAR'
BRUTAL TRUTH: item_type is free text in v1, not enum. Legacy DZs have 'tandem', 'Tandem', 'TANDEM_STUDENT', 'TANDEM (STUDENT)', 'TAN', 'T'. Revenue by activity is garbage unless you:
Backfill all historical item_type with strict enum mapping (data migration: 3-5 days, 50+ queries)
Enforce NOT NULL + ENUM at DB layer going forward
Flag mixed item_types in same booking (e.g., one slot marked TANDEM, one COACHING) as data anomaly
Payment Breakdown:
Card: transactions.method = 'CARD', via Stripe Connect
Wallet credit: transactions.method = 'WALLET', debit from athlete.account_balance
Promotional: booking_items.discount_code != NULL OR discount_source = 'PROMO'
Cash: NOT IN booking_items SCHEMA — only in paper manifests. LOST DATA.
BRUTAL: Walk-in cash payments at physical DZ counter never hit the database. You're blind to ~15-25% of actual revenue at small rural DZs. To fix: iPad-based POS terminal with offline sync, but that's a separate project.
Refund Analysis:
Refunds split: refund_destination = 'CARD' vs 'WALLET_CREDIT' vs 'STORE_CREDIT'
Refund reason: refund_reason enum (WEATHER, NO_SHOW, CUSTOMER_REQUEST, DZ_CANCELLATION, SAFETY_INCIDENT)
BRUTAL: Reason is not validated. Staff mark 'WEATHER' for no-shows to look better. Need audit log: who marked it, timestamp, DZ override count per month.
Profit Per Load (THE NIGHTMARE):
profit_per_load = (sum of booking revenue for load − fuel cost − instructor pay − platform commission) / load
Booking revenue: easy, from bookings×slots
Fuel cost: MISSING from schema
Instructor pay: in instructor_assignments.payout_amount, but only recorded AFTER jump completion
Platform commission: hardcoded in config, but varies by DZ contract
FIX REQUIRED: aircraft_fuel_costs table (aircraft_id, cost_per_minute, cost_per_hour, last_updated). Fuel tracking is manual today — spreadsheets, scribbled notes. Will never be accurate unless integrated into load-to-manifests workflow.
## 24.3 Operational Reports
Operational metrics are only as good as real-time data entry discipline.
Total Jumps & Load Utilization:
Daily jumps: COUNT(DISTINCT bi.id) WHERE bi.item_type IN (TANDEM, AFF_LEVEL_*, COACHING, FUN_JUMP)
Fill rate: (COUNT(slots with active booking) / SUM(slot.capacity)) per load, trend by day-of-week
BRUTAL: Fill rate metric breaks if slot.status doesn't track: OPEN → BOOKED → CANCELLED → MANIFESTED → JUMPED. If you use naive COUNT(bookings), cancelled slots still count. Query joins MUST filter ON status NOT IN ('CANCELLED', 'NO_SHOW').
Aircraft Usage:
Flights per day: COUNT(DISTINCT load_id) WHERE load.status = 'AIRBORNE'
Flight hours: SUM(TIMESTAMPDIFF(MINUTE, load.airborne_at, load.landed_at)) / 60
Turnaround time: TIMESTAMPDIFF(MINUTE, load.landed_at, next_load.airborne_at)
Maintenance due: aircraft.next_maintenance_due - TODAY()
BRUTAL: Flight hours require airborne_at and landed_at populated in real-time by manifest system. If staff forgets to mark 'AIRBORNE' on the tablet, or batch-updates at end of day, flight hours are fiction. You'll report 8 flights but only 4.2 actual flight hours (staff backdated timestamps). Auditing this requires GPS from aircraft or automatic beacon detection.
No-Show Rate (THE TRUTH):
Formula: COUNT(slots WHERE status = 'NO_SHOW') / COUNT(slots WHERE dz_id = ? AND date = ?) per day
By channel: web vs app vs walk-in
BRUTAL: Walk-in data is fiction. No-shows aren't recorded because staff never manifested them in the system. 'John walked up at 2pm, slots had names on physical form, paid cash, showed up.' System shows zero no-show because John was never in the database.
Load Delays:
Formula: TIMESTAMPDIFF(MINUTE, load.scheduled_departure, load.airborne_at)
Delay reason: load.delay_reason enum (WEATHER, MECHANICAL, STAFFING, PASSENGER_LATE, OTHER)
BRUTAL: If manifest staff don't update load.delay_reason in real-time, you end up with zero delay recorded (load created at 9:00am scheduled, marked AIRBORNE at 4:30pm as a batch update). All timing data becomes meaningless. Require timestamp validation: delay_reason_recorded_at must be within 15min of airborne_at, or flag as unreliable.
## 24.4 Instructor Reports
This is where metrics get gamed most aggressively.
Workload & Earnings:
Jumps per instructor: COUNT(ia.id) per instructor_id, per day/week/month
Earnings: SUM(ia.payout_amount), split by activity type
Per-jump average: SUM(payout_amount) / COUNT(jumps)
Comparison to team: payout_amount vs DZ average (anonymized in reports to other staff)
Performance Metrics (GAMED):
Student rating average: AVG(coaching_sessions.rating) — UNRELIABLE
AFF pass rate: COUNT(aff_progression WHERE outcome = 'PASS') / COUNT(aff_progression)
Student retention: % of students who return within 30/60/90 days of last lesson
BRUTAL TRUTH: Student ratings are completely gamed. Instructors who are lenient, skip hard practice drills, and sign off early get 5-star ratings. Strict instructors with high safety standards get 4.2 stars. DZ management then pressures strict instructors to 'be nice' or get fewer bookings. Result: lower safety standards, not higher performance. SOLUTION: Ignore ratings. Track OBJECTIVE metrics instead:
AFF pass rate per level (LEVEL_1 has 95%+ pass rate globally, LEVEL_3-7 drops to 60-70%) — track deviation from expected
Student incident rate per 1000 jumps under this instructor (vs DZ average)
Canopy control violations per 100 jumps (e.g., hard landings, line twists)
Student progression speed vs industry standard (controls for whether this instructor is a blocker or accelerator)
Skill Demand Analysis:
Requested skills: most-booked instructor attributes (AFF_LEVEL_7_CERTIFIED, COACH_FREEFLY, COACH_CAMERA, etc.)
Available skills: instructor_skills table
Gap: demand vs available supply per skill
BRUTAL: This only measures demand from the BOOKING system. Actual demand includes phone calls, walk-ins, and 'John asked if Maria was available tomorrow.' Booking data captures maybe 60% of true demand at small DZs.
## 24.5 Jumper Reports
Where cohort analysis falls apart on non-subscription data.
Activity & Segmentation:
Jump frequency: days since last jump
Favorite activity: mode(activity_type) from booking_items for each jumper
Preferred DZ: mode(dz_id) for each jumper (for athletes on platform, not tandem passengers)
Segments: Casual (0-4 jumps/month), Regular (4-8/month), Power (8+/month), Dormant (30 days), Churned (90+ days)
Lifetime Value (LTV) — THE TRAP:
Naive LTV: SUM(all revenue) per jumper across all time — USELESS for skydiving
A tandem passenger has ~5% chance of ever returning. Computing LTV = $150 per tandem passenger is nonsense. You're mixing two populations: one-time tourists (high volume, near-zero LTV) and licensed jumpers (low volume, medium LTV).
CORRECT APPROACH: Segment by first activity. Tandem passengers (~$200-500 if convert to AFF), AFF students (~$2000-5000), Licensed jumpers (~$5000-15000+ over 5 years).
Churn Prediction (UNRELIABLE):
Formula: days since last jump + declining frequency trend + engagement score
BRUTAL: Churn prediction for outdoor sports is 20-30% accurate at best. Weather cancellations, off-season migration, job changes, family events — these dominate the signal.
Solution: Use churn scores to segment communication, not to automate decisions. Show confidence intervals.
## 24.6 Marketplace Reports
Media and shop integration metrics (volatile and unreliable).
Sales & Inventory:
Media packages sold: COUNT(booking_items WHERE item_type = 'MEDIA_PACKAGE')
Gear sold: COUNT(booking_items WHERE item_type = 'SHOP_GEAR')
Media processing queue: COUNT(media_uploads WHERE status = 'PENDING')
Conversion Rate (GAMING):
Formula: (media packages sold) / (tandem bookings in period) = ~15-25% industry standard
BRUTAL: Conversion is gamed by timing of offer. DZs upselling BEFORE jump: 5-10%. DZs upselling AFTER jump: 25-35% (adrenaline high).
Don't benchmark DZs against each other on this metric — causation is sales timing, not product quality.
## 24.7 Safety Reports
Only as good as DZ reporting culture. Honest DZs report everything; cultures that blame jumpers hide incidents.
Incident Tracking:
Count: COUNT(incident_reports)
Severity: incident_reports.severity IN (LOW, MEDIUM, HIGH, CRITICAL)
Type: hard landing, off-landing, canopy collision, gear malfunction, line twist, other
Rate per 1000 jumps: COUNT(incidents) / (COUNT(slots WHERE booked=true) / 1000)
Off-Landing Analysis:
Frequency: COUNT(off_landing_reports) by day-of-week, time-of-day, wind conditions
GPS heatmap: if media_uploads.gps_metadata populated, cluster off-landing locations
Correlation with weather: wind speed > 15mph → off-landing rate increases
BRUTAL: Only HARDlandings get logged. True off-landing rate is 2-3x reported rate.
Risk Patterns (MUST BE ANONYMOUS):
Safety reporting is ONLY as good as DZ culture. Facilities that punish incident reports are the most dangerous.
Need anonymity + strong anti-retaliation language + incentives (e.g., instructor bonus for reporting near-misses).
Industry standard: incidents per 1000 jumps. U.S. average: ~3-5 per 1000. Elite DZs: ~1-2 per 1000 (likely under-reporting).
## 24.8 Executive Dashboard (Real-Time KPIs)
'Real-time' is marketing language. Actual latency: WebSocket push every 30s, plus 15min ClickHouse ETL lag.
CRITICAL PROBLEM: WebSocket sync loss. If dashboard browser disconnects, KPIs freeze. Staff make decisions on stale data. SOLUTION: Prominent visual indicator '(Last update: 2:15 PM)' and auto-refresh every 30s if no WebSocket ping.
## 24.9 Advanced Analytics
Where forecasting fails most spectacularly.
Lost Revenue Calculation:
Unfilled slots: COUNT(OPEN slots) * avg_slot_price
Cancelled loads: COUNT(loads WHERE status = 'CANCELLED') * avg_load_revenue
No-show fees: COUNT(no-shows) * no_show_fee (if policy enforced — most DZs don't)
Demand Forecasting (ACCURACY: 40-60%):
Input: 14-day lookahead using historical patterns + weather forecast + local events
Output: predicted bookings, slots needed, recommended instructor scheduling
BRUTAL: Outdoor sports forecasting is fundamentally unreliable. Weather beyond 3-5 days is near-random. Accuracy ceiling: 45% MAPE at best.
MUST SHOW confidence intervals, not point forecasts. Display: 'Expected 45 tandem bookings (±12 at 80% confidence). Highly sensitive to weather.'
Anomaly Detection:
Sudden revenue drop: day revenue < (7-day-avg - 2*stddev)
Unusual no-show spike: no-show % > (7-day-avg + 2*stddev)
Safety incident cluster: >3 incidents in 5-day window, alert DZ + corporate
False-positive rate ~20%: weather days trigger revenue anomaly, full cancellations trigger no-show spike.
## 24.10 Query Optimization & Scalability
Where most reporting systems collapse under their own weight.
Pre-Aggregation Strategy:
daily_revenue_rollup: DZ_ID, DATE, REVENUE_GROSS, REVENUE_NET, REFUNDS, ACTIVITY_TYPE
daily_load_stats: DZ_ID, DATE, LOADS_COMPLETED, SLOTS_FILLED, FILL_RATE, AIRCRAFT_ID, FLIGHT_HOURS
monthly_jumper_stats: DZ_ID, ATHLETE_ID, MONTH, JUMPS_COUNT, LIFETIME_VALUE, SEGMENT
Populated every 15min by ETL job. Reports query rollup tables (10-100x faster). Trade-off: 15min staleness.
ClickHouse Materialized Views:
mv_revenue_by_dz: real-time aggregation of revenue changes
mv_load_utilization: loads×slots denormalized for fast range queries
mv_incident_heatmap: incident location + severity + date for clustering
Monitor lag: if >10min behind MySQL, queries report stale data. Alert on lag >15min.
Caching Strategy:
Dashboard KPIs: Redis key = 'dz:{dzId}:kpi:revenue_today', TTL 30s
Report results: Redis key = 'report:{report_type}:{dzId}:{dateRange}', TTL 5min
Cache invalidation: on booking change, clear all reports touching that DZ and date range
Query Optimization for 500+ DZs:
BRUTAL: Cross-DZ analytics at scale requires partition pruning by date range and DZ.
Query without WHERE on date BETWEEN — will timeout at 30s.
SOLUTION: Mandatory WHERE clause on date range + optional DZ filter. Reject queries without date range at API layer.
ClickHouse partitioning: partition by toYYYYMM(date) + DZ_ID for fast pruning.
## 24.11 TypeScript Interfaces & Functions
## 24.12 Conclusion: What Will Fail
Be honest with stakeholders about these limitations:
Financial reports will be incomplete (walk-in cash, fuel costs, manual adjustments not integrated)
No-show and delay metrics will be gamed or inaccurate (batch data entry, unstandardized terminology)
Instructor performance ratings are noise (lenient instructors get 5 stars, strict instructors 3.8 stars)
Safety metrics are only as good as reporting culture (transparent DZs look bad, opaque DZs disappear)
Churn and LTV predictions will have high false-positive rates (weather dominates outdoor sports)
Cross-DZ analytics will be slow at 500+ DZs unless queries are carefully partitioned
Demand forecasting accuracy caps at ~45% MAPE (don't present as fact, show confidence intervals)
Real-time dashboards are 15-30min stale due to ETL lag and WebSocket sync issues
The system is still valuable — it provides trend analysis, anomaly detection, and operational visibility. But treating it as ground truth for critical decisions (staffing, pricing, safety actions) will lead to failures.
Recommendation: Build reporting with explicit data quality warnings, not silent failures. Every report should display: 'Generated at [time]. Data from [source]. Known limitations: [list]. Last audited: [date].' This forces stakeholders to understand the data, not blindly trust numbers.
# OPERATIONAL INTELLIGENCE UPGRADE
Previous chapters designed basic operational intelligence (Chapter 14, PlatformStrategy). This upgrade goes deeper: real-world scenarios that WILL happen, automation that fails gracefully, honest assessment of where AI hallucination and DZ chaos break systems.
## Section 1: Real-World Scenario Engine (Deep Dive)
Design for the messy reality. Not "happy path" flows — the 80% of production firefighting.
### A) AFF Student — Complications
Student fails level → repeat same level, but original instructor unavailable → system must find replacement with SAME AFF certification level AND access to student's debrief notes.
The Problem:
Student completes AFF-3 on Saturday with Instructor Bob
Repeats AFF-3 on Sunday, tries to progress to AFF-4, fails
Needs to repeat AFF-3. Bob is unavailable for 3 weeks
System must find another AFF-3+ certified instructor AT SAME DZ (or networked DZ)
New instructor needs debrief notes: jump altitudes, malfunctions, student's strength/weakness
System Response:
Honest Assessment:
If NO instructor available: system flags for manual assignment by DZ ops
If student travels between DZs: AFF progression tracking breaks unless all DZs share same standards
BRUTAL: AFF-3 at DZ-A (lenient) ≠ AFF-3 at DZ-B (strict). 'Global identity' is a myth until certification standards are harmonized
Recommendation: USPA audit trail required for cross-DZ transfers
Medical Event Mid-Training:
### B) Tandem + Camera — Edge Cases
Passenger over weight limit (230 lbs typical) → system must catch at check-in, offer options (stronger harness TI, charge surcharge, or decline).
Weight Limit Cascade:
Camera Flyer No-Show → Self-Camera Scenario:
Video Processing Failure:
### C) Weather Chaos
Wind oscillating around student limit (14 kts) → loads keep getting held/released → 'load churning' problem.
Hysteresis Solution:
Afternoon Thunderstorm → Proactive Front-Loading:
Honest Assessment — Weather:
Weather station data is only as good as the station. Many DZs use a windsock and eyeballs.
System must allow manual weather overrides by experienced DZ operators — don't trust sensors alone
'AI-driven weather prediction' sounds great until it holds a load based on forecast and customers miss their jump
Recommendation: Use sensor data as advisory only. Operator decision is law.
### D) No-Show Cascade
Group of 4 booked together, 2 no-show → remaining 2 can't do 4-way → need to merge with another incomplete group OR downgrade to 2-way.
No-Show Cascade Logic:
TI No-Show Cascade:
Honest Assessment — No-Show Prediction:
No-show prediction is weak: #1 reason is traffic/late arrival, which is unpredictable
Don't oversell 'AI no-show prediction' — it'll be 60% accurate at best
Better: build cashflow buffer (book 10% more than capacity) + automate cascade recovery
### E) Multi-Aircraft Operations
DZ with 2+ aircraft → balance loads across aircraft considering CG differences, fuel costs, maintenance schedules, pilot availability.
### F) End-of-Day Chaos
Last load of the day → experienced jumpers want 'sunset load' → system must verify light conditions (sunset time - 45 min minimum for landing).
Gear Return Tracking:
Day-End Financial Reconciliation:
## Section 2: Smart Automation (Production-Hardened)
### A) Instructor Auto-Assignment — Failure Modes
What happens when NO instructor matches? Fallback chain: exact match → cross-trained → different language but same skill → flag for manual.
Instructor Illness Cascade:
Instructor calls in sick 30 min before first load → cascade reassignment for ALL their loads that day
If replacement found: update manifest, notify passengers
If NO replacement: reschedule load (inform passengers immediately)
### B) Dynamic Pricing — Honest Limitations
Pricing algorithms assume demand elasticity — but skydiving demand is INELASTIC for first-timers (they come for the experience, not the price) and ELASTIC for licensed jumpers (they'll drive to a cheaper DZ).
Honest Assessment — Pricing:
Surge pricing on weekends alienates locals who ARE the community
Recommendation: surge for tandems only (inelastic), loyalty pricing for licensed jumpers (elastic)
Dynamic pricing without community buy-in = lost repeat business
### C) Notification Fatigue
Smart notification engine sends too many messages → users disable notifications → critical alerts missed.
## Section 3: Event-Driven Architecture (Production)
Event Catalog (50+ events):
BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_REFUNDED
LOAD_CREATED, LOAD_SCHEDULED, LOAD_DISPATCHED, LOAD_LANDED, LOAD_COMPLETED
INSTRUCTOR_ASSIGNED, INSTRUCTOR_UNAVAILABLE, INSTRUCTOR_REASSIGNED
WEATHER_ALERT, WEATHER_HOLD, WEATHER_RECOVERY
PAYMENT_RECEIVED, PAYMENT_FAILED, REFUND_ISSUED
GEAR_CHECKED_OUT, GEAR_CHECKED_IN, GEAR_DAMAGE_REPORTED
EMERGENCY_ACTIVATED, MEDICAL_CLEARANCE_REQUIRED, INCIDENT_REPORTED
CUSTOMER_ARRIVED, CUSTOMER_CHECKED_IN, CUSTOMER_NO_SHOW
Honest Assessment — Event Sourcing:
Event sourcing sounds great until you need to fix a bug in an event handler and replay 2 million events
Design for event versioning from day one (e.g., BOOKING_CREATED.v1 vs v2 schema changes)
Dead Letter Queue is not 'set and forget' — somebody needs to review and handle those events
Recommendation: use event sourcing for domain-critical sagas (booking, payment, incident), not for all mutations
## Section 4: Future-Ready (Honest Assessment)
### A) Reputation System
Reputation systems in small communities (DZs) are toxic. Everyone knows everyone. A bad review creates drama.
Recommendation: private ratings for internal matching only, no public leaderboard
Use ratings for: instructor skill matching, coaching group formation, instructor scheduling
Never expose ratings publicly (kills community trust)
Allow DZ operator to suppress bad reviews (e.g., if caused by freak accident, not instructor error)
### B) Global Identity
Useful but legally complex — different countries have different certification systems (USPA, BPA, APF, FFP).
Mapping between certification systems requires manual verification, not automation
USPA A-license != USPA A-license (skill varies wildly by DZ)
System: store certs by issuing body + date. Allow cross-DZ verification workflows.
Don't oversell 'global skydiving identity' — it doesn't exist until standards harmonize
### C) Marketplace Expansion
Tunnel time, gear marketplace, event booking — each is a separate business with separate regulations. Don't try to do all at once.
Phase 1: DZ manifest + booking (current)
Phase 2: cross-DZ booking + athlete identity
Phase 3: simple gear resale (P2P), media marketplace
Phase 4+: tunnel time, event booking, sponsorship matching (separate product teams)
Recommendation: do one thing well. Expansion creates complexity and regulatory risk.
### D) AI-Driven Features — Reality Check
Load optimization (fair — good ROI): maximize per-aircraft utilization, balance CG
Instructor matching (fair — good ROI): multi-factor scoring for skill/language/availability
Demand forecasting (weak — modest ROI): weather + seasonality matter more than AI
Safety alerts (fair): anomaly detection in weather, medical flags, load CG
No-show prediction (weak — don't oversell): 60% accuracy at best; better to automate recovery
Reputation scoring (dangerous): can amplify bias; keep private only
### E) Data Privacy & Compliance
Emergency profiles (blood type, meds) must be GDPR-compliant: encrypted, tightly controlled
USPA cert verification: verify with USPA directly, don't rely on user input
Incident reports: audit trail required for FAA / liability if injury occurs
International: different countries have different liability / insurance regimes. Know your DZ's jurisdiction.
Key Takeaway:
Operational Intelligence is NOT about perfect prediction or full automation. It's about detecting edge cases early, automating graceful cascades, and keeping humans in control of critical decisions. Build systems that fail safely, not systems that "never fail."
Build checklist for production launch:
Event-sourced core sagas (booking, payment, incident) with DLQ
Hysteresis weather system + manual operator override
Fallback chains for instructor assignment (no silent failures)
Notification budget + aggregation (prevent fatigue)
Dashboard alerts: unassigned loads, cash discrepancies, gear missing, DLQ size
Offline scenario playbooks: aircraft down, instructor sick, payment processor down, network outage
GDPR / FAA compliance audit: emergency profiles, incident logs, instructor certifications
Load test: 10,000 concurrent athletes, 100 DZs, 50+ events/sec
# CHAPTER 25: PRE-ARRIVAL & DIGITAL ONBOARDING SYSTEM
## 25.1 Pre-Arrival Architecture Overview
Goal: move 80% of check-in work BEFORE the jumper arrives at the DZ. The pre-arrival pipeline flows from booking confirmation through digital waiver signing, safety video completion, and gear sizing — culminating in a 2-minute express check-in instead of the typical 15-minute process.
The Reality Check:
Online bookings only: This pipeline assumes the jumper booked online and has days to prepare. Walk-ins — 30–40% of tandem business — bypass this entirely. Walk-in onboarding must be equally fast with a tablet kiosk at the DZ.
Timing is brutal: A jumper who books 3 months in advance forgets. Need reminder sequence: booking confirm → 7 days before → 24h before → 2h before with escalating urgency and channel switching.
Completion rates crater: Even with reminders, pre-arrival completion varies wildly by demographic. International jumpers (best prepared) ~60%, domestic tourists (worst) ~25%.
Pre-Arrival Pipeline:
Booking confirmed → instant confirmation email + push notification
Day 7 before: Email reminder with links to all pre-arrival steps
Day 1 before (24h): WhatsApp + push with checklist progress
Day 0 (2h before): SMS + push with directions, what to bring, weather update
Arrival: Scan QR code from confirmation → system validates all pre-arrival steps
## 25.2 Digital Waiver System
Waivers are the backbone of pre-arrival onboarding but also its biggest legal minefield. Different jurisdictions have wildly different requirements for digital signatures, minor consent, and witness requirements.
### Waiver Schema & Versioning
Multi-Language & Jurisdiction Logic:
Auto-detect from browser/phone language, offer override. French user in US DZ gets FR waiver by default.
Legal requirements map:
US (USPA): Standard liability release + DZ-specific addendum (weather, equipment limits, etc.)
EU (France, UK, Germany): Each country has different requirements — FFP (France), BPA (UK), DFV (Germany).
MENA: Varies wildly. Some countries require notarized documents. Some countries view digital signatures with suspicion.
Canada: Similar to US but with provincial variations.
Minor Handling — The Brutal Truth:
Under-18 jumpers require parent/guardian signature. This is legally non-negotiable. The system must:
Detect minor on booking (birthdate < 18 years)
Collect guardian email/phone SEPARATELY from athlete contact
Send guardian a SEPARATE waiver link (not the same link as the minor)
Require BOTH athlete signature AND guardian signature on the same waiver document
If guardian is NOT the athlete's emergency contact, collect both
This creates friction: a 17-year-old books online, completes the waiver, but the guardian hasn't signed yet. The DZ staff message the guardian via email, text, WhatsApp. Half the time the guardian is unreachable until 2 hours before the jump.
Digital Signature Compliance:
ESIGN Act (US): Requires clear opt-in, record retention, ability to withdraw — all supported.
eIDAS (EU): Digital signatures have levels — Simple, Advanced, Qualified. SkyLara uses Simple (canvas signature + timestamp). Courts accept Simple eIDAS; not all jurisdictions require Advanced/Qualified.
BRUTAL: Digital signatures are legally questionable in some jurisdictions. Conservative DZs will STILL demand paper waivers as backup. System must support dual-mode: digital primary (fast), paper fallback with photo upload (liability coverage).
### Waiver Versioning & Re-Signing Requirements
When waiver legal text changes, all jumpers must re-sign on next visit. This is a compliance requirement but a nightmare to track.
## 25.3 Safety Instructions System
Pre-jump safety briefing is legally mandatory and operationally critical. But the delivery method — video at home vs in-person at DZ — makes a huge difference in actual safety impact.
### Content Types & Activity-Specific Requirements
Tandem: Body position, harness fit, landing procedure, emergency signals — can be video or document.
AFF: Full ground school (online covers theory), emergency procedures, altitude awareness — quiz required to unlock booking.
Licensed: DZ-specific procedures, landing pattern, hazards map, local airspace restrictions.
The Brutal Truth About Video Completion Rates:
Nobody watches a 5-minute safety video at home on their phone. Completion rate will be <40% even with reminders. Most jumpers skip it, assume it's 'just legal stuff,' and watch the full briefing in person.
Solution: Reduce to 90-second key points. Make it engaging — not a legal disclaimer read-aloud by someone boring. Show actual athletes doing the activity, not lawyers talking.
Tandem video: 90 sec. Show jumper boarding plane, body position, fun moment, landing — then 30 sec on emergency signals.
AFF video: 120 sec. Show freefall altitude levels, deploy sequence, emergency procedure — feel of the sport, not fear.
Quiz requirement: AFF students MUST pass with 80%+ to unlock booking confirmation. This is non-negotiable for safety.
Critical caveat: The FULL safety briefing STILL happens in person at the DZ.
Do NOT let this system imply that watching a video = being ready to jump. An AFF student who watched the online module still needs 30–60 minutes of hands-on ground school with an instructor. Tandem jumpers still get a full pre-jump briefing at the DZ. The pre-arrival video is a SUPPLEMENT, not a replacement.
## 25.4 Mandatory Training Modules (AFF Students)
AFF progression requires structured ground school before each level. The online modules cover theory; the in-person instruction covers practical skills. Both are non-negotiable.
Progression Gate:
Cannot book AFF level N until module N is completed and quiz is passed. This is enforced at the booking stage.
The Brutal Reality:
Online ground school CANNOT replace in-person instruction. Period. An AFF student who watches a 10-minute video about freefall is NOT ready to jump. The instructor still needs 30–60 minutes hands-on: gear handling, body position practice on the ground, emergency procedure drills. Don't let the system imply that videos = readiness.
## 25.5 Gear Instructions & Sizing
Pre-arrival gear sizing speeds up the DZ check-in process. But self-reported measurements are wrong 30% of the time. People lie about weight, guess chest measurement, don't know their own shoe size.
### Pre-Arrival Gear Questionnaire
Auto-Sizing Algorithm:
Gear Availability & Reservation:
Verify DZ has required sizes in stock BEFORE the jumper's arrival. Reserve specific gear items to prevent double-booking.
At booking confirmation, check gear inventory against suggested sizes
Reserve specific harness/jumpsuit/helmet for the jumper's time slot
If required size is out of stock, suggest alternative size or alternative time slot
The Brutal Reality:
Gear sizing from self-reported measurements is wrong 30% of the time. People lie about weight (usually down by 5–10 kg), guess chest measurement, don't know harness sizes. FINAL FITTING MUST HAPPEN IN PERSON. This pre-arrival system is a pre-filter, not a replacement.
## 25.6 Instructor Introduction
Knowing who your instructor is reduces first-jump anxiety and builds trust. But instructor assignments are fragile — they change constantly.
### Instructor Assignment & Profile Sharing
System assigns instructor 24 hours before (or at booking approval for far-future bookings). Instructor profile sent to jumper: name, photo, bio, certifications, languages spoken, experience level.
The Brutal Reality:
Instructor assignments change constantly. TI calls in sick. Student weight requires a different TI. Schedule shifts. Weather forces load changes. Showing instructor name pre-arrival creates expectation that BREAKS when assignment changes 6 hours before the jump.
Solution: Show 'Instructor team' with 2–3 possible instructors, or only confirm day-of. Alternatively, frame it as 'Your instructor will be part of our team — we'll introduce them when you arrive.'
## 25.7 Reminder & Communication System
Reminders are the glue holding the pre-arrival pipeline together. Without escalating reminders, completion rates plummet to 10%.
### Reminder Sequence & Channels
Booking confirmation (instant): Email + push notification with link to start pre-arrival
7 days before: Email with checklist and progress (email = low urgency, catches slow readers)
24 hours before: WhatsApp + push with checklist progress and incomplete steps highlighted
2 hours before: SMS + push with directions, parking, what to bring, weather update
No-show +15 min: SMS + push 'Running late? Your slot reserved until [TIME]'
Channel Priority Logic:
User opt-in preference: push (preferred) → WhatsApp → SMS → email (fallback). Respect user choices but push through preferred channels.
WhatsApp Limitation — Critical:
WhatsApp Business API has strict template approval rules. Every message must be pre-approved by Meta. Dynamic content (athlete name, time, instructor name) is limited to template variables. Don't promise 'rich WhatsApp conversations' — you get template messages with placeholders.
Template: 'Hi {athlete_name}, your jump is in 24 hours at {dz_name}. Complete your waiver: [link]'
Cannot do: 'Your instructor John will meet you at Gate 3 in 2 hours'
Can do: 'Your jump is confirmed! Check your confirmation email for instructor details.'
## 25.8 Document Verification
Required documents vary by activity type and jurisdiction. Tandem: passport/license + signed waiver. AFF: passport/license + waiver + previous logbook (if continuing).
### Document Upload & Manual Review
The Brutal Reality:
Document verification is a bottleneck. DZ staff don't have time to review documents 24 hours in advance. Most verification still happens at check-in anyway. This system helps for REPEAT customers (verified once, valid for 12 months) and catches obvious issues (expired ID) before arrival. First-time jumpers still need manual verification at the DZ.
## 25.9 Express Check-In Flow
The payoff moment: jumper arrives, everything is verified, check-in takes 2 minutes.
### Express Lane vs Standard Lane
Jumper arrives → scan QR code from confirmation email/SMS
System checks: waiver ✓, safety video ✓, gear sized ✓, documents ✓, payment ✓
All complete → 'Express Lane: Proceed to gear-up' (bright green screen)
Any incomplete → 'Standard Lane: Complete steps [X, Y] at kiosk' (yellow screen)
The Brutal Reality:
Express check-in only works if DZ staff TRUST the system. If they re-check everything anyway (which they will for the first 3 months), it saves zero time. Need to build trust gradually with a 'Verified by SkyLara' badge that staff learn to rely on. After 3 months of zero incidents, they'll skip the re-check.
## 25.10 Metrics & ROI
Measure what matters: check-in time reduction, completion rates by step, staff time savings, safety improvements.
ROI Calculation:
But the Real ROI is Safety, Not Time:
The true benefit is not staff time savings — it's SAFETY. A jumper who watched the safety video at home AND got the full briefing in person is safer than one who only got a rushed briefing because the DZ was slammed. But measuring safety improvement requires incident data over 2+ years, not weeks. Track near-misses, student errors, incident rates pre vs post. This is a long game.
## Chapter Summary
Pre-arrival onboarding dramatically reduces check-in friction IF completion rates stay above 50%. Build trust with DZ staff by proving zero incidents with express-lane jumpers. Be honest about bottlenecks: walk-ins bypass the pipeline, digital signatures are legally fragile in some jurisdictions, and instructor assignments change constantly. Design around constraints, not against them.
Key Implementation Priorities:
Waiver system must support dual-mode (digital + paper fallback)
Safety videos must be <2 min and engaging, not legal disclaimers
AFF quiz gates must be enforced at booking level
Gear sizing is pre-filter only; final fitting happens in person
Instructor assignments are fragile; show backup options or day-of confirmation
Reminder sequence must escalate urgency: email → push/WhatsApp → SMS
Express check-in requires staff buy-in; build trust with 3-month pilot
Measure safety alongside time savings; incident rates are the true metric

| Component | Layer | Latency | Query Complexity | Scalability Risk |
| --- | --- | --- | --- | --- |
| Real-time dashboards | MySQL (master) | <5s | Simple COUNT/SUM per DZ | MEDIUM — single-DZ queries OK, cross-DZ joins fail >50 DZs |
| Financial reports | ClickHouse + Redis | 30-120s (batch) | Complex multi-table aggregations | HIGH — materialized view maintenance overhead grows with DZ count |
| Incident analysis | MySQL + full-text search | 5-15s | Pattern matching across incident_reports | MEDIUM-HIGH — unindexed JSON fields in incident_meta cause scans |
| Forecast predictions | ClickHouse read-only | 60-300s | Time-series lookback + model scoring | HIGH — model inference latency compounds with data volume |
| Anomaly detection | Redis + Python worker | 30s batch job | Z-score/IQR on pre-aggregated metrics | MEDIUM — depends on ClickHouse ETL reliability |

| -- Financial report: revenue by activity, date range SELECT   DATE(b.created_at) as report_date,   COALESCE(bi.item_type, 'UNKNOWN') as activity_type,   COUNT(DISTINCT bi.id) as transaction_count,   SUM(bi.base_price) as gross_revenue,   SUM(bi.refund_amount) as refunds,   SUM(bi.base_price - COALESCE(bi.refund_amount, 0)) as net_revenue FROM bookings b JOIN booking_items bi ON b.id = bi.booking_id WHERE b.dz_id = ? AND b.created_at BETWEEN ? AND ? GROUP BY report_date, activity_type ORDER BY report_date DESC, net_revenue DESC;  -- EXPLAIN output warning: 15M+ rows in bookings for large DZs -- Index REQUIRED: (dz_id, created_at, item_type) on booking_items -- Without it: 8-12s full table scan. With it: <200ms via index range. |
| --- |

| -- Profit per load (INCOMPLETE without fuel data) SELECT   l.id as load_id,   l.dz_id,   l.load_number,   DATE(l.created_at) as load_date,   SUM(bi.base_price - COALESCE(bi.refund_amount, 0)) as gross_revenue,   COALESCE(SUM(ia.payout_amount), 0) as instructor_costs,   NULL as fuel_cost, -- MISSING DATA   (SUM(bi.base_price - COALESCE(bi.refund_amount, 0))     - COALESCE(SUM(ia.payout_amount), 0)) as profit_before_fuel FROM loads l JOIN slots s ON l.id = s.load_id JOIN bookings b ON s.booking_id = b.id JOIN booking_items bi ON b.id = bi.booking_id LEFT JOIN instructor_assignments ia ON l.id = ia.load_id WHERE l.dz_id = ? AND l.created_at BETWEEN ? AND ? GROUP BY l.id ORDER BY load_date DESC;  -- WARNING: instructor payout recorded late (30-60min after jump). Reports -- generated while load is still active will show missing instructor costs. |
| --- |

| -- Operational report: load delays with reliability flag SELECT   l.id as load_id,   l.dz_id,   l.scheduled_departure,   l.airborne_at,   TIMESTAMPDIFF(MINUTE, l.scheduled_departure, l.airborne_at) as delay_minutes,   l.delay_reason,   CASE     WHEN TIMESTAMPDIFF(SECOND, l.delay_reason_updated_at, l.airborne_at) > 900     THEN 'UNRELIABLE_DATA'     ELSE 'RELIABLE'   END as data_quality_flag FROM loads l WHERE l.dz_id = ? AND l.created_at BETWEEN ? AND ?   AND l.status IN ('AIRBORNE', 'LANDED') ORDER BY delay_minutes DESC;  -- Delay reason MUST be recorded within 15min of AIRBORNE status. |
| --- |

| -- Instructor workload & performance (HONEST VERSION) SELECT   i.id as instructor_id,   i.name,   COUNT(DISTINCT ia.id) as total_jumps,   COUNT(DISTINCT CASE WHEN ia.activity_type = 'TANDEM' THEN ia.id END) as tandem_count,   COUNT(DISTINCT CASE WHEN ia.activity_type LIKE 'AFF_LEVEL_%' THEN ia.id END) as aff_count,   SUM(ia.payout_amount) as total_earnings,   AVG(ia.payout_amount) as avg_payout_per_jump,   -- Objective performance   COUNT(CASE WHEN aff.outcome = 'PASS' THEN 1 END)     / NULLIF(COUNT(CASE WHEN aff.activity_type LIKE 'AFF_LEVEL_%' THEN 1 END), 0)     as aff_pass_rate,   COUNT(DISTINCT ir.id) as incident_count_as_instructor,   (COUNT(DISTINCT ir.id) / NULLIF(COUNT(DISTINCT ia.id), 0) * 1000)     as incident_rate_per_1000_jumps FROM instructors i LEFT JOIN instructor_assignments ia ON i.id = ia.instructor_id LEFT JOIN aff_progression aff ON ia.id = aff.instructor_assignment_id LEFT JOIN incident_reports ir ON ia.load_id = ir.load_id AND ir.involves_instructor_id = i.id WHERE i.dz_id = ? AND ia.created_at BETWEEN ? AND ? GROUP BY i.id, i.name ORDER BY total_jumps DESC; |
| --- |

| -- Correct LTV: segment by first activity SELECT   a.id as athlete_id,   a.first_activity_type,   COUNT(DISTINCT b.id) as total_bookings,   SUM(bi.base_price - COALESCE(bi.refund_amount, 0)) as lifetime_revenue,   DATE(a.created_at) as athlete_created_date,   DATEDIFF(MAX(b.created_at), MIN(b.created_at)) as lifetime_days,   CASE     WHEN a.first_activity_type = 'TANDEM' THEN 'TANDEM_PASSENGER'     WHEN a.first_activity_type LIKE 'AFF_LEVEL_%' THEN 'AFF_STUDENT'     ELSE 'OTHER'   END as segment FROM athletes a JOIN bookings b ON a.id = b.athlete_id JOIN booking_items bi ON b.id = bi.booking_id WHERE a.dz_id = ? AND a.created_at BETWEEN ? AND ? GROUP BY a.id, a.first_activity_type ORDER BY lifetime_revenue DESC; |
| --- |

| -- Safety report with context SELECT   l.dz_id,   COUNT(DISTINCT ir.id) as incident_count,   COUNT(DISTINCT l.id) as loads_in_period,   SUM(s.capacity) as total_slots,   COUNT(DISTINCT b.id) as total_jumps,   ROUND((COUNT(DISTINCT ir.id) / COUNT(DISTINCT b.id)) * 1000, 2)     as incidents_per_1000_jumps,   COUNT(DISTINCT CASE WHEN ir.severity = 'CRITICAL' THEN ir.id END)     as critical_incidents,   COUNT(DISTINCT CASE WHEN ir.incident_type = 'OFF_LANDING' THEN ir.id END)     as off_landings FROM loads l JOIN slots s ON l.id = s.load_id JOIN bookings b ON s.booking_id = b.id LEFT JOIN incident_reports ir ON l.id = ir.load_id WHERE l.dz_id = ? AND l.created_at BETWEEN ? AND ? GROUP BY l.dz_id ORDER BY incidents_per_1000_jumps DESC; |
| --- |

| KPI | Calculation | Update Freq | Data Source | Alert Threshold |
| --- | --- | --- | --- | --- |
| Revenue today | SUM(bi.base_price - refund) WHERE DATE(b.created_at) = TODAY() | 30s WebSocket | MySQL master | Down 20% vs same day last week |
| Revenue this week | SUM(bi.base_price - refund) WHERE WEEK(b.created_at) = WEEK(NOW()) | 15min batch | ClickHouse | Down 15% vs prior week |
| Active jumpers TODAY | COUNT(DISTINCT athlete_id) from active bookings | 30s | MySQL | N/A (informational) |
| Loads completed TODAY | COUNT(loads WHERE status = 'LANDED' AND DATE(landed_at) = TODAY()) | 30s | MySQL | Below historical average |
| Slots filled % | COUNT(booked slots) / SUM(capacity) per load | 30s | MySQL | Below 70% |
| Weather hold | loads.status = 'HELD', delay_reason = 'WEATHER' | 5min | Manual update | Alert DZ ops if >3 hrs |
| Revenue per load | SUM(revenue) / COUNT(loads) TODAY | 30s | MySQL | Below DZ target |
| Instructor shortage | COUNT(open booking reqs with no instructor available) | 15min | ClickHouse | Alert if >5 open |
| Safety incidents (week) | COUNT(incident_reports) past 7 days | 15min | ClickHouse | Alert if >historical avg |

| -- Anomaly detection: unusual no-show rate WITH daily_stats AS (   SELECT     DATE(b.created_at) as day,     COUNT(CASE WHEN s.status = 'NO_SHOW' THEN 1 END) as no_shows,     COUNT(*) as total_slots,     COUNT(CASE WHEN s.status = 'NO_SHOW' THEN 1 END) * 100.0 / COUNT(*) as no_show_pct   FROM slots s   JOIN bookings b ON s.booking_id = b.id   WHERE b.dz_id = ?   GROUP BY day   ORDER BY day DESC   LIMIT 30 ), stats AS (   SELECT     AVG(no_show_pct) as avg_pct,     STDDEV(no_show_pct) as stddev_pct   FROM daily_stats ) SELECT   daily_stats.day,   daily_stats.no_show_pct,   stats.avg_pct,   CASE     WHEN daily_stats.no_show_pct > stats.avg_pct + (2 * stats.stddev_pct) THEN 'ANOMALY_HIGH'     ELSE 'NORMAL'   END as anomaly_flag FROM daily_stats, stats ORDER BY day DESC LIMIT 1; |
| --- |

| -- Query optimization: revenue report with mandatory date range SELECT   DATE(b.created_at) as report_date,   bi.item_type,   COUNT(DISTINCT bi.id) as tx_count,   SUM(bi.base_price) as gross_revenue FROM bookings b JOIN booking_items bi ON b.id = bi.booking_id WHERE   b.dz_id = ?   AND b.created_at >= ? -- REQUIRED: date range lower bound   AND b.created_at < ?  -- REQUIRED: date range upper bound GROUP BY report_date, bi.item_type ORDER BY report_date DESC;  -- Index: (dz_id, created_at, item_type) enables range skip scan -- Without WHERE on created_at: full table scan on 15M+ rows, 8-15s latency |
| --- |

| enum ReportType {   FINANCIAL_REVENUE = 'FINANCIAL_REVENUE',   FINANCIAL_PROFIT = 'FINANCIAL_PROFIT',   OPERATIONAL_LOADS = 'OPERATIONAL_LOADS',   INSTRUCTOR_PERFORMANCE = 'INSTRUCTOR_PERFORMANCE',   JUMPER_RETENTION = 'JUMPER_RETENTION',   SAFETY_INCIDENTS = 'SAFETY_INCIDENTS',   ADVANCED_FORECAST = 'ADVANCED_FORECAST' }  interface ReportRequest {   reportType: ReportType;   dzId: string;   dateRangeStart: Date; // MANDATORY   dateRangeEnd: Date;   granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY';   page?: number;   limit?: number; // max 100 }  interface ReportResponse {   reportType: ReportType;   dzId: string;   generatedAt: Date;   dataFreshness: 'REAL_TIME' | '5MIN_CACHE' | '15MIN_BATCH'; // MUST indicate staleness   rows: any[];   metadata: {     totalRows: number;     queryExecutionMs: number;     dataQualityFlags?: string[]; // ['WALK_IN_CASH_EXCLUDED', 'FUEL_COST_MISSING']   }; }  async function generateReport(request: ReportRequest): Promise<ReportResponse> {   // Validate mandatory date range   if (!request.dateRangeStart || !request.dateRangeEnd) {     throw new Error('Date range is mandatory for all reports');   }   // Limit date range to prevent runaway queries   const daysDiff = Math.ceil(     (request.dateRangeEnd.getTime() - request.dateRangeStart.getTime()) / (1000 * 60 * 60 * 24)   );   if (daysDiff > 365) {     throw new Error('Date range limited to 365 days max');   }   // Check cache first (5min TTL)   const cacheKey = `report:${request.reportType}:${request.dzId}:${request.dateRangeStart.toISOString()}`;   const cached = await redis.get(cacheKey);   if (cached) return JSON.parse(cached);   // Query and cache... } |
| --- |

| async function findAFFReplacementInstructor(   studentId: string,   failedLevel: number,   originalInstructorId: string,   dzId: string ) {   // 1. Fetch student's debrief notes from last jump   const debriefs = await db.query(     `SELECT * FROM jump_debriefs WHERE student_id = ? ORDER BY created_at DESC LIMIT 5`,     [studentId]   );    // 2. Find instructors with AFF-{failedLevel}+ certification   const candidates = await db.query(     `SELECT i.* FROM instructors i     JOIN instructor_skills isk ON i.id = isk.instructor_id     WHERE isk.skill_code = ? AND isk.level >= ? AND i.dz_id IN (?)     ['AFF', failedLevel, [dzId, ...networkDzIds]]   );    // 3. Rank by: availability, prior coaching sessions with this student, language match   const ranked = candidates.map(c => ({     ...c,     score: (c.availability_slots_next_7d * 20) +            (c.prior_sessions_with_student * 15) +            (c.language_match ? 10 : 0) +            (c.aff_specialty ? 5 : 0)   })).sort((a, b) => b.score - a.score);    return { candidates: ranked.slice(0, 3), debriefs }; } |
| --- |

| async function emergencyProtocolFire(studentId: string, eventType: string) {   // 1. Immediately pause all future jumps for this student   await db.query(     `UPDATE bookings SET status = 'MEDICAL_HOLD' WHERE student_id = ? AND date > NOW()`,     [studentId]   );    // 2. Fetch emergency profile (blood type, allergies, contact, insurance)   const profile = await db.query(     `SELECT * FROM emergency_profiles WHERE student_id = ?`,     [studentId]   );    // 3. Create incident report for DZ medical coordinator   await db.query(     `INSERT INTO incident_reports (student_id, event_type, status, assigned_to) VALUES (?, ?, ?, ?)`,     [studentId, eventType, 'PENDING_CLEARANCE', dzMedicalCoordinatorId]   );    // 4. Send notifications: student, instructor, DZ medical, emergency contacts   await notifyAll([studentId, instructorId, dzMedicalId, ...emergencyContacts]);    // 5. Training can ONLY resume after:   //    - Medical clearance uploaded (PDF)   //    - DZ medical coordinator approval   //    - Instructor agrees to resume   return { status: 'PAUSED', next_action: 'MEDICAL_CLEARANCE_REQUIRED' }; } |
| --- |

| async function handleWeightCompliance(bookingId: string, passengerWeight: number) {   const booking = await db.query(     `SELECT * FROM bookings WHERE id = ?`, [bookingId]   );   const activity = booking.activity_type; // 'TANDEM', 'AFF', etc.    // Weight limits per activity (from DZ config)   const limits = {     'TANDEM': 230,     'AFF': 200,     'STATIC_LINE': 220,   };    if (passengerWeight > limits[activity]) {     // Option 1: Upgrade to heavier harness TI (charge +$50)     const heavyHarnessTIs = await db.query(       `SELECT * FROM instructors WHERE heavy_harness_certified = 1 AND dz_id = ?`,       [booking.dz_id]     );      if (heavyHarnessTIs.length > 0) {       await updateBooking(bookingId, {         instructor_id: heavyHarnessTIs[0].id,         surcharge: 50,         notes: 'Upgraded to heavy harness TI'       });       return { status: 'UPGRADED', surcharge: 50 };     }      // Option 2: Decline booking     await updateBooking(bookingId, { status: 'DECLINED', reason: 'WEIGHT_LIMIT' });     await refundPassenger(bookingId, 'Weight limit exceeded');     return { status: 'DECLINED', reason: 'NO_HEAVY_HARNESS_TI_AVAILABLE' };   }    return { status: 'COMPLIANT' }; } |
| --- |

| async function handleCameraFlyer(loadId: string, cameraFlyerId: string) {   // Load departs in 10 minutes. Camera flyer no-show.    // 1. Check if TI can self-camera (handcam)   const tiOnLoad = await db.query(     `SELECT instructor_id FROM load_manifests WHERE load_id = ? LIMIT 1`,     [loadId]   );   const ti = await db.query(     `SELECT * FROM instructors WHERE id = ?`, [tiOnLoad[0].instructor_id]   );    if (!ti.camera_certified) {     // No video. Auto-discount media package.     await updateBooking(cameraFlyerId, {       media_package: null,       discount: 100,       notes: 'Camera flyer no-show: no video possible'     });     await notifyCustomer(cameraFlyerId,       'Your video package was not possible. Full refund applied.'     );     return { status: 'NO_VIDEO', discount: 100 };   }    // TI can self-camera, but quality is lower → discount 50%   await updateBooking(cameraFlyerId, {     media_package: 'HANDCAM',     discount: 50,     notes: 'Handcam only (dedicated camera flyer no-show)'   });   await notifyCustomer(cameraFlyerId,     'Professional camera flyer unavailable. Handcam included at 50% discount.'   );    return { status: 'HANDCAM_ONLY', discount: 50 }; } |
| --- |

| async function handleVideoCorruption(bookingId: string) {   // Video file failed during render. Customer already paid.    // 1. Log incident   await db.query(     `INSERT INTO incident_reports (booking_id, type, status) VALUES (?, ?, ?)`,     [bookingId, 'VIDEO_CORRUPTION', 'RESOLVED_WITH_REFUND']   );    // 2. Auto-refund media portion (don't wait for support ticket)   const mediaPrice = await db.query(     `SELECT price FROM bookings WHERE id = ?`, [bookingId]   );   await stripe.refunds.create({     payment_intent: booking.payment_intent_id,     amount: mediaPrice * 100, // cents   });    // 3. Notify customer immediately   await notifyCustomer(bookingId,     'Video processing error. Media refund applied. DZ staff will contact you.'   );    // 4. Alert DZ media coordinator   await notifyDZStaff(booking.dz_id, 'VIDEO_CORRUPTION', bookingId);    return { status: 'REFUNDED', action: 'AWAITING_VIDEO_RETRY' }; } |
| --- |

| interface WeatherHysteresis {   upperThreshold: number; // e.g., 14 kts (HOLD)   lowerThreshold: number; // e.g., 11 kts (RELEASE)   holdMinutes: number;    // e.g., 5 min at HOLD before releasing   releaseMinutes: number; // e.g., 10 min below 11 before loading }  async function applyWeatherHysteresis(   loadId: string,   weatherData: { wind_kts: number, timestamp: Date } ) {   const load = await db.query(     `SELECT * FROM loads WHERE id = ?`, [loadId]   );   const config = await dzWeatherConfig(load.dz_id);   const hysteresis = config.hysteresis;    // Current wind   const wind = weatherData.wind_kts;   const currentStatus = load.weather_status; // LOADED or HELD    // If LOADED and wind goes ABOVE upper threshold → HOLD   if (currentStatus === 'LOADED' && wind > hysteresis.upperThreshold) {     await updateLoadStatus(loadId, 'HELD', 'wind_spike');     return { action: 'HOLD', reason: 'wind_spike', wind };   }    // If HELD and wind STAYS BELOW lower threshold for holdMinutes → RELEASE   if (currentStatus === 'HELD' && wind < hysteresis.lowerThreshold) {     const timeBelowThreshold = await checkWindTime(       loadId,       hysteresis.lowerThreshold,       'BELOW'     );     if (timeBelowThreshold > hysteresis.holdMinutes * 60) {       await updateLoadStatus(loadId, 'LOADED', 'weather_recovered');       return { action: 'RELEASE', reason: 'sustained_calm', minutes: hysteresis.holdMinutes };     }   }    return { action: 'NO_CHANGE', currentStatus, wind }; } |
| --- |

| async function proactiveScheduleForWeather(dzId: string) {   // Weather forecast shows 60% rain at 3 PM    const forecast = await getWeatherForecast(dzId);   const afternoon = forecast.find(h => h.hour >= 15 && h.rain_chance > 50);    if (!afternoon) return { action: 'NO_CHANGE' };    // 1. Front-load morning schedule: suggest earlier start times   const loads = await db.query(     `SELECT * FROM loads WHERE dz_id = ? AND date = CURDATE() AND scheduled_time > '12:00'`,     [dzId]   );    // 2. For each afternoon load, offer 30 min earlier slot   for (const load of loads) {     const newTime = subMinutes(load.scheduled_time, 30);     const available = await checkAircraftAvailability(dzId, newTime);      if (available) {       await notifyLoadPassengers(load.id,         `Thunderstorm forecast for afternoon. New time: ${newTime}. Confirm?`       );     }   }    return { action: 'SCHEDULE_SHIFT', reason: 'storm_approaching', loads_affected: loads.length }; } |
| --- |

| async function handleGroupNoShow(   loadId: string,   groupId: string,   noShowCount: number ) {   const group = await db.query(     `SELECT * FROM jump_groups WHERE id = ?`, [groupId]   );    const originalType = group.activity_type; // e.g., '4-WAY'   const remainingJumpers = group.size - noShowCount;    // Can't do 4-way with 2 people. Options:   if (remainingJumpers < group.min_jumpers) {     // 1. Merge with another incomplete group (e.g., another 2-way)     const compatible = await db.query(       `SELECT * FROM jump_groups WHERE load_id = ? AND size + ? >= ? AND status = 'PENDING'`,       [loadId, remainingJumpers, group.min_jumpers]     );      if (compatible.length > 0) {       // Merge with first compatible group       const mergedGroup = await mergeGroups(groupId, compatible[0].id);       return { action: 'MERGED', new_type: mergedGroup.activity_type };     }      // 2. Downgrade to 2-way (if possible)     if (remainingJumpers >= 2) {       await updateGroup(groupId, {         activity_type: '2-WAY',         price: calculatePrice('2-WAY', dzId),         delta: calculatePrice('2-WAY', dzId) - group.price       });       await notifyGroup(groupId,         `2 no-shows. Downgraded to 2-way. Refund: $${group.delta}`       );       return { action: 'DOWNGRADED', new_type: '2-WAY', refund: group.delta };     }      // 3. Full refund (can't proceed)     await refundGroup(groupId, 'Insufficient jumpers after no-show');     return { action: 'REFUNDED', reason: 'INSUFFICIENT_JUMPERS' };   }    return { action: 'PROCEED', remaining: remainingJumpers }; } |
| --- |

| async function handleTINoShow(instructorId: string, date: Date) {   // Instructor calls in sick 30 min before first load    // 1. Find all loads with this instructor today   const loads = await db.query(     `SELECT * FROM loads WHERE instructor_id = ? AND date = ?`,     [instructorId, date]   );    for (const load of loads) {     // 2. Find replacement instructor     const replacement = await findAvailableInstructor(       load.dz_id,       load.activity_type,       load.required_skills,       load.scheduled_time     );      if (replacement) {       await updateLoad(load.id, { instructor_id: replacement.id });       await notifyPassengers(load.id,         `Instructor change: ${replacement.name}. Quality unaffected.`       );     } else {       // No replacement → reschedule load       const nextAvailableSlot = await findNextAvailableSlot(         load.dz_id,         load.activity_type,         load.required_skills       );        await updateLoad(load.id, { scheduled_time: nextAvailableSlot });       await notifyPassengers(load.id,         `Instructor unavailable. Rescheduled to ${nextAvailableSlot}.`       );     }   }    return { loads_affected: loads.length, action: 'CASCADE_REASSIGNMENT' }; } |
| --- |

| async function redistributeLoads(   dzId: string,   groundedAircraftId: string ) {   // One aircraft goes mechanical. All loads must redistribute.    // 1. Find all loads assigned to grounded aircraft   const affectedLoads = await db.query(     `SELECT * FROM loads WHERE dz_id = ? AND aircraft_id = ? AND status IN ('PENDING', 'LOADED')`,     [dzId, groundedAircraftId]   );    // 2. Get available aircraft + pilots   const availableAircraft = await db.query(     `SELECT a.*, p.id as pilot_id FROM aircraft a     JOIN pilots p ON a.primary_pilot_id = p.id     WHERE a.dz_id = ? AND a.status = 'OPERATIONAL' AND a.id != ?`,     [dzId, groundedAircraftId]   );    const assignments = [];   for (const load of affectedLoads) {     // Find best fit aircraft (weight capacity, CG, fuel, pilot availability)     const best = availableAircraft       .map(ac => ({         ...ac,         score: (ac.max_weight >= load.weight ? 100 : -1000) +                (ac.cg_match_with_load ? 50 : 0) +                (ac.fuel_percent * 2) +                (ac.pilot_available_at_time ? 30 : -50)       }))       .sort((a, b) => b.score - a.score)[0];      if (best && best.score >= 0) {       assignments.push({         load_id: load.id,         new_aircraft_id: best.id,         new_pilot_id: best.pilot_id,         time_shift: calculateTimeShift(load, best)       });     } else {       // No aircraft available → reschedule to next available slot       assignments.push({         load_id: load.id,         action: 'RESCHEDULE',         new_date: addDays(load.date, 1)       });     }   }    // 3. Apply all assignments   for (const assign of assignments) {     if (assign.new_aircraft_id) {       await updateLoad(assign.load_id, {         aircraft_id: assign.new_aircraft_id,         pilot_id: assign.new_pilot_id,         scheduled_time: addMinutes(assign.load.scheduled_time, assign.time_shift)       });       await notifyPassengers(assign.load_id,         `Aircraft change due to maintenance. New time: ${assign.new_scheduled_time}`       );     } else {       await updateLoad(assign.load_id, {         status: 'RESCHEDULED',         new_date: assign.new_date       });       await notifyPassengers(assign.load_id,         `Rescheduled to ${assign.new_date} due to aircraft maintenance.`       );     }   }    return { loads_redistributed: assignments.length, action: 'CASCADED' }; } |
| --- |

| async function validateSunsetLoad(dzId: string, loadTime: Date) {   const dzGeo = await db.query(`SELECT latitude, longitude FROM dropzones WHERE id = ?`, [dzId]);    // Calculate sunset for today at DZ location   const sunset = calculateSunset(dzGeo.latitude, dzGeo.longitude);   const minLandingTime = subMinutes(sunset, 45);    // Load departs at loadTime. Alt = ~13,500 ft typical. Freefall ~5 min, canopy ~8 min.   const maxLoadTime = subMinutes(minLandingTime, 15); // 15 min total time in air    if (loadTime > maxLoadTime) {     return {       valid: false,       reason: 'TOO_LATE_FOR_SUNSET',       sunset,       minLoadTime: maxLoadTime,       message: `Sunset ${sunset}. Last load must depart by ${maxLoadTime}.`     };   }    return {     valid: true,     sunset,     minLoadTime: maxLoadTime,     message: `Sunset load OK. Must depart by ${maxLoadTime}.`   }; } |
| --- |

| async function gearCheckInProcess(dzId: string) {   // End of day: all rental gear must be checked in    // 1. Get all gear assignments for today   const assignments = await db.query(     `SELECT * FROM gear_assignments WHERE dz_id = ? AND date = CURDATE()`,     [dzId]   );    const notCheckedIn = [];   for (const assign of assignments) {     if (!assign.checked_in_at) {       notCheckedIn.push({         gear_id: assign.gear_id,         jumper_id: assign.jumper_id,         checked_out_at: assign.checked_out_at       });     }   }    // 2. Alert staff + jumpers   if (notCheckedIn.length > 0) {     await notifyDZStaff(dzId, 'GEAR_NOT_CHECKED_IN', {       count: notCheckedIn.length,       details: notCheckedIn     });   }    // 3. Track which gear is missing (for insurance claim if needed)   const missingGear = notCheckedIn.filter(     g => Date.now() - g.checked_out_at > 2 * HOUR   );    return { total_assignments: assignments.length, not_checked_in: notCheckedIn.length, missing: missingGear }; } |
| --- |

| async function dayEndReconciliation(dzId: string, date: Date) {   // Cash collected vs digital payments vs expected revenue    const bookings = await db.query(     `SELECT * FROM bookings WHERE dz_id = ? AND date = ? AND status IN ('COMPLETED', 'REFUNDED')`,     [dzId, date]   );    const cash = bookings     .filter(b => b.payment_method === 'CASH')     .reduce((sum, b) => sum + b.amount, 0);    const digital = bookings     .filter(b => b.payment_method === 'CARD')     .reduce((sum, b) => sum + b.amount, 0);    const refunds = bookings     .filter(b => b.status === 'REFUNDED')     .reduce((sum, b) => sum + b.refund_amount, 0);    const expectedRevenue = digital; // (digital payments are definitive)   const actualCash = await getCashDrawerTotal(dzId);    const discrepancy = actualCash - cash;    const report = {     date,     completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,     expectedCash: cash,     actualCash,     discrepancy,     digitalPayments: digital,     refundsIssued: refunds,     netRevenue: expectedRevenue - refunds   };    if (Math.abs(discrepancy) > 10) {     await alertManager(dzId, 'CASH_DISCREPANCY', {       expected: cash,       actual: actualCash,       diff: discrepancy     });   }    return report; } |
| --- |

| async function autoAssignInstructor(   loadId: string,   skillsRequired: string[],   languagePreferred: string ) {   // Fallback chain with escalation at each step    // 1. Exact match: required skills + preferred language   let candidates = await db.query(     `SELECT i.* FROM instructors i     JOIN instructor_skills isk ON i.id = isk.instructor_id     WHERE i.language = ? AND isk.skill_code IN (?)`,     [languagePreferred, skillsRequired]   );   if (candidates.length > 0) return selectBest(candidates);    // 2. Fallback: required skills, any language   candidates = await db.query(     `SELECT i.* FROM instructors i     JOIN instructor_skills isk ON i.id = isk.instructor_id     WHERE isk.skill_code IN (?)`,     [skillsRequired]   );   if (candidates.length > 0) {     // Warn: language mismatch     await notifyDZManager(loadId, 'LANGUAGE_MISMATCH', { candidates });     return selectBest(candidates);   }    // 3. Fallback: cross-trained (can teach multiple skill types)   candidates = await db.query(     `SELECT i.* FROM instructors i     WHERE i.cross_trained = 1 AND i.active = 1`   );   if (candidates.length > 0) {     // Flag for manual verification     await notifyDZManager(loadId, 'CROSS_TRAINED_ONLY', { candidates });     return selectBest(candidates);   }    // 4. FAILURE: no instructor available   await updateLoad(loadId, {     status: 'UNASSIGNED',     assignment_attempt: 'FAILED_NO_INSTRUCTOR'   });   await notifyDZManager(loadId, 'NO_INSTRUCTOR_AVAILABLE', {     skillsRequired,     action: 'MANUAL_ASSIGNMENT_REQUIRED'   });    return { status: 'FAILED', reason: 'NO_INSTRUCTOR_AVAILABLE' }; } |
| --- |

| interface PricingContext {   activityType: 'TANDEM' | 'AFF' | 'COACHING' | 'FREEFLY';   customerType: 'FIRST_TIMER' | 'LICENSED' | 'TOURIST' | 'GROUP';   demand: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK';   dayOfWeek: number; // 0-6   seasonality: 'LOW' | 'HIGH';   competitionPrice?: number; // local DZ price }  function pricingStrategy(context: PricingContext): number {   const basePrice = {     'TANDEM': 250,     'AFF': 180,     'COACHING': 150,     'FREEFLY': 200   }[context.activityType];    let multiplier = 1.0;    // First-timers: INELASTIC. Price barely moves.   if (context.customerType === 'FIRST_TIMER') {     // Surge pricing alienates locals     if (context.demand === 'PEAK') multiplier = 1.1; // +10% max     // Never discount first-timers (they don't know the price)     return Math.round(basePrice * multiplier);   }    // Licensed jumpers: ELASTIC. They'll shop around.   if (context.customerType === 'LICENSED') {     // Loyalty discount for regulars     if (context.demand === 'LOW') multiplier = 0.85; // -15%     if (context.demand === 'MEDIUM') multiplier = 1.0;     // High demand: slight increase, but not aggressive     if (context.demand === 'HIGH') multiplier = 1.05;     if (context.demand === 'PEAK') multiplier = 1.1;     // Cap increase to avoid losing community jumpers     multiplier = Math.min(multiplier, 1.15);     return Math.round(basePrice * multiplier);   }    // Groups: discount for volume, but cap it   if (context.customerType === 'GROUP') {     multiplier = Math.max(0.9, 1.0 - (context.groupSize * 0.02)); // -2% per person, min 10% off     return Math.round(basePrice * multiplier);   }    return Math.round(basePrice * multiplier); } |
| --- |

| interface NotificationBudget {   userId: string;   role: 'ATHLETE' | 'INSTRUCTOR' | 'OPERATOR' | 'MANAGER';   maxPerDay: number;   priorityQueue: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'[];   aggregation: { batch_non_urgent: boolean; batch_count: number }; }  async function smartNotification(   userId: string,   message: { title: string; priority: string; payload: any } ) {   const budget = await getNotificationBudget(userId);   const sentToday = await db.query(     `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND date = CURDATE()`,     [userId]   );    // CRITICAL always goes through   if (message.priority === 'CRITICAL') {     await sendNotification(userId, message);     return { action: 'SENT', reason: 'CRITICAL' };   }    // Over budget: defer to batch   if (sentToday[0].cnt >= budget.maxPerDay) {     // Add to aggregation queue (send as batch at EOD)     await db.query(       `INSERT INTO notification_queue (user_id, message, priority, batch_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,       [userId, JSON.stringify(message), message.priority]     );     return { action: 'QUEUED_FOR_BATCH', reason: 'DAILY_BUDGET_EXCEEDED' };   }    // Check priority: HIGH goes through, MEDIUM/LOW might defer   if (message.priority === 'HIGH') {     await sendNotification(userId, message);     return { action: 'SENT', reason: 'HIGH_PRIORITY' };   }    // MEDIUM/LOW: aggregate   if (budget.aggregation.batch_non_urgent) {     await db.query(       `INSERT INTO notification_queue (user_id, message, priority, batch_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 4 HOUR))`,       [userId, JSON.stringify(message), message.priority]     );     return { action: 'QUEUED_FOR_BATCH', reason: 'AGGREGATION' };   }    // Default: send   await sendNotification(userId, message);   return { action: 'SENT' }; } |
| --- |

| // Event-Driven Core: Saga Patterns + Dead Letter Queue  interface Event {   id: string;   type: string;   version: number; // For event versioning   timestamp: Date;   aggregateId: string; // booking_id, load_id, etc.   payload: any;   causation?: string; // event_id that caused this   metadata: {     userId?: string;     dzId: string;     source: 'API' | 'SYSTEM' | 'MANUAL';   }; }  class EventBus {   async publishEvent(event: Event) {     // 1. Write to event store (append-only)     await db.query(       `INSERT INTO event_store (id, type, version, aggregate_id, payload, metadata, timestamp)       VALUES (?, ?, ?, ?, ?, ?, ?)`,       [event.id, event.type, event.version, event.aggregateId, JSON.stringify(event.payload),        JSON.stringify(event.metadata), event.timestamp]     );      // 2. Publish to Redis Streams (fanout to handlers)     await redis.xadd(       `events:${event.type}`,       '*',       'event', JSON.stringify(event)     );      return event.id;   }    async handleEvent(event: Event, handler: Function) {     try {       await handler(event);     } catch (error) {       // 3. Retry 3x with exponential backoff       for (let i = 0; i < 3; i++) {         await sleep(Math.pow(2, i) * 1000);         try {           await handler(event);           return;         } catch (e) {           if (i === 2) throw e;         }       }     }      // 4. If still fails: move to Dead Letter Queue for manual review     await db.query(       `INSERT INTO dlq (event_id, event_type, error, timestamp) VALUES (?, ?, ?, ?)`,       [event.id, event.type, error.message, new Date()]     );   }    async replayEvents(fromTimestamp: Date, toTimestamp: Date) {     // 5. Disaster recovery: replay events from a point in time     const events = await db.query(       `SELECT * FROM event_store WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC`,       [fromTimestamp, toTimestamp]     );     for (const event of events) {       await this.publishEvent(event);     }     return { events_replayed: events.length };   } } |
| --- |

| Step | Typical Time | Realistic Completion % | Fallback if Skipped |
| --- | --- | --- | --- |
| Waiver signature | 3–5 min | 75% | Paper waiver at check-in (+3 min) |
| Safety video (tandem) | 5 min | 35% | In-person briefing at DZ (+5 min) |
| Gear sizing questionnaire | 2 min | 70% | Sizing at check-in by feel (+5 min) |
| Document upload | 2 min | 60% | Manual ID check at kiosk (+3 min) |
| Instructor intro message | 1 min | 45% | First meet at gear-up (+2 min) |
| Emergency contact confirmation | 1 min | 85% | Ask on paper form (+1 min) |

| // waivers table: stores all versions of waivers per DZ per jurisdiction interface Waiver {   id: string;   dropzone_id: string;   language_id: string;        // en_US, fr_FR, de_DE, es_ES, etc.   version: number;            // incremented when legal text changes   title: string;              // "USPA Tandem Waiver 2025"   body_html: string;          // full HTML with formatting   legal_jurisdiction: string; // US_USPA, FR_FFP, UK_BPA, DE_DFV, MENA_VARIES   requires_witness: boolean;  // some jurisdictions require human witness   requires_notary: boolean;   // rare but required in some countries   effective_from: Date;   effective_to: Date | null;  // old versions stay in archive   created_at: Date; }  // waiver_signatures table: track every signature with metadata interface WaiverSignature {   id: string;   waiver_id: string;   athlete_id: string;   signed_at: Date;   ip_address: string;         // for later audit if needed   device_fingerprint: string; // browser/device identification   signature_image: Buffer;    // canvas signature drawn on phone   witness_name?: string;      // if human witness required   witness_signature?: Buffer;   is_minor: boolean;   guardian_id?: string;       // if minor, link to parent/guardian   guardian_signature?: Buffer;   legal_acceptance_timestamp: Date; // explicit acceptance timestamp } |
| --- |

| // TypeScript: Check if athlete's current waiver signature is still valid async function validateWaiverSignature(   athleteId: string,   dzId: string ): Promise<{   valid: boolean;   signedAt: Date;   expiresAt?: Date;  // validity period (often 12 months)   needsResign: boolean; // if waiver version changed   waiverVersion: number;   currentVersion: number; }> {   // Get athlete's most recent signature for this DZ   const lastSignature = await db.query(     `SELECT ws.*, w.version FROM waiver_signatures ws      JOIN waivers w ON ws.waiver_id = w.id      WHERE ws.athlete_id = ? AND w.dropzone_id = ?      ORDER BY ws.signed_at DESC LIMIT 1`,     [athleteId, dzId]   );    if (!lastSignature) {     return { valid: false, needsResign: true, currentVersion: 0 };   }    // Get current waiver version for this DZ   const currentWaiver = await db.query(     `SELECT version FROM waivers      WHERE dropzone_id = ? AND effective_to IS NULL LIMIT 1`,     [dzId]   );    const needsResign = lastSignature.version < currentWaiver[0].version;    // Check expiration (some jurisdictions expire annually)   const signatureAge = Date.now() - lastSignature.signed_at.getTime();   const validity = 12 * 30 * 24 * 60 * 60 * 1000; // 12 months   const expired = signatureAge > validity;    return {     valid: !needsResign && !expired,     signedAt: lastSignature.signed_at,     expiresAt: new Date(lastSignature.signed_at.getTime() + validity),     needsResign: needsResign || expired,     waiverVersion: lastSignature.version,     currentVersion: currentWaiver[0].version   }; } |
| --- |

| // safety_content table: stores all safety briefing materials interface SafetyContent {   id: string;   dropzone_id: string;   activity_type: "tandem" | "aff" | "licensed" | "funjump";   content_type: "video" | "document" | "interactive_quiz";   language_id: string;   url: string;               // S3 URL for video/PDF   duration_seconds: number;  // for video, estimate for document   version: number;           // update when content changes   is_mandatory: boolean;     // must complete before booking confirms   created_at: Date;   updated_at: Date; }  // safety_completions table: track who completed what interface SafetyCompletion {   id: string;   content_id: string;   athlete_id: string;   completed_at: Date;   score?: number;            // for quizzes (0–100)   time_spent_seconds: number;   device_type: "mobile" | "tablet" | "desktop";   passed: boolean;           // quiz pass/fail } |
| --- |

| // TypeScript: Retrieve safety content for an athlete async function getSafetyContent(   athleteId: string,   activityType: "tandem" | "aff" | "licensed",   dzId: string,   languageId: string ): Promise<SafetyContent[]> {   // Get athlete's preferred language, fallback to DZ default   const athlete = await db.query(     "SELECT preferred_language_id FROM athletes WHERE id = ?",     [athleteId]   );   const lang = languageId || athlete[0]?.preferred_language_id || "en_US";    // Fetch content for activity type, language, and DZ   const content = await db.query(     `SELECT * FROM safety_content      WHERE dropzone_id = ? AND activity_type = ? AND language_id = ?      ORDER BY version DESC`,     [dzId, activityType, lang]   );    // Determine which content is mandatory vs optional   return content.map(item => ({     ...item,     required: item.is_mandatory && activityType === "aff"   })); } |
| --- |

| // training_modules table: AFF level 1–8 ground school curriculum interface TrainingModule {   id: string;   aff_level: number;         // 1–8   title: string;   description: string;   video_url: string;   document_url: string;      // PDF download   quiz_questions: {     id: string;     question: string;     options: string[];     correctAnswer: number;   // index     explanation: string;   }[];   passing_score: number;     // typically 80%   estimated_duration_minutes: number;   created_at: Date; }  // training_completions table: track student progress interface TrainingCompletion {   id: string;   module_id: string;   athlete_id: string;   started_at: Date;   completed_at?: Date;   quiz_score?: number;   attempts: number;   passed: boolean;   last_attempt_at: Date; } |
| --- |

| // TypeScript: Check if student is ready for AFF level async function checkTrainingReadiness(   athleteId: string,   affLevel: number ): Promise<{   ready: boolean;   completedModules: number[];   pendingModules: number[];   lastQuizScore?: number;   nextAvailableLevel: number; }> {   // Get all training completions for this athlete, levels 1 to affLevel   const completions = await db.query(     `SELECT tc.*, tm.aff_level, tm.passing_score      FROM training_completions tc      JOIN training_modules tm ON tc.module_id = tm.id      WHERE tc.athlete_id = ? AND tm.aff_level <= ?      ORDER BY tm.aff_level`,     [athleteId, affLevel]   );    // Check: all modules < affLevel must be passed   const completed = completions.filter(c => c.passed && c.aff_level < affLevel);   const currentLevel = completions     .filter(c => c.passed)     .map(c => c.aff_level)     .reduce((max, level) => Math.max(max, level), 0);    const ready = completed.length === affLevel - 1     && currentLevel >= affLevel - 1;    return {     ready,     completedModules: completed.map(c => c.aff_level),     pendingModules: affLevel > 1       ? Array.from({length: affLevel - 1}, (_, i) => i + 1)           .filter(l => !completed.some(c => c.aff_level === l))       : [],     lastQuizScore: completions[completions.length - 1]?.quiz_score,     nextAvailableLevel: currentLevel + 1   }; } |
| --- |

| // gear_sizing table: athlete body measurements & sizing suggestions interface GearSizing {   id: string;   athlete_id: string;   weight_kg: number;   height_cm: number;   shoe_size: number;           // EU standard   chest_cm: number;            // measured or self-reported   waist_cm: number;   jumpsuit_size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "CUSTOM";   harness_size: "S" | "M" | "L" | "XL" | "CUSTOM";   helmet_size: "S" | "M" | "L" | "XL";   sizing_confidence: "high" | "medium" | "low";   notes: string;              // "wide shoulders", "short legs", etc.   updated_at: Date; }  // gear_reservations table: reserve specific gear items for jumper interface GearReservation {   id: string;   gear_item_id: string;       // specific physical piece of gear   athlete_id: string;   load_id: string;            // which jump load / time slot   reserved_from: Date;   reserved_until: Date;   status: "reserved" | "assigned" | "returned" | "cancelled";   modified_at: Date; } |
| --- |

| // TypeScript: Suggest gear sizes based on body measurements async function suggestGearSizing(   athleteId: string ): Promise<{   jumpsuit: string;   harness: string;   helmet: string;   confidence: "high" | "medium" | "low";   warnings: string[]; }> {   const athlete = await db.query(     `SELECT weight_kg, height_cm, chest_cm, waist_cm      FROM gear_sizing WHERE athlete_id = ?`,     [athleteId]   );    if (!athlete) return { jumpsuit: "M", harness: "M", helmet: "M",     confidence: "low", warnings: ["No measurements provided"] };    const { weight_kg, height_cm, chest_cm } = athlete[0];   const warnings = [];   let confidence = "high";    // Jumpsuit sizing: weight + height   let jumpsuit = "M";   if (weight_kg < 65 || height_cm < 165) jumpsuit = "S";   if (weight_kg > 85 || height_cm > 185) jumpsuit = "L";   if (weight_kg > 105 || height_cm > 195) jumpsuit = "XL";    // Harness sizing: weight-based   let harness = "M";   if (weight_kg < 70) harness = "S";   if (weight_kg > 90) harness = "L";   if (weight_kg > 110) harness = "XL";    // Helmet sizing: head measurement proxy (no head data, use height)   let helmet = "M";   if (height_cm < 160) helmet = "S";   if (height_cm > 190) helmet = "L";    // Confidence adjustment   if (!chest_cm) {     confidence = "medium";     warnings.push("No chest measurement — size at check-in");   }   if (weight_kg > 120 || weight_kg < 50) {     confidence = "low";     warnings.push("Extreme weight — final fitting required");   }    return { jumpsuit, harness, helmet, confidence, warnings }; } |
| --- |

| // TypeScript: Assign pre-arrival instructor async function assignPreArrivalInstructor(   bookingId: string ): Promise<{   instructor: {     id: string;     name: string;     photo_url: string;     bio: string;     certifications: string[];     languages: string[];     experience_years: number;     tandem_jumps: number;     aff_levels_certified: number[];   } | null;   confidence: "high" | "medium" | "low";   assigned_at: Date;   changed_before_arrival_probability: number; }> {   const booking = await db.query(     `SELECT athlete_id, dropzone_id, activity_type, date_time,             athlete_weight FROM bookings WHERE id = ?`,     [bookingId]   );    // Get available instructors for this activity & time slot   const availInstructors = await db.query(     `SELECT u.id, u.name, u.photo_url, u.bio,             u.certifications, u.languages, u.experience_years      FROM users u      WHERE u.dropzone_id = ?        AND u.role = "instructor"        AND u.available_on >= ?        AND u.max_student_weight >= ?      ORDER BY u.experience_years DESC, u.tandem_jumps DESC LIMIT 5`,     [booking[0].dropzone_id, booking[0].date_time, booking[0].athlete_weight]   );    if (availInstructors.length === 0) {     return { instructor: null, confidence: "low", changed_before_arrival_probability: 0.8 };   }    // Prefer instructor matching language   const athlete = await db.query(     "SELECT preferred_language_id FROM athletes WHERE id = ?",     [booking[0].athlete_id]   );    const preferredInstructor = availInstructors.find(inst =>     inst.languages.includes(athlete[0].preferred_language_id)   ) || availInstructors[0];    // Assign and notify   await db.query(     `UPDATE bookings SET assigned_instructor_id = ? WHERE id = ?`,     [preferredInstructor.id, bookingId]   );    return {     instructor: preferredInstructor,     confidence: availInstructors.length > 2 ? "high" : "medium",     assigned_at: new Date(),     changed_before_arrival_probability: 0.25   }; } |
| --- |

| // reminder_schedules table: track all outgoing reminders interface ReminderSchedule {   id: string;   booking_id: string;   reminder_type: "confirmation" | "7day" | "24hour" | "2hour" | "noshow";   scheduled_at: Date;   channel: "push" | "whatsapp" | "sms" | "email";   status: "pending" | "sent" | "delivered" | "read" | "failed";   sent_at?: Date;   delivered_at?: Date;   read_at?: Date;   failure_reason?: string; }  // TypeScript: Schedule reminder sequence for booking async function scheduleReminders(bookingId: string): Promise<string[]> {   const booking = await db.query(     "SELECT athlete_id, date_time FROM bookings WHERE id = ?",     [bookingId]   );    const jumptimes = {     confirmation: new Date(),     "7day": new Date(booking[0].date_time - 7 * 24 * 60 * 60 * 1000),     "24hour": new Date(booking[0].date_time - 24 * 60 * 60 * 1000),     "2hour": new Date(booking[0].date_time - 2 * 60 * 60 * 1000),     noshow: new Date(booking[0].date_time + 15 * 60 * 1000)   };    const reminders = [];   for (const [type, scheduledAt] of Object.entries(jumptimes)) {     const reminder = {       id: `reminder_${bookingId}_${type}`,       booking_id: bookingId,       reminder_type: type,       scheduled_at: scheduledAt,       channel: type === "confirmation" ? "email" : "push",       status: "pending"     };     await db.insert("reminder_schedules", reminder);     reminders.push(reminder.id);     // Queue in BullMQ for async delivery     reminderQueue.add(reminder, { delay: scheduledAt - Date.now() });   }    return reminders; } |
| --- |

| // jumper_documents table: track uploaded documents interface JumperDocument {   id: string;   athlete_id: string;   document_type: "passport" | "drivers_license" | "logbook" | "medical_clearance"                  | "license_translation";   file_url: string;           // S3 secure URL   uploaded_at: Date;   verified_by?: string;       // user ID of staff member   verified_at?: Date;   status: "pending" | "verified" | "rejected";   rejection_reason?: string;   expires_at?: Date;          // when document is no longer valid   country_code: string;       // for jurisdiction-specific requirements }  // TypeScript: Check document readiness before arrival async function checkDocumentStatus(   athleteId: string,   dzId: string ): Promise<{   ready: boolean;   verified: string[];   pending: string[];   expired: string[];   missing: string[]; }> {   // Get activity type from athlete's booking   const booking = await db.query(     `SELECT activity_type FROM bookings      WHERE athlete_id = ? AND dropzone_id = ?      ORDER BY date_time DESC LIMIT 1`,     [athleteId, dzId]   );    if (!booking) return { ready: false, verified: [], pending: [],     expired: [], missing: ["No active booking"] };    const required = {     tandem: ["passport", "drivers_license"],     aff: ["passport", "drivers_license", "logbook"],     licensed: ["passport", "drivers_license"]   }[booking[0].activity_type];    // Fetch documents   const documents = await db.query(     `SELECT * FROM jumper_documents WHERE athlete_id = ?`,     [athleteId]   );    const verified = documents     .filter(d => d.status === "verified"       && d.expires_at > new Date())     .map(d => d.document_type);    const missing = required.filter(r => !verified.includes(r));   const pending = documents     .filter(d => d.status === "pending")     .map(d => d.document_type);   const expired = documents     .filter(d => d.expires_at < new Date())     .map(d => d.document_type);    return {     ready: missing.length === 0,     verified,     pending,     expired,     missing   }; } |
| --- |

| // TypeScript: Express check-in validation async function expressCheckIn(   athleteId: string,   dzId: string ): Promise<{   status: "express" | "standard";   completedSteps: string[];   missingSteps: string[];   lane: string;   timeEstimate: number; }> {   const checks = {};    // Waiver verification   const waiver = await validateWaiverSignature(athleteId, dzId);   checks.waiver = waiver.valid;    // Safety video (for tandem)   const safetyCompletion = await db.query(     `SELECT completed_at FROM safety_completions      WHERE athlete_id = ? AND content_id IN        (SELECT id FROM safety_content WHERE activity_type = "tandem")`,     [athleteId]   );   checks.safety = safetyCompletion.length > 0;    // Gear sizing   const sizing = await db.query(     "SELECT id FROM gear_sizing WHERE athlete_id = ?",     [athleteId]   );   checks.gear = sizing.length > 0;    // Documents   const docs = await checkDocumentStatus(athleteId, dzId);   checks.documents = docs.ready;    // Payment   const payment = await db.query(     `SELECT status FROM bookings      WHERE athlete_id = ? AND dropzone_id = ?      ORDER BY date_time DESC LIMIT 1`,     [athleteId, dzId]   );   checks.payment = payment[0]?.status === "paid";    const completed = Object.entries(checks)     .filter(([_, v]) => v)     .map(([k]) => k);   const missing = Object.entries(checks)     .filter(([_, v]) => !v)     .map(([k]) => k);    const isExpress = missing.length === 0;   const timeEstimate = isExpress ? 2 : 15;    return {     status: isExpress ? "express" : "standard",     completedSteps: completed,     missingSteps: missing,     lane: isExpress ? "FAST TRACK" : "STANDARD",     timeEstimate   }; } |
| --- |

| Metric | Baseline (Manual) | Target (System) | Method |
| --- | --- | --- | --- |
| Avg check-in time | 15 min | 3 min (express) | Manifest log timestamps |
| Pre-arrival completion % | 25% | 65% | Database tracking |
| Staff time per jumper | 15 min | 3 min | Multiply by daily load count |
| Document re-check rate | 100% | 10% | Manifest staff feedback |
| Waiver re-signing rate | 50% | 5% | Historical tracking |
| NPS delta (pre vs post) | — | +8 points | Survey at 3-month mark |

| // ROI calculation example: // DZ: 8 jumpers/day (tandem + licensed), $35/hr staff cost  // Baseline (15 min per jumper × 8 jumpers × 5 days/week) const dailyMinutesBefore = 8 * 15; // 120 min/day const weeklyHoursBefore = (dailyMinutesBefore * 5) / 60; // 10 hrs/week const weeklyBeforeCost = weeklyHoursBefore * 35; // $350/week  // With system (3 min for 50% of jumpers, 10 min for 50%) const expressMinutes = 8 * 0.5 * 3; // 12 min const standardMinutes = 8 * 0.5 * 10; // 40 min const dailyMinutesAfter = expressMinutes + standardMinutes; // 52 min/day const weeklyHoursAfter = (dailyMinutesAfter * 5) / 60; // 4.3 hrs/week const weeklyAfterCost = weeklyHoursAfter * 35; // $150.50/week  // Annual savings const weeklySavings = weeklyBeforeCost - weeklyAfterCost; // $199.50/week const annualSavings = weeklySavings * 52; // ~$10,374/year  // System cost: SkyLara license at $500/month + Twilio/SendGrid const systemCost = (500 + 150) * 12; // $7,800/year const netROI = annualSavings - systemCost; // $2,574/year (positive) |
| --- |