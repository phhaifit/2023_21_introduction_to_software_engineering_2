import type { PaymentStatusResponse } from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SubscriptionShell } from "../components/SubscriptionShell";
import {
  cancelPayment,
  completeMockPayment,
  getPaymentStatus
} from "../services/subscription.api";

export function MockPaymentPage() {
  const { transactionId = "" } = useParams();
  const [result, setResult] = useState<PaymentStatusResponse>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPaymentStatus(transactionId).then(setResult).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Unable to load payment");
    });
  }, [transactionId]);

  async function run(action: "complete" | "fail" | "provisioning-failure" | "cancel") {
    setBusy(true);
    setError("");
    try {
      setResult(
        action === "cancel"
          ? await cancelPayment(transactionId)
          : await completeMockPayment(transactionId, action)
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubscriptionShell>
      <div className="mock-payment-card">
        <p className="eyebrow">LOCAL MOCK GATEWAY</p>
        <h1>Simulate payment result</h1>
        <p>Transaction: <code>{transactionId}</code></p>
        <p>Status: <strong>{result?.transaction.status ?? "Loading…"}</strong></p>
        {error && <p className="inline-error">{error}</p>}
        <div className="mock-actions">
          <button disabled={busy} onClick={() => void run("complete")} type="button">Complete</button>
          <button disabled={busy} onClick={() => void run("provisioning-failure")} type="button">Complete, provisioning fails</button>
          <button disabled={busy} onClick={() => void run("fail")} type="button">Fail</button>
          <button className="danger-button" disabled={busy} onClick={() => void run("cancel")} type="button">Cancel</button>
        </div>
        <Link className="button button--secondary" to={`/app/subscription/payments/${transactionId}`}>
          View payment result
        </Link>
      </div>
    </SubscriptionShell>
  );
}
