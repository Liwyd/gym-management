# Stage 5 — Requirements Specification

Functional requirements ([functional-requirements.md](functional-requirements.md)), non-functional requirements ([non-functional-requirements.md](non-functional-requirements.md)), and the story ↔ requirement ↔ use case ↔ implementation mapping ([traceability.md](traceability.md)).

## Numbering

- **FR-01…FR-40** — functional, each citing the stories it derives from and the Stage 7 module that realizes it.
- **NFR-01…NFR-12** — non-functional, each with a verification method.

## Priority

`Must` (system is incoherent without it) · `Should` (expected in a complete presentation) · `Could` (polish).

## Reading rule

Requirements are **binding for Stage 7**: an endpoint/UI may exist only if a requirement (or a documented decision in AGENTS.md) covers it, and every `Must` requirement must be demonstrable in Stage 10. Where a requirement quantifies a threshold (page size, rate limit, cutoff), Stage 7 implements it as a named constant.
