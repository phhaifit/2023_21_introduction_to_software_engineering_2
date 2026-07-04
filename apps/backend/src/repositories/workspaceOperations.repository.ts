import type {
  AdminWorkspaceOperationListResponse,
  WorkspaceOperationAction,
  WorkspaceOperationStatus,
  WorkspaceProvisioningOperation
} from "@ai-agent-platform/shared";
import type { Knex } from "knex";

import { createUuid, db } from "../db/knex.js";

type WorkspaceOperationRow = {
  id: string;
  transaction_id: string;
  subscription_id: string;
  workspace_id: string;
  plan_id: string;
  action: WorkspaceOperationAction;
  status: WorkspaceOperationStatus;
  idempotency_key: string;
  failure_code: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CreateWorkspaceOperationRecord = {
  transactionId: string;
  subscriptionId: string;
  workspaceId: string;
  planId: string;
  action: WorkspaceOperationAction;
  idempotencyKey: string;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function mapOperation(row: WorkspaceOperationRow): WorkspaceProvisioningOperation {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    subscriptionId: row.subscription_id,
    workspaceId: row.workspace_id,
    planId: row.plan_id,
    action: row.action,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    failureCode: row.failure_code ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function createWorkspaceOperationsRepository(database: Knex = db) {
  async function findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<WorkspaceProvisioningOperation | undefined> {
    const row = await database<WorkspaceOperationRow>("workspace_provisioning_operations")
      .where({ idempotency_key: idempotencyKey })
      .first();
    return row ? mapOperation(row) : undefined;
  }

  async function getById(id: string): Promise<WorkspaceProvisioningOperation | undefined> {
    const row = await database<WorkspaceOperationRow>("workspace_provisioning_operations")
      .where({ id })
      .first();
    return row ? mapOperation(row) : undefined;
  }

  return {
    async createPendingOperation(
      input: CreateWorkspaceOperationRecord
    ): Promise<WorkspaceProvisioningOperation> {
      const now = new Date();
      const row: WorkspaceOperationRow = {
        id: createUuid(),
        transaction_id: input.transactionId,
        subscription_id: input.subscriptionId,
        workspace_id: input.workspaceId,
        plan_id: input.planId,
        action: input.action,
        status: "PENDING",
        idempotency_key: input.idempotencyKey,
        failure_code: null,
        created_at: now,
        updated_at: now
      };

      await database<WorkspaceOperationRow>("workspace_provisioning_operations")
        .insert(row)
        .onConflict("idempotency_key")
        .ignore();

      const persisted = await findByIdempotencyKey(input.idempotencyKey);
      if (!persisted) {
        throw new Error("Failed to persist workspace provisioning operation");
      }
      return persisted;
    },

    async markCompleted(id: string): Promise<WorkspaceProvisioningOperation | undefined> {
      await database<WorkspaceOperationRow>("workspace_provisioning_operations")
        .where({ id, status: "PENDING" })
        .update({ status: "COMPLETED", updated_at: new Date() });
      return getById(id);
    },

    async markFailed(
      id: string,
      failureCode: string
    ): Promise<WorkspaceProvisioningOperation | undefined> {
      await database<WorkspaceOperationRow>("workspace_provisioning_operations")
        .where({ id, status: "PENDING" })
        .update({ status: "FAILED", failure_code: failureCode, updated_at: new Date() });
      return getById(id);
    },

    async listRecent(limit: number): Promise<AdminWorkspaceOperationListResponse> {
      const rows = await database<WorkspaceOperationRow>("workspace_provisioning_operations")
        .select("*")
        .orderBy("created_at", "desc")
        .limit(limit);
      return {
        items: rows.map(mapOperation),
        total: rows.length
      };
    }
  };
}

export const workspaceOperationsRepository = createWorkspaceOperationsRepository();
