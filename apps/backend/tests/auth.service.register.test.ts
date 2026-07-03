import assert from "node:assert/strict";
import { test } from "node:test";

import type { RegisterRequest } from "../src/dto/authentication/index.js";
import type { User } from "../src/entities/index.js";
import type { CreateUserInput } from "../src/repositories/index.js";
import { DuplicateUserEmailError } from "../src/repositories/user-repository.error.js";
import {
  AuthServiceError,
  createAuthService,
  type AuthUserRepository
} from "../src/services/auth.service.js";

const NORMALIZED_EMAIL = "new.user@example.com";
const VALID_PASSWORD = "StrongPass123";
const PASSWORD_HASH = "hashed-password-value";

function createRegisterRequest(patch: Partial<RegisterRequest> = {}): RegisterRequest {
  return {
    email: "  New.User@Example.COM  ",
    password: VALID_PASSWORD,
    ...patch
  };
}

function createUser(input: CreateUserInput, patch: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: input.email,
    passwordHash: input.passwordHash,
    status: "active",
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    ...patch
  };
}

function createFakeRepository(options: {
  existingEmail?: boolean;
  existsError?: Error;
  createError?: Error;
} = {}) {
  const existsByEmailCalls: string[] = [];
  const createUserCalls: CreateUserInput[] = [];

  const repository: AuthUserRepository = {
    async existsByEmail(email) {
      existsByEmailCalls.push(email);

      if (options.existsError) {
        throw options.existsError;
      }

      return options.existingEmail ?? false;
    },

    async createUser(input) {
      createUserCalls.push(input);

      if (options.createError) {
        throw options.createError;
      }

      return createUser(input);
    }
  };

  return {
    repository,
    existsByEmailCalls,
    createUserCalls
  };
}

function createService(options: {
  repository?: AuthUserRepository;
  hashPassword?: (plaintextPassword: string) => Promise<string>;
  hashCalls?: string[];
} = {}) {
  return createAuthService({
    userRepository: options.repository ?? createFakeRepository().repository,
    hashPassword: options.hashPassword ?? (async (plaintextPassword) => {
      options.hashCalls?.push(plaintextPassword);
      return PASSWORD_HASH;
    })
  });
}

function assertAuthError(error: unknown, code: string, field?: "email" | "password"): boolean {
  assert.equal(error instanceof AuthServiceError, true);

  const authError = error as AuthServiceError;
  assert.equal(authError.code, code);
  assert.equal(authError.field, field);
  assert.equal(authError.message.includes(VALID_PASSWORD), false);
  assert.equal(authError.message.includes(PASSWORD_HASH), false);

  return true;
}

test("register creates an active user with normalized email and public response only", async () => {
  const fake = createFakeRepository();
  const hashCalls: string[] = [];
  const service = createService({
    repository: fake.repository,
    hashCalls
  });

  const response = await service.register(createRegisterRequest());

  assert.deepEqual(fake.existsByEmailCalls, [NORMALIZED_EMAIL]);
  assert.deepEqual(hashCalls, [VALID_PASSWORD]);
  assert.deepEqual(fake.createUserCalls, [{
    email: NORMALIZED_EMAIL,
    passwordHash: PASSWORD_HASH
  }]);
  assert.deepEqual(response, {
    id: "user-123",
    email: NORMALIZED_EMAIL,
    status: "active"
  });
  assert.equal(Object.hasOwn(response, "password"), false);
  assert.equal(Object.hasOwn(response, "passwordHash"), false);
  assert.equal(Object.hasOwn(response, "accessToken"), false);
});

test("register passes the password to hashPassword without trimming or normalizing it", async () => {
  const password = "  StrongPass123  ";
  const fake = createFakeRepository();
  const hashCalls: string[] = [];
  const service = createService({
    repository: fake.repository,
    hashCalls
  });

  await service.register(createRegisterRequest({ password }));

  assert.deepEqual(hashCalls, [password]);
});

test("register rejects missing and non-string emails before hashing or repository access", async () => {
  const invalidInputs = [
    undefined,
    null,
    { password: VALID_PASSWORD },
    { email: 123, password: VALID_PASSWORD },
    { email: "", password: VALID_PASSWORD },
    { email: "   ", password: VALID_PASSWORD },
    { email: "not-an-email", password: VALID_PASSWORD }
  ];

  for (const input of invalidInputs) {
    const fake = createFakeRepository();
    const hashCalls: string[] = [];
    const service = createService({
      repository: fake.repository,
      hashCalls
    });

    await assert.rejects(
      () => service.register(input as unknown as RegisterRequest),
      (error) => assertAuthError(error, "INVALID_EMAIL", "email")
    );
    assert.equal(hashCalls.length, 0);
    assert.equal(fake.existsByEmailCalls.length, 0);
    assert.equal(fake.createUserCalls.length, 0);
  }
});

test("register rejects missing, non-string, and weak passwords before hashing or repository access", async () => {
  const invalidInputs = [
    { email: NORMALIZED_EMAIL },
    { email: NORMALIZED_EMAIL, password: 123 },
    { email: NORMALIZED_EMAIL, password: null },
    { email: NORMALIZED_EMAIL, password: "short1A" },
    { email: NORMALIZED_EMAIL, password: "lowercase1" },
    { email: NORMALIZED_EMAIL, password: "UPPERCASE1" },
    { email: NORMALIZED_EMAIL, password: "NoNumberPassword" }
  ];

  for (const input of invalidInputs) {
    const fake = createFakeRepository();
    const hashCalls: string[] = [];
    const service = createService({
      repository: fake.repository,
      hashCalls
    });

    await assert.rejects(
      () => service.register(input as unknown as RegisterRequest),
      (error) => assertAuthError(error, "WEAK_PASSWORD", "password")
    );
    assert.equal(hashCalls.length, 0);
    assert.equal(fake.existsByEmailCalls.length, 0);
    assert.equal(fake.createUserCalls.length, 0);
  }
});

test("register rejects duplicate emails before hashing or creating users", async () => {
  const fake = createFakeRepository({ existingEmail: true });
  const hashCalls: string[] = [];
  const service = createService({
    repository: fake.repository,
    hashCalls
  });

  await assert.rejects(
    () => service.register(createRegisterRequest()),
    (error) => assertAuthError(error, "EMAIL_ALREADY_EXISTS", "email")
  );
  assert.deepEqual(fake.existsByEmailCalls, [NORMALIZED_EMAIL]);
  assert.equal(hashCalls.length, 0);
  assert.equal(fake.createUserCalls.length, 0);
});

test("register maps unique race errors to duplicate email errors", async () => {
  const fake = createFakeRepository({ createError: new DuplicateUserEmailError() });
  const service = createService({
    repository: fake.repository
  });

  await assert.rejects(
    () => service.register(createRegisterRequest()),
    (error) => assertAuthError(error, "EMAIL_ALREADY_EXISTS", "email")
  );
});

test("register maps existsByEmail failures to safe registration errors", async () => {
  const fake = createFakeRepository({ existsError: new Error("database unavailable") });
  const hashCalls: string[] = [];
  const service = createService({
    repository: fake.repository,
    hashCalls
  });

  await assert.rejects(
    () => service.register(createRegisterRequest()),
    (error) => assertAuthError(error, "REGISTER_FAILED")
  );
  assert.equal(hashCalls.length, 0);
  assert.equal(fake.createUserCalls.length, 0);
});

test("register maps hash and create failures to safe registration errors", async () => {
  const hashFailureService = createService({
    hashPassword: async () => {
      throw new Error("hash failure");
    }
  });
  const createFailureRepository = createFakeRepository({ createError: new Error("database unavailable") });
  const createFailureService = createService({
    repository: createFailureRepository.repository
  });

  await assert.rejects(
    () => hashFailureService.register(createRegisterRequest()),
    (error) => assertAuthError(error, "REGISTER_FAILED")
  );
  await assert.rejects(
    () => createFailureService.register(createRegisterRequest()),
    (error) => assertAuthError(error, "REGISTER_FAILED")
  );
});
