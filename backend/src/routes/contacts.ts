import { zValidator } from "@hono/zod-validator";
import { and, eq, ilike, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, contacts } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

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

export const contactsRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const search = c.req.query("search");
    const type = c.req.query("type") as
      | "lead"
      | "customer"
      | "investor"
      | "advisor"
      | "partner"
      | undefined;

    const searchFilter = search
      ? or(
          ilike(contacts.name, `%${search}%`),
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.company, `%${search}%`),
        )
      : undefined;

    const typeFilter = type ? eq(contacts.type, type) : undefined;

    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.workspaceId, workspaceId), searchFilter, typeFilter),
      );
    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(contacts)
      .values({ id: generateId(), workspaceId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      );
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .update(contacts)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
