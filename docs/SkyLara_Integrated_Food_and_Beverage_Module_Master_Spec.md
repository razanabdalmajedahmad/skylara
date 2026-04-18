# SkyLara Integrated Food and Beverage Module Master Spec

## Purpose
This file is the single source of truth for the integrated Food and Beverage module for SkyLara.

It converts the Skylare restaurant ordering architecture into a production-grade SkyLara module that works across:
- dashboard
- backend APIs
- web frontend
- PWA
- mobile app
- POS and kitchen systems
- manifest and operational telemetry
- wallet and payment systems
- gamification and loyalty systems
- identity and master data systems

This module must support:
- mobile-first menu browsing
- QR and NFC ordering
- digital menu and inventory sync
- role-based access for customers and F&B staff
- flight-synced pre-ordering
- group orders and split billing
- kitchen display routing
- dynamic wait times
- wallet and payment integration
- loyalty, streaks, challenges, and rewards
- social and media-connected workflows
- analytics and optimization
- dropzone-specific operational timing
- weather and delay-aware order handling

This is not a separate restaurant app.
It is a SkyLara-native facility module integrated into the wider dropzone and destination ecosystem.

Source concept adapted from the uploaded Skylare restaurant ordering design document. fileciteturn26file0

---

## 1. Canonical product position

SkyLara F&B is the digital ordering, service, and hospitality engine for dropzone food and beverage operations.

It must behave as:
- a fast mobile ordering system
- a dynamic digital menu
- a dropzone-aware operational workflow
- a flight-synced pre-ordering engine
- a cashless payment and wallet surface
- a KDS-integrated production system
- a loyalty and engagement layer
- a social and post-jump hospitality layer

The module must be tightly connected to:
- master identity
- manifest and load telemetry
- customer wallet and tickets
- notifications
- gamification
- events
- accommodations
- media and athlete profiles
- public website and account portal
- analytics and reporting

---

## 2. Strategic recommendation

### 2.1 Product architecture
Keep this as a bounded module inside the SkyLara modular monolith.

Do not treat it as a standalone third-party storefront.

Create or extend these bounded areas:
- Food and Beverage
- Menu and Inventory
- POS and KDS Routing
- Pre-Order and Telemetry Sync
- Split Billing
- Wallet and Settlement
- Loyalty and Gamification
- Hospitality Analytics

### 2.2 Why this matters
A dropzone restaurant is not normal food delivery.
Operations depend on:
- aircraft loads
- weather holds
- landing times
- jumper movement
- post-jump surges
- event attendance
- team and group behavior

That means the F&B module must react to operational truth, not just static ordering logic. fileciteturn26file0

---

## 3. Main product goals

The module must let users:

### 3.1 Discover
- browse the menu quickly
- see item availability in real time
- see wait times
- see dietary information
- see post-jump or event-specific bundles
- discover featured offers and rewards

### 3.2 Order
- order immediately
- pre-order for later pickup
- order from QR or NFC surface
- place group orders
- split bills
- pay by wallet, card, Apple Pay, or Google Pay
- use loyalty rewards or promo credits

### 3.3 Operate
The system must let staff:
- manage menu and availability
- update sold-out items
- control item visibility by daypart
- receive and route orders to KDS stations
- handle delay workflows
- monitor prep times
- manage pickups and order completion

### 3.4 Optimize
Management should be able to:
- analyze top items
- analyze bundle conversions
- analyze kitchen bottlenecks
- analyze jump-to-order patterns
- analyze loyalty and reward usage
- forecast demand from manifest, event, and weather data

---

## 4. UX and UI design standards

### 4.1 Mobile-first requirements
The primary ordering surface must be mobile-first.

Design for:
- outdoor glare
- gloves
- rushed interactions
- one-handed usage
- jumpers moving between zones
- short ordering windows before load call

Required standards:
- large touch targets
- strong contrast
- readable typography
- sticky category navigation
- minimal clicks to checkout
- aggressive media optimization
- sub-3-second perceived load for core ordering surfaces where possible

### 4.2 Responsive design
The module must be fully responsive across:
- mobile phones
- tablets
- kiosk and tablet ordering surfaces
- desktop dashboard
- public web and logged-in portal

### 4.3 Core UI patterns
Support:
- sticky category tabs
- fast add-to-cart
- modifier sheets
- order status timeline
- saved favorites
- repeat last order
- one-tap reorder after jump
- dynamic sold-out badges
- live prep estimate display

### 4.4 Accessibility
Support:
- high contrast outdoors
- large text
- clear tap states
- readable allergen labels
- icon plus text combinations
- accessible checkout forms

The uploaded design document emphasizes mobile-first design, high contrast, sticky categories, large touch targets, and optimized imagery for dropzone conditions. fileciteturn26file0

---

## 5. Identity and account integration

### 5.1 Unified identity
Users must not create a separate restaurant profile.

Use SkyLara master identity.

The F&B module should recognize:
- skydiver
- tandem customer
- coach
- instructor
- staff
- F&B manager
- kitchen staff
- admin

### 5.2 SSO and token model
The module should use the existing SkyLara auth system and session model.
If the wider platform uses OIDC-style token exchange or centralized auth, the F&B module should consume that same identity truth.

### 5.3 Role-based access
Roles should control:
- frontend customer access
- KDS access
- menu admin access
- POS and admin access
- order fulfillment controls
- settlement visibility
- analytics access

### 5.4 Security rule
Prices must never be trusted from the client.
The backend must calculate:
- item prices
- modifiers
- taxes
- fees
- discounts
- loyalty redemptions
- split bill shares

This is explicitly required by the uploaded design due to parameter tampering risk in restaurant systems. fileciteturn26file0

---

## 6. Facility integration model

### 6.1 Facility support
The module must support:
- main dropzone restaurant
- cafe
- snack bar
- event food zone
- bunkhouse kitchen
- outdoor beverage point
- multi-station F&B outlets

### 6.2 Facility hierarchy
Each outlet should be modeled as a facility or facility sub-unit with:
- facility_id
- outlet_id
- preparation zones
- operating hours
- supported menus
- KDS routing profile
- wallet settlement rules
- order types supported

### 6.3 Mixed-use destination support
An organization should be able to run:
- dropzone
- hotel
- cafe
- bunkhouse food service
- retail shop
under one tenant with distinct operational controls.

---

## 7. Menu and inventory architecture

### 7.1 Core menu entities
The module should support:
- categories
- items
- variants
- modifiers
- bundles
- dayparts
- availability windows
- dietary flags
- allergen flags
- image assets
- upsell relationships

### 7.2 Inventory sync
The digital menu must sync with:
- inventory
- POS
- KDS
- outlet availability
- event menu overrides

### 7.3 Dynamic status
Each item should support:
- AVAILABLE
- LOW_STOCK
- SOLD_OUT
- HIDDEN
- SCHEDULED
- PAUSED
- EVENT_ONLY

### 7.4 Wait times
The system should display dynamic wait times based on:
- current queue depth
- item prep complexity
- outlet load
- event surge state
- telemetry-triggered batch releases

This follows the dynamic menu and bidirectional sync requirements in the uploaded design. fileciteturn26file0

---

## 8. Ordering modes

### 8.1 Supported order types
Support:
- immediate pickup
- pre-order for later pickup
- post-jump pickup
- table ordering via QR and NFC
- kiosk ordering
- staff and manual POS order
- event catering or group platter pre-order
- room-linked or bunkhouse-linked order if hospitality is active

### 8.2 Order states
Use:
- CART
- PENDING_PAYMENT
- PAID
- PENDING_TELEMETRY
- QUEUED_FOR_KITCHEN
- IN_PREP
- READY
- PICKED_UP
- COMPLETED
- CANCELLED
- REFUNDED
- DELAYED

### 8.3 Checkout flow
Checkout should support:
- guest order where allowed
- logged-in fast checkout
- wallet checkout
- saved payment methods
- split bill mode
- promo and reward redemption
- order confirmation and live status

---

## 9. Flight-synced pre-order workflow

### 9.1 Core concept
This is the signature SkyLara feature for F&B.

A user can place an order and choose:
- deliver after jump
- ready after landing
- prepare when my load takes off
- prepare based on estimated arrival

### 9.2 Trigger logic
The system should integrate with manifest and load telemetry.
Possible signals:
- assigned to load
- boarding
- wheels-up or takeoff
- delayed
- cancelled
- landed or estimated arrival

### 9.3 Recommended workflow
1. User places order linked to load or jump session
2. Order is stored in `PENDING_TELEMETRY`
3. Manifest event is received
4. Arrival and prep timing is calculated
5. KDS fires the ticket at optimal prep time
6. User receives ready notification
7. Order is picked up post-jump

### 9.4 Delay handling
If load status changes:
- delay not yet fired → shift prep time
- weather hold before prep → keep in pending queue
- already in prep → notify user and support warm-hold or voucher workflow
- cancelled → offer reschedule, convert to immediate prep, or refund and cancel option

This jump-synchronized prep concept is central in the uploaded architecture. fileciteturn26file0

---

## 10. KDS and kitchen workflow

### 10.1 KDS architecture
Use cloud-first KDS logic with multiple station routing.

### 10.2 Core stations
At minimum support:
- hot prep
- cold prep
- beverage and bar
- expediter

### 10.3 Routing rules
Route items by:
- category
- prep method
- outlet
- event menu
- alcohol and non-alcohol handling
- prep urgency
- synchronized fire time

### 10.4 Expediter logic
The expediter view should:
- aggregate whole-order status
- show station completion
- show missing items
- show order-ready trigger
- trigger pickup notification

### 10.5 Omnichannel aggregation
Orders from:
- app
- web
- QR and NFC
- kiosk
- POS
- future third-party partner channels
should enter one controlled production queue.

This aligns with the KDS routing and omnichannel aggregation model in the uploaded design. fileciteturn26file0

---

## 11. Contactless and NFC payment model

### 11.1 Supported payment surfaces
Support:
- wallet balance
- credit and debit card
- Apple Pay
- Google Pay
- NFC wristband and RFID token
- QR pay request
- room-charge or account-charge if hospitality is active

### 11.2 NFC wearables
Allow linked wearable identifiers for:
- quick payment
- loyalty identification
- order pickup linking
- access-controlled event or hospitality bundles

### 11.3 Tokenization rule
Never store raw payment details on wearable identifiers.
Use secure tokenized linking only.

### 11.4 Smart table and counter surfaces
Support NFC or QR menu activation for:
- seated customers
- shared tables
- event areas
- quick-scan self-order points

The uploaded design recommends NFC wearables and smart NFC table menus as frictionless payment and ordering mechanisms. fileciteturn26file0

---

## 12. Group orders and split billing

### 12.1 Group order types
Support:
- team and group shared cart
- equal split
- split by item
- host pays then requests reimbursement
- asynchronous contribution flow

### 12.2 UX requirements
The split flow must clearly show:
- participants
- claimed items
- unclaimed items
- equal split calculations
- fees and tax treatment
- settlement deadlines

### 12.3 Asynchronous clearing
Allow the primary user to guarantee the order, with the system collecting from group members later where configured.

### 12.4 Risk rule
Restaurant should not carry uncontrolled group-payment risk.
Support timeouts, fallback billing, and host confirmation.

The uploaded design explicitly calls for equal split, split by item, QR or session join, and asynchronous clearing patterns. fileciteturn26file0

---

## 13. Gamification and loyalty

### 13.1 Unified points economy
Integrate F&B into the broader SkyLara points and reward system where possible.

Users can earn points from:
- restaurant spend
- repeat visits
- event participation
- operational behaviors such as self check-in or advance booking if platform policy enables that
- milestones
- promotional challenges

### 13.2 Loyalty tiers
Support:
- Bronze
- Silver
- Gold
- Platinum
or tenant-custom tiers

### 13.3 Challenge mechanics
Support:
- streaks
- timed challenges
- daypart multipliers
- event-specific offers
- post-jump reward offers
- milestone-linked unlocks

### 13.4 Reward examples
- free drink
- discount coupon
- priority prep
- exclusive menu item
- merch unlock
- event-only reward
- celebration reward on jump milestone

### 13.5 Leaderboards
Optional leaderboards can track:
- spend points
- challenge completions
- social and community engagement
- cross-pollinated rewards with jump milestones

The uploaded design strongly recommends points, tiers, streaks, challenges, leaderboards, and jump-milestone-linked F&B rewards. fileciteturn26file0

---

## 14. Social, media, and community integration

### 14.1 Social layer
The module can integrate with:
- team feeds
- event feeds
- who’s here and where to meet
- post-jump social plans
- shared reward or group-order achievements

### 14.2 Media tie-in
If athlete media or tandem media exists in SkyLara:
- users can be nudged to order while viewing their content
- celebration bundles can be offered after media delivery
- milestone media moments can unlock rewards

### 14.3 Privacy rule
Media-linked promotion must respect the platform’s media permission model.

The uploaded design connects F&B engagement with social hubs and AI-powered media distribution. fileciteturn26file0

---

## 15. Analytics and intelligence

### 15.1 Core analytics
Track:
- orders by load window
- orders by landing time clusters
- item popularity
- bundle performance
- prep time accuracy
- queue depth
- delay impact
- loyalty usage
- wallet usage
- group order behavior
- conversion by page layout or offer type

### 15.2 Predictive intelligence
Use:
- weather forecasts
- manifest reservations
- event attendance
- historical consumption
- daypart patterns
to support:
- staffing predictions
- inventory predictions
- prep forecasting
- offer targeting

### 15.3 Menu engineering
Allow A/B testing for:
- layouts
- photography
- descriptions
- upsells
- featured bundles
- CTA placement

The uploaded design highlights menu engineering, A/B testing, and labor and inventory forecasting from manifest and weather-linked data. fileciteturn26file0

---

## 16. Dashboard and admin workflows

### 16.1 Main dashboard routes
Create:
- `/dashboard/fnb`
- `/dashboard/fnb/overview`
- `/dashboard/fnb/menu`
- `/dashboard/fnb/inventory`
- `/dashboard/fnb/orders`
- `/dashboard/fnb/kds`
- `/dashboard/fnb/outlets`
- `/dashboard/fnb/preorder-rules`
- `/dashboard/fnb/telemetry-sync`
- `/dashboard/fnb/loyalty`
- `/dashboard/fnb/promotions`
- `/dashboard/fnb/analytics`
- `/dashboard/fnb/settings`

### 16.2 Menu admin
Admins should control:
- categories
- items
- variants
- pricing
- media
- sold-out state
- scheduling
- outlet visibility
- event-only items

### 16.3 Pre-order rules
Admins should control:
- fire timing
- load-linked prep rules
- delay logic
- hold logic
- post-jump pickup windows
- notification templates

### 16.4 Loyalty admin
Admins should control:
- points rules
- tier thresholds
- reward catalog
- streak definitions
- campaign challenges
- milestone reward mappings

---

## 17. Web, mobile, and account surfaces

### 17.1 Mobile screens
Create or support:
- F&B home
- menu browse
- item detail
- cart
- checkout
- split bill setup
- order status
- loyalty and rewards
- favorites and reorder
- post-jump meal flow
- QR or NFC pay state
- order history

### 17.2 Web routes
Support:
- `/eat`
- `/eat/menu`
- `/eat/cart`
- `/eat/orders`
- `/eat/rewards`
- `/account/eat`
- `/account/eat/orders`
- `/account/eat/rewards`

### 17.3 Public portal integration
Optional public website sections can expose:
- menu
- opening hours
- featured items
- event specials
- public QR ordering entry
depending on tenant settings

---

## 18. Core APIs

### Menu and catalog
- GET `/api/v1/fnb/menu`
- GET `/api/v1/fnb/menu/:itemId`
- GET `/api/v1/fnb/categories`
- GET `/api/v1/fnb/outlets`

### Orders
- POST `/api/v1/fnb/orders`
- GET `/api/v1/fnb/orders/:id`
- GET `/api/v1/account/fnb/orders`
- POST `/api/v1/fnb/orders/:id/cancel`
- POST `/api/v1/fnb/orders/:id/claim-split`

### Telemetry and pre-order
- POST `/api/v1/fnb/preorder/evaluate`
- POST `/api/v1/fnb/telemetry/webhook`
- PATCH `/api/v1/fnb/orders/:id/fire`
- PATCH `/api/v1/fnb/orders/:id/delay`

### KDS
- GET `/api/v1/fnb/kds/station/:stationId`
- PATCH `/api/v1/fnb/kds/item/:id/status`
- PATCH `/api/v1/fnb/kds/order/:id/ready`

### Loyalty
- GET `/api/v1/account/fnb/rewards`
- POST `/api/v1/fnb/rewards/redeem`
- GET `/api/v1/fnb/leaderboard`

### Admin
- PATCH `/api/v1/dz/:dzId/fnb/settings`
- POST `/api/v1/dz/:dzId/fnb/menu/item`
- PATCH `/api/v1/dz/:dzId/fnb/menu/item/:id`
- PATCH `/api/v1/dz/:dzId/fnb/inventory/:id`

---

## 19. Data model additions

Likely entities:
- fnb_outlets
- fnb_categories
- fnb_menu_items
- fnb_menu_item_variants
- fnb_menu_modifiers
- fnb_inventory_items
- fnb_orders
- fnb_order_items
- fnb_order_splits
- fnb_station_routes
- fnb_kds_tickets
- fnb_preorder_rules
- fnb_telemetry_links
- fnb_rewards_catalog
- fnb_loyalty_events
- fnb_campaign_challenges
- fnb_table_tokens
- fnb_nfc_tokens
- fnb_order_notifications

---

## 20. Security and operational rules

### 20.1 Backend truth
Prices, totals, taxes, and splits must be calculated server-side.

### 20.2 Auditability
Audit:
- price changes
- refunds
- cancellations
- reward redemptions
- split-bill adjustments
- telemetry-triggered order firing
- manual KDS overrides

### 20.3 Safety rule
If operational state indicates no service should be fired yet, the system must not prematurely release prep.

### 20.4 Offline rule
If local POS or KDS has offline behavior, reconciliation must preserve backend ledger truth and auditability.

---

## 21. Best phased implementation

### Phase 1 — foundation and identity
Build:
- menu catalog
- ordering surfaces
- account integration
- role model
- backend pricing truth

### Phase 2 — POS, inventory, and KDS
Build:
- inventory sync
- KDS routing
- order lifecycle
- wait time system

### Phase 3 — telemetry integration
Build:
- load-linked pre-ordering
- flight-synced timing
- delay and weather hold behavior
- notification automation

### Phase 4 — wallets, NFC, and split billing
Build:
- wallet spend
- contactless and token-based flows
- split billing
- asynchronous contribution logic

### Phase 5 — loyalty, social, and optimization
Build:
- loyalty
- challenges
- leaderboards
- milestone rewards
- predictive analytics
- A/B testing

---

## 22. Final recommendation

The best SkyLara F&B system should be:
- a dropzone-native hospitality module
- deeply integrated with manifest and identity
- responsive on mobile, web, kiosk, and POS surfaces
- secure and backend-priced
- KDS-routed and telemetry-aware
- wallet-enabled and contactless
- group-order and split-bill capable
- loyalty-driven and community-aware
- analytically optimized and event-aware

---

## 23. Claude Code prompt

```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal Hospitality Systems Architect, Principal KDS/POS Architect, Principal Payments and Wallet Architect, Principal QA Lead, and Principal Analytics Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Final_Implementation_Spec.md
- docs/SkyLara_Public_Web_Portal_Master_Spec.md
- docs/SkyLara_Global_Platform_Control_Hospitality_Reputation_Master_Spec.md
- docs/SkyLara_ProductionSystems_v1.md
- docs/SkyLara_Integrated_Food_and_Beverage_Module_Master_Spec.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Build a production-grade integrated food and beverage module for SkyLara that connects menu, ordering, inventory, kitchen routing, split billing, wallet, loyalty, and flight-synced pre-ordering into one backend truth across dashboard, web, PWA, and mobile.

Non-negotiable rules:
1. Keep V1 as modular monolith with strict service boundaries.
2. Build one backend truth for dashboard, web, PWA, mobile, POS, and KDS surfaces.
3. Do not hardcode pricing or trust client-side totals.
4. Integrate with existing identity, manifest, wallet, notification, and gamification systems where possible.
5. Telemetry-driven pre-ordering must be event-based and auditable.
6. Inventory and menu status must stay synchronized.
7. KDS routing must support multi-station workflows.
8. Split billing, rewards, and wallet flows must remain auditable.
9. Do not mark it complete unless menu, order flow, KDS, telemetry sync, wallet, and staff and admin controls actually work together.

Start with audit only, no coding.

Return:
1. selected docs
2. reusable models, APIs, event hooks, wallet and payment systems, and manifest integrations already in the repo
3. missing work needed for F&B integration
4. exact files to create or edit
5. schema changes needed
6. API groups to add
7. dashboard routes and UI to add
8. implementation risks
9. recommended Phase 1
```

---

## 24. Suggested repo filename
Use:
`docs/SkyLara_Integrated_Food_and_Beverage_Module_Master_Spec.md`
