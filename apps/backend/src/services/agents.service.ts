import type { Agent, CreateAgentInput, UpdateAgentInput } from "@ai-agent-platform/shared";

import {
  createAgent as createAgentRecord,
  deleteAgent as deleteAgentRecord,
  getAgentById as getAgentByIdRecord,
  listAgents as listAgentsRecord,
  updateAgent as updateAgentRecord
} from "../repositories/agents.repository.js";

export async function listAgentsService(): Promise<Agent[]> {
  return listAgentsRecord();
}

export async function getAgentByIdService(id: string): Promise<Agent | undefined> {
  return getAgentByIdRecord(id);
}

export async function createAgentService(input: CreateAgentInput): Promise<Agent> {
  return createAgentRecord(input);
}

export async function updateAgentService(id: string, input: UpdateAgentInput): Promise<Agent | undefined> {
  return updateAgentRecord(id, input);
}

export async function deleteAgentService(id: string): Promise<Agent | undefined> {
  return deleteAgentRecord(id);
}
