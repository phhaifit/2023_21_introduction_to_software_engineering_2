import {
  assertDemoResetAllowed,
  inspectDemoDatabase,
  resetDemoData
} from "./demoDatabase.js";
import { db } from "./knex.js";

async function main() {
  assertDemoResetAllowed(process.env.NODE_ENV);
  await inspectDemoDatabase(db);
  const result = await resetDemoData(db, process.env.NODE_ENV);
  console.log(
    `Demo data reset: ${result.workspaceOperations} workspace operation(s), ${result.paymentTransactions} payment transaction(s), ${result.subscriptions} subscription(s) deleted.`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
