import { Outlet } from "react-router-dom";

import "../styles/authentication.css";

export function AuthenticationLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-wrapper" aria-label="Account access area">
        <div className="auth-brand" aria-label="AI Agent Platform for Enterprise">
          <span className="auth-brand__mark">AI</span>
          <span className="auth-brand__name">AI Agent Platform for Enterprise</span>
        </div>

        <div className="auth-card">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
