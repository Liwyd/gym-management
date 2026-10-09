import type { Prisma } from "@prisma/client";

export type Db = Prisma.TransactionClient;

export type ActivityAction =
  | "user.created"
  | "user.updated"
  | "member.created"
  | "member.updated"
  | "plan.created"
  | "plan.updated"
  | "membership.activated"
  | "membership.cancelled"
  | "membership.expired"
  | "payment.completed"
  | "payment.refunded"
  | "class.created"
  | "class.updated"
  | "session.scheduled"
  | "session.updated"
  | "session.cancelled"
  | "enrollment.created"
  | "enrollment.cancelled"
  | "attendance.recorded"
  | "facility.created"
  | "facility.updated";

export interface ActivityInput {
  actorId: string | null;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function recordActivity(db: Db, input: ActivityInput) {
  const { summary, metadata, ...rest } = input;
  await db.activityLog.create({
    data: {
      ...rest,
      metadata: { summary, ...(metadata ?? {}) },
    },
  });
}
