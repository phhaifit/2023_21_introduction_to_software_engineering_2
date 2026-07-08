import { createHash, randomBytes } from "node:crypto";

import type { AuthToken } from "../entities/index.js";
import type { CreateAuthTokenInput } from "../repositories/index.js";

const ACCESS_TOKEN_BYTE_LENGTH = 32;
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

type Clock = () => Date;
type GenerateRawToken = () => string;
type HashToken = (accessToken: string) => string;
type LoadTokenRepository = () => Promise<TokenRepository>;

export interface CreateTokenResult {
  accessToken: string;
  expiresAt: Date;
}

export interface TokenRepository {
  createToken(input: CreateAuthTokenInput): Promise<AuthToken>;
  findActiveByTokenHash(tokenHash: string, currentTime?: Date): Promise<AuthToken | null>;
  revokeByTokenHash(tokenHash: string, revokedAt?: Date): Promise<AuthToken | null>;
}

export interface TokenService {
  createToken(userId: string): Promise<CreateTokenResult>;
  validateToken(accessToken: string): Promise<AuthToken | null>;
  invalidateToken(accessToken: string): Promise<boolean>;
}

export interface CreateTokenServiceOptions {
  repository?: TokenRepository;
  loadRepository?: LoadTokenRepository;
  now?: Clock;
  generateRawToken?: GenerateRawToken;
  hashToken?: HashToken;
  tokenTtlMs?: number;
}

export class TokenServiceError extends Error {
  constructor() {
    super("Token service operation failed.");
    this.name = "TokenServiceError";
  }
}

let defaultTokenRepository: TokenRepository | null = null;

async function loadDefaultTokenRepository(): Promise<TokenRepository> {
  if (defaultTokenRepository) {
    return defaultTokenRepository;
  }

  const repositoryModule = await import("../repositories/index.js");

  defaultTokenRepository = {
    createToken: repositoryModule.createToken,
    findActiveByTokenHash: repositoryModule.findActiveByTokenHash,
    revokeByTokenHash: repositoryModule.revokeByTokenHash
  };

  return defaultTokenRepository;
}

function generateOpaqueAccessToken(): string {
  return randomBytes(ACCESS_TOKEN_BYTE_LENGTH).toString("base64url");
}

function hashAccessToken(accessToken: string): string {
  return createHash("sha256").update(accessToken).digest("hex");
}

function assertValidTokenTtl(tokenTtlMs: number): void {
  if (!Number.isInteger(tokenTtlMs) || tokenTtlMs <= 0) {
    throw new TokenServiceError();
  }
}

function isBlankToken(accessToken: string): boolean {
  return accessToken.trim().length === 0;
}

export function createTokenService(options: CreateTokenServiceOptions = {}): TokenService {
  const injectedRepository = options.repository;
  const loadRepository = injectedRepository
    ? async () => injectedRepository
    : options.loadRepository ?? loadDefaultTokenRepository;
  const now = options.now ?? (() => new Date());
  const generateRawToken = options.generateRawToken ?? generateOpaqueAccessToken;
  const hashToken = options.hashToken ?? hashAccessToken;
  const tokenTtlMs = options.tokenTtlMs ?? ACCESS_TOKEN_TTL_MS;

  assertValidTokenTtl(tokenTtlMs);

  return {
    async createToken(userId: string): Promise<CreateTokenResult> {
      try {
        const accessToken = generateRawToken();
        const tokenHash = hashToken(accessToken);
        const expiresAt = new Date(now().getTime() + tokenTtlMs);
        const repository = await loadRepository();

        await repository.createToken({
          userId,
          tokenHash,
          expiresAt
        });

        return {
          accessToken,
          expiresAt
        };
      } catch {
        throw new TokenServiceError();
      }
    },

    async validateToken(accessToken: string): Promise<AuthToken | null> {
      if (isBlankToken(accessToken)) {
        return null;
      }

      try {
        const tokenHash = hashToken(accessToken);
        const repository = await loadRepository();
        return await repository.findActiveByTokenHash(tokenHash, now());
      } catch {
        throw new TokenServiceError();
      }
    },

    async invalidateToken(accessToken: string): Promise<boolean> {
      if (isBlankToken(accessToken)) {
        return false;
      }

      try {
        const tokenHash = hashToken(accessToken);
        const repository = await loadRepository();
        const revokedToken = await repository.revokeByTokenHash(tokenHash, now());

        return revokedToken !== null;
      } catch {
        throw new TokenServiceError();
      }
    }
  };
}

const defaultTokenService = createTokenService();

export const createToken = defaultTokenService.createToken;
export const validateToken = defaultTokenService.validateToken;
export const invalidateToken = defaultTokenService.invalidateToken;
