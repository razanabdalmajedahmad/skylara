# Building_SkyLara_AI_Agents_Master_Implementation.md

# SkyLara AI Agents Master Implementation File

## Purpose
This is the single consolidated implementation document for building SkyLara AI agents and embedded operational intelligence across manifest, weather, aircraft planning, readiness, communications, and approvals.

This file is designed to be the repo-ready Markdown version of the original planning document, upgraded and aligned with the uploaded SkyLara source-of-truth documents.

It combines:
- AI product philosophy
- safety and authority constraints
- architecture layers
- recommended module boundaries
- data model requirements
- routes and UI surfaces
- deterministic rules engines
- agent workflows
- approval workflows
- notification and communication logic
- implementation phases
- QA and governance rules
- Claude execution prompt

Use this file inside the repo as the implementation source of truth for the AI operations layer.

---

# 1. Canonical Position of AI in SkyLara

AI in SkyLara is an operational layer embedded inside the platform, not a cosmetic chatbot and not an isolated sidecar. The uploaded production and platform blueprints explicitly frame AI as a core operational layer with components such as Load Optimizer, Risk Alerts, Predictive Scheduling, Revenue Insights, Staffing Recommender, and anomaly detection, with fallbacks when AI is unavailable. The production blueprint also says the manifest board must never block on an AI call and gives latency expectations for insights and risk alerts. fileciteturn6file16

This means the correct design is:

- AI supports operators
- AI never bypasses safety gates
- AI recommendations are explainable and reviewable
- deterministic rules remain authoritative for critical checks
- human roles remain responsible for high-impact approvals
- pilot authority remains final for aircraft-specific safety decisions

---

# 2. Non-Negotiable Constraints

## 2.1 Pilot authority is final
Any AI touching aircraft loading, fuel planning, weight and balance, or operational “go / no-go” guidance must stop at recommendation, warning, and estimate. The uploaded AI agents document explicitly says pilot-in-command authority is non-negotiable and requires explicit pilot confirmation and audit logging for aircraft and fuel related outputs. fileciteturn5file0

## 2.2 Deterministic safety and compliance gates cannot be bypassed
The uploaded AI agents document requires deterministic gates for waiver, document, payment, medical, license, rating, and discipline eligibility. The uploaded operational design and architecture docs also define safety as a hard gate, especially CG verification and compliance enforcement. The load FSM explicitly blocks LOCKED to 30MIN when CG has not passed. fileciteturn6file11 fileciteturn5file8 fileciteturn5file7

## 2.3 AI recommendations must be explainable and auditable
The uploaded AI agents document requires every recommendation to be explainable, editable, approvable or rejectable, and audited. That matches the platform AI design where operator action on AI recommendations is recorded. fileciteturn6file11 fileciteturn6file13

## 2.4 Weather-sensitive decisions need human approval
The uploaded AI agents document requires explainable weather-aware recommendations using DZ-configured thresholds, with human approval for safety-impacting changes such as holding students or tandems. The uploaded docs also define a dedicated weather platform module and risk-alert workflows. fileciteturn6file11 fileciteturn5file0 fileciteturn6file9

## 2.5 AI must fit existing SkyLara architecture
The uploaded architecture docs define a modular monolith with strict module boundaries, typed service interfaces, Redis-based event patterns, WebSocket real-time UX, mobile-first support, and React Native plus PWA fallback. AI must plug into these boundaries, not create a parallel product architecture. fileciteturn5file6 fileciteturn5file5 fileciteturn5file1

---

# 3. Product Philosophy

SkyLara AI should work as a three-layer system.

## Layer 1 — Assistant Layer
A real in-platform assistant that answers operational questions, explains blockers, links to records, drafts recommended actions, and exposes deep links into the platform.

## Layer 2 — Agent Layer
Background operational agents that read structured data, run deterministic checks, identify patterns, and generate recommendation drafts for people to approve or edit.

## Layer 3 — Rules and Calculations Layer
Deterministic engines for manifest readiness, discipline eligibility, weather thresholds, safety gates, aircraft calculations, and policy evaluation.

This three-layer model is already strongly supported by the uploaded AI document, and it fits the existing product structure where AI is an embedded layer on top of manifest, identity, payments, weather, notifications, and reporting. fileciteturn6file5 fileciteturn6file9

---

# 4. How AI Fits the Existing SkyLara Modules

The uploaded product definition, platform blueprint, and architecture files already define the main modules and service ownership boundaries. AI should therefore consume and orchestrate the existing system rather than duplicate it. fileciteturn5file1 fileciteturn5file4 fileciteturn5file6

## Existing modules AI must use
- manifest
- identity
- booking
- payments
- notifications
- weather
- safety
- training
- gear
- reporting
- platform

## Existing operational assets AI must consume
- load FSM
- slot assignments
- waitlist logic
- compliance checks
- check-in engine
- CG gate
- exit order engine
- athlete identity and logbook
- gear registry and repack tracking
- wallet and jump tickets
- push, SMS, email, and in-app notifications
- role dashboards
- weather holds and snapshots
- operator analytics and reports

These are directly described in the uploaded product, architecture, and DMS documents. fileciteturn5file1 fileciteturn5file3 fileciteturn5file4 fileciteturn5file8

---

# 5. Core AI Scope

SkyLara AI should cover the following domains first.

## 5.1 Manifest readiness intelligence
- who is ready
- who is blocked
- why they are blocked
- which blockers are hard vs soft
- what action is needed to unblock them
- role-specific call to action

## 5.2 Load optimization
- fill under-capacity loads
- suggest compatible reshuffles
- suggest better group composition
- suggest coach and organizer fits
- improve revenue per load while respecting safety

## 5.3 Tandem and student operations
- tandem queue prioritization
- instructor and camera availability
- student progression and required instructor gating
- reschedule proposals when weather tightens
- waiting-time reduction

## 5.4 Weather operations intelligence
- ingest current observation and forecast context
- map those to DZ-configured rules
- classify operational impact by activity type
- recommend holds, reordering, or earlier dispatch
- never silently impose flight-critical decisions

## 5.5 Aircraft and fuel estimate support
- compute planning estimates
- show margin bands
- require pilot confirm or override
- store pilot confirmation record
- attach it to the load

## 5.6 Communications automation
- batch reminders for waivers, payments, call times, waitlist slots, weather changes, and boarding
- select channels by urgency and preferences
- support approval before send where needed
- maintain delivery logs

## 5.7 Ops insights
- daily summary
- bottlenecks
- no-show patterns
- load inefficiency
- readiness failure hotspots
- staffing suggestions
- trend and anomaly detection

These capabilities are either already described in the uploaded AI file or clearly consistent with the AI components listed in the product and blueprint documents. fileciteturn6file2 fileciteturn6file16

---

# 6. Assistant Layer

## 6.1 Routes
Use the route structure already proposed in the uploaded AI planning document:

- /dashboard/ai
- /dashboard/ai/assistant
- /dashboard/ai/assistant/[chatId]
- /dashboard/ai/history
- /dashboard/ai/knowledge
- /dashboard/ai/recommendations
- /dashboard/ai/automations
- /dashboard/ai/logs
- /dashboard/ai/settings

The uploaded AI document already defines these as the required product routes. fileciteturn6file0

## 6.2 What the assistant must do
The assistant must:
- answer operational questions in natural language
- understand the current route and selected entity
- search records and knowledge
- generate structured answers
- provide links and actions
- show blockers and warnings
- show or trigger recommendation cards

## 6.3 Structured answer format
Every operational answer should return:
1. direct answer
2. steps
3. linked actions
4. blockers or warnings
5. suggested follow-up question

This is already defined in the uploaded AI assistant section and should be preserved. fileciteturn6file5

## 6.4 Context support
The assistant must be aware of:
- current page
- current DZ
- selected athlete
- selected load
- selected tandem or student record
- selected aircraft
- currently visible weather context
- user role

## 6.5 Suggested prompts by role

### Manifest Staff
- Who is blocked from manifest today and why?
- Which loads are underfilled right now?
- Which jumpers can be moved safely to fill Load 4?
- Who on the waitlist should be notified first?
- Which no-shows are most likely today?

### DZ Operator
- What are the main bottlenecks today?
- Which aircraft or staff resources are underused?
- What weather changes may affect the next two hours?
- What is reducing revenue per load today?

### Coach / Instructor
- Which of my assigned athletes are not ready?
- Which students need attention first?
- Which groups match my fly type and skill level?

### Pilot
- What is the current estimate for Load X?
- Has pilot confirmation been completed?
- What changed since the last review?

### Athlete
- Why am I blocked?
- What do I need to do to manifest?
- What loads fit my fly type and level?

---

# 7. Agent Layer

All agents must produce recommendation drafts rather than direct irreversible actions unless the action is explicitly configured as safe and automatic.

## 7.1 Manifest Agent
Responsibilities:
- compute readiness for each jumper
- detect blockers
- detect underfilled loads
- propose reshuffles
- propose grouping by fly type, skill band, and coach fit
- suggest exit order corrections with safety notes
- identify likely no-shows through heuristics
- generate recommendation drafts

This agent is directly aligned with the uploaded AI document’s Manifest Agent definition. fileciteturn6file2

## 7.2 Tandem Ops Agent
Responsibilities:
- manage tandem queue priorities
- detect tandem instructor and camera availability
- suggest tandem scheduling order
- draft reschedule or offload recommendations
- optimize customer waiting time and staff utilization

This is also directly aligned with the uploaded AI planning. fileciteturn6file11

## 7.3 Weather Ops Agent
Responsibilities:
- ingest weather snapshots
- apply DZ-configured thresholds by activity type
- generate warnings such as HOLD_STUDENTS, HOLD_TANDEMS, or HOLD_SPECIFIC_DISCIPLINE
- draft operational reorder plans
- keep explanation and confidence visible
- require approval for safety-impacting changes

This is explicitly described in the uploaded AI document and consistent with the weather module across the SkyLara docs. fileciteturn6file11 fileciteturn6file9

## 7.4 Compliance Agent
Responsibilities:
- waiver expiry or missing waiver
- document validity
- payment gating
- medical review state
- license and rating status
- waiver re-sign requirements
- discipline eligibility blocks
- student progression requirements

This aligns with both the AI document and the platform compliance logic across the DMS files. fileciteturn6file11 fileciteturn5file3

## 7.5 Communications Agent
Responsibilities:
- draft reminders and alerts
- choose channels
- support approval before send
- log delivery
- track failure and retry

This maps to the existing Notifications Center, which already supports push, SMS, and email workflows, and to the communications agent defined in the AI document. fileciteturn6file11 fileciteturn6file9

## 7.6 Ops Insight Agent
Responsibilities:
- daily summaries
- bottlenecks
- staffing suggestions
- no-show patterns
- readiness failure trends
- load efficiency patterns
- anomaly summaries

This aligns with the uploaded AI file and the existing analytics/reporting concepts in the DMS and platform docs. fileciteturn6file11 fileciteturn5file3

## 7.7 Additional recommended agent: Staff Assignment Agent
Add this as an improvement because the uploaded production blueprint already includes staffing recommender behavior. fileciteturn6file16

Responsibilities:
- recommend TI / AFFI / camera / organizer assignments
- detect overload or fatigue-like workload patterns if available
- balance instructor utilization
- preserve certification and assignment rules
- produce staff assignment drafts

## 7.8 Additional recommended agent: Waitlist Agent
Add this as a more explicit operational agent because the platform already has waitlist intelligence and no-show handling. fileciteturn6file13 fileciteturn5file1

Responsibilities:
- rank waitlist athletes
- consider jump type, readiness, timing, and preferences
- notify in correct order
- handle claim windows
- log conversion success rate

---

# 8. Rules and Calculations Layer

This layer must remain deterministic and separate from LLM reasoning.

## 8.1 Readiness rules
Inputs:
- waiver status
- document validity
- payment status
- medical status
- license and rating status
- discipline qualification
- student progression state
- gear and reserve / AAD compliance when relevant
- current load and assignment prerequisites

Outputs:
- READY
- MISSING_WAIVER
- MISSING_DOCS
- PAYMENT_PENDING
- MEDICAL_REVIEW_NEEDED
- QUALIFICATION_BLOCKED
- REVIEW_NEEDED
- BLOCKED

The uploaded AI document already defines these output states, and the DMS docs describe compliance as a gate before manifesting. fileciteturn6file11 fileciteturn6file18

## 8.2 Weather restriction rules
Inputs:
- observed weather snapshot
- forecast snapshot
- DZ thresholds by activity type
- gust factor
- wind limits
- ceiling and visibility
- optional manual override observations

Outputs:
- OK
- WARNING
- HOLD_STUDENTS
- HOLD_TANDEMS
- HOLD_SPECIFIC_DISCIPLINE

The uploaded AI document explicitly defines this. fileciteturn6file11

## 8.3 Grouping rules
Inputs:
- fly type
- skill band
- verified level
- coach notes
- organizer preference
- compatibility constraints
- weather sensitivity
- aircraft and exit order considerations

Outputs:
- compatible grouping suggestions
- conflicts
- ranking scores

## 8.4 Exit order rules
Use deterministic exit-order rules first, then AI validation on top. The uploaded product docs already define an Exit Order Engine and AI validation at lock time, so Claude should not replace this with free-form LLM behavior. fileciteturn5file1 fileciteturn6file16

## 8.5 Prediction scaffolding
Start with heuristics only:
- unpaid status
- unread messages
- prior lateness
- prior no-show patterns
- group commitment signal
- booking recency

Store:
- inputs
- prediction
- actual outcome
- feedback notes

The uploaded AI planning document explicitly says prediction should start as scaffolding and not fake ML. fileciteturn6file10

## 8.6 Aircraft estimate rules
Use deterministic calculation service for:
- estimated payload
- estimated fuel required
- margin band
- assumptions used
- required pilot confirmation step

---

# 9. Fuel Estimate Support and Pilot Confirmation

Fuel Estimate Support must be treated as an estimate engine, not an approval engine.

## 9.1 Inputs
- aircraft type and profile
- empty weight profile
- pilot weight
- fuel on board
- reserve target policy
- jumper count
- jumper weights
- gear assumptions
- field elevation
- target exit altitude
- OAT if available
- expected sortie count or turn count

## 9.2 Outputs
- estimated payload weight
- estimated fuel required
- margin band: OK / WARN / EXCEEDS_ASSUMPTION
- confidence label
- assumptions shown in UI
- pilot confirmation required flag

The uploaded AI document already lists these required inputs and outputs. fileciteturn6file2

## 9.3 Mandatory workflow
1. load is built or modified
2. estimate engine computes support output
3. pilot review panel appears
4. pilot confirms or overrides
5. confirmation record is logged
6. record is attached to the load

## 9.4 UX wording
Use explicit wording:
Operational estimate only. Pilot must review and confirm final fuel, weight, balance, and aircraft performance suitability.

The uploaded AI document already requires this wording concept. fileciteturn6file7

## 9.5 Never allow
- silent AI auto-approval
- load marked aircraft-safe without pilot confirmation
- hidden assumptions
- unlogged override

---

# 10. Data Model

The uploaded AI document already proposes a strong data model. It should be aligned to the modular SkyLara architecture and existing module ownership rules. fileciteturn5file6 fileciteturn6file14

## 10.1 AI core
- ai_conversations
- ai_messages
- ai_prompt_templates
- ai_knowledge_articles
- ai_route_metadata
- ai_entity_search_index
- ai_agent_runs
- ai_agent_findings
- ai_recommendations
- ai_recommendation_actions
- ai_automation_rules
- ai_automation_runs
- ai_prediction_scores
- ai_prediction_actuals
- ai_audit_logs

## 10.2 Operational dependencies
- loads
- load_slots
- load_groups
- waitlist_entries
- tandem_jobs
- student_jobs
- aircraft
- aircraft_performance_profiles
- aircraft_fuel_profiles
- weather_data or weather_snapshots
- weather_holds or weather_rules
- readiness_checks
- waivers
- documents
- payments / wallets / jump_tickets
- athlete profiles
- licenses
- coaching_sessions
- gear items
- pilot_confirmations

## 10.3 Additional recommended tables
Add these because they make the agent system more controllable and production-safe.

### ai_recommendation_targets
Links one recommendation to multiple entities:
- recommendation_id
- target_type
- target_id

### ai_approval_policies
Stores which recommendation categories require which approver role:
- category
- required_role
- requires_reason_on_override
- auto_expire_minutes

### ai_delivery_logs
For communications agent:
- notification job
- channel
- recipient
- status
- provider message id
- retry count
- failure reason

### ai_tool_calls
Persist tool-use details:
- agent_run_id
- tool_name
- input
- output summary
- latency
- success / failure

These additions improve observability and approval governance while fitting the architecture.

---

# 11. Architecture and Module Boundaries

The uploaded architecture files say SkyLara V1 is a modular monolith with typed service interfaces, no cross-module SQL, and events for side effects. AI must follow the same rule. fileciteturn6file14 fileciteturn5file5

## 11.1 AI service responsibilities
The ai module should:
- orchestrate agent runs
- prepare prompt context
- validate structured outputs
- create recommendations
- manage assistant conversations
- call existing service interfaces
- never own core manifest, payment, or identity business logic

## 11.2 Service interface usage
AI must call:
- ManifestService
- IdentityService
- PaymentService
- WeatherService
- NotificationService
- TrainingService
- GearService
- ReportingService

## 11.3 No cross-module SQL
AI should not directly query tables owned by other modules if the platform service boundary already exists.

## 11.4 Event-driven side effects
Use event patterns already defined in the architecture:
- UI events for real-time updates
- reliable streams where appropriate for persistent side effects
- outbox or audit records for important decisions

---

# 12. Routes and UI Surfaces

## 12.1 AI routes
- /dashboard/ai
- /dashboard/ai/assistant
- /dashboard/ai/assistant/[chatId]
- /dashboard/ai/history
- /dashboard/ai/knowledge
- /dashboard/ai/recommendations
- /dashboard/ai/automations
- /dashboard/ai/logs
- /dashboard/ai/settings

## 12.2 Manifest intelligence routes
- /dashboard/manifest
- /dashboard/manifest/readiness
- /dashboard/manifest/load-planner
- /dashboard/manifest/board
- /dashboard/manifest/history
- /dashboard/manifest/insights

## 12.3 Operations routes
- /dashboard/ops/tandems
- /dashboard/ops/students
- /dashboard/ops/weather

## 12.4 Aircraft routes
- /dashboard/aircraft
- /dashboard/aircraft/[id]
- /dashboard/aircraft/[id]/performance
- /dashboard/aircraft/[id]/fuel-profiles
- /dashboard/aircraft/[id]/pilot-confirmations

These routes are directly proposed in the uploaded AI document and fit the multi-dashboard system in the uploaded UX and product docs. fileciteturn6file0 fileciteturn5file2

## 12.5 Recommended additional routes
Add:
- /dashboard/manifest/recommendations
- /dashboard/manifest/waitlist
- /dashboard/ops/staffing
- /dashboard/ops/compliance
- /dashboard/aircraft/[id]/planning-history

These additions make the agent layer easier to operate and review.

---

# 13. UX Rules

The uploaded UX design system already defines aviation-grade clarity, zero cognitive load, mobile-first respect, role dashboards, real-time UX, optimistic UI behavior, and conflict handling. AI must follow those same principles. fileciteturn5file2

## 13.1 UX requirements
- no dead tabs
- no dead buttons
- no placeholder actions in production flows
- no browser popups for critical workflows
- use full pages, side panels, drawers, and real forms
- real-time updates in place
- structured cards for recommendations
- explicit action buttons: Accept, Edit, Reject
- every recommendation shows reasoning
- every critical state shows who must approve

## 13.2 Recommendation card design
Each recommendation card should show:
- title
- severity
- category
- affected records
- why generated
- proposed action
- data points used
- confidence label
- Accept / Edit / Reject
- audit history link

## 13.3 Assistant answer design
Each answer should show:
- answer block
- linked records
- actions
- blocker section
- suggested next question

## 13.4 Mobile behavior
Athlete and manifest staff are both mobile-priority roles in the uploaded product docs, so assistant and recommendations must render cleanly on tablet and phone. fileciteturn5file1 fileciteturn5file2

---

# 14. Approval and Self-Service Model

The uploaded AI document already defines that skydivers can accept suggested slot changes only when ready and not blocked, manifest staff can accept or edit recommendations, safety officers or managers approve bulk reshuffles or holds, and pilots confirm aircraft estimate outputs. fileciteturn6file0

## 14.1 Approval model
### Athlete self-service
Allowed:
- accept safe slot changes
- accept waitlist slot openings
- view blockers
- resolve own actionable blockers if possible

Blocked from:
- bypassing compliance
- bypassing discipline gates
- bypassing grounded or hard-stop states

### Manifest Staff
Allowed:
- accept or edit load-fill and reshuffle suggestions
- send communication batches
- review readiness lists
- override only where policy allows

### Safety Officer / Manager
Required for:
- weather hold enforcement
- bulk reshuffles with safety implications
- overrides of certain compliance recommendations

### Pilot
Required for:
- fuel estimate review
- aircraft suitability confirmation
- explicit override note where needed

## 14.2 Audit requirements
All actions must store:
- actor
- action
- recommendation id
- previous state
- new state
- reason if override or reject
- timestamp

---

# 15. Notification and Communication Infrastructure

The uploaded docs already position push, SMS, email, and in-app notifications as a core platform capability, with role- and trigger-based delivery and tracking. The AI file adds WhatsApp provider support and communications agent behavior. fileciteturn6file9 fileciteturn6file0

## 15.1 Channels
- in-app
- push
- SMS
- email
- WhatsApp when configured

## 15.2 Trigger examples
- waiver missing
- waitlist slot open
- weather hold proposed
- weather hold approved
- boarding notice
- tandem moved earlier
- due payment reminder
- pilot confirmation needed
- recommendation approval requested

## 15.3 Delivery requirements
- delivery logs
- retries
- token hygiene
- per-user preferences
- urgency-based channel selection

---

# 16. Real-World Example Behaviors

These are already described in the uploaded AI document and should be treated as required implementation examples. fileciteturn6file3

## Example 1 — Underfilled load
Detect underfilled Load 4, propose moving compatible angle flyers from Load 6, show reasoning, allow accept/edit/reject, log action.

## Example 2 — Weather shift
Detect rising gust factor or worsening ceiling trend, propose prioritizing tandems and holding students, require manager or safety approval, apply only after approval.

## Example 3 — Wingsuit gate
Block unqualified jumper from wingsuit group, show why, offer alternative group or progression path, log rationale.

## Example 4 — Fuel support
Compute estimate for Load X, show assumptions and margin, require pilot confirm or override before board-ready decision.

## Example 5 — Batch readiness recovery
Manifest staff sees all blocked jumpers, AI drafts reminder batch, staff approves, channels and results are logged.

## Example 6 — Staff overload rebalance
Staff Assignment Agent sees overloaded TI or coach, drafts alternative assignment mix, manifest manager approves.

---

# 17. Fallback Behavior

The uploaded production blueprint explicitly says every AI action must have a fallback if AI is unavailable. fileciteturn6file16

## Required fallback principles
- manifest board never blocks on AI
- risk alerts fall back to deterministic rules
- no AI recommendation means no recommendation, not broken workflow
- assistant degrades to structured search + rule explanations if model is unavailable
- aircraft estimates still work if deterministic engine is available
- recommendations can be regenerated later

---

# 18. Implementation Phases

The uploaded AI document already proposes phases. They should be adjusted slightly to align with the broader platform and reduce integration risk. fileciteturn6file0

## Phase 0 — Audit and alignment
Before coding:
- audit repo
- map reusable service interfaces
- identify existing AI components
- identify existing manifest, weather, and notifications endpoints
- identify schema conflicts
- define exact module ownership

## Phase 1 — Assistant foundation and readiness intelligence
Build:
- assistant routes
- conversation persistence
- knowledge and route metadata
- entity search
- readiness rules engine
- readiness board
- recommendation list UI
- assistant structured response renderer

## Phase 2 — Manifest intelligence and communications
Build:
- Manifest Agent
- waitlist logic integration
- grouping suggestions
- tandem queue suggestions
- Communications Agent
- approval flows for recommendations
- recommendation audit history

## Phase 3 — Weather and aircraft planning
Build:
- weather ingestion integration
- threshold rules UI
- Weather Ops Agent
- aircraft profile planning panel
- fuel estimate support
- pilot confirmation workflow
- audit log

## Phase 4 — Staffing, prediction, and insights
Build:
- Staff Assignment Agent
- Ops Insight Agent
- heuristic prediction scaffolding
- actual-vs-predicted storage
- trend dashboards

## Phase 5 — Hardening and polish
Build:
- QA
- regression coverage
- permission hardening
- performance optimization
- UX cleanup
- duplicate removal
- offline and caching cleanup where needed

---

# 19. Required Output Format for Claude

After each phase Claude must return:
- phase
- scope completed
- files created
- files edited
- schema changes
- service interfaces reused
- new endpoints added
- events reused or added
- routes created
- URLs to test
- QA steps
- issues found
- fixes applied
- persistence verification
- blockers
- next phase

---

# 20. Acceptance Criteria

This implementation is not complete unless:
- assistant routes work and persist
- recommendations are stored in DB
- readiness states are deterministic and visible
- weather recommendations require approval where configured
- aircraft estimate outputs require pilot confirmation
- no safety gate can be bypassed by AI
- notifications deliver through real plumbing
- fallback behavior exists if AI is unavailable
- dashboard and mobile display the same operational truth
- no dead routes, dead tabs, or placeholder actions remain

---

# 21. Claude Implementation Prompt

Use this as the implementation prompt inside Claude Code:

Act as the permanent owner-level CTO, CPO, Principal AI Systems Architect, Principal Aviation Ops Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Rules Engine Architect for SkyLara.

Read:
- CLAUDE.md
- docs/Building_SkyLara_AI_Agents_Master_Implementation.md
- docs/SkyLara_Rig_Maintenance_Complete_Master_File.md
- any existing SkyLara architecture and manifest docs in the repo

Mission:
Build a production-grade AI assistant and agent system inside SkyLara to run manifest and dropzone operations faster, safer, and smarter.

Non-negotiable rules:
- AI may estimate and recommend, but must not auto-approve aircraft loading, fuel, weight and balance, or dispatch suitability
- deterministic safety and compliance gates cannot be bypassed
- weather-aware recommendations must be explainable and human-approvable where safety is impacted
- every recommendation must be explainable, editable, approvable or rejectable, and audited
- do not create duplicate backend logic if reusable service interfaces already exist
- do not mark features done unless browser-verified, DB-persistent, refresh-safe, and regression-tested

Execution rules:
1. Start with audit only unless explicitly told to implement
2. Before coding, list exact files you will create or edit
3. Reuse current module boundaries and service interfaces
4. Keep AI as an embedded layer, not a separate operational platform
5. Return phase-by-phase output with QA and blockers
