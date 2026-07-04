import { createHash } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client.js";

const TEST_DATABASE_ERROR = "TEST_DATABASE_URL must point to an isolated test database.";
const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db"]);

let uniqueCounter = 0;

function assertTestDatabaseUrl(): string {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error(TEST_DATABASE_ERROR);
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL === testDatabaseUrl) {
    throw new Error(TEST_DATABASE_ERROR);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error(TEST_DATABASE_ERROR);
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? "");
  const hostName = parsedUrl.hostname.toLowerCase();

  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(TEST_DATABASE_ERROR);
  }

  if (databaseName === "ai_agent_platform" || !LOCAL_DATABASE_HOSTS.has(hostName)) {
    throw new Error(TEST_DATABASE_ERROR);
  }

  return testDatabaseUrl;
}

export const TEST_DATABASE_URL = assertTestDatabaseUrl();

process.env.DATABASE_URL = TEST_DATABASE_URL;

export const testPrisma = new PrismaClient({
  adapter: new PrismaPg(TEST_DATABASE_URL)
});

export function createUniqueEmail(prefix = "auth-test"): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}@example.test`;
}

export function hashTestToken(accessToken: string): string {
  return createHash("sha256").update(accessToken).digest("hex");
}

export async function resetAuthData(): Promise<void> {
  await testPrisma.authToken.deleteMany();
  await testPrisma.user.deleteMany();
}

export async function getAuthDataCounts(): Promise<{ users: number; authTokens: number }> {
  const [users, authTokens] = await Promise.all([
    testPrisma.user.count(),
    testPrisma.authToken.count()
  ]);

  return {
    users,
    authTokens
  };
}

export async function disconnectTestDatabase(): Promise<void> {
  await testPrisma.$disconnect();
}
