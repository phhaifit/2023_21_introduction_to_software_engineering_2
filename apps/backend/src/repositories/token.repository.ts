import type { AuthToken } from "../entities/index.js";
import { prisma } from "../db/prisma.js";
import type { AuthToken as PrismaAuthToken } from "../generated/prisma/client.js";

export interface CreateAuthTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

function mapPrismaAuthTokenToAuthToken(record: PrismaAuthToken): AuthToken {
  return {
    id: record.id,
    userId: record.userId,
    tokenHash: record.tokenHash,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    revoked: record.revoked,
    revokedAt: record.revokedAt
  };
}

export async function createToken(input: CreateAuthTokenInput): Promise<AuthToken> {
  const record = await prisma.authToken.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt
    }
  });

  return mapPrismaAuthTokenToAuthToken(record);
}

export async function findByTokenHash(tokenHash: string): Promise<AuthToken | null> {
  const record = await prisma.authToken.findUnique({
    where: {
      tokenHash
    }
  });

  return record ? mapPrismaAuthTokenToAuthToken(record) : null;
}

export async function findActiveByTokenHash(
  tokenHash: string,
  currentTime = new Date()
): Promise<AuthToken | null> {
  const record = await prisma.authToken.findFirst({
    where: {
      tokenHash,
      revoked: false,
      revokedAt: null,
      expiresAt: {
        gt: currentTime
      }
    }
  });

  return record ? mapPrismaAuthTokenToAuthToken(record) : null;
}

export async function revokeByTokenHash(
  tokenHash: string,
  revokedAt = new Date()
): Promise<AuthToken | null> {
  await prisma.authToken.updateMany({
    where: {
      tokenHash,
      revoked: false
    },
    data: {
      revoked: true,
      revokedAt
    }
  });

  return findByTokenHash(tokenHash);
}
