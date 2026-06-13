import { Hono } from "hono";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, contacts } from "../db/index.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

export const companiesRouter = new Hono<WorkspaceEnv>().get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select({
      company: contacts.company,
      contactCount: sql<number>`COUNT(${contacts.id})::int`,
      lastContactedAt: sql<string | null>`MAX(${contacts.lastContactedAt})`,
      dealValue: sql<number>`COALESCE((
        SELECT SUM(d.value)
        FROM deals d
        INNER JOIN contacts c2 ON d.contact_id = c2.id
        WHERE c2.company = contacts.company
          AND c2.workspace_id = ${workspaceId}
          AND d.workspace_id = ${workspaceId}
      ), 0)::int`,
    })
    .from(contacts)
    .where(
      and(eq(contacts.workspaceId, workspaceId), isNotNull(contacts.company)),
    )
    .groupBy(contacts.company)
    .orderBy(desc(sql`COUNT(${contacts.id})`));

  return c.json({ data: rows });
});
