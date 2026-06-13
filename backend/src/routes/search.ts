import { Hono } from "hono";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, contacts, deals, tasks, activities } from "../db/index.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

export const searchRouter = new Hono<WorkspaceEnv>().get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json({ contacts: [], deals: [], tasks: [] });

  const pattern = `%${q}%`;

  const [contactRows, dealRows, taskRows, activityRows] = await Promise.all([
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

    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)),
        ),
      )
      .limit(3),

    db
      .select({
        id: activities.id,
        contactId: activities.contactId,
        contactName: contacts.name,
        type: activities.type,
        subject: activities.subject,
        body: activities.body,
        occurredAt: activities.occurredAt,
      })
      .from(activities)
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .where(
        and(
          eq(activities.workspaceId, workspaceId),
          or(
            ilike(activities.subject, pattern),
            ilike(activities.body, pattern),
          ),
        ),
      )
      .orderBy(desc(activities.occurredAt))
      .limit(3),
  ]);

  return c.json({
    contacts: contactRows,
    deals: dealRows,
    tasks: taskRows,
    activities: activityRows,
  });
});
