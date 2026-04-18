# SkyLara — Global Operating System for Flying

SkyLara is a production-grade operating system for skydiving dropzones and flying communities. It handles manifest operations, athlete identity, safety compliance, payments, learning, hiring, weather ops, gear maintenance, and operational intelligence — built to scale to 1,000 dropzones and 1,000,000 users worldwide.

## Documentation

| Doc | Description |
|-----|-------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Local setup, Docker, cloud deployment (Railway/Render/AWS), database, SSL |
| [API.md](API.md) | All 250+ API endpoints organized by module with auth requirements |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Every 3rd party service: setup steps, env vars, dashboard location |
| [CLAUDE.md](../CLAUDE.md) | Architecture rules, module specs, task-to-doc mapping |

## Architecture

```
apps/api     — Fastify API (Node.js 20, TypeScript, Prisma, MySQL 8.0)
apps/web     — Next.js 14 dashboard (React 18, TailwindCSS)
apps/mobile  — React Native mobile app (Expo SDK 52)
packages/    — Shared types, config, UI components, knowledge base
```

**Stack:** Fastify + MySQL 8.0 + Redis 7 + Prisma ORM + Next.js 14 + React Native + Stripe + Twilio + SendGrid + AWS S3

**Key features:**
- 11-state load FSM with CG blocking gate and pilot confirmation
- 11 safety validation gates (license, currency, waiver, gear, rig, AAD, weight, pilot duty, aircraft)
- Hierarchical policy engine (platform > org > DZ > branch > ops-day)
- Real-time WebSocket manifest updates with JWT auth
- Offline-first sync with conflict resolution
- AI manifest agent (underfill merge, waitlist promotion, no-show prediction)
- Per-DZ configurable weather thresholds for 8 activity types
- Cross-DZ portable athlete identity (federation)
- Stripe checkout for wallet, shop, and learning subscriptions
- 10 test suites, CI/CD with schema validation, Docker multi-stage build

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- MySQL 8.0+
- Redis 7+ (for production)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd SkyLara/app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MySQL and API configuration

# Run database migrations
npx prisma migrate deploy

# Seed the database with demo data
npx prisma db seed

# Start development servers
npm run dev
```

The web app will be available at http://localhost:3000
The API will be available at http://localhost:3001

## Demo Logins

All demo accounts use password: `skylara2026`

### Platform Admins
| Email | Name | Role | Notes |
|-------|------|------|-------|
| admin@skylara.dev | Ali Kwika | Platform Admin, DZ Operator | Full system access |

### Staff (Dropzone)
| Email | Name | Role | Notes |
|-------|------|------|-------|
| manifest@skylara.dev | Sarah Chen | Manifest Staff | Manifest board, load creation |
| safety@skylara.dev | Mike Rodriguez | Safety Officer | Incident reporting, safety checks |
| pilot1@skylara.dev | Tom Wilson | Pilot | Aircraft operations |
| rigger@skylara.dev | Emma Davis | Rigger | Gear maintenance, packing |
| front@skylara.dev | Lisa Park | Front Desk | Check-in, customer service |

### Coaches & Instructors
| Email | Name | Role | Notes |
|-------|------|------|-------|
| tandem1@skylara.dev | Jake Hunter | Tandem Instructor, Camera Coach | Tandem jumps, video |
| tandem2@skylara.dev | Maria Santos | Tandem Instructor | Tandem jumps |
| aff1@skylara.dev | Chris Blake | AFF Instructor | AFF training |
| coach1@skylara.dev | Alex Kim | Coach | General coaching |

### Athletes (Sample)
| Email | Name | Jumps | License | Waiver | Notes |
|-------|------|-------|---------|--------|-------|
| athlete1@skylara.dev | John Smith | 500 | D | Signed | Experienced fun jumper |
| athlete2@skylara.dev | Jane Doe | 250 | C | Signed | Intermediate |
| athlete3@skylara.dev | Bob Johnson | 1000 | A | Signed | Very experienced |
| athlete4@skylara.dev | Alice Williams | 50 | Student | Signed | Student |
| athlete5@skylara.dev | Charlie Brown | 100 | B | Signed | Intermediate |
| athlete6@skylara.dev | Diana Prince | 5 | Student | Unsigned | Student - waiver pending |
| athlete7@skylara.dev | Eve Adams | 75 | B | Expired | Needs new waiver |
| ... | ... (athletes 8-20) | ... | ... | ... | Various skill levels |

## Architecture

### Technology Stack
- **Frontend (Web)**: Next.js 14, React 18, TailwindCSS
- **Frontend (Mobile)**: React Native 0.76, Expo SDK 52, NativeWind
- **Backend**: Fastify, Node.js 20
- **Database**: MySQL 8.0 with Prisma ORM
- **Auth**: JWT + Google OAuth + Apple Sign-In + Biometric (Face ID/Touch ID)
- **Offline**: IndexedDB (idb library), Service Workers
- **State Management**: TanStack Query (React Query), Zustand (mobile)
- **Real-time**: Socket.IO, Redis (Pub/Sub)

### Module Structure

```
/apps
  /web                       # Next.js frontend
    /src
      /app                   # Next.js app routes
      /components           # React components
      /hooks                # Custom hooks (useOffline, etc)
      /lib                  # Utilities (offlineStore, syncEngine, etc)
  /api                       # Fastify backend
    /src
      /routes               # API endpoints
      /services             # Business logic
      /middleware           # Auth, logging, etc
      /utils                # Helpers
  /mobile                    # React Native / Expo mobile app
    /src
      /app
        /(auth)             # Login, Register, Forgot Password
        /(tabs)             # Home, Logbook, Chat, Profile
        /checkin            # QR scan check-in
        /manifest           # Load board
        /booking            # Booking flow
        /payments           # Wallet & transactions
        /notifications      # Push notifications
        /weather            # Weather overlay
        /safety             # Safety reports
        /social             # Social feed
      /lib                  # oauth, biometric, notifications, secure-store
      /stores               # Zustand state (auth, offline)
      /hooks                # Push notifications, offline hooks

/packages
  /config                    # Shared config (TypeScript, ESLint)
  /types                     # Shared TypeScript types

/prisma
  /schema.prisma            # Database schema (75 tables)
  /migrations               # Database migrations
  /seed.ts                  # Seed script for demo data
```

### Key Features in MVP

1. **Real-time Manifest Management**
   - Load creation and slot assignment
   - Group manifest (multi-person jumps)
   - CG (center of gravity) calculation and locking

2. **Offline-First Architecture**
   - IndexedDB for local data storage
   - Sync outbox with idempotency keys
   - Conflict detection and resolution
   - Service Worker caching

3. **Compliance & Safety**
   - Waiver status validation (signed/expired/unsigned)
   - Gear check tracking
   - Incident reporting
   - Emergency profiles

4. **Check-In System**
   - QR code based check-in
   - Athlete profile validation
   - Payment verification

5. **Role-Based Access Control**
   - 8 core roles: Platform Admin, DZ Operator, Manifest Staff, Safety Officer, Pilot, Rigger, Front Desk, Athlete
   - Role-based UI and API access
   - Per-DZ permission overrides

## Demo Scenarios

### Scenario 1: Athlete QR Check-In

```
1. Login as athlete1@skylara.dev
2. Go to Profile page
3. Display personal QR code (or screenshot for testing)

4. Login as manifest@skylara.dev
5. Go to Check-In screen
6. Scan QR code (or manually enter athlete ID)
7. System shows:
   - Athlete: John Smith, 500 jumps
   - Waiver: SIGNED (expires 2027-04-07)
   - Gear: PASS (checked today)
   - Payment: $450 balance (covers $50 jump fee)
   - Result: CHECK IN (green button)

8. Athlete appears in Load 1 roster
```

### Scenario 2: Staff Manifests Fun Jumper Group

```
1. Login as manifest@skylara.dev
2. Go to Manifest Board
3. See Load 1 (FILLING): 8/15 slots filled

4. Click "Manifest Group" button
5. Select "Saturday RW Team" from dropdown
6. System shows group details:
   - Captain: athlete1@skylara.dev
   - Members: athlete2, athlete3, athlete4
   - All waivers: SIGNED
   - All gear checks: PASS
   - Combined weight: 650 lbs

7. Click "Manifest" to assign slots 2-5
8. Confirmation popup
9. Load 1 now shows 12/15 slots
10. Group members added to Load 1 roster
```

### Scenario 3: AFF Student Blocked by Waiver

```
1. Login as manifest@skylara.dev
2. Try to add athlete7@skylara.dev (Eve Adams, expired waiver) to Load 2
3. System blocks manifest with safety gate:
   - "Waiver expired on 2025-01-15"
   - "Cannot manifest - waiver status: EXPIRED"
   - "Renew waiver before manifesting"
   - No override option (safety first)

4. Cannot proceed
5. Staff must direct athlete to sign new waiver first
```

### Scenario 4: Load Locked After CG Pass

```
1. Login as manifest@skylara.dev
2. Load 1 has 12 athletes manifested
3. Click "Calculate CG" button
4. System runs center of gravity calculation:
   - Total weight: 1800 lbs
   - Distribution: balanced within limits
   - Result: CG PASS (green indicator)

5. Click "Lock Load" button
6. Load transitions from FILLING -> LOCKED
7. No more manifest changes allowed
8. Boarding timer starts (typically 30 min to exit)
9. Boarding call notification sent to all manifested athletes
```

### Scenario 5: Coach Assigned to Session

```
1. Login as manifest@skylara.dev
2. Load 2 is OPEN with 3 slots filled

3. Click on slot 4, choose "Add Slot"
4. Select coach1@skylara.dev (Alex Kim)
5. Select slot type: COACH
6. Click "Assign"

7. Now assign coaching student:
   - Click on unassigned slot
   - Search athlete4@skylara.dev (Alice Williams, 50 jumps, STUDENT)
   - Click "Assign as Coaching Student"
   - Select level: "Level 1 Ground School"

8. Both manifested to Load 2
9. Coach and student both notified with coaching details
10. Session details recorded for logbook
```

### Scenario 6: Offline Check-In and Sync

```
1. Login as manifest@skylara.dev
2. Manifest Board shows: "Synced" (green indicator at bottom)

3. Turn on airplane mode (or disable network)
4. Check in 3 athletes:
   - athlete1: CHECK IN successful
   - athlete2: CHECK IN successful
   - athlete5: CHECK IN successful

5. Status bar shows: "Offline - 3 pending" (yellow)
6. Checkins stored locally in IndexedDB

7. Turn airplane mode off (restore network)
8. Status bar briefly shows: "Syncing..." 
9. After 5 seconds: "Synced" (green)
10. All 3 check-ins synced to server
11. Manifest board updates with latest athlete roster
```

## API Documentation

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

### Core Endpoints

#### Loads
- `GET /api/loads` - List loads for dropzone
- `POST /api/loads` - Create new load
- `GET /api/loads/:id` - Get load details
- `PATCH /api/loads/:id` - Update load
- `POST /api/loads/:id/lock` - Lock load (no more manifests)
- `POST /api/loads/:id/cg` - Calculate center of gravity

#### Slots
- `GET /api/loads/:loadId/slots` - List slots in load
- `POST /api/loads/:loadId/slots` - Add slot
- `PATCH /api/slots/:id` - Update slot (assign athlete)
- `DELETE /api/slots/:id` - Remove slot

#### Check-In
- `GET /api/checkin/qr/:qrCode` - Validate QR code
- `POST /api/checkin` - Check in athlete

#### Users
- `GET /api/users` - List users (staff)
- `GET /api/users/:id` - User profile
- `PATCH /api/users/:id` - Update profile

#### Offline Sync
- `POST /api/sync/push` - Push local changes to server
- `GET /api/sync/pull` - Pull changes since timestamp
- `POST /api/sync/resolve` - Resolve conflicts

#### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `POST /api/groups/:id/members` - Add group members

## Environment Variables

```bash
# API
REACT_APP_API_URL=http://localhost:3001/api
API_PORT=3001
API_HOST=localhost

# Database
DATABASE_URL=mysql://user:password@localhost:3306/skylara

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# Redis (optional, for production)
REDIS_URL=redis://localhost:6379

# Stripe (future phases)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@skylara.dev

# AWS (future phases)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

## Development

### Run Tests
```bash
npm run test
```

### Lint & Type Check
```bash
npm run lint
npm run type-check
```

### Database Tools
```bash
# Open Prisma Studio (visual DB browser)
npm run db:studio

# Create migration after schema changes
npx prisma migrate dev --name <migration-name>

# Reset database (wipes data)
npx prisma migrate reset
```

### Monorepo Commands
```bash
# Run dev servers for all apps
npm run dev

# Build all apps
npm run build

# Run linter across monorepo
npm run lint

# Type check all apps
npm run type-check
```

## Offline-First Architecture

### How It Works

1. **Writes**: Local first
   - User action (check-in, manifest) writes to IndexedDB immediately
   - Returns optimistic result to user
   - Queued in `syncOutbox` table
   - User sees immediate feedback even offline

2. **Reads**: Local then network
   - Read from IndexedDB cache first
   - If online and stale, fetch from API
   - Update local cache
   - If offline, show cached data

3. **Sync**: Background
   - When online, periodically process sync queue
   - POST each pending item to `/api/sync/push`
   - Idempotency key ensures no duplicates on retry
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s max

4. **Conflicts**: User resolution
   - If server returns 409, mark item as CONFLICT
   - Show conflict resolver UI
   - User chooses: Keep Local / Keep Server / Merge
   - Resolved item retries sync

### Sync Indicator UI

Bottom-right corner shows status:
- **Green "Synced"**: All changes synced, online
- **Yellow "3 pending"**: 3 changes queued locally, syncing
- **Red "Offline - 5 queued"**: No network, 5 changes waiting
- **Orange "2 conflicts"**: 2 changes have conflicts needing resolution

Click to expand details and manual "Sync Now" button.

## Seed Data Summary

The seed script creates:
- 1 Organization: SkyHigh Aviation LLC
- 1 Dropzone: SkyHigh DZ (Perris Valley, CA)
- 2 Aircraft: Cessna 208B (15 slots), Cessna 182 (4 slots)
- 6 Staff: Admin, Manifest, Safety, Pilot, Rigger, Front Desk
- 4 Instructors: 2 Tandem, 1 AFF, 1 Coach
- 20 Athletes: Mix of experienced (500+ jumps), intermediate (50-500), students (5-50)
- 3 Sample Loads: FILLING (8/15), OPEN (3/15), COMPLETE (from yesterday)
- 2 Groups: Saturday RW Team (4 members), Freefly Camp (3 members)
- Wallets: All athletes have $50-$500 balance
- Gear: 20 parachute systems with recent checks
- Incident: 1 minor off-landing report (resolved)
- Notifications: 5 unread notifications for testing

## Project Phases

### Phase 1-4 (Foundation)
Completed in separate work: Database, API structure, UI scaffold, auth

### Phase 5 (Offline-First) - COMPLETED
- IndexedDB wrapper (offlineStore.ts)
- Sync engine with retry logic (syncEngine.ts)
- Local-first write flow (localFirst.ts)
- React hooks (useOffline.ts)
- UI components (SyncIndicator, ConflictResolver)
- Service Worker for PWA
- API sync endpoints

### Phase 6 (Seed Data) - COMPLETED
- Comprehensive seed script with 100+ records
- Ready for MVP testing with real-world scenarios

### Phase 7 (Documentation & Demo) - COMPLETED
- This README with architecture and demo scenarios
- Quick start setup guide
- API documentation
- Environment configuration

### Phase 8 (Mobile App) - COMPLETED
- React Native / Expo SDK 52 mobile app
- Auth screens: Login, Register, Forgot Password
- OAuth: Google (all platforms) + Apple Sign-In (iOS)
- Biometric authentication (Face ID / Touch ID on native)
- Tab navigation: Home, Logbook, Chat, Profile
- Feature screens: Check-In (QR scan), Manifest, Booking, Payments, Weather, Safety, Notifications, Social
- Cross-platform: runs on iOS, Android, and Web (Expo Web)
- Dynamic native imports for web compatibility (camera, haptics, biometrics)
- NativeWind (TailwindCSS) styling

### Phase 9+ (Future)
- Advanced operations (AFF progression, instructor matching)
- Reporting & analytics
- Multi-DZ federation
- Marketplace & monetization

## Troubleshooting

### Issue: Database connection fails
```bash
# Check MySQL is running
mysql -u root -p
show databases;

# Verify DATABASE_URL in .env
# Format: mysql://user:password@host:port/database

# Reset migration state if corrupted
npx prisma migrate resolve --rolled-back schema_init
```

### Issue: Seed fails
```bash
# Reset database completely
npx prisma migrate reset

# This will run all migrations and seed again
```

### Issue: Offline sync not working
```bash
# Check browser console for errors
# Ensure Service Worker is registered:
# Open DevTools > Application > Service Workers

# Check IndexedDB:
# DevTools > Application > IndexedDB > skylara_local

# Manually trigger sync:
# In browser console: window.dispatchEvent(new Event('online'))
```

### Issue: CORS errors
```bash
# Add to API:
import cors from '@fastify/cors';
await fastify.register(cors, { origin: 'http://localhost:3000' });
```

## Support

For questions or issues:
1. Check the architecture docs in `/sessions/bold-youthful-dijkstra/mnt/SkyLara/`
2. Review the Prisma schema in `/prisma/schema.prisma`
3. Check API route implementations in `/apps/api/src/routes/`

## License

MIT - See LICENSE file

---

**Built with**: Node.js 20, Fastify, Next.js 14, React 18, React Native 0.76, Expo SDK 52, MySQL 8.0, Prisma, TanStack Query, Zustand, IndexedDB
**Last Updated**: April 2026
**MVP Version**: 0.1.0
