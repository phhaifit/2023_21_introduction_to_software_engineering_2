import type { RouteObject } from "react-router-dom";

import { AgentManagementPage } from "../pages/AgentManagementPage";
import { AgentDetailPage } from "../pages/AgentDetailPage";
import { ProtectedRoute } from "../../authentication/routes/protected-route";

export const agentRoutes: RouteObject[] = [
  {
    path: "/app/agents",
    element: (
      <ProtectedRoute>
        <AgentManagementPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/app/agents/:agentId",
    element: (
      <ProtectedRoute>
        <AgentDetailPage />
      </ProtectedRoute>
    )
  }
];
