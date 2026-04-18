# SkyLara_Rig_Maintenance_Complete_Master_File.md

# SkyLara Rig Maintenance Complete Master File

## Purpose
This is the single consolidated implementation file for the SkyLara Rig Maintenance module.

It combines:
- product scope
- operational flow
- rules engine logic
- statuses
- data model
- Prisma-style schema guidance
- API contract guidance
- event hooks
- notification design
- permissions
- UI surface map
- reporting
- implementation phases
- Claude implementation prompt

This file is intended to replace fragmented step-by-step notes and act as the one working source of truth for engineering and product implementation.

---

# 1. Product Goal

Build a production-grade rig maintenance tracking module for SkyLara that:

- automatically counts rig usage from real manifested jumps
- evaluates maintenance state using both jump-count rules and date-based rules
- warns users before maintenance is missed
- supports inspections, service logs, and counter resets
- surfaces status on athlete mobile, coach views, manifest, and dashboard
- supports DZ policy-based grounding and clearing
- preserves full audit history

The system must work across:
- athlete mobile
- coach mobile
- manifest
- dashboard
- DZ manager operations
- gear manager / rigger workflows

The system must reuse the same SkyLara:
- auth
- roles and permissions
- notification infrastructure
- manifest event flow
- reporting conventions
- mobile and dashboard API patterns

---

# 2. Canonical Product Principles

## 2.1 Use real operational data
Rig counters must increment only from real completed manifest events, not manual guesses or local-only state.

## 2.2 Use both jumps and time
Maintenance rules must support:
- jump-count triggers
- date/time triggers
- combined rules using either-or logic

## 2.3 Do not hardcode one global rule
Different components, rig types, line types, manufacturers, and operating environments require different thresholds.

## 2.4 Separate reminders from grounding
Use two levels:
- soft operational reminders
- hard compliance or policy states

## 2.5 Preserve full history
Every counter reset, grounding action, maintenance event, and manifest warning acknowledgment must be auditable.

## 2.6 One source of truth
Manifest, dashboard, and mobile must read the same backend maintenance truth.

---

# 3. Recommended Product Logic

## 3.1 Maintenance states
Every rig and component must evaluate into one visible state:

- OK
- DUE_SOON
- DUE_NOW
- OVERDUE
- GROUNDED

## 3.2 Priority order
If multiple rules apply, final visible state priority is:

1. GROUNDED
2. OVERDUE
3. DUE_NOW
4. DUE_SOON
5. OK

## 3.3 Meaning of states
- OK: no action needed
- DUE_SOON: warning threshold reached
- DUE_NOW: maintenance should be scheduled now
- OVERDUE: threshold exceeded and unresolved
- GROUNDED: rig or component cannot be used until cleared by authorized workflow or policy exception

## 3.4 Default starter rules
These are starter templates, not platform-wide mandatory rules.

### Main canopy inspection
- due soon at 40 jumps or 72 days
- due now at 50 jumps or 90 days
- overdue at 60 jumps or 105 days
- hard stop false by default

### Line set inspection
- due soon at 40 jumps
- due now at 50 jumps
- overdue at 60 jumps
- hard stop false by default

### Reserve repack
- due soon based on configurable date lead window
- due now at due date
- overdue after due date
- hard stop true if required by DZ or compliance policy

### AAD service
- due soon based on configurable date lead window
- due now at service due date
- overdue after due date
- hard stop true if required by DZ or compliance policy

## 3.5 Rule evaluation pattern
For a 50-jump rule:
- 0 to 39 = OK
- 40 to 49 = DUE_SOON
- 50 = DUE_NOW
- 51+ = OVERDUE
- GROUNDED only when hard-stop rule or manual/policy grounding exists

For a 90-day rule:
- 0 to 71 = OK
- 72 to 89 = DUE_SOON
- 90 = DUE_NOW
- 91+ = OVERDUE
- GROUNDED only when hard-stop rule or manual/policy grounding exists

---

# 4. Full Operational Flow

## 4.1 Rig creation
A user, rigger, gear manager, or admin creates a rig.

Minimum fields:
- owner
- dropzone
- rig name
- rig type
- active status

Optional but recommended:
- container
- main canopy
- reserve
- AAD
- line set details
- notes

## 4.2 Baseline maintenance setup
Authorized user enters:
- last full rig inspection date
- last main canopy inspection date
- last line set install date
- jump count at line set install
- reserve repack date and due date
- AAD service date and next due date
- optional battery due date
- optional rigger contact
- notes

## 4.3 Apply policy
System applies one or more:
- DZ default rules
- rig-type rules
- owner custom rules
- rigger custom rules
- manufacturer-guided rules

## 4.4 Manifest selection
When a rig is selected in self-manifest or staff manifest:
- current status loads immediately
- status chip appears beside rig
- short reason is shown when not OK
- if grounded, manifest is blocked unless override policy exists

## 4.5 Jump completion
When jump status becomes completed:
- rig total jumps increment
- main canopy total jumps increment
- line set jumps increment
- immutable rig usage event is stored
- rules are re-evaluated
- threshold-change notifications dispatch if needed

## 4.6 Maintenance event
Authorized user records:
- inspection
- service
- line set replacement
- reserve repack
- AAD service
- manual grounding
- clearing action
- notes
- findings
- reset actions

## 4.7 Reporting and visibility
Latest status becomes visible in:
- athlete rig list
- rig detail
- coach athlete view
- manifest
- maintenance queue
- DZ dashboard
- reports
- push / in-app notifications

---

# 5. Entity Model

## 5.1 Rig
- rigId
- ownerUserId
- dropzoneId
- rigName
- rigType
- activeStatus
- isSharedRig
- defaultManifestSelectable
- notes
- createdAt
- updatedAt

## 5.2 Container
- containerId
- rigId
- manufacturer
- model
- serialNumber
- manufactureDate
- size
- serviceNotes

## 5.3 Main Canopy
- mainCanopyId
- rigId
- manufacturer
- model
- size
- serialNumber
- fabricType
- lineType
- installDate
- totalJumps
- jumpsSinceInspection
- jumpsSinceReline
- lastInspectionDate
- lastRelineDate
- notes

## 5.4 Reserve
- reserveId
- rigId
- manufacturer
- model
- serialNumber
- installDate
- repackDate
- repackDueDate
- inspectionNotes

## 5.5 AAD
- aadId
- rigId
- manufacturer
- model
- serialNumber
- installDate
- lastServiceDate
- nextServiceDueDate
- batteryDueDate
- endOfLifeDate
- notes

## 5.6 Maintenance Rule
- maintenanceRuleId
- rigId nullable
- componentType
- ruleType
- triggerByJumps nullable
- triggerByDays nullable
- dueSoonPercent
- overduePercent nullable
- hardStop
- enabled
- sourceType
- appliesToRigType nullable
- notes
- createdByUserId
- createdAt
- updatedAt

## 5.7 Maintenance Event
- maintenanceEventId
- rigId
- componentType
- maintenanceType
- eventDate
- result
- findings
- actionTaken
- performedByUserId nullable
- performedByName
- signatureUrl nullable
- attachmentUrls
- resetCounterTypes
- notes
- createdAt

## 5.8 Rig Jump Usage Event
- rigJumpUsageEventId
- rigId
- jumpId
- loadId
- userId
- completedAt
- rigTotalAfter
- mainTotalAfter
- lineSetAfter
- linkedMaintenanceStatusSnapshot
- createdAt

## 5.9 Grounding Record
- groundingRecordId
- rigId
- componentType
- reason
- policySource
- groundedByUserId
- groundedAt
- clearedAt nullable
- clearedByUserId nullable
- clearanceNotes nullable
- active boolean

---

# 6. Suggested Enums

## 6.1 RigType
- SPORT
- TANDEM
- STUDENT
- RENTAL
- OTHER

## 6.2 RigActiveStatus
- ACTIVE
- INACTIVE
- RETIRED

## 6.3 ComponentType
- RIG
- CONTAINER
- MAIN
- LINESET
- RESERVE
- AAD
- BRAKE_LINES
- RISERS
- CUSTOM

## 6.4 MaintenanceRuleType
- INSPECTION
- REPLACEMENT_REMINDER
- SERVICE
- COMPLIANCE
- GROUNDING_POLICY

## 6.5 MaintenanceResult
- PASSED
- MONITOR
- SERVICE_REQUIRED
- DUE_SOON
- DUE_NOW
- OVERDUE
- GROUNDED
- COMPLETED

## 6.6 MaintenanceStatus
- OK
- DUE_SOON
- DUE_NOW
- OVERDUE
- GROUNDED

## 6.7 RuleSourceType
- DZ_DEFAULT
- MANUFACTURER
- RIGGER
- OWNER
- ADMIN

---

# 7. Prisma-Style Schema Guidance

```prisma
model Rig {
  id                     String   @id @default(cuid())
  ownerUserId            String
  dropzoneId             String?
  rigName                String
  rigType                RigType
  activeStatus           RigActiveStatus @default(ACTIVE)
  isSharedRig            Boolean  @default(false)
  defaultManifestSelectable Boolean @default(true)
  notes                  String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  container              RigContainer?
  mainCanopy             RigMainCanopy?
  reserve                RigReserve?
  aad                    RigAAD?
  maintenanceRules       MaintenanceRule[]
  maintenanceEvents      MaintenanceEvent[]
  usageEvents            RigJumpUsageEvent[]
  groundingRecords       RigGroundingRecord[]
}

model RigContainer {
  id             String   @id @default(cuid())
  rigId          String   @unique
  manufacturer   String?
  model          String?
  serialNumber   String?
  manufactureDate DateTime?
  size           String?
  serviceNotes   String?
  rig            Rig      @relation(fields: [rigId], references: [id], onDelete: Cascade)
}

model RigMainCanopy {
  id                    String   @id @default(cuid())
  rigId                 String   @unique
  manufacturer          String?
  model                 String?
  size                  String?
  serialNumber          String?
  fabricType            String?
  lineType              String?
  installDate           DateTime?
  totalJumps            Int      @default(0)
  jumpsSinceInspection  Int      @default(0)
  jumpsSinceReline      Int      @default(0)
  lastInspectionDate    DateTime?
  lastRelineDate        DateTime?
  notes                 String?
  rig                   Rig      @relation(fields: [rigId], references: [id], onDelete: Cascade)
}

model RigReserve {
  id             String   @id @default(cuid())
  rigId          String   @unique
  manufacturer   String?
  model          String?
  serialNumber   String?
  installDate    DateTime?
  repackDate     DateTime?
  repackDueDate  DateTime?
  inspectionNotes String?
  rig            Rig      @relation(fields: [rigId], references: [id], onDelete: Cascade)
}

model RigAAD {
  id                 String   @id @default(cuid())
  rigId              String   @unique
  manufacturer       String?
  model              String?
  serialNumber       String?
  installDate        DateTime?
  lastServiceDate    DateTime?
  nextServiceDueDate DateTime?
  batteryDueDate     DateTime?
  endOfLifeDate      DateTime?
  notes              String?
  rig                Rig      @relation(fields: [rigId], references: [id], onDelete: Cascade)
}

model MaintenanceRule {
  id               String              @id @default(cuid())
  rigId            String?
  componentType    ComponentType
  ruleType         MaintenanceRuleType
  triggerByJumps   Int?
  triggerByDays    Int?
  dueSoonPercent   Int                 @default(80)
  overduePercent   Int?
  hardStop         Boolean             @default(false)
  enabled          Boolean             @default(true)
  sourceType       RuleSourceType
  appliesToRigType RigType?
  notes            String?
  createdByUserId  String
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  rig              Rig?                @relation(fields: [rigId], references: [id], onDelete: Cascade)
}

model MaintenanceEvent {
  id                String            @id @default(cuid())
  rigId             String
  componentType     ComponentType
  maintenanceType   String
  eventDate         DateTime
  result            MaintenanceResult
  findings          String?
  actionTaken       String?
  performedByUserId String?
  performedByName   String?
  signatureUrl      String?
  attachmentUrls    Json?
  resetCounterTypes Json?
  notes             String?
  createdAt         DateTime          @default(now())

  rig               Rig               @relation(fields: [rigId], references: [id], onDelete: Cascade)
}

model RigJumpUsageEvent {
  id                             String   @id @default(cuid())
  rigId                          String
  jumpId                         String
  loadId                         String?
  userId                         String
  completedAt                    DateTime
  rigTotalAfter                  Int
  mainTotalAfter                 Int?
  lineSetAfter                   Int?
  linkedMaintenanceStatusSnapshot Json?
  createdAt                      DateTime @default(now())

  rig                            Rig      @relation(fields: [rigId], references: [id], onDelete: Cascade)

  @@unique([rigId, jumpId])
}

model RigGroundingRecord {
  id               String   @id @default(cuid())
  rigId            String
  componentType    ComponentType
  reason           String
  policySource     String?
  groundedByUserId String
  groundedAt       DateTime @default(now())
  clearedAt        DateTime?
  clearedByUserId  String?
  clearanceNotes   String?
  active           Boolean  @default(true)

  rig              Rig      @relation(fields: [rigId], references: [id], onDelete: Cascade)
}
```

---

# 8. API Contract Guidance

## 8.1 Read endpoints

### GET /rigs
List rigs available to current user.

Query params:
- ownerUserId
- dropzoneId
- rigType
- status
- includeGrounded
- page
- limit

### GET /rigs/:rigId
Return full rig detail with components and status summary.

### GET /rigs/:rigId/status
Return resolved current rig and component statuses.

### GET /rigs/:rigId/maintenance-rules
Return active and inactive rules.

### GET /rigs/:rigId/maintenance-events
Return chronological maintenance history.

### GET /rigs/due
Return due and overdue rigs filtered by role and DZ scope.

### GET /rigs/grounded
Return grounded rigs.

### GET /maintenance/summary
Return dashboard summary:
- due soon count
- due now count
- overdue count
- grounded count
- reserve repack upcoming
- AAD service upcoming

## 8.2 Write endpoints

### POST /rigs
Create rig.

### PATCH /rigs/:rigId
Edit rig and top-level fields.

### POST /rigs/:rigId/components
Create or replace component record.

### PATCH /rigs/:rigId/components/:componentId
Edit component details.

### POST /rigs/:rigId/maintenance-rules
Create maintenance rule.

### PATCH /maintenance-rules/:ruleId
Edit rule.

### POST /rigs/:rigId/maintenance-events
Create maintenance event and optionally reset counters.

### POST /rigs/:rigId/ground
Ground rig or component.

### POST /rigs/:rigId/clear-grounding
Clear active grounding record.

---

# 9. Event Hooks and Counter Logic

## 9.1 Trigger source
Use real completed manifest or jump-completion event already present in SkyLara.

## 9.2 Counter update transaction
When jump is completed:
1. verify selected rig
2. lock rig record transactionally
3. increment:
   - rig total
   - main total where applicable
   - line-set counter where applicable
4. write immutable RigJumpUsageEvent
5. re-evaluate maintenance rules
6. write changed status snapshot
7. dispatch threshold notifications if state changed

## 9.3 Idempotency
The system must prevent double counting:
- one rig + one jump = one usage event
- enforce unique index on rigId + jumpId

## 9.4 Reversal handling
If a completed jump is later voided by admin:
- create compensating adjustment record
- never silently delete history
- preserve audit trail

---

# 10. Manifest Logic

## 10.1 Athlete self-manifest
If rig status is:
- OK: allow
- DUE_SOON: allow, passive warning
- DUE_NOW: allow with acknowledgment if policy allows
- OVERDUE: allow with stronger acknowledgment if policy allows
- GROUNDED: block

## 10.2 Staff manifest
Staff can see:
- rig status chip
- summary reason
- due counters
- related component
- escalation option to gear manager

## 10.3 Audit logging
Track:
- who attempted to use grounded gear
- who acknowledged DUE_NOW or OVERDUE warning
- who overrode if override policy exists
- time and policy basis

---

# 11. Notifications

## 11.1 Triggers
- due soon threshold reached
- due now threshold reached
- overdue threshold reached
- reserve repack due window begins
- AAD service due window begins
- rig grounded
- grounding cleared
- maintenance completed

## 11.2 Delivery channels
- in-app notification
- push notification
- dashboard alert
- daily digest summary

## 11.3 Recipients
- rig owner
- assigned coach when relevant
- manifest staff for same-day operational issues
- gear manager / rigger
- DZ manager

## 11.4 Notification payload suggestion
- type
- title
- body
- rigId
- componentType
- currentStatus
- thresholdReason
- deepLink
- createdAt
- readAt nullable

---

# 12. Permissions

## Athlete
- view own rigs
- create/edit own private rigs if enabled
- view own statuses and history
- cannot clear grounding by default

## Coach
- view assigned athlete rig status
- no maintenance editing by default

## Manifest Staff
- view statuses and block reasons
- acknowledge warning if policy allows
- no counter reset by default

## Gear Manager / Rigger
- create maintenance events
- edit rule thresholds where permitted
- ground and clear gear
- reset counters with audit log

## DZ Manager
- configure DZ defaults
- view all DZ rigs
- access reports
- optional override rights by policy

## Admin
- full access

---

# 13. UI Surface Map

## Athlete Mobile
- My Rigs
- Rig Detail
- Maintenance Status Card
- Due Soon / Due Now alerts
- Maintenance History

## Coach Mobile
- Athlete Gear Status in session/day view
- warning if assigned athlete rig is overdue or grounded

## Manifest
- rig chip in jumper card
- warning modal
- grounding block screen
- filter by due / grounded

## Gear Manager / Rigger
- maintenance queue
- due this week
- overdue
- grounded
- rig detail editor
- maintenance event entry
- due calendar

## DZ Manager / Dashboard
- maintenance overview
- critical issues panel
- reserve repack calendar
- AAD service calendar
- overdue and grounded summary
- export center

---

# 14. Reporting Requirements

Build:
- rigs due in next 7 days
- rigs due in next 30 days
- overdue rigs
- grounded rigs
- maintenance history by rig
- service events by component type
- jump count since last inspection
- reserve repack calendar
- AAD service calendar
- CSV export
- PDF export if supported by document pipeline

---

# 15. Offline and Sync Rules

- cached rig status may be shown read-only offline
- manifest decisions must require server confirmation
- maintenance edits require backend confirmation
- grounded-state clearing must never succeed locally only
- safe draft actions may queue offline, such as note capture
- unsafe compliance actions must wait for confirmed server response

---

# 16. Seed Data Recommendations

Include:
- private sport rig with line set inspection due soon
- tandem rig with broader manufacturer-style replacement reminder
- student rig with reserve repack due
- sport rig with overdue canopy inspection
- grounded rental rig
- athlete with multiple rigs

---

# 17. Delivery Phases

## Phase 1
- schema changes
- enums
- status engine shape
- endpoint map
- permissions matrix

## Phase 2
- rig and component CRUD
- rig detail view
- status summary endpoints

## Phase 3
- maintenance rules CRUD
- default policy templates
- calculation service

## Phase 4
- completed-jump hook
- immutable usage events
- live status recomputation

## Phase 5
- manifest warning and block flows
- acknowledgment logging
- policy-based grounding logic

## Phase 6
- maintenance event form
- reset logic
- ground / clear workflows
- attachments/signature support or placeholder

## Phase 7
- dashboard reports
- due / overdue / grounded views
- export
- calendars
- notification summaries

---

# 18. Acceptance Criteria

This module is not complete unless:
- counters increment from real completed jumps
- status recalculates correctly
- grounded rigs can be blocked in manifest
- reset operations preserve prior values in history
- dashboard and mobile show the same status truth
- permissions are enforced
- notifications fire on threshold transition
- there is no fake UI-only completion

---

# 19. Claude Implementation Prompt

Use this as the implementation prompt:

Act as the owner-level product manager, systems architect, and engineering lead for SkyLara.

Design and implement a complete Rig Maintenance Tracking module fully integrated with the existing SkyLara platform, including manifest, athlete accounts, equipment records, notifications, dashboard reporting, and mobile-first workflows.

Mission:
Build a production-grade rig maintenance system that automatically tracks rig and component usage from real manifested jumps and generates maintenance reminders, warnings, and policy-based grounding decisions using both jump-count thresholds and date-based thresholds.

Requirements:
- support rig and component records
- support configurable rules per rig or component
- integrate with real manifest completion events
- calculate statuses: OK, Due Soon, Due Now, Overdue, Grounded
- show rig status in athlete mobile, coach views, manifest, and dashboard
- support maintenance event logging, counter resets, grounding, and clearing
- support notifications and reports
- reuse existing SkyLara auth, permissions, and notification infrastructure
- never mark a feature complete unless backend persistence and operational wiring are real

Before coding:
- inspect current repo
- identify reusable APIs and models
- list schema additions
- list files to create or edit
- identify conflicts with current equipment or manifest logic

After each phase:
- show implemented scope
- show files created and edited
- show APIs connected
- show QA steps
- show open issues
- show next phase recommendation
