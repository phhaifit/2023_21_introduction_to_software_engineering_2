import type { RequestHandler } from "express";

import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type { PublicUserResponse } from "../dto/authentication/index.js";
import { sendAuthError } from "../controllers/auth.controller.js";
import {
  AuthServiceError,
  resolveCurrentUser
} from "../services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: PublicUserResponse;
    }
  }
}

export interface AuthenticationService {
  resolveCurrentUser(accessToken: string): Promise<PublicUserResponse>;
}

const defaultAuthenticationService: AuthenticationService = {
  resolveCurrentUser
};

export function createAuthMiddleware(
  service: AuthenticationService = defaultAuthenticationService
): RequestHandler {
  return async (request, response, next) => {
    try {
      const accessToken = parseBearerToken(request.headers.authorization);
      request.authenticatedUser = await service.resolveCurrentUser(accessToken);
      next();
    } catch (error) {
      sendAuthError(response, error);
    }
  };
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
