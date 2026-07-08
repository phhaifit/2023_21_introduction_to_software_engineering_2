import type { SubscriptionWorkspaceStatus } from "@ai-agent-platform/shared";

export function getWorkspaceStatusMessage(
  status: SubscriptionWorkspaceStatus | undefined
): string | undefined {
  if (status !== "PROVISIONING_FAILED") return undefined;

  return "Payment succeeded, but workspace setup failed. Your subscription remains active; contact support to retry workspace setup.";
}
