import { z } from "zod";

export const nameField = z.string().trim().min(1).max(60);

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const emailField = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());

/** Query-string boolean: ?flag=true / ?flag=false (z.coerce.boolean is unsafe). */
export const boolQuery = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

export const searchQuery = z.string().trim().max(100).optional();

/** ISO-8601 datetime string → Date (never coerce: null would become 1970). */
export const dateField = z
  .iso.datetime({ offset: true })
  .transform((s) => new Date(s));

export const dateFieldOptional = dateField.optional();
export const dateFieldNullable = dateField.nullable().optional();

export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export const priceField = z
  .number()
  .positive("Price must be greater than 0")
  .max(999_999.99)
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, {
    message: "Price can have at most 2 decimal places",
  })
  .transform(money);
