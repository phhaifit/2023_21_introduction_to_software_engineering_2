import type { RouteObject } from "react-router-dom";

import { AuthenticationLayout } from "../layouts/AuthenticationLayout";
import { LoginPage } from "../pages/LoginPage";
import { MainApplicationPage } from "../pages/MainApplicationPage";
import { RegisterPage } from "../pages/RegisterPage";
import { WorkspaceManagementPage } from "../../workspace-management/pages/WorkspaceManagementPage";

export const authenticationRoutes: RouteObject[] = [
  {
    element: <AuthenticationLayout />,
    children: [
      {
        path: "/register",
        element: <RegisterPage />
      },
      {
        path: "/login",
        element: <LoginPage />
      }
    ]
  },
  {
    path: "/app",
    element: <MainApplicationPage />
  },
  {
    path: "/app/workspaces",
    element: <WorkspaceManagementPage />
  }
];
