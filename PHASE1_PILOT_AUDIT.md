# SkyLara Phase 1 Audit — Pilot Launch Readiness Report
**Date:** 2026-04-08 | **Auditor:** Claude (CTO/CPO/CMO perspective)
**Scope:** 21 design documents vs actual codebase — gap analysis for pilot DZ deployment

---

## A. EXECUTIVE SUMMARY

SkyLara has **strong backend foundations** (76 Prisma models, 43 enums, 15 services, 27 route files, 38 passing tests) and a **polished mobile-first UI** (36 dashboard pages, PWA manifest, offline hooks). The 7-phase implementation delivered:
- 11-state Load FSM with CG blocking gate
- 10 safety blocking gates with override authority matrix
- 9-group exit order algorithm
- Instructor matching with skill/availability/workload scoring
- AFF progression tracking (L1-8)
- Event outbox relay for financial event reliability
- Booking service with package pricing
- Currency engine by license level
- EOD reconciliation
- Comprehensive seed data (12 loads, 35 athletes, 3 aircraft, 20 gear items)

**However, the codebase has critical gaps for a real pilot deployment:**

### 🔴 CRITICAL (Blocks pilot launch)
1. **Frontend-backend disconnect** — ~30 of 36 dashboard pages still render mock/hardcoded data
2. **No real notification delivery** — SMS/email/WhatsApp channels are stubs (dev logs only)
3. **No digital waiver flow** — Schema exists but no signature capture, no PDF generation, no legal compliance
4. **No walk-in registration** — No public-facing kiosk mode for tandem customers arriving same-day
5. **No calendar/scheduling view** — Load scheduling is list-only; DZ ops need daily/weekly calendar

### 🟡 HIGH (Degrades pilot experience)
6. **Empty route shells** — safety.ts, payments.ts, notifications.ts have 0 endpoints
7. **No staff scheduling UI** — StaffSchedule model exists but no rostering interface
8. **No video/media pipeline** — No tandem video upload, delivery, or upsell flow
9. **No multi-DZ admin panel** — Schema supports it but no UI for managing multiple DZs
10. **No legacy import** — No CSV/Excel migration tooling for existing DZ data

### 🟢 READY FOR PILOT
- Auth + JWT + RBAC ✅
- Load FSM + manifest board ✅
- CG calculator + blocking gate ✅
- Safety gates (10 gates) ✅
- Exit order algorithm ✅
- Instructor matching + assignment ✅
- Gear management + rentals + repack queue ✅
- Booking + pricing + packages ✅
- Wallet + tickets + transactions ✅
- AFF progression tracking ✅
- Audit logging with checksums ✅
- WebSocket real-time infrastructure ✅
- Offline sync framework ✅
- Seed data for demos ✅

---

## B. CANONICAL ARCHITECTURE (Current)

```
┌──────────────────────────────────────────────────┐
│                    MONOREPO                       │
├──────────────┬───────────────┬────────────────────┤
│  apps/web    │   apps/api    │    packages/*      │
│  Next.js 14  │   Fastify 4   │  config, types,    │
│  React 18    │   Prisma ORM  │  ui, knowledge,    │
│  TailwindCSS │   MySQL 8.0   │  portal-assistant, │
│  TanStack Q  │   JWT RS256   │  walkthroughs      │
│  36 pages    │   27 routes   │                    │
│  18 comps    │   15 services │                    │
│  6 hooks     │   76 models   │                    │
└──────────────┴───────────────┴────────────────────┘
```

---

## C. ROLE COVERAGE MATRIX

| Role | Auth | Dashboard | Manifest | Check-In | Safety | Payments | Training | Gear | Reports |
|------|------|-----------|----------|----------|--------|----------|----------|------|---------|
| PLATFORM_ADMIN | ✅ | ⚠️ mock | ✅ | ✅ | ⚠️ stub | ⚠️ stub | ✅ | ✅ | ⚠️ mock |
| DZ_OWNER | ✅ | ⚠️ mock | ✅ | ✅ | ⚠️ stub | ⚠️ stub | ✅ | ✅ | ⚠️ mock |
| DZ_MANAGER | ✅ | ✅ real | ✅ | ✅ | ⚠️ stub | ⚠️ stub | ✅ | ✅ | ⚠️ mock |
| MANIFEST_STAFF | ✅ | ✅ real | ✅ | ✅ | ⚠️ stub | ⚠️ stub | ✅ | ✅ | ⚠️ mock |
| TI (Tandem) | ✅ | ⚠️ mock | ✅ slot | ❌ | ⚠️ stub | ❌ | ✅ | ❌ | ❌ |
| AFFI | ✅ | ⚠️ mock | ✅ slot | ❌ | ⚠️ stub | ❌ | ✅ eval | ❌ | ❌ |
| COACH | ✅ | ⚠️ mock | ✅ slot | ❌ | ⚠️ stub | ❌ | ✅ | ❌ | ❌ |
| PILOT | ✅ | ⚠️ mock | ✅ CG | ❌ | ⚠️ stub | ❌ | ❌ | ❌ | ❌ |
| RIGGER | ✅ | ⚠️ mock | ❌ | ❌ | ⚠️ stub | ❌ | ❌ | ✅ repack | ❌ |
| ATHLETE | ✅ | ⚠️ mock | ✅ waitlist | ⚠️ mock | ⚠️ stub | ⚠️ wallet | ❌ | ❌ | ❌ |
| STUDENT | ✅ | ⚠️ mock | ❌ | ⚠️ mock | ⚠️ stub | ❌ | ⚠️ view | ❌ | ❌ |

Legend: ✅ = working with real API | ⚠️ = exists but mock/stub | ❌ = missing

---

## D. MODULE COVERAGE MATRIX

| Module | Schema | API | Service | UI | Seed | Status |
|--------|--------|-----|---------|-----|------|--------|
| Auth & Identity | ✅ 76 | ✅ 14 tests | ✅ | ✅ | ✅ | **READY** |
| RBAC & Permissions | ✅ | ✅ middleware | ✅ authorize.ts | ⚠️ no mgmt UI | ✅ | **PARTIAL** |
| Manifest & Load Mgmt | ✅ | ✅ 17 endpoints | ✅ FSM+gates | ✅ real data | ✅ 12 loads | **READY** |
| Check-In & Compliance | ✅ | ✅ compliance | ✅ 10 gates | ⚠️ mock queue | ✅ | **PARTIAL** |
| Safety & Emergency | ✅ | ⚠️ 0 endpoints | ⚠️ stub | ⚠️ mock | ✅ 5 incidents | **STUB** |
| Athlete & Logbook | ✅ | ✅ logbook/license | ✅ currency | ⚠️ mock | ✅ | **PARTIAL** |
| Payments & Wallet | ✅ | ⚠️ 2 read-only | ✅ paymentSvc | ⚠️ mock | ✅ wallets | **PARTIAL** |
| Booking & Scheduling | ✅ | ✅ 10 endpoints | ✅ bookingSvc | ✅ real data | ✅ 3 bookings | **READY** |
| Notifications | ✅ | ✅ 11 endpoints | ✅ notifSvc | ⚠️ mock | ✅ | **PARTIAL** — no real delivery |
| Weather & Airspace | ✅ | ✅ 1 endpoint | ❌ | ⚠️ mock | ❌ | **STUB** |
| Aircraft & Pilot | ✅ | ✅ 5 endpoints | ⚠️ basic | ⚠️ mock | ✅ 3 aircraft | **PARTIAL** |
| CG & Weight-Balance | ✅ | ✅ CG check | ✅ calculator | ⚠️ mock gauge | ✅ | **READY** |
| Equipment & Gear | ✅ | ✅ 12 endpoints | ✅ | ✅ real data | ✅ 20 items | **READY** |
| Reserve & AAD | ✅ | ✅ repack queue | ✅ gates | ✅ real data | ✅ | **READY** |
| Gear Rental | ✅ | ✅ rent/return | ✅ | ✅ real data | ❌ | **READY** |
| Training & AFF | ✅ | ✅ 5 endpoints | ✅ | ⚠️ mock | ✅ AFF records | **PARTIAL** |
| Instructor Matching | ✅ | ✅ assign/avail | ✅ matcher | ⚠️ mock | ✅ skills | **READY** |
| Reporting | ✅ | ✅ 4 reports | ⚠️ basic | ⚠️ mock | ❌ | **STUB** |
| Offline & Sync | ✅ | ✅ push/pull | ✅ syncEngine | ✅ indicator | ❌ | **PARTIAL** |
| Shop & Marketplace | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT STARTED** |
| Social & Story | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT STARTED** |
| Multi-DZ Admin | ⚠️ schema | ❌ | ❌ | ❌ | ❌ | **NOT STARTED** |
| Legacy Migration | ❌ | ❌ | ❌ | ❌ | ❌ | **NOT STARTED** |

---

## E. DASHBOARD & SCREEN COVERAGE

| Screen | Exists? | Real API? | Doc Requirement |
|--------|---------|-----------|-----------------|
| Login | ✅ | ✅ | MVP |
| Register | ✅ | ✅ | MVP |
| Main Dashboard | ✅ | ⚠️ hybrid | MVP |
| Manifest Board | ✅ | ⚠️ hybrid | MVP |
| Load Detail | ✅ | ⚠️ mock | MVP |
| Check-In Queue | ✅ | ⚠️ mock | MVP |
| Athletes Registry | ✅ | ✅ fixed | MVP |
| Bookings | ✅ | ✅ fixed | MVP |
| Gear Management | ✅ | ✅ fixed | MVP |
| Weather Board | ✅ | ⚠️ mock | MVP |
| Wallet | ✅ | ⚠️ mock | MVP |
| Incidents | ✅ | ✅ fixed | MVP |
| End of Day | ✅ | ✅ fixed | MVP |
| Staff | ✅ | ⚠️ mock | MVP |
| Reports | ✅ | ⚠️ mock | MVP |
| Profile | ✅ | ⚠️ mock | MVP |
| Settings | ✅ | ⚠️ mock | MVP |
| Pilot View | ✅ | ⚠️ mock | MVP |
| Logbook | ✅ | ⚠️ mock | MVP |
| Emergency Card | ✅ | ⚠️ mock | MVP |
| **Digital Waiver** | ❌ | ❌ | **MVP — MISSING** |
| **Walk-In Registration** | ❌ | ❌ | **MVP — MISSING** |
| **Calendar View** | ❌ | ❌ | **MVP — MISSING** |
| **Load Clock Display** | ❌ | ❌ | **MVP — MISSING** |
| **Role Management** | ❌ | ❌ | **MVP — MISSING** |
| **Kiosk Check-In** | ❌ | ❌ | MVP |
| QR Scanner | ✅ comp | ⚠️ not wired | MVP |
| Onboarding Wizard | ✅ | ⚠️ mock | MVP |
| Shop/Marketplace | ❌ | ❌ | Post-MVP |
| Social Feed | ❌ | ❌ | Post-MVP |
| Story/Profile | ❌ | ❌ | Post-MVP |
| Admin Multi-DZ | ❌ | ❌ | Post-MVP |

---

## F. DATABASE COVERAGE (76 models vs 75+ required)

**Present and populated:** 72/76 models have data paths (schema + seed or API)
**Missing from schema entirely:**
- `coaching_types` / `coaching_sessions` / `coaching_session_participants`
- `shop_products` / `shop_inventory` / `shop_orders` / `shop_order_items` / `media_products`
- `social_posts` / `social_comments` / `social_reactions` / `follows` / `achievements`
- `aircraft_documents` / `aircraft_mx_logs` / `aircraft_transfers`
- `pilot_profiles` / `pilot_certifications`
- `hospital_db` / `off_landing_alerts`
- `languages` / `translations` / `exchange_rates` / `locale_rules`
- `scan_logs`
- `dz_locale_settings` / `dz_permission_overrides` / `custom_roles` / `temporary_role_grants`

**Present but unused:** `NotificationDelivery`, `FeatureRegistry`, `WeatherData`, `WeatherHold`, `RiskAssessment`

---

## G. API COVERAGE (27 route files, ~100 endpoints)

| Namespace | Doc Spec | Implemented | Gap |
|-----------|----------|-------------|-----|
| /auth | 10 endpoints | ✅ 10+ | Passkey stubs only |
| /manifest (loads/slots) | 12 endpoints | ✅ 17 | Good coverage |
| /identity (profiles/logbook) | 8 endpoints | ✅ 7 | Missing license verify |
| /training (AFF/coaching) | 6 endpoints | ✅ 5 | Missing coaching sessions |
| /payments (wallet/tickets) | 10 endpoints | ⚠️ 2 read-only | **Major gap** |
| /gear | 7 endpoints | ✅ 12 | Good, exceeds spec |
| /safety (incidents/emergency) | 5 endpoints | ⚠️ 0 | **Empty shell** |
| /notifications | 5 endpoints | ✅ 11 | Good coverage |
| /booking | 6 endpoints | ✅ 10 | Good coverage |
| /aircraft | 5 endpoints | ✅ 5 | Basic coverage |
| /reports | 4 endpoints | ✅ 7 | Basic coverage |
| /admin | 5 endpoints | ⚠️ 1 | **Major gap** |
| /shop | 4 endpoints | ❌ 0 | Post-MVP |
| /webhooks/stripe | 1 endpoint | ✅ 1 | Present |

---

## H-I. REALTIME & OFFLINE COVERAGE

**WebSocket:** Plugin exists with room-based broadcast. Load events broadcast on create/update/transition/slot changes. ✅ Infrastructure ready.
**Gap:** No subscription filtering, no auth on WS connection, no reconnect logic on client.

**Offline:** IndexedDB stores defined, sync engine exists, outbox pattern implemented.
**Gap:** Only 4 entity types synced (Load, Slot, GearCheck, EmergencyProfile). Docs specify Tier 1 should include check-in, instructor assignment, incident capture.

---

## J-P. DOMAIN-SPECIFIC GAP ANALYSIS

### J. Safety-Critical Gaps
- ❌ No `POST /incidents` endpoint (safety.ts is empty)
- ❌ No emergency mode activation endpoint
- ❌ No hospital DB / off-landing detection
- ❌ No risk assessment scoring engine
- ⚠️ Emergency profile exists but not offline-cached on client

### K. Aviation Gaps
- ❌ No pilot pre-flight checklist
- ❌ No fuel planning / fuel reserve calculation
- ❌ No NOTAM/TFR integration
- ❌ No aircraft document management
- ❌ No aircraft maintenance log tracking
- ⚠️ Aircraft model exists but no flight hours logging beyond hobbs

### L. Equipment Gaps
- ✅ Gear checks, rentals, repack queue — all working
- ❌ No NFC/RFID gear tag integration
- ❌ No gear photo/condition documentation

### M. Training Gaps
- ✅ AFF L1-8 progression tracking
- ❌ No structured coaching sessions (beyond AFF)
- ❌ No coaching approval workflow
- ❌ No debrief system
- ❌ No video review integration

### N. Reporting Gaps
- ⚠️ 4 report endpoints exist but return basic data
- ❌ No dashboard builder with real data
- ❌ No nightly aggregation jobs
- ❌ No export to PDF/CSV from UI
- ❌ No financial reconciliation report (service exists, no UI)

### O. Revenue/Monetization Gaps
- ❌ No subscription/SaaS billing for DZ operators
- ❌ No commission calculation on bookings
- ❌ No instructor payout calculation
- ❌ No media sales pipeline
- ❌ No gift card system (UI exists, no backend)

### P. Naming Conflicts
- `OPERATOR` vs `MANIFEST_STAFF` — legacy alias kept for backward compat ✅ resolved
- `GearCheckResult.CONDITIONAL` vs doc spec `GROUNDED` — schema has both
- `LoadStatus` timer states use `THIRTY_MIN` (Prisma-safe) vs doc `30MIN`
- `SlotStatus.JUMPED` vs doc `COMPLETED` — minor naming difference

---

## Q. CANONICAL SOURCE-OF-TRUTH RECOMMENDATION

Continue using **CANONICAL_TRUTH.md** (created in Phase 2) as the living document, updated with:
1. The Final Implementation Spec (doc #20) as the highest authority
2. Production Blueprint (doc #5) for FSM and safety gate details
3. Engineering Foundation (doc #16) for API contracts
4. This audit report for gap tracking

---

## R. P0 / P1 / P2 BACKLOG

### P0 — MUST FIX BEFORE PILOT (blocks real DZ operations)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| P0-1 | Wire remaining ~30 dashboard pages to real API | 3-4 days | DZ staff see real data |
| P0-2 | Implement safety.ts endpoints (incidents, emergency) | 1 day | Safety compliance |
| P0-3 | Implement payments.ts endpoints (wallet topup, charge, tickets) | 1 day | Revenue flow |
| P0-4 | Digital waiver signature flow (capture, store, block without) | 2 days | Legal compliance |
| P0-5 | Walk-in tandem registration flow | 1 day | 60%+ of DZ revenue |
| P0-6 | Real notification delivery (at minimum email via SendGrid) | 1 day | Call times, booking confirms |
| P0-7 | Calendar/scheduling view for daily operations | 1 day | Ops planning |
| P0-8 | Staff page wired to real data | 0.5 day | Staff management |

### P1 — SHOULD FIX FOR PILOT (degrades experience if missing)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| P1-1 | QR check-in flow wired end-to-end | 1 day | Fast check-in |
| P1-2 | Load clock display (30/20/10/boarding countdown) | 1 day | Operational awareness |
| P1-3 | Pilot pre-flight checklist | 0.5 day | Pilot workflow |
| P1-4 | Role management UI (assign/revoke roles) | 1 day | Staff onboarding |
| P1-5 | Onboarding wizard wired to real API | 1 day | New user flow |
| P1-6 | Report builder with real data queries | 2 days | Business intelligence |
| P1-7 | CSV data import for existing DZ migration | 2 days | Adoption blocker |
| P1-8 | Weather API integration (real data) | 1 day | Operational safety |

### P2 — POST-PILOT (V2 features)

| # | Item | Effort |
|---|------|--------|
| P2-1 | Shop & marketplace | 5 days |
| P2-2 | Social feed & story | 5 days |
| P2-3 | Multi-DZ admin panel | 3 days |
| P2-4 | React Native mobile app | 10+ days |
| P2-5 | AI load optimization | 3 days |
| P2-6 | Video/media pipeline | 5 days |
| P2-7 | Advanced analytics/BI | 5 days |
| P2-8 | Coaching session management | 3 days |
| P2-9 | P2P slot resale | 3 days |
| P2-10 | NOTAM/airspace integration | 3 days |

---

## S. PILOT LAUNCH READINESS BY DZ SIZE

### Small DZ (1 aircraft, <50 jumps/day, 3-5 staff)
**Readiness: 70%** — Can use manifest, check-in, gear, bookings. Needs: waiver flow, walk-in registration, real payments, notification delivery.

### Medium DZ (2-3 aircraft, 50-200 jumps/day, 10-20 staff)
**Readiness: 55%** — Needs everything above plus: staff scheduling, calendar view, reporting, multi-aircraft CG, instructor assignment at scale.

### Large DZ (4+ aircraft, 200+ jumps/day, 20+ staff)
**Readiness: 40%** — Needs everything above plus: multi-branch support, advanced reporting, legacy import, role management, admin panel, video pipeline.

---

## VALIDATION COMMANDS

```bash
cd /Users/start-tech/Documents/Claude/Projects/SkyLara/app
npx prisma validate                              # Schema
npx tsc --noEmit -p apps/api/tsconfig.json       # API types
npx tsc --noEmit -p apps/web/tsconfig.json       # Web types
npx turbo run build --filter=@skylara/web         # Production build
npx vitest run apps/api/src/__tests__/auth.test.ts
npx vitest run apps/api/src/__tests__/manifest.test.ts
npx vitest run apps/api/src/__tests__/payments.test.ts
```

---

---

## T. SAFETY-CRITICAL ACCEPTANCE CRITERIA (from docs — non-negotiable for pilot)

| # | Test | Expected | Status |
|---|------|----------|--------|
| SC-01 | LOCKED→THIRTY_MIN without CG PASS | 409 blocked | ✅ Implemented |
| SC-02 | CG PASS by non-manifest role | 403 forbidden | ✅ Implemented |
| SC-03 | Expired currency blocks slot assignment | 422 rejected | ✅ Implemented |
| SC-04 | Override requires reason ≥10 chars + override_log | Audit logged | ⚠️ No min-length check |
| SC-05 | Wingsuit assigned exit_group=1 (first exit) | Group 1 | ✅ Implemented |
| SC-06 | Exit order override creates override_log | Logged | ⚠️ No override UI yet |
| SC-07 | payment.captured in same TX as jump_ticket | Atomic | ✅ Event outbox pattern |
| SC-08 | Offline slot sync within 30s of reconnect | Synced | ⚠️ Framework exists, not tested |
| SC-09 | Over weight limit blocks TANDEM slot | 422 rejected | ✅ Weight gate |
| SC-10 | CG FAIL blocks state advancement | 409 blocked | ✅ Implemented |

## U. DZ SIZE DEPLOYMENT GUIDE

### Small DZ (1 aircraft, <50 jumps/day, 3-5 staff)
**Examples:** Small cessna operations, weekends-only DZs
**Priority features:** Manifest board, check-in, wallet/tickets, basic booking, gear checks
**What to defer:** Multi-branch, advanced reporting, AI insights, shop
**Estimated setup time:** 2 hours (DZ profile, aircraft, pricing, staff invites)

### Medium DZ (2-3 aircraft, 50-200 jumps/day, 10-20 staff)
**Examples:** Perris, Elsinore, Deland-style operations
**Priority features:** Everything above + instructor matching, AFF tracking, scheduling calendar, weather integration, EOD reconciliation, staff management
**What to defer:** Multi-DZ, marketplace, social features
**Estimated setup time:** 4 hours (+ fleet setup, instructor skills, pricing tiers)

### Large DZ (4+ aircraft, 200+ jumps/day, 20+ staff, multi-branch)
**Examples:** Skydive Dubai, Empuriabrava, Skydive Arizona
**Priority features:** Everything above + multi-branch, advanced reporting, legacy data import, video pipeline, custom roles, API integrations
**Estimated setup time:** 1-2 days (+ data migration, staff training, integration setup)

---

**END OF PHASE 1 AUDIT**

**All 21 documents have been read and compared against the codebase.**
**4 parallel research agents processed ~4MB of design documents.**

**Next:** Say CONTINUE to begin P0 implementation (the 8 pilot-blocking fixes)
**Estimated effort for P0:** ~10-12 days to reach pilot-ready for a small DZ
