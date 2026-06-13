import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, eq, desc } from "drizzle-orm";
import { db, activities, contacts } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

const createSchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(["email", "call", "meeting", "note", "linkedin"]),
  subject: z.string().optional(),
  body: z.string().optional(),
  dealId: z.string().optional(),
  occurredAt: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
});

export const activitiesRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const contactId = c.req.query("contactId");

    const rows = await db
      .select()
      .from(activities)
      .where(
        contactId
          ? and(
              eq(activities.workspaceId, workspaceId),
              eq(activities.contactId, contactId),
            )
          : eq(activities.workspaceId, workspaceId),
      )
      .orderBy(desc(activities.occurredAt))
      .limit(50);

    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");

    // Verify contact belongs to workspace
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, body.contactId),
          eq(contacts.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!contact) {
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    }

    const [row] = await db
      .insert(activities)
      .values({
        id: generateId(),
        workspaceId,
        ...body,
        occurredAt: body.occurredAt ?? new Date(),
      })
      .returning();

    // Update contact's lastContactedAt
    await db
      .update(contacts)
      .set({ lastContactedAt: row.occurredAt, updatedAt: new Date() })
      .where(eq(contacts.id, body.contactId));

    return c.json({ data: row }, 201);
  })
  .delete("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .delete(activities)
      .where(
        and(
          eq(activities.id, c.req.param("id")),
          eq(activities.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row) {
      return c.json({ error: "not_found", message: "Activity not found" }, 404);
    }
    return c.json({ data: { id: row.id } });
  });
