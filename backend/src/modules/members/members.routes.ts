import { Router } from "express";
import { z } from "zod";
import { MemberStatus } from "@prisma/client";
import { buildMeta, ok, okList } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { authorize, requireAuth } from "../../middleware/auth";
import { requireMemberAccess } from "../../lib/scope";
import { paginationSchema } from "../../utils/pagination";
import { stripUndefined } from "../../utils/object";
import { param } from "../../utils/params";
import {
  dateFieldNullable,
  dateFieldOptional,
  emailField,
  nameField,
  passwordField,
  searchQuery,
} from "../../utils/schemas";
import {
  createMember,
  getMemberDetail,
  getOwnMemberDetail,
  listMembers,
  updateMember,
  updateOwnMember,
} from "./members.service";

export const membersRouter = Router();

const listQuery = paginationSchema.extend({
  search: searchQuery,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const createSchema = z.object({
  email: emailField,
  password: passwordField,
  firstName: nameField,
  lastName: nameField,
  phone: z.string().trim().max(30).optional(),
  dateOfBirth: dateFieldOptional,
  gender: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  emergencyContact: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

const updateSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  dateOfBirth: dateFieldNullable,
  gender: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  emergencyContact: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateOwnSchema = updateSchema.pick({
  dateOfBirth: true,
  gender: true,
  address: true,
  emergencyContact: true,
});

membersRouter.get("/members", authorize("members:list"), async (req, res) => {
  const q = parse(listQuery, req.query, "Query");
  const { data, total } = await listMembers({
    page: q.page,
    limit: q.limit,
    search: q.search,
    status: q.status as MemberStatus | undefined,
  });
  okList(res, data, buildMeta(q.page, q.limit, total));
});

membersRouter.get("/members/me", requireAuth, async (req, res) => {
  ok(res, { member: await getOwnMemberDetail(req.user!) });
});

membersRouter.patch("/members/me", requireAuth, async (req, res) => {
  const input = parse(updateOwnSchema, req.body, "Profile");
  await updateOwnMember(req.user!, stripUndefined(input));
  ok(res, { member: await getOwnMemberDetail(req.user!) });
});

membersRouter.post("/members", authorize("members:write"), async (req, res) => {
  const input = parse(createSchema, req.body, "Member");
  const { member } = await createMember(req.user!, input);
  ok(res, { member: await getMemberDetail(member.id) }, 201);
});

membersRouter.get("/members/:id", authorize("members:read"), async (req, res) => {
  await requireMemberAccess(req.user!, param(req, "id"));
  ok(res, { member: await getMemberDetail(param(req, "id")) });
});

membersRouter.patch(
  "/members/:id",
  authorize("members:write"),
  async (req, res) => {
    const input = parse(updateSchema, req.body, "Member");
    await updateMember(req.user!, param(req, "id"), stripUndefined(input));
    ok(res, { member: await getMemberDetail(param(req, "id")) });
  },
);
