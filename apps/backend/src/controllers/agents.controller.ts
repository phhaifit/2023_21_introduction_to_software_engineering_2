import type { RequestHandler } from "express";

import type { AgentStatus } from "@ai-agent-platform/shared";

import {
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
    response.json(await listAgentsService());
  } catch (error) {
    next(error);
  }
};

export const getAgentController: RequestHandler = async (request, response, next) => {
  try {
    const agent = await getAgentByIdService(request.params.id);

    if (!agent) {
      response.status(404).json({ message: "Agent not found" });
      return;
    }

    response.json(agent);
  } catch (error) {
    next(error);
  }
};

export const createAgentController: RequestHandler = async (request, response, next) => {
  try {
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

    const agent = await createAgentService({
      name: name.trim(),
      role: role.trim(),
      model: model.trim(),
      instructionContent: instructionContent.trim(),
      status: isAgentStatus(status) ? status : "active"
    });

    response.status(201).json(agent);
  } catch (error) {
    next(error);
  }
};

export const updateAgentController: RequestHandler = async (request, response, next) => {
  try {
    const { name, role, model, instructionContent, status } = request.body as {
      name?: unknown;
      role?: unknown;
      model?: unknown;
      instructionContent?: unknown;
      status?: unknown;
    };

    const agent = await updateAgentService(request.params.id, {
      name: typeof name === "string" ? name : undefined,
      role: typeof role === "string" ? role : undefined,
      model: typeof model === "string" ? model : undefined,
      instructionContent: typeof instructionContent === "string" ? instructionContent : undefined,
      status: isAgentStatus(status) ? status : undefined
    });

    if (!agent) {
      response.status(404).json({ message: "Agent not found" });
      return;
    }

    response.json(agent);
  } catch (error) {
    next(error);
  }
};

export const deleteAgentController: RequestHandler = async (request, response, next) => {
  try {
    const agent = await deleteAgentService(request.params.id);

    if (!agent) {
      response.status(404).json({ message: "Agent not found" });
      return;
    }

    response.json(agent);
  } catch (error) {
    next(error);
  }
};
