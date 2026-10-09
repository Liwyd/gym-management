# Key Screens (structure, states, interactions)

Every screen follows [spacing.md](spacing.md) shell + [components.md](components.md) states. Stage 7 implements these exactly; Stage 10 audits against them.

## 1. Login (`/login`)

Centered card (max 420px) on `--background-subtle` with brand mark and subtle blue gradient tile. Email + password (show/hide), primary "Sign in", rate-limit message inline, generic credential error as alert above the form. Loading disables submit. Redirects by role.

## 2. Dashboard (`/`) — role variants in FR-31

- **Row 1 (stat tiles ×4)**: e.g. Total members · Active memberships · Today's attendance · Revenue (month). Icon chip + delta hint ("+6 this week").
- **Row 2**: Revenue 12-month bar/area chart (2/3) + Expiring memberships list (1/3).
- **Row 3**: Today's/upcoming classes (table or list with spots left) + Recent activity feed.
- **Quick actions** in PageHeader right side (role-gated).
- Trainer/receptionist/member variants swap tiles per FR-31; every tile has empty state ("No classes scheduled today").

## 3. Members list (`/members`)

PageHeader + **Add member** (primary). Toolbar: search (debounced), status filter, (date filter). DataTable: avatar+name, code, email, plan/status badge, expiry, actions (view/edit). Pagination footer. Row click → detail. Empty state → "Add the first member".

## 4. Member detail (`/members/:id`)

Header: avatar, name, code, status badge, contact chips, actions (Edit, New membership). Tabs: **Overview** (current membership card + stats) · **Memberships** (history table w/ status badges) · **Schedule** (upcoming/past enrollments w/ cancel) · **Payments** (history table).

## 5. Plans (`/plans`) — admin

Card grid: name, duration, price (stat style), description, active toggle, edit. Deactivate → confirm dialog (affects future purchases only).

## 6. Schedule (`/schedule`)

Toolbar: date-range navigation (prev/today/next), day/week toggle, category filter. Session cards/rows: time, class, trainer, room, spots left (semantic when ≤3), status. Cancelled → muted + reason tooltip. Member view adds **Enroll** (disabled w/ reason when ineligible); trainer view defaults to "My sessions".

## 7. Session detail / roster (`/schedule/:id`)

Info panel (class, trainer, room, time, status) + roster table: member, enrolled-at, attendance status, actions (mark present/late/absent — trainer/manager only), capacity bar. Cancel session (destructive confirm w/ enrolled count).

## 8. Attendance history (`/attendance`)

Filters (date, class, member for staff; personal view for member). Table: date, class, member, status badge. Summary chips: attended/late/absent counts.

## 9. Payments (`/payments`)

Toolbar: search member, date range, type/method/status filters. Totals strip (filtered sum). Table: date, member, description, method badge, amount (right), status badge, actions (refund eligible rows → ConfirmDialog w/ membership note). **Record payment** primary dialog: member picker, type, amount, method, note; server-priced membership option.

## 10. Administration (`/admin/users`, `/admin/facilities`, `/admin/classes`, `/admin/trainers`)

Same DataTable pattern; forms in dialogs/sheets. Users: role badge, status switch, reset-password action (one-time reveal). Guard: last-admin error surfaces as destructive alert.

## 11. Notifications (`/notifications` + bell)

Bell with unread dot/count. Page: list (icon by type, title, relative time, unread = `--primary-soft` row), mark all read, per-row open → mark read + navigate when linked.

## 12. 403 / 404 / error pages

Branded minimal illustrations (icon-based), copy + "Back to dashboard" primary action — same visual language as empty states.

## Visual reference

Open [mockups.html](mockups.html) (self-contained) for the rendered look of login, dashboard, and list screens using these exact tokens.
