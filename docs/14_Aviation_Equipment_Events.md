# SKYLARA

_Source: 14_Aviation_Equipment_Events.docx_

SKYLARA
Aviation, Equipment & Events
Steps 26–30  |  Airspace • Aircraft • Gear • Training • Events
Version 1.0  |  April 2026  |  Brutally Honest Edition
NOTAM Integration • CG/Weight Balance • Reserve Repack Tracking • AFF Progression • Boogie Management
# Table of Contents
# CHAPTER 26: AIRSPACE & ATC INTEGRATION
## 26.1 Airspace Architecture Overview
Most dropzones operate under a Letter of Agreement (LOA) with local ATC that defines the jump run corridor, altitude blocks, and notification requirements. SkyLara must support two operational models: automated NOTAM filing for large DZs with Part 105 waivers, and manual ATC phone workflows for small DZs where the pilot calls tower directly.
BRUTAL TRUTH: Most DZs worldwide do NOT have electronic ATC integration. The pilot picks up the radio and calls. SkyLara can assist with scheduling, notification templates, and record-keeping, but real ATC integration is 90% workflow management and 10% actual electronic integration.
### DZ Type × ATC Integration Patterns
## 26.2 NOTAM Integration
NOTAMs (Notices to Air Missions) are mandatory when DZ operations affect navigable airspace. SkyLara auto-generates NOTAM text from the load schedule, integrates with FAA/EUROCONTROL APIs where available, and provides system-generated templates for manual filing.
### NOTAM Database Schema
### Implementation Notes
generateNOTAMText(dzId, date, operations): Creates FAA-compliant NOTAM text from load schedule. Input: DZ location (lat/lon), jump altitude blocks, estimated jumpers, time window. Output: formatted NOTAM ready for filing.
fileNOTAM(dzId, notamData): Routes to FAA API (US), EUROCONTROL (EU), or generates print/fax template (non-electronic ops). BRUTAL: FAA NOTAM API is not real-time — filing takes 30-60 min to propagate. Many large DZs file a blanket NOTAM for sunrise-to-sunset rather than per-load to reduce overhead.
Recommended pattern: File recurring (or daily blanket) NOTAMs during ops planning, rather than per-load. Reduces admin friction and mirrors real-world DZ practice.
## 26.3 ATC Notification Workflow
Pre-jump notification informs ATC 15 min before the jump run. Post-jump notification confirms all jumpers clear of airspace. SkyLara tracks communication state and method (radio, phone, or electronic).
### Notification State Machine
### ATC Communications Schema
BRUTAL TRUTH: ATC acknowledgment is verbal over radio. There is NO electronic confirmation. The pilot calls tower, hears "roger" or "cleared," and must log it manually in SkyLara or the system auto-creates the entry when the pilot taps "ATC Cleared." This is not a two-way sync — it is manual record-keeping.
initiateATCNotification(loadId): Generates pre-jump notification form in pilot app. Displays: aircraft callsign, number of jumpers, jump altitude, estimated time over DZ target. Logs timestamp when pilot confirms contact initiated.
Fallback if no ATC acknowledgment within 30 min: manifest can FORCE jump with operator override (logged as deliberate waiver).
## 26.4 Jump Window Scheduling
Jump windows are time blocks when the DZ is cleared to operate under its LOA. Windows define legal operating hours, altitude caps, and any restrictions (IFR conditions, noise curfews, etc.).
### Jump Windows Schema
### Sunrise/Sunset & Civil Twilight Calcs
No jump runs before civil twilight (sun 6° below horizon) or after sunset minus 45 min safety buffer (or per local ops specs).
Use latitude/longitude + date to compute solar times (NOAA algorithms or third-party lib). Integrate into load scheduling UI: automatically gray out forbidden time slots.
Allow operator override with written safety justification + incident log.
BRUTAL TRUTH: Jump windows are often informal — "call tower when ready" rather than fixed slots. Rural DZs may have no formal window; busy airports have rigid NOTAM-based blocks. SkyLara must handle both rigid scheduling (enforce window strictly) and flexible ops (log approvals post-hoc).
validateJumpWindow(loadId, scheduledTime): Checks if scheduled load time falls within an approved jump window for that day. Returns: valid (bool), window_id, violations (array of restrictions). Hard-blocks if outside window; soft-warns if restrictions present.
## 26.5 Airspace Conflict Detection
Detect conflicts between DZ operations and other traffic: instrument approaches, other nearby DZs, TFRs (Temporary Flight Restrictions), and military operations.
### Conflict Categories
Multi-DZ airspace overlap: Two DZs operating in same altitude block at same time (rare but possible in DZ clusters). Alert both operations.
Instrument approach intersection: DZ jump run corridor intersects with instrument approach path during IFR conditions. Check NOTAMs for active IFR approaches.
TFR (Temporary Flight Restriction) monitoring: Real-time check of FAA TFR database (US) or equivalent. If TFR issued that affects DZ airspace, immediate notification to operator + pilot app.
Military operations: Check NOTAMs for military exercise NOTAMs, restricted airspace (R-areas), military training routes (MTRs).
BRUTAL TRUTH: Real airspace deconfliction (separation assurance) is the pilot's job and ATC's job, not software. SkyLara provides awareness, notification, and record-keeping. Never imply the system replaces human judgment or regulatory authority.
## 26.6 Pilot Communication System
In-app pilot interface provides load details, passenger manifest, weather briefing, and ATC status. Digital pre-flight checklist ensures compliance before takeoff.
### Pre-Flight Checklist
### In-Flight Status Updates
Pilot updates load status in real-time: AIRBORNE → JUMPRUN (aircraft leveled, doors configured) → JUMPRUN_ACTIVE (jumpers exiting) → ALL_CLEAR (all jumpers out, ATC post-jump call made) → LANDED.
DZ manifest views live load status. If ALL_CLEAR not logged within 5 min of last exit time, manifest sends ping to pilot.
## 26.7 Emergency Communication
Separate emergency channel for urgent situations: medical emergency under canopy, aircraft emergency, airspace intrusion, or equipment failure in-flight.
Emergency button in pilot app triggers DZ-wide notification, recorded call log, and optional emergency services auto-alert (if DZ has integration configured).
Schema: emergency_incidents (id, load_id, initiated_by, initiated_at, type, description, resolved_at, incident_report_url).
# CHAPTER 27: AIRCRAFT & PILOT MANAGEMENT
## 27.1 Aircraft Registry
The aircraft table is the foundation of load scheduling, maintenance tracking, and regulatory compliance. Each aircraft carries weight, balance, and performance data critical to safe jump operations.
### Aircraft Table Schema (Expanded)
### Aircraft Documents Tracking
### Multi-DZ Aircraft Rotation
Some jump aircraft rotate between DZs seasonally (e.g., spring/summer in north, fall/winter in south). Track transfers via aircraft_transfers (id, aircraft_id, from_dz, to_dz, transfer_date, hobbs_at_transfer).
Scheduling system must query current DZ location before assigning to a load. Cannot assign if aircraft in-transit or at different DZ.
## 27.2 Maintenance Tracking
Jump aircraft demand high utilization and frequent cycles. Maintenance tracking prevents airworthiness lapses and ensures compliance with FAA/EASA inspection regimes.
### Maintenance Types & Intervals
### Maintenance Schema
### Hobbs Meter & Flight Time Tracking
### Maintenance Alerts & Blocking
Maintenance due within 10 flight hours OR 7 calendar days: alert operator (soft-warn). Manifest can still schedule but sees warning in load UI.
Maintenance OVERDUE: aircraft status = GROUNDED. Cannot assign to any load. Hard-block in scheduling system.
Unscheduled repair flagged: if aircraft is in MAINTENANCE status → cannot be assigned until status returns to ACTIVE.
BRUTAL TRUTH: Hobbs tracking in SkyLara requires manual entry or integration with avionics (G1000, Garmin, etc.). Most jump planes do not have electronic hobbs reporting. Expect data gaps, manual transcription errors, and occasional disputes over flight time. Build redundancy: auto-calc from time-on-ground logs as fallback.
checkMaintenanceStatus(aircraftId): Returns next_due (maintenance_type, due_date, due_hours, days_remaining, hours_remaining), status (compliant/warning/overdue), blocking_flag (bool).
## 27.3 Airworthiness Tracking
Airworthiness is the cornerstone of flight safety. An aircraft is airworthy only if ALL required documents are current and no unresolved defects exist.
### Airworthiness Determination
### Airworthiness Compliance Check Logic
BRUTAL TRUTH: Airworthiness determination is the operator's legal responsibility, not software's. SkyLara tracks documents, issues alerts, and hard-blocks operations when red flags appear. System must include a disclaimer: 'This system assists with compliance tracking. Final airworthiness determination is the Operator's responsibility under applicable aviation regulations.'
## 27.4 CG & Weight-Balance System
CG (Center of Gravity) calculation ensures the aircraft remains within its safe envelope during jump operations. Multi-point CG tracking accounts for weight shifts as jumpers exit.
### Multi-Point CG Concept
### CG Calculation Input & Schema
### Visual CG Envelope Display
Chart: X-axis = aircraft station (nose to tail). Y-axis = weight or CG percent MAC. Polygon: aircraft CG envelope (forward limit, aft limit). Scatter points: current CG snapshots throughout jump sequence color-coded (green=safe, yellow=caution, red=violation).
Real-time update: as jumpers are manifested in app, recalc CG instantly and update chart.
BRUTAL TRUTH: CG calculation is only as accurate as jumper weights. Jumpers lie. System should either: (1) weigh at check-in (scale integration), (2) add 10% safety buffer to self-reported weights, or (3) require manifest officer sign-off with acknowledgment of weight uncertainty. Choose one.
calculateCGEnvelope(loadId): Auto-calc all snapshots (ground, takeoff, jumprun, exit progression, landing). Return: cg_snapshots[], violations[], final_status (pass/fail). Blocking: if final cg_location exceeds envelope bounds → cannot jump.
## 27.5 Pilot Profiles & Certifications
Pilot profiles store certificates, ratings, medical status, and currency. System enforces FAA duty limits and currency requirements before load assignment.
### Pilot Profile Schema
### Currency & Competency Requirements
validatePilotCurrency(pilotId, aircraftType): Checks all currency requirements. Returns: [{ type: "medical", status: "current" | "expired", expires_at }, { type: "bfr", status, expires_at }, ...]. If ANY critical status="expired" → pilot cannot be assigned.
Hard-block enforcement: manifesting system queries this before adding pilot to load. If validation fails, manifest UI shows red block with reason.
## 27.6 Pilot Scheduling & Duty Limits
Scheduling ensures pilot availability and enforces FAA duty time limits. Multi-pilot rotation reduces fatigue risk.
### Pilot Schedule Schema
### FAA Duty Limits (FAR 91.1059 & Operator Policy)
### Duty Time Calculation & Validation
BRUTAL TRUTH: Pilot duty limits are FAA-enforced and legally binding. Unlike instructor scheduling (soft-warn), pilot duty time limits must HARD-BLOCK. Violating these puts your certificate at risk. System must never allow override without explicit incident documentation.
Multi-pilot rotation: large DZs with 2+ full-time pilots should implement round-robin or seniority-based assignment to distribute fatigue fairly and reduce burnout.
## 27.7 Fuel Management
Fuel tracking integrates cost accounting, burn estimation, and reserve management. System ensures minimum fuel for jump operations plus legal VFR reserve.
### Fuel Schemas
### Fuel Burn Estimation
Input: aircraft type, target jump altitude, number of loads planned, wind headwind/tailwind.
Calc: base cruise burn (from aircraft specs) × altitude factor (higher = less dense air, slightly lower burn) × load time (climb to altitude + drift back to DZ). Typical: 7-8 gal/hr at 10,000 ft with 2-3 min climb.
Reserve: 45 min VFR (for jump ops) or per local regulation. Example: 8 gph burn × 0.75 hrs = 6 gal reserve.
### Fuel Alerts & Checks
Pre-flight check (part of pilot checklist): calculated minimum fuel ≤ available fuel. Soft-warn if tight; hard-block if insufficient.
Daily summary: show DZ operator fuel cost-per-load, burn trends, and fuel supplier pricing comparison.
Fuel status endpoint: query aircraft fuel on hand (manually entered by fuel attendant or synced from FBO API if available).
BRUTAL TRUTH: Fuel management at DZs is often informal. Fueled once in the morning, no per-load tracking. SkyLara should support both precise per-load tracking (preferred, accurate cost attribution) and daily bulk estimates (pragmatic for small DZs). System message: 'Fuel estimates are advisory. Pilot maintains final responsibility for fuel sufficiency.'
Chapter 26 & 27 Summary
Airspace & ATC is 90% workflow, 10% integration: manifest calls tower, pilot confirms, log it.
NOTAM filing, jump windows, conflict detection: awareness layers, not separation assurance.
Aircraft airworthiness is operator's legal responsibility; system tracks and alerts hard-blocks at boundaries.
CG calculation must account for jumper weight uncertainty; add safety buffer or weigh at check-in.
Pilot duty limits are FAA-enforced; hard-block violations with audit trail.
Fuel management: support both precise per-load tracking and pragmatic daily estimates.
# CHAPTER 28: EQUIPMENT & GEAR SYSTEM
## 28.1 Equipment Architecture Overview
Skydiving gear follows a strict hierarchy: every rig (container) contains a main canopy, reserve canopy, and Automatic Activation Device (AAD). The challenge is not the hierarchy—it is the tracking.
Gear ownership patterns vary: DZ-owned student rigs, DZ-owned tandem rigs, athlete-owned sport rigs, and rental inventory. Each pattern has different tracking requirements and legal implications.
BRUTAL TRUTH: Most dropzones track gear on whiteboards or spreadsheets. A rig goes out, someone writes the jumper's name. It comes back, someone erases it. Maintenance cycles are missed. AAD service dates slip past. Digital gear tracking will face fierce adoption resistance from older staff who have run the DZ for 20 years on paper.
The solution: make the tracking workflow so simple—rig in, rig out, takes 5 seconds—that it feels faster than the old system. Integrate with check-in. Suggest a rig based on jumper weight and experience. One scan at gear return. Done.
## 28.2 Rig Tracking System
Every DZ-owned rig must have a digital identity. The core table is
Assignment workflow tracked in
Integration with check-in workflow:
Jumper checks in → system retrieves their weight and experience level
System queries equipment_rigs, filters by (1) jumper weight in range, (2) rig_type matching jumper level, (3) status = available
Staff presents suggestion → click to assign → rig status changes to in_use
Rig returned after landing → staff scans NFC tag or barcode → confirms condition → rig available again
BRUTAL TRUTH: Rig return tracking is the weak link in every DZ system. Jumpers walk off the drop zone. Gear sits in a pile. Someone else grabs a rig from the pile that wasn't returned yet. A student loans their assigned rig to a friend. By day's end, the count does not match.
The fix is not software—it is process. Require a physical scan at gear return. NFC tag, barcode, QR code—something that forces the moment of "I am returning THIS rig NOW." Without this, the digital log becomes fiction within a week.
Key TypeScript functions:
## 28.3 Reserve Repack Cycles
This is where legal reality meets software design. The FAA mandates that reserve canopies must be repacked every 180 days OR per manufacturer specifications, whichever is sooner. A reserve that slips past its repack date is a liability bomb.
Reserve tracking lives in
Alert tiers are non-negotiable:
Current (within 160 days): rig available for assignment
Due Soon (161-180 days): yellow alert in dashboard, email DZ rigger daily
Overdue (>180 days): red alert, rig status = grounded, CANNOT be assigned
Grounded rig on manifest: assignment fails at booking creation, user sees error
Repack history is logged in
BRUTAL TRUTH: If a rig goes out with an expired reserve and someone gets hurt, the DZ faces criminal negligence charges, not just civil liability. This is the ONE feature where the system must HARD-BLOCK, not soft-warn.
No override. No "I'll just do it this once." No "The jumper wants to use this rig anyway." System explicitly denies booking if any reserve is overdue. Only exception: DZ owner explicitly unlocks a rig with a documented reason (e.g., "rigger out sick, new card coming Friday") stored as an audit log entry.
Key TypeScript functions:
## 28.4 AAD Monitoring
An Automatic Activation Device (AAD) is a small electromechanical package that fires the reserve parachute if the jumper is below altitude threshold (usually 750 ft) at high descent rate. It is the last line of defense.
Three dominant models: Cypres (German), Vigil (Irish), Mars (UK). Each has different service intervals and battery requirements.
AAD tracking in
BRUTAL TRUTH: AAD battery and service status is ONLY updated when a rigger physically checks the unit. There is no electronic AAD-to-cloud integration today. System relies 100% on manual entry by the person who actually services the gear.
Best practice: require riggers to update AAD status during every reserve repack. Status update = 2 minutes of attention. Systemically enforce this by making AAD renewal part of the reserve repack workflow in the UI.
Key TypeScript function:
## 28.5 Gear Rental System
Not every jumper owns gear. Students rent from the DZ. Traveling athletes rent helmets, altimeters, jumpsuits. Rental management is a secondary revenue stream and a critical liability tracker.
Rental catalog in
Rental transactions tracked in
Integration with booking workflow:
Athlete books AFF Level 1 package → booking_items auto-includes gear_rental (rig + helmet) at DZ rate
Gear is pre-allocated to booking at booking.confirmed_at
Check-in process: staff scans rental item, confirms condition_out, athlete signs liability waiver
Return process: staff inspects condition_in, flags any damage, charges additional fee if needed
BRUTAL TRUTH: Gear rental revenue is small—$20–50 per day—but tracking is essential for liability. If a malfunctioning helmet causes an injury, the DZ needs to prove maintenance history, condition checks, and that defects were not knowable at time of rental.
This is not a revenue system. This is a legal protection system. Treat it with the same rigor as reserve repack.
Key TypeScript function:
## 28.6 Equipment Assignment Per Jumper
The final step before a jumper gets on the plane: match jumper to appropriate gear. Rules differ by experience level and gear ownership.
Auto-sizing algorithm:
Student (AFF Level 0–2): assign DZ student rig with AAD in student mode, weight match required, staff assignment
Student (AFF Level 3+): student rig or coach/sport rig approved by instructor, weight match, AAD in expert mode
Tandem student: only DZ tandem rigs, no choice, AAD in tandem mode, student harness mandatory
Licensed jumper with own gear: skip rental, but DZ can require gear check (AAD current, reserve current)
Licensed visiting jumper unknown history: gear check mandatory before manifesting
Gear checks for licensed/visiting jumpers tracked in
BRUTAL TRUTH: Gear checks for licensed jumpers are often cursory or skipped entirely at busy DZs on weekends. Staff are rushed. A jumper says "I checked it myself." Clipboard gets signed, jumper goes up.
Fix: make the check a digital gate. On manifest check-in, if jumper has personal gear and is unknown to the DZ (first jump here), system requires documented gear check before slot confirmation. Check must include (1) AAD service date current, (2) reserve repack current, (3) obvious damage noted. Takes 90 seconds. Protects DZ from liability.
Key TypeScript function:
## 28.7 Maintenance Alerts & Scheduling
Gear health is only as good as the maintenance system. SkyLara must surface maintenance needs before equipment becomes grounded.
Maintenance triggers (conditions that must be tracked):
Reserve repack due (180 days)
AAD service due (per manufacturer interval)
AAD lifecycle expiry (15 years from DOM)
Container inspection due (per manufacturer spec, typically 2 years or 500 jumps)
Canopy inspection (every 500 jumps or 2 years, whichever first)
Harness wear (look for fraying, discoloration; no fixed interval, visual inspection)
Maintenance planning in
Alerts & notifications:
Daily email summary: send to DZ rigger list with all items due within 30 days
Dashboard widget: color-coded rig status board visible to manifester and ops staff
Slack/webhook integration: optional real-time alert on overdue items
Manifest gate: prevent assignment of grounded rigs (reserve overdue, AAD expired, etc)
BRUTAL TRUTH: Maintenance alerts only work if someone reads them. Rigger gets 50 emails a day. Dashboard sits in a browser tab they never visit. Alerts become noise.
Strongest enforcement: block grounded rigs from manifests. Second strongest: daily email digest (not notifications—one consolidated email). Third: dashboard widget visible at check-in.
Do not rely on push notifications. Riggers do not use the app. Email is the one channel that reaches them.
Key TypeScript function:
# CHAPTER 29: TRAINING & CERTIFICATION SYSTEM
## 29.1 Training Architecture Overview
Every jumper's journey follows a progression path. The path varies globally based on certification body and country regulations.
Standard US progression (USPA):
First Jump Course (FJC) — ground school + tandem jump
AFF Level 1–8 — progressive solo jumps with instructor
A License — 25 jumps minimum, pass written exam, solo jump requirement
B License — 50 jumps, water training, night jump endorsement
C License — 200 jumps, advanced skills
D License — 500 jumps, advanced rating holder
International variations: USPA (US), BPA (UK), APF (Australia), FFP (France), DFV (Germany), FAI (international). Each has unique progressions, jump counts, and skill requirements. USPA AFF-4 is not identical to BPA AFF-4. There is no universal standard.
BRUTAL TRUTH: SkyLara must support DZ-specific progression criteria, not assume one standard fits all. A UK DZ using BPA standards will not accept USPA-only templates. A multi-country operator (rare but exists) must switch contexts per location.
## 29.2 AFF Training Module System
Each DZ has a training curriculum. The curriculum includes ground school, quiz, and practical jump requirements. SkyLara stores training modules as configurable templates.
Training module schema in
SkyLara ships with default module templates for USPA (most common). DZs can customize per location and create variants for different instructor styles.
Module content splits into theory (online) and practical (in-person). Both are tracked separately:
Theory: quiz completion, passing score recorded
Practical: jump completion, instructor sign-off, skills demonstrated
Quizzes in
BRUTAL TRUTH: Online theory modules help students prepare. But the real training happens in the sky. Every AFF level requires a minimum of one jump with a rated instructor. System tracks the full picture but must NOT imply that completing online modules = jump readiness. A student can finish AFF-1 theory, fail the jump, and need to repeat the jump (not the theory). System must allow module reuse without re-quizzing.
Key TypeScript function:
## 29.3 Student Progression Tracking
Every student has a progression record that tracks their current level, completed levels, and history of attempts.
Progression record in
Level completion in
Repeat tracking: if student fails a level, system logs reason and tracks repeat attempts. If student switches instructors, system stores that preference for future jumps.
Currency check: if student has >30-day gap since last jump, require refresher jump with instructor at current level before advancing.
BRUTAL TRUTH: ~50% of AFF students drop out between AFF-1 and A-license. Most drop between AFF-1 and AFF-4 (the first real hurdle). They cite fear, cost, time, injury, or bad experience (instructor was harsh, bad weather, equipment issue).
System should track WHERE they drop (which level), WHY (inferred from notes and failure reasons), and trigger re-engagement. Send one follow-up email at 14 days, one at 30 days, then stop. Do not spam. But create the opportunity for comeback.
Example: "Hey [Name], we noticed you paused at AFF-2. Drop-outs at this level are usually confidence issues. Your instructor [X] can do a confidence jump with lower altitude threshold. Want to schedule?". Soft, not pushy.
Key TypeScript functions:
## 29.4 Instructor Sign-Off System
An instructor's sign-off is a legal attestation. It certifies that the student demonstrated the required skills for that level. This is not a checkbox.
Sign-offs tracked in
Some levels require multi-instructor sign-off. For example, USPA A-License requires sign-off from DZ S&TA and two AFF instructors. System must track and enforce multi-signature requirements before license issuance.
License recommendations: after AFF-8 + solo jump requirement → qualified instructor recommends for A-license → DZ S&TA (Safety & Training Advisor) formally reviews → issues license through USPA.
BRUTAL TRUTH: Sign-offs are legally significant. An instructor who signs off a student certifies they witnessed the skill demonstration. If that student later jumps, gets injured, and the injury is traced back to a skill that was supposedly signed off but clearly not mastered, the instructor and DZ can face liability claims.
System must log WHO signed off, WHEN, and WHAT skills were demonstrated. Store notes. Do not allow instructors to sign off without documenting the evidence (jump video, witness, coach notes). Keep records for 7 years minimum.
Key TypeScript function:
## 29.5 Certification Tracking
Once a student completes AFF and solo requirements, they are eligible for A-License. System detects eligibility and tracks official certifications.
Certifications in
License requirements (USPA standard):
A License: 25 jumps, AFF-1 through AFF-8 complete, pass written exam, S&TA sign-off
B License: 50 jumps, A-license holder, water landing training, night jump, coach or mentor sign-off
C License: 200 jumps, B-license holder, advanced skills (groups, tracking, CRW)
D License: 500 jumps, C-license holder, advanced rating holder (instructor, coach, rigger, etc)
Automatic eligibility detection: system tracks jump count, monitors completion of prerequisites, and notifies athlete when eligible for next license.
Cross-border recognition: when an athlete presents a BPA or APF license at a USPA DZ, system must validate equivalence. Mapping:
BPA A-license ≈ USPA A-license (25 jumps)
APF A-license ≈ USPA A-license with additional water requirement
FFP BP ≈ USPA A-license (context-dependent, requires review)
BRUTAL TRUTH: License verification is manual. USPA has a member lookup API (though slow). BPA and APF verification requires emailing the organization and waiting 1–3 days. System should flag unverified foreign licenses for DZ S&TA review and create a follow-up task.
Key TypeScript functions:
## 29.6 Digital Logbook Integration
Every jumper maintains a logbook. SkyLara auto-generates logbook entries and allows manual historical entry.
Jump log in
Auto-logging workflow:
When load.status changes to completed → system iterates through all athletes on load
For each athlete, create jump_logs entry with fields from load metadata (aircraft, exit alt, etc)
Set verified = false pending instructor review
Instructor can verify logbook entry from athlete profile or app
Manual entry for jumps at other DZs: athlete or coach enters jump details (date, DZ, aircraft, alt, canopy, time), system stores with verified = false unless DZ has reciprocal agreement.
Logbook export: athlete can export jump log as PDF or CSV for license applications (required by most certification bodies).
BRUTAL TRUTH: Auto-logging is only accurate for loads in SkyLara. A jumper's total experience includes jumps at other DZs, paper logbook entries from years ago, and maybe some guesses if records are lost. Accept partial data. Let jumpers manually enter historical jumps with reasonable confidence.
System should warn if jump counts are inconsistent (e.g., athlete claims 500 total jumps but only 200 logged in SkyLara) and flag for DZ review.
Key TypeScript function:
## 29.7 Continuing Education & Ratings
Licensed jumpers can pursue advanced ratings: instructor (AFF, tandem, coach), rigger, S&TA (Safety & Training Advisor).
Advanced ratings tracked in
Key TypeScript function:
Progression matrix (all certification bodies):
Jumper can hold multiple certifications: USPA D-license + BPA C-license + AFF Instructor (USPA) + Tandem Instructor (local rating)
System tracks each separately, checks expiration/currency per body
On jumper profile: show all active certifications with expiry countdown
If S&TA rating expires: alert DZ operator, remove from S&TA scheduling until renewed
FINAL NOTE: Training and certification is where trust is earned. Students risk their lives. Families trust the DZ to train properly. Regulators trust the DZ to follow standards. Every data point—modules, quizzes, sign-offs, jump logs, certifications—must be accurate, auditable, and legally defensible.
SkyLara's role is to make tracking easier, not to replace the expert judgment of instructors and S&TAs. The system surfaces information. Humans make decisions. Keep that boundary clear.
# CHAPTER 30: GROUP / EVENT / BOOGIE SYSTEM
## 30.1 Event Architecture Overview
SkyLara supports five event types, each with distinct operational and financial profiles. Events are where dropzones generate significant revenue AND where operations fail spectacularly if not designed for scale.
BRUTAL TRUTH:
Events are where DZs make real money AND where systems break. A 200-person boogie overwhelms manifest, exhausts instructors, strains aircraft. A corporate event with bad weather and poor communication becomes a legal liability. Build with realistic load capacity, clear expectations, and flexible refund logic — not just 'bigger bookings.'
## 30.2 Group Booking System
Group bookings are the foundational event type: 4–16 jumpers, same day, coordinated registration and pricing.
### Schema
### Pricing Logic
Base price: $200–250 tandem, $150–180 AFF
Bulk discounts: 10+ people = 10%, 20+ = 15%
Organizer discount: free jump if 10+ confirmed
Deposit: 50% to confirm, balance due 7 days prior
### Payment Splitting — THE HARD PROBLEM
This is where group bookings explode. 'Who pays for whom?' must be explicit.
Option A: Organizer pays all — single invoice, simpler. Risk: organizer backs out.
Option B: Each participant pays — separate charges, no trust. Risk: dropped payments.
Option C: Mixed (organizer covers some, participants cover remainder) — explicit up front.
TypeScript signature:
TypeScript signature:
BRUTAL TRUTH:
Require explicit payment assignment at booking creation. Do NOT allow 'vague organizer responsibility.' Charge who-pays-for-whom into the database. This prevents 90% of payment disputes post-jump.
## 30.3 Team Jump Management
Organized skydiving teams (4-way FS, 8-way, formation, wingsuit, etc.) need coordinated block loads and performance tracking.
### Schema
### Load Allocation Constraint
Teams REQUIRE the same load for every practice jump: same altitude, same jump run, same order. System must reserve team slots as an atomic block. Manifest cannot fragment team members across loads.
Captain books N practice jumps on specific dates
System reserves (team size × jump count) slots in single loads
Manifest shows team block as 'reserved' — not available to others
Last-minute cancellation: freed slots can be reallocated
BRUTAL TRUTH:
Team scheduling dominates competitive DZs. A 4-way team wants 10+ jumps in a single day, all from the same aircraft. They will monopolize aircraft time if not managed. System MUST enforce team quotas (e.g., max 2 organized team loads per day) and interleave with tandem/AFF traffic. Otherwise, tandem instructors wait idle while teams hog the plane.
TypeScript signature:
## 30.4 Training Camp System
Multi-day, instructor-led training camps (coach clinics, discipline-specific intensives). Higher margin, higher risk due to weather and instructor commitment.
### Schema
### Weather & Cancellation
Weather day: extend camp by 1 day (if available) — do NOT void jump credits
Missed jump day: proportional refund or rain check voucher (e.g., $50 credit)
Camp cancellation <7 days: full refund (not your problem; it's the DZ's problem)
Participant drops <7 days: 50% refund, remainder comped to DZ
BRUTAL TRUTH:
Bad weather will kill multi-day camps. DZ operators will want flexibility: 'Can we postpone to next month?' 'Can we shift to another location?' 'Can I keep deposits as credit?' System should flag camps at risk 7 days out (weather forecast, registration <50%, etc.) and prompt for contingency planning.
TypeScript signature:
TypeScript signature:
## 30.5 Boogie Event System
The big revenue event: multi-day skydiving festival (100–500+ jumpers). Requires dedicated manifest management, guest staff, and realistic throughput planning.
### Schema
### Boogie Operations
Aircraft: DZ brings in additional turbines/helicopters for extended capacity
Manifest: 15-minute load cycles vs. normal 30-minute
Load types: organized (coaching), fun (open jumper list), demo (public display)
Guest staff: temporary role grants for coaches from other DZs
BRUTAL TRUTH:
Boogies are controlled chaos. 300 jumpers, 3 aircraft, 20 load organizers all wanting slots simultaneously. The manifest system WILL overflow without explicit priority logic. Implement: (1) Pre-registration for organized loads (first-come, reserved), (2) Self-manifest queue for fun jumpers, (3) Dedicated boogie manifest staff, (4) Dynamic priority (coaches > registered early-bird > walk-ins). Otherwise manifest becomes 'whoever yells loudest gets loaded.'
### Manifest Logic
TypeScript signature:
## 30.6 Corporate Event System
Team-building events, incentive trips, celebrations. High margin ($250–350/person), high expectations, high liability risk.
### Schema
### Corporate Requirements
Liability: may require additional insurance certificate from DZ
Waivers: corporate + individual (separate signature)
Photo/video: group photo, tandem videos, event recap video
Branding: company logo on certificates, photos, promotional materials
Catering: food/beverages coordination with local vendor
Payment: corporate invoice (net 30) vs. upfront (3% discount)
BRUTAL TRUTH:
Corporate events are high-margin but high-touch. Companies expect concierge service: custom waivers, branded materials, perfect on-time execution. A 2-hour weather delay without clear communication becomes a PR disaster AND a liability claim. Manage expectations aggressively: 'Weather may delay your event. Here is our contingency plan. We will communicate hourly. Your satisfaction is our priority.'
TypeScript signature:
## 30.7 Load Allocation & Scheduling
The operational core: how to fit events (group, team, camp, boogie, corporate) into available aircraft without overbooking or creating bottlenecks.
### Allocation Priorities
Event loads: dedicated time blocks (reserved in advance)
Shared tandem loads: fill remaining capacity
AFF levels: scheduled slots (must not be disrupted)
Team blocks: reserved by team captain (must be atomic)
### Conflict Detection
Overlapping events: two corporate events same time = aircraft conflict
Aircraft overbooking: sum of all loads > actual aircraft capacity
Instructor conflicts: chief instructor assigned to 2 loads simultaneously
Buffer time: 1 hour between corporate groups (gear swap, briefing)
### Capacity Planning — THE FORMULA
Expected loads per day for event:
BRUTAL TRUTH:
Overcommit = long waits, angry customers, refund requests. Undercommit = lost revenue. System should display realistic throughput calculator: 'With 1 Cessna 208 at 20-min turnaround, you can handle 72 tandem passengers per 8-hour day. Your boogie has 150 registered. You NEED a second aircraft, or reduce to 2 jumps per person, or extend to 2 days.' Make math undeniable.
TypeScript signature:
TypeScript signature:
## 30.8 Event Pricing & Revenue
Event P&L tracking, deposit system, cancellation policy, and SkyLara commission structure.
### Pricing Models
Per-person: $200 tandem × 50 people = $10,000
Flat rate: $5,000 for group (organizer negotiates)
Tiered: early bird $180, standard $220, door $250
VIP packages: $400 (includes video, branded cert, premium photo)
### Deposit & Payment Timeline
Deposit: 50% due at booking to secure date
Final balance: 100% due 7 days before event
Late payment: $50 late fee per day after deadline
No-show: full charge (event cost already incurred)
### Cancellation Policy
>30 days before: full refund minus non-refundable deposit (20%)
15–30 days: 50% refund (50% forfeited)
<15 days: 0% refund (too close to event)
DZ cancellation: 100% refund + $50 credit (goodwill)
### Revenue & P&L Tracking
Per-event financials (visible to DZ operator):
### SkyLara Commission
Individual bookings: 6–8% (standard)
Event bookings: 3–5% (volume discount — DZ retains more)
Corporate/enterprise: 2–3% (negotiated contracts)
TypeScript signature:
TypeScript signature:
## 30.9 Event Marketing & Registration
Public-facing event listing, registration flow, waitlist, and social sharing.
### Event Listing Page
Hero image (boogie theme)
Event details (date, location, price, what's included)
Instructor lineup + guest coaches
Schedule preview (sample loads, activities)
Registration CTA ('Register Now', 'Join Waitlist')
### Registration Flow
Browse → select registration type (early bird, standard, VIP)
Login/create account
Enter waiver & emergency info
Select meal preferences, camping spot, t-shirt size
Pay deposit (50%)
Confirmation email + iCal event file
### Waitlist & Capacity
Event at max capacity → 'Join Waitlist' button appears
Auto-notify waitlist if slot opens (cancellation)
First-come priority for waitlist conversion
### Social Sharing
Share event link with pre-filled social posts
'I just registered for [Boogie Name] at [DZ]! Join me!'
Track referral registrations (referrer = discount code)
BRUTAL TRUTH:
Event marketing through SkyLara platform only works if DZs actively use it. Most DZs will continue posting events on Facebook and handling registrations via email/phone. SkyLara event pages must be good enough that DZs WANT to use them — mobile-first, fast-loading, beautiful design, easy registration, and clear ROI. Otherwise: abandoned feature.
TypeScript signature:
## 30.10 Event Analytics
Post-event reporting and ROI measurement.
### Per-Event Metrics
Attendance vs. expected: 87/100 registered (87%)
Revenue vs. budget: actual $18,200 / budgeted $17,000 (+7%)
Load utilization: 24/26 loads filled (92%)
Customer satisfaction: NPS 8.4/10 (post-event survey)
No-show rate: 5% (benchmark 8%)
### Year-over-Year Comparison
### ROI Calculator
### Post-Event Report (Auto-Generated)
Event summary (dates, location, attendance)
Financial summary (revenue, costs, profit)
Operational metrics (loads, utilization, safety incidents)
Customer feedback (NPS, common praise/complaints)
Recommendations (scheduling tips, pricing insights, next steps)
TypeScript signature:
## Summary: The Event System in Context
Events are the growth engine for SkyLara DZs. But they are also the most operationally complex feature: competing priorities (teams vs. tandem), unpredictable scale (boogie swells from 50 to 300 registrations), weather volatility, and high customer expectations.
Key design principles:
Transparency: show real capacity limits, not optimistic lies
Flexibility: weather days, cancellations, last-minute changes are inevitable
Automation: pre-register loads, manifest priorities, payment splits — reduce manual work
Analytics: post-event reporting so DZs can improve year-over-year
Integration: events feed into aircraft scheduling, instructor assignments, revenue reporting
Next: Chapter 31 will tackle the manifest system — the real-time operational hub where events collide with daily jumper expectations.

| DZ Size | ATC Integration Level | SkyLara Role | Primary Communication |
| --- | --- | --- | --- |
| Mega-DZ (40+ jumpers/load) | Automated NOTAM + Electronic | File NOTAMs 24h advance, track TFR, log electronic exchanges | Electronic + Radio |
| Large DZ (15-40 jumpers) | Manual NOTAM + Scheduled Calls | Generate NOTAM template, schedule pilot notification window, log radio calls | Phone + Radio |
| Small DZ (5-15 jumpers) | Informal LOA, Radio-Only | Maintain LOA details, provide pilot pre-jump checklist, track verbal acknowledgment | Radio Only |
| Remote/Rural DZ | No ATC, Airspace Awareness Only | Provide sky activity reporting, TFR monitoring, safety alerts | Internal Only |

| notams {   id: string (UUID);   dropzone_id: string;   notam_number: string | null;  // assigned by FAA/EUROCONTROL after filing   status: enum [draft, filed, active, cancelled];   effective_from: datetime;   effective_to: datetime;   altitude_floor_ft: int;   altitude_ceiling_ft: int;   radius_nm: decimal;  // typical 5-10 NM from DZ   notam_text: text;   filing_method: enum [api_faa, api_eurocontrol, manual];   filed_by: string (user_id);   filed_at: datetime | null;   cancelled_at: datetime | null;   metadata: json {     day_pattern: [bool; 7];  // recurring weekly?     coverage_loads: int;  // number of loads covered     filing_cost: decimal;   } } |
| --- |

| State | Trigger | Action | Responsible Party |
| --- | --- | --- | --- |
| PENDING | Load manifest finalized | Pilot notified in app, timer starts (auto-fail if not cleared in 30 min) | Manifest Officer |
| NOTIFIED | Pilot initiates ATC contact | SkyLara logs notification time, displays ATC response form | Pilot |
| ACKNOWLEDGED | Pilot confirms ATC heard the call | No electronic ACK expected; pilot manually logs (radio is verbal) | Pilot |
| ACTIVE | All jumpers airborne | DZ aware, no new traffic in corridor | Pilot |
| CLEARED | Pilot confirms jumpers clear of airspace | Post-jump notification complete, load can close | Pilot |

| atc_communications {   id: string (UUID);   load_id: string;   pilot_id: string;   dropzone_id: string;   type: enum [pre_jump, post_jump, hold, cancel];   message: text;  // what was said/transmitted   method: enum [radio, phone, electronic, in_person];   status: enum [sent, acknowledged, no_response];   sent_at: datetime;   acknowledged_at: datetime | null;   ack_method: string;  // how was it logged? (radio verbal, phone verbal, electronic)   pilot_notes: text;   created_by: string (user_id); } |
| --- |

| jump_windows {   id: string (UUID);   dropzone_id: string;   day_of_week: enum [0-6];  // 0 = Sunday   start_time: time;   end_time: time;   altitude_max_ft: int;   altitude_min_ft: int;  // some LOAs specify floor   restrictions: json {     ifr_allowed: bool;     noise_curfew: bool;     military_ops: bool;     max_jumpers_per_load: int;     notes: string;   };   source: enum [loa, notam, atc_approval, custom];   effective_from: date;   effective_to: date | null;  // null = ongoing } |
| --- |

| checkAirspaceConflicts(dzId, date): {   // For all scheduled loads on dzId on date:   // 1. Query NOTAMs affecting DZ airspace & altitude blocks on date   // 2. Check TFR database (FAA NOTAM Search API) for active TFRs   // 3. Check published instrument approaches (from local charts)   // 4. Query other DZs in same geographic area; time overlap?   // Returns: [   //   { type: "tfr", severity: "critical", notam_id, description, ... },   //   { type: "approach", severity: "warn", runway, frequency, ... }   // ]   // Alert system: severity="critical" → block load; severity="warn" → log & notify } |
| --- |

| Checklist Item | Auto-Verified? | Manual? | Blocking? |
| --- | --- | --- | --- |
| Weight & balance calculated & within CG envelope | Yes (load manifest) | No | Yes — cannot jump if OOO |
| Aircraft airworthiness current | Yes (doc expiry DB) | No | Yes — cannot assign if expired |
| NOTAM active (if filed) | Yes (NOTAM status) | Pilot confirms visibility | Soft-warn; can override with justification |
| ATC notified & acknowledged | Logged by pilot | Yes (pilot tap) | Soft-warn; override with manifest sign-off |
| Fuel sufficient (burn calc + 45 min reserve) | Yes (calc engine) | Pilot visual check | Soft-warn; cannot exceed if calc shows insufficient |
| Pilot medically current | Yes (med cert DB) | No | Yes — cannot assign if expired |
| Pilot within duty limits | Yes (schedule DB) | No | Yes — hard-block if exceeds FAA/policy limits |
| Aircraft type-rated for aircraft | Yes (pilot profile DB) | No | Yes — cannot assign if not rated |

| pilotPreFlightChecklist(loadId): {   // Returns checklist state: [   //   { item: "CG", status: "pass", value: "45.2% MAC" },   //   { item: "Airworthiness", status: "pass", value: "expires 2026-12-15" },   //   { item: "NOTAM", status: "pass", value: "NOTAM #123 active" },   //   { item: "ATC", status: "pending", value: "awaiting pilot confirmation" },   //   { item: "Fuel", status: "pass", value: "35 gal, need 18 (burn) + 9 (reserve)" },   //   { item: "Medical", status: "pass", value: "expires 2026-08-30" },   //   { item: "Duty Time", status: "pass", value: "2.5 hrs flown, 5.5 hrs remaining" },   //   { item: "Type Rating", status: "pass", value: "C208 rated" }   // ]   // Overall: all_clear (bool) } |
| --- |

| aircraft {   id: string (UUID);   dropzone_id: string;   registration: string;  // N-number (US/Canada), G-reg (UK), etc.   type: string;  // C182, C208, Twin Otter, King Air, Skyvan   manufacturer: string;   model: string;   year: int;   serial_number: string;   max_capacity: int;  // number of jumpers (excluding pilot/jumpmaster)   max_weight_lbs: int;  // gross weight limit   empty_weight_lbs: int;  // aircraft weight without fuel/pax   max_fuel_capacity_gal: int;   cg_min: decimal;  // CG envelope min (% MAC or arm inches)   cg_max: decimal;  // CG envelope max   fuel_burn_gph: decimal;  // gallons per hour cruise   cruise_speed_kts: int;   climb_rate_fpm: int;   status: enum [active, maintenance, grounded, retired];   last_airworthiness_check: datetime;   next_100_hour_due: int;  // hobbs hours   next_annual_due: date;   metadata: json {     isoWeight: decimal;  // isolated weight (CG calc)     isoArm: decimal;  // isolated arm (CG calc)     door_config: string;  // for CG: "standard" | "osprey" | "custom"     parachute_system_weight: int;  // affects CG   } } |
| --- |

| aircraft_documents {   id: string (UUID);   aircraft_id: string;   document_type: enum [     airworthiness_certificate,     registration_certificate,     insurance_policy,     weight_and_balance_sheet,     logbook_scan,     ad_compliance_record,     maintenance_record   ];   file_url: string;   issued_at: date;   expires_at: date | null;   status: enum [current, expiring_soon, expired];   notes: text; } |
| --- |

| Maintenance Type | Interval | Description | Blocks Aircraft? |
| --- | --- | --- | --- |
| 100-Hour Inspection | Every 100 flight hours | Required for hire (jump ops are commercial). Check engine, systems, airframe wear. | Yes — cannot fly if overdue |
| Annual Inspection | Every 12 calendar months | Comprehensive airworthiness check. Overdue by 1 day = grounded. | Yes — cannot fly if overdue |
| Airworthiness Directive (AD) | Per FAA/EASA issuance | Mandatory safety fix (e.g., engine cracking, fuel line integrity). Deadline varies. | Yes if deadline passed — else warn |
| Service Bulletin (SB) | Per manufacturer recommendation | Advisory updates (not mandatory unless referenced in AD). Mostly informational. | No — soft-warn only |
| Unscheduled Repair | As-needed | Engine logs, avionics failure, structural damage. Grounding until resolved. | Yes until fixed |
| Condition Inspection | Per operator policy (e.g., 200 hrs) | Quick health check between annuals. Identifies incipient issues. | No — soft-warn if overdue |

| aircraft_maintenance {   id: string (UUID);   aircraft_id: string;   maintenance_type: enum [     100_hour, annual, ad_compliance, sb_compliance, unscheduled_repair, condition_check   ];   description: text;   performed_by: string;  // mechanic name/license   performed_at: datetime;   hobbs_at_start: int;   hobbs_at_completion: int;   cost: decimal;   next_due_hours: int | null;   next_due_date: date | null;   documents: json {     inspection_report_url: string;     sign_off_by: string;     mechanic_license: string;   };   status: enum [scheduled, in_progress, complete, deferred];   notes: text; } |
| --- |

| flight_hours {   id: string (UUID);   aircraft_id: string;   load_id: string;   date: date;   hobbs_start: int;  // aircraft hobbs reading at takeoff   hobbs_end: int;  // hobbs reading at landing   flight_time_hours: decimal;  // computed: (hobbs_end - hobbs_start)   altitude_climbed_to: int;  // max altitude on this flight   jumps_deployed: int;   recorded_by: string;  // pilot or manifest   verified_by: string | null;  // maintenance officer review } |
| --- |

| Document/Status | Expiry Consequence | System Action | Recourse |
| --- | --- | --- | --- |
| Airworthiness Certificate | Aircraft CANNOT fly (primary doc) | Set status=GROUNDED, block all load assignments | Renew with FAA (US) or CAA (UK) — typically after annual |
| Registration Certificate | CANNOT fly (legal ownership proof) | Set status=GROUNDED, flag for operator/legal | Update registration or transfer aircraft |
| Insurance (with skydiving endorsement) | CANNOT fly commercially (liability) | Set status=GROUNDED, block all loads | Renew policy with underwriter; standard hull insurance often excludes skydiving |
| Weight & Balance Sheet | CANNOT compute CG, cannot jump | Soft-warn; require new W&B cert before manifesting | Request new W&B from licensed A&P |
| 100-Hour Inspection | CANNOT fly for hire (jump ops are hire) | Set status=GROUNDED once overdue | Schedule inspection immediately |
| Annual Inspection | CANNOT fly (any category) | Set status=GROUNDED once overdue by 1 day | Schedule inspection immediately |
| Medical Certificate (pilot) | CANNOT fly as PIC | Unassign pilot from future loads | Renew medical with AME |

| validateAirworthiness(aircraftId): {   const aircraft = db.aircraft.get(aircraftId);   const docs = db.aircraft_documents.filter(aircraftId);   const maintenance = db.aircraft_maintenance.filter(aircraftId);      let status = "airworthy";  // assume pass   const issues = [];      // Check expiry of critical docs   if (docs.airworthiness.expires_at < today()) {     status = "grounded"; issues.push("Airworthiness cert expired");   }   if (docs.registration.expires_at < today()) {     status = "grounded"; issues.push("Registration cert expired");   }   if (docs.insurance.expires_at < today()) {     status = "grounded"; issues.push("Insurance expired (no skydiving endorsement?)");   }      // Check maintenance status   if (maintenance.annual.isOverdue()) {     status = "grounded"; issues.push("Annual inspection overdue");   }   if (maintenance.hundred_hour.isOverdue()) {     status = "grounded"; issues.push("100-hour inspection overdue");   }      // Log if status changed   if (aircraft.status !== status) {     audit_log.record({ event: "airworthiness_status_change", from: aircraft.status, to: status });   }      return { status, issues, last_check: now() }; } |
| --- |

| CG State | When | Jumpers Position | Impact |
| --- | --- | --- | --- |
| Ground CG | Before engines start | Loading ramp, increasing in weight | Must be within envelope to legally depart |
| Takeoff CG | Climbing to jump altitude | All seated, full weight | Critical for rotation and climb performance |
| Jump Run CG | Level at altitude, doors open | Staged in door, some exiting | Shifts aft (heavier at tail); may breach aft limit |
| Progressive Aft Shift | Jumpers exiting rear door | Each exit moves CG forward | Forward CG at 50% exit, most forward at end |
| Landing CG | All jumpers out, pilot + crew only | Minimum weight at nose | Usually well-forward; rarely an issue |

| load_cg_calculation {   id: string (UUID);   load_id: string;   aircraft_id: string;   calculated_at: datetime;      // Aircraft baseline   aircraft_empty_weight: int;   aircraft_empty_arm: decimal;  // inches or % MAC      // Fuel   fuel_gallons: decimal;   fuel_weight: decimal;  // 6 lbs/gal for Avgas   fuel_arm: decimal;      // Crew (pilot, jumpmaster, safety officer)   crew: [{       role: string;       weight: int;       arm: decimal;     }];      // Jumpers at various states   jumpers_loaded: [{       pax_id: string;       weight: int;  // self-reported or scale-verified       equipment_weight: int;  // harness, reserve, main, helmet       arm: decimal;  // position in aircraft (nose to tail)     }];      // Computed   total_weight: int;   cg_location: decimal;  // % MAC or arm inches   cg_percent_mac: decimal;  // for display   within_envelope: bool;      // Multi-point snapshots (for visual envelope)   cg_snapshots: [{       state: string;  // "ground" | "takeoff" | "jumprun" | "exit_25pct" | ... | "landing"       jumpers_count: int;  // how many still aboard?       cg_location: decimal;       within_envelope: bool;     }];      created_by: string;   verified_by: string | null; } |
| --- |

| pilot_profiles {   id: string (UUID);   user_id: string;  // links to users table (pilot role)   certificate_type: enum [ppl, cpl, atp];   certificate_number: string;   certificate_expires_at: date | null;      // Ratings array   ratings: [{       type: string;  // "SEL" (single-engine land), "MEL", "instrument", "type"       description: string;  // e.g., "C208 Type Rating", "Instrument Airplane"       expires_at: date | null;       issued_at: date;     }];      // Medical   medical_class: enum [1, 2, 3, lapl];  // LAPL = light sport   medical_expires_at: date;   medical_issued_at: date;   medical_restrictions: text;  // e.g., "corrective lenses", "none"      // Flight experience   total_hours: int;   jump_pilot_hours: int;  // skydiving-specific hours      // Currency   currency_status: enum [current, expired, recency_required];   bfr_date: date | null;  // Biennial Flight Review date   bfr_due_by: date | null;   last_flight_date: date | null;   last_3_takeoffs_landings: int;  // for 61.57 currency      // Type-specific ratings   aircraft_types: [{       aircraft_id: string;       type_rating_expires_at: date | null;       hours_in_type: int;       competency_sign_off: string;  // date of last competency check     }]; } |
| --- |

| Requirement | Rule Source | Threshold | Consequence if Expired |
| --- | --- | --- | --- |
| Medical Certificate | FAR 61.3 | Class 1/2/3 cert expiry date | Cannot act as PIC; aircraft grounded with this pilot |
| Biennial Flight Review (BFR) | FAR 61.56 | Once per 24 calendar months | Cannot fly; must complete flight review with CFI |
| Takeoff/Landing Currency (3-3-3) | FAR 61.57 | 3 full-stop landings in last 90 days, in make/model class | Cannot carry passengers; can solo or jump ops (check local rules) |
| Type Rating (complex aircraft) | FAR 61.31 | Per aircraft type (e.g., C208, King Air) | Cannot act as PIC in that type |
| Instrument Currency | FAR 61.57(c) | 6 approaches, holding, intercepts in last 6 months (if IFR-capable) | Cannot fly in IMC; VFR only |
| Jumpmaster Recurrent | Local Skydiving Rules | Annual recertification (varies by DZ) | Cannot manifest jumpers; cannot sign waivers |

| pilot_schedules {   id: string (UUID);   pilot_id: string;   dropzone_id: string;   date: date;   available_from: time;   available_to: time;   status: enum [available, assigned, unavailable, on_leave];   notes: text;  // e.g., "limited fuel availability", "type-rated only C208"   created_by: string;   created_at: datetime; } |
| --- |

| Limit Type | FAA Rule | Threshold | Tracking Scope |
| --- | --- | --- | --- |
| Daily Flight Time | FAR 91.1059(a) | Max 8 hours flight time per day | Reset at 0000 local |
| Daily Duty Time | Operator policy (often 14 hrs) | Max 14 hours on duty per day | From report-time to release-time |
| Consecutive Days | Operator policy (often 7) | Max 7 consecutive days before mandatory rest | Rolling 7-day window |
| Rest Period | Operator policy (typically 10 hrs) | Min 10 hours continuous rest between duty days | Must not schedule next day if rest insufficient |

| assignPilot(loadId): {   const load = db.loads.get(loadId);   const pilot_candidates = findAvailablePilots(load.aircraft_type, load.scheduled_time);      for (const pilot of pilot_candidates) {     // Validate currency     if (!validatePilotCurrency(pilot.id, load.aircraft_type).passed) continue;          // Calculate duty time for this day     const existing_loads = db.loads.filter({       pilot_id: pilot.id,       date: load.date,       status: ["assigned", "airborne", "landed"]     });     const total_flight_time = sum(existing_loads.flight_time_hours) || 0;     const proposed_flight_time = estimateFlight(load) || 0.75;  // typical 45 min to altitude + jump          // Hard-block: 8 hour daily limit     if (total_flight_time + proposed_flight_time > 8.0) {       console.warn(`Pilot ${pilot.id} would exceed 8-hour daily limit`);       continue;     }          // Assign this pilot (prefer round-robin if multiple candidates)     load.pilot_id = pilot.id;     return { assigned: true, pilot_id: pilot.id };   }      return { assigned: false, reason: "no_available_pilots" }; } |
| --- |

| fuel_logs {   id: string (UUID);   aircraft_id: string;   date: date;   fuel_added_gallons: decimal;   fuel_type: enum [100ll, jet_a];   fuel_cost: decimal;   fuel_cost_per_gallon: decimal;   supplier: string;  // "FBO XYZ", "Shell", etc.   added_by: string;  // user_id   added_at: datetime; }  load_fuel_planning {   load_id: string;   aircraft_id: string;   fuel_at_takeoff: decimal;  // gallons on board   estimated_burn: decimal;  // calc based on altitude, load time   vfr_reserve_required: decimal;  // 30 min day / 45 min night   minimum_fuel_on_board: decimal;  // burn + reserve   fuel_available: bool;  // enough to proceed?   calculated_at: datetime; } |
| --- |

| estimateFuelBurn(aircraftId, targetAltitude, loadCount): {   const aircraft = db.aircraft.get(aircraftId);   const base_burn = aircraft.fuel_burn_gph;  // e.g., 7.5 gph      // Altitude factor (rougher air higher → slightly less burn)   const altitude_factor = targetAltitude > 10000 ? 0.95 : 1.0;      // Time-on-ground estimate: climb to altitude + drift + return   // Typical: 2000 ft/min climb = 5 min to 10k ft + 2 min drift + 2 min return = 9 min = 0.15 hrs   const time_per_load = loadCount > 1 ? 0.25 : 0.15;  // extra time multi-load   const total_flight_time = loadCount * time_per_load;      // Fuel burn   const estimated_burn = (base_burn * altitude_factor * total_flight_time);      // VFR reserve: 45 min   const vfr_reserve = (base_burn * 0.75);      return {     estimated_burn: estimated_burn.toFixed(1),     vfr_reserve: vfr_reserve.toFixed(1),     total_required: (estimated_burn + vfr_reserve).toFixed(1)   }; } |
| --- |

| Ownership Model | Tracking Needs | Maintenance Cycle | Liability Focus |
| --- | --- | --- | --- |
| DZ Student Rig | Who used, when, condition | Reserve repack 180d, AAD service per mfg | High—DZ liable for fitness |
| DZ Tandem Rig | Who used, when, condition, reserve/AAD | Reserve repack 180d, AAD service, harness wear | Critical—tandem has passenger |
| Jumper-Owned Sport Rig | Gear check only—AAD/reserve current? | Jumper responsible | Medium—jumper assumes risk |
| Rental Rig | Renter ID, rental period, condition in/out | Reserve repack 180d, all maintenance | High—liability for rental |

| equipment_rigs {   id: UUID primary key   dropzone_id: UUID foreign key   rig_number: VARCHAR(50) unique within DZ (e.g. "STU-001", "TND-042")   rig_type: ENUM ["student", "tandem", "sport", "rental"]   manufacturer: VARCHAR(100) (e.g. "Performance Designs", "UPT")   model: VARCHAR(100)   serial_number: VARCHAR(100)   dom: DATE (date of manufacture)   container_size: VARCHAR(20) (0, 1, 2, 3, etc)   harness_size: ENUM ["XS", "S", "M", "L", "XL"]   weight_range_min_lbs: INT   weight_range_max_lbs: INT   status: ENUM ["available", "in_use", "maintenance", "grounded", "retired"]   notes: TEXT   created_at: TIMESTAMP   updated_at: TIMESTAMP } |
| --- |

| equipment_assignments {   id: UUID primary key   rig_id: UUID foreign key   athlete_id: UUID foreign key   load_id: UUID foreign key   assigned_at: TIMESTAMP   returned_at: TIMESTAMP (null until return)   assigned_by: UUID foreign key (staff member)   condition_out: ENUM ["good", "fair", "needs_attention"] (at assignment)   condition_in: ENUM ["good", "fair", "needs_attention"] (at return)   notes_out: TEXT   notes_in: TEXT   nfc_tag_scanned_at: TIMESTAMP (physical return confirmation) } |
| --- |

| assignRig(athleteId: UUID, loadId: UUID, weightLbs: number): Promise<EquipmentAssignment> {   // Fetch athlete experience level, weight, rig type needed   // Query available rigs: status=available, weight_range includes athlete   // Assign first match or let staff choose from sorted list   // Set assignment.assigned_at = now(), status = in_use   // Return assignment record with rig details }  returnRig(assignmentId: UUID, conditionIn: "good"|"fair"|"needs_attention", notes: string): Promise<EquipmentAssignment> {   // Mark returned_at = now(), condition_in = value, notes = notes   // Set rig.status = maintenance if condition_in != good, else available   // Emit event: rig_returned (for maintenance trigger)   // Return updated assignment } |
| --- |

| equipment_reserves {   id: UUID primary key   rig_id: UUID foreign key   reserve_manufacturer: VARCHAR(100) (e.g. "Smartpack", "Precision Aerodynamics")   reserve_model: VARCHAR(100)   reserve_serial: VARCHAR(100)   reserve_size: VARCHAR(20) (e.g. "97", "120")   last_repack_date: DATE   next_repack_due: DATE   repacked_by: UUID foreign key (rigger_id)   repack_card_url: VARCHAR(500) (scanned card image)   dom: DATE   rides: INT (number of reserve deployments)   status: ENUM ["current", "due_soon", "overdue", "grounded"]   updated_at: TIMESTAMP } |
| --- |

| reserve_repacks {   id: UUID primary key   reserve_id: UUID foreign key   rigger_id: UUID foreign key   repack_date: DATE   next_due_date: DATE   inspection_notes: TEXT   passed: BOOLEAN   seal_number: VARCHAR(50) (rigger's seal ID)   repack_card_image_url: VARCHAR(500)   created_at: TIMESTAMP } |
| --- |

| checkReserveStatus(rigId: UUID): Promise<ReserveStatus> {   // Fetch equipment_reserves for rig   // Calculate days until next_repack_due   // Return status: CURRENT | DUE_SOON | OVERDUE | GROUNDED   // If overdue, update rig.status = grounded   // Return status + days_until_due + repack_card_url }  logReservePack(reserveId: UUID, riggerId: UUID, notes: string): Promise<ReservePack> {   // Create reserve_repacks entry   // Update equipment_reserves.last_repack_date = now()   // Calculate next_repack_due = now() + 180 days (or per mfg spec)   // Update rig.status = available   // Emit event: reserve_packed (for manifest re-evaluation)   // Return repack record } |
| --- |

| AAD Model | Service Interval | Battery Life | Lifecycle Limit |
| --- | --- | --- | --- |
| Cypres | 4-year mandatory service | Integrated, replaced at service | 15 years from DOM |
| Vigil | Battery ~15 years | Sealed battery (no replacement) | 15-year theoretical |
| Mars | 10-year service window | Battery integrated | 15 years from DOM |

| equipment_aads {   id: UUID primary key   rig_id: UUID foreign key   manufacturer: VARCHAR(50) ["Cypres", "Vigil", "Mars"]   model: VARCHAR(50)   serial_number: VARCHAR(100)   dom: DATE   service_due_date: DATE   last_service_date: DATE   battery_status: ENUM ["good", "low", "depleted"]   mode: ENUM ["student", "expert", "tandem", "off"]   last_calibration_date: DATE   lifecycle_expiry_date: DATE   status: ENUM ["active", "service_due", "expired", "grounded"]   notes: TEXT   updated_at: TIMESTAMP } |
| --- |

| checkAADStatus(rigId: UUID): Promise<AADStatus> {   // Fetch equipment_aads for rig   // Calculate days until service_due_date   // Check battery_status, mode setting   // Compare lifecycle_expiry_date to today   // Return AADStatus with service_days_until_due, battery_pct (if known), lifecycle_remaining   // If service overdue or lifecycle expired, set status = grounded (rig cannot be used) } |
| --- |

| gear_rental_items {   id: UUID primary key   dropzone_id: UUID foreign key   item_type: ENUM ["rig", "helmet", "altimeter", "jumpsuit", "goggles", "pad"]   rig_id: UUID nullable (if type=rig, reference equipment_rigs)   name: VARCHAR(200) (e.g. "Intrepid Helmet Size M")   size: VARCHAR(50) nullable   daily_rate: DECIMAL(7,2)   per_jump_rate: DECIMAL(7,2) nullable   status: ENUM ["available", "rented", "maintenance"]   created_at: TIMESTAMP } |
| --- |

| gear_rentals {   id: UUID primary key   rental_item_id: UUID foreign key   athlete_id: UUID foreign key   booking_id: UUID foreign key   rented_at: TIMESTAMP   returned_at: TIMESTAMP   daily_rate: DECIMAL(7,2)   rental_days: INT   total_charged: DECIMAL(10,2)   condition_out: VARCHAR(200) ("clean, no damage" | "scuff on visor" etc)   condition_in: VARCHAR(200)   damage_notes: TEXT   damage_charged: DECIMAL(10,2)   status: ENUM ["active", "returned", "damaged"]   created_at: TIMESTAMP } |
| --- |

| rentGear(athleteId: UUID, itemType: string, bookingId: UUID): Promise<GearRental> {   // Query gear_rental_items: item_type = itemType, status = available   // Create gear_rentals entry   // Set rental_item.status = rented   // Add charge to booking.items   // Return rental record with item details, rate, liability waiver URL } |
| --- |

| gear_checks {   id: UUID primary key   athlete_id: UUID foreign key   load_id: UUID foreign key   checked_by: UUID foreign key (staff member)   rig_owner: ENUM ["dz", "personal"]   aad_manufacturer: VARCHAR(50)   aad_service_current: BOOLEAN   aad_mode: VARCHAR(50)   reserve_manufacturer: VARCHAR(100)   reserve_repack_current: BOOLEAN   main_canopy_condition: VARCHAR(200)   harness_condition: VARCHAR(200)   overall_passed: BOOLEAN   failure_reason: TEXT nullable   notes: TEXT   checked_at: TIMESTAMP } |
| --- |

| autoAssignGear(athleteId: UUID, loadId: UUID): Promise<EquipmentAssignment | GearCheck> {   // Fetch athlete experience, weight, license status   // If student: query DZ student rigs by weight, auto-assign, return assignment   // If tandem: query DZ tandem rigs, auto-assign, return assignment   // If licensed with personal gear: return requirement for gear_check   // If licensed visiting DZ: return requirement for gear_check   // If licensed known jumper with DZ gear: auto-assign, return assignment } |
| --- |

| equipment_maintenance {   id: UUID primary key   rig_id: UUID foreign key   equipment_type: ENUM ["rig", "reserve", "main", "aad", "container", "harness"]   maintenance_type: ENUM ["repack", "service", "inspection", "repair", "replacement"]   scheduled_date: DATE   performed_date: DATE nullable   performed_by: UUID foreign key nullable (rigger/tech)   vendor: VARCHAR(200) nullable (if outsourced)   cost: DECIMAL(10,2) nullable   notes: TEXT   status: ENUM ["scheduled", "in_progress", "completed", "overdue", "cancelled"]   created_at: TIMESTAMP } |
| --- |

| getMaintenanceAlerts(dzId: UUID): Promise<MaintenanceAlertSummary> {   // Query equipment_rigs for dropzone   // For each rig, check reserve next_repack_due, AAD service_due_date, etc   // Aggregate alerts by category (reserve due soon, AAD overdue, etc)   // Calculate grounded rigs (cannot be assigned)   // Return summary with rig-by-rig breakdown, counts, and SLA status   // Trigger daily email job at 6 AM local DZ time } |
| --- |

| Certification Body | Primary Region | AFF Progression | License Path | Unique Rules |
| --- | --- | --- | --- | --- |
| USPA | USA | Levels 1–8 | A→B→C→D | Written exam required for A License |
| BPA | UK/Ireland | Levels 1–7 | A→B→C | Different level definitions |
| APF | Australia/NZ | Levels 1–8 | A→B→C→D | Winter skills required |
| FFP | France | Stages 1–4 | BP→BP2→BP3→BP4 | French language emphasis |
| DFV | Germany | A1–A3 | A→B→C | Unique skill matrix |

| training_modules {   id: UUID primary key   dropzone_id: UUID foreign key   certification_body: ENUM ["uspa", "bpa", "apf", "ffp", "dfv"]   level: VARCHAR(50) (e.g. "aff_1", "aff_2", "a_license", "tandem_instructor")   title: VARCHAR(200)   description: TEXT   ground_school_duration_min: INT (minutes)   skills: JSON array ["arch_position", "altitude_awareness", "pull_practice", "turns", "tracking", ...]   passing_criteria: JSON {"min_jump_count": 1, "min_score": 80, "required_skills": [...]}   video_url: VARCHAR(500) nullable (training video link)   document_url: VARCHAR(500) nullable (PDF guide)   created_at: TIMESTAMP   updated_at: TIMESTAMP } |
| --- |

| training_quizzes {   id: UUID primary key   module_id: UUID foreign key   title: VARCHAR(200)   questions: JSON array [{"question": "...", "options": [...], "correct": 0, "explanation": "..."}]   passing_score: INT (0-100)   max_attempts: INT (default 3)   created_at: TIMESTAMP } |
| --- |

| getTrainingModule(dzId: UUID, certBody: string, level: string): Promise<TrainingModule> {   // Query training_modules by dropzone_id, certification_body, level   // Fetch associated quiz if present   // Return module with full content, skills list, and passing criteria   // If DZ has custom module, return that; otherwise return default template } |
| --- |

| student_progression {   id: UUID primary key   athlete_id: UUID foreign key   dropzone_id: UUID foreign key   certification_body: ENUM ["uspa", "bpa", "apf"]   current_level: VARCHAR(50) (e.g. "aff_1")   current_level_jump_number: INT (how many jumps at this level)   started_at: TIMESTAMP (date AFF progression started)   last_activity_at: TIMESTAMP (last jump or training event)   status: ENUM ["active", "paused", "completed", "dropped"]   created_at: TIMESTAMP } |
| --- |

| level_completions {   id: UUID primary key   progression_id: UUID foreign key   level: VARCHAR(50)   jump_number: INT (which jump at this level)   instructor_id: UUID foreign key   date: DATE   skills_demonstrated: JSON array ["arch_position", "tracking", ...]   skills_to_improve: JSON array ["altitude_awareness", ...]   passed: BOOLEAN   failure_reason: TEXT nullable (e.g. "poor altitude awareness", "reserve deployment issue")   notes: TEXT   video_url: VARCHAR(500) nullable (jump video)   signed_off_at: TIMESTAMP (instructor signature time)   created_at: TIMESTAMP } |
| --- |

| advanceStudent(athleteId: UUID, level: string, instructorId: UUID, jumpData: object): Promise<LevelCompletion> {   // Create level_completions entry with passed=true   // Update student_progression.current_level to next level   // Emit event: student_advanced (for email/notification)   // Check if student eligible for license (A License at AFF-8 + 25 jumps)   // Return completion record }  checkStudentCurrency(athleteId: UUID): Promise<CurrencyStatus> {   // Fetch student_progression.last_activity_at   // Calculate days since last jump   // If >30 days: return status = OUT_OF_CURRENT, require_refresher = true   // Return currency status and refresher requirement } |
| --- |

| instructor_signoffs {   id: UUID primary key   athlete_id: UUID foreign key   instructor_id: UUID foreign key   signoff_type: ENUM ["level_pass", "level_fail", "skill_endorsement", "license_recommendation"]   level: VARCHAR(50) (e.g. "aff_4", "a_license")   skills_demonstrated: JSON array   notes: TEXT   signed_at: TIMESTAMP (when instructor confirmed)   signature_method: ENUM ["digital", "paper", "video_review"] (for audit)   created_at: TIMESTAMP } |
| --- |

| instructorSignOff(instructorId: UUID, athleteId: UUID, level: string, skillsDemo: string[], notes: string): Promise<InstructorSignoff> {   // Verify instructor is rated for this level   // Create instructor_signoffs entry   // Update level_completions.passed = true, signed_off_at = now()   // Check if multi-signature requirement met (if applicable)   // Trigger level_completed event   // Return signoff record with audit trail } |
| --- |

| athlete_certifications {   id: UUID primary key   athlete_id: UUID foreign key   certification_body: ENUM ["uspa", "bpa", "apf", "ffp"]   license_type: ENUM ["a_license", "b_license", "c_license", "d_license", "tandem_instructor", "aff_instructor", "coach", "rigger"]   license_number: VARCHAR(100) (e.g. "USPA-123456")   issued_at: DATE   expires_at: DATE nullable   issuing_authority: VARCHAR(100) (e.g. "USPA", "BPA")   verified: BOOLEAN (DZ confirmed via org lookup)   verified_by: UUID foreign key nullable   verified_at: TIMESTAMP nullable   created_at: TIMESTAMP } |
| --- |

| checkLicenseEligibility(athleteId: UUID, targetLicense: string): Promise<EligibilityStatus> {   // Fetch athlete's progression, jump count, completions   // Check prerequisites for target license   // Return status: ELIGIBLE | NOT_YET | MISSING_REQUIREMENT (with details)   // If ELIGIBLE, emit event: license_eligible (for notification) }  verifyCertification(athleteId: UUID, certificationId: UUID): Promise<VerificationResult> {   // Check certification_body   // If USPA: call USPA API member lookup   // If BPA/APF/FFP: create manual verification task for S&TA, mark verified = pending   // Return result with verification_status and any flags } |
| --- |

| jump_logs {   id: UUID primary key   athlete_id: UUID foreign key   jump_number: INT (cumulative across all DZs)   date: DATE   dropzone_id: UUID foreign key   load_id: UUID foreign key nullable (null if manual entry from other DZ)   aircraft_type: VARCHAR(100) (e.g. "Cessna 206", "King Air 90")   exit_altitude_ft: INT   deployment_altitude_ft: INT   freefall_time_sec: INT   canopy_type: VARCHAR(100) (e.g. "Velo 97", "Sabre 2 119")   jump_type: ENUM ["solo", "aff", "tandem", "coaching", "group", "crw"]   description: TEXT (jumper notes)   instructor_id: UUID foreign key nullable   location_landout: VARCHAR(200) nullable (if not normal landing area)   weather_notes: VARCHAR(200) nullable   verified: BOOLEAN (instructor or automatic)   verified_by: UUID foreign key nullable   verified_at: TIMESTAMP nullable   created_at: TIMESTAMP } |
| --- |

| autoLogJump(loadId: UUID, slotId: UUID): Promise<JumpLog> {   // Fetch load metadata: aircraft_type, exit_altitude, deployment_altitude, etc   // Fetch slot.athlete_id and jump details (aff_level, etc)   // Create jump_logs entry   // Set verified = false, emit event: jump_logged (for instructor notification)   // Return jump log record } |
| --- |

| Rating Type | Prerequisite | Course Requirement | Recurrency |
| --- | --- | --- | --- |
| AFF Instructor | D License + 500 jumps + 1 year current | AFFI course + exam | Annual evaluation jump |
| Tandem Instructor | D License + 200 tangems + skill check | Tandem course + FAA sign-off | Annual evaluation jump |
| Coach | A License + 100 jumps + mentor approval | Coach development (varies) | Annual currency check |
| Rigger | High school diploma + rigger course | FAA rigger certification course | Ongoing continuing education |
| S&TA | C License + 200 jumps + 2 year experience | USPA S&TA course + exam | Annual review, 4-year renewal |

| ratings_tracking {   id: UUID primary key   athlete_id: UUID foreign key   rating_type: ENUM ["aff_instructor", "tandem_instructor", "coach", "rigger", "sta"]   issued_at: DATE   expires_at: DATE nullable   course_completed_at: DATE   course_provider: VARCHAR(100) (e.g. "USPA", "PIA")   renewal_requirements: JSON {"min_jumps_per_year": 10, "eval_jump_required": true, ...}   last_renewal_at: DATE nullable   last_eval_at: DATE nullable (for annual evaluations)   status: ENUM ["current", "expiring_soon", "expired"]   created_at: TIMESTAMP } |
| --- |

| checkRatingCurrency(athleteId: UUID, ratingType: string): Promise<RatingStatus> {   // Fetch ratings_tracking for athlete and rating_type   // Check expiration date, renewal_requirements (jump count, eval date)   // Return status: CURRENT | EXPIRING_SOON (30 days) | EXPIRED   // If rating expired, prevent assignment to slots requiring that rating } |
| --- |

| Event Type | Typical Size | Duration | Revenue per Person | Operational Complexity |
| --- | --- | --- | --- | --- |
| Group Jump | 4–16 people | 1 day | $200–250 | Low — single load |
| Team Jump | 4–8 people | 1–5 days | $150–200 | Medium — block loads, same exits |
| Training Camp | 8–20 people | 3–5 days | $800–2000 | High — instructor hours, ground school, weather |
| Boogie | 100–500+ people | 2–4 days | $400–800 | Very High — manifest chaos, guest staff |
| Corporate Event | 20–150 people | 1 day | $250–350 | Very High — expectations, catering, branding |

| // group_bookings id: PK dropzone_id: FK → dropzones organizer_id: FK → athletes group_name: string event_type: ENUM   'group_jump' | 'team' | 'training_camp' | 'boogie' | 'corporate' start_date: DATE end_date: DATE expected_participants: int confirmed_participants: int status: ENUM   'inquiry' | 'quoted' | 'confirmed' |   'in_progress' | 'completed' | 'cancelled' pricing_type: ENUM 'per_person' | 'flat_rate' | 'custom' total_price: decimal(10,2) deposit_amount: decimal(10,2) deposit_paid: decimal(10,2) notes: text created_at: TIMESTAMP updated_at: TIMESTAMP  // group_participants id: PK group_booking_id: FK athlete_id: FK → athletes role: ENUM 'organizer' | 'participant' |   'instructor' | 'observer' status: ENUM 'invited' | 'confirmed' |   'checked_in' | 'completed' | 'no_show' payment_status: ENUM 'pending' | 'paid' | 'comped' invited_at: TIMESTAMP confirmed_at: TIMESTAMP |
| --- |

| async createGroupBooking(   organizerId: string,   dzId: string,   config: {     groupName: string;     expectedParticipants: number;     activityType: 'tandem' | 'aff' | 'licensed';     date: Date;     paymentModel: {       type: 'organizer_pays' | 'split_equally' |         'custom_split';       whoPayFor: {         [participantId]: decimal; // amount       };     };     notes: string;   } ) => GroupBooking |
| --- |

| async calculateGroupPricing(   groupSize: number,   activityType: 'tandem' | 'aff' | 'licensed',   dzId: string ) => {   basePrice: decimal;   bulkDiscount: decimal;   organizerFree: boolean;   pricePerPerson: decimal;   totalPrice: decimal;   depositRequired: decimal; } |
| --- |

| // teams id: PK dropzone_id: FK team_name: string discipline: ENUM   '4_way_fs' | '8_way_fs' | '4_way_vfs' |   'artistic' | 'wingsuit' | 'canopy_piloting' captain_id: FK → athletes created_at: TIMESTAMP  // team_members id: PK team_id: FK athlete_id: FK position: ENUM   'point' | 'tail' | 'inside_center' |   'outside_center' | 'camera' | 'alternate' joined_at: TIMESTAMP  // team_practices id: PK team_id: FK load_id: FK → loads practice_type: ENUM 'training' |   'competition_prep' | 'fun' formation_plan: JSON video_url: string debrief_notes: text score: int practice_date: DATE  // competitions id: PK team_id: FK event_name: string date: DATE location: string discipline: ENUM rounds_completed: int best_score: int placement: int |
| --- |

| async scheduleTeamPractice(   teamId: string,   date: Date,   jumpCount: number,   dzId: string ) => {   loads: Load[];   slotsReserved: number;   conflicts: string[];   quotaUsed: number; } |
| --- |

| // training_camps id: PK dropzone_id: FK name: string discipline: string lead_instructor_id: FK → instructors start_date: DATE end_date: DATE max_participants: int min_participants: int price_per_person: decimal(10,2) includes_jumps: int accommodation_available: boolean accommodation_price: decimal(10,2) registration_deadline: DATE status: ENUM 'announced' | 'open' | 'full' |   'in_progress' | 'completed' | 'cancelled' created_at: TIMESTAMP  // camp_schedules id: PK camp_id: FK day_number: int start_time: TIME end_time: TIME activity_type: ENUM 'ground_school' | 'jump' |   'video_review' | 'seminar' | 'free_time' description: text instructor_id: FK  // camp_registrations id: PK camp_id: FK athlete_id: FK registered_at: TIMESTAMP payment_status: ENUM 'deposit' | 'paid' | 'comped' deposit_paid: decimal(10,2) skill_level: ENUM 'beginner' | 'intermediate' |   'advanced' special_requests: text |
| --- |

| async createTrainingCamp(   dzId: string,   config: {     name: string;     leadInstructorId: string;     discipline: string;     startDate: Date;     endDate: Date;     maxParticipants: number;     pricePerPerson: decimal;     jumpsIncluded: number;     accommodationIncluded: boolean;   } ) => TrainingCamp |
| --- |

| async handleCampWeatherDay(   campId: string,   missedDate: Date ) => {   actions: {     extendByDays: 1 | null;     refundAmount: decimal;     voucherAmount: decimal;     participantNotifications: string[];   }; } |
| --- |

| // boogies id: PK dropzone_id: FK name: string description: text start_date: DATE end_date: DATE expected_attendance: int max_capacity: int early_bird_price: decimal(10,2) standard_price: decimal(10,2) door_price: decimal(10,2) includes: JSON [   'jump_tickets' | 'camping' | 'meals' | 'parties' ] featured_disciplines: JSON guest_instructors: JSON aircraft_lineup: JSON status: ENUM 'announced' | 'open' | 'sold_out' |   'in_progress' | 'completed' created_at: TIMESTAMP  // boogie_registrations id: PK boogie_id: FK athlete_id: FK registration_type: ENUM 'early_bird' | 'standard' |   'door' | 'vip' registered_at: TIMESTAMP payment_status: ENUM 'pending' | 'paid' meal_preferences: JSON camping_spot: string tshirt_size: ENUM 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' arrival_date: DATE departure_date: DATE |
| --- |

| // Boogie manifest priority queue: 1. Organized loads (pre-registered coaches) 2. Competitive jumpers (team blocks) 3. Fun jumper queue (first-come, self-manifest) 4. Demo load (if applicable) 5. Walk-ins (if capacity remains)  // Load organization per aircraft: Cessna 208 @ 15 min cycle = 4 loads/hour 8 passengers per load = 32 pax/hour 300 pax boogie needs 10+ hours flight time 2 aircraft = 20 loads/day = 160 pax/day 4-day boogie capacity = ~640 pax (real world ~400) |
| --- |

| async manageBoogieManifest(   boogieId: string,   date: Date ) => {   priorityQueue: Array<{     category: 'organized' | 'competitive' |       'fun' | 'demo' | 'walkin';     athletes: string[];     slotCount: number;   }>;   allocatedLoads: Load[];   waitlist: string[]; } |
| --- |

| // corporate_events id: PK dropzone_id: FK company_name: string contact_person: string contact_email: string contact_phone: string event_date: DATE participant_count: int event_type: ENUM 'team_building' | 'incentive' |   'celebration' | 'custom' package_type: ENUM 'tandem_only' |   'tandem_video' | 'full_experience' price_per_person: decimal(10,2) total_price: decimal(10,2) deposit_required: boolean deposit_paid: decimal(10,2) catering_required: boolean catering_vendor: string special_requests: text status: ENUM 'inquiry' | 'quoted' | 'confirmed' |   'in_progress' | 'completed' | 'cancelled' created_at: TIMESTAMP |
| --- |

| async createCorporateEvent(   dzId: string,   config: {     companyName: string;     contactEmail: string;     eventDate: Date;     participantCount: number;     packageType: 'tandem_only' |       'tandem_video' | 'full_experience';     cateringRequired: boolean;     specialRequests: string;   } ) => CorporateEvent |
| --- |

| loadsPerDay = (expectedParticipants × jumpsPerPerson)               / aircraftCapacity  Example: 50-person boogie, 4 jumps each, 208 capacity = (50 × 4) / 8 = 25 loads At 20-min turnaround (3 loads/hour) = 8.3 hours  Reality check: Can DZ actually handle this? If DZ has 1 aircraft × 8 hours = max 24 loads/day 50 pax × 4 jumps exceeds capacity. DZ needs 2nd aircraft OR reduce jump allocation. |
| --- |

| async calculateEventCapacity(   dzId: string,   eventConfig: {     participants: number;     jumpsPerPerson: number;     eventType: string;     durationDays: number;   } ) => {   loadsNeeded: number;   hoursNeeded: number;   aircraftNeeded: number;   recommendation: string;   isRealistic: boolean; } |
| --- |

| async allocateEventLoads(   eventId: string ) => {   loads: Load[];   unallocatedSlots: number;   conflicts: ConflictWarning[];   bookingConfirmed: boolean; } |
| --- |

| REVENUE   Early bird registrations: $9,000   Standard registrations: $6,600   Door sales: $2,400   Total revenue: $18,000  COSTS   Aircraft fuel/rental: $4,000   Instructor fees: $2,000   Catering: $1,200   Marketing: $500   SkyLara commission (5%): $900   Total costs: $8,600  PROFIT: $9,400 |
| --- |

| async calculateEventPricing(   config: {     basePrice: decimal;     registrations: {       earlyBird: number;       standard: number;       door: number;     };     pricingModel: 'per_person' | 'flat_rate' | 'tiered';     bulkDiscount: decimal;   } ) => {   totalRevenue: decimal;   skylaraCommission: decimal;   dzNet: decimal;   breakdown: LineItem[]; } |
| --- |

| async generateEventInvoice(   eventId: string ) => {   invoiceNumber: string;   lineItems: LineItem[];   subtotal: decimal;   tax: decimal;   total: decimal;   paymentTerms: string;   pdfUrl: string; } |
| --- |

| async publishEvent(   eventId: string ) => {   publicUrl: string;   isListed: boolean;   registrationOpen: boolean;   sharingLinks: {     facebook: string;     twitter: string;     email: string;   }; } |
| --- |

| Annual Boogie Performance:  2024: 180 participants, $32,000 revenue, NPS 7.8 2025: 240 participants, $48,000 revenue, NPS 8.4 Growth: +33% participants, +50% revenue, +0.6 NPS |
| --- |

| Marketing spend: $2,000 (social, email, influencers) Registrations acquired: 45 (direct attribution) Revenue per registration: $200 Total revenue: $9,000 ROI: ($9,000 - $2,000) / $2,000 = 350% |
| --- |

| async generateEventReport(   eventId: string ) => {   summary: {     name: string;     dates: [Date, Date];     attendance: { registered: number; actual: number; };   };   financial: {     totalRevenue: decimal;     totalCost: decimal;     profit: decimal;     roi: decimal;   };   operational: {     loadsCompleted: number;     jumpersProcessed: number;     safetyIncidents: number;     averageLoadTime: number;   };   feedback: {     nps: number;     topFeedback: string[];   };   recommendations: string[];   pdfUrl: string; } |
| --- |