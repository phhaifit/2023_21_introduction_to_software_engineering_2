import assert from "node:assert/strict";
import { test } from "node:test";

import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type { AuthToken, User } from "../src/entities/index.js";
import type { CreateUserInput } from "../src/repositories/index.js";
import {
  AuthServiceError,
  createAuthService,
  type AuthUserRepository
} from "../src/services/auth.service.js";

const RAW_ACCESS_TOKEN = "raw-access-token";
const TOKEN_HASH = "stored-token-hash";
const USER_ID = "user-123";
const PASSWORD_HASH = "stored-password-hash";

function createUser(patch: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: "current.user@example.com",
    passwordHash: PASSWORD_HASH,
    status: "active",
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    ...patch
  };
}

function createToken(patch: Partial<AuthToken> = {}): AuthToken {
  return {
    id: "token-123",
    userId: USER_ID,
    tokenHash: TOKEN_HASH,
    issuedAt: new Date("2026-07-03T00:00:00.000Z"),
    expiresAt: new Date("2026-07-03T01:00:00.000Z"),
    revoked: false,
    revokedAt: null,
    ...patch
  };
}

function createFakeRepository(options: {
  user?: User | null;
  findByIdError?: Error;
} = {}) {
  const findByIdCalls: string[] = [];

  const repository: AuthUserRepository = {
    async existsByEmail() {
      return false;
    },

    async findByEmail() {
      return null;
    },

    async findById(id) {
      findByIdCalls.push(id);

      if (options.findByIdError) {
        throw options.findByIdError;
      }

      return options.user === undefined ? createUser() : options.user;
    },

    async createUser(input: CreateUserInput) {
      return createUser({
        email: input.email,
        passwordHash: input.passwordHash
      });
    }
  };

  return {
    repository,
    findByIdCalls
  };
}

function createService(options: {
  repository?: AuthUserRepository;
  token?: AuthToken | null;
  validateError?: Error;
  invalidateResult?: boolean;
  invalidateError?: Error;
  validateTokenCalls?: string[];
  invalidateTokenCalls?: string[];
} = {}) {
  return createAuthService({
    userRepository: options.repository ?? createFakeRepository().repository,
    validateToken: async (accessToken) => {
      options.validateTokenCalls?.push(accessToken);

      if (options.validateError) {
        throw options.validateError;
      }

      return options.token === undefined ? createToken() : options.token;
    },
    invalidateToken: async (accessToken) => {
      options.invalidateTokenCalls?.push(accessToken);

      if (options.invalidateError) {
        throw options.invalidateError;
      }

      return options.invalidateResult ?? true;
    }
  });
}

function createStatefulService() {
  const activeTokens = new Map<string, AuthToken>([
    [RAW_ACCESS_TOKEN, createToken()]
  ]);
  const validateTokenCalls: string[] = [];
  const invalidateTokenCalls: string[] = [];

  const service = createAuthService({
    userRepository: createFakeRepository().repository,
    validateToken: async (accessToken) => {
      validateTokenCalls.push(accessToken);
      return activeTokens.get(accessToken) ?? null;
    },
    invalidateToken: async (accessToken) => {
      invalidateTokenCalls.push(accessToken);
      return activeTokens.delete(accessToken);
    }
  });

  return {
    service,
    validateTokenCalls,
    invalidateTokenCalls
  };
}

function assertAuthError(error: unknown, code: string): boolean {
  assert.equal(error instanceof AuthServiceError, true);

  const authError = error as AuthServiceError;
  assert.equal(authError.code, code);
  assert.equal(authError.message.includes(RAW_ACCESS_TOKEN), false);
  assert.equal(authError.message.includes(TOKEN_HASH), false);
  assert.equal(authError.message.includes(PASSWORD_HASH), false);
  assert.equal(authError.message.includes("2026-07-03"), false);

  return true;
}

test("resolveCurrentUser returns public user data for a valid active token", async () => {
  const fake = createFakeRepository();
  const validateTokenCalls: string[] = [];
  const service = createService({
    repository: fake.repository,
    validateTokenCalls
  });

  const response = await service.resolveCurrentUser(RAW_ACCESS_TOKEN);

  assert.deepEqual(validateTokenCalls, [RAW_ACCESS_TOKEN]);
  assert.deepEqual(fake.findByIdCalls, [USER_ID]);
  assert.deepEqual(response, {
    id: USER_ID,
    email: "current.user@example.com",
    status: "active"
  });
  assert.equal(Object.hasOwn(response, "password"), false);
  assert.equal(Object.hasOwn(response, "passwordHash"), false);
  assert.equal(Object.hasOwn(response, "accessToken"), false);
  assert.equal(Object.hasOwn(response, "tokenHash"), false);
});

test("resolveCurrentUser rejects invalid runtime token input before validation", async () => {
  const invalidInputs = [
    undefined,
    null,
    123,
    "",
    "   "
  ];

  for (const input of invalidInputs) {
    const validateTokenCalls: string[] = [];
    const fake = createFakeRepository();
    const service = createService({
      repository: fake.repository,
      validateTokenCalls
    });

    await assert.rejects(
      () => service.resolveCurrentUser(input as unknown as string),
      (error) => assertAuthError(error, AUTH_ERROR_CODES.UNAUTHORIZED)
    );
    assert.equal(validateTokenCalls.length, 0);
    assert.equal(fake.findByIdCalls.length, 0);
  }
});

test("resolveCurrentUser rejects unknown, expired, and revoked tokens without loading users", async () => {
  const cases = [
    "unknown token",
    "expired token",
    "revoked token"
  ];

  for (let index = 0; index < cases.length; index += 1) {
    const fake = createFakeRepository();
    const service = createService({
      repository: fake.repository,
      token: null
    });

    await assert.rejects(
      () => service.resolveCurrentUser(RAW_ACCESS_TOKEN),
      (error) => assertAuthError(error, AUTH_ERROR_CODES.UNAUTHORIZED)
    );
    assert.equal(fake.findByIdCalls.length, 0);
  }
});

test("resolveCurrentUser handles missing users and inactive accounts safely", async () => {
  const cases: Array<{ user: User | null; code: string }> = [
    { user: null, code: AUTH_ERROR_CODES.UNAUTHORIZED },
    { user: createUser({ status: "disabled" }), code: AUTH_ERROR_CODES.ACCOUNT_DISABLED },
    { user: createUser({ status: "locked" }), code: AUTH_ERROR_CODES.ACCOUNT_LOCKED }
  ];

  for (const accountCase of cases) {
    const fake = createFakeRepository({ user: accountCase.user });
    const service = createService({
      repository: fake.repository
    });

    await assert.rejects(
      () => service.resolveCurrentUser(RAW_ACCESS_TOKEN),
      (error) => assertAuthError(error, accountCase.code)
    );
    assert.deepEqual(fake.findByIdCalls, [USER_ID]);
  }
});

test("resolveCurrentUser maps token and user lookup failures to safe errors", async () => {
  const validateFailureService = createService({
    validateError: new Error("token backend unavailable")
  });
  const findFailureRepository = createFakeRepository({
    findByIdError: new Error("database unavailable")
  });
  const findFailureService = createService({
    repository: findFailureRepository.repository
  });

  await assert.rejects(
    () => validateFailureService.resolveCurrentUser(RAW_ACCESS_TOKEN),
    (error) => assertAuthError(error, "CURRENT_USER_FAILED")
  );
  await assert.rejects(
    () => findFailureService.resolveCurrentUser(RAW_ACCESS_TOKEN),
    (error) => assertAuthError(error, "CURRENT_USER_FAILED")
  );
});

test("logout invalidates the raw access token without returning token details", async () => {
  const invalidateTokenCalls: string[] = [];
  const service = createService({
    invalidateTokenCalls
  });

  const response = await service.logout(RAW_ACCESS_TOKEN);

  assert.deepEqual(invalidateTokenCalls, [RAW_ACCESS_TOKEN]);
  assert.equal(response, undefined);
});

test("logout rejects missing, non-string, and blank token input before invalidation", async () => {
  const invalidInputs = [
    undefined,
    null,
    123,
    "",
    "   "
  ];

  for (const input of invalidInputs) {
    const invalidateTokenCalls: string[] = [];
    const service = createService({
      invalidateTokenCalls
    });

    await assert.rejects(
      () => service.logout(input as unknown as string),
      (error) => assertAuthError(error, AUTH_ERROR_CODES.UNAUTHORIZED)
    );
    assert.equal(invalidateTokenCalls.length, 0);
  }
});

test("logout treats invalid or already-revoked tokens as safe idempotent success", async () => {
  const invalidateTokenCalls: string[] = [];
  const service = createService({
    invalidateResult: false,
    invalidateTokenCalls
  });

  const response = await service.logout(RAW_ACCESS_TOKEN);

  assert.deepEqual(invalidateTokenCalls, [RAW_ACCESS_TOKEN]);
  assert.equal(response, undefined);
});

test("logout maps token invalidation failures to safe errors", async () => {
  const service = createService({
    invalidateError: new Error("token backend unavailable")
  });

  await assert.rejects(
    () => service.logout(RAW_ACCESS_TOKEN),
    (error) => assertAuthError(error, "LOGOUT_FAILED")
  );
});

test("old token cannot resolve current user after logout and repeated logout is safe", async () => {
  const fake = createStatefulService();

  await fake.service.resolveCurrentUser(RAW_ACCESS_TOKEN);
  await fake.service.logout(RAW_ACCESS_TOKEN);
  await assert.rejects(
    () => fake.service.resolveCurrentUser(RAW_ACCESS_TOKEN),
    (error) => assertAuthError(error, AUTH_ERROR_CODES.UNAUTHORIZED)
  );
  const repeatedLogoutResponse = await fake.service.logout(RAW_ACCESS_TOKEN);

  assert.equal(repeatedLogoutResponse, undefined);
  assert.deepEqual(fake.validateTokenCalls, [RAW_ACCESS_TOKEN, RAW_ACCESS_TOKEN]);
  assert.deepEqual(fake.invalidateTokenCalls, [RAW_ACCESS_TOKEN, RAW_ACCESS_TOKEN]);
});
