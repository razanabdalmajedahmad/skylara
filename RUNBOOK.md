# SkyLara MVP — Runbook

Production-ready setup, deployment, and operations guide.

---

## Prerequisites

- **Node.js** 20+ and npm 10+
- **MySQL** 8.0 (local install or Docker)
- **Git** 2.x

---

## Quick Start (Local Development)

### Option A: Docker for database only (recommended)

```bash
# 1. Start MySQL
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
cd app
npm install

# 3. Generate Prisma client
npm run db:generate

# 4. Push schema to database
npm run db:push

# 5. Seed demo data
npm run db:seed:all

# 6. Start dev servers (API on :3001, Web on :3000)
npm run dev
```

### Option B: Local MySQL

```bash
# 1. Create the database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS skylara;"

# 2. Copy and edit .env
cp .env.example .env
# Edit DATABASE_URL to match your credentials

# 3-6 same as above
npm install
npm run db:generate
npm run db:push
npm run db:seed:all
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Environment Variables

Only one variable is **required** for local dev:

| Variable | Default | Required |
|---|---|---|
| `DATABASE_URL` | `mysql://root:password@localhost:3306/skylara` | Yes |
| `JWT_SECRET` | auto-set in .env | Yes (production) |
| `PORT` | `3001` | No |
| `CORS_ORIGIN` | `http://localhost:3000` | No |
| `NODE_ENV` | `development` | No |

All external services (Stripe, SendGrid, Twilio, AWS, etc.) are **disabled by default** in the demo. Set real keys in .env when ready to enable them.

---

## Demo Accounts

All accounts use password: **`skylara2026`**

| Role | Email |
|---|---|
| DZ Manager / Admin | `admin@skylara.dev` |
| Manifest Staff | `manifest@skylara.dev` |
| Safety Officer | `safety@skylara.dev` |
| Coach | `coach1@skylara.dev` |
| Pilot | `pilot@skylara.dev` |
| Athletes (20) | `athlete1@skylara.dev` … `athlete20@skylara.dev` |

---

## Database Commands

```bash
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema (dev — no migration files)
npm run db:migrate      # Create and run migration (production flow)
npm run db:migrate:deploy # Deploy pending migrations (CI/CD)
npm run db:seed         # Seed core data (users, loads, slots)
npm run db:seed:support # Seed support layer (articles, tours, ideas)
npm run db:seed:all     # Both seeds
npm run db:studio       # Open Prisma Studio GUI on :5555
npm run db:reset        # Drop and recreate database + seed
```

---

## Architecture

```
app/
├── prisma/              # Schema + seed files
├── apps/
│   ├── api/             # Fastify 4 API (port 3001)
│   │   └── src/
│   │       ├── routes/       # 12 route modules, 65+ endpoints
│   │       ├── services/     # LoadFSM, CG calculator, validation gates
│   │       ├── middleware/   # auth, authorize, tenantScope
│   │       ├── plugins/      # prisma, auth, websocket
│   │       └── utils/        # jwt, errors, password
│   ├── web/             # Next.js 14 PWA (port 3000)
│   │   └── src/
│   │       ├── app/          # 16 pages (App Router)
│   │       ├── components/   # 15 UI components
│   │       ├── hooks/        # 6 React hooks
│   │       └── lib/          # API client, offline, sync, demo state
│   └── mobile/          # React Native / Expo SDK 52 (port 8081)
│       └── src/
│           ├── app/
│           │   ├── (auth)/       # Login, Register, Forgot Password
│           │   ├── (tabs)/       # Home, Logbook, Chat, Profile
│           │   ├── checkin/      # QR scan check-in
│           │   ├── manifest/    # Load board
│           │   ├── booking/     # Booking flow
│           │   ├── payments/    # Wallet & transactions
│           │   └── ...          # weather, safety, notifications, social
│           ├── lib/              # oauth, biometric, notifications, secure-store
│           ├── stores/           # Zustand state management
│           └── hooks/            # Push notifications, offline hooks
├── packages/
│   ├── types/           # Shared TypeScript types + enums
│   ├── config/          # Safety constants, FSM rules
│   ├── ui/              # UI component library (stub)
│   ├── knowledge-base/  # Help articles + search
│   ├── portal-assistant/# Pattern-matching chat engine
│   └── walkthroughs/    # Guided tour definitions
├── Dockerfile           # Multi-stage production build
├── docker-compose.yml   # Full production stack
├── docker-compose.dev.yml # Dev infra (MySQL + Redis)
└── .github/workflows/ci.yml # GitHub Actions CI pipeline
```

---

## Mobile App (Expo)

```bash
# Start mobile dev server (Expo Web on :8081)
cd apps/mobile
npx expo start --web --clear

# Start on iOS simulator
npx expo run:ios

# Start on Android emulator
npx expo run:android
```

### Mobile Auth Flow
- **Login**: Email/password + Google OAuth + Apple Sign-In (iOS) + Biometric (Face ID/Touch ID)
- **Register**: Full form (name, email, phone, password with strength meter) + Google OAuth + Apple Sign-In (iOS)
- **Forgot Password**: Email-based reset link with resend option

### Mobile Environment Variables
| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console OAuth 2.0 Client ID |
| `EXPO_PUBLIC_API_URL` | Yes | Backend API URL (default: `http://localhost:3001/api`) |

### Platform-Specific Behavior
- **iOS**: Full feature set — Google OAuth, Apple Sign-In, Face ID/Touch ID, Camera (QR scan), Haptics
- **Android**: Google OAuth, fingerprint auth, Camera (QR scan), Haptics
- **Web (Expo)**: Email/password only, manual check-in entry (no camera), localStorage fallback for secure store

---

## Production Build

```bash
# Build all packages + apps
npm run build

# Start API
npm run start --workspace=@skylara/api

# Start Web
npm run start --workspace=@skylara/web
```

---

## Docker Deployment

```bash
# Full stack (MySQL + Redis + API + Web)
docker compose up -d

# With custom env
JWT_SECRET=your-production-secret docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f web
```

The docker-compose stack:
- `skylara-db`: MySQL 8.0 on :3306 with health checks
- `skylara-redis`: Redis 7 on :6379
- `skylara-api`: API on :3001 (auto-runs migrations on start)
- `skylara-web`: Web on :3000

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push to `main` and all PRs:

1. **lint-and-type-check** — ESLint + TypeScript validation
2. **test** — Unit tests with MySQL service container
3. **build** — Full monorepo build
4. **docker** — Build + push image to GHCR (main branch only)

---

## API Endpoints

| Module | Prefix | Auth | Endpoints |
|---|---|---|---|
| Auth | `/api/auth` | Public | register, login, refresh, logout, me, oauth/exchange, oauth/apple |
| Identity | `/api/identity` | JWT | profile CRUD, search, QR |
| Manifest | `/api/manifest` | JWT | loads, slots, lock, CG, groups |
| Payments | `/api/payments` | JWT | wallets, transactions, tickets |
| Gear | `/api/gear` | JWT | items, checks, maintenance |
| Safety | `/api/safety` | JWT | incidents, emergency, reports |
| Notifications | `/api/notifications` | JWT | list, mark-read, preferences |
| Admin | `/api/admin` | JWT+Role | audit logs, settings, org |
| Sync | `/api/sync` | JWT | push/pull delta sync |
| Help Center | `/api/help` | Public | articles, categories, search |
| Portal Assistant | `/api/assistant` | JWT | query, suggest, feedback |
| Ideas & Notes | `/api/ideas` | JWT | CRUD, vote, status workflow |
| Walkthroughs | `/api/tours` | JWT | tours, steps, progress |
| Health | `/health` | Public | health check |

---

## Support Layer Features

- **Help Center**: 25 searchable articles across 11 categories, offline-cached
- **Portal Assistant**: Pattern-matching chat with 120 prompt suggestions, no external AI
- **Ideas & Notes**: Feature request board with admin review workflow
- **Guided Walkthroughs**: 4 role-specific tours (DZ Manager, Manifest, Coach, Athlete)
- **Feature Registry**: 12 features with availability status per role

---

## Known Limitations

1. **External services are mocked**: Stripe, SendGrid, Twilio, AWS S3, weather APIs — set real keys to enable
2. **OAuth requires credentials**: Google/Apple OAuth flows are fully wired — set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and Apple Developer credentials to enable
3. **RS256 JWT**: Requires RSA key pair in production — dev uses HS256 with shared secret
4. **Redis**: Used for caching in production — app runs without it in dev
5. **WebSocket**: Real-time manifest updates work in dev; needs sticky sessions behind load balancer
6. **PWA**: Service worker registered but full offline sync needs testing on real devices
7. **UI component library** (`@repo/ui`): Foundation components (**Spinner**, **PageLoading**, **PageEmpty**, **PageError**, **tokens**); domain screens may still use `apps/web/src/components/` — prefer `@repo/ui` for shared empty/loading/error patterns.
8. **Apple Sign-In**: Only renders on iOS devices (`Platform.OS === 'ios'`); hidden on Android and web

---

## Troubleshooting

**`Cannot find module '@prisma/client'`**
→ Run `npm run db:generate`

**`Error: P1001 Can't reach database server`**
→ Ensure MySQL is running on port 3306

**Port conflict on 3000 or 3001**
→ Set `PORT=3002` in .env or kill the conflicting process

**`workspace:* unsupported`**
→ Ensure all `package.json` files use `"*"` not `"workspace:*"` — already fixed in this build
