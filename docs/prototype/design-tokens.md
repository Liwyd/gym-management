# Design Tokens

Single source of truth. Implemented as CSS custom properties + Tailwind `@theme` in `frontend/src/app/globals.css`. Component classes reference tokens only — no raw hex values inside components.

## Color system

### Brand & primary

| Token | Value | Use |
|---|---|---|
| `--primary` | `#2563EB` | primary buttons, links, active nav, focus ring base |
| `--primary-strong` | `#1D4ED8` | hover/pressed primary |
| `--primary-soft` | `#EAF1FE` | active nav background, soft chips, selected rows |
| `--primary-softer` | `#F4F8FF` | page-level blue tint sections, chart fills |
| `--secondary` | `#0F172A` | secondary emphasis, dark buttons variant |

### Neutrals (white/navy)

| Token | Value | Use |
|---|---|---|
| `--background` | `#FFFFFF` | page background |
| `--background-subtle` | `#F6F9FE` | sidebar, alternate sections, table headers |
| `--foreground` | `#0B1B3F` | headings, strong text (dark navy) |
| `--foreground-body` | `#33415C` | body text |
| `--muted-foreground` | `#64748B` | captions, labels, metadata |
| `--border` | `#E3EAF6` | default borders, dividers |
| `--border-strong` | `#CBD7EC` | input borders, card outline emphasis |
| `--surface-card` | `#FFFFFF` | cards, dialogs, tables |

### Semantic (status only — never decoration)

| Token | Value | Tint (bg) | Use |
|---|---|---|---|
| `--success` | `#16A34A` | `#EAF9F0` | active memberships, PRESENT, paid, success toasts |
| `--warning` | `#D97706` | `#FEF6E7` | expiring memberships, LATE, attention |
| `--destructive` | `#DC2626` | `#FDECEC` | cancelled/expired destructive states, errors, refunds |
| `--info` | `#0284C7` | `#E6F6FD` | informational badges, notifications |

Badges = semantic color on its tint with matching border; text contrast ≥ 4.5:1 (dark variants `#166534`, `#92400E`, `#991B1B`, `#075985` where needed on tint backgrounds).

### Charts

`--chart-1 #2563EB` · `--chart-2 #38BDF8` · `--chart-3 #14B8A6` · `--chart-4 #F59E0B` · `--chart-5 #8B5CF6` — primary series is always blue.

## Elevation & neumorphism (restrained)

| Token | Value | Use |
|---|---|---|
| `--shadow-soft` | `0 1px 2px rgba(11,27,63,.05), 0 8px 24px rgba(11,27,63,.06)` | cards, panels (default elevation) |
| `--shadow-pop` | `0 2px 6px rgba(11,27,63,.08), 0 18px 40px rgba(11,27,63,.12)` | dialogs, dropdowns, sheets |
| `--shadow-button` | `0 1px 2px rgba(11,27,63,.10), 0 4px 10px rgba(37,99,235,.18)` | primary buttons only |
| `--inner-soft` | `inset 0 1px 2px rgba(11,27,63,.06)` | inner-shadow accents (stat tiles, inputs on tint) |

Rules: cards get `--shadow-soft` **and** a 1px `--border` line (layered, clean). No double shadows. Neumorphic inner shadows appear only on stat tiles and the sidebar active pill — never on interactive controls (they must look clickable).

Implementation: values live in `:root` as `--elev-soft`, `--elev-pop`, `--elev-button`, `--elev-inner` and are exposed as Tailwind theme keys `shadow-soft`, `shadow-pop`, `shadow-button`, `shadow-inner-soft` (so components use utilities, never raw `box-shadow`).

## Radius

`--radius-sm: 6px` (inputs, chips) · `--radius-md: 10px` (buttons, cards) · `--radius-lg: 14px` (dialogs, panels) · `--radius-xl: 20px` (hero tiles) · `--radius-full: 9999px` (badges, avatars).

## Focus & interaction

- Focus ring: `0 0 0 2px var(--background), 0 0 0 4px var(--primary)` (double ring, always visible).
- Hover: primary darkens to `--primary-strong`; cards raise to `--shadow-pop` **only** when clickable.
- Active/pressed: translateY(1px) on buttons.
- Disabled: opacity .55, cursor not-allowed, no shadow.
- Transitions: 150ms ease for color/shadow, 200ms for transform — no decorative animation beyond skeleton shimmer.

## Z-index

`--z-base 0` · `--z-sticky 100` (header) · `--z-dropdown 400` · `--z-overlay 600` (dialogs/sheets) · `--z-toast 700`.

## Breakpoints (real adaptation)

| Name | Width | Behavior |
|---|---|---|
| mobile | < 640 | bottom-safe single column; sidebar → drawer; tables → card list; dialogs → full-screen sheet |
| tablet | 640–1023 | collapsed icon sidebar; 2-col dashboards |
| laptop | 1024–1439 | full sidebar; 12-col grid |
| desktop | ≥ 1440 | max content width 1280px, extra breathing room |
