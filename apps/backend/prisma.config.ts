import "dotenv/config";

import { defineConfig } from "prisma/config";

const localDatabaseUrl = "postgresql://postgres:postgres@localhost:5433/ai_agent_platform?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl
  }
});
