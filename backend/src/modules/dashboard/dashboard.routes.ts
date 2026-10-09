import { Router } from "express";
import { PaymentStatus, Role, SessionStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ok } from "../../lib/respond";
import { authorize } from "../../middleware/auth";
import { DAY_MS, dateOnly, deriveMembershipStatus } from "../rules/rules";
import { expireDueMemberships } from "../memberships/memberships.routes";
import { completeDueSessions } from "../sessions/sessions.routes";

export const dashboardRouter = Router();

const upcomingSessionInclude = {
  class: { select: { name: true, category: true } },
  trainer: { select: { user: { select: { firstName: true, lastName: true } } } },
  facility: { select: { name: true } },
  _count: { select: { enrollments: { where: { status: "ENROLLED" } } } },
} as const;

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function monthsAgo(now: Date, n: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}

async function staffDashboard(role: Role) {
  const now = new Date();
  const today = dateOnly(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const in7Days = new Date(today.getTime() + 7 * DAY_MS);

  const [
    totalMembers,
    activeMemberships,
    expiringSoon,
    todaysSessions,
    todaysAttendance,
    revenue,
    upcomingSessions,
    expiringMemberships,
    recentActivity,
    recentPayments,
    recentPaymentsTotal,
    completedPayments,
  ] = await Promise.all([
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.membership.count({ where: { status: "ACTIVE" } }),
    prisma.membership.count({
      where: { status: "ACTIVE", endDate: { gte: today, lte: in7Days } },
    }),
    prisma.classSession.count({
      where: {
        startsAt: { gte: today, lt: tomorrow },
        status: { not: SessionStatus.CANCELLED },
      },
    }),
    prisma.attendance.count({
      where: { enrollment: { session: { startsAt: { gte: today, lt: tomorrow } } } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.COMPLETED, paidAt: { gte: monthStart(now) } },
    }),
    prisma.classSession.findMany({
      where: { status: SessionStatus.SCHEDULED, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: upcomingSessionInclude,
    }),
    prisma.membership.findMany({
      where: { status: "ACTIVE", endDate: { gte: today, lte: in7Days } },
      orderBy: { endDate: "asc" },
      take: 5,
      include: {
        plan: { select: { name: true } },
        member: {
          select: {
            memberCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED },
      orderBy: { paidAt: "desc" },
      take: 5,
      include: {
        member: {
          select: {
            memberCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: dateOnly(new Date(now.getTime() - 7 * DAY_MS)) },
      },
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: monthsAgo(now, 5) },
      },
      select: { amount: true, paidAt: true },
    }),
  ]);

  const revenueByMonth: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = monthsAgo(now, i);
    const end = i === 0 ? null : monthsAgo(now, i - 1);
    const label = start.toISOString().slice(0, 7);
    const total = completedPayments
      .filter(
        (p) =>
          p.paidAt >= start && (!end || p.paidAt < end),
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);
    revenueByMonth.push({ month: label, total: Math.round(total * 100) / 100 });
  }

  return {
    role,
    generatedAt: now,
    stats: {
      totalMembers,
      activeMemberships,
      expiringSoon,
      todaysSessions,
      todaysAttendance,
      monthRevenue: Math.round(Number(revenue._sum.amount ?? 0) * 100) / 100,
      weekRevenue:
        Math.round(Number(recentPaymentsTotal._sum.amount ?? 0) * 100) / 100,
    },
    revenueByMonth,
    upcomingSessions,
    expiringMemberships,
    recentPayments,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      summary:
        (a.metadata as { summary?: string } | null)?.summary ?? a.action,
      actor: a.actor
        ? `${a.actor.firstName} ${a.actor.lastName}`
        : "System",
      createdAt: a.createdAt,
    })),
    showStaffDetail: role === Role.ADMIN || role === Role.MANAGER || role === Role.RECEPTIONIST,
  };
}

async function trainerDashboard(trainerId: string) {
  const now = new Date();
  const today = dateOnly(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const in7Days = new Date(now.getTime() + 7 * DAY_MS);

  const [todaysSessions, weekSessions, todayOwnSessions, members] =
    await Promise.all([
      prisma.classSession.count({
        where: {
          trainerId,
          startsAt: { gte: today, lt: tomorrow },
          status: { not: SessionStatus.CANCELLED },
        },
      }),
      prisma.classSession.count({
        where: {
          trainerId,
          status: SessionStatus.SCHEDULED,
          startsAt: { gte: now, lt: in7Days },
        },
      }),
      prisma.classSession.findMany({
        where: {
          trainerId,
          startsAt: { gte: today, lt: tomorrow },
          status: { not: SessionStatus.CANCELLED },
        },
        select: { id: true, startsAt: true, status: true },
      }),
      prisma.enrollment.findMany({
        where: { session: { trainerId } },
        distinct: ["memberId"],
        select: { memberId: true },
      }),
    ]);

  const startedSessionIds = todayOwnSessions
    .filter((s) => s.startsAt.getTime() <= now.getTime() && s.status !== "CANCELLED")
    .map((s) => s.id);
  const attended = startedSessionIds.length
    ? await prisma.attendance.findMany({
        where: { enrollment: { sessionId: { in: startedSessionIds } } },
        select: { enrollment: { select: { sessionId: true } } },
      })
    : [];
  const attendedIds = new Set(attended.map((a) => a.enrollment.sessionId));
  const pendingAttendance = startedSessionIds.filter((id) => !attendedIds.has(id))
    .length;

  const upcomingSessions = await prisma.classSession.findMany({
    where: { trainerId, status: SessionStatus.SCHEDULED, startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: 5,
    include: upcomingSessionInclude,
  });

  return {
    role: Role.TRAINER,
    generatedAt: now,
    stats: {
      todaysSessions,
      weekSessions,
      pendingAttendance,
      memberCount: members.length,
    },
    upcomingSessions,
  };
}

async function memberDashboard(userId: string) {
  const now = new Date();
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!member) {
    return {
      role: Role.MEMBER,
      generatedAt: now,
      stats: {
        daysLeft: null,
        upcomingEnrollments: 0,
        unreadNotifications: 0,
      },
      membership: null,
      upcomingSessions: [],
      recentPayments: [],
    };
  }

  const [membership, upcomingCount, upcomingEnrollments, recentPayments, unread] =
    await Promise.all([
      prisma.membership.findFirst({
        where: { memberId: member.id, status: "ACTIVE" },
        orderBy: { endDate: "desc" },
        include: { plan: { select: { name: true, durationDays: true, price: true } } },
      }),
      prisma.enrollment.count({
        where: {
          memberId: member.id,
          status: "ENROLLED",
          session: { status: SessionStatus.SCHEDULED, startsAt: { gte: now } },
        },
      }),
      prisma.enrollment.findMany({
        where: {
          memberId: member.id,
          status: "ENROLLED",
          session: { status: SessionStatus.SCHEDULED, startsAt: { gte: now } },
        },
        orderBy: { session: { startsAt: "asc" } },
        take: 5,
        include: {
          session: {
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              ...upcomingSessionInclude,
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { memberId: member.id, status: PaymentStatus.COMPLETED },
        orderBy: { paidAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          method: true,
          description: true,
          paidAt: true,
        },
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

  const derived = membership
    ? deriveMembershipStatus(membership.status, membership.endDate, now)
    : null;
  const daysLeft = membership
    ? Math.max(
        0,
        Math.ceil(
          (dateOnly(membership.endDate).getTime() + DAY_MS - now.getTime()) /
            DAY_MS,
        ),
      )
    : null;

  return {
    role: Role.MEMBER,
    generatedAt: now,
    stats: {
      daysLeft: derived === "ACTIVE" ? daysLeft : null,
      upcomingEnrollments: upcomingCount,
      unreadNotifications: unread,
    },
    membership: membership
      ? { ...membership, derivedStatus: derived, daysLeft }
      : null,
    upcomingSessions: upcomingEnrollments.map((e) => ({
      ...e.session,
      enrollmentId: e.id,
      enrolledCount: e.session._count.enrollments,
    })),
    recentPayments,
  };
}

dashboardRouter.get("/dashboard", authorize("dashboard:read"), async (req, res) => {
  await expireDueMemberships(prisma);
  await completeDueSessions(prisma);
  const actor = req.user!;

  if (actor.role === Role.MEMBER) {
    ok(res, await memberDashboard(actor.id));
    return;
  }
  if (actor.role === Role.TRAINER) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (!trainer) {
      ok(res, {
        role: Role.TRAINER,
        generatedAt: new Date(),
        stats: { todaysSessions: 0, weekSessions: 0, pendingAttendance: 0, memberCount: 0 },
        upcomingSessions: [],
      });
      return;
    }
    ok(res, await trainerDashboard(trainer.id));
    return;
  }
  ok(res, await staffDashboard(actor.role));
});
