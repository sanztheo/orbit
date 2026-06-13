import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { waitlists } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { eq } from "drizzle-orm";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(waitlists)
    .where(eq(waitlists.userId, userId))
    .orderBy(waitlists.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, slug, description, websiteUrl } = parsed.data;

  const existing = await db
    .select({ id: waitlists.id })
    .from(waitlists)
    .where(eq(waitlists.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const [waitlist] = await db
    .insert(waitlists)
    .values({
      id: generateId(),
      userId,
      name,
      slug,
      description: description ?? null,
      websiteUrl: websiteUrl || null,
    })
    .returning();

  return NextResponse.json(waitlist, { status: 201 });
}
