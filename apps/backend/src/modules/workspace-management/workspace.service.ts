import { randomUUID } from "node:crypto";

import type {
  CreateWorkspaceRequest,
  FailWorkspaceRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceResourceProfile,
  WorkspaceStatus,
  WorkspaceValidationError
} from "./workspace.types.js";

const seedTimestamp = new Date().toISOString();

const workspaces: Workspace[] = [
  {
    id: "ws-sales-ops",
    name: "Sales Operation Workspace",
    description: "Workspace ho tro van hanh phong Sales.",
    ownerName: "Workspace Team",
    status: "RUNNING",
    config: {
      templateId: "business-operations",
      resourceProfile: "Standard",
      region: "ap-southeast-1"
    },
    accessUrl: "https://sales-ops.workspace.local",
    containerId: "ctr-sales-ops-001",
    openClawInstanceId: "oc-sales-ops-001",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: "ws-hr-automation",
    name: "HR Automation Workspace",
    description: "Workspace dung de theo doi quy trinh nhan su.",
    ownerName: "Workspace Team",
    status: "PROVISIONING",
    config: {
      templateId: "hr-automation",
      resourceProfile: "Starter",
      region: "ap-southeast-1"
    },
    containerId: "ctr-hr-auto-001",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: "ws-finance-failed",
    name: "Finance Review Workspace",
    description: "Workspace minh hoa trang thai provisioning that bai.",
    ownerName: "Workspace Team",
    status: "FAILED",
    config: {
      templateId: "finance-review",
      resourceProfile: "Performance",
      region: "ap-southeast-1"
    },
    failureReason: "Khong the khoi tao OpenClaw instance trong thoi gian cho phep.",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: "ws-support-stopped",
    name: "Support Sandbox Workspace",
    description: "Workspace da dung de test start/restart.",
    ownerName: "Workspace Team",
    status: "STOPPED",
    config: {
      templateId: "business-operations",
      resourceProfile: "Starter",
      region: "ap-southeast-1"
    },
    containerId: "ctr-support-001",
    openClawInstanceId: "oc-support-001",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  }
];

const validResourceProfiles: WorkspaceResourceProfile[] = ["Starter", "Standard", "Performance"];

export function listWorkspaces() {
  return [...workspaces].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getWorkspaceById(workspaceId: string) {
  return workspaces.find((workspace) => workspace.id === workspaceId);
}

export function validateCreateWorkspaceRequest(request: Partial<CreateWorkspaceRequest>) {
  return validateWorkspacePayload(request, "create");
}

export function validateUpdateWorkspaceRequest(request: Partial<UpdateWorkspaceRequest>, workspaceId: string) {
  return validateWorkspacePayload(request, "update", workspaceId);
}

export function createWorkspace(request: CreateWorkspaceRequest) {
  const createdAt = new Date().toISOString();
  const workspace: Workspace = {
    id: `ws-${randomUUID()}`,
    name: request.name.trim(),
    description: request.description?.trim() ?? "",
    ownerName: "Workspace Team",
    status: "PROVISIONING",
    config: {
      templateId: request.templateId,
      resourceProfile: request.resourceProfile,
      region: request.region ?? "ap-southeast-1"
    },
    containerId: `ctr-${randomUUID()}`,
    createdAt,
    updatedAt: createdAt
  };

  workspaces.unshift(workspace);
  return workspace;
}

export function updateWorkspace(workspaceId: string, request: UpdateWorkspaceRequest) {
  const workspace = getWorkspaceById(workspaceId);

  if (!workspace) {
    return undefined;
  }

  workspace.name = request.name?.trim() ?? workspace.name;
  workspace.description = request.description?.trim() ?? workspace.description;
  workspace.config = {
    templateId: request.templateId ?? workspace.config.templateId,
    resourceProfile: request.resourceProfile ?? workspace.config.resourceProfile,
    region: request.region ?? workspace.config.region
  };
  touch(workspace);

  return workspace;
}

export function deleteWorkspace(workspaceId: string) {
  const index = workspaces.findIndex((workspace) => workspace.id === workspaceId);

  if (index === -1) {
    return false;
  }

  workspaces.splice(index, 1);
  return true;
}

export function startWorkspace(workspaceId: string) {
  return transitionWorkspace(workspaceId, "RUNNING", (workspace) => {
    workspace.failureReason = undefined;
    workspace.containerId ??= `ctr-${randomUUID()}`;
    workspace.openClawInstanceId ??= `oc-${randomUUID()}`;
    workspace.accessUrl = `https://${slugify(workspace.name)}.workspace.local`;
  });
}

export function stopWorkspace(workspaceId: string) {
  return transitionWorkspace(workspaceId, "STOPPED");
}

export function restartWorkspace(workspaceId: string) {
  return transitionWorkspace(workspaceId, "PROVISIONING", (workspace) => {
    workspace.failureReason = undefined;
    workspace.accessUrl = undefined;
  });
}

export function retryWorkspace(workspaceId: string) {
  return transitionWorkspace(workspaceId, "PROVISIONING", (workspace) => {
    workspace.failureReason = undefined;
    workspace.containerId ??= `ctr-${randomUUID()}`;
  });
}

export function completeProvisioning(workspaceId: string) {
  return transitionWorkspace(workspaceId, "RUNNING", (workspace) => {
    workspace.failureReason = undefined;
    workspace.containerId ??= `ctr-${randomUUID()}`;
    workspace.openClawInstanceId = `oc-${randomUUID()}`;
    workspace.accessUrl = `https://${slugify(workspace.name)}.workspace.local`;
  });
}

export function failWorkspace(workspaceId: string, request: FailWorkspaceRequest = {}) {
  return transitionWorkspace(workspaceId, "FAILED", (workspace) => {
    workspace.accessUrl = undefined;
    workspace.failureReason =
      request.reason?.trim() || "Provisioning failed while starting the OpenClaw instance.";
  });
}

function validateWorkspacePayload(
  request: Partial<CreateWorkspaceRequest | UpdateWorkspaceRequest>,
  mode: "create" | "update",
  currentWorkspaceId?: string
) {
  const errors: WorkspaceValidationError[] = [];
  const name = request.name?.trim();
  const templateId = request.templateId?.trim();

  if (mode === "create" && !name) {
    errors.push({
      field: "name",
      message: "Ten workspace khong duoc de trong."
    });
  }

  if (name && name.length < 3) {
    errors.push({
      field: "name",
      message: "Ten workspace can co it nhat 3 ky tu."
    });
  }

  if (
    name &&
    workspaces.some(
      (workspace) =>
        workspace.id !== currentWorkspaceId && workspace.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    errors.push({
      field: "name",
      message: "Ten workspace da ton tai."
    });
  }

  if (mode === "create" && !templateId) {
    errors.push({
      field: "templateId",
      message: "Vui long chon template cho workspace."
    });
  }

  if (
    (mode === "create" || request.resourceProfile !== undefined) &&
    (!request.resourceProfile || !validResourceProfiles.includes(request.resourceProfile))
  ) {
    errors.push({
      field: "resourceProfile",
      message: "Vui long chon resource profile hop le."
    });
  }

  return errors;
}

function transitionWorkspace(
  workspaceId: string,
  status: WorkspaceStatus,
  applyRuntimeChanges?: (workspace: Workspace) => void
) {
  const workspace = getWorkspaceById(workspaceId);

  if (!workspace) {
    return undefined;
  }

  workspace.status = status;
  applyRuntimeChanges?.(workspace);
  touch(workspace);

  return workspace;
}

function touch(workspace: Workspace) {
  workspace.updatedAt = new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
