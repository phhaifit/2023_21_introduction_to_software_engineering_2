import type { AdminSubscriptionListResponse, Plan, Subscription } from "@ai-agent-platform/shared";

import { plansRepository } from "../repositories/plans.repository.js";
import { subscriptionsRepository } from "../repositories/subscriptions.repository.js";
import type { RequestIdentity } from "./payments.service.js";

export async function listPlansService(): Promise<Plan[]> {
  return plansRepository.listActivePlans();
}

export async function getMySubscriptionService(
  identity: RequestIdentity
): Promise<Subscription | undefined> {
  return subscriptionsRepository.getSubscriptionByUserId(identity.userId);
}

export async function listAllSubscriptionsService(
  identity: RequestIdentity
): Promise<AdminSubscriptionListResponse> {
  if (identity.role !== "admin") {
    throw new Error("Forbidden");
  }
  return subscriptionsRepository.listSubscriptions();
}
