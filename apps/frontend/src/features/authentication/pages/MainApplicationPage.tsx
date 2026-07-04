import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "../styles/authentication.css";
import { mainApplicationNavigation } from "./mainApplication.navigation";

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

      <section className="main-navigation" aria-labelledby="main-navigation-title">
        <div className="main-navigation__heading">
          <p>SUBSCRIPTION &amp; PAYMENT</p>
          <h2 id="main-navigation-title">Choose where to go</h2>
        </div>
        <div className="main-navigation__grid">
          {mainApplicationNavigation.map((item) => (
            <Link className="main-navigation-card" key={item.path} to={item.path}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
              <span className="main-navigation-card__action">
                {item.action} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
