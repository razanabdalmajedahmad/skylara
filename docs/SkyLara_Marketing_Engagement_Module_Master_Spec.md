# SkyLara Marketing, Engagement, Referrals, Surveys, and Gamification Master Spec

## Purpose
This file is the single replacement specification for the SkyLara marketing and engagement module.

It replaces earlier or partial marketing-engagement drafts with one consolidated implementation specification covering:
- dashboard marketing center
- web, PWA, and mobile engagement flows
- jumped-today end-of-day survey automation
- CSAT, NPS, post-event, and service-recovery flows
- journeys and campaign orchestration
- social sharing and referrals
- deep links and attribution
- rewards, points, streaks, badges, and leaderboards
- spin-the-wheel promotional mechanics
- nearest-dropzone updates and local content
- tips and nudges
- voucher and reward fulfillment integrations
- permissions, consent, audit, and compliance
- scale, queues, analytics, and CI/CD
- Claude Code implementation prompt

This file must be treated as the current source of truth for the marketing, engagement, referrals, surveys, rewards, and gamification module.

---

## 1. Canonical product position

SkyLara Marketing is not a generic blast tool.
It is the retention, feedback, referral, loyalty, and engagement operating layer for the SkyLara platform.

It must:
- work across dashboard, web, PWA, and mobile app
- use real operational triggers from manifest, bookings, events, learning, and careers
- support multi-tenant dropzones, organizations, and branches
- support admin-controlled journeys and campaigns from the dashboard
- use one backend truth for campaign eligibility, sends, rewards, and analytics
- stay compliant with user preferences, consent, tenant scope, and local promotional rules
- support global scale over time without collapsing into manual operations

This module must fit the existing SkyLara architecture:
- modular monolith in V1
- shared auth and RBAC
- shared identity graph
- shared notifications
- shared event bus
- shared analytics and audit
- shared mobile/web/PWA/backend truth

---

## 2. Research-backed product decisions

### 2.1 Push and lifecycle messaging
OneSignal officially supports push targeting, personalization, scheduling, dynamic segments, and omnichannel sending from dashboard or API, which fits tenant-aware journeys and campaign orchestration. citeturn269815search0turn269815search3turn269815search7turn269815search15

Firebase Cloud Messaging supports reliable cross-platform messaging and topic messaging for opted-in devices, which is useful for large fan-out delivery and topic-based distribution. citeturn269815search1turn269815search4turn269815search8

### 2.2 Survey design
Qualtrics recommends keeping most CSAT surveys under 10 questions, avoiding double-barreled questions, and limiting excessive open-ended questions because they reduce completion. That supports a short post-jump feedback pattern. citeturn269815search2turn269815search17turn269815search21

### 2.3 Deep links, sharing, and referrals
Branch supports web and app deep links, bulk link generation, and routing into the right screen after app open or install. That fits “share your jump”, “invite a friend”, “share this event”, and referral attribution patterns. citeturn269815search6turn269815search10turn269815search18

### 2.4 UAE compliance framing
The UAE GCGRA regulates commercial gaming activities such as lottery, internet gaming, and sports wagering, and unlicensed commercial gaming is illegal. Promotional campaigns in Dubai, including raffles tied to retail promotions, are handled through DET/DFRE promotional certificate processes rather than through the GCGRA. DET explicitly provides a process to apply for a promotion certificate for retail promotions including raffles and kiosks. citeturn280731search1turn280731search13turn280731search19turn280731search4

### 2.5 Voucher and reward delivery
Amazon’s Incentives API allows businesses to create and distribute Amazon gift codes and digital claim codes on demand, which is a useful model for digital reward fulfillment. citeturn280731search3turn280731search7turn280731search14

### 2.6 Gamification infrastructure
Trophy’s public product and developer materials show the practical pattern for achievements, streaks, points, and leaderboards. That validates a dedicated backend model for score events, board recomputations, and recurring leaderboard windows. citeturn713258search1turn713258search4

---

## 3. Core product objective

SkyLara Marketing should make users spend more useful time in the app without becoming spammy or legally risky.

It should do that through five loops:

1. **Feedback loop**
   - jump today
   - receive post-jump survey
   - respond
   - if unhappy, get service recovery
   - if happy, get share/referral prompt

2. **Habit loop**
   - get daily or contextual tips
   - earn streaks or points for useful engagement
   - come back for next step

3. **Referral loop**
   - share jump, event, or invite link
   - friend opens or installs
   - qualifying event happens
   - reward is granted

4. **Local relevance loop**
   - nearest dropzone news
   - local events
   - weather or operational updates
   - nearby promotions and staff visits

5. **Reward loop**
   - earn points, badges, and eligibility
   - claim discounts or perks
   - participate in controlled promotional mechanics such as spin-the-wheel
   - see status on wallet/leaderboard/profile

---

## 4. Dashboard information architecture

### 4.1 Main section
Create:
- `/dashboard/marketing`

### 4.2 Subsections
- `/dashboard/marketing/overview`
- `/dashboard/marketing/journeys`
- `/dashboard/marketing/campaigns`
- `/dashboard/marketing/surveys`
- `/dashboard/marketing/referrals`
- `/dashboard/marketing/rewards`
- `/dashboard/marketing/gamification`
- `/dashboard/marketing/leaderboards`
- `/dashboard/marketing/news`
- `/dashboard/marketing/tips`
- `/dashboard/marketing/audiences`
- `/dashboard/marketing/templates`
- `/dashboard/marketing/analytics`
- `/dashboard/marketing/compliance`
- `/dashboard/marketing/settings`

### 4.3 Roles
By default only:
- super_admin
- dz_owner
- dz_manager
- marketing_admin
- crm_manager
- community_manager
should create, publish, pause, or modify campaigns unless permissions are explicitly extended.

---

## 5. Audience and segmentation model

### 5.1 Audience sources
Build audiences from:
- centralized SkyLara user graph
- tenant-scoped DZ membership
- jumped today
- jumped in last X days
- booked but not checked in
- booked but weather held
- no-show
- event attendee
- camp attendee
- learning segment
- career segment
- wallet segment
- subscriber segment
- nearest-dropzone segment
- push-enabled users
- social-share-consented users
- survey responders / non-responders
- referrers / referred users

### 5.2 Filters
Support:
- role
- discipline
- location
- nearest dropzone
- home DZ
- last jump date
- event history
- learning history
- survey score range
- push permission
- language
- subscription tier
- app installed or not
- referred or not
- reward eligibility

### 5.3 Important rule
No campaign should default to “send to everyone.”
Every send must be tied to:
- segment logic
- tenant scope
- consent or preference state
- channel eligibility
- cadence guardrails

---

## 6. End-of-day jumped-today survey system

### 6.1 Trigger model
At a configurable local time, the system checks:
- user completed jump(s) today
- tenant and branch context
- already surveyed or not
- opt-out state
- survey fatigue window
- whether a service recovery item is already open

### 6.2 Recommended survey structure
Keep it short:
1. CSAT or simple experience score
2. NPS question
3. one short optional open-text feedback field
4. “May we follow up if needed?”
5. optional “Would you share your experience?”

### 6.3 Why this structure
This follows survey best practices for short CSAT/NPS flows and reduces drop-off. citeturn269815search2turn269815search17turn269815search21

### 6.4 Response handling
If low CSAT or detractor:
- create follow-up task for DZ manager or support
- add to service recovery queue
- optionally suppress share/referral asks

If high CSAT or promoter:
- offer share card
- offer referral invite
- optionally ask for review or social share

If no response:
- one reminder max by default
- no spam loops

### 6.5 Dashboard builder
Allow admins to create:
- post-jump survey template
- event survey template
- camp survey template
- student-first-jump survey
- tandem experience survey
- staff ops pulse survey

---

## 7. Campaign and journey engine

### 7.1 Journey types
- post-jump survey journey
- no-response reminder journey
- promoter share journey
- detractor recovery journey
- lapsed-user reactivation
- nearest-dropzone news journey
- event countdown journey
- learning re-engagement journey
- reward claim journey
- referral conversion journey
- welcome journey
- weather disruption reassurance journey

### 7.2 Trigger sources
- manifest completed
- booking created
- event attended
- certificate issued
- campaign audience entered
- geo / location rule satisfied
- referral accepted
- no jump in X days
- survey submitted
- achievement unlocked
- wallet reward granted

### 7.3 Supported channels
- in-app
- push
- email
- SMS if enabled
- WhatsApp if enabled
- internal feed card

### 7.4 Delivery architecture
Use queue-based dispatch for:
- fan-out sending
- retries
- dedupe
- quiet hours
- local timezone scheduling
- rate limiting
- compliance checks before final send

---

## 8. Social sharing and referral system

### 8.1 Shareable assets
Allow users to share:
- jump milestone card
- certificate
- camp badge
- event registration card
- job or camp link
- nearest dropzone event
- referral invite
- reward unlock

### 8.2 Link and attribution model
Use Branch-style deep link patterns for:
- mobile deep links
- deferred deep links
- app install routing
- referral attribution
- campaign source tags
- routing into the correct screen after open/install. citeturn269815search6turn269815search10turn269815search18

### 8.3 Referral rules
Support:
- friend invite
- share-to-earn
- first booking referral
- first jump referral
- event referral
- learning referral
- unique referral code
- anti-fraud controls
- reward only after qualifying event

---

## 9. Gamification system

### 9.1 Core mechanics
Support:
- points
- streaks
- badges
- milestones
- challenges
- recurring leaderboards
- reward claims
- referral achievements
- survey participation achievements
- event attendance achievements

### 9.2 Leaderboards
Support:
- all-time
- weekly
- monthly
- DZ-local
- branch-local
- discipline-specific
- event-specific
- referral leaderboard
- content engagement leaderboard

### 9.3 Score event model
All score changes should come from backend events such as:
- survey completed
- referral converted
- camp attended
- learning path completed
- promotional challenge completed

No leaderboard updates from frontend-only claims.

### 9.4 Spin-the-wheel
Spin-the-wheel must be treated as a controlled promotional mechanic.

Allowed examples:
- after first survey completion
- after referral success
- during event week
- after certificate completion
- after loyalty milestone

Allowed reward types:
- points
- jump-ticket credit
- learning discount
- merch discount
- event perk
- partner voucher

### 9.5 Product governance
Spin must support:
- configurable odds
- reward inventory
- anti-abuse controls
- tenant-level enable/disable
- legal note field
- audit logging
- draw result traceability

---

## 10. UAE compliance and promotional governance

### 10.1 Product rule
This module must be framed as:
- promotional and loyalty engagement
- referral rewards
- non-cash incentives
- controlled draws where legally allowed

It must **not** be framed as gambling, betting, or wagering.

### 10.2 Regulatory distinction
Commercial gaming activities in the UAE are regulated by the GCGRA. Promotional retail and event campaigns in Dubai are handled through DET/DFRE promotion certificate processes. That means SkyLara promotional mechanics must be designed as permit-aware marketing activities, not gaming products. citeturn280731search1turn280731search13turn280731search19

### 10.3 Compliance rules for this module
- no direct cash-out prizes by default
- no “buy ticket to gamble” flow
- tie rewards to legitimate engagement or promotional participation
- support tenant-level compliance checklist before launching promotional campaigns
- support permit reference fields and evidence attachments where needed
- support local disable switch per tenant or country

---

## 11. Reward and voucher fulfillment

### 11.1 Reward types
- points
- badge
- coupon code
- discount
- jump ticket credit
- merch perk
- event perk
- learning unlock
- partner voucher

### 11.2 Voucher fulfillment model
Support provider adapters for:
- internal coupon engine
- partner-issued coupon codes
- Amazon Incentives API style gift code delivery
- regional voucher providers when integrated

### 11.3 Fulfillment rule
Reward issuance must happen from audited backend logic:
- eligibility validated
- anti-fraud checks passed
- inventory available
- reward issued and logged

---

## 12. Nearest dropzone and local news

### 12.1 Main idea
The platform should increase relevant usage by showing nearby activity, not generic noise.

### 12.2 Content types
- nearby events
- weather or operational updates
- organizer visits
- camp openings
- local hiring updates
- boogie countdowns
- seasonal alerts
- nearest DZ promos

### 12.3 Targeting
Use:
- home DZ
- favorites
- last active region
- travel destination
- current location permission if granted

### 12.4 Delivery surfaces
- app home cards
- push
- in-app inbox
- local news feed
- “near you” widget
- dashboard local-news composer

---

## 13. Tips and nudges system

### 13.1 Content types
- safety tip of the day
- coach tip
- canopy reminder
- packing tip
- event prep tip
- staff ops tip
- local update
- learning recommendation

### 13.2 Cadence controls
Allow per-tenant configuration:
- once daily
- once weekly
- event-only
- role-specific cadence
- quiet hours
- delivery window by timezone

### 13.3 Product rule
Tips must be useful and contextual. They should never degrade into spam sequences.

---

## 14. Anti-cheat, fraud, and trust controls

### 14.1 Anti-abuse priorities
Protect:
- referral rewards
- spin-the-wheel claims
- leaderboard manipulation
- repeated survey farming
- multi-account reward abuse
- fake event attendance inputs

### 14.2 Controls
Support:
- per-user daily limits
- per-device and per-account rate limits
- server-side reward checks
- referral qualification windows
- cooldown windows
- anomaly flags
- staff review queue for suspicious claims

### 14.3 Auditability
Every critical promotional event should produce audit records:
- campaign published
- segment snapshot
- send attempted
- reward granted
- spin result produced
- referral credited
- leaderboard recomputed
- compliance flag triggered

---

## 15. Dashboard UX

### 15.1 Marketing overview
Show:
- active campaigns
- survey response rate
- NPS trend
- CSAT trend
- referrals
- share clicks
- reward claims
- push delivery rate
- local engagement
- top gamification performers

### 15.2 Survey builder
Allow:
- CSAT template
- NPS template
- post-jump template
- event template
- custom short survey
- follow-up routing rules

### 15.3 Journey builder
Allow:
- trigger selection
- audience selection
- channel selection
- template selection
- delay rules
- reminder rules
- reward rules
- stop conditions

### 15.4 Leaderboard manager
Allow:
- scoring rules
- windows
- reset cadence
- visibility rules
- reward linkage
- DZ or platform scope

### 15.5 Spin-the-wheel manager
Allow:
- campaign title
- prize pool
- odds
- limits
- legal note
- eligibility rules
- analytics

---

## 16. Mobile and app UX

### 16.1 App surfaces
- home cards
- in-app inbox
- survey sheet
- rewards wallet
- leaderboard tab or card
- spin modal when eligible
- nearest-dropzone feed
- share sheet
- referral center
- achievement drawer

### 16.2 UX rule
Marketing UX must feel native and useful, not like pop-up spam.

---

## 17. Data model

### 17.1 Core entities
- marketing_campaigns
- marketing_journeys
- marketing_audiences
- marketing_templates
- marketing_sends
- marketing_survey_forms
- marketing_survey_responses
- marketing_followup_tasks
- referral_links
- referral_events
- gamification_point_events
- gamification_badges
- gamification_user_badges
- gamification_streaks
- gamification_leaderboards
- gamification_leaderboard_entries
- gamification_reward_rules
- gamification_reward_claims
- gamification_spin_campaigns
- gamification_spin_results
- local_news_items
- user_marketing_preferences
- marketing_compliance_records
- marketing_reward_fraud_flags

### 17.2 Identity split
Use centralized platform identity for:
- users
- roles
- share links
- referral relationships
- achievements
- wallet references

Use tenant-scoped data for:
- campaigns
- local news
- surveys
- local reward availability
- nearest-DZ content
- staff follow-up tasks
- local leaderboards where tenant-specific

---

## 18. API groups

### 18.1 Campaign APIs
- GET /api/v1/dz/:dzId/marketing/campaigns
- POST /api/v1/dz/:dzId/marketing/campaigns
- PATCH /api/v1/dz/:dzId/marketing/campaigns/:id
- POST /api/v1/dz/:dzId/marketing/campaigns/:id/publish
- POST /api/v1/dz/:dzId/marketing/campaigns/:id/pause

### 18.2 Survey APIs
- POST /api/v1/marketing/surveys/respond
- GET /api/v1/dz/:dzId/marketing/surveys
- GET /api/v1/dz/:dzId/marketing/surveys/:id/results
- POST /api/v1/dz/:dzId/marketing/surveys/:id/send

### 18.3 Referral APIs
- POST /api/v1/marketing/referrals/create-link
- GET /api/v1/marketing/referrals/me
- POST /api/v1/marketing/referrals/claim
- GET /api/v1/dz/:dzId/marketing/referrals/analytics

### 18.4 Gamification APIs
- GET /api/v1/marketing/leaderboards
- GET /api/v1/marketing/leaderboards/:id
- POST /api/v1/marketing/spin/:campaignId
- GET /api/v1/marketing/rewards/me
- POST /api/v1/dz/:dzId/marketing/gamification/rules
- GET /api/v1/dz/:dzId/marketing/gamification/analytics

### 18.5 News and tips APIs
- GET /api/v1/marketing/news/nearby
- GET /api/v1/marketing/tips
- POST /api/v1/dz/:dzId/marketing/news
- POST /api/v1/dz/:dzId/marketing/tips/send

### 18.6 Compliance and audit APIs
- GET /api/v1/dz/:dzId/marketing/compliance
- POST /api/v1/dz/:dzId/marketing/compliance/approve
- GET /api/v1/dz/:dzId/marketing/audit

---

## 19. CI/CD, observability, and scale

### 19.1 Each feature ships with
- schema migration
- API routes
- dashboard UI
- app UX
- permission and consent checks
- analytics
- audit logs
- tests
- staging validation

### 19.2 Scale design goals
Design for:
- 1,000 dropzones
- 1,000,000 users over time
- fan-out messaging workloads
- queue-based sending
- retry and dedupe logic
- timezone-safe scheduling
- event-driven triggers
- opt-out enforcement
- geo content caching where relevant

### 19.3 Observability
Track:
- send attempts
- deliveries
- opens
- clicks
- survey completions
- referral attribution
- reward grants
- fraud flags
- leaderboard recomputations
- spin claims
- compliance gate results

---

## 20. What was added in this stronger version

This replacement spec strengthens the earlier marketing spec by adding:
- UAE promotional-governance framing
- stronger anti-abuse and fraud controls
- clearer queue-based architecture for sends
- better reward-fulfillment model
- clearer compliance and audit layer
- stronger dashboard builder model
- stronger referral and deep-link attribution structure
- stronger scale and observability requirements

---

## 21. Final product recommendation

The best SkyLara marketing and engagement strategy is:
- event-triggered surveys after real jumps
- short CSAT/NPS feedback loops
- service recovery for detractors
- contextual share and referral prompts for promoters
- useful local updates and tips
- rewards, streaks, badges, and leaderboards
- controlled spin-the-wheel campaigns
- auditable, consent-aware, queue-driven campaign infrastructure
- one backend truth across dashboard, web, PWA, and mobile

---

## 22. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Growth / CRM Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Marketing_Engagement_Module_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade marketing, engagement, surveys, referrals, local news, social sharing, rewards, and gamification module inside SkyLara that works across dashboard, web, PWA, and mobile and supports real multi-tenant dropzone operations at scale.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Build one backend truth for dashboard, web, PWA, and mobile.
3. Trigger post-jump surveys only from real jump completion data, not fake frontend events.
4. Keep surveys short, useful, and closed-loop.
5. Use deep-link based sharing and referral flows.
6. Keep gamification auditable and configurable per tenant.
7. Treat spin-the-wheel as a controlled promotional mechanic with rules, limits, reward governance, and compliance hooks.
8. Do not mark it complete unless campaigns, surveys, referrals, rewards, leaderboards, tips, and local-news flows actually work.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, event hooks, and notification systems already in the repo
3. missing work needed for the marketing module
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard routes and app surfaces to add
8. journey, survey, referral, reward, and leaderboard flows to add
9. implementation risks
10. recommended Phase 1
```

---

## 23. Suggested repo filename
Use:
`docs/SkyLara_Marketing_Engagement_Module_Master_Spec.md`
