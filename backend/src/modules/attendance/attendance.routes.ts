import { Router } from "express";
import { z } from "zod";
import { Role, SessionStatus } from "@prisma/client";
import { recordActivity } from "../../lib/activity";
import { businessRule, notFound, stateConflict } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { actorTrainer, requireSessionAccess } from "../../lib/scope";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { completeDueSessions } from "../sessions/sessions.routes";
import { canRecordAttendance } from "../rules/rules";

export const attendanceRouter = Router();

const listQuery = paginationSchema.extend({
  sessionId: z.uuid().optional(),
  memberId: z.uuid().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]).optional(),
});

const markSchema = z.object({
  memberId: z.uuid(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});

const recordSchema = z.object({
  sessionId: z.uuid(),
  marks: z.array(markSchema).min(1).max(200),
});

const attendanceInclude = {
  enrollment: {
    select: {
      id: true,
      enrolledAt: true,
      member: {
        select: {
          id: true,
          memberCode: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      session: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          class: { select: { name: true } },
          trainerId: true,
        },
      },
    },
  },
} as const;

attendanceRouter.get(
  "/attendance",
  authorize("attendance:read"),
  async (req, res) => {
    const q = parse(listQuery, req.query, "Query");
    await completeDueSessions(prisma);

    const actor = req.user!;
    const where: Record<string, unknown> = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.memberId ? { enrollment: { memberId: q.memberId } } : {}),
      ...(q.sessionId ? { enrollment: { sessionId: q.sessionId } } : {}),
    };

    if (actor.role === Role.TRAINER) {
      const own = await actorTrainer(actor);
      where.enrollment = {
        ...(typeof where.enrollment === "object" && where.enrollment
          ? where.enrollment
          : {}),
        session: { trainerId: own?.id ?? "no-trainer-profile" },
      };
    }

    const [total, items] = await prisma.$transaction([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        ...pageParams(q),
        orderBy: { recordedAt: "desc" },
        include: attendanceInclude,
      }),
    ]);
    okList(res, items, buildMeta(q.page, q.limit, total));
  },
);

/** UC-15 / R4 — batch upsert of attendance marks for one session. */
attendanceRouter.post(
  "/attendance",
  authorize("attendance:write"),
  async (req, res) => {
    const input = parse(recordSchema, req.body, "Attendance");
    const session = await prisma.classSession.findUnique({
      where: { id: input.sessionId },
      include: { class: { select: { name: true } } },
    });
    if (!session) throw notFound("Session");
    await requireSessionAccess(req.user!, session);

    if (session.status === SessionStatus.CANCELLED) {
      throw stateConflict("Cannot record attendance for a cancelled session");
    }
    if (!canRecordAttendance(session.startsAt, new Date())) {
      throw stateConflict("Attendance can only be recorded once the session has started");
    }

    const memberIds = input.marks.map((m) => m.memberId);
    const enrollments = await prisma.enrollment.findMany({
      where: { sessionId: input.sessionId, memberId: { in: memberIds } },
      select: { id: true, memberId: true, status: true },
    });
    const byMember = new Map(enrollments.map((e) => [e.memberId, e]));

    for (const mark of input.marks) {
      const enrollment = byMember.get(mark.memberId);
      if (!enrollment || enrollment.status !== "ENROLLED") {
        throw businessRule(
          "NOT_ENROLLED",
          "All marked members must be enrolled in this session",
        );
      }
    }

    const results = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const mark of input.marks) {
        const enrollment = byMember.get(mark.memberId)!;
        saved.push(
          await tx.attendance.upsert({
            where: { enrollmentId: enrollment.id },
            update: { status: mark.status, recordedById: req.user!.id },
            create: {
              enrollmentId: enrollment.id,
              status: mark.status,
              recordedById: req.user!.id,
            },
          }),
        );
      }
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "attendance.recorded",
        entityType: "Attendance",
        entityId: session.id,
        summary: `Recorded attendance for ${input.marks.length} member${input.marks.length === 1 ? "" : "s"} in ${session.class.name}`,
        metadata: { sessionId: session.id, count: input.marks.length },
      });
      return saved;
    });

    ok(res, { attendance: results, count: results.length }, 201);
  },
);
