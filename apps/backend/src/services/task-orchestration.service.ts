import type { OrchestratedTask, SubmitTaskInput, TaskAuditLog, TaskConsole, ExecutionTarget, TaskRoutingMode } from "@ai-agent-platform/shared";

import { createUuid, db } from "../db/knex.js";
import {
  DEFAULT_WORKSPACE_ID,
  createCompletedTask,
  getTaskById,
  listAgentTargets,
  listTasks,
  listWorkflowTargets,
  updateTask,
  addAuditLogs
} from "../repositories/task-orchestration.repository.js";
import { buildCollaborationContext } from "./task-orchestration/collaborationPlanner.js";
import { generateRealResult } from "./task-orchestration/gemini.js";
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

  const taskId = input.taskId?.trim();
  let existingTask: OrchestratedTask | undefined;
  if (taskId) {
    existingTask = await getTaskById(taskId, workspaceId);
  }

  // Determine routing and collaboration context
  let routingDecision: {
    mode: TaskRoutingMode;
    target: ExecutionTarget;
    reason: string;
  };
  let collaborationContext: any;

  const rawDecision = analyzeRouting({
    prompt,
    routingMode: input.routingMode,
    targetId: input.targetId,
    agents,
    workflows
  });
  routingDecision = {
    mode: rawDecision.mode,
    target: rawDecision.target,
    reason: existingTask
      ? `Continuing existing task conversation thread with target: ${rawDecision.target.name}.`
      : rawDecision.reason
  };
  collaborationContext = buildCollaborationContext({
    prompt,
    target: routingDecision.target,
    agents,
    routingMode: routingDecision.mode
  });

  const now = new Date().toISOString();

  // If the target is offline, fail it
  if (routingDecision.target.status !== "online") {
    const errorMsg = "The selected execution target is offline.";
    const failedTaskInput = {
      id: createUuid(),
      workspaceId,
      requesterId,
      prompt,
      routingMode: routingDecision.mode,
      targetType: routingDecision.target.type,
      targetId: routingDecision.target.id,
      targetName: routingDecision.target.name,
      status: "failed" as const,
      result: null,
      resultSummary: null,
      error: errorMsg,
      collaborationContext: null,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: createUuid(),
          role: "user" as const,
          content: prompt,
          createdAt: now
        },
        {
          id: createUuid(),
          role: "assistant" as const,
          content: "",
          summary: null,
          error: errorMsg,
          createdAt: now
        }
      ],
      auditLog: [
        audit("Task Accepted", "The prompt was valid and persisted for traceability."),
        audit("Routing Recorded", routingDecision.reason),
        audit("Execution Blocked", errorMsg)
      ]
    };
    return createCompletedTask(failedTaskInput);
  }

  // Parse prompt for task deletions
  const normalizedPrompt = prompt.toLowerCase();
  const isDeleteAll =
    (normalizedPrompt.includes("delete") && normalizedPrompt.includes("all") && (normalizedPrompt.includes("task") || normalizedPrompt.includes("work"))) ||
    (normalizedPrompt.includes("xóa") && (normalizedPrompt.includes("tất cả") || normalizedPrompt.includes("hết")) && (normalizedPrompt.includes("task") || normalizedPrompt.includes("công việc")));

  const isDeleteRecent =
    (normalizedPrompt.includes("delete") && (normalizedPrompt.includes("recent") || normalizedPrompt.includes("last")) && (normalizedPrompt.includes("task") || normalizedPrompt.includes("work"))) ||
    (normalizedPrompt.includes("xóa") && (normalizedPrompt.includes("gần đây") || normalizedPrompt.includes("vừa qua")) && (normalizedPrompt.includes("task") || normalizedPrompt.includes("công việc")));

  const isDeleteGeneral =
    !isDeleteAll && !isDeleteRecent && (
      (normalizedPrompt.includes("delete") && (normalizedPrompt.includes("task") || normalizedPrompt.includes("work"))) ||
      (normalizedPrompt.includes("xóa") && (normalizedPrompt.includes("task") || normalizedPrompt.includes("công việc")))
    );

  const isDelete = isDeleteAll || isDeleteRecent || isDeleteGeneral;

  // Initialize/load messages history
  let currentMessages: any[] = [];
  if (existingTask) {
    currentMessages = existingTask.messages || [];
    if (currentMessages.length === 0) {
      currentMessages = [
        {
          id: createUuid(),
          role: "user",
          content: existingTask.prompt,
          createdAt: existingTask.createdAt
        }
      ];
      if (existingTask.result || existingTask.error) {
        currentMessages.push({
          id: createUuid(),
          role: "assistant",
          content: existingTask.result || "",
          summary: existingTask.resultSummary,
          error: existingTask.error,
          createdAt: existingTask.updatedAt
        });
      }
    }
  }

  // Append new user prompt to message history
  const userMsgId = createUuid();
  currentMessages.push({
    id: userMsgId,
    role: "user",
    content: prompt,
    createdAt: new Date().toISOString()
  });

  let result: { summary: string; output: string; calendarActions?: any[] };
  if (isDelete) {
    result = {
      summary: isDeleteRecent ? "Đã xoá các task gần đây thành công." : "Đã xoá toàn bộ task thành công.",
      output: isDeleteRecent
        ? "Đã thực hiện xoá thành công các task được tạo trong vòng 24 giờ qua khỏi cơ sở dữ liệu."
        : "Đã thực hiện xoá thành công tất cả các task khỏi cơ sở dữ liệu."
    };
  } else {
    try {
      // Create history format expected by generateRealResult (excluding the latest prompt we just appended)
      const historyForGemini = currentMessages
        .slice(0, -1)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));

      result = await generateRealResult({
        prompt,
        routingMode: routingDecision.mode,
        target: routingDecision.target,
        collaborationContext,
        history: historyForGemini,
        currentStatistics: input.currentStatistics,
        currentEvents: input.currentEvents
      });
    } catch (error: any) {
      const assistantMsgId = createUuid();
      const errorMsg = error.message || "Failed to execute task via Gemini API.";
      currentMessages.push({
        id: assistantMsgId,
        role: "assistant",
        content: "",
        summary: null,
        error: errorMsg,
        createdAt: new Date().toISOString()
      });

      if (existingTask) {
        existingTask.status = "failed";
        existingTask.routingMode = routingDecision.mode;
        existingTask.targetType = routingDecision.target.type;
        existingTask.targetId = routingDecision.target.id;
        existingTask.targetName = routingDecision.target.name;
        existingTask.result = null;
        existingTask.resultSummary = null;
        existingTask.error = errorMsg;
        existingTask.collaborationContext = collaborationContext;
        existingTask.messages = currentMessages;
        existingTask.updatedAt = new Date().toISOString();

        await updateTask(existingTask);
        await addAuditLogs(existingTask.id, [
          audit("Prompt Added", "A follow-up prompt was appended to the conversation thread."),
          audit("Execution Failed", errorMsg)
        ]);
        return (await getTaskById(existingTask.id, workspaceId))!;
      } else {
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
          error: errorMsg,
          collaborationContext,
          createdAt: now,
          updatedAt: new Date().toISOString(),
          messages: currentMessages,
          auditLog: [
            audit("Task Submitted", "The user prompt was accepted by the task submission endpoint."),
            audit("Routing Recorded", routingDecision.reason),
            audit("Execution Failed", errorMsg)
          ]
        });
      }
    }
  }

  // Append successful assistant response to message history
  const assistantMsgId = createUuid();
  currentMessages.push({
    id: assistantMsgId,
    role: "assistant",
    content: result.output,
    summary: result.summary,
    createdAt: new Date().toISOString(),
    calendarActions: result.calendarActions || []
  });

  if (isDeleteAll || isDeleteGeneral) {
    await db("orchestrated_tasks").where({ workspace_id: workspaceId }).delete();
  } else if (isDeleteRecent) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db("orchestrated_tasks")
      .where({ workspace_id: workspaceId })
      .andWhere("created_at", ">=", oneDayAgo)
      .delete();
  }

  if (existingTask) {
    existingTask.status = "completed";
    existingTask.routingMode = routingDecision.mode;
    existingTask.targetType = routingDecision.target.type;
    existingTask.targetId = routingDecision.target.id;
    existingTask.targetName = routingDecision.target.name;
    existingTask.result = result.output;
    existingTask.resultSummary = result.summary;
    existingTask.error = null;
    existingTask.collaborationContext = collaborationContext;
    existingTask.messages = currentMessages;
    existingTask.updatedAt = new Date().toISOString();

    await updateTask(existingTask);
    await addAuditLogs(existingTask.id, [
      audit("Prompt Added", "A follow-up prompt was appended to the conversation thread."),
      audit("Result Aggregated", "The follow-up execution result was appended to the conversation history.")
    ]);
    return (await getTaskById(existingTask.id, workspaceId))!;
  } else {
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
      messages: currentMessages,
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
}
