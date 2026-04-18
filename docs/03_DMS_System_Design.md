# SkyLara

_Source: 03_DMS_System_Design.docx_

SkyLara
Dropzone Manifest System
Advanced Operational Workflow & System Design
Full Platform Integration Specification
# Table of Contents
# 1. Executive Summary
SkyLara is more than a booking platform — it captures the journey behind every flyer, their growth, challenges, and story. The Dropzone Manifest System (DMS) is the operational backbone of this vision, transforming how dropzones manage their daily flight operations from the moment athletes arrive to the moment they land.
This document defines the complete architecture, workflow, data models, and integration strategy for the SkyLara DMS. It covers four core modules that work in concert to eliminate paper manifest boards, reduce miscommunication, automate scheduling, and create a richer connected experience for every athlete, coach, tandem master, and DZ operator on the platform.
# 2. Dropzone Operations Overview
A dropzone is a high-throughput operational environment where safety, timing, and coordination are paramount. Understanding the full operational lifecycle is the foundation for building any manifest system.
## 2.1 The Operational Day — End-to-End Flow
Each operational day at a dropzone follows a predictable but dynamic cycle. The DMS must support all phases simultaneously across multiple concurrent loads and aircraft.
## 2.2 Stakeholders & Roles
The DMS serves multiple distinct user types within the SkyLara ecosystem, each with different permissions and workflows.
# 3. Module 1 — Load Manifest Board
The Load Manifest Board is the real-time operational heart of the DMS. It replaces the traditional whiteboard with a dynamic, automated system that manages aircraft capacity, jump type compatibility, exit ordering, and call time logistics.
## 3.1 Aircraft Configuration
Each dropzone registers their fleet within SkyLara. Every aircraft profile drives capacity and jump run logic.
## 3.2 Slot Types & Compatibility
Not all jump types are compatible on the same load, and exit altitude requirements vary. The DMS enforces compatibility rules automatically.
## 3.3 Load Lifecycle & Status Engine
Every load progresses through a defined status chain. The system enforces transitions and triggers automated actions at each stage.
## 3.4 Exit Order Algorithm
Safe separation on jump run requires precise exit ordering. The system calculates and displays the recommended exit order automatically based on group type, deployment altitude, and canopy speed.
Exit Order Priority (highest altitude first, then working down):
Wingsuits (highest, need most horizontal separation)
Tracking groups
AFF students (early for instructor safety management)
Freefly groups (smaller, higher-speed canopies)
Belly/RW formations
Tandems (large canopies, need separation from above)
Coach jumps
CRW / Canopy groups (lowest altitude, exit last)
Hop & Pop slots (break off at lower altitude, exit separately)
The system enforces a minimum 5-second delay between groups by default, configurable per DZ. Exit order is displayed on the pilot-facing manifest view and the load board screen.
# 4. Module 2 — Jumper & License Tracking
Every athlete on SkyLara has a rich profile that doubles as their jump credential. The DMS pulls from this profile to verify compliance before any jumper is placed on a load.
## 4.1 USPA License Levels & Minimum Requirements
## 4.2 Currency Tracking
USPA and many DZs require jumpers to maintain currency to jump without additional oversight. The system tracks and enforces these rules automatically.
## 4.3 Jumper Profile — Data Fields
Each SkyLara athlete profile stores the following manifest-relevant data:
## 4.4 Gear Check Workflow
Before any jumper boards a load, a gear check must be completed or verified as current. The DMS enforces this digitally.
Jumper checks in at DZ. DMS pulls last gear check date from profile.
If gear check < 24 hours old: auto-approved for current day.
If gear check needed: jumper assigned to gear check queue. Manifest blocked.
Rigger opens gear check form in DMS. Confirms: reserve pack date, AAD armed, container closed, pin cover secure, cutaway / reserve handles visible.
Rigger digitally signs gear check. Jumper profile updated with timestamp.
Reserve repack reminders are sent automatically 30 days and 7 days before the 180-day repack deadline. Jumpers with expired reserves are blocked from manifesting regardless of other status.
## 4.5 AFF Student Progression
AFF students progress through a defined curriculum. The DMS tracks each level and gates progression on instructor evaluation.
# 5. Module 3 — Payments & Jump Tickets
The payment module handles all financial transactions at the dropzone — from jump ticket purchases and tandem bookings to instructor fees, packer commissions, and end-of-day reconciliation. It integrates with SkyLara's platform wallet and supports both pre-paid and on-the-day purchasing.
## 5.1 Jump Ticket System
Jump tickets are the primary currency for licensed jumpers. They are pre-purchased in packages and deducted at time of manifesting.
## 5.2 Tandem & Student Booking Flow
Tandem and AFF student experiences are typically pre-booked and involve more complex payment logic including instructor commissions and video add-ons.
Customer selects experience online (tandem or AFF package) on SkyLara booking page.
System displays available slots, instructor availability, and pricing.
Customer provides participant details, selects video/photo add-ons, and pays deposit or full amount.
Booking confirmed. Digital waiver sent via email/SMS for pre-signing.
On day of jump: check-in scans QR code. DMS links booking to manifest slot automatically.
## 5.3 Payment States & Lifecycle
## 5.4 End-of-Day Reconciliation
At close of operations, the DMS generates a complete financial summary for the DZ operator.
Total loads flown and total jumps completed
Gross revenue breakdown: tandems, licensed jumps, AFF, courses, video
Instructor commissions due and packer fees collected
Jump tickets sold vs. redeemed (inventory reconciliation)
Refunds and weather credits issued
Net DZ revenue after splits
# 6. Module 4 — Notifications & Scheduling
Automation is the differentiator of the SkyLara DMS. Where traditional dropzones rely on loudspeaker announcements and manual call-outs, SkyLara delivers intelligent, personalized notifications to every stakeholder at exactly the right moment.
## 6.1 Automated Call Time System
Call times are calculated from estimated load departure time, factoring in aircraft turnaround, climb rate, and slot type preparation time. The system pushes notifications automatically.
## 6.2 Weather Hold Protocol
Weather holds are a daily reality at dropzones. The DMS handles holds with automated communication and intelligent slot management.
Manifest staff or S&TA triggers weather hold on one or all loads.
All affected jumpers notified immediately via push and SMS: "Operations on hold — weather. We'll update you every 30 minutes."
System sends status update to all active jumpers every 30 minutes until hold lifted.
When hold lifted: loads resume with adjusted estimated departure times. New call times recalculated.
If hold exceeds 2 hours (configurable): system offers jumpers the option to cancel and receive full credit to wallet.
## 6.3 Online Pre-Manifesting
SkyLara allows licensed jumpers to pre-manifest from anywhere — at home, in the car, or from the packing area. This reduces queue congestion and allows DZs to forecast load demand.
Jumper opens SkyLara app, selects DZ, views upcoming loads
Selects preferred jump type and altitude. System validates currency and license.
Jump ticket reserved. Confirmation sent. Jumper added to load queue.
Pre-manifest window opens 24 hours before operations start. DZ operators can enable or disable this feature per day. A 15-minute check-in confirmation is required on arrival day — if not confirmed, the slot is released to walk-ups.
## 6.4 Staff Scheduling
The DMS includes a lightweight staff scheduling tool to ensure adequate instructor, pilot, and rigger coverage per operational day.
# 7. Core Data Models
The following data entities form the backbone of the DMS. All models integrate with the existing SkyLara user and identity layer.
## 7.1 Entity Relationship Summary
# 8. System Architecture & SkyLara Integration
The DMS is built as a set of integrated services within the SkyLara platform, leveraging the existing identity layer, notification infrastructure, and payment system while adding dropzone-specific operational logic.
## 8.1 Service Architecture
## 8.2 Platform Integration Points
## 8.3 API Design Principles
RESTful JSON API with versioned endpoints (/api/v1/manifest/...)
WebSocket connections for real-time load board updates (manifest display screen)
Webhook events for key transitions: load.locked, load.airborne, load.complete, jumper.manifested
All compliance checks performed as pre-manifest guard hooks — blocking and non-blocking modes
Event sourcing for load history — full audit trail for every status change and slot modification
# 9. Implementation Roadmap
The DMS is delivered in three phases, prioritizing core operational value in Phase 1 and building toward full automation in Phases 2 and 3.
## Phase 1 — Core Manifest (Weeks 1–8)
## Phase 2 — Automation & Intelligence (Weeks 9–16)
## Phase 3 — Platform Depth (Weeks 17–24)
Effort Key: S = Small (1–3 days), M = Medium (1–2 weeks), L = Large (2–4 weeks). Priority: P0 = Must-have, P1 = Should-have, P2 = Nice-to-have, P3 = Future consideration.
# 10. Open Questions & Decisions Needed
The following items require input from DZ operators, legal, and product leadership before detailed design can be finalized.
SkyLara Dropzone Manifest System — System Design v1.0  |  April 2026  |  Confidential

| Version 1.0 | Date April 2026 | Status Draft |
| --- | --- | --- |

| Module | Purpose |
| --- | --- |
| Load Manifest Board | Real-time aircraft load management, slot allocation, exit order, and call time automation |
| Jumper & License Tracking | USPA license verification, gear checks, currency tracking, AFF progression, and waiver management |
| Payments & Jump Tickets | Jump ticket packages, tandem bookings, instructor and packer fee management, and end-of-day reporting |
| Notifications & Scheduling | Automated SMS/push call times, weather hold alerts, online pre-manifesting, and staff scheduling |

| Phase | Stage | DMS Actions |
| --- | --- | --- |
| 1 | Arrival & Check-In | Athlete scans QR / checks in via app. System verifies license, currency, and waiver status. Flags any compliance issues before manifesting. |
| 2 | Gear Check | Rigger or S&TA performs gear check. DMS logs reserve pack date, container type, AAD status, and approves jumper for flight. |
| 3 | Manifesting | Jumper selects jump type and altitude. System assigns to next available load with compatible slots. Payment is charged or ticket deducted. |
| 4 | Load Building | Manifest staff or auto-system fills slots by jump type. Exit order calculated (AFF exits first, belly groups, freefly, CRW). Load locked when aircraft capacity reached. |
| 5 | Call Times | Automated notifications sent: 30-minute call (gear up), 20-minute call (board soon), 10-minute call (board now). Door call sent to pilots. |
| 6 | Flight & Jump | Load marked as airborne. Aircraft altitude and jump run tracked. Individual exit slots confirmed. |
| 7 | Landing & Debrief | Athletes land and log jumps. System updates jump count, currency, and progression. Coaches submit AFF evaluations. |
| 8 | Re-Manifest | Jumper returns to manifest queue for next load. Full cycle repeats. End-of-day generates revenue and jump reports. |

| Role | SkyLara Profile | DMS Capabilities |
| --- | --- | --- |
| DZ Operator | Business Account | Full admin: configure aircraft, set pricing, view all loads, run reports, manage staff |
| Manifest Staff | Staff Account | Build loads, manage slots, issue refunds, handle walk-ups, override call times |
| Tandem Master / TI | Coach Profile | View assigned students, manage jump tickets for students, submit waiver confirmations |
| AFF Instructor (AFFI) | Coach Profile | View assigned students, submit progression evaluations, co-manifest with students |
| Licensed Jumper | Athlete Profile | Self-manifest, view load board, receive call time notifications, log jumps |
| Student (AFF/Tandem) | Athlete Profile | Pre-book, receive check-in instructions, view student progression dashboard |
| Pilot | Staff Account | View load manifests, confirm boarding, log flight times and aircraft status |
| Rigger / S&TA | Staff Account | Perform and log gear checks, flag equipment issues, manage reserve repack schedule |

| Field | Description |
| --- | --- |
| Tail Number | Unique aircraft identifier (e.g., N12345) |
| Aircraft Type | Otter, Caravan, King Air, Skyvan, helicopter, etc. |
| Capacity | Maximum jumper slots (e.g., 22 for Twin Otter). Tandem pairs count as 2. |
| Jump Altitudes | Available exit altitudes (7,500 / 10,000 / 13,500 / 15,000 ft). Pricing varies by altitude. |
| Jump Run Direction | Determines exit order based on canopy deployment altitude and group type. |
| Climb Rate | Used to calculate accurate call times. Average ~1,500 ft/min. |
| Turnaround Time | Estimated time from landing to next load departure. Informs load scheduling. |

| Slot Type | Min Altitude | Slots Used | Notes |
| --- | --- | --- | --- |
| Tandem Jump | 10,000 ft | 2 (TI + student) | Priority loading. TM and student manifest together. |
| AFF Level 1-4 | 13,500 ft | 2–3 (student + AFFI(s)) | Levels 1-4 require 2 instructors. Levels 5-7 require 1. |
| Coach Jump | 10,000 ft | 2 (coach + student) | USPA coach rating required. |
| Belly / RW | 10,000 ft | 1 per jumper | Group formation — coordinate exit timing. |
| Freefly | 13,500 ft | 1 per jumper | Head-down / sit-fly. Higher exit for separation. |
| Wingsuit | 13,500 ft | 1 per jumper | Special separation rules. First group out on jump run. |
| CRW / Canopy | 7,500 ft | 1 per jumper | Lower altitude, exits last. Separate landing area often required. |
| Hop & Pop | 3,500 ft | 1 per jumper | Immediate deployment. Different jump run exit timing. |

| Status | Trigger | Automated Actions |
| --- | --- | --- |
| OPEN | Load created | Visible in manifest board. Jumpers can add themselves. Payment holds placed. |
| FILLING | First slot filled | Real-time slot counter updates for manifest staff and self-manifesting app. |
| LOCKED | Capacity reached or manual lock | No new additions. Waitlist queue activated. Payments captured. |
| 30 MIN CALL | Auto: 30 min before est. departure | Push notifications + SMS to all jumpers on load. Staff screen highlights load. |
| 20 MIN CALL | Auto: 20 min before departure | Second alert wave. Manifest staff reminder to confirm all jumpers checked in. |
| 10 MIN CALL | Auto: 10 min before departure | Final boarding alert. Any no-show slots automatically offered to waitlist. |
| BOARDING | Pilot confirms / manual | Manifest locked. Passenger list transmitted to pilot. No further changes. |
| AIRBORNE | Pilot check-in | Timer starts. Jump run ETA calculated. All slots marked in-flight. |
| LANDED | Pilot / auto GPS | Jump counts incremented. Currency updated. AFF eval forms opened for instructors. |
| COMPLETE | All jumpers confirmed landed | Load archived. Revenue recorded. Jumpers eligible for re-manifest. |
| CANCELLED | Manual / weather hold | All payments refunded to jump ticket balance. Notifications sent. Slots released. |

| License | Min Jumps | Min Age | Key Restrictions |
| --- | --- | --- | --- |
| Student | 0 (AFF or Tandem) | 18+ | Must jump with rated instructor. No self-manifesting. |
| A License | 25 jumps | 18+ | No night jumps, no water jumps, no demo jumps. Max group size 4. |
| B License | 200 jumps | 18+ | Night jumps allowed. Can coach A-license holders. No wingsuit solo. |
| C License | 500 jumps | 18+ | Demo jumps allowed. Can operate as jump master. Wingsuit allowed. |
| D License | 200+ (varies) | 18+ | Full privileges. Required for examiner and S&TA roles. |

| Currency Rule | DMS Enforcement |
| --- | --- |
| 90-day rule (A/B license) | If last jump > 90 days ago: system flags jumper, requires check-in with S&TA before manifesting. Status shown on load board. |
| 180-day rule (unlicensed) | Students inactive > 180 days must restart AFF progression. Manifest blocked automatically. |
| Night jump currency | System tracks date of last logged night jump. Auto-flag if expired per USPA SIM guidelines. |
| Water jump currency | DZ-specific requirement. Configurable per dropzone in admin settings. |
| Canopy currency | Optional tracking for high-performance canopy flyers. Set by DZ per local policy. |

| Field | Type | Notes |
| --- | --- | --- |
| USPA Member Number | String | Verified against USPA API (or manual entry). Required for licensed jumpers. |
| License Level & Issue Date | Enum + Date | A / B / C / D / Student / None |
| Total Jump Count | Integer | Cumulative across all DZs. Self-reported + DMS verified. |
| Last Jump Date | Date | Drives currency calculations. |
| Home DZ | FK: Dropzone | Allows preferred DZ settings and loyalty tracking. |
| Gear Configuration | Object | Container make/model, reserve pack date, AAD type/expiry, canopy type/size. |
| Medical Declaration | Boolean + Date | Annual self-declaration of fitness to skydive. |
| Active Waivers | Array: FK Waiver | Per-DZ waivers. System blocks manifest if waiver not signed for that DZ. |
| AFF Progression Stage | Enum (0–8) | Tracked for students. Unlocks next level jump when AFFI submits pass eval. |
| Instructor Ratings | Array: Enum | TI, AFFI, Coach, Examiner, S&TA — drives what slots the person can fill. |

| Level | Instructors | Key Skills Tested | DMS Unlock Condition |
| --- | --- | --- | --- |
| L1 | 2 AFFI | Arch, altitude awareness, pull | Both AFFIs submit PASS evaluation |
| L2 | 2 AFFI | Circle of awareness, turns | Both AFFIs submit PASS evaluation |
| L3 | 2 AFFI | Forward movement, docking | Both AFFIs submit PASS evaluation |
| L4 | 1 AFFI | Solo turns, back loops | Lead AFFI submits PASS evaluation |
| L5 | 1 AFFI | Unstable exits, tracking | Lead AFFI submits PASS evaluation |
| L6 | 1 AFFI | Barrel rolls, back to earth | Lead AFFI submits PASS evaluation |
| L7 | 1 AFFI | Solo exit, full awareness | Lead AFFI submits PASS evaluation |
| Solos 1-10 | None (supervised) | Consolidation jumps | 10 solo consolidation jumps logged |
| A License | Examiner | Written + oral exam | 25 total jumps + exam passed + USPA member number assigned |

| Package | Tickets | Pricing Model | Notes |
| --- | --- | --- | --- |
| Single Jump | 1 | Full rate per altitude | Walk-up / ad hoc purchase. No discount. |
| Block 10 | 10 | 5–10% discount | Tickets stored in SkyLara wallet. No expiry. |
| Block 20 | 20 | 10–15% discount | Common for regular fun jumpers. |
| Season Pass | Unlimited | Fixed monthly / annual fee | DZ-configurable. Unlimited jumps or set number per day. |
| Staff Rate | Varies | Discounted / free | Applied automatically to staff accounts per DZ config. |

| Payment Component | Logic |
| --- | --- |
| Tandem Jump Price | Base price set by DZ. Split between DZ revenue and TI commission per configured rate (e.g., 40/60). |
| Video Package | Separate line item. Split between videographer and DZ per agreement. |
| AFF Course | Package price includes all levels. Level re-do fees billed separately at manifest time. |
| Instructor Commission | Calculated at load complete. Held in escrow until end-of-day reconciliation. |
| Packer Fee | Packer tags parachute system. Fee charged to jumper account and credited to packer. |

| State | Description |
| --- | --- |
| PENDING | Jumper added to load. Payment authorization held but not captured. |
| CAPTURED | Load locked. Payment captured. Ticket deducted from wallet. |
| SETTLED | Load complete. Commission splits processed. Revenue recorded. |
| REFUNDED | Load cancelled or jumper removed. Funds returned to wallet or original payment method. |
| CREDITED | Jump ticket re-credited to wallet (weather hold, no-show lift). |

| Call | Time Before Dept. | Channels | Message Content |
| --- | --- | --- | --- |
| 30 Min Call | 30 minutes | Push + SMS | "Load [#] — 30 minutes. Start gearing up. Aircraft: [tail]. Altitude: [X] ft." |
| 20 Min Call | 20 minutes | Push + SMS | "Load [#] — 20 minutes. [N] slots remaining. Gear check complete? Head to staging." |
| 10 Min Call | 10 minutes | Push + SMS | "Load [#] — BOARDING NOW. [Aircraft tail]. Do not be late." |
| No-Show Alert | 5 min before doors | Push to staff | "[Jumper name] has not confirmed for Load [#]. Offer slot to waitlist?" |
| Airborne Alert | At departure | In-app | Load marked airborne. Jump run ETA shown on load board. |
| Landing Confirmation | On land | Push to jumpers | "Welcome back! Log your jump and manifest for the next load." |

| Feature | Description |
| --- | --- |
| Shift Creation | DZ ops manager creates daily shift templates: opening, peak, closing. Assigns required roles (pilots, TIs, AFFIs, riggers). |
| Availability System | Staff confirm availability via app. DMS alerts manager when coverage is below minimum for planned loads. |
| Instructor Capacity | System tracks how many tandem students each TI can handle per day. Blocks overbooking automatically. |
| Load Assignment | When a load is created, system suggests optimal instructor assignment based on availability, load type, and workload. |
| Jump Log (Staff) | Instructors log work jumps automatically via manifest. Feeds into pay calculations and USPA jump log. |

| Entity | Key Relationships |
| --- | --- |
| Dropzone | Has many Aircraft, Loads, Staff, Prices. Has many Jumper Check-ins (visitors). Has many Waivers. |
| Aircraft | Belongs to Dropzone. Has many Loads. |
| Load | Belongs to Aircraft. Has many Slots. Has one Load Status. Triggers many Notifications. |
| Slot | Belongs to Load. Belongs to Jumper. Has one Slot Type. Links to Payment. |
| Jumper | Is a SkyLara User. Has one License Profile. Has many Gear Check records. Has many Waivers. Has many Slots. |
| License Profile | Belongs to Jumper. Has one License Level. Tracks jump count, currency dates, instructor ratings. |
| Gear Check | Belongs to Jumper. Performed by Rigger. Timestamped. Contains equipment snapshot. |
| Waiver | Template belongs to Dropzone. Signed waiver belongs to Jumper + Dropzone. Immutable once signed. |
| Jump Ticket | Belongs to Jumper wallet. Issued by Dropzone. Redeemed against Slot. |
| Payment | Links Slot + Jumper + Dropzone. Has one Payment State. Tracks splits (DZ / instructor / packer). |
| Notification | Belongs to Load (trigger). Addressed to Jumper. Has type (call time / weather / alert). Timestamped. |
| AFF Evaluation | Belongs to Jumper (student). Authored by Instructor. Links to Slot. Has pass/fail per skill. |

| Service | Responsibilities |
| --- | --- |
| manifest-service | Core load management: create/update loads, manage slots, calculate exit order, enforce slot compatibility rules. |
| compliance-service | License verification, currency checks, waiver validation, gear check status. Acts as a gate before manifesting. |
| call-time-scheduler | Calculates and schedules all call time events. Integrates with platform notification system. Manages weather hold logic. |
| payments-dz-service | DZ-specific payment logic: jump ticket management, tandem booking flow, commission splits, end-of-day reconciliation. |
| aircraft-service | Aircraft fleet management, capacity configuration, jump run and altitude settings per aircraft. |
| staff-scheduler | Staff availability, shift management, instructor capacity tracking, load assignment suggestions. |

| SkyLara Platform Layer | DMS Integration |
| --- | --- |
| Identity & Auth | All DMS users authenticate via SkyLara SSO. Role-based permissions (operator, staff, jumper) enforced at API gateway. |
| Athlete Profiles | License data, jump counts, and gear info live on the athlete profile and are read by the compliance-service in real time. |
| Notification System | Call times, weather holds, and landing confirmations delivered via SkyLara push and SMS infrastructure. |
| Payment Platform | Jump tickets stored in SkyLara wallet. Tandem bookings processed via platform payment gateway (Stripe / regional). |
| Community Feed | Completed jumps optionally posted to athlete story feed. AFF level completions trigger celebration posts. |
| Analytics Dashboard | DZ operator analytics: load efficiency, jumper volume, revenue trends, instructor utilization all fed from DMS event stream. |

| Deliverable | Priority | Effort |
| --- | --- | --- |
| Aircraft and DZ configuration module | P0 | M |
| Load creation, slot management, and capacity enforcement | P0 | L |
| Jumper check-in and compliance gate (license + waiver) | P0 | M |
| Digital gear check forms and reserve repack tracker | P1 | S |
| Manual call time announcements via DMS | P1 | S |
| Jump ticket purchase and deduction flow | P0 | M |
| Real-time load board display (web + app) | P0 | L |

| Deliverable | Priority | Effort |
| --- | --- | --- |
| Automated call time scheduler with push and SMS | P0 | M |
| Exit order algorithm and pilot-facing manifest view | P1 | M |
| Weather hold protocol with auto-communication | P0 | S |
| Tandem and AFF student booking flow | P0 | L |
| Instructor commission splits and packer fee tracking | P1 | M |
| Online pre-manifesting for licensed jumpers | P1 | M |
| AFF progression tracking and instructor evaluation forms | P1 | M |

| Deliverable | Priority | Effort |
| --- | --- | --- |
| Staff scheduling and instructor capacity management | P1 | M |
| End-of-day financial reconciliation reports | P1 | M |
| DZ analytics dashboard (volume, revenue, load efficiency) | P2 | L |
| Jump feed integration — share completed jumps to story | P2 | S |
| Multi-DZ roaming profile — jumper visits any SkyLara DZ | P2 | M |
| USPA API integration for automated license verification | P2 | L |
| Coach / DZ reviews and post-jump rating system | P3 | M |

| # | Question | Impact |
| --- | --- | --- |
| 1 | Should waivers be stored on SkyLara's servers or signed via a third-party (DocuSign / PandaDoc)? | Legal liability, storage architecture, and integration complexity. |
| 2 | Will SkyLara pursue USPA API access for real-time license verification, or rely on self-reported data? | Compliance accuracy and partnership requirements. |
| 3 | Is the DMS exclusive to SkyLara-registered DZs, or can standalone DZs use it without the full platform? | Go-to-market strategy and licensing model. |
| 4 | What payment processors should the platform support? Stripe only, or regional gateways (e.g., HyperPay for MENA)? | International expansion and payout capabilities. |
| 5 | Should the load board display be a dedicated hardware display at the DZ, or app/browser only? | Hardware partnership decisions and UI design scope. |
| 6 | How should the system handle non-USPA international license bodies (BPA, APF, etc.)? | Global scalability and license validation logic. |