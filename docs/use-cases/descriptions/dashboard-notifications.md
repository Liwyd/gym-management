# UC-19 — View dashboard

- **Actors**: all authenticated users; content is role-filtered
- **Preconditions**: valid session
- **Realization**: `GET /api/v1/dashboard` (aggregations: counts, today's attendance/classes, revenue by month, upcoming classes, expiring memberships, recent activity)

## Main flow

1. User logs in or navigates to **Dashboard**.
2. System computes stats for the user's role scope:
   - **ADMIN/MANAGER**: total members, active memberships, today's attendance & classes, revenue (12-month series), expiring within 14 days, recent activity, quick actions.
   - **TRAINER**: own upcoming sessions, today's sessions, roster counts needing attendance.
   - **RECEPTIONIST**: today's classes, new members this week, expiring memberships, quick actions (add member, record payment).
   - **MEMBER**: own active membership (expiry countdown), upcoming enrolled classes, personal attendance summary.
3. UI renders widgets with loading, empty and error states per widget.

## Alternative flows

- **2a No data** (fresh install): designed empty widgets with actionable copy.

## Error flows

- **E1** Aggregation failure → `500` with generic message; UI shows the error state for widgets, not a blank page.

## Postconditions

- Read-only; numbers match list pages (same sources, no separate "demo" data — Stage 1 forbids fake charts).

---

# UC-20 — View and manage notifications

- **Actors**: all authenticated users
- **Preconditions**: valid session
- **Realization**: `GET /api/v1/notifications` (paginated, unread filter), `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`

## Main flow

1. User opens the bell menu / **Notifications** page.
2. System lists the user's notifications newest first, with unread badge count.
3. User opens one → system marks it read (`readAt`).
4. User may **Mark all read**.

## Alternative flows

- **2a Cross-cutting producers**: UC-07 (activation), UC-13/14 (enrollment), UC-12 (session cancelled), UC-09 (refund) create rows via the same service.

## Error flows

- **E1** `404` unknown notification · **E2** marking another user's notification → `404` (row is scoped to the session user — IDOR prevention, R8).

## Postconditions

- Notifications scoped per user; unread count consistent everywhere in the UI.
