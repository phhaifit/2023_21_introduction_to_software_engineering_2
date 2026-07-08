import type { PropsWithChildren } from "react";

import "../styles/subscription.css";
import { DemoRoleSwitcher } from "./DemoRoleSwitcher";

export function SubscriptionShell({ children }: PropsWithChildren) {
  return (
    <section className="subscription-shell">
      <div className="subscription-embedded-tools">
        <DemoRoleSwitcher />
      </div>
      <section className="subscription-content">{children}</section>
    </section>
  );
}
