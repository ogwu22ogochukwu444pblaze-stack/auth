# Adaptive Authentication System

A full-stack web application with adaptive authentication, two-factor authentication (2FA) using TOTP, and device fingerprinting. Built with Next.js, Prisma, and PostgreSQL.

## Features

- **User Authentication**: Secure signup and login with bcrypt password hashing
- **Device Fingerprinting**: Detects and tracks devices using FingerprintJS
- **Geolocation**: Tracks login location (city, country) using ipapi.co
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA using authenticator apps
- **Adaptive Risk Assessment**: Automatically requires 2FA for new/untrusted devices
- **Session Management**: Secure JWT-based sessions
- **Responsive UI**: Clean, minimal design with Tailwind CSS

## Tech Stack

- **Frontend**: React, Next.js (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: bcryptjs, jsonwebtoken
- **2FA**: Speakeasy (TOTP generation and verification)
- **Device Fingerprinting**: FingerprintJS
- **UI**: Tailwind CSS
- **Geolocation**: ipapi.co (free, no API key needed)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Authenticator app (Google Authenticator, Authy, etc.) for 2FA testing

## Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create `.env.local` in the project root:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/authdb"
   JWT_SECRET="your-super-secret-jwt-key-change-this"
   SESSION_EXPIRY_HOURS=24
   ```

3. **Set up the database:**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Project Structure

```
/app
  /api/auth/
    signup/route.js          # User registration
    login/route.js           # User login with device detection
    verify-totp/route.js     # Verify TOTP during login
    setup-totp/route.js      # Generate TOTP secret
    confirm-totp/route.js    # Confirm TOTP setup
    session/route.js         # Get current session
    logout/route.js          # Clear session
  /auth/
    verify-totp/page.js      # TOTP verification page for new devices
  /settings/
    setup-totp/page.js       # 2FA setup page
  /dashboard/page.js         # Protected dashboard
  /login/page.js             # Login page with device fingerprinting
  /signup/page.js            # Signup page
  /page.js                   # Home (redirects to login)
  layout.js                  # Root layout
  globals.css                # Global styles

/lib
  auth.js                    # Session and JWT utilities
  totp.js                    # TOTP generation and verification
  device.js                  # Device fingerprinting and geolocation
  risk.js                    # Risk calculation logic

/prisma
  schema.prisma              # Database schema
```

## API Routes

### Authentication

#### POST `/api/auth/signup`
Register a new user.
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### POST `/api/auth/login`
Login with device fingerprint and IP detection.
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "deviceFingerprint": "visitor-id-from-fingerprint-js"
}
```
Response if new device or TOTP required:
```json
{
  "requiresTotp": true,
  "userId": "user-id"
}
```

#### POST `/api/auth/verify-totp`
Verify TOTP code for new device login.
```json
{
  "userId": "user-id",
  "totpCode": "123456",
  "deviceFingerprint": "visitor-id"
}
```

#### POST `/api/auth/setup-totp`
Generate TOTP secret for 2FA setup (requires valid session).
Response:
```json
{
  "secret": "JBSWY3DP...",
  "formattedSecret": "JBSW Y3DP...",
  "qrCode": "data:image/png;base64,..."
}
```

#### POST `/api/auth/confirm-totp`
Confirm TOTP setup by verifying a code (requires valid session).
```json
{
  "totpSecret": "JBSWY3DP...",
  "totpCode": "123456"
}
```

#### GET `/api/auth/session`
Get current session information (requires valid session).
Response:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "isTotpEnabled": true
  },
  "device": {
    "id": "device-id",
    "city": "San Francisco",
    "country": "United States"
  }
}
```

#### POST `/api/auth/logout`
Clear session and logout.

## Authentication Flow

### Signup & Initial Login (LOW RISK)
1. User signs up with email and password
2. Password is hashed with bcrypt (cost: 10)
3. User logs in from same device
4. System detects known device → grants access
5. Session created, user redirected to dashboard

### Login from New Device (HIGH RISK)
1. User logs in from unknown device
2. System detects new device fingerprint
3. If TOTP enabled → require TOTP verification
4. User enters code from authenticator app
5. Device marked as trusted
6. Session created

### 2FA Setup
1. User navigates to dashboard
2. Clicks "Enable Two-Factor Authentication"
3. System generates TOTP secret
4. QR code displayed for scanning
5. Plain text key shown for manual entry
6. User scans with authenticator app
7. User enters 6-digit code to verify
8. 2FA enabled for account

## Device Fingerprinting Logic

```javascript
// On login:
// 1. Get device fingerprint from FingerprintJS (frontend)
// 2. Get IP address (backend from request headers)
// 3. Get geolocation from ipapi.co
// 4. Check if (userId, deviceFingerprint) exists in Device table
//
// If device not found:
//   - If user has 2FA enabled: require TOTP
//   - If user has no 2FA: create device and login
//
// If device found:
//   - If trusted: login directly
//   - If not trusted and 2FA enabled: require TOTP
```

## Risk Calculation

```javascript
function calculateRisk(knownDevice) {
  if (knownDevice && knownDevice.isTrusted) {
    return "LOW"
  }
  return "HIGH"
}

// LOW risk → Skip TOTP, login directly
// HIGH risk → Require TOTP verification
```

## Database Schema

### User
- `id`: Unique identifier
- `email`: User email (unique)
- `password`: Hashed password
- `totpSecret`: TOTP secret (nullable)
- `isTotpEnabled`: Boolean flag
- `createdAt`: Account creation date

### Device
- `id`: Unique identifier
- `userId`: Reference to User
- `deviceFingerprint`: Unique device identifier
- `ipAddress`: Login IP address
- `city`: City from geolocation
- `country`: Country from geolocation
- `isTrusted`: Boolean flag
- `lastSeen`: Last login timestamp

### Session
- `id`: Unique identifier
- `userId`: Reference to User
- `deviceId`: Reference to Device
- `createdAt`: Session creation date
- `expiresAt`: Session expiration date

## Security Features

- ✅ Passwords hashed with bcrypt (cost: 10)
- ✅ Sessions stored with JWT (httpOnly cookies)
- ✅ Device fingerprinting to detect new devices
- ✅ TOTP 2FA for high-risk logins
- ✅ IP geolocation tracking
- ✅ Session expiration (24 hours default)
- ✅ Secure cookie settings (httpOnly, sameSite)

## Deployment

### Environment Variables
- Set `NODE_ENV=production`
- Use a strong `JWT_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- Use a production PostgreSQL database
- Set `SESSION_EXPIRY_HOURS` as needed

### Database Migration
```bash
npx prisma migrate deploy
```

### Build and Start
```bash
npm run build
npm start
```

## Troubleshooting

### "No session" error
- Clear browser cookies
- Ensure `.env.local` has a valid DATABASE_URL
- Check that the database is running

### TOTP code not working
- Ensure device time is synchronized
- Check that the authenticator app shows a 6-digit code
- Try the next code if time has passed

### Device fingerprint not changing
- FingerprintJS generates a stable ID for the same device
- Clear browser data or test in incognito mode
- Different browsers generate different fingerprints

## License

MIT
