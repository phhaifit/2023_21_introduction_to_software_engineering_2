import type { NextFunction, RequestHandler, Response } from "express";

import type { CreateWorkflowInput, UpdateWorkflowInput, WorkflowStatus } from "@ai-agent-platform/shared";

import {
  WorkflowNotFoundError,
  WorkflowValidationError,
  createWorkflowService,
  executeWorkflowService,
  getWorkflowByIdService,
  listWorkflowExecutionsService,
  listWorkflowsService,
  updateWorkflowService
} from "../services/workflows.service.js";

function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return value === "draft" || value === "active" || value === "archived";
}

function handleWorkflowError(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof WorkflowValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }

  if (error instanceof WorkflowNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }

  next(error);
}

export const listWorkflowsController: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await listWorkflowsService());
  } catch (error) {
    next(error);
  }
};

export const getWorkflowController: RequestHandler = async (request, response, next) => {
  try {
    const workflow = await getWorkflowByIdService(request.params.id);

    if (!workflow) {
      response.status(404).json({ message: "Workflow not found" });
      return;
    }

    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const createWorkflowController: RequestHandler = async (request, response, next) => {
  try {
    const { name, description, status, steps } = request.body as Partial<CreateWorkflowInput>;

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({ message: "Workflow name is required" });
      return;
    }

    if (!Array.isArray(steps)) {
      response.status(400).json({ message: "Workflow steps are required" });
      return;
    }

    const workflow = await createWorkflowService({
      name,
      description: typeof description === "string" ? description : "",
      status: isWorkflowStatus(status) ? status : "draft",
      steps
    });

    response.status(201).json(workflow);
  } catch (error) {
    handleWorkflowError(error, response, next);
  }
};

export const updateWorkflowController: RequestHandler = async (request, response, next) => {
  try {
    const { name, description, status, steps } = request.body as Partial<UpdateWorkflowInput>;
    const workflow = await updateWorkflowService(request.params.id, {
      name: typeof name === "string" ? name : undefined,
      description: typeof description === "string" ? description : undefined,
      status: isWorkflowStatus(status) ? status : undefined,
      steps: Array.isArray(steps) ? steps : undefined
    });

    if (!workflow) {
      response.status(404).json({ message: "Workflow not found" });
      return;
    }

    response.json(workflow);
  } catch (error) {
    handleWorkflowError(error, response, next);
  }
};

export const executeWorkflowController: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json(await executeWorkflowService(request.params.id));
  } catch (error) {
    handleWorkflowError(error, response, next);
  }
};

export const listWorkflowExecutionsController: RequestHandler = async (request, response, next) => {
  try {
    response.json(await listWorkflowExecutionsService(request.params.id));
  } catch (error) {
    handleWorkflowError(error, response, next);
  }
};
