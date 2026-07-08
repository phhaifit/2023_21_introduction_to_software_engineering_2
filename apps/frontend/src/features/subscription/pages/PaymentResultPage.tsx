import type { PaymentStatusResponse } from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SubscriptionShell } from "../components/SubscriptionShell";
import { getWorkspaceStatusMessage } from "../components/workspaceStatusMessage";
import { getPaymentStatus } from "../services/subscription.api";

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PaymentResultPage() {
  const { transactionId = "" } = useParams();
  const [result, setResult] = useState<PaymentStatusResponse>();
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setResult(await getPaymentStatus(transactionId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load payment");
    }
  }

  useEffect(() => {
    void load();
  }, [transactionId]);

  const workspaceStatusMessage = getWorkspaceStatusMessage(
    result?.subscription?.workspaceStatus
  );

  return (
    <SubscriptionShell>
      <div className="result-card" aria-live="polite">
        <p className="eyebrow">PAYMENT RESULT</p>
        <h1>{result ? formatStatusLabel(result.transaction.status) : "Loading…"}</h1>
        {error && <p className="inline-error">{error}</p>}
        {workspaceStatusMessage && (
          <p className="state-card state-card--error">{workspaceStatusMessage}</p>
        )}
        {result && (
          <dl className="order-summary">
            <div><dt>Transaction</dt><dd>{result.transaction.id}</dd></div>
            <div><dt>Amount</dt><dd>{result.transaction.amount.toLocaleString("vi-VN")} VND</dd></div>
            <div>
              <dt>Subscription</dt>
              <dd>
                {result.subscription ? (
                  <span
                    className={
                      result.subscription.status === "ACTIVE"
                        ? "status-pill status-pill--active"
                        : "status-pill"
                    }
                  >
                    {formatStatusLabel(result.subscription.status)}
                  </span>
                ) : (
                  "Not activated"
                )}
              </dd>
            </div>
            <div><dt>Workspace</dt><dd>{result.subscription?.workspaceStatus ?? "Unchanged"}</dd></div>
          </dl>
        )}
        <div className="button-row">
          <button onClick={() => void load()} type="button">Refresh status</button>
          <Link className="button button--secondary" to="/app/subscription">My subscription</Link>
        </div>
      </div>
    </SubscriptionShell>
  );
}
