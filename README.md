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
