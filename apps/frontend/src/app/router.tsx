import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { landingRoutes } from "../features/landing/routes/landing.routes";
import { authenticationRoutes } from "../features/authentication/routes/authentication.routes";
import { protectedAppRoutes } from "../features/protected-app/routes/protected-app.routes";

const router = createBrowserRouter([
  ...landingRoutes,
  ...authenticationRoutes,
  ...protectedAppRoutes,
  {
    path: "*",
    element: <Navigate to="/app" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
