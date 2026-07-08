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
  skill_file_content: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type AgentListSortBy = "name" | "role" | "model";

export type ListAgentsQuery = {
  page: number;
  pageSize: number;
  sortBy: AgentListSortBy;
  sortOrder: "asc" | "desc";
  model?: string;
  search?: string;
};

export type ListAgentsResult = {
  items: Agent[];
  total: number;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "agent";
}

function buildAgentDirectoryPath(workspaceId: string, agentName: string): string {
  return `agents/${workspaceId}/${slugify(agentName)}`;
}

function buildSkillFileContent(input: {
  name: string;
  role: string;
  model: string;
  instructionContent: string;
}): string {
  return [
    "# skill.md",
    "",
    "## Agent",
    `- Name: ${input.name}`,
    `- Role: ${input.role}`,
    `- Model: ${input.model}`,
    "",
    "## Instructions",
    input.instructionContent
  ].join("\n");
}

function resolveSkillFileContent(
  providedSkillFileContent: string | undefined,
  fallbackInput: {
    name: string;
    role: string;
    model: string;
    instructionContent: string;
  },
  existingSkillFileContent?: string
): string {
  if (typeof providedSkillFileContent === "string" && providedSkillFileContent.trim()) {
    return providedSkillFileContent.trim();
  }

  if (typeof existingSkillFileContent === "string" && existingSkillFileContent.trim()) {
    return existingSkillFileContent;
  }

  return buildSkillFileContent(fallbackInput);
}

function mapRowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    model: row.model,
    instructionContent: row.instruction_content,
    skillFileContent: row.skill_file_content,
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

export async function listAgentsWithQuery(
  workspaceId: string,
  query: ListAgentsQuery
): Promise<ListAgentsResult> {
  const offset = (query.page - 1) * query.pageSize;

  const baseQuery = db<AgentRow>("agents").where({ workspace_id: workspaceId });

  if (query.model) {
    baseQuery.whereRaw("lower(model) = lower(?)", [query.model]);
  }

  if (query.search) {
    baseQuery.whereILike("name", `%${query.search}%`);
  }

  const sortColumnByField: Record<AgentListSortBy, keyof AgentRow> = {
    name: "name",
    role: "role",
    model: "model"
  };

  const rows = await baseQuery
    .clone()
    .select("*")
    .orderBy(sortColumnByField[query.sortBy], query.sortOrder)
    .orderBy("created_at", "desc")
    .offset(offset)
    .limit(query.pageSize);

  const countRow = await baseQuery
    .clone()
    .count<{ count: string }>("id as count")
    .first();

  return {
    items: rows.map(mapRowToAgent),
    total: Number(countRow?.count ?? 0)
  };
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
  const directoryPath = buildAgentDirectoryPath(workspaceId, input.name);
  const row: AgentRow = {
    id: createUuid(),
    workspace_id: workspaceId,
    name: input.name,
    role: input.role,
    model: input.model,
    instruction_content: input.instructionContent,
    status: input.status,
    directory_path: directoryPath,
    skill_file_path: `${directoryPath}/skill.md`,
    skill_file_content: resolveSkillFileContent(input.skillFileContent, input),
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
  const currentRow = await db<AgentRow>("agents")
    .select("*")
    .where({ id, workspace_id: workspaceId })
    .first();

  if (!currentRow) {
    return undefined;
  }

  const current = mapRowToAgent(currentRow);

  const nextName = typeof input.name === "string" ? input.name.trim() : currentRow.name;
  const nextRole = typeof input.role === "string" ? input.role.trim() : currentRow.role;
  const nextModel = typeof input.model === "string" ? input.model.trim() : currentRow.model;
  const nextInstructionContent =
    typeof input.instructionContent === "string"
      ? input.instructionContent.trim()
      : currentRow.instruction_content;
  const directoryPath = buildAgentDirectoryPath(workspaceId, nextName);

  const updates: Partial<AgentRow> = {
    updated_at: new Date(),
    updated_by_user_id: actorUserId,
    directory_path: directoryPath,
    skill_file_path: `${directoryPath}/skill.md`,
    skill_file_content: resolveSkillFileContent(
      input.skillFileContent,
      {
        name: nextName,
        role: nextRole,
        model: nextModel,
        instructionContent: nextInstructionContent
      },
      currentRow.skill_file_content
    )
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