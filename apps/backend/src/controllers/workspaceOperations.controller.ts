import type { RequestHandler } from "express";

import { listRecentWorkspaceOperationsService } from "../services/workspaceOperations.service.js";

export const listRecentWorkspaceOperationsController: RequestHandler = async (
  _request,
  response,
  next
) => {
  try {
    response.json(await listRecentWorkspaceOperationsService());
  } catch (error) {
    next(error);
  }
};
