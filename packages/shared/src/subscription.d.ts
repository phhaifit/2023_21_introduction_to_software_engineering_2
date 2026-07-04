export declare const TRANSACTION_STATUSES: {
  readonly PENDING: "PENDING";
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
  readonly CANCELLED: "CANCELLED";
};
export declare const TRANSACTION_TYPES: {
  readonly NEW: "NEW";
  readonly RENEW: "RENEW";
  readonly UPGRADE: "UPGRADE";
};
export declare const SUBSCRIPTION_STATUSES: {
  readonly ACTIVE: "ACTIVE";
  readonly EXPIRED: "EXPIRED";
  readonly CANCELLED: "CANCELLED";
};
export declare const WORKSPACE_STATUSES: {
  readonly NOT_PROVISIONED: "NOT_PROVISIONED";
  readonly PROVISIONING: "PROVISIONING";
  readonly ACTIVE: "ACTIVE";
  readonly PROVISIONING_FAILED: "PROVISIONING_FAILED";
};
export declare const WORKSPACE_OPERATION_ACTIONS: {
  readonly PROVISION: "PROVISION";
  readonly UPDATE_PLAN: "UPDATE_PLAN";
};
export declare const WORKSPACE_OPERATION_STATUSES: {
  readonly PENDING: "PENDING";
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
};
export type PlanName = "Standard" | "Premium";
export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[keyof typeof TRANSACTION_STATUSES];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[keyof typeof WORKSPACE_STATUSES];
export type WorkspaceOperationAction =
  (typeof WORKSPACE_OPERATION_ACTIONS)[keyof typeof WORKSPACE_OPERATION_ACTIONS];
export type WorkspaceOperationStatus =
  (typeof WORKSPACE_OPERATION_STATUSES)[keyof typeof WORKSPACE_OPERATION_STATUSES];
export interface Plan {
  id: string;
  name: PlanName;
  monthlyPrice: number;
  cpu: number;
  ramGb: number;
  storageGb: number;
  maxAgents: number;
  supportLevel: string;
  active: boolean;
}
export interface Subscription {
  id: string;
  userId: string;
  workspaceId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  workspaceStatus: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}
export interface PaymentTransaction {
  id: string;
  userId: string;
  workspaceId: string;
  subscriptionId?: string;
  planId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  gatewayTransactionId: string;
  paymentUrl: string;
  fulfillmentCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface CheckoutInput {
  planId: string;
}
export interface CheckoutResponse {
  transaction: PaymentTransaction;
  reused: boolean;
}
export interface PaymentStatusResponse {
  transaction: PaymentTransaction;
  subscription?: Subscription;
}
export interface AdminSubscriptionListItem extends Subscription {
  plan: Plan;
}
export interface AdminSubscriptionListResponse {
  items: AdminSubscriptionListItem[];
  total: number;
}
export interface WorkspaceProvisioningOperation {
  id: string;
  transactionId: string;
  subscriptionId: string;
  workspaceId: string;
  planId: string;
  action: WorkspaceOperationAction;
  status: WorkspaceOperationStatus;
  idempotencyKey: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
}
export interface AdminWorkspaceOperationListResponse {
  items: WorkspaceProvisioningOperation[];
  total: number;
}
export type SubscriptionErrorCode =
  | "INVALID_INPUT"
  | "PLAN_NOT_FOUND"
  | "PLAN_NOT_ACTIVE"
  | "SUBSCRIPTION_CONFLICT"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_NOT_OWNED"
  | "TRANSACTION_NOT_PENDING"
  | "FORBIDDEN";
