import bcrypt from "bcryptjs";
import type { Response } from "express";
import { Role, UserStatus } from "@prisma/client";
import { env } from "../../config/env";
import { forbidden, unauthorized, validationError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { ACCESS_COOKIE } from "../../middleware/auth";
import { signToken } from "./jwt";
import type { LoginInput, UpdateMeInput } from "./auth.schemas";

export const PASSWORD_ROUNDS = 10;

/** Valid bcrypt hash used to equalize timing when the email is unknown (R7). */
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-placeholder", 10);

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
  member?: { id: string; memberCode: string } | null;
  trainer?: { id: string } | null;
}

function durationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 8 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as "s" | "m" | "h" | "d"
  ];
  return n * unit;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/",
    maxAge: durationToMs(env.JWT_EXPIRES_IN),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  const passwordOk = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordOk) {
    throw unauthorized("Invalid email or password");
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw forbidden(
      "Your account is inactive. Please contact the club reception.",
    );
  }

  const token = signToken({ sub: user.id, role: user.role });
  const { passwordHash: _ph, status: _st, ...safe } = user;
  return { user: safe as PublicUser, token };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      member: { select: { id: true, memberCode: true } },
      trainer: { select: { id: true } },
    },
  });
  if (!user) throw unauthorized("Invalid or expired session");
  return user as PublicUser;
}

export async function updateMe(userId: string, input: UpdateMeInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw unauthorized("Invalid or expired session");

  const data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    passwordHash?: string;
  } = {};

  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.phone !== undefined) data.phone = input.phone;

  if (input.newPassword !== undefined) {
    const ok = await bcrypt.compare(input.currentPassword!, user.passwordHash);
    if (!ok) {
      throw validationError("Profile validation failed", [
        { path: "currentPassword", message: "Current password is incorrect" },
      ]);
    }
    data.passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_ROUNDS);
  }

  await prisma.user.update({ where: { id: userId }, data });
  return getMe(userId);
}
