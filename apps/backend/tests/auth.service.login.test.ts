import assert from "node:assert/strict";
import { test } from "node:test";

import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type { LoginRequest } from "../src/dto/authentication/index.js";
import type { User, UserStatus } from "../src/entities/index.js";
import type { CreateUserInput } from "../src/repositories/index.js";
import {
  AuthServiceError,
  createAuthService,
  type AuthUserRepository
} from "../src/services/auth.service.js";
import type { CreateTokenResult } from "../src/services/token.service.js";

const NORMALIZED_EMAIL = "login.user@example.com";
const STORED_PASSWORD_HASH = "stored-password-hash";
const VALID_PASSWORD = "LoginPass123";
const ACCESS_TOKEN = "raw-access-token";
const EXPIRES_AT = new Date("2026-07-03T01:00:00.000Z");

interface VerifyPasswordCall {
  plaintextPassword: string;
  passwordHash: string;
}

function createLoginRequest(patch: Partial<LoginRequest> = {}): LoginRequest {
  return {
    email: "  Login.User@Example.COM  ",
    password: VALID_PASSWORD,
    ...patch
  };
}

function createUser(patch: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: NORMALIZED_EMAIL,
    passwordHash: STORED_PASSWORD_HASH,
    status: "active",
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    ...patch
  };
}

function createFakeRepository(options: {
  user?: User | null;
  findError?: Error;
} = {}) {
  const findByEmailCalls: string[] = [];

  const repository: AuthUserRepository = {
    async existsByEmail() {
      return false;
    },

    async findByEmail(email) {
      findByEmailCalls.push(email);

      if (options.findError) {
        throw options.findError;
      }

      return options.user === undefined ? createUser() : options.user;
    },

    async findById() {
      return null;
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
    findByEmailCalls
  };
}

function createService(options: {
  repository?: AuthUserRepository;
  verifyResult?: boolean;
  verifyError?: Error;
  verifyCalls?: VerifyPasswordCall[];
  createTokenError?: Error;
  createTokenCalls?: string[];
} = {}) {
  return createAuthService({
    userRepository: options.repository ?? createFakeRepository().repository,
    verifyPassword: async (plaintextPassword, passwordHash) => {
      options.verifyCalls?.push({
        plaintextPassword,
        passwordHash
      });

      if (options.verifyError) {
        throw options.verifyError;
      }

      return options.verifyResult ?? true;
    },
    createToken: async (userId): Promise<CreateTokenResult> => {
      options.createTokenCalls?.push(userId);

      if (options.createTokenError) {
        throw options.createTokenError;
      }

      return {
        accessToken: ACCESS_TOKEN,
        expiresAt: EXPIRES_AT
      };
    }
  });
}

function assertAuthError(error: unknown, code: string): boolean {
  assert.equal(error instanceof AuthServiceError, true);

  const authError = error as AuthServiceError;
  assert.equal(authError.code, code);
  assert.equal(authError.message.includes(VALID_PASSWORD), false);
  assert.equal(authError.message.includes(STORED_PASSWORD_HASH), false);
  assert.equal(authError.message.includes(ACCESS_TOKEN), false);

  return true;
}

async function captureAuthError(action: () => Promise<unknown>): Promise<AuthServiceError> {
  try {
    await action();
  } catch (error) {
    assert.equal(error instanceof AuthServiceError, true);
    return error as AuthServiceError;
  }

  assert.fail("Expected AuthServiceError to be thrown.");
}

test("login returns public user data and a new access token for active accounts", async () => {
  const fake = createFakeRepository();
  const verifyCalls: VerifyPasswordCall[] = [];
  const createTokenCalls: string[] = [];
  const service = createService({
    repository: fake.repository,
    verifyCalls,
    createTokenCalls
  });

  const response = await service.login(createLoginRequest());

  assert.deepEqual(fake.findByEmailCalls, [NORMALIZED_EMAIL]);
  assert.deepEqual(verifyCalls, [{
    plaintextPassword: VALID_PASSWORD,
    passwordHash: STORED_PASSWORD_HASH
  }]);
  assert.deepEqual(createTokenCalls, ["user-123"]);
  assert.deepEqual(response, {
    user: {
      id: "user-123",
      email: NORMALIZED_EMAIL,
      status: "active"
    },
    accessToken: ACCESS_TOKEN,
    expiresAt: EXPIRES_AT.toISOString()
  });
  assert.equal(Object.hasOwn(response, "passwordHash"), false);
  assert.equal(Object.hasOwn(response.user, "passwordHash"), false);
  assert.equal(Object.hasOwn(response, "tokenHash"), false);
});

test("login passes the password to verifyPassword without trimming or normalizing it", async () => {
  const password = "  LoginPass123  ";
  const verifyCalls: VerifyPasswordCall[] = [];
  const service = createService({
    verifyCalls
  });

  await service.login(createLoginRequest({ password }));

  assert.deepEqual(verifyCalls, [{
    plaintextPassword: password,
    passwordHash: STORED_PASSWORD_HASH
  }]);
});

test("login rejects unknown email and wrong password with the same generic error", async () => {
  const unknownEmailRepository = createFakeRepository({ user: null });
  const unknownEmailVerifyCalls: VerifyPasswordCall[] = [];
  const unknownEmailCreateTokenCalls: string[] = [];
  const unknownEmailService = createService({
    repository: unknownEmailRepository.repository,
    verifyCalls: unknownEmailVerifyCalls,
    createTokenCalls: unknownEmailCreateTokenCalls
  });
  const wrongPasswordRepository = createFakeRepository();
  const wrongPasswordCreateTokenCalls: string[] = [];
  const wrongPasswordService = createService({
    repository: wrongPasswordRepository.repository,
    verifyResult: false,
    createTokenCalls: wrongPasswordCreateTokenCalls
  });

  const unknownEmailError = await captureAuthError(() => unknownEmailService.login(createLoginRequest()));
  const wrongPasswordError = await captureAuthError(() => wrongPasswordService.login(createLoginRequest()));

  assertAuthError(unknownEmailError, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  assertAuthError(wrongPasswordError, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  assert.equal((unknownEmailError as AuthServiceError).message, (wrongPasswordError as AuthServiceError).message);
  assert.equal(unknownEmailVerifyCalls.length, 0);
  assert.equal(unknownEmailCreateTokenCalls.length, 0);
  assert.equal(wrongPasswordCreateTokenCalls.length, 0);
});

test("login rejects disabled and locked accounts without creating tokens", async () => {
  const cases: Array<{ status: UserStatus; code: string }> = [
    { status: "disabled", code: AUTH_ERROR_CODES.ACCOUNT_DISABLED },
    { status: "locked", code: AUTH_ERROR_CODES.ACCOUNT_LOCKED }
  ];

  for (const accountCase of cases) {
    const fake = createFakeRepository({
      user: createUser({ status: accountCase.status })
    });
    const createTokenCalls: string[] = [];
    const service = createService({
      repository: fake.repository,
      createTokenCalls
    });

    await assert.rejects(
      () => service.login(createLoginRequest()),
      (error) => assertAuthError(error, accountCase.code)
    );
    assert.equal(createTokenCalls.length, 0);
  }
});

test("login rejects invalid runtime input safely before password verification or token creation", async () => {
  const invalidInputs = [
    undefined,
    null,
    { password: VALID_PASSWORD },
    { email: 123, password: VALID_PASSWORD },
    { email: "", password: VALID_PASSWORD },
    { email: "   ", password: VALID_PASSWORD },
    { email: "not-an-email", password: VALID_PASSWORD },
    { email: NORMALIZED_EMAIL },
    { email: NORMALIZED_EMAIL, password: 123 },
    { email: NORMALIZED_EMAIL, password: null },
    { email: NORMALIZED_EMAIL, password: "" }
  ];

  for (const input of invalidInputs) {
    const fake = createFakeRepository();
    const verifyCalls: VerifyPasswordCall[] = [];
    const createTokenCalls: string[] = [];
    const service = createService({
      repository: fake.repository,
      verifyCalls,
      createTokenCalls
    });

    await assert.rejects(
      () => service.login(input as unknown as LoginRequest),
      (error) => assertAuthError(error, AUTH_ERROR_CODES.INVALID_CREDENTIALS)
    );
    assert.equal(fake.findByEmailCalls.length, 0);
    assert.equal(verifyCalls.length, 0);
    assert.equal(createTokenCalls.length, 0);
  }
});

test("login maps repository, password verification, and token failures to safe login errors", async () => {
  const findFailureRepository = createFakeRepository({ findError: new Error("database unavailable") });
  const findFailureCreateTokenCalls: string[] = [];
  const findFailureService = createService({
    repository: findFailureRepository.repository,
    createTokenCalls: findFailureCreateTokenCalls
  });
  const verifyFailureService = createService({
    verifyError: new Error("hash unavailable")
  });
  const createTokenFailureService = createService({
    createTokenError: new Error("token unavailable")
  });

  await assert.rejects(
    () => findFailureService.login(createLoginRequest()),
    (error) => assertAuthError(error, "LOGIN_FAILED")
  );
  assert.equal(findFailureCreateTokenCalls.length, 0);

  await assert.rejects(
    () => verifyFailureService.login(createLoginRequest()),
    (error) => assertAuthError(error, "LOGIN_FAILED")
  );

  await assert.rejects(
    () => createTokenFailureService.login(createLoginRequest()),
    (error) => assertAuthError(error, "LOGIN_FAILED")
  );
});
