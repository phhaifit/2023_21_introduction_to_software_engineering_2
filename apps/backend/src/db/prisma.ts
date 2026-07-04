import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

const localDatabaseUrl = "postgresql://postgres:postgres@localhost:5433/ai_agent_platform?schema=public";
const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;

const adapter = new PrismaPg(databaseUrl);

export const prisma = new PrismaClient({
  adapter
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
