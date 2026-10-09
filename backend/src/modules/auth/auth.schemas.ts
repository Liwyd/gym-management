import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Password is required").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

const nameField = z.string().trim().min(1).max(60);
const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const updateMeSchema = z
  .object({
    firstName: nameField.optional(),
    lastName: nameField.optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: passwordField.optional(),
  })
  .refine((v) => v.newPassword === undefined || v.currentPassword !== undefined, {
    message: "Current password is required to change your password",
    path: ["currentPassword"],
  })
  .refine(
    (v) =>
      v.firstName !== undefined ||
      v.lastName !== undefined ||
      v.phone !== undefined ||
      v.newPassword !== undefined,
    { message: "No changes provided" },
  );
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
