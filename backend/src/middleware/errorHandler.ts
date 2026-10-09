import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { fail } from "../lib/respond";
import { zodDetails } from "../lib/validate";

export const notFoundHandler: RequestHandler = (_req, res) =>
  fail(res, 404, "NOT_FOUND", "Endpoint not found");

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    fail(res, 400, "VALIDATION_ERROR", "Request validation failed", zodDetails(err));
    return;
  }

  const anyErr = err as { type?: string; name?: string; code?: string };

  if (anyErr.type === "entity.parse.failed") {
    fail(res, 400, "BAD_REQUEST", "Malformed JSON body");
    return;
  }

  if (anyErr.name === "PrismaClientKnownRequestError" && anyErr.code === "P2002") {
    fail(res, 409, "CONFLICT", "A record with the same unique value already exists");
    return;
  }

  if (anyErr.name === "PrismaClientKnownRequestError" && anyErr.code === "P2025") {
    fail(res, 404, "NOT_FOUND", "Resource not found");
    return;
  }

  if (anyErr.name === "PrismaClientValidationError") {
    fail(res, 400, "BAD_REQUEST", "Invalid data for this operation");
    return;
  }

  // Never expose internal errors.
  _req.log?.error({ err }, "Unhandled error");
  if (env.NODE_ENV !== "test") {
      console.error(err);
  }
  fail(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
};
