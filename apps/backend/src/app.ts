import express from "express";

import { errorHandler } from "./middleware/errorHandler.js";
import { localIdentity } from "./middleware/localIdentity.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { agentsRouter } from "./routes/agents.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { mockPaymentsRouter } from "./routes/mockPayments.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import {
  adminSubscriptionsRouter,
  plansRouter,
  subscriptionsRouter
} from "./routes/subscriptions.routes.js";
import { adminWorkspaceOperationsRouter } from "./routes/workspaceOperations.routes.js";

export const app = express();

app.use(express.json());
app.use("/api", localIdentity);
app.use("/api", healthRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/plans", plansRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/mock-payments", mockPaymentsRouter);
app.use("/api/admin/subscriptions", adminSubscriptionsRouter);
app.use("/api/admin/workspace-operations", adminWorkspaceOperationsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
