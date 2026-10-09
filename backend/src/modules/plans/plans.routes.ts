import { Router } from "express";
import { z } from "zod";
import { recordActivity } from "../../lib/activity";
import { conflict, notFound } from "../../lib/errors";
import { ok, okList, buildMeta } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { prisma } from "../../lib/prisma";
import { authorize, requireAuth } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { boolQuery, nameField, priceField } from "../../utils/schemas";

export const plansRouter = Router();

const listQuery = paginationSchema.extend({
  includeInactive: boolQuery,
  search: z.string().trim().max(80).optional(),
});

const createSchema = z.object({
  name: nameField.max(80),
  description: z.string().trim().max(300).nullable().optional(),
  durationDays: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 day")
    .max(3650),
  price: priceField,
});

const updateSchema = createSchema.partial();

plansRouter.get("/plans", requireAuth, async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const where = {
    ...(q.includeInactive ? {} : { isActive: true }),
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
    prisma.membershipPlan.count({ where }),
    prisma.membershipPlan.findMany({
      where,
      ...pageParams(q),
      orderBy: [{ isActive: "desc" }, { price: "asc" }],
      include: {
        _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
      },
    }),
  ]);
  okList(
    res,
    items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationDays: p.durationDays,
      price: p.price,
      isActive: p.isActive,
      activeMemberships: p._count.memberships,
      createdAt: p.createdAt,
    })),
    buildMeta(q.page, q.limit, total),
  );
});

plansRouter.get("/plans/:id", requireAuth, async (req, res) => {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: param(req, "id") },
    include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
  });
  if (!plan) throw notFound("Plan");
  ok(res, {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    durationDays: plan.durationDays,
    price: plan.price,
    isActive: plan.isActive,
    activeMemberships: plan._count.memberships,
    createdAt: plan.createdAt,
  });
});

plansRouter.post("/plans", authorize("plans:write"), async (req, res) => {
  const input = parse(createSchema, req.body, "Plan");
  try {
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.membershipPlan.create({ data: input });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "plan.created",
        entityType: "MembershipPlan",
        entityId: created.id,
        summary: `Created membership plan "${created.name}"`,
      });
      return created;
    });
    ok(res, { plan }, 201);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw conflict("A plan with this name already exists");
    }
    throw err;
  }
});

plansRouter.patch("/plans/:id", authorize("plans:write"), async (req, res) => {
  const input = parse(updateSchema, req.body, "Plan");
  const existing = await prisma.membershipPlan.findUnique({
    where: { id: param(req, "id") },
  });
  if (!existing) throw notFound("Plan");
  try {
    const plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.membershipPlan.update({
        where: { id: existing.id },
        data: input,
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "plan.updated",
        entityType: "MembershipPlan",
        entityId: updated.id,
        summary: `Updated membership plan "${updated.name}"`,
      });
      return updated;
    });
    ok(res, { plan });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw conflict("A plan with this name already exists");
    }
    throw err;
  }
});
