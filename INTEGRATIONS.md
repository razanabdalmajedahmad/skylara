# SkyLara 3rd Party Integrations Guide

All integrations can be configured via **Dashboard > Settings > Integrations** or via environment variables.

---

## 1. Stripe — Payments & Payouts

**What it does:** Credit card processing, Apple Pay, Google Pay, instructor/coach payouts via Stripe Connect, shop checkout, learning subscription billing.

**Setup Steps:**
1. Create account at [stripe.com](https://stripe.com)
2. Go to [Developers > API Keys](https://dashboard.stripe.com/apikeys)
3. Copy **Publishable Key** (`pk_live_...`) and **Secret Key** (`sk_live_...`)
4. Go to [Developers > Webhooks](https://dashboard.stripe.com/webhooks) > Add endpoint
5. Set URL to `https://api.yourdomain.com/api/payments/webhook`
6. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`, `charge.dispute.closed`, `payout.paid`, `payout.failed`, `account.updated`
7. Copy the **Webhook Signing Secret** (`whsec_...`)
8. For Connect payouts: go to [Connect Settings](https://dashboard.stripe.com/settings/connect) > copy **Client ID** (`ca_...`)

**Environment Variables:**
```
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
```

**Dashboard:** Settings > Integrations > Stripe

**Used by:** Wallet top-up, jump ticket purchase, booking payments, shop orders, learning subscriptions, instructor payouts

---

## 2. Twilio — SMS & WhatsApp

**What it does:** SMS notifications (load alerts, booking confirmations, weather holds), WhatsApp messaging for markets where push is unreliable.

**Setup Steps:**
1. Create account at [twilio.com](https://www.twilio.com)
2. Go to [Console Dashboard](https://www.twilio.com/console)
3. Copy **Account SID** (`AC...`) and **Auth Token**
4. Buy a phone number for SMS
5. For WhatsApp: apply for [WhatsApp Business API](https://www.twilio.com/whatsapp) access

**Environment Variables:**
```
TWILIO_ACCOUNT_SID=AC_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
```

**Dashboard:** Settings > Integrations > Twilio

**Used by:** Load call notifications, booking reminders, waiver expiry alerts, private manifest messages, weather hold alerts

---

## 3. SendGrid — Email

**What it does:** Transactional emails — booking confirmations, payment receipts, waiver delivery, password resets, onboarding sequences.

**Setup Steps:**
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to [Settings > API Keys](https://app.sendgrid.com/settings/api_keys) > Create API Key
3. Set permissions to **Restricted Access** > enable Mail Send
4. Verify your sender email or domain under [Sender Authentication](https://app.sendgrid.com/settings/sender_auth)

**Environment Variables:**
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Dashboard:** Settings > Integrations > SendGrid

**Used by:** Welcome emails, booking confirmations, payment receipts, waiver delivery, password reset, notification fallback

---

## 4. AWS S3 — File Storage

**What it does:** Stores waivers (signed PDFs), profile photos, gear photos, media uploads, documents. Uses presigned URLs so files go directly from client to S3.

**Setup Steps:**
1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Create an S3 bucket (e.g., `skylara-storage`)
3. Configure CORS on the bucket:
   ```json
   [{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST"],"AllowedOrigins":["https://yourdomain.com"],"MaxAgeSeconds":3600}]
   ```
4. Create an IAM user with `AmazonS3FullAccess` policy (or scoped to your bucket)
5. Copy the **Access Key ID** and **Secret Access Key**

**Environment Variables:**
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA_xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
S3_BUCKET_NAME=skylara-storage
```

**Dashboard:** Settings > Integrations > AWS S3

**Upload categories:** avatar (5MB), waiver (10MB), document (25MB), media (100MB), gear (10MB)

---

## 5. Google OAuth — Social Login

**What it does:** "Sign in with Google" for athletes and staff on web and mobile.

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Go to **APIs & Services > Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`
6. Copy **Client ID** and **Client Secret**

**Environment Variables:**
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

**Dashboard:** Settings > Integrations > Google & Apple Sign-In

---

## 6. Apple Sign-In

**What it does:** "Sign in with Apple" for iOS users.

**Setup Steps:**
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Register an App ID with "Sign in with Apple" capability
3. Create a Services ID for web
4. Configure the return URL: `https://yourdomain.com/api/auth/apple/callback`

**Environment Variables:**
```
APPLE_CLIENT_ID=com.skylara.app
APPLE_TEAM_ID=xxxxx
APPLE_KEY_ID=xxxxx
APPLE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## 7. Expo — Mobile Push Notifications

**What it does:** Sends push notifications to the SkyLara mobile app on iOS and Android via Expo's push service (abstracts FCM and APNs).

**Setup Steps:**
1. Create account at [expo.dev](https://expo.dev)
2. Go to [Account Settings > Access Tokens](https://expo.dev/accounts/[account]/settings/access-tokens)
3. Create a new access token
4. The mobile app automatically registers push tokens when installed

**Environment Variables:**
```
EXPO_ACCESS_TOKEN=your-expo-access-token
```

**Dashboard:** Settings > Integrations > Push Notifications

**Used by:** Load boarding alerts, slot assigned, payment confirmations, weather holds, private manifest messages

---

## 8. VAPID — Web Browser Push Notifications

**What it does:** Push notifications in web browsers (Chrome, Firefox, Safari 16+) without needing a mobile app.

**Setup Steps:**
1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Copy the public and private keys

**Environment Variables:**
```
VAPID_PUBLIC_KEY=BDd3...
VAPID_PRIVATE_KEY=xxxxx
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

**Dashboard:** Settings > Integrations > Push Notifications

---

## 9. Mapbox — Maps & Geolocation

**What it does:** DZ location display, athlete navigation, weather coordinate lookup.

**Setup Steps:**
1. Create account at [mapbox.com](https://www.mapbox.com)
2. Go to [Account > Access Tokens](https://account.mapbox.com/access-tokens/)
3. Copy your default public token

**Environment Variables:**
```
MAPBOX_API_TOKEN=pk.eyJ...
```

**Alternative:** Google Maps API — both are supported, use whichever you prefer.

```
GOOGLE_MAPS_API_KEY=AIzaSy_xxxxx
```

**Dashboard:** Settings > Integrations > Maps & Geolocation

---

## 10. Weather API — Aviation Weather

**What it does:** Real-time wind speed, visibility, cloud ceiling, jumpability index. Powers the weather threshold engine for per-activity hold recommendations.

**Default:** Open-Meteo (free, no API key required). Works out of the box.

**Optional upgrade:** If you need more frequent updates or historical data, configure a commercial weather API key.

**Environment Variables:**
```
WEATHER_API_KEY=xxxxx  # Optional — leave empty for free Open-Meteo
```

**Dashboard:** Settings > Integrations > Weather API

---

## 11. USPA — License Verification

**What it does:** Automatically verify jumper license numbers and currency status against the USPA database.

**Setup Steps:**
1. Contact USPA for API access (requires group member number)
2. Obtain API key

**Environment Variables:**
```
USPA_API_KEY=xxxxx
USPA_API_URL=https://api.uspa.org
```

**Dashboard:** Settings > Integrations > USPA Verification

---

## 12. Sentry — Error Monitoring

**What it does:** Automatic error tracking, performance monitoring, and alerting for both API and web app.

**Setup Steps:**
1. Create account at [sentry.io](https://sentry.io)
2. Create a project (Node.js for API, Next.js for web)
3. Copy the **DSN** from project settings

**Environment Variables:**
```
SENTRY_DSN=https://xxxxx@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

**Dashboard:** Settings > Integrations > Sentry

---

## 13. Redis — Cache & Real-Time

**What it does:** Response caching, rate limiting state, WebSocket broadcast bus, event streams.

**Setup Steps:** Use managed Redis from your cloud provider, or self-host Redis 7+.

**Environment Variables:**
```
REDIS_URL=redis://username:password@host:6379
REDIS_PASSWORD=xxxxx
REDIS_DB=0
```

**Not in dashboard** — infrastructure-level, configured via environment only.

---

## Integration Status at a Glance

| Service | Required? | Free Tier? | Dashboard Config? |
|---------|-----------|------------|-------------------|
| MySQL | Yes | PlanetScale free tier | No (env only) |
| Redis | Recommended | Upstash free tier | No (env only) |
| Stripe | For payments | Test mode free | Yes |
| Twilio | For SMS/WhatsApp | Trial credits | Yes |
| SendGrid | For email | 100 emails/day free | Yes |
| AWS S3 | For file uploads | 5GB free tier | Yes |
| Google OAuth | For social login | Free | Yes |
| Apple Sign-In | For iOS login | Free (requires $99/yr dev account) | Yes |
| Expo Push | For mobile push | Free | Yes |
| VAPID Web Push | For browser push | Free | Yes |
| Open-Meteo | Default weather | Free, no key | N/A |
| Mapbox | For maps | 50K loads/month free | Yes |
| USPA | For license verify | Requires membership | Yes |
| Sentry | For monitoring | 5K errors/month free | Yes |
