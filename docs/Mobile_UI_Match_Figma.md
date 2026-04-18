# SkyLara Mobile -- UI Matching Guide (Figma -> Code)

> Match the existing Expo mobile app to the Figma design system
> Updated: April 2026 -- Reflects 62 built screens (up from 37), tab restructuring complete

---

## 1. Navigation Mismatch (Updated April 2026)

### Bottom Tab Bar

**UPDATE April 2026:** Tab restructuring is now COMPLETE. The app has 6 tab screens: Home, Logbook, Chat, Profile, Bookings, and Weather. The tab layout has been updated. Icon and visual alignment with Figma still needs verification.

| Element | Figma Design | Current Code | Action Required |
|---|---|---|---|
| Tab count | 4 tabs | 6 tabs (home, logbook, chat, profile, bookings, weather) | DONE -- tabs added; may need to consolidate to 4 per Figma |
| Tab labels | Home, Weather, Bookings, Profile | Home, Logbook, Chat, Profile, Bookings, Weather | DONE -- Weather and Bookings tabs now exist; verify final tab selection with Figma |
| Tab icons | Custom SVG icons from Figma | Inline SVG components (HomeIcon, LogbookIcon, ChatIcon, ProfileIcon) | Replace all four icon components with Figma-exported SVGs |
| Active color | TBD from Figma | `#0EA5E9` (sky-500) | Verify match against Figma `BottomNavBar` component |
| Inactive color | TBD from Figma | `#94A3B8` (slate-400) | Verify match |
| Tab bar height | ~60px from Figma | 60px (`height: 60` in `screenOptions.tabBarStyle`) | Match |
| Tab bar background | TBD from Figma | `#FFFFFF` | Verify match |
| Tab bar border | TBD from Figma | `borderTopColor: '#E2E8F0'`, 1px | Verify match |
| Tab bar padding | TBD from Figma | `paddingBottom: 8, paddingTop: 8` | Verify match |

**File to edit:** `apps/mobile/src/app/(tabs)/_layout.tsx`

Required changes:
1. Rename the `logbook` tab to `weather` (or create a new weather tab screen file) and change `tabBarLabel` from `'Logbook'` to `'Weather'`.
2. Rename the `chat` tab to `bookings` and change `tabBarLabel` from `'Chat'` to `'Bookings'`.
3. Replace the four inline SVG icon functions (`HomeIcon`, `LogbookIcon`, `ChatIcon`, `ProfileIcon`) with Figma-exported icon assets.
4. The current `logbook` and `chat` tab screens remain accessible as stack screens, but they are no longer primary tabs.

### Top App Bar (Header)

| Element | Figma Design (70 instances) | Current Code | Action Required |
|---|---|---|---|
| Component type | Dedicated `TopAppBar` component with title, back arrow, optional right actions | No shared header; `headerShown: false` globally; each screen rolls its own inline header `<View>` | Create a shared `TopAppBar` component matching Figma |
| Back button | Left-aligned chevron/arrow icon | Some screens use `router.back()` via ad-hoc Pressable, many screens have no back button | Standardize: always render a back chevron when `canGoBack` is true |
| Title alignment | Centered title text (Figma) | Left-aligned `<Text>` in most screens (e.g., Home shows user name left-aligned; Logbook shows "Logbook" left-aligned) | Move title to center; user greeting can remain left-aligned on Home only |
| Right actions | Optional icon buttons (notifications bell, share, filter, etc.) | Ad-hoc right-aligned elements (e.g., CheckInToggle on Home, "+" FAB on Chat) | Standardize right slot with consistent icon buttons |
| Height | TBD from Figma | Varies by screen, typically 48-56px content area | Measure Figma and set a fixed height |
| Background | TBD from Figma (likely white or transparent) | `bg-white` or none | Verify |
| Shadow/border | TBD from Figma | Some screens use `border-b border-gray-100`, others have none | Standardize to match Figma |

**Action:** Create `apps/mobile/src/components/TopAppBar.tsx` that accepts props: `title`, `showBack`, `rightActions`, `transparent`. Use it in all screens that Figma shows with a TopAppBar.

---

## 2. Color System Alignment

### Primary Colors

| Token | Figma Value | Tailwind Config Value | NativeWind Class | Status |
|---|---|---|---|---|
| Brand Primary | TBD (likely `#0EA5E9`) | `#0EA5E9` | `bg-brand-primary` / `text-brand-primary` | Verify in Figma variables |
| Brand Secondary | TBD (likely `#6366F1`) | `#6366F1` | `bg-brand-secondary` / `text-brand-secondary` | Verify |
| Brand Accent | TBD (likely `#14B8A6`) | `#14B8A6` | `bg-brand-accent` / `text-brand-accent` | Verify |
| Brand Dark | TBD | `#0F172A` | `bg-brand-dark` | Verify |
| Brand Muted | TBD | `#64748B` | `bg-brand-muted` | Verify |

Note: The code currently uses raw Tailwind palette colors (`bg-sky-500`, `text-gray-900`) more often than the `brand-*` tokens. After confirming Figma values, migrate all hardcoded color references to use `brand-*` tokens for consistency.

### Status Colors

| Status | Figma Value | Current Code Value | NativeWind Class | Action |
|---|---|---|---|---|
| Danger / Error | TBD | `#EF4444` | `bg-brand-danger` / `text-red-500` | Verify; unify usage to `brand-danger` |
| Warning | TBD | `#F59E0B` | `bg-brand-warning` / `text-yellow-500` | Verify; unify |
| Success | TBD | `#22C55E` | `bg-brand-success` / `text-green-500` | Verify; unify |
| Info | TBD | `#0EA5E9` (reuses primary) | `bg-brand-primary` / `text-sky-500` | Verify if Figma has a distinct info color |

### Surface Colors

| Surface | Figma Value | Current Code | Action |
|---|---|---|---|
| Background (primary) | TBD | `bg-white` (most screens) or `bg-gray-50` (logbook, booking, detail screens) | Verify which Figma uses as default; standardize |
| Card surface | TBD | `bg-white` with `border border-gray-100` or `border-gray-200` | Verify border color and radius from Figma |
| Elevated surface (modal) | TBD | `bg-white rounded-t-3xl` with `bg-black/50` overlay | Verify overlay opacity and sheet radius |
| Input field background | TBD | `bg-gray-100` with `border border-gray-200` (login) or `bg-gray-50` with `border border-gray-200` (edit profile) | Unify; pick whichever Figma specifies |
| Chip / pill (active) | TBD | `bg-sky-500` with `text-white` | Verify |
| Chip / pill (inactive) | TBD | `bg-white border-gray-200` or `bg-gray-100` | Verify |

---

## 3. Typography Alignment

### Heading Hierarchy

| Level | Figma Spec | Current Code Usage | Action |
|---|---|---|---|
| H1 (Heading 1) | TBD -- likely 28-32px, Bold | `text-4xl font-bold` on Login ("SkyLara" brand name = 36px) | Verify size and weight; 4xl may be too large if Figma says 28-30px |
| H2 (Heading 2) | TBD -- likely 22-26px, Bold | `text-3xl font-bold` on Register ("Create Account" = 30px), `text-2xl font-bold` on screen titles ("Logbook", "Messages" = 24px) | Standardize screen titles to one size |
| H3 (Heading 3) | TBD -- likely 18-20px, Semibold/Bold | `text-xl font-bold` on DZ picker title, profile name (20px) | Verify |
| H4 (Heading 4) | TBD -- likely 16-18px, Semibold | `text-lg font-bold` on section headers ("Container", "Personal Information" = 18px) | Verify |
| H5 (Heading 5) | TBD -- likely 14-16px, Semibold | `text-base font-semibold` on channel names, card titles (16px) | Verify |
| Paragraph | TBD -- likely 14-16px, Regular | `text-sm text-gray-600` (14px) or `text-base text-gray-700` (16px) -- inconsistent | Standardize to Figma body size |
| Label | TBD -- likely 12-14px, Semibold, uppercase tracking | `text-xs text-gray-500 font-semibold` (12px) used for section labels ("BALANCE", "WIND", "JUMPABILITY") | Verify tracking/letter-spacing from Figma |
| Link | TBD -- likely Primary color, Semibold | `text-sky-500 font-semibold` (e.g., "Forgot Password?", "Sign Up") | Verify; confirm underline vs. no underline |
| Caption | TBD -- likely 10-12px, Regular | `text-xs text-gray-400` or `text-xs text-gray-500` | Verify |

### Font Family

| Element | Figma | Current Code | Action |
|---|---|---|---|
| Primary font | TBD from Figma design system | System default (San Francisco on iOS, Roboto on Android) | If Figma specifies a custom font (e.g., Inter, Plus Jakarta Sans), install it via `expo-font` and update `tailwind.config.js` |
| Monospace | TBD | `font-mono` used for Booking ID display | Verify if Figma uses monospace anywhere |

---

## 4. Component Matching

### Button Component (613 Figma instances)

| Variant | Figma | Current Code | Action |
|---|---|---|---|
| Primary filled | TBD -- likely full-width, `bg-primary`, white text, specific radius and padding | `bg-sky-500 py-3 rounded-lg` with `text-white font-semibold text-base` | Verify border-radius (Figma may use `rounded-xl` = 12px vs. current `rounded-lg` = 8px), verify padding, verify font-weight |
| Primary disabled | TBD -- likely opacity or lighter color | `bg-sky-400` (loading state) or `opacity-50` | Verify Figma disabled state |
| Secondary / outline | TBD -- likely border + transparent bg | `border border-gray-300 bg-white` (used for "Cancel" / "Back" buttons) | Verify border color and text color |
| Danger | TBD -- likely red bg or red outline | `border-2 border-red-300` (cancel booking) or `bg-red-50 border-red-200` (delete account) | Verify; inconsistent today |
| Small / pill | TBD | `px-4 py-2 rounded-full` (filter chips) | Verify |
| FAB (floating action button) | TBD from Figma | `w-14 h-14 rounded-full bg-sky-500 shadow-lg` (logbook +, gear +, booking +) | Verify size, shadow, position from Figma |
| Icon button | TBD | `w-9 h-9 rounded-full bg-sky-500` (new chat +) | Verify |

**Action:** Create a shared `Button` component (`apps/mobile/src/components/Button.tsx`) that supports variants: `primary`, `secondary`, `danger`, `ghost`, `pill`. Apply Figma's exact radius, padding, font-weight, and color. Replace all inline `<Pressable>` button patterns with this component.

### Input Component (164 Figma instances)

| Property | Figma | Current Code | Action |
|---|---|---|---|
| Background | TBD | `bg-gray-100` (login/register) or `bg-gray-50` (edit profile) | Standardize to one value |
| Border | TBD | `border border-gray-200` | Verify color and width |
| Border radius | TBD | `rounded-lg` (8px) | Verify; Figma may use `rounded-xl` (12px) |
| Padding | TBD | `px-4 py-3` | Verify |
| Text color | TBD | `text-gray-900` | Verify |
| Placeholder color | TBD | `#9CA3AF` (gray-400) on login/register, `#A0AEC0` on edit profile | Standardize to one value from Figma |
| Label | TBD -- above input, semibold | `text-gray-700 font-semibold mb-2` (login) or `text-sm font-semibold text-gray-700 mb-2` (edit profile) | Standardize label style |
| Error text | TBD | `text-red-500 text-xs mt-1` | Verify |
| Focus state | TBD from Figma (likely border color change) | No focus styling in current code | Add focus ring or border-color change |

**Action:** Create a shared `Input` component (`apps/mobile/src/components/Input.tsx`) that wraps `TextInput` with label, error, and focus state. Replace all inline input patterns.

### Card / Surface Component

| Property | Figma | Current Code | Action |
|---|---|---|---|
| Border radius | TBD | Mixed: `rounded-lg` (8px) for most cards, `rounded-xl` (12px) for logbook entries and booking cards, `rounded-2xl` (16px) for weather hero | Standardize to Figma value |
| Border | TBD | `border border-gray-100` or `border border-gray-200` -- inconsistent | Pick one from Figma |
| Shadow | TBD from Figma `Background+Shadow` component | `shadow-sm` on logbook stat cards; inline `shadowColor/shadowOffset/shadowOpacity/shadowRadius` on FABs; no shadow on most cards | Implement Figma shadow tokens |
| Padding | TBD | `p-4` (16px) on most cards, `p-5` (20px) on booking detail cards, `p-6` (24px) on package detail headers | Standardize |
| Background | TBD | `bg-white` for most; gradient backgrounds (`bg-gradient-to-br from-sky-50 to-blue-50`) for stats and weather | Verify which cards get gradient vs. flat white |

### Avatar Component

| Property | Figma | Current Code | Action |
|---|---|---|---|
| Size (profile header) | TBD | `w-16 h-16` (64px) on profile tab, `w-24 h-24` (96px) on edit profile | Verify Figma sizes |
| Size (chat row) | TBD | `w-12 h-12` (48px) | Verify |
| Size (small / list) | TBD | `w-10 h-10` (40px) in new chat user list | Verify |
| Shape | TBD | `rounded-full` (circle) | Likely match |
| Fallback | TBD | Initials text on gradient background (`bg-gradient-to-br from-sky-400 to-blue-500`) | Verify fallback colors and text style from Figma |
| Image | TBD | No `<Image>` source wired for avatar anywhere -- all fallback initials currently | Wire real avatar image URL when available |

**Action:** Create a shared `Avatar` component (`apps/mobile/src/components/Avatar.tsx`) with `size` prop (`sm`, `md`, `lg`, `xl`), `imageUri`, `fallbackInitials`, and `fallbackColor`. Use across profile, chat, and instructor cards.

### Progress Indicator

| Property | Figma | Current Code | Action |
|---|---|---|---|
| Loading spinner | TBD | `<ActivityIndicator color="#0EA5E9" />` throughout | Verify spinner color and size from Figma |
| Progress bar (slots) | TBD | `h-1.5 bg-gray-200 rounded-full` with `bg-sky-500` fill (LoadCard) | Verify height, colors, radius |
| Progress bar (jumpability) | TBD | `h-2 bg-gray-200 rounded-full` with dynamic color fill (WeatherWidget) | Verify |
| Password strength | TBD | Five `h-2 rounded-full` segments with dynamic color | Verify if Figma has this pattern |
| Step indicator | TBD | `w-8 h-8 rounded-full` numbered circles with connecting lines (booking flow) | Verify against Figma; likely a dedicated stepper component |

---

## 5. Screen-by-Screen Matching

### Login Screen (Figma: 7:4635 -> Code: `(auth)/login.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Brand logo | Likely an image/SVG logo | Text-only `<Text className="text-4xl font-bold text-sky-500">SkyLara</Text>` | Replace with Figma logo asset |
| Tagline | TBD | `"Skydiving. Simplified."` in `text-gray-600 text-sm` | Verify text and size |
| Email input | Figma Input component | `bg-gray-100 px-4 py-3 rounded-lg border border-gray-200` | Match Figma Input spec (radius, bg, focus state) |
| Password input | Figma Input with show/hide toggle | Show/Hide toggle as inline `<Pressable>` with `text-sky-500` text | Verify toggle icon vs. text from Figma |
| Sign In button | Figma primary Button | `bg-sky-500 py-3 rounded-lg` | Match Figma Button radius, height, font-weight |
| OAuth buttons | Figma social buttons | Emoji placeholders (`🔵` for Google, `🍎` for Apple) | Replace with proper brand SVG icons |
| Biometric button | Figma biometric prompt | Emoji `👤` / `👆` in `w-16 h-16 rounded-full bg-sky-100` | Match Figma biometric button design; use proper FaceID/TouchID icons |
| Forgot Password link | TBD | `text-sky-500 text-sm font-medium`, right-aligned | Verify placement and style |
| Sign Up link | TBD | `"Don't have an account?" + "Sign Up"` at bottom | Verify |
| Overall layout | Figma Sign In Card | `px-6 py-12 justify-between` in a full-screen ScrollView | Check if Figma uses a centered card or full-bleed layout |

### Register Screen (Figma -> Code: `(auth)/register.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Screen title | TBD | `"Create Account"` in `text-3xl font-bold text-gray-900` | Verify size |
| Form fields | 6 fields: First Name, Last Name, Email, Phone, Password, Confirm Password | All using inline `<TextInput>` with `bg-gray-100 px-4 py-3 rounded-lg border border-gray-200` | Standardize with shared Input component |
| Password strength bar | TBD from Figma | Five colored segments below password field | Verify if Figma includes this |
| OAuth buttons | Figma social buttons | Same emoji placeholders as login | Replace with brand SVG icons |

### Home Screen (Figma: 9:4977 -> Code: `(tabs)/home.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Header bar | Figma TopAppBar | Custom inline header: user name (left) + CheckInToggle (right), with `border-b border-gray-100` | Replace with TopAppBar component; move check-in to appropriate location per Figma |
| Dropzone selector | TBD from Figma | `bg-gray-50 border border-gray-200 rounded-lg px-4 py-3` dropdown with bottom-sheet modal | Verify Figma placement and styling |
| Balance card | TBD | `bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg p-4 border border-sky-100` | Verify gradient, radius, padding |
| Tickets card | TBD | `bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100` | Verify |
| Weather widget | Figma weather component | `WeatherWidget` component: `bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-4 border border-sky-100` | Verify layout; Figma may show a more detailed weather card |
| Upcoming load card | TBD | `LoadCard` component: `bg-white rounded-lg border border-gray-200 p-4` | Verify load card design |
| Quick action tiles | TBD from Figma | 3x2 grid of `bg-gray-50 border border-gray-200 rounded-lg p-4 aspect-square` tiles with emoji icons | Verify tile count, layout, and whether Figma uses emoji or SVG icons |
| Empty load state | TBD | Airplane emoji + gray text | Verify |

### Profile Screen (Figma: 11:5167 -> Code: `(tabs)/profile.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Avatar section | Figma Avatar large | `w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500` with initials | Match Figma avatar size and style |
| User name | TBD | `text-xl font-bold text-gray-900` | Verify |
| Email | TBD | `text-sm text-gray-500 mt-1` | Verify |
| Tile grid | TBD from Figma | 2-column `FlatList` with 10 tiles (emoji icons, gradient backgrounds), each `aspect-square` | Verify Figma layout: may be a list instead of grid, or different tile count |
| Tile items | 10 tiles: Personal Details, License & Skills, Gear Locker, Documents, Transactions, Waivers, Notifications, Bookings, QR Check-In, Settings | Each tile: `bg-gradient-to-br {color} rounded-lg p-4 border border-gray-200` with emoji + label | Verify Figma tile names and icons |
| Sign Out button | TBD | `bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4 border border-red-200` | Verify style; Figma may use a simpler text link |

### Weather Screen (Figma: 36:9574 -> Code: `weather/index.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Day selector | TBD | Horizontal scroll of `px-4 py-2 rounded-full` pills: M, Tu, W, Th, Today, Sa, Su | Verify Figma day selector design |
| Weather hero card | TBD | `bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-8 border border-sky-100` with large emoji, temp, condition, wind | Verify Figma layout; may be a full-width hero instead of card |
| Jumpability timeline | TBD | Horizontal colored bar segments `h-12 bg-gray-100 rounded-lg` with hour labels | Verify if Figma has this exact pattern |
| Hourly forecast table | TBD | `bg-gray-50 rounded-lg border border-gray-200` with rows separated by `border-b border-gray-200` | Verify row height, columns, and data display |
| Weather hold banner | TBD | Currently hardcoded to `false`; `bg-red-50 border-red-200 rounded-lg` when active | Verify Figma alert banner design |
| Attribution | TBD | `text-xs text-gray-500 text-center` at bottom | Verify |

### Logbook Screen (Figma: 13:5878 -> Code: `(tabs)/logbook.tsx`)

Note: In Figma, Logbook is NOT a bottom tab. It will become a stack screen accessible from Home or Profile.

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Screen header | TBD TopAppBar | Inline: `text-2xl font-bold text-gray-900` "Logbook" + `text-sm text-gray-500` subtitle | Replace with TopAppBar if Figma shows one |
| Stats cards | TBD | Horizontal scroll of `bg-white rounded-xl p-4 min-w-[140px] border border-gray-100 shadow-sm` cards | Verify card size, shadow, scroll behavior |
| Filter chips | TBD | Horizontal scroll of `rounded-full border` pills (All, Belly, Freefly, etc.) | Verify chip style |
| Jump list items | TBD | `bg-white mx-4 mb-3 p-4 rounded-xl border border-gray-100 shadow-sm` with jump number badge, type pill, altitude/freefall stats | Verify card layout |
| FAB | TBD | `w-14 h-14 rounded-full bg-sky-500 shadow-lg` bottom-right | Verify FAB presence in Figma logbook |
| Empty state | TBD | Notebook emoji + "No Jumps Logged" + CTA button | Verify |

### Chat / Messages Screen (Code: `(tabs)/chat.tsx`)

Note: In Figma, Chat is NOT a bottom tab. It may be accessed from a different flow.

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Header | TBD | `text-2xl font-bold text-gray-900` "Messages" + new chat FAB `w-9 h-9 rounded-full bg-sky-500` | If Figma has no Chat tab, this screen moves to a stack route |
| Search bar | TBD | `bg-gray-100 rounded-xl px-3.5 py-2.5` with search icon + clear button | Verify |
| Channel list | TBD | `SectionList` with sections "Load Channels" and "Direct Messages"; each row has avatar + name + last message + time + unread badge | If Figma does not include a messaging feature, deprioritize |
| Swipe actions | TBD | Swipeable row with "Mute" action | Verify if Figma supports swipe gestures |
| New chat modal | TBD | Bottom sheet with user search | Verify |

### Gear Screen (Figma: 14:6232 -> Code: `profile/gear.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Gear list | TBD | Grouped by type (Container, Main, Reserve, etc.); each item is a `border rounded-lg p-4` card with brand/model, serial, status badge, jump count | Verify grouping and card layout from Figma |
| Status badges | TBD | `rounded-full px-3 py-1` with green/red/yellow backgrounds | Verify colors and text |
| Alert indicators | TBD | Colored circle emoji + "Action needed" / "Expiring soon" / "Repack due" | Verify Figma alert design; may use icon instead of emoji |
| Empty state | TBD | Parachute emoji + "No gear added yet" | Verify |
| FAB | TBD | `w-14 h-14 rounded-full bg-sky-500` bottom-right | Verify |

### Booking Flow (Figma: 39:10879-42:11751 -> Code: `booking/*`)

**Booking List (`booking/index.tsx`)**

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Filter tabs | TBD | `rounded-full` pills: Upcoming, Past, Cancelled | Verify |
| Booking card | TBD | `bg-white rounded-xl p-4 border border-gray-100` with type icon, status badge, date, price | Verify |
| FAB | TBD | `w-16 h-16 rounded-full bg-sky-500 shadow-lg` | Verify size (currently 64px, larger than other FABs at 56px) |

**New Booking (`booking/new.tsx`)**

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Step indicator | TBD | 4-step numbered circles with connecting lines | Verify stepper design from Figma |
| Jump type cards | TBD | `p-4 rounded-xl border-2` selection cards with emoji icon, title, description, price range | Verify card layout |
| Date picker | TBD | Custom calendar modal with month navigation, day grid | Verify calendar design; Figma may use a native date picker or different calendar layout |
| Time slots | TBD | `p-4 rounded-lg border` rows with time, available spots, "Available"/"Full" badge | Verify |
| Package selection | TBD | `p-4 rounded-xl border-2` cards similar to type selection | Verify |
| Review summary | TBD | `bg-white rounded-xl p-6 border border-gray-100` summary card with price breakdown | Verify |
| Payment method selector | TBD | Radio-style rows with circle indicator | Verify Figma radio/selection pattern |
| Terms checkbox | TBD | Custom checkbox: `w-5 h-5 rounded border-2` | Verify checkbox design |
| Confirm button | TBD | `bg-sky-500 py-4 rounded-xl` | Verify |

**Booking Detail (`booking/[id].tsx`)**

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Hero section | TBD | `bg-gradient-to-b from-sky-500 to-sky-400 px-6 pt-6 pb-8` with status badge, title, date, price | Verify gradient, layout |
| Detail cards | TBD | Multiple `bg-white rounded-xl p-5 border border-gray-100` cards for details, instructor, location, timeline | Verify card structure |
| Timeline | TBD | Vertical dot + line timeline | Verify Figma timeline component |
| QR code modal | TBD | Centered modal with QR code placeholder | Verify |
| Action buttons | TBD | "Rate", "Rebook", "Cancel" variants | Verify |

### Packages Screen (`booking/packages.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Filter chips | TBD | Horizontal scroll of `rounded-full` pills with emoji + label | Verify |
| Package card | TBD | `bg-white rounded-xl border border-gray-100` with gradient header (`bg-gradient-to-r from-sky-400 to-sky-500`), stats row, included items, CTA button | Verify gradient, layout, typography |
| Detail modal | TBD | Full-screen modal with price breakdown, included items, FAQ | Verify if Figma uses a modal or navigates to a new screen |

### Edit Profile Screen (`profile/edit.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Avatar section | TBD | `w-24 h-24 rounded-full` with initials + "Change Avatar" button | Verify |
| Form sections | TBD | "Personal Information" and "Emergency Contact" sections with `text-lg font-bold` headers | Verify section grouping |
| Input fields | TBD | `bg-gray-50 border border-gray-200 rounded-lg px-4 py-3` | Standardize with shared Input component |
| Save/Cancel buttons | TBD | `bg-sky-500 rounded-lg py-4` save, `bg-gray-100 rounded-lg py-4` cancel | Verify |

### Documents Screen (`profile/documents.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Document cards | TBD | Status-colored border cards with type label, upload date, expiry, status badge | Verify card layout |
| Action buttons | TBD | "View" and "Delete" side-by-side buttons in each card | Verify |
| Upload flow | TBD | Bottom sheet type picker modal | Verify |

### Settings Screen (`profile/settings.tsx`)

| Element | Figma | Current Code | Fix |
|---|---|---|---|
| Toggle switches | TBD | `<Switch>` with `trackColor: { false: '#E5E7EB', true: '#7DD3FC' }`, `thumbColor: '#0EA5E9'` | Verify colors from Figma |
| Segmented control (Units) | TBD | Two `rounded-lg py-2 border-2` buttons side-by-side | Verify; Figma may use a proper segmented control |
| Dropdown pickers | TBD | `bg-gray-50 border border-gray-200 rounded-lg px-4 py-3` with bottom arrow + modal picker | Verify |
| Danger zone | TBD | `bg-red-50 border-red-200 rounded-lg px-4 py-4` delete button | Verify |

---

## 5B. New Screens Needing Figma Design Alignment (Added April 2026)

The following 25 screens were built since the initial UI matching analysis. They are functional with real API integration but were built without Figma reference designs. They need retroactive Figma designs created and then UI alignment work.

### Screens with NO Figma equivalent (need designs created first)

| Route | Category | Design Priority | Notes |
|---|---|---|---|
| `coach/index` | Coaching | High | Coach dashboard -- high visibility for coach persona |
| `coach/assigned` | Coaching | High | Student roster -- core coach workflow |
| `coach/debrief` | Coaching | High | Post-jump debrief -- safety-adjacent, needs careful UI |
| `coach/sessions` | Coaching | Medium | Session history list |
| `coach/calendar` | Coaching | Medium | Calendar UI needs standard pattern |
| `discover/index` | Discovery | High | Discovery hub -- primary navigation entry point |
| `discover/[id]` | Discovery | High | Discovery detail -- DZ profile substitute |
| `events/index` | Events | High | Event hub -- maps to Figma Events List (16:9500) |
| `events/[id]` | Events | High | Event detail -- maps to Figma Event Detail (16:9600) |
| `learn/index` | Learning | Medium | Course catalog browse |
| `manager/index` | Management | Medium | Manager dashboard (staff-facing) |
| `manager/onboarding` | Management | Low | Staff onboarding (admin tool) |
| `manager/staff` | Management | Low | Staff directory (admin tool) |
| `manager/reports` | Management | Low | Reports dashboard (admin tool) |
| `ops/index` | Operations | Medium | Ops control center (staff-facing) |
| `ops/aircraft-schedule` | Operations | Medium | Aircraft scheduling (staff-facing) |
| `ops/announcements` | Operations | Low | Announcement management |
| `ops/incidents` | Operations | Medium | Incident tracking -- safety-critical UI |
| `onboarding/welcome` | Onboarding | High | Maps loosely to Figma onboarding Welcome screens |
| `onboarding/steps` | Onboarding | High | Maps to Figma 7-step onboarding flow (partial) |
| `stays/index` | Stays | Medium | Accommodation browse |
| `rig/[rigId]` | Gear | Medium | Rig detail with maintenance -- extends existing gear section |
| `(tabs)/bookings` | Tabs | High | Bookings tab -- primary tab, high visibility |
| `(tabs)/weather` | Tabs | High | Weather tab -- primary tab, high visibility |
| `careers/index` | Careers | Medium | Maps to Figma Jobs Browse (24:16000) |

### Screens that map to Figma but need visual alignment verification

These screens existed before but their Figma alignment status should be re-verified after the recent updates:

| Route | Figma Node | Alignment Status | Notes |
|---|---|---|---|
| `events/index` | 16:9500 | Needs verification | Built to match Figma Events List; verify filters and card layout |
| `events/[id]` | 16:9600 | Needs verification | Built to match Figma Event Detail; verify schedule and pricing sections |
| `careers/index` | 24:16000 | Needs verification | Built to match Figma Jobs Browse; verify filter chips and card design |
| `onboarding/welcome` | 4:9 (Coach variant) | Partial match | Generic welcome, not persona-specific as Figma shows |
| `onboarding/steps` | 4:110-4:700 | Partial match | Generic step flow, not persona-specific 7-step wizard |

---

## 6. Spacing & Layout Standards

### Grid System

| Property | Figma Value | Current Code | Action |
|---|---|---|---|
| Base width | 390px (iPhone 14/15 Pro) | Fluid; no fixed width | Confirm Figma artboard width |
| Standard horizontal padding | TBD (likely 20px or 24px) | Mixed: `px-5` (20px) on chat, `px-6` (24px) on most other screens | Standardize to one value |
| Card internal padding | TBD | Mixed: `p-4` (16px), `p-5` (20px), `p-6` (24px) | Standardize |
| Section spacing | TBD | Mixed: `mb-6` (24px), `mb-8` (32px), `gap-6` (24px) | Standardize |
| List item spacing | TBD | Mixed: `mb-3` (12px) between cards, `mb-4` (16px) between form fields | Standardize |

### Screen Dimensions

| Metric | Figma Value | Notes |
|---|---|---|
| Base width | 390px | iPhone 14/15 Pro viewport |
| Standard horizontal padding | TBD from Figma (measure) | Likely 16px, 20px, or 24px |
| Card border radius | TBD from Figma | Currently mixed: 8px, 12px, 16px |
| Button border radius | TBD from Figma | Currently mixed: 8px, 12px, 9999px (full) |
| Section spacing (vertical) | TBD from Figma | Currently mixed: 16px, 24px, 32px |
| Bottom tab safe area | TBD | Currently 8px top + 8px bottom padding inside tab bar |
| Modal sheet radius | TBD | Currently `rounded-t-3xl` (24px) |

### Spacing Scale (to verify against Figma)

| Token | Pixels | Tailwind | Usage |
|---|---|---|---|
| xs | 4px | `p-1`, `gap-1` | Tight element gaps |
| sm | 8px | `p-2`, `gap-2` | Badge padding, chip gaps |
| md | 12px | `p-3`, `gap-3` | List item spacing, card gaps |
| base | 16px | `p-4`, `gap-4` | Card padding, section gaps |
| lg | 20px | `p-5`, `gap-5` | Chat row padding |
| xl | 24px | `p-6`, `gap-6` | Screen horizontal padding |
| 2xl | 32px | `p-8`, `gap-8` | Section vertical spacing |

---

## 7. Implementation Checklist (Updated April 2026)

### Phase 0: Extract Figma Tokens
- [ ] Export color variables from Figma and cross-reference with `tailwind.config.js`
- [ ] Export typography styles (font family, sizes, weights, line-heights) from Figma
- [ ] Export spacing values (padding, margins, gaps) from Figma
- [ ] Export border-radius values from Figma
- [ ] Export shadow definitions from Figma `Background+Shadow` component
- [ ] Export icon assets from Figma as SVG files

### Phase 1: Shared Components
- [ ] Create `TopAppBar` component matching Figma TopAppBar (70 instances)
- [ ] Create `Button` component with variants matching Figma Button (613 instances)
- [ ] Create `Input` component matching Figma Input (164 instances)
- [ ] Create `Avatar` component matching Figma Avatar
- [ ] Create `ProgressBar` component matching Figma Progress Indicator
- [ ] Create `Card` component with surface variants (Background+Shadow, Background+Border)
- [ ] Create `Badge` / `Chip` component for status pills and filter chips
- [ ] Create `Overlay` component matching Figma Overlay surface (modal backdrops)

### Phase 2: Navigation Restructure
- [x] ~~Rename bottom tabs: Logbook -> Weather, Chat -> Bookings~~ DONE -- `(tabs)/weather.tsx` and `(tabs)/bookings.tsx` now exist
- [x] ~~Create new `(tabs)/weather.tsx` screen~~ DONE
- [x] ~~Create new `(tabs)/bookings.tsx` screen~~ DONE
- [ ] Move Logbook to stack route `logbook/index.tsx` (accessible from Home or Profile) -- logbook still also in tabs
- [ ] Move Chat to stack route `chat/index.tsx` (accessible from Home or Profile) -- chat still also in tabs
- [ ] Replace inline SVG tab icons with Figma-exported assets
- [ ] Add TopAppBar to all non-tab screens that Figma shows with a header
- [ ] Wire back navigation in TopAppBar using `router.canGoBack()` / `router.back()`
- [ ] Consolidate tab count from 6 to 4 per Figma (decide which 4 are primary)

### Phase 3: Auth Screens
- [ ] Replace "SkyLara" text-only logo with Figma logo asset on login
- [ ] Update login form layout to match Figma Sign In Card design
- [ ] Match button styles: verify border-radius, padding, font-weight against Figma
- [ ] Match input field styles: verify bg color, border, radius, placeholder color
- [ ] Replace emoji OAuth icons with proper Google/Apple brand SVGs
- [ ] Replace emoji biometric icon with proper FaceID/TouchID system icon
- [ ] Update register screen form layout to match Figma
- [ ] Add forgotten-password screen if Figma includes one (currently exists but needs matching)

### Phase 4: Tab Screens (Home, Weather, Bookings, Profile)
- [ ] Home: replace inline header with TopAppBar
- [ ] Home: match DZ selector card to Figma
- [ ] Home: match balance/ticket stat cards to Figma (gradient, radius, padding)
- [ ] Home: match WeatherWidget to Figma weather card
- [ ] Home: match LoadCard to Figma load card
- [ ] Home: match quick-action tile grid to Figma (icons, count, layout)
- [ ] Home: replace emoji icons on action tiles with Figma SVG icons
- [x] ~~Weather (new tab): migrate weather/index.tsx content or build fresh from Figma~~ DONE -- `(tabs)/weather.tsx` exists
- [ ] Weather: match day selector pills to Figma
- [ ] Weather: match hero weather card to Figma
- [ ] Weather: match jumpability timeline to Figma
- [ ] Weather: match hourly forecast table to Figma
- [x] ~~Bookings (new tab): migrate booking/index.tsx content or build fresh from Figma~~ DONE -- `(tabs)/bookings.tsx` exists
- [ ] Bookings: match filter tabs to Figma
- [ ] Bookings: match booking card to Figma
- [ ] Profile: match avatar section to Figma
- [ ] Profile: match tile grid layout (2-col vs. list, tile count, gradient vs. flat)
- [ ] Profile: replace emoji tile icons with Figma SVG icons
- [ ] Profile: match sign-out button to Figma

### Phase 5: Detail / Flow Screens
- [ ] Logbook list: update card layout to match Figma
- [ ] Logbook detail: update layout to match Figma
- [ ] Logbook add: update form to match Figma
- [ ] Chat list: update channel row to match Figma (if chat remains in scope)
- [ ] Chat detail: update message bubbles to match Figma (if chat remains in scope)
- [ ] Gear list: update grouped card layout to match Figma
- [ ] Gear detail: update layout to match Figma
- [ ] Documents list: update card layout and status badges to match Figma
- [ ] Edit profile: update form sections and avatar to match Figma
- [ ] Settings: update toggle, picker, and section layouts to match Figma
- [ ] Booking new: update step indicator, type cards, calendar, time slots, review to match Figma
- [ ] Booking detail: update hero, detail cards, timeline, QR modal to match Figma
- [ ] Packages browser: update card layout, gradient headers, filter chips to match Figma
- [ ] Notifications list: update to match Figma (if in scope)
- [ ] Check-in scan: update QR scanner to match Figma (if in scope)

### Phase 5B: New Screens Figma Alignment (Added April 2026)
- [ ] Events index: verify card layout, filter chips, search bar against Figma Events List
- [ ] Events detail: verify schedule, pricing, attendees sections against Figma Event Detail
- [ ] Careers index: verify job card layout, filter chips against Figma Jobs Browse
- [ ] Coach dashboard: create Figma design and align
- [ ] Coach assigned/debrief/sessions/calendar: create Figma designs and align
- [ ] Discover index and detail: create Figma designs and align
- [ ] Learn index: create Figma design and align
- [ ] Manager screens (4): create Figma designs and align (admin tools, lower priority)
- [ ] Ops screens (4): create Figma designs and align (staff tools, medium priority)
- [ ] Onboarding welcome: align with Figma persona-specific Welcome screens
- [ ] Onboarding steps: align with Figma 7-step persona flow
- [ ] Stays index: create Figma design and align
- [ ] Rig detail: create Figma design and align
- [ ] Safety emergency: create Figma design and align (high priority -- safety-critical UI)
- [ ] Safety report-incident: create Figma design and align (high priority -- safety-critical UI)
- [ ] Social leaderboard: create Figma design and align
- [ ] Social whos-going: create Figma design and align
- [ ] Payments wallet/history/buy-tickets: create Figma designs and align

### Phase 6: Global Polish
- [ ] Unify all hardcoded hex colors to use `brand-*` or Tailwind palette tokens
- [ ] Unify all placeholder colors (`#9CA3AF` vs. `#A0AEC0`) to one value
- [ ] Unify screen background: decide `bg-white` vs. `bg-gray-50` per Figma
- [ ] Unify card border: decide `border-gray-100` vs. `border-gray-200` per Figma
- [ ] Add focus states to all interactive inputs per Figma
- [ ] Add pressed/active states to all buttons (currently using `active:bg-*` and `active:opacity-*` inconsistently)
- [ ] Replace all emoji icons with Figma-exported SVG icons across every screen (now 62 screens)
- [ ] Install custom font if Figma specifies one (via `expo-font` + `tailwind.config.js` fontFamily)
- [ ] Add dark mode support if Figma includes dark theme variants
- [ ] Verify safe-area handling on all screens (`SafeAreaView` edges)
- [ ] Verify bottom padding on scrollable screens accounts for tab bar height
- [ ] Test all screens on iPhone SE (small), iPhone 14 Pro (standard), iPhone 14 Pro Max (large)

---

## 8. File Reference (Updated April 2026)

### Files that were renamed / restructured -- COMPLETED

| Original Path | Action | New Path | Status |
|---|---|---|---|
| `(tabs)/logbook.tsx` | Keep as-is; Weather added as separate tab | `(tabs)/weather.tsx` added | DONE |
| `(tabs)/chat.tsx` | Keep as-is; Bookings added as separate tab | `(tabs)/bookings.tsx` added | DONE |
| `(tabs)/_layout.tsx` | Updated with new tab definitions | (same file, edited) | DONE |

### Files that still need major rework (Figma alignment)

| File | Reason |
|---|---|
| `(tabs)/_layout.tsx` | Tab count is 6 but Figma shows 4; needs consolidation decision |
| `(tabs)/home.tsx` | Header, layout, and action tiles must match Figma |
| `(tabs)/profile.tsx` | Tile grid layout and icons must match Figma |
| `(auth)/login.tsx` | Logo, input styles, OAuth buttons must match Figma |
| `(auth)/register.tsx` | Input styles, OAuth buttons must match Figma |
| `events/index.tsx` | New screen -- verify against Figma Events List |
| `events/[id].tsx` | New screen -- verify against Figma Event Detail |
| `careers/index.tsx` | New screen -- verify against Figma Jobs Browse |
| `onboarding/welcome.tsx` | New screen -- needs persona-specific variants per Figma |
| `onboarding/steps.tsx` | New screen -- needs 7-step persona-specific flow per Figma |

### New shared components to create

| File | Purpose |
|---|---|
| `components/TopAppBar.tsx` | Reusable header bar matching Figma TopAppBar |
| `components/Button.tsx` | Reusable button with variants matching Figma Button |
| `components/Input.tsx` | Reusable form input matching Figma Input |
| `components/Avatar.tsx` | Reusable avatar matching Figma Avatar |
| `components/Card.tsx` | Reusable surface card matching Figma Background+Shadow / Background+Border |
| `components/Badge.tsx` | Reusable status badge / chip |

### Tailwind config update needed

File: `apps/mobile/tailwind.config.js`

Potential additions after Figma token extraction:
- `fontFamily` if custom font is specified
- `borderRadius` custom tokens if Figma uses non-standard radii
- `boxShadow` custom tokens from Figma shadow specs
- `fontSize` / `lineHeight` custom tokens if Figma typography does not align with Tailwind defaults
- Additional color tokens if Figma introduces colors not covered by current `brand-*` palette

---

## 9. Priority Order (Updated April 2026)

Navigation restructuring (step 3) is partially complete. Weather and Bookings tabs now exist. Remaining priorities:

1. **Extract Figma tokens** -- everything else depends on having exact values. STILL BLOCKED -- not yet done.
2. **Build shared components** -- TopAppBar, Button, Input, Avatar. These are used hundreds of times. STILL PENDING.
3. ~~**Restructure navigation**~~ PARTIALLY DONE -- Weather and Bookings tabs added. Consolidation from 6 tabs to 4 still needed.
4. **Auth screens** -- login and register are the first screens users see. Need Figma alignment.
5. **Home screen** -- the primary tab; highest visibility. Need Figma alignment.
6. ~~**Weather + Bookings tabs**~~ DONE -- both exist with real API integration.
7. **Profile screen** -- the fourth tab. Need Figma alignment.
8. **New screens Figma design creation** -- 25 new screens need retroactive Figma designs (coach, discover, events, ops, manager, safety, social, payments, learn, stays, onboarding).
9. **Detail screens** -- logbook, gear, booking flows, settings. Need Figma alignment.
10. **Global polish** -- color unification, icon replacement, dark mode, responsive testing. Now covers 62 screens instead of 37.
