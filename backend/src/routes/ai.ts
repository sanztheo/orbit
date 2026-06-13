import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, sql } from "drizzle-orm";
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
  );
