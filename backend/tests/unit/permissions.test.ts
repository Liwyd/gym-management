import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CAPABILITIES, can, type Capability } from "../../src/modules/auth/permissions";

const ALL_ROLES: Role[] = [
  Role.ADMIN,
  Role.MANAGER,
  Role.TRAINER,
  Role.RECEPTIONIST,
  Role.MEMBER,
];

describe("RBAC capability matrix (R8)", () => {
  it("administrators hold every capability", () => {
    for (const cap of Object.keys(CAPABILITIES) as Capability[]) {
      expect(can(Role.ADMIN, cap), `admin should have ${cap}`).toBe(true);
    }
  });

  it("members cannot list members, users, or manage plans", () => {
    expect(can(Role.MEMBER, "members:list")).toBe(false);
    expect(can(Role.MEMBER, "users:list")).toBe(false);
    expect(can(Role.MEMBER, "users:write")).toBe(false);
    expect(can(Role.MEMBER, "plans:write")).toBe(false);
    expect(can(Role.MEMBER, "facilities:write")).toBe(false);
  });

  it("members can read and update their own enrollment/payment surfaces", () => {
    expect(can(Role.MEMBER, "members:read")).toBe(true);
    expect(can(Role.MEMBER, "enrollments:write")).toBe(true);
    expect(can(Role.MEMBER, "payments:list")).toBe(true);
    expect(can(Role.MEMBER, "classes:list")).toBe(true);
    expect(can(Role.MEMBER, "sessions:list")).toBe(true);
    expect(can(Role.MEMBER, "memberships:write")).toBe(true);
    expect(can(Role.MEMBER, "dashboard:read")).toBe(true);
  });

  it("receptionists handle desk operations but not admin surfaces", () => {
    expect(can(Role.RECEPTIONIST, "members:write")).toBe(true);
    expect(can(Role.RECEPTIONIST, "payments:write")).toBe(true);
    expect(can(Role.RECEPTIONIST, "enrollments:write")).toBe(true);
    expect(can(Role.RECEPTIONIST, "sessions:write")).toBe(false);
    expect(can(Role.RECEPTIONIST, "users:write")).toBe(false);
    expect(can(Role.RECEPTIONIST, "plans:write")).toBe(false);
    expect(can(Role.RECEPTIONIST, "facilities:write")).toBe(false);
    expect(can(Role.RECEPTIONIST, "attendance:write")).toBe(false);
    expect(can(Role.RECEPTIONIST, "payments:refund")).toBe(false);
  });

  it("trainers manage sessions and attendance only", () => {
    expect(can(Role.TRAINER, "sessions:write")).toBe(true);
    expect(can(Role.TRAINER, "attendance:write")).toBe(true);
    expect(can(Role.TRAINER, "attendance:read")).toBe(true);
    expect(can(Role.TRAINER, "members:write")).toBe(false);
    expect(can(Role.TRAINER, "enrollments:write")).toBe(false);
    expect(can(Role.TRAINER, "payments:list")).toBe(false);
    expect(can(Role.TRAINER, "classes:write")).toBe(false);
  });

  it("managers add operations that receptionists lack", () => {
    expect(can(Role.MANAGER, "classes:write")).toBe(true);
    expect(can(Role.MANAGER, "sessions:write")).toBe(true);
    expect(can(Role.MANAGER, "attendance:write")).toBe(true);
    expect(can(Role.MANAGER, "payments:refund")).toBe(true);
    expect(can(Role.MANAGER, "memberships:refund")).toBe(true);
    expect(can(Role.MANAGER, "users:write")).toBe(false);
    expect(can(Role.MANAGER, "facilities:write")).toBe(false);
    expect(can(Role.MANAGER, "plans:write")).toBe(false);
  });

  it("every role can read the dashboard", () => {
    for (const role of ALL_ROLES) {
      expect(can(role, "dashboard:read")).toBe(true);
    }
  });

  it("unknown role is denied", () => {
    expect(can("GHOST" as Role, "members:list")).toBe(false);
  });
});
