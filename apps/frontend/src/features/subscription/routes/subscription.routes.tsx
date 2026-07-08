import { lazy, type ReactElement } from "react";
import type { RouteObject } from "react-router-dom";

import { AdminSubscriptionsPage } from "../pages/AdminSubscriptionsPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { PaymentResultPage } from "../pages/PaymentResultPage";
import { PricingPage } from "../pages/PricingPage";
import { SubscriptionStatusPage } from "../pages/SubscriptionStatusPage";

export function createSubscriptionRoutes(
  mockPaymentElement?: ReactElement
): RouteObject[] {
  return [
    { path: "/app/subscription/plans", element: <PricingPage /> },
    { path: "/app/subscription/checkout/:planId", element: <CheckoutPage /> },
    ...(mockPaymentElement
      ? [
          {
            path: "/app/subscription/mock-payment/:transactionId",
            element: mockPaymentElement
          }
        ]
      : []),
    { path: "/app/subscription/payments/:transactionId", element: <PaymentResultPage /> },
    { path: "/app/subscription", element: <SubscriptionStatusPage /> },
    { path: "/app/admin/subscriptions", element: <AdminSubscriptionsPage /> }
  ];
}

const DevelopmentMockPaymentPage = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("../pages/MockPaymentPage");
      return { default: module.MockPaymentPage };
    })
  : undefined;

export const subscriptionRoutes = createSubscriptionRoutes(
  DevelopmentMockPaymentPage ? <DevelopmentMockPaymentPage /> : undefined
);
