import type { RouteObject } from "react-router-dom";

import { AdminSubscriptionsPage } from "../pages/AdminSubscriptionsPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { MockPaymentPage } from "../pages/MockPaymentPage";
import { PaymentResultPage } from "../pages/PaymentResultPage";
import { PricingPage } from "../pages/PricingPage";
import { SubscriptionStatusPage } from "../pages/SubscriptionStatusPage";

export const subscriptionRoutes: RouteObject[] = [
  { path: "/app/subscription/plans", element: <PricingPage /> },
  { path: "/app/subscription/checkout/:planId", element: <CheckoutPage /> },
  { path: "/app/subscription/mock-payment/:transactionId", element: <MockPaymentPage /> },
  { path: "/app/subscription/payments/:transactionId", element: <PaymentResultPage /> },
  { path: "/app/subscription", element: <SubscriptionStatusPage /> },
  { path: "/app/admin/subscriptions", element: <AdminSubscriptionsPage /> }
];
