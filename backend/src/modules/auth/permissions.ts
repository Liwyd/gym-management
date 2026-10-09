import { Role } from "@prisma/client";

/**
 * Capability → roles allowed, derived from R8 and the Stage 3 actor matrix.
 * Object-level scoping (own data / own session) is enforced in services on
 * top of these coarse grants — frontend hiding is never the security boundary.
 */
export type Capability =
  | "members:list"
  | "members:read"
  | "members:write"
  | "plans:list"
  | "plans:write"
  | "memberships:list"
  | "memberships:read"
  | "memberships:write"
  | "memberships:refund"
  | "classes:list"
  | "classes:write"
  | "sessions:list"
  | "sessions:write"
  | "enrollments:list"
  | "enrollments:write"
  | "attendance:read"
  | "attendance:write"
  | "payments:list"
  | "payments:write"
  | "payments:refund"
  | "facilities:list"
  | "facilities:write"
  | "users:list"
  | "users:write"
  | "trainers:list"
  | "dashboard:read";

const ALL: Role[] = [Role.ADMIN, Role.MANAGER, Role.TRAINER, Role.RECEPTIONIST, Role.MEMBER];
const STAFF: Role[] = [Role.ADMIN, Role.MANAGER, Role.RECEPTIONIST];
const MANAGEMENT: Role[] = [Role.ADMIN, Role.MANAGER];
const DESK_PLUS_MEMBER: Role[] = [...STAFF, Role.MEMBER];

export const CAPABILITIES: Record<Capability, Role[]> = {
  "members:list": STAFF,
  "members:read": DESK_PLUS_MEMBER,
  "members:write": STAFF,
  "plans:list": STAFF,
  "plans:write": [Role.ADMIN],
  "memberships:list": STAFF,
  "memberships:read": DESK_PLUS_MEMBER,
  "memberships:write": [...DESK_PLUS_MEMBER],
  "memberships:refund": MANAGEMENT,
  "classes:list": ALL,
  "classes:write": MANAGEMENT,
  "sessions:list": ALL,
  "sessions:write": [...MANAGEMENT, Role.TRAINER],
  "enrollments:list": ALL,
  "enrollments:write": [...DESK_PLUS_MEMBER],
  "attendance:read": [...MANAGEMENT, Role.TRAINER],
  "attendance:write": [...MANAGEMENT, Role.TRAINER],
  "payments:list": DESK_PLUS_MEMBER,
  "payments:write": STAFF,
  "payments:refund": MANAGEMENT,
  "facilities:list": [Role.ADMIN, Role.MANAGER, Role.TRAINER, Role.RECEPTIONIST],
  "facilities:write": [Role.ADMIN],
  "users:list": [Role.ADMIN],
  "users:write": [Role.ADMIN],
  "trainers:list": [Role.ADMIN, Role.MANAGER, Role.RECEPTIONIST],
  "dashboard:read": ALL,
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[capability]?.includes(role) ?? false;
}
