import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, contacts, deals, tasks, activities } from "../db/index.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

export const exportRouter = new Hono<WorkspaceEnv>().get(
  "/bundle",
  async (c) => {
    const workspaceId = c.get("workspaceId");

    const [contactRows, dealRows, taskRows, activityRows] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.workspaceId, workspaceId)),
      db.select().from(deals).where(eq(deals.workspaceId, workspaceId)),
      db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
      db
        .select()
        .from(activities)
        .where(eq(activities.workspaceId, workspaceId)),
    ]);

    c.header("Content-Type", "application/json");
    c.header(
      "Content-Disposition",
      `attachment; filename="orbit-export-${new Date().toISOString().slice(0, 10)}.json"`,
    );

    return c.json({
      exportedAt: new Date().toISOString(),
      workspace: workspaceId,
      contacts: contactRows,
      deals: dealRows,
      tasks: taskRows,
      activities: activityRows,
    });
  },
);
