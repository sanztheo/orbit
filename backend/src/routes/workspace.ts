import { Hono } from "hono";
import { and, count, eq, ne } from "drizzle-orm";
import { db, workspaces, workspaceMemberships } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

const SEAT_LIMITS: Record<"solo" | "founder" | "studio", number> = {
  solo: 1,
  founder: 3,
  studio: 10,
};

export const workspaceRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
    if (!ws) return c.json({ error: "not_found" }, 404);
    const [{ memberCount }] = await db
      .select({ memberCount: count() })
      .from(workspaceMemberships)
      .where(eq(workspaceMemberships.workspaceId, workspaceId));
    return c.json({
      data: { ...ws, memberCount, seatLimit: SEAT_LIMITS[ws.plan] },
    });
  })
  .get("/members", async (c) => {
    const workspaceId = c.get("workspaceId");
    const rows = await db
      .select()
      .from(workspaceMemberships)
      .where(eq(workspaceMemberships.workspaceId, workspaceId));
    return c.json({ data: rows, total: rows.length });
  })
  .post("/members", async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = await c.req.json<{
      clerkUserId: string;
      role?: "member" | "owner";
    }>();
    if (!body.clerkUserId?.trim()) {
      return c.json(
        { error: "bad_request", message: "clerkUserId required" },
        400,
      );
    }

    const [ws] = await db
      .select({ plan: workspaces.plan })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
    if (!ws) return c.json({ error: "not_found" }, 404);

    const [{ memberCount }] = await db
      .select({ memberCount: count() })
      .from(workspaceMemberships)
      .where(eq(workspaceMemberships.workspaceId, workspaceId));

    const limit = SEAT_LIMITS[ws.plan];
    if (memberCount >= limit) {
      return c.json(
        {
          error: "seat_limit_reached",
          message: `Your ${ws.plan} plan allows ${limit} seat${limit === 1 ? "" : "s"}. Upgrade to add more members.`,
          limit,
          current: memberCount,
        },
        403,
      );
    }

    const [existing] = await db
      .select({ id: workspaceMemberships.id })
      .from(workspaceMemberships)
      .where(eq(workspaceMemberships.clerkUserId, body.clerkUserId))
      .limit(1);
    if (existing) {
      return c.json(
        { error: "already_member", message: "User is already a member" },
        409,
      );
    }

    const [row] = await db
      .insert(workspaceMemberships)
      .values({
        id: generateId(),
        workspaceId,
        clerkUserId: body.clerkUserId,
        role: body.role ?? "member",
      })
      .returning();
    return c.json({ data: row }, 201);
  })
  .delete("/members/:membershipId", async (c) => {
    const workspaceId = c.get("workspaceId");
    const callerUserId = c.get("userId");
    const membershipId = c.req.param("membershipId");

    // Prevent removing the last owner
    const [target] = await db
      .select({
        role: workspaceMemberships.role,
        clerkUserId: workspaceMemberships.clerkUserId,
      })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.id, membershipId),
          eq(workspaceMemberships.workspaceId, workspaceId),
        ),
      );
    if (!target) return c.json({ error: "not_found" }, 404);

    if (target.role === "owner") {
      const [{ ownerCount }] = await db
        .select({ ownerCount: count() })
        .from(workspaceMemberships)
        .where(
          and(
            eq(workspaceMemberships.workspaceId, workspaceId),
            eq(workspaceMemberships.role, "owner"),
            ne(workspaceMemberships.id, membershipId),
          ),
        );
      if (ownerCount === 0) {
        return c.json(
          { error: "last_owner", message: "Cannot remove the last owner" },
          403,
        );
      }
    }

    const [row] = await db
      .delete(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.id, membershipId),
          eq(workspaceMemberships.workspaceId, workspaceId),
        ),
      )
      .returning();

    void callerUserId; // available if audit logging needed later
    return c.json({ data: { id: row!.id } });
  });
