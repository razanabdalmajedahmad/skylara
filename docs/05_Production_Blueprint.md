# SKYLARA

_Source: 05_Production_Blueprint.docx_

SKYLARA
The Global Operating System for Flying
"Behind every flyer is a story."
Production System Design Blueprint  ·  v4.0  ·  April 2026  ·  CONFIDENTIAL
# Table of Contents
§1    SYSTEM ARCHITECTURE
Modular Monolith V1 · Microservices V2 · Event-Driven · Offline-First
## 1.1  Architecture Philosophy
SkyLara V1 is a modular monolith — one deployable unit with strict internal module boundaries. This eliminates distributed-systems complexity during the product-market fit phase while preserving a clean extraction path to microservices in V2. The decision was made after recognizing that premature microservices add operational overhead (10+ services, distributed tracing, schema federation) before a single DZ has validated the product in production.
## 1.2  V1 — Modular Monolith Structure
### 1.2.1  Tech Stack
## 1.3  V2 — Microservices Extraction Roadmap
Each module has a defined extraction trigger. V2 happens when load or team size justifies the operational overhead — not before.
## 1.4  API Architecture
§2    EVENT-DRIVEN SYSTEM
Redis Streams · Guaranteed Delivery · No Data Loss — Fixing the Fire-and-Forget Problem
## 2.1  The Problem: Why Redis Pub/Sub Failed
## 2.2  Redis Streams Architecture
Redis Streams provide persistent, ordered, consumer-group-based message delivery. Messages remain in the stream until acknowledged. Consumer groups allow multiple services to process events independently, with retry on failure.
### 2.2.1  Transactional Outbox Pattern (Zero Data Loss)
For events triggered by DB writes (e.g. payment captured), we use the Transactional Outbox Pattern: the event is written to an outbox table IN THE SAME TRANSACTION as the business data. A separate relay process reads the outbox and publishes to Redis Streams. This guarantees the event is emitted if and only if the transaction committed.
### 2.2.2  Event Categories by Delivery Requirement
§3    DATABASE DESIGN — MYSQL 8.0
Full Relational Schema · InnoDB · ACID · All Foreign Keys · Normalized
## 3.1  Schema Design Principles
All tables use surrogate BIGINT auto-increment PKs. UUIDs are used for external-facing IDs (exposed in APIs). All financial tables are append-only — no UPDATE on amount fields, use reversal records instead. Soft-deletes via deleted_at timestamp on all primary entities. All timestamps in UTC.
### 3.1.1  Core User Tables
users table (key columns)
### 3.1.2  Dropzone & Branch Tables
dz_branches table: id, uuid, dropzone_id (FK), name, address, lat, lng, timezone_override, status, created_at — allows one DZ organization to manage multiple physical locations under a single account.
### 3.1.3  Aircraft Table
### 3.1.4  Loads & Slots (Core Manifest)
### 3.1.5  Athlete Identity Tables
### 3.1.6  Gear & Safety Tables
### 3.1.7  Financial Tables
### 3.1.8  USPA Verification Table
### 3.1.9  Notifications, Story, Shop & AI Tables
## 3.2  Key Indexes & Constraints
§4    OFFLINE-FIRST ARCHITECTURE
IndexedDB · Service Workers · Background Sync · Conflict Resolution
## 4.1  Why Offline Is Non-Negotiable
## 4.2  Offline Scope by Role
## 4.3  IndexedDB Schema (Client)
## 4.4  Service Worker Strategy
## 4.5  Sync Engine & Conflict Resolution
§5    SAFETY GATES
CG Blocking FSM · Exit Order Algorithm · Override Audit Log
## 5.1  Load FSM with CG Blocking Gate
The load state machine enforces CG verification as a hard blocking condition. No state transition from LOCKED to 30MIN is possible without a completed, passed CG check. This is enforced at the service layer — the API returns 422 Unprocessable Entity if attempted.
## 5.2  CG Calculation Method
CG Result: PASS if calculated CG is within aircraft-specific envelope (±2% margin). MARGINAL triggers a warning but does not block. FAIL blocks the transition.
## 5.3  Exit Order Algorithm — 9-Group Specification
Exit order is safety-critical. The following algorithm is the default, configurable by S&TA per DZ. All overrides are logged to override_log.
## 5.4  Weight Policy (Replacing BMI)
§6    USPA LICENSE VERIFICATION REALITY
No API Exists · Fallback Design · Future-Ready Schema
## 6.1  The Reality
## 6.2  Verification Tiers (Implemented in V1)
## 6.3  Currency Enforcement (Without API)
License currency (A/B: 90-day, C/D: 180-day) is tracked from logbook entries. Since jump records are entered by athletes and countersigned by coaches, currency is calculated from the last verified logbook entry date — not from USPA records. Staff can flag discrepancies.
The currency_checks table records the result of each currency evaluation. If a jumper is EXPIRED, the check-in engine blocks them and notifies them with the specific expired date and required action.
§7    DASHBOARD UX SYSTEM
5 Roles · Mobile-First · Real-Time · Offline-Aware
## 7.1  DZ Operator Dashboard
## 7.2  Manifest Staff Dashboard
## 7.3  Athlete Dashboard
## 7.4  Instructor Dashboard
## 7.5  Platform Admin Dashboard (Multi-DZ)
§8    MOBILE STRATEGY
React Native Decision · Offline Support · Push Notifications
## 8.1  Decision: React Native (Expo) — Not PWA
## 8.2  Offline Architecture in React Native
## 8.3  PWA Configuration (Fallback)
For users who cannot or will not install the app, SkyLara web provides a PWA with: manifest.json for install prompts on Android, Service Worker with offline manifest board caching, push notification support on Android Chrome and iOS Safari 16.4+. Limitations are clearly shown in-app: "For full offline and push support, install the SkyLara app."
§9    AI SYSTEM
Claude 3 Integration · Load Optimizer · Risk Alerts · Predictive Scheduling
## 9.1  Design Philosophy
## 9.2  AI Components
## 9.3  System Prompt Design — Load Optimizer
The Load Optimizer receives a structured JSON context including: current load slots (jump types, altitudes, instructor assignments), aircraft payload remaining, weather status, and DZ pricing. The prompt instructs Claude to return structured JSON recommendations (not prose) that can be parsed and displayed directly in the manifest UI. Output schema is validated via Zod before any UI rendering.
§10    STORY LAYER
Athlete Identity · Jump Timeline · Achievements · Social Feed
## 10.1  Why This Differentiates SkyLara
Every competitor focuses on operations: manifesting, payments, scheduling. SkyLara is the only platform that also captures the identity of the flyer. A jumper who has 2,000 logged jumps in SkyLara across 15 dropzones worldwide has a richer presence here than anywhere else. This network effect locks in athletes — not just operators.
## 10.2  Athlete Identity Profile
## 10.3  Jump Timeline Feed
The Jump Timeline is a chronological feed of a jumper's logged entries, interspersed with milestone cards. Each entry shows: jump number, DZ name, altitude, jump type, notes from jumper, coach sign-off badge if present, attached video/photo if uploaded.
Milestone cards automatically appear at: 1st jump, 10th, 25th, 50th, 100th, 200th, 500th, 1000th, 2000th, every 500th thereafter, first jump at new DZ, first international jump, AFF completion, license upgrades.
## 10.4  Achievement System
## 10.5  Social Feed
§11    EXTENDED PLATFORM FEATURES
Multi-DZ · Social Media · Weather + Airspace · Online Shop
## 11.1  Multi-Dropzone Architecture
## 11.2  Social Media + Marketing Integration
## 11.3  Weather + Airspace Integration
Automated hold logic: if wind_kts > dz_settings.wind_limit OR cloud_base_ft < dz_settings.min_cloud_base, system recommends a weather hold to the operator and can auto-create a WeatherHold record. The DZ operator must confirm — system never autonomously cancels loads.
## 11.4  Online Shop
§12    CRITICAL RISKS & MITIGATIONS
Aviation-Grade Risk Assessment · Severity · Likelihood · Owner
## 12.1  Risk Matrix
## 12.2  Build Sequence Recommendation
The following sequence minimizes risk while building toward the full vision:
## 12.3  Definition of Production-Ready

| Attribute | Detail |
| --- | --- |
| Document Version | v4.0 — CTO-Reviewed & Redesigned |
| Status | PRODUCTION DESIGN — ALL CRITIQUE ISSUES RESOLVED |
| Architecture | Modular Monolith (V1) → Microservices (V2) |
| Database | MySQL 8.0 (InnoDB) — Full Relational Schema |
| Offline Strategy | IndexedDB + Service Worker + Background Sync |
| Event System | Redis Streams with consumer groups (financial-safe) |
| Safety | CG blocking FSM gate + Exit Order specification |
| Mobile | React Native (iOS + Android) + PWA fallback |
| AI | Claude 3 integration — operational layer (not chatbot) |

| DECISION | Modular Monolith for V1. Each module owns its domain (manifest, identity, payments, etc.) and communicates internally via typed service interfaces — never direct DB cross-queries. When V2 extraction is triggered, each module becomes a service with a known API boundary already defined. |
| --- | --- |

| Module | Owns | Exposes | Key Dependencies |
| --- | --- | --- | --- |
| manifest | Loads, Slots, ExitGroups, Waitlist, CGChecks | ManifestService interface | identity, payments, notifications |
| identity | Athletes, Licenses, Logbook, AFF, Gear | IdentityService interface | (none — identity is the base) |
| payments | Transactions, Wallets, JumpTickets, Splits | PaymentService interface | identity, Stripe SDK |
| booking | OnlineBookings, Packages, Availability | BookingService interface | identity, payments, manifest |
| notifications | Delivery, Templates, Channels, Prefs | NotificationService interface | identity, AWS SES/SNS/FCM |
| story | Posts, Timeline, Achievements, Feed | StoryService interface | identity |
| shop | Products, Inventory, Orders | ShopService interface | payments, identity |
| weather | WeatherData, Holds, Forecasts | WeatherService interface | external APIs |
| ai | Insights, Optimizer, Anomalies | AIService interface | all modules read-only |
| reporting | EOD, Revenue, MultiDZ Rollup | ReportingService interface | all modules read-only |
| auth | Users, RBAC, Sessions, MFA | AuthService interface | (none — lowest layer) |

| Layer | Technology | Rationale |
| --- | --- | --- |
| Runtime | Node.js 20 LTS + TypeScript 5 | Type safety, ecosystem, real-time via native async |
| Framework | Fastify (REST) + tRPC (internal) | 10x faster than Express, full type inference |
| Database | MySQL 8.0 (InnoDB) on AWS RDS | ACID guarantees, JSON columns, proven at scale |
| Cache | Redis 7 (ElastiCache) | Session cache, rate limiting, pub/sub for UI events |
| Queue | Redis Streams | Reliable event delivery with consumer groups |
| Real-Time | Socket.io v4 (WebSocket + polling fallback) | Handles 99% of browser/app environments |
| Frontend | Next.js 14 (App Router) + React 18 | SSR + client hydration, route-level auth |
| Mobile | React Native 0.73 (Expo) | Shared logic with web, offline-first capable |
| Storage | AWS S3 + CloudFront CDN | Media, gear photos, story content |
| Auth | JWT (short-lived) + Refresh Tokens + MFA | Industry standard, RBAC compatible |
| Payments | Stripe Connect | Split payments, Connect accounts for DZ operators |
| AI | Claude 3 Sonnet via Anthropic API | Operational intelligence layer |
| Infra | AWS ECS (Fargate) + RDS + ElastiCache | Managed, auto-scaling, no k8s overhead in V1 |
| CI/CD | GitHub Actions + ECR + ECS Blue/Green | Zero-downtime deploys |
| Monitoring | DataDog APM + PagerDuty | Full observability + on-call alerting |

| Service | Extraction Trigger | Estimated Timeline |
| --- | --- | --- |
| manifest-service | Real-time load at >50 concurrent DZs OR WebSocket connections exceed 5,000 | V2 Phase 1 |
| payment-service | PCI DSS audit requires isolation OR transaction volume >$1M/month | V2 Phase 1 |
| identity-service | Cross-DZ athlete queries cause DB contention OR GDPR requires data residency | V2 Phase 1 |
| notification-service | Notification volume exceeds 100k/day OR multi-channel SLA diverges | V2 Phase 2 |
| ai-service | AI response latency affects UI OR model switching requires isolation | V2 Phase 2 |
| booking-service | Public API demand exceeds monolith capacity | V2 Phase 2 |
| story-service | Social feed requires independent scaling from operations | V2 Phase 3 |
| shop-service | Marketplace volume justifies separate deployment | V2 Phase 3 |

| Endpoint Type | Path Pattern | Auth | Use Case |
| --- | --- | --- | --- |
| REST (public) | GET/POST /api/v1/{module}/... | JWT Bearer | All frontend + mobile requests |
| WebSocket | ws://app/realtime | JWT + room token | Load board, slot updates, call times |
| Webhooks (inbound) | POST /webhooks/stripe | Stripe-Signature header | Payment events from Stripe |
| Internal (tRPC) | N/A — in-process call | Service context | Cross-module calls within monolith |
| Admin API | /api/v1/admin/... | JWT + admin role | Multi-DZ admin, platform management |

| CRITICAL FIX | Redis Pub/Sub is fire-and-forget. If payment-service is down when payment.captured fires, the ticket credit NEVER happens. This is a permanent data loss scenario for financial events. All financial events MUST use Redis Streams with consumer groups. |
| --- | --- |

| Stream | Events | Consumer Groups | Retention |
| --- | --- | --- | --- |
| skylara:financial | payment.captured, ticket.credited, split.calculated, refund.issued, eod.finalized | payment-processor, reporting, wallet-updater | 90 days |
| skylara:manifest | load.created, load.state_changed, slot.assigned, cg.verified, waitlist.triggered | manifest-processor, notification-dispatcher, ai-observer | 30 days |
| skylara:identity | athlete.checked_in, license.expired, currency.suspended, aff.level_passed | identity-processor, notification-dispatcher | 60 days |
| skylara:ops | weather.hold_triggered, aircraft.mx_flag, override.logged | ops-processor, notification-dispatcher, reporting | 30 days |

| Step | Action | Guarantees |
| --- | --- | --- |
| 1 | Payment captured → write transaction row + outbox row in same MySQL TX | Atomicity: both succeed or both fail |
| 2 | Outbox relay reads unpublished outbox rows (polling 100ms) | No event lost even if app crashes after step 1 |
| 3 | Relay publishes to Redis Stream, marks outbox row published | At-least-once delivery |
| 4 | Consumer group processes event, ACKs on success | Retry on failure up to 5x with exponential backoff |
| 5 | Dead-letter stream receives events after 5 failures | Alert + manual review, never silent loss |

| Category | Transport | Why |
| --- | --- | --- |
| Financial (payment, ticket, split, refund) | Redis Streams + Outbox | Zero data loss required — money involved |
| Safety (CG check, license expiry, gear fail) | Redis Streams + Outbox | Safety-critical — must be auditable |
| Operational (load state, slot assign, waitlist) | Redis Streams (no outbox) | High frequency, tolerate rare retry |
| Real-Time UI (load board update, call time) | Redis Pub/Sub → WebSocket | Fire-and-forget OK — UI will re-sync |
| Notifications (push, SMS, email dispatch) | Redis Streams | Retry on channel failure important |

| Table | Purpose | Key Relationships |
| --- | --- | --- |
| users | Base user account (auth credentials, contact info) | Root of all identity |
| roles | Role definitions (DZ_OPERATOR, MANIFEST_STAFF, TI, AFFI, ATHLETE, STUDENT, PILOT, RIGGER) | Referenced by user_roles |
| user_roles | Many-to-many users ↔ roles, scoped to a dropzone | FK: users.id, roles.id, dropzones.id |
| user_profiles | Extended profile (bio, avatar, emergency contact, social links) | FK: users.id (1:1) |
| sessions | Active JWT refresh tokens with device info | FK: users.id |
| mfa_tokens | TOTP secrets for MFA-enrolled users | FK: users.id (1:1) |

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK AUTO_INCREMENT | Internal primary key |
| uuid | CHAR(36) | UNIQUE NOT NULL | External-facing UUID (API responses) |
| email | VARCHAR(255) | UNIQUE NOT NULL | Login email, lowercase normalized |
| phone | VARCHAR(20) | NULLABLE | E.164 format for SMS notifications |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt, cost=12 |
| first_name | VARCHAR(100) | NOT NULL |  |
| last_name | VARCHAR(100) | NOT NULL |  |
| status | ENUM(active,suspended,pending_verify) | DEFAULT active | Account status |
| email_verified_at | TIMESTAMP | NULLABLE | NULL = unverified |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |  |
| deleted_at | TIMESTAMP | NULLABLE INDEX | Soft delete |

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK AUTO_INCREMENT |  |
| uuid | CHAR(36) | UNIQUE NOT NULL |  |
| name | VARCHAR(200) | NOT NULL | Legal DZ name |
| icao | VARCHAR(4) | NULLABLE | Airport ICAO code if applicable |
| timezone | VARCHAR(50) | NOT NULL | e.g. America/New_York (IANA) |
| plan | ENUM(starter,pro,enterprise) | DEFAULT starter | SaaS subscription tier |
| stripe_account_id | VARCHAR(100) | NULLABLE | Stripe Connect account for payouts |
| default_weight_limit_lbs | SMALLINT UNSIGNED | DEFAULT 220 | DZ-configurable weight limit |
| settings | JSON | NOT NULL DEFAULT "{}" | DZ-level config (pricing, rules, integrations) |
| owner_id | BIGINT UNSIGNED | FK users.id | Primary DZ owner |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |  |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete |

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK AUTO_INCREMENT |  |
| dropzone_id | BIGINT UNSIGNED | FK dropzones.id NOT NULL | Owning DZ |
| tail_number | VARCHAR(20) | NOT NULL | FAA registration |
| type | VARCHAR(100) | NOT NULL | e.g. PAC 750XL, Twin Otter |
| max_seats | TINYINT UNSIGNED | NOT NULL | Maximum jumper capacity |
| max_tow_lbs | SMALLINT UNSIGNED | NOT NULL | Max takeoff weight |
| empty_weight_lbs | SMALLINT UNSIGNED | NOT NULL | For CG calculation |
| usable_payload_lbs | SMALLINT UNSIGNED | NOT NULL | max_tow - empty - fuel reserve |
| max_altitude_ft | MEDIUMINT UNSIGNED | NOT NULL | Certified jump altitude |
| fuel_burn_gph | SMALLINT UNSIGNED | NOT NULL | Gallons per hour for cost calc |
| status | ENUM(active,mx_hold,retired) | DEFAULT active |  |
| next_mx_date | DATE | NULLABLE | Upcoming maintenance |
| total_jumps | INT UNSIGNED | DEFAULT 0 | Lifetime jump counter |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |  |

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK AUTO_INCREMENT |  |
| uuid | CHAR(36) | UNIQUE NOT NULL |  |
| dropzone_id | BIGINT UNSIGNED | FK dropzones.id NOT NULL |  |
| branch_id | BIGINT UNSIGNED | FK dz_branches.id NULLABLE |  |
| aircraft_id | BIGINT UNSIGNED | FK aircraft.id NOT NULL |  |
| altitude_ft | MEDIUMINT UNSIGNED | NOT NULL | Jump altitude for this load |
| status | ENUM(OPEN,FILLING,LOCKED,30MIN,20MIN,10MIN,BOARDING,AIRBORNE,LANDED,COMPLETE,CANCELLED) | NOT NULL DEFAULT OPEN | FSM state — see §5 for CG gate |
| slot_count | TINYINT UNSIGNED | NOT NULL | Aircraft max seats for this load |
| slots_filled | TINYINT UNSIGNED | DEFAULT 0 | Updated by trigger or service |
| cg_verified_at | TIMESTAMP | NULLABLE | NULL blocks LOCKED → 30MIN transition |
| cg_verified_by | BIGINT UNSIGNED | FK users.id NULLABLE | Staff who signed off CG |
| scheduled_call_time | TIMESTAMP | NULLABLE | Expected takeoff time |
| actual_takeoff | TIMESTAMP | NULLABLE | Logged when AIRBORNE |
| actual_land | TIMESTAMP | NULLABLE | Logged when LANDED |
| notes | TEXT | NULLABLE | Staff notes |
| created_by | BIGINT UNSIGNED | FK users.id NOT NULL |  |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |  |

| Column | Type | Constraint | Description (slots table) |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK AUTO_INCREMENT |  |
| load_id | BIGINT UNSIGNED | FK loads.id NOT NULL |  |
| athlete_id | BIGINT UNSIGNED | FK athletes.id NOT NULL |  |
| jump_type | ENUM(TANDEM,AFF,FUN_JUMP,COACH,HOP_POP,NIGHT,WINGSUIT,CRW) | NOT NULL |  |
| altitude_ft | MEDIUMINT UNSIGNED | NOT NULL | May differ from load altitude |
| exit_group | TINYINT UNSIGNED | NULLABLE | 1–9, populated by exit order engine |
| exit_order_in_group | TINYINT UNSIGNED | NULLABLE | Order within exit group |
| status | ENUM(MANIFESTED,CHECKED_IN,BOARDING,JUMPED,NO_SHOW,CANCELLED) | DEFAULT MANIFESTED |  |
| instructor_id | BIGINT UNSIGNED | FK users.id NULLABLE | For tandem/AFF slots |
| ticket_id | BIGINT UNSIGNED | FK jump_tickets.id NULLABLE | Ticket used for this jump |
| gear_check_id | BIGINT UNSIGNED | FK gear_checks.id NULLABLE | Required before BOARDING |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |  |

| Table | Key Columns | Notes |
| --- | --- | --- |
| athletes | id, user_id (FK), uspa_number, license_class, total_jumps, currency_suspended_at, home_dz_id | Extends users 1:1 |
| licenses | id, athlete_id, type (A/B/C/D/E/AFF/COACH/TI/AFFI), issued_date, expiry_date, verified_by, verification_method (MANUAL/STAFF_CHECK/FUTURE_API), verified_at | No USPA API — see §6 |
| logbook_entries | id, athlete_id, load_id, dropzone_id, altitude_ft, jump_type, exit_type, freefall_secs, deployment_alt, landing_notes, coach_sign_off_id, jump_date, created_at | USPA IRM compliant |
| aff_records | id, athlete_id, instructor_id, level (1-8), attempt_number, passed, evaluation_notes, video_url, jump_date, created_at | Level 8 = A-license sign-off |
| currency_checks | id, athlete_id, license_class, last_jump_date, days_since_jump, status (CURRENT/WARNING/EXPIRED), checked_at | Runs on login + check-in |

| Table | Key Columns | Notes |
| --- | --- | --- |
| gear_items | id, owner_id (FK users), dropzone_id (FK, nullable for personal gear), type (CONTAINER/RESERVE/AAD/HELMET/ALTIMETER/SUIT), serial_number, manufacturer, model, dom_date, repack_date, aad_expiry_date, status (APPROVED/GROUNDED/EXPIRED), created_at | Tracks all gear |
| gear_checks | id, gear_item_id, inspector_id, slot_id, result (PASS/FAIL/GROUNDED), notes, checked_at | Per-jump record |
| cg_checks | id, load_id, aircraft_id, total_jumper_weight_lbs, fuel_weight_lbs, pilot_weight_lbs, calculated_cg, cg_margin_pct, result (PASS/FAIL/MARGINAL), performed_by, performed_at | Blocking gate for FSM |
| gear_rentals | id, gear_item_id, athlete_id, slot_id, rate_type, rate_amount, deposit_held, damage_deposit_captured, returned_at, created_at | Rental lifecycle |

| Table | Key Columns | Notes |
| --- | --- | --- |
| wallets | id, athlete_id (FK UNIQUE), balance_cents, currency, last_updated_at | One wallet per athlete |
| jump_tickets | id, wallet_id, dropzone_id, altitude_ft, type (SINGLE/BOOK), purchase_price_cents, status (ACTIVE/USED/EXPIRED/REFUNDED), expires_at, used_at, slot_id | Escrow-style — immutable after creation |
| transactions | id, uuid, dropzone_id, athlete_id, slot_id, type (TICKET_PURCHASE/BOOKING/RENTAL/SHOP/REFUND/CREDIT), amount_cents, currency, status (PENDING/CAPTURED/SETTLED/REFUNDED), stripe_payment_intent_id, created_at | Append-only |
| commission_splits | id, transaction_id, recipient_type (DZ/INSTRUCTOR/PACKER/PLATFORM), recipient_id, amount_cents, percentage, settled_at | Per-transaction splits |
| payments | id, transaction_id, stripe_payment_intent_id, stripe_charge_id, method (CARD/ACH/GIFT_CARD), amount_cents, fee_cents, net_cents, status, captured_at, refunded_at | Stripe record |
| gift_cards | id, dropzone_id, code, initial_balance_cents, current_balance_cents, issued_to_email, status (ACTIVE/DEPLETED/EXPIRED), expires_at | DZ gift card program |
| event_outbox | id, aggregate_type, aggregate_id, event_type, payload JSON, published_at NULLABLE, created_at | Transactional outbox — see §2 |

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK |  |
| athlete_id | BIGINT UNSIGNED | FK athletes.id NOT NULL |  |
| license_id | BIGINT UNSIGNED | FK licenses.id NOT NULL |  |
| verification_method | ENUM(SELF_REPORTED,STAFF_VISUAL,STAFF_ENTRY,PHOTO_UPLOAD,FUTURE_USPA_API) | NOT NULL | Reality-aware — no API today |
| verified_by_user_id | BIGINT UNSIGNED | FK users.id NULLABLE | Staff member who verified |
| card_photo_url | VARCHAR(500) | NULLABLE | S3 URL of license card photo |
| uspa_member_number | VARCHAR(20) | NULLABLE | Member number for future API query |
| notes | TEXT | NULLABLE | Staff verification notes |
| verified_at | TIMESTAMP | NOT NULL |  |
| expires_check_at | TIMESTAMP | NULLABLE | Re-verify prompt (annual) |

| Table | Key Columns | Notes |
| --- | --- | --- |
| notification_templates | id, dz_id (nullable for system templates), name, channel (PUSH/SMS/EMAIL), subject, body_template, variables JSON | Template library |
| notifications | id, recipient_id, channel, template_id, payload JSON, status (QUEUED/SENT/DELIVERED/FAILED), sent_at, delivered_at | Delivery record |
| social_posts | id, uuid, author_id (FK users), dz_id (nullable), post_type (JUMP_LOG/MILESTONE/STORY/DZ_ANNOUNCEMENT), content TEXT, media_urls JSON, visibility (PUBLIC/DZ/PRIVATE), likes_count, comments_count, jump_number (nullable), published_at | Story feed content |
| social_comments | id, post_id (FK), author_id, content, created_at, deleted_at |  |
| social_reactions | id, post_id, user_id, reaction_type (LIKE/FIRE/CLAP), unique(post_id,user_id) |  |
| achievements | id, code, name, description, category (MILESTONE/SKILL/SOCIAL/DZ_SPECIFIC), icon_url, criteria JSON | Achievement definitions |
| athlete_achievements | id, athlete_id, achievement_id, earned_at, jump_count_at_earn, notified | Earned achievements |
| shop_products | id, dz_id, name, description, category, price_cents, sku, media_urls JSON, status (ACTIVE/INACTIVE/OUT_OF_STOCK), created_at | DZ shop items |
| shop_inventory | id, product_id, quantity_on_hand, low_stock_threshold, updated_at | Real-time stock |
| shop_orders | id, uuid, athlete_id, dz_id, status (PENDING/PAID/FULFILLED/CANCELLED), total_cents, shipping_address JSON, fulfilled_at |  |
| shop_order_items | id, order_id, product_id, quantity, unit_price_cents, subtotal_cents | Order line items |
| weather_data | id, dz_id, source (METAR/AVIATIONWEATHER/OPENMETEO), raw_data JSON, wind_kts, gusts_kts, visibility_sm, cloud_base_ft, temp_c, status (VFR/MVFR/IFR/LIFR), recorded_at | Cached weather |
| weather_holds | id, dz_id, triggered_by (AUTO/MANUAL), reason, started_at, cleared_at, affected_loads_count | Hold events |
| ai_insights | id, dz_id, type (LOAD_OPTIMIZE/RISK_ALERT/REVENUE_INSIGHT/STAFFING_SUGGEST), title, body TEXT, data JSON, priority (LOW/MEDIUM/HIGH/CRITICAL), acknowledged_at, created_at | AI-generated insights |
| override_log | id, user_id, entity_type, entity_id, field_changed, old_value, new_value, reason, created_at | Audit trail for all manual overrides |

| Table | Index | Purpose |
| --- | --- | --- |
| loads | IX_loads_dz_status (dz_id, status) | Real-time load board queries |
| slots | IX_slots_load_id, IX_slots_athlete_id | Slot lookup by load and athlete |
| logbook_entries | IX_logbook_athlete_date (athlete_id, jump_date) | Jump history queries |
| transactions | IX_tx_athlete_status, IX_tx_dz_created | Financial reporting |
| notifications | IX_notif_recipient_status | Notification delivery tracking |
| weather_data | IX_weather_dz_recorded (dz_id, recorded_at DESC) | Latest weather fetch |
| event_outbox | IX_outbox_published (published_at) WHERE published_at IS NULL | Relay polling |

| REALITY | Dropzones are in rural airfields. 4G coverage is unreliable. A manifest system that goes dark when connectivity drops will be abandoned in one season. Offline capability is the single biggest differentiator over web-only competitors like Unifi. |
| --- | --- |

| Feature | Online | Offline (local) | Sync Trigger |
| --- | --- | --- | --- |
| Manifest Board — view loads | Real-time WS | Read from IndexedDB | On reconnect |
| Manifest Board — add slot | Immediate DB write | Write to IndexedDB + outbox | Background sync |
| Check-in (QR scan + compliance) | Verify against server | Last-known athlete cache | Background sync |
| Call times (view) | WebSocket push | IndexedDB snapshot | Background sync |
| Payment (ticket deduction) | Real-time | BLOCKED — require online | N/A (by design) |
| Athlete profile (view) | Server fetch | IndexedDB cache (15min TTL) | On load |
| Gear check log | Real-time write | Queue in outbox | Background sync |
| CG calculation | Server-side verified | Local calculation (advisory only) | Server confirms on reconnect |
| Weather data | Real-time fetch | Last cached data + staleness warning | On reconnect |

| DESIGN PRINCIPLE | Payments are always online-required. Allowing offline ticket deduction creates double-spend risk. Staff should be informed via a clear UI state: "Payment features require connectivity." All other operational features degrade gracefully. |
| --- | --- |

| Object Store | Key Path | Indexes | Data Stored |
| --- | --- | --- | --- |
| loads | id | dz_id, status, updated_at | Active load objects (full) |
| slots | id | load_id, athlete_id | Slot objects for open loads |
| athletes_cache | id | uspa_number, last_name | Athlete search cache (lightweight) |
| compliance_cache | athlete_id | expires_at | Compliance check results (15min TTL) |
| gear_checks_queue | local_id | synced, created_at | Offline gear checks awaiting sync |
| slot_changes_queue | local_id | synced, created_at | Offline slot changes awaiting sync |
| notifications_local | id | read, created_at | Local notification inbox |
| weather_cache | dz_id | recorded_at | Latest weather per DZ |
| meta | key | (none) | Sync timestamps, app version, user context |

| SW Route Pattern | Cache Strategy | Reason |
| --- | --- | --- |
| Static assets (JS, CSS, fonts) | Cache First (Stale-While-Revalidate) | Never change between deploys |
| GET /api/v1/manifest/loads/* | Network First → IndexedDB fallback | Always try server; use cache if offline |
| GET /api/v1/identity/athletes/* | Network First → 15min cache fallback | Profile data with TTL |
| GET /api/v1/weather/* | Network First → stale-ok fallback | Show age of cached data |
| POST /api/v1/manifest/slots | Background Sync queue if offline | Queue mutation for later |
| POST /api/v1/manifest/gear-check | Background Sync queue if offline | Queue mutation for later |
| All other POST/PUT/DELETE | Network Only — show offline error | Cannot queue without sync strategy |

| Conflict Scenario | Detection | Resolution Strategy |
| --- | --- | --- |
| Slot added offline → same slot filled online | Server returns 409 on sync | Reject offline change, notify staff, re-display current load state |
| Load cancelled while offline staff editing it | Server returns 410 Gone on sync | Discard all pending changes, notify staff with reason |
| Athlete compliance changed while offline | TTL expiry + re-fetch on reconnect | Latest server data wins — safety-critical, never stale |
| Two staff offline assign same slot | Vector clock / last-write-wins by server timestamp | Server assigns first arrived, returns error to second with current state |
| Gear check recorded offline → athlete never boarded | Orphaned outbox record detected on sync | Log to override_log as reconciliation entry, do not apply |

| From State | To State | Blocking Conditions | Who Can Trigger |
| --- | --- | --- | --- |
| OPEN | FILLING | None | Auto (first slot added) |
| FILLING | LOCKED | All slots filled OR manual lock | Manifest staff, DZ operator |
| LOCKED | 30MIN | CG check MUST exist with result=PASS for this load. Also: all slots have valid gear checks OR are student slots with TI assigned. Missing CG = HARD BLOCK. | Manifest staff (with CG signed off) |
| 30MIN | 20MIN | None (timer or manual) | Auto-timer or manifest staff |
| 20MIN | 10MIN | None | Auto-timer or manifest staff |
| 10MIN | BOARDING | All boarding athletes have completed check-in | Manifest staff |
| BOARDING | AIRBORNE | Manual confirmation (pilot or manifest staff) | Pilot, manifest staff |
| AIRBORNE | LANDED | Manual confirmation | Pilot, manifest staff |
| LANDED | COMPLETE | All slots reconciled (JUMPED or NO_SHOW) | Auto or manifest staff |
| ANY | CANCELLED | None | DZ operator, manifest staff |

| SAFETY RULE | If cg_checks has no PASS record for load_id AND load.status = LOCKED, the ManifestService.transitionLoad() method throws SafetyGateException. This cannot be bypassed via API. Manual override requires DZ_OPERATOR role AND writes to override_log with mandatory reason field. |
| --- | --- |

| Input | Source | Notes |
| --- | --- | --- |
| Aircraft empty weight | aircraft.empty_weight_lbs | From aircraft record |
| Fuel weight at takeoff | Entered by pilot/staff (lbs or gallons → lbs) | 1 gallon avgas = 6.0 lbs |
| Pilot weight | Staff-entered or pilot profile | Required field at load creation |
| Jumper weights (per slot) | athlete.weight_lbs OR staff-entered for tandem students | Weight, not BMI — see §5.4 |
| Gear weight (estimate) | 15 lbs per licensed jumper, 30 lbs per tandem student | Configurable per DZ |

| Priority | Group | Jump Types | Rationale |
| --- | --- | --- | --- |
| 1 (Last Exit) | High-pull / Accuracy | Hop & pop, accuracy canopy work | Low-altitude open → longest canopy time, must exit last to clear airspace |
| 2 | Student tandems | Tandem (student, first jump) | Requires most freefall time, TI aware of pattern |
| 3 | AFF Students | AFF levels 1–4 | Two instructors, more horizontal separation needed |
| 4 | AFF Advanced | AFF levels 5–8 | More stable, less separation needed |
| 5 | Experienced tandems | Tandem with experienced passenger | Less management needed |
| 6 | Belly formations | RW groups, 4-way, 8-way | Standard exit separation |
| 7 | Coach jumps | 1:1 coached licensed jumpers | Standard separation |
| 8 | Freefly | Sitfly, headdown groups | Higher fall rate, exit after belly |
| 9 (First Exit) | Wingsuit / CRW | Wingsuits, canopy formation | Longest horizontal travel, must exit first |

| Rule | Detail |
| --- | --- |
| Configurable | DZ S&TA can reorder groups via dz_settings.exit_order_config JSON |
| Override audit | Any staff change to a slot exit_group writes to override_log with old_value, new_value, reason (required) |
| Algorithm input | jump_type + aff_level (for AFF) + instructor_assigned |
| Pilot briefing | Auto-generated from exit_groups: group number, type, count, estimated separation interval in seconds |
| Conflict flag | If two incompatible jump types (e.g. wingsuit + accuracy) are on same load, AI system raises risk alert |

| LEGAL FIX | BMI as a gatekeeping criterion is legally contested and medically inappropriate for athletic assessment. SkyLara uses absolute weight with DZ-configurable limits. BMI logic is REMOVED entirely. |
| --- | --- |

| Field | Type | Notes |
| --- | --- | --- |
| athlete.weight_lbs | SMALLINT UNSIGNED | Self-reported at profile creation, staff can verify |
| dropzone.tandem_weight_limit_lbs | SMALLINT UNSIGNED DEFAULT 220 | DZ operator configurable |
| dropzone.fun_jump_weight_limit_lbs | SMALLINT UNSIGNED DEFAULT 260 | DZ operator configurable |
| dropzone.require_weight_verification | BOOLEAN DEFAULT false | If true, staff must confirm weight at check-in |
| slot check-in | ComplianceCheck runs weight vs limit | Returns PASS / ADVISORY (within 10 lbs of limit) / FAIL |

| FACT | USPA does not have a public API. As of April 2026, license verification is manual at all dropzones globally. Any system claiming "automatic USPA API sync" is either building a proprietary data partnership not yet available, or misrepresenting the feature. |
| --- | --- |

| Tier | Method | Trust Level | How It Works in SkyLara |
| --- | --- | --- | --- |
| 1 — Self-Reported | Athlete enters their own USPA number and license class | LOW | System stores data, flags as SELF_REPORTED. DZ operator can require upgrade to Tier 2 before manifesting. |
| 2 — Staff Visual Check | Manifest staff or S&TA views physical card at DZ | MEDIUM | Staff marks license as STAFF_VISUAL in system. Optional card photo upload to S3. |
| 3 — Staff Entry | S&TA manually enters verified license data from physical card | HIGH | Most trusted manual path. Logged with staff ID, timestamp, optional notes. |
| 4 — Photo Upload | Athlete uploads photo of their USPA card | MEDIUM-HIGH | Stored in S3. Staff reviews and approves. Flags as PHOTO_UPLOAD once approved. |
| 5 — Future USPA API | Direct API query to USPA database | VERIFIED | Schema and verification_method enum are pre-designed. Activates when partnership exists. |

| Zone | Widgets / Actions | Mobile Behavior |
| --- | --- | --- |
| Header | Active loads count, today revenue, weather status, aircraft availability | Full top bar, tap to expand |
| Operations Strip | Live load board (mini view), next scheduled load ETA, call time countdown | Swipeable horizontal cards |
| Revenue Panel | Today revenue vs target, jump count by type, hourly trend spark chart | Collapsed to single metric + tap |
| Staff Panel | On-duty roster, instructor load counts, pilot status | Accordion — tap to expand |
| Aircraft Status | Each tail with status badge (Active/MX Hold), next maintenance date, jumps today | Grid of cards |
| AI Insights Banner | Top 3 current AI recommendations (load gaps, weather window, staffing) | Persistent top card |
| Quick Actions | Create load, add announcement, view EOD report, switch branch | Bottom action bar on mobile |

| Zone | Widgets / Actions | Mobile Priority |
| --- | --- | --- |
| Load Board (Primary) | All active loads with status, slot count, call time, aircraft. Drag-and-drop slot assignment. | Full-screen primary view |
| Quick-Add Slot | Athlete search bar (name / USPA#), jump type, altitude selector, assign to load | Sticky bottom drawer |
| Check-In Panel | Scan QR or search athlete, run 8-point compliance, show gear check status | Tab 2 on mobile |
| CG Panel | Current load weight, calculate CG button, sign-off action (blocking gate) | Accessible from load detail |
| Waitlist | Current waitlist per load, auto-fill controls, no-show timer display | Load detail → waitlist tab |
| Call Time Controls | Manual override of call times, send push notification now, load notes | Load action menu |
| Offline Indicator | Yellow banner when offline: "Offline mode — payments unavailable, manifest cached" | Always visible when offline |

| Zone | Widgets / Actions | Mobile Priority |
| --- | --- | --- |
| Story Profile Header | Avatar, name, jump count, license badge, home DZ, experience tagline | Full hero section |
| Live Load Board (View) | Current open loads at current DZ, my slot status, call time countdown | Primary tab |
| My Next Jump | Current slot details, exit group, call time alert, weather status | Persistent top card when manifested |
| Jump Timeline | Chronological feed of jump log entries with milestone cards | Tab 2 — Story |
| Logbook | Full jump log, per-jump details, coach sign-offs, export to PDF | Tab 3 |
| Achievements | Earned badges, next milestone progress bars, share button | Story tab section |
| Wallet | Jump ticket balance, purchase tickets, transaction history | Tab 4 |
| Gear Bag | My registered gear, repack status, AAD expiry, gear alerts | Profile section |

| Zone | Widgets / Actions | Mobile Priority |
| --- | --- | --- |
| My Students Today | List of assigned tandem/AFF students, status per student (checked-in, manifested, jumped) | Primary view |
| AFF Evaluation Panel | Per-student level form, skill checkboxes, pass/fail, notes, video link | Load → student → evaluate |
| My Load Schedule | Loads I am assigned to, my exit slot, call time countdown | Tab 2 |
| Student History | Past student evaluations, AFF progression per student | Student profile tab |
| Quick Evaluation | Fast post-jump evaluation entry (< 30 seconds) | Floating action button post-landing |
| Earnings Summary | Jumps today/week, estimated earnings, commission breakdown | Earnings tab |

| Zone | Purpose | Access |
| --- | --- | --- |
| DZ Fleet Overview | All registered dropzones, plan tier, MRR, active users, last login | Platform admin only |
| Revenue Rollup | Platform-wide transaction volume, commission earned, payout status by DZ | Platform admin only |
| Usage Metrics | API calls, WebSocket connections, load counts, jump counts by region | Platform admin only |
| Feature Flags | Enable/disable features per DZ, manage beta access | Platform admin only |
| Support Queue | Flagged anomalies, override log review, compliance alerts | Platform admin + DZ support |

| Criterion | PWA | React Native (Expo) | Decision |
| --- | --- | --- | --- |
| Push notifications (iOS) | Limited (iOS 16.4+ only, no background) | Full native push via APNs/FCM | React Native wins |
| Offline / Service Workers | Good (web SW) | Native AsyncStorage + SQLite | React Native wins |
| QR scanner (check-in) | Via browser camera (inconsistent) | expo-barcode-scanner (reliable) | React Native wins |
| Background Sync | Web Background Sync API (limited) | Native background tasks | React Native wins |
| App Store presence | No native app listing | iOS App Store + Google Play | React Native wins |
| Dev velocity (shared code with web) | 100% code share | ~60% shared logic via shared packages | PWA wins — partially mitigated |
| Deployment speed (updates) | Instant | Expo OTA for JS, store review for native | PWA wins — EAS OTA mitigates |

| DECISION | React Native (Expo) for staff and athlete apps. PWA as fallback for non-app users (web manifest + offline caching). The push notification and offline requirements are not adequately met by PWA on iOS. Expo OTA updates minimize deployment friction. |
| --- | --- |

| Layer | Technology | Purpose |
| --- | --- | --- |
| Local DB | WatermelonDB (SQLite) | Offline-first reactive database, sync engine built-in |
| Sync Engine | WatermelonDB Synchronization Protocol | Pull/push sync with server, conflict resolution |
| State Management | Zustand + React Query | Local state + server cache layer |
| Background Tasks | expo-background-fetch + expo-task-manager | Periodic sync while app is backgrounded |
| Push Notifications | expo-notifications + FCM + APNs | Full native push on iOS and Android |
| QR Scanning | expo-barcode-scanner | Check-in via athlete QR code |
| Connectivity Detection | @react-native-community/netinfo | Offline state detection → UI indicator |

| PRINCIPLE | AI in SkyLara is an operational layer embedded in workflows — not a chatbot. Every AI action must have a fallback behavior if the AI service is unavailable. Latency budget per AI call: 2 seconds for insights, 500ms for risk alerts (pre-computed). The manifest board NEVER blocks on an AI call. |
| --- | --- |

| Component | Trigger | Model | Output | Fallback |
| --- | --- | --- | --- | --- |
| Load Optimizer | Load created or slot modified | Claude 3 Haiku (fast) | Recommended slot arrangement, instructor-student match, revenue per load estimate | No recommendation shown |
| Risk Alert Engine | Pre-computed every 5 min per active DZ | Rule-based + Claude 3 Haiku | Alerts: weight imbalance, expired currency about to board, weather deteriorating, overloaded TI | Rule-based only |
| Exit Order Validator | Load locked, exit groups assigned | Claude 3 Haiku | Validates exit order for safety conflicts, suggests corrections | Static rule check only |
| Predictive Scheduling | Daily at 06:00 local DZ time | Claude 3 Sonnet (quality) | Recommended load schedule for the day based on bookings, historical demand, weather forecast, staff | Skip — no recommendation |
| Revenue Insights | Weekly (Monday 07:00 local) | Claude 3 Sonnet | Jump mix analysis, pricing suggestions, slow-day patterns | Skip — show last cached |
| Staffing Recommender | On shift change or when load count changes | Claude 3 Haiku | Suggested instructor/pilot assignments given workload balance | Skip — no recommendation |
| Anomaly Detection | Continuous background scan | Rule-based + Claude 3 Haiku | Flag unusual patterns: sudden no-show spike, weather hold duration, revenue variance | Rule-based only (always on) |

| Field in AI Context | Source |
| --- | --- |
| aircraft.usable_payload_remaining_lbs | Calculated from CG check data |
| slots[].jump_type + altitude + weight | Current slot roster |
| instructors[].assigned_count + max_daily | Staff schedule data |
| weather.current_status + forecast_2hr | Weather service |
| dz.pricing + avg_revenue_per_slot | DZ settings + historical data |
| historical.avg_load_size_by_hour | Reporting module aggregates |

| BRAND CORE | "Behind every flyer is a story." The Story Layer is what turns an operations SaaS into a platform. Without it, SkyLara competes on features with Unifi. With it, SkyLara builds a community that DZs want to be part of. |
| --- | --- |

| Section | Content | Data Source |
| --- | --- | --- |
| Hero Card | Name, avatar, license badge, jump count, years jumping, home DZ | users + athletes + licenses |
| Story Tagline | Auto-generated or user-written one-liner ("2,400 jumps across 22 countries") | athletes + logbook aggregate |
| Journey Map | Interactive map of all DZs jumped at (dot per DZ, tap to see jump count) | logbook_entries + dropzones.lat_lng |
| Milestone Strip | Horizontal scroll of earned achievement badges | athlete_achievements |
| Discipline Tags | Auto-detected from jump types: Freefly, RW, Wingsuit, CRW, AFF Coach, Tandem Master | logbook aggregation |
| Gear Bag (optional public) | Containers, reserves, AADs the jumper owns and jumps | gear_items (visibility=PUBLIC) |
| Social Links | Instagram, YouTube, personal site | user_profiles |

| Category | Example Achievements |
| --- | --- |
| Milestones | First Jump, 100 Jumps, 500 Jumps, 1K Club, 2K Club, 5K Legend |
| Discipline | AFF Graduate, Licensed Skydiver, Freefly Initiate, Tunnel Rat (10+ tunnel hours), Wingsuit Pilot |
| Community | World Traveler (5+ DZs), Globe Trotter (3+ countries), Coach's Favorite (10+ coached jumps received) |
| DZ-Specific | DZ-created achievements: "Eloy Regular", "Perris 100 Club" — operators define own badges |
| Gear | First Rig Owner, Custom Container (new rig logged), Cutaway Survivor (if jumper logs a cutaway) |

| Post Type | Auto-generated or Manual | Visibility | Interactions |
| --- | --- | --- | --- |
| Jump Log Entry | Auto from logbook save | Public / DZ / Private | Like, comment, share link |
| Milestone Card | Auto when milestone detected | Public by default | Like, comment, share |
| Story Post | Manual — athlete writes narrative | Public / DZ / Private | Like, comment, share |
| DZ Announcement | DZ operator posts | All DZ members | Read + react |
| AFF Graduation | Auto when AFF level 8 passed | Public by default | Like, congratulate reaction |

| Feature | Implementation |
| --- | --- |
| Shared athlete identity | One user account, visible at all DZs. Currency, licenses, logbook portable across all locations. |
| Branch switching | DZ operator manages multiple branches under one account. Staff can be scoped to specific branches or all. |
| Shared aircraft pool | Aircraft can be shared between branches of same organization. Load creation specifies which branch. |
| Financial isolation | Each branch has separate Stripe Connect account. Revenue reports show per-branch and rollup. |
| Athlete history at DZ | When athlete arrives at a new DZ, their verified license and logbook are immediately accessible to manifest staff. |
| Multi-DZ admin | Single platform admin view aggregates all DZs. Used for SaaS billing, usage metrics, feature flag management. |

| Channel | Integration Type | Capabilities |
| --- | --- | --- |
| Instagram / Facebook | OAuth page connection + Meta Graph API | Auto-post milestone announcements, load day announcements, student first-jump posts (with consent) |
| WhatsApp Business | WhatsApp Cloud API | Broadcast weather holds, cancellations, DZ announcements to opted-in groups |
| SMS (Twilio) | Twilio Programmable SMS | Call times, weather holds, booking confirmations |
| Email (AWS SES) | Direct API + template engine | Newsletters, booking confirmations, EOD receipts, re-engagement campaigns |
| Push Notifications | FCM (Android) + APNs (iOS) | Real-time call times, slot assignments, DZ announcements |
| Internal DZ Bulletin | SkyLara feed post type = DZ_ANNOUNCEMENT | Visible on athlete dashboard and load board header |

| Data Source | API | Data Points | Refresh Rate |
| --- | --- | --- | --- |
| Aviation Weather Center | aviationweather.gov REST API (free, FAA-backed) | METAR, TAF, PIREP, SIGMET, AIRMET | 5 minutes |
| Open-Meteo | open-meteo.com (free, high-res) | Hourly wind speed/gusts/direction up to 5 days | 1 hour |
| SkyVector / ADS-B Exchange | ADS-B data feed | Traffic in DZ vicinity (advisory) | 10 minutes |
| Notam.io or ICAO API | NOTAM feed | Active NOTAMs for DZ ICAO code | 15 minutes |

| Feature | Detail |
| --- | --- |
| Product catalog | DZ operator creates products (gear, apparel, accessories, gift vouchers) with photos, descriptions, SKUs, pricing |
| Inventory tracking | shop_inventory table with real-time stock, low-stock alerts to operator |
| Athlete purchase flow | Browse shop → add to cart → checkout with wallet or card → order confirmation |
| Fulfillment workflow | DZ staff marks orders as fulfilled. Ship-to or pickup at DZ options configurable. |
| Gear consignment (V2) | Athletes list personal gear for sale. Platform takes marketplace commission. |
| Gift cards | DZ gift cards redeemable in shop and for jump tickets |

| Risk | Severity | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Connectivity loss at DZ causes manifest shutdown | CRITICAL | HIGH | Offline-first architecture (§4). Staff trained on offline indicators. No hard dependency on network for core manifest. | Arch |
| CG not verified, overloaded aircraft departs | CRITICAL | LOW (with gate) | CG blocking FSM gate (§5.1) prevents LOCKED→30MIN without PASS result. Override requires operator role + mandatory reason. | Safety |
| Financial event lost (Pub/Sub failure) | HIGH | LOW (with Streams) | Redis Streams + Transactional Outbox (§2). Dead-letter stream with alerts for any unprocessed events after 5 retries. | Payments |
| Exit order error causes canopy collision | CRITICAL | LOW (with algo) | Specified 9-group algorithm (§5.3). Override audit log. AI validation pass on load lock. | Safety |
| USPA data mismatch causes unsafe jumper to manifest | HIGH | MEDIUM | Tiered verification (§6). Compliance check at every check-in. Staff can always manually flag. Currency engine from logbook. | Compliance |
| Competitor entrenchment (Unifi, Manifest) | HIGH | HIGH | Story layer creates athlete lock-in (ops competitors don't have). Migration tool for DZ jump history import. Free trial with migration support. | GTM |
| Stripe downtime on busy jump day | HIGH | LOW | Graceful degradation: staff can issue manual ticket override logged to override_log. Reconcile after Stripe restores. | Payments |
| React Native app rejected from App Store | MEDIUM | LOW | Pre-review with Apple guidelines. No USPA license verification claim that could be flagged as medical. Privacy nutrition label prepared. | Mobile |
| GDPR/CCPA compliance gap | HIGH | MEDIUM | Data residency options (AWS region selection). Right-to-delete flow removes PII from all tables (soft delete + anonymize). DPA template for EU DZs. | Legal |
| AI service latency impacts manifest performance | MEDIUM | MEDIUM | All AI calls are async + non-blocking (§9.1). UI never waits for AI response. AI insights appear when ready, not before. | Arch |
| Waiver legality (digital signature validity) | HIGH | MEDIUM | Use DocuSign or HelloSign SDK for legally binding e-signatures. Store signed PDFs to S3. Legal review per jurisdiction. | Legal |
| Monolith becomes bottleneck at scale | MEDIUM | LOW (V1) | Extraction roadmap defined (§1.3). Module boundaries enforced from day 1. Performance budget monitored via DataDog. | Arch |

| Phase | Duration | Deliverables | Validates |
| --- | --- | --- | --- |
| 0 — Foundation | 6 weeks | Modular monolith scaffolding, MySQL schema, auth, RBAC, CI/CD pipeline, DataDog setup | Architecture decisions |
| 1 — Core DMS | 8 weeks | Load FSM + CG gate, slot assignment, check-in engine (weight-based), USPA tier 1–3 verification, call times, basic notifications | DZ operations workflow |
| 2 — Payments | 4 weeks | Jump ticket wallet, Stripe Connect, commission splits, EOD report, Redis Streams + outbox | Financial reliability |
| 3 — Offline | 6 weeks | React Native app, WatermelonDB sync, offline manifest board, QR check-in, push notifications | Mobile + offline |
| 4 — Story Layer | 4 weeks | Athlete profile, jump timeline, milestone engine, social feed, achievements | Product differentiation |
| 5 — AI + Weather | 4 weeks | Weather integration, risk alerts (rule-based first), load optimizer, exit order validator | Operational intelligence |
| 6 — Shop + Social Media | 4 weeks | DZ shop, inventory, orders, Instagram/WhatsApp integration, marketing campaigns | Revenue diversification |
| 7 — Multi-DZ + Admin | 3 weeks | Branch management, cross-DZ athlete identity, platform admin dashboard, multi-DZ reporting | Scale readiness |

| Category | Requirement |
| --- | --- |
| Uptime SLA | 99.9% for DMS core (< 8.7 hours downtime/year). Offline mode provides additional resilience. |
| Financial accuracy | Zero event loss for payment.captured and ticket.credited events. Verified via nightly reconciliation job. |
| Safety gates | CG check PASS required for 100% of loads transitioning to 30MIN. Measured and alerted on. |
| Load board latency | State change visible in client UI within 500ms for 95th percentile WebSocket delivery. |
| Offline recovery | All queued offline changes sync within 30 seconds of reconnection. |
| Data backup | MySQL automated snapshots every 6 hours, point-in-time recovery enabled. S3 versioning for media. |
| Security | OWASP Top 10 addressed. Penetration test before first paying DZ. SOC 2 Type I within 12 months. |

| CLOSING STATEMENT | SkyLara is not complex because it wants to be. It is complex because it operates in a safety-critical, multi-stakeholder, real-time environment where financial events and aircraft operations intersect. Every design decision above exists to reduce risk while enabling the product vision. Build in this order. Validate at each phase. Extract to microservices only when load data demands it. |
| --- | --- |