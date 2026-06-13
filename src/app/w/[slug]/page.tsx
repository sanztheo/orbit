import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { JoinForm } from "./join-form";

interface PageProps {
  params: { slug: string };
  searchParams: { ref?: string };
}

export default async function WaitlistPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = params;
  const referralCode = searchParams.ref;

  const waitlist = await db
    .select()
    .from(waitlists)
    .where(eq(waitlists.slug, slug))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!waitlist || !waitlist.isActive) {
    notFound();
  }

  const [{ count }] = await db
    .select({
      count: db.$count(subscribers, eq(subscribers.waitlistId, waitlist.id)),
    })
    .from(subscribers)
    .where(eq(subscribers.waitlistId, waitlist.id));

  const subscriberCount = Number(count);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-500 font-medium mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Waitlist open
          </div>

          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
            {waitlist.name}
          </h1>

          {waitlist.description && (
            <p className="text-lg text-slate-500 leading-relaxed">
              {waitlist.description}
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Subscriber count strip */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              People already waiting
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {subscriberCount.toLocaleString()}
            </span>
          </div>

          {/* Form area */}
          <div className="px-6 py-8">
            <JoinForm slug={slug} referralCode={referralCode} />
          </div>
        </div>

        {/* Footer note */}
        {waitlist.websiteUrl && (
          <p className="text-center text-sm text-slate-400 mt-6">
            Learn more at{" "}
            <a
              href={waitlist.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
            >
              {waitlist.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
