import type { RequestHandler } from "express";

import { getWorkspaceById } from "../repositories/workspaces.repository.js";
import type { WorkspaceRole } from "../types/workspace-role.js";

const WORKSPACE_ROLES: WorkspaceRole[] = ["admin", "member", "viewer"];

function parseWorkspaceRole(rawRole: string | undefined): WorkspaceRole | null {
  if (!rawRole) {
    return null;
  }

  const normalizedRole = rawRole.trim().toLowerCase();

  return WORKSPACE_ROLES.find((role) => role === normalizedRole) ?? null;
}

export const resolveWorkspaceContext: RequestHandler = async (request, response, next) => {
  const workspaceId = request.header("x-workspace-id")?.trim();
  const role = parseWorkspaceRole(request.header("x-workspace-role"));

  if (!workspaceId) {
    response.status(400).json({ error: "x-workspace-id is required." });
    return;
  }

  if (!role) {
    response.status(400).json({ error: "x-workspace-role is required and must be admin, member, or viewer." });
    return;
  }

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) {
    response.status(404).json({ error: "Workspace not found." });
    return;
  }

  if (workspace.status !== "RUNNING") {
    response.status(403).json({ error: "Workspace is not active." });
    return;
  }

  request.workspaceContext = {
    workspaceId,
    role
  };

  next();
};

export function requireWorkspaceRole(allowedRoles: WorkspaceRole[]): RequestHandler {
  return (request, response, next) => {
    const role = request.workspaceContext?.role;

    if (!role || !allowedRoles.includes(role)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}