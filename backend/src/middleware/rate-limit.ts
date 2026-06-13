import { createMiddleware } from "hono/factory";
import type { WorkspaceEnv } from "./workspace.js";

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
