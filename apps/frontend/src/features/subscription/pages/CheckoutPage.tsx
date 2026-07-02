import type { Plan } from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { SubscriptionShell } from "../components/SubscriptionShell";
import { createCheckout, listPlans } from "../services/subscription.api";

export function CheckoutPage() {
  const { planId = "" } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listPlans()
      .then((plans) => setPlan(plans.find((candidate) => candidate.id === planId)))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load plan"));
  }, [planId]);

  async function confirm() {
    setSubmitting(true);
    setError("");
    try {
      const result = await createCheckout(planId);
      navigate(result.transaction.paymentUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create checkout");
      setSubmitting(false);
    }
  }

  return (
    <SubscriptionShell>
      <div className="checkout-card">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Review your order</h1>
        {!plan && !error && <p>Loading order…</p>}
        {error && <p className="inline-error">{error}</p>}
        {plan && (
          <>
            <dl className="order-summary">
              <div><dt>Plan</dt><dd>{plan.name}</dd></div>
              <div><dt>Resources</dt><dd>{plan.cpu} vCPU · {plan.ramGb} GB RAM</dd></div>
              <div><dt>Billing cycle</dt><dd>30 days</dd></div>
              <div><dt>Total</dt><dd>{plan.monthlyPrice.toLocaleString("vi-VN")} VND</dd></div>
            </dl>
            <p className="payment-note">Local MVP payment is handled by the mock gateway.</p>
            <div className="button-row">
              <Link className="button button--secondary" to="/app/subscription/plans">Back</Link>
              <button disabled={submitting} onClick={() => void confirm()} type="button">
                {submitting ? "Creating payment…" : "Confirm payment"}
              </button>
            </div>
          </>
        )}
      </div>
    </SubscriptionShell>
  );
}
