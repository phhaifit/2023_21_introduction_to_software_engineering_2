import type { Location, RouteObject } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { AuthenticationLayout } from "../layouts/AuthenticationLayout";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";

const DEFAULT_PROTECTED_PATH = "/app";

type RedirectLocation = Pick<Location, "hash" | "pathname" | "search">;

function RegisterRoute() {
  const { register } = useAuth();

  return <RegisterPage onRegister={register} />;
}

function LoginRoute() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectPath = getPostLoginRedirectPath(location.state);

  return (
    <LoginPage
      onLogin={login}
      onLoginSuccess={() => {
        navigate(redirectPath, { replace: true });
      }}
    />
  );
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
  }
];

function getPostLoginRedirectPath(state: unknown): string {
  const location = getRedirectLocation(state);

  if (!location || !location.pathname.startsWith("/")) {
    return DEFAULT_PROTECTED_PATH;
  }

  if (
    location.pathname !== DEFAULT_PROTECTED_PATH &&
    !location.pathname.startsWith(`${DEFAULT_PROTECTED_PATH}/`)
  ) {
    return DEFAULT_PROTECTED_PATH;
  }

  return `${location.pathname}${location.search}${location.hash}`;
}

function getRedirectLocation(state: unknown): RedirectLocation | null {
  if (!state || typeof state !== "object") {
    return null;
  }

  const from = (state as { from?: unknown }).from;

  if (!from || typeof from !== "object") {
    return null;
  }

  const record = from as Record<string, unknown>;

  if (typeof record.pathname !== "string") {
    return null;
  }

  return {
    pathname: record.pathname,
    search: typeof record.search === "string" ? record.search : "",
    hash: typeof record.hash === "string" ? record.hash : ""
  };
}
