# SKYLARA

_Source: 16_Engineering_Foundation.docx_

SKYLARA
Engineering Foundation
Steps 36–40  |  API • Security • DevOps • Testing • Integrations
Version 1.0  |  April 2026  |  Brutally Honest Edition
REST + WebSocket Contracts • JWT Auth • CI/CD Pipeline • Test Pyramid • Stripe Connect
# Table of Contents
# CHAPTER 36: API DESIGN & ENDPOINT CONTRACTS
This is the HIGHEST PRIORITY remaining design — the interface contract that frontend, mobile, and third-party integrations all build against. A poorly designed API forces every client to work around inconsistencies; a well-designed API scales your team’s productivity across platforms.
## 36.1 API Architecture Overview
SkyLara uses a hybrid REST + WebSocket architecture optimized for skydiving operations:
Rate limits are per-user, per-DZ, and per-endpoint tier:
Tier 1 (general CRUD): 1,000 req/min per user
Tier 2 (manifest operations): 5,000 req/min per operator
Tier 3 (reporting): 50 req/min per admin
Tier 4 (webhooks): unlimited per DZ
## 36.2 Authentication & Token Endpoints
Auth is the foundation of the API. All endpoints except /register, /forgot-password, and health checks require a valid JWT. Tokens are signed with RS256; public key is published at /.well-known/jwks.json.
POST /api/v1/auth/login — Authenticate with email and password. Returns access token (15min) and refresh token (7day, httpOnly cookie).
POST /api/v1/auth/refresh — Refresh an expired access token using the refresh token (sent in httpOnly cookie).
POST /api/v1/auth/logout — Revoke the refresh token. Client must discard the access token.
POST /api/v1/auth/register — Create a new account. Requires email verification before login is allowed.
POST /api/v1/auth/forgot-password — Send password reset email (one-time link, 1 hour expiry).
POST /api/v1/auth/reset-password — Consume reset token and set new password.
POST /api/v1/auth/verify-email — Consume email verification token sent to new account.
## 36.3 Manifest & Load Endpoints (CRITICAL PATH)
The load manifest is SkyLara’s heartbeat. These endpoints drive the entire skydiving operation, from load creation through boarding, flight, and landing. Every operation is audited and triggers WebSocket broadcasts.
GET /api/v1/dz/:dzId/loads — List today’s loads. Supports filtering by status, aircraft_id, and departure time.
POST /api/v1/dz/:dzId/loads — Create a new load. Requires operator role and an available aircraft.
PATCH /api/v1/dz/:dzId/loads/:loadId — Update load status or swap aircraft. Status transitions must follow the FSM: OPEN → FILLING → LOCKED → 30MIN → 20MIN → 10MIN → BOARDING → AIRBORNE → LANDED → COMPLETE or CANCELLED.
POST /api/v1/dz/:dzId/loads/:loadId/slots — Add a jumper to a load. Checks license, currency, and instructor availability.
DELETE /api/v1/dz/:dzId/loads/:loadId/slots/:slotId — Remove a jumper from a load. Only allowed before BOARDING status.
POST /api/v1/dz/:dzId/loads/:loadId/manifest-group — Manifest an entire group (multiple slots) at once. Checks all prerequisites and transitions slots to MANIFESTED.
GET /api/v1/dz/:dzId/loads/:loadId/cg — Retrieve real-time CG calculation. Returns weight, arm, CG percentage, and warnings if CG is out of envelope.
WebSocket events emitted on manifest operations:
load.created — New load added to DZ
load.updated — Load status changed
load.status_changed — Explicit FSM transition (e.g., FILLING → LOCKED)
slot.added — Jumper booked into load
slot.removed — Jumper removed or cancelled
cg.warning — CG out of envelope or near limits
## 36.4 Jumper & Profile Endpoints
Jumper profiles hold license, currency, emergency contacts, and logbook data. All GDPR compliant with data retention policies.
GET /api/v1/jumpers/me — Get authenticated user’s profile (always accessible offline, cached locally).
GET /api/v1/dz/:dzId/jumpers — Search jumpers by name, license, or status. Paginated, returns 50 per page.
PATCH /api/v1/jumpers/:jumperId — Update profile (emergency contacts, address, preferences). Must be user or admin.
GET /api/v1/jumpers/:jumperId/logbook — Retrieve jump history with photos, exit order, and weather conditions.
POST /api/v1/jumpers/:jumperId/checkin — QR code check-in at DZ. Sets arrival time and device fingerprint.
## 36.5 Instructor & Scheduling Endpoints
Instructor assignments and availability are critical for AFF progression and passenger operations.
GET /api/v1/dz/:dzId/instructors — List all instructors with real-time availability and current assignments.
POST /api/v1/dz/:dzId/instructors/:id/availability — Set instructor schedule (available, on-break, off-duty) with time range.
GET /api/v1/dz/:dzId/instructor-assignments — Current assignments (who is instructing which students).
POST /api/v1/dz/:dzId/instructor-assignments — Assign instructor to load or specific slot. Checks currency and workload.
## 36.6 Booking & Payment Endpoints
Bookings integrate with Stripe for payment processing and Xano for CRM integration (future). Refunds are processed immediately.
POST /api/v1/dz/:dzId/bookings — Create booking (tandem jump, AFF course, gift certificate).
POST /api/v1/dz/:dzId/bookings/:id/pay — Initiate Stripe payment. If successful, booking moves to CONFIRMED.
POST /api/v1/dz/:dzId/bookings/:id/refund — Process refund (full or partial). Triggers Stripe API and updates booking status.
GET /api/v1/dz/:dzId/wallet — Retrieve user’s wallet balance (credits, gift certificate balance). Updates in real-time.
POST /api/v1/webhooks/stripe — Stripe webhook (payment_intent.succeeded, charge.refunded, etc.). Must validate signature with STRIPE_WEBHOOK_SECRET.
## 36.7 Safety & Emergency Endpoints
Safety is non-negotiable. Emergency endpoints have elevated permissions and are cached offline for availability during emergencies.
POST /api/v1/dz/:dzId/incidents — Report incident (malfunction, injury, near-miss). Triggers audit log and notifies admins immediately.
POST /api/v1/dz/:dzId/emergency/activate — Activate emergency mode. Locks all loads, pauses operations, and broadcasts alert to all connected clients.
GET /api/v1/dz/:dzId/weather — Current weather conditions, wind limits, and holds. Cached for 5 minutes.
GET /api/v1/jumpers/:id/emergency-profile — Emergency contact info and medical notes. Always available offline (cached on device).
## 36.8 Equipment & Aircraft Endpoints
Aircraft, parachutes, and gear are critical assets. All maintenance events are logged and trigger alerts.
GET /api/v1/dz/:dzId/aircraft — List fleet with current status (in-use, maintenance, grounded). Includes hours, altimeter, and next inspection date.
POST /api/v1/dz/:dzId/gear/assign — Assign parachute, helmet, or altimeter to jumper. Validates serial numbers and maintenance compliance.
GET /api/v1/dz/:dzId/gear/:id/history — Maintenance and inspection history for a specific piece of equipment.
## 36.9 Admin & Reporting Endpoints
Admin endpoints are for DZ owners and admins. Super-admin endpoints provide cross-DZ visibility.
GET /api/v1/dz/:dzId/reports/:type — Generate report. Types: financial (revenue, refunds), operational (loads per day, avg passengers), safety (incidents, holds).
GET /api/v1/dz/:dzId/audit-logs — Query audit trail. Filterable by actor, resource, action, timestamp. Retention: 24 months.
GET /api/v1/dz/:dzId/analytics/dashboard — Real-time KPIs: active loads, today’s revenue, passenger count, weather holds.
PATCH /api/v1/dz/:dzId/settings — DZ configuration (max load size, pricing tiers, hold reasons, emergency contacts).
GET /api/v1/admin/dropzones — Super-admin view of all DZs. Returns aggregated metrics and recent incidents.
## 36.10 WebSocket Contract
WebSocket connection to wss://api.skylara.com/ws with JWT token and dzId query parameters. Once connected, client subscribes to channels.
Channels: manifest:{dzId} (loads, slots), weather:{dzId} (conditions, holds), safety:{dzId} (incidents, emergency mode), admin:{dzId} (settings changes).
Heartbeat: Server sends { type: "ping" } every 30 seconds. Client must respond with { type: "pong" } or connection is dropped after 2 missed pongs.
Reconnection: Client UUID persists across reconnects. Undelivered events (sequence gap) are replayed from message broker.
## 36.11 Error Handling Contract
All errors follow a consistent format with machine-readable error codes and human-readable messages.
Error code taxonomy:
4xxxxx — Client errors (validation, auth, business logic)
401xxx — Authentication failures (invalid token, expired, etc.)
403xxx — Authorization failures (insufficient role)
404xxx — Resource not found
409xxx — Conflict (duplicate email, load locked, etc.)
422xxx — Validation error (bad input)
429xxx — Rate limit exceeded
5xxxxx — Server errors (database, external APIs, unknown)
## 36.12 API Versioning & Deprecation
API versions are in the URL path (/api/v1/, /api/v2/). Major versions may have breaking changes. Patch and minor versions are additive only.
Version in URL: /api/v1/dz/:dzId/loads
Accept-Version header: optional semver constraint (e.g., "1.2.x")
Sunset header on response: indicates deprecated endpoint
200-day migration window before endpoint is removed
Backwards compatibility: All v1 endpoints will remain stable until v2 launch. Additive changes (new fields, new endpoints) are safe for v1.
## 36.13 Brutal Honesty
APIs look good in design docs. Reality is messier:
REST is not ideal for real-time manifest operations. WebSocket adds client complexity (reconnection logic, message ordering, offline queueing). You’ll spend 30% of sprint capacity building and debugging WebSocket edge cases. Consider GRPC or tRPC if you revisit this.
API versioning sounds clean in theory but maintaining v1 and v2 simultaneously is expensive. Every bug fix and feature touches multiple branches. By year 2, you’ll have v1, v2, and a partial v3.
Rate limiting will break bulk operations (importing 100 jumpers, manifesting a 16-person group). You’ll need a separate bulk endpoint or batch API with higher limits.
JWT refresh rotation has edge cases (token refresh mid-request, simultaneous refresh from multiple tabs). You’ll get random logouts during high load or on unstable networks.
Swagger/OpenAPI docs will fall out of sync with implementation within 2 weeks unless you auto-generate them from TypeBox schemas. Even then, real behavior diverges from docs.
Most DZs will never build custom integrations. The API is mainly for your own frontend and mobile apps. The ‘third-party ecosystem’ is aspirational marketing unless you actively fund 2-3 partners.
Every endpoint needs to log what changed (audit trail). Every load status change, every slot addition, every refund. This logging is not optional for safety/compliance, but it doubles your database write load.
CORS headers will be your headache. Browser clients (frontend) need CORS rules, mobile apps don’t. You’ll get complaints about ‘random CORS errors’ that only happen on client networks with corporate proxies.
# CHAPTER 37: SECURITY ARCHITECTURE & AUTHENTICATION
## 37.1 Security Architecture Overview
SkyLara operates at multiple security layers, implementing defense-in-depth principles across network, application, data, and operational boundaries. The platform handles highly sensitive data including personally identifiable information (PII), emergency contact details, medical histories, financial transactions, and safety-critical waivers. A single security breach could expose skydiver medical records, compromise payment systems, or create liability through unauthorized access to waiver documents.
### Threat Model
The threat model considers attackers with varying capabilities and motivations:
### Trust Boundaries
The platform maintains strict boundaries between untrusted and trusted zones:
Public Internet: All external requests treated as hostile
API Gateway: WAF, rate limiting, request validation
Application Layer: Authentication, authorization, encryption logic
Database: Row-level isolation, encrypted columns, audit trail
Third-Party Services: Stripe (payments), AWS (infrastructure), Google/Apple (OAuth)
## 37.2 Authentication System (Deep Dive)
Authentication is the foundation of SkyLara’s security model. The system uses JWT-based tokens with separate access and refresh token strategies to balance security and user experience.
### Token Architecture
Two-token system: short-lived access tokens for API requests and longer-lived refresh tokens for silent re-authentication without user interaction.
### Token Rotation & Refresh Flow
Every refresh operation issues a new refresh token; the previous token is immediately invalidated. This limits the window of exposure if a refresh token is compromised. The database maintains a refresh_token_family concept to detect token replay attacks—if a refresh token is replayed after its successor is used, all tokens in the family are invalidated and the user is forced to re-authenticate.
### Multi-Device Support
Users often manage manifests from laptop, tablet, and phone. Each device receives an independent refresh token stored under a distinct session record. The user can view active sessions and revoke individual devices or all sessions simultaneously. This prevents a compromised phone from invalidating the user’s trusted laptop session.
### Password Policy
Minimum 10 characters (longer than typical industry minimum)
Bcrypt with cost factor 12 (approximately 200ms per hash)
Breach database check via HaveIBeenPwned k-anonymity API (no password sent, SHA1 prefix only)
Password reset links valid for 15 minutes, single-use, tied to old password hash
No password history requirement (modern best practice)
### Multi-Factor Authentication (MFA)
TOTP (Time-based One-Time Password) via Google Authenticator or equivalent. Mandatory for admin, operator, and manifest manager roles. Optional for instructors and jumpers to encourage adoption without friction. Implementation uses 30-second time window with ±1 step tolerance, and backs up with emergency codes (8-character alphanumeric, generated at enrollment, single-use).
### OAuth2 / OIDC Integration
Google and Apple Sign-In streamline onboarding for casual dropzone visitors. OAuth bypasses password complexity requirements and leverages identity providers’ security investments. Implementation handles both new account creation and linking to existing email-based accounts. Refresh tokens are short-lived; the system re-authenticates with the identity provider regularly.
## 37.3 Authorization & RBAC Deep Dive
Role-Based Access Control (RBAC) maps roles to permissions to resources. Each user has independent role assignments at each dropzone, enabling an instructor to manage manifests at DZ-A while being a jumper at DZ-B.
### Permission Model
Permissions follow the pattern: resource:action (e.g., “manifest:read”, “manifest:write”, “manifest:approve”). A role grants multiple permissions; users inherit permissions from all assigned roles. Per-dropzone scoping ensures users cannot accidentally or maliciously access another DZ’s data.
### Safety-Critical Permission Tiers
Certain operations carry heightened risk and require stronger proof of identity:
Tier 1 (View): Reading manifests, waivers, incident reports
Tier 2 (Modify): Creating manifests, updating jumper info
Tier 3 (Sensitive): Accessing medical info, generating financial reports
Tier 4 (Override): Waiver retractions, safety investigations, payout overrides
Tier 3 and Tier 4 operations require MFA verification within the past 15 minutes. Tier 4 also logs the user’s justification and triggers automated compliance review. This design protects against token theft—an attacker with a stolen access token cannot approve a waiver retraction without the user’s second factor.
### Temporal Permissions
Temporary roles auto-expire, useful for onboarding contractors or seasonal staff. Example: “Temporary Safety Officer (valid until 2026-12-31)”. The database stores expiry timestamps; authorization middleware checks expiry on every request. Expired roles are silently ignored (not revoked), simplifying cleanup.
## 37.4 Data Encryption
### Encryption at Rest
MySQL InnoDB Tablespace Encryption (TDE) encrypts all table data at the storage layer using AES-256. This protects against direct disk theft. S3 buckets (for waiver PDFs, incident photos) use SSE-S3 with AWS-managed keys.
### Application-Level Encryption
Beyond storage encryption, sensitive fields use application-level encryption:
Envelope encryption: application encrypts data with a Data Encryption Key (DEK), sends DEK to AWS KMS for encryption, stores ciphertext DEK alongside encrypted data. Decryption requires KMS call, ensuring CloudTrail audit trail.
Deterministic encryption (for searchable PII): same plaintext always produces same ciphertext, enabling database queries like “FIND users WHERE encrypted_email = ENC(input)”. Uses AES in SIV mode; weaker than standard encryption but necessary for search.
### Key Management
AWS KMS manages all Data Encryption Keys
Key rotation every 90 days (automatic with KMS)
CloudTrail logs all KMS operations for compliance audit
Access restricted via IAM: only app server EC2 role can decrypt
### In-Transit Encryption
TLS 1.3 mandatory for all network communication. HSTS header enforces HTTPS for 1 year (includeSubdomains). Mobile apps pin certificates to prevent CA compromise attacks. Websockets (for real-time manifest updates) upgrade from HTTPS to WSS.
## 37.5 API Security
### Input Validation
Every endpoint defines a TypeBox schema specifying expected request shape, types, and constraints. Fastify middleware validates the incoming body against the schema before the handler executes. Unknown properties are rejected (strict mode). This prevents “field injection” attacks where attackers add extra fields hoping for unexpected behavior.
### Rate Limiting
Redis-backed sliding window rate limiter. Three limiting tiers:
Per-user: 100 requests/minute (authenticated)
Per-IP: 30 requests/minute (unauthenticated, signup, login)
Per-endpoint: 1000 requests/minute (manifest generation, most expensive operation)
Exceeded limits return HTTP 429. Clients implement exponential backoff with jitter. DDoS detection triggers if a single IP exceeds 10,000 requests/minute (auto-block via WAF).
### Webhook Security
Stripe and other webhooks are signed with HMAC-SHA256. SkyLara endpoint verifies the signature before processing (Stripe SDK handles). Webhooks include a timestamp; if older than 5 minutes, they’re rejected (prevents replay). Idempotency keys ensure that duplicate Stripe events (network retry) don’t double-charge users.
## 37.6 Multi-Tenancy Security
SkyLara isolates each dropzone’s data at the row level. Every table has a dropzone_id column. Every query is filtered: WHERE dropzone_id = ?. The JWT contains the user’s dropzone_id; middleware validates that request parameters match the token’s dropzone_id before processing.
### Cross-Tenant Access Prevention
Scenario: User attempts to fetch /manifests/456 for dropzone 789, but their JWT is for dropzone 123. Middleware compares dropzone_id in URL path with dropzone_id in JWT. Mismatch triggers 403 Forbidden. This design prevents horizontal privilege escalation—a user cannot craft a request to view another DZ’s manifests.
### Super-Admin Bypass
SkyLara admins (small company staff) require emergency access to customer dropzones for support. A super-admin flag in JWT allows bypassing dropzone_id checks, but every such access is logged with the admin’s ID, timestamp, action, and IP. Automated alerts trigger if a super-admin accesses the same dropzone more than twice in 24 hours.
### Database Isolation (Optional)
Future scaling option: connection pool per dropzone, separate database replicas for high-volume DZs. Current single-database approach is simpler and sufficient; multi-database adds operational complexity and cross-database consistency issues.
## 37.7 Financial Security (Stripe)
Stripe handles PCI DSS compliance; SkyLara never stores raw card numbers. However, the platform still must prevent payment fraud and unauthorized refunds.
### Idempotency & Webhooks
Every payment operation (charge, refund, payout) includes an idempotency key. If the network times out and the client retries, Stripe returns the same result (no double-charge). Webhook signatures verify authenticity; SkyLara processes each webhook exactly once using a received_webhook_id deduplication table.
### Connected Accounts
Stripe Connect allows manifest managers to receive direct payouts. Before activation, the system verifies the business is registered, the bank account is linked, and the user passes identity verification (Stripe handles KYC). Payouts are delayed 7 days to allow reversal of chargebacks.
### Refund Authorization Limits
Role-based refund caps prevent unauthorized refunds:
Manifest: Can refund own manifest jumpers, capped at $100/transaction
Operator: Can refund any manifest, capped at $500/transaction
Admin: Unlimited refunds, but all require business justification
### Payout Fraud Detection
Unusual payout patterns (e.g., manifest manager requesting $50K payout after 2 days of activity) trigger automated review: a SkyLara admin must approve before Stripe processes the payout. Machine learning (future feature) detects account takeover patterns—sudden spike in refund requests, unusual recipient countries, etc.
## 37.8 Infrastructure Security
### AWS Architecture
VPC with public/private subnets: web tier in public subnets (behind ALB), database/Redis in private subnets
Network ACLs restrict traffic: only ALB can reach app servers, only app servers can reach database
Security groups: 443/80 to ALB, 3306 (MySQL) from app servers only, no direct admin SSH
### Secrets Management
AWS Secrets Manager stores all secrets (database password, API keys, JWT signing keys). Applications fetch secrets on startup and cache for 1 hour. Rotation is automatic for database credentials (Secrets Manager patches the database user’s password weekly). No secrets in environment variables or config files.
### Container Security
Base image: alpine:latest (minimal, frequently patched)
Non-root user: container runs as appuser UID 1000
Read-only filesystem: /app is read-only except /tmp for logs
Image scanning: Snyk scans every image before ECR push, blocking critical CVEs
### WAF & DDoS Protection
AWS WAF sits in front of CloudFront. Managed rule groups include:
SQL injection detection: blocks requests with SQL metacharacters in suspicious patterns
XSS detection: blocks script tags and JavaScript event handlers
Credential stuffing: blocks rapid login attempts from the same IP
Bot control: identifies and rate-limits automated scrapers
AWS Shield Standard (free) protects against volumetric DDoS attacks (SYN floods, UDP floods). Shield Advanced (optional, $3K/month) adds sophisticated attack detection and DDoS response team support.
## 37.9 Incident Response Security
Security incidents are classified by severity and response time:
### Response Playbooks
Each severity has a documented playbook: who to contact, what to check, evidence to preserve, communication template. P1 Data Breach playbook: (1) Isolate affected systems, (2) Preserve logs, (3) Notify legal, (4) Calculate impact scope (how many users, what data), (5) Notify affected users per GDPR 72-hour requirement.
### Audit & Forensics
All API requests log: timestamp, user_id, method, endpoint, status_code, IP, user_agent, response_time. Login attempts log: timestamp, username, success/failure, IP, MFA status. Database schema changes log: script name, user, timestamp, DDL statement. Logs are immutable: written to S3 with Object Lock (cannot delete for 2 years). CloudWatch Logs exports to S3 every hour.
## 37.10 Penetration Testing Strategy
### Testing Schedule
Pre-launch (Month 8): Full penetration test by external firm (~$30K budget)
Quarterly: Automated OWASP ZAP scanning of API endpoints
Quarterly: npm audit, Snyk for dependency vulnerabilities
Annual: Full penetration test + SOC2 Type II audit
### Scope
Penetration tests cover API endpoints (authentication, authorization, injection), web application (XSS, CSRF, session fixation), mobile app (certificate pinning bypass, local storage leakage), and infrastructure (AWS misconfigurations, exposed secrets). Tests are conducted against production-like environments (separate staging), not live production.
## 37.11 Compliance Matrix
GDPR Data Processing Agreement (DPA) is signed with customers (DZs). The DZ is data controller; SkyLara is data processor. Customers have right to request export of their data in GDPR-defined format; SkyLara provides bulk export within 30 days. Deletion requests are logged and processed within 72 hours (but FAA retention overrides for safety records).
## 37.12 Brutal Honesty
Security is a cost center. Every hour spent securing edge cases is an hour not building booking flows or payment features. Hard trade-offs are inevitable:
Small team + complex security = gaps. Prioritize: data theft > unauthorized access > DoS > info disclosure
MFA adoption by DZ staff approaches zero unless mandated. Friction is real; most dropzones are small, under-staffed, and impatient with 2FA.
JWT refresh rotation edge cases will cause support tickets. Users logging in on laptop, then phone, then clearing cookies—session states get confusing.
Cross-tenant bugs are the #1 existential risk for multi-tenant SaaS. One accidental WHERE dropzone_id = 1 becomes “how much data did we leak?”
Encrypted search for PII is slow. You will be tempted to skip it for email addresses. Don’t.
Penetration testing by a reputable firm costs $15-50K per engagement. Budget for it in year 1.
You will ship a SQL injection vulnerability. The question is when you discover it—in your own code review or in a production incident.
Third-party OAuth adds complexity (Google/Apple tokens, scopes, edge cases). Consider whether convenience justifies the surface area.
Security maturity is a journey. Month 1 focus: strong passwords, HTTPS, basic input validation. Month 3: RBAC, audit logging. Month 6: MFA, encryption at rest. Month 12: advanced threat detection, penetration testing. Revisit threat model annually as the platform scales and new features emerge.
The goal is not perfection. The goal is acceptable risk: proportional to the threat landscape, justified by business value, and communicated honestly to users and regulators.
# CHAPTER 38: DEVOPS, CI/CD & DEPLOYMENT PIPELINE
## 38.1 Infrastructure Architecture Overview
SkyLara’s infrastructure spans three AWS regions with a primary deployment in us-east-1 (data residency + low latency for North American DZs), a secondary region eu-west-1 for GDPR compliance, and a planned expansion to me-south-1 for Middle Eastern and African markets. The architecture prioritizes reliability over cost—infrastructure failures mean missed jumps, liability, and erosion of trust.
### AWS Region Strategy
us-east-1: Primary region. All production data, warm standby for active failover.
eu-west-1: Secondary region. Read replicas of RDS, S3 cross-region replication, GDPR data residency.
me-south-1: Planned. Future region for MENA expansion (DZ growth in UAE, Saudi Arabia).
### VPC Design
Public subnet: NAT Gateway, Application Load Balancer (ALB), elastic IPs.
Private subnet: ECS tasks, RDS, ElastiCache, VPC endpoints for S3/CloudWatch.
Cross-AZ redundancy: Minimum 2 AZs per service for auto-failover.
### Service Topology Diagram
### AWS Services Summary
## 38.2 Repository & Monorepo Structure
SkyLara uses Turborepo to manage dependencies across API, web, and mobile applications. This monorepo structure enables shared TypeScript types, UI components, and utility functions while maintaining clear package boundaries and independent deployment cycles.
### Monorepo Layout
### Package Responsibilities
## 38.3 CI/CD Pipeline Design
GitHub Actions orchestrates the entire CI/CD pipeline. Every push to a feature branch triggers lint, type-check, and unit tests. Merges to develop auto-deploy to staging; merges to main require approval and trigger production deployment.
### Branch Strategy
main: Production. Protected branch. Requires 1 approval, all checks green.
develop: Staging. Auto-deploys on merge. Used for integration testing.
feature/*: Feature branches. Create PRs against develop.
hotfix/*: Emergency fixes. Branch from main, PR against both main and develop.
### GitHub Actions Workflow (Abbreviated)
### Pipeline Stages
## 38.4 Environment Management
Four environments ensure safety and observability. Local development uses Docker Compose. Dev auto-deploys from develop branch for fast feedback. Staging mirrors production data for integration testing. Production requires manual approval and uses blue-green deployments.
### Environment Matrix
### Feature Flags
Feature flags enable safe rollout of risky changes. Use LaunchDarkly (SaaS) or a custom Redis-backed solution. Flags are evaluated server-side and passed to frontends via API response. Flag rules support percentage rollout (10% → 50% → 100%), user targeting, and gradual migration.
Example: Feature flag “new-payment-flow” rolls out to 10% of users daily, monitored for errors.
Rollback: Flip flag to false instantly, no redeploy.
## 38.5 Docker & Container Strategy
Every service runs in Docker. Multi-stage builds minimize image size. Alpine Linux reduces attack surface. Health checks ensure orchestrator detects failed containers. All containers run as non-root users.
### Production Dockerfile (API)
### Image Size Targets & Security
API image: < 150 MB (gzipped ~50 MB)
Web image: < 200 MB (served via CloudFront)
Non-root user: nodejs (UID 1001) for least privilege
Read-only filesystem: /tmp writable only if needed
No shell in production: Remove sh, bash from runtime image
## 38.6 Database Migration Strategy
Knex.js handles all database schema changes. Migrations are timestamped, idempotent, and forward-only. Zero-downtime migrations use the expand-contract pattern: add new column, backfill, switch code, drop old column (across multiple deployments).
### Example Migration: Zero-Downtime Rename
In a follow-up deployment: switch code to read/write email_new only, then drop email column. This takes 2–3 deployments but achieves zero downtime.
### Migration Risk Assessment
## 38.7 Deployment Strategy
Staging and production use blue-green deployments. Two ECS task sets run simultaneously. Traffic switches after new tasks pass health checks. Canary deployments (10% → 100%) protect against risky changes. Mobile apps use Expo Updates for JS changes and TestFlight for native changes.
### ECS Task Definition (Abbreviated)
### Deployment Types
## 38.8 Monitoring & Alerting
Multi-layered observability: CloudWatch for infrastructure, Prometheus for application metrics, Sentry for errors, OpenTelemetry for distributed tracing. Dashboards aggregate all signals into a single ops view.
### Key Metrics
p99 latency: target < 500 ms (API), < 2 s (web)
Error rate: target < 0.5% (API), < 1% (web)
Active connections: monitor for connection exhaustion
Database query time: p95 < 100 ms, monitor for N+1 queries
Cache hit ratio: Redis, target > 80% for session store
CPU / memory: ECS tasks, trigger scaling at 70%
### Alert Tiers
### Sample Alert Rules
API p99 latency > 1000 ms for 5 min: P2 alert
Error rate > 5% for 2 min: P1 alert, auto-rollback
RDS CPU > 80% for 10 min: P2 alert, scale read replicas
Redis evictions > 100/sec: P2 alert, increase memory
## 38.9 Scaling Strategy
Horizontal scaling via ECS auto-scaling. Database scaling via read replicas and connection pooling. CDN caching reduces API load. WebSocket sticky sessions and Redis pub/sub enable real-time features across instances.
### Scaling Triggers & Actions
### Cost Optimization
Reserved instances: Buy 1-year RDS + ECS reservations (40% savings)
Spot instances: Use for batch jobs, non-critical tasks (70% savings)
Right-sizing: Monitor actual usage, downsize overprovisioned instances
CloudFront caching: Set aggressive TTLs for static assets (reduce S3 + ALB load)
## 38.10 Disaster Recovery
RPO (Recovery Point Objective): 1 hour. RTO (Recovery Time Objective): < 30 minutes. Multi-AZ RDS with automatic failover. Cross-region S3 replication. Quarterly failover drills.
### DR Targets & Mechanisms
### Disaster Recovery Runbook
Detect failure: CloudWatch alert + PagerDuty page
Assess scope: Check RDS, Redis, ECS health
Failover: If primary AZ down, promote standby (automatic)
Restore data: Point-in-time recovery from snapshot (< 10 min)
Switch DNS: Update Route 53 to secondary region (< 2 min)
Validate: Run health checks, smoke tests
Notify: Page CTO, post incident channel, plan post-mortem
## 38.11 Cost Estimation
MVP infrastructure runs in us-east-1 with single-AZ resources (acceptable for startup risk tolerance). Estimated monthly cost: ␉985–1,850. Scaling costs grow sub-linearly due to efficiencies (bulk pricing, caching).
### Cost Breakdown (MVP, Monthly)
### Scaling Cost Projections
## 38.12 Brutal Honesty
DevOps is where theory meets reality. Here’s what you won’t hear in tutorials.
AWS costs surprise everyone. Budget 2x your estimate on day one. They’ll surprise you twice: once on month 1, again on month 3 when you scale.
Docker build caching breaks constantly. When you add a dependency, your entire image rebuilds. This costs time and CI minutes. Invest in layer caching strategy early.
Zero-downtime migrations sound great until you’re 2 AM Tuesday morning with a botched backfill. You will have brief downtime. Plan for it. Accept it. Communicate it.
Monitoring fatigue is real. Too many alerts = all alerts ignored. Start with 5 critical alerts. Add 1 more per quarter. Tune aggressively.
Infrastructure as code sounds utopian until your Terraform state file corrupts. Back it up. Use S3 remote state. Test your disaster recovery plan.
Mobile OTA updates break in production more than you expect. Expo Updates are powerful but can leave users stuck. Always have a rollback plan. Always test in staging.
You don’t need Kubernetes. ECS Fargate is simpler, cheaper, and sufficient for years. Over-engineering here wastes time.
Staging is always broken. It’s not an exact production clone. It’s a staging environment. Bugs will leak to production. Accept it. Invest in good observability instead.
Your database will become the bottleneck. Read replicas and caching help, but schema design matters more. Profile slow queries relentlessly.
Feature flags look simple until you have 200 of them. Invest in a flag management system early (LaunchDarkly or custom). Archive old flags ruthlessly.
DevOps is unglamorous, necessary, and worth doing well. Invest in it early. Your SRE team (even if that’s just you) will thank you at 3 AM when the pager goes off.
# CHAPTER 39: TESTING STRATEGY & QUALITY ASSURANCE
## 39.1 Testing Architecture Overview
SkyLara employs a disciplined test pyramid: 70% unit tests, 20% integration tests, 10% end-to-end tests. This ratio balances coverage, speed, and maintenance burden.
Core testing tools: Vitest for unit/integration tests, Supertest for API endpoint testing, Playwright for web e2e, Detox for mobile e2e. All tests run in CI on every commit.
Test environment: GitHub Actions triggers tests on PR. Staging environment validates releases. Production has canary deployments for gradual rollout.
## 39.2 Unit Testing Strategy
Target coverage: 80% overall, 100% for safety-critical modules (LoadFSM, CGCalculator, WaiverEngine, EmergencyActivation).
What to test:
Service business logic (manifest creation, booking state transitions, payment processing)
Validators (aircraft weight limits, waiver expiry, gear certification, license validity)
FSM transitions (LoadFSM state changes, invalid transitions rejected)
Calculations (center of gravity, landing zone radius, reserve deployment altitude)
Mocking strategy: Mock database, cache, external APIs at unit level. Use dependency injection for clean test isolation.
Example test: LoadFSM validation
Example test: CGCalculator edge cases
## 39.3 Integration Testing
Integration tests use real database (test containers with PostgreSQL), Stripe test mode, real Redis cache. Tests run against exact production schema.
Test scenarios:
API endpoint tests: manifest creation, load booking, payment processing, with valid/invalid data
Multi-tenant isolation: verify one DZ cannot see another DZ’s data
Authentication flows: login, USPA verification, license checks
WebSocket real-time: manifest updates, instructor notifications
Stripe webhooks: payment.success, charge.refunded, subscription.updated
Integration test example:
## 39.4 End-to-End Testing
Playwright tests simulate real user flows in Chrome. Run against staging environment post-deployment.
Web test scenarios:
Jumper manifest signup flow
Instructor load creation and manifest closing
Admin waiver review and approval
Payment checkout and refund
Mobile test scenarios (Detox for iOS/Android):
Check-in scan QR code
Offline mode: local cache survives 30 min offline, syncs on reconnect
Push notifications: receive and tap landing zone alert
E2E example (Playwright):
## 39.5 Safety-Critical Testing
Extra rigor applied to modules that affect jumper safety. 100% coverage, exhaustive edge case testing, peer review required.
Safety-critical test matrix:
## 39.6 Performance & Load Testing
k6 load tests run nightly. Baseline: 100 concurrent users, 500 manifest operations/day, p99 latency < 500ms.
Load test scenarios:
Manifest creation under concurrent load (100 users, ramp-up 5s)
WebSocket broadcast: 10,000 simultaneous manifest updates
Payment processing: Stripe API calls with queue depth
Performance targets:
## 39.7 Security Testing
OWASP ZAP automated scans run in CI. npm audit and Snyk scan dependencies. Manual penetration tests quarterly.
Security test coverage:
Cross-tenant access: DZ1 cannot read DZ2 manifests
SQL injection: parameterized queries, input validation tested
Auth bypass: token expiry, invalid JWTs rejected
Privilege escalation: jumper cannot approve own waiver
CSRF tokens validated on all POST/PUT/DELETE
## 39.8 Mobile Testing
Device matrix: iOS 15+ (iPhone 12, 13, 14 Pro), Android 10+ (Samsung S20, Pixel 5). Tests on real devices via BrowserStack.
Mobile test scenarios: offline mode, push notifications, camera QR scan, biometric auth, background sync.
## 39.9 Test Data Management
Database factories generate realistic test data: jumpers, loads, bookings, instructors, waivers, payments.
Seeded test dropzone: DZ_TEST_001 with 100 jumpers, 3 aircraft, 50 historical loads, exact copy of production schema.
GDPR compliance: no real PII in test data. Use faker.js for names, emails, phone numbers. Reset database between test suites to prevent cross-contamination.
## 39.10 QA Process
PR review checklist: tests added, coverage maintained, manual testing on staging, no flaky tests, no console.log left behind.
Release candidate process: 2-day staging validation, all critical flows tested, performance baselines verified, security scan passed.
Bug severity: critical (safety issue, data loss), high (feature broken), medium (UI bug, slow), low (cosmetic).
Regression testing: smoke test suite on every release (50 critical scenarios, ~10 min runtime).
## 39.11 Brutal Honesty
100% code coverage is a lie. You get diminishing returns past 80%. Tests on edge cases nobody hits waste time.
Flaky tests will destroy team velocity. One test that fails 10% of the time randomly erodes trust. Delete it or fix the cause.
E2E tests are slow and expensive. Run sparingly. They catch real bugs, but they won’t catch everything.
Mobile testing on real devices is painful. Device labs are expensive. Many teams skip it until production breaks.
Load testing only matters if your scenarios match reality. Generic load tests lie. Model your actual peak traffic or don’t bother.
Most teams skip security testing. That’s how breaches happen. Make it non-negotiable in release criteria.
# CHAPTER 40: THIRD-PARTY INTEGRATION CONTRACTS
## 40.1 Integration Architecture Overview
Every third-party integration uses the adapter pattern. Abstracts API details behind a clean interface. Enables easy swap of providers (Stripe → Square, Twilio → Telnyx).
Reliability patterns: circuit breaker (fail fast if provider is down), retry with exponential backoff (max 3 retries), fallback strategies (cache old data, manual override).
Health checks: HTTP GET to each integration’s status page. Alert on Slack if SLA violated (> 2 consecutive failures).
## 40.2 Stripe Connect Integration (Deep)
Stripe Connect architecture: DZ operators open Express accounts (simplified KYC). SkyLara platform holds Standard account (full reserve). Platform collects 3% fee, remits DZ balance via automatic payouts (weekly).
Onboarding flow: DZ admin clicks "Connect Stripe", redirected to Stripe-hosted OAuth flow. Admin authorizes. Receives stripeAccountId. Store in database. Test Stripe Express account creation on staging with test credentials.
Payment intent flow: Jumper pays $199 → create PaymentIntent with stripeAccount=DZ.stripeAccountId, fee_percent=3. On success, Stripe auto-deposits to DZ account (minus platform fee). Captures in SkyLara ledger.
Refunds: if manifest cancelled within 24hr, refund jumper and DZ (less platform fee). Trigger via refund() webhook. Max refund delay: 5 business days.
Subscription billing (for DZ monthly ops fee): recurring ChargeCard with fixed amount. Retry on decline (up to 4 times), email alerts on failure.
TypeScript StripeService:
## 40.3 Twilio Integration
Twilio sends SMS and WhatsApp messages. Cost: $0.0075/SMS in US, $0.02/WhatsApp.
Message types: verification codes (2FA), booking confirmations, waiver reminders, emergency alerts, instructor notifications.
WhatsApp Business API: requires pre-approval of message templates by Meta. Lead time: 2-4 weeks. Standard templates (booking confirmation, waiver expiry) pre-approved at launch.
Fallback chain: WhatsApp → SMS → email (if phone invalid). Test fallbacks with invalid number (should retry, then email).
Cost control: daily cap per DZ ($50/day default), exemptions for safety alerts (emergency activation, waiver expiry).
Twilio MessagingService (TypeScript):
## 40.4 Weather API Integration
OpenWeatherMap or WeatherAPI provides METAR, TAF, wind, visibility, ceiling. Polling: every 5 min for active DZ (has jump window open), hourly for inactive.
Wind thresholds: jump window auto-closes if gust > 20 knots. Mandatory manual re-open. Visibility < 3 SM also closes window.
Caching: Redis with 5 min TTL. If API fails, serve cached data (up to 1 hour old) with "cached" flag shown in UI.
Fallback: if all API calls fail and cache empty, show manual entry form (instructor inputs wind speed, direction, visibility). Used for remote DZs without network.
## 40.5 Mapping & Geolocation
Google Maps Platform or Mapbox. Features: DZ location display, off-landing tracker (GPS breadcrumb), hospital proximity (radius search), airspace visualization (restricted areas, MOAs).
Geocoding: convert address to lat/lon. Used for jumper address entry, landing zone mapping.
Cost: $5-10K/month at scale (100K map loads, 10K geocode calls). Use quotas and rate limiting per DZ.
GeoService (TypeScript):
## 40.6 Email Service
SendGrid or AWS SES. Transactional emails: booking confirmation, waiver reminder (24hr before jump), password reset, DZ statements, payment receipts.
Email types: operational (booking, payment), safety (waiver expiry, med cert expiry), marketing (DZ newsletter, opt-in required).
Template management: 20+ templates stored in SendGrid, versioned. HTML + text variants. Fallback to AWS SES if SendGrid rate-limited.
Deliverability: monitor bounce rate (< 0.5%), complaint rate (< 0.1%). Unsubscribe compliance: CAN-SPAM (physical address in footer), GDPR (explicit opt-in for marketing).
## 40.7 Push Notification
Firebase Cloud Messaging (FCM) for Android, APNs for iOS (via FCM bridge). Notification categories: operational (booking updated, manifest closing), safety (jump window closing, waiver expiry alert), marketing (DZ promo, opt-in).
Badge management: badge_count incremented on unread notification. Cleared when app opened.
Silent push: background data push for auto-sync (manifest updated, new load available). 30 sec processing window on iOS, longer on Android.
PushService (TypeScript):
## 40.8 License Verification APIs
USPA member lookup: check jumper license against USPA registry. If API unavailable, manual verification (user uploads photo of license, staff reviews).
IACRA (FAA pilot lookup): verify skydive pilot credentials. Public API available. Query by certificate number.
Other orgs (BPA, APF, FFP): no public APIs. Manual verification required. Cache result 30 days (credentials don’t change daily).
Caching: 24 hr for active/valid license, 30 days for expired (requires refresh before next jump).
## 40.9 Cloud Storage (AWS S3)
S3 stores: waivers (PDF), jumper photos, aircraft docs, incident reports, backup database exports.
Lifecycle policies: keep in S3 Standard for 1 year, move to Glacier for archive (cost $0.004/GB/month vs $0.023). Expire after 10 years.
Signed URLs: generate time-limited download links (5 min expiry) for waiver PDFs. User cannot guess or share.
CloudFront CDN: cache waivers and static assets. 99.99% uptime SLA. Automatic DDoS mitigation via AWS Shield.
## 40.10 Integration Monitoring & Alerting
Health dashboard: per-integration status (OK/degraded/down), latency p50/p95/p99, error rate, last success time.
Alerting: if integration returns > 5% error rate for 5 consecutive minutes, page on-call engineer. Severity: critical (payment failure), high (weather API down), medium (email delivery slow).
Cost tracking: daily cost per integration. Alert if daily spend > 110% of budget (price increase or unusual load).
## 40.11 Brutal Honesty
Stripe Connect onboarding is a nightmare. Expect 30% drop-off at KYC step. DZ operators see "verify identity" and abandon. Build drip email campaign to re-engage.
WhatsApp Business API approval takes 2-4 weeks and Meta rejects 30% first time for vague reasons. Start process before launch.
Weather APIs disagree with each other. OpenWeatherMap vs WeatherAPI vs AVWX will show different wind speeds at same location. Use multiple sources, average if divergent.
USPA has no public API. You will scrape their website (fragile) or manually verify (expensive). Budget $5K/month for manual QA staff if scaling.
Google Maps is expensive at scale. 100K map loads/month = $7-10K bill. Implement client-side caching aggressively. Consider Mapbox open-source tiles as cheaper alternative.
Every third-party is a single point of failure. Stripe down = nobody pays. Twilio down = nobody gets SMS alerts. Build fallbacks. Test them. Actually test them, don’t assume they work.

| Principle | Rationale |
| --- | --- |
| REST for CRUD | Simple resource management (loads, jumpers, bookings) with standard HTTP semantics |
| WebSocket for real-time | Manifest updates, load status changes, and weather holds require <200ms latency |
| Fastify + TypeBox | Schema validation at routing layer, zero-cost abstractions, ~40% faster than Express |
| Versioned URLs (/api/v1/) | No need for major version header; easier load balancing and canary deployments |
| Semver Accept header | Clients can request future patch versions; deprecated features return 410 Gone |
| JWT + refresh tokens | Stateless auth; access tokens expire in 15 minutes, refresh in 7 days |
| API keys for integrations | Third-party apps (PPC booking sites) use scoped keys instead of user credentials |
| Response envelope | { success, data, error, meta } — consistent across all endpoints, easier parsing |

| Request: {   "email": "alice@dropzone.com",   "password": "SecurePass123!" }  Response (200): {   "success": true,   "data": {     "accessToken": "eyJhbGc...",     "refreshToken": "rt_xyz...",     "expiresIn": 900,     "user": {       "id": "usr_123",       "email": "alice@dropzone.com",       "roles": ["operator", "manifest"],       "dzId": "dz_456"     }   } } |
| --- |

| Response (200): {   "success": true,   "data": {     "accessToken": "eyJhbGc...",     "expiresIn": 900   } } |
| --- |

| Endpoint | Method | Auth Required | Rate Limit | Error Codes |
| --- | --- | --- | --- | --- |
| /auth/login | POST | No | 100/min | 401001, 401002, 429 |
| /auth/refresh | POST | No | 500/min | 401003, 429 |
| /auth/logout | POST | Yes (JWT) | 1000/min | 401004 |
| /auth/register | POST | No | 10/min | 409001, 422 |
| /auth/forgot-password | POST | No | 5/min | 404001 |
| /auth/reset-password | POST | No | 10/min | 401005, 410 |
| /auth/verify-email | POST | No | 10/min | 401006, 410 |

| Query params:   status=OPEN|FILLING|LOCKED|30MIN|20MIN|10MIN|BOARDING|AIRBORNE|LANDED|COMPLETE|CANCELLED   aircraftId=ac_123   departureAfter=2026-04-07T14:00:00Z  Response (200): {   "success": true,   "data": [     {       "loadId": "load_789",       "loadNumber": 42,       "dzId": "dz_456",       "aircraftId": "ac_001",       "status": "FILLING",       "slots": [         { "slotId": "slot_111", "jumperId": "usr_222", "role": "athlete" },         { "slotId": "slot_112", "jumperId": "usr_333", "role": "student" },         { "slotId": "slot_113", "jumperId": "usr_444", "role": "instructor" }       ],       "cg": { "weight": 785, "arm": 312.5, "cgPercent": 22.1 },       "scheduledDeparture": "2026-04-07T15:00:00Z",       "actualDeparture": null,       "actualLanding": null,       "createdBy": "usr_123",       "createdAt": "2026-04-07T14:15:00Z"     }   ],   "meta": { "page": 1, "total": 8 } } |
| --- |

| Request: {   "aircraftId": "ac_001",   "scheduledDeparture": "2026-04-07T15:00:00Z",   "maxSlots": 16,   "notes": "Clear skies, light wind" }  Response (201): {   "success": true,   "data": {     "loadId": "load_789",     "status": "OPEN",     "slots": [],     "createdAt": "2026-04-07T14:15:00Z"   } } |
| --- |

| Request: {   "jumperId": "usr_222",   "role": "student",   "instructorId": "usr_444",   "exitOrder": 3 }  Response (201): {   "success": true,   "data": {     "slotId": "slot_112",     "jumperId": "usr_222",     "role": "student",     "instructorId": "usr_444",     "status": "BOOKED",     "cgWeight": 180,     "cgArm": 98.2   } } |
| --- |

| Endpoint | Method | Auth Required | Roles | Rate Limit |
| --- | --- | --- | --- | --- |
| /dz/:dzId/loads | GET | Yes | all | 1000/min |
| /dz/:dzId/loads | POST | Yes | operator | 100/min |
| /dz/:dzId/loads/:id | PATCH | Yes | operator | 500/min |
| /dz/:dzId/loads/:id/slots | POST | Yes | manifest, operator | 1000/min |
| /dz/:dzId/loads/:id/slots/:slotId | DELETE | Yes | manifest, operator | 500/min |
| /dz/:dzId/loads/:id/manifest-group | POST | Yes | manifest, operator | 200/min |
| /dz/:dzId/loads/:id/cg | GET | Yes | all | 5000/min |

| Request: {   "jumperId": "usr_222",   "type": "tandem_jump",   "quantity": 1,   "priceUSD": 225.00,   "notes": "Customer prefers morning slot" }  Response (201): {   "success": true,   "data": {     "bookingId": "bk_555",     "status": "PENDING_PAYMENT",     "chargeUrl": "https://checkout.stripe.com/pay/cs_...",     "expiresAt": "2026-04-08T14:15:00Z"   } } |
| --- |

| Connect: wss://api.skylara.com/ws?token=eyJhbGc...&dzId=dz_456  Subscribe (send from client): {   "action": "subscribe",   "channels": ["manifest:dz_456", "weather:dz_456", "safety:dz_456"] }  Event from server: {   "type": "load.updated",   "channel": "manifest:dz_456",   "payload": {     "loadId": "load_789",     "status": "BOARDING",     "updatedAt": "2026-04-07T14:45:00Z"   },   "timestamp": "2026-04-07T14:45:00Z",   "sequence": 1234 } |
| --- |

| Event | Channel | Payload Keys | Latency |
| --- | --- | --- | --- |
| load.created | manifest | loadId, status, slots | <100ms |
| load.updated | manifest | loadId, status, cg | <100ms |
| slot.added | manifest | loadId, slotId, jumperId | <100ms |
| slot.removed | manifest | loadId, slotId | <100ms |
| cg.warning | manifest | loadId, cgPercent, status | <100ms |
| weather.updated | weather | temp, wind, clouds, holds | 5s |
| incident.reported | safety | incidentId, type, dzId | <200ms |
| emergency.activated | safety | dzId, activatedBy, reason | <50ms |

| Error response (400, 401, 404, 422, 429, 500): {   "success": false,   "error": {     "code": "422001",     "message": "Validation failed",     "details": [       {         "field": "scheduledDeparture",         "reason": "must be in future",         "value": "2026-04-06T14:00:00Z"       }     ],     "requestId": "req_abc123def456"   } }  Rate limit error (429): {   "success": false,   "error": {     "code": "429001",     "message": "Rate limit exceeded",     "details": { "retryAfter": 60 }   } } |
| --- |

| Code | HTTP | Meaning | Example |
| --- | --- | --- | --- |
| 401001 | 401 | Invalid credentials | Wrong password |
| 401002 | 401 | Token expired | Access token >15min old |
| 401003 | 401 | Refresh token invalid | Refresh token revoked or expired |
| 403001 | 403 | Insufficient role | Non-operator trying to create load |
| 404001 | 404 | Jumper not found | GET /api/v1/jumpers/usr_999 |
| 404002 | 404 | Load not found | GET /api/v1/dz/dz_456/loads/load_999 |
| 409001 | 409 | Email already registered | POST /auth/register with duplicate |
| 409002 | 409 | Load locked | POST /slots to BOARDING load |
| 422001 | 422 | Validation failed | scheduledDeparture in past |
| 429001 | 429 | Rate limit exceeded | 1001 requests in 1 minute |

| Threat Actor | Motivation | Attack Vector | Potential Impact |
| --- | --- | --- | --- |
| External attacker | Financial gain, reputation | SQL injection, API abuse | Data breach, payment fraud |
| Disgruntled employee | Sabotage, data theft | Elevated privileges abuse | Cross-tenant data exfiltration |
| Malicious DZ admin | Insurance fraud, embezzlement | Payment manipulation, waiver falsification | Financial loss, legal liability |
| Competitor | IP theft, sabotage | OSINT, supply chain | Feature copying, reputational damage |

| Layer | Controls | Key Technology | Failure Mode |
| --- | --- | --- | --- |
| Network | TLS 1.3, VPC, security groups, WAF | AWS WAF, CloudFront | Man-in-middle, network reconnaissance |
| API Gateway | Rate limiting, request signing, CORS | Redis sliding window, HMAC | Brute force, API abuse, origin spoofing |
| Application | Input validation, RBAC, session management | TypeBox, JWT, AuthService | Injection attacks, privilege escalation |
| Data | Encryption at rest/transit, key rotation | MySQL TDE, AWS KMS, AES-256 | Unauthorized data access, key compromise |
| Operations | Audit logging, incident response, compliance | CloudWatch, SIEM, playbooks | Undetected breaches, slow response |

| Token Type | Algorithm | Lifetime | Storage | Usage |
| --- | --- | --- | --- | --- |
| Access Token | RS256 (RSA public key) | 15 minutes | Memory (httpOnly cookie) | API authorization header |
| Refresh Token | HS256 (server secret) | 7 days | Database + httpOnly cookie | Obtain new access token |
| MFA Challenge Token | HS256 | 5 minutes | Redis (OTP attempts) | Proof of MFA completion |

| Field / Data Type | PII Classification | Encryption Type | Searchability |
| --- | --- | --- | --- |
| Emergency contact phone | High PII | Envelope (KMS) | No search required |
| Medical conditions | Health data (HIPAA) | Envelope (KMS) | No search required |
| Payment card tokens | PCI (via Stripe) | Envelope (KMS) | No search required |
| Email address | Medium PII | Deterministic (AES-SIV) | Exact match search |

| Attack Type | Vector | SkyLara Defense | Technology |
| --- | --- | --- | --- |
| SQL injection | Unsanitized queries | Parameterized queries only (Knex.js) | Query builder pattern |
| XSS | User input reflected in HTML | Output encoding, CSP headers | Helmet.js CSP |
| CSRF | State-changing from other origins | SameSite=Strict cookies, custom header | Token not needed |
| XXE | XML parsing | Disabled entity resolution | libxml2 config |
| Directory traversal | Path manipulation | Path.resolve() with chroot check | Node.js Path module |

| Severity | Definition | Response Time | Notification |
| --- | --- | --- | --- |
| P1 (Critical) | Data breach, unauthorized access, live attack | 15 minutes | CEO, legal, authorities |
| P2 (High) | Unauthorized system access, privilege escalation | 1 hour | Security team, management |
| P3 (Medium) | Vulnerability discovered, suspicious activity | 4 hours | Engineering team, optional disclosure |

| Regulation | Scope | SkyLara Status | Key Obligations |
| --- | --- | --- | --- |
| GDPR | EU users | In scope if any DZ has EU jumpers | Right to erasure, 72-hour breach notification, DPA |
| CCPA | California residents | In scope if any user is CA resident | Right to access/delete, opt-out sale |
| PCI DSS | Payment processing | Partially (Stripe is Level 1) | Contract attestation, incident response |
| FAA | Safety records | Mandatory (waivers, incident reports) | 7-year retention, accessible to FAA on request |

| ┌─────────────────────────────────────────────────────────────┐ │                        CloudFront CDN                         │ └────────────────┬────────────────────────────────┬────────────┘                  │                                │      ┌───────────▼──────────┐      ┌──────────────▼───────┐      │  Route 53 (DNS)      │      │  ALB (Load Balancer) │      └──────────────────────┘      └──────────────┬───────┘                                                    │               ┌────────────────────────────────────┼────────────────┐               │                                    │                │      ┌────────▼──────┐                  ┌─────────▼────┐   ┌──────▼─────┐      │ ECS Cluster   │                  │  WAF / Shield│   │  S3 / CF   │      │  (API Tasks)  │                  └──────────────┘   └────────────┘      └────────┬──────┘               │     ┌─────────┼──────────┐     │         │          │  ┌──▼──┐  ┌──▼──┐  ┌────▼────┐  │ RDS │  │Redis│  │ S3 / EBS │  └─────┘  └─────┘  └──────────┘  All private subnet resources are isolated from internet, accessed only through ALB and VPC endpoints. |
| --- |

| Service | Purpose | Est. Monthly Cost (MVP) |
| --- | --- | --- |
| ECS Fargate | API & background jobs | $200–400 |
| RDS Multi-AZ | MySQL 8.0 primary + replica | $300–500 |
| ElastiCache | Redis cluster (16GB) | $150–250 |
| ALB | Load balancing + SSL termination | $20–40 |
| CloudFront | CDN for static assets & API caching | $50–150 |
| S3 | User uploads, logs, backups | $30–80 |
| CloudWatch | Metrics, logs, dashboards | $50–100 |
| Route 53 | DNS | $5–10 |
| NAT Gateway | Outbound internet access | $80–120 |
| Data Transfer | Inter-region, egress fees | $100–200 |
| Total |  | $985–1,850/month |

| skylara/ ├── apps/ │   ├── api/                    # Fastify backend (Node.js 20) │   │   ├── src/ │   │   ├── Dockerfile │   │   ├── package.json │   │   └── tsconfig.json │   ├── web/                    # Next.js 14 frontend │   │   ├── src/ │   │   ├── package.json │   │   └── next.config.js │   └── mobile/                 # React Native + Expo │       ├── src/ │       ├── app.json │       └── package.json ├── packages/ │   ├── shared/                 # Utility functions (both backend & frontend) │   ├── db/                     # Knex migrations, seeds, query builders │   ├── types/                  # Shared TypeScript interfaces & enums │   ├── ui/                     # Reusable React components (web & mobile) │   └── auth/                   # JWT, OAuth, session management ├── scripts/ │   ├── deploy.sh │   ├── migrate.sh │   └── health-check.sh ├── turbo.json                  # Turborepo pipeline config ├── package.json                # Root workspace └── .github/workflows/           # CI/CD (GitHub Actions) |
| --- |

| Package | Responsibility | Dependencies |
| --- | --- | --- |
| shared | Utility functions, helpers, validators | none |
| db | Migrations, seeds, typed query builders | shared |
| types | TypeScript interfaces, enums (User, DZ, Event) | none |
| ui | React components (Button, Card, Modal) | types, shared |
| auth | JWT generation, OAuth providers, OIDC | types, shared |
| api | Fastify routes, controllers, middleware | db, types, auth, shared |
| web | Next.js pages, SSR, data fetching | types, ui, shared, auth |
| mobile | React Native screens, Expo plugins | types, ui, shared, auth |

| name: CI/CD on:   push:     branches: [main, develop, feature/*, hotfix/*]   pull_request:     branches: [develop, main]  jobs:   lint-and-test:     runs-on: ubuntu-latest     steps:       - uses: actions/checkout@v4       - uses: actions/setup-node@v4         with:           node-version: "20"       - run: npm ci       - run: npm run lint       - run: npm run type-check       - run: npm run test       - run: npm run test:integration    build:     needs: lint-and-test     runs-on: ubuntu-latest     steps:       - uses: actions/checkout@v4       - name: Build Docker image (API)         run: docker build -t $ECR_REPO:${{ github.sha }} ./apps/api       - name: Push to ECR         run: aws ecr push-image ...       - name: Build Next.js (web)         run: cd apps/web && npm run build       - name: Deploy static to S3         run: aws s3 sync ./apps/web/.next s3://$BUCKET    deploy-staging:     needs: build     if: github.ref == "refs/heads/develop"     runs-on: ubuntu-latest     steps:       - name: Update ECS service (staging)         run: aws ecs update-service --cluster staging --service api-service --force-new-deployment    deploy-production:     needs: build     if: github.ref == "refs/heads/main"     runs-on: ubuntu-latest     environment: production-deploy     steps:       - name: Update ECS service (production)         run: aws ecs update-service --cluster production --service api-service --force-new-deployment       - name: Health check         run: ./scripts/health-check.sh |
| --- |

| Stage | Duration | On Failure |
| --- | --- | --- |
| Lint | ~1 min | Block PR |
| Type-check | ~2 min | Block PR |
| Unit tests | ~5 min | Block PR |
| Integration tests | ~8 min | Block PR |
| Build | ~5 min | Block deployment |
| Deploy to staging | ~3 min | Alert oncall |
| Deploy to production | ~5 min | Rollback automatic |

| Environment | Deploy Trigger | Data | Access |
| --- | --- | --- | --- |
| Local | Docker Compose | Mock/seed | Developer machine |
| Dev | Auto (develop branch) | Shared test DB | Internal VPN |
| Staging | Manual promote | Production clone | Internal VPN |
| Production | Manual (main branch) | Live data | Rate-limited |

| # Build stage FROM node:20-alpine AS builder WORKDIR /build COPY package*.json ./ RUN npm ci --only=production COPY . . RUN npm run build  # Prune stage FROM node:20-alpine AS pruned WORKDIR /build COPY --from=builder /build/node_modules ./node_modules COPY --from=builder /build/dist ./dist RUN npm prune --omit=dev  # Runtime stage FROM node:20-alpine RUN addgroup -g 1001 -S nodejs RUN adduser -S nodejs -u 1001 WORKDIR /app COPY --from=pruned --chown=nodejs:nodejs /build/node_modules ./node_modules COPY --from=pruned --chown=nodejs:nodejs /build/dist ./dist USER nodejs EXPOSE 3000 HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \   CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode !== 200 && process.exit(1))" CMD ["node", "dist/index.js"] |
| --- |

| exports.up = async (knex) => {   // Step 1: Add new column (non-breaking)   await knex.schema.table("users", (table) => {     table.string("email_new", 255).nullable();     table.index("email_new");   });    // Step 2: Backfill (in batches to avoid locking)   const users = await knex("users").select("id", "email");   for (const user of users) {     await knex("users")       .where("id", user.id)       .update({ email_new: user.email });   }    // Step 3: Add constraint (app code now writes to both columns)   await knex.schema.table("users", (table) => {     table.unique("email_new");   }); };  exports.down = async (knex) => {   await knex.schema.table("users", (table) => {     table.dropColumn("email_new");   }); }; |
| --- |

| Migration Type | Risk | Approval |
| --- | --- | --- |
| Add column (nullable) | Low | Automated |
| Add index (background) | Medium | Tech lead |
| Drop column | High | CTO + 2x review |
| Rename column | High | CTO + 2x review |
| Change type (e.g., INT → VARCHAR) | Critical | CTO + staging validation |

| {   "family": "api-production",   "networkMode": "awsvpc",   "requiresCompatibilities": ["FARGATE"],   "cpu": "512",   "memory": "1024",   "containerDefinitions": [     {       "name": "api",       "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/skylara-api:latest",       "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],       "logConfiguration": {         "logDriver": "awslogs",         "options": {           "awslogs-group": "/ecs/api",           "awslogs-region": "us-east-1",           "awslogs-stream-prefix": "ecs"         }       },       "healthCheck": {         "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],         "interval": 30,         "timeout": 10,         "retries": 3,         "startPeriod": 40       },       "environment": [{"name": "NODE_ENV", "value": "production"}]     }   ] } |
| --- |

| Type | Use Case | Rollback Time |
| --- | --- | --- |
| Blue-green | Standard (API, web) | < 2 min (traffic switch) |
| Canary (10%) | Risky (payment logic) | < 5 min (flag flip) |
| Rolling | Safe (UI changes) | < 10 min (gradual) |
| Mobile (OTA) | JS fixes (Expo) | < 1 min (app restart) |
| Mobile (Store) | Native changes | 24–48 hours (app review) |

| Tier | Severity | Response SLA | Channel |
| --- | --- | --- | --- |
| P1 | Critical (outage) | 5 min | PagerDuty (page oncall) |
| P2 | High (degradation) | 30 min | Slack #devops-alerts |
| P3 | Medium (anomaly) | Next business day | Jira ticket |
| P4 | Low (info) | Logged | CloudWatch Logs |

| Metric | Threshold | Action |
| --- | --- | --- |
| ECS CPU | > 70% | Add 2 tasks (+20% capacity) |
| ECS Memory | > 85% | Add 2 tasks (+20% capacity) |
| Request count | > 1000 req/s | Add 3 tasks (+30% capacity) |
| RDS CPU | > 75% | Create read replica (if none) |
| RDS connections | > 80% of max | Enable ProxySQL connection pooling |
| Redis memory | > 85% | Scale to next cluster tier |
| ALB target latency | > 500 ms | Investigate code, not just scale |

| Component | Backup Method | RPO | RTO |
| --- | --- | --- | --- |
| RDS (primary) | Multi-AZ failover | 1 hour | < 5 min |
| RDS (secondary) | Cross-region snapshot | 6 hours | < 20 min |
| Redis | Multi-AZ cluster | 0 min | < 2 min |
| S3 user data | Cross-region replication | < 1 min | < 5 min |
| ECS tasks | Re-provision from image | 0 (stateless) | < 5 min |
| Full site | Switch DNS + promote replica | 1 hour | < 30 min |

| Component | Quantity | Unit Cost | Total |
| --- | --- | --- | --- |
| ECS Fargate | 2 tasks × 512 CPU, 1 GB RAM | $0.04/hour | $290 |
| RDS Multi-AZ | db.t3.medium (single-AZ MVP) | $180 | $180 |
| ElastiCache | 16 GB Redis cluster | $0.24/hour | $175 |
| ALB | 1 ALB + 100 GB data | $0.0225/hour | $35 |
| CloudFront | 10 GB egress + requests | $0.085/GB | $75 |
| S3 | 500 GB (logs + backups) | $0.023/GB | $50 |
| CloudWatch | Logs, metrics, dashboards |  | $75 |
| NAT Gateway | 1 gateway + 100 GB egress | $0.045/hour | $100 |
| Data transfer | Inter-region, external egress |  | $150 |
| Route 53 | 1 hosted zone + queries |  | $5 |
| Total |  |  | $1,135 |

| Scale | DZs | Users | Est. Monthly Cost |
| --- | --- | --- | --- |
| MVP | 1 | 100 | $1,135 |
| Series A | 10 | 5K | $4,500–6,000 |
| Series B | 100 | 50K | $15,000–20,000 |
| Scale | 500+ | 500K+ | $50,000–80,000 |

| describe("LoadFSM Transitions", () => {   it("rejects transition from CLOSED to INBOUND", () => {     const load = { state: "CLOSED", ... };     const result = LoadFSM.transition(load, "INBOUND");     expect(result.ok).toBe(false);     expect(result.error).toContain("invalid transition");   });   it("allows transition from LOADING to MANIFESTED", () => {     const load = { state: "LOADING", ... };     const result = LoadFSM.transition(load, "MANIFESTED");     expect(result.ok).toBe(true);   }); }); |
| --- |

| describe("CGCalculator Safety", () => {   it("handles max weight (10,000 lbs) correctly", () => {     const result = CGCalculator.compute({       aircraft: "KING_AIR_350",       jumpers: [{weight: 5000}, {weight: 5000}],       cargo: 0     });     expect(result.cg).toBeWithin(CG_LIMITS);   });   it("rejects asymmetric loading > 5% imbalance", () => {     const result = CGCalculator.compute({..., imbalance: 0.08});     expect(result.error).toContain("exceeds max");   }); }); |
| --- |

| describe("POST /api/manifest", () => {   it("creates manifest with valid jumpers and aircraft", async () => {     const res = await supertest(app)       .post("/api/manifest")       .set("Authorization", `Bearer ${instructorToken}`)       .send({         dz_id: testDZ.id,         aircraft_id: testAircraft.id,         jumpers: [{ user_id: jumper1.id }, { user_id: jumper2.id }]       });     expect(res.status).toBe(201);     expect(res.body.state).toBe("LOADING");   }); }); |
| --- |

| test("Jumper manifest signup flow", async ({ page }) => {   await page.goto("https://staging.skylara.app/dz/123");   await page.click('text=Sign Up for Load');   await page.fill('input[name=aircraft]', 'King Air 350');   await page.fill('input[name=jumpers]', '8');   await page.click('button:has-text("Confirm Manifest")');   await expect(page).toHaveURL(/\/manifest\/\d+/); }); |
| --- |

| Module | Test Scenario | Acceptance Criteria |
| --- | --- | --- |
| CGCalculator | Max weight (10,000 lbs) | CG within ±7% mean chord |
| CGCalculator | Min weight (3,000 lbs) | CG within limits, no reject |
| CGCalculator | Asymmetric loading (5% imbalance) | Pass; 6% imbalance rejected |
| LoadFSM | Invalid transition CLOSED → INBOUND | Transition rejected with error |
| LoadFSM | All 8 state transitions | Only valid transitions allowed |
| WaiverEngine | Waiver expires at T=0s | Prevent jumprun; alert jumper |
| GearValidator | Reserve pack 12 years old | Reject; recertify required |
| EmergencyActivation | No valid backup pilot | Disable emergency activation |
| WaitListLogic | Overbook by 1 jumper | Last jumper auto-waitlist, email sent |

| Endpoint | p50 Latency | p95 Latency | p99 Latency | Error Rate |
| --- | --- | --- | --- | --- |
| POST /api/manifest | 50ms | 150ms | 300ms | < 0.1% |
| GET /api/loads | 30ms | 80ms | 200ms | < 0.05% |
| WebSocket publish | 20ms | 60ms | 150ms | < 0.02% |
| POST /api/payment | 500ms | 1500ms | 3000ms | < 1% |
| GET /api/waiver/:id | 40ms | 120ms | 250ms | < 0.1% |

| Platform | Min OS | Test Devices | Orientation | Network |
| --- | --- | --- | --- | --- |
| iOS | 15.0 | iPhone 12, 13 Pro, 14 Pro Max | Portrait, Landscape | 4G, 5G, WiFi |
| Android | 10 | Samsung S20, Pixel 5, Pixel 6 | Portrait, Landscape | 4G, 5G, WiFi |

| Integration | Provider | SLA | Fallback | Cost/month |
| --- | --- | --- | --- | --- |
| Payments | Stripe Connect | 99.9% | Queue, manual retry | $500-3000 |
| SMS/WhatsApp | Twilio | 99.95% | Email fallback | $200-1000 |
| Weather | OpenWeatherMap | 99.0% | Cached data | $49 |
| Maps | Google Maps Platform | 99.95% | Manual entry | $200-2000 |
| Email | SendGrid | 99.95% | SES fallback | $100-500 |
| Push Notifications | Firebase FCM | 99.9% | WebSocket | Free |
| License Verification | USPA/IACRA APIs | Varies | Manual verify | Free + labor |
| Cloud Storage | AWS S3 | 99.99% | Local fallback | $100-500 |

| Event Type | Trigger | Action | Required |
| --- | --- | --- | --- |
| payment_intent.succeeded | Payment captured | Mark booking confirmed, send jumper receipt | YES |
| payment_intent.payment_failed | Payment declined | Alert jumper, move to manual pay or cancel | YES |
| charge.refunded | Refund issued | Reverse booking, notify jumper + DZ | YES |
| account.updated | Stripe account change | Re-sync bank info, alert DZ on critical change | NO |
| customer.subscription.updated | Subscription modified | Update billing status | YES |
| charge.dispute.created | Customer disputes charge | Alert compliance, hold payout pending resolution | YES |

| class StripeService {   async createPaymentIntent(     stripeAccountId: string,     amountCents: number,     jumperId: string   ): Promise<{ clientSecret: string; intentId: string }> {     const pi = await stripe.paymentIntents.create(       { amount: amountCents, currency: "usd" },       { stripeAccount: stripeAccountId }     );     return { clientSecret: pi.client_secret, intentId: pi.id };   }   async refund(chargeId: string, reason: string) {     const refund = await stripe.refunds.create({       charge: chargeId, reason     });     return refund;   } } |
| --- |

| class MessagingService {   async sendBookingConfirmation(     phoneNumber: string,     manifestId: string,     dz: string   ): Promise<void> {     const text = `Load manifest open at ${dz}. Confirm slot: /confirm/${manifestId}`;     try {       await this.twilio.messages.create({         to: phoneNumber,         from: process.env.TWILIO_PHONE,         body: text       });     } catch (err) {       await this.emailFallback(phoneNumber, text);     }   } } |
| --- |

| Field | Source | Unit | Update Freq | Cached TTL |
| --- | --- | --- | --- | --- |
| Wind Speed | METAR | knots | 5 min | 5 min |
| Wind Gust | METAR | knots | 5 min | 5 min |
| Wind Direction | METAR | deg (0-360) | 5 min | 5 min |
| Visibility | METAR | statute miles | 5 min | 5 min |
| Ceiling | METAR | feet AGL | 5 min | 5 min |
| Cloud Type | TAF | FEW/SCT/BKN/OVC | 6 hr | 6 hr |
| Temp | METAR | °C | 5 min | 5 min |

| class GeoService {   async getOffLanding(lat: number, lon: number, radius_m: number) {     const response = await maps.placesNearby({       location: { lat, lng: lon },       radius: radius_m,       type: "hospital",       key: process.env.GOOGLE_MAPS_KEY     });     return response.results.map(r => ({       name: r.name,       distance: this.distance(lat, lon, r.geometry.location),       phone: r.formatted_phone_number     }));   } } |
| --- |

| Email Type | Trigger | Template | Recipient |
| --- | --- | --- | --- |
| Booking Confirmation | Manifest created | booking_confirm_v2 | Jumper + DZ |
| Waiver Reminder | 24hr before jump window | waiver_24hr_reminder | Jumper |
| Password Reset | User requests | password_reset_v1 | User email |
| Payment Receipt | Payment succeeded | payment_receipt_v1 | Jumper |
| Med Cert Expiry | 30 days before expiry | med_cert_warning_v1 | Jumper |
| DZ Monthly Statement | End of month | dz_statement_v1 | DZ admin |
| Support Ticket Confirmation | Ticket created | ticket_confirmation_v1 | User email |

| class PushService {   async sendManifestUpdate(     deviceTokens: string[],     manifestId: string,     state: string   ) {     const message = {       notification: {         title: `Load ${manifestId} is now ${state}`,         body: state === "INBOUND" ? "Get ready!" : "Load closed"       },       data: { manifestId, state },       tokens: deviceTokens     };     await admin.messaging().sendMulticast(message);   } } |
| --- |

| Notification Type | Category | Priority | TTL |
| --- | --- | --- | --- |
| Manifest opened | Operational | High | 24 hr |
| Load inbound (30 min) | Operational | High | 30 min |
| Manifest closed | Operational | Normal | 1 hr |
| Waiver expiry (24 hr) | Safety | High | 24 hr |
| Jump window closed (weather) | Safety | High | 2 hr |
| New DZ promo | Marketing | Low | 7 days |

| Integration | Target Uptime | Error Rate Alert | Latency P99 Target |
| --- | --- | --- | --- |
| Stripe | 99.9% | > 5% | 2000ms |
| Twilio | 99.95% | > 2% | 1000ms |
| Weather API | 99.0% | > 10% | 5000ms |
| Google Maps | 99.95% | > 5% | 3000ms |
| SendGrid | 99.95% | > 2% | 1000ms |
| Firebase FCM | 99.9% | > 3% | 500ms |