"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mail,
  Phone,
  Video,
  StickyNote,
  Link2,
  Search,
  Clock,
  PenLine,
  Activity as ActivityIcon,
} from "lucide-react";

type ActivityType = "email" | "call" | "meeting" | "note" | "linkedin";

interface Activity {
  id: string;
  contactId: string | null;
  contactName: string | null;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  occurredAt: string;
}

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  meeting: <Video className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  linkedin: <Link2 className="h-4 w-4" />,
};

const TYPE_COLOR: Record<ActivityType, string> = {
  email: "text-blue-600 dark:text-blue-400",
  call: "text-green-600 dark:text-green-400",
  meeting: "text-purple-600 dark:text-purple-400",
  note: "text-amber-600 dark:text-amber-400",
  linkedin: "text-sky-600 dark:text-sky-400",
};

const TYPES: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "call", label: "Calls" },
  { value: "email", label: "Emails" },
  { value: "meeting", label: "Meetings" },
  { value: "note", label: "Notes" },
  { value: "linkedin", label: "LinkedIn" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Period = "all" | "today" | "week" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

function periodDateFrom(period: Period): string | null {
  if (period === "all") return null;
  const d = new Date(Date.now());
  if (period === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
}

export default function ActivitiesPage() {
  const { getToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [period, setPeriod] = useState<Period>("month");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const dateFrom = periodDateFrom(period);
    const qs = dateFrom ? `?dateFrom=${encodeURIComponent(dateFrom)}` : "";
    const res = await fetch(`${API_URL}/api/activities${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const json: { data: Activity[] } = await res.json();
      setActivities(json.data);
    }
    setLoading(false);
  }, [getToken, period]);

  useEffect(() => {
    load();
  }, [load, tick]);

  useEffect(() => {
    function onLogged() {
      setTick((n) => n + 1);
    }
    window.addEventListener("orbit:activity-logged", onLogged);
    return () => window.removeEventListener("orbit:activity-logged", onLogged);
  }, []);

  const filtered = activities.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (a.contactName ?? "").toLowerCase().includes(q) ||
        (a.subject ?? "").toLowerCase().includes(q) ||
        (a.body ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5 p-6 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Activity History
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All logged calls, emails, meetings and notes across contacts
          </p>
        </div>
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("orbit:quick-log"))
          }
          className={cn(
            buttonVariants({ size: "sm" }),
            "shrink-0 flex items-center gap-1.5",
          )}
        >
          <PenLine className="h-3.5 w-3.5" />
          Log activity
          <kbd className="ml-1 hidden rounded border border-primary/30 bg-primary/10 px-1 text-[10px] font-mono sm:inline">
            L
          </kbd>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by contact, subject, or note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                period === p.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/40",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === t.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center px-4">
          {activities.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              No activities match your filter
            </p>
          ) : (
            <>
              <ActivityIcon className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="font-medium text-sm">No activities logged yet</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Log calls, emails, meetings, and notes to build a complete
                  relationship history with every contact.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("orbit:quick-log"))
                  }
                  className={buttonVariants({ size: "sm" })}
                >
                  <PenLine className="mr-1.5 h-4 w-4" />
                  Log first activity
                </button>
                <Link
                  href="/dashboard/contacts"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Browse contacts
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors"
            >
              <span
                className={cn(
                  "shrink-0 mt-0.5",
                  TYPE_COLOR[act.type] ?? "text-muted-foreground",
                )}
              >
                {TYPE_ICON[act.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {act.contactId ? (
                    <Link
                      href={`/dashboard/contacts/${act.contactId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {act.contactName ?? "Contact"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {act.contactName ?? "Contact"}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {act.type}
                  </Badge>
                </div>
                {act.subject && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {act.subject}
                  </p>
                )}
                {act.body && !act.subject && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {act.body}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground mt-0.5">
                {relativeTime(act.occurredAt)}
              </span>
            </div>
          ))}
          {activities.length >= 100 && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              Showing most recent 100 activities
            </p>
          )}
        </div>
      )}
    </div>
  );
}
