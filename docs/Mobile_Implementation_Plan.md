# SkyLara Mobile -- Full Implementation Plan

> From Figma Design to Production App
> Timeline: 6 phases over 12 weeks
> Priority: Safety-critical > Revenue-generating > User engagement > Polish
> Stack: Expo 52, React Native 0.76, Expo Router 4, NativeWind 4, Zustand 5, React Query 5, Socket.io

---

## Current State Audit (Updated April 2026)

### Existing Screens (62 user-facing screens built, 96% with real API integration)

| Module | Screens | Files |
|---|---|---|
| Auth | 3 | `(auth)/login.tsx`, `(auth)/register.tsx`, `(auth)/forgot-password.tsx` |
| Tabs | 6 | `(tabs)/home.tsx`, `(tabs)/logbook.tsx`, `(tabs)/chat.tsx`, `(tabs)/profile.tsx`, `(tabs)/bookings.tsx`, `(tabs)/weather.tsx` |
| Booking | 4 | `booking/index.tsx`, `booking/[id].tsx`, `booking/new.tsx`, `booking/packages.tsx` |
| Careers | 1 | `careers/index.tsx` |
| Chat | 1 | `chat/[channelId].tsx` |
| Check-in | 1 | `checkin/scan.tsx` |
| Coach | 5 | `coach/index.tsx`, `coach/assigned.tsx`, `coach/debrief.tsx`, `coach/sessions.tsx`, `coach/calendar.tsx` |
| Discover | 2 | `discover/index.tsx`, `discover/[id].tsx` |
| Events | 2 | `events/index.tsx`, `events/[id].tsx` |
| Learn | 1 | `learn/index.tsx` |
| Logbook | 2 | `logbook/[id].tsx`, `logbook/add.tsx` |
| Manager | 4 | `manager/index.tsx`, `manager/onboarding.tsx`, `manager/staff.tsx`, `manager/reports.tsx` |
| Manifest | 5 | `manifest/load-board.tsx`, `manifest/load-builder.tsx`, `manifest/load-detail.tsx`, `manifest/my-loads.tsx`, `manifest/select-load.tsx` |
| Notifications | 1 | `notifications/index.tsx` |
| Onboarding | 2 | `onboarding/welcome.tsx`, `onboarding/steps.tsx` |
| Ops | 4 | `ops/index.tsx`, `ops/aircraft-schedule.tsx`, `ops/announcements.tsx`, `ops/incidents.tsx` |
| Payments | 3 | `payments/wallet.tsx`, `payments/buy-tickets.tsx`, `payments/history.tsx` |
| Profile | 7 | `profile/edit.tsx`, `profile/gear.tsx`, `profile/gear-detail.tsx`, `profile/license.tsx`, `profile/documents.tsx`, `profile/waivers.tsx`, `profile/settings.tsx` |
| Rig | 2 | `rig/index.tsx`, `rig/[rigId].tsx` |
| Safety | 2 | `safety/emergency.tsx`, `safety/report-incident.tsx` |
| Social | 2 | `social/leaderboard.tsx`, `social/whos-going.tsx` |
| Stays | 1 | `stays/index.tsx` |
| Weather | 1 | `weather/index.tsx` |
| Layouts | 17 | `_layout.tsx` files for root, auth, tabs, booking, chat, checkin, discover, events, logbook, manifest, notifications, onboarding, payments, profile, safety, social, weather |
| **User-facing screens** | **62** | |
| **Layout files** | **17** | |
| **Root redirect** | **1** | `index.tsx` |
| **Total .tsx files** | **80** | |

#### Screens added since initial audit (25 new)

| Screen | Module | API Integration |
|---|---|---|
| `(tabs)/bookings.tsx` | Tabs | Yes -- booking list API |
| `(tabs)/weather.tsx` | Tabs | Yes -- weather API |
| `coach/index.tsx` | Coaching | Yes -- coaching API |
| `coach/assigned.tsx` | Coaching | Yes -- coaching API |
| `coach/debrief.tsx` | Coaching | Yes -- coaching API |
| `coach/sessions.tsx` | Coaching | Yes -- coaching API |
| `coach/calendar.tsx` | Coaching | Yes -- coaching API |
| `discover/index.tsx` | Discovery | Yes -- dropzone/discovery API |
| `discover/[id].tsx` | Discovery | Yes -- dropzone detail API |
| `events/index.tsx` | Events | Yes -- boogies/events API |
| `events/[id].tsx` | Events | Yes -- event detail API |
| `learn/index.tsx` | Learning | Yes -- learning/courses API |
| `manager/index.tsx` | Management | Yes -- reports API |
| `manager/onboarding.tsx` | Management | Yes -- onboarding API |
| `manager/staff.tsx` | Management | Yes -- identity API |
| `manager/reports.tsx` | Management | Yes -- report-builder API |
| `ops/index.tsx` | Operations | Yes -- manifest/ops API |
| `ops/aircraft-schedule.tsx` | Operations | Yes -- aircraft API |
| `ops/announcements.tsx` | Operations | Yes -- ops-messaging API |
| `ops/incidents.tsx` | Operations | Yes -- safety API |
| `onboarding/welcome.tsx` | Onboarding | Yes -- onboarding API |
| `onboarding/steps.tsx` | Onboarding | Yes -- onboarding API |
| `rig/[rigId].tsx` | Gear | Yes -- rig-maintenance API |
| `stays/index.tsx` | Stays | Yes -- rentals API |
| `careers/index.tsx` | Careers | Yes -- careers API |

### Existing Components (7)

- `CheckInToggle.tsx` -- toggle check-in/out at DZ
- `FormationPicker.tsx` -- select formation type
- `JumpTypePicker.tsx` -- select jump discipline
- `LoadCard.tsx` -- load summary card
- `PaymentMethodPicker.tsx` -- wallet/card/ticket selector
- `PullToRefresh.tsx` -- pull-to-refresh wrapper
- `WeatherWidget.tsx` -- compact weather display

### Existing Hooks (18)

`useBookings`, `useChat`, `useCheckin`, `useCheckinValidation`, `useGear`, `useJumperSearch`, `useLoadDetail`, `useLoads`, `useLogbook`, `useManifestValidation`, `useProfile`, `usePushNotifications`, `useRealtimeCheckins`, `useRealtimeLoad`, `useRealtimeLoads`, `useRealtimeWeather`, `useTickets`, `useTransactions`, `useWallet`, `useWeather`

### Existing Stores (4)

- `auth.ts` -- user session, login, register, logout, token refresh
- `dropzone.ts` -- DZ list, active DZ, socket channel subscriptions
- `manifest.ts` -- teams, self-manifest, load submission
- `notifications.ts` -- notification state, realtime listeners

### Existing Libraries (8)

- `api.ts` -- Axios instance with token refresh, DZ-scoped helper
- `biometric.ts` -- Face ID / fingerprint auth
- `notifications.ts` -- push notification registration
- `oauth.ts` -- Google and Apple OAuth
- `offline-queue.ts` -- offline action queue with retry
- `query.ts` -- React Query client config
- `secure-store.ts` -- Expo SecureStore wrapper
- `socket.ts` -- Socket.io connection and channel management

### Backend API Routes Available (55 route files)

Auth, aircraft, boogies, booking, branding, careers, chat, coaching, data management, feature flags, federation, gear, gift cards, help center, identity, instructors, learning, localization, logbook, manifest, manifest agent, marketing, migration, notification center, notifications, onboarding, onboarding center, ops messaging, partner onboarding, payments, payments advanced, policies, portal assistant, rentals, report builder, reports, rig maintenance, safety, shop, social, support, sync, training, uploads, verifications, waiver center, waivers, walkthroughs, weather

### Prisma Schema Models (226 models)

Full data layer exists for: users, profiles, dropzones, loads, slots, wallets, transactions, gear, rigs, maintenance, weather, logbook, bookings, boogies, careers/jobs, learning/courses, coaching, shop/products/orders, rentals/listings/bookings, social, gamification, marketing, notifications, waivers, onboarding sessions, and more.

---

## Phase 0: Foundation and Design System (Week 1) -- PARTIALLY COMPLETE (Updated April 2026)

**Status:** Navigation restructured (bookings and weather tabs added). Design token and shared component work still pending.

### Goal

Establish shared design primitives that match Figma exactly, build reusable UI components, fix navigation structure, and bring existing screens into visual alignment.

### Task 0.1: Design Tokens (1 day)

Extract all colors, typography, spacing, radii, and shadow values from Figma. Centralize in code so every screen shares a single source of truth.

**File: `apps/mobile/src/theme/tokens.ts`**
```
export const colors = {
  brand: {
    primary: '#0EA5E9',     // Sky-500 -- primary actions, tab bar active
    secondary: '#6366F1',   // Indigo-500 -- secondary actions, ticket cards
    accent: '#14B8A6',      // Teal-500 -- success states, check-in
    danger: '#EF4444',      // Red-500 -- destructive actions, grounding
    warning: '#F59E0B',     // Amber-500 -- weather holds, due-soon
    success: '#22C55E',     // Green-500 -- confirmed, OK status
    dark: '#0F172A',        // Slate-900 -- splash background
    muted: '#64748B',       // Slate-500 -- secondary text
  },
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',   // Slate-50
    tertiary: '#F1F5F9',    // Slate-100
    border: '#E2E8F0',      // Slate-200
    divider: '#F1F5F9',     // Slate-100
  },
  text: {
    primary: '#0F172A',     // Slate-900
    secondary: '#475569',   // Slate-600
    tertiary: '#94A3B8',    // Slate-400
    inverse: '#FFFFFF',
    link: '#0EA5E9',
  },
  status: {
    green: { bg: '#DCFCE7', text: '#15803D' },
    yellow: { bg: '#FEF9C3', text: '#A16207' },
    red: { bg: '#FEE2E2', text: '#B91C1C' },
    blue: { bg: '#DBEAFE', text: '#1D4ED8' },
    gray: { bg: '#F1F5F9', text: '#475569' },
  },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48,
};

export const radii = {
  sm: 6, md: 8, lg: 12, xl: 16, '2xl': 20, full: 9999,
};

export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
};
```

**File: `apps/mobile/src/theme/typography.ts`**
```
export const typography = {
  h1: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  subtitle: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  overline: { fontSize: 10, fontWeight: '700', lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
};
```

**Update: `apps/mobile/tailwind.config.js`**
- Add `fontFamily` mapping for Inter (or system font) weights
- Add `borderRadius` tokens matching `radii`
- Add `boxShadow` tokens matching `shadows`
- Verify all `colors.brand` and `colors.sky` match Figma exactly

### Task 0.2: Core UI Components (2 days)

Every component follows the pattern: NativeWind styling, Reanimated for animation, accessibility labels, loading/disabled states.

**File: `apps/mobile/src/components/ui/SLButton.tsx`**
- Variants: `primary`, `secondary`, `ghost`, `danger`, `outline`
- Sizes: `sm` (32px), `md` (40px), `lg` (48px), `xl` (56px)
- States: default, pressed (`active:opacity-80`), disabled, loading (ActivityIndicator)
- Props: `title`, `onPress`, `variant`, `size`, `disabled`, `loading`, `icon` (optional left icon), `fullWidth`
- Uses Pressable with haptic feedback on press via expo-haptics

**File: `apps/mobile/src/components/ui/SLInput.tsx`**
- Types: `text`, `email`, `password`, `phone`, `textarea`, `search`
- States: default, focused (border-sky-500), error (border-red-500), disabled
- Props: `label`, `placeholder`, `value`, `onChangeText`, `error`, `helper`, `secureTextEntry`, `leftIcon`, `rightIcon`, `multiline`
- Integrates with react-hook-form via Controller

**File: `apps/mobile/src/components/ui/SLCard.tsx`**
- Variants: `elevated` (shadow), `outlined` (border), `flat` (background only)
- Props: `variant`, `padding`, `children`, `onPress` (optional, makes it pressable)
- Supports header slot, content slot, footer slot via children composition

**File: `apps/mobile/src/components/ui/SLAvatar.tsx`**
- Sizes: `xs` (24px), `sm` (32px), `md` (40px), `lg` (56px), `xl` (72px)
- Displays image via expo-image, falls back to initials on error
- Props: `uri`, `name` (for initials), `size`, `badge` (optional status dot)

**File: `apps/mobile/src/components/ui/SLHeader.tsx`**
- TopAppBar matching Figma: left action (back arrow or menu), center title, right action(s)
- Props: `title`, `subtitle`, `leftAction`, `rightActions`, `transparent`, `bordered`
- Uses SafeAreaView for status bar inset
- Supports both stack header and modal header modes

**File: `apps/mobile/src/components/ui/SLProgressBar.tsx`**
- Determinate mode: progress 0-100 with animated fill
- Indeterminate mode: shimmer animation
- Props: `progress`, `color`, `height`, `showLabel`, `indeterminate`
- Uses Reanimated for smooth width transitions

**File: `apps/mobile/src/components/ui/SLStatusBadge.tsx`**
- Maps status strings to color/label pairs: GREEN/OK, YELLOW/CAUTION, RED/HOLD, etc.
- Props: `status`, `size`, `variant` (dot, pill, full)
- Predefined mappings for: load status, weather jumpability, gear status, booking status, job status

**File: `apps/mobile/src/components/ui/SLBottomSheet.tsx`**
- Reanimated-based bottom sheet for modals, pickers, filters
- Props: `visible`, `onClose`, `snapPoints`, `children`, `title`
- Backdrop press to dismiss, swipe down to dismiss

**File: `apps/mobile/src/components/ui/SLEmptyState.tsx`**
- Standardized empty state with icon, title, description, action button
- Props: `icon`, `title`, `description`, `actionLabel`, `onAction`

**File: `apps/mobile/src/components/ui/SLStepIndicator.tsx`**
- Horizontal step progress bar for multi-step flows
- Props: `steps` (string array of labels), `currentStep` (index), `completedSteps` (index array)
- Used by: onboarding, booking, event registration

### Task 0.3: Navigation Structure Update (1 day)

**Update: `apps/mobile/src/app/(tabs)/_layout.tsx`**
- Replace SVG icon functions with `lucide-react-native` icons (already in deps)
- Tab names: Home (`Home` icon), Weather (`Cloud` icon), Bookings (`Calendar` icon), Profile (`User` icon)
- Weather tab replaces Chat tab (chat moves to stack navigation via home action)
- Add notification bell badge count to header area

**Update: `apps/mobile/src/app/_layout.tsx`**
- Register stack screens for all new route groups: `onboarding`, `dropzones`, `events`, `shop`, `experts`, `stays`
- Add deep link configuration for all routes

### Task 0.4: Align Existing Screens to Figma (2 days)

**Update: `apps/mobile/src/app/(auth)/login.tsx`**
- Replace emoji icons with proper SVG/lucide icons for Google and Apple
- Apply SLButton, SLInput components
- Match exact spacing, padding, font sizes from Figma

**Update: `apps/mobile/src/app/(auth)/register.tsx`**
- Apply SLButton, SLInput components
- Add password strength indicator

**Update: `apps/mobile/src/app/(auth)/forgot-password.tsx`**
- Apply SLButton, SLInput components

**Update: `apps/mobile/src/app/(tabs)/home.tsx`**
- Replace emoji icons in ActionTile with lucide-react-native icons
- Apply SLCard to balance/ticket cards
- Apply SLHeader component
- Replace DZ picker Modal with SLBottomSheet

**Update: `apps/mobile/src/app/(tabs)/profile.tsx`**
- Apply SLAvatar, SLCard, SLHeader components
- Match Figma profile layout

**Update: `apps/mobile/src/app/weather/index.tsx`**
- Apply design tokens, standardize spacing

**Update: `apps/mobile/src/app/(tabs)/logbook.tsx`**
- Apply SLCard for entries, SLEmptyState for empty list

**Update: `apps/mobile/src/app/(tabs)/chat.tsx`**
- Apply SLHeader, SLAvatar for chat list

#### Phase 0 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/theme/tokens.ts` | Color, spacing, shadow, radius constants |
| Create | `src/theme/typography.ts` | Font size, weight, line height presets |
| Create | `src/components/ui/SLButton.tsx` | Primary button component |
| Create | `src/components/ui/SLInput.tsx` | Text input component |
| Create | `src/components/ui/SLCard.tsx` | Card container component |
| Create | `src/components/ui/SLAvatar.tsx` | Avatar with initials fallback |
| Create | `src/components/ui/SLHeader.tsx` | Top app bar component |
| Create | `src/components/ui/SLProgressBar.tsx` | Progress bar component |
| Create | `src/components/ui/SLStatusBadge.tsx` | Status badge component |
| Create | `src/components/ui/SLBottomSheet.tsx` | Bottom sheet modal |
| Create | `src/components/ui/SLEmptyState.tsx` | Empty state placeholder |
| Create | `src/components/ui/SLStepIndicator.tsx` | Multi-step progress |
| Create | `src/components/ui/index.ts` | Barrel export for all UI components |
| Update | `tailwind.config.js` | Add font, radius, shadow tokens |
| Update | `src/app/(tabs)/_layout.tsx` | Lucide icons, rename tabs |
| Update | `src/app/_layout.tsx` | Register new route groups |
| Update | `src/app/(auth)/login.tsx` | Apply design system |
| Update | `src/app/(auth)/register.tsx` | Apply design system |
| Update | `src/app/(auth)/forgot-password.tsx` | Apply design system |
| Update | `src/app/(tabs)/home.tsx` | Apply design system |
| Update | `src/app/(tabs)/profile.tsx` | Apply design system |
| Update | `src/app/(tabs)/logbook.tsx` | Apply design system |
| Update | `src/app/(tabs)/chat.tsx` | Apply design system |
| Update | `src/app/weather/index.tsx` | Apply design system |

**API endpoints needed: None (design-only phase)**

---

## Phase 1: Onboarding and Auth Enhancement (Week 2-3) -- PARTIALLY COMPLETE (Updated April 2026)

**Status:** Basic onboarding flow built with `onboarding/welcome.tsx` and `onboarding/steps.tsx`. These provide a generic multi-step onboarding experience. The full 5-persona wizard with 7 persona-specific steps each (35 Figma screens) is still pending. Auth screens (login, register, forgot-password) are complete and functional with real API integration.

### Goal

Build the complete multi-persona onboarding flow. The existing backend already has `OnboardingSession` model and `/onboarding` routes supporting 7-step flows with role-based configurations for TANDEM_STUDENT, AFF_STUDENT, LICENSED_JUMPER, INSTRUCTOR, COACH, ORGANIZER, VIDEOGRAPHER, and TUNNEL_FLYER.

### Screens to Build (19 new screens -- 2 now built, 17 remaining)

#### 1.1: Splash / Landing Screen

**File: `apps/mobile/src/app/(auth)/index.tsx`** (new splash, current index.tsx redirects)
- Full-screen dark background (#0F172A) with SkyLara logo
- Tagline: "Skydiving. Simplified."
- Two CTAs: "Get Started" (primary) and "I Already Have an Account" (ghost)
- "Get Started" navigates to persona selection
- "I Already Have an Account" navigates to login

#### 1.2: Persona Selection

**File: `apps/mobile/src/app/onboarding/index.tsx`**
- Header: "How do you jump?"
- Grid of persona cards, each with icon, title, short description:
  - Fun Jumper (licensed skydivers making recreational jumps)
  - First Timer (tandem or AFF student, never jumped before)
  - Coach / Instructor (licensed coaches and AFF instructors)
  - Videographer (freefall camera professionals)
  - Tunnel Flyer (indoor wind tunnel athletes)
  - Organizer (event organizers, boogie hosts, load organizers)
- Each card maps to an `OnboardingRole` enum value
- Tapping a card starts a new onboarding session via API and navigates to step 1

#### 1.3: Onboarding Step Screens (7 steps, reusable)

**File: `apps/mobile/src/app/onboarding/[step].tsx`** -- Dynamic route, renders per-step component

Each step reads the current step index from the route param and the persona from the onboarding store. A shared wrapper provides the step indicator, back/next buttons, and progress persistence.

**Step 1 -- Welcome**
**File: `apps/mobile/src/components/onboarding/StepWelcome.tsx`**
- Persona-specific welcome message and illustration
- Brief overview of what the onboarding covers
- "Let's Go" CTA

**Step 2 -- Personal Info**
**File: `apps/mobile/src/components/onboarding/StepPersonalInfo.tsx`**
- Fields: first name, last name, date of birth, phone number, weight (for CG), nationality
- For First Timer: also height
- Validation: all required fields must be filled
- Auto-save on field blur via PATCH to session

**Step 3 -- Emergency Contact**
**File: `apps/mobile/src/components/onboarding/StepEmergencyContact.tsx`**
- Fields: emergency contact name, phone, relationship
- Required for all personas (safety-critical data)

**Step 4 -- Vertical Identity (varies by persona)**
**File: `apps/mobile/src/components/onboarding/StepIdentity.tsx`**
- Fun Jumper: license level (A/B/C/D), USPA member ID, home DZ, total jumps, disciplines (multi-select: belly, freefly, CRW, wingsuit, swooping, tracking, angle)
- First Timer: motivation (bucket list, gift, getting licensed), how they heard about skydiving
- Coach/Instructor: license level, ratings held, certifications, total jumps, AFF ratings, tandem ratings
- Videographer: equipment list, camera types, editing capability, total camera jumps
- Tunnel Flyer: tunnel hours, certification level, preferred facility, disciplines
- Organizer: organization name, role, DZs managed, event types organized

**Step 5 -- Experience and History**
**File: `apps/mobile/src/components/onboarding/StepExperience.tsx`**
- Fun Jumper: years in sport, DZs visited (autocomplete), achievements, wingload
- First Timer: skipped or simplified (any previous sports experience)
- Coach/Instructor: years coaching, specializations, DZs worked at, student count
- Videographer: years of freefall camera, portfolio URL, DZs worked at
- Tunnel Flyer: years flying, competitions entered, coaching experience
- Organizer: events organized, biggest event size, preferred event types

**Step 6 -- Travel and Booking Preferences**
**File: `apps/mobile/src/components/onboarding/StepTravel.tsx`**
- Preferred jump frequency (daily, weekly, monthly, few times a year)
- Travel willingness radius
- Accommodation preferences (on-DZ bunkhouse, nearby hotel, camping, day trip)
- Notification preferences (weather alerts, load availability, event announcements)
- Currency preference

**Step 7 -- Profile Summary and Completion**
**File: `apps/mobile/src/components/onboarding/StepSummary.tsx`**
- Read-only summary of all entered data grouped by section
- Avatar upload option (expo-image-picker)
- Edit links that jump back to specific steps
- Terms of service checkbox
- "Complete Profile" CTA that submits the session
- On success: navigates to `/(tabs)/home` with welcome toast

#### 1.4: Stores and Hooks

**File: `apps/mobile/src/stores/onboarding.ts`**
- State: `sessionId`, `persona`, `currentStep`, `totalSteps`, `stepData` (Record of step -> field values), `isSubmitting`
- Actions: `startSession(persona)`, `saveStep(step, data)`, `nextStep()`, `prevStep()`, `completeSession()`, `reset()`
- Persists partial progress to AsyncStorage for resume on app reopen

**File: `apps/mobile/src/hooks/useOnboarding.ts`**
- Wraps onboarding store with React Query mutations for API sync
- `useStartOnboarding()` -- POST to create session
- `useSaveStep()` -- PATCH to save step data
- `useCompleteOnboarding()` -- POST to finalize

#### Phase 1 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/app/onboarding/_layout.tsx` | Stack layout for onboarding flow |
| Create | `src/app/onboarding/index.tsx` | Persona selection screen |
| Create | `src/app/onboarding/[step].tsx` | Dynamic step renderer |
| Create | `src/components/onboarding/StepWelcome.tsx` | Welcome screen per persona |
| Create | `src/components/onboarding/StepPersonalInfo.tsx` | Name, DOB, weight, phone |
| Create | `src/components/onboarding/StepEmergencyContact.tsx` | Emergency contact info |
| Create | `src/components/onboarding/StepIdentity.tsx` | Persona-specific identity |
| Create | `src/components/onboarding/StepExperience.tsx` | History and experience |
| Create | `src/components/onboarding/StepTravel.tsx` | Travel and booking prefs |
| Create | `src/components/onboarding/StepSummary.tsx` | Profile summary and submit |
| Create | `src/stores/onboarding.ts` | Onboarding state management |
| Create | `src/hooks/useOnboarding.ts` | Onboarding API mutations |
| Update | `src/app/(auth)/index.tsx` | Redirect logic to include onboarding check |
| Create | `src/app/(auth)/splash.tsx` | New splash/landing screen |
| Update | `src/app/_layout.tsx` | Register onboarding stack |
| Update | `src/stores/auth.ts` | Add onboardingComplete flag to user state |

#### API Endpoints Used

All endpoints already exist in `apps/api/src/routes/onboarding.ts`:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/onboarding/sessions` | Create new onboarding session |
| GET | `/api/onboarding/sessions/:id` | Get session with current progress |
| PATCH | `/api/onboarding/sessions/:id/steps/:step` | Save step data |
| POST | `/api/onboarding/sessions/:id/complete` | Finalize onboarding |
| GET | `/api/onboarding/flows` | Get available persona flow configs |

---

## Phase 2: Dropzone Discovery and Jump Booking (Week 4-5) -- PARTIALLY COMPLETE (Updated April 2026)

**Status:** Discovery hub built (`discover/index.tsx`, `discover/[id].tsx`) providing DZ browsing and detail views with real API integration. Booking flow exists (4 screens). DZ map view, equipment selection, boarding pass, and reschedule screens still pending.

### Goal

Build complete DZ discovery with map and list views, filtering, DZ detail pages, and enhance the existing booking flow with equipment selection and boarding pass generation.

### Screens to Build (15 new screens -- 2 now built as discover/, 13 remaining)

#### 2.1: DZ Discovery -- Map View

**File: `apps/mobile/src/app/dropzones/index.tsx`**
- Full-screen map (react-native-maps) centered on user location
- DZ pins with jumpability color coding (green/yellow/red based on weather)
- Bottom sheet with DZ list preview (scrollable, showing nearest first)
- Search bar at top for DZ name/location search
- Toggle between map and list view via segmented control

#### 2.2: DZ Discovery -- List View

**File: `apps/mobile/src/app/dropzones/list.tsx`**
- Scrollable list of DZs sorted by distance from user
- Each card: DZ name, location, distance, jumpability badge, aircraft count, open slots today, rating
- Pull-to-refresh
- Filter button in header opens filter sheet

#### 2.3: DZ Filters

**File: `apps/mobile/src/components/dropzones/DZFilterSheet.tsx`**
- Bottom sheet with filter options:
  - Distance range slider (10km to 500km)
  - Aircraft types (multi-select checkboxes)
  - Jump types offered (tandem, AFF, fun jump, wingsuit)
  - Open now toggle
  - Minimum rating slider
  - Has accommodation toggle
- Apply/Reset buttons

#### 2.4: DZ Detail Page

**File: `apps/mobile/src/app/dropzones/[id].tsx`**
- Hero image or map thumbnail
- DZ name, location, timezone, ICAO code
- Current weather widget with jumpability status
- Today's schedule: loads filling, next load time
- Services offered: tandem, AFF, coaching, wingsuit, tunnel partnership
- Aircraft fleet list (type, registration, max slots)
- Pricing table (per jump type)
- Amenities (wifi, packing area, restaurant, bunkhouse, camping)
- Reviews and ratings section
- Action buttons: "Book a Jump", "Check In", "Get Directions"

#### 2.5: DZ Staff Directory

**File: `apps/mobile/src/app/dropzones/[id]/staff.tsx`**
- List of DZ staff: DZO, S&TA, manifest, instructors, riggers, pilots
- Each entry: avatar, name, role, certifications, availability status
- Tap to view profile or start chat

#### 2.6: Enhanced Booking -- Jump Type Selection

**Update: `apps/mobile/src/app/booking/new.tsx`**
- Refactor to use SLStepIndicator and SLCard components
- Add gear rental option for tandem and AFF
- Show DZ-specific pricing from API instead of hardcoded ranges
- Improve jump type cards with real availability counts

#### 2.7: Booking -- Equipment Selection

**File: `apps/mobile/src/app/booking/equipment.tsx`**
- For Fun Jumpers: select own rig from gear list or rent
- For Tandems: auto-assigned, show what's included
- For AFF: show required equipment, option to rent
- Rig compatibility check against jump type and wingloading
- AAD requirement validation

#### 2.8: Booking -- Review and Confirm

**Update: `apps/mobile/src/app/booking/new.tsx`** (review step)
- Enhanced summary with DZ-specific pricing
- Waiver status check (redirect to sign if needed)
- Payment method selection from wallet, card, or ticket
- Cancel policy display
- Real price from API, not hardcoded $200

#### 2.9: Booking -- Success / Boarding Pass

**File: `apps/mobile/src/app/booking/success.tsx`**
- Animated success state (Reanimated checkmark)
- Booking reference number
- Date, time, DZ, jump type summary
- "View Boarding Pass" CTA

**File: `apps/mobile/src/app/booking/boarding-pass.tsx`**
- QR code generated from booking UUID (using a QR library)
- Jumper name, DZ name, date, time, jump type, load assignment (if assigned)
- "Add to Wallet" for Apple Wallet / Google Pay pass
- Share button
- Works offline (QR stored locally after first generation)

#### 2.10: Booking -- Reschedule

**File: `apps/mobile/src/app/booking/reschedule.tsx`**
- Calendar view for new date selection
- Time slot availability for selected date
- Confirmation step showing old vs new date
- Cancellation fee display if applicable

#### 2.11: DZ Check-In Enhancement

**Update: `apps/mobile/src/app/checkin/scan.tsx`**
- Add manual check-in option (enter DZ code)
- Add geofencing validation (must be within DZ radius)
- Show waiver status and gear check status before confirming
- Post-check-in: show today's weather, next available load, wallet balance

#### Phase 2 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/app/dropzones/_layout.tsx` | DZ discovery stack layout |
| Create | `src/app/dropzones/index.tsx` | Map view with DZ pins |
| Create | `src/app/dropzones/list.tsx` | List view of DZs |
| Create | `src/app/dropzones/[id].tsx` | DZ detail page |
| Create | `src/app/dropzones/[id]/staff.tsx` | DZ staff directory |
| Create | `src/components/dropzones/DZFilterSheet.tsx` | Filter bottom sheet |
| Create | `src/components/dropzones/DZCard.tsx` | DZ list card component |
| Create | `src/components/dropzones/DZMapPin.tsx` | Map marker component |
| Create | `src/app/booking/equipment.tsx` | Equipment selection step |
| Create | `src/app/booking/success.tsx` | Booking success screen |
| Create | `src/app/booking/boarding-pass.tsx` | QR boarding pass |
| Create | `src/app/booking/reschedule.tsx` | Booking reschedule flow |
| Create | `src/hooks/useDropzones.ts` | DZ search and detail queries |
| Create | `src/hooks/useGeoLocation.ts` | Expo Location wrapper |
| Create | `src/stores/booking.ts` | Multi-step booking state |
| Update | `src/app/booking/new.tsx` | Design system, real pricing |
| Update | `src/app/booking/_layout.tsx` | Add new booking routes |
| Update | `src/app/checkin/scan.tsx` | Geofencing, manual check-in |
| Update | `src/app/_layout.tsx` | Register dropzones stack |

#### API Endpoints Used

| Method | Endpoint | Purpose | Exists? |
|---|---|---|---|
| GET | `/api/dropzones` | List all DZs with optional geo/filter params | Yes |
| GET | `/api/dropzones/:id` | DZ detail with weather, aircraft, pricing | Yes |
| GET | `/api/dropzones/:id/staff` | Staff directory | Yes |
| GET | `/api/dz/:id/bookings/available-slots?date=` | Available time slots | Yes |
| POST | `/api/dz/:id/bookings` | Create booking | Yes |
| PATCH | `/api/dz/:id/bookings/:id/reschedule` | Reschedule booking | Yes |
| GET | `/api/dz/:id/bookings/:id/boarding-pass` | QR code data for pass | New |
| GET | `/api/dz/:id/gear/rentals` | Available rental gear | Yes |
| POST | `/api/dz/:id/checkin` | Self check-in with geo validation | Yes |

**New endpoint needed:** `GET /api/dz/:id/bookings/:id/boarding-pass` -- Returns booking QR payload with jumper name, DZ, date, load assignment. Add to `apps/api/src/routes/booking.ts`.

#### Dependencies to Add

```
npx expo install react-native-maps expo-location react-native-qrcode-svg
```

---

## Phase 3: Events System -- All Types (Week 6-8) -- PARTIALLY COMPLETE (Updated April 2026)

**Status:** Event discovery hub built (`events/index.tsx`, `events/[id].tsx`) with event listing and detail views using real API integration. Coach dashboard built (`coach/index`, `coach/assigned`, `coach/debrief`, `coach/sessions`, `coach/calendar`) providing 5 coaching management screens. Learning hub started (`learn/index.tsx`). All event registration, payment, and type-specific sub-flows (boogie, competition, course, camp, tunnel) still pending.

### Goal

Build the complete events system supporting 5 event types: Boogies, Competitions, Courses/Camps, Tunnel Sessions, and Coaching Clinics. This is the largest phase. The backend already has full Boogie routes (`apps/api/src/routes/boogies.ts`), Learning routes (`apps/api/src/routes/learning.ts`), and Coaching routes (`apps/api/src/routes/coaching.ts`).

### 3A: Event Discovery (4 screens)

#### Event Hub -- Main Screen

**File: `apps/mobile/src/app/events/index.tsx`**
- Tabbed view: Upcoming, Nearby, My Events
- Each tab shows FlatList of event cards
- Horizontal category filter chips: All, Boogie, Competition, Course, Camp, Tunnel, Clinic
- Search bar for event name, location, discipline
- Floating action button for organizers to create event

#### Event Card Component

**File: `apps/mobile/src/components/events/EventCard.tsx`**
- Hero image/placeholder with event type badge overlay
- Event title, DZ/location, dates, discipline
- Spots remaining indicator (progress bar)
- Price range display
- Registration status badge (Open, Waitlist, Closed, Registered)

#### Event Filters

**File: `apps/mobile/src/components/events/EventFilterSheet.tsx`**
- Bottom sheet with:
  - Event type multi-select
  - Date range picker (start/end)
  - Discipline filter (belly, freefly, CRW, wingsuit, canopy, formation)
  - Distance range
  - Price range
  - License requirement filter (A/B/C/D/none)

#### Event Search Results

**File: `apps/mobile/src/app/events/search.tsx`**
- Full search screen with results
- Recent searches
- Suggested events based on user's disciplines

### 3B: Boogie Registration (6 screens)

#### Boogie Detail

**File: `apps/mobile/src/app/events/boogie/[id].tsx`**
- Hero image with gradient overlay
- Title, subtitle, organizer, DZ name
- Date range with day count
- Description (expandable)
- Schedule tab: day-by-day breakdown (BoogieCalendarBlock data)
- Packages tab: available boogie packages with pricing
- Groups tab: formation groups accepting members
- Info tab: requirements (license, jumps, AAD, rig), cancellation policy, terms
- Spots: X/Y remaining with progress bar
- Action: "Register Now" or "Join Waitlist"

#### Boogie Registration Step 1 -- Package Selection

**File: `apps/mobile/src/app/events/boogie/[id]/register.tsx`**
- List of BoogiePackage options (name, description, jump count, price, included items)
- Group discount indicator if applicable
- "No package" option for day passes
- Continue button

#### Boogie Registration Step 2 -- Eligibility Check

**File: `apps/mobile/src/app/events/boogie/[id]/eligibility.tsx`**
- Automated checks against user's profile:
  - License level meets minimum
  - Jump count meets minimum
  - AAD requirement met (check gear items)
  - Rig requirement met
  - Waiver signed for this DZ
  - Medical declaration current
- Green checkmarks for met, red X for failed
- "Fix" links for failed checks (navigate to profile/gear/waivers)
- Cannot proceed until all required checks pass

#### Boogie Registration Step 3 -- Payment

**File: `apps/mobile/src/app/events/boogie/[id]/payment.tsx`**
- Order summary: package selected, add-ons, total
- Payment method: wallet, card, deposit-only (if configured)
- Deposit amount if deposit-only
- Promo code input
- Terms acceptance checkbox
- "Confirm Registration" CTA

#### Boogie Registration Step 4 -- Confirmation

**File: `apps/mobile/src/app/events/boogie/[id]/confirmation.tsx`**
- Success animation
- Registration reference number
- Event summary: dates, DZ, package
- Calendar "Add to Calendar" action
- "View My Schedule" navigation to event schedule
- "Invite Friends" share action

#### Boogie Schedule View (Registered Attendee)

**File: `apps/mobile/src/app/events/boogie/[id]/schedule.tsx`**
- Day-by-day scrollable timeline
- Session blocks: morning sessions, afternoon sessions, evening activities
- Group assignments with member list
- Announcements feed (BoogieAnnouncement data)
- Weather forecast for each day

### 3C: Competition Registration (5 screens)

#### Competition Detail

**File: `apps/mobile/src/app/events/competition/[id].tsx`**
- Similar to boogie detail but with:
  - Discipline and category (4-way, 8-way, artistic, canopy piloting)
  - Team vs individual indicator
  - Rules and scoring criteria
  - Prize information
  - Judging panel
  - Practice round schedule

#### Competition Registration -- Team Formation

**File: `apps/mobile/src/app/events/competition/[id]/register.tsx`**
- For team events: create team or join existing team
- Team name, team members (invite by search or share link)
- For individual: solo registration
- Category/division selection
- Alternate designation

#### Competition Registration -- Eligibility

**File: `apps/mobile/src/app/events/competition/[id]/eligibility.tsx`**
- Same pattern as boogie eligibility plus:
  - Competition-specific requirements (competition license, minimum team jumps together)
  - Insurance verification

#### Competition Registration -- Payment

**File: `apps/mobile/src/app/events/competition/[id]/payment.tsx`**
- Entry fee per team or per individual
- Slot fee if load organizer charges
- Add-ons: video, coaching debrief, practice slots
- Payment split option for teams

#### Competition Confirmation

**File: `apps/mobile/src/app/events/competition/[id]/confirmation.tsx`**
- Team roster display
- Draw order / scheduling when available
- Rules acknowledgment

### 3D: Course Enrollment (5 screens)

#### Course Detail

**File: `apps/mobile/src/app/events/course/[id].tsx`**
- Course title, instructor(s), level, duration
- Module list with completion status (for enrolled users)
- Prerequisites
- Outcomes and certification earned
- Reviews/ratings from past students
- Price and enrollment options (one-time, subscription)

#### Course Enrollment

**File: `apps/mobile/src/app/events/course/[id]/enroll.tsx`**
- Enrollment type selection (one-time purchase, subscription plan)
- Prerequisites verification
- Payment step
- Confirmation with course access instructions

#### Course Module Viewer

**File: `apps/mobile/src/app/events/course/[id]/module/[moduleId].tsx`**
- Lesson content: video player, document viewer, checklist
- Progress tracking (mark lesson complete)
- Quiz inline if lesson has quiz
- Next/previous lesson navigation

#### Course Quiz

**File: `apps/mobile/src/app/events/course/[id]/quiz/[quizId].tsx`**
- Multiple choice, true/false, matching question types
- Timer if timed quiz
- Submit and immediate score display
- Pass/fail with retry option
- Certificate generation on course completion

#### Course Certificate

**File: `apps/mobile/src/app/events/course/[id]/certificate.tsx`**
- Digital certificate display
- Download as PDF
- Share to profile
- Verification QR code

### 3E: Camp Registration (4 screens)

#### Camp Detail

**File: `apps/mobile/src/app/events/camp/[id].tsx`**
- Multi-day intensive training event
- Daily schedule with load slots
- Coach/instructor roster
- Accommodation options (linked to Stays)
- Skill level requirements
- Max participants per skill group

#### Camp Registration

**File: `apps/mobile/src/app/events/camp/[id]/register.tsx`**
- Skill group selection
- Accommodation preference (on-DZ, off-DZ, none)
- Meal plan option
- Equipment rental needs
- Payment with deposit option

#### Camp Eligibility

**File: `apps/mobile/src/app/events/camp/[id]/eligibility.tsx`**
- Standard eligibility checks
- Skill-group-specific requirements

#### Camp Confirmation

**File: `apps/mobile/src/app/events/camp/[id]/confirmation.tsx`**
- Registration details, accommodation confirmation
- Packing list / what to bring
- Travel directions to DZ

### 3F: Tunnel Session Booking (4 screens)

#### Tunnel Facility Detail

**File: `apps/mobile/src/app/events/tunnel/[id].tsx`**
- Facility info: name, location, tunnel specs (diameter, height, max wind speed)
- Available session types: open session, coached session, competition prep
- Pricing per minute/session
- Instructor availability
- Photo gallery

#### Tunnel Session Booking

**File: `apps/mobile/src/app/events/tunnel/[id]/book.tsx`**
- Date and time slot selection
- Session duration (2min, 5min, 10min, 15min, 30min, 60min)
- Solo or group booking
- Coach selection (optional)
- Skill level for group matching

#### Tunnel Payment

**File: `apps/mobile/src/app/events/tunnel/[id]/payment.tsx`**
- Session summary with duration and price
- Coach fee if applicable
- Gear rental (suit, helmet)
- Payment method selection

#### Tunnel Confirmation

**File: `apps/mobile/src/app/events/tunnel/[id]/confirmation.tsx`**
- Session details, facility address
- What to wear/bring
- Waiver requirement for first-timers
- Calendar add

### 3G: Event Creation -- Organizer Flow (6 screens)

#### Create Event -- Type Selection

**File: `apps/mobile/src/app/events/create/index.tsx`**
- Select event type: Boogie, Competition, Course, Camp, Clinic
- Role check: only users with organizer/admin roles can access

#### Create Event -- Basic Info

**File: `apps/mobile/src/app/events/create/basic.tsx`**
- Event title, subtitle, description
- DZ selection (from user's DZs)
- Date range picker
- Discipline selection
- Hero image upload

#### Create Event -- Configuration

**File: `apps/mobile/src/app/events/create/config.tsx`**
- Max participants
- Pricing tiers / packages
- Registration mode (auto-approve, manual review)
- Waitlist enable/disable
- Deposit requirement

#### Create Event -- Requirements

**File: `apps/mobile/src/app/events/create/requirements.tsx`**
- Minimum license level
- Minimum jump count
- AAD required toggle
- Own rig required toggle
- Custom requirements text
- Cancellation policy

#### Create Event -- Review

**File: `apps/mobile/src/app/events/create/review.tsx`**
- Full event preview as attendees will see it
- Publish / Save as Draft buttons

#### My Events Management

**File: `apps/mobile/src/app/events/manage/index.tsx`**
- List of organizer's events
- Status filters: Draft, Published, In Progress, Completed
- Quick stats: registrations, revenue, capacity
- Edit and manage actions

#### Phase 3 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/app/events/_layout.tsx` | Events stack layout |
| Create | `src/app/events/index.tsx` | Event hub with tabs and filters |
| Create | `src/app/events/search.tsx` | Event search screen |
| Create | `src/components/events/EventCard.tsx` | Event list card |
| Create | `src/components/events/EventFilterSheet.tsx` | Filter bottom sheet |
| Create | `src/app/events/boogie/[id].tsx` | Boogie detail page |
| Create | `src/app/events/boogie/[id]/register.tsx` | Boogie package selection |
| Create | `src/app/events/boogie/[id]/eligibility.tsx` | Eligibility verification |
| Create | `src/app/events/boogie/[id]/payment.tsx` | Boogie payment |
| Create | `src/app/events/boogie/[id]/confirmation.tsx` | Registration confirmation |
| Create | `src/app/events/boogie/[id]/schedule.tsx` | Attendee schedule view |
| Create | `src/app/events/competition/[id].tsx` | Competition detail |
| Create | `src/app/events/competition/[id]/register.tsx` | Team/individual registration |
| Create | `src/app/events/competition/[id]/eligibility.tsx` | Eligibility checks |
| Create | `src/app/events/competition/[id]/payment.tsx` | Entry fee payment |
| Create | `src/app/events/competition/[id]/confirmation.tsx` | Competition confirmation |
| Create | `src/app/events/course/[id].tsx` | Course detail |
| Create | `src/app/events/course/[id]/enroll.tsx` | Course enrollment |
| Create | `src/app/events/course/[id]/module/[moduleId].tsx` | Module viewer |
| Create | `src/app/events/course/[id]/quiz/[quizId].tsx` | Quiz screen |
| Create | `src/app/events/course/[id]/certificate.tsx` | Certificate display |
| Create | `src/app/events/camp/[id].tsx` | Camp detail |
| Create | `src/app/events/camp/[id]/register.tsx` | Camp registration |
| Create | `src/app/events/camp/[id]/eligibility.tsx` | Camp eligibility |
| Create | `src/app/events/camp/[id]/confirmation.tsx` | Camp confirmation |
| Create | `src/app/events/tunnel/[id].tsx` | Tunnel facility detail |
| Create | `src/app/events/tunnel/[id]/book.tsx` | Tunnel session booking |
| Create | `src/app/events/tunnel/[id]/payment.tsx` | Tunnel payment |
| Create | `src/app/events/tunnel/[id]/confirmation.tsx` | Tunnel confirmation |
| Create | `src/app/events/create/index.tsx` | Event type selector (organizer) |
| Create | `src/app/events/create/basic.tsx` | Event basic info |
| Create | `src/app/events/create/config.tsx` | Event configuration |
| Create | `src/app/events/create/requirements.tsx` | Event requirements |
| Create | `src/app/events/create/review.tsx` | Event preview and publish |
| Create | `src/app/events/manage/index.tsx` | Organizer event management |
| Create | `src/hooks/useEvents.ts` | Event queries and mutations |
| Create | `src/hooks/useBoogies.ts` | Boogie-specific hooks |
| Create | `src/hooks/useCourses.ts` | Course enrollment hooks |
| Create | `src/stores/eventRegistration.ts` | Multi-step registration state |
| Create | `src/components/events/EligibilityChecklist.tsx` | Reusable eligibility UI |
| Create | `src/components/events/ScheduleTimeline.tsx` | Day schedule timeline |
| Create | `src/components/events/QuizQuestion.tsx` | Quiz question renderer |
| Update | `src/app/_layout.tsx` | Register events stack |

#### API Endpoints Used

| Method | Endpoint | Purpose | Exists? |
|---|---|---|---|
| GET | `/api/boogies` | List boogies with filters | Yes |
| GET | `/api/boogies/:id` | Boogie detail | Yes |
| POST | `/api/boogies/:id/register` | Register for boogie | Yes |
| GET | `/api/boogies/:id/packages` | Boogie packages | Yes |
| GET | `/api/boogies/:id/schedule` | Calendar blocks | Yes |
| GET | `/api/boogies/:id/groups` | Formation groups | Yes |
| POST | `/api/boogies` | Create boogie (organizer) | Yes |
| GET | `/api/learning/courses` | List courses | Yes |
| GET | `/api/learning/courses/:id` | Course detail with modules | Yes |
| POST | `/api/learning/courses/:id/enroll` | Enroll in course | Yes |
| GET | `/api/learning/courses/:id/modules/:moduleId` | Module content | Yes |
| POST | `/api/learning/quizzes/:id/attempts` | Submit quiz attempt | Yes |
| GET | `/api/learning/certificates/:id` | Certificate data | Yes |
| GET | `/api/coaching/sessions` | List coaching sessions | Yes |
| POST | `/api/coaching/sessions` | Book coaching session | Yes |
| POST | `/api/dz/:id/events` | Generic event creation | New |
| GET | `/api/dz/:id/events` | List events for a DZ | New |
| GET | `/api/dz/:id/events/:id/eligibility` | Check user eligibility | New |

**New endpoints needed:**
- `GET /api/dz/:id/events` -- Unified event listing across types (aggregates boogies, courses, coaching into a single feed). Add to a new `apps/api/src/routes/events.ts`.
- `GET /api/dz/:id/events/:id/eligibility` -- Returns pass/fail for each requirement. Add to same file.
- `POST /api/dz/:id/events` -- Generic event creation that dispatches to type-specific creation logic.

---

## Phase 4: Shop and Careers (Week 9-10) -- PARTIALLY COMPLETE (Updated April 2026)

**Status:** Careers browse screen built (`careers/index.tsx`) with job listing and real API integration. Shop/marketplace screens (8 screens) are still entirely unbuilt. Job detail, application, and application tracking screens still pending.

### Goal

Build the DZ pro shop marketplace and the athlete-facing careers/jobs section. Both backend route files already exist: `apps/api/src/routes/shop.ts` and `apps/api/src/routes/careers.ts`.

### 4A: Shop / Marketplace (8 screens)

#### Shop Home

**File: `apps/mobile/src/app/shop/index.tsx`**
- Header with cart icon (badge count)
- Category chips: All, Apparel, Gear, Accessories, Media, Services
- Featured/promoted products section (horizontal scroll)
- Product grid (2 columns) with infinite scroll pagination
- Search bar

#### Product Detail

**File: `apps/mobile/src/app/shop/[id].tsx`**
- Product image gallery (swipeable)
- Product name, price, description
- Size/variant selector if applicable
- Quantity selector
- "Add to Cart" CTA
- DZ shop name and location
- Shipping info (pickup at DZ vs ship)
- Related products

#### Cart

**File: `apps/mobile/src/app/shop/cart.tsx`**
- List of cart items with quantity adjustment
- Remove item swipe action
- Subtotal, tax, shipping calculation
- Promo code input
- "Proceed to Checkout" CTA
- "Continue Shopping" link

#### Checkout

**File: `apps/mobile/src/app/shop/checkout.tsx`**
- Delivery method: DZ Pickup (free) or Shipping (address input)
- Payment method: wallet, card
- Order summary
- Place order CTA

#### Order Confirmation

**File: `apps/mobile/src/app/shop/order-confirmation.tsx`**
- Order number, status
- Items ordered
- Estimated pickup/delivery date
- Continue shopping CTA

#### Order History

**File: `apps/mobile/src/app/shop/orders.tsx`**
- List of past orders
- Status badges: Processing, Ready for Pickup, Shipped, Delivered, Cancelled
- Tap to view order detail

#### Order Detail

**File: `apps/mobile/src/app/shop/orders/[id].tsx`**
- Full order detail with items, quantities, prices
- Status timeline
- Reorder button

#### Add Product (DZ Staff)

**File: `apps/mobile/src/app/shop/add-product.tsx`**
- Staff/admin-only screen
- Product name, description, category, price
- Image upload (expo-image-picker)
- Inventory count
- Active/inactive toggle

### 4B: Careers / Jobs (6 screens)

#### Jobs Home (Enhanced)

**Update: `apps/mobile/src/app/careers/index.tsx`**
- Add search bar
- Add category filter chips: All, Instructor, Rigger, Pilot, Manifest, Camera, Ground Crew
- Add employment type filter: Full-Time, Part-Time, Seasonal, Contract
- Add saved jobs section at top
- Improve card design with SLCard component

#### Job Filters

**File: `apps/mobile/src/components/careers/JobFilterSheet.tsx`**
- Bottom sheet with filters:
  - Employment type multi-select
  - Role category multi-select
  - Location radius
  - Salary range
  - Remote-friendly toggle
  - Posted within (24h, 7d, 30d)

#### Job Detail

**File: `apps/mobile/src/app/careers/[id].tsx`**
- Job title, DZ name, location
- Employment type and salary range
- Full description (scrollable)
- Requirements and qualifications
- Benefits list
- DZ info card (link to DZ detail)
- "Apply Now" CTA
- Save/bookmark toggle
- Share button

#### Job Application

**File: `apps/mobile/src/app/careers/[id]/apply.tsx`**
- Pre-filled personal info from profile
- Resume/CV upload
- Cover letter text input
- Custom application questions (from job post config)
- Certifications and licenses from profile
- References section
- Submit button with confirmation

#### Application Status Tracking

**File: `apps/mobile/src/app/careers/applications.tsx`**
- List of submitted applications
- Status pipeline: Applied > Reviewed > Shortlisted > Interview > Offer / Rejected
- Each application shows: job title, DZ, date applied, current stage
- Tap to view detail

#### Application Detail

**File: `apps/mobile/src/app/careers/applications/[id].tsx`**
- Full application data submitted
- Status timeline with dates
- Messages from recruiter
- Interview schedule (if applicable)
- Offer details (if applicable)
- Accept/Decline offer actions

#### Phase 4 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/app/shop/_layout.tsx` | Shop stack layout |
| Create | `src/app/shop/index.tsx` | Shop home with product grid |
| Create | `src/app/shop/[id].tsx` | Product detail |
| Create | `src/app/shop/cart.tsx` | Shopping cart |
| Create | `src/app/shop/checkout.tsx` | Checkout flow |
| Create | `src/app/shop/order-confirmation.tsx` | Order success |
| Create | `src/app/shop/orders.tsx` | Order history list |
| Create | `src/app/shop/orders/[id].tsx` | Order detail |
| Create | `src/app/shop/add-product.tsx` | Staff product creation |
| Create | `src/components/shop/ProductCard.tsx` | Product grid card |
| Create | `src/components/shop/CartItem.tsx` | Cart line item |
| Create | `src/hooks/useShop.ts` | Shop queries and mutations |
| Create | `src/stores/cart.ts` | Cart state (persisted) |
| Create | `src/app/careers/[id].tsx` | Job detail screen |
| Create | `src/app/careers/[id]/apply.tsx` | Application form |
| Create | `src/app/careers/applications.tsx` | My applications list |
| Create | `src/app/careers/applications/[id].tsx` | Application detail |
| Create | `src/app/careers/_layout.tsx` | Careers stack layout |
| Create | `src/components/careers/JobFilterSheet.tsx` | Job filter sheet |
| Create | `src/components/careers/JobCard.tsx` | Job listing card |
| Create | `src/hooks/useCareers.ts` | Career queries and mutations |
| Update | `src/app/careers/index.tsx` | Search, filters, design system |
| Update | `src/app/_layout.tsx` | Register shop and careers stacks |

#### API Endpoints Used

| Method | Endpoint | Purpose | Exists? |
|---|---|---|---|
| GET | `/api/dz/:id/shop/products` | List products with filters | Yes |
| GET | `/api/dz/:id/shop/products/:id` | Product detail | Yes |
| POST | `/api/dz/:id/shop/orders` | Create order | Yes |
| GET | `/api/dz/:id/shop/orders` | Order history | Yes |
| GET | `/api/dz/:id/shop/orders/:id` | Order detail | Yes |
| POST | `/api/dz/:id/shop/products` | Create product (staff) | Yes |
| GET | `/api/careers/jobs` | List jobs with filters | Yes |
| GET | `/api/careers/jobs/:id` | Job detail | Yes |
| POST | `/api/careers/jobs/:id/applications` | Submit application | Yes |
| GET | `/api/careers/applications` | My applications | Yes |
| GET | `/api/careers/applications/:id` | Application detail | Yes |
| POST | `/api/uploads/presign` | Presigned URL for resume upload | Yes |

**No new endpoints needed. All shop and careers APIs already exist.**

---

## Phase 5: Experts, Stays Enhancement, and Social (Week 11) -- PARTIALLY COMPLETE (Updated April 2026)

**Status:** Social screens built (`social/leaderboard.tsx`, `social/whos-going.tsx`). Stays browse built (`stays/index.tsx`). Safety screens built (`safety/emergency.tsx`, `safety/report-incident.tsx`). Expert directory and 1-on-1 booking flows still pending. Stays enhancement (property detail, booking, confirmation) still pending.

### Goal

Build expert directory with 1-on-1 session booking, enhance the existing stays screen into a full accommodation booking flow, and add social features.

### 5A: Expert Directory (5 screens)

#### Experts Hub

**File: `apps/mobile/src/app/experts/index.tsx`**
- Browse experts by discipline: Freefly Coaching, RW Coaching, Canopy, Wingsuit, Camera, Rigging, AFF Instruction
- Expert cards: avatar, name, disciplines, total students, rating, price range
- Sort by: rating, price, distance, availability
- Filter by discipline, price range, availability

#### Expert Profile

**File: `apps/mobile/src/app/experts/[id].tsx`**
- Full profile: photo, bio, certifications, ratings held
- Disciplines and specializations
- Coaching philosophy text
- Stats: total students, years experience, jump count
- Reviews from past students
- Available time slots preview
- Price list per session type
- "Book Session" CTA
- "Send Message" CTA

#### Book Expert Session Step 1 -- Session Type and Date

**File: `apps/mobile/src/app/experts/[id]/book.tsx`**
- Session type selection: ground school, in-air coaching, debrief, video analysis, multi-jump progression
- Calendar for date selection
- Available time slots for selected date
- Session duration selection
- Continue button

#### Book Expert Session Step 2 -- Details and Payment

**File: `apps/mobile/src/app/experts/[id]/payment.tsx`**
- Session summary
- Specific goals or focus areas (text input)
- Skill level self-assessment
- Any equipment needs
- Payment method selection
- Total price display
- Confirm booking CTA

#### Expert Session Confirmation

**File: `apps/mobile/src/app/experts/[id]/confirmation.tsx`**
- Booking confirmation with reference
- Expert name and session type
- Date, time, DZ location
- Preparation instructions from the expert
- Calendar add
- Chat link to message expert before session

### 5B: Stays / Accommodation Enhancement (6 screens)

#### Stays Home (Enhanced)

**Update: `apps/mobile/src/app/stays/index.tsx`**
- Add date picker (check-in / check-out)
- Add guest count selector
- Add map toggle to show properties on map
- Improve property cards with SLCard
- Add saved/favorited properties section

#### Property Detail

**File: `apps/mobile/src/app/stays/[id].tsx`**
- Photo gallery (horizontal scroll, full-screen tap)
- Property name, type, distance from DZ
- Nightly price, cleaning fee, total calculation
- Amenities grid (wifi, kitchen, parking, laundry, AC, pool)
- Host info card
- Availability calendar
- Reviews section
- "Book Now" CTA
- Save to favorites toggle

#### Stays Booking

**File: `apps/mobile/src/app/stays/[id]/book.tsx`**
- Check-in / check-out date confirmation
- Guest count
- Special requests text input
- Price breakdown (nightly rate x nights + cleaning + service fee)
- Payment method selection
- House rules acknowledgment
- Confirm booking CTA

#### Stays Booking Confirmation

**File: `apps/mobile/src/app/stays/[id]/confirmation.tsx`**
- Booking reference
- Property name, address, dates
- Check-in instructions
- Host contact info
- Calendar add
- Directions link

#### My Stays

**File: `apps/mobile/src/app/stays/my-stays.tsx`**
- Tabs: Upcoming, Past, Saved
- Booking cards with status
- Quick actions: contact host, get directions, cancel

#### Leave Review

**File: `apps/mobile/src/app/stays/[id]/review.tsx`**
- Star rating (1-5)
- Category ratings: cleanliness, accuracy, location, value
- Text review
- Photo upload option
- Submit button

### 5C: Social Features Enhancement (4 screens)

#### Activity Feed

**File: `apps/mobile/src/app/social/feed.tsx`**
- Scrollable feed of activity from followed jumpers
- Post types: jump logged, achievement earned, milestone reached, event attended, photo shared
- Like and comment interactions
- Follow/unfollow from feed

#### Create Post

**File: `apps/mobile/src/app/social/create-post.tsx`**
- Text content input
- Photo/video attachment (expo-image-picker)
- Tag jumpers
- Tag DZ location
- Visibility: public, followers, DZ members
- Post button

#### Jumper Profile (Other Users)

**File: `apps/mobile/src/app/social/profile/[id].tsx`**
- Public profile view of another jumper
- Avatar, name, license, total jumps, disciplines
- Achievement showcase
- Jump stats (jumps this year, DZs visited)
- Follow/unfollow button
- "Message" button
- Recent activity feed

#### Achievements Gallery

**File: `apps/mobile/src/app/social/achievements.tsx`**
- Grid of all possible achievements
- Earned vs locked display
- Progress toward next milestone
- Share individual achievements

#### Phase 5 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/app/experts/_layout.tsx` | Experts stack layout |
| Create | `src/app/experts/index.tsx` | Expert directory |
| Create | `src/app/experts/[id].tsx` | Expert profile |
| Create | `src/app/experts/[id]/book.tsx` | Session booking |
| Create | `src/app/experts/[id]/payment.tsx` | Session payment |
| Create | `src/app/experts/[id]/confirmation.tsx` | Booking confirmation |
| Create | `src/hooks/useExperts.ts` | Expert queries |
| Create | `src/app/stays/_layout.tsx` | Stays stack layout |
| Create | `src/app/stays/[id].tsx` | Property detail |
| Create | `src/app/stays/[id]/book.tsx` | Accommodation booking |
| Create | `src/app/stays/[id]/confirmation.tsx` | Booking confirmation |
| Create | `src/app/stays/my-stays.tsx` | My bookings list |
| Create | `src/app/stays/[id]/review.tsx` | Leave review |
| Create | `src/hooks/useStays.ts` | Rental queries and mutations |
| Create | `src/app/social/_layout.tsx` (update) | Social stack layout |
| Create | `src/app/social/feed.tsx` | Activity feed |
| Create | `src/app/social/create-post.tsx` | Create post |
| Create | `src/app/social/profile/[id].tsx` | Jumper public profile |
| Create | `src/app/social/achievements.tsx` | Achievement gallery |
| Create | `src/hooks/useSocial.ts` | Social queries and mutations |
| Update | `src/app/stays/index.tsx` | Date picker, map, design system |
| Update | `src/app/social/leaderboard.tsx` | Design system alignment |
| Update | `src/app/social/whos-going.tsx` | Design system alignment |
| Update | `src/app/_layout.tsx` | Register experts stack |

#### API Endpoints Used

| Method | Endpoint | Purpose | Exists? |
|---|---|---|---|
| GET | `/api/coaching/instructors` | List experts/coaches | Yes |
| GET | `/api/coaching/instructors/:id` | Expert profile detail | Yes |
| POST | `/api/coaching/sessions` | Book coaching session | Yes |
| GET | `/api/rentals/listings` | Search rental properties | Yes |
| GET | `/api/rentals/listings/:id` | Property detail | Yes |
| POST | `/api/rentals/bookings` | Create rental booking | Yes |
| GET | `/api/rentals/bookings` | My rental bookings | Yes |
| POST | `/api/rentals/reviews` | Submit property review | Yes |
| GET | `/api/social/feed` | Activity feed | Yes |
| POST | `/api/social/posts` | Create social post | Yes |
| GET | `/api/social/profiles/:id` | Public profile data | Yes |
| POST | `/api/social/follows` | Follow a user | Yes |
| GET | `/api/social/achievements` | Achievement list | Yes |

**No new endpoints needed. All expert, rental, and social APIs already exist.**

---

## Phase 6: Polish, Integration, and Production Readiness (Week 12)

### Goal

Final Figma audit of every screen, performance optimization, offline support, push notification wiring, deep link coverage, accessibility pass, and end-to-end testing.

### Task 6.1: Visual Audit Against Figma (2 days)

Review every built screen against its Figma counterpart. For each screen:
- Verify exact colors match tokens
- Verify typography sizes and weights
- Verify spacing and padding
- Verify border radii and shadow values
- Verify icon selection matches Figma
- Verify empty states, error states, loading states
- Fix any discrepancies found

**Files to update:** All 51 existing + all new screens (up to 109 total)

### Task 6.2: Animations and Transitions (1 day)

- Screen transitions: shared element transitions for DZ cards, product cards, event cards
- Micro-interactions: button press feedback (haptic + scale), toggle animations, tab switch
- Loading skeletons: replace ActivityIndicator spinners with shimmer placeholders
- Pull-to-refresh: custom SkyLara-branded animation
- Success states: animated checkmark for booking, registration, order confirmations
- List item entrance: staggered fade-in for FlatList items

**Files to create:**
- `src/components/ui/SLSkeleton.tsx` -- Shimmer loading placeholder
- `src/components/ui/SLSuccessAnimation.tsx` -- Animated success checkmark
- `src/lib/animations.ts` -- Shared Reanimated animation presets

### Task 6.3: Offline Support Expansion (1 day)

The app already has `offline-queue.ts` for queuing actions. Extend coverage to:

- Cache all DZ data, user profile, gear list, logbook, upcoming bookings
- Show "Offline" banner when disconnected (NetInfo already in deps)
- Queue booking creation, logbook entries, chat messages
- Sync on reconnect with conflict resolution (server wins for safety-critical data)
- Boarding pass available offline after first QR generation
- Weather data cached with stale indicator
- Course content available offline after download

**Files to update:**
- `src/lib/offline-queue.ts` -- Expand queue handlers for new actions
- `src/lib/query.ts` -- Configure React Query persistence with MMKV

**Files to create:**
- `src/lib/offline-cache.ts` -- MMKV-based cache layer for critical data
- `src/hooks/useNetworkStatus.ts` -- Network connectivity hook with banner

### Task 6.4: Push Notification Wiring (1 day)

Connect existing `usePushNotifications` hook to all notification-worthy events:

| Event | Navigation Target |
|---|---|
| Load status change | `/manifest/load-detail` |
| Weather hold activated | `/weather` |
| Booking confirmed | `/booking/[id]` |
| Load assigned after booking | `/booking/boarding-pass` |
| Event registration confirmed | `/events/[type]/[id]/confirmation` |
| New chat message | `/chat/[channelId]` |
| Gear check due | `/rig/[rigId]` |
| Job application update | `/careers/applications/[id]` |
| Waiver expiring | `/profile/waivers` |
| Achievement earned | `/social/achievements` |
| Stay check-in reminder | `/stays/my-stays` |
| Course module available | `/events/course/[id]/module/[moduleId]` |

**Files to update:**
- `src/hooks/usePushNotifications.ts` -- Add notification tap handlers for all new deep links
- `src/lib/notifications.ts` -- Register notification categories

### Task 6.5: Deep Linking (0.5 days)

Configure Expo Router deep links so external URLs open the correct screen:

| Pattern | Screen |
|---|---|
| `skylara://booking/:id` | Booking detail |
| `skylara://booking/:id/boarding-pass` | Boarding pass |
| `skylara://events/boogie/:id` | Boogie detail |
| `skylara://events/course/:id` | Course detail |
| `skylara://dropzones/:id` | DZ detail |
| `skylara://shop/:id` | Product detail |
| `skylara://careers/:id` | Job detail |
| `skylara://stays/:id` | Property detail |
| `skylara://experts/:id` | Expert profile |
| `skylara://social/profile/:id` | Jumper profile |
| `skylara://chat/:channelId` | Chat channel |

**Files to update:**
- `app.json` -- Verify scheme `skylara` is configured (already set)
- `src/app/_layout.tsx` -- Verify all routes are registered for deep linking

### Task 6.6: Accessibility Pass (0.5 days)

- Add `accessibilityLabel` and `accessibilityRole` to all interactive elements
- Add `accessibilityHint` to non-obvious buttons
- Ensure all images have `accessibilityLabel`
- Verify color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Test VoiceOver (iOS) and TalkBack (Android) screen reader navigation
- Ensure focus order follows visual layout

### Task 6.7: Performance Optimization (1 day)

- Audit FlatList renders with React DevTools profiler
- Add `React.memo` to list item components that re-render unnecessarily
- Implement `getItemLayout` for fixed-height FlatList items
- Use `expo-image` (already in deps) for all images with caching
- Implement image CDN URL transforms for thumbnails
- Lazy load heavy screens with `React.lazy` and `Suspense`
- Configure React Query staleTime and cacheTime per query type
- Profile and reduce JS bundle size (tree-shake unused lucide icons)

### Task 6.8: End-to-End Testing (1 day)

- Set up Maestro or Detox for E2E testing
- Write critical flow tests:
  - Login flow
  - Onboarding complete flow
  - Book a jump flow
  - Check in at DZ flow
  - Register for event flow
  - Shop purchase flow
  - Apply for job flow
- Run tests on both iOS and Android simulators

**Files to create:**
- `e2e/login.test.ts`
- `e2e/onboarding.test.ts`
- `e2e/booking.test.ts`
- `e2e/checkin.test.ts`
- `e2e/events.test.ts`
- `e2e/shop.test.ts`
- `e2e/careers.test.ts`
- `maestro/config.yaml` (or `detox.config.ts`)

#### Phase 6 Files Summary

| Action | File | Description |
|---|---|---|
| Create | `src/components/ui/SLSkeleton.tsx` | Shimmer loading placeholder |
| Create | `src/components/ui/SLSuccessAnimation.tsx` | Animated success state |
| Create | `src/lib/animations.ts` | Reanimated animation presets |
| Create | `src/lib/offline-cache.ts` | MMKV offline data cache |
| Create | `src/hooks/useNetworkStatus.ts` | Network status hook |
| Create | `e2e/login.test.ts` | Login E2E test |
| Create | `e2e/onboarding.test.ts` | Onboarding E2E test |
| Create | `e2e/booking.test.ts` | Booking E2E test |
| Create | `e2e/checkin.test.ts` | Check-in E2E test |
| Create | `e2e/events.test.ts` | Events E2E test |
| Create | `e2e/shop.test.ts` | Shop E2E test |
| Create | `e2e/careers.test.ts` | Careers E2E test |
| Update | All 109+ screens | Visual audit and corrections |
| Update | `src/hooks/usePushNotifications.ts` | Full notification routing |
| Update | `src/lib/notifications.ts` | Notification categories |
| Update | `src/lib/offline-queue.ts` | Extended offline handlers |
| Update | `src/lib/query.ts` | Persistence config |

---

## File Creation Summary (Updated April 2026)

| Phase | New Files | Updated Files | New Screens | Status |
|---|---|---|---|---|
| Phase 0: Foundation | 14 | 10 | 0 (redesign only) | Partial -- nav restructured, design tokens pending |
| Phase 1: Onboarding | 16 | 3 | 19 | Partial -- 2 of 19 screens built (welcome, steps) |
| Phase 2: DZ and Booking | 19 | 4 | 15 | Partial -- 2 of 15 screens built (discover/) |
| Phase 3: Events | 42 | 1 | 35 | Partial -- 8 of 35 screens built (events/2, coach/5, learn/1) |
| Phase 4: Shop and Careers | 23 | 2 | 14 | Partial -- 1 of 14 screens built (careers/) |
| Phase 5: Experts, Stays, Social | 24 | 5 | 15 | Partial -- 5 of 15 screens built (social/2, stays/1, safety/2) |
| Phase 6: Polish | 12 | 109+ | 0 | Not started |
| **Total planned** | **150** | **134+** | **98** | **18 of 98 new screens built** |
| **Additional unplanned** | -- | -- | **7** | **Ops (4) + Manager (4) + rig/[rigId] (1) built ahead of plan** |

Combined with the original 37 screens (now 62 total), the fully built app will have approximately **135+ screens** total, covering all 120 Figma designs plus operational, coaching, management, and safety screens identified during implementation.

### Overall Implementation Progress (April 2026)

| Metric | Value |
|---|---|
| Total user-facing screens built | 62 |
| Screens with real API integration | ~60 (96%) |
| Layout files | 17 |
| Phases with at least partial completion | 5 of 6 |
| Remaining planned screens to build | ~73 |
| Backend API coverage for remaining screens | 95%+ (only 4 new endpoints needed) |

---

## API Endpoint Summary

### Existing API Endpoints Consumed by Mobile (no backend work)

| Module | Endpoint Count | Route File |
|---|---|---|
| Auth | 6 | `auth.ts`, `authAdvanced.ts` |
| Onboarding | 5 | `onboarding.ts` |
| Dropzones/Manifest | 12 | `manifest.ts` |
| Booking | 8 | `booking.ts` |
| Weather | 4 | `weather.ts` |
| Payments/Wallet | 6 | `payments.ts`, `paymentsAdvanced.ts` |
| Logbook | 4 | `logbook.ts` |
| Gear/Rig | 6 | `gear.ts`, `rig-maintenance.ts` |
| Chat | 5 | `chat.ts` |
| Notifications | 4 | `notifications.ts`, `notificationCenter.ts` |
| Safety | 3 | `safety.ts` |
| Boogies/Events | 10 | `boogies.ts` |
| Learning/Courses | 8 | `learning.ts` |
| Coaching/Experts | 5 | `coaching.ts` |
| Shop | 6 | `shop.ts` |
| Careers | 7 | `careers.ts` |
| Rentals/Stays | 6 | `rentals.ts` |
| Social | 5 | `social.ts` |
| Uploads | 2 | `uploads.ts` |
| Waivers | 3 | `waivers.ts`, `waiverCenter.ts` |
| Sync | 2 | `sync.ts` |

### New API Endpoints Required

| Method | Endpoint | Phase | Backend File |
|---|---|---|---|
| GET | `/api/dz/:id/bookings/:id/boarding-pass` | 2 | `booking.ts` |
| GET | `/api/dz/:id/events` | 3 | `events.ts` (new) |
| GET | `/api/dz/:id/events/:id/eligibility` | 3 | `events.ts` (new) |
| POST | `/api/dz/:id/events` | 3 | `events.ts` (new) |

Only **4 new endpoints** are needed. The existing backend already covers 95%+ of mobile requirements.

---

## Dependency Additions

```json
{
  "dependencies": {
    "react-native-maps": "^2.0.0",
    "expo-location": "~18.0.0",
    "react-native-qrcode-svg": "^6.3.0",
    "expo-image-picker": "~16.0.0",
    "expo-file-system": "~18.0.0",
    "expo-sharing": "~13.0.0",
    "expo-calendar": "~14.0.0",
    "@gorhom/bottom-sheet": "^5.0.0"
  }
}
```

Install via:
```bash
npx expo install react-native-maps expo-location react-native-qrcode-svg expo-image-picker expo-file-system expo-sharing expo-calendar @gorhom/bottom-sheet
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| react-native-maps crashes on Expo Go | High | Medium | Test early in Phase 2; use development build if needed |
| Onboarding persona logic diverges from backend flow config | Medium | High | Mirror exact ONBOARDING_FLOWS config from `onboarding.ts`; share types package |
| Event registration multi-step state lost on app background | Medium | Medium | Persist to AsyncStorage via Zustand persist middleware |
| Course video playback performance on older devices | Medium | Medium | Use expo-av with adaptive bitrate; provide audio-only fallback |
| Bottom sheet gesture conflicts with scroll views | Medium | Low | Use @gorhom/bottom-sheet which handles nested scroll properly |
| Map view slow with 1000+ DZ pins | Low | Medium | Cluster pins; lazy-load based on map viewport bounds |
| Offline queue conflicts when multiple actions queued | Medium | High | Server-confirmed truth wins; queue processes sequentially with rollback |
| QR boarding pass screenshot vulnerability | Low | Medium | QR contains signed JWT with expiry; validate server-side on scan |
| Payment flow interrupted mid-transaction | Medium | High | Idempotency keys on all payment mutations; retry with same key |
| Deep linking opens wrong screen after app update | Low | Medium | Version route paths; handle unknown routes with fallback |
| Push notification permission denied on iOS | Medium | Medium | Graceful degradation to in-app notifications; re-prompt strategy |
| Figma design changes during implementation | Medium | Low | Token-based design system absorbs color/spacing changes; component library isolates impact |

---

## Success Criteria

### Phase 0: Foundation
- [ ] All 12 UI components built and storybook-tested on iOS and Android
- [ ] Design tokens file matches Figma exactly (verified by overlay comparison)
- [ ] Tab bar shows correct icons and labels
- [ ] Existing 8 screens updated to use new components
- [ ] No regressions in existing functionality

### Phase 1: Onboarding
- [ ] All 6 persona flows navigable end-to-end
- [ ] Step data persists across app restarts
- [ ] Backend receives correct data for each step
- [ ] Profile created with all onboarding data after completion
- [ ] Redirects correctly for already-onboarded users

### Phase 2: DZ Discovery and Booking
- [ ] Map shows real DZ locations with correct jumpability colors
- [ ] DZ detail loads weather, aircraft, pricing from API
- [ ] Booking flow works end-to-end with real payment
- [ ] Boarding pass QR scannable by check-in scanner
- [ ] Geofenced check-in validates location correctly

### Phase 3: Events
- [ ] All 5 event types discoverable and filterable
- [ ] Boogie registration creates real BoogieRegistration record
- [ ] Eligibility check blocks ineligible users with actionable fixes
- [ ] Course module viewer plays video and tracks progress
- [ ] Organizer can create and publish events from mobile

### Phase 4: Shop and Careers
- [ ] Products load from API with correct DZ-scoped pricing
- [ ] Cart persists across app sessions
- [ ] Order creates real ShopOrder record
- [ ] Job applications submit with resume upload
- [ ] Application status reflects real recruiter actions

### Phase 5: Experts and Stays
- [ ] Expert sessions book via coaching API
- [ ] Rental properties show real availability
- [ ] Rental bookings create real RentalBooking records
- [ ] Social feed shows real activity from followed users
- [ ] Achievements display correct earned/locked state

### Phase 6: Polish
- [ ] Every screen matches Figma within 2px tolerance
- [ ] Screen transitions under 100ms
- [ ] App works offline for cached data
- [ ] Push notifications route to correct screen
- [ ] Deep links open correct screen from cold start
- [ ] VoiceOver reads all interactive elements
- [ ] E2E tests pass on iOS and Android
- [ ] No console errors or warnings
- [ ] Bundle size under 50MB
- [ ] App startup under 2 seconds

---

## Weekly Milestones

| Week | Deliverable | Acceptance Gate |
|---|---|---|
| 1 | Design system + aligned existing screens | Component library passes visual review |
| 2 | Onboarding -- persona selection + steps 1-4 | Navigable with data persistence |
| 3 | Onboarding -- steps 5-7 + completion | Full flow creates user profile |
| 4 | DZ map/list + detail page | Map renders with live DZ data |
| 5 | Booking enhancement + boarding pass | QR code scannable end-to-end |
| 6 | Event hub + boogie registration | Boogie registration creates record |
| 7 | Competition + course enrollment | Course module viewer functional |
| 8 | Camp + tunnel + organizer creation | All 5 event types functional |
| 9 | Shop complete flow | Order creation end-to-end |
| 10 | Careers complete flow | Application submission works |
| 11 | Experts + stays + social | Session booking and rental booking work |
| 12 | Polish, offline, testing | All success criteria met |

---

## Architecture Decisions

### State Management Strategy

| Concern | Tool | Rationale |
|---|---|---|
| Auth session | Zustand + SecureStore | Token persistence across restarts |
| Active DZ context | Zustand | Global, affects all DZ-scoped queries |
| Server data (lists, details) | React Query | Cache, stale time, background refresh |
| Multi-step form state | Zustand + AsyncStorage persist | Survive app backgrounding |
| Shopping cart | Zustand + MMKV persist | Fast read/write, survives restarts |
| Offline action queue | Zustand + MMKV | Queue mutations when offline |
| Realtime updates | Socket.io + React Query invalidation | Server pushes, client refreshes |

### Navigation Architecture

```
Root Stack (_layout.tsx)
  |-- (auth) Group -- login, register, forgot-password, splash
  |-- (tabs) Group -- home, weather, bookings, profile
  |-- onboarding Stack -- persona selection, [step]
  |-- dropzones Stack -- index, list, [id], [id]/staff
  |-- booking Stack -- index, [id], new, equipment, success, boarding-pass, reschedule
  |-- events Stack -- index, search, boogie/[id]/*, competition/[id]/*, course/[id]/*, camp/[id]/*, tunnel/[id]/*, create/*, manage/
  |-- shop Stack -- index, [id], cart, checkout, order-confirmation, orders, orders/[id]
  |-- careers Stack -- index, [id], [id]/apply, applications, applications/[id]
  |-- experts Stack -- index, [id], [id]/book, [id]/payment, [id]/confirmation
  |-- stays Stack -- index, [id], [id]/book, [id]/confirmation, my-stays, [id]/review
  |-- social Stack -- feed, create-post, profile/[id], achievements, leaderboard, whos-going
  |-- manifest Modal -- load-board, load-builder, load-detail, my-loads, select-load
  |-- profile Stack -- edit, gear, gear-detail, license, documents, waivers, settings
  |-- payments Stack -- wallet, buy-tickets, history
  |-- safety Stack -- emergency, report-incident
  |-- notifications Stack -- index
  |-- chat Stack -- [channelId]
  |-- rig Stack -- index, [rigId]
  |-- learn Stack -- index
  |-- logbook Stack -- [id], add
  |-- checkin Stack -- scan
```

### Offline-First Priority

| Data | Offline Strategy | Conflict Resolution |
|---|---|---|
| User profile | Cache in MMKV, refresh on connect | Server wins |
| Active DZ weather | Cache with stale timestamp | Server wins, show "last updated" |
| Load board | Cache, show stale banner | Server wins (safety-critical) |
| Logbook entries | Queue new entries offline | Client creates, server validates |
| Booking QR | Cache after first generation | Read-only, no conflict |
| Chat messages | Queue sends, cache received | Server order wins |
| Course progress | Cache lesson completion | Last-write wins per lesson |
| Gear list | Cache full list | Server wins |
| Notifications | Cache received, mark-read queued | Merge (union of read IDs) |

---

## Out of Scope for V1 Mobile

These items exist in the web dashboard but are deferred for mobile:

- Admin DZ management dashboard (web-only)
- Report builder and analytics (web-only)
- Manifest agent AI assistant (web-only initially)
- Staff scheduling (web-only)
- Partner onboarding (web-only)
- Federation management (web-only)
- Data management/export (web-only)
- Feature flag administration (web-only)
- Branding configuration (web-only)
- Marketing campaign builder (web-only)
