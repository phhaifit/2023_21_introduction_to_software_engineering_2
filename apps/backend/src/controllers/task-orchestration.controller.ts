import type { RequestHandler } from "express";

import type { TaskRoutingMode } from "@ai-agent-platform/shared";

import {
  getTaskConsoleService,
  getTaskService,
  submitTaskService
} from "../services/task-orchestration.service.js";

function isRoutingMode(value: unknown): value is TaskRoutingMode {
  return value === "automatic" || value === "agent" || value === "workflow" || value === "multi-agent";
}

function optionalQueryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const getTaskConsoleController: RequestHandler = async (request, response, next) => {
  try {
    response.json(await getTaskConsoleService(optionalQueryString(request.query.workspaceId)));
  } catch (error) {
    next(error);
  }
};

export const getTaskController: RequestHandler = async (request, response, next) => {
  try {
    const task = await getTaskService(request.params.id, optionalQueryString(request.query.workspaceId));

    if (!task) {
      response.status(404).json({ message: "Task not found" });
      return;
    }

    response.json(task);
  } catch (error) {
    next(error);
  }
};

export const submitTaskController: RequestHandler = async (request, response, next) => {
  try {
    const { workspaceId, requesterId, prompt, routingMode, targetId } = request.body as {
      workspaceId?: unknown;
      requesterId?: unknown;
      prompt?: unknown;
      routingMode?: unknown;
      targetId?: unknown;
    };

    if (typeof prompt !== "string" || !prompt.trim()) {
      response.status(400).json({ message: "Task prompt is required" });
      return;
    }

    if (!isRoutingMode(routingMode)) {
      response.status(400).json({ message: "A valid routing mode is required" });
      return;
    }

    const task = await submitTaskService({
      workspaceId: typeof workspaceId === "string" ? workspaceId : undefined,
      requesterId: typeof requesterId === "string" ? requesterId : undefined,
      prompt,
      routingMode,
      targetId: typeof targetId === "string" ? targetId : undefined
    });

    response.status(201).json(task);
  } catch (error) {
    next(error);
  }
};
