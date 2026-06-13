import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { workspaces } from "../db/schema.js";

export async function fireWebhook(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const [ws] = await db
    .select({ webhookUrl: workspaces.webhookUrl })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  const url = ws?.webhookUrl;
  if (!url) return;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      workspaceId,
      payload,
      sentAt: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // Fire-and-forget — webhook failures never block the main request
  });
}
