import type { UserStatus } from "../entities/user.entity.js";
import type { WorkspaceRole } from "./workspace-role.js";

declare global {
  namespace Express {
    interface Request {
      authContext?: {
        userId: string;
        email: string;
        status: UserStatus;
      };
      workspaceContext?: {
        workspaceId: string;
        role: WorkspaceRole;
      };
    }
  }
}

export {};