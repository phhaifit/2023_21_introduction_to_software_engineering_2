import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import { createAuthController, type AuthControllerService } from "../src/controllers/auth.controller.js";
import { createAuthRouter } from "../src/routes/auth.routes.js";
import { AuthServiceError, type AuthServiceErrorCode } from "../src/services/auth.service.js";

const REGISTER_PASSWORD = "StrongPass123";
const RAW_ACCESS_TOKEN = "raw-access-token";
const EXPIRES_AT = "2026-07-03T01:00:00.000Z";
const REGISTER_BODY = { email: "new.user@example.com", password: REGISTER_PASSWORD };
const LOGIN_BODY = { email: "login.user@example.com", password: REGISTER_PASSWORD };

interface HandlerResult {
  status: number;
  body: unknown;
  text: string;
}

interface ServiceCalls {
  register: unknown[];
  login: unknown[];
  logout: string[];
}

interface RouteLayer { route?: { path: string; methods: Record<string, boolean> }; }

function createTestService(options: {
  registerError?: Error;
  loginError?: Error;
  logoutError?: Error;
} = {}) {
  const calls: ServiceCalls = {
    register: [],
    login: [],
    logout: []
  };

  const service: AuthControllerService = {
    async register(input) {
      calls.register.push(input);

      if (options.registerError) {
        throw options.registerError;
      }

      return {
        id: "user-123",
        email: input.email,
        status: "active"
      };
    },

    async login(input) {
      calls.login.push(input);

      if (options.loginError) {
        throw options.loginError;
      }

      return {
        user: {
          id: "user-123",
          email: input.email,
          status: "active"
        },
        accessToken: RAW_ACCESS_TOKEN,
        expiresAt: EXPIRES_AT
      };
    },

    async logout(accessToken) {
      calls.logout.push(accessToken);

      if (options.logoutError) {
        throw options.logoutError;
      }
    },

    async resolveCurrentUser() {
      return {
        id: "user-123",
        email: "current.user@example.com",
        status: "active"
      };
    }
  };

  return {
    service,
    calls
  };
}

async function callHandler(
  handler: RequestHandler,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<HandlerResult> {
  let statusCode = 200;
  let body: unknown;
  let text = "";
  const request = {
    body: options.body,
    headers: options.headers ?? {}
  } as Request;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      text = inspect(payload);
      return this;
    },
    sendStatus(code: number) {
      statusCode = code;
      text = code === 204 ? "" : String(code);
      return this;
    }
  } as Response;
  const next: NextFunction = (error?: unknown) => {
    if (error) {
      throw error;
    }
  };

  await handler(request, response, next);

  return {
    status: statusCode,
    body,
    text
  };
}

function authError(code: AuthServiceErrorCode, message: string, field?: "email" | "password") {
  return new AuthServiceError(code, message, field);
}

function assertNoSensitiveErrorData(body: unknown) {
  const serialized = inspect(body);

  assert.equal(serialized.includes(REGISTER_PASSWORD), false);
  assert.equal(serialized.includes(RAW_ACCESS_TOKEN), false);
  assert.equal(serialized.includes("passwordHash"), false);
  assert.equal(serialized.includes("tokenHash"), false);
  assert.equal(serialized.includes("stack"), false);
  assert.equal(serialized.includes("cause"), false);
}

test("register handler calls the service and returns public user data", async () => {
  const fake = createTestService();
  const handlers = createAuthController(fake.service);
  const result = await callHandler(handlers.register, {
    body: REGISTER_BODY
  });

  assert.equal(result.status, 201);
  assert.deepEqual(fake.calls.register, [REGISTER_BODY]);
  assert.deepEqual(result.body, {
    user: {
      id: "user-123",
      email: "new.user@example.com",
      status: "active"
    }
  });
  assert.equal(inspect(result.body).includes("passwordHash"), false);
});

test("register handler maps safe service errors", async () => {
  const cases = [
    { error: authError("INVALID_EMAIL", "Email is invalid.", "email"), status: 400 },
    { error: authError("WEAK_PASSWORD", "Password does not meet requirements.", "password"), status: 400 },
    { error: authError(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS, "Email is already registered.", "email"), status: 409 },
    { error: authError("REGISTER_FAILED", "Registration failed."), status: 500 },
    { error: new Error("database password leaked"), status: 500 }
  ];

  for (const registerCase of cases) {
    const fake = createTestService({ registerError: registerCase.error });
    const handlers = createAuthController(fake.service);
    const result = await callHandler(handlers.register, {
      body: REGISTER_BODY
    });

    assert.equal(result.status, registerCase.status);
    assertNoSensitiveErrorData(result.body);
  }
});

test("login handler calls the service and returns the auth response", async () => {
  const fake = createTestService();
  const handlers = createAuthController(fake.service);
  const result = await callHandler(handlers.login, {
    body: LOGIN_BODY
  });

  assert.equal(result.status, 200);
  assert.deepEqual(fake.calls.login, [LOGIN_BODY]);
  assert.deepEqual(result.body, {
    user: {
      id: "user-123",
      email: "login.user@example.com",
      status: "active"
    },
    accessToken: RAW_ACCESS_TOKEN,
    expiresAt: EXPIRES_AT
  });
  assert.equal(inspect(result.body).includes("passwordHash"), false);
  assert.equal(inspect(result.body).includes("tokenHash"), false);
});

test("login handler maps authentication and account-status errors", async () => {
  const cases = [
    { error: authError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password."), status: 401 },
    { error: authError(AUTH_ERROR_CODES.ACCOUNT_DISABLED, "Account is disabled."), status: 403 },
    { error: authError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, "Account is locked."), status: 403 },
    { error: authError("LOGIN_FAILED", "Login failed."), status: 500 },
    { error: new Error("hash failure with stack"), status: 500 }
  ];

  for (const loginCase of cases) {
    const fake = createTestService({ loginError: loginCase.error });
    const handlers = createAuthController(fake.service);
    const result = await callHandler(handlers.login, {
      body: LOGIN_BODY
    });

    assert.equal(result.status, loginCase.status);
    assertNoSensitiveErrorData(result.body);
  }
});

test("logout handler parses a Bearer token and returns no content", async () => {
  const fake = createTestService();
  const handlers = createAuthController(fake.service);
  const result = await callHandler(handlers.logout, {
    headers: {
      authorization: `bEaReR ${RAW_ACCESS_TOKEN}`
    }
  });

  assert.equal(result.status, 204);
  assert.equal(result.text, "");
  assert.deepEqual(fake.calls.logout, [RAW_ACCESS_TOKEN]);
});

test("logout handler rejects missing or malformed Authorization headers", async () => {
  const cases: Array<Record<string, string>> = [
    {},
    { authorization: "Token raw-access-token" },
    { authorization: "Bearer" },
    { authorization: "Bearer   " },
    { authorization: "Bearer raw access token" }
  ];

  for (const headers of cases) {
    const fake = createTestService();
    const handlers = createAuthController(fake.service);
    const result = await callHandler(handlers.logout, {
      headers
    });

    assert.equal(result.status, 401);
    assert.deepEqual(fake.calls.logout, []);
    assertNoSensitiveErrorData(result.body);
  }
});

test("logout handler maps safe service errors", async () => {
  const cases = [
    { error: authError(AUTH_ERROR_CODES.UNAUTHORIZED, "Authentication required."), status: 401 },
    { error: authError("LOGOUT_FAILED", "Logout failed."), status: 500 }
  ];

  for (const logoutCase of cases) {
    const fake = createTestService({ logoutError: logoutCase.error });
    const handlers = createAuthController(fake.service);
    const result = await callHandler(handlers.logout, {
      headers: {
        authorization: `Bearer ${RAW_ACCESS_TOKEN}`
      }
    });

    assert.equal(result.status, logoutCase.status);
    assertNoSensitiveErrorData(result.body);
  }
});

test("auth router exposes register, login, logout, and me routes", () => {
  const fake = createTestService();
  const router = createAuthRouter(createAuthController(fake.service));
  const routes = (router.stack as unknown as RouteLayer[])
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route?.path,
      methods: layer.route?.methods
    }));

  assert.deepEqual(routes, [
    { path: "/register", methods: { post: true } },
    { path: "/login", methods: { post: true } },
    { path: "/logout", methods: { post: true } },
    { path: "/me", methods: { get: true } }
  ]);
});
