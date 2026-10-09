import { Router } from "express";
import { z } from "zod";
import { recordActivity } from "../../lib/activity";
import { conflict, notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { boolQuery, nameField, searchQuery } from "../../utils/schemas";

export const classesRouter = Router();

const listQuery = paginationSchema.extend({
  includeInactive: boolQuery,
  search: searchQuery,
  category: z.string().trim().max(50).optional(),
});

const createSchema = z.object({
  name: nameField.max(80),
  category: z.string().trim().min(1).max(50),
  capacity: z.coerce.number().int().min(1).max(100).default(12),
  description: z.string().trim().max(500).nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

classesRouter.get("/classes", authorize("classes:list"), async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const now = new Date();
  const where = {
    ...(q.includeInactive ? {} : { isActive: true }),
    ...(q.category ? { category: q.category } : {}),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" as const } },
            { description: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.fitnessClass.count({ where }),
    prisma.fitnessClass.findMany({
      where,
      ...pageParams(q),
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            sessions: {
              where: { status: "SCHEDULED", startsAt: { gte: now } },
            },
          },
        },
      },
    }),
  ]);
  okList(
    res,
    items.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      capacity: c.capacity,
      description: c.description,
      isActive: c.isActive,
      upcomingSessions: c._count.sessions,
      createdAt: c.createdAt,
    })),
    buildMeta(q.page, q.limit, total),
  );
});

classesRouter.post("/classes", authorize("classes:write"), async (req, res) => {
  const input = parse(createSchema, req.body, "Class");
  try {
    const fitnessClass = await prisma.$transaction(async (tx) => {
      const created = await tx.fitnessClass.create({ data: input });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "class.created",
        entityType: "FitnessClass",
        entityId: created.id,
        summary: `Created class "${created.name}"`,
      });
      return created;
    });
    ok(res, { class: fitnessClass }, 201);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw conflict("A class with this name already exists");
    }
    throw err;
  }
});

classesRouter.patch("/classes/:id", authorize("classes:write"), async (req, res) => {
  const input = parse(updateSchema, req.body, "Class");
  const id = param(req, "id");
  const existing = await prisma.fitnessClass.findUnique({ where: { id } });
  if (!existing) throw notFound("Class");
  try {
    const fitnessClass = await prisma.$transaction(async (tx) => {
      const updated = await tx.fitnessClass.update({ where: { id }, data: input });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "class.updated",
        entityType: "FitnessClass",
        entityId: id,
        summary: `Updated class "${updated.name}"`,
      });
      return updated;
    });
    ok(res, { class: fitnessClass });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw conflict("A class with this name already exists");
    }
    throw err;
  }
});
