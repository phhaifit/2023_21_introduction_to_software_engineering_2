import type { Plan, Subscription } from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SubscriptionShell } from "../components/SubscriptionShell";
import { ApiError, getMySubscription, listPlans } from "../services/subscription.api";

export function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [availablePlans, currentSubscription] = await Promise.all([
        listPlans(),
        getMySubscription().catch((reason) => {
          if (reason instanceof ApiError && reason.status === 404) return undefined;
          throw reason;
        })
      ]);
      setPlans(availablePlans);
      setSubscription(currentSubscription);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <SubscriptionShell>
      <div className="subscription-heading">
        <div>
          <p className="eyebrow">SUBSCRIPTION</p>
          <h1>Choose the workspace that fits your team</h1>
        </div>
        {subscription && (
          <p className="current-plan-summary">
            Current: <strong>{subscription.planId}</strong> · {subscription.status}
          </p>
        )}
      </div>

      {loading && <p className="state-card">Loading plans…</p>}
      {error && (
        <div className="state-card state-card--error">
          <p>{error}</p>
          <button onClick={() => void load()} type="button">Try again</button>
        </div>
      )}
      {!loading && !error && plans.length === 0 && (
        <p className="state-card">No plans are currently available.</p>
      )}

      <div className="plan-grid">
        {plans.map((plan) => {
          const isCurrent = subscription?.planId === plan.id;
          const action = !subscription ? "Buy now" : isCurrent ? "Renew" : "Upgrade";
          return (
            <article className={`plan-card ${plan.name === "Premium" ? "plan-card--featured" : ""}`} key={plan.id}>
              <p className="plan-card__name">{plan.name}</p>
              <p className="plan-card__price">
                {plan.monthlyPrice.toLocaleString("vi-VN")} VND <span>/ month</span>
              </p>
              <ul>
                <li>{plan.cpu} vCPU · {plan.ramGb} GB RAM</li>
                <li>{plan.storageGb} GB SSD</li>
                <li>Up to {plan.maxAgents} agents</li>
                <li>{plan.supportLevel} support</li>
              </ul>
              {isCurrent && <span className="status-pill">Current plan</span>}
              <button
                onClick={() => navigate(`/app/subscription/checkout/${plan.id}`)}
                type="button"
              >
                {action}
              </button>
            </article>
          );
        })}
      </div>
    </SubscriptionShell>
  );
}
