# SkyLara Property Rentals and Accommodation Marketplace Master Spec

## Purpose
This file is the single source of truth for the SkyLara property rentals and accommodation marketplace module.

It defines a production-grade, skydiving-specific accommodation system that lets SkyLara:
- create and manage direct property listings
- aggregate external accommodation inventory
- search properties by exact dropzone proximity
- support daily, weekly, and monthly stays
- publish inventory to web frontend and mobile app from one backend truth
- handle direct host flows, OTA-fed inventory, and future PMS/channel integrations
- support safe booking, payment routing, cancellation handling, and auditability
- fit the existing SkyLara modular monolith V1 architecture

This module is for real operational use, not a placeholder travel widget.

---

## 1. Canonical product position

SkyLara Rentals is not a generic hotel search layer.
It is a skydiving-first accommodation marketplace designed around dropzones, camps, boogies, coaches, organizers, sport jumpers, tandem customers, and long-stay athletes.

Its purpose is to solve:
- where can I stay near this dropzone
- which property is best for a one-night tandem trip vs a one-month training camp
- which property has gear storage, RV hookup, or DZ shuttle convenience
- how can a dropzone or local host list and manage accommodation directly inside SkyLara
- how do mobile and web show the same real-time availability, pricing, and booking truth

This module must integrate with:
- dropzone profiles
- events and camps
- manifest-aware travel planning
- payments
- marketing
- local news
- user identity
- referrals
- demo data tooling

---

## 2. Strategic recommendation

### 2.1 Best product direction
Do not build this as a pure OTA clone.
Build it as a hybrid accommodation layer with two inventory models:

1. Direct SkyLara listings
   - local hosts
   - dropzone bunkhouses
   - apartments
   - villas
   - hostels
   - RV or camping spots
   - furnished monthly rentals

2. Aggregated external inventory
   - hotels
   - vacation rentals
   - extended-stay inventory
   - instant-book properties from partners

That hybrid approach solves the cold-start problem and also gives SkyLara a defensible niche over time. Your uploaded blueprint correctly recommends hybrid supply and dropzone-centric search instead of city-centric OTA logic. fileciteturn21file0

### 2.2 Best implementation path for SkyLara
Do not introduce a separate microservices estate right now.
Your uploaded paper recommends decoupled microservices, but for SkyLara V1 the better path is:
- modular monolith
- strict service boundaries
- shared auth
- shared RBAC
- shared tenant model
- shared event bus
- one backend truth across dashboard, web, PWA, and mobile

That keeps the system implementable while still allowing future service extraction.

---

## 3. Research-backed architecture decisions

### 3.1 Marketplace payments
Stripe Connect is the best default pattern for marketplace-style payments, connected accounts, and payout routing. Stripe documents marketplace flows where the platform collects customer payments and pays out to sellers through connected accounts. citeturn992894search4turn992894search8

### 3.2 OTA and rental aggregation
Expedia Rapid supports a modular shopping-to-booking path and its vacation rental APIs support instant-book inventory, which is useful for phased aggregation. citeturn992894search3turn992894search7turn992894search11turn992894search15

### 3.3 Booking and pricing partner patterns
Booking.com developer docs show that property pricing, request-to-book style flows, and reservation retrieval are structured APIs with changing partner contracts and version lifecycles, so any Booking integration should be adapter-based and isolated behind an anti-corruption layer. citeturn992894search13turn992894search17turn992894search5

### 3.4 Dubai holiday home compliance
Dubai DET requires apartments and villas to be registered and approved before listing, and holiday home operations require permit workflows. This is critical if SkyLara wants to support UAE direct host listings. citeturn992894search2turn992894search6turn992894search10turn992894search18

### 3.5 Payment API shape
Stripe’s API is resource-oriented and JSON-based, which fits SkyLara’s broader backend design. citeturn992894search16

### 3.6 Hold-and-resume pattern
Expedia Rapid documents a hold-and-resume booking pattern, which is useful inspiration for staged booking or short reservation hold flows during checkout. citeturn992894search19

---

## 4. Core product goals

SkyLara Rentals must support:

### 4.1 Discovery
- search near a specific dropzone
- search near a camp or boogie
- search by map radius
- search by stay duration
- search by amenities that matter to skydivers
- search by host type
- search by distance to manifest or DZ entrance

### 4.2 Inventory
- direct listings
- external aggregated inventory
- dropzone-managed accommodation
- long-stay housing
- bunkhouse and RV spots
- camp or event-linked packages

### 4.3 Booking
- direct booking requests
- instant booking where allowed
- staged booking confirmation where needed
- hold/request patterns where needed
- booking status lifecycle
- cancellation and refund policy visibility

### 4.4 Experience surfaces
- dashboard admin and host tools
- public web frontend
- mobile app inventory and booking flows
- localized event/property pages
- shareable property links

### 4.5 Trust
- permit status for regulated geographies
- host verification
- reviews and credibility
- distance accuracy
- payment and payout safety
- booking audit trail

---

## 5. Information architecture

### 5.1 Dashboard routes
Create:
- `/dashboard/rentals`
- `/dashboard/rentals/overview`
- `/dashboard/rentals/listings`
- `/dashboard/rentals/listings/new`
- `/dashboard/rentals/bookings`
- `/dashboard/rentals/availability`
- `/dashboard/rentals/pricing`
- `/dashboard/rentals/hosts`
- `/dashboard/rentals/payouts`
- `/dashboard/rentals/channels`
- `/dashboard/rentals/compliance`
- `/dashboard/rentals/settings`

### 5.2 Public web routes
Create:
- `/stays`
- `/stays/dropzone/:slug`
- `/stays/property/:slug`
- `/stays/event/:eventSlug`
- `/stays/search`

### 5.3 Mobile app surfaces
Create:
- home feed rental card
- nearby stays
- dropzone detail to nearby stays
- event detail to stay options
- saved stays
- booking history
- booking details
- host or support contact
- directions to DZ from stay

---

## 6. Inventory model

### 6.1 Listing types
Support:
- hotel room
- apartment
- villa
- room share
- bunkhouse
- hostel bed
- RV hookup
- campsite
- monthly furnished unit
- event package stay
- dropzone-managed lodging

### 6.2 Supply sources
Each listing must have a source type:
- DIRECT_SKYLARA
- DROPZONE_MANAGED
- PARTNER_API
- CHANNEL_SYNCED
- EVENT_BLOCK

### 6.3 Core listing attributes
- title
- slug
- description
- listing type
- host type
- address
- coordinates
- nearest dropzone id
- distance to dropzone
- photo gallery
- amenities
- sleeping capacity
- bathrooms
- pet policy
- cancellation policy
- compliance status
- pricing model
- availability source
- booking mode
- visibility state

---

## 7. Skydiving-specific listing requirements

Unlike a normal OTA, SkyLara must support filters that matter to skydivers.

### 7.1 Skydiver-specific amenities
Support:
- gear storage
- rig-safe locker
- covered packing space
- on-site bunkhouse
- RV hookup
- tent camping
- shuttle to dropzone
- walkable to DZ
- late arrival check-in
- group booking friendly
- washing machine for long stays
- workspace for remote athletes
- kitchen for monthly stays

### 7.2 Dropzone proximity logic
Every listing shown in a dropzone search must be anchored to:
- nearest dropzone
- exact distance to dropzone
- estimated drive time where supported
- radius eligibility

Your uploaded blueprint correctly centers the search model on dropzone coordinates rather than city intent. fileciteturn21file0

---

## 8. Search and map model

### 8.1 Recommended V1 design
For V1, use:
- PostgreSQL + PostGIS for system of record and geo queries
- optional search index later for scale and fast faceting
- map radius search
- dropzone-anchored search
- cached search results for hot routes

### 8.2 Search modes
Support:
- exact dropzone search
- near me
- event-linked search
- map viewport search
- date + guests + amenity search
- long-stay search

### 8.3 Result ordering
Allow sort by:
- nearest to dropzone
- best value
- lowest price
- highest rated
- long-stay friendly
- event recommended

### 8.4 Product rule
Distance to dropzone must be a first-class field, not an afterthought.

---

## 9. Pricing model

### 9.1 Pricing modes
Support:
- nightly pricing
- weekly discount
- monthly discount
- event pricing
- seasonal pricing
- weekend uplift
- long-stay pricing
- request-based pricing for special inventory

### 9.2 V1 recommendation
For direct listings, implement:
- base nightly rate
- weekly discount percentage
- monthly discount percentage
- optional event override
- cleaning fee
- service fee
- taxes or fees where relevant

### 9.3 Product rule
Do not try to out-engineer every external supplier’s promotion engine in V1.
For partner inventory, treat the supplier-confirmed final bookable rate as source of truth.

Your uploaded blueprint’s LOS discount logic is strong, but for V1 SkyLara should keep internal pricing deterministic and adapter-friendly. fileciteturn21file0

---

## 10. Booking modes

### 10.1 Modes
Support:
- INSTANT_BOOK
- REQUEST_TO_BOOK
- HOLD_THEN_CONFIRM
- EXTERNAL_REDIRECT
- PARTNER_BOOKING

### 10.2 Recommended V1
For direct listings:
- request-to-book or instant-book configurable per listing

For partner inventory:
- partner-booking or redirect depending on contract pattern

### 10.3 Booking lifecycle
- PENDING
- HELD
- CONFIRMED
- DECLINED
- CANCELLED
- EXPIRED
- COMPLETED

---

## 11. Payments and payouts

### 11.1 Recommended payment direction
Use Stripe Connect for:
- connected hosts
- payout routing
- marketplace fee collection
- onboarding linked accounts

### 11.2 Direct listing payment model
For direct inventory:
- guest pays SkyLara
- SkyLara records booking
- payout routed to host after booking policy conditions
- marketplace fee retained by platform

### 11.3 Partner inventory model
For external partner inventory:
- either partner books externally
- or SkyLara passes booking/payment according to contract
- partner truth wins for partner-confirmed reservation states

### 11.4 Host onboarding
Hosts should support:
- payout account onboarding
- compliance document upload
- tax and permit metadata
- payout status visibility

---

## 12. Compliance and trust

### 12.1 UAE and Dubai rule
If supporting Dubai holiday homes, direct host listing flow must support:
- permit metadata
- listing approval state
- compliance notes
- document capture where needed

Dubai DET explicitly requires registration/approval for apartments and villas used as holiday homes. citeturn992894search2turn992894search6turn992894search10

### 12.2 Trust signals
Support:
- verified host
- verified dropzone partner
- verified permit where relevant
- verified reviews
- event popularity
- clear cancellation policy

---

## 13. Channel sync and availability

### 13.1 V1 recommendation
For direct SkyLara listings, start with:
- internal availability calendar
- manual block and unblock
- imported calendar sync if available
- future channel adapters

### 13.2 V2 direction
Add:
- iCal sync
- PMS/channel manager sync
- API-based availability push and pull
- conflict prevention

### 13.3 Product rule
Do not pretend calendar sync is instant if it is not.
Show the sync source and last sync time where external sync exists.

---

## 14. Web frontend direction

### 14.1 Framework fit
Keep alignment with current SkyLara web stack.
Do not split into a separate product frontend.

### 14.2 Required screens
- search page with filters
- property detail page
- host listing dashboard
- booking checkout flow
- booking detail page
- saved properties
- event-linked lodging page
- dropzone-linked lodging page

### 14.3 UX rule
The web experience should feel like part of SkyLara, not a bolted-on travel iframe.

---

## 15. Mobile app direction

### 15.1 Product rule
Mobile and web must use the same backend truth.

### 15.2 Required mobile flows
- discover nearby stays
- search by dropzone
- open property details
- save property
- book stay
- see booking status
- get directions to dropzone
- contact host or support
- open event-linked stays

### 15.3 Best way to push it to mobile
Do not create a separate rentals app.
Expose the rentals domain through the existing SkyLara mobile architecture as:
- home feed modules
- dropzone page modules
- event page modules
- search and booking subflows
- saved stays and booking history

This is the better way for SkyLara because it keeps user identity, rewards, referrals, events, and travel planning in one app.

---

## 16. Data model

### 16.1 Core entities
- rental_listings
- rental_listing_units
- rental_hosts
- rental_amenities
- rental_photos
- rental_availability_blocks
- rental_pricing_rules
- rental_bookings
- rental_booking_guests
- rental_payout_accounts
- rental_partner_inventory_cache
- rental_partner_rate_snapshots
- rental_compliance_records
- rental_reviews
- rental_saved_properties
- rental_dropzone_distance_cache

### 16.2 Identity split
Use centralized platform identity for:
- users
- saved stays
- booking history
- host identity links
- referral/share links

Use tenant-scoped data for:
- direct listings
- compliance data
- local host configuration
- dropzone-managed lodging
- local payout settings

---

## 17. API groups

### 17.1 Search APIs
- GET /api/v1/rentals/search
- GET /api/v1/rentals/dropzone/:dropzoneId
- GET /api/v1/rentals/property/:slug
- GET /api/v1/rentals/event/:eventId

### 17.2 Booking APIs
- POST /api/v1/rentals/bookings
- GET /api/v1/rentals/bookings/me
- GET /api/v1/rentals/bookings/:id
- POST /api/v1/rentals/bookings/:id/cancel

### 17.3 Host and dashboard APIs
- POST /api/v1/dz/:dzId/rentals/listings
- PATCH /api/v1/dz/:dzId/rentals/listings/:id
- GET /api/v1/dz/:dzId/rentals/bookings
- POST /api/v1/dz/:dzId/rentals/availability/block
- POST /api/v1/dz/:dzId/rentals/pricing/rules

### 17.4 Compliance APIs
- POST /api/v1/dz/:dzId/rentals/compliance
- GET /api/v1/dz/:dzId/rentals/compliance/:listingId

---

## 18. Best phased implementation for SkyLara

### Phase 1 — Direct listings foundation
Build:
- direct host listings
- dropzone-managed stays
- map and dropzone search
- nightly, weekly, monthly pricing
- request-to-book/integrated booking
- dashboard listing management
- mobile and web consumption

### Phase 2 — Partner inventory aggregation
Build:
- Expedia Rapid style partner adapter
- cached partner inventory
- anti-corruption normalization layer
- unified search result blending
- partner booking mode

### Phase 3 — Availability sync and channel tooling
Build:
- internal availability calendar improvements
- iCal support
- PMS/channel manager adapter layer
- conflict controls

### Phase 4 — Deep dropzone orchestration
Build:
- event-linked stay packages
- smarter recommendations tied to camps and boogies
- manifest-adjacent planning hooks
- partner/dropzone logistics intelligence

Your uploaded paper’s phased plan is directionally strong; I adapted it to SkyLara’s current architecture rather than a microservices-first rollout. fileciteturn21file0

---

## 19. What to add beyond the uploaded blueprint

These are the most important SkyLara-specific improvements:

### 19.1 Dropzone-managed lodging as first-class inventory
Do not only think about Airbnb-style hosts.
Treat DZ bunkhouses, campsites, RV slots, and event housing as first-class product objects.

### 19.2 Event-linked accommodation bundles
Let camps and boogies surface suggested stays automatically.

### 19.3 Saved travel planning loop
Allow users to:
- save property
- save event
- save dropzone
- return later in app

### 19.4 Marketing and referral connection
Property pages should support:
- share link
- referral link
- local promo integration
- nearest-dropzone news tie-in

### 19.5 Demo-data readiness
Add realistic accommodation scenarios into the SkyLara demo-data system.

---

## 20. Final recommendation

The best way for SkyLara is:
- build one integrated rentals domain
- push it into web and mobile through the shared backend
- start with direct listings and dropzone-managed stays
- add partner inventory next
- keep dropzone proximity as the core search truth
- use Stripe Connect for direct host marketplace flows
- make compliance and trust visible where required
- do not split it into a separate product or app

---

## 21. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Marketplace Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Property_Rentals_Accommodation_Marketplace_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade property rentals and accommodation marketplace inside SkyLara that supports direct listings, dropzone-managed stays, partner inventory, dropzone-proximity search, web/mobile booking flows, and shared backend truth across dashboard, web, PWA, and mobile.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Build one backend truth for dashboard, web, PWA, and mobile.
3. Do not create a separate rentals product outside SkyLara.
4. Treat dropzone proximity as a first-class search and ranking signal.
5. Start with direct and dropzone-managed listings before overbuilding partner aggregation.
6. Keep payments, host onboarding, compliance, and booking states auditable.
7. Do not mark it complete unless listing management, property search, property detail, booking flow, dashboard tools, and mobile/web surfaces actually work.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, event hooks, and settings systems already in the repo
3. missing work needed for the rentals module
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard routes and mobile/web surfaces to add
8. implementation risks
9. recommended Phase 1
```

---

## 22. Suggested repo filename
Use:
`docs/SkyLara_Property_Rentals_Accommodation_Marketplace_Master_Spec.md`
