import { Router } from "express";
import { prisma } from "./lib/prisma";
import { fail, ok } from "./lib/respond";
import { requireAuth } from "./middleware/auth";
import { authRouter } from "./modules/auth/auth.routes";
import { plansRouter } from "./modules/plans/plans.routes";
import { membersRouter } from "./modules/members/members.routes";
import { membershipsRouter } from "./modules/memberships/memberships.routes";
import { trainersRouter } from "./modules/trainers/trainers.routes";
import { usersRouter } from "./modules/users/users.routes";
import { classesRouter } from "./modules/classes/classes.routes";
import { sessionsRouter } from "./modules/sessions/sessions.routes";
import { enrollmentsRouter } from "./modules/enrollments/enrollments.routes";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { facilitiesRouter } from "./modules/facilities/facilities.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";

export const apiRouter = Router();

apiRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, { status: "ok", database: "up" });
  } catch {
    fail(res, 503, "SERVICE_UNAVAILABLE", "Database is unavailable");
  }
});

apiRouter.use(authRouter);
// Public: /health, auth login/register/logout (handled above).
// Everything else requires a valid session; authorize() then applies RBAC.
apiRouter.use(requireAuth);
apiRouter.use(plansRouter);
apiRouter.use(membersRouter);
apiRouter.use(membershipsRouter);
apiRouter.use(trainersRouter);
apiRouter.use(usersRouter);
apiRouter.use(classesRouter);
apiRouter.use(sessionsRouter);
apiRouter.use(enrollmentsRouter);
apiRouter.use(attendanceRouter);
apiRouter.use(paymentsRouter);
apiRouter.use(facilitiesRouter);
apiRouter.use(notificationsRouter);
apiRouter.use(dashboardRouter);
