import { describe, expect, it } from "vitest";

import { mainApplicationNavigation } from "./mainApplication.navigation";

describe("main application navigation", () => {
  it("links the dashboard to the three subscription areas", () => {
    expect(
      mainApplicationNavigation.map(({ label, path }) => ({ label, path }))
    ).toEqual([
      { label: "Plans", path: "/app/subscription/plans" },
      { label: "My Subscription", path: "/app/subscription" },
      { label: "Admin Subscriptions", path: "/app/admin/subscriptions" }
    ]);
  });
});
