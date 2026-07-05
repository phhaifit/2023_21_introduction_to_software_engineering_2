import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import { createAuthController, type AuthControllerService } from "../src/controllers/auth.controller.js";
import { createAuthMiddleware, type AuthenticationService } from "../src/middleware/auth.middleware.js";
import { createAuthenticateRequest } from "../src/middleware/authentication.js";
import { createAuthRouter } from "../src/routes/auth.routes.js";
import { AuthServiceError, type AuthServiceErrorCode } from "../src/services/auth.service.js";

const RAW_ACCESS_TOKEN = "raw-access-token";
const TOKEN_HASH = "stored-token-hash";
const PUBLIC_USER = {
  id: "user-123",
  email: "current.user@example.com",
  status: "active" as const
};

interface HandlerResult {
  status: number;
  body: unknown;
  nextCount: number;
}

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: RequestHandler }>;
  };
}

function createService(options: {
  error?: Error;
  user?: typeof PUBLIC_USER;
  calls?: string[];
} = {}): AuthenticationService {
  return {
    async resolveCurrentUser(accessToken) {
      options.calls?.push(accessToken);

      if (options.error) {
        throw options.error;
      }

      return options.user ?? PUBLIC_USER;
    }
  };
}

function authError(code: AuthServiceErrorCode, message: string) {
  return new AuthServiceError(code, message);
}

async function callMiddleware(
  middleware: RequestHandler,
  headers: Record<string, string> = {}
): Promise<HandlerResult & { request: Request }> {
  let status = 200;
  let body: unknown;
  let nextCount = 0;
  const request = {
    headers,
    header(name: string) {
      return headers[name.toLowerCase()];
    }
  } as Request;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    }
  } as Response;
  const next: NextFunction = () => {
    nextCount += 1;
  };

  await middleware(request, response, next);

  return { status, body, nextCount, request };
}

async function callHandler(
  handler: RequestHandler,
  request: Request = { headers: {} } as Request
): Promise<HandlerResult> {
  let status = 200;
  let body: unknown;
  let nextCount = 0;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    }
  } as Response;
  const next: NextFunction = () => {
    nextCount += 1;
  };

  await handler(request, response, next);

  return { status, body, nextCount };
}

function assertSafeError(body: unknown) {
  const serialized = inspect(body);

  assert.equal(serialized.includes(RAW_ACCESS_TOKEN), false);
  assert.equal(serialized.includes(TOKEN_HASH), false);
  assert.equal(serialized.includes("stack"), false);
  assert.equal(serialized.includes("cause"), false);
  assert.equal(serialized.includes("revoked"), false);
  assert.equal(serialized.includes("expired"), false);
}

function createControllerService(): AuthControllerService {
  return {
    async register() {
      return PUBLIC_USER;
    },
    async login() {
      return {
        user: PUBLIC_USER,
        accessToken: RAW_ACCESS_TOKEN,
        expiresAt: "2026-07-03T01:00:00.000Z"
      };
    },
    async logout() {},
    async resolveCurrentUser() {
      return PUBLIC_USER;
    }
  };
}

test("auth middleware resolves valid Bearer tokens and attaches public user context", async () => {
  const calls: string[] = [];
  const middleware = createAuthMiddleware(createService({ calls }));
  const result = await callMiddleware(middleware, {
    authorization: `bEaReR ${RAW_ACCESS_TOKEN}`
  });

  assert.deepEqual(calls, [RAW_ACCESS_TOKEN]);
  assert.deepEqual(result.request.authenticatedUser, PUBLIC_USER);
  assert.equal(result.nextCount, 1);
  assert.equal(result.status, 200);
});

test("auth middleware rejects missing and malformed Authorization headers", async () => {
  const cases: Array<Record<string, string>> = [
    {},
    { authorization: "Token raw-access-token" },
    { authorization: "Bearer" },
    { authorization: "Bearer   " },
    { authorization: "Bearer raw access token" }
  ];

  for (const headers of cases) {
    const calls: string[] = [];
    const result = await callMiddleware(createAuthMiddleware(createService({ calls })), headers);

    assert.equal(result.status, 401);
    assert.equal(result.nextCount, 0);
    assert.equal(result.request.authenticatedUser, undefined);
    assert.deepEqual(calls, []);
    assertSafeError(result.body);
  }
});

test("auth middleware maps token rejection and account status errors safely", async () => {
  const cases = [
    { error: authError(AUTH_ERROR_CODES.UNAUTHORIZED, "Authentication required."), status: 401 },
    { error: authError(AUTH_ERROR_CODES.ACCOUNT_DISABLED, "Account is disabled."), status: 403 },
    { error: authError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, "Account is locked."), status: 403 },
    { error: authError("CURRENT_USER_FAILED", "Current user resolution failed."), status: 500 },
    { error: new Error("database outage with token details"), status: 500 }
  ];

  for (const authCase of cases) {
    const result = await callMiddleware(createAuthMiddleware(createService({ error: authCase.error })), {
      authorization: `Bearer ${RAW_ACCESS_TOKEN}`
    });

    assert.equal(result.status, authCase.status);
    assert.equal(result.nextCount, 0);
    assert.equal(result.request.authenticatedUser, undefined);
    assertSafeError(result.body);
  }
});

test("me handler returns only the authenticated public user", async () => {
  const controller = createAuthController(createControllerService());
  const request = {
    headers: {},
    authenticatedUser: PUBLIC_USER
  } as Request;
  const result = await callHandler(controller.me, request);
  const serialized = inspect(result.body);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { user: PUBLIC_USER });
  assert.equal(serialized.includes("passwordHash"), false);
  assert.equal(serialized.includes("tokenHash"), false);
  assert.equal(serialized.includes("accessToken"), false);
});

test("me handler rejects missing authenticated context safely", async () => {
  const controller = createAuthController(createControllerService());
  const result = await callHandler(controller.me);

  assert.equal(result.status, 401);
  assertSafeError(result.body);
});

test("auth router protects only GET /me with middleware before controller", () => {
  const controller = createAuthController(createControllerService());
  const middleware = createAuthMiddleware(createService());
  const router = createAuthRouter(controller, middleware);
  const routes = (router.stack as unknown as RouteLayer[])
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route?.path,
      methods: layer.route?.methods,
      handlers: layer.route?.stack.map((item) => item.handle)
    }));

  assert.deepEqual(routes.map(({ path, methods }) => ({ path, methods })), [
    { path: "/register", methods: { post: true } },
    { path: "/login", methods: { post: true } },
    { path: "/logout", methods: { post: true } },
    { path: "/me", methods: { get: true } }
  ]);
  assert.deepEqual(routes[0].handlers, [controller.register]);
  assert.deepEqual(routes[1].handlers, [controller.login]);
  assert.deepEqual(routes[2].handlers, [controller.logout]);
  assert.deepEqual(routes[3].handlers, [middleware, controller.me]);
});

test("old tokens rejected by resolveCurrentUser do not reach the protected handler", async () => {
  const activeTokens = new Set([RAW_ACCESS_TOKEN]);
  const middleware = createAuthMiddleware({
    async resolveCurrentUser(accessToken) {
      if (!activeTokens.has(accessToken)) {
        throw authError(AUTH_ERROR_CODES.UNAUTHORIZED, "Authentication required.");
      }

      return PUBLIC_USER;
    }
  });
  const firstResult = await callMiddleware(middleware, {
    authorization: `Bearer ${RAW_ACCESS_TOKEN}`
  });

  activeTokens.delete(RAW_ACCESS_TOKEN);

  const secondResult = await callMiddleware(middleware, {
    authorization: `Bearer ${RAW_ACCESS_TOKEN}`
  });

  assert.equal(firstResult.nextCount, 1);
  assert.deepEqual(firstResult.request.authenticatedUser, PUBLIC_USER);
  assert.equal(secondResult.status, 401);
  assert.equal(secondResult.nextCount, 0);
  assert.equal(secondResult.request.authenticatedUser, undefined);
});

test("legacy agent authentication middleware resolves valid Bearer tokens and attaches authContext", async () => {
  const calls: string[] = [];
  const middleware = createAuthenticateRequest({
    async resolveCurrentUser(accessToken) {
      calls.push(accessToken);
      return PUBLIC_USER;
    }
  });
  const result = await callMiddleware(middleware, {
    authorization: `bEaReR ${RAW_ACCESS_TOKEN}`
  });

  assert.deepEqual(calls, [RAW_ACCESS_TOKEN]);
  assert.deepEqual(result.request.authContext, {
    userId: PUBLIC_USER.id,
    email: PUBLIC_USER.email,
    status: PUBLIC_USER.status
  });
  assert.equal(result.nextCount, 1);
  assert.equal(result.status, 200);
});

test("legacy agent authentication middleware rejects malformed headers without resolving users", async () => {
  const cases: Array<Record<string, string>> = [
    {},
    { authorization: "Token raw-access-token" },
    { authorization: "Bearer" },
    { authorization: "Bearer   " },
    { authorization: "Bearer raw access token" }
  ];

  for (const headers of cases) {
    const calls: string[] = [];
    const result = await callMiddleware(
      createAuthenticateRequest({
        async resolveCurrentUser(accessToken) {
          calls.push(accessToken);
          return PUBLIC_USER;
        }
      }),
      headers
    );

    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: "Unauthorized" });
    assert.equal(result.nextCount, 0);
    assert.equal(result.request.authContext, undefined);
    assert.deepEqual(calls, []);
  }
});

test("legacy agent authentication middleware maps token rejection and inactive accounts to string errors", async () => {
  const cases = [
    {
      error: authError(AUTH_ERROR_CODES.UNAUTHORIZED, "Authentication required."),
      status: 401,
      body: { error: "Unauthorized" }
    },
    {
      error: authError(AUTH_ERROR_CODES.ACCOUNT_DISABLED, "Account is disabled."),
      status: 403,
      body: { error: "Forbidden" }
    },
    {
      error: authError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, "Account is locked."),
      status: 403,
      body: { error: "Forbidden" }
    },
    {
      error: new Error("database outage with token details"),
      status: 401,
      body: { error: "Unauthorized" }
    }
  ];

  for (const authCase of cases) {
    const result = await callMiddleware(
      createAuthenticateRequest({
        async resolveCurrentUser() {
          throw authCase.error;
        }
      }),
      { authorization: `Bearer ${RAW_ACCESS_TOKEN}` }
    );

    assert.equal(result.status, authCase.status);
    assert.deepEqual(result.body, authCase.body);
    assert.equal(result.nextCount, 0);
    assert.equal(result.request.authContext, undefined);
    assertSafeError(result.body);
  }
});
