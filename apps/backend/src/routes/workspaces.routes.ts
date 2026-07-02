import { Router } from "express";

import {
  completeWorkspaceProvisioningController,
  createWorkspaceController,
  deleteWorkspaceController,
  failWorkspaceController,
  getWorkspaceController,
  listWorkspacesController,
  restartWorkspaceController,
  retryWorkspaceController,
  startWorkspaceController,
  stopWorkspaceController,
  updateWorkspaceController
} from "../controllers/workspaces.controller.js";

export const workspacesRouter = Router();

workspacesRouter.get("/", listWorkspacesController);
workspacesRouter.post("/", createWorkspaceController);
workspacesRouter.get("/:workspaceId", getWorkspaceController);
workspacesRouter.patch("/:workspaceId", updateWorkspaceController);
workspacesRouter.delete("/:workspaceId", deleteWorkspaceController);
workspacesRouter.post("/:workspaceId/start", startWorkspaceController);
workspacesRouter.post("/:workspaceId/stop", stopWorkspaceController);
workspacesRouter.post("/:workspaceId/restart", restartWorkspaceController);
workspacesRouter.post("/:workspaceId/retry", retryWorkspaceController);
workspacesRouter.post("/:workspaceId/complete", completeWorkspaceProvisioningController);
workspacesRouter.post("/:workspaceId/fail", failWorkspaceController);
