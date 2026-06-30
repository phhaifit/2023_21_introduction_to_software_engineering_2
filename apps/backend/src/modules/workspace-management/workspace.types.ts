export type WorkspaceStatus = "PENDING" | "PROVISIONING" | "RUNNING" | "FAILED" | "STOPPED";

export type WorkspaceResourceProfile = "Starter" | "Standard" | "Performance";

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

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  templateId: string;
  resourceProfile: WorkspaceResourceProfile;
  region?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  templateId?: string;
  resourceProfile?: WorkspaceResourceProfile;
  region?: string;
}

export interface FailWorkspaceRequest {
  reason?: string;
}

export interface WorkspaceValidationError {
  field: string;
  message: string;
}
