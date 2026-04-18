# SkyLara_Expert_Feedback_Integrated_Implementation_Update.md

# SkyLara Expert Feedback Integrated Implementation Update

## Purpose
This file integrates expert practitioner feedback into the current SkyLara product direction and existing Markdown docs without repeating old ideas or reintroducing outdated concepts.

It is designed to:
- absorb real-world feedback from experienced skydiving operators and instructors
- refine the current SkyLara architecture and workflows
- define full cross-platform flow across backend, web dashboard, PWA, and mobile
- define a rule system that is adjustable per dropzone, branch, and operation from the dashboard
- avoid locking the platform into one global admin rule that does not fit all dropzones
- give Claude Code a strong implementation direction for the missing work

This file should sit alongside:
- `SkyLara_Compiled_Modern_Implementation_Gap_Spec.md`
- `SkyLara_Final_Implementation_Spec.md`
- `SkyLara_ProductionSystems_v1.md`
- `Building_SkyLara_AI_Agents_Master_Implementation.md`
- `SkyLara_Rig_Maintenance_Complete_Master_File.md`

---

# 1. Key expert feedback that must change the product

The instructor feedback surfaced several high-value issues that need to be absorbed into the current design.

## 1.1 Do not hardcode progression language
The feedback notes that AFF or progression structures vary by dropzone and can change often, so wording such as fixed “AFF level” should not be the only model. Instead, the platform should support terms like:
- advance to next level
- repetition
- coaching jump
- evaluation jump

The feedback specifically says the program changes often between DZs and suggests using more flexible language such as “advance to next level or repetition, coaching or evaluation jumps.” fileciteturn14file0

## 1.2 Self-declared status is not enough
The feedback questions whether some status fields are self-regulated and asks who actually checks or verifies them. That means SkyLara must not rely on athlete-declared compliance or progression alone. It should support:
- last verified by
- last verified at
- verification source
- verification expiry or review interval
- trust level: self-declared vs DZ-verified vs governing-body verified

The feedback explicitly asks whether the platform is trusting the dropzone or the fun jumper declaring things and asks for a “last verified by / x day” concept. fileciteturn14file0

## 1.3 Aircraft utilization must be clearly labeled as indicative unless pilot-confirmed
The feedback warns about liability around gross weight utilization and notes that maximum takeoff weight varies with pressure, humidity, and temperature, and that each plane has its own charts. SkyLara therefore must:
- treat gross weight utilization as an operational indicator only
- show an explicit label that the calculation is not final aircraft approval
- require pilot review / confirm / override
- attach assumptions and source inputs to the record

The feedback specifically warns that authorities will look at this after an accident and says to add a warning or indicative label on the calculation. fileciteturn14file0

## 1.4 Private manifest-to-diver communication is essential
The feedback asks whether manifest can send a private push notification to the diver for actions like:
- move to another load
- add money to account
- come see manifest

This should become a first-class operational tool inside SkyLara. fileciteturn14file0

## 1.5 Separate growth engines but keep them integrated
The feedback highlights that sales, booking, check-in, and upsell are major growth engines and could each be apps themselves, but should integrate with DZ administration. This means the platform should stay modular but connected, not collapsed into one messy screen. fileciteturn14file0

---

# 2. Product decisions to lock now

## 2.1 Policy and rules must be configurable per organization, dropzone, and branch
You said clearly that you do not want the admin stuck to one rule while you change from one dropzone to another. The existing architecture already supports organization defaults with branch-level overrides for settings such as pricing, compliance rules, aircraft fleet, operating hours, notification templates, timezone, and currency. fileciteturn15file0turn15file8

SkyLara should therefore implement a hierarchical rules system:

1. platform defaults
2. organization defaults
3. dropzone overrides
4. branch overrides
5. optional operational-day overrides
6. role-based action permissions
7. explicit audit log for every rule change

This avoids one global admin rule for every DZ and matches the current multi-tenancy architecture. fileciteturn15file0turn15file8

## 2.2 Build once, serve all clients
The current architecture already defines one shared API layer for web, mobile, kiosk, and integrations using REST, WebSocket, and tRPC/internal typed boundaries. fileciteturn15file0turn15file9

So the product rule must be:
- one backend truth
- one rules engine
- one event system
- many clients

Web, dashboard, PWA, and mobile must not implement separate business logic for the same operational rules.

## 2.3 CI/CD must cover api + web + mobile together
The current engineering foundation already defines a monorepo with:
- `apps/api`
- `apps/web`
- `apps/mobile`
- shared packages
- GitHub Actions CI/CD
- staging and production deployment flow. fileciteturn15file2turn15file3turn15file4

So the missing product directive is:
every feature spec should assume:
- API contract
- web UI
- mobile UI
- event / notification behavior
- deployment verification
- staging acceptance
- production safety checks

---

# 3. New architecture addition: Rules and Policy Engine

This is the missing layer that ties together your requirement for per-DZ flexibility.

## 3.1 Why this is needed
Today, many of the docs define settings and compliance logic, but your new requirement is stronger:
you want to adjust rules from the dashboard without hardcoding one admin rule across every dropzone.

## 3.2 Core policy hierarchy
Create a `PolicyEngine` / `RulesEngine` domain that supports:

### Global defaults
Used only as starter values, not forced forever.

### Organization policies
For multi-branch groups that want shared defaults.

### Dropzone policies
Main operating profile for each DZ.

### Branch policies
Per-location override for:
- wind limits
- weight limits
- progression terms
- check-in requirements
- notification timing
- pricing
- language labels
- load organizer permissions
- self-manifest rules
- rig/gear enforcement rules

### Operational-day overrides
Temporary same-day changes:
- weather threshold changes
- aircraft configuration changes
- event mode / boogie mode
- student-hold rule
- staffing or coach assignment rule
- temporary stricter verification mode

### Approval and audit
All override actions must capture:
- who changed it
- previous value
- new value
- reason
- effective time window
- scope

## 3.3 What should be rule-configurable from dashboard
At minimum:

### Manifest rules
- self-manifest on/off
- self-manifest allowed disciplines
- waitlist claim window
- load lock timing
- group move permissions
- no-show policy

### Compliance rules
- waiver freshness period
- document requirements
- who can override blocks
- whether self-declared data is accepted
- verification review intervals

### Progression rules
- custom terminology for AFF / coaching / evaluation
- next-level criteria
- repetition criteria
- who can verify progression
- validity period of verification
- which evidence fields are required

### Aircraft rules
- payload estimate labels
- required pilot-confirm step
- what triggers warning vs block
- boarding approval flow

### Notifications rules
- private push allowed types
- fallback to SMS or email
- message templates per DZ
- load call timing
- quiet hours if relevant

### Gear / rig rules
- reserve/AAD enforcement
- maintenance reminder windows
- hard stop vs warning
- last-verified review periods

### Booking / sales / upsell rules
- upsell offers
- package rules
- reschedule rules
- payment deadlines
- group booking logic

---

# 4. Verification model update

The expert feedback makes this mandatory.

## 4.1 Every key operational status must support verification state
Add this pattern to any self-reported or operator-sensitive field:

- status value
- verification_state
- verification_source
- last_verified_by
- last_verified_at
- verification_expires_at
- evidence_note
- evidence_attachment optional

## 4.2 Verification states
- SELF_DECLARED
- DZ_VERIFIED
- STAFF_VERIFIED
- RIGGER_VERIFIED
- INSTRUCTOR_VERIFIED
- PILOT_CONFIRMED
- AUTHORITY_VERIFIED
- EXPIRED
- REVIEW_REQUIRED

## 4.3 Where this should apply
- progression / evaluation status
- coach sign-off
- license status
- gear status
- reserve / AAD review
- qualification for discipline
- aircraft planning confirmation
- waiver freshness when outside standard flow

---

# 5. Aircraft planning update

The instructor feedback strengthens the pilot-authority model already present in the AI planning docs, which say pilot authority is non-negotiable and that fuel and aircraft outputs require explicit pilot confirmation and audit logging. fileciteturn15file11turn15file13turn15file14

## 5.1 New product rule
Any aircraft load panel should display:

- gross weight utilization
- payload estimate
- assumptions
- environmental note
- status label:
  - Indicative
  - Pilot Review Required
  - Pilot Confirmed
  - Pilot Override Logged

## 5.2 Add warning language
Example UI text:
“Operational estimate only. Final suitability depends on aircraft-specific charts, conditions, and pilot review.”

## 5.3 Inputs to include
- temperature
- pressure / density altitude context
- humidity if relevant
- fuel onboard
- pilot weight
- jumper weights
- gear assumptions
- planned altitude
- aircraft profile

## 5.4 Never allow
- automatic final approval from AI
- operator seeing “safe” without pilot confirmation
- hidden assumptions

---

# 6. Private manifest communications feature

This should become an explicit module capability, not a side note.

## 6.1 Use cases
Manifest or staff should be able to send a private operational message to one athlete or a selected group:

- We moved you to another load
- Please add money to your account
- Please see manifest when free
- Gear issue — do not board yet
- Boarding moved earlier
- Coach changed
- Waitlist slot is open
- Weather hold for your group
- Please confirm attendance

## 6.2 Delivery channels
- in-app
- push
- SMS if configured
- WhatsApp if configured

## 6.3 Backend requirements
- notification templates
- ad hoc private message mutation
- delivery logs
- read receipts if supported
- role permissions for who can send what

## 6.4 Dashboard surfaces
- quick action from manifest row
- athlete profile messaging action
- group / load message action
- history log on athlete profile and manifest admin side

---

# 7. Sales, booking, check-in, and upsell flow update

The expert feedback is right that these can feel like separate products. The existing product definition already positions bookings, payments, notifications, and operations as distinct modules. fileciteturn9file0

SkyLara should keep them as separate modules but tie them together through one graph.

## 7.1 Canonical commercial flow
1. acquire lead
2. booking
3. package selection
4. waiver / pre-arrival prep
5. payment / deposit
6. check-in
7. upsell media / add-ons
8. manifest
9. jump
10. post-jump log / story / retention
11. rebook / progression / referral

## 7.2 Product requirement
The dashboard must let each DZ tune:
- upsell offers
- package logic
- lead source tags
- pre-arrival sequence
- reminders
- check-in steps
- post-jump rebooking offers

---

# 8. API architecture updates to require

The system architecture already defines the shared API layer for all clients. fileciteturn15file0turn15file9  
Now lock the missing API groups to support this feedback.

## 8.1 Rules and policy APIs
- GET /api/v1/policies
- GET /api/v1/policies/:scope
- PATCH /api/v1/policies/:scope
- POST /api/v1/policies/overrides
- GET /api/v1/policies/history

## 8.2 Verification APIs
- POST /api/v1/verifications
- PATCH /api/v1/verifications/:id
- GET /api/v1/entities/:type/:id/verifications

## 8.3 Private operational messaging APIs
- POST /api/v1/notifications/private
- POST /api/v1/notifications/load-message
- POST /api/v1/notifications/group-message
- GET /api/v1/notifications/history

## 8.4 Aircraft planning APIs
- POST /api/v1/aircraft/:id/planning-estimate
- POST /api/v1/loads/:id/pilot-confirmation
- GET /api/v1/loads/:id/planning-history

## 8.5 Mobile sync / config APIs
- GET /api/v1/mobile/bootstrap
- GET /api/v1/mobile/policies
- GET /api/v1/mobile/manifest-context
- POST /api/v1/mobile/offline-actions/sync

---

# 9. Dashboard additions to make now

## 9.1 Policy Center
Create:
- `/dashboard/settings/policies`
- `/dashboard/settings/policies/org`
- `/dashboard/settings/policies/dropzone`
- `/dashboard/settings/policies/branch`
- `/dashboard/settings/policies/overrides`
- `/dashboard/settings/policies/history`

This is where you adjust rules per DZ without forcing one global admin behavior.

## 9.2 Verification Center
Create:
- `/dashboard/compliance/verifications`
- `/dashboard/compliance/review-queue`

## 9.3 Private Ops Messaging panel
Add:
- manifest quick message drawer
- athlete messaging drawer
- load/group messaging panel

## 9.4 Aircraft planning panel
Add:
- indicative planning card
- pilot confirmation card
- planning history

---

# 10. CI/CD and full-project connection requirements

The engineering foundation already defines the monorepo and CI/CD pipeline. fileciteturn15file2turn15file3turn15file4  
Now add explicit feature-delivery requirements.

## 10.1 Every feature must ship through this chain
- schema / migration
- API contract
- backend implementation
- web UI
- mobile / PWA behavior
- notification behavior
- permission checks
- tests
- staging deployment
- production readiness check

## 10.2 CI pipeline must verify
- lint
- type-check
- unit tests
- integration tests
- API contract checks
- migration safety
- web build
- mobile type/build checks where applicable
- environment validation
- health check after deploy

## 10.3 Feature toggle / rollout support
For high-risk features:
- use DZ-scoped feature flags
- allow branch-scoped rollout
- audit who enabled it
- allow rollback without redeploy if possible

---

# 11. What this means for the existing docs

This file should not replace the old docs.
It should update and sharpen them.

## Add or reinforce in existing docs
- rules engine / policy hierarchy
- verification model
- private manifest messaging
- indicative aircraft estimate labeling
- branch / DZ configurable terminology for progression
- dashboard policy center
- API groups for rules / verification / planning / messaging
- CI/CD requirement that every feature connects backend + frontend + mobile

---

# 12. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Rules Engine Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Compiled_Modern_Implementation_Gap_Spec.md
- docs/SkyLara_Expert_Feedback_Integrated_Implementation_Update.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Integrate expert practitioner feedback into the existing SkyLara platform without repeating outdated ideas or creating conflicting architecture. Build the missing full flow across backend, web, dashboard, PWA, and mobile, with configurable rules that can be adjusted per organization, dropzone, and branch from the dashboard.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Build one backend truth for web, dashboard, PWA, and mobile.
3. Add a configurable rules and policy engine instead of hardcoded global admin rules.
4. Add verification state for self-declared or operator-sensitive statuses.
5. Treat aircraft planning outputs as indicative until pilot confirmed.
6. Add private manifest-to-athlete operational messaging.
7. Ensure each feature ships with API, frontend, mobile behavior, permission checks, and CI/CD coverage.
8. Do not mark a feature complete unless it is persistent, wired, tested, and operationally usable.

Start with audit only, no coding.

Return:
1. selected docs for this task
2. reusable models, APIs, event hooks, and settings systems already in the repo
3. missing work required to integrate this expert feedback
4. outdated or conflicting implementations that should be removed or merged
5. exact files to create or edit
6. schema changes needed
7. API groups to add
8. dashboard routes and UI pieces to add
9. CI/CD and testing updates required
10. implementation risks

After the audit, implement one phase at a time and report:
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
```

---

# 13. Suggested repo filename

Use:
`docs/SkyLara_Expert_Feedback_Integrated_Implementation_Update.md`
