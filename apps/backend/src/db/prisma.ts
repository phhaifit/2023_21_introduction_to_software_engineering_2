import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

const adapter = new PrismaPg(databaseUrl);

export const prisma = new PrismaClient({
  adapter
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
