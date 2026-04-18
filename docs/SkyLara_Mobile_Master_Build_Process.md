# SkyLara Mobile Master Build Process

## Purpose
Create one complete, canonical build file for Claude to implement SkyLara Mobile as a mobile-first product that reuses the same backend APIs, business rules, auth, permissions, real-time events, and dashboard data model already used by the SkyLara web platform.

This document is the implementation master for the mobile app and mobile web/PWA experience. It is designed to stop back-and-forth redefinition and give Claude one source of truth for phased delivery.

## Product Goal
Build a mobile-first SkyLara experience for:
- Athletes and fun jumpers
- Coaches and organizers
- Manifest staff on mobile/tablet
- DZ managers who need operational visibility and push communication

The system must let users:
- log in once and use the same account and permissions as web
- see live load board and status updates
- self-manifest for fun jumps
- manage team jumps and formation details
- check in and check out
- view weather and holds
- receive push notifications from the dashboard/admin side
- let coaches manage calendars, sessions, assigned jumpers, tasks, and notes
- submit reports from mobile after jumps or coaching sessions
- work in unstable connectivity with sync recovery

## Canonical Build Rule
Claude must not invent a separate mobile backend. Mobile must consume the same SkyLara APIs, auth, permissions, load logic, event system, and operational truth as the web dashboard.

If an endpoint does not exist yet, Claude must:
1. first check whether a matching web endpoint or service already exists
2. reuse the existing domain model and validation rules
3. only add missing mobile-safe endpoints when truly required
4. keep naming, payloads, enums, and status values aligned with backend truth

## Core Build Decision
Use Expo Router and React Native as the primary mobile application framework, while keeping the architecture compatible with Expo Web for a browser-accessible mobile-first experience. The product should behave like a mobile-first app first, not a desktop website squeezed into a phone.

## Non-Negotiable Product Principles
- Mobile first in layout, flows, performance, and touch targets
- Reuse backend truth from web platform
- Real-time updates where operations change quickly
- Offline-safe behavior for high-value actions
- Minimal taps for manifest-critical actions
- Clear role-based access
- No confusing internal IDs shown to users
- Strong error states with recovery actions
- Push from dashboard to mobile users
- Phase-by-phase delivery with validation after every phase

## Roles to Support
- Athlete
- Coach / Instructor
- Manifest Staff
- DZ Manager / DZ Owner
- Admin

## Shared Cross-Platform Truth
The following must stay shared with web:
- authentication and refresh token flow
- role and permission model
- dropzone selection and membership
- load statuses
- slot statuses
- jump types
- formation types
- wallet and ticket logic
- weather hold logic
- notifications and announcement model
- user profile and document validity logic
- audit and reporting logic

## Mobile Surface Map
### Athlete Mobile
- login and onboarding
- dashboard
- check in and check out
- dropzone selector
- wallet and tickets
- weather widget
- live load board
- load detail
- self-manifest flow
- team jump builder
- QR scan entry when enabled
- notifications center
- chat/messages
- logbook
- profile and settings

### Coach Mobile
- coach dashboard
- calendar by day, week, month
- sessions list
- assigned jumpers
- jump schedule
- training tasks and reminders
- coaching notes
- jump debrief entry
- report submission
- attendance/check-in confirmation
- payout/credits summary if enabled

### Manifest / Operations Mobile
- load overview
- slot management
- scan/check-in support
- weather hold banner
- quick actions
- jumper search
- issue flags
- coach assignment view
- operational announcements

### DZ Manager Mobile / Tablet
- operational dashboard snapshot
- today calendar and aircraft schedule
- loads and capacity summary
- coach utilization summary
- weather and hold status
- send push announcements
- incident and ops reports
- KPI snapshot

## Main Navigation
### Tabs
- Home
- Loads
- Calendar
- Inbox
- Profile

### Role-based hidden or expanded tabs
- Coaches get Calendar as primary and Reports shortcut
- Manifest staff get Ops shortcut
- DZ managers get Ops and Announcements shortcut

## App Architecture
### Frontend
- Expo Router
- React Native
- TypeScript
- Zustand for local app state
- TanStack React Query for server state
- Socket.IO for real-time updates
- NativeWind or shared mobile design tokens
- React Hook Form plus Zod
- Secure storage for auth
- Push notifications
- Camera and QR scanner
- NetInfo and offline queue

### Shared App Layers
- app routes
- screens by role
- components by atomic structure
- domain types mirrored from backend
- api client and endpoint wrappers
- socket event layer
- notifications service
- offline queue and sync service
- storage service
- permissions guard layer
- analytics and logging layer

## Recommended File Structure
```text
skylara-mobile/
  app/
    (auth)/
    (app)/
      home/
      loads/
      calendar/
      inbox/
      profile/
      coach/
      ops/
      reports/
  src/
    api/
    components/
    constants/
    hooks/
    services/
    stores/
    types/
    utils/
    features/
      auth/
      loads/
      manifest/
      wallet/
      weather/
      notifications/
      calendar/
      coach/
      reports/
      profile/
      chat/
      offline/
```

## Shared API Strategy
Claude must create a mobile API map before building UI. That map must include:
- existing endpoint
- method
- auth required
- role access
- request payload
- response payload
- cache key
- real-time event dependencies
- offline eligibility

## Required Backend Domains to Reuse
- auth
- users
- dropzones
- loads
- slots
- aircraft
- manifest
- weather
- notifications
- wallets
- tickets
- sessions
- calendars
- reports
- chat/messages

## New or Extended Mobile Domains That May Be Needed
Only add these if not already present in backend:
- coach availability blocks
- coach task assignments
- coach session reports
- post-jump debrief reports
- mobile announcement delivery receipts
- offline mutation replay status

## Phase Delivery Model

## Phase 0: Discovery and Alignment
Claude must:
- inspect current SkyLara repo structure
- map what web already has
- map what mobile document already defines
- identify conflicts and duplicates
- define one canonical truth for naming and payloads
- output a gap report before coding

Definition of done:
- one gap matrix
- one endpoint map
- one role map
- one architecture decision log

## Phase 1: Foundation and App Shell
Build:
- Expo app shell
- routing
- auth guard
- design tokens
- query client
- Zustand stores
- secure token storage
- API client with refresh flow
- error handling
- skeleton loading states
- environment configuration

Definition of done:
- app boots cleanly
- login persists session
- role guard works
- base tabs render
- staging API can be reached

## Phase 2: Athlete Core MVP
Build:
- athlete dashboard
- check in and check out
- dropzone selector
- wallet and tickets card
- weather widget
- live load board
- load detail
- self-manifest flow for fun jumps
- cancel/remove self from load
- push notification registration

Definition of done:
- athlete can complete real self-manifest flow end-to-end
- load changes reflect live
- dashboard actions use real backend

## Phase 3: Team Jump Builder
Build:
- create team jump
- add self
- add members
- select jump type
- select formation
- payment method selection
- position and exit order support
- team confirmation screen
- slot add and remove handling

Definition of done:
- one user can create and confirm a multi-person fun jump flow with real data

## Phase 4: Coach Calendar and Task System
Build:
- coach home dashboard
- coach calendar day and week view
- assigned jumps and sessions
- availability blocks
- coaching tasks
- athlete list for today
- quick note entry
- jump completion and attendance markers
- session status states

Coach entities:
- CoachAvailability
- CoachSession
- CoachTask
- CoachAssignment
- CoachReport

Definition of done:
- coach can see today, upcoming sessions, assigned athletes, and complete tasks from mobile

## Phase 5: Coach Reports and Mobile Reporting
Build:
- post-jump report form
- debrief notes
- skill tags
- issue flags
- recommendation fields
- attach photo or media placeholder if allowed
- report history
- report submission to dashboard-visible records

Required report outputs:
- athlete progress notes
- coach session summary
- incident or safety escalation path
- ops-visible summary if needed

Definition of done:
- reports submitted on mobile become visible in web dashboard/admin side

## Phase 6: Ops and Manager Views
Build:
- ops dashboard snapshot
- today loads summary
- aircraft cycle summary
- weather hold and pause state
- coach schedule summary
- quick broadcast tool
- issue and report queue
- mobile approvals where safe

Definition of done:
- DZ manager can see core mobile ops view and send push communications

## Phase 7: Notifications and Messaging
Build:
- notification inbox
- unread counts
- push categories
- deep link handling from push
- announcement detail page
- message thread list
- direct message or support thread if enabled

Push types:
- load moved
- load locked
- weather hold
- coach assignment changed
- report requested
- payment or ticket alert
- dropzone announcement

Definition of done:
- push from dashboard opens correct mobile destination

## Phase 8: Offline, Sync, and Reliability
Build:
- offline banner
- queued mutations for approved actions
- retry rules
- idempotency keys for sensitive operations
- optimistic UI only where safe
- sync conflict rules
- manual retry screen

Safe offline actions:
- draft report save
- local task completion draft
- note capture

Cautious offline actions:
- manifest actions
- cancellations
- check-in status changes

For manifest-critical actions, Claude must implement server acknowledgement states, not fake success.

Definition of done:
- app degrades gracefully offline and recovers sync cleanly

## Phase 9: QA, Pilot Readiness, and Hardening
Build:
- test accounts per role
- realistic seed data
- empty states
- failure states
- analytics and crash logging
- performance checks
- device QA matrix
- pilot presentation mode

Definition of done:
- demo-ready build with believable real workflows

## Calendar System Requirements
The calendar must support:
- coach availability
- assigned sessions
- jump schedule
- day view
- week view
- status chips
- drag or reschedule later if enabled
- task linkage from a session
- filter by dropzone, coach, athlete, status

Minimum calendar statuses:
- scheduled
- confirmed
- checked in
- in progress
- completed
- cancelled
- weather hold

## Coach Task System Requirements
Coach tasks must support:
- created by manager, ops, or system
- linked to session or athlete when relevant
- due time
- priority
- checklist support
- completion state
- note on completion

## Reporting Requirements
Mobile report forms must include:
- report type
- linked athlete or session
- linked load or jump if applicable
- performance notes
- safety notes
- recommendation
- status
- submitted by
- submitted at
- visibility rules

Report types:
- coaching session report
- post-jump debrief
- incident report
- ops issue report
- athlete progression note

## Dashboard Push Requirements
Dashboard/admin must be able to push to mobile:
- general announcement
- weather hold or lift
- coach reassignment
- load time change
- boarding alert
- document expiry reminder
- wallet or payment reminder

Each push must include:
- title
- body
- audience
- deep link destination
- priority
- sent at
- read state

## Mobile UX Rules
- no dense desktop tables on mobile
- cards and bottom sheets first
- most-used actions reachable within one thumb zone
- destructive actions need clear confirmation
- use plain labels, not backend jargon
- do not expose raw UUIDs to users
- every empty state should guide the next action
- every error state should provide retry or recovery

## Data and Sync Rules
- server remains source of truth
- use cache for read performance
- use offline queue for approved actions only
- manifest writes must use server acknowledgement
- duplicate mutation protection is mandatory for sensitive flows
- all enums shared from backend schema

## Security Rules
- secure token storage only
- biometric optional after first login
- no sensitive profile data in plain local storage
- role guard on both frontend and backend
- token refresh must be silent when possible
- revoked sessions must force re-auth

## Claude Execution Workflow
Claude must work in this exact cycle:
1. read repo and current files
2. compare against this master build file
3. choose only one phase at a time
4. list files to create or edit before coding
5. implement the phase
6. run local validation checks
7. output what was completed, what remains, and any blockers
8. stop only at phase boundary, never mid-flow without a recovery note

## Required Output Format from Claude per Phase
For each phase Claude must return:
- phase name
- scope implemented
- files created
- files edited
- APIs connected
- real-time events connected
- known issues
- manual QA steps
- next recommended phase

## Acceptance Rules
Claude must not say a feature is done if:
- button exists but no API call is wired
- UI exists but uses hardcoded data when real data was expected
- state changes do not persist
- role protection is missing
- deep links are not connected
- push opens wrong screen
- offline state silently loses writes

## Suggested Initial API Inventory to Confirm
- auth/login
- auth/register
- auth/refresh
- auth/me
- dropzones/current or accessible
- loads list
- load detail
- add slot to load
- remove slot from load
- athlete check-in
- athlete check-out
- wallet summary
- ticket summary
- weather current
- notifications register token
- notifications list
- calendar sessions list
- coach tasks list
- create report
- list reports

## Seed Data Requirement
Claude must build realistic seed states for:
- athlete with valid wallet and tickets
- athlete with expired doc warning
- coach with full day schedule
- coach with open tasks
- manager with two aircraft and weather change
- manifest staff with active boarding queue

## Final Goal
The final result is one mobile-first SkyLara product that feels operationally real, reuses the same business engine as web, supports athletes and coaches properly, lets the dashboard push live operational changes to phones, and is delivered phase by phase without re-arguing the structure.

## Master Prompt for Claude
Use this exact instruction as the working prompt:

You are the owner-level mobile product and engineering lead for SkyLara. Treat the existing web platform, backend APIs, event system, roles, and operational logic as the primary source of truth. Read the current repo, compare it to the SkyLara Mobile Master Build Process and the uploaded mobile implementation document, and build the mobile-first application phase by phase without duplicating backend logic or inventing a separate system. Reuse the same APIs, permissions, enums, statuses, and operational workflows wherever possible. The mobile product must support athletes, coaches, manifest staff, and DZ managers, with special priority on self-manifest for fun jumps, live load board visibility, dashboard-driven push notifications, coach calendars, tasks, assigned jumps, and mobile reporting. Before each phase, state what files you will create or edit. After each phase, validate wiring, state management, navigation, API integration, and real-time behavior. Never mark a feature complete if it is only UI without working backend integration. Never stop halfway through a phase without a recovery note that explains exactly what remains and where to continue.

## First Instruction to Claude
Start with Phase 0 only. Audit the current repository and uploaded mobile implementation document, produce a gap analysis against the master build process, identify reusable web APIs and missing mobile dependencies, confirm the canonical file structure, and propose the exact file-by-file implementation plan for Phase 1.
