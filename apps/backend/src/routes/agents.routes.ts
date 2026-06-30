import { Router } from "express";

import {
  createAgentController,
  deleteAgentController,
  getAgentController,
  getAgentsController,
  updateAgentController
} from "../controllers/agents.controller.js";

export const agentsRouter = Router();

agentsRouter.get("/", getAgentsController);

agentsRouter.get("/:id", getAgentController);

agentsRouter.post("/", createAgentController);

agentsRouter.put("/:id", updateAgentController);

agentsRouter.delete("/:id", deleteAgentController);