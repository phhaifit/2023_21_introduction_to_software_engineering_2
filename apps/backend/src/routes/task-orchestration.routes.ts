import { Router } from "express";

import {
  getTaskConsoleController,
  getTaskController,
  submitTaskController
} from "../controllers/task-orchestration.controller.js";

export const taskOrchestrationRouter = Router();

taskOrchestrationRouter.get("/console", getTaskConsoleController);
taskOrchestrationRouter.get("/tasks/:id", getTaskController);
taskOrchestrationRouter.post("/tasks", submitTaskController);
