import type { RouteObject } from "react-router-dom";

import { WorkflowDashboardPage } from "../pages/WorkflowDashboardPage";

export const workflowRoutes: RouteObject[] = [
  {
    path: "/app/workflows",
    element: <WorkflowDashboardPage />
  }
];
