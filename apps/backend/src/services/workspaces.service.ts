import {
  WORKSPACE_RESOURCE_PROFILES,
  type CreateWorkspaceInput,
  type FailWorkspaceInput,
  type UpdateWorkspaceInput,
  type Workspace,
  type WorkspaceResourceProfile,
  type WorkspaceValidationIssue
} from "@ai-agent-platform/shared";

import {
  applyFailedRuntimeState,
  applyProvisioningRuntimeState,
  applyRunningRuntimeState,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceById,
  getWorkspaceByName,
  listWorkspaces,
  transitionWorkspace,
  updateWorkspace
} from "../repositories/workspaces.repository.js";

export class WorkspaceValidationError extends Error {
  constructor(public readonly details: WorkspaceValidationIssue[]) {
    super("Validation failed");
    this.name = "WorkspaceValidationError";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor() {
    super("Workspace not found");
    this.name = "WorkspaceNotFoundError";
  }
}

export function listWorkspacesService(): Promise<Workspace[]> {
  return listWorkspaces();
}

export async function getWorkspaceByIdService(id: string): Promise<Workspace> {
  const workspace = await getWorkspaceById(id);

  if (!workspace) {
    throw new WorkspaceNotFoundError();
  }

  return workspace;
}

export async function createWorkspaceService(
  input: Partial<CreateWorkspaceInput>,
  ownerName = "Workspace Team"
): Promise<Workspace> {
  await assertValidWorkspaceInput(input, "create");
  return createWorkspace(input as CreateWorkspaceInput, ownerName);
}

export async function updateWorkspaceService(
  id: string,
  input: Partial<UpdateWorkspaceInput>
): Promise<Workspace> {
  await assertValidWorkspaceInput(input, "update", id);
  const workspace = await updateWorkspace(id, input);

  if (!workspace) {
    throw new WorkspaceNotFoundError();
  }

  return workspace;
}

export async function deleteWorkspaceService(id: string): Promise<Workspace> {
  const deletedWorkspace = await deleteWorkspace(id);

  if (!deletedWorkspace) {
    throw new WorkspaceNotFoundError();
  }

  return deletedWorkspace;
}

export function startWorkspaceService(id: string): Promise<Workspace> {
  return transitionOrThrow(id, "RUNNING", applyRunningRuntimeState);
}

export function stopWorkspaceService(id: string): Promise<Workspace> {
  return transitionOrThrow(id, "STOPPED");
}

export function restartWorkspaceService(id: string): Promise<Workspace> {
  return transitionOrThrow(id, "PROVISIONING", applyProvisioningRuntimeState);
}

export function retryWorkspaceService(id: string): Promise<Workspace> {
  return transitionOrThrow(id, "PROVISIONING", applyProvisioningRuntimeState);
}

export function completeWorkspaceProvisioningService(id: string): Promise<Workspace> {
  return transitionOrThrow(id, "RUNNING", applyRunningRuntimeState);
}

export function failWorkspaceService(
  id: string,
  input: FailWorkspaceInput = {}
): Promise<Workspace> {
  return transitionOrThrow(id, "FAILED", (workspace) => applyFailedRuntimeState(workspace, input));
}

async function assertValidWorkspaceInput(
  input: Partial<CreateWorkspaceInput | UpdateWorkspaceInput>,
  mode: "create" | "update",
  currentWorkspaceId?: string
) {
  const issues: WorkspaceValidationIssue[] = [];
  const name = input.name?.trim();
  const templateId = input.templateId?.trim();

  if (mode === "create" && !name) {
    issues.push({ field: "name", message: "Workspace name is required." });
  }

  if (name && name.length < 3) {
    issues.push({ field: "name", message: "Workspace name must contain at least 3 characters." });
  }

  if (name && await getWorkspaceByName(name, currentWorkspaceId)) {
    issues.push({ field: "name", message: "Workspace name already exists." });
  }

  if (mode === "create" && !templateId) {
    issues.push({ field: "templateId", message: "Workspace template is required." });
  }

  if (
    (mode === "create" || input.resourceProfile !== undefined) &&
    !isWorkspaceResourceProfile(input.resourceProfile)
  ) {
    issues.push({ field: "resourceProfile", message: "Workspace resource profile is invalid." });
  }

  if (issues.length > 0) {
    throw new WorkspaceValidationError(issues);
  }
}

async function transitionOrThrow(
  id: string,
  status: Workspace["status"],
  patch?: (workspace: Workspace) => void
): Promise<Workspace> {
  const workspace = await transitionWorkspace(id, status, patch);

  if (!workspace) {
    throw new WorkspaceNotFoundError();
  }

  return workspace;
}

function isWorkspaceResourceProfile(value: unknown): value is WorkspaceResourceProfile {
  return typeof value === "string" && WORKSPACE_RESOURCE_PROFILES.includes(value as WorkspaceResourceProfile);
}
