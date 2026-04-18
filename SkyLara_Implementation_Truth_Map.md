# SkyLara Implementation Truth Map

**Date:** April 8, 2026
**Audit Scope:** 20 design documents vs. full codebase
**Verdict:** ~35% implemented. Core manifest and auth functional. Safety-critical gaps block pilot launch.

---

## A. Executive Summary

SkyLara's codebase has a solid foundation: 52 Prisma models, 30 enums, ~120 API endpoints across 18 route files, 37 frontend pages, 7 backend services, and realistic seed data for a Saturday DZ operations scenario. Authentication (passkeys, OAuth, MFA), basic manifest operations, wallet/payments via Stripe Connect, gear tracking, incident reporting, and a notification system are all present.

However, the design documents specify 75 database tables, 13 bounded modules, and 28+ role-specific dashboard screens. The gap is significant in these critical areas:

**Blocking pilot launch:**
- Load FSM missing states (30MIN, 20MIN, 10MIN) — only 8 of 11 states implemented
- CG blocking gate not enforced in FSM transitions
- No instructor skill matching or assignment system
- No AFF progression tracking tables or APIs
- No booking/reservation system
- No currency enforcement engine (90-day/180-day rules)
- No exit order algorithm
- No weather integration API
- Role-based dashboards are generic — no role-specific home screens
- Database cannot start (MySQL connection issues on local dev)

**Structural risks:**
- 23 tables from docs are missing from schema (instructor skills, coaching types, booking packages, localization, social/media, marketplace)
- Naming conflicts between docs and code (e.g., docs say `athletes` table, code uses `User` model for everything)
- No event outbox table (docs require transactional outbox pattern for financial reliability)
- No Redis integration (docs specify Redis Streams + Pub/Sub)
- No background job system (docs specify BullMQ for nightly aggregation, timer-driven FSM transitions)

---

## B. Gap Matrix: Docs vs. Code

### B.1 Database Tables (75 Required vs. 52 Implemented)

| Category | Doc Tables | Schema Models | Status |
|----------|-----------|---------------|--------|
| **Auth & Identity** | users, roles, user_roles, user_profiles, sessions, mfa_tokens | User, Role, UserRole, UserProfile, RefreshToken, Passkey, OAuthAccount, MfaDevice, LoginAttempt, PasswordResetToken | **Implemented** (expanded beyond docs) |
| **Tenant** | organizations, dropzones, dz_branches, dz_settings, dz_pricing | Organization, Dropzone, DzBranch | **Partial** — missing DzSettings, DzPricing |
| **Aircraft** | aircraft | Aircraft | **Implemented** |
| **Manifest** | loads, slots, cg_checks, waitlist_entries, load_notes, exit_groups | Load, Slot, Group, GroupMember | **Partial** — missing CgCheck model (CG fields on Load only), no WaitlistEntry, no LoadNote, no ExitGroup |
| **Athletes & Compliance** | athletes, licenses, uspa_verifications, currency_checks, logbook_entries, aff_records, waivers, waiver_signatures | Waiver, WaiverSignature, OnboardingSession | **Critical Gap** — no License, Athlete, USPAVerification, CurrencyCheck, LogbookEntry, AFFRecord models |
| **Gear & Safety** | gear_items, gear_checks, gear_rentals, emergency_profiles, incidents, incident_involved_parties, risk_assessments | GearItem, GearCheck, EmergencyProfile, Incident | **Partial** — missing GearRental, IncidentInvolvedParty, RiskAssessment |
| **Financial** | wallets, jump_tickets, transactions, commission_splits, payments, gift_cards, event_outbox | Wallet, JumpTicket, Transaction, StripeAccount, PaymentIntent, PaymentSplit, Payout, LedgerEntry | **Mostly implemented** — missing GiftCard, EventOutbox (critical for reliability) |
| **Bookings** | booking_packages, bookings | (none) | **Missing entirely** |
| **Notifications** | notification_templates, notifications | Notification, NotificationTemplate, NotificationDelivery, Webhook | **Implemented** (expanded) |
| **Instructor & Coaching** | instructor_skill_types, instructor_skills, coaching_types, coaching_sessions, coaching_session_participants, instructor_availability, instructor_assignments, booking_requests | (none) | **Missing entirely** |
| **Localization** | languages, translation_namespaces, translation_keys, translations, currencies, dz_locale_settings | (none) | **Missing entirely** |
| **Social & Media** | social_posts, social_comments, social_reactions, follows, achievements, athlete_achievements, media_uploads, media_tags, athlete_stories, athlete_milestones, activity_feed | (none) | **Missing entirely** |
| **Marketplace** | shop_products, shop_inventory, shop_orders, shop_order_items | (none) | **Missing entirely** |
| **Weather & AI** | weather_data, weather_holds, ai_insights | (none) | **Missing entirely** |
| **Staff** | staff_schedules, override_log | (none) | **Missing** |
| **Reporting** | daily_revenue_summary, report_dashboards, report_blocks | ReportDashboard, ReportBlock | **Partial** — missing materialized views |
| **Audit** | audit_logs, sync_outbox | AuditLog, SyncOutbox | **Implemented** |

**Summary: 52 of 75 tables implemented (69%). But 11 critical operational tables are missing.**

### B.2 API Endpoints

| Module | Doc Endpoints | Implemented | Status |
|--------|--------------|-------------|--------|
| Auth | /auth/login, register, refresh, logout, forgot-password, reset-password, passkey/*, mfa/*, google/* | All present in auth.ts + authAdvanced.ts | **Implemented** |
| Manifest | /loads CRUD, /loads/:id/slots, /loads/:id/status, /loads/:id/cg, /loads/:id/boarding | loads CRUD + slots in manifest.ts | **Partial** — no CG endpoint, no exit order, no timer transitions |
| Identity | /users/me, /jumpers/search, /jumpers/:id/logbook, /jumpers/:id/checkin | users/me + basic CRUD in identity.ts | **Partial** — no logbook, no license verification, no currency check |
| Payments | /wallet, /payments/intent, /payments/splits, /payouts, /webhooks/stripe | wallet + stripe in payments.ts + paymentsAdvanced.ts | **Mostly implemented** |
| Bookings | /bookings CRUD, /bookings/:id/pay, /bookings/:id/refund | (none) | **Missing** |
| Training | /aff-records, /coaching-sessions, /instructor-assignments | (none) | **Missing** |
| Gear | /gear CRUD, /gear/:id/check, /gear/:id/repack | gear.ts has CRUD + checks | **Implemented** |
| Safety | /incidents, /emergency/activate, /risk-assessments | safety.ts has incidents + emergency | **Partial** — no risk assessment |
| Weather | /weather, /weather-holds | weather.ts returns mock data | **Stub only** |
| Notifications | /notifications, /templates, /webhooks | notifications.ts + notificationsAdvanced.ts | **Implemented** |
| Admin | /admin/users, /admin/dropzones, /admin/reports | admin.ts | **Partial** |
| Reports | /reports/revenue, /reports/bookings, /reports/custom | reports.ts + reportBuilder.ts | **Partial** — no real data aggregation |
| Instructor | /instructors, /instructor-assignments, /availability | (none) | **Missing** |
| Onboarding | /onboarding/start, /onboarding/step | onboarding.ts | **Implemented** |

### B.3 Load FSM States

| State | Doc Spec | Code Enum | Transitions Implemented |
|-------|----------|-----------|------------------------|
| OPEN | Yes | Yes | Yes |
| FILLING | Yes | Yes | Yes |
| LOCKED | Yes | Yes | Yes |
| 30MIN | Yes | **No** | **Missing** |
| 20MIN | Yes | **No** | **Missing** |
| 10MIN | Yes | **No** | **Missing** |
| BOARDING | Yes | Yes | Yes |
| AIRBORNE | Yes | Yes | Yes |
| LANDED | Yes | Yes | Yes |
| COMPLETE | Yes | Yes | Yes |
| CANCELLED | Yes | Yes | Yes |

**Risk:** The timer-driven states (30MIN/20MIN/10MIN) are the core operational rhythm of a dropzone. Without them, manifest staff cannot track call times.

### B.4 Safety-Critical Gaps

| Safety Gate | Doc Requirement | Code Status | Risk Level |
|------------|----------------|-------------|------------|
| CG blocking FSM gate | LOCKED->30MIN requires CG PASS | **Not enforced** — no CgCheck model, no FSM gate | **CRITICAL** |
| License currency | 90-day A/B, 180-day student | **No License model** | **CRITICAL** |
| USPA verification | Verify membership before manifesting | **No USPA integration** | **HIGH** |
| Reserve repack tracking | 180-day limit, auto-warnings | GearItem has nextRepackDue but **no enforcement** | **HIGH** |
| AAD expiry | Block manifesting if expired | GearItem has aadFiresRemaining but **no check** | **HIGH** |
| Waiver gate | Block manifesting without signed waiver | WaiverSignature exists but **no manifesting gate** | **HIGH** |
| Weight limits | Per jump type enforcement | Slot has weight field but **no validation** | **MEDIUM** |
| Exit order algorithm | 9-group priority separation | **Not implemented** | **MEDIUM** |
| Weather hold protocol | Auto-hold, 30min updates, 2hr credit | **Not implemented** | **MEDIUM** |

---

## C. Naming Conflicts & Duplicates

| Concept | Doc Name | Code Name | Resolution |
|---------|----------|-----------|------------|
| Jumper identity | `athletes` table + `users` | Single `User` model | **Keep User** — add athlete-specific fields (license, jumpCount, homeDropzoneId) |
| Jump type | `jump_type` enum (TANDEM, AFF L1-8, etc.) | `SlotType` enum | **Rename to JumpType** — expand values |
| Load timer states | 30MIN, 20MIN, 10MIN | Not in LoadStatus enum | **Add to enum** |
| Instructor profiles | `instructor_skill_types` + `instructor_skills` | None | **Create InstructorProfile, InstructorSkill** |
| Coaching sessions | `coaching_sessions` + `coaching_types` | None | **Create CoachingType, CoachingSession** |
| CG verification | `cg_checks` table | Fields on Load model | **Extract to CgCheck model** (append-only audit) |
| Booking system | `bookings` + `booking_packages` | None | **Create Booking, BookingPackage** |
| Logbook | `logbook_entries` | None | **Create LogbookEntry** |
| AFF progression | `aff_records` | None | **Create AffRecord** |
| Currency checks | `currency_checks` | None | **Create CurrencyCheck** |

---

## D. Role-to-Screen Map

### DZ Operator
- **Jobs:** Revenue oversight, staff management, operational decisions, settings
- **Required screens:** Dashboard (hero metrics, revenue, staff utilization), Settings, Staff Management, Reports, Aircraft Management
- **Current status:** Generic dashboard exists — **no role-specific widgets or metrics**
- **Missing:** Revenue breakdown, staff utilization chart, AI insights panel, announcement management

### Manifest Staff
- **Jobs:** Create loads, manifest jumpers, check-in, manage call times, waitlist
- **Required screens:** Load Board (real-time grid), Load Detail, Check-in Queue, Waitlist, CG Calculator
- **Current status:** /dashboard/manifest and /dashboard/manifest/[loadId] exist — **basic load list only**
- **Missing:** Drag-and-drop load board, real-time WebSocket updates, check-in flow with compliance grid, CG calculator modal, timer countdown display

### Tandem Instructor (TI)
- **Jobs:** Receive tandem assignments, view student info, manage schedule
- **Required screens:** My Assignments, Student Info Cards, Today's Schedule, Earnings
- **Current status:** **No role-specific screen**
- **Missing:** Entire TI dashboard

### AFF Instructor (AFFI)
- **Jobs:** Track student progression (L1-8), evaluate skills, sign off levels
- **Required screens:** Student Progression Board, Evaluation Form, Level Sign-off, Schedule
- **Current status:** **No AFF system exists**
- **Missing:** Entire AFFI dashboard, AFF progression tracking, evaluation system

### Pilot
- **Jobs:** Pre-flight CG check, view manifests, log flights
- **Required screens:** Pre-flight CG Sheet, Load Manifests, Flight Log
- **Current status:** /dashboard/pilot exists — **minimal page**
- **Missing:** CG calculation display, weight & balance view, flight logging

### Rigger / S&TA
- **Jobs:** Gear inspections, repack tracking, safety compliance
- **Required screens:** Gear Inventory, Repack Queue, Inspection Log, Compliance Dashboard
- **Current status:** /dashboard/gear exists — **basic gear list**
- **Missing:** Repack queue with due dates, inspection workflow, compliance alerts

### Licensed Athlete
- **Jobs:** Self-manifest, view loads, track logbook, manage gear, wallet
- **Required screens:** Home (load board + announcements), Logbook, Wallet, Gear Summary, Profile
- **Current status:** Generic dashboard — **no athlete-specific home**
- **Missing:** Self-manifest flow, digital logbook, currency status badge, personal stats

### Student
- **Jobs:** Complete onboarding, book training jumps, view AFF progress
- **Required screens:** Onboarding Flow, AFF Progress Board, Booking, Safety Video
- **Current status:** Onboarding flow exists — **no AFF progress or training booking**
- **Missing:** AFF level tracker, training jump booking, instructor match

### Platform Admin
- **Jobs:** Manage DZ network, monitor health, system configuration
- **Required screens:** Network KPIs, DZ Health Map, Revenue by DZ, System Health, User Management
- **Current status:** /dashboard with admin routes — **basic user/DZ management only**
- **Missing:** Network-wide KPIs, DZ health map, system monitoring

---

## E. Recommended Module Structure (Canonical)

```
apps/api/src/
  modules/
    auth/           # Login, register, passkeys, MFA, OAuth, sessions
    identity/       # User profiles, athlete data, licenses, currency
    manifest/       # Loads, slots, FSM, CG, exit order, waitlist
    training/       # AFF records, coaching sessions, instructor matching
    booking/        # Reservations, packages, approval workflows
    payments/       # Wallet, transactions, Stripe Connect, splits, ledger
    gear/           # Gear items, checks, rentals, repack tracking
    safety/         # Emergency profiles, incidents, risk assessments
    notifications/  # Templates, delivery, webhooks, preferences
    weather/        # External API integration, weather holds
    reports/        # Revenue, operational, instructor, athlete analytics
    admin/          # DZ management, RBAC, audit, system health
  shared/
    middleware/     # authenticate, authorize, tenantScope
    services/       # CG calculator, load FSM, validation gates
    events/         # Event outbox, event bus, handlers
    utils/          # env, errors, jwt, password
```

---

## F. Priority Implementation Backlog

### Phase 1: Pilot-Ready Core (P0 — Blocks Launch)

**1.1 Fix Load FSM — Add Timer States**
- Why: DZ operations revolve around 30/20/10-minute call times
- DB: Add `THIRTY_MIN`, `TWENTY_MIN`, `TEN_MIN` to LoadStatus enum
- API: Update manifest route transition logic in loadFsm.ts
- UI: Show countdown timers on load board cards
- Acceptance: Load transitions through all 11 states, timer states auto-advance

**1.2 CG Blocking Gate**
- Why: Safety-critical — aircraft weight & balance prevents accidents
- DB: Create `CgCheck` model (load_id, total_weight, fuel_weight, pilot_weight, calculated_cg, result, performed_by)
- API: POST /loads/:id/cg-check, enforce gate in FSM LOCKED->THIRTY_MIN
- UI: CG calculator modal with PASS/FAIL display
- Acceptance: Cannot transition to THIRTY_MIN without CG PASS. Override requires DZ_OPERATOR + audit log

**1.3 License & Currency System**
- Why: Legal requirement — unlicensed/expired jumpers cannot skydive
- DB: Create `License` model (userId, type, number, issuedAt, expiresAt, verifiedBy, verifiedAt)
- DB: Create `CurrencyCheck` model (userId, lastJumpDate, isCurrentResult, checkedAt)
- API: POST /identity/licenses, GET /identity/licenses/verify, enforce in manifesting
- UI: Currency status badge (CURRENT/WARNING/EXPIRED) on check-in screen
- Acceptance: Cannot manifest jumper with expired license or lapsed currency

**1.4 Digital Logbook**
- Why: Core athlete value proposition — every jumper wants a logbook
- DB: Create `LogbookEntry` model (userId, loadId, dropzoneId, altitude, jumpType, freefallTime, deploymentAlt, notes, coachSignOff)
- API: GET/POST /identity/logbook
- UI: /dashboard/logbook with sortable jump history
- Acceptance: Logbook entry auto-created when slot status = JUMPED

**1.5 Instructor Assignment System**
- Why: Cannot run tandem or AFF operations without instructor matching
- DB: Create `InstructorProfile`, `InstructorSkill`, `InstructorAvailability` models
- API: POST /manifest/loads/:id/assign-instructor, GET /instructors/available
- UI: Instructor picker in slot assignment
- Acceptance: Tandem/AFF slots require instructor assignment. Skill matching enforced

**1.6 Booking System**
- Why: Revenue entry point — customers must be able to book online
- DB: Create `Booking`, `BookingPackage` models
- API: POST /bookings, GET /bookings, POST /bookings/:id/pay
- UI: /dashboard/bookings with calendar view
- Acceptance: Customer can book tandem 24h+ in advance, pay via Stripe, receive confirmation

**1.7 Role-Specific Dashboards**
- Why: Each role needs a usable home screen, not a generic page
- UI: Refactor /dashboard to detect role and render appropriate widgets
- Acceptance: DZ Operator sees revenue + ops, Manifest Staff sees load board, Athlete sees upcoming loads + logbook

**1.8 Database Startup Fix**
- Why: App literally doesn't start — MySQL/Prisma connection fails
- Fix: Ensure db:push + db:seed:all runs cleanly, document setup steps
- Acceptance: `npm run dev` starts both API and web without errors

### Phase 2: Operations Hardening (P1)

**2.1 AFF Progression System**
- DB: `AffRecord` model (studentId, instructorId, level 1-8, passed, evaluationNotes, videoUrl)
- API: POST /training/aff-records, GET /training/students/:id/progression
- UI: Student progression board for AFFI, progress tracker for student

**2.2 Exit Order Algorithm**
- 9-group priority: Wingsuits, Tracking, AFF Students, AFF Advanced, Experienced Tandems, Belly, Coach, Freefly, CRW/Hop-Pop
- API: Auto-compute when load transitions to LOCKED
- UI: Exit order display on load detail

**2.3 Weather Integration**
- API: Connect to weather API (OpenWeather/NOAA), create WeatherHold model
- Safety: Auto-hold loads when wind exceeds DZ limit
- UI: Weather widget on dashboard, hold notification

**2.4 Event Outbox Pattern**
- DB: Create `EventOutbox` model for reliable financial events
- Service: Relay process polling outbox, publishing to in-process event bus
- Why: Financial events must never be lost

**2.5 Check-in Compliance Grid**
- 8-point verification: License, Currency, USPA, Waiver, Gear, AAD, Reserve, Weight
- API: GET /identity/:id/compliance-status
- UI: Visual grid with PASS/FAIL per point, blocks manifesting on any FAIL

**2.6 Waitlist System**
- DB: Create `WaitlistEntry` model
- API: POST /manifest/loads/:id/waitlist, auto-promote when slot opens

### Phase 3: Commercial & Growth (P2)

**3.1 Localization System** — Languages, translations, RTL support
**3.2 Marketplace** — Shop products, inventory, orders
**3.3 P2P Slot Resale** — List, buy, anti-scalping rules
**3.4 Gift Cards** — Purchase, redeem, balance tracking
**3.5 Media Sales** — Tandem video/photo packages
**3.6 Subscription Tiers** — Free/Starter/Pro/Enterprise for DZs
**3.7 Advanced Reporting** — Materialized views, nightly aggregation, churn prediction

### Phase 4: Intelligence & Expansion (P3)

**4.1 AI Load Optimizer** — Suggest optimal slot arrangement
**4.2 Demand Forecasting** — Predict busy periods
**4.3 Risk Assessment Engine** — Continuous safety scoring
**4.4 Social & Story** — Athlete profiles, milestones, activity feed
**4.5 Cross-DZ Identity** — Jump anywhere with one profile
**4.6 React Native Mobile** — Native app with offline-first
**4.7 Airspace/NOTAM Integration** — Aviation compliance

---

## G. Demo Seed Scenarios

### DZ Manager (admin@skylara.dev)
- Sees revenue dashboard: $12,450 today from 47 bookings
- 3 aircraft active, 12 loads scheduled
- 8 staff on duty, 2 on standby
- Weather: clear, wind 8 kts

### Manifest Staff (manifest@skylara.dev)
- Load board shows 4 active loads in different states
- Load #1: FILLING (6/15 slots), Load #2: LOCKED (CG pending), Load #3: AIRBORNE, Load #4: LANDED
- Check-in queue: 5 jumpers waiting
- Waitlist: 3 for next Cessna load

### Coach / Instructor (coach1@skylara.dev)
- Today's assignments: 3 tandem, 1 AFF Level 3
- Earnings this week: $1,240
- Schedule: Next jump in 45 min (Load #5)
- Student Sarah: AFF L3, 2 previous attempts

### Athlete (athlete1@skylara.dev)
- Home: Next load in 35 min (Load #5, Belly RW)
- Logbook: 247 total jumps, last jump 3 days ago
- Currency: CURRENT (green badge)
- Wallet: $340 balance, 8 jump tickets remaining

### Student (athlete5@skylara.dev)
- AFF Progress: Level 4 of 8 (50% complete)
- Next training jump: Tomorrow 10 AM
- Assigned instructor: Coach Mike
- Completed: Safety video, waiver signed

### Pilot (pilot@skylara.dev)
- Pre-flight: Load #2 CG calculation — 3,240 lbs total, CG at 142.3" (PASS)
- Today's flights: 6 completed, 2 remaining
- Aircraft N208SH: Next maintenance in 23 hours

### Rigger / S&TA (safety@skylara.dev)
- Repack queue: 4 reserves due this week
- Gear alerts: 1 AAD expiring in 7 days
- Compliance: 98% fleet current
- Last incident: Minor canopy collision, 6 days ago (RESOLVED)

---

## H. What Blocks a Real Pilot Launch

1. **Database won't start** — MySQL connection / schema push issues must be resolved first
2. **No CG safety gate** — Aircraft could fly overweight. Unacceptable safety risk
3. **No license/currency system** — Unlicensed people could be manifested
4. **No instructor assignments** — Cannot run tandem or AFF operations
5. **No booking flow** — Customers cannot reserve and pay
6. **Load FSM incomplete** — Missing timer states that drive DZ operations
7. **No role-specific dashboards** — Every user sees the same generic page
8. **No logbook** — Athletes have no reason to use the platform
9. **No check-in compliance** — The 8-point safety grid is the core manifest workflow
10. **No exit order** — Loads jump in undefined order (safety hazard for separation)

---

## I. File Action Plan (P0 Items)

### Schema Changes (prisma/schema.prisma)
```
ADD enum values: THIRTY_MIN, TWENTY_MIN, TEN_MIN to LoadStatus
ADD model: CgCheck
ADD model: License
ADD model: CurrencyCheck
ADD model: LogbookEntry
ADD model: AffRecord
ADD model: InstructorProfile
ADD model: InstructorSkill
ADD model: InstructorAvailability
ADD model: Booking
ADD model: BookingPackage
ADD model: EventOutbox
ADD model: WaitlistEntry
```

### API Route Files
```
CREATE: apps/api/src/routes/booking.ts
CREATE: apps/api/src/routes/training.ts
CREATE: apps/api/src/routes/instructor.ts
UPDATE: apps/api/src/routes/manifest.ts (CG endpoint, exit order, timer transitions)
UPDATE: apps/api/src/routes/identity.ts (license, currency, logbook endpoints)
UPDATE: apps/api/src/services/loadFsm.ts (add timer states, CG gate)
CREATE: apps/api/src/services/currencyEngine.ts
CREATE: apps/api/src/services/instructorMatcher.ts
CREATE: apps/api/src/services/bookingService.ts
```

### Frontend Pages
```
UPDATE: apps/web/src/app/dashboard/page.tsx (role-based rendering)
CREATE: apps/web/src/app/dashboard/load-board/ (real-time manifest board)
UPDATE: apps/web/src/app/dashboard/logbook/page.tsx (digital logbook)
CREATE: apps/web/src/app/dashboard/training/ (AFF progression)
CREATE: apps/web/src/app/dashboard/instructor/ (instructor dashboard)
UPDATE: apps/web/src/app/dashboard/checkin/page.tsx (compliance grid)
UPDATE: apps/web/src/app/dashboard/manifest/[loadId]/page.tsx (CG modal, exit order)
```

### Seed Data
```
UPDATE: prisma/seed.ts (add licenses, logbook entries, instructor profiles, bookings, CG checks)
```
