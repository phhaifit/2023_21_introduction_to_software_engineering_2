import type { Agent, CreateAgentInput, UpdateAgentInput } from "@ai-agent-platform/shared";
import type { Workspace } from "@ai-agent-platform/shared";

import {
  createAgent as createAgentRecord,
  countAgentsByWorkspace,
  deleteAgent as deleteAgentRecord,
  getAgentById as getAgentByIdRecord,
  getAgentByName,
  listAgents as listAgentsRecord,
  updateAgent as updateAgentRecord
} from "../repositories/agents.repository.js";
import { getWorkspaceById } from "../repositories/workspaces.repository.js";

const AGENT_NAME_PATTERN = /^[A-Za-z0-9-]+$/;

const AGENT_LIMITS_BY_PROFILE: Record<Workspace["config"]["resourceProfile"], number> = {
  Starter: Number(process.env.AGENT_LIMIT_STARTER ?? 5),
  Standard: Number(process.env.AGENT_LIMIT_STANDARD ?? 20),
  Performance: Number(process.env.AGENT_LIMIT_PERFORMANCE ?? 20)
};

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
