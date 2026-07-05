import type {
  AdminSubscriptionListResponse,
  AdminWorkspaceOperationListResponse
} from "@ai-agent-platform/shared";
import { useEffect, useState } from "react";

import { SubscriptionShell } from "../components/SubscriptionShell";
import {
  ApiError,
  listAdminSubscriptions,
  listAdminWorkspaceOperations
} from "../services/subscription.api";

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionListResponse>();
  const [operations, setOperations] = useState<AdminWorkspaceOperationListResponse>();
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    Promise.all([listAdminSubscriptions(), listAdminWorkspaceOperations()])
      .then(([subscriptionsResponse, operationsResponse]) => {
        setSubscriptions(subscriptionsResponse);
        setOperations(operationsResponse);
      })
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 403) {
          setForbidden(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : "Unable to load admin data");
      });
  }, []);

  const loading = !forbidden && !error && (!subscriptions || !operations);

  return (
    <SubscriptionShell>
      <div className="subscription-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Subscriptions</h1>
          <p className="subscription-heading__description">
            Monitor subscription records and workspace operations for the platform.
          </p>
        </div>
      </div>

      {forbidden && (
        <p className="state-card warning">
          Role Member không có quyền xem Admin Dashboard. Đây là kết quả RBAC HTTP 403.
        </p>
      )}
      {error && <p className="inline-error">{error}</p>}
      {loading && <p>Loading admin data…</p>}

      {!forbidden && subscriptions && (
        <>
          {subscriptions.total === 0 && (
            <p className="state-card">No subscriptions found.</p>
          )}
          {subscriptions.total > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>End date</th>
                    <th>Workspace</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.items.map((item) => (
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
        </>
      )}

      {!forbidden && operations && (
        <section>
          <h2>Workspace operations</h2>
          {operations.total === 0 && (
            <p className="state-card">
              Chưa có mua mới hoặc nâng cấp nào tạo Workspace operation.
            </p>
          )}
          {operations.total > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Plan</th>
                    <th>Workspace</th>
                    <th>Status</th>
                    <th>Transaction / Idempotency</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.items.map((operation) => (
                    <tr key={operation.id}>
                      <td>{new Date(operation.createdAt).toLocaleString()}</td>
                      <td>{operation.action}</td>
                      <td>{operation.planId}</td>
                      <td>{operation.workspaceId}</td>
                      <td>
                        {operation.status}
                        {operation.status === "FAILED" && operation.failureCode && (
                          <span className="operation-failure-code">
                            {operation.failureCode}
                          </span>
                        )}
                      </td>
                      <td>{operation.idempotencyKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </SubscriptionShell>
  );
}
