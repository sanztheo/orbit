import { z } from "zod";

export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, hyphens");

export const waitlistCreateSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const joinSchema = z.object({
  slug: slugSchema,
  email: z.string().email("Invalid email address"),
  referralCode: z.string().optional(),
});

export type WaitlistCreateInput = z.infer<typeof waitlistCreateSchema>;
export type JoinInput = z.infer<typeof joinSchema>;
