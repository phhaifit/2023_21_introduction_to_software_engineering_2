import { describe, expect, it } from "vitest";

import { createSubscriptionRoutes } from "./subscription.routes";

describe("subscription routes", () => {
  it("omits the mock payment page from production routes", () => {
    const paths = createSubscriptionRoutes().map((route) => route.path);

    expect(paths).not.toContain("/app/subscription/mock-payment/:transactionId");
  });

  it("includes the mock payment page in development routes", () => {
    const paths = createSubscriptionRoutes(<div>Mock payment</div>).map(
      (route) => route.path
    );

    expect(paths).toContain("/app/subscription/mock-payment/:transactionId");
  });
});
