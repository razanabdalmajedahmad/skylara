# SkyLara
Final MVP, Architecture, Database, and PWA Implementation Specification
Unified build blueprint for web, mobile, local operations, offline sync, QR identity, and real dropzone workflows

_Source: SkyLara_Final_Implementation_Spec.docx_

SkyLara
Final MVP, Architecture, Database, and PWA Implementation Specification
Unified build blueprint for web, mobile, local operations, offline sync, QR identity, and real dropzone workflows
Prepared from the existing SkyLara architecture, schema, operational, infrastructure, compliance, and product-definition workstreams.
# 1. Executive Summary
This document consolidates the SkyLara project into one implementation-ready blueprint covering system architecture, normalized MySQL design, operational logic, safety, offline-first resilience, localization, dashboards, monetization, QR identity, and the practical MVP roadmap.
• Primary build mode: Next.js web platform with a mobile-first responsive PWA for athletes and staff, backed by a Node.js and TypeScript modular monolith.
• Primary database: MySQL 8.0 with InnoDB, row-level tenant isolation by dropzone and branch, append-only financial records, and strong foreign key discipline.
• Primary operational rule: safety-critical actions are blocking gates, not soft warnings. CG, waiver, currency, gear, and permission rules can stop the flow.
• Primary offline rule: manifest, check-in, emergency access, and local operations continue even when the internet or cloud is down.
• Primary product sequencing: win with dropzone operations first, then layer identity, intelligence, story, and marketplace expansion.
# 2. Global System Architecture
SkyLara should ship as a production-grade modular monolith in V1. This minimizes distributed-systems overhead while preserving extraction boundaries for V2. Modules communicate through typed service contracts and an internal event bus. No cross-module direct SQL is allowed.
• Event system: Redis Streams plus transactional outbox for financial and safety-critical events. Redis Pub/Sub is used only for best-effort UI fan-out.
• Real-time: REST for CRUD, WebSocket for manifest and live operational updates, and internal typed RPC for service boundaries inside the monolith.
• Multi-tenant scope: organization to dropzone to branch. Users may hold multiple roles across multiple DZs.
• Low-connectivity pattern: compressed payloads, offline-first storage, WhatsApp-first notifications in markets where push is unreliable, aggressive asset caching, and local authority mode for branches.
# 3. Database Design - MySQL 8.0 Global Ready
The schema should remain normalized around clear domains: identity, tenant configuration, aircraft and manifest, safety, training, finance, localization, marketplace, social, and analytics. Financial tables are append-only. Operational tables favor strong indexing on dropzone_id, branch_id, status, and created_at.
• Required composite indexes: loads(dropzone_id, branch_id, status, scheduled_call_time), slots(load_id, status), slots(dropzone_id, athlete_id, created_at), transactions(dropzone_id, created_at, type), notifications(dropzone_id, recipient_id, status), audit_logs(dropzone_id, entity_type, entity_id, created_at).
• Constraints: enforce enumerations for status and activity types, unique UUIDs for external APIs, and foreign keys for every operational relation except high-volume analytics rollups.
• Localization model: platform-level languages and translations, tenant overrides for legal text, templates, pricing labels, and onboarding content.
• Offline model: server schema mirrors a smaller local schema for Tier 1 operations.
# 4. Operational System - Real DZ Logic
The operational engine centers on loads, slots, check-in, instructor assignment, approval flows, and load lifecycle control.
# 5. Safety and Emergency System
• Emergency profile: blood type, allergies, medications, conditions, emergency contacts, insurance, language preference, and critical gear information.
• Emergency mode: one-tap card that surfaces the jumper profile, last known load, landing area, emergency contacts, local hospital map, and emergency numbers.
• Off-landing handling: GPS breadcrumb, last known coordinates, notify DZ staff, mark recovery status, and create an incident case if unresolved.
• Local safety data: each DZ stores nearest hospitals, ambulance, police, ATC, alternate landing zones, and local risk notes.
• Risk system: live wind checks, landing hazard maps, river and obstacle tags, small-DZ warnings, wingsuit separation rules, and canopy-risk indicators.
• Compliance: encrypted storage for medical data, explicit consent and access logging, GDPR retention rules, and role-based visibility with break-glass access.
# 6. Local Jumper System
• Real-time loads on mobile with join, waitlist, and check-in status.
• Digital logbook, skill tracking, AFF progression, coach sign-off, and cross-DZ jump history.
• P2P slot resale with approval workflow, price floor and ceiling, fraud checks, and wallet settlement.
• Community layer showing who is on-site, active groups, jump buddies, saved teams, and boogie attendance.
• Profile and story timeline with media, milestones, achievements, and portable identity across dropzones.
# 7. Localization and Global Adoption
• Frontend localization: ICU message catalogs, server-driven locale negotiation, runtime language switch, and layout mirroring for RTL.
• Backend localization: translation keys for templates, waivers, onboarding modules, and notification content.
• Commercial localization: multi-currency pricing display, branch-local tax rules, and timezone-aware schedules stored in UTC and rendered in local time.
• Adoption rule: legal content, safety modules, and required onboarding vary by jurisdiction and dropzone configuration.
# 8. AI System
AI should remain practical and assistive. It should recommend, rank, forecast, and explain, but not silently take safety-critical decisions.
• No black-box authority over CG, emergency, medical access, or legal compliance.
• All AI outputs must expose data freshness, confidence, and source domain.
• Operational AI runs near the workflow, not as a detached chatbot.
# 9. Dashboard and Screen System
• PWA screen inventory should include: onboarding, login, role switcher, home dashboard, load board, load detail, slot sheet, check-in, QR, gear check, payment sheet, incident report, emergency card, weather board, reports, shop, social feed, profile, and settings.
• All high-frequency staff screens must work cleanly on tablet widths and small landscape devices.
• Manifest UI principle: one glance should answer what is loading now, who is blocked, what is delayed, and what needs manual intervention.
# 10. Mobile Strategy
# 11. Monetization
• Per-booking commissions for tandem, AFF, coaching, camps, and marketplace orders.
• Dropzone SaaS subscription tiers by operational depth, branches, and advanced analytics.
• Coach fees and payout handling, with optional platform service charge.
• Media sales and delivery workflow for tandem and events.
• P2P resale fee on approved slot transfers.
• Shop and gear rental revenue plus payment-provider fee pass-through where contractually allowed.
# 12. MVP vs Future Roadmap
# 13. CTO Critique - Brutally Honest
• The biggest risk is trying to build a global ecosystem before proving dropzone operations at one or two real pilot DZs.
• Offline-first is expensive and easy to fake. If local authority mode is weak, manifest chaos will appear the first time the internet drops.
• Walk-in cash, manual exceptions, and informal coaching demand can break the cleanliness of reporting if not captured in the workflow.
• Cross-DZ identity is only partly portable because license standards, AFF progression discipline, and local operating rules differ.
• Too much AI too early will create false confidence. Recommendations must stay secondary to operator control.
• If staff data entry is lazy, the analytics layer will lie with authority.
# 14. Refactor and Fix Loop
• Keep V1 focused on operational truth capture. Every action that matters must have a fast workflow and an audit trail.
• Use strict enums for activity types, incident types, refund reasons, and permissioned overrides. Free text destroys reporting quality.
• Build the local ops engine early, not after launch.
• Separate live operational reads from historical analytics. Use rollups and warehouse sync rather than burdening MySQL with complex reporting.
• Design for branch autonomy with cloud reconciliation, not total cloud dependence.
# 15. RBAC, Audit, Offline Sync, Finance, Performance, Analytics
Core cross-cutting architecture decisions:
# 16. Offline-First Resilience and Local Ops - Master Design
SkyLara should assume the cloud can disappear during operations. Local Ops Mode is not a degraded toy mode. It is a first-class operational runtime.
• Local store: IndexedDB for web PWA, SQLite-based store for native escalation. Cache loads, slots, athletes, coaches, qr_tokens, emergency profiles, check-in sessions, payments-intent records, incident drafts, and local audit entries.
• Local-first writes: user action writes immediately to local DB, updates UI optimistically, appends an outbox event, then syncs when connectivity exists.
• Outbox pattern: each action receives client_event_id, aggregate_id, aggregate_version, action_type, payload, created_at, retry_count, and sync_state.
• Conflict rules: last-write-wins for notes, non-critical profile fields, and cosmetic settings; server authority for financial settlement and finalized ledger; manual review for slot assignment collisions, instructor double-booking, or conflicting safety state.
• Safety-critical conflict handling: if the same load or slot was changed locally and in cloud during outage, mark the record as contested, freeze further automation, and require manifest review.
• Edge authority model: optional branch hub device acts as local source of truth on the DZ network and reconciles with cloud later.
• UX rule: same screens online and offline, subtle sync indicator, visible last-sync timestamp, and no blocking spinner for normal ops.
• Sync contracts: pull changed_since cursor, push batched outbox actions, idempotency by client_event_id, replay-safe server handlers, and sync audit trail.
• Local payments: capture intent and manual cash markers offline, but online confirmation is required before funds are treated as settled.
• This section is the minimum acceptable resilience model for real dropzone operations.
# 17. QR Identity, Check-In, and Group Manifest
• Each jumper receives a permanent identity QR, a DZ-specific daily check-in QR, and booking or session QR tokens for tandem, AFF, coaching, and camera.
• QR workflows: reception check-in, gear check lookup, boarding confirmation, profile retrieval, wallet and account lookup, and quick jump-status access.
• Group model: groups, group_members, group_load_assignments, captain role, recurring templates, group type, split handling, and partial manifest confirmations.
• Validation rules before manifesting a group: waiver, payment or ticket, currency, license, coach requirement, camera requirement, two-instructor AFF rule, safety compatibility, and load capacity.
• Notifications: all group members are informed on manifest, split, move, or block; captain gets exception details; instructors and camera flyers get assignment confirmations.
• Offline QR: signed token plus local cache lookup. Duplicate scan prevention uses daily nonce and local session lock.
# 18. Integration, Security, DevOps, and Adoption
• Integration layer: modular connectors for weather, maps, WhatsApp, Stripe Connect, OCTO, SKYCRU, and TUNN3L. Each connector sits behind a stable internal adapter.
• Security: JWT access tokens, refresh tokens, optional OAuth for staff identity providers, MFA for privileged roles, encryption at rest and in transit, device-aware sessions, rate limiting, and fraud monitoring.
• DevOps: GitHub Actions, container builds, dev, staging, and prod environments, blue-green release flow, automated rollback, backups, restore drills, alerting, and incident response runbooks.
• Adoption: guided DZ onboarding, CSV and legacy-manifest migration, role-based staff training, regional legal packs, and staged rollout from one branch to network-level adoption.
# 19. Frontend PWA Build Scope
• Preferred frontend stack: Next.js 14, React 18, TypeScript, TanStack Query, WebSocket client, IndexedDB persistence, and an internal design system.
• Core mobile layout rule: every critical action is reachable within two taps from the current operational screen.
• Accessibility: large hit targets, sunlight-safe contrast, offline-visible states, and low-motion defaults for field use.
# 20. Build Recommendation
Recommended pilot sequence:
• Pilot 1: one DZ, one branch, one aircraft family, tandem plus fun jump plus AFF, basic coaching, local staff champions.
• Pilot 2: second branch or second DZ to validate multi-tenant and multi-branch behavior.
• Only after both pilots: expand reporting warehouse, advanced AI, marketplace depth, and broader partner integrations.
# Appendix A - Minimum API Surface
# Appendix B - Core Database Relations
• users 1-to-many user_roles; user_roles many-to-1 roles and dropzones.
• dropzones 1-to-many dz_branches, aircraft, loads, incidents, and products.
• loads 1-to-many slots, cg_checks, load_notes, and instructor_assignments.
• slots many-to-1 athletes, loads, optional instructor, ticket, and gear_check.
• transactions 1-to-many commission_splits and linked payments or refunds depending on processor model.
• groups 1-to-many group_members and many-to-many loads through group_load_assignments.
• waivers 1-to-many waiver_signatures; signatures linked to users or guardians as applicable.
• audit_logs reference every state-changing entity through entity_type and entity_id plus correlation_id.

| Positioning | Primary decision | North star |
| --- | --- | --- |
| Global operating system for flying | V1 modular monolith, V2 selective extraction | Safety-first operations that still work offline |
| Primary build target | Backend plus responsive web PWA plus mobile-friendly staff flows | Fastest path to pilot with real DZs |
| Core differentiator | Manifest plus identity plus safety plus payments plus local ops | Better than paper, lighter than legacy competitors |

| Module | Owns | Interfaces | V2 extraction trigger |
| --- | --- | --- | --- |
| Auth and Identity | users, roles, profiles, sessions, athlete identity | AuthService, IdentityService | cross-DZ data residency or high auth throughput |
| Manifest and Ops | loads, slots, waitlist, FSM, check-in | ManifestService, OpsService | 50+ concurrent DZs or heavy WebSocket traffic |
| Safety and Gear | emergency, incidents, gear, compliance | SafetyService, GearService | regulatory isolation or high incident volume |
| Payments and Wallet | transactions, tickets, refunds, splits | PaymentService | PCI isolation or high GMV |
| Booking and Training | bookings, AFF, coaching, schedules | BookingService, TrainingService | public API pressure or complex scheduling |
| Notifications | push, SMS, WhatsApp, email | NotificationService | high channel volume or SLA split |
| Reporting and AI | analytics, forecasts, anomaly detection | ReportingService, AIService | warehouse scaling or dedicated ML infra |
| Marketplace and Story | products, orders, media, feed | ShopService, StoryService | network effects and social traffic |

| Domain | Core tables | Key notes |
| --- | --- | --- |
| Identity | users, user_profiles, roles, user_roles, sessions, mfa_tokens | platform-level identity with DZ-scoped role grants |
| Tenant | organizations, dropzones, dz_branches, dz_settings, dz_pricing | multi-branch operational defaults and pricing |
| Manifest | loads, slots, waitlist_entries, cg_checks, load_notes | strict FSM, real-time board, aircraft-linked |
| Aircraft and Pilot | aircraft, aircraft_mx_logs, pilot_profiles, pilot_certifications, pilot_schedules | airworthiness and pilot currency |
| Training and Coaching | aff_records, coaching_types, coaching_sessions, instructor_skills, instructor_assignments, booking_requests | skill-based matching and approval flow |
| Safety | emergency_profiles, incidents, risk_assessments, hospital_db, weather_holds | life-critical and compliance-bound |
| Gear | gear_items, gear_checks, gear_rentals, maintenance_alerts | repack and AAD expiry enforcement |
| Finance | wallets, jump_tickets, transactions, payments, commission_splits, payouts, tax_rules | append-only and auditable |
| Localization | languages, translations, currencies, exchange_rates, locale_rules | dynamic labels and notifications |
| Marketplace | shop_products, shop_inventory, shop_orders, shop_order_items, media_products | DZ shop plus media sales |
| Social and Identity Layer | social_posts, social_comments, social_reactions, follows, achievements, activity_feed | cross-DZ identity and retention |
| Offline and Audit | event_outbox, sync_outbox, sync_conflicts, audit_logs, scan_logs | resilience and legal traceability |

| Area | Flow | Rules | Automations |
| --- | --- | --- | --- |
| Load creation | Create load from aircraft, branch, altitude, slot count | one active flight cycle per aircraft window | auto-broadcast to all clients |
| Slot assignment | Add tandem, AFF, fun jumper, coach, camera, group member | compliance must pass before manifest | pricing resolve, instructor match, waitlist fallback |
| Instructor assignment | TI, AFFI, coach, camera, specialist | skill match, workload, availability, branch scope | best-fit ranking and reserve candidates |
| Check-in | QR scan or manual search to activity selection to compliance grid | waiver, currency, license, weight, gear, medical flags | status update, reminders, exceptions queue |
| Coaching approval | request to DZ review to accept or decline within 24h+ | must match coach skill and schedule | expiry reminder and auto-close |
| Load state machine | OPEN to FILLING to LOCKED to 30MIN to 20MIN to 10MIN to BOARDING to AIRBORNE to LANDED to COMPLETE | CG PASS blocks LOCKED to 30MIN | notifications, audit, payouts, logbook draft |
| No-show handling | mark no-show before boarding | policy-driven penalty or refund | waitlist promotion and captain notification |
| Weather change | hold, split, delay, cancel loads | manual authority remains with ops | mass notifications and repricing prompts |

| Language set | Priority |
| --- | --- |
| English, Spanish, Portuguese, French, German | Europe and LATAM core |
| Arabic, Turkish, Italian, Dutch, Romanian | MENA and Europe growth |
| Swedish, Norwegian, Polish, Czech, Ukrainian | event and camp corridors |
| Future pack: Hebrew, Russian, Japanese, Korean | expand when region-specific demand appears |

| AI area | Input signals | Outputs |
| --- | --- | --- |
| Load optimization | open loads, aircraft seats, jump type mix, no-show history | recommended manifests and fill suggestions |
| Instructor matching | skills, availability, workload, language, prior student history | ranked instructor list with confidence |
| Demand forecasting | historic bookings, weather, seasonality, event calendar | expected load demand with confidence bands |
| Safety alerts | wind, hold history, incident patterns, gear and currency anomalies | risk prompts and hold recommendations |
| DZ insights | revenue, fill rate, delays, retention | operational recommendations for managers |
| Jumper behavior | frequency, disciplines, coach interactions, spend | segment and retention suggestions |

| Role | Primary screens | Top actions |
| --- | --- | --- |
| DZ operator | overview, revenue, weather, staff, incidents, adoption | create load, approve override, issue refund, trigger hold |
| Manifest staff | load board, check-in queue, waitlist, CG panel, boarding view | manifest, reassign, lock, call, no-show |
| Instructor and coach | assigned jumps, student history, AFF eval, notes, earnings | accept session, sign off, add debrief |
| Athlete | home, QR, available loads, wallet, logbook, story, profile | check in, join load, buy ticket, upload media |
| Pilot | today loads, W and B, boarding confirmation, flight log | confirm boarding, airborne, landed |
| Admin | tenant map, DZ health, billing, support, DLQ | investigate, retry, migrate, audit |

| Decision area | MVP decision | Reason |
| --- | --- | --- |
| Athlete app | Responsive PWA first | fastest ship, installable, easier updates |
| Staff operations | Responsive PWA optimized for tablets and rugged phones | one codebase, offline capable, easier pilot rollout |
| Native escalation | React Native only when hardware access or advanced background tasks require it | avoid early split-platform cost |
| Push | Web push plus SMS plus WhatsApp fallback | field-reliable communication |
| Offline | local DB plus sync outbox mandatory | internet cannot be assumed on DZ grounds |

| Phase | Must include | Deferred |
| --- | --- | --- |
| MVP | auth, RBAC, dropzones, branches, aircraft, loads, slots, check-in, wallet and tickets, payments, waivers, gear checks, incidents, notifications, reports-lite, offline local ops, QR identity | advanced AI, social growth loops, global exchange, complex partner APIs |
| V2 | AI ranking, richer reporting warehouse, story layer, P2P resale, coach marketplace, advanced events | full native mobile, broader social graph |
| V3 | global flying identity, inter-DZ transfer layer, partner ecosystem, advanced marketplace, premium network effects | specialized enterprise customizations |

| System | Implementation rule | Non-negotiable |
| --- | --- | --- |
| RBAC | role grants per dropzone and branch, temporary role support, safety tiers | critical overrides require reason and audit |
| Audit | append-only immutable logs with before/after snapshots | legal export and searchability |
| Offline sync | local-first store, outbox, conflict queue, deterministic replay | no active-ops data loss |
| Finance | transactional outbox, append-only ledger, split payouts | never lose money events |
| Performance | Redis cache, WS fan-out, read models, background jobs | manifest stays fast at peak |
| Analytics | warehouse rollups plus freshness labels | never present stale data as live fact |

| Tier | Functions | Offline requirement |
| --- | --- | --- |
| Tier 1 - never fail | manifest board, check-in, slot add or remove, instructor and camera assignment, load state transitions, emergency profiles, incident capture | must run fully offline |
| Tier 2 - should continue | gear checks, QR scan, payment intent capture, local announcements, boarding confirmation | work offline and sync later |
| Tier 3 - can defer | final card settlement, analytics refresh, remote notifications, cross-DZ sync | queue until cloud returns |

| Surface | Pages or screens | Key components |
| --- | --- | --- |
| Public web | landing, pricing, DZ page, booking, gift cards | marketing, booking funnel, FAQs |
| Athlete PWA | home, QR, check-in, loads, wallet, logbook, profile, story, shop | installable and offline capable |
| Staff PWA | load board, check-in queue, boarding, CG, incidents, payments, reports | tablet-first operational workspace |
| Operator console | overview, staff, revenue, safety, settings, adoption, admin | dense but readable management UI |

| /api namespace | Examples |
| --- | --- |
| /api/v1/auth | login, refresh, role switch, MFA |
| /api/v1/identity | athletes, profiles, licenses, logbook, emergency |
| /api/v1/manifest | loads, slots, waitlist, boarding, CG |
| /api/v1/training | AFF, coaching sessions, assignments, approvals |
| /api/v1/payments | wallets, tickets, transactions, refunds, payouts |
| /api/v1/gear | gear items, checks, rentals, alerts |
| /api/v1/safety | incidents, risk assessments, hospitals, holds |
| /api/v1/notify | notifications, templates, channels |
| /api/v1/shop | products, orders, inventory |
| /api/v1/admin | dropzones, branches, plans, migrations, DLQ |