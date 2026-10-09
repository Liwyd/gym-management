import { Router } from "express";
import { z } from "zod";
import { PaymentStatus, Role } from "@prisma/client";
import { recordActivity } from "../../lib/activity";
import { badRequest, forbidden, notFound, stateConflict } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireMemberAccess } from "../../lib/scope";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize } from "../../middleware/auth";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { param } from "../../utils/params";
import { dateField, priceField, searchQuery } from "../../utils/schemas";
import { notify } from "../notifications/notify";
import { isValidPaymentAmount } from "../rules/rules";

export const paymentsRouter = Router();

const listQuery = paginationSchema.extend({
  memberId: z.uuid().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  type: z.enum(["MEMBERSHIP_PURCHASE", "CLASS_FEE", "OTHER"]).optional(),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).optional(),
  from: dateField.optional(),
  to: dateField.optional(),
  search: searchQuery,
});

const createSchema = z.object({
  memberId: z.uuid(),
  amount: priceField,
  type: z.enum(["CLASS_FEE", "OTHER"]),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]),
  status: z.enum(["COMPLETED", "FAILED"]).default("COMPLETED"),
  description: z.string().trim().max(300).optional(),
});

const paymentInclude = {
  member: {
    select: {
      id: true,
      memberCode: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
  processedBy: { select: { firstName: true, lastName: true } },
} as const;

async function ownMemberId(actorId: string): Promise<string | null> {
  const member = await prisma.member.findUnique({
    where: { userId: actorId },
    select: { id: true },
  });
  return member?.id ?? null;
}

paymentsRouter.get("/payments", authorize("payments:list"), async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const actor = req.user!;
  const where: Record<string, unknown> = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.method ? { method: q.method } : {}),
    ...(q.from || q.to
      ? {
          paidAt: {
            ...(q.from ? { gte: q.from } : {}),
            ...(q.to ? { lte: q.to } : {}),
          },
        }
      : {}),
    ...(q.search
      ? {
          OR: [
            { description: { contains: q.search, mode: "insensitive" as const } },
            { member: { memberCode: { contains: q.search, mode: "insensitive" as const } } },
            {
              member: {
                user: { lastName: { contains: q.search, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };

  if (actor.role === Role.MEMBER) {
    const memberId = await ownMemberId(actor.id);
    if (!memberId) {
      okList(res, [], buildMeta(q.page, q.limit, 0));
      return;
    }
    where.memberId = memberId;
  } else if (q.memberId) {
    where.memberId = q.memberId;
  }

  const [total, items] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      ...pageParams(q),
      orderBy: { paidAt: "desc" },
      include: paymentInclude,
    }),
  ]);
  okList(res, items, buildMeta(q.page, q.limit, total));
});

paymentsRouter.get("/payments/:id", authorize("payments:list"), async (req, res) => {
  const id = param(req, "id");
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });
  if (!payment) throw notFound("Payment");
  if (req.user!.role === Role.MEMBER) {
    const memberId = await ownMemberId(req.user!.id);
    if (!memberId || payment.memberId !== memberId) throw forbidden();
  }
  ok(res, { payment });
});

/** UC-16 — record a payment (R6). Membership purchases go through /memberships. */
paymentsRouter.post("/payments", authorize("payments:write"), async (req, res) => {
  const input = parse(createSchema, req.body, "Payment");
  if (!isValidPaymentAmount(input.amount)) {
    throw badRequest("Amount must be greater than 0");
  }
  const member = await requireMemberAccess(req.user!, input.memberId);

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        memberId: member.id,
        amount: input.amount,
        type: input.type,
        method: input.method,
        status: input.status,
        description: input.description,
        processedById: req.user!.id,
      },
      include: paymentInclude,
    });
    if (created.status === PaymentStatus.COMPLETED) {
      await notify(tx, {
        userId: member.userId,
        title: "Payment received",
        message: `We received your payment of ${Number(created.amount).toFixed(2)}.`,
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "payment.completed",
        entityType: "Payment",
        entityId: created.id,
        summary: `Recorded payment of ${Number(created.amount).toFixed(2)} for ${member.memberCode}`,
        metadata: { amount: Number(created.amount), memberCode: member.memberCode },
      });
    }
    return created;
  });

  ok(res, { payment }, 201);
});

/** UC-09 extend — refund a completed payment; cancels linked membership. */
paymentsRouter.post(
  "/payments/:id/refund",
  authorize("payments:refund"),
  async (req, res) => {
    const id = param(req, "id");
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        membership: { select: { id: true, status: true } },
        member: { select: { memberCode: true, userId: true } },
      },
    });
    if (!payment) throw notFound("Payment");
    if (payment.status === PaymentStatus.REFUNDED) {
      throw stateConflict("This payment has already been refunded");
    }
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw stateConflict("Only completed payments can be refunded");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const refunded = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.REFUNDED },
        include: paymentInclude,
      });

      const cancelledMembership =
        payment.membership && payment.membership.status === "ACTIVE"
          ? await tx.membership.update({
              where: { id: payment.membership.id },
              data: { status: "CANCELLED" },
            })
          : null;

      await notify(tx, {
        userId: payment.member.userId,
        title: "Payment refunded",
        message: `Your payment of ${Number(payment.amount).toFixed(2)} was refunded${
          cancelledMembership ? " and the membership was cancelled" : ""
        }.`,
        type: "INFO",
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "payment.refunded",
        entityType: "Payment",
        entityId: id,
        summary: `Refunded ${Number(payment.amount).toFixed(2)} for ${payment.member.memberCode}`,
        metadata: {
          amount: Number(payment.amount),
          membershipCancelled: Boolean(cancelledMembership),
        },
      });
      return refunded;
    });

    ok(res, { payment: updated });
  },
);
