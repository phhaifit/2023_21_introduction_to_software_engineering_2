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

  const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;

  response.status(statusCode).json({
    error: {
      code: error.code ?? "INTERNAL_SERVER_ERROR",
      message: statusCode === 500 ? "Internal Server Error" : error.message
    }
  });
};
