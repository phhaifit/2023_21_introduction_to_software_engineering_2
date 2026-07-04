import { describe, expect, it } from "vitest";

import {
  calculateRenewedEndDate,
  canTransitionTransaction,
  determineTransactionType,
  requiresWorkspaceProvisioning
} from "./subscription.rules.js";

describe("determineTransactionType", () => {
  it("returns NEW without an existing subscription", () => {
    expect(determineTransactionType(undefined, "standard")).toBe("NEW");
  });

  it("returns RENEW when the selected plan is the current plan", () => {
    expect(determineTransactionType({ planId: "standard" }, "standard")).toBe("RENEW");
  });

  it("returns UPGRADE when the selected plan differs", () => {
    expect(determineTransactionType({ planId: "standard" }, "premium")).toBe("UPGRADE");
  });
});

describe("calculateRenewedEndDate", () => {
  const now = new Date("2026-07-02T00:00:00.000Z");

  it("adds 30 days from the existing end date when it is in the future", () => {
    const currentEndDate = new Date("2026-07-20T00:00:00.000Z");

    expect(calculateRenewedEndDate(now, currentEndDate).toISOString()).toBe(
      "2026-08-19T00:00:00.000Z"
    );
  });

  it("adds 30 days from now when the existing end date has expired", () => {
    const currentEndDate = new Date("2026-06-01T00:00:00.000Z");

    expect(calculateRenewedEndDate(now, currentEndDate).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z"
    );
  });
});

describe("canTransitionTransaction", () => {
  it("allows a pending transaction to reach every terminal status", () => {
    expect(canTransitionTransaction("PENDING", "COMPLETED")).toBe(true);
    expect(canTransitionTransaction("PENDING", "FAILED")).toBe(true);
    expect(canTransitionTransaction("PENDING", "CANCELLED")).toBe(true);
  });

  it("does not allow a terminal transaction to transition again", () => {
    expect(canTransitionTransaction("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionTransaction("FAILED", "COMPLETED")).toBe(false);
    expect(canTransitionTransaction("CANCELLED", "COMPLETED")).toBe(false);
  });
});

describe("requiresWorkspaceProvisioning", () => {
  it("provisions for a new purchase and an upgrade", () => {
    expect(requiresWorkspaceProvisioning("NEW")).toBe(true);
    expect(requiresWorkspaceProvisioning("UPGRADE")).toBe(true);
  });

  it("does not provision for a renewal", () => {
    expect(requiresWorkspaceProvisioning("RENEW")).toBe(false);
  });
});
