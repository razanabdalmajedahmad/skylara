# SkyLara Production Systems v1.0

_Source: SkyLara_ProductionSystems_v1.docx_

SkyLara Production Systems v1.0
# SkyLara Production Systems Architecture v1.0
## Table of Contents
Authentication & Security (Pages 15)
Role-Based Onboarding (Pages 12)
Notifications (Pages 10)
Payments & Marketplace Splits (Pages 15)
SkyLara Assistant (Pages 8)
Report Builder (Pages 12)
Delivery Requirements (Pages 10)
# Chapter 1: Authentication & Security
Comprehensive authentication, security, and session management strategy for SkyLara platform.
## 1.1 WebAuthn Passkey-First Auth
Passwordless, phishing-resistant authentication using FIDO2/WebAuthn standard.
### Registration Ceremony Flow
Client calls navigator.credentials.create({ publicKey: { challenge, rp, user, pubKeyCredParams: [{ type: "public-key", alg: -7 }], attestation: "direct", timeout: 60000 } })
Returns credential with { id, rawId, response: { clientDataJSON, attestationObject }, type: "public-key" }
Client sends POST /auth/passkey/register-options with userId, username, displayName
Server generates challenge, nonce, stores in cache (Redis, 5min TTL)
Client posts POST /auth/passkey/register-verify with credential, response, clientData
Server verifies attestation, extracts publicKey, stores Passkey record
Passkey model: { id: UUID, credentialId: bytes, userId: Int, publicKey: bytes, counter: Int, transports: [string], aaguid: UUID, createdAt, lastUsedAt }
### Authentication Ceremony Flow
Client calls POST /auth/passkey/login-options with email or userId
Server returns allowCredentials: [{ id, type: "public-key", transports }]
Client calls navigator.credentials.get({ publicKey: { challenge, allowCredentials, userVerification: "preferred", timeout: 60000 } })
Client posts POST /auth/passkey/login-verify with assertion, clientData
Server verifies signature against stored publicKey, increments counter (detects cloning)
Server issues JWT token pair (access + refresh), updates lastUsedAt
Signature: HMAC(clientDataJSON) verified with stored publicKey using SubtleCrypto
### Integration Points
Client: @simplewebauthn/browser v10.x (navigator polyfill)
Server: @simplewebauthn/server v10.x (verification logic)
Database: MySQL Passkey table with UNIQUE (credentialId), INDEX userId
Rate limiting: 5 verify attempts per 15min per email before lockout
## 1.2 Google OpenID Connect
OAuth2 authorization code flow with PKCE for secure account linking.
### Flow Steps
GET /auth/google/url returns authorization_endpoint + state + codeChallenge (PKCE)
Client redirects to: https://accounts.google.com/o/oauth2/v2/auth?client_id=X&redirect_uri=X&scope=openid email profile&code_challenge=X&code_challenge_method=S256
User authenticates, Google redirects to GET /auth/google/callback?code=X&state=Y&error=(opt)
Server verifies state (Redis), exchanges code + codeVerifier for id_token (off-band HTTPS)
Server verifies id_token JWT signature with Google JWKS endpoint (cached 1h)
Extract email, name, picture from claims
Look up User by email: if exists → create OAuthAccount record + link, if new → create User + OAuthAccount
Issue JWT token pair, set secure httpOnly cookie with refresh token
### OAuthAccount Model
{ id: UUID, userId: Int, provider: "google" | "microsoft" | "apple", providerAccountId: string, accessToken: encrypted, refreshToken: encrypted, expiresAt: datetime, createdAt }
Store accessToken for user profile updates / Drive access (optional)
Refresh flow: if expired, call token endpoint with refreshToken (refresh_token grant)
### Environment Variables
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
## 1.3 Email/Password (Enhanced)
Existing scryptSync integration with rate limiting and account lockout.
Hash: scryptSync(password, salt, 64, {N: 16384, r: 8, p: 1}), stored as base64 in User.passwordHash
Verify: scryptSync(inputPassword, extractedSalt, 64, ...) === storedHash
Salt derived from first 16 bytes of hash
Rate limit: 5 login attempts per 15min per email (Redis counter key: auth:email:{email}:attempts)
Lock after 10 failed attempts: set User.lockedUntil = now + 30min, reject all logins with 423 LOCKED
Unlock: user clicks email link or waits 30min, or admin unlocks via /admin/users/:id/unlock
Password reset: POST /auth/password-reset with email, sends link valid 1h, PasswordResetToken model
## 1.4 MFA / 2FA with Step-Up Auth
Time-based OTP (TOTP) for 2FA and enhanced authentication for sensitive actions.
### Setup Flow
POST /auth/mfa/setup initiates, returns { secret, qrCode, backupCodes: [10 strings] }
Secret generated with otplib.generateSecret({ name: "SkyLara", issuer: "SkyLara", length: 32 })
QR code: otpAuthUrl from secret
Client scans with Google Authenticator, returns OTP token
POST /auth/mfa/verify with token verifies using otplib.authenticator.check(token, secret) with ±1 window
Stores MfaDevice: { id: UUID, userId: Int, type: "totp", secret: encrypted, verified: bool, backupCodes: [hashed], createdAt }
Backup codes: 10 one-time codes, hashed with scrypt, displayed once at setup
### Verification During Login
After password/passkey success, if User.mfaEnabled = true, return 202 ACCEPTED (partial auth)
Client must POST /auth/mfa/verify with TOTP token or backup code
Verify: check token window ±30sec, OR check backup code (mark as used)
Issue full JWT pair only after successful MFA verification
### Step-Up Authentication
Sensitive actions: /payments/*, /users/:id/role, /account/delete, /webhooks/*, /stripe-connect/*
Check JWT iat claim: if (now - issuedAt) > 300sec (5 min), require step-up
POST /auth/mfa/step-up with TOTP or password, returns new token with iat = now
Middleware @RequireStepUp: verifies last auth within 5min, returns 401 if expired
### MFA Device Model
{ id: UUID, userId: Int, type: "totp" | "sms", secret: encrypted string, verified: bool, backupCodes: [hashed], createdAt, updatedAt }
Allow multiple devices per user (e.g., phone + tablet)
DELETE /auth/mfa/:id removes device
## 1.5 Device/Session Management
Track and manage multiple active sessions per user with security controls.
Extend RefreshToken model: { id: UUID, userId: Int, token: string, deviceName: string, deviceType: "web" | "mobile" | "tablet", ipAddress: inet, userAgent: string, lastActiveAt: datetime, expiresAt: datetime, revokedAt: datetime }
On login, client sends X-Device-Name header, derive deviceType from User-Agent
Capture IP from X-Forwarded-For (reverse proxy), geolocation via ip-geo service
Session limit: max 5 concurrent active devices per user
If exceeding limit, terminate least recently used session (lastActiveAt DESC)
GET /auth/sessions lists all active sessions with { id, deviceName, deviceType, ipAddress, lastActiveAt, createdAt }
DELETE /auth/sessions/:id revokes single session (invalidates refresh token)
DELETE /auth/sessions (POST without id) revokes all sessions except current
Suspicious login detection: if (newDeviceId) AND (newLocation > 100km from lastIp) → send email alert + require step-up
## 1.6 Rate Limiting & Abuse Protection
Token bucket algorithm with CAPTCHA escalation.
Redis implementation: ip-based keys with refill logic
General endpoints: 100 req/min per IP (bucket size 100, refill 1/sec)
Auth endpoints: 5 req/min per email (stricter for login, password-reset)
Passkey register/verify: 5 attempts per 15min per email
After 3 failed logins (same email): return 429 + prompt CAPTCHA verification
CAPTCHA: Google reCAPTCHA v3 (silent), POST /auth/captcha-verify with token
Reset counters on successful auth or 15min expiry
Blocked IPs: if > 1000 req/min, add to temporary blocklist (Redis set, 1h TTL)
Log all abuse events to AuditLog with ABUSE severity
## 1.7 Authentication Environment Variables
## 1.8 Audit Log Events
# Chapter 2: Role-Based Onboarding
Multi-step wizard architecture for 4 distinct user roles with progress persistence.
## 2.1 Onboarding Architecture
OnboardingSession model: { id: UUID, userId: Int, role: "TANDEM" | "LICENSED" | "COACH" | "DZ_MANAGER", currentStep: Int (1-based), totalSteps: Int, data: JSON (persists form values), completedAt: datetime, abandonedAt: datetime, createdAt }
POST /onboarding/start with { role, initialData } creates session, returns { sessionId, currentStep, totalSteps, stepConfig }
PATCH /onboarding/step with { sessionId, step, formData } validates & persists, returns { success, nextStep, errors }
GET /onboarding/status returns current progress, allows resume mid-flow
POST /onboarding/complete finalizes, triggers role assignment, updates User.onboardingCompletedAt
Auto-save on field blur (debounced 500ms), no explicit save button
Recovery: user can access /onboarding?sessionId=X to resume abandoned session
## 2.2 Tandem/Student Flow (7 steps)
## 2.3 Licensed Fun Jumper Flow (5 steps)
## 2.4 Coach Flow (6 steps)
Step 1: License + Ratings — instructorRating (AFFI), aff: bool, tandem: bool, camera: bool, certifications: [file]
Step 2: Experience — yearsInstructor, totalJumps, specialties (multi-select: AFF, IPC, CRW, etc.), bio (500 chars)
Step 3: Availability — weekly schedule (hours 06:00-18:00 by day), timezone
Step 4: Pricing — hourlyRate (USD), packagePrice (5-jump, 10-jump), cancellationPolicy (%)
Step 5: Bio + Photo — profileBio (1000 chars), profilePhoto (S3 URL, square 500x500px)
Step 6: Payment Setup — POST to /stripe-connect/onboarding-link returns Stripe Connect OAuth URL, user completes Express account setup
Webhook: stripe_account.updated event updates StripeAccount.chargesEnabled, payoutsEnabled
## 2.5 DZ Manager Flow (5 steps)
Step 1: DZ Details — dzName, location (address autocomplete), icaoCode, timezone (from location), operatingCurrency (USD/EUR/AED)
Step 2: Aircraft Fleet — {registration, aircraftType, capacity, maxWeightKg} per aircraft, validate ICAO registrations
Step 3: Operational Settings — windLimitKts, loadIntervalMinutes (15-30), pricingTiers: [{slots, pricePerSlot}]
Step 4: Staff Invitations — [{ email, role: "MANIFEST" | "SAFETY" | "ADMIN" }], send invitation emails
Step 5: Stripe Platform Setup — POST to /stripe-connect/onboarding-link (Standard account for DZ)
## 2.6 UX Rules
Mobile-first: single-column layout, touch targets >= 44px
Desktop: 2-column grid on screens >= 1024px
Auto-save debounced 500ms per field change, no explicit save button
Progress bar: (currentStep / totalSteps) * 100%
Back button: GO_BACK action preserves all form data in session.data JSON
Inline validation: show error immediately after blur, highlight invalid field red
Smart defaults: country from browser locale, phone format from location
Keyboard navigation: Tab order follows DOM, Enter submits form, Escape goes back (confirm first)
Aria labels: all inputs have aria-label, error messages aria-live="polite"
State persistence: if user closes tab, localStorage caches sessionId, allows resume within 24h
## 2.7 Acceptance Criteria
# Chapter 3: Notifications
Event-driven, multi-channel notification delivery with templates and user preferences.
## 3.1 Event-Driven Architecture
EventBus: pub/sub pattern using Node EventEmitter (in-memory) or external Redis for distribution
Events are strongly typed with schema validation (JSON Schema or Zod)
40+ event catalog including: USER_REGISTERED, LOAD_CREATED, LOAD_CANCELLED, BOOKING_CONFIRMED, BOOKING_CANCELLED, PAYMENT_RECEIVED, PAYMENT_FAILED, COACHING_SESSION_SCHEDULED, COACHING_SESSION_COMPLETED, INCIDENT_REPORTED, WEATHER_ALERT, etc.
Event publisher: triggerEvent(eventType, payload) queues event to EventBus
Event subscribers: @EventListener(USER_REGISTERED) decorators or subscribe(eventType, handler) callbacks
Async delivery: all event handlers fire non-blocking via Promise.all() or BullMQ queue
## 3.2 Event Catalog (Partial)
## 3.3 Channel Implementations
### In-App (Push + DB)
Notification model: { id: UUID, userId: Int, eventType: string, title: string, body: string, actionUrl: string, read: bool, readAt: datetime, createdAt, expiresAt: datetime (30d) }
WebSocket: emit notification:new event to user socket, client shows toast + bell icon badge
Persistence: store in DB, show unread count badge, archive after 30d
GET /notifications (paginated, 20 per page, newest first)
PATCH /notifications/:id/read marks as read, bulk read via PATCH /notifications/read with { ids: [UUIDs] }
### Email (SendGrid primary, SES fallback)
Adapter pattern: EmailService with send(to, templateId, data) that tries SendGrid, falls back to SES
SendGrid dynamic templates: pre-defined, referenced by template_id, substitution tags {{firstName}}, {{dzName}}
SES fallback: compose email from NotificationTemplate + send via sesClient.sendEmail()
HTML templates: responsive design, Tailwind classes inlined, tested against email clients (Litmus)
Unsubscribe link: /notifications/unsubscribe?token=JWT includes userId, eventType, encoded in link
Rate limit: 3 emails per recipient per hour (batching if more triggered)
Delivery tracking: via SendGrid webhooks (delivered, bounce, complaint), update Notification.status
### WhatsApp (Twilio Business)
Twilio Business API only: template-only messages (no dynamic content send)
Pre-defined templates: LOAD_CANCELLED, BOOKING_CONFIRMED, COACHING_REMINDER, PAYMENT_RECEIVED, INCIDENT_ALERT
Message body: template name + parameters array (1-3 substitution points max)
Send via twilio.messages.create({ from: "+1234567890", to: user.phone, contentSid: "templateSid", contentVariables: JSON })
Opt-in: User must verify phone + grant WhatsApp permission (web link to WhatsApp opt-in flow)
No retry on failure (transactional, best-effort)
### SMS (Twilio Programmable SMS)
Transactional only: payment confirmations, cancellations, emergency alerts
Max 160 characters (GSM-7), trim/truncate if needed
Send via twilio.messages.create({ from: TWILIO_PHONE_NUMBER, to: user.phone, body: text })
Rate limit: 1 per recipient per minute, queue if burst
Opt-in: User must confirm phone number via /users/verify-phone endpoint (send OTP via SMS)
## 3.4 User Notification Preferences
UserNotificationPreference model: { id: UUID, userId: Int, channel: "EMAIL"|"SMS"|"INAPP"|"WHATSAPP", enabled: bool, quietHoursStart: "HH:MM", quietHoursEnd: "HH:MM", timezone: string }
Per-event overrides: { eventType, channel, enabled } (allow opt-out of specific events)
Quiet hours: timezone-aware, no notifications outside start-end times (except CRITICAL/EMERGENCY)
Notification fatigue budget: max 10/day per user (tracked via counter in Redis), EMERGENCY events bypass budget
GET /notifications/preferences returns all user preferences
PATCH /notifications/preferences updates one or many preferences
## 3.5 Webhook Integration
Webhook model: { id: UUID, dropzoneId: Int, url: string, events: [string] (event filter), secret: string (HMAC key), isActive: bool, lastTriggeredAt: datetime, failCount: Int, createdAt }
Event filter: DZ can subscribe to subset of events (LOAD_CREATED, BOOKING_CONFIRMED, PAYMENT_RECEIVED, INCIDENT_REPORTED, WEATHER_ALERT)
Signature: HMAC-SHA256(JSON.stringify(payload), secret) sent as X-Signature header
Retry: exponential backoff (1m, 5m, 30m), disable after 10 consecutive failures
Verification: DZ receives event, verifies signature, responds 200 OK within 5sec
GET /webhooks lists DZ webhooks, POST /webhooks creates, PATCH /webhooks/:id updates, DELETE /webhooks/:id deactivates
Test endpoint: POST /webhooks/:id/test sends sample event, returns response + latency
# Chapter 4: Payments & Marketplace Splits
Stripe Connect-powered marketplace with multi-recipient splits and comprehensive payout management.
## 4.1 Stripe Connect Architecture
Platform account: SkyLara (Stripe account with Restricted API keys)
Connected accounts: Express accounts (coaches), Standard accounts (DZ operators)
Express onboarding: OAuth flow via /stripe-connect/auth-url, redirects to Stripe Connect dashboard, returns auth_code
Standard onboarding: user-initiated setup URL from /stripe-connect/onboarding-link, stores stripeAccountId in DB
StripeAccount model: { id: UUID, userId: Int, dropzoneId: Int, stripeAccountId: string (acct_*), accountType: "EXPRESS"|"STANDARD", chargesEnabled: bool, payoutsEnabled: bool, onboardingComplete: bool, createdAt, updatedAt }
## 4.2 Split Payment Model
Three-way and two-way splits depending on booking type:
Tandem Booking (3-way split): 85% DZ, 10% Coach, 5% SkyLara
Fun Jump (2-way split): 95% DZ, 5% SkyLara
Coaching Session (3-way split): 80% Coach, 15% DZ (facility fee), 5% SkyLara
Custom splits: per-DZ configuration via POST /admin/dz/:id/payment-split, override defaults
PaymentIntent model: { id: UUID, userId: Int, dropzoneId: Int, amount: Int (cents), currency: string, stripePaymentIntentId: string, status: "PENDING"|"SUCCEEDED"|"FAILED", splits: JSON (array of split objects), metadata: JSON, createdAt }
PaymentSplit model: { id: UUID, paymentIntentId: UUID, recipientType: "DZ"|"COACH"|"PLATFORM", recipientId: (Int or null for platform), amount: Int (cents), stripeTransferId: string (optional), status: "PENDING"|"SUCCEEDED"|"FAILED" }
### Split Calculation Example
Tandem booking for $350 USD (DZ: $297.50, Coach: $35, Platform: $17.50):
POST /payments/create-intent with { bookingId, amount: 35000 (cents) }
Server calculates: dzAmount = 35000 * 0.85 = 29750, coachAmount = 35000 * 0.10 = 3500, platformAmount = 35000 * 0.05 = 1750
Create Stripe PaymentIntent with application_fee_amount = 1750 (SkyLara platform fee)
Transfers: dzAmount to DZ stripe account, coachAmount to coach stripe account
Store split records with corresponding stripe transfer IDs
## 4.3 Multi-Currency Support
Supported currencies: USD, EUR, GBP, AED, SAR, CAD, AUD, CHF, JPY, BRL
Per-dropzone default currency: Dropzone.preferredCurrency (set during onboarding)
Cross-currency transfers: Stripe handles FX conversion, takes spread as fee
Display: Intl.NumberFormat(locale, { style: "currency", currency: code })
Rate display: show conversion rate at checkout time (quote valid 10 min)
DB storage: all amounts in minor units (cents for USD, pence for GBP, fils for AED)
## 4.4 Payout States & Automation
State machine: PENDING → PROCESSING → IN_TRANSIT → PAID | FAILED
Automatic payouts: weekly on Fridays (configurable: daily, weekly, monthly per account)
Minimum threshold: $50 USD equiv (configurable per DZ via settings)
Payout model: { id: UUID, stripeAccountId: string, amount: Int, currency: string, stripePayout Id: string, status: string, scheduledAt: datetime, paidAt: datetime, failureReason: string, createdAt }
Cron job (every Friday @ 00:00 UTC): calculate unpaid transfers per account, create payout if balance >= threshold
Webhook: payout.paid / payout.failed updates Payout record + sends email notification
Manual payout: POST /payouts/create-manual allows DZ to request immediate payout (with $2 fee)
## 4.5 Refund Flow
Full refund (100%): within 24h before scheduled jump, no questions asked
Partial refund (50%): 24-48h before jump
No refund: same day as jump or after
Configurable per DZ: POST /admin/dz/:id/refund-policy
Refund splits: proportional to original split (if original was 85/10/5, refund is also 85/10/5)
Process: POST /payments/:id/refund with { amount, reason }, triggers Stripe refund + reverses PaymentSplit transfers
Refund status: "PENDING" → "SUCCEEDED" (check Stripe webhook stripe_charge.refund.updated)
Customer email: automatically sent with refund confirmation
## 4.6 Payment API Routes
## 4.7 Payment Environment Variables
# Chapter 5: SkyLara Assistant
AI-powered assistant using Claude API with RAG for help, onboarding guidance, and data interpretation.
## 5.1 Architecture
LLM: Claude 3.5 Sonnet via Anthropic API (claude-3-5-sonnet-20241022)
RAG sources: HelpArticle, FeatureRegistry, platform FAQ, contextual help pages
Context injection: user role, current page URL, dropzone context (if applicable)
Safety constraints: explicitly forbid payments, role changes, manifest modification, data deletion
Conversation storage: AssistantConversation model with last 20 messages (sliding window)
Rate limit: 30 messages/hour per user
## 5.2 Knowledge Base Sources
Source 1: HelpArticle (existing model) — 50+ articles with title, body, category, role filter
Source 2: FeatureRegistry (existing model) — feature documentation with use cases
Source 3: Platform FAQ — seeded static content (fees, policies, safety guidelines)
Source 4: Contextual help — per-page hints (e.g., "Onboarding step 3" context when on step 3)
Search strategy: full-text search on title + body, then keyword matching if no match
Caching: index all articles in Meilisearch (fast, typo-tolerant), update on article changes
## 5.3 Assistant Capabilities
CAN: Answer how-to questions, guide onboarding, draft support notes (for DZ staff review), explain dashboard metrics, suggest next steps
CANNOT: Execute payments, change user roles, modify manifests, delete data, access other users' data, change preferences without confirmation
Confirmation flow: if user asks sensitive action, respond "I can help draft this for your review. Would you like me to show you the details?"
Deep links: when guiding to onboarding, include link like /onboarding?sessionId=X&step=3
Step-by-step guidance: for multi-step tasks, break into numbered steps with screenshots (if applicable)
## 5.4 Conversation Model
AssistantConversation: { id: UUID, userId: Int, messages: JSON (array of {role, content, timestamp}), context: JSON {currentPage, userRole, dzId}, createdAt, updatedAt }
Max context window: last 20 messages (trim older messages, keep first system message)
System prompt: includes platform rules, user role, available actions, safety constraints
API: POST /assistant/message with { message: string, conversationId: optional }
Response: { message: string, suggestions: [string], actions: [{type, url, label}], conversationId, messageId }
Suggestions: auto-populate next likely questions based on context
## 5.5 Q&A Center UI
Searchable knowledge base: full-text search on HelpArticle + FeatureRegistry
Category filters: onboarding, payments, safety, gear, coaching, operations, admin
Role-filtered results: show only articles visible to user role
Popular queries section: show most-viewed articles per role
Direct links from help: include "Ask Assistant" button to chat about topic
## 5.6 Security & PII Rules
PII masking: never log user email, phone, SSN, passport, payment card in conversation logs
Context isolation: assistant can only see data for user's own dropzone/role
Rate limit: 30 messages/hour (tracked per userId via Redis counter)
Content filtering: reject requests containing spam, phishing, malware keywords
Log retention: conversations deleted after 90 days
Admin access: ONLY ADMIN role can view user conversations (audit logged)
# Chapter 6: Report Builder
Drag-and-drop dashboard builder with 7 block types and 7+ pre-built templates.
## 6.1 Block Architecture
Block types: KPI Card, Line Chart, Bar Chart, Pie Chart, Table, Heatmap, Funnel
ReportDashboard model: { id: UUID, userId: Int, dropzoneId: Int, name: string, description: string, layout: JSON {blocks: [{id, type, position, size, config}]}, isDefault: bool, isShared: bool, createdAt, updatedAt }
ReportBlock model: { id: UUID, dashboardId: UUID, blockType: string, title: string, dataSource: string, query: JSON {filters, groupBy, timeRange}, position: JSON {x, y}, size: JSON {width, height}, config: JSON {chartType, colorScheme} }
Drag-and-drop: React DnD library for reordering blocks, resize handles via react-resizable
Responsive grid: 12-column system, blocks snap to grid (fixed size or flexible)
## 6.2 Data Sources
## 6.3 Pre-Built Dashboards (Role-Specific)
DZ Manager Dashboard: Revenue Overview (KPI: month revenue, target %), Load Utilization (heatmap: time x date), Staff Performance (table: person, hours, earnings), Safety Compliance (bar: expiry status)
Coach Dashboard: My Earnings (KPI: month earnings, pending), Student Progress (table: student, hours, rating, next session), Schedule Efficiency (heatmap: availability vs bookings)
Manifest Dashboard: Today's Operations (KPI: planned loads, current fill %), Aircraft Status (table: tail, status, next check), Load Fill Rates (funnel: booked vs actual)
Admin Dashboard: Platform Metrics (KPI: total revenue, active DZs, users), DZ Comparison (bar: revenue by DZ, sorted), Growth Trends (line: revenue/bookings/users over 12m)
## 6.4 API Routes
## 6.5 Background Data Jobs
## 6.6 Acceptance Criteria
User can create dashboard and persist 5+ blocks without performance degradation
Chart renders within 500ms for 1-year data (10k rows), cached after first render
Export to PDF/CSV with all data points included, formatted for readability
Mobile responsive: blocks stack single-column on <640px, grid adapts
Real-time updates: if new data arrives (webhook), dashboard refreshes automatically (WebSocket or polling)
Access control: user can only view their own DZ dashboards (or those shared explicitly)
Undo/redo: last 10 layout changes tracked, CTRL+Z restores previous state
# Chapter 7: Delivery Requirements
Production folder structure, complete environment variables, integrations, and realistic user flows.
## 7.1 Production Folder Structure (Abbreviated)
apps/
├── api/
│   ├── src/
│   │   ├── modules/ (auth, onboarding, notifications, payments, assistant, reports, users, admin)
│   │   ├── middleware/ (auth, role, rateLimit, audit, errorHandler)
│   │   ├── lib/ (crypto, jwt, redis, stripe, twilio, sendgrid, anthropic)
│   │   ├── jobs/ (bullMq workers for aggregation, compliance, payouts)
│   │   ├── db/ (schema.prisma, migrations, seed.ts)
│   │   ├── config/ (env, stripe, redis, database)
│   │   ├── app.ts
│   │   └── main.ts
│   ├── .env.example
│   └── package.json
│
├── web/
│   ├── src/
│   │   ├── components/ (auth, onboarding, notifications, payments, assistant, reports, layout)
│   │   ├── pages/ (auth, onboarding, dashboard, admin)
│   │   ├── hooks/ (useAuth, useOnboarding, useNotifications, usePayments, useAssistant, useReports)
│   │   ├── lib/ (api, auth, validators, webauthn)
│   │   ├── context/ (AuthContext, NotificationContext, ThemeContext)
│   │   ├── styles/ (globals.css)
│   │   └── app.tsx
│   ├── .env.local.example
│   └── package.json
│
└── shared/
    ├── types.ts
    └── constants.ts
## 7.2 Complete Environment Variables
## 7.3 User Flows
### Flow 1: First-Time Tandem Customer
User lands on /landing, clicks "Book Now"
Redirected to /auth/register, creates account with email/password or passkey
Confirmation email sent, user verifies email link
POST /onboarding/start with role="TANDEM"
Steps 1-7: basic info → emergency contact → medical → waiver (signature captured) → safety video (85% watch + quiz) → load selection → payment
POST /payments/confirm with Stripe PaymentIntentId, splits: 85% DZ, 10% coach, 5% platform
Booking confirmed, email sent
Day-of check-in: manifest staff scans QR, marks present
Post-jump: review request email + in-app notification
User submits 5-star review
### Flow 2: Licensed Jumper (Returning)
User logs in (passkey or password)
Dashboard shows available loads, quick-book interface
Selects load, checks aircraft + weather, confirms booking
Payment via saved card, instant confirmation
Manifest: QR check-in via phone camera
Board aircraft, jump occurs
Post-jump: logbook entry auto-created
Email reminder: "Top up your wallet?" if balance < $100
### Flow 3: Coach Session
Coach logs in, sees /dashboard/coaching with scheduled students
Student arrives, coach clicks "Start Session", session marked ACTIVE
Post-jump: coach submits notes + rating
Student receives email with feedback + review request
Month-end: coach GET /payouts sees pending balance (80% of session fees - 5% platform)
Weekly payout scheduled Friday: balance transfers to coach Stripe account
### Flow 4: DZ Manager (Morning Operations)
Manager logs in 06:00 local time
Dashboard: "Today's Operations" shows 4 planned loads, current fill rate
Weather check: wind speed displayed, "HOLD" button if exceeds limit
Manifest builds loads via drag-drop UI: slots assigned
08:00: first load boards, POST /loads/1/manifest-start
08:45: load complete, POST /loads/1/manifest-complete, logbook entries created
14:00: incident reported, POST /incidents creates record, severity=LOW, notification sent
17:00: end-of-day, manager exports Daily Report (PDF), emailed to DZ
## 7.4 Security Rules Matrix (Role × Action)

| Variable | Default | Description | Required |
| --- | --- | --- | --- |
| JWT_PRIVATE_KEY | (none) | RS256 private key (PEM format) | Yes |
| JWT_PUBLIC_KEY | (none) | RS256 public key (PEM format) | Yes |
| JWT_ACCESS_EXPIRES | 15m | Access token TTL | No |
| JWT_REFRESH_EXPIRES | 7d | Refresh token TTL | No |
| GOOGLE_OAUTH_CLIENT_ID | (none) | OAuth app ID | Yes |
| GOOGLE_OAUTH_CLIENT_SECRET | (none) | OAuth app secret | Yes |
| GOOGLE_OAUTH_REDIRECT_URI | http://localhost:3000/auth/google/callback | Redirect URL | Yes |
| RECAPTCHA_SECRET_KEY | (none) | reCAPTCHA v3 secret | No |
| ENCRYPTION_KEY | (none) | 32-byte base64 AES key for OAuth tokens | Yes |
| SESSION_MAX_DEVICES | 5 | Max concurrent active sessions | No |
| RATE_LIMIT_GENERAL_RPM | 100 | General endpoint rate limit per minute | No |
| RATE_LIMIT_AUTH_RPM | 5 | Auth endpoint rate limit per minute | No |

| Event | Entity | Severity | Fields Captured |
| --- | --- | --- | --- |
| AUTH_LOGIN_SUCCESS | User | INFO | userId, method, deviceId, ipAddress |
| AUTH_LOGIN_FAILED | User | WARNING | email, method, reason, ipAddress, attemptCount |
| AUTH_PASSKEY_REGISTERED | Passkey | INFO | userId, aaguid, transports |
| AUTH_PASSKEY_FAILED | User | WARNING | userId, reason, ipAddress |
| AUTH_MFA_SETUP | MfaDevice | INFO | userId, type |
| AUTH_MFA_FAILED | User | WARNING | userId, method, reason |
| AUTH_SESSION_REVOKED | RefreshToken | INFO | userId, sessionId, revokedBy |
| AUTH_PASSWORD_CHANGED | User | INFO | userId |
| AUTH_ACCOUNT_LOCKED | User | WARNING | userId, email, reason, unlockableAt |
| AUTH_SUSPICIOUS_LOGIN | User | CRITICAL | userId, oldLocation, newLocation, distance_km, newDeviceId |

| Step | Fields | Validation | API Endpoint |
| --- | --- | --- | --- |
| 1: Basic Info | firstName, lastName, DOB, weight (kg), height (cm) | DOB > 18y old, weight 45-150kg, height 145-230cm | POST /onboarding/step |
| 2: Emergency Contact | name, phone, relation, language preference | phone valid international format, relation required | POST /onboarding/step |
| 3: Medical Disclosure | conditions (multi-select), medications (text), allergies (text), physicalActivityLevel | any field can be empty (optional disclosure) | POST /onboarding/step |
| 4: Digital Waiver | accept checkbox, signature (canvas base64), timestamp, ipAddress, userAgent, location (lat/lon) | signature non-empty, checkbox = true, capture all metadata | POST /onboarding/step + POST /waivers |
| 5: Safety Video | videoId, watchTimeMs, quizScore (0-100), retakes | watchTimeMs >= 85% of video duration, quizScore >= 70% | POST /onboarding/step + POST /safety-video/completion |
| 6: Booking Selection | loadId (datetime), slotNumber, tandemType ("AFF" | "IPC" | "STUDENT"), aircraft | loadId must have available slots, load datetime > 24h from now | GET /loads/available, POST /onboarding/step |
| 7: Payment | stripePaymentIntentId, amount, currency, cardLast4 | payment intent status = succeeded | POST /payments/confirm, POST /onboarding/complete |

| Step | Fields | Validation | Notes |
| --- | --- | --- | --- |
| 1: License Verification | uspaNumber, rating (A-D), licensePhotoUrl (S3) | USPA # length 4-6, rating in ["A", "B", "C", "D"], photo <5MB JPG | Fetch USPA registry via external API (cached 24h) |
| 2: Jump History | totalJumps, lastJumpDate, disciplines (multi-select) | totalJumps >= 100, lastJumpDate < 2y old for refresher | disciplines: BASE, FS, FF, CRW, Speed, Swooping |
| 3: Gear Declaration | ownGear: bool, rig (type, brand, model), container, parachute, altimeter | if ownGear=false, set rentalPreference to rental type | Validate gear specs against DZ allowlist (if strict mode) |
| 4: Emergency Profile | bloodType, medicalAlerts, allergies, insuranceProvider, policyNumber | bloodType required, others optional | Stored encrypted due to PII sensitivity |
| 5: Notification Preferences | loadUpdates: bool, coachingOffers: bool, emergencyAlerts: bool, newsletter: bool | emergencyAlerts cannot be disabled (always on) | Also generates QR identity card (base64 image) |

| Step | Input Example | Validation Rule | Error Message | Required? |
| --- | --- | --- | --- | --- |
| Tandem:1 | DOB=2000-01-15 | age >= 18 | Must be 18 or older | Yes |
| Tandem:1 | weight=40kg | weight >= 45kg | Minimum weight is 45kg | Yes |
| Tandem:3 | none (skip) | can be empty | Skipped medical disclosure | No |
| Tandem:4 | signature="" | non-empty | Signature required | Yes |
| Licensed:1 | USPA#=12345 | length 4-6, numeric | Invalid USPA number format | Yes |
| Licensed:2 | lastJump=2023-01-01 | gap <= 2 years | Refresher course required (last jump >2y) | Yes |
| Coach:3 | timezone="America/Denver" | valid IANA timezone | Invalid timezone | Yes |
| DZ:2 | icao="KSJC" | ICAO regex [A-Z]{4} | Invalid ICAO code | Yes |

| Event | Channels | Priority | Template | Retry Policy |
| --- | --- | --- | --- | --- |
| USER_REGISTERED | EMAIL,INAPP | HIGH | welcome_email | Exponential 3x (1m,5m,30m) |
| LOAD_CREATED | INAPP,WEBHOOK | NORMAL | load_created_notification | Exponential 3x |
| LOAD_CANCELLED | EMAIL,SMS,INAPP | HIGH | load_cancelled_alert | Exponential 3x |
| BOOKING_CONFIRMED | EMAIL,SMS,INAPP | HIGH | booking_confirmation | Exponential 3x |
| PAYMENT_RECEIVED | EMAIL,INAPP | NORMAL | payment_receipt | Exponential 3x |
| COACHING_SCHEDULED | EMAIL,SMS,INAPP | NORMAL | coaching_reminder | Exponential 3x |
| INCIDENT_REPORTED | EMAIL,INAPP,WEBHOOK | CRITICAL | incident_alert | Immediate (5m retry) |
| WEATHER_ALERT | SMS,INAPP,WEBHOOK | CRITICAL | weather_alert | Immediate |
| PAYOUT_READY | EMAIL,INAPP | NORMAL | payout_notification | Exponential 3x |
| ROLE_ASSIGNED | EMAIL,INAPP | NORMAL | role_assignment | Exponential 3x |

| Method | Path | Description | Auth Level |
| --- | --- | --- | --- |
| POST | /payments/create-intent | Create Stripe PaymentIntent for booking | USER |
| POST | /payments/:id/confirm | Confirm intent, trigger split transfers | USER |
| POST | /payments/:id/refund | Refund payment | USER (own) or DZ_ADMIN |
| GET | /payments/:id | Get payment details | USER (own) or ADMIN |
| GET | /payments | List user payments (paginated) | USER |
| POST | /stripe-connect/auth-url | Get Coach Express onboarding URL | COACH |
| POST | /stripe-connect/onboarding-link | Get DZ Standard onboarding URL | DZ_MANAGER |
| GET | /stripe-connect/account | Get current user stripe account status | COACH or DZ_MANAGER |
| GET | /payouts | List payouts for current account | COACH or DZ_MANAGER |
| POST | /payouts/create-manual | Request immediate payout (fee applies) | COACH or DZ_MANAGER |

| Variable | Default | Description |
| --- | --- | --- |
| STRIPE_SECRET_KEY | (none) | Stripe restricted API key (platform account) |
| STRIPE_PUBLISHABLE_KEY | (none) | Stripe publishable key (front-end) |
| STRIPE_WEBHOOK_SECRET | (none) | Stripe webhook signing secret |
| STRIPE_CONNECT_CLIENT_ID | (none) | Stripe Connect OAuth client ID |
| PAYOUT_DAY_OF_WEEK | 5 (Friday) | Day to trigger automatic payouts (0=Sunday) |
| PAYOUT_MINIMUM_AMOUNT_USD | 5000 (cents) | Minimum balance threshold to trigger payout |
| PAYOUT_MANUAL_FEE_USD | 200 (cents) | Fee for manual payout request |
| REFUND_GRACE_PERIOD_HOURS | 24 | Hours before event to allow 100% refund |
| REFUND_PARTIAL_PERIOD_HOURS | 48 | Hours before event to allow 50% refund |

| Source | Metrics | Dimensions | Filters | Notes |
| --- | --- | --- | --- | --- |
| Revenue | sum, avg, count | by date, by DZ, by coach, by booking type | date range, status | Transactions + PaymentIntents |
| Bookings | utilization %, fill rate, no-show rate | by load, by day, by aircraft | date range, load status | Slots + Loads queries |
| Payouts | total paid, total pending, avg payout | by recipient, by currency, by month | date range, status | Payout model aggregates |
| Coach Performance | rating, revenue, hours, repeat rate | by coach, by student | date range, rating threshold | CoachingSession + reviews |
| Manifest Utilization | fill %, aircraft usage, peak hours | by date, by aircraft, by hour | date range, wind conditions | Loads + Slots |
| Onboarding Conversion | completion rate, drop-off step, time-to-complete | by role, by cohort | date range, role filter | OnboardingSession aggregates |
| Compliance | expiry alerts, overdue items, severity dist | by item type, by DZ | overdue flag, severity | Waivers, MedicalCheck, GearCheck |

| Method | Path | Description | Response |
| --- | --- | --- | --- |
| GET | /reports/dashboards | List dashboards for user | [{id, name, isDefault, blocks}] |
| POST | /reports/dashboards | Create new dashboard | {id, name, layout} |
| PATCH | /reports/dashboards/:id | Update layout (reorder/resize blocks) | {success, layout} |
| DELETE | /reports/dashboards/:id | Delete dashboard | {success} |
| GET | /reports/data/:source | Execute data query | {rows, columns, summary} |
| POST | /reports/blocks | Add block to dashboard | {blockId, position, size} |
| PATCH | /reports/blocks/:id | Update block config | {success, config} |
| DELETE | /reports/blocks/:id | Remove block from dashboard | {success} |
| GET | /reports/export/:dashboardId | Export dashboard (PDF/CSV/XLSX) | File download |

| Job | Schedule | Description | Queue |
| --- | --- | --- | --- |
| aggregate_daily_revenue | 23:00 UTC daily | Sum transactions by DZ, coach, date | reporting |
| calculate_fill_rates | 00:30 UTC daily | Slots filled / total slots per load | reporting |
| refresh_dashboard_cache | 00:00 UTC daily | Pre-compute KPI values for public dashboards | reporting |
| check_compliance_expiry | 06:00 UTC daily | Flag expired waivers, certifications | compliance |
| sync_stripe_payouts | 09:00 UTC daily | Fetch payout status from Stripe, update DB | payments |

| Variable | Scope | Example | Required | Notes |
| --- | --- | --- | --- | --- |
| NODE_ENV | Both | production | Yes | development | staging | production |
| DATABASE_URL | API | mysql://user:pass@host/db?sslMode=require | Yes | Connection string with SSL |
| REDIS_URL | API | redis://host:6379/0 | Yes | Redis for cache + sessions + BullMQ |
| JWT_PRIVATE_KEY | API | (PEM base64) | Yes | RS256 signing key |
| JWT_PUBLIC_KEY | API | (PEM base64) | Yes | RS256 verification key |
| GOOGLE_OAUTH_CLIENT_ID | API | 123.apps.googleusercontent.com | Yes | OAuth app ID |
| GOOGLE_OAUTH_CLIENT_SECRET | API | (secret) | Yes |  |
| STRIPE_SECRET_KEY | API | sk_live_... | Yes | Stripe restricted key |
| STRIPE_PUBLISHABLE_KEY | Web+API | pk_live_... | Yes | Stripe public key |
| STRIPE_WEBHOOK_SECRET | API | whsec_... | Yes | Webhook signature key |
| SENDGRID_API_KEY | API | (API key) | Yes | Email service primary |
| TWILIO_ACCOUNT_SID | API | (SID) | Yes | Twilio account |
| TWILIO_AUTH_TOKEN | API | (token) | Yes | Twilio auth |
| TWILIO_PHONE_NUMBER | API | +16175551234 | Yes | From number for SMS |
| ANTHROPIC_API_KEY | API | (key) | Yes | Claude API access |
| AWS_S3_BUCKET | API | skylara-uploads | Yes | S3 for files (waivers, profiles, etc) |
| NEXT_PUBLIC_API_URL | Web | https://api.skylara.com | Yes | Frontend API endpoint |
| PAYOUT_DAY_OF_WEEK | API | 5 | No | 0=Sun, 5=Fri |

| Action | TANDEM | LICENSED | COACH | DZ_ADMIN | ADMIN |
| --- | --- | --- | --- | --- | --- |
| View own profile | Y | Y | Y | Y | Y |
| Edit own profile | Y | Y | Y | Y | Y |
| View own bookings | Y | Y | Y (as coach) | Y (DZ's) | Y |
| Create booking | Y | Y | N | Y | Y |
| Refund booking | Own 24h before | Own 24h before | N | Y (any) | Y |
| Access payment methods | Y (own) | Y (own) | Y (own) | Y (DZ's) | Y |
| View payouts | N | N | Y (own) | Y (DZ's) | Y |
| Create/edit report | N | N | Y (own) | Y (DZ's) | Y |
| Manage staff/roles | N | N | N | Y (DZ) | Y |
| Delete own account | Y (step-up) | Y (step-up) | Y (step-up) | Y (step-up + confirm) | Y (step-up) |