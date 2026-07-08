import type { RequestHandler } from "express";
import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import type { PublicUserResponse } from "../dto/authentication/index.js";
import { AuthServiceError, resolveCurrentUser } from "../services/auth.service.js";

interface AgentAuthenticationService {
  resolveCurrentUser(accessToken: string): Promise<PublicUserResponse>;
}

const defaultAuthenticationService: AgentAuthenticationService = {
  resolveCurrentUser
};

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const parts = authorizationHeader.trim().split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() !== "bearer" || token.trim().length === 0) {
    return null;
  }

  return token;
}

function isForbiddenAuthError(error: unknown): boolean {
  return (
    error instanceof AuthServiceError &&
    (error.code === AUTH_ERROR_CODES.ACCOUNT_DISABLED || error.code === AUTH_ERROR_CODES.ACCOUNT_LOCKED)
  );
}

export function createAuthenticateRequest(
  service: AgentAuthenticationService = defaultAuthenticationService
): RequestHandler {
  return async (request, response, next) => {
    try {
      const accessToken = getBearerToken(request.header("authorization"));

      if (!accessToken) {
        response.status(401).json({ error: "Unauthorized" });
        return;
      }

      const user = await service.resolveCurrentUser(accessToken);

      request.authContext = {
        userId: user.id,
        email: user.email,
        status: user.status
      };

      next();
    } catch (error) {
      if (isForbiddenAuthError(error)) {
        response.status(403).json({ error: "Forbidden" });
        return;
      }

      response.status(401).json({ error: "Unauthorized" });
    }
  };
}

export const authenticateRequest: RequestHandler = createAuthenticateRequest();
