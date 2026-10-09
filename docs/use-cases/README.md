# Stage 3 — Use Case Model

Use cases for the Sports Club Management System, consistent with Stage 1 (analysis diagrams, rules R1–R9) and Stage 2 (database schema). Each description names its API realization and any supporting diagram.

## Actors

Same as Stage 1: **Administrator**, **Manager**, **Trainer**, **Receptionist**, **Member**, **System** (scheduled expiry job).

## Use case inventory

| ID | Use case | Primary actors | Description file |
|---|---|---|---|
| UC-01 | Log in | All actors | [authentication.md](descriptions/authentication.md) |
| UC-02 | Log out | All actors | [authentication.md](descriptions/authentication.md) |
| UC-03 | Create member account | Receptionist, Manager, Administrator | [members.md](descriptions/members.md) |
| UC-04 | Search and view members | Receptionist, Manager, Administrator | [members.md](descriptions/members.md) |
| UC-05 | Edit member profile | Receptionist, Manager, Administrator | [members.md](descriptions/members.md) |
| UC-06 | Manage membership plans | Administrator | [memberships.md](descriptions/memberships.md) |
| UC-07 | Purchase / activate membership | Member, Receptionist, Manager, Administrator | [memberships.md](descriptions/memberships.md) |
| UC-08 | Expire memberships | System | [memberships.md](descriptions/memberships.md) |
| UC-09 | Refund payment and cancel membership | Manager, Administrator | [memberships.md](descriptions/memberships.md) |
| UC-10 | Manage class catalog | Administrator, Manager | [classes.md](descriptions/classes.md) |
| UC-11 | Schedule class session | Trainer, Manager, Administrator | [classes.md](descriptions/classes.md) |
| UC-12 | Cancel class session | Trainer (own), Manager, Administrator | [classes.md](descriptions/classes.md) |
| UC-13 | Enroll member in class | Member (self), Receptionist, Manager, Administrator | [enrollment-attendance.md](descriptions/enrollment-attendance.md) |
| UC-14 | Cancel enrollment | Member (self), Receptionist, Manager, Administrator | [enrollment-attendance.md](descriptions/enrollment-attendance.md) |
| UC-15 | Record attendance | Trainer (own session), Manager, Administrator | [enrollment-attendance.md](descriptions/enrollment-attendance.md) |
| UC-16 | Record payment | Receptionist, Manager, Administrator | [payments.md](descriptions/payments.md) |
| UC-17 | Manage facilities | Administrator | [facilities-admin.md](descriptions/facilities-admin.md) |
| UC-18 | Manage user accounts and roles | Administrator | [facilities-admin.md](descriptions/facilities-admin.md) |
| UC-19 | View dashboard | All actors (role-filtered) | [dashboard-notifications.md](descriptions/dashboard-notifications.md) |
| UC-20 | View and manage notifications | All actors | [dashboard-notifications.md](descriptions/dashboard-notifications.md) |

## Relationships used

- **«include»**: UC-13 «includes» UC-01 (any protected use case requires an authenticated session); UC-07 «includes» UC-16 (membership purchase creates a completed payment).
- **«extend»**: UC-09 «extends» UC-16 (refund path); UC-12 «extends» UC-11 (cancellation of a scheduled session).
- **Generalization**: Receptionist/Manager abilities generalize the member-facing desk operations (shown on the diagram as shared associations).

## Diagrams

- [Use case diagram](use-case-diagram.md)
- Supporting activity diagrams (Stage 3): [login activity](diagrams/login-activity.md) · [cancel enrollment](diagrams/enrollment-cancellation.md) · [cancel session](diagrams/session-cancellation.md)
- Sequence diagrams for the core flows already exist in [Stage 1](../analysis/sequence/) and are referenced from each description instead of being duplicated.
