export type DemoRole = "member" | "admin";

export const DEMO_ROLE_STORAGE_KEY = "subscription-demo-role";

export function normalizeDemoRole(value: string | null): DemoRole {
  return value === "member" ? "member" : "admin";
}

export function getStoredDemoRole(): DemoRole {
  if (typeof localStorage === "undefined") {
    return "admin";
  }
  return normalizeDemoRole(localStorage.getItem(DEMO_ROLE_STORAGE_KEY));
}

export function setStoredDemoRole(role: DemoRole): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
}

export function buildDemoRoleHeaders(
  enabled: boolean,
  role: DemoRole
): Record<string, string> {
  return enabled ? { "X-Demo-Role": role } : {};
}
