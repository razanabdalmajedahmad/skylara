# SKYLARA

_Source: 04_Platform_Blueprint.docx_

SKYLARA
The Global Operating System for Flying
PLATFORM DESIGN & STRATEGY BLUEPRINT
Version 3.0  ·  April 2026  ·  CONFIDENTIAL
"Behind every flyer is a story."
Prepared by: World-Class Product & Engineering Team
Executive Summary
SkyLara is not a booking tool. It is the identity layer of flying — a real-time operational platform, athlete identity system, and AI-powered marketplace that connects dropzone operators, instructors, pilots, riggers, athletes, and students across the globe. This document defines the complete product architecture, system design, dashboard specifications, UX framework, AI integration strategy, user flows, and scaling roadmap required to build SkyLara as the dominant global operating system for the skydiving industry.
1. Product Structure — Core Modules
SkyLara is organized into six interconnected product pillars. Each pillar owns a domain, exposes APIs, and feeds the central data graph that powers the AI and analytics layers.
1.1  Manifest System (DMS)
The operational core. Handles the full load lifecycle from creation to post-jump reconciliation. This is the mission-critical engine — every other module depends on real-time load data.
1.2  Athlete Identity & Profile
Every jumper has a permanent SkyLara identity — portable across all dropzones globally. The profile is the source of truth for licenses, currency, gear, and jump history.
1.3  Payments & Financial Layer
Stripe Integration: Payment processing, refunds, card-on-file, ACH for operators
Jump Ticket Wallet: Escrow-style: PENDING → CAPTURED → SETTLED → REFUNDED → CREDITED
Commission Engine: Configurable DZ vs instructor split (e.g., 70/30); auto-calculated at settlement
Gift Cards: Digital gift cards with redemption codes; partial use; balance tracking
Gear Rental: Per-item rental with time tracking; damage deposit hold
EOD Reconciliation: Gross/net/payroll deduction; cash drawer; variance alerts
1.4  Notifications Center
Push, SMS, and email notifications with full delivery tracking, template library, and audience targeting.
1.5  AI Intelligence Layer
Claude-powered insights embedded throughout the platform — not a chatbot sidecar, but a core operational layer.
Load Optimizer: Recommends optimal jumper/aircraft combinations to maximize revenue per load
Risk Alerts: Flags weight imbalances, expired currency, overloaded slots, weather holds
Predictive Scheduling: Forecasts demand by day/season; recommends pre-opening load creation
Revenue Insights: Jump mix analysis; recommends pricing changes; identifies low-performing days
AI Assistant: Context-aware chat for operators: answers load, staff, and booking questions
Staffing Recommender: Suggests instructor/pilot assignments based on workload and certifications
1.6  Analytics & Reporting
Multi-dimensional reporting with real-time and historical views across all operational domains.
Revenue by jump type, instructor, period, and DZ (multi-DZ SaaS admin)
Load efficiency: slots filled vs. capacity; average aircraft utilization
Athlete demographics: new vs. returning; license distribution
Instructor performance: jumps, earnings, student outcomes
AFF completion rates: pass/fail per level; average attempts
Weather impact: cancelled loads; lost revenue estimation
EOD accuracy: ticket reconciliation variance trending
2. System Architecture
2.1  Microservices Design
SkyLara is architected as a set of loosely coupled services communicating over a shared event bus. Each service owns its domain data and exposes a versioned REST API plus WebSocket events. The frontend consumes a GraphQL aggregation gateway.
2.2  Real-Time Engine
The manifest state machine is the most latency-sensitive component. All state transitions are published via WebSocket to all connected clients (manifest staff, pilots, athletes) within 200ms. Redis Pub/Sub is the transport layer.
2.3  Database Design — Core Entities
2.4  Integration Layer
3. Dashboard Design
Each role gets a purpose-built dashboard — not a filtered version of a generic screen. Every dashboard follows the same atomic layout: KPI strip → live operational feed → contextual actions → secondary analytics.
3.1  DZ Operator Dashboard
3.2  Manifest Dashboard
3.3  Athlete Dashboard
3.4  Staff Dashboard (Instructor / Rigger / Pilot)
3.5  Platform Admin Dashboard (Multi-DZ)
4. UI/UX Design System — Premium
SkyLara's design language is built on clarity, speed, and operational density. Inspired by Linear's information hierarchy, Stripe's data presentation, and Apple's spatial precision. Every pixel earns its place.
4.1  Color System
4.2  Typography Scale
Font stack: 'Inter', 'Segoe UI', system-ui, sans-serif. Fallback: Arial. No Google Fonts dependency.
4.3  Spacing System
8px base grid. All spacing values are multiples of 4 or 8. No arbitrary pixel values.
4.4  Component Library
4.5  Interaction Patterns
Real-time updates: All manifest data updates in place — no full-page refresh. Slot changes animate with a brief highlight pulse.
Optimistic UI: User actions apply immediately in the UI; server confirmation within 1s; rollback on error with toast.
Empty states: Every empty state has an illustration + primary action CTA. No dead ends.
Error handling: Inline errors on form fields; toast notifications for async failures; never modal-block for non-critical errors.
Loading states: Skeleton screens instead of spinners for data loads. Spinners only for actions (buttons).
Density control: Operator and manifest views default to high density. Athlete and student views use comfortable spacing.
Keyboard nav: All primary manifest actions accessible via keyboard shortcuts (documented in help overlay).
5. AI Integration — Claude-Powered Intelligence
AI in SkyLara is not cosmetic. It operates as an embedded decision-support layer across manifest operations, safety compliance, revenue optimization, and support — with human operators always in control of final actions.
5.1  AI Use Cases & Workflows
5.2  Example Claude Prompts
The ai-service constructs these prompts dynamically from live operational data, then caches responses in Redis for 60 seconds.
Load Optimizer Prompt:
You are the manifest intelligence engine for SkyLara dropzone management.
Current state:
- Aircraft: Caravan (15 slots, max TOW 8,750 lbs)
- Queue: 22 athletes (8 tandem pairs, 4 fun jumpers, 2 AFF L5)
- Weather JI: 2 (suitable, light winds)
- Next load target: 90% fill rate, balanced exit order

Recommend optimal slot assignments for the next 2 loads. Prioritize tandem pairs together, AFF with certified instructor, and ensure CG is within limits. Format as JSON: { load_1: [{ slot, jumper_id, jump_type, exit_order }...], load_2: [...] }
Risk Alert Prompt:
Analyze this load for safety and operational risks:
- Load: 14 jumpers, Caravan, 14,000 ft
- Weight: 8,240 lbs (94% of max TOW 8,750 lbs)
- Compliance flags: Athlete #A1042 currency expired 3 days ago
- Weather: JI 3, winds 18 kts at altitude, building cumulus

Return a JSON array of risk alerts: [{ severity: "high"|"medium"|"low", category: "safety"|"compliance"|"weather"|"ops", message: string, recommended_action: string }]
5.3  AI Architecture
6. User Flows
6.1  Fun Jumper: Check-In → Manifest → Jump → Logbook
6.2  Tandem Booking → Assignment → Completion
6.3  Weather Hold → Reschedule
1. JI Deteriorates: Weather service detects JI ≥ 4 or ceiling < 3,000 ft; risk alert generated
2. Operator Triggers Hold: Operator clicks 'Weather Hold' on affected loads; all loads → HELD status
3. Athlete Notification: Push + SMS to all manifested athletes: 'Load #12 on hold — weather. Updates to follow.'
4. AI Prediction: AI service checks forecast: 'Window likely to clear at 14:00. Recommend holding until 13:30 decision.'
5. Decision Point: Operator reviews forecast at decision time; either advances load or cancels
6. Cancel Path: If cancelled: all tickets credited back to athlete wallets automatically; notification sent
7. Resume Path: If resumed: load state → OPEN; athletes re-notified; new call times issued
6.4  Staff Assignment → Payout
7. Scalability & Future Roadmap
7.1  Multi-DZ SaaS Architecture
SkyLara operates as a multi-tenant platform where each dropzone is an isolated tenant. Tenant isolation is enforced at the database row level (dz_id on every table) and at the API gateway level (JWT claims include dz_id scope). The Platform Admin role spans all tenants without tenant scoping.
7.2  Global Scaling Strategy
7.3  Data Analytics Platform
Phase 2 roadmap: a dedicated analytics data warehouse that aggregates cross-DZ data for industry-wide benchmarking, predictive demand modeling, and SkyLara marketplace intelligence.
Data Warehouse: Snowflake or BigQuery; nightly ETL from operational Postgres; 3-year retention
Benchmark Reports: Anonymous cross-DZ benchmarks: avg revenue/load, fill rate, AFF completion rate
Demand Forecasting: ML model trained on 3+ years of historical jump data + weather + local events
Athlete Insights: Aggregate behavior patterns: when athletes stop jumping, what re-activates them
Market Expansion: Data signals to identify underserved markets for new DZ recruitment
7.4  Marketplace Expansion
8. Critical Review — Weaknesses, Risks & Improvements
This section applies the lens of a senior CTO and experienced B2B SaaS investor. Every assumption has been challenged. Weaknesses are stated plainly with concrete remedies.
8.1  Current Weaknesses
8.2  Architectural Risks
8.3  Strategic Recommendations
Rec 1: Launch with 3 anchor DZs: Do not spread beta across 20 DZs. Go deep with 3 high-volume partner DZs — 1 USA, 1 Europe, 1 AUS. Use their operational feedback to harden the system before scaling.
Rec 2: Athlete identity is the moat: The booking market is competitive. The identity layer — portable logbook, currency, gear, history — is where no competitor has gone. Make it so good athletes demand their DZ uses SkyLara.
Rec 3: AI must be provably useful in week 1: If the AI insight banner says 'No insights available' or surfaces irrelevant alerts, operators will ignore it permanently. Pre-populate with 5 guaranteed useful insights from day-1 data — even simple ones.
Rec 4: Solve the manifest staff UX first: Every other user has optional engagement. Manifest staff use the system 8 hours a day, every day. Their speed and ergonomics determine operator retention. Invest in keyboard shortcuts, batch actions, and screen real-estate for the manifest view above all else.
Rec 5: Price on outcomes, not seats: Per-seat pricing advantages large DZs and penalizes small ones. Consider per-jump pricing tiers (e.g., $0.25/jump settled) with a monthly cap. This aligns SkyLara's revenue with DZ success.
SkyLara — Built for the sky. Designed for the people in it.
eng.alifouad91@gmail.com  ·  Confidential  ·  April 2026

| Attribute | Detail |
| --- | --- |
| Market | Global skydiving industry — 3.3M+ jumps/year, 600+ dropzones worldwide |
| Core Value | Real-time manifest operations + athlete identity + AI intelligence layer |
| Competitive Edge | Only platform combining DMS + athlete identity + AI + multi-DZ SaaS in one |
| Target Users | DZ Operators, Manifest Staff, Instructors, Pilots, Riggers, Athletes, Students |
| Business Model | SaaS per-DZ subscription + per-jump transaction fee + marketplace commission |
| Tech Stack | React/Next.js · Node.js · PostgreSQL · Redis · WebSocket · Claude AI · Stripe |
| Platform Status | v3 — 28 screens, 8 RBAC roles, full DMS, AI layer, multi-DZ SaaS admin |

| Module | Capability | Key Entities | Real-Time? |
| --- | --- | --- | --- |
| Load Manager | Create/edit/cancel loads; slot assignment | Load, Slot, Aircraft | Yes — WebSocket |
| Exit Order Engine | 9-group algorithm; pilot briefing sheet | ExitGroup, JumperSlot | Yes |
| Call Time State FSM | OPEN→FILLING→LOCKED→30MIN→20MIN→10MIN→BOARDING→AIRBORNE→LANDED→COMPLETE|CANCELLED | LoadStatus | Yes |
| Waitlist Manager | Auto-fill on no-show; 5-min trigger | Waitlist, NoShow | Yes |
| Check-In Engine | 8-point compliance grid; BMI; gear check | CheckIn, Compliance | Yes |
| CG Calculator | Aircraft weight & balance; payload utilization | Aircraft, Payload, CGMargin | On demand |
| Reconciliation | EOD ticket inventory; cash drawer; commissions | Transaction, EODReport | Batch |

| Module | Capability | USPA Compliance |
| --- | --- | --- |
| License Registry | A/B/C/D/E + AFF; federation sync | License currency rules enforced |
| Digital Logbook | Per-jump record; coach sign-off; exports | USPA IRM compliant |
| Gear Registry | Container + reserve + AAD; repack tracking | Reserve 180-day; AAD expiry alert |
| Currency Engine | A/B: 90-day, D: 180-day; automatic suspension | Auto-block at check-in if expired |
| Wallet & Tickets | Jump ticket escrow; balance; purchase history | N/A — financial layer |
| AFF Progression | 8-level tracker; skill pass/fail; evaluation forms | AFF completion cert |

| Trigger | Channel | Template Variables | Timing |
| --- | --- | --- | --- |
| Load Created | Push + SMS | {load_id}, {aircraft}, {altitude} | Immediate |
| 30MIN Call | Push + SMS | {load_id}, {slot} | Automatic at state change |
| 20MIN Call | Push | {load_id} | Automatic |
| 10MIN Call | Push + SMS | {load_id} | Automatic |
| Boarding | Push | {load_id}, {exit_order} | Automatic |
| Waitlist Slot Open | Push + SMS | {load_id}, {slot}, {expires_in} | Immediate on no-show |
| Currency Expiring | Push + Email | {athlete}, {license}, {days_left} | 7-day warning |
| Reserve Repack Due | Push + Email | {gear_id}, {due_date} | 30-day warning |
| Booking Confirmed | Email | {name}, {date}, {jump_type} | Immediate |
| Payment Settled | Email | {amount}, {split} | At settlement |

| Service | Owns | API Prefix | Key Events Emitted |
| --- | --- | --- | --- |
| manifest-service | Loads, Slots, ExitOrder, Waitlist | /api/v1/manifest | load.created, load.state_changed, slot.assigned |
| identity-service | Athletes, Licenses, Logbook, Currency | /api/v1/identity | athlete.checked_in, currency.expired |
| booking-service | Online Bookings, Packages, Availability | /api/v1/booking | booking.confirmed, booking.cancelled |
| payment-service | Transactions, Wallets, Splits, Gifts | /api/v1/payment | payment.captured, ticket.credited |
| notification-service | Delivery, Templates, Channels | /api/v1/notify | notification.sent, notification.failed |
| gear-service | Inventory, Rentals, Repack, AAD | /api/v1/gear | gear.check_failed, repack.due |
| ai-service | Insights, Optimizer, Assistant, Chat | /api/v1/ai | insight.generated, optimizer.recommendation |
| weather-service | Forecast, JI, Holds, History | /api/v1/weather | weather.hold_triggered, jI.updated |
| reporting-service | EOD, Revenue, Staff, MultiDZ rollup | /api/v1/reports | eod.finalized |
| auth-service | Users, RBAC, Sessions, MFA | /api/v1/auth | user.logged_in, role.changed |

| Component | Technology | Purpose |
| --- | --- | --- |
| WebSocket Gateway | Socket.io / Node.js | Client subscription management; room-based per-DZ channels |
| Event Bus | Redis Pub/Sub | Cross-service event fanout; <5ms internal latency |
| State Machine | XState (server-side) | Load FSM: enforces valid state transitions; emits events on change |
| Presence Manager | Redis TTL keys | Tracks which manifest staff are online; idle detection |
| Optimistic Updates | React Query + WS patch | Client applies state locally; server confirms within 1s |

| Entity | Key Fields | Relationships |
| --- | --- | --- |
| Dropzone | id, name, icao, timezone, plan, settings | has_many: Loads, Staff, Aircraft, Athletes |
| Aircraft | id, tail, type, max_seats, max_tow_lbs, status | belongs_to: Dropzone; has_many: Loads |
| Load | id, dz_id, aircraft_id, status, altitude, slot_count | has_many: Slots, Waitlist, ExitGroups |
| Slot | id, load_id, jumper_id, jump_type, exit_order, status | belongs_to: Load, Athlete |
| Athlete | id, email, uspa_number, license_class, jump_count | has_many: Slots, LogEntries, Gear |
| LogEntry | id, athlete_id, load_id, altitude, exit_type, notes | belongs_to: Athlete, Load |
| Transaction | id, dz_id, athlete_id, amount, type, split_dz, split_inst | belongs_to: Dropzone, Athlete |
| GearItem | id, owner_id, type, serial, repack_date, aad_expiry | belongs_to: Athlete; has_many: GearChecks |
| AFFStudent | id, athlete_id, instructor_id, current_level, start_date | has_many: AFFLevelRecords |
| Notification | id, recipient_id, channel, template_id, status, sent_at | belongs_to: Athlete or Staff |
| Booking | id, dz_id, customer_email, jump_type, package_id, status | has_many: Transactions |
| WaitlistEntry | id, load_id, athlete_id, position, notified_at, status | belongs_to: Load, Athlete |

| Integration | Provider / Protocol | Purpose | Criticality |
| --- | --- | --- | --- |
| Payments | Stripe Connect | Card processing, payouts, Connect for instructor split | Critical |
| SMS | Twilio | Load call times, waitlist alerts, booking confirmations | High |
| Push Notifications | Firebase FCM / APNs | Mobile app real-time alerts | High |
| Weather | aviationweather.gov + OpenMeteo | JI, forecast, wind, cloud ceiling | High |
| USPA Federation | USPA API (planned) | License verification, membership status sync | Medium |
| AI / LLM | Anthropic Claude API | Load insights, optimizer, assistant, risk alerts | High |
| Email | Postmark / SendGrid | Booking confirmation, EOD reports, receipts | Medium |
| Identity / SSO | Auth0 / custom JWT | Athlete single sign-on; cross-DZ auth | High |
| Analytics | PostHog / Mixpanel | Operator funnel analysis; feature adoption | Low |
| Mapping | Mapbox GL JS | DZ locator; multi-DZ global view | Low |

| Zone | Widgets | Actions |
| --- | --- | --- |
| KPI Strip (top) | Today Revenue · Loads · Jumps · Aircraft Utilization · Avg Load Fill% | — |
| AI Insight Banner | Single highest-priority AI recommendation with action button | Apply / Dismiss / Ask AI |
| Live Loads Strip | All active loads as horizontal cards: status badge, weight bar, exit order | Open Load · Add Jumper · Call Time |
| Weather Card | Current JI, wind, ceiling, forecast 6h, hold status | Trigger Hold · Notify Athletes |
| Revenue Breakdown | Bar chart: Tandems vs Fun Jumps vs AFF vs Rental today vs last week | View Full Report |
| Staff Utilization | Instructor workload gauge; pilot hours; rigger queue count | Assign Staff |
| Queue / Pending Check-In | Athletes checked in but not manifested; compliance flags | Manifest · Flag · Release |
| Notification Feed | Last 10 notifications with delivery status | Send New · View All |
| Quick Actions | Create Load · Process Booking · Issue Gift Card · Trigger EOD | One-click launch |

| Zone | Widgets | Actions |
| --- | --- | --- |
| Load Cards Grid | All loads tiled: status color, slot count, weight%, call time, aircraft | Edit · Lock · Call Time · Cancel |
| Exit Order Panel | Per-load ranked group display (9 groups, color-coded, with separation times) | Send to Pilot App |
| Waitlist Sidebar | Per-load waitlist queue; open slot count; auto-fill status | Notify Waitlist · Fill Slot |
| Check-In Queue | Incoming athletes: 8-point compliance grid per person; BMI flag | Approve · Override · Reject |
| State Machine Bar | Visual FSM: current state highlighted; next action button | Advance State |
| CG Calculator | Real-time weight & balance for active load; margin indicator | Recalculate |
| Quick Search | Find athlete by name/USPA#; add to load or waitlist | Add to Load · Add to Waitlist |

| Zone | Widgets | Actions |
| --- | --- | --- |
| Hero Identity Card | Name, jump count, license class, photo, wallet balance | Edit Profile |
| Self-Manifest Panel | Available loads with open slots; altitude, aircraft, cost | Join Load · Join Waitlist |
| Currency Status | License currency: days remaining with color alert; reserve/AAD status | View Details |
| Jump Logbook (recent) | Last 5 jumps: date, DZ, altitude, type, coach sign-off | View Full Logbook · Add Entry |
| Gear Summary | Primary container, reserve repack date, AAD expiry; status badges | View Gear · Request Check |
| Wallet Card | Jump ticket count, balance, recent transactions | Buy Tickets · View History |
| Upcoming Bookings | Confirmed bookings with DZ, date, type, status | View · Cancel |
| Weather (local DZ) | JI, wind, ceiling — for jumper awareness | — |

| Role | Key Widgets | Key Actions |
| --- | --- | --- |
| Instructor | Today's loads · My students · AFF level tracker · Earnings split | Sign Logbook · Evaluate AFF · View Earnings |
| Pilot | Pre-flight CG sheet · Today's loads with pax count & gross weight · Flight log | Confirm Boarding · Mark Airborne · Log Flight |
| Rigger/S&TA | Gear check queue · Repack schedule (30-day alerts) · Compliance log · Override requests | Approve Gear · Perform Repack · Flag Issue |

| Zone | Widgets | Actions |
| --- | --- | --- |
| Network KPIs | Total DZs · Active today · Global jumps today · MRR · ARR | — |
| DZ Health Map | World map: each DZ dot colored by activity level | Drill into DZ |
| Revenue by DZ | Stacked bar: revenue contribution per DZ over time | Export |
| Plan Distribution | Enterprise / Pro / Standard / Trial breakdown with upgrade opportunities | Contact DZ · Upgrade Plan |
| AI Cluster Insights | Cross-DZ anomaly detection: unusual load cancellations, revenue drops | Investigate |
| System Health | API latency, WebSocket uptime, error rate, queue depth | View Logs |

| Token | Hex | Usage | Contrast |
| --- | --- | --- | --- |
| --nav | #0B1E38 | Sidebar, nav, headings | White text only |
| --pri | #1A4F8A | Primary actions, section headers | White text |
| --acc | #0EA5E9 | Accent, links, active states, badges | Dark text or white |
| --teal | #0D9A8A | Success states, AFF progress, approved | White text |
| --bg | #F0F4F8 | Page background | Dark text |
| --surface | #FFFFFF | Cards, panels, tables | Dark text |
| --mid | #64748B | Secondary text, labels, placeholders | On light bg only |
| --danger | #EF4444 | Errors, cancellations, BMI flags | White text |
| --warn | #F59E0B | Warnings, 10MIN state, currency expiry | Dark text |
| --border | #E2E8F0 | Card borders, dividers | N/A |

| Level | Size | Weight | Usage |
| --- | --- | --- | --- |
| Display | 32px | 800 | Cover titles, hero stats |
| H1 | 22px | 700 | Section headings, page titles |
| H2 | 16px | 600 | Card headers, sub-sections |
| H3 | 13px | 600 | Table headers, labels |
| Body Large | 14px | 400 | Primary content text |
| Body | 12px | 400 | Default content, table rows |
| Caption | 11px | 400 | Metadata, timestamps, helper text |
| Label | 10px | 500 | Status badges, pill labels |

| Token | Value | Usage |
| --- | --- | --- |
| --space-1 | 4px | Icon padding, tight internal gaps |
| --space-2 | 8px | Component internal padding minimum |
| --space-3 | 12px | Form field padding, list item gaps |
| --space-4 | 16px | Standard component padding |
| --space-6 | 24px | Card padding, section gaps |
| --space-8 | 32px | Page section separation |
| --space-12 | 48px | Major section breaks |

| Component | Variants | Behavior |
| --- | --- | --- |
| StatusBadge | OPEN / LOCKED / AIRBORNE / COMPLETE / CANCELLED / etc. | Color-coded pill; auto-maps status → color |
| KPICard | Standard + Trend indicator (↑↓ with %) + Colored accent bar | Hover: subtle shadow lift |
| WeightBar | Compact + Full; color shifts: green→yellow→red at 80%/100% | Real-time update on slot add/remove |
| LoadCard | Active + Compact + Pilot view | Click → expand; long-press → quick actions |
| Btn | Primary / Secondary / Ghost / Danger / Success + Small / Full | Loading state built-in; disabled = reduced opacity |
| AlertBox | Info / Warning / Error / Success | Dismissible; icon + color coded |
| TabBar | Horizontal scroll on mobile | Active indicator slides; keyboard navigable |
| Table | Sortable headers + Empty state + Row hover | Virtual scroll for 500+ rows |
| Avatar | Initials + Photo fallback + Size variants | Online indicator dot optional |
| Toggle | On/Off + Label | Accessible; keyboard space-toggles |

| AI Function | Trigger | Input Data | Output | Human Action Required? |
| --- | --- | --- | --- | --- |
| Load Optimizer | Operator opens optimizer panel | Queue, loads, aircraft capacity, jump types | Ranked slot assignments for each load | Yes — operator approves |
| Risk Alert Engine | Continuous background job (30s loop) | Load weights, compliance grid, weather JI | Alert cards: severity High/Medium/Low | Yes — operator dismisses or acts |
| Predictive Scheduling | Daily 6AM run | Historical jumps, bookings, weather forecast | Recommended load count and opening time | Yes — confirm pre-create |
| Revenue Insight | EOD + weekly cron | Jump mix, pricing, competitor benchmarks | Actionable revenue recommendation | Yes — operator accepts or ignores |
| Waitlist Intelligence | No-show detected (5min pre-board) | Waitlist, athlete profile, jump type | Ranked waitlist athletes to notify first | Automatic — sends notification |
| AI Assistant Chat | User opens chat panel | Current loads, bookings, staff, weather | Natural language answers to operational queries | No — informational only |
| Currency Risk Scanner | Check-in initiated | Athlete license, logbook, gear records | Pass / Conditional / Block recommendation | S&TA override with reason |
| Staffing Recommender | New load created | Staff availability, certs, workload | Suggested instructor + pilot assignment | Yes — manifest staff assigns |

| Layer | Technology | Detail |
| --- | --- | --- |
| LLM Backend | Anthropic Claude claude-sonnet-4-6 | Structured JSON output mode; 60s timeout; retry with backoff |
| Prompt Engine | Node.js template service | Injects live data; validates output schema before returning to client |
| Cache Layer | Redis (TTL: 60s insights, 300s predictions) | Prevents repeated identical prompts; invalidates on state change |
| Fallback | Rule-based heuristic engine | If Claude API unavailable; returns simplified rule-based alerts |
| Cost Control | Token budget per DZ plan | Standard: 100k tokens/day; Pro: 500k; Enterprise: unlimited |
| Audit Log | All AI recommendations logged | Operator action (applied/dismissed) recorded for model improvement |

| Step | Actor | System Action | Channel |
| --- | --- | --- | --- |
| 1. Arrive & Check In | Athlete | Manifest staff opens check-in; athlete identified by name/USPA# | UI (desktop) |
| 2. 8-Point Compliance Grid | System + Staff | Auto-checks: License ✓, Currency ✓, BMI ✓, Gear ✓, Waiver ✓, Balance ✓, Repack ✓, Medical ✓ | UI + DB lookup |
| 3. Compliance Pass | System | Athlete status → CHECKED_IN; added to available queue | DB write + WS emit |
| 4. Manifested to Load | Manifest Staff | Drag athlete card to load slot; exit order auto-assigned | UI + WebSocket |
| 5. 30MIN / 20MIN Call | System | Load state advances; push + SMS notification sent | Notification service |
| 6. Boarding | Pilot | Pilot confirms boarding in Pilot App; CG sheet validated | Pilot dashboard |
| 7. Airborne | Pilot | Load marked AIRBORNE; timer starts | Real-time WS update |
| 8. Landed | Manifest Staff | Load marked LANDED; slot settlement triggered | UI action |
| 9. Log Entry Auto-Created | System | LogEntry written: load_id, altitude, exit_type, date; pending coach sign-off | DB write |
| 10. Coach Signs Logbook | Instructor | Instructor reviews and signs logbook entry in app | Instructor dashboard |
| 11. Jump Count Updated | System | Athlete.jump_count incremented; currency reset if applicable | DB update |

| Step | Actor | System Action |
| --- | --- | --- |
| 1. Online Booking | Customer | Books via public booking page; selects date, package, time; pays deposit via Stripe |
| 2. Booking Confirmed | System | Booking created; confirmation email sent; slot pre-reserved on target load |
| 3. Check-In Day-Of | Staff | Booking pulled up; customer signs digital waiver; BMI/weight recorded |
| 4. TI Assignment | Manifest | Tandem instructor assigned; AFF L1 check if student component |
| 5. Manifested | System | Tandem pair (TI + customer) added to load with exit order priority |
| 6. Jump Completed | System | Load settled; transaction CAPTURED → SETTLED; commission split applied (DZ 70% / TI 30%) |
| 7. Video / Photo Add-On | Videographer | Video linked to booking; customer notified for download |
| 8. Review Prompt | System | Email sent 2h after jump: 'How was your experience?' + review link |

| Step | Action |
| --- | --- |
| 1. Load Creation | Manifest staff creates load; selects aircraft, altitude, slot count |
| 2. Instructor Assignment | System suggests instructors based on certification and availability; staff confirms |
| 3. Jump Completion | Load marked COMPLETE; all slots settled |
| 4. Commission Calculation | Payment service applies split rules: DZ% + Instructor%; calculated per jump type |
| 5. Instructor Ledger | Running balance updated on instructor profile; visible in My Earnings tab |
| 6. Payout Trigger | Weekly (or on-demand) payout via Stripe Connect transfer to instructor bank account |
| 7. Payout Confirmation | Email + push notification: payout amount + breakdown sent to instructor |
| 8. EOD Reconciliation | All commissions included in EOD report; net DZ revenue = gross − instructor payouts − refunds |

| Plan | DZs | Loads/Day | AI Tokens/Day | Staff Seats | Price (est.) |
| --- | --- | --- | --- | --- | --- |
| Trial | 1 | 10 | 50k | 5 | Free / 30 days |
| Standard | 1 | Unlimited | 100k | 25 | $149/mo |
| Pro | 1 | Unlimited | 500k | Unlimited | $399/mo |
| Enterprise | Multi | Unlimited | Unlimited | Unlimited | Custom |

| Layer | Strategy | Target Metric |
| --- | --- | --- |
| Frontend | Next.js on Vercel Edge Network; CDN-cached static assets | < 100ms TTFB globally |
| API Gateway | AWS API Gateway + Lambda (serverless) or ECS for sustained load | < 200ms P95 latency |
| Database | PostgreSQL on RDS with read replicas per region; connection pooling via PgBouncer | < 50ms query P95 |
| Real-Time | Socket.io cluster mode; Redis Pub/Sub for cross-instance fan-out | < 200ms WS event delivery |
| AI Service | Anthropic Claude API; response cached in Redis; async job queue for batch insights | < 3s insight generation |
| Multi-Region | Active-active: US-East, EU-West, AP-Southeast; data residency per DZ region | < 300ms for any DZ globally |
| Disaster Recovery | RDS Multi-AZ; daily cross-region snapshot; RTO < 1h, RPO < 15min | 99.9% uptime SLA |

| Phase | Feature | Timeline |
| --- | --- | --- |
| v3 (current) | DMS + Athlete Identity + AI + Multi-DZ SaaS | Live |
| v4 (Q3 2026) | Marketplace: athletes book at any SkyLara DZ; coach/TI profiles searchable | 6 months |
| v5 (Q1 2027) | Gear Marketplace: buy/sell/rent used gear between verified jumpers | 12 months |
| v6 (Q3 2027) | Training Marketplace: online AFF theory, tunnel coaching, video analysis | 18 months |
| v7 (2028) | Federation Integration: USPA, APF, BPA digital license verification | 24 months |
| v8 (2028+) | Insurance API: embedded jump insurance at point of booking | 28 months |

| # | Weakness | Severity | Impact | Remedy |
| --- | --- | --- | --- | --- |
| 1 | No mobile-native app: athletes and instructors use mobile web, which creates friction for push notifications, offline logbook, and camera access for video | High | Athlete adoption | Build React Native wrapper (Expo) targeting athletes first; share 80% of existing React logic |
| 2 | USPA API integration is planned but not yet built: license verification is manual data entry, creating compliance risk and staff burden | High | Safety + Ops | Partner with USPA to access member API; build verified badge system; fallback to photo upload + manual review |
| 3 | AI insights are request-driven, not event-driven: risk alerts don't surface until operator opens the AI panel, missing time-critical situations | High | Safety | Background AI monitor: run risk check on every load state change; push alert to operator immediately if high-severity risk detected |
| 4 | No offline support: manifest staff without internet during ops (common at remote DZs) lose all functionality | Medium | Reliability | Progressive Web App with service worker; local cache of current day's loads; sync on reconnect |
| 5 | CreateLoad screen is a stub: the most-used screen by manifest staff is underbuilt vs the feature richness of the rest of the platform | Medium | UX | Full wizard: aircraft selector → slot builder → CG validator → instructor auto-suggest → confirmation |
| 6 | No video/media management: tandem video is a major revenue stream but is unaddressed in the platform | Medium | Revenue | Phase 2: video order intake + fulfillment tracking; link video delivery to booking; commission tracking for videographers |
| 7 | Payment provider is single-threaded (Stripe only): international DZs need local payment methods (SEPA, Bacs, PayNow) | Medium | Global growth | Stripe supports most international methods via Payment Element — configure per-DZ; add PayPal as fallback |
| 8 | No native kiosk / self-check-in mode: staff-assisted check-in creates a bottleneck on busy days | Low | Ops efficiency | Add kiosk mode: athlete scans QR code or taps USPA card; self-completes 8-point compliance with biometric weight scale integration |
| 9 | Athlete onboarding flow is absent: new jumpers face a blank profile with no guided setup | Low | Activation | Progressive profile completion wizard; push notification cadence to complete gear, currency, logbook import |
| 10 | No competitor pricing intelligence: pricing packages are set manually with no market awareness | Low | Revenue | Opt-in benchmark data from cross-DZ analytics; show operator where their pricing sits vs regional average |

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| WebSocket overload during peak (airshow days with 50+ simultaneous loads) | Medium | High | Room-based subscriptions: clients only subscribe to their DZ's channel; horizontal scaling of Socket.io cluster |
| Claude API rate limiting during high-demand periods | Medium | Medium | Redis cache for identical prompts; graceful degradation to rule-based alerts; DZ-level token budget enforcement |
| Data breach: athlete PII (licenses, health data) at risk | Low | Critical | Field-level encryption for PII; SOC 2 Type II audit; separate PII store; data minimization by default |
| Stripe Connect compliance failure for international instructor payouts | Low | High | Stripe Connect KYC requirements vary by country; legal review per expansion market; hold payments until KYC complete |
| Multi-tenancy boundary breach: DZ A sees DZ B data | Very Low | Critical | Row-level security enforced at Postgres level (not just application layer); penetration test before launch |