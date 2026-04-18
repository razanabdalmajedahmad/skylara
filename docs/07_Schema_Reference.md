# SKYLARA

_Source: 07_Schema_Reference.docx_

SKYLARA
Database Schema Reference
Version 2.0  |  April 2026
MySQL 8.0  •  InnoDB  •  utf8mb4  •  75 Tables  •  170 FK Constraints  •  247 Indexes
# Table of Contents
# Design Decisions & Conventions
## Primary Key Strategy
All tables use BIGINT UNSIGNED AUTO_INCREMENT for internal primary keys. External-facing identifiers use CHAR(36) UUIDs (v4), ensuring API consumers never see sequential IDs. Small lookup tables (roles, skill types, coaching types, languages, currencies) use TINYINT or SMALLINT UNSIGNED for storage efficiency.
## Multi-Tenancy
Row-level tenant isolation via dropzone_id on every tenant-scoped table. Platform-scoped tables (users, roles, languages, currencies, achievements) omit dropzone_id. The user_roles table uses nullable dropzone_id where NULL represents platform-wide scope.
## Timestamps & Soft Deletes
All timestamps are UTC. created_at defaults to CURRENT_TIMESTAMP. updated_at uses ON UPDATE CURRENT_TIMESTAMP. Primary entity tables support soft deletes via nullable deleted_at. Financial tables are strictly append-only — amounts are never updated.
## Character Set & Collation
utf8mb4 character set with utf8mb4_unicode_ci collation on all tables. Supports full Unicode including emoji, Arabic, Hebrew, CJK characters, and diacritics required for the 15 supported languages.
## JSON Columns
JSON columns are used for semi-structured data: allergies, medications, hazard arrays, plural form translations, gear involved in incidents. Requires MySQL 8.0+. Application layer validates JSON schema.
## Index Strategy
Indexes follow naming conventions: ix_{table}_{column} for regular indexes, uq_{table}_{column} for unique constraints. Composite indexes are designed for the most common query patterns: load board refresh (every 1-2s), slot assignment, currency checks, notification inbox, translation lookup, and activity feed rendering.
## Partitioning Strategy (V2+)
When tables exceed 50M rows, partition by RANGE on year: logbook_entries, notifications, transactions, weather_data, activity_feed. Retain active data; archive older partitions to cold storage.
# 1. Authentication & Users (§1)
Core identity layer. Every human in the system gets a users record. Roles are static and assigned per-dropzone via a many-to-many table. JWT sessions with refresh tokens, optional TOTP MFA.
# 2. Dropzones & Branches (§2)
Multi-tenant foundation. Each DZ organization can have multiple physical branches. Pricing is normalized per jump type and altitude. Stripe Connect for payments.
# 3. Aircraft (§3)
Aircraft registry with CG envelope data for the blocking safety gate. Tracks maintenance, total jumps, flight hours.
# 4. Manifest — Loads, Slots & CG (§4)
Real-time manifest engine. Load FSM (OPEN → FILLING → LOCKED → 30MIN → 20MIN → 10MIN → BOARDING → AIRBORNE → LANDED → COMPLETE | CANCELLED). CG blocking gate enforces weight/balance compliance before LOCKED transition. Waitlist with claim timers.
# 5. Athletes & Compliance (§5)
Athlete identity with USPA verification, license tracking, currency checks (recency requirements), AFF progression records, and digital waivers.
# 6. Gear & Rigging (§6)
Equipment tracking with FAA rigger inspection cycle. Rental management.
# 7. Payments & Financial (§7)
Append-only financial records. Wallet system, jump tickets, Stripe Connect integration, commission splits, gift cards. Never UPDATE amount fields.
# 8. Bookings (§8)
Online booking system with packages and date selection.
# 9. Notifications, Social & Achievements (§9)
Push/SMS/email notifications from templates. Social feed with posts, comments, reactions, follows. Gamification via achievements.
# 10. Marketplace, Weather & AI (§10)
DZ shop with inventory. Weather data integration with hold tracking. AI insights storage.
# 11. Operations — Instructor Management & Coaching (§11)
NEW IN V2. Full instructor lifecycle: skill certifications (handicap, overweight, camera, AFF, coach, freefly, wingsuit), part-time/full-time/seasonal availability, per-load assignments, coaching session tracking with group support, and a 24-hour booking request approval workflow.
# 12. Safety & Emergency (§12)
NEW IN V2. Comprehensive safety system: emergency medical profiles (blood type, allergies, medications, insurance, emergency contacts), local hospital database with trauma levels and helipad info, USPA-integrated incident reporting with severity tracking and corrective actions, and composite wind/weather/hazard risk assessments with operational decisions.
# 13. Global — Localization, Currencies & Units (§13)
NEW IN V2. Full i18n infrastructure: 15 languages with RTL support (Arabic, Hebrew), namespaced translation keys with plural forms and review workflow, 10 currencies with exchange rates, and per-DZ locale settings covering language, currency, measurement system, date/time format, and all aviation-specific units (altitude, wind speed, temperature, weight).
# 14. Social — Media, Stories & Activity Feed (§14)
NEW IN V2. The identity and story layer: media gallery with photo/video/360 support, user tagging, athlete story profiles (tagline, narrative, disciplines, certifications), milestone timelines (first jump, licenses, jump milestones, competitions), and a unified activity feed powering the social timeline.
# 15. Entity Relationship Map
Key relationship chains across the schema:
# 16. Seed Data Summary
The following lookup tables are seeded at deploy time with initial data:
# 17. Operational Procedures
## Backup Strategy
Daily automated backups via AWS RDS snapshots (35-day retention). Point-in-time recovery enabled. Cross-region replication for disaster recovery. Monthly test restores to staging environment.
## Migration Policy
All schema changes via versioned migration files (Kysely migrator). Forward-only migrations in production. Backward-compatible changes only during active operations (no column drops during business hours). Migration tested against production snapshot before deploy.
## Monitoring
Key metrics: slow query log (>100ms), connection pool utilization, replication lag, table size growth, InnoDB buffer pool hit ratio. Alerts on: FK violation spikes, outbox relay latency >1s, CG check failures, booking request expiry rate.
## Data Retention
Active data: indefinite. Weather data: 1 year (partition and archive). Notifications: 6 months read, 30 days unread. Sessions: prune expired nightly. Event outbox: prune published >7 days.

| Total Tables | New in V2 | FK Constraints | Indexes |
| --- | --- | --- | --- |
| 75 | 24 | 170 | 247+58 unique |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| roles | TINYINT UNSIGNED | Static role definitions (10 roles). Seeded at deploy. Never user-created. | No | — | No |
| users | BIGINT UNSIGNED | Base user account — root of all identity. UUID for external API. bcrypt passwords. | No | — | Yes |
| user_profiles | BIGINT UNSIGNED | Extended profile (1:1 with users). Avatar, bio, DOB, social links, notification prefs. | No | users | No |
| user_roles | BIGINT UNSIGNED | Many-to-many: user-role scoped per dropzone. NULL dropzone = platform-wide. | dropzone_id (nullable) | users, roles, dropzones | No |
| sessions | BIGINT UNSIGNED | JWT refresh token storage. Device tracking. Prune expired nightly. | No | users | No |
| mfa_tokens | BIGINT UNSIGNED | TOTP MFA secrets (1:1 with enrolled users). Encrypted at rest. | No | users | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| dropzones | BIGINT UNSIGNED | One per DZ business. Operational defaults (weight limits, wind limits, self-manifest). Stripe Connect. | — | users (owner) | Yes |
| dz_branches | BIGINT UNSIGNED | Physical locations under a DZ org. Auto-created if single location. | dropzone_id | dropzones | No |
| dz_pricing | BIGINT UNSIGNED | Normalized pricing grid: jump_type + altitude = price. Branch-overrideable. | dropzone_id | dropzones, dz_branches | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| aircraft | BIGINT UNSIGNED | Registered aircraft per DZ. CG forward/aft limits. Maintenance tracking. | dropzone_id | dropzones, dz_branches | Yes |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| loads | BIGINT UNSIGNED | Load records with FSM status. Aircraft assignment, pilot, altitude, call time. CG approved flag. | dropzone_id | dropzones, aircraft, dz_branches | No |
| slots | BIGINT UNSIGNED | Individual jumper slot on a load. Jump type, weight, exit order group. Payment link. | dropzone_id | loads, users, athletes | No |
| cg_checks | BIGINT UNSIGNED | Append-only CG calculation audit log. Total weight, CG position, pass/fail. | dropzone_id | loads | No |
| waitlist_entries | BIGINT UNSIGNED | Waitlist queue with claim timers (configurable minutes). | dropzone_id | loads, users | No |
| load_notes | BIGINT UNSIGNED | Free-text notes on loads (manifest staff, pilot, safety). | dropzone_id | loads, users | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| athletes | BIGINT UNSIGNED | Athlete profile: USPA member #, license level, jump count, home DZ. | dropzone_id | users, dropzones | Yes |
| licenses | BIGINT UNSIGNED | License records (A/B/C/D/E + foreign). Authority, number, dates. | No | users | No |
| uspa_verifications | BIGINT UNSIGNED | USPA verification API call results. Cached with expiry. | No | users | No |
| currency_checks | BIGINT UNSIGNED | Currency compliance check log (recency requirements). | dropzone_id | athletes | No |
| logbook_entries | BIGINT UNSIGNED | Digital logbook. Jump altitude, freefall time, canopy size, GPS. | dropzone_id | users, loads, slots, dropzones | No |
| aff_records | BIGINT UNSIGNED | AFF level progression tracking (1-8+). Pass/fail per level. | dropzone_id | users (student + instructor), dropzones | No |
| waivers | BIGINT UNSIGNED | Waiver templates with versioning and required-for-jump flag. | dropzone_id | dropzones | No |
| waiver_signatures | BIGINT UNSIGNED | Signed waivers. Signature data, IP, timestamp. Append-only. | No | waivers, users | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| gear_items | BIGINT UNSIGNED | Gear registry: container, main, reserve, AAD. Serial numbers, DOM, pack dates. | dropzone_id | dropzones, users | Yes |
| gear_checks | BIGINT UNSIGNED | Rigger inspection records. Next repack date. Airworthiness status. | dropzone_id | gear_items, users (rigger) | No |
| gear_rentals | BIGINT UNSIGNED | Rental tracking: who has what gear, checked out/returned. | dropzone_id | gear_items, users | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| wallets | BIGINT UNSIGNED | Per-user wallet per DZ. Balance in cents. Append-only transactions. | dropzone_id | users, dropzones | No |
| jump_tickets | BIGINT UNSIGNED | Pre-paid jump ticket packages with remaining count. | dropzone_id | users, dropzones | No |
| transactions | BIGINT UNSIGNED | Append-only ledger. Credits, debits, refunds. Stripe payment ID. | dropzone_id | wallets, users, slots | No |
| commission_splits | BIGINT UNSIGNED | Revenue split records (DZ/instructor/camera). Linked to transactions. | dropzone_id | transactions, users | No |
| gift_cards | BIGINT UNSIGNED | Gift card issuance and redemption tracking. | dropzone_id | dropzones, users | No |
| event_outbox | BIGINT UNSIGNED | Transactional Outbox for financial events. Relay polls every 100ms. | No | — | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| booking_packages | BIGINT UNSIGNED | Bookable packages (tandem, AFF course, etc.) with pricing. | dropzone_id | dropzones | No |
| bookings | BIGINT UNSIGNED | Customer booking records. Date, package, payment status. | dropzone_id | booking_packages, users, dropzones | Yes |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| notification_templates | BIGINT UNSIGNED | Notification templates per channel (push/sms/email). Variable interpolation. | No | — | No |
| notifications | BIGINT UNSIGNED | Sent notifications. Recipient, channel, read/delivered status. | dropzone_id | users, notification_templates | No |
| social_posts | BIGINT UNSIGNED | Community feed posts. Text, media, visibility. | dropzone_id | users, dropzones | Yes |
| social_comments | BIGINT UNSIGNED | Comments on social posts. | No | social_posts, users | Yes |
| social_reactions | BIGINT UNSIGNED | Emoji reactions on posts. | No | social_posts, users | No |
| follows | BIGINT UNSIGNED | User-to-user follow relationships. | No | users (follower + following) | No |
| achievements | BIGINT UNSIGNED | Achievement definitions (badge name, criteria, icon). | No | — | No |
| athlete_achievements | BIGINT UNSIGNED | Earned achievements per athlete. | No | athletes, achievements | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| shop_products | BIGINT UNSIGNED | Product catalog per DZ. | dropzone_id | dropzones | Yes |
| shop_inventory | BIGINT UNSIGNED | Stock levels per product per branch. | No | shop_products, dz_branches | No |
| shop_orders | BIGINT UNSIGNED | Customer orders. Payment and fulfillment status. | dropzone_id | users, dropzones | No |
| shop_order_items | BIGINT UNSIGNED | Line items within an order. | No | shop_orders, shop_products | No |
| weather_data | BIGINT UNSIGNED | Weather station readings. Wind, temp, cloud base, visibility. | dropzone_id | dropzones | No |
| weather_holds | BIGINT UNSIGNED | Weather hold records with start/end and reason. | dropzone_id | dropzones, users | No |
| ai_insights | BIGINT UNSIGNED | AI-generated insights. Load optimization, predictions, recommendations. | dropzone_id | dropzones, users | No |
| override_log | BIGINT UNSIGNED | Audit trail for safety/compliance overrides. | dropzone_id | users | No |
| staff_schedules | BIGINT UNSIGNED | Staff scheduling (pilot, manifest, instructor) per date. | dropzone_id | users, dropzones | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| instructor_skill_types | TINYINT UNSIGNED | Static skill type lookup (7 types). Seeded at deploy. | No | — | No |
| instructor_skills | BIGINT UNSIGNED | Instructor-to-skill mapping per DZ. Certification tracking, verification workflow. | dropzone_id | users, dropzones, instructor_skill_types | No |
| coaching_types | TINYINT UNSIGNED | Activity type lookup (10 types). Required skill linkage, max students. | No | instructor_skill_types | No |
| coaching_sessions | BIGINT UNSIGNED | Coaching/activity session records. Slot-linked, rated, priced. | dropzone_id | dropzones, slots, coaching_types, users, bookings | No |
| coaching_session_participants | BIGINT UNSIGNED | Group session participants. Attendance tracking. | No | coaching_sessions, users | No |
| instructor_availability | BIGINT UNSIGNED | Weekly availability windows. Part-time, freelance, seasonal support. | dropzone_id | users, dropzones | No |
| instructor_assignments | BIGINT UNSIGNED | Per-load instructor assignment by role (TI/AFFI/COACH/CAMERA). | dropzone_id | loads, users, dropzones | No |
| booking_requests | BIGINT UNSIGNED | DZ-to-instructor booking requests. 24h auto-expiry. Accept/decline workflow. | dropzone_id | dropzones, bookings, coaching_types, users | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| emergency_profiles | BIGINT UNSIGNED | 1:1 user emergency/medical data. Blood type, allergies, medications, contacts, insurance. | No | users | No |
| local_hospitals | BIGINT UNSIGNED | Nearby hospitals per DZ. Distance, ETA, trauma level, helipad, burn unit. | dropzone_id | dropzones | No |
| incident_reports | BIGINT UNSIGNED | Safety incidents. Severity, category, root cause, corrective actions, USPA reporting. | dropzone_id | dropzones, dz_branches, loads, aircraft, users | Yes |
| incident_involved_parties | BIGINT UNSIGNED | People involved in incidents. Injury details, treatment, hospitalization. | No | incident_reports, users | No |
| risk_assessments | BIGINT UNSIGNED | Wind/weather/hazard risk scoring (0-100). Operational decisions, supersede chain. | dropzone_id | dropzones, dz_branches, users, risk_assessments (self) | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| languages | SMALLINT UNSIGNED | Supported languages (15). BCP-47 codes, RTL flag, completeness tracking. | No | — | No |
| translation_namespaces | SMALLINT UNSIGNED | Translation key groupings (13 modules). Maps to frontend i18n modules. | No | — | No |
| translation_keys | BIGINT UNSIGNED | Master translatable strings. Dot-path keys, English defaults, plural support. | No | translation_namespaces | No |
| translations | BIGINT UNSIGNED | Translated text per key per language. Review workflow (draft/reviewed/approved). | No | translation_keys, languages, users | No |
| currencies | SMALLINT UNSIGNED | Supported currencies (10). ISO 4217, exchange rates to USD. | No | — | No |
| dz_locale_settings | BIGINT UNSIGNED | Per-DZ locale config (1:1). Language, currency, units, date/time format. | dropzone_id | dropzones, languages, currencies | No |

| Table | PK Type | Purpose | Tenant | FK References | Soft Del |
| --- | --- | --- | --- | --- | --- |
| media_uploads | BIGINT UNSIGNED | Photo/video gallery. S3/CDN storage, load-linked, moderation, geolocation. | dropzone_id (nullable) | users, dropzones, loads | Yes |
| media_tags | BIGINT UNSIGNED | User tags on media (many-to-many). | No | media_uploads, users | No |
| athlete_stories | BIGINT UNSIGNED | 1:1 athlete story profile. Tagline, narrative, disciplines, certifications, hero media. | No | users, dropzones, media_uploads | No |
| athlete_milestones | BIGINT UNSIGNED | Timeline events: first jump, licenses, jump #100/#500/#1000, competitions. | No | users, dropzones, media_uploads | No |
| activity_feed | BIGINT UNSIGNED | Unified event feed. Polymorphic references. Visibility controls. | dropzone_id (nullable) | users, dropzones | Yes |

| Relationship | Entity Chain |
| --- | --- |
| Identity Chain | users → user_profiles → user_roles → dropzones → dz_branches |
| Manifest Chain | dropzones → loads → slots → athletes → logbook_entries |
| CG Safety Gate | loads → cg_checks (append-only audit trail) |
| Financial Chain | users → wallets → transactions → event_outbox (outbox relay) |
| Instructor Chain | users → instructor_skills → instructor_skill_types users → instructor_availability → instructor_assignments → loads |
| Coaching Chain | coaching_types → coaching_sessions → coaching_session_participants booking_requests → coaching_types → instructor_skill_types |
| Safety Chain | users → emergency_profiles dropzones → incident_reports → incident_involved_parties dropzones → risk_assessments (self-referencing supersede chain) |
| Localization Chain | languages → translations → translation_keys → translation_namespaces currencies → dz_locale_settings → dropzones |
| Story Chain | users → athlete_stories → media_uploads users → athlete_milestones → media_uploads users → activity_feed (polymorphic references) |
| Booking Chain | booking_packages → bookings → booking_requests → coaching_sessions |

| Table | Rows | Values |
| --- | --- | --- |
| roles | 10 | DZ_OPERATOR, MANIFEST_STAFF, TI, AFFI, COACH, PILOT, RIGGER, ATHLETE, STUDENT, PLATFORM_ADMIN |
| instructor_skill_types | 7 | HANDICAP, OVERWEIGHT, CAMERA, AFF, COACH, FREEFLY, WINGSUIT |
| coaching_types | 10 | TANDEM, AFF, COACHING_BASIC, COACHING_ADVANCE, GROUP_COACHING, FREEFLY_COACHING, CAMERA_COACHING, FUN_JUMP, HOP_POP, WINGSUIT |
| languages | 15 | en, es, fr, de, it, pt, nl, pl, cs, sv, ar (RTL), he (RTL), tr, ru, ja |
| translation_namespaces | 13 | common, manifest, safety, booking, training, gear, payments, social, notifications, shop, emails, landing, admin |
| currencies | 10 | USD, EUR, GBP, CHF, AUD, NZD, BRL, ZAR, AED, SAR |