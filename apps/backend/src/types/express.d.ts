import type { UserStatus } from "../entities/user.entity.js";
import type { RequestIdentity } from "../services/payments.service.js";
import type { WorkspaceRole } from "./workspace-role.js";

declare global {
  namespace Express {
    interface Request {
      identity: RequestIdentity;
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
