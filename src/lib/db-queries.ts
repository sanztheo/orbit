import { db } from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getWaitlistBySlug(slug: string) {
  const [waitlist] = await db
    .select()
    .from(waitlists)
    .where(eq(waitlists.slug, slug))
    .limit(1);
  return waitlist ?? null;
}

export async function getWaitlistById(id: string, userId: string) {
  const [waitlist] = await db
    .select()
    .from(waitlists)
    .where(and(eq(waitlists.id, id), eq(waitlists.userId, userId)))
    .limit(1);
  return waitlist ?? null;
}

export async function getSubscriberCount(waitlistId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(eq(subscribers.waitlistId, waitlistId));
  return result?.count ?? 0;
}

export async function getUserWaitlists(userId: string) {
  return db
    .select()
    .from(waitlists)
    .where(eq(waitlists.userId, userId))
    .orderBy(waitlists.createdAt);
}
