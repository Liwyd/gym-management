import pinoHttp from "pino-http";
import { env } from "../config/env";
import { logger } from "../lib/logger";

export const requestLogger = pinoHttp({
  logger,
  autoLogging:
    env.LOG_LEVEL === "silent"
      ? false
      : { ignore: (req) => req.url === "/api/v1/health" },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customProps: () => ({ service: "gym-api" }),
});
