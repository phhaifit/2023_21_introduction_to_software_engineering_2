import type { RouteObject } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { AuthenticationLayout } from "../layouts/AuthenticationLayout";
import { LoginPage } from "../pages/LoginPage";
import { MainApplicationPage } from "../pages/MainApplicationPage";
import { RegisterPage } from "../pages/RegisterPage";

function RegisterRoute() {
  const { register } = useAuth();

  return <RegisterPage onRegister={register} />;
}

function LoginRoute() {
  const { login } = useAuth();

  return <LoginPage onLogin={login} />;
}

export const authenticationRoutes: RouteObject[] = [
  {
    element: <AuthenticationLayout />,
    children: [
      {
        path: "/register",
        element: <RegisterRoute />
      },
      {
        path: "/login",
        element: <LoginRoute />
      }
    ]
  },
  {
    path: "/app",
    element: <MainApplicationPage />
  }
];
