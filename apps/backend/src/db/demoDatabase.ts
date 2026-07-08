import type { Knex } from "knex";

const requiredTables = [
  "plans",
  "subscriptions",
  "payment_transactions",
  "workspace_provisioning_operations"
] as const;
const requiredPlanIds = ["standard", "premium"] as const;

export type DemoResetResult = {
  workspaceOperations: number;
  paymentTransactions: number;
  subscriptions: number;
};

export type DemoDatabaseStatus = {
  requiredTables: string[];
  planIds: string[];
};

export function assertDemoResetAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv?.toLowerCase() === "production") {
    throw new Error("Demo reset is disabled in production");
  }
}

export async function resetDemoData(
  database: Knex,
  nodeEnv: string | undefined
): Promise<DemoResetResult> {
  assertDemoResetAllowed(nodeEnv);

  return database.transaction(async (transaction) => {
    const workspaceOperations = await transaction(
      "workspace_provisioning_operations"
    ).delete();
    const paymentTransactions = await transaction("payment_transactions").delete();
    const subscriptions = await transaction("subscriptions").delete();

    return { workspaceOperations, paymentTransactions, subscriptions };
  });
}

export async function inspectDemoDatabase(database: Knex): Promise<DemoDatabaseStatus> {
  const missingTables: string[] = [];
  for (const table of requiredTables) {
    if (!(await database.schema.hasTable(table))) {
      missingTables.push(table);
    }
  }
  if (missingTables.length > 0) {
    throw new Error(`Missing required demo tables: ${missingTables.join(", ")}`);
  }

  const rows = (await database("plans").select("id").orderBy("id")) as Array<{
    id: string;
  }>;
  const planIds = rows.map((row) => row.id);
  const missingPlanIds = requiredPlanIds.filter((id) => !planIds.includes(id));
  if (missingPlanIds.length > 0) {
    throw new Error(`Missing required demo plans: ${missingPlanIds.join(", ")}`);
  }

  return { requiredTables: [...requiredTables], planIds };
}
