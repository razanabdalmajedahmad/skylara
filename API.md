# SkyLara API Reference

**Base URL:** `https://api.yourdomain.com/api`
**Versioning:** `/api/v1/*` is supported (maps to `/api/*`)
**Auth:** Bearer JWT token in `Authorization` header
**Response headers:** `X-Request-Id`, `X-API-Version`

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT pair |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Invalidate refresh token |
| POST | `/auth/forgot-password` | No | Request password reset email |
| POST | `/auth/reset-password` | No | Reset password with token |
| POST | `/auth/google` | No | Google OAuth login |
| POST | `/auth/apple` | No | Apple Sign-In |
| POST | `/auth/passkey/register` | Yes | Register WebAuthn passkey |
| POST | `/auth/passkey/authenticate` | No | Authenticate with passkey |
| POST | `/auth/mfa/setup` | Yes | Setup TOTP MFA |
| POST | `/auth/mfa/verify` | Yes | Verify MFA code |

## Identity & Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/profile` | Yes | Get current user profile |
| PUT | `/identity/profile` | Yes | Update profile |
| POST | `/identity/biometric/setup` | Yes | Enable Face ID / Touch ID |

## Manifest & Loads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/loads` | Yes | List loads (filters: status, date) |
| POST | `/loads` | Staff | Create new load |
| GET | `/loads/:id` | Yes | Get load details |
| PATCH | `/loads/:id` | Staff | Update load |
| POST | `/loads/:id/transition` | Staff | FSM state transition |
| POST | `/loads/:id/slots` | Staff | Add slot to load |
| DELETE | `/loads/:id/slots/:slotId` | Staff | Remove slot |
| POST | `/loads/:id/cg-check` | Staff | Run CG calculation |
| POST | `/loads/:id/lock` | Staff | Lock load |
| POST | `/loads/:id/exit-order` | Staff | Compute exit order |
| POST | `/loads/:id/pilot-confirmation` | Pilot | Confirm/reject W&B |
| GET | `/loads/:id/planning-status` | Yes | Planning estimate with pilot status |
| POST | `/self-manifest` | Athlete+ | One-tap join best available load |
| GET | `/manifest/board` | Yes | Load board (cached) |
| GET | `/manifest/insights` | Staff | Operational insights |

## Waitlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/waitlist` | Athlete+ | Join waitlist |
| GET | `/waitlist` | Staff | View waitlist |
| POST | `/waitlist/:id/confirm` | Athlete+ | Confirm waitlist offer |
| POST | `/waitlist/expire-offers` | Staff | Expire unclaimed offers |
| DELETE | `/waitlist/:id` | Athlete+ | Leave waitlist |

## Aircraft

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/aircraft` | Yes | List DZ aircraft |
| POST | `/aircraft` | Manager+ | Create aircraft |
| PATCH | `/aircraft/:id` | Manager+ | Update aircraft |
| POST | `/aircraft/:id/pilot-confirm` | Pilot | Pilot fuel/weight confirmation |

## Weather

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/weather` | Yes | Current weather + jumpability index |
| POST | `/weather/evaluate` | Yes | Evaluate thresholds per activity type |
| GET | `/weather/thresholds` | Yes | Get DZ-configured thresholds |
| GET | `/weather/holds` | Yes | List weather holds |
| POST | `/weather/holds` | Staff | Activate weather hold |
| POST | `/weather/holds/:id/clear` | Staff | Clear weather hold |
| POST | `/weather/observation` | Staff | Log manual observation |

## Payments & Wallet

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payments/wallet` | Yes | Get wallet balance |
| POST | `/payments/wallet/topup` | Yes | Top up wallet |
| POST | `/payments/charge` | Staff | Charge jumper |
| GET | `/payments/transactions` | Yes | Transaction history |
| POST | `/payments/refund` | Manager+ | Issue refund |
| POST | `/payments/webhook` | No* | Stripe webhook (*signature verified) |
| POST | `/payments/connect/onboard` | Manager+ | Stripe Connect onboard |
| GET | `/payments/payouts` | Manager+ | Payout history |

## Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/bookings` | Yes | List bookings |
| POST | `/bookings` | Yes | Create booking |
| GET | `/bookings/:id` | Yes | Booking details |
| PATCH | `/bookings/:id` | Staff | Update booking |
| GET | `/booking-packages` | Yes | Available packages |

## Gear & Rig Maintenance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/gear` | Yes | List gear items |
| POST | `/gear` | Yes | Register gear |
| GET | `/rig-maintenance/rigs` | Yes | List rigs |
| POST | `/rig-maintenance/rigs` | Yes | Register rig |
| GET | `/rig-maintenance/rigs/:id/status` | Yes | Rig maintenance status |
| POST | `/rig-maintenance/rigs/:id/ground` | Manager+ | Ground a rig |
| POST | `/rig-maintenance/rigs/:id/clear` | Manager+ | Clear grounding |
| POST | `/rig-maintenance/events` | Rigger+ | Log maintenance event |

## Safety & Compliance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/safety/incidents` | Yes | List incidents |
| POST | `/safety/incidents` | Yes | Report incident |
| GET | `/safety/emergency/:userId` | Yes | Emergency profile |
| POST | `/safety/compliance-check` | Staff | Run all safety gates |
| GET | `/verifications` | Staff | List verifications |
| POST | `/verifications` | Staff | Create/update verification |

## Waivers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/waivers` | Yes | List waiver status |
| POST | `/waivers/sign` | Yes | Sign waiver |
| GET | `/waiver-center/templates` | Manager+ | Waiver templates |
| POST | `/waiver-center/templates` | Manager+ | Create template |
| POST | `/waiver-center/publish` | Manager+ | Publish waiver link |

## Notifications & Messaging

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | User notification inbox |
| PATCH | `/notifications/:id/read` | Yes | Mark as read |
| POST | `/ops-messaging/private` | Staff | Private message to athlete |
| POST | `/ops-messaging/load-message` | Staff | Message all on a load |
| POST | `/ops-messaging/group-message` | Staff | Message selected group |
| GET | `/ops-messaging/history` | Staff | Message audit trail |
| GET | `/ops-messaging/templates` | Yes | Quick-send templates |

## Learning & Subscriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/learning/courses` | Yes | Course catalog |
| POST | `/learning/enroll` | Yes | Enroll in course |
| GET | `/learning/progress` | Yes | My progress |
| POST | `/learning/quiz/submit` | Yes | Submit quiz answers |
| GET | `/learning/certificates` | Yes | My certificates |
| POST | `/learning/subscription/checkout` | Yes | Stripe checkout for tier |
| POST | `/learning/subscription/confirm` | Yes | Confirm payment, activate |

## Shop

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shop/products` | Yes | Product catalog |
| POST | `/shop/orders` | Yes | Create order |
| POST | `/shop/orders/:id/checkout` | Yes | Stripe payment intent |
| POST | `/shop/orders/:id/confirm-payment` | Yes | Verify payment, mark PAID |

## AI & Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/manifest/recommendations` | Staff | Operational recommendations |
| POST | `/ai/manifest/recommendations/:id/action` | Staff | Accept/edit/reject |
| POST | `/assistant/ask` | Yes | AI assistant query |
| GET | `/assistant/conversations` | Yes | Conversation history |

## Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports/revenue` | Manager+ | Revenue breakdown (cached) |
| GET | `/reports/utilization` | Manager+ | Load utilization % |
| GET | `/reports/refunds` | Manager+ | Refund reporting |
| GET | `/reports/operational` | Manager+ | Daily ops summary |
| GET | `/reports/loads/csv` | Manager+ | Export loads CSV |
| GET | `/reports/athletes/csv` | Manager+ | Export athletes CSV |

## Federation (Cross-DZ)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/federation/athlete/:uuid` | Yes | Portable athlete profile |
| GET | `/federation/verify-license` | Yes | Cross-DZ license check |
| POST | `/federation/link-account` | Yes | Link to another DZ |

## Data Migration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/migration/preview` | Manager+ | CSV parse + column suggestions |
| POST | `/migration/validate` | Manager+ | Validate mapped data |
| POST | `/migration/commit` | Manager+ | Import with batch_id |
| POST | `/migration/rollback` | Manager+ | Rollback by batch_id |
| GET | `/migration/history` | Manager+ | Import audit trail |

## Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/settings` | Manager+ | Get DZ settings |
| PUT | `/admin/settings` | Manager+ | Update DZ settings |
| GET | `/admin/audit-logs` | Manager+ | Audit log viewer |
| GET | `/admin/dlq` | Admin | Dead letter queue |
| GET | `/admin/dlq/stats` | Admin | DLQ depth stats |
| POST | `/admin/dlq/:id/retry` | Admin | Retry failed event |
| POST | `/admin/dlq/:id/discard` | Admin | Discard failed event |

## File Uploads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/uploads/presign` | Yes | Get presigned S3 upload URL |
| POST | `/uploads/download-url` | Yes | Get presigned download URL |
| DELETE | `/uploads/:fileKey` | Manager+ | Delete file |
| GET | `/uploads/config/:category` | Yes | Upload constraints |

## Sync (Offline)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sync/push` | Yes | Push offline changes |
| GET | `/sync/pull` | Yes | Pull changes since timestamp |
| POST | `/sync/resolve` | Yes | Resolve sync conflict |
| GET | `/mobile/bootstrap` | Yes | App startup config |
| GET | `/mobile/policies` | Yes | Resolved DZ policies |
| GET | `/mobile/manifest-context` | Yes | Current loads snapshot |

## System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check (DB, Redis, S3, circuit breakers) |
| GET | `/ws/:dropzoneId` | JWT | WebSocket connection for real-time updates |

---

**Role abbreviations:** Admin = PLATFORM_ADMIN, Manager+ = DZ_MANAGER or above, Staff = MANIFEST_STAFF or above, Pilot = PILOT role, Rigger+ = RIGGER or above, Athlete+ = any authenticated user, Yes = any authenticated user, No = public.
