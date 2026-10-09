# Traceability Matrix

story → functional requirement(s) → use case → Stage 7 implementation target (backend module · frontend surface).

| Story | Requirement | UC | Implementation target |
|---|---|---|---|
| US-01 | FR-01, FR-02, FR-03 | UC-01 | auth module · login page |
| US-02 | FR-01 | UC-01 | auth middleware · session bootstrap |
| US-03 | FR-05 | UC-01, UC-19 | RBAC middleware · app shell nav |
| US-04 | FR-04 | UC-02 | auth module · header menu |
| US-05 | FR-05 | UC-01 | route guards · 403 page |
| US-06 | FR-06 | UC-03 | members module · member form |
| US-07 | FR-07 | UC-04 | members module · members table |
| US-08 | FR-08 | UC-04 | members module · member detail tabs |
| US-09 | FR-09 | UC-05 | members module · edit form |
| US-10 | FR-10 | UC-04 | members module (ownership) · profile page |
| US-11 | FR-11 | UC-06 | plans module · plans admin page |
| US-12 | FR-12 | UC-07 | payments module · plans page checkout |
| US-13 | FR-12 | UC-07, UC-16 | payments module · staff checkout dialog |
| US-14 | FR-13 | UC-07 | payments service guard · error UX |
| US-15 | FR-14 | UC-08 | expiry job · enrollment guard |
| US-16 | FR-15 | UC-09 | payments module · payment history action |
| US-17 | FR-16 | UC-08, UC-19 | dashboard module · expiring widget |
| US-18 | FR-17 | UC-10 | classes module · classes admin page |
| US-19 | FR-18 | UC-11 | sessions module · session form |
| US-20 | FR-18 | UC-11 | sessions module · trainer schedule form |
| US-21 | FR-19 | UC-12 | sessions module · cancel dialog |
| US-22 | FR-20 | UC-11, UC-13 | sessions module · schedule page |
| US-23 | FR-21 | UC-11 | sessions module · my-sessions view |
| US-24 | FR-22 | UC-13 | enrollments module · session detail |
| US-25 | FR-22 | UC-13 | enrollments module · staff enroll dialog |
| US-26 | FR-22 | UC-13 | enrollments service (transaction) · concurrency test |
| US-27 | FR-23 | UC-14 | enrollments module · cancel action |
| US-28 | FR-24 | UC-13, UC-14 | frontend · member schedule page |
| US-29 | FR-25 | UC-15 | attendance module · roster UI |
| US-30 | FR-26 | UC-15 | attendance module · session detail |
| US-31 | FR-27 | UC-15 | attendance module · member history |
| US-32 | FR-28 | UC-16 | payments module · payment dialog |
| US-33 | FR-29 | UC-16 | payments module · payments table |
| US-34 | FR-30, FR-15 | UC-09 | payments module · refund action |
| US-35 | FR-31 | UC-19 | dashboard module · dashboard page |
| US-36 | FR-32 | UC-19 | dashboard module · revenue chart |
| US-37 | FR-33 | UC-20 | notifications module · bell menu |
| US-38 | FR-34 | UC-19 | dashboard module · activity feed |
| US-39 | FR-35 | UC-19 | dashboard UI · quick actions |
| US-40 | FR-36 | UC-17 | facilities module · facilities admin |
| US-41 | FR-37 | UC-18 | users module · users admin |
| US-42 | FR-38 | UC-18 | trainers module · trainer profile fields |
| US-43 | FR-05, FR-39 | all | RBAC middleware · authorization tests |
| US-44 | FR-40 | all | shared UI state components |

## Coverage verification

- 44/44 stories mapped; 40/40 FRs referenced by ≥ 1 story row. ✅
- Every UC appears in at least one row. ✅
- No requirement without a story (nothing speculative) and no story without a requirement (nothing unbound). ✅
