# SKYLARA CANONICAL IMPLEMENTATION TRUTH
# Phase 2 — Single Source of Truth for All Implementation

**Date:** April 8, 2026
**Authority:** Reconciliation of 21 design documents + actual codebase audit
**Conflict Resolution:** Final_Implementation_Spec > Production_Blueprint > System_Architecture > Schema_Reference > Engineering_Foundation > Infrastructure > all others

---

## 1. FINAL MODULE MAP (13 Bounded Modules)

Every feature belongs to exactly ONE module. No cross-module direct SQL.

| # | Module | Owner Service | DB Tables | API Prefix | Events Emitted |
|---|--------|--------------|-----------|------------|----------------|
| 1 | **identity** | IdentityService | users, user_profiles, roles, user_roles, sessions, mfa_devices, passkeys, oauth_accounts, login_attempts, password_reset_tokens | `/api/v1/auth/*`, `/api/v1/jumpers/*` | user.created, user.updated, role.granted, role.revoked, login.success, login.failed |
| 2 | **manifest** | ManifestService | loads, slots, cg_checks, waitlist_entries, load_notes, exit_groups | `/api/v1/dz/:dzId/loads/*` | load.created, load.updated, load.status_changed, slot.added, slot.removed, cg.checked, boarding.confirmed |
| 3 | **training** | TrainingService | aff_records, coaching_types, coaching_sessions, coaching_session_participants, instructor_skill_types, instructor_skills, instructor_availability, instructor_assignments, booking_requests | `/api/v1/dz/:dzId/training/*`, `/api/v1/dz/:dzId/instructors/*` | aff.level_passed, aff.level_failed, instructor.assigned, coaching.completed |
| 4 | **booking** | BookingService | booking_packages, bookings | `/api/v1/dz/:dzId/bookings/*` | booking.created, booking.confirmed, booking.cancelled, booking.expired |
| 5 | **payments** | PaymentService | wallets, jump_tickets, transactions, commission_splits, gift_cards, event_outbox, stripe_accounts, payment_intents, payment_splits, payouts, ledger_entries | `/api/v1/dz/:dzId/payments/*`, `/api/v1/webhooks/stripe` | payment.captured, payment.failed, refund.issued, payout.completed, wallet.topped_up |
| 6 | **safety** | SafetyService | emergency_profiles, incidents, incident_involved_parties, risk_assessments, local_hospitals | `/api/v1/dz/:dzId/safety/*` | incident.reported, emergency.activated, emergency.deactivated, risk.assessed |
| 7 | **gear** | GearService | gear_items, gear_checks, gear_rentals | `/api/v1/dz/:dzId/gear/*` | gear.checked, gear.grounded, gear.assigned, repack.due, aad.expiring |
| 8 | **notifications** | NotificationService | notification_templates, notifications, notification_deliveries, webhooks | `/api/v1/dz/:dzId/notifications/*` | notification.sent, notification.delivered, notification.failed |
| 9 | **weather** | WeatherService | weather_data, weather_holds | `/api/v1/dz/:dzId/weather/*` | weather.updated, weather.hold_activated, weather.hold_released |
| 10 | **reports** | ReportService | report_dashboards, report_blocks, daily_revenue_summary, daily_load_summary | `/api/v1/dz/:dzId/reports/*` | report.generated |
| 11 | **platform** | PlatformService | organizations, dropzones, dz_branches, dz_pricing, dz_locale_settings, override_log, staff_schedules, audit_logs, sync_outbox | `/api/v1/admin/*`, `/api/v1/dz/:dzId/settings/*` | dz.created, dz.updated, settings.changed |
| 12 | **story** | StoryService | social_posts, social_comments, social_reactions, follows, achievements, athlete_achievements, media_uploads, athlete_stories, athlete_milestones, activity_feed | `/api/v1/jumpers/:id/story/*` | post.created, milestone.achieved |
| 13 | **shop** | ShopService | shop_products, shop_inventory, shop_orders, shop_order_items | `/api/v1/dz/:dzId/shop/*` | order.placed, order.fulfilled |

### Module Dependencies (Acyclic)
```
identity ← (leaf, no deps)
weather  ← (leaf, external APIs only)
manifest ← identity
training ← identity, manifest
booking  ← identity, payments, manifest
payments ← identity, manifest
safety   ← identity, manifest, weather
gear     ← identity, safety
notifications ← identity
reports  ← manifest, payments, identity
platform ← identity
story    ← identity
shop     ← identity, payments
```

### MVP Modules (Phase 3-6): identity, manifest, training, booking, payments, safety, gear, notifications, weather, reports, platform
### Post-MVP Modules (Phase 7+): story, shop

---

## 2. FINAL ROLE MAP (10 Roles + 1 Read-Only)

| Role Code | Display Name | Tier | Dashboard | Key Permissions |
|-----------|-------------|------|-----------|-----------------|
| `PLATFORM_ADMIN` | Platform Admin | Super | Network KPIs, DZ Fleet, Billing | All actions across all DZs |
| `DZ_OWNER` | DZ Owner | Owner | Revenue, Staff, Aircraft, Settings | All actions within owned DZ, financial overrides, CG overrides |
| `DZ_MANAGER` | DZ Manager | Manager | Operations KPIs, Staff, Reports | Manage staff, loads, bookings, reports, post-LOCKED manifest changes |
| `MANIFEST_STAFF` | Manifest Staff | Operator | Load Board, Check-In, Waitlist | Create loads, assign slots, check-in, CG sign-off |
| `TI` | Tandem Instructor | Instructor | My Students, Schedule, Earnings | View assigned students, post-jump notes, view earnings |
| `AFFI` | AFF Instructor | Instructor | Student Progression, Evaluations | AFF level evaluation, sign-off, progression tracking |
| `COACH` | Coach | Instructor | Coaching Sessions, Students | Coaching session management, student evaluations |
| `PILOT` | Pilot | Operations | My Loads, CG Sheet, Flight Log | View manifests, confirm boarding, log flights (mostly view) |
| `RIGGER` | Rigger / S&TA | Safety | Gear Inventory, Repack Queue | Gear checks, repack tracking, license verification |
| `ATHLETE` | Licensed Athlete | User | Home, Logbook, Wallet, Story | Self-manifest, view loads, manage logbook, wallet, shop |
| `STUDENT` | Student | User | Onboarding, AFF Progress | Book training jumps, view progression, complete onboarding |
| `SPECTATOR` | Spectator | Read-Only | Load Board (view only) | View active loads only |

### Role Hierarchy (Inheritance)
```
PLATFORM_ADMIN ⊃ DZ_OWNER ⊃ DZ_MANAGER ⊃ MANIFEST_STAFF ⊃ {all staff roles}
MANIFEST_STAFF → can perform: TI, AFFI, COACH, PILOT, RIGGER read actions
DZ_MANAGER → can perform: MANIFEST_STAFF + staff management + reports
DZ_OWNER → can perform: DZ_MANAGER + financial overrides + settings
```

### Permission Format: `{resource}:{action}`
Examples: `load:create`, `slot:assign`, `cg:override`, `payment:refund`, `incident:report`

### Safety Tiers
- **TIER 1 (CRITICAL):** CG override, emergency access, weather hold override → DZ_OWNER + reason + audit
- **TIER 2 (HIGH):** Post-LOCKED manifest changes, instructor reassignment → DZ_MANAGER + reason
- **TIER 3 (STANDARD):** Create load, assign slots, check-in → MANIFEST_STAFF
- **TIER 4 (BASIC):** View load board, self-manifest → ATHLETE

---

## 3. FINAL DATABASE MAP (75 Tables, 14 Domains)

### Canonical Naming: snake_case, plural nouns, no prefixes

### DOMAIN 1: Identity & Auth (10 tables)
```
users                    — id, uuid, email, phone, password_hash, first_name, last_name, status, preferred_language, created_at, updated_at, deleted_at
user_profiles            — id, user_id (FK unique), avatar, bio, date_of_birth, gender, nationality, weight_lbs, height_in, emergency_contact_*, notification_prefs (JSON)
roles                    — id, name (unique), display_name, description
user_roles               — id, user_id, role_id, organization_id?, dropzone_id?, granted_by?, expires_at?
                           UNIQUE(user_id, role_id, organization_id, dropzone_id)
sessions                 — id, user_id, token_hash, device_info, ip_address, expires_at, revoked_at
mfa_devices              — id, user_id, type (TOTP|WEBAUTHN|SMS), secret, verified, backup_codes (JSON)
passkeys                 — id, user_id, credential_id (unique), public_key, counter, transports (JSON), device_name
oauth_accounts           — id, user_id, provider, provider_account_id, access_token, refresh_token, expires_at
login_attempts           — id, email, ip_address, user_agent, success, failure_reason, created_at
password_reset_tokens    — id, user_id, token_hash (unique), expires_at, used_at
```

### DOMAIN 2: Tenant & Platform (7 tables)
```
organizations            — id, uuid, name, slug (unique), owner_id (FK), subscription_tier, created_at
dropzones                — id, uuid, organization_id (FK), name, slug, icao_code, latitude, longitude, timezone, wind_limit_knots, currency, status
dz_branches              — id, dropzone_id (FK), name, is_default
dz_pricing               — id, dropzone_id (FK), activity_type, base_price_cents, currency, peak_multiplier, group_discount_pct
dz_locale_settings       — id, dropzone_id (FK), default_language, weight_unit, altitude_unit, temperature_unit, date_format
override_log             — id, dropzone_id, user_id, action, entity_type, entity_id, reason (TEXT), created_at
staff_schedules          — id, dropzone_id, user_id, day_of_week, start_time, end_time, employment_type
```

### DOMAIN 3: Aircraft (1 table)
```
aircraft                 — id, dropzone_id (FK), registration (unique per DZ), type, manufacturer, model, max_capacity, max_weight_lbs, empty_weight_lbs, fuel_burn_rate, cg_forward_limit, cg_aft_limit, status (ACTIVE|MX_HOLD|RETIRED), hobbs_hours, next_100hr_due, annual_due
```

### DOMAIN 4: Manifest & Operations (5 tables)
```
loads                    — id, uuid, dropzone_id (FK), branch_id (FK), aircraft_id (FK), pilot_id (FK), load_number, status (LoadStatus enum), scheduled_at, actual_departure_at, slot_count, current_weight, cg_position, fuel_weight, notes
                           UNIQUE(dropzone_id, load_number)
slots                    — id, load_id (FK), user_id (FK?), instructor_id (FK?), camera_id (FK?), position, slot_type (SlotType), jump_type (JumpType), weight, exit_group, exit_order, checked_in, checked_in_at, status (SlotStatus)
                           UNIQUE(load_id, position)
cg_checks                — id, load_id (FK), performed_by (FK), total_weight, fuel_weight, pilot_weight, passenger_weight, calculated_cg, forward_limit, aft_limit, result (PASS|FAIL|MARGINAL), override_reason?, created_at
                           APPEND-ONLY (never UPDATE)
waitlist_entries          — id, dropzone_id, user_id, load_id?, slot_type, priority, created_at, claimed_at?
load_notes               — id, load_id (FK), user_id (FK), content, created_at
```

### DOMAIN 5: Athletes & Compliance (8 tables)
```
athletes                 — id, user_id (FK unique), home_dropzone_id (FK), uspa_member_id?, license_level (A|B|C|D|STUDENT|NONE), total_jumps, last_jump_date, disciplines (JSON)
licenses                 — id, user_id (FK), type (USPA|BPA|APF|FFP|DFV), number, level, issued_at, expires_at, verified_by?, verified_at?, verification_method
currency_checks          — id, user_id (FK), last_jump_date, is_current, rule_applied, checked_at
logbook_entries           — id, user_id (FK), load_id (FK?), dropzone_id (FK), jump_number, altitude, freefall_time, deployment_altitude, canopy_size, jump_type, disciplines (JSON), notes, coach_sign_off_id?, instructor_sign_off_id?, gps_data (JSON?), created_at
aff_records              — id, student_id (FK), instructor_id (FK), dropzone_id (FK), level (1-8), passed, evaluation_notes, video_url?, created_at
waivers                  — id, dropzone_id (FK), waiver_type, content (TEXT), version, is_active
waiver_signatures        — id, waiver_id (FK), user_id (FK), signed_at, signature_data, ip_address, device_info, geo_lat?, geo_lng?, guardian_name?, guardian_relation?
                           UNIQUE(waiver_id, user_id)
uspa_verifications       — id, user_id (FK), verification_method, verified_by?, verified_at, evidence_url?, expires_at?
```

### DOMAIN 6: Gear & Rigging (3 tables)
```
gear_items               — id, dropzone_id (FK), owner_id (FK?), serial_number, gear_type (CONTAINER|MAIN|RESERVE|AAD|HELMET|ALTIMETER|SUIT), manufacturer, model, dom, size?, weight_range_min?, weight_range_max?, last_repack_at?, next_repack_due?, aad_service_due?, aad_lifecycle_expiry?, status (ACTIVE|GROUNDED|RETIRED|IN_REPAIR), is_rental, nfc_tag_id?
                           UNIQUE(dropzone_id, serial_number)
gear_checks              — id, gear_item_id (FK), user_id (FK), checked_by_id (FK), load_id (FK?), result (PASS|FAIL|GROUNDED), notes, checked_at
gear_rentals             — id, gear_item_id (FK), user_id (FK), assigned_by (FK), assigned_at, returned_at?, condition_out, condition_in?, daily_rate_cents?
```

### DOMAIN 7: Payments & Financial (7 tables)
```
wallets                  — id, user_id (FK), dropzone_id (FK), balance_cents, currency
                           UNIQUE(user_id, dropzone_id)
jump_tickets             — id, user_id (FK), dropzone_id (FK), ticket_type, total_jumps, remaining_jumps, price_cents, expires_at?, purchased_at
transactions             — id, uuid, wallet_id (FK), type (TICKET_PURCHASE|BOOKING|RENTAL|SHOP|REFUND|CREDIT|PAYOUT|FEE), amount_cents, balance_after_cents, description, reference_type?, reference_id?, stripe_payment_id?, created_at
                           APPEND-ONLY (never UPDATE amount)
commission_splits        — id, transaction_id (FK), recipient_type (DROPZONE|COACH|PLATFORM), recipient_id, amount_cents, percentage
gift_cards               — id, dropzone_id, code (unique), initial_value_cents, remaining_value_cents, purchased_by (FK?), redeemed_by (FK?), expires_at?
event_outbox             — id, event_type, aggregate_type, aggregate_id, tenant_id, payload (JSON), metadata (JSON), status (PENDING|PUBLISHED|FAILED), retry_count, published_at?, created_at
                           CRITICAL: Written in SAME MySQL TX as business data
stripe_accounts          — id, user_id (FK), dropzone_id (FK), stripe_account_id (unique), account_type, charges_enabled, payouts_enabled
```

### DOMAIN 8: Bookings (2 tables)
```
booking_packages         — id, dropzone_id (FK), name, activity_type, description, price_cents, currency, includes (JSON), is_active
bookings                 — id, uuid, dropzone_id (FK), user_id (FK), package_id (FK?), booking_type, scheduled_date, scheduled_time, status (PENDING|CONFIRMED|CHECKED_IN|COMPLETED|CANCELLED|NO_SHOW|EXPIRED), payment_intent_id?, notes, created_at, updated_at
```

### DOMAIN 9: Notifications (4 tables)
```
notification_templates   — id, dropzone_id?, event_type, channel, locale, subject, body, variables (JSON), is_active
notifications            — id, user_id (FK), dropzone_id, type, channel, title, body, data (JSON), status (PENDING|SENT|DELIVERED|FAILED|READ), sent_at?, read_at?
notification_deliveries  — id, notification_id (FK), channel, provider_message_id?, status, attempts, last_attempt_at?, delivered_at?, failure_reason?
webhooks                 — id, dropzone_id (FK), url, events (JSON), secret, is_active, last_triggered_at?, fail_count
```

### DOMAIN 10: Safety & Emergency (5 tables)
```
emergency_profiles       — id, user_id (FK unique), blood_type, allergies, medications, medical_conditions, weight_lbs, height_in, insurance_provider, insurance_number, physician_name, physician_phone, primary_contact_name, primary_contact_phone, primary_contact_relation, secondary_contact_name?, secondary_contact_phone?, hospital_preference, special_instructions
incidents                — id, uuid, dropzone_id (FK), reported_by_id (FK), load_id (FK?), severity (NEAR_MISS|MINOR|MODERATE|SERIOUS|FATAL), status (REPORTED|INVESTIGATING|RESOLVED|CLOSED), category, title, description, location, weather_at_time (JSON), created_at, updated_at
incident_involved_parties — id, incident_id (FK), user_id (FK?), role_in_incident, gear_item_id (FK?), notes
risk_assessments         — id, dropzone_id (FK), assessed_by (FK), wind_score, visibility_score, precipitation_score, landing_area_score, hazard_score, composite_score, risk_level (LOW|MODERATE|ELEVATED|HIGH|EXTREME), notes, valid_until, superseded_by (FK self?), created_at
local_hospitals          — id, dropzone_id (FK), name, address, phone, trauma_level, distance_miles, has_helipad, specialties (JSON), is_primary
```

### DOMAIN 11: Instructor & Coaching (8 tables)
```
instructor_skill_types   — id, name (TANDEM|AFF|OVERWEIGHT|HANDICAP|CAMERA|FREEFLY|WINGSUIT|COACH), description, renewal_period_months
instructor_skills        — id, user_id (FK), skill_type_id (FK), certified_at, expires_at, rating?, verified_by?
                           UNIQUE(user_id, skill_type_id)
coaching_types           — id, name, description, min_experience_jumps, default_price_cents
coaching_sessions        — id, dropzone_id (FK), coaching_type_id (FK), instructor_id (FK), load_id (FK?), status, notes, price_cents, created_at
coaching_session_participants — id, session_id (FK), user_id (FK), evaluation_notes?, passed?
instructor_availability  — id, user_id (FK), dropzone_id (FK), day_of_week, start_time, end_time, is_recurring, specific_date?, employment_type (FULL_TIME|PART_TIME|FREELANCE|SEASONAL)
instructor_assignments   — id, load_id (FK), instructor_id (FK), student_id (FK?), assignment_type, score, created_at
booking_requests         — id, booking_id (FK), instructor_id (FK?), status (PENDING|ACCEPTED|DECLINED|EXPIRED|CANCELLED), response_deadline, created_at
```

### DOMAIN 12: Weather & AI (3 tables)
```
weather_data             — id, dropzone_id (FK), temperature_f, wind_speed_kts, wind_gust_kts, wind_direction, visibility_miles, cloud_cover_pct, pressure_hpa, precipitation_mm, jumpability_score, weather_status (VFR|MVFR|IFR|LIFR), fetched_at
weather_holds            — id, dropzone_id (FK), activated_by (FK), reason, wind_at_activation, released_by (FK?), activated_at, released_at?
ai_insights              — id, dropzone_id (FK), insight_type, priority (LOW|MEDIUM|HIGH|CRITICAL), title, description, data (JSON), acknowledged_by?, created_at
```

### DOMAIN 13: Reporting (3 tables)
```
report_dashboards        — id, user_id (FK), dropzone_id (FK), name, layout (JSON), is_default, is_shared
report_blocks            — id, dashboard_id (FK), block_type (KPI_CARD|LINE_CHART|BAR_CHART|PIE_CHART|DATA_TABLE|HEATMAP|FUNNEL), title, data_source, query (JSON), position (JSON), size (JSON), config (JSON)
daily_revenue_summary    — id, dropzone_id (FK), date, booking_count, gross_revenue_cents, net_revenue_cents, tax_cents, commission_cents, by_activity_type (JSON)
```

### DOMAIN 14: Audit & Sync (2 tables)
```
audit_logs               — id, user_id, dropzone_id, action, entity_type, entity_id, before_state (JSON), after_state (JSON), ip_address, user_agent, checksum_sha256, created_at
                           APPEND-ONLY, NEVER UPDATE/DELETE
sync_outbox              — id, device_id, user_id, dropzone_id, action, entity_type, entity_id, payload (JSON), idempotency_key (unique), status (PENDING|SYNCED|CONFLICT|FAILED), conflict_data (JSON?), created_at, synced_at?
```

### Localization (MVP: config-only, no DB tables)
For MVP, localization is handled via `dz_locale_settings` + frontend i18n files. Full DB-backed translation system is post-MVP.

### Story & Social (Post-MVP)
Tables: social_posts, social_comments, social_reactions, follows, achievements, athlete_achievements, media_uploads, media_tags, athlete_stories, athlete_milestones, activity_feed

### Shop & Marketplace (Post-MVP)
Tables: shop_products, shop_inventory, shop_orders, shop_order_items

**TOTAL MVP TABLES: 63** (excluding story, social, shop, localization DB tables)
**TOTAL WITH POST-MVP: 75+**

---

## 4. FINAL ENUM SET

```
LoadStatus:     OPEN, FILLING, LOCKED, THIRTY_MIN, TWENTY_MIN, TEN_MIN, BOARDING, AIRBORNE, LANDED, COMPLETE, CANCELLED
SlotType:       FUN, TANDEM_PASSENGER, TANDEM_INSTRUCTOR, AFF_STUDENT, AFF_INSTRUCTOR, COACH, CAMERA, WINGSUIT, HOP_N_POP, CRW
SlotStatus:     MANIFESTED, CHECKED_IN, BOARDING, JUMPED, NO_SHOW, CANCELLED
JumpType:       TANDEM, AFF, FUN_JUMP, COACH, HOP_POP, NIGHT, WINGSUIT, CRW
LicenseLevel:   A, B, C, D, STUDENT, NONE
GearType:       CONTAINER, MAIN, RESERVE, AAD, HELMET, ALTIMETER, SUIT
GearStatus:     ACTIVE, GROUNDED, RETIRED, IN_REPAIR
GearCheckResult: PASS, FAIL, GROUNDED
CgResult:       PASS, FAIL, MARGINAL
TransactionType: TICKET_PURCHASE, BOOKING, RENTAL, SHOP, REFUND, CREDIT, PAYOUT, FEE
TransactionStatus: PENDING, CAPTURED, SETTLED, REFUNDED
BookingStatus:  PENDING, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW, EXPIRED
IncidentSeverity: NEAR_MISS, MINOR, MODERATE, SERIOUS, FATAL
IncidentCategory: NEAR_MISS, INJURY, MALFUNCTION, FATALITY, PROPERTY_DAMAGE, ADMINISTRATIVE
IncidentStatus: REPORTED, INVESTIGATING, RESOLVED, CLOSED
RiskLevel:      LOW, MODERATE, ELEVATED, HIGH, EXTREME
WeatherStatus:  VFR, MVFR, IFR, LIFR
AircraftStatus: ACTIVE, MX_HOLD, RETIRED
UserStatus:     ACTIVE, INACTIVE, SUSPENDED, DELETED
WaiverType:     TANDEM, AFF, EXPERIENCED, MINOR, SPECTATOR, MEDIA
VerificationMethod: SELF_REPORTED, STAFF_VISUAL, STAFF_ENTRY, PHOTO_UPLOAD, FUTURE_API
InstructorSkillType: TANDEM, AFF, OVERWEIGHT, HANDICAP, CAMERA, FREEFLY, WINGSUIT, COACH
EmploymentType: FULL_TIME, PART_TIME, FREELANCE, SEASONAL
NotificationType: LOAD_READY, LOAD_BOARDING, LOAD_DEPARTURE, CALL_30MIN, CALL_20MIN, CALL_10MIN, SLOT_ASSIGNMENT, PAYMENT_RECEIVED, PAYMENT_FAILED, INSTRUCTOR_ASSIGNMENT, WEATHER_WARNING, WEATHER_HOLD, EMERGENCY_ALERT, BOOKING_CONFIRMATION, BOOKING_CANCELLED, WAIVER_REQUIRED, GEAR_CHECK_FAILED, REPACK_DUE, AAD_EXPIRING, INCIDENT_REPORTED, ANNOUNCEMENT
NotificationChannel: IN_APP, PUSH, SMS, EMAIL, WHATSAPP
NotificationPriority: CRITICAL, HIGH, MEDIUM, LOW
AuditAction:    CREATE, UPDATE, DELETE, LOGIN, LOGOUT, PAYMENT, REFUND, ROLE_GRANT, ROLE_REVOKE, INCIDENT_REPORT, GEAR_CHECK, WAIVER_SIGN, LOAD_CREATE, LOAD_CANCEL, LOAD_DEPART, SLOT_ASSIGN, SLOT_CANCEL, EMERGENCY_ACTIVATE, CG_CHECK, CG_OVERRIDE, OVERRIDE
SyncStatus:     PENDING, SYNCED, CONFLICT, FAILED
EventOutboxStatus: PENDING, PUBLISHED, FAILED
DzPlan:         STARTER, PRO, ENTERPRISE
```

---

## 5. FINAL API SURFACE

### URL Pattern: `/api/v1/dz/:dzId/{resource}` for DZ-scoped, `/api/v1/{resource}` for global

### Auth (8 endpoints)
```
POST   /api/v1/auth/register            — No auth, 10/min
POST   /api/v1/auth/login               — No auth, 100/min
POST   /api/v1/auth/refresh             — No auth, 500/min
POST   /api/v1/auth/logout              — JWT required
POST   /api/v1/auth/forgot-password     — No auth, 5/min
POST   /api/v1/auth/reset-password      — No auth, 10/min
POST   /api/v1/auth/mfa/setup           — JWT required
POST   /api/v1/auth/mfa/verify          — JWT required
```

### Identity (8 endpoints)
```
GET    /api/v1/jumpers/me               — JWT (any role)
PATCH  /api/v1/jumpers/me               — JWT (any role)
GET    /api/v1/jumpers/:jumperId        — JWT (MANIFEST_STAFF+)
GET    /api/v1/jumpers/:jumperId/logbook — JWT (self or MANIFEST_STAFF+)
POST   /api/v1/jumpers/:jumperId/checkin — JWT (MANIFEST_STAFF+)
GET    /api/v1/jumpers/:jumperId/emergency-profile — JWT (MANIFEST_STAFF+ or EMERGENCY)
GET    /api/v1/jumpers/:jumperId/compliance — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/jumpers         — JWT (MANIFEST_STAFF+), search/filter
```

### Manifest (12 endpoints) — CRITICAL PATH
```
GET    /api/v1/dz/:dzId/loads           — JWT (any DZ role), filter by status/date
POST   /api/v1/dz/:dzId/loads           — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/loads/:loadId   — JWT (any DZ role)
PATCH  /api/v1/dz/:dzId/loads/:loadId   — JWT (MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/loads/:loadId/transition — JWT (MANIFEST_STAFF+), body: {toStatus}
POST   /api/v1/dz/:dzId/loads/:loadId/slots — JWT (MANIFEST_STAFF+ or self-manifest ATHLETE)
DELETE /api/v1/dz/:dzId/loads/:loadId/slots/:slotId — JWT (MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/loads/:loadId/manifest-group — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/loads/:loadId/cg — JWT (MANIFEST_STAFF+, PILOT)
POST   /api/v1/dz/:dzId/loads/:loadId/cg-check — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/loads/:loadId/exit-order — JWT (any DZ role)
POST   /api/v1/dz/:dzId/waitlist        — JWT (ATHLETE+)
```

### Training (10 endpoints)
```
GET    /api/v1/dz/:dzId/instructors     — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/instructors/available — JWT (MANIFEST_STAFF+), query: date, skill
POST   /api/v1/dz/:dzId/instructor-assignments — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/training/aff/:studentId — JWT (AFFI, MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/training/aff/:studentId/evaluate — JWT (AFFI)
GET    /api/v1/dz/:dzId/training/coaching-types — JWT (any DZ role)
POST   /api/v1/dz/:dzId/training/coaching-sessions — JWT (COACH, MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/training/coaching-sessions/:id — JWT (participant or MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/booking-requests — JWT (ATHLETE+)
PATCH  /api/v1/dz/:dzId/booking-requests/:id — JWT (instructor assigned)
```

### Booking (6 endpoints)
```
GET    /api/v1/dz/:dzId/booking-packages — No auth (public)
POST   /api/v1/dz/:dzId/bookings       — JWT (any)
GET    /api/v1/dz/:dzId/bookings/:id    — JWT (self or MANIFEST_STAFF+)
PATCH  /api/v1/dz/:dzId/bookings/:id    — JWT (MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/bookings/:id/pay — JWT (self)
POST   /api/v1/dz/:dzId/bookings/:id/refund — JWT (MANIFEST_STAFF+ with limits)
```

### Payments (8 endpoints)
```
GET    /api/v1/dz/:dzId/wallet          — JWT (self)
POST   /api/v1/dz/:dzId/wallet/topup    — JWT (self)
GET    /api/v1/dz/:dzId/transactions    — JWT (self or DZ_MANAGER+)
POST   /api/v1/dz/:dzId/payments/intent — JWT (self)
GET    /api/v1/dz/:dzId/jump-tickets    — JWT (self)
POST   /api/v1/dz/:dzId/jump-tickets/purchase — JWT (self)
POST   /api/v1/dz/:dzId/jump-tickets/redeem — JWT (MANIFEST_STAFF+)
POST   /api/v1/webhooks/stripe          — Stripe signature verification
```

### Gear (7 endpoints)
```
GET    /api/v1/dz/:dzId/gear            — JWT (RIGGER, MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/gear            — JWT (RIGGER, DZ_MANAGER+)
POST   /api/v1/dz/:dzId/gear/:id/check  — JWT (RIGGER)
GET    /api/v1/dz/:dzId/gear/:id/history — JWT (RIGGER, MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/gear/:id/assign — JWT (MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/gear/:id/return — JWT (MANIFEST_STAFF+)
GET    /api/v1/dz/:dzId/gear/repack-queue — JWT (RIGGER)
```

### Safety (6 endpoints)
```
POST   /api/v1/dz/:dzId/incidents       — JWT (any DZ role)
GET    /api/v1/dz/:dzId/incidents       — JWT (RIGGER, DZ_MANAGER+)
PATCH  /api/v1/dz/:dzId/incidents/:id   — JWT (DZ_MANAGER+)
POST   /api/v1/dz/:dzId/emergency/activate — JWT (MANIFEST_STAFF+)
POST   /api/v1/dz/:dzId/emergency/deactivate — JWT (DZ_MANAGER+)
POST   /api/v1/dz/:dzId/risk-assessments — JWT (DZ_MANAGER+)
```

### Weather (3 endpoints)
```
GET    /api/v1/dz/:dzId/weather         — JWT (any DZ role)
GET    /api/v1/dz/:dzId/weather/forecast — JWT (any DZ role)
POST   /api/v1/dz/:dzId/weather/hold    — JWT (DZ_MANAGER+)
```

### Notifications (5 endpoints)
```
GET    /api/v1/notifications            — JWT (self)
PATCH  /api/v1/notifications/:id/read   — JWT (self)
POST   /api/v1/dz/:dzId/notifications/broadcast — JWT (DZ_MANAGER+)
GET    /api/v1/notifications/preferences — JWT (self)
PATCH  /api/v1/notifications/preferences — JWT (self)
```

### Reports (4 endpoints)
```
GET    /api/v1/dz/:dzId/reports/summary — JWT (DZ_MANAGER+)
GET    /api/v1/dz/:dzId/reports/:type   — JWT (DZ_MANAGER+), type: revenue|loads|athletes|incidents
GET    /api/v1/dz/:dzId/reports/export/:type — JWT (DZ_MANAGER+), format: csv|xlsx
GET    /api/v1/dz/:dzId/audit-logs      — JWT (DZ_OWNER+)
```

### Admin (5 endpoints)
```
GET    /api/v1/admin/dropzones          — JWT (PLATFORM_ADMIN)
PATCH  /api/v1/dz/:dzId/settings       — JWT (DZ_OWNER+)
GET    /api/v1/dz/:dzId/staff           — JWT (DZ_MANAGER+)
POST   /api/v1/dz/:dzId/staff/invite    — JWT (DZ_MANAGER+)
GET    /api/v1/admin/system-health      — JWT (PLATFORM_ADMIN)
```

**TOTAL: ~82 endpoints for MVP**

---

## 6. FINAL DASHBOARD/SCREEN INVENTORY

### Auth Screens (5)
- Login, Register, Forgot Password, Reset Password, MFA Challenge

### DZ Operator Dashboard (1 home + 4 sub-screens)
- Home: Revenue KPIs, Active Loads mini-board, Weather, Staff Status, AI Insights
- Staff Management, Aircraft Management, Settings, Audit Logs

### Manifest Staff Dashboard (1 home + 3 sub-screens)
- Home: Load Board Grid (real-time, drag-drop), CG Calculator modal
- Check-In Queue (8-point compliance grid), Waitlist, Load History

### Instructor Dashboard (1 home + 3 sub-screens)
- Home: My Students Today, Schedule Timeline, Quick Eval
- Student Progression (AFF L1-8), Earnings, Availability Settings

### Pilot Dashboard (1 home + 1 sub-screen)
- Home: My Loads with CG Sheet, Boarding Confirm button
- Flight Log

### Rigger Dashboard (1 home + 2 sub-screens)
- Home: Gear Inventory with status filters
- Repack Queue (sorted by due date), Inspection Log

### Athlete Dashboard (1 home + 5 sub-screens)
- Home: Active Load Board, Announcements, Quick Self-Manifest
- Digital Logbook, Wallet, Gear Summary, Profile/Settings, Bookings

### Student Dashboard (1 home + 2 sub-screens)
- Home: AFF Progress Tracker, Next Training Jump, Onboarding
- Book Training, Safety Resources

### Platform Admin Dashboard (1 home + 3 sub-screens)
- Home: Network KPIs, DZ Fleet Table, Revenue by DZ
- System Health, Feature Flags, Billing

### Shared Screens (8)
- Notifications Center, Weather Board, Incident Report (new), Help Center, Profile, Emergency (offline-accessible), End-of-Day Reconciliation, Gift Cards

**TOTAL: ~45 screens**

---

## 7. FINAL SAFETY RULE SET

### Blocking Gates (HARD — Cannot Be Bypassed Without Override + Audit)

| Gate | Checks | Blocks | Override |
|------|--------|--------|---------|
| **CG Gate** | cg_checks.result = PASS for load_id | LOCKED → THIRTY_MIN | DZ_OWNER only + mandatory reason + audit |
| **License Gate** | licenses.expires_at > now() for user | Slot assignment | DZ_MANAGER + audit |
| **Currency Gate** | last_jump within currency window (A/B=60d, C=90d, D=180d, Student=30d) | Slot assignment | DZ_MANAGER + audit |
| **Waiver Gate** | waiver_signatures exists for current version | Slot assignment + Check-in | No override |
| **Gear Check Gate** | gear_checks.result = PASS within 24 hours | Slot assignment | RIGGER + audit |
| **Reserve Repack Gate** | gear_items.next_repack_due > now() | Gear assignment to load | DZ_OWNER only + documented reason |
| **AAD Gate** | gear_items.aad_service_due > now() AND aad_lifecycle_expiry > now() | Gear assignment to load | DZ_OWNER only |
| **Weight Gate** | slot.weight ≤ DZ-configured limit per activity | Slot assignment | MANIFEST_STAFF (advisory within 10 lbs) |
| **Pilot Duty Gate** | pilot flight_hours < 8/day, duty < 14/day, rest > 10h | Load assignment | No override |
| **Aircraft Airworthiness** | All certs current, maintenance not overdue | Load creation | No override |

### Advisory Gates (WARN — Logged but not blocked)
- Weather approaching DZ wind limits (within 3 knots)
- Instructor workload > 4 consecutive loads (fatigue flag)
- Jump ticket balance < 2 remaining

---

## 8. FINAL MVP SCOPE vs POST-MVP

### MVP (Phases 3-7 Implementation)
- ✅ Auth: JWT + passkeys + MFA + OAuth stub
- ✅ RBAC: 10 roles, per-DZ scoping, hierarchy
- ✅ Manifest: 11-state FSM, slot assignment, CG blocking gate, exit order, waitlist
- ✅ Check-In: 8-point compliance grid, QR scan
- ✅ Training: AFF L1-8, instructor skills, assignments, coaching sessions
- ✅ Booking: Online tandem/AFF booking, packages
- ✅ Payments: Wallet, jump tickets, Stripe Connect, commission splits, event outbox
- ✅ Gear: Inventory, checks, repack tracking, AAD monitoring, rentals
- ✅ Safety: Emergency profiles, incidents, risk assessments
- ✅ Weather: External API, holds, jumpability score
- ✅ Notifications: In-app + push, call times, safety alerts
- ✅ Reports: Revenue, loads, athletes, incidents, EOD reconciliation
- ✅ Offline: IndexedDB for Tier 1 ops, sync outbox, conflict resolution
- ✅ Aircraft: Registry, status, CG envelope data
- ✅ Platform: Multi-DZ, branches, settings, audit logs
- ✅ Role Dashboards: All 8 role-specific home screens

### Post-MVP
- 🔜 Story/Social: Athlete timeline, milestones, achievements, feed
- 🔜 Shop/Marketplace: DZ gear store, inventory, orders
- 🔜 Localization DB: Full translation system (15 languages, RTL)
- 🔜 AI Intelligence: Load optimizer, risk engine, predictive scheduling
- 🔜 P2P Slot Resale: Transfer workflow with anti-scalping
- 🔜 Media Sales: Photo/video packages, delivery
- 🔜 React Native Mobile: WatermelonDB offline
- 🔜 Migration Tool: Burble/ManifestPro ETL
- 🔜 Advanced Reporting: ClickHouse, nightly aggregation
- 🔜 Federation: Cross-DZ identity, global marketplace

---

## 9. FINAL NAMING STANDARDS

### Database
- Tables: `snake_case`, plural (`loads`, `gear_items`)
- Columns: `snake_case` (`first_name`, `created_at`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `load_id`)
- Indexes: `idx_{table}_{columns}` (`idx_loads_dropzone_status`)
- Enums: `PascalCase` in Prisma, stored as strings

### API
- URL: `/api/v1/dz/:dzId/{resource}` (kebab-case for multi-word resources)
- Response: `{ success: boolean, data: T, error?: { code: string, message: string }, meta?: { page, total } }`
- Error codes: 5-digit (`40100` = invalid credentials, `40301` = insufficient role)

### TypeScript
- Files: `camelCase.ts` for services/utils, `PascalCase.tsx` for components
- Types/Interfaces: `PascalCase` (`LoadStatus`, `SlotType`)
- Functions: `camelCase` (`validateCgGate`, `assignSlot`)
- Constants: `UPPER_SNAKE_CASE` (`CG_LIMITS`, `WIND_LIMITS`)

### Events
- Format: `{domain}.{entity}.{action}` (`manifest.load.status_changed`, `payments.transaction.captured`)
- Payload: `{ eventId, eventType, aggregateId, aggregateType, tenantId, payload, metadata: { userId, timestamp, correlationId } }`

---

## 10. FINAL EVENT STANDARDS

### Event Channels
| Channel | Transport | Guarantee | Use Case |
|---------|-----------|-----------|----------|
| **financial** | Transactional Outbox → process | At-least-once, ordered | payment.captured, refund.issued, payout.completed |
| **manifest** | In-process EventBus | At-least-once | load.status_changed, slot.added, cg.checked |
| **safety** | In-process EventBus (high priority) | At-least-once | emergency.activated, incident.reported |
| **ui** | WebSocket broadcast | Best-effort | Real-time dashboard updates |

### MVP Event Transport (Simplified)
For MVP, we use **in-process TypeScript EventBus** (not Redis Streams) with the `event_outbox` table for financial durability. A simple polling relay processes outbox entries. Redis Streams can be added post-MVP for scale.

### Critical Event: `payment.captured`
1. Business logic writes Transaction row + event_outbox row in SAME MySQL transaction
2. Relay polls event_outbox every 500ms
3. Publishes to in-process EventBus
4. Marks event_outbox row as PUBLISHED
5. If handler fails 5 times → status = FAILED, alert triggered

---

## 11. FINAL OFFLINE/SYNC STRATEGY

### Tier Classification
| Tier | Operations | Offline Behavior |
|------|-----------|-----------------|
| **Tier 1 (Never Fail)** | Load board view, slot add/remove, check-in, instructor assignment, load transitions, emergency profiles, incident capture | Full offline with IndexedDB. Queue mutations in sync_outbox. Sync within 30s of reconnect. |
| **Tier 2 (Should Continue)** | Gear checks, QR scan, payment intent capture, boarding confirmation, local announcements | Best-effort offline. Cache reads. Queue writes. |
| **Tier 3 (Can Defer)** | Card settlement, analytics refresh, remote notifications, cross-DZ sync, report generation | Online-only. Show "unavailable offline" message. |

### Conflict Resolution
| Data Type | Strategy | Reason |
|-----------|----------|--------|
| Financial (transactions, payments) | **Server Wins** | Money must be authoritative |
| Manifest (slots, loads) | **Last-Write-Wins** with timestamp | Operational speed > perfect consistency |
| User data (profiles, notes) | **Last-Write-Wins** | Low conflict probability |
| Safety (incidents, emergency) | **Server Wins** | Legal compliance |

### IndexedDB Stores (Web PWA)
```
loads, slots, users, gear_checks, sync_outbox, emergency_profiles, weather_cache
```

### Sync Protocol
1. Client writes to IndexedDB + sync_outbox with idempotency_key (UUID)
2. On reconnect: POST /api/v1/sync/push with batch of outbox entries
3. Server processes with idempotency check (skip if key exists)
4. Server responds with conflicts (if any)
5. Client pulls: GET /api/v1/sync/pull?since={lastSyncTimestamp}
6. Client applies server state, resolves conflicts per strategy above

---

## 12. FILES TO CHANGE IN SUBSEQUENT PHASES

### Phase 3 — Foundation
```
UPDATE: prisma/schema.prisma (new enums, extend User, add athletes table, add missing auth tables)
UPDATE: apps/api/src/middleware/authorize.ts (permission format, safety tiers)
UPDATE: apps/api/src/services/auditService.ts (checksum, append-only enforcement)
UPDATE: packages/types/src/index.ts (canonical enums and types)
UPDATE: packages/config/src/index.ts (safety rules, FSM transitions with timer states)
CREATE: apps/api/src/services/permissionService.ts
```

### Phase 4 — Core Ops
```
UPDATE: prisma/schema.prisma (cg_checks, waitlist_entries, load_notes, athletes, licenses, currency_checks, logbook_entries, exit order fields)
UPDATE: apps/api/src/services/loadFsm.ts (11 states, CG gate, timer transitions)
UPDATE: apps/api/src/services/cgCalculator.ts (wire to FSM, aircraft-specific limits)
UPDATE: apps/api/src/services/validationGates.ts (license, currency, weight, full 8-point)
CREATE: apps/api/src/services/exitOrderAlgorithm.ts
CREATE: apps/api/src/routes/training.ts
CREATE: apps/api/src/routes/booking.ts
UPDATE: apps/api/src/routes/manifest.ts (CG endpoint, transition endpoint, exit order)
UPDATE: apps/api/src/routes/identity.ts (logbook, license, compliance, currency)
UPDATE: apps/web/src/app/dashboard/page.tsx (role-based rendering)
CREATE: apps/web/src/app/dashboard/load-board/page.tsx (real-time grid)
UPDATE: apps/web/src/app/dashboard/checkin/page.tsx (8-point compliance grid)
UPDATE: apps/web/src/app/dashboard/manifest/[loadId]/page.tsx (CG modal, exit order, timer)
```

### Phase 5 — Aviation + Gear + Training
```
UPDATE: prisma/schema.prisma (instructor tables, coaching tables, gear_rentals, risk_assessments, etc.)
UPDATE: apps/api/src/routes/gear.ts (repack queue, rental, AAD alerts)
CREATE: apps/api/src/services/instructorMatcher.ts
CREATE: apps/api/src/services/currencyEngine.ts
UPDATE: apps/web/src/app/dashboard/pilot/page.tsx (CG sheet, flight log)
CREATE: apps/web/src/app/dashboard/instructor/page.tsx
CREATE: apps/web/src/app/dashboard/training/page.tsx
UPDATE: apps/web/src/app/dashboard/gear/page.tsx (repack queue, rentals)
```

### Phase 6 — Payments + Notifications + Reporting + Offline
```
UPDATE: prisma/schema.prisma (event_outbox, booking_packages, bookings, daily summaries)
CREATE: apps/api/src/services/eventOutboxRelay.ts
CREATE: apps/api/src/services/bookingService.ts
UPDATE: apps/api/src/services/notificationService.ts (call times, fatigue budget)
UPDATE: apps/api/src/routes/payments.ts (jump tickets, commission splits)
CREATE: apps/api/src/routes/booking.ts
UPDATE: apps/web/src/app/dashboard/wallet/page.tsx (real data)
UPDATE: apps/web/src/app/dashboard/reports/page.tsx (real queries)
UPDATE: apps/web/src/app/dashboard/end-of-day/page.tsx (reconciliation)
UPDATE: apps/web/src/lib/syncEngine.ts (tier classification, conflict resolution)
UPDATE: prisma/seed.ts (all new models)
```

### Phase 7 — Hardening
```
All files: naming consistency pass
All routes: validation + error code standardization
All pages: loading/error/empty state completeness
prisma/seed.ts: full demo scenario per role
All services: audit logging completeness
```

---

## END OF CANONICAL TRUTH

This document is the SINGLE SOURCE OF TRUTH for all implementation decisions.
When the codebase conflicts with this document, this document wins.
When a design doc conflicts with this document, this document wins (it already reconciled all 21 docs).

**Status: CANONICAL TRUTH COMPLETE. Awaiting approval to proceed to Phase 3 (Foundation Implementation).**
