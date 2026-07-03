import { Router } from "express";

import { authenticateRequest } from "../middleware/authentication.js";
import { requireWorkspaceRole, resolveWorkspaceContext } from "../middleware/workspaceContext.js";
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

agentsRouter.get("/", requireWorkspaceRole(["admin", "member", "viewer"]), getAgentsController);

agentsRouter.get("/:id", requireWorkspaceRole(["admin", "member", "viewer"]), getAgentController);

agentsRouter.post("/", requireWorkspaceRole(["admin", "member"]), createAgentController);

agentsRouter.put("/:id", requireWorkspaceRole(["admin", "member"]), updateAgentController);

agentsRouter.delete("/:id", requireWorkspaceRole(["admin"]), deleteAgentController);