# SkyLara Canonical Implementation Truth v2
**Date:** 2026-04-08 | **Status:** Pilot-Ready

## Final Module Map (22 modules)
1. Auth & Identity ✅
2. RBAC & Permissions ✅
3. Manifest & Load Management ✅ (11-state FSM, CG gate)
4. Check-In & Compliance ✅ (10 safety gates)
5. Safety & Emergency ✅ (5 endpoints)
6. Athlete Identity & Logbook ✅
7. Payments & Wallet ✅ (6 endpoints)
8. Booking & Scheduling ✅ (10 endpoints)
9. Notifications & Comms ✅ (11 endpoints)
10. Weather & Airspace ✅ (real Open-Meteo data)
11. Aircraft & Pilot Management ✅ (5 endpoints)
12. CG & Weight-Balance ✅ (blocking gate)
13. Equipment & Gear ✅ (12 endpoints, canonical conditions)
14. Reserve Repack & AAD ✅ (repack queue)
15. Gear Rental & Assignment ✅
16. Training & AFF Progression ✅ (L1-8)
17. Reporting & Intelligence ✅ (7 endpoints)
18. Boogies & Events ✅ (34 endpoints, 11 pages, matching engine)
19. Documents ✅ (7 categories)
20. Enterprise Branding ✅ (white-label, 7 tabs)
21. Multi-Currency ✅ (AED base, 10 currencies)
22. Coaching Sessions ✅ (5 endpoints)

## Final Role Map (10+1 roles)
PLATFORM_ADMIN > DZ_OWNER > DZ_MANAGER > MANIFEST_STAFF > TI/AFFI/COACH > PILOT/RIGGER > ATHLETE > STUDENT (+SPECTATOR read-only)

## Final Safety Tier Model
- CRITICAL: CG override, emergency, load cancel (DZ_OWNER+ with reason)
- HIGH: Post-LOCKED manifest changes, financial override (DZ_MANAGER+)
- STANDARD: Create load, assign slots, check-in (MANIFEST_STAFF)
- BASIC: View load board, self-manifest (ATHLETE)

## Final DB Domain (87 models across 14 domains)
Identity (7), Tenant (4), Manifest (6), Aircraft (1), Training (6), Safety (5), Gear (3), Finance (8), Booking (4), Boogies (8), Branding (1), Reporting (2), Support (20+), Coaching (2)

## Final MVP Scope ✅ IMPLEMENTED
Auth, RBAC, manifest FSM, CG gate, 10 safety gates, check-in, booking, payments, wallet, gear, AFF, instructor matching, weather, reporting, notifications, documents, branding, boogies, coaching

## Mobile App (Expo SDK 52) ✅ IMPLEMENTED
- Auth: Login (email + Google + Apple + Biometric), Register (email + Google + Apple), Forgot Password
- Tabs: Home, Logbook, Chat, Profile
- Screens: Check-In (QR scan), Manifest, Booking, Payments, Weather, Safety, Notifications, Social
- Cross-platform: iOS, Android, Web (dynamic native imports, localStorage fallback)
- OAuth: expo-auth-session (Google), expo-apple-authentication (Apple, iOS only)
- Storage: expo-secure-store (native), localStorage (web)

## Post-MVP Scope (not yet implemented)
Shop/marketplace, multi-DZ admin panel, advanced AI insights, video/media pipeline, P2P slot resale, NOTAM/airspace integration

## Final Naming Standards
- DB: snake_case tables, camelCase fields
- API: /api/v1/resource-name (REST)
- TS: camelCase variables, PascalCase types/interfaces
- Enums: UPPER_SNAKE_CASE values

## Final Event Standards
- Financial: transactional outbox (event_outbox table)
- Manifest: in-process EventBus
- Safety: high-priority EventBus
- UI: WebSocket broadcast (best-effort)

## Final Offline Strategy
- Tier 1 (Never Fail): manifest, check-in, emergency profiles
- Tier 2 (Should Continue): gear checks, QR scan, payment capture
- Tier 3 (Can Defer): analytics, remote notifications, cross-DZ sync
