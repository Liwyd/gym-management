import type { RequestHandler } from "express";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { forbidden, unauthorized } from "../lib/errors";
import { verifyToken } from "../modules/auth/jwt";
import type { Capability } from "../modules/auth/permissions";
import { can } from "../modules/auth/permissions";

export const ACCESS_COOKIE = "pulsefit_access";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Requires a valid JWT cookie AND an ACTIVE account (R7). */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      ACCESS_COOKIE
    ];
    if (!token) throw unauthorized("Invalid or expired session");

    const { sub } = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw unauthorized("Invalid or expired session");
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Coarse RBAC gate — object-level scoping happens in services (R8). */
export function authorize(...capabilities: Capability[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    const allowed = capabilities.some((cap) => can(req.user!.role, cap));
    if (!allowed) {
      next(forbidden());
      return;
    }
    next();
  };
}
