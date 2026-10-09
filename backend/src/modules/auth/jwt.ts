import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../../config/env";
import { unauthorized } from "../../lib/errors";

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign({ role: payload.role }, env.JWT_SECRET, {
    subject: payload.sub,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload {
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw unauthorized("Invalid or expired session");
  }
  if (typeof decoded.sub !== "string") {
    throw unauthorized("Invalid or expired session");
  }
  const role = decoded.role;
  if (
    typeof role !== "string" ||
    !Object.values(Role).includes(role as Role)
  ) {
    throw unauthorized("Invalid or expired session");
  }
  return { sub: decoded.sub, role: role as Role };
}
