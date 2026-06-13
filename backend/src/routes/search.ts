import { Hono } from "hono";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, contacts, deals } from "../db/index.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

export const searchRouter = new Hono<WorkspaceEnv>().get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json({ contacts: [], deals: [] });

  const pattern = `%${q}%`;

  const [contactRows, dealRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        company: contacts.company,
        type: contacts.type,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          or(
            ilike(contacts.name, pattern),
            ilike(contacts.email, pattern),
            ilike(contacts.company, pattern),
            ilike(contacts.notes, pattern),
          ),
        ),
      )
      .limit(5),

    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        value: deals.value,
      })
      .from(deals)
      .where(
        and(eq(deals.workspaceId, workspaceId), ilike(deals.title, pattern)),
      )
      .limit(5),
  ]);

  return c.json({ contacts: contactRows, deals: dealRows });
});
