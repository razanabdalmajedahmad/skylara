# SKYLARA

_Source: 17_Production_Scale.docx_

SKYLARA
Production Readiness & Scale
Steps 41–45  |  Migration • Resilience • Design System • Documentation • Federation
Version 1.0  |  April 2026  |  Brutally Honest Edition
Legacy Import • Circuit Breakers • Component Library • Onboarding • Multi-DZ Network
# Table of Contents
# CHAPTER 41: DATA MIGRATION & LEGACY SYSTEM IMPORT
## 41.1 Migration Architecture Overview
SkyLara’s migration strategy acknowledges a critical reality: dropzones operate on fragmented legacy systems. The platform must ingest data from Burble (the market leader), Manifest Pro, DropZone.com, spreadsheets, and physical logbooks. Migration is designed as a one-time bulk import with optional ongoing sync, though the latter remains experimental.
The ETL pipeline (Extract-Transform-Load) is the spine of this strategy. Data flows through three stages: extraction from source systems, transformation to SkyLara’s 75-table schema, and validation before loading into production. Each stage includes rollback capability and audit trails.
Data quality is the hidden cost. Every dropzone’s database is corrupted in unique ways: duplicate jumpers, license number formatting variations, impossible jump counts, and contradictory timestamps. Plan for manual intervention.
## 41.2 Source System Analysis
Burble is the gatekeeping system. As the market leader, convincing them to export data is non-trivial. Most Burble customers will negotiate an export as part of migration, but the format is proprietary and requires reverse engineering.
Manifest Pro systems run on legacy flat files. Parsing is brittle; each file format variant requires custom logic. Manifest Pro no longer updates, so file formats are frozen, but support is gone.
DropZone.com is a community platform with public profiles. Data extraction is possible via web scraping or API, but privacy norms limit what you can access without consent. Use only public data.
## 41.3 Migration Data Mapping
The 75-table SkyLara schema is foreign to legacy systems. Mapping requires field-by-field translation. Core entities—jumpers, loads, instructors, aircraft, gear—have clear mappings. Secondary entities—waivers, photos, emergency contacts, payment methods—have gaps.
Handling missing fields requires defaults and null-safety. License numbers that can’t be verified become null; jump counts default to the source value (even if wrong); aircraft missing max capacity default to 20 jumpers. Document every default.
## 41.4 Data Extraction Strategies
CSV export is the lowest common denominator. Most systems support it. Write a generic CSV parser that handles quoted fields, escaped commas, and UTF-8 encoding. Validate schema before processing.
Burble may provide API access for large migrations. If available, use pagination and respect rate limits. Cache API responses locally for replay during development.
Direct database access is possible if the dropzone provides credentials. Use read-only connections. Query only production databases; avoid replicas to reduce load. This is fastest but requires trust.
Manual data entry tools are essential for small datasets or paper records. Build a simple admin UI that accepts jumper records, validates in real-time, and batches inserts. Expect 2-4 weeks of manual work per small DZ.
OCR for paper logbooks is experimental and fragile. Character recognition on handwriting has high error rates. Use OCR as a starting point; human review is mandatory.
## 41.5 Data Transformation & Cleaning
Normalization is tedious but necessary. Trim whitespace, capitalize names consistently, deduplicate records by (name, DOB, license). Run fuzzy matching on jumper names to catch misspellings and aliases.
License numbers have no standard format. Burble uses one format, Manifest Pro uses another, and paper logbooks are freetext. Normalize by removing punctuation, converting to uppercase, and validating against the FAA/USPA database if available. Mark unverified licenses as suspect.
Geocoding addresses enables location-aware features. Use Google Maps API or similar to convert address strings to (lat, lng). Fall back to null if geocoding fails; don’t guess.
Phone numbers vary in format. Normalize to E.164 (e.g., +1-555-123-4567). Validate against country codes.
Currency conversion for historical records: if a DZ operates in multiple currencies, convert historical transaction amounts to a base currency using historical exchange rates. This is non-trivial; use a rates API.
Merging duplicate jumpers is the hardest problem. A jumper might appear twice with name variations ("Bob" vs "Robert"), license formats ("USPA-123" vs "123"), or typos. Use fuzzy matching on name + license + DOB. Manual review is essential; auto-merge only high-confidence matches (>95%).
## 41.6 Data Loading & Validation
Staged loading reduces risk. Load into staging tables first, validate there, then promote to production. This allows rollback at any point.
Referential integrity is critical. When you import a load that references an aircraft, that aircraft must exist in production. Map source system IDs to SkyLara IDs using a lookup table built during extraction.
Foreign key resolution: source system IDs are meaningless in SkyLara. Before loading, build a map: source aircraft ID → SkyLara aircraft_id. If the target aircraft doesn’t exist, either create it or fail the record.
Rollback capability is non-negotiable. Tag every imported record with batch_id. To rollback, delete all records with that batch_id. Implement soft deletes if hard deletes conflict with foreign keys.
Post-migration validation: run queries to check jump counts, account balances, waiver counts. Compare source totals to SkyLara totals. Flag discrepancies.
## 41.7 Jumper Profile Migration
Jumper profiles are the most sensitive migration asset. License verification is mandatory. Before importing, verify each license with USPA or equivalent authority. Unverified licenses remain suspended until manual review.
Jump count validation: self-reported counts in source systems are often inflated. Cross-reference against load records. If self-reported count exceeds system-recorded count by > 50 jumps, flag for review. Store both: verified_count (from loads) and self_reported_count (from legacy system).
Emergency contacts must be migrated carefully. Privacy concerns: verify that contacts have consented to being in the system. If unavailable, ask jumpers to re-enter on first login.
Waiver history: waivers are legal documents. You cannot simply import old waivers; they may reference outdated liability language. Archive old waivers for audit; require all jumpers to sign current waivers on first login.
Media/photos: old profile photos may violate current privacy rules. Import photos only with explicit consent. Use a flag: photo_imported_legacy=true, allow jumpers to replace immediately.
## 41.8 Financial Data Migration
Historical transactions are important for audit trails but don’t drive operations. Import them as read-only records. Set transaction_source = "legacy_import" to distinguish from live transactions.
Account balances: if a DZ tracked credits or prepaid jump tickets, import the balance as of cutover date. Set balance_verified=false; require manual reconciliation. A $50 discrepancy is likely data corruption, not a real issue.
Credit migration: if a jumper had store credit in the old system, convert to SkyLara credit with a note: "Imported from legacy system on [date]. Not yet verified.”
Stripe account linking: if the DZ already uses Stripe, import Stripe customer IDs if available. Map old payment methods to Stripe payment method IDs. Do not import credit card data; Stripe handles that.
Reconciliation: run a final audit comparing source database totals (sum of transactions, account balances, credit) with SkyLara totals. Publish a reconciliation report. A small discrepancy (<1%) is normal and acceptable.
## 41.9 Migration Tools & Admin UI
The DZ admin migration wizard is a self-service import tool. Dropzone admins upload CSV files, map fields visually, preview the import, and commit. This enables migrations without developer intervention.
Field mapping UI is critical for usability. Show source columns from the CSV alongside SkyLara target columns. Use drag/drop or dropdown selection. Save mapping as a reusable config for future imports.
Preview mode must show transformed data, not raw data. Display the first 50 rows after normalization, geocoding, and dedupe. Highlight errors in red. This gives DZ confidence before committing.
Error reports must be actionable. Instead of "invalid field,” say "email appears invalid (missing @). Is this a typo? Suggested: user@example.com." Link to raw row data for context.
## 41.10 Rollback & Recovery
Batch-level rollback: tag every imported record with batch_id. To undo an entire import, delete all records with that batch_id. This is safe as long as no new data references imported records.
Record-level correction: after import, DZ admins may need to fix individual records (typos, wrong aircraft). Allow inline editing with audit trail: who changed what, when.
Audit trail: log every migration action with timestamp and actor (system admin or DZ admin). Store audit logs separately; never delete them. Use for compliance and debugging.
Data lineage tracking: record the mapping between source ID and SkyLara ID for every record. If a jumper was imported from Burble as source_id=12345, store that mapping. If they ask, "Did you import my old jump count?" you can trace the source.
## 41.11 Brutal Honesty
Every dropzone’s data is corrupted in ways you can’t predict. Expect at least 5% invalid records. Plan for manual review of all edge cases.
Burble will not give you an API. They will give you a one-time export in a proprietary format that requires hours to parse. Build a strong relationship with their support team; they hold the keys.
Most dropzones will not use the migration wizard. They will say "just re-enter everything manually." Budget 2-4 weeks of staff time per small DZ, 4-8 weeks per large DZ. This is not optional.
Jump counts are always wrong. Source systems inflate them. Jumpers lie about their count. Load manifests are incomplete. Accept that verified_count will differ from self_reported_count by 10-20% on average.
License numbers have no standard format. USPA uses one standard, FAA uses another, and paper logbooks are freetext. You will spend days building regex patterns to parse them.
Paper logbooks are a lost cause for automation. OCR works 60% of the time. Human data entry is faster and more accurate. Deprecate paper logbooks as soon as SkyLara goes live.
The import wizard will be the most-used and most-hated feature. Dropzones will use it, complain about it constantly, and ask for custom field mappings. Plan for ongoing tweaks.
# CHAPTER 42: ERROR HANDLING, RECOVERY & RESILIENCE PATTERNS
## 42.1 Error Architecture Overview
Error handling is not an afterthought. SkyLara’s architecture separates errors into three categories: operational (expected failures), programmer (bugs), and external (third-party services). Each requires different handling.
Error propagation flows from source to boundary. Throw errors at the point of failure (database, API, validation). Catch errors at API boundaries and HTTP endpoints. Enrich context at each layer: add request ID, user ID, dropzone ID. Log with context.
Structured error logging enables debugging. Log errors as JSON with fields: timestamp, error_code, message, context (request ID, user, resource), stack trace. Index in a logging system; query by error code or user.
## 42.2 Error Classification System
SkyLara uses six error categories. Each maps to an HTTP status code and a user-facing message strategy.
Validation errors require user intervention. Do not retry; the user must fix their input.
Authentication and authorization errors require re-authentication or permission change. Do not retry automatically.
Business logic errors indicate state that won’t resolve by itself. Retrying is pointless. Show a user-facing message with next steps.
External service errors may be transient. Implement retry logic with exponential backoff.
System errors are ambiguous. Assume transient; retry once or twice. If it persists, escalate to support.
## 42.3 API Error Contract
Every API response includes a standard error contract. Success responses contain a data object; error responses contain an error object. Clients parse the error_code to decide behavior.
Field-level validation errors group in an array. If a jumper registration form has 3 invalid fields, return all 3 errors in one response.
Error codes are 5-digit: domain (2 digits) + specific error (3 digits). Domain 40X = client error, 50X = server error. This enables client-side routing.
i18n for error messages: error messages must be translatable. Store message templates in a locale file. The API returns a message_key (e.g., "error.load.capacity_exceeded"); the client translates using its locale.
## 42.4 Circuit Breaker Pattern
External dependencies—Stripe, Twilio, weather APIs—fail occasionally. A circuit breaker prevents cascading failures. When a service fails repeatedly, open the circuit and fail fast instead of timing out.
States: closed (healthy), open (failing), half-open (testing recovery). Closed → open on 5 failures in 30 seconds. Open → half-open after 30 seconds. Half-open → closed after 3 successes.
Circuit breaker adds latency on the happy path (extra state checks). But it prevents thundering herds: when a service is down, clients fail fast instead of timing out. The trade-off is worth it.
## 42.5 Retry & Backoff Strategies
Transient failures—network hiccups, temporary service degradation—often resolve on retry. Use exponential backoff with jitter: 1s, 2s, 4s, 8s, with random jitter (+/- 20%). Cap at 30 seconds total.
Idempotency keys prevent duplicate charges. If a Stripe charge request times out, retrying without an idempotency key might charge twice. Store an idempotency key (UUID) per request; Stripe returns the same result on retry.
Retry budget: max 3 retries, max 30 seconds total. After that, fail. This prevents infinite retry loops and unbounded latency.
Non-retryable errors: 400-level errors (validation, auth), business logic errors (CG exceeded), and errors indicating invalid state. Retrying won’t fix these; propagate immediately.
## 42.6 Graceful Degradation
When dependencies fail, SkyLara degrades gracefully instead of crashing. The system continues operating with reduced functionality.
Stripe down: don’t block jumpers from flying. Accept cash at the DZ; record the transaction as pending. Once Stripe is back, retry the charge. This keeps revenue flowing.
Twilio down: SMS is a convenience, not a blocker. Switch to push notifications or in-app messages. Admins should be alerted manually that SMS is down.
Weather API down: always have a fallback. Cache the previous forecast (timestamp it). Require manual entry if cache is stale.
Redis down: the cache is a performance optimization. If it goes down, hit the database directly. Queries will be slower, but correct.
Database read replica down: if you have replication, route reads to the primary temporarily. Writes are unaffected. This is seamless to the user.
## 42.7 Dead Letter Queue (DLQ)
Some requests fail in ways that retry won’t fix. After max retries, send them to a dead letter queue for manual review. The DLQ is a database table of failed events awaiting action.
DLQ processing workflow: (1) failed event enters DLQ, (2) alert sent to admin dashboard, (3) admin reviews and decides: retry, fix and retry, or discard, (4) action taken, (5) DLQ entry marked resolved. Old DLQ entries (>30 days) auto-discard.
Alert on DLQ depth. If DLQ has > 100 unresolved events, something is seriously wrong. Send a critical alert to operations.
DLQ will accumulate if nobody reviews it. Schedule daily DLQ reviews. Assign ownership; someone must own the DLQ.
## 42.8 Health Check System
The /health endpoint probes all dependencies. It returns overall system status (healthy, degraded, unhealthy) and per-component status.
Database health is critical. If the database is down, the system is down. Other failures are graceful degradations.
Health checks are lightweight. Ping only; avoid heavy queries. Run checks every 30 seconds. Store results; don’t block request handlers on health checks.
## 42.9 Chaos Engineering (Future)
Chaos engineering injects controlled failures to test resilience. Kill a random container. Introduce network latency. Corrupt cache. Simulate database failover. This exposes weaknesses before production incidents.
GameDay exercises: quarterly, dedicated team time to run chaos experiments. Script scenarios (Stripe down for 5 minutes; database failover) and observe system behavior. Document findings and fix gaps.
Start small. Manual fault injection before automated. Kill a service, watch how the system degrades, verify alerts fire, verify recovery works. Build confidence incrementally.
Chaos engineering requires a team that can handle the chaos. If your team panics when the database goes down, chaos engineering is premature. Build observability and alerting first.
## 42.10 User-Facing Error Experience
Never show stack traces to users. Ever. Replace with a friendly message: "Something went wrong. Our team has been notified." Include a request ID so users can reference it with support.
Error messages must be actionable. Don’t say "constraint violation." Say "That email is already registered. Try a different email or click ‘Forgot password’." Give next steps.
Retry buttons are appropriate for transient errors. "Payment processing timed out. Retry?" Avoid retry buttons for non-retryable errors.
Offline-aware errors: if a jumper loses network, don’t say "error." Say "You’re offline. This action will sync when you’re back online." Queue the action; execute on reconnect.
Error reporting: include a "Report this issue" button that captures request ID, user ID, timestamp, and context. This accelerates debugging.
## 42.11 Brutal Honesty
You will never handle all error cases. The world is creative in finding new failure modes. Accept this and plan for ongoing debugging.
"Retry" is not a strategy for data corruption. If a value is invalid, retrying won’t fix it. Use retry only for transient failures (timeouts, network hiccups, service degradation).
Circuit breakers add latency on the happy path. Every extra state check is nanoseconds you’re spending. For high-traffic endpoints, this compounds. Measure the impact.
Dead letter queues will accumulate. Nobody will review them consistently. Set up automated cleanup; review DLQ weekly. Expect surprises (events from 3 months ago you forgot existed).
Chaos engineering requires a team that can handle the chaos. If you don’t have on-call engineers who can respond to failure injection, don’t do it. You’ll create more problems than you solve.
Most errors in production will be ones you never imagined. A user double-taps a button, submitting the form twice. A DZ admin loses power mid-import. A jumper’s license number is a Unicode character. Plan for surprise.
The best error handling is prevention. Validate early, fail loudly in development, write tests for edge cases, do code review. Errors caught before production are free. Errors in production are expensive.
# CHAPTER 43: DESIGN SYSTEM & COMPONENT LIBRARY
## 43.1 Design System Architecture
SkyLara’s design system bridges Figma to production via a token-based pipeline. Colors, spacing, typography, and shadows are defined once in Figma, exported as JSON tokens, then compiled to CSS variables for web (Tailwind) and RN constants for mobile (React Native StyleSheet). This single source of truth ensures platform consistency while allowing platform-specific rendering.
The pipeline: designers update Figma tokens → Tokens Studio plugin exports JSON → build script generates CSS variables and RN constants → distributed to web and mobile apps. Platform targets include web via Tailwind, mobile via React Native StyleSheet, and future targets (Flutter) consume the same token set.
## 43.2 Brand & Visual Identity
SkyLara brand colors are optimized for sky and speed. Primary navy (#1B4F72) conveys trust and stability. Secondary sky blue (#2E86C1) echoes the jump environment. Accent red (#E74C3C) signals safety decisions and emergencies. Success green (#27AE60) confirms actions. Warm grays (50-900) provide neutral backgrounds and borders.
Typography defaults to Inter for UI components; platform system fonts (San Francisco, Roboto) for performance on mobile. Iconography uses Lucide icons for UI actions plus custom skydiving icons (parachute, altitude, heading, wind arrows) for domain-specific visuals. All icons are scalable SVGs with semantic naming.
## 43.3 Layout System
SkyLara uses an 8px grid baseline for all spacing, ensuring alignment and rhythm. Responsive breakpoints target mobile-first design: mobile (375px), tablet (768px), desktop (1024px), wide (1440px). Container widths constrain content: mobile full width, tablet 90%, desktop 960px max, wide 1280px max.
Spacing scale: 4px (xs), 8px (sm), 12px (md), 16px (lg), 24px (xl), 32px (2xl), 48px (3xl), 64px (4xl), 96px (5xl). All padding, margin, and gap values use this scale to maintain visual rhythm across layouts.
## 43.4 Core Components Catalog
SkyLara provides 25+ reusable components. Button variants: primary (navy bg), secondary (navy outline), danger (red bg), ghost (text only); sizes: sm, md, lg; states: default, hover, disabled, loading. Input components support text, number, date, select with inline validation states (idle, error, success). Card components: content (full width), stat (compact metric), action (with CTA button).
Badge shows status color tags. Avatar renders jumper profile pictures with initials fallback. Modal and Toast provide feedback. DataTable supports sorting, filtering, and pagination. LoadCard displays aircraft, slots, status, countdown timer, and CG indicator. SlotChip shows jumper name with type badge and drag handle for reordering. StatusBadge reflects load FSM states: manifest, boarding, holding, airborne, landing, debriefing.
## 43.5 Manifest-Specific Components
LoadBoard is a drag-and-drop grid of loads (aircraft) for DZ manifest operators. Each load shows aircraft call sign, altitude, status, and slot count. LoadCard is a detailed card for a single load: aircraft type, current slots, jump run direction, exit altitude, expected descent time, CG status (visual gauge: green/yellow/red). SlotChip represents a jumper in a slot: name, jump type (tandem, AFF, coach), price, and drag handle for reordering within a load.
ManifestToolbar sits at top: add load button, filter by aircraft/status, search jumper. CGIndicator is a horizontal gauge showing aircraft center of gravity: green 20–35%, yellow 15–20% or 35–40%, red outside bounds. TimerBadge counts down to load call time, changing color as call time approaches (green >10min, yellow 5–10min, red <5min). WeatherBar is a persistent top bar showing current DZ conditions: temperature, wind speed/direction, cloud ceiling, visibility.
## 43.6 Form Patterns
Forms validate inline (real-time field hints), on blur (after user leaves field), or on submit (full form validation). Errors display at field level with inline messages and red outlines, plus optional summary panel at form top. Multi-step forms break into logical sections (e.g., waiver signing → personal info → emergency contact → payment). File uploads support drag-and-drop zones plus mobile camera access (for photo uploads on waivers).
Accessibility is built in: every input has an associated label, ARIA labels for screen readers, keyboard navigation (Tab through fields, Enter to submit, Esc to cancel), focus management (focus moves to first error on submit), and clear error messages that describe how to fix.
## 43.7 Mobile-Specific Patterns
Mobile UI uses bottom tab navigation (manifest, profile, settings, support) for one-handed use. Pull-to-refresh refreshes load list. Swipe actions on load cards: swipe left to view details, swipe right to cancel booking (with confirmation). Haptic feedback (vibration) confirms actions like slot assignment or payment. Offline indicator banner shows at top if no network. Touch targets are minimum 44px (Apple, WCAG guidance) for easy tapping.
## 43.8 Accessibility Standards
SkyLara targets WCAG 2.1 AA compliance. Color contrast requirements: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold). All interactive elements are keyboard navigable (Tab, Shift+Tab, Enter/Space, arrow keys). Screen reader support uses semantic HTML (buttons not divs), ARIA labels for icons, role and aria-live for dynamic content. Focus management moves focus to modals on open, traps focus within modal, returns focus to trigger on close.
Motion reduction: animations disable for users with prefers-reduced-motion. All video and animations have accessible alternatives (captions, transcripts). Images have alt text. Form errors linked to fields with aria-describedby. Status messages use aria-live for screen reader announcements.
## 43.9 Theming & White-Label
Each DZ can override primary brand color and logo. Dark mode is supported via CSS custom properties (light mode: #FFFFFF bg, dark mode: #1F2937 bg). High-contrast mode available for outdoor use (increases contrast, removes subtle gradients). Theme variables are passed as CSS custom properties and RN constants at app start, making DZ-specific branding seamless.
## 43.10 Brutal Honesty
Design systems take 6+ months to build properly and require dedicated design and engineering resources. Most startups should use a UI library (shadcn/ui, Material UI, Ant Design) and customize later. Figma-to-code automation tools (Figma plugins, Storybook integration) never work perfectly; expect 30–40% manual cleanup. Maintaining design/code sync is a full-time job for a team of 2–3 people.
Mobile and web will always drift apart: designers design for desktop first, mobile gets a shrunk version, engineers then optimize mobile differently, and nothing is in sync anymore. Accessibility is expensive: it adds 15–20% to component development time and requires specialized testing. Outdoor use means your carefully chosen colors are invisible in sunlight; you’ll need a high-contrast mode and users will hate it because it’s ugly. Accept that perfect design systems don’t exist; your goal is consistency and developer speed, not perfection.
# CHAPTER 44: DEVELOPER ONBOARDING & TECHNICAL DOCUMENTATION
## 44.1 Documentation Architecture
SkyLara follows docs-as-code: Markdown files live in /docs in the repository, versioned with code, reviewed in PRs. API documentation is auto-generated from TypeBox schemas via Swagger UI, so docs are always in sync with code. Architecture Decision Records (ADRs) capture design rationale: problem, alternatives considered, decision, consequences. Runbooks provide step-by-step operational procedures. Reference guides cover glossary, database schema, API endpoints.
## 44.2 Developer Onboarding Flow
Day 1: new developer gets repo access, runs local setup (git clone, npm install, docker-compose up), and creates a hello-world commit to verify the pipeline works. Day 2–5: domain context (DZ operations, manifest flow, regulatory constraints), architecture walkthrough (C4 diagrams, tech stack rationale), pair programming with a senior engineer on a simple task. Week 2: assigned first feature (usually UI component or non-critical API endpoint), submits PR, gets detailed code review feedback, pushes back with questions.
Local development uses Docker Compose: PostgreSQL, Redis, S3 mock (LocalStack), Kafka (for events), SMTP mock (MailHog). Developers use provided .env template, docker-compose up brings everything online, npm run dev starts all services.
## 44.3 Architecture Documentation
C4 model diagrams provide multi-level abstraction: Context (SkyLara in relation to users, DZs, payment systems), Container (web app, mobile app, backend API, database, cache, message queue), Component (within backend: auth, manifest, payment, notification services), Code (class diagrams for complex domains). Data flow diagrams show critical paths: jumper booking flow, manifest generation, payment processing, emergency alert propagation.
Technology Decision Log captures every significant choice: database (PostgreSQL for ACID), cache (Redis for sessions and real-time state), message queue (Kafka for events), search (Elasticsearch for full-text jumper search). Each entry includes: decision title, context, alternatives evaluated, chosen option, rationale, consequences, and alternative if we need to switch later.
## 44.4 API Documentation
API documentation is auto-generated from TypeBox schemas. Every endpoint has request/response examples, error codes, authentication requirements, and rate limits. Swagger UI is published at /api/docs and regenerated on every deploy. WebSocket documentation includes subscription examples (e.g., subscribe to load updates, unsubscribe when user navigates away). Error codes reference explains every error: 400 (bad input), 401 (not authenticated), 403 (not authorized), 409 (conflict, e.g., slot already booked), 500 (server error).
Postman collection is auto-exported from OpenAPI spec. Developers import collection, set environment variables (API_URL, AUTH_TOKEN), and have a runnable API client. Webhooks are documented: load status changed, payment received, jumper incident reported.
## 44.5 Database Documentation
ER diagrams are domain-specific (manifest diagram, payment diagram, identity diagram) not one massive 50-table diagram. Table-by-table reference includes column name, type, constraints, description, and index strategy. Index strategy doc explains: why each index exists, performance improvement, write cost trade-off. Migration history log captures: migration number, date, author, description, up/down SQL, rollback validation.
Query patterns doc provides examples: list loads for DZ on date, get slot availability for aircraft, calculate total jumper revenue. Performance notes highlight n+1 query pitfalls and recommend batching or caching strategies.
## 44.6 Operational Runbooks
Deployment runbook: prerequisites (CI green, feature reviewed, database migrations tested), steps (tag release, push tag, CI builds and tests, deploy to staging, smoke test endpoints, approve deployment, CI deploys to production, verify monitoring), verification (health checks pass, no error spike), rollback (revert tag, redeploy previous release, verify DB migrations didn’t corrupt state).
Incident response runbook: when to use (error spike >10% 5xx), prerequisites (incident lead assigned, Slack channel created), steps (identify error pattern, check recent deploys, check database load, coordinate hotfix if needed, document timeline), verification (error rate returns to normal, no data loss), escalation (if unresolved in 30 min, page oncall architect).
Database migration runbook: safe migration for high-traffic tables (non-blocking add column, create new table in parallel, sync data, swap). Scaling runbook: load hit limit, add read replicas, shard user data. Rollback runbook: previous deploy broke something, how to safely revert.
## 44.7 Domain Knowledge Base
Skydiving terminology glossary is essential: DZ (drop zone), manifest (load management system), load (aircraft + jumpers), slot (seat in load), CG (center of gravity), AAD (automatic activation device), AFF (accelerated freefall progression), AFFI (AFF instructor), TI (tandem instructor), student, fun jumper (experienced recreational), coach (mentoring role), waypoint (GPS location for navigation), call time (when load is called to board).
Regulatory overview covers FAA Part 105 (parachute operations), USPA standards (United States Parachute Association), EASA regulations (European Aviation Safety Agency). DZ operations primer walks through a real jump day: morning briefing, equipment checks, manifest opens, loads form and call time is announced, jumpers board, aircraft climbs to altitude, exit, freefall and canopy, landing, pack and repeat.
## 44.8 Contributing Guide
PR conventions: commit messages in format “type(domain): description” (e.g., “feat(manifest): add multi-load view”). Branch names: feature/manifest-multi-load, bugfix/cg-calculation-off-by-one, chore/upgrade-dependencies. Code review checklist: does code follow patterns, are tests green, is database safe, is performance reasonable, is error handling correct, are docs updated.
Testing requirements: backend needs unit tests (jest), integration tests (database), contract tests (API changes). Frontend needs unit tests (React Testing Library), integration tests (full form flow). Documentation requirements: public API endpoints need TypeBox schema, runbooks need procedures and verification steps, ADRs need rationale, glossary needs updates for new domain terms.
## 44.9 Brutal Honesty
Documentation rots faster than code. Outdated docs are worse than no docs because they mislead. Auto-generated docs from code (OpenAPI, JSDoc) age more slowly because they regenerate on every change; hand-written ADRs and guides get stale. Nobody reads onboarding docs; they ask Slack or pair with a senior. But written onboarding is still important because it lets people onboard async and doesn’t require scheduling senior time.
ADRs are write-once-read-never: they feel important at the time, become unreadable in 6 months, but are invaluable when you need to know “why we chose PostgreSQL instead of MongoDB” three years later. The glossary is the most useful doc because skydiving terminology is genuinely confusing for outsiders. Pair programming is the best onboarding tool, but it doesn’t scale beyond 3–4 new engineers per year. Plan for 2–3 weeks of senior engineer time per new hire; it’s expensive but saves weeks of lost productivity.
# CHAPTER 45: MULTI-DZ FEDERATION & GLOBAL NETWORK
## 45.1 Federation Architecture Overview
SkyLara’s federation model balances independence and connectivity. Each DZ has single-tenant data isolation: loads, manifest, financial records, waivers, incident reports stay local. A global identity and profile layer allows jumpers to maintain one account, build reputation across DZs, and make their accomplishments portable. Global services: identity, license verification, community (stories, social), marketplace, and analytics. Platform scales through multi-region deployment with eventual consistency for global identity.
## 45.2 Global Identity System
One account, many DZ memberships. Jumpers create account with email and password (or OAuth). Profile includes name, avatar, bio, total jump count. Identity verification levels: email (verified at signup), phone (optional, for manifest check-in), skydiving license (scanned ID), document ID (passport/driver license). Account linking: jumper who registered at DZ A then later registers at DZ B can link accounts, merging jump history and avoiding duplicates.
Cross-DZ profile is portable: jump count aggregated across all DZs, experience ratings (AFF level, TI endorsement, coach rating) follow the jumper. Privacy controls let jumpers set visibility: profile public to all DZs, jump history private to home DZ only, ratings visible to instructors. GDPR compliance: jumpers can export all data, request erasure (soft delete across federation with eventual sync).
## 45.3 Cross-DZ Data Sharing
Shared data: jumper profile (name, avatar, bio, aggregated jump count), license status and validity, ratings and endorsements (AFF level, TI cert, coach rating), public story posts. NOT shared: financial records (DZ A won’t see DZ B’s revenue), incident details (safety investigation confidential), internal DZ notes (“this jumper is training for BASE, high-risk” stays local), waiver content (legal varies by jurisdiction).
Consent model: jumper controls visibility. Default: profile visible to other DZs, incident reports not shared. Jumper can opt out of federation (“I only want my home DZ to see my data”). GDPR and data portability: jumper can download all data, request deletion, and deletion cascades across federation with eventual consistency (sync within 24 hours).
## 45.4 Multi-Region Deployment
Data residency is enforced: EU data (GDPR) stays in EU, MENA data stays in MENA (local regulations), US default. Each region has full stack: API, database, cache, search. Global routing via CloudFront: jumper in Germany hits eu-central-1, jumper in Dubai hits mena-south-1, jumper in California hits us-west-2. Global identity sync uses eventual consistency with 5-second target: jumper creates account in us-west, identity syncs to eu-central and mena-south within 5 seconds, read-after-write consistency in same region.
## 45.5 DZ Network Effects
Discovery: jumpers browse worldwide DZs with filters (location, aircraft, activities, ratings). Reviews and ratings from verified jumpers only (identity linked to jump history). DZ-to-DZ transfer: jumper moves from DZ A to DZ B, can carry over AFF progression or coach rating. Instructor guest appearances: instructor from DZ A does a weekend clinic at DZ B; their global profile shows the appearance, reputation follows them.
Community building: global story feed (jumper posts about their jump), stories can tag DZ (story visible on DZ profile and global feed), social follows across DZs. Reputation system: verified jump count, instructor endorsements, peer reviews, incident-free record, all portable.
## 45.6 Global Marketplace
Coaching marketplace: instructors listed globally, jumper from US looking for AFF coaching can find AFFI in Spain offering remote coaching (via video) or book in-person coaching for a trip. Experience packages: DZ A offers “tandem at sunset” for $300, DZ B offers “mountain exit training” for $400, packages are cross-DZ bookable. Slot resale: jumper booked slot at DZ A but plans changed, can resell slot to another jumper at DZ B or A, revenue split (platform fee + originating DZ + host DZ). Equipment rental: gear is rented across DZ network (harness, rig, helmet standardized).
Revenue model: 3-way split. Platform takes 5% transaction fee. Originating DZ (where slot created) takes 15%. Host DZ (where jump happens) takes 80%. Rationale: host DZ does the actual jump ops (insurance, aircraft, staff), gets majority. Originating DZ takes small cut (they created inventory). Platform takes cut (infrastructure, payment processing, support).
## 45.7 Federation Governance
DZ onboarding: DZs apply for network membership, verify legal registration, insurance, safety record. Quality standards: FAA Part 105 compliance, no incident pattern, positive peer reviews. Dispute resolution: payment dispute between DZs, safety concern about jumper, violations of network rules. Data sharing agreements: DZ signs terms, agrees to GDPR/CCPA compliance, data portability. Platform enforcement: DZ violates safety rules (exceeds accident rate, ignores incident reports), platform can suspend or expel DZ from network.
## 45.8 Analytics & Benchmarking
Global aggregated analytics (anonymized): total jumps per month globally, seasonal demand (summer 80% higher volume), instructor availability vs demand. DZ benchmarking: your DZ has 60% utilization vs network average 45%; you’re above average. Seasonal demand patterns: summer peak (May–August), winter cliff (December–February), Easter/holidays micro-peaks. Instructor migration patterns: instructors move to DZs with higher demand, follow seasonal peaks (winter instructors move south).
Insights dashboards: your DZ metrics (utilization, revenue per jump, instructor retention), network comparison (how you rank), trend forecasts (expected demand next quarter). Benchmarks are anonymized: “you’re in top 20% for utilization” not “DZ XYZ has higher utilization than you.”
## 45.9 Scaling the Network
Growth strategy: Phase 1 (months 1–12): anchor DZ in US (California, Florida). Phase 2 (months 12–24): expand to 5 DZs across US + 2 in EU. Phase 3 (months 24–36): 20+ DZs (network effects kick in, jumpers can jump multiple DZs). Phase 4 (months 36–60): 50+ DZs (marketplace liquidity, significant coaching cross-DZ bookings). Phase 5 (60+): 100+ DZs (enterprise tier, DZ chains with multi-location operators).
Critical mass thresholds: 5 DZs minimal network, limited choice. 20 DZs network effects start (jumpers notice choice, ratings matter). 50 DZs marketplace viable (slot resale, coaching bookings frequent). 100+ DZs global presence, franchise/chain support.
## 45.10 Brutal Honesty
Multi-DZ federation is a V3+ feature, not MVP. Do not attempt until you have one DZ perfect (stable, profitable, good retention). DZs are competitive: they will not share data willingly. Trust and incentives are required (platform visibility, jumper access, referral revenue). Global identity sounds great on paper: one account, portable reputation, seamless experience. In reality, most jumpers have one home DZ and visit others rarely. The 80/20 rule applies: 80% of federation value is jumper identity + license verification; 20% is everything else.
Cross-region data sync adds enormous complexity: eventual consistency bugs appear in production, support tickets multiply, debugging is hard. The marketplace will have liquidity problems until 100+ DZs; at 20 DZs slot resale is ghost town. Instructor guest appearances require trust that does’t exist yet: DZ A worries DZ B’s instructor will poach their students. This is a 3–5 year vision, not a 6-month deliverable. Focus on making one DZ perfect before dreaming about federation. Build for it architecturally (event-driven, APIs for data exchange) but don’t ship federated features until you have anchor DZ traction and revenue.

| System | Market Share (US) | Data Available | Extraction Method | Access Difficulty |
| --- | --- | --- | --- | --- |
| Burble | ~60% of DZs | Jumpers, loads, aircraft, transactions | CSV export (limited) or API (if available) | Proprietary DB; negotiation required |
| Manifest Pro | ~15% of DZs | Jumpers, loads, manifests | Flat file export (old systems) | Legacy format; parsing fragile |
| DropZone.com | Community platform | Public profiles only | Web scraping or API | Privacy restrictions; limited data |
| Excel/Sheets | 40%+ small DZs | Arbitrary schema per DZ | CSV download | Inconsistent format; manual mapping |
| Paper logbooks | 10%+ small DZs | Jump records only | Manual entry or OCR | Labor-intensive; error-prone |

| Entity | Source Fields | Target Fields | Handling Missing Data | Data Type Issues |
| --- | --- | --- | --- | --- |
| Jumper | name, email, license_num, license_exp, jump_count | user_id, profile_id, license, license_expiry, verified_count, self_reported_count | License: manual verification; jump_count: use source value; email: optional | license_num format varies; jump_count int vs string |
| Load | load_id, aircraft, manifest_time, jumpers (CSV) | load_id, aircraft_id, scheduled_at, jump_records (normalized) | Missing manifest: use import_date; missing jumpers: create empty records | Timestamp timezone varies; jumper refs are source IDs |
| Aircraft | tail_num, model, max_jumpers, year | tail_num, aircraft_model_id, capacity, manufactured_year | Max jumpers: default 20; year: optional | Model names don’t match SkyLara enums; capacity is estimate |
| Instructor | name, license_num, rating, dz_id | user_id, instructor_profile_id, rating_level, dropzone_id, verified | Rating: map to enum; dz_id: resolve to SkyLara DZ ID | Rating is freetext; no standard codes |
| Waiver | jumper_id, waiver_text, signed_date, signature | waiver_id, jumper_id, waiver_template_version, signed_at, signed_by | Signature: re-sign required for legal; waiver_text: archive only | No version tracking in source; dates may be approximate |

| // Example mapping config const jumpperMapping = {   source: "name",   target: "profile.full_name",   transform: (value) => value.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),   required: true, };  const licenseMapping = {   source: "license_num",   target: "license.number",   transform: (value) => value.replace(/[^A-Z0-9]/g, "").toUpperCase(),   required: false,   validation: async (value) => await verifyLicenseWithAuthority(value), }; |
| --- |

| // CSV import pipeline (TypeScript sketch) async function importCsvToStaging(   fileStream: ReadableStream,   mapping: FieldMapping[],   batchId: string ) {   const parser = createCsvParser({ headers: true, trim: true });   const records: StagingRecord[] = [];   const errors: ValidationError[] = [];    for await (const row of parser.parse(fileStream)) {     try {       const record = {};       for (const field of mapping) {         let value = row[field.source];         if (field.transform) value = await field.transform(value);         if (field.required && !value) throw new Error(`Missing ${field.source}`);         if (field.validation) await field.validation(value);         record[field.target] = value;       }       record.batch_id = batchId;       record.imported_at = new Date();       records.push(record);     } catch (err) {       errors.push({ row: parser.lineNumber, error: err.message });     }   }    if (errors.length > records.length * 0.1) {     throw new Error(`Import error rate > 10%: ${errors.length} / ${records.length}`);   }    await stagingDb.insertMany(records);   return { recordCount: records.length, errorCount: errors.length, errors }; } |
| --- |

| Field | Transformation | Validation | Fallback |
| --- | --- | --- | --- |
| full_name | trim(), capitalize() | length 2-100, no symbols | Skip record or flag for manual review |
| email | trim(), lowercase() | valid email format | Mark as unverified; allow null |
| license_number | uppercase(), remove punctuation | Verify against USPA/FAA if API available | Mark as unverified; require manual check |
| phone | parse and normalize to E.164 | Valid phone format, valid country code | Mark as unverified; allow null |
| jump_count | parseInt(), validate >= 0 | logical: < 10000 | Use source value; flag for review |
| birth_date | parse ISO date | Valid date, age >= 18 | Skip record |
| address | trim(), geocode lat/lng | Valid coordinates returned from geocoding API | Store address text; lat/lng null |

| Feature | Purpose | Input | Output |
| --- | --- | --- | --- |
| CSV template download | Show DZ what columns we expect | Select entity type (jumpers, loads, aircraft) | Excel/CSV file with headers + example rows |
| Field mapping UI | Let DZ map their columns to ours | Upload CSV; drag/drop to map columns | Mapping config JSON |
| Preview mode | Show what will be imported before commit | Upload CSV + mapping; click preview | Table: first 50 rows post-transformation; errors highlighted |
| Error report | Help DZ fix bad data | Validation errors from preview stage | CSV: row number, column, error message, suggested fix |
| Batch status | Track import progress | Click import; background job runs | Status page: "Processing 5000 records... 3200 done. 5 errors." |

| Category | HTTP Status | Root Cause | User Message | Retry Safe? |
| --- | --- | --- | --- | --- |
| Validation | 400 Bad Request | Invalid input: missing field, wrong format, constraint violated | "Email is invalid. Check spelling and try again." | No (data is bad) |
| Authentication | 401 Unauthorized | Token missing, expired, or invalid | "Your session expired. Please log in again." | No (requires new token) |
| Authorization | 403 Forbidden | User lacks permission for action | "You don’t have permission to modify this load." | No (permission won’t change) |
| Business Logic | 422 Unprocessable Entity | CG exceeded, load full, waiver expired, currency mismatch | "Load is full. Wait for next flight or add an aircraft." | No (state won’t change) |
| External Service | 503 Service Unavailable | Stripe down, Twilio timeout, weather API error | "Payment system is temporarily down. Try again in a moment." | Yes (service may recover) |
| System | 500 Internal Server Error | Database down, out of memory, disk full, unexpected exception | "Something went wrong. Please try again or contact support." | Yes (transient) |

| // Standard error response format {   "error": {     "code": "40003",     "message": "Load capacity exceeded. Current: 12 jumpers, Limit: 10.",     "category": "business_logic",     "context": {       "request_id": "req-abc123",       "user_id": "user-456",       "dropzone_id": "dz-789",       "field_errors": [         { "field": "jumper_count", "message": "Must be <= 10" }       ]     },     "timestamp": "2026-04-07T14:30:00Z"   } }  // Error codes: first 2 digits = domain, last 3 = specific error // 40001 = validation/missing field // 40002 = validation/format error // 40003 = business_logic/capacity exceeded // 50001 = external_service/payment processor down // 50002 = system/database error |
| --- |

| // Circuit breaker implementation (TypeScript sketch) class CircuitBreaker {   state: "closed" | "open" | "half-open" = "closed";   failureCount = 0;   lastFailureTime: Date | null = null;   successCount = 0;    async execute(fn: () => Promise<any>): Promise<any> {     if (this.state === "open") {       const elapsed = Date.now() - this.lastFailureTime.getTime();       if (elapsed > 30000) {         this.state = "half-open";         this.successCount = 0;       } else {         throw new Error("Circuit is open; service unavailable");       }     }      try {       const result = await fn();       if (this.state === "half-open") {         this.successCount++;         if (this.successCount >= 3) {           this.state = "closed";           this.failureCount = 0;         }       }       return result;     } catch (err) {       this.failureCount++;       this.lastFailureTime = new Date();       if (this.failureCount >= 5) {         this.state = "open";       }       throw err;     }   } } |
| --- |

| Service | Failure Threshold | Timeout to Half-Open | Success Threshold | Note |
| --- | --- | --- | --- | --- |
| Stripe | 5 failures / 30s | 30s | 3 successes | Payment critical; conservative thresholds |
| Twilio | 3 failures / 30s | 60s | 2 successes | SMS is less critical than payment |
| Weather API | 5 failures / 60s | 120s | 3 successes | Low criticality; can degrade gracefully |
| Database | 2 failures / 10s | 5s | 1 success | Very sensitive; open circuit quickly on DB failure |

| // Retry with exponential backoff and jitter async function retryWithBackoff(   fn: () => Promise<any>,   maxRetries = 3,   initialDelayMs = 1000 ): Promise<any> {   let lastError;   for (let attempt = 0; attempt <= maxRetries; attempt++) {     try {       return await fn();     } catch (err) {       lastError = err;       if (attempt === maxRetries) break;       if (isNonRetryableError(err)) throw err;        const delay = initialDelayMs * Math.pow(2, attempt);       const jitter = delay * (Math.random() - 0.5);       await sleep(Math.min(delay + jitter, 30000));     }   }   throw lastError; } |
| --- |

| Dependency | Failure Mode | Degradation Strategy | User Experience |
| --- | --- | --- | --- |
| Stripe | Payment processing down | Accept cash payments; log IOU for later reconciliation | "Payment system is down. We’ll charge your card when it’s back." |
| Twilio | SMS delivery fails | Fall back to push notifications; alert admins manually | "We couldn’t send an SMS. Check your notifications instead." |
| Weather API | Forecast unavailable | Use cached forecast (< 24h old); allow manual entry | "Weather forecast is unavailable. Enter conditions manually if needed." |
| Redis cache | Cache miss or timeout | Bypass cache; hit database directly (slower but correct) | No user impact; backend latency increases slightly |
| Database read replica | Replica down or lagging | Route reads to primary database temporarily | Writes queue normally; reads may be slightly stale |

| // Dead letter queue processor async function processDLQ(dlq_id: string) {   const event = await db.dlq.findById(dlq_id);   if (!event) return;    if (event.auto_retry_eligible) {     try {       await retryWithBackoff(() => event.handler());       await db.dlq.markResolved(dlq_id, "auto_retry_success");       return;     } catch (err) {       // Still failing; escalate to manual review     }   }    // Manual review required   const admin = await assignToAdmin(event.dropzone_id);   await sendAlert(admin, {     message: `DLQ event ${dlq_id} awaiting manual review.`,     event: event.data,   }); }  // Auto-discard old DLQ entries (> 30 days) async function cleanupOldDLQ() {   const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);   await db.dlq.deleteWhere({ created_at: { $lt: cutoff } }); } |
| --- |

| // GET /health async function getHealth(): Promise<HealthResponse> {   const checks = {     database: await checkDatabase(),     redis: await checkRedis(),     stripe: await checkStripe(),     twilio: await checkTwilio(),     weatherApi: await checkWeatherApi(),   };    const criticalDown = ["database"].filter(k => checks[k].status === "down").length > 0;   const nonCriticalDown = ["redis", "stripe"].filter(k => checks[k].status === "down").length;    let overallStatus = "healthy";   if (criticalDown) overallStatus = "unhealthy";   else if (nonCriticalDown > 0) overallStatus = "degraded";    return {     status: overallStatus,     timestamp: new Date(),     checks,     metrics: {       uptime_seconds: process.uptime(),       memory_mb: process.memoryUsage().heapUsed / 1024 / 1024,     },   }; } |
| --- |

| Component | Check | Healthy Threshold | Unhealthy Threshold |
| --- | --- | --- | --- |
| Database | Ping + simple query | Response < 100ms, error rate < 0.1% | Response > 1000ms, error rate > 5% |
| Redis | Ping + SET/GET | Response < 10ms | Response > 100ms or connection refused |
| Stripe | List charges (read-only) | Response < 500ms | Response > 5000ms or auth error |
| Twilio | Fetch account info | Response < 500ms | Response > 5000ms or auth error |

| Color Name | Hex | Usage | WCAG Contrast (on white) |
| --- | --- | --- | --- |
| Primary Navy | #1B4F72 | Primary buttons, headers, nav | 7.2:1 |
| Sky Blue | #2E86C1 | Secondary actions, links, focus states | 5.8:1 |
| Safety Red | #E74C3C | Danger buttons, alerts, restrictions | 4.9:1 |
| Success Green | #27AE60 | Confirmations, approved slots | 5.1:1 |
| Neutral 50 | #F9FAFB | Page background, panel fills | 1.1:1 |
| Neutral 900 | #111827 | Text body, semantic contrast | 18.0:1 |

| Breakpoint | Screen Width | Container | Columns | Behavior |
| --- | --- | --- | --- | --- |
| Mobile | 375px–767px | Full width | 1 | Stack vertically, hide desktop nav |
| Tablet | 768px–1023px | 90% width | 2–3 | Side-by-side cards, collapsible panels |
| Desktop | 1024px–1439px | 960px max | 4 | Multi-column layouts, sticky nav |
| Wide | 1440px+ | 1280px max | 6 | Dashboard grids, multi-panel views |

| Component | Variants | Platforms | Interaction |
| --- | --- | --- | --- |
| Button | primary, secondary, danger, ghost; sm, md, lg | Web, mobile | Tap, loading state, disabled |
| Input | text, number, date, select, password | Web, mobile | Focus, blur validation, error display |
| Card | content, stat, action | Web, mobile | Hover elevation, tap action |
| DataTable | Sortable columns, filterable rows, pagination | Web | Click sort, enter search, page buttons |
| LoadCard | Aircraft, slots, status, timer, CG | Web, mobile | Tap to open, swipe to cancel (mobile) |
| StatusBadge | manifest, boarding, airborne, debriefing | Web, mobile | Visual indicator, tooltip on hover |
| WeatherWidget | Current conditions, forecast, wind direction | Web, mobile | Tap for details, refresh on pull |
| Avatar | Profile picture, initials, online indicator | Web, mobile | Tap to profile, online status |

| Pattern | Android Behavior | iOS Behavior | Accessibility |
| --- | --- | --- | --- |
| Bottom tabs | Material 3 style, 5 tabs max | Human Interface Guide, 4 tabs preferred | Tab names announced, current tab bold |
| Pull-to-refresh | Swipe down from top, spring animation | UIRefreshControl, haptic on release | Announce refresh state change |
| Swipe actions | Swipe left for primary action | Swipe left for destructive, right for secondary | Button alternatives visible on tap |
| Haptic feedback | Vibration patterns (pattern ID) | UIImpactFeedbackGenerator (light, medium) | Disable in accessibility settings |
| Offline banner | Fixed top, red background, dismiss button | Sticky until online | Announced to screen reader |
| Touch targets | 48dp minimum (system guideline) | 44pt minimum (Apple guideline) | Focus ring visible on tap |

| Criterion | Level | Implementation | Testing Method |
| --- | --- | --- | --- |
| Color contrast (text) | AA | 4.5:1 normal, 3:1 large | WebAIM contrast checker |
| Keyboard navigation | A | Tab order logical, focus visible, no keyboard trap | Tab through entire page |
| Screen reader support | A | Semantic HTML, ARIA labels, role announcements | NVDA/JAWS/VoiceOver screen reader |
| Focus management | AA | Visible focus indicator, trap in modal, return to trigger | Inspect with DevTools, keyboard only |
| Motion reduction | AAA | Respect prefers-reduced-motion, disable animations | Chrome DevTools Settings → Rendering |
| Form validation | AA | Error messages linked to fields, inline hints visible | Tab to field, trigger error, check text clarity |

| Document Type | Audience | Location | Update Frequency |
| --- | --- | --- | --- |
| API reference | Backend/frontend developers | Auto-generated from TypeBox | Every deploy |
| Architecture guide | Team leads, architects | /docs/architecture | Per major decision |
| ADR | Future maintainers | /docs/adr | Per significant choice |
| Runbook | DevOps, on-call engineers | /docs/runbooks | As needed |
| Domain glossary | All developers | /docs/glossary.md | Quarterly refresh |
| Onboarding guide | New engineers | /docs/onboarding.md | Monthly update |

| version: "3.8" services:   postgres:     image: postgres:15-alpine     environment:       POSTGRES_PASSWORD: devpass     ports:       - "5432:5432"    redis:     image: redis:7-alpine     ports:       - "6379:6379"    localstack:     image: localstack/localstack:latest     ports:       - "4566:4566"     environment:       SERVICES: s3    mailhog:     image: mailhog/mailhog:latest     ports:       - "1025:1025"       - "8025:8025" |
| --- |

| Document | Owner | Review Cycle | Audience |
| --- | --- | --- | --- |
| C4 diagrams | Architect | Per feature release | Team leads, new engineers |
| Data flow diagrams | Backend lead | Monthly sync | Backend, DevOps |
| Technology decision log | Tech lead | Per major decision | Team leads, architects |
| API schema (TypeBox) | Backend leads | Per commit | All developers |
| Database ER diagram | DBA/backend | Quarterly | Backend, data team |

| Runbook | Trigger | Owner | RTO (Recovery Time) |
| --- | --- | --- | --- |
| Deployment | PR merged, release tagged | DevOps engineer | 15 min |
| Incident response | Error spike >10% 5xx | Incident lead | 30 min resolve |
| Database migration | Schema change needed | DBA | < deploy window |
| Scaling (read replica) | Primary read load high | DevOps + DBA | 20 min |
| Rollback | Production bug post-deploy | DevOps engineer | 10 min |
| Data backup restore | Accidental data deletion | DBA + incident lead | 1–4 hours |

| Term | Definition | Platform Context |
| --- | --- | --- |
| DZ | Drop zone, the skydiving facility | Primary entity, has DZ account, manages loads |
| Manifest | Load management and jumper tracking | Core feature, tracks status and assignments |
| Load | Single aircraft + jumpers for one jump run | Core entity, has status (manifest, boarding, airborne, debriefing) |
| Slot | One jumper’s seat in a load | Reservation unit, has type (tandem, AFF, fun), price |
| CG | Center of gravity of aircraft + load | Safety constraint, calculated per load |
| AAD | Automatic activation device (safety backup) | Equipment, required for all jumps |
| Call time | When load is called to board aircraft | Temporal constraint, countdown timer in UI |
| Waypoint | GPS coordinate for navigation | Freefall reference, used in flight planning |

| Data Type | Scope | Shared | Isolated | Rationale |
| --- | --- | --- | --- | --- |
| Jumper identity | Global | Yes: account, email, name, ratings | No | Portable profile |
| License & certifications | Global | Yes: license number, currency, type | No | License verification cross-DZ |
| Jump history | Global | Aggregated: total count, jump types | Detail: per-DZ incident records | Privacy + portability |
| Financial data | Local | No | Yes: payments, receipts, invoices | DZ owns revenue |
| Waivers & forms | Local | No | Yes: signed PDFs, medical records | Legal compliance, privacy |
| Incident reports | Local | No | Yes: accident details, investigation | Regulatory, confidentiality |

| Region | Location | Primary Services | Data Types | Compliance |
| --- | --- | --- | --- | --- |
| us-west-2 | US West (Oregon) | API, DB, cache, search | US DZs, NA jumpers, global fallback | SOC 2 |
| eu-central-1 | Europe (Frankfurt) | API, DB, cache, search | EU DZs, EU jumpers, GDPR enforcement | GDPR, CCPA |
| mena-south-1 | Middle East & North Africa | API, DB, cache, search | MENA DZs, local regulatory data | Local regs |
| ap-southeast-1 | Southeast Asia (Singapore) | API, DB, cache, search | APAC DZs, local compliance | Local regs |
| Global (CDN) | CloudFront edge | Static assets, API routing | All regions | N/A |

| Policy | Rule | Enforcement | Escalation |
| --- | --- | --- | --- |
| Safety standards | FAA Part 105 + USPA guidelines | Compliance check at onboarding, annual audit | Suspension if major violation |
| Data sharing | GDPR, CCPA, local regs compliant | Annual review, automated compliance scans | Expulsion if repeated violations |
| Payment integrity | No payment disputes >30 days unresolved | Dispute mediation, escrow if contested | Chargeback handling by platform |
| Community conduct | No discrimination, harassment, or threats | Report and investigation, account suspension | Permanent ban for severe cases |
| Incident reporting | All incidents reported within 24 hours | Platform tracking, pattern detection | DZ suspension if underreporting detected |

| Milestone | DZ Count | Jumpers Targeted | Features Unlocked |
| --- | --- | --- | --- |
| Phase 1 (anchor) | 1–3 | 5K | Single DZ manifest, profiles, stories |
| Phase 2 (early network) | 5–10 | 20K | Cross-DZ directory, global profiles, licensing |
| Phase 3 (network effects) | 20–30 | 75K | Jumper transfer, guest instructor, peer reviews |
| Phase 4 (marketplace) | 50–75 | 200K | Coaching marketplace, slot resale, packages |
| Phase 5 (enterprise) | 100+ | 500K+ | DZ chains, advanced analytics, white-label |