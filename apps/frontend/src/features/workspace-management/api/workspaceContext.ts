const ACTIVE_WORKSPACE_STORAGE_KEY = "ai-agent-platform.activeWorkspaceId";

export function getActiveWorkspaceId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.sessionStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function saveActiveWorkspaceId(workspaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
  } catch {
    // Best-effort context persistence should not block the workspace UI.
  }
}
