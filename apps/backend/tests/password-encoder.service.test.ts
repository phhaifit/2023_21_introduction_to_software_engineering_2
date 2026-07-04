import assert from "node:assert/strict";
import { test } from "node:test";

import { hashPassword, verifyPassword } from "../src/services/password-encoder.service.js";

const CORRECT_PASSWORD = "CorrectHorseBatteryStaple-Test-Only";
const WRONG_PASSWORD = "WrongPassword-Test-Only";
const OTHER_PASSWORD = "DifferentPassword-Test-Only";
const MALFORMED_HASH = "not-a-valid-password-hash";

test("hashPassword returns a non-empty hash that is not the plaintext password", async () => {
  const passwordHash = await hashPassword(CORRECT_PASSWORD);

  assert.equal(typeof passwordHash, "string");
  assert.equal(passwordHash.length > 0, true);
  assert.equal(passwordHash === CORRECT_PASSWORD, false);
});

test("hashPassword salts the same password differently and both hashes verify", async () => {
  const firstHash = await hashPassword(CORRECT_PASSWORD);
  const secondHash = await hashPassword(CORRECT_PASSWORD);

  assert.equal(firstHash === secondHash, false);
  assert.equal(await verifyPassword(CORRECT_PASSWORD, firstHash), true);
  assert.equal(await verifyPassword(CORRECT_PASSWORD, secondHash), true);
});

test("verifyPassword returns true for the correct password", async () => {
  const passwordHash = await hashPassword(CORRECT_PASSWORD);

  assert.equal(await verifyPassword(CORRECT_PASSWORD, passwordHash), true);
});

test("verifyPassword returns false for an incorrect password", async () => {
  const passwordHash = await hashPassword(CORRECT_PASSWORD);

  assert.equal(await verifyPassword(WRONG_PASSWORD, passwordHash), false);
});

test("verifyPassword returns false for a different password and hash pair", async () => {
  const passwordHash = await hashPassword(CORRECT_PASSWORD);

  assert.equal(await verifyPassword(OTHER_PASSWORD, passwordHash), false);
});

test("verifyPassword returns false for malformed hashes", async () => {
  assert.equal(await verifyPassword(CORRECT_PASSWORD, MALFORMED_HASH), false);
});

test("hashPassword and verifyPassword do not enforce password policy", async () => {
  const passwordHash = await hashPassword("");

  assert.equal(await verifyPassword("", passwordHash), true);
});
