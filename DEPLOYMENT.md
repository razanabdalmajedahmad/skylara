# SkyLara Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [SSL & Domain Setup](#ssl--domain-setup)
7. [Post-Deployment Checks](#post-deployment-checks)

---

## Local Development

### Prerequisites
- Node.js 20+
- npm 10+
- MySQL 8.0+
- Redis 7+ (optional for dev, required for production)

### Steps

```bash
# 1. Clone and install
git clone <repository-url>
cd SkyLara/app
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT_SECRET

# 3. Generate Prisma client
npm run db:generate

# 4. Create database tables
npm run db:push

# 5. Seed demo data
npm run db:seed:all

# 6. Start all services
npm run dev
```

| Service | URL | Port |
|---------|-----|------|
| Web Dashboard | http://localhost:3000 | 3000 |
| API Server | http://localhost:3001 | 3001 |
| Mobile (Expo) | http://localhost:8081 | 8081 |

### Individual Services

```bash
npm run dev:api    # API only
npm run dev:web    # Web only
npm run dev:mobile # Mobile only (requires Expo Go app)
```

---

## Docker Deployment

### Development (Docker Compose)

```bash
# Start everything (MySQL, Redis, API, Web)
docker compose up -d

# With dev overrides (hot reload, debug logging)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f api
docker compose logs -f web

# Stop
docker compose down
```

### Production (Docker Build)

```bash
# Build the production image
docker build -t skylara:latest .

# Run with environment variables
docker run -d \
  --name skylara-api \
  -p 3001:3001 \
  -e DATABASE_URL="mysql://user:pass@db-host:3306/skylara" \
  -e JWT_SECRET="your-production-secret-min-32-chars" \
  -e NODE_ENV=production \
  skylara:latest node dist/apps/api/index.js

docker run -d \
  --name skylara-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://api.yourdomain.com" \
  skylara:latest node apps/web/.next/standalone/server.js
```

---

## Cloud Deployment

### Option A: Railway (Recommended for Quick Start)

1. Create account at [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add services:
   - **MySQL** — add from Railway template
   - **Redis** — add from Railway template
   - **API** — deploy from `/app`, set root directory, start command: `npm run start --workspace=@skylara/api`
   - **Web** — deploy from `/app`, set root directory, start command: `npm run start --workspace=@skylara/web`
4. Configure environment variables (see [Environment Configuration](#environment-configuration))
5. Railway auto-provisions DATABASE_URL and REDIS_URL

### Option B: Render

1. Create account at [render.com](https://render.com)
2. Create new **Web Service** for API (Docker, port 3001)
3. Create new **Web Service** for Web (Docker, port 3000)
4. Create **MySQL** database (or use PlanetScale)
5. Create **Redis** instance
6. Set environment variables in each service dashboard

### Option C: AWS (Production Scale)

```
Architecture:
  ECS Fargate (API + Web containers)
  → RDS MySQL 8.0 (Multi-AZ)
  → ElastiCache Redis 7
  → S3 (file uploads)
  → CloudFront (CDN)
  → ACM (SSL certificates)
  → Route 53 (DNS)
```

1. **RDS**: Create MySQL 8.0 instance (db.t3.medium minimum)
   - Enable Multi-AZ for production
   - Create read replica for reporting
2. **ElastiCache**: Create Redis 7 cluster (cache.t3.micro)
3. **S3**: Create bucket for file uploads, enable CORS
4. **ECS**: Deploy Docker containers via Fargate
5. **CloudFront**: CDN for web app and S3 assets
6. **ACM**: SSL certificate for your domain

### Option D: DigitalOcean App Platform

1. Create app from GitHub repo
2. Add MySQL managed database
3. Add Redis managed database
4. Configure build command: `npm run build`
5. Configure run commands for API and Web

---

## Database Setup

### MySQL 8.0 Configuration

```sql
-- Create database
CREATE DATABASE skylara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER 'skylara'@'%' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON skylara.* TO 'skylara'@'%';

-- Create read-only user (for read replica)
CREATE USER 'skylara_read'@'%' IDENTIFIED BY 'read-password-here';
GRANT SELECT ON skylara.* TO 'skylara_read'@'%';

FLUSH PRIVILEGES;
```

### Apply Schema

```bash
# Development — push schema directly
npm run db:push

# Production — use migrations
npm run db:migrate:deploy

# Seed initial data
npm run db:seed:all
```

### Prisma Studio (Database Browser)

```bash
npm run db:studio
# Opens at http://localhost:5555
```

---

## Environment Configuration

### Required Variables (Minimum to Run)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mysql://user:pass@localhost:3306/skylara` | MySQL connection |
| `JWT_SECRET` | `min-32-char-random-string` | JWT signing key |
| `NODE_ENV` | `production` | Environment mode |
| `CORS_ORIGIN` | `https://yourdomain.com` | Allowed origins |
| `API_PORT` | `3001` | API server port |

### 3rd Party Services (Configure in Dashboard Settings)

These can be set via environment variables OR via the dashboard at **Settings > Integrations**:

| Service | Env Variables | Dashboard Location |
|---------|---------------|-------------------|
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET` | Settings > Integrations > Stripe |
| **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Settings > Integrations > Twilio |
| **SendGrid** | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | Settings > Integrations > SendGrid |
| **AWS S3** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` | Settings > Integrations > AWS S3 |
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Settings > Integrations > Google Sign-In |
| **Expo Push** | `EXPO_ACCESS_TOKEN` | Settings > Integrations > Push Notifications |
| **Sentry** | `SENTRY_DSN` | Settings > Integrations > Sentry |
| **Weather** | `WEATHER_API_KEY` (optional — Open-Meteo is free) | Settings > Integrations > Weather API |

### Production Security Checklist

- [ ] `JWT_SECRET` is unique, random, 64+ characters
- [ ] `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` set (RS256)
- [ ] `CORS_ORIGIN` is NOT `*` — set to your exact domain
- [ ] `NODE_ENV=production`
- [ ] `STRIPE_SECRET_KEY` uses live keys (not test)
- [ ] `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
- [ ] Database uses SSL connection (`?ssl=true` in DATABASE_URL)
- [ ] Redis uses password authentication
- [ ] S3 bucket has proper CORS and access policies

---

## SSL & Domain Setup

### DNS Configuration

```
A     yourdomain.com        → your-server-ip
A     api.yourdomain.com    → your-api-server-ip
CNAME www.yourdomain.com    → yourdomain.com
```

### Nginx Reverse Proxy (Self-Hosted)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Let's Encrypt SSL

```bash
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## Post-Deployment Checks

### Health Check

```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-10T...",
  "version": "0.1.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "s3": "ok",
    "circuitBreakers": "ok"
  }
}
```

### Stripe Webhook Setup

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.yourdomain.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`, `payout.paid`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Mobile App Configuration

Update `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_WS_URL=wss://api.yourdomain.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

Build and deploy:
```bash
cd apps/mobile
npx eas build --platform all
npx eas submit --platform all
```

### Seed Production Data

```bash
# Only run once — creates roles, achievement definitions, policy defaults
NODE_ENV=production npm run db:seed:all
```

### Verify API Endpoints

```bash
# Register a test user
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234!"}'
```
