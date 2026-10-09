import { Router } from "express";
import { z } from "zod";
import { Role, SessionStatus } from "@prisma/client";
import { recordActivity, type Db } from "../../lib/activity";
import { forbidden, notFound, stateConflict } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { actorTrainer, requireSessionAccess } from "../../lib/scope";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { dateField } from "../../utils/schemas";
import { notify } from "../notifications/notify";
import { isSessionWindowValid } from "../rules/rules";

export const sessionsRouter = Router();

/** Past SCHEDULED sessions become COMPLETED (system behavior on read). */
export async function completeDueSessions(db: Db): Promise<number> {
  const { count } = await db.classSession.updateMany({
    where: { status: "SCHEDULED", endsAt: { lt: new Date() } },
    data: { status: "COMPLETED" },
  });
  return count;
}

const listQuery = paginationSchema.extend({
  from: dateField.optional(),
  to: dateField.optional(),
  trainerId: z.uuid().optional(),
  classId: z.uuid().optional(),
  facilityId: z.uuid().optional(),
  status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  mine: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

const createSchema = z.object({
  classId: z.uuid(),
  trainerId: z.uuid(),
  facilityId: z.uuid(),
  startsAt: dateField,
  endsAt: dateField,
});

const updateSchema = z.object({
  trainerId: z.uuid().optional(),
  facilityId: z.uuid().optional(),
  startsAt: dateField.optional(),
  endsAt: dateField.optional(),
});

const cancelSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

const sessionInclude = {
  class: { select: { id: true, name: true, category: true, capacity: true } },
  trainer: {
    select: {
      id: true,
      specialization: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  facility: { select: { id: true, name: true, type: true, capacity: true } },
  _count: {
    select: { enrollments: { where: { status: "ENROLLED" } } },
  },
} as const;

/** R5 — trainer and facility must not overlap existing SCHEDULED sessions. */
async function assertNoConflict(
  tx: Db,
  input: {
    startsAt: Date;
    endsAt: Date;
    trainerId: string;
    facilityId: string;
    excludeSessionId?: string;
  },
) {
  const overlap = (excludeId?: string) => ({
    status: SessionStatus.SCHEDULED,
    startsAt: { lt: input.endsAt },
    endsAt: { gt: input.startsAt },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  });

  const trainerClash = await tx.classSession.findFirst({
    where: { ...overlap(input.excludeSessionId), trainerId: input.trainerId },
    select: { id: true },
  });
  if (trainerClash) {
    throw stateConflict("The trainer is already booked during this time slot");
  }
  const facilityClash = await tx.classSession.findFirst({
    where: { ...overlap(input.excludeSessionId), facilityId: input.facilityId },
    select: { id: true },
  });
  if (facilityClash) {
    throw stateConflict("The facility is already booked during this time slot");
  }
}

async function validateScheduleInput(
  input: { classId: string; trainerId: string; facilityId: string; startsAt: Date; endsAt: Date },
  opts: { requireFuture: boolean },
) {
  if (!isSessionWindowValid(input.startsAt, input.endsAt)) {
    throw stateConflict("Session end time must be after its start time");
  }
  if (opts.requireFuture && input.startsAt.getTime() <= Date.now()) {
    throw stateConflict("Sessions must be scheduled in the future");
  }

  const [fitnessClass, trainer, facility] = await Promise.all([
    prisma.fitnessClass.findUnique({ where: { id: input.classId } }),
    prisma.trainer.findUnique({ where: { id: input.trainerId } }),
    prisma.facility.findUnique({ where: { id: input.facilityId } }),
  ]);
  if (!fitnessClass) throw notFound("Class");
  if (!fitnessClass.isActive) throw stateConflict("This class is not active");
  if (!trainer) throw notFound("Trainer");
  if (trainer.status !== "ACTIVE") throw stateConflict("Trainer is inactive");
  if (!facility) throw notFound("Facility");
  if (facility.status !== "ACTIVE") throw stateConflict("Facility is inactive");
  if (facility.capacity < fitnessClass.capacity) {
    throw stateConflict(
      `Facility capacity (${facility.capacity}) is smaller than class capacity (${fitnessClass.capacity})`,
    );
  }
  return { fitnessClass, trainer, facility };
}

sessionsRouter.get("/sessions", authorize("sessions:list"), async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  await completeDueSessions(prisma);

  const where: Record<string, unknown> = {
    ...(q.trainerId ? { trainerId: q.trainerId } : {}),
    ...(q.classId ? { classId: q.classId } : {}),
    ...(q.facilityId ? { facilityId: q.facilityId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.from || q.to
      ? {
          startsAt: {
            ...(q.from ? { gte: q.from } : {}),
            ...(q.to ? { lte: q.to } : {}),
          },
        }
      : {}),
  };

  if (q.mine && req.user!.role === Role.TRAINER) {
    const own = await actorTrainer(req.user!);
    if (!own) {
      okList(res, [], buildMeta(q.page, q.limit, 0));
      return;
    }
    where.trainerId = own.id;
  } else if (q.mine && req.user!.role === Role.MEMBER) {
    const ownMember = await prisma.member.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!ownMember) {
      okList(res, [], buildMeta(q.page, q.limit, 0));
      return;
    }
    where.enrollments = {
      some: { memberId: ownMember.id, status: "ENROLLED" as const },
    };
  }
  const [total, items] = await prisma.$transaction([
    prisma.classSession.count({ where }),
    prisma.classSession.findMany({
      where,
      ...pageParams(q),
      orderBy: { startsAt: "asc" },
      include: sessionInclude,
    }),
  ]);
  okList(res, items, buildMeta(q.page, q.limit, total));
});

sessionsRouter.get("/sessions/:id", authorize("sessions:list"), async (req, res) => {
  const id = param(req, "id");
  await completeDueSessions(prisma);
  const session = await prisma.classSession.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!session) throw notFound("Session");

  const actor = req.user!;
  const isStaffRole =
    actor.role === Role.ADMIN ||
    actor.role === Role.MANAGER ||
    actor.role === Role.RECEPTIONIST;
  const ownTrainer = actor.role === Role.TRAINER ? await actorTrainer(actor) : null;
  const canSeeRoster =
    isStaffRole ||
    (actor.role === Role.TRAINER && ownTrainer?.id === session.trainerId);

  let roster: unknown = null;
  if (canSeeRoster) {
    roster = await prisma.enrollment.findMany({
      where: { sessionId: id },
      include: {
        member: {
          select: {
            id: true,
            memberCode: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        attendance: { select: { status: true, recordedAt: true } },
      },
      orderBy: { enrolledAt: "asc" },
    });
  } else if (actor.role === Role.MEMBER) {
    const ownMember = await prisma.member.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (ownMember) {
      const ownEnrollment = await prisma.enrollment.findMany({
        where: { sessionId: id, memberId: ownMember.id, status: "ENROLLED" },
        include: {
          member: {
            select: {
              id: true,
              memberCode: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          attendance: { select: { status: true, recordedAt: true } },
        },
      });
      roster = ownEnrollment;
    }
  }

  ok(res, { session: { ...session, roster } });
});

sessionsRouter.post("/sessions", authorize("sessions:write"), async (req, res) => {
  const input = parse(createSchema, req.body, "Session");

  if (req.user!.role === Role.TRAINER) {
    const own = await actorTrainer(req.user!);
    if (!own || own.id !== input.trainerId) {
      throw forbidden("Trainers can only schedule their own sessions");
    }
  }

  await validateScheduleInput(input, { requireFuture: true });

  const session = await prisma.$transaction(async (tx) => {
    await assertNoConflict(tx, input);
    const created = await tx.classSession.create({
      data: { ...input, status: "SCHEDULED" },
      include: sessionInclude,
    });
    await recordActivity(tx, {
      actorId: req.user!.id,
      action: "session.scheduled",
      entityType: "ClassSession",
      entityId: created.id,
      summary: `Scheduled ${created.class.name} on ${created.startsAt.toISOString().slice(0, 16).replace("T", " ")}`,
      metadata: { className: created.class.name },
    });
    return created;
  });
  ok(res, { session }, 201);
});

sessionsRouter.patch("/sessions/:id", authorize("sessions:write"), async (req, res) => {
  const id = param(req, "id");
  const input = parse(updateSchema, req.body, "Session");
  const existing = await prisma.classSession.findUnique({ where: { id } });
  if (!existing) throw notFound("Session");
  await requireSessionAccess(req.user!, existing);
  if (existing.status !== SessionStatus.SCHEDULED) {
    throw stateConflict("Only scheduled sessions can be modified");
  }

  const next = {
    classId: existing.classId,
    trainerId: input.trainerId ?? existing.trainerId,
    facilityId: input.facilityId ?? existing.facilityId,
    startsAt: input.startsAt ?? existing.startsAt,
    endsAt: input.endsAt ?? existing.endsAt,
  };

  await validateScheduleInput(next, { requireFuture: false });
  if (next.startsAt.getTime() <= Date.now()) {
    throw stateConflict("Sessions must be rescheduled into the future");
  }

  const session = await prisma.$transaction(async (tx) => {
    await assertNoConflict(tx, { ...next, excludeSessionId: id });
    const updated = await tx.classSession.update({
      where: { id },
      data: next,
      include: sessionInclude,
    });
    await recordActivity(tx, {
      actorId: req.user!.id,
      action: "session.updated",
      entityType: "ClassSession",
      entityId: id,
      summary: `Rescheduled ${updated.class.name} to ${updated.startsAt.toISOString().slice(0, 16).replace("T", " ")}`,
    });
    return updated;
  });
  ok(res, { session });
});

sessionsRouter.post(
  "/sessions/:id/cancel",
  authorize("sessions:write"),
  async (req, res) => {
    const id = param(req, "id");
    const input = parse(cancelSchema, req.body, "Cancellation");
    const existing = await prisma.classSession.findUnique({
      where: { id },
      include: { class: { select: { name: true } } },
    });
    if (!existing) throw notFound("Session");
    await requireSessionAccess(req.user!, existing);
    if (existing.status !== SessionStatus.SCHEDULED) {
      throw stateConflict("Only scheduled sessions can be cancelled");
    }

    const session = await prisma.$transaction(async (tx) => {
      const updated = await tx.classSession.update({
        where: { id },
        data: { status: "CANCELLED", cancelReason: input.reason },
        include: sessionInclude,
      });

      const enrollments = await tx.enrollment.findMany({
        where: { sessionId: id, status: "ENROLLED" },
        select: { member: { select: { userId: true } } },
      });
      const startsAtText = updated.startsAt.toISOString().slice(0, 16).replace("T", " ");
      for (const e of enrollments) {
        await notify(tx, {
          userId: e.member.userId,
          title: "Class session cancelled",
          message: `${updated.class.name} on ${startsAtText} was cancelled${input.reason ? `: ${input.reason}` : "."}`,
          type: "WARNING",
        });
      }

      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "session.cancelled",
        entityType: "ClassSession",
        entityId: id,
        summary: `Cancelled ${updated.class.name} (${enrollments.length} enrolled notified)`,
        metadata: { reason: input.reason, enrolled: enrollments.length },
      });
      return updated;
    });
    ok(res, { session });
  },
);
