# SkyLara Competitive Audit: Complete Analysis
## FunJumpr & Burble/BurbleMe vs. SkyLara Platform

**Document Date:** 2026-04-09  
**Analysis Scope:** 57+ screenshots, 3 screen recordings  
**Reference Apps:** FunJumpr (mobile-first), Burble/BurbleMe (operations-heavy)  
**Internal Reference:** SkyLara 13-module canonical design with 10+ roles and 75+ database tables

---

## PART 1: FUNJUMPR APP AUDIT

### 1.1 Full Screen Inventory

#### Screen 1: Dropzone Home Screen
**Purpose:** Primary entry point showing current DZ activity, weather, loads, and social engagement  
**Content Elements:**
- DZ Header: Name (e.g., "Skydive Dubai Desert"), flag icon
- Weather Widget: Wind speed (3-4 mph), temperature (55F), hourly timeline (8am-6pm)
- "Who's Going" Social Section: List of jumpers with "I'm going" toggle button
- Load Board: Active/upcoming loads with columns:
  - Load ID (e.g., "SD 5 1", "SD 1 2")
  - Status (Full, Partial with slot count: "8 slots", "2 slots")
  - Countdown timer (Now, 9:26, 19:26, 29:26 minutes)
- Jump Counter Badge: Skill-level indicator (e.g., "8-17 Jumps")
- Banner Ads: Promotional content (e.g., "Blue Skies sale 25% off KRAV")
**Interactions:** Click load to view details, tap "I'm going" to register, swipe for more loads
**Role Access:** All (jumpers, coaches, staff)

#### Screen 2: Coaching Schedule Matrix
**Purpose:** Display available coaching slots by discipline and skill level  
**Content Elements:**
- Day Selector: M/Tu/W/Th/Today/Sa/Su tabs with date display (e.g., "Friday 1/09")
- Rows: Coaching disciplines (Angle, Freefly, Belly, Swoop)
- Columns: Skill levels (Beg, Int, Adv, Ninja)
- Grid Content: Coach avatars placed at skill/discipline intersections
- Jumper Counter: "0 Jumpers" or "1 Jumper" per slot
- CTA Buttons: "I'll be there Today!" (yellow/checked state) or "Cancel Today" (red/unchecked)
**Interactions:** Select day, identify coach, confirm attendance, view jumper count
**Role Access:** Jumpers (self-sign-up), coaches (view and manage), staff (view all)

#### Screen 3: User Profile
**Purpose:** Display jumper identity, statistics, and discipline skills  
**Content Elements:**
- Profile Header: Avatar (round image), name, "Follow" button
- Statistics: Jump count (900), Tunnel hours (80), Jumping since date (Sep 2025)
- Social Counts: Followers (X), Following (Y)
- Home Dropzone: Flag icon + DZ name (e.g., UAE flag "Skydive Dubai Desert")
- Bio: Freeform text (max ~100 chars)
- Discipline Badges: Oval/ring gauges for each discipline
  - Label + Skill Level (Beg, Int, Adv, Ninja)
  - Examples: "Angle Int", "Freefly Int", "Belly Beg", "Swoop Beg"
  - Visual: Ring gauge 0-100% fill
**Interactions:** View full profile, edit, follow/unfollow
**Role Access:** Public (view own), private (edit own), friends can view

#### Screen 4: Profile Edit - Profile Tab
**Purpose:** Allow users to update personal information  
**Content Elements:**
- Tab Navigation: "Profile" (active) | "Skills"
- Form Fields:
  - Name (text input, required)
  - Jumping Since (date picker, required)
  - Jumps Count (integer input, auto-calculated, read-only in some flows)
  - Tunnel Hours (decimal input)
  - Primary Dropzone (dropdown selector)
  - Bio (textarea, max 255 chars)
  - Social Links: Instagram URL, Facebook URL, YouTube URL (each optional)
- Roles Section: "No roles yet. Add a role to get started." (placeholder message)
**Interactions:** Edit all fields, save, cancel, social link validation
**Role Access:** Users (self-edit), admins (edit others)

#### Screen 5: Profile Edit - Skills Tab
**Purpose:** Configure skydiving disciplines and proficiency levels  
**Content Elements:**
- Discipline Checkboxes: Belly, Angle, Wingsuit, Freefly, CRW, XRW, Swoop
- Skill Level Slider (per discipline): Beginner → Intermediate → Advanced → Ninja (4 positions)
- Visual Feedback: Checked disciplines show colored ring/badge; unchecked are greyed
- Description: Skill level definitions (optional tooltip on hover)
**Interactions:** Check/uncheck discipline, drag slider to set level, save selections
**Role Access:** Users (self-edit), coaches (view others' levels)
**Logic:** Only checked disciplines are stored; slider only active if checkbox enabled

#### Screen 6: Settings Screen
**Purpose:** Configure app and account preferences  
**Content Elements:**
- Section: SKYDIVING
  - Weather Limits (sub-settings for wind, cloud ceiling, etc.)
- Section: APP SETTINGS
  - Notifications (toggle)
  - Theme (Light/Dark selector)
  - Units (opens Screen 7)
  - Clear Cache (button)
- Section: ACCOUNT
  - Blocked Users (list/manage)
  - Delete My Account (destructive button with confirmation)
- Section: ABOUT
  - Funjumpr in the Media (link to external content)
  - Terms of Service (opens in-app or external)
  - Privacy Policy (opens in-app or external)
  - Version (e.g., "1.7.1", read-only)
**Interactions:** Toggle switches, tap links, open dialogs for destructive actions
**Role Access:** All users (personal settings)

#### Screen 7: Units Configuration
**Purpose:** Set preferred measurement units globally  
**Content Elements:**
- Measurement Categories with Dropdowns:
  - Airplane Speed: kt / mph / km/h
  - Wind Speed: kt / mph / km/h / m/s
  - Long Distance: mi / km
  - Short Distance: ft / m
  - Altitude: ft / m
  - Fall Rate: mph / km/h / m/s
  - Temperature: F / C
**Interactions:** Tap dropdown, select unit, apply globally
**Role Access:** All users (personal preference)
**Persistence:** Stored in user preferences; affects all numeric displays app-wide

#### Screen 8: Formation Selection List
**Purpose:** Allow user to tag which formation types they practice  
**Content Elements:**
- Full Formation Type List (checkable items):
  - FS (Freefall Formation Skydiving)
  - Freefly
  - Solo
  - Wingsuit (WS)
  - XRW (Extreme Relative Work)
  - VFS (Vertical Freefall Skydiving)
  - HopNPop
  - Tracking
  - CRW (Canopy Relative Work)
  - Canopy Flocking
  - Angle
  - Freestyle
  - High Pull
  - HyBrid
  - FS-4WAY
  - FS-8WAY
  - FS-16WAY
  - FS-BigWay
  - AFF (Accelerated Freefall)
  - Tandem
  - SWOOP
  - POND SWOOP
  - MFS (Multiway Freefall)
  - Accuracy
  - Sky Surfing
**Interactions:** Check/uncheck formations, save, used as filters elsewhere
**Role Access:** Jumpers (self-select), coaches (optionally view)

#### Screen 9: Jump Run Map
**Purpose:** Visualize predicted jump run and atmospheric data  
**Content Elements:**
- Map Background: Satellite view of dropzone area
- Jump Run Overlay: Predicted exit-to-landing trajectory (geometric line/arc)
- Concentric Circles: Zones representing freefall, canopy, ground distances
- Wind Data Display:
  - Heading (compass direction, e.g., "NW")
  - Ground Speed (e.g., "95 kt")
  - Separation (meters or feet between passes)
- Tab Navigation: Jump Run | Movement | Canopy
- Movement Tab: Drift visualization showing relative positions
- Canopy Tab: Landing area and recovery zones
**Interactions:** Rotate map, pinch zoom, tap for additional details, switch tabs
**Role Access:** Jumpers (view), staff (view and manage), pilots (critical)

#### Screen 10: Load Confirmation Screen
**Purpose:** Confirm participation and review critical load details  
**Content Elements:**
- Load Summary:
  - Load ID (e.g., "SD 5 7")
  - Status: "On Call" (or other statuses)
  - Scheduled Takeoff: Date and time (e.g., "Jan 9, 2026 at 11:09")
  - Countdown: "Taking off in 34 minutes"
- Critical Warning Banner: "Be at Gate 5 minutes before take off" (red/orange styling)
- Jumpers in Group: List of other jumpers on this load (name, jump count, badges)
- CTA Button: "Done" or "Confirm"
**Interactions:** Review details, cancel booking, proceed to gate
**Role Access:** Jumpers on load (personal view), staff (administrative)
**Trigger:** After selecting a load or being assigned

#### Screen 11: Manifest Board (Real-Time Load Management)
**Purpose:** Staff/organizer view of all loads and jumper assignments  
**Content Elements (per load row):**
- Load ID: Text (e.g., "SD 5", "SD 1")
- Countdown Timer: Minutes until departure (e.g., "19 Mins")
- Jumper Information:
  - Name (text)
  - Jump Count (e.g., "500+")
  - Payment Status Indicator: Badge (Full, Full+G, C/ADV, Coach A, *SD Tra)
  - Slot Assignment: Position code (BM5-1, BM8-1, etc.)
  - Formation Type: Discipline (FS, Solo, WS-1)
- Visual Coding:
  - Red names = Instructors/Coaches (authority)
  - Black names = Regular jumpers
  - Asterisk prefix (*) = Tandem slots
- Load-Level Actions: Expandable rows, edit slots, launch load
**Interactions:** Tap jumper to view details, swipe to reassign, tap load to manage
**Role Access:** Manifest staff, DZ owner, admin
**Real-Time:** Updates live as jumpers check in or change status

#### Screen 12: Media/Press Page
**Purpose:** Display third-party coverage and social proof  
**Content Elements:**
- Podcast Listings: Logo, title, episode link
- Awards: Achievement badges with dates
- Articles: Title, publication, date, link
- Video Links: Embedded or external
**Interactions:** Tap to open external links in browser
**Role Access:** All users (public informational)

#### Screen 13: Licenses Page
**Purpose:** Display open-source license attributions  
**Content Elements:**
- License List (scrollable):
  - Library/Package name
  - License type (MIT, Apache 2.0, etc.)
  - Copyright holder
  - Link to full text (in-app or external)
- Example: "Bluesky Social App – MIT License"
**Interactions:** Tap to expand/view full license text
**Role Access:** All users (legal/informational)

---

### 1.2 Navigation Map

#### Tab Structure (Bottom Navigation)
```
┌─────────────────────────────────────────┐
│  [Lightbulb] [Profile Avatar] [Logo]    │
│  DZ/Weather    Profile        FunJumpr  │
└─────────────────────────────────────────┘
```

#### Screen Flow Diagram

**Primary Entry Points:**
1. **Lightbulb Tab (DZ/Weather Module)**
   - Dropzone Home Screen (Screen 1)
     - Load Board → Load Confirmation (Screen 10)
     - Coaching Schedule (Screen 2)
     - "Who's Going" → Expand list
   - Jump Run Map (Screen 9)
   - Weather/Settings (Screen 6 → Screen 7)

2. **Profile Avatar Tab (Profile Module)**
   - User Profile (Screen 3)
     - Edit Profile (Screen 4)
       - Profile Tab (Screen 4)
       - Skills Tab (Screen 5)
       - Formation Selection (Screen 8)
     - Settings (Screen 6)
       - Units Config (Screen 7)
       - Clear Cache
       - Account Management
     - Legal/About (Screens 12, 13)

**Role-Based Navigation Variations:**
- **Jumper:** Home → Load Board → Confirm
- **Coach:** Home → Coaching Schedule → Manage Group
- **Manifest Staff:** Access to Screen 11 (Manifest Board) from admin menu or special tab

#### Navigation State Machine
```
Start
  ↓
Login/Home (Screen 1: Dropzone Home)
  ├─→ Load Board (Screen 1) → Load Confirmation (Screen 10)
  ├─→ Coaching Schedule (Screen 2) → Check-in (confirmation)
  ├─→ Jump Run Map (Screen 9)
  ├─→ Profile Tab (Screen 3)
  │   ├─→ Edit Profile (Screen 4-5)
  │   └─→ Formation Selection (Screen 8)
  └─→ Settings (Screen 6)
      ├─→ Units (Screen 7)
      └─→ Account/Legal (Screens 12-13)
```

---

### 1.3 Feature List by Module

#### Module: Manifest & Load Management
- **Dropzone Home Screen**
  - Load board display with real-time status
  - Countdown timers to departure
  - Load capacity indicators (slots available)
  - Slot assignment visibility
  
- **Load Confirmation**
  - Display load details (ID, time, gate, warning)
  - Show other jumpers on load
  - Confirm participation
  - Cancel participation with confirmation
  
- **Coaching Schedule Matrix**
  - View available coaches by discipline and skill level
  - Sign up for coaching slots
  - Real-time jumper count per slot
  - Day-of-week filtering
  
- **Manifest Board** (Staff-only)
  - Real-time load table with all jumpers
  - Status indicators (payment, role, assignment)
  - Jumper filtering and search
  - Quick reassignment of slots
  - Load launch/management controls

#### Module: User Profiles & Identity
- **User Profile**
  - Display: Name, avatar, jump count, tunnel hours, joining date, home DZ
  - Discipline badges with skill levels (ring gauge visualization)
  - Social counts (followers, following)
  - Bio/about text
  - Profile image customization
  
- **Profile Editing**
  - Edit personal information (name, jumping since, tunnel hours)
  - Set primary dropzone
  - Add social media links (Instagram, Facebook, YouTube)
  - Configure disciplines and skill levels (checkboxes + slider UI)
  - View and manage assigned roles
  
- **Social Features**
  - Follow/unfollow jumpers
  - View "Who's Going" to a DZ
  - "I'm going" button (commit to DZ visit)
  - Follower/following lists

#### Module: Training & Coaching
- **Coaching Schedule Matrix**
  - Filter by day of week
  - View coaches by discipline + skill level grid
  - Coach avatars and name labels
  - Availability and jumper count
  - Check-in/cancel for daily sessions
  
- **Discipline Management**
  - 8+ disciplines: Angle, Freefly, Belly, Swoop, Wingsuit, CRW, XRW, etc.
  - 4-level skill hierarchy: Beginner, Intermediate, Advanced, Ninja
  - Ring gauge visualization
  - User self-reporting

#### Module: Weather & Operations
- **Weather Widget** (Home Screen)
  - Wind speed (kt, mph, km/h, m/s)
  - Temperature (F, C)
  - Hourly timeline (8am-6pm or custom range)
  - Cloud cover (implied from screenshots)
  
- **Jump Run Visualization**
  - Satellite map view
  - Predicted exit-to-landing trajectory
  - Freefall/canopy/ground zones (concentric circles)
  - Wind heading and ground speed
  - Separation distance (jump pass spacing)
  - Tabs: Jump Run, Movement, Canopy
  
- **Weather Limits Configuration**
  - User-defined thresholds (settings)
  - Applied to home DZ
  - Affects go/no-go decisions

#### Module: Settings & Preferences
- **Units Configuration**
  - Airplane speed (kt, mph, km/h)
  - Wind speed (kt, mph, km/h, m/s)
  - Long distance (mi, km)
  - Short distance (ft, m)
  - Altitude (ft, m)
  - Fall rate (mph, km/h, m/s)
  - Temperature (F, C)
  - Applied globally to all numeric displays
  
- **App Settings**
  - Theme (Light/Dark)
  - Notifications (on/off)
  - Clear cache
  - Version display
  
- **Account Management**
  - Blocked users list
  - Delete account (destructive action)

#### Module: Formations & Jump Types
- **Formation Selection List**
  - 23+ formation types (FS, Freefly, Wingsuit, CRW, Tandem, AFF, Swoop, etc.)
  - User checkbox selection
  - Used for filtering coaching, loads, and social connections
  - Full list stored in user profile or preferences

#### Module: Social & Community
- **Who's Going Section** (Home Screen)
  - List of jumpers planning to jump at DZ
  - "I'm going" toggle button
  - Real-time updates
  
- **Following/Followers**
  - Manage connections
  - View on profile page
  - Filter social feeds (implicit)

#### Module: Information & Legal
- **About/Media Page**
  - Podcasts and interview links
  - Awards and recognition
  - Press articles
  - External social links
  
- **Licenses Page**
  - Open-source attribution (MIT, Apache 2.0, etc.)
  - Third-party library list

---

### 1.4 User Flows by Role

#### Role: Athlete/Jumper
**Primary Goals:** Find loads, sign up for jumps, manage profile, track progress

**Flow 1: Find and Confirm a Jump**
```
Start at Dropzone Home (Screen 1)
  → View Load Board (same screen)
  → Select load (e.g., "SD 5 7")
  → View Load Confirmation details (Screen 10)
  → Confirm "Done" or cancel
  → Confirmation receipt or error
End
```

**Flow 2: Sign Up for Coaching**
```
Start at Dropzone Home (Screen 1)
  → Tap "Coaching Schedule" (Screen 2)
  → Select day of week (default: Today)
  → View discipline/skill grid
  → Identify desired coach (avatar + name)
  → Tap "I'll be there Today!" (button)
  → Confirmation badge appears (button turns red with checkmark)
  → Option to "Cancel Today"
End
```

**Flow 3: Manage Profile & Skills**
```
Start at Profile Tab (Screen 3)
  → Tap edit icon or "Edit Profile"
  → Profile Tab (Screen 4):
      - Update name, jumping since, jumps, tunnel hours
      - Select primary DZ
      - Add bio and social links
      - Save
  → Switch to Skills Tab (Screen 5):
      - Check/uncheck disciplines (Belly, Angle, Freefly, etc.)
      - For each checked, slide to proficiency level
      - Save
  → Optional: Tap Formation Selection (Screen 8)
      - Check formations practiced
      - Save
End
```

**Flow 4: Check Weather & Plan Jump**
```
Start at Dropzone Home (Screen 1)
  → View Weather Widget (wind, temp, hourly)
  → Tap Jump Run Map (Screen 9)
  → View satellite, trajectory, zones, wind data
  → Review tabs: Jump Run → Movement → Canopy
  → Return to Load Board to commit
End
```

#### Role: Coach
**Primary Goals:** View coaching schedule, manage signed-up jumpers, coordinate teams

**Flow 1: View Coaching Schedule & Confirm Session**
```
Start at Coaching Schedule (Screen 2)
  → System shows: Day selector, discipline/skill grid
  → Coach avatars appear in their discipline rows
  → View jumper count ("1 Jumper", "0 Jumpers", etc.)
  → (Optional) Tap jumper count to expand names
  → Session automatically shows on coach's calendar
End
```

**Flow 2: Manage Team Formation**
```
Implied from Coaching Schedule:
  → Coach identifies assigned jumpers in a discipline slot
  → Can message or coordinate via app (implied)
  → View formation types (Screen 8 data shared)
  → Organize training plan
End
```

**Flow 3: View Manifest (if staff role elevated)**
```
Start at admin/staff menu
  → Access Manifest Board (Screen 11)
  → View all loads, jumpers, assignments
  → See real-time status
  → Monitor coach assignments
End
```

#### Role: Manifest Staff / DZ Organizer
**Primary Goals:** Manage loads, assign slots, monitor real-time manifest

**Flow 1: Monitor Real-Time Manifest**
```
Start at Manifest Board (Screen 11)
  → View all active loads (SD 5, SD 1, etc.)
  → See countdown timers
  → Each load shows:
      - All assigned jumpers (name, jump count, status badge)
      - Slot assignments (e.g., BM5-1, BM8-1)
      - Formation type per jumper
      - Red names = coaches/instructors
  → Refresh real-time as jumpers check in
  → Monitor payment status indicators
End
```

**Flow 2: Reassign a Jumper**
```
Start at Manifest Board (Screen 11)
  → Locate jumper in load
  → Swipe or right-click on jumper row
  → Options: Change slot, change load, change formation, remove
  → Confirm reassignment
  → Update displays live
End
```

**Flow 3: Launch Load & Track**
```
Start at Manifest Board (Screen 11)
  → Load is "FILLING" or "LOCKED"
  → Tap "Launch" or "Depart" action
  → System transitions load to "AIRBORNE"
  → Countdown stops, departure time confirmed
  → Manifest shows load status: "LANDED" → "COMPLETE"
End
```

#### Role: DZ Admin / Platform Admin
**Primary Goals:** Configure DZ settings, manage staff, oversee all loads and operations

**Implied Flows (not fully visible in screenshots):**
- Configure dropzone weather limits (Settings > Weather Limits)
- Manage blocked users (Settings > Blocked Users)
- View analytics/media (About page links)
- Manage multiple facilities (in Burble, implied capability)

---

### 1.5 Manifest-Related Workflows

#### Workflow 1: Self-Manifest (Jumper Perspective)
```
Jumper arrives at DZ
  → Opens FunJumpr
  → Navigates to Dropzone Home (Screen 1)
  → Sees Load Board with available loads
  → Reviews load details:
      - Load ID (SD 5 7)
      - Status (Full / Partial / Open)
      - Slot count available
      - Estimated departure time
      - Countdown (33 mins)
  → Taps load to confirm
  → Views Load Confirmation Screen (Screen 10):
      - All critical info (ID, gate, warning)
      - Other jumpers on load
      - Button: "Done" or "Confirm"
  → Taps "Done" to commit
  → System records manifest entry
  → Manifest Board updates in real-time (staff view)
  → Jumper receives confirmation (implicit: visual or notification)
End
```

#### Workflow 2: Staff-Managed Manifest
```
Manifest Staff at gate/desk
  → Opens Manifest Board (Screen 11)
  → Sees all loads in order:
      - Load ID, countdown, jumper list, slot assignments
  → New jumpers arrive
  → Staff manually assigns or pulls up self-manifest entry
  → Verifies payment status badge
  → Confirms formation/discipline
  → If needed, moves jumper between slots or loads
  → Marks load as "BOARDING" when gates close
  → Monitors countdown timer
  → Confirms all safety checks (implied)
  → Updates load to "AIRBORNE" after departure
  → System shows "LANDED" after jump complete
  → Final status: "COMPLETE"
End
```

#### Workflow 3: Load Capacity Management
```
Load Board shows:
  - "SD 5 1 Full" = All 1 slot assigned (or aircraft full)
  - "SD 1 2 8 slots" = 2 slots assigned, 8 slots available
  - "SD 5 2 2 slots" = 2 slots assigned, 2 slots available

When load fills:
  → Last jumper books slot
  → Load status changes from "Partial" to "Full"
  → No more slots available for new signups
  → Load automatically transitions to "LOCKED" (implied LoadStatus)
  → Load proceeds to "BOARDING"

If load doesn't fill by cutoff:
  → Last jumper cancels
  → Load reopens if minimum threshold not met
  → Staff may decide to delay or combine loads
  → Jumpers notified via notification or app refresh
End
```

#### Workflow 4: Coaching Slot Assignment (via Schedule Matrix)
```
Coach availability:
  → Coaching Schedule (Screen 2) shows grid
  → Each discipline row + skill level column = slot
  → Coach avatar appears in assigned slot
  → Jumper signs up: "I'll be there Today!"
  → Jumper count updates ("1 Jumper")
  → Coach sees updated count on schedule
  → Multiple jumpers can queue for same slot/time
  → Coaching session treated as "mini-load" or group booking
  → May integrate with main load board (implied)
End
```

#### Workflow 5: Real-Time Status Transitions
```
Load Lifecycle (Manifest Board view):
  OPEN (Available for signup)
    ↓
  FILLING (Slots assigned, not full)
    ↓
  LOCKED (Full or at cutoff time)
    ↓
  BOARDING (Jumpers at gate, final checks)
    ↓
  AIRBORNE (Aircraft launched)
    ↓
  LANDED (All jumpers accounted for on ground)
    ↓
  COMPLETE (Manifest closed, records finalized)

Staff actions trigger transitions:
  - Manifest Staff monitors countdown
  - At cutoff time, load moves LOCKED → BOARDING
  - Pilot confirms all safety checks
  - Load moves BOARDING → AIRBORNE
  - Upon landing, load moves AIRBORNE → LANDED
  - After all debriefs/safety, load moves LANDED → COMPLETE
End
```

---

## PART 2: BURBLE/BURBLEME APP AUDIT

### 2.1 Full Screen Inventory

#### Screen 1: BurbleMe Login
**Purpose:** Authentication gateway to operations platform  
**Content Elements:**
- Username Input: Placeholder "Enter username or email"
- Password Input: Masked text entry
- "Remember me" Checkbox (optional)
- "Forgot password?" Link (password reset flow)
- Social Sign-On Buttons:
  - Google OAuth button
  - Apple OAuth button
- Secondary CTA: "How it works?" (educational link)
- Registration Link: "Not yet registered? Sign up" (creates new account)
- Version Display: "Version 9.0.5" (bottom right)
**Interactions:** Enter credentials, select remember option, click SSO, tap links
**Role Access:** Unauthenticated users (public)
**Post-Login:** Redirects to Booking Home (Screen 3)

#### Screen 2: Password Reset Flow
**Purpose:** Allow password recovery and reset  
**Content Elements:**
- Email Confirmation: "Check your email for password reset link"
- Email Sender: noreply@burblesoftware.com
- "Set New Password" Page (after email link clicked):
  - Current Password Input (for security)
  - New Password Input
  - Confirm New Password Input
  - Submit Button
- Validation Rules Displayed:
  - "must differ from previous passwords" (appears if violation)
  - "must include at least one special character" (appears if violation)
  - Implicit: Minimum length (8+ chars, assumed)
  - Implicit: Password strength meter (implied from validation feedback)
**Interactions:** Click email link, enter new password, submit, see validation errors, retry
**Role Access:** Authenticated users (password reset only available if logged in or via recovery link)
**Security:** Tokens/links expire; multiple attempts blocked (implied)

#### Screen 3: Booking Home - Main View
**Purpose:** Central hub for managing reservations across multiple facilities  
**Content Elements:**
- User Welcome: "Hi [Username]"
- "Change Facility" Dropdown: Lists all accessible facilities
  - Options (multi-facility example):
    - Aarhus Faldskærms Club
    - Abu Dhabi Skydive
    - Gyro Flight Training
    - Kuwait Skydive & Fly
    - Skydive Dubai Desert Campus
    - Skydive Dubai Palm
    - Skydive Dubai Special Projects
    - Skydive Gyrocopter
    - Skydive Spain
  - Current selection highlighted
- Primary Action Buttons:
  - "Reschedule Booking" (modify existing reservation)
  - "Suspend Booking" (pause/defer jump)
  - "Add a Friend to Existing Booking" (group coordination)
  - "Create a New Booking" (new reservation)
  - "Contact Group Members" (messaging, implied)
  - "Invite Friends" (social coordination)
**Interactions:** Select facility, tap action button to proceed to flow
**Role Access:** Authenticated jumpers with bookings
**Data Persistence:** Selected facility persists across session

#### Screen 4: Main Menu
**Purpose:** Navigation hub to major feature areas  
**Content Elements:**
- Menu Items (vertical list):
  - "Manage Reservations" → Booking management, status view
  - "Manage Profile" → Personal information, verification
  - "Sign a Waiver" → Legal document signing (Screen 5)
  - "Connect My Merit Account" → Integration with USPA Merit (credentials)
  - "Connect Social Accounts" → Facebook, Instagram, etc.
  - "Privacy Settings" → Data sharing, visibility controls
**Interactions:** Tap item to navigate to respective screen/flow
**Role Access:** Authenticated users (all have access)
**Navigation Pattern:** Hamburger menu or dedicated menu tab

#### Screen 5: Sign a Waiver - Facility Selector
**Purpose:** Allow users to sign waivers for any DZ they plan to jump  
**Content Elements:**
- Facility Dropdown: Comprehensive list of worldwide facilities
  - US Facilities: Above the Poconos, AerOhio, Bay Area, Cleveland, Connecticut, Crystal Coast, DZONE Boise, DZONE Bozeman, Des Moines, Jumptown, Lincoln, Midwest Freefall, Music City, Pacific Northwest, various others
  - International: Beccles (UK), Black Knights, Blue Sky Ranch, CSC, Cadence Sky Sports, Dropzone Denmark, Flying-Devil (Germany), Fyrosity Las Vegas
  - Total: 50+ facilities in dropdown
- Alphabetical Sorting: Facilities listed A-Z
- Selection Action: Tap facility to proceed to waiver signing (Screen 4.1 implied)
**Interactions:** Search/filter by name, scroll to find, tap to select
**Role Access:** Authenticated users (any user can sign waiver at any facility)

#### Screen 6: BurbleMe Home Dashboard (Post-Login)
**Purpose:** Primary operations hub with quick access to all key functions  
**Content Elements:**
- Header Section:
  - User name (e.g., "Ali")
  - Large "CHECK IN" button (primary action, color-highlighted)
- Dropzone Selector: "Select your dropzone" dropdown (same as Screen 3)
- Balance Display: "AED 0.00" (currency and amount)
- Tickets Count: "10" (jump tickets available)
- Quick Action Grid (6 buttons):
  - "Load Builder" (team/formation planning)
  - "Get Organized" (scheduling/calendar)
  - "My Loads" (view active/upcoming loads)
  - "Transaction History" (payment/credit tracking)
  - "DZ Emergency" (safety/SOS)
  - "Leaderboard" (rankings/stats)
- Additional Grid Items (implied):
  - "Manage Jumpers" (if staff or team leader)
  - "Manage Teams" (if coach or organizer)
- Bottom Navigation Tabs:
  - Home (current)
  - Logbook (jump history)
  - Chat (messaging)
  - Profile (user settings)
**Interactions:** Tap CHECK IN, select dropzone, tap any quick action, tap bottom tabs
**Role Access:** Authenticated jumpers (primary view)
**Real-Time Updates:** Balance and ticket count update after bookings/payments

#### Screen 7: Load Builder
**Purpose:** Manage teams and organize group jumps  
**Content Elements:**
- Teams List (scrollable):
  - Team name (e.g., "BellyF10", "Tracking 10Nov", "me ali alid", "Ali And Edm", "me and nartin", "Crazy", "c1")
  - Team size or member count (implied from name structure)
- Team Card Actions (long-press / swipe options):
  - "Load Builder" (edit team, add members, set formation)
  - "Preview Team" (view members, stats, formation structure)
  - "Delete Team" (remove team, with confirmation)
- Create New Team: "+" button or "Create Team" CTA
**Interactions:** Tap team to view details, long-press for action menu, tap + to create
**Role Access:** Jumpers (manage own teams), coaches/organizers (manage groups)
**Data Persistence:** Teams persist across DZs until deleted

#### Screen 8: Load Detail
**Purpose:** Review specific load information and team composition  
**Content Elements:**
- Tab Navigation: Teams | History | Add Me
- Teams Tab (active):
  - Jumper List (each row):
    - Jumper name
    - Jump type (e.g., "Full altitude 150 pack")
    - Payment method (e.g., "Full Altitude Sports 150 pack")
    - Formation (e.g., "FS")
  - Total jumpers in load
  - Team-level details if applicable
- History Tab: Previous loads with same team composition, statistics
- Add Me Tab: Button to join load, confirm participation
- Bottom Action Buttons:
  - "Select Load" (commit to this load)
  - "Message" (contact team members)
  - "Scan QR" (check-in via QR code, mobile-specific)
**Interactions:** Swipe tabs, tap "Select Load", send message, scan QR on arrival
**Role Access:** Jumpers (view own teams), staff (view all loads)

#### Screen 9: Transaction History
**Purpose:** Track financial transactions and balance  
**Content Elements:**
- Filter Tabs: All | Jumps | Payments | Other
- Transaction List (each row):
  - Date (e.g., "Jan 9, 2026")
  - Item / Description (e.g., "Camp 3-5", "Block Ticket Redemption", "Credit Card", "Tunnel 15mins", "V AFF A", "Rental charge")
  - Amount (e.g., "220.00", "-440.00")
  - Transaction Type Icon (implied)
- Balance Summary:
  - Current Balance: "AED 0.00" (or currency value)
  - Available Tickets: "10"
  - Total Transactions: Count (e.g., "5")
  - Total Amount (sum of all transactions)
- Date Range Selector (implied): Filter by date
**Interactions:** Tap filter tab, scroll list, tap transaction for details, export (implied)
**Role Access:** Jumpers (view own), staff (view all if admin)
**Currency:** Multi-currency support (AED shown, likely converts based on DZ location)

#### Screen 10: DZ Emergency Screen
**Purpose:** Provide critical safety/SOS functionality  
**Content Elements:**
- Emergency State Options (large buttons):
  - "I'm hurt. Please send help" (red, emergency priority)
  - "I'm ok. Walking back" (green, safe)
  - "I'm ok. Need a ride back" (yellow/neutral, assistance needed)
  - "Call 911" (red, direct emergency call)
  - "Call DZ Number" (direct line to DZ)
- Location Permission Prompt: "Allow BurbleMe to access your location?" (for emergency response)
- Disclaimer Banner: "Note: This app is not a guarantee of assistance. Always use official DZ communication in emergency." (red text, prominent)
- Confirmation Dialog: "Are you sure?" (if incorrect button tapped)
**Interactions:** Tap option, confirm location access, system sends alert to DZ staff
**Role Access:** All jumpers (always available)
**Critical Requirement:** Lowest latency, redundant systems (implied), staff receives alerts
**Legal:** Disclaimer prevents liability claims; implies DZ responsible for backup procedures

#### Screen 11: Activity Log / Logbook
**Purpose:** Personal jump history and flight data  
**Content Elements:**
- Header: "Activity Log" title
- Action Button: "+" (add jump manually if offline)
- Settings Button: Gear icon (configure display/export)
- Jump Entries (vertical list):
  - Jump number (implicit: auto-numbered from history)
  - Date
  - Dropzone
  - Aircraft
  - Formation/discipline
  - Freefall time (duration)
  - Canopy time (duration)
  - Altitude (exit/landing)
  - Jump type (AFF, tandem, licensed, etc.)
  - Notes/photos (implied)
- Statistics Summary (bottom):
  - "Total jumps: 0" (count)
  - "Total Freefall: 0s" (aggregate time)
  - Total canopy time (implied)
- Expandable Rows: Tap entry to view full details
**Interactions:** Tap + to add jump, tap entry to expand, tap gear for export/settings
**Role Access:** Jumpers (view own), coaches (view group if permitted), admin (view all)
**Data Source:** Auto-populated from load history; manual entry for offline jumps
**Analytics:** Provides jump count, progression tracking, currency/certifications

#### Screen 12: Manage Organizers
**Purpose:** Control who can organize/coordinate jumps on behalf of user  
**Content Elements:**
- Organizer List (scrollable):
  - Organizer name (e.g., "Malik AlZuraiki", "Mohamed Mo Soliman")
  - Rating (e.g., "0.000000", "5.000000") — implied 5-star or numeric scale
  - Remove button (delete from approved list)
- Authorization Mode (Radio buttons):
  - "No Organizer" (selected by default, no one can organize for user)
  - "Allow My Organizers" (only listed organizers can schedule jumps)
  - "Allow Anyone To Organize Me" (open — anyone can book slots for user)
- Add Organizer: "+" button (search/invite by name/email)
**Interactions:** Tap radio option, tap X to remove organizer, tap + to add
**Role Access:** Jumpers (manage own organizers), team leaders/coaches (if delegated)
**Trust Model:** User explicitly permits coaches/organizers to manage their schedule
**Use Case:** Teams/group formations where one person (coach/DZ organizer) assigns slots

#### Screen 13: Waiver/Release Form
**Purpose:** Legal document signing for skydiving liability and safety acknowledgment  
**Content Elements:**
- DZ Branding: Skydive Dubai logo and name
- Waiver Sections:
  - Third Party Liability: Acknowledgment of inherent risks
  - Safety Rules: Confirmation of understanding and compliance
- Personal Information Form:
  - First Name (text input, required)
  - Middle Name (text input, optional)
  - Last Name (text input, required)
  - City (text input, required)
  - State/Province (text input, required)
  - Zip/Postal Code (text input, required)
  - Email Address (email input, required)
  - Emergency Contact Name (text input, required)
  - Emergency Contact Phone (phone input, required)
  - Emergency Contact Relationship (dropdown: Parent, Spouse, Sibling, Other)
- Digital Signature Pad: Signature capture (SwiftUI integration implied)
- Signature Timestamp: Date/time of signing recorded
- Agreement Checkboxes:
  - "I have read and understood the waiver" (required checkbox)
  - "I accept the terms and conditions" (required checkbox)
- Submit Button: "E-Sign" or "Submit" (final action)
- Provider Attribution: "Powered by SmartWaiver" (third-party integration)
**Interactions:** Enter info, fill form, sign digitally, check boxes, submit
**Role Access:** Non-waived users (required before first jump at DZ)
**Legal Integration:** SmartWaiver handles digital compliance and archival
**Persistence:** Waiver valid for X months (implied 12-24 months), requires renewal

#### Screen 14: Home with Active Load
**Purpose:** Show immediate next jump after booking  
**Content Elements:**
- Next Load Display (prominent card):
  - Load ID: "SD 5 7"
  - Date/Time: "Jan 9 2026 at 11:09"
  - Countdown: "33 mins" (to departure)
- Load Actions:
  - "Remind me" Button (notification reminder)
  - Checkmark indicator (optional: user has confirmed)
- Updated Balance: "Tickets: 9" (was 10, one used for booking)
- Additional Buttons (visible in this state):
  - "Manage Jumpers" (if user is organizer/coach)
  - "Manage Teams" (if user has teams)
- Quick Access: "My Loads", "Load Builder", "Get Organized" (visible as before)
**Interactions:** Tap load card for details, tap "Remind me", tap manage buttons
**Role Access:** Jumpers with active loads
**Trigger:** Appears after booking a load on same day

---

### 2.2 Navigation Map

#### Tab Structure (Bottom Navigation - Persistent)
```
┌─────────────────────────────────┐
│ Home | Logbook | Chat | Profile │
└─────────────────────────────────┘
```

#### Screen Flow Diagram

**Primary Entry Points:**

1. **Home Tab (Current)**
   - Booking Home (Screen 3)
     - Change Facility dropdown
     - Reschedule Booking (detailed flow)
     - Suspend Booking (confirmation)
     - Add Friend to Booking (group coordination)
     - Create New Booking (load selection)
     - Contact Group Members (messaging)
     - Invite Friends (social)
   - Quick Actions Grid (Screen 6):
     - Load Builder (Screen 7)
     - Get Organized (calendar view implied)
     - My Loads (list of booked loads)
     - Transaction History (Screen 9)
     - DZ Emergency (Screen 10)
     - Leaderboard (rankings, not detailed)
     - Manage Jumpers (roster, if staff)
     - Manage Teams (Screen 7 variant)
   - CHECK IN Button (direct to today's load)

2. **Logbook Tab**
   - Activity Log / Logbook (Screen 11)
     - View jump history
     - Add jump manually
     - Configure display/export

3. **Chat Tab**
   - Messaging hub (not fully detailed in screenshots)
   - Implied: Group messages, DZ notifications, team coordination

4. **Profile Tab**
   - Main Menu (Screen 4)
     - Manage Reservations (booking history)
     - Manage Profile (personal info edit)
     - Sign a Waiver (Screen 5 → Screen 13)
     - Connect Merit Account (USPA integration)
     - Connect Social Accounts (Facebook, Instagram)
     - Privacy Settings (data visibility)
   - Manage Organizers (Screen 12)
   - User Profile (name, avatar, stats, if applicable)

#### Login Flow
```
Unauthenticated User
  ↓
Login Screen (Screen 1)
  ├─→ Enter Credentials OR
  ├─→ Google OAuth OR
  └─→ Apple OAuth
  ↓
(Optional) Password Reset (Screen 2)
  ↓
Authenticated / Facility Selection
  ↓
Booking Home (Screen 3)
  ↓
Home Dashboard (Screen 6)
  ↓
Navigation to Primary Features via Tabs
```

#### Navigation State Machine
```
Login
  ↓
Home / Booking Home (Screen 3)
  ├─→ Quick Actions → Load Builder (Screen 7)
  ├─→ Quick Actions → My Loads (Screen 8 list)
  ├─→ Quick Actions → Transaction History (Screen 9)
  ├─→ Quick Actions → DZ Emergency (Screen 10)
  ├─→ Logbook Tab → Activity Log (Screen 11)
  ├─→ Chat Tab → Messaging
  └─→ Profile Tab → Main Menu (Screen 4)
      ├─→ Manage Reservations
      ├─→ Manage Profile
      ├─→ Sign Waiver (Screen 5 → Screen 13)
      ├─→ Connect Merit
      ├─→ Connect Social
      ├─→ Privacy Settings
      └─→ Manage Organizers (Screen 12)
```

---

### 2.3 Feature List by Module

#### Module: Authentication & Account
- **Login**
  - Username/email and password entry
  - Remember me checkbox
  - Google OAuth integration
  - Apple OAuth integration
  - Forgot password link
  - Sign up for new accounts
  
- **Password Reset**
  - Email-based recovery
  - Password validation rules
  - Special character requirement
  - Prevent reuse of previous passwords
  - Token expiration for security
  
- **Profile Management**
  - Personal information editing
  - Email verification
  - Password change (in settings, implied)
  - Privacy settings configuration
  - Social account linking

#### Module: Booking & Reservations
- **Booking Home**
  - Multi-facility support (switch between DZs)
  - Reschedule booking action
  - Suspend booking action
  - Create new booking
  - Add friend to existing booking
  - Contact group members
  - Invite friends to jump
  
- **Load Selection & Booking**
  - View available loads by DZ
  - Load details (time, capacity, formation)
  - Select load and confirm booking
  - See next active load prominently
  - Countdown timer to departure
  - Ticket/credit deduction visual feedback
  
- **Team Formation & Load Builder**
  - Create custom teams
  - Manage team rosters
  - Preview team composition
  - Assign formations (FS, Freefly, etc.)
  - Delete teams
  - Organize group jumps

#### Module: Payment & Financial
- **Transaction History**
  - Display all financial transactions
  - Filter by type: All, Jumps, Payments, Other
  - Show date, description, amount for each entry
  - Display current balance
  - Display ticket count
  - Multi-currency support (AED shown)
  
- **Balance & Credits**
  - Real-time balance display
  - Ticket inventory tracking
  - Deduct on booking confirmation
  - Block booking if insufficient funds/tickets
  - Support for pre-paid packages

#### Module: Safety & Emergency
- **DZ Emergency**
  - Quick SOS buttons for common scenarios
    - "I'm hurt. Please send help"
    - "I'm ok. Walking back"
    - "I'm ok. Need a ride back"
    - "Call 911"
    - "Call DZ Number"
  - Location sharing (with permission)
  - Alert sent to DZ staff
  - Disclaimer about non-guarantee of assistance
  
- **Waivers & Legal**
  - Sign waivers per facility
  - Digital signature capture (SmartWaiver)
  - Facility-specific waiver content
  - Personal information collection
  - Emergency contact fields
  - Agreement checkbox enforcement
  - Timestamp recording

#### Module: Logbook & Progress Tracking
- **Activity Log**
  - View all jump history
  - Display jump count, freefall time, canopy time
  - Filter by date range (implied)
  - Add jumps manually (offline capability)
  - Export/analytics (settings implied)
  - Detailed jump statistics

#### Module: Notifications & Communication
- **Messaging (Chat Tab)**
  - Group messaging with team members
  - DZ announcements and updates
  - Contact organizers
  - Invite friends to loads
  - (Details not fully visible in audit)

#### Module: Integration & Account Linking
- **USPA Merit Integration**
  - Connect to USPA database
  - Link Merit account to BurbleMe profile
  - Auto-populate jump history (implied)
  - Verify ratings and certifications (implied)
  
- **Social Account Linking**
  - Connect Facebook (share jumps, updates)
  - Connect Instagram (social sharing)
  - Connect other social platforms (implied)

#### Module: Organization & Group Management
- **Manage Organizers**
  - Approve/block individuals to organize jumps for user
  - Display organizer rating
  - Toggle: No Organizer, Allow My Organizers, Allow Anyone
  - Add/remove from approved list
  
- **Manage Jumpers**
  - If staff/organizer: View roster of jumpers under management
  - Assign formations
  - Track payment status
  - Manage team assignments

---

### 2.4 User Flows by Role

#### Role: Athlete/Jumper
**Primary Goals:** Book jumps, track progress, manage waivers, coordinate with teams

**Flow 1: Book a Jump at Home DZ**
```
Start at Home Tab → Booking Home (Screen 3)
  → Verify Facility is correct (use dropdown if needed)
  → Tap "Create a New Booking"
  → View available loads (date/time/formation)
  → Select desired load (e.g., "SD 5 7 - 11:09am")
  → Review load details (Screen 8):
      - Formation type (FS, Freefly, etc.)
      - Current participants
      - Payment method
  → Tap "Select Load"
  → Confirmation: Tickets decremented, balance updates
  → See active load on Home screen
  → (Later) Tap "CHECK IN" when arriving at DZ
End
```

**Flow 2: Create and Join a Team**
```
Start at Home Tab → Quick Actions "Load Builder" (Screen 7)
  → Tap "Create Team"
  → Enter team name (e.g., "Belly F10")
  → Add team members (search by name/email)
  → Select formation type (Belly formation)
  → Select load to book team into
  → Team members notified (implied via Chat)
  → Team preview shows all members (Screen 8)
  → Confirmation and load assignment
End
```

**Flow 3: Check Jump History & Statistics**
```
Start at Logbook Tab → Activity Log (Screen 11)
  → Scroll through jump history
  → View total jumps: "X"
  → View total freefall time: "Y hours"
  → Tap individual jump for details (date, DZ, formation, time)
  → Export or share statistics (gear icon menu)
  → Identify progression (jump count increase)
End
```

**Flow 4: Sign Waiver at New DZ**
```
Start at Profile Tab → Main Menu (Screen 4)
  → Tap "Sign a Waiver"
  → Facility Dropdown shows 50+ worldwide DZs
  → Select facility (e.g., "Skydive Dubai Desert")
  → Proceeds to Waiver Form (Screen 13):
      - Enter personal info (name, address, emergency contact)
      - Read waiver text sections
      - Sign digitally
      - Check agreement boxes
      - Tap "E-Sign"
  → Confirmation: Waiver signed and archived
  → Can now book loads at that facility
End
```

**Flow 5: Handle Emergency Situation**
```
While on jump (before, during, or after landing):
  → Hit DZ Emergency Button (Screen 10)
  → Choose state: "I'm hurt" / "I'm ok" / "Call 911" / etc.
  → Confirm location access (first time)
  → System sends alert with location to DZ staff
  → Provide follow-up information as needed
  → DZ staff coordinates response
End
```

#### Role: Coach / Organizer
**Primary Goals:** Build teams, manage group jumps, coordinate multiple jumpers

**Flow 1: Create Coaching Team**
```
Start at Home → Load Builder (Screen 7)
  → Create new team: "Advanced Angle - Week 5"
  → Add jumpers to team (search from student list)
  → Verify formation selection: "Angle"
  → Assign skill level (Advanced)
  → Select load to book team into
  → Team shows in Load Builder list
  → Can edit, delete, or reuse for future dates
End
```

**Flow 2: Manage Organizer Permissions**
```
Coach/Organizer wants to manage jumper schedules:
  → Jumper goes to Profile → Manage Organizers (Screen 12)
  → Taps "Allow My Organizers" radio button
  → Adds coach to approved list (search by email/name)
  → Coach then can add jumper to teams
  → Coach can assign formation, load, time
  → Jumper receives notification (implied)
  → Jumper can revoke permission anytime
End
```

**Flow 3: Coordinate Group Booking**
```
Coach has team of 5 jumpers:
  → Coach builds team in Load Builder (Screen 7)
  → Coach selects load for upcoming date
  → Coach assigns each jumper a formation slot
  → System deducts tickets from each jumper's account
  → Coach can message team via Chat tab
  → Pre-jump brief shared in group message
  → On day of jump: Coach verifies all arrived via CHECK IN
  → Post-jump: Coach debriefs in Chat, logs jump for group
End
```

#### Role: Manifest Staff / DZ Manager
**Primary Goals:** Manage load board, process waivers, track transactions, manage DZ roster

**Flow 1: View and Manage Daily Loads**
```
Staff logs in, selects facility dropdown:
  → Implicitly has access to Staff/Admin view (Manifest Board implied)
  → Views all loads for day:
      - Load ID, times, status, participant count
      - Payment status indicators
  → Monitors ticket inventory
  → Verifies waivers signed (Waiver signing tracked)
  → Processes late changes/cancellations
  → Updates load status: OPEN → LOCKED → BOARDING → AIRBORNE
  → (Exact manifest board UI not fully detailed in Burble audit, but implied)
End
```

**Flow 2: Review Transaction History**
```
Staff monitors revenue and balance:
  → Home Tab → Quick Actions "Transaction History" (Screen 9)
  → Filter by "Payments" to see all credits/charges
  → Reconcile with DZ revenue (if admin)
  → Identify failed transactions or refunds
  → Track ticket usage vs. available inventory
  → Generate reports for accounting (implied)
End
```

**Flow 3: Manage Waiver Compliance**
```
New jumper arrives at DZ:
  → Check if waiver signed in system
  → If not, direct to Profile → Sign Waiver
  → Jumper selects current DZ facility
  → Fills personal info and signs (Screen 13)
  → Staff confirms completion in system
  → Jumper cleared to book loads
End
```

#### Role: DZ Admin / Platform Admin
**Primary Goals:** Configure system settings, manage multi-facility operations, oversee compliance

**Implied Flows (not fully visible):**
- Configure pricing, ticket packages, payment methods per facility
- Manage staff accounts and permissions (roles: organizer, coach, manager, admin)
- View consolidated transaction history across all facilities
- Generate compliance reports (waivers, incident logs)
- Monitor emergency alert system
- Manage facility-specific waiver templates

---

### 2.5 Manifest-Related Workflows

#### Workflow 1: Jumper Self-Booking (No Team)
```
Jumper arrives at DZ
  → Logs into BurbleMe (or stays logged in)
  → Home Tab → Booking Home (Screen 3)
  → Facility dropdown confirms correct location
  → Verifies balance (AED X.XX) and tickets (10 available)
  → Tap "Create a New Booking" OR "My Loads"
  → Views available loads (list, sorted by time)
  → Selects preferred load (e.g., "SD 5 7 - 11:09am")
  → Reviews load detail (Screen 8):
      - Formation: FS (Freefall Formation)
      - Current jumpers: List with names and jump counts
      - Payment method: "Full Altitude Sports 150 pack"
  → Taps "Select Load" or "Add Me"
  → System validates:
      - Waiver signed for this facility? (Yes required)
      - Balance sufficient? (deduct ticket)
      - Load slots available? (check capacity)
  → Confirmation: Load assigned, ticket count decremented (10 → 9)
  → Jumper now appears on Manifest Board (staff view)
  → Countdown shows on Home screen: "33 mins to departure"
  → Optional: Tap "Remind me" for notification
  → On arrival at gate: QR code scan or manual CHECK IN to confirm
  → Staff marks jumper as physically present
End
```

#### Workflow 2: Team-Based Booking (Coach Manages)
```
Coach has registered team "Advanced Angle - Week 5" (5 jumpers):
  → Coach in Load Builder (Screen 7) views team
  → Selects booking date/load
  → Coach assigns each member to specific load slot
  → System emails/messages team members (implied)
  → Each jumper receives notification to confirm
  → Jumpers can:
      - Accept assignment
      - Propose swap with another jumper
      - Decline (coach reassigns)
  → Coach taps "Load Builder" action to manage assignments
  → All 5 jumpers booked to same load
  → Team shows as "Full" in Load Builder
  → Jumpers see team name on their Home screen: "Advanced Angle - Week 5"
  → Pre-jump: Coach sends briefing via Chat
  → Day of: All team members CHECK IN together
  → Manifest shows team color/grouping (implied)
  → Post-jump: Coach logs jump for entire team in Logbook
End
```

#### Workflow 3: Real-Time Manifest Updates
```
Manifest Staff at DZ desk (assumed admin/staff view, not explicitly shown):
  → Views all loads for day (implied manifest table/board)
  → Each load shows:
      - Load ID, aircraft, departure time
      - Jumper list with names and jump counts
      - Payment status (Full, Pending, Unpaid)
      - Formation/slot assignments
  → As jumpers arrive: Manual check-in or QR scan
  → Staff marks jumper as "PRESENT"
  → System shows real-time participant count update
  → Load status transitions:
      - OPEN (can still add jumpers)
      - LOCKED (no more changes, count finalized)
      - BOARDING (final safety checks, gate closed)
      - AIRBORNE (aircraft departed)
      - LANDED (all jumpers accounted for on ground)
      - COMPLETE (manifest finalized, records locked)
  → If jumper cancels before departure:
      - Staff removes from load
      - System refunds ticket to jumper account
      - Load remains intact (if at min capacity) or combines with another load
  → Staff initiates load departure:
      - Final headcount confirmation
      - Load status → AIRBORNE
      - Timer stops
  → Post-landing:
      - Load status → LANDED
      - Jump details auto-populate logbook (implied)
      - Load → COMPLETE (no more edits)
End
```

#### Workflow 4: Waiver-Dependent Manifest
```
New jumper attempts first booking at facility:
  → Booking Home (Screen 3) → Create New Booking
  → Selects load "SD 1 2"
  → System checks: Waiver signed for Skydive Dubai?
  → Jumper has no waiver on file
  → System blocks booking: "Please sign waiver first"
  → Directs jumper to Profile → Sign Waiver
  → Facility list shows "Skydive Dubai Desert Campus" as current DZ
  → Jumper fills waiver form (Screen 13)
  → SmartWaiver integration archives signed document
  → System records: Waiver valid for 12 months
  → Jumper returns to booking
  → Waiver check passes
  → Load booking proceeds normally
End
```

#### Workflow 5: Payment & Ticket Deduction Flow
```
Jumper books load:
  → Before: Tickets = 10, Balance = AED 0.00 (or some credit)
  → Load costs: 1 ticket OR AED 150 (if per-jump fee)
  → Tap "Select Load"
  → System calculates deduction
  → Confirms: "Booking this load will use 1 ticket. Proceed?"
  → Jumper confirms
  → Transaction processed:
      - Ticket inventory: 10 → 9
      - Load booking recorded
      - Logbook entry created (pending jump completion)
      - Receipt generated (can view in Transaction History)
  → After jump completion:
      - Load status → COMPLETE
      - Jump recorded in Activity Log
      - Can export to USPA (if integrated)
End
```

---

## PART 3: COMBINED FEATURE GAP MATRIX

### 3.1 Feature Comparison Table (FunJumpr vs Burble vs SkyLara)

| **Feature** | **FunJumpr** | **Burble** | **SkyLara** |
|---|---|---|---|
| **AUTHENTICATION & ACCOUNTS** |
| Username/Password Login | ✓ | ✓ | ✓ (API) |
| OAuth (Google/Apple) | ✗ | ✓ | ✓ (API design) |
| Password Reset | ✗ (implied) | ✓ | ✓ (API) |
| Remember Me | ✗ | ✓ | ✓ (API) |
| Multi-DZ Account Support | ✗ | ✓ | ✓ (implied) |
| **BOOKING & MANIFEST** |
| Self-Service Load Booking | ✓ | ✓ | ✓ (implied) |
| Load Board Display | ✓ | ✓ | ✓ (implied) |
| Countdown Timers | ✓ | ✓ | ✓ (implied) |
| Capacity Indicators | ✓ (slots shown) | ✓ (team size) | ✓ (implied) |
| Real-Time Manifest (Staff) | ✓ | ✗ (not shown) | ✓ (implied) |
| QR Code Check-In | ✗ | ✓ | ✓ (implied) |
| Team Formation Tools | ✗ | ✓ (Load Builder) | ✓ (implied) |
| Facility Switching | ✗ | ✓ | ✓ (implied) |
| Load Status Tracking (OPEN→COMPLETE) | ✓ (implied) | ✗ (not shown) | ✓ (explicit) |
| **PROFILE & IDENTITY** |
| User Profiles | ✓ | ✓ (implied) | ✓ |
| Profile Photo/Avatar | ✓ | ✓ | ✓ |
| Jump Statistics | ✓ | ✓ | ✓ |
| Discipline Tracking | ✓ | ✗ | ✓ |
| Skill Level Indicators | ✓ (ring gauge) | ✗ | ✓ |
| Social Links (Instagram, FB, YouTube) | ✓ | ✓ | ✓ (implied) |
| Followers/Following | ✓ | ✗ | ✓ |
| **TRAINING & COACHING** |
| Coaching Schedule Matrix | ✓ (unique) | ✗ | ✗ |
| Discipline-Based Filtering | ✓ | ✗ | ✓ (assumed) |
| Skill-Level Filtering | ✓ | ✗ | ✓ (assumed) |
| Coach Availability Display | ✓ | ✗ | ✗ |
| Sign-Up for Coaching Sessions | ✓ | ✗ | ✓ (implied) |
| Jumper Count per Session | ✓ | ✗ | ✓ (implied) |
| Manage Organizers/Approval | ✗ | ✓ | ✗ |
| **WEATHER & OPERATIONS** |
| Weather Widget | ✓ | ✗ | ✓ |
| Wind Speed Display | ✓ | ✗ | ✓ |
| Temperature Display | ✓ | ✗ | ✓ |
| Hourly Timeline | ✓ | ✗ | ✓ |
| Jump Run Visualization | ✓ (satellite map) | ✗ | ✓ |
| Drift Zones (freefall/canopy) | ✓ | ✗ | ✓ |
| Wind Heading/Ground Speed | ✓ | ✗ | ✓ |
| Canopy Landing Zones | ✓ | ✗ | ✓ |
| Weather Limits Config | ✓ | ✗ | ✓ |
| **PAYMENTS & TRANSACTIONS** |
| Balance Display | ✗ | ✓ | ✓ |
| Ticket Inventory | ✗ | ✓ | ✓ |
| Transaction History | ✗ | ✓ | ✓ |
| Filter Transactions | ✗ | ✓ (All/Jumps/Payments/Other) | ✓ |
| Multi-Currency Support | ✗ | ✓ | ✓ |
| Block/Prepaid Packages | ✗ | ✓ (implied) | ✓ |
| Payment Method Tracking | ✗ | ✓ | ✓ |
| Refund Handling | ✗ | ✓ (implied) | ✓ |
| **SAFETY & EMERGENCY** |
| Emergency SOS Button | ✗ | ✓ | ✗ |
| Location Sharing (Emergency) | ✗ | ✓ | ✗ |
| Emergency Contact Integration | ✗ | ✓ | ✓ |
| Digital Waiver Signing | ✗ | ✓ (SmartWaiver) | ✗ |
| Facility-Specific Waivers | ✗ | ✓ | ✗ |
| Waiver Management / Renewal | ✗ | ✓ | ✗ |
| Incident Reporting | ✗ | ✗ | ✓ |
| **JUMP TRACKING & ANALYTICS** |
| Activity Log / Logbook | ✗ | ✓ | ✓ |
| Freefall Time Tracking | ✗ | ✓ | ✓ |
| Canopy Time Tracking | ✗ | ✓ | ✓ |
| Formation Logging | ✗ | ✓ | ✓ |
| Jump Notes | ✗ | ✓ (implied) | ✓ |
| Photo Integration | ✗ | ✓ (implied) | ✓ |
| Export Jump Data | ✗ | ✓ | ✓ |
| Auto-Log from Manifest | ✗ | ✓ (implied) | ✓ |
| **COMMUNICATIONS** |
| Messaging / Chat | ✗ | ✓ | ✓ |
| Group Messaging (Teams) | ✗ | ✓ | ✓ |
| DZ Announcements | ✗ | ✓ | ✓ |
| Contact Organizer | ✗ | ✓ | ✓ |
| Notifications | ✓ (implied) | ✓ | ✓ |
| **INTEGRATIONS** |
| USPA Merit Linking | ✗ | ✓ | ✗ |
| Social Media Integration | ✗ | ✓ | ✓ |
| SmartWaiver | ✗ | ✓ | ✗ |
| Third-Party Analytics | ✗ | ✗ | ✓ |
| **SETTINGS & PREFERENCES** |
| Unit Configuration | ✓ | ✗ | ✓ |
| Theme Selection (Light/Dark) | ✓ | ✗ | ✓ |
| Clear Cache | ✓ | ✗ | ✗ |
| Privacy Settings | ✗ | ✓ | ✓ |
| Blocked User Management | ✓ | ✗ | ✓ |
| Account Deletion | ✓ | ✗ | ✓ |
| **SOCIAL & COMMUNITY** |
| "Who's Going" Feed | ✓ (unique) | ✗ | ✗ |
| Follow Jumpers | ✓ | ✗ | ✓ |
| Leaderboard / Rankings | ✗ | ✓ | ✗ |
| Discipline Badges | ✓ | ✗ | ✓ |
| Media / Press Page | ✓ | ✗ | ✗ |

---

### 3.2 Missing Features in SkyLara (Competitors Have, SkyLara Doesn't)

#### High Priority (Operationally Critical)
1. **Coaching Schedule Matrix** (FunJumpr)
   - Grid-based view: Disciplines (rows) × Skill Levels (columns)
   - Coach avatars placed in grid cells
   - Real-time jumper count per slot
   - Day-of-week filtering
   - One-click sign-up for coaching sessions
   - **Impact:** Essential for coaching coordination; FunJumpr's most unique feature

2. **Real-Time Manifest Board** (FunJumpr shows, Burble implies)
   - Live jumper list with payment status badges
   - Slot assignments visible
   - Color-coded roles (red = instructor, black = regular)
   - Jumper count with quick stats (jump count, currency)
   - Load status transitions visible
   - **Impact:** Critical for staff operations; enables rapid load management

3. **QR Code Check-In** (Burble)
   - Jumper scans QR at gate to confirm physical arrival
   - Eliminates manual list scanning
   - Integrates with manifest board
   - Reduces errors and speeds boarding process
   - **Impact:** Operational efficiency, safety accountability

4. **Digital Waiver Signing** (Burble via SmartWaiver)
   - E-signature capability with timestamp
   - Personal information collection
   - Emergency contact fields
   - Facility-specific waiver templates
   - Waiver validity tracking (renewal reminders)
   - Legal compliance archival
   - **Impact:** Legal protection, reduces paper, streamlines onboarding

5. **Transaction History with Filtering** (Burble)
   - Filter by: All, Jumps, Payments, Other
   - Shows date, description, amount
   - Cumulative balance and ticket count
   - Refund tracking
   - **Impact:** Financial transparency, operational auditing

6. **Emergency SOS Button** (Burble)
   - Quick-tap emergency notification system
   - Location sharing (with permission)
   - Multiple scenarios: Injured, OK/Walking, Need Ride, Call 911, Call DZ
   - Alerts sent to DZ staff immediately
   - Disclaimer about backup procedures
   - **Impact:** Critical safety feature, legal liability management

#### Medium Priority (Competitive)
7. **"Who's Going" Social Feed** (FunJumpr)
   - List of jumpers planning to visit DZ today
   - "I'm going" toggle button
   - Real-time updates
   - Encourages group jumps and social engagement
   - **Impact:** Social stickiness, community building

8. **Unit Configuration** (FunJumpr)
   - Global unit preferences: Speed (kt, mph, km/h), Distance, Altitude, Temp, etc.
   - Applied to all numeric displays
   - **Impact:** User experience for international audience

9. **Manage Organizers** (Burble)
   - Approve/deny specific coaches or organizers to manage schedule
   - Rating display (trust indicator)
   - Toggle: No Organizer, Allow My Organizers, Allow Anyone
   - **Impact:** Delegation and group coordination (especially in team sports context)

10. **Leaderboard / Rankings** (Burble mentions)
    - Jumper stats ranking (jump count, freefall time, etc.)
    - Discipline-specific rankings
    - Community engagement
    - **Impact:** Gamification, social engagement

11. **USPA Merit Integration** (Burble)
    - Connect USPA account
    - Auto-populate jump history
    - Verify ratings and certifications
    - Cross-reference data
    - **Impact:** Data accuracy, compliance, reduces manual entry

#### Lower Priority (Nice-to-Have)
12. **Formation Selection Full List** (FunJumpr shows 23 types)
    - Comprehensive dropdown of all formation types
    - User can self-tag disciplines practiced
    - Used for filtering in other parts of app
    - **Impact:** Better profile completeness, filtering accuracy

13. **Theme Selection (Light/Dark)** (FunJumpr)
    - Toggle between light and dark modes
    - Persists in settings
    - **Impact:** User preference, accessibility

14. **Clear Cache Button** (FunJumpr)
    - Clears app cache to free storage
    - Useful for troubleshooting
    - **Impact:** User support, technical UX

15. **Media / Press / Marketing Page** (FunJumpr)
    - Podcasts, awards, articles, interviews
    - Social proof for platform credibility
    - **Impact:** Marketing/brand building, not operational

---

### 3.3 SkyLara Unique Advantages (Already Has Better)

#### Architectural Advantages
1. **13 Bounded Modules** (SkyLara designed vs. Competitors' Ad-hoc)
   - SkyLara: Explicit module design (identity, manifest, training, booking, payments, safety, gear, notifications, weather, reports, platform, story, shop)
   - Competitors: Feature-scattered, no clear modularity
   - **Advantage:** Maintainability, scalability, clear ownership

2. **10+ Explicit Roles with Permissions** (SkyLara vs. Implicit in Competitors)
   - SkyLara: PLATFORM_ADMIN, DZ_OWNER, DZ_MANAGER, MANIFEST_STAFF, TI, AFFI, COACH, PILOT, RIGGER, ATHLETE, STUDENT, SPECTATOR + read-only
   - FunJumpr: Roles implied from UI (jumper, coach, staff)
   - Burble: Roles scattered (jumper, organizer, staff, admin)
   - **Advantage:** Explicit permission model, easier to reason about, extensible

3. **75 Database Tables (14 Domains)** (SkyLara vs. Competitors' Unknown Schema)
   - SkyLara: Designed schema with clear entities and relationships
   - Competitors: Schema inferred from UI; likely ad-hoc
   - **Advantage:** Data integrity, relational consistency, complex queries enabled

4. **80+ Designed API Endpoints** (SkyLara vs. Competitors' Unknown)
   - SkyLara: RESTful design with clear endpoint categories
   - Competitors: API hidden from users; inferred from app behavior
   - **Advantage:** Developer clarity, third-party integration capability

#### Feature Completeness Advantages
5. **Incident Reporting** (SkyLara has, Competitors Don't)
   - SkyLara: Safety module includes incident tracking
   - Competitors: No incident reporting visible
   - **Advantage:** Safety compliance, post-jump analysis

6. **Gear Management** (SkyLara Module, Competitors Don't Show)
   - SkyLara: Explicit gear module (rig registration, AAD service, reserve repack)
   - Competitors: No visible gear tracking
   - **Advantage:** Maintenance tracking, safety compliance, rental management

7. **Payment Abstraction** (SkyLara Module vs. Burble's Direct Transaction)
   - SkyLara: Payments module designed as separate concern
   - Burble: Transactions shown directly in history
   - **Advantage:** Payment provider flexibility, currency handling, refund workflows

8. **Notifications Module** (SkyLara explicit vs. Competitors' Ad-hoc)
   - SkyLara: Notifications module (implied cross-cutting)
   - Competitors: Notifications mentioned but no visible architecture
   - **Advantage:** Consistent notification behavior, opt-in management

9. **Reports Module** (SkyLara has, Competitors Don't Show)
   - SkyLara: Explicit reporting capability
   - Competitors: No reporting features visible
   - **Advantage:** Analytics, compliance reporting, DZ operations insights

10. **Shop / Retail** (SkyLara module, Competitors Don't Show)
    - SkyLara: Designed shop for merchandise, gear sales
    - Competitors: No visible e-commerce
    - **Advantage:** Revenue stream, community engagement

---

**Summary of Gap Analysis:**
- **FunJumpr Strength:** Social features (Who's Going), unique coaching schedule matrix, elegant weather visualization
- **Burble Strength:** Operations-heavy (real manifest, emergency SOS, waiver integration, payments, USPA linking)
- **SkyLara Strength:** Architectural design, role-based permissions, comprehensive module design, scalability foundation

**Top SkyLara Mobile Priorities (from gap analysis):**
1. Coaching Schedule Matrix (FunJumpr's unique innovation)
2. Real-Time Manifest Board (Essential for staff)
3. QR Code Check-In (Operational efficiency)
4. Digital Waiver Signing (Legal + UX)
5. Emergency SOS (Safety critical)
6. Who's Going Social Feed (Community engagement)
7. Organizer Management (Delegation)


---

## PART 4: SKYLARA MOBILE APP STRUCTURE (RECOMMENDED)

### 4.1 Information Architecture

#### Primary Layers
```
SkyLara Mobile App (iOS/Android)
├── Authentication Layer
│   ├── Login / Registration
│   ├── OAuth (Google, Apple)
│   ├── Password Reset
│   └── Session Management
├── Core Navigation
│   ├── Bottom Tab Bar (5 tabs)
│   ├── Facility Switcher (persistent)
│   └── Role-Based Menu
└── Bounded Modules (Mobile Subset)
    ├── Manifest & Booking
    ├── Training & Coaching
    ├── Profile & Identity
    ├── Weather & Operations
    ├── Payments & Transactions
    ├── Safety & Emergency
    ├── Notifications
    └── Logbook & Analytics
```

#### Bottom Tab Bar (5 Primary Tabs)
1. **Home** (Primary hub)
   - Load board
   - Countdown timers
   - Quick actions grid
   - Next jump preview
   - Balance/tickets summary

2. **Manifest** (Booking + Real-Time Board)
   - Load builder (team formation)
   - My bookings
   - Real-time manifest (staff only)
   - QR check-in

3. **Training** (Coaching-Focused)
   - Coaching schedule matrix
   - My coaching sessions (booked)
   - Discipline tracking
   - Skill level progression

4. **Logbook** (Analytics)
   - Jump history
   - Statistics (total jumps, freefall time)
   - Export capabilities
   - Progression visualizations

5. **Profile** (Account & Settings)
   - User profile card
   - Edit profile
   - Waivers management
   - Settings & preferences
   - Emergency contacts

#### Facility Context
- **Persistent Facility Selector** (top of Home, Manifest tabs)
  - Dropdown showing all accessible facilities
  - Current facility highlighted
  - Instantly switches context (loads, weather, coaching, etc.)
  - Stored in user session

#### Role-Based Visibility
- **Jumper/Athlete View:** All 5 tabs + standard features
- **Coach View:** All 5 tabs + Manage Teams, Coaching Schedule editing
- **Manifest Staff:** All 5 tabs + Real-Time Manifest Board (Manifest tab expanded)
- **DZ Owner/Admin:** All tabs + Admin settings (implied in Profile → Settings)

---

### 4.2 Screen-by-Screen Specification

#### HOME TAB SCREENS

**Screen H1: Home Dashboard**
```
[Facility Selector Dropdown]      [Notifications Bell]
[User Name] [Balance: AED X]      [Tickets: Y]
╔═══════════════════════════════╗
║  NEXT JUMP                    ║
║  Load: SD 5 7                 ║
║  Time: Jan 9, 2026 @ 11:09    ║
║  Countdown: 33 mins           ║
║  [Remind Me] [View Load]      ║
╚═══════════════════════════════╝
┌───────────────────────────────┐
│ WEATHER WIDGET                │
│ Wind: 3-4 mph NW              │
│ Temp: 55F                     │
│ Jump Run Map (tap for detail) │
└───────────────────────────────┘
┌───────────────────────────────┐
│ QUICK ACTIONS (6 grid)        │
│ [Load Board] [My Loads]       │
│ [Manifest]  [Load Builder]    │
│ [Coaching]  [Emergency SOS]   │
└───────────────────────────────┘
┌───────────────────────────────┐
│ WHO'S GOING TODAY             │
│ • Alice (500+ jumps)          │
│ • Bob (12 jumps)              │
│ • Carol (350 jumps)           │
│ [+ I'm going]                 │
└───────────────────────────────┘
```

**Screen H2: Load Board / Loads List**
```
[Facility Selector] [Sort: Time ▼]
┌───────────────────────────────┐
│ Load ID │ Time  │ Status      │
├─────────┼───────┼─────────────┤
│ SD 5 7  │ 11:09 │ Now / 0m    │
│ SD 1 2  │ 11:26 │ In 26m      │
│ SD 5 2  │ 11:39 │ In 39m      │
│ SD 1 3  │ 11:56 │ In 56m      │
│ SD 5 3  │ 12:30 │ In 1h 30m   │
└───────────────────────────────┘
[Swipe left to see slot count]
```

**Screen H3: Load Details**
```
[Back to Load Board]
╔═══════════════════════════════╗
║ LOAD: SD 5 7                  ║
║ Scheduled: Jan 9 @ 11:09 AM   ║
║ Status: OPEN                  ║
║ Slots Available: 4 / 8        ║
║ Formation: FS (Freefall)      ║
╚═══════════════════════════════╝
┌───────────────────────────────┐
│ GATE: 5                       │
│ WARNING: Be at gate 5 min      │
│ before takeoff!               │
└───────────────────────────────┘
┌───────────────────────────────┐
│ JUMPERS ON THIS LOAD          │
│ • Alice (500+) ✓ Paid         │
│ • Bob (12) ○ Pending          │
│ • Carol (350) ✓ Paid          │
│ • Dave (80) ✓ Paid            │
└───────────────────────────────┘
[Select Load] [Message]
```

**Screen H4: Jump Run Map**
```
[Facility: Skydive Dubai]
[Tabs: Jump Run | Movement | Canopy]
[Satellite map with overlay]
  - Predicted jump run trajectory (arc)
  - Concentric zones (freefall, canopy, ground)
  - Wind heading arrow (NW)
  - Ground speed: 95 kt
  - Separation: 500m
[Zoom in/out controls]
```

---

#### MANIFEST TAB SCREENS

**Screen M1: Manifest Home / Load Builder Hub**
```
[Facility Selector]
╔═══════════════════════════════╗
║ QUICK ACTION: [CHECK IN]      ║
║ (Taps QR scanner or list)     ║
╚═══════════════════════════════╝
┌───────────────────────────────┐
│ [Create New Booking] [My Load] │
│ [Load Builder] [My Teams]      │
└───────────────────────────────┘
┌───────────────────────────────┐
│ RECENT LOADS                  │
│ SD 5 7 - Today 11:09          │
│ SD 1 2 - Today 11:26          │
│ SD 5 2 - Tomorrow 10:00       │
└───────────────────────────────┘
```

**Screen M2: Load Builder (Team Management)**
```
[+ Create New Team]
┌───────────────────────────────┐
│ MY TEAMS (long-press actions) │
├───────────────────────────────┤
│ BellyF10 (5 members)          │
│ [👁 Preview] [✏ Edit] [🗑 Del]│
│ Tracking 10Nov (8 members)    │
│ [👁 Preview] [✏ Edit] [🗑 Del]│
│ Ali And Edm (3 members)       │
│ [👁 Preview] [✏ Edit] [🗑 Del]│
└───────────────────────────────┘
```

**Screen M3: Real-Time Manifest Board (Staff Only)**
```
[Facility: Skydive Dubai Desert]
┌──────────────────────────────────────────┐
│ LOAD ID │ MINS │ JUMPERS │ STATUS       │
├──────────────────────────────────────────┤
│ SD 5 7  │ 0    │ 4 / 8   │ BOARDING     │
│ SD 1 2  │ 26   │ 6 / 8   │ FILLING      │
│ SD 5 2  │ 39   │ 2 / 8   │ OPEN         │
│ SD 1 3  │ 56   │ 8 / 8   │ LOCKED       │
└──────────────────────────────────────────┘
[Tap load to expand jumper list]
[Swipe to reassign jumper to different slot]
```

**Screen M4: Load Detail (Manifest Board Expansion)**
```
LOAD: SD 5 7 | Status: BOARDING | 4/8 jumpers
┌──────────────────────────────────────┐
│ Name │ Jumps │ Status │ Formation   │
├──────────────────────────────────────┤
│ Ali  │ 500+  │ ✓Paid  │ FS-BM5-1    │
│ Bob  │ 12    │ ○Pend  │ FS-BM8-1    │
│ Carol│ 350   │ ✓Paid  │ FS-BM4-1    │
│ Dave │ 80    │ ✓Paid  │ FS-BM2-1    │
│ [TI] │ 5000+ │ ✓Paid  │ FS-TI       │
└──────────────────────────────────────┘
[Action: Launch Load] [Cancel Load]
```

**Screen M5: QR Check-In Scanner**
```
[Facility: Skydive Dubai Desert]
[Camera view with QR overlay]
Scanning QR code...
[Manual fallback: Enter jumper name/ID]
[Cancel]
```

---

#### TRAINING TAB SCREENS

**Screen T1: Coaching Schedule Matrix**
```
[Facility] [Day Selector: M Tu W Th TODAY Sa Su]
[Date: Friday 1/09]
┌────────────────────────────────────────┐
│ DISCIPLINE │ BEG    │ INT    │ ADV     │
├────────────────────────────────────────┤
│ Belly      │ [👤]   │ [👤]   │ [👤]   │
│            │ 2 jump │ 1 jump │ 0 jump │
├────────────────────────────────────────┤
│ Angle      │ [👤]   │ [👤]   │ (empty)│
│            │ 0 jump │ 3 jump │        │
├────────────────────────────────────────┤
│ Freefly    │ [👤]   │ [👤]   │ [👤]   │
│            │ 1 jump │ 2 jump │ 1 jump │
├────────────────────────────────────────┤
│ Swoop      │ (empty)│ [👤]   │ [👤]   │
│            │        │ 0 jump │ 0 jump │
└────────────────────────────────────────┘
[Coach avatar = clickable; shows coach name, availability]
[Checkbox: I'll be there Today!] → [✓ Confirmed]
```

**Screen T2: My Coaching Sessions**
```
[Date Range Selector]
┌───────────────────────────────┐
│ UPCOMING COACHING             │
├───────────────────────────────┤
│ Today 10:30 - Belly (Beg)     │
│ Coach: Andreas [1]            │
│ Jump Count: 2 / 5             │
│ [Join] [Message]              │
├───────────────────────────────┤
│ Sat 1/11 14:00 - Angle (Int)  │
│ Coach: Sarah [2]              │
│ Jump Count: 1 / 5             │
│ [Join] [Message]              │
└───────────────────────────────┘
```

**Screen T3: Discipline Progress**
```
[All Disciplines Checkboxes]
┌───────────────────────────────┐
│ DISCIPLINE │ LEVEL  │ PROGRESS│
├───────────────────────────────┤
│ ☑ Belly    │ ■■■□□  │ Intermediate
│ ☑ Angle    │ ■■□□□  │ Intermediate
│ ☑ Freefly  │ ■■■□□  │ Intermediate
│ ☑ Swoop    │ ■□□□□  │ Beginner
│ ☑ Wingsuit │ ■□□□□  │ Beginner
│ ☐ CRW      │ ────   │ Not started
└───────────────────────────────┘
[Estimated progression based on jump count]
```

---

#### LOGBOOK TAB SCREENS

**Screen L1: Logbook Home**
```
[+ Add Jump] [⚙ Export]
┌───────────────────────────────┐
│ STATISTICS                    │
│ Total Jumps: 125              │
│ Total Freefall: 42 hours 15m  │
│ Total Canopy: 8 hours 32m     │
│ Avg Altitude: 13,850 ft       │
│ Avg Formation Jumps: 78%      │
└───────────────────────────────┘
┌───────────────────────────────┐
│ JUMP HISTORY                  │
├───────────────────────────────┤
│ #125 | Jan 9 | FS | 4:32     │
│ #124 | Jan 8 | WS | 3:14     │
│ #123 | Jan 6 | FS | 4:18     │
│ #122 | Jan 5 | Angle | 3:45  │
└───────────────────────────────┘
[Swipe for more | Tap to expand]
```

**Screen L2: Jump Detail**
```
[Back to Logbook]
╔═══════════════════════════════╗
║ JUMP #125                     ║
║ Date: Jan 9, 2026            ║
║ Dropzone: Skydive Dubai       ║
║ Aircraft: King Air            ║
╚═══════════════════════════════╝
┌───────────────────────────────┐
│ Formation: FS (4-way)         │
│ Slot: BM5-1                   │
│ Exit Alt: 13,500 ft           │
│ Freefall Time: 4:32           │
│ Canopy Time: 2:15             │
│ Landing: Main (on target)     │
│ Packing: [Name] on [Date]     │
│ Coach: Andreas M.             │
│ Notes: "Great exit, smooth    │
│        formation work"        │
│ [Photos] [Edit] [Share]       │
└───────────────────────────────┘
```

**Screen L3: Export / Analytics**
```
[Date Range: Last 30 days ▼]
[Format: PDF | CSV | Email ▼]
┌───────────────────────────────┐
│ GRAPHS / CHARTS               │
│ • Jumps per Month             │
│ • Formation Distribution       │
│ • Freefall Time Trend         │
│ • Altitude Distribution       │
│ • AFF Progression             │
│ [Generate Report]             │
└───────────────────────────────┘
```

---

#### PROFILE TAB SCREENS

**Screen P1: Profile Card**
```
[Avatar: Large circular image]
[Name: Ali Mansour]
[Bio: "Angle and freefly lover"]
[⚡ 900 Jumps | 80 Tunnel Hours | Member Since Sep 2025]

┌───────────────────────────────┐
│ DISCIPLINE BADGES             │
│ Belly [■■□□□] Intermediate    │
│ Angle [■■■□□] Advanced        │
│ Freefly [■■■□□] Advanced      │
│ Swoop [■□□□□] Beginner        │
└───────────────────────────────┘

┌───────────────────────────────┐
│ Home DZ: 🇦🇪 Skydive Dubai    │
│ [Followers: 234] [Following: 89]
│ [Instagram] [Facebook] [YouTube]
│ [Edit Profile]                │
└───────────────────────────────┘
```

**Screen P2: Edit Profile**
```
[Tabs: Profile | Skills]
┌───────────────────────────────┐
│ Name: [Ali Mansour]           │
│ Jumping Since: [09/2025]      │
│ Jump Count: [900] (auto)      │
│ Tunnel Hours: [80]            │
│ Home Dropzone: [Dubai ▼]      │
│ Bio: [textarea 255 chars]     │
│ [+ Social Media Links]        │
│   Instagram: [URL input]      │
│   Facebook: [URL input]       │
│   YouTube: [URL input]        │
│ [Save] [Cancel]               │
└───────────────────────────────┘
```

**Screen P3: Skills Tab (within Edit)**
```
[Tabs: Profile | Skills]
┌───────────────────────────────┐
│ ☑ Belly   [Beg|Int|Adv|Ninja] │
│ ☑ Angle   [Beg|Int|Adv|Ninja] │
│ ☑ Freefly [Beg|Int|Adv|Ninja] │
│ ☑ Swoop   [Beg|Int|Adv|Ninja] │
│ ☑ Wingsuit [Beg|Int|Adv|Ninja]│
│ ☐ CRW                         │
│ ☐ XRW                         │
│ [Save] [Cancel]               │
└───────────────────────────────┘
```

**Screen P4: Waivers Management**
```
[+ Sign New Waiver] [Sort: Facility ▼]
┌───────────────────────────────┐
│ SIGNED WAIVERS                │
├───────────────────────────────┤
│ Skydive Dubai Desert          │
│ Signed: Jan 1, 2026           │
│ Expires: Jan 1, 2027          │
│ Status: ✓ Valid               │
│ [View] [Renew]                │
├───────────────────────────────┤
│ Skydive Spain                 │
│ Signed: Oct 15, 2025          │
│ Expires: Oct 15, 2026         │
│ Status: ✓ Valid               │
│ [View] [Renew]                │
└───────────────────────────────┘
```

**Screen P5: Settings**
```
┌─────────────────────────────────────┐
│ APP SETTINGS                        │
│ Notifications: [Toggle ON]          │
│ Theme: [Light | Dark ▼]             │
│ Units: [Metric ▼]                   │
│ Clear Cache: [Button]               │
├─────────────────────────────────────┤
│ ACCOUNT SETTINGS                    │
│ Connected: Google OAuth             │
│ Privacy: [Public | Friends | Private│
│ Blocked Users: [Manage]             │
├─────────────────────────────────────┤
│ PREFERENCES                         │
│ Weather Limits: [Configure]         │
│ Reminder Notifications: [ON]        │
├─────────────────────────────────────┤
│ ABOUT                               │
│ Version: 1.0.0                      │
│ [Terms] [Privacy] [Support]         │
│ [Delete Account]                    │
└─────────────────────────────────────┘
```

---

### 4.3 Navigation Design

#### Tab Navigation (Always Visible)
```
Bottom Tab Bar (5 fixed icons + labels):
[🏠 Home] [📋 Manifest] [🎓 Training] [📊 Logbook] [👤 Profile]
```

#### Contextual Navigation
- **Facility Selector** (top of Home, Manifest, Training): Dropdown to switch DZ context instantly
- **Back Button** (top-left): Native iOS/Android back semantics
- **Breadcrumbs** (implied): Home → Load Board → Load Detail
- **Modals & Sheets:**
  - QR Scanner: Full-screen modal over camera
  - Waiver Signing: Full-screen modal with form
  - Emergency SOS: Alert dialog with buttons
  - Load Confirmation: Sheet from bottom

#### Deep Linking (API-Driven Navigation)
- `skylara://home?facility=dubai` → Home tab, Dubai facility
- `skylara://load/SD5-7` → Load detail for SD 5 7
- `skylara://manifest/board` → Real-time manifest (staff only)
- `skylara://coaching/schedule?date=2026-01-09` → Coaching schedule for specific date

---

### 4.4 Role-Based Views

#### Athlete/Jumper View
- All 5 tabs fully functional
- Load board shows available loads
- Can book loads, join teams
- Coaching schedule visible, can sign up
- Logbook shows own jumps
- Profile fully editable

**Hidden/Disabled:**
- Real-time manifest board (M3)
- Admin settings
- Organizer management (unless delegated)

#### Coach View (extends Athlete)
- All tabs + coaching-specific features
- Load Builder: Create/manage teams
- Coaching Schedule: Marked with coaching slots
- Can see student logbooks (if permitted)
- Can message jumpers on teams
- "Manage Jumpers" quick action

**Additional:**
- Coaching dashboard (implied): Shows all students, progress, upcoming sessions

#### Manifest Staff View (extends Athlete + Coach)
- **Manifest Tab Expanded:**
  - Real-Time Manifest Board (M3)
  - Load management actions (launch, reassign, cancel)
  - Check-in scanning
  - Payment verification
- **Admin Quick Actions:**
  - Transaction History
  - DZ Emergency monitoring
- **Profile Settings:**
  - Staff-specific settings (implied)

#### DZ Owner / Admin View (extends all)
- All staff features
- Settings tab includes facility configuration
- Transaction history with reconciliation
- Waiver compliance dashboard (implied)
- User/role management (implied)

---

## PART 5: SKYLARA MANIFEST MOBILE STRUCTURE

### 5.1 Load Board Design

#### Data Model: Load Board Entry
```
{
  loadId: "SD5-7",
  aircraftId: "kinair-01",
  estimatedDeparture: "2026-01-09T11:09:00Z",
  estimatedLanding: "2026-01-09T12:15:00Z",
  capacity: 8,
  currentCount: 4,
  status: "OPEN" | "FILLING" | "LOCKED" | "BOARDING" | "AIRBORNE" | "LANDED" | "COMPLETE",
  formation: "FS",
  gateNumber: "5",
  slots: [
    { slotId: "FS-BM5-1", jumperId: "user-123", status: "CONFIRMED", formation: "FS" },
    { slotId: "FS-BM8-1", jumperId: "user-456", status: "PENDING", formation: "FS" },
    // ... more slots
  ],
  assignments: [
    {
      jumperId: "user-123",
      name: "Ali",
      jumpCount: 500,
      paymentStatus: "FULL",
      role: "ATHLETE",
      slotAssignment: "FS-BM5-1"
    },
    // ... more jumpers
  ],
  warnings: [
    { type: "GATE_TIME", message: "Be at gate 5 mins before departure" },
    { type: "WEATHER", message: "Wind gusts to 12 knots, monitor conditions" }
  ]
}
```

#### Load Board Display (List View)
**Primary:** Chronological by estimated departure time
**Secondary Sort:** By facility, by formation type
**Filtering Options:**
- Formation: FS, Freefly, Wingsuit, Tandem, AFF, etc.
- Status: OPEN, FILLING, LOCKED, BOARDING
- My Loads only (jumper booked)
- Coach loads (coach-managed)

**Visual Indicators:**
- Load ID (e.g., "SD 5 7")
- Countdown: Minutes to departure (updating live)
- Capacity: "4 / 8 slots"
- Status badge: Color-coded (green=OPEN, yellow=FILLING, orange=LOCKED, red=BOARDING)
- Formation type: Label (FS, Freefly, etc.)

#### Load Detail Expansion
```
Tap load in board → Bottom sheet slides up
  ├─ Load header (ID, time, status)
  ├─ Jumpers list (names, jump counts, payment status)
  ├─ Slot assignments (if visible to user)
  ├─ Actions:
  │   ├─ For jumper: [Select Load] [Message]
  │   ├─ For staff: [Launch Load] [Reassign] [View Map]
  │   └─ For coach: [Manage Team] [Message Group]
  └─ [Close sheet]
```

---

### 5.2 Self-Manifest Flow (Jumper Perspective)

#### Step 1: Enter Facility, View Available Loads
```
Jumper opens app
  → Home Tab
  → [Facility Selector] = "Skydive Dubai Desert" (pre-selected)
  → View Load Board
  → Visible loads for today:
      • SD 5 7 (11:09) - 4/8 OPEN
      • SD 1 2 (11:26) - 6/8 FILLING
      • SD 5 2 (11:39) - 2/8 OPEN
      • SD 1 3 (11:56) - 8/8 LOCKED
```

#### Step 2: Select Load & Review Details
```
Jumper taps "SD 5 7"
  → Load Detail Sheet:
      - Load ID: SD 5 7
      - Time: Jan 9, 2026 @ 11:09 AM
      - Status: OPEN (4 / 8 slots available)
      - Formation: FS (Freefall Formation)
      - Gate: 5 (WARNING: Be at gate 5 mins before departure)
      - Current Jumpers:
          • Alice (500+) - Paid
          • Bob (12) - Pending
          • Carol (350) - Paid
          • Dave (80) - Paid
      - [Select Load] [Message] [Cancel]
```

#### Step 3: Confirm Booking & Payment Check
```
Jumper taps [Select Load]
  → System validates:
      ✓ Waiver signed for Dubai? Yes
      ✓ Balance available? 10 tickets (or sufficient credit)
      ✓ Booking limit reached? No
  → Confirmation dialog:
      "Book this load? You will use 1 jump ticket.
       Your balance: 10 → 9 tickets
       [Confirm] [Cancel]"
  → Jumper taps [Confirm]
```

#### Step 4: Booking Confirmation & Home Update
```
Booking processed
  → Jumper added to load (status: CONFIRMED)
  → Ticket count updated (10 → 9)
  → Transaction recorded
  → Home screen shows:
      "NEXT JUMP: SD 5 7 @ 11:09 (33 mins)"
      [Remind Me] [View Load]
  → Real-time manifest (staff view) updates live
  → Optional: Send notification to jumper, coaches on load
```

#### Step 5: Arrival at DZ & Check-In
```
Jumper arrives 30 minutes before departure
  → Open app
  → Manifest Tab → QR Check-In
  → Tap [QR Scanner]
  → Point phone camera at QR code (at gate or on manifest board)
  → System scans and verifies:
      ✓ QR valid
      ✓ Jumper on load SD 5 7
      ✓ Payment status: CONFIRMED
  → System updates: Jumper marked PRESENT
  → Manifest board shows jumper as "checked in"
  → Staff can proceed with final safety checks
```

#### Step 6: Load Departure & Post-Jump
```
Manifest staff launches load
  → Status: OPEN → BOARDING → AIRBORNE
  → Jump completed
  → Aircraft lands
  → Status: AIRBORNE → LANDED
  → System auto-populates jumper's logbook entry:
      - Jump #126
      - Date: Jan 9, 2026
      - Dropzone: Skydive Dubai
      - Aircraft: King Air
      - Formation: FS
      - Slot: FS-BM5-1
      - (Freefall time, canopy time auto-calculated from altimeter data, if integrated)
  → Jumper can view in Logbook tab
  → Status: LANDED → COMPLETE
  → Load manifest locked (no more edits)
```

---

### 5.3 Staff-Managed Manifest Flow

#### Step 1: Staff Access Real-Time Board
```
Manifest staff logs in with MANIFEST_STAFF role
  → Opens app
  → Manifest Tab
  → [Real-Time Manifest Board] (M3)
  → Views all loads for day:
      Load ID | MINS | Jumpers | Status
      ─────────────────────────────────
      SD 5 7  │ 0    │ 4 / 8   │ BOARDING
      SD 1 2  │ 26   │ 6 / 8   │ FILLING
      SD 5 2  │ 39   │ 2 / 8   │ OPEN
      SD 1 3  │ 56   │ 8 / 8   │ LOCKED
```

#### Step 2: Verify Waivers & Payment Status
```
Staff reviews before boarding:
  → Taps "SD 5 7" to expand jumper list
  → For each jumper, sees:
      • Name, Jump Count
      • Payment Status badge (FULL, PENDING, UNPAID)
      • Waiver status (✓ signed or ✗ unsigned)
      • Slot assignment (FS-BM5-1, FS-BM8-1, etc.)
      • Role (red text = INSTRUCTOR, black = ATHLETE)
  → If waiver missing:
      - Tap jumper's name
      - Navigate to waiver signing (or prompt jumper to sign)
      - Confirm signature in system
  → If payment pending:
      - Contact jumper, collect payment
      - Update transaction history
      - Mark as FULL in system
```

#### Step 3: Manage Dynamic Changes
```
If jumper wants to switch loads:
  → Staff in manifest board
  → Long-press on jumper row
  → Options: [Reassign Slot] [Change Load] [Remove]
  → Select new load (if switching)
  → System validates:
      ✓ Target load has available slots
      ✓ Formation allows transfer
      ✓ No duplicate assignment
  → Confirms: "Move Ali from SD 5 7 → SD 1 2?"
  → Updates display live
  → Notifies jumper of new assignment (implied)

If load cancels or combines:
  → Staff can manually close load or mark as combined
  → Affected jumpers notified
  → System manages transfers
```

#### Step 4: Load Launch & Status Transitions
```
Manifest staff at gate when load ready:
  → Manifest Board shows "SD 5 7 BOARDING"
  → Final headcount: 4 / 8 jumpers (or capacity reached)
  → Staff taps [Launch Load] or [Depart] action
  → System prompts: "Confirm departure for SD 5 7? Aircraft fully boarded?"
  → Staff taps [Confirm]
  → Load status transitions:
      BOARDING → AIRBORNE
      (Countdown timer stops)
      (Altimeter data begins streaming, if integrated)
```

#### Step 5: Track Airborne & Landing
```
Post-launch:
  → Manifest board shows load as "AIRBORNE"
  → System expects jumpers back in ~15-20 minutes
  → As jumpers land:
      - Ground crew confirms each jumper accounted for
      - Staff manually marks jumper as LANDED (or system auto-detects via altimeter)
      - System shows count: "2 / 4 LANDED"
  → When all jumpers accounted for:
      - Manifest staff taps [Complete Load]
      - Load status: LANDED → COMPLETE
      - Manifest locked (no more changes)
      - Logbook entries finalized for all jumpers
```

---

### 5.4 Load Lifecycle Screens

#### Load State Diagram
```
OPEN
├─ Description: Load accepting bookings
├─ Visibility: Shown to all jumpers
├─ Actions: Book, view, message
├─ Duration: Until cutoff time (typically 30-45 mins before departure)
↓
FILLING
├─ Description: Load has confirmed bookings, slots still available
├─ Visibility: Shown to all jumpers
├─ Actions: Book remaining slots, message
↓
LOCKED
├─ Description: Load full or cutoff time reached, no more bookings
├─ Visibility: Shown but not bookable
├─ Actions: View, join waitlist (implied), message
├─ Staff Actions: Reassign, split load, combine loads
↓
BOARDING
├─ Description: Final safety checks, jumpers at gate, door closing soon
├─ Visibility: Limited (jumpers on load only)
├─ Actions: Final confirmations, emergency contacts
├─ Staff Actions: Final headcount, verify waivers, QR scans
↓
AIRBORNE
├─ Description: Aircraft in flight, jump run in progress
├─ Visibility: Staff/dispatch only
├─ Actions: Monitor, track on map (implied)
├─ System Actions: Stream altimeter data
↓
LANDED
├─ Description: All jumpers on ground, accounted for
├─ Visibility: Staff/dispatch
├─ Actions: Verify all safe, debrief
├─ Duration: ~5-10 minutes
↓
COMPLETE
├─ Description: Load finalized, manifest locked
├─ Visibility: Historical (logbook view)
├─ Actions: View, export, archive
├─ Data: Immutable
```

#### Screen L-State: Historical Load View
```
After load COMPLETE:
  → Accessible from Logbook → Jump Detail
  → Shows:
      Load: SD 5 7
      Date: Jan 9, 2026
      Time: 11:09 - 11:45
      Duration: 36 minutes (flight to ground)
      Jumpers: [List]
      Freefall Time: 4:32
      Formation: FS
      Video/Photos: [Gallery links]
      Coach Notes: [Field]
      Safety Incidents: [None/List if any]
      [Print Manifest] [Share] [Export]
```

---

### 5.5 CG & Safety Checks (Integrated Screens)

#### Screen S1: Pre-Jump Safety Checklist (Implied)
**Note:** Not explicitly shown in competitor apps, but operationally critical

```
[Manifest Tab → Staff view]
[Load: SD 5 7, Status: BOARDING]

BEFORE TAKEOFF CHECKLIST
├─ ☐ All jumpers accounted for (headcount)
├─ ☐ All waivers signed and verified
├─ ☐ All payment statuses confirmed
├─ ☐ All emergency contacts updated
├─ ☐ Weather conditions reviewed
├─ ☐ No medical alerts or restrictions
├─ ☐ Aircraft pre-flight completed
├─ ☐ Altimeter and reserve checks done
├─ ☐ AAD services current
├─ ☐ All jumpers briefed on jump run
├─ ☐ Formation plan confirmed
└─ ☐ Gate safety brief completed

[All items checked] → [Ready to Launch]
[Any item unchecked] → Cannot transition to AIRBORNE
```

#### Screen S2: CG (Canopy Group) Assignment (Implied)
**Note:** Not shown in competitors, but critical for operations

```
[Staff view, before load launch]
[Load: SD 5 7, Formation: FS]

CANOPY GROUP ASSIGNMENTS
├─ CG1: Alice (500+ jumps, Main Sabre 107)
│       Bob (12 jumps, Main Storm 120)
│       Carol (350 jumps, Main Sabre 110)
├─ CG2: Dave (80 jumps, Main Sabre 120)
│       TI (5000+ jumps, Main Sabre 135)
└─ Recovery Team: Ground crew vehicle assigned

[Assignments confirmed] [Adjust] [Launch]
```

#### Screen S3: Emergency Response (Burble-Style)
```
[Home Tab → Quick Action: "Emergency SOS"]

EMERGENCY ALERT
├─ My Status:
│   ○ I'm hurt. Please send help
│   ○ I'm ok. Walking back
│   ○ I'm ok. Need a ride back
│   ○ Call 911
│   ○ Call DZ Number
├─ Location Sharing:
│   [Allow Location Access] → Sends GPS + altitude
├─ Disclaimer:
│   "This app is not a guarantee of assistance.
│    Always use official DZ communication."
└─ [Confirm] [Cancel]

→ Alert sent to DZ staff + emergency contacts
→ Location pinned on staff dispatch map
→ DZ staff respond with vehicle/personnel
```

#### Screen S4: Incident Reporting (Post-Jump)
**Note:** Not shown in competitors, but part of SkyLara safety module

```
[Logbook Tab → Jump Detail → Add Incident (if applicable)]

INCIDENT REPORT
├─ Incident Type: [Dropdown]
│   ├─ Canopy Malfunction
│   ├─ Landing Hard
│   ├─ Injured
│   ├─ Entanglement
│   ├─ Collision
│   └─ Other
├─ Severity: [Radio buttons]
│   ○ Minor (self-reported, no medical)
│   ○ Moderate (injury, medical assessment)
│   ○ Severe (hospitalization required)
├─ Description: [Text area]
├─ Witnesses: [Searchable dropdown of jumpers on load]
├─ Medical Report: [Link to incident file if created]
├─ Safety Officer: [Auto-populated if staff]
└─ [Submit] [Cancel]

→ Incident logged in safety database
→ Safety officer notified
→ Pattern analysis (if recurring)
→ Reported to USPA (if required by severity)
```


---

## PART 6: DATABASE ENTITIES NEEDED

### 6.1 New Entities Discovered from Competitors

#### From FunJumpr Audit

**Entity: CoachingScheduleSession**
```
Fields:
  - id (UUID, PK)
  - facilityId (FK to Facility)
  - coachId (FK to User, role: COACH)
  - discipline (ENUM: Belly, Angle, Freefly, Swoop, Wingsuit, CRW, XRW)
  - skillLevel (ENUM: Beginner, Intermediate, Advanced, Ninja)
  - scheduledDate (DATE)
  - startTime (TIME)
  - endTime (TIME)
  - maxJumpers (INT)
  - currentJumpers (INT)
  - status (ENUM: OPEN, FILLING, FULL, CANCELLED)
  - createdAt (TIMESTAMP)
  - updatedAt (TIMESTAMP)

Relationships:
  - One Coach → Many Sessions
  - One Facility → Many Sessions
  - Many Sessions → Many Jumpers (through SignUp entity)

New: CoachingSignUp
  Fields:
    - id (UUID, PK)
    - sessionId (FK)
    - jumperId (FK to User)
    - signupDate (TIMESTAMP)
    - attended (BOOLEAN, default null, set after session)
    - notes (TEXT)
```

**Entity: UserDiscipline (Enhanced from existing)**
```
Original implied: discipline + skill level per user
New explicit entity:
  Fields:
    - id (UUID, PK)
    - userId (FK)
    - discipline (ENUM: 23 types from FunJumpr list)
    - skillLevel (ENUM: Beginner, Intermediate, Advanced, Ninja)
    - profiencyPercentage (INT, 0-100, derived from ring gauge)
    - lastUpdated (TIMESTAMP)
    - verifiedBy (FK to User, COACH or AFFI, nullable)

Index: (userId, discipline) UNIQUE
```

**Entity: UserFormationPreference**
```
Fields:
  - id (UUID, PK)
  - userId (FK)
  - formationType (FK to FormationType)
  - proficiency (INT, 1-5 scale)
  - yearsExperience (INT)
  - savedDate (TIMESTAMP)

Purpose: Tracks which formation types user practices (for filtering loads/coaching)
Relationships: User → Many FormationPreferences
```

#### From Burble Audit

**Entity: Waiver** (Enhanced from implied)
```
Fields:
  - id (UUID, PK)
  - userId (FK)
  - facilityId (FK)
  - waiverTemplateId (FK to WaiverTemplate)
  - signedDate (TIMESTAMP, when jumper signed)
  - expirationDate (DATE, typically 12 months from signed)
  - digitalSignature (BLOB or URL to SmartWaiver archive)
  - smartWaiverDocumentId (STRING, external reference)
  - status (ENUM: SIGNED, EXPIRED, REVOKED)
  - personalInfo (JSON):
      {
        firstName: STRING,
        middleName: STRING,
        lastName: STRING,
        city: STRING,
        state: STRING,
        zipCode: STRING,
        email: STRING,
        emergencyContactName: STRING,
        emergencyContactPhone: STRING,
        emergencyContactRelationship: STRING
      }
  - termsAccepted (BOOLEAN, timestamp recorded)
  - signatureTimestamp (TIMESTAMP)

Relationships:
  - User → Many Waivers (one per facility)
  - Facility → Many Waivers
  - WaiverTemplate → Many Waivers
```

**Entity: WaiverTemplate**
```
Fields:
  - id (UUID, PK)
  - facilityId (FK)
  - version (INT, for template versioning)
  - content (TEXT/MARKDOWN, waiver template text)
  - sections (JSON array of waiver sections)
  - requiredFields (JSON array of field names required)
  - effectiveDate (DATE)
  - expirationDate (DATE, nullable)
  - createdBy (FK to User, role: DZ_OWNER or PLATFORM_ADMIN)
  - lastUpdatedBy (FK)
  - updatedAt (TIMESTAMP)

Purpose: Store facility-specific legal waiver templates; allows multi-jurisdiction compliance
Relationships: Facility → Many WaiverTemplates (versioned)
```

**Entity: OrganizerApproval** (Burble's "Manage Organizers")
```
Fields:
  - id (UUID, PK)
  - jumperId (FK to User, athlete being managed)
  - organizerId (FK to User, coach/organizer managing)
  - approvalMode (ENUM: NONE, SPECIFIC_ONLY, ANYONE)
  - rating (FLOAT, 0-5, organizer's rating)
  - approvedDate (TIMESTAMP)
  - revokedDate (TIMESTAMP, nullable)
  - canBookLoads (BOOLEAN)
  - canModifyProfile (BOOLEAN)
  - canViewLogbook (BOOLEAN)
  - notes (TEXT)

Purpose: Control delegation; who can assign jumper to loads, teams, coaching
Relationships: Jumper → Many OrganizerApprovals (one per organizer)
```

**Entity: TransactionHistory** (Implied by Burble)
```
Fields:
  - id (UUID, PK)
  - userId (FK)
  - facilityId (FK)
  - transactionType (ENUM: JUMP_BOOKING, PAYMENT, REFUND, TICKET_PURCHASE, TICKET_REDEMPTION, COACHING_FEE, RENTAL_CHARGE, DISCOUNT, OTHER)
  - description (STRING, human-readable)
  - amount (DECIMAL 10,2)
  - currency (ENUM: AED, USD, EUR, GBP, CAD, etc.)
  - balanceBefore (DECIMAL)
  - balanceAfter (DECIMAL)
  - ticketsBefore (INT)
  - ticketsAfter (INT)
  - paymentMethod (ENUM: CREDIT_CARD, CASH, WIRE_TRANSFER, PAYPAL, STRIPE, BLOCK_TICKET)
  - relatedLoadId (FK to Load, nullable)
  - relatedBookingId (FK to Booking, nullable)
  - timestamp (TIMESTAMP)
  - processedBy (FK to User, staff who processed, nullable)
  - status (ENUM: PENDING, COMPLETED, FAILED, REFUNDED)
  - notes (TEXT)

Relationships: User → Many Transactions; Load → Many Transactions (refunds, fees)
Index: (userId, timestamp) for fast history retrieval
```

**Entity: EmergencyAlert** (Burble's SOS feature)
```
Fields:
  - id (UUID, PK)
  - jumperId (FK to User)
  - facilityId (FK)
  - alertType (ENUM: INJURED_HELP, OK_WALKING, OK_RIDE_NEEDED, CALL_911, CALL_DZ)
  - location (POINT, lat/lng from GPS)
  - altitude (FLOAT, meters)
  - timestamp (TIMESTAMP)
  - latitude (FLOAT)
  - longitude (FLOAT)
  - accuracy (FLOAT, meters, GPS accuracy)
  - deviceId (STRING)
  - notificationsSent (JSON array of staff user IDs notified)
  - responseStatus (ENUM: NOT_RESPONDED, IN_PROGRESS, RESOLVED)
  - resolvedAt (TIMESTAMP, nullable)
  - resolvedBy (FK to User, staff)
  - notes (TEXT)

Purpose: Track SOS alerts for safety accountability and incident response
Relationships: User → Many Alerts; Facility → Many Alerts
Index: (facilityId, timestamp DESC) for live dispatch display
```

### 6.2 Entity Modifications Recommended

#### Existing SkyLara Entities: Changes Based on Competitor Audit

**User (Extended Properties)**
```
New fields to add:
  - homeDropzoneId (FK to Facility, replaces implied home DZ)
  - preferredUnits (JSON):
      {
        speed: "mph" | "kt" | "km/h",
        distance: "mi" | "km",
        altitude: "ft" | "m",
        temperature: "F" | "C",
        fallRate: "mph" | "km/h" | "m/s"
      }
  - theme (ENUM: LIGHT, DARK, AUTO)
  - weatherLimits (JSON):
      {
        maxWindSpeed: INT,
        minCloudCeiling: INT,
        minVisibility: INT,
        temperatureRange: [MIN, MAX]
      }
  - isVerifiedAthllete (BOOLEAN, verified via USPA Merit or other)
  - numberOfTunnelHumps (INT, for tunnel hours)
  - disciplinesAndLevels (JSONB array, replaces separate user disciplines table):
      [
        { discipline: "Belly", level: "Intermediate", verifiedBy: "COACH_ID" },
        { discipline: "Angle", level: "Advanced" },
        ...
      ]

Rationale: Consolidate user preferences, avoid multiple preference tables
```

**Load (Status Enhancement)**
```
New fields:
  - estimatedFreefall Time (INT, minutes)
  - estimatedCanopyTime (INT, minutes)
  - formationDetails (JSON):
      {
        type: "FS",
        subtype: "4WAY" | "8WAY" | "16WAY" | null,
        cgCount: INT,
        slotDefinitions: [
          { slotId: "BM5-1", formationPosition: "Flyer", cgGroup: 1 },
          ...
        ]
      }
  - weatherConditionsAtDeparture (JSON):
      {
        windSpeed: FLOAT,
        windDirection: STRING,
        temperature: INT,
        cloudCeiling: INT,
        precipitation: BOOLEAN
      }
  - pilotId (FK to User, role: PILOT, required)
  - jumpMasterIds (FK array to User, multiple jump masters)
  - cgLeaderIds (FK array to User, CG leaders)

Rationale: Richer formation data, weather logging, CG tracking
```

**Booking (Enhancement)**
```
New fields:
  - organizerId (FK to User, coach/organizer who booked, if not self)
  - teamId (FK to Team, if booked as part of team, else null)
  - slotAssignmentId (FK to LoadSlot, specific slot in load)
  - qrCodeToken (STRING, unique token for QR check-in)
  - checkedInAt (TIMESTAMP, null until checked in)
  - checkedInVia (ENUM: MANUAL, QR_SCAN, STAFF_MARKED)
  - landingStatus (ENUM: ON_TARGET, OFF_ZONE, INJURED, PENDING, null)
  - landedAt (TIMESTAMP, when jumper confirmed on ground, null if still airborne)

Rationale: Delegation tracking, QR integration, real-time manifest updates
```

### 6.3 Complete Entity Relationship Notes

#### New Multi-Facility Capability
```
**Current (Implied SkyLara):** Single facility per user account
**Competitors:** Multi-facility in single account
**Recommendation for SkyLara Mobile:**

Add:
  - CurrentFacilityContext (Session-level, not persisted, user's active facility)
  - User.facilitiesApproved (JSONB array of facility IDs user has waivers/access)
  - AllowMultiFacility (Configuration flag, per DZ)

Query Pattern:
  SELECT * FROM loads
  WHERE facility_id = current_facility
  AND status IN ('OPEN', 'FILLING', 'LOCKED')
  AND estimated_departure > NOW()
```

#### Coaching Workflow Integration
```
CoachingScheduleSession
  ├─ PK: id
  ├─ FK: facilityId
  ├─ FK: coachId (User with COACH role)
  ├─ discipline (ENUM from UserDiscipline)
  ├─ skillLevel (ENUM from UserDiscipline)
  ├─ scheduledDate, startTime, endTime
  └─ status (OPEN, FULL, CANCELLED)

CoachingSignUp
  ├─ PK: id
  ├─ FK: sessionId
  ├─ FK: jumperId (User with ATHLETE role)
  ├─ attended (NULL, TRUE, FALSE)
  └─ notes

Load
  ├─ Can contain 0-many CoachingSignUp jumpers (if coaching load)
  ├─ Formation may be "COACHING" instead of FS/FF/etc.
  └─ May link to CoachingScheduleSession

Query for "Coaching Schedule Matrix":
  SELECT
    discipline,
    skill_level,
    coach_id,
    COUNT(signup.id) as jumper_count
  FROM coaching_schedule_session
  LEFT JOIN coaching_signup ON coaching_schedule_session.id = signup.session_id
  WHERE facility_id = ?
  AND scheduled_date = ?
  GROUP BY discipline, skill_level, coach_id
```

#### Emergency & Safety Workflows
```
EmergencyAlert (SOS)
  ├─ PK: id
  ├─ FK: jumperId, facilityId
  ├─ alertType (injury, ok_walking, call_911, etc.)
  ├─ location (GPS lat/lng)
  └─ responseStatus

Incident (SkyLara safety module)
  ├─ PK: id
  ├─ FK: jumperId, facilityId
  ├─ FK: loadId (if during/after jump)
  ├─ incidentType (canopy_malfunction, hard_landing, collision, etc.)
  ├─ severity (minor, moderate, severe)
  ├─ description, witnesses, medical report

Relationship:
  EmergencyAlert → Can trigger → Incident creation
  Load (after COMPLETE) → Can have linked → Incident
```

#### Payment & Transaction Workflow
```
TransactionHistory
  ├─ FK: userId, facilityId
  ├─ transactionType (JUMP_BOOKING, PAYMENT, REFUND, TICKET_PURCHASE, etc.)
  ├─ relatedLoadId (if jump-related)
  ├─ relatedBookingId (if booking-related)
  ├─ amount, currency, balanceBefore, balanceAfter
  └─ status (PENDING, COMPLETED, FAILED, REFUNDED)

Booking
  ├─ Contains price/cost reference
  ├─ FK: transactionHistoryId (payment confirmation)
  └─ If cancelled → Creates REFUND TransactionHistory entry

User.balance (Aggregate)
  = SUM(TransactionHistory.amount) for user where status != FAILED
```

#### Waiver & Compliance Workflow
```
WaiverTemplate
  ├─ PK: id
  ├─ FK: facilityId
  ├─ version, content, requiredFields
  └─ effectiveDate, expirationDate

Waiver
  ├─ PK: id
  ├─ FK: userId, facilityId, waiverTemplateId
  ├─ signedDate, expirationDate
  ├─ smartWaiverDocumentId (external archive reference)
  └─ status (SIGNED, EXPIRED, REVOKED)

User.canJumpAtFacility(facilityId)
  = EXISTS (
      SELECT 1 FROM Waiver
      WHERE user_id = user.id
      AND facility_id = facilityId
      AND status = 'SIGNED'
      AND expiration_date > TODAY()
    )

Booking.validate()
  ├─ Check: User.canJumpAtFacility(load.facility_id)?
  ├─ Check: No active REVOKED waivers?
  └─ If either fails: Redirect to waiver signing
```

---

## PART 7: API ENDPOINTS LIKELY NEEDED

### 7.1 New Endpoints Discovered from Competitors

#### Coaching Schedule Endpoints (FunJumpr)
```
GET /facilities/{facilityId}/coaching/schedule
  Query params: date, discipline, skillLevel
  Response: [CoachingScheduleSession array]
  {
    id, coachId, coachName, coachAvatar,
    discipline, skillLevel,
    startTime, endTime,
    currentJumpers, maxJumpers,
    status
  }

POST /coaching-schedules/{sessionId}/signups
  Body: { jumperId }
  Response: { signupId, jumperId, sessionId, signupDate }
  Action: Add jumper to coaching session

DELETE /coaching-schedules/{sessionId}/signups/{signupId}
  Action: Remove jumper from coaching session
  Response: { success, message }

GET /users/{userId}/coaching/sessions
  Query params: facilityId, dateRange
  Response: [Coaching sessions jumper is signed up for]

POST /users/{userId}/coaching/feedback
  Body: { sessionId, rating, notes, attended }
  Action: Coach logs post-session feedback
  Response: { feedbackId, recorded }
```

#### Real-Time Manifest Endpoints (FunJumpr/Burble implied)
```
GET /facilities/{facilityId}/manifest/board
  Query params: date, status (OPEN|FILLING|LOCKED|BOARDING|AIRBORNE|LANDED)
  Response: [Load array with full jumper assignments]
  {
    loadId, aircraftId, estimatedDeparture, capacity,
    currentCount, status, gateNumber,
    jumpers: [
      { jumperId, name, jumpCount, paymentStatus, slotAssignment, role }
    ],
    warnings: [{ type, message }]
  }
  Real-time: WebSocket subscription recommended

GET /loads/{loadId}/jumpers
  Response: [Jumper details for specific load]

PATCH /loads/{loadId}/jumpers/{jumperId}
  Body: { slotAssignment, status (CONFIRMED|PENDING|REMOVED) }
  Action: Reassign jumper within load
  Response: Updated load with new assignment

POST /loads/{loadId}/launch
  Body: { jumpMasterId, pilotId, cgLeaderIds, finalHeadcount }
  Action: Transition load from BOARDING to AIRBORNE
  Response: { loadId, status: AIRBORNE, departureTime }
```

#### Waiver & Compliance Endpoints (Burble)
```
GET /users/{userId}/waivers
  Query params: facilityId (optional)
  Response: [Waiver array, one per facility]
  {
    id, facilityId, facilityName,
    signedDate, expirationDate, status,
    smartWaiverDocumentId (for archival)
  }

POST /users/{userId}/waivers/sign
  Body: {
    facilityId,
    waiverTemplateId,
    personalInfo: { firstName, lastName, ... },
    signature (base64 or URL),
    agreedToTerms: true
  }
  Action: Digital signature capture via SmartWaiver integration
  Response: { waiverId, signedDate, expirationDate, smartWaiverRef }

GET /facilities/{facilityId}/waiver-template
  Response: { id, version, content, requiredFields }

DELETE /users/{userId}/waivers/{waiverId}
  Action: Revoke waiver (sets status: REVOKED)
  Response: { success, message }
```

#### Emergency & Safety Endpoints (Burble)
```
POST /emergency-alerts
  Body: {
    jumperId, facilityId,
    alertType (INJURED_HELP|OK_WALKING|OK_RIDE|CALL_911|CALL_DZ),
    location: { latitude, longitude, accuracy },
    altitude, deviceId
  }
  Action: Send SOS alert to facility staff
  Response: { alertId, timestamp, staffNotified }
  Broadcast: WebSocket to facility dispatch

GET /facilities/{facilityId}/emergency-alerts/active
  Role: Restricted to staff
  Response: [AlertArray] with real-time updates
  WebSocket subscription recommended

PATCH /emergency-alerts/{alertId}
  Body: { responseStatus (NOT_RESPONDED|IN_PROGRESS|RESOLVED), notes, resolvedBy }
  Action: Staff confirms response
  Response: Updated alert

GET /facilities/{facilityId}/emergency-contacts
  Role: Restricted to DZ_OWNER, DZ_MANAGER
  Response: [User emergency contacts by jumper, facility registration]
```

#### Check-In & QR Code Endpoints (Burble)
```
POST /loads/{loadId}/check-in
  Body: { jumperId, checkInType (MANUAL|QR_SCAN), qrToken (optional) }
  Action: Mark jumper as physically present
  Response: { jumperId, checkedInAt, loadId }
  Effect: Updates real-time manifest board

GET /qr-codes/{qrToken}/validate
  Query params: loadId (optional)
  Response: { valid: boolean, loadId, jumperId }
  Action: Validate QR code at gate

POST /loads/{loadId}/qr-codes
  Body: { jumperId, slotAssignment }
  Action: Generate QR code for check-in at gate
  Response: { qrToken, qrUrl (image), expiresAt }
```

#### Transaction History & Balance Endpoints (Burble)
```
GET /users/{userId}/transactions
  Query params: facilityId, type (ALL|JUMPS|PAYMENTS|OTHER), dateRange, limit, offset
  Response: {
    transactions: [
      { id, type, description, amount, currency, timestamp, status, relatedLoadId }
    ],
    balance: { current: DECIMAL, available: DECIMAL },
    ticketCount: { total: INT, available: INT, used: INT }
  }

GET /users/{userId}/balance
  Response: { currency, currentBalance, ticketsAvailable, pendingTransactions }

POST /users/{userId}/transactions/export
  Query params: format (PDF|CSV), dateRange
  Response: File download (PDF or CSV) of transaction history

GET /facilities/{facilityId}/transactions
  Role: Restricted to DZ_MANAGER, DZ_OWNER, PLATFORM_ADMIN
  Query params: dateRange, type, jumperId (filter by user)
  Response: [Aggregated transactions for facility]
  Purpose: Facility accounting, revenue reconciliation
```

#### Organizer Management Endpoints (Burble)
```
GET /users/{userId}/organizers
  Response: [OrganizerApproval array]
  {
    organizerId, organizerName, organizerAvatar,
    rating, approvalMode, canBookLoads, canModifyProfile, canViewLogbook
  }

POST /users/{userId}/organizers/{organizerId}
  Body: {
    approvalMode (NONE|SPECIFIC_ONLY|ANYONE),
    canBookLoads, canModifyProfile, canViewLogbook
  }
  Action: Approve or update organizer permissions
  Response: Updated OrganizerApproval

DELETE /users/{userId}/organizers/{organizerId}
  Action: Revoke organizer permissions
  Response: { success }

GET /users/{userId}/organizers/requests
  Response: [Pending approval requests from coaches/organizers]
  Action: Athlete sees pending delegation requests
```

### 7.2 Endpoint Modifications

#### Enhanced GET /loads/{facilityId}
**Current (Implied SkyLara):** List loads by facility
**Enhanced with Competitors' Data:**
```
GET /facilities/{facilityId}/loads
  Query params:
    status (OPEN|FILLING|LOCKED|BOARDING|AIRBORNE|LANDED|COMPLETE),
    formation (FS|FREEFLY|WS|TANDEM|etc.),
    dateRange,
    includeFullLoads (boolean),
    myLoadsOnly (boolean, for authenticated user)
  Response:
    {
      loads: [
        {
          id, aircraftId, estimatedDeparture, capacity, currentCount, status,
          formation, gateNumber,
          jumpers: [
            { jumperId, name, jumpCount, paymentStatus, slotAssignment }
          ],
          weather: { windSpeed, direction, temperature, conditions },
          jumpRunMap: { coordinates, zones, prediction },
          warnings: [{ type, message }],
          slotAvailability: [{ slotId, available: bool }]
        }
      ],
      metadata: { total, filtered, nextPageToken }
    }
```

#### New Endpoint: Load State Machine Transitions
```
PATCH /loads/{loadId}/status
  Body: { newStatus, reason, actorId (staff/admin) }
  Validation:
    OPEN → FILLING: (currentCount > 0)
    FILLING → LOCKED: (currentCount >= minCapacity OR cutoffTimeReached)
    LOCKED → BOARDING: (staff action, ~30 mins before departure)
    BOARDING → AIRBORNE: (aircraft departed, final headcount confirmed)
    AIRBORNE → LANDED: (all jumpers on ground)
    LANDED → COMPLETE: (manifest locked, no edits allowed)
  Response: { loadId, previousStatus, newStatus, timestamp }
  Side Effects: Notifications, manifest board updates, logbook entries finalized
```

### 7.3 Real-Time / WebSocket Requirements

#### WebSocket Subscriptions (New)
```
SUBSCRIPTION: /ws/manifest/board/{facilityId}
  Broadcast to: MANIFEST_STAFF, DZ_OWNER, DZ_MANAGER
  Updates:
    - New jumper added to load
    - Jumper checked in
    - Jumper removed from load
    - Load status changed
    - Payment status updated
    - Slot assignments changed
  Message format:
    {
      type: "LOAD_UPDATE" | "JUMPER_ADDED" | "JUMPER_CHECKED_IN" | "STATUS_CHANGED",
      data: { loadId, jumperId, change },
      timestamp
    }

SUBSCRIPTION: /ws/emergency-alerts/{facilityId}
  Broadcast to: All staff at facility
  Updates:
    - New SOS alert
    - Alert status changed (responded, resolved)
  Message format:
    {
      type: "EMERGENCY_ALERT",
      alert: { id, jumperId, alertType, location, timestamp }
    }

SUBSCRIPTION: /ws/loads/{loadId}/real-time
  Broadcast to: All jumpers on load
  Updates:
    - Load status change
    - Countdown timer (broadcast periodically: every 5 mins or on request)
    - Gate change
    - Safety information
  Message format:
    {
      type: "COUNTDOWN" | "STATUS_CHANGE" | "GATE_UPDATE" | "SAFETY_NOTICE",
      data: { loadId, newStatus, countdownMins, gateNumber, message }
    }

SUBSCRIPTION: /ws/coaching/schedule/{facilityId}
  Broadcast to: All users at facility
  Updates:
    - New coaching session added
    - Coach availability changed
    - Session full or cancelled
  Message format:
    {
      type: "COACHING_ADDED" | "COACHING_CANCELLED" | "COACHING_FULL",
      session: { id, discipline, skillLevel, coachName, jumperCount }
    }
```

---

## PART 8: EDGE CASES AND OPERATIONAL RULES

### 8.1 Manifest Edge Cases

#### Case 1: Load Capacity Mismatch
**Scenario:** Load shows 4/8 slots, but 9 jumpers have booked.
**Cause:** Overbooking during concurrent bookings.
**Resolution:**
- System should lock load after reaching capacity (first-come, first-served)
- Pending (9th) jumper placed in queue or offered alternative load
- Notification: "Sorry, load full. Join waitlist or book another load."
- Fallback: If load count is confirmed at gate < capacity, staff can manually add 1-2 waitlist jumpers

#### Case 2: Jumper Cancels After BOARDING Status
**Scenario:** Jumper wants to cancel after boarding gates closed.
**Rule:**
- OPEN → FILLING → LOCKED: Full refund available
- LOCKED → BOARDING: 50% refund (short notice fee applies)
- BOARDING → AIRBORNE: 0% refund (safety/operational costs)
**Implementation:** Transaction creates REFUND entry with calculated amount
**Notification:** Jumper must be notified of refund amount before confirming cancellation

#### Case 3: Load Combines or Splits
**Scenario:** Low booking for SD 5 7 (2/8), so staff combines with SD 1 2 (6/8).
**Process:**
- Staff marks SD 5 7 as "COMBINED_INTO_SD1_2"
- All jumpers from SD 5 7 reassigned to SD 1 2
- Slot assignments may change (new aircraft, different capacity)
- Jumpers notified of new load ID and departure time
- Original load transitioned to CANCELLED (remains in history)
- Gate may change (SD 1 2 gate replaces SD 5 7 gate)

#### Case 4: Double Booking (Jumper on Two Loads Same Time)
**Scenario:** System bug or user error: Jumper booked on SD 5 7 (11:09) and SD 1 2 (11:26).
**Prevention:** Database constraint:
```
UNIQUE (user_id, facility_id, scheduled_date)
  WHERE status NOT IN (CANCELLED)
```
**If Occurs:** Booking API rejects second booking with "You're already booked for another load at this facility on this date."

#### Case 5: Weather Changes Load Time
**Scenario:** Wind increases; DZ decides to push SD 5 7 from 11:09 to 12:00.
**Process:**
- Staff notified of weather change
- Staff clicks "Reschedule Load" in manifest
- New time entered: 12:00
- All jumpers on load notified via notification/SMS
- Countdown timer resets
- Booking remains valid; payment unchanged
- History logged: "Load rescheduled from 11:09 to 12:00 due to weather"

### 8.2 Payment Edge Cases

#### Case 1: Insufficient Balance / Tickets
**Scenario:** Jumper tries to book load; has 0 tickets, no credit.
**Validation:**
```
IF user.availableTickets >= 1 OR user.accountBalance >= load.price THEN
  allow_booking()
ELSE
  deny_booking("Insufficient tickets/balance. Purchase packages at: [link]")
```

#### Case 2: Partial Payment / Pending Status
**Scenario:** Jumper books load; payment marked as PENDING.
**Rule:**
- Booking created with status: PENDING
- Jumper appears on manifest with status: "PENDING" (yellow badge)
- Staff can still hold slot for jumper; confirmed after payment
- If payment fails 1 hour before departure: Jumper auto-removed, slot released

#### Case 3: Refund to External Account vs. In-App Credit
**Scenario:** Jumper cancels; purchased load with credit card.
**Options:**
- Automatic: Refund to original payment method (Stripe refund)
- Manual: Staff issues in-app credit (faster, available immediately)
- Jumper choice: Offer both options during cancellation
**Tracking:** TransactionHistory records REFUND with method (CARD_REFUND vs. STORE_CREDIT)

#### Case 4: Multi-Facility Pricing Variance
**Scenario:** Tandem cost is €2,199 AED at Dubai, but $300 USD at Phoenix.
**Rule:**
- Load.price stored as (amount, currency)
- User.balance stored per currency (implied multi-currency account)
- Booking calculates conversion rate at booking time (live forex)
- Separate ledgers per currency per user
**Query:**
```
SELECT SUM(amount) WHERE currency = 'AED' for user's AED balance
SELECT SUM(amount) WHERE currency = 'USD' for user's USD balance
```

#### Case 5: Ticket Package with Expiration
**Scenario:** Jumper buys "10-jump package" for €1,000; valid 6 months.
**Rule:**
- Package creates 10 individual tickets with expiration_date = NOW() + 6 months
- Each booking uses 1 ticket
- Ticket is "spent" immediately; refund uses from unexpired tickets only
- 30-day reminder: "Your tickets expire in 30 days"
- Post-expiration: Tickets removed from inventory (sunk cost for jumper)

### 8.3 Safety Edge Cases

#### Case 1: Waiver Expired
**Scenario:** Jumper's waiver expired 1 month ago; tries to book load.
**Validation:**
```
IF waiver.expirationDate < TODAY() THEN
  deny_booking("Waiver expired. Sign new waiver: [link]")
```
**Action:** Redirect to "Sign Waiver" flow; jumper re-signs current template
**Historical:** Old waiver remains in archive (audit trail)

#### Case 2: SOS Alert Without Location
**Scenario:** Jumper hits "I'm hurt" button; location permission denied.
**Implementation:**
- Alert still sent to staff with last-known location
- Device ID recorded (can triangulate from cell tower if needed)
- Disclaimer on alert to staff: "Location permission denied; dispatch should call jumper"
- Staff has jumper's emergency contact phone number (from waiver)

#### Case 3: Incident Severity Escalation
**Scenario:** Jumper reports "Hard Landing" (moderate); reviewing, seems more serious.
**Process:**
- Staff reviews incident report (Incident module)
- Can re-classify: MODERATE → SEVERE
- Triggers actions:
  - Alert to medical/safety team
  - Report to USPA (if required)
  - Flag jumper's account for instructor follow-up
- Historical record maintained (immutable incident log)

#### Case 4: Underage Jumper Attempted Booking
**Scenario:** 17-year-old tries to book solo jump (requires 18+).
**Validation:**
```
IF jumper.age < 18 THEN
  deny_booking("Solo jumps require age 18+. Tandem available: [link]")
ELSE IF jumper.age < 18 AND load.formation != "TANDEM" THEN
  deny_booking()
```
**Legal:** Age validation required before waivers; parental consent form required if younger

#### Case 5: Medical Alert on Jumper Profile
**Scenario:** Coach notes jumper has "History of Seizures" in profile.
**System:** (Implied capability in training module)
- Doctor's clearance required (uploaded file)
- AAD/medical equipment requirements noted
- Coach briefed before each jump
- Emergency contacts have medical info
- SOS alert includes medical history for first responders

### 8.4 Weather / Operations Edge Cases

#### Case 1: Jump Run No-Go
**Scenario:** Wind exceeds user-configured weather limit.
**Rule:**
```
IF CURRENT_WIND > user.maxWindLimit THEN
  notification("Wind conditions exceed your limit. Consider deferring.")
  (don't automatically cancel, but warn)
```

#### Case 2: Low Cloud Ceiling Affects Jump Run
**Scenario:** Clouds at 5,000 ft; jump run overlay becomes invalid.
**Process:**
- Jump Run Map (Screen H4) shows warning: "Cloud ceiling lower than exit altitude"
- Recommended exit altitude adjusted: 10,000 ft → 8,000 ft
- Visual overlay on map adjusted
- Staff notified of operational constraint

#### Case 3: Rapid Weather Change Mid-Day
**Scenario:** Morning loads fine; by noon, thunderstorms approach.
**Action Plan:**
- DZ sends broadcast notification: "Thunderstorm alert; next aircraft delayed 2 hours"
- All loads scheduled after storm time receive: "Status: DELAYED, new departure 14:00"
- Jumpers notified
- Countdown timers pause and reset

#### Case 4: Altitude Density Affects Canopy Performance
**Scenario:** High-altitude DZ (Dropzone Peru: 11,000 ft elevation).
**Recommendation System:**
- Load booking shows note: "High density altitude; recommend canopy 120+ sq ft"
- Jumper canopy size validated against minimum recommendations
- Warning if undersized: "Your canopy is smaller than recommended at this altitude"
- Jumper must explicitly confirm acceptance

#### Case 5: Nighttime Jump Requires D License
**Scenario:** Load scheduled after sunset (18:30); requires D-licensed jumpers.
**Validation:**
```
IF load.scheduledTime AFTER_SUNSET
  AND jumper.uspaLicense != "D"
THEN
  deny_booking("Night jumps require USPA D license")
```
**USPA Merit Check:** System validates license tier via USPA integration (Burble feature)

---

## PART 9: PRIORITY RANKING

### 9.1 Critical (Must-Have for MVP)

**Manifest & Booking:**
1. ✓ Load board display (real-time list)
2. ✓ Self-service load booking
3. ✓ Load confirmation screen
4. ✓ Capacity tracking (slots available)
5. ✓ Countdown timer to departure

**Profile & Identity:**
6. ✓ User profile creation/editing
7. ✓ Discipline & skill level tracking
8. ✓ Home dropzone selection

**Payments:**
9. ✓ Balance display
10. ✓ Ticket inventory
11. ✓ Booking deduction

**Weather & Operations:**
12. ✓ Weather widget (wind, temp)
13. ✓ Jump run visualization
14. ✓ Basic load status transitions

**Authentication:**
15. ✓ Login/logout
16. ✓ Password reset (implied from SkyLara API)

### 9.2 High (Important for Launch)

**Manifest:**
1. **Real-Time Manifest Board** (Staff-only, critical for operations)
   - Live jumper list with payment status
   - Slot assignments
   - Load status management
   - Reassignment capability

2. **QR Code Check-In**
   - Scanner integration
   - Gate check-in automation
   - Reduces manual headcount errors

3. **Coaching Schedule Matrix** (FunJumpr's standout feature)
   - Discipline/skill level grid
   - Coach availability display
   - Jumper count per slot
   - One-tap sign-up

**Safety & Legal:**
4. **Digital Waiver Signing** (SmartWaiver integration)
   - Facility-specific templates
   - E-signature capture
   - Expiration tracking
   - Legal compliance

5. **Emergency SOS Button**
   - Quick-tap alert options
   - Location sharing
   - Staff dispatch integration

**Operations:**
6. **Transaction History** (Financial transparency)
   - Filter by transaction type
   - Balance tracking
   - Multi-currency support

**Communications:**
7. **Messaging/Chat** (Team coordination)
   - Direct messages
   - Group messaging (teams, coaches)
   - Load announcements

### 9.3 Medium (Post-Launch Enhancement)

1. **Organizer/Delegation Management**
   - Approve coaches to book jumpers
   - Restrict permissions (booking, profile, logbook)
   - Coach ratings/trust system

2. **USPA Merit Integration**
   - Link external USPA account
   - Auto-populate license/ratings
   - Validate night jump requirements

3. **Leaderboard / Rankings**
   - Discipline-based rankings
   - Jump count leaderboards
   - Community engagement

4. **Unit Configuration**
   - Global preference for speed, altitude, distance units
   - Applied to all displays

5. **Load Builder / Team Formation**
   - Create custom teams
   - Assign jumpers to formations
   - Reusable team templates

6. **"Who's Going" Social Feed**
   - Jumpers announce intent to visit DZ
   - Find friends, organize group jumps
   - Social engagement

7. **Incident Reporting**
   - Post-jump incident documentation
   - Severity classification
   - USPA reporting integration

### 9.4 Later (Nice-to-Have)

1. **Dark Mode / Theme Selection**
2. **Export Logbook** (PDF/CSV)
3. **Advanced Analytics** (progression visualizations, trend analysis)
4. **Media Integration** (photos/videos from jumps)
5. **Skill Verification** (coach-verified levels with badges)
6. **Canopy Landing Zone Visualization** (advanced mapping)
7. **Multi-Language Support**
8. **Accessibility Features** (WCAG 2.1 AA compliance)
9. **Offline Mode** (limited functionality)
10. **Apple Watch / Wearable Integration** (countdown, alerts)

---

## PART 10: SUGGESTED IMPLEMENTATION PHASES

### 10.1 Phase 1: Foundation (Weeks 1-4)

**Goal:** Core authentication, user identity, basic UI.

**Deliverables:**
- Authentication system (login, registration, OAuth setup)
- User profile creation and editing
- Basic profile view
- Navigation structure (5 bottom tabs)
- Facility selector (context switching)
- Settings screen (units, theme, preferences)

**API Endpoints:**
- POST /auth/login
- POST /auth/register
- POST /auth/refresh-token
- GET /users/{userId}/profile
- PATCH /users/{userId}/profile
- GET /facilities
- POST /users/{userId}/preferences

**Database Schema:**
- User (with new fields: homeDropzoneId, preferredUnits, theme)
- UserProfile (enhancements)
- UserPreferences
- Facility (basic)
- UserFacilityAccess

**Testing:**
- Authentication flow (login, logout, password reset)
- Profile CRUD operations
- Facility switching
- Settings persistence

**Risk:** OAuth provider setup (Google, Apple) may need extra approval time

---

### 10.2 Phase 2: Core Manifest (Weeks 5-8)

**Goal:** Load booking, real-time board, basic manifest.

**Deliverables:**
- Load board display (Home tab)
- Load detail view
- Self-service load booking
- Load confirmation
- Real-time manifest board (staff-only)
- Load status transitions (OPEN → LOCKED → BOARDING → AIRBORNE → LANDED)
- Countdown timer (real-time updates via WebSocket)

**API Endpoints:**
- GET /facilities/{facilityId}/loads
- GET /loads/{loadId}
- POST /bookings (create load booking)
- GET /bookings/{userId}
- DELETE /bookings/{bookingId} (cancel)
- GET /facilities/{facilityId}/manifest/board (staff)
- PATCH /loads/{loadId}/status
- WebSocket: /ws/manifest/board/{facilityId}

**Database Schema:**
- Load (enhancements: estimatedFreefall, formationDetails, weather)
- LoadSlot (if not existing)
- Booking (enhancements: organizerId, teamId, qrCodeToken, checkedInAt)
- LoadStatus (enum handling)

**Testing:**
- Booking flow (success, insufficient balance, sold out)
- Load status transitions
- Manifest board updates in real-time
- Slot availability validation

**Risk:** Real-time WebSocket handling; load balancing for concurrent bookings

---

### 10.3 Phase 3: Payments & Booking (Weeks 9-12)

**Goal:** Payment processing, transaction history, ticket management.

**Deliverables:**
- Balance display (Home screen)
- Ticket inventory tracking
- Transaction history page
- Payment method integration (Stripe, PayPal, etc.)
- Booking deduction logic
- Refund processing
- Multi-currency support

**API Endpoints:**
- GET /users/{userId}/balance
- GET /users/{userId}/transactions
- POST /payments (process payment for load booking)
- POST /refunds (process cancellation refund)
- GET /payment-methods
- POST /ticket-packages (purchase bundles)
- POST /users/{userId}/transactions/export

**Database Schema:**
- Transaction (new entity)
- Payment (if separate from Transaction)
- TicketPackage
- UserBalance (aggregate view)

**Testing:**
- Balance validation before booking
- Transaction recording (debit/credit)
- Refund calculation (full, partial)
- Edge cases (insufficient balance, expired tickets)

**Risk:** Payment gateway integration; PCI compliance; currency conversion rates

---

### 10.4 Phase 4: Training & Safety (Weeks 13-16)

**Goal:** Coaching scheduling, waivers, emergency features.

**Deliverables:**
- Coaching schedule matrix (discipline/skill level grid)
- Coaching sign-up flow
- My coaching sessions view
- Digital waiver signing (SmartWaiver integration)
- Waiver management (view, renew, track expiration)
- Emergency SOS button
- Incident reporting (post-jump)

**API Endpoints:**
- GET /facilities/{facilityId}/coaching/schedule
- POST /coaching-schedules/{sessionId}/signups
- DELETE /coaching-schedules/{sessionId}/signups/{signupId}
- GET /users/{userId}/waivers
- POST /users/{userId}/waivers/sign
- GET /facilities/{facilityId}/waiver-template
- POST /emergency-alerts
- GET /facilities/{facilityId}/emergency-alerts/active (staff)
- PATCH /emergency-alerts/{alertId} (staff)
- POST /incidents
- GET /users/{userId}/incidents

**Database Schema:**
- CoachingScheduleSession (new)
- CoachingSignUp (new)
- Waiver (new)
- WaiverTemplate (new)
- EmergencyAlert (new)
- Incident (new)

**Testing:**
- Coaching schedule matrix rendering
- Waiver signing flow (SmartWaiver mock)
- Emergency alert dispatch
- Waiver expiration logic

**Risk:** SmartWaiver API integration; real-time emergency alert delivery (latency critical)

---

### 10.5 Phase 5: Social & Advanced (Weeks 17-20)

**Goal:** Team formation, social features, advanced analytics.

**Deliverables:**
- Load Builder (team creation, member management)
- "Who's Going" social feed
- Messaging/Chat (basic)
- Logbook page (jump history, statistics)
- Discipline progress tracking (skill levels)
- Organizer management (delegate booking authority)
- USPA Merit linking (optional: if licensing validation needed)

**API Endpoints:**
- POST /teams (create team)
- GET /users/{userId}/teams
- PATCH /teams/{teamId}
- DELETE /teams/{teamId}
- GET /facilities/{facilityId}/who-is-going
- POST /users/{userId}/going-status
- POST /messages (chat)
- GET /conversations/{conversationId}/messages
- GET /users/{userId}/activity-log
- GET /users/{userId}/organizers
- POST /users/{userId}/organizers/{organizerId}
- DELETE /users/{userId}/organizers/{organizerId}
- POST /users/{userId}/connect-merit

**Database Schema:**
- Team (new)
- TeamMember (new)
- Message (new/implied)
- Conversation (new/implied)
- UserDiscipline (enhanced)
- OrganizerApproval (new)
- MeritAccount (new, if USPA integration)

**Testing:**
- Team creation and member management
- Messaging (send, receive, archive)
- Logbook statistics accuracy
- USPA API validation (mock)

**Risk:** Messaging scalability; USPA API rate limits

---

### 10.6 Phase 6: Polish & Launch (Weeks 21-24)

**Goal:** QA, performance optimization, launch preparation.

**Deliverables:**
- QR code check-in integration
- Weather widget enhancements
- Jump run map visualization
- Dark mode implementation
- Accessibility audit (WCAG 2.1 AA)
- Performance optimization (load times, memory)
- Analytics integration (Firebase, Mixpanel)
- App store submission (iOS, Android)
- Documentation (user guides, FAQs)
- Beta testing program

**Key Activities:**
- End-to-end testing (all flows)
- Load testing (concurrent bookings, manifest updates)
- Security audit (encryption, API authentication)
- Usability testing (beta users)
- App store compliance (review guidelines)
- Marketing assets (screenshots, descriptions)

**Deliverables for Code:**
- QR code generation and scanning
- Weather data integration (OpenWeatherMap, Aviation Weather)
- Map visualization (Google Maps or similar)
- Analytics tracking
- Error logging (Sentry)
- Crash reporting
- Release notes

**Testing:**
- Full regression testing
- Performance testing (API response times, app launch time)
- Security testing (authentication, payment data)
- Device/OS compatibility (iOS 14+, Android 11+)
- Network condition testing (slow 3G, offline)

---

## PART 11: PHASE-BY-PHASE BUILD PLAN FOR CLAUDE CODE

### 11.1 Phase 1 Build Plan: Foundation (Weeks 1-4)

**Week 1: Project Setup & Auth**

Files to Create:
```
/app
  /ios → XCode project (Swift, SwiftUI) or Flutter shared
  /android → Android Studio project (Kotlin, Jetpack Compose) or Flutter shared
  /shared → Shared code (API client, models, utilities)
    /models
      - User.dart / User.swift / User.kt
      - UserProfile.dart/swift/kt
      - Facility.dart/swift/kt
    /services
      - AuthService.dart/swift/kt
      - ApiClient.dart/swift/kt
      - StorageService.dart/swift/kt (local persistence)
    /utils
      - Constants.dart/swift/kt
      - Extensions.dart/swift/kt
      - Logger.dart/swift/kt
  /api → Backend (Node.js + Express or similar)
    /routes
      - auth.js
      - users.js
    /controllers
      - authController.js
      - userController.js
    /models
      - User.model.js
      - UserPreference.model.js
    /middleware
      - authMiddleware.js
      - errorHandler.js
    /config
      - database.js
      - oauth.js (Google, Apple)
    .env.example
    server.js
```

APIs to Build:
```
POST /auth/login → { email, password } → { token, refreshToken, user }
POST /auth/register → { email, password, name } → { token, user }
POST /auth/refresh-token → { refreshToken } → { token }
POST /auth/logout → { token } → { success }
GET /auth/google/callback → OAuth redirect handling
GET /auth/apple/callback → OAuth redirect handling
```

Database Schema:
```
User Table:
  id (UUID, PK)
  email (VARCHAR, UNIQUE)
  passwordHash (VARCHAR)
  name (VARCHAR)
  avatar (VARCHAR URL, nullable)
  createdAt (TIMESTAMP)
  updatedAt (TIMESTAMP)
  role (ENUM: ATHLETE, COACH, STAFF, ADMIN) default ATHLETE

UserPreference Table:
  id (UUID, PK)
  userId (FK)
  preferredUnits (JSON)
  theme (ENUM: LIGHT, DARK, AUTO)
  notificationsEnabled (BOOLEAN)
  homeDropzoneId (FK, nullable)
  weatherLimits (JSON)

Facility Table:
  id (UUID, PK)
  name (VARCHAR)
  location (VARCHAR)
  country (VARCHAR)
  lat/lng (DECIMAL)
  timeZone (VARCHAR)
  createdAt (TIMESTAMP)
```

Tests to Write:
```
/tests
  /auth.test.js → LoginFlow, RegisterFlow, TokenRefresh, OAuth
  /user.test.js → ProfileCRUD, PreferenceUpdate
  /integration.test.js → AuthFlow + Profile creation
```

Deliverable Checklist:
- [ ] XCode project builds and runs
- [ ] Android project builds and runs
- [ ] Login screen renders
- [ ] OAuth buttons configured (mock for testing)
- [ ] POST /auth/login works with test user
- [ ] POST /auth/register creates new user
- [ ] JWT token persisted in secure storage
- [ ] GET /auth/user returns authenticated user profile
- [ ] All auth tests pass (unit + integration)

---

**Week 2: User Profile & Navigation**

Files to Create:
```
/app/shared/ui
  /screens
    - HomeScreen.dart / HomeScreen.swift / HomeScreen.kt
    - ProfileScreen.dart/swift/kt
    - SettingsScreen.dart/swift/kt
  /widgets
    - BottomTabBar.dart/swift/kt
    - UserProfileCard.dart/swift/kt
    - FacilitySelector.dart/swift/kt
  /navigation
    - NavigationStack.dart/swift/kt
    - RouteNames.dart/swift/kt
  /themes
    - AppTheme.dart/swift/kt (light/dark)

/api/routes
  - users.js (extended)
  - preferences.js
  - facilities.js

/api/controllers
  - userController.js (extended)
  - preferenceController.js
  - facilityController.js
```

APIs to Build:
```
GET /users/{userId}/profile → { user profile with all fields }
PATCH /users/{userId}/profile → { updated user data } → { user }
GET /users/{userId}/preferences → { preferences }
PATCH /users/{userId}/preferences → { updated preferences } → { preferences }
GET /facilities → [ { id, name, location, ... } ]
GET /facilities/{facilityId} → { facility details }
```

UI Screens:
- Tabbed navigation (Home, Profile, Settings — stubs)
- Profile view (name, avatar, bio, stats — mock data initially)
- Profile edit (form with validation)
- Settings page (theme toggle, units selector)
- Facility selector dropdown

Tests:
```
/tests
  /profile.test.js → GetProfile, UpdateProfile, validation
  /preferences.test.js → GetPrefs, UpdatePrefs
  /navigation.test.js → TabNavigation, DeepLinking
```

Deliverable Checklist:
- [ ] 5-tab bottom navigation renders (all tabs show stubs)
- [ ] Profile screen shows user data (first name, avatar, jump count — mocked)
- [ ] Edit profile form with validation
- [ ] Settings page with theme toggle
- [ ] Facility selector dropdown populates from API
- [ ] GET /users/{userId}/profile returns mock user
- [ ] PATCH updates work with validation
- [ ] Tab navigation seamlessly switches screens
- [ ] All UI tests pass (snapshot, interaction)

---

**Week 3: Basic Load Board UI**

Files to Create:
```
/app/shared/models
  - Load.dart/swift/kt
  - Booking.dart/swift/kt
  - LoadSlot.dart/swift/kt

/app/shared/services
  - LoadService.dart/swift/kt
  - BookingService.dart/swift/kt

/app/shared/ui/screens
  - LoadBoardScreen.dart/swift/kt
  - LoadDetailScreen.dart/swift/kt

/app/shared/ui/widgets
  - LoadCard.dart/swift/kt
  - LoadDetailSheet.dart/swift/kt
  - LoadCountdownTimer.dart/swift/kt

/api/routes
  - loads.js
  - bookings.js

/api/controllers
  - loadController.js
  - bookingController.js
```

APIs to Build:
```
GET /facilities/{facilityId}/loads
  ?status=OPEN,FILLING &formation=FS &limit=20
  → [ { loadId, aircraftId, estimatedDeparture, capacity, currentCount, status, ... } ]

GET /loads/{loadId} → { load details with full jumper list }
POST /bookings → { loadId, jumperId } → { bookingId, status: PENDING }
GET /users/{userId}/bookings → [ { loadId, status, confirmed_at, ... } ]
DELETE /bookings/{bookingId} → { success }
```

UI Screens:
- Load board list (mock data: 5 loads, countdown timers static initially)
- Load detail sheet (tap a load to show details)
- Jumper list in load (mock names, jump counts)

Database Schema:
```
Load Table:
  id (UUID, PK)
  facilityId (FK)
  aircraftId (FK)
  estimatedDeparture (TIMESTAMP)
  estimatedLanding (TIMESTAMP)
  capacity (INT)
  currentCount (INT)
  status (ENUM: OPEN, FILLING, LOCKED, BOARDING, AIRBORNE, LANDED, COMPLETE)
  formation (VARCHAR)
  gateNumber (INT, nullable)
  createdAt (TIMESTAMP)

Booking Table:
  id (UUID, PK)
  userId (FK)
  loadId (FK)
  slotId (FK, nullable)
  status (ENUM: PENDING, CONFIRMED, CANCELLED)
  bookedAt (TIMESTAMP)
  confirmedAt (TIMESTAMP, nullable)
  cancelledAt (TIMESTAMP, nullable)

LoadSlot Table:
  id (UUID, PK)
  loadId (FK)
  slotIndex (INT)
  slotName (VARCHAR, e.g., "FS-BM5-1")
  bookingId (FK, nullable)
  formation (VARCHAR)
```

Tests:
```
/tests
  /loads.test.js → GetLoads, GetLoadDetail, filtering
  /bookings.test.js → CreateBooking, DeleteBooking, validation
```

Deliverable Checklist:
- [ ] Load board screen renders list of loads
- [ ] Countdown timers display (static, no real updates yet)
- [ ] Tap load opens detail sheet
- [ ] Load detail shows jumpers list (mock)
- [ ] GET /facilities/{facilityId}/loads returns mock loads
- [ ] POST /bookings succeeds with valid data
- [ ] DELETE /bookings/{bookingId} removes booking
- [ ] Error handling for invalid inputs
- [ ] All load/booking tests pass

---

**Week 4: Load Status & Countdown Logic**

Files to Create:
```
/app/shared/services
  - LoadStatusService.dart/swift/kt (polling or WebSocket prep)
  - TimerService.dart/swift/kt

/app/shared/ui/widgets
  - CountdownTimer.dart/swift/kt (reusable widget)

/api/middleware
  - loadStatusMiddleware.js (status validation)

/api/jobs (optional background jobs)
  - loadStatusTransition.js (cron to auto-transition loads if integrated)
```

Features:
- Countdown timer updates every second (client-side locally for now)
- Load status transitions logic (validation: OPEN→FILLING, FILLING→LOCKED, etc.)
- Capacity color coding (green=OPEN, yellow=FILLING, orange=LOCKED)
- Load filtering (status, formation)

APIs:
```
PATCH /loads/{loadId}/status
  { newStatus, reason }
  → { loadId, previousStatus, newStatus, timestamp }

GET /facilities/{facilityId}/loads?status=OPEN&formation=FS
  → filtered loads
```

Tests:
```
/tests
  /loadStatus.test.js → StateTransitions (OPEN→FILLING→LOCKED), validation
  /timer.test.js → CountdownLogic (update every second, handle past time)
```

Deliverable Checklist:
- [ ] Countdown timers update every second
- [ ] Status badges color-coded correctly
- [ ] Load filters work (status, formation, myLoadsOnly)
- [ ] Load capacity shown as "4 / 8"
- [ ] PATCH /loads/{loadId}/status validates transitions
- [ ] Booking attempts validate against load status
- [ ] UI updates when load status changes (polling or WebSocket prep)
- [ ] All status/timer tests pass
- [ ] App ready for Phase 2: Real-time features

---

### 11.2 Phase 2 Build Plan: Core Manifest (Weeks 5-8)

*(Abbreviated for space; would follow same detailed pattern)*

**Week 5: WebSocket & Real-Time Updates**
- WebSocket server setup (Socket.io or native WebSockets)
- Real-time manifest board screen (staff-only)
- Live load updates (status, capacity, jumper list)
- Real-time countdown timers

**Week 6: Booking Flow & Validation**
- Complete booking flow (select load → confirm → payment deduction)
- Load confirmation screen
- Waiver validation (check before booking)
- Payment validation (sufficient balance/tickets)

**Week 7: Manifest Staff Features**
- Real-time manifest board (staff view of all loads)
- Jumper list with payment status badges
- Reassignment capability (drag/drop or long-press menu)
- Load launch action (transition to AIRBORNE)

**Week 8: Load Lifecycle & Testing**
- Complete load state machine (OPEN → COMPLETE)
- Auto-transitions (time-based or manual)
- Notification system (booking confirmation, status changes)
- Full end-to-end testing (booking → confirmation → airborne → complete)

---

### 11.3 Dependencies Between Phases

```
Phase 1: Foundation
  ├─ Auth module (blocking Phase 2: can't book without login)
  ├─ User profiles (needed for load jumper display)
  └─ Facility selector (needed for all location-specific data)
       ↓
Phase 2: Core Manifest
  ├─ Load board (requires Phase 1: user auth + facility context)
  ├─ Booking system (requires Phase 1: auth + Phase 3: payment logic)
  ├─ Real-time (Phase 3: WebSocket setup)
  └─ Manifest board (requires Phase 2 bookings, Phase 4: waivers)
       ↓
Phase 3: Payments
  ├─ Payment processing (unblocks Phase 2: booking flow complete)
  ├─ Transaction history (Phase 2: booking must exist first)
  └─ Refund logic (Phase 2: bookings must be cancellable)
       ↓
Phase 4: Training & Safety
  ├─ Waivers (required before Phase 2: bookings blocked if no waiver)
  ├─ Coaching schedule (independent, but integrates with load board)
  ├─ Emergency SOS (independent, but needs Phase 1: user profile)
  └─ Incidents (Phase 2: loads must exist; requires Phase 4: complete load state)
       ↓
Phase 5: Social & Advanced
  ├─ Load Builder (Phase 2: loads must exist; Phase 3: payment for team bookings)
  ├─ Messaging (independent, but Phase 2: team assignments need comms)
  ├─ Logbook (Phase 2: completed loads must exist)
  └─ Organizer management (Phase 1: users, Phase 2: bookings for delegation)
       ↓
Phase 6: Polish & Launch
  └─ All phases must be complete
```

---

### 11.4 Testing Checkpoints

**Phase 1 Checkpoint:**
- [ ] User can register, login, logout
- [ ] Profile CRUD works
- [ ] Settings persist
- [ ] Navigation works
- [ ] Authentication tests: 90%+ coverage

**Phase 2 Checkpoint:**
- [ ] User can see load board
- [ ] User can select and book a load
- [ ] Real-time manifest shows staff all loads
- [ ] Load status transitions work
- [ ] Booking tests: 85%+ coverage

**Phase 3 Checkpoint:**
- [ ] Balance displays correctly
- [ ] Booking deducts tickets/balance
- [ ] Transaction history shows all entries
- [ ] Refunds process correctly
- [ ] Payment tests: 90%+ coverage

**Phase 4 Checkpoint:**
- [ ] Waivers prevent booking if not signed
- [ ] Coaching schedule displays correctly
- [ ] SOS button sends alerts to staff
- [ ] Incidents can be reported post-jump
- [ ] Safety tests: 85%+ coverage

**Phase 5 Checkpoint:**
- [ ] Teams can be created and managed
- [ ] Logbook shows jump history
- [ ] Messaging works between users
- [ ] Organizer permissions enforced
- [ ] Social tests: 80%+ coverage

**Phase 6 Checkpoint:**
- [ ] End-to-end: booking → jump → logbook
- [ ] QR check-in works
- [ ] Performance: < 2s load board display
- [ ] Crash-free 24-hour beta test
- [ ] App store submission approved

---

**Summary:**
This comprehensive audit document provides the complete blueprint for building SkyLara's mobile application. The competitor analysis reveals critical features (coaching matrix, real-time manifest, waivers, emergency SOS), gap priorities, and a phased implementation roadmap spanning 24 weeks with detailed APIs, database schema, and testing requirements per phase.

