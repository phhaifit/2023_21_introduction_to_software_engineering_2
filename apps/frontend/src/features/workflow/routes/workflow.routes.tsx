import type { RouteObject } from "react-router-dom";

import { WorkflowDashboardPage } from "../pages/WorkflowDashboardPage";
import { ProtectedRoute } from "../../authentication/routes/protected-route";

export const workflowRoutes: RouteObject[] = [
  {
    path: "/app/workflows",
    element: (
      <ProtectedRoute>
        <WorkflowDashboardPage />
      </ProtectedRoute>
    )
  }
];
