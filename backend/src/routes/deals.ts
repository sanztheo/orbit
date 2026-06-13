import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, deals } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

const createSchema = z.object({
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
});

const updateSchema = createSchema.partial();

export const dealsRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const contactId = c.req.query("contactId");
    const rows = await db
      .select()
      .from(deals)
      .where(
        contactId
          ? and(
              eq(deals.workspaceId, workspaceId),
              eq(deals.contactId, contactId),
            )
          : eq(deals.workspaceId, workspaceId),
      );
    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(deals)
      .values({ id: generateId(), workspaceId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.id, c.req.param("id")),
          eq(deals.workspaceId, workspaceId),
        ),
      );
    if (!row)
      return c.json({ error: "not_found", message: "Deal not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const stageChanged = body.stage !== undefined;
    const [row] = await db
      .update(deals)
      .set({
        ...body,
        updatedAt: new Date(),
        ...(stageChanged ? { stageChangedAt: new Date() } : {}),
      })
      .where(
        and(
          eq(deals.id, c.req.param("id")),
          eq(deals.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Deal not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .delete(deals)
      .where(
        and(
          eq(deals.id, c.req.param("id")),
          eq(deals.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Deal not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
