import { Router } from "express";

import { authenticateRequest } from "../middleware/authentication.js";
import { resolveWorkspaceContext } from "../middleware/workspaceContext.js";
import {
  createAgentController,
  deleteAgentController,
  getAgentController,
  getAgentsController,
  updateAgentController
} from "../controllers/agents.controller.js";

export const agentsRouter = Router();

agentsRouter.use(authenticateRequest);
agentsRouter.use(resolveWorkspaceContext);

// Permission checks are intentionally disabled for Agent Management for now.
agentsRouter.get("/", getAgentsController);

// agentsRouter.get("/:id", requireWorkspaceRole(["admin", "member", "viewer"]), getAgentController);
agentsRouter.get("/:id", getAgentController);

// agentsRouter.post("/", requireWorkspaceRole(["admin", "member"]), createAgentController);
agentsRouter.post("/", createAgentController);

// agentsRouter.put("/:id", requireWorkspaceRole(["admin", "member"]), updateAgentController);
agentsRouter.put("/:id", updateAgentController);

// agentsRouter.delete("/:id", requireWorkspaceRole(["admin"]), deleteAgentController);
agentsRouter.delete("/:id", deleteAgentController);