import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionLogEntry,
  WorkflowStatus,
  WorkflowStep
} from "@ai-agent-platform/shared";

import {
  createWorkflow as createWorkflowRecord,
  createWorkflowExecution,
  getWorkflowById as getWorkflowByIdRecord,
  getWorkflowByName,
  listWorkflowExecutions as listWorkflowExecutionsRecord,
  listWorkflows as listWorkflowsRecord,
  updateWorkflow as updateWorkflowRecord
} from "../repositories/workflows.repository.js";

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

export class WorkflowNotFoundError extends Error {
  constructor() {
    super("Workflow not found");
    this.name = "WorkflowNotFoundError";
  }
}

function normalizeSteps(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((step, index) => ({
    ...step,
    id: step.id?.trim() || `step-${index + 1}`,
    name: step.name.trim(),
    agentId: step.agentId.trim(),
    agentName: step.agentName.trim(),
    order: index + 1,
    timeoutSeconds: Math.max(1, Number(step.timeoutSeconds) || 60),
    onFailure: step.onFailure === "continue" ? "continue" : "stop"
  }));
}

function assertWorkflowStatus(status: WorkflowStatus): void {
  if (!["draft", "active", "archived"].includes(status)) {
    throw new WorkflowValidationError("Workflow status must be draft, active, or archived");
  }
}

function validateWorkflowInput(input: CreateWorkflowInput | UpdateWorkflowInput): void {
  if ("name" in input && typeof input.name === "string" && !input.name.trim()) {
    throw new WorkflowValidationError("Workflow name is required");
  }

  if (input.status) {
    assertWorkflowStatus(input.status);
  }

  if (input.steps) {
    if (!Array.isArray(input.steps) || input.steps.length === 0) {
      throw new WorkflowValidationError("Workflow must contain at least one step");
    }

    input.steps.forEach((step, index) => {
      if (!step.name?.trim()) {
        throw new WorkflowValidationError(`Step ${index + 1} name is required`);
      }

      if (!step.agentId?.trim() || !step.agentName?.trim()) {
        throw new WorkflowValidationError(`Step ${index + 1} must select an agent`);
      }
    });
  }
}

export async function listWorkflowsService(): Promise<Workflow[]> {
  return listWorkflowsRecord();
}

export async function getWorkflowByIdService(id: string): Promise<Workflow | undefined> {
  return getWorkflowByIdRecord(id);
}

export async function createWorkflowService(input: CreateWorkflowInput): Promise<Workflow> {
  validateWorkflowInput(input);

  const duplicated = await getWorkflowByName(input.name);
  if (duplicated) {
    throw new WorkflowValidationError("Workflow name already exists");
  }

  return createWorkflowRecord({
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    steps: normalizeSteps(input.steps)
  });
}

export async function updateWorkflowService(id: string, input: UpdateWorkflowInput): Promise<Workflow | undefined> {
  const current = await getWorkflowByIdRecord(id);
  if (!current) {
    return undefined;
  }

  if (current.status === "archived") {
    throw new WorkflowValidationError("Archived workflows cannot be edited");
  }

  validateWorkflowInput(input);

  if (input.name && input.name.trim().toLowerCase() !== current.name.toLowerCase()) {
    const duplicated = await getWorkflowByName(input.name);
    if (duplicated) {
      throw new WorkflowValidationError("Workflow name already exists");
    }
  }

  return updateWorkflowRecord(id, {
    ...input,
    name: typeof input.name === "string" ? input.name.trim() : undefined,
    description: typeof input.description === "string" ? input.description.trim() : undefined,
    steps: input.steps ? normalizeSteps(input.steps) : undefined
  });
}

export async function executeWorkflowService(id: string): Promise<WorkflowExecution> {
  const workflow = await getWorkflowByIdRecord(id);

  if (!workflow) {
    throw new WorkflowNotFoundError();
  }

  if (workflow.status !== "active") {
    throw new WorkflowValidationError("Only active workflows can be executed");
  }

  const now = new Date();
  const logs: WorkflowExecutionLogEntry[] = workflow.steps.map((step, index) => {
    const startedAt = new Date(now.getTime() + index * 100);
    const finishedAt = new Date(startedAt.getTime() + 120);

    return {
      stepId: step.id,
      stepName: step.name,
      agentName: step.agentName,
      status: "success",
      message: `Step ${step.order} completed by ${step.agentName}`,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString()
    };
  });

  return createWorkflowExecution(workflow, "success", logs);
}

export async function listWorkflowExecutionsService(workflowId: string): Promise<WorkflowExecution[]> {
  const workflow = await getWorkflowByIdRecord(workflowId);

  if (!workflow) {
    throw new WorkflowNotFoundError();
  }

  return listWorkflowExecutionsRecord(workflowId);
}
