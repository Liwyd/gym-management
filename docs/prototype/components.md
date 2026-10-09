# Component Inventory

Base layer = shadcn/ui (styled to these tokens). Project-level compositions live in `frontend/src/components/`. Every control implements: default / hover / focus-visible / disabled / pending where applicable. All icons: `lucide-react`.

## Primitives (shadcn/ui, installed in Stage 6)

| Component | Variants / notes |
|---|---|
| Button | primary (default), secondary (outline), ghost, destructive, link; sizes sm/md/lg/icon; `loading` spinner state disables input |
| Input | default, with error message, with leading/trailing icon; height 40 (sm 36) |
| Textarea | same validation pattern as Input |
| Label | 12px `--text-label`, required marker |
| Select | Radix select, placeholder, error state |
| Checkbox / Switch | 16/20px touch targets, labels clickable |
| Badge | semantic (success/warning/destructive/info) + neutral; radius-full; never for actions |
| Card | title/description/header/content/footer slots; `--shadow-soft` + border |
| Tabs | underline style, `--primary` active, keyboard arrows |
| Table | header `--background-subtle` + label style; row hover `--primary-softer`; right-align numbers; responsive wrapper (see screens) |
| Dialog | `--radius-lg`, `--shadow-pop`, focus trap, Esc; destructive variant |
| Sheet | side dialog (mobile nav, filters) |
| Dropdown menu | row actions, destructive item styling |
| Breadcrumb | header context |
| Alert | info/success/warning/destructive with icon |
| Skeleton | shimmer blocks matching final layout shape |
| Avatar | initials fallback on `--primary-soft` |
| Separator | 1px `--border` |
| Toast (sonner) | top-right, semantic icons, ≤3 visible |
| Popover | filters, quick info |

## Project compositions (Stage 7 builds these)

| Component | Behavior |
|---|---|
| `PageHeader` | title + context line + right-side actions (enforces title-row pattern) |
| `StatTile` | label, big tabular number, delta/hint line, icon chip; optional inner-soft |
| `DataTable` | pagination (page size 20/50/100), search, filters, row actions, empty/loading/error states, **mobile card mode** |
| `EmptyState` | icon + title + description + primary/secondary action |
| `ErrorState` | message + retry button |
| `AsyncBoundary` | one place implementing loading/empty/error/denied for any query |
| `ConfirmDialog` | typed/danger confirm for destructive actions (cancel session, refund, deactivate) |
| `Form*` | field wrapper: label, control, description, error, pending; zod-powered client hints (server is authority) |
| `StatusBadge` | maps enums → badge (ACTIVE→success, EXPIRED/CANCELLED→destructive, EXPIRING→warning, SCHEDULED→info, …) |
| `RoleGate` | hides UI by role (never the security boundary) |
| `Navigation` / `AppShell` | sidebar + header + mobile sheet; nav items only for routes that exist |
| `DateTime` / `Money` | consistent formatting (locale, `YYYY-MM-DD` in tables, `$1,234.56` right-aligned) |
| `Charts` | recharts wrappers styled to chart tokens; empty state built-in |

## Shared state rules (applies to every screen)

`loading` (skeleton matching layout) → `success` (real data) → `empty` (designed, with next action) / `error` (message + retry) / `denied` (403 page). Skeletons must not flash (min 300ms display), errors must never show stack traces.
