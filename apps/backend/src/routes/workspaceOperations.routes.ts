import { Router } from "express";

import { listRecentWorkspaceOperationsController } from "../controllers/workspaceOperations.controller.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const adminWorkspaceOperationsRouter = Router();
adminWorkspaceOperationsRouter.get(
  "/",
  requireAdmin,
  listRecentWorkspaceOperationsController
);
