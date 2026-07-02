import type {
  AdminSubscriptionListResponse,
  Plan,
  Subscription,
  SubscriptionStatus,
  WorkspaceStatus
} from "@ai-agent-platform/shared";
import type { Knex } from "knex";

import { createUuid, db } from "../db/knex.js";

type SubscriptionRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: Date | string;
  end_date: Date | string;
  workspace_status: WorkspaceStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CreateSubscriptionRecord = {
  userId: string;
  workspaceId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  workspaceStatus: WorkspaceStatus;
};

export type UpdateSubscriptionRecord = Partial<
  Pick<Subscription, "planId" | "status" | "workspaceStatus">
> & {
  endDate?: Date;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    planId: row.plan_id,
    status: row.status,
    startDate: toIso(row.start_date),
    endDate: toIso(row.end_date),
    workspaceStatus: row.workspace_status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function createSubscriptionsRepository(database: Knex = db) {
  return {
    async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
      const row = await database<SubscriptionRow>("subscriptions")
        .select("*")
        .where({ user_id: userId })
        .orderBy("created_at", "desc")
        .first();
      return row ? mapSubscription(row) : undefined;
    },

    async createSubscription(
      input: CreateSubscriptionRecord,
      transaction: Knex.Transaction | Knex = database
    ): Promise<Subscription> {
      const now = new Date();
      const row: SubscriptionRow = {
        id: createUuid(),
        user_id: input.userId,
        workspace_id: input.workspaceId,
        plan_id: input.planId,
        status: input.status,
        start_date: input.startDate,
        end_date: input.endDate,
        workspace_status: input.workspaceStatus,
        created_at: now,
        updated_at: now
      };
      await transaction<SubscriptionRow>("subscriptions").insert(row);
      return mapSubscription(row);
    },

    async updateSubscription(
      id: string,
      input: UpdateSubscriptionRecord,
      transaction: Knex.Transaction | Knex = database
    ): Promise<Subscription | undefined> {
      const updates: Partial<SubscriptionRow> = { updated_at: new Date() };
      if (input.planId) updates.plan_id = input.planId;
      if (input.status) updates.status = input.status;
      if (input.workspaceStatus) updates.workspace_status = input.workspaceStatus;
      if (input.endDate) updates.end_date = input.endDate;
      await transaction<SubscriptionRow>("subscriptions").where({ id }).update(updates);
      const row = await transaction<SubscriptionRow>("subscriptions").select("*").where({ id }).first();
      return row ? mapSubscription(row) : undefined;
    },

    async listSubscriptions(): Promise<AdminSubscriptionListResponse> {
      const rows = await database<SubscriptionRow & {
        plan_name: Plan["name"];
        monthly_price: number;
        cpu: number;
        ram_gb: number;
        storage_gb: number;
        max_agents: number;
        support_level: string;
        plan_active: boolean;
      }>("subscriptions")
        .join("plans", "subscriptions.plan_id", "plans.id")
        .select(
          "subscriptions.*",
          "plans.name as plan_name",
          "plans.monthly_price",
          "plans.cpu",
          "plans.ram_gb",
          "plans.storage_gb",
          "plans.max_agents",
          "plans.support_level",
          "plans.active as plan_active"
        )
        .orderBy("subscriptions.created_at", "desc");

      return {
        items: rows.map((row) => ({
          ...mapSubscription(row),
          plan: {
            id: row.plan_id,
            name: row.plan_name,
            monthlyPrice: Number(row.monthly_price),
            cpu: row.cpu,
            ramGb: row.ram_gb,
            storageGb: row.storage_gb,
            maxAgents: row.max_agents,
            supportLevel: row.support_level,
            active: row.plan_active
          }
        })),
        total: rows.length
      };
    }
  };
}

export const subscriptionsRepository = createSubscriptionsRepository();
