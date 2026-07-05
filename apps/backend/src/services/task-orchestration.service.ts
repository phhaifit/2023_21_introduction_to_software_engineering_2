import type { OrchestratedTask, SubmitTaskInput, TaskAuditLog, TaskConsole } from "@ai-agent-platform/shared";

import { createUuid } from "../db/knex.js";
import {
  DEFAULT_WORKSPACE_ID,
  createCompletedTask,
  getTaskById,
  listAgentTargets,
  listTasks,
  listWorkflowTargets
} from "../repositories/task-orchestration.repository.js";
import { buildCollaborationContext } from "./task-orchestration/collaborationPlanner.js";
import { aggregateResult } from "./task-orchestration/resultAggregator.js";
import { analyzeRouting } from "./task-orchestration/routingAnalyzer.js";

const DEFAULT_REQUESTER_ID = process.env.DEFAULT_REQUESTER_ID ?? "demo-user";

function audit(title: string, detail: string): Omit<TaskAuditLog, "id" | "taskId"> {
  return {
    title,
    detail,
    createdAt: new Date().toISOString()
  };
}

function reject(code: string, message: string, statusCode: number): never {
  throw Object.assign(new Error(message), { code, statusCode });
}

export async function getTaskConsoleService(workspaceId = DEFAULT_WORKSPACE_ID): Promise<TaskConsole> {
  const [agents, workflows, tasks] = await Promise.all([
    listAgentTargets(workspaceId),
    listWorkflowTargets(workspaceId),
    listTasks(workspaceId)
  ]);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const failedTasks = tasks.filter((task) => task.status === "failed").length;

  return {
    agents,
    workflows,
    tasks,
    metrics: {
      activeTasks: tasks.filter((task) => task.status === "processing" || task.status === "queued").length,
      completedTasks,
      failedTasks,
      successRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
    }
  };
}

export async function getTaskService(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  return getTaskById(id, workspaceId);
}

export async function submitTaskService(input: SubmitTaskInput): Promise<OrchestratedTask> {
  const prompt = input.prompt.trim();

  if (!prompt) {
    reject("PROMPT_REQUIRED", "Task prompt is required.", 422);
  }

  const workspaceId = input.workspaceId?.trim() || DEFAULT_WORKSPACE_ID;
  const requesterId = input.requesterId?.trim() || DEFAULT_REQUESTER_ID;
  const [agents, workflows] = await Promise.all([listAgentTargets(workspaceId), listWorkflowTargets(workspaceId)]);
  const routingDecision = analyzeRouting({
    prompt,
    routingMode: input.routingMode,
    targetId: input.targetId,
    agents,
    workflows
  });

  const now = new Date().toISOString();

  if (routingDecision.target.status !== "online") {
    return createCompletedTask({
      id: createUuid(),
      workspaceId,
      requesterId,
      prompt,
      routingMode: routingDecision.mode,
      targetType: routingDecision.target.type,
      targetId: routingDecision.target.id,
      targetName: routingDecision.target.name,
      status: "failed",
      result: null,
      resultSummary: null,
      error: "The selected execution target is offline.",
      collaborationContext: null,
      createdAt: now,
      updatedAt: now,
      auditLog: [
        audit("Task Accepted", "The prompt was valid and persisted for traceability."),
        audit("Routing Recorded", routingDecision.reason),
        audit("Execution Blocked", "The selected execution target is offline.")
      ]
    });
  }

  const collaborationContext = buildCollaborationContext({
    prompt,
    target: routingDecision.target,
    agents
  });
  const result = aggregateResult({
    prompt,
    routingMode: routingDecision.mode,
    target: routingDecision.target,
    collaborationContext
  });

  return createCompletedTask({
    id: createUuid(),
    workspaceId,
    requesterId,
    prompt,
    routingMode: routingDecision.mode,
    targetType: routingDecision.target.type,
    targetId: routingDecision.target.id,
    targetName: routingDecision.target.name,
    status: "completed",
    result: result.output,
    resultSummary: result.summary,
    error: null,
    collaborationContext,
    createdAt: now,
    updatedAt: new Date().toISOString(),
    auditLog: [
      audit("Task Submitted", "The user prompt was accepted by the task submission endpoint."),
      audit("Routing Recorded", routingDecision.reason),
      audit(
        collaborationContext ? "Context Shared" : "Single Target Execution",
        collaborationContext
          ? "The coordinator shared prompt context with participating agents."
          : "The task was executed by one selected target."
      ),
      audit("Result Aggregated", "Execution output was summarized into the final task result.")
    ]
  });
}
