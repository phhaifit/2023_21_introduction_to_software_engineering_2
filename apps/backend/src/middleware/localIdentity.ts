import type { RequestHandler } from "express";

import { env } from "../config/env.js";

export const localIdentity: RequestHandler = (request, _response, next) => {
  request.identity = {
    userId: env.defaultUserId,
    workspaceId: env.defaultWorkspaceId,
    role: env.defaultUserRole
  };
  next();
};
