# SkyLara Mobile Design System — Figma Reference

> **Source:** Figma file "SkyTripe" — [Open in Figma](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=0-1)
> **All screens:** 390px width (mobile-first)
> **Total:** 22 sections, 100+ screens
> **Last updated:** 2026-04-11

---

## Table of Contents

1. [Onboarding — Coach & Instructor (7 Steps)](#1-onboarding--coach--instructor-7-steps)
2. [Onboarding — Videographer (7 Steps)](#2-onboarding--videographer-7-steps)
3. [Onboarding — Tunnel Flyer (7 Steps)](#3-onboarding--tunnel-flyer-7-steps)
4. [Onboarding — Beginner & Non-Skydiver (7 Steps)](#4-onboarding--beginner--non-skydiver-7-steps)
5. [Onboarding — Organizer (7 Steps)](#5-onboarding--organizer-7-steps)
6. [Sign Up & Login (4 Screens)](#6-sign-up--login-4-screens)
7. [Home Screen](#7-home-screen)
8. [Profile Section (12 Screens)](#8-profile-section-12-screens)
9. [Log New Jump (3 Variants)](#9-log-new-jump-3-variants)
10. [Weather](#10-weather)
11. [My Gear (2 Screens)](#11-my-gear-2-screens)
12. [Drop Zone — Full Booking Flow (10 Screens)](#12-drop-zone--full-booking-flow-10-screens)
13. [Manifest Booking Flow (4 Screens)](#13-manifest-booking-flow-4-screens)
14. [Events — List & Details (3 Screens)](#14-events--list--details-3-screens)
15. [Events — Boogie Flow (3 Steps)](#15-events--boogie-flow-3-steps)
16. [Events — Competition Flow (5 Steps)](#16-events--competition-flow-5-steps)
17. [Events — Course Flow (5 Steps)](#17-events--course-flow-5-steps)
18. [Events — Camp Flow (5 Steps)](#18-events--camp-flow-5-steps)
19. [Events — Tunnel Flow (4 Steps)](#19-events--tunnel-flow-4-steps)
20. [Event Creation — Organizer Screens](#20-event-creation--organizer-screens)
21. [Shop (6 Screens)](#21-shop-6-screens)
22. [Jobs / Careers (5 Screens)](#22-jobs--careers-5-screens)
23. [Expert / Coaching (2 Screens)](#23-expert--coaching-2-screens)
24. [Bookings — 1-on-1 Sessions (4 Steps)](#24-bookings--1-on-1-sessions-4-steps)

**Appendices:**
- [Design Tokens](#design-tokens)
- [Component Library](#component-library)
- [Figma Node ID Quick Reference](#appendix-figma-node-id-quick-reference)

---

## Design Tokens

### Color Palette

These are the brand colors defined in the mobile Figma file, mapped to the codebase `brand.*` tokens in `apps/mobile/tailwind.config.js`.

| Token              | Hex       | Tailwind Class       | Usage                                     |
|--------------------|-----------|----------------------|--------------------------------------------|
| Primary (Sky Blue) | `#0EA5E9` | `brand-primary`      | CTAs, links, active states, navigation     |
| Secondary (Indigo) | `#6366F1` | `brand-secondary`    | Badges, progress indicators, accents       |
| Accent (Teal)      | `#14B8A6` | `brand-accent`       | Success accents, verified states, coaching  |
| Danger (Red)       | `#EF4444` | `brand-danger`       | Errors, destructive actions, alerts        |
| Warning (Amber)    | `#F59E0B` | `brand-warning`      | Caution states, pending items              |
| Success (Green)    | `#22C55E` | `brand-success`      | Confirmation, completion, jump-logged      |
| Dark (Slate)       | `#0F172A` | `brand-dark`         | Text primary, dark backgrounds             |
| Muted (Slate)      | `#64748B` | `brand-muted`        | Secondary text, placeholders, timestamps   |

**Extended sky palette (gradient backgrounds):**

| Shade | Hex       | Usage                              |
|-------|-----------|------------------------------------|
| 50    | `#F0F9FF` | Light background tints             |
| 100   | `#E0F2FE` | Card hover states                  |
| 200   | `#BAE6FD` | Active selection backgrounds       |
| 300   | `#7DD3FC` | Progress bar fills                 |
| 400   | `#38BDF8` | Interactive element highlights     |
| 500   | `#0EA5E9` | Primary actions (base)             |
| 600   | `#0284C7` | Primary actions (pressed)          |
| 700   | `#0369A1` | Dark mode primary actions          |
| 800   | `#075985` | Navigation bar background          |
| 900   | `#0C4A6E` | Deep background, splash screens    |
| 950   | `#082F49` | Deepest dark, overlay backgrounds  |

**Status-specific colors (manifest/operations):**

| Status    | Hex       | Usage                       |
|-----------|-----------|-----------------------------|
| Open      | `#10B981` | Load slot available          |
| Filling   | `#3B82F6` | Load partially filled        |
| Locked    | `#F59E0B` | Load locked, no more slots   |
| Boarding  | `#F97316` | Athletes boarding aircraft   |
| Airborne  | `#EF4444` | Aircraft in flight           |
| Landed    | `#A855F7` | Aircraft landed              |
| Complete  | `#6B7280` | Load complete                |
| Cancelled | `#64748B` | Load cancelled               |

### Typography

The design system uses **Inter** as the sole typeface across all screens.

| Level     | Size   | Weight     | Line Height | Letter Spacing | Usage                                         |
|-----------|--------|------------|-------------|----------------|-----------------------------------------------|
| H1        | 28px   | Bold (700) | 34px        | -0.02em        | Page titles (Home, Profile, DZ Overview)       |
| H2        | 24px   | Bold (700) | 30px        | -0.02em        | Section headings, modal titles                 |
| H3        | 20px   | SemiBold (600) | 26px    | -0.01em        | Card titles, step headings                     |
| H4        | 18px   | SemiBold (600) | 24px    | -0.01em        | Sub-section headings, form section labels      |
| H5        | 16px   | SemiBold (600) | 22px    | 0              | Small headings, list group labels              |
| Body L    | 16px   | Regular (400) | 24px     | 0              | Primary body text, descriptions                |
| Body M    | 14px   | Regular (400) | 20px     | 0              | Secondary text, form help text                 |
| Body S    | 12px   | Regular (400) | 16px     | 0.01em         | Captions, timestamps, metadata                 |
| Label     | 14px   | Medium (500) | 20px      | 0              | Form labels, button text                       |
| Link      | 14px   | Medium (500) | 20px      | 0              | Tappable text links, underlined in primary     |
| Stat Number | 32px | Bold (700) | 38px       | -0.02em        | Dashboard stat counters (Total Jumps, etc.)    |
| Tiny      | 10px   | Medium (500) | 14px      | 0.02em         | Bottom nav labels, badge counts                |

### Spacing & Layout

| Token     | Value  | Pixels | Usage                                              |
|-----------|--------|--------|----------------------------------------------------|
| Base Width | —     | 390px  | All screens designed at iPhone 14 Pro width         |
| Safe Area Top | —  | 47px   | Status bar + notch inset                           |
| Safe Area Bottom | — | 34px | Home indicator inset                               |
| `xs`      | 0.25rem | 4px  | Inline spacing, icon-to-text gaps                  |
| `sm`      | 0.5rem | 8px   | Tight padding, list item internal spacing          |
| `md`      | 1rem   | 16px  | Standard horizontal padding, card inner padding    |
| `lg`      | 1.5rem | 24px  | Section vertical spacing                           |
| `xl`      | 2rem   | 32px  | Page top margin, between major sections            |
| `2xl`     | 3rem   | 48px  | Hero section padding                               |
| `3xl`     | 4rem   | 64px  | Bottom nav clearance, large section gaps           |

**Standard screen padding:** 16px horizontal (left/right) on all screens.

**Card padding:** 16px all sides with 12px border-radius.

**Button height:** 48px (primary), 40px (secondary/compact).

### Border Radius

| Token  | Value | Usage                                     |
|--------|-------|--------------------------------------------|
| `xs`   | 4px   | Tags, small badges                         |
| `sm`   | 6px   | Input fields                               |
| `base` | 8px   | Cards, dropdowns                           |
| `md`   | 12px  | Larger cards, bottom sheets                |
| `lg`   | 16px  | Modal windows, floating panels             |
| `xl`   | 24px  | Hero cards, feature highlights             |
| `full` | 9999px| Avatars, pill buttons, circular indicators |

### Shadow System

| Token  | Value                                                                          | Usage                          |
|--------|-------------------------------------------------------------------------------|--------------------------------|
| `xs`   | `0 1px 2px 0 rgba(0,0,0,0.05)`                                               | Subtle card lift               |
| `sm`   | `0 1px 2px 0 rgba(0,0,0,0.05)`                                               | Input field focus              |
| `base` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`                     | Default card elevation         |
| `md`   | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`           | Floating cards, dropdowns      |
| `lg`   | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)`         | Modals, overlays               |
| `xl`   | `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)`       | Bottom sheets, floating FABs   |

---

## Component Library

### Header — TopAppBar (70 instances across file)

- **Height:** 56px (content) + safe area inset
- **Layout:** Row — back arrow (left), title (center), action icon(s) (right)
- **Back arrow:** 24x24 chevron-left icon, 8px padding, tappable area 44x44
- **Title:** H4 (18px SemiBold), centered
- **Action icons:** 24x24, right-aligned, 8px gap between multiple
- **Background:** White (`#FFFFFF`) with 1px bottom border (`#E5E7EB`) or transparent over hero images
- **Dark variant:** Background `#0F172A`, text white, used on splash/hero screens

### BottomNavBar (37 instances)

- **Height:** 56px + safe area bottom inset (34px)
- **Tabs:** 4 equal-width columns
- **Tab items:**
  - **Home** — house icon + "Home" label
  - **Weather** — cloud-sun icon + "Weather" label
  - **Bookings** — calendar icon + "Bookings" label
  - **Profile** — user-circle icon + "Profile" label
- **Active state:** Primary blue (`#0EA5E9`) icon + label, 2px top indicator line
- **Inactive state:** Muted (`#64748B`) icon + label
- **Icon size:** 24x24
- **Label:** 10px Medium, 4px below icon
- **Background:** White with top border `#E5E7EB`

### Button (613 instances)

**Primary Button:**
- Height: 48px, full width (358px at 16px side padding)
- Background: `#0EA5E9` (primary)
- Text: 16px SemiBold, white, centered
- Border-radius: 12px
- Pressed state: `#0284C7`
- Disabled state: `#94A3B8` background, white text at 60% opacity

**Secondary Button:**
- Height: 48px, full width
- Background: transparent
- Border: 1.5px solid `#0EA5E9`
- Text: 16px SemiBold, `#0EA5E9`
- Border-radius: 12px

**Compact Button:**
- Height: 40px, auto width with 16px horizontal padding
- Background: `#F0F9FF` (sky-50)
- Text: 14px Medium, `#0EA5E9`
- Border-radius: 8px

**Danger Button:**
- Same dimensions as Primary
- Background: `#EF4444`
- Pressed: `#DC2626`

**Ghost Button:**
- Height: 40px, auto width
- Background: transparent, no border
- Text: 14px Medium, `#0EA5E9`
- Used for "Skip", "Cancel", "Forgot password" actions

### Input (164 instances)

- **Height:** 48px
- **Border:** 1px solid `#E5E7EB`
- **Border-radius:** 8px
- **Padding:** 12px horizontal
- **Background:** `#FFFFFF`
- **Text:** 16px Regular, `#0F172A`
- **Placeholder:** 16px Regular, `#9CA3AF`
- **Label:** 14px Medium, `#374151`, 6px above input
- **Focus state:** 2px solid `#0EA5E9` border, `#F0F9FF` background tint
- **Error state:** 2px solid `#EF4444` border, 12px Body S error text below in red
- **Disabled state:** `#F3F4F6` background, `#9CA3AF` text

### Avatar (15 instances)

- **Sizes:** 32px (list), 48px (card), 64px (profile header), 96px (edit profile)
- **Shape:** Circle (`border-radius: full`)
- **Border:** 2px solid white (when overlapping), 2px solid `#0EA5E9` (verified users)
- **Fallback:** Initials on `#E0F2FE` background in `#0EA5E9` text
- **Badge overlay:** 12px circle, bottom-right, for verification checkmark

### Progress Indicator (17 instances)

**Step Progress Bar (Onboarding):**
- 7-segment horizontal bar, 4px height each segment
- Active/completed: `#0EA5E9` fill
- Upcoming: `#E5E7EB` fill
- 4px gap between segments
- Step label below: "Step X of 7" in 12px Regular muted

**Circular Progress (Profile):**
- 64px diameter ring
- Stroke width: 6px
- Track: `#E5E7EB`
- Fill: `#0EA5E9` (animated)
- Center text: percentage or jump count

**Linear Progress (Jumpability Score):**
- Full width bar, 8px height, 4px border-radius
- Track: `#E5E7EB`
- Fill: gradient from `#0EA5E9` to `#22C55E` (high score) or `#EF4444` (low score)

### Surface Cards

**Background+Shadow Card:**
- Background: `#FFFFFF`
- Border-radius: 12px
- Shadow: `base` elevation
- Padding: 16px
- Used for: stat cards, gear cards, booking summaries

**Background+Border Card:**
- Background: `#FFFFFF`
- Border: 1px solid `#E5E7EB`
- Border-radius: 12px
- Padding: 16px
- Used for: form sections, list items, settings rows

**Overlay Surface:**
- Background: `rgba(0, 0, 0, 0.5)` full-screen backdrop
- Content card: white, border-radius 16px top, slides up from bottom
- Used for: bottom sheets, filter panels, confirmations

### Status Badges

- **Height:** 24px, auto width
- **Padding:** 4px horizontal, 2px vertical
- **Border-radius:** 4px
- **Font:** 12px Medium
- **Variants:**
  - Verified: `#DCFCE7` bg, `#16A34A` text
  - Pending: `#FEF3C7` bg, `#D97706` text
  - Expired: `#FEE2E2` bg, `#DC2626` text
  - Active: `#E0F2FE` bg, `#0284C7` text
  - Pro: `#EDE9FE` bg, `#7C3AED` text

---

## 1. Onboarding — Coach & Instructor (7 Steps)

All onboarding flows share a consistent 7-step wizard pattern. Each step is a full-height scrollable screen at 390px width with a top progress bar, content area, and bottom CTA.

### Step 1: Welcome — Node `4:9`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-9)

**Layout:**
- Full-bleed sky gradient hero image at top (approximately 200px)
- Headline: "Join the Global Skydiving Network" in H1 white, centered over hero
- Sub-headline: "Track, connect, and grow your skydiving career" in Body L, white at 80% opacity

**Content Cards (Bento Grid):**
- Two feature cards in a 2-column grid below hero:
  - **Smart Logs** — logbook icon, "Smart Logs" title (H5), "Automatically track every jump, canopy flight, and freefall" description (Body S)
  - **Global Tribe** — globe icon, "Global Tribe" title (H5), "Connect with skydivers, DZs, and events worldwide" description (Body S)
- Cards use Background+Shadow surface, 12px border-radius

**Role Selection Cards:**
- Vertical list of tappable role cards, each 72px tall:
  - Coach/Instructor (shield icon)
  - Videographer (camera icon)
  - Tunnel Flyer (wind icon)
  - Beginner / Non-Skydiver (star icon)
  - Organizer (clipboard icon)
- Selected card: `#0EA5E9` left border (3px), `#F0F9FF` background
- Unselected: white background, `#E5E7EB` border

**Bottom CTA:** Primary button "Get Started" full width

### Step 2: Personal Info — Node `4:94`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-94)

**Progress Bar:** Step 2 of 7 active

**Form Fields (vertical stack, 16px gap):**
- **Full Name** — text input, placeholder "Enter your full name"
- **Email** — email input, placeholder "your@email.com"
- **Phone** — phone input with country code prefix selector (+1, +44, +971), placeholder "Phone number"
- **Nationality** — select dropdown, placeholder "Select your nationality"

**Validation:** Real-time field validation with green checkmark on valid, red border + error text on invalid.

**Bottom CTA:** Primary button "Continue" with disabled state until all required fields are valid

### Step 3: Progress — Node `4:198`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-198)

**Progress Bar:** Step 3 of 7 active

**Content:**
- Headline step indicator: large circular "3" with surrounding progress ring
- Section title: "Your Skydiving Journey" in H2
- Motivational sub-text describing what comes next in the flow

**Purpose:** Transitional step between identity and professional information. Provides context on why the remaining steps matter.

**Bottom CTA:** Primary button "Continue"

### Step 4: Vertical Identity — Node `4:303`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-303)

**Progress Bar:** Step 4 of 7 active

**USPA License Level Selection:**
- Radio-style selection cards, one per license:
  - A License
  - B License
  - C License
  - D License
  - Tandem Rating
  - AFF Rating
  - Coach Rating
- Selected: `#0EA5E9` border, checkmark icon, `#F0F9FF` background
- Each card shows license name (H5) and brief description (Body S muted)

**Discipline Selection (Multi-select checkboxes):**
- Section title: "Disciplines" in H4
- Grid of checkboxes (2-column):
  - Formation Skydiving (FS)
  - Freefly
  - Wingsuit
  - Canopy Piloting
  - CRW (Canopy Relative Work)
  - Speed Skydiving
  - Artistic Events
  - Tracking / Angle
- Checked: `#0EA5E9` filled checkbox, label in `#0EA5E9`

**Credentials Input:**
- Section title: "Credentials & Ratings" in H4
- Text input for USPA member number
- Text input for rating numbers
- File upload area for credential documents (dashed border, upload icon)

**Bottom CTA:** Primary button "Continue"

### Step 5: Professional History — Node `4:462`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-462)

**Progress Bar:** Step 5 of 7 active

**Expertise Domains Selection:**
- Section title: "Expertise Domains" in H4
- Multi-select pill tags:
  - AFF Instruction
  - Tandem Operations
  - Coach Rating Instruction
  - Safety & Training
  - Canopy Coaching
  - Load Organizing
  - Camera/Video
  - Competition Judging
- Selected pill: `#0EA5E9` background, white text
- Unselected pill: `#F3F4F6` background, `#374151` text

**Professional History Form:**
- Section title: "Professional History" in H4
- **Total Jumps** — number input
- **Years of Experience** — number input
- **Home DZ** — text input with search autocomplete
- **Previous DZs Worked** — text input, multi-entry with tag chips
- **Bio / About** — textarea, 4 lines visible, 200 char soft limit with counter

**Bottom CTA:** Primary button "Continue"

### Step 6: Travel & Booking — Node `4:581`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-581)

**Progress Bar:** Step 6 of 7 active

**DZ Types Preference:**
- Section title: "Preferred Dropzone Types" in H4
- Multi-select cards:
  - Tandem Factory (high volume, student focus)
  - Fun Jumper Paradise (experienced jumper focus)
  - Military / Restricted (government operations)
  - Boogie / Event DZ (festival and event focus)
  - Training Academy (structured learning programs)
- Each card: icon + title + one-line description

**Payment Methods:**
- Section title: "Payment Preferences" in H4
- Toggle options:
  - Credit/Debit Card
  - PayPal
  - Apple Pay
  - Bank Transfer
  - Cash / On-Site

**Travel Frequency:**
- Section title: "Travel Frequency" in H4
- Single-select radio group:
  - Every weekend (local)
  - Monthly (regional)
  - Quarterly (national)
  - Annually (international boogies/events)
  - Digital nomad (full-time traveling)

**Bottom CTA:** Primary button "Continue"

### Step 7: Profile Summary — Node `4:700`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-700)

**Progress Bar:** Step 7 of 7 active (complete)

**Identity Verification Section:**
- Section title: "Identity Verification" in H4
- Verification status badges for each submitted document
- Upload prompt for any missing verifications
- Trust score indicator (circular progress)

**Community Pulse:**
- Section title: "Community Pulse" in H4
- Stats preview: "You'll join X coaches in your region"
- Suggested connections preview (2-3 avatar thumbnails)

**Profile Summary Card:**
- Background+Shadow card with full profile preview:
  - Avatar (96px) with upload/edit overlay
  - Name (H2)
  - Role badge (e.g., "AFF Instructor")
  - License level badge
  - Discipline tags (pills)
  - Home DZ
  - Total jumps stat
  - Bio excerpt (2 lines, truncated)

**Bottom CTA:** Primary button "Complete Profile" (final submit)

---

## 2. Onboarding — Videographer (7 Steps)

**Node range:** `4:1213` through `4:2009`

Follows the identical 7-step wizard structure as Coach & Instructor with these persona-specific adaptations:

### Step 1: Welcome — Node `4:1213`
- Same bento cards and role selection
- Videographer role pre-selected with active highlight

### Step 2: Personal Info — Node `4:1337`
- Identical form fields: Full Name, Email, Phone, Nationality

### Step 3: Progress — Node `4:1441`
- Same transitional progress step

### Step 4: Vertical Identity — Node `4:1546`
- **License Level:** Same USPA levels available
- **Disciplines replaced with Camera Specialties:**
  - Tandem Handcam
  - Outside Video
  - Inside Video / Freefly Camera
  - Wingsuit Camera
  - Canopy Camera
  - Drone Operations
  - Event Coverage
  - Editing & Post-Production
- **Equipment section** (instead of credentials):
  - Camera system (text input)
  - Helmet mount type (select)
  - Editing software (multi-select)

### Step 5: Professional History — Node `4:1663`
- **Expertise Domains adapted:**
  - Tandem Video
  - Sport Videography
  - Event/Boogie Coverage
  - Coaching Video Review
  - Promotional / Marketing
  - Competition Judging Video
- **Portfolio link** field (URL input)
- **Reel / Sample** file upload area

### Step 6: Travel & Booking — Node `4:1782`
- Same DZ type preferences
- Added **Rate Card** section:
  - Per-jump rate (number input with currency)
  - Day rate
  - Event/boogie rate
- Same payment methods and travel frequency

### Step 7: Profile Summary — Node `4:2009`
- Profile card shows videographer-specific badges
- Camera equipment summary
- Portfolio link display
- Rate card preview

---

## 3. Onboarding — Tunnel Flyer (7 Steps)

**Node range:** `4:2126` through `4:2790`

### Step 1: Welcome — Node `4:2126`
- Tunnel Flyer role pre-selected

### Step 2: Personal Info — Node `4:2250`
- Identical form fields

### Step 3: Progress — Node `4:2354`
- Same transitional step

### Step 4: Vertical Identity — Node `4:2459`
- **Rating Levels replaced with Tunnel Ratings:**
  - IBA Level 1-5
  - Tunnel Instructor
  - Tunnel Coach
  - Competition Flyer
- **Disciplines replaced with Tunnel Disciplines:**
  - Belly Flying
  - Back Flying
  - Sit Flying
  - Head Down
  - Dynamic 2-way
  - Dynamic 4-way
  - VFS (Vertical Formation Skydiving)
  - Freestyle
- **Total Tunnel Hours** (number input instead of total jumps)

### Step 5: Professional History — Node `4:2576`
- **Expertise Domains:**
  - First-time flyer coaching
  - Progression coaching
  - Competition training
  - Team formation coaching
  - Transition to skydiving coaching
- **Home Tunnel** (text input with autocomplete)
- **Previous Tunnels** (multi-entry)
- **Competition Results** (textarea)

### Step 6: Travel & Booking — Node `4:2695`
- **Tunnel Type Preferences** (instead of DZ types):
  - Recirculating
  - Non-recirculating
  - Outdoor
- **Availability Schedule** section:
  - Days available (multi-select: Mon-Sun)
  - Time slots preferred (morning/afternoon/evening)
- Same payment methods

### Step 7: Profile Summary — Node `4:2790`
- Tunnel-specific profile card with tunnel hours, IBA rating, disciplines
- Home tunnel prominently displayed

---

## 4. Onboarding — Beginner & Non-Skydiver (7 Steps)

**Node range:** `4:2911` through `4:3586`

### Step 1: Welcome — Node `4:2911`
- Beginner / Non-Skydiver role pre-selected
- Feature cards emphasize discovery: "Discover the Sky" and "Find Your First Jump"

### Step 2: Personal Info — Node `4:3035`
- Identical form fields
- Additional field: **Date of Birth** (date picker, required for waiver/age verification)

### Step 3: Progress — Node `4:3139`
- Motivational messaging: "Your skydiving journey starts here"

### Step 4: Vertical Identity — Node `4:3244`
- **Experience Level** (single select, simplified):
  - Never jumped before
  - 1-5 tandems completed
  - AFF Student (in progress)
  - A License (just earned)
- **Interest Areas** (multi-select):
  - Tandem Skydiving
  - AFF / Solo Training
  - Indoor Skydiving / Tunnel
  - Watching / Spectating
  - Photography
  - Events & Boogies (spectator)
- **Health Declaration** toggle: "I confirm I have no medical conditions that prevent skydiving"

### Step 5: Aspirations — Node `4:3364`

Variant nodes: `4:2583`, `4:3364`, `4:4160`

- Section title: "What excites you most?" in H3
- **Goal Selection** (visual cards with illustrations):
  - First Tandem Jump
  - Learn to Skydive Solo (AFF)
  - Try Indoor Skydiving
  - Attend a Boogie / Event
  - Join the Community
- **Preferred Location** — location search input with GPS auto-detect
- **Budget Range** — slider or select:
  - Under $200
  - $200-$500
  - $500-$1,000
  - $1,000+
  - Not sure yet

### Step 6: Travel & Booking — Node `4:3481`
- **Preferred DZ Distance** — radius selector (10mi, 25mi, 50mi, 100mi, anywhere)
- **Preferred Time** — single select (weekday, weekend, either)
- **Group Size** — number input ("How many people are jumping with you?")
- Simplified payment methods (Credit Card, Apple Pay, PayPal)

### Step 7: Profile Summary — Node `4:3586`
- Beginner-friendly profile card:
  - Avatar with "Newcomer" badge
  - Interest tags
  - Nearest DZ recommendation card
  - "Your First Jump" suggested next step CTA

---

## 5. Onboarding — Organizer (7 Steps)

**Node range:** `4:3707` through `4:4391`

### Step 1: Welcome — Node `4:3707`
- Organizer role pre-selected
- Feature cards: "Manage Events" and "Build Community"

### Step 2: Personal Info — Node `4:3831`
- Identical base fields
- Additional field: **Organization Name** (text input)
- Additional field: **Role / Title** (text input)

### Step 3: Progress — Node `4:3935`
- Same transitional step

### Step 4: Vertical Identity — Node `4:4040`
- **Organizer Type** (single select):
  - Boogie Organizer
  - Competition Organizer
  - Course Provider
  - Camp Organizer
  - Tunnel Event Organizer
  - DZ Owner/Manager
- **License / Affiliation:**
  - USPA Group Member Number
  - FAI / IPC affiliation
  - National federation membership
- **Organization Size:**
  - Solo organizer
  - Small team (2-5)
  - Medium team (6-20)
  - Large organization (20+)

### Step 5: Professional History — Node `4:4160`
- **Event History:**
  - Total events organized (number)
  - Largest event size (number)
  - Types of events run (multi-select from boogie, competition, course, camp, tunnel)
- **Venue Relationships:**
  - Partner DZs (multi-entry autocomplete)
  - Partner tunnels (multi-entry autocomplete)
- **Website / Social** — URL inputs

### Step 6: Travel & Booking — Node `4:4286`
- **Service Regions** — multi-select map regions or country selector
- **Insurance & Liability** — toggle for insurance coverage, upload field
- **Payment Processing:**
  - Stripe connected (toggle)
  - PayPal business (toggle)
  - Bank transfer details

### Step 7: Profile Summary — Node `4:4391`
- Organizer profile card:
  - Organization avatar/logo
  - Organization name + personal name
  - Organizer type badge
  - Event count stat
  - Partner DZ count
  - Service region tags

---

## 6. Sign Up & Login (4 Screens)

### Splash / Landing — Node `7:4597`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4597)

**Layout:**
- Full-bleed hero image: high-altitude skydiving stratosphere photo
- Dark gradient overlay (bottom 40%: `rgba(0,0,0,0.6)` to `rgba(0,0,0,0)`)
- **SkyLara logo** centered, white, approximately 120px wide
- **Tagline:** "The Global Skydiving Platform" in Body L, white, centered
- **CTA stack (bottom):**
  - Primary button: "Sign Up" — full width
  - Secondary button: "Sign In" — full width, outline variant
  - Ghost text link: "Explore as Guest"
- Bottom safe area padding applied

### Sign In — Node `7:4635`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4635)

**Layout:**
- TopAppBar with back arrow, title "Sign In"
- **Sign In Card** (Background+Shadow surface, centered):
  - SkyLara logo (small, 48px, centered above card)
  - **Email** input field — placeholder "Enter your email"
  - **Password** input field — placeholder "Enter your password", eye toggle for show/hide
  - **Forgot Password** — ghost link, right-aligned below password field
  - Primary button: "Sign In" full width
  - Divider with "or" text
  - Social login buttons row: Google, Apple (icon-only, 48px circular)
- **Bottom text:** "Don't have an account? **Sign Up**" with link to register

### Sign Up / Register — Node `7:4697`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4697)

**Layout:**
- TopAppBar with back arrow, title "Create Account"
- **Registration Form:**
  - **Full Name** — text input
  - **Email** — email input
  - **Password** — password input with strength indicator (4-segment bar below)
  - **Confirm Password** — password input with match validation
  - **Terms checkbox:** "I agree to the Terms of Service and Privacy Policy" (links underlined)
  - Primary button: "Create Account" full width
  - Divider with "or"
  - Social signup: Google, Apple buttons
- **Bottom text:** "Already have an account? **Sign In**" with link

### Reset Password — Node `7:4748`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4748)

**Layout:**
- TopAppBar with back arrow, title "Reset Password"
- **Illustration:** Lock/key icon, centered, 64px
- **Instructional text:** "Enter the email address associated with your account and we'll send you a reset link." in Body L, centered
- **Email** input field — placeholder "Enter your email"
- Primary button: "Send Reset Link" full width
- **Bottom text:** "Remember your password? **Log In**" with link

---

## 7. Home Screen — Node `9:4977`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=9-4977)

**Layout (top to bottom):**

**Greeting Header:**
- "Good morning, Alex" in H2
- Sub-text: date and weather summary ("Clear skies, 28C")
- Notification bell icon (right), with red dot badge if unread

**Stats Dashboard (2x2 Grid):**
- Four stat cards in a 2-column grid:
  - **Total Jumps** — large stat number (e.g., "312"), label "Total Jumps", parachute icon
  - **Max Altitude** — stat "15,000 ft", label "Max Altitude", arrow-up icon
  - **Best Freefall** — stat "68s", label "Best Freefall", timer icon
  - **Experience** — stat "4 yrs", label "Experience", calendar icon
- Each card: Background+Shadow surface, 12px radius, icon in primary color circle (32px)

**Quick Actions Grid:**
- Section title: "Quick Actions" in H4
- 2x2 or 3-column grid of action buttons:
  - **Log Jump** — pencil icon, primary blue background
  - **Book Jump** — calendar-plus icon, indigo background
  - **Find DZ** — map-pin icon, teal background
  - **My Gear** — backpack icon, slate background
  - **Events** — ticket icon, amber background
  - **Weather** — cloud icon, sky background
- Each action: 80px square card, centered icon (28px) + label (12px Medium) below, rounded 12px

**Recent Activity (optional scroll):**
- "Recent" in H5
- Horizontal scroll of last 2-3 jump log cards (compact format: date, DZ name, jump type)

**BottomNavBar:** Home tab active

---

## 8. Profile Section (12 Screens)

### Profile Home — Node `11:5167`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=11-5167)

**Layout:**
- **Profile Header:**
  - Avatar (64px) left-aligned
  - Name "Alex Storm" (H2) + role badge "Fun Jumper" beside it
  - License badge: "B License" in secondary pill
  - Home DZ: "Skydive Dubai" in Body S muted
- **Progress Card** (Background+Shadow, full width):
  - Circular progress ring (right side)
  - Text: "88 jumps away from B License" in H4
  - Sub-text: "Complete 112 more jumps to reach your next milestone"
  - Small CTA: "View Requirements" ghost link
- **Stats Row:**
  - Three inline stats: Total Jumps | Freefall Hours | This Year
- **Quick Links (vertical list):**
  - My Logbook (chevron-right)
  - My Gear (chevron-right)
  - Verified Documents (chevron-right)
  - Emergency Contact (chevron-right)
  - Preferences (chevron-right)
  - Edit Profile (chevron-right)

### Edit Profile — Node `18:7329`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7329)

**Layout:**
- TopAppBar: "Edit Profile", back arrow, "Save" text button (right)
- **Photo Section:**
  - Avatar (96px) centered with camera overlay icon for upload
  - "Change Photo" ghost link below
- **Form Fields:**
  - Full Name — pre-filled "Alex Storm"
  - Email — pre-filled, read-only badge "Verified"
  - Phone — pre-filled with country code
  - Nationality — pre-filled select
  - Location — "Dubai, UAE" with map pin icon
  - Bio — textarea, pre-filled
- **Danger Zone:**
  - "Delete Account" danger ghost link at bottom

### Filter Screen — Node `12:5460`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=12-5460)

**Dimensions:** 427x1132px (extended width for filter overlay)

**Layout:**
- Bottom sheet overlay with drag handle
- **Filter Sections:**
  - Jump Type (multi-select: Solo, Tandem, AFF, Coach, Wingsuit, CRW)
  - Date Range (from/to date pickers)
  - Dropzone (search autocomplete)
  - Altitude Range (slider: 3,000 ft to 18,000 ft)
  - Discipline (checkboxes)
- **Bottom Actions:**
  - "Reset Filters" ghost button (left)
  - "Apply" primary button (right)

### My Logbook — Node `13:5878`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=13-5878)

**Layout:**
- TopAppBar: "My Logbook", filter icon (right), search icon (right)
- **Summary Bar:** "312 Total Jumps" stat, inline with year filter dropdown
- **Jump History List (vertical, scrollable):**
  - Each entry is a Background+Border card:
    - Jump number (#312), date (right-aligned, Body S muted)
    - DZ name (H5)
    - Jump type badge (pill)
    - Altitude + freefall time inline
    - Chevron-right for detail navigation
  - Chronological order, most recent first
  - Infinite scroll / load-more pattern

### Recent Activity — Node `35:8176`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=35-8176)

**Layout:**
- TopAppBar: "Recent Activity"
- **Activity Feed Timeline:**
  - Vertical timeline with dot+line connectors (left side)
  - Each entry:
    - Activity icon (24px, in colored circle)
    - Activity title (H5): "Logged Jump #312", "Updated Gear", "Booked Tandem"
    - Timestamp (Body S muted): "2 hours ago", "Yesterday at 3:45 PM"
    - Optional detail line (Body M): DZ name, gear item, etc.
  - Activities: jump logs, gear updates, bookings, document uploads, profile changes

### Jump Details — Node `35:8514`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=35-8514)

**Layout:**
- TopAppBar: "Jump #312", back arrow, share icon (right)
- **Hero Section:**
  - Jump number large (H1)
  - Date and time
  - DZ name with location icon
- **Detail Cards (vertical stack):**
  - **Flight Info:** Altitude, exit altitude, freefall time, canopy time, landing pattern
  - **Equipment Used:** Main canopy, reserve, AAD, helmet
  - **Jump Type & Discipline:** badges/pills
  - **Notes:** Freeform text area
  - **Instructor/Coach** (if applicable): avatar + name
- **Actions:** "Edit" secondary button, "Delete" danger ghost link

### My Gear Screen — Node `14:6232`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=14-6232)

**Dimensions:** 390x2371px (tall scrollable)

**Layout:**
- TopAppBar: "My Gear", plus icon (right) for adding new gear
- **Gear List (vertical cards):**
  - Each gear card (Background+Shadow):
    - Gear type icon (left, 40px)
    - Item name (H5): "Sabre 3 170", "Javelin Odyssey", "Vigil Cuatro"
    - Category label (Body S muted): "Main Canopy", "Container", "AAD"
    - Status badge: "Active" (green), "Due for Repack" (amber), "Grounded" (red)
    - Last inspection date (Body S)
    - Chevron-right
  - Categories represented: Main Canopy, Reserve, Container/Harness, AAD, Helmet, Altimeter, Jumpsuit, Audible
- **Add Gear FAB:** Floating action button (56px circle, primary, plus icon) if no top-bar plus icon

### Adding New Gear — Node `14:6427`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=14-6427)

**Layout:**
- TopAppBar: "Add Gear", back arrow, "Save" (right)
- **Form Fields:**
  - Gear Type — select dropdown (Main, Reserve, Container, AAD, Helmet, Altimeter, Jumpsuit, Audible, Other)
  - Brand / Manufacturer — text input with autocomplete (PD, Aerodyne, UPT, Sun Path, etc.)
  - Model — text input
  - Size — text/number input (varies by type)
  - Serial Number — text input
  - DOM (Date of Manufacture) — date picker
  - Last Pack Date — date picker
  - Next Repack Due — auto-calculated, displayed read-only
  - Total Jumps on Gear — number input
  - Photo Upload — image upload area (dashed border)
  - Notes — textarea

### Verified Documents — Node `15:6532`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=15-6532)

**Dimensions:** 390x2041px

**Layout:**
- TopAppBar: "Documents", plus icon (right)
- **Document Cards (vertical list):**
  - Each document card:
    - Document type icon (24px, left)
    - Document name (H5): "USPA A License", "Passport", "Medical Certificate"
    - Issuer (Body S muted): "USPA", "Government of UAE"
    - Expiry date with countdown: "Expires in 45 days" (amber) or "Valid" (green)
    - Verification status badge: Verified (green), Pending Review (amber), Expired (red), Not Uploaded (gray)
    - Chevron-right
  - Document types: License/Rating, Passport/ID, Medical Certificate, Insurance, Waiver, Custom

### Document Details — Node `16:6678`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=16-6678)

**Layout:**
- TopAppBar: document name, back arrow
- **Document Preview:**
  - Image/PDF preview area (full width, 200px height with zoom capability)
  - Document type badge
- **Detail Fields (read-only):**
  - Document Number
  - Issue Date
  - Expiry Date
  - Issuing Authority
  - Verification Status with timestamp
- **Actions:**
  - "Re-upload" secondary button
  - "Download" secondary button
  - "Delete Document" danger ghost link

### Preferences — Node `17:6846`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=17-6846)

**Layout:**
- TopAppBar: "Preferences", back arrow
- **Settings Sections (grouped):**
  - **Units:**
    - Altitude: feet / meters (toggle)
    - Temperature: F / C (toggle)
    - Wind Speed: mph / kph / knots (select)
  - **Notifications:**
    - Push Notifications (toggle)
    - Email Notifications (toggle)
    - SMS Notifications (toggle)
  - **Privacy:**
    - Profile Visibility: Public / Friends / Private (radio)
    - Show Jump Count (toggle)
    - Show Location (toggle)
  - **App:**
    - Dark Mode (toggle)
    - Language (select)
    - Data Usage: Wi-Fi only / Cellular (toggle)

### Emergency Contact — Node `17:7120`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=17-7120)

**Dimensions:** 390x1731px

**Layout:**
- TopAppBar: "Emergency Contact", back arrow, "Edit" (right)
- **Contact Card (Background+Shadow):**
  - Contact name (H3)
  - Relationship badge (pill): "Spouse", "Parent", "Sibling", "Friend"
  - Phone number with tap-to-call icon
  - Email address
  - Address (multi-line)
- **Secondary Contact** (if present): same card format
- **Medical Info Section:**
  - Blood type
  - Allergies (list)
  - Medical conditions (list)
  - Insurance provider + policy number
- **Important note banner:** "This information is shared with DZ staff during check-in for safety purposes" in amber Background+Border card

### Edit Emergency Contact — Node `17:7238`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=17-7238)

**Layout:**
- TopAppBar: "Edit Contact", back arrow, "Save" (right)
- **Form Fields:**
  - Full Name — text input
  - Relationship — select (Spouse, Parent, Sibling, Friend, Other)
  - Phone — phone input with country code
  - Email — email input
  - Address — textarea
- **Medical Section:**
  - Blood Type — select (A+, A-, B+, B-, AB+, AB-, O+, O-)
  - Allergies — text input (comma-separated tags)
  - Medical Conditions — textarea
  - Insurance Provider — text input
  - Policy Number — text input

### Push Notification Details — Node `36:8822`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-8822)

**Layout:**
- TopAppBar: "Notification", back arrow
- **Notification Content:**
  - Icon + category label (e.g., "Booking Update")
  - Title (H3)
  - Timestamp (Body S muted)
  - Full message body (Body L)
  - Related action card (if applicable): e.g., "View Booking" card link
- **Actions:** "Mark as Read" ghost button, "Delete" danger ghost link

### Notification Settings — Node `36:8924`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-8924)

**Layout:**
- TopAppBar: "Notification Settings", back arrow
- **Activity Updates (toggle group):**
  - Jump logged confirmations
  - Booking reminders
  - Weather alerts for booked DZs
  - Gear maintenance reminders
  - Document expiry warnings
  - Community mentions
  - Event updates
- **Delivery Methods (toggle group):**
  - Push Notifications
  - Email
  - SMS
  - In-App
- **Quiet Hours:**
  - Enable Quiet Hours (toggle)
  - Start Time (time picker) — default 10:00 PM
  - End Time (time picker) — default 7:00 AM
  - Except for safety alerts (toggle, default on)

---

## 9. Log New Jump (3 Variants)

### Log a New Jump Form — Node `12:5594`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=12-5594)

**Dimensions:** 390x2648px (tall scrollable form)

**Layout:**
- TopAppBar: "Log Jump", back arrow, "Save" (right)
- **Form Sections:**

  **Flight Details:**
  - Date — date picker, defaults to today
  - Dropzone — search autocomplete input
  - Aircraft — select (Cessna 182, Twin Otter, King Air, Skyvan, PAC 750XL, etc.)
  - Exit Altitude — number input with unit toggle (ft/m), preset buttons (8,000 / 10,000 / 13,000 / 15,000)
  - Deployment Altitude — number input

  **Jump Details:**
  - Jump Type — select (Solo, Tandem Passenger, Tandem Instructor, AFF Level 1-7, Coach Jump, Hop & Pop, Wingsuit, CRW, Demo)
  - Freefall Time — number input (seconds)
  - Canopy Time — number input (seconds)
  - Discipline — multi-select pills (FS, Freefly, Wingsuit, Tracking, Angle, CRW, Canopy Piloting, Speed)
  - Group Size — number input
  - Exit Type — select (Dive exit, Float, Poised, Hop & Pop, Static line)

  **Equipment Used:**
  - Main Canopy — select from "My Gear" or manual entry
  - Reserve — auto-populated from gear
  - Container — auto-populated from gear
  - AAD — auto-populated from gear, with fire/no-fire toggle
  - Helmet — select from gear
  - Audible — select from gear

  **Landing:**
  - Landing Pattern — select (Left hand, Right hand, Straight in)
  - Landing Area — select (Main, Alternate, Off-DZ)
  - Landing Quality — 5-star rating tap

  **Notes:**
  - Notes — textarea (full width, 6 rows visible)
  - Tags — tag input (e.g., "sunset", "formation", "training")

- **Bottom CTA:** Primary button "Log Jump" full width

### Variant 2 — Node `35:8677`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=35-8677)

**Differences from base form:**
- Quick-log mode with collapsed sections
- Pre-populated fields from recent booking data
- Expandable "Advanced Details" accordion for full fields
- Streamlined for post-landing rapid entry

### Variant 3 — Node `36:9067`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-9067)

**Differences from base form:**
- Instructor/coach variant with additional fields:
  - Student name (search from roster)
  - Student performance rating
  - Progression notes
  - Pass/fail for AFF levels
  - Recommendations (next level / repeat / remedial)

### Logged Jump Confirmation — Node `38:10318`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=38-10318)

**Layout:**
- Success illustration: checkmark in circle with confetti animation
- "Jump Logged!" in H1, centered
- Jump summary card:
  - Jump #313
  - DZ, date, altitude, freefall time
  - Jump type badge
- **Stats Update:** "You now have 313 total jumps"
- **Actions:**
  - "View in Logbook" primary button
  - "Log Another" secondary button
  - "Share" ghost button

---

## 10. Weather — Node `36:9574`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-9574)

**Layout (top to bottom):**

**Header:**
- TopAppBar: "Weather", location pin + DZ name ("Skydive Dubai")
- DZ selector dropdown for switching locations

**Jumpability Score:**
- Large circular gauge (120px diameter)
- Score: "92%" in Stat Number font, centered
- Ring fill: gradient green (high) to red (low)
- Label: "Jumpability Score" below
- Sub-label: "Excellent conditions" in success green text

**Current Conditions Card (Background+Shadow):**
- Temperature: large reading (e.g., "32C / 90F")
- Condition: "Clear Sky" with weather icon (sun, cloud, rain, etc.)
- Feels Like: temperature with body-feel icon

**Wind Section:**
- **Wind Vector Display:**
  - Compass rose (160px) showing wind direction
  - Arrow pointing from wind source
  - Speed overlay: "12 kts" on compass
  - Gust: "18 kts max" below
- **Wind at Altitude (collapsible):**
  - Table: Ground / 3,000ft / 6,000ft / 9,000ft / 12,000ft
  - Speed + direction for each altitude layer

**Detailed Conditions Grid (2-column):**
- **Humidity:** percentage with icon — e.g., "45%"
- **Pressure:** "1013 hPa" with barometer icon, trend arrow (rising/falling/steady)
- **Visibility:** distance in km/mi
- **Cloud Base:** altitude in feet
- **Dew Point:** temperature
- **UV Index:** number with severity label

**Hourly Forecast:**
- Horizontal scroll of hourly cards (next 12 hours):
  - Time (H5)
  - Weather icon (small)
  - Temperature
  - Wind speed + direction arrow
  - Jumpability mini-indicator (green/amber/red dot)

**BottomNavBar:** Weather tab active

---

## 11. My Gear (2 Screens)

### Gear List — Node `38:10418`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=38-10418)

**Layout:**
- TopAppBar: "My Gear", plus icon (right)
- **Gear Summary Bar:**
  - Total items count
  - Items due for service count (amber badge)
- **Equipment Inventory (vertical card list):**
  - Grouped by category with section headers:
    - **Canopies** — Main and Reserve
    - **Container** — Harness system
    - **Safety Devices** — AAD, RSL
    - **Accessories** — Helmet, Altimeter, Audible, Jumpsuit
  - Each item card:
    - Icon (category-specific, 40px)
    - Name + model (H5)
    - Brand (Body S muted)
    - Serial number (Body S, monospace)
    - Status badge
    - Jump count on item
    - Tap for full detail

### Add New Gear — Node `38:10613`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=38-10613)

**Layout:**
- Same form structure as Node `14:6427` (Adding New Gear in Profile section)
- TopAppBar: "Add Gear", back arrow, "Save"
- Full gear entry form with all fields as described in section 8

---

## 12. Drop Zone — Full Booking Flow (10 Screens)

### DZ Overview — Node `12:5739`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=12-5739)

**Dimensions:** 390x2393px

**Layout:**
- **Hero Image:** Full-width DZ photo (200px), with overlay gradient
- **DZ Name + Location:** "Skydive Dubai" (H1), "Dubai, UAE" with pin icon
- **Rating + Reviews:** 4.8 stars, "234 reviews" link
- **Operating Status Badge:** "Open Now" (green) or "Closed" (red)
- **Quick Stats Row:**
  - Aircraft: "2x Twin Otter"
  - Max Altitude: "15,000 ft"
  - Landing Area: "Grass & Peas"
- **About Section:** Description text (Body L), expandable "Read More"
- **Facilities & Amenities:**
  - Icons grid: Gear Shop, Packing Area, Restaurant, Bunkhouse, Showers, Wi-Fi, Parking, Spectator Area
- **Aircraft Fleet:**
  - Horizontal scroll cards for each aircraft with photo + name + capacity
- **Reviews Section:**
  - Top 2-3 reviews with avatar, name, rating, date, text
  - "See All Reviews" link
- **Bottom CTA:** Primary button "Book a Jump"

### DZ Details — Node `39:10722`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=39-10722)

**Layout:**
- Extended detail view of "Skydive Dubai"
- **Contact Information:**
  - Phone (tap-to-call)
  - Email (tap-to-email)
  - Website (external link)
  - Address with "Get Directions" map link
- **Operating Hours:**
  - Weekly schedule table (Mon-Sun, open/close times)
  - Holiday schedule note
- **Pricing Table:**
  - Tandem: $XXX
  - Fun Jump (per slot): $XX
  - AFF Level 1: $XXX
  - Gear Rental: $XX/day
- **Safety Record:**
  - Active ratings/certifications
  - Insurance info
- **Map Embed:**
  - Static map preview with DZ pin
  - "Open in Maps" button

### Map View — Node `40:10977`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=40-10977)

**Layout:**
- Full-screen map (fills below TopAppBar)
- TopAppBar: search input field, "Search" placeholder text "Skydive Perris"
- **Map Features:**
  - DZ pins with custom markers (parachute icon pins)
  - Cluster markers for dense areas
  - User location dot (blue pulsing)
  - Tap pin to show preview card (floating bottom card):
    - DZ name, rating, distance, "Open Now" status
    - "View Details" button
- **Controls:**
  - GPS "locate me" button (bottom-right)
  - Zoom +/- (bottom-right, stacked)
  - Filter button (top-right) to open filter overlay

### List View — Node `40:11071`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=40-11071)

**Layout:**
- TopAppBar: "Dropzones", search icon, filter icon, map toggle icon
- **Search Bar:** Text input with search icon, placeholder "Search dropzones"
- **Sort Selector:** "Nearest" / "Highest Rated" / "Most Popular" pill toggles
- **DZ List (scrollable):**
  - Each card (Background+Shadow):
    - DZ photo thumbnail (80px, left, rounded 8px)
    - DZ name (H5)
    - Location (Body S muted)
    - Rating (stars + number)
    - Distance: "12 km away"
    - Status badge: "Open Now"
    - Chevron-right
  - Infinite scroll

### Filter Options — Node `40:11234`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=40-11234)

**Layout (bottom sheet overlay):**
- Drag handle + "Filter Dropzones" title
- **Distance:** Slider (5km to 500km radius) or "Anywhere"
- **Rating:** Minimum star rating (1-5 star tap selector)
- **Facilities:** Multi-select checkboxes:
  - Gear Shop, Packing Area, Restaurant, Bunkhouse/Accommodation, Showers, Wi-Fi, Parking, AFF Training, Tandem Available, Wingsuit Friendly, Night Jumps
- **Aircraft Type:** Multi-select (Cessna, Twin Otter, King Air, Skyvan, PAC 750XL, Helicopter)
- **Max Altitude:** Minimum altitude slider (8,000 ft to 20,000 ft)
- **Actions:** "Reset" ghost + "Apply Filters" primary button

### Booking Step 1: Jump Type — Node `39:10879`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=39-10879)

**Layout:**
- TopAppBar: "Book a Jump", back arrow
- Step indicator: "Step 1 of 4"
- **DZ Context:** Small DZ card (name + photo thumbnail) at top
- **Jump Type Selection (large tappable cards):**
  - **Tandem** — tandem icon, "Tandem Skydive", description "Jump with a certified instructor", price indicator
  - **Fun Jump** — parachute icon, "Fun Jump", description "Solo jump for licensed skydivers", price indicator
  - **Coaching** — graduation-cap icon, "Coaching Session", description "1-on-1 training with a rated coach", price indicator
- Selected card: primary border + checkmark + `#F0F9FF` background
- **Bottom CTA:** Primary button "Continue"

### Booking Step 2: Equipment — Node `41:11396`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=41-11396)

**Layout:**
- TopAppBar: "Equipment", back arrow
- Step indicator: "Step 2 of 4"
- **Equipment Selection:**
  - **Own Gear** — card with personal gear icon, "I'll bring my own equipment"
    - If selected, shows gear verification checklist from "My Gear":
      - Main: Sabre 3 170 (green check)
      - Reserve: PD Optimum 160 (green check)
      - AAD: Vigil Cuatro (green check or amber "Due for service")
      - Container: Javelin Odyssey (green check)
  - **Rental** — card with rental icon, "I need rental gear"
    - If selected, shows rental options:
      - Full rig rental: $XX
      - Helmet only: $XX
      - Altimeter only: $XX
      - Jumpsuit: $XX
- **Gear Check Status:** Banner if any gear has issues (amber warning)
- **Bottom CTA:** Primary button "Continue"

### Booking Step 3: Review — Node `41:11504`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=41-11504)

**Layout:**
- TopAppBar: "Review Flight Plan", back arrow
- Step indicator: "Step 3 of 4"
- **Flight Plan Summary Card (Background+Shadow):**
  - **Dropzone:** Name + location
  - **Date & Time:** Selected slot
  - **Jump Type:** Badge (Tandem / Fun Jump / Coaching)
  - **Altitude:** e.g., "15,000 ft"
  - **Equipment:** Own Gear or Rental summary
  - **Aircraft:** Assigned aircraft name
- **Pricing Breakdown:**
  - Jump slot: $XXX
  - Gear rental (if applicable): $XX
  - Service fee: $XX
  - **Total:** $XXX (H3, bold)
- **Payment Method:**
  - Saved card display (last 4 digits, card brand icon)
  - "Change Payment Method" link
- **Waiver Notice:** "By proceeding, you confirm you have signed the DZ waiver" with link to waiver
- **Bottom CTA:** Primary button "Confirm & Pay"

### Booking Step 4: Success — Node `42:11610`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=42-11610)

**Layout:**
- **Success Animation:** Checkmark circle with animated confetti/clouds
- **Headline:** "Blue Skies, Alex!" in H1, centered
- **Sub-text:** "Your jump has been booked" in Body L
- **Booking Summary Card:**
  - Booking reference number
  - DZ name
  - Date and time
  - Jump type
- **Next Steps Checklist:**
  - "Arrive 30 minutes before your slot"
  - "Bring your gear (if own equipment)"
  - "Valid ID required for check-in"
  - "Check weather conditions before departing"
- **Actions:**
  - "View Boarding Pass" primary button
  - "Add to Calendar" secondary button
  - "Back to Home" ghost link

### Boarding Pass — Node `42:11751`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=42-11751)

**Layout:**
- Stylized boarding pass card (full width, rounded 16px, subtle shadow):
  - **Header Bar:** DZ logo + "BOARDING PASS" label, sky gradient background
  - **QR Code:** 160x160px centered, scannable for DZ check-in
  - **Flight Details Grid (2-column):**
    - Jump Type: "Fun Jump"
    - Altitude: "15,000 ft"
    - Date: formatted date
    - Time: formatted time slot
    - Aircraft: "Twin Otter"
    - Slot: "#7"
  - **Passenger:** Name + photo thumbnail
  - **Booking Ref:** alphanumeric code
  - **Tear-line decoration:** dotted line with circle cutouts (visual flourish)
- **Actions:**
  - "Save to Wallet" button (Apple Wallet / Google Wallet icons)
  - "Share" button
  - Screen brightness auto-increase hint: "Brightness increased for scanning"

---

## 13. Manifest Booking Flow (4 Screens — in Profile Section)

### Find a Dropzone — Node `18:7732`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7732)

**Layout:**
- TopAppBar: "Find a Dropzone", back arrow
- **Search Input:** "Search by name or location"
- **Nearby DZs (auto-detected):**
  - "Near You" section header
  - DZ cards (compact):
    - Skydive Dubai — 5 km, Open Now, 4.8 stars
    - Skydive Empuriabrava — 2,400 km, Open Now, 4.9 stars
    - Other results
  - Each card: photo thumb + name + distance + status + rating

### Plan Your Flight — Node `18:7836`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7836)

**Layout:**
- TopAppBar: "Plan Your Flight", back arrow
- **Selected DZ** context bar (small card)
- **Calendar Date Picker:**
  - Month/year header with left/right arrows
  - 7-column day grid
  - Available dates: normal weight, tappable
  - Unavailable dates: muted, non-tappable
  - Selected date: primary blue circle background
  - Today: outlined circle
- **Available Time Slots:**
  - After date selection, vertical list of available load slots:
    - Time (H5): "09:00 AM"
    - Available spots: "4 of 12 spots left"
    - Aircraft: "Twin Otter"
    - Altitude: "15,000 ft"
    - Tappable to select
- **Bottom CTA:** Primary button "Continue"

### Gear Selection — Node `18:7959`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7959)

**Layout:**
- TopAppBar: "Gear Selection", back arrow
- **Equipment Toggle:**
  - Two large toggle cards: "Own Gear" vs "Rental"
- **Altitude Selection:**
  - Horizontal pill selector:
    - 8,000 ft (Hop & Pop)
    - 13,000 ft (Standard)
    - 15,000 ft (Full altitude)
  - Selected: primary filled pill
  - Price difference shown below each option
- **Gear Verification** (if "Own Gear" selected):
  - Checklist of registered gear items with status indicators
- **Rental Options** (if "Rental" selected):
  - Selectable rental packages
- **Bottom CTA:** Primary button "Continue"

### Review Your Jump — Node `18:8078`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-8078)

**Layout:**
- TopAppBar: "Review", back arrow
- **Jump Summary Card:**
  - Dropzone: name with icon
  - Date: formatted
  - Time Slot: formatted
  - Jump Type: badge
  - Altitude: with icon
  - Equipment: Own Gear / Rental summary
  - Aircraft: name
- **Cost Breakdown:**
  - Line items with amounts
  - Subtotal
  - Service fee
  - **Total** (H3 bold)
- **Payment Method:**
  - Saved card preview
  - "Change" link
- **Bottom CTA:** Primary button "Confirm & Pay $XXX"

---

## 14. Events — List & Details (3 Screens)

### Event List — Node `53:6`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=53-6)

**Layout:**
- TopAppBar: "Events", search icon, filter icon
- **Category Tabs (horizontal scroll):**
  - All | Boogies | Competitions | Courses | Camps | Tunnel Sessions
  - Active tab: primary underline + bold
- **Event Cards (vertical scroll):**
  - Each card (Background+Shadow):
    - Event hero image (full width, 160px, rounded top)
    - Event type badge (overlay, top-right): "Boogie", "Competition", etc.
    - Event name (H4)
    - Date range (Body M): "Mar 15-18, 2026"
    - Location with pin icon (Body S muted)
    - Organizer name (Body S)
    - Price: "From $XXX" or "Free"
    - Spots: "12 spots left" or "Sold Out" (red badge)
    - "Register" compact button or "Waitlist" if full

### Filter Options — Node `53:157`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=53-157)

**Layout (bottom sheet):**
- **Event Type:** Multi-select (Boogie, Competition, Course, Camp, Tunnel Session)
- **Date Range:** From/To date pickers
- **Location:** Search input with radius slider
- **Price Range:** Min/Max slider
- **Experience Level:** Beginner / Intermediate / Advanced / All
- **Disciplines:** Multi-select checkboxes
- **Availability:** Show only events with open spots (toggle)
- **Actions:** "Reset" + "Apply" buttons

### Event Details — Node `53:303`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=53-303)

**Dimensions:** 390x2773px

**Layout:**
- **Hero Image:** Full-width, 240px, with gradient overlay at bottom
- **Event Name (H1)** over image or below
- **Type Badge + Date Range**
- **Organizer Card:** Avatar + name + "Organized by" label
- **Key Details Grid (2-column icons):**
  - Location (with map link)
  - Dates (start-end)
  - Max Participants
  - Experience Level Required
  - Disciplines Covered
  - Aircraft Available
- **Description:** Full event description (Body L), expandable
- **Schedule / Itinerary:**
  - Day-by-day breakdown
  - Time slots with activities
- **What's Included:**
  - Bullet list (e.g., jump slots, coaching, meals, accommodation, T-shirt)
- **What to Bring:**
  - Bullet list (gear, documents, etc.)
- **Pricing:**
  - Full registration: $XXX
  - Early bird (if applicable): $XXX with deadline
  - Day pass (if applicable): $XX
- **Venue / DZ Info:** Mini DZ card with link to DZ details
- **Reviews / Testimonials** from past events (if available)
- **Bottom CTA:** Primary button "Register Now"

---

## 15. Events — Boogie Flow (3 Steps)

### Step 1: Registration Start — Node `54:581`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=54-581)

**Layout:**
- TopAppBar: "Register", back arrow
- Step indicator: "Step 1 of 3"
- **Event Context:** Small event card (name, date, location)
- **Registration Type Selection:**
  - Full Event
  - Day Pass (select days)
  - Spectator Only
- **Participant Info:**
  - Auto-filled from profile (name, license, jump count)
  - "Edit" link if changes needed
- **Discipline Preferences:**
  - Select disciplines to participate in from event offerings
- **Bottom CTA:** Primary button "Continue"

### Step 2: Details & Add-ons — Node `54:470`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=54-470)

**Layout:**
- Step indicator: "Step 2 of 3"
- **Accommodation (if offered):**
  - On-site bunkhouse / camping / hotel partner options
  - Dates of stay
- **Meal Package:** Include meals (toggle) with dietary preferences
- **Merchandise:** Event T-shirt (size selector), other items
- **Special Requests:** Textarea
- **Group Registration:**
  - "Add team member" button to register others
  - Member cards with name + email for each added person
- **Bottom CTA:** Primary button "Continue"

### Step 3: Review & Pay — Node `54:688`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=54-688)

**Layout:**
- Step indicator: "Step 3 of 3"
- **Registration Summary Card:**
  - Event name + dates
  - Registration type
  - Participant(s) listed
  - Selected disciplines
  - Accommodation details (if any)
  - Meals (if any)
  - Merchandise (if any)
- **Pricing Breakdown:**
  - Registration fee
  - Accommodation
  - Meals
  - Merchandise
  - Service fee
  - **Total**
- **Payment Method:** Saved card or add new
- **Cancellation Policy:** Collapsible text
- **Bottom CTA:** Primary button "Confirm & Pay"

---

## 16. Events — Competition Flow (5 Steps)

### Competition Details — Node `71:851`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-851)

**Dimensions:** 390x3652px

**Layout:**
- Extended event details format with competition-specific sections:
  - **Competition Format:** Round-robin, bracket, timed, scored
  - **Rules & Judging Criteria:** Expandable text
  - **Divisions:** Open, Intermediate, Novice, etc.
  - **Prize Information:** Podium prizes, awards
  - **Past Winners** (if recurring event): Previous year results
  - **Team Size Requirements:** Solo, 2-way, 4-way, 8-way, etc.

### Step 1: Team & Division — Node `71:1028`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-1028)

- **Division Selection:** Radio cards for each division
- **Team Registration:**
  - Team name (text input)
  - Team members (add by search or email invite)
  - Alternate designation
  - Team captain selection
- **Coach/Video** slots (if applicable)

### Step 2: Requirements Verification — Node `71:1158`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-1158)

- **Eligibility Check (auto-verified):**
  - Minimum jump count: green check or red X
  - Required license level: green check or red X
  - Required ratings: green check or red X
  - Medical currency: green check or red X
  - Insurance status: green check or red X
- **Missing Requirements:** Amber banner with action links to resolve
- **Waiver:** Competition-specific waiver acknowledgment checkbox

### Step 3: Schedule Selection — Node `71:1261`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-1261)

- **Practice Slots:** Book optional practice jump times
- **Competition Schedule:** Read-only schedule of rounds
- **Arrival Date:** Date picker
- **Departure Date:** Date picker
- **Accommodation preferences** (if available)

### Step 4: Review & Pay — Node `72:1388`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=72-1388)

- Full summary with team roster, division, schedule, pricing
- Per-person or per-team pricing breakdown
- Payment method selection
- **Bottom CTA:** "Confirm Registration"

---

## 17. Events — Course Flow (5 Steps)

### Course Details — Node `72:1595`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=72-1595)

**Layout (extended details):**
- **Course Curriculum:** Module/lesson breakdown
- **Instructor Profiles:** Avatar + name + credentials for each instructor
- **Prerequisites:** Minimum experience/certification required
- **Certification Awarded:** What certification the course leads to
- **Duration:** Total hours, number of sessions
- **Class Size:** Max participants, current enrollment count

### Step 1: Enrollment — Node `75:1739`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-1739)

- **Participant Info:** Auto-filled from profile
- **Prerequisites Verification:** Auto-check against profile data
- **Session Selection:** Choose from available course dates/sessions
- **Learning Goals:** Optional textarea for what participant wants to focus on

### Step 2: Equipment & Materials — Node `75:1832`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-1832)

- **Required Equipment:** Checklist verified against "My Gear"
- **Rental Options:** For missing equipment
- **Course Materials:** Included vs. additional purchase options
- **Physical Requirements:** Health declaration toggle

### Step 3: Schedule Confirmation — Node `75:1944`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-1944)

- **Calendar View:** Course dates highlighted on calendar
- **Session Times:** List of all sessions with times
- **Conflict Check:** Warning if calendar conflicts detected
- **Accommodation** (for multi-day courses)

### Step 4: Review & Pay — Node `75:2053`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-2053)

- Course summary, instructor info, schedule, equipment plan
- Pricing with early-bird or installment options
- Payment method
- **Bottom CTA:** "Enroll & Pay"

---

## 18. Events — Camp Flow (5 Steps)

### Camp Details — Node `75:2126`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-2126)

**Dimensions:** 390x5665px (longest screen in the entire file)

**Layout (comprehensive camp information):**
- Hero image gallery (horizontal scroll, 3-4 images)
- Camp name (H1) + tagline
- Date range, location, organizer
- **Daily Schedule:** Full day-by-day itinerary with morning/afternoon/evening activities
- **Coaching Staff:** Full roster with bios, photos, specialties
- **Skill Levels:** Which levels are welcome, what each group focuses on
- **What's Included:** Detailed list (jumps, coaching, video debrief, meals, accommodation, ground school, etc.)
- **What's Not Included:** Travel, personal gear, insurance
- **Venue Details:** DZ info, facilities, directions
- **FAQ:** Expandable accordion Q&A
- **Testimonials:** Past camper reviews with ratings
- **Photo Gallery:** Grid of images from past camps

### Step 1: Registration — Node `76:2291`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2291)

- Participant info from profile
- **Skill Level Self-Assessment:**
  - Number of jumps
  - Current certifications
  - Disciplines practiced
  - Specific goals for the camp (textarea)
- **Group/Team Registration** option

### Step 2: Accommodation & Meals — Node `76:2388`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2388)

- **Accommodation Options:**
  - On-site shared room
  - On-site private room
  - Camping / tent
  - Off-site (own arrangement)
  - Hotel partner room
- **Check-in / Check-out Dates**
- **Meal Plan:**
  - Full board
  - Breakfast only
  - No meals
- **Dietary Restrictions:** Checkboxes (Vegetarian, Vegan, Gluten-free, Halal, Kosher, Nut allergy, Other)

### Step 3: Equipment & Extras — Node `76:2499`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2499)

- Gear verification from profile
- Rental options for missing gear
- **Add-ons:**
  - Extra coaching sessions
  - Video packages
  - Merchandise (camp T-shirt, stickers)
  - Airport transfer
  - Gear check / tune-up service

### Step 4: Review & Pay — Node `76:2604`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2604)

- Full camp registration summary
- Accommodation + meals + extras breakdown
- Total price with optional installment plan
- Payment method
- Cancellation/refund policy
- **Bottom CTA:** "Confirm & Pay"

---

## 19. Events — Tunnel Flow (4 Steps)

### Tunnel Session Details — Node `78:2678`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-2678)

**Dimensions:** 390x3295px

**Layout:**
- Tunnel facility hero image
- Event/session name (H1)
- **Tunnel Specifications:**
  - Diameter (ft/m)
  - Max wind speed
  - Type (recirculating / non-recirculating)
- **Session Format:**
  - Duration per person
  - Group size
  - Skill levels
  - Coaching included (yes/no)
- **Coach Profiles** (if coaching session)
- **Pricing:** Per-minute rates, package deals
- **Location & Hours**
- **What to Bring / What's Provided**

### Step 1: Session Selection — Node `78:2817`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-2817)

- **Time Slot Selection:** Calendar + available slots
- **Duration:** Select minutes (5, 10, 15, 20, 30, 60)
- **Coaching Option:** Add coach (toggle), select coach from available roster
- **Skill Level:** Self-select for matching with appropriate group

### Step 2: Participant Details — Node `78:2926`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-2926)

- Auto-filled participant info
- **Experience Declaration:**
  - Total tunnel hours
  - Skill level (first-timer, beginner, intermediate, advanced, competitor)
  - Body flight disciplines practiced
- **Health Declaration:** Confirmation toggle
- **Group Members:** Add additional flyers (name + experience level each)

### Step 3: Review & Pay — Node `78:3164`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-3164)

- Session summary (tunnel, date, time, duration, participants)
- Coaching fee (if applicable)
- Price breakdown
- Payment method
- **Bottom CTA:** "Confirm & Pay"

---

## 20. Event Creation — Organizer Screens

All creation flows follow a multi-step wizard pattern with consistent TopAppBar, step indicators, and form layouts.

### Boogie Creation (5 Steps)

**Node range:** `81:3260` through `81:3685`

**Step 1 — Node `81:3260`:** Basic Info
- Event name, tagline, description (textarea)
- Event type pre-set to "Boogie"
- Cover image upload
- Organizer info (auto-filled)

**Step 2 — Node `81:3365`:** Dates & Location
- Start date / End date (date pickers)
- Dropzone selection (search autocomplete)
- Custom venue (if not at a DZ)
- Address fields

**Step 3 — Node `81:3470`:** Program & Pricing
- Daily schedule builder (time slots + activity descriptions)
- Disciplines offered (multi-select)
- Jump slots per day (number)
- Pricing: full event, day pass, spectator
- Early bird pricing (toggle + deadline date)
- Max participants (number)

**Step 4 — Node `81:3575`:** Accommodation & Extras
- Accommodation options builder (add/remove options with prices)
- Meal packages builder
- Merchandise items builder
- Partner/sponsor logos upload

**Step 5 — Node `81:3685`:** Review & Publish
- Full event preview (as attendee would see it)
- Publish settings: Draft / Published / Scheduled
- Registration open date
- "Publish Event" primary CTA

### Competition Creation (5 Steps)

**Node range:** `102:2` through `102:428`

**Step 1 — Node `102:2`:** Basic Info
- Competition name, description, sanctioning body
- Competition discipline (4-way FS, freefly, canopy piloting, speed, wingsuit, etc.)
- Cover image upload

**Step 2 — Node `102:109`:** Divisions & Rules
- Division builder (add divisions with names + requirements)
- Team size per division
- Number of rounds
- Judging criteria (select or custom)
- Prize information (text for each placement)

**Step 3 — Node `102:214`:** Schedule & Venue
- Date range, DZ/venue selection
- Round schedule builder
- Practice day slots
- Aircraft allocation (select aircraft, capacity planning)

**Step 4 — Node `102:321`:** Registration & Pricing
- Per-team or per-person pricing
- Registration deadline
- Maximum teams per division
- Required documents checklist builder

**Step 5 — Node `102:428`:** Review & Publish
- Full competition preview
- Publish controls
- "Publish Competition" CTA

### Course Creation (4 Steps)

**Node range:** `103:528` through `104:1270`

**Step 1 — Node `103:528`:** Course Info
- Course name, description, certification offered
- Course type (AFF, coach rating, wingsuit FFC, canopy course, etc.)
- Instructor assignment (select from registered instructors)
- Prerequisites description

**Step 2 — Node `103:633`:** Curriculum & Schedule
- Module builder (add modules with title, description, duration)
- Session scheduler (date, time, duration for each session)
- Ground school vs. jump sessions split
- Total course hours calculated

**Step 3 — Node `104:1163`:** Pricing & Requirements
- Course fee
- Included jumps (number)
- Gear requirements checklist
- Minimum/maximum class size
- Cancellation policy (textarea)

**Step 4 — Node `104:1270`:** Review & Publish
- Full course listing preview
- "Publish Course" CTA

### Camp Creation (4 Steps)

**Node range:** `104:798` through `104:1163`

**Step 1 — Node `104:798`:** Camp Info
- Camp name, description, target skill levels
- Duration (number of days)
- Image gallery upload (multiple)
- Coaching staff assignment

**Step 2 — Node `104:905`:** Program & Itinerary
- Day-by-day schedule builder
- Activity types (jump, ground school, video debrief, social, etc.)
- Skill groups structure
- Jump slots per day per person

**Step 3 — Node `104:1012`:** Logistics & Pricing
- Accommodation options builder
- Meal plan options
- Pricing tiers (early bird, standard, late)
- Max campers
- Add-ons builder (extra coaching, video, merch)

**Step 4 — Node `104:1163`:** Review & Publish
- Full camp listing preview
- "Publish Camp" CTA

### Tunnel Session Creation (4 Steps)

**Node range:** `106:1761` through `106:2082`

**Step 1 — Node `106:1761`:** Session Info
- Session/event name, description
- Tunnel facility selection (search)
- Session type (open session, coaching session, competition prep, fun fly)
- Target skill levels

**Step 2 — Node `106:1868`:** Schedule & Capacity
- Date and time
- Session duration
- Time per flyer
- Max participants
- Coach assignment (if coaching session)
- Group structure (rotation schedule)

**Step 3 — Node `106:1975`:** Pricing
- Per-person fee
- Coach fee (if applicable)
- Package deals (book X minutes, get Y free)
- Group discounts

**Step 4 — Node `106:2082`:** Review & Publish
- Session listing preview
- "Publish Session" CTA

---

## 21. Shop (6 Screens)

### Shop Home — Node `117:2984`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=117-2984)

**Layout:**
- TopAppBar: "Shop", search icon, cart icon with badge count
- **Search Bar:** Full-width input, "Search gear, accessories..."
- **Category Tabs (horizontal scroll):**
  - All | AADs | Altimeters | Helmets | Jumpsuits | Canopies | Containers | Accessories
- **Featured Item Banner:**
  - Full-width card with product image
  - "Featured" badge
  - Product name: "Vigil Cuatro AAD" (H3)
  - Price: "$1,290"
  - "Shop Now" compact CTA
- **Product Grid (2-column):**
  - Product cards:
    - Image (square, 170px, rounded 8px)
    - Product name (H5, 2 lines max)
    - Brand (Body S muted)
    - Price (H5, bold)
    - Rating (small stars + count)
    - "Add to Cart" compact button

### Product Details — Node `117:2845`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=117-2845)

**Dimensions:** 390x4125px (very tall, comprehensive product page)

**Layout:**
- **Image Gallery:** Horizontal scroll of product images (full width, 300px)
- **Dot indicators** for image count
- **Product Info:**
  - Product name (H1)
  - Brand (Body L, linked to brand page)
  - Price (H2, bold)
  - Rating: stars + review count + "Write a Review" link
  - Availability: "In Stock" (green) or "Out of Stock" (red)
- **Variant Selectors:**
  - Color picker (if applicable): circular swatches
  - Size selector (if applicable): pill buttons
- **Quantity:** Stepper (minus / count / plus)
- **Add to Cart:** Primary button, full width
- **Product Description:** Expandable rich text
- **Specifications Table:**
  - Key-value rows: Weight, Material, Dimensions, Compatibility, etc.
- **Compatibility Check:**
  - "Works with your Javelin Odyssey" (auto-matched to user gear)
- **Reviews Section:**
  - Overall rating summary (bar chart by star level)
  - Individual reviews: avatar, name, date, rating, text
  - "See All Reviews" link
- **Related Products:** Horizontal scroll of product cards
- **Recently Viewed:** Horizontal scroll

### Add Item — Node `108:2454`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=108-2454)

**Layout:**
- Form for adding a new marketplace listing (seller-side)
- **Fields:**
  - Product name
  - Category (select)
  - Brand
  - Condition (New, Like New, Good, Fair)
  - Price
  - Description (textarea)
  - Photos (multi-upload, up to 8)
  - Shipping options

### Adding Item Confirmation — Node `111:2561`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=111-2561)

- Listing creation progress / confirmation flow
- Preview of how the listing will appear

### Cart — Node `118:3115`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=118-3115)

**Layout:**
- TopAppBar: "Cart", back arrow
- **Cart Items (vertical list):**
  - Each item row:
    - Product image thumbnail (64px)
    - Product name (H5)
    - Variant info (size, color) in Body S
    - Quantity stepper (inline)
    - Price (H5, right-aligned)
    - Remove ("X" icon, red) right edge
- **Cart Summary:**
  - Subtotal
  - Shipping estimate
  - Tax estimate
  - **Total** (H3 bold)
- **Promo Code:** Input field with "Apply" button
- **Bottom CTA:** Primary button "Proceed to Checkout"

### Checkout — Node `118:3218`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=118-3218)

**Layout:**
- TopAppBar: "Checkout", back arrow
- **Shipping Address:**
  - Saved address card with "Change" link
  - Or address form fields (name, street, city, state/province, zip, country)
- **Shipping Method:**
  - Radio options: Standard (5-7 days, $X), Express (2-3 days, $XX), Overnight ($XXX)
- **Payment Method:**
  - Saved card display
  - "Add new card" option
  - Apple Pay / Google Pay buttons
- **Order Summary (collapsed):**
  - Item count, subtotal, shipping, tax, total
- **Bottom CTA:** Primary button "Place Order $XXX"

### Order Confirmation — Node `118:3354`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=118-3354)

**Layout:**
- Success checkmark animation
- "Order Placed!" (H1)
- Order number
- Estimated delivery date
- **Order Summary Card:**
  - Items ordered (thumbnails + names)
  - Shipping address
  - Payment method (last 4 digits)
  - Total charged
- **Actions:**
  - "Track Order" primary button
  - "Continue Shopping" secondary button
- **Delivery Updates:** "You'll receive email and push notifications with tracking updates"

---

## 22. Jobs / Careers (5 Screens)

### Jobs Home — Node `119:3452`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=119-3452)

**Layout:**
- TopAppBar: "Jobs", search icon, filter icon
- **Search Bar:** "Search jobs, titles, companies..."
- **Category Pills (horizontal scroll):**
  - All | Instructors | Pilots | Videographers | Packers | Manifest | Management
- **Job Listings (vertical cards):**
  - Each card (Background+Shadow):
    - DZ/Company logo (40px, left)
    - Job title (H4): "Senior AFF Instructor"
    - Company name (Body M): "Skydive Dubai"
    - Location (Body S muted): "Dubai, UAE"
    - Salary range (H5, primary color): "$75k-$90k"
    - Employment type badge: "Full-time", "Seasonal", "Contract"
    - Posted date (Body S muted): "Posted 3 days ago"
    - "Apply" compact button
- **Saved Jobs Tab:** Toggle between "All Jobs" and "Saved"

### Filter Options — Node `119:3569`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=119-3569)

**Layout (bottom sheet):**
- **Job Category:** Multi-select (Instructor, Pilot, Videographer, Packer, Manifest, Rigger, Management, Safety, Ground Crew)
- **Employment Type:** Multi-select (Full-time, Part-time, Seasonal, Contract, Freelance)
- **Location:** Search input with radius
- **Remote/On-site:** Toggle (On-site, Remote, Hybrid)
- **Salary Range:** Min/Max slider
- **Experience Level:** Entry / Mid / Senior / Lead
- **Required Ratings:** Multi-select (USPA ratings, FAA ratings)
- **Posted Within:** Last 24h / 7 days / 30 days / All time
- **Actions:** "Reset" + "Apply"

### Job Details — Node `120:3845`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=120-3845)

**Dimensions:** 390x3440px

**Layout:**
- **Header:**
  - Company logo (48px)
  - Job title (H1)
  - Company name (linked)
  - Location with map pin
  - Salary range (H3, primary)
  - Employment type badge + posted date
  - "Save" (bookmark icon) + "Share" action buttons
- **Quick Facts Row:**
  - Start date
  - Contract duration (if seasonal)
  - Minimum experience
  - Required license/rating
- **Job Description:** Full rich-text description (Body L)
- **Responsibilities:** Bullet list
- **Requirements:** Bullet list with minimum/preferred
  - Minimum jumps
  - Required ratings/licenses
  - Experience years
  - Language requirements
- **Benefits & Perks:** Bullet list (jump discount, gear allowance, accommodation, health insurance, etc.)
- **About the Company:** DZ/company description with photo and link to DZ profile
- **Similar Jobs:** Horizontal scroll of compact job cards
- **Bottom CTA:** Primary button "Apply Now" (sticky)

### Apply Step 1 — Node `119:3692`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=119-3692)

**Layout:**
- TopAppBar: "Apply", back arrow
- **Job Context:** Small job card (title + company)
- **Application Form:**
  - **Personal Info** (auto-filled from profile):
    - Full Name (editable)
    - Email (editable)
    - Phone (editable)
    - Location (editable)
  - **Professional Info:**
    - Current license/rating level (auto-filled)
    - Total jumps (auto-filled)
    - Years of experience
    - Current employer (text input)
  - **Resume/CV:** File upload (PDF, DOC) or "Use SkyLara Profile" toggle
  - **Cover Letter:** Textarea (optional, 500 word limit with counter)
  - **Additional Documents:** File upload area for certificates, references
  - **Availability:**
    - Start date (date picker)
    - Available for relocation (toggle)
- **Bottom CTA:** Primary button "Submit Application"

### Application Success — Node `120:4017`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=120-4017)

**Layout:**
- Success checkmark animation
- "Application Submitted!" (H1)
- "Your application for [Job Title] at [Company] has been sent" (Body L)
- **Application Summary Card:**
  - Job title + company
  - Date submitted
  - Application reference number
- **Next Steps:**
  - "The hiring team will review your application"
  - "You'll receive updates via email and push notifications"
  - "Average response time: 3-5 business days"
- **Actions:**
  - "View My Applications" primary button
  - "Browse More Jobs" secondary button
  - "Back to Home" ghost link

---

## 23. Expert / Coaching (2 Screens)

### Experts Directory — Node `121:4114`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=121-4114)

**Layout:**
- TopAppBar: "Experts", search icon, filter icon
- **Search Bar:** "Find a coach or instructor..."
- **Category Tabs (horizontal scroll):**
  - All | AFF Instructors | Coaches | Videographers | Load Organizers | Canopy Coaches | Wingsuit Coaches
- **Expert Cards (vertical list):**
  - Each card (Background+Shadow):
    - Avatar (48px, left) with verification badge
    - Name (H4): "Chris Sky"
    - Specialty (Body M, primary): "Videographer"
    - Location (Body S muted): "Skydive DeLand, FL"
    - Rating: stars + review count
    - Key stats inline: "3,500 jumps" | "8 years" | "D License"
    - Expertise tags (pills, max 3 visible): "Tandem Video", "Freefly Camera", "Event Coverage"
    - "Book Session" compact button
  - Second example:
    - "Sarah Chen" — "Load Organizer"
    - Location: "Skydive Perris, CA"
    - Tags: "Formation", "Big-ways", "Sequentials"

### Expert Profile — Node `122:4233`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4233)

**Dimensions:** 390x2393px

**Layout:**
- **Profile Header:**
  - Cover image (full width, 140px) — sky/action photo
  - Avatar (80px) overlapping cover bottom edge, with verification badge
  - Name (H1)
  - Specialty badge (pill)
  - Location with pin icon
  - Rating: large stars + review count
- **Stats Row:**
  - Total Jumps | Years Experience | Students Coached | License Level
  - Each stat: number (H3 bold) + label (Body S muted) stacked
- **About Section:**
  - Bio text (Body L), 4-5 lines, expandable "Read More"
- **Expertise & Disciplines:**
  - Pills/tags for all specialties
- **Certifications & Ratings:**
  - List items with verified badge for each:
    - USPA D License, #XXXXX
    - AFF Instructor Rating
    - Tandem Instructor Rating
    - Coach Rating
- **Availability Calendar:**
  - Mini calendar showing available dates (highlighted in primary)
  - "Book a Session" primary CTA below calendar
- **Rate Card:**
  - Per-session rate
  - Package deals (5-session, 10-session)
  - Special rates (first-timer discount, group rate)
- **Reviews:**
  - Top reviews with avatar, name, date, rating, text
  - "See All Reviews" link
- **Photo / Video Gallery:**
  - Horizontal scroll grid of action photos
- **Bottom CTA:** Sticky "Book Session" primary button

---

## 24. Bookings — 1-on-1 Sessions (4 Steps)

### Step 1: Session Type — Node `122:4372`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4372)

**Layout:**
- TopAppBar: "Book Session", back arrow
- Step indicator: "Step 1 of 4"
- **Expert Context Card:** Small card with avatar, name, specialty
- **Session Type Selection (large tappable cards):**
  - **AFF Level Jump** — graduation cap icon, for AFF students
  - **Coach Jump** — medal icon, for skills progression
  - **Canopy Coaching** — parachute icon, canopy-specific training
  - **Video Debrief** — video icon, post-jump analysis session
  - **Ground School** — book icon, theory/classroom session
  - **Tunnel Coaching** — wind icon, indoor coaching
- Selected card: primary border, checkmark, light background
- **Bottom CTA:** "Continue"

### Step 2: Schedule — Node `122:4442`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4442)

**Layout:**
- Step indicator: "Step 2 of 4"
- **Calendar Date Picker:**
  - Month view with available dates highlighted in primary
  - Unavailable dates grayed out
  - Selected date: filled primary circle
- **Available Time Slots (after date selection):**
  - Vertical list of time blocks:
    - Time range (e.g., "9:00 AM - 10:00 AM")
    - Duration
    - Location/DZ
    - "Available" or "Last Spot" indicator
  - Selected slot: primary background, white text
- **Session Duration:**
  - If variable: select 30min / 60min / 90min / 120min
- **Location:**
  - Pre-filled from expert's base DZ
  - Or search alternate DZ if expert travels
- **Bottom CTA:** "Continue"

### Step 3: Details — Node `122:4611`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4611)

**Layout:**
- Step indicator: "Step 3 of 4"
- **Session Summary Card:**
  - Expert: avatar + name
  - Session type
  - Date + time
  - Location
  - Duration
- **Goals & Notes:**
  - "What do you want to focus on?" (textarea)
  - Pre-fill suggestions based on session type
- **Equipment Check:**
  - Gear verification from profile (if jump session)
  - Rental option if missing gear
- **Experience Level:**
  - Current stats from profile (total jumps, license)
  - Any additional context fields
- **Pricing:**
  - Session fee: $XXX
  - Jump slot (if applicable): $XX
  - Gear rental (if applicable): $XX
  - **Total:** $XXX
- **Bottom CTA:** "Continue to Payment"

### Step 4: Confirmation — Node `122:5001`

[Figma Link](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-5001)

**Layout:**
- Step indicator: "Step 4 of 4"
- **Full Booking Summary:**
  - Expert card (avatar, name, specialty)
  - Session type
  - Date, time, duration
  - Location
  - Goals summary (truncated text)
  - Equipment status
- **Payment Breakdown:**
  - Line items
  - Total
- **Payment Method:**
  - Saved card display
  - "Change" link
- **Cancellation Policy:**
  - Collapsible section with full policy text
  - Key point highlighted: "Free cancellation up to 24 hours before"
- **Terms:** Checkbox "I agree to the session terms and cancellation policy"
- **Bottom CTA:** Primary button "Confirm & Pay $XXX"
- **Post-confirmation (on success):**
  - Success checkmark
  - "Session Booked!" (H1)
  - Calendar event details
  - "Add to Calendar" button
  - Chat link: "Message [Expert Name]" for pre-session communication

---

## Appendix: Figma Node ID Quick Reference

| Section | Screen | Node ID | Figma Link |
|---------|--------|---------|------------|
| **Onboarding — Coach** | | | |
| | Step 1: Welcome | `4:9` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-9) |
| | Step 2: Personal Info | `4:94` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-94) |
| | Step 3: Progress | `4:198` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-198) |
| | Step 4: Vertical Identity | `4:303` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-303) |
| | Step 5: Professional History | `4:462` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-462) |
| | Step 6: Travel & Booking | `4:581` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-581) |
| | Step 7: Profile Summary | `4:700` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-700) |
| **Onboarding — Videographer** | | | |
| | Step 1: Welcome | `4:1213` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-1213) |
| | Step 2: Personal Info | `4:1337` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-1337) |
| | Step 3: Progress | `4:1441` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-1441) |
| | Step 4: Vertical Identity | `4:1546` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-1546) |
| | Step 5: Professional History | `4:1663` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-1663) |
| | Step 6: Travel & Booking | `4:1782` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-1782) |
| | Step 7: Profile Summary | `4:2009` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2009) |
| **Onboarding — Tunnel Flyer** | | | |
| | Step 1: Welcome | `4:2126` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2126) |
| | Step 2: Personal Info | `4:2250` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2250) |
| | Step 3: Progress | `4:2354` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2354) |
| | Step 4: Vertical Identity | `4:2459` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2459) |
| | Step 5: Professional History | `4:2576` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2576) |
| | Step 6: Travel & Booking | `4:2695` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2695) |
| | Step 7: Profile Summary | `4:2790` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2790) |
| **Onboarding — Beginner** | | | |
| | Step 1: Welcome | `4:2911` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2911) |
| | Step 2: Personal Info | `4:3035` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3035) |
| | Step 3: Progress | `4:3139` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3139) |
| | Step 4: Vertical Identity | `4:3244` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3244) |
| | Step 5: Aspirations (v1) | `4:2583` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-2583) |
| | Step 5: Aspirations (v2) | `4:3364` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3364) |
| | Step 5: Aspirations (v3) | `4:4160` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-4160) |
| | Step 6: Travel & Booking | `4:3481` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3481) |
| | Step 7: Profile Summary | `4:3586` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3586) |
| **Onboarding — Organizer** | | | |
| | Step 1: Welcome | `4:3707` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3707) |
| | Step 2: Personal Info | `4:3831` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3831) |
| | Step 3: Progress | `4:3935` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-3935) |
| | Step 4: Vertical Identity | `4:4040` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-4040) |
| | Step 5: Professional History | `4:4160` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-4160) |
| | Step 6: Travel & Booking | `4:4286` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-4286) |
| | Step 7: Profile Summary | `4:4391` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=4-4391) |
| **Sign Up & Login** | | | |
| | Splash / Landing | `7:4597` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4597) |
| | Sign In | `7:4635` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4635) |
| | Sign Up / Register | `7:4697` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4697) |
| | Reset Password | `7:4748` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=7-4748) |
| **Home** | | | |
| | Home Screen | `9:4977` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=9-4977) |
| **Profile** | | | |
| | Profile Home | `11:5167` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=11-5167) |
| | Edit Profile | `18:7329` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7329) |
| | Filter Screen | `12:5460` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=12-5460) |
| | My Logbook | `13:5878` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=13-5878) |
| | Recent Activity | `35:8176` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=35-8176) |
| | Jump Details | `35:8514` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=35-8514) |
| | My Gear | `14:6232` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=14-6232) |
| | Adding New Gear | `14:6427` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=14-6427) |
| | Verified Documents | `15:6532` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=15-6532) |
| | Document Details | `16:6678` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=16-6678) |
| | Preferences | `17:6846` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=17-6846) |
| | Emergency Contact | `17:7120` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=17-7120) |
| | Edit Contact Form | `17:7238` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=17-7238) |
| | Push Notification Details | `36:8822` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-8822) |
| | Notification Settings | `36:8924` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-8924) |
| **Log New Jump** | | | |
| | Log Jump Form | `12:5594` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=12-5594) |
| | Variant 2 | `35:8677` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=35-8677) |
| | Variant 3 | `36:9067` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-9067) |
| | Confirmation | `38:10318` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=38-10318) |
| **Weather** | | | |
| | Weather Screen | `36:9574` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=36-9574) |
| **My Gear** | | | |
| | Gear List | `38:10418` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=38-10418) |
| | Add New Gear | `38:10613` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=38-10613) |
| **Drop Zone — Booking Flow** | | | |
| | DZ Overview | `12:5739` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=12-5739) |
| | DZ Details | `39:10722` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=39-10722) |
| | Map View | `40:10977` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=40-10977) |
| | List View | `40:11071` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=40-11071) |
| | Filter Options | `40:11234` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=40-11234) |
| | Booking Step 1: Jump Type | `39:10879` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=39-10879) |
| | Booking Step 2: Equipment | `41:11396` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=41-11396) |
| | Booking Step 3: Review | `41:11504` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=41-11504) |
| | Booking Step 4: Success | `42:11610` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=42-11610) |
| | Boarding Pass | `42:11751` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=42-11751) |
| **Manifest Booking** | | | |
| | Find a Dropzone | `18:7732` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7732) |
| | Plan Your Flight | `18:7836` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7836) |
| | Gear Selection | `18:7959` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-7959) |
| | Review Your Jump | `18:8078` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=18-8078) |
| **Events — List & Details** | | | |
| | Event List | `53:6` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=53-6) |
| | Filter Options | `53:157` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=53-157) |
| | Event Details | `53:303` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=53-303) |
| **Events — Boogie** | | | |
| | Step 1: Registration | `54:581` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=54-581) |
| | Step 2: Details & Add-ons | `54:470` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=54-470) |
| | Step 3: Review & Pay | `54:688` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=54-688) |
| **Events — Competition** | | | |
| | Competition Details | `71:851` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-851) |
| | Step 1: Team & Division | `71:1028` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-1028) |
| | Step 2: Requirements | `71:1158` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-1158) |
| | Step 3: Schedule | `71:1261` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=71-1261) |
| | Step 4: Review & Pay | `72:1388` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=72-1388) |
| **Events — Course** | | | |
| | Course Details | `72:1595` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=72-1595) |
| | Step 1: Enrollment | `75:1739` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-1739) |
| | Step 2: Equipment | `75:1832` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-1832) |
| | Step 3: Schedule | `75:1944` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-1944) |
| | Step 4: Review & Pay | `75:2053` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-2053) |
| **Events — Camp** | | | |
| | Camp Details | `75:2126` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=75-2126) |
| | Step 1: Registration | `76:2291` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2291) |
| | Step 2: Accommodation | `76:2388` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2388) |
| | Step 3: Equipment & Extras | `76:2499` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2499) |
| | Step 4: Review & Pay | `76:2604` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=76-2604) |
| **Events — Tunnel** | | | |
| | Tunnel Details | `78:2678` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-2678) |
| | Step 1: Session Selection | `78:2817` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-2817) |
| | Step 2: Participant Details | `78:2926` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-2926) |
| | Step 3: Review & Pay | `78:3164` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=78-3164) |
| **Event Creation — Boogie** | | | |
| | Step 1: Basic Info | `81:3260` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=81-3260) |
| | Step 2: Dates & Location | `81:3365` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=81-3365) |
| | Step 3: Program & Pricing | `81:3470` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=81-3470) |
| | Step 4: Accommodation | `81:3575` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=81-3575) |
| | Step 5: Review & Publish | `81:3685` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=81-3685) |
| **Event Creation — Competition** | | | |
| | Step 1: Basic Info | `102:2` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=102-2) |
| | Step 2: Divisions & Rules | `102:109` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=102-109) |
| | Step 3: Schedule & Venue | `102:214` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=102-214) |
| | Step 4: Registration | `102:321` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=102-321) |
| | Step 5: Review & Publish | `102:428` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=102-428) |
| **Event Creation — Course** | | | |
| | Step 1: Course Info | `103:528` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=103-528) |
| | Step 2: Curriculum | `103:633` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=103-633) |
| | Step 3: Pricing | `104:1163` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=104-1163) |
| | Step 4: Review & Publish | `104:1270` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=104-1270) |
| **Event Creation — Camp** | | | |
| | Step 1: Camp Info | `104:798` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=104-798) |
| | Step 2: Program | `104:905` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=104-905) |
| | Step 3: Logistics | `104:1012` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=104-1012) |
| | Step 4: Review & Publish | `104:1163` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=104-1163) |
| **Event Creation — Tunnel** | | | |
| | Step 1: Session Info | `106:1761` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=106-1761) |
| | Step 2: Schedule | `106:1868` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=106-1868) |
| | Step 3: Pricing | `106:1975` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=106-1975) |
| | Step 4: Review & Publish | `106:2082` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=106-2082) |
| **Shop** | | | |
| | Shop Home | `117:2984` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=117-2984) |
| | Product Details | `117:2845` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=117-2845) |
| | Add Item | `108:2454` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=108-2454) |
| | Adding Item | `111:2561` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=111-2561) |
| | Cart | `118:3115` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=118-3115) |
| | Checkout | `118:3218` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=118-3218) |
| | Order Confirmation | `118:3354` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=118-3354) |
| **Jobs / Careers** | | | |
| | Jobs Home | `119:3452` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=119-3452) |
| | Filter Options | `119:3569` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=119-3569) |
| | Job Details | `120:3845` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=120-3845) |
| | Apply Step 1 | `119:3692` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=119-3692) |
| | Application Success | `120:4017` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=120-4017) |
| **Expert / Coaching** | | | |
| | Experts Directory | `121:4114` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=121-4114) |
| | Expert Profile | `122:4233` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4233) |
| **Bookings — 1-on-1** | | | |
| | Step 1: Session Type | `122:4372` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4372) |
| | Step 2: Schedule | `122:4442` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4442) |
| | Step 3: Details | `122:4611` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-4611) |
| | Step 4: Confirmation | `122:5001` | [Open](https://www.figma.com/design/3dZWyAhmOBS6kQmOl3btPM/SkyTripe?node-id=122-5001) |
