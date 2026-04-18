# SKYLARA

_Source: 15_Compliance_Operations.docx_

SKYLARA
Compliance, Operations & Identity
Steps 31–35  |  Documents • Real-Time Engine • Global Validation • Offline-First • QR Identity
Version 1.0  |  April 2026  |  Brutally Honest Edition
Audit Logs • Event-Driven Automation • FAA/EASA/MENA Compliance • Offline Sync • Group Manifest
# Table of Contents
# CHAPTER 31: DOCUMENT & COMPLIANCE SYSTEM
## 31.1 Document Architecture Overview
The document management system is the backbone of regulatory compliance and legal protection across SkyLara. It handles everything from liability waivers to aircraft maintenance logs, with document lifecycle tracking, expiry management, and complete audit trails.
Every document flows through a standardized lifecycle: draft → review → approved → active → expired → archived. This ensures proper governance and prevents use of outdated or unapproved versions.
## 31.2 Digital Waiver System
Digital waivers form the first legal barrier to liability. Modern waivers must support multiple languages, meet eIDAS (EU) and ESIGN (US) standards, and provide cryptographic proof of informed consent.
### Multi-Language & Legal Compliance
Waivers are translated not just in language but in legal interpretation. A waiver valid in California may violate regulations in France. Each jurisdiction requires specific liability disclaimers, assumption-of-risk language, and parental representations.
eIDAS Regulation (EU): Qualified electronic signatures required for binding legal documents
ESIGN Act (US Federal): Allows electronic signatures with proper consent disclosures
State-specific requirements: Some states (e.g., Washington) restrict assumption-of-risk language
### Guardian Workflow for Minors
Minors cannot legally sign waivers. SkyLara implements a two-person verification: minor signs on their device, then guardian (age-verified) must sign in-person at the dropzone.
Age verification: Real-time check against government ID database (where legally available)
Guardian must be physically present: Geolocation + device fingerprint confirms guardian at DZ
Chain-of-custody: Both signatures timestamped, linked, immutable
### Waiver Versioning & Cascading Re-signature
When legal language changes (e.g., after an incident or regulatory update), all active jumpers must re-sign. Failing to catch stale waivers is a critical liability exposure.
Version control: Every waiver text change increments version, creates immutable copy
Active tracking: System identifies all jumpers with signatures on old versions
Enforcement: Stale waiver signatures block jump manifesting until fresh signature obtained
Expiry tracking: Recurring waivers (annual membership) require re-signature at renewal
### Cryptographic Proof of Informed Consent
Legal challenges often hinge on whether the signatory actually read the waiver. SkyLara creates multiple layers of proof:
Geolocation stamp: GPS coordinates + accuracy radius at time of signature
Device fingerprint: OS, browser, screen resolution, timezone—unique hash per device
IP logging: Source IP address, ISP, reverse DNS for location corroboration
Timestamp Authority: Third-party TSA signature with cryptographic proof of date/time
Biometric optional: Fingerprint or face match on mobile devices (jurisdiction-dependent)
### Brutal Honesty on Waiver Disputes
Despite perfect digital signatures, waivers fail in court for these reasons:
Plaintiff claims "I didn’t understand the language"—courts may sympathize even with clear text
Waiver deemed unenforceable in jurisdiction if it conflicts with public policy
Instructor verbally said "don’t worry, it’s safe"—verbal statements override written disclaimers
Guardian signed but minor says guardian forced them—parental authority challenged in court
Equipment failure discovered post-incident—negligence claims proceed despite waiver
## 31.3 Pilot & Aircraft Document Management
Regulatory authority over pilots rests with the FAA (or equivalent). SkyLara does not replace official logbooks but provides a digital mirror for operational scheduling.
### Pilot Documents
Airman Certificate (Medical): Valid 6 months (basic), 12 months (commercial), or 24 months (if 40+ yrs old for private)
Type Rating: Per aircraft type (e.g., King Air, Twin Otter) issued by FAA
Currency: Last 3 landings in type within 90 days for PIC (pilot-in-command)
Logbook (dual, solo, PIC hours): Verifiable paper trail; digital sync for scheduling
Background check: Some jurisdictions require pilot criminal/medical history review
### Aircraft Documents
Airworthiness Certificate: Proof that aircraft meets FAA design/condition standards
Registration (N-number): FAA Form 8050-1, ownership chain
Annual Inspection (100-hour): Required every 12 months or 100 flight hours
Airworthiness Directives (ADs): Safety bulletins that become mandatory actions
Supplemental Type Certificates (STCs): Modifications (jump door, oxygen, ballistic chutes)
Insurance: Hull, liability, non-owned liability per aircraft
Maintenance logs: Every maintenance action, repair, replacement logged with part numbers
### Automatic Expiry Tracking & Escalation
Human memory is unreliable. SkyLara automates expiry alerts on a cascading schedule to prevent operational blocks:
90 days before expiry: Soft warning email/SMS
60 days before expiry: In-app banner + escalation to instructor/pilot
30 days before expiry: SMS + scheduling blocked for that resource
7 days before expiry: Push notification + daily digest
1 day before expiry: Critical alert + immediate blocking
After expiry: Hard block—cannot manifest, cannot schedule, emergency notification
## 31.4 Incident Report System
When something goes wrong, SkyLara must capture evidence, notify authorities automatically, and preserve the investigation chain. Incident reports are high-stakes legal documents.
### Structured Incident Taxonomy
Near-Miss: Event with potential for injury but no harm occurred (e.g., ripcord off by 500ft)
Injury: Medical attention required, from minor (scraped knee) to serious (broken bone) to fatal
Malfunction: Equipment failure (line twist, mal-deployment, ripcord stuck, rig defect)
Fatality: Jumpable fatality with investigation requirements per USPA SIM Section 6-3
Property Damage: Aircraft damage, facility damage, third-party property
Administrative: Waiver violation, underage jump, unauthorized activity
### Evidence Chain & Impound Protocol
In a fatality investigation, every piece of gear is evidence. SkyLara tracks physical impound status:
Photo capture: Immediate, timestamped, geotagged images of all equipment
Video evidence: Jump footage, deployment footage, recovery footage if available
Witness statements: Recorded verbatim with witness contact info and signature
Gear impound: Parachute, rig, jumpsuit, helmet, AAD—each item tracked with chain-of-custody
Forensic rigger report: Third-party rigging inspection within 48 hours
Medical report: Hospital discharge summary, autopsy results if applicable
### Automatic Authority Notification Rules
Severity determines who gets notified immediately:
Severity 1 (Fatality): USPA, FAA, local law enforcement, coroner, insurance within 1 hour
Severity 2 (Serious injury requiring hospitalization): USPA, local authority, insurance within 4 hours
Severity 3 (Medical attention, potential media): Local authority notification, insurance within 24 hours
Severity 4 (Near-miss or minor injury): Internal log only, no external notification required
### Investigation Workflow & Role-Based Access
Access to incident details is heavily restricted:
Public: Case number, date, activity type, severity level only
DZ Staff: Full incident data including witness statements and photos
Safety Officer + DZ Owner: Full access including forensic analysis
USPA/FAA Investigators: API access to specific case per legal authorization
Injured party legal counsel: Limited access per subpoena
## 31.5 Compliance Records Engine
SkyLara must track compliance across multiple jurisdictions simultaneously. A DZ operating in Arizona (US FAA Part 105), accepting UK jumpers (CAA), and with visiting EU instructors (EASA) has overlapping regulatory obligations.
### Multi-Jurisdiction Compliance Matrices
US FAA Part 105: Skydiving operations regulations, aircraft certification, personnel requirements
EU EASA: European regulations, medical standards, instructor certification via national authorities
UK CAA: Post-Brexit separate regime, recognition of USPA instructor certs via bilateral agreement
MENA CAA (Middle East): Varies by country; some jurisdictions prohibit sport skydiving entirely
USPA Standards & Manifesto: Industry standards adopted by most US DZs (not law, but insurance requirement)
BPA (British Parachute Association): UK equivalent to USPA, different requirements for student progression
### DZ-Level Compliance Dashboard
The compliance dashboard provides at-a-glance status across all categories:
Green (Compliant): All documents valid, no immediate action needed
Yellow (At Risk): Expiry within 30 days, renewal in progress, minor discrepancies
Red (Non-Compliant): Expired documents, missing certifications, regulatory violations
Blocked (Critical): Operations must stop until resolved (e.g., no pilot medical certificate)
### License Verification with Third-Party APIs
Where available, SkyLara integrates directly with regulatory databases:
FAA IACRA: Integrated Airman Certification & Rating—pilot certificate verification (limited public access)
USPA Membership DB: Cross-check instructor ratings and ratings currency (with written agreement)
BPA Registry: UK instructor verification (bilateral data sharing agreement)
Manual verification: For jurisdictions with no API, scanned certification uploaded and reviewed by compliance officer
## 31.6 Audit & Logging System (DEEP DIVE)
This is the system’s legal safeguard and operational backbone. Every action that changes state is logged immutably. This section details the architecture comprehensively.
### What Gets Logged
NOT just "user logged in." SkyLara logs operational changes that affect safety, liability, or financial integrity:
Load changes: Jumper manifested, manifesting cancelled, reassigned to different load, weight recorded
Instructor overrides: Waiver/currency check bypassed, student cleared despite flags, equipment swap approved
Payment modifications: Refund issued, credit applied, price adjusted, discount applied, collection attempt
Safety overrides: No-fly list bypass, medical flag cleared, equipment expiry override, wind limit exception
Gear assignments: Parachute assigned to jumper, helmet swapped, altimeter reassigned, reserve AAD replaced
Waiver sign-offs: Waiver signed, waiver re-signature forced, digital signature verified, legal review completed
System actions: Automated refunds, automatic load merges/splits, weather hold triggered, incident escalation
Access grants: User permissions changed, role assigned, document access approved, API key generated
### Audit Log Entry Structure
Each log entry captures before/after state to enable full reconstruction:
### Immutable Append-Only Storage
The audit log is append-only. No deletions, no updates. Each entry cryptographically links to the previous entry:
Hash chain: audit_log[n].audit_chain_hash = SHA256(JSON.stringify(audit_log[n]) + audit_log[n-1].audit_chain_hash)
Verification: To tamper with entry [n], attacker must rehash all entries [n+1] onwards—detectable on next verification
Database trigger: Prevent UPDATE/DELETE on audit_logs table via database constraint or middleware
### Change History Viewer & Diffs
For any entity (jumper, load, payment), reconstruct the full before/after audit trail:
### Incident Traceability
When an incident occurs, reconstruct the full timeline of that jump from the moment it was manifested:
Jump manifesting: Who manifested, what load, what jumpers, aircraft assignment
Instructor checks: Waiver verified, currency checked, weight limits verified
Gear assignments: Parachute serial, rig serial, AAD setting, helmet issued
Load delays/changes: Any rescheduling, load merges, pilot substitutions
Jump execution: Actual departure time, altitude, actual jump time, deployment altitude
Post-jump: Landing location, injuries reported, gear inspected, incident created if applicable
### System Logs (Separate from Audit Logs)
System logs capture technical errors and performance issues, not business events:
ERROR: Unhandled exceptions, database connection failures, API timeouts
WARN: Deprecated API usage, slow queries (>2s), payment processor rejections, external service degradation
INFO: User login, API key usage, batch job completion, configuration changes
DEBUG: Detailed function traces (disabled in production)
### Log Levels & Environment Thresholds
### Data Retention Tiers
Keeping all logs forever is expensive and may violate GDPR. SkyLara uses tiered retention:
Hot tier (0-90 days): Full operational logs in primary database for real-time queries and alerting
Warm tier (90 days - 2 years): Compressed and deduplicated in S3 Standard with Glacier Intelligent Tiering
Cold tier (2-7 years): S3 Glacier Deep Archive, retrieval in hours, annual backup verification
Purge (7+ years): Deleted per legal hold release and GDPR compliance documentation
### GDPR: Right-to-Erasure vs Audit Integrity
This is a real tension: EU law allows data subjects to request erasure, but audit logs must be preserved for 7 years for legal compliance.
Anonymization approach: Replace user_id with hash, remove personally identifiable details, preserve audit structure
Tokenization: Assign random token to jumper, replace name/email/phone with token in historical logs
Legal hold: If jumper involved in incident/lawsuit, audit logs cannot be deleted until case resolves
Compliance: Document GDPR compliance decisions in writing; be prepared for DPA audit
### SOC 2 Type II Compliance
If SkyLara markets to enterprise clients (large DZ chains, insurance partners), SOC 2 certification becomes necessary:
Audit trails: 12-month continuous audit logging (exceeds 7-year legal requirement)
Access controls: Multi-factor authentication for admin access, role-based permissions logged
Change management: All production changes logged with approval workflow
Incident response: Documented incident procedures, log preservation during security events
Third-party audit: Annual engagement with Big 4 accounting firm (~$80k-150k cost)
### Brutal Honesty on Audit Logging
Storage cost is REAL: 1 million audit entries per month × 7 years = 84 million records = expensive indexes and queries
Query performance degrades: SELECT * FROM audit_logs WHERE entity_id = ? on 2-year-old table is slow without proper indexing
Hash chain verification at scale: Verifying 100 million hashes takes hours—do it offline, not on user request
GDPR anonymization is HARD: Even "anonymized" logs can be re-identified via timestamps and patterns
Developers hate audit logging: Slower writes, larger database, "why does this button click take 500ms?"
## 31.7 Secure Storage & Version Control
Documents are stored in S3 with server-side encryption and signed URLs for time-limited access. Every document has a versioning trail.
S3 storage: AES-256 server-side encryption, bucket policies restrict public access
Signed URLs: Pre-signed GET URLs expire after 1 hour; document access logged to audit trail
Version control: Every edit creates immutable version; old versions cannot be deleted or modified
Digital signatures: Documents signed with private key; timestamp authority validates signature date
Access control: Role-based access per document type (e.g., only safety officer can view incident reports)
Backup strategy: S3 cross-region replication, point-in-time recovery via AWS Backup, 99.99% durability SLA
## 31.8 GDPR & Legal Compliance
Data classification drives retention and deletion policies. Not all data is equal.
Data Processing Agreements (DPA): If using third-party cloud, CDN, payment processor, require signed DPA per GDPR Article 28
Consent management: Track which consent given (email marketing, photos, data sharing), allow withdrawal anytime
Consent withdrawal: When user withdraws, stop processing immediately; past consent is still valid
Cross-border transfers: EU→US requires Standard Contractual Clauses (SCCs) due to Schrems II ruling; MENA transfers vary by country
Breach notification: EU: 72 hours to notify authorities + affected individuals; US varies by state
## 31.9 Database Schema
Full DDL statements for document management, waivers, incidents, and audit logs:
## 31.10 Brutal Honesty: What Breaks in Practice
Unsigned waivers discovered post-incident: Jumper manifested as experienced, no waiver signature found in system, no way to know if they understood risks
Expired documents slipping through: Pilot medical expired 3 months ago but scheduler didn’t see it; FAA violation and insurance denial
Audit log gaps during outages: System crashed for 2 hours; actions during outage not logged; impossible to prove what happened
Database query performance: Showing 50 audit entries for a single jump is slow; loading full timeline for incident investigation is 10+ seconds
Legal liability when systems fail: Even with perfect digital safeguards, if a jumper is injured, plaintiff’s lawyer will claim "your system failed"
Cost of compliance vs non-compliance: Implementing full compliance costs $50k-100k in dev time; cost of lawsuit is $500k+; but no one wants to invest until incident happens
GDPR erasure requests are a nightmare: Jumper requests data deletion; you must anonymize audit logs while preserving incident investigation data; legally complex
# CHAPTER 32: ADVANCED REAL-TIME OPERATIONS ENGINE
## 32.1 Event-Driven Architecture Overview
SkyLara’s operations are driven by events, not polling. When a load manifest changes, when weather updates, when a jumper no-shows, the system reacts automatically through an EventBus.
### EventBus Design & Typed Events
Every significant action emits an event. Subscribers listen and react:
Event: A typed, immutable message with timestamp, source, and payload
Subscriber: A handler function that listens for specific event types
Dead Letter Queue (DLQ): Failed events are retried; permanent failures go to DLQ for manual inspection
Ordering: Events within a single aggregate (e.g., one jump) are processed in order; cross-aggregate ordering is best-effort
### Event Flow Diagram
## 32.2 Weather Trigger System
Wind speed is the primary operational limiter. SkyLara pulls real-time METAR and wind sensor data, compares against activity-specific thresholds, and triggers automated holds.
### Real-Time Weather Integration
METAR API: FAA Aviation Weather Center updated every 30 minutes; parsed for wind, visibility, precipitation
TAF (Terminal Aerodrome Forecast): 30-hour forecast; identify upcoming conditions that will cause holds
Local wind sensors: DZ-mounted anemometer; real-time data stream; more accurate than METAR
Weather API (Dark Sky, OpenWeather): Fallback sources; crosscheck METAR data for reliability
Pressure altitude corrections: Wind limits assume sea level; high-altitude DZs adjust thresholds per density altitude
### Activity-Specific Wind Limits
### Automatic Load Holds & Cancellations
When wind exceeds thresholds, the system doesn’t wait for a phone call:
Hold decision: Wind >= HOLD_THRESHOLD → cancel new load bookings, allow existing loads to complete
Cancellation decision: Wind >= CANCEL_THRESHOLD → cancel scheduled loads (with refund cascade)
Resume decision: Wind drops below HOLD_THRESHOLD - 2kt hysteresis → resume operations
User notification: SMS/push to all manifested jumpers, in-app alert, email to DZ staff
### Weather Hysteresis (Prevent Flip-Flopping)
Wind at the boundary (e.g., 14.2kt for tandem limit 14kt) causes constant hold/resume toggling. Hysteresis prevents this:
## 32.3 No-Show & Delay Triggers
No-shows cascade through the schedule. Delays compound. SkyLara detects and rebalances automatically.
### No-Show Detection
Trigger: 15 minutes before scheduled call time, check jumper check-in status
Confirmation: At 15min mark, send SMS reminder; if no response by call time, mark no-show
Automation: Remove from load, refund initiated, waitlist promoted
Repeat offender: Track no-show count; flag account for require-deposit policy
### Automatic Waitlist Promotion
### Delay Cascade: Recalculating All Subsequent Loads
If Load 1 delays 30 minutes, Loads 2, 3, 4 are impacted. SkyLara recalculates:
Recompute turnaround: Account for longer ground handling time
Instructor availability: Does the delay conflict with next instructor slot?
Aircraft availability: If aircraft is reallocated, cascade the change
Student progression: AFF progression jumps must stay in order; if delay breaks sequence, reorder or reschedule
Sunset buffer: If load now departs after sunset on tandem altitude, recalculate reserves
## 32.4 Automatic Load Adjustment Engine
Load optimization is continuous. Empty seats waste aircraft time and instructor availability. SkyLara merges, splits, and rebalances automatically.
### Load Merge Logic
Two half-empty loads at similar times → merge into one:
Score calculation: Merge score = (empty_seats_saved + instructor_efficiency) - (schedule disruption)
CG calculation: Recalculate aircraft center of gravity with merged jumper weights
Capacity check: Does merged load exceed aircraft max jumpers or weight limits?
Notification: Notify all jumpers of load change 30+ minutes before call time
### Load Split Logic
Overweight load → split by activity priority:
Priority 1: AFF progression (must maintain student sequence)
Priority 2: Tandem (high revenue, time-sensitive)
Priority 3: Experienced jumpers (flexible scheduling)
Rebalance: Move experienced jumpers to new load, keep tandem+AFF in original
### Aircraft Swap Logic
Primary aircraft goes unserviceable → reassign to backup with capacity recalculation:
Check backup aircraft availability and capacity
Recalculate load weight and CG for different aircraft model
Check instructor assignment compatibility (some instructors rated only for specific types)
Update all dependent loads and estimated departure times
### Time-Slot Optimization
Minimize ground time between loads while maintaining safety intervals:
Ground handling time: 15 min (load exit) + 5 min (parachute packing) = minimum 20 min turn
Packing time: Reserve parachutes require ~30 min to repack; limit 3 uses per hour
Maintenance windows: If aircraft due for hourly inspection, schedule maintenance window
Instructor breaks: No more than 2 consecutive loads; 30 min break required after 3 loads
## 32.5 Notification Engine
SkyLara sends notifications across multiple channels. But notification fatigue kills engagement. Smart throttling is essential.
### Multi-Channel Delivery
Push notification (FCM): Fastest, in-app, rich formatting; requires app installed
SMS (Twilio): Reliable, works on any phone, 100% read rate; expensive ($0.01-0.02 per message)
WhatsApp (Twilio): More reliable in MENA/developing markets; cheaper than SMS in some regions
Email: Detailed information, reliable, can include attachments; slow (5-30 min delay)
In-app notification: Instant, cheap, but requires app open to see
### Notification Fatigue Budget
Studies show users disable notifications after 5+ messages per hour. SkyLara enforces throttling per user per hour:
Max 5 notifications/hour per user across all channels
Priority queue: CRITICAL (incident, weather hold) > HIGH (load change) > MEDIUM (reminder) > LOW (marketing)
When throttled: High/medium/low priority messages queue, critical overrides queue
User opt-out: Per-channel preferences + quiet hours (e.g., no SMS after 10pm)
## 32.6 Safety Automation Triggers
Safety is non-negotiable. SkyLara prevents unsafe operations through automation, not human memory.
Automatic ground stop: Wind exceeds CANCEL_THRESHOLD → block all new load bookings, cancel scheduled loads
Gear expiry blocks: Parachute reserve last repack > 180 days ago → manifest system blocks jumper, shows error message
License/currency blocks: Instructor medical expired → remove from schedule, cannot assign to load
Weight limit enforcement: Jumper weight + gear > aircraft max weight → hard block, display message "aircraft capacity exceeded—select different aircraft"
Incident escalation: Severity >= 3 incident reported → auto-notify safety officer, operations manager, insurance contact within 5 min
## 32.7 Dynamic Scheduling Engine
Load scheduling is not static. Demand varies by day, season, weather. SkyLara adjusts schedules in real-time.
### Demand-Based Load Scheduling
Forecast: Predict jumper demand for next 7 days based on historical data, weather, day-of-week
Add loads: High demand (forecast > 75% avg) → add 1-2 extra loads to schedule
Reduce loads: Low demand (forecast < 40% avg) → cancel scheduled loads, consolidate manifests
Publish early: Extra loads published 3 days in advance to allow bookings to fill
### Instructor Availability Optimization
Minimize gaps: Avoid 30+ minute gaps between scheduled loads for same instructor
Respect duty limits: No more than 8 jumps per day, no more than 5 consecutive without break
Skill matching: AFF student progression requires same instructor where possible
Rotation: Rotate instructors across loads to prevent fatigue and ensure coverage
### Aircraft Rotation for Even Wear Distribution
Track flight hours: Every load flight time is logged; flag aircraft approaching service intervals
Rotate primary: Use multiple aircraft in round-robin to distribute wear
Schedule maintenance: When aircraft hour count + next flight > maintenance interval, schedule maintenance window
### Sunset/Sunrise Awareness
Tandem altitude (12,000-13,500 ft) sunrise/sunset times differ from ground level. Canopy deployment must occur 15 min before ground sunset. SkyLara adjusts load departure time:
Calculation: sunset_time - deployment_duration - 15min_buffer = latest_acceptable_departure
Warn: If load cannot launch early enough, warn staff; offer reschedule or limit to lower altitude
## 32.8 Event Saga Patterns
Complex operations span multiple services. Sagas ensure consistency even if steps fail.
### Example: Manifest Group Saga
Manifesting a group of 20 AFF students involves many steps:
Step 1: Validate all waivers are current
Step 2: Check instructor availability for next 4 weeks
Step 3: Reserve aircraft slots (4 weeks ahead)
Step 4: Assign loads (sequence by AFF level)
Step 5: Confirm with group (send email with calendar invites)
Compensation (rollback): If step 3 fails (no aircraft), release instructor reservations + undo waiver holds
### Idempotency Guarantees
If a saga step is retried (network timeout, etc.), it must not create duplicate effects:
Idempotency key: Client provides unique key for each saga invocation; server deduplicates
Idempotent operations: All operations are designed to be safe to retry (e.g., load assignment is upsert, not insert)
Timeout handling: If step takes > 30s, assume failure and start compensation
## 32.9 Monitoring & Observability
What gets measured gets managed. SkyLara tracks event throughput, latency, failures across all operations.
### Real-Time Event Throughput Dashboard
Events/minute by type: Show rate of manifests, no-shows, payments, incidents
Success rate: Percentage of events processed successfully vs failed
DLQ size: How many events are stuck in dead-letter queue waiting for manual intervention
### Latency Percentiles for Critical Paths
p50, p95, p99 latency for: load manifesting, payment processing, incident reporting, weather hold trigger
SLA targets (assuming 99.95% uptime): Load manifest < 2s p99, payment < 30s p99, incident < 100ms p99
Alert thresholds: If event latency p95 > 5s, page oncall
## 32.10 Database Schema
Tables to support event-driven operations with full DDL:
## 32.11 Brutal Honesty: Real-World Limitations
Event ordering in distributed systems is HARD: If two users manifest the same jumper simultaneously on different services, race conditions happen; require strict ordering per aggregate
EventBus outage is catastrophic: If the event bus itself goes down, no events process; cascades to load scheduling, payments, notifications—everything stops; plan for 99.99% uptime
Notification fatigue kills engagement: After 3 notifications about wind holds, users disable push. No way to force user attention. Weather system works but people don’t read alerts
Weather API reliability: METAR updates every 30 minutes (not real-time); local wind sensor fails (calibration, battery, network); fallback strategies required
The cost of building vs buying: Many DZs use walkie-talkies and whiteboards—$0 tech, 100% reliability, no software bugs. Automation is luxury, not necessity
Operator override fatigue: Safety officers will override automation rules for "just this one jump" repeatedly; audit logs show overrides; culture matters more than code
Event replay complexity: If you need to replay events to recover from data corruption, you’ll discover idempotency is much harder than theory
# CHAPTER 33: GLOBAL OPERATIONS VALIDATION
## 33.1 Regulatory Framework Overview
Aviation authorities govern skydiving operations differently across regions. The FAA (United States), EASA (European Union), CAA (United Kingdom), and CASA (Australia) each maintain distinct regulatory frameworks. Additionally, sport aviation organizations such as USPA (United States Parachute Association), BPA (British Parachute Association), APF (Australian Parachute Federation), and FFP (Fédération Française de Parachutisme) enforce operational standards.
## 33.2 US Compliance Validation (FAA Part 105)
14 CFR Part 105 governs all parachute operations in United States airspace. Operators must file a NOTAM (Notice to Airmen) at minimum one hour before jump operations commence. A pilot-in-command must hold a commercial certificate and either 500 hours of flight experience or 200 jumps dropped from that aircraft. Aircraft must be approved for dropping operations, equipped with an approved jump door, and maintain pilot restraint systems during exits.
Jump operations cannot occur within five nautical miles of an airport without specific authorization. Night jumps require additional training, special visibility equipment, and explicit FAA approval. Navigation rules restrict jumps over congested areas, and all emergency procedures must be documented in operating manuals accessible to all crew.
## 33.3 EU Compliance Validation (EASA)
European aviation remains fragmented. EASA publishes common standards, but individual member states implement parachute operations through national regulations. Instructor certifications vary significantly. USPA ratings receive limited recognition in Europe. Equipment standards differ substantially—European rules reference EN (European Norm) standards while North America uses TSO (Technical Standard Order) certification.
France, Switzerland, and Spain have mature sport parachuting organizations. Germany and UK maintain rigorous oversight. Eastern European countries operate under legacy rules with less standardization. SkyLara’s EU deployment requires country-by-country adaptation and regulatory review.
## 33.4 MENA Compliance Validation
The Middle East and North Africa presents unique regulatory and cultural challenges. UAE operates modern skydiving facilities in Dubai with GCAA oversight. Saudi Arabia permits sport skydiving with military coordination. Jordan, Egypt, and Tunisia have active dropzones but less formalized regulation. Military airspace restrictions are extremely common and require diplomatic clearance in some countries.
Cultural considerations include gender-separated operations in conservative regions, strict dress code requirements, respect for religious holidays and prayer times, and language-specific safety briefings and waivers. Insurance underwriting differs dramatically—some countries require government-sponsored pools. SkyLara deployment in MENA demands cultural sensitivity and regulatory consultation with local aviation authorities.
## 33.5 Real Dropzone Workflow Validation
A typical busy Saturday at a medium-size dropzone (4 turbine aircraft, 200-300 jumps per day) exposes SkyLara to intense operational pressure. Pre-opening begins at 5:00 AM: weather check against TAF and METAR, aircraft mechanical preflight, manifest setup, load planning based on student progression, and equipment inspection. By 7:00 AM, first tandem customers arrive requiring waiver processing, gear fitting, safety briefing, and manifest entry.
Simultaneous operations escalate complexity. AFF students progress through Level 1-7 training with specific instructor ratios and wind limits. Fun jumpers self-manifest by license level, requiring license verification, gear compatibility checking, and group load organization. Mid-day weather holds trigger cascading delays—a wind spike at 10:30 AM halts operations, stalling income and compressing afternoon schedules. By 2:00 PM, afternoon rush arrives with maximum capacity loads, stacked manifests, rotating instructors, and compressed turnaround times.
Operational disruptions test system resilience. A mid-air reserve opening triggers emergency response: incident notification to safety officer, ground crew alert, medical standby activation, and incident documentation. Off-landings require student tracking, ground retrieval coordination, and detailed incident logging. Day-end reconciliation includes cash counting (tandem fees, video packages, gear rental), load count verification, instructor payout calculations, and aircraft shutdown procedures.
## 33.6 Safety Gap Analysis
Safety-critical paths require absolute coverage. Emergency profiles must be accessible offline and synchronized with aggressive frequency—every injury history, medical restriction, and allergy could determine jump authorization or medical response. Current architecture assumes connectivity for critical decisions. Equipment tracking reveals significant gaps: borrowed gear without transponders lacks audit trails, personal rigs from external manufacturers cannot be verified, and historical jump records for bailout decision-making may be incomplete or scattered across multiple systems.
Student supervision gaps emerge under pressure. AFF instructor ratios (1:3 during freefall, 1:5 for canopy) cannot be automatically enforced by software—manifest operators make these decisions. Wind hold authority rests with safety officers, not the system. Camera flyer selection ignores minimum jump requirements and helmet snag risk assessment. The system lacks decision-support tools for complex scenarios.
## 33.7 Operational Risk Assessment
Single points of failure threaten operations. Internet outage at the dropzone halts new customer registration, payment processing, and NOTAM filing. Power outage disables the entire system unless local battery backup and offline mode function flawlessly. Absence of the manifest operator—often the only person with system knowledge—creates operational blind spots. Scaling risks are severe: the system designed for a single dropzone with basic manifest functions cannot handle 50 dropzones simultaneously without architectural redesign.
System bottlenecks emerge at capacity. If the mobile app becomes unresponsive during afternoon rush, manifest staff revert to paper, defeating workflow efficiency gains. If the payment system locks during peak tandem operations, revenue capture fails. If GPS tracking for off-landing jumpers experiences latency, ground crew cannot locate students efficiently. These risks compound during worst-case scenarios.
## 33.8 Integration Risk Assessment
Third-party API dependencies introduce fragility. Weather APIs provide regional forecasts but may miss micro-climates specific to mountain or beach dropzones. Stripe payment processing, if unavailable, blocks card payments—offline fallback captures intent but delays reconciliation. SMS providers for emergency alerts experience occasional outages. Mapping APIs for off-landing tracking depend on cell coverage that may be unreliable near remote dropzones.
Fallback strategies must account for degraded operation. If Stripe is down, staff record transaction intent locally and retry upon reconnection. If weather APIs fail, staff rely on manual TAF/METAR interpretation. If maps are unavailable, ground crew use radio-guided searches. These degradations are operationally acceptable only if staff understand and train on procedures.
## 33.9 Missing Features Identification
SkyLara addresses core dropzone manifest functions but lacks entire operational domains. Safety-critical features missing include real-time instructor certification tracking (are they current with medical and canopy-control recertifications?), automated wind-hold triggers based on equipment categories (tandems hold at higher wind speeds than AFF), and incident classification and trending analytics for safety culture.
Revenue-critical features missing include comprehensive pricing models (tiered discounts, group bookings, promotional codes), advanced scheduling that optimizes aircraft utilization, and detailed financial reporting by service line (tandem revenue vs. AFF training costs). Dropzone-specific quirks are completely ignored: beach dropzones have tidal constraints on landing areas, mountain dropzones require altitude compensation and terrain avoidance, desert dropzones face dust storm weather patterns, island dropzones depend on ferry schedules.
## 33.10 Recommendations & Roadmap Adjustments
Critical pre-launch fixes include offline-mode testing at multiple dropzones, incident response validation with safety officers, and weather data accuracy verification against local conditions. The system must never block operational decisions—all safety choices remain with trained staff.
Select pilot dropzones carefully. Ideal candidates are medium-size facilities (150-250 daily jumps), located in areas with reasonable connectivity, operating familiar aircraft types, and staffed by tech-comfortable personnel. Avoid high-complexity sites (island DZs with ferry dependencies, military-restricted zones) for initial rollout.
Phased rollout should prioritize: Phase 1—manifest and basic check-in at single site, Phase 2—tandem customer workflows plus offline mode, Phase 3—AFF and advanced training integration, Phase 4—multi-site federation and scaling, Phase 5—advanced analytics and safety reporting.
Before writing code on missing features, validate requirements with real DZ staff. Bring engineers and designers to spend a full Saturday at a busy dropzone. Watch manifest operators work under pressure. Observe safety officer decision-making during weather holds. Interview pilots about aircraft constraints. These conversations will reveal that software cannot replace human judgment in safety-critical environments.
# CHAPTER 34: OFFLINE-FIRST RESILIENCE & LOCAL OPS SYSTEM
## 34.1 Offline Architecture Overview
Dropzones operate in environments where connectivity cannot be guaranteed. Rural jump sites, coastal operations, high-altitude launch areas, and remote desert facilities experience intermittent cell coverage and unreliable WiFi. Even urban dropzones with adequate connectivity experience outages—fiber cuts, router failures, ISP issues.
Offline-first architecture inverts the dependency model. The system assumes offline operation as the default state and treats cloud connectivity as an enhancement rather than a requirement. Three-tier topology: cloud primary (authoritative source), local authority device (optional intermediate server), mobile clients (manifest tablets and phones).
All clients operate independently offline, accumulating changes in a local database. A background sync engine queues mutations and delivers them to either the local authority device (if available on DZ WiFi) or cloud (when internet returns). Conflict resolution applies server-authoritative rules for safety data and last-write-wins for non-critical data.
## 34.2 Local Ops Mode — What Works Offline
Core manifest board operations function completely offline. Staff view active loads, add/remove jumpers, transition load status through full state machine (planning → manifested → boarding → departed → landed), and reassign jumpers between loads. Check-in workflows scan QR codes, verify waivers against local cache, and record participation. Instructor and camera assignments are recorded locally.
Emergency profiles access the most aggressively synchronized data. Medical history, allergies, contraindications, and emergency contacts remain available offline because they inform real-time safety decisions. Incident reports are created locally with full context (photo, location, witness names, description) and queued for sync.
Payment intent recording captures cash transactions immediately. Card payment intents are recorded with transaction ID and queued—staff understand that card processing completes only when connectivity returns. Staff can view historical transaction intents but cannot generate new payment links without connectivity.
Operations that do NOT work offline: new customer registration (requires ID verification against external systems), card payment authorization (requires Stripe connection), real-time weather APIs (requires connectivity), NOTAM filing (requires FAA connection), and license verification (requires sport org APIs).
## 34.3 Local Database Design
Web clients use IndexedDB with Dexie.js wrapper for declarative schema and transaction support. React Native mobile clients use WatermelonDB for similar API and offline-first design. Both maintain synchronized schemas for consistency.
Local stores mirror production tables selectively. Active entities live locally: loads (current and next 24 hours), load_slots (all unassigned), jumpers (registered participants and active tandem customers), instructors (current roster), emergency_profiles (all, refreshed hourly), waivers (signed today and yesterday for quick lookup), gear_assignments (current jump), and aircraft (active in use).
Archive and historical data remain cloud-only: jump history older than 30 days, completed incident reports, archived customer records, and financial records. Local indexes optimize query performance: jumper lookup by name prefix (O(log n)), load lookup by status (O1)), gear lookup by serial (O(1)), instructor lookup by certification (O(log n)).
## 34.4 Sync Engine Design
Every local mutation (create, update, delete) generates an outbox entry immediately. The outbox contains: entity type, operation (create/update/delete), new values, timestamp, client-generated UUID (for idempotency), and vector clock for ordering. A background sync worker processes the outbox asynchronously, batching mutations and sending them to the sync endpoint.
Outbox processing follows strict rules. Mutations are ordered by Lamport timestamp (local clock incremented per event). Batch size limits prevent overwhelming the server or network. Failed mutations retry with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 60s max, repeating until 100 retries. Failed mutations after 100 retries move to a dead-letter queue for manual inspection.
Idempotency ensures replay safety. Every mutation carries a UUID generated by the client. The server deduplicates by UUID—if a mutation with the same UUID already exists, the server acknowledges success without reprocessing. This allows clients to retry indefinitely without corrupting state.
Sync protocol: pull-first (server→client), then push (client→server). Pull fetches all changes since the client’s last known timestamp, applying them locally with conflict resolution. Push batches all outbox mutations and sends as an ordered array. Server acknowledges successful processing and returns updated vector clocks.
## 34.5 Conflict Resolution
Safety-critical data (medical profiles, certifications, compliance status) is always server-authoritative. If a client mutation conflicts with server state, the server state wins. The client receives the updated values and applies them locally, discarding the conflicting local change.
Non-critical data (load notes, scheduling preferences, profile updates) follows last-write-wins semantics. The timestamp of the most recent mutation determines the authoritative value, regardless of client or server origin. This is simple but acceptable for data without safety implications.
Field-level merge applies to collections. Load slots merge by position—if client assigns jumper A to slot 5 while server has assigned jumper B to slot 5, the server state (if more recent) wins. Instructor schedules merge by time block. Complex merges are avoided; instead, the entire entity is server-authoritative on conflict.
Manual review is required for safety-critical conflicts. Conflicting load slot double-assignments (two jumpers claiming same slot), instructor availability conflicts (overlapping assignments), and incident data discrepancies require human decision-making via conflict review dashboard.
## 34.6 UX Strategy — Seamless Online/Offline
Users never see network spinners for cached data. Manifest board loads instantly from local database. Jumper list appears immediately. Waivers display in < 200ms from IndexedDB. This creates the illusion of always-available service even during offline periods.
Optimistic updates ensure perceived responsiveness. When staff add a jumper to a load, the UI updates immediately, the outbox records the mutation, and background sync happens asynchronously. If sync fails, a subtle toast notification alerts staff: “Changes not yet synced (pending connection).” Staff understand the system is operational but changes are queued.
Sync indicators appear as small, non-blocking icons. A subtle cloud icon (filled during sync, outlined when synced) appears in the header. Sync status shows informally: “Last synced: 2 minutes ago” when offline. Staff never see cryptic error messages. Network errors trigger gentle notifications with context: “Cannot reach cloud—using local copy” or “Waiting for connection to process card payment.”
Stale data warnings activate only when critical: “Emergency profiles not updated in > 1 hour” triggers during offline periods lasting longer than sync frequency. Waivers cached today are always current. Load data cached during current session is always current. Historical data older than cache age is flagged with update time.
## 34.7 Edge/Local Authority Model
A local authority device (optional NUC mini-PC or dedicated iPad on charger) provides local sync point when cloud is unreachable. The authority device runs the same sync engine, maintains a synchronized database, and acts as a local server for all manifest tablets and staff phones.
Automatic failover activates when cloud is unreachable > 30 seconds. All clients switch to syncing with local authority instead of cloud. The authority device queues all mutations internally and syncs to cloud when it regains connectivity. Automatic recovery occurs when the authority device detects cloud availability—it flushes the queue and syncs upstream.
Device discovery uses mDNS (Multicast DNS) / Bonjour. Devices broadcast their availability on the local network. Clients detect the local authority and configure sync endpoints automatically. No manual network configuration required. If the authority device fails or loses power, clients detect disconnection within 30 seconds and revert to queuing locally.
The authority device introduces operational complexity. It requires power backup, IT maintenance, and monitoring. It adds a potential single point of failure for the entire dropzone. Most dropzones will initially operate without one, accepting that intermittent offline periods queue changes locally. Only high-traffic operations with frequent outages justify the hardware and maintenance overhead.
## 34.8 Priority Offline Features (Tiered)
Tier 1 (must work offline, zero downtime tolerance): manifest board read/write, load status transitions, check-in scanning and QR verification, emergency profile access, incident report creation. These features have no external dependencies and must function identically whether online or offline.
Tier 2 (should work offline, degraded behavior acceptable): gear assignment, instructor scheduling, cash payment intent recording, waiver display (pre-cached). These features have minor external dependencies or require sync before certain operations (e.g., gear assignment requires offline gear database, instructor scheduling requires offline instructor availability).
Tier 3 (may degrade offline, online requirement acceptable): analytics and reporting (requires cloud aggregation), new customer registration (requires ID verification), card payment authorization (requires Stripe), real-time weather data (requires API), NOTAM filing (requires FAA). These features are built for online-only operation. Offline degrades gracefully with clear messaging: “Weather data unavailable—last known conditions: <cached METAR>” or “NOTAM filing unavailable offline—reminder queued for manual filing.”
## 34.9 Database & API Integration
Sync contracts between local IndexedDB and cloud MySQL define the exchange format and versioning. Every entity includes: id (UUID), created_at (Unix timestamp), updated_at (Unix timestamp), and vector_clock (map of client_id → lamport_timestamp for causal ordering).
Version vectors enable conflict detection. When two clients modify the same entity offline, their vector clocks differ. The server detects this on sync and applies conflict resolution strategies. Lamport timestamps within the vector clock determine ordering: higher timestamp wins under last-write-wins, but vector clocks prevent total ordering issues.
Audit trail logging captures every sync action: mutation ID, client ID, operation type, entity before/after, timestamp, device type, offline duration, and conflict resolution strategy applied. This enables forensic analysis of data integrity issues and supports compliance auditing.
API contracts define push/pull endpoints. POST /sync/push accepts ordered mutation batches and returns acknowledgment with server timestamps and vector clocks. GET /sync/pull?since=timestamp returns all mutations since the client’s last known point. Delta sync transfers only changed fields, not entire entities, reducing bandwidth on limited connections.
## 34.10 Testing & Validation Strategy
Offline scenarios require deliberate simulation. Airplane mode testing validates core manifest, check-in, and assignment workflows. Intermittent connectivity testing (toggle WiFi on/off at 30-second intervals) verifies retry logic and queue management. Long-outage testing (simulate 4-hour offline period, then reconnect) validates batch sync, conflict resolution, and data integrity.
Conflict generation tests intentionally create simultaneous modifications. Two tablets modify the same load while offline, then both sync—does server-side conflict resolution apply correctly? Do both clients receive updated state after sync? Do audit logs record the conflict resolution? Does manual review queue activate for complex conflicts?
Data integrity verification runs after every sync scenario. Checksums of critical entities (loads, jumpers, assignments) are computed before/after and compared against server ground truth. Orphaned records (assignments referencing deleted jumpers) are detected. Queue consistency (all outbox mutations eventually synced) is verified.
Performance testing targets realistic offline durations. A manifest operator works offline for 4 hours, accumulating ~100 mutations (manifest changes, check-ins, assignments). Upon reconnect, all 100 mutations sync to cloud in < 30 seconds. Battery usage during background sync is monitored on mobile clients.
## 34.11 Brutal Honesty
Building offline-first systems is prohibitively expensive. The engineering cost of conflict resolution, sync recovery, data integrity validation, and disaster recovery doubles or triples compared to cloud-first systems. Conflict edge cases (double-manifested jumpers discovered during sync, instructor assignments colliding during offline periods) will emerge in production and require crisis response.
Most dropzones do not need offline-first. Urban sites have reliable WiFi. Rural sites are rare. When outages occur, staff pull out paper and pen—a simple, proven fallback. The engineering complexity required to handle 5% of edge cases may never be justified by operational value.
Offline-first increases mobile battery drain from aggressive background sync and local database operations. Tablets on chargers are fine; phones in jumpers’ pockets drain 10-15% faster. Users eventually complain about battery life, and teams disable features to restore battery performance, defeating the system design.
The local authority device adds operational burden without guarantee of success. It requires power management, WiFi configuration, security maintenance, and monitoring. When it fails silently, staff don’t notice until operations are severely disrupted. Most dropzones lack IT staff to maintain such infrastructure.
Conflict resolution is a lie. Server-authoritative conflicts work well when the server is right. But distributed systems have edge cases: simultaneous writes from two clients before either sees the other’s mutation, cascading conflicts from slow network propagation, and Byzantine failures where different clients see different server state. No algorithm handles all cases perfectly.
The honest recommendation: Start cloud-first. Build paper fallback procedures for the rare outage. If outages become frequent enough to justify engineering investment, add selective offline capabilities (manifest board read-only, emergency profile caching). Avoid full offline-first unless the operational requirement is absolutely undeniable.
If offline-first is truly required (remote island DZ with helicopter access, zero WiFi), architect it as a separate product variant with dedicated investment. Do not attempt hybrid cloud-first + offline-first in the same codebase. The engineering complexity compounds exponentially. Commit fully to one model and defend it ruthlessly.
# Chapter 35: QR Identity, Check-In & Group Manifest System
## 35.1 QR Identity Architecture
QR tokens encode identity and context into compact, tamper-resistant payloads. Five token types serve different workflows:
### Token Types & Payloads
### HMAC-SHA256 Signature & Tamper Detection
Every QR token appends a signature computed as:
Signature validation happens on:
Mobile app (offline QR display)
Gate tablet (manifest check-in)
Gear check kiosk (rig verification)
Backend (receipt processing)
### QRCodeGenerator TypeScript Class
## 35.2 QR Scan Workflows
Five primary workflows drive QR scanning across the dropzone.
### Happy Path: Reception Check-In
### Error States & Recovery
Signature validation fails → show "Invalid QR. Please see staff." → staff manually looks up athlete
Token expired (> 12 months old) → offer to regenerate new QR via athlete app
Athlete not in system → manual fallback: name + email lookup
Waiver missing → block jump, present digital waiver eIDAS form
License verification fails → manual DZ staff review (USPA lookup or document scan)
Network down (offline mode) → scan succeeds, flags queued for sync when online
## 35.3 Group Manifest System
Groups accelerate multi-person jumps. A captain creates a group, adds members, and submits a one-click manifest. The system checks waivers, payments, licenses, and aircraft fit before confirming the load.
### Group Creation & Membership
Group workflow:
Captain initiates: chooses group type (RW/freefly/angle/wingsuit/coaching/tandem+camera/AFF/CRW)
System suggests team size limits and aircraft constraints
Captain adds members: scan QR, search name, or enter email
Members receive notification (push/SMS/email) with join link
Members confirm (in-app or link) → status = pending
Captain submits manifest → validation rules execute
### One-Click Manifest
After adding all members, the captain taps “Submit Manifest”. The system validates and returns a Group Manifest QR token.
## 35.4 Validation Rules Before Group Manifest
Nine mandatory validation rules must pass before a group manifest is accepted.
### Validation Result Format
## 35.5 Notification System for Groups
Event-driven notifications keep group members and staff synchronized.
## 35.6 Mobile App Behavior
Mobile-first QR + manifest features enable offline group creation and captain workflows.
### Mobile Manifest Flow (numItem)
Open DZ app → tap “Create Group”
Choose group type (RW, freefly, AFF, tandem, etc.)
Add members: scan permanent QR → auto-fetch profile, or manual name entry
Member receives push/SMS/email with join link or in-app request
Member taps “Join” → status changes to “pending”
Captain reviews group → taps “Submit Manifest”
System validates 9 rules, shows errors (if any) in red
If valid, generate Group Manifest QR + show aircraft fit + exit order
Captain shows Group QR to gate staff (or staff scans captain’s phone)
Gate staff confirms load → all members notified (push + SMS)
## 35.7 Database Schema
Seven tables support QR tokens, check-ins, groups, members, load assignments, scan logs, and notifications.
## 35.8 Offline-First Support
QR tokens are designed for offline validation. Scans, group creation, and membership confirmation all work without internet.
### Offline Sync Algorithm
## 35.9 Security Considerations
QR tokens are sensitive identity artifacts. Security controls prevent forgery, rotation, and abuse.
### Lost Phone Protocol (numItem)
Athlete realizes phone lost, opens SkyLara on another device (browser/tablet)
Tap “Security” → “Revoke All Tokens”
System sends confirmation code to registered email
Athlete enters code → all QR tokens invalidated immediately
Backend marks all qr_tokens for athlete as is_active=false, logs incident
Athlete can regenerate new permanent QR (in app)
DZ staff alerted: if lost token scanned, log flagged + manual review
## 35.10 Brutal Honesty
Real constraints, limitations, and honest assessment of QR + group manifest feasibility.
Sunlight scanning fails: QR codes degrade in direct sunlight above 100k lux. Gate tablets + mobile phones both struggle. Workaround: printed backup manifest or manual tablet entry. ROI: only if gate staff use shaded awning or indoor pre-gate.
Partial group fitting is NP-hard: assigning groups to 2+ aircraft while balancing CG, weight, exit order, and separate landing zones is combinatorial. Greedy algorithm works 90% of the time; edge cases require manual DZ staff override. Real cost: 10-15 min per complex group on busy days.
Stale recurring group templates: Captain sets up weekly RW group, then forgets to update member list. System sends 5 notifications before someone notices missing members. Mitigation: weekly “refresh” email to captain, max 2 weeks stale before template expires.
International license verification is manual: USPA, NZPF, FAI, EASA all use different cert formats. No API to verify license live. Dropzone staff must cross-check against paper cert or trusted registry. QR token contains cert_level (cached from athlete profile), but initial verification is manual DZ review.
Camera QR fails outdoors: QR codes on camera rigs (printed rig tags) degrade after 3 jumps in UV. Lamination helps but cost is $1-2 per rig. Digital rig QR in app is better but requires jumper to have phone.
Experienced jumpers resist QR: “I’ve been jumping 30 years, I don’t need an app.” QR adoption requires culture shift + staff pushing adoption. First 3 months slow, compliance hits 70% by month 6, hits 95%+ by month 12 at active DZs.
ROI depends on volume: Single-DZ dropzone (50 jumps/day) saves 2-3 staff hours/day on manifest. Multi-DZ franchise (200+ jumps/day across 4 sites) saves 10-15 hours/day + enables dynamic load balancing. Small DZ: marginal ROI; large franchise: strong ROI.
Notification fatigue: 10+ group events (created, member joined, validation fail, accepted, aircraft change, exit order, complete) = 10+ notifications per jump day. Jumpers tune out, miss critical updates. Mitigation: opt-in channels (push on, SMS off, email digest only) and smart batching (batch 5 events into 1 nightly email).
Offline deduplication is tricky: Member confirms group on phone (offline), sync queues action, but internet returns 409 (already confirmed on web). App must detect, mark synced, move on. Race conditions happen; requires idempotent API + careful testing. Edge cases: 5% of syncs have conflict.
Mobile-first needs field testing: Tablet at gate works great indoors. Outdoors in sun, wind, with gloves? Touchscreen fails. Staff default to paper backup manifest. Real solution: rugged Android tablet ($800), case ($100), and training. App is bonus, not replacement.
### Implementation Notes
Chapter 35 is production-ready if:
HMAC secret key is 256 bits, rotated monthly, stored in AWS Secrets Manager
Tablet gate hardware is ruggedized (Honeywell or Zebra), not consumer iPad
Offline sync tested end-to-end (kill network, create group, sync, verify DB)
Staff training includes: QR scanning workflow, error states, manual fallback, emergency revocation
A/B test with 1 DZ (50 jumps/day) for 4 weeks before rollout to franchise

| Document Type | Retention Period | Legal Authority | Responsible Role |
| --- | --- | --- | --- |
| Liability Waivers | 7 years post-jump | State tort law, contract law | DZ Manager |
| Pilot Logbooks | Lifetime (pilot ownership) | FAA Part 61 | Pilot |
| Aircraft Registration | Duration of ownership | FAA Form 8050-1 | DZ Owner |
| Medical Certificates | 6-36 months active | FAA Part 67 | Pilot |
| Maintenance Logs | 7 years | FAA Part 43 | Maintenance Lead |
| Incident Reports | 7 years minimum | USPA, FAA, Insurance | Safety Officer |
| Insurance Policies | 7 years post-expiry | State insurance code | DZ Manager |
| Compliance Records | Per jurisdiction reqs | Multiple | Compliance Officer |
| Employee Records | 3 years post-termination | Labor law, Tax | HR Manager |
| Gear Service Records | Lifetime of equipment | Manufacturer, FAA | Rigger |

| Waiver Type | Jurisdiction | Guardian Required | Re-sign Frequency | Legal Authority |
| --- | --- | --- | --- | --- |
| Tandem Jump | All | If minor | Annual or version change | Contract law |
| AFF (Accelerated Free Fall) | All | If minor | Per-level or annual | Sport liability |
| Experienced Jumper | All | No | Annual or version change | Sport liability |
| Minor (under 18) | All | Yes, in-person | Before each jump | Parental authority |
| Spectator | All | If minor | Per-visit | Premises liability |
| Media Release & Photo | All | If minor | Per-event | Publicity rights |

| // WaiverValidationService.ts interface WaiverSignature {   waiver_id: string;   signatory_id: string;   timestamp_utc: string;   geolocation: { latitude: number; longitude: number; accuracy_meters: number };   device_fingerprint: string;   ip_address: string;   tsa_signature: string;   signature_image: string; // base64 encoded   terms_hash: string; }  async function validateWaiverSignature(sig: WaiverSignature): Promise<boolean> {   // Verify TSA timestamp authority   const tsaValid = await verifyTimestampAuthority(sig.tsa_signature);   if (!tsaValid) return false;    // Verify geolocation within DZ bounds (±50m)   const geoValid = await checkDZGeofence(sig.geolocation, sig.dropzone_id);   if (!geoValid) return false;    // Verify waiver text hash matches active version   const versionValid = await compareWaiverHash(sig.waiver_id, sig.terms_hash);   if (!versionValid) return false;    // Reconstruct crypto chain: signature(data || previous_sig)   const chainValid = await verifyCryptoChain(sig);   return chainValid; }  async function enforceFreshWaiver(jumper_id: string, activity_type: string): Promise<void> {   const latest = await getLatestWaiverSignature(jumper_id, activity_type);   const daysOld = (Date.now() - latest.timestamp_utc.getTime()) / (1000 * 60 * 60 * 24);   const maxDays = activity_type === "tandem" ? 365 : 730;    if (daysOld > maxDays) {     throw new Error("Waiver expired—must re-sign before manifesting");   } } |
| --- |

| Document Type | Validation Rules | Authority Source | Check Frequency |
| --- | --- | --- | --- |
| Medical Certificate | Valid date check, category verification | FAA AME database (private access) | Daily auto-check |
| Type Rating | Match aircraft type, issue date verification | FAA IACRA system or pilot report | Upon aircraft assignment |
| Annual Inspection | Date within 12 months, sign-off present | Aircraft maintenance logs | Weekly auto-audit |
| Airworthiness Directive | All active ADs compliance verified | FAA AD Search database | Monthly batch check |
| Insurance Policy | Current coverage, liability limits, endorsements | Insurance provider API or certificate | Weekly refresh |
| Maintenance Log | All actions logged, no gaps, parts traceable | Internal maintenance database | Real-time |
| Background Check | Jurisdiction-specific requirements, recency | Third-party screening service | Annual or per-hire |

| // IncidentReportService.ts interface IncidentReport {   incident_id: string;   severity: 1 | 2 | 3 | 4;   incident_type: string;   jumper_id: string;   jump_id: string;   aircraft_id: string;   instructor_id: string | null;   reported_by_id: string;   description: string;   photos: { url: string; timestamp: string; geo: Point }[];   witness_statements: { name: string; contact: string; statement: string; signature: string }[];   gear_impound: { equipment_type: string; custody_chain: string[] }[];   investigation_status: "open" | "assigned" | "in_progress" | "closed";   closed_at: string | null;   findings: string; }  async function classifyIncident(report: IncidentReport): Promise<number> {   if (report.incident_type === "fatality") return 1;   if (report.incident_type === "serious_injury") return 2;   if (report.incident_type === "injury_medical") return 3;   return 4; }  async function notifyAuthorities(report: IncidentReport): Promise<void> {   const severity = await classifyIncident(report);      if (severity === 1) {     await notifyUSPA(report);     await notifyFAA(report);     await notifyLocalLE(report);     await notifyInsurance(report);   } else if (severity === 2) {     await notifyLocalAuthority(report);     await notifyInsurance(report);   } } |
| --- |

| Severity | Injury Level | Required Actions | Time Limit | Reporting Agencies |
| --- | --- | --- | --- | --- |
| 1 | Fatality | Full investigation, gear impound, authority notification | 1 hour | USPA, FAA, LE, Coroner |
| 2 | Hospitalization | Investigation started, forensic rigger, insurance notified | 4 hours | Local Authority, Insurance |
| 3 | Medical attention | Report filed, incident tracked, no external notification | 24 hours | Internal, Insurance |
| 4 | No injury or near-miss | Log entry only, no special protocol | Administrative | Internal log |

| Jurisdiction | Key Regulations | Verification Method | Update Frequency |
| --- | --- | --- | --- |
| US FAA | 14 CFR Part 105, medical 8320-13 | IACRA system + manual audit | Quarterly |
| EU EASA | Regulation 2018/395, medical EASA Form | National authority lookup (varies) | Biannual |
| UK CAA | Air Navigation Order, CAA-specific med | CAA lookup, BPA cross-check | Quarterly |
| UAE GCAA | UAE Civil Aviation Regulations | Manual + DZ operator confirmation | Annual |
| USPA Standards | SIM 6-1 through 6-10, Rigging Sands | USPA database API | Monthly |
| Insurance Requirements | Liability limits, coverage types | Insurance certificate review | Biannual |

| interface AuditLogEntry {   audit_id: string;   audit_chain_hash: string; // SHA256(this_entry || previous_entry.audit_chain_hash)   timestamp_utc: string; // ISO 8601, server time   user_id: string;   device_id: string;   ip_address: string;   user_agent: string;   action_type: string; // "MANIFEST_JUMPER", "REFUND_PAYMENT", etc.   entity_type: string; // "jumper", "load", "payment", "incident"   entity_id: string;   before_state: Record<string, unknown>; // Full JSON snapshot before change   after_state: Record<string, unknown>; // Full JSON snapshot after change   reason_code: string | null; // Why the change (e.g., "safety_override", "customer_request")   reason_notes: string | null;   severity: "info" | "warn" | "critical";   dropzone_id: string; // Tenant isolation } |
| --- |

| async function getEntityAuditTrail(entity_type: string, entity_id: string) {   const entries = await db.query(     "SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY timestamp_utc ASC",     [entity_type, entity_id]   );    const trail = [];   for (const entry of entries) {     const diff = calculateJsonDiff(entry.before_state, entry.after_state);     trail.push({       timestamp: entry.timestamp_utc,       user: entry.user_id,       action: entry.action_type,       reason: entry.reason_notes,       changes: diff     });   }   return trail; } |
| --- |

| Environment | DEBUG | INFO | WARN | ERROR | CRITICAL |
| --- | --- | --- | --- | --- | --- |
| Development | Enabled | Enabled | Enabled | Enabled | Enabled |
| Staging | Disabled | Enabled | Enabled | Enabled | Enabled |
| Production | Disabled | Sampled (5%) | Enabled | Enabled | Enabled |
| Post-Incident | Enabled | Enabled | Enabled | Enabled | Enabled |

| // AuditService.ts async function createAuditEntry(   action_type: string,   entity_type: string,   entity_id: string,   before_state: Record<string, unknown>,   after_state: Record<string, unknown>,   context: AuditContext ): Promise<void> {   // Calculate cryptographic hash chain   const previous = await getPreviousAuditEntry(context.dropzone_id);   const chainHash = crypto.createHash("sha256")     .update(JSON.stringify({ action_type, entity_type, entity_id, after_state }) + previous.audit_chain_hash)     .digest("hex");    const entry: AuditLogEntry = {     audit_id: generateUUID(),     audit_chain_hash: chainHash,     timestamp_utc: new Date().toISOString(),     user_id: context.user_id,     device_id: context.device_id,     ip_address: context.ip_address,     action_type,     entity_type,     entity_id,     before_state,     after_state,     reason_code: context.reason_code || null,     reason_notes: context.reason_notes || null,     severity: determineSeverity(action_type),     dropzone_id: context.dropzone_id   };    await db.insert("audit_logs", entry);   await emitAuditEvent(entry); // Alert on critical actions }  async function reconstructTimeline(incident_id: string): Promise<TimelineEvent[]> {   const incident = await db.query("SELECT jump_id FROM incidents WHERE id = ?", [incident_id]);   const jump_id = incident.jump_id;    // Fetch all audit entries related to this jump   const entries = await db.query(     "SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp_utc ASC",     [jump_id]   );    const timeline = entries.map(e => ({     time: e.timestamp_utc,     action: e.action_type,     user: e.user_id,     changesSummary: JSON.stringify(calculateJsonDiff(e.before_state, e.after_state))   }));    return timeline; }  async function verifyChainIntegrity(from_timestamp: string, to_timestamp: string): Promise<boolean> {   const entries = await db.query(     "SELECT * FROM audit_logs WHERE timestamp_utc BETWEEN ? AND ? ORDER BY timestamp_utc ASC",     [from_timestamp, to_timestamp]   );    for (let i = 1; i < entries.length; i++) {     const expected = crypto.createHash("sha256")       .update(JSON.stringify(entries[i]) + entries[i - 1].audit_chain_hash)       .digest("hex");     if (expected !== entries[i].audit_chain_hash) {       return false; // Tampering detected     }   }   return true; } |
| --- |

| Event Type | Category | Example | Severity | Retention |
| --- | --- | --- | --- | --- |
| MANIFEST_JUMPER | Operational | Jumper added to load | info | 7 years |
| CANCEL_MANIFEST | Operational | Jumper removed from load | info | 7 years |
| PAYMENT_REFUND | Financial | Refund issued to customer | warn | 7 years |
| WAIVER_SIGNATURE_BYPASS | Safety | Currency check overridden by DZ owner | critical | 7 years |
| GEAR_SWAP | Safety | Parachute reassigned after inspection | info | 7 years |
| INCIDENT_CREATED | Safety | Incident report filed | critical | 7 years |
| WIND_HOLD_TRIGGERED | System | Automated ground stop due to weather | warn | 7 years |
| API_ERROR_500 | System | Unhandled exception in payment processor | error | 90 days |
| DB_CONNECTION_POOL_EXHAUSTED | System | Database connection timeout | critical | 90 days |
| UNAUTHORIZED_ACCESS_ATTEMPT | Security | Invalid API key used | critical | 2 years |

| Data Class | Examples | Retention | Deletion | Encryption | GDPR Handling |
| --- | --- | --- | --- | --- | --- |
| PII (Personal Identifiable) | Name, email, phone, passport, SSN | Until contract ends, then 30 days | On request (right-to-erasure) | At-rest + in-transit | Subject to erasure unless legal hold |
| Sensitive (Health/Financial) | Medical cert, bank account, incident details | 7 years (legal requirement) | Cannot delete if incident/lawsuit | Encrypted, access logged | Requires consent, limited processing |
| Operational | Jump logs, load assignments, payments | 7 years (audit compliance) | Cannot delete | Encrypted at-rest | Anonymize PII after 2 years |
| Public | Pricing, instructor bios, safety records | Indefinite | At DZ’s discretion | Standard HTTPS | No special handling |

| CREATE TABLE documents (   document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,   dropzone_id BIGINT UNSIGNED NOT NULL,   document_type VARCHAR(50) NOT NULL, -- "waiver", "incident", "pilot_medical", etc.   entity_type VARCHAR(50) NOT NULL, -- "jumper", "aircraft", "dz"   entity_id BIGINT UNSIGNED NOT NULL,   title VARCHAR(255) NOT NULL,   s3_key VARCHAR(500) NOT NULL UNIQUE,   content_hash VARCHAR(64) NOT NULL, -- SHA256 for integrity check   file_size_bytes BIGINT UNSIGNED NOT NULL,   mime_type VARCHAR(100),   uploaded_by_id BIGINT UNSIGNED NOT NULL,   uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   expires_at TIMESTAMP NULL,   status ENUM('draft', 'review', 'approved', 'active', 'expired', 'archived') NOT NULL DEFAULT 'draft',   version_number INT UNSIGNED NOT NULL DEFAULT 1,   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,   FOREIGN KEY (dropzone_id) REFERENCES dropzones(dropzone_id),   FOREIGN KEY (uploaded_by_id) REFERENCES users(user_id),   UNIQUE KEY (entity_type, entity_id, document_type, version_number),   INDEX idx_type_status (document_type, status),   INDEX idx_expires (expires_at) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; |
| --- |

| Event Category | Examples | Typical Subscribers | Latency Requirement |
| --- | --- | --- | --- |
| Operational | jump_manifested, load_closed, aircraft_assigned | Scheduling engine, notification service, reporting | < 2s |
| Safety | incident_reported, wind_hold_triggered, gear_expired | Safety officer alert, operations halt, insurance notification | < 100ms |
| Weather | metar_updated, wind_speed_changed, visibility_poor | Load hold system, forecast updates, UI refresh | < 5s |
| Financial | payment_processed, refund_issued, invoice_created | Accounting sync, customer notification, tax reporting | < 30s |
| Notification | send_email, send_sms, push_notification | Third-party providers (Twilio, FCM), logging | < 10s |

| USER ACTION / SYSTEM EVENT          |          v    EVENT VALIDATION    (Schema, version)          |     _____|_____    |   |   |    v   v   v EventBus Topics    |   |   |    |___|___|        |    ____|____   |         |   v         v SUBSCRIBERS  DLQ CHECKER (run in      (retry failures,  parallel)    manual review) |
| --- |

| Activity | Max Wind (knots) | Hold (wind >= X) | Cancel (wind >= X) | Gust Threshold |
| --- | --- | --- | --- | --- |
| Tandem Jump | 14 | 14 | 18 | +7kt above average |
| Student AFF | 12 | 12 | 16 | +6kt above average |
| Experienced Jumper | 25 | 25 | 30 | +8kt above average |
| Wingsuit Jump | 18 | 18 | 22 | +6kt above average |
| Accuracy Landing | 8 | 8 | 12 | +3kt above average |
| Canopy Piloting | 10 | 10 | 15 | +4kt above average |

| async function evaluateWindThreshold(wind_speed_kt: number, activity: string) {   const config = WIND_LIMITS[activity];   const current_status = await getWeatherHoldStatus(activity);    if (current_status === "OPERATING") {     if (wind_speed_kt >= config.HOLD_THRESHOLD) {       await triggerWeatherHold(activity);     }   } else if (current_status === "HOLD") {     if (wind_speed_kt < config.HOLD_THRESHOLD - 2) {       await resumeOperations(activity);     }   } } |
| --- |

| async function handleNoShow(load_id: string, jumper_id: string): Promise<void> {   // Remove from current load   await db.update("load_assignments", { status: "no_show" }, { jumper_id, load_id });    // Get next person on waitlist   const waitlist = await db.query(     "SELECT * FROM load_waitlist WHERE load_id = ? ORDER BY position ASC LIMIT 1",     [load_id]   );    if (waitlist.length > 0) {     const next_jumper = waitlist[0];     await db.insert("load_assignments", {       load_id,       jumper_id: next_jumper.jumper_id,       status: "manifested"     });     await notifyJumper(next_jumper.jumper_id, "You’ve been promoted from waitlist");   }    // Initiate refund   const payment = await db.query("SELECT * FROM payments WHERE load_id = ? AND jumper_id = ?", [load_id, jumper_id]);   if (payment.length > 0 && payment[0].status === "completed") {     await processRefund(payment[0].payment_id, "no_show_automatic");   } } |
| --- |

| async function optimizeLoadSchedule(dz_id: string): Promise<void> {   const next_4_hours = await getScheduledLoads(dz_id, 4);    for (let i = 0; i < next_4_hours.length; i++) {     for (let j = i + 1; j < next_4_hours.length; j++) {       const load1 = next_4_hours[i];       const load2 = next_4_hours[j];        const merge_score = calculateMergeScore(load1, load2);       if (merge_score > 50) {         const merged = await mergeLoads(load1.load_id, load2.load_id);         if (merged) {           const manifest = await db.query(             "SELECT jumper_id FROM load_assignments WHERE load_id IN (?, ?)",             [load1.load_id, load2.load_id]           );           for (const assignment of manifest) {             await notifyJumper(assignment.jumper_id, "Load rescheduled: merged with another load");           }         }       }     }   } } |
| --- |

| Notification Type | Priority | Channels | Throttle | Example |
| --- | --- | --- | --- | --- |
| Wind hold triggered | 1 (Critical) | Push, SMS | 0 min | GROUND STOP: Wind 16kt—ops halted |
| Incident reported | 1 (Critical) | Push, SMS, Email | 0 min | Incident logged—safety review underway |
| Load assigned | 3 (Medium) | Push, SMS | 5 min | You’re manifested on Load 5 at 10:30 |
| Weather improving | 4 (Low) | Push, In-app | 30 min | Wind dropping—ops resume in 15 min |
| No-show penalty | 2 (High) | Email, In-app | 1 min | No-show fee charged—see terms |
| Jump photo ready | 4 (Low) | Push, Email | 0 min | Your jump photos are ready to view |
| Waiver reminder | 4 (Low) | Email | 24 hours | Your waiver expires in 30 days—re-sign now |

| Safety Trigger | Condition | Severity | Response Action | User Notification |
| --- | --- | --- | --- | --- |
| Wind exceeds limit | Wind >= CANCEL_THRESHOLD | Critical | Cancel all open loads, stop new bookings | Immediate SMS + push |
| Gear expiry | Reserve last packed > 180 days ago | High | Block manifest, ground all assigned jumpers | In-app warning |
| Medical expired | Pilot medical date < today | High | Remove from schedule, cancel upcoming assignments | Email + SMS |
| Weight overage | Total weight > aircraft max | Medium | Manifest system error, require aircraft swap | In-app validation error |
| Incident severity >= 3 | Injury reported with hospitalization | Critical | Notify authorities, pause similar activity | Incident alert email |

| async function manifestGroupSaga(group_id: string, jumper_ids: string[]): Promise<void> {   const saga_id = generateUUID();   const compensation_stack = [];    try {     // Step 1: Validate waivers     const waivers_valid = await validateAllWaivers(jumper_ids);     if (!waivers_valid) throw new Error("Invalid waivers");     compensation_stack.push(() => releaseWaiverHolds(jumper_ids));      // Step 2: Check instructor availability     const instructor = await findAvailableInstructor(4);     if (!instructor) throw new Error("No instructor available");     compensation_stack.push(() => releaseInstructor(instructor.id));      // Step 3: Reserve aircraft     const aircraft = await reserveAircraft(4, instructor.aircraft_type);     if (!aircraft) throw new Error("No aircraft available");     compensation_stack.push(() => releaseAircraftReservation(aircraft.id));      // Step 4: Assign loads     const load_assignments = await assignLoadsForGroup(jumper_ids, aircraft.id);     compensation_stack.push(() => undoLoadAssignments(load_assignments));      // Step 5: Confirm     await sendConfirmationEmail(group_id, jumper_ids);      await logSagaCompletion(saga_id, "manifest_group_success");   } catch (error) {     while (compensation_stack.length > 0) {       const compensate = compensation_stack.pop();       try { await compensate(); } catch (e) { console.error("Compensation failed", e); }     }     await logSagaFailure(saga_id, error);     throw error;   } } |
| --- |

| Critical Path | p50 (ms) | p95 (ms) | p99 (ms) | SLA Target |
| --- | --- | --- | --- | --- |
| Load manifest | 200 | 800 | 2000 | < 2s p99 |
| Payment process | 800 | 5000 | 30000 | < 30s p99 |
| Incident report | 50 | 200 | 500 | < 100ms p99 |
| Weather hold trigger | 100 | 500 | 2000 | < 5s p99 |
| Notification delivery | 500 | 2000 | 10000 | < 10s p99 |

| CREATE TABLE events (   event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,   dropzone_id BIGINT UNSIGNED NOT NULL,   event_type VARCHAR(100) NOT NULL,   category ENUM('operational', 'safety', 'weather', 'financial', 'notification') NOT NULL,   aggregate_type VARCHAR(50),   aggregate_id BIGINT UNSIGNED,   payload JSON NOT NULL,   source_user_id BIGINT UNSIGNED,   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   processed_at TIMESTAMP NULL,   processing_status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',   error_message TEXT,   FOREIGN KEY (dropzone_id) REFERENCES dropzones(dropzone_id),   INDEX idx_status (processing_status),   INDEX idx_type (event_type) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; |
| --- |

| Region | Primary Authority | Key Requirements | Sport Org |
| --- | --- | --- | --- |
| United States | FAA | 14 CFR Part 105 compliance | USPA |
| European Union | EASA | National transposition rules | National FAs |
| United Kingdom | CAA | CAA regulations + BPA | BPA |
| Australia | CASA | Civil Aviation Regulations | APF |
| MENA Region | National CAAs | Varies by country | Varies |

| FAA Part 105 Requirement | SkyLara Coverage | Status | Notes |
| --- | --- | --- | --- |
| NOTAM filing 1 hour prior | Covered via DZ integration | Complete | System queues filings |
| Pilot certification validation | Covered via aircraft database | Complete | Requires manual entry |
| Aircraft approval verification | Covered via equipment registry | Complete | Dropzone must maintain |
| Jump altitude restrictions | Partially covered | Incomplete | Requires manual monitoring |
| Night jump authorization | Not covered | Missing | Manual process required |
| Emergency procedure docs | Not covered | Missing | Must store separately |
| Incident reporting | Covered via incident module | Complete | Submits to NTSB when required |

| Country | Authority | Recognition of Foreign Certs | Equipment Standard | Insurance Requirement |
| --- | --- | --- | --- | --- |
| France | DGAC + FFP | Limited USPA recognition | EN 12314-2 | Mandatory liability |
| Germany | LBA + DHV | Limited USPA recognition | EN standards | Mandatory liability |
| Spain | AESA + FAP | Limited USPA recognition | EN standards | Mandatory liability |
| Switzerland | BAZL + SPA | Bilateral agreements | EN standards | Mandatory liability |
| United Kingdom | CAA + BPA | Historical USPA ties | BS/EN standards | Mandatory liability |

| Country | Regulatory Status | Airspace Restrictions | Cultural Requirements | Insurance Model |
| --- | --- | --- | --- | --- |
| UAE | Formal regulation via GCAA | Military zones monitored | Gender-aware briefings | Commercial carriers |
| Saudi Arabia | Informal with mil coordination | Extensive military airspace | Conservative dress code | Government backed |
| Jordan | Less formal, DZ-managed | Strategic airspace protected | Respectful scheduling | Local underwriters |
| Egypt | Emerging regulation | Military airspace sensitivity | Arabic language required | State-controlled pools |
| Tunisia | Minimal formal regulation | Regional airspace limits | Cultural accommodation | Local carriers |

| Operation Phase | SkyLara Capability | Coverage Level | Manual Override Required | Failure Risk |
| --- | --- | --- | --- | --- |
| Pre-opening preflight | Load planning only | Partial | Yes—aircraft checks | High if DZ staff unavailable |
| Customer arrival | Waiver + briefing checklist | Partial | Yes—briefing content | Medium—waivers cached |
| AFF progression | Tracking + manifest | Partial | Yes—wind decisions | Medium—instructor judgment calls |
| Fun jumper self-manifest | License + load assignment | Partial | Yes—group dynamics | Low—straightforward logic |
| Weather hold decision | Display METAR only | Minimal | Yes—safety officer call | High—critical decision |
| Afternoon load stacking | Load sequencing | Partial | Yes—manual adjustment | Medium—complex logistics |
| Incident response | Immediate notification | Partial | Yes—medical judgment | High—life safety critical |
| End-of-day reconciliation | Load counts only | Minimal | Yes—cash counting | High—financial reconciliation |

| Safety Category | Identified Gap | Severity | Current Mitigation | Risk Level |
| --- | --- | --- | --- | --- |
| Emergency profiles | Offline sync frequency | Critical | Aggressive caching | High |
| Equipment tracking | Non-digital gear validation | Critical | Manual inspection | High |
| Student supervision | Instructor ratio enforcement | Critical | Manual assignment | High |
| Wind hold decisions | Auto-hold triggers | High | Safety officer judgment | High |
| Camera flyer selection | Minimum jump validation | High | Manifest staff vetting | Medium |
| Medical authorization | Real-time contraindication check | Critical | Waiver review | Medium |
| Incident response time | System notification latency | High | Manual radio alert | Medium |
| Bailout decision support | Historical jump analysis | High | Memory-based | High |

| Risk Category | Failure Scenario | Likelihood | Impact | Mitigation Status |
| --- | --- | --- | --- | --- |
| Internet outage | Cloud services unavailable > 30 min | Medium | Critical—new registrations halt | Partial—offline mode exists |
| Power failure | Entire DZ without electricity | Low | Critical—all operations halt | Minimal—no UPS planned |
| Staff absence | Manifest operator unavailable | Medium | High—paper fallback only | None—depends on person |
| Scaling failure | 50+ dropzones simultaneous load | Low now/High later | Critical—performance degrades | None—not architected |
| Payment system lockup | Card processor timeout during rush | Low | High—revenue capture lost | Partial—offline fallback |
| GPS tracker failure | Off-landing tracking unavailable | Low | Medium—delays ground crew | Minimal—no fallback |
| Database corruption | Sync conflict cascades to data loss | Low | Critical—historical audit trail | Minimal—recovery untested |
| Authentication bypass | Session spoofing or token theft | Medium | High—unauthorized access | Minimal—JWT validation only |

| Integration | Service | Failure Impact | Fallback Strategy | Implementation Status |
| --- | --- | --- | --- | --- |
| Weather data | OpenWeather / AVWX | Cannot assess conditions | Manual TAF/METAR review | Partial—API exists |
| Payment processing | Stripe | Cannot charge cards | Offline intent recording | Complete |
| Emergency SMS | Twilio | Cannot alert staff | In-app notification + radio | Partial—SMS secondary |
| Off-landing GPS | Google Maps | Cannot track location | Radio + manual search | Partial—maps cached |
| NOTAM filing | FAA NOTAM Search API | Cannot file notices | Manual phone filing | Partial—manual backup |
| Equipment database | Third-party manufacturer APIs | Cannot verify equipment | Manual serial lookup | Minimal—not integrated |
| License verification | Sport org APIs | Cannot auto-validate | Manual license review | Minimal—manual only |
| Payment webhook | Stripe webhooks | Incomplete reconciliation | Manual ledger review | Partial—retry logic |

| Feature Category | Missing Capability | Type | Priority | Effort |
| --- | --- | --- | --- | --- |
| Safety management | Real-time cert tracking | Safety-critical | High | Medium |
| Safety management | Automated wind-hold triggers | Safety-critical | High | Medium |
| Safety management | Incident trending + analysis | Safety-critical | Medium | High |
| Revenue optimization | Tiered pricing + discounts | Revenue-critical | High | Low |
| Revenue optimization | Group booking workflows | Revenue-critical | Medium | Medium |
| Revenue optimization | Financial reporting by service | Revenue-critical | High | Medium |
| Scheduling | Aircraft utilization optimizer | Operational | Medium | High |
| Equipment | Automated equipment history | Operational | Medium | High |
| Geography | Beach DZ tidal constraints | DZ-specific | Low | Low |
| Geography | Mountain DZ altitude/terrain | DZ-specific | Low | Medium |
| Geography | Desert DZ weather patterns | DZ-specific | Low | Low |
| Geography | Island DZ ferry scheduling | DZ-specific | Low | Medium |

| State | Manifest Tablets | Mobile Clients | Local Authority | Cloud |
| --- | --- | --- | --- | --- |
| Online + cloud available | Real-time sync, optimistic UI | Real-time sync, optimistic UI | Sync to cloud | Authoritative source |
| Online + cloud down | Sync to local authority | Sync to local authority | Queue for cloud | Unreachable |
| Offline + local authority available | Sync to local authority | Sync to local authority | Sync to cloud when up | Unreachable |
| Offline + no authority | Local only, queue mutations | Local only, queue mutations | N/A | Unreachable |
| Offline + syncing | Optimistic, queue updates | Optimistic, queue updates | Background sync | Background sync |

| Feature | Offline Capability | Degraded Behavior | Sync Strategy | Data Currency |
| --- | --- | --- | --- | --- |
| Manifest board | Full read + write | Local updates only | Batch sync on reconnect | Immediate |
| Check-in scanning | Full | QR verification against local cache | Batch sync on reconnect | Immediate |
| Load status FSM | Full | Local state only | Batch sync on reconnect | Immediate |
| Emergency profiles | Full read-only | Display cached profiles | Aggressive sync every 30m | Cache age < 30m |
| Incident reporting | Full | Queued for sync | Batch sync on reconnect | Queued |
| Cash payments | Full | Record intent locally | Sync on reconnect | Immediate local |
| Card payments | Partial | Record intent, cannot process | Retry on reconnect | Pending authoriz. |
| Weather data | Cached only | Display last known METAR | Refresh on reconnect | Cache age variable |
| NOTAM filing | None | Reminder to file manually | Queue for manual retry | N/A |
| License verification | Cached only | Check against cached licenses | Refresh on reconnect | Cache age variable |

| // TypeScript: LocalDatabaseSchema definition interface LoadRecord {   id: string;   created_at: number;   status: "planning" | "manifested" | "boarding" | "departed" | "landed";   aircraft_id: string;   altitude: number;   dispatched_at?: number;   landed_at?: number;   notes: string;   vector_clock: Record<string, number>; }  interface LoadSlotRecord {   id: string;   load_id: string;   position: number;   jumper_id?: string;   instructor_id?: string;   camera_flyer: boolean;   assignment_time: number;   vector_clock: Record<string, number>; }  interface JumperRecord {   id: string;   first_name: string;   last_name: string;   email: string;   phone: string;   license_level: string;   jump_count: number;   updated_at: number;   vector_clock: Record<string, number>; }  interface LocalDatabase {   loads: Table<LoadRecord>;   load_slots: Table<LoadSlotRecord>;   jumpers: Table<JumperRecord>;   instructors: Table<InstructorRecord>;   emergency_profiles: Table<EmergencyProfileRecord>;   waivers: Table<WaiverRecord>;   gear_assignments: Table<GearAssignmentRecord>;   aircraft: Table<AircraftRecord>;   outbox: Table<OutboxMutationRecord>;   sync_metadata: Table<SyncMetadataRecord>; } |
| --- |

| Entity | Local Storage | Cloud Only | Sync Frequency | Offline Readable |
| --- | --- | --- | --- | --- |
| Load | Active + 24h lookahead | History > 30 days | Batch sync | Yes |
| Load slot | Unassigned + active | Archived | Batch sync | Yes |
| Jumper | Registered + tandem today | History > 30 days | Hourly refresh | Yes |
| Instructor | Active roster | History + inactive | Hourly refresh | Yes |
| Emergency profile | All profiles | None—replicated locally | Hourly refresh | Yes |
| Waiver | Today + yesterday | History > 30 days | Daily refresh | Yes |
| Gear assignment | Current jump | History > 24h | Batch sync | Yes |
| Aircraft | Active roster | Maintenance history | Daily refresh | Yes |
| Incident | Draft only | Submitted incidents | On submit sync | Yes (draft) |
| Payment | Intent recorded | Reconciled ledger | Batch sync | Yes (intent) |

| // TypeScript: Sync protocol flow interface SyncPullRequest {   client_id: string;   last_sync_timestamp: number;   requested_entities: string[]; }  interface SyncPullResponse {   mutations: SyncMutation[];   server_timestamp: number;   vector_clock: Record<string, number>; }  interface SyncMutation {   id: string;   entity_type: string;   operation: "create" | "update" | "delete";   entity_id: string;   values: Record<string, any>;   timestamp: number;   client_id: string;   vector_clock: Record<string, number>;   conflict_resolution_applied?: string; }  interface SyncPushRequest {   client_id: string;   mutations: SyncMutation[];   device_info: {     type: "tablet" | "phone" | "authority";     offline_duration_ms: number;   }; }  interface SyncPushResponse {   acknowledged_mutations: string[];   rejected_mutations: { id: string; reason: string }[];   server_timestamp: number;   vector_clock: Record<string, number>; } |
| --- |

| // TypeScript: Conflict resolution strategy selection type ConflictStrategy =    | "server_authoritative"   | "last_write_wins"   | "field_merge"   | "manual_review";  const CONFLICT_STRATEGIES: Record<string, ConflictStrategy> = {   "emergency_profile": "server_authoritative",   "instructor_certification": "server_authoritative",   "waiver_status": "server_authoritative",   "load_status": "last_write_wins",   "load_notes": "last_write_wins",   "user_profile": "last_write_wins",   "load_slots": "field_merge",   "instructor_schedule": "field_merge",   "incident_data": "manual_review", };  function resolveConflict(   entity_type: string,   client_version: any,   server_version: any,   client_timestamp: number,   server_timestamp: number ): { resolved_value: any; strategy_applied: ConflictStrategy } {   const strategy = CONFLICT_STRATEGIES[entity_type];      if (strategy === "server_authoritative") {     return { resolved_value: server_version, strategy_applied: strategy };   } else if (strategy === "last_write_wins") {     const winner = server_timestamp > client_timestamp ? server_version : client_version;     return { resolved_value: winner, strategy_applied: strategy };   } else if (strategy === "field_merge") {     return { resolved_value: mergeFields(client_version, server_version), strategy_applied: strategy };   } else if (strategy === "manual_review") {     return { resolved_value: null, strategy_applied: "manual_review" };   } } |
| --- |

| Connectivity State | Data Behavior | UI Indicator | Error Handling | Staff Mental Model |
| --- | --- | --- | --- | --- |
| Online + synced | All fresh | Cloud icon filled | None | System is live |
| Online + syncing | Fresh soon | Cloud icon animated | "Syncing changes..." | System is live |
| Online + sync error | Cached with queue | Cloud icon error | "Retry" button | Changes are safe, will sync |
| Offline + recent cache | Cached < 5 min old | Cloud icon outlined | None (implicit) | System works offline |
| Offline + stale cache | Cached > 1 hour old | Stale badge + icon | "Profile may be outdated" | Use with caution |
| Offline + missing cache | Not available | Unavailable state | "Feature unavailable offline" | Must reconnect |
| Reconnecting | Syncing queued changes | Cloud icon animated | None (transparent) | System catching up |

| // TypeScript: Local authority service implementation class LocalAuthorityService {   private db: LocalDatabase;   private http_server: HttpServer;   private cloud_health_check: IntervalHandle;   private cloud_available: boolean = false;   private pending_sync: SyncMutation[] = [];    async start() {     this.http_server = startHttpServer(8080);     this.http_server.post("/sync/push", this.handleClientPush.bind(this));     this.http_server.get("/sync/pull", this.handleClientPull.bind(this));          this.cloud_health_check = setInterval(async () => {       this.cloud_available = await this.checkCloudHealth();       if (this.cloud_available && this.pending_sync.length > 0) {         await this.flushToCloud();       }     }, 30000);   }    private async handleClientPush(req: SyncPushRequest): Promise<SyncPushResponse> {     // Accept mutations from local clients     const acked = await this.db.outbox.bulkAdd(req.mutations);     this.pending_sync.push(...req.mutations);          // If cloud is available, sync immediately     if (this.cloud_available) {       await this.flushToCloud();     }          return { acknowledged_mutations: acked, rejected_mutations: [] };   }    private async flushToCloud() {     const batch = this.pending_sync.splice(0, 100);     const response = await fetch("https://cloud.skylara.io/sync/push", {       method: "POST",       body: JSON.stringify({ mutations: batch, device_id: this.device_id }),     });          if (!response.ok) {       this.pending_sync.unshift(...batch);     }   } } |
| --- |

| Tier | Feature | Offline Behavior | Sync Timing | Dependency |
| --- | --- | --- | --- | --- |
| 1 | Manifest board | Full local FSM | Batch on reconnect | None |
| 1 | Check-in scanning | QR cache lookup | Batch on reconnect | None |
| 1 | Emergency profiles | Offline read, hourly sync | Aggressive 30m | None local |
| 1 | Incident reporting | Full local creation | Batch on reconnect | None |
| 2 | Gear assignment | Offline local only | Batch on reconnect | Offline gear DB |
| 2 | Instructor scheduling | Offline roster only | Batch on reconnect | Offline roster |
| 2 | Cash payments | Intent recording | Batch on reconnect | None |
| 2 | Waiver display | Cached waivers only | Hourly refresh | Cache |
| 3 | Analytics | Unavailable | Online only | Cloud aggregation |
| 3 | New registration | Blocked—show message | Online only | ID verification |
| 3 | Card payments | Intent queued only | Retry on reconnect | Stripe API |
| 3 | Weather data | Cached TAF/METAR | Refresh on reconnect | Weather API |
| 3 | NOTAM filing | Manual reminder queued | Retry on reconnect | FAA API |

| // TypeScript: Sync API contracts // POST /sync/push {   "request": {     "client_id": "tablet-dz-1",     "mutations": [       {         "id": "mutation-uuid-1",         "entity_type": "load",         "operation": "update",         "entity_id": "load-123",         "changes": { "status": "departed", "dispatched_at": 1712513400000 },         "timestamp": 1712513401000,         "vector_clock": { "tablet-dz-1": 45 }       }     ]   },   "response": {     "acknowledged_mutations": ["mutation-uuid-1"],     "rejected_mutations": [],     "server_timestamp": 1712513402000,     "vector_clock": { "server": 1200, "tablet-dz-1": 45 }   } }  // GET /sync/pull?since=1712513000000 {   "mutations": [     {       "id": "mutation-uuid-500",       "entity_type": "jumper",       "operation": "create",       "entity_id": "jumper-999",       "values": { "first_name": "Alice", "license_level": "D" },       "timestamp": 1712513050000,       "client_id": "cloud-api",       "vector_clock": { "server": 1100 }     }   ],   "server_timestamp": 1712513402000,   "vector_clock": { "server": 1200 } } |
| --- |

| Test Scenario | Duration | Success Criteria | Critical Path | Frequency |
| --- | --- | --- | --- | --- |
| Airplane mode | 5 minutes | Manifest board responsive | Read/write ops | Daily |
| Intermittent WiFi | 10 minutes | Queue grows correctly | Retry logic | Daily |
| Extended offline | 4 hours | Sync completes < 30s | Batch processing | Weekly |
| Conflict generation | 20 minutes | Resolution applied correctly | Conflict resolver | Weekly |
| Data integrity | Post-sync | All entities valid | Checksum verification | Every sync test |
| Performance sync | Baseline | Sync 100 mutations in < 30s | Batch limits | Daily |
| Battery drain | 1 hour offline | < 5% drain from sync | Background jobs | Weekly |
| Network failover | Local authority | Seamless switch to authority | Failover logic | Weekly |

| Token Type | Payload (JSON) | Use Case | Lifetime |
| --- | --- | --- | --- |
| Permanent Identity | { athlete_id, name, license, cert_level } | Profile lookup, recurring bookings, global identity | 12 months / rotation on demand |
| Daily Manifest | { athlete_id, dz_id, load_number, aircraft_slot } | Reception check-in, gate verification, load assignment | 24 hours or load completion |
| Booking Anchor | { booking_id, aircraft_id, jumper_slot, group_id } | Payment verification, slot confirmation, manifest integrity | Until jump or 30 days |
| Group Manifest | { group_id, captain_id, manifest_hash, member_count } | One-click group verification, load balancing, group exit order | Until load completion |
| Gear Check Token | { athlete_id, rig_id, packing_date, next_repack } | Offline rig verification, maintenance tracking, rental validation | 30 days / repack cycle |

| HMAC-SHA256(   payload = JSON.stringify({ token_id, athlete_id, dz_id, exp_time, data }),   secret = DZ_HMAC_SECRET_KEY )  // Compact representation: // QRv2::{base64(payload)}.{base64(signature)}  // Offline validation: // 1. Decode payload (no network needed) // 2. Recompute signature with local HMAC secret // 3. Reject if signatures do not match // 4. Check exp_time <= now() + 30s clock skew |
| --- |

| // qr-token-generator.ts import crypto from "crypto"; import QRCode from "qrcode";  interface TokenPayload {   token_id: string;   athlete_id: bigint;   dz_id: bigint;   exp_time: number;   data: Record<string, unknown>; }  export class QRCodeGenerator {   private hmacSecret: Buffer;    constructor(hmacSecret: string) {     this.hmacSecret = Buffer.from(hmacSecret, "base64");   }    generateToken(payload: TokenPayload): string {     const json = JSON.stringify(payload);     const signature = crypto       .createHmac("sha256", this.hmacSecret)       .update(json)       .digest("base64");     return `QRv2::${Buffer.from(json).toString("base64")}.${signature}`;   }    async generateQRDataURL(     payload: TokenPayload   ): Promise<{ token: string; dataUrl: string }> {     const token = this.generateToken(payload);     const dataUrl = await QRCode.toDataURL(token, {       errorCorrectionLevel: "H",       type: "image/png",       width: 300     });     return { token, dataUrl };   }    verifyToken(token: string): TokenPayload | null {     try {       const [, payload, signature] = token.split(".");       const decoded = JSON.parse(         Buffer.from(payload, "base64").toString("utf-8")       );       const expectedSig = crypto         .createHmac("sha256", this.hmacSecret)         .update(JSON.stringify(decoded))         .digest("base64");       if (signature !== expectedSig) return null;       if (decoded.exp_time < Date.now() / 1000) return null;       return decoded;     } catch {       return null;     }   } } |
| --- |

| Workflow | Scanner | Trigger | Error Handling |
| --- | --- | --- | --- |
| Reception Check-In | iPad @ main desk | Athlete arrives (permanent identity QR) | Invalid signature → reject; Waiver missing → flag for update; License expired → offer renewal form |
| Gear Check | Kiosk (tablet or phone) | Gear Check Token from rig tag | Repack date > 30d → block jump; Signature fail → manual verification; Rental past return → flag manager |
| Manifest Gate | Gate tablet (real-time) | Booking Anchor token as athlete boards aircraft | Slot mismatch → re-slot available aircraft; Booking invalid → offer rebooking; Payment failed → offer payment retry |
| Group Manifest | Captain’s phone (offline capable) | One-click manifest send | Member missing → flag captain; Waiver check fails → highlight member name; Payment pending → show amount due |
| Profile Lookup | Athlete’s phone or captain’s phone | Scan another athlete’s QR (team/group booking) | Profile not found → offer manual add; No shared context (DZ, booking) → limit scope; Offline → use cached profile |

| // reception-checkin-flow.ts async function handleReceptionScan(token: string, dz_id: bigint) {   // 1. Verify token signature (offline capable)   const payload = verifyToken(token);   if (!payload) throw new Error("Invalid or expired token");    // 2. Look up athlete (cached + fallback to DB)   const athlete = await athletes.findById(payload.athlete_id);   if (!athlete) throw new Error("Athlete not found");    // 3. Check waiver (most recent for this DZ)   const waiver = await waivers.latestForDZ(payload.athlete_id, dz_id);   if (!waiver?.signed_date) {     return { status: "waiver_required", athlete, next: "present_waiver_form" };   }    // 4. Check payment method on file   const payment = await payments.getPreferred(payload.athlete_id);   if (!payment) {     return { status: "payment_required", athlete, next: "save_card" };   }    // 5. Create check-in session   const session = await checkInSessions.create({     athlete_id: payload.athlete_id,     dz_id,     scanned_at: now(),     status: "checked_in"   });    // 6. Return athlete summary for manifest view   return {     status: "checked_in",     athlete: { id: athlete.id, name: athlete.name, level: athlete.cert_level },     session_id: session.id   }; } |
| --- |

| Group Type | Min Size | Max Size | Aircraft Fit | Rules |
| --- | --- | --- | --- | --- |
| RW (Relative Work) | 2 | 12 | Twin Otter / Caravan | All current AFF or experienced; shared exit interval |
| Freefly | 2 | 6 | Caravan | Min cert: Freefly Level 2; exit altitude 15k+ |
| Angle | 2 | 8 | Caravan | Min: advanced tumbler; camera optional; exit 13k+ |
| Wingsuit | 2 | 6 | Caravan | Min: 200 jumps + wingsuit cert; exit 15k+; separate landing zone |
| Coaching / Jump | 2 | 4 | Any | Min: 1 USPA instructor; others are students or coaching jumpers |
| Tandem + Camera | 3 | 4 | Caravan | Tandem pair + videographer + optional audio tech; harness check required |
| AFF / Formation | 3 | 8 | Caravan | Requires 2+ USPA AFF instructors; levels must be sequential (L1↔L8) |
| CRW | 2 | 3 | Caravan | Min: CRW cert; reserve pack date < 7 days; ground practice logged |

| // group-manifest-submit.ts async function submitGroupManifest(group_id: bigint) {   const group = await groups.findById(group_id);   const members = await groupMembers.findByGroupId(group_id);    // Validate all members confirmed   const unconfirmed = members.filter((m) => m.status !== "confirmed");   if (unconfirmed.length > 0) {     throw new Error(       `${unconfirmed.length} member(s) not confirmed. Ask captain to follow up.`     );   }    // Run 9 validation rules (§35.4)   const result = await validateGroupManifest(group, members);   if (!result.valid) {     return { status: "validation_failed", errors: result.errors };   }    // Suggest aircraft fit & exit order   const fit = await calculateAircraftFit(group, members);   const exitOrder = generateExitOrder(members, group.group_type);    // Create load entry (tentative)   const load = await loads.create({     dz_id: group.dz_id,     aircraft_id: fit.aircraft_id,     group_id: group_id,     manifest_hash: hashGroupMembers(members),     status: "manifest_submitted",     exit_order: exitOrder   });    // Generate Group Manifest QR token   const manifestPayload = {     token_id: randomUUID(),     group_id,     captain_id: group.captain_id,     member_count: members.length,     manifest_hash: load.manifest_hash,     aircraft_id: fit.aircraft_id,     exp_time: Math.floor(Date.now() / 1000) + 86400   };   const { dataUrl } = await qrGenerator.generateQRDataURL(manifestPayload);    return {     status: "manifest_submitted",     load_id: load.id,     qr_code: dataUrl,     aircraft: fit.aircraft_id,     exit_order: exitOrder,     next: "await_gate_confirmation"   }; } |
| --- |

| Rule | Severity | Check | Override Policy |
| --- | --- | --- | --- |
| 1. Waiver Signed | CRITICAL | All members have signed waiver for this DZ | None. Manifest rejected; member must sign. |
| 2. Payment Method | CRITICAL | All members have saved payment method (card, wallet, or credit) | None. Manifest rejected; member must add payment. |
| 3. License Valid | CRITICAL | Certificate level matches activity (AFF Level + instructor for coaching) | DZ Manager can override for airport staff, coaching, or guest jumpers. |
| 4. Currency Match | HIGH | All members’ accounts in same currency (multi-currency pricing not yet supported) | None. System recommends converting to DZ currency. |
| 5. Instructor Assigned | HIGH | Coaching/AFF groups must have min 1 active instructor (not solo) | None. System lists available instructors; captain books. |
| 6. Camera Rig Check | MEDIUM | If camera member: rig < 7 days old, camera cert current, helmet camera working | DZ Manager can override for demo camera. |
| 7. AFF Two-Instructor | CRITICAL | AFF groups Level 1–4 require exactly 2 USPA instructors (per USPA regs) | None. Manifest rejected; find second instructor. |
| 8. Wingsuit Minimums | CRITICAL | All wingsuit members: >= 200 lifetime jumps + current wingsuit cert | DZ Manager can override for documented experienced jumpers (rare). |
| 9. No Students on Wingsuit | HIGH | No Level 1–4 AFF students on wingsuit group (too risky) | None. System offers to move student to separate AFF group. |

| // validation-result.ts interface ValidationResult {   valid: boolean;   rules_passed: number;   rules_failed: number;   errors: Array<{     rule_number: number;     rule_name: string;     severity: "CRITICAL" | "HIGH" | "MEDIUM";     member_id?: bigint;     member_name?: string;     message: string;     override_available: boolean;   }>;   overridable_count: number;   critical_count: number; }  // Example result: {   "valid": false,   "rules_passed": 7,   "rules_failed": 2,   "critical_count": 1,   "errors": [     {       "rule_number": 5,       "rule_name": "Instructor Assigned",       "severity": "HIGH",       "message": "AFF group needs 2 instructors. Found 1.",       "override_available": false     },     {       "rule_number": 2,       "rule_name": "Payment Method",       "severity": "CRITICAL",       "member_id": 5432,       "member_name": "Sarah Chen",       "message": "No payment method on file.",       "override_available": false     }   ] } |
| --- |

| Event | Triggered By | Recipients | Channels |
| --- | --- | --- | --- |
| Group Created | Captain submits + QR generated | All members (invited) | Push + SMS + Email |
| Member Confirmed | Member taps “Join” in app/link | Captain + DZ staff | In-app notification |
| All Members Confirmed | Last member confirms | Captain | In-app + push (go manifest!) |
| Validation Failed | Manifest submission fails rules | Captain + flagged members | Push + SMS (action required) |
| Manifest Accepted | Load confirmed by gate staff | All members + instructor | Push + SMS (load time!) |
| Aircraft Changed | Gate staff updates fit | All members + captain | Push + SMS (new aircraft) |
| Group Cancelled | Captain or staff cancels | All members | Push + Email + SMS |
| Instructor Assigned | DZ system or manual assignment | Instructor + group members | Push + SMS |
| Exit Order Published | After load finalized | All members | Push + in-app notification |
| Jump Complete | Manifest closed after aircraft lands | All members + captain | In-app + email (story/social) |

| Screen / Feature | Online Behavior | Offline Behavior |
| --- | --- | --- |
| My Identity QR (permanent token) | Display token, regenerate yearly or on demand, share to other athletes | Display cached token (synced hourly); show “last updated” timestamp |
| Create Group | Search athletes by name/email, real-time validation rules, suggest aircraft | Add members by QR or name only; validation stored local; sync when online |
| Add Group Members | Scan permanent QR, auto-fill athlete profile, search by name | Scan QR (process offline), manual entry; profiles synced on reconnect |
| Review Group (captain view) | Live member status, validation errors flagged, edit/remove members | Cached member list; edits local; sync when online |
| Submit Manifest | Real-time validation, generate Group Manifest QR, show aircraft fit | Offline validation, generate QR locally, retry send when online |
| Group Manifest QR (captain) | Scannable by gate staff or other captain (read-only), tap to resend | Display cached QR, offline still scannable; scans logged on sync |
| Manifest Status Board | Live load assignment, exit order, gate confirmation, aircraft change | Cached last-known state; show “data stale” warning; refresh when online |
| Gear Check (rig tag QR) | Scan gear QR, instant rig profile + next repack date, inline unlock/lock | Scan offline, store hash, verify on sync |

| -- qr_tokens: Persistent QR identity tokens CREATE TABLE qr_tokens (   qr_token_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   athlete_id BIGINT UNSIGNED NOT NULL,   dz_id BIGINT UNSIGNED,   token_type ENUM(     ‘permanent’, ‘daily_manifest’, ‘booking_anchor’,     ‘group_manifest’, ‘gear_check’   ) NOT NULL,   token_value VARCHAR(1024) NOT NULL UNIQUE,   payload_json JSON NOT NULL,   signature_hmac CHAR(88) NOT NULL,   expires_at DATETIME NOT NULL,   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   rotated_at DATETIME,   is_active BOOLEAN DEFAULT TRUE,   last_scanned_at DATETIME,   INDEX (athlete_id, token_type),   INDEX (expires_at, is_active),   FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id),   FOREIGN KEY (dz_id) REFERENCES dropzones(dz_id) );  -- checkin_sessions: Track check-in events CREATE TABLE checkin_sessions (   checkin_session_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   athlete_id BIGINT UNSIGNED NOT NULL,   dz_id BIGINT UNSIGNED NOT NULL,   qr_token_id BIGINT UNSIGNED,   session_status ENUM(‘checked_in’, ‘waiver_pending’, ‘payment_pending’) NOT NULL,   scanned_at DATETIME NOT NULL,   waiver_signed BOOLEAN DEFAULT FALSE,   payment_verified BOOLEAN DEFAULT FALSE,   notes VARCHAR(500),   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   INDEX (athlete_id, dz_id, scanned_at),   FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id),   FOREIGN KEY (dz_id) REFERENCES dropzones(dz_id),   FOREIGN KEY (qr_token_id) REFERENCES qr_tokens(qr_token_id) );  -- groups: Group bookings CREATE TABLE groups (   group_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   dz_id BIGINT UNSIGNED NOT NULL,   captain_id BIGINT UNSIGNED NOT NULL,   group_type ENUM(     ‘rw’, ‘freefly’, ‘angle’, ‘wingsuit’,     ‘coaching’, ‘tandem_camera’, ‘aff’, ‘crw’   ) NOT NULL,   status ENUM(‘draft’, ‘manifest_submitted’, ‘validated’, ‘load_assigned’, ‘completed’, ‘cancelled’) NOT NULL,   manifest_hash CHAR(64),   aircraft_id BIGINT UNSIGNED,   load_id BIGINT UNSIGNED,   member_count INT NOT NULL DEFAULT 0,   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   submitted_at DATETIME,   completed_at DATETIME,   INDEX (dz_id, captain_id, status),   INDEX (load_id),   FOREIGN KEY (dz_id) REFERENCES dropzones(dz_id),   FOREIGN KEY (captain_id) REFERENCES athletes(athlete_id),   FOREIGN KEY (aircraft_id) REFERENCES aircraft(aircraft_id),   FOREIGN KEY (load_id) REFERENCES loads(load_id) );  -- group_members: Membership CREATE TABLE group_members (   group_member_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   group_id BIGINT UNSIGNED NOT NULL,   athlete_id BIGINT UNSIGNED NOT NULL,   member_status ENUM(‘invited’, ‘pending’, ‘confirmed’, ‘cancelled’) NOT NULL,   role ENUM(‘member’, ‘videographer’, ‘instructor’, ‘tandem_master’) DEFAULT ‘member’,   invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,   confirmed_at DATETIME,   validation_errors JSON,   override_reason VARCHAR(500),   INDEX (group_id, member_status),   INDEX (athlete_id),   FOREIGN KEY (group_id) REFERENCES groups(group_id),   FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id) );  -- group_load_assignments: Load assignments + exit order CREATE TABLE group_load_assignments (   assignment_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   group_id BIGINT UNSIGNED NOT NULL,   load_id BIGINT UNSIGNED NOT NULL,   exit_order JSON NOT NULL,   jump_spot_start INT,   jump_spot_end INT,   aircraft_manifest_locked BOOLEAN DEFAULT FALSE,   assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,   UNIQUE (group_id, load_id),   FOREIGN KEY (group_id) REFERENCES groups(group_id),   FOREIGN KEY (load_id) REFERENCES loads(load_id) );  -- scan_logs: Audit trail for all QR scans CREATE TABLE scan_logs (   scan_log_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   qr_token_id BIGINT UNSIGNED,   athlete_id BIGINT UNSIGNED,   dz_id BIGINT UNSIGNED NOT NULL,   scanner_type ENUM(‘mobile’, ‘tablet’, ‘kiosk’, ‘api’) NOT NULL,   scan_context ENUM(     ‘checkin’, ‘gear_check’, ‘gate’, ‘profile_lookup’   ) NOT NULL,   validation_result ENUM(‘success’, ‘signature_fail’, ‘expired’, ‘not_found’, ‘offline’) NOT NULL,   offline_mode BOOLEAN DEFAULT FALSE,   ip_address VARCHAR(45),   device_id VARCHAR(255),   scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,   INDEX (qr_token_id, scanned_at),   INDEX (athlete_id, scan_context),   INDEX (dz_id, validation_result) );  -- assignment_notifications: Event-driven notifications CREATE TABLE assignment_notifications (   notification_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,   athlete_id BIGINT UNSIGNED NOT NULL,   group_id BIGINT UNSIGNED,   load_id BIGINT UNSIGNED,   event_type ENUM(     ‘group_created’, ‘member_confirmed’, ‘validation_failed’,     ‘manifest_accepted’, ‘aircraft_changed’, ‘exit_order_published’,     ‘group_cancelled’, ‘jump_complete’   ) NOT NULL,   channel ENUM(‘push’, ‘sms’, ‘whatsapp’, ‘email’) NOT NULL,   message_content JSON NOT NULL,   sent_at DATETIME,   delivery_status ENUM(‘pending’, ‘sent’, ‘failed’, ‘bounced’) DEFAULT ‘pending’,   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   INDEX (athlete_id, created_at),   INDEX (event_type, delivery_status),   INDEX (group_id, load_id),   FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id),   FOREIGN KEY (group_id) REFERENCES groups(group_id),   FOREIGN KEY (load_id) REFERENCES loads(load_id) ); |
| --- |

| Scenario | What Happens | Sync Strategy |
| --- | --- | --- |
| Scan check-in QR (offline) | Verify signature with local HMAC secret, check token not expired, fetch athlete profile from cache | Queue checkin_session record, sync when online |
| Create group + add members (offline) | Validate locally (rule checks, license lookup), generate QR token offline, edits stored to WatermelonDB | Sync member records + group creation when online; deduplicate |
| Member confirms group (offline) | Update local group_members status, queue notification | Sync confirmation + notification on reconnect |
| Submit manifest (offline) | Run validation rules offline, generate Group Manifest QR, store manifest JSON locally | Retry POST /groups/{group_id}/manifest when online |
| Gear check (offline rig scan) | Scan rig QR, cache payload, hash signature | Sync scan_logs + verification on reconnect |
| Network recovers | Mobile app detects connection, begins sync queue | POST deduped records (idempotency: prevent re-checkin), handle conflicts (server wins) |

| // offline-sync-queue.ts interface OfflineAction {   action_id: string;   action_type:     | ‘checkin’     | ‘group_create’     | ‘group_add_member’     | ‘member_confirm’     | ‘manifest_submit’;   payload: Record<string, unknown>;   created_at: number;   synced_at?: number; }  export class OfflineSyncManager {   private queue: OfflineAction[] = [];    async syncQueue() {     const actions = await this.loadQueueFromDB();     const deduped = this.deduplicateByActionId(actions);      for (const action of deduped) {       try {         const resp = await this.postAction(action);         if (resp.status === 201) {           await this.markSynced(action.action_id);         } else if (resp.status === 409) {           // Conflict: item already exists (double-submit). Mark synced.           await this.markSynced(action.action_id);         } else {           console.error(`Sync fail: ${action.action_id}`, resp);           // Retry on next sync         }       } catch (err) {         console.error(`Network error syncing ${action.action_id}`);       }     }   }    private deduplicateByActionId(     actions: OfflineAction[]   ): OfflineAction[] {     const seen = new Map<string, OfflineAction>();     for (const action of actions) {       if (!seen.has(action.action_id)) {         seen.set(action.action_id, action);       }     }     return Array.from(seen.values());   } } |
| --- |

| Threat | Impact | Mitigation |
| --- | --- | --- |
| HMAC Forgery / Signature Bypass | Attacker generates fake QR tokens, impersonates athlete | HMAC-SHA256 with 256-bit secret key (rotated monthly), offline verification, server audit on mismatch |
| Token Reuse / Replay | Attacker scans same token multiple times, boards twice | Exp_time check, scan_logs deduplication (same token + scanner + 30s window = reject), gate manifest lock |
| Stolen Permanent QR | Attacker boards as victim on another DZ | Token rotation every 12 months, emergency revocation via athlete app, cross-DZ linking via athlete_id (not QR) |
| Man-in-the-Middle (MITM) | Attacker intercepts QR generation, replaces with fake | HTTPS + TLS 1.3, QR display only on authenticated app/tablet, SSL pinning on mobile |
| Offline Token Forgery | Attacker modifies phone’s HMAC secret or local DB | Server audit (scan_logs) catches fake signatures, signature mismatch logs incident, rate limiting |
| Rate Limiting / DDoS | Attacker scans QRs rapidly to find valid tokens | Rate limit: 1 scan per token per 30 sec (per scanner), per-IP rate limit (10/min), alert on > 5 fails |
| QR Code Forgery in Print | Attacker prints a fake QR, scans at gate | Signature check fails, offline signature cache prevents short-term reuse, manual staff review |
| Lost Phone Recovery | Attacker finds phone with cached QRs | Tokens expire (12 months permanent, 24h daily), PIN/biometric unlock required, emergency revoke via account |