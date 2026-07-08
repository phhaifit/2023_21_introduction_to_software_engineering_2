import type { Knex } from "knex";
import { newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { up as createBaseTables } from "./migrations/202607020001_create_subscription_payment_tables.js";
import { up as createOperationsTable } from "./migrations/202607040001_create_workspace_provisioning_operations.js";
import {
  assertDemoResetAllowed,
  inspectDemoDatabase,
  resetDemoData
} from "./demoDatabase.js";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const transactionId = "20000000-0000-4000-8000-000000000001";

describe("demo database", () => {
  let database: Knex;

  beforeEach(async () => {
    database = newDb().adapters.createKnex();
    await createBaseTables(database);
    await createOperationsTable(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it("rejects demo reset in production", () => {
    expect(() => assertDemoResetAllowed("production")).toThrow(
      "Demo reset is disabled in production"
    );
  });

  it("clears operations, transactions and subscriptions while preserving plans", async () => {
    await database("subscriptions").insert({
      id: subscriptionId,
      user_id: "demo-user",
      workspace_id: "demo-workspace",
      plan_id: "standard",
      status: "ACTIVE",
      start_date: new Date("2026-07-02T00:00:00.000Z"),
      end_date: new Date("2026-08-01T00:00:00.000Z"),
      workspace_status: "ACTIVE"
    });
    await database("payment_transactions").insert({
      id: transactionId,
      user_id: "demo-user",
      workspace_id: "demo-workspace",
      subscription_id: subscriptionId,
      plan_id: "standard",
      type: "NEW",
      amount: 199000,
      status: "COMPLETED",
      gateway_transaction_id: "demo-gateway-1",
      payment_url: "/demo/payment"
    });
    await database("workspace_provisioning_operations").insert({
      id: "30000000-0000-4000-8000-000000000001",
      transaction_id: transactionId,
      subscription_id: subscriptionId,
      workspace_id: "demo-workspace",
      plan_id: "standard",
      action: "PROVISION",
      status: "COMPLETED",
      idempotency_key: transactionId
    });

    const result = await resetDemoData(database, "development");

    expect(result).toEqual({
      workspaceOperations: 1,
      paymentTransactions: 1,
      subscriptions: 1
    });
    expect(await database("workspace_provisioning_operations")).toHaveLength(0);
    expect(await database("payment_transactions")).toHaveLength(0);
    expect(await database("subscriptions")).toHaveLength(0);
    expect(await database("plans").orderBy("id")).toHaveLength(2);
  });

  it("reports the required tables including workspace operations", async () => {
    const status = await inspectDemoDatabase(database);

    expect(status.requiredTables).toContain("workspace_provisioning_operations");
  });

  it("reports a missing required plan", async () => {
    await database("plans").where({ id: "premium" }).delete();

    await expect(inspectDemoDatabase(database)).rejects.toThrow(
      "Missing required demo plans: premium"
    );
  });
});
