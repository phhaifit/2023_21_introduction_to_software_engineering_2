import { Router } from "express";

import {
  completeMockPaymentController,
  completeWithProvisioningFailureController,
  failMockPaymentController
} from "../controllers/payments.controller.js";
import { env } from "../config/env.js";

export const mockPaymentsRouter = Router();

mockPaymentsRouter.use((_request, response, next) => {
  if (env.paymentProvider !== "mock") {
    response.status(404).json({ error: "Not Found" });
    return;
  }
  next();
});

mockPaymentsRouter.post("/:id/complete", completeMockPaymentController);
mockPaymentsRouter.post("/:id/fail", failMockPaymentController);
mockPaymentsRouter.post(
  "/:id/provisioning-failure",
  completeWithProvisioningFailureController
);
