import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { env } from "../config/env.js";
import { errorHandler } from "./errorHandler.js";
import { localIdentity } from "./localIdentity.js";

const identityProbeApp = express();
identityProbeApp.get("/identity", localIdentity, (request, response) => {
  response.json(request.identity);
});
identityProbeApp.use(errorHandler);

describe("local identity middleware", () => {
  let originalDemoControls: boolean;

  beforeEach(() => {
    originalDemoControls = env.demoControlsEnabled;
  });

  afterEach(() => {
    env.demoControlsEnabled = originalDemoControls;
  });

  it("uses X-Demo-Role in development", async () => {
    env.demoControlsEnabled = true;
    const response = await request(identityProbeApp)
      .get("/identity")
      .set("X-Demo-Role", "member");
    expect(response.body.role).toBe("member");
  });

  it("rejects an invalid demo role in development", async () => {
    env.demoControlsEnabled = true;
    const response = await request(identityProbeApp)
      .get("/identity")
      .set("X-Demo-Role", "owner");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
  });

  it("ignores X-Demo-Role when demo controls are disabled", async () => {
    env.demoControlsEnabled = false;
    const response = await request(identityProbeApp)
      .get("/identity")
      .set("X-Demo-Role", "member");
    expect(response.body.role).toBe(env.defaultUserRole);
  });
});
