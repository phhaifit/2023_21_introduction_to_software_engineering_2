import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { authenticationRoutes } from "../features/authentication/routes/authentication.routes";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />
  },
  ...authenticationRoutes
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
