import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

async function fetchStats(token: string | null): Promise<Stats | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/api/stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function StatCard({
  title,
  description,
  value,
  urgent,
  href,
}: {
  title: string;
  description: string;
  value: number | string;
  urgent?: boolean;
  href?: string;
}) {
  return (
    <Card className={urgent && Number(value) > 0 ? "border-red-200" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-bold ${urgent && Number(value) > 0 ? "text-red-600" : ""}`}
        >
          {value}
        </p>
        {href && Number(value) > 0 && (
          <Link
            href={href}
            className={`mt-2 inline-block text-xs ${buttonVariants({ variant: "link", size: "sm" })} px-0`}
          >
            View →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const stats = await fetchStats(token);

  const s = stats ?? {
    stallingDeals: 0,
    coldContacts: 0,
    openTasks: 0,
    totalContacts: 0,
    wonThisMonth: 0,
    overdueFollowUps: 0,
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your solo-founder OS at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Stalling Deals"
          description="Stuck in same stage 30+ days"
          value={s.stallingDeals}
          urgent
          href="/dashboard/deals"
        />
        <StatCard
          title="Cold Contacts"
          description="Not touched in 30+ days"
          value={s.coldContacts}
          urgent
          href="/dashboard/contacts"
        />
        <StatCard
          title="Open Tasks"
          description="Todo + in progress"
          value={s.openTasks}
          href="/dashboard/tasks"
        />
        <StatCard
          title="Total Contacts"
          description="All relationship types"
          value={s.totalContacts}
          href="/dashboard/contacts"
        />
        <StatCard
          title="Won This Month"
          description="Deals closed won"
          value={s.wonThisMonth}
          href="/dashboard/deals"
        />
        <StatCard
          title="Overdue Follow-ups"
          description="Past their target cadence"
          value={s.overdueFollowUps}
          urgent
          href="/dashboard/contacts"
        />
      </div>

      {stats === null && (
        <p className="text-xs text-muted-foreground">
          Could not load stats — backend may be offline.
        </p>
      )}
    </div>
  );
}
