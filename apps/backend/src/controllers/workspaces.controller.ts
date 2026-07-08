import type { NextFunction, RequestHandler, Response } from "express";

import {
  completeWorkspaceProvisioningService,
  createWorkspaceService,
  deleteWorkspaceService,
  failWorkspaceService,
  getWorkspaceByIdService,
  listWorkspacesService,
  restartWorkspaceService,
  retryWorkspaceService,
  startWorkspaceService,
  stopWorkspaceService,
  updateWorkspaceService,
  WorkspaceNotFoundError,
  WorkspaceValidationError
} from "../services/workspaces.service.js";

export const listWorkspacesController: RequestHandler = async (_request, response, next) => {
  try {
    response.json({ data: await listWorkspacesService() });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceController: RequestHandler = async (request, response, next) => {
  try {
    response.json({ data: await getWorkspaceByIdService(request.params.workspaceId) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
};

export const createWorkspaceController: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      data: await createWorkspaceService(request.body, request.authContext?.email)
    });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
};

export const updateWorkspaceController: RequestHandler = async (request, response, next) => {
  try {
    response.json({ data: await updateWorkspaceService(request.params.workspaceId, request.body) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
};

export const deleteWorkspaceController: RequestHandler = async (request, response, next) => {
  try {
    await deleteWorkspaceService(request.params.workspaceId);
    response.sendStatus(204);
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
};

export const startWorkspaceController = createWorkspaceActionController(startWorkspaceService);
export const stopWorkspaceController = createWorkspaceActionController(stopWorkspaceService);
export const restartWorkspaceController = createWorkspaceActionController(restartWorkspaceService);
export const retryWorkspaceController = createWorkspaceActionController(retryWorkspaceService);
export const completeWorkspaceProvisioningController =
  createWorkspaceActionController(completeWorkspaceProvisioningService);

export const failWorkspaceController: RequestHandler = async (request, response, next) => {
  try {
    response.json({ data: await failWorkspaceService(request.params.workspaceId, request.body) });
  } catch (error) {
    handleWorkspaceError(error, response, next);
  }
};

function createWorkspaceActionController(
  action: (id: string) => Promise<unknown>
): RequestHandler {
  return async (request, response, next) => {
    try {
      response.json({ data: await action(request.params.workspaceId) });
    } catch (error) {
      handleWorkspaceError(error, response, next);
    }
  };
}

function handleWorkspaceError(
  error: unknown,
  response: Response,
  next: NextFunction
) {
  if (error instanceof WorkspaceValidationError) {
    response.status(400).json({
      error: error.message,
      details: error.details
    });
    return;
  }

  if (error instanceof WorkspaceNotFoundError) {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  next(error);
}
