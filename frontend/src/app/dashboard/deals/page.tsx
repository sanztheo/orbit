"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type DealStage =
  | "prospect"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

type PipelineType = "sales" | "fundraising" | "partnership";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: DealStage;
  pipelineType: PipelineType;
  stageChangedAt: string;
  probability: number | null;
  notes: string | null;
}

const STAGE_ORDER: DealStage[] = [
  "prospect",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

const STAGE_LABELS: Record<PipelineType, Record<DealStage, string>> = {
  sales: {
    prospect: "Prospect",
    contacted: "Contacted",
    meeting: "Meeting",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Won ✓",
    closed_lost: "Lost ✗",
  },
  fundraising: {
    prospect: "Identified",
    contacted: "Intro Sent",
    meeting: "First Meeting",
    proposal: "Term Sheet",
    negotiation: "Due Diligence",
    closed_won: "Closed ✓",
    closed_lost: "Passed ✗",
  },
  partnership: {
    prospect: "Prospect",
    contacted: "Reached Out",
    meeting: "Discussion",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Signed ✓",
    closed_lost: "Declined ✗",
  },
};

const PIPELINE_TABS: { key: PipelineType; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "fundraising", label: "Fundraising" },
  { key: "partnership", label: "Partnerships" },
];

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
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePipeline, setActivePipeline] = useState<PipelineType>("sales");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const dragDealRef = useRef<Deal | null>(null);

  async function fetchDeals() {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await apiClient.get<{ data: Deal[] }>("/api/deals", token);
      setAllDeals(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeals();
  }, []);

  async function moveDealToStage(deal: Deal, newStage: DealStage) {
    if (deal.stage === newStage) return;
    const token = await getToken();
    if (!token) return;
    // Optimistic update
    setAllDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id
          ? { ...d, stage: newStage, stageChangedAt: new Date().toISOString() }
          : d,
      ),
    );
    try {
      await apiClient.patch(
        `/api/deals/${deal.id}`,
        { stage: newStage },
        token,
      );
    } catch {
      // Rollback on error
      setAllDeals((prev) =>
        prev.map((d) =>
          d.id === deal.id
            ? { ...d, stage: deal.stage, stageChangedAt: deal.stageChangedAt }
            : d,
        ),
      );
    }
  }

  function handleDragStart(e: React.DragEvent, deal: Deal) {
    dragDealRef.current = deal;
    setDraggingId(deal.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deal.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
    dragDealRef.current = null;
  }

  function handleDragOver(e: React.DragEvent, stage: DealStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(e: React.DragEvent, stage: DealStage) {
    e.preventDefault();
    setDragOverStage(null);
    const deal = dragDealRef.current;
    if (deal) {
      await moveDealToStage(deal, stage);
    }
    setDraggingId(null);
    dragDealRef.current = null;
  }

  const deals = allDeals.filter((d) => d.pipelineType === activePipeline);
  const labels = STAGE_LABELS[activePipeline];
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
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deal Pipeline</h1>
        <Link
          href="/dashboard/deals/new"
          className={buttonVariants({ size: "sm" })}
        >
          + New deal
        </Link>
      </div>

      {/* Pipeline type tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {PIPELINE_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePipeline(key)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              activePipeline === key
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {
                allDeals.filter(
                  (d) =>
                    d.pipelineType === key &&
                    d.stage !== "closed_won" &&
                    d.stage !== "closed_lost",
                ).length
              }
            </span>
          </button>
        ))}
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No {activePipeline} deals yet</p>
          <Link
            href="/dashboard/deals/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Add your first deal
          </Link>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGE_ORDER.map((key) => (
            <div
              key={key}
              className={cn(
                "flex w-56 shrink-0 flex-col gap-2 rounded-lg p-1 transition-colors",
                dragOverStage === key && draggingId
                  ? "bg-primary/5 ring-2 ring-primary/20"
                  : "",
              )}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, key)}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {labels[key]}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {byStage[key].length}
                </Badge>
              </div>

              {/* Drop zone hint when empty column is targeted */}
              {byStage[key].length === 0 ? (
                <div
                  className={cn(
                    "rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground transition-colors",
                    dragOverStage === key && draggingId
                      ? "border-primary/40 bg-primary/5"
                      : "border-border",
                  )}
                >
                  {dragOverStage === key && draggingId ? "Drop here" : "Empty"}
                </div>
              ) : (
                byStage[key].map((deal) => {
                  const staleDays = daysSince(deal.stageChangedAt);
                  const isStale = staleDays >= 30;
                  const isDragging = draggingId === deal.id;
                  return (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "rounded-lg border p-3 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none",
                        stageColor(key),
                        isDragging ? "opacity-40 scale-95" : "hover:shadow-md",
                      )}
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
                        className={cn(
                          "mt-1 text-xs",
                          isStale
                            ? "font-medium text-red-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {staleDays === 0
                          ? "Moved today"
                          : `${staleDays}d in stage${isStale ? " ⚠" : ""}`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      )}

      {draggingId && (
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          Drop onto a column to move
        </p>
      )}
    </div>
  );
}
