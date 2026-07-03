import type { RequestHandler } from "express";

import type { AgentStatus } from "@ai-agent-platform/shared";

import {
  AgentNotFoundError,
  AgentQuotaExceededError,
  AgentValidationError,
  AgentWorkspaceInactiveError,
  createAgentService,
  deleteAgentService,
  getAgentByIdService,
  listAgentsService,
  updateAgentService
} from "../services/agents.service.js";

function isAgentStatus(value: unknown): value is AgentStatus {
  return value === "active" || value === "inactive";
}

export const getAgentsController: RequestHandler = async (_request, response, next) => {
  try {
    const workspaceId = _request.workspaceContext?.workspaceId;

    if (!workspaceId) {
      response.status(400).json({ message: "Workspace context is required" });
      return;
    }

    response.json(await listAgentsService(workspaceId));
  } catch (error) {
    handleAgentError(error, response, next);
  }
};

export const getAgentController: RequestHandler = async (request, response, next) => {
  try {
    const workspaceId = request.workspaceContext?.workspaceId;

    if (!workspaceId) {
      response.status(400).json({ message: "Workspace context is required" });
      return;
    }

    const agent = await getAgentByIdService(workspaceId, request.params.id);

    response.json(agent);
  } catch (error) {
    handleAgentError(error, response, next);
  }
};

export const createAgentController: RequestHandler = async (request, response, next) => {
  try {
    const workspaceId = request.workspaceContext?.workspaceId;
    const actorUserId = request.authContext?.userId;

    if (!workspaceId || !actorUserId) {
      response.status(400).json({ message: "Authentication and workspace context are required" });
      return;
    }

    const { name, role, model, instructionContent, status } = request.body as {
      name?: unknown;
      role?: unknown;
      model?: unknown;
      instructionContent?: unknown;
      status?: unknown;
    };

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({ message: "Agent name is required" });
      return;
    }

    if (typeof role !== "string" || !role.trim()) {
      response.status(400).json({ message: "Agent role is required" });
      return;
    }

    if (typeof model !== "string" || !model.trim()) {
      response.status(400).json({ message: "Agent model is required" });
      return;
    }

    if (typeof instructionContent !== "string" || !instructionContent.trim()) {
      response.status(400).json({ message: "Agent instruction content is required" });
      return;
    }

    const agent = await createAgentService(workspaceId, {
      name: name.trim(),
      role: role.trim(),
      model: model.trim(),
      instructionContent: instructionContent.trim(),
      status: isAgentStatus(status) ? status : "active"
    }, actorUserId);

    response.status(201).json(agent);
  } catch (error) {
    handleAgentError(error, response, next);
  }
};

export const updateAgentController: RequestHandler = async (request, response, next) => {
  try {
    const workspaceId = request.workspaceContext?.workspaceId;
    const actorUserId = request.authContext?.userId;

    if (!workspaceId || !actorUserId) {
      response.status(400).json({ message: "Authentication and workspace context are required" });
      return;
    }

    const { name, role, model, instructionContent, status } = request.body as {
      name?: unknown;
      role?: unknown;
      model?: unknown;
      instructionContent?: unknown;
      status?: unknown;
    };

    const agent = await updateAgentService(workspaceId, request.params.id, {
      name: typeof name === "string" ? name : undefined,
      role: typeof role === "string" ? role : undefined,
      model: typeof model === "string" ? model : undefined,
      instructionContent: typeof instructionContent === "string" ? instructionContent : undefined,
      status: isAgentStatus(status) ? status : undefined
    }, actorUserId);

    response.json(agent);
  } catch (error) {
    handleAgentError(error, response, next);
  }
};

export const deleteAgentController: RequestHandler = async (request, response, next) => {
  try {
    const workspaceId = request.workspaceContext?.workspaceId;

    if (!workspaceId) {
      response.status(400).json({ message: "Workspace context is required" });
      return;
    }

    const agent = await deleteAgentService(workspaceId, request.params.id);

    response.json(agent);
  } catch (error) {
    handleAgentError(error, response, next);
  }
};

function handleAgentError(error: unknown, response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof AgentValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }

  if (error instanceof AgentNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }

  if (error instanceof AgentQuotaExceededError) {
    response.status(409).json({ message: error.message });
    return;
  }

  if (error instanceof AgentWorkspaceInactiveError) {
    response.status(403).json({ message: error.message });
    return;
  }

  next(error);
}
