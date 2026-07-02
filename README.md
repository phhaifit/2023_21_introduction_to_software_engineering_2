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
