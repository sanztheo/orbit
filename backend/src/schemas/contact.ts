import { z } from "zod";

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

export const contactCreateSchema = z.object({
  name: z.string().min(1),
  email: z.email().nullish(),
  company: z.string().nullish(),
  type: z
    .enum(["lead", "customer", "investor", "advisor", "partner"])
    .optional(),
  notes: z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  twitterHandle: z.string().nullish(),
});

export const contactUpdateSchema = contactCreateSchema.partial().extend({
  lastContactedAt: toDate.optional(),
  nextFollowUpAt: toDate.optional(),
  cadenceDays: z.number().int().min(1).max(365).nullable().optional(),
  priorityScore: z.number().int().min(0).optional(),
});
