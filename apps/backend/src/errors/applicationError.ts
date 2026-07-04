import type { SubscriptionErrorCode } from "@ai-agent-platform/shared";

export class ApplicationError extends Error {
  constructor(
    public readonly code: SubscriptionErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
