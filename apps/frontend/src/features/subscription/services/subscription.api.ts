import type {
  AdminSubscriptionListResponse,
  AdminWorkspaceOperationListResponse,
  CheckoutResponse,
  PaymentStatusResponse,
  Plan,
  Subscription
} from "@ai-agent-platform/shared";

import { buildDemoRoleHeaders, getStoredDemoRole } from "./demoRole";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const demoHeaders = buildDemoRoleHeaders(import.meta.env.DEV, getStoredDemoRole());
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...demoHeaders,
      ...init.headers
    }
  });
  const body = (await response.json()) as T & {
    error?: unknown;
    message?: unknown;
  };

  if (!response.ok) {
    const normalizedError = normalizeApiError(body);

    throw new ApiError(
      normalizedError.code,
      normalizedError.message,
      response.status
    );
  }
  return body;
}

function normalizeApiError(body: { error?: unknown; message?: unknown }): { code: string; message: string } {
  if (isErrorObject(body.error)) {
    return {
      code: typeof body.error.code === "string" ? body.error.code : "REQUEST_FAILED",
      message: typeof body.error.message === "string" ? body.error.message : "Internal Server Error"
    };
  }

  if (typeof body.error === "string") {
    return {
      code: "REQUEST_FAILED",
      message: body.error
    };
  }

  if (typeof body.message === "string") {
    return {
      code: "REQUEST_FAILED",
      message: body.message
    };
  }

  return {
    code: "REQUEST_FAILED",
    message: "Internal Server Error"
  };
}

function isErrorObject(value: unknown): value is { code?: unknown; message?: unknown } {
  return typeof value === "object" && value !== null;
}

export function listPlans(): Promise<Plan[]> {
  return apiRequest("/api/plans");
}

export function getMySubscription(): Promise<Subscription> {
  return apiRequest("/api/subscriptions/me");
}

export function createCheckout(planId: string): Promise<CheckoutResponse> {
  return apiRequest("/api/payments/checkout", {
    method: "POST",
    body: JSON.stringify({ planId })
  });
}

export function getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
  return apiRequest(`/api/payments/${transactionId}`);
}

export function cancelPayment(transactionId: string): Promise<PaymentStatusResponse> {
  return apiRequest(`/api/payments/${transactionId}/cancel`, { method: "POST" });
}

export function completeMockPayment(
  transactionId: string,
  mode: "complete" | "fail" | "provisioning-failure"
): Promise<PaymentStatusResponse> {
  return apiRequest(`/api/mock-payments/${transactionId}/${mode}`, { method: "POST" });
}

export function listAdminSubscriptions(): Promise<AdminSubscriptionListResponse> {
  return apiRequest("/api/admin/subscriptions");
}

export function listAdminWorkspaceOperations(): Promise<AdminWorkspaceOperationListResponse> {
  return apiRequest("/api/admin/workspace-operations");
}
