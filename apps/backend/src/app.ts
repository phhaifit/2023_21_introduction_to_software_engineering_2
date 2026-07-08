import express from "express";

import { errorHandler } from "./middleware/errorHandler.js";
import { localIdentity } from "./middleware/localIdentity.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { agentsRouter } from "./routes/agents.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Workspace-Id, X-Workspace-Role"
  );
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  next();
});
app.options("*", (_request, response) => {
  response.sendStatus(204);
});
app.use(express.json());
app.use("/api", localIdentity);
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/agents", agentsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
