# SKYLARA

_Source: 02_UX_Design_System.docx_

SKYLARA
The Global Operating System for Flying
UX DESIGN SYSTEM & DASHBOARD SPECIFICATIONS
Design Tokens · Component Library · 6 Role Dashboards · Mobile Patterns · Real-Time UX
v1.0  ·  April 2026  ·  CONFIDENTIAL
# Table of Contents
§1    DESIGN PHILOSOPHY
The Three Principles That Drive Every Decision
## 1.1  Core Principles
## 1.2  Visual Language
SkyLara sits at the intersection of aviation software (precision, reliability, no-nonsense data) and a consumer lifestyle app (beautiful, personal, community-driven). The design system is deliberately restrained — premium without being decorative. Think: the inside of a Boeing 787 cockpit if Apple designed it.
§2    DESIGN TOKENS
Color System · Typography Scale · Spacing · Shadows
## 2.1  Color System
### 2.1.1  Brand Palette
### 2.1.2  Semantic Status Colors
## 2.2  Load FSM State Colors
Every load state has a dedicated color combination for instant visual parsing on the load board. These are non-negotiable — color must be consistent across all screens.
## 2.3  Typography Scale
## 2.4  Spacing System (4px base unit)
## 2.5  Shadow System
§3    COMPONENT LIBRARY
Status Pills · Load Cards · Compliance Badges · Navigation · Forms
## 3.1  Status Pills
Status pills are the most frequently rendered component in the system. They appear on load boards, slot lists, compliance grids, gear checks, and notification lists. They must be instantly readable at small sizes and accessible to color-blind users.
## 3.2  Load Board Card
The Load Board Card is the primary operational unit. Every card represents one load. Cards are ordered by status urgency (time-critical first). Cards must be scannable in under 500ms — a staff member should never need to read text to understand load status.
## 3.3  Compliance Grid (8-Point Check)
Displayed at check-in. All 8 points shown simultaneously. Green check or red X for each. Failed points expand inline with the specific reason and suggested action.
## 3.4  Navigation Architecture
## 3.5  Real-Time UX Patterns
## 3.6  Offline UX Patterns
§4    MANIFEST STAFF DASHBOARD
The Most Critical Screen — Real-Time Load Board · Check-In · CG Gate
## 4.1  Screen Layout — Desktop (Primary)
## 4.2  Load Board Widget Specifications
## 4.3  Screen Layout — Mobile (Tablet / Phone Priority)
## 4.4  Critical Interaction: CG Check Flow
§5    DZ OPERATOR DASHBOARD
Command Center · Revenue · AI Intelligence · Staff Management
## 5.1  Screen Layout
## 5.2  Widget Specifications
§6    ATHLETE DASHBOARD
Mobile-First · Story Identity · Live Load Board View · Wallet
## 6.1  Mobile App Screen Layout
## 6.2  Widget Specifications
§7    INSTRUCTOR DASHBOARD
Student Management · AFF Evaluations · Load Schedule · Earnings
## 7.1  Screen Layout
## 7.2  Widget Specifications
§8    PILOT DASHBOARD
Flight View Only · Load Manifest · Aircraft Status · Boarding Confirm
## 8.1  Design Principle
## 8.2  Widget Specifications
§9    PLATFORM ADMIN DASHBOARD
SkyLara Internal · DZ Fleet · Revenue · Feature Flags · Support
## 9.1  Screen Layout
## 9.2  Widget Specifications
§10    ACCESSIBILITY & MOBILE
WCAG 2.1 AA · Touch Targets · Focus States · Breakpoints
## 10.1  Accessibility Requirements (WCAG 2.1 AA)
## 10.2  Responsive Breakpoints
## 10.3  Thumb Reach Zones (Mobile UX)
For right-handed users on a 390px phone, the safe thumb reach zone is roughly the bottom 60% of the screen. All primary actions (Add Slot, QR Check-In, Check-In Button, Pay Now) are placed in this zone. Secondary and tertiary actions are above the midpoint of the screen.
§11    DESIGN HANDOFF NOTES
Component Naming · Figma Structure · React Mapping
## 11.1  React Component Mapping
## 11.2  State Management Architecture

| Document Scope | Detail |
| --- | --- |
| Design Philosophy | Aviation-grade clarity + consumer app feel. Apple/Stripe level of polish. |
| Dashboards Specified | 6 roles: DZ Operator, Manifest Staff, Athlete, Instructor, Pilot, Platform Admin |
| Design System | Color tokens, typography scale, spacing system, shadow levels, component states |
| Real-Time UX | WebSocket update patterns, loading states, optimistic UI, conflict resolution UI |
| Offline UX | Offline indicator, degraded mode, sync progress, queued action feedback |
| Mobile Strategy | Mobile-first for Athletes and Manifest Staff. Responsive breakpoints defined. |
| Accessibility | WCAG 2.1 AA target. Color contrast ratios, focus states, touch targets documented. |
| Implementation | React component structure mapped to each dashboard widget |

| Principle | What It Means | What It Rules Out |
| --- | --- | --- |
| Operational Clarity | Every screen must communicate the most critical information at a glance. A manifest staff member should know the status of every active load in under 2 seconds. | Decorative elements that add visual noise. Animations that delay critical information. Clever but ambiguous iconography. |
| Zero Cognitive Load | The system should never make a user think about what to do next. Primary actions are always the most prominent element. Error states say exactly what to fix. | Hamburger menus for primary actions. Modal dialogs for status info. Acronyms without labels on first occurrence. |
| Mobile-First Respect | Manifest staff use tablets. Athletes use phones. Every interaction is designed for thumb reach zones first, then scaled up for desktop. | Hover-only interactions. Right-click context menus. Fine print below the fold. Scroll-to-find primary actions. |

| Element | Decision | Why |
| --- | --- | --- |
| Primary Font | Inter (system-ui fallback) | Maximum legibility at all sizes, renders perfectly on every OS, variable font for weight control |
| Monospace Font | JetBrains Mono / Courier New fallback | Load IDs, ticket numbers, slot counts — must read as numbers at a glance |
| Border Radius | 6px default, 12px for cards, 999px for pills | Sharp enough to feel serious, rounded enough to feel modern |
| Shadow System | 4 levels: none, sm (cards), md (dropdowns), lg (modals) | Depth communicates hierarchy, not decoration |
| Animation | 200ms ease-out for state changes, 0ms for data updates | Data must update instantly — no animation delay on critical info |
| Icon Library | Lucide React (consistent, open, scalable) | Aviation-industry icons supplemented by Lucide set |

| Color | Name | Hex | Primary Usage | Contrast Notes |
| --- | --- | --- | --- | --- |
|  | Navy | #0F2645 | Navigation, section headers, table headers, CTA backgrounds | White text: 12.1:1 ✓ AAA |
|  | Blue | #1A4F8A | Sub-headers, active states, informational accents | White text: 7.2:1 ✓ AA |
|  | Sky | #0EA5E9 | Accent color, links, interactive elements, progress | Dark text: 3.1:1 on white bg |
|  | Slate BG | #F1F5F9 | Page background, alternating table rows | N/A — background only |
|  | Surface | #FFFFFF | Card backgrounds, input fields, modals | Base — all content renders here |
|  | Border | #D1D5DB | Table borders, dividers, input borders | N/A — structural only |
|  | Dark Text | #1E293B | Body text, headings, labels | 4.5:1+ on white ✓ AA |
|  | Mid Text | #64748B | Supporting text, captions, placeholders | 4.5:1 on white ✓ AA |

| Color | Name | Hex | Usage | Examples |
| --- | --- | --- | --- | --- |
|  | Success Green | #10B981 | PASS, COMPLETE, CURRENT, active, good to go | Currency valid, CG pass, load complete |
|  | Success BG | #ECFDF5 | Success badge backgrounds, success banners | Compliance check passed |
|  | Warning Amber | #F59E0B | MARGINAL, WARNING, advisory, attention needed | CG marginal, currency warning, waitlist |
|  | Warning BG | #FFFBEB | Warning badge backgrounds, advisory banners | 30-day reserve repack warning |
|  | Danger Red | #EF4444 | FAIL, BLOCKED, EXPIRED, safety critical | CG fail, expired license, weight over limit |
|  | Danger BG | #FEF2F2 | Danger badge backgrounds, error states | Compliance block, boarding denied |
|  | Purple | #8B5CF6 | AI insights, predictive features, smart suggestions | AI load optimizer, predictive schedule |
|  | Teal | #0D9488 | System responses, real-time updates, online status | WebSocket connected, sync complete |
|  | Orange | #F97316 | Offline mode, degraded state, queued actions | Offline banner, sync pending badge |

| OPEN | FILLING | LOCKED | 30MIN | 20MIN | 10MIN | BOARDING | AIRBORNE | LANDED | COMPLETE | CANCELLED |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Token | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| text-xs | 12px / 9pt | 400 / 500 | 1.4 | Timestamps, metadata, fine print |
| text-sm | 14px / 10pt | 400 / 500 | 1.5 | Supporting labels, captions, table cell text |
| text-base | 16px / 12pt | 400 / 600 | 1.6 | Body text, form labels, button text |
| text-lg | 18px / 13pt | 500 / 600 | 1.5 | Subheadings, card titles, list items |
| text-xl | 20px / 15pt | 600 / 700 | 1.4 | Section headings, widget titles |
| text-2xl | 24px / 18pt | 700 | 1.3 | Dashboard section titles, modal headers |
| text-3xl | 30px / 22pt | 700 / 800 | 1.2 | Key metrics (load count, revenue) |
| text-4xl | 36px / 27pt | 800 | 1.1 | Hero numbers, large counters |
| mono-sm | 13px | 500 | 1.4 | IDs, codes, ticket numbers, seat counts |
| mono-lg | 18px | 600 | 1.3 | Load numbers, slot counts on load board |

| Token | Value | Usage |
| --- | --- | --- |
| space-1 | 4px | Icon-to-text gap, tight list item spacing |
| space-2 | 8px | Badge padding, compact button padding |
| space-3 | 12px | Standard list item gap, input padding |
| space-4 | 16px | Card padding (mobile), section element spacing |
| space-5 | 20px | Card padding (desktop), form group spacing |
| space-6 | 24px | Section padding, between-card gap |
| space-8 | 32px | Between dashboard sections |
| space-12 | 48px | Page-level padding, major section separation |

| Level | CSS Value | Usage |
| --- | --- | --- |
| shadow-none | none | Flat elements — table rows, list items, pills |
| shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | Cards at rest — load board cards, stat cards |
| shadow-md | 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06) | Dropdowns, tooltips, hover state on cards |
| shadow-lg | 0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05) | Modals, drawers, floating panels |
| shadow-ring | 0 0 0 3px rgba(14,165,233,0.30) | Focus ring for all interactive elements (WCAG AA) |

| State | Background | Text Color | Icon | Usage |
| --- | --- | --- | --- | --- |
| PASS / CURRENT | #ECFDF5 | #065F46 | ✓ check | Compliance OK, CG pass, currency valid, gear check pass |
| FAIL / EXPIRED | #FEF2F2 | #991B1B | ✕ x-mark | Compliance block, CG fail, currency expired, gear grounded |
| MARGINAL / WARNING | #FFFBEB | #92400E | ⚠ warning | CG marginal, currency 14-day warning, weight advisory |
| PENDING | #F8FAFC | #64748B | ○ circle | Waiting for action — gear check not done, sign-off pending |
| MANIFESTED | #DBEAFE | #1E40AF | ◉ dot | Athlete on load, not yet checked in |
| CHECKED IN | #EDE9FE | #5B21B6 | ✓ check-filled | Athlete checked in and compliant |
| JUMPED | #ECFDF5 | #065F46 | ↓ arrow-down | Jump completed and logged |
| NO SHOW | #FFF7ED | #9A3412 | — dash | Slot forfeited, waitlist triggered |
| AIRBORNE | #ECFDF5 | #065F46 | ↑ arrow-up + pulse | Load in the air — animated pulse dot |
| OFFLINE | #FFF7ED | #9A3412 | wifi-off | Offline mode active — orange banner variant |

| Zone | Content | Design Rule |
| --- | --- | --- |
| Status strip (top, 4px) | Colored bar in FSM state color (see §2.2) | No text — pure color signal. First thing eyes hit. |
| Header row | Load # (mono) · Aircraft tail · Altitude badge | Bold mono font for load number. Tail in secondary text. |
| Slot counter | [filled]/[total] large (e.g. "14/15") · progress bar | Slot fill %  shown as linear progress bar — full = complete |
| Status badge | Current FSM state pill (e.g. "30 MIN") | State color badge — matches status strip color |
| Call time | Time display + countdown (e.g. "2:14 remaining") | Countdown in amber when <5min. Red when <2min. |
| Exit summary | "9 groups: RW(4) Freefly(3) Tandem(2)" | Compact — tap to expand full exit order |
| Quick actions | [Add Slot] [CG Check] [Advance State] — contextual | Actions change based on current FSM state |
| AI badge (optional) | Purple dot + "AI suggestion available" | Only shown when ai_insights exist for this load |

| Point | Icon | Pass Condition | Fail Message Template |
| --- | --- | --- | --- |
| License Valid | ◆ shield | license.is_active = true AND not expired | License [TYPE] expired on [DATE]. Athlete cannot be manifested. |
| Currency | ⟳ refresh | days_since_jump ≤ license_threshold | Last jump [N] days ago. [LICENSE] requires jump within [LIMIT] days. Suspended. |
| Weight | ⚖ scale | athlete.weight_lbs ≤ dz.weight_limit_for_jump_type | Self-reported weight [N] lbs exceeds limit of [LIMIT] lbs for [JUMP_TYPE]. |
| Waiver | ✍ signature | waiver_signatures exists for this DZ + today | No waiver on file for [DZ]. Tap to present digital waiver. |
| USPA Membership | ⬡ badge | uspa_membership_active AND expiry > today | USPA membership expired [DATE]. Contact staff to update. |
| Reserve Repack | 📦 box | days_since_repack ≤ 180 (or DZ limit) | Reserve last repacked [DATE], [N] days ago. Limit is [LIMIT] days. |
| AAD Status | ⚡ bolt | aad_expiry_date > today AND aad_service_date OK | AAD [MODEL] expired [DATE]. Grounded until serviced. |
| Gear Check | 🔧 wrench | gear_check for this load/session = PASS | No gear check on file for this session. See rigger before boarding. |

| Role | Primary Nav | Secondary Nav | Mobile Nav Pattern |
| --- | --- | --- | --- |
| DZ Operator | Operations · Revenue · Staff · Aircraft · Settings | AI Insights · Reports · Announcements | Bottom tab bar (5 tabs) + FAB for quick actions |
| Manifest Staff | Load Board · Check-In · Gear Check · Waitlist | Load History · Staff Roster | Full-screen Load Board default + bottom sheet for actions |
| Athlete | Home (loads) · Logbook · Story · Wallet · Shop | Profile · Gear · Achievements | Bottom tab bar (5 tabs) — thumb-zone optimized |
| Instructor | My Students · My Loads · Evaluations · Earnings | Schedule · Certifications | Bottom tab bar (4 tabs) |
| Pilot | My Loads (view only) · Flight Log | Aircraft Status | Minimal — 2 tab bottom bar |
| Platform Admin | DZ Fleet · Revenue · Usage · Feature Flags · Support | Audit Log · Billing | Desktop-only — sidebar navigation |

| WEBSOCKET RULE | Data that changes in real-time (load status, slot count, call times) MUST update without requiring a refresh. The UI must never show stale operational data. Optimistic updates are applied immediately; server confirmation arrives within 500ms. |
| --- | --- |

| Pattern | Trigger | Visual Treatment | Duration |
| --- | --- | --- | --- |
| State Change Flash | Load status changes via WebSocket | Card background flashes sky-blue (#E0F2FE) then fades to new state color | 200ms flash, 800ms fade |
| Slot Counter Update | Slot added or removed | Counter number "bumps" (scale 1.0→1.15→1.0) + color flashes green/red | 300ms bump animation |
| New Load Appearing | Load created and pushed via WebSocket | Card slides in from top of load board with gentle fade-in | 250ms slide-in |
| Optimistic Update | User adds slot before server confirms | Slot appears immediately with "syncing" pulse indicator | Until server ACK (≤500ms) |
| Conflict Resolution | Server rejects optimistic update | Slot card shakes + reverts + shows toast: "Slot already taken — refreshed" | 400ms shake, toast 4s |
| CG Verified Flash | CG PASS signed off on locked load | "CG VERIFIED" green banner appears across load card for 3s | 3s then fades |
| Call Time Countdown | <5 minutes to call time | Countdown text turns amber, then red at <2min. Subtle pulse. | Continuous, updates every second |
| Airborne Pulse | Load status = AIRBORNE | Green status strip gains subtle pulse animation | Continuous while AIRBORNE |
| New AI Insight | ai_insights created for this DZ | Purple dot appears on load card + banner notification bottom right | Persistent until acknowledged |

| State | UI Indicator | Degraded Capabilities | Recovery UX |
| --- | --- | --- | --- |
| Offline Detected | Orange banner: "Working offline — manifest cached. Payments unavailable." | View loads (cached), add slots (queued), run gear checks (queued) | Banner updates: "Reconnecting..." with spinner |
| Sync in Progress | Teal banner: "Syncing [N] changes..." with progress indicator | Full capability restored | Banner clears when sync complete |
| Sync Complete | Brief teal toast: "Synced — all changes saved" (auto-dismiss 3s) | Full capability | No persistent UI change |
| Sync Conflict | Modal: "Load #14 changed while offline. Your slot assignment was rejected. Review?" | Review screen shows conflict details and server state | User confirms; UI resets to server state |
| Payment Blocked Offline | Payment button is disabled with tooltip: "Payments require a connection" | Clear reason, no silent failure | Button re-enables automatically when online |
| Stale Data Warning | Weather data >10min old shows amber "⚠ 12min ago" timestamp | Data still shown, clearly labelled as stale | Auto-refreshes on reconnect |

| DESIGN PRIORITY | The Manifest Staff Dashboard is the highest-stakes screen in the system. Every design decision must prioritize operational speed and safety clarity over aesthetics. Staff must be able to process a check-in, assign a slot, and advance a load state in under 30 seconds. |
| --- | --- |

| MANIFEST STAFF — DESKTOP LAYOUT ZONES | Zone 1: Navigation Sidebar (240px fixed): DZ logo, quick stats (loads active, athletes checked in, weather), nav links Zone 2: Top Bar (56px): Branch selector, offline indicator, weather pill, AI insights badge, staff avatar Zone 3: Load Board (main panel, scrollable): All active loads as cards in a responsive grid (3 cols desktop, 2 tablet, 1 mobile) Zone 4: Quick Action Rail (320px right panel): Add Slot search, Waitlist queue, Recent check-ins, AI suggestions Zone 5: Bottom Status Bar (32px): WebSocket status, sync indicator, last update timestamp |
| --- | --- |

| Widget | Type | Grid Size | Pri | Description |
| --- | --- | --- | --- | --- |
| Active Load Counter | Stat badge | Compact header | P0 | Total loads in OPEN→BOARDING states. Taps → filters load board to active only. |
| Weather Pill | Status pill | Header | P0 | Current conditions: VFR (green) / MVFR (amber) / IFR/LIFR (red). Taps → weather detail panel. |
| Load Card | Card + real-time | Full grid unit | P0 | Full load state: status, slots, aircraft, call time, exit summary, CG status, quick actions. WebSocket-driven. |
| CG Check Gate | Modal + form | Full modal | P0 | Triggered from Load Card when LOCKED state. Weight inputs, auto-calculation, sign-off button. |
| Add Slot Panel | Search + assign | Right rail panel | P0 | Athlete search (name/USPA#), compliance result, jump type selector, load picker, confirm button. |
| Compliance Grid | 8-point checklist | Inline in Add Slot | P0 | All 8 compliance points shown. Failures expand with reason + action. Override requires reason input. |
| Call Time Override | Time picker + send | Action in card | P0 | Manual send of push/SMS for any call time state. Timestamp logged. |
| Waitlist Queue | Ordered list | Right rail section | P1 | Current waitlist per load. Shows position, athlete name, jump type. Countdown on claim window. |
| AI Risk Alerts | Alert banner | Top of load board | P1 | Purple card: alert type, affected load, recommendation, accept/dismiss actions. |
| Offline Banner | Status banner | Top of screen | P0 | Orange banner when offline. Shows queued change count. Disappears on reconnect + sync. |
| Exit Order Panel | Sortable list | Load card → detail | P0 | Groups 1-9 with jump type, count, and order. Drag to reorder (logs override). Edit locked once BOARDING. |
| Load Notes | Textarea + log | Load card → notes | P1 | Staff notes history, newest first. Timestamped, author shown. |
| Staff Roster Strip | Avatar list | Header area | P1 | On-duty staff avatars. Tap → see assignments. Shows TI count, loads assigned. |
| EOD Summary | Stats card | Pinned footer (collapsible) | P1 | Today: revenue, jumps, load count, cancellations. Tap → full EOD report. |

| MANIFEST STAFF — MOBILE (TABLET) LAYOUT ZONES | Zone 1: Top App Bar (56px): DZ name, weather pill (tap-to-expand), branch selector icon, profile icon Zone 2: Offline Banner (conditional, 48px): Only shown when offline — orange background, sync status Zone 3: Full-Screen Load Board: Single-column cards. Pull-to-refresh. Swipe card left → quick actions sheet. Zone 4: Floating Action Button (FAB, bottom-right): "+ Add Slot" — most common action. Always visible. Zone 5: Bottom Sheet (modal on demand): Check-in search, compliance grid, slot assignment — slides up from bottom Zone 6: Bottom Tab Bar: Load Board · Check-In · Gear Check · Staff (4 tabs) |
| --- | --- |

| Step | Screen Element | User Action | System Response |
| --- | --- | --- | --- |
| 1 | Load card in LOCKED state | Staff taps "CG Check" button (amber badge on card) | CG Check modal opens with form pre-filled from load data (slot weights from athlete records) |
| 2 | CG Modal — Weight Inputs | Enter: Pilot weight, fuel (gallons auto-converts to lbs), confirm jumper weight sum (editable) | Running total updates in real-time as inputs change. Aircraft CG envelope shown visually. |
| 3 | CG Modal — Calculate | Tap "Calculate CG" | Result displayed: PASS (green) / MARGINAL (amber + warning) / FAIL (red + block reason) |
| 4a | PASS result | Tap "Sign Off & Advance to 30MIN" | cg_check record written. Load transitions to 30MIN. 30-min push/SMS sent to all athletes. Modal closes. Load card updates. |
| 4b | MARGINAL result | Review marginal warning, then choose: Accept + advance OR adjust weights | Marginal accepted → PASS equivalent. Reason logged. Same flow as PASS. |
| 4c | FAIL result | Cannot advance. Must adjust: remove athlete, reduce fuel, or get DZ Operator override | Red block state. Override option visible to DZ_OPERATOR role only. Requires reason (min 10 chars). |

| DZ OPERATOR — DESKTOP LAYOUT ZONES | Zone 1: Top Header (72px): DZ name + logo, branch switcher, today's date/weather, notification bell, profile Zone 2: Hero Metrics Strip (120px): 4 large stat cards — Loads Active, Revenue Today, Athletes On-Site, Staff On-Duty Zone 3: Main Grid (3 columns): Left=Live Operations mini-board (60%), Center=Revenue + AI (25%), Right=Staff + Aircraft (15%) Zone 4: AI Insights Panel: Scrollable list of current insights by priority. Each with accept/dismiss + detail expansion. Zone 5: Announcements Composer (bottom section): Rich text + target audience + send controls Zone 6: Quick Navigation Footer: Jump to Reports · Bookings · Shop · Settings |
| --- | --- |

| Widget | Type | Grid Size | Pri | Description |
| --- | --- | --- | --- | --- |
| Hero Revenue Card | Stat + sparkline | Full width | P0 | Today's gross revenue vs target. Sparkline of last 7 days. Tap → revenue breakdown modal. |
| Live Load Mini-Board | Read-only card grid | Main panel | P0 | Compact version of load board. Status pills only — no actions. Tap load → opens full manifest view. |
| Aircraft Status Grid | Status cards | Right panel | P0 | Each aircraft: tail, type, status badge, next MX date, jumps today. MX Hold shown in red. |
| Staff On-Duty Panel | Avatar + stats list | Right panel | P0 | Each on-duty staff: name, role, tandem count today, load assignments. Off-duty grayed out. |
| AI Insights Feed | Priority card list | Center panel | P1 | Sorted: CRITICAL → HIGH → MEDIUM. Each card: insight type, summary, recommendation, action buttons. |
| Revenue Breakdown | Donut chart + table | Center panel | P1 | Jump type breakdown: Tandem %, Fun Jump %, AFF %, Rental %. Hover → exact revenue per type. |
| Weather Timeline | 24-hour forecast bar | Below hero strip | P0 | Hourly suitability: green/amber/red bars. Wind + cloud base per hour. Jump window highlighted. |
| Booking Queue | List view | Center panel | P1 | Today's confirmed bookings: time, name, type, assigned TI. Tap → booking detail. |
| Announcement Composer | Rich text + sender | Bottom section | P1 | Write announcement → select audience (all checked-in / all DZ members / specific role) → send push. |
| EOD Trigger | Button + preview | Footer | P0 | Trigger end-of-day report generation. Preview reconciliation. Approve and send to operator email. |

| MOBILE FIRST | The Athlete Dashboard is designed for a 390px wide phone screen first. Every widget must fit within a single column. Thumb reach zones govern tap target placement. Primary actions are always at bottom of screen. |
| --- | --- |

| ATHLETE — MOBILE APP (390px) LAYOUT ZONES | Zone 1: Tab Bar (bottom, 56px + safe area): Home · Logbook · Story · Wallet (4 primary tabs) Zone 2: Home Tab — Active Slot Banner: If on a load, shows load #, call time, status in full-width banner at top Zone 3: Home Tab — Live Load Board: Current open loads at this DZ. Compact cards: status pill, aircraft, altitude, slots left. Tap → slot detail + "Join Waitlist" button. Zone 4: Home Tab — DZ Announcements: Horizontal scroll cards for DZ news, weather holds, events. Zone 5: Home Tab — Quick Stats: Jump count this year, wallet balance, currency status badge. Zone 6: Logbook Tab: Reverse-chronological jump list. Each entry: jump #, DZ, altitude, type, coach sign-off badge. Tap → full entry + story share option. Zone 7: Story Tab: Athlete profile hero + jump timeline + achievement badges. Social feed below. Zone 8: Wallet Tab: Balance display, buy tickets CTA, transaction history list. |
| --- | --- |

| Widget | Type | Grid Size | Pri | Description |
| --- | --- | --- | --- | --- |
| Active Slot Banner | Alert card | Full width, top | P0 | Shows when athlete is on a load. Load #, call time countdown, "Your slot: Exit Group 4". Color matches load FSM state. |
| Load Board (athlete view) | Read-only cards | Full width scroll | P0 | Open loads at current DZ. Tap → slot detail. "Join Waitlist" on full loads. No staff actions shown. |
| QR Check-In Button | FAB-style button | Bottom right | P0 | Large circular button with QR icon. Taps → full-screen QR code for staff to scan. Works offline (cached). |
| Currency Status Badge | Status pill + detail | Profile card | P0 | CURRENT (green) / WARNING (amber) / EXPIRED (red). Tap → "Last jumped N days ago. Renew by [DATE]." |
| Jump Number Hero | Large stat | Profile card top | P0 | Jump count in large mono font (e.g. "2,847"). Tap → logbook filter. |
| Wallet Balance | Balance + buy CTA | Wallet tab hero | P0 | Current balance in jump tickets + cash equivalent. "Buy Tickets" CTA immediately below. |
| Milestone Progress | Progress bars | Story tab | P1 | Next milestone (e.g. "73 jumps to 500"). Progress bar. Tap → achievement detail. |
| Achievement Badges | Horizontal scroll grid | Story tab | P1 | Earned badges in horizontal scroll. Tap badge → detail card with earn date and share button. |
| Jump Timeline | Chronological feed | Logbook + Story tabs | P0 | Jump entries + milestone cards. Each entry: DZ logo, jump type icon, altitude, coach badge. Tap → full detail. |
| Gear Status | Card list | Profile → Gear | P1 | Reserve repack countdown ring. AAD expiry ring. Each gear item with status badge. Alert on <30 days. |
| Social Feed | Post card list | Story tab | P1 | Posts from followed athletes and DZ announcements. Like, comment, share. Post composer at top. |

| INSTRUCTOR — MOBILE (PRIMARY DEVICE) LAYOUT ZONES | Zone 1: Top Bar: "Good morning, Jake. 3 students today." — Personalized greeting with today's context. Zone 2: My Students Today (primary section): Cards per student — name, jump type, load assignment, call time, status badge. Zone 3: Evaluation Queue: Jumps completed but not yet evaluated. Each shows athlete, level, "Evaluate Now" button. Zone 4: My Load Schedule: Timeline view of today's assigned loads. Horizontal scroll, color-coded by status. Zone 5: Quick Evaluation Modal (FAB): Post-jump evaluation launcher. Most used action — must be reachable in 2 taps. Zone 6: Bottom Tab Bar: Students · Schedule · Evaluations · Earnings |
| --- | --- |

| Widget | Type | Grid Size | Pri | Description |
| --- | --- | --- | --- | --- |
| Student Today Card | Summary card | Full width | P0 | Student name, type (TANDEM/AFF), load #, call time, status. "Debrief" button post-jump. |
| AFF Level Tracker | Progress strip | Student detail | P0 | 8-level progress bar per AFF student. Completed levels green, current amber, future gray. |
| Quick Eval Form | Bottom sheet form | Modal | P0 | Per-skill pass/fail grid (AFF checklist). Notes field. Pass/Fail/Retrain selector. Sign-off submit. |
| Earnings Today | Stat card | Earnings tab | P1 | Tandem count × rate + AFF count × rate = today's estimate. Week and month totals below. |
| Load Timeline | Horizontal timeline | Schedule tab | P1 | Today's loads in chronological order. Current load highlighted. Tap → slot detail. |
| Student History | List with search | Student detail | P2 | All past students. Filter by type, date. Tap → full evaluation history per student. |

| PILOTS DO NOT MANIFEST | Pilots have a VIEW-ONLY interface for load manifests. Their primary actions are: (1) Confirm boarding complete, (2) Log takeoff, (3) Log landing. The interface must be minimal and distraction-free. A pilot managing a load board mid-flight is a safety hazard. |
| --- | --- |

| Widget | Type | Grid Size | Pri | Description |
| --- | --- | --- | --- | --- |
| Today's Load List | Simple list | Full screen | P0 | Loads assigned to this aircraft: load #, altitude, slot count, status, scheduled time. Read-only. |
| Current Load Detail | Full-screen card | Main view | P0 | Full exit order with group count, jump types. Pilot briefing data. Weight + CG summary. |
| Boarding Confirm | Large button | Bottom CTA | P0 | Prominent "Confirm All Boarded" button. Advances load to AIRBORNE when tapped. Double-confirm required. |
| Aircraft Status | Status card | Top of screen | P0 | Aircraft tail, type, MX status, next scheduled MX date. Grounded = red banner. |
| Flight Log | History list | Secondary tab | P1 | Past flights: date, load, jumpers, altitude, flight time. Used for logbook and billing. |

| PLATFORM ADMIN — DESKTOP ONLY LAYOUT ZONES | Zone 1: Left Sidebar (240px fixed): SkyLara logo, nav links by domain (DZs, Revenue, Usage, Feature Flags, Audit, Billing, Support) Zone 2: Top Bar: Global search, environment badge (Production), admin avatar, notifications Zone 3: Dashboard Hero: Platform-wide KPIs — Active DZs, MRR, Total Athletes, Jumps This Month, Platform Revenue Zone 4: Main Content Area: Changes per nav section. Table-heavy. Filters, search, export available on all data tables. Zone 5: Audit Log Sidebar (collapsible right): Recent override_log entries. Real-time stream. |
| --- | --- |

| Widget | Type | Grid Size | Pri | Description |
| --- | --- | --- | --- | --- |
| DZ Fleet Table | Data table + filters | Main content | P0 | All DZs: name, plan tier, status, MRR, last login, jump count this month. Click row → DZ detail. |
| MRR Trend Chart | Line chart | Hero section | P0 | Monthly recurring revenue over 12 months. Annotated with feature releases and DZ onboardings. |
| Usage Heatmap | Calendar heatmap | Usage tab | P1 | Jump counts by day across all DZs. Dark = high volume days. Identifies seasonal patterns. |
| Feature Flag Manager | Toggle table | Feature Flags tab | P0 | All feature flags: name, description, enabled globally, per-DZ overrides. Toggle inline. |
| Override Log Stream | Real-time list | Audit tab | P1 | Last 100 override_log entries across all DZs. Filter by override_type, DZ, user. |
| Support Queue | Prioritized list | Support tab | P1 | Flagged anomalies, DZ complaints, compliance alerts. Each with severity, DZ, and action buttons. |

| Requirement | Standard | Implementation |
| --- | --- | --- |
| Color Contrast — Body text | 4.5:1 minimum ratio | #1E293B on #FFFFFF = 14.3:1 ✓. All text colors verified. |
| Color Contrast — Large text | 3.0:1 minimum | All heading/large text combinations verified at 3.0:1+ |
| Color Contrast — UI components | 3.0:1 for interactive elements | Status pills verified: all badge combos meet 3.0:1+ |
| Never color alone for status | Must provide text or icon alongside color | All status pills include text label. Compliance grid has icon + text + color. |
| Touch target size | 44×44px minimum (WCAG 2.5.5) | All tap targets: 48px minimum. Load card action buttons: 48px height. |
| Focus ring | Visible on all interactive elements | Sky-blue ring: 0 0 0 3px rgba(14,165,233,0.30). Applied globally via CSS :focus-visible. |
| Keyboard navigation | All interactive elements keyboard-reachable | Tab order follows visual order. Load board navigable with arrow keys. |
| Screen reader labels | aria-label on icon-only buttons | All icon buttons have aria-label. Status pills have aria-live="polite" for updates. |
| Skip navigation | Skip-to-main-content link | Present on all pages — visible on focus, hidden at rest. |
| Form labels | All inputs have associated labels | No placeholder-only labels. Error messages associated via aria-describedby. |

| Breakpoint | Width | Grid | Primary Users | Layout Changes |
| --- | --- | --- | --- | --- |
| Mobile S | 320–390px | 1 col | Athletes on small phones | Single column. Bottom tab bar. Compact cards. FAB for primary action. |
| Mobile L | 391–430px | 1 col | Athletes, staff on phone | Same as Mobile S with slightly more padding. |
| Tablet P | 768–1023px | 2 col | Manifest staff on tablet (primary work device) | 2-column load board. Bottom sheet for actions. Side panel collapsed to icon strip. |
| Tablet L | 1024–1279px | 3 col | DZ Operators on iPad Pro | 3-column load board. Right rail visible. Full navigation sidebar. |
| Desktop | 1280–1535px | 3–4 col | Operators, admin on desktop | Full layout. Sidebar expanded. Right panel visible. |
| Wide | 1536px+ | 4 col | Admin, multi-monitor setups | 4-column load board. Wider right panels. More data visible per row. |

| Zone | Position | Content Rule |
| --- | --- | --- |
| Primary (safe thumb) | Bottom 40% of screen | FAB, bottom tab bar, primary CTA buttons, confirm actions |
| Secondary (reach) | Middle 30% of screen | Search bars, secondary actions, list items with tap actions |
| Tertiary (stretch) | Top 30% of screen | Page title, back button, contextual info — no primary actions |
| System UI (safe area) | Bottom 34px (iOS notch) | Tab bar sits above safe area inset. Never place tappable elements below inset. |

| Design Component | React Component Name | Props Key | Notes |
| --- | --- | --- | --- |
| Load Card | <LoadCard /> | load, onAction, showAI | WebSocket update via useLoadStore(). Real-time counter in useEffect. |
| Status Pill | <StatusPill /> | status, size, pulse | Renders correct color/icon/text from STATUS_CONFIG map. No inline styles. |
| Compliance Grid | <ComplianceGrid /> | athleteId, onOverride | Fetches compliance state. Renders 8 CompliancePoint sub-components. |
| CG Check Modal | <CGCheckModal /> | loadId, aircraft, onComplete | Controlled form. Calculates CG client-side. Submits to /api/v1/manifest/cg-checks. |
| Add Slot Panel | <AddSlotPanel /> | loadId, onSlotAdded | Search debounced 300ms. Compliance check on athlete select. Offline-aware. |
| Athlete Quick Card | <AthleteCard /> | athlete, compact, showCurrency | Shared between manifest staff and athlete views. Currency badge always shown. |
| Load Board | <LoadBoard /> | dzId, filter | Subscribes to WebSocket room dz:{dzId}. Renders sorted array of LoadCards. |
| Jump Timeline | <JumpTimeline /> | athleteId, limit, showMilestones | Paginated. Milestone cards injected between logbook entries at correct positions. |
| Achievement Badge | <AchievementBadge /> | achievement, earned, size | Grayscale if not earned. Earned = full color + earn date tooltip. |
| Offline Banner | <OfflineBanner /> | queuedCount, syncing | Reads from offline store. Orange when offline, teal when syncing, hidden when online. |

| Store | Technology | Manages | Update Pattern |
| --- | --- | --- | --- |
| authStore | Zustand | User session, role, active DZ, active branch | JWT refresh, role change from server |
| loadStore | Zustand + WS | All loads for active DZ — real-time array | WebSocket patches applied via immer producer |
| slotStore | Zustand + WS | Slots for all visible loads | WebSocket slot.assigned / slot.updated events |
| offlineStore | Zustand + WatermelonDB | Queue of pending mutations, sync status | Background sync worker updates this store |
| weatherStore | Zustand | Latest weather per DZ + hold status | Polling every 5min + WebSocket on hold change |
| aiStore | Zustand | Current insights for active DZ | Polling every 5min + WebSocket on new insight |
| uiStore | Zustand | Modal state, drawer state, active filters | Local UI only — not persisted |