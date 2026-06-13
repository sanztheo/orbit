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

interface Stats {
  stallingDeals: number;
  coldContacts: number;
  openTasks: number;
  totalContacts: number;
  wonThisMonth: number;
  overdueFollowUps: number;
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

interface ActionItems {
  stallingDeals: StallingDeal[];
  coldContacts: ColdContact[];
  overdueFollowUps: OverdueContact[];
}

function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function StatCard({
  title,
  value,
  urgent,
  href,
  loading,
}: {
  title: string;
  value: number;
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
            {loading ? "…" : value}
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
  };
  const a = actions ?? {
    stallingDeals: [],
    coldContacts: [],
    overdueFollowUps: [],
  };

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
          title="Total Contacts"
          value={s.totalContacts}
          href="/dashboard/contacts"
          loading={loading}
        />
      </div>

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
            return (
              <Link
                key={c.id}
                href={`/dashboard/contacts/${c.id}`}
                className="flex items-start justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    every {c.cadenceDays}d cadence
                  </p>
                </div>
                <span className="shrink-0 ml-2 text-xs font-medium text-red-600">
                  +{overdue}d late
                </span>
              </Link>
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
