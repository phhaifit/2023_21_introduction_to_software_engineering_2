import { inspectDemoDatabase } from "./demoDatabase.js";
import { db } from "./knex.js";

async function main() {
  const migrationVersion = await db.migrate.currentVersion();
  if (migrationVersion === "none") {
    throw new Error("No database migrations have been applied");
  }

  const status = await inspectDemoDatabase(db);
  console.log(`Database ready at migration ${migrationVersion}.`);
  console.log(`Demo plans: ${status.planIds.join(", ")}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
