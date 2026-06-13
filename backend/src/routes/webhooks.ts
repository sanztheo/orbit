import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { workspaces } from "../db/schema.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

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
  );
