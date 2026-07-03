import type { RequestHandler } from "express";

import { findById } from "../repositories/user.repository.js";
import { validateToken } from "../services/token.service.js";

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export const authenticateRequest: RequestHandler = async (request, response, next) => {
  try {
    const accessToken = getBearerToken(request.header("authorization"));

    if (!accessToken) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const authToken = await validateToken(accessToken);

    if (!authToken) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await findById(authToken.userId);

    if (!user) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (user.status !== "active") {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    request.authContext = {
      userId: user.id,
      email: user.email,
      status: user.status
    };

    next();
  } catch {
    response.status(401).json({ error: "Unauthorized" });
  }
};