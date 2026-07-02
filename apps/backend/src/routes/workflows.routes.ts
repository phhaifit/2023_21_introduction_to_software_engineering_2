import { Router } from "express";

import {
  createWorkflowController,
  executeWorkflowController,
  getWorkflowController,
  listWorkflowExecutionsController,
  listWorkflowsController,
  updateWorkflowController
} from "../controllers/workflows.controller.js";

export const workflowsRouter = Router();

workflowsRouter.get("/", listWorkflowsController);
workflowsRouter.post("/", createWorkflowController);
workflowsRouter.get("/:id", getWorkflowController);
workflowsRouter.patch("/:id", updateWorkflowController);
workflowsRouter.post("/:id/execute", executeWorkflowController);
workflowsRouter.get("/:id/executions", listWorkflowExecutionsController);
