import type { Agent, AgentStatus, CreateAgentInput, UpdateAgentInput } from "@ai-agent-platform/shared";
import type { Workspace } from "@ai-agent-platform/shared";

import {
  createAgent as createAgentRecord,
  countAgentsByWorkspace,
  deleteAgent as deleteAgentRecord,
  getAgentWorkspaceSummary,
  getAgentById as getAgentByIdRecord,
  getAgentByName,
  listAgents as listAgentsRecord,
  listAgentsWithQuery,
  type AgentWorkspaceSummary,
  type AgentListSortBy,
  type ListAgentsResult,
  updateAgent as updateAgentRecord
} from "../repositories/agents.repository.js";
import { getWorkspaceById } from "../repositories/workspaces.repository.js";

const AGENT_NAME_PATTERN = /^[A-Za-z0-9-]+$/;

const AGENT_LIMITS_BY_PROFILE: Record<Workspace["config"]["resourceProfile"], number> = {
  Starter: Number(process.env.AGENT_LIMIT_STARTER ?? 5),
  Standard: Number(process.env.AGENT_LIMIT_STANDARD ?? 20),
  Performance: Number(process.env.AGENT_LIMIT_PERFORMANCE ?? 20)
};

export type ListAgentsQueryInput = {
  page?: number;
  pageSize?: number;
  sortBy?: AgentListSortBy;
  sortOrder?: "asc" | "desc";
  model?: string;
  search?: string;
  status?: AgentStatus;
};

export type ListAgentsQuery = {
  page: number;
  pageSize: number;
  sortBy: AgentListSortBy;
  sortOrder: "asc" | "desc";
  model?: string;
  search?: string;
  status?: AgentStatus;
};

const DEFAULT_LIST_QUERY: ListAgentsQuery = {
  page: 1,
  pageSize: 20,
  sortBy: "name",
  sortOrder: "asc"
};

const MAX_PAGE_SIZE = 100;

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

export class AgentNotFoundError extends Error {
  constructor() {
    super("Agent not found");
    this.name = "AgentNotFoundError";
  }
}

export class AgentQuotaExceededError extends Error {
  constructor() {
    super("Agent quota exceeded for this workspace plan.");
    this.name = "AgentQuotaExceededError";
  }
}

export class AgentWorkspaceInactiveError extends Error {
  constructor() {
    super("Workspace is not active.");
    this.name = "AgentWorkspaceInactiveError";
  }
}

function normalizeListAgentsQuery(input: ListAgentsQueryInput = {}): ListAgentsQuery {
  const page = input.page ?? DEFAULT_LIST_QUERY.page;
  const pageSize = input.pageSize ?? DEFAULT_LIST_QUERY.pageSize;

  if (!Number.isInteger(page) || page < 1) {
    throw new AgentValidationError("page must be an integer greater than or equal to 1.");
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new AgentValidationError(
      `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}.`
    );
  }

  const sortBy = input.sortBy ?? DEFAULT_LIST_QUERY.sortBy;
  if (sortBy !== "name" && sortBy !== "role" && sortBy !== "model") {
    throw new AgentValidationError("sortBy must be one of: name, role, model.");
  }

  const sortOrder = input.sortOrder ?? DEFAULT_LIST_QUERY.sortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AgentValidationError("sortOrder must be asc or desc.");
  }

  const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : undefined;
  const search = typeof input.search === "string" && input.search.trim() ? input.search.trim() : undefined;
  const status = input.status;

  if (typeof status !== "undefined" && status !== "active" && status !== "inactive") {
    throw new AgentValidationError("status must be active or inactive.");
  }

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    model,
    search,
    status
  };
}

function assertValidAgentName(name: string): void {
  if (!AGENT_NAME_PATTERN.test(name)) {
    throw new AgentValidationError(
      "Agent name may only contain Latin letters, digits, and hyphens."
    );
  }
}

async function loadActiveWorkspaceOrThrow(workspaceId: string): Promise<Workspace> {
  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) {
    throw new AgentValidationError("Workspace not found.");
  }

  if (workspace.status !== "RUNNING") {
    throw new AgentWorkspaceInactiveError();
  }

  return workspace;
}

export async function listAgentsService(workspaceId: string): Promise<Agent[]> {
  await loadActiveWorkspaceOrThrow(workspaceId);
  return listAgentsRecord(workspaceId);
}

export async function listAgentsWithQueryService(
  workspaceId: string,
  input: ListAgentsQueryInput
): Promise<ListAgentsResult> {
  await loadActiveWorkspaceOrThrow(workspaceId);
  const query = normalizeListAgentsQuery(input);
  return listAgentsWithQuery(workspaceId, query);
}

export async function getAgentWorkspaceSummaryService(workspaceId: string): Promise<AgentWorkspaceSummary> {
  await loadActiveWorkspaceOrThrow(workspaceId);
  return getAgentWorkspaceSummary(workspaceId);
}

export async function getAgentByIdService(workspaceId: string, id: string): Promise<Agent> {
  await loadActiveWorkspaceOrThrow(workspaceId);

  const agent = await getAgentByIdRecord(workspaceId, id);

  if (!agent) {
    throw new AgentNotFoundError();
  }

  return agent;
}

export async function createAgentService(
  workspaceId: string,
  input: CreateAgentInput,
  actorUserId: string
): Promise<Agent> {
  const workspace = await loadActiveWorkspaceOrThrow(workspaceId);

  assertValidAgentName(input.name);

  const duplicatedByName = await getAgentByName(workspaceId, input.name);
  if (duplicatedByName) {
    throw new AgentValidationError("Agent name already exists in this workspace.");
  }

  const currentAgentCount = await countAgentsByWorkspace(workspaceId);
  const limit = AGENT_LIMITS_BY_PROFILE[workspace.config.resourceProfile];

  if (currentAgentCount >= limit) {
    throw new AgentQuotaExceededError();
  }

  return createAgentRecord(workspaceId, input, actorUserId);
}

export async function updateAgentService(
  workspaceId: string,
  id: string,
  input: UpdateAgentInput,
  actorUserId: string
): Promise<Agent> {
  await loadActiveWorkspaceOrThrow(workspaceId);

  if (typeof input.name === "string") {
    assertValidAgentName(input.name.trim());

    const duplicatedByName = await getAgentByName(workspaceId, input.name);
    if (duplicatedByName && duplicatedByName.id !== id) {
      throw new AgentValidationError("Agent name already exists in this workspace.");
    }
  }

  const updated = await updateAgentRecord(workspaceId, id, input, actorUserId);

  if (!updated) {
    throw new AgentNotFoundError();
  }

  return updated;
}

export async function deleteAgentService(workspaceId: string, id: string): Promise<Agent> {
  await loadActiveWorkspaceOrThrow(workspaceId);

  const deleted = await deleteAgentRecord(workspaceId, id);

  if (!deleted) {
    throw new AgentNotFoundError();
  }

  return deleted;
}
