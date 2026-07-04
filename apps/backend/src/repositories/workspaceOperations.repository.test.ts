import type { Knex } from "knex";
import { newDb } from "pg-mem";
import { beforeEach, describe, expect, it } from "vitest";

import { up as createBaseTables } from "../db/migrations/202607020001_create_subscription_payment_tables.js";
import { up as createOperationsTable } from "../db/migrations/202607040001_create_workspace_provisioning_operations.js";
import { createWorkspaceOperationsRepository } from "./workspaceOperations.repository.js";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const transactionId = "20000000-0000-4000-8000-000000000001";

async function seedForeignRows(database: Knex): Promise<void> {
  await database("subscriptions").insert({
    id: subscriptionId,
    user_id: "demo-user",
    workspace_id: "default-workspace",
    plan_id: "premium",
    status: "ACTIVE",
    start_date: new Date("2026-07-04T00:00:00.000Z"),
    end_date: new Date("2026-08-03T00:00:00.000Z"),
    workspace_status: "PROVISIONING"
  });
  await database("payment_transactions").insert({
    id: transactionId,
    user_id: "demo-user",
    workspace_id: "default-workspace",
    subscription_id: subscriptionId,
    plan_id: "premium",
    type: "NEW",
    amount: 299000,
    status: "COMPLETED",
    gateway_transaction_id: "gateway-1",
    payment_url: "/mock/gateway-1"
  });
}

function createInput() {
  return {
    transactionId,
    subscriptionId,
    workspaceId: "default-workspace",
    planId: "premium",
    action: "PROVISION" as const,
    idempotencyKey: transactionId
  };
}

describe("workspace operations repository", () => {
  let database: Knex;

  beforeEach(async () => {
    database = newDb().adapters.createKnex();
    await createBaseTables(database);
    await createOperationsTable(database);
    await seedForeignRows(database);
  });

  async function countOperations(): Promise<number> {
    const rows = await database("workspace_provisioning_operations");
    return rows.length;
  }

  it("creates a pending operation and ignores duplicate idempotency keys", async () => {
    const repository = createWorkspaceOperationsRepository(database);

    const first = await repository.createPendingOperation(createInput());
    const second = await repository.createPendingOperation(createInput());

    expect(first.status).toBe("PENDING");
    expect(first.action).toBe("PROVISION");
    expect(first.idempotencyKey).toBe(transactionId);
    expect(second.id).toBe(first.id);
    expect(await countOperations()).toBe(1);
  });

  it("marks an operation completed", async () => {
    const repository = createWorkspaceOperationsRepository(database);
    const first = await repository.createPendingOperation(createInput());

    const completed = await repository.markCompleted(first.id);

    expect(completed?.status).toBe("COMPLETED");
  });

  it("marks an operation failed with a failure code", async () => {
    const repository = createWorkspaceOperationsRepository(database);
    const first = await repository.createPendingOperation(createInput());

    const failed = await repository.markFailed(first.id, "WORKSPACE_PROVISIONING_FAILED");

    expect(failed).toMatchObject({
      status: "FAILED",
      failureCode: "WORKSPACE_PROVISIONING_FAILED"
    });
  });

  it("lists the most recent operations", async () => {
    const repository = createWorkspaceOperationsRepository(database);
    await repository.createPendingOperation(createInput());

    const recent = await repository.listRecent(50);

    expect(recent.total).toBe(1);
    expect(recent.items[0].transactionId).toBe(transactionId);
  });
});
