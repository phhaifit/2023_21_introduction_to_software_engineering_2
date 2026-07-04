import type {
  CreateWorkspaceInput,
  FailWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceAction,
  WorkspaceValidationIssue
} from "@ai-agent-platform/shared";

const API_BASE_URL = "/api";

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: WorkspaceValidationIssue[];
}

export class WorkspaceApiValidationError extends Error {
  constructor(public readonly details: WorkspaceValidationIssue[]) {
    super("Validation failed");
    this.name = "WorkspaceApiValidationError";
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: init?.body
      ? {
          "Content-Type": "application/json",
          ...(init.headers ?? {})
        }
      : init?.headers,
    ...init
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

  if (!response.ok) {
    if (body.details?.length) {
      throw new WorkspaceApiValidationError(body.details);
    }

    throw new Error(body.error || body.message || "Request failed.");
  }

  return body as T;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const response = await requestJson<ApiDataResponse<Workspace[]>>("/workspaces");
  return response.data;
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const response = await requestJson<ApiDataResponse<Workspace>>("/workspaces", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return response.data;
}

export async function updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
  const response = await requestJson<ApiDataResponse<Workspace>>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return response.data;
}

export function deleteWorkspace(id: string): Promise<void> {
  return requestJson<void>(`/workspaces/${id}`, {
    method: "DELETE"
  });
}

export async function runWorkspaceAction(
  id: string,
  action: WorkspaceAction,
  input?: FailWorkspaceInput
): Promise<Workspace> {
  const response = await requestJson<ApiDataResponse<Workspace>>(`/workspaces/${id}/${action}`, {
    method: "POST",
    body: input ? JSON.stringify(input) : undefined
  });
  return response.data;
}
