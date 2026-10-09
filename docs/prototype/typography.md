# Typography

**Font**: Inter (self-hosted via `@fontsource-variable/inter`, `font-display: swap` — no build-time Google Fonts fetch, works offline and in CI) — modern, neutral, excellent at small sizes; tabular numerals for statistics (`font-variant-numeric: tabular-nums`).

Weights used: **400** (body) · **500** (labels, buttons, nav) · **600** (titles, stats). Nothing heavier — hierarchy comes from size and color, not weight.

## Type scale

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--text-display` | 40 / 48 | 600 | page hero numbers on dashboard |
| `--text-page` | 30 / 38 | 600 | page title (one per page) |
| `--text-section` | 22 / 30 | 600 | section heading |
| `--text-card` | 17 / 24 | 600 | card title |
| `--text-body` | 15 / 24 | 400 | body, table cells |
| `--text-body-sm` | 14 / 20 | 400/500 | buttons, nav items, dense UI |
| `--text-caption` | 13 / 18 | 400 | helper text, timestamps |
| `--text-label` | 12 / 16 | 500, +0.04em, uppercase sparingly | field labels, table headers, stat labels |
| `--text-stat` | 32 / 40, tabular | 600 | stat tile numbers |

## Rules

1. Exactly **one** `--text-page` per screen; sections step down — no jumps of more than 2 steps between neighbors.
2. Headings use `--foreground`; supporting copy `--foreground-body`; metadata `--muted-foreground` — color, not size, carries secondary hierarchy.
3. Labels are 12–13px sentence case (uppercase only for table headers/stat labels, letter-spacing applied).
4. Numbers in tables/stats use tabular numerals; currency right-aligned in tables.
5. Body text never below 14px; nothing meaningful below 13px.
6. Line length on prose/settings pages ≤ 72 characters.
