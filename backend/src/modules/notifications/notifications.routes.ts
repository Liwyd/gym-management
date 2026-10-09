import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { requireAuth } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";

export const notificationsRouter = Router();

const listQuery = paginationSchema.extend({
  unread: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

notificationsRouter.get("/notifications", requireAuth, async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const where = {
    userId: req.user!.id,
    ...(q.unread ? { readAt: null } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      ...pageParams(q),
      orderBy: { createdAt: "desc" },
    }),
  ]);
  okList(res, items, buildMeta(q.page, q.limit, total));
});

notificationsRouter.get(
  "/notifications/unread-count",
  requireAuth,
  async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    ok(res, { count });
  },
);

notificationsRouter.post(
  "/notifications/read-all",
  requireAuth,
  async (req, res) => {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    ok(res, { count });
  },
);

notificationsRouter.post(
  "/notifications/:id/read",
  requireAuth,
  async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) throw notFound("Notification");
    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    ok(res, { notification });
  },
);
