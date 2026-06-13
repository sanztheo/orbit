import { createMiddleware } from "hono/factory";
import { eq, sql } from "drizzle-orm";
import { db, workspaces } from "../db/index.js";
import type { WorkspaceEnv } from "./workspace.js";

const AI_MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT ?? 50);

// Resets monthly counter if the stored resetAt is in a prior calendar month.
function isNewMonth(resetAt: Date): boolean {
  const now = new Date();
  return (
    resetAt.getFullYear() < now.getFullYear() ||
    resetAt.getMonth() < now.getMonth()
  );
}

export const aiQuota = createMiddleware<WorkspaceEnv>(async (c, next) => {
  const workspaceId = c.get("workspaceId");

  const [ws] = await db
    .select({
      aiActionsUsed: workspaces.aiActionsUsed,
      aiActionsResetAt: workspaces.aiActionsResetAt,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!ws) return c.json({ error: "workspace_not_found" }, 404);

  const needsReset = isNewMonth(ws.aiActionsResetAt);
  const used = needsReset ? 0 : ws.aiActionsUsed;

  if (used >= AI_MONTHLY_LIMIT) {
    return c.json(
      {
        error: "quota_exceeded",
        message: `Monthly AI limit reached (${AI_MONTHLY_LIMIT} actions). Upgrade to continue.`,
        used,
        limit: AI_MONTHLY_LIMIT,
      },
      429,
    );
  }

  // Increment before calling next — if the AI call fails the count is still charged
  // (prevents retry abuse). Reset the month counter if needed.
  await db
    .update(workspaces)
    .set(
      needsReset
        ? {
            aiActionsUsed: 1,
            aiActionsResetAt: new Date(),
            updatedAt: new Date(),
          }
        : {
            aiActionsUsed: sql`${workspaces.aiActionsUsed} + 1`,
            updatedAt: new Date(),
          },
    )
    .where(eq(workspaces.id, workspaceId));

  return next();
});

interface Bucket {
  tokens: number;
  lastRefillAt: number;
}

// In-memory token bucket — per workspace, 10 requests/minute
const buckets = new Map<string, Bucket>();
const RATE = 10;
const WINDOW_MS = 60_000;

// Prune stale buckets every 5 minutes to prevent unbounded growth
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefillAt < cutoff) buckets.delete(key);
  }
}, 300_000);

export const aiRateLimit = createMiddleware<WorkspaceEnv>(async (c, next) => {
  const workspaceId = c.get("workspaceId");
  const now = Date.now();

  let bucket = buckets.get(workspaceId);
  if (!bucket || now - bucket.lastRefillAt >= WINDOW_MS) {
    bucket = { tokens: RATE, lastRefillAt: now };
  }

  if (bucket.tokens <= 0) {
    return c.json(
      {
        error: "rate_limited",
        message: "AI endpoint limit: 10 requests/minute per workspace",
        retryAfterMs: WINDOW_MS - (now - bucket.lastRefillAt),
      },
      429,
    );
  }

  bucket.tokens -= 1;
  buckets.set(workspaceId, bucket);
  return next();
});
