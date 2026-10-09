import type { ZodError, ZodType } from "zod";
import { validationError } from "./errors";

export function zodDetails(error: ZodError) {
  return error.issues.map((i) => ({
    path: i.path.map(String).join("."),
    message: i.message,
  }));
}

/** Parse untrusted input with zod; throws a 400 AppError on failure. */
export function parse<T>(schema: ZodType<T>, data: unknown, what = "Request"): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw validationError(`${what} validation failed`, zodDetails(result.error));
  }
  return result.data;
}
