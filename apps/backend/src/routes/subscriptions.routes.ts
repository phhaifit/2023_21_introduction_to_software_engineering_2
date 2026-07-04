import { Router } from "express";

import {
  getMySubscriptionController,
  listAllSubscriptionsController,
  listPlansController
} from "../controllers/subscriptions.controller.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const plansRouter = Router();
plansRouter.get("/", listPlansController);

export const subscriptionsRouter = Router();
subscriptionsRouter.get("/me", getMySubscriptionController);

export const adminSubscriptionsRouter = Router();
adminSubscriptionsRouter.get("/", requireAdmin, listAllSubscriptionsController);
