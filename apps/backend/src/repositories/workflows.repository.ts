import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionLogEntry,
  WorkflowExecutionStatus,
  WorkflowStep
} from "@ai-agent-platform/shared";

import { createUuid, db } from "../db/knex.js";

const DEFAULT_WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID ?? "default-workspace";

type WorkflowRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: Workflow["status"];
  steps: WorkflowStep[] | string;
  last_run_at: Date | null;
  execution_count: number;
  created_at: Date;
  updated_at: Date;
};

type WorkflowExecutionRow = {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: WorkflowExecutionStatus;
  trigger_source: WorkflowExecution["triggerSource"];
  started_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
  logs: WorkflowExecutionLogEntry[] | string;
};

function parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value) as T[];
  }

  return [];
}

function mapRowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    steps: parseJsonArray<WorkflowStep>(row.steps),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastRunAt: row.last_run_at?.toISOString(),
    executionCount: row.execution_count
  };
}

function mapRowToExecution(row: WorkflowExecutionRow): WorkflowExecution {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowName: row.workflow_name,
    status: row.status,
    triggerSource: row.trigger_source,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString(),
    durationMs: row.duration_ms ?? undefined,
    logs: parseJsonArray<WorkflowExecutionLogEntry>(row.logs)
  };
}

export async function listWorkflows(): Promise<Workflow[]> {
  const rows = await db<WorkflowRow>("workflows")
    .select("*")
    .where({ workspace_id: DEFAULT_WORKSPACE_ID })
    .orderBy("updated_at", "desc");

  return rows.map(mapRowToWorkflow);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getWorkflowById(id: string): Promise<Workflow | undefined> {
  // Fixed after test (D2-E2 tests)
  // Postgres throws "invalid input syntax for uuid" for non-UUID ids, which 
  // is not a WorkflowNotFoundError and was previously surfacing as a 500
  // instead of a 404. Guard here so a malformed id simply behaves like "not found".
  if (!UUID_REGEX.test(id)) {
    return undefined;
  }

  const row = await db<WorkflowRow>("workflows")
    .select("*")
    .where({ id, workspace_id: DEFAULT_WORKSPACE_ID })
    .first();

  return row ? mapRowToWorkflow(row) : undefined;
}

export async function getWorkflowByName(name: string): Promise<Workflow | undefined> {
  const row = await db<WorkflowRow>("workflows")
    .select("*")
    .where({ workspace_id: DEFAULT_WORKSPACE_ID })
    .whereRaw("lower(name) = lower(?)", [name.trim()])
    .first();

  return row ? mapRowToWorkflow(row) : undefined;
}

export async function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  const now = new Date();
  const row: WorkflowRow = {
    id: createUuid(),
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: input.name.trim(),
    description: input.description.trim(),
    status: input.status,
    steps: input.steps,
    last_run_at: null,
    execution_count: 0,
    created_at: now,
    updated_at: now
  };

  await db<WorkflowRow>("workflows").insert({ ...row, steps: JSON.stringify(input.steps) });
  return mapRowToWorkflow(row);
}

export async function updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<Workflow | undefined> {
  const current = await getWorkflowById(id);

  if (!current) {
    return undefined;
  }

  const updates: Partial<WorkflowRow> = {
    updated_at: new Date()
  };

  if (typeof input.name === "string") {
    updates.name = input.name.trim();
  }

  if (typeof input.description === "string") {
    updates.description = input.description.trim();
  }

  if (input.status) {
    updates.status = input.status;
  }

  if (input.steps) {
    updates.steps = input.steps;
  }

  await db<WorkflowRow>("workflows")
    .where({ id, workspace_id: DEFAULT_WORKSPACE_ID })
    .update({ ...updates, steps: input.steps ? JSON.stringify(input.steps) : undefined });

  return getWorkflowById(id);
}

export async function createWorkflowExecution(
  workflow: Workflow,
  status: WorkflowExecutionStatus,
  logs: WorkflowExecutionLogEntry[]
): Promise<WorkflowExecution> {
  const startedAt = new Date();
  const finishedAt = new Date(startedAt.getTime() + Math.max(250, workflow.steps.length * 125));
  const row: WorkflowExecutionRow = {
    id: createUuid(),
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    status,
    trigger_source: "manual",
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    logs
  };

  await db<WorkflowExecutionRow>("workflow_executions").insert({
    ...row,
    logs: JSON.stringify(logs)
  });

  await db<WorkflowRow>("workflows")
    .where({ id: workflow.id, workspace_id: DEFAULT_WORKSPACE_ID })
    .update({
      last_run_at: finishedAt,
      execution_count: workflow.executionCount + 1,
      updated_at: finishedAt
    });

  return mapRowToExecution(row);
}

export async function listWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
  const rows = await db<WorkflowExecutionRow>("workflow_executions")
    .select("*")
    .where({ workflow_id: workflowId })
    .orderBy("started_at", "desc")
    .limit(20);

  return rows.map(mapRowToExecution);
}
