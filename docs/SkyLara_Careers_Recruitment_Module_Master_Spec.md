# SkyLara_Careers_Recruitment_Module_Master_Spec.md

# SkyLara Careers and Recruitment Module Master Spec

## Purpose
This file defines a production-grade careers and recruitment module for SkyLara.

It is designed to fit the existing SkyLara architecture and docs, while adding a full hiring flow that works across:
- dashboard
- web
- mobile app
- centralized SkyLara user database
- private dropzone tenant data
- notifications
- interviews
- candidate review pipeline

This file is intended to answer one operational need clearly:

A dropzone admin or authorized hiring role should be able to create job posts from the dashboard, target only relevant skydiving professionals, notify selected user segments from the centralized SkyLara identity graph, receive structured applications with private candidate data, and manage the hiring pipeline without exposing irrelevant jobs to students or fun jumpers.

---

# 1. Canonical product position

SkyLara Careers is not a public generic job board first.
It is a role-aware aviation and dropzone recruitment module built on top of SkyLara identity, permissions, qualifications, notification, and multi-tenant systems.

The right model is:

- centralized SkyLara identity database for platform users
- tenant-private operational hiring data per dropzone
- role-based visibility
- qualification-aware targeting
- selective outbound notification
- private application pipeline
- optional public share links where intended
- dashboard-first administration
- mobile-friendly candidate experience

This direction matches the current SkyLara architecture, which already separates platform-level identity from dropzone-scoped data and supports multi-DZ roles, branch overrides, and centralized user identity patterns. fileciteturn16file3 fileciteturn16file5 fileciteturn16file8

---

# 2. Main hiring principles

## 2.1 Admin-only or authorized hiring-role posting
Not every dashboard user should create jobs.
By default, only:
- super_admin
- dz_owner
- dz_manager
- optional custom hiring_admin role
should be able to create, publish, pause, close, or archive job posts.

This aligns with SkyLara’s RBAC and per-dropzone role model, where permissions are scoped by DZ and can be overridden at DZ level. fileciteturn16file0

## 2.2 Central identity, private tenant data
SkyLara should keep:
- platform users and profiles centralized
- applications, recruiter notes, interviews, evaluations, and hiring decisions private to the hiring dropzone or organization unless explicitly shared

This follows the current multi-tenancy approach: platform identity is shared, while tenant-scoped operational data stays isolated by dropzone_id and branch_id. fileciteturn16file3 fileciteturn16file5 fileciteturn16file8

## 2.3 Do not show irrelevant jobs to irrelevant users
A fun jumper or student should not automatically see instructor, AFFI, tandem instructor, chief instructor, pilot, or rigger job posts unless the post is intentionally made public.

Job visibility must support:
- internal professional-only
- targeted internal
- invited-only
- public share link
- organization-only
- dropzone-only

## 2.4 Target by qualification, not only by keyword
A job should be targetable by:
- role type
- instructor rating
- tandem rating
- AFF rating
- chief instructor eligibility
- pilot qualifications
- total jump count
- recent activity
- location
- work authorization / relocation preference
- current verification status
- language
- medical class where relevant
- canopy / discipline experience
- platform reputation or verification level if used later

## 2.5 Candidate data stays private
The candidate’s full application, CV, phone number, jump totals, ratings, notes, recruiter comments, and interview history should only be visible inside the recruiter dashboard and permissioned views.

## 2.6 One backend truth
The careers module must use the same backend truth for:
- dashboard recruiter flows
- candidate web application page
- mobile app candidate experience
- notifications
- interview scheduling
- status updates

That matches the shared REST + WebSocket + typed service boundary model already defined in SkyLara. fileciteturn16file5 fileciteturn16file17

---

# 3. User roles in Careers

## Hiring-side roles
- super_admin
- dz_owner
- dz_manager
- hiring_admin
- recruiter
- chief_instructor_reviewer
- pilot_reviewer
- compliance_reviewer

## Candidate-side roles
- athlete
- instructor
- tandem_instructor
- aff_instructor
- chief_instructor
- load_organizer
- jump_pilot
- rigger
- camera_flyer
- coach

These should be resolved from platform identity and profile attributes, not manually duplicated if that data already exists.

---

# 4. Job visibility model

## 4.1 Visibility types
Each job_post must support one of:

- INTERNAL_TARGETED
- INTERNAL_PROFESSIONAL_POOL
- ORGANIZATION_ONLY
- DROPZONE_ONLY
- INVITE_ONLY
- PUBLIC_LINK
- PUBLIC_MARKETPLACE

## 4.2 Recommended default
Default visibility should be:
**INTERNAL_TARGETED**

That means:
- visible only to relevant profiles
- not shown to students or casual users
- optionally pushed to selected instructors, AFFIs, TIs, chief instructors, pilots, or riggers

## 4.3 Share behavior
Admins may enable:
- “Share internally”
- “Share to selected users”
- “Create external browser link”
- “Allow referrals/share by link”

This supports your idea that a professional can share the job to a friend as a link, while the underlying application still lands in SkyLara’s recruitment dashboard.

---

# 5. Candidate sourcing model

## 5.1 Source pools
A recruiter should be able to source from:

### A. Central SkyLara database
Use platform-wide user graph for:
- instructor-rated users
- AFFI users
- tandem users
- chief instructor-like profiles
- pilots
- riggers
- verified professionals

### B. Organization talent pool
Candidates already known by the organization.

### C. Existing DZ staff and alumni
Useful for rehiring, seasonal work, and internal mobility.

### D. External/public applicants
Users who open the public link in browser and apply.

## 5.2 Targeting filters
Recruiter can target by:
- job category
- rating type
- minimum jumps
- minimum years experience
- verified medical or document status
- current location
- desired radius
- nationality or work eligibility only if legally appropriate
- language
- relocation support needed
- availability window
- current platform activity

---

# 6. Full flow

## 6.1 Admin creates a job post from dashboard
Entry point:
- /dashboard/careers/jobs/new

Form sections:
1. role basics
2. job visibility
3. qualification requirements
4. compensation and package
5. targeting filters
6. application questions
7. internal notes
8. notification targets
9. publishing options

## 6.2 Admin selects who should see it
Examples:
- all AFF instructors in UAE
- all tandem instructors in MENA
- selected chief instructors only
- only current instructors in our organization
- only users with verified AFFI + 1000 AFF jumps
- send to specific user list manually selected

## 6.3 System creates audience preview
Before publish, dashboard shows:
- estimated matching users
- count by role
- count by country / region
- count verified vs unverified
- whether any public link is enabled

## 6.4 Publish
On publish:
- create job post record
- create target rules
- create audience snapshot
- send notifications to selected internal audience if enabled
- optionally create external share link
- log audit event

## 6.5 Candidate sees job
Candidate sees it:
- in app if allowed by targeting
- via internal notifications
- via email / push / WhatsApp if enabled
- via public browser link if sharing is enabled

## 6.6 Candidate applies
Candidate flow:
- role preview
- requirements
- compensation and relocation
- recruiter note
- profile + experience step
- rating and jump data step
- documentation upload
- review and submit
- success page

The mobile-first UI idea you shared fits this well:
- jobs home screen
- filter drawer
- job details page
- multi-step application form
- confirmation page

## 6.7 Application is submitted into recruiter dashboard
Recruiter sees:
- candidate summary
- profile completeness
- ratings and jumps
- CV / attachments
- contact info
- internal score / review notes
- stage
- schedule interview
- request more documents
- reject / hold / shortlist

## 6.8 Interview scheduling
Recruiter can schedule:
- video interview
- phone screen
- in-person interview
- technical evaluation jump
- on-site trial day

Candidate receives:
- confirmation
- calendar invite
- instructions
- status updates

## 6.9 Final decision
Recruiter can:
- reject
- keep warm
- shortlist
- invite to next stage
- offer
- hired

If hired:
- optionally create staff onboarding workflow
- trigger role-assignment onboarding draft
- request compliance docs
- request contract flow later if built

---

# 7. Dashboard modules to add

## 7.1 Careers admin area
Routes:
- /dashboard/careers
- /dashboard/careers/jobs
- /dashboard/careers/jobs/new
- /dashboard/careers/jobs/:id
- /dashboard/careers/jobs/:id/edit
- /dashboard/careers/applications
- /dashboard/careers/applications/:id
- /dashboard/careers/talent-pool
- /dashboard/careers/interviews
- /dashboard/careers/settings
- /dashboard/careers/templates

## 7.2 Job creation screens
Need:
- job builder
- audience builder
- preview and publish
- notification chooser
- recruiter notes section

## 7.3 Application review screens
Need:
- kanban by stage
- list/table view
- candidate detail page
- side-by-side comparison
- interview scheduler
- compliance review panel

---

# 8. App and web candidate surfaces

## 8.1 In-app jobs area
Routes:
- /app/jobs
- /app/jobs/:id
- /app/jobs/saved
- /app/jobs/applications
- /app/jobs/applications/:id

## 8.2 Public browser surface
If shared externally:
- /careers/jobs/:slug
- /careers/apply/:slug

The public page should show:
- role details
- requirements
- overview
- recruiter note
- apply CTA

But actual private application details only appear after authenticated or verified application steps.

## 8.3 Internal visibility rules in app
By default:
- students do not see professional hiring posts
- fun jumpers do not see professional staff recruitment unless targeted or public
- instructors see instructor-relevant roles
- AFFI and TI can receive targeted notifications
- pilot roles go only to pilot-qualified pool
- chief instructor roles go to senior/qualified pool only

---

# 9. Data model

## 9.1 Platform-level and tenant-level split

### Platform-level
These remain centralized:
- users
- user_profiles
- user_roles (including nullable dropzone scope)
- identity / qualification profile
- platform notification preferences
- saved jobs
- candidate public profile metadata

### Tenant-scoped
These stay private to hiring tenant:
- job_posts
- job_post_targets
- job_post_audience_snapshots
- job_applications
- application_answers
- application_documents
- recruiter_notes
- application_stage_events
- interview_schedules
- interview_feedback
- offer_records
- hiring_audit_logs

This separation follows existing identity-vs-tenant architecture. fileciteturn16file3 fileciteturn16file8

## 9.2 Core tables

### job_posts
- id
- uuid
- organization_id nullable
- dropzone_id nullable
- branch_id nullable
- created_by
- title
- slug
- role_category
- employment_type
- priority
- location_mode
- city
- country
- visibility_type
- application_mode
- status: DRAFT | SCHEDULED | PUBLISHED | PAUSED | CLOSED | ARCHIVED
- description
- responsibilities_json
- requirements_json
- compensation_json
- recruiter_note
- company_profile_snapshot
- publish_at
- close_at
- public_share_enabled
- created_at
- updated_at

### job_post_targets
- id
- job_post_id
- target_type
- operator
- value_json
- created_at

### job_post_audience_snapshots
- id
- job_post_id
- user_id
- reason_matched
- matched_at
- notified_at nullable
- notification_channels_json

### job_applications
- id
- uuid
- job_post_id
- applicant_user_id nullable
- applicant_email
- applicant_name
- current_stage
- status
- source_type: INTERNAL | PUBLIC_LINK | REFERRAL | MANUAL
- source_ref
- profile_snapshot_json
- jumps_snapshot_json
- ratings_snapshot_json
- submitted_at
- updated_at

### application_answers
- id
- application_id
- question_key
- answer_value_json

### application_documents
- id
- application_id
- document_type
- file_url
- uploaded_at
- verified_by nullable
- verification_status

### recruiter_notes
- id
- application_id
- created_by
- note_type
- note_text
- visibility_scope
- created_at

### application_stage_events
- id
- application_id
- from_stage
- to_stage
- changed_by
- reason
- created_at

### interview_schedules
- id
- application_id
- interview_type
- starts_at
- ends_at
- timezone
- location_or_link
- scheduled_by
- status
- notes

### interview_feedback
- id
- interview_schedule_id
- reviewer_user_id
- score
- notes
- recommendation
- created_at

---

# 10. Permissions

## 10.1 Posting permissions
Default:
- super_admin: full
- dz_owner: full for own tenant
- dz_manager: create/edit/publish if permission granted
- hiring_admin: create/edit/publish/manage applications
- recruiter: review and manage applications, maybe create drafts
- instructor / athlete / student: cannot create jobs

RBAC already exists with per-DZ scoping and permission resolution at API/service layer, so careers should plug into the same model. fileciteturn16file0 fileciteturn16file17

## 10.2 Suggested permissions
- careers_job:view
- careers_job:create
- careers_job:edit
- careers_job:publish
- careers_job:close
- careers_job:archive
- careers_job:target_users
- careers_job:share_public
- careers_application:view
- careers_application:review
- careers_application:stage_change
- careers_application:comment
- careers_application:schedule_interview
- careers_application:export
- careers_settings:edit

---

# 11. API groups

## 11.1 Admin / dashboard APIs
- GET /api/v1/dz/:dzId/careers/jobs
- POST /api/v1/dz/:dzId/careers/jobs
- GET /api/v1/dz/:dzId/careers/jobs/:id
- PATCH /api/v1/dz/:dzId/careers/jobs/:id
- POST /api/v1/dz/:dzId/careers/jobs/:id/publish
- POST /api/v1/dz/:dzId/careers/jobs/:id/pause
- POST /api/v1/dz/:dzId/careers/jobs/:id/close
- POST /api/v1/dz/:dzId/careers/jobs/:id/audience-preview
- POST /api/v1/dz/:dzId/careers/jobs/:id/notify

## 11.2 Application APIs
- POST /api/v1/careers/jobs/:slug/apply
- GET /api/v1/careers/my-applications
- GET /api/v1/dz/:dzId/careers/applications
- GET /api/v1/dz/:dzId/careers/applications/:id
- PATCH /api/v1/dz/:dzId/careers/applications/:id/stage
- POST /api/v1/dz/:dzId/careers/applications/:id/note
- POST /api/v1/dz/:dzId/careers/applications/:id/request-documents

## 11.3 Interview APIs
- POST /api/v1/dz/:dzId/careers/applications/:id/interviews
- PATCH /api/v1/dz/:dzId/careers/interviews/:id
- POST /api/v1/dz/:dzId/careers/interviews/:id/feedback

## 11.4 Candidate sourcing APIs
- POST /api/v1/dz/:dzId/careers/talent-search
- POST /api/v1/dz/:dzId/careers/jobs/:id/build-audience
- POST /api/v1/dz/:dzId/careers/jobs/:id/select-users

## 11.5 Notification APIs
Use existing notification infrastructure for delivery, since DMS already routes alerts via the platform notification system. fileciteturn16file7 fileciteturn16file13
Additional hiring-oriented endpoints:
- POST /api/v1/dz/:dzId/careers/jobs/:id/send-internal-notification
- POST /api/v1/dz/:dzId/careers/jobs/:id/send-public-share
- POST /api/v1/dz/:dzId/careers/applications/:id/send-update

---

# 12. Notifications model

## 12.1 Notification types
- CAREERS_JOB_MATCH
- CAREERS_JOB_INVITE
- CAREERS_APPLICATION_RECEIVED
- CAREERS_APPLICATION_STAGE_CHANGED
- CAREERS_INTERVIEW_SCHEDULED
- CAREERS_INTERVIEW_REMINDER
- CAREERS_REQUEST_MORE_INFO
- CAREERS_REJECTED
- CAREERS_SHORTLISTED
- CAREERS_OFFER_SENT

## 12.2 Channels
- in-app
- push
- email
- WhatsApp if configured
- SMS only for urgent interview cases if enabled

## 12.3 Fatigue controls
Reuse notification throttling principles already defined in operations notifications so careers outreach does not spam users. fileciteturn16file13

---

# 13. Smart targeting logic

## 13.1 Matching engine
Create a job matching engine that scores candidates by:
- role match
- qualification match
- verified rating match
- experience match
- jump-count match
- location relevance
- availability
- relocation fit
- document completeness

## 13.2 Match tiers
- Exact Match
- Strong Match
- Partial Match
- Manual Review Pool

## 13.3 Important rule
A candidate does not need to be auto-visible just because they exist in the database.
Visibility should follow:
- job visibility rules
- target filters
- recruiter manual selection
- public-share intent if enabled

---

# 14. Application UX

## 14.1 Application form
Your design direction is good.
The best structure is:

### Step 1: Profile
- legal name
- contact details
- nationality / location
- work authorization
- relocation openness

### Step 2: Experience
- years experience
- total jumps
- instructional ratings
- tunnel / canopy / specific discipline details
- current or previous DZs

### Step 3: Documentation
- resume / CV
- license or rating documents
- medical
- optional supporting docs
- optional cover letter

### Step 4: Review
- preview
- consent
- submit

## 14.2 Smart prefill
If the applicant is already a SkyLara user:
- prefill profile data
- prefill jumps and rating snapshots
- let them edit only the application-specific fields
- keep a submitted snapshot, not a live mutable reference

## 14.3 Success state
Show:
- application received
- expected next step
- recruiter SLA
- status tracker
- relevant next actions such as updating certifications

---

# 15. Interview and decision flow

## 15.1 Stages
- APPLIED
- INITIAL_REVIEW
- SHORTLISTED
- INTERVIEW_SCHEDULED
- TECHNICAL_EVALUATION
- FINAL_REVIEW
- OFFER
- HIRED
- REJECTED
- WITHDRAWN

## 15.2 Scheduler
Dashboard should allow:
- online interview
- in-person interview
- technical jump evaluation
- calendar invite generation
- timezone-safe scheduling

## 15.3 Reviewer assignment
Assign application reviewers such as:
- chief instructor
- head of training
- DZ manager
- chief pilot
- hiring admin

---

# 16. CI/CD and implementation requirements

The existing monorepo and CI/CD structure already support web, api, and mobile together through GitHub Actions and staged deployment. fileciteturn16file17

Every careers feature must ship with:
- schema migration
- API routes
- permission middleware
- recruiter dashboard UI
- candidate UI
- notification flow
- audit logging
- tests
- staging validation

## 16.1 CI checks to include
- schema migration check
- API contract check
- dashboard build
- mobile/PWA build check
- RBAC tests
- job visibility tests
- audience targeting tests
- application submission tests
- interview scheduling tests

---

# 17. Best operational model for your question

You asked for this specifically:
- admin-only creation from dashboard
- selective sending to instructors / AFF / chief instructor / tandem instructor
- no pointless visibility to students or fun jumpers
- use centralized SkyLara user database
- keep dropzone-private data private
- application comes to dashboard with candidate private data
- support scheduling online or physical interviews
- allow sharing the job link externally if needed

This spec uses exactly that model.

### Final product decision
- **Central SkyLara DB** stores users, roles, profiles, and high-level qualifications
- **Dropzone-private tenant data** stores the job post operations, recruiter notes, applications, internal reviews, and decisions
- **Admin dashboard** controls publishing, targeting, review, and interviews
- **App/web candidate layer** lets professionals apply with prefilled data
- **Public browser link** is optional, not default

---

# 18. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Rules Engine Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Careers_Recruitment_Module_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade careers and recruitment module inside SkyLara that allows authorized admin or hiring roles to create job posts from the dashboard, target only relevant professional users from the centralized SkyLara identity graph, keep applications and recruiter data private per dropzone or organization, and manage the full hiring flow across dashboard, web, PWA, and mobile.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Use centralized platform identity but tenant-private hiring data.
3. Do not show irrelevant professional jobs to students or fun jumpers by default.
4. Admin-only or authorized hiring-role posting must be enforced through RBAC.
5. Build one backend truth for dashboard, web, PWA, and mobile.
6. Every feature must ship with API, permissions, UI, notifications, and auditability.
7. Do not mark it complete unless the recruiter workflow, application flow, and interview scheduling are actually usable.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, and event hooks already in the repo
3. missing work needed for the careers module
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard routes and candidate routes to add
8. permission rules to add
9. notification behavior to add
10. implementation risks
11. recommended Phase 1
```

---

# 19. Suggested repo filename

Use:
`docs/SkyLara_Careers_Recruitment_Module_Master_Spec.md`
