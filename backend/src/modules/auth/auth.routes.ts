import { Router } from "express";
import { parse } from "../../lib/validate";
import { ok } from "../../lib/respond";
import { requireAuth } from "../../middleware/auth";
import { authRateLimit, loginRateLimit } from "../../middleware/rateLimit";
import { loginSchema, updateMeSchema } from "./auth.schemas";
import {
  clearSessionCookie,
  getMe,
  login,
  setSessionCookie,
  updateMe,
} from "./auth.service";

export const authRouter = Router();

authRouter.post("/auth/login", loginRateLimit, async (req, res) => {
  const input = parse(loginSchema, req.body, "Login");
  const { user, token } = await login(input);
  setSessionCookie(res, token);
  ok(res, { user });
});

authRouter.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  ok(res, { message: "Signed out" });
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  ok(res, { user: await getMe(req.user!.id) });
});

authRouter.patch("/auth/me", authRateLimit, requireAuth, async (req, res) => {
  const input = parse(updateMeSchema, req.body, "Profile");
  ok(res, { user: await updateMe(req.user!.id, input) });
});
