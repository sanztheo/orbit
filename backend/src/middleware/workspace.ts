import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db, workspaces, workspaceMemberships } from "../db/index.js";
import { generateId } from "../lib/ids.js";

type WorkspaceEnv = {
  Variables: { userId: string; workspaceId: string };
};

// Resolve workspaceId from Clerk userId. Creates a default workspace on first login (lazy provisioning).
export const requireWorkspace = createMiddleware<WorkspaceEnv>(
  async (c, next) => {
    const userId = c.get("userId");

    // Find existing membership
    const [membership] = await db
      .select({ workspaceId: workspaceMemberships.workspaceId })
      .from(workspaceMemberships)
      .where(eq(workspaceMemberships.clerkUserId, userId))
      .limit(1);

    if (membership) {
      c.set("workspaceId", membership.workspaceId);
      return next();
    }

    // First login — create default workspace
    const workspaceId = generateId();
    await db.transaction(async (tx) => {
      await tx.insert(workspaces).values({
        id: workspaceId,
        name: "My Workspace",
        ownerClerkId: userId,
      });
      await tx.insert(workspaceMemberships).values({
        id: generateId(),
        workspaceId,
        clerkUserId: userId,
        role: "owner",
      });
    });

    c.set("workspaceId", workspaceId);
    return next();
  },
);

export type { WorkspaceEnv };
