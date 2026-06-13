import { z } from "zod";

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

export const dealCreateSchema = z.object({
  title: z.string().min(1),
  contactId: z.string().optional(),
  pipelineType: z.enum(["sales", "fundraising", "partnership"]).optional(),
  value: z.number().int().min(0).optional(),
  stage: z
    .enum([
      "prospect",
      "contacted",
      "meeting",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ])
    .optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseAt: toDate.optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
});

export const dealUpdateSchema = dealCreateSchema.partial();
