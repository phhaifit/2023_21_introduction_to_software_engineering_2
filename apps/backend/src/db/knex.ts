import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import knex, { type Knex } from "knex";

function resolveConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }

  return {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5433),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "ai_agent_platform"
  };
}

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

export const db: Knex = knex({
  client: "pg",
  connection: resolveConnection(),
  migrations: {
    directory: path.join(currentDirectory, "migrations")
  }
});

export function createUuid() {
  return randomUUID();
}