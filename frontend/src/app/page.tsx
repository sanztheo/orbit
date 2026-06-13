import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SprawlCalculator } from "./sprawl-calculator";

const PAINS = [
  {
    title: "The patchwork collapse",
    quote:
      "You get an email from a client. To reply, you need to check Slack for the latest update, find the Jira ticket, remember what was said in yesterday's meeting.",
    author: "Mehdi, co-founder",
    fix: "Orbit keeps every conversation, deal, and feature request in one place — no tab-switching.",
  },
  {
    title: "Manual data entry kills every CRM",
    quote:
      "60–90 days in, founders abandon CRMs because the maintenance cost exceeds the value.",
    author: "Common pattern across 200+ founder interviews",
    fix: "Orbit auto-captures relationship signals from email. Zero manual input.",
  },
  {
    title: "CRM and backlog are silos",
    quote:
      "Every tool in its own silo, data that never lines up, more time spent gluing things together than actually selling.",
    author: "Doug Camplejohn, CEO of Coffee",
    fix: "Link feature requests directly to the contacts who asked. Priority score = frequency × deal size.",
  },
];

const FEATURES = [
  {
    icon: "👥",
    title: "Unified contacts",
    body: "One record. Customer, investor, partner, advisor — one tag, zero duplicate databases.",
  },
  {
    icon: "🎯",
    title: "Deal pipeline",
    body: "Kanban for sales and fundraising. Stall detection at 30 days. Stage timestamps always on.",
  },
  {
    icon: "📋",
    title: "Product backlog",
    body: "Feature requests linked to the contacts who asked. Priority auto-calculated from CRM data.",
  },
  {
    icon: "✉️",
    title: "AI follow-ups",
    body: "Reads your email threads + contact history → drafts a contextual reply. Not generic GPT.",
  },
];

const PRICING = [
  {
    name: "Solo",
    price: "$29",
    period: "/month",
    limits: "1 user · 2,000 contacts · 100 AI actions",
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Founder",
    price: "$49",
    period: "/month",
    limits: "3 users · unlimited contacts · 500 AI actions",
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Studio",
    price: "$99",
    period: "/month",
    limits: "10 users · unlimited everything · API access",
    cta: "Start free trial",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/90 px-6 py-3 backdrop-blur">
        <span className="text-base font-semibold tracking-tight">Orbit</span>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign in
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
            Try free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 py-24 text-center">
        <div className="mb-4 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          Built for solo founders · 14-day free trial · No credit card
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Replace your Notion + Folk + Linear stack with{" "}
          <span className="text-primary">one tool</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Orbit is the OS for solo founders. Contacts, deal pipeline, product
          backlog, and an AI that reads your emails — all in one place, zero
          manual input.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
            Start free trial
          </Link>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Sign in
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          14 days free · then from $29/mo · cancel anytime
        </p>
      </section>

      {/* Pain points */}
      <section className="border-t border-border bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold">
            The pain Orbit kills
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.title} className="flex flex-col gap-3">
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                  &ldquo;{p.quote}&rdquo;
                  <footer className="mt-1 not-italic text-xs">
                    — {p.author}
                  </footer>
                </blockquote>
                <p className="text-sm text-foreground">{p.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold">
            Everything a solo founder needs
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border p-5"
              >
                <div className="mb-2 text-2xl">{f.icon}</div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tool sprawl calculator */}
      <SprawlCalculator />

      {/* Competitors */}
      <section className="border-t border-border bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Why not Folk / Attio / HubSpot?
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium">Tool</th>
                  <th className="py-2 pr-4 font-medium">Price</th>
                  <th className="py-2 font-medium">
                    Fatal flaw for solo founders
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">
                    Folk
                  </td>
                  <td className="py-2 pr-4">$24–60/seat</td>
                  <td className="py-2">
                    No mobile. Deals paywalled. Hits ceiling in 3 months.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">
                    Attio
                  </td>
                  <td className="py-2 pr-4">$0–69/seat</td>
                  <td className="py-2">
                    Went upmarket. Setup burden. Abandoned solo segment.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">
                    HubSpot
                  </td>
                  <td className="py-2 pr-4">$0→$20+/seat</td>
                  <td className="py-2">
                    Free tier gutted Sept 2024. 2,300% cost jump as you grow.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-primary">
                    Orbit
                  </td>
                  <td className="py-2 pr-4 font-medium">$29/workspace</td>
                  <td className="py-2 text-foreground">
                    Flat per-workspace. All features. No seat tax.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold">
            Flat per-workspace pricing
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Pay for value, not headcount. Every tier includes all features.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "flex flex-col rounded-xl border p-6",
                  p.highlight ? "border-foreground shadow-md" : "border-border",
                )}
              >
                {p.highlight && (
                  <span className="mb-2 w-fit rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{p.limits}</p>
                <Link
                  href="/sign-up"
                  className={cn(
                    "mt-6",
                    buttonVariants({
                      variant: p.highlight ? "default" : "outline",
                      size: "sm",
                    }),
                  )}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border bg-foreground px-6 py-16 text-center text-background">
        <h2 className="text-2xl font-bold">Ready to replace the patchwork?</h2>
        <p className="mt-2 text-muted">
          14-day free trial. No credit card required.
        </p>
        <Link
          href="/sign-up"
          className={cn(
            "mt-6 inline-flex",
            buttonVariants({ variant: "outline", size: "lg" }),
            "border-background text-background hover:bg-background hover:text-foreground",
          )}
        >
          Start for free
        </Link>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 Orbit · Built autonomously by Claude Sonnet 4.6
      </footer>
    </div>
  );
}
