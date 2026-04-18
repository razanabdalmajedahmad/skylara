# SkyLara Safety Module Master Spec

## Purpose
This file is the single source of truth for the SkyLara Safety Module.

It defines the production-grade safety architecture for SkyLara across:
- dashboard
- backend APIs
- web portal
- public portal safety surfaces
- PWA
- mobile app
- manifest integrations
- notification systems
- offline-first mobile storage
- audit and compliance workflows

The Safety Module is the centralized operational pillar for:
- distributing safety protocols
- managing emergency procedures
- running pre-boarding readiness checklists
- triggering role-based safety notifications
- capturing acknowledgements
- enforcing safety-state truth
- synchronizing updates across web and mobile
- creating an auditable safety history for compliance and investigations

This module exists to bridge the gap between static skydiving manuals and real-time dropzone operations.

It must ensure that safety content is:
- current
- role-specific
- operationally timed
- versioned
- auditable
- mobile-accessible
- integrated with manifest state
- impossible to bypass through stale local cache

This spec is based on the uploaded Skydiving Safety Module Design Spec. fileciteturn27file0

---

## 1. Canonical product position

SkyLara Safety is not a static library of documents.

It is a live, operational safety domain that:
- links safety content to real manifest state
- distributes procedures by role and context
- tracks acknowledgements
- drives readiness checks
- publishes urgent operational bulletins
- prevents stale or outdated safety guidance
- supports server-truth safety holds
- delivers critical push notifications exactly when needed

The module must work as one backend truth shared across:
- dashboard
- web
- mobile
- manifest workflows
- readiness workflows
- notifications
- event and role segmentation

This is a core platform domain, not an optional add-on.

---

## 2. Core goals

The Safety Module must let SkyLara:

### 2.1 Distribute
- safety tips
- emergency procedures
- checklists
- video content
- bulletins
- waiver-linked safety guidance

### 2.2 Verify
- user acknowledgements
- checklist completion
- readiness status
- version-specific sign-off
- role-specific mandatory review state

### 2.3 Trigger
- pre-boarding safety reminders
- event-specific notices
- role-specific reminders
- dropzone-specific operational warnings
- safety hold updates
- manual override alerts

### 2.4 Protect
- ensure server-truth overrides stale local state
- prevent boarding workflows from bypassing active safety holds
- preserve immutable history of safety content changes
- preserve legal defensibility of what content was active at a given time

---

## 3. User roles

The module must support role-aware safety delivery.

### 3.1 Supported roles
- Safety & Training Advisor (S&TA)
- Chief Instructor
- AFF Student / ISP Student
- Tandem Student / Passenger
- AFF Instructor
- Tandem Instructor
- Coach
- Fun Jumper
- Event Participant
- Dropzone Manager
- Manifest Operator
- Safety Officer
- Admin / System Administrator

### 3.2 Role-driven safety focus

#### Safety & Training Advisor (S&TA)
Focus:
- content authoring
- publishing
- bulletin deployment
- readiness rules
- audit and acknowledgement review

#### Student (AFF / ISP)
Focus:
- structured EP content
- canopy and landing guidance
- rigid pre-boarding checklist
- required instructional videos
- mandatory acknowledgements

#### Instructor (Tandem / AFF)
Focus:
- passenger / student verification
- instructor readiness checklist
- aircraft emergency procedures
- dropzone bulletin awareness
- student-specific operational notices

#### Coach
Focus:
- break-off rules
- collision avoidance
- peer gear-check reminders
- event or camp local procedures

#### Fun Jumper
Focus:
- gear-check refreshers
- reserve repack and document alerts
- aircraft-specific rules
- canopy safety reminders
- advanced emergency procedure references

#### Event Participant
Focus:
- temporary local hazards
- aircraft exit separation
- event-specific breakoff or landing rules
- temporary bulletin content

### 3.3 Role resolution rule
A user can hold multiple roles.
The backend must resolve the highest-priority operational role for the active context.

Examples:
- a Fun Jumper attending a boogie may temporarily receive Event Participant safety content
- an instructor on a tandem load may receive instructor + passenger workflow reminders
- a student on Category A must receive stricter checklist content than a licensed fun jumper

---

## 4. Public vs logged-in visibility

### 4.1 Public visibility
The public portal may show:
- general tandem safety tips
- public dropzone rules
- waiver-linked general safety content
- introductory arrival and conduct information
- basic public safety FAQ

Public users must **not** be able to:
- complete mandatory readiness checklists
- acknowledge role-specific procedures
- receive boarding push notifications
- view account-scoped safety holds
- bypass logged-in compliance workflows

### 4.2 Logged-in visibility
Logged-in users can access:
- role-specific safety content
- personalized readiness status
- acknowledgement history
- mandatory checklist content
- mandatory EP review
- bulletin history
- push-enabled reminder flows
- account-specific safety holds or restrictions

### 4.3 Product rule
The mobile logged-in experience is the primary operational surface for live pre-boarding safety workflows.

---

## 5. Safety content types

The Safety Module must support typed content models.

### 5.1 Textual Tip
Schema ideas:
- title
- markdown or rich-text body
- category
- audience tags
- severity
- related role tags
- facility tags
- event tags

Use for:
- general safety reminders
- etiquette
- packing tips
- landing notes
- temporary reminders

### 5.2 Procedure
Schema ideas:
- title
- phase category
- ordered steps
- conditional logic
- visual diagram references
- severity
- role applicability
- acknowledgement requirement

Use for:
- emergency procedures
- aircraft exits
- deployment responses
- canopy emergency workflows
- landing emergency workflows

### 5.3 Checklist
Schema ideas:
- title
- ordered boolean items
- mandatory flag per item
- friction mode
- role applicability
- boarding linkage
- required acknowledgement rules

Use for:
- pre-boarding rig check
- instructor-to-student check
- student readiness
- aircraft boarding check

### 5.4 Video Asset
Schema ideas:
- title
- media URL
- transcript
- duration
- subtitles
- thumbnail
- required-watch rule
- completion threshold
- audience tags

Use for:
- canopy drills
- malfunction demos
- AFF curriculum
- local orientation videos

### 5.5 Bulletin Notice
Schema ideas:
- title
- short body
- severity
- expiry timestamp
- push enabled
- affected facility
- affected event
- audience filters

Use for:
- wind holds
- runway alerts
- aircraft restrictions
- temporary landing hazards
- local emergency instructions

### 5.6 Linked waiver safety item
Schema ideas:
- waiver context
- mandatory content reference
- must-review-before-sign rule

Use for:
- tandem onboarding
- event registration
- first-time visitor safety exposure

---

## 6. Emergency procedure categories

The module must organize EPs by operational phase.

### 6.1 Aircraft emergencies
- aircraft problem during taxi or takeoff
- climb-out issues
- premature deployment in aircraft
- exit abort procedure
- aircraft emergency landing guidance

### 6.2 Freefall emergencies
- instability
- collision avoidance
- loss of altitude awareness
- break-off procedures
- deployment timing awareness

### 6.3 Deployment emergencies
- pilot chute in tow
- total malfunction
- bag lock
- line over
- tension knot
- horseshoe malfunction
- hard pull / lost handle
- broken or damaged main

### 6.4 Two canopies out
- biplane
- side-by-side
- downplane
- recommended action by scenario

### 6.5 Canopy flight emergencies
- collision avoidance
- low turn avoidance
- traffic pattern awareness
- turbulence caution
- off-DZ landing decisions

### 6.6 Landing emergencies
- obstacle landing
- water landing
- power lines
- tree landing
- hard landing response
- canopy collapse and drag

### 6.7 Local / temporary procedures
- event landing rules
- temporary hazards
- aircraft-specific local rules
- weather-specific landing instructions

---

## 7. Dashboard Safety tab structure

Main route:
- `/dashboard/safety`

Subroutes:
- `/dashboard/safety/overview`
- `/dashboard/safety/tips`
- `/dashboard/safety/videos`
- `/dashboard/safety/emergency-procedures`
- `/dashboard/safety/checklists`
- `/dashboard/safety/reminders`
- `/dashboard/safety/bulletins`
- `/dashboard/safety/audiences`
- `/dashboard/safety/versions`
- `/dashboard/safety/acknowledgements`
- `/dashboard/safety/holds`
- `/dashboard/safety/settings`

### 7.1 Overview
Show:
- active bulletins
- unpublished drafts
- pending acknowledgements
- users not ready
- upcoming reminder triggers
- current safety holds
- content version activity

### 7.2 Tips library
Allow:
- authoring text-based safety guidance
- tagging by role, event, and facility
- publish/unpublish
- save draft
- version tracking

### 7.3 Video library
Allow:
- upload
- transcoding status
- transcript management
- subtitles
- thumbnail control
- required-watch settings
- publish/unpublish

### 7.4 Emergency Procedures
Allow:
- structured step editing
- phase/category assignment
- diagram and media linking
- audience tagging
- severity assignment
- mandatory acknowledgement setting

### 7.5 Checklists
Allow:
- dynamic checklist builder
- mandatory/optional item flags
- friction style selection
- role assignment
- boarding linkage
- event/facility overrides

### 7.6 Reminders & Rules
Allow:
- trigger selection
- time offsets
- audience rules
- message template editing
- deep-link destination
- schedule preview
- notification enable/disable

### 7.7 Bulletin Board
Allow:
- rapid-create notice
- severity level
- expiration time
- targeted audience
- push trigger
- acknowledgement requirement if needed

### 7.8 Roles & Audiences
Allow:
- user segmentation mapping
- role priority logic
- event targeting
- license-level targeting
- facility targeting
- aircraft targeting
- jump-type targeting

### 7.9 Versions & Audit Log
Show:
- immutable history
- version comparisons
- who changed what
- timestamped publish history
- recovery / reference view

### 7.10 Acknowledgements
Show:
- who signed what
- which version was signed
- pending mandatory acknowledgements
- per-load readiness gap views
- account compliance history

### 7.11 Holds
Allow:
- apply safety hold
- clear safety hold
- reason capture
- severity/state capture
- audit trail
- notification to affected user

### 7.12 Settings
Allow:
- webhook secret config
- manifest integration toggles
- OneSignal config
- FCM config
- retention policies
- admin permission mapping
- manual override tools

---

## 8. Mobile Safety tab structure

The mobile app is the primary live safety terminal for jumpers.

### 8.1 Safety Home
Show:
- readiness status
- active bulletins
- next mandatory checklist
- outstanding acknowledgements
- reserve repack or membership alerts
- direct EP shortcut

### 8.2 Emergency Procedures
Features:
- tabs by phase
- heavy iconography
- strong contrast
- large typography
- offline-available content
- quick access from push notification deep links

### 8.3 My Checklist
Features:
- role-specific checklist
- boarding-triggered rendering
- deliberate friction for critical items
- swipe-to-confirm on high-risk checks
- timestamp and sync state
- server truth reconciliation

### 8.4 Videos
Features:
- adaptive streaming
- transcripts
- offline pin/save where allowed
- completion tracking
- mandatory watch state

### 8.5 Notices
Features:
- reverse chronological bulletin feed
- severity badges
- unread markers
- expiry handling
- acknowledgement state if required

### 8.6 Acknowledgements
Features:
- blocking modal for required items
- sign/review state
- scroll-to-bottom or watch-complete gating
- version-bound acknowledgement

### 8.7 Safety hold state
If user is on hold:
- clearly visible status
- explanation
- required next steps
- contact or escalation path
- no stale cached “ready” state allowed

---

## 9. Web Safety portal structure

### 9.1 Public routes
- `/safety`
- `/safety/waiver-link`
- `/safety/faq`

### 9.2 Logged-in routes
- `/safety/emergency-procedures`
- `/safety/videos`
- `/account/safety`
- `/account/safety/acknowledgements`
- `/account/safety/checklists`

### 9.3 Web portal purpose
The web portal should support:
- pre-arrival study
- larger-screen EP comparison
- document and video review
- personal compliance review
- waiver-linked safety education
- history and acknowledgement review

### 9.4 Product rule
The web and mobile clients must use the same canonical content IDs and version semantics.

---

## 10. Notification Rule Engine

The notification engine is a backend operational processor that evaluates:
- manifest state changes
- boarding windows
- event state
- safety holds
- bulletin urgency
- role and audience segmentation

### 10.1 Trigger types
Support:
- manifest state change
- boarding_time relative trigger
- manual bulletin publication
- safety hold applied
- version invalidation requiring re-ack
- event check-in
- facility-specific warning state

### 10.2 Time-relative rules
Examples:
- T minus 10 minutes before boarding
- T minus 30 minutes before event briefing
- immediate on safety hold
- immediate on critical bulletin
- re-ack prompt after procedure version bump

### 10.3 Audience evaluation
Rules must evaluate:
- role
- jump type
- license level
- event participation
- aircraft type
- facility
- load membership
- current hold/readiness state

### 10.4 Payload generation
Payloads should include:
- title
- short body
- severity
- deep-link URI
- content_id
- version_num if applicable
- TTL
- push priority

### 10.5 Cancellation logic
If load conditions change, pending notifications must be cancelable or superseded.

---

## 11. Pre-boarding 10-minute reminder workflow

This is a non-negotiable core workflow.

### 11.1 Product rule
Use actual operational timestamps from manifest logic.
Do not use fake frontend timers.

### 11.2 Workflow
1. Manifest system signals that boarding is 10 minutes away
2. SkyLara backend receives webhook
3. Backend resolves users on the affected load
4. Rule engine evaluates segmentation and role logic
5. Personalized safety notification is generated
6. Push is sent
7. Tapping the push deep-links directly to the targeted checklist or EP content
8. Acknowledgement and completion state updates readiness profile

### 11.3 Example payloads
Fun Jumper:
- “Boarding in 10 minutes. Check your rig, handles, helmet, altimeter, and review emergency procedures.”

AFF Student:
- “Boarding in 10 minutes. Complete your three-ring and chest strap checks, then review your landing pattern and emergency procedures.”

Tandem Instructor:
- “Boarding in 10 minutes. Verify passenger harness routing, gear security, and passenger briefing readiness.”

### 11.4 Failure handling
If manifest webhook fails:
- show operator retry
- support manual override
- preserve audit event
- avoid duplicate sends

---

## 12. Segmentation model

The engine must use a multi-dimensional segmentation model.

### 12.1 Segmentation axes
- user role
- jump type
- license level
- student category
- event type
- aircraft type
- facility
- dropzone
- geography
- load assignment
- training progression state

### 12.2 Query logic
Support boolean query combinations such as:
- all AFF students on Twin Otter loads today
- all event participants at Facility X
- all fun jumpers with A or B license on summer boogie loads
- all tandem instructors on loads within next 30 minutes

### 12.3 Product rule
Highly specific safety content must only go to affected users.

---

## 13. Data model and schema recommendations

Minimum core entities:

### 13.1 safety_content
Columns:
- content_id
- tenant_id
- facility_id
- type
- category
- title
- body_payload JSONB
- severity
- requires_ack
- is_published
- current_version_num
- created_by
- created_at
- updated_at

### 13.2 content_versions
Columns:
- version_id
- content_id
- version_num
- body_payload JSONB
- changed_by
- change_reason
- created_at

Rule:
- immutable
- append-only
- never destructively edited

### 13.3 notification_rules
Columns:
- rule_id
- trigger_type
- trigger_offset_seconds
- audience_query JSONB
- payload_template JSONB
- deep_link_target
- is_active
- created_by
- created_at

### 13.4 user_acknowledgements
Columns:
- ack_id
- user_id
- content_id
- version_num
- acknowledged_at
- device_id
- device_ip
- acknowledgement_mode

### 13.5 safety_holds
Columns:
- hold_id
- user_id
- hold_state
- reason
- created_by
- cleared_by
- created_at
- cleared_at

### 13.6 offline_sync_queue
Columns:
- sync_id
- user_id
- operation
- payload
- status
- created_at
- flushed_at

### 13.7 device_registrations
Columns:
- device_token_id
- user_id
- platform
- provider
- token
- is_active
- last_seen_at

### 13.8 bulletin_delivery_log
Columns:
- delivery_id
- content_id
- user_id
- rule_id
- provider_message_id
- sent_at
- cancelled_at
- delivery_status

---

## 14. API groups

### 14.1 Client-facing APIs
- `GET /api/v1/safety/content`
- `GET /api/v1/safety/content/:id`
- `GET /api/v1/safety/user/status`
- `GET /api/v1/safety/bulletins`
- `GET /api/v1/safety/checklists/current`
- `GET /api/v1/safety/ack/history`

### 14.2 Acknowledgement APIs
- `POST /api/v1/safety/ack`
- `POST /api/v1/safety/checklist/complete`
- `POST /api/v1/safety/video/complete`

### 14.3 Admin CMS APIs
- `POST /api/v1/admin/safety/content`
- `PUT /api/v1/admin/safety/content/:id`
- `POST /api/v1/admin/safety/rules`
- `PUT /api/v1/admin/safety/rules/:id`
- `POST /api/v1/admin/safety/bulletins`
- `POST /api/v1/admin/safety/holds`
- `POST /api/v1/admin/safety/holds/:id/clear`

### 14.4 Manifest sync APIs
- `POST /api/v1/sync/manifest-webhook`
- `POST /api/v1/admin/safety/manual-load-state`
- `POST /api/v1/admin/safety/test-trigger`

### 14.5 Device registration APIs
- `POST /api/v1/safety/devices/register`
- `DELETE /api/v1/safety/devices/:id`

---

## 15. Publish, version, and audit rules

### 15.1 Core rule
Never destructively overwrite critical safety history.

### 15.2 Required behavior
When content changes:
- current content may update
- prior state must be appended into `content_versions`
- modifier identity must be logged
- exact timestamp must be logged
- publish status changes must be logged

### 15.3 Publish states
Support:
- DRAFT
- REVIEW
- PUBLISHED
- EXPIRED
- ARCHIVED

### 15.4 Acknowledgement invalidation
If a material change occurs:
- previous acknowledgements may be invalidated
- user readiness may be revoked
- re-ack flow may be required before next manifest eligibility

---

## 16. Video and content storage recommendations

### 16.1 Storage pattern
Do not store raw video binaries in the main relational DB.

Use:
- cloud object storage
- transcoding pipeline
- HLS/adaptive streaming
- CDN delivery

### 16.2 Video requirements
Support:
- adaptive bitrate
- transcripts
- subtitles
- thumbnails
- offline pinning where allowed
- multilingual tracks if needed

### 16.3 Product rule
Video content IDs and versions must still remain part of the canonical safety content model.

---

## 17. Acknowledgement and completion logic

### 17.1 Version-bound acknowledgements
Every acknowledgement must include:
- content_id
- exact version_num
- timestamp
- user_id
- client/device metadata

### 17.2 Gating rules
Acknowledgement button should only become active after:
- full scroll of text
- full watch threshold of required video
- required checklist interaction
- or equivalent meaningful completion rule

### 17.3 Impact of version changes
If a critical update occurs:
- prior ack becomes stale
- readiness can be reset
- user must review new version
- new ack is required before operational clearance

---

## 18. Edge cases

### 18.1 Sudden weather hold
- cancel queued reminders
- update readiness context
- prevent stale boarding reminder delivery

### 18.2 Jumper re-manifesting
- old load-linked reminders destroyed
- new offsets computed for new load

### 18.3 Android Doze mode
- use high-priority data-capable push strategy for critical reminders

### 18.4 Offline stale reminder
- enforce TTL so ancient reminders are discarded

### 18.5 Broken manifest integration
- provide manual load-state override from dashboard

### 18.6 Safety hold issued while user offline
- on reconnect or data-message receipt, local “ready” state must be invalidated immediately

---

## 19. Offline and server-truth rules

### 19.1 Offline-first support
Mobile should use local storage for:
- content cache
- EP documents
- last-known bulletin data
- queued acknowledgement actions

### 19.2 Sync model
Use delta-sync by changed content IDs and versions.

### 19.3 Non-negotiable server truth
Local cache must never override:
- active safety hold
- manifest clearance denial
- re-ack requirement
- current readiness status if server says blocked

### 19.4 Conflict rule
For normal content, standard sync resolution may apply.
For safety hold/readiness state, server wins always.

---

## 20. QA requirements

### 20.1 Network degradation testing
Verify:
- acknowledgement queues locally
- reconnect flush works
- no duplicate audit records

### 20.2 Push latency testing
Verify:
- manifest webhook to push dispatch stays within acceptable threshold
- payload deep-links open correct content

### 20.3 Doze mode testing
Verify:
- Android device wakes correctly for critical pre-boarding reminder flows

### 20.4 Audit immutability testing
Verify:
- versions cannot be maliciously updated or deleted through APIs

### 20.5 Role segmentation testing
Verify:
- student sees student content
- instructor sees instructor content
- event participant receives event-local content only where appropriate

### 20.6 Stale state testing
Verify:
- stale reminder does not arrive hours later
- re-manifesting updates schedule correctly
- safety hold kills local optimistic ready state

---

## 21. Phase-by-phase implementation plan

### Phase 1 — backend monolith and schema foundation
Build:
- schema
- version model
- acknowledgement model
- safety holds
- base REST APIs
- manifest webhook intake

### Phase 2 — dashboard CMS and publishing pipeline
Build:
- dashboard routes
- content authoring UIs
- checklist builder
- bulletin publishing
- audit/version log views

### Phase 3 — web portal and mobile offline foundation
Build:
- web routes
- mobile safety tab
- local storage and delta sync
- readiness UI
- EP and checklist rendering

### Phase 4 — notification engine and edge-case hardening
Build:
- notification rule engine
- OneSignal integration points
- FCM integration points
- T-10 pre-boarding reminders
- cancellation logic
- doze and TTL handling
- manual operator override

---

## 22. Risks

### 22.1 Notification fatigue
If rules are too noisy:
- users disable push
- trust drops
- critical alerts lose value

Mitigation:
- strict segmentation
- scarcity
- high relevance
- severity controls

### 22.2 External manifest dependency
If third-party manifest state does not arrive:
- triggers fail
- reminders fail

Mitigation:
- manual override controls
- retry logic
- webhook monitoring
- fallback dashboards

### 22.3 Offline state confusion
If local state is trusted too long:
- false readiness may appear

Mitigation:
- server-wins hold logic
- short-lived readiness cache
- data-message invalidation pulses

---

## 23. Recommended final filename
Use:
`docs/SkyLara_Safety_Module_Master_Spec.md`

---

## 24. Final Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal Mobile Architect, Principal Web Architect, Principal Data Architect, Principal Notification Systems Architect, Principal QA Lead, and Principal Safety Systems Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Final_Implementation_Spec.md
- docs/SkyLara_Public_Web_Portal_Master_Spec.md
- docs/SkyLara_ProductionSystems_v1.md
- docs/SkyLara_Safety_Module_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade Safety Module for SkyLara that manages safety content, emergency procedures, checklists, acknowledgements, push notification rules, pre-boarding reminders, safety holds, and offline-safe mobile delivery across dashboard, backend, web, PWA, and mobile.

Non-negotiable rules:
1. Keep V1 as modular monolith with strict service boundaries.
2. Build one backend truth for dashboard, web, PWA, and mobile.
3. Do not hardcode safety strings or checklist content in client code.
4. Build immutable content version history and auditable acknowledgements.
5. Use real manifest timing for pre-boarding reminders.
6. Server-truth safety holds must override local cache.
7. Push workflows must support cancellation, TTL, and high-priority delivery for critical cases.
8. Do not mark it complete unless dashboard, backend, web, and mobile workflows actually work together.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, event hooks, mobile sync patterns, and notification systems already in the repo
3. missing work needed for the Safety Module
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard routes and UI to add
8. mobile screens and web routes to add
9. implementation risks
10. recommended Phase 1
```
