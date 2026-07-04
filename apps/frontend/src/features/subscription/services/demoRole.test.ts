import { describe, expect, it } from "vitest";

import { buildDemoRoleHeaders, normalizeDemoRole } from "./demoRole";

describe("demo role helper", () => {
  it("keeps recognised roles", () => {
    expect(normalizeDemoRole("member")).toBe("member");
    expect(normalizeDemoRole("admin")).toBe("admin");
  });

  it("falls back to admin for unknown roles", () => {
    expect(normalizeDemoRole("owner")).toBe("admin");
    expect(normalizeDemoRole(null)).toBe("admin");
  });

  it("builds headers only when demo controls are enabled", () => {
    expect(buildDemoRoleHeaders(false, "member")).toEqual({});
    expect(buildDemoRoleHeaders(true, "member")).toEqual({
      "X-Demo-Role": "member"
    });
  });
});
