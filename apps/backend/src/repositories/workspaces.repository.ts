import type {
  CreateWorkspaceInput,
  FailWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceStatus
} from "@ai-agent-platform/shared";

import { createUuid, db } from "../db/knex.js";

type WorkspaceRow = {
  id: string;
  name: string;
  description: string;
  owner_name: string;
  status: WorkspaceStatus;
  template_id: string;
  resource_profile: Workspace["config"]["resourceProfile"];
  region: string;
  access_url: string | null;
  container_id: string | null;
  openclaw_instance_id: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapRowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerName: row.owner_name,
    status: row.status,
    config: {
      templateId: row.template_id,
      resourceProfile: row.resource_profile,
      region: row.region
    },
    accessUrl: row.access_url ?? undefined,
    containerId: row.container_id ?? undefined,
    openClawInstanceId: row.openclaw_instance_id ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const rows = await db<WorkspaceRow>("workspaces")
    .select("*")
    .orderBy("updated_at", "desc");

  return rows.map(mapRowToWorkspace);
}

export async function getWorkspaceById(id: string): Promise<Workspace | undefined> {
  if (!UUID_REGEX.test(id)) {
    return undefined;
  }

  const row = await db<WorkspaceRow>("workspaces")
    .select("*")
    .where({ id })
    .first();

  return row ? mapRowToWorkspace(row) : undefined;
}

export async function getWorkspaceByName(
  name: string,
  ignoredWorkspaceId?: string
): Promise<Workspace | undefined> {
  const query = db<WorkspaceRow>("workspaces")
    .select("*")
    .whereRaw("lower(name) = lower(?)", [name.trim()]);

  if (ignoredWorkspaceId && UUID_REGEX.test(ignoredWorkspaceId)) {
    query.whereNot({ id: ignoredWorkspaceId });
  }

  const row = await query.first();
  return row ? mapRowToWorkspace(row) : undefined;
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
  ownerName = "Workspace Team"
): Promise<Workspace> {
  const now = new Date();
  const row: WorkspaceRow = {
    id: createUuid(),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    owner_name: ownerName.trim() || "Workspace Team",
    status: "PROVISIONING",
    template_id: input.templateId,
    resource_profile: input.resourceProfile,
    region: input.region?.trim() || "ap-southeast-1",
    access_url: null,
    container_id: `ctr-${createUuid()}`,
    openclaw_instance_id: null,
    failure_reason: null,
    created_at: now,
    updated_at: now
  };

  await db<WorkspaceRow>("workspaces").insert(row);
  return mapRowToWorkspace(row);
}

export async function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput
): Promise<Workspace | undefined> {
  const current = await getWorkspaceById(id);

  if (!current) {
    return undefined;
  }

  const updates: Partial<WorkspaceRow> = {
    updated_at: new Date()
  };

  if (typeof input.name === "string") {
    updates.name = input.name.trim();
  }

  if (typeof input.description === "string") {
    updates.description = input.description.trim();
  }

  if (typeof input.templateId === "string") {
    updates.template_id = input.templateId;
  }

  if (input.resourceProfile) {
    updates.resource_profile = input.resourceProfile;
  }

  if (typeof input.region === "string") {
    updates.region = input.region.trim() || current.config.region;
  }

  await db<WorkspaceRow>("workspaces").where({ id }).update(updates);
  return getWorkspaceById(id);
}

export async function deleteWorkspace(id: string): Promise<Workspace | undefined> {
  const current = await getWorkspaceById(id);

  if (!current) {
    return undefined;
  }

  await db<WorkspaceRow>("workspaces").where({ id }).delete();
  return current;
}

export async function transitionWorkspace(
  id: string,
  status: WorkspaceStatus,
  patch?: (workspace: Workspace) => void
): Promise<Workspace | undefined> {
  const current = await getWorkspaceById(id);

  if (!current) {
    return undefined;
  }

  const next: Workspace = {
    ...current,
    status
  };
  patch?.(next);

  await db<WorkspaceRow>("workspaces")
    .where({ id })
    .update({
      status: next.status,
      access_url: next.accessUrl ?? null,
      container_id: next.containerId ?? null,
      openclaw_instance_id: next.openClawInstanceId ?? null,
      failure_reason: next.failureReason ?? null,
      updated_at: new Date()
    });

  return getWorkspaceById(id);
}

export function applyFailedRuntimeState(workspace: Workspace, input: FailWorkspaceInput = {}) {
  workspace.accessUrl = undefined;
  workspace.failureReason = input.reason?.trim() || "Provisioning failed while starting the OpenClaw instance.";
}

export function applyRunningRuntimeState(workspace: Workspace) {
  workspace.failureReason = undefined;
  workspace.containerId ??= `ctr-${createUuid()}`;
  workspace.openClawInstanceId ??= `oc-${createUuid()}`;
  workspace.accessUrl = `https://${slugify(workspace.name)}.workspace.local`;
}

export function applyProvisioningRuntimeState(workspace: Workspace) {
  workspace.failureReason = undefined;
  workspace.accessUrl = undefined;
  workspace.containerId ??= `ctr-${createUuid()}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
