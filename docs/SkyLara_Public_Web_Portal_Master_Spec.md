# SkyLara Public Web Portal and Website Management Master Spec

## Purpose
This file is the single source of truth for the SkyLara public web portal, website management, publishing controls, public customer experience, and logged-in account portal.

It defines how each dropzone or organization can use the dashboard to control and publish its public-facing digital presence across:
- public website
- public landing pages
- logged-in account portal
- web frontend
- PWA
- mobile app surfaces where the same content is reused

This module must support:
- website theme and branding controls
- logo and media management
- color and typography settings
- social media links
- banners and homepage blocks
- SEO and indexing controls
- analytics and third-party integrations
- responsive and adaptive design across phone, tablet, desktop, and resizable layouts
- public services and pricing pages
- tandem packages
- AFF programs
- courses and subscriptions
- coach and instructor directories
- rentals and accommodation
- gear rentals
- public weather and operational status
- boogies, camps, and events
- public careers
- partner dropzones
- announcements and news
- waivers and onboarding
- account self-service
- instructor-uploaded media for students
- AI assistant

Everything must be controlled from one backend truth and one dashboard publishing system.
This is not a disconnected marketing site.

---

## 1. Canonical product position

SkyLara Public Web is the external operating surface for each dropzone and organization.

It must behave as:
- a real public website
- a conversion and booking portal
- an onboarding and waiver portal
- a learning and subscription portal
- a rentals and accommodation portal
- a coach and instructor booking directory
- a job board
- a customer account portal
- a trust and media layer
- a public support and AI entry point

The public portal must be tightly connected to:
- dashboard publishing controls
- settings
- backend APIs
- database content models
- account auth
- bookings
- payments
- manifest visibility rules
- weather integrations
- analytics
- marketing and engagement
- learning and careers
- storage and media delivery

---

## 2. Core strategic recommendation

### 2.1 Best product model
Do not treat this as a static website builder only.
Build it as a dashboard-controlled website and account publishing platform.

That means each dropzone can manage from a dedicated dashboard area:
- branding
- colors
- logos
- banners
- content sections
- services
- social links
- SEO fields
- analytics tags
- announcements
- featured coaches/instructors
- featured events
- featured stays
- featured courses
- public manifest visibility
- public weather visibility

### 2.2 Recommended dashboard naming
Create a main dashboard area called:
- `/dashboard/website`

And optionally:
- `/dashboard/website/branding`
- `/dashboard/website/content`
- `/dashboard/website/navigation`
- `/dashboard/website/seo`
- `/dashboard/website/integrations`
- `/dashboard/website/media`
- `/dashboard/website/announcements`
- `/dashboard/website/directories`
- `/dashboard/website/pages`
- `/dashboard/website/forms`
- `/dashboard/website/account-portal`
- `/dashboard/website/video-library`
- `/dashboard/website/settings`

That is the cleanest way to give full control from the dashboard without splitting website management into scattered admin screens.

---

## 3. Research-backed product decisions

### 3.1 SEO foundation
Google Search Central recommends core SEO practices including descriptive page titles, useful meta descriptions, crawlability, internal linking, and making pages discoverable and indexable. It also provides controls for robots meta tags. The Open Graph protocol is the standard way to control how shared links appear on social platforms. citeturn397479search0turn397479search2

### 3.2 Analytics and tag management
Google supports GA4 setup through Google Tag Manager, including a Google tag and event configuration model, and documents recommended GA4 events. citeturn397479search1

### 3.3 Video and secure media delivery
Google documents video SEO best practices and structured data through `VideoObject`. AWS S3 presigned URLs are a strong fit for controlled uploads, and Mux signed playback URLs are a strong fit for protected streaming access. citeturn397479search3turn397479search4

### 3.4 Responsive and adaptive design
Google recommends responsive web design because it is the easiest design pattern to implement and maintain. MDN describes responsive web design as the standard way to make pages work well across screen sizes and resolutions. Apple’s layout guidance emphasizes adaptability across device sizes and portrait/landscape orientations. Android recommends responsive and adaptive layouts that support all display sizes, orientations, and resizable configurations. citeturn397479search0turn397479search1turn397479search2turn397479search3

---

## 4. Main product goals

The public portal must let users:

### 4.1 Discover
- find the dropzone
- understand services
- see tandem prices and packages
- browse AFF programs and courses
- browse coaches and instructors
- see weather and operational notices
- browse events, rentals, jobs, and news
- view trust and social proof

### 4.2 Convert
- register or log in
- book tandem jumps
- book coach time
- apply for AFF or other programs
- subscribe to free or paid courses
- book gear rentals
- book accommodation
- register for boogies, camps, and events
- apply for jobs
- sign waivers
- pay online

### 4.3 Manage
After login, users must be able to:
- view and update profile
- check bookings
- check waivers
- view wallet, balance, tickets, and credits
- view course access and certificates
- access instructor-uploaded media
- manage saved items
- see invoices and history
- use AI assistant for account help

---

## 5. Dashboard website management system

### 5.1 Main routes
Create:
- `/dashboard/website`
- `/dashboard/website/overview`
- `/dashboard/website/branding`
- `/dashboard/website/content`
- `/dashboard/website/navigation`
- `/dashboard/website/pages`
- `/dashboard/website/seo`
- `/dashboard/website/integrations`
- `/dashboard/website/media`
- `/dashboard/website/directories`
- `/dashboard/website/announcements`
- `/dashboard/website/weather`
- `/dashboard/website/public-manifest`
- `/dashboard/website/account-portal`
- `/dashboard/website/forms`
- `/dashboard/website/video-library`
- `/dashboard/website/settings`

### 5.2 What admins should control from dashboard

#### Branding
- primary color
- secondary color
- accent color
- background color
- text colors
- CTA styles
- light/dark theme behavior
- logo
- favicon
- cover/hero images
- partner logos

#### Content
- homepage hero text
- banners
- homepage blocks
- service page text
- tandem pricing cards
- AFF page content
- about page content
- FAQ content
- CTA labels
- footer content

#### Navigation
- visible menu items
- order of pages
- whether certain pages are public or login-required
- footer link groups

#### Directories
- coaches shown publicly
- instructors shown publicly
- featured staff
- partner dropzones
- public jobs
- featured events
- featured rentals

#### Account portal
- which account modules appear
- wallet visibility
- ticket visibility
- waiver visibility
- certificate visibility
- media library visibility

---

## 6. Public versus authenticated visibility model

### 6.1 Public users can see
- homepage
- about
- services
- tandem packages
- AFF overview
- public courses catalog
- public weather
- announcements and news
- boogies and events
- coach directory
- instructor directory
- public rentals/accommodation listings
- public gear rental catalog if enabled
- public job board
- partner dropzones
- FAQ
- public AI assistant
- public contact channels
- public social media links

### 6.2 Logged-in users can additionally see
- personal bookings
- personal wallet/balance/tickets
- waivers and documents
- private learning access
- paid subscriptions
- personal event registrations
- private booking status
- saved payment methods if enabled
- account and profile settings
- personal notifications and announcements
- certificate records
- rental booking details
- coach booking history
- invoice and receipt history
- uploaded instructor media

### 6.3 Staff-only items should not be public by default
Do not expose:
- full internal manifest
- sensitive staff schedules
- private notes
- internal compliance details
- aircraft planning internals
- private financial operations
- internal-only media

---

## 7. Responsive and adaptive design standard

### 7.1 Product rule
The SkyLara public web portal, account portal, and published website surfaces must be responsive and adaptive across:
- small mobile phones
- large mobile phones
- tablets
- laptops
- desktop screens
- foldables and resizable screens where supported
- portrait and landscape orientations

The same public website system must render correctly across different screen sizes and resolutions without broken layouts, clipped content, hidden controls, horizontal scrolling, or inaccessible actions.

### 7.2 Web and PWA requirements
The public web and PWA must use responsive web design as the default approach.

Required responsive rules:
- no horizontal scrolling in normal page use
- layouts reflow correctly across breakpoints
- text remains readable without broken wrapping
- CTA buttons remain visible and tappable
- navigation collapses cleanly on smaller widths
- cards, tables, and media blocks degrade gracefully on mobile
- images and videos scale correctly without layout breakage
- forms remain usable on mobile screens
- account portal pages remain fully functional on mobile browsers
- public booking, waiver, event, rentals, jobs, and learning flows remain usable across all supported widths

### 7.3 Mobile-specific requirements
For mobile users:
- primary actions must be reachable comfortably on small screens
- bottom spacing and sticky CTAs should be used where needed
- modals and sheets must fit small screens safely
- upload, booking, payment, and waiver steps must be mobile-safe
- no core user flow should require desktop-only behavior

### 7.4 Tablet and large-screen requirements
For tablets and large screens:
- layouts should take advantage of extra width without becoming sparse or broken
- split layouts may be used where appropriate
- account portal, directories, and dashboards exposed to public/account users should support larger widths cleanly
- event, rental, learning, and media pages should support richer two-column or multi-column layouts where useful

### 7.5 Orientation and resizable layout requirements
The interface must remain usable when:
- mobile orientation changes
- tablet orientation changes
- browser windows are resized
- multi-window or resizable environments are used where supported

### 7.6 Technical implementation guidance
Implement responsive behavior using:
- fluid layouts
- breakpoint-aware components
- media queries
- responsive images and media containers
- viewport-safe spacing
- adaptive navigation patterns
- touch-safe target sizing
- accessible text scaling support

### 7.7 QA requirements for responsiveness
Every public website and account portal release must be tested for:
- homepage
- tandem pages
- booking flows
- coach booking
- course subscription
- events and boogies
- rentals and accommodation
- gear rental
- jobs
- waivers
- account overview
- wallet/tickets
- media library
- AI assistant entry points

The release is not complete unless these flows work cleanly across representative screen sizes.

### 7.8 SEO and responsive rule
Responsive behavior must not break crawlability, metadata, canonical URLs, internal linking, or structured data.

---

## 8. Website builder and publishing model

### 8.1 Page types
Support:
- homepage
- standard content page
- service page
- pricing page
- directory page
- event listing page
- event detail page
- rentals listing page
- rentals detail page
- jobs listing page
- jobs detail page
- weather page
- announcements page
- account portal pages
- landing pages for campaigns or promotions

### 8.2 Block types
Support reusable blocks:
- hero
- CTA strip
- pricing cards
- announcement banner
- testimonials
- media gallery
- stats row
- coach cards
- instructor cards
- event cards
- rentals cards
- course cards
- FAQ accordion
- map/location block
- review block
- logo strip
- video block

### 8.3 Publishing states
Every page/block should support:
- DRAFT
- PUBLISHED
- HIDDEN
- SCHEDULED
- FEATURE_FLAGGED

---

## 9. SEO and indexing controls

### 9.1 Dashboard SEO controls
For each public page, support:
- page title
- meta description
- canonical URL
- slug
- robots meta settings
- social title
- social description
- social image
- structured data options
- index/noindex
- sitemap inclusion toggle

### 9.2 Recommended SEO features
Support:
- XML sitemap generation
- robots.txt rules
- canonical tags
- Open Graph tags
- Twitter/X social tags if used
- structured data for events, jobs, courses, videos, organization, FAQ where applicable
- internal link suggestions across public pages

### 9.3 Product rule
Do not hardcode metadata in the frontend.
SEO fields must be dashboard-driven and database-backed.

---

## 10. Analytics and third-party integrations

### 10.1 Dashboard integrations tab
Create a website integrations area that can manage:
- Google Analytics 4
- Google Tag Manager
- Meta Pixel
- LinkedIn Insight Tag
- TikTok Pixel if enabled
- Google Search Console verification support
- chat widgets
- consent or cookie integrations where required

### 10.2 Minimum recommended setup
At minimum, support:
- GA4 measurement ID
- GTM container ID
- basic event configuration toggles
- Search Console verification
- Meta/Open Graph control

### 10.3 Event tracking model
Track:
- page_view
- sign_up
- login
- tandem_booking_started
- tandem_booking_completed
- coach_booking_started
- coach_booking_completed
- course_subscription_started
- course_subscription_completed
- waiver_signed
- event_registration_started
- event_registration_completed
- rental_booking_started
- rental_booking_completed
- gear_rental_started
- gear_rental_completed
- job_application_started
- job_application_submitted
- media_viewed
- media_downloaded

### 10.4 Product rule
Third-party scripts must be centrally managed in dashboard website settings, not added ad hoc into pages.

---

## 11. Homepage and public page system

### 11.1 Homepage sections
The homepage should be configurable from dashboard and may include:
- hero section
- quick actions
- weather summary
- public live board or event board
- featured services
- tandem packages
- featured coaches
- featured events
- featured stays
- featured courses
- announcement banners
- reviews and trust
- social/community strip

### 11.2 Public manifest visibility
Do not expose the full internal manifest by default.

Support configurable public modes:
- next loads overview
- event schedule board
- public live board with privacy-safe fields only
- boarding/call status for approved public displays

Dashboard controls should manage:
- enabled/disabled
- which fields are public
- refresh cadence
- privacy masking

---

## 12. Weather and operational status

### 12.1 Public weather page
Show:
- current weather
- wind
- temperature
- visibility/cloud summary
- operational status
- weather warning banner where applicable

### 12.2 Operational status controls
The dashboard should control:
- open/closed/delayed state
- banner text
- whether the weather widget is visible
- whether users see operational notices on homepage, tandem page, and events pages

---

## 13. Services, pricing, and bookings

### 13.1 Services pages
Create dashboard-manageable public pages for:
- tandem skydives
- AFF/student progression
- coach bookings
- instructor-led training
- gear rental
- tunnel coaching if applicable
- accommodation
- events/boogies/camps
- memberships or ticket packs
- video/photo/media upgrades

### 13.2 Tandem pricing
Public users should be able to view:
- package name
- base price
- media upgrades
- gift vouchers
- add-ons
- conditions
- age/weight notes where relevant
- cancellation/reschedule policy

### 13.3 Dashboard publishing rule
Pricing and package visibility must be controlled by dashboard and stored in backend models.

---

## 14. Coaches and instructors

### 14.1 Coach directory
Each coach card can show:
- name
- photo
- disciplines
- location
- availability status
- verified badges
- languages
- rates if public
- book CTA

### 14.2 Coach profile page
Show:
- bio
- specialties
- skill levels supported
- camps/events
- certifications if approved
- booking calendar
- available packages
- reviews if enabled

### 14.3 Instructor directory
Show approved instructor data:
- name
- role
- photo
- specialization
- language
- summary
- contact or availability state

### 14.4 Product rule
Full staff check-in and working status should not be public by default.
If a tenant wants some public staff-presence indicator, it must be explicitly configured and privacy-safe.

---

## 15. Learning and subscriptions

### 15.1 Public catalog
Users should be able to browse:
- free courses
- paid courses
- AFF programs
- progression programs
- intro content
- subscription plans
- certificate path overview

### 15.2 Logged-in learning portal
Users can:
- enroll
- subscribe
- pay
- continue learning
- see progress
- access certificates
- access instructor-uploaded session media where applicable

### 15.3 Dashboard controls
Dashboard should manage:
- visibility
- pricing
- subscription tiers
- free vs paid
- who can enroll
- whether login is required before checkout

---

## 16. Gear rentals and accommodation

### 16.1 Public gear rental catalog
Show:
- available rental items
- categories
- indicative pricing
- booking/request CTA
- terms
- qualification notes

### 16.2 Public stays portal
Show:
- nearby accommodation
- event-linked stays
- dropzone-managed lodging
- partner or direct listings
- map view and filters

### 16.3 Product rule
Catalogs can be public.
Actual booking approval, eligibility, and allocation must remain backend-controlled.

---

## 17. Waivers and onboarding

### 17.1 Login-first onboarding
After registration or login, guide users through:
- profile completion
- waiver signing
- emergency details
- required documents
- qualification uploads if relevant
- booking readiness steps

### 17.2 Waiver flow
Users should be able to:
- view required waivers
- sign digitally
- see signed status
- re-sign if version changes
- access waiver history

### 17.3 Onboarding routes
- `/onboarding/start`
- `/onboarding/profile`
- `/onboarding/waivers`
- `/onboarding/documents`
- `/onboarding/ready-status`

---

## 18. Events, boogies, camps, and jobs

### 18.1 Public event pages
Show:
- title
- dates
- location
- description
- requirements
- organizers/coaches
- accommodation options
- registration CTA

### 18.2 Public job board
Show:
- approved jobs
- role detail
- location
- salary/rate if public
- apply CTA
- recruiter note
- requirements

### 18.3 Logged-in action flows
Users can:
- register for events
- sign event waivers
- book add-ons
- book coach slots
- apply for jobs
- track application status

---

## 19. AI assistant and support

### 19.1 Public AI assistant
Public users should be able to ask:
- pricing questions
- booking help
- weather/general questions
- coach booking questions
- accommodation questions
- event questions
- onboarding questions

### 19.2 Logged-in AI assistant
Authenticated users can also ask:
- what is my booking status
- do I have pending waivers
- what is my balance
- what tickets do I have
- what courses am I enrolled in
- what coach did I book
- are my videos ready

### 19.3 Product rule
AI assistant must use real backend truth for account-specific answers.
Do not invent account data.

---

## 20. Instructor-uploaded student media

### 20.1 Main feature
Allow instructors or authorized staff to upload session media for specific students from dashboard.

Use cases:
- AFF debrief videos
- coach feedback clips
- tunnel session videos
- canopy review clips
- event training clips
- personalized student media packs

### 20.2 Dashboard controls
Create a media library area where authorized staff can:
- upload videos
- assign videos to a user
- assign to course/event/session
- set visibility
- set expiry/download rules
- add title/notes
- publish or unpublish

### 20.3 Student portal experience
After login, the skydiver can:
- view assigned videos
- stream videos
- download videos where allowed
- see titles, notes, dates, and coach/instructor attribution
- filter by course/event/session

### 20.4 Recommended technical direction
Use:
- controlled upload pipeline such as S3 presigned upload flow for staff uploads
- protected playback or protected files
- signed playback/download links where required
- video SEO only for public videos, not private student media

### 20.5 Product rule
Private student media must never be public by default.

---

## 21. Social media, trust, and communications

### 21.1 Social links
The dashboard should manage:
- Instagram
- Facebook
- TikTok
- YouTube
- LinkedIn
- WhatsApp contact if desired

### 21.2 Trust blocks
Support:
- reviews/testimonials
- coach highlights
- event gallery
- media gallery
- safety and professionalism statements
- partner logos

### 21.3 Announcements and news
Support dashboard-managed:
- announcements
- local news
- closures
- event reminders
- new course launches
- organizer arrivals

---

## 22. Account portal

### 22.1 Main account dashboard
Show:
- upcoming bookings
- wallet/balance
- tickets/credits
- unsigned waivers
- current subscriptions
- booked events
- stays
- latest announcements
- uploaded media
- support and AI shortcut

### 22.2 Wallet and tickets
Users should be able to view:
- balance
- credits
- tickets
- transaction history
- purchase history
- invoice history

### 22.3 Booking history
Show:
- tandem bookings
- coach bookings
- gear rentals
- event bookings
- stays
- payment statuses

---

## 23. Core APIs needed

### 23.1 Public content APIs
- GET /api/v1/public/home
- GET /api/v1/public/services
- GET /api/v1/public/tandem
- GET /api/v1/public/weather/:dropzoneId
- GET /api/v1/public/coaches
- GET /api/v1/public/instructors
- GET /api/v1/public/courses
- GET /api/v1/public/events
- GET /api/v1/public/jobs
- GET /api/v1/public/stays
- GET /api/v1/public/gear-rental
- GET /api/v1/public/announcements
- GET /api/v1/public/news

### 23.2 Website management APIs
- GET /api/v1/dz/:dzId/website/settings
- PATCH /api/v1/dz/:dzId/website/settings
- GET /api/v1/dz/:dzId/website/pages
- POST /api/v1/dz/:dzId/website/pages
- PATCH /api/v1/dz/:dzId/website/pages/:id
- POST /api/v1/dz/:dzId/website/publish
- GET /api/v1/dz/:dzId/website/integrations
- PATCH /api/v1/dz/:dzId/website/integrations

### 23.3 Authenticated account APIs
- GET /api/v1/account/overview
- GET /api/v1/account/bookings
- GET /api/v1/account/wallet
- GET /api/v1/account/tickets
- GET /api/v1/account/waivers
- GET /api/v1/account/learning
- GET /api/v1/account/stays
- GET /api/v1/account/events
- GET /api/v1/account/media

### 23.4 Booking and action APIs
- POST /api/v1/public/tandem/book
- POST /api/v1/public/coaches/book
- POST /api/v1/public/courses/subscribe
- POST /api/v1/public/gear-rental/book
- POST /api/v1/public/events/register
- POST /api/v1/public/jobs/apply
- POST /api/v1/account/waivers/sign

### 23.5 Media APIs
- POST /api/v1/dz/:dzId/media/upload-request
- POST /api/v1/dz/:dzId/media/assign
- GET /api/v1/account/media/:id
- GET /api/v1/account/media/:id/download

---

## 24. Best phased implementation

### Phase 1 — website management foundation
Build:
- website dashboard tab
- branding controls
- content blocks
- social links
- homepage publishing
- service pages
- public weather
- announcements/news
- SEO controls
- GA4/GTM integrations

### Phase 2 — directories and public conversions
Build:
- tandem pages and bookings
- coach directory and booking
- instructor directory
- jobs
- events
- rentals
- gear rental pages

### Phase 3 — logged-in account portal
Build:
- account overview
- wallet
- tickets
- bookings
- waivers
- learning access
- stays/events history
- media library

### Phase 4 — advanced publishing and media
Build:
- richer website builder blocks
- public manifest modes
- smarter AI assistant
- instructor-uploaded student videos
- stronger analytics and SEO automation
- multilingual and localization improvements

---

## 25. Final recommendation

The best SkyLara public frontend should be:
- a dashboard-controlled website platform
- a booking and onboarding portal
- a self-service logged-in account area
- a learning and events gateway
- a weather/news/announcement surface
- a dropzone-specific digital front door
- SEO-ready and analytics-ready
- responsive and adaptive across supported devices and orientations
- capable of protected student media delivery
- powered by one shared backend truth across dashboard, web, PWA, and mobile

---

## 26. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, Principal Public Experience Architect, and Principal Website Platform Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Final_Implementation_Spec.md
- docs/SkyLara_Mobile_Implementation.md
- docs/SkyLara_Careers_Recruitment_Module_Master_Spec.md
- docs/SkyLara_Learning_Subscriptions_Module_Master_Spec.md
- docs/SkyLara_Marketing_Engagement_Module_Master_Spec.md
- docs/SkyLara_Property_Rentals_Accommodation_Marketplace_Master_Spec.md
- docs/SkyLara_Public_Web_Portal_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade public web portal and website management layer for SkyLara that lets the dashboard control branding, colors, logos, content, SEO, analytics, social links, published pages, public services, directories, account portal, and instructor-uploaded student media.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Build one backend truth for dashboard, web, PWA, and mobile.
3. Do not create a disconnected marketing-only website.
4. All public content must be dashboard-controlled and publishable.
5. Logged-in account areas must use real user data, not placeholders.
6. Public manifest visibility must be configurable and privacy-safe.
7. GA4, GTM, SEO metadata, and social metadata must be settings-driven.
8. Student media must be permissioned, protected, and account-scoped.
9. The public website and account portal must be responsive across mobile, tablet, desktop, and resizable layouts.
10. Do not mark it complete unless homepage, services, booking flows, directories, website settings, account portal, integrations, and media flows actually work.
11. Do not mark it complete unless the touched flows work across representative screen sizes and orientations.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, event hooks, publishing systems, and storage systems already in the repo
3. missing work needed for the public portal and website management system
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard website controls to add
8. public and account routes/screens to add
9. media-delivery and SEO/integration requirements to add
10. implementation risks
11. recommended Phase 1
```

---

## 27. Suggested repo filename
Use:
`docs/SkyLara_Public_Web_Portal_Master_Spec.md`
