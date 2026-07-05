import type { Agent, CreateAgentInput, UpdateAgentInput, Workspace } from "@ai-agent-platform/shared";

import { getAccessToken } from "../../authentication/utils/token-storage";
import { getActiveWorkspaceId } from "../../workspace-management/api/workspaceContext";

interface ApiDataResponse<T> {
  data: T;
}

interface WorkspaceListResponse {
  data: Workspace[];
}

interface ApiErrorBody {
  error?: string;
  message?: string;
}

interface AgentRequestContext {
  accessToken: string;
  workspaceId: string;
}

export type WorkspaceAccessRole = "admin" | "member" | "viewer";

export class AgentApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AgentApiError";
  }
}

const API_BASE_URL = "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(init?.headers ?? {})
    },
    ...init
  });

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody | T;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new AgentApiError(errorBody.error || errorBody.message || "Request failed.", response.status);
  }

  return body as T;
}

async function resolveRunningWorkspaceId(accessToken: string): Promise<string> {
  const response = await requestJson<WorkspaceListResponse>("/workspaces", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const runningWorkspaces = response.data.filter((item) => item.status === "RUNNING");
  const activeWorkspaceId = getActiveWorkspaceId();
  const activeWorkspace = runningWorkspaces.find((workspace) => workspace.id === activeWorkspaceId);

  if (activeWorkspace) {
    return activeWorkspace.id;
  }

  for (const workspace of runningWorkspaces) {
    try {
      const agents = await requestJson<Agent[]>("/agents", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Workspace-Id": workspace.id,
          "X-Workspace-Role": "member"
        }
      });

      if (agents.length > 0) {
        return workspace.id;
      }
    } catch {
      // Ignore per-workspace list failures here and continue scanning running workspaces.
    }
  }

  const workspace = runningWorkspaces[0];

  if (!workspace) {
    throw new Error("No running workspace found. Please start a workspace first.");
  }

  return workspace.id;
}

async function resolveAgentRequestContext(): Promise<AgentRequestContext> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("You are not authenticated.");
  }

  const workspaceId = await resolveRunningWorkspaceId(accessToken);

  return { accessToken, workspaceId };
}

function buildWorkspaceHeaders(context: AgentRequestContext, role: WorkspaceAccessRole): HeadersInit {
  return {
    Authorization: `Bearer ${context.accessToken}`,
    "X-Workspace-Id": context.workspaceId,
    "X-Workspace-Role": role
  };
}

export async function detectAgentWorkspaceRole(): Promise<WorkspaceAccessRole> {
  const context = await resolveAgentRequestContext();
  const roles: WorkspaceAccessRole[] = ["admin", "member", "viewer"];

  for (const role of roles) {
    try {
      await requestJson<Agent[]>("/agents", {
        method: "GET",
        headers: buildWorkspaceHeaders(context, role)
      });

      return role;
    } catch (error) {
      if (error instanceof AgentApiError && error.status === 403) {
        continue;
      }

      throw error;
    }
  }

  throw new AgentApiError("No accessible workspace role found for Agent Management.", 403);
}

export async function listAgents(role: WorkspaceAccessRole = "member"): Promise<Agent[]> {
  const { accessToken, workspaceId } = await resolveAgentRequestContext();

  return requestJson<Agent[]>("/agents", {
    method: "GET",
    headers: buildWorkspaceHeaders({ accessToken, workspaceId }, role)
  });
}

export async function getAgent(id: string, role: WorkspaceAccessRole = "member"): Promise<Agent> {
  const { accessToken, workspaceId } = await resolveAgentRequestContext();

  return requestJson<Agent>(`/agents/${id}`, {
    method: "GET",
    headers: buildWorkspaceHeaders({ accessToken, workspaceId }, role)
  });
}

export async function createAgent(input: CreateAgentInput, role: WorkspaceAccessRole = "member"): Promise<Agent> {
  const { accessToken, workspaceId } = await resolveAgentRequestContext();

  return requestJson<Agent>("/agents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildWorkspaceHeaders({ accessToken, workspaceId }, role)
    },
    body: JSON.stringify(input)
  });
}

export async function updateAgent(
  id: string,
  input: UpdateAgentInput,
  role: WorkspaceAccessRole = "member"
): Promise<Agent> {
  const { accessToken, workspaceId } = await resolveAgentRequestContext();

  return requestJson<Agent>(`/agents/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildWorkspaceHeaders({ accessToken, workspaceId }, role)
    },
    body: JSON.stringify(input)
  });
}

export async function deleteAgent(id: string, role: WorkspaceAccessRole = "admin"): Promise<Agent> {
  const { accessToken, workspaceId } = await resolveAgentRequestContext();

  return requestJson<Agent>(`/agents/${id}`, {
    method: "DELETE",
    headers: buildWorkspaceHeaders({ accessToken, workspaceId }, role)
  });
}
