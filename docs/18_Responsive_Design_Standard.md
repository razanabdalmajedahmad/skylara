# 18 — Responsive & Adaptive Design Standard

## Product Rule

The SkyLara public web portal, account portal, and published website surfaces must be responsive and adaptive across:

- Small mobile phones (320px–375px)
- Large mobile phones (376px–428px)
- Tablets (768px–1024px)
- Laptops (1024px–1440px)
- Desktop screens (1440px+)
- Foldables and resizable screens where supported
- Portrait and landscape orientations

The same public website system must render correctly across different screen sizes and resolutions without broken layouts, clipped content, hidden controls, horizontal scrolling, or inaccessible actions.

---

## Tailwind Breakpoint Map

| Token | Min Width | Typical Devices |
|-------|-----------|-----------------|
| (base) | 0px | Small phones |
| `sm` | 640px | Large phones landscape |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Tablets landscape / laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

All component styling must be mobile-first: base styles target the smallest screen, breakpoint prefixes add larger-screen enhancements.

---

## Web and PWA Requirements

### Required responsive rules

- No horizontal scrolling in normal page use
- Layouts reflow correctly across breakpoints
- Text remains readable without broken wrapping
- CTA buttons remain visible and tappable
- Navigation collapses cleanly on smaller widths
- Cards, tables, and media blocks degrade gracefully on mobile
- Images and videos scale correctly without layout breakage
- Forms remain usable on mobile screens
- Account portal pages remain fully functional on mobile browsers
- Public booking, waiver, event, rentals, jobs, and learning flows remain usable across all supported widths

---

## Mobile-Specific Requirements

- Primary actions must be reachable comfortably on small screens
- Bottom spacing and sticky CTAs should be used where needed
- Modals and sheets must fit small screens safely
- Upload, booking, payment, and waiver steps must be mobile-safe
- No core user flow should require desktop-only behavior
- Minimum touch target size: 44×44px (per WCAG 2.5.5)

---

## Tablet and Large-Screen Requirements

- Layouts should take advantage of extra width without becoming sparse or broken
- Split layouts may be used where appropriate
- Account portal, directories, and dashboards exposed to public/account users should support larger widths cleanly
- Event, rental, learning, and media pages should support richer two-column or multi-column layouts where useful

---

## Orientation and Resizable Layout Requirements

The interface must remain usable when:

- Mobile orientation changes
- Tablet orientation changes
- Browser windows are resized
- Multi-window or resizable environments are used where supported

---

## Technical Implementation Guidance

### Required patterns

- **Fluid layouts**: Use percentage/flex/grid, not fixed pixel widths
- **Breakpoint-aware components**: Mobile-first Tailwind classes with `sm:`, `md:`, `lg:`, `xl:`, `2xl:` prefixes
- **Media queries**: Tailwind handles this; custom CSS should follow the same breakpoints
- **Responsive images**: Use `next/image` with responsive sizing or `aspect-ratio` containers
- **Viewport-safe spacing**: `px-4` minimum on mobile, scale up with breakpoints
- **Adaptive navigation**: Hamburger/drawer on mobile, sidebar/navbar on desktop
- **Touch-safe target sizing**: Minimum `p-2.5` (40px) on interactive elements, prefer `p-3` (48px)
- **Accessible text scaling**: Use `rem`-based sizing, respect user font-size preferences

### Component patterns

| Component | Mobile | Tablet+ |
|-----------|--------|---------|
| Navigation | Hamburger → slide drawer | Fixed sidebar or top nav |
| Data tables | Stacked card view | Full table with `overflow-x-auto` fallback |
| Modals | Full-screen or bottom sheet | Centered dialog with `max-w-*` |
| Forms | Single column, full-width inputs | Two-column where logical |
| Cards | Single column stack | 2-col grid (`md:`), 3-col (`lg:`) |
| Media | Full-width, aspect-ratio preserved | Grid or side-by-side layouts |

### useBreakpoint hook

A shared `useBreakpoint` hook is available at `@/hooks/useBreakpoint` for components that need JS-level breakpoint awareness (e.g., switching between card and table view).

---

## QA Requirements for Responsiveness

Every public website and account portal release must be tested across these flows:

- [ ] Homepage
- [ ] Tandem pages
- [ ] Booking flows
- [ ] Coach booking
- [ ] Course subscription
- [ ] Events and boogies
- [ ] Rentals and accommodation
- [ ] Gear rental
- [ ] Jobs
- [ ] Waivers
- [ ] Account overview
- [ ] Wallet/tickets
- [ ] Media library
- [ ] AI assistant entry points

### Test widths

| Width | Device class |
|-------|-------------|
| 320px | iPhone SE / small Android |
| 375px | iPhone 12/13/14 |
| 428px | iPhone 14 Pro Max |
| 768px | iPad portrait |
| 1024px | iPad landscape / small laptop |
| 1280px | Standard laptop |
| 1536px | Desktop |
| 1920px | Full HD desktop |

The release is not complete unless these flows work cleanly across representative screen sizes and orientations.

---

## SEO and Responsive Rule

Responsive behavior must not break:

- Crawlability
- Metadata
- Canonical URLs
- Internal linking
- Structured data (JSON-LD)

Use a single URL per page (responsive design, not separate mobile URLs).
