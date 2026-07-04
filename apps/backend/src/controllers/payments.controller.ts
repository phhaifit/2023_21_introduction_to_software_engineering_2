import type { RequestHandler } from "express";

import { ApplicationError } from "../errors/applicationError.js";
import { paymentsService } from "../services/payments.service.js";

export const createCheckoutController: RequestHandler = async (request, response, next) => {
  try {
    const planId = request.body?.planId;
    if (typeof planId !== "string" || !planId.trim()) {
      throw new ApplicationError("INVALID_INPUT", 400, "planId is required");
    }
    const result = await paymentsService.createCheckout(request.identity, planId.trim());
    response.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatusController: RequestHandler = async (request, response, next) => {
  try {
    response.json(
      await paymentsService.getPaymentStatus(request.identity, request.params.id)
    );
  } catch (error) {
    next(error);
  }
};

export const cancelPaymentController: RequestHandler = async (request, response, next) => {
  try {
    response.json(await paymentsService.cancelPayment(request.identity, request.params.id));
  } catch (error) {
    next(error);
  }
};

export const completeMockPaymentController: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    response.json(await paymentsService.completePayment(request.params.id));
  } catch (error) {
    next(error);
  }
};

export const completeWithProvisioningFailureController: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    response.json(
      await paymentsService.completePayment(request.params.id, {
        simulateProvisioningFailure: true
      })
    );
  } catch (error) {
    next(error);
  }
};

export const failMockPaymentController: RequestHandler = async (request, response, next) => {
  try {
    response.json(await paymentsService.failPayment(request.params.id));
  } catch (error) {
    next(error);
  }
};
