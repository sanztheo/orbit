"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  Phone,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ImportButton } from "./contacts/import-button";
import { MorningBrief } from "./morning-brief";

interface Stats {
  stallingDeals: number;
  coldContacts: number;
  openTasks: number;
  totalContacts: number;
  wonThisMonth: number;
  overdueFollowUps: number;
  totalDeals: number;
  pipelineValue: number;
}

interface StallingDeal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  stageChangedAt: string;
}

interface ColdContact {
  id: string;
  name: string;
  company: string | null;
  lastContactedAt: string | null;
}

interface OverdueContact {
  id: string;
  name: string;
  company: string | null;
  lastContactedAt: string | null;
  cadenceDays: number;
}

interface AtRiskDeal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  stageChangedAt: string;
}

interface ActionItems {
  stallingDeals: StallingDeal[];
  coldContacts: ColdContact[];
  overdueFollowUps: OverdueContact[];
  atRiskDeals: AtRiskDeal[];
}

function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function StatCard({
  title,
  value,
  display,
  urgent,
  href,
  loading,
  icon,
}: {
  title: string;
  value: number;
  display?: string;
  urgent?: boolean;
  href: string;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={`transition-colors hover:bg-muted/40 ${urgent && value > 0 ? "border-red-200" : ""}`}
      >
        <CardHeader className="pb-1 pt-4 px-4">
          {icon && <div className="mb-1">{icon}</div>}
          <CardDescription className="text-xs">{title}</CardDescription>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <p
            className={`text-3xl font-bold ${loading ? "text-muted-foreground/40" : ""} ${urgent && value > 0 && !loading ? "text-red-600" : ""}`}
          >
            {loading ? "…" : (display ?? value)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionSection({
  title,
  count,
  emptyMsg,
  children,
}: {
  title: string;
  count: number;
  emptyMsg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {count > 0 && (
          <span className="rounded-full bg-red-100 dark:bg-red-950/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{emptyMsg}</p>
      ) : (
        <div className="flex flex-col gap-1.5">{children}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [actions, setActions] = useState<ActionItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [closingDealId, setClosingDealId] = useState<string | null>(null);
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("orbit_checklist_dismissed") === "1";
  });
  const [onboarding, setOnboarding] = useState<{
    hasContact: boolean;
    hasDeal: boolean;
    hasActivity: boolean;
    hasCadence: boolean;
    hasBacklogItem: boolean;
  } | null>(null);

  async function markContacted(contactId: string) {
    setMarkingId(contactId);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const h: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const now = new Date().toISOString();
      await Promise.all([
        fetch(`${apiUrl}/api/contacts/${contactId}`, {
          method: "PATCH",
          headers: h,
          body: JSON.stringify({ lastContactedAt: now }),
        }),
        fetch(`${apiUrl}/api/activities`, {
          method: "POST",
          headers: h,
          body: JSON.stringify({
            contactId,
            type: "call",
            subject: "Quick check-in",
            occurredAt: now,
          }),
        }),
      ]);
      // Remove from list optimistically
      setActions((prev) =>
        prev
          ? {
              ...prev,
              overdueFollowUps: prev.overdueFollowUps.filter(
                (c) => c.id !== contactId,
              ),
            }
          : prev,
      );
    } finally {
      setMarkingId(null);
    }
  }

  async function closeDeal(
    dealId: string,
    outcome: "closed_won" | "closed_lost",
  ) {
    setClosingDealId(dealId);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      await fetch(`${apiUrl}/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ stage: outcome }),
      });
      setActions((prev) =>
        prev
          ? {
              ...prev,
              stallingDeals: prev.stallingDeals.filter((d) => d.id !== dealId),
              atRiskDeals: prev.atRiskDeals.filter((d) => d.id !== dealId),
            }
          : prev,
      );
    } finally {
      setClosingDealId(null);
    }
  }

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      try {
        const [statsRes, actionsRes, onboardingRes] = await Promise.all([
          fetch(`${apiUrl}/api/stats`, { headers }),
          fetch(`${apiUrl}/api/stats/action-items`, { headers }),
          fetch(`${apiUrl}/api/stats/onboarding`, { headers }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        else setOffline(true);
        if (actionsRes.ok) setActions(await actionsRes.json());
        if (onboardingRes.ok) setOnboarding(await onboardingRes.json());
      } catch {
        setOffline(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const s = stats ?? {
    stallingDeals: 0,
    coldContacts: 0,
    openTasks: 0,
    totalContacts: 0,
    wonThisMonth: 0,
    overdueFollowUps: 0,
    totalDeals: 0,
    pipelineValue: 0,
  };
  const a = actions ?? {
    stallingDeals: [],
    coldContacts: [],
    overdueFollowUps: [],
    atRiskDeals: [],
  };

  if (!loading && !offline && s.totalContacts === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-3xl text-background">
            ◎
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to Orbit
          </h1>
          <p className="max-w-sm text-muted-foreground">
            Start by importing your existing contacts. Orbit will calculate
            relationship health and surface who needs attention automatically.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ImportButton
            label="↑ Import contacts from CSV"
            variant="default"
            size="lg"
          />
          <span className="text-xs text-muted-foreground">or</span>
          <Link
            href="/dashboard/contacts/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Add first contact manually
          </Link>
        </div>

        <div className="grid max-w-lg gap-3 text-left sm:grid-cols-3">
          {[
            {
              icon: "📋",
              text: "CSV from Folk, Notion, HubSpot, Google Contacts",
            },
            { icon: "⚡", text: "Relationship health scored automatically" },
            { icon: "🔒", text: "Your data stays in your workspace" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-muted-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Your business at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Stalling Deals"
          value={s.stallingDeals}
          urgent
          href="/dashboard/deals"
          loading={loading}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Cold Contacts"
          value={s.coldContacts}
          urgent
          href="/dashboard/contacts"
          loading={loading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Overdue Follow-ups"
          value={s.overdueFollowUps}
          urgent
          href="/dashboard/contacts"
          loading={loading}
          icon={<Bell className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Open Tasks"
          value={s.openTasks}
          href="/dashboard/tasks"
          loading={loading}
          icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Won This Month"
          value={s.wonThisMonth}
          href="/dashboard/deals"
          loading={loading}
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Pipeline Value"
          value={s.pipelineValue}
          display={
            s.pipelineValue > 0 ? `$${s.pipelineValue.toLocaleString()}` : "—"
          }
          href="/dashboard/deals"
          loading={loading}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Total Contacts"
          value={s.totalContacts}
          href="/dashboard/contacts"
          loading={loading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {!loading && s.totalContacts > 0 && <MorningBrief />}

      {!loading &&
        !checklistDismissed &&
        onboarding !== null &&
        (() => {
          const ob = onboarding;
          const steps = [
            {
              label: "Add your first contact",
              done: ob.hasContact,
              href: "/dashboard/contacts/new",
              action: "Add Contact →",
            },
            {
              label: "Log an activity (call, email, note)",
              done: ob.hasActivity,
              href: "/dashboard/contacts",
              action: "Open Contacts →",
            },
            {
              label: "Create your first deal",
              done: ob.hasDeal,
              href: "/dashboard/deals/new",
              action: "New Deal →",
            },
            {
              label: "Set a follow-up cadence on a contact",
              done: ob.hasCadence,
              href: "/dashboard/contacts",
              action: "Open Contacts →",
            },
            {
              label: "Add a backlog item",
              done: ob.hasBacklogItem,
              href: "/dashboard/tasks/new",
              action: "New Task →",
            },
          ];
          const doneCount = steps.filter((s) => s.done).length;
          const activeDoneCount = doneCount;
          const activeTotal = steps.length;
          if (activeDoneCount === activeTotal) return null;
          return (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">Getting started</p>
                  <p className="text-xs text-muted-foreground">
                    {doneCount}/{steps.length} steps complete
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem("orbit_checklist_dismissed", "1");
                    setChecklistDismissed(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {steps.map((step) => (
                  <div
                    key={step.label}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${step.done ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-card border border-border"}`}
                  >
                    <div className="flex items-center gap-2">
                      {step.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="text-muted-foreground shrink-0">
                          ○
                        </span>
                      )}
                      <span
                        className={
                          step.done
                            ? "text-emerald-800 dark:text-emerald-200 line-through"
                            : ""
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                    {!step.done && step.href && (
                      <Link
                        href={step.href}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
                      >
                        {step.action}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {a.atRiskDeals.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              At Risk
            </h2>
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              {a.atRiskDeals.length}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300 ml-1">
              deals 14–29 days without movement
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.atRiskDeals.map((deal) => {
              const days = daysSince(deal.stageChangedAt);
              return (
                <Link
                  key={deal.id}
                  href="/dashboard/deals"
                  className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-card px-3 py-2 text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                >
                  <span className="font-medium truncate max-w-[160px]">
                    {deal.title}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {days}d
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground capitalize">
                    {deal.stage.replace(/_/g, " ")}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <ActionSection
          title="Stalling Deals"
          count={a.stallingDeals.length}
          emptyMsg="No deals stalling — all moving forward."
        >
          {a.stallingDeals.map((deal) => {
            const days = daysSince(deal.stageChangedAt);
            const isClosing = closingDealId === deal.id;
            return (
              <div
                key={deal.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5"
              >
                <Link
                  href="/dashboard/deals"
                  className="flex-1 min-w-0 hover:opacity-80"
                >
                  <p className="text-sm font-medium truncate">{deal.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {deal.stage.replace(/_/g, " ")}
                    {deal.value
                      ? ` · $${deal.value.toLocaleString()}`
                      : ""} ·{" "}
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {days}d
                    </span>
                  </p>
                </Link>
                <button
                  onClick={() => closeDeal(deal.id, "closed_won")}
                  disabled={isClosing}
                  title="Mark won"
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors disabled:opacity-40"
                >
                  {isClosing ? "…" : <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => closeDeal(deal.id, "closed_lost")}
                  disabled={isClosing}
                  title="Mark lost"
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {stats && s.stallingDeals > a.stallingDeals.length && (
            <Link
              href="/dashboard/deals"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              +{s.stallingDeals - a.stallingDeals.length} more →
            </Link>
          )}
        </ActionSection>

        <ActionSection
          title="Cold Contacts"
          count={a.coldContacts.length}
          emptyMsg="All contacts touched in the last 30 days."
        >
          {a.coldContacts.map((c) => {
            const days = daysSince(c.lastContactedAt);
            return (
              <Link
                key={c.id}
                href={`/dashboard/contacts/${c.id}`}
                className="flex items-start justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.company && (
                    <p className="text-xs text-muted-foreground truncate">
                      {c.company}
                    </p>
                  )}
                </div>
                <span className="shrink-0 ml-2 text-xs font-medium text-red-600 dark:text-red-400">
                  {days >= 999 ? "never" : `${days}d`}
                </span>
              </Link>
            );
          })}
          {stats && s.coldContacts > a.coldContacts.length && (
            <Link
              href="/dashboard/contacts"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              +{s.coldContacts - a.coldContacts.length} more →
            </Link>
          )}
        </ActionSection>

        <ActionSection
          title="Overdue Follow-ups"
          count={a.overdueFollowUps.length}
          emptyMsg="All cadences on track."
        >
          {a.overdueFollowUps.map((c) => {
            const days = daysSince(c.lastContactedAt);
            const overdue = days - (c.cadenceDays ?? 0);
            const isMarking = markingId === c.id;
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5"
              >
                <Link
                  href={`/dashboard/contacts/${c.id}`}
                  className="flex-1 min-w-0 hover:opacity-80"
                >
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    every {c.cadenceDays}d ·{" "}
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      +{overdue}d late
                    </span>
                  </p>
                </Link>
                <button
                  onClick={() => markContacted(c.id)}
                  disabled={isMarking}
                  title="Mark as contacted"
                  className="shrink-0 flex items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors disabled:opacity-40"
                >
                  {isMarking ? (
                    "…"
                  ) : (
                    <>
                      <Phone className="h-3.5 w-3.5 mr-1" />
                      Called
                    </>
                  )}
                </button>
              </div>
            );
          })}
          {stats && s.overdueFollowUps > a.overdueFollowUps.length && (
            <Link
              href="/dashboard/contacts"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              +{s.overdueFollowUps - a.overdueFollowUps.length} more →
            </Link>
          )}
        </ActionSection>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Link
          href="/dashboard/contacts/new"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          + Contact
        </Link>
        <Link
          href="/dashboard/deals/new"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          + Deal
        </Link>
        <Link
          href="/dashboard/tasks/new"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          + Task
        </Link>
      </div>

      {offline && (
        <p className="text-xs text-muted-foreground">
          Backend offline — stats unavailable.
        </p>
      )}
    </div>
  );
}
