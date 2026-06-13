import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  eq,
  and,
  desc,
  sql,
  ne,
  lt,
  isNull,
  isNotNull,
  or,
  asc,
  gte,
} from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import {
  db,
  contacts,
  activities,
  deals,
  tasks,
  workspaces,
} from "../db/index.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";
import { aiRateLimit } from "../middleware/rate-limit.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const followUpSchema = z.object({
  contactId: z.string().min(1),
});

export const aiRouter = new Hono<WorkspaceEnv>()
  .post(
    "/follow-up",
    aiRateLimit,
    zValidator("json", followUpSchema),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const { contactId } = c.req.valid("json");

      // Verify contact belongs to workspace
      const [contact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, contactId),
            eq(contacts.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!contact) {
        return c.json(
          { error: "not_found", message: "Contact not found" },
          404,
        );
      }

      // Fetch last 10 activities for context
      const recentActivities = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.contactId, contactId),
            eq(activities.workspaceId, workspaceId),
          ),
        )
        .orderBy(desc(activities.occurredAt))
        .limit(10);

      // Fetch related deals for deal context
      const relatedDeals = await db
        .select({ title: deals.title, stage: deals.stage, value: deals.value })
        .from(deals)
        .where(
          and(
            eq(deals.contactId, contactId),
            eq(deals.workspaceId, workspaceId),
          ),
        )
        .limit(5);

      // Build context block
      const activitySummary =
        recentActivities.length > 0
          ? recentActivities
              .map((a) => {
                const date = a.occurredAt.toISOString().split("T")[0];
                return `[${date}] ${a.type}${a.subject ? ` — "${a.subject}"` : ""}${a.body ? `\n${a.body.slice(0, 400)}` : ""}`;
              })
              .join("\n\n")
          : "No previous activity logged.";

      const dealSummary =
        relatedDeals.length > 0
          ? relatedDeals
              .map(
                (d) =>
                  `${d.title} (${d.stage}${d.value ? `, $${d.value}` : ""})`,
              )
              .join(", ")
          : "No deals linked.";

      const systemPrompt = `You are an AI assistant that drafts follow-up emails for founders.
Draft a concise, natural, non-generic follow-up email based on the contact and conversation history below.
The email should:
- Sound human, not like a template
- Reference something specific from recent conversations
- Have a clear, single purpose (check in, next step, or re-engage)
- Be under 150 words
- No signature line needed

Return ONLY the email body text, no subject line, no metadata.`;

      const userPrompt = `Contact: ${contact.name}${contact.email ? ` <${contact.email}>` : ""}
Type: ${contact.type}${contact.company ? ` at ${contact.company}` : ""}${contact.notes ? `\nNotes: ${contact.notes}` : ""}

Active deals: ${dealSummary}

Recent conversation history:
${activitySummary}

Draft a follow-up email to ${contact.name}.`;

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      });

      const draft =
        message.content[0].type === "text" ? message.content[0].text : "";

      // Increment AI action counter
      await db
        .update(workspaces)
        .set({ aiActionsUsed: sql`${workspaces.aiActionsUsed} + 1` })
        .where(eq(workspaces.id, workspaceId));

      return c.json({
        draft,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      });
    },
  )
  .post(
    "/meeting-brief",
    aiRateLimit,
    zValidator("json", z.object({ contactId: z.string().min(1) })),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const { contactId } = c.req.valid("json");

      const [contact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, contactId),
            eq(contacts.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!contact)
        return c.json(
          { error: "not_found", message: "Contact not found" },
          404,
        );

      const [recentActivities, relatedDeals, backlogItems] = await Promise.all([
        db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.contactId, contactId),
              eq(activities.workspaceId, workspaceId),
            ),
          )
          .orderBy(desc(activities.occurredAt))
          .limit(5),
        db
          .select({
            title: deals.title,
            stage: deals.stage,
            value: deals.value,
          })
          .from(deals)
          .where(
            and(
              eq(deals.contactId, contactId),
              eq(deals.workspaceId, workspaceId),
            ),
          )
          .limit(3),
        db
          .select({ title: tasks.title, priority: tasks.priority })
          .from(tasks)
          .where(
            and(
              eq(tasks.contactId, contactId),
              eq(tasks.workspaceId, workspaceId),
            ),
          )
          .limit(5),
      ]);

      const activityLine =
        recentActivities.length > 0
          ? recentActivities
              .map((a) => {
                const date = a.occurredAt.toISOString().split("T")[0];
                return `[${date}] ${a.type}${a.subject ? ` — ${a.subject}` : ""}${a.body ? `: ${a.body.slice(0, 200)}` : ""}`;
              })
              .join("\n")
          : "No logged activity.";

      const dealLine =
        relatedDeals.length > 0
          ? relatedDeals
              .map(
                (d) =>
                  `${d.title} (${d.stage}${d.value ? `, $${d.value}` : ""})`,
              )
              .join("; ")
          : "None";

      const backlogLine =
        backlogItems.length > 0
          ? backlogItems
              .map((t) => `[${t.priority.toUpperCase()}] ${t.title}`)
              .join("; ")
          : "None";

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are an AI that generates pre-meeting briefing cards for founders.
Output a structured briefing in this exact format (plain text, no markdown headers):

WHO: [1 sentence — their role, company, relationship type]
LAST CONTACT: [when and what was discussed, or "Never" if no history]
OPEN DEALS: [deal status or "None"]
THEY ASKED FOR: [feature requests they made, or "Nothing on record"]
TALKING POINTS: [2-3 bullet points — what to address in this meeting]
WATCH OUT FOR: [1 sentence — any risk or tension from history, or "Nothing flagged"]

Be specific. Use the actual data. Under 200 words total.`,
        messages: [
          {
            role: "user",
            content: `Contact: ${contact.name}${contact.company ? ` at ${contact.company}` : ""} — ${contact.type}${contact.notes ? `\nNotes: ${contact.notes}` : ""}

Recent activity:\n${activityLine}

Active deals: ${dealLine}
Feature requests: ${backlogLine}

Generate the pre-meeting brief.`,
          },
        ],
      });

      const brief =
        message.content[0].type === "text" ? message.content[0].text : "";

      await db
        .update(workspaces)
        .set({ aiActionsUsed: sql`${workspaces.aiActionsUsed} + 1` })
        .where(eq(workspaces.id, workspaceId));

      return c.json({ brief });
    },
  )
  .post(
    "/close-the-loop",
    aiRateLimit,
    zValidator("json", z.object({ taskId: z.string().min(1) })),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const { taskId } = c.req.valid("json");

      const [task] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
        .limit(1);

      if (!task) {
        return c.json({ error: "not_found", message: "Task not found" }, 404);
      }
      if (!task.contactId) {
        return c.json(
          { error: "no_contact", message: "Task has no linked contact" },
          400,
        );
      }

      const [contact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, task.contactId),
            eq(contacts.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!contact) {
        return c.json(
          { error: "not_found", message: "Contact not found" },
          404,
        );
      }

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 384,
        system: `You are an AI that drafts brief "we shipped it" emails for founders.
Write a short, genuine email telling the contact that a feature they requested has been built.
- Sound human, reference what they asked for by name
- Under 100 words
- Enthusiastic but not salesy
- No signature needed
Return ONLY the email body.`,
        messages: [
          {
            role: "user",
            content: `Contact: ${contact.name}${contact.company ? ` at ${contact.company}` : ""}
Feature they requested: "${task.title}"${task.description ? `\nContext: ${task.description}` : ""}

Draft the "we shipped it" email.`,
          },
        ],
      });

      const draft =
        message.content[0].type === "text" ? message.content[0].text : "";

      await db
        .update(workspaces)
        .set({ aiActionsUsed: sql`${workspaces.aiActionsUsed} + 1` })
        .where(eq(workspaces.id, workspaceId));

      return c.json({
        draft,
        contactName: contact.name,
        contactEmail: contact.email,
      });
    },
  )
  .post("/daily-brief", aiRateLimit, async (c) => {
    const workspaceId = c.get("workspaceId");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [stallingDeals, coldContacts, overdueFollowUps, recentActivities] =
      await Promise.all([
        db
          .select({
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
          .limit(5),

        db
          .select({
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
            name: contacts.name,
            cadenceDays: contacts.cadenceDays,
            lastContactedAt: contacts.lastContactedAt,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, workspaceId),
              isNotNull(contacts.cadenceDays),
              sql`(${contacts.lastContactedAt} IS NULL OR ${contacts.lastContactedAt} < NOW() - (${contacts.cadenceDays} * INTERVAL '1 day'))`,
            ),
          )
          .limit(5),

        db
          .select({
            type: activities.type,
            subject: activities.subject,
            occurredAt: activities.occurredAt,
          })
          .from(activities)
          .leftJoin(contacts, eq(activities.contactId, contacts.id))
          .where(
            and(
              eq(activities.workspaceId, workspaceId),
              gte(activities.occurredAt, sevenDaysAgo),
            ),
          )
          .orderBy(desc(activities.occurredAt))
          .limit(10),
      ]);

    const stallingLine = stallingDeals.length
      ? stallingDeals
          .map((d) => {
            const days = Math.floor(
              (Date.now() - new Date(d.stageChangedAt).getTime()) / 86_400_000,
            );
            return `${d.title} (${d.stage}, ${days}d stalled${d.value ? `, $${d.value}` : ""})`;
          })
          .join("; ")
      : "None";

    const coldLine = coldContacts.length
      ? coldContacts
          .map(
            (c) =>
              `${c.name}${c.company ? ` at ${c.company}` : ""} (${c.lastContactedAt ? `${Math.floor((Date.now() - new Date(c.lastContactedAt).getTime()) / 86_400_000)}d ago` : "never contacted"})`,
          )
          .join("; ")
      : "None";

    const overdueLine = overdueFollowUps.length
      ? overdueFollowUps
          .map((c) => `${c.name} (every ${c.cadenceDays}d cadence)`)
          .join("; ")
      : "None";

    const activityLine = recentActivities.length
      ? recentActivities
          .map((a) => `${a.type}${a.subject ? `: ${a.subject}` : ""}`)
          .join("; ")
      : "No recent activity.";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: `You are an AI chief of staff for a solo founder. Generate a concise morning briefing.

Output format — plain text, each section on its own line:
FOCUS TODAY: [1-2 most important actions, name specific people/deals]
DEALS AT RISK: [deals that need attention today or this week]
REACH OUT TO: [specific contacts to ping today with brief reason why]
QUICK WINS: [1-2 fast actions that would move things forward]

Be specific. Name people and deals. Under 150 words. Urgent = concrete, not vague.`,
      messages: [
        {
          role: "user",
          content: `Stalling deals (30+ days no movement): ${stallingLine}

Cold contacts (30+ days no touch): ${coldLine}

Overdue cadences: ${overdueLine}

Recent activity (last 7 days): ${activityLine}

Generate today's brief.`,
        },
      ],
    });

    const brief =
      message.content[0].type === "text" ? message.content[0].text : "";

    await db
      .update(workspaces)
      .set({ aiActionsUsed: sql`${workspaces.aiActionsUsed} + 1` })
      .where(eq(workspaces.id, workspaceId));

    return c.json({ brief });
  })
  .post("/investor-update", aiRateLimit, async (c) => {
    const workspaceId = c.get("workspaceId");
    const thisMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [fundraisingDeals, recentWins, topBacklogItems] = await Promise.all([
      db
        .select({
          title: deals.title,
          stage: deals.stage,
          value: deals.value,
          contactId: deals.contactId,
          stageChangedAt: deals.stageChangedAt,
        })
        .from(deals)
        .where(
          and(
            eq(deals.workspaceId, workspaceId),
            eq(deals.pipelineType, "fundraising"),
            ne(deals.stage, "closed_won"),
            ne(deals.stage, "closed_lost"),
          ),
        )
        .orderBy(asc(deals.stageChangedAt))
        .limit(10),

      db
        .select({ title: deals.title, value: deals.value })
        .from(deals)
        .where(
          and(
            eq(deals.workspaceId, workspaceId),
            eq(deals.stage, "closed_won"),
            gte(deals.stageChangedAt, thisMonthStart),
          ),
        )
        .limit(5),

      db
        .select({ title: tasks.title, priority: tasks.priority })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            ne(tasks.status, "done"),
            ne(tasks.status, "cancelled"),
            or(eq(tasks.priority, "p0"), eq(tasks.priority, "p1")),
          ),
        )
        .limit(8),
    ]);

    const pipelineLine = fundraisingDeals.length
      ? fundraisingDeals
          .map(
            (d) =>
              `${d.title} — ${d.stage}${d.value ? ` ($${d.value.toLocaleString()})` : ""}`,
          )
          .join("\n")
      : "No active fundraising deals.";

    const winsLine = recentWins.length
      ? recentWins
          .map(
            (d) =>
              `${d.title}${d.value ? ` ($${d.value.toLocaleString()})` : ""}`,
          )
          .join(", ")
      : "None this month.";

    const backlogLine = topBacklogItems.length
      ? topBacklogItems
          .map((t) => `[${t.priority.toUpperCase()}] ${t.title}`)
          .join("\n")
      : "No active backlog items.";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `You are an AI that drafts concise investor update emails for founders.
The update should be authentic, brief (under 200 words), and cover:
1. Key progress / wins this month
2. Current fundraising pipeline status
3. What you're building next (top priorities)
4. Any specific ask or next steps for investors

Format as a plain email body — no subject line, no signature. Use simple prose, not bullet lists.
Sound like a confident founder talking to their investors, not a consultant writing a report.`,
      messages: [
        {
          role: "user",
          content: `Company context:
Recent wins this month: ${winsLine}

Active fundraising pipeline:
${pipelineLine}

Top product priorities (what we're building):
${backlogLine}

Draft a concise investor update email.`,
        },
      ],
    });

    const draft =
      message.content[0].type === "text" ? message.content[0].text : "";

    await db
      .update(workspaces)
      .set({ aiActionsUsed: sql`${workspaces.aiActionsUsed} + 1` })
      .where(eq(workspaces.id, workspaceId));

    return c.json({ draft });
  });
