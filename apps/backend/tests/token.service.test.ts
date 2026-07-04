import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import type { AuthToken } from "../src/entities/index.js";
import {
  createTokenService,
  TokenServiceError,
  type TokenRepository
} from "../src/services/token.service.js";
import type { CreateAuthTokenInput } from "../src/repositories/index.js";

const USER_ID = "user-123";
const FIXED_NOW = new Date("2026-07-03T10:00:00.000Z");
const TOKEN_TTL_MS = 15 * 60 * 1000;
const RAW_TOKEN = "raw-token-test-value";
const SECOND_RAW_TOKEN = "raw-token-test-value-two";

function hashToken(accessToken: string): string {
  return createHash("sha256").update(accessToken).digest("hex");
}

function createAuthToken(input: CreateAuthTokenInput, patch: Partial<AuthToken> = {}): AuthToken {
  return {
    id: `token-${input.tokenHash.slice(0, 8)}`,
    userId: input.userId,
    tokenHash: input.tokenHash,
    issuedAt: FIXED_NOW,
    expiresAt: input.expiresAt,
    revoked: false,
    revokedAt: null,
    ...patch
  };
}

function createFakeRepository() {
  const records = new Map<string, AuthToken>();
  const createInputs: CreateAuthTokenInput[] = [];
  const activeLookups: Array<{ tokenHash: string; currentTime?: Date }> = [];
  const revocations: Array<{ tokenHash: string; revokedAt?: Date }> = [];

  const repository: TokenRepository = {
    async createToken(input) {
      createInputs.push(input);
      const record = createAuthToken(input);
      records.set(input.tokenHash, record);
      return record;
    },

    async findActiveByTokenHash(tokenHash, currentTime = new Date()) {
      activeLookups.push({ tokenHash, currentTime });
      const record = records.get(tokenHash);

      if (!record || record.revoked || record.revokedAt || record.expiresAt <= currentTime) {
        return null;
      }

      return record;
    },

    async revokeByTokenHash(tokenHash, revokedAt = new Date()) {
      revocations.push({ tokenHash, revokedAt });
      const record = records.get(tokenHash);

      if (!record) {
        return null;
      }

      if (record.revoked) {
        return record;
      }

      const revokedRecord = {
        ...record,
        revoked: true,
        revokedAt
      };

      records.set(tokenHash, revokedRecord);
      return revokedRecord;
    }
  };

  return {
    repository,
    records,
    createInputs,
    activeLookups,
    revocations
  };
}

test("createToken returns a URL-safe raw token and persists only its hash", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    tokenTtlMs: TOKEN_TTL_MS
  });

  const result = await service.createToken(USER_ID);
  const persistedInput = fake.createInputs[0];

  assert.match(result.accessToken, /^[A-Za-z0-9_-]+$/);
  assert.equal(result.accessToken.length > 0, true);
  assert.equal(result.expiresAt.getTime(), FIXED_NOW.getTime() + TOKEN_TTL_MS);
  assert.equal(persistedInput.userId, USER_ID);
  assert.equal(persistedInput.expiresAt.getTime(), result.expiresAt.getTime());
  assert.equal(persistedInput.tokenHash, hashToken(result.accessToken));
  assert.notEqual(persistedInput.tokenHash, result.accessToken);
  assert.equal(Object.hasOwn(persistedInput, "accessToken"), false);
});

test("createToken uses the configured generator and creates different hashes for different tokens", async () => {
  const fake = createFakeRepository();
  const rawTokens = [RAW_TOKEN, SECOND_RAW_TOKEN];
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    generateRawToken: () => rawTokens.shift() ?? "fallback-token",
    tokenTtlMs: TOKEN_TTL_MS
  });

  const firstResult = await service.createToken(USER_ID);
  const secondResult = await service.createToken(USER_ID);

  assert.notEqual(firstResult.accessToken, secondResult.accessToken);
  assert.notEqual(fake.createInputs[0].tokenHash, fake.createInputs[1].tokenHash);
});

test("validateToken returns the active token and uses hash lookup with the current time", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    generateRawToken: () => RAW_TOKEN,
    tokenTtlMs: TOKEN_TTL_MS
  });

  await service.createToken(USER_ID);
  const validatedToken = await service.validateToken(RAW_TOKEN);

  assert.notEqual(validatedToken, null);
  assert.equal(validatedToken?.tokenHash, hashToken(RAW_TOKEN));
  assert.deepEqual(fake.activeLookups[0], {
    tokenHash: hashToken(RAW_TOKEN),
    currentTime: FIXED_NOW
  });
});

test("validateToken returns null for missing or blank tokens", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    tokenTtlMs: TOKEN_TTL_MS
  });

  assert.equal(await service.validateToken("missing-token"), null);
  assert.equal(await service.validateToken(""), null);
  assert.equal(await service.validateToken("   "), null);
  assert.equal(fake.activeLookups.length, 1);
});

test("validateToken rejects expired tokens including the exact expiration boundary", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    tokenTtlMs: TOKEN_TTL_MS
  });
  const expiredHash = hashToken("expired-token");
  const boundaryHash = hashToken("boundary-token");

  fake.records.set(expiredHash, createAuthToken({
    userId: USER_ID,
    tokenHash: expiredHash,
    expiresAt: new Date(FIXED_NOW.getTime() - 1)
  }));
  fake.records.set(boundaryHash, createAuthToken({
    userId: USER_ID,
    tokenHash: boundaryHash,
    expiresAt: FIXED_NOW
  }));

  assert.equal(await service.validateToken("expired-token"), null);
  assert.equal(await service.validateToken("boundary-token"), null);
});

test("validateToken rejects revoked tokens and records with revokedAt", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    tokenTtlMs: TOKEN_TTL_MS
  });
  const revokedHash = hashToken("revoked-token");
  const revokedAtHash = hashToken("revoked-at-token");

  fake.records.set(revokedHash, createAuthToken({
    userId: USER_ID,
    tokenHash: revokedHash,
    expiresAt: new Date(FIXED_NOW.getTime() + TOKEN_TTL_MS)
  }, {
    revoked: true,
    revokedAt: new Date(FIXED_NOW.getTime() - 1000)
  }));
  fake.records.set(revokedAtHash, createAuthToken({
    userId: USER_ID,
    tokenHash: revokedAtHash,
    expiresAt: new Date(FIXED_NOW.getTime() + TOKEN_TTL_MS)
  }, {
    revokedAt: new Date(FIXED_NOW.getTime() - 1000)
  }));

  assert.equal(await service.validateToken("revoked-token"), null);
  assert.equal(await service.validateToken("revoked-at-token"), null);
});

test("invalidateToken revokes active tokens and prevents later validation", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    generateRawToken: () => RAW_TOKEN,
    tokenTtlMs: TOKEN_TTL_MS
  });

  await service.createToken(USER_ID);

  assert.equal(await service.invalidateToken(RAW_TOKEN), true);
  assert.deepEqual(fake.revocations[0], {
    tokenHash: hashToken(RAW_TOKEN),
    revokedAt: FIXED_NOW
  });
  assert.equal(await service.validateToken(RAW_TOKEN), null);
});

test("invalidateToken returns false for missing or blank tokens", async () => {
  const fake = createFakeRepository();
  const service = createTokenService({
    repository: fake.repository,
    now: () => FIXED_NOW,
    tokenTtlMs: TOKEN_TTL_MS
  });

  assert.equal(await service.invalidateToken("missing-token"), false);
  assert.equal(await service.invalidateToken(""), false);
  assert.equal(await service.invalidateToken("   "), false);
  assert.equal(fake.revocations.length, 1);
});

test("invalidateToken is safe to repeat and preserves the first revokedAt", async () => {
  const firstRevokeTime = FIXED_NOW;
  const secondRevokeTime = new Date(FIXED_NOW.getTime() + 5000);
  const fake = createFakeRepository();
  let currentTime = firstRevokeTime;
  const service = createTokenService({
    repository: fake.repository,
    now: () => currentTime,
    generateRawToken: () => RAW_TOKEN,
    tokenTtlMs: TOKEN_TTL_MS
  });

  await service.createToken(USER_ID);

  assert.equal(await service.invalidateToken(RAW_TOKEN), true);
  currentTime = secondRevokeTime;
  assert.equal(await service.invalidateToken(RAW_TOKEN), true);

  const record = fake.records.get(hashToken(RAW_TOKEN));
  assert.equal(record?.revokedAt?.getTime(), firstRevokeTime.getTime());
});

test("operational failures throw a sanitized TokenServiceError", async () => {
  const rawToken = "sensitive-raw-token";
  const tokenHash = hashToken(rawToken);
  const service = createTokenService({
    repository: {
      async createToken() {
        throw new Error("database failure");
      },
      async findActiveByTokenHash() {
        throw new Error("database failure");
      },
      async revokeByTokenHash() {
        throw new Error("database failure");
      }
    },
    now: () => FIXED_NOW,
    generateRawToken: () => rawToken,
    tokenTtlMs: TOKEN_TTL_MS
  });

  await assert.rejects(() => service.createToken(USER_ID), (error) => {
    assert.equal(error instanceof TokenServiceError, true);
    assert.equal(String(error).includes(rawToken), false);
    assert.equal(String(error).includes(tokenHash), false);
    return true;
  });
  await assert.rejects(() => service.validateToken(rawToken), TokenServiceError);
  await assert.rejects(() => service.invalidateToken(rawToken), TokenServiceError);
});

test("token generator and hash failures do not return raw tokens", async () => {
  const fake = createFakeRepository();
  const generatorFailureService = createTokenService({
    repository: fake.repository,
    generateRawToken: () => {
      throw new Error("random failure");
    },
    tokenTtlMs: TOKEN_TTL_MS
  });
  const hashFailureService = createTokenService({
    repository: fake.repository,
    generateRawToken: () => RAW_TOKEN,
    hashToken: () => {
      throw new Error("hash failure");
    },
    tokenTtlMs: TOKEN_TTL_MS
  });

  await assert.rejects(() => generatorFailureService.createToken(USER_ID), TokenServiceError);
  await assert.rejects(() => hashFailureService.createToken(USER_ID), TokenServiceError);
  assert.equal(fake.createInputs.length, 0);
});
