import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import db from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify waitlist ownership
  const [waitlist] = await db
    .select()
    .from(waitlists)
    .where(and(eq(waitlists.id, id), eq(waitlists.userId, userId)))
    .limit(1);

  if (!waitlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch all subscribers ordered by position
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.waitlistId, id))
    .orderBy(asc(subscribers.position));

  // Build CSV
  const header = "position,email,referral_count,status,joined_at";
  const lines = rows.map((s) =>
    [
      s.position,
      `"${s.email.replace(/"/g, '""')}"`,
      s.referralCount,
      s.status,
      s.joinedAt.toISOString(),
    ].join(","),
  );
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="waitlist-subscribers.csv"`,
    },
  });
}
