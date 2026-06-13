"use client";

import Link from "next/link";
import { Users, Trophy, ArrowUp } from "lucide-react";

const DEMO_WAITLIST = {
  name: "Nova AI",
  description:
    "The next-generation AI writing assistant. Be first to experience it.",
  totalSignups: 1284,
  yourPosition: 47,
  referrals: 3,
  leaderboard: [
    { name: "Alex M.", referrals: 38, position: 1 },
    { name: "Priya K.", referrals: 31, position: 2 },
    { name: "Jordan T.", referrals: 27, position: 3 },
    { name: "Sam R.", referrals: 19, position: 4 },
    { name: "Casey L.", referrals: 14, position: 5 },
  ],
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Demo banner */}
      <div className="bg-violet-600 px-4 py-2.5 text-center text-sm text-white">
        This is a demo —{" "}
        <Link
          href="/sign-up"
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Create your own waitlist at WaitlistKit
        </Link>
      </div>

      {/* Nav */}
      <nav className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-base font-bold tracking-tight text-zinc-900">
            {DEMO_WAITLIST.name}
          </span>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-700">
            Powered by WaitlistKit
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero join card */}
        <div className="mb-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            {DEMO_WAITLIST.name}
          </h1>
          <p className="mt-3 text-zinc-500">{DEMO_WAITLIST.description}</p>

          {/* Stats row */}
          <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Stat
              value={DEMO_WAITLIST.totalSignups.toLocaleString()}
              label="people on the list"
            />
            <div className="hidden h-8 w-px bg-zinc-100 sm:block" />
            <Stat
              value={`#${DEMO_WAITLIST.yourPosition}`}
              label="your position"
            />
            <div className="hidden h-8 w-px bg-zinc-100 sm:block" />
            <Stat
              value={String(DEMO_WAITLIST.referrals)}
              label="referrals made"
            />
          </div>

          {/* Fake join form */}
          <form
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              disabled
            />
            <button
              type="submit"
              disabled
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
            >
              Join Waitlist
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-400">
            Demo mode — sign-ups disabled
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Referral card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="font-semibold text-zinc-900">
                Your Referral Link
              </h2>
            </div>
            <p className="mb-4 text-sm text-zinc-500">
              Share your unique link to move up the list. Each referral bumps
              you up by 10 spots.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <span className="flex-1 truncate text-xs font-mono text-zinc-500">
                waitlistkit.com/w/nova-ai?ref=demo-abc123
              </span>
              <button
                className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm border border-zinc-200 hover:bg-zinc-50"
                onClick={() => {}}
              >
                Copy
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2.5">
              <ArrowUp className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">
                {DEMO_WAITLIST.referrals} referral
                {DEMO_WAITLIST.referrals !== 1 ? "s" : ""} → moved up 30 spots
              </span>
            </div>
          </div>

          {/* Leaderboard card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="font-semibold text-zinc-900">Top Referrers</h2>
            </div>
            <ul className="flex flex-col gap-2.5">
              {DEMO_WAITLIST.leaderboard.map((entry) => (
                <li
                  key={entry.position}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        entry.position === 1
                          ? "bg-amber-100 text-amber-600"
                          : entry.position === 2
                            ? "bg-zinc-100 text-zinc-600"
                            : entry.position === 3
                              ? "bg-orange-100 text-orange-600"
                              : "bg-zinc-50 text-zinc-400"
                      }`}
                    >
                      {entry.position}
                    </span>
                    <span className="text-sm font-medium text-zinc-700">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-400">
                    {entry.referrals} referrals
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Progress bar card */}
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-zinc-900">Launch Progress</h2>
            <span className="text-sm text-zinc-500">Goal: 2,000 sign-ups</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{
                width: `${Math.min(
                  (DEMO_WAITLIST.totalSignups / 2000) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {DEMO_WAITLIST.totalSignups.toLocaleString()} of 2,000 —{" "}
            {Math.round((DEMO_WAITLIST.totalSignups / 2000) * 100)}% to launch
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 rounded-2xl bg-violet-600 px-8 py-10 text-center text-white shadow-xl shadow-violet-200">
          <h2 className="text-2xl font-bold">
            Build your own waitlist like this
          </h2>
          <p className="mt-2 text-violet-100">
            Set up in 5 minutes. Free to start.
          </p>
          <Link
            href="/sign-up"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
          >
            Create your waitlist →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold text-zinc-900">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-400">{label}</div>
    </div>
  );
}
