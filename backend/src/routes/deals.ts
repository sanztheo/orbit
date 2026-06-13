import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, deals } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { AuthEnv } from "../middleware/auth.js";

const createSchema = z.object({
  title: z.string().min(1),
  contactId: z.string().optional(),
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
  expectedCloseAt: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const dealsRouter = new Hono<AuthEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");
    const rows = await db.select().from(deals).where(eq(deals.userId, userId));
    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(deals)
      .values({ id: generateId(), userId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const [row] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, c.req.param("id")), eq(deals.userId, userId)));
    if (!row)
      return c.json({ error: "not_found", message: "Deal not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [row] = await db
      .update(deals)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(deals.id, c.req.param("id")), eq(deals.userId, userId)))
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Deal not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const [row] = await db
      .delete(deals)
      .where(and(eq(deals.id, c.req.param("id")), eq(deals.userId, userId)))
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Deal not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
