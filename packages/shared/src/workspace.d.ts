export type WorkspaceStatus = "PENDING" | "PROVISIONING" | "RUNNING" | "FAILED" | "STOPPED";
export type WorkspaceResourceProfile = "Starter" | "Standard" | "Performance";
export type WorkspaceAction = "start" | "stop" | "restart" | "retry" | "complete" | "fail";

export interface WorkspaceConfig {
  templateId: string;
  resourceProfile: WorkspaceResourceProfile;
  region: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerName: string;
  status: WorkspaceStatus;
  config: WorkspaceConfig;
  accessUrl?: string;
  containerId?: string;
  openClawInstanceId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  templateId: string;
  resourceProfile: WorkspaceResourceProfile;
  region?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  templateId?: string;
  resourceProfile?: WorkspaceResourceProfile;
  region?: string;
}

export interface FailWorkspaceInput {
  reason?: string;
}

export interface WorkspaceValidationIssue {
  field: string;
  message: string;
}

export declare const WORKSPACE_STATUSES: WorkspaceStatus[];
export declare const WORKSPACE_RESOURCE_PROFILES: WorkspaceResourceProfile[];
