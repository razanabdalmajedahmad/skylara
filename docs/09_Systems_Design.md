# SKYLARA

_Source: 09_Systems_Design.docx_

SKYLARA
Complete Systems Design
Steps 4–9  |  Safety • Local Jumper • Localization • AI • Dashboard • Mobile
Version 1.0  |  April 2026
Emergency System • GPS Off-Landing • Risk Scoring • P2P Resale • Digital Logbook • RTL • Multi-Currency • Claude AI • Role Dashboards • React Native Expo
# Table of Contents
# Chapter 4: Safety & Emergency System
A life-critical safety infrastructure that enables instant access to medical data, emergency response coordination, and risk assessment across all dropzones. This chapter covers the Emergency Profile Data Model, activation protocols, off-landing detection, hospital integration, composite risk scoring, offline resilience, and compliance frameworks.
## 4.1 Emergency Profile Data Model
Every jumper maintains a comprehensive medical profile that is instantly accessible during emergencies. The emergency_profiles table stores blood type, allergies, medications, medical conditions, physical measurements, emergency contacts, insurance information, and special handling instructions.
### Core Fields
Encryption & Access Control
Medical data is encrypted at rest with AES-256-GCM. Every read access is logged with reader_id, timestamp, and access reason. Emergency mode bypass is logged separately for audit trails. Data is never included in error logs, push notifications, or analytics payloads.
## 4.2 Emergency Mode Activation
One persistent call-to-action on every screen: a large red EMERGENCY button (FAB floating action button) positioned at screen bottom-right, always accessible. Tapping triggers the activateEmergencyMode algorithm below.
### Algorithm: activateEmergencyMode(userId, location)
Offline Emergency Mode
Emergency profile, hospital numbers, and DZ coordinates are cached on device. GPS and phone dialer work without internet. After network returns, the incident report syncs to cloud.
## 4.3 Off-Landing Protocol
During AIRBORNE load status, GPS tracking continuously monitors the jumper's landing coordinates. If landing occurs >500 meters from DZ center, the system automatically triggers an off-landing alert, notifying manifest staff, safety officer, and instructors.
### Algorithm: detectOffLanding(jumperId, landingCoords, dzCoords)
Ground Crew Dispatch
Manifest staff receive coordinates, distance, bearing, and ETA. App shows map with off-landing location pinned. Ground crew can navigate directly or radio helicopter retrieval if necessary.
## 4.4 Local Hospital Database
Each DZ maintains a curated list of nearby hospitals with trauma capabilities, helipad availability, and specialized units. The findNearestHospital algorithm returns hospitals sorted by distance and filtered by trauma level requirements.
### local_hospitals Table Schema
### Algorithm: findNearestHospital(dzId, traumaLevel?)
Primary Hospital Selection
DZ safety officer designates one primary hospital via admin settings. This hospital is called first during emergency mode activation. List is sorted to show primary at top, then by distance.
## 4.5 Risk Assessment Engine
A composite risk scoring system that evaluates weather, visibility, precipitation, landing area condition, and hazard proximity. Scores from 0-100 determine operational status and apply restrictions by jumper type.
### risk_assessments Table Schema
### Algorithm: calculateCompositeRisk(assessment)
Risk Superseding Chain
New assessments automatically supersede previous ones. The superseded_by field links to the newer record, creating an audit trail. Operational decisions apply the most recent assessment only.
## 4.6 Offline Emergency Access
Emergency profiles, hospital data, and DZ coordinates are cached on mobile devices using WatermelonDB and on web using IndexedDB. Sync occurs on app open, every 30 minutes, and before AIRBORNE status.
### Sync Strategy
## 4.7 Compliance: GDPR, LGPD, POPIA, HIPAA-Adjacent
Medical data handling complies with GDPR (EU), LGPD (Brazil), POPIA (South Africa), and HIPAA principles. Encryption, consent management, access logging, and deletion workflows are implemented.
### Compliance Controls
Consent & Deletion Workflow
On first profile creation, user explicitly consents to storage for emergency purposes. Deletion is allowed but triggers a warning: "Deleting your emergency profile means rescue personnel won't have access to your medical history." Deletion is confirmed after 24-hour delay to prevent accidental erasure.
# Chapter 5: Local Jumper System
Systems designed to drive retention and deepen engagement for local/regular jumpers. Covers real-time DZ experience, smart pricing and P2P resale, digital logbook with skill tracking, community features, athlete identity and storytelling, and behavioral retention mechanics.
## 5.1 Real-Time DZ Experience
A live presence layer shows who is at the DZ, which loads are boarding, and who is currently in the air. Licensed jumpers can self-manifest into available loads with compliance checking.
### Features
'Who's at the DZ' presence display — checked-in today, on current load, in the air
Live load board (mobile) — WebSocket feed from manifest, read-only for athletes
Jump count ticker — '42 jumps completed today at [DZ Name]'
Next available load — estimated call time, slots remaining
Self-manifest (licensed jumpers only) — select jump type, pick load, auto-compliance check
Self-Manifest Algorithm
## 5.2 Smart Pricing & P2P Slot Resale
Dynamic pricing adjusts for peak/off-peak times. Jump ticket packs offer bulk discounts. Jumpers can resell paid slots, with the system crediting their wallet and offering the slot to the waitlist.
### Pricing Algorithm: calculateJumpPrice(dzId, basePrice, jumpType, timestamp)
### P2P Slot Resale Workflow
Revenue Model
DZ receives the jump slot price. Instructors (for tandems/AFF) receive commission via commission_splits table. P2P resale uses system price at claim time; difference benefits the DZ.
## 5.3 Digital Logbook & Skill Tracking
Every jump is recorded with altitude, freefall time, canopy size, deployment altitude, and GPS coordinates. Skill progression is tracked by discipline (belly, freefly, wingsuit, CRW) and AFF level. Currency and license readiness notifications alert jumpers.
### logbook_entries Table Schema
### AFF Progression Tracking
Levels 1-8 stored in aff_records table
Pass/fail status after each level
License readiness: "You need 5 more jumps for your B license"
Auto-trigger B license eligibility at 50 jumps + AFF-8 pass + 25 jumps post-AFF-8
### Currency Tracking Algorithm
Push Notifications
At 7 days before expiry and 3 days before expiry, jumpers receive push notifications: "Your currency expires in {{days}} days." This drives return to the DZ.
## 5.4 Community Features
Local jumpers organize team jumps, share check-in activity, post formation requests, and find coaching partners. These features deepen social bonds and increase frequency.
### Community Tables
Sample Posts
Check-in: "Sarah just checked in" — visible to her followers at the DZ
Ask: "Looking for 4-way belly partners Saturday 10am" — RSVP interface
Coach: "Want to learn freefly? 3 coaches available this weekend" — instructor bio cards
Milestone: "Just hit 500 jumps!" — auto-generated with media gallery
## 5.5 Athlete Story & Identity
Each jumper has a public athlete profile with tagline, bio, disciplines, certifications, total jump count, and media gallery. One identity across all DZs — no re-registration required.
### athlete_stories & athlete_milestones
### athlete_milestones (Sample)
Media Gallery
media_uploads linked to loads and tagged via media_tags (user tagging). Each load can have video, photo, and audio files. Athletes curate gallery for public profile display.
## 5.6 Retention Mechanics
A suite of behavioral mechanics drive consistent engagement: streak tracking, achievement badges, referral rewards, re-engagement campaigns, and annual summaries.
### Retention Features
Streak Tracking: "Jump streak: 4 consecutive weekends" — visual progress bar, pushed at milestone intervals
Achievement Badges: achievements table with unlocks. E.g., "First Freefly", "Century Club (100 jumps)", "Dawn Patrol (jump before 7am)"
Referral Program: bring a friend → both get $20 credit after friend's first jump
Re-engagement: if no jump in 30 days → push notification: "The sky misses you! 10% off your next jump"
Annual Summary: email + in-app card on Jan 1 showing "Your 2026 season: 87 jumps, 14 hours freefall, 3 new licenses"
Achievements Table Schema
# Chapter 6: Localization System
A comprehensive internationalization and localization (i18n/l10n) system supporting 15 languages, RTL layouts, multi-currency pricing, and per-DZ locale configuration. Includes production translation workflows, compliance safeguards, and dynamic currency conversion.
## 6.1 Language Architecture
SkyLara supports 15 languages across 5 regions. Each language is tracked for translation completeness, and RTL (right-to-left) support is provided for Arabic and Hebrew.
### Supported Languages
## 6.2 Translation System
Namespace-scoped keys support 13 functional areas. Plural forms, variable interpolation, and auto-translation via Claude API enable rapid localization workflows.
### Translation Key Structure
### 13 Namespaces
### TypeScript Translation Function
## 6.3 RTL Support
Arabic and Hebrew layouts are mirrored. CSS logical properties handle directional values, fonts are language-specific, and bidirectional text rules are applied.
### RTL Implementation
CSS logical properties: margin-inline-start / margin-inline-end instead of left/right
Mirrored layouts: nav sidebar on right, icons flipped, progress bars reverse
Font stack: Arabic → 'Noto Sans Arabic'; Hebrew → 'Noto Sans Hebrew'
Bidirectional text: numbers remain LTR within RTL paragraphs (e.g., 'البقاء 5 أيام' → number stays left-to-right)
Form direction: input fields, labels, and validation messages auto-align per language
## 6.4 Multi-Currency
10 major currencies are supported with daily exchange rate updates. Display is in the athlete's preferred currency, but settlement is always in the DZ's base currency.
### Supported Currencies
### Currency Formatting Algorithm
Exchange Rate Updates
Daily cron job fetches rates from Open Exchange Rates API and stores in currencies table. Display conversion is computed real-time. Settlement always uses DZ base currency, converted via Stripe Connect.
## 6.5 Per-DZ Locale Configuration
Each DZ sets default language, supported languages/currencies, and unit/date/time formats. Athletes see prices and measurements in their preferred locale.
### dz_locale_settings Table
### Unit Conversion Functions
## 6.6 Localized Notifications
Push, SMS, and email notifications are sent in the user's preferred language, not the DZ's default. RTL support is applied to email templates.
### notification_templates Localization
SMS Transliteration
For non-Latin alphabets (Arabic, Hebrew, Russian), SMS text is transliterated to Latin characters if the carrier doesn't support Unicode. Example: 'Marhaba' instead of 'مرحبا'.
## 6.7 Translation Management Workflow
A multi-step workflow enables rapid translation: keys are auto-translated by Claude API (Haiku model), reviewed by humans, approved, then deployed.
### Translation Workflow States
### Admin Workflow Algorithm
### Export/Import for External Translators
Admin exports translations to CSV format: key, namespace, english_text, translated_text, state
External translator edits CSV offline
Admin imports CSV; system creates new draft records
Language lead reviews and approves
### Translation Completeness Dashboard
Admin view shows per-language completeness: "Spanish: 73% complete (412/564 keys). French: 88% complete (496/564 keys)." Highlights untranslated keys and auto-translated candidates for review.
# Chapter 7: AI System
Design a practical AI system for DZ operations using Claude API. Sonnet handles complex multi-factor reasoning; Haiku enables real-time fast matching and pattern detection.
## 7.1 Load Optimization Engine
Analyze current manifest to suggest optimal load composition. Claude Sonnet evaluates jumper weights, jump types, exit groups, aircraft CG envelope, and wind conditions to recommend reordering, jumper swaps, and slot optimization.
### Inputs & Outputs
Inputs: jumper_weights[], jump_types[], exit_groups[], aircraft_cg_envelope, wind_conditions
Output: suggested_reordering[], jumper_swaps[], optimal_slot_count, confidence_score
Hard Constraints: never exceed CG limits, maintain exit order safety, respect instructor groupings
### TypeScript: optimizeLoadComposition()
Cache identical load configurations for 1 hour to reduce API calls.
## 7.2 Instructor Matching AI
Beyond skill matching: considers instructor-student history, teaching style, language preference, and past session ratings. Uses Claude Haiku for fast ranking.
### Ranking Factors
Skill match: student AFF level vs instructor certified levels (exact or cross-trained)
History: prior sessions with this student, cumulative rating, student feedback
Language: native language match, secondary language fluency
Availability: instructor free during requested time, current load
Style fit: conservative vs adventurous instructor preference
### TypeScript: aiInstructorMatch()
## 7.3 Demand Forecasting
7-day lookahead prediction using historical averages weighted by weather similarity, seasonal factors, and day-of-week patterns. Suggests staffing needs automatically.
### Forecast Algorithm
## 7.4 Safety Risk Alerts
Real-time monitoring of weather API changes, wind trend analysis, and incident pattern detection. Proactive alerts trigger before conditions exceed limits.
### Risk Monitoring Triggers
Wind trending: 3+ consecutive reads show upward trend → 30-min ETA to student limit
Hard landing cluster: 3+ hard landings in 2 hours → landing area conditions review
Weather hold: wind exceeds max for AFF/tandems → system auto-recommends hold
Equipment anomaly: reserve pack age, maintenance overdue, AAD battery low
### TypeScript: analyzeRiskTrends()
## 7.5 DZ Performance Insights
Daily/weekly/monthly reports auto-generated using Claude Sonnet for narrative analysis. Detects anomalies, calculates metrics, and provides operational recommendations.
### Key Metrics
### TypeScript: generateInsights()
Store all AI insights with model, tokens_used, latency_ms, and cost_estimate for cost tracking.
## 7.6 Jumper Behavior Analysis
Churn prediction identifies inactive jumpers and auto-triggers re-engagement campaigns. Progression recommendations suggest coaching packages. Privacy: aggregate only.
### Analysis Types
Churn prediction: no visit in 21+ days, declining visit frequency (trend analysis)
Re-engagement: personalized offers based on jump type preference, local events, instructor match
Progression: B-license coaching at 48+ jumps, D-license readiness, specialty recommendations
Influencer identification: jumpers who bring 3+ new students (social network analysis)
## 7.7 AI Integration Architecture
Claude API integration via Anthropic TypeScript SDK. Request queuing with rate limiting, response caching, and fallback to rule-based defaults if service unavailable.
### Architecture Diagram
### Request Queue & Caching
# Chapter 8: Dashboard System
Design role-specific dashboards with mobile-first, real-time architecture. WebSocket-driven updates, responsive grid layout, configurable widgets.
## 8.1 DZ Operator Dashboard
High-level operations overview: revenue trends, active loads, aircraft status, staff utilization, and AI recommendation panel.
### Layout & Primary Widgets
Top bar (fixed): revenue overview (today/week/month with arrows), weather hold toggle, quick action buttons
Main grid (70%): Load board, aircraft status cards, staff on-duty list
Right sidebar (30%): AI insights (top 3 recommendations), safety alerts, booking expirations
### Widget Configuration
## 8.2 Manifest Staff Dashboard
Optimize for load board interaction. Real-time load status, drag-drop jumper assignment, waitlist management, quick manifest entry.
### Primary Widget: Load Board (60% of screen)
### Quick Manifest (3-click entry)
Search: athlete name/ID → autocomplete from check-ins
Select: jump type, altitude preference
Assign: drag to load or auto-assign to next available
### WebSocket Real-time Updates
## 8.3 Instructor Dashboard
Today's schedule, pending booking requests, student history, availability toggle, earnings summary.
### Core Views
My Schedule tab: today's assignments with load info, student name, call time countdown
Booking Requests tab: pending requests with accept/decline, one-tap action
Student History: prior sessions with rating, notes, specialties
Availability Manager: weekly calendar, toggle per-day, quick-set 'unavailable today'
Earnings: YTD commission, this month breakdown by activity type
### Quick Actions
## 8.4 Athlete Dashboard
Personal jump logbook, next load with countdown, currency status, achievements, activity feed.
### Key Sections
### Self-Manifest Flow
## 8.5 Platform Admin Dashboard
Multi-DZ oversight: activeDZ map, platform health, onboarding pipeline, financial summary, compliance tracking.
### Key Widgets
## 8.6 Widget Architecture
Pluggable, configurable widget system supporting real-time and historical data sources.
### Widget Interface & Data Sources
### Dashboard State & Persistence
# Chapter 9: Mobile Strategy
React Native (Expo) for shared codebase with web. Offline-first with WatermelonDB, push notifications, background GPS during jumps, field-optimized UI.
## 9.1 Technology Decision: React Native (Expo)
Chosen over PWA for push notification reliability, native background GPS, and offline capabilities. Shared TypeScript services with Next.js web app.
### Decision Matrix
### Expo Advantages
OTA updates: deploy JavaScript changes without App Store review (up to 100MB total)
EAS Build: managed CI/CD, no local Xcode/Android Studio needed for most changes
SDK integrations: location, notifications, sensors pre-built and Expo-tested
Development: Expo Go app for instant preview, error recovery detailed
## 9.2 App Architecture
Feature modules mirror web, bottom tab navigation, Zustand for state, tRPC for type-safe APIs, React Query for caching.
### Folder Structure
### State Management & API Layer
## 9.3 Offline-First Strategy
Critical data cached locally on device. WatermelonDB for structured sync, MMKV for key-value. Conflict resolution: server-wins for financial, last-write-wins for notes.
### Data Sync Model
### Offline Capabilities & Sync Indicator
View load board (stale but usable)
Check-in to waitlist (queued, will sync when online)
View logbook, profile, DZ info (cached)
Sync indicator (top of screen): green=live, yellow=syncing, red=offline + last_sync_time
## 9.4 Push Notifications
Channel-based opt-out, priority tiers, rich notifications with action buttons, silent background push for data sync.
### Notification Channels & User Control
### Notification Handling
## 9.5 GPS & Location
Background GPS enabled only during AIRBORNE loads. Geofencing auto-check-in, off-landing detection, battery-conscious tracking.
### Location Service Logic
## 9.6 Field Conditions Design
Sunlight readability, glove-friendly interface, one-handed operation, battery conscious, network resilient.
### UX Principles for Field
## 9.7 Role-Specific Mobile Experience
Different primary tab and offline capabilities per role, optimized for field usage.
### Role Experience Matrix
### Manifest Staff: Load Board Mobile
### Athlete: Self-Manifest Flow
All screens use React Native dark mode by default. Test on Pixel 6 (Haiku GPU) and iPhone 14 for performance baselines.

| Field | Type | Description |
| --- | --- | --- |
| blood_type | enum | A, B, AB, O + Rh factor (±) |
| allergies | JSON array | Allergy names with severity (low/medium/severe) |
| medications | JSON array | {name, dosage, frequency, reason} |
| medical_conditions | JSON array | Asthma, diabetes, seizures, etc. with onset date |
| weight_kg | decimal | Current body weight |
| height_cm | decimal | Height for landing injuries assessment |
| primary_contact | JSON object | {name, phone (E.164), relation, consent_given} |
| secondary_contact | JSON object | Backup emergency contact |
| insurance_provider | string | Name of medical insurance company |
| insurance_policy | string | Policy number (encrypted) |
| insurance_group | string | Group ID (encrypted) |
| physician_name | string | Primary care physician |
| physician_phone | string | Phone in E.164 format |
| special_instructions | text | "EpiPen in left pocket", "Deaf — visual signals" |
| last_reviewed_at | timestamp | Prompt re-confirmation every 90 days |
| created_at | timestamp | Profile creation date |
| updated_at | timestamp | Last modification |

| async function activateEmergencyMode(userId: string, location: {lat: number; lng: number}): Promise<void> {   // 1. Fetch emergency profile from local cache (WatermelonDB/IndexedDB)   const profile = await getEmergencyProfileOffline(userId);   if (!profile) {     showAlert('No emergency profile found. Please set up emergency data in Settings.');     return;   }    // 2. Display emergency profile fullscreen (overlay with dismiss after call placed)   displayEmergencyProfileOverlay(profile);    // 3. Find primary hospital within this DZ and call it immediately   const dzId = await getCurrentDZId();   const primaryHospital = await findPrimaryHospital(dzId);   if (primaryHospital) {     const callUrl = `tel:${primaryHospital.phone}`;     window.location.href = callUrl; // Native tel: intent   }    // 4. Create incident_reports draft record   const incident = await db.incident_reports.create({     jumper_id: userId,     dz_id: dzId,     incident_type: 'emergency_activated',     location_lat: location.lat,     location_lng: location.lng,     emergency_profile_snapshot: profile,     status: 'draft',     created_at: new Date()   });    // 5. Push GPS coordinates to all DZ staff with 'safety' role   const staffChannelId = `dz:${dzId}:staff:alerts`;   await publishToChannel(staffChannelId, {     type: 'emergency_activation',     jumper_id: userId,     location: { lat: location.lat, lng: location.lng },     incident_id: incident.id,     timestamp: Date.now(),     message: `EMERGENCY: ${profile.primaryContact.name} at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`   });    // 6. Send SMS to primary and secondary emergency contacts   const smsBody = `EMERGENCY: Skydiver emergency activation at dropzone. GPS: ${location.lat},${location.lng}. Incident ID: ${incident.id}`;   await sendSMS(profile.primary_contact.phone, smsBody);   if (profile.secondary_contact?.phone) {     await sendSMS(profile.secondary_contact.phone, smsBody);   }    // 7. Log access to emergency profile   await logProfileAccess({     profile_id: profile.id,     reader_id: userId, // self-access     reason: 'emergency_mode_activation',     timestamp: new Date()   }); } |
| --- |

| async function detectOffLanding(   jumperId: string,   landingCoords: { lat: number; lng: number },   dzCoords: { lat: number; lng: number } ): Promise<void> {   // 1. Calculate distance using Haversine formula   const distanceMeters = haversineDistance(     { lat: dzCoords.lat, lng: dzCoords.lng },     { lat: landingCoords.lat, lng: landingCoords.lng }   );    const OFF_LANDING_THRESHOLD_M = 500;   if (distanceMeters <= OFF_LANDING_THRESHOLD_M) {     return; // Normal landing within DZ boundary   }    // 2. Calculate bearing and ETA for ground crew   const bearing = calculateBearing(dzCoords, landingCoords);   const bearingCardinal = bearingToDegrees(bearing); // 'NE', 'SSW', etc.    // 3. Estimate ground crew ETA (assumption: 25 km/h vehicle speed)   const etaMinutes = Math.ceil((distanceMeters / 1000) / 25 * 60);    // 4. Fetch risk assessment for wind drift estimation   const dzId = await getCurrentDZId();   const riskAssessment = await db.risk_assessments     .query(x => x.where('dz_id', dzId))     .sort('created_at', 'desc')     .take(1)[0];    // 5. Create off_landing_alert record   const alert = await db.off_landing_alerts.create({     jumper_id: jumperId,     dz_id: dzId,     landing_coords: landingCoords,     dz_coords: dzCoords,     distance_meters: distanceMeters,     bearing_degrees: bearing,     bearing_cardinal: bearingCardinal,     eta_minutes: etaMinutes,     wind_drift_factor: riskAssessment?.wind?.wind_speed_kts ?? 0,     status: 'active',     created_at: new Date()   });    // 6. Notify manifest staff, safety officer, and instructors   const load = await getJumperCurrentLoad(jumperId);   const instructors = load?.instructors || [];    const recipients = [     ...getStaffByRole(dzId, 'manifest'),     ...getStaffByRole(dzId, 'safety_officer'),     ...instructors   ];    for (const recipient of recipients) {     await sendPushNotification(recipient.user_id, {       title: 'OFF-LANDING ALERT',       body: `${jumperId} landed ${(distanceMeters / 1609).toFixed(1)} mi ${bearingCardinal} of DZ. ETA: ${etaMinutes} min`,       data: { alert_id: alert.id, jumper_id: jumperId }     });   }    // 7. Create incident_reports record for tracking   await db.incident_reports.create({     jumper_id: jumperId,     dz_id: dzId,     incident_type: 'off_landing',     location_lat: landingCoords.lat,     location_lng: landingCoords.lng,     off_landing_alert_id: alert.id,     status: 'open',     created_at: new Date()   }); } |
| --- |

| Field | Type | Description |
| --- | --- | --- |
| id | uuid pk | Hospital unique identifier |
| dz_id | uuid fk | Associated dropzone |
| name | string | Hospital name |
| address | string | Full street address |
| phone | string | Main line (E.164) |
| phone_trauma | string | Trauma center direct line |
| lat | decimal | Latitude |
| lng | decimal | Longitude |
| distance_miles | decimal | Computed from DZ center |
| eta_minutes | decimal | Estimated drive time |
| trauma_level | enum | I, II, III, IV, V |
| has_helipad | boolean | Helicopter landing capability |
| has_burn_unit | boolean | Specialized burn treatment |
| has_neuro_icl | boolean | Neurosurgery ICL |
| has_orthopedic | boolean | Orthopedic specialty |
| is_primary | boolean | Default hospital for this DZ |
| notes | text | Special instructions e.g. "Back entrance for ER" |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

| async function findNearestHospital(   dzId: string,   traumaLevel?: 'I' | 'II' | 'III' | 'IV' | 'V' ): Promise<Hospital[]> {   // 1. Query all hospitals for this DZ   let hospitals = await db.local_hospitals     .query(x => x.where('dz_id', dzId))     .fetch();    // 2. Filter by trauma level if specified   if (traumaLevel) {     const traumaHierarchy = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };     hospitals = hospitals.filter(       h => traumaHierarchy[h.trauma_level] <= traumaHierarchy[traumaLevel]     );   }    // 3. Sort by distance (nearest first)   hospitals.sort((a, b) => a.distance_miles - b.distance_miles);    // 4. Mark primary hospital with priority flag   hospitals.forEach((h, i) => {     h.priority = h.is_primary ? 0 : i + 1;   });    // 5. Stable sort: primary first, then by distance   hospitals.sort((a, b) => a.priority - b.priority);    return hospitals; }  // Usage: const nearestHospital = (await findNearestHospital(dzId))[0]; const traumaCenterI = (await findNearestHospital(dzId, 'I'))[0]; |
| --- |

| Field | Type | Description |
| --- | --- | --- |
| id | uuid pk | Assessment unique identifier |
| dz_id | uuid fk | Associated dropzone |
| created_by | uuid fk | Safety officer user ID |
| wind_speed_kts | decimal | Current wind speed (knots) |
| wind_gust_kts | decimal | Gust wind speed |
| wind_direction_deg | decimal | Direction 0-360 |
| wind_aloft_kts | decimal | Aloft wind speed |
| visibility_ft | integer | Horizontal visibility |
| precipitation_type | enum | none|rain|snow|sleet |
| precipitation_intensity | enum | light|moderate|heavy |
| landing_area | JSON | {grass_condition, obstacles, slope_pct} |
| landing_hazards | JSON array | [{type, distance_ft, severity}] |
| wind_risk_score | integer | 0-100 |
| visibility_score | integer | 0-100 |
| precipitation_score | integer | 0-100 |
| landing_area_score | integer | 0-100 |
| hazard_score | integer | 0-100 |
| composite_score | integer | 0-100 (weighted) |
| risk_level | enum | low|moderate|elevated|high|extreme |
| operational_decision | enum | operations_normal|restrictions_applied|weather_hold|operations_suspended |
| restrictions_applied | JSON array | [{jumper_type, reason, until}] |
| decision_notes | text | Why this decision was made |
| superseded_by | uuid fk | ID of newer assessment |
| created_at | timestamp | Assessment time |
| updated_at | timestamp | Last modification |

| interface RiskAssessment {   wind_speed_kts: number;   wind_gust_kts: number;   visibility_ft: number;   precipitation_type: 'none' | 'rain' | 'snow' | 'sleet';   precipitation_intensity: 'light' | 'moderate' | 'heavy';   landing_area: { grass_condition: 'wet' | 'dry' | 'muddy'; obstacles: boolean; slope_pct: number };   landing_hazards: Array<{ type: string; distance_ft: number; severity: 'low' | 'medium' | 'high' }>; }  function calculateCompositeRisk(assessment: RiskAssessment): {   score: number; risk_level: string; decision: string; restrictions: Array<{type: string; reason: string}>; } {   // 1. WIND RISK (40% weight) — max speed 17kts for students, 20kts for licensed, 25kts for experienced   let windScore = 0;   if (assessment.wind_speed_kts <= 10) windScore = 0;   else if (assessment.wind_speed_kts <= 15) windScore = 25;   else if (assessment.wind_speed_kts <= 20) windScore = 50;   else if (assessment.wind_speed_kts <= 25) windScore = 75;   else windScore = 100;    // Gust penalty: each knot over base adds 5 points   const gustPenalty = Math.max(0, assessment.wind_gust_kts - assessment.wind_speed_kts) * 5;   windScore = Math.min(100, windScore + gustPenalty);    // 2. VISIBILITY (20% weight) — minimum 5000 ft for operations, 10000+ is normal   let visibilityScore = 0;   if (assessment.visibility_ft >= 10000) visibilityScore = 0;   else if (assessment.visibility_ft >= 7500) visibilityScore = 15;   else if (assessment.visibility_ft >= 5000) visibilityScore = 40;   else if (assessment.visibility_ft >= 3000) visibilityScore = 70;   else visibilityScore = 100;    // 3. PRECIPITATION (15% weight)   let precipScore = 0;   const precipMap = {     none: { light: 0, moderate: 0, heavy: 0 },     rain: { light: 15, moderate: 40, heavy: 85 },     snow: { light: 40, moderate: 80, heavy: 100 },     sleet: { light: 50, moderate: 90, heavy: 100 }   };   precipScore = precipMap[assessment.precipitation_type][assessment.precipitation_intensity];    // 4. LANDING AREA (15% weight) — grass condition, obstacles, slope   let landingScore = 0;   if (assessment.landing_area.grass_condition === 'muddy') landingScore += 30;   else if (assessment.landing_area.grass_condition === 'wet') landingScore += 15;   if (assessment.landing_area.obstacles) landingScore += 25;   if (assessment.landing_area.slope_pct > 5) landingScore += 20;   landingScore = Math.min(100, landingScore);    // 5. HAZARDS (10% weight) — proximity multiplier   let hazardScore = 0;   for (const hazard of assessment.landing_hazards) {     const severityMap = { low: 10, medium: 25, high: 50 };     const proximityMultiplier = hazard.distance_ft < 300 ? 3 : hazard.distance_ft < 1000 ? 1.5 : 1;     hazardScore += severityMap[hazard.severity] * proximityMultiplier;   }   hazardScore = Math.min(100, hazardScore);    // 6. COMPOSITE SCORE (weighted sum)   const compositeScore = Math.round(     windScore * 0.40 +     visibilityScore * 0.20 +     precipScore * 0.15 +     landingScore * 0.15 +     hazardScore * 0.10   );    // 7. DETERMINE RISK LEVEL   let riskLevel: string;   if (compositeScore <= 25) riskLevel = 'low';   else if (compositeScore <= 50) riskLevel = 'moderate';   else if (compositeScore <= 65) riskLevel = 'elevated';   else if (compositeScore <= 80) riskLevel = 'high';   else riskLevel = 'extreme';    // 8. OPERATIONAL DECISION & RESTRICTIONS   let decision: string;   const restrictions: Array<{jumper_type: string; reason: string}> = [];    if (riskLevel === 'low') {     decision = 'operations_normal';   } else if (riskLevel === 'moderate') {     decision = 'operations_normal';   } else if (riskLevel === 'elevated') {     decision = 'restrictions_applied';     restrictions.push({ jumper_type: 'student', reason: 'Elevated risk conditions' });   } else if (riskLevel === 'high') {     decision = 'weather_hold';     restrictions.push({ jumper_type: 'student', reason: 'High risk conditions' });     restrictions.push({ jumper_type: 'tandem', reason: 'High risk conditions' });   } else {     decision = 'operations_suspended';     restrictions.push({ jumper_type: 'all', reason: 'Extreme risk conditions' });   }    return {     score: compositeScore,     risk_level: riskLevel,     decision: decision,     restrictions: restrictions   }; } |
| --- |

| class EmergencyDataSyncManager {   private lastSyncTime: number = 0;   private syncIntervalMs: number = 30 * 60 * 1000; // 30 minutes    async initializeSync(userId: string): Promise<void> {     // 1. On app initialization, pull latest data     await this.pullEmergencyData(userId);     this.lastSyncTime = Date.now();      // 2. Set up periodic sync every 30 minutes     setInterval(() => this.pushAndPullSync(userId), this.syncIntervalMs);   }    private async pullEmergencyData(userId: string): Promise<void> {     try {       // Pull emergency_profiles, local_hospitals, dz_info       const [profile, hospitals, dzInfo] = await Promise.all([         fetch(`/api/emergency-profile/${userId}`).then(r => r.json()),         fetch(`/api/dz/${getCurrentDZId()}/hospitals`).then(r => r.json()),         fetch(`/api/dz/${getCurrentDZId()}/info`).then(r => r.json())       ]);        // Store in local database       await db.emergency_profiles.putSync(profile);       await db.local_hospitals.putAllSync(hospitals);       await db.dz_info.putSync(dzInfo);        this.lastSyncTime = Date.now();       this.showSyncIndicator(`Last synced: ${new Date().toLocaleTimeString()}`);     } catch (error) {       console.error('Emergency data pull failed:', error);       this.checkDataFreshness();     }   }    async beforeAirborneStatusChange(userId: string): Promise<void> {     // Force sync before marking load as AIRBORNE     try {       await this.pullEmergencyData(userId);     } catch (error) {       // Allow AIRBORNE even if sync fails; show warning       this.showWarning('Emergency data is stale. Last sync: ' + this.getLastSyncTime());     }   }    private checkDataFreshness(): void {     const hours = (Date.now() - this.lastSyncTime) / (1000 * 60 * 60);     if (hours > 24) {       this.showWarning('Emergency data stale (>24h). Sync at your earliest opportunity.');     }   }    private getLastSyncTime(): string {     return new Date(this.lastSyncTime).toLocaleString();   } } |
| --- |

| Framework | Requirement | Implementation |
| --- | --- | --- |
| GDPR | Encryption at rest & in transit | AES-256-GCM + TLS 1.3 |
| GDPR | Explicit consent for data storage | Opt-in modal on profile setup, consent logged |
| GDPR | Right to erasure | User can delete profile; system warns about safety implications |
| GDPR | Data retention limits | Hard-delete 90 days after account deactivation |
| LGPD (Brazil) | Purpose limitation | Medical data only for emergency response |
| POPIA (South Africa) | Lawful processing | Medical necessity for participant safety |
| HIPAA-adjacent | No medical data in logs | Error reports, analytics exclude emergency_profiles |
| HIPAA-adjacent | No data in notifications | Push notifications show only incident ID, not medical details |
| All | Access audit trail | Every read logged: reader_id, timestamp, reason |
| All | No third-party sharing | Hospitals called directly; no data transmitted to external APIs |

| async function selfManifest(   userId: string,   loadId: string,   jumpType: 'freefly' | 'belly' | 'wingsuit' | 'canopy_piloting',   dzId: string ): Promise<{ success: boolean; message: string; manifest_id?: string }> {   // 1. Verify user is licensed for this jump type   const license = await getUserLicense(userId);   if (!license || license.type === 'student') {     return { success: false, message: 'Students must be manifested by staff' };   }    const jumpTypeToLicense = {     freefly: 'licensed',     belly: 'licensed',     wingsuit: 'licensed_wingsuit',     canopy_piloting: 'licensed_canopy'   };   if (license.type !== jumpTypeToLicense[jumpType]) {     return { success: false, message: `Not licensed for ${jumpType}` };   }    // 2. Check currency — license must not be expired   const currencyExpiresAt = license.last_jump_date + (365 * 24 * 60 * 60 * 1000); // 1 year   if (Date.now() > currencyExpiresAt) {     return { success: false, message: 'License expired. Contact DZ instructor.' };   }    // 3. Fetch load and verify slot availability   const load = await db.loads.find(loadId);   if (!load || load.status !== 'scheduled') {     return { success: false, message: 'Load no longer available' };   }   const occupancy = await countLoadManifest(loadId);   if (occupancy >= load.max_jumpers) {     return { success: false, message: 'Load is full' };   }    // 4. Check risk assessment — apply restrictions if elevated/high/extreme   const latestRisk = await getLatestRiskAssessment(dzId);   if (latestRisk.risk_level === 'extreme') {     return { success: false, message: 'Operations suspended due to weather' };   }   if (latestRisk.risk_level === 'high') {     return { success: false, message: 'Licensed only. Tandems suspended.' };   }    // 5. Create manifest record   const manifest = await db.load_manifest.create({     load_id: loadId,     jumper_id: userId,     dz_id: dzId,     jump_type: jumpType,     manifest_source: 'self_manifest',     manifested_at: new Date(),     status: 'manifested'   });    // 6. Publish load update to all connected clients (WebSocket)   await publishToChannel(`load:${loadId}`, {     type: 'manifest_update',     manifest_id: manifest.id,     jumper_id: userId,     action: 'added',     occupancy: occupancy + 1   });    return { success: true, message: 'Manifested!', manifest_id: manifest.id }; } |
| --- |

| interface PricingInput {   dzId: string;   basePriceCents: number; // e.g., 15000 = $150.00   jumpType: 'freefly' | 'belly' | 'wingsuit' | 'tandem';   timestamp: Date;   userId: string; }  async function calculateJumpPrice(input: PricingInput): Promise<number> {   // 1. Peak/Off-peak multiplier   let peakMultiplier = 1.0;   const hour = input.timestamp.getHours();   const dayOfWeek = input.timestamp.getDay();   const isHoliday = await isHolidayWeekend(input.timestamp);    // Weekday before 10am: 15% off   if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour < 10) {     peakMultiplier = 0.85;   }   // Weekend or holiday: 20% premium   else if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) {     peakMultiplier = 1.20;   }   // Holiday weekends: 35% premium   if (isHoliday && (dayOfWeek === 0 || dayOfWeek === 6)) {     peakMultiplier = 1.35;   }    // 2. Member discount (if user is member)   let memberDiscount = 1.0;   const member = await getUserMembership(input.userId);   if (member && member.active) {     memberDiscount = 0.95; // 5% off for members   }    // 3. Ticket pack discount (cumulative with member)   let ticketDiscount = 1.0;   const balance = await getJumpTicketBalance(input.userId, input.dzId);   if (balance >= 25) {     ticketDiscount = 0.85; // 15% off (buy 25, get 4 free)   } else if (balance >= 10) {     ticketDiscount = 0.90; // 10% off (buy 10, get 1 free)   }    // 4. Final price   const finalPrice = Math.round(     input.basePriceCents * peakMultiplier * memberDiscount * ticketDiscount   );    return finalPrice; } |
| --- |

| Step | Action | Result |
| --- | --- | --- |
| 1 | Jumper initiates slot release | Slot removed from load, placed in resale_listings |
| 2 | Payment refund issued | Original jump price (base price) credited to jumper wallet |
| 3 | Slot offered to waitlist | Waitlist members notified push: 'Slot now available' |
| 4 | Waitlist member claims slot | Pricing recalculated at claim time, new jumper manifests |
| 5 | If no waitlist taker (24h) | Slot reopened to general queue at dynamic price |

| Field | Type | Description |
| --- | --- | --- |
| id | uuid pk | Logbook entry ID |
| jumper_id | uuid fk | User who made the jump |
| dz_id | uuid fk | Dropzone |
| load_id | uuid fk | Associated load |
| jump_number | integer | Cumulative jump count for user |
| altitude_ft | integer | Jump altitude |
| freefall_time_sec | integer | Duration in air |
| canopy_size_sqft | integer | Canopy square footage |
| deployment_altitude_ft | integer | Altitude of deployment |
| landing_lat | decimal | Landing GPS latitude |
| landing_lng | decimal | Landing GPS longitude |
| disciplines | JSON array | ["belly", "freefly", ...] |
| student_level | enum | AFF-1 through AFF-8, null if not student |
| instructor_id | uuid fk | If AFF or tandem student |
| pass_fail | enum | pass | fail | not_eval |
| notes | text | "Great tracking", "Had line twist" |
| weather_conditions | JSON | {wind_kts, visibility_ft, precipitation} |
| created_at | timestamp | Jump date/time |
| updated_at | timestamp | Last modification |

| async function checkJumperCurrency(userId: string, dzId: string): Promise<{   is_current: boolean;   days_until_expiry: number;   message: string; }> {   // USPA currency rule: must jump in last 12 months   const lastJump = await db.logbook_entries     .query(x =>       x.where('jumper_id', userId).where('dz_id', dzId)     )     .sort('created_at', 'desc')     .take(1)[0];    if (!lastJump) {     return { is_current: false, days_until_expiry: 0, message: 'No jumps on record' };   }    const daysSinceLastJump = (Date.now() - lastJump.created_at) / (1000 * 60 * 60 * 24);   const daysUntilExpiry = 365 - daysSinceLastJump;    return {     is_current: daysUntilExpiry > 0,     days_until_expiry: Math.max(0, Math.ceil(daysUntilExpiry)),     message: daysUntilExpiry > 7       ? `Current. Expires in ${Math.ceil(daysUntilExpiry)} days.`       : `WARNING: Expires in ${Math.ceil(daysUntilExpiry)} days!`   }; } |
| --- |

| Table | Purpose | Key Fields |
| --- | --- | --- |
| teams | Formation jump groups | name, description, created_by, created_at |
| team_members | Jumpers in team | team_id, user_id, role (member|lead), joined_at |
| social_posts | Activity feed | author_id, dz_id, content, post_type (check_in|ask|coach|milestone) |
| post_replies | Comments/responses | post_id, author_id, content, created_at |
| follows | Social connections | follower_id, following_id, dz_id (scoped) |
| likes | Post engagement | post_id, user_id, created_at |

| Field | Type | Description |
| --- | --- | --- |
| id | uuid pk | Profile ID |
| user_id | uuid fk | User unique ID |
| tagline | string (max 100) | "Freefly junkie, 800+ jumps" |
| bio | text | About me, achievements, goals |
| disciplines | JSON array | ["belly", "freefly", "wingsuit"] |
| certifications | JSON array | ["IPC", "USPA-A-License", "TI"] |
| total_jumps | integer | Auto-computed from logbook |
| first_jump_date | date | Very first jump |
| profile_photo_id | uuid fk | Media upload ID |
| public_url | string | skylara.com/@username |
| qr_code | string | QR to profile URL |
| created_at | timestamp | Profile creation |
| updated_at | timestamp | Last edit |

| Milestone Type | Trigger | Example |
| --- | --- | --- |
| first_jump | logbook entry #1 | "First jump: Jan 15, 2020 at Skydive AZ" |
| license_earned | aff_records.pass at level 8 | "B License: Mar 22, 2020" |
| jump_100 | logbook_entries.count = 100 | "Century Club: Oct 2020" |
| jump_500 | logbook_entries.count = 500 | "500 Jumps: Sept 2022" |
| jump_1000 | logbook_entries.count = 1000 | "1000 Jumps: May 2024" |
| custom_medal | Manual award by DZ safety officer | "Best Canopy Pilot (2024)" |

| Field | Type | Description |
| --- | --- | --- |
| id | uuid pk | Achievement ID |
| name | string | Display name |
| description | string | "Make your first freefly jump" |
| icon_id | uuid | Badge image asset |
| trigger_type | enum | first_jump|jump_count|discipline|license|custom |
| trigger_value | JSON | {jump_count: 100} or {discipline: 'freefly'} |
| rarity | enum | common|uncommon|rare|legendary |
| points | integer | Gamification score |
| created_at | timestamp | Achievement definition date |

| BCP-47 Code | Language | Region | RTL | Completeness |
| --- | --- | --- | --- | --- |
| en | English | Global | false | 100% |
| es | Spanish | Latin America | false | 92% |
| fr | French | Europe | false | 88% |
| de | German | Europe | false | 85% |
| it | Italian | Europe | false | 82% |
| pt | Portuguese | Brazil/Portugal | false | 79% |
| nl | Dutch | Netherlands | false | 76% |
| pl | Polish | Central Europe | false | 71% |
| cs | Czech | Central Europe | false | 68% |
| sv | Swedish | Scandinavia | false | 65% |
| ar | Arabic | Middle East | true | 60% |
| he | Hebrew | Israel | true | 55% |
| tr | Turkish | Turkey | false | 52% |
| ru | Russian | CIS | false | 48% |
| ja | Japanese | Asia-Pacific | false | 45% |

| // Namespace: manifest manifest.load.status.boarding → 'Boarding' manifest.load.status.airborne → 'Airborne' manifest.load.status.landed → 'Landed'  // Namespace: safety safety.emergency.activation → 'EMERGENCY' safety.risk.level.low → 'Low Risk' safety.risk.decision.operations_normal → 'Operations Normal'  // Namespace: booking booking.price.dynamic_surge → 'Peak pricing applied' booking.ticket.bulk_discount → 'Buy {{count}} get {{free}} free'  // Plural forms logbook.entries.count → {one: '1 jump', few: '{{count}} jumps', many: '{{count}} jumps', other: '{{count}} jumps'} |
| --- |

| Namespace | Coverage | Key Count |
| --- | --- | --- |
| common | UI elements, buttons, errors | 127 |
| manifest | Load boards, manifesting, status | 89 |
| safety | Emergency, risk, protocols | 156 |
| booking | Pricing, tickets, slots, payment | 94 |
| training | AFF, skill tracking, licenses | 112 |
| gear | Equipment, rentals, maintenance | 67 |
| payments | Transactions, invoices, refunds | 81 |
| social | Posts, teams, followers, feed | 73 |
| notifications | Push, SMS, email templates | 108 |
| shop | Merchandise, ratings, reviews | 54 |
| emails | Transactional email bodies | 42 |
| landing | Website marketing copy | 89 |
| admin | DZ management, reporting | 103 |

| interface TranslationParams {   [key: string]: string | number; }  async function t(   key: string,   params?: TranslationParams,   namespace?: string ): Promise<string> {   // 1. Auto-detect namespace from route if not provided   if (!namespace) {     namespace = detectNamespaceFromRoute(getCurrentRoute());   }    // 2. Fetch translation from database or cache   const fullKey = `${namespace}.${key}`;   let translation = await getTranslationFromCache(fullKey, userLanguage);    if (!translation) {     // 3. Fallback chain: user language → DZ default language → English     translation = await getTranslationFromCache(fullKey, dzDefaultLanguage);     if (!translation) {       translation = await getTranslationFromCache(fullKey, 'en');     }   }    // 4. Interpolate variables {{firstName}}, {{count}}   if (params) {     for (const [key, value] of Object.entries(params)) {       translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), String(value));     }   }    // 5. Handle plural forms   if (params?.count !== undefined) {     const pluralForm = getPluralForm(userLanguage, params.count);     const pluralKey = `${fullKey}.${pluralForm}`;     translation = await getTranslationFromCache(pluralKey, userLanguage) || translation;   }    return translation; }  // Usage: const msg = await t('manifest.load.status.boarding'); // 'Boarding' const welcome = await t('common.welcome', { firstName: 'Sarah' }, 'common'); // 'Welcome, Sarah!' const jumps = await t('logbook.entries.count', { count: 42 }); // '42 jumps' |
| --- |

| Code | Currency | Regions | Exchange Rate (USD) |
| --- | --- | --- | --- |
| USD | US Dollar | US, Global | 1.00 |
| EUR | Euro | EU, Switzerland | 0.92 |
| GBP | British Pound | UK, Ireland | 0.79 |
| CHF | Swiss Franc | Switzerland | 0.88 |
| AUD | Australian Dollar | Australia, NZ | 1.51 |
| NZD | New Zealand Dollar | New Zealand | 1.65 |
| BRL | Brazilian Real | Brazil | 4.97 |
| ZAR | South African Rand | South Africa | 18.42 |
| AED | UAE Dirham | UAE | 3.67 |
| SAR | Saudi Riyal | Saudi Arabia | 3.75 |

| async function formatCurrency(   amountCents: number,   currencyCode: 'USD' | 'EUR' | 'GBP' | 'CHF' | 'AUD' | 'NZD' | 'BRL' | 'ZAR' | 'AED' | 'SAR' ): Promise<string> {   // 1. Fetch currency settings (symbol, decimal places, grouping)   const currencySettings = await getCurrencySettings(currencyCode);    // 2. Convert cents to major units (e.g., 15000 cents = 150.00)   const amountDecimal = amountCents / 100;    // 3. Format using locale formatter   const formatter = new Intl.NumberFormat(getCurrentLocale(), {     style: 'currency',     currency: currencyCode,     minimumFractionDigits: currencySettings.decimal_places,     maximumFractionDigits: currencySettings.decimal_places   });    return formatter.format(amountDecimal); }  // Examples: // formatCurrency(15000, 'USD') → '$150.00' // formatCurrency(15000, 'EUR') → '150,00 €' // formatCurrency(15000, 'BRL') → 'R$ 150,00' // formatCurrency(15000, 'SAR') → '150.00 ر.س' |
| --- |

| Field | Type | Values / Example |
| --- | --- | --- |
| dz_id | uuid pk | Dropzone identifier |
| default_language | string | en, es, fr, ... |
| supported_languages | JSON array | ["en", "es", "pt"] |
| default_currency | string | USD, EUR, BRL, ... |
| supported_currencies | JSON array | ["USD", "EUR", "BRL"] |
| weight_unit | enum | lbs | kg |
| altitude_unit | enum | ft | m |
| wind_speed_unit | enum | kts | mph | kmh | ms |
| temperature_unit | enum | F | C |
| date_format | enum | YYYY-MM-DD | DD/MM/YYYY | MM/DD/YYYY |
| time_format | enum | 12h | 24h |
| decimal_separator | string | . | , |
| thousands_separator | string | , | . |

| interface DZLocale {   altitude_unit: 'ft' | 'm';   weight_unit: 'lbs' | 'kg';   wind_speed_unit: 'kts' | 'mph' | 'kmh' | 'ms';   temperature_unit: 'F' | 'C';   date_format: string;   time_format: '12h' | '24h'; }  function formatAltitude(feet: number, locale: DZLocale): string {   if (locale.altitude_unit === 'ft') {     return `${feet.toLocaleString()} ft`;   } else {     const meters = feet * 0.3048;     return `${Math.round(meters).toLocaleString()} m`;   } }  function formatWindSpeed(knots: number, locale: DZLocale): string {   const unitMap = {     kts: { value: knots, label: 'kts' },     mph: { value: knots * 1.15078, label: 'mph' },     kmh: { value: knots * 1.85200, label: 'km/h' },     ms: { value: knots * 0.51444, label: 'm/s' }   };   const { value, label } = unitMap[locale.wind_speed_unit];   return `${Math.round(value)} ${label}`; }  // Examples: // formatAltitude(14000, {altitude_unit: 'ft'}) → '14,000 ft' // formatAltitude(14000, {altitude_unit: 'm'}) → '4,267 m' // formatWindSpeed(15, {wind_speed_unit: 'kts'}) → '15 kts' // formatWindSpeed(15, {wind_speed_unit: 'kmh'}) → '28 km/h' |
| --- |

| Template Type | Supported Languages | Example Key |
| --- | --- | --- |
| Push Notification | All 15 | notifications.push.currency_expired |
| SMS | All 15 (transliterated) | notifications.sms.off_landing_alert |
| Email (HTML) | All 15 (RTL for ar, he) | notifications.email.booking_confirmation |
| In-App Toast | All 15 | notifications.toast.manifest_success |

| State | Who | Action | Next State |
| --- | --- | --- | --- |
| draft | System (Claude API auto-translation) | Key translated via Haiku model | review |
| reviewed | Human translator (via admin UI) | Translation checked for accuracy/tone | approved or draft (rework) |
| approved | Language lead | Translation verified correct | published |
| published | System | Translation live in app | — |
| auto_translated | Claude API | Fallback for missing keys | (shown as draft if reworked) |

| async function autoTranslateNewKeys(   namespaceId: string,   newKeysEnglish: Array<{key: string; text: string}> ): Promise<void> {   const supportedLanguages = ['es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'cs', 'sv', 'ar', 'he', 'tr', 'ru', 'ja'];    for (const lang of supportedLanguages) {     for (const {key, text} of newKeysEnglish) {       // 1. Call Claude Haiku API for fast translation       const translation = await callClaudeHaikuAPI({         model: 'claude-3-5-haiku-20241022',         messages: [{           role: 'user',           content: `Translate this UI text to ${lang}. Keep it concise and natural. Return only the translation.`,           text: text         }]       });        // 2. Create draft translation record       await db.translations.create({         key: key,         language: lang,         namespace_id: namespaceId,         original_text: text,         translated_text: translation.trim(),         state: 'draft',         auto_translated: true,         created_at: new Date()       });     }   }      // 3. Notify language leads to review   const languageLeads = await getLanguageLeads();   for (const lead of languageLeads) {     await sendNotification(lead.user_id, {       title: 'Translation Review Needed',       body: `${newKeysEnglish.length} new keys in ${supportedLanguages.length} languages.`,       action_url: '/admin/translations/review'     });   } } |
| --- |

| async function optimizeLoadComposition(   loadId: string,   manifest: JumperManifest[],   aircraft: AircraftSpec ): Promise<LoadOptimization> {   const jumpers = manifest.map(m => ({     id: m.jumper_id,     weight: m.weight_lbs,     jump_type: m.jump_type, // AFF, tandems, tracking, freefly     exit_priority: m.exit_priority, // 1-8 (exit order)     experience_level: m.experience_level   }));    const cgAnalysis = calculateLoadCG(jumpers, aircraft);   const weatherImpact = analyzeWindEffect(     jumpers,     aircraft.cg_envelope   );    const prompt = ` Optimize this load composition: - Total weight: ${cgAnalysis.total_weight} lbs - Current CG: ${cgAnalysis.cg_position}% (envelope: ${aircraft.cg_min}-${aircraft.cg_max}%) - Wind: ${weatherImpact.wind_speed} kts, gust ${weatherImpact.gust_range} - Jumpers: ${JSON.stringify(jumpers)}  Suggest up to 3 reorderings that: 1. Keep CG within envelope with 5% safety margin 2. Maintain exit group integrity 3. Balance experience levels 4. Compensate for wind effects  For each reordering, explain the benefit (e.g., stability, exit efficiency).`;    const response = await anthropic.messages.create({     model: 'claude-3-5-sonnet-20241022',     max_tokens: 1024,     messages: [{ role: 'user', content: prompt }]   });    const suggestions = parseOptimizationResponse(response.content[0].text);   await logToAiInsights(loadId, 'load_optimization', suggestions);   return suggestions; } |
| --- |

| async function aiInstructorMatch(   studentId: string,   activityType: 'AFF' | 'Tandem' | 'Coaching',   dzId: string,   timeSlot: [Date, Date] ): Promise<RankedInstructor[]> {   const student = await getStudentProfile(studentId);   const instructors = await getAvailableInstructors(     dzId,     timeSlot,     activityType   );    const instructorProfiles = await Promise.all(     instructors.map(async (inst) => ({       id: inst.id,       name: inst.name,       certifications: inst.certifications,       languages: inst.languages,       rating: inst.avg_rating,       style: inst.teaching_style,       history: await getSessionHistory(studentId, inst.id),       current_load: inst.current_student_count,       timezone: inst.timezone     }))   );    const prompt = ` Rank these instructors for a student session: Student: ${student.name}, Level ${student.aff_level},  ${student.total_jumps} jumps, prefers ${student.teaching_style_pref} Activity: ${activityType} Languages: ${student.languages.join(', ')}  Candidates: ${instructorProfiles   .map(i => `   - ${i.name}: ${i.rating}/5, cert=${i.certifications.join(',')},      languages=${i.languages.join(',')}, load=${i.current_load}/4,      prior_sessions=${i.history.length}, avg_rating_from_this_student=     ${i.history.length > 0 ? (i.history.reduce((s,h)=>s+h.rating,0)/i.history.length).toFixed(1) : 'none'}`)   .join('\n')}  Rank top 3 with reasoning (50 words each). Focus on safety, student success, comfort.`;    const response = await anthropic.messages.create({     model: 'claude-3-5-haiku-20241022',     max_tokens: 512,     messages: [{ role: 'user', content: prompt }]   });    return parseInstructorRanking(response.content[0].text); } |
| --- |

| async function forecastDemand(   dzId: string,   startDate: Date,   days: number = 7 ): Promise<ForecastDay[]> {   // 1. Historical baseline   const historicalData = await db.query(     `SELECT DATE(jump_date) as date, COUNT(*) as jump_count,             DAYOFWEEK(jump_date) as day_of_week,             AVG(weather_wind_speed) as avg_wind,             AVG(weather_temp) as avg_temp      FROM jumps WHERE dz_id = ? AND jump_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)      GROUP BY DATE(jump_date)`,     [dzId]   );    const baselineByDayOfWeek = groupBy(historicalData, 'day_of_week');   const dayOfWeekAverage = mapValues(     baselineByDayOfWeek,     (days) => meanOf(days, 'jump_count')   );    // 2. Seasonal adjustment (4-week rolling average)   const seasonalIndex = calculateSeasonalIndex(     historicalData,     4 // weeks   );    // 3. Weather forecast impact   const weatherForecast = await fetchWeatherForecast(dzId, days);   const weatherSimilarity = weatherForecast.map(day =>     findMostSimilarHistoricalDay(       historicalData,       day.wind_speed,       day.temp,       day.precipitation     )   );    // 4. Generate forecast   const forecast = [];   for (let i = 0; i < days; i++) {     const date = addDays(startDate, i);     const dow = date.getDay();     const baseJumps = dayOfWeekAverage[dow];     const seasonalMult = seasonalIndex[getWeekOfYear(date)];     const weatherMult = weatherSimilarity[i].trend_adjustment;     const eventBoost = await checkForEvents(dzId, date);      const predicted = Math.round(       baseJumps * seasonalMult * weatherMult * eventBoost     );     const confidence = calculateConfidenceScore(       historicalData.length,       weatherForecast[i].confidence     );      const staffNeeds = estimateStaffing(       predicted,       dzId // based on typical loads per staff     );      forecast.push({       date,       predicted_jumps: predicted,       confidence,       weather_condition: weatherForecast[i],       ti_needed: staffNeeds.ti_count,       affi_needed: staffNeeds.affi_count,       tandem_master_needed: staffNeeds.tandem_count,       recommendation: generateStaffingRecommendation(staffNeeds)     });   }    // 5. AI narrative generation for anomalies   const anomalies = forecast.filter(f => f.confidence < 0.6 || f.predicted_jumps > dayOfWeekAverage[f.date.getDay()] * 1.5);   if (anomalies.length > 0) {     const aiInsight = await anthropic.messages.create({       model: 'claude-3-5-sonnet-20241022',       max_tokens: 256,       messages: [{         role: 'user',         content: `Explain these demand forecast anomalies in 1 sentence each: ${JSON.stringify(anomalies)}`       }]     });     forecast.anomaly_explanation = aiInsight.content[0].text;   }    await logToAiInsights(dzId, 'demand_forecast', forecast);   return forecast; } |
| --- |

| async function analyzeRiskTrends(dzId: string): Promise<SafetyAlert[]> {   const alerts: SafetyAlert[] = [];    // Wind trend analysis (last 3 hours, sample every 5 min)   const windSamples = await db.query(     `SELECT UNIX_TIMESTAMP(timestamp) as ts, wind_speed_kts      FROM weather_readings WHERE dz_id = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 3 HOUR)      ORDER BY timestamp DESC LIMIT 36`,     [dzId]   );    const windTrend = calculateTrend(windSamples);   if (windTrend.direction === 'UP' && windTrend.slope > 0.5) { // kts per 5min     const currentWind = windSamples[0].wind_speed_kts;     const studentLimit = 15; // configurable per DZ     const eta_minutes = (studentLimit - currentWind) / windTrend.slope / 12;      if (eta_minutes > 0 && eta_minutes < 45) {       alerts.push({         severity: 'WARNING',         type: 'wind_trend',         message: `Wind trending up: ${windSamples.slice(0,3).map(w=>w.wind_speed_kts).join('->')} kts. ` +                   `ETA ${Math.round(eta_minutes)} min to student limit (${studentLimit} kts).`,         action: 'Consider weather hold for AFF; continue tandems',         eta_minutes       });     }   }    // Hard landing pattern detection   const recentLandings = await db.query(     `SELECT landing_id, landing_quality, landed_at FROM landings      WHERE dz_id = ? AND landed_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)      ORDER BY landed_at DESC LIMIT 50`,     [dzId]   );    const hardLandings = recentLandings.filter(l => l.landing_quality === 'HARD');   if (hardLandings.length >= 3) {     const timespan = recentLandings[0].landed_at - recentLandings[hardLandings.length-1].landed_at;     if (timespan < 2 * 60 * 60 * 1000) { // within 2 hours       alerts.push({         severity: 'CAUTION',         type: 'landing_pattern',         message: `${hardLandings.length} hard landings in last 2 hours. Check landing area conditions.`,         action: 'Inspect landing zone (soft areas, obstacles, crosswind)',         landing_ids: hardLandings.map(l => l.landing_id)       });     }   }    // Equipment checks   const equipmentIssues = await db.query(     `SELECT equipment_id, issue_type, dz_id FROM equipment      WHERE dz_id = ? AND (        maintenance_due_date < NOW() OR        aad_battery_date < DATE_SUB(NOW(), INTERVAL 12 MONTH) OR        reserve_pack_date < DATE_SUB(NOW(), INTERVAL 12 MONTH)      )`,     [dzId]   );    equipmentIssues.forEach(eq => {     alerts.push({       severity: 'CRITICAL',       type: 'equipment_maintenance',       message: `Equipment ${eq.equipment_id} issue: ${eq.issue_type}`,       action: 'Ground equipment immediately',       equipment_id: eq.equipment_id     });   });    return alerts; } |
| --- |

| Metric | Formula | Target | Alert Threshold |
| --- | --- | --- | --- |
| Revenue per Load | total_revenue / total_loads | $650+ | < $500 |
| Fill Rate | slots_filled / slots_offered | > 85% | < 60% |
| Instructor Utilization | student_hours / available_hours | > 70% | < 40% |
| No-Show Rate | no_shows / total_bookings | < 5% | > 10% |
| Student Conversion | new_aff_students / inquiries | > 15% | < 8% |
| Churn Rate | inactive_30d / active_students | < 8% | > 15% |

| async function generateInsights(   dzId: string,   period: 'daily' | 'weekly' | 'monthly' ): Promise<InsightReport> {   const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;   const now = new Date();   const startDate = subDays(now, days);    // Collect metrics   const metrics = await Promise.all([     calculateRevenueMetrics(dzId, startDate, now),     calculateOperationalMetrics(dzId, startDate, now),     calculateStudentMetrics(dzId, startDate, now),     getHistoricalComparison(dzId, period)   ]);    const [revenue, operations, students, history] = metrics;    // Detect anomalies   const anomalies = [];   if (revenue.per_load < revenue.historical_avg * 0.75) {     anomalies.push({       type: 'revenue_drop',       severity: 'high',       value: Math.round((1 - revenue.per_load / revenue.historical_avg) * 100)     });   }    if (operations.no_show_rate > 0.10) {     anomalies.push({       type: 'high_no_show',       severity: 'high',       count: operations.no_show_count     });   }    if (students.churn_rate > 0.15) {     anomalies.push({       type: 'student_churn',       severity: 'medium',       rate: Math.round(students.churn_rate * 100)     });   }    // Generate AI narrative   const narrativePrompt = ` Generate a short (3-4 sentence) insights report for a DZ operator. Period: ${period}. Metrics: ${JSON.stringify({ revenue, operations, students })} Anomalies detected: ${JSON.stringify(anomalies)} Historical comparison: ${JSON.stringify(history)}  Include: 1 positive highlight, 1 area of concern, 1 specific recommendation.`;    const narrative = await anthropic.messages.create({     model: 'claude-3-5-sonnet-20241022',     max_tokens: 256,     messages: [{ role: 'user', content: narrativePrompt }]   });    const report: InsightReport = {     dz_id: dzId,     period,     generated_at: new Date(),     metrics,     anomalies,     narrative: narrative.content[0].text,     recommendations: generateRecommendations(anomalies, revenue, operations)   };    await db.insert('ai_insights', report);   return report; } |
| --- |

| Component | Purpose | Config |
| --- | --- | --- |
| Request Queue | Buffer API calls, respect rate limits | 60 RPM Sonnet, 300 RPM Haiku |
| Cache Layer (Redis) | Store identical prompt responses | TTL 1 hour, key = hash(model + prompt) |
| Fallback Logic | Rule-based defaults if API down | Use historical averages, simple heuristics |
| Cost Tracking | Monitor token usage per DZ | Monthly budget limits, alerts |
| Logging | Audit trail for all AI decisions | ai_insights table: model, tokens, latency |

| class AIServiceClient {   private requestQueue: PQueue;   private cache: Redis;    constructor() {     this.requestQueue = new PQueue({       concurrency: 1,       interval: 60000, // 1 minute       intervalCap: 60 // Sonnet rate limit     });     this.cache = new Redis();   }    async callClaude(     model: 'sonnet' | 'haiku',     prompt: string,     maxTokens: number = 512   ): Promise<string> {     const cacheKey = `ai:${model}:${hash(prompt)}`;     const cached = await this.cache.get(cacheKey);     if (cached) return cached;      try {       const response = await this.requestQueue.add(() =>         anthropic.messages.create({           model: model === 'sonnet' ? 'claude-3-5-sonnet-20241022' : 'claude-3-5-haiku-20241022',           max_tokens: maxTokens,           messages: [{ role: 'user', content: prompt }]         })       );        const content = response.content[0].type === 'text' ? response.content[0].text : '';       await this.cache.setex(cacheKey, 3600, content); // 1 hour TTL       return content;     } catch (error) {       console.error('AI API error:', error);       return this.fallbackResponse(prompt);     }   }    private fallbackResponse(prompt: string): string {     // Rule-based defaults when API is down     if (prompt.includes('optimize')) return 'No changes recommended';     if (prompt.includes('forecast')) return '{ predictedJumps: 42, confidence: 0.5 }';     return 'Service temporarily unavailable. Check console.';   } } |
| --- |

| Widget | Refresh Rate | Data Source | Height |
| --- | --- | --- | --- |
| Revenue Chart (7-day) | 60s | REST /api/revenue | 250px |
| Load Board (live) | real-time (WebSocket) | WS /operations | 600px |
| Aircraft Status | 15s | REST /api/aircraft | 200px |
| Staff Utilization | 30s | REST /api/staff | 180px |
| AI Insights Panel | 5min | REST /api/ai-insights | 300px |
| Safety Alerts | real-time (WebSocket) | WS /safety | 200px |

| interface LoadCard {   id: string;   aircraft: string; // 'Casa 1000' | 'King Air'   altitude: number; // 10000, 13000, etc.   call_time: Date;   status: FSMState; // FORMING, MANIFESTED, BOARDING, AIRBORNE, LANDED   slots: {     filled: number;     total: number;     manifest: {       jumper_id: string;       name: string;       exit_order: number;       jump_type: 'AFF' | 'Tandem' | 'Coach' | 'Tracking' | 'Freefly';     }[];   };   cg_status: {     current_percent: number;     min_percent: number;     max_percent: number;     color: 'green' | 'yellow' | 'red'; // red = out of envelope   };   waitlist: {     count: number;     first_claim_time: Date;   };   instructor_assignments: {     role: 'Jump Master' | 'Videographer' | 'Reserve Master';     instructor_id: string;     name: string;   }[]; }  // Drag-drop zone: drag jumper from search results onto load card // CG auto-recalculates on drop // Waitlist claim countdown: 2min timeout if not claimed |
| --- |

| const loadBoardSocket = new WebSocket('wss://api.skylara.local/operations');  loadBoardSocket.onmessage = (event) => {   const update = JSON.parse(event.data);   switch (update.type) {     case 'load_manifested':       // Jumper just checked in; update UI immediately       updateLoadCard(update.load_id, { slots: update.new_slots });       playSound('manifest-checkin');       break;      case 'cg_changed':       // Reordering triggered; update CG bar color       updateCGIndicator(update.load_id, update.cg_percent, update.color);       break;      case 'waitlist_claimed':       // Top waitlist jumper claimed slot       removeFromWaitlist(update.load_id, update.jumper_id);       break;      case 'load_status_change':       // Load transitioned (FORMING → MANIFESTED → BOARDING → AIRBORNE)       flashLoadCard(update.load_id);       if (update.new_status === 'AIRBORNE') {         startCallCountdown(update.load_id);       }       break;   } }; |
| --- |

| // Accept booking request POST /api/instructor/{instructorId}/bookings/{bookingId}/accept Response: { assigned_load_id, call_time, student_name }  // Decline with reason POST /api/instructor/{instructorId}/bookings/{bookingId}/decline Body: { reason: 'Fully booked' | 'Wrong certification' | 'Personal' }  // Log coaching notes post-session POST /api/instructor/{instructorId}/sessions/{sessionId}/notes Body: { notes: string, rating_of_student: 1-5, recommendations: string[] }  // Toggle availability today PUT /api/instructor/{instructorId}/availability Body: { available_today: false, reason: 'Medical appointment' } |
| --- |

| Section | Content | Purpose |
| --- | --- | --- |
| My Jumps | Total count, recent 5 jumps (date, altitude, location) | Quick stat check |
| Next Load | Manifested load with countdown, exit group, CG status | What's today's action |
| Currency Status | Green/yellow/red by jump type (AFF, Tandem, etc.) | Qualification awareness |
| Profile Card | License level, home DZ, story tagline, jump type preference | Identity + preferences |
| Achievements | Miles flown, 100-jump milestone, instructor ratings, specialties earned | Gamification & progress |
| Activity Feed | Friends' jumps, friend requests, local DZ events | Social engagement |

| // 1. Click 'Self-Manifest' button // 2. Select jump type (AFF, Tandem, Coaching, Freefly, Tracking) // 3. Pick altitude (10k, 13k, 15k default based on cert level) // 4. Choose load from available slots (live-updating list) // 5. Confirm (auto-deduct from wallet or charge card on file) // 6. Receive confirmation: load ID, call time, CG status  // Backend: manifested event emitted to load_board subscribers // FE: load card updates immediately (no page reload) |
| --- |

| Widget | Metric | Alert Threshold |
| --- | --- | --- |
| DZ Map | Total active DZs, green=operational/red=issue | Any DZ offline >30min |
| Revenue Chart | Daily platform revenue (subs + transaction fees) | MoM growth < 5% |
| API Health | Latency (p95), error rate, WebSocket connections | Latency >500ms, error >1% |
| Onboarding Queue | New DZ applications, subscription tier, status | No action >7 days |
| Compliance | Expired certifications, overdue safety reports, staff credentials | Any red items |
| Feature Flags | Toggle experimental features, version rollout % | Manual or automated A/B test |

| interface Widget {   id: string; // 'revenue-chart', 'load-board', etc.   type: 'chart' | 'table' | 'list' | 'card' | 'grid';   title: string;   dataSource: DataSource;   config: {     refreshInterval?: number; // milliseconds     maxItems?: number;     sortBy?: string;     filters?: Record<string, any>;   };   layout: {     x: number; // 12-column grid, 0-11     y: number;     w: number; // 1-12 columns     h: number; // height in grid units   };   isPinned?: boolean; }  interface DataSource {   type: 'rest' | 'websocket' | 'ai-service' | 'cache';   endpoint: string;   query?: Record<string, any>;   transformFn?: (data: any) => any; }  // Data source refresh strategies const REFRESH_RATES = {   real_time: 0, // WebSocket push   fast: 5000, // 5 seconds (load board)   normal: 30000, // 30 seconds (staff utilization)   slow: 60000, // 1 minute (metrics)   ai_insights: 300000 // 5 minutes }; |
| --- |

| // User can reorder widgets, pin favorites // Saved to user_dashboard_config table  interface DashboardState {   role: 'dz_operator' | 'manifest_staff' | 'instructor' | 'athlete' | 'admin';   dz_id: string;   widgets: Widget[];   theme: 'light' | 'dark';   layout: 'grid' | 'list'; // mobile falls back to list }  // Save every 5 seconds or on explicit save async function saveDashboardState(state: DashboardState) {   await db.upsert('user_dashboard_config', {     user_id: currentUser.id,     dz_id: state.dz_id,     config: state,     updated_at: new Date()   }); } |
| --- |

| Capability | PWA | React Native (Expo) | Winner |
| --- | --- | --- | --- |
| Push Notifications (iOS) | Unreliable, requires workarounds | Native, always works | React Native |
| Background GPS | Limited to geofencing | Full background tracking | React Native |
| Offline Support | Service Workers (limited) | WatermelonDB (full sync) | React Native |
| Codebase Sharing | None (PWA is web-only) | TypeScript services shared | React Native |
| Build/Deploy | Web deploy only | Expo (OTA + EAS Build) | React Native |
| App Store Presence | Web-only, no icon | iOS + Android app stores | React Native |
| Development Speed | Single codebase | Slightly slower CI/CD | PWA (marginal) |

| mobile/ ├── app/ (Expo Router, file-based routing) │   ├── (auth)/ (onboarding, login) │   ├── (app)/ (authenticated screens) │   │   ├── manifest/ (staff load board) │   │   ├── checkin/ (athlete self-manifest) │   │   ├── instructor/ (bookings, schedule) │   │   ├── athlete/ (logbook, next load) │   │   ├── safety/ (emergency, incident report) │   │   └── settings/ (notifications, availability) │   └── _layout.tsx (root navigator, auth gate) ├── src/ │   ├── components/ (reusable UI: LoadCard, Jumper, Instructor) │   ├── stores/ (Zustand: auth, loads, aircraft, cache) │   ├── services/ (API client, tRPC hooks, location service) │   ├── db/ (WatermelonDB schema, migrations) │   ├── utils/ (formatting, validation, offline detection) │   └── constants/ (colors, spacing, API endpoints) └── eas.json (Expo build config) |
| --- |

| // store/useAuthStore.ts (Zustand) export const useAuthStore = create<AuthState>((set) => ({   user: null,   isAuthenticated: false,   login: async (email, password) => { /* ... */ },   logout: () => set({ user: null }),   hydrate: async () => {     const saved = await mmkv.getItem('user');     if (saved) set({ user: JSON.parse(saved) });   } }));  // services/trpc.ts (type-safe API) export const trpc = createTRPCReact<AppRouter>();  // Usage: const manifests = trpc.loads.getToday.useQuery(undefined, {   staleTime: 30000,   gcTime: 5 * 60000, // React Query cache   retry: 2 });  // hooks/useOfflineDetection.ts export function useOfflineDetection() {   const [isOnline, setIsOnline] = useState(true);   useEffect(() => {     const subscription = NetInfo.addEventListener(({ isConnected }) => {       setIsOnline(isConnected ?? false);     });     return () => subscription?.unsubscribe();   }, []);   return isOnline; } |
| --- |

| interface SyncStrategy {   table: string;   priority: 'critical' | 'high' | 'normal';   localDB: 'watermelon' | 'mmkv';   conflict_resolution: 'server_wins' | 'last_write_wins' | 'merge';   sync_interval_sec: number;   pull_on_open: boolean; }  const SYNC_CONFIG: SyncStrategy[] = [   {     table: 'emergency_profiles',     priority: 'critical',     localDB: 'watermelon',     conflict_resolution: 'server_wins',     sync_interval_sec: 3600,     pull_on_open: true   },   {     table: 'athlete_profiles',     priority: 'high',     localDB: 'watermelon',     conflict_resolution: 'server_wins',     sync_interval_sec: 300,     pull_on_open: true   },   {     table: 'loads_active',     priority: 'high',     localDB: 'watermelon',     conflict_resolution: 'server_wins', // manifesting is server-of-truth     sync_interval_sec: 10,     pull_on_open: true   },   {     table: 'logbook_entries',     priority: 'normal',     localDB: 'watermelon',     conflict_resolution: 'last_write_wins',     sync_interval_sec: 30,     pull_on_open: false   },   {     table: 'coaching_notes',     priority: 'normal',     localDB: 'mmkv',     conflict_resolution: 'merge',     sync_interval_sec: 60,     pull_on_open: false   } ];  // Sync engine async function syncDatabase() {   const isOnline = await NetInfo.fetch().then(s => s.isConnected);   if (!isOnline) return;    for (const config of SYNC_CONFIG) {     // Pull: get server latest     const serverData = await trpc.sync[config.table].query();     const localData = await database       .get(config.table)       .query()       .fetch();      // Conflict resolution     const merged = resolveConflicts(       localData,       serverData,       config.conflict_resolution     );      // Write merged to local DB     await database.write(async () => {       for (const record of merged) {         await record.update();       }     });      // Push: send local changes to server     const changes = await getLocalChanges(config.table);     await trpc.sync[config.table].mutate(changes);   } } |
| --- |

| Channel | Trigger | Priority | User Opt-Out | Rich Actions |
| --- | --- | --- | --- | --- |
| load_calls | Load approaching call time (30/20/10 min) | high | Per DZ | View Load, Check In, Dismiss |
| booking_requests | Instructor booking from athlete | high | Global | Accept (1-tap), Decline, View |
| safety_alerts | Weather hold, incident, equipment issue | critical | N/A (always on) | View Alert, Acknowledge |
| social | Friend activity, message, event nearby | normal | Global | View, Reply |
| marketing | New features, event promo, offer | low | Global | View, Dismiss |

| // services/notificationService.ts import * as Notifications from 'expo-notifications';  export async function initNotifications() {   // Request permission (iOS)   const { status } = await Notifications.requestPermissionsAsync();   if (status !== 'granted') {     console.warn('Notification permission denied');     return;   }    // Listen to foreground notifications   Notifications.addNotificationResponseListener((response) => {     const { channel, data } = response.notification.request.content;     switch (channel) {       case 'load_calls':         navigation.navigate('LoadDetail', { loadId: data.load_id });         break;       case 'booking_requests':         navigation.navigate('Bookings', { requestId: data.booking_id });         break;       case 'safety_alerts':         navigation.navigate('Safety', { alertId: data.alert_id });         break;     }   });    // Silent background notifications for sync   Notifications.addNotificationResponseListener(async (response) => {     if (response.notification.request.content.data.type === 'silent_sync') {       await syncDatabase();     }   }); } |
| --- |

| export class LocationService {   private taskName = 'background-location-task';   private dzGeofences: Map<string, Geofence> = new Map();    async startBackgroundTracking(loadId: string, dzId: string) {     if (!__DEV__) {       // Production: request always-on location permission       await requestAlwaysLocationPermission();     }      const dzLocation = await getDZCoordinates(dzId);     this.dzGeofences.set(dzId, {       latitude: dzLocation.lat,       longitude: dzLocation.lng,       radius: 500 // meters     });      // Start background task (runs even when app killed)     await TaskManager.defineTask(this.taskName, async (task) => {       if (task.eventCount === 0) return;        const { locations } = task.data;       const lastLocation = locations[locations.length - 1];        // Check: still in geofence (landed in DZ)?       const distanceToDZ = calculateDistance(         lastLocation.coords,         dzLocation       );        if (distanceToDZ > 500) {         // Off-landing detected!         await reportOffLanding(loadId, lastLocation);         await Notifications.scheduleNotificationAsync({           content: {             title: 'Off-Landing Alert',             body: `Landed ${Math.round(distanceToDZ)}m from DZ. Report location?`,             data: { type: 'off_landing', load_id: loadId }           },           trigger: null // immediate         });       }        // Save to local logbook       await saveLocationTrace(loadId, locations);     });      // Start location updates: 10s interval while AIRBORNE, GPS accuracy 20m     await Location.startLocationUpdatesAsync(this.taskName, {       accuracy: Location.Accuracy.High,       timeInterval: 10000,       distanceInterval: 5, // meters       pausesUpdatesAutomatically: false,       foregroundService: {         notificationTitle: 'Jump in Progress',         notificationBody: 'Tracking your jump...'       }     });   }    async stopBackgroundTracking() {     await Location.stopLocationUpdatesAsync(this.taskName);   } |
| --- |

| Principle | Implementation | Example |
| --- | --- | --- |
| High Contrast | Dark text on light, light text on dark; avoid grays | Load status: green=go, red=wait |
| Large Touch Targets | 48px minimum (Apple HIG), safer in motion | Check-in button spans bottom 20% |
| Glove-Friendly | No precision gestures; swipe > tap | Swipe left to decline booking |
| One-Handed Thumb Reach | Critical actions in bottom half | Manifest button at bottom-center |
| Dark Mode | Default (save battery), toggle in settings | Reduces OLED power by 40% |
| Minimal Animations | No fades; instant state changes | Load status flip instantly |
| Offline Indicator | Always visible (top or bottom) | Green/yellow/red with time |
| Battery Conscious | GPS off except AIRBORNE, 30s WebSocket heartbeat | Estimated drain: 5% per hour |

| Role | Primary Tab | Key Features | Offline Needs | Primary Gesture |
| --- | --- | --- | --- | --- |
| Manifest Staff | Load Board | Search jumper, drag to load, CG bar | Load manifest, slot availability | Swipe to edit, long-press for options |
| Instructor | Schedule | Today's jobs, student info, confirm, rate | Schedule, student history, previous notes | Tap to accept booking, swipe to decline |
| Athlete | Next Load | Load countdown, altitude, exit group | Logbook, load manifest, profile | Double-tap to manifest, swipe for more info |
| Pilot | Manifest | Passenger list, weight, CG status, call time | Manifest, aircraft limits, emergency profiles | Tap to see full manifest, scroll for CG chart |

| // screens/manifest/LoadBoard.tsx export function LoadBoardScreen() {   const loads = trpc.loads.getActive.useQuery();   const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);    return (     <SafeAreaView style={styles.container}>       {/* Search bar: full width, glove-friendly */}       <TextInput         placeholder='Search jumper or load'         style={styles.searchInput}         placeholderTextColor='#888'       />        {/* Load list: each card takes full width */}       <FlashList         data={loads.data || []}         renderItem={({ item: load }) => (           <LoadCard             load={load}             isSelected={selectedLoadId === load.id}             onPress={() => setSelectedLoadId(load.id)}           />         )}         estimatedItemSize={120}         showsVerticalScrollIndicator={false}       />        {/* Detail panel (if selected) */}       {selectedLoadId && (         <LoadDetailPanel loadId={selectedLoadId} />       )}     </SafeAreaView>   ); }  // Component: LoadCard function LoadCard({ load, onPress }: Props) {   return (     <Pressable       onPress={onPress}       style={({ pressed }) => ({         ...styles.card,         opacity: pressed ? 0.8 : 1       })}     >       <View style={styles.cardRow}>         <Text style={styles.large}>{load.aircraft} @ {load.altitude}ft</Text>         <Text style={[           styles.status,           { color: getStatusColor(load.status) }         ]}>{load.status}</Text>       </View>        <View style={styles.cardRow}>         <Text style={styles.medium}>           {load.slots.filled}/{load.slots.total} | Call in {getCallCountdown(load.call_time)}         </Text>       </View>        {/* CG bar: visual feedback */}       <View style={styles.cgContainer}>         <View           style={{             height: 8,             backgroundColor: load.cg_status.color,             width: `${load.cg_status.current_percent}%`           }}         />       </View>     </Pressable>   ); } |
| --- |

| // screens/athlete/SelfManifest.tsx export function SelfManifestFlow() {   const [step, setStep] = useState<'jump_type' | 'altitude' | 'load' | 'confirm'>('jump_type');   const [selectedJumpType, setSelectedJumpType] = useState<string | null>(null);   const [selectedAltitude, setSelectedAltitude] = useState<number>(13000);   const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);    const manifestMutation = trpc.manifest.create.useMutation({     onSuccess: (result) => {       showAlert('Manifested!', `Load ${result.load_id}, call time ${result.call_time}`);       navigation.goBack();     }   });    return (     <SafeAreaView style={styles.container}>       {step === 'jump_type' && (         <>           <Text style={styles.title}>Select Jump Type</Text>           <View style={styles.buttonGrid}>             {['AFF', 'Tandem', 'Coaching'].map((type) => (               <Pressable                 key={type}                 onPress={() => {                   setSelectedJumpType(type);                   setStep('altitude');                 }}                 style={styles.largeButton}               >                 <Text style={styles.buttonText}>{type}</Text>               </Pressable>             ))}           </View>         </>       )}        {step === 'altitude' && (         <>           <Text style={styles.title}>Altitude</Text>           <Picker             selectedValue={selectedAltitude}             onValueChange={setSelectedAltitude}             style={styles.picker}           >             <Picker.Item label='10,000 ft' value={10000} />             <Picker.Item label='13,000 ft (Default)' value={13000} />             <Picker.Item label='15,000 ft' value={15000} />           </Picker>           <Pressable             onPress={() => setStep('load')}             style={styles.largeButton}           >             <Text style={styles.buttonText}>Next</Text>           </Pressable>         </>       )}        {step === 'load' && (         <>           <Text style={styles.title}>Choose Load</Text>           <FlatList             data={loads}             keyExtractor={(l) => l.id}             renderItem={({ item }) => (               <Pressable                 onPress={() => {                   setSelectedLoadId(item.id);                   setStep('confirm');                 }}                 style={styles.loadOption}               >                 <Text>{item.aircraft} @ {item.altitude}ft | Call {getCallCountdown(item.call_time)}</Text>                 <Text>{item.slots.filled}/{item.slots.total} slots</Text>               </Pressable>             )}           />         </>       )}        {step === 'confirm' && selectedLoadId && (         <>           <Text style={styles.title}>Confirm Manifest</Text>           <Text style={styles.summary}>             {selectedJumpType} @ {selectedAltitude}ft{newline}             Load {selectedLoadId}{newline}             Cost: $25           </Text>           <Pressable             onPress={() => manifestMutation.mutate({               load_id: selectedLoadId,               jump_type: selectedJumpType,               altitude: selectedAltitude             })}             style={styles.confirmButton}             disabled={manifestMutation.isPending}           >             <Text style={styles.buttonText}>               {manifestMutation.isPending ? 'Manifesting...' : 'Confirm Manifest'}             </Text>           </Pressable>         </>       )}     </SafeAreaView>   ); } |
| --- |