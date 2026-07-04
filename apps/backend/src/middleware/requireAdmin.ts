import type { RequestHandler } from "express";

import { ApplicationError } from "../errors/applicationError.js";

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (request.identity.role !== "admin") {
    next(new ApplicationError("FORBIDDEN", 403, "Admin access required"));
    return;
  }
  next();
};
