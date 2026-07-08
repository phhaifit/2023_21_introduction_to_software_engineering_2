import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import { AUTHENTICATION_ERROR_MESSAGES } from "../constants/authentication.constants";
import type { LoginFormPayload, RegisterFormPayload } from "../utils/auth-validator";

export interface AuthenticatedUser {
  id: string;
  email: string;
  status: "active" | "disabled" | "locked";
}

export interface LoginApiResponse {
  user: AuthenticatedUser;
  accessToken: string;
  expiresAt: string;
}

interface RegisterApiResponse {
  user: AuthenticatedUser;
}

interface CurrentUserApiResponse {
  user: AuthenticatedUser;
}

interface AuthErrorBody {
  error?: {
    code?: unknown;
    message?: unknown;
    field?: unknown;
  };
}

export class AuthApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "/api");
const GENERIC_AUTH_ERROR_CODE = "AUTH_REQUEST_FAILED";
const NETWORK_AUTH_ERROR_CODE = "AUTH_NETWORK_ERROR";

export async function register(input: RegisterFormPayload): Promise<AuthenticatedUser> {
  const response = await requestJson<RegisterApiResponse>("/auth/register", {
    method: "POST",
    body: input
  });

  return response.user;
}

export async function login(input: LoginFormPayload): Promise<LoginApiResponse> {
  return requestJson<LoginApiResponse>("/auth/login", {
    method: "POST",
    body: input
  });
}

export async function logout(accessToken: string): Promise<void> {
  await requestJson<void>("/auth/logout", {
    method: "POST",
    accessToken
  });
}

export async function getCurrentUser(accessToken: string): Promise<AuthenticatedUser> {
  const response = await requestJson<CurrentUserApiResponse>("/auth/me", {
    method: "GET",
    accessToken
  });

  return response.user;
}

function normalizeApiBaseUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === "/") {
    return "";
  }

  return trimmedValue.replace(/\/+$/, "");
}

async function requestJson<TResponse>(
  path: string,
  options: {
    method: "GET" | "POST";
    body?: unknown;
    accessToken?: string;
  }
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new AuthApiError(NETWORK_AUTH_ERROR_CODE, "Authentication service is unavailable.", 0);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw toAuthApiError(response.status, body);
  }

  return body as TResponse;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function toAuthApiError(status: number, body: unknown): AuthApiError {
  const errorBody = toAuthErrorBody(body);
  const code = typeof errorBody.error?.code === "string"
    ? errorBody.error.code
    : status === 401
      ? AUTH_ERROR_CODES.UNAUTHORIZED
      : GENERIC_AUTH_ERROR_CODE;
  const field = typeof errorBody.error?.field === "string" ? errorBody.error.field : undefined;

  return new AuthApiError(code, safeMessageForCode(code), status, field);
}

function toAuthErrorBody(value: unknown): AuthErrorBody {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as AuthErrorBody;
}

function safeMessageForCode(code: string): string {
  switch (code) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return AUTHENTICATION_ERROR_MESSAGES.INVALID_CREDENTIALS;
    case AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS:
      return AUTHENTICATION_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
    case AUTH_ERROR_CODES.ACCOUNT_DISABLED:
    case AUTH_ERROR_CODES.ACCOUNT_LOCKED:
      return AUTHENTICATION_ERROR_MESSAGES.ACCOUNT_DISABLED;
    case AUTH_ERROR_CODES.UNAUTHORIZED:
      return AUTHENTICATION_ERROR_MESSAGES.UNAUTHORIZED;
    case AUTH_ERROR_CODES.INVALID_INPUT:
    case "INVALID_EMAIL":
    case "WEAK_PASSWORD":
      return AUTHENTICATION_ERROR_MESSAGES.INVALID_INPUT;
    default:
      return "Authentication request failed.";
  }
}
