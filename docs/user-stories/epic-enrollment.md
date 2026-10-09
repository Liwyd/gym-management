# Epic E5 — Enrollment (UC-13, UC-14)

## US-24 — Member enrolls in a class
**As a** member, **I want to** enroll in a class with one click, **so that** I can secure my spot.
- Priority: **High** · Use case: UC-13 · Status: Specified
- AC1: Session detail shows class, trainer, room, time, spots left; **Enroll** is disabled with an explanation when ineligible (no/expired membership, full, already enrolled).
- AC2: Enrollment succeeds only with an `ACTIVE` membership server-side (R3); failure shows the specific reason.
- AC3: Success updates the member's schedule and the capacity indicator.

## US-25 — Staff enrolls a member at the desk
**As a** receptionist, **I want to** enroll any member into a session, **so that** phone/walk-in bookings work.
- Priority: **High** · Use case: UC-13 · Status: Specified
- AC1: Member picker in the enroll dialog; same server validations as self-enrollment.
- AC2: Duplicate enrollment → clear 409 message.

## US-26 — Capacity is never oversold
**As a** system, **I want** capacity enforced atomically, **so that** a full class is truly full even under concurrent requests.
- Priority: **High** · Use case: UC-13 · Status: Specified
- AC1: Two simultaneous enrollments for the last spot → exactly one succeeds; the other gets `SESSION_FULL`.
- AC2: Verified by an automated concurrency-oriented test (Stage 7).

## US-27 — Cancel an enrollment
**As a** member, **I want to** cancel my enrollment before the cutoff, **so that** someone else can take my spot.
- Priority: **Medium** · Use case: UC-14 · Status: Specified
- AC1: Cancellation is possible until 120 minutes before start; afterwards the UI blocks it with a clear reason (`ENROLLMENT_LOCKED`).
- AC2: Cancelled enrollments keep history (row status changes, not deletion) and free capacity.

## US-28 — Member's personal schedule
**As a** member, **I want to** see my upcoming and past classes in one place, **so that** I can keep track of my training.
- Priority: **Medium** · Use case: UC-13, UC-14 · Status: Specified
- AC1: Upcoming section with cancel action; past section with attendance status (present/late/absent).
- AC2: Designed empty state for members with no enrollments (with a "browse classes" action).
