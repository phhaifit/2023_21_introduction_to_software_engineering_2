import type { Plan, PlanName } from "@ai-agent-platform/shared";
import type { Knex } from "knex";

import { db } from "../db/knex.js";

type PlanRow = {
  id: string;
  name: PlanName;
  monthly_price: number;
  cpu: number;
  ram_gb: number;
  storage_gb: number;
  max_agents: number;
  support_level: string;
  active: boolean;
};

function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    monthlyPrice: Number(row.monthly_price),
    cpu: row.cpu,
    ramGb: row.ram_gb,
    storageGb: row.storage_gb,
    maxAgents: row.max_agents,
    supportLevel: row.support_level,
    active: row.active
  };
}

export function createPlansRepository(database: Knex = db) {
  return {
    async listActivePlans(): Promise<Plan[]> {
      const rows = await database<PlanRow>("plans")
        .select("*")
        .where({ active: true })
        .orderBy("monthly_price", "asc");
      return rows.map(mapPlan);
    },

    async getActivePlanById(id: string): Promise<Plan | undefined> {
      const row = await database<PlanRow>("plans").select("*").where({ id, active: true }).first();
      return row ? mapPlan(row) : undefined;
    }
  };
}

export const plansRepository = createPlansRepository();
