import { Hono } from "hono";
import {
  eq,
  and,
  lt,
  gte,
  or,
  isNull,
  ne,
  isNotNull,
  sql,
  asc,
  desc,
} from "drizzle-orm";
import { db, contacts, deals, tasks } from "../db/index.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const statsRouter = new Hono<WorkspaceEnv>()
  .get("/action-items", async (c) => {
    const workspaceId = c.get("workspaceId");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [stallingDealsList, coldContactsList, overdueFollowUpsList] =
      await Promise.all([
        db
          .select({
            id: deals.id,
            title: deals.title,
            stage: deals.stage,
            value: deals.value,
            stageChangedAt: deals.stageChangedAt,
          })
          .from(deals)
          .where(
            and(
              eq(deals.workspaceId, workspaceId),
              ne(deals.stage, "closed_won"),
              ne(deals.stage, "closed_lost"),
              lt(deals.stageChangedAt, thirtyDaysAgo),
            ),
          )
          .orderBy(asc(deals.stageChangedAt))
          .limit(5),

        db
          .select({
            id: contacts.id,
            name: contacts.name,
            company: contacts.company,
            lastContactedAt: contacts.lastContactedAt,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, workspaceId),
              or(
                isNull(contacts.lastContactedAt),
                lt(contacts.lastContactedAt, thirtyDaysAgo),
              ),
            ),
          )
          .orderBy(asc(contacts.lastContactedAt))
          .limit(5),

        db
          .select({
            id: contacts.id,
            name: contacts.name,
            company: contacts.company,
            lastContactedAt: contacts.lastContactedAt,
            cadenceDays: contacts.cadenceDays,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, workspaceId),
              isNotNull(contacts.cadenceDays),
              sql`(${contacts.lastContactedAt} IS NULL OR ${contacts.lastContactedAt} < NOW() - (${contacts.cadenceDays} * INTERVAL '1 day'))`,
            ),
          )
          .orderBy(asc(contacts.lastContactedAt))
          .limit(5),
      ]);

    return c.json({
      stallingDeals: stallingDealsList,
      coldContacts: coldContactsList,
      overdueFollowUps: overdueFollowUpsList,
    });
  })
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const [
      stallingDeals,
      coldContacts,
      openTasks,
      totalContacts,
      wonThisMonth,
      overdueFollowUps,
      totalDeals,
    ] = await Promise.all([
      // Deals stuck in active stage for 30+ days
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(deals)
        .where(
          and(
            eq(deals.workspaceId, workspaceId),
            ne(deals.stage, "closed_won"),
            ne(deals.stage, "closed_lost"),
            lt(deals.stageChangedAt, thirtyDaysAgo),
          ),
        ),

      // Contacts not touched in 30+ days (or never)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, workspaceId),
            or(
              isNull(contacts.lastContactedAt),
              lt(contacts.lastContactedAt, thirtyDaysAgo),
            ),
          ),
        ),

      // Open tasks (todo + in_progress)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress")),
          ),
        ),

      // Total contacts
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(eq(contacts.workspaceId, workspaceId)),

      // Deals won this month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(deals)
        .where(
          and(
            eq(deals.workspaceId, workspaceId),
            eq(deals.stage, "closed_won"),
            gte(
              deals.stageChangedAt,
              new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            ),
          ),
        ),

      // Contacts with cadence set whose last-touch exceeds their interval
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, workspaceId),
            isNotNull(contacts.cadenceDays),
            sql`(${contacts.lastContactedAt} IS NULL OR ${contacts.lastContactedAt} < NOW() - (${contacts.cadenceDays} * INTERVAL '1 day'))`,
          ),
        ),

      // Total deals
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(deals)
        .where(eq(deals.workspaceId, workspaceId)),
    ]);

    return c.json({
      stallingDeals: stallingDeals[0]?.count ?? 0,
      coldContacts: coldContacts[0]?.count ?? 0,
      openTasks: openTasks[0]?.count ?? 0,
      totalContacts: totalContacts[0]?.count ?? 0,
      wonThisMonth: wonThisMonth[0]?.count ?? 0,
      overdueFollowUps: overdueFollowUps[0]?.count ?? 0,
      totalDeals: totalDeals[0]?.count ?? 0,
    });
  });
