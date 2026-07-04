import type { RequestHandler } from "express";

import {
  getMySubscriptionService,
  listAllSubscriptionsService,
  listPlansService
} from "../services/subscriptions.service.js";

export const listPlansController: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await listPlansService());
  } catch (error) {
    next(error);
  }
};

export const getMySubscriptionController: RequestHandler = async (request, response, next) => {
  try {
    const subscription = await getMySubscriptionService(request.identity);
    if (!subscription) {
      response.status(404).json({
        error: { code: "SUBSCRIPTION_NOT_FOUND", message: "Subscription not found" }
      });
      return;
    }
    response.json(subscription);
  } catch (error) {
    next(error);
  }
};

export const listAllSubscriptionsController: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    response.json(await listAllSubscriptionsService(request.identity));
  } catch (error) {
    next(error);
  }
};
