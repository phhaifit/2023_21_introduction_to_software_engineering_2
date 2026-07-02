export type WorkflowStatus = "draft" | "active" | "archived";
export type WorkflowExecutionStatus = "pending" | "running" | "success" | "failed";
export type WorkflowStepFailurePolicy = "stop" | "continue";

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  order: number;
  timeoutSeconds: number;
  onFailure: WorkflowStepFailurePolicy;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  executionCount: number;
}

export interface CreateWorkflowInput {
  name: string;
  description: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  steps?: WorkflowStep[];
}

export interface WorkflowExecutionLogEntry {
  stepId: string;
  stepName: string;
  agentName: string;
  status: WorkflowExecutionStatus;
  message: string;
  startedAt: string;
  finishedAt?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowExecutionStatus;
  triggerSource: "manual" | "system";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  logs: WorkflowExecutionLogEntry[];
}

export interface WorkflowListFilters {
  status?: WorkflowStatus | "all";
  search?: string;
}

export const WORKFLOW_STATUSES: WorkflowStatus[] = ["draft", "active", "archived"];
