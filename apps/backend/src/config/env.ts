export const env = {
  port: Number(process.env.PORT ?? 3000),
  defaultUserId: process.env.DEFAULT_USER_ID ?? "local-user",
  defaultWorkspaceId: process.env.DEFAULT_WORKSPACE_ID ?? "default-workspace",
  defaultUserRole: (process.env.DEFAULT_USER_ROLE === "member" ? "member" : "admin") as
    | "member"
    | "admin",
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock"
};
