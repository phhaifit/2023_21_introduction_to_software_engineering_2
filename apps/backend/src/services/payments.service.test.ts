import type {
  AdminSubscriptionListResponse,
  PaymentTransaction,
  Plan,
  Subscription,
  TransactionStatus,
  TransactionType,
  WorkspaceProvisioningOperation
} from "@ai-agent-platform/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { createPaymentsService } from "./payments.service.js";

const identity = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "admin" as const
};

const standard: Plan = {
  id: "standard",
  name: "Standard",
  monthlyPrice: 199000,
  cpu: 2,
  ramGb: 4,
  storageGb: 20,
  maxAgents: 5,
  supportLevel: "Standard",
  active: true
};

const premium: Plan = {
  id: "premium",
  name: "Premium",
  monthlyPrice: 299000,
  cpu: 4,
  ramGb: 8,
  storageGb: 40,
  maxAgents: 20,
  supportLevel: "Priority",
  active: true
};

function createHarness() {
  const plans = [standard, premium];
  const subscriptions: Subscription[] = [];
  const transactions: PaymentTransaction[] = [];
  const provisionCalls: string[] = [];
  const provisioningIdempotencyKeys: string[] = [];
  const updatePlanCalls: string[] = [];
  let transactionSequence = 0;
  let subscriptionSequence = 0;
  let provisioningShouldFail = false;

  const planRepository = {
    async listActivePlans() {
      return plans;
    },
    async getActivePlanById(id: string) {
      return plans.find((plan) => plan.id === id);
    }
  };

  const subscriptionRepository = {
    async getSubscriptionByUserId(userId: string) {
      return subscriptions.find((subscription) => subscription.userId === userId);
    },
    async createSubscription(input: {
      userId: string;
      workspaceId: string;
      planId: string;
      status: Subscription["status"];
      startDate: Date;
      endDate: Date;
      workspaceStatus: Subscription["workspaceStatus"];
    }) {
      const now = new Date("2026-07-02T00:00:00.000Z").toISOString();
      const subscription: Subscription = {
        id: `subscription-${++subscriptionSequence}`,
        userId: input.userId,
        workspaceId: input.workspaceId,
        planId: input.planId,
        status: input.status,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
        workspaceStatus: input.workspaceStatus,
        createdAt: now,
        updatedAt: now
      };
      subscriptions.push(subscription);
      return subscription;
    },
    async updateSubscription(
      id: string,
      input: Partial<
        Pick<Subscription, "planId" | "status" | "workspaceStatus">
      > & { endDate?: Date }
    ) {
      const subscription = subscriptions.find((candidate) => candidate.id === id);
      if (!subscription) return undefined;
      if (input.planId) subscription.planId = input.planId;
      if (input.status) subscription.status = input.status;
      if (input.workspaceStatus) subscription.workspaceStatus = input.workspaceStatus;
      if (input.endDate) subscription.endDate = input.endDate.toISOString();
      return subscription;
    },
    async listSubscriptions(): Promise<AdminSubscriptionListResponse> {
      return {
        items: subscriptions.map((subscription) => ({
          ...subscription,
          plan: plans.find((plan) => plan.id === subscription.planId) ?? standard
        })),
        total: subscriptions.length
      };
    }
  };

  const transactionRepository = {
    async createPaymentTransaction(input: {
      id?: string;
      userId: string;
      workspaceId: string;
      subscriptionId?: string;
      planId: string;
      type: TransactionType;
      amount: number;
      gatewayTransactionId: string;
      paymentUrl: string;
    }) {
      const now = new Date("2026-07-02T00:00:00.000Z").toISOString();
      transactionSequence += 1;
      const transaction: PaymentTransaction = {
        id: input.id ?? `transaction-${transactionSequence}`,
        ...input,
        status: "PENDING",
        createdAt: now,
        updatedAt: now
      };
      transactions.push(transaction);
      return transaction;
    },
    async getPaymentTransactionById(id: string) {
      return transactions.find((transaction) => transaction.id === id);
    },
    async findRecentPendingTransaction(
      userId: string,
      planId: string,
      type: TransactionType
    ) {
      return transactions.find(
        (transaction) =>
          transaction.userId === userId &&
          transaction.planId === planId &&
          transaction.type === type &&
          transaction.status === "PENDING"
      );
    },
    async transitionPendingTransaction(
      id: string,
      status: Exclude<TransactionStatus, "PENDING">
    ) {
      const transaction = transactions.find((candidate) => candidate.id === id);
      if (!transaction || transaction.status !== "PENDING") return undefined;
      transaction.status = status;
      return transaction;
    },
    async markFulfilled(id: string) {
      const transaction = transactions.find((candidate) => candidate.id === id);
      if (transaction && !transaction.fulfillmentCompletedAt) {
        transaction.fulfillmentCompletedAt = "2026-07-02T00:00:00.000Z";
      }
    }
  };

  const paymentGateway = {
    async createPaymentSession(input: { transactionId: string; gatewayTransactionId: string }) {
      return { paymentUrl: `/app/subscription/mock-payment/${input.transactionId}` };
    }
  };

  const workspaceProvisioner = {
    async provision(input: { subscriptionId: string; idempotencyKey?: string }) {
      provisionCalls.push(input.subscriptionId);
      provisioningIdempotencyKeys.push(input.idempotencyKey ?? "");
      if (provisioningShouldFail) throw new Error("Provisioning failed");
    },
    async updatePlan(input: { subscriptionId: string }) {
      updatePlanCalls.push(input.subscriptionId);
      if (provisioningShouldFail) throw new Error("Provisioning failed");
    }
  };

  const workspaceOperations: WorkspaceProvisioningOperation[] = [];
  let operationSequence = 0;

  const workspaceOperationRepository = {
    async createPendingOperation(input: {
      transactionId: string;
      subscriptionId: string;
      workspaceId: string;
      planId: string;
      action: WorkspaceProvisioningOperation["action"];
      idempotencyKey: string;
    }) {
      const existing = workspaceOperations.find(
        (operation) => operation.idempotencyKey === input.idempotencyKey
      );
      if (existing) return existing;
      const now = new Date("2026-07-02T00:00:00.000Z").toISOString();
      const operation: WorkspaceProvisioningOperation = {
        id: `operation-${++operationSequence}`,
        transactionId: input.transactionId,
        subscriptionId: input.subscriptionId,
        workspaceId: input.workspaceId,
        planId: input.planId,
        action: input.action,
        status: "PENDING",
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
        updatedAt: now
      };
      workspaceOperations.push(operation);
      return operation;
    },
    async markCompleted(id: string) {
      const operation = workspaceOperations.find((candidate) => candidate.id === id);
      if (!operation || operation.status !== "PENDING") return undefined;
      operation.status = "COMPLETED";
      return operation;
    },
    async markFailed(id: string, failureCode: string) {
      const operation = workspaceOperations.find((candidate) => candidate.id === id);
      if (!operation || operation.status !== "PENDING") return undefined;
      operation.status = "FAILED";
      operation.failureCode = failureCode;
      return operation;
    }
  };

  const service = createPaymentsService({
    planRepository,
    subscriptionRepository,
    transactionRepository,
    workspaceOperationRepository,
    paymentGateway,
    workspaceProvisioner,
    now: () => new Date("2026-07-02T00:00:00.000Z"),
    createTransactionId: () => `transaction-${transactionSequence + 1}`,
    createGatewayTransactionId: () => `gateway-${transactionSequence + 1}`
  });

  return {
    service,
    subscriptions,
    transactions,
    provisionCalls,
    provisioningIdempotencyKeys,
    updatePlanCalls,
    workspaceOperations,
    setProvisioningFailure(value: boolean) {
      provisioningShouldFail = value;
    }
  };
}

describe("payments service", () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
  });

  it("creates checkout using the server-side plan price", async () => {
    const result = await harness.service.createCheckout(identity, "standard");

    expect(result.transaction.amount).toBe(199000);
    expect(result.transaction.type).toBe("NEW");
    expect(result.transaction.status).toBe("PENDING");
    expect(result.transaction.paymentUrl).toContain(result.transaction.id);
  });

  it("reports a missing plan as a typed not-found error", async () => {
    await expect(harness.service.createCheckout(identity, "missing")).rejects.toMatchObject({
      code: "PLAN_NOT_FOUND",
      status: 404
    });
  });

  it("reuses a matching pending transaction", async () => {
    const first = await harness.service.createCheckout(identity, "standard");
    const second = await harness.service.createCheckout(identity, "standard");

    expect(second.transaction.id).toBe(first.transaction.id);
    expect(second.reused).toBe(true);
    expect(harness.transactions).toHaveLength(1);
  });

  it("rejects downgrading from Premium to Standard", async () => {
    const premiumCheckout = await harness.service.createCheckout(identity, "premium");
    await harness.service.completePayment(premiumCheckout.transaction.id);

    await expect(harness.service.createCheckout(identity, "standard")).rejects.toMatchObject({
      code: "SUBSCRIPTION_CONFLICT",
      status: 409
    });
  });

  it("completes a new purchase once and provisions a workspace once", async () => {
    const checkout = await harness.service.createCheckout(identity, "standard");

    const first = await harness.service.completePayment(checkout.transaction.id);
    const second = await harness.service.completePayment(checkout.transaction.id);

    expect(first.transaction.status).toBe("COMPLETED");
    expect(first.subscription?.status).toBe("ACTIVE");
    expect(second.subscription?.id).toBe(first.subscription?.id);
    expect(harness.subscriptions).toHaveLength(1);
    expect(harness.provisionCalls).toHaveLength(1);
    expect(harness.provisioningIdempotencyKeys).toEqual([checkout.transaction.id]);
  });

  it("renews from the current end date without provisioning again", async () => {
    const initial = await harness.service.createCheckout(identity, "standard");
    await harness.service.completePayment(initial.transaction.id);
    harness.subscriptions[0].endDate = "2026-07-20T00:00:00.000Z";

    const renewal = await harness.service.createCheckout(identity, "standard");
    const result = await harness.service.completePayment(renewal.transaction.id);

    expect(renewal.transaction.type).toBe("RENEW");
    expect(result.subscription?.endDate).toBe("2026-08-19T00:00:00.000Z");
    expect(harness.provisionCalls).toHaveLength(1);
  });

  it("does not allow cancel to overwrite a completed transaction", async () => {
    const checkout = await harness.service.createCheckout(identity, "standard");
    await harness.service.completePayment(checkout.transaction.id);

    const result = await harness.service.cancelPayment(identity, checkout.transaction.id);

    expect(result.transaction.status).toBe("COMPLETED");
  });

  it("keeps subscription active when workspace provisioning fails", async () => {
    harness.setProvisioningFailure(true);
    const checkout = await harness.service.createCheckout(identity, "premium");

    const result = await harness.service.completePayment(checkout.transaction.id);

    expect(result.transaction.status).toBe("COMPLETED");
    expect(result.subscription?.status).toBe("ACTIVE");
    expect(result.subscription?.workspaceStatus).toBe("PROVISIONING_FAILED");
  });

  it("records a completed provision operation for a new purchase", async () => {
    const checkout = await harness.service.createCheckout(identity, "standard");
    await harness.service.completePayment(checkout.transaction.id);

    expect(harness.workspaceOperations).toHaveLength(1);
    expect(harness.workspaceOperations[0]).toMatchObject({
      action: "PROVISION",
      status: "COMPLETED",
      idempotencyKey: checkout.transaction.id
    });
  });

  it("records a failed operation when provisioning fails", async () => {
    harness.setProvisioningFailure(true);
    const checkout = await harness.service.createCheckout(identity, "premium");

    const result = await harness.service.completePayment(checkout.transaction.id);

    expect(result.transaction.status).toBe("COMPLETED");
    expect(result.subscription?.status).toBe("ACTIVE");
    expect(result.subscription?.workspaceStatus).toBe("PROVISIONING_FAILED");
    expect(harness.workspaceOperations[0]).toMatchObject({
      status: "FAILED",
      failureCode: "WORKSPACE_PROVISIONING_FAILED"
    });
  });

  it("does not create a workspace operation for a renewal", async () => {
    const initial = await harness.service.createCheckout(identity, "standard");
    await harness.service.completePayment(initial.transaction.id);
    harness.subscriptions[0].endDate = "2026-07-20T00:00:00.000Z";

    const operationCountBeforeRenew = harness.workspaceOperations.length;
    const renewal = await harness.service.createCheckout(identity, "standard");
    await harness.service.completePayment(renewal.transaction.id);

    expect(harness.workspaceOperations).toHaveLength(operationCountBeforeRenew);
  });

  it("creates a single operation when completion runs twice", async () => {
    const checkout = await harness.service.createCheckout(identity, "standard");

    await harness.service.completePayment(checkout.transaction.id);
    await harness.service.completePayment(checkout.transaction.id);

    expect(harness.workspaceOperations).toHaveLength(1);
    expect(harness.provisionCalls).toHaveLength(1);
  });

  it("records an update-plan operation for an upgrade", async () => {
    const initial = await harness.service.createCheckout(identity, "standard");
    await harness.service.completePayment(initial.transaction.id);

    const upgrade = await harness.service.createCheckout(identity, "premium");
    await harness.service.completePayment(upgrade.transaction.id);

    expect(harness.workspaceOperations.at(-1)).toMatchObject({
      action: "UPDATE_PLAN",
      planId: "premium",
      status: "COMPLETED"
    });
  });
});
