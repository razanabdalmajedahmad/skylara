# SKYLARA

_Source: 11_Infrastructure.docx_

SKYLARA
Infrastructure & Operations
Steps 14–19  |  RBAC • Audit • Offline Sync • Financial • Performance • Analytics
Version 1.0  |  April 2026
Permission Enforcement • Immutable Audit Logs • CRDT Conflict Resolution • Split Payments • Redis Caching • Decision Intelligence
# Table of Contents
# CHAPTER 14: ROLE & PERMISSION SYSTEM (RBAC)
## 14.1 Role Architecture Overview
SkyLara implements a hierarchical 8-role model with per-dropzone scoping, enabling fine-grained access control across multi-DZ organizations. Each role inherits permissions from lower tiers automatically.
Role Hierarchy & Scope:
super_admin — Platform owner, access to all DZs and system settings
dz_owner — Owns one or more dropzones, controls all operations and permissions
dz_manager — Operations lead at a DZ, manages staff and daily operations
manifest_staff — Records load details, checks in jumpers, assigns slots
instructor — Teaches students, assigns training flights, evaluates progress
pilot — Operates aircraft, manages crew, sets jump run parameters
athlete — Books jumps, accesses personal load board, skydives
spectator — Views load board and event info only, read-only access
Per-Dropzone Scoping Implementation:
Role Matrix (Typical DZ with 50+ staff):
## 14.2 Permission Model
Permissions use a resource:action format (e.g., 'load:create', 'booking:approve'). Every action is tied to a specific resource, enabling precise authorization checks at the API and service layer.
Supported Resources & Actions:
Complete Permission Matrix (Role × Resource × Action):
Permission Resolution Service (TypeScript):
## 14.3 Safety-Critical Permission Tiers
Four-tier safety model with escalating approval requirements. Tier 1 actions affect flight safety and require dz_owner approval + reason logging.
Safety Tier Definitions:
Safety Tier Enforcement (TypeScript):
## 14.4 Per-Dropzone Permission Control
Each DZ owner can override default role permissions and create custom roles specific to their operational needs, maintaining inheritance from base permissions.
DZ-Level Override Schema:
Permission Resolution with DZ Overrides (TypeScript):
## 14.5 Temporary & Visiting Roles
Support for time-limited role grants: guest coaches (1-7 days), cross-DZ instructors, and temporary manifest staff during high-volume periods. Auto-expiry via cron job.
Temporary Role Schema:
Grant Temporary Role (TypeScript):
Auto-Expiry Cron Job (Node.js + BullMQ):
## 14.6 Multi-Branch Permission Inheritance
For organizations with multiple DZs, org-level roles enable centralized management while preserving per-DZ overrides. Cross-DZ instructor roles span multiple dropzones in the same organization.
Organization Permission Schema:
Resolve Org-Level Permissions (TypeScript):
## 14.7 Permission Enforcement Architecture
Three-layer defense: API middleware fast-path check, service layer full resolution, database row-level security via dropzone_id. Redis caches permission lookups (TTL 5 min, invalidated on role change).
API Middleware Layer (Express + JWT):
Service Layer Enforcement:
Database Row-Level Security:
## 14.8 Role Management UI Flows
Admin panel for assigning/revoking roles, viewing permission matrix. Invitation flow with user acceptance. Role change notifications (push + email). Bulk CSV import for seasonal staff onboarding.
Role Assignment Flow:
Admin opens DZ Settings → Staff → Assign Role
Selects user from directory or invites new user via email
Chooses role (instructor, athlete, etc.)
Sets optional expiry date for temporary grants
System sends email: 'You've been assigned as [Role] at [DZ]'
User clicks Accept → role activated immediately
Audit log records who assigned, when, and reason
Bulk CSV Import (TypeScript):
# CHAPTER 15: AUDIT & LOGGING SYSTEM
## 15.1 Audit Architecture Overview
Append-only audit_log table (immutable once written) captures every state-changing action with before/after snapshots. Structured JSON logging via Pino → CloudWatch. Business logs retained 7 years (legal), system logs 90 days (operational).
Immutable append-only design: once written, audit entries cannot be modified
Every state-changing action: create, update, delete, approve, override, lock, cancel
Before/after state capture: JSON snapshots for full change history
Checksum integrity: SHA-256 of record contents for tamper detection
Correlation IDs: trace actions across services
Legal retention: 7 years for audit logs, 90 days for system logs
## 15.2 Audit Log Schema
Core Table Design:
Checksum Calculation (SHA-256):
## 15.3 Event Catalog
40+ auditable events grouped by module. Each event has metadata: module, severity, requires_reason, retention policy.
## 15.4 Change History (Before/After)
Automatic diff capture via service middleware. UI displays highlighted changes between before/after states for operator visibility.
Audit Middleware Wrapper (TypeScript):
Generate Diff for UI Display (TypeScript):
## 15.5 Incident Traceability
Reconstruct complete timeline of events. Correlation IDs trace actions across services. Legal export as PDF/CSV for investigations and proceedings.
Timeline Reconstruction (TypeScript):
Legal Export as PDF:
## 15.6 System Logging Architecture
Structured JSON logs via Pino. Pipeline: App → Pino → CloudWatch → CloudWatch Insights → Grafana → PagerDuty alerts. Sentry for error tracking with source maps.
Pino Logger Configuration:
Log Level Hierarchy:
Error Handler with Sentry (TypeScript):
## 15.7 Compliance & Legal
GDPR right-to-anonymize support. SOC2 immutable logs and access controls. FAA/EASA aviation incident retention. Chain-of-custody checksums for legal proceedings.
GDPR Anonymization (TypeScript):
## 15.8 Search & Reporting
Full-text search over audit logs. Pre-built reports: daily activity, permission changes, financial audit, safety events. Real-time alert rules with dashboard widgets.
Audit Log Search API (TypeScript):
Pre-Built Reports (TypeScript):
Real-Time Alert Rules (TypeScript):
Dashboard Widgets Summary:
Recent Activity Feed: last 50 events with actor, action, timestamp
Top Actors: users with most state-changing actions today
Anomaly Detection: unusual patterns (off-hours activity, bulk imports, etc.)
Compliance Checklist: audit retention status, checksum health, export readiness
Safety Timeline: all safety-critical events (overrides, emergencies) with full details
# Chapter 16: Offline Sync & Conflict Resolution
## 16.1 Offline-First Architecture Overview
Every user-facing feature must function without internet connectivity. Data is tiered by importance and frequency of access:
Tier 1 (Always Cached): Own profile, emergency data, logbook entries
Tier 2 (Session-Cached): Current loads, DZ info, check-in queue
Tier 3 (Online-Only): Historical analytics, media uploads, payments
Mobile uses WatermelonDB (SQLite wrapper) with sync adapter. Web uses IndexedDB via Dexie.js plus Service Worker for static assets. Sync indicator UI displays green (live), yellow (syncing), or red (offline + last_sync_time).
## 16.2 Local Database Schema (Mobile)
WatermelonDB models mirror the server schema for a critical subset of tables:
Synced tables: loads, slots, athletes (own DZ), emergency_profiles, instructor_assignments, weather_data, logbook_entries
Sync metadata: _synced (boolean), _changed (fields list), _status (created/updated/deleted), sync_version
TypeScript model definitions ensure type safety and consistent structure across mobile and server:
## 16.3 Sync Engine Design
The push-pull sync protocol operates in cycles:
Client sends: { last_pulled_at, changes: { created: [], updated: [], deleted: [] } }
Server responds: { changes: { created: [], updated: [], deleted: [] }, current_timestamp }
Sync runs every 30 seconds when online and immediately on reconnection. Delta sync only transfers records changed since last_pulled_at. Batch size capped at 500 records per cycle; payloads over 10KB are gzip-compressed.
## 16.4 Conflict Resolution Rules
Conflicts are resolved using a three-tier hierarchy based on safety criticality and mergeability:
### Server Authority (Safety-Critical)
### Last-Write-Wins (Non-Critical)
### Field-Level Merge (Mergeable)
## 16.5 Offline Action Queue
Actions performed offline are queued for later processing with automatic retry and conflict handling:
## 16.6 Sync for Manifest Operations
Manifest staff often edit loads with intermittent connectivity. Optimistic UI shows changes immediately while syncing in background. A soft lock (60-second expiration) prevents simultaneous edits.
## 16.7 Service Worker Strategy (Web)
The Service Worker implements three cache strategies and precaches critical UI routes:
Cache-First: Static assets (JS, CSS, images, fonts)
Network-First with Stale Fallback: API calls with offline fallback
Background Sync API: Queued actions retry when connection restored
## 16.8 Data Integrity Guarantees
SkyLara enforces data integrity through checksums, atomic transactions, rollback on failure, and orphan detection:
Checksum Verification: CRC32 on all sync payloads
Transaction Wrapping: All local writes are atomic via WatermelonDB batch
Rollback on Sync Failure: Revert local changes if server rejects batch
Orphan Detection: Periodic scan for records failing to sync > 24h with user alert
# Chapter 17: Financial System
## 17.1 Financial Architecture Overview
SkyLara implements double-entry bookkeeping where every financial transaction has a debit and credit entry. All amounts are stored as integer cents to avoid floating-point errors. Multi-currency support converts at booking time while storing both original and converted amounts. Stripe Connect handles platform and connected account payments.
## 17.2 Split Payment Engine
Every booking splits into platform commission, DZ revenue, instructor fees, and tax. Stripe Connect destination charges allow the platform to collect payment and route splits to DZ connected accounts.
## 17.3 Payout System
Payouts occur weekly: calculation on Friday, transfer on Monday. Each payout equals DZ revenue minus pending refunds and chargebacks, subject to a $50 minimum threshold. New DZs have a 14-day rolling hold for fraud prevention.
## 17.4 Wallet & Credit System
Athletes can prepay via wallet for faster checkout. Wallet credits come from purchases, refunds, promotions, and referral rewards. Spend priority: wallet balance first, then card charge for remainder.
## 17.5 Refund Engine
Refund policies are configurable per DZ with time-based tiers. Weather or DZ cancellations always grant 100% refunds. Users choose refund destination: original payment method or wallet credit.
## 17.6 Tax Handling
Tax rates vary by jurisdiction. EU VAT uses reverse charge for B2B and standard rate for B2C. US sales tax varies by state. Tax can be inclusive or exclusive, configured per DZ. Invoices include full tax breakdown for compliance.
## 17.7 Financial Reporting
SkyLara generates daily, weekly, and monthly revenue reports by stream. P&L statements show revenue minus payouts, refunds, and chargebacks. Cash flow reports track collection vs payout timing. Chargeback alerts trigger at 0.5% rate threshold.
## 17.8 Financial Compliance & Security
PCI DSS compliance is maintained by delegating card data handling to Stripe. SOX-like controls enforce separation of duties. Every financial operation includes an idempotency key to prevent double-charging. Daily automated reconciliation compares Stripe records against internal database.
## Summary
Chapters 16 and 17 establish SkyLara's offline-sync reliability and financial backbone. Offline-first design ensures manifest staff, athletes, and instructors can operate seamlessly even with spotty connectivity. Conflict resolution strategies protect safety-critical data while allowing mergeable updates. The financial system enforces double-entry bookkeeping, multi-currency support, and Stripe Connect integration to reliably handle payments, refunds, payouts, and compliance.
# Chapter 18: Performance & Scalability
## 18.1 Performance Architecture Overview
SkyLara targets aggressive SLAs across all critical paths to support peak load scenarios (200+ jumpers/day at large DZs, 500+ DZs globally). The architecture combines Next.js (SSR + API), ProxySQL for read/write splitting, MySQL primary with 2 read replicas, Redis cluster for caching and pub/sub, BullMQ for async jobs, and Socket.IO for real-time updates.
Target SLAs:
API endpoints: p50 < 50ms, p99 < 200ms
WebSocket broadcast: < 100ms across DZ rooms
Page load: < 2s (including Next.js hydration)
Manifest sync cycle: < 3s (from check-in to all clients)
## 18.2 Caching Strategy (Redis)
A three-tier caching architecture balances freshness, latency, and consistency across the platform.
Cache Tiers:
L1 (In-Process): LRU cache for configuration data (TTL 5s) — permission matrix, DZ settings, feature flags
L2 (Redis): Shared cache for API responses, computed data, session state (TTL varies by resource type)
L3 (CDN): CloudFront for static assets, media thumbnails, font files (TTL 24h)
Cache Patterns by Resource:
Load board: Redis pub/sub for real-time updates + full board snapshot (30s TTL, invalidate on load_status_change)
Athlete profile: cache-aside pattern (5min TTL, invalidate on profile_updated event)
Permission matrix: cache-aside per user (5min TTL, invalidate on role/team membership change)
DZ settings: cache-aside (15min TTL, invalidate on settings_changed event)
Subscription status: cache-aside (1h TTL, warm cache on login)
Cache Invalidation Strategy:
Event-driven invalidation via BullMQ: when state changes occur (load_status_change, athlete_profile_updated, etc.), a BullMQ job emits a cache invalidation event. Redis DEL is called for affected keys. Listeners subscribed to Redis pub/sub channels receive invalidation messages and may warm the cache for hot resources.
## 18.3 Database Optimization
MySQL primary-replica architecture with ProxySQL routing, connection pooling, and strategic indexing to support 500+ concurrent connections at peak.
Connection Pooling:
mysql2 pool: min 10, max 50 connections per API server
acquireTimeout: 10s (fail fast if pool exhausted)
Total pool across 5 API servers: 50-250 connections, well below MySQL max_connections (300)
Read/Write Splitting (ProxySQL):
SELECT queries routed to read replicas (round-robin load balancing)
INSERT, UPDATE, DELETE, transactions routed to primary
Replica lag monitoring: trigger read-after-write forwarding if lag > 2s
Hot Query Optimization:
JSON Column Strategy:
DZ settings, athlete preferences, and aircraft configuration stored as JSON. Generated columns index frequently queried JSON fields (e.g., dz_settings→'$.timezone' extracted to tz_timezone column for WHERE clauses).
Slow Query Audit:
MySQL slow_query_log enabled (threshold: 100ms)
Monthly review: identify queries > 100ms, add indexes, denormalize if needed
EXPLAIN used to verify index usage before production deployment
Partitioning Strategy:
audit_logs: RANGE partitioned by created_at (monthly partitions, drop partitions > 1 year old)
Old partitions exported to S3 (Parquet) for long-term archive and compliance
## 18.4 Horizontal Scaling
SkyLara infrastructure scales horizontally across compute, database, cache, and worker tiers to handle global growth.
API Tier (Next.js on ECS Fargate):
Stateless design: any API server can handle any request
Auto-scaling policy: CPU > 60% → scale out by 1, CPU < 30% → scale in by 1
Min/max instances: 2-10 for small DZ networks, 5-50 for global platform
Target tracking: maintain ~50% CPU utilization during peak hours
Database Tier (Aurora MySQL):
Primary handles writes, 2 read replicas handle SELECT queries
Read replicas auto-scale: add replica if CPU > 70% for > 5 minutes
Max 5 replicas per primary (diminishing returns beyond 3 for this workload)
Cache Tier (Redis Cluster):
3 shards with 1 replica each (cluster mode enabled)
Each shard handles ~33% of cache traffic; replicas provide failover
Monitor: eviction rate < 1%, replication lag < 100ms
Worker Tier (BullMQ on ECS):
Separate ECS service: processes async jobs (exports, emails, media processing)
Auto-scale by queue depth: if pending jobs > 1000 → add worker container
Concurrency per worker: 5 (tuned for I/O-bound tasks)
Media Processing (Lambda):
Serverless image/video processing: triggered by S3 upload event
Auto-scale to 1000 concurrent Lambda functions
Fallback: if Lambda quota exceeded, enqueue to BullMQ worker
## 18.5 Load Balancing
AWS Application Load Balancer (ALB) routes traffic based on path, ensures sticky sessions for WebSocket, and removes unhealthy instances.
Routing Rules:
/api/* → API target group (round-robin, 5 API servers)
/ws/* → WebSocket target group (sticky sessions via cookie, duration 86400s)
/* → Next.js SSR target group (default, includes assets)
Health Checks:
Endpoint: GET /api/health
Checks: DB connectivity, Redis connectivity, response time < 500ms
Interval: 30s, unhealthy threshold: 2 consecutive failures → remove from rotation
Circuit Breaker Pattern:
If downstream service (DB, Redis, 3rd-party API) fails 5x in 30s → open circuit
Open circuit: return cached response (stale data) or degraded response (e.g., 'offline mode')
Half-open after 60s: try one request; if success, close circuit; if fail, reopen
## 18.6 WebSocket Scaling
Socket.IO with Redis adapter enables WebSocket connections to broadcast across multiple API servers without clients reconnecting.
Architecture:
Socket.IO server on each API instance, Redis adapter syncs events across instances
Rooms: one per DZ (dz:{dzId}), one per load (load:{loadId}), one per user (user:{userId})
Connection limits: max 500 connections per server (soft limit, with backpressure), max 5000 per DZ
Heartbeat & Reconnection:
Heartbeat interval: 25s, timeout: 60s
Exponential backoff on disconnect: 1s, 2s, 4s, 8s, max 30s
Persist connection metadata (room memberships) in Redis for reconnect recovery
Optimization:
Message compression: perMessageDeflate enabled for payloads > 1KB
Selective broadcasting: emit only to affected room(s), not all DZs
## 18.7 Failover & Disaster Recovery
Multi-region, multi-AZ architecture with automated failover and fast recovery targets.
Database Failover (RTO < 60s):
Multi-AZ MySQL: primary in us-east-1a, standby in us-east-1b
Automatic failover: if primary down > 30s, RDS promotes replica to primary
DNS updated within 30s (CNAME points to primary)
Redis Failover (RTO < 30s):
Cluster mode: 3 shards, 1 replica each across 2 AZs
Automatic promotion: if shard master down > 10s, replica promoted
Persistence: RDB snapshots every 60s + AOF (append-only file)
API Tier (RTO < 2 minutes):
Multi-AZ ECS tasks: min 2 healthy tasks required, spread across AZs
ALB health check removes unhealthy instances instantly
Auto-scaling can replenish capacity within 1-2 minutes
DNS Failover (RTO < 5 minutes):
Route 53 health check: monitors primary API endpoint (ALB)
If health check fails 3x in 30s, Route 53 fails over to secondary region
Maintenance page served from secondary region (no active service)
Backup & Recovery:
Automated daily snapshots: RDS, Aurora, Redis → S3
Cross-region replication: snapshots copied to us-west-2 for disaster recovery
Full restore tested monthly: spin up test environment from backup, verify data integrity
Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO):
Full platform: RTO < 5 minutes, RPO = 0 (synchronous replication)
Database primary: RTO < 60s, RPO = 0
Redis cluster: RTO < 30s, RPO < 5 minutes
API tier: RTO < 2 minutes, RPO = 0 (stateless)
Runbook for Common Failure Scenarios:
Database down: (1) Alert fires, (2) RDS auto-failover initiates, (3) Verify replica lag < 1s, (4) Update CNAME if manual failover needed, (5) Validate data integrity before returning to normal
Redis down: (1) Cluster failover auto-promoted replica, (2) Check replication lag, (3) If cluster degraded, delete affected shard and trigger cluster rebalance, (4) Warm cache by re-executing cache-aside logic
API server crash: (1) ALB removes unhealthy instance, (2) Auto-scaling adds new container, (3) Monitor error rate, (4) If cascading failure, circuit breaker opens and returns cached response
Full AZ failure: (1) Route 53 fails over to secondary region, (2) Secondary region serves stale data + degraded mode, (3) Spin up new primary in primary region, (4) Promote secondary to primary once primary restored, (5) Verify consistency
## 18.8 Performance Monitoring
Real-time observability ensures SkyLara meets SLAs and surfaces issues before they impact users.
APM (Application Performance Monitoring):
Tool: Datadog or New Relic
Distributed tracing: trace requests from ALB → API → MySQL/Redis → response
Slow trace detection: if request > 500ms, auto-sample at 100%
Custom Metrics:
load_board_latency: histogram of 'get load board' query time (p50, p99)
sync_cycle_duration: time from check-in submission to broadcast completion
ws_broadcast_time: time for WebSocket message to reach all connected clients
cache_hit_rate: percentage of Redis GET requests that hit (target > 85%)
db_query_time: histogram of query execution time, tracked per query type
api_error_rate: percentage of API responses with status >= 400
Dashboards:
Ops Dashboard: requests/s, error rate, latency p50/p99, DB CPU, Redis memory, active WebSocket connections
Infrastructure: CPU, memory, disk I/O per ECS task, RDS metrics (connections, replica lag)
Business: active users, loads scheduled today, revenue today, instructor utilization
Alerting (PagerDuty):
CRITICAL: API error rate > 5% (page on-call engineer)
CRITICAL: API latency p99 > 1s (page on-call engineer)
CRITICAL: DB replication lag > 5s (page on-call engineer)
WARNING: Cache hit rate < 80% (notify Slack #alerts)
WARNING: ECS tasks failing health checks (notify Slack, auto-scale)
Load Testing (k6):
Simulates peak day: 200 jumpers, 20 simultaneous loads, 100 concurrent API calls
Tests: load board queries, check-in mutations, manifest SSR, WebSocket broadcasts
Run monthly: compare results to baseline, identify regressions
# Chapter 19: Data & Analytics System
## 19.1 Analytics Architecture Overview
SkyLara's analytics system combines operational analytics (real-time, MySQL + Redis) with strategic analytics (batch, data warehouse) to power business intelligence, recommendations, and reporting.
Dual-Layer Architecture:
Operational (Real-time): MySQL queries, Redis caching, live dashboards — latency < 2s
Strategic (Batch): Data warehouse (BigQuery/Redshift), nightly ETL, historical analysis — latency acceptable
Event Pipeline:
Events captured: jumper sign-up, load created, check-in, payment processed, rating submitted, etc.
Queue: BullMQ job for each event → Redis Stream (buffering) → Data warehouse (nightly) + real-time processors
Idempotency: event_id prevents duplicate processing
## 19.2 Revenue Analytics
Real-time tracking of bookings, payments, and revenue streams with per-DZ, per-instructor visibility.
Revenue Breakdown by Stream:
Tandem: charge per student jumper (e.g., $249/jump)
AFF: course package + level progression fees
Coaching: instructor-guided jumps (higher rate)
Fun jump: group bookings, special events
Media: video, photos, digital downloads
Resale: used gear marketplace (SkyLara takes 10% commission)
Subscriptions: annual pass, club memberships
Shop: merchandise, apparel, emergency gear
Key Metrics:
Revenue per DZ (RPD): $X/day, ranked
Growth rate: week-over-week, month-over-month % change
Unit economics: revenue per jumper, revenue per load, revenue per instructor-hour
Cohort revenue: sum of revenue from jumpers acquired in month X (tracks lifetime value)
Churn impact: revenue lost due to inactive jumpers
Dashboard Widgets:
Revenue ticker: today's total, target, % of target
Stream breakdown: pie chart of revenue by activity type
Trend line: revenue over last 30 days with moving average
Top DZs: leaderboard of revenue-generating DZs
## 19.3 Load Utilization Analytics
Metrics to optimize aircraft utilization, scheduling, and revenue per load.
Key Metrics:
Load fill rate: average % of capacity filled (target 85%+ for profitability)
Time efficiency: average duration from 'open for bookings' to 'airborne' (target < 45min)
Cancellation rate: loads cancelled / total loads by hour/day/week, with reason breakdown
Weather impact: loads affected by holds/delays, average recovery time
Aircraft utilization: flights per day per aircraft, turnaround time, maintenance impact
Underutilized slots: time slots with < 60% fill rate (opportunities for discounts/promotions)
Dashboard Heatmaps:
Load fill rate heatmap: rows = day-of-week, columns = hour-of-day, color intensity = % fill
Cancellation heatmap: identifies patterns (e.g., midweek slumps, weather-prone times)
## 19.4 Instructor Performance Analytics
Tracks instructor productivity, earnings, student outcomes, and workload balance to optimize scheduling and retention.
Key Metrics:
Jump count: daily/weekly/monthly per instructor (tracks productivity)
Rating: average student rating (tandem), trend over time (identifies declining instructors)
Specialization: breakdown by activity (tandem %, AFF %, coaching %, fun jump %)
Revenue generated: instructor's contribution to DZ revenue (tandem commission + AFF level fees)
Workload balance: Gini coefficient across instructor team (0 = perfectly balanced, 1 = all work on one instructor)
Student progression: count of AFF students who advanced levels under this instructor
Fatigue index: jumps per day + consecutive days without rest (burnout risk indicator)
Dashboard Leaderboard:
Rank instructors by: total jumps (month), rating (avg of last 20 jumps), revenue generated, student progression.
## 19.5 Jumper Activity Analytics
Segments jumpers, identifies churn risk, and personalizes engagement strategies.
Key Metrics:
Activity frequency: jumps per week/month, trend, categorized as casual (1-2/mo), regular (weekly), power user (3+/wk), dormant (>30d inactive)
Progression tracking: timeline of license levels (A-license, B, C, D), skills acquired
Spending analysis: total spend per visit, most-purchased activities (tandem, AFF, media)
Engagement score: composite metric (jump frequency 40%, social activity 20%, media purchases 20%, event participation 20%)
Cohort retention: % of jumpers still active after 1/3/6/12 months from first jump
Churn risk score: ML model predicting likelihood of becoming dormant in next 30 days
Segmentation:
Casual: 1-2 jumps/month, low spend, high churn risk → target with 'get back in the air' campaigns
Regular: 1-2 jumps/week, steady spend, medium retention → upsell to premium memberships
Power user: 3+ jumps/week, high spend, referral potential → VIP perks, early access to events
Dormant: > 30 days since last jump → re-engagement campaigns, discounts
## 19.6 Demand Forecasting
Predicts bookings and staffing needs 14 days in advance to optimize operations and pricing.
Inputs:
Historical bookings: by day-of-week, month, hour-of-day (last 2 years)
Weather forecast: next 14 days from external API
Local events: school holidays, holidays, local events (e.g., boogie)
DZ marketing: known campaigns, promotions ending in next 14 days
Model Approach:
Baseline: time-series decomposition (trend + seasonality) from historical data
Adjustments: apply weather impact multiplier, event impact, promotion lift
AI enhancement: Claude Haiku analyzes anomalies (e.g., 'unusual spike 3 months ago, check if recurring event')
Outputs:
14-day forecast: expected bookings per day with 80% confidence interval
Staffing recommendations: instructors needed per day based on forecast
Pricing suggestions: surge pricing on high-demand days, discounts on low-demand days (e.g., -15% on Wednesday)
Dashboard Forecast View:
Line chart: 14-day bookings forecast with confidence bands (80%, 95%)
Staffing table: recommended instructor count per day
Pricing suggestions: recommended surge/discount per day
## 19.7 Export & Reporting Tools
Enables DZ operators, instructors, and finance teams to extract data for analysis and compliance.
Scheduled Reports:
Daily summary email: bookings today, revenue, incidents, staffing snapshot
Weekly P&L: revenue by stream, instructor payroll, costs, net profit
Monthly analytics digest: top performers, load utilization trends, churn analysis, recommendations
Custom Report Builder:
UI: select metrics, date range, filters (by DZ, instructor, activity type)
Generate: data refreshed from warehouse, formatted as chart + table
Export: CSV, PDF (with charts), XLSX (for accounting software integration)
API Endpoint:
GET /api/analytics/export?template=monthly&dzId=X&format=csv
Response: CSV file with revenue, instructor payroll, load metrics
Use case: accounting software (QuickBooks, Xero) import for financial reconciliation
Report Templates:
DZ operator monthly: revenue, load fill %, top instructors, churn risk, recommendations
Instructor pay summary: jump count, earnings breakdown, bonus opportunities
Athlete progress: license level, jumps per month, spending trends
Financial audit: all transactions, refunds, commissions, reconciliation with Stripe
## 19.8 Decision Intelligence
Automated recommendations engine that surfaces actionable insights to operators, powered by analytics and AI pattern analysis.
Recommendations Engine:
Staffing: 'Hire 1 more TI — your tandem wait time exceeds 45min on weekends (last 4 Saturdays)'
Pricing: 'Offer 15% discount on Wednesday — your midweek utilization is 35% vs 85% weekend'
Instructor burnout: 'Instructor X is at burnout risk — 8+ jumps/day for 5 consecutive days, recommend 1-day rest'
Weather intelligence: 'Weather pattern suggests moving Saturday's boogie to Sunday — 80% chance of improvement'
Retention: 'Athlete Y at high churn risk (no jumps in 28 days, historically active) — send re-engagement email with $20 discount'
Demand shift: 'Bookings for Friday dropping (trend analysis) — consider AFF level-off promotion to fill slots'
Recommendation Scoring:
Confidence: high (>80% pattern match), medium (50-80%), low (<50%)
Impact: estimated $$ impact (e.g., '+$500/mo revenue' for pricing recommendation)
Effort: easy (1 click), medium (manual setup), hard (requires operational change)
Dashboard Recommendation Cards:
Each card: recommendation, confidence, estimated impact, effort, action buttons (accept, dismiss, snooze)
Accepted recommendations tracked: measure actual impact vs predicted impact
AI-Powered Pattern Analysis:
For complex recommendations (e.g., weather impact, unusual trends), use Claude Haiku to analyze historical data and generate insights. Example: 'Over the last 3 months, Saturdays after rain have 20% higher bookings. Weather forecast shows rain Friday → recommend Thursday evening promotion to shift demand.'
End of Chapter 18-19

| // user_roles table captures DZ-specific role assignments CREATE TABLE user_roles (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   user_id BIGINT NOT NULL,   role_id BIGINT NOT NULL,   dropzone_id BIGINT NOT NULL,   assigned_by BIGINT,   assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   UNIQUE KEY (user_id, role_id, dropzone_id),   FOREIGN KEY (user_id) REFERENCES users(id),   FOREIGN KEY (dropzone_id) REFERENCES dropzones(id),   INDEX idx_dropzone_role (dropzone_id, role_id),   INDEX idx_user_roles (user_id) );  // One user can hold different roles at different DZs // User 42: instructor at DZ-5, athlete at DZ-12, pilot at DZ-5 |
| --- |

| Role | Description | Typical Count | Scope | Permissions |
| --- | --- | --- | --- | --- |
| super_admin | Platform owner | 1-2 | All DZs | All resources, all actions |
| dz_owner | DZ owner | 1-2 per DZ | Single DZ | Configure, staff, financial, overrides |
| dz_manager | Operations lead | 2-3 per DZ | Single DZ | Manage staff, loads, bookings, reports |
| manifest_staff | Load recorder | 8-12 per DZ | Single DZ | Create loads, assign slots, check-in |
| instructor | Jump master | 15-25 per DZ | Single DZ | Assign training, evaluate, view medical |
| pilot | Aircraft operator | 3-5 per DZ | Single DZ | Operate, set parameters, view weather |
| athlete | Jumper | 200+ per DZ | Self + DZ | Book jumps, view own profile, manifest |
| spectator | Observer | Unlimited | Single DZ | View load board only |

| type Resource =   | 'load' | 'slot' | 'booking' | 'athlete'   | 'instructor' | 'aircraft' | 'weather'   | 'emergency_profile' | 'financial' | 'settings'   | 'report' | 'user';  type Action =   | 'view' | 'create' | 'edit' | 'delete'   | 'assign' | 'approve' | 'override' | 'export'   | 'lock' | 'unlock' | 'cancel';  type Permission = `${Resource}:${Action}`;  // Examples: const perms = [   'load:create',   'load:edit',   'booking:approve',   'emergency_profile:view',   'financial:override',   'report:export' ]; |
| --- |

| Resource | super_admin | dz_owner | dz_manager | manifest_staff | instructor | athlete |
| --- | --- | --- | --- | --- | --- | --- |
| load:view | ✓ | ✓ | ✓ | ✓ | ✓ | own |
| load:create | ✓ | ✓ | ✓ | ✓ | — | — |
| load:edit | ✓ | ✓ | ✓ | ✓ | — | — |
| load:lock | ✓ | ✓ | ✓ | — | — | — |
| load:override | ✓ | ✓ | — | — | — | — |
| booking:create | ✓ | ✓ | ✓ | — | — | ✓ |
| booking:approve | ✓ | ✓ | ✓ | ✓ | — | — |
| booking:refund | ✓ | ✓ | ✓ | — | — | — |
| athlete:view | ✓ | ✓ | ✓ | ✓ | ✓ | own |
| emergency_profile:view | ✓ | ✓ | ✓ | — | ✓ | own |
| financial:view | ✓ | ✓ | ✓ | — | — | own |
| financial:override | ✓ | ✓ | — | — | — | — |
| settings:edit | ✓ | ✓ | — | — | — | — |
| report:export | ✓ | ✓ | ✓ | — | — | — |
| user:assign_role | ✓ | ✓ | ✓ | — | — | — |
| user:delete | ✓ | ✓ | — | — | — | — |

| async function hasPermission(   userId: number,   resource: Resource,   action: Action,   dzId: number ): Promise<boolean> {   // 1. Get user's role at this DZ   const userRole = await db.query(     'SELECT role_id FROM user_roles WHERE user_id = ? AND dropzone_id = ?',     [userId, dzId]   );   if (!userRole) return false;    // 2. Check default permissions for this role   const perm = await db.query(     'SELECT * FROM role_permissions WHERE role_id = ? AND resource = ? AND action = ?',     [userRole.role_id, resource, action]   );   if (!perm) return false;    // 3. Check for DZ-level overrides   const override = await db.query(     'SELECT granted FROM dz_permission_overrides WHERE dropzone_id = ? AND role_id = ? AND permission = ?',     [dzId, userRole.role_id, `${resource}:${action}`]   );   if (override) return override.granted;    return perm.allowed; } |
| --- |

| Tier | Examples | Min Role | Requires Reason | Audit Level |
| --- | --- | --- | --- | --- |
| TIER 1 (CRITICAL) | CG override, emergency profile access, load cancel, weather hold override | dz_owner | Yes | CRITICAL |
| TIER 2 (HIGH) | Manifest changes post-LOCKED, instructor reassignment, financial override | dz_manager | Yes | HIGH |
| TIER 3 (STANDARD) | Create load, assign slots, check-in jumpers, book jump | manifest_staff | No | NORMAL |
| TIER 4 (BASIC) | View load board, self-manifest, view own profile, spectate | athlete | No | INFO |

| async function requireSafetyTier(   tier: 1 | 2 | 3 | 4,   userId: number,   dzId: number,   reason?: string ): Promise<void> {   const roleMap: Record<number, number> = {     // role_id -> tier     1: 1, // super_admin     2: 1, // dz_owner     3: 2, // dz_manager     4: 3, // manifest_staff     5: 3, // instructor     6: 3, // pilot     7: 4, // athlete     8: 4  // spectator   };    const userRole = await db.query(     'SELECT role_id FROM user_roles WHERE user_id = ? AND dropzone_id = ?',     [userId, dzId]   );    const userTier = roleMap[userRole.role_id];   if (userTier > tier) {     throw new PermissionDeniedError(       `Requires tier ${tier}, user has tier ${userTier}`     );   }    // Tier 1-2 require reason   if (tier <= 2 && !reason) {     throw new ValidationError('Reason required for safety tier ' + tier);   }    // Log critical action   await createAuditEntry({     eventType: 'safety_tier_action',     actorId: userId,     dzId,     tier,     reason   }); } |
| --- |

| CREATE TABLE dz_permission_overrides (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   dropzone_id BIGINT NOT NULL,   role_id BIGINT,   custom_role_id BIGINT,   permission VARCHAR(50) NOT NULL,   granted BOOLEAN DEFAULT TRUE,   set_by BIGINT NOT NULL,   set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   reason TEXT,   UNIQUE KEY (dropzone_id, role_id, permission),   FOREIGN KEY (dropzone_id) REFERENCES dropzones(id),   INDEX idx_dropzone (dropzone_id) );  CREATE TABLE custom_roles (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   dropzone_id BIGINT NOT NULL,   name VARCHAR(100) NOT NULL,   description TEXT,   base_role_id BIGINT,   created_by BIGINT,   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   active BOOLEAN DEFAULT TRUE,   UNIQUE KEY (dropzone_id, name),   FOREIGN KEY (dropzone_id) REFERENCES dropzones(id) ); |
| --- |

| async function resolveEffectivePermissions(   userId: number,   dzId: number ): Promise<Set<string>> {   const effective = new Set<string>();    // 1. Get user's role(s) at this DZ   const roles = await db.query(     'SELECT role_id FROM user_roles WHERE user_id = ? AND dropzone_id = ?',     [userId, dzId]   );    for (const role of roles) {     // 2. Get default permissions for this role     const defaults = await db.query(       'SELECT permission FROM role_permissions WHERE role_id = ?',       [role.role_id]     );      for (const p of defaults) {       effective.add(p.permission);     }      // 3. Apply DZ overrides (remove if granted=false)     const overrides = await db.query(       'SELECT permission, granted FROM dz_permission_overrides WHERE dropzone_id = ? AND role_id = ?',       [dzId, role.role_id]     );      for (const ov of overrides) {       if (ov.granted) {         effective.add(ov.permission);       } else {         effective.delete(ov.permission);       }     }   }    // Cache for 5 minutes   await redis.setex(     `perms:${userId}:${dzId}`,     300,     JSON.stringify(Array.from(effective))   );    return effective; } |
| --- |

| CREATE TABLE temporary_role_grants (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   user_id BIGINT NOT NULL,   role_id BIGINT NOT NULL,   dropzone_id BIGINT NOT NULL,   granted_by BIGINT NOT NULL,   starts_at TIMESTAMP,   expires_at TIMESTAMP NOT NULL,   reason VARCHAR(255),   status ENUM('active', 'revoked', 'expired') DEFAULT 'active',   revoked_at TIMESTAMP,   revoked_by BIGINT,   FOREIGN KEY (user_id) REFERENCES users(id),   FOREIGN KEY (dropzone_id) REFERENCES dropzones(id),   INDEX idx_expires (expires_at),   INDEX idx_user_dz (user_id, dropzone_id) ); |
| --- |

| async function grantTemporaryRole(   userId: number,   roleId: number,   dzId: number,   expiresAt: Date,   grantedBy: number,   reason: string ): Promise<void> {   // Validate: expiry is 1-30 days from now   const daysFromNow = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);   if (daysFromNow < 1 || daysFromNow > 30) {     throw new ValidationError('Grant must expire in 1-30 days');   }    // Create grant   await db.query(     'INSERT INTO temporary_role_grants (user_id, role_id, dropzone_id, granted_by, expires_at, reason) VALUES (?, ?, ?, ?, ?, ?)',     [userId, roleId, dzId, grantedBy, expiresAt, reason]   );    // Send notification to user   await sendNotification(userId, {     type: 'TEMPORARY_ROLE_GRANTED',     dzId,     expiresAt: expiresAt.toISOString(),     reason   });    // Log grant   await createAuditEntry({     eventType: 'temporary_role_granted',     actorId: grantedBy,     resourceId: userId,     dzId,     metadata: { roleId, expiresAt, reason }   }); } |
| --- |

| // Runs every 15 minutes const job = new CronJob('*/15 * * * *', async () => {   const now = new Date();   const expired = await db.query(     'SELECT * FROM temporary_role_grants WHERE status = ? AND expires_at <= ?',     ['active', now]   );    for (const grant of expired) {     // Mark as expired     await db.query(       'UPDATE temporary_role_grants SET status = ? WHERE id = ?',       ['expired', grant.id]     );      // Notify user     await sendNotification(grant.user_id, {       type: 'TEMPORARY_ROLE_EXPIRED',       dzId: grant.dropzone_id,       roleId: grant.role_id     });      // Invalidate permission cache     await redis.del(`perms:${grant.user_id}:${grant.dropzone_id}`);   } }); |
| --- |

| CREATE TABLE organization_roles (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   user_id BIGINT NOT NULL,   organization_id BIGINT NOT NULL,   role_id BIGINT NOT NULL,   assigned_by BIGINT,   assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   INDEX idx_org_user (organization_id, user_id),   INDEX idx_org_role (organization_id, role_id) );  CREATE TABLE cross_dz_instructor_grants (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   user_id BIGINT NOT NULL,   organization_id BIGINT,   dropzone_ids JSON NOT NULL,   granted_by BIGINT,   granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   expires_at TIMESTAMP,   active BOOLEAN DEFAULT TRUE,   INDEX idx_user_org (user_id, organization_id) ); |
| --- |

| async function resolveOrgPermissions(   userId: number,   orgId: number ): Promise<Map<number, Set<string>>> {   // Returns dzId -> permissions set   const result = new Map<number, Set<string>>();    // 1. Get org-level role   const orgRole = await db.query(     'SELECT role_id FROM organization_roles WHERE user_id = ? AND organization_id = ?',     [userId, orgId]   );    // 2. Find all DZs in this org   const dzs = await db.query(     'SELECT id FROM dropzones WHERE organization_id = ?',     [orgId]   );    for (const dz of dzs) {     // Resolve effective perms at each DZ     const perms = await resolveEffectivePermissions(userId, dz.id);     result.set(dz.id, perms);   }    return result; } |
| --- |

| function permissionGuard(   requiredResource: Resource,   requiredAction: Action ) {   return async (req, res, next) => {     const { user } = req;     const { dzId } = req.params || req.body;      // 1. Fast path: check JWT claims (roles cached from auth)     const roles = user.roles || [];     if (roles.includes('super_admin')) {       return next();     }      // 2. Check cache     const cacheKey = `perms:${user.id}:${dzId}`;     const cached = await redis.get(cacheKey);     if (cached) {       const perms = JSON.parse(cached);       if (perms.includes(`${requiredResource}:${requiredAction}`)) {         return next();       } else {         return res.status(403).json({ error: 'Permission denied' });       }     }      // 3. Full resolution (misses go here)     const hasAccess = await hasPermission(       user.id,       requiredResource,       requiredAction,       dzId     );      if (hasAccess) {       return next();     } else {       return res.status(403).json({ error: 'Permission denied' });     }   }; } |
| --- |

| // Typical service method async function createLoad(   userId: number,   dzId: number,   loadData: CreateLoadDTO ): Promise<Load> {   // Check permission first   const allowed = await hasPermission(     userId,     'load',     'create',     dzId   );   if (!allowed) {     throw new PermissionDeniedError('Cannot create load');   }    // Validate safety tier if override needed   if (loadData.cgOverride) {     await requireSafetyTier(1, userId, dzId, loadData.overrideReason);   }    // Create load (database will enforce dzId match)   const load = await db.query(     'INSERT INTO loads (dropzone_id, ...) VALUES (?, ...)',     [dzId, ...]   );    // Audit log   await createAuditEntry({     eventType: 'load_created',     actorId: userId,     resourceType: 'load',     resourceId: load.id,     dzId,     afterState: load   });    return load; } |
| --- |

| // All queries include dzId check automatically via middleware // Example: only return loads for dzId user has access to  async function getLoads(userId: number, dzId: number) {   // 1. Verify user has access to this dzId   const hasAccess = await hasPermission(     userId,     'load',     'view',     dzId   );   if (!hasAccess) throw new PermissionDeniedError();    // 2. Query includes dzId filter (prevents cross-dz leaks)   const loads = await db.query(     'SELECT * FROM loads WHERE dropzone_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)',     [dzId]   );    return loads; } |
| --- |

| async function bulkImportRoles(   dzId: number,   csvContent: string,   importedBy: number ): Promise<BulkImportResult> {   // CSV format: email, role_name, expires_days   // Example: coach@skydive.com, instructor, 30    const rows = csvContent.split('\n').slice(1);   const results = { success: 0, failed: 0, errors: [] };    for (const row of rows) {     const [email, roleName, expiresDays] = row.split(',');      try {       // 1. Find or create user       let user = await db.query(         'SELECT id FROM users WHERE email = ?',         [email]       );       if (!user) {         user = await createUserInvitation(email);       }        // 2. Get role ID       const role = await db.query(         'SELECT id FROM roles WHERE name = ?',         [roleName]       );       if (!role) throw new Error('Invalid role');        // 3. Create role grant       const expiresAt = expiresDays         ? new Date(Date.now() + parseInt(expiresDays) * 24 * 60 * 60 * 1000)         : null;        if (expiresAt) {         await grantTemporaryRole(           user.id,           role.id,           dzId,           expiresAt,           importedBy,           'Bulk import'         );       } else {         await db.query(           'INSERT INTO user_roles (user_id, role_id, dropzone_id, assigned_by) VALUES (?, ?, ?, ?)',           [user.id, role.id, dzId, importedBy]         );       }        results.success++;     } catch (err) {       results.failed++;       results.errors.push({ row: email, error: err.message });     }   }    return results; } |
| --- |

| CREATE TABLE audit_logs (   id BIGINT PRIMARY KEY AUTO_INCREMENT,   event_type VARCHAR(50) NOT NULL,   actor_id BIGINT NOT NULL,   actor_role VARCHAR(50),   dropzone_id BIGINT,   resource_type VARCHAR(50) NOT NULL,   resource_id VARCHAR(255),   action VARCHAR(50),   before_state JSON,   after_state JSON,   ip_address VARCHAR(45),   user_agent VARCHAR(255),   device_id VARCHAR(100),   session_id VARCHAR(100),   reason TEXT,   correlation_id VARCHAR(36),   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   checksum VARCHAR(64),   INDEX idx_dz_time (dropzone_id, created_at),   INDEX idx_actor_time (actor_id, created_at),   INDEX idx_resource (resource_type, resource_id),   INDEX idx_event_type (event_type, created_at),   INDEX idx_checksum (checksum) ); |
| --- |

| function calculateChecksum(   id: number,   eventType: string,   actorId: number,   beforeState: any,   afterState: any,   createdAt: Date ): string {   const crypto = require('crypto');   const content = [     id,     eventType,     actorId,     JSON.stringify(beforeState),     JSON.stringify(afterState),     createdAt.toISOString()   ].join('|');    return crypto.createHash('sha256').update(content).digest('hex'); } |
| --- |

| Module | Events (examples) | Severity | Requires Reason | Retention |
| --- | --- | --- | --- | --- |
| Load Ops | load_created, load_status_changed, slot_added, cg_override, exit_order_changed | HIGH | Yes* | 7 years |
| Bookings | booking_created, booking_approved, booking_rejected, booking_cancelled, booking_refunded | HIGH | Yes* | 7 years |
| Financial | payment_captured, payout_initiated, commission_calculated, refund_processed, financial_override | CRITICAL | Yes | 7 years |
| Safety | emergency_activated, off_landing_detected, weather_hold, risk_override, medical_viewed | CRITICAL | Yes | 7 years |
| Permissions | role_granted, role_revoked, permission_override, temp_role_expired | NORMAL | Yes | 7 years |
| Instructor | instructor_assigned, reassigned, availability_changed, training_logged | NORMAL | No | 2 years |
| Auth | login, logout, failed_login, password_reset, mfa_enabled | HIGH | No | 1 year |
| System | api_error, rate_limit_hit, config_change, backup_completed | INFO | No | 90 days |

| function auditMiddleware(auditConfig: AuditConfig) {   return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {     const originalMethod = descriptor.value;      descriptor.value = async function(...args: any[]) {       const { userId, dzId, resource } = this.context;       const resourceId = args[0]?.id || args[0];        // Capture before state       let beforeState = null;       if (auditConfig.captureBeforeState) {         beforeState = await db.query(           `SELECT * FROM ${resource} WHERE id = ?`,           [resourceId]         );       }        // Execute original method       const result = await originalMethod.apply(this, args);        // Capture after state       const afterState = await db.query(         `SELECT * FROM ${resource} WHERE id = ?`,         [resourceId]       );        // Create audit entry       await createAuditEntry({         eventType: auditConfig.eventType,         actorId: userId,         resourceType: resource,         resourceId: resourceId.toString(),         dzId,         beforeState,         afterState,         reason: auditConfig.reason,         ipAddress: this.context.ipAddress,         userAgent: this.context.userAgent       });        return result;     };     return descriptor;   }; } |
| --- |

| function generateDiff(before: any, after: any): ChangeDetail[] {   const changes: ChangeDetail[] = [];    // Get all keys from both objects   const allKeys = new Set([     ...Object.keys(before || {}),     ...Object.keys(after || {})   ]);    for (const key of allKeys) {     const oldVal = before?.[key];     const newVal = after?.[key];      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {       changes.push({         field: key,         before: oldVal,         after: newVal,         type: !oldVal ? 'added' : !newVal ? 'removed' : 'modified'       });     }   }    return changes; } |
| --- |

| async function reconstructTimeline(   filters: {     dzId?: number;     resourceType?: string;     resourceId?: string;     startDate?: Date;     endDate?: Date;     actorId?: number;     eventType?: string;   } ): Promise<AuditEntry[]> {   let query = 'SELECT * FROM audit_logs WHERE 1=1';   const params: any[] = [];    if (filters.dzId) {     query += ' AND dropzone_id = ?';     params.push(filters.dzId);   }   if (filters.resourceType && filters.resourceId) {     query += ' AND resource_type = ? AND resource_id = ?';     params.push(filters.resourceType, filters.resourceId);   }   if (filters.startDate) {     query += ' AND created_at >= ?';     params.push(filters.startDate);   }   if (filters.endDate) {     query += ' AND created_at <= ?';     params.push(filters.endDate);   }   if (filters.actorId) {     query += ' AND actor_id = ?';     params.push(filters.actorId);   }    query += ' ORDER BY created_at ASC';    const timeline = await db.query(query, params);    // Verify checksums for integrity   for (const entry of timeline) {     const calculatedChecksum = calculateChecksum(       entry.id,       entry.event_type,       entry.actor_id,       entry.before_state,       entry.after_state,       entry.created_at     );     if (calculatedChecksum !== entry.checksum) {       entry.integrityWarning = 'CHECKSUM_MISMATCH';     }   }    return timeline; } |
| --- |

| async function exportAuditTrailPDF(   dzId: number,   startDate: Date,   endDate: Date,   exportedBy: number ): Promise<Buffer> {   const PDFDocument = require('pdfkit');   const doc = new PDFDocument();    // Header   doc.fontSize(16).text('AUDIT TRAIL EXPORT', { align: 'center' });   doc.fontSize(10).text(`Dropzone ID: ${dzId}`, { align: 'left' });   doc.text(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);   doc.text(`Exported by: ${exportedBy} on ${new Date().toISOString()}`);   doc.text(`Legal retention: 7 years per SOC2/GDPR`);   doc.moveDown();    // Query audit logs   const entries = await reconstructTimeline({     dzId,     startDate,     endDate   });    // Render each entry   for (const entry of entries) {     doc.fontSize(10).text(`[${entry.created_at}] ${entry.event_type}`);     doc.text(`  Actor: ${entry.actor_id} (${entry.actor_role})`);     doc.text(`  Resource: ${entry.resource_type}/${entry.resource_id}`);     if (entry.before_state) doc.text(`  Before: ${JSON.stringify(entry.before_state)}`);     if (entry.after_state) doc.text(`  After: ${JSON.stringify(entry.after_state)}`);     doc.text(`  Checksum: ${entry.checksum}`);     doc.moveDown();   }    return doc.getBuffer(); } |
| --- |

| import pino from 'pino';  const logger = pino({   level: process.env.LOG_LEVEL || 'info',   formatters: {     level: (label) => ({ level: label.toUpperCase() }),     bindings: (bindings) => ({       pid: bindings.pid,       hostname: bindings.hostname,       service: 'skylara-api'     })   },   timestamp: pino.stdTimeFunctions.isoTime,   base: {     service: 'skylara-api',     version: process.env.APP_VERSION   } });  // With context fields const childLogger = logger.child({   correlationId: req.correlationId,   userId: req.user?.id,   dzId: req.params.dzId,   requestId: req.id });  // Usage examples childLogger.info({ load: { id: 123 } }, 'Load created'); childLogger.error({ err }, 'Database error'); childLogger.warn({ rateLimit: 'exceeded' }, 'Rate limit hit'); |
| --- |

| Level | Usage | Retention | Alert Threshold | Example |
| --- | --- | --- | --- | --- |
| FATAL | Unrecoverable service errors | 90 days | Immediate | Database connection lost for 5+ min |
| ERROR | Request failures, exceptions | 90 days | 5+ errors/min | Permission denied, validation error |
| WARN | Degraded behavior, unusual activity | 90 days | Rate limit exceeded | Slow query detected |
| INFO | State changes, normal operations | 30 days | N/A (informational) | User login, load created, payment processed |
| DEBUG | Detailed diagnostic info | 7 days | N/A (development) | Permission check details, cache hit |
| TRACE | Per-statement call traces | 1 day | N/A (development) | Function entry/exit, variable values |

| import Sentry from '@sentry/node';  Sentry.init({   dsn: process.env.SENTRY_DSN,   environment: process.env.NODE_ENV,   tracesSampleRate: 0.1,   integrations: [     new Sentry.Integrations.Http({ tracing: true }),     new Sentry.Integrations.Express({ request: true, serverName: true })   ] });  // Error middleware app.use((err, req, res, next) => {   const logger = req.log.child({ requestId: req.id });    // Log error   logger.error({     err,     statusCode: err.statusCode || 500,     path: req.path,     method: req.method,     userId: req.user?.id   }, 'Unhandled error');    // Send to Sentry   Sentry.captureException(err, {     contexts: {       request: { url: req.path, method: req.method },       user: { id: req.user?.id, dzId: req.dzId }     },     tags: { severity: 'error' }   });    res.status(err.statusCode || 500).json({     error: err.message,     requestId: req.id   }); }); |
| --- |

| async function anonymizeAuditLogs(userId: number): Promise<void> {   // Called by GDPR deletion handler   const anonymizedId = `ANONYMIZED_USER_${userId}`;    // Update all audit logs referencing this user   await db.query(     'UPDATE audit_logs SET actor_id = NULL, actor_role = NULL WHERE actor_id = ?',     [userId]   );    // Remove PII from JSON states   const entries = await db.query(     'SELECT id, before_state, after_state FROM audit_logs WHERE before_state LIKE ? OR after_state LIKE ?',     [`%${userId}%`, `%${userId}%`]   );    for (const entry of entries) {     const before = anonymizeJSON(entry.before_state, userId);     const after = anonymizeJSON(entry.after_state, userId);      await db.query(       'UPDATE audit_logs SET before_state = ?, after_state = ? WHERE id = ?',       [before, after, entry.id]     );   }    // Log anonymization action (without actor ID)   await db.query(     'INSERT INTO audit_logs (event_type, resource_type, resource_id, dzId, before_state, after_state) VALUES (?, ?, ?, ?, ?, ?)',     ['user_anonymized', 'user', userId.toString(), null, null, { anonymizedUserId: anonymizedId }]   ); } |
| --- |

| async function searchAuditLogs(   query: string,   filters: {     dzId?: number;     eventType?: string;     startDate?: Date;     endDate?: Date;     actorId?: number;   },   pagination: { limit: number; offset: number } ): Promise<{ results: AuditEntry[]; total: number }> {   let sql = 'SELECT * FROM audit_logs WHERE 1=1';   const params: any[] = [];    // Full-text search   if (query) {     sql += ' AND MATCH(reason, after_state) AGAINST(? IN BOOLEAN MODE)';     params.push(query);   }    // Filter by criteria   if (filters.dzId) {     sql += ' AND dropzone_id = ?';     params.push(filters.dzId);   }   if (filters.eventType) {     sql += ' AND event_type = ?';     params.push(filters.eventType);   }   if (filters.startDate) {     sql += ' AND created_at >= ?';     params.push(filters.startDate);   }   if (filters.endDate) {     sql += ' AND created_at <= ?';     params.push(filters.endDate);   }    // Get total count   const countResult = await db.query(     'SELECT COUNT(*) as total FROM (' + sql + ') as t',     params   );    // Get paginated results   sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';   params.push(pagination.limit, pagination.offset);   const results = await db.query(sql, params);    return {     results,     total: countResult[0].total   }; } |
| --- |

| async function generateDailyActivityReport(dzId: number, date: Date): Promise<ActivityReport> {   const startOfDay = new Date(date);   startOfDay.setHours(0, 0, 0, 0);   const endOfDay = new Date(date);   endOfDay.setHours(23, 59, 59, 999);    const logs = await db.query(     'SELECT * FROM audit_logs WHERE dropzone_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at ASC',     [dzId, startOfDay, endOfDay]   );    const report = {     date: date.toISOString().split('T')[0],     dzId,     loadsCreated: logs.filter(l => l.event_type === 'load_created').length,     bookingsApproved: logs.filter(l => l.event_type === 'booking_approved').length,     permissionsGranted: logs.filter(l => l.event_type === 'role_granted').length,     safetyOverrides: logs.filter(l => l.event_type === 'cg_override').length,     emergenciesActivated: logs.filter(l => l.event_type === 'emergency_activated').length,     topActors: (() => {       const actorCounts = {};       logs.forEach(l => {         actorCounts[l.actor_id] = (actorCounts[l.actor_id] || 0) + 1;       });       return Object.entries(actorCounts)         .sort(([,a], [,b]) => b - a)         .slice(0, 10);     })()   };    return report; } |
| --- |

| const alertRules = [   {     name: 'Multiple Failed Logins',     condition: (logs) => {       const failedLogins = logs.filter(l => l.event_type === 'failed_login');       return failedLogins.length >= 3 && failedLogins[failedLogins.length-1].created_at.getTime() - failedLogins[0].created_at.getTime() < 5 * 60 * 1000;     },     severity: 'HIGH',     action: 'Send alert to dzOwner + security team'   },   {     name: 'CG Override Activity',     condition: (logs) => logs.some(l => l.event_type === 'cg_override'),     severity: 'CRITICAL',     action: 'Log to dashboard, notify dz_owner immediately'   },   {     name: 'Financial Override',     condition: (logs) => logs.some(l => l.event_type === 'financial_override'),     severity: 'CRITICAL',     action: 'Audit trail export, notify CFO'   },   {     name: 'Bulk Permission Change',     condition: (logs) => {       const roleChanges = logs.filter(l => ['role_granted', 'role_revoked'].includes(l.event_type));       return roleChanges.length >= 5;     },     severity: 'NORMAL',     action: 'Log event, available in reports'   } ]; |
| --- |

| import { Model } from '@nozbe/watermelon'; import { field, relation, readonly } from '@nozbe/watermelon/decorators';  export class Load extends Model {   static table = 'loads';   @field('status') status!: string;   @field('dropzone_id') dropzone_id!: string;   @field('_synced') _synced!: boolean;   @field('_changed') _changed!: string | null;   @field('_status') _status!: string;   @field('sync_version') sync_version!: number;   @field('updated_at') updated_at!: number; }  export class Slot extends Model {   static table = 'slots';   @field('load_id') load_id!: string;   @field('athlete_id') athlete_id!: string;   @field('slot_type') slot_type!: string;   @field('status') status!: string; } |
| --- |

| class SyncEngine {   private db: WatermelonDB;   private lastPulledAt: number = 0;   private syncIntervalId: NodeJS.Timeout | null = null;    async pull(lastPulledAt: number): Promise<SyncResponse> {     const response = await fetch('/api/sync/pull', {       method: 'POST',       headers: { 'Content-Type': 'application/json' },       body: JSON.stringify({ last_pulled_at: lastPulledAt })     });     return response.json();   }    async push(changes: ChangeSet): Promise<void> {     const payload = JSON.stringify(changes);     const compressed = payload.length > 10240       ? await gzip(payload)       : payload;     await fetch('/api/sync/push', {       method: 'POST',       headers: {         'Content-Type': payload !== compressed ? 'application/json' : 'application/gzip'       },       body: compressed     });   }    async fullSync(): Promise<void> {     const changes = await this.db.getChanges(this.lastPulledAt);     await this.push(changes);     const response = await this.pull(this.lastPulledAt);     await this.db.applyChanges(response.changes);     this.lastPulledAt = response.current_timestamp;   } |
| --- |

| Resource | Strategy | Reason |
| --- | --- | --- |
| Load Status | Server Authority | FSM transitions are authoritative |
| CG Calculations | Server Authority | Safety-critical recalculation required |
| Payment Status | Server Authority | Stripe webhook is source of truth |
| Emergency Profile | Server Authority | Critical data needs consistency |
| Athlete Profile | Last-Write-Wins | Non-critical, compare updated_at |
| Instructor Availability | Last-Write-Wins | User preference, time-based resolution |
| Load Slot Changes | Field-Level Merge | Different fields can merge independently |
| Instructor Notes | Field-Level Merge | Append both changes with timestamps |

| function resolveServerAuthority(   serverRecord: ServerRecord,   clientRecord: ClientRecord ): ServerRecord {   // Server always wins for safety-critical resources   return serverRecord; }  // Load status: server FSM transition is authoritative if (serverRecord.status !== clientRecord.status) {   const resolved = resolveServerAuthority(serverRecord, clientRecord);   await applyResolution(resolved, conflictType: 'SERVER_AUTHORITY'); } |
| --- |

| function resolveLastWriteWins(   serverRecord: Record,   clientRecord: Record ): Record {   if (serverRecord.updated_at >= clientRecord.updated_at) {     return serverRecord;   }   return clientRecord; }  // Athlete profile example const athleteServer = { name: 'John', updated_at: 1712500000 }; const athleteClient = { name: 'Jon', updated_at: 1712500100 }; const resolved = resolveLastWriteWins(athleteServer, athleteClient); // Result: { name: 'Jon', updated_at: 1712500100 } |
| --- |

| function fieldLevelMerge(   serverRecord: Record,   clientRecord: Record,   conflictFields: string[] ): Record {   const merged = { ...serverRecord };   for (const field of conflictFields) {     if (clientRecord[field] !== serverRecord[field]) {       // Merge different fields independently       if (field === 'instructor_notes') {         merged[field] = serverRecord[field] +           ' [CLIENT] ' + clientRecord[field];       } else if (Array.isArray(serverRecord[field])) {         merged[field] = [...new Set(           [...serverRecord[field], ...clientRecord[field]]         )];       }     }   }   return merged; } |
| --- |

| interface QueuedAction {   id: string;   action_type: string;   resource_type: string;   resource_id: string;   payload: Record<string, any>;   created_at: number;   retry_count: number;   status: 'pending' | 'processing' | 'failed' | 'conflict';   idempotency_key: string; }  class OfflineActionQueue {   async enqueue(     actionType: string,     resourceType: string,     payload: any   ): Promise<string> {     const idempotencyKey = generateUUID();     const action: QueuedAction = {       id: generateUUID(),       action_type: actionType,       resource_type: resourceType,       resource_id: payload.resource_id,       payload,       created_at: Date.now(),       retry_count: 0,       status: 'pending',       idempotency_key: idempotencyKey     };     await db.queue.add(action);     return action.id;   }    async process(): Promise<void> {     const pending = await db.queue.where('status').equals('pending').toArray();     for (const action of pending) {       try {         const response = await fetch('/api/actions/execute', {           method: 'POST',           headers: { 'Idempotency-Key': action.idempotency_key },           body: JSON.stringify(action.payload)         });         if (response.ok) {           await db.queue.update(action.id, { status: 'processed' });         } else if (response.status === 409) {           await this.handleConflict(action, response.json());         } else {           await this.retry(action);         }       } catch (error) {         await this.retry(action);       }     }   }    private async retry(action: QueuedAction): Promise<void> {     const backoff = Math.pow(2, action.retry_count) * 1000;     if (action.retry_count < 3) {       await new Promise(r => setTimeout(r, backoff));       await db.queue.update(action.id, {         retry_count: action.retry_count + 1       });     } else {       await db.queue.update(action.id, { status: 'failed' });     }   }    async handleConflict(action: QueuedAction, serverState: any): Promise<void> {     // Notify user of conflict, revert local state     await db.queue.update(action.id, { status: 'conflict' });     emitEvent('conflict:detected', {       actionId: action.id,       resourceType: action.resource_type,       serverState     });   } } |
| --- |

| class ManifestSyncAdapter {   async lockLoad(loadId: string): Promise<LockToken> {     try {       const response = await fetch(`/api/loads/${loadId}/lock`, {         method: 'POST',         body: JSON.stringify({ duration_seconds: 60 })       });       if (response.ok) {         return response.json();       }     } catch (error) {       // Offline: proceed with soft lock flag       return { token: generateUUID(), offline: true };     }   }    async syncLoadChanges(loadId: string, changes: any): Promise<void> {     // Apply optimistically     await db.loads.update(loadId, changes);     emitEvent('ui:update', { loadId, changes });      // Sync in background     const response = await fetch(`/api/loads/${loadId}/sync`, {       method: 'PATCH',       body: JSON.stringify(changes)     });      if (!response.ok) {       const conflict = await response.json();       // Alert both manifest staff       emitEvent('manifest:collision', { loadId, conflict });       // Server version wins       await db.loads.update(loadId, conflict.serverVersion);     }   } } |
| --- |

| // Service Worker registration and cache strategy self.addEventListener('install', (event) => {   event.waitUntil(     caches.open('v1-static').then((cache) =>       cache.addAll([         '/', '/dashboard', '/manifest', '/check-in', '/emergency',         '/static/styles.css', '/static/app.js'       ])     )   ); });  self.addEventListener('fetch', (event) => {   const url = new URL(event.request.url);   if (url.pathname.startsWith('/api')) {     // Network-first with stale fallback     event.respondWith(       fetch(event.request).catch(() =>         caches.match(event.request)       )     );   } else {     // Cache-first for static     event.respondWith(       caches.match(event.request).then((r) =>         r || fetch(event.request)       )     );   } });  // Background sync for queued actions self.addEventListener('sync', (event) => {   if (event.tag === 'sync-offline-queue') {     event.waitUntil(       db.queue.process().catch(console.error)     );   } }); |
| --- |

| async function verifyDataIntegrity(): Promise<void> {   // CRC32 checksum verification   const payload = JSON.stringify(changes);   const checksum = crc32(payload);   const response = await fetch('/api/sync/verify', {     body: JSON.stringify({ data: changes, checksum })   });    if (!response.ok) {     throw new Error('Checksum mismatch - data corruption detected');   } }  async function atomicSync(changes: ChangeSet): Promise<void> {   await db.write(async () => {     // All changes in single transaction     for (const record of changes.created) {       await db.create(record);     }     for (const record of changes.updated) {       await db.update(record);     }   }); }  async function detectOrphans(): Promise<void> {   const orphaned = await db.query(     'SELECT * FROM sync_queue WHERE created_at < ? AND status = "failed"',     [Date.now() - 24 * 60 * 60 * 1000]   );   if (orphaned.length > 0) {     emitEvent('data:orphaned', { count: orphaned.length });   } } |
| --- |

| // Financial flow: Booking → Items → Payment → Commission Split → Payout interface BookingFlow {   bookingId: string;   dropzone_id: string;   athlete_id: string;   total_price_cents: number;  // Always integer cents, never float   currency: string;   commission_amount_cents: number;   payment_status: 'pending' | 'paid' | 'failed' | 'refunded';   stripe_payment_intent_id: string; }  interface BookingItem {   id: string;   booking_id: string;   item_type: 'jump_ticket' | 'coaching' | 'gear_rental' | 'media';   unit_price_cents: number;   quantity: number;   subtotal_cents: number;   tax_amount_cents: number; } |
| --- |

| async function calculatePaymentSplit(bookingId: string): Promise<PaymentSplit> {   const booking = await db.bookings.get(bookingId);   const items = await db.booking_items.where('booking_id').equals(bookingId).toArray();   const dz = await db.dropzones.get(booking.dropzone_id);   const commission = await db.dz_commission_config.get(dz.id);    let subtotal = 0, taxTotal = 0;   for (const item of items) {     subtotal += item.unit_price_cents * item.quantity;     taxTotal += item.tax_amount_cents;   }    const commissionRate = commission.rate_percent / 100;   const platformCommission = Math.floor(subtotal * commissionRate);   const dzRevenue = subtotal - platformCommission;   const instructorFee = calculateInstructorFee(items, dz);    return {     subtotal_cents: subtotal,     tax_cents: taxTotal,     platform_commission_cents: platformCommission,     dz_revenue_cents: dzRevenue - instructorFee,     instructor_fee_cents: instructorFee,     total_cents: subtotal + taxTotal   }; }  async function executeStripePayment(   bookingId: string,   split: PaymentSplit ): Promise<void> {   const booking = await db.bookings.get(bookingId);   const dz = await db.dropzones.get(booking.dropzone_id);    const paymentIntent = await stripe.paymentIntents.create({     amount: split.total_cents,     currency: booking.currency.toLowerCase(),     customer: booking.stripe_customer_id,     transfer_data: {       destination: dz.stripe_connected_account_id       amount: split.dz_revenue_cents + split.instructor_fee_cents     },     metadata: {       booking_id: bookingId,       dz_id: dz.id     }   });    await db.bookings.update(bookingId, {     stripe_payment_intent_id: paymentIntent.id   }); } |
| --- |

| async function calculatePayout(   dzId: string,   periodStart: number,   periodEnd: number ): Promise<PayoutCalculation> {   // Sum all DZ revenue transactions in period   const revenue = await db.transactions     .where('dropzone_id').equals(dzId)     .filter(t =>       t.type === 'charge' &&       t.created_at >= periodStart &&       t.created_at <= periodEnd &&       t.status === 'settled'     ).toArray();    const refunds = await db.transactions     .where('dropzone_id').equals(dzId)     .filter(t =>       t.type === 'refund' &&       t.created_at >= periodStart &&       t.created_at <= periodEnd     ).toArray();    const revenueCents = revenue.reduce((sum, t) => sum + t.amount, 0);   const refundCents = refunds.reduce((sum, t) => sum + t.amount, 0);   const netCents = revenueCents - refundCents;   const minThreshold = 5000; // $50 minimum    const dz = await db.dropzones.get(dzId);   const holdActive = Date.now() - dz.created_at < 14 * 24 * 60 * 60 * 1000;    return {     gross_cents: revenueCents,     refunds_cents: refundCents,     net_cents: netCents,     meets_threshold: netCents >= minThreshold,     on_hold: holdActive,     period_start: periodStart,     period_end: periodEnd   }; }  async function executePayout(payoutId: string): Promise<void> {   const payout = await db.payouts.get(payoutId);   const dz = await db.dropzones.get(payout.dropzone_id);    const stripeTransfer = await stripe.transfers.create({     amount: payout.amount_cents,     currency: payout.currency.toLowerCase(),     destination: dz.stripe_connected_account_id,     transfer_group: `payout_${payoutId}`   });    await db.payouts.update(payoutId, {     stripe_transfer_id: stripeTransfer.id,     status: 'transferred'   }); } |
| --- |

| interface Wallet {   id: string;   user_id: string;   balance_cents: number;   currency: string;   last_topped_up_at: number; }  interface WalletTransaction {   id: string;   wallet_id: string;   type: 'topup' | 'spend' | 'refund' | 'promo' | 'referral';   amount_cents: number;   reference_id: string;   created_at: number; }  async function chargeWithWallet(   userId: string,   amountCents: number,   bookingId: string ): Promise<ChargeResult> {   const wallet = await db.wallets.where('user_id').equals(userId).first();   const walletCharge = Math.min(wallet.balance_cents, amountCents);   const cardCharge = amountCents - walletCharge;    if (walletCharge > 0) {     await db.wallet_transactions.add({       id: generateUUID(),       wallet_id: wallet.id,       type: 'spend',       amount_cents: walletCharge,       reference_id: bookingId,       created_at: Date.now()     });     await db.wallets.update(wallet.id, {       balance_cents: wallet.balance_cents - walletCharge     });   }    return {     wallet_charge_cents: walletCharge,     card_charge_cents: cardCharge,     total_cents: amountCents   }; }  async function creditWallet(   userId: string,   amountCents: number,   type: 'refund' | 'promo' | 'referral',   referenceId: string ): Promise<void> {   const wallet = await db.wallets.where('user_id').equals(userId).first();   await db.wallet_transactions.add({     id: generateUUID(),     wallet_id: wallet.id,     type: type,     amount_cents: amountCents,     reference_id: referenceId,     created_at: Date.now()   });   await db.wallets.update(wallet.id, {     balance_cents: wallet.balance_cents + amountCents,     last_topped_up_at: Date.now()   }); } |
| --- |

| async function calculateRefund(   bookingId: string,   reason: 'user_cancellation' | 'weather' | 'dz_cancellation' ): Promise<RefundConfig> {   const booking = await db.bookings.get(bookingId);   const dz = await db.dropzones.get(booking.dropzone_id);   const refundPolicy = await db.refund_policies.get(dz.id);    if (reason === 'weather' || reason === 'dz_cancellation') {     const bonus = reason === 'dz_cancellation' ? 0.10 : 0;     return {       amount_cents: booking.total_price_cents,       destination: 'original_method',       bonus_credit_percent: bonus     };   }    const hoursUntilLoad = (booking.load_time - Date.now()) / (60 * 60 * 1000);   let refundPercent = 0;   if (hoursUntilLoad > 48) refundPercent = 1.0;   else if (hoursUntilLoad > 24) refundPercent = 0.75;   else if (hoursUntilLoad > 12) refundPercent = 0.50;    return {     amount_cents: Math.floor(booking.total_price_cents * refundPercent),     destination: 'user_choice',     policy_applied: refundPolicy.id   }; }  async function processRefund(   bookingId: string,   refundConfig: RefundConfig ): Promise<void> {   const booking = await db.bookings.get(bookingId);   const refund = await stripe.refunds.create({     payment_intent: booking.stripe_payment_intent_id,     amount: refundConfig.amount_cents,     metadata: { booking_id: bookingId, reason: refundConfig.reason }   });    if (refundConfig.destination === 'wallet') {     await creditWallet(       booking.athlete_id,       refundConfig.amount_cents,       'refund',       bookingId     );   }    await db.bookings.update(bookingId, {     payment_status: 'refunded',     refund_status: 'processed'   }); } |
| --- |

| interface TaxRate {   id: string;   country: string;   region: string | null;   rate_percent: number;   type: 'VAT' | 'sales_tax' | 'GST';   effective_from: number;   effective_to: number | null; }  async function calculateTax(   dzId: string,   amountCents: number,   customerCountry: string ): Promise<TaxCalculation> {   const dz = await db.dropzones.get(dzId);   const taxRate = await db.tax_rates.where('country').equals(customerCountry)     .filter(t =>       t.effective_from <= Date.now() &&       (!t.effective_to || t.effective_to > Date.now())     ).first();    if (!taxRate) {     return { tax_cents: 0, total_cents: amountCents, rate: 0 };   }    const isBtoB = dz.vat_id && dz.vat_id.startsWith(customerCountry);   const ratePercent = (isBtoB && taxRate.type === 'VAT') ? 0 : taxRate.rate_percent;   const taxCents = Math.floor(amountCents * (ratePercent / 100));    const isTaxInclusive = dz.tax_inclusive ?? true;   return {     subtotal_cents: isTaxInclusive ? amountCents - taxCents : amountCents,     tax_cents: taxCents,     total_cents: amountCents + (isTaxInclusive ? 0 : taxCents),     rate: ratePercent,     b2b_reverse_charge: isBtoB && taxRate.type === 'VAT'   }; } |
| --- |

| async function generateFinancialReport(   dzId: string,   period: 'daily' | 'weekly' | 'monthly',   reportType: 'revenue' | 'p_and_l' | 'cash_flow' ): Promise<FinancialReport> {   const startDate = getPeriodStart(period);   const endDate = Date.now();    const transactions = await db.transactions     .where('dropzone_id').equals(dzId)     .filter(t => t.created_at >= startDate && t.created_at <= endDate)     .toArray();    const revenue = transactions     .filter(t => t.type === 'charge' && t.status === 'settled')     .reduce((sum, t) => sum + t.amount, 0);    const refunds = transactions     .filter(t => t.type === 'refund')     .reduce((sum, t) => sum + t.amount, 0);    const payouts = transactions     .filter(t => t.type === 'payout' && t.status === 'transferred')     .reduce((sum, t) => sum + t.amount, 0);    const chargebacks = transactions     .filter(t => t.type === 'chargeback')     .length;    const chargebackRate = chargebacks / (revenue / 100); // 0.5% alert threshold   if (chargebackRate > 0.005) {     emitAlert('chargeback_rate_high', { rate: chargebackRate, dzId });   }    return {     period,     revenue_cents: revenue,     refunds_cents: refunds,     payouts_cents: payouts,     net_platform_revenue_cents: revenue - payouts,     chargeback_count: chargebacks,     chargeback_rate: chargebackRate   }; } |
| --- |

| async function reconcileStripeTransactions(date: number): Promise<void> {   // Fetch all Stripe transactions for the date   const stripeEvents = await stripe.events.list({     created: { gte: Math.floor(date / 1000) },     types: [       'payment_intent.succeeded',       'charge.refunded',       'transfer.created'     ]   });    // Reconcile against local database   for (const event of stripeEvents.data) {     const localTransaction = await db.transactions       .where('stripe_id').equals(event.data.object.id)       .first();      if (!localTransaction) {       // Stripe has transaction we don't — log discrepancy       console.warn('Unmatched Stripe transaction', event.data.object.id);     } else if (localTransaction.amount !== event.data.object.amount) {       // Amount mismatch — critical error       throw new Error(`Reconciliation failure for ${event.data.object.id}`);     }   } }  async function executeFinancialOperation(   operationType: string,   payload: any,   idempotencyKey: string ): Promise<any> {   // Every operation must have unique idempotency key   const response = await fetch('/api/financial/execute', {     method: 'POST',     headers: {       'Idempotency-Key': idempotencyKey     },     body: JSON.stringify({ operationType, payload })   });   return response.json(); }  // Separation of duties: approval ≠ execution async function approveAndExecutePayout(   payoutId: string,   approverUserId: string,   executorUserId: string ): Promise<void> {   if (approverUserId === executorUserId) {     throw new Error('Separation of duties violation');   }   await db.payouts.update(payoutId, {     approved_by: approverUserId,     approved_at: Date.now()   });   await executePayout(payoutId); } |
| --- |

| Component | Target SLA | Current Estimate | Scaling Strategy |
| --- | --- | --- | --- |
| Load board query | 50ms | 45ms | Covering index + Redis cache (30s TTL) |
| Check-in mutation | 150ms | 120ms | Write to DB + Redis pub/sub broadcast |
| Manifest SSR render | 200ms | 180ms | ISR with revalidation on state change |
| WebSocket broadcast | 100ms | 85ms | Redis adapter, perMessageDeflate |
| Athlete profile fetch | 50ms | 60ms | Cache-aside (5min TTL), add read replica |
| Permission check | 10ms | 15ms | In-process LRU cache (5s TTL) |
| Subscription status | 20ms | 25ms | Redis cache (1h TTL), warm on login |
| Report generation | 2000ms | 2500ms | BullMQ worker, async export to S3 |

| Resource | Cache Tier | TTL | Invalidation Trigger | Est. Hit Rate |
| --- | --- | --- | --- | --- |
| Load board | L2 (Redis) | 30s | load_status_change event | 85% |
| Athlete profile | L2 (Redis) | 5min | athlete_profile_updated event | 92% |
| Permission matrix | L1 + L2 | 5min / 1h | role_updated, team_changed events | 95% |
| DZ settings | L2 (Redis) | 15min | dz_settings_changed event | 88% |
| Subscription status | L2 (Redis) | 1h | subscription_changed event | 78% |
| Load manifest | L2 (Redis) | 2min | manifest_changed event (auto-broadcast) | 90% |
| Aircraft list | L1 + L2 | 10min | aircraft_updated event | 97% |
| Static assets | L3 (CDN) | 24h | deployment (cache bust via version) | 99% |
| Media thumbnails | L3 (CDN) | 7d | media_deleted event | 94% |
| Feature flags | L1 | 5s | feature_flag_updated event | 99% |

| Query | Current Index | Optimization Applied | Est. Improvement |
| --- | --- | --- | --- |
| Load board (SELECT by DZ + status + date) | (dropzone_id, status, scheduled_date) | Covering index added (includes columns needed for display) | 120ms → 35ms |
| Check-in manifest (SELECT by load_id) | (load_id, checkin_status) | Composite index, reorder status first | 85ms → 18ms |
| Athlete profile + jumps (SELECT + JOIN) | (athlete_id) + (athlete_id, created_at DESC) | Denormalize recent jump count to athlete row | 150ms → 42ms |
| Permission check (SELECT by user + resource) | (user_id, resource_type, action) | Covering index with role included | 25ms → 8ms |
| Audit log query (SELECT by date range) | (created_at) partitioned by month | Monthly partitions, prune old partitions | 500ms → 120ms |
| Subscription status (SELECT by athlete + date) | (athlete_id, status, ended_at) | Covering index for active subscription check | 45ms → 12ms |
| Instructor availability (SELECT by DZ + date) | (dropzone_id, scheduled_date, status) | Composite index, cache results 10min | 200ms → 55ms |
| Load utilization report (aggregate) | GROUP BY indexes on aircraft_id, load_id | Materialized view (refreshed hourly) + cache | 5000ms → 350ms |

| // Health check endpoint export async function GET(req: Request) {   try {     const dbCheck = pool.query('SELECT 1');     const cacheCheck = redis.ping();     await Promise.all([dbCheck, cacheCheck]);     return Response.json({ status: 'healthy' }, { status: 200 });   } catch (err) {     return Response.json({ status: 'unhealthy', error: err.message }, { status: 503 });   } } |
| --- |

| import { Server } from 'socket.io'; import { createAdapter } from '@socket.io/redis-adapter';  const io = new Server(server, {   adapter: createAdapter(pubClient, subClient),   cors: { origin: process.env.FRONTEND_URL, credentials: true },   transports: ['websocket', 'polling'],   perMessageDeflate: { threshold: 1024 } });  io.on('connection', (socket) => {   socket.on('join-dz', (dzId) => {     socket.join(`dz:${dzId}`);     io.to(`dz:${dzId}`).emit('member-joined', { userId: socket.userId });   }); });  // Broadcast load status change to entire DZ io.to(`dz:${loadData.dropzone_id}`).emit('load-updated', loadData); |
| --- |

| import http from 'k6/http'; import { check, sleep } from 'k6'; import { Counter, Histogram } from 'k6/metrics';  const errorCount = new Counter('errors'); const latency = new Histogram('latency');  export const options = {   vus: 100,   duration: '5m',   thresholds: {     'http_req_duration': ['p(99)<200', 'p(95)<100'],     'errors': ['count<5']   } };  export default function() {   const res = http.get('https://api.skylara.com/load-board');   latency.add(res.timings.duration);   check(res, { 'status is 200': (r) => r.status === 200 }) || errorCount.add(1);   sleep(1); } |
| --- |

| Analytics Layer | Data Source | Latency | Primary Users | Tools |
| --- | --- | --- | --- | --- |
| Real-time ops | MySQL + Redis + WebSocket | < 2s | DZ operators, staff | Custom React dashboards + Grafana |
| Revenue tracking | MySQL (transactions), Redis cache | < 5s | Finance, DZ owners | Custom dashboard, Stripe API |
| Load utilization | MySQL (loads, manifest) | < 10s | DZ managers | Metabase, custom charts |
| Instructor performance | MySQL (jumps, ratings) | < 30s | DZ owners, instructors | Metabase, Google Sheets |
| Jumper activity | Data warehouse (daily snapshot) | 6-12h | Marketing, retention | Metabase, custom cohort queries |
| Demand forecasting | Data warehouse + external (weather) | Daily | DZ managers | Claude AI (pattern analysis) + k-NN time-series |
| Strategic reporting | Data warehouse | 24h+ | Executive, board | Metabase, PDF export |

| // Real-time revenue tracker export async function calculateRevenueMetrics(dzId: string, period: 'today' | 'week' | 'month') {   const cacheKey = `revenue:${dzId}:${period}`;   let metrics = await redis.get(cacheKey);    if (!metrics) {     const dateRange = getDateRange(period);     const result = await db.query(`       SELECT         SUM(amount) as total,         activity_type,         COUNT(DISTINCT athlete_id) as unique_jumpers       FROM payments       WHERE dropzone_id = ? AND created_at BETWEEN ? AND ?       GROUP BY activity_type     `, [dzId, dateRange.start, dateRange.end]);      metrics = aggregateByStream(result);     await redis.set(cacheKey, metrics, 'EX', 300); // 5min TTL   }   return metrics; } |
| --- |

| export async function calculateLoadMetrics(dzId: string, dateRange: DateRange) {   const loads = await db.query(`     SELECT id, scheduled_date, capacity, slot_count, status, cancelled_at, cancellation_reason     FROM loads     WHERE dropzone_id = ? AND scheduled_date BETWEEN ? AND ?   `, [dzId, dateRange.start, dateRange.end]);    const fillRates = loads.map(load => load.slot_count / load.capacity);   const avgFillRate = fillRates.reduce((a, b) => a + b) / fillRates.length;    const cancellationReasons = loads     .filter(l => l.status === 'cancelled')     .reduce((acc, l) => {       acc[l.cancellation_reason] = (acc[l.cancellation_reason] || 0) + 1;       return acc;     }, {});    return { avgFillRate, cancellationReasons }; } |
| --- |

| export async function calculateInstructorMetrics(instructorId: string, dateRange: DateRange) {   const jumps = await db.query(`     SELECT jump_id, activity_type, student_id, rating, created_at     FROM jumps     WHERE primary_instructor_id = ? AND created_at BETWEEN ? AND ?   `, [instructorId, dateRange.start, dateRange.end]);    const jumpCount = jumps.length;   const avgRating = jumps.reduce((sum, j) => sum + j.rating, 0) / jumps.length;   const specialization = countBy(jumps, 'activity_type');    // Revenue calculation (simplified)   const tandems = jumps.filter(j => j.activity_type === 'tandem').length;   const revenue = tandems * 50; // $50 per tandem commission    return { jumpCount, avgRating, specialization, revenue }; } |
| --- |

| export async function calculateJumperMetrics(athleteId: string) {   const jumps = await db.query('SELECT * FROM jumps WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 12', [athleteId]);   const profile = await db.query('SELECT * FROM athletes WHERE id = ?', [athleteId]);    const frequency = jumps.length / 12; // jumps per month   const lastJump = jumps[0]?.created_at;   const daysSinceLastJump = (Date.now() - lastJump) / (1000 * 60 * 60 * 24);    let segment;   if (daysSinceLastJump > 30) segment = 'dormant';   else if (frequency >= 3) segment = 'power_user';   else if (frequency >= 1) segment = 'regular';   else segment = 'casual';    const churnRiskScore = calculateChurnRisk(frequency, daysSinceLastJump, profile);    return { frequency, daysSinceLastJump, segment, churnRiskScore }; } |
| --- |

| export async function forecastDemand(dzId: string, days: 14) {   // 1. Fetch historical data (2 years)   const historicalBookings = await db.query(`     SELECT DATE(scheduled_date) as date, COUNT(*) as bookings     FROM loads WHERE dropzone_id = ? AND scheduled_date > DATE_SUB(NOW(), INTERVAL 2 YEAR)     GROUP BY DATE(scheduled_date)   `, [dzId]);    // 2. Decompose into trend + seasonality   const { trend, seasonality } = decomposeSeries(historicalBookings);    // 3. Fetch weather forecast + local events   const weatherForecast = await getWeatherForecast(dzId, days);   const events = await getLocalEvents(dzId, days);    // 4. Generate baseline forecast   const forecast = [];   for (let i = 0; i < days; i++) {     const date = addDays(today(), i);     const baseValue = trend[i] * seasonality[date.dayOfWeek()];     const weatherImpact = weatherForecast[i].condition === 'clear' ? 1.1 : 0.85;     const eventImpact = events[date] ? 1.25 : 1.0;     forecast.push(baseValue * weatherImpact * eventImpact);   }   return forecast; } |
| --- |

| export async function generateReport(template: string, filters: ReportFilters, format: 'csv' | 'pdf' | 'xlsx') {   let data;   switch (template) {     case 'dz-monthly':       data = await calculateRevenueMetrics(filters.dzId, 'month');       data = { ...data, ...(await calculateLoadMetrics(filters.dzId, filters.dateRange)) };       break;     case 'instructor-pay':       data = await calculateInstructorMetrics(filters.instructorId, filters.dateRange);       break;   }    const formatted = formatForExport(data, format);   return formatted; } |
| --- |

| export async function generateRecommendations(dzId: string) {   const metrics = await calculateRevenueMetrics(dzId, 'month');   const loadMetrics = await calculateLoadMetrics(dzId, getLastMonth());   const instructors = await db.query('SELECT id, jump_count FROM instructors WHERE dropzone_id = ?', [dzId]);    const recommendations = [];    // Rule: if tandem wait time > 45min, recommend hiring   if (loadMetrics.avgWaitTime > 45) {     recommendations.push({       type: 'staffing',       text: 'Hire 1 more tandem instructor',       confidence: 'high',       impactEstimate: '+$12,000/mo',       effort: 'hard'     });   }    // Rule: if Wed utilization < 40%, recommend discount   if (loadMetrics.wedUtilization < 0.4) {     recommendations.push({       type: 'pricing',       text: 'Offer 15% discount on Wednesdays',       confidence: 'medium',       impactEstimate: '+$1,500/mo',       effort: 'easy'     });   }    return recommendations; } |
| --- |