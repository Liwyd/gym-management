import { Router } from "express";
import { z } from "zod";
import { EnrollmentStatus, Role, SessionStatus } from "@prisma/client";
import { recordActivity } from "../../lib/activity";
import { badRequest, businessRule, forbidden, notFound, stateConflict } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { actorMember, requireMemberAccess } from "../../lib/scope";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { notify } from "../notifications/notify";
import { expireDueMemberships } from "../memberships/memberships.routes";
import { checkEnrollment } from "../rules/rules";

export const enrollmentsRouter = Router();

const listQuery = paginationSchema.extend({
  sessionId: z.uuid().optional(),
  memberId: z.uuid().optional(),
  status: z.enum(["ENROLLED", "CANCELLED"]).optional(),
});

const createSchema = z.object({
  memberId: z.uuid(),
  sessionId: z.uuid(),
});

const enrollmentInclude = {
  member: {
    select: {
      id: true,
      memberCode: true,
      status: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  session: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      cancelReason: true,
      class: { select: { id: true, name: true, category: true, capacity: true } },
      trainer: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      facility: { select: { id: true, name: true } },
    },
  },
  attendance: { select: { status: true, recordedAt: true } },
} as const;

enrollmentsRouter.get(
  "/enrollments",
  authorize("enrollments:list"),
  async (req, res) => {
    const q = parse(listQuery, req.query, "Query");
    const actor = req.user!;
    const where: Record<string, unknown> = {
      ...(q.sessionId ? { sessionId: q.sessionId } : {}),
      ...(q.status ? { status: q.status } : {}),
    };

    if (actor.role === Role.MEMBER) {
      const own = await actorMember(actor);
      where.memberId = own?.id ?? "no-member-profile";
      if (q.memberId && q.memberId !== own?.id) throw forbidden();
    } else if (q.memberId) {
      where.memberId = q.memberId;
    }

    if (actor.role === Role.TRAINER) {
      const own = await prisma.trainer.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });
      where.session = { trainerId: own?.id ?? "no-trainer-profile" };
    }

    const [total, items] = await prisma.$transaction([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        ...pageParams(q),
        orderBy: { enrolledAt: "desc" },
        include: enrollmentInclude,
      }),
    ]);
    okList(res, items, buildMeta(q.page, q.limit, total));
  },
);

/** UC-13 — R3 enforced server-side. */
enrollmentsRouter.post(
  "/enrollments",
  authorize("enrollments:write"),
  async (req, res) => {
    const input = parse(createSchema, req.body, "Enrollment");
    const member = await requireMemberAccess(req.user!, input.memberId);

    const session = await prisma.classSession.findUnique({
      where: { id: input.sessionId },
      include: { class: { select: { id: true, name: true, capacity: true } } },
    });
    if (!session) throw notFound("Session");

    await expireDueMemberships(prisma);

    const [membership, existing, enrolledCount] = await Promise.all([
      prisma.membership.findFirst({
        where: { memberId: member.id, status: "ACTIVE" },
        orderBy: { endDate: "desc" },
        select: { id: true, status: true, endDate: true },
      }),
      prisma.enrollment.findFirst({
        where: { memberId: member.id, sessionId: input.sessionId },
        select: { id: true, status: true },
      }),
      prisma.enrollment.count({
        where: { sessionId: input.sessionId, status: "ENROLLED" },
      }),
    ]);

    const decision = checkEnrollment({
      memberStatus: member.status,
      membership,
      sessionStatus: session.status,
      startsAt: session.startsAt,
      enrolledCount,
      capacity: session.class.capacity,
      existingEnrollment: existing?.status ?? null,
      now: new Date(),
    });
    if (!decision.ok) {
      if (decision.code === "STATE_CONFLICT") throw stateConflict(decision.message);
      if (decision.code === "BAD_REQUEST") throw badRequest(decision.message);
      throw businessRule(decision.code, decision.message);
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const record = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: { status: "ENROLLED", enrolledAt: new Date() },
            include: enrollmentInclude,
          })
        : await tx.enrollment.create({
            data: {
              memberId: member.id,
              sessionId: input.sessionId,
              status: "ENROLLED",
            },
            include: enrollmentInclude,
          });

      const startsAtText = session.startsAt
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");
      await notify(tx, {
        userId: member.userId,
        title: "Enrollment confirmed",
        message: `You are enrolled in ${session.class.name} on ${startsAtText}.`,
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "enrollment.created",
        entityType: "Enrollment",
        entityId: record.id,
        summary: `Enrolled ${member.memberCode} in ${session.class.name}`,
        metadata: { memberCode: member.memberCode, className: session.class.name },
      });
      return record;
    });

    ok(res, { enrollment }, 201);
  },
);

/** UC-14 — cancel an enrollment (member self or staff). */
enrollmentsRouter.post(
  "/enrollments/:id/cancel",
  authorize("enrollments:write"),
  async (req, res) => {
    const id = param(req, "id");
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            userId: true,
            memberCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        session: {
          select: {
            id: true,
            startsAt: true,
            status: true,
            class: { select: { name: true } },
          },
        },
      },
    });
    if (!enrollment) throw notFound("Enrollment");

    const actor = req.user!;
    if (actor.role === Role.MEMBER && enrollment.member.userId !== actor.id) {
      throw forbidden();
    }
    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw stateConflict("This enrollment is already cancelled");
    }
    if (
      enrollment.session.status !== SessionStatus.SCHEDULED ||
      enrollment.session.startsAt.getTime() <= Date.now()
    ) {
      throw stateConflict("Enrollments can only be cancelled before the session starts");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.enrollment.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: enrollmentInclude,
      });
      const startsAtText = enrollment.session.startsAt
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");
      await notify(tx, {
        userId: enrollment.member.userId,
        title: "Enrollment cancelled",
        message: `Your spot in ${enrollment.session.class.name} on ${startsAtText} was cancelled.`,
        type: "WARNING",
      });
      await recordActivity(tx, {
        actorId: actor.id,
        action: "enrollment.cancelled",
        entityType: "Enrollment",
        entityId: id,
        summary: `Cancelled enrollment of ${enrollment.member.memberCode} in ${enrollment.session.class.name}`,
      });
      return record;
    });

    ok(res, { enrollment: updated });
  },
);
