import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type {
  AuthResponse,
  LoginRequest,
  PublicUserResponse,
  RegisterRequest
} from "../dto/authentication/index.js";
import type { AuthToken, User, UserStatus } from "../entities/index.js";
import type { CreateUserInput } from "../repositories/index.js";
import { DuplicateUserEmailError } from "../repositories/user-repository.error.js";
import {
  hashPassword as hashPasswordValue,
  verifyPassword as verifyPasswordValue
} from "./password-encoder.service.js";
import type { CreateTokenResult } from "./token.service.js";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthServiceErrorCode =
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | typeof AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS
  | typeof AUTH_ERROR_CODES.INVALID_CREDENTIALS
  | typeof AUTH_ERROR_CODES.ACCOUNT_DISABLED
  | typeof AUTH_ERROR_CODES.ACCOUNT_LOCKED
  | typeof AUTH_ERROR_CODES.UNAUTHORIZED
  | "REGISTER_FAILED"
  | "LOGIN_FAILED"
  | "CURRENT_USER_FAILED"
  | "LOGOUT_FAILED";

export class AuthServiceError extends Error {
  constructor(
    public readonly code: AuthServiceErrorCode,
    message: string,
    public readonly field?: "email" | "password"
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export interface AuthUserRepository {
  existsByEmail(email: string): Promise<boolean>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
}

export interface AuthService {
  register(input: RegisterRequest): Promise<PublicUserResponse>;
  login(input: LoginRequest): Promise<AuthResponse>;
  resolveCurrentUser(accessToken: string): Promise<PublicUserResponse>;
  logout(accessToken: string): Promise<void>;
}

export interface CreateAuthServiceOptions {
  userRepository?: AuthUserRepository;
  hashPassword?: (plaintextPassword: string) => Promise<string>;
  verifyPassword?: (plaintextPassword: string, passwordHash: string) => Promise<boolean>;
  createToken?: (userId: string) => Promise<CreateTokenResult>;
  validateToken?: (accessToken: string) => Promise<AuthToken | null>;
  invalidateToken?: (accessToken: string) => Promise<boolean>;
}

let defaultUserRepository: AuthUserRepository | null = null;

async function loadDefaultUserRepository(): Promise<AuthUserRepository> {
  if (defaultUserRepository) {
    return defaultUserRepository;
  }

  const repositoryModule = await import("../repositories/index.js");

  defaultUserRepository = {
    existsByEmail: repositoryModule.existsByEmail,
    findByEmail: repositoryModule.findByEmail,
    findById: repositoryModule.findById,
    createUser: repositoryModule.createUser
  };

  return defaultUserRepository;
}

async function createDefaultToken(userId: string): Promise<CreateTokenResult> {
  const tokenServiceModule = await import("./token.service.js");
  return tokenServiceModule.createToken(userId);
}

async function validateDefaultToken(accessToken: string): Promise<AuthToken | null> {
  const tokenServiceModule = await import("./token.service.js");
  return tokenServiceModule.validateToken(accessToken);
}

async function invalidateDefaultToken(accessToken: string): Promise<boolean> {
  const tokenServiceModule = await import("./token.service.js");
  return tokenServiceModule.invalidateToken(accessToken);
}

function assertRegisterInput(input: RegisterRequest): void {
  if (!input || typeof input.email !== "string") {
    throw new AuthServiceError("INVALID_EMAIL", "Email is invalid.", "email");
  }

  if (typeof input.password !== "string") {
    throw new AuthServiceError("WEAK_PASSWORD", "Password does not meet requirements.", "password");
  }
}

function assertLoginInput(input: LoginRequest): void {
  if (!input || typeof input.email !== "string" || typeof input.password !== "string") {
    throw toInvalidCredentialsError();
  }

  if (!normalizeEmail(input.email) || input.password.length === 0) {
    throw toInvalidCredentialsError();
  }
}

function assertAccessTokenInput(accessToken: string): void {
  if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
    throw toUnauthorizedError();
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidEmail(email: string): void {
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new AuthServiceError("INVALID_EMAIL", "Email is invalid.", "email");
  }
}

function assertValidPassword(password: string): void {
  const isStrong =
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  if (!isStrong) {
    throw new AuthServiceError("WEAK_PASSWORD", "Password does not meet requirements.", "password");
  }
}

function assertLoginEmail(email: string): void {
  if (!EMAIL_PATTERN.test(email)) {
    throw toInvalidCredentialsError();
  }
}

function assertActiveUserStatus(status: UserStatus): void {
  if (status === "active") {
    return;
  }

  if (status === "disabled") {
    throw new AuthServiceError(AUTH_ERROR_CODES.ACCOUNT_DISABLED, "Account is disabled.");
  }

  if (status === "locked") {
    throw new AuthServiceError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, "Account is locked.");
  }

  throw toLoginFailedError();
}

function mapUserToPublicUserResponse(user: User): PublicUserResponse {
  return {
    id: user.id,
    email: user.email,
    status: user.status
  };
}

function toDuplicateEmailError(): AuthServiceError {
  return new AuthServiceError(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS, "Email is already registered.", "email");
}

function toRegisterFailedError(): AuthServiceError {
  return new AuthServiceError("REGISTER_FAILED", "Registration failed.");
}

function toInvalidCredentialsError(): AuthServiceError {
  return new AuthServiceError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password.");
}

function toLoginFailedError(): AuthServiceError {
  return new AuthServiceError("LOGIN_FAILED", "Login failed.");
}

function toUnauthorizedError(): AuthServiceError {
  return new AuthServiceError(AUTH_ERROR_CODES.UNAUTHORIZED, "Authentication required.");
}

function toCurrentUserFailedError(): AuthServiceError {
  return new AuthServiceError("CURRENT_USER_FAILED", "Current user resolution failed.");
}

function toLogoutFailedError(): AuthServiceError {
  return new AuthServiceError("LOGOUT_FAILED", "Logout failed.");
}

export function createAuthService(options: CreateAuthServiceOptions = {}): AuthService {
  const injectedRepository = options.userRepository;
  const hashPassword = options.hashPassword ?? hashPasswordValue;
  const verifyPassword = options.verifyPassword ?? verifyPasswordValue;
  const createToken = options.createToken ?? createDefaultToken;
  const validateToken = options.validateToken ?? validateDefaultToken;
  const invalidateToken = options.invalidateToken ?? invalidateDefaultToken;

  return {
    async register(input: RegisterRequest): Promise<PublicUserResponse> {
      assertRegisterInput(input);

      const normalizedEmail = normalizeEmail(input.email);

      assertValidEmail(normalizedEmail);
      assertValidPassword(input.password);

      try {
        const userRepository = injectedRepository ?? await loadDefaultUserRepository();

        if (await userRepository.existsByEmail(normalizedEmail)) {
          throw toDuplicateEmailError();
        }

        const passwordHash = await hashPassword(input.password);
        const user = await userRepository.createUser({
          email: normalizedEmail,
          passwordHash
        });

        return mapUserToPublicUserResponse(user);
      } catch (error) {
        if (error instanceof AuthServiceError) {
          throw error;
        }

        if (error instanceof DuplicateUserEmailError) {
          throw toDuplicateEmailError();
        }

        throw toRegisterFailedError();
      }
    },

    async login(input: LoginRequest): Promise<AuthResponse> {
      assertLoginInput(input);

      const normalizedEmail = normalizeEmail(input.email);

      assertLoginEmail(normalizedEmail);

      try {
        const userRepository = injectedRepository ?? await loadDefaultUserRepository();
        const user = await userRepository.findByEmail(normalizedEmail);

        if (!user) {
          throw toInvalidCredentialsError();
        }

        const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

        if (!isPasswordValid) {
          throw toInvalidCredentialsError();
        }

        assertActiveUserStatus(user.status);

        const token = await createToken(user.id);

        return {
          user: mapUserToPublicUserResponse(user),
          accessToken: token.accessToken,
          expiresAt: token.expiresAt.toISOString()
        };
      } catch (error) {
        if (error instanceof AuthServiceError) {
          throw error;
        }

        throw toLoginFailedError();
      }
    },

    async resolveCurrentUser(accessToken: string): Promise<PublicUserResponse> {
      assertAccessTokenInput(accessToken);

      try {
        const token = await validateToken(accessToken);

        if (!token) {
          throw toUnauthorizedError();
        }

        const userRepository = injectedRepository ?? await loadDefaultUserRepository();
        const user = await userRepository.findById(token.userId);

        if (!user) {
          throw toUnauthorizedError();
        }

        assertActiveUserStatus(user.status);

        return mapUserToPublicUserResponse(user);
      } catch (error) {
        if (error instanceof AuthServiceError) {
          throw error;
        }

        throw toCurrentUserFailedError();
      }
    },

    async logout(accessToken: string): Promise<void> {
      assertAccessTokenInput(accessToken);

      try {
        await invalidateToken(accessToken);
      } catch (error) {
        if (error instanceof AuthServiceError) {
          throw error;
        }

        throw toLogoutFailedError();
      }
    }
  };
}

const defaultAuthService = createAuthService();

export const register = defaultAuthService.register;
export const login = defaultAuthService.login;
export const resolveCurrentUser = defaultAuthService.resolveCurrentUser;
export const logout = defaultAuthService.logout;
