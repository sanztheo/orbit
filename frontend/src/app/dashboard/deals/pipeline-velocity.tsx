"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface StageRow {
  stage: string;
  pipelineType: string;
  count: number;
  avgDaysInStage: number;
  totalValue: number;
}

interface VelocityData {
  stages: StageRow[];
  winRate: number | null;
  totalWon: number;
  totalLost: number;
}

const ACTIVE_STAGES = [
  "prospect",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
];

const STAGE_LABEL: Record<string, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  meeting: "Meeting",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
};

export function PipelineVelocity() {
  const { getToken } = useAuth();
  const [data, setData] = useState<VelocityData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/stats/pipeline-velocity`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
    }
    load();
  }, [open, getToken]);

  const activeRows = (data?.stages ?? []).filter((r) =>
    ACTIVE_STAGES.includes(r.stage),
  );
  const maxCount = Math.max(...activeRows.map((r) => r.count), 1);

  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{open ? "▾" : "▸"}</span>
        Pipeline velocity
        {data && data.winRate !== null && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {data.winRate}% win rate
          </span>
        )}
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          {!data ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : activeRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active deals to measure.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {ACTIVE_STAGES.map((stage) => {
                  const row = activeRows.find((r) => r.stage === stage);
                  const count = row?.count ?? 0;
                  const avgDays = row?.avgDaysInStage ?? 0;
                  const barWidth =
                    count > 0 ? Math.max(4, (count / maxCount) * 100) : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">
                        {STAGE_LABEL[stage]}
                      </span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-right text-xs font-medium">
                          {count}
                        </span>
                      </div>
                      {count > 0 && (
                        <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                          avg {avgDays}d
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xl font-bold text-emerald-600">
                    {data.totalWon}
                  </p>
                  <p className="text-xs text-muted-foreground">Won</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xl font-bold text-red-500">
                    {data.totalLost}
                  </p>
                  <p className="text-xs text-muted-foreground">Lost</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xl font-bold">
                    {data.winRate !== null ? `${data.winRate}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Win rate</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
