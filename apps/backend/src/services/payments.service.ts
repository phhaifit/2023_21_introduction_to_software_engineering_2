import type {
  AdminSubscriptionListResponse,
  CheckoutResponse,
  PaymentStatusResponse,
  PaymentTransaction,
  Plan,
  Subscription,
  TransactionStatus,
  TransactionType
} from "@ai-agent-platform/shared";

import {
  calculateRenewedEndDate,
  determineTransactionType,
  requiresWorkspaceProvisioning
} from "../domain/subscription.rules.js";
import { ApplicationError } from "../errors/applicationError.js";
import { mockPaymentGateway } from "../integrations/payment/mockPaymentGateway.js";
import type { PaymentGateway } from "../integrations/payment/paymentGateway.js";
import { mockWorkspaceProvisioner } from "../integrations/workspace/mockWorkspaceProvisioner.js";
import type { WorkspaceProvisioner } from "../integrations/workspace/workspaceProvisioner.js";
import {
  paymentTransactionsRepository,
  type CreatePaymentTransactionRecord
} from "../repositories/paymentTransactions.repository.js";
import { plansRepository } from "../repositories/plans.repository.js";
import {
  subscriptionsRepository,
  type CreateSubscriptionRecord,
  type UpdateSubscriptionRecord
} from "../repositories/subscriptions.repository.js";

export type RequestIdentity = {
  userId: string;
  workspaceId: string;
  role: "admin" | "member";
};

type PlanRepository = {
  listActivePlans(): Promise<Plan[]>;
  getActivePlanById(id: string): Promise<Plan | undefined>;
};

type SubscriptionRepository = {
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  createSubscription(input: CreateSubscriptionRecord): Promise<Subscription>;
  updateSubscription(id: string, input: UpdateSubscriptionRecord): Promise<Subscription | undefined>;
  listSubscriptions(): Promise<AdminSubscriptionListResponse>;
};

type PaymentTransactionRepository = {
  createPaymentTransaction(input: CreatePaymentTransactionRecord): Promise<PaymentTransaction>;
  getPaymentTransactionById(id: string): Promise<PaymentTransaction | undefined>;
  findRecentPendingTransaction(
    userId: string,
    planId: string,
    type: TransactionType
  ): Promise<PaymentTransaction | undefined>;
  transitionPendingTransaction(
    id: string,
    status: Exclude<TransactionStatus, "PENDING">
  ): Promise<PaymentTransaction | undefined>;
  markFulfilled(id: string): Promise<void>;
};

type PaymentsServiceDependencies = {
  planRepository: PlanRepository;
  subscriptionRepository: SubscriptionRepository;
  transactionRepository: PaymentTransactionRepository;
  paymentGateway: PaymentGateway;
  workspaceProvisioner: WorkspaceProvisioner;
  now: () => Date;
  createTransactionId: () => string;
  createGatewayTransactionId: () => string;
};

export function createPaymentsService(dependencies: PaymentsServiceDependencies) {
  const {
    planRepository,
    subscriptionRepository,
    transactionRepository,
    paymentGateway,
    workspaceProvisioner,
    now,
    createTransactionId,
    createGatewayTransactionId
  } = dependencies;

  async function getStatus(transaction: PaymentTransaction): Promise<PaymentStatusResponse> {
    const subscription = await subscriptionRepository.getSubscriptionByUserId(transaction.userId);
    return { transaction, subscription };
  }

  async function setWorkspaceResult(
    subscription: Subscription,
    plan: Plan,
    type: TransactionType,
    idempotencyKey: string,
    simulateFailure = false
  ): Promise<Subscription> {
    if (!requiresWorkspaceProvisioning(type)) {
      return subscription;
    }

    await subscriptionRepository.updateSubscription(subscription.id, {
      workspaceStatus: "PROVISIONING"
    });

    try {
      if (simulateFailure) {
        throw new Error("Simulated provisioning failure");
      }
      const input = {
        subscriptionId: subscription.id,
        workspaceId: subscription.workspaceId,
        plan,
        idempotencyKey
      };
      if (type === "NEW") {
        await workspaceProvisioner.provision(input);
      } else {
        await workspaceProvisioner.updatePlan(input);
      }
      return (
        (await subscriptionRepository.updateSubscription(subscription.id, {
          workspaceStatus: "ACTIVE"
        })) ?? subscription
      );
    } catch {
      return (
        (await subscriptionRepository.updateSubscription(subscription.id, {
          workspaceStatus: "PROVISIONING_FAILED"
        })) ?? subscription
      );
    }
  }

  async function fulfill(
    transaction: PaymentTransaction,
    simulateProvisioningFailure = false
  ): Promise<Subscription> {
    const existing = await subscriptionRepository.getSubscriptionByUserId(transaction.userId);
    const plan = await planRepository.getActivePlanById(transaction.planId);
    if (!plan) {
      throw new ApplicationError("PLAN_NOT_FOUND", 404, "Plan not found");
    }

    let subscription: Subscription;
    if (transaction.type === "NEW") {
      if (existing) {
        subscription = existing;
      } else {
        const startDate = now();
        subscription = await subscriptionRepository.createSubscription({
          userId: transaction.userId,
          workspaceId: transaction.workspaceId,
          planId: transaction.planId,
          status: "ACTIVE",
          startDate,
          endDate: calculateRenewedEndDate(startDate, startDate),
          workspaceStatus: "NOT_PROVISIONED"
        });
      }
    } else if (!existing) {
      throw new ApplicationError(
        "SUBSCRIPTION_CONFLICT",
        409,
        "Subscription required for this transaction"
      );
    } else if (transaction.type === "RENEW") {
      subscription =
        (await subscriptionRepository.updateSubscription(existing.id, {
          status: "ACTIVE",
          endDate: calculateRenewedEndDate(now(), new Date(existing.endDate))
        })) ?? existing;
    } else {
      subscription =
        (await subscriptionRepository.updateSubscription(existing.id, {
          planId: transaction.planId,
          status: "ACTIVE"
        })) ?? existing;
    }

    return setWorkspaceResult(
      subscription,
      plan,
      transaction.type,
      transaction.id,
      simulateProvisioningFailure
    );
  }

  return {
    async createCheckout(identity: RequestIdentity, planId: string): Promise<CheckoutResponse> {
      const plan = await planRepository.getActivePlanById(planId);
      if (!plan) {
        throw new ApplicationError("PLAN_NOT_FOUND", 404, "Plan not found");
      }
      const subscription = await subscriptionRepository.getSubscriptionByUserId(identity.userId);
      if (subscription?.planId === "premium" && planId === "standard") {
        throw new ApplicationError(
          "SUBSCRIPTION_CONFLICT",
          409,
          "Downgrading is not supported"
        );
      }
      const type = determineTransactionType(subscription, planId);
      const pending = await transactionRepository.findRecentPendingTransaction(
        identity.userId,
        planId,
        type
      );
      if (pending) {
        return { transaction: pending, reused: true };
      }

      const transactionId = createTransactionId();
      const gatewayTransactionId = createGatewayTransactionId();
      const session = await paymentGateway.createPaymentSession({
        transactionId,
        gatewayTransactionId
      });
      const transaction = await transactionRepository.createPaymentTransaction({
        id: transactionId,
        userId: identity.userId,
        workspaceId: identity.workspaceId,
        subscriptionId: subscription?.id,
        planId,
        type,
        amount: plan.monthlyPrice,
        gatewayTransactionId,
        paymentUrl: session.paymentUrl
      });
      return { transaction, reused: false };
    },

    async getPaymentStatus(
      identity: RequestIdentity,
      transactionId: string
    ): Promise<PaymentStatusResponse> {
      const transaction = await transactionRepository.getPaymentTransactionById(transactionId);
      if (!transaction) {
        throw new ApplicationError("TRANSACTION_NOT_FOUND", 404, "Transaction not found");
      }
      if (transaction.userId !== identity.userId) {
        throw new ApplicationError("TRANSACTION_NOT_OWNED", 403, "Transaction access denied");
      }
      return getStatus(transaction);
    },

    async completePayment(
      transactionId: string,
      options: { simulateProvisioningFailure?: boolean } = {}
    ): Promise<PaymentStatusResponse> {
      const current = await transactionRepository.getPaymentTransactionById(transactionId);
      if (!current) {
        throw new ApplicationError("TRANSACTION_NOT_FOUND", 404, "Transaction not found");
      }

      if (current.status === "COMPLETED" && current.fulfillmentCompletedAt) {
        return getStatus(current);
      }

      const completed =
        current.status === "PENDING"
          ? await transactionRepository.transitionPendingTransaction(transactionId, "COMPLETED")
          : current;
      if (!completed || completed.status !== "COMPLETED") {
        return getStatus(current);
      }

      if (!completed.fulfillmentCompletedAt) {
        await fulfill(completed, options.simulateProvisioningFailure);
        await transactionRepository.markFulfilled(completed.id);
      }
      const refreshed =
        (await transactionRepository.getPaymentTransactionById(completed.id)) ?? completed;
      return getStatus(refreshed);
    },

    async failPayment(transactionId: string): Promise<PaymentStatusResponse> {
      const current = await transactionRepository.getPaymentTransactionById(transactionId);
      if (!current) {
        throw new ApplicationError("TRANSACTION_NOT_FOUND", 404, "Transaction not found");
      }
      const failed =
        (await transactionRepository.transitionPendingTransaction(transactionId, "FAILED")) ??
        current;
      return getStatus(failed);
    },

    async cancelPayment(
      identity: RequestIdentity,
      transactionId: string
    ): Promise<PaymentStatusResponse> {
      const current = await transactionRepository.getPaymentTransactionById(transactionId);
      if (!current) {
        throw new ApplicationError("TRANSACTION_NOT_FOUND", 404, "Transaction not found");
      }
      if (current.userId !== identity.userId) {
        throw new ApplicationError("TRANSACTION_NOT_OWNED", 403, "Transaction access denied");
      }
      const cancelled =
        (await transactionRepository.transitionPendingTransaction(transactionId, "CANCELLED")) ??
        current;
      return getStatus(cancelled);
    }
  };
}

export const paymentsService = createPaymentsService({
  planRepository: plansRepository,
  subscriptionRepository: subscriptionsRepository,
  transactionRepository: paymentTransactionsRepository,
  paymentGateway: mockPaymentGateway,
  workspaceProvisioner: mockWorkspaceProvisioner,
  now: () => new Date(),
  createTransactionId: () => crypto.randomUUID(),
  createGatewayTransactionId: () => crypto.randomUUID()
});
