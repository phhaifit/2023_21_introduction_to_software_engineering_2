import { Router } from "express";

import {
  completeProvisioning,
  createWorkspace,
  deleteWorkspace,
  failWorkspace,
  getWorkspaceById,
  listWorkspaces,
  restartWorkspace,
  retryWorkspace,
  startWorkspace,
  stopWorkspace,
  updateWorkspace,
  validateCreateWorkspaceRequest,
  validateUpdateWorkspaceRequest
} from "./workspace.service.js";
import type {
  CreateWorkspaceRequest,
  FailWorkspaceRequest,
  UpdateWorkspaceRequest
} from "./workspace.types.js";

export const workspaceRouter = Router();

workspaceRouter.get("/workspaces", (_request, response) => {
  response.json({
    data: listWorkspaces()
  });
});

workspaceRouter.get("/workspaces/:workspaceId", (request, response) => {
  const workspace = getWorkspaceById(request.params.workspaceId);

  if (!workspace) {
    sendNotFound(response);
    return;
  }

  response.json({
    data: workspace
  });
});

workspaceRouter.post("/workspaces", (request, response) => {
  const payload = request.body as Partial<CreateWorkspaceRequest>;
  const validationErrors = validateCreateWorkspaceRequest(payload);

  if (validationErrors.length > 0) {
    sendValidationError(response, validationErrors);
    return;
  }

  const workspace = createWorkspace(payload as CreateWorkspaceRequest);

  response.status(201).json({
    data: workspace
  });
});

workspaceRouter.patch("/workspaces/:workspaceId", (request, response) => {
  const payload = request.body as Partial<UpdateWorkspaceRequest>;
  const validationErrors = validateUpdateWorkspaceRequest(payload, request.params.workspaceId);

  if (validationErrors.length > 0) {
    sendValidationError(response, validationErrors);
    return;
  }

  const workspace = updateWorkspace(request.params.workspaceId, payload);

  if (!workspace) {
    sendNotFound(response);
    return;
  }

  response.json({
    data: workspace
  });
});

workspaceRouter.delete("/workspaces/:workspaceId", (request, response) => {
  if (!deleteWorkspace(request.params.workspaceId)) {
    sendNotFound(response);
    return;
  }

  response.sendStatus(204);
});

workspaceRouter.post("/workspaces/:workspaceId/start", (request, response) => {
  sendWorkspaceAction(response, startWorkspace(request.params.workspaceId));
});

workspaceRouter.post("/workspaces/:workspaceId/stop", (request, response) => {
  sendWorkspaceAction(response, stopWorkspace(request.params.workspaceId));
});

workspaceRouter.post("/workspaces/:workspaceId/restart", (request, response) => {
  sendWorkspaceAction(response, restartWorkspace(request.params.workspaceId));
});

workspaceRouter.post("/workspaces/:workspaceId/retry", (request, response) => {
  sendWorkspaceAction(response, retryWorkspace(request.params.workspaceId));
});

workspaceRouter.post("/workspaces/:workspaceId/complete", (request, response) => {
  sendWorkspaceAction(response, completeProvisioning(request.params.workspaceId));
});

workspaceRouter.post("/workspaces/:workspaceId/fail", (request, response) => {
  const payload = request.body as FailWorkspaceRequest;
  sendWorkspaceAction(response, failWorkspace(request.params.workspaceId, payload));
});

function sendWorkspaceAction(response: import("express").Response, workspace: unknown) {
  if (!workspace) {
    sendNotFound(response);
    return;
  }

  response.json({
    data: workspace
  });
}

function sendNotFound(response: import("express").Response) {
  response.status(404).json({
    error: "Workspace not found"
  });
}

function sendValidationError(
  response: import("express").Response,
  details: ReturnType<typeof validateCreateWorkspaceRequest>
) {
  response.status(400).json({
    error: "Validation failed",
    details
  });
}
