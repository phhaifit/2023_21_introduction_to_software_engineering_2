import type {
  AdminSubscriptionListResponse,
  CheckoutResponse,
  PaymentStatusResponse,
  Plan,
  Subscription
} from "@ai-agent-platform/shared";

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
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const body = (await response.json()) as T & {
    error?: { code?: string; message?: string };
  };

  if (!response.ok) {
    throw new ApiError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Request failed",
      response.status
    );
  }
  return body;
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
