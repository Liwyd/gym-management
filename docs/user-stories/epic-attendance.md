# Epic E6 — Attendance (UC-15)

## US-29 — Trainer marks attendance from the roster
**As a** trainer, **I want to** mark each enrolled member present/late/absent during my session, **so that** attendance is recorded while it's fresh.
- Priority: **High** · Use case: UC-15 · Status: Specified
- AC1: Roster lists enrolled members with current marks; marking one member updates that row without losing other pending edits.
- AC2: Only the session's trainer (or manager/admin) can mark; others get 403 (R4/R8).
- AC3: Marks are possible only once the session has been held; early attempts → 409 with message.
- AC4: Re-marking a member updates the existing record (upsert; one record per member per session).

## US-30 — Manager views attendance records
**As a** manager, **I want to** review attendance of any session, **so that** I can spot well-attended or empty classes.
- Priority: **Medium** · Use case: UC-15 · Status: Specified
- AC1: Session detail shows attendance summary (present/late/absent counts) with per-member marks.
- AC2: Filters by status work server-side.

## US-31 — Member's attendance history
**As a** member, **I want to** see my own attendance history, **so that** I can track consistency.
- Priority: **Medium** · Use case: UC-15 · Status: Specified
- AC1: Personal history lists session, date, and status; only own records are visible (R8).
- AC2: Summary counts (attended/missed) match the list.
