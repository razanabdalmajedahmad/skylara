# 00 Master Index Final

## Purpose
This file is the final master implementation and architecture index for SkyLara.

It is the top-level guide for:
- architecture decisions
- codebase audit
- mobile and web implementation sequencing
- migration safety
- cleanup governance
- phase-by-phase delivery

## Absolute Non-Destructive Migration Rule
Do not delete old pages, old routes, old components, old modules, old flows, or old contracts until:
1. the replacement is fully implemented
2. QA is passed
3. migration mapping is confirmed
4. redirects or feature flags are tested
5. rollback path exists
6. imports and references are verified
7. no active feature still depends on the old implementation

## Primary Read Order
Read these first before making architectural or implementation decisions:
1. `docs/00_Master_Index.md`
2. `docs/01_Product_Definition.md`
3. `docs/05_Production_Blueprint.md`
4. `docs/06_System_Architecture.md`
5. `docs/07_Schema_Reference.md`
6. `docs/11_Infrastructure.md`
7. `docs/16_Engineering_Foundation.md`
8. `docs/17_Production_Scale.md`

Then read:
9. `docs/SkyLara_Compiled_Modern_Implementation_Gap_Spec.md`
10. `docs/SkyLara_Expert_Feedback_Integrated_Implementation_Update.md`

For mobile:
11. `docs/SkyLara_Mobile_Master_Build_Process.md`
12. `docs/SkyLara_Mobile_Implementation.md`

For module-specific work, read only the minimum relevant master specs after the core docs.

## Canonical Architecture Deliverables
Always create or maintain these:
- `docs/SkyLara_Final_Architecture_Decision_Document.md`
- `docs/SkyLara_Codebase_Audit.md`
- `docs/SkyLara_Migration_Map.md`
- `docs/SkyLara_Implementation_Phases.md`
- `docs/SkyLara_Module_Tech_Decisions.md`
- `docs/SkyLara_PCI_and_Security_Boundaries.md`
- `docs/SkyLara_File_Disposition_Register.md`

## Final Architecture Decision Document Must Define
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
- data architecture
- offline-first and sync rules
- observability and analytics
- QA and release gates
- cleanup and deprecation policy
- risks and assumptions

## V1 Stack Must Lock Decisions For
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
- admin and ops tooling
- CI/CD
- monitoring
- error tracking

## V2 Scaling Path Must Define
- modular monolith boundaries that remain in place
- service extraction rules
- event-driven boundaries
- queue introduction points
- scaling strategy for reads/writes
- scaling strategy for search/discovery
- scaling strategy for media/files
- scaling strategy for operations/admin workflows

## Security and PCI Boundaries Must Define
- device/app protections
- auth/session controls
- API protections
- data access controls
- file/media protections
- payment boundaries
- tokenization rules
- logging restrictions
- admin controls
- audit trail requirements
- PII handling
- what is in PCI scope
- what must remain outside PCI scope

## Core Module Set
SkyLara architecture and implementation planning must cover:
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

## Mobile App Coverage
Mobile implementation must include:
- navigation architecture
- tab/stack/deep-link plan
- screen grouping by domain
- reusable screen patterns
- list/detail/form/wizard/checkout standards
- state management rules
- offline and draft-save rules
- file/image upload strategy
- analytics events for major journeys

## Phase-by-Phase Delivery Model

### Phase 0: Audit
- inspect docs
- inspect codebase
- inspect routes/modules/models
- inspect legacy vs active systems
- produce audit docs first
- no deletion yet

### Phase 1: Final Architecture Decision
- write architecture decision document
- define V1
- define V2
- define security and PCI boundaries
- define module tech choices
- define first vs later builds

### Phase 2: Target Structure and Migration Map
- define target folders
- define route/component/module migrations
- define adapters
- define feature flags
- define rollback paths
- classify files

### Phase 3: Foundations
- shared UI primitives
- design system
- app shells
- navigation shells
- state patterns
- analytics helpers
- loading/empty/error/success patterns

### Phase 4: Access and Onboarding
- auth
- signup/login/recovery
- onboarding
- branching flows
- preserve legacy paths

### Phase 5: Core Surfaces
- home
- profile
- weather
- logbook/jump logging

### Phase 6: Marketplace and Operations
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
- security pass
- migration validation
- performance review

### Phase 8: Safe Cleanup
- archive proven legacy
- delete only fully proven dead files
- update file disposition register
- preserve rollback safety

## Shared Engineering Rules
- modular monolith for V1
- additive schema changes first
- feature flags for risky rollouts
- reuse before reinvention
- typed contracts and central enums
- no destructive refactors during migration
- one backend truth for web/mobile/dashboard/PWA
- safety-critical server truth over optimistic UI

## Shared QA Rules
Every implemented screen or module must include:
- visual parity check
- loading state
- empty state where applicable
- validation state where applicable
- success state where applicable
- error state
- back/forward navigation tests
- analytics event checks
- state persistence checks
- rollback awareness

## Safe File Cleanup Rules
Every file considered for removal must be:
1. searched for references/imports/usages
2. classified
3. documented in `docs/SkyLara_File_Disposition_Register.md`
4. archived first if uncertain
5. deleted only after proof

Allowed classifications:
- keep
- keep for migration
- merge later
- archive candidate
- delete candidate only after proof

## Required Output Format Before Coding
1. Relevant docs
2. Repo audit summary
3. Existing reusable modules
4. Reusable models and APIs
5. Reusable event hooks
6. Gaps and conflicts
7. Exact files to create or edit
8. Schema changes needed
9. Risks
10. Recommended Phase 1

## Required Output Format After Each Phase
1. Scope implemented
2. Files created
3. Files edited
4. Schema changes
5. APIs reused
6. New APIs added
7. Event hooks reused or added
8. QA steps
9. Blockers
10. Next recommended phase
11. What was preserved
12. What was marked archive/delete candidate
13. What was not deleted yet and why

## Deliverables
- final architecture decision document
- codebase audit
- migration map
- implementation phases plan
- module tech decisions
- PCI and security boundaries
- file disposition register
- safe phase-by-phase execution plan
- mobile and web aligned architecture
