import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { authenticationRoutes } from "../features/authentication/routes/authentication.routes";
import { landingRoutes } from "../features/landing/routes/landing.routes";
import { workflowRoutes } from "../features/workflow/routes/workflow.routes";

const router = createBrowserRouter([
  ...landingRoutes,
  ...authenticationRoutes,
  ...workflowRoutes
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
