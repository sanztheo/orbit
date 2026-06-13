"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
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
}: {
  title: string;
  value: number;
  display?: string;
  urgent?: boolean;
  href: string;
  loading?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={`transition-colors hover:bg-muted/40 ${urgent && value > 0 ? "border-red-200" : ""}`}
      >
        <CardHeader className="pb-1 pt-4 px-4">
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
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
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
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("orbit_checklist_dismissed") === "1";
  });

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

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      try {
        const [statsRes, actionsRes] = await Promise.all([
          fetch(`${apiUrl}/api/stats`, { headers }),
          fetch(`${apiUrl}/api/stats/action-items`, { headers }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        else setOffline(true);
        if (actionsRes.ok) setActions(await actionsRes.json());
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
        />
        <StatCard
          title="Cold Contacts"
          value={s.coldContacts}
          urgent
          href="/dashboard/contacts"
          loading={loading}
        />
        <StatCard
          title="Overdue Follow-ups"
          value={s.overdueFollowUps}
          urgent
          href="/dashboard/contacts"
          loading={loading}
        />
        <StatCard
          title="Open Tasks"
          value={s.openTasks}
          href="/dashboard/tasks"
          loading={loading}
        />
        <StatCard
          title="Won This Month"
          value={s.wonThisMonth}
          href="/dashboard/deals"
          loading={loading}
        />
        <StatCard
          title="Pipeline Value"
          value={s.pipelineValue}
          display={
            s.pipelineValue > 0 ? `$${s.pipelineValue.toLocaleString()}` : "—"
          }
          href="/dashboard/deals"
          loading={loading}
        />
        <StatCard
          title="Total Contacts"
          value={s.totalContacts}
          href="/dashboard/contacts"
          loading={loading}
        />
      </div>

      {!loading && s.totalContacts > 0 && <MorningBrief />}

      {!loading &&
        !checklistDismissed &&
        (() => {
          const steps = [
            {
              label: "Import your contacts",
              done: s.totalContacts > 0,
              href: "/dashboard/contacts",
              action: "Go to Contacts →",
            },
            {
              label: "Create your first deal",
              done: s.totalDeals > 0,
              href: "/dashboard/deals/new",
              action: "New Deal →",
            },
            {
              label: "Add a backlog item",
              done: s.openTasks > 0,
              href: "/dashboard/tasks/new",
              action: "New Task →",
            },
            {
              label: "Connect Gmail (coming soon)",
              done: false,
              locked: true,
            },
          ];
          const doneCount = steps.filter((s) => s.done).length;
          const activeDoneCount = steps.filter(
            (s) => !s.locked && s.done,
          ).length;
          const activeTotal = steps.filter((s) => !s.locked).length;
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
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${step.done ? "bg-emerald-50" : step.locked ? "bg-muted/40 opacity-60" : "bg-white border border-border"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          step.done
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        }
                      >
                        {step.done ? "✓" : step.locked ? "🔒" : "○"}
                      </span>
                      <span
                        className={
                          step.done ? "text-emerald-800 line-through" : ""
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                    {!step.done && !step.locked && step.href && (
                      <Link
                        href={step.href}
                        className="text-xs text-blue-600 hover:underline shrink-0"
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-600">⚠</span>
            <h2 className="text-sm font-semibold text-amber-900">At Risk</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {a.atRiskDeals.length}
            </span>
            <span className="text-xs text-amber-700 ml-1">
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
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm hover:bg-amber-50 transition-colors"
                >
                  <span className="font-medium truncate max-w-[160px]">
                    {deal.title}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-amber-700">
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
            return (
              <Link
                key={deal.id}
                href="/dashboard/deals"
                className="flex items-start justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{deal.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {deal.stage.replace(/_/g, " ")}
                    {deal.value ? ` · $${deal.value.toLocaleString()}` : ""}
                  </p>
                </div>
                <span className="shrink-0 ml-2 text-xs font-medium text-red-600">
                  {days}d
                </span>
              </Link>
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
                <span className="shrink-0 ml-2 text-xs font-medium text-red-600">
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
                    <span className="text-red-600 font-medium">
                      +{overdue}d late
                    </span>
                  </p>
                </Link>
                <button
                  onClick={() => markContacted(c.id)}
                  disabled={isMarking}
                  title="Mark as contacted"
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
                >
                  {isMarking ? "…" : "✓ Called"}
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
