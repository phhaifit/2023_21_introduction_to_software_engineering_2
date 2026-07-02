import type { AdminSubscriptionListResponse } from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";

import { SubscriptionShell } from "../components/SubscriptionShell";
import { listAdminSubscriptions } from "../services/subscription.api";

export function AdminSubscriptionsPage() {
  const [data, setData] = useState<AdminSubscriptionListResponse>();
  const [error, setError] = useState("");

  useEffect(() => {
    listAdminSubscriptions().then(setData).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Unable to load subscriptions");
    });
  }, []);

  return (
    <SubscriptionShell>
      <p className="eyebrow">ADMIN</p>
      <h1>Subscriptions</h1>
      {error && <p className="inline-error">{error}</p>}
      {!data && !error && <p>Loading subscriptions…</p>}
      {data?.total === 0 && <p className="state-card">No subscriptions found.</p>}
      {!!data?.total && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>End date</th><th>Workspace</th></tr></thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.userId}</td>
                  <td>{item.plan.name}</td>
                  <td>{item.status}</td>
                  <td>{new Date(item.endDate).toLocaleDateString()}</td>
                  <td>{item.workspaceStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SubscriptionShell>
  );
}
