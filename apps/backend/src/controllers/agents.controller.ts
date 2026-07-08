import type { RequestHandler } from "express";

import type { AgentStatus } from "@ai-agent-platform/shared";

import {
  AgentNotFoundError,
  AgentQuotaExceededError,
  AgentValidationError,
  AgentWorkspaceInactiveError,
  createAgentService,
  deleteAgentService,
  getAgentWorkspaceSummaryService,
  getAgentByIdService,
  listAgentsWithQueryService,
  updateAgentService
} from "../services/agents.service.js";

function toPositiveInteger(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function toSingleString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

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

    const page = toPositiveInteger(_request.query.page);
    const pageSize = toPositiveInteger(_request.query.pageSize);
    const sortBy = toSingleString(_request.query.sortBy);
    const sortOrder = toSingleString(_request.query.sortOrder);
    const model = toSingleString(_request.query.model);
    const search = toSingleString(_request.query.search);
    const status = toSingleString(_request.query.status);

    const [result, workspaceSummary] = await Promise.all([
      listAgentsWithQueryService(workspaceId, {
        page,
        pageSize,
        sortBy: sortBy as "name" | "role" | "model" | undefined,
        sortOrder: sortOrder as "asc" | "desc" | undefined,
        model,
        search,
        status: isAgentStatus(status) ? status : undefined
      }),
      getAgentWorkspaceSummaryService(workspaceId)
    ]);

    response.setHeader("X-Total-Count", String(result.total));
    response.setHeader("X-Page", String(page ?? 1));
    response.setHeader("X-Page-Size", String(pageSize ?? 20));
    response.setHeader("X-Active-Count", String(result.activeCount));
    response.setHeader("X-Inactive-Count", String(result.inactiveCount));
    response.setHeader("X-Workspace-Total-Count", String(workspaceSummary.total));
    response.setHeader("X-Workspace-Active-Count", String(workspaceSummary.activeCount));
    response.setHeader("X-Workspace-Inactive-Count", String(workspaceSummary.inactiveCount));
    response.json(result.items);
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

    const { name, role, model, instructionContent, skillFileContent, status } = request.body as {
      name?: unknown;
      role?: unknown;
      model?: unknown;
      instructionContent?: unknown;
      skillFileContent?: unknown;
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
      skillFileContent: typeof skillFileContent === "string" ? skillFileContent : undefined,
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

    const { name, role, model, instructionContent, skillFileContent, status } = request.body as {
      name?: unknown;
      role?: unknown;
      model?: unknown;
      instructionContent?: unknown;
      skillFileContent?: unknown;
      status?: unknown;
    };

    const agent = await updateAgentService(workspaceId, request.params.id, {
      name: typeof name === "string" ? name : undefined,
      role: typeof role === "string" ? role : undefined,
      model: typeof model === "string" ? model : undefined,
      instructionContent: typeof instructionContent === "string" ? instructionContent : undefined,
      skillFileContent: typeof skillFileContent === "string" ? skillFileContent : undefined,
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
