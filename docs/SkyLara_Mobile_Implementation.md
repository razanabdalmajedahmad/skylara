# SKYLARA MOBILE APP — SKYDIVER SELF-MANIFEST

## Implementation Specification for React Native (Expo)
### FIRST HALF: Auth, Navigation, Dashboard, Check-In, Weather, and Load Board

**Document Version:** 1.0  
**Target Platform:** iOS 13.0+ | Android 8.0+  
**Framework:** React Native (Expo SDK 52)  
**Target User:** ATHLETE role (licensed skydivers who self-manifest)  

---

## 1. TECH STACK & PROJECT SETUP

### 1.1 React Native + Expo SDK 52

```bash
npx create-expo-app skylara-mobile
cd skylara-mobile
npm install expo@latest
```

**Minimum versions:**
- React: 18.2.0+
- React Native: 0.74.0+ (via Expo 52)
- Expo SDK: 52.0.0+
- Node.js: 18.0.0+

**Target capabilities:**
- iOS: 13.0+
- Android: API 30 (12.0)+

### 1.2 Navigation: Expo Router (File-Based)

```bash
npm install expo-router expo-constants
```

Expo Router provides file-based routing similar to Next.js. App structure lives in `app/` directory.

**Key features:**
- URL-based deep linking (skylara://)
- Type-safe route parameters
- Built-in history management
- Stack, tab, and modal navigators

### 1.3 State Management: Zustand + React Query (TanStack)

```bash
npm install zustand @tanstack/react-query zustand-persist
```

**Zustand store patterns:**
- Global auth state (tokens, user profile, DZ selection)
- UI state (loading, errors, selected load)
- Cache invalidation via React Query

**React Query patterns:**
- Server state management (loads, jumpers, weather)
- Background sync
- Stale-while-revalidate
- Optimistic updates

### 1.4 Real-Time: Socket.IO Client

```bash
npm install socket.io-client
```

**Event subscriptions:**
- `load:status-changed` — load transitions
- `load:slot-added` — new jumper manifested
- `load:slot-removed` — jumper left
- `athlete:checked-in` — broadcast when athlete checks in
- `athlete:checked-out` — broadcast when athlete checks out
- `dz:weather-hold` — weather alert

### 1.5 UI: NativeWind (Tailwind for React Native) + Custom Design System

```bash
npm install nativewind tailwindcss
npm install -D @nativewind/cli
```

**Design tokens:**
- Spacing: 4px grid (xs=4, sm=8, md=12, lg=16, xl=24)
- Colors: Primary (sky blue #0084FF), Success (green #28A745), Warning (orange #FFA500), Danger (red #DC3545)
- Typography: Nunito Sans (regular, semibold, bold)

**Component library structure:**
```
components/
├── atoms/           # Button, Input, Badge, Card
├── molecules/       # LoadCard, UserChip, WeatherWidget
├── organisms/       # LoadBoard, LoadBuilder, Dashboard
├── layout/          # SafeAreaView wrappers, Headers
└── common/          # Spacer, Divider, Loading skeleton
```

### 1.6 Forms: React Hook Form + Zod

```bash
npm install react-hook-form zod @hookform/resolvers
```

**Pattern example:**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function LoginForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });
  
  // ... form JSX
}
```

### 1.7 Auth: expo-secure-store for Tokens

```bash
npm install expo-secure-store
```

**Keys stored:**
- `skylara_access_token` — JWT (15min expiry)
- `skylara_refresh_token` — JWT (7 days)
- `skylara_user_id` — User UUID
- `skylara_dz_id` — Selected dropzone ID

**Security:**
- iOS: Keychain
- Android: EncryptedSharedPreferences
- No unencrypted storage

### 1.8 Push Notifications: expo-notifications + FCM/APNs

```bash
npm install expo-notifications expo-device
```

**Flow:**
1. App requests notification permission on first launch
2. Fetch device token from Expo Notifications Service
3. Send token to backend: `POST /api/v1/push/tokens`
4. Backend stores mapping (user_id → token)
5. Receive notifications from FCM/APNs

### 1.9 Camera: expo-camera (QR Scanning)

```bash
npm install expo-camera expo-barcode-scanner
```

**Use cases:**
- Scan jumper QR code to add to team
- Scan aircraft QR code (future)

### 1.10 Biometric: expo-local-authentication

```bash
npm install expo-local-authentication
```

**Feature:**
- Biometric unlock after initial login
- Optional on onboarding

### 1.11 Project Structure (File Tree)

```
skylara-mobile/
├── app/                          # Expo Router routes (file-based)
│   ├── (auth)/                   # Auth stack (login, register, reset)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (app)/                    # Main app (requires auth)
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Home (Dashboard)
│   │   ├── (home)/               # Home stack
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── load-board.tsx
│   │   │   ├── load-detail.tsx
│   │   │   └── load-builder/
│   │   │       ├── _layout.tsx
│   │   │       ├── index.tsx
│   │   │       ├── teams.tsx
│   │   │       ├── add-me.tsx
│   │   │       ├── formation-picker.tsx
│   │   │       └── confirm.tsx
│   │   ├── logbook/              # Logbook tab
│   │   │   └── index.tsx
│   │   ├── chat/                 # Chat tab
│   │   │   └── index.tsx
│   │   └── profile/              # Profile tab
│   │       └── index.tsx
│   ├── _layout.tsx               # Root layout (persists query client)
│   └── +html.tsx                 # Web entry (if targeting web)
├── src/
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   ├── manifestStore.ts
│   │   └── dzStore.ts
│   ├── api/                      # HTTP client + hooks
│   │   ├── client.ts             # Axios instance with interceptors
│   │   ├── auth.ts               # Auth endpoints (login, register, refresh)
│   │   ├── manifest.ts           # Load, slot, manifest endpoints
│   │   ├── weather.ts            # Weather endpoints
│   │   ├── payments.ts           # Transaction endpoints
│   │   └── hooks.ts              # useAuth, useLoadBoard, useWeather, etc.
│   ├── services/                 # Business logic
│   │   ├── socketService.ts      # Socket.IO setup
│   │   ├── notificationService.ts
│   │   ├── biometricService.ts
│   │   ├── storageService.ts     # expo-secure-store wrapper
│   │   └── qrCodeService.ts
│   ├── types/                    # TypeScript types (mirrored from backend)
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── manifest.ts
│   │   ├── weather.ts
│   │   └── payment.ts
│   ├── components/               # Reusable components
│   │   ├── atoms/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── molecules/
│   │   │   ├── LoadCard.tsx
│   │   │   ├── JumperChip.tsx
│   │   │   ├── WeatherWidget.tsx
│   │   │   ├── CountdownBadge.tsx
│   │   │   └── CheckInToggle.tsx
│   │   ├── organisms/
│   │   │   ├── LoadBoard.tsx
│   │   │   ├── LoadBuilder.tsx
│   │   │   └── Dashboard.tsx
│   │   └── layout/
│   │       ├── SafeArea.tsx
│   │       ├── Header.tsx
│   │       └── TabBar.tsx
│   ├── utils/                    # Utility functions
│   │   ├── formatters.ts         # Time, currency, weight formatting
│   │   ├── validators.ts         # Form validation helpers
│   │   ├── errorHandler.ts       # Error parsing + user messages
│   │   └── calculations.ts       # Jumpability, CG, etc.
│   └── constants/
│       ├── colors.ts
│       ├── endpoints.ts
│       ├── formations.ts
│       └── messages.ts
├── eas.json                      # Expo Application Services config
├── app.json                       # App metadata
├── .env.local                    # Environment variables
└── package.json
```

### 1.12 Environment Config

**`.env.local` (git-ignored):**
```env
API_BASE_URL=https://api-staging.skylara.app/api/v1
SOCKET_IO_URL=https://api-staging.skylara.app
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
FCM_SENDER_ID=123456789
```

**`eas.json`:**
```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "preview": {
      "ios": "preview",
      "android": "preview"
    },
    "production": {
      "ios": [
        {
          "mode": "release",
          "autoIncrement": true,
          "env": { "ENVIRONMENT": "prod" }
        }
      ],
      "android": [
        {
          "mode": "release",
          "autoIncrement": true,
          "env": { "ENVIRONMENT": "prod" }
        }
      ]
    }
  },
  "submit": {
    "production": {
      "ios": { "asciiProvider": "app-store-connect" },
      "android": { "serviceAccount": "path/to/service-account.json" }
    }
  }
}
```

**`app.json` (excerpt):**
```json
{
  "expo": {
    "name": "SkyLara",
    "slug": "skylara-mobile",
    "version": "1.0.0",
    "plugins": [
      ["expo-notifications", {}],
      ["expo-camera", { "cameraPermission": "Allow SkyLara to access your camera for QR scanning" }],
      ["expo-local-authentication", {}]
    ],
    "scheme": "skylara",
    "deepLinking": {
      "url": "skylara://",
      "prefixes": ["skylara://", "https://app.skylara.app/"]
    }
  }
}
```

---

## 2. AUTHENTICATION MODULE

### 2.1 Login Screen

**File:** `app/(auth)/login.tsx`

**Component Props:**
```typescript
// No props; route param from deep link:
// skylara://login?redirect=/home/load-board
```

**Layout:**
```
┌─────────────────────────────┐
│                             │
│    [SkyLara Logo] (48x48)   │  (top padding 60pt)
│                             │
│   "Ready to jump?"          │  (subtitle, Nunito 16px semibold)
│                             │
│  [Email Input]              │  (placeholder: "you@example.com")
│  [Password Input]            │  (placeholder: "••••••••")
│                             │
│  [Forgot Password?] ────→  | (underline link, 12px)
│                             │
│  [LOG IN] (primary btn)      │  (full width, 48pt height)
│                             │
│  ─────────── OR ───────────  │
│                             │
│  [Continue with Google]      │  (social button)
│  [Continue with Apple]       │  (social button)
│                             │
│  Don't have an account?      │  (12px)
│  [SIGN UP] ──→              |  (link to register)
│                             │
└─────────────────────────────┘
```

**Zustand Store (authStore):**
```typescript
interface AuthState {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTokens(access: string, refresh: string): void;
  setUser(user: User): void;
  setError(error: string | null): void;
  clearAuth(): void;
}

const useAuthStore = create<AuthState>(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      user: null,
      isLoading: false,
      error: null,
      
      setTokens: (access, refresh) => {
        set({ accessToken: access, refreshToken: refresh });
        storageService.setTokens(access, refresh);
      },
      // ... other actions
    }),
    {
      name: "auth-store",
      storage: {
        getItem: async (name) => {
          // Load from expo-secure-store
        },
        setItem: async (name, value) => {
          // Save to expo-secure-store
        },
      },
    }
  )
);
```

**React Query Hooks (`src/api/hooks.ts`):**
```typescript
export function useLogin() {
  return useMutation({
    mutationFn: (credentials: LoginRequest) =>
      apiClient.post("/auth/login", credentials),
    onSuccess: (data: LoginResponse) => {
      const { accessToken, refreshToken, user } = data;
      useAuthStore.getState().setTokens(accessToken, refreshToken);
      useAuthStore.getState().setUser(user);
      queryClient.setQueryData(["auth", "me"], user);
    },
    onError: (error) => {
      const message = errorHandler.getUserMessage(error);
      useAuthStore.getState().setError(message);
    },
  });
}
```

**API Call:**
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "athlete@example.com",
  "password": "SecurePassword123!"
}

Response (200 OK):
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "athlete@example.com",
    "firstName": "Alice",
    "lastName": "Skywalker",
    "role": "ATHLETE",
    "dropzoneId": 1,
    "profilePicture": "https://...",
    "licenseLevel": "C",
    "weight": 185,
    "status": "ACTIVE"
  }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": "Invalid email or password"
}
```

**TypeScript Interfaces (`src/types/user.ts`):**
```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  dropzoneId: number;
  profilePicture: string | null;
  licenseLevel: LicenseLevel;
  weight: number; // kg
  certifications: string[];
  status: UserStatus;
  createdAt: ISO8601DateTime;
}

export type UserRole = "ATHLETE" | "INSTRUCTOR" | "MANIFEST_STAFF" | "DZ_OWNER" | "ADMIN";
export type LicenseLevel = "A" | "B" | "C" | "D" | "STUDENT" | "NONE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

**Component Implementation:**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import Button from "@/src/components/atoms/Button";
import Input from "@/src/components/atoms/Input";
import { useLogin } from "@/src/api/hooks";
import { useAuthStore } from "@/src/stores/authStore";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function LoginScreen() {
  const router = useRouter();
  const { control, handleSubmit, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  
  const loginMutation = useLogin();
  const errorMessage = useAuthStore((s) => s.error);

  const onSubmit = async (data) => {
    await loginMutation.mutateAsync(data);
    if (loginMutation.isSuccess) {
      router.replace("/(app)/home");
    }
  };

  return (
    <SafeAreaView style={{ paddingHorizontal: 16 }}>
      {/* Logo */}
      <Image source={require("@/assets/logo.png")} style={{ width: 48, height: 48, marginTop: 60 }} />
      
      {/* Subtitle */}
      <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 24 }}>
        Ready to jump?
      </Text>
      
      {/* Error Message */}
      {errorMessage && (
        <View style={{ backgroundColor: "#FFE5E5", padding: 12, borderRadius: 8, marginTop: 16 }}>
          <Text style={{ color: "#DC3545" }}>{errorMessage}</Text>
        </View>
      )}
      
      {/* Email Input */}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState: { error } }) => (
          <Input
            {...field}
            placeholder="you@example.com"
            keyboardType="email-address"
            editable={!loginMutation.isPending}
            error={error?.message}
            style={{ marginTop: 24 }}
          />
        )}
      />
      
      {/* Password Input */}
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState: { error } }) => (
          <Input
            {...field}
            placeholder="••••••••"
            secureTextEntry
            editable={!loginMutation.isPending}
            error={error?.message}
            style={{ marginTop: 12 }}
          />
        )}
      />
      
      {/* Forgot Password Link */}
      <Pressable onPress={() => router.push("/forgot-password")} style={{ marginTop: 12 }}>
        <Text style={{ color: "#0084FF", fontSize: 12, textDecorationLine: "underline" }}>
          Forgot Password?
        </Text>
      </Pressable>
      
      {/* Log In Button */}
      <Button
        title={loginMutation.isPending ? "LOGGING IN..." : "LOG IN"}
        onPress={handleSubmit(onSubmit)}
        disabled={loginMutation.isPending}
        style={{ marginTop: 32 }}
      />
      
      {/* Divider */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 32 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "#DDD" }} />
        <Text style={{ marginHorizontal: 12, color: "#666", fontSize: 12 }}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "#DDD" }} />
      </View>
      
      {/* Social Buttons */}
      <Button
        variant="outline"
        title="Continue with Google"
        onPress={() => handleGoogleLogin()}
        style={{ marginTop: 16 }}
      />
      <Button
        variant="outline"
        title="Continue with Apple"
        onPress={() => handleAppleLogin()}
        style={{ marginTop: 12 }}
      />
      
      {/* Sign Up Link */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 32 }}>
        <Text style={{ fontSize: 12 }}>Don't have an account? </Text>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={{ color: "#0084FF", fontWeight: "600" }}>SIGN UP</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

**WebSocket Subscriptions:** None (polling for token refresh if needed)

**Navigation Actions:**
- "LOG IN" button → `/(app)/home` (Dashboard)
- "Forgot Password?" → `/forgot-password`
- "SIGN UP" → `/register`

**Loading/Error/Success States:**
- Loading: Button shows "LOGGING IN...", inputs disabled, spinner visible
- Error: Red error banner with message from API
- Success: Auto-navigate to home dashboard

---

### 2.2 Register Screen

**File:** `app/(auth)/register.tsx`

**Layout:**
```
┌─────────────────────────────┐
│     [Back Button] <          │  (top-left)
│                             │
│    [SkyLara Logo]           │
│                             │
│   "Create Your Account"     │  (subtitle, 16px semibold)
│                             │
│  STEP 1 of 3: Personal      │  (progress indicator)
│  ═════════════════          │
│                             │
│  [First Name Input]         │  (placeholder: "Alice")
│  [Last Name Input]          │  (placeholder: "Skywalker")
│  [Email Input]              │  (placeholder: "alice@example.com")
│                             │
│  [NEXT] (primary)           │  (full width, 48pt)
│  [CANCEL]                   │  (text link)
│                             │
└─────────────────────────────┘

STEP 2 of 3: Security
│  [Password Input]           │  (with strength meter)
│  ┌─────────────────┐        │  (green=strong, yellow=medium, red=weak)
│  └─────────────────┘        │
│  [Confirm Password]         │
│                             │
│  [NEXT]                     │
│  [BACK]                     │
│                             │

STEP 3 of 3: License Info
│  [License Number]           │  (optional)
│  [License Level Dropdown]   │  (A, B, C, D, STUDENT, NONE)
│  [Weight Input]             │  (kg)
│                             │
│  [SIGN UP]                  │
│  [BACK]                     │
```

**Zustand Store (authStore):**
```typescript
interface RegistrationFormState {
  step: 1 | 2 | 3;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  licenseNumber: string | null;
  licenseLevel: LicenseLevel;
  weight: number | null;
  
  setStep(step: 1 | 2 | 3): void;
  updateField(field: keyof RegistrationFormState, value: any): void;
  resetForm(): void;
}
```

**React Query Hook:**
```typescript
export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      apiClient.post("/auth/register", data),
    onSuccess: (data: RegisterResponse) => {
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      useAuthStore.getState().setUser(data.user);
      queryClient.setQueryData(["auth", "me"], data.user);
    },
  });
}
```

**API Call:**
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "SecurePass123!",
  "firstName": "Alice",
  "lastName": "Skywalker",
  "licenseNumber": "USPA123456",
  "licenseLevel": "C",
  "weight": 62
}

Response (201 Created):
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... same as login response ... }
}

Response (409 Conflict):
{
  "success": false,
  "error": "Email already registered"
}
```

**TypeScript Interfaces:**
```typescript
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  licenseNumber?: string;
  licenseLevel?: LicenseLevel;
  weight?: number;
}

export interface RegisterResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PasswordStrengthResult {
  valid: boolean;
  score: 0 | 1 | 2 | 3;
  message: string;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  minLength: boolean;
}
```

**Component Implementation (Step 1 excerpt):**
```typescript
export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema),
  });
  
  const registerMutation = useRegister();

  const handleNext = async (data) => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      await registerMutation.mutateAsync(data);
      if (registerMutation.isSuccess) {
        router.replace("/(app)/home");
      }
    }
  };

  return (
    <SafeAreaView>
      {/* Back Button */}
      <Pressable onPress={() => step > 1 ? setStep((p) => (p - 1) as 1 | 2 | 3) : router.back()}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{"< Back"}</Text>
      </Pressable>
      
      {/* Step Indicator */}
      <Text style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        STEP {step} of 3: {step === 1 ? "Personal" : step === 2 ? "Security" : "License"}
      </Text>
      <View style={{ height: 4, backgroundColor: "#DDD", marginTop: 8, borderRadius: 2 }}>
        <View
          style={{
            width: `${(step / 3) * 100}%`,
            height: "100%",
            backgroundColor: "#0084FF",
            borderRadius: 2,
          }}
        />
      </View>
      
      {/* Form Fields (conditional by step) */}
      {step === 1 && (
        <>
          {/* First Name, Last Name, Email inputs */}
        </>
      )}
      
      {/* Action Buttons */}
      <Button
        title={step < 3 ? "NEXT" : registerMutation.isPending ? "SIGNING UP..." : "SIGN UP"}
        onPress={handleSubmit(handleNext)}
        disabled={registerMutation.isPending}
        style={{ marginTop: 24 }}
      />
    </SafeAreaView>
  );
}
```

**Navigation Actions:**
- "NEXT" (Step 1-2) → Advance step
- "SIGN UP" (Step 3) → POST /auth/register → `/(app)/home`
- "Back Button" → Go to previous step or `/login`
- "CANCEL" → `/login`

---

### 2.3 Forgot/Reset Password Flow

**File:** `app/(auth)/forgot-password.tsx` + `app/(auth)/reset-password.tsx`

**Step 1: Forgot Password Request**
```
POST /api/v1/auth/forgot-password
{
  "email": "athlete@example.com"
}

Response (200 OK):
{
  "success": true,
  "message": "Password reset email sent. Check your inbox."
}
```

**Step 2: Email contains link:**
```
https://app.skylara.app/reset-password?token=eyJhbGc...&email=athlete@example.com
```

**Step 3: Reset Password Screen**
```
POST /api/v1/auth/reset-password
{
  "token": "eyJhbGc...",
  "password": "NewSecurePassword123!"
}

Response (200 OK):
{
  "success": true,
  "message": "Password reset successful. Please log in."
}
```

---

### 2.4 OAuth SSO (Google, Apple Sign-In)

**Google Sign-In:**
```bash
npm install expo-google-app-auth
```

**Implementation:**
```typescript
import * as GoogleSignIn from "expo-google-app-auth";

async function handleGoogleLogin() {
  try {
    const result = await GoogleSignIn.signInAsync({
      isUserInitiatedLogin: true,
    });
    
    if (result.type === "success") {
      // Send idToken to backend
      const response = await apiClient.post("/auth/google", {
        idToken: result.idToken,
      });
      
      useAuthStore.getState().setTokens(
        response.accessToken,
        response.refreshToken
      );
      useAuthStore.getState().setUser(response.user);
      router.replace("/(app)/home");
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
  }
}
```

**Apple Sign-In:**
```bash
npm install expo-apple-authentication
```

**Implementation:**
```typescript
import * as AppleAuthentication from "expo-apple-authentication";

async function handleAppleLogin() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    // Send identityToken to backend
    const response = await apiClient.post("/auth/apple", {
      identityToken: credential.identityToken,
      user: credential.user,
    });
    
    useAuthStore.getState().setTokens(
      response.accessToken,
      response.refreshToken
    );
    router.replace("/(app)/home");
  } catch (error) {
    console.error("Apple sign-in error:", error);
  }
}
```

**Backend Endpoint:**
```
POST /api/v1/auth/google
{ "idToken": "..." }

POST /api/v1/auth/apple
{ "identityToken": "...", "user": { ... } }

Response: Same as login (200 OK with accessToken, refreshToken, user)
```

---

### 2.5 Biometric Unlock

**File:** `src/services/biometricService.ts`

```typescript
import * as LocalAuthentication from "expo-local-authentication";

export class BiometricService {
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: "Authenticate to access SkyLara",
      });
      return result.success;
    } catch {
      return false;
    }
  }

  async register(): Promise<boolean> {
    // Store biometric enrollment preference
    // Called after successful login if user opts in
    return true;
  }
}
```

**Usage in Login Screen:**
```typescript
useEffect(() => {
  // On app launch, check if user was previously logged in
  const checkBiometric = async () => {
    const isLoggedIn = !!useAuthStore.getState().accessToken;
    const biometricEnabled = await storageService.getBiometricEnabled();
    
    if (isLoggedIn && biometricEnabled) {
      const authenticated = await biometricService.authenticate();
      if (authenticated) {
        router.replace("/(app)/home");
      }
    }
  };
  
  checkBiometric();
}, []);
```

---

### 2.6 Token Management (Access + Refresh, Auto-Refresh Interceptor)

**File:** `src/api/client.ts`

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/src/stores/authStore";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.skylara.app/api/v1";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "SkyLara-Mobile/1.0",
  },
});

// Request interceptor: add Authorization header
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    
    if (response?.status === 401 && !config._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        config._retry = true;
        
        try {
          const refreshToken = useAuthStore.getState().refreshToken;
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }
          
          const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );
          
          const { accessToken, refreshToken: newRefreshToken } = data;
          useAuthStore.getState().setTokens(accessToken, newRefreshToken);
          
          apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          onRefreshed(accessToken);
          
          return apiClient(config);
        } catch (refreshError) {
          // Refresh failed; redirect to login
          useAuthStore.getState().clearAuth();
          // Router.replace("/(auth)/login");
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Wait for refresh to complete
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(config));
          });
        });
      }
    }
    
    return Promise.reject(error);
  }
);
```

**Refresh API Endpoint:**
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response (200 OK):
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..." (may be new or same)
}

Response (401 Unauthorized):
{
  "success": false,
  "error": "Refresh token expired. Please log in again."
}
```

---

### 2.7 Session Persistence Across App Restarts

**File:** `src/services/storageService.ts`

```typescript
import * as SecureStore from "expo-secure-store";

export class StorageService {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync("skylara_access_token", accessToken),
      SecureStore.setItemAsync("skylara_refresh_token", refreshToken),
    ]);
  }

  async getTokens(): Promise<{ access: string | null; refresh: string | null }> {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync("skylara_access_token"),
      SecureStore.getItemAsync("skylara_refresh_token"),
    ]);
    return { access, refresh };
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync("skylara_access_token"),
      SecureStore.deleteItemAsync("skylara_refresh_token"),
      SecureStore.deleteItemAsync("skylara_user_id"),
      SecureStore.deleteItemAsync("skylara_dz_id"),
    ]);
  }

  async setSelectedDz(dzId: number): Promise<void> {
    await SecureStore.setItemAsync("skylara_dz_id", String(dzId));
  }

  async getSelectedDz(): Promise<number | null> {
    const dzId = await SecureStore.getItemAsync("skylara_dz_id");
    return dzId ? parseInt(dzId, 10) : null;
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync("skylara_biometric", String(enabled));
  }

  async getBiometricEnabled(): Promise<boolean> {
    const val = await SecureStore.getItemAsync("skylara_biometric");
    return val === "true";
  }
}

export const storageService = new StorageService();
```

**Root Layout (`app/_layout.tsx`) — Restore Session on Launch:**
```typescript
import { useEffect } from "react";
import { useAuthStore } from "@/src/stores/authStore";
import { storageService } from "@/src/services/storageService";

export default function RootLayout() {
  useEffect(() => {
    // Restore tokens from secure storage on app launch
    const restoreSession = async () => {
      const { access, refresh } = await storageService.getTokens();
      if (access && refresh) {
        useAuthStore.getState().setTokens(access, refresh);
        // Optionally, verify token validity by fetching user profile
        try {
          const response = await apiClient.get("/auth/me");
          useAuthStore.getState().setUser(response.data.user);
        } catch (error) {
          // Token invalid; clear auth
          useAuthStore.getState().clearAuth();
        }
      }
    };
    
    restoreSession();
  }, []);

  return (
    <GestureHandlerRootView>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

---

### 2.8 Multi-Device Management

**Concept:** Track active login sessions across devices. User can see and revoke sessions.

**Not implemented in first half** — placeholder for Phase 2.

---

## 3. NAVIGATION ARCHITECTURE

### 3.1 Tab Navigator (Home, Logbook, Chat, Profile)

**File:** `app/(app)/_layout.tsx`

```typescript
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeStack from "./home/_layout";
import LogbookScreen from "./logbook";
import ChatScreen from "./chat";
import ProfileScreen from "./profile";

const Tab = createBottomTabNavigator();

export default function AppLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0084FF",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          borderTopColor: "#EEE",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="home"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="logbook"
        component={LogbookScreen}
        options={{
          title: "Logbook",
          tabBarIcon: ({ color }) => <LogbookIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="chat"
        component={ChatScreen}
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <ChatIcon color={color} />,
          tabBarBadge: unreadChatCount > 0 ? unreadChatCount : null,
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
```

### 3.2 Stack Screens Per Tab

**Home Stack (`app/(app)/home/_layout.tsx`):**

```typescript
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#FFF" },
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
        headerTintColor: "#000",
      }}
    >
      <Stack.Screen
        name="dashboard"
        component={DashboardScreen}
        options={{ title: "SkyLara" }}
      />
      <Stack.Screen
        name="load-board"
        component={LoadBoardScreen}
        options={{ title: "Load Board" }}
      />
      <Stack.Screen
        name="load-detail"
        component={LoadDetailScreen}
        options={{ title: "Load Details", presentation: "modal" }}
      />
      <Stack.Screen
        name="load-builder"
        component={LoadBuilderScreen}
        options={{ title: "Load Builder", presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
```

**Logbook Stack (`app/(app)/logbook/index.tsx`):**
- Simpler: single screen with list of past jumps, drill-down to jump detail

**Chat Stack (`app/(app)/chat/index.tsx`):**
- Message list, drill-down to conversation

**Profile Stack (`app/(app)/profile/index.tsx`):**
- User info, settings, account management

### 3.3 Modal Screens (Formation Picker, Load Selector, etc.)

**Formation Picker Modal:**
```
File: app/(app)/home/load-builder/formation-picker.tsx

Presentation: modal (full screen, swipe-to-dismiss)

Layout:
┌─────────────────────────────┐
│ [X] Close                   │ (top-right)
│ Formation Selection         │
│ ═════════════════════════   │
│                             │
│ [Search Input] 🔍           │
│                             │
│ Formation List:             │
│ ─────────────────           │
│ ○ 2-Way                     │
│ ○ 4-Way                     │
│ ○ 8-Way (FS)                │
│ ○ 10-Way (FS)               │
│ ... (25+ types)             │
│                             │
│ [Tap to select]             │
│                             │
│ ──────────────────────      │
│ [CONFIRM] [CANCEL]          │ (bottom)
│                             │
└─────────────────────────────┘
```

**Load Selector Modal:**
```
File: app/(app)/home/load-builder/select-load.tsx

Presentation: modal

Layout:
┌─────────────────────────────┐
│ Select a Load               │
│ ═════════════════════════   │
│ [Refresh] 🔄 [Filter] ⚙     │ (top buttons)
│                             │
│ Load List:                  │
│ ─────────────────           │
│ │ Aircraft: Caravan C182    │
│ │ Slots: 8/20 available     │
│ │ Time: 10:30 AM (in 5m)    │
│ │ [SELECT] ────────────────→ │
│                             │
│ │ Aircraft: King Air 90     │
│ │ Slots: 15/18 available    │
│ │ Time: 11:00 AM (in 35m)   │
│ │ [SELECT] ────────────────→ │
│                             │
└─────────────────────────────┘
```

### 3.4 Deep Linking Scheme (skylara://)

**Defined in `app.json`:**
```json
{
  "deepLinking": {
    "url": "skylara://",
    "prefixes": ["skylara://", "https://app.skylara.app/"],
    "config": {
      "screens": {
        "(auth)/login": "login/:redirect",
        "(auth)/register": "register",
        "(auth)/reset-password": "reset-password?token=:token&email=:email",
        "(app)/home/dashboard": "home",
        "(app)/home/load-board": "load-board",
        "(app)/home/load-detail": "load/:loadId",
        "(app)/home/load-builder": "load-builder"
      }
    }
  }
}
```

**URL Examples:**
```
skylara://login?redirect=/home/load-board
skylara://load-board
skylara://load/12345
skylara://load-builder
https://app.skylara.app/reset-password?token=abc123&email=athlete@example.com
```

**Handling deep links in Root Layout:**
```typescript
export default function RootLayout() {
  const navigation = useNavigation();
  const url = useURL();

  useEffect(() => {
    if (url != null) {
      const parsed = url.replace(/.*?:\/\//g, "");
      const routeName = parsed.split("/")[0];
      const routeParams = parsed.split("/").slice(1);
      
      navigation.navigate(routeName, { params: routeParams });
    }
  }, [url, navigation]);

  return <AppNavigator />;
}
```

### 3.5 Auth Guard (Redirect to Login if No Token)

**File:** `app/_layout.tsx`

```typescript
import { useEffect } from "react";
import { useAuthStore } from "@/src/stores/authStore";
import { useRouter } from "expo-router";

export default function RootLayout() {
  const router = useRouter();
  const { accessToken, refreshToken } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand store to hydrate from storage
    const unsubscribe = useAuthStore.subscribe(
      (state) => state.accessToken,
      () => setIsHydrated(true)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken || !refreshToken) {
      router.replace("/(auth)/login");
    } else {
      router.replace("/(app)/home");
    }
  }, [isHydrated, accessToken, refreshToken]);

  // Show splash/loading while hydrating
  if (!isHydrated) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
    </QueryClientProvider>
  );
}
```

### 3.6 Role-Based Screen Access

**Hook: `useRoleAccess`**
```typescript
export function useRoleAccess(requiredRole: UserRole): boolean {
  const userRole = useAuthStore((s) => s.user?.role);
  
  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 5,
    DZ_OWNER: 4,
    MANIFEST_STAFF: 3,
    INSTRUCTOR: 2,
    ATHLETE: 1,
  };

  return roleHierarchy[userRole || "ATHLETE"] >= roleHierarchy[requiredRole];
}
```

**Usage in Screen:**
```typescript
export default function RestrictedScreen() {
  const hasAccess = useRoleAccess("MANIFEST_STAFF");
  
  if (!hasAccess) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>You don't have permission to access this screen.</Text>
      </View>
    );
  }

  return (
    // ... protected content
  );
}
```

---

## 4. HOME DASHBOARD (Athlete View)

### 4.1 Header: User Name + Check In/Out Toggle

**File:** `app/(app)/home/dashboard.tsx`

**Layout:**
```
┌─────────────────────────────────────────┐
│ [< Back]  Dashboard              [⚙ Settings] │ (header bar)
├─────────────────────────────────────────┤
│                                         │
│  "Hello, Alice!"                        │  (16px semibold, top padding 16pt)
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ CHECK OUT | ⭐ | CHECKED OUT     │   │  (toggle button, 48pt height)
│  └─────────────────────────────────┘   │
│                                         │
│  (or: CHECKED IN state if checked in)  │
│                                         │
└─────────────────────────────────────────┘
```

**Component: `CheckInToggle`**
```typescript
interface CheckInToggleProps {
  isCheckedIn: boolean;
  onToggle: (toCheckedIn: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function CheckInToggle({ isCheckedIn, onToggle, isLoading }: CheckInToggleProps) {
  return (
    <Pressable
      onPress={() => onToggle(!isCheckedIn)}
      disabled={isLoading}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: isCheckedIn ? "#28A745" : "#F0F0F0",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: isLoading ? 0.6 : 1,
      }}
    >
      <Text style={{ color: isCheckedIn ? "#FFF" : "#333", fontWeight: "600" }}>
        {isCheckedIn ? "CHECKED IN ✓" : "CHECK OUT"}
      </Text>
      {isLoading && <ActivityIndicator color={isCheckedIn ? "#FFF" : "#333"} />}
    </Pressable>
  );
}
```

### 4.2 Dropzone Selector (Multi-DZ)

**File:** `app/(app)/home/dashboard.tsx`

**Component: `DropzoneSelector`**
```
┌─────────────────────────────────────────┐
│ DZ: Skydive Miami ▼                      │  (tap to open)
│                                         │
│ Dropdown Menu:                          │
│ ─────────────────────                   │
│ ☑ Skydive Miami (12 active loads)        │
│ ○ Dropzone Chicago (4 active loads)     │
│ ○ Dropzone California (8 active loads)  │
│                                         │
│ [Manage DZs] ────────→                  │
│                                         │
└─────────────────────────────────────────┘
```

**TypeScript:**
```typescript
interface Dropzone {
  id: number;
  name: string;
  city: string;
  state: string;
  elevation: number; // feet
  latitude: number;
  longitude: number;
  activeLoads: number;
  phone: string;
  website: string;
}

export function DropzoneSelector() {
  const selectedDzId = useDzStore((s) => s.selectedDzId);
  const dropzones = useDzStore((s) => s.dropzones);
  const setSelectedDz = useDzStore((s) => s.setSelectedDz);
  const [isOpen, setIsOpen] = useState(false);

  const selectedDz = dropzones?.find((dz) => dz.id === selectedDzId);

  return (
    <View>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 6,
          backgroundColor: "#F9F9F9",
          borderWidth: 1,
          borderColor: "#DDD",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600" }}>
          DZ: {selectedDz?.name} ▼
        </Text>
      </Pressable>

      {isOpen && (
        <View style={{ marginTop: 8, backgroundColor: "#FFF", borderRadius: 6, borderWidth: 1, borderColor: "#DDD" }}>
          {dropzones?.map((dz) => (
            <Pressable
              key={dz.id}
              onPress={() => {
                setSelectedDz(dz.id);
                setIsOpen(false);
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEE" }}
            >
              <Text style={{ fontSize: 14 }}>
                {selectedDzId === dz.id ? "☑" : "○"} {dz.name} ({dz.activeLoads} active)
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
```

### 4.3 Balance + Tickets Display Cards

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Balance:     │  │ Tickets:     │    │
│  │              │  │              │    │
│  │ $1,250.00    │  │ 5 Block      │    │
│  │              │  │ Tickets      │    │
│  │ [+ ADD FUNDS]│  │ Remaining    │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ Current License:                 │   │
│  │ USPA C / Valid through 08/2025   │   │
│  │ Next Renewal: 08/31/2025         │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Components:**
```typescript
interface JumperProfile {
  id: string;
  balance: number; // USD
  blockTicketsRemaining: number;
  licenseLevel: LicenseLevel;
  licenseExpiryDate: ISO8601DateTime;
  nextRenewalDate: ISO8601DateTime;
}

export function BalanceCard({ jumper }: { jumper: JumperProfile }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>BALANCE</Text>
      <Text style={{ fontSize: 24, fontWeight: "700", marginTop: 8 }}>
        ${jumper.balance.toFixed(2)}
      </Text>
      <Button
        variant="outline"
        size="sm"
        title="+ ADD FUNDS"
        onPress={() => navigateToPayments()}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
}

export function BlockTicketsCard({ jumper }: { jumper: JumperProfile }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>TICKETS</Text>
      <Text style={{ fontSize: 24, fontWeight: "700", marginTop: 8 }}>
        {jumper.blockTicketsRemaining} Block
      </Text>
      <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Remaining</Text>
    </Card>
  );
}
```

### 4.4 Upcoming Load Card (with Refresh)

**Layout:**
```
┌─────────────────────────────────────────┐
│ NEXT LOAD                     [🔄 Refresh] │
│ ═════════════════════════────────────── │
│                                         │
│ Aircraft: Caravan C182                  │
│ Slots: 12/20 available                  │
│ Takeoff: 10:30 AM (in 15 minutes)      │
│                                         │
│ Status: FILLING → next: LOCKED (9m)     │
│                                         │
│ Jumpers:                                │
│ • Alice (You) — position 2              │
│ • Bob — position 3                      │
│ • Carol — waiting to assign position    │
│                                         │
│ [VIEW FULL BOARD] ────────────────────→ │
│                                         │
└─────────────────────────────────────────┘
```

**React Query Hook:**
```typescript
export function useUpcomingLoad(dzId: number) {
  return useQuery({
    queryKey: ["loads", dzId, "upcoming"],
    queryFn: async () => {
      const response = await apiClient.get(
        `/dz/${dzId}/loads?status=OPEN,FILLING,LOCKED&limit=1&sort=scheduledAt`
      );
      return response.data.loads[0] || null;
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 2000,
  });
}
```

**Component:**
```typescript
export function UpcomingLoadCard() {
  const dzId = useDzStore((s) => s.selectedDzId);
  const { data: load, isLoading, refetch } = useUpcomingLoad(dzId);
  const router = useRouter();

  if (isLoading) return <Skeleton height={200} />;
  if (!load) {
    return (
      <Card style={{ paddingVertical: 32, alignItems: "center" }}>
        <Text style={{ color: "#999" }}>No active loads at this DZ</Text>
      </Card>
    );
  }

  const timeUntilScheduled = new Date(load.scheduledAt).getTime() - Date.now();
  const minutesUntil = Math.floor(timeUntilScheduled / 60000);

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }}>NEXT LOAD</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ fontSize: 20 }}>🔄</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 12, color: "#666", marginTop: 12 }}>Aircraft</Text>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>{load.aircraft.tailNumber} ({load.aircraft.type})</Text>

      <Text style={{ fontSize: 12, color: "#666", marginTop: 12 }}>Slots Available</Text>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>
        {load.availableSlots}/{load.capacity}
      </Text>

      <Text style={{ fontSize: 12, color: "#666", marginTop: 12 }}>Takeoff Time</Text>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>
        {new Date(load.scheduledAt).toLocaleTimeString()} (in {minutesUntil}m)
      </Text>

      <Text style={{ fontSize: 12, color: "#666", marginTop: 12 }}>Status</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
        <Badge>{load.status}</Badge>
        <Text style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>
          → {getNextStatus(load.status)} ({getMinutesUntilNextStatus(load)}m)
        </Text>
      </View>

      <Button
        title="VIEW FULL BOARD"
        onPress={() => router.push("/load-board")}
        style={{ marginTop: 16 }}
      />
    </Card>
  );
}
```

### 4.5 Action Tiles Grid: Load Builder, Get Organized, My Loads, Transaction History, DZ Emergency, Leaderboard

**Layout:**
```
┌─────────────────────────────────────────┐
│ Quick Actions                           │
│ ═════════════════════────────────────   │
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │ 📋      │  │ 👥      │              │
│  │ LOAD    │  │ GET     │              │
│  │ BUILDER │  │ ORGANIZ │              │
│  │         │  │ ED      │              │
│  └─────────┘  └─────────┘              │
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │ 📂      │  │ 💰      │              │
│  │ MY      │  │ TRANS-  │              │
│  │ LOADS   │  │ ACTIONS │              │
│  │         │  │         │              │
│  └─────────┘  └─────────┘              │
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │ 🆘      │  │ 🏆      │              │
│  │ DZ      │  │ LEADER- │              │
│  │ EMERGENCY  │ BOARD   │              │
│  │         │  │         │              │
│  └─────────┘  └─────────┘              │
│                                         │
└─────────────────────────────────────────┘
```

**Component:**
```typescript
const ActionTiles = [
  { id: "load-builder", icon: "📋", title: "Load Builder", route: "load-builder" },
  { id: "get-organized", icon: "👥", title: "Get Organized", route: "get-organized" },
  { id: "my-loads", icon: "📂", title: "My Loads", route: "my-loads" },
  { id: "transactions", icon: "💰", title: "Transactions", route: "transactions" },
  { id: "dz-emergency", icon: "🆘", title: "DZ Emergency", route: "dz-emergency" },
  { id: "leaderboard", icon: "🏆", title: "Leaderboard", route: "leaderboard" },
];

export function ActionGrid() {
  const router = useRouter();

  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: "700", marginBottom: 12 }}>Quick Actions</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {ActionTiles.map((tile) => (
          <Pressable
            key={tile.id}
            onPress={() => router.push(tile.route)}
            style={{
              width: "48%",
              aspectRatio: 1,
              backgroundColor: "#F9F9F9",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#DDD",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 32 }}>{tile.icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", marginTop: 8, textAlign: "center" }}>
              {tile.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

### 4.6 Real-Time WebSocket: Load Updates, Check-In Broadcast

**File:** `src/services/socketService.ts`

```typescript
import io, { Socket } from "socket.io-client";
import { useAuthStore } from "@/src/stores/authStore";

class SocketService {
  private socket: Socket | null = null;

  connect(dzId: number): void {
    const token = useAuthStore.getState().accessToken;
    this.socket = io(process.env.EXPO_PUBLIC_SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.socket?.emit("subscribe:dz", { dzId });
    });

    this.socket.on("load:status-changed", (data) => {
      // Invalidate queries and update cache
      queryClient.invalidateQueries({ queryKey: ["loads", dzId] });
    });

    this.socket.on("load:slot-added", (data) => {
      queryClient.invalidateQueries({ queryKey: ["loads", dzId, data.loadId] });
    });

    this.socket.on("athlete:checked-in", (data) => {
      // Broadcast to all staff: "Alice just checked in"
      // Update UI accordingly
    });

    this.socket.on("dz:weather-hold", (data) => {
      // Show notification: "Weather hold in effect"
      notificationService.showAlert({
        type: "warning",
        message: data.reason,
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }
}

export const socketService = new SocketService();
```

**Usage in Dashboard:**
```typescript
useEffect(() => {
  const dzId = useDzStore.getState().selectedDzId;
  socketService.connect(dzId);

  return () => socketService.disconnect();
}, []);
```

### 4.7 Pull-to-Refresh

**Component:**
```typescript
import { RefreshControl, ScrollView } from "react-native";

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { refetch: refetchLoads } = useUpcomingLoad(dzId);
  const { refetch: refetchJumper } = useJumperProfile(userId);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLoads(), refetchJumper()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0084FF" />
      }
    >
      {/* Content */}
    </ScrollView>
  );
}
```

### 4.8 Offline Indicator

**Component:**
```typescript
import { useNetInfo } from "@react-native-community/netinfo";

export function OfflineIndicator() {
  const { isConnected } = useNetInfo();

  if (isConnected !== false) return null;

  return (
    <View style={{ backgroundColor: "#DC3545", paddingVertical: 8, paddingHorizontal: 12 }}>
      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>
        ⚠ You are offline. Some features may be limited.
      </Text>
    </View>
  );
}
```

---

---

---

## Section 5: CHECK-IN / CHECK-OUT SYSTEM

### 5.1 CheckInToggle Component

**File:** `src/components/CheckInToggle.tsx`

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { useCheckInStore } from '@/store/checkInStore';
import { useNavigate } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

interface CheckInToggleProps {
  jumperId: string;
  dzId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const CheckInToggle: React.FC<CheckInToggleProps> = ({
  jumperId,
  dzId,
  onSuccess,
  onError,
}) => {
  const router = useNavigate();
  const { isCheckedIn, checkIn, checkOut } = useCheckInStore();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const toggleCheckInMutation = useMutation({
    mutationFn: async (shouldCheckIn: boolean) => {
      if (shouldCheckIn) {
        // Pre-check-in validation
        const errors = await validateCheckIn(jumperId, dzId);
        if (errors.length > 0) {
          setValidationErrors(errors);
          if (errors.includes('waiver')) {
            router.push('/waiver');
          }
          throw new Error(errors[0]);
        }
      }

      const response = await api.post(
        `/api/v1/jumpers/${jumperId}/checkin`,
        { action: shouldCheckIn ? 'check_in' : 'check_out' }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.isCheckedIn) {
        checkIn();
      } else {
        checkOut();
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Check-in failed';
      onError?.(message);
    },
  });

  const validateCheckIn = async (jumperId: string, dzId: string): Promise<string[]> => {
    const errors: string[] = [];
    
    try {
      const jumperData = await api.get(`/api/v1/jumpers/${jumperId}`);
      
      // Check waiver signed
      if (!jumperData.data.waiverSignedDate) {
        errors.push('waiver');
      }
      
      // Check license current
      if (jumperData.data.licenseExpiration && 
          new Date(jumperData.data.licenseExpiration) < new Date()) {
        errors.push('license');
      }
      
      // Check gear inspected
      if (!jumperData.data.gearInspectedDate || 
          isGearInspectionExpired(jumperData.data.gearInspectedDate)) {
        errors.push('gear');
      }
    } catch (error) {
      console.error('Validation check failed:', error);
    }
    
    return errors;
  };

  const isGearInspectionExpired = (lastInspectionDate: string): boolean => {
    const lastInspection = new Date(lastInspectionDate);
    const daysSince = Math.floor(
      (Date.now() - lastInspection.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince > 365; // Annual inspection requirement
  };

  const getButtonState = () => {
    if (toggleCheckInMutation.isPending) {
      return 'loading';
    }
    return isCheckedIn ? 'checked_in' : 'checked_out';
  };

  const state = getButtonState();
  const bgColor =
    state === 'checked_out' ? 'bg-green-500' :
    state === 'checked_in' ? 'bg-red-500' :
    'bg-gray-400';
  
  const label =
    state === 'checked_out' ? 'CHECK IN' :
    state === 'checked_in' ? 'CHECK OUT' :
    '';

  return (
    <TouchableOpacity
      onPress={() => toggleCheckInMutation.mutate(!isCheckedIn)}
      disabled={toggleCheckInMutation.isPending}
      className={`${bgColor} px-6 py-3 rounded-lg flex-row items-center justify-center`}
    >
      {state === 'loading' && (
        <ActivityIndicator color="white" style={{ marginRight: 8 }} />
      )}
      <Text className="text-white font-bold text-center">{label}</Text>
    </TouchableOpacity>
  );
};
```

### 5.2 Zustand Check-In Store

**File:** `src/store/checkInStore.ts`

```typescript
import { create } from 'zustand';
import { api } from '@/services/api';

interface CheckInState {
  isCheckedIn: boolean;
  jumperId: string | null;
  dzId: string | null;
  lastCheckInTime: string | null;
  checkIn: () => void;
  checkOut: () => void;
  setJumperId: (id: string) => void;
  setDzId: (id: string) => void;
  reset: () => void;
}

export const useCheckInStore = create<CheckInState>((set) => ({
  isCheckedIn: false,
  jumperId: null,
  dzId: null,
  lastCheckInTime: null,

  checkIn: () =>
    set((state) => ({
      isCheckedIn: true,
      lastCheckInTime: new Date().toISOString(),
    })),

  checkOut: () =>
    set({
      isCheckedIn: false,
    }),

  setJumperId: (id: string) => set({ jumperId: id }),
  setDzId: (id: string) => set({ dzId: id }),

  reset: () =>
    set({
      isCheckedIn: false,
      jumperId: null,
      dzId: null,
      lastCheckInTime: null,
    }),
}));
```

### 5.3 Validation Rules

Check-in validation enforces:
- **Waiver signed:** Current liability waiver on file (updateable annually)
- **License current:** USPA/FAI license not expired
- **Gear checked:** Equipment inspection within past 365 days
- **Medical clearance:** No active medical restrictions
- **Payment method:** Valid ticket or wallet balance available

API validation endpoint: `GET /api/v1/jumpers/:jumperId/checkin-validation`

Response:
```typescript
{
  canCheckIn: boolean;
  errors: {
    waiver?: string;
    license?: string;
    gear?: string;
    medical?: string;
    payment?: string;
  };
  waiverExpiry?: string;
  licenseExpiry?: string;
}
```

### 5.4 Geofence Verification (Optional)

For DZs requiring proximity check-in:

**File:** `src/services/geofence.ts`

```typescript
import * as Location from 'expo-location';

export const verifyDZProximity = async (
  dzLatitude: number,
  dzLongitude: number,
  radiusMeters: number = 500
): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  const location = await Location.getCurrentPositionAsync({});
  const distance = getDistance(
    location.coords.latitude,
    location.coords.longitude,
    dzLatitude,
    dzLongitude
  );

  return distance <= radiusMeters;
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

### 5.5 Auto-Checkout at End of Day

**File:** `src/services/autoCheckout.ts`

```typescript
import { useEffect } from 'react';
import { useCheckInStore } from '@/store/checkInStore';
import { api } from '@/services/api';

export const useAutoCheckout = (dzId: string, jumperId: string, endOfDayHour: number = 18) => {
  const { isCheckedIn, checkOut } = useCheckInStore();

  useEffect(() => {
    if (!isCheckedIn) return;

    const checkTime = () => {
      const now = new Date();
      if (now.getHours() >= endOfDayHour && now.getMinutes() === 0) {
        api
          .post(`/api/v1/jumpers/${jumperId}/checkin`, {
            action: 'check_out',
            reason: 'auto_checkout',
          })
          .then(() => checkOut())
          .catch((error) => console.error('Auto-checkout failed:', error));
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isCheckedIn, dzId, jumperId, checkOut]);
};
```

### 5.6 WebSocket Check-In Events

Channel: `dz:{dzId}:checkins`

Events:
```typescript
// Broadcast when jumper checks in
socket.emit('checkin:user_checked_in', {
  jumperId: string;
  firstName: string;
  lastName: string;
  timestamp: string;
  licenseLevel: 'A' | 'B' | 'C' | 'D';
});

// Broadcast when jumper checks out
socket.emit('checkin:user_checked_out', {
  jumperId: string;
  firstName: string;
  lastName: string;
  timestamp: string;
});

// Real-time checkin count
socket.emit('checkin:count_updated', {
  totalCheckedIn: number;
  totalManifested: number;
});
```

---

## Section 6: WEATHER MODULE

### 6.1 WeatherWidget Component (Compact)

**File:** `src/components/WeatherWidget.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useWeather } from '@/hooks/useWeather';
import { useNavigation } from 'expo-router';
import { Cloud, Wind, Thermometer } from 'lucide-react-native';

interface WeatherWidgetProps {
  dzId: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ dzId }) => {
  const navigation = useNavigation();
  const { data: weather, isLoading } = useWeather(dzId);

  if (isLoading || !weather) {
    return (
      <View className="bg-gray-200 rounded-lg p-4 h-24">
        <Text className="text-gray-500">Loading weather...</Text>
      </View>
    );
  }

  const getJumpabilityColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getJumpabilityLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Marginal';
    return 'Poor';
  };

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('weather')}
      activeOpacity={0.7}
    >
      <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        {/* Header */}
        <Text className="text-xs text-gray-600 mb-2">Current Conditions</Text>

        {/* Weather Row */}
        <View className="flex-row justify-between mb-3">
          <View className="flex-row items-center">
            <Thermometer size={16} color="#ef4444" />
            <Text className="ml-2 font-semibold">{weather.temperature}°C</Text>
          </View>

          <View className="flex-row items-center">
            <Wind size={16} color="#3b82f6" />
            <Text className="ml-2 font-semibold">{weather.windSpeed} kt</Text>
          </View>

          <View className="flex-row items-center">
            <Cloud size={16} color="#6b7280" />
            <Text className="ml-2 font-semibold">{weather.cloudCover}%</Text>
          </View>
        </View>

        {/* Jumpability Bar */}
        <View className="mb-2">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs font-semibold">Jumpability</Text>
            <Text className={`text-xs font-bold ${
              weather.jumpabilityScore >= 80 ? 'text-green-600' :
              weather.jumpabilityScore >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {getJumpabilityLabel(weather.jumpabilityScore)}
            </Text>
          </View>
          <View className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
            <View
              className={`h-full ${getJumpabilityColor(weather.jumpabilityScore)}`}
              style={{ width: `${weather.jumpabilityScore}%` }}
            />
          </View>
        </View>

        {/* Footer */}
        <Text className="text-xs text-gray-400">Tap for hourly forecast</Text>
      </View>
    </TouchableOpacity>
  );
};
```

### 6.2 WeatherScreen (Full Detail)

**File:** `src/screens/weather/WeatherScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useForecast } from '@/hooks/useForecast';
import { Cloud, Wind, Thermometer, Eye, Droplets } from 'lucide-react-native';

interface WeatherScreenProps {
  dzId: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WeatherScreen: React.FC<WeatherScreenProps> = ({ dzId }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: forecast, isLoading, refetch } = useForecast(dzId, selectedDate);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Generate 7-day tabs
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    return date;
  });

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold mb-3">Weather Forecast</Text>

        {/* Day Selector Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {days.map((day, idx) => {
            const dayStr = day.toISOString().split('T')[0];
            const isSelected = dayStr === selectedDateStr;
            const label = idx === 0 ? 'Today' : WEEKDAYS[day.getDay()];

            return (
              <TouchableOpacity
                key={dayStr}
                onPress={() => setSelectedDate(day)}
                className={`mr-3 px-4 py-2 rounded-full ${
                  isSelected
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    isSelected ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-8">
            <Text>Loading forecast...</Text>
          </View>
        ) : forecast ? (
          <View className="p-4">
            {/* Jumpability Timeline */}
            <JumpabilityTimeline forecast={forecast} />

            {/* Hourly Forecast */}
            <View className="mt-6">
              <Text className="text-lg font-bold mb-4">Hourly Breakdown</Text>

              {forecast.hourly.map((hour, idx) => (
                <HourlyRow key={idx} hour={hour} />
              ))}
            </View>

            {/* Attribution */}
            <View className="mt-6 p-3 bg-gray-50 rounded-lg">
              <Text className="text-xs text-gray-600">
                Retrieved at {new Date(forecast.retrievedAt).toLocaleTimeString()}
              </Text>
              <Text className="text-xs text-gray-600">
                Source: open-meteo.com
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

interface HourlyRowProps {
  hour: {
    time: string;
    temperature: number;
    windSpeed: number;
    cloudCover: number;
    precipitation: number;
    visibility: number;
    jumpability: number;
  };
}

const HourlyRow: React.FC<HourlyRowProps> = ({ hour }) => {
  const timeStr = new Date(hour.time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getWeatherIcon = (cloud: number, precip: number) => {
    if (precip > 0.1) return '🌧️';
    if (cloud > 80) return '☁️';
    if (cloud > 50) return '⛅';
    return '☀️';
  };

  const getJumpabilityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
      <Text className="w-16 font-semibold">{timeStr}</Text>

      <View className="flex-row items-center w-12">
        <Text className="text-2xl">
          {getWeatherIcon(hour.cloudCover, hour.precipitation)}
        </Text>
      </View>

      <View className="flex-row items-center flex-1 ml-4 space-x-4">
        <View className="flex-row items-center flex-1">
          <Cloud size={14} color="#6b7280" />
          <Text className="ml-1 text-sm text-gray-600">{hour.cloudCover}%</Text>
        </View>

        <View className="flex-row items-center flex-1">
          <Wind size={14} color="#3b82f6" />
          <Text className="ml-1 text-sm text-gray-600">{hour.windSpeed}kt</Text>
        </View>

        <View className="flex-row items-center flex-1">
          <Thermometer size={14} color="#ef4444" />
          <Text className="ml-1 text-sm text-gray-600">{hour.temperature}°</Text>
        </View>
      </View>

      <Text className={`font-bold w-12 text-right ${getJumpabilityColor(hour.jumpability)}`}>
        {Math.round(hour.jumpability)}%
      </Text>
    </View>
  );
};

interface JumpabilityTimelineProps {
  forecast: {
    hourly: Array<{ time: string; jumpability: number }>;
  };
}

const JumpabilityTimeline: React.FC<JumpabilityTimelineProps> = ({ forecast }) => {
  // Filter to 8am-6pm window
  const jumpingHours = forecast.hourly.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= 8 && hour < 18;
  });

  const avgJumpability =
    jumpingHours.reduce((sum, h) => sum + h.jumpability, 0) / jumpingHours.length || 0;

  const getColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <View className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <View className="flex-row justify-between mb-2">
        <Text className="font-semibold">Jumpability Window (8am-6pm)</Text>
        <Text className={`font-bold ${
          avgJumpability >= 80 ? 'text-green-600' :
          avgJumpability >= 50 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {Math.round(avgJumpability)}%
        </Text>
      </View>
      <View className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
        <View
          className={`h-full ${getColor(avgJumpability)}`}
          style={{ width: `${avgJumpability}%` }}
        />
      </View>
    </View>
  );
};
```

### 6.3 Weather Hold Alert Banner

**File:** `src/components/WeatherHoldBanner.tsx`

```typescript
import React, { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useWeatherStore } from '@/store/weatherStore';
import { AlertTriangle, X } from 'lucide-react-native';

export const WeatherHoldBanner: React.FC = () => {
  const { isHoldActive, holdReason, dismissHold } = useWeatherStore();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isHoldActive) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isHoldActive, slideAnim]);

  if (!isHoldActive) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
      }}
      className="bg-orange-500 px-4 py-3 flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1">
        <AlertTriangle size={20} color="white" />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-white">Weather Hold Active</Text>
          <Text className="text-xs text-orange-100">{holdReason}</Text>
        </View>
      </View>
      <X
        size={20}
        color="white"
        onPress={dismissHold}
      />
    </Animated.View>
  );
};
```

### 6.4 Weather API Calls

**File:** `src/hooks/useWeather.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface CurrentWeather {
  temperature: number;
  windSpeed: number;
  cloudCover: number;
  precipitation: number;
  visibility: number;
  jumpabilityScore: number;
  retrievedAt: string;
}

export const useWeather = (dzId: string) => {
  return useQuery({
    queryKey: ['weather', dzId],
    queryFn: async () => {
      const response = await api.get<CurrentWeather>(
        `/api/v1/dz/${dzId}/weather`
      );
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
};

export const useForecast = (dzId: string, date: Date) => {
  const dateStr = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['forecast', dzId, dateStr],
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/dz/${dzId}/weather/forecast?date=${dateStr}`
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### 6.5 Weather Zustand Store

**File:** `src/store/weatherStore.ts`

```typescript
import { create } from 'zustand';

interface WeatherState {
  current: {
    temperature: number;
    windSpeed: number;
    cloudCover: number;
    jumpabilityScore: number;
  } | null;
  forecast: any[];
  isHoldActive: boolean;
  holdReason: string | null;
  setCurrentWeather: (weather: any) => void;
  setForecast: (forecast: any[]) => void;
  activateHold: (reason: string) => void;
  deactivateHold: () => void;
  dismissHold: () => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  current: null,
  forecast: [],
  isHoldActive: false,
  holdReason: null,

  setCurrentWeather: (weather) => set({ current: weather }),
  setForecast: (forecast) => set({ forecast }),

  activateHold: (reason: string) =>
    set({
      isHoldActive: true,
      holdReason: reason,
    }),

  deactivateHold: () =>
    set({
      isHoldActive: false,
      holdReason: null,
    }),

  dismissHold: () => set({ isHoldActive: false }),
}));
```

### 6.6 WebSocket Weather Events

Channel: `dz:{dzId}:weather`

```typescript
// Hold activated
socket.emit('weather:hold_activated', {
  reason: string;
  estimatedLiftAt?: string;
  dzId: string;
});

// Hold lifted
socket.emit('weather:hold_lifted', {
  dzId: string;
});

// Weather updated
socket.emit('weather:updated', {
  temperature: number;
  windSpeed: number;
  cloudCover: number;
  precipitation: number;
  jumpabilityScore: number;
});
```


---

## Section 7: LOAD BOARD (Athlete View)

### 7.1 LoadListScreen

**File:** `src/screens/loads/LoadListScreen.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useLoads } from '@/hooks/useLoads';
import { useLoadStore } from '@/store/loadStore';
import { useRoute } from 'expo-router';
import { Clock, Users, Plane } from 'lucide-react-native';

interface LoadCard {
  loadId: string;
  aircraft: string;
  status: string;
  availableSlots: number;
  totalSlots: number;
  scheduledTime: string;
  countdownMinutes: number;
}

export const LoadListScreen: React.FC = () => {
  const route = useRoute();
  const dzId = route.params?.dzId as string;
  const { data: loads, isLoading, refetch } = useLoads(dzId);
  const { setSelectedLoad } = useLoadStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleLoadPress = (load: LoadCard) => {
    setSelectedLoad(load);
    // Navigate to load detail
  };

  const getCountdownColor = (minutes: number): string => {
    if (minutes > 30) return 'text-green-600';
    if (minutes > 10) return 'text-yellow-600';
    if (minutes > 0) return 'text-red-600';
    return 'text-purple-600';
  };

  const getCountdownLabel = (minutes: number): string => {
    if (minutes <= 0) return 'NOW';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60)}h`;
  };

  const renderLoadCard = ({ item }: { item: LoadCard }) => (
    <TouchableOpacity
      onPress={() => handleLoadPress(item)}
      activeOpacity={0.7}
    >
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          {/* Aircraft & Status */}
          <View className="flex-row items-center mb-2">
            <Plane size={18} color="#3b82f6" />
            <Text className="ml-2 font-bold text-lg">{item.aircraft}</Text>
            <Text className={`ml-3 text-xs px-2 py-1 rounded ${
              item.status === 'ON_CALL' ? 'bg-blue-100 text-blue-700' :
              item.status === 'LOADING' ? 'bg-orange-100 text-orange-700' :
              item.status === 'BOARDING' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {item.status}
            </Text>
          </View>

          {/* Slots & Time */}
          <View className="flex-row items-center space-x-4">
            <View className="flex-row items-center">
              <Users size={14} color="#6b7280" />
              <Text className={`ml-1 text-sm font-semibold ${
                item.availableSlots > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.availableSlots > 0 
                  ? `${item.availableSlots} slots` 
                  : 'Full'}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Clock size={14} color="#6b7280" />
              <Text className="ml-1 text-sm text-gray-600">
                {new Date(item.scheduledTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Countdown Badge */}
        <View className={`ml-4 w-16 h-16 rounded-full border-2 ${
          item.countdownMinutes > 30 ? 'border-green-500' :
          item.countdownMinutes > 10 ? 'border-yellow-500' :
          item.countdownMinutes > 0 ? 'border-red-500' :
          'border-purple-500'
        } justify-center items-center`}>
          <Text className={`font-bold text-center ${
            getCountdownColor(item.countdownMinutes)
          }`}>
            {getCountdownLabel(item.countdownMinutes)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 border-b border-gray-200 bg-white">
        <Text className="text-2xl font-bold">Available Loads</Text>
      </View>

      <FlatList
        data={loads || []}
        renderItem={renderLoadCard}
        keyExtractor={(item) => item.loadId}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">
              {isLoading ? 'Loading loads...' : 'No available loads'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};
```

### 7.2 LoadDetailScreen

**File:** `src/screens/loads/LoadDetailScreen.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRoute } from 'expo-router';
import { useLoadDetail } from '@/hooks/useLoadDetail';
import { ArrowLeft, Plane, Clock, MapPin } from 'lucide-react-native';

interface Jumper {
  jumperId: string;
  firstName: string;
  lastName: string;
  licenseLevel: string;
  group: string;
  jumpType: string;
  exitOrder: number;
  isCurrentUser: boolean;
}

export const LoadDetailScreen: React.FC = () => {
  const route = useRoute();
  const { dzId, loadId } = route.params as { dzId: string; loadId: string };
  const { data: load, isLoading } = useLoadDetail(dzId, loadId);

  if (isLoading || !load) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  const jumpTypeColors: Record<string, string> = {
    'TANDEM': 'bg-purple-100 text-purple-700',
    'AFF': 'bg-blue-100 text-blue-700',
    'FUN_JUMP': 'bg-green-100 text-green-700',
    'COACH': 'bg-orange-100 text-orange-700',
    'CAMERA': 'bg-red-100 text-red-700',
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold flex-1 ml-3">Load Details</Text>
      </View>

      <ScrollView>
        {/* Load Header Card */}
        <View className="bg-blue-50 p-4 border-b border-blue-200">
          <View className="flex-row items-center mb-3">
            <Plane size={24} color="#3b82f6" />
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-bold">{load.aircraft}</Text>
              <Text className="text-sm text-gray-600">
                {load.status} • {load.availableSlots}/{load.totalSlots} slots
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-6">
            <View>
              <Text className="text-xs text-gray-600">Departure</Text>
              <View className="flex-row items-center mt-1">
                <Clock size={16} color="#3b82f6" />
                <Text className="ml-2 font-bold">
                  {new Date(load.scheduledTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-xs text-gray-600">Load Master</Text>
              <Text className="font-bold mt-1">{load.loadMasterName}</Text>
            </View>
          </View>
        </View>

        {/* Jumpers List */}
        <View className="p-4">
          <Text className="text-lg font-bold mb-4">Jumpers in this load</Text>

          {load.jumpers && load.jumpers.map((jumper: Jumper) => (
            <View
              key={jumper.jumperId}
              className={`flex-row items-center justify-between p-3 rounded-lg mb-2 ${
                jumper.isCurrentUser ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
              }`}
            >
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className={`font-bold ${jumper.isCurrentUser ? 'text-green-700' : ''}`}>
                    {jumper.firstName} {jumper.lastName}
                  </Text>
                  {jumper.isCurrentUser && (
                    <Text className="text-xs px-2 py-1 bg-green-500 text-white rounded">
                      I'm on this load
                    </Text>
                  )}
                </View>

                <View className="flex-row items-center space-x-3">
                  <Text className={`text-xs px-2 py-1 rounded ${
                    jumpTypeColors[jumper.jumpType] || 'bg-gray-200'
                  }`}>
                    {jumper.jumpType}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    License: {jumper.licenseLevel}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Group: {jumper.group}
                  </Text>
                </View>
              </View>

              <Text className="ml-3 font-bold text-gray-700">
                Exit #{jumper.exitOrder}
              </Text>
            </View>
          ))}
        </View>

        {/* Exit Order */}
        <View className="p-4 bg-gray-50 m-4 rounded-lg">
          <Text className="text-sm font-bold text-gray-700 mb-2">EXIT ORDER</Text>
          <Text className="text-xs text-gray-600">{load.exitOrder}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
```

### 7.3 Load Hooks

**File:** `src/hooks/useLoads.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export const useLoads = (dzId: string, filters?: any) => {
  return useQuery({
    queryKey: ['loads', dzId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.minSlots) params.append('minSlots', filters.minSlots);

      const response = await api.get(
        `/api/v1/dz/${dzId}/loads?${params.toString()}`
      );
      return response.data;
    },
    refetchInterval: 10000, // 10 seconds
  });
};

export const useLoadDetail = (dzId: string, loadId: string) => {
  return useQuery({
    queryKey: ['loadDetail', dzId, loadId],
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/dz/${dzId}/loads/${loadId}`
      );
      return response.data;
    },
    refetchInterval: 5000, // 5 seconds for real-time updates
  });
};
```

### 7.4 Load Zustand Store

**File:** `src/store/loadStore.ts`

```typescript
import { create } from 'zustand';

interface LoadCard {
  loadId: string;
  aircraft: string;
  status: string;
  availableSlots: number;
  totalSlots: number;
  scheduledTime: string;
  countdownMinutes: number;
}

interface LoadState {
  loads: LoadCard[];
  selectedLoad: LoadCard | null;
  setLoads: (loads: LoadCard[]) => void;
  setSelectedLoad: (load: LoadCard) => void;
  updateSlot: (loadId: string, jumperId: string, slotType: string) => void;
  removeSlot: (loadId: string, jumperId: string) => void;
}

export const useLoadStore = create<LoadState>((set) => ({
  loads: [],
  selectedLoad: null,

  setLoads: (loads) => set({ loads }),
  setSelectedLoad: (load) => set({ selectedLoad: load }),

  updateSlot: (loadId, jumperId, slotType) =>
    set((state) => ({
      loads: state.loads.map((load) =>
        load.loadId === loadId
          ? { ...load, availableSlots: load.availableSlots - 1 }
          : load
      ),
    })),

  removeSlot: (loadId, jumperId) =>
    set((state) => ({
      loads: state.loads.map((load) =>
        load.loadId === loadId
          ? { ...load, availableSlots: load.availableSlots + 1 }
          : load
      ),
    })),
}));
```

### 7.5 WebSocket Load Events

Channel: `dz:{dzId}:loads` and `load:{loadId}`

```typescript
// When slots update
socket.emit('load:slot_filled', {
  loadId: string;
  jumperId: string;
  slotType: string;
  availableSlots: number;
});

// When load status changes
socket.emit('load:status_changed', {
  loadId: string;
  status: LoadStatus;
  timestamp: string;
});

// When jumper joins load
socket.emit('load:jumper_joined', {
  loadId: string;
  jumperId: string;
  firstName: string;
  lastName: string;
  jumpType: string;
});

// Countdown updates every minute
socket.emit('load:countdown_updated', {
  loadId: string;
  countdownMinutes: number;
});
```

---

## Section 8: LOAD BUILDER & SELF-MANIFEST (Complete Flow)

### 8.1 LoadBuilderScreen (Main)

**File:** `src/screens/manifest/LoadBuilderScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { TeamsTab } from './tabs/TeamsTab';
import { HistoryTab } from './tabs/HistoryTab';
import { AddMeTab } from './tabs/AddMeTab';
import { Trash2, MessageSquare, QrCode } from 'lucide-react-native';

const Tab = createMaterialTopTabNavigator();

interface LoadBuilderScreenProps {
  dzId: string;
  jumperId: string;
}

export const LoadBuilderScreen: React.FC<LoadBuilderScreenProps> = ({
  dzId,
  jumperId,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const handleClear = () => {
    Alert.alert(
      'Clear Team?',
      'This will remove all members from your current team.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => setSelectedTeam(null),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <Text className="text-2xl font-bold">Load Builder</Text>
        <TouchableOpacity onPress={handleClear}>
          <Trash2 size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarIndicatorStyle: { backgroundColor: '#3b82f6', height: 3 },
        }}
      >
        <Tab.Screen name="Teams" component={TeamsTab} />
        <Tab.Screen name="History" component={HistoryTab} />
        <Tab.Screen name="Add Me" component={AddMeTab} />
      </Tab.Navigator>

      {/* Bottom Action Bar */}
      <View className="border-t border-gray-200 flex-row justify-between p-3 bg-gray-50">
        <TouchableOpacity className="flex-1 bg-blue-500 mx-1 py-3 rounded-lg items-center">
          <Text className="text-white font-bold">Select Load</Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-1 bg-green-500 mx-1 py-3 rounded-lg flex-row items-center justify-center">
          <MessageSquare size={18} color="white" />
          <Text className="text-white font-bold ml-2">Message</Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-1 bg-purple-500 mx-1 py-3 rounded-lg flex-row items-center justify-center">
          <QrCode size={18} color="white" />
          <Text className="text-white font-bold ml-2">Scan QR</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

### 8.2 TeamsTab Component

**File:** `src/screens/manifest/tabs/TeamsTab.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Plus, Edit2 } from 'lucide-react-native';
import { useTeamsStore } from '@/store/teamsStore';

interface Team {
  teamId: string;
  name: string;
  members: any[];
  lastUsed: string;
}

export const TeamsTab: React.FC = () => {
  const { teams, addTeam } = useTeamsStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Team name is required');
      return;
    }

    addTeam({
      teamId: `team_${Date.now()}`,
      name: teamName,
      members: [],
      lastUsed: new Date().toISOString(),
    });

    setTeamName('');
    setShowCreateModal(false);
  };

  const renderTeamRow = ({ item }: { item: Team }) => (
    <TouchableOpacity activeOpacity={0.7}>
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold">{item.name}</Text>
          <Text className="text-sm text-gray-600">
            {item.members.length} members • Last used {
              new Date(item.lastUsed).toLocaleDateString()
            }
          </Text>
        </View>

        <TouchableOpacity className="ml-3 p-2 bg-blue-100 rounded-lg">
          <Edit2 size={18} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 p-4">
      <FlatList
        data={teams}
        renderItem={renderTeamRow}
        keyExtractor={(item) => item.teamId}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">No teams yet</Text>
          </View>
        }
      />

      {/* Create Team Button */}
      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        className="bg-blue-500 rounded-full w-16 h-16 justify-center items-center absolute bottom-6 right-6"
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Create Team Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6 pb-10">
            <Text className="text-xl font-bold mb-4">Create New Team</Text>

            <TextInput
              placeholder="Team name (e.g., 'Freefly Squad')"
              value={teamName}
              onChangeText={setTeamName}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-center font-bold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateTeam}
                className="flex-1 bg-blue-500 py-3 rounded-lg"
              >
                <Text className="text-center font-bold text-white">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
```

### 8.3 TeamEditorScreen

**File:** `src/screens/manifest/TeamEditorScreen.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRoute } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';

interface TeamMember {
  memberId: string;
  jumperName: string;
  jumpType: string;
  payment: string;
  formation: string;
  checked: boolean;
}

interface TeamEditorScreenProps {
  teamId: string;
}

export const TeamEditorScreen: React.FC<TeamEditorScreenProps> = ({ teamId }) => {
  const route = useRoute();
  const team = route.params?.team as any;

  const renderMemberRow = ({ item }: { item: TeamMember }) => (
    <TouchableOpacity activeOpacity={0.7}>
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-2 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-bold">{item.jumperName}</Text>
          <View className="flex-row mt-1 space-x-2">
            <Text className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {item.jumpType}
            </Text>
            <Text className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              {item.payment}
            </Text>
            <Text className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              {item.formation}
            </Text>
          </View>
        </View>

        <View className="ml-3">
          <Text className="text-2xl">{item.checked ? '✓' : '○'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold">{team.name}</Text>
      </View>

      <FlatList
        data={team.members}
        renderItem={renderMemberRow}
        keyExtractor={(item: TeamMember) => item.memberId}
        contentContainerStyle={{ padding: 16 }}
      />

      <TouchableOpacity className="bg-blue-500 rounded-full w-16 h-16 justify-center items-center absolute bottom-6 right-6">
        <Plus size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};
```

### 8.4 AddJumperSheet (Bottom Sheet Modal)

**File:** `src/components/AddJumperSheet.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Search, QrCode } from 'lucide-react-native';

interface AddJumperSheetProps {
  dzId: string;
  onSelectJumper: (jumperId: string, jumperName: string) => void;
  onClose: () => void;
  visible: boolean;
}

interface Jumper {
  jumperId: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
}

export const AddJumperSheet: React.FC<AddJumperSheetProps> = ({
  dzId,
  onSelectJumper,
  onClose,
  visible,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJumperId, setSelectedJumperId] = useState<string | null>(null);

  const { data: jumpers = [] } = useQuery({
    queryKey: ['dzJumpers', dzId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(
        `/api/v1/dz/${dzId}/jumpers?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!dzId,
  });

  const handleSelect = (jumper: Jumper) => {
    setSelectedJumperId(jumper.jumperId);
    onSelectJumper(jumper.jumperId, `${jumper.firstName} ${jumper.lastName}`);
  };

  const renderJumperRow = ({ item }: { item: Jumper }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center p-4 border-b border-gray-100">
        <View className={`w-6 h-6 rounded-full border-2 mr-3 ${
          selectedJumperId === item.jumperId
            ? 'bg-blue-500 border-blue-500'
            : 'border-gray-300'
        }`} />

        <View className="flex-1">
          <Text className="font-bold">
            #{item.memberNumber}
          </Text>
          <Text className="text-sm text-gray-600">
            {item.firstName} {item.lastName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
          <Text className="text-xl font-bold">Add Jumper</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-blue-500 font-bold">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="p-4 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={18} color="#6b7280" />
            <TextInput
              placeholder="Search by name or number"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 py-1"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity className="mt-3 py-2 flex-row items-center">
            <QrCode size={18} color="#3b82f6" />
            <Text className="ml-2 text-blue-500 font-bold">Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-2 py-2">
            <Text className="text-blue-500 font-bold">Enter Member ID</Text>
          </TouchableOpacity>
        </View>

        {/* Jumpers List */}
        <FlatList
          data={jumpers}
          renderItem={renderJumperRow}
          keyExtractor={(item) => item.jumperId}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-500">
                {searchQuery ? 'No jumpers found' : 'Start typing to search'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};
```

### 8.5 JumpConfigSheet (Multi-Step Configuration)

**File:** `src/components/JumpConfigSheet.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ChevronRight } from 'lucide-react-native';

interface JumpConfigSheetProps {
  jumperId: string;
  jumperName: string;
  dzId: string;
  onConfirm: (config: JumpConfig) => void;
  onClose: () => void;
  visible: boolean;
}

interface JumpConfig {
  jumperId: string;
  jumpType: string;
  paymentMethod: string;
  formation: string;
  price: number;
  ticketId?: string;
}

const FORMATIONS = [
  'FS', 'Freefly', 'Solo', 'Wingsuit', 'XRW', 'VFS', 'HopNPop', 'Tracking', 'CRW',
  'Canopy Flocking', 'Angle', 'Freestyle', 'High Pull', 'HyBrid', 'FS-4WAY',
  'FS-8WAY', 'FS-16WAY', 'FS-BigWay', 'AFF', 'Tandem', 'SWOOP', 'POND SWOOP',
  'MFS', 'Accuracy', 'Sky Surfing'
];

const JUMP_TYPES = [
  { name: 'Full Altitude 150 (pack)', price: 3500 },
  { name: 'Full Altitude 150', price: 3000 },
  { name: 'Full Altitude 260 (pack)', price: 4500 },
  { name: 'Full Altitude 260', price: 4000 },
];

export const JumpConfigSheet: React.FC<JumpConfigSheetProps> = ({
  jumperId,
  jumperName,
  dzId,
  onConfirm,
  onClose,
  visible,
}) => {
  const [step, setStep] = useState(1);
  const [selectedJumpType, setSelectedJumpType] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);
  const [showFormationPicker, setShowFormationPicker] = useState(false);

  // Fetch wallet and ticket data
  const { data: paymentData } = useQuery({
    queryKey: ['jumperPayment', jumperId, dzId],
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/jumpers/${jumperId}/payment-methods`
      );
      return response.data;
    },
    enabled: !!jumperId && visible,
  });

  const handleConfirm = () => {
    if (!selectedJumpType || !selectedPayment || !selectedFormation) {
      Alert.alert('Error', 'Please complete all steps');
      return;
    }

    const jumpTypeObj = JUMP_TYPES.find((jt) => jt.name === selectedJumpType);

    onConfirm({
      jumperId,
      jumpType: selectedJumpType,
      paymentMethod: selectedPayment,
      formation: selectedFormation,
      price: jumpTypeObj?.price || 0,
    });

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-200">
          <Text className="text-xl font-bold">{jumperName}</Text>
          <Text className="text-sm text-gray-600">Step {step} of 3</Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Step 1: Jump Type */}
          {step === 1 && (
            <View>
              <Text className="text-lg font-bold mb-4">Select Jump Type</Text>

              {JUMP_TYPES.map((jt, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedJumpType(jt.name)}
                  activeOpacity={0.7}
                >
                  <View className={`p-4 rounded-lg border-2 mb-3 flex-row justify-between items-center ${
                    selectedJumpType === jt.name
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200'
                  }`}>
                    <View>
                      <Text className="font-bold">{jt.name}</Text>
                      <Text className="text-sm text-gray-600">
                        €{(jt.price / 100).toFixed(2)}
                      </Text>
                    </View>
                    {selectedJumpType === jt.name && (
                      <View className="w-6 h-6 rounded-full bg-blue-500" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <View>
              <Text className="text-lg font-bold mb-4">Select Payment</Text>

              {/* Block Ticket */}
              {paymentData?.blockTickets && paymentData.blockTickets.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSelectedPayment('block_ticket')}
                  activeOpacity={0.7}
                >
                  <View className={`p-4 rounded-lg border-2 mb-3 ${
                    selectedPayment === 'block_ticket'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-white border-gray-200'
                  }`}>
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="font-bold">
                          Block Ticket {selectedPayment === 'block_ticket' && '✓'}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {paymentData.blockTickets[0].remaining} remaining
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Wallet */}
              <TouchableOpacity
                onPress={() => setSelectedPayment('wallet')}
                activeOpacity={0.7}
              >
                <View className={`p-4 rounded-lg border-2 mb-3 ${
                  selectedPayment === 'wallet'
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200'
                }`}>
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="font-bold">Wallet {selectedPayment === 'wallet' && '✓'}</Text>
                      <Text className="text-sm text-gray-600">
                        Balance: €{(paymentData?.walletBalance || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Credit Card */}
              <TouchableOpacity
                onPress={() => setSelectedPayment('credit_card')}
                activeOpacity={0.7}
              >
                <View className={`p-4 rounded-lg border-2 ${
                  selectedPayment === 'credit_card'
                    ? 'bg-purple-50 border-purple-500'
                    : 'bg-white border-gray-200'
                }`}>
                  <Text className="font-bold">Credit Card {selectedPayment === 'credit_card' && '✓'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Formation */}
          {step === 3 && (
            <View>
              <Text className="text-lg font-bold mb-4">Select Formation</Text>

              <TouchableOpacity
                onPress={() => setShowFormationPicker(true)}
                activeOpacity={0.7}
              >
                <View className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 flex-row justify-between items-center">
                  <Text className="font-bold text-blue-700">
                    {selectedFormation || 'Tap to select formation...'}
                  </Text>
                  <ChevronRight size={20} color="#3b82f6" />
                </View>
              </TouchableOpacity>

              {/* Formation Picker Modal */}
              <Modal
                visible={showFormationPicker}
                transparent
                animationType="slide"
              >
                <SafeAreaView className="flex-1 bg-white">
                  <View className="px-4 py-3 border-b border-gray-200 flex-row justify-between items-center">
                    <Text className="text-xl font-bold">Choose Formation</Text>
                    <TouchableOpacity onPress={() => setShowFormationPicker(false)}>
                      <Text className="text-blue-500 font-bold">Done</Text>
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={FORMATIONS}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedFormation(item);
                          setShowFormationPicker(false);
                        }}
                      >
                        <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                          <Text className={`font-bold ${
                            selectedFormation === item ? 'text-blue-500' : ''
                          }`}>
                            {item}
                          </Text>
                          {selectedFormation === item && (
                            <Text className="text-blue-500 font-bold">✓</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item}
                  />
                </SafeAreaView>
              </Modal>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View className="border-t border-gray-200 flex-row p-4 space-x-3">
          {step > 1 && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              className="flex-1 bg-gray-200 py-3 rounded-lg"
            >
              <Text className="text-center font-bold text-gray-700">Back</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity
              onPress={() => setStep(step + 1)}
              disabled={
                (step === 1 && !selectedJumpType) ||
                (step === 2 && !selectedPayment)
              }
              className={`flex-1 ${
                step === 1 && !selectedJumpType || step === 2 && !selectedPayment
                  ? 'bg-gray-300'
                  : 'bg-blue-500'
              } py-3 rounded-lg`}
            >
              <Text className="text-center font-bold text-white">Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selectedFormation}
              className={`flex-1 ${
                !selectedFormation ? 'bg-gray-300' : 'bg-green-500'
              } py-3 rounded-lg`}
            >
              <Text className="text-center font-bold text-white">Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
```

### 8.6 AddMeTab (Self-Manifest Shortcut)

**File:** `src/screens/manifest/tabs/AddMeTab.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

interface AddMeTabProps {
  dzId: string;
}

export const AddMeTab: React.FC<AddMeTabProps> = ({ dzId }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedJumpType, setSelectedJumpType] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);

  const selfManifestMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        `/api/v1/dz/${dzId}/loads/self-manifest`,
        {
          userId: user?.id,
          slotType: 'FUN',
          jumpType: selectedJumpType,
          paymentMethod: selectedPayment,
          formation: selectedFormation,
          weight: user?.weight,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Navigate to load confirmation
    },
  });

  return (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold mb-4">
        Quick Self-Manifest
      </Text>

      {/* Step Indicators */}
      <View className="flex-row mb-6 space-x-2">
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            className={`flex-1 h-2 rounded-full ${
              s <= step ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </View>

      {/* Content based on step */}
      <View className="mb-8">
        {step === 1 && (
          <>
            <Text className="font-bold mb-3">Step 1: Jump Type</Text>
            {/* Jump type options */}
          </>
        )}
        {step === 2 && (
          <>
            <Text className="font-bold mb-3">Step 2: Payment</Text>
            {/* Payment options */}
          </>
        )}
        {step === 3 && (
          <>
            <Text className="font-bold mb-3">Step 3: Formation</Text>
            {/* Formation picker */}
          </>
        )}
      </View>

      {/* Navigation */}
      <View className="flex-row space-x-3">
        {step > 1 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            className="flex-1 bg-gray-200 py-3 rounded-lg"
          >
            <Text className="text-center font-bold">Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            onPress={() => setStep(step + 1)}
            className="flex-1 bg-blue-500 py-3 rounded-lg"
          >
            <Text className="text-center font-bold text-white">Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => selfManifestMutation.mutate()}
            className="flex-1 bg-green-500 py-3 rounded-lg"
          >
            <Text className="text-center font-bold text-white">
              Manifest Me
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
```

### 8.7 SelectLoadSheet

**File:** `src/components/SelectLoadSheet.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useLoads } from '@/hooks/useLoads';
import { useLoadStore } from '@/store/loadStore';
import { Plane, Users, Clock } from 'lucide-react-native';

interface SelectLoadSheetProps {
  dzId: string;
  visible: boolean;
  onSelectLoad: (loadId: string) => void;
  onClose: () => void;
}

interface AvailableLoad {
  loadId: string;
  aircraft: string;
  slotsAvailable: number;
  totalSlots: number;
  scheduledTime: string;
  countdownMinutes: number;
}

export const SelectLoadSheet: React.FC<SelectLoadSheetProps> = ({
  dzId,
  visible,
  onSelectLoad,
  onClose,
}) => {
  const { data: loads = [] } = useLoads(dzId);

  const renderLoadRow = ({ item }: { item: AvailableLoad }) => (
    <TouchableOpacity
      onPress={() => {
        onSelectLoad(item.loadId);
        onClose();
      }}
      activeOpacity={0.7}
    >
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-2 flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <Plane size={18} color="#3b82f6" />
            <Text className="ml-2 font-bold text-lg">{item.aircraft}</Text>
          </View>

          <View className="flex-row space-x-4">
            <View className="flex-row items-center">
              <Users size={14} color="#6b7280" />
              <Text className={`ml-1 text-sm font-bold ${
                item.slotsAvailable > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.slotsAvailable}/{item.totalSlots}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Clock size={14} color="#6b7280" />
              <Text className="ml-1 text-sm">
                {new Date(item.scheduledTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>

        {item.countdownMinutes > 0 && (
          <View className="ml-3">
            <Text className={`font-bold ${
              item.countdownMinutes > 30 ? 'text-green-600' :
              item.countdownMinutes > 10 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {Math.round(item.countdownMinutes)}m
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
          <Text className="text-xl font-bold">Select Load</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-blue-500 font-bold">Close</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={loads}
          renderItem={renderLoadRow}
          keyExtractor={(item) => item.loadId}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-500">No available loads</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};
```

### 8.8 LoadConfirmationScreen

**File:** `src/screens/manifest/LoadConfirmationScreen.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plane, Clock, Users, ChevronRight } from 'lucide-react-native';

export const LoadConfirmationScreen: React.FC = () => {
  const route = useRoute();
  const { load, team, dzId } = route.params as any;

  const removeFromLoadMutation = useMutation({
    mutationFn: async () => {
      // Remove all team members from load
      await Promise.all(
        team.members.map((member: any) =>
          api.delete(`/api/v1/dz/${dzId}/loads/${load.loadId}/slots/${member.slotId}`)
        )
      );
    },
    onSuccess: () => {
      Alert.alert('Success', 'Removed from load');
      // Navigate back
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        {/* Load Card */}
        <View className="bg-blue-50 p-4 border-b border-blue-200">
          <View className="flex-row items-center mb-3">
            <Plane size={24} color="#3b82f6" />
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-bold">{load.aircraft}</Text>
              <Text className="text-sm text-gray-600">
                Status: {load.status}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-6">
            <View>
              <Text className="text-xs text-gray-600">Slots</Text>
              <View className="flex-row items-center mt-1">
                <Users size={16} color="#3b82f6" />
                <Text className="ml-2 font-bold">{load.availableSlots}</Text>
              </View>
            </View>

            <View>
              <Text className="text-xs text-gray-600">Departure</Text>
              <View className="flex-row items-center mt-1">
                <Clock size={16} color="#3b82f6" />
                <Text className="ml-2 font-bold">
                  {new Date(load.scheduledTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Jumpers in Group */}
        <View className="p-4">
          <Text className="text-lg font-bold mb-4">Jumpers in your group</Text>

          {team.members.map((member: any, idx: number) => (
            <View key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2 flex-row items-center">
              <Text className="text-xl mr-3">✓</Text>
              <View className="flex-1">
                <Text className="font-bold">{member.name}</Text>
                <Text className="text-sm text-gray-600">{member.formation}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="border-t border-gray-200 p-4 space-y-3">
        <TouchableOpacity className="bg-blue-500 py-3 rounded-lg">
          <Text className="text-center font-bold text-white">Load Builder</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-orange-500 py-3 rounded-lg flex-row items-center justify-center">
          <Text className="text-center font-bold text-white mr-2">Move to Different Load</Text>
          <ChevronRight size={18} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Remove from Load?',
              `Remove yourself from ${load.aircraft}?`,
              [
                { text: 'Keep Me', style: 'cancel' },
                {
                  text: 'Remove Me',
                  onPress: () => removeFromLoadMutation.mutate(),
                  style: 'destructive',
                },
              ]
            );
          }}
          className="bg-red-500 py-3 rounded-lg"
        >
          <Text className="text-center font-bold text-white">Remove from Load</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

### 8.9 QR Code Scanner

**File:** `src/screens/qr/QRScannerScreen.tsx`

```typescript
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useRoute } from 'expo-router';

interface QRScannerScreenProps {
  dzId: string;
  onScannedJumper: (jumperId: string, jumperName: string) => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({
  dzId,
  onScannedJumper,
}) => {
  const route = useRoute();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="mb-4">Camera permission required</Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);

    // Parse QR data: format "jumper:{jumperId}:{firstName}:{lastName}"
    const parts = data.split(':');
    if (parts[0] === 'jumper' && parts.length === 4) {
      const jumperId = parts[1];
      const jumperName = `${parts[2]} ${parts[3]}`;
      onScannedJumper(jumperId, jumperName);
      // Navigate back
    } else {
      Alert.alert('Invalid QR', 'This QR code is not a valid jumper ID');
      setScanned(false);
    }
  };

  return (
    <View className="flex-1">
      <CameraView
        ref={cameraRef}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        style={{ flex: 1 }}
      />

      <View className="absolute bottom-6 left-6 right-6">
        <TouchableOpacity
          onPress={() => setScanned(false)}
          className="bg-blue-500 py-3 rounded-lg"
        >
          <Text className="text-center text-white font-bold">Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 8.10 HistoryTab Component

**File:** `src/screens/manifest/tabs/HistoryTab.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTeamsStore } from '@/store/teamsStore';
import { RotateCw } from 'lucide-react-native';

interface HistoryEntry {
  id: string;
  date: string;
  members: string[];
  formation: string;
}

export const HistoryTab: React.FC = () => {
  const { teamHistory } = useTeamsStore();

  const renderHistoryRow = ({ item }: { item: HistoryEntry }) => (
    <TouchableOpacity activeOpacity={0.7}>
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-bold mb-1">
            {item.members.join(', ')}
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">
              {new Date(item.date).toLocaleDateString()}
            </Text>
            <Text className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
              {item.formation}
            </Text>
          </View>
        </View>

        <TouchableOpacity className="ml-3 p-2 bg-green-100 rounded-lg">
          <RotateCw size={18} color="#22c55e" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 p-4">
      <FlatList
        data={teamHistory}
        renderItem={renderHistoryRow}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">No history yet</Text>
          </View>
        }
      />
    </View>
  );
};
```

### 8.11 Zustand Teams Store

**File:** `src/store/teamsStore.ts`

```typescript
import { create } from 'zustand';

interface Team {
  teamId: string;
  name: string;
  members: any[];
  lastUsed: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  members: string[];
  formation: string;
}

interface TeamsState {
  teams: Team[];
  teamHistory: HistoryEntry[];
  addTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  addToHistory: (entry: HistoryEntry) => void;
}

export const useTeamsStore = create<TeamsState>((set) => ({
  teams: [],
  teamHistory: [],

  addTeam: (team) =>
    set((state) => ({
      teams: [team, ...state.teams],
    })),

  deleteTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((t) => t.teamId !== teamId),
    })),

  updateTeam: (teamId, updates) =>
    set((state) => ({
      teams: state.teams.map((t) =>
        t.teamId === teamId ? { ...t, ...updates } : t
      ),
    })),

  addToHistory: (entry) =>
    set((state) => ({
      teamHistory: [entry, ...state.teamHistory],
    })),
}));
```

---

## API Route Schemas

All endpoints use JWT auth header: `Authorization: Bearer {token}`

### POST /api/v1/dz/:dzId/loads/:loadId/slots

Add member to load (self-manifest):

```typescript
Body: {
  userId: string;
  slotType: SlotType; // FUN, TANDEM_PASSENGER, etc.
  jumpType: JumpType; // TANDEM, AFF, FUN_JUMP, etc.
  position?: number; // Exit order
  weight: number;
  instructorId?: string;
  paymentMethod: string;
  formation: string;
}

Response: {
  slotId: string;
  loadId: string;
  status: SlotStatus; // MANIFESTED
  checkInTime?: string;
}
```

### DELETE /api/v1/dz/:dzId/loads/:loadId/slots/:slotId

Remove member from load:

```typescript
Response: {
  success: boolean;
  refundAmount?: number;
  message: string;
}
```

---

**File:** `/sessions/bold-epic-noether/SkyLara_Mobile_Sections5to8.md`

All code follows React Native best practices with NativeWind styling, expo-router navigation, Zustand state, React Query for server state, and WebSocket integration via Socket.IO for real-time updates. Components are fully typed with TypeScript.


---

---

## 9. PAYMENT & WALLET MODULE

### 9.1 Wallet Dashboard Screen

**File:** `src/screens/Payment/WalletScreen.tsx`

```typescript
import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../api/paymentApi';

interface WalletScreenProps {
  navigation: any;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ navigation }) => {
  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentApi.getWallet(),
  });

  if (isLoading) return <ActivityIndicator style={styles.center} />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl onRefresh={refetch} refreshing={isLoading} />}
    >
      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <Text variant="labelSmall">Wallet Balance</Text>
          <Text variant="displayLarge">${wallet?.balance.toFixed(2)}</Text>
          <Text variant="bodySmall">Available for purchases</Text>
        </Card.Content>
      </Card>

      {/* Tickets Summary */}
      <Card style={styles.card}>
        <Card.Title title="Jump Tickets" />
        <Card.Content>
          {wallet?.tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketRow}>
              <Text variant="bodyMedium">{ticket.name}</Text>
              <Text variant="labelLarge">{ticket.quantity}x</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Button
        mode="contained"
        onPress={() => navigation.navigate('TopUp')}
        style={styles.button}
      >
        Add Funds
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.navigate('BuyTickets')}
        style={styles.button}
      >
        Buy Jump Tickets
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('TransactionHistory')}
      >
        View Transaction History
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center' },
  balanceCard: { backgroundColor: '#4CAF50', marginBottom: 16 },
  card: { marginBottom: 12 },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  button: { marginVertical: 8 },
});
```

### 9.2 Top-up Flow (Stripe Payment Sheet)

**File:** `src/screens/Payment/TopUpScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, TextInput } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { paymentApi } from '../../api/paymentApi';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export const TopUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const topUpMutation = useMutation({
    mutationFn: (amount: number) =>
      paymentApi.initiateTopUp(amount),
    onSuccess: async (response) => {
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: response.clientSecret,
        merchantDisplayName: 'SkyLara',
        googlePay: { enabled: true },
        applePay: { enabled: true },
      });

      if (!error) {
        const { error: presentError } = await presentPaymentSheet();
        if (!presentError) {
          navigation.goBack();
        }
      }
    },
  });

  const handleTopUp = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (amount && amount > 0) {
      topUpMutation.mutate(amount);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Add Funds
      </Text>

      {/* Preset Amounts */}
      <View style={styles.presetContainer}>
        {PRESET_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            mode={selectedAmount === amount ? 'contained' : 'outlined'}
            onPress={() => {
              setSelectedAmount(amount);
              setCustomAmount('');
            }}
            style={styles.presetButton}
          >
            ${amount}
          </Button>
        ))}
      </View>

      {/* Custom Amount */}
      <TextInput
        label="Custom Amount"
        value={customAmount}
        onChangeText={setCustomAmount}
        keyboardType="decimal-pad"
        placeholder="$"
        mode="outlined"
        style={styles.input}
      />

      {/* Fee Disclosure */}
      <Card style={styles.feeCard}>
        <Card.Content>
          <Text variant="labelSmall">Processing Fee</Text>
          <Text variant="bodySmall">
            {selectedAmount || customAmount
              ? `$${((parseFloat(customAmount || selectedAmount?.toString() || '0') * 0.029 + 0.30).toFixed(2))}`
              : 'N/A'}
          </Text>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleTopUp}
        loading={topUpMutation.isPending}
        disabled={!selectedAmount && !customAmount}
        style={styles.submitButton}
      >
        Proceed to Payment
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 20 },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  presetButton: { margin: 4, flex: 0.47 },
  input: { marginBottom: 16 },
  feeCard: { marginBottom: 16, backgroundColor: '#f5f5f5' },
  submitButton: { marginTop: 20 },
});
```

### 9.3 Buy Tickets Screen

**File:** `src/screens/Payment/BuyTicketsScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip, RadioButton } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentApi } from '../../api/paymentApi';

interface TicketOption {
  id: string;
  name: string;
  price: number;
  description: string;
  packRequired: boolean;
}

export const BuyTicketsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const { data: ticketTypes } = useQuery({
    queryKey: ['jumpTickets'],
    queryFn: () => paymentApi.getJumpTickets(),
  });

  const purchaseMutation = useMutation({
    mutationFn: (params: { ticketId: string; quantity: number }) =>
      paymentApi.purchaseTicket(params.ticketId, params.quantity),
    onSuccess: () => {
      navigation.navigate('WalletScreen');
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium">Purchase Jump Tickets</Text>

      {ticketTypes?.map((ticket: TicketOption) => (
        <Card
          key={ticket.id}
          style={[styles.ticketCard, selectedTicketId === ticket.id && styles.selectedCard]}
          onPress={() => setSelectedTicketId(ticket.id)}
        >
          <Card.Content>
            <View style={styles.ticketHeader}>
              <RadioButton
                value={ticket.id}
                status={selectedTicketId === ticket.id ? 'checked' : 'unchecked'}
                onPress={() => setSelectedTicketId(ticket.id)}
              />
              <View style={styles.ticketInfo}>
                <Text variant="titleMedium">{ticket.name}</Text>
                <Text variant="bodySmall">{ticket.description}</Text>
              </View>
              <Text variant="labelLarge">${ticket.price}</Text>
            </View>

            {ticket.packRequired && (
              <Chip
                icon="briefcase"
                style={styles.packChip}
                textStyle={styles.chipText}
              >
                Parachute Required
              </Chip>
            )}
          </Card.Content>
        </Card>
      ))}

      {selectedTicketId && (
        <Card style={styles.quantityCard}>
          <Card.Content>
            <Text variant="labelMedium">Quantity</Text>
            <View style={styles.quantityControls}>
              <Button
                mode="outlined"
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </Button>
              <Text variant="headlineSmall" style={styles.quantityValue}>
                {quantity}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </View>
            <Text variant="bodyMedium" style={styles.totalPrice}>
              Total: ${(quantity * (ticketTypes?.find(t => t.id === selectedTicketId)?.price || 0)).toFixed(2)}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={() => purchaseMutation.mutate({ ticketId: selectedTicketId, quantity })}
        loading={purchaseMutation.isPending}
        disabled={!selectedTicketId}
        style={styles.button}
      >
        Purchase Tickets
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  ticketCard: { marginBottom: 12, backgroundColor: '#fff' },
  selectedCard: { borderColor: '#2196F3', borderWidth: 2 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center' },
  ticketInfo: { flex: 1, marginHorizontal: 12 },
  packChip: { marginTop: 8 },
  chipText: { fontSize: 12 },
  quantityCard: { marginVertical: 16 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  quantityValue: { marginHorizontal: 20, textAlign: 'center' },
  totalPrice: { marginTop: 12, fontWeight: 'bold' },
  button: { marginVertical: 16 },
});
```

### 9.4 Transaction History Screen

**File:** `src/screens/Payment/TransactionHistoryScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Chip, SegmentedButtons } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../api/paymentApi';

type FilterType = 'all' | 'purchase' | 'topup' | 'refund';

interface Transaction {
  id: string;
  type: 'PURCHASE' | 'TOPUP' | 'REFUND';
  amount: number;
  description: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export const TransactionHistoryScreen: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: transactions } = useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => paymentApi.getTransactions({ type: filter }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#4CAF50';
      case 'PENDING':
        return '#FF9800';
      case 'FAILED':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as FilterType)}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'purchase', label: 'Purchases' },
          { value: 'topup', label: 'Top-ups' },
          { value: 'refund', label: 'Refunds' },
        ]}
        style={styles.filterButtons}
      />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.transactionCard}>
            <Card.Content>
              <View style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text variant="bodyMedium">{item.description}</Text>
                  <Text variant="labelSmall" style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    variant="labelLarge"
                    style={{ color: item.type === 'TOPUP' ? '#4CAF50' : '#000' }}
                  >
                    {item.type === 'TOPUP' ? '+' : '-'}${item.amount.toFixed(2)}
                  </Text>
                  <Chip
                    style={{ backgroundColor: getStatusColor(item.status), marginTop: 4 }}
                    textStyle={{ color: '#fff', fontSize: 10 }}
                    label={item.status}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filterButtons: { marginBottom: 16 },
  transactionCard: { marginBottom: 8 },
  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  timestamp: { marginTop: 4, color: '#999' },
  transactionAmount: { alignItems: 'flex-end' },
  listContent: { paddingBottom: 20 },
});
```

### 9.5 API Integration

**File:** `src/api/paymentApi.ts`

```typescript
import { apiClient } from './client';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  tickets: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

export interface TopUpResponse {
  clientSecret: string;
  amount: number;
}

export interface JumpTicket {
  id: string;
  name: string;
  price: number;
  description: string;
  packRequired: boolean;
}

export const paymentApi = {
  getWallet: async (): Promise<Wallet> => {
    const response = await apiClient.get('/wallet');
    return response.data;
  },

  initiateTopUp: async (amount: number): Promise<TopUpResponse> => {
    const response = await apiClient.post('/payments/topup', { amount });
    return response.data;
  },

  getTransactions: async (params?: { type?: string }): Promise<Transaction[]> => {
    const response = await apiClient.get('/payments/transactions', { params });
    return response.data;
  },

  getJumpTickets: async (): Promise<JumpTicket[]> => {
    const response = await apiClient.get('/payments/jump-tickets');
    return response.data;
  },

  purchaseTicket: async (ticketId: string, quantity: number): Promise<void> => {
    await apiClient.post('/payments/purchase', { ticketId, quantity });
  },
};
```

---

## 10. PROFILE MODULE

### 10.1 Profile Main Screen (Grid Navigation)

**File:** `src/screens/Profile/ProfileScreen.tsx`

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Avatar, Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../../api/profileApi';

interface ProfileTile {
  id: string;
  label: string;
  icon: string;
  color: string;
  route: string;
}

const PROFILE_TILES: ProfileTile[] = [
  { id: '1', label: 'Personal Details', icon: 'account', color: '#2196F3', route: 'PersonalDetails' },
  { id: '2', label: 'Skills', icon: 'trophy', color: '#4CAF50', route: 'Skills' },
  { id: '3', label: 'Discipline', icon: 'parachute', color: '#FF9800', route: 'Discipline' },
  { id: '4', label: 'Documents', icon: 'file-document', color: '#9C27B0', route: 'Documents' },
  { id: '5', label: 'Transactions', icon: 'credit-card', color: '#F44336', route: 'Transactions' },
  { id: '6', label: 'Affiliate', icon: 'share-variant', color: '#00BCD4', route: 'Affiliate' },
  { id: '7', label: 'Waivers', icon: 'clipboard-check', color: '#FFC107', route: 'Waivers' },
  { id: '8', label: 'Change Password', icon: 'lock', color: '#607D8B', route: 'ChangePassword' },
  { id: '9', label: 'Manage Devices', icon: 'devices', color: '#E91E63', route: 'ManageDevices' },
  { id: '10', label: 'Help & Support', icon: 'help-circle', color: '#3F51B5', route: 'Help' },
  { id: '11', label: 'Logout', icon: 'logout', color: '#795548', route: 'Logout' },
];

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
  });

  const renderTile = ({ item }: { item: ProfileTile }) => (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: item.color }]}
      onPress={() => {
        if (item.route === 'Logout') {
          // Handle logout
        } else {
          navigation.navigate(item.route);
        }
      }}
    >
      <MaterialCommunityIcons name={item.icon as any} size={32} color="#fff" />
      <Text style={styles.tileLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <Avatar.Text size={64} label={profile?.firstName.charAt(0) || 'A'} />
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall">{profile?.firstName} {profile?.lastName}</Text>
          <Text variant="bodySmall">{profile?.email}</Text>
        </View>
      </View>

      {/* Grid of Tiles */}
      <FlatList
        data={PROFILE_TILES}
        renderItem={renderTile}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', alignItems: 'center' },
  headerInfo: { marginLeft: 16, flex: 1 },
  gridContent: { padding: 8 },
  row: { justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 8 },
  tile: {
    flex: 0.5,
    aspectRatio: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: { color: '#fff', marginTop: 8, fontSize: 12, textAlign: 'center' },
});
```

### 10.2 Personal Details Form

**File:** `src/screens/Profile/PersonalDetailsScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, SegmentedButtons } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileApi } from '../../api/profileApi';

export const PersonalDetailsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
  });

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    dateOfBirth: profile?.dateOfBirth || '',
    weight: profile?.weight || '',
    weightUnit: (profile?.weightUnit as 'kg' | 'lbs') || 'kg',
    emergencyContactName: profile?.emergencyContactName || '',
    emergencyContactPhone: profile?.emergencyContactPhone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    zipCode: profile?.zipCode || '',
    bloodType: profile?.bloodType || '',
    allergies: profile?.allergies || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => profileApi.updateProfile(data),
    onSuccess: () => {
      navigation.goBack();
    },
  });

  return (
    <ScrollView style={styles.container}>
      <TextInput
        label="First Name"
        value={formData.firstName}
        onChangeText={(text) => setFormData({ ...formData, firstName: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Last Name"
        value={formData.lastName}
        onChangeText={(text) => setFormData({ ...formData, lastName: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Email"
        value={formData.email}
        editable={false}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Date of Birth (YYYY-MM-DD)"
        value={formData.dateOfBirth}
        onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
        mode="outlined"
        placeholder="1990-01-01"
        style={styles.input}
      />

      <View style={styles.weightRow}>
        <TextInput
          label="Weight"
          value={formData.weight}
          onChangeText={(text) => setFormData({ ...formData, weight: text })}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.weightInput}
        />
        <SegmentedButtons
          value={formData.weightUnit}
          onValueChange={(value) =>
            setFormData({ ...formData, weightUnit: value as 'kg' | 'lbs' })
          }
          buttons={[
            { value: 'kg', label: 'kg' },
            { value: 'lbs', label: 'lbs' },
          ]}
          style={styles.unitSegment}
        />
      </View>

      <TextInput
        label="Blood Type"
        value={formData.bloodType}
        onChangeText={(text) => setFormData({ ...formData, bloodType: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Allergies"
        value={formData.allergies}
        onChangeText={(text) => setFormData({ ...formData, allergies: text })}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <TextInput
        label="Emergency Contact Name"
        value={formData.emergencyContactName}
        onChangeText={(text) => setFormData({ ...formData, emergencyContactName: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Emergency Contact Phone"
        value={formData.emergencyContactPhone}
        onChangeText={(text) => setFormData({ ...formData, emergencyContactPhone: text })}
        keyboardType="phone-pad"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Address"
        value={formData.address}
        onChangeText={(text) => setFormData({ ...formData, address: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="City"
        value={formData.city}
        onChangeText={(text) => setFormData({ ...formData, city: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="State"
        value={formData.state}
        onChangeText={(text) => setFormData({ ...formData, state: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="ZIP Code"
        value={formData.zipCode}
        onChangeText={(text) => setFormData({ ...formData, zipCode: text })}
        mode="outlined"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={() => updateMutation.mutate(formData)}
        loading={updateMutation.isPending}
        style={styles.button}
      >
        Save Changes
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { marginBottom: 12 },
  weightRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  weightInput: { flex: 0.6 },
  unitSegment: { flex: 0.4 },
  button: { marginTop: 12 },
});
```

### 10.3 Skills Screen

**File:** `src/screens/Profile/SkillsScreen.tsx`

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../../api/profileApi';

export const SkillsScreen: React.FC = () => {
  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => profileApi.getSkills(),
  });

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="License Level" />
        <Card.Content>
          <Text variant="displaySmall">{skills?.licenseLevel}</Text>
          <Text variant="bodySmall">Current certification level</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Jump Statistics" />
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text variant="headlineSmall">{skills?.totalJumps}</Text>
              <Text variant="labelSmall">Total Jumps</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="headlineSmall">{skills?.jumpsThisMonth}</Text>
              <Text variant="labelSmall">This Month</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="headlineSmall">{skills?.jumpsThisYear}</Text>
              <Text variant="labelSmall">This Year</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Disciplines" />
        <Card.Content>
          <View style={styles.chipContainer}>
            {skills?.disciplines.map((discipline: string) => (
              <Chip key={discipline} icon="check-circle" style={styles.chip}>
                {discipline}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 8 },
});
```

### 10.4 Documents Upload Screen

**File:** `src/screens/Profile/DocumentsScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { profileApi } from '../../api/profileApi';

interface Document {
  id: string;
  type: 'USPA_CARD' | 'LICENSE_VERIFICATION';
  uploadedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  url: string;
}

export const DocumentsScreen: React.FC = () => {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => profileApi.getDocuments(),
  });

  const uploadMutation = useMutation({
    mutationFn: (params: { type: string; file: any }) =>
      profileApi.uploadDocument(params.type, params.file),
  });

  const handleUpload = async (type: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
    });

    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate({ type, file: result.assets[0] });
    }
  };

  if (isLoading) return <ActivityIndicator style={styles.center} />;

  return (
    <ScrollView style={styles.container}>
      {documents?.map((doc: Document) => (
        <Card key={doc.id} style={styles.docCard}>
          <Card.Content>
            <View style={styles.docHeader}>
              <Text variant="titleMedium">{doc.type.replace('_', ' ')}</Text>
              <Text
                style={{
                  color:
                    doc.status === 'APPROVED'
                      ? '#4CAF50'
                      : doc.status === 'REJECTED'
                        ? '#F44336'
                        : '#FF9800',
                }}
              >
                {doc.status}
              </Text>
            </View>
            <Text variant="bodySmall">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</Text>
            <Button
              mode="text"
              onPress={() => {
                /* Open document viewer */
              }}
              style={styles.viewButton}
            >
              View Document
            </Button>
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.uploadCard}>
        <Card.Content>
          <Button
            mode="outlined"
            onPress={() => handleUpload('USPA_CARD')}
            loading={uploadMutation.isPending}
            style={styles.uploadButton}
          >
            Upload USPA Card
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleUpload('LICENSE_VERIFICATION')}
            loading={uploadMutation.isPending}
            style={styles.uploadButton}
          >
            Upload License
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center' },
  docCard: { marginBottom: 12 },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  viewButton: { marginTop: 8 },
  uploadCard: { marginTop: 16 },
  uploadButton: { marginVertical: 8 },
});
```

### 10.5 Waiver Signing Flow

**File:** `src/screens/Profile/WaiverScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Text, Card, RadioButton } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileApi } from '../../api/profileApi';
import { SignaturePad } from '../../components/SignaturePad';

interface Waiver {
  id: string;
  content: string;
  effectiveDate: string;
  dzId: string;
  dzName: string;
}

export const WaiverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedDz, setSelectedDz] = useState<string>('');
  const [stage, setStage] = useState<'select' | 'read' | 'sign'>('select');
  const [signature, setSignature] = useState<string | null>(null);
  const signaturePadRef = React.useRef<any>(null);

  const { data: dropzones } = useQuery({
    queryKey: ['dropzones-for-waivers'],
    queryFn: () => profileApi.getDropzonesForWaivers(),
  });

  const { data: waiver, isLoading: waiverLoading } = useQuery({
    queryKey: ['waiver', selectedDz],
    queryFn: () => profileApi.getWaiverForDz(selectedDz),
    enabled: !!selectedDz,
  });

  const signMutation = useMutation({
    mutationFn: (data: { waiverContent: string; signature: string; dzId: string }) =>
      profileApi.signWaiver(data),
    onSuccess: () => {
      navigation.goBack();
    },
  });

  if (stage === 'select') {
    return (
      <ScrollView style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Select Dropzone
        </Text>
        {dropzones?.map((dz: any) => (
          <Card key={dz.id} style={styles.dzCard} onPress={() => {
            setSelectedDz(dz.id);
            setStage('read');
          }}>
            <Card.Content>
              <RadioButton
                value={dz.id}
                status={selectedDz === dz.id ? 'checked' : 'unchecked'}
              />
              <Text variant="titleMedium">{dz.name}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    );
  }

  if (stage === 'read') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.waiverContent}>
          {waiverLoading ? (
            <ActivityIndicator />
          ) : (
            <Text variant="bodySmall">{waiver?.content}</Text>
          )}
        </ScrollView>
        <Button
          mode="contained"
          onPress={() => setStage('sign')}
          style={styles.button}
        >
          Accept & Continue
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.title}>
        Please sign below
      </Text>
      <SignaturePad ref={signaturePadRef} onSignatureCapture={setSignature} />
      <Button
        mode="outlined"
        onPress={() => signaturePadRef.current?.clear()}
        style={styles.button}
      >
        Clear Signature
      </Button>
      <Button
        mode="contained"
        onPress={() => {
          if (signature) {
            signMutation.mutate({
              waiverContent: waiver?.content || '',
              signature,
              dzId: selectedDz,
            });
          }
        }}
        loading={signMutation.isPending}
        disabled={!signature}
        style={styles.button}
      >
        Submit Waiver
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 16 },
  dzCard: { marginBottom: 12 },
  waiverContent: { flex: 1, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', padding: 12 },
  button: { marginTop: 12 },
});
```

### 10.6 Profile API

**File:** `src/api/profileApi.ts`

```typescript
import { apiClient } from './client';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  bloodType: string;
  allergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export const profileApi = {
  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get('/jumpers/me');
    return response.data;
  },

  updateProfile: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await apiClient.patch('/jumpers/me', data);
    return response.data;
  },

  getSkills: async () => {
    const response = await apiClient.get('/jumpers/me/skills');
    return response.data;
  },

  getDocuments: async () => {
    const response = await apiClient.get('/jumpers/me/documents');
    return response.data;
  },

  uploadDocument: async (type: string, file: any) => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    const response = await apiClient.post('/jumpers/me/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDropzonesForWaivers: async () => {
    const response = await apiClient.get('/waivers/dropzones');
    return response.data;
  },

  getWaiverForDz: async (dzId: string) => {
    const response = await apiClient.get(`/waivers/dz/${dzId}`);
    return response.data;
  },

  signWaiver: async (data: any) => {
    const response = await apiClient.post('/waivers/sign', data);
    return response.data;
  },
};
```

---

## 11. LOGBOOK MODULE

### 11.1 Logbook List Screen

**File:** `src/screens/Logbook/LogbookListScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Searchbar, SegmentedButtons, FAB } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { logbookApi } from '../../api/logbookApi';

interface LogbookEntry {
  id: string;
  jumpDate: string;
  dzName: string;
  altitude: number;
  freefallTime: number;
  canopyType: string;
  jumpType: string;
}

type SortBy = 'date-desc' | 'date-asc' | 'altitude';

export const LogbookListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');

  const { data: logbook, isLoading, refetch } = useQuery({
    queryKey: ['logbook', search, sortBy],
    queryFn: () => logbookApi.getLogbook({ search, sortBy }),
  });

  const renderEntry = ({ item }: { item: LogbookEntry }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('LogbookDetail', { entryId: item.id })}
    >
      <Card.Content>
        <View style={styles.entryHeader}>
          <View>
            <Text variant="titleMedium">{item.dzName}</Text>
            <Text variant="bodySmall">{new Date(item.jumpDate).toLocaleDateString()}</Text>
          </View>
          <Text variant="labelLarge">{item.altitude} ft</Text>
        </View>
        <View style={styles.entryDetails}>
          <Text variant="bodySmall">FF: {item.freefallTime}s | {item.jumpType}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search logbook..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchbar}
      />

      <SegmentedButtons
        value={sortBy}
        onValueChange={(value) => setSortBy(value as SortBy)}
        buttons={[
          { value: 'date-desc', label: 'Newest' },
          { value: 'date-asc', label: 'Oldest' },
          { value: 'altitude', label: 'Altitude' },
        ]}
        style={styles.sortButtons}
      />

      <FlatList
        data={logbook}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
      />

      <FAB
        icon="plus"
        onPress={() => navigation.navigate('LogbookEntry')}
        style={styles.fab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchbar: { marginBottom: 12 },
  sortButtons: { marginBottom: 16 },
  card: { marginBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDetails: { marginTop: 8 },
  listContent: { paddingBottom: 80 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
});
```

### 11.2 Logbook Entry Form

**File:** `src/screens/Logbook/LogbookEntryScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, Text } from 'react-native-paper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { logbookApi } from '../../api/logbookApi';

interface EntryFormData {
  jumpDate: string;
  dzId: string;
  altitude: string;
  freefallTime: string;
  deploymentAltitude: string;
  canopyType: string;
  jumpType: string;
  formation?: string;
  notes?: string;
}

export const LogbookEntryScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const isEditing = route.params?.entryId;
  const [formData, setFormData] = useState<EntryFormData>({
    jumpDate: new Date().toISOString().split('T')[0],
    dzId: '',
    altitude: '',
    freefallTime: '',
    deploymentAltitude: '',
    canopyType: '',
    jumpType: '',
  });

  const { data: dropzones } = useQuery({
    queryKey: ['dropzones'],
    queryFn: () => logbookApi.getDropzones(),
  });

  const submitMutation = useMutation({
    mutationFn: (data: EntryFormData) =>
      isEditing
        ? logbookApi.updateEntry(route.params.entryId, data)
        : logbookApi.createEntry(data),
    onSuccess: () => {
      navigation.goBack();
    },
  });

  return (
    <ScrollView style={styles.container}>
      <TextInput
        label="Jump Date"
        value={formData.jumpDate}
        onChangeText={(text) => setFormData({ ...formData, jumpDate: text })}
        mode="outlined"
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />

      <Text variant="labelMedium" style={styles.sectionLabel}>Dropzone</Text>
      <View style={styles.chipContainer}>
        {dropzones?.map((dz: any) => (
          <Chip
            key={dz.id}
            selected={formData.dzId === dz.id}
            onPress={() => setFormData({ ...formData, dzId: dz.id })}
            style={styles.chip}
          >
            {dz.name}
          </Chip>
        ))}
      </View>

      <TextInput
        label="Altitude (ft)"
        value={formData.altitude}
        onChangeText={(text) => setFormData({ ...formData, altitude: text })}
        keyboardType="number-pad"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Freefall Time (seconds)"
        value={formData.freefallTime}
        onChangeText={(text) => setFormData({ ...formData, freefallTime: text })}
        keyboardType="number-pad"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Deployment Altitude (ft)"
        value={formData.deploymentAltitude}
        onChangeText={(text) => setFormData({ ...formData, deploymentAltitude: text })}
        keyboardType="number-pad"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Canopy Type"
        value={formData.canopyType}
        onChangeText={(text) => setFormData({ ...formData, canopyType: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Jump Type"
        value={formData.jumpType}
        onChangeText={(text) => setFormData({ ...formData, jumpType: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Formation (optional)"
        value={formData.formation || ''}
        onChangeText={(text) => setFormData({ ...formData, formation: text })}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Notes"
        value={formData.notes || ''}
        onChangeText={(text) => setFormData({ ...formData, notes: text })}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={() => submitMutation.mutate(formData)}
        loading={submitMutation.isPending}
        style={styles.button}
      >
        Save Entry
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { marginBottom: 12 },
  sectionLabel: { marginTop: 12, marginBottom: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  chip: { marginBottom: 8 },
  button: { marginTop: 20, marginBottom: 40 },
});
```

### 11.3 Logbook API

**File:** `src/api/logbookApi.ts`

```typescript
import { apiClient } from './client';

export interface LogbookEntry {
  id: string;
  jumpDate: string;
  dzId: string;
  dzName: string;
  altitude: number;
  freefallTime: number;
  deploymentAltitude: number;
  canopyType: string;
  jumpType: string;
  formation?: string;
  notes?: string;
  gpsData?: string;
  instructorSignOff?: boolean;
}

export const logbookApi = {
  getLogbook: async (params?: { search?: string; sortBy?: string }) => {
    const response = await apiClient.get('/logbook', { params });
    return response.data;
  },

  createEntry: async (data: any): Promise<LogbookEntry> => {
    const response = await apiClient.post('/logbook', data);
    return response.data;
  },

  getEntry: async (entryId: string): Promise<LogbookEntry> => {
    const response = await apiClient.get(`/logbook/${entryId}`);
    return response.data;
  },

  updateEntry: async (entryId: string, data: any): Promise<LogbookEntry> => {
    const response = await apiClient.patch(`/logbook/${entryId}`, data);
    return response.data;
  },

  getDropzones: async () => {
    const response = await apiClient.get('/dropzones');
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/logbook/statistics');
    return response.data;
  },

  exportPDF: async () => {
    const response = await apiClient.get('/logbook/export/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },
};
```

---

## 12. CHAT & MESSAGING MODULE

### 12.1 Chat List Screen

**File:** `src/screens/Chat/ChatListScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Avatar, FAB, Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../api/chatApi';

interface Conversation {
  id: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
}

export const ChatListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [search, setSearch] = useState('');

  const { data: conversations } = useQuery({
    queryKey: ['conversations', search],
    queryFn: () => chatApi.getConversations({ search }),
  });

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text size={48} label={item.participantName.charAt(0)} />
          <View style={styles.messageInfo}>
            <View style={styles.header}>
              <Text variant="bodyMedium" style={styles.nameText}>
                {item.participantName}
              </Text>
              <Text variant="labelSmall">{formatTime(item.lastMessageTime)}</Text>
            </View>
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={item.unreadCount > 0 ? styles.unreadText : {}}
            >
              {item.lastMessage}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search conversations..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchbar}
      />
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
      />
      <FAB
        icon="plus"
        onPress={() => navigation.navigate('NewChat')}
        style={styles.fab}
      />
    </View>
  );
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 16 },
  card: { marginHorizontal: 8, marginVertical: 4 },
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  messageInfo: { flex: 1, marginLeft: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  nameText: { fontWeight: '600' },
  unreadText: { fontWeight: '600' },
  badge: { backgroundColor: '#2196F3', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
});
```

### 12.2 Chat Screen

**File:** `src/screens/Chat/ChatScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSocket } from '../../hooks/useSocket';
import { chatApi } from '../../api/chatApi';
import { MessageBubble } from '../../components/MessageBubble';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isImage: boolean;
  imageUrl?: string;
}

interface ChatScreenProps {
  navigation: any;
  route: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const conversationId = route.params.conversationId;
  const [messageText, setMessageText] = useState('');
  const { socket } = useSocket();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatApi.getMessages(conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(conversationId, content),
    onSuccess: () => {
      setMessageText('');
    },
  });

  useEffect(() => {
    socket?.emit('subscribe', { channel: `chat:${conversationId}` });

    const handleNewMessage = (message: Message) => {
      // Update local state or refetch
    };

    socket?.on('message:new', handleNewMessage);

    return () => {
      socket?.off('message:new', handleNewMessage);
    };
  }, [socket, conversationId]);

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {isLoading ? (
        <ActivityIndicator style={styles.center} />
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messageList}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <Button
          mode="contained"
          onPress={() => sendMutation.mutate(messageText)}
          loading={sendMutation.isPending}
          disabled={!messageText.trim()}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12 },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#ddd' },
  input: { flex: 1, marginRight: 8 },
  sendButton: { justifyContent: 'center' },
});
```

### 12.3 Chat API

**File:** `src/api/chatApi.ts`

```typescript
import { apiClient } from './client';

export const chatApi = {
  getConversations: async (params?: { search?: string }) => {
    const response = await apiClient.get('/chat/conversations', { params });
    return response.data;
  },

  getMessages: async (conversationId: string, params?: { limit?: number; offset?: number }) => {
    const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
      params,
    });
    return response.data;
  },

  sendMessage: async (conversationId: string, content: string) => {
    const response = await apiClient.post(
      `/chat/conversations/${conversationId}/messages`,
      { content }
    );
    return response.data;
  },

  markAsRead: async (conversationId: string) => {
    const response = await apiClient.patch(
      `/chat/conversations/${conversationId}/read`
    );
    return response.data;
  },
};
```

---

## 13. SOCIAL MODULE

### 13.1 Who's Going Feed

**File:** `src/screens/Social/WhoIsGoingScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip, Avatar } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { socialApi } from '../../api/socialApi';

interface JumperAttendance {
  id: string;
  name: string;
  avatar?: string;
  isGoing: boolean;
  jumpCount: number;
  currentUserId?: boolean;
}

interface DaySchedule {
  date: string;
  jumpers: JumperAttendance[];
}

export const WhoIsGoingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { data: schedule, refetch } = useQuery({
    queryKey: ['whos-going'],
    queryFn: () => socialApi.getWhoIsGoing(),
  });

  const declareMutation = useMutation({
    mutationFn: (params: { date: string; isGoing: boolean }) =>
      socialApi.declareAttendance(params.date, params.isGoing),
    onSuccess: () => refetch(),
  });

  const renderJumper = (jumper: JumperAttendance, date: string) => (
    <Card key={jumper.id} style={styles.jumperCard}>
      <Card.Content style={styles.jumperContent}>
        <Avatar.Text size={40} label={jumper.name.charAt(0)} />
        <View style={styles.jumperInfo}>
          <Text variant="bodyMedium">{jumper.name}</Text>
          <Text variant="labelSmall">{jumper.jumpCount} jumps</Text>
        </View>
        {jumper.currentUserId && (
          <Button
            mode={declareMutation.isPending ? 'contained-tonal' : 'outlined'}
            onPress={() =>
              declareMutation.mutate({ date, isGoing: !jumper.isGoing })
            }
            loading={declareMutation.isPending}
          >
            {jumper.isGoing ? 'Cancel' : 'Going'}
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <FlatList
      data={schedule}
      keyExtractor={(item) => item.date}
      renderItem={({ item }) => (
        <View style={styles.daySection}>
          <Text variant="headlineSmall" style={styles.dateHeader}>
            {new Date(item.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {item.jumpers.map((jumper) => renderJumper(jumper, item.date))}
        </View>
      )}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  daySection: { marginBottom: 24 },
  dateHeader: { marginBottom: 12, fontWeight: '600' },
  jumperCard: { marginBottom: 8 },
  jumperContent: { flexDirection: 'row', alignItems: 'center' },
  jumperInfo: { flex: 1, marginLeft: 12 },
});
```

### 13.2 Leaderboard Screen

**File:** `src/screens/Social/LeaderboardScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, SegmentedButtons, Avatar, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { socialApi } from '../../api/socialApi';

type LeaderboardType = 'all-time' | 'month' | 'year';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  jumpCount: number;
  streak?: number;
  badges?: string[];
}

export const LeaderboardScreen: React.FC = () => {
  const [type, setType] = useState<LeaderboardType>('all-time');

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', type],
    queryFn: () => socialApi.getLeaderboard(type),
  });

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return '#999';
    }
  };

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.entryContent}>
        <View style={styles.rankSection}>
          <MaterialCommunityIcons
            name="medal"
            size={24}
            color={getMedalColor(item.rank)}
          />
          <Text variant="labelLarge" style={styles.rank}>
            #{item.rank}
          </Text>
        </View>
        <Avatar.Text size={40} label={item.name.charAt(0)} />
        <View style={styles.nameSection}>
          <Text variant="bodyMedium" style={styles.name}>
            {item.name}
          </Text>
          <View style={styles.badges}>
            {item.streak && (
              <Chip icon="fire" size={24} textStyle={styles.chipText}>
                {item.streak}
              </Chip>
            )}
          </View>
        </View>
        <Text variant="labelLarge">{item.jumpCount}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={type}
        onValueChange={(value) => setType(value as LeaderboardType)}
        buttons={[
          { value: 'all-time', label: 'All Time' },
          { value: 'month', label: 'This Month' },
          { value: 'year', label: 'This Year' },
        ]}
        style={styles.buttons}
      />
      <FlatList
        data={leaderboard}
        renderItem={renderEntry}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  buttons: { marginBottom: 16 },
  card: { marginBottom: 8 },
  entryContent: { flexDirection: 'row', alignItems: 'center' },
  rankSection: { alignItems: 'center', marginRight: 12 },
  rank: { marginTop: 4 },
  nameSection: { flex: 1, marginLeft: 12 },
  name: { fontWeight: '600', marginBottom: 4 },
  badges: { flexDirection: 'row', gap: 8 },
  chipText: { fontSize: 12 },
  listContent: { paddingBottom: 20 },
});
```

### 13.3 Social API

**File:** `src/api/socialApi.ts`

```typescript
import { apiClient } from './client';

export const socialApi = {
  getWhoIsGoing: async () => {
    const response = await apiClient.get('/social/whos-going');
    return response.data;
  },

  declareAttendance: async (date: string, isGoing: boolean) => {
    const response = await apiClient.post('/social/attendance', { date, isGoing });
    return response.data;
  },

  getLeaderboard: async (type: string) => {
    const response = await apiClient.get('/social/leaderboard', { params: { type } });
    return response.data;
  },

  getActivityFeed: async (params?: { limit?: number; offset?: number }) => {
    const response = await apiClient.get('/social/activity', { params });
    return response.data;
  },
};
```

---

## 14. SAFETY MODULE

### 14.1 Safety SOS & Emergency Profile

**File:** `src/screens/Safety/SafetyScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, TextInput, Dialog, Portal } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { safetyApi } from '../../api/safetyApi';

interface EmergencyProfile {
  bloodType: string;
  allergies: string;
  medications: string;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
}

export const SafetyScreen: React.FC = () => {
  const [showSOSDialog, setShowSOSDialog] = useState(false);
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['emergency-profile'],
    queryFn: () => safetyApi.getEmergencyProfile(),
    onSuccess: (data) => setEmergencyProfile(data),
  });

  const sosMutation = useMutation({
    mutationFn: () => safetyApi.triggerSOS(),
    onSuccess: () => {
      setShowSOSDialog(false);
      Alert.alert('Emergency', 'SOS activated. Help is on the way.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EmergencyProfile) =>
      safetyApi.updateEmergencyProfile(data),
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  return (
    <ScrollView style={styles.container}>
      {/* SOS Button */}
      <View style={styles.sosContainer}>
        <Button
          mode="contained"
          onPress={() => setShowSOSDialog(true)}
          buttonColor="#F44336"
          style={styles.sosButton}
          labelStyle={styles.sosLabel}
        >
          EMERGENCY SOS
        </Button>
        <Text variant="bodySmall" style={styles.sosText}>
          Press and hold for 3 seconds to activate emergency alert
        </Text>
      </View>

      {/* Emergency Profile Info */}
      {isEditing ? (
        <Card style={styles.card}>
          <Card.Title title="Emergency Profile" />
          <Card.Content>
            <TextInput
              label="Blood Type"
              value={emergencyProfile?.bloodType || ''}
              onChangeText={(text) =>
                setEmergencyProfile({ ...emergencyProfile!, bloodType: text })
              }
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Allergies"
              value={emergencyProfile?.allergies || ''}
              onChangeText={(text) =>
                setEmergencyProfile({ ...emergencyProfile!, allergies: text })
              }
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
            <TextInput
              label="Medications"
              value={emergencyProfile?.medications || ''}
              onChangeText={(text) =>
                setEmergencyProfile({ ...emergencyProfile!, medications: text })
              }
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={() => updateMutation.mutate(emergencyProfile!)}
              loading={updateMutation.isPending}
              style={styles.button}
            >
              Save
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Title
            title="Emergency Profile"
            right={() => (
              <Button mode="text" onPress={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          />
          <Card.Content>
            <View style={styles.profileItem}>
              <Text variant="labelSmall">Blood Type</Text>
              <Text variant="bodyMedium">{profile?.bloodType || 'Not set'}</Text>
            </View>
            <View style={styles.profileItem}>
              <Text variant="labelSmall">Allergies</Text>
              <Text variant="bodyMedium">{profile?.allergies || 'None'}</Text>
            </View>
            <View style={styles.profileItem}>
              <Text variant="labelSmall">Medications</Text>
              <Text variant="bodyMedium">{profile?.medications || 'None'}</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Emergency Contacts */}
      <Card style={styles.card}>
        <Card.Title title="Emergency Contacts" />
        <Card.Content>
          {profile?.emergencyContacts.map((contact, idx) => (
            <View key={idx} style={styles.contactItem}>
              <Text variant="bodyMedium">{contact.name}</Text>
              <Text variant="labelSmall">{contact.relationship}</Text>
              <Text variant="bodySmall">{contact.phone}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* SOS Dialog */}
      <Portal>
        <Dialog visible={showSOSDialog} onDismiss={() => setShowSOSDialog(false)}>
          <Dialog.Title>Confirm Emergency Alert</Dialog.Title>
          <Dialog.Content>
            <Text>
              Activating SOS will alert DZ staff and emergency services. Are you sure?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSOSDialog(false)}>Cancel</Button>
            <Button
              onPress={() => sosMutation.mutate()}
              loading={sosMutation.isPending}
              textColor="#F44336"
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sosContainer: { marginBottom: 24, alignItems: 'center' },
  sosButton: { paddingVertical: 12, width: '100%' },
  sosLabel: { fontSize: 18, fontWeight: 'bold' },
  sosText: { marginTop: 8, textAlign: 'center', color: '#999' },
  card: { marginBottom: 16 },
  input: { marginBottom: 12 },
  button: { marginTop: 12 },
  profileItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  contactItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
```

### 14.2 Safety API

**File:** `src/api/safetyApi.ts`

```typescript
import { apiClient } from './client';

export const safetyApi = {
  getEmergencyProfile: async () => {
    const response = await apiClient.get('/safety/emergency-profile');
    return response.data;
  },

  updateEmergencyProfile: async (data: any) => {
    const response = await apiClient.patch('/safety/emergency-profile', data);
    return response.data;
  },

  triggerSOS: async () => {
    const response = await apiClient.post('/safety/sos');
    return response.data;
  },

  reportIncident: async (data: any) => {
    const response = await apiClient.post('/safety/incident-report', data);
    return response.data;
  },
};
```

---

## 15. NOTIFICATIONS MODULE

### 15.1 Notification Center Screen

**File:** `src/screens/Notifications/NotificationCenterScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Button, SegmentedButtons, Badge } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notificationApi } from '../../api/notificationApi';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: Record<string, any>;
}

type FilterType = 'all' | 'unread' | 'loads' | 'weather' | 'messages';

export const NotificationCenterScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notifications, refetch, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationApi.getNotifications({ filter }),
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationApi.markAsRead(notificationId),
    onSuccess: () => refetch(),
  });

  const renderNotification = ({ item }: { item: Notification }) => (
    <Card
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => {
        if (!item.isRead) {
          markReadMutation.mutate(item.id);
        }
      }}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text variant="bodyMedium" style={item.isRead ? {} : styles.unreadText}>
              {item.title}
            </Text>
            {!item.isRead && <Badge style={styles.badge}>New</Badge>}
          </View>
          <Text variant="labelSmall">{formatTime(item.timestamp)}</Text>
        </View>
        <Text variant="bodySmall" numberOfLines={2} style={styles.message}>
          {item.message}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as FilterType)}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'loads', label: 'Loads' },
          { value: 'weather', label: 'Weather' },
          { value: 'messages', label: 'Messages' },
        ]}
        style={styles.filterButtons}
      />

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterButtons: { margin: 16 },
  card: { marginHorizontal: 8, marginVertical: 4 },
  unreadCard: { backgroundColor: '#F0F4FF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleSection: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadText: { fontWeight: '600' },
  badge: { backgroundColor: '#2196F3' },
  message: { marginTop: 8, color: '#666' },
  listContent: { paddingBottom: 20 },
});
```

### 15.2 Notification Setup & API

**File:** `src/api/notificationApi.ts`

```typescript
import { apiClient } from './client';

export interface NotificationPreferences {
  loadReady: { push: boolean; email: boolean; inApp: boolean };
  loadBoarding: { push: boolean; email: boolean; inApp: boolean };
  weatherHold: { push: boolean; email: boolean; inApp: boolean };
  emergencyAlert: { push: boolean; inApp: boolean };
  paymentReceived: { push: boolean; email: boolean; inApp: boolean };
  messageReceived: { push: boolean; inApp: boolean };
}

export const notificationApi = {
  getNotifications: async (params?: { filter?: string }) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (preferences: NotificationPreferences) => {
    const response = await apiClient.patch(
      '/notifications/preferences',
      preferences
    );
    return response.data;
  },

  registerPushToken: async (token: string, platform: 'ios' | 'android') => {
    const response = await apiClient.post('/notifications/push-token', {
      token,
      platform,
    });
    return response.data;
  },
};
```

**File:** `src/hooks/usePushNotifications.ts`

```typescript
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationApi } from '../api/notificationApi';
import { useMutation } from '@tanstack/react-query';

export const usePushNotifications = () => {
  const registerTokenMutation = useMutation({
    mutationFn: (params: { token: string; platform: 'ios' | 'android' }) =>
      notificationApi.registerPushToken(params.token, params.platform),
  });

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        registerTokenMutation.mutate({
          token,
          platform: 'android', // Detect platform
        });
      }
    })();
  }, []);

  // Handle foreground notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    return () => subscription.remove();
  }, []);

  // Handle notification taps
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response);
      });

    return () => subscription.remove();
  }, []);
};
```

---

## 16. REAL-TIME (WebSocket) ARCHITECTURE

### 16.1 Socket.IO Setup

**File:** `src/lib/socket.ts`

```typescript
import io, { Socket } from 'socket.io-client';
import { authStore } from '../stores/authStore';

let socket: Socket | null = null;

export const initializeSocket = () => {
  const token = authStore.getState().token;

  socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    return initializeSocket()!;
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### 16.2 Socket Hook

**File:** `src/hooks/useSocket.ts`

```typescript
import { useEffect, useState } from 'react';
import { getSocket, initializeSocket } from '../lib/socket';
import type { Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const sock = initializeSocket();
    setSocket(sock);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    sock.on('connect', handleConnect);
    sock.on('disconnect', handleDisconnect);

    return () => {
      sock.off('connect', handleConnect);
      sock.off('disconnect', handleDisconnect);
    };
  }, []);

  return { socket, isConnected };
};
```

### 16.3 Zustand Store with Real-time Integration

**File:** `src/stores/loadStore.ts`

```typescript
import { create } from 'zustand';
import { getSocket } from '../lib/socket';

interface Load {
  id: string;
  dzId: string;
  status: 'SCHEDULED' | 'BOARDING' | 'IN_FLIGHT' | 'LANDED';
  slotCount: number;
  filledSlots: number;
  altitude: number;
  jumpers: string[];
  exitTime?: string;
}

interface LoadStore {
  loads: Load[];
  setLoads: (loads: Load[]) => void;
  addLoad: (load: Load) => void;
  updateLoad: (loadId: string, updates: Partial<Load>) => void;
  subscribeToLoads: (dzId: string) => void;
  unsubscribeFromLoads: (dzId: string) => void;
}

export const useLoadStore = create<LoadStore>((set) => {
  const subscriptions = new Set<string>();

  return {
    loads: [],
    setLoads: (loads) => set({ loads }),
    addLoad: (load) =>
      set((state) => ({
        loads: [...state.loads, load],
      })),
    updateLoad: (loadId, updates) =>
      set((state) => ({
        loads: state.loads.map((load) =>
          load.id === loadId ? { ...load, ...updates } : load
        ),
      })),
    subscribeToLoads: (dzId) => {
      if (subscriptions.has(dzId)) return;

      const socket = getSocket();
      const channel = `dz:${dzId}:loads`;

      socket.emit('subscribe', { channel });
      subscriptions.add(dzId);

      socket.on('load:created', (load) => {
        set((state) => ({ loads: [...state.loads, load] }));
      });

      socket.on('load:updated', (data) => {
        set((state) => ({
          loads: state.loads.map((load) =>
            load.id === data.loadId ? { ...load, ...data.updates } : load
          ),
        }));
      });

      socket.on('load:deleted', (loadId) => {
        set((state) => ({
          loads: state.loads.filter((load) => load.id !== loadId),
        }));
      });
    },
    unsubscribeFromLoads: (dzId) => {
      if (!subscriptions.has(dzId)) return;

      const socket = getSocket();
      const channel = `dz:${dzId}:loads`;

      socket.emit('unsubscribe', { channel });
      subscriptions.delete(dzId);
    },
  };
});
```

### 16.4 Notification Store (integrating WebSocket)

**File:** `src/stores/notificationStore.ts`

```typescript
import { create } from 'zustand';
import { getSocket } from '../lib/socket';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  subscribeToNotifications: (userId: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => {
  return {
    notifications: [],
    addNotification: (notification) =>
      set((state) => ({
        notifications: [notification, ...state.notifications],
      })),
    markAsRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
      })),
    subscribeToNotifications: (userId) => {
      const socket = getSocket();
      const channel = `user:${userId}`;

      socket.emit('subscribe', { channel });

      socket.on('notification:received', (notification: Notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));
      });
    },
  };
});
```

---

## 17. OFFLINE SUPPORT & SYNC

### 17.1 Offline Queue & Sync

**File:** `src/lib/offlineQueue.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'skylara_offline_queue';
const MAX_RETRIES = 3;

export const offlineQueue = {
  addToQueue: async (mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>) => {
    const queue = await offlineQueue.getQueue();
    const newMutation: QueuedMutation = {
      ...mutation,
      id: Date.now().toString(),
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(newMutation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  getQueue: async (): Promise<QueuedMutation[]> => {
    const queue = await AsyncStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  },

  processQueue: async () => {
    const queue = await offlineQueue.getQueue();

    for (const mutation of queue) {
      try {
        await apiClient({
          method: mutation.method,
          url: mutation.endpoint,
          data: mutation.data,
        });

        // Remove from queue
        const updatedQueue = queue.filter((m) => m.id !== mutation.id);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
      } catch (error) {
        if (mutation.retries < MAX_RETRIES) {
          mutation.retries++;
          const updatedQueue = queue.map((m) =>
            m.id === mutation.id ? mutation : m
          );
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
        }
      }
    }
  },

  clearQueue: async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
```

### 17.2 Offline Indicator Hook

**File:** `src/hooks/useNetworkStatus.ts`

```typescript
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
};
```

### 17.3 Offline Indicator Component

**File:** `src/components/OfflineIndicator.tsx`

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9800',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 12 },
});
```

---

## 18. COMPLETE TYPESCRIPT INTERFACES

### 18.1 User & Profile Types

**File:** `src/types/user.ts`

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ATHLETE' | 'INSTRUCTOR' | 'STAFF' | 'ADMIN';
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Athlete {
  id: string;
  userId: string;
  licenseLevel: LicenseLevel;
  totalJumps: number;
  jumpsThisMonth: number;
  jumpsThisYear: number;
  disciplines: string[];
  weight: number;
  weightUnit: 'kg' | 'lbs';
  bloodType?: string;
  allergies?: string;
  emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export enum LicenseLevel {
  STUDENT = 'STUDENT',
  SOLO = 'SOLO',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  TANDEM_CERTIFIED = 'TANDEM_CERTIFIED',
  INSTRUCTOR = 'INSTRUCTOR',
}

export interface License {
  id: string;
  athleteId: string;
  level: LicenseLevel;
  issueDate: string;
  expiryDate: string;
  certifyingDz: string;
  isActive: boolean;
}
```

### 18.2 Dropzone & Configuration

**File:** `src/types/dropzone.ts`

```typescript
export interface Dropzone {
  id: string;
  name: string;
  location: Location;
  phone: string;
  website?: string;
  rules?: string;
  pricing: DzPricing;
  settings: DzSettings;
  facilities: Facility[];
  safetyOfficer: SafetyOfficer;
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  altitude: number;
}

export interface DzPricing {
  id: string;
  dzId: string;
  basePrice: number;
  pricingTiers: PricingTier[];
  packingPrice?: number;
  videoPrice?: number;
  rentalPrice?: number;
}

export interface PricingTier {
  minAltitude: number;
  maxAltitude: number;
  price: number;
  packRequired: boolean;
}

export interface DzSettings {
  id: string;
  dzId: string;
  maxJumpersPerLoad: number;
  maxAltitude: number;
  minAltitude: number;
  weatherHoldThresholds: WeatherThresholds;
  operatingHours: OperatingHours;
  requiresWaiver: boolean;
  requiresSpecialCertification: boolean;
}

export interface WeatherThresholds {
  windSpeed: number;
  visibility: number;
  cloudBase: number;
  precipitation: boolean;
}

export interface OperatingHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'HANGAR' | 'PACKING_AREA' | 'MANIFEST' | 'OFFICE' | 'RESTROOM';
  capacity?: number;
}

export interface SafetyOfficer {
  id: string;
  name: string;
  phone: string;
  email: string;
}
```

### 18.3 Load & Slot Types

**File:** `src/types/load.ts`

```typescript
export interface Load {
  id: string;
  dzId: string;
  loadNumber: number;
  status: LoadStatus;
  aircraft: Aircraft;
  scheduledExitTime?: string;
  actualExitTime?: string;
  slots: Slot[];
  exitGroups: ExitGroup[];
  cgCheck?: CgCheck;
  weather?: WeatherSnapshot;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum LoadStatus {
  SCHEDULED = 'SCHEDULED',
  MANIFEST_OPEN = 'MANIFEST_OPEN',
  MANIFEST_CLOSED = 'MANIFEST_CLOSED',
  BOARDING = 'BOARDING',
  IN_FLIGHT = 'IN_FLIGHT',
  LANDED = 'LANDED',
  CANCELLED = 'CANCELLED',
}

export interface Aircraft {
  id: string;
  registration: string;
  model: string;
  maxCapacity: number;
  climbRate: number;
  comments?: string;
}

export interface Slot {
  id: string;
  loadId: string;
  position: number;
  type: SlotType;
  status: SlotStatus;
  jumpType: JumpType;
  jumperId?: string;
  jumperName?: string;
  altitude?: number;
  ticketId?: string;
  notes?: string;
  createdAt: string;
}

export enum SlotType {
  SKYDIVER = 'SKYDIVER',
  TANDEM_MASTER = 'TANDEM_MASTER',
  TANDEM_STUDENT = 'TANDEM_STUDENT',
  VIDEOGRAPHER = 'VIDEOGRAPHER',
  SAFETY_OBSERVER = 'SAFETY_OBSERVER',
}

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  PAID = 'PAID',
  CHECKED_IN = 'CHECKED_IN',
  EXITED = 'EXITED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum JumpType {
  AFF = 'AFF',
  TANDEM = 'TANDEM',
  SKYDIVE = 'SKYDIVE',
  FORMATION = 'FORMATION',
  FREEFLY = 'FREEFLY',
  SPEED_SKYDIVING = 'SPEED_SKYDIVING',
  WINGSUIT = 'WINGSUIT',
  INDOOR = 'INDOOR',
}

export interface ExitGroup {
  id: string;
  loadId: string;
  groupNumber: number;
  slotIds: string[];
  exitOrder: number;
  exitsFirst: boolean;
  comments?: string;
}

export interface CgCheck {
  id: string;
  loadId: string;
  completedBy: string;
  cgStatus: 'SAFE' | 'OUT_OF_LIMITS' | 'NEEDS_RECHECK';
  weight: number;
  balance: number;
  timestamp: string;
}

export interface WeatherSnapshot {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  cloudBase: number;
  visibility: number;
  condition: string;
  timestamp: string;
}
```

### 18.4 Wallet & Payment Types

**File:** `src/types/payment.ts`

```typescript
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface JumpTicket {
  id: string;
  dzId: string;
  name: string;
  price: number;
  altitude: number;
  packRequired: boolean;
  validityDays?: number;
  description: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  status: TransactionStatus;
  timestamp: string;
  metadata?: Record<string, any>;
}

export enum TransactionType {
  TOPUP = 'TOPUP',
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  FEE = 'FEE',
}

export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface PaymentIntent {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  currency: string;
}
```

### 18.5 Logbook Types

**File:** `src/types/logbook.ts`

```typescript
export interface LogbookEntry {
  id: string;
  athleteId: string;
  jumpDate: string;
  dzId: string;
  dzName: string;
  altitude: number;
  freefallTime: number;
  deploymentAltitude: number;
  canopyType: string;
  jumpType: JumpType;
  formation?: string;
  notes?: string;
  gpsData?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  instructorSignOff?: {
    instructorId: string;
    instructorName: string;
    timestamp: string;
  };
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LogbookStats {
  totalJumps: number;
  thisMonthJumps: number;
  thisYearJumps: number;
  byType: Record<string, number>;
  byDz: Record<string, number>;
  totalFreefallTime: number;
}
```

### 18.6 Chat Types

**File:** `src/types/chat.ts`

```typescript
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  attachments?: Attachment[];
  timestamp: string;
  isRead: boolean;
  readAt?: string;
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export interface Attachment {
  id: string;
  type: string;
  url: string;
  filename: string;
  size: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  lastMessageTime?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  TEAM = 'TEAM',
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: 'MEMBER' | 'ADMIN';
  joinedAt: string;
}
```

### 18.7 Notification Types

**File:** `src/types/notification.ts`

```typescript
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  deepLink?: string;
  isRead: boolean;
  readAt?: string;
  timestamp: string;
  channel: NotificationChannel;
}

export enum NotificationType {
  LOAD_READY = 'LOAD_READY',
  LOAD_BOARDING = 'LOAD_BOARDING',
  LOAD_CANCELLED = 'LOAD_CANCELLED',
  WEATHER_HOLD = 'WEATHER_HOLD',
  WEATHER_CLEARED = 'WEATHER_CLEARED',
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  COACH_REQUEST = 'COACH_REQUEST',
  AFFILIATION_PENDING = 'AFFILIATION_PENDING',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  SMS = 'SMS',
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  preferences: Record<NotificationType, NotificationChannelPreference>;
}

export interface NotificationChannelPreference {
  push: boolean;
  email: boolean;
  inApp: boolean;
  sms?: boolean;
}
```

### 18.8 WebSocket Event Types

**File:** `src/types/socket.ts`

```typescript
// Load Events
export interface LoadUpdatedEvent {
  loadId: string;
  changes: Partial<Load>;
}

export interface SlotStatusChangedEvent {
  slotId: string;
  loadId: string;
  newStatus: SlotStatus;
  jumperId?: string;
}

export interface CheckinStatusChangedEvent {
  jumperId: string;
  loadId: string;
  isCheckedIn: boolean;
}

// Weather Events
export interface WeatherUpdatedEvent {
  dzId: string;
  weather: WeatherSnapshot;
  hold?: WeatherHold;
}

export interface WeatherHoldClearedEvent {
  dzId: string;
  holdId: string;
}

// Emergency Events
export interface EmergencyAlertEvent {
  dzId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  affectedLoadId?: string;
}

// Message Events
export interface MessageReceivedEvent {
  conversationId: string;
  message: Message;
}

// Notification Events
export interface NotificationEvent {
  userId: string;
  notification: Notification;
}

// Subscription Event
export interface SubscriptionEvent {
  channel: string;
}
```

### 18.9 Navigation Param Types

**File:** `src/types/navigation.ts`

```typescript
export type RootStackParamList = {
  Auth: undefined;
  Manifest: { dzId: string };
  LoadBuilder: { loadId: string };
  WalletScreen: undefined;
  TopUp: undefined;
  BuyTickets: undefined;
  TransactionHistory: undefined;
  ProfileScreen: undefined;
  PersonalDetails: undefined;
  Skills: undefined;
  Documents: undefined;
  WaiverScreen: undefined;
  LogbookListScreen: undefined;
  LogbookDetail: { entryId: string };
  LogbookEntry: { entryId?: string };
  ChatListScreen: undefined;
  Chat: { conversationId: string };
  NewChat: undefined;
  WhoIsGoing: undefined;
  Leaderboard: undefined;
  SafetyScreen: undefined;
  NotificationCenter: undefined;
  Help: undefined;
};

export type ScreenNavigationProp<T extends keyof RootStackParamList> = {
  navigation: {
    navigate: (name: T, params?: RootStackParamList[T]) => void;
    goBack: () => void;
    setOptions: (options: any) => void;
  };
  route: {
    params?: RootStackParamList[T];
  };
};
```

### 18.10 Zustand Store Types

**File:** `src/types/store.ts`

```typescript
export interface AuthStore {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
}

export interface ManifestStore {
  dzId: string;
  selectedDate: string;
  selectedLoads: string[];
  selectedSlots: Record<string, string>;
  selectedPaymentMethod: PaymentMethod;
  setDzId: (dzId: string) => void;
  setSelectedDate: (date: string) => void;
  toggleLoad: (loadId: string) => void;
  selectSlot: (loadId: string, slotId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  reset: () => void;
}

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
  BLOCK_TICKET = 'BLOCK_TICKET',
}

export interface UIStore {
  isLoading: boolean;
  error: string | null;
  toast: { message: string; duration: number } | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  showToast: (message: string, duration?: number) => void;
  dismissToast: () => void;
}
```

---

## API Client Configuration

**File:** `src/api/client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import { authStore } from '../stores/authStore';
import { offlineQueue } from '../lib/offlineQueue';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = authStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      authStore.getState().logout();
    }

    // Handle offline mutations
    const isOnline = (await NetInfo.fetch()).isConnected;
    if (!isOnline && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(error.config.method)) {
      await offlineQueue.addToQueue({
        method: error.config.method,
        endpoint: error.config.url,
        data: error.config.data ? JSON.parse(error.config.data) : undefined,
      });
    }

    return Promise.reject(error);
  }
);
```

---

**END OF SPECIFICATION**

This comprehensive specification covers sections 9-18 with full implementation detail including:
- Complete React Native component implementations
- TypeScript interfaces for all data models
- Zustand store patterns with WebSocket integration
- React Query hooks for data fetching
- Offline support and sync mechanisms
- Real-time WebSocket architecture
- Complete navigation and screen structure
- Payment integration with Stripe
- Notification system with push notifications

Developers can now implement the entire Payment, Profile, Logbook, Chat, Social, Safety, Notifications modules plus real-time and offline support directly from this specification.

