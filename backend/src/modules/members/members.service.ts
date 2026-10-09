import bcrypt from "bcryptjs";
import type { MemberStatus } from "@prisma/client";
import { recordActivity, type Db } from "../../lib/activity";
import { conflict, notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../../middleware/auth";
import { PASSWORD_ROUNDS } from "../auth/auth.service";
import { deriveMembershipStatus, dateOnly } from "../rules/rules";
import type { Pagination } from "../../utils/pagination";
import { stripUndefined } from "../../utils/object";

export interface CreateMemberInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
  status?: MemberStatus;
}

export type UpdateOwnMemberInput = {
  dateOfBirth?: Date | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
};

async function nextMemberCode(tx: Db): Promise<string> {
  const prefix = `MB-${dateOnly(new Date()).getUTCFullYear()}-`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await tx.member.count({
      where: { memberCode: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(count + 1).padStart(3, "0")}`;
    const taken = await tx.member.findFirst({
      where: { memberCode: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw conflict("Could not allocate a member code, please try again");
}

const memberSelect = {
  id: true,
  memberCode: true,
  dateOfBirth: true,
  gender: true,
  address: true,
  emergencyContact: true,
  notes: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
    },
  },
} as const;

export async function listMembers(q: Pagination & {
  search?: string;
  status?: MemberStatus;
}) {
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { memberCode: { contains: q.search, mode: "insensitive" as const } },
            { user: { email: { contains: q.search, mode: "insensitive" as const } } },
            { user: { firstName: { contains: q.search, mode: "insensitive" as const } } },
            { user: { lastName: { contains: q.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      ...pageArgs(q),
      orderBy: { createdAt: "desc" },
      select: {
        ...memberSelect,
        memberships: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { endDate: "desc" },
          include: { plan: { select: { name: true, price: true } } },
        },
      },
    }),
  ]);

  const now = new Date();
  const data = rows.map((m) => {
    const active = m.memberships[0];
    return {
      id: m.id,
      memberCode: m.memberCode,
      status: m.status,
      joinedAt: m.joinedAt,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      phone: m.user.phone,
      role: m.user.role,
      activeMembership: active
        ? {
            id: active.id,
            planName: active.plan.name,
            endDate: active.endDate,
            status: deriveMembershipStatus(
              active.status as "ACTIVE" | "EXPIRED" | "CANCELLED",
              active.endDate,
              now,
            ),
          }
        : null,
    };
  });
  return { data, total };
}

function pageArgs(q: Pagination) {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}

export async function getMemberDetail(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      ...memberSelect,
      memberships: {
        orderBy: { createdAt: "desc" },
        include: {
          plan: { select: { id: true, name: true, durationDays: true, price: true } },
          payment: { select: { id: true, amount: true, method: true, status: true, paidAt: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          type: true,
          method: true,
          status: true,
          description: true,
          paidAt: true,
        },
      },
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        take: 20,
        include: {
          session: {
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              status: true,
              class: { select: { name: true } },
              trainer: {
                select: { user: { select: { firstName: true, lastName: true } } },
              },
            },
          },
          attendance: { select: { status: true, recordedAt: true } },
        },
      },
    },
  });
  if (!member) throw notFound("Member");

  const attendance = await prisma.attendance.groupBy({
    by: ["status"],
    where: { enrollment: { memberId: id } },
    _count: { _all: true },
  });

  const now = new Date();
  return {
    ...member,
    memberships: member.memberships.map((m) => ({
      ...m,
      derivedStatus: deriveMembershipStatus(
        m.status as "ACTIVE" | "EXPIRED" | "CANCELLED",
        m.endDate,
        now,
      ),
    })),
    attendanceSummary: {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      ...Object.fromEntries(
        attendance.map((a) => [a.status, a._count._all]),
      ),
    },
  };
}

export async function createMember(actor: AuthUser, input: CreateMemberInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, PASSWORD_ROUNDS),
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: "MEMBER",
        },
      });
      const member = await tx.member.create({
        data: {
          userId: user.id,
          memberCode: await nextMemberCode(tx),
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          address: input.address,
          emergencyContact: input.emergencyContact,
          notes: input.notes,
        },
      });
      await recordActivity(tx, {
        actorId: actor.id,
        action: "member.created",
        entityType: "Member",
        entityId: member.id,
        summary: `Registered member ${input.firstName} ${input.lastName}`,
      });
      return { member, user };
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw conflict("An account with this email already exists");
    }
    throw err;
  }
}

export async function updateMember(
  actor: AuthUser,
  id: string,
  input: UpdateMemberInput,
) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw notFound("Member");

  const memberData: Record<string, unknown> = {};
  if (input.dateOfBirth !== undefined) memberData.dateOfBirth = input.dateOfBirth;
  if (input.gender !== undefined) memberData.gender = input.gender;
  if (input.address !== undefined) memberData.address = input.address;
  if (input.emergencyContact !== undefined)
    memberData.emergencyContact = input.emergencyContact;
  if (input.notes !== undefined) memberData.notes = input.notes;
  if (input.status !== undefined) memberData.status = input.status;

  const userFields: { firstName?: string; lastName?: string; phone?: string | null } = {};
  if (input.firstName !== undefined) userFields.firstName = input.firstName;
  if (input.lastName !== undefined) userFields.lastName = input.lastName;
  if (input.phone !== undefined) userFields.phone = input.phone;

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.member.update({
      where: { id },
      data: stripUndefined(memberData),
    });
    if (Object.keys(userFields).length > 0) {
      await tx.user.update({
        where: { id: member.userId },
        data: stripUndefined(userFields),
      });
    }
    await recordActivity(tx, {
      actorId: actor.id,
      action: "member.updated",
      entityType: "Member",
      entityId: id,
      summary: `Updated member profile ${m.memberCode}`,
    });
    return m;
  });
  return updated;
}

export async function updateOwnMember(
  actor: AuthUser,
  input: UpdateOwnMemberInput,
) {
  const member = await prisma.member.findUnique({
    where: { userId: actor.id },
  });
  if (!member) throw notFound("Member profile");
  return prisma.member.update({
    where: { id: member.id },
    data: stripUndefined(input),
  });
}

export async function getOwnMemberDetail(actor: AuthUser) {
  const member = await prisma.member.findUnique({
    where: { userId: actor.id },
    select: { id: true },
  });
  if (!member) throw notFound("Member profile");
  return getMemberDetail(member.id);
}
