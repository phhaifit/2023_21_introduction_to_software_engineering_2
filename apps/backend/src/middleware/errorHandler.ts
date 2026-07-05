import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;

  response.status(statusCode).json({
    code: error.code ?? "INTERNAL_SERVER_ERROR",
    error: statusCode === 500 ? "Internal Server Error" : error.message
  });
};
