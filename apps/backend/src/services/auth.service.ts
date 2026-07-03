import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type { PublicUserResponse, RegisterRequest } from "../dto/authentication/index.js";
import type { User } from "../entities/index.js";
import type { CreateUserInput } from "../repositories/index.js";
import { DuplicateUserEmailError } from "../repositories/user-repository.error.js";
import { hashPassword as hashPasswordValue } from "./password-encoder.service.js";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthServiceErrorCode =
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | typeof AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS
  | "REGISTER_FAILED";

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
  createUser(input: CreateUserInput): Promise<User>;
}

export interface AuthService {
  register(input: RegisterRequest): Promise<PublicUserResponse>;
}

export interface CreateAuthServiceOptions {
  userRepository?: AuthUserRepository;
  hashPassword?: (plaintextPassword: string) => Promise<string>;
}

let defaultUserRepository: AuthUserRepository | null = null;

async function loadDefaultUserRepository(): Promise<AuthUserRepository> {
  if (defaultUserRepository) {
    return defaultUserRepository;
  }

  const repositoryModule = await import("../repositories/index.js");

  defaultUserRepository = {
    existsByEmail: repositoryModule.existsByEmail,
    createUser: repositoryModule.createUser
  };

  return defaultUserRepository;
}

function assertRegisterInput(input: RegisterRequest): void {
  if (!input || typeof input.email !== "string") {
    throw new AuthServiceError("INVALID_EMAIL", "Email is invalid.", "email");
  }

  if (typeof input.password !== "string") {
    throw new AuthServiceError("WEAK_PASSWORD", "Password does not meet requirements.", "password");
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

export function createAuthService(options: CreateAuthServiceOptions = {}): AuthService {
  const injectedRepository = options.userRepository;
  const hashPassword = options.hashPassword ?? hashPasswordValue;

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
    }
  };
}

const defaultAuthService = createAuthService();

export const register = defaultAuthService.register;
