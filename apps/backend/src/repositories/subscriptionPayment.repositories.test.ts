import type { Knex } from "knex";
import { newDb } from "pg-mem";
import { beforeEach, describe, expect, it } from "vitest";

import { up } from "../db/migrations/202607020001_create_subscription_payment_tables.js";
import { createPaymentTransactionsRepository } from "./paymentTransactions.repository.js";
import { createPlansRepository } from "./plans.repository.js";
import { createSubscriptionsRepository } from "./subscriptions.repository.js";

describe("subscription payment repositories", () => {
  let database: Knex;

  beforeEach(async () => {
    const memoryDatabase = newDb();
    database = memoryDatabase.adapters.createKnex();
    await up(database);
  });

  it("seeds and lists the two active plans", async () => {
    const plansRepository = createPlansRepository(database);

    const plans = await plansRepository.listActivePlans();

    expect(plans.map((plan) => plan.name)).toEqual(["Standard", "Premium"]);
    expect(plans.map((plan) => plan.monthlyPrice)).toEqual([199000, 299000]);
  });

  it("creates and retrieves a subscription for a user", async () => {
    const subscriptionsRepository = createSubscriptionsRepository(database);

    const created = await subscriptionsRepository.createSubscription({
      userId: "user-1",
      workspaceId: "workspace-1",
      planId: "standard",
      status: "ACTIVE",
      startDate: new Date("2026-07-02T00:00:00.000Z"),
      endDate: new Date("2026-08-01T00:00:00.000Z"),
      workspaceStatus: "ACTIVE"
    });

    const found = await subscriptionsRepository.getSubscriptionByUserId("user-1");

    expect(found).toEqual(created);
  });

  it("transitions only pending transactions and records fulfillment", async () => {
    const transactionsRepository = createPaymentTransactionsRepository(database);
    const created = await transactionsRepository.createPaymentTransaction({
      userId: "user-1",
      workspaceId: "workspace-1",
      planId: "standard",
      type: "NEW",
      amount: 199000,
      gatewayTransactionId: "gateway-1",
      paymentUrl: "/mock/gateway-1"
    });

    const completed = await transactionsRepository.transitionPendingTransaction(
      created.id,
      "COMPLETED"
    );
    const secondTransition = await transactionsRepository.transitionPendingTransaction(
      created.id,
      "CANCELLED"
    );
    await transactionsRepository.markFulfilled(created.id);
    const fulfilled = await transactionsRepository.getPaymentTransactionById(created.id);

    expect(completed?.status).toBe("COMPLETED");
    expect(secondTransition).toBeUndefined();
    expect(fulfilled?.fulfillmentCompletedAt).toBeTruthy();
  });
});
