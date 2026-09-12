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
pnpm admin:create
```

`pnpm admin:create` creates or updates an admin using `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_PIN`. It falls back to `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, and `DEFAULT_ADMIN_PIN`.

Set `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, and `DEFAULT_ADMIN_PIN` in deployment envs to create or rotate a dashboard admin at startup. The backend does not ship hardcoded admin credentials.

## Health

- `GET /health`
- `GET /ready`

## Frontend Integration

Share `docs/frontend-api-contract.md` with the frontend agent for auth, wallet, KYC, notifications, and admin dashboard integration details.

## Railway Deployment

Use `docs/railway-deployment.md` for Railway environment variables, healthchecks, migrations, and deployment steps.
