import type { CreateWorkflowInput, UpdateWorkflowInput, Workflow, WorkflowExecution } from "@ai-agent-platform/shared";

import { getAccessToken } from "../../authentication/utils/token-storage";
import { getActiveWorkspaceId } from "../../workspace-management/api/workspaceContext";

const API_BASE_URL = "/api";

function buildRequestHeaders(init?: RequestInit): HeadersInit {
  const accessToken = getAccessToken();
  const activeWorkspaceId = getActiveWorkspaceId();

  return {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(activeWorkspaceId
      ? {
          "X-Workspace-Id": activeWorkspaceId,
          "X-Workspace-Role": "member"
        }
      : {}),
    ...(init?.headers ?? {})
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildRequestHeaders(init)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(typeof errorBody.message === "string" ? errorBody.message : "Request failed");
  }

  return response.json() as Promise<T>;
}

export function listWorkflows(): Promise<Workflow[]> {
  return requestJson<Workflow[]>("/workflows");
}

export function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  return requestJson<Workflow>("/workflows", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<Workflow> {
  return requestJson<Workflow>(`/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function executeWorkflow(id: string): Promise<WorkflowExecution> {
  return requestJson<WorkflowExecution>(`/workflows/${id}/execute`, {
    method: "POST"
  });
}

export function listWorkflowExecutions(id: string): Promise<WorkflowExecution[]> {
  return requestJson<WorkflowExecution[]>(`/workflows/${id}/executions`);
}
