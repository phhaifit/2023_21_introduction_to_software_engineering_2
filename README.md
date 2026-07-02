# AI Agent Platform for Enterprise

Shared project foundation for the AI Agent Platform for Enterprise.

## Workspaces

- `apps/frontend`: React, TypeScript, and Vite frontend.
- `apps/backend`: Node.js, TypeScript, and Express backend.
- `packages/shared`: Shared TypeScript package for cross-workspace values.

## Getting Started

Install dependencies:

```sh
npm install
```

Run both applications in development mode:

```sh
npm run dev
```

Run each application separately:

```sh
npm run dev:frontend
npm run dev:backend
```

Build all workspaces:

```sh
npm run build
```

Type-check all workspaces:

```sh
npm run typecheck
```

## Local Database

The backend uses PostgreSQL through Knex. A local database container is defined in `docker-compose.yml`.

Start the database:

```sh
docker compose up -d db
```

Run all database migrations after PostgreSQL is healthy:

```sh
npm run db:migrate --workspace @ai-agent-platform/backend
```

Connection details for TablePlus or any other client:

- Host: `localhost`
- Port: `5433`
- User: `postgres`
- Password: `postgres`
- Database: `ai_agent_platform`

The data lives in the Docker volume `ai_agent_platform_pgdata`, so it persists across container restarts.

Verify the Subscription & Payment tables and seeded plans:

```sh
docker compose exec db psql -U postgres -d ai_agent_platform -c "\dt"
docker compose exec db psql -U postgres -d ai_agent_platform \
  -c "SELECT id, name, monthly_price FROM plans ORDER BY monthly_price;"
```

Rollback the latest migration batch:

```sh
npm run db:rollback --workspace @ai-agent-platform/backend
```

## Subscription & Payment MVP

Start PostgreSQL, apply migrations, and run both applications:

```sh
docker compose up -d db
npm run db:migrate --workspace @ai-agent-platform/backend
npm run dev
```

Development URLs:

- Pricing and checkout: `http://localhost:5173/app/subscription/plans`
- Current subscription: `http://localhost:5173/app/subscription`
- Admin subscription list: `http://localhost:5173/app/admin/subscriptions`
- Backend API: `http://localhost:3000/api`

The local checkout redirects to a developer-only mock gateway. Its actions simulate:

- payment success;
- payment success followed by workspace provisioning failure;
- payment failure;
- user cancellation.

`PROVISIONING_FAILED` means payment completed and the subscription remains active, but
workspace setup needs a retry by the support/integration workflow. It does not roll back
the payment. Workspace adapters receive the payment transaction ID as an idempotency key,
so a retry can reuse the same workspace operation safely.

The mock API is available only when both conditions are true:

```text
PAYMENT_PROVIDER=mock
NODE_ENV is not production
```

The frontend mock page is included only in a Vite development build. In production, a
hosted payment provider decides the result and calls a verified backend webhook; customers
must never choose their own payment outcome.

Useful backend environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Backend HTTP port |
| `DATABASE_URL` | unset | Full PostgreSQL connection string; overrides `PG*` variables |
| `PGHOST` | `127.0.0.1` | PostgreSQL host |
| `PGPORT` | `5433` | PostgreSQL port |
| `PGUSER` | `postgres` | PostgreSQL user |
| `PGPASSWORD` | `postgres` | PostgreSQL password |
| `PGDATABASE` | `ai_agent_platform` | PostgreSQL database |
| `DEFAULT_USER_ID` | `local-user` | Development identity |
| `DEFAULT_WORKSPACE_ID` | `default-workspace` | Development workspace |
| `DEFAULT_USER_ROLE` | `admin` | Development role (`admin` or `member`) |
| `PAYMENT_PROVIDER` | `mock` | Payment adapter selector |
| `NODE_ENV` | `development` | Runtime environment and mock API safety guard |

Local identity, the mock payment gateway, and the mock workspace provisioner are MVP
development seams. They must be replaced by authentication, a real hosted payment
adapter/webhook, and a real workspace adapter before production deployment.

## Verification

Run the automated checks:

```sh
npm test --workspace @ai-agent-platform/backend
npm test --workspace @ai-agent-platform/frontend
npm run typecheck
npm run build
```

## Backend Health Check

The backend exposes a minimal system health route:

```http
GET /api/health
```
