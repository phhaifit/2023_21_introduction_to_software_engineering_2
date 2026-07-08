import type { AdminWorkspaceOperationListResponse } from "@ai-agent-platform/shared";

import { workspaceOperationsRepository } from "../repositories/workspaceOperations.repository.js";

const RECENT_OPERATION_LIMIT = 50;

export function listRecentWorkspaceOperationsService(): Promise<AdminWorkspaceOperationListResponse> {
  return workspaceOperationsRepository.listRecent(RECENT_OPERATION_LIMIT);
}
