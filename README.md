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
`http://localhost:3000` through `.env.example`.

Current implementation uses in-memory data to make the feature testable before
database, authentication, container provisioning, and OpenClaw integration are
available. Restarting the backend resets workspace data to the seeded examples.
