import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { agentRoutes } from "../features/agent-management/routes/agent.routes";
import { authenticationRoutes } from "../features/authentication/routes/authentication.routes";
import { landingRoutes } from "../features/landing/routes/landing.routes";
import { workspaceRoutes } from "../features/workspace-management/routes/workspace.routes";
import { workflowRoutes } from "../features/workflow/routes/workflow.routes";

const router = createBrowserRouter([
  ...landingRoutes,
  ...authenticationRoutes,
  ...agentRoutes,
  ...workspaceRoutes,
  ...workflowRoutes,
  {
    path: "*",
    element: <Navigate to="/app" replace />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
