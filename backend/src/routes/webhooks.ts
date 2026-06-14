import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { workspaces } from "../db/schema.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";
import { fireWebhook } from "../lib/fire-webhook.js";

export const webhooksRouter = new Hono<WorkspaceEnv>();

webhooksRouter
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [ws] = await db
      .select({ webhookUrl: workspaces.webhookUrl })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
    return c.json({ webhookUrl: ws?.webhookUrl ?? null });
  })
  .put(
    "/",
    zValidator(
      "json",
      z.object({
        webhookUrl: z.string().url().nullable(),
      }),
    ),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const { webhookUrl } = c.req.valid("json");
      await db
        .update(workspaces)
        .set({ webhookUrl, updatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId));
      return c.json({ ok: true });
    },
  )
  .post("/test", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [ws] = await db
      .select({ webhookUrl: workspaces.webhookUrl })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    const url = ws?.webhookUrl;
    if (!url) {
      return c.json(
        { error: "no_webhook", message: "No webhook URL configured" },
        400,
      );
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          workspaceId,
          payload: { message: "This is a test event from Orbit CRM" },
          sentAt: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      });
      return c.json({ ok: res.ok, status: res.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      return c.json({ error: "delivery_failed", message: msg }, 502);
    }
  });
