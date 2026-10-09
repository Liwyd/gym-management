import { Role } from "@prisma/client";
import { forbidden, notFound } from "./errors";
import { prisma } from "./prisma";
import type { AuthUser } from "../middleware/auth";

export function isStaff(role: Role): boolean {
  return role === Role.ADMIN || role === Role.MANAGER || role === Role.RECEPTIONIST;
}

/** Member profile of the acting user (null for staff / profileless users). */
export async function actorMember(actor: AuthUser) {
  if (actor.role !== Role.MEMBER) return null;
  return prisma.member.findUnique({
    where: { userId: actor.id },
    select: { id: true, userId: true, memberCode: true, status: true },
  });
}

/**
 * Object-level check (R8): staff may access any member; a MEMBER user only
 * their own profile. Throws 403/404 as appropriate.
 */
export async function requireMemberAccess(actor: AuthUser, memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, memberCode: true, status: true },
  });
  if (!member) throw notFound("Member");
  if (actor.role === Role.MEMBER && member.userId !== actor.id) {
    throw forbidden();
  }
  return member;
}

/** Trainer profile of the acting user (null unless TRAINER). */
export async function actorTrainer(actor: AuthUser) {
  if (actor.role !== Role.TRAINER) return null;
  return prisma.trainer.findUnique({
    where: { userId: actor.id },
    select: { id: true, userId: true, status: true },
  });
}

/**
 * R8: trainers may only touch their own sessions; staff any.
 */
export async function requireSessionAccess(
  actor: AuthUser,
  session: { id: string; trainerId: string; status: string; startsAt: Date; endsAt: Date },
) {
  if (actor.role === Role.TRAINER) {
    const trainer = await actorTrainer(actor);
    if (!trainer || trainer.id !== session.trainerId) throw forbidden();
  }
  return session;
}
