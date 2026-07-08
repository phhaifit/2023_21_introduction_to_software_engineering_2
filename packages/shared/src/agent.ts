export type AgentStatus = "active" | "inactive";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  instructionContent: string;
  skillFileContent?: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  model: string;
  instructionContent: string;
  skillFileContent?: string;
  status: AgentStatus;
}

export interface UpdateAgentInput {
  name?: string;
  role?: string;
  model?: string;
  instructionContent?: string;
  skillFileContent?: string;
  status?: AgentStatus;
}