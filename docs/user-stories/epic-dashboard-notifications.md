# Epic E8 — Dashboard & Notifications (UC-19, UC-20)

## US-35 — Role-aware dashboard
**As a** user, **I want** a dashboard tailored to my role, **so that** I see what matters to me first.
- Priority: **High** · Use case: UC-19 · Status: Specified
- AC1: Admin/manager: members, active memberships, today's attendance/classes, revenue, upcoming classes, expiring memberships, recent activity, quick actions.
- AC2: Trainer: my upcoming/today's sessions, rosters needing attendance. Receptionist: today's classes, new members, expiring memberships, quick actions. Member: membership expiry countdown, my upcoming classes, my attendance summary.
- AC3: Every widget has loading, empty, and error states; numbers agree with the underlying list pages (no fake data — ever).

## US-36 — Revenue overview from real payments
**As a** manager, **I want** a revenue chart based on actual completed payments, **so that** I can discuss finances credibly.
- Priority: **Medium** · Use case: UC-19, UC-16 · Status: Specified
- AC1: Monthly series over the last 12 months sums `COMPLETED` payments (refunds excluded per R6 semantics: they appear as `REFUNDED`, not counted).
- AC2: With no payment data the chart shows a designed empty state, not zeros pretending to be data.

## US-37 — Notification bell and list
**As a** user, **I want to** be notified about my events (membership activated, enrolled, session cancelled), **so that** I don't have to poll.
- Priority: **Medium** · Use case: UC-20 · Status: Specified
- AC1: Bell shows the unread count; list paginates newest first; opening one marks it read; "mark all read" works.
- AC2: Users only ever see their own notifications (marking someone else's → 404, R8).

## US-38 — Recent activity feed (staff)
**As a** manager, **I want to** see recent business events, **so that** I know what happened during the shift.
- Priority: **Low** · Use case: UC-19 · Status: Specified
- AC1: Feed shows actor, action, entity, time from `ActivityLog` (business events only — no per-login spam).
- AC2: Newest first, limited to a sane page size.

## US-39 — Quick actions
**As a** staff user, **I want** shortcuts on the dashboard (add member, record payment, schedule session), **so that** common tasks are one click away.
- Priority: **Medium** · Use case: UC-19 · Status: Specified
- AC1: Quick actions render only for roles that may perform them.
- AC2: Each shortcut opens the real flow (no dead buttons).
