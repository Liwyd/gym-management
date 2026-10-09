export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR"
  | "MEMBERSHIP_REQUIRED"
  | "CLASS_FULL"
  | "ALREADY_ENROLLED"
  | "NOT_ENROLLED"
  | "SESSION_CANCELLED"
  | "PAYMENT_INVALID"
  | "PLAN_INACTIVE"
  | "STATE_CONFLICT";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const validationError = (message: string, details?: unknown) =>
  new AppError(400, "VALIDATION_ERROR", message, details);

export const unauthorized = (message = "Authentication required") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to do this") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (resource = "Resource") =>
  new AppError(404, "NOT_FOUND", `${resource} not found`);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, "CONFLICT", message, details);

export const stateConflict = (message: string) =>
  new AppError(409, "STATE_CONFLICT", message);

export const businessRule = (
  code: Extract<
    ErrorCode,
    | "MEMBERSHIP_REQUIRED"
    | "CLASS_FULL"
    | "ALREADY_ENROLLED"
    | "NOT_ENROLLED"
    | "SESSION_CANCELLED"
    | "PAYMENT_INVALID"
    | "PLAN_INACTIVE"
  >,
  message: string,
) => new AppError(409, code, message);
