import type { Agent, CreateAgentInput, UpdateAgentInput } from "@ai-agent-platform/shared";

import { createUuid, db } from "../db/knex.js";

type AgentRow = {
  id: string;
  workspace_id: string;
  name: string;
  role: string;
  model: string;
  instruction_content: string;
  status: Agent["status"];
  directory_path: string | null;
  skill_file_path: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapRowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    model: row.model,
    instructionContent: row.instruction_content,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listAgents(workspaceId: string): Promise<Agent[]> {
  const rows = await db<AgentRow>("agents")
    .select("*")
    .where({ workspace_id: workspaceId })
    .orderBy("created_at", "desc");

  return rows.map(mapRowToAgent);
}

export async function getAgentById(workspaceId: string, id: string): Promise<Agent | undefined> {
  const row = await db<AgentRow>("agents")
    .select("*")
    .where({ id, workspace_id: workspaceId })
    .first();

  return row ? mapRowToAgent(row) : undefined;
}

export async function countAgentsByWorkspace(workspaceId: string): Promise<number> {
  const row = await db<AgentRow>("agents")
    .where({ workspace_id: workspaceId })
    .count<{ count: string }>("id as count")
    .first();

  return Number(row?.count ?? 0);
}

export async function getAgentByName(workspaceId: string, name: string): Promise<Agent | undefined> {
  const row = await db<AgentRow>("agents")
    .select("*")
    .where({ workspace_id: workspaceId })
    .whereRaw("lower(name) = lower(?)", [name.trim()])
    .first();

  return row ? mapRowToAgent(row) : undefined;
}

export async function createAgent(
  workspaceId: string,
  input: CreateAgentInput,
  actorUserId: string
): Promise<Agent> {
  const now = new Date();
  const row: AgentRow = {
    id: createUuid(),
    workspace_id: workspaceId,
    name: input.name,
    role: input.role,
    model: input.model,
    instruction_content: input.instructionContent,
    status: input.status,
    directory_path: null,
    skill_file_path: null,
    created_by_user_id: actorUserId,
    updated_by_user_id: actorUserId,
    created_at: now,
    updated_at: now
  };

  await db<AgentRow>("agents").insert(row);
  return mapRowToAgent(row);
}

export async function updateAgent(
  workspaceId: string,
  id: string,
  input: UpdateAgentInput,
  actorUserId: string
): Promise<Agent | undefined> {
  const current = await getAgentById(workspaceId, id);

  if (!current) {
    return undefined;
  }

  const updates: Partial<AgentRow> = {
    updated_at: new Date(),
    updated_by_user_id: actorUserId
  };

  if (typeof input.name === "string") {
    updates.name = input.name.trim();
  }

  if (typeof input.role === "string") {
    updates.role = input.role.trim();
  }

  if (typeof input.model === "string") {
    updates.model = input.model.trim();
  }

  if (typeof input.instructionContent === "string") {
    updates.instruction_content = input.instructionContent.trim();
  }

  if (input.status) {
    updates.status = input.status;
  }

  await db<AgentRow>("agents")
    .where({ id, workspace_id: workspaceId })
    .update(updates);

  const updated = await getAgentById(workspaceId, id);
  return updated ?? current;
}

export async function deleteAgent(workspaceId: string, id: string): Promise<Agent | undefined> {
  const current = await getAgentById(workspaceId, id);

  if (!current) {
    return undefined;
  }

  await db<AgentRow>("agents")
    .where({ id, workspace_id: workspaceId })
    .delete();

  return current;
}