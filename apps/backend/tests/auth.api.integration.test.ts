import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, beforeEach, test } from "node:test";
import { inspect } from "node:util";

import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type { AuthResponse, PublicUserResponse, SafeErrorResponse } from "../src/dto/authentication/index.js";
import {
  createUniqueEmail,
  disconnectTestDatabase,
  getAuthDataCounts,
  hashTestToken,
  resetAuthData,
  testPrisma
} from "./helpers/test-database.js";

const { app } = await import("../src/app.js");
const { disconnectPrisma } = await import("../src/db/prisma.js");

const TEST_PASSWORD = "IntegrationPass123";
const NOW = Date.now();
const PAST = new Date(NOW - 60_000);
const FUTURE = new Date(NOW + 60 * 60 * 1000);

interface ApiResult<TBody = unknown> {
  status: number;
  body: TBody | undefined;
}

const server = await listen();
const address = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${address.port}`;

beforeEach(resetAuthData);

after(async () => {
  await close(server);
  await resetAuthData();
  assert.deepEqual(await getAuthDataCounts(), { users: 0, authTokens: 0 });
  await disconnectPrisma();
  await disconnectTestDatabase();
});

function listen(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const nextServer = app.listen(0, "127.0.0.1", () => resolve(nextServer));
    nextServer.once("error", reject);
  });
}

function close(nextServer: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    nextServer.close((error) => error ? reject(error) : resolve());
  });
}

async function apiRequest<TBody>(method: string, path: string, options: {
  body?: unknown;
  token?: string;
  authorization?: string;
} = {}): Promise<ApiResult<TBody>> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (options.authorization) {
    headers.authorization = options.authorization;
  } else if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text.length === 0 ? undefined : JSON.parse(text)
  };
}

function assertPublicUser(user: PublicUserResponse, email: string, status = "active"): void {
  assert.equal(user.email, email);
  assert.equal(user.status, status);
  assert.equal(Object.hasOwn(user, "password"), false);
  assert.equal(Object.hasOwn(user, "passwordHash"), false);
  assert.equal(Object.hasOwn(user, "tokenHash"), false);
  assert.equal(Object.hasOwn(user, "accessToken"), false);
}

function assertSafeResponse(body: unknown): void {
  const serialized = inspect(body);

  for (const value of [TEST_PASSWORD, "passwordHash", "tokenHash", "stack", "cause", "Prisma", "revoked", "expired"]) {
    assert.equal(serialized.includes(value), false);
  }
}

function assertError(
  result: ApiResult<unknown>,
  status: number,
  code: string,
  field?: "email" | "password"
): void {
  const body = result.body as { error?: SafeErrorResponse } | undefined;

  assert.equal(result.status, status);
  assert.equal(body?.error?.code, code);
  assert.equal(body?.error?.field, field);
  assertSafeResponse(result.body);
}

async function registerAccount(email = createUniqueEmail("api-user")): Promise<PublicUserResponse> {
  const result = await apiRequest<{ user: PublicUserResponse }>("POST", "/api/auth/register", {
    body: { email, password: TEST_PASSWORD }
  });

  assert.equal(result.status, 201);
  assert.ok(result.body);
  return result.body.user;
}

async function login(email: string, password = TEST_PASSWORD): Promise<ApiResult<AuthResponse>> {
  return apiRequest<AuthResponse>("POST", "/api/auth/login", {
    body: { email, password }
  });
}

async function storeToken(userId: string, rawToken: string, patch: {
  expiresAt?: Date; revoked?: boolean; revokedAt?: Date;
} = {}): Promise<void> {
  await testPrisma.authToken.create({
    data: {
      userId,
      tokenHash: hashTestToken(rawToken),
      expiresAt: patch.expiresAt ?? FUTURE,
      revoked: patch.revoked ?? false,
      revokedAt: patch.revokedAt ?? null
    }
  });
}

test("auth API registers users, rejects duplicates and invalid input, and stores only hashes", async () => {
  const email = createUniqueEmail("api-register");
  const registerResult = await apiRequest<{ user: PublicUserResponse }>("POST", "/api/auth/register", {
    body: { email: `  ${email.toUpperCase()}  `, password: TEST_PASSWORD }
  });

  assert.equal(registerResult.status, 201);
  assert.ok(registerResult.body);
  assertPublicUser(registerResult.body.user, email);
  const storedUser = await testPrisma.user.findUnique({ where: { email } });
  assert.ok(storedUser);
  assert.notEqual(storedUser.passwordHash, TEST_PASSWORD);
  assert.equal(JSON.stringify(storedUser).includes(TEST_PASSWORD), false);
  assert.equal(Object.hasOwn(storedUser, "password"), false);

  assertError(
    await apiRequest("POST", "/api/auth/register", {
      body: { email, password: TEST_PASSWORD }
    }),
    409,
    AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
    "email"
  );
  assertError(
    await apiRequest("POST", "/api/auth/register", {
      body: { email: "not-an-email", password: TEST_PASSWORD }
    }),
    400,
    "INVALID_EMAIL",
    "email"
  );
  assertError(
    await apiRequest("POST", "/api/auth/register", {
      body: { email: createUniqueEmail("weak-password"), password: "weak" }
    }),
    400,
    "WEAK_PASSWORD",
    "password"
  );
});

test("auth API logs in active users and handles invalid credentials and account status safely", async () => {
  const email = createUniqueEmail("api-login");
  const user = await registerAccount(email);

  const loginResult = await login(email);
  assert.equal(loginResult.status, 200);
  assert.ok(loginResult.body);
  assertPublicUser(loginResult.body.user, email);
  assert.equal(typeof loginResult.body.accessToken, "string");
  assert.equal(typeof loginResult.body.expiresAt, "string");
  assertSafeResponse(loginResult.body);

  const storedToken = await testPrisma.authToken.findFirst({ where: { userId: user.id } });
  assert.ok(storedToken);
  assert.notEqual(storedToken.tokenHash, loginResult.body.accessToken);
  assert.equal(JSON.stringify(storedToken).includes(loginResult.body.accessToken), false);

  const unknownEmail = await login(createUniqueEmail("unknown-login"));
  const wrongPassword = await login(email, "WrongPass123");
  assertError(unknownEmail, 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  assertError(wrongPassword, 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  assert.deepEqual(unknownEmail.body, wrongPassword.body);

  for (const accountCase of [
    { status: "disabled", code: AUTH_ERROR_CODES.ACCOUNT_DISABLED },
    { status: "locked", code: AUTH_ERROR_CODES.ACCOUNT_LOCKED }
  ] as const) {
    const inactiveEmail = createUniqueEmail(`api-${accountCase.status}`);
    const inactiveUser = await registerAccount(inactiveEmail);
    await testPrisma.user.update({
      where: { id: inactiveUser.id },
      data: { status: accountCase.status }
    });

    assertError(await login(inactiveEmail), 403, accountCase.code);
  }
});

test("auth API protects /me, revokes logout tokens, and rejects reused or inactive tokens", async () => {
  const email = createUniqueEmail("api-me");
  const user = await registerAccount(email);
  const loginResult = await login(email);
  assert.ok(loginResult.body);
  const accessToken = loginResult.body.accessToken;

  assertError(await apiRequest("GET", "/api/auth/me"), 401, AUTH_ERROR_CODES.UNAUTHORIZED);
  assertError(
    await apiRequest("GET", "/api/auth/me", { authorization: "Bearer token with spaces" }),
    401,
    AUTH_ERROR_CODES.UNAUTHORIZED
  );
  assertError(
    await apiRequest("GET", "/api/auth/me", { token: `${createUniqueEmail("fake-token")}:fake` }),
    401,
    AUTH_ERROR_CODES.UNAUTHORIZED
  );

  const meResult = await apiRequest<{ user: PublicUserResponse }>("GET", "/api/auth/me", { token: accessToken });
  assert.equal(meResult.status, 200);
  assert.ok(meResult.body);
  assertPublicUser(meResult.body.user, email);

  const expiredToken = `${createUniqueEmail("expired-token")}:expired`;
  const revokedToken = `${createUniqueEmail("revoked-token")}:revoked`;
  await storeToken(user.id, expiredToken, { expiresAt: PAST });
  await storeToken(user.id, revokedToken, { revoked: true, revokedAt: PAST });
  assertError(await apiRequest("GET", "/api/auth/me", { token: expiredToken }), 401, AUTH_ERROR_CODES.UNAUTHORIZED);
  assertError(await apiRequest("GET", "/api/auth/me", { token: revokedToken }), 401, AUTH_ERROR_CODES.UNAUTHORIZED);

  const logoutResult = await apiRequest("POST", "/api/auth/logout", { token: accessToken });
  assert.equal(logoutResult.status, 204);
  assert.equal(logoutResult.body, undefined);
  const revokedLoginToken = await testPrisma.authToken.findFirst({
    where: { userId: user.id, revoked: true }
  });
  assert.ok(revokedLoginToken?.revokedAt);
  assertError(await apiRequest("GET", "/api/auth/me", { token: accessToken }), 401, AUTH_ERROR_CODES.UNAUTHORIZED);
  assert.equal((await apiRequest("POST", "/api/auth/logout", { token: accessToken })).status, 204);
});
