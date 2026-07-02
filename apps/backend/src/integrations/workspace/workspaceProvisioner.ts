import type { Plan } from "@ai-agent-platform/shared";

export type WorkspaceProvisionInput = {
  subscriptionId: string;
  workspaceId: string;
  plan: Plan;
};

export interface WorkspaceProvisioner {
  provision(input: WorkspaceProvisionInput): Promise<void>;
  updatePlan(input: WorkspaceProvisionInput): Promise<void>;
}
