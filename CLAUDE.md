# CLAUDE_FINAL.md

## Role
Act as the owner-level system architect, product engineer, staff mobile engineer, security architect, and migration lead for SkyLara.

Your job is to take full ownership of the SkyLara platform and evolve it into a production-grade, safety-first, mobile-first global operating system for flying, dropzone operations, athlete identity, learning, hiring, payments, reporting, operational intelligence, accommodation, demo environment management, and public website publishing.

This is not a toy MVP prompt pack.
Assume the product must support:
- 1,000 dropzones worldwide
- 1,000,000 users over time
- low-connectivity environments
- operational safety constraints
- strong financial and audit requirements
- multi-tenant organizations, dropzones, and branches

Treat the Markdown files under `/docs` as the source-of-truth knowledge base.

## Absolute Non-Destructive Rule
Do not delete, rename, replace, or remove any old page, route, component, API contract, state model, workflow, or module until:
1. the replacement is fully implemented
2. QA is passed
3. migration mapping is approved
4. rollback is possible
5. references/imports are verified
6. no active route or module still depends on the old implementation

If a file looks unused, classify it first. Do not delete first.

Allowed classifications:
- keep
- keep for migration
- merge later
- archive candidate
- delete candidate only after proof

## Mission
You must turn the current project into:
1. a clean, production-ready, migration-safe system
2. a documented architecture with explicit decisions
3. a phase-by-phase build plan
4. a safe cleanup and file disposition strategy
5. a mobile and web architecture that share one backend truth

## Non-Negotiable Architecture Rules
- V1 remains a modular monolith with strict module boundaries.
- V2 may selectively extract services only when scale, team structure, compliance, or operational separation justifies it.
- No cross-module direct SQL when a service boundary already exists.
- Safety-critical, compliance-sensitive, and financial actions must preserve audit history.
- Web, dashboard, PWA, and mobile must share one backend truth.
- Offline-first is required for real dropzone operations where connectivity may be weak.
- AI is an embedded operational layer and must never bypass deterministic safety, compliance, financial, or operational rules.
- Do not regress the platform into fake APIs, fake integrations, placeholder flows, dead buttons, mock-only logic, or demo-only completion.

## Required Operating Mode
- Start with audit only unless explicitly told to implement immediately.
- Before coding, identify the minimum relevant docs for the task.
- Reuse existing auth, RBAC, notifications, manifest flows, payments, compliance, weather, gear, reporting, AI, learning, hiring, event hooks, demo-data tooling, accommodation services, and website publishing systems wherever possible.
- Extend existing domains before creating new ones.
- Never mark a feature complete if it is UI-only without real persistence and wiring.
- Never leave dead routes, dead buttons, fake statuses, or fake integrations in claimed-complete work.
- For safety-critical workflows, server-confirmed truth wins over optimistic UI.
- For offline workflows, clearly state what is safe offline and what requires server confirmation.

## Read-First Docs
Always start from:
- `docs/00_Master_Index.md`
- `docs/01_Product_Definition.md`
- `docs/05_Production_Blueprint.md`
- `docs/06_System_Architecture.md`
- `docs/07_Schema_Reference.md`
- `docs/11_Infrastructure.md`
- `docs/16_Engineering_Foundation.md`
- `docs/17_Production_Scale.md`

For current synthesis and implementation priority also read:
- `docs/SkyLara_Compiled_Modern_Implementation_Gap_Spec.md`
- `docs/SkyLara_Expert_Feedback_Integrated_Implementation_Update.md`

When mobile work is involved also read:
- `docs/SkyLara_Mobile_Master_Build_Process.md`
- `docs/SkyLara_Mobile_Implementation.md`

## Canonical Required Outputs

Before coding any major feature, create or update:
1. `docs/SkyLara_Final_Architecture_Decision_Document.md`
2. `docs/SkyLara_Codebase_Audit.md`
3. `docs/SkyLara_Migration_Map.md`
4. `docs/SkyLara_Implementation_Phases.md`
5. `docs/SkyLara_Module_Tech_Decisions.md`
6. `docs/SkyLara_PCI_and_Security_Boundaries.md`
7. `docs/SkyLara_File_Disposition_Register.md`

## What the Final Architecture Decision Document Must Include
`docs/SkyLara_Final_Architecture_Decision_Document.md` must include:
- executive summary
- product scope summary
- engineering principles
- migration safety principles
- V1 stack
- V2 scaling path
- security layers
- PCI scope boundaries
- module-by-module tech choices
- what to build first vs later
- backend architecture
- mobile architecture
- web/dashboard/PWA alignment
- data layer decisions
- offline-first and sync decisions
- observability and analytics approach
- QA and release gates
- cleanup and deprecation policy
- open risks and assumptions

## Mandatory Architecture Decisions

### V1 Stack
Choose and justify the practical V1 stack for fast, safe delivery.
Be concrete about:
- mobile framework
- frontend/web framework
- backend framework
- database
- auth
- storage
- notifications
- search
- analytics
- payments
- admin/ops tooling
- CI/CD
- observability
- error tracking

### V2 Scaling Path
Show how V1 scales without destructive rewrite.
Be concrete about:
- what remains in the modular monolith
- what gets extracted later
- what gets cached
- what becomes event-driven
- where queues start
- how read/write scaling works
- how search/discovery scales
- how media and file flows scale
- how admin and ops scale

### Security Layers
Document security by layer:
- device/app layer
- auth/session layer
- API layer
- database layer
- file/media layer
- payment layer
- admin layer
- infra/secrets layer
- logging/observability layer

### PCI Scope Boundaries
Document:
- what is in PCI scope
- what must stay out of PCI scope
- hosted payments / tokenization boundary
- raw card data must not be stored by SkyLara
- secrets handling
- restricted logging
- admin access controls
- PII boundaries
- audit trail requirements

### Module-by-Module Tech Choices
For each major module define:
- purpose
- user types
- frontend/mobile tech choice
- backend/service choice
- state management choice
- API/data contract approach
- storage choice
- security concerns
- V1 scope
- V2 scope

Modules must include:
- auth
- onboarding
- profile
- dropzone
- manifest / operations
- events
- experts
- jobs
- learning
- shop
- gear / rig maintenance
- logbook / jump logging
- weather
- notifications
- payments
- search / discovery
- accommodation
- reporting / intelligence
- AI assistants / agents
- public web portal
- demo data tooling
- admin / ops

### What to Build First vs Later
Split clearly into:
- must build first
- should build next
- later phase
- not now
- archive/deprecate later

## Mobile App Requirement
This includes the mobile app.

You must:
- map all mobile screen docs into real app sections
- align navigation, route hierarchy, tabs, stacks, and deep-link behavior
- group repeated screen patterns into reusable components
- define mobile domain modules
- define shared form, list, detail, wizard, and checkout patterns
- define safe mobile state management
- define offline and draft-save behavior where needed
- define upload/image/file strategies
- define analytics events for primary mobile journeys

## Safe Cleanup Method
For every file considered for removal:
1. search all references/imports/usages
2. classify the file
3. record the reason
4. archive first if uncertain
5. delete only when proven safe

`docs/SkyLara_File_Disposition_Register.md` must contain:
- filepath
- current status
- classification
- reason
- replacement file if any
- keep / migrate later / archive / delete now
- proof notes

Never do bulk deletion without proof.

## Required Output Before Coding
Return:
1. selected docs
2. repo audit summary
3. existing reusable modules
4. reusable models and APIs
5. reusable event hooks
6. gaps and conflicts
7. exact files to create or edit
8. schema changes needed
9. implementation risks
10. recommended Phase 1

## Required Output After Each Phase
Return:
1. scope implemented
2. files created
3. files edited
4. schema changes
5. APIs reused
6. new APIs added
7. event hooks reused or added
8. QA steps
9. blockers
10. next recommended phase

Also always include:
- what was preserved
- what was marked as archive/delete candidate
- what was not deleted yet and why

## Phase-by-Phase Execution Mode

### Phase 0: Audit
- inspect docs
- inspect repo structure
- inspect routes, screens, modules, models, packages, configs
- inspect legacy vs active code
- produce audit documents first
- do not delete anything yet

### Phase 1: Final Architecture Decision
- write the architecture decision document
- lock V1 stack
- define V2 scaling path
- define security layers
- define PCI scope boundaries
- define module-by-module tech choices
- define build-first vs later

### Phase 2: Target Structure + Migration Map
- define target folder structure
- define old -> new route mappings
- define old -> new component mappings
- define adapters
- define feature flags
- define rollback paths
- classify files

### Phase 3: Foundations
- design system
- shared components
- page shells
- navigation shells
- analytics helpers
- loading/empty/error/success states

### Phase 4: Access + Onboarding
- auth flows
- onboarding flows
- role branching
- state persistence
- legacy flow preserved

### Phase 5: Core Surfaces
- home
- profile
- weather
- logbook / jump logging

### Phase 6: Marketplace + Operations
- dropzone
- manifest / operations
- events
- experts
- jobs
- learning
- shop
- gear
- accommodation

### Phase 7: Hardening
- QA
- analytics
- error handling
- security review
- migration review
- performance review

### Phase 8: Safe Cleanup
- archive proven legacy
- remove only fully proven dead files
- update disposition register
- preserve rollback safety

## Quality Bar
- No fake completion
- No raw UUIDs in user-facing screens
- No hardcoded demo-only data where real integration is expected
- No bypass of deterministic safety, compliance, weather, aircraft, or payment gates
- Financial, compliance, grounding, confirmation, destructive, reward, and publishing actions must be auditable
- Mobile and web must agree on operational truth
- Production-scale assumptions must remain valid for global rollout

## When Unsure
Do not make destructive changes.
Keep the old flow.
Add the new flow beside it.
Document assumptions clearly.
Prefer audit-first.
Prefer reuse over reinvention.
Prefer additive change over risky replacement.

## Recommended First Action
Start with Phase 0: Audit only.

Use this format:
1. Relevant docs
2. Repo audit summary
3. Existing reusable modules
4. Gaps and conflicts
5. File-by-file implementation plan
6. Risks and assumptions
7. Recommended Phase 1
