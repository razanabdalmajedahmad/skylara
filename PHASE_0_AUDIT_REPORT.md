# SkyLara Platform — Phase 0 Comprehensive Audit Report

**Date:** 2026-04-10
**Scope:** Full repo audit against documentation specs
**Method:** Automated + manual cross-reference of all 166 web pages, 52 route files, 31 services, 188 Prisma models, mobile app, CI/CD, tests, and documentation

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Dashboard Pages | 166 |
| API Route Files | 52 (49 registered in index.ts) |
| API Services | 31 |
| Prisma Models | 188 |
| Prisma Enums | 87 |
| API Test Files | 10 |
| CI/CD Jobs | 5 (lint, test, schema-check, build, docker) |
| TypeScript Errors (API) | **0** |
| Migrations | 2 (init + rig-maintenance) |
| Mobile Screens | ~35 |

### Health Score by Layer

| Layer | Score | Notes |
|-------|-------|-------|
| Database Schema | **A** | 188 models, clean Prisma validation, 87 enums |
| API Backend | **A-** | 0 TS errors, 52 route files, 31 services, 2 TODOs only |
| Notification Infrastructure | **A** | Push/SMS/WhatsApp/Email all wired with circuit breakers |
| Audit Trail | **A+** | SHA-256 chained checksums, sensitive field scrubbing |
| Manifest/Operations | **A** | Real FSM, CG calculator, exit order algorithm, waitlist |
| Payments | **A-** | Real Stripe SDK, Connect, splits, reconciliation |
| CI/CD | **A-** | Full pipeline: lint, test, schema, build, docker |
| Web Frontend | **C** | ~30 pages with MOCK_ data, ~28 console.log occurrences |
| Mobile App | **D+** | ~35 screens vs 166 web pages, limited API wiring |
| Test Coverage | **C+** | 10 test files for critical paths, no frontend tests |

---

## SECTION 1: CRITICAL FINDINGS (P0)

### 1.1 — 30+ Dashboard Pages Render Hardcoded Mock Data

**Severity: P0 — User-facing fake data in production**

The following pages use `const MOCK_*` arrays with hardcoded fake records instead of fetching from APIs:

| Page | Mock Constants | Backend Exists? |
|------|---------------|-----------------|
| `/dashboard/page.tsx` (Main Dashboard) | MOCK_LOADS, MOCK_QUEUE, MOCK_ALERTS, MOCK_STAFF, MOCK_ACTIVITY, MOCK_WEATHER | **Partial** — tries API first, falls back to mock |
| `/dashboard/incidents/page.tsx` | MOCK_INCIDENTS, MOCK_STAFF | **Yes** — safety routes exist |
| `/dashboard/gear/page.tsx` | MOCK_GEAR, MOCK_ACTIVE_RENTALS | **Yes** — gear routes exist |
| `/dashboard/payments/page.tsx` | MOCK_TRANSACTIONS | **Yes** — payments routes exist |
| `/dashboard/aircraft/page.tsx` | MOCK_AIRCRAFT, MOCK_MAINTENANCE | **Yes** — aircraft routes exist |
| `/dashboard/aircraft/[id]/page.tsx` | MOCK_AIRCRAFT, MOCK_CG_CHECKS, MOCK_FUEL_ESTIMATE | **Yes** — aircraft routes exist |
| `/dashboard/checkin/page.tsx` | MOCK_QUEUE | **Partial** — onboarding exists but no checkin-specific API |
| `/dashboard/wallet/page.tsx` | MOCK_TRANSACTIONS, MOCK_TICKET_PACKS | **Partial** — payments exist but no wallet-specific API |
| `/dashboard/documents/page.tsx` | MOCK_DOCUMENTS | **No** — no documents API |
| `/dashboard/gift-cards/page.tsx` | MOCK_GIFT_CARDS | **No** — no gift cards API |
| `/dashboard/roles/page.tsx` | MOCK_ROLES, MOCK_USERS | **Partial** — admin routes have role endpoints |
| `/dashboard/ideas/page.tsx` | MOCK_IDEAS | **Yes** — ideasNotes routes exist |
| `/dashboard/ideas/[id]/page.tsx` | MOCK_IDEA | **Yes** — but TODO comment says "wire when API exists" |
| `/dashboard/boogies/page.tsx` | MOCK_BOOGIES | **Yes** — boogie routes exist |
| `/dashboard/staff/page.tsx` | MOCK_STAFF | **Partial** — admin routes exist |
| `/dashboard/staff/instructors/page.tsx` | MOCK_INSTRUCTORS | **Yes** — instructor routes exist |
| `/dashboard/staff/coaches/page.tsx` | MOCK_COACHES | **Yes** — coaching routes exist |
| `/dashboard/athletes/page.tsx` | MOCK_ATHLETES | **Yes** — identity routes exist |
| `/dashboard/partners/dropzones/page.tsx` | MOCK_DROPZONES | **Partial** — partnerOnboarding exists |
| `/dashboard/pricing/page.tsx` | MOCK_PRICING_TIERS, MOCK_TANDEM_PRICES, MOCK_AFF_PRICES | **Partial** — booking routes have pricing |
| `/dashboard/admin/onboarding/*` | MOCK_INSTRUCTORS, MOCK_COACHES, MOCK_DROPZONES | **Yes** — onboardingCenter routes exist |
| `/dashboard/ai/page.tsx` | MOCK_STATS, MOCK_ACTIVITY | **Yes** — assistantAdvanced routes exist |
| `/dashboard/ai/automations/page.tsx` | MOCK_AUTOMATIONS | **Partial** |
| `/dashboard/ai/prompts/page.tsx` | MOCK_PROMPTS | **Partial** |
| `/dashboard/ai/history/page.tsx` | MOCK_HISTORY | **Yes** — assistantAdvanced has history |
| `/dashboard/ai/knowledge/page.tsx` | MOCK_ARTICLES | **Partial** |
| `/dashboard/ai/assistant/page.tsx` | MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_SUGGESTIONS | **Yes** — assistantAdvanced routes exist |
| `/dashboard/ai/recommendations/page.tsx` | MOCK_RECS | **Partial** |
| `/dashboard/manifest/insights/page.tsx` | MOCK_SUMMARY, MOCK_LOADS, MOCK_INSIGHTS | **Partial** — manifest routes don't have insights endpoint |
| `/dashboard/manifest/readiness/page.tsx` | MOCK_BOARD | **Partial** — manifest routes don't have readiness endpoint |
| `/dashboard/manifest/load-planner/page.tsx` | MOCK_LOADS, MOCK_QUEUE | **Partial** — manifestAgent handles AI load planning |
| `/dashboard/portal-assistant/page.tsx` | MOCK_STATS, MOCK_RECENT, MOCK_POPULAR | **Yes** — portalAssistant routes exist |
| `/dashboard/portal-assistant/automations/page.tsx` | MOCK_AUTOMATIONS, MOCK_STATS | **Partial** |
| `/dashboard/portal-assistant/search/page.tsx` | MOCK_RESULTS | **Yes** — portalAssistant has search |

**Impact:** Users see fake names, fake data, fake numbers on 30+ pages. This violates CLAUDE.md rule: "No fake completion" and "No hardcoded demo-only data."

### 1.2 — Console.log Button Handlers (28 Occurrences)

Found in 14 dashboard files. These are buttons that log to console instead of performing actions:

- `checkin/page.tsx` — **8 occurrences** (check-in actions do nothing)
- `boogies/page.tsx` — 2 occurrences
- `boogies/[id]/page.tsx` — 2 occurrences
- `documents/page.tsx` — 2 occurrences
- `wallet/page.tsx` — 2 occurrences
- `emergency/page.tsx` — 2 occurrences
- `end-of-day/page.tsx` — 2 occurrences
- `help/[slug]/page.tsx` — 1 occurrence
- `weather/page.tsx` — 1 occurrence
- `dashboard/page.tsx` — 1 occurrence

### 1.3 — Hardcoded dropzoneId in Data Management

```
export/page.tsx:44  — dropzoneId: 1, // TODO: use current DZ from context
reset/page.tsx:39   — dropzoneId: 1, // TODO: from context
```

In a multi-tenant system, hardcoding dropzoneId=1 means these features only work for one tenant.

---

## SECTION 2: MAJOR FINDINGS (P1)

### 2.1 — Pages with Backend APIs But No Wiring

These pages import `apiGet`/`apiPost` but use mock data alongside. The backend routes exist but the frontend never calls them:

| Frontend Page | Backend Route File | Status |
|---------------|-------------------|--------|
| incidents/page.tsx | safety.ts | Mock data, APIs not called |
| gear/page.tsx | gear.ts | Mock data, APIs not called |
| aircraft/page.tsx | aircraft.ts | Mock data, APIs not called |
| staff/page.tsx | admin.ts | Mock data, APIs not called |
| athletes/page.tsx | identity.ts | Mock data, APIs not called |
| boogies/page.tsx | boogies.ts | Mock data, APIs not called |
| payments/page.tsx | payments.ts + paymentsAdvanced.ts | Mock data, APIs not called |
| roles/page.tsx | admin.ts | Mock data, APIs not called |

### 2.2 — 3 Route Files Not Registered in index.ts

52 route files exist but only 49 are registered (helpCenter.ts, ideasNotes.ts, walkthroughs.ts are registered via supportIndex.ts). However, portalAssistant.ts is imported but registered via supportRoutes. All 52 appear accounted for.

### 2.3 — Only 2 Database Migrations for 188 Models

- `0001_init.sql` — initial schema
- `0002_rig_maintenance.sql` — rig maintenance additions

This means any schema changes require `prisma db push` (destructive in production). For production deployment, proper migration files must be generated for all 188 models.

### 2.4 — No Frontend Tests

Zero test files exist in `apps/web/src/`. The 10 API test files cover critical services:
- auth.test.ts
- manifest.test.ts
- payments.test.ts
- cgCalculator.test.ts
- rigMaintenanceEngine.test.ts
- circuitBreaker.test.ts
- policyEngine.test.ts
- weatherThresholdEngine.test.ts
- verificationService.test.ts
- waitlistService.test.ts

Missing tests for: notification delivery, import/export, demo data, email/SMS/push services, booking, coaching, learning, careers.

### 2.5 — Missing API Endpoints for Dashboard Pages

| Dashboard Page | Missing API |
|----------------|-------------|
| `/dashboard/documents/page.tsx` | No document management API |
| `/dashboard/gift-cards/page.tsx` | No gift card API |
| `/dashboard/wallet/page.tsx` | No wallet/ticket-pack API (payments exist but wallet is separate) |
| `/dashboard/checkin/page.tsx` | No check-in specific API (relies on manifest slots + compliance) |
| `/dashboard/manifest/insights/page.tsx` | No manifest insights/analytics endpoint |
| `/dashboard/manifest/readiness/page.tsx` | No readiness-board endpoint |
| `/dashboard/end-of-day/page.tsx` | eodReconciliation service exists but no dedicated route |
| `/dashboard/emergency/page.tsx` | No emergency management API (safety routes handle incidents) |

### 2.6 — Email Service: Welcome Email Always Sent Instead of Actual Template

In `notificationService.ts` line 777:
```typescript
await emailService.sendWelcomeEmail(user.email, user.firstName || "Jumper");
```
This sends a **welcome email** for ALL notification types instead of using the resolved template. The code comment says "For non-welcome emails, use the general send path" but never implements it.

---

## SECTION 3: MODERATE FINDINGS (P2)

### 3.1 — Mobile App Feature Parity Gap

~35 mobile screens vs 166 web dashboard pages = ~21% feature parity. Critical missing mobile features:
- No manifest board
- No check-in flow
- No gear management
- No incident reporting
- No payment management
- No admin/settings
- No learning/courses
- No careers
- No boogie management

### 3.2 — Window.location Usage (4 Occurrences)

- `boogies/[id]/public/page.tsx` — window.location.href for sharing (acceptable)
- `boogies/[id]/register/page.tsx` — window.location.href for sharing (acceptable)
- `payments-hub/page.tsx` — window.location.assign for Stripe redirect (acceptable)

These are acceptable uses (sharing URLs and Stripe redirect).

### 3.3 — Notification Service Uses (this.fastify.prisma as any) Extensively

Throughout notificationService.ts, Prisma is cast as `any` instead of using typed queries. This bypasses type safety.

### 3.4 — Missing Read Replica Configuration

`prismaRead` is used in 4 files (reports.ts, federation.ts, reportingAggregator.ts, prisma.ts) but falls back to the primary connection when `DATABASE_READ_URL` is not set. Not a bug, but a production performance concern.

### 3.5 — Env Vars Missing from .env.example

The following env vars are referenced in code but not in .env.example:
- `SENTRY_DSN` (referenced in escalation docs)
- `APP_DOMAIN` (used in emailService.ts)
- `SMTP_FROM_EMAIL` (used in emailService.ts)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` (referenced in email service comments)

---

## SECTION 4: INFRASTRUCTURE & OBSERVABILITY

### 4.1 — What's Working Well

- **Health endpoint** (`/health`) checks database, Redis, S3, circuit breakers
- **Circuit breakers** for Twilio, Expo push, web push, Stripe
- **Event outbox relay** for async financial event processing
- **Rate limiting** with per-user + per-tenant keying
- **CORS** properly configured
- **Helmet** security headers
- **Request ID correlation** via X-Request-Id header
- **API versioning** via /api/v1/* rewrite
- **Docker** multi-stage build with Dockerfile
- **CI/CD** with GitHub Actions (lint, test, schema-check, build, docker push)

### 4.2 — What's Missing

- **No Sentry/error tracking** integration (env var exists but no SDK)
- **No metrics/Prometheus** endpoint for monitoring
- **No structured logging** beyond Fastify's built-in Pino logger
- **No OpenTelemetry** tracing
- **No Redis caching** integration (env var exists, health checks it, but no cache middleware)
- **No job queue** (escalation uses setTimeout instead of Bull/BullMQ)
- **No CDN** configuration
- **No database connection pooling** beyond Prisma's built-in

---

## SECTION 5: COMPLIANCE WITH CLAUDE.MD RULES

| Rule | Status | Notes |
|------|--------|-------|
| No fake completion | **VIOLATED** | 30+ pages with MOCK_ data |
| No hardcoded demo-only data | **VIOLATED** | Same 30+ pages |
| No raw UUIDs in user-facing screens | **OK** | UUIDs are used internally |
| No bypass of safety/compliance gates | **OK** | Manifest FSM enforces gates |
| Counter updates must be auditable | **OK** | AuditService with SHA-256 chains |
| Financial actions must be auditable | **OK** | Event outbox + audit trail |
| Mobile and web must agree on operational truth | **PARTIAL** | Mobile has limited features |
| Offline-first required for DZ operations | **NOT STARTED** | No offline sync infrastructure |
| Server-confirmed truth for safety-critical flows | **OK** | Manifest transitions server-confirmed |

---

## SECTION 6: SERVICES QUALITY ASSESSMENT

### Fully Implemented Services (Production-Ready)

1. **auditService.ts** — SHA-256 chained, sensitive field scrubbing
2. **paymentService.ts** — Real Stripe SDK, Connect, splits, webhooks
3. **loadFsm.ts** — Full finite state machine with gates
4. **cgCalculator.ts** — CG calculation with aircraft profiles
5. **exitOrderAlgorithm.ts** — Real exit order computation
6. **validationGates.ts** — Manifest validation gates
7. **rigMaintenanceEngine.ts** — Rig lifecycle with grounding
8. **rigNotificationService.ts** — Rig status notifications
9. **waitlistService.ts** — Waitlist management with priorities
10. **weatherThresholdEngine.ts** — Weather safety thresholds
11. **policyEngine.ts** — Configurable policy engine
12. **emailService.ts** — SendGrid integration (real when configured)
13. **pushService.ts** — Expo + Web Push (real when configured)
14. **twilioService.ts** — SMS + WhatsApp (real when configured)
15. **escalationManager.ts** — Safety-critical fallback chain
16. **notificationService.ts** — 60+ event types, campaigns, segments, fatigue
17. **s3Service.ts** — Real AWS S3 uploads
18. **eventOutboxRelay.ts** — Financial event processing
19. **verificationService.ts** — Identity verification
20. **demoDataService.ts** — 7 scenarios, import/export, reset

### Services Needing Attention

21. **bookingService.ts** — Needs review for completeness
22. **manifestAgent.ts** — AI agent needs real integration
23. **predictionEngine.ts** — Needs review for completeness
24. **boogieMatchingEngine.ts** — Needs review
25. **fxService.ts** — Currency conversion service
26. **eodReconciliation.ts** — End-of-day service (no route)

---

## SECTION 7: RECOMMENDED PHASE 1 IMPLEMENTATION PLAN

### Priority 1: Wire 15 Highest-Impact Mock Pages to Real APIs (P0)

**Goal:** Eliminate all MOCK_ data from the most-used pages.

Target pages (in priority order):
1. **Main Dashboard** (`/dashboard/page.tsx`) — wire real loads, queue, weather, staff, revenue
2. **Incidents** (`/dashboard/incidents/page.tsx`) — wire to safety routes
3. **Gear** (`/dashboard/gear/page.tsx`) — wire to gear routes
4. **Aircraft** (`/dashboard/aircraft/page.tsx`) — wire to aircraft routes
5. **Payments** (`/dashboard/payments/page.tsx`) — wire to payments routes
6. **Athletes** (`/dashboard/athletes/page.tsx`) — wire to identity routes
7. **Boogies** (`/dashboard/boogies/page.tsx`) — wire to boogies routes
8. **Staff** (`/dashboard/staff/page.tsx`) — wire to admin routes
9. **Roles** (`/dashboard/roles/page.tsx`) — wire to admin routes
10. **Checkin** (`/dashboard/checkin/page.tsx`) — wire to manifest + validation gates
11. **AI Dashboard** (`/dashboard/ai/page.tsx`) — wire to assistantAdvanced
12. **AI Assistant** (`/dashboard/ai/assistant/page.tsx`) — wire to assistantAdvanced
13. **Pricing** (`/dashboard/pricing/page.tsx`) — wire to booking routes
14. **Portal Assistant** (`/dashboard/portal-assistant/page.tsx`) — wire to portalAssistant routes
15. **Ideas** (`/dashboard/ideas/page.tsx`) — wire to ideasNotes routes

### Priority 2: Fix Console.log Buttons (P0)

Replace all 28 console.log button handlers with real API calls, especially:
- **Checkin page** (8 handlers) — critical operational flow
- **Emergency page** (2 handlers) — safety-critical
- **End-of-day page** (2 handlers) — operational reconciliation

### Priority 3: Fix Notification Email Bug (P1)

In notificationService.ts line 777, replace the hardcoded welcome email with proper template-based sending.

### Priority 4: Fix Hardcoded dropzoneId (P1)

In export/page.tsx and reset/page.tsx, replace `dropzoneId: 1` with current user's dropzone from auth context.

### Priority 5: Add Missing API Endpoints (P1)

Create routes for:
- Document management
- Gift cards
- Wallet/ticket packs
- Check-in flow
- Manifest insights/analytics
- Manifest readiness board
- End-of-day reconciliation
- Emergency management dashboard

---

## APPENDIX A: All Pages Using Mock Data

58 `MOCK_*` constants found across 30+ unique pages. Full list in Section 1.1.

## APPENDIX B: Files to Create/Edit for Phase 1

### New Files
- None (all needed routes already exist — wiring changes only)

### Files to Edit (Priority 1 — Wire Mock Pages)
1. `apps/web/src/app/dashboard/page.tsx`
2. `apps/web/src/app/dashboard/incidents/page.tsx`
3. `apps/web/src/app/dashboard/gear/page.tsx`
4. `apps/web/src/app/dashboard/aircraft/page.tsx`
5. `apps/web/src/app/dashboard/payments/page.tsx`
6. `apps/web/src/app/dashboard/athletes/page.tsx`
7. `apps/web/src/app/dashboard/boogies/page.tsx`
8. `apps/web/src/app/dashboard/staff/page.tsx`
9. `apps/web/src/app/dashboard/roles/page.tsx`
10. `apps/web/src/app/dashboard/checkin/page.tsx`
11. `apps/web/src/app/dashboard/ai/page.tsx`
12. `apps/web/src/app/dashboard/ai/assistant/page.tsx`
13. `apps/web/src/app/dashboard/pricing/page.tsx`
14. `apps/web/src/app/dashboard/portal-assistant/page.tsx`
15. `apps/web/src/app/dashboard/ideas/page.tsx`

### Files to Edit (Priority 2 — Fix Console.log Handlers)
16. `apps/web/src/app/dashboard/checkin/page.tsx`
17. `apps/web/src/app/dashboard/emergency/page.tsx`
18. `apps/web/src/app/dashboard/end-of-day/page.tsx`
19. `apps/web/src/app/dashboard/wallet/page.tsx`
20. `apps/web/src/app/dashboard/documents/page.tsx`
21. `apps/web/src/app/dashboard/boogies/page.tsx`

### Files to Edit (Priority 3 — Backend Fixes)
22. `apps/api/src/services/notificationService.ts` (email template bug)
23. `apps/web/src/app/dashboard/admin/data-management/export/page.tsx` (dropzoneId)
24. `apps/web/src/app/dashboard/admin/data-management/reset/page.tsx` (dropzoneId)
