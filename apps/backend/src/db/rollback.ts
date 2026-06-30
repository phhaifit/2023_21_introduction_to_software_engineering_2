import { db } from "./knex.js";

async function main() {
  await db.migrate.rollback();
  await db.destroy();
}

main().catch(async (error) => {
  console.error(error);
  await db.destroy();
  process.exitCode = 1;
});