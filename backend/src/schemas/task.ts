import { z } from "zod";

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

export const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["p0", "p1", "p2", "p3"]).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  dueAt: toDate.optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  completedAt: toDate.optional(),
});
