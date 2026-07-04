import type {
  PaymentTransaction,
  TransactionStatus,
  TransactionType
} from "@ai-agent-platform/shared";
import type { Knex } from "knex";

import { createUuid, db } from "../db/knex.js";

type PaymentTransactionRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  subscription_id: string | null;
  plan_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  gateway_transaction_id: string;
  payment_url: string;
  fulfillment_completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CreatePaymentTransactionRecord = {
  id?: string;
  userId: string;
  workspaceId: string;
  subscriptionId?: string;
  planId: string;
  type: TransactionType;
  amount: number;
  gatewayTransactionId: string;
  paymentUrl: string;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function mapTransaction(row: PaymentTransactionRow): PaymentTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    subscriptionId: row.subscription_id ?? undefined,
    planId: row.plan_id,
    type: row.type,
    amount: Number(row.amount),
    status: row.status,
    gatewayTransactionId: row.gateway_transaction_id,
    paymentUrl: row.payment_url,
    fulfillmentCompletedAt: row.fulfillment_completed_at
      ? toIso(row.fulfillment_completed_at)
      : undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function createPaymentTransactionsRepository(database: Knex = db) {
  return {
    async createPaymentTransaction(
      input: CreatePaymentTransactionRecord,
      transaction: Knex.Transaction | Knex = database
    ): Promise<PaymentTransaction> {
      const now = new Date();
      const row: PaymentTransactionRow = {
        id: input.id ?? createUuid(),
        user_id: input.userId,
        workspace_id: input.workspaceId,
        subscription_id: input.subscriptionId ?? null,
        plan_id: input.planId,
        type: input.type,
        amount: input.amount,
        status: "PENDING",
        gateway_transaction_id: input.gatewayTransactionId,
        payment_url: input.paymentUrl,
        fulfillment_completed_at: null,
        created_at: now,
        updated_at: now
      };
      await transaction<PaymentTransactionRow>("payment_transactions").insert(row);
      return mapTransaction(row);
    },

    async getPaymentTransactionById(id: string): Promise<PaymentTransaction | undefined> {
      const row = await database<PaymentTransactionRow>("payment_transactions")
        .select("*")
        .where({ id })
        .first();
      return row ? mapTransaction(row) : undefined;
    },

    async findRecentPendingTransaction(
      userId: string,
      planId: string,
      type: TransactionType
    ): Promise<PaymentTransaction | undefined> {
      const threshold = new Date(Date.now() - 5 * 60 * 1000);
      const row = await database<PaymentTransactionRow>("payment_transactions")
        .select("*")
        .where({ user_id: userId, plan_id: planId, type, status: "PENDING" })
        .where("created_at", ">=", threshold)
        .orderBy("created_at", "desc")
        .first();
      return row ? mapTransaction(row) : undefined;
    },

    async transitionPendingTransaction(
      id: string,
      status: Exclude<TransactionStatus, "PENDING">,
      transaction: Knex.Transaction | Knex = database
    ): Promise<PaymentTransaction | undefined> {
      const updated = await transaction<PaymentTransactionRow>("payment_transactions")
        .where({ id, status: "PENDING" })
        .update({ status, updated_at: new Date() });
      if (!updated) return undefined;
      const row = await transaction<PaymentTransactionRow>("payment_transactions")
        .select("*")
        .where({ id })
        .first();
      return row ? mapTransaction(row) : undefined;
    },

    async markFulfilled(
      id: string,
      transaction: Knex.Transaction | Knex = database
    ): Promise<void> {
      await transaction<PaymentTransactionRow>("payment_transactions")
        .where({ id })
        .whereNull("fulfillment_completed_at")
        .update({ fulfillment_completed_at: new Date(), updated_at: new Date() });
    }
  };
}

export const paymentTransactionsRepository = createPaymentTransactionsRepository();
