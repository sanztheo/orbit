import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, contacts } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { AuthEnv } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.email().optional(),
  company: z.string().optional(),
  type: z
    .enum(["lead", "customer", "investor", "advisor", "partner"])
    .optional(),
  notes: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  twitterHandle: z.string().optional(),
});

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

const updateSchema = createSchema.partial().extend({
  lastContactedAt: toDate.optional(),
  nextFollowUpAt: toDate.optional(),
  priorityScore: z.number().int().min(0).optional(),
});

export const contactsRouter = new Hono<AuthEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId));
    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(contacts)
      .values({ id: generateId(), userId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/:id", async (c) => {
    const userId = c.get("userId");
    const [row] = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)),
      );
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [row] = await db
      .update(contacts)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const [row] = await db
      .delete(contacts)
      .where(
        and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
