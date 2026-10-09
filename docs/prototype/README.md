# Stage 6 — Prototype / Design System

The visual language for the entire application. Stage 7 must implement exactly this; Stage 10 audits against it.

## Identity

**PulseFit Sports Club** — modern, minimal, premium, calm. Blue + white dominant, dark navy typography, soft layered surfaces with *restrained* neumorphism (soft elevation and gentle inner shadows only — never exaggerated 2019-style blobs). The interface breathes: generous spacing, clear hierarchy, one accent (blue) with semantic colors used only for meaning.

## Documents

| Doc | Content |
|---|---|
| [design-tokens.md](design-tokens.md) | color tokens, elevation/neumorphism, radius, borders, z-index, breakpoints |
| [typography.md](typography.md) | font family, type scale, weights, usage map |
| [spacing.md](spacing.md) | spacing scale, layout grid, density rules |
| [components.md](components.md) | component inventory, variants, states, behavior |
| [screens.md](screens.md) | per-screen structure, states, interactions |
| [mockups.html](mockups.html) | self-contained visual mockup (open in any browser) |

## Non-negotiables

1. **No ad-hoc colors** — every surface/text/border uses a token.
2. **Every async UI has 4 states** — loading (skeleton), success, empty (designed), error (+retry); plus 403 for permission.
3. **Every form has** labels, inline validation, disabled/pending submit, success feedback, cancel path; destructive actions confirm.
4. **Real adaptation** on mobile/tablet — nav collapses, tables become cards or sticky-scroll, dialogs become sheets.
5. **Accessibility**: keyboard operable, visible focus, AA contrast, semantic HTML.

## Foundation status

Implemented in `frontend/` by the end of this stage: Next.js scaffold, token layer (globals.css `@theme` + CSS variables), Inter typography self-hosted via `@fontsource-variable/inter`, shadcn/ui base components (20), and a design-system preview page at `/`. Stage 7 builds all product screens on top — the preview page is the reference, not a product screen.
