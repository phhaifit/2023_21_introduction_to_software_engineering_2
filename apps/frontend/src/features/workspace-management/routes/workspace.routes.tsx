import type { RouteObject } from "react-router-dom";

import { WorkspaceManagementPage } from "../pages/WorkspaceManagementPage";

export const workspaceRoutes: RouteObject[] = [
  {
    path: "/app/workspaces",
    element: <WorkspaceManagementPage />
  }
];
