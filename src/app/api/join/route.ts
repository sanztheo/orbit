import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateId, generateReferralCode } from "@/lib/ids";
import { checkRateLimit } from "@/lib/rate-limit";

const joinSchema = z.object({
  slug: z.string().min(2).max(60),
  email: z.string().email(),
  referralCode: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { slug, email, referralCode } = parsed.data;

  const [waitlist] = await db
    .select()
    .from(waitlists)
    .where(eq(waitlists.slug, slug))
    .limit(1);

  if (!waitlist || !waitlist.isActive) {
    return NextResponse.json({ error: "Waitlist not found" }, { status: 404 });
  }

  // Check duplicate
  const existingByEmail = await db
    .select({
      id: subscribers.id,
      position: subscribers.position,
      referralCode: subscribers.referralCode,
    })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existingByEmail.length > 0 && existingByEmail[0]) {
    return NextResponse.json(
      {
        alreadyJoined: true,
        position: existingByEmail[0].position,
        referralCode: existingByEmail[0].referralCode,
      },
      { status: 200 },
    );
  }

  // Count current subscribers to determine position
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(eq(subscribers.waitlistId, waitlist.id));

  const currentCount = countResult?.count ?? 0;
  const position = currentCount + 1;

  // Resolve referrer
  let referrerId: string | null = null;
  if (referralCode) {
    const [referrer] = await db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(eq(subscribers.referralCode, referralCode))
      .limit(1);
    if (referrer) referrerId = referrer.id;
  }

  const newCode = generateReferralCode();

  const [subscriber] = await db
    .insert(subscribers)
    .values({
      id: generateId(),
      waitlistId: waitlist.id,
      email,
      referralCode: newCode,
      referredBy: referrerId,
      position,
    })
    .returning();

  // Bump referrer's count (position recalc handled client-side via leaderboard)
  if (referrerId) {
    await db
      .update(subscribers)
      .set({ referralCount: sql`${subscribers.referralCount} + 1` })
      .where(eq(subscribers.id, referrerId));
  }

  return NextResponse.json(
    {
      position: subscriber!.position,
      referralCode: subscriber!.referralCode,
      waitlistName: waitlist.name,
    },
    { status: 201 },
  );
}
