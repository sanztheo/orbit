import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TaskPriority = "p0" | "p1" | "p2" | "p3";

interface ReportRow {
  id: string;
  title: string;
  priority: TaskPriority;
  status: string;
  contactId: string | null;
  contactName: string | null;
  dealValueSum: number;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
};

const PRIORITY_VARIANT: Record<
  TaskPriority,
  "default" | "secondary" | "outline" | "destructive"
> = {
  p0: "destructive",
  p1: "default",
  p2: "secondary",
  p3: "outline",
};

export default async function FeatureReportPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const res = await fetch(`${apiUrl}/api/tasks/feature-report`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  let rows: ReportRow[] = [];
  if (res.ok) {
    const json: { data: ReportRow[] } = await res.json();
    rows = json.data;
  }

  const totalValue = rows.reduce((s, r) => s + (r.dealValueSum ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Feature Request Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Backlog items ranked by deal value behind each request.{" "}
            {rows.length} item{rows.length !== 1 ? "s" : ""} · $
            {totalValue.toLocaleString()} total pipeline at stake
          </p>
        </div>
        <Link
          href="/dashboard/tasks"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Back to backlog
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
          <p className="text-muted-foreground">
            No backlog items linked to contacts yet.
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            When you create a task with a linked contact, it appears here ranked
            by the contact&apos;s deal value — showing you what to build next.
          </p>
          <Link
            href="/dashboard/tasks/new"
            className={buttonVariants({ variant: "default" })}
          >
            + New task
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <Link
              key={row.id}
              href={`/dashboard/tasks`}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <span className="shrink-0 w-6 text-center text-sm font-bold text-muted-foreground">
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{row.title}</p>
                {row.contactName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested by{" "}
                    {row.contactId ? (
                      <span className="text-foreground">{row.contactName}</span>
                    ) : (
                      row.contactName
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={PRIORITY_VARIANT[row.priority]}>
                  {PRIORITY_LABELS[row.priority]}
                </Badge>
                {row.dealValueSum > 0 ? (
                  <span className="text-sm font-semibold text-emerald-700">
                    ${row.dealValueSum.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">no deal</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Deal value = sum of all deals linked to the requesting contact. Items
        with $0 have no deals yet — still worth building.
      </p>
    </div>
  );
}
