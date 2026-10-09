import { Router } from "express";
import { z } from "zod";
import { recordActivity } from "../../lib/activity";
import { conflict, notFound, stateConflict } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { nameField, searchQuery } from "../../utils/schemas";

export const facilitiesRouter = Router();

const listQuery = paginationSchema.extend({
  search: searchQuery,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  type: z.enum(["GYM_FLOOR", "STUDIO", "POOL", "COURT"]).optional(),
});

const createSchema = z.object({
  name: nameField.max(80),
  type: z.enum(["GYM_FLOOR", "STUDIO", "POOL", "COURT"]),
  capacity: z.coerce.number().int().min(1).max(1000),
  description: z.string().trim().max(300).nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

facilitiesRouter.get(
  "/facilities",
  authorize("facilities:list"),
  async (req, res) => {
    const q = parse(listQuery, req.query, "Query");
    const now = new Date();
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.type ? { type: q.type } : {}),
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
      prisma.facility.count({ where }),
      prisma.facility.findMany({
        where,
        ...pageParams(q),
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: {
              sessions: { where: { status: "SCHEDULED", startsAt: { gte: now } } },
            },
          },
        },
      }),
    ]);
    okList(
      res,
      items.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        capacity: f.capacity,
        status: f.status,
        description: f.description,
        upcomingSessions: f._count.sessions,
      })),
      buildMeta(q.page, q.limit, total),
    );
  },
);

facilitiesRouter.post(
  "/facilities",
  authorize("facilities:write"),
  async (req, res) => {
    const input = parse(createSchema, req.body, "Facility");
    try {
      const facility = await prisma.$transaction(async (tx) => {
        const created = await tx.facility.create({ data: input });
        await recordActivity(tx, {
          actorId: req.user!.id,
          action: "facility.created",
          entityType: "Facility",
          entityId: created.id,
          summary: `Created facility "${created.name}"`,
        });
        return created;
      });
      ok(res, { facility }, 201);
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw conflict("A facility with this name already exists");
      }
      throw err;
    }
  },
);

facilitiesRouter.patch(
  "/facilities/:id",
  authorize("facilities:write"),
  async (req, res) => {
    const input = parse(updateSchema, req.body, "Facility");
    const id = param(req, "id");
    const existing = await prisma.facility.findUnique({ where: { id } });
    if (!existing) throw notFound("Facility");

    if (input.status === "INACTIVE") {
      const upcoming = await prisma.classSession.count({
        where: { facilityId: id, status: "SCHEDULED", startsAt: { gte: new Date() } },
      });
      if (upcoming > 0) {
        throw stateConflict(
          `Facility has ${upcoming} upcoming scheduled session${upcoming === 1 ? "" : "s"}`,
        );
      }
    }

    try {
      const facility = await prisma.$transaction(async (tx) => {
        const updated = await tx.facility.update({ where: { id }, data: input });
        await recordActivity(tx, {
          actorId: req.user!.id,
          action: "facility.updated",
          entityType: "Facility",
          entityId: id,
          summary: `Updated facility "${updated.name}"`,
        });
        return updated;
      });
      ok(res, { facility });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw conflict("A facility with this name already exists");
      }
      throw err;
    }
  },
);
