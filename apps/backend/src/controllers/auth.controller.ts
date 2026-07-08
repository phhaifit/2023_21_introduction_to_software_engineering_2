import type { RequestHandler, Response } from "express";

import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type {
  AuthResponse,
  LoginRequest,
  PublicUserResponse,
  RegisterRequest,
  SafeErrorResponse
} from "../dto/authentication/index.js";
import {
  AuthServiceError,
  login,
  logout,
  register,
  resolveCurrentUser,
  type AuthServiceErrorCode
} from "../services/auth.service.js";

export interface AuthControllerService {
  register(input: RegisterRequest): Promise<PublicUserResponse>;
  login(input: LoginRequest): Promise<AuthResponse>;
  logout(accessToken: string): Promise<void>;
  resolveCurrentUser(accessToken: string): Promise<PublicUserResponse>;
}

interface SafeAuthErrorResponse {
  error: SafeErrorResponse;
}

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
}

const INTERNAL_SERVER_ERROR_CODE = "INTERNAL_SERVER_ERROR";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal Server Error";

const defaultAuthControllerService: AuthControllerService = {
  register,
  login,
  logout,
  resolveCurrentUser
};

export function createAuthController(
  service: AuthControllerService = defaultAuthControllerService
): AuthController {
  return {
    register: async (request, response) => {
      try {
        const user = await service.register(parseCredentialBody(request.body));
        response.status(201).json({ user });
      } catch (error) {
        sendAuthError(response, error);
      }
    },

    login: async (request, response) => {
      try {
        response.json(await service.login(parseCredentialBody(request.body)));
      } catch (error) {
        sendAuthError(response, error);
      }
    },

    logout: async (request, response) => {
      try {
        await service.logout(parseBearerToken(request.headers.authorization));
        response.sendStatus(204);
      } catch (error) {
        sendAuthError(response, error);
      }
    },

    me: async (request, response) => {
      if (!request.authenticatedUser) {
        sendAuthError(response, unauthorizedError());
        return;
      }

      response.json({ user: request.authenticatedUser });
    }
  };
}

function parseCredentialBody(body: unknown): RegisterRequest {
  const record = toRecord(body);

  return {
    email: toStringOrEmpty(record.email),
    password: toStringOrEmpty(record.password)
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseBearerToken(headerValue: string | undefined): string {
  if (!headerValue) {
    throw unauthorizedError();
  }

  const parts = headerValue.split(" ");

  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || parts[1].trim().length === 0) {
    throw unauthorizedError();
  }

  return parts[1];
}

function unauthorizedError(): AuthServiceError {
  return new AuthServiceError(AUTH_ERROR_CODES.UNAUTHORIZED, "Authentication required.");
}

export function sendAuthError(response: Response, error: unknown): void {
  const mappedError = mapAuthError(error);
  response.status(mappedError.status).json(mappedError.body);
}

function mapAuthError(error: unknown): {
  status: number;
  body: SafeAuthErrorResponse;
} {
  if (!(error instanceof AuthServiceError)) {
    return {
      status: 500,
      body: {
        error: {
          code: INTERNAL_SERVER_ERROR_CODE,
          message: INTERNAL_SERVER_ERROR_MESSAGE
        }
      }
    };
  }

  return {
    status: statusForAuthError(error.code),
    body: {
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {})
      }
    }
  };
}

function statusForAuthError(code: AuthServiceErrorCode): number {
  switch (code) {
    case "INVALID_EMAIL":
    case "WEAK_PASSWORD":
      return 400;
    case AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS:
      return 409;
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
    case AUTH_ERROR_CODES.UNAUTHORIZED:
      return 401;
    case AUTH_ERROR_CODES.ACCOUNT_DISABLED:
    case AUTH_ERROR_CODES.ACCOUNT_LOCKED:
      return 403;
    case "REGISTER_FAILED":
    case "LOGIN_FAILED":
    case "CURRENT_USER_FAILED":
    case "LOGOUT_FAILED":
      return 500;
  }
}
