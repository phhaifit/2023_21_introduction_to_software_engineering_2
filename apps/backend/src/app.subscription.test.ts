import type { PaymentTransaction, Plan, Subscription } from "@ai-agent-platform/shared";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const standard: Plan = {
  id: "standard",
  name: "Standard",
  monthlyPrice: 199000,
  cpu: 2,
  ramGb: 4,
  storageGb: 20,
  maxAgents: 5,
  supportLevel: "Standard",
  active: true
};

const transaction: PaymentTransaction = {
  id: "transaction-1",
  userId: "local-user",
  workspaceId: "default-workspace",
  planId: "standard",
  type: "NEW",
  amount: 199000,
  status: "PENDING",
  gatewayTransactionId: "gateway-1",
  paymentUrl: "/app/subscription/mock-payment/gateway-1",
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z"
};

const subscription: Subscription = {
  id: "subscription-1",
  userId: "local-user",
  workspaceId: "default-workspace",
  planId: "standard",
  status: "ACTIVE",
  startDate: "2026-07-02T00:00:00.000Z",
  endDate: "2026-08-01T00:00:00.000Z",
  workspaceStatus: "ACTIVE",
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z"
};

const serviceMocks = vi.hoisted(() => ({
  listPlansService: vi.fn(),
  getMySubscriptionService: vi.fn(),
  listAllSubscriptionsService: vi.fn(),
  createCheckout: vi.fn(),
  getPaymentStatus: vi.fn(),
  completePayment: vi.fn(),
  failPayment: vi.fn(),
  cancelPayment: vi.fn()
}));

vi.mock("./services/subscriptions.service.js", () => ({
  listPlansService: serviceMocks.listPlansService,
  getMySubscriptionService: serviceMocks.getMySubscriptionService,
  listAllSubscriptionsService: serviceMocks.listAllSubscriptionsService
}));

vi.mock("./services/payments.service.js", () => ({
  paymentsService: {
    createCheckout: serviceMocks.createCheckout,
    getPaymentStatus: serviceMocks.getPaymentStatus,
    completePayment: serviceMocks.completePayment,
    failPayment: serviceMocks.failPayment,
    cancelPayment: serviceMocks.cancelPayment
  }
}));

import { app } from "./app.js";

describe("subscription payment HTTP API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listPlansService.mockResolvedValue([standard]);
    serviceMocks.getMySubscriptionService.mockResolvedValue(subscription);
    serviceMocks.listAllSubscriptionsService.mockResolvedValue({
      items: [{ ...subscription, plan: standard }],
      total: 1
    });
    serviceMocks.createCheckout.mockResolvedValue({ transaction, reused: false });
    serviceMocks.getPaymentStatus.mockResolvedValue({ transaction, subscription });
    serviceMocks.completePayment.mockResolvedValue({
      transaction: { ...transaction, status: "COMPLETED" },
      subscription
    });
    serviceMocks.failPayment.mockResolvedValue({
      transaction: { ...transaction, status: "FAILED" }
    });
    serviceMocks.cancelPayment.mockResolvedValue({
      transaction: { ...transaction, status: "CANCELLED" }
    });
  });

  it("lists active plans", async () => {
    const response = await request(app).get("/api/plans");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([standard]);
  });

  it("rejects checkout without a plan id", async () => {
    const response = await request(app).post("/api/payments/checkout").send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
    expect(serviceMocks.createCheckout).not.toHaveBeenCalled();
  });

  it("creates checkout using local identity", async () => {
    const response = await request(app)
      .post("/api/payments/checkout")
      .send({ planId: "standard" });

    expect(response.status).toBe(201);
    expect(serviceMocks.createCheckout).toHaveBeenCalledWith(
      {
        userId: "local-user",
        workspaceId: "default-workspace",
        role: "admin"
      },
      "standard"
    );
  });

  it("completes a payment through the local mock endpoint", async () => {
    const response = await request(app).post(
      "/api/mock-payments/transaction-1/complete"
    );

    expect(response.status).toBe(200);
    expect(response.body.transaction.status).toBe("COMPLETED");
  });

  it("returns the current subscription and admin list", async () => {
    const mine = await request(app).get("/api/subscriptions/me");
    const all = await request(app).get("/api/admin/subscriptions");

    expect(mine.status).toBe(200);
    expect(mine.body.id).toBe("subscription-1");
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(1);
  });
});
