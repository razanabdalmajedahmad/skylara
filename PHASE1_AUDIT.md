# PHASE 1 — FULL REPO AUDIT vs. 20 SOURCE DOCUMENTS

**Date:** April 8, 2026
**Auditor Perspective:** CEO/CTO/CPO/CMO — 20yr aviation-grade SaaS experience
**Canonical Truth Priority:** Final_Implementation_Spec > Production_Blueprint > System_Architecture > Schema_Reference > Engineering_Foundation

---

## A. EXECUTIVE SUMMARY

SkyLara's codebase is a legitimate foundation — not a prototype. It has 52 Prisma models, 30 enums, ~120 API endpoints across 18 route files, 37 frontend pages, 7 backend services, a working offline-first sync engine with IndexedDB, WebSocket rooms per dropzone, a CG calculator, safety validation gates, a role-hierarchy authorization system, tenant isolation middleware, Stripe Connect integration, and 3 Vitest test suites. Seed data simulates a realistic Saturday at "SkyHigh DZ — Perris" with 13 staff, 30+ athletes, 3 aircraft, 12 loads, and 140+ slots.

**However, the gap between docs and code is structural, not cosmetic.**

The documents specify 75 database tables, 13 bounded modules, 11 load FSM states, a 9-group exit order algorithm, an instructor skill-matching engine, a full AFF progression system, a booking/reservation system, a localization layer for 15 languages, a social/story platform, a marketplace, and aviation-grade equipment tracking. The code has 52 tables, 8 FSM states (missing the 3 timer states that define DZ operational rhythm), no instructor system, no AFF progression, no booking system, no localization, no social features, no marketplace, and the CG gate is implemented as a calculator but NOT wired as a blocking FSM gate.

**The API currently cannot start** due to missing npm dependencies and database connectivity issues on the developer's local machine.

**Verdict: ~35% feature-complete. Foundation is strong. Operational core is missing. Not pilot-ready.**

---

## B. CANONICAL ARCHITECTURE (Current Repo)

```
skylara/ (monorepo — npm workspaces + Turborepo)
├── apps/
│   ├── api/                  # Fastify 4.x + TypeScript
│   │   ├── src/
│   │   │   ├── index.ts          # Entry: Fastify + plugins + routes
│   │   │   ├── plugins/          # prisma, auth, websocket, notifications
│   │   │   ├── middleware/       # authenticate, authorize, tenantScope
│   │   │   ├── routes/           # 18 route files (~120 endpoints)
│   │   │   ├── services/         # 7 services (audit, CG, email, FSM, gates, notification, payment)
│   │   │   ├── utils/            # env, errors, jwt, password, passwordValidation
│   │   │   └── declarations.d.ts # Type stubs for missing packages
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                  # Next.js 14 + React 18 + Tailwind
│       ├── src/
│       │   ├── app/              # 37 pages (App Router)
│       │   ├── components/       # Shared UI components
│       │   ├── hooks/            # 6 custom hooks (auth, manifest, offline, websocket, assistant, walkthrough)
│       │   └── lib/              # api client, constants, offlineDb, syncEngine
│       ├── next.config.mjs
│       └── package.json
├── packages/                 # 6 shared packages
│   ├── config/               # Shared env/feature flags
│   ├── types/                # Shared TS types
│   ├── ui/                   # Reusable components
│   ├── knowledge-base/       # Help content
│   ├── portal-assistant/     # AI assistant logic
│   └── walkthroughs/         # Guided tours
├── prisma/
│   ├── schema.prisma         # 52 models, 30 enums
│   ├── migrations/           # Single 0001_init migration
│   ├── seed.ts               # Main seed (staff, aircraft, loads, slots)
│   └── seedSupport.ts        # Help articles, tours, assistant suggestions
├── docker-compose.yml        # Production (MySQL + Redis + API + Web)
├── docker-compose.dev.yml    # Dev (MySQL + Redis only)
├── .env                      # MySQL connection, JWT, CORS, port config
└── package.json              # Root workspace config
```

**Tech Stack:** Node 20, TypeScript 5, Fastify 4, Prisma 5, Next.js 14, React 18, TanStack Query 5, Tailwind 3, Vitest, Stripe Connect, WebSocket (@fastify/websocket), PWA (next-pwa)

---

## C. ROLE COVERAGE MATRIX

| Role | Doc Defined | DB Seeded | Auth Works | Has Dashboard | Has Workflow | API Coverage | Verdict |
|------|------------|-----------|------------|---------------|-------------|-------------|---------|
| Platform Admin | Yes | Yes | Yes | Generic | User/DZ mgmt | admin.ts | **Partial** |
| DZ Owner | Yes | Merged w/ DZ Manager | Yes | Generic | Settings only | admin.ts | **Partial** |
| DZ Manager | Yes | Yes (admin@skylara.dev) | Yes | Generic | Staff, loads | manifest + admin | **Partial** |
| Manifest Staff | Yes | Yes (manifest@skylara.dev) | Yes | Generic | Load list only | manifest.ts | **Partial** — no real load board |
| Tandem Instructor | Yes | Yes (coach1) | Yes | **None** | **None** | **None** | **Missing** |
| AFF Instructor | Yes | Merged w/ coach | Yes | **None** | **None** | **None** | **Missing** |
| Coach | Yes | Yes | Yes | **None** | **None** | **None** | **Missing** |
| Pilot | Yes | Yes (pilot@skylara.dev) | Yes | Minimal page | **None** | **None** | **Stub** |
| Rigger / S&TA | Yes | Yes (safety@skylara.dev) | Yes | Generic | Gear list only | gear.ts | **Partial** |
| Licensed Athlete | Yes | Yes (athlete1-20) | Yes | Generic | **None** | identity.ts | **Partial** |
| Student | Yes | Yes | Yes | Onboarding only | **None** | onboarding.ts | **Partial** |
| Spectator | Yes | No | No | **None** | **None** | **None** | **Missing** |

---

## D. MODULE COVERAGE MATRIX

| Module | Doc Status | Schema | API | Service | UI | Seed | Offline | Verdict |
|--------|-----------|--------|-----|---------|----|----|---------|---------|
| Auth & Identity | Full spec | User, Role, UserRole, Passkey, OAuth, MFA, LoginAttempt | auth.ts + authAdvanced.ts (12 endpoints) | jwt, password utils | Login, Register, Forgot/Reset | Yes | No | **Implemented** |
| RBAC & Permissions | Full spec | UserRole, Role | authorize middleware | Role hierarchy | None (middleware only) | Yes | No | **Partial** — no permission UI, no custom roles |
| Manifest & Loads | Full spec | Load, Slot, Group | manifest.ts (10 endpoints) | loadFsm.ts | /manifest, /manifest/[id] | Yes (12 loads) | Yes (IndexedDB) | **Partial** — 8/11 FSM states, no load board UX |
| Check-In & Compliance | Full spec | WaiverSignature, GearCheck | identity.ts (check-in) | validationGates.ts | /checkin | Partial | Yes | **Partial** — gates exist, no 8-point UI grid |
| Safety & Emergency | Full spec | EmergencyProfile, Incident | safety.ts (4 endpoints) | None | /emergency, /incidents (stub) | Partial | Yes (emergency cached) | **Partial** — no risk assessment, no off-landing |
| Athlete Identity & Logbook | Full spec | User, UserProfile | identity.ts | None | /profile | Yes | No | **Partial** — no License, no Logbook, no Currency model |
| Payments & Wallet | Full spec | Wallet, JumpTicket, Transaction, Stripe*, PaymentIntent, Split, Payout, Ledger | payments.ts + paymentsAdvanced.ts (10 endpoints) | paymentService.ts | /wallet, /payments | Yes | No | **Mostly Implemented** |
| Booking & Scheduling | Full spec | **None** | **None** | **None** | /bookings (empty) | No | No | **Missing** |
| Notifications & Comms | Full spec | Notification, Template, Delivery, Webhook | notifications.ts + Advanced (13 endpoints) | notificationService.ts (30+ events) | /notifications (stub) | Partial | No | **Implemented** (backend) / **Partial** (UI) |
| Weather & Airspace | Full spec | **None** | weather.ts (mock) | None | /weather (stub) | No | No | **Stub** |
| Aircraft & Pilot Mgmt | Full spec | Aircraft | admin.ts (aircraft list) | None | /aircraft | Yes (3 planes) | No | **Partial** — no pilot profiles, no maintenance |
| CG & Weight-Balance | Full spec | Fields on Load | None (standalone calculator) | cgCalculator.ts | None | No | No | **Partial** — calculator works, no API, no FSM gate |
| Equipment & Gear | Full spec | GearItem, GearCheck | gear.ts (6 endpoints) | None | /gear | Yes | Yes | **Partial** — no rental, no repack queue |
| Reserve Repack & AAD | Full spec | Fields on GearItem | None | None | None | No | No | **Missing** — fields exist but no enforcement |
| Gear Rental & Assignment | Full spec | **None** | **None** | **None** | **None** | No | No | **Missing** |
| Training & AFF | Full spec | **None** | **None** | **None** | /courses (empty) | No | No | **Missing** |
| Instructor System | Full spec | **None** | **None** | **None** | **None** | No | No | **Missing** |
| Reporting & Intelligence | Full spec | ReportDashboard, ReportBlock | reports.ts + reportBuilder.ts | None | /report-builder | No | No | **Partial** — CRUD only, no real data queries |
| Story & Social | Full spec | **None** | **None** | **None** | **None** | No | No | **Missing** |
| Shop & Marketplace | Full spec | **None** | **None** | **None** | **None** | No | No | **Missing** |
| Multi-DZ & Admin | Full spec | Organization, Dropzone, DzBranch | admin.ts | tenantScope middleware | /staff | Yes | No | **Partial** |
| Offline & Sync | Full spec | SyncOutbox | sync.ts (3 endpoints) | syncEngine (client) | Hooks + offline status | No | **Yes** | **Implemented** (client) / **Partial** (server) |
| Migration & Import | Full spec | **None** | **None** | **None** | **None** | No | No | **Missing** |

---

## E. DASHBOARD & SCREEN COVERAGE

| Screen | Doc Required | Route Exists | Backend Connected | Role-Aware | Verdict |
|--------|-------------|-------------|-------------------|------------|---------|
| Login | Yes | /login | Yes (auth API) | N/A | **Done** |
| Register | Yes | /register | Yes | N/A | **Done** |
| Forgot/Reset Password | Yes | /forgot-password, /reset-password | Yes | N/A | **Done** |
| **DZ Operator Dashboard** | Yes (hero metrics, revenue, staff, AI) | /dashboard | Generic page | No | **Missing** — no metrics, no revenue chart |
| **Manifest Load Board** | Yes (real-time grid, drag-drop, timers) | /dashboard/manifest | List only | No | **Missing** — no grid, no timers, no drag-drop |
| **Load Detail / Slot Sheet** | Yes (slots, exit order, CG) | /dashboard/manifest/[loadId] | Basic | No | **Partial** — no CG modal, no exit order |
| **Check-In Screen** | Yes (8-point compliance grid) | /dashboard/checkin | Minimal | No | **Missing** — no compliance grid |
| **Athlete Home** | Yes (load board, logbook, wallet) | /dashboard | Generic | No | **Missing** |
| **Digital Logbook** | Yes | /dashboard/logbook | **No backend** | No | **Missing** |
| **Instructor Dashboard** | Yes (assignments, students, earnings) | **None** | **None** | No | **Missing** |
| **AFF Progression** | Yes (L1-8 tracking, evaluation) | **None** | **None** | No | **Missing** |
| **Pilot View** | Yes (CG sheet, flight log) | /dashboard/pilot | Minimal | No | **Stub** |
| **Gear Inventory** | Yes | /dashboard/gear | Yes | No | **Partial** |
| **Repack Queue** | Yes | **None** | **None** | No | **Missing** |
| **Emergency Profile** | Yes | /dashboard/emergency | Yes | No | **Partial** |
| **Incident Report** | Yes | /dashboard/incidents (stub) | Basic | No | **Partial** |
| **Wallet & Payments** | Yes | /dashboard/wallet, /payments | Yes | No | **Implemented** |
| **Booking / Reservation** | Yes | /dashboard/bookings | **No backend** | No | **Missing** |
| **Weather Board** | Yes | /dashboard/weather | Mock only | No | **Stub** |
| **Report Builder** | Yes | /dashboard/report-builder | CRUD only | No | **Partial** |
| **Staff Management** | Yes | /dashboard/staff | Basic | No | **Partial** |
| **Notifications** | Yes | /dashboard/notifications (stub) | Yes | No | **Partial** |
| **Onboarding Flow** | Yes | (within dashboard) | Yes | Role-aware | **Implemented** |
| **AI Assistant** | Yes | /dashboard/assistant-chat | Yes | No | **Implemented** |
| **Profile / Settings** | Yes | /dashboard/profile, /settings | Yes | No | **Implemented** |
| **Platform Admin Panel** | Yes (network KPIs, DZ health map) | **None** | **None** | No | **Missing** |
| **End-of-Day Reconciliation** | Yes | /dashboard/end-of-day | Stub | No | **Stub** |
| **Gift Cards** | Yes | /dashboard/gift-cards | Stub | No | **Stub** |

---

## F. DATABASE COVERAGE (75 Doc Tables vs. 52 Schema Models)

### IMPLEMENTED (52 models — green)

Auth: User, UserProfile, Role, UserRole, RefreshToken, PasswordResetToken, Passkey, OAuthAccount, MfaDevice, LoginAttempt
Tenant: Organization, Dropzone, DzBranch
Operations: Aircraft, Load, Slot, Group, GroupMember
Safety: Waiver, WaiverSignature, EmergencyProfile, Incident, GearItem, GearCheck
Financial: Wallet, JumpTicket, Transaction, StripeAccount, PaymentIntent, PaymentSplit, Payout, LedgerEntry
Notifications: Notification, NotificationTemplate, NotificationDelivery, Webhook
Audit/Sync: AuditLog, SyncOutbox, QrToken
Onboarding: OnboardingSession, HelpArticle, FeatureRegistry, GuidedTour, GuidedTourStep, UserTourProgress
AI/Reports: AssistantConversation, AssistantQuery, AssistantSuggestion, AssistantFeedback, ReportDashboard, ReportBlock
Other: IdeaNote

### MISSING (23 tables — red)

| Missing Table | Doc Source | Criticality | Blocks |
|--------------|-----------|-------------|--------|
| cg_checks | Schema_Reference §3.4 | **CRITICAL** | Safety: CG audit trail |
| waitlist_entries | Schema_Reference §3.4 | HIGH | Manifest operations |
| load_notes | Schema_Reference §3.4 | LOW | UX |
| licenses | Schema_Reference §3.5 | **CRITICAL** | Legal compliance |
| uspa_verifications | Schema_Reference §3.5 | HIGH | Compliance |
| currency_checks | Schema_Reference §3.5 | **CRITICAL** | Safety gate |
| logbook_entries | Schema_Reference §3.5 | **CRITICAL** | Core athlete feature |
| aff_records | Schema_Reference §3.5 | **CRITICAL** | Training operations |
| gear_rentals | Schema_Reference §3.6 | MEDIUM | Gear rental ops |
| risk_assessments | Schema_Reference §3.6 | HIGH | Safety |
| incident_involved_parties | Schema_Reference §3.6 | MEDIUM | Compliance |
| gift_cards | Schema_Reference §3.7 | LOW | Revenue |
| event_outbox | Schema_Reference §3.7 | **CRITICAL** | Financial reliability |
| booking_packages | Schema_Reference §3.8 | **CRITICAL** | Booking system |
| bookings | Schema_Reference §3.8 | **CRITICAL** | Booking system |
| instructor_skill_types | Schema_Reference §3.11 | **CRITICAL** | Instructor matching |
| instructor_skills | Schema_Reference §3.11 | **CRITICAL** | Instructor matching |
| coaching_types | Schema_Reference §3.11 | **CRITICAL** | Coaching system |
| coaching_sessions | Schema_Reference §3.11 | HIGH | Coaching system |
| instructor_availability | Schema_Reference §3.11 | HIGH | Scheduling |
| instructor_assignments | Schema_Reference §3.11 | **CRITICAL** | Manifest ops |
| booking_requests | Schema_Reference §3.11 | MEDIUM | Approval flow |
| languages + translations + currencies + dz_locale_settings | Schema_Reference §3.13 | MEDIUM | Localization |

### ENUM GAPS

| Enum | Doc Values | Code Values | Gap |
|------|-----------|-------------|-----|
| LoadStatus | 11 states (incl. THIRTY_MIN, TWENTY_MIN, TEN_MIN) | 8 states | **Missing 3 timer states** |
| SlotType | TANDEM, AFF L1-8, COACH, BELLY/RW, FREEFLY, WINGSUIT, CRW, HOP_POP | FUN, TANDEM_*, AFF_*, COACH, CAMERA, WINGSUIT, HOP_N_POP | Partial — no CRW, no per-level AFF |
| JumpType (not an enum) | Docs define separate JumpType | Code uses SlotType for both | **Naming conflict** |

---

## G. API COVERAGE

| API Namespace | Doc Endpoints | Implemented | Missing |
|--------------|--------------|-------------|---------|
| /auth | 12 | 12 | None |
| /identity | 6 | 4 | Logbook, License verify |
| /manifest | 15 | 10 | CG check, exit order, timer transitions, waitlist, boarding confirm |
| /payments | 10 | 10 | None |
| /booking | 6 | 0 | **All** |
| /training | 8 | 0 | **All** |
| /instructor | 5 | 0 | **All** |
| /gear | 8 | 6 | Rental, repack queue |
| /safety | 6 | 4 | Risk assessment, off-landing |
| /weather | 3 | 1 (mock) | Real API, weather holds |
| /notifications | 13 | 13 | None |
| /admin | 10 | 8 | DZ health, platform metrics |
| /reports | 8 | 4 | Real aggregations |
| /sync | 3 | 3 | None |
| /onboarding | 4 | 4 | None |

**Summary: ~75 of ~120 documented endpoints implemented (62%). Critical gaps in booking, training, instructor.**

---

## H. REALTIME / WEBSOCKET COVERAGE

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| WebSocket server | Yes | Implemented (plugins/websocket.ts) |
| Dropzone rooms | Yes | Implemented (keyed by dzId) |
| JWT auth on WS | Yes | **TODO** — noted in code |
| Load board live updates | Yes | broadcastToDropzone exists, **not wired to FSM** |
| Slot change events | Yes | **Not implemented** |
| Timer countdown sync | Yes | **Not implemented** |
| Call time notifications | Yes | **Not implemented** |
| Weather hold broadcast | Yes | **Not implemented** |

---

## I. OFFLINE-FIRST COVERAGE

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| IndexedDB stores | Yes | **Implemented** (7 stores: loads, slots, users, gearChecks, syncOutbox, emergencyProfiles, helpArticles) |
| Push/pull sync engine | Yes | **Implemented** (syncEngine.ts with delta sync) |
| Conflict resolution | Yes | **Implemented** (LOCAL/SERVER/MANUAL strategies) |
| Idempotency keys | Yes | **Implemented** (UUID per outbox entry) |
| Exponential backoff | Yes | **Implemented** (1s → 60s, 7 retries) |
| Emergency profile cached | Yes | **Implemented** |
| Manifest ops offline | Yes | IndexedDB store exists, **mutations not wired** |
| Payments blocked offline | Yes | **Not enforced** |
| Sync status UI | Yes | useOffline hook exists, **no visible indicator** |

---

## J. SAFETY-CRITICAL GAP ANALYSIS

| Safety Gate | Doc Requirement | Code Reality | Risk |
|------------|----------------|-------------|------|
| CG blocking FSM | LOCKED→30MIN requires CG PASS | Calculator exists in cgCalculator.ts. **NOT wired as FSM gate.** No CgCheck model for audit trail. | **CRITICAL** — aircraft could fly over weight limits |
| License currency | 90-day A/B, 180-day student, blocks manifesting | validationGates checks 90-day based on slot history. **No License model** — cannot verify license type/level. | **CRITICAL** — unlicensed people could be manifested |
| Waiver gate | Signed waiver required before manifesting | validationGates.validateWaiverCurrent implemented. | **OK** — implemented |
| Gear check gate | Check <30 days, PASS result | validationGates.validateGearCheck implemented with 30-day staleness. | **OK** — implemented |
| Reserve repack | 180-day cycle, auto-warnings at 30/7/1 day | GearItem.nextRepackDue field exists. **No enforcement or notifications.** | **HIGH** |
| AAD expiry | Block if fired/expired | GearItem.aadFiresRemaining field exists. **No enforcement.** | **HIGH** |
| Exit order | 9-group algorithm, 5s minimum separation | **Not implemented** | **MEDIUM** — operational, not safety-critical for MVP |
| Emergency offline | Profile accessible without internet | IndexedDB store for emergencyProfiles. **Implemented.** | **OK** |
| Incident capture | Immediate admin notification, evidence chain | Incident model exists. **No automatic notification trigger. No evidence chain.** | **MEDIUM** |
| Weather hold | Auto-hold when wind exceeds limit | **Not implemented** | **HIGH** for windy DZs |

---

## K. AVIATION / AIRCRAFT / PILOT / FUEL GAP

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| Aircraft registry | Yes | Aircraft model with registration, type, capacity, weight, status. **Implemented.** |
| Pilot profiles | Yes | **Missing** — no PilotProfile, no certifications, no medical |
| Pilot currency/duty | Yes | **Missing** |
| Airworthiness tracking | Yes | **Missing** — no maintenance log model |
| Maintenance schedule | Yes | **Missing** |
| Fuel planning | Yes | CG calculator takes fuelWeight param. **No fuel tracking model.** |
| NOTAM integration | Yes | **Missing** |
| ATC notification | Yes | **Missing** |
| Flight logging | Yes | **Missing** — no FlightLog model |

---

## L. EQUIPMENT / RESERVE / AAD / RENTAL GAP

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| Gear inventory | Yes | GearItem model. **Implemented.** |
| Gear checks | Yes | GearCheck model. **Implemented.** |
| Reserve repack tracking | Yes | nextRepackDue field on GearItem. **No enforcement or queue.** |
| AAD monitoring | Yes | aadFiresRemaining field. **No alerts or blocking.** |
| Gear rental system | Yes | isRental field on GearItem. **No GearRental model, no rental flow.** |
| Gear assignment per jumper | Yes | ownerId on GearItem. **No per-load assignment.** |
| Maintenance alerts | Yes | **Not implemented** |

---

## M. TRAINING / AFF / PROGRESSION GAP

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| AFF progression (L1-8) | Yes | **Missing** — no AffRecord model, no API, no UI |
| Instructor sign-off | Yes | **Missing** |
| Skill assessments | Yes | **Missing** |
| Coaching sessions | Yes | **Missing** — no CoachingSession model |
| Instructor skill matching | Yes | **Missing** — no InstructorSkill model |
| Instructor availability | Yes | **Missing** |
| Student progression board | Yes | **Missing** |
| Training module content | Yes | **Missing** — /courses page is empty |

---

## N. REPORTING / INTELLIGENCE GAP

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| Revenue reports | Yes | reports.ts has endpoint. **Returns mock/empty data.** |
| Load utilization | Yes | **Not implemented** |
| Instructor workload | Yes | **Not implemented** |
| Athlete cohort analysis | Yes | **Not implemented** |
| Report builder (drag-drop) | Yes | ReportDashboard + ReportBlock models + CRUD. **No real query execution.** |
| Nightly aggregation (BullMQ) | Yes | **Not implemented** — no job queue |
| Materialized views | Yes | **Not implemented** |
| Churn prediction | Yes | **Not implemented** |
| Export (CSV/JSON) | Yes | **Not implemented** |

---

## O. REVENUE / MONETIZATION GAP

| Feature | Doc Spec | Code Status |
|---------|----------|-------------|
| Booking commissions | Yes (3-8% by type) | **Missing** — no booking system |
| Instructor/coach fees | Yes (70-80% splits) | PaymentSplit model exists. **Not wired to instructor flow.** |
| Subscription tiers | Yes (Free/Starter/Pro/Enterprise) | Organization.subscriptionTier field. **No billing flow.** |
| Jump ticket packages | Yes | JumpTicket model. **Implemented.** |
| Wallet system | Yes | Wallet + Transaction models. **Implemented.** |
| P2P slot resale | Yes | **Missing** |
| Gift cards | Yes | **Missing** — no model |
| Media sales | Yes | **Missing** |
| Shop/marketplace | Yes | **Missing** — no models |
| EOD reconciliation | Yes | /end-of-day page exists. **No backend.** |

---

## P. NAMING CONFLICTS & DUPLICATES

| Concept | Doc Name | Code Name | Conflict | Resolution |
|---------|----------|-----------|----------|------------|
| Jumper/Athlete | `athletes` table | `User` model | Docs assume separate athlete entity | **Keep User** — add athlete fields (licenseLevel, totalJumps, homeDropzoneId, uspaMemberId) |
| Jump type vs Slot type | `jump_type` enum | `SlotType` enum | Docs use jump_type for the activity, slot_type for the seat | **Add JumpType enum**, keep SlotType for seat configuration |
| Timer states | THIRTY_MIN, TWENTY_MIN, TEN_MIN | Not in LoadStatus | 3 states missing from enum | **Add to LoadStatus enum** |
| CG verification | `cg_checks` (separate table, append-only) | Fields on Load model (cgPosition) | Docs require audit trail | **Create CgCheck model**, keep load.cgPosition as cached value |
| Instructor profiles | `instructor_skills`, `instructor_skill_types` | Nothing | Completely absent | **Create InstructorProfile + InstructorSkill** |
| Emergency profiles | `emergency_profiles` with full medical | EmergencyProfile (basic) | Missing: weight, height, physician, insurance group | **Extend EmergencyProfile** |
| Notification events | 40+ typed events | NotificationType enum (17 values) | Code has far fewer event types | **Expand enum** to match docs |
| Auth challenge store | In-memory Map | In-memory Map in authAdvanced.ts | Memory-only; lost on restart | **Move to Redis or DB** for production |

---

## Q. CANONICAL SOURCE-OF-TRUTH RECOMMENDATION

Based on document priority order and codebase reality:

1. **Schema truth:** Schema_Reference (07) defines 75 tables. Current schema has 52. The 23 missing tables must be added. Where code has models not in docs (AssistantConversation, IdeaNote, etc.), keep them — they're additive.

2. **FSM truth:** Production_Blueprint (05) + Operational_System (08) define 11 states. Code has 8. Add THIRTY_MIN, TWENTY_MIN, TEN_MIN. The CG gate is defined in all docs as a HARD BLOCKING GATE on LOCKED→THIRTY_MIN.

3. **Role truth:** Infrastructure (11) defines 8-level hierarchy. Code implements this correctly in authorize.ts. Extend with instructor sub-roles.

4. **API truth:** Engineering_Foundation (16) defines endpoint contracts. Use as canonical API design.

5. **Safety truth:** All docs agree on 5 blocking gates: CG, License, Waiver, Gear, Currency. Code implements 3 of 5 (waiver, gear, currency). Add CG gate and license verification.

6. **Event truth:** Production_Blueprint (05) defines transactional outbox pattern. Code has no EventOutbox. Must add.

7. **Offline truth:** Final_Implementation_Spec defines 3-tier model. Code implements Tier 1 (manifest) client-side. Server sync endpoints exist. Strategy is sound.

---

## R. PRIORITY BACKLOG

### P0 — BLOCKS PILOT LAUNCH (Must do before any real DZ tests)

| # | Item | Type | Effort |
|---|------|------|--------|
| P0.1 | Fix API startup (missing deps, DB connection) | Bug | 1 day |
| P0.2 | Add 3 timer LoadStatus states (THIRTY_MIN, TWENTY_MIN, TEN_MIN) | Schema + FSM | 1 day |
| P0.3 | Create CgCheck model + API + FSM blocking gate | Schema + API + Service | 2 days |
| P0.4 | Create License + CurrencyCheck models + enforcement | Schema + API + Service | 2 days |
| P0.5 | Create LogbookEntry model + API + auto-create on JUMPED | Schema + API | 1 day |
| P0.6 | Create InstructorProfile + InstructorSkill + InstructorAssignment | Schema + API | 2 days |
| P0.7 | Create Booking + BookingPackage models + API | Schema + API | 2 days |
| P0.8 | Create AffRecord model + basic progression API | Schema + API | 1 day |
| P0.9 | Create EventOutbox model + relay service | Schema + Service | 1 day |
| P0.10 | Create WaitlistEntry model + API | Schema + API | 1 day |
| P0.11 | Wire CG calculator to manifest FSM as blocking gate | Service | 1 day |
| P0.12 | Role-specific dashboard rendering (DZ Mgr / Manifest / Athlete) | UI | 3 days |
| P0.13 | Load board real-time grid with timer states | UI + WebSocket | 3 days |
| P0.14 | Check-in compliance grid (8-point) | UI + API | 2 days |
| P0.15 | Seed data for all new models | Seed | 1 day |

**Total P0 estimate: ~24 dev-days**

### P1 — OPERATIONS HARDENING

| # | Item | Effort |
|---|------|--------|
| P1.1 | Exit order algorithm (9-group) | 2 days |
| P1.2 | Weather API integration + WeatherHold model | 2 days |
| P1.3 | Reserve repack enforcement + notification alerts | 1 day |
| P1.4 | AAD expiry blocking | 1 day |
| P1.5 | Gear rental model + flow | 2 days |
| P1.6 | Risk assessment model + API | 2 days |
| P1.7 | Instructor availability + scheduling | 2 days |
| P1.8 | AFF evaluation form + level sign-off | 2 days |
| P1.9 | Pilot profile + duty tracking | 1 day |
| P1.10 | Aircraft maintenance log | 1 day |
| P1.11 | Real reporting queries (revenue, utilization) | 3 days |
| P1.12 | EOD reconciliation flow | 2 days |
| P1.13 | WebSocket JWT auth + event wiring | 1 day |
| P1.14 | BullMQ for timer transitions + nightly jobs | 2 days |

### P2 — COMMERCIAL & GROWTH

| # | Item |
|---|------|
| P2.1 | Localization system (15 languages) |
| P2.2 | Gift cards |
| P2.3 | P2P slot resale |
| P2.4 | Media sales |
| P2.5 | Shop/marketplace |
| P2.6 | Story/social features |
| P2.7 | Subscription billing |
| P2.8 | Migration tool from Burble/ManifestPro |
| P2.9 | React Native mobile app |
| P2.10 | AI load optimizer |

---

## S. EXACT FILES TO CREATE OR UPDATE NEXT (Phase 3+)

### Schema (prisma/schema.prisma)
```
UPDATE: Add THIRTY_MIN, TWENTY_MIN, TEN_MIN to LoadStatus enum
ADD model: CgCheck
ADD model: License
ADD model: CurrencyCheck
ADD model: LogbookEntry
ADD model: AffRecord
ADD model: InstructorProfile
ADD model: InstructorSkill
ADD model: InstructorAvailability
ADD model: InstructorAssignment
ADD model: Booking
ADD model: BookingPackage
ADD model: CoachingType
ADD model: CoachingSession
ADD model: WaitlistEntry
ADD model: EventOutbox
ADD model: GearRental
ADD model: RiskAssessment
ADD enum: JumpType
ADD enum: LicenseType
ADD enum: InstructorSkillType
ADD enum: BookingStatus
```

### API Routes (apps/api/src/routes/)
```
CREATE: booking.ts
CREATE: training.ts
CREATE: instructor.ts
UPDATE: manifest.ts (CG endpoint, timer transitions, waitlist, exit order)
UPDATE: identity.ts (license, logbook, currency endpoints)
UPDATE: safety.ts (risk assessment)
UPDATE: gear.ts (rental, repack queue)
```

### Services (apps/api/src/services/)
```
CREATE: currencyEngine.ts
CREATE: instructorMatcher.ts
CREATE: bookingService.ts
CREATE: exitOrderAlgorithm.ts
CREATE: eventOutboxRelay.ts
UPDATE: loadFsm.ts (timer states, CG gate)
UPDATE: validationGates.ts (license check, AAD check)
UPDATE: cgCalculator.ts (wire to FSM)
```

### Frontend (apps/web/src/app/dashboard/)
```
UPDATE: page.tsx (role-based rendering)
CREATE: load-board/ (real-time manifest grid)
UPDATE: logbook/page.tsx (digital logbook with data)
CREATE: training/ (AFF progression)
CREATE: instructor/ (instructor dashboard)
UPDATE: checkin/page.tsx (8-point compliance grid)
UPDATE: manifest/[loadId]/page.tsx (CG modal, exit order, timer)
UPDATE: pilot/page.tsx (CG sheet, flight log)
```

### Seed (prisma/)
```
UPDATE: seed.ts (licenses, logbook entries, instructor profiles, CG checks, bookings, AFF records, waitlist entries)
```

---

## END OF PHASE 1

**Status: AUDIT COMPLETE. Awaiting your approval to proceed to Phase 2 (Canonical Implementation Truth).**

All findings are grounded in actual file reads across 52 schema models, 18 route files, 7 services, 37 frontend pages, 6 hooks, 4 middleware, and 3 test suites — cross-referenced against requirements extracted from all 20 design documents.
