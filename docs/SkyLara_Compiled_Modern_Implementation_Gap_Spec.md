# SkyLara Compiled Modern Implementation Gap Spec and Claude Code Prompt

## Purpose
This file is the updated Markdown version of the Burble analysis, rewritten to fit the current SkyLara direction and to avoid outdated or conflicting ideas from the existing SkyLara Markdown set.

This document does four things:
1. extracts the best useful ideas validated by the Burble analysis
2. removes or overrides ideas that conflict with the current SkyLara architecture and product direction
3. defines the missing modules, features, dashboards, backend services, and frontend routes that should still be implemented or verified
4. gives Claude Code a direct implementation prompt to build the missing work phase by phase

This file should be used as a synthesis and implementation driver, not as a historical archive.

---

# 1. Canonical Product Position

SkyLara is not a clone of Burble.
SkyLara is the modern operating system for dropzones and flying communities.

The current SkyLara direction already establishes the right foundation:
- production-grade modular monolith in V1
- safety-first operational gates
- mobile-first athlete and staff experience
- offline-first field operations
- typed service boundaries
- real-time manifest operations
- athlete identity, wallet, story, AI, and multi-DZ growth

So the correct approach is:

- copy the operational strengths Burble proved
- avoid Burble’s UX and architecture weaknesses
- keep SkyLara’s current architecture as the source of truth
- use Burble only as competitive validation and feature-parity pressure

---

# 2. What Burble validates that SkyLara should absolutely keep

The Burble analysis confirms these are real market-critical capabilities and not optional ideas:

## 2.1 Unified booking to manifest flow
A booking engine tied directly to manifest is table stakes.
Booking, waiver, payment, check-in, load assignment, and operational status must share one live data model.

## 2.2 Real manifest operations
The market expects:
- drag-and-drop manifest operations
- live load boards
- group handling
- standby / waitlist logic
- real-time load visibility
- pilot / loader visibility into the load

## 2.3 Athlete self-service
Licensed jumpers want:
- self-manifest
- load board access
- phone-based wallet top-up
- transaction history
- digital logbook
- portable identity
- minimal manifest-desk dependency

## 2.4 Gear and compliance enforcement
A modern system must:
- block expired reserve or AAD status when policy requires
- enforce waiver and currency gates
- surface training or discipline gates
- track rig and gear status in the actual manifest flow

## 2.5 Role-based operational dashboards
The platform must support distinct dashboards and workflows for:
- DZ operator
- manifest staff
- athlete
- instructor
- pilot
- rigger / safety
- admin

## 2.6 Reporting and back office
Burble validates that operators expect:
- revenue reports
- liabilities / receivables
- sales reporting
- load utilization reporting
- staff payout support
- exportable operational data

## 2.7 Pilot / flight-line support
Pilot- and loader-facing surfaces are not optional.
Aircraft planning, headcount, payload estimate, and load status must be visible in a flight-line-friendly interface.

---

# 3. What SkyLara should NOT copy from Burble

## 3.1 Do not copy old UX patterns
Avoid:
- repetitive click loops for self-manifest
- unclear mobile flows
- fragmented role experiences
- hidden or awkward admin settings
- a dated visual system

## 3.2 Do not build around manifest only
SkyLara is broader than Burble:
- athlete identity
- progression
- story
- multi-DZ portability
- AI operations layer
- marketplace
- richer compliance and audit systems
must remain part of the product strategy.

## 3.3 Do not let AI replace deterministic safety rules
AI can recommend and prioritize.
AI must not override:
- CG gating
- waiver / document / payment gates
- discipline qualification gates
- pilot authority
- weather hold approval requirements

## 3.4 Do not create duplicate architectures
The current SkyLara source docs already define the right V1 architecture:
- modular monolith
- service interfaces
- Redis Streams / outbox for important events
- offline-first behavior for field use
Do not invent a parallel architecture for AI, mobile, reporting, or rig maintenance.

---

# 4. Canonical SkyLara V1 stack to preserve

## 4.1 Architecture
- V1 modular monolith
- typed service contracts
- strict domain boundaries
- no cross-module direct SQL where service boundaries already exist
- event-driven side effects
- audit-first thinking for safety and finance

## 4.2 Frontend
- Next.js web platform
- responsive PWA for athlete and staff use
- mobile-first layout for manifest staff and athletes
- React Native only if or when separated intentionally, not by accidental divergence

## 4.3 Backend
- Node.js + TypeScript
- MySQL 8.0 / InnoDB
- Redis for cache / streams / real-time support
- REST + WebSocket
- transactional outbox for financial and safety-critical events

## 4.4 Product sequencing
- win on dropzone operations first
- then layer identity
- then intelligence / AI
- then story / marketplace expansion

---

# 5. Missing or still-not-guaranteed features to implement or verify

This is the most important section.
These are the areas Claude should use as a gap-driven implementation checklist.

## 5.1 Manifest and operations
Implement or verify:
- real drag-and-drop load board with working persistence
- load FSM with no bypass around status transitions
- CG blocking gate on LOCKED to 30MIN or equivalent safety transition
- waitlist with timed claim workflow
- live manifest board updates across devices
- group pads or equivalent multi-jumper load grouping
- real no-show / standby rotation logic
- manifest-ready external load board display
- boarding-ready pilot view and loader view

## 5.2 Athlete self-service
Implement or verify:
- self-manifest that is one clear flow, not click-heavy
- wallet top-up and visible balance
- phone-based load board with countdown / call time
- transaction history
- digital logbook
- DZ-portable profile and identity
- equipment / rig selection inside manifest flow
- load organizer tools for team/group coordination

## 5.3 Check-in and compliance
Implement or verify:
- QR check-in
- waiver freshness enforcement
- document and identity checks
- discipline / qualification gating
- instructor requirement detection
- student progression gating
- payment and wallet validation before manifest
- gear / reserve / AAD / rig-state visibility where required

## 5.4 Rig maintenance and gear
Implement or verify:
- rig profile CRUD
- component-level records
- jump-count linked maintenance tracking
- reserve repack and AAD service dates
- date- and jump-based rule engine
- due soon / due now / overdue / grounded states
- manifest warning and block flows
- rigger and gear-manager workflows
- maintenance events and audit trail

## 5.5 Weather and airspace
Implement or verify:
- weather snapshot ingestion
- DZ-configured weather thresholds
- hold / warning recommendations by activity type
- NOTAM and airspace planning support where relevant
- jump window scheduling
- weather-aware schedule reshuffling
- weather hold approval workflow
- manual observation override logging

## 5.6 Aircraft and pilot workflows
Implement or verify:
- aircraft profiles
- payload and planning assumptions
- fuel estimate support
- pilot confirmation / override records
- pilot dashboard / flight-line view
- aircraft performance assumptions
- pilot notifications and boarding visibility
- no AI auto-approval of aircraft suitability

## 5.7 Reporting and intelligence
Implement or verify:
- revenue reporting
- load utilization reporting
- payment breakdowns
- refund reporting
- instructor payout support
- operational summary dashboards
- cached or pre-aggregated reporting patterns at scale
- clear freshness / last-updated labels for non-live reports

## 5.8 AI and recommendations
Implement or verify:
- persistent assistant conversations
- route-aware assistant context
- readiness engine
- manifest agent recommendation flow
- weather ops agent
- communications agent
- waitlist / underfilled-load suggestion engine
- approval actions: accept / edit / reject
- recommendation audit logs
- fallback behavior when AI is unavailable

## 5.9 Notifications and communications
Implement or verify:
- push notifications
- in-app notifications
- email
- SMS
- WhatsApp where configured
- delivery logs
- retries
- preferences
- stale token cleanup
- role-based operational trigger handling

## 5.10 Admin, onboarding, multi-DZ
Implement or verify:
- DZ setup and pricing
- staff role assignment
- temporary role grants
- branch and multi-DZ support
- migration / import tools
- docs-as-code repo discipline
- audit exports and incident traceability

---

# 6. Dashboard matrix that should exist or be verified

## 6.1 DZ Operator Dashboard
Must include:
- today’s revenue
- active loads
- utilization and waitlist
- safety and compliance alerts
- staffing visibility
- refund and payout highlights
- weather impact summary
- AI recommendations summary
- announcements / communications

## 6.2 Manifest Staff Dashboard
Must include:
- active load board
- readiness view
- blocked jumpers list
- waitlist and no-show panel
- group/load planner
- call time controls
- check-in queue
- tandem queue
- weather and hold alerts
- quick actions that really persist

## 6.3 Athlete Dashboard
Must include:
- self-manifest
- load board
- wallet / tickets
- rig status
- call times
- logbook
- progression / milestones
- story profile
- bookings and purchases

## 6.4 Instructor Dashboard
Must include:
- assigned students
- progression evaluations
- availability
- load participation
- coaching records
- student readiness blockers
- payout visibility if applicable

## 6.5 Pilot Dashboard
Must include:
- current and upcoming loads
- aircraft planning panel
- payload estimate
- fuel estimate support
- pilot confirmation records
- weather context
- ATC / airspace note visibility where relevant

## 6.6 Rigger / Safety Dashboard
Must include:
- gear check queue
- reserve / AAD due list
- rig maintenance queue
- grounding / clearance actions
- incident / emergency access
- compliance exceptions

## 6.7 Platform Admin Dashboard
Must include:
- DZ list
- subscription and billing overview
- system health
- audit and export access
- migration status
- cross-DZ analytics where intended

---

# 7. Backend module map Claude should respect

## 7.1 Auth and Identity
Owns:
- users
- roles
- profiles
- sessions
- multi-DZ role grants
- athlete identity

## 7.2 Manifest and Ops
Owns:
- loads
- slots
- waitlist
- FSM
- check-in
- call times
- exit order
- readiness orchestration

## 7.3 Safety and Gear
Owns:
- emergency
- incidents
- compliance
- gear
- rig maintenance
- reserve / AAD / service states

## 7.4 Payments and Wallet
Owns:
- transactions
- wallet
- jump tickets
- refunds
- splits
- payouts

## 7.5 Booking and Training
Owns:
- online bookings
- tandem queue
- AFF progression
- coaching
- schedule dependencies

## 7.6 Notifications
Owns:
- push
- SMS
- email
- WhatsApp
- templates
- delivery logs
- preferences

## 7.7 Weather
Owns:
- weather data
- holds
- threshold rules
- jumpability context

## 7.8 Reporting and AI
Owns:
- reports
- aggregates
- assistant
- recommendations
- AI audit and agent runs

## 7.9 Shop and Story
Owns:
- products
- orders
- identity story
- milestones
- feed

Do not collapse all of this into one giant “operations” blob.

---

# 8. Frontend route map Claude should use as implementation target

## 8.1 Core dashboards
- /dashboard/operator
- /dashboard/manifest
- /dashboard/athlete
- /dashboard/instructor
- /dashboard/pilot
- /dashboard/safety
- /dashboard/admin

## 8.2 Manifest and operations
- /dashboard/manifest/board
- /dashboard/manifest/readiness
- /dashboard/manifest/load-planner
- /dashboard/manifest/waitlist
- /dashboard/manifest/history
- /dashboard/manifest/insights

## 8.3 Ops subareas
- /dashboard/ops/tandems
- /dashboard/ops/students
- /dashboard/ops/weather
- /dashboard/ops/staffing
- /dashboard/ops/compliance

## 8.4 Aircraft
- /dashboard/aircraft
- /dashboard/aircraft/[id]
- /dashboard/aircraft/[id]/performance
- /dashboard/aircraft/[id]/fuel-profiles
- /dashboard/aircraft/[id]/pilot-confirmations
- /dashboard/aircraft/[id]/planning-history

## 8.5 Gear and rig maintenance
- /dashboard/gear
- /dashboard/gear/rigs
- /dashboard/gear/rigs/[id]
- /dashboard/gear/maintenance
- /dashboard/gear/grounded

## 8.6 AI
- /dashboard/ai
- /dashboard/ai/assistant
- /dashboard/ai/assistant/[chatId]
- /dashboard/ai/history
- /dashboard/ai/knowledge
- /dashboard/ai/recommendations
- /dashboard/ai/automations
- /dashboard/ai/logs
- /dashboard/ai/settings

## 8.7 Athlete-facing routes
- /app/load-board
- /app/wallet
- /app/logbook
- /app/rigs
- /app/bookings
- /app/profile
- /app/story

---

# 9. What to remove or treat as obsolete if found in repo

If any of this exists, Claude should replace or consolidate it:
- duplicate mobile and web backend logic for the same feature
- fake AI chat without persistent context or actions
- placeholder dashboards with no real data
- manual-only manifest flows where self-service already exists in the design
- direct DB coupling across domain boundaries
- ambiguous status names that do not fit the actual FSM
- UI that claims offline support without a defined sync rule
- any old architecture that conflicts with current modular-monolith V1 direction
- repetitive or redundant self-manifest flows similar to the Burble complaints
- dead modules or routes that overlap with the final implementation spec

---

# 10. Canonical implementation objective

Claude should treat the objective as:

Build the missing or incomplete SkyLara modules and features needed to reach a production-grade MVP and operator pilot state, using the current SkyLara docs as source of truth, the Burble analysis as competitive validation, and this document as the gap-driven synthesis for backend, frontend, dashboards, and user workflows.

---

# 11. Claude Code prompt

Use this directly inside Claude Code.

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Rules Engine Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Compiled_Modern_Implementation_Gap_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Use the current SkyLara docs as source of truth, use the Burble analysis only as competitive validation, and implement the missing or incomplete modules, features, dashboards, backend services, and frontend routes required for a production-grade SkyLara MVP.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Reuse existing auth, RBAC, notifications, manifest, compliance, payment, weather, gear, and reporting domains.
3. Do not create duplicate backend logic or duplicate mobile/web truth.
4. Do not bypass deterministic safety or compliance gates.
5. AI may recommend and prioritize but cannot override pilot authority, CG gates, payment/compliance gates, or weather approval rules.
6. Never mark a feature complete unless backend persistence, real UI wiring, and operational behavior are working.
7. Remove or consolidate outdated, duplicate, or conflicting implementations if they exist.

Start with audit only, no coding.

Return:
1. selected docs for this task
2. reusable models, APIs, and event hooks already in the repo
3. missing or incomplete modules and features compared with the selected docs and this gap spec
4. outdated or conflicting implementations that should be removed or merged
5. exact files to create or edit
6. schema changes needed
7. implementation risks

After the audit, implement only one phase at a time.

For each phase, return:
- scope implemented
- files created
- files edited
- schema changes
- APIs reused
- new APIs added
- event hooks reused or added
- QA steps
- blockers
- next recommended phase

Primary implementation target:
Best compiled dashboards + real backend + real frontend + role-based user flows, with no dead routes, no dead buttons, and no fake completion.
```

---

# 12. Suggested filename in repo

Use:
`docs/SkyLara_Compiled_Modern_Implementation_Gap_Spec.md`

This file should sit near:
- SkyLara_Final_Implementation_Spec.md
- SkyLara_ProductionSystems_v1.md
- Building_SkyLara_AI_Agents_Master_Implementation.md
- SkyLara_Rig_Maintenance_Complete_Master_File.md

It should not replace those docs.
It should help Claude decide what still needs to be built, upgraded, merged, or cleaned up.
