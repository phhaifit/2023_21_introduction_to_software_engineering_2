import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { AgentDetailPage } from "../../agent-management/pages/AgentDetailPage";
import { AgentManagementPage } from "../../agent-management/pages/AgentManagementPage";
import { ProtectedRoute } from "../../authentication/routes/protected-route";
import { AdminSubscriptionsPage } from "../../subscription/pages/AdminSubscriptionsPage";
import { CheckoutPage } from "../../subscription/pages/CheckoutPage";
import { PaymentResultPage } from "../../subscription/pages/PaymentResultPage";
import { PricingPage } from "../../subscription/pages/PricingPage";
import { SubscriptionStatusPage } from "../../subscription/pages/SubscriptionStatusPage";
import { WorkflowDashboardPage } from "../../workflow/pages/WorkflowDashboardPage";
import { WorkspaceManagementPage } from "../../workspace-management/pages/WorkspaceManagementPage";
import { ProtectedAppShell } from "../layouts/ProtectedAppShell";
import { ApplicationDashboardPage } from "../pages/ApplicationDashboardPage";

const DevelopmentMockPaymentPage = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("../../subscription/pages/MockPaymentPage");

      return { default: module.MockPaymentPage };
    })
  : undefined;

export const protectedAppRoutes: RouteObject[] = [
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <ProtectedAppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ApplicationDashboardPage />
      },
      {
        path: "workspaces",
        element: <WorkspaceManagementPage />
      },
      {
        path: "workflows",
        element: <WorkflowDashboardPage />
      },
      {
        path: "agents",
        element: <AgentManagementPage />
      },
      {
        path: "agents/:agentId",
        element: <AgentDetailPage />
      },
      {
        path: "subscription/plans",
        element: <PricingPage />
      },
      {
        path: "subscription/checkout/:planId",
        element: <CheckoutPage />
      },
      ...(DevelopmentMockPaymentPage
        ? [
            {
              path: "subscription/mock-payment/:transactionId",
              element: <DevelopmentMockPaymentPage />
            }
          ]
        : []),
      {
        path: "subscription/payments/:transactionId",
        element: <PaymentResultPage />
      },
      {
        path: "subscription",
        element: <SubscriptionStatusPage />
      },
      {
        path: "admin/subscriptions",
        element: <AdminSubscriptionsPage />
      }
    ]
  }
];
