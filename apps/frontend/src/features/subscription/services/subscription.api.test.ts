import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  createCheckout,
  listPlans
} from "./subscription.api";

describe("subscription API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns plans from a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "standard",
            name: "Standard",
            monthlyPrice: 199000,
            cpu: 2,
            ramGb: 4,
            storageGb: 20,
            maxAgents: 5,
            supportLevel: "Standard",
            active: true
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const plans = await listPlans();

    expect(plans[0].id).toBe("standard");
    expect(fetchMock).toHaveBeenCalledWith("/api/plans", expect.any(Object));
  });

  it("sends only the selected plan id when creating checkout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ transaction: { id: "transaction-1" }, reused: false }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await createCheckout("premium");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ planId: "premium" })
      })
    );
  });

  it("throws a structured API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "PLAN_NOT_FOUND", message: "Plan not found" }
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(listPlans()).rejects.toEqual(
      new ApiError("PLAN_NOT_FOUND", "Plan not found", 404)
    );
  });
});
