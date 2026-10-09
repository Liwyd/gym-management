import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";
import { recordActivity } from "../../lib/activity";
import { conflict, notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { emailField, nameField, passwordField, searchQuery } from "../../utils/schemas";
import { PASSWORD_ROUNDS } from "../auth/auth.service";

export const usersRouter = Router();

const listQuery = paginationSchema.extend({
  search: searchQuery,
  role: z.enum(["ADMIN", "MANAGER", "TRAINER", "RECEPTIONIST", "MEMBER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const createSchema = z.object({
  email: emailField,
  password: passwordField,
  firstName: nameField,
  lastName: nameField,
  phone: z.string().trim().max(30).optional(),
  role: z.enum(["ADMIN", "MANAGER", "TRAINER", "RECEPTIONIST"]),
});

const updateSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  role: z.enum(["ADMIN", "MANAGER", "TRAINER", "RECEPTIONIST"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  password: passwordField.optional(),
});

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  member: { select: { id: true, memberCode: true } },
  trainer: { select: { id: true, specialization: true } },
} as const;

usersRouter.get("/users", authorize("users:list"), async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const where = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { email: { contains: q.search, mode: "insensitive" as const } },
            { firstName: { contains: q.search, mode: "insensitive" as const } },
            { lastName: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      ...pageParams(q),
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      select: userSelect,
    }),
  ]);
  okList(res, items, buildMeta(q.page, q.limit, total));
});

usersRouter.get("/users/:id", authorize("users:list"), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: param(req, "id") },
    select: userSelect,
  });
  if (!user) throw notFound("User");
  ok(res, { user });
});

usersRouter.post("/users", authorize("users:write"), async (req, res) => {
  const input = parse(createSchema, req.body, "User");
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, PASSWORD_ROUNDS),
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.role,
        },
        select: userSelect,
      });
      if (input.role === Role.TRAINER) {
        await tx.trainer.create({ data: { userId: created.id } });
      }
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "user.created",
        entityType: "User",
        entityId: created.id,
        summary: `Created ${input.role.toLowerCase()} account for ${input.firstName} ${input.lastName}`,
        metadata: { role: input.role },
      });
      return created;
    });
    ok(res, { user }, 201);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw conflict("An account with this email already exists");
    }
    throw err;
  }
});

usersRouter.patch("/users/:id", authorize("users:write"), async (req, res) => {
  const input = parse(updateSchema, req.body, "User");
  const id = param(req, "id");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("User");

  const actor = req.user!;

  if (target.id === actor.id) {
    if (
      (input.role !== undefined && input.role !== target.role) ||
      (input.status !== undefined && input.status !== target.status)
    ) {
      throw conflict("You cannot change your own role or status");
    }
  }

  if (
    target.role === Role.ADMIN &&
    ((input.role !== undefined && input.role !== Role.ADMIN) ||
      input.status === UserStatus.INACTIVE)
  ) {
    const otherAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, status: UserStatus.ACTIVE, id: { not: target.id } },
    });
    if (otherAdmins === 0) {
      throw conflict("At least one active administrator must remain");
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
        status: input.status,
        passwordHash: input.password
          ? await bcrypt.hash(input.password, PASSWORD_ROUNDS)
          : undefined,
      },
      select: userSelect,
    });
    if (input.role === Role.TRAINER) {
      const existing = await tx.trainer.findUnique({ where: { userId: id } });
      if (!existing) await tx.trainer.create({ data: { userId: id } });
    }
    await recordActivity(tx, {
      actorId: actor.id,
      action: "user.updated",
      entityType: "User",
      entityId: id,
      summary: `Updated account for ${updated.firstName} ${updated.lastName}`,
      metadata: { role: updated.role, status: updated.status },
    });
    return updated;
  });

  ok(res, { user });
});
