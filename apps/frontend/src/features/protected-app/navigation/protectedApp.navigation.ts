export type ProtectedAppNavigationIcon =
  | "dashboard"
  | "workspace"
  | "workflow"
  | "plans"
  | "subscription"
  | "admin"
  | "agents";

export type ProtectedAppNavigationItem = {
  label: string;
  description: string;
  icon: ProtectedAppNavigationIcon;
  path: string;
  disabled?: boolean;
};

export const protectedAppNavigationItems: ProtectedAppNavigationItem[] = [
  {
    label: "Dashboard",
    description: "Overview of the protected application workspace.",
    icon: "dashboard",
    path: "/app"
  },
  {
    label: "Workspaces",
    description: "Manage enterprise workspaces and runtime status.",
    icon: "workspace",
    path: "/app/workspaces"
  },
  {
    label: "Workflows",
    description: "Build and monitor multi-agent workflow orchestration.",
    icon: "workflow",
    path: "/app/workflows"
  },
  {
    label: "Plans",
    description: "Review available subscription plans.",
    icon: "plans",
    path: "/app/subscription/plans"
  },
  {
    label: "My Subscription",
    description: "View the active subscription and payment status.",
    icon: "subscription",
    path: "/app/subscription"
  },
  {
    label: "Admin Subscriptions",
    description: "Operate subscription controls for platform admins.",
    icon: "admin",
    path: "/app/admin/subscriptions"
  },
  {
    label: "Agents",
    description: "Create, inspect, and maintain AI agents.",
    icon: "agents",
    path: "/app/agents"
  }
];

export const protectedAppDashboardCards = protectedAppNavigationItems.filter(
  (item) => item.label !== "Dashboard"
);
