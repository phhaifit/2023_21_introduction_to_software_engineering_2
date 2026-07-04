import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import type { CreateAuthTokenInput, CreateUserInput } from "../src/repositories/index.js";
import {
  createUniqueEmail,
  disconnectTestDatabase,
  getAuthDataCounts,
  hashTestToken,
  resetAuthData,
  testPrisma
} from "./helpers/test-database.js";

const userRepository = await import("../src/repositories/user.repository.js");
const tokenRepository = await import("../src/repositories/token.repository.js");
const { DuplicateUserEmailError } = await import("../src/repositories/user-repository.error.js");
const { disconnectPrisma } = await import("../src/db/prisma.js");

const PASSWORD_HASH = "repository-password-hash";
const NOW = new Date("2026-07-03T10:00:00.000Z");
const FUTURE = new Date("2026-07-03T11:00:00.000Z");
const PAST = new Date("2026-07-03T09:00:00.000Z");

beforeEach(async () => {
  await resetAuthData();
});

after(async () => {
  await resetAuthData();
  assert.deepEqual(await getAuthDataCounts(), { users: 0, authTokens: 0 });
  await disconnectPrisma();
  await disconnectTestDatabase();
});

function createUserInput(email = createUniqueEmail("repo-user")): CreateUserInput {
  return {
    email,
    passwordHash: PASSWORD_HASH
  };
}

function createTokenInput(userId: string, rawToken: string, expiresAt = FUTURE): CreateAuthTokenInput {
  return {
    userId,
    tokenHash: hashTestToken(rawToken),
    expiresAt
  };
}

test("UserRepository creates, finds, and detects duplicate users with persisted password hashes", async () => {
  const input = createUserInput();

  const createdUser = await userRepository.createUser(input);
  const storedUser = await testPrisma.user.findUnique({ where: { email: input.email } });

  assert.equal(createdUser.email, input.email);
  assert.equal(createdUser.status, "active");
  assert.equal(createdUser.passwordHash, PASSWORD_HASH);
  assert.equal(storedUser?.passwordHash, PASSWORD_HASH);
  assert.equal(Object.hasOwn(storedUser ?? {}, "password"), false);
  assert.deepEqual(await userRepository.findByEmail(input.email), createdUser);
  assert.deepEqual(await userRepository.findById(createdUser.id), createdUser);
  assert.equal(await userRepository.existsByEmail(input.email), true);
  assert.equal(await userRepository.existsByEmail(createUniqueEmail("missing-user")), false);
  await assert.rejects(() => userRepository.createUser(input), DuplicateUserEmailError);
});

test("TokenRepository stores hashes, finds only active tokens, and revokes idempotently", async () => {
  const user = await userRepository.createUser(createUserInput());
  const activeRawToken = `${createUniqueEmail("repo-token")}:active`;
  const expiredRawToken = `${createUniqueEmail("repo-token")}:expired`;
  const activeInput = createTokenInput(user.id, activeRawToken);
  const expiredInput = createTokenInput(user.id, expiredRawToken, PAST);

  const createdToken = await tokenRepository.createToken(activeInput);
  await tokenRepository.createToken(expiredInput);

  const storedToken = await testPrisma.authToken.findUnique({
    where: {
      tokenHash: activeInput.tokenHash
    },
    include: {
      user: true
    }
  });

  assert.equal(createdToken.userId, user.id);
  assert.equal(createdToken.tokenHash, activeInput.tokenHash);
  assert.equal(JSON.stringify(storedToken).includes(activeRawToken), false);
  assert.equal(Object.hasOwn(storedToken ?? {}, "accessToken"), false);
  assert.equal(storedToken?.user.email, user.email);
  assert.equal((await tokenRepository.findByTokenHash(activeInput.tokenHash))?.id, createdToken.id);
  assert.equal((await tokenRepository.findActiveByTokenHash(activeInput.tokenHash, NOW))?.id, createdToken.id);
  assert.equal(await tokenRepository.findActiveByTokenHash(activeInput.tokenHash, FUTURE), null);
  assert.equal(await tokenRepository.findActiveByTokenHash(expiredInput.tokenHash, NOW), null);

  const revokedToken = await tokenRepository.revokeByTokenHash(activeInput.tokenHash, NOW);
  const repeatedRevocation = await tokenRepository.revokeByTokenHash(activeInput.tokenHash, FUTURE);

  assert.equal(revokedToken?.revoked, true);
  assert.equal(revokedToken?.revokedAt?.getTime(), NOW.getTime());
  assert.equal(repeatedRevocation?.revokedAt?.getTime(), NOW.getTime());
  assert.equal(await tokenRepository.findActiveByTokenHash(activeInput.tokenHash, NOW), null);
  assert.equal(await tokenRepository.revokeByTokenHash(hashTestToken("missing-token"), NOW), null);
});
