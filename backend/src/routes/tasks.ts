import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNotNull, lte, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, tasks, contacts, deals } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["p0", "p1", "p2", "p3"]).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  dueAt: toDate.optional(),
});

const updateSchema = createSchema.partial().extend({
  completedAt: toDate.optional(),
});

export const tasksRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const contactId = c.req.query("contactId");
    const overdue = c.req.query("overdue") === "1";
    const filters = [eq(tasks.workspaceId, workspaceId)];
    if (contactId) filters.push(eq(tasks.contactId, contactId));
    if (overdue) {
      filters.push(lte(tasks.dueAt, new Date()));
      filters.push(ne(tasks.status, "done"));
      filters.push(ne(tasks.status, "cancelled"));
    }
    const rows = await db
      .select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        contactId: tasks.contactId,
        contactName: contacts.name,
        contactCompany: contacts.company,
        dealId: tasks.dealId,
        dueAt: tasks.dueAt,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        priorityScore: sql<number>`COALESCE((SELECT SUM(${deals.value}) FROM ${deals} WHERE ${deals.contactId} = ${tasks.contactId} AND ${deals.workspaceId} = ${tasks.workspaceId}), 0)`,
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contactId, contacts.id))
      .where(and(...filters))
      .orderBy(tasks.dueAt);
    return c.json({ data: rows, total: rows.length });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(tasks)
      .values({ id: generateId(), workspaceId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/feature-report", async (c) => {
    const workspaceId = c.get("workspaceId");
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
        contactId: tasks.contactId,
        contactName: contacts.name,
        contactCompany: contacts.company,
        dealValueSum: sql<number>`COALESCE((SELECT SUM(${deals.value}) FROM ${deals} WHERE ${deals.contactId} = ${tasks.contactId} AND ${deals.workspaceId} = ${tasks.workspaceId}), 0)`,
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contactId, contacts.id))
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          isNotNull(tasks.contactId),
          ne(tasks.status, "done"),
          ne(tasks.status, "cancelled"),
        ),
      )
      .orderBy(
        desc(
          sql<number>`COALESCE((SELECT SUM(${deals.value}) FROM ${deals} WHERE ${deals.contactId} = ${tasks.contactId} AND ${deals.workspaceId} = ${tasks.workspaceId}), 0)`,
        ),
      );
    return c.json({ data: rows });
  })
  .get("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        contactId: tasks.contactId,
        contactName: contacts.name,
        contactCompany: contacts.company,
        dealId: tasks.dealId,
        dueAt: tasks.dueAt,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        priorityScore: sql<number>`COALESCE((SELECT SUM(${deals.value}) FROM ${deals} WHERE ${deals.contactId} = ${tasks.contactId} AND ${deals.workspaceId} = ${tasks.workspaceId}), 0)`,
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contactId, contacts.id))
      .where(
        and(
          eq(tasks.id, c.req.param("id")),
          eq(tasks.workspaceId, workspaceId),
        ),
      );
    if (!row)
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .update(tasks)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, c.req.param("id")),
          eq(tasks.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.id, c.req.param("id")),
          eq(tasks.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
