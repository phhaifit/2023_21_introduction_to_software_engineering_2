export type MainApplicationNavigationItem = {
  label: string;
  description: string;
  action: string;
  path: string;
};

export const mainApplicationNavigation = [
  {
    label: "Plans",
    description: "Compare Standard and Premium workspace resources.",
    action: "View plans",
    path: "/app/subscription/plans"
  },
  {
    label: "My Subscription",
    description: "Review your current plan, expiry date, and workspace status.",
    action: "Open subscription",
    path: "/app/subscription"
  },
  {
    label: "Admin Subscriptions",
    description: "Inspect subscription and provisioning status across users.",
    action: "Open admin view",
    path: "/app/admin/subscriptions"
  }
] satisfies MainApplicationNavigationItem[];
