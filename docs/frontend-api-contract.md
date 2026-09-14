# SangaPay Frontend API Contract

This document describes the current SangaPay Backend contract for frontend and admin dashboard integration.

## Core Rules

- The frontend must call SangaPay Backend only.
- The frontend must never call Reepay directly.
- The frontend must never call KryptaPay, Wise, TrackSend, or any payment provider directly.
- The frontend must not submit arbitrary `customerId` values for wallet, deposit, payout, or transaction APIs.
- SangaPay Backend derives Reepay `customerId` from the authenticated SangaPay user session.
- Use string amounts for money. Do not use JS floating point math for balances, deposits, FX, limits, or payouts.

## Response Shape

Successful responses:

```json
{
  "data": {},
  "meta": {
    "requestId": "request-id",
    "timestamp": "2026-09-10T00:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "requestId": "request-id"
  },
  "meta": {
    "timestamp": "2026-09-10T00:00:00.000Z",
    "path": "/path"
  }
}
```

Frontend API clients should unwrap successful payloads from `response.data`.

Common frontend integration failure:

- Backend returns `{ data: { accessToken, refreshToken, user }, meta }` from login.
- The frontend must store `apiResponse.data.accessToken`, not `apiResponse.accessToken`.
- Protected requests must send `Authorization: Bearer <accessToken>`.
- If wallet screens say backend data will load after authentication, first verify `GET /auth/me` succeeds with the stored access token.
- Wallet, transaction, deposit, payout, and FX endpoints depend on Reepay availability and valid SangaPay-to-Reepay env variables.

## Authentication

Use bearer auth for protected endpoints:

```http
Authorization: Bearer <accessToken>
```

Access tokens last 5 minutes.

Refresh sessions can last up to 5 days of inactivity. After 5 minutes, or after the app is closed, the frontend should require PIN or biometric unlock instead of asking for email/password again. Email/password login is required again after logout, revoked sessions, or 5 days of inactivity.

OTP is used for registration email verification and password reset only. Login does not require OTP.

### Register

`POST /auth/register`

```json
{
  "email": "user@example.com",
  "password": "password",
  "pin": "1234",
  "fullName": "User Name",
  "phoneNumber": "237670000000"
}
```

Result: sends email OTP. New users default to `TIER_1`.

OTP challenge responses include:

```json
{
  "success": true,
  "message": "Verification code sent to email",
  "expiresInSec": 600,
  "retryAfterSec": 60
}
```

Use `retryAfterSec` to disable the resend button and display a countdown.

Database `createdAt` and `expiresAt` timestamps are stored in UTC. Frontend countdowns should use `expiresInSec` and `retryAfterSec`, not raw database timestamps.

### Verify Email

`POST /auth/verify-email`

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

The backend trims whitespace before checking the OTP. The frontend should still sanitize OTP input before sending it by keeping digits only and joining segmented inputs into one 6-digit string.

If multiple OTP emails arrive out of order, the backend will accept any unexpired unused code for that email and purpose. A successful OTP verification consumes all outstanding codes for the same email and purpose.

### Resend Registration OTP

`POST /auth/resend-email-otp`

```json
{
  "email": "user@example.com"
}
```

If the user is still inside the resend cooldown, the backend returns success with the remaining `retryAfterSec`; the frontend should keep the resend button disabled until it reaches zero.

### Login

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Returns:

```json
{
  "accessToken": "jwt",
  "refreshToken": "refresh-token",
  "tokenType": "Bearer",
  "expiresInSec": 300,
  "user": {}
}
```

### Refresh With PIN

`POST /auth/refresh`

```json
{
  "refreshToken": "refresh-token",
  "pin": "1234"
}
```

### Unlock With PIN

`POST /auth/unlock/pin`

```json
{
  "refreshToken": "refresh-token",
  "pin": "1234"
}
```

### Logout

`POST /auth/logout`

Protected. Requires:

```http
Authorization: Bearer <accessToken>
```

Body: none.

Returns:

```json
{
  "success": true
}
```

Frontend behavior:

- Call this endpoint when the user taps Logout.
- Clear `accessToken`, `refreshToken`, current user, biometric lock state for the active app session, and cached sensitive data.
- Navigate back to the login screen.
- If logout fails because the access token is already expired, still clear local auth state and navigate to login.

### Current User

`GET /auth/me`

Protected.

### Update Profile

`PATCH /auth/profile`

Protected.

```json
{
  "fullName": "User Name",
  "phoneNumber": "237670000000"
}
```

### Forgot Password

`POST /auth/forgot-password`

```json
{
  "email": "user@example.com"
}
```

`POST /auth/forgot-password/confirm`

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "new-password"
}
```

Password reset OTP is also trimmed by the backend. Frontend OTP input should send a single 6-digit string.

Aliases also supported:

- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

### Verify PIN

`POST /auth/pin/verify`

Protected.

```json
{
  "pin": "1234"
}
```

## Biometrics

The backend cannot directly scan Face ID or fingerprints. The mobile app must perform biometric verification locally and use it to unlock a device private key.

Expected frontend flow:

1. Generate a device key pair.
2. Store the private key using platform secure storage protected by Face ID/fingerprint.
3. Register the public key with the backend.
4. Request a backend challenge.
5. Unlock the private key locally using biometrics.
6. Sign the challenge.
7. Send the signed challenge to the backend.

### List Biometric Devices

`GET /auth/biometrics`

Protected.

### Register Biometric Device

`POST /auth/biometrics/register`

Protected.

```json
{
  "deviceId": "stable-device-id",
  "publicKey": "PEM_PUBLIC_KEY",
  "pin": "1234"
}
```

### Enable Or Disable Biometric Device

`PATCH /auth/biometrics/:deviceId`

Protected.

```json
{
  "enabled": true
}
```

### Create Biometric Challenge

`POST /auth/biometrics/challenge`

```json
{
  "deviceId": "stable-device-id"
}
```

### Login With Biometric Signature

`POST /auth/biometrics/login`

```json
{
  "deviceId": "stable-device-id",
  "challenge": "backend-challenge",
  "signature": "base64-signature"
}
```

Returns auth tokens.

## User Shape

```json
{
  "id": "user-id",
  "customerId": "user-id",
  "email": "user@example.com",
  "fullName": "User Name",
  "phoneNumber": "237670000000",
  "profileImageUrl": "/uploads/profiles/user-id/file.jpg",
  "emailVerified": true,
  "status": "ACTIVE",
  "role": "USER",
  "tier": "TIER_1",
  "dailyDepositLimitXaf": "0",
  "monthlyDepositLimitXaf": "0",
  "emailNotificationsEnabled": true,
  "createdAt": "2026-09-10T00:00:00.000Z",
  "updatedAt": "2026-09-10T00:00:00.000Z"
}
```

Roles:

- `USER`
- `ADMIN`

Statuses:

- `ACTIVE`
- `DISABLED`

Tiers:

- `TIER_1`
- `TIER_2`

Default backend limits:

- Tier 1 daily deposit limit: `0` XAF
- Tier 1 monthly deposit limit: `0` XAF
- Tier 2 daily deposit limit: `5000000` XAF
- Tier 2 monthly deposit limit: `50000000` XAF

The backend does not currently expose a separate minimum transaction limit field. Frontend should display minimum as `0` unless a future backend field is added.

## Wallets

Total wallet is composed of:

- XAF wallet
- EUR wallet
- USDC wallet

Reepay is the source of truth. Do not show SangaPay database values as authoritative wallet balances.

Protected routes:

- `GET /wallet/balance`
- `GET /wallet/xaf`
- `GET /wallet/eur`
- `GET /wallet/usdc`
- `GET /wallet/summary`
- `GET /wallet/funding-instructions`
- `GET /wallet/recent-transactions?limit=20`

`GET /wallet/summary` can return a partial success if one Reepay wallet fails while others load:

```json
{
  "customerId": "user-id",
  "wallets": {
    "xaf": {},
    "eur": null,
    "usdc": {}
  },
  "sourceOfTruth": "REEPAY",
  "partial": true,
  "walletErrors": {
    "eur": {
      "code": "REEPAY_WALLET_NOT_FOUND",
      "message": "EUR wallet not found"
    }
  }
}
```

If `partial` is true, the frontend should render loaded wallets and show a wallet-specific unavailable state for null wallets instead of treating the whole backend as unavailable.

## Deposits

### Create XAF Deposit

`POST /deposits/xaf`

Protected. Use `Idempotency-Key` for create operations when available.

```json
{
  "amount": "10000",
  "network": "MTN_CM",
  "phoneNumber": "237670000000",
  "fullName": "User Name",
  "email": "user@example.com",
  "redirectUrl": "https://frontend.example.com/deposits/return",
  "expiresInSec": 900,
  "pin": "1234"
}
```

Other deposit routes:

- `GET /deposits/:id`
- `POST /deposits/:id/verify`

## FX And Wallet Funding

Protected. Use `Idempotency-Key` for quote and confirm operations when available.

- `GET /fx/rates?amount=1000`
- `GET /fx/rates/xaf-eur?amount=1000`
- `GET /fx/rates/xaf-usdc?amount=1000`
- `POST /wallet/eur/quote`
- `POST /wallet/eur/confirm`
- `POST /wallet/usdc/quote`
- `POST /wallet/usdc/confirm`
- `POST /fx/quote/xaf-eur`
- `POST /fx/quote/xaf-usdc`

Sensitive or money-moving actions should ask for PIN in the UI before sending the request.

Read-only FX rate endpoints do not require PIN. They still require bearer auth and derive `customerId` from the authenticated user.

`GET /fx/rates` can return partial data:

```json
{
  "baseCurrency": "XAF",
  "amount": "1000",
  "rates": {
    "xafEur": {},
    "xafUsdc": null
  },
  "sourceOfTruth": "REEPAY",
  "partial": true,
  "rateErrors": {
    "xafUsdc": {
      "code": "REEPAY_RATE_UNAVAILABLE",
      "message": "USDC rate unavailable"
    }
  }
}
```

If `partial` is true, render available rates and show a rate-specific unavailable state for null pairs.

## Payouts

Protected. Use `Idempotency-Key` for quote and confirm operations when available.

- `POST /payouts/eur/recipient/validate`
- `POST /payouts/eur/iban/quote`
- `POST /payouts/eur/iban/confirm`
- `POST /payouts/eur/wisetag/quote`
- `POST /payouts/eur/wisetag/confirm`
- `POST /payouts/usdc/address/quote`
- `POST /payouts/usdc/address/confirm`
- `GET /payouts/:id`

Do not mark payout successful from initial confirmation. Final status comes from Reepay updates.

## Transactions

Protected.

- `GET /transactions?limit=20&cursor=...`
- `GET /transactions/:id`

The frontend must not submit `customerId`.

## Beneficiaries

Protected.

- `GET /beneficiaries`
- `POST /beneficiaries`
- `GET /beneficiaries/:id`
- `PATCH /beneficiaries/:id`
- `DELETE /beneficiaries/:id`

Supported beneficiary types:

- `EUR_IBAN`
- `EUR_WISETAG`
- `USDC_ADDRESS`

## Notifications

Protected.

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

Email notification settings:

- `GET /settings/email-notifications`
- `PATCH /settings/email-notifications`

```json
{
  "enabled": true
}
```

Email notifications are enabled by default.

## KYC

### Submit Tier 2 KYC

`POST /kyc/tier-2`

Protected. Use `multipart/form-data`.

Text fields:

- `countryOfOrigin`: manual text input
- `countryOfResidence`: manual text input
- `idCardType`: `PASSPORT`, `NATIONAL_ID`, `VOTER_CARD`, or `DRIVER_LICENCE`

File fields:

- `proofOfAddress`: jpg, png, webp, or pdf
- `faceVerification`: image file from live selfie camera
- `idFront`: jpg, png, webp, or pdf
- `idBack`: jpg, png, webp, or pdf

Other protected KYC routes:

- `POST /kyc/submissions`
- `GET /kyc/submissions`
- `GET /kyc/submissions/:id`

## Admin Dashboard

Admin users have role `ADMIN`.

Admin bootstrap uses deployment envs only:

- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_ADMIN_PIN`

The backend does not ship hardcoded admin credentials. Do not prefill admin login forms with local/example credentials.

To create or rotate an admin account from CLI/Railway shell:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='StrongPassword123!' ADMIN_PIN=1234 pnpm admin:create
```

All admin routes require bearer token for an `ADMIN` user.

### Admin Users

`GET /admin/users`

Optional query filters:

- `email`
- `role`: `USER` or `ADMIN`
- `tier`: `TIER_1` or `TIER_2`

`POST /admin/users`

```json
{
  "email": "user@example.com",
  "password": "password",
  "pin": "1234",
  "fullName": "User Name",
  "phoneNumber": "237670000000",
  "role": "USER",
  "tier": "TIER_1"
}
```

`GET /admin/users/:id`

`PATCH /admin/users/:id`

```json
{
  "email": "user@example.com",
  "fullName": "User Name",
  "phoneNumber": "237670000000",
  "role": "USER",
  "status": "ACTIVE",
  "tier": "TIER_1"
}
```

`POST /admin/users/:id/profile-image`

Use `multipart/form-data`.

File field:

- `profileImage`

`PATCH /admin/users/:id/limits`

```json
{
  "tier": "TIER_1",
  "dailyDepositLimitXaf": "0",
  "monthlyDepositLimitXaf": "0"
}
```

`PATCH /admin/users/:id/suspend`

Suspends the user and revokes active sessions.

`PATCH /admin/users/:id/activate`

Reactivates the user.

`DELETE /admin/users/:id`

Deletes the user account. Admins cannot delete their own account.

`GET /admin/users/:id/wallets`

Read-only wallet summary for XAF, EUR, and USDC. Do not add admin payment initiation controls.

### Admin KYC

`GET /admin/kyc/submissions`

Optional query:

- `status`: `PENDING`, `APPROVED`, or `REJECTED`

`POST /admin/kyc/submissions/:id/approve`

Approves KYC and promotes the user to Tier 2 limits.

`POST /admin/kyc/submissions/:id/reject`

```json
{
  "reason": "Reason for rejection"
}
```

### Admin Environment Overrides

`GET /admin/env`

Lists dashboard-managed environment overrides. Sensitive values are returned as `********`.

`PATCH /admin/env`

```json
{
  "key": "SOME_KEY",
  "value": "some-value",
  "sensitive": true
}
```

Important:

- These are database-backed dashboard overrides.
- Do not expose raw secrets in the UI.
- Do not assume this mutates process environment variables immediately unless the backend later documents runtime reload behavior.

### Admin Endpoint Inventory

`GET /admin/dashboard/endpoints`

Returns admin-dashboard useful endpoints.

## Recommended Frontend Work

Build:

- API client that unwraps `data` and handles wrapped errors.
- Auth store for access token, refresh token, current user, and lock state.
- Login screen.
- Registration and email OTP verification.
- Forgot password flow.
- PIN unlock screen after access-token expiry or app close.
- Biometric enrollment and biometric login flow.
- User wallet dashboard for XAF, EUR, and USDC.
- Deposits, FX funding, payouts, transactions, beneficiaries, notifications.
- Tier 2 KYC form with the exact multipart fields above.
- Admin dashboard guarded by `user.role === "ADMIN"`.
- Admin user management pages.
- Admin read-only wallet panel.
- Admin KYC review queue and detail view.
- Admin limit editor.
- Admin env override page with redacted secrets.

Do not build admin payment initiation controls.
