# Railway Deployment

This backend is deployment-ready for Railway as an independent NestJS service.

## Railway Services

Create these Railway services:

- SangaPay Backend service from this repository.
- PostgreSQL database service.
- Optional persistent volume mounted at `/app/uploads` for local profile/KYC uploads.

Without a volume at `/app/uploads`, uploaded profile images and KYC documents are stored on ephemeral container disk and can be lost after redeploys. For production, object storage is preferred.

## Required Variables

Set these on the SangaPay Backend Railway service:

```bash
PORT=3000
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SANGAPAY_FRONTEND_URL=
REEPAY_BASE_URL=https://reepay.fakultyng.online
SANGAPAY_REEPAY_API_KEY=
SANGAPAY_REEPAY_APPLICATION_ID=sangapay-backend
REEPAY_WEBHOOK_SECRET=
```

Optional email variables:

```bash
RESEND_API_KEY=
EMAIL_FROM=SangaPay <no-reply@sangapay.com>
```

Default admin bootstrap variables:

```bash
DEFAULT_ADMIN_EMAIL=
DEFAULT_ADMIN_PASSWORD=
DEFAULT_ADMIN_PIN=
```

If no admin exists, the backend creates one on startup. Do not use the development defaults in production.

## Build And Start

The repository includes:

- `Dockerfile`
- `railway.json`
- `.dockerignore`

Railway should use the Dockerfile builder.

Configured deployment behavior:

- Build: `pnpm install --frozen-lockfile`, `pnpm prisma:generate`, `pnpm build`
- Pre-deploy migration: `pnpm prisma:deploy`
- Start: `pnpm start:railway`
- Healthcheck: `GET /ready`

## Manual Railway Setup

1. Create a new Railway project.
2. Add PostgreSQL.
3. Add this backend repository as a service.
4. Set the required variables above.
5. Configure the public domain for the backend service.
6. Set `SANGAPAY_FRONTEND_URL` to the deployed frontend origin.
7. Deploy.
8. Confirm:

```bash
curl https://your-backend.railway.app/health
curl https://your-backend.railway.app/ready
```

## Migration Commands

Railway pre-deploy runs:

```bash
pnpm prisma:deploy
```

For local checks:

```bash
pnpm prisma:generate
pnpm build
pnpm lint
pnpm test
```

The Railway start script runs migrations before booting the app:

```bash
pnpm prisma:deploy && node dist/src/main.js
```

If Railway logs say `The table public.users does not exist`, migrations did not run against the same database URL used by the app. Confirm `DATABASE_URL` is set on the backend service and points to the Railway Postgres service.

If you need to inspect migration status against a configured production database:

```bash
pnpm prisma migrate status
```

## Frontend Configuration

After Railway deploys the backend, configure the frontend API base URL to the Railway domain.

The frontend must:

- Call SangaPay Backend only.
- Never call Reepay or providers directly.
- Never send arbitrary `customerId` values.
- Use bearer auth with the backend-issued access token.
- Use PIN or biometric unlock after 5 minutes or app close.

See `docs/frontend-api-contract.md` for the full frontend contract.

## Production Checklist

- Set strong `JWT_ACCESS_SECRET`.
- Set strong `JWT_REFRESH_SECRET`.
- Set real `SANGAPAY_REEPAY_API_KEY`.
- Set real `REEPAY_WEBHOOK_SECRET`.
- Set `SANGAPAY_FRONTEND_URL` to the frontend production origin.
- Override default admin credentials.
- Add a volume at `/app/uploads` or replace local uploads with object storage.
- Confirm `/ready` returns healthy.
- Confirm Reepay webhook target points to `/webhooks/reepay`.
- Confirm CORS allows only the frontend production origin.
