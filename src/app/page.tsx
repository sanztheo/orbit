import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Users, Bell, BarChart3, Check } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Nav */}
      <nav className="border-b border-zinc-100 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight">WaitlistKit</span>
          <div className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Pricing
            </Link>
            {userId ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-28 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-600">
            Viral waitlists, zero friction
          </span>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-6xl">
            Launch your viral waitlist{" "}
            <span className="text-violet-600">in 5 minutes</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-500">
            Collect sign-ups, incentivize referrals, send automated emails, and
            track growth — all from one simple dashboard. No code required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up"
              className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-500 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/w/demo"
              className="rounded-xl border border-zinc-200 bg-white px-8 py-3.5 text-base font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
            >
              See Demo →
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-400">
            Free forever · No credit card required
          </p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y border-zinc-100 bg-zinc-50 py-6 text-center">
        <p className="text-sm text-zinc-500">
          Trusted by{" "}
          <span className="font-semibold text-zinc-800">1,200+ founders</span>{" "}
          to collect over{" "}
          <span className="font-semibold text-zinc-800">500,000 sign-ups</span>
        </p>
      </div>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            Everything you need to build hype
          </h2>
          <p className="mb-16 text-center text-zinc-500">
            From day one to launch, WaitlistKit handles the growth mechanics so
            you can focus on the product.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-6 w-6 text-violet-600" />}
              title="Referral Queue"
              description="Subscribers climb the waitlist by referring friends. Built-in viral loop with unique share links and automatic rank updates."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6 text-violet-600" />}
              title="Email Notifications"
              description="Auto-send welcome emails, referral milestones, and launch announcements. Powered by Resend — no SMTP config needed."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6 text-violet-600" />}
              title="Analytics"
              description="Track sign-up velocity, referral conversion, and top referrers. Export your list as CSV anytime you need it."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-zinc-50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="mb-16 text-center text-zinc-500">
            Start free, scale when you grow. No hidden fees.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            <PricingCard
              tier="Free"
              price="$0"
              period="forever"
              description="Perfect for your first launch."
              features={[
                "1 waitlist",
                "100 subscribers",
                "Referral queue",
                "Basic analytics",
              ]}
              cta="Get Started"
              ctaHref="/sign-up"
              highlighted={false}
            />
            <PricingCard
              tier="Pro"
              price="$19"
              period="/ month"
              description="For serious product launches."
              features={[
                "Unlimited waitlists",
                "Unlimited subscribers",
                "Email notifications",
                "Advanced analytics",
                "Custom domain",
                "Priority support",
              ]}
              cta="Start Pro"
              ctaHref="/sign-up"
              highlighted={true}
            />
            <PricingCard
              tier="Team"
              price="$49"
              period="/ month"
              description="For agencies and power users."
              features={[
                "Everything in Pro",
                "REST API access",
                "Webhooks",
                "Team members (5 seats)",
                "White-label option",
                "SLA support",
              ]}
              cta="Start Team"
              ctaHref="/sign-up"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to build your waitlist?
          </h2>
          <p className="mt-4 text-zinc-500">
            Set up in 5 minutes. Start collecting sign-ups today.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-xl bg-violet-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-500 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-zinc-400 sm:flex-row">
          <span className="font-semibold text-zinc-700">WaitlistKit</span>
          <div className="flex gap-6">
            <Link href="/w/demo" className="hover:text-zinc-700">
              Demo
            </Link>
            <Link href="#pricing" className="hover:text-zinc-700">
              Pricing
            </Link>
            <Link href="/sign-up" className="hover:text-zinc-700">
              Sign Up
            </Link>
            <Link href="/sign-in" className="hover:text-zinc-700">
              Sign In
            </Link>
          </div>
          <span>© {new Date().getFullYear()} WaitlistKit</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}

function PricingCard({
  tier,
  price,
  period,
  description,
  features,
  cta,
  ctaHref,
  highlighted,
}: {
  tier: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl p-7 ${
        highlighted
          ? "bg-violet-600 text-white shadow-xl shadow-violet-200"
          : "border border-zinc-200 bg-white text-zinc-900"
      }`}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest opacity-70">
        {tier}
      </div>
      <div className="mb-1 flex items-end gap-1">
        <span className="text-4xl font-extrabold">{price}</span>
        <span
          className={`mb-1 text-sm ${highlighted ? "text-violet-200" : "text-zinc-400"}`}
        >
          {period}
        </span>
      </div>
      <p
        className={`mb-6 text-sm ${highlighted ? "text-violet-100" : "text-zinc-500"}`}
      >
        {description}
      </p>
      <ul className="mb-8 flex flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check
              className={`h-4 w-4 flex-shrink-0 ${
                highlighted ? "text-violet-200" : "text-violet-600"
              }`}
            />
            <span className={highlighted ? "text-violet-50" : "text-zinc-700"}>
              {f}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`mt-auto rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
          highlighted
            ? "bg-white text-violet-700 hover:bg-violet-50"
            : "border border-zinc-200 text-zinc-800 hover:border-violet-400 hover:text-violet-700"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
