import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, tasks } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { AuthEnv } from "../middleware/auth.js";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["p0", "p1", "p2", "p3"]).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  dueAt: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
});

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

const updateSchema = createSchema.partial().extend({
  completedAt: toDate.optional(),
});

export const tasksRouter = new Hono<AuthEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");
    const rows = await db.select().from(tasks).where(eq(tasks.userId, userId));
    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(tasks)
      .values({ id: generateId(), userId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const [row] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, c.req.param("id")), eq(tasks.userId, userId)));
    if (!row)
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [row] = await db
      .update(tasks)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(tasks.id, c.req.param("id")), eq(tasks.userId, userId)))
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const [row] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, c.req.param("id")), eq(tasks.userId, userId)))
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
