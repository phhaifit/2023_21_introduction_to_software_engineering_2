import { describe, expect, it } from "vitest";

import { getWorkspaceStatusMessage } from "./workspaceStatusMessage";

describe("getWorkspaceStatusMessage", () => {
  it("explains that payment succeeded when workspace provisioning fails", () => {
    expect(getWorkspaceStatusMessage("PROVISIONING_FAILED")).toBe(
      "Payment succeeded, but workspace setup failed. Your subscription remains active; contact support to retry workspace setup."
    );
  });

  it("returns no warning for an active workspace", () => {
    expect(getWorkspaceStatusMessage("ACTIVE")).toBeUndefined();
  });
});
