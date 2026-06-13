import { verifyToken } from "@clerk/backend";
import { createMiddleware } from "hono/factory";

type AuthEnv = { Variables: { userId: string } };

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized", message: "Missing token" }, 401);
  }
  try {
    const payload = await verifyToken(header.slice(7), {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    c.set("userId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "unauthorized", message: "Invalid token" }, 401);
  }
});

export type { AuthEnv };
