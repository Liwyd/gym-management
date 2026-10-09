# Spacing & Layout

## Spacing scale (4px base)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

Token shortcuts: `--space-xs 4` · `--space-sm 8` · `--space-md 16` · `--space-lg 24` · `--space-xl 32` · `--space-2xl 48`. Only these steps; no one-off values.

## Density rules

| Context | Value |
|---|---|
| Page horizontal padding | 24 (mobile 16) |
| Page top/bottom padding | 32 |
| Card padding | 24 (stat tiles 20) |
| Gap between cards | 24 (grid gap 20–24) |
| Section heading → content | 16 |
| Form field vertical gap | 20 |
| Table cell padding | 12 × 14, row height ≥ 48 |
| Button padding | md: 10×18 · sm: 7×12 · lg: 13×24 |
| Dialog padding | 24 |

## Layout shell

```
┌─────────────────────────────────────────────┐
│ Sidebar 240px │ Header 64px (breadcrumb +   │
│ (nav, brand)   │ actions)                   │
│                ├────────────────────────────┤
│                │ Page: title row (title +   │
│                │ primary action) → content  │
│                │ max-width 1280, pad 32     │
└─────────────────────────────────────────────┘
```

- **Sidebar**: `--background-subtle`, brand block, grouped nav (Overview / Operations / Administration) with `--primary-soft` active pill (inner-soft allowed here), footer user chip.
- **Mobile**: sidebar becomes a sheet (left), header keeps hamburger + title.
- **Title row** pattern on every page: page title + subtitle/context left, one primary action right (secondary actions inside tables/dialogs — never a row of 5 buttons).

## Whitespace principles

- The dashboard shows **at most 2 rows of tiles** + 2 content rows — information hierarchy, not widget hoarding.
- Empty states keep card structure (icon + copy + action), never collapse to bare text.
- No section without a heading or clear visual grouping; no card inside a card except dialogs/popovers.
