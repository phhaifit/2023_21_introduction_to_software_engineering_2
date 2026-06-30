import express from "express";

import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { workspaceRouter } from "./modules/workspace-management/workspace.routes.js";
import { agentsRouter } from "./routes/agents.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  next();
});
app.options("*", (_request, response) => {
  response.sendStatus(204);
});
app.use(express.json());
app.use("/api", healthRouter);
app.use("/api", workspaceRouter);
app.use("/api/agents", agentsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
