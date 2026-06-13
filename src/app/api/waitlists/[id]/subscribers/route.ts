import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers, waitlists } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [waitlist] = await db
    .select({ id: waitlists.id })
    .from(waitlists)
    .where(and(eq(waitlists.id, id), eq(waitlists.userId, userId)))
    .limit(1);

  if (!waitlist)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.waitlistId, id))
    .orderBy(subscribers.position);

  return NextResponse.json(rows);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { subscriberId, status } = await req.json();

  if (!subscriberId || !["waiting", "invited", "removed"].includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [waitlist] = await db
    .select({ id: waitlists.id })
    .from(waitlists)
    .where(and(eq(waitlists.id, id), eq(waitlists.userId, userId)))
    .limit(1);

  if (!waitlist)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(subscribers)
    .set({ status })
    .where(
      and(eq(subscribers.id, subscriberId), eq(subscribers.waitlistId, id)),
    )
    .returning();

  if (!updated)
    return NextResponse.json(
      { error: "Subscriber not found" },
      { status: 404 },
    );
  return NextResponse.json(updated);
}
