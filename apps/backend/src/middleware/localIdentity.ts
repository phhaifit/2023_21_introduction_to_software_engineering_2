import type { RequestHandler } from "express";

import { env } from "../config/env.js";
import { ApplicationError } from "../errors/applicationError.js";

export const localIdentity: RequestHandler = (request, _response, next) => {
  const demoRoleHeader = env.demoControlsEnabled
    ? request.header("X-Demo-Role")
    : undefined;

  if (demoRoleHeader && demoRoleHeader !== "member" && demoRoleHeader !== "admin") {
    next(new ApplicationError("INVALID_INPUT", 400, "Invalid X-Demo-Role"));
    return;
  }

  const demoRole = demoRoleHeader as "member" | "admin" | undefined;

  request.identity = {
    userId: env.defaultUserId,
    workspaceId: env.defaultWorkspaceId,
    role: demoRole ?? env.defaultUserRole
  };
  next();
};
