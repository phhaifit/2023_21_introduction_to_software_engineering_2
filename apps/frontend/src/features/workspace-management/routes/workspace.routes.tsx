import type { RouteObject } from "react-router-dom";

import { WorkspaceManagementPage } from "../pages/WorkspaceManagementPage";
import { ProtectedRoute } from "../../authentication/routes/protected-route";

export const workspaceRoutes: RouteObject[] = [
  {
    path: "/app/workspaces",
    element: (
      <ProtectedRoute>
        <WorkspaceManagementPage />
      </ProtectedRoute>
    )
  }
];
