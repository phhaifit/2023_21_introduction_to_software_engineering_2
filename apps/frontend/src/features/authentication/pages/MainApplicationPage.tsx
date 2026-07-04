import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "../styles/authentication.css";

export function MainApplicationPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // AuthContext clears local auth state even when the backend logout request fails.
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <main className="main-application-shell">
      <header className="main-application-header">
        <div className="main-application-brand">
          <span className="main-application-brand__mark">AI</span>
          <span>AI Agent Platform for Enterprise</span>
        </div>

        <button
          className="main-logout-button"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          type="button"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      <section className="main-application-content" aria-labelledby="main-title">
        <div className="main-status-mark" aria-hidden="true">
          ✓
        </div>
        <div>
          <p className="main-application-eyebrow">Authenticated session</p>
          <h1 id="main-title">Welcome back to the platform</h1>
          <p>Your access has been verified by the authentication service.</p>
          <p className="main-application-muted">
            This screen only shows public account information and logout controls.
          </p>

          <dl className="main-user-details" aria-label="Current user">
            <div>
              <dt>Email</dt>
              <dd>{user?.email ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{user?.status ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{user?.id ?? "Unavailable"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
