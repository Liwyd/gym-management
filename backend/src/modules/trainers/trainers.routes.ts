import { Router } from "express";
import { z } from "zod";
import { Role, TrainerStatus } from "@prisma/client";
import { forbidden, notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { actorTrainer } from "../../lib/scope";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize, requireAuth } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { searchQuery } from "../../utils/schemas";

export const trainersRouter = Router();

const listQuery = paginationSchema.extend({
  search: searchQuery,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateSchema = z.object({
  specialization: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const trainerInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
    },
  },
  _count: {
    select: {
      sessions: { where: { status: "SCHEDULED", startsAt: { gte: new Date() } } },
    },
  },
} as const;

trainersRouter.get("/trainers", authorize("trainers:list"), async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { user: { firstName: { contains: q.search, mode: "insensitive" as const } } },
            { user: { lastName: { contains: q.search, mode: "insensitive" as const } } },
            { user: { email: { contains: q.search, mode: "insensitive" as const } } },
            { specialization: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.trainer.count({ where }),
    prisma.trainer.findMany({
      where,
      ...pageParams(q),
      orderBy: [{ status: "asc" }, { user: { firstName: "asc" } }],
      include: trainerInclude,
    }),
  ]);
  okList(
    res,
    items.map((t) => ({
      id: t.id,
      status: t.status,
      specialization: t.specialization,
      bio: t.bio,
      upcomingSessions: t._count.sessions,
      user: t.user,
    })),
    buildMeta(q.page, q.limit, total),
  );
});

trainersRouter.get(
  "/trainers/:id",
  authorize("trainers:list"),
  async (req, res) => {
    const id = param(req, "id");
    const trainer = await prisma.trainer.findUnique({
      where: { id },
      include: {
        ...trainerInclude,
        sessions: {
          where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 10,
          include: {
            class: { select: { id: true, name: true, category: true } },
            facility: { select: { id: true, name: true } },
            _count: { select: { enrollments: { where: { status: "ENROLLED" } } } },
          },
        },
      },
    });
    if (!trainer) throw notFound("Trainer");
    const { _count, sessions, ...profile } = trainer;
    ok(res, {
      trainer: {
        ...profile,
        upcomingSessions: _count.sessions,
        nextSessions: sessions.map((s) => ({ ...s, enrolledCount: s._count.enrollments })),
      },
    });
  },
);

/**
 * Trainers edit their own specialization/bio (R8); staff may also change
 * status. Route is requireAuth + service-level scoping.
 */
trainersRouter.patch("/trainers/:id", requireAuth, async (req, res) => {
  const input = parse(updateSchema, req.body, "Trainer");
  const id = param(req, "id");
  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) throw notFound("Trainer");

  const actor = req.user!;
  const isOwn = actor.role === Role.TRAINER
    ? (await actorTrainer(actor))?.id === id
    : false;

  let data: { specialization?: string | null; bio?: string | null; status?: TrainerStatus };
  if (isOwn) {
    const { status: _status, ...selfEditable } = input;
    if (input.status !== undefined) {
      throw forbidden("Trainers cannot change their own account status");
    }
    data = selfEditable;
  } else if (
    actor.role === Role.ADMIN ||
    actor.role === Role.MANAGER ||
    actor.role === Role.RECEPTIONIST
  ) {
    data = input;
  } else {
    throw forbidden();
  }

  const updated = await prisma.trainer.update({ where: { id }, data });
  ok(res, { trainer: updated });
});
