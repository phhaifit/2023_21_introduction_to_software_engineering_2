import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "initializing") {
    return (
      <main className="auth-guard-shell" aria-live="polite">
        <section className="auth-guard-panel" aria-labelledby="auth-guard-title">
          <div className="auth-guard-spinner" aria-hidden="true" />
          <h1 id="auth-guard-title">Checking your session</h1>
          <p>We are confirming your access before opening the application.</p>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
