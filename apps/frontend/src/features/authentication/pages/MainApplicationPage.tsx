import { Link } from "react-router-dom";

import "../styles/authentication.css";
import { mainApplicationNavigation } from "./mainApplication.navigation";

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
            Main application content will be available here.
          </p>
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
