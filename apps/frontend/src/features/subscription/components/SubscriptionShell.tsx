import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

import "../styles/subscription.css";
import { DemoRoleSwitcher } from "./DemoRoleSwitcher";

export function SubscriptionShell({ children }: PropsWithChildren) {
  return (
    <main className="subscription-shell">
      <header className="subscription-header">
        <Link className="subscription-brand" to="/app">
          <span>AI</span> Agent Platform
        </Link>
        <nav aria-label="Subscription navigation">
          <Link to="/app/subscription/plans">Plans</Link>
          <Link to="/app/subscription">My subscription</Link>
          <Link to="/app/admin/subscriptions">Admin</Link>
        </nav>
        <DemoRoleSwitcher />
      </header>
      <section className="subscription-content">{children}</section>
    </main>
  );
}
