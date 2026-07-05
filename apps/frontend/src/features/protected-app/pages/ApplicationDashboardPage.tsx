import { Link } from "react-router-dom";
import { protectedAppDashboardCards } from "../navigation/protectedApp.navigation";

export function ApplicationDashboardPage() {
  return (
    <div className="protected-dashboard">
      <section className="protected-dashboard-hero">
        <div>
          <p className="protected-dashboard-hero__eyebrow">AI Agent Platform for Enterprise</p>
          <h2>Build, run, and monitor multi-agent operations from one protected workspace.</h2>
          <p>
            Coordinate workspaces, workflow orchestration, and subscription operations with a
            consistent application shell across every protected module.
          </p>
        </div>
      </section>

      <section className="protected-dashboard-grid" aria-label="Application modules">
        {protectedAppDashboardCards.map((card) => {
          if (card.disabled) {
            return (
              <article
                className="protected-dashboard-card protected-dashboard-card--disabled"
                key={card.label}
                aria-disabled="true"
              >
                <span>{card.label}</span>
                <p>{card.description}</p>
                <strong>Planned</strong>
              </article>
            );
          }

          return (
            <Link className="protected-dashboard-card" key={card.label} to={card.path}>
              <span>{card.label}</span>
              <p>{card.description}</p>
              <strong>Open module</strong>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
