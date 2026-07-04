import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import {
  AuthApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthenticatedUser
} from "../services/auth.api";
import type { LoginFormPayload, RegisterFormPayload } from "../utils/auth-validator";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../utils/token-storage";

export type AuthenticationStatus = "initializing" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthenticationStatus;
  user: AuthenticatedUser | null;
  register: (input: RegisterFormPayload) => Promise<void>;
  login: (input: LoginFormPayload) => Promise<void>;
  logout: () => Promise<void>;
  restoreAuthentication: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof AuthApiError &&
    (error.status === 401 || error.code === AUTH_ERROR_CODES.UNAUTHORIZED)
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthenticationStatus>("initializing");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const clearAuthentication = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const restoreAuthentication = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    setStatus("initializing");

    try {
      const currentUser = await getCurrentUser(accessToken);
      setUser(currentUser);
      setStatus("authenticated");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearAuthentication();
        return;
      }

      setUser(null);
      setStatus("unauthenticated");
    }
  }, [clearAuthentication]);

  useEffect(() => {
    let isActive = true;

    async function restoreInitialAuthentication() {
      const accessToken = getAccessToken();

      if (!accessToken) {
        if (isActive) {
          setUser(null);
          setStatus("unauthenticated");
        }
        return;
      }

      if (isActive) {
        setStatus("initializing");
      }

      try {
        const currentUser = await getCurrentUser(accessToken);

        if (isActive) {
          setUser(currentUser);
          setStatus("authenticated");
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (isUnauthorizedError(error)) {
          clearAuthentication();
          return;
        }

        setUser(null);
        setStatus("unauthenticated");
      }
    }

    void restoreInitialAuthentication();

    return () => {
      isActive = false;
    };
  }, [clearAuthentication]);

  const register = useCallback(async (input: RegisterFormPayload) => {
    await registerRequest(input);
  }, []);

  const login = useCallback(async (input: LoginFormPayload) => {
    const response = await loginRequest(input);

    saveAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const accessToken = getAccessToken();

    try {
      if (accessToken) {
        await logoutRequest(accessToken);
      }
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      register,
      login,
      logout,
      restoreAuthentication
    }),
    [login, logout, register, restoreAuthentication, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
