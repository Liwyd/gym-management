import bcrypt from "bcryptjs";
import request from "supertest";
import type { Express } from "express";
import type { Role } from "@prisma/client";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";

/**
 * Integration tests need a real PostgreSQL (CI service container).
 * They skip cleanly when TEST_DATABASE_URL is not set.
 */
export const apiAvailable = Boolean(process.env.TEST_DATABASE_URL);

export const app: Express = createApp();

let ipCounter = 0;
export function uniqueIp(): string {
  ipCounter += 1;
  return `10.99.${Math.floor(ipCounter / 200)}.${ipCounter % 200}`;
}

const TABLES = [
  "Attendance",
  "Enrollment",
  "ClassSession",
  "Membership",
  "Payment",
  "Notification",
  "ActivityLog",
  "FitnessClass",
  "MembershipPlan",
  "Facility",
  "Trainer",
  "Member",
  "User",
] as const;

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}

/** Direct Prisma access for assertions/fixtures inside tests. */
export function prismaRef() {
  return prisma;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  memberId?: string;
  memberCode?: string;
  trainerId?: string;
}

let userSeq = 0;

export async function makeUser(input: {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  member?: boolean;
  trainer?: boolean;
}): Promise<TestUser> {
  userSeq += 1;
  const password = input.password ?? "Password123!";
  const email =
    input.email ?? `user${userSeq}.${Date.now()}@test.club`;
  const firstName = input.firstName ?? `Test${userSeq}`;
  const lastName = input.lastName ?? "User";

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      firstName,
      lastName,
      role: input.role,
    },
  });

  let memberId: string | undefined;
  let memberCode: string | undefined;
  if (input.member) {
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        memberCode: `MB-T${userSeq}-${user.id.slice(0, 6).toUpperCase()}`,
      },
    });
    memberId = member.id;
    memberCode = member.memberCode;
  }

  let trainerId: string | undefined;
  if (input.trainer) {
    const trainer = await prisma.trainer.create({ data: { userId: user.id } });
    trainerId = trainer.id;
  }

  return {
    id: user.id,
    email,
    password,
    firstName,
    lastName,
    role: input.role,
    memberId,
    memberCode,
    trainerId,
  };
}

export async function login(user: Pick<TestUser, "email" | "password">) {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .set("X-Forwarded-For", uniqueIp())
    .send({ email: user.email, password: user.password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const raw = res.headers["set-cookie"] as string[] | string | undefined;
  const cookie = Array.isArray(raw) ? raw[0]! : raw!;
  return cookie.split(";")[0]!;
}

export function cookieHeader(cookie: string) {
  return { Cookie: cookie };
}

export async function makePlan(overrides?: {
  name?: string;
  durationDays?: number;
  price?: number;
  isActive?: boolean;
}) {
  userSeq += 1;
  return prisma.membershipPlan.create({
    data: {
      name: overrides?.name ?? `Plan ${userSeq}`,
      durationDays: overrides?.durationDays ?? 30,
      price: overrides?.price ?? 49.99,
      isActive: overrides?.isActive ?? true,
    },
  });
}

export async function makeFacility(overrides?: { capacity?: number }) {
  userSeq += 1;
  return prisma.facility.create({
    data: {
      name: `Facility ${userSeq}`,
      type: "STUDIO",
      capacity: overrides?.capacity ?? 30,
    },
  });
}

export async function makeClass(overrides?: { capacity?: number; name?: string }) {
  userSeq += 1;
  return prisma.fitnessClass.create({
    data: {
      name: overrides?.name ?? `Class ${userSeq}`,
      category: "Strength",
      capacity: overrides?.capacity ?? 2,
    },
  });
}

export async function makeSession(input: {
  classId: string;
  trainerId: string;
  facilityId: string;
  startsAt: Date;
  endsAt: Date;
  status?: "SCHEDULED" | "CANCELLED" | "COMPLETED";
}) {
  return prisma.classSession.create({
    data: { ...input, status: input.status ?? "SCHEDULED" },
  });
}

export async function activateMembership(memberId: string, planId: string) {
  const plan = await prisma.membershipPlan.findUniqueOrThrow({
    where: { id: planId },
  });
  const now = new Date();
  return prisma.membership.create({
    data: {
      memberId,
      planId,
      startDate: now,
      endDate: new Date(now.getTime() + plan.durationDays * 86_400_000),
      status: "ACTIVE",
    },
  });
}
