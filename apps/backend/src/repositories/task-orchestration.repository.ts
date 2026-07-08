import type {
  CollaborationContext,
  ExecutionTarget,
  OrchestratedTask,
  TaskAuditLog,
  TaskRoutingMode,
  TaskStatus,
  TaskTargetType
} from "@ai-agent-platform/shared";

import { createUuid, db } from "../db/knex.js";

type AgentTargetRow = {
  id: string;
  workspace_id: string;
  name: string;
  role: string;
  status: "active" | "inactive";
  created_at: Date;
};

type WorkflowRow = {
  id: string;
  workspace_id: string;
  name: string;
  status: "online" | "offline";
  capabilities: string[];
  description: string | null;
  created_at: Date;
  updated_at: Date;
};

type TaskRow = {
  id: string;
  workspace_id: string;
  requester_id: string;
  prompt: string;
  routing_mode: TaskRoutingMode;
  target_type: TaskTargetType;
  target_id: string;
  target_name: string;
  status: TaskStatus;
  result: string | null;
  result_summary: string | null;
  error: string | null;
  collaboration_context: CollaborationContext | null;
  created_at: Date;
  updated_at: Date;
  messages?: any;
};

type AuditRow = {
  id: string;
  task_id: string;
  title: string;
  detail: string;
  created_at: Date;
};

const DEFAULT_WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID ?? "default-workspace";

const defaultWorkflows = [
  {
    name: "Release Readiness Workflow",
    capabilities: ["release", "approval", "risk-review"],
    description: "Routes release tasks through intake, risk review, owner assignment, and final summary."
  },
  {
    name: "Customer Support Escalation Workflow",
    capabilities: ["support", "classification", "escalation"],
    description: "Coordinates support escalations through classify, route, draft response, and escalate."
  }
];

function mapTask(row: TaskRow, auditLog: TaskAuditLog[]): OrchestratedTask {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    requesterId: row.requester_id,
    prompt: row.prompt,
    routingMode: row.routing_mode,
    targetType: row.target_type,
    targetId: row.target_id,
    targetName: row.target_name,
    status: row.status,
    result: row.result,
    resultSummary: row.result_summary,
    error: row.error,
    collaborationContext: row.collaboration_context,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    auditLog,
    messages: typeof row.messages === "string" ? JSON.parse(row.messages) : row.messages
  };
}

function mapAudit(row: AuditRow): TaskAuditLog {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at.toISOString()
  };
}

function capabilitiesForRole(role: string): string[] {
  const normalizedRole = role.toLowerCase();
  const capabilities = ["planning", "task-routing"];

  if (normalizedRole.includes("quality") || normalizedRole.includes("review")) {
    capabilities.push("quality-check", "review");
  }

  if (normalizedRole.includes("coordinator") || normalizedRole.includes("lead")) {
    capabilities.push("multi-agent", "aggregation", "delegation");
  }

  return capabilities;
}

async function ensureDefaultWorkflows(workspaceId: string) {
  const existing = await db<WorkflowRow>("task_workflows").where({ workspace_id: workspaceId }).first();

  if (existing) {
    return;
  }

  const now = new Date();
  await db<WorkflowRow>("task_workflows").insert(
    defaultWorkflows.map((workflow) => ({
      id: createUuid(),
      workspace_id: workspaceId,
      name: workflow.name,
      status: "online",
      capabilities: workflow.capabilities,
      description: workflow.description,
      created_at: now,
      updated_at: now
    }))
  );
}

export async function listAgentTargets(workspaceId = DEFAULT_WORKSPACE_ID): Promise<ExecutionTarget[]> {
  const rows = await db<AgentTargetRow>("agents")
    .select("id", "name", "role", "status")
    .where({ workspace_id: workspaceId })
    .orderBy("created_at", "desc");

  const targets = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: "agent" as const,
    status: row.status === "active" ? "online" as const : "offline" as const,
    capabilities: capabilitiesForRole(row.role)
  }));

  if (targets.length > 0) {
    return targets;
  }

  return [
    {
      id: "virtual-planning-agent",
      name: "Planning Analyst Agent",
      type: "agent",
      status: "online",
      capabilities: ["planning", "task-routing"]
    },
    {
      id: "virtual-coordinator-agent",
      name: "Multi-Agent Coordinator",
      type: "agent",
      status: "online",
      capabilities: ["multi-agent", "aggregation", "delegation"]
    }
  ];
}

export async function listWorkflowTargets(workspaceId = DEFAULT_WORKSPACE_ID): Promise<ExecutionTarget[]> {
  await ensureDefaultWorkflows(workspaceId);
  const rows = await db<WorkflowRow>("task_workflows")
    .select("*")
    .where({ workspace_id: workspaceId })
    .orderBy("created_at", "asc");

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: "workflow",
    status: row.status,
    capabilities: row.capabilities
  }));
}

export async function listTasks(workspaceId = DEFAULT_WORKSPACE_ID): Promise<OrchestratedTask[]> {
  const rows = await db<TaskRow>("orchestrated_tasks")
    .select("*")
    .where({ workspace_id: workspaceId })
    .orderBy("updated_at", "desc");
  const taskIds = rows.map((row) => row.id);
  const auditRows = taskIds.length
    ? await db<AuditRow>("task_audit_logs").select("*").whereIn("task_id", taskIds).orderBy("created_at", "asc")
    : [];

  return rows.map((row) => mapTask(row, auditRows.filter((auditRow) => auditRow.task_id === row.id).map(mapAudit)));
}

export async function getTaskById(id: string, workspaceId = DEFAULT_WORKSPACE_ID): Promise<OrchestratedTask | undefined> {
  const row = await db<TaskRow>("orchestrated_tasks").select("*").where({ id, workspace_id: workspaceId }).first();

  if (!row) {
    return undefined;
  }

  const auditRows = await db<AuditRow>("task_audit_logs").select("*").where({ task_id: id }).orderBy("created_at", "asc");
  return mapTask(row, auditRows.map(mapAudit));
}

export async function createCompletedTask(input: Omit<OrchestratedTask, "auditLog"> & { auditLog: Array<Omit<TaskAuditLog, "id" | "taskId">> }) {
  await db.transaction(async (trx) => {
    await trx<TaskRow>("orchestrated_tasks").insert({
      id: input.id,
      workspace_id: input.workspaceId,
      requester_id: input.requesterId,
      prompt: input.prompt,
      routing_mode: input.routingMode,
      target_type: input.targetType,
      target_id: input.targetId,
      target_name: input.targetName,
      status: input.status,
      result: input.result,
      result_summary: input.resultSummary,
      error: input.error,
      collaboration_context: input.collaborationContext,
      created_at: new Date(input.createdAt),
      updated_at: new Date(input.updatedAt),
      messages: input.messages ? JSON.stringify(input.messages) : null
    });

    await trx<AuditRow>("task_audit_logs").insert(
      input.auditLog.map((audit) => ({
        id: createUuid(),
        task_id: input.id,
        title: audit.title,
        detail: audit.detail,
        created_at: new Date(audit.createdAt)
      }))
    );
  });

  const task = await getTaskById(input.id, input.workspaceId);

  if (!task) {
    throw new Error("Task was not persisted.");
  }

  return task;
}

export async function updateTask(input: OrchestratedTask) {
  await db.transaction(async (trx) => {
    await trx<TaskRow>("orchestrated_tasks")
      .where({ id: input.id })
      .update({
        status: input.status,
        routing_mode: input.routingMode,
        target_type: input.targetType,
        target_id: input.targetId,
        target_name: input.targetName,
        result: input.result,
        result_summary: input.resultSummary,
        error: input.error,
        collaboration_context: input.collaborationContext,
        updated_at: new Date(input.updatedAt),
        messages: input.messages ? JSON.stringify(input.messages) : null
      });
  });

  return getTaskById(input.id, input.workspaceId);
}

export async function addAuditLogs(taskId: string, logs: Array<Omit<TaskAuditLog, "id" | "taskId">>) {
  if (!logs.length) return;

  await db<AuditRow>("task_audit_logs").insert(
    logs.map((audit) => ({
      id: createUuid(),
      task_id: taskId,
      title: audit.title,
      detail: audit.detail,
      created_at: new Date(audit.createdAt)
    }))
  );
}

export { DEFAULT_WORKSPACE_ID };
