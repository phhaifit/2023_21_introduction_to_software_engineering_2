import type { ErrorRequestHandler } from "express";

import { ApplicationError } from "../errors/applicationError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApplicationError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error"
    }
  });
};
