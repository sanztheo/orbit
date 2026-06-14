"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TYPE_COLOR: Record<string, string> = {
  email: "bg-blue-400 dark:bg-blue-500",
  call: "bg-green-400 dark:bg-green-500",
  meeting: "bg-purple-400 dark:bg-purple-500",
  note: "bg-amber-400 dark:bg-amber-500",
  linkedin: "bg-sky-400 dark:bg-sky-500",
};

interface ActivityRow {
  type: string;
  occurredAt: string;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface WeekBucket {
  monday: Date;
  label: string;
  total: number;
  byType: Record<string, number>;
}

function buildBuckets(rows: ActivityRow[], weeks: number): WeekBucket[] {
  const now = new Date();
  const currentMonday = getMonday(now);
  const buckets: WeekBucket[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - i * 7);
    buckets.push({ monday, label: weekLabel(monday), total: 0, byType: {} });
  }

  for (const row of rows) {
    const date = new Date(row.occurredAt);
    const monday = getMonday(date);
    const bucket = buckets.find((b) => b.monday.getTime() === monday.getTime());
    if (!bucket) continue;
    bucket.total++;
    bucket.byType[row.type] = (bucket.byType[row.type] ?? 0) + 1;
  }

  return buckets;
}

export function ActivityTrendChart() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    if (!open || rows !== null) return;
    async function load() {
      const token = await getToken();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 84);
      dateFrom.setHours(0, 0, 0, 0);
      const qs = `?dateFrom=${encodeURIComponent(dateFrom.toISOString())}`;
      const res = await fetch(`${API_URL}/api/activities${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json: { data: ActivityRow[] } = await res.json();
        setRows(json.data);
      }
    }
    load();
  }, [open, rows, getToken]);

  const buckets = rows ? buildBuckets(rows, 12) : [];
  const maxCount = Math.max(...buckets.map((b) => b.total), 1);
  const totalThisMonth = buckets.slice(-4).reduce((s, b) => s + b.total, 0);
  const totalPrevMonth = buckets.slice(0, 4).reduce((s, b) => s + b.total, 0);
  const trend =
    totalPrevMonth === 0
      ? null
      : Math.round(((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100);

  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{open ? "▾" : "▸"}</span>
        Outreach trend · 12 weeks
        {rows !== null && trend !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              trend >= 0
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}% vs prior
          </span>
        )}
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {rows === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="flex items-end gap-1 h-24">
                {buckets.map((b) => {
                  const height =
                    b.total > 0
                      ? Math.max(4, Math.round((b.total / maxCount) * 96))
                      : 2;
                  const types = Object.entries(b.byType);
                  return (
                    <div
                      key={b.monday.toISOString()}
                      className="flex flex-1 flex-col items-center gap-0.5 group relative"
                      title={`${b.label}: ${b.total} activit${b.total !== 1 ? "ies" : "y"}`}
                    >
                      <div
                        className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
                        style={{ height: `${height}px` }}
                      >
                        {types.length === 0 ? (
                          <div className="w-full h-full bg-muted" />
                        ) : (
                          types.map(([type, count]) => {
                            const pct = Math.round((count / b.total) * 100);
                            return (
                              <div
                                key={type}
                                className={`w-full ${TYPE_COLOR[type] ?? "bg-muted"}`}
                                style={{ height: `${pct}%` }}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-1">
                {buckets.map((b, i) => (
                  <div
                    key={b.monday.toISOString()}
                    className="flex-1 text-center"
                  >
                    {(i === 0 || i === 4 || i === 8 || i === 11) && (
                      <span className="text-[9px] text-muted-foreground">
                        {b.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(TYPE_COLOR).map(([type, color]) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-sm ${color}`}
                    />
                    {type}
                  </span>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                {rows.length} activities in last 12 weeks ·{" "}
                {Math.round(rows.length / 12)} avg/week
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
