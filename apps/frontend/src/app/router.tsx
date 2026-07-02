import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { authenticationRoutes } from "../features/authentication/routes/authentication.routes";
import { subscriptionRoutes } from "../features/subscription/routes/subscription.routes";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />
  },
  ...authenticationRoutes,
  ...subscriptionRoutes
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
