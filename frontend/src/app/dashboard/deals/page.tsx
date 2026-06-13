"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

type DealStage =
  | "prospect"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: DealStage;
  stageChangedAt: string;
  probability: number | null;
  notes: string | null;
}

const STAGES: { key: DealStage; label: string }[] = [
  { key: "prospect", label: "Prospect" },
  { key: "contacted", label: "Contacted" },
  { key: "meeting", label: "Meeting" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closed_won", label: "Won ✓" },
  { key: "closed_lost", label: "Lost ✗" },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function stageColor(key: DealStage): string {
  if (key === "closed_won") return "bg-green-50 border-green-200";
  if (key === "closed_lost") return "bg-red-50 border-red-200";
  return "bg-white border-border";
}

export default function DealsPage() {
  const { getToken } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function fetchDeals() {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await apiClient.get<{ data: Deal[] }>("/api/deals", token);
      setDeals(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function moveStage(deal: Deal, direction: 1 | -1) {
    const idx = STAGE_ORDER.indexOf(deal.stage);
    const next = STAGE_ORDER[idx + direction];
    if (!next) return;
    const token = await getToken();
    if (!token) return;
    setMovingId(deal.id);
    try {
      await apiClient.patch(`/api/deals/${deal.id}`, { stage: next }, token);
      setDeals((prev) =>
        prev.map((d) =>
          d.id === deal.id
            ? { ...d, stage: next, stageChangedAt: new Date().toISOString() }
            : d,
        ),
      );
    } finally {
      setMovingId(null);
    }
  }

  const byStage = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, deals.filter((d) => d.stage === s)]),
  ) as Record<DealStage, Deal[]>;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading pipeline…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deal Pipeline</h1>
        <Link
          href="/dashboard/deals/new"
          className={buttonVariants({ size: "sm" })}
        >
          + New deal
        </Link>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No deals yet</p>
          <Link
            href="/dashboard/deals/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Add your first deal
          </Link>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(({ key, label }) => (
            <div key={key} className="flex w-56 shrink-0 flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {byStage[key].length}
                </Badge>
              </div>

              {byStage[key].length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Empty
                </div>
              ) : (
                byStage[key].map((deal) => {
                  const staleDays = daysSince(deal.stageChangedAt);
                  const isStale = staleDays >= 30;
                  return (
                    <div
                      key={deal.id}
                      className={`rounded-lg border p-3 shadow-xs ${stageColor(key)}`}
                    >
                      <p className="text-sm font-medium leading-snug">
                        {deal.title}
                      </p>
                      {deal.value != null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ${deal.value.toLocaleString()}
                        </p>
                      )}
                      <p
                        className={`mt-1 text-xs ${isStale ? "font-medium text-red-600" : "text-muted-foreground"}`}
                      >
                        {staleDays === 0
                          ? "Moved today"
                          : `${staleDays}d in stage${isStale ? " ⚠" : ""}`}
                      </p>
                      <div className="mt-2 flex gap-1">
                        {STAGE_ORDER.indexOf(key) > 0 && (
                          <button
                            onClick={() => moveStage(deal, -1)}
                            disabled={movingId === deal.id}
                            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            ←
                          </button>
                        )}
                        {STAGE_ORDER.indexOf(key) < STAGE_ORDER.length - 1 && (
                          <button
                            onClick={() => moveStage(deal, 1)}
                            disabled={movingId === deal.id}
                            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
