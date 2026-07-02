import type { TransactionStatus, TransactionType } from "@ai-agent-platform/shared";

const BILLING_CYCLE_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function determineTransactionType(
  currentSubscription: { planId: string } | undefined,
  selectedPlanId: string
): TransactionType {
  if (!currentSubscription) {
    return "NEW";
  }

  return currentSubscription.planId === selectedPlanId ? "RENEW" : "UPGRADE";
}

export function calculateRenewedEndDate(now: Date, currentEndDate: Date): Date {
  const baseDate = currentEndDate > now ? currentEndDate : now;
  return new Date(baseDate.getTime() + BILLING_CYCLE_DAYS * MILLISECONDS_PER_DAY);
}

export function canTransitionTransaction(
  currentStatus: TransactionStatus,
  targetStatus: TransactionStatus
): boolean {
  return currentStatus === "PENDING" && targetStatus !== "PENDING";
}

export function requiresWorkspaceProvisioning(type: TransactionType): boolean {
  return type === "NEW" || type === "UPGRADE";
}
