import { Router } from "express";

import {
  getMySubscriptionController,
  listAllSubscriptionsController,
  listPlansController
} from "../controllers/subscriptions.controller.js";

export const plansRouter = Router();
plansRouter.get("/", listPlansController);

export const subscriptionsRouter = Router();
subscriptionsRouter.get("/me", getMySubscriptionController);

export const adminSubscriptionsRouter = Router();
adminSubscriptionsRouter.get("/", listAllSubscriptionsController);
