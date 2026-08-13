# Adaptive Authentication System - Project Documentation

## Project Overview

This is a full-stack web application implementing an adaptive authentication system with:
- User signup and login
- Device fingerprinting with FingerprintJS
- Geolocation tracking
- TOTP-based two-factor authentication
- Risk assessment for device trust
- Secure session management with JWT

## Technology Stack

- **Frontend**: React with Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: bcryptjs for password hashing, jsonwebtoken for sessions
- **2FA**: Speakeasy for TOTP generation/verification
- **Device Fingerprinting**: FingerprintJS
- **UI Framework**: Tailwind CSS
- **Geolocation**: ipapi.co (free, no API key required)

## Key Files and Responsibilities

### Configuration Files
- `package.json` - Dependencies and scripts
- `prisma/schema.prisma` - Database schema (User, Device, Session models)
- `.env.local` - Environment variables (DATABASE_URL, JWT_SECRET, SESSION_EXPIRY_HOURS)
- `tailwind.config.js` - Tailwind configuration
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript/JavaScript configuration
- `.eslintrc.json` - ESLint configuration

### Library Files (`/lib`)
- `auth.js` - JWT session token generation/verification, cookie management
- `totp.js` - TOTP secret generation, code verification, QR code generation, secret formatting
- `device.js` - Device fingerprint normalization, IP geolocation lookup
- `risk.js` - Risk calculation logic (LOW for trusted devices, HIGH for new devices)

### API Routes (`/app/api/auth`)
- `signup/route.js` - User registration with bcrypt password hashing
- `login/route.js` - Login with device fingerprint detection and risk assessment
- `verify-totp/route.js` - TOTP verification during login for new devices
- `setup-totp/route.js` - Generate TOTP secret for 2FA setup
- `confirm-totp/route.js` - Verify TOTP code and enable 2FA
- `session/route.js` - Retrieve current session information
- `logout/route.js` - Clear session cookie

### Pages (`/app`)
- `page.js` - Root page (redirects to login)
- `layout.js` - Root layout with Tailwind styles
- `globals.css` - Global styles and Tailwind utilities
- `login/page.js` - Login page with FingerprintJS device fingerprinting
- `signup/page.js` - User signup form
- `dashboard/page.js` - Protected dashboard showing user info and 2FA status
- `settings/setup-totp/page.js` - 2FA setup with QR code and TOTP verification
- `auth/verify-totp/page.js` - TOTP verification for new device login

## Database Schema

### User Model
- `id` (String, PK): Unique identifier
- `email` (String, unique): User email address
- `password` (String): Hashed password (bcrypt)
- `totpSecret` (String, nullable): TOTP secret for 2FA
- `isTotpEnabled` (Boolean, default: false): Whether 2FA is enabled
- `createdAt` (DateTime): Account creation timestamp
- Relations: devices[], sessions[]

### Device Model
- `id` (String, PK): Unique identifier
- `userId` (String, FK): Reference to User
- `deviceFingerprint` (String): Unique device fingerprint
- `ipAddress` (String): Login IP address
- `city` (String, nullable): City from geolocation
- `country` (String, nullable): Country from geolocation
- `isTrusted` (Boolean, default: false): Whether device is trusted
- `lastSeen` (DateTime): Last login timestamp
- Unique constraint: userId + deviceFingerprint
- Relations: user (User), sessions[]

### Session Model
- `id` (String, PK): Unique identifier
- `userId` (String, FK): Reference to User
- `deviceId` (String, FK): Reference to Device
- `createdAt` (DateTime): Session creation timestamp
- `expiresAt` (DateTime): Session expiration timestamp
- Relations: user (User), device (Device)

## Authentication Flows

### Signup
1. User submits email and password
2. System checks if email already registered
3. Password hashed with bcrypt (cost: 10)
4. User record created in database
5. Redirect to login page

### Login (Known Device)
1. User submits email, password, device fingerprint
2. Email/password verified
3. Device fingerprint checked in database
4. If device trusted and not first login: create session, redirect to dashboard
5. If device new but 2FA disabled: create device, create session, redirect to dashboard

### Login (New Device with 2FA)
1. User submits credentials and device fingerprint
2. Device fingerprint not found or not trusted
3. User has 2FA enabled
4. Return { requiresTotp: true, userId }
5. Frontend redirects to /auth/verify-totp
6. User enters TOTP code
7. Code verified against user's TOTP secret
8. Device marked as trusted
9. Session created
10. Redirect to dashboard

### 2FA Setup
1. User on dashboard clicks "Enable Two-Factor Authentication"
2. System generates TOTP secret using Speakeasy
3. QR code generated from otpauth URL
4. Display QR code and formatted secret key
5. User scans with authenticator app
6. User enters 6-digit code from authenticator
7. Code verified against secret
8. TOTP secret and isTotpEnabled saved to user
9. Redirect to dashboard

## Risk Assessment

```javascript
calculateRisk(device) {
  if (device && device.isTrusted) return "LOW"
  return "HIGH"
}

// LOW risk: Skip TOTP, login directly
// HIGH risk: Require TOTP verification if enabled
```

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env.local` with:
   - DATABASE_URL: PostgreSQL connection string
   - JWT_SECRET: Strong random secret for JWT signing
   - SESSION_EXPIRY_HOURS: Session duration (default: 24)

3. **Initialize database:**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Access application:**
   Open http://localhost:3000

## Key Implementation Details

### Device Fingerprinting
- FingerprintJS loaded on frontend
- `visitorId` sent with login request
- Normalized to lowercase in backend
- Combined with userId as unique constraint
- Enables device recognition across sessions

### Geolocation
- IP extracted from request headers (x-forwarded-for, x-client-ip, x-real-ip)
- ipapi.co provides free geolocation (no API key needed)
- City and country stored in Device record
- Used for display on dashboard

### Session Management
- JWT token generated with userId and deviceId
- Token signed with JWT_SECRET
- Token expires in SESSION_EXPIRY_HOURS
- Stored in httpOnly, secure, sameSite cookie
- Verified on protected routes

### Password Security
- Passwords never stored in plaintext
- bcrypt with cost factor 10 (slow enough for security)
- Cost factor 10 ≈ ~100ms per hash (appropriate for web apps)

## Common Operations

### Add a new API endpoint
1. Create file in `/app/api/auth/[name]/route.js`
2. Implement GET/POST/PUT/DELETE handlers
3. Use Prisma for database queries
4. Return NextResponse with appropriate status codes

### Add a new page
1. Create file in `/app/[path]/page.js`
2. Use `'use client'` for client components
3. Use Next.js useRouter and hooks
4. Fetch data from API routes
5. Render with Tailwind CSS classes

### Modify database schema
1. Edit `prisma/schema.prisma`
2. Run: `npx prisma migrate dev --name description`
3. Prisma generates migration file automatically

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL`: PostgreSQL connection string (format: postgresql://user:password@host:port/dbname)
- `JWT_SECRET`: Strong random string for JWT signing (min 32 characters)
- `SESSION_EXPIRY_HOURS`: Number of hours session is valid (default: 24)

## Dependencies

### Core
- `next@14.0.0` - React framework
- `react@18.3.1` - UI library
- `@prisma/client@5.7.1` - Database ORM

### Authentication & Security
- `bcryptjs@2.4.3` - Password hashing
- `jsonwebtoken@9.1.2` - JWT token generation/verification

### 2FA & Device
- `speakeasy@2.0.0` - TOTP generation and verification
- `qrcode@1.5.3` - QR code generation
- `@fingerprintjs/fingerprintjs@4.0.1` - Device fingerprinting

### Utilities
- `axios@1.6.2` - HTTP client for geolocation API

### Dev Dependencies
- `prisma@5.7.1` - Database migration tool
- `eslint@8.0.0` - Linting
- `eslint-config-next@14.0.0` - Next.js ESLint config

## Notes for Future Development

- Consider implementing backup codes for 2FA
- Add password reset functionality
- Implement session revocation
- Add audit logging for security events
- Consider implementing rate limiting on login attempts
- Add email verification for signup
- Implement device management page (view/revoke trusted devices)
- Consider adding social login (OAuth)
- Add more sophisticated risk scoring
- Implement breach detection with services like Have I Been Pwned
