import type { Subscription } from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { SubscriptionShell } from "../components/SubscriptionShell";
import { getWorkspaceStatusMessage } from "../components/workspaceStatusMessage";
import { ApiError, getMySubscription } from "../services/subscription.api";

export function SubscriptionStatusPage() {
  const [subscription, setSubscription] = useState<Subscription>();
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMySubscription()
      .then(setSubscription)
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 404) setMissing(true);
        else setError(reason instanceof Error ? reason.message : "Unable to load subscription");
      });
  }, []);

  const workspaceStatusMessage = getWorkspaceStatusMessage(subscription?.workspaceStatus);

  return (
    <SubscriptionShell>
      <p className="eyebrow">MY SUBSCRIPTION</p>
      <h1>Workspace access</h1>
      {error && <p className="inline-error">{error}</p>}
      {missing && (
        <div className="state-card">
          <p>You do not have a subscription yet.</p>
          <Link className="button" to="/app/subscription/plans">View plans</Link>
        </div>
      )}
      {subscription && (
        <div className="subscription-status-card">
          <span className="status-pill">{subscription.status}</span>
          <h2>{subscription.planId}</h2>
          {workspaceStatusMessage && (
            <p className="state-card state-card--error">
              {workspaceStatusMessage}
            </p>
          )}
          <dl className="order-summary">
            <div><dt>Valid until</dt><dd>{new Date(subscription.endDate).toLocaleDateString()}</dd></div>
            <div><dt>Workspace</dt><dd>{subscription.workspaceStatus}</dd></div>
          </dl>
          <Link className="button" to={`/app/subscription/checkout/${subscription.planId}`}>Renew</Link>
        </div>
      )}
    </SubscriptionShell>
  );
}
