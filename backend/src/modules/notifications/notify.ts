import type { NotificationType } from "@prisma/client";
import type { Db } from "../../lib/activity";

/** R9 — notifications created by domain events. */
export async function notify(
  db: Db,
  input: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
  },
) {
  return db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
    },
  });
}
