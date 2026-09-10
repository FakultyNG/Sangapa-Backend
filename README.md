# SangaPay Backend

Backend API for SangaPay. This service owns SangaPay users, sessions, frontend API contracts, product-side records, and server-to-server communication with Reepay.

SangaPay Backend must only call Reepay for payment and wallet operations. It must not call KryptaPay, Wise, TrackSend, or other payment providers directly.

## Development

```bash
pnpm install
pnpm start:dev
```

Copy `.env.example` to `.env` and set real secrets before starting the app.

## Scripts

```bash
pnpm lint
pnpm test
pnpm build
```

## Health

- `GET /health`
- `GET /ready`

## Frontend Integration

Share `docs/frontend-api-contract.md` with the frontend agent for auth, wallet, KYC, notifications, and admin dashboard integration details.

## Railway Deployment

Use `docs/railway-deployment.md` for Railway environment variables, healthchecks, migrations, and deployment steps.
