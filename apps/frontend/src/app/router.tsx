import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { authenticationRoutes } from "../features/authentication/routes/authentication.routes";
import { workflowRoutes } from "../features/workflow/routes/workflow.routes";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />
  },
  ...authenticationRoutes,
  ...workflowRoutes
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
