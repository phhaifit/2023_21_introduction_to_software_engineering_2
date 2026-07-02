import { Link } from "react-router-dom";

import "../styles/landing.css";

const FEATURES = [
  {
    title: "Authentication",
    description: "Secure sign-in and workspace access for every team member."
  },
  {
    title: "Workflow Management",
    description: "Design, validate, execute, and monitor multi-agent workflows end to end."
  },
  {
    title: "Agent Management",
    description: "Configure and orchestrate the AI agents that power your workflows."
  },
  {
    title: "Workspace Management",
    description: "Organize projects, members, and resources in one shared workspace."
  },
  {
    title: "Task & Orchestration",
    description: "Coordinate task execution across agents with clear visibility."
  },
  {
    title: "Subscription & Payment",
    description: "Manage plans and billing for your organization."
  }
];

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-hero">
        <p className="landing-eyebrow">AI Agent Platform for Enterprise</p>
        <h1>Build, run, and monitor multi-agent workflows in one place</h1>
        <p className="landing-subtitle">
          A unified workspace for orchestrating AI agents across your organization.
        </p>
        <div className="landing-actions">
          <Link to="/login" className="landing-cta-primary">
            Log in
          </Link>
        </div>
      </header>

      <section className="landing-features">
        <h2>Everything your team needs</h2>
        <div className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
