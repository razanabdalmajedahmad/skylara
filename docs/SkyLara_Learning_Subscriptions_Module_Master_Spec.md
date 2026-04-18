# SkyLara Learning, Subscriptions, Credentials, and Event Credibility Master Spec

## Purpose
This is the single replacement file for the SkyLara learning module.

It replaces older or partial learning-related docs with one consolidated implementation specification covering dashboard, web, PWA, mobile app, centralized SkyLara identity, tenant-aware dropzone configuration, free and paid learning, secure video delivery, subscriptions and entitlements, certificates and digital credentials, camps and boogies participation records, profile credibility, recommendations, APIs, dashboard flows, learner flows, CI/CD rules, and a Claude Code implementation prompt.

This file must be treated as the current source of truth for the learning and subscriptions module.

---

## 1. Canonical product position
SkyLara Learning is not a generic LMS. It is a skydiving-first learning, subscriptions, attendance, and credibility system built on top of the existing SkyLara platform.

It must:
- deliver structured learning to skydivers, instructors, organizers, pilots, riggers, and staff
- support free and paid access
- work across dashboard, web, PWA, and mobile app
- issue certificates and verifiable achievements
- track course, camp, and boogie participation
- strengthen profile credibility
- recommend useful content based on role, interests, progression, and activity
- stay aligned to the existing SkyLara modular monolith, shared auth, shared profile graph, and shared API truth

This module must not introduce a separate platform architecture that conflicts with the rest of SkyLara.

---

## 2. Architecture decision

### 2.1 Platform architecture
Keep SkyLara Learning inside the existing SkyLara V1 architecture:
- modular monolith
- shared auth
- shared roles and permissions
- shared identity graph
- shared notification system
- shared event bus
- shared analytics
- shared API layer for dashboard, web, PWA, and mobile

### 2.2 Headless content model
Use a headless-content pattern inside the existing SkyLara backend:
- learning content is managed as structured content objects
- dashboard is the admin authoring surface
- app/web/mobile are delivery surfaces
- APIs expose learning data to all clients
- content rendering remains flexible without creating a separate product stack

### 2.3 One backend truth
Rules for content access, paid entitlement, completion, certificates, event attendance, and profile visibility must all live in the same backend truth shared across all clients.

---

## 3. Core module goals

### 3.1 Learning delivery
- video lessons
- text lessons
- PDFs and attachments
- quizzes
- checklists
- safety briefs
- coaching packs
- event prep packs
- webinar replays
- livestream replay access
- tips and micro-content

### 3.2 Monetization
- free access
- paid subscriptions
- one-time course purchases
- event-linked access
- DZ-sponsored access
- gifted access
- internal staff learning access

### 3.3 Credibility
- course completions
- attendance records
- certificates
- learning achievements
- event participation history
- visible credibility records on profile

### 3.4 Personalization
- recommendations by interest
- recommendations by role
- recommendations by completed content
- recommendations by camp / boogie participation
- prerequisite-aware next-step recommendations

---

## 4. Access model

### 4.1 Access types
Each learning asset must support:
- PUBLIC
- AUTHENTICATED_FREE
- SUBSCRIBER_ONLY
- COURSE_PURCHASE_ONLY
- EVENT_PASS_ONLY
- INTERNAL_DZ_ONLY
- INVITE_ONLY
- ORGANIZATION_ONLY

### 4.2 User types
- guest
- registered free user
- paid subscriber
- purchaser
- invited learner
- DZ staff
- instructor
- admin
- content manager

### 4.3 Important rule
Public teaser content is allowed. Premium structured training must use protected access and entitlement checks.

---

## 5. Video platform decision

### 5.1 Final recommendation
Use **Mux** as the default protected premium-learning video delivery platform.

### 5.2 Approved alternatives
Allow:
- **Cloudflare Stream** as an alternative infrastructure option
- **AWS S3 + CloudFront + signed delivery** for advanced custom deployments

### 5.3 Public marketing layer
Use **YouTube** only for:
- teaser content
- public highlights
- promo or trailer videos
- public explainers

Do not use YouTube as the main premium learning backend.

### 5.4 Product rule
Video assets must support:
- authenticated playback
- entitlement-gated access
- signed playback or secure token access
- adaptive streaming
- mobile compatibility
- optional offline save strategy at the app layer where allowed

---

## 6. Subscription and entitlement model

### 6.1 Tiers
#### Free
Access to selected tips, beginner safety content, teaser lessons, public camp and boogie highlight content, and limited profile learning visibility.

#### Pro Learning
Access to premium courses, advanced lesson library, quizzes, certificates, saved content, profile badges, advanced discipline tracks, and premium replay content.

#### Team / DZ Learning
Access for staff, instructors, internal onboarding, required compliance learning, organization-assigned content, and internal certifications.

#### Event Pass
Access linked to camp, boogie, workshop, webinar, event prep, or replay pack.

### 6.2 Purchase models
Support:
- monthly subscription
- annual subscription
- one-time purchase
- event bundle
- role-specific bundle
- coupon or promo code
- gifted access
- DZ-sponsored access

### 6.3 Cross-platform entitlement rule
Web and mobile access must remain synchronized. Use one central entitlement truth that can map direct web billing, app-store billing, play-store billing, sponsor-granted access, and event-granted access.

---

## 7. Subscription infrastructure recommendation

### 7.1 Recommended payment / entitlement stack
- Stripe Billing for web subscriptions and direct payments
- RevenueCat for mobile subscription entitlement orchestration if native mobile in-app purchases are used
- SkyLara entitlement tables for final access truth

### 7.2 Product rule
External billing providers may process billing, but SkyLara must store the final access state used by dashboard, app, web, recommendation engine, certificates, and profile visibility.

---

## 8. Learning content model

### 8.1 Content entities
Support:
- course
- module
- lesson
- tip
- checklist
- quiz
- guide
- webinar
- camp prep pack
- boogie prep pack
- replay pack
- coaching pack
- event briefing
- event recap
- certificate course
- attendance-only content record

### 8.2 Discipline and role tagging
Each asset should be taggable by:
- discipline
- user level
- role
- location relevance
- event relation
- skill track
- language
- safety importance
- recommendation segment

### 8.3 Example taxonomy
Disciplines:
- AFF
- tandem
- freefly
- angle
- tracking
- canopy
- wingsuit
- CRW
- tunnel
- rigging basics
- pilot awareness
- DZ operations
- safety and emergency procedures

Roles:
- athlete
- student
- instructor
- AFFI
- tandem instructor
- chief instructor
- coach
- rigger
- pilot
- DZ manager
- organizer

---

## 9. Learning path and progression model

### 9.1 Learning path support
Support beginner learning paths, instructor training paths, canopy tracks, tunnel progression tracks, event prep paths, safety refresher paths, and DZ staff onboarding paths.

### 9.2 Important rule
Do not equate platform learning completion with legal or governing-body qualification by default.

Separate:
- learning completion
- attendance
- internal badge
- internal certification
- official operational qualification
- governing-body credential

### 9.3 Prerequisite logic
Lessons and courses should support prerequisites, recommended next lessons, role gating, experience gating, subscription gating, and event participation gating.

---

## 10. Camps and boogies integration

### 10.1 Why this matters
Camps and boogies should improve credibility, not disappear after registration.

### 10.2 Event-linked learning
Each camp or boogie may include:
- prep content
- required briefings
- organizer videos
- replay library
- attendance verification
- post-event recommendations
- event certificate or badge

### 10.3 Profile impact
User profiles may show joined camp, attended boogie, verified attendance, follow-up learning path, and associated achievement or certificate.

### 10.4 Attendance states
- REGISTERED
- CHECKED_IN
- ATTENDED
- VERIFIED_ATTENDED
- NO_SHOW
- CANCELLED

### 10.5 Verification
Attendance may be verified by QR check-in, admin check-in, organizer verification, instructor verification, or linked event system verification.

---

## 11. Credibility and profile system

### 11.1 Profile artifacts to support
A user profile can show:
- completed courses
- certificates
- badges
- camps joined
- boogies joined
- verified attendance
- learning milestones
- role-specific learning records
- optional public credibility portfolio

### 11.2 Visibility controls
Each record supports:
- PUBLIC
- PLATFORM_ONLY
- DZ_ONLY
- PRIVATE

### 11.3 Credibility stack examples
#### Athlete
- canopy courses completed
- tunnel progression content
- camp participation
- boogie attendance
- safety refreshers

#### Instructor
- teaching modules
- evaluation modules
- staff onboarding
- event organizing participation
- internal credibility badges

#### Organizer or coach
- organizer briefings completed
- event attendance history
- camp teaching participation
- specialty track completions

---

## 12. Certificates and verifiable credentials

### 12.1 Certificate support
Support:
- branded PDF certificates
- completion certificates
- attendance certificates
- internal credentials
- badge-style achievements
- verification links or codes
- optional revocation
- issue by rule or manually

### 12.2 Stronger credential direction
The system should be designed to support:
- Open Badges-style metadata
- issuer details
- subject details
- evidence references
- verification code
- issue timestamp
- credential status

### 12.3 Credential types
- COURSE_COMPLETION
- QUIZ_PASS
- ATTENDANCE_CERTIFICATE
- INTERNAL_SKILL_BADGE
- STAFF_ONBOARDING_CERTIFICATE
- EVENT_PARTICIPATION_BADGE
- LEARNING_PATH_COMPLETION

### 12.4 Important rule
Certificates and badges may improve credibility but must not falsely imply official legal authorization unless explicitly verified and supported by the governing or operational authority.

---

## 13. Recommendation engine

### 13.1 Recommendation sources
Recommend content using:
- selected interests
- role
- discipline
- level
- course history
- viewing history
- camp or boogie history
- subscription tier
- saved content
- current location or DZ context
- prerequisite state
- event participation

### 13.2 Recommendation types
- because you watched
- because you joined this camp
- because you are an AFFI
- because your DZ assigned this
- continue path
- next best lesson
- event follow-up
- safety refresher due
- trending in your discipline

### 13.3 Recommendation engine maturity
#### Phase 1
- rules-based recommendations
- tag matching
- role matching
- prerequisite checks
- event-linked recommendations

#### Phase 2
- hybrid recommendation scoring
- content similarity
- behavioral patterns
- collaborative signals
- better cold-start handling

### 13.4 Safety rule
Recommendation logic must not push advanced content in a misleading way where prerequisites are clearly not met.

---

## 14. Admin dashboard module

### 14.1 Routes
- /dashboard/learning
- /dashboard/learning/courses
- /dashboard/learning/courses/new
- /dashboard/learning/courses/:id
- /dashboard/learning/courses/:id/edit
- /dashboard/learning/lessons
- /dashboard/learning/certificates
- /dashboard/learning/subscriptions
- /dashboard/learning/audiences
- /dashboard/learning/analytics
- /dashboard/learning/events
- /dashboard/learning/camps
- /dashboard/learning/boogies
- /dashboard/learning/settings

### 14.2 Admin capabilities
Admins should be able to:
- create courses
- create modules and lessons
- upload or link premium video assets
- define access tier
- define prerequisites
- create quizzes
- issue or revoke certificates
- verify attendance
- connect event participation to profile records
- assign content to users
- configure visibility defaults
- manage subscription products
- review analytics

### 14.3 Roles
- super_admin
- dz_owner
- dz_manager
- learning_admin
- content_manager
- event_admin
- instructor with restricted publish rights if allowed

---

## 15. Learner experience

### 15.1 Routes
- /app/learning
- /app/learning/course/:id
- /app/learning/lesson/:id
- /app/learning/saved
- /app/learning/history
- /app/learning/certificates
- /app/learning/subscription
- /app/learning/events
- /app/learning/camps
- /app/learning/boogies

### 15.2 Learner home
Show:
- continue learning
- recommended for you
- your saved content
- upcoming camp prep
- recently issued certificates
- free content
- premium content
- your event-linked learning
- your achievements

### 15.3 Lesson page
Support:
- secure video player
- transcript
- notes
- downloads or attachments
- related lessons
- mark complete
- quiz CTA
- next lesson
- report issue
- resume playback

### 15.4 Offline behavior
Allow:
- cached metadata
- cached progress state
- optional offline playback if product policy and provider allow

Do not fake offline access where protected streaming and entitlement checks require a live server decision.

---

## 16. Data model

### 16.1 Shared platform entities
Use centralized identity for:
- users
- profiles
- roles
- learning history
- certificates
- subscriptions
- saved content
- recommendation state
- achievement records

### 16.2 Tenant-aware entities
Keep tenant scope where needed for:
- DZ-created courses
- internal staff training
- branch-specific onboarding
- local event attendance
- admin-issued credentials
- sponsored access

### 16.3 Core tables
#### learning_courses
- id
- uuid
- organization_id nullable
- dropzone_id nullable
- branch_id nullable
- title
- slug
- description
- category
- level
- access_type
- visibility
- status
- cover_image_url
- estimated_duration_minutes
- created_by
- created_at
- updated_at

#### learning_course_modules
- id
- course_id
- title
- sort_order

#### learning_lessons
- id
- course_id
- module_id nullable
- title
- description
- content_type
- video_provider
- video_asset_id
- external_video_url nullable
- transcript_url nullable
- duration_seconds
- access_type
- prerequisite_json
- sort_order
- status

#### learning_subscriptions
- id
- user_id
- subscription_tier
- provider
- external_ref
- status
- starts_at
- ends_at
- source_type
- source_ref

#### learning_entitlements
- id
- user_id
- entitlement_type
- entitlement_ref
- status
- granted_by
- starts_at
- ends_at

#### learning_enrollments
- id
- user_id
- course_id
- source_type
- enrollment_status
- started_at
- completed_at
- completion_percent

#### learning_lesson_progress
- id
- user_id
- lesson_id
- progress_seconds
- completed
- last_watched_at

#### learning_quizzes
- id
- course_id
- title
- pass_score

#### learning_quiz_attempts
- id
- user_id
- quiz_id
- score
- passed
- attempted_at

#### learning_certificates
- id
- user_id
- course_id nullable
- event_id nullable
- certificate_type
- issuer_type
- issuer_ref
- issue_date
- verification_code
- pdf_url
- metadata_json
- visibility
- revoked_at nullable

#### learning_achievements
- id
- user_id
- achievement_type
- source_type
- source_id
- title
- metadata_json
- visibility
- created_at

#### learning_event_attendance
- id
- user_id
- event_type
- event_id
- attendance_status
- verified_by
- verified_at
- evidence_json nullable

#### learning_recommendations
- id
- user_id
- content_type
- content_id
- reason
- score
- generated_at
- dismissed

#### learning_saved_items
- id
- user_id
- content_type
- content_id
- saved_at

---

## 17. Permissions and rules

### 17.1 Content visibility
Enforce:
- public content access
- authenticated-free access
- paid access
- invited-only access
- internal training access
- subscription-based access

### 17.2 Certificate issuance
- admin can issue
- content manager can issue where allowed
- instructor can issue event attendance where allowed
- automatic rules can issue after completion and verification

### 17.3 Profile publishing
- user controls optional public visibility
- system controls official certificate visibility where policy requires
- DZ controls internal staff records

---

## 18. API groups

### 18.1 Learning content APIs
- GET /api/v1/learning/courses
- GET /api/v1/learning/courses/:slug
- GET /api/v1/learning/lessons/:id
- GET /api/v1/learning/recommendations
- POST /api/v1/learning/enrollments
- PATCH /api/v1/learning/lesson-progress/:id
- POST /api/v1/learning/saved-items
- DELETE /api/v1/learning/saved-items/:id

### 18.2 Admin content APIs
- POST /api/v1/dz/:dzId/learning/courses
- PATCH /api/v1/dz/:dzId/learning/courses/:id
- POST /api/v1/dz/:dzId/learning/lessons
- PATCH /api/v1/dz/:dzId/learning/lessons/:id
- POST /api/v1/dz/:dzId/learning/quizzes
- POST /api/v1/dz/:dzId/learning/certificates/issue
- POST /api/v1/dz/:dzId/learning/attendance/verify

### 18.3 Subscription APIs
- GET /api/v1/learning/subscription
- POST /api/v1/learning/subscription/checkout
- POST /api/v1/learning/subscription/cancel
- GET /api/v1/learning/access/:contentId

### 18.4 Certificate APIs
- GET /api/v1/learning/certificates
- GET /api/v1/learning/certificates/:id
- GET /api/v1/learning/certificates/verify/:code

### 18.5 Event-linked APIs
- GET /api/v1/learning/events/history
- POST /api/v1/learning/events/:id/link-content
- POST /api/v1/learning/events/:id/issue-attendance

---

## 19. CI/CD and delivery requirements

Every learning feature must ship with:
- schema migration
- entitlement logic
- API routes
- dashboard UI
- learner UI
- certificate generation
- profile integration
- event attendance linkage
- analytics
- tests
- staging validation

### 19.1 CI checks
- schema migration safety
- API contract checks
- entitlement tests
- subscription tests
- certificate issuance tests
- recommendation tests
- profile visibility tests
- app/web build checks
- secure playback auth tests

---

## 20. What should stay outside this module
These may connect to learning, but should not be forced into this file as the core module center:
- full community/forum platform
- broad social network/feed architecture
- generalized messaging platform
- full creator economy layer

Learning can integrate with future community modules later, but learning itself should remain focused and operationally clear.

---

## 21. Final product recommendation
The best SkyLara learning strategy is:
- free learning layer for growth
- premium subscriber layer for serious athletes and professionals
- internal DZ/team layer for staff and onboarding
- event-linked learning for camps and boogies
- profile credibility layer for achievements and records
- secure protected video delivery
- centralized entitlement truth
- prerequisite-aware recommendations
- verifiable certificate and attendance support
- one backend truth across dashboard, app, web, and PWA

---

## 22. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Learning Platform Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Learning_Subscriptions_Module_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade learning, subscriptions, entitlements, certificates, event attendance, and credibility module inside SkyLara that supports free and paid learning, protected premium video delivery, prerequisite-aware recommendations, profile achievements, and event-linked participation records across dashboard, web, PWA, and mobile.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Build one backend truth for dashboard, web, PWA, and mobile.
3. Use secure authenticated video delivery for paid/private learning.
4. Do not rely on YouTube as the main paid learning infrastructure.
5. Keep entitlement truth centralized across web and mobile.
6. Separate course completion from official operational qualification.
7. Every feature must ship with API, permissions, UI, subscriptions, certificates, profile integration, attendance linkage, and auditability where relevant.
8. Do not mark it complete unless learning access, subscriptions, certificates, attendance records, and profile credibility records actually work.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, and event hooks already in the repo
3. missing work needed for the learning module
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard routes and learner routes to add
8. subscription, entitlement, certificate, and attendance flows to add
9. implementation risks
10. recommended Phase 1
```

---

## 23. Suggested repo filename
Use:
`docs/SkyLara_Learning_Subscriptions_Module_Master_Spec.md`
