# SKYLARA MOBILE FUNCTIONAL WORKFLOW SPECIFICATION

## DOCUMENT HEADER

**Document Title:** SkyLara Skydiving Mobile Application - Functional Workflow Specification (Part 1: Authentication & Dashboard)

**Version:** 1.0

**Date:** 2026-04-09

**Status:** IMPLEMENTABLE SPECIFICATION

**Scope:** Complete screen-by-screen, interaction-by-interaction, API call-by-API call specification for SkyLara mobile application. This is Part 1, covering Authentication, Identity, Check-in/Check-out, Dashboard, Weather, and Load Board systems.

**Audience:** Mobile developers, backend engineers, QA testers, product stakeholders

**API Base URL:** `https://api.skylara.app/api/v1`

**WebSocket Base URL:** `wss://api.skylara.app/ws`

---

## PART 1: AUTHENTICATION & IDENTITY FLOWS

### 1.1 REGISTRATION FLOW

#### 1.1.1 Registration Start Screen (Unauthenticated)

**Screen Name:** `RegisterScreen`

**Layout Elements:**
- SkyLara logo (centered, top)
- "Create Your Account" heading
- Email input field (placeholder: "you@example.com")
- Password input field (placeholder: "••••••••", minimum 8 characters, show/hide toggle)
- Confirm Password input field (placeholder: "••••••••", show/hide toggle)
- Phone Number input field (placeholder: "+1 (555) 000-0000", country code selector)
- "Terms & Conditions" checkbox with link to `/terms`
- "Privacy Policy" checkbox with link to `/privacy`
- "Create Account" button (disabled until all fields valid)
- "Already have an account? Sign In" link → navigate to LoginScreen
- Divider: "OR"
- "Sign Up with Google" button (branded)
- "Sign Up with Apple" button (branded)

**Form Validation Rules:**
- Email: valid email format, not already registered
- Password: minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
- Phone: valid international format, optional
- Terms & Privacy: must be checked

**User Actions:**

1. **User taps Email field:**
   - Keyboard opens
   - Field highlights (blue border)
   - Clear button (X) appears if text entered

2. **User enters email:**
   - Real-time validation: email format check
   - If invalid format: red error text "Invalid email format" appears below field
   - If email already registered: red error "Email already in use"
   - Clear button visible

3. **User taps Password field:**
   - Keyboard opens
   - Field highlights (blue border)
   - Show/hide toggle icon appears (eye icon)
   - Password strength indicator appears below field (gray → red → orange → yellow → green)
   - Strength text: "Weak / Fair / Good / Strong / Very Strong"

4. **User enters password:**
   - Characters masked with dots
   - Real-time strength calculation
   - If show toggle tapped: reveals password characters
   - Strength indicator updates

5. **User taps Confirm Password field:**
   - Keyboard opens
   - Field highlights (blue border)
   - Show/hide toggle icon appears

6. **User enters confirm password:**
   - Real-time validation: matches password field
   - If mismatch: red error text "Passwords do not match"
   - If match: green checkmark appears

7. **User taps Phone field (optional):**
   - Country code dropdown appears on left (default: user's device locale)
   - User can tap to change country (searchable list: US, CA, AU, etc.)
   - Numeric keyboard opens
   - Auto-formats as user types (e.g., "5550001234" → "(555) 000-1234")

8. **User taps Terms checkbox:**
   - Checkbox toggles filled/empty
   - If unchecked and Create Account tapped: error toast "You must accept Terms & Conditions"

9. **User taps Privacy checkbox:**
   - Checkbox toggles filled/empty
   - If unchecked and Create Account tapped: error toast "You must accept Privacy Policy"

10. **User taps "Create Account" button:**
    - Button shows loading spinner, disabled
    - All fields disabled

**API Call - POST /auth/register**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/register
Headers:
  Content-Type: application/json
  X-App-Version: 2.1.0
  X-Device-ID: {unique_device_uuid}

Request Body:
{
  "email": "athlete@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1-555-000-1234",
  "termsAccepted": true,
  "privacyAccepted": true,
  "deviceInfo": {
    "platform": "iOS|Android",
    "osVersion": "16.5",
    "appVersion": "2.1.0",
    "deviceModel": "iPhone 14 Pro"
  }
}

Success Response (201 Created):
{
  "success": true,
  "message": "Account created. Verify your email to continue.",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "email": "athlete@example.com",
    "phoneNumber": "+1-555-000-1234",
    "roles": ["STUDENT"],
    "emailVerified": false,
    "status": "PENDING_EMAIL_VERIFICATION"
  },
  "verificationEmailSent": true,
  "verificationExpiresAt": "2026-04-10T04:09:00Z"
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": "INVALID_EMAIL_FORMAT|EMAIL_ALREADY_IN_USE|PASSWORD_TOO_WEAK|PHONE_INVALID",
  "message": "Email already in use",
  "fieldErrors": {
    "email": "This email is already registered"
  }
}

Error Response (429 Too Many Requests):
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many registration attempts. Try again in 15 minutes.",
  "retryAfterSeconds": 900
}
```

**State Transitions:**
- On success: Navigate to VerifyEmailScreen
- Show toast: "Account created! Check your email to verify."
- Disable all buttons for 2 seconds during transition
- On error: Show inline error message, re-enable Create Account button

**Error Handling:**
- If email exists: Show field error, suggest "Sign In" link
- If password weak: Show inline requirement feedback
- If rate limited: Show toast with retry countdown
- If network error: Show "Unable to reach server" message with retry button

---

#### 1.1.2 Email Verification Screen

**Screen Name:** `VerifyEmailScreen`

**Layout Elements:**
- "Verify Your Email" heading
- "We've sent a verification link to athlete@example.com" subtitle
- Email display with "Change" button to go back to registration
- 6-digit code input fields (6 separate boxes, auto-focus, auto-advance)
- Countdown timer: "Resend code in 1:45" (red when < 1 minute)
- "Didn't receive code?" link → triggers resend
- "Resend Email" button (disabled until timer expires or manual tap)
- Back button → confirmDialog "Are you sure? You'll need to verify again."

**User Actions:**

1. **User taps first digit box:**
   - Numeric keyboard opens
   - Box highlights (blue border)
   - Cursor visible

2. **User types digit (0-9):**
   - Digit appears in box
   - Focus auto-advances to next box
   - Previous boxes locked
   - Backspace deletes from current box, moves focus back if empty

3. **User completes all 6 digits:**
   - All boxes display (visual validation: no error state means correct entry ongoing)
   - Focus remains in last box
   - Verify button becomes enabled/active (previously grayed)
   - Auto-submit triggered after 500ms if code is valid

**API Call - POST /auth/verify-email**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/verify-email
Headers:
  Content-Type: application/json
  X-Device-ID: {unique_device_uuid}

Request Body:
{
  "email": "athlete@example.com",
  "code": "123456"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "email": "athlete@example.com",
    "emailVerified": true,
    "status": "ACTIVE"
  }
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": "INVALID_CODE|CODE_EXPIRED",
  "message": "Invalid verification code"
}
```

**State Transitions:**
- On success: Navigate to CreateProfileScreen
- Show toast: "Email verified! Complete your profile."
- On error: Show inline error "Invalid code" in red, clear all boxes, refocus first box

**Resend Email Flow:**
1. User taps "Resend Email" button
2. Button disabled, shows spinner, text changes to "Sending..."
3. API POST /auth/resend-verification-email called
4. Success: Toast "Code resent to athlete@example.com", restart 2-minute timer
5. Error: Show modal "Unable to resend. Check your connection and try again."

---

#### 1.1.3 Create Profile Screen

**Screen Name:** `CreateProfileScreen`

**Layout Elements:**
- "Complete Your Profile" heading
- Avatar upload circle (default: generic avatar icon, tap to upload photo)
- First Name input field (placeholder: "First")
- Last Name input field (placeholder: "Last")
- Date of Birth picker (tap to open date picker modal)
- Weight input field with toggle: "kg" / "lbs" (default: from device locale)
- License Level dropdown: "Not Licensed / AFF Student / Advanced / Category A / Category B / Category C"
- Emergency Contact Name input field
- Emergency Contact Phone input field (with country code)
- "I am a resident of:" Country selector (searchable dropdown)
- "Next" button
- "Skip for Now" link (optional profile completion later)

**User Actions:**

1. **User taps Avatar upload circle:**
   - Modal appears: "Choose Photo Source"
   - Options: "Take Photo" (camera), "Choose from Library" (photo picker)
   - User selects source
   - If camera: camera opens, user takes photo, crop dialog appears
   - If photo library: picker opens, user selects image, crop dialog appears
   - User confirms crop
   - Image shows in circle (cropped square, no rotation)

2. **User enters First Name:**
   - Keyboard opens
   - Real-time validation: 2-50 characters
   - If < 2 chars: gray helper text "Minimum 2 characters"
   - If > 50 chars: red error "Maximum 50 characters"

3. **User enters Last Name:**
   - Same validation as First Name

4. **User taps Date of Birth picker:**
   - Modal picker opens (calendar or wheel style)
   - User selects day, month, year
   - Age calculated: if < 18, warning: "Parental consent required"
   - Modal closes, field shows "Jan 15, 1995"

5. **User enters Weight:**
   - Numeric keyboard opens
   - If kg selected: range 40-200 kg, error if outside
   - If lbs selected: range 88-440 lbs, error if outside
   - Conversion automatic if toggle tapped

6. **User selects License Level dropdown:**
   - Modal picker opens with levels
   - User taps selection
   - Modal closes, field displays selection

7. **User enters Emergency Contact Name & Phone:**
   - Same validation as profile name/phone

8. **User selects Country:**
   - Searchable dropdown opens
   - User types to filter (e.g., "united" → filters to "United States", "United Kingdom")
   - User taps selection
   - Modal closes, field displays "United States"

9. **User taps "Next" button:**
   - Validation: First Name, Last Name, DOB required
   - If missing: show toast "Please complete all required fields"
   - If valid: Call POST /users/{userId}/profile

**API Call - POST /users/{userId}/profile**

```
Method: POST
URL: https://api.skylara.app/api/v1/users/user_7f8a9b0c1d2e3f4g/profile
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "firstName": "Ali",
  "lastName": "Fouad",
  "dateOfBirth": "1995-01-15",
  "weight": {
    "value": 85,
    "unit": "kg"
  },
  "licenseLevel": "CATEGORY_B",
  "emergencyContact": {
    "name": "Sarah Fouad",
    "phoneNumber": "+1-555-100-2000"
  },
  "country": "US",
  "avatarUrl": "https://cdn.skylara.app/avatars/user_7f8a9b0c1d2e3f4g.jpg"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Profile created successfully",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "firstName": "Ali",
    "lastName": "Fouad",
    "profileComplete": true
  }
}
```

**State Transitions:**
- On success: Navigate to LoginScreen (or HomeScreen if already logged in internally)
- Show toast: "Profile complete! You're all set."

---

### 1.2 LOGIN FLOW

#### 1.2.1 Login Screen

**Screen Name:** `LoginScreen`

**Layout Elements:**
- SkyLara logo (centered, top)
- "Sign In" heading
- Email input field (placeholder: "you@example.com")
- Password input field (placeholder: "••••••••", show/hide toggle)
- "Remember me" checkbox
- "Forgot Password?" link
- "Sign In" button
- "Don't have an account? Sign Up" link
- Divider: "OR"
- "Sign In with Google" button
- "Sign In with Apple" button
- "Sign In with Biometric" button (if device supports FaceID/TouchID and user has enabled)

**User Actions:**

1. **User taps Email field:**
   - Keyboard opens
   - Field highlights (blue border)

2. **User enters email:**
   - Real-time validation (format check)
   - If invalid: red error "Invalid email format"

3. **User taps Password field:**
   - Keyboard opens
   - Field highlights
   - Show/hide toggle icon appears

4. **User enters password:**
   - Characters masked
   - If show toggled: characters revealed

5. **User taps "Remember me" checkbox:**
   - Checkbox toggles
   - If checked: token will persist for 30 days (secure keychain storage)
   - If unchecked: token expires in 1 hour

6. **User taps "Sign In" button:**
   - Button shows spinner, disabled
   - All fields disabled

**API Call - POST /auth/login**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/login
Headers:
  Content-Type: application/json
  X-Device-ID: {unique_device_uuid}

Request Body:
{
  "email": "athlete@example.com",
  "password": "SecurePass123!",
  "rememberMe": true,
  "deviceInfo": {
    "platform": "iOS|Android",
    "osVersion": "16.5",
    "appVersion": "2.1.0",
    "deviceModel": "iPhone 14 Pro"
  }
}

Success Response (200 OK):
{
  "success": true,
  "message": "Login successful",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  },
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "email": "athlete@example.com",
    "firstName": "Ali",
    "lastName": "Fouad",
    "roles": ["ATHLETE"],
    "defaultDZ": "dz_abc123",
    "profileComplete": true,
    "mfaEnabled": false
  }
}

Error Response (401 Unauthorized):
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}

Error Response (403 Forbidden):
{
  "success": false,
  "error": "EMAIL_NOT_VERIFIED",
  "message": "Please verify your email before signing in",
  "resendVerificationUrl": "/auth/resend-verification"
}

Error Response (429 Too Many Requests):
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many login attempts. Try again in 15 minutes.",
  "retryAfterSeconds": 900
}
```

**State Transitions:**
- If MFA disabled: Navigate to HomeScreen (or Dashboard if no DZ selected)
- If MFA enabled: Navigate to MFAVerificationScreen
- Store tokens in secure keychain
- Start token refresh timer (5 min before expiry)
- Connect to WebSocket for real-time updates

**Error Handling:**
- Invalid credentials: Show modal "Invalid email or password. Try again."
- Email not verified: Show modal with "Resend Verification Email" button
- Rate limited: Show toast with countdown
- Network error: Show "Unable to reach server" with retry

---

#### 1.2.2 Forgot Password Flow

**Screen Name:** `ForgotPasswordScreen`

**Layout Elements:**
- "Forgot Your Password?" heading
- "Enter your email address and we'll send you a link to reset it" subtitle
- Email input field (placeholder: "you@example.com")
- "Send Reset Link" button
- Back button

**User Actions:**

1. **User taps Email field:**
   - Keyboard opens

2. **User enters email:**
   - Real-time validation
   - If invalid: red error

3. **User taps "Send Reset Link" button:**
   - Button shows spinner, disabled

**API Call - POST /auth/forgot-password**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/forgot-password
Headers:
  Content-Type: application/json

Request Body:
{
  "email": "athlete@example.com"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Password reset link sent to your email",
  "resetTokenExpiresAt": "2026-04-09T06:09:00Z"
}

Error Response (404 Not Found):
{
  "success": false,
  "error": "EMAIL_NOT_FOUND",
  "message": "No account found with this email"
}
```

**State Transitions:**
- On success: Navigate to ConfirmResetScreen
- Show message: "Check your email for reset link (expires in 1 hour)"
- Option to resend after 30 seconds

**Reset Link Flow (from email):**
1. User receives email with link: `skylara://reset-password?token=abc123&email=athlete@example.com`
2. User taps link, opens deep link
3. App navigates to ResetPasswordScreen with token pre-filled

---

#### 1.2.3 Reset Password Screen

**Screen Name:** `ResetPasswordScreen`

**Layout Elements:**
- "Reset Your Password" heading
- New Password input field (with strength indicator)
- Confirm Password input field
- "Reset Password" button
- "Back to Sign In" link

**User Actions:**

1. **User taps New Password field:**
   - Keyboard opens
   - Strength indicator appears

2. **User enters password:**
   - Real-time strength calculation
   - Same validation as registration

3. **User enters Confirm Password:**
   - Validation: matches new password
   - Green checkmark if matches

4. **User taps "Reset Password" button:**
   - Button shows spinner, disabled

**API Call - POST /auth/reset-password**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/reset-password
Headers:
  Content-Type: application/json

Request Body:
{
  "token": "reset_token_abc123",
  "email": "athlete@example.com",
  "newPassword": "NewSecurePass456!"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Password reset successfully",
  "redirectTo": "login"
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": "INVALID_TOKEN|TOKEN_EXPIRED|PASSWORD_TOO_WEAK",
  "message": "Reset link has expired. Request a new one."
}
```

**State Transitions:**
- On success: Navigate to LoginScreen
- Show toast: "Password reset! You can now sign in with your new password."

---

### 1.3 BIOMETRIC AUTHENTICATION

#### 1.3.1 Enable Biometric Login

**Trigger:** User in ProfileScreen → Settings → "Security" → "Enable Biometric Login" toggle

**API Call - POST /users/{userId}/security/biometric-enable**

```
Method: POST
URL: https://api.skylara.app/api/v1/users/user_7f8a9b0c1d2e3f4g/security/biometric-enable
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "biometricType": "FACE_ID|TOUCH_ID|FINGERPRINT",
  "deviceId": "device_uuid_123"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Biometric authentication enabled",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "biometricEnabled": true,
    "biometricType": "FACE_ID"
  }
}
```

**User Experience:**
1. User enables toggle in settings
2. System checks if device supports biometric (iOS: FaceID/TouchID, Android: BiometricPrompt)
3. OS biometric prompt appears (native system dialog)
4. User authenticates with face/fingerprint
5. If successful: System stores encrypted biometric token locally
6. Toast: "Biometric authentication enabled"

#### 1.3.2 Biometric Login from LoginScreen

**User Actions:**

1. **User taps "Sign In with Biometric" button (visible if enabled on this device):**
   - Native OS biometric prompt appears immediately (FaceID/TouchID/Fingerprint)
   - User authenticates

2. **On successful biometric authentication:**
   - System validates stored biometric token
   - API POST /auth/login-biometric called (if token refresh needed)

**API Call - POST /auth/login-biometric**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/login-biometric
Headers:
  Content-Type: application/json
  X-Device-ID: {unique_device_uuid}

Request Body:
{
  "biometricToken": "encrypted_biometric_token",
  "deviceId": "device_uuid_123"
}

Success Response (200 OK):
{
  "success": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  },
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "email": "athlete@example.com"
  }
}
```

**State Transitions:**
- On success: Navigate to HomeScreen immediately
- No password entry required

---

### 1.4 MULTI-FACTOR AUTHENTICATION (MFA)

#### 1.4.1 Enable MFA

**Trigger:** ProfileScreen → Settings → "Security" → "Two-Factor Authentication" → "Enable MFA"

**Screen Name:** `MFASetupScreen`

**Layout Elements:**
- "Set Up Two-Factor Authentication" heading
- Three option cards: "Authenticator App", "SMS", "Email"
- Selected method shows setup steps
- QR code (if Authenticator App selected)
- Backup codes display with copy button
- "Confirm & Continue" button

**User Actions:**

1. **User selects "Authenticator App":**
   - QR code displays for scanning with authenticator (Google Authenticator, Authy, Microsoft Authenticator)
   - Manual code entry field available as fallback
   - User scans or enters code into authenticator app
   - Authenticator app generates 6-digit code
   - User taps "Enter verification code" field
   - User enters 6-digit code from authenticator

**API Call - POST /users/{userId}/security/mfa-setup**

```
Method: POST
URL: https://api.skylara.app/api/v1/users/user_7f8a9b0c1d2e3f4g/security/mfa-setup
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "mfaMethod": "AUTHENTICATOR_APP|SMS|EMAIL",
  "verificationCode": "123456"
}

Success Response (200 OK):
{
  "success": true,
  "message": "MFA enabled successfully",
  "backupCodes": [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    "MNOP-3456",
    "QRST-7890"
  ],
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "mfaEnabled": true,
    "mfaMethod": "AUTHENTICATOR_APP"
  }
}
```

**Backup Codes Display:**
- Shows 5 backup codes in a readable format
- Each code valid for one-time use only
- User can copy all codes to clipboard
- User can download as PDF
- Warning: "Save these codes in a safe place. You'll need them if you lose access to your authenticator."

**State Transitions:**
- After verification: Show backup codes screen
- After backup codes acknowledged: Show success modal
- Navigate back to Settings

---

#### 1.4.2 MFA Verification on Login

**Screen Name:** `MFAVerificationScreen` (appears after successful email/password login with MFA enabled)

**Layout Elements:**
- "Verify Your Identity" heading
- "Enter the 6-digit code from your authenticator" subtitle
- 6-digit code input boxes (auto-focus, auto-advance)
- "Don't have your authenticator?" link → "Use Backup Code" option
- "Verify" button
- "Resend code" link (if SMS/Email method)

**User Actions:**

1. **User enters 6-digit code:**
   - Auto-advances through boxes
   - Auto-submits on completion

**API Call - POST /auth/verify-mfa**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/verify-mfa
Headers:
  Content-Type: application/json

Request Body:
{
  "sessionToken": "temporary_session_token",
  "verificationCode": "123456",
  "method": "AUTHENTICATOR_APP|SMS|EMAIL|BACKUP_CODE"
}

Success Response (200 OK):
{
  "success": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": "INVALID_CODE|CODE_EXPIRED",
  "message": "Invalid verification code"
}
```

**State Transitions:**
- On success: Navigate to HomeScreen, store tokens
- On error: Show error, clear fields, refocus first box

---

### 1.5 SESSION MANAGEMENT

#### 1.5.1 Token Refresh

**Trigger:** When access token expires (typically 1 hour) or proactively at 5 minutes before expiry

**API Call - POST /auth/refresh-token**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/refresh-token
Headers:
  Content-Type: application/json

Request Body:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "device_uuid_123"
}

Success Response (200 OK):
{
  "success": true,
  "tokens": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": 3600
  }
}

Error Response (401 Unauthorized):
{
  "success": false,
  "error": "INVALID_REFRESH_TOKEN|REFRESH_TOKEN_EXPIRED",
  "message": "Session expired. Please sign in again.",
  "action": "REDIRECT_TO_LOGIN"
}
```

**Behavior:**
- Runs silently in background
- On success: Update token in keychain, restart refresh timer
- On error: Clear all tokens, navigate to LoginScreen with toast "Your session has expired. Please sign in again."

#### 1.5.2 Logout

**Screen Name:** ProfileScreen → "Logout" button

**User Actions:**

1. **User taps "Logout" button:**
   - Confirmation modal: "Are you sure you want to sign out?"
   - "Cancel" / "Sign Out" buttons

2. **User taps "Sign Out":**
   - Show spinner overlay "Signing out..."

**API Call - POST /auth/logout**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/logout
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "deviceId": "device_uuid_123"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

**State Transitions:**
- Close WebSocket connection
- Clear all tokens from keychain
- Clear cached user data
- Navigate to LoginScreen
- Animate out spinner

---

### 1.6 PROFILE MANAGEMENT

#### 1.6.1 Profile Screen (Main)

**Screen Name:** `ProfileScreen`

**Layout Elements:**
- Avatar image (large, 120x120 circle)
- User name: "Ali Fouad"
- License level badge: "Category B"
- 12-tile grid menu:
  1. Personal Details → PersonalDetailsScreen
  2. Jumper Skills → JumperSkillsScreen
  3. Discipline/Specialties → DisciplineScreen
  4. Documents & Certificates → DocumentsScreen
  5. Transactions History → TransactionHistoryScreen
  6. Affiliate Program → AffiliateScreen
  7. Waivers & Signed Documents → WaiversScreen
  8. Safety Records → SafetyRecordsScreen
  9. Change Password → ChangePasswordScreen
  10. Manage Devices → ManageDevicesScreen
  11. Help & FAQ → HelpScreen
  12. Settings → SettingsScreen
- Bottom: "Sign Out" button (red)
- Bottom nav: Home | Logbook | Chat | Profile (highlighted)

**User Actions:**

1. **User taps avatar:**
   - Modal: "Change Profile Photo"
   - Options: "Take Photo" / "Choose from Library" / "Remove Photo"
   - Same flow as registration profile photo

2. **User taps tile (e.g., "Personal Details"):**
   - Navigate to PersonalDetailsScreen

---

#### 1.6.2 Personal Details Screen

**Screen Name:** `PersonalDetailsScreen`

**Layout Elements:**
- "Personal Details" heading with back button
- First Name input (editable)
- Last Name input (editable)
- Email display (read-only, with "Change Email" link)
- Phone Number input (editable)
- Date of Birth picker (editable)
- Weight input with kg/lbs toggle (editable)
- Country selector (editable)
- Emergency Contact Name input (editable)
- Emergency Contact Phone input (editable)
- "Save Changes" button
- "Delete Account" link (red, at bottom)

**User Actions:**

1. **User taps any editable field:**
   - Field highlights, keyboard opens
   - Real-time validation

2. **User modifies field (e.g., First Name: "Ali" → "Alison"):**
   - Field shows unsaved indicator (orange dot)
   - "Save Changes" button becomes enabled

3. **User taps "Save Changes":**
   - Button shows spinner, disabled
   - All fields disabled

**API Call - PATCH /users/{userId}/profile**

```
Method: PATCH
URL: https://api.skylara.app/api/v1/users/user_7f8a9b0c1d2e3f4g/profile
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "firstName": "Alison",
  "lastName": "Fouad",
  "phoneNumber": "+1-555-100-2000",
  "dateOfBirth": "1995-01-15",
  "weight": {
    "value": 85,
    "unit": "kg"
  },
  "country": "US",
  "emergencyContact": {
    "name": "Sarah Fouad",
    "phoneNumber": "+1-555-100-3000"
  }
}

Success Response (200 OK):
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "firstName": "Alison",
    "lastName": "Fouad",
    "lastUpdated": "2026-04-09T04:09:00Z"
  }
}
```

**State Transitions:**
- On success: Show toast "Profile updated", remove unsaved indicators
- On error: Show modal with error message

---

#### 1.6.3 Change Email Screen

**Screen Name:** `ChangeEmailScreen`

**Layout Elements:**
- "Change Email Address" heading
- Current Email display (read-only): athlete@example.com
- New Email input field (placeholder: "newemail@example.com")
- "Send Verification Link" button

**User Actions:**

1. **User enters new email:**
   - Real-time validation (format, not duplicate)

2. **User taps "Send Verification Link":**
   - Button shows spinner, disabled

**API Call - POST /users/{userId}/email/change-request**

```
Method: POST
URL: https://api.skylara.app/api/v1/users/user_7f8a9b0c1d2e3f4g/email/change-request
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "newEmail": "newemail@example.com"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Verification email sent to newemail@example.com",
  "expiresAt": "2026-04-10T04:09:00Z"
}
```

**State Transitions:**
- On success: Navigate to ConfirmEmailChangeScreen
- Show message: "Check your new email for verification link"

**Email Verification Link Flow:**
- User receives email with deep link: `skylara://verify-email-change?token=abc123`
- App opens, navigates to VerifyEmailChangeScreen
- Screen displays old email + new email
- User confirms by tapping "Verify Email Change" button

**API Call - POST /users/{userId}/email/verify-change**

```
Method: POST
URL: https://api.skylara.app/api/v1/users/user_7f8a9b0c1d2e3f4g/email/verify-change
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "token": "email_change_token_abc123"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Email changed successfully",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "email": "newemail@example.com"
  }
}
```

---

### 1.7 OAUTH ACCOUNT LINKING

#### 1.7.1 Google OAuth Link

**Screen Name:** `SecuritySettingsScreen` → "Link Google Account" button

**User Actions:**

1. **User taps "Link Google Account" button:**
   - System initiates OAuth 2.0 flow (Authorization Code Flow)
   - Safari/WebView opens to Google consent screen
   - User logs in with Google credentials (if not already logged in)
   - User approves SkyLara permissions: email, profile

2. **User approves:**
   - OAuth callback returns authorization code
   - App exchanges code for tokens

**API Call - POST /auth/oauth/link**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/oauth/link
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "provider": "GOOGLE",
  "authorizationCode": "4/0AY0e-g4qX...",
  "redirectUri": "skylara://oauth/callback"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Google account linked successfully",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "linkedAccounts": [
      {
        "provider": "GOOGLE",
        "googleId": "104123456789...",
        "email": "athlete@gmail.com",
        "linkedAt": "2026-04-09T04:09:00Z"
      }
    ]
  }
}
```

**State Transitions:**
- On success: Close WebView, show toast "Google account linked"
- Update SecuritySettingsScreen to show "Unlink Google" button for previously linked

#### 1.7.2 Apple OAuth Link

**Similar flow to Google, using Apple Sign In:**

```
Method: POST
URL: https://api.skylara.app/api/v1/auth/oauth/link
Request Body:
{
  "provider": "APPLE",
  "authorizationCode": "c8d3...",
  "identityToken": "eyJhbGc...",
  "user": {
    "name": {
      "firstName": "Ali",
      "lastName": "Fouad"
    },
    "email": "athlete@icloud.com"
  }
}
```

---

### 1.8 WAIVER SIGNING FLOW (SmartWaiver Integration)

#### 1.8.1 Waiver List Screen

**Screen Name:** `WaiversScreen`

**Layout Elements:**
- "Waivers & Signed Documents" heading
- List of facilities/DZs (each showing status)
- Each row shows:
  - DZ name: "Skydive Arizona"
  - Document type: "Liability Waiver"
  - Status badge: "✓ Signed" (green) or "Needs Signature" (red)
  - Signed date: "Signed Mar 5, 2026" or "Sign Now" link
  - "View Document" link (if already signed)
- "Add Facility" button (to sign waiver for new DZ)

**User Actions:**

1. **User taps "Sign Now" for unsigned waiver:**
   - Navigate to WaiverSigningScreen

2. **User taps "View Document":**
   - Display PDF of already-signed waiver (read-only)

3. **User taps "Add Facility":**
   - Open facility selector (searchable list of all DZs)
   - User selects DZ
   - Navigate to WaiverSigningScreen with DZ pre-selected

---

#### 1.8.2 Waiver Signing Screen

**Screen Name:** `WaiverSigningScreen`

**Layout Elements:**
- "Skydive Arizona - Liability Waiver" heading
- DZ logo/info
- Scrollable waiver document text (full liability waiver content)
- "I understand and agree" checkbox (must scroll to bottom to enable)
- Full Name input field (pre-filled from profile)
- Email input field (pre-filled from profile)
- Signature pad (canvas element for drawing signature with finger)
- "Clear Signature" button
- "Sign & Submit" button (disabled until signature entered)
- Back button

**User Actions:**

1. **User scrolls through waiver document:**
   - Progress indicator: "25% read", "50% read", etc.
   - At bottom: checkbox appears "I have read and understand the waiver"

2. **User checks checkbox:**
   - "Sign & Submit" button becomes enabled

3. **User taps signature pad:**
   - Canvas activates, cursor visible
   - User draws signature with finger/stylus
   - Signature displays in real-time on canvas

4. **User taps "Clear Signature":**
   - Canvas clears, signature removed

5. **User taps "Sign & Submit":**
   - Button shows spinner, disabled

**API Call - POST /waivers/sign**

```
Method: POST
URL: https://api.skylara.app/api/v1/waivers/sign
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "facilityId": "dz_abc123",
  "waiverTemplateId": "waiver_template_001",
  "userId": "user_7f8a9b0c1d2e3f4g",
  "fullName": "Ali Fouad",
  "email": "athlete@example.com",
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "acceptedAt": "2026-04-09T04:09:00Z"
}

Success Response (201 Created):
{
  "success": true,
  "message": "Waiver signed successfully",
  "waiver": {
    "id": "waiver_sig_123",
    "facilityId": "dz_abc123",
    "userId": "user_7f8a9b0c1d2e3f4g",
    "status": "SIGNED",
    "signedAt": "2026-04-09T04:09:00Z",
    "documentUrl": "https://cdn.skylara.app/waivers/waiver_sig_123.pdf",
    "expiresAt": "2027-04-09T04:09:00Z"
  }
}
```

**State Transitions:**
- On success: Navigate back to WaiversScreen
- Show toast: "Waiver signed successfully"
- Update status badge to "✓ Signed"
- Show signed date

**Waiver Expiry:**
- Waivers expire after 12 months
- Before expiry (30 days): Show "Renew" option
- After expiry: Show "Expired - Sign Again" and mark as unsigned

---

## PART 2: CHECK-IN / CHECK-OUT STATE MACHINE

### 2.1 CHECK-IN BUTTON STATES AND TRANSITIONS

#### 2.1.1 Check-in Button Overview

**Location:** HomeScreen, prominently displayed below user name and DZ selector

**Button States:**

1. **CHECKED_OUT state:**
   - Text: "CHECK IN"
   - Color: Green (#00C853)
   - Icon: Checkmark
   - Size: Large, full-width, 56px height
   - Tap behavior: Triggers check-in process

2. **CHECKED_IN state:**
   - Text: "CHECK OUT"
   - Color: Red (#FF5252)
   - Icon: X mark
   - Size: Large, full-width, 56px height
   - Tap behavior: Triggers check-out process

3. **CHECKING_IN state (interim):**
   - Text: "Checking in..." with spinner
   - Color: Gray (#BDBDBD)
   - Disabled: Yes
   - Duration: 2-5 seconds (while API processes)

4. **CHECKING_OUT state (interim):**
   - Text: "Checking out..." with spinner
   - Color: Gray (#BDBDBD)
   - Disabled: Yes
   - Duration: 2-5 seconds (while API processes)

5. **CHECK_IN_BLOCKED state:**
   - Text: "Check-in Unavailable"
   - Color: Gray (#757575)
   - Disabled: Yes
   - Tooltip appears on hover/long-press: Shows reason (e.g., "Waiver not signed", "No active DZ selected", "Payment method required")

**Validation Rules (must pass before check-in allowed):**

1. **Waiver Signed:**
   - For current DZ: Must have valid, non-expired waiver on file
   - If missing: Tooltip "Complete waiver for {DZ Name}"
   - If expired: Tooltip "Your waiver expired. Renew it to check in."

2. **Payment Method:**
   - Must have at least one valid payment method on file (card, wallet, or block ticket)
   - If missing: Tooltip "Add a payment method to check in"

3. **Currency Balance:**
   - If paying per jump: Must have at least minimum balance for one jump (varies by DZ, typically AED 150-250)
   - If using block ticket: Must have available slots in active block ticket
   - If balance insufficient: Tooltip "Insufficient balance. Add funds to check in."

4. **DZ Active:**
   - Selected DZ must have active operations (not closed for weather, maintenance, etc.)
   - If DZ closed: Tooltip "{DZ Name} is closed for weather hold"

5. **User Status:**
   - Must not be banned or suspended
   - Account must be active (not deleted or archived)

---

#### 2.1.2 Check-In Flow

**Trigger:** User taps "CHECK IN" button (green)

**Step 1 - Validation Check (local + server):**

```
Local Checks:
1. Is waiver signed for current DZ? (cached)
2. Is payment method available? (cached)
3. Is app online? (network check)

If any fails:
- Show inline error/tooltip
- Do not proceed with check-in
- Button returns to CHECKED_OUT state
```

**Step 2 - API Call - POST /checkin/check-in**

```
Method: POST
URL: https://api.skylara.app/api/v1/checkin/check-in
Headers:
  Authorization: Bearer {access_token}
  X-Device-ID: {device_uuid}
  Content-Type: application/json

Request Body:
{
  "dzId": "dz_abc123",
  "userId": "user_7f8a9b0c1d2e3f4g",
  "timestamp": "2026-04-09T04:09:00Z",
  "deviceLocation": {
    "latitude": 33.3501,
    "longitude": -111.5371,
    "accuracy": 10.5
  },
  "deviceInfo": {
    "platform": "iOS",
    "appVersion": "2.1.0"
  }
}

Success Response (200 OK):
{
  "success": true,
  "message": "Checked in successfully",
  "checkIn": {
    "id": "checkin_001",
    "userId": "user_7f8a9b0c1d2e3f4g",
    "dzId": "dz_abc123",
    "status": "CHECKED_IN",
    "checkedInAt": "2026-04-09T04:09:00Z",
    "checkedOutAt": null,
    "duration": null
  },
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "firstName": "Ali",
    "lastName": "Fouad",
    "checkInStatus": "CHECKED_IN",
    "checkInTime": "2026-04-09T04:09:00Z"
  }
}

Error Response (400 Bad Request - Validation Failed):
{
  "success": false,
  "error": "WAIVER_NOT_SIGNED|WAIVER_EXPIRED|PAYMENT_METHOD_MISSING|INSUFFICIENT_BALANCE|DZ_CLOSED|USER_BANNED",
  "message": "Waiver expired. Please sign a new waiver to check in.",
  "blockingReason": "WAIVER_EXPIRED",
  "actionRequired": {
    "action": "RENEW_WAIVER",
    "navigateTo": "WaiversScreen"
  }
}

Error Response (401 Unauthorized):
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Session expired. Please sign in again."
}

Error Response (429 Too Many Requests):
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Check-in rate limit exceeded. Try again in 60 seconds."
}
```

**Step 3 - WebSocket Broadcast (from server):**

On successful check-in, server broadcasts to all connected staff at this DZ:

```
Channel: /dz/{dzId}/checkins
Event: USER_CHECKED_IN

Payload:
{
  "eventType": "USER_CHECKED_IN",
  "eventTimestamp": "2026-04-09T04:09:00Z",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "firstName": "Ali",
    "lastName": "Fouad",
    "licenseLevel": "CATEGORY_B",
    "avatar": "https://cdn.skylara.app/avatars/user_7f8a9b0c1d2e3f4g.jpg"
  },
  "checkedInAt": "2026-04-09T04:09:00Z",
  "dzId": "dz_abc123"
}
```

**Who Receives Update:**
- MANIFEST_STAFF: See on manifest board check-in queue
- DZ_MANAGER: See on staff dashboard
- PLATFORM_ADMIN: See in analytics

**Step 4 - UI State Change:**

```
User's Home Screen:
1. CHECK IN button becomes CHECK OUT button (red)
2. Subtitle below name changes to "Checked in at 8:09 AM"
3. Timer starts showing time since check-in
4. Button shows spinner for 1 second, then stabilizes
5. Toast appears: "Checked in! Welcome to {DZ Name}"

Staff Manifest Board:
1. User appears in "Checked In" queue
2. User badge shows check-in time
3. User can now be added to manifests
```

---

#### 2.1.3 Check-Out Flow

**Trigger:** User taps "CHECK OUT" button (red)

**User Confirmation Dialog:**

```
Modal Title: "Check Out?"
Message: "You've been checked in for 45 minutes."
Buttons:
  - "Cancel" (close modal, stay checked in)
  - "Check Out" (confirm, proceed with check-out)
```

**Step 1 - API Call - POST /checkin/check-out**

```
Method: POST
URL: https://api.skylara.app/api/v1/checkin/check-out
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Request Body:
{
  "dzId": "dz_abc123",
  "userId": "user_7f8a9b0c1d2e3f4g",
  "checkInId": "checkin_001",
  "timestamp": "2026-04-09T04:54:00Z"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Checked out successfully",
  "checkIn": {
    "id": "checkin_001",
    "userId": "user_7f8a9b0c1d2e3f4g",
    "dzId": "dz_abc123",
    "status": "CHECKED_OUT",
    "checkedInAt": "2026-04-09T04:09:00Z",
    "checkedOutAt": "2026-04-09T04:54:00Z",
    "durationMinutes": 45
  }
}
```

**Step 2 - WebSocket Broadcast:**

```
Channel: /dz/{dzId}/checkins
Event: USER_CHECKED_OUT

Payload:
{
  "eventType": "USER_CHECKED_OUT",
  "eventTimestamp": "2026-04-09T04:54:00Z",
  "user": {
    "id": "user_7f8a9b0c1d2e3f4g",
    "firstName": "Ali",
    "lastName": "Fouad"
  },
  "checkedOutAt": "2026-04-09T04:54:00Z",
  "dzId": "dz_abc123"
}
```

**Step 3 - UI State Change:**

```
User's Home Screen:
1. CHECK OUT button becomes CHECK IN button (green)
2. Subtitle changes to "Checked out at 4:54 PM"
3. Previous session duration shown: "Session: 45 minutes"
4. Toast: "Checked out! See you next time."

Staff Manifest Board:
1. User removed from "Checked In" queue
2. Appears in "Available" queue if no active manifest
3. Can still be added to loads (optional secondary manifest)
```

---

### 2.2 MULTI-USER REAL-TIME UPDATES

#### 2.2.1 Staff Check-In Dashboard (Manifest Staff View)

**Screen Name:** `CheckInQueueScreen` (staff only)

**Location:** Bottom nav → Staff portal (for MANIFEST_STAFF, DZ_MANAGER roles)

**Layout Elements:**
- "Check-In Queue" heading
- "Recently Checked In" section (newest first, auto-sorted):
  - Each row shows: Avatar, Name, License Level, Check-in Time, "Checked In X minutes ago"
  - Tap to view user profile
  - Swipe to add to manifest (quick action)
- "All Jumpers" tab (toggle): Shows all checked-in users with ability to manage manifests
- "Expected Arrivals" tab (toggle): Shows users who have declared they're coming, not yet checked in
- Filter: "All" / "By License Level" / "By Discipline"
- Search: Search by name or member ID
- Statistics bar: "Checked In: 12 / Expected: 18"

**Real-Time Updates via WebSocket:**

```
Connected to: ws://api.skylara.app/ws
Subscribed to: /dz/dz_abc123/checkins

Events Received:
1. USER_CHECKED_IN → Add to queue, animate in, update count
2. USER_CHECKED_OUT → Remove from queue, show confirmation
3. USER_MANIFESTED → Move to "In Manifest" section
4. USER_MANIFEST_CLEARED → Move back to "Available" queue
5. LOAD_COMPLETED → Remove from queue if all manifests done

Example Event Handler:
```

```javascript
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.eventType === 'USER_CHECKED_IN') {
    // Add user to queue
    const newUser = message.user;
    prependUserToQueue(newUser);
    updateCheckInCount(+1);
    animateNewUserEntry(newUser);
  }
  
  if (message.eventType === 'USER_CHECKED_OUT') {
    // Remove user from queue
    removeUserFromQueue(message.user.id);
    updateCheckInCount(-1);
    showNotification(`${message.user.firstName} checked out`);
  }
};
```

---

#### 2.2.2 Athlete Real-Time Status Updates

**WebSocket Subscription:**

```
Connected User receives broadcasts on:
Channel: /user/{userId}/notifications
Channel: /dz/{dzId}/broadcasts

Events:
1. DZ_WEATHER_HOLD_ACTIVATED
2. LOAD_STATUS_CHANGED
3. FRIEND_CHECKED_IN (if social features enabled)
4. MANIFEST_REQUEST (if auto-invite enabled)
5. EQUIPMENT_ALERT
```

---

### 2.3 VALIDATION & ERROR HANDLING

#### 2.3.1 Waiver Validation

**Check-in Button shows blocked state if:**

```
Conditions:
1. No waiver signed for this DZ
2. Waiver exists but expired (> 12 months old)
3. Waiver pending (submitted but not yet approved by facility)

API returns: "WAIVER_NOT_SIGNED" / "WAIVER_EXPIRED" / "WAIVER_PENDING"

User Action:
- Tap "Fix" button on tooltip
- Navigate to WaiversScreen
- Display waiver for this DZ
- If expired: Show "Renew Waiver" flow (same as new waiver)
- If missing: Show "Sign Waiver" flow
```

---

## PART 3: DROPZONE HOME DASHBOARD

### 3.1 ATHLETE HOME DASHBOARD

**Screen Name:** `HomeScreen` (default after login)

**Layout Structure:**

1. **Header Section:**
   - User greeting: "Good Morning, Ali" (changes with time of day)
   - Current time: "8:09 AM"
   - Notification bell icon (with unread count badge)

2. **DZ Selector:**
   - Dropdown: "Skydive Arizona ▼"
   - Tap to open list of user's DZs, select different DZ
   - Shows: DZ name, distance from current location (if geo available), status ("Open" / "Closed")

3. **Check-In/Out Toggle Button:**
   - Large green "CHECK IN" button or red "CHECK OUT" button (as detailed in Part 2)
   - Beneath: Current status text

4. **Balance & Account Status Bar:**
   - Left: "Balance: AED 1,250.00" (tap to view detailed transactions)
   - Right: "3 Tickets" badge (tap to view ticket inventory)

5. **Upcoming Load Card:**
   - Title: "Your Next Load"
   - Load info: Aircraft (SD 5), Load # (7), Time (11:30 AM), Slots (5/8 full)
   - Jump info: Formation (FS), Group (BM6-1), Exit Order (12)
   - Action buttons: "View Details" / "Refresh"
   - If no load assigned: Shows "No load assigned. Build a team or join a load."

6. **Action Tiles Grid (2 columns, 3 rows):**

   **Tile 1: Load Builder**
   - Icon: Team icon
   - Text: "Load Builder"
   - Subtitle: "Create a team"
   - Tap → Navigate to LoadBuilderScreen

   **Tile 2: Get Organized**
   - Icon: Checklist icon
   - Text: "Get Organized"
   - Subtitle: "Prepare for your jump"
   - Tap → Navigate to PreJumpChecklistScreen

   **Tile 3: My Loads**
   - Icon: Manifests icon
   - Text: "My Loads"
   - Subtitle: "View assigned loads"
   - Tap → Navigate to MyLoadsScreen

   **Tile 4: Transaction History**
   - Icon: Receipt icon
   - Text: "Transactions"
   - Subtitle: "View payments"
   - Tap → Navigate to TransactionHistoryScreen

   **Tile 5: DZ Emergency**
   - Icon: SOS (red emergency icon)
   - Text: "Emergency"
   - Subtitle: "Alert staff"
   - Tap → Show emergency confirmation, send SOS broadcast

   **Tile 6: Leaderboard**
   - Icon: Trophy icon
   - Text: "Leaderboard"
   - Subtitle: "Top jumpers"
   - Tap → Navigate to LeaderboardScreen

7. **Bottom Navigation:**
   - Home (highlighted/active)
   - Logbook
   - Chat
   - Profile

---

### 3.1.1 Athlete Home Screen - Refresh & Real-Time Updates

**Auto-Refresh:**
- HomeScreen data refreshes on appear
- Pull-to-refresh gesture supported
- Upcoming load updates every 30 seconds via WebSocket

**API Call - GET /home/dashboard**

```
Method: GET
URL: https://api.skylara.app/api/v1/home/dashboard
Query Parameters:
  ?dzId=dz_abc123
Headers:
  Authorization: Bearer {access_token}

Success Response (200 OK):
{
  "success": true,
  "dashboard": {
    "user": {
      "id": "user_7f8a9b0c1d2e3f4g",
      "firstName": "Ali",
      "lastName": "Fouad",
      "avatar": "https://cdn.skylara.app/avatars/user_7f8a9b0c1d2e3f4g.jpg",
      "lastGreeting": "Good Morning, Ali"
    },
    "dz": {
      "id": "dz_abc123",
      "name": "Skydive Arizona",
      "status": "OPEN",
      "distanceFromUser": 12.5,
      "address": "4125 Maricopa County..."
    },
    "account": {
      "balance": {
        "amount": 1250.00,
        "currency": "AED"
      },
      "tickets": [
        {
          "type": "FULL_ALTITUDE_150_PACK",
          "available": 2,
          "total": 10
        },
        {
          "type": "FULL_ALTITUDE_260",
          "available": 1,
          "total": 5
        }
      ]
    },
    "checkInStatus": "CHECKED_OUT",
    "upcomingLoad": {
      "id": "load_001",
      "aircraft": "SD 5",
      "loadNumber": 7,
      "scheduledTime": "2026-04-09T11:30:00Z",
      "jumpType": "FS",
      "formation": "FS",
      "groupId": "group_BM6_1",
      "exitOrder": 12,
      "slots": {
        "filled": 5,
        "total": 8
      },
      "jumpersInGroup": ["Ali Fouad", "John Smith"]
    },
    "notifications": {
      "unreadCount": 2,
      "latest": [
        {
          "id": "notif_001",
          "type": "LOAD_REMINDER",
          "title": "Your load boards in 1 hour",
          "timestamp": "2026-04-09T10:30:00Z"
        }
      ]
    }
  }
}
```

**WebSocket Real-Time Updates:**

```
Connected to: /dz/{dzId}/broadcasts
Listening for:
1. LOAD_STATUS_CHANGED → Update upcoming load card
2. BALANCE_CHANGED → Update balance display
3. TICKET_EXPIRED → Update tickets display
4. WEATHER_HOLD_ACTIVATED → Show warning banner
5. EMERGENCY_ALERT → Show red emergency banner

Example Payload:
{
  "eventType": "LOAD_STATUS_CHANGED",
  "loadId": "load_001",
  "newStatus": "BOARDING",
  "timeToBoarding": "15 minutes",
  "affectedUsers": ["user_7f8a9b0c1d2e3f4g"]
}
```

---

### 3.1.2 Multi-DZ Support

**User with Multiple DZs:**

1. **DZ Selector Dropdown:**
   - User's DZs listed: "Skydive Arizona", "Skydive Elsinore", "Phoenix Skydiving"
   - Current DZ highlighted
   - Distance from current location shown for each
   - Last visited date: "Visited 2 days ago"

2. **Switching DZ:**
   - User taps different DZ
   - Confirmation modal: "Switch to {DZ Name}?"
   - "Cancel" / "Switch" buttons
   - On switch: HomeScreen reloads with new DZ data
   - Check-in/out status resets (check-in is per-DZ)

3. **Default DZ:**
   - User's profile has "defaultDZ" field
   - App starts with this DZ on launch
   - Can be changed in settings

---

### 3.2 STAFF DASHBOARD (DZ_MANAGER & MANIFEST_STAFF VIEW)

**Screen Name:** `StaffDashboardScreen`

**Access:** Staff login → StaffDashboardScreen

**Layout Structure:**

1. **Header:**
   - DZ name: "Skydive Arizona"
   - Current time: "8:09 AM"
   - Status: "Operations Open" (green) / "Operations Closed" (red)

2. **Quick Stats Bar:**
   - Jumpers Checked In: "12"
   - Jumpers in Air: "8"
   - Active Loads: "2"
   - Pending Waivers: "3"

3. **Manifest Board (embedded, live-updating):**
   - Multi-load view showing current loads
   - Horizontal scroll between loads
   - Each load shows:
     - Aircraft & Load #: "SD 5 7"
     - Time to departure: "-2 Minutes" (countdown)
     - Status badge: "BOARDING" / "ON_CALL" / "OPEN"
     - Jumper rows (see Section 5.2 for detailed layout)

4. **Check-In Queue Panel:**
   - "Checked In (12)" tab
   - Recently checked-in jumpers
   - Quick manifest action (swipe to add to load)

5. **Action Buttons:**
   - "New Load" button → Create new load
   - "Weather Update" button → Update weather hold
   - "Emergency" button (red) → Send SOS
   - "Settings" button → Staff settings

6. **Bottom Tab Navigation:**
   - Dashboard (active)
   - Manifest Board
   - Check-In Queue
   - Staff Settings

---

### 3.2.1 Real-Time Staff Updates

**WebSocket Subscriptions (Staff):**

```
Channels:
1. /dz/{dzId}/loads → LOAD_STATUS_CHANGED, LOAD_CREATED, LOAD_CANCELLED
2. /dz/{dzId}/checkins → USER_CHECKED_IN, USER_CHECKED_OUT
3. /dz/{dzId}/weather → WEATHER_ALERT, WEATHER_HOLD_ACTIVATED
4. /dz/{dzId}/emergencies → EMERGENCY_ALERT_RECEIVED
5. /dz/{dzId}/operations → OPERATIONS_STATUS_CHANGED

Example: Load Status Change
{
  "eventType": "LOAD_STATUS_CHANGED",
  "loadId": "load_001",
  "previousStatus": "OPEN",
  "newStatus": "LOCKED",
  "timestamp": "2026-04-09T08:30:00Z",
  "manifestCount": 8
}

Staff Action: Automatically update manifest board, move load to "LOCKED" section
```

---

## PART 4: WEATHER SYSTEM

### 4.1 WEATHER WIDGET - HOME DASHBOARD

**Location:** HomeScreen, below DZ selector

**Widget Layout:**

```
┌─────────────────────────────────┐
│  Today    Mar 9, 2026           │
│  ☁  29°C  Wind: 12 mph NW      │
│                                 │
│  Jumpability: ██████░░░░        │
│  8am-6pm Timeline               │
└─────────────────────────────────┘
```

**Elements:**
- Date: "Today, Mar 9, 2026"
- Current condition icon (☀/☁/🌧)
- Temperature: "29°C"
- Wind speed & direction: "12 mph NW"
- Jumpability bar (0-100% filled, color-coded):
  - Green (90-100%): Excellent
  - Green (70-89%): Good
  - Yellow (50-69%): Marginal
  - Red (0-49%): No-go
- Timeline bar (8am-6pm) showing hourly condition colors

**Tap Actions:**
- Tap widget → Navigate to FullWeatherScreen
- Tap timeline bar → Jump to hourly details for that time

**API Call - GET /weather/dz/{dzId}/current**

```
Method: GET
URL: https://api.skylara.app/api/v1/weather/dz/dz_abc123/current
Headers:
  Authorization: Bearer {access_token}

Success Response (200 OK):
{
  "success": true,
  "weather": {
    "dzId": "dz_abc123",
    "timestamp": "2026-04-09T08:09:00Z",
    "current": {
      "temperature": 29,
      "temperatureUnit": "C",
      "condition": "PARTLY_CLOUDY",
      "conditionIcon": "partly-cloudy",
      "windSpeed": 12,
      "windDirection": "NW",
      "windSpeedUnit": "mph",
      "humidity": 45,
      "cloudCover": 40,
      "visibility": 10
    },
    "jumpability": {
      "score": 82,
      "category": "GOOD",
      "reason": "Winds favorable, clear skies"
    },
    "trend": "IMPROVING",
    "weatherHold": {
      "active": false,
      "reason": null,
      "activatedAt": null,
      "expectedClearTime": null
    },
    "source": "open-meteo.com",
    "retrievedAt": "2026-04-09T08:09:00Z"
  }
}
```

---

### 4.2 FULL WEATHER SCREEN

**Screen Name:** `WeatherScreen`

**Layout:**

1. **Current Conditions Section:**
   - Large condition icon (48x48)
   - Temperature: "29°C"
   - Condition: "Partly Cloudy"
   - Wind: "12 mph NW"
   - Humidity: "45%"
   - Cloud cover: "40%"
   - Visibility: "10 km"

2. **Jumpability Score:**
   - Large circular progress indicator (80 size)
   - Center text: "82"
   - Outer ring color: Green
   - Below: "GOOD CONDITIONS" label
   - Explanation: "Winds favorable, clear skies, ideal for formations"

3. **Trend Indicator:**
   - Arrow: ↑ (improving), ↓ (worsening), → (stable)
   - Text: "Improving over next 2 hours"
   - Color: Green/Yellow/Red

4. **Day Selector:**
   - Horizontal scroll: Previous day | Today (highlighted) | Tomorrow | Day +2 | Day +3
   - Tap to switch day

5. **Hourly Forecast:**
   - Grid of hourly boxes (8am - 6pm, 12 hours)
   - Each hour shows: Time | Condition Icon | Wind Speed | Temp
   - Color background indicates jumpability (green/yellow/red)
   - Tap hour → Show detailed popup for that hour

6. **Detailed Hourly Modal (on tap):**

```
Time: 11:00 AM
Condition: Partly Cloudy
Temperature: 31°C
Wind: 14 mph NW (↑ increasing)
Cloud Cover: 35%
Humidity: 40%
Jumpability: GOOD (85%)
Suitable for: FS, Freefly, Solo
Risky for: Canopy Flocking, High Pull
```

7. **Weather Alert Banner (if active):**
   - Red background: "⚠ WEATHER HOLD ACTIVE"
   - Reason: "High winds expected 2-4 PM"
   - Expected clear time: "Clear at 4:30 PM"
   - Dismiss button (only for athlete; staff can modify)

8. **Source Attribution:**
   - "Weather data from open-meteo.com"
   - "Updated at 8:09 AM"
   - Manual refresh button

---

### 4.3 WEATHER HOLD ACTIVATION (STAFF ONLY)

**Trigger:** DZ_MANAGER or PLATFORM_ADMIN in StaffDashboardScreen

**Action 1: Activate Weather Hold**

```
Button: "Activate Weather Hold" (in Settings)
Modal:
  Title: "Activate Weather Hold"
  Reason dropdown: "High Winds / Low Visibility / Severe Weather / Maintenance / Other"
  Expected Clear Time: Date/time picker
  Notes: Text input "Expected to clear around 4:30 PM"
  Buttons: "Cancel" / "Activate"

API Call - POST /weather/dz/{dzId}/hold-activate
{
  "reason": "HIGH_WINDS",
  "expectedClearTime": "2026-04-09T16:30:00Z",
  "notes": "Winds gusting 25+ mph",
  "activatedBy": "user_staff123"
}

Success: Weather hold active, broadcasts to all users at DZ
```

**WebSocket Broadcast:**

```
Channel: /dz/{dzId}/broadcasts
Event: WEATHER_HOLD_ACTIVATED

Payload:
{
  "eventType": "WEATHER_HOLD_ACTIVATED",
  "dzId": "dz_abc123",
  "reason": "HIGH_WINDS",
  "expectedClearTime": "2026-04-09T16:30:00Z",
  "notes": "Winds gusting 25+ mph",
  "activatedAt": "2026-04-09T08:45:00Z",
  "activatedBy": {
    "name": "John Manager",
    "role": "DZ_MANAGER"
  }
}

User's Athlete App Receives:
1. Weather banner turns red
2. Toast notification: "⚠ Weather hold activated"
3. Load Builder button disabled
4. Check-in button shows "Weather Hold" blocking status
```

**Action 2: Release Weather Hold**

```
Button: "Release Weather Hold" (visible when hold active)
Modal:
  Title: "Release Weather Hold?"
  Message: "Operations will resume immediately"
  Buttons: "Cancel" / "Release"

API Call - POST /weather/dz/{dzId}/hold-release
{
  "releasedBy": "user_staff123"
}

WebSocket Broadcast - WEATHER_HOLD_RELEASED
```

---

### 4.4 AUTO-WEATHER-HOLD (Future Feature)

**Rule-Based Hold:**

```
If weather conditions exceed thresholds:
  - Wind speed > 20 mph → Auto-hold
  - Cloud base < 2000 ft → Auto-hold
  - Visibility < 3 km → Auto-hold

Staff notified, can override if conditions acceptable
```

---

## PART 5: LOAD BOARD & MANIFEST

### 5.1 ATHLETE LOAD LIST SCREEN

**Screen Name:** `LoadListScreen` (athlete)

**Navigation:** HomeScreen → "My Loads" tile OR Bottom nav → [TBD]

**Layout:**

1. **Header:**
   - "My Loads" title
   - Filter toggle: "Today" / "All" / "Past Week"
   - Sort toggle: "Next Departure" / "Status"

2. **Load Cards List (vertical scroll):**

   For each load user is manifested on:

   ```
   ┌────────────────────────────────┐
   │ SD 5 - Load 7                  │
   │ FS Formation                   │
   │ Scheduled: 11:30 AM            │
   │ Status: ON_CALL (green badge)  │
   │                                │
   │ Slots: 5/8 (group of 3)        │
   │ Jump Type: Full Alt 260        │
   │ Pay: Block Ticket              │
   │                                │
   │ [View Details] [Move Load]     │
   └────────────────────────────────┘
   ```

   **Per-Load Card Elements:**
   - Aircraft & Load #: "SD 5 - Load 7" (large, bold)
   - Formation Type: "FS" with icon
   - Scheduled Time: "11:30 AM" with countdown badge
   - Status Badge (color-coded):
     - OPEN: Blue
     - FILLING: Purple
     - LOCKED: Orange
     - THIRTY_MIN: Yellow
     - TEN_MIN: Red
     - BOARDING: Dark Red
     - AIRBORNE: Gray
     - LANDED: Light Gray
   - Jump Type: "Full Altitude 260"
   - Payment Method: "Block Ticket"
   - Jumpers in Group: Small avatars (max 3 shown, "+2 more" if > 3)
   - Action Buttons:
     - "View Details" → LoadDetailScreen
     - "Move" → Swap to different load
     - "Remove" (slide to reveal) → Unmanifest

3. **If No Loads Manifested:**
   - Empty state: "No loads assigned"
   - Friendly illustration
   - "Start Load Builder" button
   - Subtitle: "Create a team and join a load"

**Time Badge Color Coding:**
- Green: 30+ minutes to departure
- Yellow: 10-30 minutes to departure
- Red: <10 minutes to departure
- Pulsing Red: <5 minutes (boarding imminent)

---

### 5.1.1 Load Detail Screen (Athlete)

**Screen Name:** `LoadDetailScreen`

**Triggered:** Tap "View Details" on load card

**Layout:**

1. **Load Header:**
   - Aircraft: "SD 5"
   - Load #: "7"
   - Scheduled Time: "11:30 AM" (countdown: "35 minutes 21 seconds")
   - Status badge: "ON_CALL"

2. **Load Vitals Section:**
   - Slots: "5/8 (group of 3)"
   - Formation: "FS"
   - Jump Type: "Full Altitude 260"
   - Load Master: "John Smith" (tap → view profile)
   - Manifesting Close Time: "11:15 AM"
   - Exit Order: "12" (with visual order diagram)

3. **Jumpers in Group:**
   - Avatar + Name for each:
     - "Ali Fouad (you)"
     - "Marcus Johnson"
     - "Sarah Williams"
   - Checkmarks/status icons:
     - ✓ Checked in
     - ⏳ Checked out
     - ℹ Not yet checked in

4. **Payment Summary:**
   - Your payment: "Block Ticket (Full Altitude 260)"
   - Status: "Confirmed"

5. **Action Buttons:**
   - "Move to Different Load" → LoadSelectorScreen
   - "Remove Me" → Confirmation → Unmanifest

6. **CG Check Section (if available):**
   - CG Status: "PENDING" / "PASS" / "MARGINAL" / "FAIL"
   - CG Weight: "545 lbs"
   - CG percent: "32%"
   - Last updated: "8 minutes ago"
   - "View CG Details" link → Shows full CG breakdown per person

7. **Exit Order Diagram:**
   - Visual representation of aircraft seating
   - Color-coded jumpers
   - Exit sequence numbers
   - Exit group assignments (e.g., "BM6-1")

---

### 5.2 STAFF MANIFEST BOARD (Live)

**Screen Name:** `ManifestBoardScreen` (staff only)

**Access:** Bottom nav → "Manifest Board"

**Inspired by:** Burble DZM integration (video reference)

**Layout:**

1. **Load Carousel (horizontal scroll):**
   - Shows 1-3 loads simultaneously
   - Each load column shows:

   ```
   ┌──────────────────┐
   │ SD 5 - Load 7    │
   │ Scheduled: 11:30 │
   │ Status: ON_CALL  │
   │ -2 Minutes       │
   │ Load Master: JS  │
   │                  │
   │ [Jumpers List]   │
   │ ...              │
   └──────────────────┘
   ```

2. **Per-Load Column Content:**

   **Column Header:**
   - Aircraft: "SD 5"
   - Load #: "7"
   - Scheduled Time: "11:30 AM"
   - Countdown Timer: "-2 Minutes" (red if < 10 min)
   - Load Master name: "John Smith" (tap → select different LM)
   - Status Badge: Color-coded

   **Jumper Rows (scrollable within column):**
   - Each row: Avatar | Name | License | Group | Jump Type | Status

   Example rows:
   ```
   ✓ Ali Fouad          | C      | BM6-1 | FS   | ✓
   ✓ Marcus Johnson    | Adv    | BM6-1 | FS   | ✓
   ✓ Sarah Williams    | C      | BM6-1 | FS   | ✓
    (3 slots filled)
   
   [Empty Slot]        | -      | -     | -    | -
   [Empty Slot]        | -      | -     | -    | -
   (2 slots open, blue = available)
   ```

   **Row Elements Per Jumper:**
   - Name: Tappable (view profile)
   - License Level: "C / Adv / Coach / *SD Tra" (color-coded)
   - Group Assignment: "BM6-1, BM1-1, CCB-1, JAM-1"
   - Jump Type: "FS / WS-1 / Solo / AFF"
   - Status Icon:
     - ✓ Checked in
     - ⏳ Not checked in (yellow)
     - ⚠ Issue/attention needed (red)
   - Swipe right → Quick actions: Move, Remove
   - Tap row → View jumper profile / modify assignment

3. **Bottom Toolbar (above keyboard):**

   **Left Section:**
   - Aircraft Filter: "All ▼" (dropdown: All / SD 5 / C-130 / etc.)

   **Center Section:**
   - Column Display Options: ⚙ (gear icon)
     - Toggles: Display Student, Display Slot Number, Display Alternate Name
     - Font Size slider: Small / Medium / Large

   **Right Section:**
   - Refresh button (circular arrow)
   - Aerial View button (map icon) → "View jump run & landing patterns"

4. **Secondary Tabs (below manifest):**
   - "Check-In Queue" → List of checked-in users not yet manifested
   - "Available Jumpers" → All checked-in users ready to manifest
   - "Pending Waivers" → Users with issues blocking manifestation

---

### 5.2.1 Manifest Board - Real-Time WebSocket Updates

**Staff Receives:**

```
Channel: /dz/{dzId}/manifest
Listening for:
1. LOAD_STATUS_CHANGED
2. JUMPER_MANIFESTED
3. JUMPER_UNMANIFESTED
4. JUMPER_CHECKED_IN
5. CG_CHECK_COMPLETED
6. LOAD_MASTER_ASSIGNED
7. LOAD_CREATED
8. LOAD_CANCELLED

Example: JUMPER_MANIFESTED
{
  "eventType": "JUMPER_MANIFESTED",
  "loadId": "load_001",
  "jumperId": "user_7f8a9b0c1d2e3f4g",
  "jumperName": "Ali Fouad",
  "groupId": "group_BM6_1",
  "jumpType": "FS",
  "cgUpdated": true,
  "timestamp": "2026-04-09T08:12:00Z"
}

Staff Board Updates:
1. Jumper row appears in load column
2. Jumper assigned to group (visual highlight)
3. Group count increments
4. CG is recalculated, badge updates
5. Animation: Jumper slides in, glow effect
```

---

### 5.3 LOAD LIFECYCLE STATE MACHINE

**Load States (Transition Diagram):**

```
OPEN
  ├─→ User manifests
  ├─→ CG checked
  └─→ (manual trigger or auto at T-30 min)
      ↓
FILLING
  ├─→ More users manifest/unmanifest
  ├─→ CG updates
  └─→ (manual trigger or auto when full/locked)
      ↓
LOCKED
  ├─→ No new users can manifest (read-only mode)
  ├─→ Existing manifests can remove
  └─→ (auto at T-30 min)
      ↓
THIRTY_MIN
  ├─→ Warning notifications sent
  ├─→ "Manifesting window closing" alert
  └─→ (auto at T-20 min)
      ↓
TWENTY_MIN
  ├─→ Load manifest board locked (no changes)
  ├─→ Equipment check required
  └─→ (auto at T-10 min)
      ↓
TEN_MIN
  ├─→ Final boarding call
  ├─→ Push notification: "Final boarding in 10 minutes"
  └─→ (auto at T-5 min or manual boarding trigger)
      ↓
BOARDING
  ├─→ Jumpers boarding aircraft
  ├─→ Equipment final check
  └─→ (auto at takeoff time or manual trigger)
      ↓
AIRBORNE
  ├─→ Aircraft in air, exits occurring
  ├─→ Dropzone staff monitor (no UI changes)
  └─→ (auto at landing time or manual trigger)
      ↓
LANDED
  ├─→ Aircraft has landed
  ├─→ Staff initiate pack-up/cleanup
  └─→ (auto at +15 min or manual complete trigger)
      ↓
COMPLETE
  ├─→ Load finalized in system
  ├─→ Adds to user logbook
  ├─→ Charges applied if per-jump payment
  └─→ (terminal state)

Alternative Path:
Any state → CANCELLED (if weather, emergency, equipment failure)
            ├─→ Notification sent to all manifested
            └─→ Refunds/credits processed
```

**Automatic Transitions:**
- OPEN → FILLING (when first jumper manifests)
- FILLING → LOCKED (manually by staff, or auto when full)
- LOCKED → THIRTY_MIN (T-30 before scheduled time)
- THIRTY_MIN → TWENTY_MIN (T-20)
- TWENTY_MIN → TEN_MIN (T-10)
- TEN_MIN → BOARDING (T-5 or manual)
- BOARDING → AIRBORNE (manual or T+5 min)
- AIRBORNE → LANDED (T+30 min or manual)
- LANDED → COMPLETE (T+15 min or manual)

**Cancellation Rules:**
- Load can be cancelled before BOARDING by DZ_MANAGER
- Users receive notification with reason
- Automatic refunds processed
- Load removed from all user schedules

---

### 5.4 TIME COUNTDOWN BADGES

**Displayed on:** Load cards, manifest board, dashboard

**Color & Text Rules:**

```
Status | Minutes to Departure | Badge Color | Badge Text | Animation
─────────────────────────────────────────────────────────────
OPEN | 60+ | Blue | "35 min" | None
       | 30-60 | Blue | "35 min" | None
       |
FILLING | 30-60 | Blue | "35 min" | None
        | 20-30 | Yellow | "22 min" | Fade in/out
        |
LOCKED | 20-30 | Yellow | "22 min" | Fade
       | 10-20 | Orange | "12 min" | Pulse
       |
THIRTY_MIN | 20-30 | Yellow | "25 min" | Pulse
           | 10-20 | Orange | "15 min" | Pulse
           |
TWENTY_MIN | 10-20 | Orange | "15 min" | Pulse
           | 5-10 | Red | "8 min" | Pulse
           |
TEN_MIN | 5-10 | Red | "7 min" | Pulse (fast)
        | 0-5 | Red | "2 min" | Pulse (very fast)
        |
BOARDING | 0 | Dark Red | "Boarding" | None
         | -5 to 0 | Dark Red | "Boarding" | None
         |
AIRBORNE | - | Gray | "In Air" | None
         |
LANDED | - | Light Gray | "Landed" | None
```

---

### 5.5 MULTI-AIRCRAFT, MULTI-LOAD HORIZONTAL SCROLL

**Feature:** Staff can view multiple loads simultaneously by swiping horizontally

**Implementation:**

```
LoadCarousel Component:
├─ Loads: [load_001, load_002, load_003]
├─ Current Index: 0 (load_001)
├─ Visible Loads: Depends on screen width
│  - iPad: 3 loads visible
│  - iPhone: 1.5 loads visible
├─ Swipe Left: Scroll to next load
├─ Swipe Right: Scroll to previous load
├─ Dot Indicators: Show current load position
└─ Snap-to-Grid: Smooth scrolling with snap effect
```

**Example:**
- Staff sees: "SD 5 Load 7" (BOARDING) | "SD 5 Load 8" (OPEN)
- Swipes left
- Now sees: "SD 5 Load 8" (OPEN) | "C-130 Load 1" (FILLING)

**API Call - GET /loads/dz/{dzId}/active**

```
Method: GET
URL: https://api.skylara.app/api/v1/loads/dz/dz_abc123/active
Headers:
  Authorization: Bearer {access_token}
  X-Role: MANIFEST_STAFF

Success Response (200 OK):
{
  "success": true,
  "loads": [
    {
      "id": "load_001",
      "aircraft": "SD 5",
      "loadNumber": 7,
      "scheduledTime": "2026-04-09T11:30:00Z",
      "status": "BOARDING",
      "loadMaster": "John Smith",
      "jumperCount": 5,
      "capacity": 8,
      "cgStatus": "PASS",
      "jumpersManifested": [
        {
          "id": "user_7f8a9b0c1d2e3f4g",
          "name": "Ali Fouad",
          "license": "CATEGORY_B",
          "groupId": "group_BM6_1",
          "jumpType": "FS",
          "checkedIn": true
        }
      ]
    }
  ]
}
```

---

### 5.6 LOAD DETAIL VIEW (STAFF)

**Screen Name:** `LoadDetailStaffScreen`

**Triggered:** Tap load column header in manifest board

**Layout:**

1. **Load Header:**
   - Aircraft: "SD 5"
   - Load #: "7"
   - Scheduled Time: "11:30 AM" (countdown)
   - Status: "BOARDING"

2. **Load Controls:**
   - "Change Load Master" button
   - "Change Status" dropdown (for manual state transitions)
   - "Cancel Load" button (red)
   - "Print Manifest" button

3. **CG Section:**
   - CG Status: "PASS" (green) / "MARGINAL" (yellow) / "FAIL" (red)
   - Total Weight: "545 lbs"
   - CG Percent: "32%"
   - Min/Max CG Range: "28% - 35%"
   - "View Detailed CG Breakdown" link

4. **Jumper List:**
   - Table: Name | License | Group | Jump Type | Weight | Status
   - Each row tappable
   - Drag-to-reorder (for exit order)
   - Swipe to remove

5. **Equipment Check:**
   - Checkboxes: "All checked in", "All equipped", "All briefed"
   - Staff initials required before boarding

6. **Briefing Notes:**
   - Text field: Pre-filled with standard briefing template
   - "Send Briefing to Jumpers" button (broadcasts via push)

---

### 5.7 EXIT ORDER & EXIT GROUPS

**Definition:**
- Exit Order: Numeric sequence (1, 2, 3...) in which groups exit aircraft
- Exit Groups: Named formations (BM6-1, CCB-1, JAM-1, etc.)
- CG considerations: Weight distribution for aircraft balance

**Display on Manifest Board:**

```
Exit Order 1 (BM6-1) - FS Formation
├─ Ali Fouad (88 lbs)
├─ Marcus Johnson (92 lbs)
└─ Sarah Williams (85 lbs)
Total: 265 lbs

Exit Order 2 (BM1-1) - Solo
└─ John Smith (95 lbs)
```

**Exit Order Diagram (LoadDetailScreen):**

```
Aircraft (Top-Down View):
┌──────────────────────┐
│  Cockpit    Pilot    │
├──────────────────────┤
│ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ │  ← Jumper Seats
│ 1 2 3 4 5 6 7 8 9 10 │  ← Seat Numbers
│                      │
│  Exit: Left / Right  │
│  Jump Master on board│
└──────────────────────┘

Color Coding:
🔵 Exit Order 1 (BM6-1)
🟢 Exit Order 2 (BM1-1)
🟡 Exit Order 3 (Solos)
⚪ Empty Seats
```

**User Action - Manual Reorder:**

1. Staff long-presses jumper row
2. Drag handle appears (≡ icon)
3. Staff drags jumper up/down in order
4. CG recalculated on drop
5. If CG fails: Red warning "CG FAIL - Reorder required"
6. Updated exit order broadcasts to all manifested jumpers

**API Call - PATCH /loads/{loadId}/manifest/reorder**

```
Method: PATCH
URL: https://api.skylara.app/api/v1/loads/load_001/manifest/reorder
Headers:
  Authorization: Bearer {access_token}
  X-Role: MANIFEST_STAFF

Request Body:
{
  "exitOrder": [
    {"userId": "user_7f8a9b0c1d2e3f4g", "exitSequence": 1},
    {"userId": "user_marcus123", "exitSequence": 2},
    {"userId": "user_sarah456", "exitSequence": 3}
  ]
}

Success Response (200 OK):
{
  "success": true,
  "load": {
    "id": "load_001",
    "exitOrder": [...],
    "cgStatus": "PASS",
    "cgPercent": 32
  }
}
```

---

### 5.8 CG CHECK FLOW

**CG = Center of Gravity Calculation**

**CG Check Timing:**
- Calculated automatically when jumper manifests
- Recalculated when jumper unmanifests
- Recalculated when exit order changes
- Manual "Recalculate CG" button for staff

**CG Calculation (Backend Logic):**

```
For each jumper in manifest:
  weight = jumper.weight (in lbs)
  seatPosition = jumper.seatNumber
  
totalWeight = sum(all jumper weights)
cgMoment = sum(weight × seatPosition) / totalWeight
cgPercent = (cgMoment - aircraftDatum) / meanAerodynamicChord × 100

Aircraft Specs (example - SD 5):
  datum = 120"
  MAC = 24"
  minCG = 25%
  maxCG = 35%
  capacity = 8 jumpers, 1000 lbs max

CG Status:
  if cgPercent < minCG: "FAIL - Too Forward"
  if cgPercent > maxCG: "FAIL - Too Aft"
  if minCG <= cgPercent <= maxCG: "PASS"
  if 28% <= cgPercent <= 32%: "PASS (Ideal)"
```

**CG Display on Manifest:**

```
Load 7 Status:
CG: 32% ✓ PASS
Weight: 545 lbs (capacity 1000 lbs)
Forward: 30" | Aft: 35" | Range: [25%-35%]
```

**CG Failure Resolution:**

```
Scenario: CG is 24% (Too Forward)
Message: "CG FAIL - Weight distribution too forward (24%). Reorder jumpers to shift weight aft."

Staff Actions:
1. Drag heavier jumpers toward rear seats
2. Drag lighter jumpers toward forward seats
3. Recalculate CG (automatic on drop)
4. When CG passes: Badge turns green "PASS"

Alternative: Remove jumper
- Staff swipes jumper row right
- "Remove" button appears
- Tap → Jumper removed, CG recalculates
```

**Marginal CG:**

```
Status: MARGINAL (if 26%-27% or 34%-35%)
Message: "CG is marginal (26%). Consider reordering for safety margin."
Color: Yellow badge
Staff Action: Can proceed with yellow warning, or reorder
```

---

### 5.9 DISPLAY OPTIONS (STAFF)

**Location:** Manifest board bottom toolbar → ⚙ (gear icon)

**Options Available:**

1. **Display Student (Toggle):**
   - Default: ON
   - Effect: Shows student jumpers (license = AFF/STUDENT) with special badge
   - Off: Hides students from view (staff focus only)

2. **Display Slot Number (Toggle):**
   - Default: OFF
   - Effect: Shows aircraft seat number for each jumper ("Seat 5")
   - On: Adds column "Seat #" to jumper rows

3. **Display Alternate Name (Toggle):**
   - Default: OFF
   - Effect: Shows member ID in addition to name ("Ali Fouad #0245")
   - On: Displays both legal name and alt name (if provided)

4. **Font Size Slider:**
   - Range: Small / Medium / Large / Extra Large
   - Default: Medium
   - Effect: Scales entire manifest board text
   - Applies to: Jumper names, license levels, group IDs, timestamps

5. **Rotate for Portrait/Landscape:**
   - Manifest automatically reflows for orientation
   - Landscape: Shows more columns (license, group, jump type, status)
   - Portrait: Shows essential columns (name, license)

**API Call - POST /staff/preferences/manifest-display**

```
Method: POST
URL: https://api.skylara.app/api/v1/staff/preferences/manifest-display
Headers:
  Authorization: Bearer {access_token}

Request Body:
{
  "displayStudent": true,
  "displaySlotNumber": false,
  "displayAlternateName": false,
  "fontSize": "MEDIUM"
}

Response: Preferences saved to server, synced across staff devices
```

---

---

## PART 6: LOAD BUILDER & SELF-MANIFEST

## 6.1 Load Builder Entry Point

**Screen: Load Builder Hub**
- Top: "Load Builder" header with date/time
- Tabs: [Teams] [History] [Add Me]
- Bottom bar (persistent): "Select Load" | "Message" | "Scan QR"
- Active load indicator: "Load #12345 | Status: FILLING | 8/20 slots"

**Initial Load**
```
GET /api/v1/dz/:dzId/loads
Query: status=OPEN,FILLING&limit=50
Response: {
  loads: [{
    loadId, status, slotsCurrent, slotsMax, jumpType,
    departureTime, aircraft, createdAt
  }],
  teams: [{ teamId, name, members: [] }],
  userTeams: [{ teamId, name }]
}
```

**WebSocket Subscribe**
```
ws://api.skylara.io/ws/v1/dz/:dzId/loads
Message: {
  type: 'SUBSCRIBE',
  filter: 'status=OPEN,FILLING'
}
Incoming: load.updated, load.slots_changed, team.created
```

---

## 6.2 Teams Tab - Create & Manage Teams

**Screen: Teams Tab Layout**
```
┌─────────────────────────────────┐
│ Load Builder > Teams             │
├─────────────────────────────────┤
│ [+ Create New Team]              │
├─────────────────────────────────┤
│ Team: "Sky Legends"              │
│ Members: 4                        │
│ Formation: FS-4WAY               │
│ ┌──────────────────────────────┐ │
│ │ • Alice (Full Alt 150)       │ │
│ │ • Bob (Full Alt 260 Pack)    │ │
│ │ • Carol (Freefly)            │ │
│ │ • Dave (Solo)                │ │
│ │                              │ │
│ │ [Edit] [Clear] [Select Load] │ │
│ └──────────────────────────────┘ │
│                                  │
│ Team: "CRW Crew"                 │
│ Members: 2                        │
│ Formation: CRW                    │
│ [Edit] [Clear] [Select Load]     │
└─────────────────────────────────┘
```

**Action: Create New Team**
- Button tap: modal appears
- Input: Team name (required), description (optional)
- Action: [Create]
```
POST /api/v1/dz/:dzId/teams
Body: {
  name: "Sky Legends",
  description: "Regular Friday crew"
}
Response: {
  teamId: "tm_abc123",
  userId: "usr_xyz789",
  createdAt: "2026-04-09T14:22:00Z",
  members: []
}
```

**WebSocket Event (creator receives)**
```
{
  type: 'team.created',
  teamId: 'tm_abc123',
  name: 'Sky Legends'
}
```

**Action: Edit Team**
- Tap [Edit] on existing team
- Modal: name, description, member list with remove buttons
- Reorder via drag-and-drop (optional)
```
PATCH /api/v1/dz/:dzId/teams/:teamId
Body: {
  name: "Sky Legends Pro",
  description: "Updated crew"
}
```

**Action: Clear Team**
- Tap [Clear]: confirmation dialog "Remove all members?"
- Removes all members but keeps team config
```
DELETE /api/v1/dz/:dzId/teams/:teamId/members
Response: { success: true, teamId }
```

---

## 6.3 History Tab - Past Team Configurations

**Screen: History Tab Layout**
```
┌─────────────────────────────────┐
│ Load Builder > History           │
├─────────────────────────────────┤
│ Filter: [This Month] [All Time]  │
│ Sort: [Most Recent] [By Team]    │
├─────────────────────────────────┤
│ 2026-04-08 "Sky Legends"         │
│ Jumped: FS-4WAY, Full Alt 150    │
│ Load #12340, Status: LANDED      │
│ [Reuse This Setup]               │
│                                  │
│ 2026-04-05 "CRW Crew"            │
│ Jumped: CRW, Full Alt 260        │
│ Load #12330, Status: COMPLETE    │
│ [Reuse This Setup]               │
│                                  │
│ 2026-03-28 "Solo Jump"           │
│ Jumped: Solo, Full Alt 150 Pack  │
│ Load #12310, Status: COMPLETE    │
│ [Reuse This Setup]               │
└─────────────────────────────────┘
```

**Load History**
```
GET /api/v1/dz/:dzId/user/jump-history
Query: limit=20&offset=0&status=LANDED,COMPLETE
Response: {
  jumps: [{
    jumpId, loadId, teamId, formation, jumpType,
    paymentMethod, status, completedAt
  }],
  pagination: { total, hasMore }
}
```

**Action: Reuse Setup**
- Tap [Reuse This Setup]
- Pre-populates Teams tab with same members, jump types, formation
- Skips payment method (fresh selection on manifest)
```
POST /api/v1/dz/:dzId/teams/:teamId/reuse
Query: fromJumpId=:jumpId
Response: {
  teamId: "tm_new456",
  name: "Sky Legends (restored)",
  members: [...],
  formation: "FS-4WAY"
}
```

---

## 6.4 Add Jumper to Team - Search, QR, Member ID

**Screen: Add Member to Team Modal**
```
┌──────────────────────────────────┐
│ Add Jumper to "Sky Legends"       │
├──────────────────────────────────┤
│ Search: [________________]        │
│ or                               │
│ [📱 Scan QR Code]                │
│ or                               │
│ [#ID Entry]                      │
├──────────────────────────────────┤
│ Search Results:                  │
│ □ Alice (#12001) ⭐ Friend       │
│ □ Bob Smith (#12002)             │
│ □ Robert B. (#12003)             │
│                                  │
│ [Add Selected] [Cancel]          │
└──────────────────────────────────┘
```

**Action: Text Search**
```
GET /api/v1/dz/:dzId/users/search
Query: q="alice"&limit=10
Response: {
  users: [{
    userId, displayName, memberId, avatar,
    isFriend: true, lastJumpDate
  }]
}
```

**Action: QR Code Scan**
- Opens camera
- QR format: `skylara://user/:userId/:dzId`
```
Decode QR → extract userId
GET /api/v1/users/:userId
Response: {
  userId, displayName, memberId, isFriend
}
```

**Action: Member ID Entry**
- User enters "#12001"
```
GET /api/v1/dz/:dzId/users/by-id
Query: memberId=12001
Response: { userId, displayName, isFriend }
```

**Action: Add Selected**
- Multiple checkboxes allowed
- Each jumper added to team
```
POST /api/v1/dz/:dzId/teams/:teamId/members
Body: {
  userIds: ["usr_alice", "usr_bob"]
}
Response: {
  teamId,
  members: [{
    userId, displayName, position: 0,
    joinedAt
  }]
}
```

**WebSocket (all team members notified)**
```
{
  type: 'team.member_added',
  teamId: 'tm_abc123',
  userId: 'usr_alice',
  displayName: 'Alice'
}
```

---

## 6.5 Jump Type Selection Per Jumper

**Screen: Jump Type Selector**
```
┌──────────────────────────────────┐
│ Set Jump Type for Alice           │
├──────────────────────────────────┤
│ ◉ Full Altitude 150              │
│   $35 | wallet/card/block ticket │
│   Includes: gear, coaching       │
│                                  │
│ ○ Full Altitude 150 Pack         │
│   $45 | wallet/card/block ticket │
│   Includes: gear, coaching, pack │
│                                  │
│ ○ Full Altitude 260              │
│   $50 | wallet/card/block ticket │
│                                  │
│ ○ Full Altitude 260 Pack         │
│   $60 | wallet/card/block ticket │
│                                  │
│ [Confirm] [Skip]                 │
└──────────────────────────────────┘
```

**Pricing Lookup**
```
GET /api/v1/dz/:dzId/jump-types
Response: {
  jumpTypes: [{
    typeId, name, basePrice, includePack,
    insurance, groundFee, equipment
  }]
}
```

**Action: Select Jump Type**
- Radio button selection
- Display price breakdown

**Persist to Team Member**
```
PATCH /api/v1/dz/:dzId/teams/:teamId/members/:userId
Body: {
  jumpType: "FULL_ALT_150_PACK",
  jumpTypePrice: 45.00
}
Response: { userId, jumpType, jumpTypePrice }
```

---

## 6.6 Payment Method Selection Per Jumper

**Screen: Payment Method Selector**
```
┌──────────────────────────────────┐
│ Payment for Alice - Full Alt 150  │
│ Total: $35.00                    │
├──────────────────────────────────┤
│ Auto-selected options (in order):│
│                                  │
│ ◉ Block Ticket (3 available)     │
│   Use: FA-150-Block-#12         │
│   Balance after: 2 remaining    │
│                                  │
│ ○ Wallet                         │
│   Balance: $150.00              │
│   Balance after: $115.00        │
│                                  │
│ ○ Credit Card                    │
│   •••• 4242 (Visa)              │
│   Charge: $35.00                │
│                                  │
│ [Confirm] [Change]              │
└──────────────────────────────────┘
```

**Auto-Select Logic Flow**
```
1. Check: blockTicketBalance > jumpTypePrice
   → Select block ticket, show remaining
2. Else check: walletBalance > jumpTypePrice
   → Select wallet, show remaining
3. Else check: savedCard exists
   → Select card, show charge
4. Else: REQUIRE_PAYMENT (show add card form)
```

**Fetch Payment Options**
```
GET /api/v1/users/:userId/payment-methods
Response: {
  blockTickets: [{
    ticketId, type, price, expiresAt, balance
  }],
  wallet: { balance, currency },
  cards: [{
    cardId, last4, brand, expiresAt
  }]
}
```

**Action: Select Method**
```
PATCH /api/v1/dz/:dzId/teams/:teamId/members/:userId
Body: {
  paymentMethod: "BLOCK_TICKET",
  blockTicketId: "bt_fa150_12",
  paymentAmount: 35.00
}
```

**Error: Insufficient Funds**
- Show: "Insufficient wallet balance. Add funds or use card?"
- Offer: [Top Up Wallet] [Add Card] [Cancel]

---

## 6.7 Formation Selection (25+ Types)

**Screen: Formation Picker**
```
┌──────────────────────────────────┐
│ Set Formation for Team            │
├──────────────────────────────────┤
│ [All] [FS] [Freefly] [CRW] [Solo]│
├──────────────────────────────────┤
│ ◉ FS-4WAY                        │
│   4 person, 12 min avg           │
│   Current team: 4 members ✓      │
│                                  │
│ ○ FS-8WAY                        │
│   8 person, 15 min avg           │
│   Current team: 4 members ✗      │
│                                  │
│ ○ Freefly                        │
│   2+ person, flexible            │
│   Current team: 4 members ✓      │
│                                  │
│ ○ CRW                            │
│   2+ person, with rigs           │
│   Current team: 4 members ✓      │
│                                  │
│ ○ Solo                           │
│   1 person                        │
│   Current team: 4 members ✗      │
│                                  │
│ ○ Tandem                         │
│ ○ AFF                            │
│ ○ Wingsuit                       │
│ ○ XRW                            │
│ ○ VFS                            │
│ ... (more types)                 │
│                                  │
│ [Confirm] [Skip]                 │
└──────────────────────────────────┘
```

**Formations List (25+ supported)**
```
FS: FS-4WAY, FS-8WAY, FS-16WAY, FS-BigWay
Freefly: Freefly, Freefly-4WAY
Solo: Solo, HopNPop, High Pull
Wingsuit: Wingsuit, Wingsuit-Track
XRW: XRW (wing related work)
VFS: VFS (vertical freeflying)
HyBrid: HyBrid (formation hybrid)
Angle: Angle (angle formation)
Freestyle: Freestyle, Sky Surfing
Tracking: Tracking
CRW: CRW (canopy relative work)
Canopy: Canopy Flocking
MFS: MFS (multi-freefall sport)
Accuracy: Accuracy
Tandem: Tandem
AFF: AFF (accelerated freefall)
SWOOP: SWOOP
POND_SWOOP: Pond Swoop
```

**Fetch Formations**
```
GET /api/v1/dz/:dzId/formations
Response: {
  formations: [{
    formationId, name, minMembers, maxMembers,
    avgDuration, requirements, category
  }]
}
```

**Validation: Member Count Check**
```
IF team.members.length < formation.minMembers
  → Show warning (red X)
  → Button disabled or show "Add members" prompt
```

**Action: Confirm Formation**
```
PATCH /api/v1/dz/:dzId/teams/:teamId
Body: {
  formation: "FS_4WAY",
  formationId: "fm_fs4way"
}
Response: { teamId, formation, members }
```

---

## 6.8 Select Load from Available Loads

**Screen: Load Selection Modal**
```
┌──────────────────────────────────┐
│ Select Load for "Sky Legends"     │
│ Formation: FS-4WAY | 4 members   │
├──────────────────────────────────┤
│ Filter: [All] [OPEN] [FILLING]   │
│ Sort: [Departure] [Availability] │
├──────────────────────────────────┤
│ LOAD #12345 (FILLING)            │
│ Aircraft: Cessna 208             │
│ Departure: 14:30 UTC             │
│ Slots: 14/20 available           │
│ FS-4WAY slots: 2 available ✓     │
│ [Select]                         │
│                                  │
│ LOAD #12346 (OPEN)               │
│ Aircraft: King Air               │
│ Departure: 15:00 UTC             │
│ Slots: 8/16 available            │
│ FS-4WAY slots: 0 available ✗     │
│ [Select]                         │
│                                  │
│ LOAD #12347 (FILLING)            │
│ Aircraft: Cessna 208             │
│ Departure: 15:45 UTC             │
│ Slots: 18/20 available           │
│ FS-4WAY slots: 4 available ✓     │
│ [Select]                         │
│                                  │
│ [Cancel]                         │
└──────────────────────────────────┘
```

**Fetch Available Loads**
```
GET /api/v1/dz/:dzId/loads
Query: status=OPEN,FILLING&formation=FS_4WAY
Response: {
  loads: [{
    loadId, status, slotsCurrent, slotsMax,
    aircraft, departureTime, formationSlots,
    createdAt
  }]
}
```

**Formation Slot Availability**
- Each load has slots reserved by formation type
- Example: Load #12345 has 4 FS-4WAY slots, 3 Solo slots, 5 CRW slots

```
GET /api/v1/dz/:dzId/loads/:loadId/formation-slots
Response: {
  loadId,
  formationAllocations: [{
    formation, slotsAllocated, slotsFilled, available
  }]
}
```

**Action: Select Load**
```
POST /api/v1/dz/:dzId/loads/:loadId/manifest
Body: {
  teamId: "tm_abc123",
  formation: "FS_4WAY",
  members: ["usr_alice", "usr_bob", "usr_carol", "usr_dave"]
}
Response: { manifestId, loadId, status: "PENDING_CHECKIN" }
```

**WebSocket (load updated for all subscribers)**
```
{
  type: 'load.slots_changed',
  loadId: 'ld_12345',
  slotsCurrent: 18,
  slotsMax: 20,
  availableByFormation: {...}
}
```

---

## 6.9 Check-in Validation ("Not Checked In" Warning)

**Manifest Submitted - Validation Screen**
```
┌──────────────────────────────────┐
│ Check-in Validation              │
│ Load #12345 | Departure: 14:30   │
├──────────────────────────────────┤
│ ⚠️  NOT CHECKED IN:               │
│                                  │
│ □ Alice (#12001)                │
│ □ Bob (#12002)                  │
│ ☑ Carol (#12003) [checked in]   │
│ □ Dave (#12004)                 │
│                                  │
│ Carol is ready. Others must     │
│ check in at the desk.           │
│                                  │
│ [Keep All & Proceed]            │
│ [Keep Only Checked In]          │
│ [Cancel Manifest]               │
└──────────────────────────────────┘
```

**Validation Check**
```
GET /api/v1/dz/:dzId/loads/:loadId/checkin-status
Query: manifestId=:manifestId
Response: {
  manifestId,
  members: [{
    userId, displayName, checkedIn: true/false,
    checkinTime
  }],
  allChecked: false
}
```

**Action: Keep All & Proceed**
- Team proceeds to payment confirmation despite unchecked members
- Send notifications to unchecked members
```
POST /api/v1/dz/:dzId/loads/:loadId/manifest/:manifestId/confirm
Body: { action: "PROCEED_WITH_ALL" }
Response: { manifestId, status: "CONFIRMED", paymentDue: 140.00 }
```

**WebSocket (unchecked members notified)**
```
{
  type: 'manifest.pending_checkin',
  loadId: 'ld_12345',
  manifestId: 'mf_xyz789',
  checkinDeadline: "2026-04-09T14:25:00Z"
}
```

**Action: Keep Only Checked In**
- Remove unchecked members, refund their payments
```
POST /api/v1/dz/:dzId/loads/:loadId/manifest/:manifestId/confirm
Body: { action: "REMOVE_UNCHECKED" }
Response: {
  manifestId,
  status: "CONFIRMED",
  removedMembers: ["usr_alice", "usr_dave"],
  refundedAmount: 70.00
}
```

**Refund Processed**
```
POST /api/v1/dz/:dzId/refunds
Body: {
  manifestId,
  userIds: ["usr_alice", "usr_dave"],
  reason: "UNCHECKED_MANIFEST_REMOVAL"
}
```

---

## 6.10 Load Assignment Confirmation

**Screen: Final Confirmation**
```
┌────────────────────────────────────┐
│ Load Assignment Confirmed            │
├────────────────────────────────────┤
│ Load #12345                         │
│ Status: FILLING                     │
│ Slots: 18/20                        │
│ Countdown: 12m 34s until departure  │
├────────────────────────────────────┤
│ Your Team: "Sky Legends"            │
│ Formation: FS-4WAY                  │
│ Members:                            │
│  ☑ Alice - Full Alt 150 - $35      │
│  ☑ Bob - Full Alt 150 Pack - $45   │
│  ☑ Carol - Freefly - $35           │
│  ☑ Dave - Solo - $30               │
│                                    │
│ Total: $145.00                      │
│ Payment: Block Ticket (3 used)      │
│          Wallet: $35               │
│                                    │
│ [Proceed to Payment] [Modify] [Exit]│
└────────────────────────────────────┘
```

**State in Database**
```
manifest:
{
  manifestId: "mf_xyz789",
  loadId: "ld_12345",
  teamId: "tm_abc123",
  status: "CONFIRMED",
  members: [...],
  formation: "FS_4WAY",
  totalAmount: 145.00,
  paymentBreakdown: {
    blockTickets: 70.00,
    wallet: 35.00,
    card: 40.00
  },
  createdAt: "2026-04-09T14:17:23Z"
}
```

**WebSocket (all team members + load manifest board)**
```
{
  type: 'manifest.confirmed',
  manifestId: 'mf_xyz789',
  loadId: 'ld_12345',
  members: [...],
  totalAmount: 145.00
}
```

---

## 6.11 Move to Different Load Flow

**Scenario: User wants to switch loads after initial selection**

**Screen: Switch Load Modal**
```
┌────────────────────────────────────┐
│ Move Team to Different Load          │
│ Current: Load #12345 (FILLING)       │
├────────────────────────────────────┤
│ ⚠️  This will remove you from        │
│ Load #12345 and charge cancellation  │
│ fee: $5.00 (if applicable)           │
│                                    │
│ Available loads with FS-4WAY slots: │
│                                    │
│ LOAD #12346 (FILLING)               │
│ Aircraft: King Air                  │
│ Departure: 15:30 UTC                │
│ FS-4WAY slots: 4 available ✓        │
│ [Move to #12346]                    │
│                                    │
│ LOAD #12347 (OPEN)                  │
│ Aircraft: Cessna 208                │
│ Departure: 16:00 UTC                │
│ FS-4WAY slots: 2 available ✓        │
│ [Move to #12347]                    │
│                                    │
│ [Cancel] [Keep Current Load]        │
└────────────────────────────────────┘
```

**Action: Move to Different Load**
```
POST /api/v1/dz/:dzId/loads/:newLoadId/manifest
Body: {
  manifestId: "mf_xyz789",
  teamId: "tm_abc123",
  moveFromLoadId: "ld_12345",
  action: "MOVE"
}
Response: {
  newManifestId: "mf_new123",
  oldLoadId: "ld_12345",
  newLoadId: "ld_12346",
  cancellationFee: 5.00,
  status: "CONFIRMED"
}
```

**Database Changes**
```
OLD manifest (ld_12345):
  status: "CANCELLED",
  cancelledAt: "2026-04-09T14:20:00Z",
  cancelledReason: "MOVED_TO_LOAD",
  refundAmount: 140.00

NEW manifest (ld_12346):
  manifestId: "mf_new123",
  loadId: "ld_12346",
  status: "CONFIRMED",
  ...
```

**WebSocket Events**
```
Load #12345 (old):
{
  type: 'manifest.removed',
  manifestId: 'mf_xyz789',
  loadId: 'ld_12345',
  reason: 'MOVED_TO_DIFFERENT_LOAD'
}

Load #12346 (new):
{
  type: 'manifest.added',
  manifestId: 'mf_new123',
  loadId: 'ld_12346'
}
```

---

## 6.12 Remove from Load Flow

**Scenario: User cancels their manifest**

**Screen: Remove Confirmation**
```
┌────────────────────────────────────┐
│ Remove from Load #12345              │
│ Departure: 14:30 UTC (10m away)     │
├────────────────────────────────────┤
│ Team: "Sky Legends" (4 members)      │
│ Total: $145.00                       │
│                                    │
│ Refund Policy:                      │
│ • >30 min before: Full refund       │
│ • 30-10 min: 50% refund             │
│ • <10 min: No refund               │
│                                    │
│ You will receive:                   │
│ Refund: $72.50 (50%)                │
│ (Cancellation fee: $72.50)           │
│                                    │
│ [Confirm Remove] [Cancel]           │
└────────────────────────────────────┘
```

**Action: Confirm Remove**
```
POST /api/v1/dz/:dzId/loads/:loadId/manifest/:manifestId/cancel
Body: {
  manifestId: "mf_xyz789",
  reason: "USER_REQUESTED"
}
Response: {
  manifestId,
  status: "CANCELLED",
  refundAmount: 72.50,
  refundMethod: "WALLET",
  processedAt: "2026-04-09T14:20:15Z"
}
```

**Refund Calculation**
```
timeUntilDeparture = departureTime - now
IF timeUntilDeparture > 30 min:
  refundAmount = totalAmount * 1.0
ELSE IF timeUntilDeparture > 10 min:
  refundAmount = totalAmount * 0.5
ELSE:
  refundAmount = 0
```

**Refund Processing**
```
POST /api/v1/dz/:dzId/refunds
Body: {
  manifestId: "mf_xyz789",
  amount: 72.50,
  method: "WALLET",
  reason: "MANIFEST_CANCELLATION"
}
Response: {
  refundId: "rf_abc123",
  status: "PROCESSED",
  walletCredited: 72.50
}
```

**WebSocket (Load manifest board + cancelling users)**
```
{
  type: 'manifest.cancelled',
  manifestId: 'mf_xyz789',
  loadId: 'ld_12345',
  refundAmount: 72.50,
  cancelledBy: 'usr_alice'
}
```

**Update Load Availability**
```
{
  type: 'load.slots_changed',
  loadId: 'ld_12345',
  slotsCurrent: 16,
  slotsMax: 20,
  formationSlots: {
    'FS_4WAY': { allocated: 4, filled: 0, available: 4 }
  }
}
```

---

## PART 7: PAYMENT & WALLET SYSTEM

## 7.1 Wallet Dashboard

**Screen: Wallet Hub**
```
┌────────────────────────────────────┐
│ Wallet & Payment                     │
├────────────────────────────────────┤
│ Current Balance: $150.00             │
│ [+ Top Up] [View History]            │
├────────────────────────────────────┤
│ Block Tickets                        │
│ □ FA-150-Block (2 remaining, $70)   │
│ □ FA-260-Block (0 remaining, $0)    │
│ □ FA-150-Pack-Block (1 remaining)   │
│ □ FA-260-Pack-Block (0 remaining)   │
│                                    │
│ [Buy More Block Tickets]            │
├────────────────────────────────────┤
│ Saved Payment Methods               │
│ □ Visa •••• 4242                   │
│ □ MasterCard •••• 5555             │
│ [Add Card] [Manage]                │
│                                    │
│ [Settings]                         │
└────────────────────────────────────┘
```

**Fetch Wallet**
```
GET /api/v1/users/:userId/wallet
Response: {
  walletId: "wl_user123",
  userId: "usr_xyz789",
  balance: 150.00,
  currency: "USD",
  lastUpdated: "2026-04-09T14:10:00Z",
  blockTickets: [{
    ticketId, type, price, expiresAt, balance,
    purchasedAt
  }],
  paymentMethods: [{
    methodId, type, last4, brand, expiresAt
  }]
}
```

**Action: Top Up Wallet**
- Tap [+ Top Up]
- Modal appears with amount selector

---

## 7.2 Block Ticket Purchase Flow

**Screen: Buy Block Tickets**
```
┌────────────────────────────────────┐
│ Buy Block Tickets                    │
├────────────────────────────────────┤
│ Select Ticket Type:                 │
│                                    │
│ ◉ Full Altitude 150 (FA-150)        │
│   Price per ticket: $35             │
│   Save per jump: $0 (standard)      │
│                                    │
│ ○ Full Altitude 150 Pack (FA-150-P) │
│   Price per ticket: $45             │
│   Save per jump: $0 (standard)      │
│                                    │
│ ○ Full Altitude 260 (FA-260)        │
│   Price per ticket: $50             │
│   Save per jump: $0 (standard)      │
│                                    │
│ ○ Full Altitude 260 Pack (FA-260-P) │
│   Price per ticket: $60             │
│   Save per jump: $0 (standard)      │
│                                    │
│ Quantity: [5] tickets               │
│ Total: $175.00                      │
│                                    │
│ [Buy Now] [Cancel]                 │
└────────────────────────────────────┘
```

**Fetch Ticket Types**
```
GET /api/v1/dz/:dzId/block-tickets/types
Response: {
  ticketTypes: [{
    typeId: "bt_fa150",
    name: "Full Altitude 150",
    basePrice: 35.00,
    currency: "USD",
    validDays: 365,
    includePack: false
  }],
  bulkPricing: [
    { quantity: 5, discount: 0.00 },
    { quantity: 10, discount: 5.00 },
    { quantity: 20, discount: 10.00 }
  ]
}
```

**Action: Purchase Block Tickets**
```
POST /api/v1/users/:userId/block-tickets/purchase
Body: {
  typeId: "bt_fa150",
  quantity: 5,
  paymentMethodId: "pm_card4242"
}
Response: {
  purchaseId: "bp_abc123",
  ticketIds: ["bti_1", "bti_2", "bti_3", "bti_4", "bti_5"],
  amount: 175.00,
  status: "COMPLETED",
  expiresAt: "2027-04-09T23:59:59Z"
}
```

**Payment Processing**
```
POST /api/v1/payments/process
Body: {
  paymentMethodId: "pm_card4242",
  amount: 175.00,
  currency: "USD",
  description: "5x Full Altitude 150 Block Tickets"
}
Response: {
  paymentId: "py_xyz789",
  status: "APPROVED",
  transactionId: "txn_stripe_1234567890"
}
```

**WebSocket (user receives)**
```
{
  type: 'wallet.block_tickets_added',
  ticketCount: 5,
  type: 'FA_150',
  balance: 175.00,
  expiresAt: "2027-04-09T23:59:59Z"
}
```

---

## 7.3 Ticket Types and Pricing Structure

**Pricing Table**
```
┌──────────────────────────────────────────────┐
│ Ticket Type          │ Price │ Pack │ Valid   │
├──────────────────────────────────────────────┤
│ FA-150               │ $35   │ No   │ 365d   │
│ FA-150-Pack          │ $45   │ Yes  │ 365d   │
│ FA-260               │ $50   │ No   │ 365d   │
│ FA-260-Pack          │ $60   │ Yes  │ 365d   │
│ Tandem               │ $150  │ N/A  │ 365d   │
│ AFF-Level-1          │ $80   │ N/A  │ 180d   │
│ AFF-Level-2          │ $85   │ N/A  │ 180d   │
│ AFF-Level-3          │ $90   │ N/A  │ 180d   │
│ AFF-Level-4          │ $95   │ N/A  │ 180d   │
└──────────────────────────────────────────────┘
```

**Bulk Pricing (per jump type)**
```
Quantity   Discount    Total (FA-150)
5          0%          $175
10         5%          $332.50
20         10%         $630
50         15%         $1,487.50
```

**DZ-Specific Pricing Override**
```
GET /api/v1/dz/:dzId/pricing
Response: {
  dzId: "dz_12345",
  ticketPricing: [{
    ticketType, basePrice, dzOverridePrice,
    bulkDiscounts: [...]
  }]
}
```

---

## 7.4 Payment During Manifesting (Auto-Select Logic)

**Payment Selection Flow (as seen in 6.6)**
```
Priority order:
1. Block Tickets (if balance > charge amount)
2. Wallet balance (if balance > charge amount)
3. Credit Card on file
4. Add new card (if none saved)
```

**API: Get Payment Options**
```
GET /api/v1/users/:userId/payment-options
Query: dzId=:dzId&amount=35.00
Response: {
  recommendedMethod: "BLOCK_TICKET",
  options: [
    {
      method: "BLOCK_TICKET",
      ticketId: "bti_123",
      ticketType: "FA_150",
      available: true,
      balance: 5
    },
    {
      method: "WALLET",
      available: true,
      balance: 150.00
    },
    {
      method: "CREDIT_CARD",
      cardId: "pm_4242",
      last4: "4242",
      available: true
    }
  ]
}
```

**Confirm Payment Selection**
```
POST /api/v1/dz/:dzId/loads/:loadId/manifest/:manifestId/payment
Body: {
  manifestId: "mf_xyz789",
  paymentBreakdown: [
    {
      method: "BLOCK_TICKET",
      ticketId: "bti_123",
      amount: 70.00
    },
    {
      method: "WALLET",
      amount: 35.00
    },
    {
      method: "CREDIT_CARD",
      cardId: "pm_4242",
      amount: 40.00
    }
  ],
  totalAmount: 145.00
}
Response: {
  manifestId,
  status: "PAYMENT_CONFIRMED",
  paymentId: "py_abc123",
  breakdown: [...]
}
```

---

## 7.5 Transaction History (List, Filters)

**Screen: Transaction History**
```
┌────────────────────────────────────┐
│ Transaction History                  │
├────────────────────────────────────┤
│ Filter: [All] [Payments] [Refunds]  │
│         [This Month] [3 Months]     │
│ Sort: [Recent] [Amount]             │
├────────────────────────────────────┤
│ 2026-04-09 | Load #12345 Jump       │
│ -$145.00 (COMPLETED)                │
│ Block Ticket: -$70 | Wallet: -$35   │
│ Card: -$40                          │
│ [Details]                           │
│                                    │
│ 2026-04-08 | Block Ticket Purchase  │
│ -$175.00 (COMPLETED)                │
│ 5x FA-150 tickets                   │
│ [Details]                           │
│                                    │
│ 2026-04-05 | Refund - Cancelled     │
│ +$72.50 (COMPLETED)                │
│ Load #12330 | 50% refund            │
│ [Details]                           │
│                                    │
│ 2026-04-01 | Wallet Top Up          │
│ -$100.00 (COMPLETED)                │
│ Via Visa •••• 4242                 │
│ [Details]                           │
│                                    │
│ [Load More]                        │
└────────────────────────────────────┘
```

**Fetch Transaction History**
```
GET /api/v1/users/:userId/transactions
Query: limit=20&offset=0&type=ALL&dateRange=90d
Response: {
  transactions: [{
    transactionId, type, amount, currency, status,
    timestamp, loadId, description,
    breakdown: [{method, amount}]
  }],
  pagination: { total, hasMore }
}
```

**Filter Options**
```
type: PAYMENT, REFUND, TOP_UP, BLOCK_TICKET_PURCHASE
status: COMPLETED, PENDING, FAILED, CANCELLED
dateRange: TODAY, THIS_WEEK, THIS_MONTH, 3_MONTHS, ALL
```

**Action: View Details**
```
GET /api/v1/users/:userId/transactions/:transactionId
Response: {
  transactionId,
  type,
  amount,
  breakdown: [{method, amount, ticket/cardId}],
  manifest: {loadId, formation, members},
  refundPolicy: {...},
  status,
  receiptUrl
}
```

---

## 7.6 Account Summary (Ticket Breakdown)

**Screen: Account Summary**
```
┌────────────────────────────────────┐
│ Account Summary                     │
├────────────────────────────────────┤
│ Wallet Balance:                     │
│ $150.00 USD                        │
│                                    │
│ Block Tickets (Active):             │
│ FA-150               2 remaining     │
│ FA-150-Pack          1 remaining     │
│ FA-260               0 remaining     │
│ FA-260-Pack          0 remaining     │
│ Total ticket value: $140.00         │
│                                    │
│ Expired Tickets:                    │
│ FA-150 (exp 2026-02-01)  0         │
│                                    │
│ Pending Payments:                   │
│ None                               │
│                                    │
│ Monthly Spend (This Month):         │
│ Jumps: 3                           │
│ Total: $450.00                     │
│ Average per jump: $150.00          │
│                                    │
│ [Download PDF] [Export CSV]        │
└────────────────────────────────────┘
```

**Fetch Account Summary**
```
GET /api/v1/users/:userId/account-summary
Response: {
  wallet: { balance: 150.00, currency: "USD" },
  blockTickets: [{
    type, quantity, expiresAt, totalValue
  }],
  expiredTickets: [{...}],
  monthlyStats: {
    jumpCount, totalSpent, averagePerJump,
    period: "2026-04"
  },
  totalValue: 290.00
}
```

---

## 7.7 Refund Flow

**Refund Policy Display**
```
Refund Policy:
• >30 min before departure: 100% refund
• 30-10 min before departure: 50% refund
• <10 min before departure: No refund
• DZ-specific policies may override
```

**Action: Request Refund (post-jump, within 7 days)**
```
POST /api/v1/dz/:dzId/refunds/request
Body: {
  manifestId: "mf_xyz789",
  loadId: "ld_12345",
  reason: "INJURED_ON_GROUND",
  notes: "Sprained ankle during gearing"
}
Response: {
  refundRequestId: "rr_abc123",
  status: "PENDING_REVIEW",
  requestedAmount: 145.00,
  submittedAt: "2026-04-09T14:22:00Z"
}
```

**DZ Staff Review Refund**
```
POST /api/v1/dz/:dzId/refunds/:refundRequestId/approve
Body: {
  approvedAmount: 145.00,
  reason: "INJURY_CLAIM_APPROVED"
}
Response: {
  refundRequestId,
  status: "APPROVED",
  approvedAmount: 145.00,
  processedAt: "2026-04-09T15:00:00Z"
}
```

**Process Refund to Wallet**
```
POST /api/v1/dz/:dzId/refunds/:refundRequestId/process
Body: {
  refundMethod: "WALLET",
  notes: "Approved refund"
}
Response: {
  refundId: "rf_xyz789",
  status: "COMPLETED",
  amount: 145.00,
  walletBalance: 295.00
}
```

**WebSocket (user receives)**
```
{
  type: 'refund.processed',
  refundId: 'rf_xyz789',
  amount: 145.00,
  walletBalance: 295.00,
  method: 'WALLET'
}
```

---

## 7.8 Payment Gateway Error Handling

**Error: Card Declined**
```
POST /api/v1/payments/process (fails)
Response: {
  error: "CARD_DECLINED",
  code: "decline_code_generic_decline",
  message: "Your card was declined. Please try another payment method.",
  suggestedAction: "TRY_DIFFERENT_CARD"
}

Screen Update:
"Your payment was declined. Please use a different card or payment method."
[Add New Card] [Use Wallet] [Use Block Ticket] [Cancel]
```

**Error: Insufficient Funds**
```
Response: {
  error: "INSUFFICIENT_FUNDS",
  required: 35.00,
  available: 15.00,
  shortfall: 20.00
}

Screen Update:
"Your wallet doesn't have enough funds. Shortfall: $20.00"
[Top Up Wallet] [Use Card] [Use Block Ticket] [Cancel]
```

**Error: Block Ticket Expired**
```
GET /api/v1/users/:userId/payment-options
Response: {
  blockTickets: [{
    ticketId, status: "EXPIRED",
    expirationDate: "2026-02-01"
  }]
}

Screen: Exclude from options, show warning
"This block ticket expired on Feb 1, 2026. Buy new tickets."
```

**Error: Network Timeout During Payment**
```
POST /api/v1/payments/process (timeout after 30s)
Response: {
  error: "PAYMENT_PROCESSING_TIMEOUT",
  message: "Payment processing took longer than expected. Checking status...",
  checkStatusUrl: "/api/v1/payments/:paymentId/status"
}

Action: Poll status endpoint every 2 seconds
GET /api/v1/payments/:paymentId/status
Until: status = APPROVED/DECLINED/PROCESSING
```

**Error: DZ Payment Gateway Down**
```
POST /api/v1/dz/:dzId/loads/:loadId/manifest/:manifestId/payment
Response: {
  error: "DZ_PAYMENT_UNAVAILABLE",
  message: "Payment processing is temporarily unavailable. Try again in 5 minutes.",
  status: 503
}

Action: Queue payment for retry
POST /api/v1/dz/:dzId/loads/:loadId/manifest/:manifestId/queue-payment
Body: { retryAt: "2026-04-09T14:27:00Z" }

WebSocket notification when available:
{ type: 'payment.available_for_processing' }
```

---

## 7.9 Commission Splits

**Commission Structure**
```
Jump Revenue: $35.00 (Full Alt 150)

Distribution:
- DZ (dropzone): $15.00 (43%)
- Instructor (if present): $7.00 (20%)
- Packer (if tandem/aff): $5.00 (14%)
- Rigger: $3.00 (9%)
- Platform fee: $2.50 (7%)
- Donation to USPA: $2.50 (7%)
```

**API: Get Commission Data (for DZ admin)**
```
GET /api/v1/dz/:dzId/commissions
Query: dateRange=2026-04-01:2026-04-30
Response: {
  period: { start, end },
  totalRevenue: 4500.00,
  commissions: [{
    role, userName, jumpCount, totalEarned,
    breakdown: { instructorShare, packerShare, etc }
  }],
  dzEarnings: 1935.00
}
```

**API: Get Personal Commission**
```
GET /api/v1/users/:userId/commissions
Query: role=INSTRUCTOR&dateRange=2026-04-01:2026-04-30
Response: {
  role: "INSTRUCTOR",
  jumpCount: 15,
  totalEarned: 105.00,
  jumps: [{
    loadId, payloadAmount, commission, date
  }]
}
```

---

## 7.10 Gift Card Redemption

**Screen: Redeem Gift Card**
```
┌────────────────────────────────────┐
│ Redeem Gift Card                    │
├────────────────────────────────────┤
│ Enter code:                         │
│ [________________]                 │
│                                    │
│ [Redeem] [Cancel]                 │
│                                    │
│ Already have a gift card?          │
│ Codes are 16 characters alphanumeric
│ Example: SKYLARA-XXXX-XXXX-XXXX   │
└────────────────────────────────────┘
```

**Action: Redeem Gift Card**
```
POST /api/v1/users/:userId/gift-cards/redeem
Body: {
  code: "SKYLARA-A1B2-C3D4-E5F6"
}
Response: {
  giftCardId: "gc_xyz789",
  amount: 100.00,
  type: "WALLET_CREDIT",
  balance: 100.00,
  expiresAt: "2027-04-09T23:59:59Z",
  walletBalance: 250.00
}
```

**Error: Invalid/Expired Code**
```
Response: {
  error: "INVALID_GIFT_CARD",
  message: "This gift card code is invalid or expired."
}
```

**Error: Already Redeemed**
```
Response: {
  error: "GIFT_CARD_ALREADY_REDEEMED",
  message: "This gift card has already been redeemed.",
  redeemedBy: "some-other-user",
  redeemedAt: "2026-03-15T10:00:00Z"
}
```

**WebSocket (user receives)**
```
{
  type: 'wallet.gift_card_redeemed',
  amount: 100.00,
  walletBalance: 250.00
}
```


---

## PART 8: TRAINING & COACHING SYSTEM

## 8.1 AFF Student Progression (Levels 1-8)

**AFF Level Structure**
```
┌──────────────────────────────────────────┐
│ Level │ Skills                │ Solo?    │
├──────────────────────────────────────────┤
│ 1     │ Exit, basic freefall  │ No       │
│ 2     │ Stability, turns      │ No       │
│ 3     │ Backslide, tracking   │ No       │
│ 4     │ Formation entry       │ Partial  │
│ 5     │ Docking, spacing      │ Partial  │
│ 6     │ Complex maneuvers     │ Yes      │
│ 7     │ Altitude management   │ Yes      │
│ 8     │ Freefall mastery      │ Yes      │
└──────────────────────────────────────────┘
```

**Student Profile API**
```
GET /api/v1/dz/:dzId/students/:studentId
Response: {
  studentId, displayName, affLevel: 3,
  nextEvaluation: "2026-04-15T10:00:00Z",
  completedJumps: [
    {
      jumpId, loadId, level, instructorId,
      date, result: "PASSED|FAILED|INCOMPLETE"
    }
  ],
  currentProgress: {
    level: 3,
    skillsCompleted: ["exit", "stability", "turns"],
    skillsPending: ["backslide", "tracking"]
  }
}
```

**Student Dashboard**
```
┌────────────────────────────────────┐
│ My AFF Progress                     │
├────────────────────────────────────┤
│ Current Level: 3                    │
│ Jumps Completed: 5                  │
│ Next Evaluation: Apr 15 @ 10:00 AM │
│                                    │
│ Skills Completed:                  │
│ ✓ Exit techniques                  │
│ ✓ Stability & turns                │
│ ✓ Emergency procedures             │
│                                    │
│ Skills Pending:                    │
│ ○ Backslide maneuvers              │
│ ○ Tracking                         │
│ ○ Formation entry                  │
│                                    │
│ [Book Evaluation] [View History]   │
│ [Find Coach]                       │
└────────────────────────────────────┘
```

---

## 8.2 AFF Evaluation Flow

**Screen: Request Evaluation**
```
┌────────────────────────────────────┐
│ Request AFF Level Evaluation        │
│ Current Level: 3                    │
├────────────────────────────────────┤
│ Evaluation Type:                   │
│ ◉ Level 3 → 4 Progression          │
│ ○ Level 3 Reassessment             │
│ ○ Other                            │
│                                    │
│ Preferred Instructors:             │
│ □ John Smith (#inst_001)           │
│ □ Sarah Jones (#inst_002)          │
│                                    │
│ Preferred Dates/Times:             │
│ [Apr 15] [Apr 16] [Apr 17]         │
│ [10:00 AM] [02:00 PM]              │
│                                    │
│ [Request Evaluation]               │
└────────────────────────────────────┘
```

**API: Request Evaluation**
```
POST /api/v1/dz/:dzId/students/:studentId/evaluations
Body: {
  currentLevel: 3,
  nextLevel: 4,
  preferredInstructorIds: ["inst_001"],
  preferredDates: ["2026-04-15", "2026-04-16"],
  notes: "Ready to progress"
}
Response: {
  evaluationRequestId: "er_abc123",
  status: "AWAITING_INSTRUCTOR",
  requestedAt: "2026-04-09T14:30:00Z"
}
```

**Evaluation Session**
```
POST /api/v1/dz/:dzId/evaluations/:evaluationRequestId/schedule
Body: {
  instructorId: "inst_001",
  loadId: "ld_12345",
  scheduledAt: "2026-04-15T10:00:00Z"
}
Response: {
  evaluationId: "ev_xyz789",
  instructorId, studentId, currentLevel: 3,
  scheduledAt, status: "SCHEDULED"
}
```

**During Evaluation: Instructor Signs Off**
```
POST /api/v1/dz/:dzId/evaluations/:evaluationId/complete
Body: {
  result: "PASSED",
  skillsAssessed: ["backslide", "tracking", "formation_entry"],
  skillsCompleted: ["backslide", "tracking"],
  skillsPending: ["formation_entry"],
  notes: "Good exit, needs work on formation entry",
  instructorSignature: "base64_signature_data"
}
Response: {
  evaluationId,
  result: "PASSED",
  newLevel: 4,
  recordedAt: "2026-04-15T11:30:00Z"
}
```

**WebSocket (student receives)**
```
{
  type: 'evaluation.completed',
  evaluationId: 'ev_xyz789',
  result: 'PASSED',
  newLevel: 4,
  instructorNotes: "..."
}
```

---

## 8.3 Coaching Session Creation

**Screen: Create Coaching Session**
```
┌────────────────────────────────────┐
│ Book Coaching Session               │
│ For: Formation Flying               │
├────────────────────────────────────┤
│ Session Type:                      │
│ ◉ Pre-jump coaching (1 hour)       │
│ ○ Post-jump debrief (30 min)       │
│ ○ Video review (1-2 hours)         │
│                                    │
│ Topics:                            │
│ □ Exit techniques                  │
│ □ Freefall positioning             │
│ □ Formation entry                  │
│ □ Tracking                         │
│ □ Dock recovery                    │
│                                    │
│ Preferred Coach:                   │
│ [Search coaches...]                │
│ John Smith (FS Expert) ★★★★★      │
│                                    │
│ [Book Session]                     │
└────────────────────────────────────┘
```

**API: Create Coaching**
```
POST /api/v1/dz/:dzId/coaching-sessions
Body: {
  studentId: "usr_student1",
  coachId: "usr_coach1",
  type: "PRE_JUMP",
  duration: 60,
  topics: ["exit_techniques", "freefall_positioning"],
  notes: "Preparing for FS-4WAY jump"
}
Response: {
  coachingSessionId: "cs_abc123",
  studentId, coachId, type, status: "PENDING",
  createdAt: "2026-04-09T14:35:00Z"
}
```

**Fetch Available Coaches**
```
GET /api/v1/dz/:dzId/coaches
Query: specialty=FORMATION_FLYING&available=true
Response: {
  coaches: [{
    coachId, displayName, specialty, rating,
    reviewCount, hourlyRate, availability
  }]
}
```

---

## 8.4 Coach Scheduling Matrix

**Screen: Coach Schedule & Availability**
```
┌────────────────────────────────────┐
│ John Smith - Coach Schedule         │
│ Specialty: FS Expert               │
│ Rate: $50/hour                     │
├────────────────────────────────────┤
│ Week of Apr 7, 2026                │
│                                    │
│   MON  TUE  WED  THU  FRI  SAT SUN │
│ 08:00  ⬜  ⬜   ⬜   ⬜   ⬜  ⬜   ⬜   │
│ 09:00  ⬜  ⬜   ⬜   ⬜   ⬜  ✓ AVAIL ✓ │
│ 10:00  ⬜  ⬜   ⬜   ⬜   ⬜  ✓ AVAIL ⬜   │
│ 11:00  ⬜  ⬜   ⬜   ⬜   ⬜  ✓ AVAIL ✓ │
│ 14:00  ✓ AVAIL ⬜   ⬜   ✓ AVAIL ⬜   ⬜ │
│ 15:00  ⬜  ✓ AVAIL ⬜   ✓ AVAIL ⬜   ⬜ │
│ 16:00  ⬜  ✓ AVAIL ✓ AVAIL ⬜   ⬜   ⬜ │
│                                    │
│ Legend: ⬜ Booked  ✓ Available     │
│                                    │
│ [Select Time Slot]                │
└────────────────────────────────────┘
```

**API: Get Coach Schedule**
```
GET /api/v1/dz/:dzId/coaches/:coachId/schedule
Query: weekStart=2026-04-07
Response: {
  coachId, weekStart, hourlySlots: [{
    date, time, available: true/false,
    bookedBy: studentName (if booked)
  }]
}
```

**API: Check Availability**
```
GET /api/v1/dz/:dzId/coaches/:coachId/availability
Query: date=2026-04-12&startTime=09:00&duration=60
Response: {
  available: true,
  slot: { date, time, duration }
}
```

---

## 8.5 Coach Availability Management

**Coach Portal: Set Availability**
```
┌────────────────────────────────────┐
│ My Availability                     │
├────────────────────────────────────┤
│ Week: [◀ Week of Apr 7] [Week 14 ▶] │
│                                    │
│ Monday                             │
│ ◉ Busy                             │
│ ○ Available                        │
│                                    │
│ Tuesday                            │
│ ○ Busy                             │
│ ◉ Available                        │
│ Times: [14:00] - [17:00]          │
│ [Add another time]                │
│                                    │
│ Wednesday                          │
│ ◉ Busy                             │
│                                    │
│ [Save Availability]               │
└────────────────────────────────────┘
```

**API: Update Availability**
```
PATCH /api/v1/dz/:dzId/coaches/:coachId/availability
Body: {
  weekStart: "2026-04-07",
  slots: [{
    dayOfWeek: "TUESDAY",
    startTime: "14:00",
    endTime: "17:00",
    available: true
  }]
}
Response: {
  coachId,
  updatedSlots: [...]
}
```

**Recurring Availability Template**
```
POST /api/v1/dz/:dzId/coaches/:coachId/availability/template
Body: {
  pattern: "WEEKLY",
  startDate: "2026-04-07",
  endDate: "2026-12-31",
  schedule: {
    MONDAY: { startTime: "09:00", endTime: "17:00" },
    TUESDAY: { startTime: "14:00", endTime: "20:00" },
    WEDNESDAY: null,
    THURSDAY: { startTime: "09:00", endTime: "17:00" },
    FRIDAY: { startTime: "09:00", endTime: "17:00" },
    SATURDAY: { startTime: "08:00", endTime: "18:00" }
  }
}
Response: {
  coachId, availabilityTemplate: {...}
}
```

---

## 8.6 Student Booking Coaching

**Screen: Book Coaching Session (Student)**
```
┌────────────────────────────────────┐
│ Book Coaching with John Smith       │
│ Specialty: Formation Flying         │
│ Rating: ★★★★★ (48 reviews)         │
│ Rate: $50/hour                     │
├────────────────────────────────────┤
│ Session Details:                   │
│ Type: [Pre-Jump Coaching ▼]        │
│ Duration: [60 minutes]              │
│ Date: [Apr 12, 2026]               │
│ Time: [14:00] ✓ Available          │
│ Topics: Formation entry, dock      │
│                                    │
│ Price: $50.00                      │
│ [Pay with Wallet] [Card] [Cancel]  │
│                                    │
│ [Confirm Booking]                 │
└────────────────────────────────────┘
```

**API: Book Coaching**
```
POST /api/v1/dz/:dzId/coaching-sessions
Body: {
  studentId: "usr_student1",
  coachId: "usr_coach1",
  type: "PRE_JUMP",
  duration: 60,
  scheduledAt: "2026-04-12T14:00:00Z",
  topics: ["formation_entry", "dock"],
  paymentMethodId: "pm_wallet"
}
Response: {
  coachingSessionId: "cs_xyz789",
  status: "BOOKED",
  amount: 50.00,
  paymentProcessed: true,
  confirmationAt: "2026-04-09T14:40:00Z"
}
```

**WebSocket (coach receives)**
```
{
  type: 'coaching.session_booked',
  coachingSessionId: 'cs_xyz789',
  studentName: 'Alice',
  scheduledAt: '2026-04-12T14:00:00Z',
  duration: 60,
  topics: ['formation_entry', 'dock']
}
```

**Cancellation (student)**
```
POST /api/v1/dz/:dzId/coaching-sessions/:coachingSessionId/cancel
Body: {
  reason: "SCHEDULE_CONFLICT"
}
Response: {
  coachingSessionId,
  status: "CANCELLED",
  refundAmount: 50.00,
  processedAt: "2026-04-09T14:45:00Z"
}
```

---

## 8.7 Instructor Assignment to Load

**Load Creation - Add Instructors**
```
POST /api/v1/dz/:dzId/loads/:loadId/assign-instructors
Body: {
  instructors: [
    { instructorId: "usr_coach1", role: "SAFETY_OBSERVER" },
    { instructorId: "usr_coach2", role: "MANIFEST_CHECKER" },
    { instructorId: "usr_coach3", role: "VIDEO_CAMERAMAN" }
  ]
}
Response: {
  loadId,
  instructorAssignments: [{
    instructorId, role, assignedAt
  }]
}
```

**Instructor Dashboard - Load Assignment**
```
┌────────────────────────────────────┐
│ My Assignments Today                │
├────────────────────────────────────┤
│ Load #12345 (14:30 departure)      │
│ Aircraft: Cessna 208               │
│ My Role: Safety Observer           │
│ Students: Alice (L3), Bob (L4)     │
│ [View Load] [Accept] [Decline]    │
│                                    │
│ Load #12346 (15:15 departure)      │
│ Aircraft: King Air                 │
│ My Role: Video Cameraman           │
│ [View Load] [Accept] [Decline]    │
│                                    │
│ [Settings] [History]              │
└────────────────────────────────────┘
```

**API: Accept/Decline Assignment**
```
POST /api/v1/dz/:dzId/loads/:loadId/instructors/:instructorId/accept
Body: { action: "ACCEPT" }
Response: {
  loadId, instructorId, status: "CONFIRMED"
}
```

---

## 8.8 Post-Jump Debrief and Sign-Off

**Debrief Session (post-landing)**
```
POST /api/v1/dz/:dzId/jumps/:jumpId/debrief
Body: {
  instructorId: "usr_coach1",
  studentId: "usr_student1",
  loadId: "ld_12345",
  durationMinutes: 15,
  performanceRating: "GOOD",
  skillsAssessed: ["exit", "stability", "formation_entry"],
  skillsCompleted: ["exit", "stability"],
  skillsPending: ["formation_entry"],
  notes: "Excellent exit. Work on entry timing.",
  signature: "base64_signature"
}
Response: {
  debriefId: "db_abc123",
  recordedAt: "2026-04-09T11:45:00Z",
  status: "SIGNED"
}
```

**Debrief Screen (Instructor)**
```
┌────────────────────────────────────┐
│ Post-Jump Debrief: Alice            │
│ Load #12345 | AFF Level 3 → 4       │
├────────────────────────────────────┤
│ Performance:                       │
│ ◉ Excellent  ○ Good  ○ Fair  ○ Poor│
│                                    │
│ Skills Assessed:                   │
│ ✓ Exit techniques (PASSED)         │
│ ✓ Stability (PASSED)               │
│ ◻ Formation entry (NEEDS WORK)     │
│                                    │
│ Instructor Notes:                  │
│ [____________________________]      │
│ Excellent exit. Work on entry.     │
│                                    │
│ [Record & Sign Off]               │
│ [Save Draft]                       │
└────────────────────────────────────┘
```

**Student Views Debrief**
```
GET /api/v1/dz/:dzId/students/:studentId/debriefs/:debriefId
Response: {
  debriefId, instructorName, jumpDate,
  performanceRating, skillsAssessed, skillsCompleted,
  instructorNotes, recordedAt
}
```

---

## 8.9 Coach Earnings

**Coach Earnings Dashboard**
```
┌────────────────────────────────────┐
│ My Coaching Earnings                │
├────────────────────────────────────┤
│ This Month (April 2026):            │
│ Total Earnings: $850.00            │
│ Sessions: 17                        │
│ Average per session: $50.00        │
│                                    │
│ Breakdown by Type:                 │
│ Pre-jump coaching: $450 (9 sessions)│
│ Post-jump debrief: $250 (5 sessions)│
│ Video review: $150 (3 sessions)    │
│                                    │
│ Pending Payments:                  │
│ Apr 9-15: $200 (due Apr 20)       │
│                                    │
│ [View History] [Export]            │
│ [Payment Methods] [Tax Forms]      │
└────────────────────────────────────┘
```

**API: Get Coach Earnings**
```
GET /api/v1/users/:coachId/earnings
Query: dateRange=2026-04-01:2026-04-30
Response: {
  period: { start, end },
  totalEarnings: 850.00,
  sessionCount: 17,
  byType: [{
    type, sessionCount, totalEarnings, rate
  }],
  pendingPayment: 200.00,
  paymentSchedule: { dueDate: "2026-04-20" }
}
```

**Payout Processing**
```
POST /api/v1/users/:coachId/earnings/request-payout
Body: {
  amount: 850.00,
  paymentMethod: "BANK_TRANSFER",
  bankAccountId: "ba_xyz789"
}
Response: {
  payoutId: "po_abc123",
  amount: 850.00,
  status: "PENDING",
  estimatedArrival: "2026-04-15"
}
```

---

## 8.10 Multi-User Student ↔ Coach Communication

**In-App Messaging**
```
POST /api/v1/dz/:dzId/messages
Body: {
  senderId: "usr_student1",
  recipientId: "usr_coach1",
  type: "COACHING_INQUIRY",
  subject: "Questions about next level",
  body: "Hi John, I wanted to ask about preparing for level 4 progression...",
  relatedCoachingSessionId: "cs_xyz789"
}
Response: {
  messageId: "msg_abc123",
  conversationId: "conv_xyz789",
  sentAt: "2026-04-09T14:50:00Z"
}
```

**Conversation View (Student)**
```
┌────────────────────────────────────┐
│ Conversation with John Smith        │
├────────────────────────────────────┤
│ John Smith (Coach) - 14:30 Today   │
│ Great job on your last jump! Ready │
│ to discuss level 4 prep?           │
│                                    │
│ You - 14:35 Today                  │
│ Yes! I have some questions about   │
│ formation entry timing...          │
│                                    │
│ John Smith (Coach) - 14:40 Today   │
│ Perfect. Let's book a session for  │
│ detailed coaching. [Book Session]  │
│                                    │
│ [________________ Send]            │
└────────────────────────────────────┘
```

**Notification: Coach receives**
```
{
  type: 'message.received',
  fromUser: 'Alice',
  conversationId: 'conv_xyz789',
  preview: 'Yes! I have some questions...',
  unreadCount: 1
}
```

**Video Call Integration (optional)**
```
POST /api/v1/dz/:dzId/video-calls/initiate
Body: {
  initiatorId: "usr_coach1",
  participantId: "usr_student1",
  type: "COACHING_SESSION",
  duration: 60
}
Response: {
  videoCallId: "vc_abc123",
  callUrl: "https://skylara-video.io/vc_abc123",
  expiresAt: "2026-04-09T16:50:00Z"
}
```

**WebSocket (coach + student)**
```
{
  type: 'video_call.initiated',
  callId: 'vc_abc123',
  initiator: 'John Smith',
  callUrl: 'https://...'
}
```

---

## PART 9: SAFETY & EMERGENCY SYSTEM

## 9.1 DZ Emergency SOS Button

**Screen: DZ Emergency Dashboard (DZ Staff)**
```
┌────────────────────────────────────┐
│ DZ Emergency Control                │
├────────────────────────────────────┤
│ Status: NORMAL                     │
│                                    │
│ ┌──────────────────────────────┐  │
│ │   🆘 ACTIVATE EMERGENCY      │  │
│ │   Press and hold to confirm  │  │
│ └──────────────────────────────┘  │
│                                    │
│ Recent Incidents (this week):      │
│ □ 2026-04-08 14:35 - Minor injury │
│ □ 2026-04-07 11:20 - Canopy issue │
│                                    │
│ [View Incident Log] [Hospital Info]│
└────────────────────────────────────┘
```

**Action: Activate Emergency**
```
POST /api/v1/dz/:dzId/emergency/activate
Body: {
  activatedBy: "usr_dzstaff1",
  timestamp: "2026-04-09T15:00:00Z",
  reason: "GROUND_MEDICAL_EMERGENCY"
}
Response: {
  emergencyId: "em_xyz789",
  status: "ACTIVE",
  activatedAt: "2026-04-09T15:00:00Z"
}
```

**Immediate Actions**
1. All loads grounded immediately
2. Broadcast to all users (WebSocket)
3. Notify external emergency services
4. Display emergency contact information

---

## 9.2 Emergency Activation Broadcast

**WebSocket (all connected users)**
```
{
  type: 'emergency.activated',
  emergencyId: 'em_xyz789',
  dzId: 'dz_12345',
  status: 'ACTIVE',
  activatedAt: '2026-04-09T15:00:00Z',
  reason: 'GROUND_MEDICAL_EMERGENCY',
  message: 'DZ Emergency activated. All aircraft grounded.'
}
```

**Screen: Emergency Alert (All Users)**
```
┌────────────────────────────────────┐
│ ⚠️  DZ EMERGENCY ACTIVE ⚠️          │
│ Time: 15:00 UTC                    │
│ Reason: Ground Medical Emergency   │
│                                    │
│ ALL AIRCRAFT ARE GROUNDED          │
│ DO NOT BOARD AIRCRAFT              │
│                                    │
│ Emergency Services:                │
│ 911 (USA) / 999 (UK) / Dial       │
│ Local Emergency #                  │
│                                    │
│ DZ Emergency: +1-555-SKYLARA-911  │
│ Medical: Skylar Medical Center    │
│                                    │
│ [Acknowledge Emergency]           │
│ [Report Incident] [Get Help]      │
└────────────────────────────────────┘
```

**Push Notification (to all users)**
```
Title: "DZ Emergency Activated"
Body: "Ground medical emergency at Sky Legends DZ. All aircraft grounded."
Action: Open app, navigate to emergency dashboard
```

**Text/SMS to dropzone members**
```
FROM: SKYLARA_DZ_12345
DZ EMERGENCY: Ground medical situation at Sky Legends DZ.
All aircraft grounded. Check app for details.
```

---

## 9.3 Emergency Profile Management

**Screen: Emergency Contact Setup (User Settings)**
```
┌────────────────────────────────────┐
│ Emergency Profile                   │
├────────────────────────────────────┤
│ Primary Emergency Contact:         │
│ Name: [Sarah Johnson]              │
│ Relation: [Spouse]                 │
│ Phone: [+1-555-1234]              │
│ [Edit]                             │
│                                    │
│ Secondary Emergency Contact:       │
│ Name: [John Doe]                  │
│ Relation: [Friend]                 │
│ Phone: [+1-555-5678]              │
│ [Edit]                             │
│                                    │
│ Medical Information:               │
│ Blood Type: [O+]                   │
│ Allergies: [None]                 │
│ Medications: [Aspirin daily]      │
│ Medical Conditions: [None]         │
│                                    │
│ [Save Changes]                     │
└────────────────────────────────────┘
```

**API: Update Emergency Profile**
```
PATCH /api/v1/users/:userId/emergency-profile
Body: {
  primaryContact: {
    name: "Sarah Johnson",
    relation: "SPOUSE",
    phone: "+1-555-1234",
    email: "sarah@example.com"
  },
  secondaryContact: {
    name: "John Doe",
    relation: "FRIEND",
    phone: "+1-555-5678"
  },
  medicalInfo: {
    bloodType: "O+",
    allergies: [],
    medications: ["Aspirin daily"],
    conditions: []
  }
}
Response: { userId, emergencyProfile: {...} }
```

---

## 9.4 Incident Reporting Flow

**Incident Report (User Initiates)**
```
┌────────────────────────────────────┐
│ Report Incident                     │
├────────────────────────────────────┤
│ Incident Type:                     │
│ ◉ Medical/Injury                   │
│ ○ Equipment Malfunction            │
│ ○ Near Miss                        │
│ ○ Safety Violation                 │
│ ○ Other                            │
│                                    │
│ Severity:                          │
│ ○ Minor   ○ Moderate  ◉ Severe     │
│                                    │
│ Location:                          │
│ [Dropzone / Aircraft / Landing]   │
│                                    │
│ Involved Personnel:                │
│ • You (automatically)              │
│ □ Alice (#12001)                  │
│ □ Bob (#12002)                    │
│ □ Instructor: [Search...]         │
│                                    │
│ Incident Description:              │
│ [_____________________________]     │
│ Detailed account of what happened │
│                                    │
│ [Report Incident] [Cancel]        │
└────────────────────────────────────┘
```

**API: Report Incident**
```
POST /api/v1/dz/:dzId/incidents
Body: {
  reportedBy: "usr_alice",
  type: "MEDICAL_INJURY",
  severity: "SEVERE",
  location: "LANDING_ZONE",
  involvedPersons: ["usr_alice", "usr_bob"],
  instructorId: "usr_coach1",
  loadId: "ld_12345",
  description: "Alice landed hard and twisted ankle during flare.",
  reportedAt: "2026-04-09T11:45:00Z"
}
Response: {
  incidentId: "ic_abc123",
  status: "RECEIVED",
  caseNumber: "INC-2026-0412",
  dz: "Sky Legends DZ"
}
```

**WebSocket (DZ Safety Officer receives)**
```
{
  type: 'incident.reported',
  incidentId: 'ic_abc123',
  type: 'MEDICAL_INJURY',
  severity: 'SEVERE',
  reportedBy: 'Alice',
  reportedAt: '2026-04-09T11:45:00Z'
}
```

---

## 9.5 Incident Investigation Workflow

**Screen: Incident Investigation (DZ Staff)**
```
┌────────────────────────────────────┐
│ Incident Investigation              │
│ Case #: INC-2026-0412              │
│ Status: UNDER_REVIEW                │
├────────────────────────────────────┤
│ Reported: 2026-04-09 11:45 UTC     │
│ Type: Medical Injury (Severe)      │
│ Location: Landing Zone             │
│ Reporter: Alice (#12001)           │
│                                    │
│ Involved Personnel:                │
│ □ Alice (#12001) - Student        │
│ □ Bob (#12002) - Coach             │
│ ☑ John (Instructor)               │
│                                    │
│ Equipment Involved:                │
│ □ Parachute (#PA-1234)            │
│ □ Helmet (#HM-5678)               │
│                                    │
│ Description:                       │
│ Alice landed hard and twisted      │
│ ankle during flare...              │
│                                    │
│ Investigation:                     │
│ Status: [PENDING] [IN PROGRESS]    │
│ Assigned to: [John Smith]          │
│ Primary cause: [Unknown ...]       │
│ Contributing factors: [...]        │
│ Corrective actions: [...]          │
│                                    │
│ [Add Investigation Notes]          │
│ [Assign Investigator]              │
│ [Close Case] [Escalate]            │
└────────────────────────────────────┘
```

**API: Start Investigation**
```
POST /api/v1/dz/:dzId/incidents/:incidentId/investigate
Body: {
  investigatorId: "usr_safety1",
  primaryCause: "FLARE_TECHNIQUE_ERROR",
  contributingFactors: [
    "WIND_CONDITION",
    "JUMPER_INEXPERIENCE"
  ],
  correctiveActions: [
    "Additional flare training required",
    "Wind speed restrictions reviewed"
  ],
  notes: "Student needs coaching on flare timing."
}
Response: {
  incidentId,
  status: "INVESTIGATION_COMPLETE",
  caseClosedAt: "2026-04-10T16:00:00Z"
}
```

**Case Closure**
```
POST /api/v1/dz/:dzId/incidents/:incidentId/close
Body: {
  outcome: "RESOLVED_WITH_CORRECTIVE_ACTION",
  injuryOutcome: "MINOR_SPRAIN",
  referrals: ["MEDICAL_FOLLOWUP", "AFF_COACHING"]
}
Response: {
  incidentId,
  status: "CLOSED",
  closedAt: "2026-04-10T17:00:00Z"
}
```

---

## 9.6 Risk Assessment Scoring

**Risk Dashboard (DZ Management)**
```
┌────────────────────────────────────┐
│ Safety Risk Assessment              │
├────────────────────────────────────┤
│ Overall DZ Risk Score: 8/100 (LOW) │
│ ▮▮░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                    │
│ Components:                        │
│ Equipment Status: 2/100 (EXCELLENT)│
│ Personnel Training: 15/100 (GOOD)  │
│ Weather Conditions: 12/100 (GOOD)  │
│ Recent Incidents: 35/100 (MODERATE)│
│ Compliance: 5/100 (EXCELLENT)      │
│                                    │
│ Trend (last 30 days):              │
│ ↘ Improving (was 12/100)           │
│                                    │
│ Recommendations:                   │
│ • Increase jumper training hours   │
│ • Review flare techniques          │
│ • Upgrade aging equipment          │
│                                    │
│ [View Details] [Download Report]  │
└────────────────────────────────────┘
```

**Risk Calculation Algorithm**
```
RiskScore = (
  (IncidentFrequency × 0.40) +
  (EquipmentAge × 0.20) +
  (PersonnelExperience × 0.20) +
  (WeatherFactors × 0.15) +
  (ComplianceIssues × 0.05)
) / 100

Range: 0-100
0-10: Minimal Risk
11-25: Low Risk
26-50: Moderate Risk
51-75: High Risk
76-100: Critical Risk
```

**API: Calculate Risk Score**
```
GET /api/v1/dz/:dzId/safety/risk-assessment
Query: dateRange=2026-04-09:2026-05-09
Response: {
  overallScore: 8,
  riskLevel: "LOW",
  components: [{
    category, score, trend, recommendations
  }],
  incidents30d: 2,
  equipmentStatus: {...},
  trainingHours: 450,
  complianceStatus: "COMPLIANT"
}
```

---

## 9.7 Local Hospital Lookup

**Screen: Emergency Resources (in Emergency Mode)**
```
┌────────────────────────────────────┐
│ Nearby Medical Resources             │
│ DZ Location: Sky Legends DZ         │
│ Address: 123 Jump Lane, AnyCity    │
├────────────────────────────────────┤
│ 🏥 HOSPITALS (Ranked by Distance)   │
│                                    │
│ 1. Skylar Medical Center           │
│    Distance: 5.2 mi (8 min)       │
│    ER Bed: 24 available            │
│    Trauma Level: I                 │
│    Phone: +1-555-MEDICAL          │
│    [Get Directions]                │
│                                    │
│ 2. City General Hospital           │
│    Distance: 8.1 mi (12 min)      │
│    ER Bed: 8 available             │
│    Trauma Level: II                │
│    Phone: +1-555-CITY-GEN         │
│    [Get Directions]                │
│                                    │
│ 🚑 Nearby Paramedics               │
│    Station 5 - 2.3 mi away        │
│    Response time: ~6 minutes       │
│                                    │
│ ☎️  Emergency Services: 911        │
│                                    │
│ [Call 911] [Call Hospital]         │
│ [Share Location]                   │
└────────────────────────────────────┘
```

**API: Get Hospital Information**
```
GET /api/v1/dz/:dzId/emergency-resources
Response: {
  dzLocation: { lat, lng, address },
  hospitals: [{
    name, distance, driveTime,
    address, phone, erBeds, traumaLevel,
    coords: { lat, lng }
  }],
  paramedics: [{
    station, distance, estimatedResponse
  }],
  emergencyNumbers: {
    general: "911",
    poison: "1-800-222-1222",
    crisis: "988"
  }
}
```

**Automatic Hospital Notification (if DZ emergency activated)**
```
POST /api/v1/dz/:dzId/emergency/notify-hospitals
Body: {
  emergencyId: "em_xyz789",
  dzId: "dz_12345",
  dzLocation: { lat: 40.7128, lng: -74.0060 },
  incidentType: "MEDICAL_EMERGENCY",
  injuryCount: 1,
  estimatedSeverity: "SEVERE"
}
Response: {
  notificationsDelivered: [
    {
      hospitalName: "Skylar Medical Center",
      notifiedAt: "2026-04-09T15:00:15Z",
      status: "ACKNOWLEDGED"
    }
  ]
}
```

---

## 9.8 Multi-User Emergency Alerts

**Emergency Alert Distribution**
```
Emergency Event:
1. DZ staff member presses emergency button
2. EmergencyActivated event created
3. Multi-channel broadcast:
   - All SkyLara users at this DZ
   - Nearby emergency contacts
   - Hospital network
   - USPA database
   - Local law enforcement (optional)
```

**Channel 1: In-App Alert (all connected users)**
```
WebSocket broadcast:
{
  type: 'dz.emergency',
  emergencyId: 'em_xyz789',
  dzId: 'dz_12345',
  status: 'ACTIVE',
  timestamp: '2026-04-09T15:00:00Z'
}

Screen Update:
┌────────────────────────────────────┐
│ ⚠️  DZ EMERGENCY ACTIVE            │
│ Sky Legends DZ                      │
│ Time: 15:00 UTC                    │
│ [Acknowledge] [Get Help]           │
└────────────────────────────────────┘
```

**Channel 2: Push Notifications**
```
{
  title: "DZ Emergency - Sky Legends",
  body: "Medical emergency in progress. Check app.",
  priority: "HIGH",
  sound: "emergency_alarm",
  vibration: [200, 100, 200]
}
```

**Channel 3: SMS to Registered Contacts**
```
FROM: SKYLARA_EMERGENCY
Alert: Medical emergency at Sky Legends DZ (Apr 9, 15:00).
Local hospital: Skylar Medical Center +1-555-MEDICAL.
Download SkyLara app for updates.
```

**Channel 4: Hospital Auto-Dispatch (if injury reported)**
```
POST /api/v1/emergency/hospital-dispatch
Body: {
  emergencyId: "em_xyz789",
  dzId: "dz_12345",
  incidentType: "MEDICAL",
  estimatedSeverity: "SEVERE",
  patientCount: 1,
  dzCoordinates: { lat, lng },
  estimatedArrival: 10 (minutes)
}
Response: {
  dispatchId: "disp_xyz789",
  status: "DISPATCHED",
  ambulance: { eta: 6 }
}
```

**Updates During Emergency**
```
Real-time WebSocket updates to all users:

{
  type: 'emergency.update',
  emergencyId: 'em_xyz789',
  status: 'ACTIVE',
  ambulanceETA: 4,
  hospitalStatus: 'PREPARED',
  injuriesReported: 1,
  timestamp: '2026-04-09T15:03:45Z'
}

User screens update every 10 seconds with:
- Ambulance ETA
- Hospital readiness
- Incident status
- Instructions
```

**De-escalation & All Clear**
```
POST /api/v1/dz/:dzId/emergency/clear
Body: {
  emergencyId: "em_xyz789",
  clearedBy: "usr_dzstaff1",
  allClear: true,
  timestamp: "2026-04-09T15:45:00Z"
}
Response: {
  emergencyId,
  status: "CLEARED",
  clearedAt: "2026-04-09T15:45:00Z"
}

WebSocket notification (all users):
{
  type: 'dz.emergency_cleared',
  emergencyId: 'em_xyz789',
  clearedAt: '2026-04-09T15:45:00Z',
  message: 'Emergency situation resolved. Normal operations may resume.'
}

Screen Update:
✅ Emergency Cleared
All Clear signal received at 15:45.
Normal operations may resume.
Aircraft grounding lifted.
```

---

## END OF MISSING PARTS 6, 7, 8, 9


---

## PART 10: GEAR MANAGEMENT

### 10.1 Gear Inventory (Rigger View)

**Rigger Dashboard - Gear Inventory:**

Screen: "Equipment Inventory"
```
[Filter: In Stock | Rental | Maintenance | Retired]
[Sort: Serial #, Brand, Last Used, Status]

MAIN RIGS (A-Line Deployments)
┌─────────────────────────────────────────┐
| Serial: ALM-0001                        |
| Brand: Javelin | Size: 150              |
| Status: AVAILABLE (Last jump: 2026-04-08) │
| Repack Due: 2026-05-09                  |
| AAD: Vigil II (cert: 2025-10-15)       |
| Condition: GOOD                         |
| [Inspect] [Mark for Repack] [Ground]   |
└─────────────────────────────────────────┘

| Serial: ALM-0002                        |
| Brand: Icon | Size: 170                 |
| Status: IN MAINTENANCE (Broken D-bag)   |
| Returned: 2026-04-07                    |
| Expected Ready: 2026-04-12              |
| [View Work Order] [Mark Ready] [Ground] |
└─────────────────────────────────────────┘

[+ Add New Rig]

RESERVE RIGS
[Inventory list...]

RENTAL GEAR
[Helmet/Altimeter inventory...]
```

**Gear Database Schema:**
```
gear_items table:
- id (UUID)
- dzId (FK)
- type (MAIN_RIG | RESERVE_RIG | HELMET | ALTIMETER | JUMPSUIT | etc.)
- brand (Javelin, Icon, Aerodyne, etc.)
- model
- serialNumber (unique per rig)
- size (135, 150, 170, etc.)
- purchaseDate
- purchasePrice
- currentCondition (EXCELLENT | GOOD | FAIR | POOR)
- status (AVAILABLE | RENTAL_ASSIGNED | MAINTENANCE | GROUNDED | RETIRED)
- lastJumpDate
- jumpCount
- ownerId (athlete if personal gear)
- notes

aad_service table:
- id (UUID)
- gearItemId (FK)
- brand (Vigil, Cypress, CYPRES2, etc.)
- serialNumber
- lastServiceDate
- nextServiceDate (12-month cycle)
- serviceProvider
- cost

repack_schedule table:
- id (UUID)
- gearItemId (FK)
- lastRepackDate
- nextRepackDueDate (30 days)
- packersAuthorized (list of IDs)
```

**API - Get Inventory:**
```
GET /api/v1/dz/:dzId/gear/inventory?
  type=MAIN_RIG&
  status=AVAILABLE&
  limit=50

Response:
{
  "items": [
    {
      "id": "gear_12345",
      "serialNumber": "ALM-0001",
      "brand": "Javelin",
      "size": 150,
      "type": "MAIN_RIG",
      "status": "AVAILABLE",
      "lastJumpDate": "2026-04-08T17:30:00Z",
      "jumpCount": 2847,
      "condition": "GOOD",
      "repackDueDate": "2026-05-09",
      "aadServiceDueDate": "2025-10-15",
      "currentlyAssignedTo": null
    }
  ],
  "totalCount": 18,
  "statistics": {
    "availableRigs": 16,
    "underRepairRigs": 2,
    "avgAgeYears": 4.2,
    "avgJumpsPerRig": 2100
  }
}
```

---

### 10.2 Gear Check Flow (Pre-Jump Inspection)

**Gear Check Before Boarding:**

When load reaches BOARDING status, manifest staff direct athletes:
"Before boarding, proceed to gear check station"

**Athlete Goes to Gear Check (at DZ):**

Physical station or mobile app flow:
```
GEAR CHECK STATION

Your Assigned Main Rig:
Serial: ALM-0001 (Javelin 150)

[Start Inspection]

Ripcord handle:
  ☐ Secure
  ☐ Accessible
  ☐ At proper height

Pin position:
  ☐ Pins seated properly
  ☐ Closing loop color correct
  ☐ No fraying

Risers:
  ☐ No tangles
  ☐ No tears
  ☐ Properly stowed

Deployment bag:
  ☐ Intact
  ☐ No crushed corners
  ☐ Bridle routing correct

Parachute (visual):
  ☐ Canopy packed correctly
  ☐ Slider on bridle
  ☐ Lines organized

Reserve rig:
  ☐ Visible
  ☐ Properly sealed
  ☐ No visible damage

Helmet:
  ☐ Fits properly
  ☐ Chin strap tight
  ☐ No cracks

Altimeter:
  ☐ Working
  ☐ Set to DZ elevation
  ☐ Backup present

Overall Status: [PASS ▼]

Rigger Sign-Off: [Rigger Name Selected]

[Cancel] [Submit Check & Board]
```

**Gear Check API:**
```
POST /api/v1/loads/:loadId/gear-checks
{
  "athleteId": "ath_12345",
  "gearItemIds": [
    "gear_12345",  // main rig
    "gear_helmet_01",
    "gear_altimeter_05"
  ],
  "checkItems": {
    "ripcord_secure": true,
    "pin_position": true,
    "risers_intact": true,
    "deployment_bag": true,
    "parachute_visual": true,
    "reserve_rig": true,
    "helmet_fit": true,
    "altimeter_working": true
  },
  "overallStatus": "PASS",
  "riggerSignOffId": "staff_98765",
  "timestamp": "2026-04-09T14:20:00Z"
}
Response:
{
  "gearCheckId": "gk_12345",
  "athleteId": "ath_12345",
  "status": "PASSED",
  "riggerName": "Carlos Rodriguez",
  "clearedToBoard": true,
  "boardingTime": "2026-04-09T14:25:00Z"
}
```

**On Check Pass:**
- Emit: `athlete:gear-check:passed`
  - Payload: `{ athleteId, gearCheckId, loadId }`
- Manifest staff notified: athlete cleared to board
- Athlete sees: "✓ Cleared to board"
- If ANY item fails → `FAIL` status, athlete grounded from load

---

### 10.3 Gear Rental Assignment

**During Manifesting - Athlete Needs Rental Gear:**

Athlete clicks "Book Slot" but doesn't have main rig:
```
You don't have main rig assigned.

Would you like to:
  [Rent from DZ]  [Bring Your Own]  [Cancel]
```

**Rental Selection:**
```
SELECT RENTAL GEAR

Main Rig (required):
  Size 150: Javelin (2 available) [Select]
  Size 170: Icon (1 available) [Select]

[Selected] Javelin 150 (ALM-0002)
Additional rental: $15.00

Helmet:
  ☑ Rent helmet (+$5) 
  ☐ Bring own

Altimeter:
  ☑ Rent altimeter (+$3)
  ☐ Bring own

Total rental fee: $23.00

[Cancel] [Confirm & Book]
```

**Rental Assignment API:**
```
POST /api/v1/loads/:loadId/bookings/:bookingId/gear-rental
{
  "athleteId": "ath_12345",
  "mainRigId": "gear_ALM0002",
  "helmetId": "gear_helmet_02",
  "altimeterId": "gear_altimeter_06",
  "rentalFeeTotal": 23.00,
  "paymentMethod": "WALLET"
}
Response:
{
  "rentalId": "rental_12345",
  "athlete": "ath_12345",
  "gearAssignments": [
    {
      "gearId": "gear_ALM0002",
      "type": "MAIN_RIG",
      "serial": "ALM-0002",
      "returnBy": "2026-04-09T18:00:00Z"
    },
    {
      "gearId": "gear_helmet_02",
      "type": "HELMET",
      "returnBy": "2026-04-09T18:00:00Z"
    }
  ],
  "rentalFeeCharged": 23.00,
  "rentalAgreementAccepted": true
}
```

**On Rental Assignment:**
- Emit: `gear:rental:assigned`
  - Payload: `{ athleteId, loadId, gearIds, rentalFee }`
- Gear items marked as RENTAL_ASSIGNED in inventory
- Athlete receives confirmation with rental agreement
- Gear checklist shows assigned rental equipment

---

### 10.4 Repack Tracking and Due Dates

**Repack Schedule:**

Reserve parachutes must be repacked every 30 days by FAA regulation.

**Rigger View - Repack Schedule:**
```
REPACK DUE SOON

ALM-0001 Reserve
Due Date: 2026-05-09 (27 days)
Last Repack: 2026-04-09 by Carlos Rodriguez

[Schedule Repack] [Mark Complete]

---

ALM-0003 Reserve
OVERDUE (3 days)
Due Date: 2026-04-06
Last Repack: 2026-03-07 by Miguel Torres

⚠️ THIS RIG IS GROUNDED
[Mark as Repacked Now] [Extend Deadline]
```

**Repack Work Order API:**
```
POST /api/v1/gear/:gearId/repack/schedule
{
  "gearId": "gear_ALM0001",
  "type": "RESERVE_RIG",
  "scheduledDate": "2026-05-08",
  "assignedTo": "staff_carlos",
  "notes": "Standard 30-day cycle"
}
Response:
{
  "workOrderId": "wo_rep_12345",
  "gearId": "gear_ALM0001",
  "status": "SCHEDULED",
  "scheduledDate": "2026-05-08",
  "packerId": "staff_carlos",
  "estimatedDuration": "1 hour"
}
```

**Complete Repack:**
```
POST /api/v1/gear/:gearId/repack/complete
{
  "gearId": "gear_ALM0001",
  "packedBy": "staff_carlos",
  "completedDate": "2026-05-08",
  "condition": "EXCELLENT",
  "notes": "All lines checked, canopy clean, pins secure"
}
Response:
{
  "gearId": "gear_ALM0001",
  "lastRepackDate": "2026-05-08",
  "nextRepackDue": "2026-06-08",
  "status": "AVAILABLE"
}
```

**Automated Repack Alerts:**

Cron runs daily:
```
For each reserve rig:
  if nextRepackDue <= TODAY:
    status = GROUNDED
    Emit: `gear:grounded:repack-overdue`
      → Rigger notified: "ALM-0003 is grounded (overdue repack)"
  
  if nextRepackDue <= TODAY + 7:
    Emit: `gear:alert:repack-due-soon`
      → Rigger receives reminder
```

---

### 10.5 AAD Service/Lifecycle Tracking

**AAD (Automatic Activation Device) Service Schedule:**

AADs must be serviced annually:

**Rigger View - AAD Services:**
```
AAD SERVICE SCHEDULE

Vigil II (Serial: VG-12345)
Installed on: ALM-0001
Last Service: 2025-10-15 by Vigil HQ
Next Service Due: 2026-10-15 (194 days)
Status: CURRENT

[Schedule Service] [View Certificate]

---

Cypress 2 (Serial: CP-98765)
Installed on: ALM-0003
OVERDUE (48 days)
Last Service: 2024-10-15
Next Service Due: 2025-10-15

⚠️ RIG GROUNDED - AAD OUT OF SERVICE

[Schedule Urgent Service] [Replace AAD]
```

**AAD Service API:**
```
POST /api/v1/gear/:gearId/aad/schedule-service
{
  "gearId": "gear_ALM0001",
  "aadSerialNumber": "VG-12345",
  "serviceProvider": "Vigil_HQ",
  "preferredDate": "2026-10-01",
  "notes": "Annual service"
}
Response:
{
  "serviceOrderId": "so_aad_12345",
  "gearId": "gear_ALM0001",
  "aadSerial": "VG-12345",
  "status": "SCHEDULED",
  "estimatedCost": 120.00,
  "serviceProvider": "Vigil_HQ"
}
```

**AAD Service Completion:**
```
POST /api/v1/gear/:gearId/aad/service-complete
{
  "gearId": "gear_ALM0001",
  "aadSerial": "VG-12345",
  "servicedDate": "2026-10-01",
  "nextServiceDue": "2027-10-01",
  "cost": 120.00,
  "certificateUrl": "https://..."
}
Response:
{
  "aadId": "aad_12345",
  "gearId": "gear_ALM0001",
  "lastServiceDate": "2026-10-01",
  "nextServiceDue": "2027-10-01",
  "status": "CURRENT"
}
```

**Automated AAD Alerts:**

```
Cron daily:
  For each AAD:
    if nextServiceDue <= TODAY:
      gear_status = GROUNDED
      Emit: `gear:grounded:aad-out-of-service`
        → "Rig ALM-0003 grounded: AAD out of service"
    
    if nextServiceDue <= TODAY + 30:
      Emit: `gear:alert:aad-service-due-soon`
        → "Schedule AAD service for Vigil II on ALM-0001"
```

---

### 10.6 NFC Tag Scanning for Gear Identification

**NFC Tag on Rig:**

Each main rig has embedded NFC tag (waterproof sticker on D-bag) containing:
- Rig serial number
- Maintenance history link
- QR code to digital logbook

**Gear Check with NFC Scan:**

Rigger or athlete opens app at gear check station:
- Taps "Scan Rig" button
- Holds phone near NFC tag (reading distance: 2-4 inches)
- Phone beeps ✓
- Rig details auto-load:

```
SCANNED: ALM-0001
Javelin 150
Serial: ALM-0001

Last jump: 2026-04-08
Jump count: 2847
Repack due: 2026-05-09
AAD cert: Valid (2025-10-15)
Overall condition: GOOD

[Proceed with Gear Check]
```

**NFC Read API:**
```
POST /api/v1/gear/nfc/read
{
  "nfcTagId": "NFC-ALM-0001",
  "dzId": "dz_12345",
  "readBy": "staff_carlos"
}
Response:
{
  "gearId": "gear_12345",
  "serialNumber": "ALM-0001",
  "brand": "Javelin",
  "size": 150,
  "type": "MAIN_RIG",
  "lastJumpDate": "2026-04-08T17:30:00Z",
  "jumpCount": 2847,
  "repackDueDate": "2026-05-09",
  "aadCertDate": "2025-10-15",
  "condition": "GOOD",
  "maintenanceHistory": "https://..."
}
```

---

### 10.7 Gear Grounding Flow

**Rigger Grounds Gear (Safety Issue Detected):**

Rigger discovers equipment issue:
```
ALM-0001 - GEAR ISSUE DETECTED

Issue Type: [Equipment Damage ▼]
  - Torn slider
  - Bent lines
  - Cracked D-bag
  - Line damage
  - Other

Severity: [MODERATE ▼]
  - Minor (cosmetic, usable)
  - Moderate (functional but needs repair)
  - Severe (unsafe, must be grounded)

Description: "D-bag corner crushed, may affect deployment"

Estimated repair time: [1 week ▼]

[Cancel] [GROUND THIS RIG]
```

**Grounding API:**
```
POST /api/v1/gear/:gearId/ground
{
  "gearId": "gear_12345",
  "reason": "EQUIPMENT_DAMAGE",
  "issueType": "CRACKED_DBAG",
  "severity": "MODERATE",
  "description": "D-bag corner crushed, may affect deployment",
  "groundedBy": "staff_carlos",
  "estimatedRepairTime": "1 week",
  "requiredRepairs": ["Replace D-bag", "Inspect bridle"]
}
Response:
{
  "gearId": "gear_12345",
  "status": "GROUNDED",
  "groundedAt": "2026-04-09T14:55:00Z",
  "workOrderId": "wo_rep_12346"
}
```

**On Grounding:**
- Emit: `gear:grounded`
  - Payload: `{ gearId, reason, severity, estimatedRepairTime }`
- Gear marked as MAINTENANCE in inventory
- Any athlete currently assigned gear → notified of reassignment
- Work order created for repairs
- Manifest system prevents assignment of grounded gear

---

### 10.8 Rental Gear Assignment During Manifesting

(See 10.3 above - detailed rental flow)

---

## PART 11: LOGBOOK & JUMP RECORDS

### 11.1 Digital Logbook Entry (Auto-Populated from Load)

**After Load Completes (all skydivers landed):**

Load marked as LANDED:
```
Emit: `load:landed`
  For each athlete on load:
    Auto-create logbook_entry with:
      - jumpDate = load departure time
      - altitude = load altitude
      - freefallTime = (calculated from deployment altitude - landing)
      - jumpType = load jump type
      - dz = dz_id
      - instructorId = assigned instructor (if applicable)
      - status = PENDING_SIGN_OFF
```

**Athlete Sees New Entry:**

Screen: "My Logbook"
```
TODAY'S JUMPS

Jump #546 - April 9, 2026
Type: FS Formation
Altitude: 12,500 ft
Freefall Time: 5:35
Canopy Time: 7:20
Landing: Soft (on target)
Status: ⏳ Pending Sign-Off

Instructor: Sarah Chen
Load: #42

[View Details] [Request Sign-Off]

---

(Previous entries...)
```

**Logbook Entry Auto-Population API:**

```
POST /api/v1/logbook/auto-create
{
  "loadId": "load_42",
  "athleteId": "ath_12345",
  "jumpDate": "2026-04-09T14:30:00Z",
  "loadType": "FS",
  "altitude": 12500,
  "dropZone": "dz_12345",
  "assignedInstructor": "coach_sarah",
  "estimatedFreefallTime": 335,  // seconds
  "estimatedCanopyTime": 440
}
Response:
{
  "logbookEntryId": "log_12345",
  "jumpNumber": 546,
  "status": "PENDING_SIGN_OFF",
  "autoPopulatedFields": [
    "jumpDate",
    "altitude",
    "freefallTime",
    "dropZone"
  ],
  "createdAt": "2026-04-09T17:45:00Z"
}
```

**Athlete Can Edit Before Sign-Off:**

```
Edit Jump Details:

Freefall Time: 5:35 ▼ (was auto-calculated)
Canopy Time: 7:20 ▼
Landing Accuracy: [On target ▼]
Formation: [Donut 4-way ▼]
Deployment Altitude: [5,500 ft ▼]
Notes: "Great opening, smooth flare"

☑ GPS data included
☑ Video recorded

[Cancel] [Save Changes]
```

---

### 11.2 Manual Logbook Entry for External Jumps

**Athlete Jumps Elsewhere (Not on SkyLara Load):**

Screen: "Add Jump" → "Manual Entry"
```
ADD MANUAL JUMP ENTRY

Jump Type: [FS ▼]
Date: [April 5, 2026 ▼]
Drop Zone: [DZ Name or Other ▼]
Altitude: [12,000 ft ▼]
Freefall Time: [5 min 30 sec ▼]
Canopy Time: [7 min ▼]

Gear Used:
  Main: [My Javelin 150 ▼]
  Reserve: [My Icon 170 ▼]

Formation/Details:
  [FS Donut 4-way, smooth exit...]

[Cancel] [Submit]
```

**Manual Entry API:**
```
POST /api/v1/logbook/manual
{
  "athleteId": "ath_12345",
  "jumpDate": "2026-04-05",
  "jumpType": "FS",
  "dropZoneName": "Sky Dive Arizona",
  "dropZoneCity": "Eloy, AZ",
  "altitude": 12000,
  "freefallTime": 330,
  "canopyTime": 420,
  "mainRig": "My Javelin 150",
  "reserveRig": "My Icon 170",
  "notes": "FS Donut 4-way, smooth exit and opening"
}
Response:
{
  "logbookEntryId": "log_manual_12345",
  "jumpNumber": 547,
  "status": "VERIFIED",
  "autoVerified": false,
  "createdAt": "2026-04-09T18:00:00Z"
}
```

---

### 11.3 Jump Detail View

**Full Jump Details Screen:**

```
JUMP #546 - APRIL 9, 2026

Type: FS Formation
Drop Zone: DZ Fort Skydive
Aircraft: Skyvan
Load: #42

FLIGHT DATA:
  Exit Altitude: 12,500 ft
  Deployment Altitude: 5,500 ft
  Freefall Time: 5:35
  Canopy Time: 7:20
  Total Time Aloft: 12:55

FORMATION DATA:
  Formation: Donut 4-way
  Participants: You, John Smith, Emma Wilson, Mike Chen
  Points Scored: 12
  Video: https://... [View Video]

GEAR USED:
  Main Rig: Javelin ALM-0001
  Reserve: Icon Reserve (Javelin backup)
  Helmet: Shred Ready
  Altimeter: F3

WEATHER:
  Wind: 8 knots
  Visibility: 10+ miles
  Temperature: 65°F

INSTRUCTOR SIGN-OFF:
  ✓ Signed by Sarah Chen on April 9, 2:45 PM
  "Great formation work! Continue building consistency."

NOTES:
  "Smooth opening, perfect landing on target"

[Edit] [Share] [Print] [Delete] [Report Issue]
```

**Jump Detail API:**
```
GET /api/v1/logbook/:logbookId

Response:
{
  "id": "log_12345",
  "jumpNumber": 546,
  "jumpDate": "2026-04-09T14:30:00Z",
  "jumpType": "FS",
  "dropZone": {
    "id": "dz_12345",
    "name": "DZ Fort Skydive"
  },
  "aircraft": "Skyvan",
  "loadNumber": 42,
  "exitAltitude": 12500,
  "deploymentAltitude": 5500,
  "freefallTime": 335,
  "canopyTime": 420,
  "formation": {
    "type": "DONUT_4WAY",
    "participants": ["ath_12345", "ath_45678", "ath_11111", "ath_22222"],
    "pointsScored": 12,
    "videoUrl": "https://..."
  },
  "gear": {
    "main": "ALM-0001",
    "reserve": "Icon backup",
    "helmet": "Shred Ready",
    "altimeter": "F3"
  },
  "weather": {
    "windSpeed": 8,
    "windDirection": "SW",
    "visibility": "10+",
    "temperature": 65
  },
  "instructorSignOff": {
    "instructorId": "coach_sarah",
    "instructorName": "Sarah Chen",
    "signedAt": "2026-04-09T14:45:00Z",
    "feedback": "Great formation work! Continue building consistency."
  },
  "athleteNotes": "Smooth opening, perfect landing on target",
  "status": "SIGNED_OFF"
}
```

---

### 11.4 Coach/Instructor Sign-Off on Logbook Entry

**Instructor Signs Off Jump:**

In app, instructor taps "Sign Off Jumps" from load completion:
```
SIGN OFF LOAD #42 JUMPS

You instructed: 2 students

Sarah Johnson (Level 3)
Jump #452 - FS Freefall
Status: PENDING SIGN-OFF
[Review] [PASS] [NEEDS RETRAINING]

Michael Torres (Level 5)
Jump #548 - AFF Solo
Status: PENDING SIGN-OFF
[Review] [PASS] [NEEDS RETRAINING]

[Sign Off All Passed] [Submit]
```

**Sign-Off API:**
```
POST /api/v1/logbook/:logbookId/instructor-signoff
{
  "logbookEntryId": "log_12345",
  "instructorId": "coach_sarah",
  "status": "PASSED",
  "feedback": "Great formation work! Continue building consistency.",
  "skillsObserved": ["stable_exit", "smooth_deployment", "accurate_landing"],
  "signedAt": "2026-04-09T14:45:00Z"
}
Response:
{
  "logbookEntryId": "log_12345",
  "status": "SIGNED_OFF",
  "signedBy": "Sarah Chen",
  "feedbackRecorded": true,
  "athleteNotified": true
}
```

**On Sign-Off:**
- Emit: `logbook:signed-off`
  - Payload: `{ logbookEntryId, athleteId, instructorId, feedback }`
- Entry marked as SIGNED_OFF
- Athlete receives notification: "Your jump has been signed off by Sarah Chen"
- Entry locked (cannot be edited further)
- Feedback visible to athlete

---

### 11.5 GPS Data and Jump Visualization

**Jump Replay/Map View:**

Screen: "Jump #546 - Map"
```
[Satellite Map View]

Exit point: Red dot (12,500 ft)
Jump run line: Blue line (aircraft path)
Freefall track: Red line (skydiver drift)
Deployment point: Yellow dot (5,500 ft)
Landing spot: Green dot (accuracy landing)

[Play Replay] [Toggle Layers] [Download KML]

ALTITUDE GRAPH:
12,500 |     Exit
       |     |
       |  Freefall
       | /
5,500  |/
       | Canopy
500    |_____Landing
       └─────────────────►
            Time: 12:55
```

**GPS Data Model:**
```
jump_gps_track table:
- id (UUID)
- logbookEntryId (FK)
- trackPoints: [
    {
      "timestamp": "2026-04-09T14:30:00Z",
      "latitude": 40.2206,
      "longitude": -111.2311,
      "altitude": 12500,
      "speed": 0
    },
    {
      "timestamp": "2026-04-09T14:31:00Z",
      "latitude": 40.2210,
      "longitude": -111.2320,
      "altitude": 10500,
      "speed": 120
    },
    // ... (1 point every 2 seconds during freefall)
  ]
- exitPoint: { lat, lng, alt }
- deploymentPoint: { lat, lng, alt }
- landingPoint: { lat, lng, alt }
- estimatedDistance: 0.5 miles
```

**GPS Download API:**
```
GET /api/v1/logbook/:logbookId/gps-track

Response:
{
  "logbookEntryId": "log_12345",
  "gpsTrack": {
    "format": "GPX",
    "url": "https://...",  // KML file download
    "trackPoints": 278,
    "duration": "12:55",
    "estimatedDistance": 0.5
  }
}
```

---

### 11.6 Jump Statistics Dashboard

**Statistics Screen: "My Stats"**

```
JUMP STATISTICS

Career Jumps: 546
Total Time Aloft: 89 hours 12 minutes
Year-to-Date Jumps: 45
Month-to-Date Jumps: 12
Jumps This Week: 3

JUMP TYPE BREAKDOWN:
  FS: 234 (43%)
  AFF: 156 (29%)
  Tandem: 98 (18%)
  Freefly: 42 (8%)
  Other: 16 (3%)

FORMATION EXPERIENCE:
  Solo: 156 jumps
  2-way: 89 jumps
  4-way: 167 jumps
  8-way: 78 jumps
  Large Formation (16+): 12 jumps

INSTRUCTORS:
  Sarah Chen: 45 jumps
  John Walsh: 32 jumps
  Miguel Torres: 28 jumps

RECENT RECORDS:
  Last Jump: Today (2 hours ago)
  Most Jumps (1 day): 4 (March 15)
  Longest Freefall: 8:42 (April 5)
  Highest Altitude: 15,000 ft (March 28)

BADGES & ACHIEVEMENTS:
  ✓ 100 Jumps Club
  ✓ 300 Jumps Club
  ✓ Freefly Addict (50+ freefly jumps)
  ✓ 4-Way Specialist (100+ 4-way jumps)

[View Detailed Stats] [Compare with Friends]
```

**Statistics API:**
```
GET /api/v1/athletes/:athleteId/statistics?period=YTD

Response:
{
  "careerStats": {
    "totalJumps": 546,
    "totalTimeAloft": 53520,  // seconds
    "firstJumpDate": "2018-05-15",
    "averageJumpsPerMonth": 8.2
  },
  "periodStats": {
    "period": "YEAR_TO_DATE",
    "jumpsThisPeriod": 45,
    "avgTimeAloftPerJump": 335
  },
  "jumpTypeBreakdown": [
    {
      "type": "FS",
      "count": 234,
      "percentage": 0.43
    }
  ],
  "formationExperience": [
    {
      "formationType": "4WAY",
      "count": 167
    }
  ],
  "instructorList": [
    {
      "instructorId": "coach_sarah",
      "name": "Sarah Chen",
      "jumpsWithThem": 45
    }
  ],
  "records": {
    "lastJumpDate": "2026-04-09",
    "mostJumpsInOneDay": 4,
    "longestFreefall": 522,
    "highestAltitude": 15000
  },
  "badges": ["100_JUMPS", "300_JUMPS", "FREEFLY_ADDICT", "4WAY_SPECIALIST"]
}
```

---

### 11.7 Export Logbook

**Export Options:**

Screen: "My Logbook" → menu → "Export"
```
EXPORT LOGBOOK

Format:
  ☑ PDF (printable logbook)
  ☐ CSV (spreadsheet)
  ☐ GPX (maps/GPS data)

Date Range:
  [All time ▼] or [Custom: From/To]

Include:
  ☑ Jump details
  ☑ Instructor feedback
  ☑ Photos
  ☐ GPS tracks
  ☑ Weather data

Destination:
  ☑ Email to me
  ☐ Download now
  ☐ Print

[Cancel] [Export]
```

**Export API:**
```
POST /api/v1/logbook/export
{
  "athleteId": "ath_12345",
  "format": "PDF",
  "dateRange": {
    "from": "2020-01-01",
    "to": "2026-04-09"
  },
  "includeFields": [
    "jumpDetails",
    "instructorFeedback",
    "photos",
    "weatherData"
  ],
  "deliveryMethod": "EMAIL"
}
Response:
{
  "exportJobId": "exp_12345",
  "status": "PROCESSING",
  "format": "PDF",
  "estimatedCompletionTime": "60 seconds",
  "destinationEmail": "athlete@example.com",
  "fileSize": "12.5 MB"
}
```

**On Completion:**
- Email sent with PDF attachment
- PDF contains: jump-by-jump logbook, photos, GPS maps, instructor feedback
- Printable format suitable for wallet/storage
- Digital copy available for 30 days for redownload

---

## PART 12: SOCIAL & COMMUNICATION

### 12.1 "Who's Going" Social Feed

**Manifest Day - Social Tab:**

Screen: "Who's Going Today"
```
[Load Filter: All | Load #1 | Load #2 | Load #3]

WHO'S JUMPING TODAY
Saturday, April 9

Marcus Thompson ⭐⭐⭐⭐⭐
  Jumping Load #1
  Going for: 4-way FS formation
  [Follow] [Message] [Add as Friend]

Sarah Johnson
  Just joined Load #2
  3 days ago: "Crushed my Level 3!"
  [Follow] [Message]

John Walsh
  Likely on Load #1 (coach)
  Known for: AFF coaching, freefly
  [Follow] [Message]

Emma Wilson • New
  First jump today!
  Status: AFF Intro
  "So excited! 😄"
  [Follow] [Message] [Invite to Group]

---

[Create Post] [Start Group] [See All Athletes]
```

**API - Who's Going:**
```
GET /api/v1/dz/:dzId/manifest/social?date=2026-04-09

Response:
{
  "dzId": "dz_12345",
  "date": "2026-04-09",
  "totalAthletes": 34,
  "athletes": [
    {
      "athleteId": "ath_12345",
      "name": "Marcus Thompson",
      "profileImage": "https://...",
      "rating": 5.0,
      "jumpCount": 456,
      "assignedLoad": 1,
      "jumpType": "FS",
      "formationGoal": "4-way FS formation",
      "online": true,
      "lastPost": null
    },
    {
      "athleteId": "ath_45678",
      "name": "Sarah Johnson",
      "assignedLoad": 2,
      "jumpType": "AFF",
      "level": 3,
      "lastPost": {
        "timestamp": "2026-04-06T14:30:00Z",
        "text": "Crushed my Level 3!"
      }
    }
  ]
}
```

**Post Status/Intention:**

Athlete can post:
```
[Share what you're jumping]

[Type message...]

☑ Looking for 4-way team
☑ First jump, nervous!
☑ Coaching available

[Post] [Cancel]
```

**Post API:**
```
POST /api/v1/social/posts
{
  "athleteId": "ath_12345",
  "dzId": "dz_12345",
  "content": "Looking for experienced 4-way flyer to complete team for Load #1",
  "loadId": "load_1",
  "tags": ["4WAY", "LOOKING_FOR_TEAM"],
  "visibility": "DZ_PUBLIC"
}
Response:
{
  "postId": "post_12345",
  "createdAt": "2026-04-09T09:00:00Z",
  "visibility": "VISIBLE_TO_DZ",
  "engagementCount": 0
}
```

**On Post:**
- Emit: `social:post:created`
  - Payload: `{ postId, athleteId, content, tags }`
  - Broadcast to all connected users at DZ
  - Shows on "Who's Going" feed in real-time

---

### 12.2 In-App Chat (Jumper to Jumper, Group Chat)

**1-on-1 Chat:**

Athlete taps message icon on another athlete's profile:
```
DIRECT MESSAGE: Marcus Thompson ⭐⭐⭐⭐⭐

[Previous messages...]

2:15 PM
You: Hey Marcus! Want to do a 4-way on Load #1?

2:16 PM
Marcus: I'm down! What's the team look like?

[Type message...]
[Send] [Attach Photo] [Emoji]
```

**Group Chat (Formation Team):**

Athlete creates/joins group:
```
GROUP: Load #1 - 4-way FS Team

Members (4):
  • You
  • Marcus Thompson
  • Sarah Chen
  • John Smith

Chat:
2:15 PM - You: "Let's do a 4-way!"
2:16 PM - Marcus: "I'm in"
2:18 PM - Sarah: "Points or donut?"
2:19 PM - John: "Let's do donut, I'll call dives"

Formation Plan:
 Dives: Sidebody → Caterpillar → Zipper
 Grips: Solid, lock in fast
```

**Chat Message API:**
```
POST /api/v1/chat/messages
{
  "senderId": "ath_12345",
  "conversationId": "conv_load1_4way",
  "messageType": "TEXT",
  "content": "Let's do a 4-way!",
  "timestamp": "2026-04-09T14:15:00Z"
}
Response:
{
  "messageId": "msg_12345",
  "conversationId": "conv_load1_4way",
  "sender": "ath_12345",
  "content": "Let's do a 4-way!",
  "timestamp": "2026-04-09T14:15:00Z",
  "delivered": true
}
```

**WebSocket Real-Time Chat:**
```
Event: `chat:message:new`
  Channel: /user/:recipientId/messages
  Payload: {
    "messageId": "msg_12345",
    "senderId": "ath_12345",
    "senderName": "Marcus Thompson",
    "content": "Let's do a 4-way!",
    "timestamp": "2026-04-09T14:15:00Z",
    "conversationId": "conv_load1_4way"
  }
  
Recipient's chat refreshes immediately, notification badge appears
```

---

### 12.3 Leaderboard

**Leaderboard Screen: "Compete"**

```
LEADERBOARD

[Filter: This Month | YTD | All Time]
[Sort: Total Jumps | Points | 4-Way Wins | Accuracy]

JUMP COUNT - ALL TIME

1. Marcus Thompson - 2,345 jumps ⭐⭐⭐⭐⭐
2. Sarah Chen - 1,987 jumps
3. John Walsh - 1,876 jumps
4. Emma Wilson - 1,234 jumps
5. You - 546 jumps (Rank: #48)

---

POINTS (4-WAY COMPETITION) - THIS MONTH

1. Marcus Thompson - 847 points
2. Sarah Chen - 823 points
3. You - 456 points (Rank: #14)

---

YOUR ACHIEVEMENTS:
  ✓ 100 Jumps Club
  ✓ 300 Jumps Club
  ✓ Freefly Addict
```

**Leaderboard API:**
```
GET /api/v1/leaderboard?
  category=JUMP_COUNT&
  period=ALL_TIME&
  limit=50

Response:
{
  "category": "JUMP_COUNT",
  "period": "ALL_TIME",
  "entries": [
    {
      "rank": 1,
      "athleteId": "ath_marcus",
      "name": "Marcus Thompson",
      "value": 2345,
      "rating": 5.0,
      "badge": "ELITE_JUMPER"
    },
    {
      "rank": 48,
      "athleteId": "ath_12345",
      "name": "You",
      "value": 546,
      "yourRank": true
    }
  ]
}
```

---

### 12.4 Roster View ("See Who's Jumping Today")

**Roster Screen: "Today's Athletes"**

```
MANIFEST ROSTER - SATURDAY, APRIL 9

LOAD #1 (Departing 2:30 PM)
Aircraft: Skyvan | Altitude: 12,500 ft | Jump Type: FS

Slot 1: Marcus Thompson ⭐⭐⭐⭐⭐
  Experience: 2,345 jumps
  Specialty: 4-way formations
  [Message] [View Profile]

Slot 2: Sarah Johnson
  Experience: 456 jumps
  Status: AFF Level 3
  Instructor: Sarah Chen
  [Message] [View Profile]

Slot 3: John Smith (Pilot)
  Role: PILOT
  [Message]

Slot 4: Carlos Rodriguez (Jumpmaster)
  Role: MANIFEST_STAFF
  [Message]

---

LOAD #2 (Departing 3:15 PM)
Aircraft: Islander | Altitude: 10,000 ft | Jump Type: Tandem

Slot 1: Emma Wilson (Student)
  First Jump!
  [Message] [View Profile] [Welcome Gift]

Slot 2: Michael Torres (Tandem Instructor)
  [Message]

---

[Add Friend] [Chat with Load] [Create Group Chat]
```

**Roster API:**
```
GET /api/v1/dz/:dzId/loads/:loadId/roster

Response:
{
  "loadId": "load_1",
  "departTime": "2026-04-09T14:30:00Z",
  "altitude": 12500,
  "jumpType": "FS",
  "participants": [
    {
      "slotNumber": 1,
      "athleteId": "ath_marcus",
      "name": "Marcus Thompson",
      "role": "ATHLETE",
      "jumpCount": 2345,
      "rating": 5.0,
      "specialty": "4-way formations"
    },
    {
      "slotNumber": 2,
      "athleteId": "ath_sarah_j",
      "name": "Sarah Johnson",
      "role": "ATHLETE",
      "jumpCount": 456,
      "affLevel": 3,
      "assignedInstructor": "coach_sarah"
    }
  ]
}
```

---

### 12.5 Organizer/Event Management (Boogie Coordination)

**Boogie (Multi-Day Event) Management:**

Screen: "My Bookies"
```
REGISTERED BOOKIES

Xmas Boogie 2026
Dec 15-19, 2026 | Elsinore, CA
Organizer: Sarah Events LLC
Status: Registration Open
Cost: $200/person

[Register] [View Schedule] [Message Organizer]

---

Summer Bash 2026
June 21-24, 2026 | Lodi, CA
Organizer: California Skydivers
Status: Registration Open (50/100 spots)
Cost: $350 all-access pass

Your Status: REGISTERED ✓
Assigned Loads: 8
Team Affiliation: (none yet)

[Message Team Lead] [Join Team] [View Competitors] [Cancel Registration]
```

**Boogie Creation (Organizer):**

Organizer creates event:
```
CREATE BOOGIE

Event Name: "Summer Bash 2026"
Dates: [June 21 ▼] to [June 24 ▼]
Drop Zone: [Lodi Parachute Center ▼]

Details:
  Description: Largest 4-way comp in California
  Max Athletes: 100
  Registration Fee: $350
  
Jump Schedule:
  Day 1: 4-way formation competition
  Day 2: Freefly competition
  Day 3: Freestyle/CRW/other
  Day 4: Best time of day (open format)

Team Management:
  Allow teams: ☑
  Max per team: 4
  Registration deadline: June 10

[Save & Publish]
```

**Boogie API:**
```
POST /api/v1/events/bookies
{
  "name": "Summer Bash 2026",
  "organizerId": "staff_12345",
  "dzId": "dz_lodi",
  "startDate": "2026-06-21",
  "endDate": "2026-06-24",
  "description": "Largest 4-way comp in California",
  "registrationFee": 350.00,
  "maxAthletes": 100,
  "allowTeams": true,
  "maxPerTeam": 4,
  "registrationDeadline": "2026-06-10"
}
Response:
{
  "boogieId": "boogie_12345",
  "status": "REGISTRATION_OPEN",
  "registrationUrl": "https://myskylara.com/events/summer-bash-2026",
  "shareCode": "SB2026"
}
```

---

### 12.6 Push Notification System

**Notification Types:**

1. **Jump-Related:**
   - Load status (FILLING → BOARDING → AIRBORNE)
   - Your turn coming up
   - Load cancelled
   - Gear assigned/checked
   - Jump approved/needs retraining

2. **Social:**
   - Friend request accepted
   - New message
   - Formation team member joined
   - Post you're tagged in

3. **Administrative:**
   - Weather hold (wind too strong)
   - Emergency alert
   - Facility closure
   - Maintenance update

4. **Coaching:**
   - Coaching session booked
   - Evaluation signed off
   - Progress update
   - Certificate issued

**Notification Payload:**

```
Notification:
  type: "LOAD_STATUS_CHANGE"
  title: "Load #1 Status Change"
  body: "Load #1 is now boarding. You're in slot 3. Head to the aircraft."
  icon: "load_status"
  deepLink: "/loads/1/detail"
  priority: "HIGH"
  timestamp: "2026-04-09T14:20:00Z"
```

**API - Send Notification:**

(Internal - sent automatically on events)
```
POST /api/v1/notifications/send
{
  "userId": "ath_12345",
  "type": "LOAD_STATUS_CHANGE",
  "title": "Load #1 Status Change",
  "body": "Load #1 is now boarding.",
  "relatedResourceId": "load_1",
  "channels": ["IN_APP", "PUSH", "EMAIL"],
  "priority": "HIGH"
}
```

---

### 12.7 Multi-Channel Delivery (In-App, Push, SMS, Email, WhatsApp)

**User Notification Preferences:**

Screen: "Account → Notifications"
```
NOTIFICATION SETTINGS

IN-APP ALERTS: ☑ Enabled
  Sound: ☑ On
  Badge: ☑ On

PUSH NOTIFICATIONS: ☑ Enabled
  Load Status: ☑
  Messages: ☑
  Emergency Alerts: ☑ (cannot disable)
  Promotional: ☐

SMS TEXT: ☑ Enabled
  Emergency alerts only: ☑
  Number: +1-555-0123
  [Change Number]

EMAIL: ☑ Enabled
  Daily digest: ☑
  Frequency: [Daily ▼]
  Receive: [Jump confirmations, Messages, Newsletters]

WHATSAPP: ☑ Enabled
  Connected: sarah_jumper
  Receive: [Messages, Urgent alerts]
  [Disconnect]

[Save Preferences]
```

**Multi-Channel Delivery Logic:**

When notification triggered:
```
Notification: "Load #1 Status: BOARDING"

User Preferences:
  IN_APP: enabled → show banner
  PUSH: enabled → send to device
  SMS: enabled (emergency only) → skip
  EMAIL: enabled → queue for digest
  WHATSAPP: enabled → send message

Actually sent:
  1. In-app banner (immediate)
  2. Push notification (immediate)
  3. Email (aggregated in daily digest)
  4. WhatsApp (immediate if urgent)
```

**Delivery Chain API:**

```
POST /api/v1/notifications/deliver-multi-channel
{
  "notificationId": "notif_12345",
  "userId": "ath_12345",
  "type": "LOAD_STATUS_CHANGE",
  "channels": {
    "IN_APP": { "enabled": true, "delivered": true },
    "PUSH": { "enabled": true, "delivered": true, "timestamp": "..." },
    "SMS": { "enabled": false, "reason": "ONLY_EMERGENCY" },
    "EMAIL": { "enabled": true, "queued": true, "digestTime": "06:00" },
    "WHATSAPP": { "enabled": true, "delivered": true, "timestamp": "..." }
  }
}
```

---

End of PART 12. Parts 13-14 follow in next message due to length.


---

## PART 13: MULTI-USER REAL-TIME COMMUNICATION ARCHITECTURE

### 13.1 WebSocket Connection Management

**WebSocket Initialization (Client-Side):**

```javascript
// Browser/app connects on load
const socket = new WebSocket('wss://api.skyLara.com/ws');

socket.onopen = () => {
  console.log('Connected');
  // Subscribe to relevant channels
  socket.send(JSON.stringify({
    action: 'SUBSCRIBE',
    channels: [
      `/dz/dz_12345/loads`,
      `/athlete/ath_12345/messages`,
      `/athlete/ath_12345/notifications`,
      `/dz/dz_12345/emergency`
    ]
  }));
};

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  handleEvent(msg);
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Attempt reconnect with exponential backoff
};

socket.onclose = () => {
  console.log('Disconnected, attempting to reconnect...');
  reconnectWithBackoff();
};
```

**Server-Side WebSocket Handler:**

```
WebSocket Endpoint: wss://api.skyLara.com/ws

Connection Lifecycle:
1. Client connects
2. Server registers connection in active_sessions
3. Client sends SUBSCRIBE with channels list
4. Server adds connection to channel listeners
5. Events from other clients broadcast to all channel subscribers
6. Client disconnects → server removes from all channels

Heartbeat (every 30 seconds):
  Server sends: { "type": "PING" }
  Client responds: { "type": "PONG" }
  If no PONG after 60s → connection marked stale
```

**Reconnection Strategy:**

```
const reconnect = async (attemptNumber = 1) => {
  const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
  
  await sleep(delay);
  
  try {
    const newSocket = new WebSocket('wss://...');
    
    newSocket.onopen = () => {
      // Resume subscriptions
      resumeSubscriptions(subscriptionList);
      // Fetch any missed events (last 5 minutes)
      fetchMissedEvents();
    };
    
    attemptNumber++;
  } catch (error) {
    if (attemptNumber < 10) {
      reconnect(attemptNumber);
    } else {
      showOfflineNotice();
    }
  }
};
```

---

### 13.2 Channel Subscription Model

**Channel Hierarchy:**

```
GLOBAL LEVEL:
  /platform/{feature}
    /platform/announcements
    /platform/status
    /platform/updates

DZ LEVEL:
  /dz/{dzId}/{feature}
    /dz/dz_12345/loads
    /dz/dz_12345/emergency
    /dz/dz_12345/weather
    /dz/dz_12345/manifests
    /dz/dz_12345/notifications
    /dz/dz_12345/chat

LOAD LEVEL:
  /load/{loadId}/{feature}
    /load/load_1/status
    /load/load_1/roster
    /load/load_1/chat
    /load/load_1/weather_hold

USER LEVEL:
  /athlete/{athleteId}/{feature}
    /athlete/ath_12345/messages
    /athlete/ath_12345/notifications
    /athlete/ath_12345/assignments
    /athlete/ath_12345/coaching

PRIVATE (1-on-1):
  /conversation/{conversationId}
    /conversation/conv_abc123/messages
```

**Subscription Rules:**

```
Public channels (anyone can subscribe):
  /dz/{dzId}/loads
  /dz/{dzId}/weather
  /platform/announcements

Authenticated channels (must be DZ member):
  /dz/{dzId}/manifests
  /dz/{dzId}/emergency

Private channels (must be participant):
  /athlete/{athleteId}/messages
  /athlete/{athleteId}/notifications
  /conversation/{conversationId}/messages
  
Restricted channels (staff only):
  /dz/{dzId}/staff
  /dz/{dzId}/finance
```

**Subscribe Request:**

```
Client sends:
{
  "action": "SUBSCRIBE",
  "channels": [
    "/dz/dz_12345/loads",
    "/athlete/ath_12345/messages",
    "/load/load_1/status"
  ]
}

Server processes:
  For each channel:
    - Check user permissions
    - Verify channel exists
    - Add connection to channel subscribers list
    
Server responds:
{
  "action": "SUBSCRIBE_ACK",
  "channels": {
    "/dz/dz_12345/loads": { "status": "SUCCESS" },
    "/athlete/ath_12345/messages": { "status": "SUCCESS" },
    "/load/load_1/status": { "status": "SUCCESS" }
  },
  "subscriptionCount": 3
}
```

---

### 13.3 Event Catalog (Complete List)

**Load Events:**

```
load:created
  Payload: { loadId, dzId, aircraft, altitude, jumpType, departTime }
  Sent to: /dz/{dzId}/loads
  Receivers: All at DZ

load:status:changed
  Payload: { loadId, newStatus, previousStatus, changedAt, changedBy }
  Status transitions: OPEN → FILLING → LOCKED → THIRTY_MIN → BOARDING → AIRBORNE → LANDED → COMPLETE
  Sent to: /load/{loadId}/status, /dz/{dzId}/loads
  Receivers: All users, affected athletes

load:manifest:updated
  Payload: { loadId, slotsFilledCount, slotsTotal, partialLoad }
  Sent to: /load/{loadId}/roster, /dz/{dzId}/manifests
  Receivers: Manifest staff, athletes on load

load:slot:booked
  Payload: { loadId, bookingId, athleteId, slotPosition, paymentSource }
  Sent to: /load/{loadId}/roster, /athlete/{athleteId}/assignments
  Receivers: Manifest staff, booked athlete

load:slot:cancelled
  Payload: { loadId, athleteId, cancellationReason, refundProcessed }
  Sent to: /load/{loadId}/roster, /athlete/{athleteId}/assignments
  Receivers: Manifest staff, cancelled athlete

load:boarding:initiated
  Payload: { loadId, boardingTime, aircraftDoorOpen }
  Sent to: /load/{loadId}/status
  Receivers: All users at DZ

load:airborne
  Payload: { loadId, liftoffTime, aircraftAltitude, gpsCoordinates }
  Sent to: /load/{loadId}/status, /dz/{dzId}/loads
  Receivers: All users (live jump tracking)

load:exit:complete
  Payload: { loadId, exitTime, slotsExited, droppedAt }
  Sent to: /load/{loadId}/status
  Receivers: All users

load:landed
  Payload: { loadId, landingTime, allAthletesLanded, noIncidents }
  Sent to: /load/{loadId}/status, /dz/{dzId}/loads
  Receivers: All users, athletes receive auto-logbook creation

load:cancelled
  Payload: { loadId, reason, refundsIssued, notification }
  Sent to: /load/{loadId}/status, /dz/{dzId}/loads, /athlete/{athleteId}/assignments (all on load)
  Receivers: All affected parties
```

**Athlete/Booking Events:**

```
athlete:checkin:started
  Payload: { athleteId, dzId, timestamp }
  Sent to: /dz/{dzId}/manifests
  Receivers: Manifest staff

athlete:checkin:completed
  Payload: { athleteId, loadNumber, paymentVerified }
  Sent to: /dz/{dzId}/manifests, /athlete/{athleteId}/assignments
  Receivers: Manifest staff, athlete

athlete:gear-check:passed
  Payload: { athleteId, gearCheckId, loadId }
  Sent to: /load/{loadId}/roster, /athlete/{athleteId}/assignments
  Receivers: Manifest staff, athlete cleared to board

athlete:gear-check:failed
  Payload: { athleteId, loadId, failureReason, grounded }
  Sent to: /load/{loadId}/roster, /athlete/{athleteId}/assignments
  Receivers: Manifest staff, grounded athlete

athlete:wallet:updated
  Payload: { athleteId, newBalance, transaction }
  Sent to: /athlete/{athleteId}/notifications
  Receivers: Athlete only

athlete:refund:issued
  Payload: { athleteId, refundId, amount, transactionId }
  Sent to: /athlete/{athleteId}/notifications
  Receivers: Athlete only
```

**Coaching Events:**

```
coaching:session:created
  Payload: { sessionId, coachId, studentId, discipline, proposedTime }
  Sent to: /athlete/{studentId}/notifications, /athlete/{coachId}/assignments
  Receivers: Coach, student

coaching:session:booked
  Payload: { sessionId, coachId, studentId, dateTime, duration }
  Sent to: /athlete/{studentId}/notifications, /athlete/{coachId}/assignments
  Receivers: Both parties, calendar sync

aff:evaluation:completed
  Payload: { jumpId, studentId, instructorId, level, status, nextLevelApproved }
  Sent to: /athlete/{studentId}/notifications
  Receivers: Student notified of progress

aff:evaluation:failed
  Payload: { jumpId, studentId, level, failureReasons, groundedUntil }
  Sent to: /athlete/{studentId}/notifications
  Receivers: Student grounded, coach alerted
```

**Emergency Events:**

```
emergency:activated
  Payload: { emergencyId, dzId, initiatedBy, initiatingRole, description, activatedAt }
  Sent to: /dz/{dzId}/emergency
  Receivers: ALL connected users (every role)

emergency:action:logged
  Payload: { emergencyId, actionType, actionBy, timestamp }
  Action types: AIRCRAFT_GROUNDED, EMERGENCY_SERVICES_CALLED, MEDICAL_STANDBY, AREA_CLEARED
  Sent to: /dz/{dzId}/emergency
  Receivers: All staff

emergency:resolved
  Payload: { emergencyId, resolvedAt, outcome, actionsTaken }
  Sent to: /dz/{dzId}/emergency
  Receivers: All users, clearance to resume operations

incident:reported
  Payload: { incidentId, dzId, reportedBy, incidentType, severity }
  Sent to: /dz/{dzId}/emergency
  Receivers: DZ Manager, safety officer
```

**Weather Events:**

```
weather:hold:issued
  Payload: { dzId, holdReason, startTime, estimatedDuration, windSpeed, windGust }
  Sent to: /dz/{dzId}/weather, /dz/{dzId}/loads
  Receivers: All at DZ, manifest staff, athletes

weather:hold:lifted
  Payload: { dzId, liftedAt, currentConditions }
  Sent to: /dz/{dzId}/weather, /dz/{dzId}/loads
  Receivers: All at DZ

weather:conditions:updated
  Payload: { dzId, windSpeed, windDirection, visibility, temperature, lastUpdated }
  Sent to: /dz/{dzId}/weather
  Receivers: Manifest staff, displayed on screens
```

**Chat & Messaging Events:**

```
chat:message:new
  Payload: { messageId, senderId, senderName, conversationId, content, timestamp }
  Sent to: /conversation/{conversationId}/messages, /athlete/{recipientId}/messages
  Receivers: All conversation participants

chat:typing:indicator
  Payload: { conversationId, userId, userName, isTyping }
  Sent to: /conversation/{conversationId}/messages
  Receivers: All conversation participants (not stored, real-time only)

chat:read:receipt
  Payload: { conversationId, userId, lastReadAt }
  Sent to: /conversation/{conversationId}/messages
  Receivers: Sender gets confirmation
```

**Notification Events:**

```
notification:created
  Payload: { notificationId, userId, type, title, body, deepLink }
  Sent to: /athlete/{userId}/notifications
  Receivers: User only

notification:cleared
  Payload: { notificationId, clearedAt }
  Sent to: /athlete/{userId}/notifications
  Receivers: User only
```

---

### 13.4 Athlete ↔ Manifest Staff Communication

**Athlete Wants to Book Slot:**

```
Athlete UI:
  [Available Load #1: 2:30 PM departure]
  [Book Slot]

EVENT SEQUENCE:

1. Athlete: "I want to book Load #1"
   Client sends: POST /api/v1/loads/load_1/bookings
   { athleteId, paymentMethod }

2. Server processes:
   - Check ticket availability
   - Process payment
   - Create booking
   - Emit: load:slot:booked

3. Event broadcasts: 
   /load/load_1/roster
     → Manifest staff see athlete added to manifest
   /athlete/ath_12345/assignments
     → Athlete sees "Booking confirmed on Load #1"

Manifest Staff sees real-time:
┌─────────────────────┐
│ LOAD #1 ROSTER      │
│ ┌─────────────────┐ │
│ | Slot 1: Marcus  | │
│ | Slot 2: Sarah   | │
│ | Slot 3: YOU →   | │ ← Just added (highlighted)
│ |         John    | │
│ └─────────────────┘ │
└─────────────────────┘

Athlete sees:
┌──────────────────────┐
│ YOUR BOOKING         │
│ ✓ Load #1            │
│ Time: 2:30 PM        │
│ Position: 3          │
│ [More Info]          │
└──────────────────────┘
```

**Manifest Staff Assigns Gear:**

```
Staff: "Select gear for slot 3"
  Client sends: POST /api/v1/loads/load_1/bookings/bk_123/gear-assignment
  { gearIds: [main_rig, helmet, altimeter] }

Event broadcasts:
  /athlete/ath_12345/assignments
    → Athlete notified: "Your gear has been assigned: Javelin 150"

Athlete checks in → gear inspection screen auto-loads assigned gear
```

**Athlete Needs to Cancel:**

```
Athlete: [Cancel Booking]
  Modal: "Cancel slot on Load #1?"
  [Confirm] [Cancel]

Client sends: DELETE /api/v1/loads/load_1/bookings/bk_123
  { reason: "change of mind" }

Event broadcasts:
  /load/load_1/roster
    → Manifest: "Slot 3 now OPEN"
  /athlete/ath_12345/assignments
    → Athlete: "Booking cancelled, refund processed"
  /dz/dz_12345/loads
    → DZ manifest refresh shows available slot
```

---

### 13.5 Manifest Staff ↔ Pilot Communication

**Load is LOCKED, Ready to Brief Pilot:**

```
Manifest Staff: "Brief pilot on Load #1"
  Taps: [Call Pilot] or [Send Load Brief to Pilot]

Client sends: POST /api/v1/loads/load_1/pilot-briefing
  {
    "pilotId": "staff_pilot1",
    "loadDetails": {
      "slots": 12,
      "jumpType": "FS",
      "altitude": 12500,
      "exitPattern": "standard",
      "windDirection": "SW 8 knots"
    }
  }

Event broadcasts:
  /load/load_1/status
    → Pilot's screen shows: "Load #1 Brief Ready"
    → Audio/visual alert to pilot

Pilot confirms: [Acknowledge Brief]
  Client sends: POST /api/v1/loads/load_1/pilot-confirmed
  
Event broadcasts:
  /dz/dz_12345/manifests
    → Manifest: "Load #1 READY FOR BOARDING"
  /load/load_1/roster
    → All athletes: "Time to board"
```

**Pilot Communicates Issue (e.g., Aircraft Problem):**

```
Pilot: [Load Issue] → Modal: "Select issue"
  [Mechanical problem]
  [Will be delayed X minutes]
  [Load cancelled]

Client sends: POST /api/v1/loads/load_1/pilot-notice
  { issueType: "DELAYED", estimatedDelay: 15 }

Event broadcasts:
  /load/load_1/status
    → All athletes: "Load #1 delayed 15 min. New departure: 2:45 PM"
  /dz/dz_12345/manifests
    → Manifest staff: Update timeline
```

---

### 13.6 Coach ↔ Student Communication

**Coach Assigns AFF Jump Evaluation:**

```
Coach marks jump as evaluated:
  POST /api/v1/aff/evaluations
  { studentId, level, status: "PASSED" }

Event broadcasts:
  /athlete/ath_student/notifications
    → Student: "🎉 You passed AFF Level 3!"
    → [View Feedback] button
    → Auto-advance to Level 4 readiness

Student sees:
┌──────────────────┐
│ AFF PROGRESSION  │
│ ✓ Level 3 DONE   │
│ ➜ Level 4 READY  │
│ Approved by:     │
│ Sarah Chen       │
│ "Great work!"    │
│ [Book Level 4]   │
└──────────────────┘
```

**Student Requests Coaching Session:**

```
Student: "Book coaching session" 
  → Searches coaches for "Canopy Control"
  → Sees: "Sarah Chen - Available Tomorrow 2 PM"
  → [Book]

Client sends: POST /api/v1/coaching/sessions/book
  { coachId, studentId, discipline, slotId, paymentMethod }

Event broadcasts:
  /athlete/coach_sarah/assignments
    → Coach: "📌 New booking: Canopy Control with Michael Torres tomorrow 2 PM"
  /athlete/ath_michael/notifications
    → Student: "✓ Confirmed with Coach Sarah for tomorrow 2 PM"

Both receive calendar invites (iCal)
```

**Coach Cancels Session:**

```
Coach: "Session Issue" → [Cancel]
  Modal: "Cancel Canopy Control session with Michael Torres?"
  [Reason: Got injured]

Client sends: POST /api/v1/coaching/sessions/sess_123/cancel
  { reason: "COACH_INJURED", message: "Will reschedule next week" }

Event broadcasts:
  /athlete/ath_michael/notifications
    → Student: "❌ Your coaching session is cancelled"
    → Refund processed
    → [Browse other coaches]
  
  /athlete/coach_sarah/assignments
    → Other pending students: "Sarah is temporarily unavailable"
```

---

### 13.7 Emergency Broadcast (All Roles Simultaneously)

**Emergency SOS Activated:**

```
User taps and holds SOS → emergency:activated event

Event broadcasts to: /dz/{dzId}/emergency
  Sent to: EVERYONE connected at DZ

Payloads by Role:

DZ_MANAGER / DZ_OWNER:
{
  "type": "EMERGENCY_ALERT",
  "severity": "ACTIVE",
  "location": "DZ Fort Skydive",
  "description": "Jumper with unstable landing",
  "initiatedBy": "Sarah Johnson",
  "timestamp": "2026-04-09T14:45:00Z",
  "actionItems": [
    { "action": "Ground aircraft", "status": "PENDING" },
    { "action": "Call emergency services", "status": "PENDING" },
    { "action": "Medical standby", "status": "PENDING" }
  ],
  "respondersNeeded": true,
  "dashboardUrl": "https://..."
}

MANIFEST_STAFF / PILOT:
{
  "type": "EMERGENCY_ALERT",
  "actionRequired": [
    "Ground current aircraft",
    "Clear landing pattern",
    "Notify emergency services"
  ],
  "staffChecklist": [
    { "action": "I've grounded aircraft", "completed": false },
    { "action": "I'm calling 911", "completed": false },
    { "action": "Medical kit ready", "completed": false }
  ]
}

ATHLETE / SPECTATOR:
{
  "type": "EMERGENCY_ALERT",
  "message": "An emergency is in progress. Emergency services have been notified. Please stay clear of drop zone.",
  "canClose": false  // must acknowledge
}

COACH / INSTRUCTOR:
{
  "type": "EMERGENCY_ALERT",
  "actionRequired": "Stand by for emergency response coordination",
  "respondersReady": true
}
```

**Real-Time Status Updates During Emergency:**

```
As staff take actions:

Event: emergency:action:logged
  Payload: {
    "emergencyId": "emg_12345",
    "actionType": "AIRCRAFT_GROUNDED",
    "actionBy": "John Pilot",
    "timestamp": "2026-04-09T14:45:30Z"
  }
  
  Broadcast to: /dz/dz_12345/emergency
  
  All staff see live checklist update:
    ✓ Aircraft Grounded (by John Pilot at 2:45:30)
    ⏳ Emergency Services Called
    ⏳ Medical Standby Ready
    ⏳ Area Cleared
```

---

### 13.8 Load Status Change Cascade (What Each Role Sees)

**Load Status: OPEN → FILLING**

```
Event: load:status:changed
  Payload: { loadId, newStatus: "FILLING", timestamp }
  Broadcast to: /load/load_1/status, /dz/dz_12345/loads

ATHLETE sees:
┌────────────────────┐
│ Load #1 FILLING    │
│ 3 / 12 slots      │ ← progress bar
│ $12.50/jump        │
│ Departing 2:30 PM  │
│ [Book Slot]        │
└────────────────────┘

MANIFEST_STAFF sees:
┌─────────────────────────┐
│ LOAD #1 - FILLING       │
│ Manifest:               │
│ Slot 1: Marcus [Ready]  │
│ Slot 2: Sarah [Checked] │
│ Slot 3: (open)          │
│ ...                     │
│ 3/12 filled             │
│ [Close manifest]        │
└─────────────────────────┘

PILOT sees:
┌──────────────────────┐
│ Load #1: FILLING     │
│ Estimated departure: │
│ 2:30 PM (15 min)    │
└──────────────────────┘
```

**Load Status: FILLING → LOCKED**

```
Manifest staff: [Close Manifest] → Load roster locked

Event: load:status:changed
  newStatus: "LOCKED", closedAt, finalSlotCount

ATHLETE:
  If booked: "✓ Load confirmed" (cannot cancel now)
  If not booked: "Load #1 is full" (cannot book anymore)

MANIFEST_STAFF:
  "Manifest locked. Load has 12 athletes."
  Checklist activates: gear checks, weight calc, brief prep

PILOT:
  "Load locked. Departure 2:30 PM. 12 athletes."
```

**Load Status: LOCKED → BOARDING**

```
Staff: [Initiate Boarding]
  
Event: load:boarding:initiated
  doorOpenTime, boardingTimeWindow

ATHLETE:
  "⏳ TIME TO BOARD"
  "Proceed to aircraft"
  "Your position: Slot 5"
  [Mark Boarded]

MANIFEST_STAFF:
  Boarding checklist visible
  Gate opens, athletes file in
  Real-time: "Slot 1 boarded ✓", "Slot 2 boarded ✓", etc.

PILOT:
  "Athletes boarding" (visible on screen)
  Once all boarded: "Ready for departure approval"
```

**Load Status: BOARDING → AIRBORNE**

```
Pilot announces takeoff / aircraft lifts off

Event: load:airborne
  liftoffTime, aircraftAltitude, gpsCoordinates

ATHLETE:
  Screen shows: "✈️ AIRBORNE"
  Exits and jumps begin
  Real-time altitude/position displayed
  
  Ground crew sees: Plane icon on map moving
  
MANIFEST_STAFF:
  Load #1: "AIRBORNE - 12,500 ft at 2:32 PM"
  Can now assign next load to aircraft
  Clock starts on next load manifesting

SPECTATORS/FRIENDS:
  If following load: "Load #1 just departed! Follow their jump..."
  Map shows real-time aircraft position
```

**Load Status: AIRBORNE → LANDED**

```
Plane lands, skydivers exit and land

Event: load:landed
  landingTime, allAthletesLanded, noIncidents

ATHLETE:
  Screen updates to: "✓ JUMPED SUCCESSFULLY"
  Logbook entry created with jump data
  Auto-populated with: altitude, freefall time, jump type
  
  Prompt: "Leave a note about your jump?"
  
  Then: [Rate Load] [Share on Social] [View Logbook]

MANIFEST_STAFF:
  Load detail updates: "LANDED 2:47 PM"
  Can see landed athletes in real-time as they cross finish line
  Once all landed: Mark as LANDED
  
LOGBOOK SYSTEM:
  For each athlete:
    POST /api/v1/logbook/auto-create triggered
    ↓
    Athlete sees pending logbook entry
    ↓
    Awaiting instructor sign-off

SPECTATORS:
  If watching: "Load #1 landed safely! All skydivers down."
```

---

### 13.9 Check-In Status Propagation

**Athlete Checks In:**

```
Athlete arrives at DZ: [Check In]
  
Client sends: POST /api/v1/dz/dz_12345/checkin
  { athleteId, dzId, timestamp }

Event broadcasts:
  /dz/dz_12345/manifests
    → Manifest: "Marcus Thompson checked in"

Manifest staff dashboard:
┌────────────────────────────────┐
│ TODAY'S MANIFEST               │
│ CHECKED IN:       ✓ 8          │
│ NOT CHECKED IN:   ⏳ 4          │
│                                │
│ [Expand List]                  │
│ ✓ Marcus Thompson              │
│ ✓ Sarah Chen                   │
│ ✓ John Smith                   │
│ ⏳ Emma Wilson (not here yet)   │
│ ⏳ Miguel Torres (not here yet) │
└────────────────────────────────┘

Athlete sees: "✓ Checked in at 1:45 PM"
```

**Athlete Books Load After Check-In:**

```
Athlete (already checked in): [Book Load #1]
  Payment processed (fast path - payment verified)
  
Client sends: POST /api/v1/loads/load_1/bookings
  { athleteId, ...checked_in: true }

Event broadcasts:
  /load/load_1/roster
    → Manifest: Athlete added (with ✓ checked-in badge)
    → Gear assignment auto-triggered
    
Manifest notes athlete is ready (not waiting for check-in)
```

---

### 13.10 Weather Hold Broadcast

**Winds exceed limits:**

```
Weather monitoring (automated):
  Wind speed = 15 knots, gust = 18 knots
  Limit = 12 knots
  → TRIGGER WEATHER HOLD

Event: weather:hold:issued
  holdReason: "Winds exceed 12 knot limit (currently 15 knots, gusts 18)"
  estimatedDuration: "30 minutes"
  
Broadcast to: /dz/dz_12345/weather, /dz/dz_12345/loads

ATHLETE sees:
┌──────────────────────────────┐
│ ⚠️ WEATHER HOLD IN EFFECT    │
│                              │
│ Reason: High winds (15 kts)  │
│ Limit: 12 knots             │
│ Gusts: 18 knots             │
│                              │
│ Estimated resolution:        │
│ 30 minutes                   │
│                              │
│ Current wind: ↙ 15 kts       │
│ [Refresh]                    │
└──────────────────────────────┘

MANIFEST_STAFF sees:
  Load #1 boarding PAUSED
  All pending loads DELAYED
  Notification: "Update pilots that boarding is on hold"

SPECTATORS see:
  "Jump operations on temporary hold due to wind"
```

**Winds decrease, hold lifted:**

```
Weather monitoring:
  Wind speed = 10 knots (within limit)
  
Event: weather:hold:lifted
  liftedAt, currentConditions

Broadcast to: /dz/dz_12345/weather, /dz/dz_12345/loads

ATHLETE sees:
┌─────────────────────┐
│ ✓ WEATHER HOLD      │
│   LIFTED            │
│                     │
│ Wind now: 10 knots  │
│ Status: GO          │
│                     │
│ Load #1 boarding    │
│ [Board Now]         │
└─────────────────────┘

MANIFEST_STAFF:
  "Resume operations. Load #1 ready to board."
  
  Can now progress Load #1 to BOARDING status
```

**Continuous Weather Updates:**

```
Every 5 minutes:

Event: weather:conditions:updated
  windSpeed: 12, windDirection: "SW", visibility: 10, temperature: 65

Broadcast to: /dz/dz_12345/weather

Staff dashboard updates:
┌────────────────────────────┐
│ CURRENT CONDITIONS          │
│ Wind: ↙ 12 kts (within limit) │
│ Gusts: 14 kts              │
│ Visibility: 10 miles       │
│ Temperature: 65°F          │
│ Barometric: 29.92 inHg     │
│ Updated: 2:45 PM           │
└────────────────────────────┘

Athletes can see forecast for jump planning
```

---

### 13.11 Conflict Resolution (Simultaneous Slot Assignment)

**Scenario: Two Athletes Click "Book Slot" at Same Time**

```
Load #1, Slot 3 is OPEN
2 athletes both click [Book Slot] within 500ms

CLIENT 1: POST /api/v1/loads/load_1/bookings
  payload: { athleteId: ath_A, slotPosition: 3 }

CLIENT 2: POST /api/v1/loads/load_1/bookings
  payload: { athleteId: ath_B, slotPosition: 3 }

Both arrive at server simultaneously

SERVER PROCESSING (atomic):

  Transaction begins:
    SELECT slot WHERE loadId=load_1 AND slotPosition=3 FOR UPDATE
    
    Slot is OPEN → can book
    Assign to first request (A) based on timestamp
    
    Deduct payment from A
    Mark slot assigned
    
  Commit transaction
  
  Second request (B) retries:
    SELECT slot... → Slot now ASSIGNED to A
    Error: SLOT_TAKEN
    Refund B's tentative payment
    Return: "Slot taken, slot 4 available"

EVENT BROADCASTS:

ath_A receives:
  ✓ "Booked Load #1, Slot 3"

ath_B receives:
  ❌ "Slot 3 taken. Try slot 4?"
  [Slot 4 Available] [Try Different Load]
```

**Manifest Staff + Athlete Conflict:**

```
Scenario: Staff assigns athlete to Slot 3, athlete simultaneously cancels

STAFF: "Assign athlete to Slot 3"
  POST /api/v1/loads/load_1/assignments
  
ATHLETE: "Cancel booking"
  DELETE /api/v1/bookings/bk_123

Server receives both within 100ms
Locking ensures atomic operation:

1. Staff's request acquires lock on booking
2. Tries to transition booking to ASSIGNED
3. Athlete's cancel request queued

4. Staff's request completes → booking now ASSIGNED
5. Athlete's cancel sees booking ASSIGNED
   Error: "Cannot cancel assigned slot. Contact staff to remove."
   OR: Staff cancellation succeeds first → both succeed with ordering
   
Whichever completes atomic transaction first wins
Other receives conflict error or must retry

No double-booking possible due to DB constraints
```

---

### 13.12 Offline/Reconnect Sync Strategy

**Client Goes Offline:**

```
WebSocket disconnects
  ↓
App detects: onclose event
  ↓
Shows: "Offline - Will reconnect automatically"
  ↓
Attempts reconnect with exponential backoff

While offline:
  User can still:
    - View cached load list
    - Read previous messages
    - Browse logbook
  
  User CANNOT:
    - Book slots
    - Send messages
    - Update profile
    
  UI shows grey overlay: "Reconnecting..."
```

**Client Reconnects:**

```
WebSocket reconnects successfully
  ↓
Client emits:
{
  "action": "SYNC_MISSED_EVENTS",
  "lastEventReceived": "evt_abc123",
  "timestamp": "2026-04-09T14:42:00Z",
  "channels": [
    "/dz/dz_12345/loads",
    "/athlete/ath_12345/messages"
  ]
}

Server responds with missed events:
{
  "action": "SYNC_COMPLETE",
  "missedEvents": [
    {
      "type": "load:status:changed",
      "loadId": "load_1",
      "newStatus": "BOARDING",
      "timestamp": "2026-04-09T14:40:00Z"
    },
    {
      "type": "chat:message:new",
      "conversationId": "conv_abc",
      "senderId": "ath_marcus",
      "content": "See you at the door!",
      "timestamp": "2026-04-09T14:41:30Z"
    }
  ],
  "eventCount": 2,
  "syncedAt": "2026-04-09T14:42:15Z"
}

Client processes missed events:
  1. Load #1 is now BOARDING (update UI)
  2. New message from Marcus (show notification)
  3. Re-subscribe to active channels
  
Show: "✓ Reconnected - 2 new updates"
```

**Conflict During Offline Period:**

```
Athlete offline, was going to book Load #1
While offline: Load is closed/cancelled

Athlete reconnects, sees missedEvents:
  load:status:changed { newStatus: "LOCKED" }

Athlete's UI auto-updates:
  "❌ Load #1 now locked. Cannot book."
  Suggests alternatives

If offline during refund:
  Athlete misses: athlete:refund:issued event
  
On reconnect:
  Server sends: athlete:wallet:updated { newBalance: 2000 }
  Athlete sees refreshed balance
  Can query transaction history to see refund
```

---

## PART 14: AERIAL MAP & JUMP RUN

### 14.1 Jump Run Map View

**Map Screen: "Aerial Overview"**

```
[Live Map Display]

Satellite view: DZ Fort Skydive location
Red dot: Drop zone (landing area)
Blue line: Aircraft current position
Green dots: Exit points (historical)
White circle: Safe altitude threshold (5,500 ft)

LOAD #1 - AIRBORNE

Aircraft path: Skyvan heading NW at 90 mph
Altitude: 10,500 ft (climbing to 12,500)
ETA Exit: 2:35 PM (2 min)

[Zoom In] [Show Wind] [Show Forecast]
```

**Map Data Structure:**

```
{
  "dzLocation": {
    "name": "DZ Fort Skydive",
    "latitude": 40.2206,
    "longitude": -111.2311,
    "elevation": 4500
  },
  
  "currentLoad": {
    "loadId": "load_1",
    "aircraft": "Skyvan",
    "currentAltitude": 10500,
    "currentPosition": { "lat": 40.2215, "lng": -111.2400 },
    "heading": "NW",
    "speed": 90,
    "estimatedExitTime": "2026-04-09T14:35:00Z"
  },
  
  "jumpRun": {
    "exitPoint": { "lat": 40.2250, "lng": -111.2500, "alt": 12500 },
    "exitTime": "2026-04-09T14:35:00Z",
    "estimatedDrift": 0.5  // miles downwind
  },
  
  "landingZone": {
    "center": { "lat": 40.2206, "lng": -111.2311 },
    "safeRadius": 0.25,  // miles
    "obstaclesNearby": [
      { "type": "POWERLINE", "lat": 40.2180, "lng": -111.2290, "danger": "HIGH" },
      { "type": "TREES", "lat": 40.2195, "lng": -111.2350, "danger": "MEDIUM" }
    ]
  }
}
```

**API - Load Positioning:**

```
GET /api/v1/loads/:loadId/position

Response:
{
  "loadId": "load_1",
  "aircraft": {
    "type": "Skyvan",
    "currentLocation": { "latitude": 40.2215, "longitude": -111.2400 },
    "altitude": 10500,
    "heading": "NW",
    "speed": 90,
    "gpsTimestamp": "2026-04-09T14:34:30Z"
  },
  "jumpRun": {
    "estimatedExitTime": "2026-04-09T14:35:00Z",
    "plannedExitPoint": { "latitude": 40.2250, "longitude": -111.2500 },
    "expectedDrift": 0.5
  },
  "dzLocation": {
    "latitude": 40.2206,
    "longitude": -111.2311
  }
}
```

---

### 14.2 Wind Overlay

**Manifest Staff View - Wind Layer:**

```
[Map view] [Toggle: Wind Layer]

Wind layer ON:

┌────────────────────────────────────────────┐
│ WIND VISUALIZATION                         │
│                                            │
│  DZ Fort Skydive                           │
│  Wind: SW 12 knots, gusts 15               │
│                                            │
│  ↙↙↙  Wind arrows point downwind           │
│  ↙↙↙  Arrow color intensity = wind speed  │
│  ↙↙↙                                       │
│                                            │
│  Altitude: 5,000 ft                        │
│  [Show upper wind] [Show shear]            │
│                                            │
│  Forecast (next 30 min):                   │
│  Wind holding at 12-15 kts SW              │
│  No significant shear expected             │
│                                            │
└────────────────────────────────────────────┘

Wind speed indicator (bottom):
┌─────────────────────┐
│ Surface: 12 kts     │
│ Aloft (10k):14 kts  │ (shear warning)
│ Gusts: 15 kts       │
└─────────────────────┘
```

**Wind Data Points:**

```
wind_data points at grid:
  latitude: 40.2 to 40.23
  longitude: -111.23 to -111.26
  altitude: 2000, 5000, 10000, 15000 ft
  
  Each point has:
    windSpeed (knots)
    windDirection (degrees)
    gustSpeed (knots)
    timestamp (5-min updates)

Wind arrows visualize:
  Direction: arrow points downwind
  Speed: arrow thickness/opacity (thick = stronger wind)
  Shear: color intensity changes with altitude

METAR integration:
  Real airport weather station: "KSLC"
  Updates: every 1-2 hours (official)
  Wind forecast: next 24 hours
```

**Wind API:**

```
GET /api/v1/dz/:dzId/weather/wind?
  altitude=5000&
  includeHistory=true

Response:
{
  "dzId": "dz_12345",
  "currentWind": {
    "speed": 12,
    "direction": "SW",
    "directionDegrees": 225,
    "gust": 15,
    "measurementAltitude": 5000,
    "timestamp": "2026-04-09T14:35:00Z"
  },
  "windByAltitude": [
    { "altitude": 2000, "speed": 8, "direction": "SW" },
    { "altitude": 5000, "speed": 12, "direction": "SW" },
    { "altitude": 10000, "speed": 14, "direction": "WSW" },
    { "altitude": 15000, "speed": 16, "direction": "W" }
  ],
  "shearWarning": "Moderate shear between 5k-10k ft",
  "forecast": {
    "nextHour": { "speed": 12, "direction": "SW" },
    "next2Hours": { "speed": 13, "direction": "SW" }
  }
}
```

---

### 14.3 Landing Pattern Visualization

**Canopy Pattern Display:**

```
[Map] [Toggle: Landing Pattern]

Landing pattern shown as overlays on map:

DZ Fort Skydive
[Landing area - target 40.2206, -111.2311]

Downwind leg:
  ↙ dashed line from exit point southwestward

Base leg:
  ← dashed line turns right (north)

Final leg:
  ← final approach to landing zone
  
Landing zone:
  Green circle (safety radius: 0.25 miles)
  Red zones: obstacles nearby
    🔴 Power lines: 40.2180, -111.2290
    🔴 Trees: 40.2195, -111.2350

Normal approach: Each skydiverFollows downwind → base → final
Approach altitude: 
  Downwind: 2,500 ft
  Base: 1,500 ft
  Final: 500 ft
```

**Pattern Calculation (Automated):**

```
When load exits at: { lat: 40.2250, lng: -111.2500, alt: 12500 }

Wind: SW 12 knots

Drift calculation:
  Freefall: 5 min 30 sec at 120 mph (accounting for wind)
  Drift downwind: 0.5 miles
  Estimated landing zone: centered near 40.2206, -111.2311
  
Pattern recommendation:
  Exit heading: NW (into wind)
  Downwind leg: 2-3 miles from landing zone (SW)
  Base turn: 1 mile out (W)
  Final: 0.5 miles (on glide slope to center)
```

**Pattern Visualization API:**

```
GET /api/v1/dz/:dzId/landing-pattern?
  exitLocation=40.2250,-111.2500&
  altitude=12500&
  windSpeed=12&
  windDirection=SW

Response:
{
  "dzId": "dz_12345",
  "exitPoint": { "latitude": 40.2250, "longitude": -111.2500 },
  "estimatedDrift": {
    "downwind": 0.5,
    "unit": "miles"
  },
  "pattern": {
    "downwindLeg": {
      "start": { "latitude": 40.2250, "longitude": -111.2500 },
      "end": { "latitude": 40.2100, "longitude": -111.2480 },
      "altitude": 2500,
      "length": 2.8,
      "heading": "SE"
    },
    "baseLeg": {
      "start": { "latitude": 40.2100, "longitude": -111.2480 },
      "end": { "latitude": 40.2100, "longitude": -111.2350 },
      "altitude": 1500,
      "length": 0.8,
      "heading": "E"
    },
    "finalLeg": {
      "start": { "latitude": 40.2100, "longitude": -111.2350 },
      "end": { "latitude": 40.2206, "longitude": -111.2311 },
      "altitude": 500,
      "length": 0.5,
      "heading": "NE"
    }
  },
  "landingZone": {
    "center": { "latitude": 40.2206, "longitude": -111.2311 },
    "safeRadius": 0.25
  }
}
```

---

### 14.4 DZ Info Overlay

**DZ Information Panel:**

```
[Map] [Info Button]

DZ INFO PANEL slides up:

┌──────────────────────────────┐
│ DZ FORT SKYDIVE              │
│ ═══════════════════════════  │
│                              │
│ Location: Elsinore, CA       │
│ Elevation: 4,500 ft MSL      │
│ Coordinates: 40.2206, -111.2 │
│                              │
│ FACILITIES                   │
│ ✓ Packing mat               │
│ ✓ Hangar (weather)          │
│ ✓ Restrooms                 │
│ ✓ Cafe/snack bar            │
│ ✓ Equipment rental           │
│ ✓ Coaching available        │
│ ✓ Video services            │
│                              │
│ LANDING AREAS               │
│ Primary: North field        │
│   (best for wind < 12 kts)  │
│ Alternate: East field       │
│   (use if heavy wind)       │
│                              │
│ OBSTACLES                   │
│ 🔴 Power lines: 500 ft S    │
│ 🟡 Trees: 1000 ft SE       │
│ 🟢 Clear: West approach    │
│                              │
│ EMERGENCIES                 │
│ Hospital: City Med (2.5 mi) │
│ Nearest trauma: St Luke's   │
│ [Get Directions]            │
│                              │
│ CONTACT                     │
│ Phone: 555-0100             │
│ DZ Manager: John Smith      │
│ Email: info@dzfort.com      │
│                              │
│ [Close]                      │
└──────────────────────────────┘
```

**DZ Info Data Model:**

```
dz_profile table:
  - name, location, elevation
  - facilities: [packing_mat, hangar, restrooms, cafe, etc.]
  - primary_landing_zone: { center, radius, suitability }
  - alternate_landing_zone: { center, radius, conditions }
  - obstacles: [
      { type, location, danger_level, description }
    ]
  - emergency_contacts: [
      { hospital, distance, trauma_level, phone }
    ]
  - dz_manager_id, phone, email

facilities_amenities table:
  - dzId (FK)
  - amenityType (PACKING_MAT, HANGAR, RESTROOM, CAFE, RENTAL, COACHING, VIDEO)
  - available (boolean)
  - lastMaintained (date)
```

**DZ Info API:**

```
GET /api/v1/dz/:dzId/profile

Response:
{
  "id": "dz_12345",
  "name": "DZ Fort Skydive",
  "location": {
    "city": "Elsinore, CA",
    "latitude": 40.2206,
    "longitude": -111.2311,
    "elevation": 4500
  },
  "facilities": [
    { "type": "PACKING_MAT", "available": true, "count": 3 },
    { "type": "HANGAR", "available": true, "squareFeet": 5000 },
    { "type": "RESTROOM", "available": true, "count": 4 },
    { "type": "CAFE", "available": true, "description": "Hot food & drinks" }
  ],
  "landingZones": [
    {
      "name": "Primary North Field",
      "center": { "latitude": 40.2206, "longitude": -111.2311 },
      "radius": 0.25,
      "optimalWindCondition": "< 12 knots",
      "hazards": []
    },
    {
      "name": "Alternate East Field",
      "center": { "latitude": 40.2250, "longitude": -111.2200 },
      "radius": 0.20,
      "optimalWindCondition": "> 12 knots or strong crosswind",
      "hazards": [
        { "type": "TREES", "description": "South edge", "danger": "MEDIUM" }
      ]
    }
  ],
  "nearbyObstacles": [
    {
      "type": "POWERLINE",
      "distance": 0.5,
      "direction": "S",
      "dangerLevel": "HIGH"
    }
  ],
  "emergencyResources": {
    "nearestHospital": {
      "name": "City Medical Center",
      "distance": 2.5,
      "traumaLevel": 1,
      "phone": "555-0911"
    }
  ],
  "dzManager": {
    "name": "John Smith",
    "phone": "555-0100",
    "email": "john@dzfort.com"
  },
  "operatingHours": "8 AM - 5 PM daily"
}
```

---

## SUMMARY

This comprehensive specification covers ALL interactions in SkyLara across 14 functional areas:

**Parts 1-6 (written by another agent):**
- Identity & Auth
- Manifest System
- Booking & Load Builder

**Parts 7-14 (this document):**
- **Part 7:** Payment & wallet (wallet dashboard, block tickets, transactions, refunds, commission splits, gift cards)
- **Part 8:** Training & coaching (AFF progression, coaching sessions, coach availability, scheduling, student/coach relationships)
- **Part 9:** Safety & emergency (SOS activation, emergency profiles, incident reporting, risk assessment, hospital lookup)
- **Part 10:** Gear management (inventory, pre-jump checks, rental assignment, repack tracking, AAD service, NFC scanning, grounding)
- **Part 11:** Logbook & records (auto-population, manual entries, GPS tracking, instructor sign-off, statistics, export)
- **Part 12:** Social & communication (who's going, chat, leaderboard, roster, boogie events, push notifications, multi-channel delivery)
- **Part 13:** Real-time multi-user architecture (WebSocket management, channel subscriptions, complete event catalog, role-specific message flows, conflict resolution, offline sync)
- **Part 14:** Aerial maps (jump run visualization, wind overlays, landing patterns, DZ info)

**For each feature:**
- Screen layouts with wireframe descriptions
- User actions (every button, field, gesture)
- API endpoints (HTTP method, URL, request body, response structure)
- WebSocket events (channel, payload, recipients by role)
- Database schema (tables, relationships)
- Multi-user communication patterns
- Error handling and state transitions
- Real-time synchronization logic

This document is ready for implementation by backend teams (API/database), frontend teams (UI/client), and DevOps (infrastructure for WebSocket scaling).

