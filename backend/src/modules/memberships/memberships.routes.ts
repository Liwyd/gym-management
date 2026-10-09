import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { recordActivity, type Db } from "../../lib/activity";
import { businessRule, conflict, forbidden, notFound, stateConflict } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireMemberAccess, actorMember } from "../../lib/scope";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize, requireAuth } from "../../middleware/auth";
import { can } from "../auth/permissions";
import { pageParams, paginationSchema } from "../../utils/pagination";
import { dateFieldOptional, priceField } from "../../utils/schemas";
import { param } from "../../utils/params";
import { notify } from "../notifications/notify";
import {
  computeEndDate,
  dateOnly,
  isValidPaymentAmount,
} from "../rules/rules";

export const membershipsRouter = Router();

const listQuery = paginationSchema.extend({
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  memberId: z.uuid().optional(),
});

const purchaseSchema = z.object({
  memberId: z.uuid(),
  planId: z.uuid(),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]),
  startDate: dateFieldOptional,
  amount: priceField.optional(),
});

const cancelSchema = z.object({
  refund: z.boolean().default(false),
  reason: z.string().trim().max(300).optional(),
});

/** R2/UC-08 — lazy expiry sweep (the "system" actor, triggered on access). */
export async function expireDueMemberships(db: Db): Promise<number> {
  const today = dateOnly(new Date());
  const { count } = await db.membership.updateMany({
    where: { status: "ACTIVE", endDate: { lt: today } },
    data: { status: "EXPIRED" },
  });
  if (count > 0) {
    await recordActivity(db, {
      actorId: null,
      action: "membership.expired",
      entityType: "Membership",
      summary: `Expired ${count} membership${count === 1 ? "" : "s"}`,
    });
  }
  return count;
}

const membershipInclude = {
  plan: true,
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      paidAt: true,
      description: true,
    },
  },
  member: {
    select: {
      id: true,
      memberCode: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
} as const;

membershipsRouter.get(
  "/memberships",
  authorize("memberships:list"),
  async (req, res) => {
    const q = parse(listQuery, req.query, "Query");
    await expireDueMemberships(prisma);
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.memberId ? { memberId: q.memberId } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.membership.count({ where }),
      prisma.membership.findMany({
        where,
        ...pageParams(q),
        orderBy: { createdAt: "desc" },
        include: membershipInclude,
      }),
    ]);
    okList(res, items, buildMeta(q.page, q.limit, total));
  },
);

membershipsRouter.get("/memberships/mine", requireAuth, async (req, res) => {
  if (req.user!.role !== Role.MEMBER) {
    throw forbidden("Only member accounts can view their memberships here");
  }
  const member = await actorMember(req.user!);
  if (!member) throw notFound("Member profile");
  await expireDueMemberships(prisma);
  const items = await prisma.membership.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    include: membershipInclude,
  });
  okList(res, items, {
    page: 1,
    limit: items.length || 1,
    total: items.length,
    totalPages: 1,
  });
});

membershipsRouter.get(
  "/memberships/:id",
  authorize("memberships:read"),
  async (req, res) => {
    await expireDueMemberships(prisma);
    const id = param(req, "id");
    const membership = await prisma.membership.findUnique({
      where: { id },
      include: membershipInclude,
    });
    if (!membership) throw notFound("Membership");
    if (req.user!.role === Role.MEMBER && membership.member.user.id !== req.user!.id) {
      throw forbidden();
    }
    ok(res, { membership });
  },
);

/** UC-07 — purchase activates a membership through a COMPLETED payment (R1). */
membershipsRouter.post(
  "/memberships",
  authorize("memberships:write"),
  async (req, res) => {
    const input = parse(purchaseSchema, req.body, "Purchase");
    const member = await requireMemberAccess(req.user!, input.memberId);
    if (member.status !== "ACTIVE") {
      throw stateConflict("Member is inactive");
    }

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: input.planId },
    });
    if (!plan) throw notFound("Plan");
    if (!plan.isActive) throw businessRule("PLAN_INACTIVE", "This plan is no longer available");

    const amount = input.amount ?? Number(plan.price);
    if (!isValidPaymentAmount(amount)) {
      throw businessRule("PAYMENT_INVALID", "Amount must be greater than 0");
    }

    const startDate = dateOnly(input.startDate ?? new Date());
    const endDate = computeEndDate(startDate, plan.durationDays);

    const result = await prisma.$transaction(async (tx) => {
      await expireDueMemberships(tx);
      const active = await tx.membership.findFirst({
        where: { memberId: member.id, status: "ACTIVE" },
        select: { id: true, endDate: true },
      });
      if (active) {
        throw stateConflict(
          `Member already has an active membership until ${dateOnly(active.endDate).toISOString().slice(0, 10)}`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          memberId: member.id,
          amount,
          type: "MEMBERSHIP_PURCHASE",
          method: input.method,
          status: "COMPLETED",
          description: `Membership purchase — ${plan.name}`,
          processedById: req.user!.id,
        },
      });
      const membership = await tx.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          startDate,
          endDate,
          status: "ACTIVE",
          paymentId: payment.id,
        },
        include: membershipInclude,
      });

      await notify(tx, {
        userId: member.userId,
        title: "Membership activated",
        message: `${plan.name} is active until ${endDate.toISOString().slice(0, 10)}.`,
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "membership.activated",
        entityType: "Membership",
        entityId: membership.id,
        summary: `Activated ${plan.name} for ${member.memberCode}`,
        metadata: { memberCode: member.memberCode, planName: plan.name },
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "payment.completed",
        entityType: "Payment",
        entityId: payment.id,
        summary: `Recorded payment of ${amount.toFixed(2)} for ${member.memberCode}`,
        metadata: { amount, memberCode: member.memberCode },
      });
      return { membership, payment };
    });

    ok(res, result, 201);
  },
);

/** UC-09 — cancel membership; optionally refund the linked payment (R6). */
membershipsRouter.patch(
  "/memberships/:id",
  authorize("memberships:write"),
  async (req, res) => {
    const input = parse(cancelSchema, req.body, "Cancellation");
    if (input.refund && !can(req.user!.role, "memberships:refund")) {
      throw forbidden("Refunds are restricted to managers and administrators");
    }

    const id = param(req, "id");
    const membership = await prisma.membership.findUnique({
      where: { id },
      include: { member: { select: { userId: true, memberCode: true } } },
    });
    if (!membership) throw notFound("Membership");
    if (membership.status === "CANCELLED") {
      throw stateConflict("This membership is already cancelled");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.membership.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: membershipInclude,
      });

      if (input.refund && m.paymentId) {
        const payment = await tx.payment.findUnique({
          where: { id: m.paymentId },
        });
        if (!payment) throw notFound("Payment");
        if (payment.status === "REFUNDED") {
          throw conflict("This payment has already been refunded");
        }
        if (payment.status === "COMPLETED") {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" },
          });
          await recordActivity(tx, {
            actorId: req.user!.id,
            action: "payment.refunded",
            entityType: "Payment",
            entityId: payment.id,
            summary: `Refunded ${Number(payment.amount).toFixed(2)} for ${membership.member.memberCode}`,
            metadata: { amount: Number(payment.amount) },
          });
        }
      }

      await notify(tx, {
        userId: membership.member.userId,
        title: "Membership cancelled",
        message: input.reason
          ? `Your membership was cancelled. Reason: ${input.reason}`
          : "Your membership was cancelled.",
        type: "WARNING",
      });
      await recordActivity(tx, {
        actorId: req.user!.id,
        action: "membership.cancelled",
        entityType: "Membership",
        entityId: id,
        summary: `Cancelled membership for ${membership.member.memberCode}${input.refund ? " (refunded)" : ""}`,
        metadata: { refunded: input.refund, reason: input.reason },
      });
      return m;
    });

    ok(res, { membership: updated });
  },
);
