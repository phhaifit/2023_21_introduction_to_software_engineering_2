import express from "express";

import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { agentsRouter } from "./routes/agents.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { workflowsRouter } from "./routes/workflows.routes.js";

export const app = express();

app.use(express.json());
app.use("/api", healthRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/workflows", workflowsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
