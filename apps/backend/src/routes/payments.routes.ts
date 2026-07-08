import { Router } from "express";

import {
  cancelPaymentController,
  createCheckoutController,
  getPaymentStatusController
} from "../controllers/payments.controller.js";

export const paymentsRouter = Router();
paymentsRouter.post("/checkout", createCheckoutController);
paymentsRouter.get("/:id", getPaymentStatusController);
paymentsRouter.post("/:id/cancel", cancelPaymentController);
