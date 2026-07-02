import { Link } from "react-router-dom";

import "../styles/authentication.css";

export function MainApplicationPage() {
  return (
    <main className="main-application-shell">
      <header className="main-application-header">
        <div className="main-application-brand">
          <span className="main-application-brand__mark">AI</span>
          <span>AI Agent Platform for Enterprise</span>
        </div>

        <button className="logout-placeholder-button" type="button" disabled>
          Logout
        </button>
      </header>

      <section className="main-application-content" aria-labelledby="main-title">
        <div className="main-status-mark" aria-hidden="true">
          ✓
        </div>
        <div>
          <h1 id="main-title">Welcome back</h1>
          <p>You are currently viewing the main application.</p>
          <p className="main-application-muted">
            Open a feature console to manage workspace operations or workflow blueprints.
          </p>
          <div className="main-application-actions">
            <Link className="main-application-link" to="/app/workspaces">
              Open Workspace Management
            </Link>
            <Link className="main-application-link" to="/app/workflows">
              Open Workflow Management
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
