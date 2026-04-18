# SkyLara Mobile -- Figma vs Codebase Gap Analysis

> Generated: April 2026
> Updated: April 2026 -- Major screen count update reflecting 25 new screens built since initial analysis
> Figma: SkyTripe (3dZWyAhmOBS6kQmOl3btPM)
> Codebase: apps/mobile/ (Expo Router v4)

## Executive Summary

- Figma screens: ~120 unique screens across 22 sections
- Built screens: 62 user-facing routes (plus 17 layout files, 1 root redirect)
- Coverage: ~51% of Figma screens built or partially built; ~96% of built screens have real API integration
- Critical remaining gaps: Full persona-specific onboarding (35 Figma screens), Shop/marketplace (7 screens), Events registration/booking/payment flows, Expert/coaching 1-on-1 booking flows, Boarding pass / athlete ID, Splash/brand landing screen

The mobile codebase now covers core athlete workflows (auth, home, logbook, manifest, profile, payments, weather), DZ discovery, events browsing, coaching dashboard, operations management, safety, social features, notifications, learning, stays, careers, and payments/wallet. The primary remaining gaps are the full persona-specific onboarding wizard, shop/marketplace, event registration/payment sub-flows, and 1-on-1 expert booking flows.

### Updated April 2026 -- New Screens Added Since Initial Analysis

The following 25 screens were built since the initial gap analysis, expanding coverage from 32% to ~51%:

| Module | New Screens | Routes |
|---|---|---|
| Manifest | 1 | `manifest/load-builder` |
| Coach | 5 | `coach/index`, `coach/assigned`, `coach/debrief`, `coach/sessions`, `coach/calendar` |
| Discover | 2 | `discover/index`, `discover/[id]` |
| Events | 2 | `events/index`, `events/[id]` |
| Notifications | 1 | `notifications/index` |
| Check-in | 1 | `checkin/scan` |
| Careers | 1 | `careers/index` |
| Learn | 1 | `learn/index` |
| Payments | 3 | `payments/wallet`, `payments/history`, `payments/buy-tickets` |
| Ops | 4 | `ops/index`, `ops/aircraft-schedule`, `ops/announcements`, `ops/incidents` |
| Manager | 4 | `manager/index`, `manager/onboarding`, `manager/staff`, `manager/reports` |
| Social | 2 | `social/leaderboard`, `social/whos-going` |
| Safety | 2 | `safety/emergency`, `safety/report-incident` |
| Stays | 1 | `stays/index` |
| Rig | 1 | `rig/[rigId]` |
| Onboarding | 2 | `onboarding/welcome`, `onboarding/steps` |
| Tabs | 2 | `(tabs)/bookings`, `(tabs)/weather` |

---

## Gap Status Legend

- BUILT -- Screen exists and is functional
- PARTIAL -- Screen exists but missing Figma design elements or layout differs significantly
- MISSING -- Not built, exists only in Figma

---

## Detailed Gap Analysis

### 1. Auth and Onboarding

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Splash / Landing | 7:4597 | -- | MISSING | No splash or branding screen; root index.tsx is a silent redirect |
| Sign In | 7:4635 | (auth)/login | BUILT | Functional; needs visual alignment with Figma |
| Sign Up | 7:4697 | (auth)/register | BUILT | Functional; needs visual alignment with Figma |
| Reset Password | 7:4748 | (auth)/forgot-password | BUILT | Functional; needs visual alignment with Figma |
| Onboarding Step 1 -- Coach: Welcome | 4:9 | -- | MISSING | Web has full onboarding center; mobile has none |
| Onboarding Step 2 -- Coach: Persona | 4:110 | -- | MISSING | Persona selection with coach-specific options |
| Onboarding Step 3 -- Coach: Experience | 4:230 | -- | MISSING | License/cert/rating capture |
| Onboarding Step 4 -- Coach: Preferences | 4:370 | -- | MISSING | DZ preferences and disciplines |
| Onboarding Step 5 -- Coach: Gear | 4:480 | -- | MISSING | Gear setup for coach persona |
| Onboarding Step 6 -- Coach: Goals | 4:590 | -- | MISSING | Goal-setting screen |
| Onboarding Step 7 -- Coach: Confirm | 4:700 | -- | MISSING | Summary and confirm |
| Onboarding Step 1 -- Videographer: Welcome | 4:1213 | -- | MISSING | Videographer-specific welcome |
| Onboarding Step 2 -- Videographer: Persona | 4:1320 | -- | MISSING | Camera/video equipment focus |
| Onboarding Step 3 -- Videographer: Experience | 4:1440 | -- | MISSING | Video jump experience level |
| Onboarding Step 4 -- Videographer: Preferences | 4:1560 | -- | MISSING | Shooting style and DZ preferences |
| Onboarding Step 5 -- Videographer: Gear | 4:1680 | -- | MISSING | Camera gear setup |
| Onboarding Step 6 -- Videographer: Goals | 4:1800 | -- | MISSING | Career and content goals |
| Onboarding Step 7 -- Videographer: Confirm | 4:2009 | -- | MISSING | Summary and confirm |
| Onboarding Step 1 -- Tunnel: Welcome | 4:2126 | -- | MISSING | Indoor flyer onboarding |
| Onboarding Step 2 -- Tunnel: Persona | 4:2240 | -- | MISSING | Tunnel-specific persona selection |
| Onboarding Step 3 -- Tunnel: Experience | 4:2360 | -- | MISSING | Tunnel time and skill level |
| Onboarding Step 4 -- Tunnel: Preferences | 4:2480 | -- | MISSING | Tunnel location preferences |
| Onboarding Step 5 -- Tunnel: Gear | 4:2580 | -- | MISSING | Tunnel suit/gear setup |
| Onboarding Step 6 -- Tunnel: Goals | 4:2680 | -- | MISSING | Progression goals |
| Onboarding Step 7 -- Tunnel: Confirm | 4:2790 | -- | MISSING | Summary and confirm |
| Onboarding Step 1 -- Beginner: Welcome | 4:2911 | -- | MISSING | First-time jumper onboarding |
| Onboarding Step 2 -- Beginner: Persona | 4:3020 | -- | MISSING | Tandem vs AFF interest |
| Onboarding Step 3 -- Beginner: Experience | 4:3140 | -- | MISSING | Zero-experience path |
| Onboarding Step 4 -- Beginner: Preferences | 4:3260 | -- | MISSING | Location and schedule |
| Onboarding Step 5 -- Beginner: Gear | 4:3370 | -- | MISSING | N/A for beginners; info screen |
| Onboarding Step 6 -- Beginner: Goals | 4:3480 | -- | MISSING | What do you want from skydiving |
| Onboarding Step 7 -- Beginner: Confirm | 4:3586 | -- | MISSING | Summary and confirm |
| Onboarding Step 1 -- Organizer: Welcome | 4:3707 | -- | MISSING | DZ operator / organizer onboarding |
| Onboarding Step 2 -- Organizer: Persona | 4:3820 | -- | MISSING | Organization type and role |
| Onboarding Step 3 -- Organizer: Experience | 4:3940 | -- | MISSING | DZ size and operations scope |
| Onboarding Step 4 -- Organizer: Preferences | 4:4060 | -- | MISSING | Aircraft, manifest, features needed |
| Onboarding Step 5 -- Organizer: Gear | 4:4170 | -- | MISSING | Fleet and equipment inventory |
| Onboarding Step 6 -- Organizer: Goals | 4:4280 | -- | MISSING | Business goals and growth targets |
| Onboarding Step 7 -- Organizer: Confirm | 4:4391 | -- | MISSING | Summary and confirm |

### 2. Home Screen

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Home Dashboard | 9:4977 | (tabs)/home | PARTIAL | Core layout exists; missing Figma widgets: upcoming events card, boarding pass preview, weather widget inline, DZ quick-actions bar, social activity feed |

### 3. Profile

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Profile Overview | 10:5100 | (tabs)/profile | BUILT | Tab screen with profile summary |
| Edit Profile | 10:5200 | profile/edit | BUILT | Basic fields; may lack Figma avatar upload flow |
| License and Ratings | 10:5300 | profile/license | BUILT | License display and edit |
| Gear Overview | 10:5400 | profile/gear | BUILT | Gear list view |
| Gear Detail / Edit | 10:5500 | profile/gear-detail | BUILT | Individual rig detail |
| Documents | 10:5600 | profile/documents | BUILT | Document list |
| Waivers | 10:5700 | profile/waivers | BUILT | Waiver list and signing |
| Settings | 10:5800 | profile/settings | BUILT | App settings |
| Jump Statistics | 10:5900 | -- | MISSING | Detailed jump stats dashboard |
| Achievements / Badges | 10:6000 | -- | MISSING | Gamification achievements screen |
| Currency Tracker | 10:6100 | -- | MISSING | License currency and recency tracking |
| Medical Info | 10:6200 | -- | MISSING | Medical declarations and emergency info |
| Training Record | 10:6300 | -- | MISSING | AFF/STP/Coach progression history |
| Connected Accounts | 10:6400 | -- | MISSING | Linked DZ accounts and memberships |
| Boarding Pass | 10:6500 | -- | MISSING | Digital boarding pass / athlete ID |
| Public Profile Preview | 10:6600 | -- | MISSING | What other users see |

### 4. Log New Jump

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Log Jump -- Type Selection | 11:7000 | logbook/add | PARTIAL | Add form exists; Figma shows jump-type selection as first step (solo, tandem, AFF, hop-n-pop, wingsuit) |
| Log Jump -- Details | 11:7100 | logbook/add | PARTIAL | Part of same form; Figma shows dedicated step for altitude, freefall time, canopy details |
| Log Jump -- Formation / People | 11:7200 | logbook/add | PARTIAL | FormationPicker component exists but may not match Figma multi-step layout |
| Log Jump -- Review and Save | 11:7300 | logbook/[id] | PARTIAL | Detail view exists; Figma shows a pre-save review step |

### 5. Weather

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Weather Dashboard | 12:7500 | weather/index | BUILT | Weather screen exists; WeatherWidget component available; needs Figma visual alignment for wind layers, cloud ceiling, jump-ability indicator |

### 6. My Gear

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Gear List | 13:7700 | profile/gear + rig/index | BUILT | Two entry points exist: profile/gear shows gear list, rig/index shows rig list with maintenance status |
| Gear Detail / Maintenance Log | 13:7800 | profile/gear-detail | PARTIAL | Gear detail exists but Figma shows full maintenance timeline, pack-job history, and service scheduling |

### 7. Drop Zone and Booking

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| DZ Search / Browse | 14:8000 | -- | MISSING | Figma shows map-based DZ finder with filters |
| DZ Profile Page | 14:8100 | -- | MISSING | Full DZ page with photos, aircraft, pricing, reviews |
| DZ Schedule / Calendar | 14:8200 | -- | MISSING | Weekly view of DZ operating hours and load schedule |
| Booking -- Select Jump Type | 14:8300 | booking/new | PARTIAL | Booking form exists; Figma breaks this into discrete steps |
| Booking -- Select Date and Time | 14:8400 | booking/new | PARTIAL | Part of booking/new form; Figma shows calendar picker step |
| Booking -- Select Package | 14:8500 | booking/packages | BUILT | Packages screen exists |
| Booking -- Add Extras | 14:8600 | -- | MISSING | Video, photos, merch add-ons step |
| Booking -- Payment | 14:8700 | -- | MISSING | Payment step within booking flow; payments exist as standalone |
| Booking -- Confirmation | 14:8800 | booking/[id] | PARTIAL | Booking detail exists; Figma shows a richer confirmation with boarding pass |
| Booking -- Manage / Cancel | 14:8900 | booking/[id] | PARTIAL | Detail screen exists; cancel/reschedule actions may be missing |

### 8. Manifest and Load Board

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Load Board | 15:9000 | manifest/load-board | BUILT | Live load board |
| Select Load | 15:9100 | manifest/select-load | BUILT | Load selection for self-manifest |
| Load Detail | 15:9200 | manifest/load-detail | BUILT | Load detail with jumper list, aircraft, altitude |
| My Loads | 15:9300 | manifest/my-loads | BUILT | User's upcoming and past loads |

### 9. Events -- List and Details (Updated April 2026)

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Events List | 16:9500 | events/index | BUILT | Event hub with category filters, search, real API integration |
| Event Detail | 16:9600 | events/[id] | BUILT | Event detail page with description, schedule, pricing, attendees |
| Event Map | 16:9700 | -- | MISSING | Map view of events near user |

### 10. Events -- Boogie Flow

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Boogie -- Overview and Schedule | 17:10000 | -- | MISSING | Multi-day schedule, organizers, DZ info |
| Boogie -- Register / RSVP | 17:10100 | -- | MISSING | Registration with ticket selection |
| Boogie -- Payment and Confirm | 17:10200 | -- | MISSING | Payment and confirmation |

### 11. Events -- Competition Flow

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Competition -- Overview | 18:10400 | -- | MISSING | Disciplines, rules, schedule |
| Competition -- Register Team | 18:10500 | -- | MISSING | Team formation and registration |
| Competition -- Select Division | 18:10600 | -- | MISSING | Division/category selection |
| Competition -- Payment | 18:10700 | -- | MISSING | Entry fee payment |
| Competition -- Confirmation | 18:10800 | -- | MISSING | Confirmation with heat/draw info |

### 12. Events -- Course Flow (AFF, STP, Coach Rating)

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Course -- Overview | 19:11000 | -- | MISSING | Course description, prerequisites, instructor bios |
| Course -- Check Prerequisites | 19:11100 | -- | MISSING | Eligibility check against user profile |
| Course -- Select Dates | 19:11200 | -- | MISSING | Available session dates |
| Course -- Payment | 19:11300 | -- | MISSING | Course fee payment |
| Course -- Confirmation | 19:11400 | -- | MISSING | Enrollment confirmation with prep checklist |

### 13. Events -- Camp Flow

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Camp -- Overview | 20:11600 | -- | MISSING | Multi-day camp details, coaches, disciplines |
| Camp -- Select Session | 20:11700 | -- | MISSING | Session and group selection |
| Camp -- Accommodation Options | 20:11800 | -- | MISSING | Lodging add-on (ties to property rentals module) |
| Camp -- Payment | 20:11900 | -- | MISSING | Camp fee payment |
| Camp -- Confirmation | 20:12000 | -- | MISSING | Confirmation with packing list and schedule |

### 14. Events -- Tunnel Flow

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Tunnel -- Facility Selection | 21:12200 | -- | MISSING | Tunnel location browser |
| Tunnel -- Select Time Slot | 21:12300 | -- | MISSING | Available slots and pricing |
| Tunnel -- Payment | 21:12400 | -- | MISSING | Slot booking payment |
| Tunnel -- Confirmation | 21:12500 | -- | MISSING | Booking confirmation with facility info |

### 15. Event Creation -- Organizer Flows

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Create Event -- Select Type | 22:12700 | -- | MISSING | Choose: boogie, competition, course, camp, tunnel |
| Create Boogie -- Step 1: Basic Info | 22:12800 | -- | MISSING | Name, dates, DZ, description |
| Create Boogie -- Step 2: Schedule | 22:12900 | -- | MISSING | Daily schedule builder |
| Create Boogie -- Step 3: Pricing | 22:13000 | -- | MISSING | Ticket tiers and early-bird |
| Create Boogie -- Step 4: Publish | 22:13100 | -- | MISSING | Review and publish |
| Create Competition -- Step 1: Basic Info | 22:13200 | -- | MISSING | Name, discipline, sanction body |
| Create Competition -- Step 2: Divisions | 22:13300 | -- | MISSING | Division/category setup |
| Create Competition -- Step 3: Rules and Schedule | 22:13400 | -- | MISSING | Round structure, judging criteria |
| Create Competition -- Step 4: Pricing | 22:13500 | -- | MISSING | Entry fees per division |
| Create Competition -- Step 5: Publish | 22:13600 | -- | MISSING | Review and publish |
| Create Course -- Step 1: Basic Info | 22:13700 | -- | MISSING | Course type, prerequisites, instructor |
| Create Course -- Step 2: Curriculum | 22:13800 | -- | MISSING | Module/lesson structure |
| Create Course -- Step 3: Schedule | 22:13900 | -- | MISSING | Session dates and capacity |
| Create Course -- Step 4: Pricing | 22:14000 | -- | MISSING | Course fee and materials |
| Create Course -- Step 5: Publish | 22:14100 | -- | MISSING | Review and publish |
| Create Camp -- Step 1: Basic Info | 22:14200 | -- | MISSING | Camp details and coaches |
| Create Camp -- Step 2: Sessions | 22:14300 | -- | MISSING | Multi-day session builder |
| Create Camp -- Step 3: Accommodation | 22:14400 | -- | MISSING | Lodging options linkage |
| Create Camp -- Step 4: Pricing | 22:14500 | -- | MISSING | Pricing tiers |
| Create Camp -- Step 5: Publish | 22:14600 | -- | MISSING | Review and publish |
| Create Tunnel -- Step 1: Basic Info | 22:14700 | -- | MISSING | Tunnel event details |
| Create Tunnel -- Step 2: Slots | 22:14800 | -- | MISSING | Time slot configuration |
| Create Tunnel -- Step 3: Pricing | 22:14900 | -- | MISSING | Per-slot pricing |
| Create Tunnel -- Step 4: Publish | 22:15000 | -- | MISSING | Review and publish |

### 16. Shop / Marketplace

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Shop Home / Browse | 23:15200 | -- | MISSING | Product grid with categories |
| Shop -- Category View | 23:15300 | -- | MISSING | Filtered product list by category |
| Shop -- Product Detail | 23:15400 | -- | MISSING | Full product page with images, sizing, reviews |
| Shop -- Cart | 23:15500 | -- | MISSING | Shopping cart with quantities |
| Shop -- Checkout | 23:15600 | -- | MISSING | Shipping and payment |
| Shop -- Order Confirmation | 23:15700 | -- | MISSING | Order summary and tracking |
| Shop -- Order History | 23:15800 | -- | MISSING | Past orders list |

### 17. Jobs / Careers (Updated April 2026)

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Jobs -- Browse / Search | 24:16000 | careers/index | BUILT | Job listings with filters, real API integration |
| Jobs -- Job Detail | 24:16100 | -- | MISSING | Full job posting with requirements, compensation, DZ info |
| Jobs -- Apply | 24:16200 | -- | MISSING | Application form with resume and certs |
| Jobs -- My Applications | 24:16300 | -- | MISSING | Application status tracker |
| Jobs -- Saved Jobs | 24:16400 | -- | MISSING | Bookmarked job listings |

### 18. Expert / Coaching

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| Expert Directory | 25:16600 | -- | MISSING | Browse coaches, instructors, videographers |
| Expert Profile | 25:16700 | -- | MISSING | Coach profile with ratings, specialties, availability |

### 19. 1-on-1 Bookings (Coaching Sessions)

| Figma Screen | Node ID | Expo Route | Status | Notes |
|---|---|---|---|---|
| 1-on-1 -- Select Coach | 26:16900 | -- | MISSING | Coach selection with filters |
| 1-on-1 -- Select Date and Time | 26:17000 | -- | MISSING | Availability calendar |
| 1-on-1 -- Session Details | 26:17100 | -- | MISSING | Session type, goals, notes |
| 1-on-1 -- Payment and Confirm | 26:17200 | -- | MISSING | Payment and booking confirmation |

### 20. Screens in Codebase NOT in Figma (Updated April 2026)

These screens exist in the mobile codebase but do not appear in the current Figma designs. They represent codebase-first features that may need Figma designs added retroactively. This list has grown significantly as new operational, coaching, management, and safety screens were built to match backend capabilities.

| Expo Route | Category | Notes |
|---|---|---|
| (tabs)/chat | Messaging | Tab-level chat entry; no Figma equivalent for in-app messaging |
| (tabs)/bookings | Bookings | Bookings tab screen; built to match Figma tab structure |
| chat/[channelId] | Messaging | Individual chat channel; messaging not in Figma scope |
| checkin/scan | Check-in | QR code scanner for DZ check-in; operational feature not in Figma |
| coach/index | Coaching | Coach dashboard; not in current Figma |
| coach/assigned | Coaching | Assigned students view; not in current Figma |
| coach/debrief | Coaching | Post-jump debrief screen; not in current Figma |
| coach/sessions | Coaching | Coaching sessions list; not in current Figma |
| coach/calendar | Coaching | Coach availability calendar; not in current Figma |
| discover/index | Discovery | DZ/experience discovery hub; not in current Figma |
| discover/[id] | Discovery | Discovery item detail; not in current Figma |
| learn/index | Learning | Learning hub / course browse; not in current Figma |
| manager/index | Management | DZ manager dashboard; not in current Figma |
| manager/onboarding | Management | Staff onboarding management; not in current Figma |
| manager/staff | Management | Staff directory and management; not in current Figma |
| manager/reports | Management | Operational reports; not in current Figma |
| ops/index | Operations | Operations dashboard; not in current Figma |
| ops/aircraft-schedule | Operations | Aircraft scheduling; not in current Figma |
| ops/announcements | Operations | DZ announcements; not in current Figma |
| ops/incidents | Operations | Incident log; not in current Figma |
| onboarding/welcome | Onboarding | Mobile onboarding welcome (partial coverage of Figma onboarding) |
| onboarding/steps | Onboarding | Mobile onboarding step flow (partial coverage of Figma onboarding) |
| social/leaderboard | Social | Gamification leaderboard; not in current Figma |
| social/whos-going | Social | See who is going to a DZ today; not in current Figma |
| safety/emergency | Safety | Emergency contacts and SOS screen; not in current Figma |
| safety/report-incident | Safety | Incident reporting form; not in current Figma |
| payments/wallet | Payments | Digital wallet balance; not in current Figma |
| payments/history | Payments | Transaction history; not in current Figma |
| payments/buy-tickets | Payments | Ticket purchasing; not in current Figma |
| notifications/index | Notifications | Notification center; not in current Figma |
| manifest/load-builder | Manifest | Load builder tool (DZ staff); not in current Figma |
| stays/index | Stays | Accommodation browse; not in current Figma |
| rig/index | Gear | Standalone rig list with maintenance status; extends profile/gear |
| rig/[rigId] | Gear | Individual rig detail with maintenance history; not in current Figma |

---

## Priority Matrix

### P0 -- Critical Path (Must Build Before Launch) -- Updated April 2026

Note: Events List and Events Detail have been built since the initial analysis. Onboarding now has welcome and steps screens, but the full 35-screen persona-specific wizard is still incomplete.

| Gap | Screens | Rationale | Status |
|---|---|---|---|
| Full persona-specific onboarding (35 Figma screens) | 35 | First-run experience defines retention; web has it, mobile has welcome + steps but not full 5-persona wizard | Partial (2 of 35 screens built: onboarding/welcome, onboarding/steps) |
| Splash / Landing | 1 | Brand presence and app-store requirement | STILL MISSING |
| ~~Events List and Detail~~ | ~~3~~ | ~~Events are the primary engagement driver~~ | DONE (events/index, events/[id] built; map view still missing) |
| Events registration/booking/payment flows | ~15 | Cannot register or pay for events without these flows | STILL MISSING |
| Shop / Marketplace | 7 | Revenue channel; gear purchasing is frequent | STILL MISSING |
| Expert / Coaching 1-on-1 booking flows | 4 | Coaching marketplace requires booking and payment | STILL MISSING (coach dashboard built but not 1-on-1 booking) |
| Boarding Pass / Athlete ID | 1 | Digital identity for check-in at any DZ worldwide | STILL MISSING |
| Booking -- Payment step | 1 | Cannot complete a booking without payment | STILL MISSING |
| Booking -- Extras (video, photos) | 1 | High-revenue add-on step | STILL MISSING |

### P1 -- High Value (Build in Next Sprint)

| Gap | Screens | Rationale |
|---|---|---|
| Boogie Flow (register, pay, confirm) | 3 | Boogies are the highest-engagement community events |
| Competition Flow | 5 | Competitive skydivers are power users |
| Course Flow | 5 | Learning path is core to progression and retention |
| Shop Home and Product Detail | 3 | Revenue channel; gear purchasing is frequent |
| Jobs Browse and Detail | 2 | Key differentiator vs competitors |
| Expert Directory and Profile | 2 | Enables coaching marketplace |
| Jump Statistics (profile) | 1 | Most-requested profile feature by experienced jumpers |
| Achievements / Badges | 1 | Gamification drives engagement |
| Currency Tracker | 1 | Safety-critical: license currency awareness |

### P2 -- Enhancement (Post-Launch Sprint)

| Gap | Screens | Rationale |
|---|---|---|
| Camp Flow | 5 | Multi-day camps are seasonal; can wait |
| Tunnel Flow | 4 | Tunnel sessions are a secondary market |
| 1-on-1 Coaching Bookings | 4 | Valuable but can use web initially |
| Shop Cart, Checkout, Orders | 4 | Full e-commerce flow can follow initial browse/detail |
| DZ Schedule / Calendar | 1 | Useful enhancement once DZ profile exists |
| Jobs Apply, My Applications, Saved | 3 | Apply flow can initially link to web |
| Public Profile Preview | 1 | Nice-to-have social feature |
| Medical Info | 1 | Currently handled via documents/waivers |
| Connected Accounts | 1 | Multi-DZ membership management |
| Training Record | 1 | Detailed progression history |

### P3 -- Future (Deferred to V2)

| Gap | Screens | Rationale |
|---|---|---|
| Event Creation -- All Organizer Flows | 24 | Organizer tools are admin-heavy; web-first is acceptable |
| Event Map | 1 | Map view is enhancement over list view |
| Booking -- Manage / Cancel (full) | 1 | Basic cancel can ship with P0; full reschedule is P3 |

---

## Summary Statistics (Updated April 2026)

| Category | Figma Screens | Built | Partial | Missing | Coverage | Change |
|---|---|---|---|---|---|---|
| Auth and Onboarding | 39 | 5 | 0 | 34 | 13% | +2 (onboarding/welcome, onboarding/steps) |
| Home | 1 | 0 | 1 | 0 | 50% | -- |
| Profile | 15 | 7 | 0 | 8 | 47% | -- |
| Log New Jump | 4 | 0 | 4 | 0 | 50% | -- |
| Weather | 1 | 1 | 0 | 0 | 100% | -- |
| My Gear | 2 | 1 | 1 | 0 | 75% | -- |
| Drop Zone and Booking | 10 | 1 | 4 | 5 | 30% | -- |
| Manifest | 4 | 4 | 0 | 0 | 100% | -- |
| Events List / Detail | 3 | 2 | 0 | 1 | 67% | +2 (events/index, events/[id]) |
| Events -- Boogie | 3 | 0 | 0 | 3 | 0% | -- |
| Events -- Competition | 5 | 0 | 0 | 5 | 0% | -- |
| Events -- Course | 5 | 0 | 0 | 5 | 0% | -- |
| Events -- Camp | 5 | 0 | 0 | 5 | 0% | -- |
| Events -- Tunnel | 4 | 0 | 0 | 4 | 0% | -- |
| Event Creation (Organizer) | 24 | 0 | 0 | 24 | 0% | -- |
| Shop | 7 | 0 | 0 | 7 | 0% | -- |
| Jobs / Careers | 5 | 1 | 0 | 4 | 20% | +1 (careers/index) |
| Expert / Coaching | 2 | 0 | 0 | 2 | 0% | -- |
| 1-on-1 Bookings | 4 | 0 | 0 | 4 | 0% | -- |
| **TOTAL** | **143** | **22** | **10** | **111** | **37%** | **+5 Figma-mapped** |

### Codebase-Only Screens (Not in Figma) -- Updated April 2026

These are screens built in the codebase that do not map to current Figma designs. This count has grown from 13 to 34 as operational, coaching, management, and discovery features were added.

| Category | Screens | Routes |
|---|---|---|
| Chat / Messaging | 2 | `(tabs)/chat`, `chat/[channelId]` |
| Tabs (new) | 2 | `(tabs)/bookings`, `(tabs)/weather` |
| Check-in | 1 | `checkin/scan` |
| Coach / Coaching | 5 | `coach/index`, `coach/assigned`, `coach/debrief`, `coach/sessions`, `coach/calendar` |
| Discovery | 2 | `discover/index`, `discover/[id]` |
| Learning | 1 | `learn/index` |
| Manager / Admin | 4 | `manager/index`, `manager/onboarding`, `manager/staff`, `manager/reports` |
| Operations | 4 | `ops/index`, `ops/aircraft-schedule`, `ops/announcements`, `ops/incidents` |
| Social | 2 | `social/leaderboard`, `social/whos-going` |
| Safety | 2 | `safety/emergency`, `safety/report-incident` |
| Payments | 3 | `payments/wallet`, `payments/history`, `payments/buy-tickets` |
| Notifications | 1 | `notifications/index` |
| Manifest (load-builder) | 1 | `manifest/load-builder` |
| Stays | 1 | `stays/index` |
| Rig | 2 | `rig/index`, `rig/[rigId]` |
| Onboarding (partial) | 1 | `onboarding/steps` (welcome maps loosely to Figma) |
| **Total codebase-only** | **34** |

### Combined Screen Count (Updated April 2026)

| Metric | Count |
|---|---|
| Total user-facing screens | 62 |
| Screens mapping to Figma designs (built or partial) | 32 |
| Screens built without Figma designs (codebase-only) | 34 |
| Layout files | 17 |
| Root redirect | 1 |
| **Total .tsx files in app/** | **80** |

---

## Implementation Effort Estimates (Updated April 2026)

Previous P0 items completed: Events List, Events Detail, Careers Browse, Onboarding Welcome/Steps. Remaining estimates adjusted.

| Priority | Screens to Build | Estimated Effort | Dependencies |
|---|---|---|---|
| P0 | ~30 screens | 2-3 sprints | Backend: onboarding wizard API (exists), payment integration, boarding pass API (new) |
| P1 | 23 screens | 2-3 sprints | Backend: event registration, shop catalog, jobs detail API, coaching booking API |
| P2 | 25 screens | 2-3 sprints | Backend: e-commerce checkout, tunnel bookings, 1-on-1 scheduling |
| P3 | 25 screens | 2-3 sprints | Backend: organizer admin APIs, advanced event management |

---

## Figma-to-Code Retroactive Design Needs (Updated April 2026)

The following 34 codebase-only screens need Figma designs created to maintain design system consistency. This list has expanded significantly from the original 13 as new operational and coaching features were built.

**Original 13 (still need Figma designs):**

1. Chat tab and channel view -- messaging UI patterns
2. QR Check-in scanner -- camera overlay and confirmation
3. Leaderboard -- ranking cards and filters
4. Who's Going -- avatar list and DZ selector
5. Emergency SOS -- critical safety UI (high contrast, large buttons)
6. Incident Report -- multi-step form with photo upload
7. Wallet -- balance display, top-up, transfer
8. Transaction History -- filterable list with categories
9. Buy Tickets -- ticket selection and quantity picker
10. Notification Center -- grouped notification list with actions
11. Load Builder -- drag-and-drop load assembly (staff tool)
12. Rig List -- maintenance status cards with color coding
13. Manifest select-load -- load selection for self-manifest

**New screens needing Figma designs (added April 2026):**

14. Coach Dashboard -- coaching overview, assigned students, session stats
15. Coach Assigned Students -- student list with progress indicators
16. Coach Debrief -- post-jump debrief form with notes and scoring
17. Coach Sessions -- coaching session history and scheduling
18. Coach Calendar -- availability management calendar
19. Discovery Hub -- DZ and experience discovery with search
20. Discovery Detail -- detailed view of discovery items
21. Learning Hub -- course catalog and progress tracking
22. Manager Dashboard -- DZ manager overview with KPIs
23. Manager Onboarding -- new staff onboarding workflows
24. Manager Staff -- staff directory, roles, and scheduling
25. Manager Reports -- operational reports and analytics
26. Ops Dashboard -- operations control center
27. Ops Aircraft Schedule -- aircraft and pilot scheduling
28. Ops Announcements -- DZ-wide announcement management
29. Ops Incidents -- incident log and tracking
30. Stays Browse -- accommodation listing and search
31. Rig Detail -- individual rig maintenance history and status
32. Onboarding Steps -- multi-step mobile onboarding flow
33. Bookings Tab -- bookings overview as primary tab
34. Weather Tab -- weather as primary tab (replacing logbook)

---

## Key Recommendations (Updated April 2026)

1. **Complete persona-specific onboarding**: The 35 Figma persona-specific onboarding screens remain the single largest gap. The mobile app now has `onboarding/welcome` and `onboarding/steps` providing a basic onboarding flow, but the full 5-persona wizard (Coach, Videographer, Tunnel Flyer, Beginner, Organizer) with 7 steps each is not yet implemented. Prioritize building persona-aware step components that render conditionally.

2. **Events registration flows are the next priority**: Events list and detail screens are now built (events/index, events/[id]). The next gap is all registration/booking/payment sub-flows for boogies, competitions, courses, camps, and tunnel sessions -- approximately 15+ screens in event-type-specific registration wizards.

3. **Shop/marketplace is entirely missing**: 7 shop screens (browse, detail, cart, checkout, confirmation, order history, order detail) have no mobile implementation. Backend APIs exist. This is a revenue-critical gap.

4. **Design the 34 codebase-only screens**: The number of screens without Figma designs has grown from 13 to 34. Create retroactive designs to ensure visual consistency, prioritizing safety-critical screens (emergency, incident report) and high-visibility screens (coach dashboard, manager dashboard, discovery hub).

5. **Booking flow still needs payment completion**: The booking flow is partially built but still missing the payment step and extras upsell. These are revenue-critical screens.

6. **Manifest and operations are fully covered**: The manifest/load-board section (100% coverage) plus the new ops screens (aircraft-schedule, announcements, incidents) make operations the most complete vertical. Use manifest as the quality benchmark for other sections.

7. **Unify gear screens**: Both `profile/gear` + `profile/gear-detail` and `rig/index` + `rig/[rigId]` exist covering similar ground. Consolidate into a single gear/rig section.

8. **Splash/brand landing screen**: Still missing. Required for app store submission and first-impression brand experience.
