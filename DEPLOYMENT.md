# Production Deployment Guide

## Issue Fixed: 403 Forbidden on Profile Update

### Root Cause
The 403 error was caused by **CORS misconfiguration**. The Next.js config had:
- `Access-Control-Allow-Origin: *` 
- `Access-Control-Allow-Credentials: true`

This combination is **forbidden by browsers** for security reasons. When using credentials (cookies), you must specify exact allowed origins.

### Changes Made

#### 1. **Updated `.env` for Production**
```env
DB_HOST=localhost
DB_USER=malaysiadev_cal
DB_PASSWORD=ch@x{HzRke@s}_d7B&
DB_NAME=malaysiadev_cal
JWT_SECRET=5kyeNg1JL63Bps0NRUtdI5e2nCXZnicmX5Xywicvin8QCdY0bdzAdMD0LGsdRcuFGnX9tlZSkP960gDMZd0uVJNEXTAUTH_URL=https://cal.ansartechnologies.my
NODE_ENV=production
```

#### 2. **Created `src/middleware.ts`**
- Proper CORS handling with specific allowed origins
- Supports credentials (cookies) correctly
- Handles preflight OPTIONS requests

#### 3. **Updated `next.config.ts`**
- Removed conflicting CORS headers
- CORS now handled in middleware for better control

#### 4. **Updated `src/app/api/auth/login/route.ts`**
- Cookie `secure` flag now based on `NODE_ENV`
- Added logging for debugging

#### 5. **Updated `src/lib/auth.ts`**
- Added logging to track cookie verification

#### 6. **Updated `src/app/api/profile/route.ts`**
- Added detailed logging for debugging

## Deployment Steps

### Step 1: Copy Files to Production
Copy these files to `F:\Programming\production-web`:

```bash
# Copy all source files
xcopy /E /I /Y f:\Programming\cal-ansartechnologies-my\src f:\Programming\production-web\src
xcopy /E /I /Y f:\Programming\cal-ansartechnologies-my\prisma f:\Programming\production-web\prisma
xcopy /E /I /Y f:\Programming\cal-ansartechnologies-my\public f:\Programming\production-web\public

# Copy config files
copy /Y f:\Programming\cal-ansartechnologies-my\next.config.ts f:\Programming\production-web\
copy /Y f:\Programming\cal-ansartechnologies-my\package.json f:\Programming\production-web\
copy /Y f:\Programming\cal-ansartechnologies-my\tsconfig.json f:\Programming\production-web\
copy /Y f:\Programming\cal-ansartechnologies-my\server.js f:\Programming\production-web\
copy /Y f:\Programming\cal-ansartechnologies-my\.env f:\Programming\production-web\
```

### Step 2: Install Dependencies
```bash
cd f:\Programming\production-web
npm install
```

### Step 3: Build for Production
```bash
npm run build
```

### Step 4: Restart the Server
```bash
# Stop the current process (if running)
# Then start:
node server.js
```

### Step 5: Test the Fix

1. **Clear browser cookies** for `cal.ansartechnologies.my`
2. **Log in again** at https://cal.ansartechnologies.my
3. **Go to profile** at https://cal.ansartechnologies.my/profile
4. **Update your profile** - it should now work!

## Verification

Check the server logs for these messages:
```
[Login] Cookie set for user: [email] isProduction: true
[getSession] Cookie found: true
[getSession] Token verified: true
[PATCH /api/profile] Request received
[PATCH /api/profile] Session verified: [userId]
```

## Troubleshooting

### If still getting 403:

1. **Check browser console** for CORS errors
2. **Check server logs** for authentication errors
3. **Verify environment variables** are loaded:
   ```bash
   # In production folder
   node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
   ```

4. **Check cookie in browser DevTools**:
   - Open DevTools → Application → Cookies
   - Look for `auth_token` cookie
   - Verify it has `Secure` and `HttpOnly` flags

### If cookie is not being set:

1. Ensure `NODE_ENV=production` in `.env`
2. Ensure HTTPS is working (check browser address bar for lock icon)
3. Clear all cookies and log in again

### If database connection fails:

1. Verify database credentials in `.env`
2. Test connection:
   ```bash
   npx prisma db pull
   ```

## Security Notes

- ✅ Cookies are `httpOnly` (protected from XSS)
- ✅ Cookies are `secure` in production (HTTPS only)
- ✅ CORS properly configured with specific origins
- ✅ JWT secret is strong and unique for production
- ✅ Database password is properly encoded in connection string

## Allowed Origins

The middleware allows these origins:
- `https://cal.ansartechnologies.my` (production)
- `https://cal.sibu.org.my` (Cloudflare tunnel)
- `http://localhost:3000` (development)

To add more origins, edit `src/middleware.ts`.
