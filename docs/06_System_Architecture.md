# SKYLARA

_Source: 06_System_Architecture.docx_

SKYLARA
Global Operating System for Flying
SYSTEM ARCHITECTURE
Production-Grade Global Architecture Document
Step 1 of 8 — Foundation Architecture
Version 5.0  |  April 2026  |  CONFIDENTIAL
Authored by SkyLara Engineering Team
# Table of Contents
1. Executive Summary & Design Principles
2. Modular Monolith Architecture (V1)
3. Event System & Reliable Messaging
4. Real-Time Manifest System
5. Offline-First Architecture
6. Multi-Dropzone & Multi-Branch System
7. API Layer (REST + WebSocket + tRPC)
8. Global Scalability & Low-Connectivity Regions
9. Future Microservices Extraction (V2)
10. Security, Compliance & Data Residency
11. Infrastructure & Deployment
12. Appendices
# 1. Executive Summary & Design Principles
SkyLara is the global operating system for skydiving and flying communities. This document defines the production-grade system architecture that powers dropzone operations, athlete identity, financial transactions, safety enforcement, and community storytelling across every region of the world.
The architecture is designed around five non-negotiable principles that reflect the reality of dropzone operations:
## 1.1 Principle 1 — Safety Is a Hard Gate, Not a Soft Warning
Every safety-critical operation (CG verification, license currency, gear compliance, wind limits) is enforced as a blocking FSM gate. No override without explicit role-based authorization and mandatory audit logging. The system will refuse to transition a load from LOCKED to 30MIN unless the CG check has a PASS record. This is not configurable — it is physics.
## 1.2 Principle 2 — Offline-First, Not Offline-Tolerant
Dropzones operate in fields, deserts, and remote airports. SkyLara must function with zero connectivity for the duration of an operational day. This means local-first data storage with background sync, not a network-dependent app with an offline fallback. Manifest operations, gear checks, and compliance validation must work without a server round-trip. Only financial settlement requires online connectivity.
## 1.3 Principle 3 — Financial Events Are Never Lost
Every financial mutation (payment captured, ticket credited, refund issued, commission split) is written to a transactional outbox table in the same MySQL transaction as the business data. A dedicated consumer reads the outbox and publishes to Redis Streams with consumer groups. Dead-letter streams catch events that fail after 5 retries. No Redis Pub/Sub for money.
## 1.4 Principle 4 — Works Everywhere, Not Just Silicon Valley
SkyLara must run reliably on 3G connections in the Algarve, in the desert outside Dubai, in the pampas of Argentina, and at altitude in the Swiss Alps. This means aggressive asset caching, minimal payload sizes, progressive image loading, and a WhatsApp-first notification strategy for markets where push notifications are unreliable.
## 1.5 Principle 5 — Modular Now, Extractable Later
V1 ships as a modular monolith with strict service boundaries. Each module communicates through typed TypeScript interfaces, never through direct database queries across module boundaries. This allows V2 extraction to independent services when load, team size, or regulatory requirements demand it — without rewriting business logic.
# 2. Modular Monolith Architecture (V1)
SkyLara V1 deploys as a single Node.js process containing 13 bounded modules. Each module owns its database tables, exposes a typed service interface, and communicates with other modules exclusively through those interfaces. No module may execute SQL against another module’s tables.
## 2.1 Module Registry
## 2.2 Module Communication Rules
Strict boundaries are enforced at the code level through the following rules:
Rule 1 — Typed Interfaces Only: Modules expose a TypeScript service class (e.g., ManifestService, PaymentsService). All inter-module calls go through these interfaces. No module may import another module’s internal repository, model, or utility.
Rule 2 — No Cross-Module SQL: Each module owns its tables. The payments module cannot SELECT from the loads table. If it needs load data, it calls ManifestService.getLoad(loadId). This is enforced by code review and a CI linter that detects cross-module table references.
Rule 3 — Events for Side Effects: When a module action triggers a side effect in another module, it publishes an event to the event bus (Redis Streams for financial, Redis Pub/Sub for UI). The consuming module reacts asynchronously. Example: When ManifestService transitions a load to LANDED, it publishes load.landed. The payments module listens and triggers instructor payout calculations.
Rule 4 — Shared Kernel Only for Primitives: A shared kernel package contains only: TypeScript types/enums, validation utilities, date/currency formatters, and error classes. No business logic.
## 2.3 Dependency Graph
The module dependency graph is acyclic. If a circular dependency is detected during development, it must be resolved by extracting shared logic into the shared kernel or by introducing an event-based communication pattern.
identity (leaf) ← manifest ← payments
identity (leaf) ← booking → payments, manifest
identity (leaf) ← training → manifest
identity (leaf) ← safety → manifest, weather
identity (leaf) ← gear → safety
identity (leaf) ← story
weather (leaf, external APIs)
ai → manifest, weather, payments, identity
platform → identity
notifications → identity (events from all modules)
## 2.4 Tech Stack
# 3. Event System & Reliable Messaging
SkyLara uses a dual-channel event system that separates financial events (which must never be lost) from UI events (which are fire-and-forget). This is a direct response to the CTO critique of the v3 architecture that used Redis Pub/Sub for everything.
## 3.1 Channel Architecture
## 3.2 Transactional Outbox Pattern
Every financial event is written to the event_outbox table in the same MySQL transaction as the business data. This guarantees that if the business operation succeeds, the event is persisted — even if Redis is temporarily unreachable.
BEGIN TRANSACTION;
UPDATE wallets SET balance = balance - 32.00 WHERE athlete_id = 42;
INSERT INTO transactions (type, amount, ...) VALUES ('jump_ticket', -32.00, ...);
INSERT INTO event_outbox (event_type, payload, status) VALUES
('ticket.redeemed', '{"athleteId":42,"amount":32.00}', 'PENDING');
COMMIT;
A background worker (OutboxProcessor) polls the event_outbox table every 500ms, publishes pending events to Redis Streams, and marks them as PUBLISHED. If publishing fails, the event remains PENDING and is retried on the next poll cycle.
## 3.3 Dead Letter & Recovery
Dead-Letter Stream: Events that fail processing after 5 attempts are moved to a dead-letter stream (skylara:dlq:{event_type}). An alert is fired to the ops team via PagerDuty.
Manual Recovery: The platform admin dashboard includes a Dead Letter Queue viewer where operators can inspect, retry, or discard failed events. Every action is audit-logged.
Idempotency: All event consumers are idempotent. Each event carries a unique event_id (UUID v7). Consumers maintain a processed_events set in Redis with a 72-hour TTL. Duplicate events are silently discarded.
## 3.4 Event Schema
interface SkyLaraEvent {
eventId: string;        // UUID v7 (time-ordered)
eventType: string;      // e.g. 'payment.captured'
aggregateId: string;    // e.g. load_id, athlete_id
aggregateType: string;  // e.g. 'Load', 'Transaction'
tenantId: string;       // dropzone_id (multi-tenant)
payload: Record<string, unknown>;
metadata: {
userId: string;       // who triggered this
timestamp: string;    // ISO 8601
version: number;      // schema version for evolution
correlationId: string; // trace across modules
};
}
# 4. Real-Time Manifest System
The manifest is the heart of dropzone operations. It must reflect reality within seconds, handle concurrent edits from multiple staff, and enforce safety gates that cannot be bypassed without explicit authorization.
## 4.1 Load Finite State Machine (FSM)
Every load follows a strict state machine. Transitions are guarded by preconditions that the system enforces programmatically.
## 4.2 CG Blocking Gate
The CG verification process:
1. Auto-Calculate: When a load is locked, the system automatically calculates gross weight (empty weight + fuel + total passenger weight + gear allowance) and checks it against the aircraft’s max takeoff weight.
2. CG Envelope: For aircraft with published CG envelopes (Twin Otter, Caravan), the system verifies the center of gravity falls within the forward and aft limits based on seating assignment.
3. Pilot Confirmation: The pilot receives a push notification with the W&B summary and must confirm or reject via the pilot app.
4. Record: A cg_checks record is created with status PASS, FAIL, or OVERRIDE. The load FSM reads this record before allowing the LOCKED → 30MIN transition.
## 4.3 Real-Time Sync
The manifest board must update in real-time across all connected clients (manifest screen, instructor app, pilot tablet, athlete phone). SkyLara uses a WebSocket-based sync protocol:
Server: Fastify-websocket plugin with Redis Pub/Sub as the broadcast bus. When any manifest mutation occurs, the ManifestService publishes a manifest.{loadId}.updated event.
Web Client: The Next.js dashboard subscribes to WebSocket channels for active loads. On receiving an event, it merges the delta into local React state using an optimistic update pattern.
Mobile Client: React Native uses WatermelonDB’s sync protocol. Changes made offline are queued and synced when connectivity returns. The server uses last-write-wins with vector clocks for conflict resolution (see Section 5).
## 4.4 Exit Order Algorithm
The exit order engine uses a 9-group priority system based on canopy deployment altitude, horizontal movement, and group type. The algorithm is configurable per dropzone via dz_settings.exit_order_config (JSON) to accommodate local S&TA preferences.
# 5. Offline-First Architecture
SkyLara’s offline-first architecture is not an afterthought — it is the primary operating mode. The system is designed to function for an entire operational day (6AM – sunset) with zero connectivity. Sync happens when available, but operations never block on it.
## 5.1 Platform-Specific Strategy
## 5.2 What Works Offline
## 5.3 Conflict Resolution Strategy
When multiple devices make conflicting changes offline and then sync, the system uses the following resolution hierarchy:
Safety-Critical (server wins): Gear checks, compliance decisions, CG approvals, emergency data. The server (or the most recent online device) always wins. Reason: a gear check approved offline should not override a server-side block.
Manifest Operations (last-write-wins + vector clock): Slot assignments, jumper adds/removes, load details. Each mutation carries a vector clock. The server compares timestamps and applies the most recent change. Conflicts are logged for staff review.
User Data (last-write-wins): Profile updates, logbook entries, story posts. Standard CRDT-style merge with timestamp ordering.
Financial (online-only): No conflict possible — all financial mutations require online connectivity by design.
## 5.4 Sync Protocol
// WatermelonDB sync endpoint
POST /api/sync
Body: { lastPulledAt: timestamp, changes: { ... } }
Response: { changes: { ... }, timestamp: newTimestamp }
// Sync flow:
1. App opens → pull latest changes since lastPulledAt
2. User works offline → mutations queued in local WatermelonDB
3. Connectivity returns → push local changes, pull server changes
4. Conflict detected → apply resolution strategy per data type
5. UI updated → optimistic updates reconciled with server state
## 5.5 Data Pre-Caching
On app launch (or when connectivity is available), the mobile app pre-caches the following data for offline use:
DZ Config: Aircraft specs, weight limits, exit order rules, compliance thresholds, pricing
Today’s Manifest: All loads, slots, jumper assignments, waitlist
Staff Roster: Instructors, pilots, riggers with skills and availability
Athlete Profiles: All checked-in athletes with license, currency, gear, emergency profile
Emergency Data: Hospital database, emergency contacts, medical profiles (encrypted at rest with AES-256)
Last Weather: Most recent METAR/TAF, winds aloft, jumpability index (with stale indicator)
# 6. Multi-Dropzone & Multi-Branch System
SkyLara supports two multi-tenancy models: independent dropzones (separate businesses using SkyLara SaaS) and multi-branch operations (one organization with multiple locations). Both share the same infrastructure but differ in data isolation and identity management.
## 6.1 Tenant Isolation Model
## 6.2 Database Multi-Tenancy
SkyLara uses row-level multi-tenancy with a shared database. Every table that contains tenant-specific data includes a dropzone_id column with a NOT NULL constraint and a composite index. The application layer enforces tenant isolation through a middleware that injects the tenant context into every database query.
// Tenant middleware (Fastify plugin)
fastify.addHook('preHandler', async (req) => {
const tenantId = req.headers['x-tenant-id'] || extractFromJWT(req);
req.tenant = await TenantService.resolve(tenantId);
// All subsequent DB queries automatically scoped to this tenant
req.db = scopedDB(tenantId);
});
## 6.3 Cross-DZ Athlete Identity
For the multi-branch model, a single athlete profile spans all branches. The athlete’s jump history, license verification, gear records, and emergency profile are accessible at any branch. This is the “global identity” feature described in the Story & Identity system.
Portable Profile: When an athlete visits a new branch, their profile (including USPA verification, gear data, emergency info) is instantly available without re-entry.
Cross-DZ Logbook: Jumps logged at Branch A appear in the athlete’s logbook when they check in at Branch B.
Unified Wallet: Jump tickets purchased at one branch can be redeemed at another (configurable per organization).
Global Stats: The athlete’s story timeline shows jumps across all branches with DZ attribution.
## 6.4 Branch Configuration
Each branch can override organization-level defaults for:
Pricing (tandem rates, ticket books, coaching rates)
Compliance rules (wind limits, currency thresholds, weight limits)
Aircraft fleet and operating hours
Staff roster and instructor assignments
Notification templates and language preferences
Landing area hazards and hospital database
Timezone and currency
# 7. API Layer (REST + WebSocket + tRPC)
SkyLara exposes three API surfaces, each optimized for its use case. The API layer is the single entry point for all clients — web, mobile, kiosk, and third-party integrations.
## 7.1 API Surface Overview
## 7.2 REST API Design
The REST API follows these conventions:
Versioning: /api/v1/* — URL-based versioning for stability across third-party integrations.
Authentication: JWT Bearer tokens (15-minute expiry) for user sessions. API keys (SHA-256 hashed, stored in api_keys table) for machine-to-machine.
Rate Limiting: 100 req/min per user, 1000 req/min per API key. Configurable per endpoint via dz_settings.
Pagination: Cursor-based pagination using opaque cursors (base64-encoded composite key). No offset pagination.
Error Format: RFC 7807 Problem Details. Every error returns type, title, status, detail, and instance.
## 7.3 Key REST Endpoints
## 7.4 WebSocket Channels
WebSocket connections subscribe to channels scoped by tenant and resource:
ws://api.skylara.com/ws?token=JWT
Subscribe: { channel: 'manifest:{dzId}' }       // All manifest changes
Subscribe: { channel: 'load:{loadId}' }         // Single load updates
Subscribe: { channel: 'weather:{dzId}' }        // Weather changes
Subscribe: { channel: 'notifications:{userId}' } // User notifications
Subscribe: { channel: 'emergency:{dzId}' }      // Emergency broadcasts
# 8. Global Scalability & Low-Connectivity Regions
SkyLara must operate reliably across three distinct connectivity profiles: high-bandwidth (US/Europe urban DZs), moderate (Australia/Southern Europe rural DZs), and low-bandwidth (MENA desert DZs, LATAM rural airfields). The architecture addresses each profile explicitly.
## 8.1 Connectivity Profiles
## 8.2 Optimization Strategies
CDN Edge Caching: CloudFront distributions in US-East, EU-West, ME-South, AP-Southeast. Static assets (JS/CSS/images) served from nearest edge with aggressive cache headers (1 year for hashed assets).
API Response Compression: Brotli compression on all API responses (30–40% smaller than gzip for JSON). Fastify-compress plugin with quality level 4 for speed/size balance.
Payload Minimization: API responses use field selection (GraphQL-style ?fields=id,name,status). Mobile clients request only the fields they render. Full payloads available on demand.
Progressive Image Loading: Media (jump photos/videos) use blurhash placeholders with progressive JPEG loading. Full-resolution available on tap. Videos use HLS adaptive bitrate streaming.
WhatsApp-First Notifications: In MENA and LATAM regions, WhatsApp Business API is the primary notification channel (higher delivery rate than push on Android in these markets). SMS as secondary. Push as tertiary.
Background Sync: Mobile apps use React Native’s background fetch API to sync data when the device has connectivity, even when the app is not in the foreground. This ensures manifest data is fresh when the app is opened.
## 8.3 Regional Deployment
V1 deploys in a single AWS region (us-east-1) with CloudFront global CDN. V2 adds regional read replicas for latency-sensitive queries:
# 9. Future Microservices Extraction (V2)
The modular monolith is designed for extraction. Each module can be extracted into an independent service when load, team size, or regulatory requirements demand it. This section defines the extraction triggers, sequence, and strategy.
## 9.1 Extraction Triggers
A module should be extracted when ANY of these conditions are met:
## 9.2 Extraction Sequence
Modules are extracted in order of independence and business criticality:
Phase 1 — Payments: First extraction candidate. Already communicates via events. Extraction reduces PCI audit scope to the payments service only. New service gets its own database (payments_db) with Stripe webhook handlers.
Phase 2 — Notifications: Low coupling, high volume. Extraction allows independent scaling for SMS/WhatsApp/push. Consumes events from all other modules via Redis Streams.
Phase 3 — Weather + AI: Read-heavy, external API dependent. Can be extracted as a single service or split. Weather is a data pipeline; AI is a computation service. Both benefit from independent scaling.
Phase 4 — Manifest: Last extraction. Most coupled, most critical. Requires careful interface design. Only extracted when team size or load demands it. Service keeps its own database with eventual consistency to other services.
## 9.3 Inter-Service Communication (V2)
# 10. Security, Compliance & Data Residency
## 10.1 Authentication & Authorization
JWT Access Tokens: 15-minute expiry, signed with RS256, contains userId, tenantId, roles[]. Validated on every request.
Refresh Tokens: 7-day expiry, stored in httpOnly secure cookie, rotated on use. Bound to device fingerprint.
MFA: TOTP-based (Google Authenticator, Authy). Required for DZ_OPERATOR and ADMIN roles. Optional for others.
RBAC: 10 roles with granular permissions. Each API endpoint declares required permissions. Middleware enforces.
API Keys: For third-party integrations. SHA-256 hashed in database. Scoped to specific endpoints and rate limits.
## 10.2 Data Protection
Encryption at Rest: AES-256 for all databases (RDS encryption), S3 server-side encryption. Emergency medical data additionally encrypted at the application level with per-tenant keys stored in AWS KMS.
Encryption in Transit: TLS 1.3 for all connections. HSTS headers. Certificate pinning on mobile apps.
PII Handling: Emergency profiles (blood type, allergies, medications) are classified as sensitive PII. Access logged in audit trail. Right-to-delete supported per GDPR Article 17.
GDPR Compliance: Data Processing Agreements (DPA) template for EU dropzones. Cookie consent, data export, right-to-delete, data portability. 30-day retention for deleted data before hard purge.
Payment Security: No card data touches SkyLara servers. Stripe.js + Payment Elements handle all PCI-sensitive data. SkyLara is PCI DSS SAQ-A eligible.
## 10.3 Data Residency
For EU dropzones subject to GDPR data residency requirements, SkyLara V2 supports regional database deployment. EU tenant data is stored in eu-west-1 (Ireland). Non-EU tenants in us-east-1. Cross-region data transfer only for global identity features (with explicit athlete consent).
# 11. Infrastructure & Deployment
## 11.1 Production Infrastructure
## 11.2 CI/CD Pipeline
Source: GitHub (monorepo: apps/api, apps/web, apps/mobile, packages/shared)
Build: GitHub Actions → TypeScript compile → ESLint → unit tests → integration tests
Deploy (staging): Auto-deploy on PR merge to main → ECS Fargate staging
Deploy (production): Manual promotion from staging → blue-green deployment via ECS
Database Migrations: Kysely migrations, run before deployment, reversible
Rollback: ECS task definition rollback (instant), database rollback migration if needed
## 11.3 Monitoring & Observability
APM: DataDog APM with distributed tracing across all modules. Every request gets a trace ID.
Metrics: Custom metrics: loads/hour, slot fill rate, CG check pass rate, payment success rate, sync latency.
Logs: Structured JSON logs (pino) shipped to DataDog. Log levels: ERROR, WARN, INFO, DEBUG.
Alerts: PagerDuty integration. Critical: load FSM stuck, payment failure >5%, CG check bypass. Warning: sync latency >5s, Redis memory >80%, API error rate >1%.
Health Checks: ECS health check endpoint (/health) verifying MySQL, Redis, S3 connectivity. Unhealthy tasks auto-replaced.
# 12. Appendices
## A. Database Schema Summary
The full schema is defined in SkyLara_Schema.sql (1,548 lines, 51 tables, 114 FK constraints, 315 indexes). Key tables by module:
## B. Build Sequence (8 Phases)
## C. Key Risks & Mitigations
END OF DOCUMENT
SkyLara System Architecture v5.0 — April 2026

| DESIGN PRINCIPLES These five principles govern every architectural decision in SkyLara. They are ranked by priority — when principles conflict, higher-ranked principles win. |
| --- |

| Module | Responsibility | Owns Tables | Key Dependencies |
| --- | --- | --- | --- |
| manifest | Load FSM, slot assignment, exit order, CG gate, call times | loads, slots, exit_groups, waitlist_entries, cg_checks | identity, weather, ai |
| identity | User accounts, roles, RBAC, athlete profiles, USPA verification | users, roles, user_roles, user_profiles, sessions, mfa_tokens, athletes, licenses, uspa_verifications | None (leaf module) |
| payments | Wallet, tickets, Stripe Connect, commission splits, EOD settlement | wallets, jump_tickets, transactions, commission_splits, payments, gift_cards | identity, manifest |
| booking | Online reservations, tandem scheduling, group bookings, waivers | bookings, waivers | identity, payments, manifest |
| training | AFF course tracking, coaching sessions, instructor assignment, skill progression | aff_records, coaching_sessions, skill_assessments | identity, manifest |
| safety | Emergency profiles, incident reporting, wind risk, hospital DB, compliance enforcement | emergency_profiles, incidents, compliance_checks, hospital_db | identity, manifest, weather |
| gear | Equipment inventory, rental tracking, repack scheduling, gear checks | gear_items, gear_checks, gear_rentals | identity, safety |
| notifications | Push, SMS, WhatsApp, email delivery with templates and localization | notifications, notification_templates | identity, manifest (events) |
| story | Athlete timeline, milestones, achievements, social feed, global identity | social_posts, social_comments, social_reactions, achievements, athlete_achievements | identity |
| shop | DZ product catalog, inventory, orders, fulfillment | shop_products, shop_inventory, shop_orders, shop_order_items | identity, payments |
| weather | METAR/TAF integration, wind aloft, jumpability index, auto-hold recommendations | weather_data, weather_holds | None (external APIs) |
| ai | Load optimizer, risk engine, predictive scheduling, revenue insights, anomaly detection | ai_insights | manifest, weather, payments, identity |
| platform | Multi-DZ tenant management, branch config, cross-DZ identity, platform admin | dropzones, dz_branches, dz_settings, tenant_config | identity |

| Layer | Technology | Version | Rationale |
| --- | --- | --- | --- |
| Runtime | Node.js | 20 LTS | Non-blocking I/O, npm ecosystem, team expertise |
| Language | TypeScript | 5.x | Type safety for module interfaces, refactoring confidence |
| HTTP Framework | Fastify | 4.x | 2x faster than Express, schema validation, plugin system |
| Internal RPC | tRPC | 11.x | Type-safe inter-module calls, zero codegen, end-to-end types |
| Database | MySQL | 8.0 (InnoDB) | ACID transactions, JSON support, RDS managed, team expertise |
| ORM / Query | Kysely | 0.27.x | Type-safe SQL builder, no magic, raw SQL escape hatch |
| Cache / Queue | Redis | 7.x (ElastiCache) | Streams for financial events, Pub/Sub for UI, caching |
| Frontend (Web) | Next.js | 14 (App Router) | SSR, ISR, React Server Components for DZ public pages |
| Frontend (Mobile) | React Native | 0.73 (Expo) | iOS + Android from one codebase, Expo managed workflow |
| Offline (Mobile) | WatermelonDB | 0.27.x | SQLite-backed, lazy loading, sync protocol built-in |
| Offline (Web) | IndexedDB + SW | Native | Service Worker for cache-first assets, IndexedDB for data |
| Object Storage | AWS S3 + CloudFront | N/A | Media uploads, CDN for global delivery |
| Auth | JWT + Refresh Tokens | N/A | Short-lived access (15min), long-lived refresh (7d), MFA |
| Payments | Stripe Connect | Latest | Multi-party payouts, PCI compliance, global coverage |
| AI | Claude API | Sonnet + Haiku | Sonnet for quality (scheduling, insights), Haiku for speed (load opt) |
| Infra | AWS ECS Fargate | N/A | Serverless containers, auto-scaling, no server management |

| Channel | Technology | Guarantee | Use Cases | Failure Strategy |
| --- | --- | --- | --- | --- |
| Financial | Redis Streams + Consumer Groups | At-least-once, ordered | payment.captured, ticket.credited, refund.issued, commission.split, payout.initiated | Dead-letter stream after 5 retries, manual review queue |
| Operational | Redis Streams (lightweight) | At-least-once | load.transitioned, slot.assigned, gear.checked, compliance.verified | Retry 3x, log and alert on failure |
| UI / Real-time | Redis Pub/Sub + WebSocket | Best-effort, fire-and-forget | manifest.updated, weather.changed, notification.new, chat.message | No retry — client reconnects and fetches latest state |

| State | Entry Condition | Duration | Actions Available | Exit Condition |
| --- | --- | --- | --- | --- |
| OPEN | Created by manifest staff or AI | Until locked | Add/remove jumpers, assign instructors, edit details | Manual lock or auto-lock at capacity |
| FILLING | Slots being actively filled | Until locked | Add/remove jumpers, waitlist management | Lock when ready |
| LOCKED | Manifest staff locks load | Until 30MIN call | No slot changes without override, CG verification required | CG check PASS + time trigger |
| 30MIN | CG verified, 30-min call issued | 10 minutes | Emergency add/remove with override, notifications sent | Time trigger |
| 20MIN | Time-based transition | 10 minutes | No-show detection starts, waitlist auto-fill | Time trigger |
| 10MIN | Time-based transition | 5 minutes | Final boarding notifications, staff confirmation | Time trigger |
| BOARDING | Final call, jumpers at aircraft | Until airborne | Last-minute weight verification, pilot briefing | Pilot confirms airborne |
| AIRBORNE | Aircraft has departed | Until landed | Track flight, prepare next load | Pilot confirms landed |
| LANDED | Aircraft on ground | Until complete | Log jumps, trigger payouts, debrief | All jumps logged, payroll calculated |
| COMPLETE | All post-flight tasks done | Terminal | Archive, reporting | N/A |
| CANCELLED | Load cancelled (weather, MX, etc.) | Terminal | Refund/credit, reassign jumpers | N/A |

| SAFETY-CRITICAL The transition from LOCKED to 30MIN is HARD BLOCKED unless cg_checks has a PASS record for the load_id. This is not a warning — the system throws SafetyGateException and refuses the transition. Override requires DZ_OPERATOR or STA role + mandatory reason, which is written to the override_log table. |
| --- |

| Priority | Group Type | Separation | Rationale |
| --- | --- | --- | --- |
| 1 | Wingsuit | 60 seconds | Highest horizontal speed, needs maximum separation from all groups |
| 2 | Tracking / Angle | 30 seconds | Large horizontal movement during freefall |
| 3 | AFF Student | 15 seconds | Instructor safety management, predictable deployment altitude |
| 4 | Tandem | 10 seconds | Large canopies, low deploy altitude, needs separation from above |
| 5 | Freefly (head-down) | 10 seconds | Small fast canopies, high fall rate |
| 6 | RW / Belly | 10 seconds | Standard formation groups |
| 7 | Coach Jump | 8 seconds | Treated as formation, instructor + student pair |
| 8 | Hop & Pop | 5 seconds | Lowest exit altitude, immediate deployment |
| 9 | CRW (Canopy Formation) | N/A | Last out, requires separate landing area |

| Platform | Local Storage | Sync Protocol | Cache Strategy | Limitations |
| --- | --- | --- | --- | --- |
| React Native (iOS/Android) | WatermelonDB (SQLite) | WatermelonDB sync protocol with pull/push endpoints | Full DZ dataset pre-cached on app open | ~50MB local DB limit on older devices |
| Web (PWA) | IndexedDB + Service Worker | Network-first with fallback for API data, Cache-first for assets | Service Worker caches all static assets, IndexedDB stores manifest data | iOS Safari limits: 50MB IDB, no background sync |
| Manifest Kiosk (DZ) | Electron + SQLite | Direct MySQL sync when online, SQLite when offline | Full local copy of DZ operational data | Kiosk must be pre-provisioned with DZ data |

| Operation | Offline Support | Sync Strategy | Conflict Resolution |
| --- | --- | --- | --- |
| View manifest / load board | Full | Local-first read | N/A (read-only) |
| Add/remove jumper from load | Full | Queue mutation, sync on reconnect | Last-write-wins with vector clock |
| Gear check approval | Full | Queue approval, sync on reconnect | Server wins (safety-critical) |
| CG calculation | Full | Local calculation using cached aircraft data | Recalculate on sync |
| Compliance check (license, currency) | Full | Local validation against cached athlete data | Server wins |
| Emergency profile access | Full | Pre-cached on app open, encrypted at rest | Server wins |
| Logbook entry | Full | Queue entry, sync on reconnect | Last-write-wins |
| Payment processing | BLOCKED | Requires online connectivity | N/A — no offline payments |
| Stripe transactions | BLOCKED | Requires online connectivity | N/A |
| AI insights / recommendations | Partial | Cached last insights, no new generation | Server wins |
| Weather data | Partial | Cached last fetch, stale indicator shown | Server wins |
| Notification sending | Queued | Queued in outbox, sent on reconnect | First-write-wins |

| Aspect | Independent DZ (SaaS) | Multi-Branch (Enterprise) |
| --- | --- | --- |
| Data Isolation | Full row-level isolation via tenant_id on every table | Shared organization, branch-level isolation via branch_id |
| Athlete Identity | Separate per DZ — athlete must create account at each DZ | Shared across branches — single identity, jump at any branch |
| Financial | Separate Stripe Connect account per DZ | Shared Stripe Connect account, per-branch sub-accounts |
| Staff | Separate staff roster per DZ | Staff can be shared across branches, per-branch assignments |
| Settings | Independent DZ settings (compliance rules, pricing, exit order) | Organization defaults + per-branch overrides |
| Reporting | DZ-only reports | Organization-wide + per-branch drill-down |
| Admin | DZ operator is top admin | Organization admin > branch operators |

| Surface | Protocol | Auth | Clients | Use Case |
| --- | --- | --- | --- | --- |
| REST API | HTTPS (Fastify) | JWT Bearer + API Key | Third-party integrations, webhooks, public endpoints | CRUD operations, booking API, webhook receivers |
| tRPC API | HTTPS (Fastify + tRPC) | JWT Bearer (same-origin) | Next.js web app, internal services | Type-safe queries/mutations with end-to-end TypeScript types |
| WebSocket | WSS (Fastify-websocket) | JWT on connection | Live manifest board, pilot app, athlete app | Real-time updates: manifest changes, weather, notifications |

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | /api/v1/loads | List active loads for the DZ | JWT (staff+) |
| POST | /api/v1/loads | Create a new load | JWT (manifest+) |
| PATCH | /api/v1/loads/:id/transition | Transition load state (FSM) | JWT (manifest+) |
| POST | /api/v1/loads/:id/slots | Add jumper to load | JWT (manifest+) |
| DELETE | /api/v1/loads/:id/slots/:slotId | Remove jumper from load | JWT (manifest+) |
| GET | /api/v1/athletes/:id | Get athlete profile + compliance status | JWT (staff+ or self) |
| POST | /api/v1/athletes/:id/checkin | Check in athlete for today | JWT (manifest+) |
| POST | /api/v1/payments/charge | Process payment (Stripe) | JWT (staff+) |
| GET | /api/v1/weather/current | Current weather + jumpability index | JWT (any) |
| POST | /api/v1/bookings | Create online booking | API key or JWT |
| GET | /api/v1/sync | Sync endpoint for offline clients | JWT (any) |
| POST | /api/v1/emergency/activate | Activate emergency mode | JWT (any staff) |

| Profile | Regions | Typical Bandwidth | Latency | Strategy |
| --- | --- | --- | --- | --- |
| High | US urban, Western Europe, UAE cities | 50+ Mbps | <50ms to nearest edge | Standard SPA, WebSocket, full media |
| Moderate | Australia rural, Southern Europe, Turkey | 5–20 Mbps | 50–150ms | Compressed payloads, lazy image loading, reduced WebSocket frequency |
| Low | MENA desert, LATAM rural, African DZs | 1–5 Mbps or 3G | 150–500ms | Offline-first, WhatsApp notifications, minimal payloads, SMS fallback |

| Phase | Primary Region | Read Replicas | CDN | Rationale |
| --- | --- | --- | --- | --- |
| V1 (Launch) | us-east-1 | None | CloudFront global | Simplicity, single write path, no replication lag concerns |
| V2 (Scale) | us-east-1 | eu-west-1, me-south-1 | CloudFront + API Gateway edge | Sub-100ms reads for EU/MENA, writes route to primary |
| V3 (Global) | us-east-1 | eu-west-1, me-south-1, ap-southeast-2 | Multi-region with latency routing | Full global coverage including Australia/LATAM |

| Trigger | Threshold | Affected Modules | Rationale |
| --- | --- | --- | --- |
| Team Size | >3 engineers working on module | payments, manifest | Independent deployment and release cycles needed |
| Load | >10K requests/sec to module | manifest, weather | Independent scaling needed (manifest scales horizontally, weather is read-heavy) |
| Regulatory | PCI DSS Level 1, data residency laws | payments, identity | Isolation for compliance audit scope reduction |
| Availability | Module needs different SLA | manifest (99.99%), ai (99.9%) | Manifest must never go down; AI can tolerate brief outages |
| Technology | Module needs different runtime | ai (Python ML models) | AI may need Python/GPU runtime for local model inference |

| Pattern | Technology | Use Case |
| --- | --- | --- |
| Synchronous (request/response) | gRPC with Protocol Buffers | Service-to-service queries (e.g., manifest asks identity for athlete profile) |
| Asynchronous (events) | Redis Streams (same as V1) | Side effects, eventual consistency (e.g., load.landed triggers payout) |
| API Gateway | AWS API Gateway + Kong | External API routing, rate limiting, auth validation |
| Service Discovery | AWS ECS Service Connect (Cloud Map) | Automatic service registration and DNS-based discovery |

| Component | Service | Configuration | Cost Estimate (Monthly) |
| --- | --- | --- | --- |
| Application | AWS ECS Fargate | 2 vCPU, 4GB RAM, 2–6 tasks (auto-scale) | $150–$400 |
| Database | AWS RDS MySQL 8.0 | db.r6g.large (2 vCPU, 16GB), Multi-AZ | $400–$600 |
| Cache / Queue | AWS ElastiCache Redis 7 | cache.r6g.large, 2 nodes (primary + replica) | $200–$350 |
| CDN | CloudFront | Global distribution, 1TB transfer/month | $100–$200 |
| Storage | S3 Standard | 500GB media storage | $12 |
| Monitoring | DataDog | APM + logs + metrics, 5 hosts | $200–$400 |
| CI/CD | GitHub Actions | Pro plan, ~2000 min/month | $40 |
| DNS / SSL | Route 53 + ACM | Hosted zones + free SSL certificates | $5 |
| Email | AWS SES | 50K emails/month | $5 |
| SMS / WhatsApp | Twilio + WhatsApp Business | Variable based on volume | $100–$500 |
|  |  | TOTAL (estimated) | $1,200–$2,500 |

| Module | Tables | Key Indexes |
| --- | --- | --- |
| manifest | loads, slots, exit_groups, waitlist_entries, cg_checks | loads(dropzone_id, status), slots(load_id, athlete_id) |
| identity | users, roles, user_roles, user_profiles, athletes, licenses | users(email), athletes(dropzone_id, user_id) |
| payments | wallets, jump_tickets, transactions, payments, gift_cards | transactions(dropzone_id, created_at), wallets(athlete_id) |
| safety | emergency_profiles, incidents, compliance_checks | emergency_profiles(athlete_id), incidents(dropzone_id, date) |
| events | event_outbox, override_log | event_outbox(status, created_at) |

| Phase | Duration | Deliverables |
| --- | --- | --- |
| 0 — Foundation | 6 weeks | Monolith scaffold, MySQL schema, auth + RBAC, CI/CD, DataDog, staging env |
| 1 — Core DMS | 8 weeks | Load FSM + CG gate, slot assignment, check-in, USPA verification, call times |
| 2 — Payments | 4 weeks | Wallet, Stripe Connect, splits, EOD settlement, Redis Streams + outbox |
| 3 — Offline + Mobile | 6 weeks | React Native app, WatermelonDB, offline manifest, QR check-in, push |
| 4 — Story Layer | 4 weeks | Profile, timeline, milestones, social feed, achievements |
| 5 — AI + Weather | 4 weeks | Weather integration, risk alerts, load optimizer, exit validator |
| 6 — Shop + Social | 4 weeks | DZ shop, Instagram/WhatsApp integration, marketing campaigns |
| 7 — Multi-DZ | 3 weeks | Branch management, cross-DZ identity, platform admin, reporting |

| Risk | Impact | Likelihood (w/ mitigation) | Mitigation |
| --- | --- | --- | --- |
| Connectivity loss during ops | CRITICAL | LOW (offline-first) | WatermelonDB + local FSM, no server dependency for ops |
| CG not verified before departure | CRITICAL | VERY LOW (FSM gate) | Hard-blocked FSM transition, no bypass without audit |
| Financial event loss | HIGH | VERY LOW (outbox + streams) | Transactional outbox, dead-letter queue, idempotent consumers |
| USPA data mismatch | HIGH | MEDIUM | 5-tier verification, photo upload, future API readiness |
| Regional latency | MEDIUM | LOW (CDN + edge) | CloudFront global, read replicas in V2, WhatsApp-first |
| Stripe downtime | HIGH | LOW | Manual override + offline reconciliation + retry queue |