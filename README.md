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

The backend uses PostgreSQL with Knex and Prisma. A local database container is defined in `docker-compose.yml`.

Start the database:

```sh
docker compose up -d db
```

Run the Agent module migration after the database is up:

```sh
npm run db:migrate --workspace @ai-agent-platform/backend
```

Run Authentication Prisma migrations:

```sh
npm run prisma:migrate:deploy --workspace @ai-agent-platform/backend
```

Generate the Prisma client:

```sh
npm run prisma:generate --workspace @ai-agent-platform/backend
```

Run backend Authentication integration tests against an isolated test database.
`TEST_DATABASE_URL` must not match `DATABASE_URL`, and the database name must
clearly identify it as test data, for example `ai_agent_platform_test`:

```sh
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ai_agent_platform_test?schema=public"
DATABASE_URL="$TEST_DATABASE_URL" npm run prisma:migrate:deploy --workspace @ai-agent-platform/backend
npm run test:auth:integration --workspace @ai-agent-platform/backend
```

The full backend test suite runs unit tests plus Authentication integration
tests, so it also requires `TEST_DATABASE_URL`:

```sh
npm test --workspace @ai-agent-platform/backend
```

Connection details for TablePlus or any other client:

- Host: `localhost`
- Port: `5433`
- User: `postgres`
- Password: `postgres`
- Database: `ai_agent_platform`

The database data is stored in the named volume defined in `docker-compose.yml`, so it persists across container restarts.

## Backend Health Check

The backend exposes a minimal system health route:

```http
GET /api/health
```

## Workspace Management

The Workspace Management MVP is available in the frontend app and uses in-memory
backend data for the current phase.

Backend endpoints:

```http
GET /api/workspaces
GET /api/workspaces/:workspaceId
POST /api/workspaces
PATCH /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId
POST /api/workspaces/:workspaceId/start
POST /api/workspaces/:workspaceId/stop
POST /api/workspaces/:workspaceId/restart
POST /api/workspaces/:workspaceId/retry
POST /api/workspaces/:workspaceId/complete
POST /api/workspaces/:workspaceId/fail
```

The frontend reads `VITE_API_BASE_URL` from the environment and defaults to
`/api`; the Vite dev proxy forwards `/api` to `http://localhost:3000`.

Current implementation uses in-memory data to make the feature testable before
database, authentication, container provisioning, and OpenClaw integration are
available. Restarting the backend resets workspace data to the seeded examples.
