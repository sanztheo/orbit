import { zValidator } from "@hono/zod-validator";
import { and, eq, ilike, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, deals, contacts } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import { fireWebhook } from "../lib/fire-webhook.js";
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
  nextAction: z.string().optional(),
  fundName: z.string().optional(),
  checkSize: z.number().int().min(0).optional(),
  portfolioUrl: z.string().url().nullish(),
});

const updateSchema = createSchema.partial();

export const dealsRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const contactId = c.req.query("contactId");
    const search = c.req.query("search");
    const searchFilter = search
      ? or(
          ilike(deals.title, `%${search}%`),
          ilike(contacts.name, `%${search}%`),
        )
      : undefined;
    const rows = await db
      .select({
        id: deals.id,
        workspaceId: deals.workspaceId,
        title: deals.title,
        contactId: deals.contactId,
        contactName: contacts.name,
        contactCompany: contacts.company,
        contactLastContactedAt: contacts.lastContactedAt,
        contactNextFollowUpAt: contacts.nextFollowUpAt,
        pipelineType: deals.pipelineType,
        stage: deals.stage,
        value: deals.value,
        probability: deals.probability,
        expectedCloseAt: deals.expectedCloseAt,
        stageChangedAt: deals.stageChangedAt,
        notes: deals.notes,
        nextAction: deals.nextAction,
        fundName: deals.fundName,
        checkSize: deals.checkSize,
        portfolioUrl: deals.portfolioUrl,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(
        and(
          eq(deals.workspaceId, workspaceId),
          contactId ? eq(deals.contactId, contactId) : undefined,
          searchFilter,
        ),
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
    if (stageChanged) {
      fireWebhook(workspaceId, "deal.stage_changed", {
        id: row.id,
        title: row.title,
        stage: row.stage,
        previousStage: body.stage,
      });
    }
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
