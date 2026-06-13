"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PipelineVelocity } from "./pipeline-velocity";
import { InvestorUpdate } from "./investor-update";

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
  expectedCloseAt: string | null;
  notes: string | null;
  contactId: string | null;
  contactName: string | null;
  contactCompany: string | null;
  contactLastContactedAt: string | null;
  contactNextFollowUpAt: string | null;
  nextAction: string | null;
  fundName: string | null;
  checkSize: number | null;
  portfolioUrl: string | null;
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
  if (key === "closed_won")
    return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
  if (key === "closed_lost")
    return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
  return "bg-card border-border";
}

export default function DealsPage() {
  const { getToken } = useAuth();
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePipeline, setActivePipeline] = useState<PipelineType>("sales");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const dragDealRef = useRef<Deal | null>(null);
  const [wonDeal, setWonDeal] = useState<Deal | null>(null);
  const [winReason, setWinReason] = useState("");
  const [winSubmitting, setWinSubmitting] = useState(false);
  const [editingNextAction, setEditingNextAction] = useState<string | null>(
    null,
  );
  const [nextActionDraft, setNextActionDraft] = useState("");
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [valueDraft, setValueDraft] = useState("");
  const [editingProbability, setEditingProbability] = useState<string | null>(
    null,
  );
  const [probabilityDraft, setProbabilityDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    // Prompt for next action on active stage moves (not terminal stages)
    if (newStage !== "closed_won" && newStage !== "closed_lost") {
      setNextActionDraft(deal.nextAction ?? "");
      setEditingNextAction(deal.id);
    }
    try {
      await apiClient.patch(
        `/api/deals/${deal.id}`,
        { stage: newStage },
        token,
      );
      if (newStage === "closed_won") {
        setWonDeal(deal);
        setWinReason("");
      }
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

  async function submitWinReason() {
    if (!wonDeal?.contactId || !winReason.trim()) {
      setWonDeal(null);
      return;
    }
    setWinSubmitting(true);
    try {
      const token = await getToken();
      if (token) {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        await fetch(`${apiUrl}/api/activities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contactId: wonDeal.contactId,
            type: "note",
            subject: `🏆 Won: ${wonDeal.title}`,
            body: winReason.trim(),
          }),
        });
      }
    } finally {
      setWinSubmitting(false);
      setWonDeal(null);
    }
  }

  async function saveNextAction(dealId: string, value: string) {
    setEditingNextAction(null);
    const trimmed = value.trim() || null;
    setAllDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, nextAction: trimmed } : d)),
    );
    const token = await getToken();
    if (token) {
      await apiClient.patch(
        `/api/deals/${dealId}`,
        { nextAction: trimmed },
        token,
      );
    }
  }

  async function saveValue(dealId: string, rawValue: string) {
    setEditingValue(null);
    const parsed = rawValue.trim()
      ? parseInt(rawValue.replace(/\D/g, ""), 10)
      : null;
    const val = isNaN(parsed ?? NaN) ? null : parsed;
    setAllDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, value: val } : d)),
    );
    const token = await getToken();
    if (token) {
      await apiClient.patch(`/api/deals/${dealId}`, { value: val }, token);
    }
  }

  async function saveProbability(dealId: string, raw: string) {
    setEditingProbability(null);
    const parsed = parseInt(raw.trim(), 10);
    const val = isNaN(parsed) ? null : Math.min(100, Math.max(0, parsed));
    setAllDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, probability: val } : d)),
    );
    const token = await getToken();
    if (token) {
      await apiClient.patch(
        `/api/deals/${dealId}`,
        { probability: val ?? 0 },
        token,
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

  const q = searchQuery.toLowerCase();
  const deals = allDeals.filter(
    (d) =>
      d.pipelineType === activePipeline &&
      (!q ||
        d.title.toLowerCase().includes(q) ||
        (d.contactName ?? "").toLowerCase().includes(q) ||
        (d.contactCompany ?? "").toLowerCase().includes(q)),
  );
  const labels = STAGE_LABELS[activePipeline];
  const byStage = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, deals.filter((d) => d.stage === s)]),
  ) as Record<DealStage, Deal[]>;
  const activeDeals = deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
  );
  const pipelineTotal = activeDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const pipelineWeighted = activeDeals.reduce(
    (s, d) => s + Math.round((d.value ?? 0) * ((d.probability ?? 0) / 100)),
    0,
  );

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

      {/* Pipeline value summary */}
      {pipelineTotal > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Pipeline:{" "}
            <span className="font-semibold text-foreground">
              ${pipelineTotal.toLocaleString()}
            </span>
          </span>
          {pipelineWeighted > 0 && (
            <span className="text-muted-foreground">
              Weighted:{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                ${pipelineWeighted.toLocaleString()}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Pipeline type tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {PIPELINE_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePipeline(key)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              activePipeline === key
                ? "bg-card shadow-sm text-foreground"
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

      {/* Deal search */}
      <div className="relative max-w-xs">
        <Input
          placeholder="Search deals…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-7 h-8 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {wonDeal && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                🏆 Deal won: {wonDeal.title}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                What closed it? (logged to contact timeline)
              </p>
              <input
                type="text"
                placeholder="e.g. pricing flexibility, demo convinced CEO, competitor dropped out…"
                value={winReason}
                onChange={(e) => setWinReason(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitWinReason()}
                className="mt-2 w-full rounded-lg border border-emerald-200 dark:border-emerald-800 bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                autoFocus
              />
            </div>
            <div className="flex gap-2 shrink-0 mt-6">
              <button
                onClick={submitWinReason}
                disabled={winSubmitting}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-emerald-700 dark:bg-emerald-800 hover:bg-emerald-800 dark:hover:bg-emerald-700 disabled:opacity-50",
                )}
              >
                {winSubmitting ? "Saving…" : "Log it"}
              </button>
              <button
                onClick={() => setWonDeal(null)}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {labels[key]}
                  </span>
                  {(() => {
                    const stageTotal = byStage[key].reduce(
                      (s, d) => s + (d.value ?? 0),
                      0,
                    );
                    return stageTotal > 0 ? (
                      <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        ${stageTotal.toLocaleString()}
                      </span>
                    ) : null;
                  })()}
                </div>
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
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/dashboard/deals/${deal.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium leading-snug hover:underline"
                        >
                          {deal.title}
                        </Link>
                        <Link
                          href={`/dashboard/deals/${deal.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Link>
                      </div>
                      {deal.contactName && (
                        <Link
                          href={`/dashboard/contacts/${deal.contactId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {deal.contactName}
                        </Link>
                      )}
                      {deal.contactCompany && (
                        <Link
                          href={`/dashboard/contacts?search=${encodeURIComponent(deal.contactCompany)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 block text-xs text-muted-foreground hover:text-blue-600 truncate"
                        >
                          {deal.contactCompany} →
                        </Link>
                      )}
                      {deal.fundName && (
                        <p className="mt-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 truncate">
                          🏦 {deal.fundName}
                          {deal.checkSize
                            ? ` · $${deal.checkSize.toLocaleString()}`
                            : ""}
                        </p>
                      )}
                      {deal.portfolioUrl && (
                        <a
                          href={deal.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 block text-xs text-blue-500 dark:text-blue-400 hover:underline truncate"
                        >
                          Portfolio →
                        </a>
                      )}
                      {activePipeline === "fundraising" &&
                        deal.contactLastContactedAt && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Last touch:{" "}
                            <span
                              className={
                                daysSince(deal.contactLastContactedAt) > 30
                                  ? "text-red-600 dark:text-red-400 font-medium"
                                  : ""
                              }
                            >
                              {daysSince(deal.contactLastContactedAt)}d ago
                            </span>
                          </p>
                        )}
                      {activePipeline === "fundraising" &&
                        deal.contactNextFollowUpAt && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Follow-up:{" "}
                            {new Date(
                              deal.contactNextFollowUpAt,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      {editingValue === deal.id ? (
                        <input
                          autoFocus
                          type="number"
                          value={valueDraft}
                          onChange={(e) => setValueDraft(e.target.value)}
                          onBlur={() => saveValue(deal.id, valueDraft)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveValue(deal.id, valueDraft);
                            if (e.key === "Escape") setEditingValue(null);
                          }}
                          placeholder="Value…"
                          className="mt-1 w-full rounded border border-primary/40 bg-card px-1.5 py-0.5 text-xs focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setValueDraft(
                              deal.value != null ? String(deal.value) : "",
                            );
                            setEditingValue(deal.id);
                          }}
                          className="mt-1 w-full text-left text-xs text-muted-foreground hover:text-foreground truncate"
                        >
                          {deal.value != null
                            ? `$${deal.value.toLocaleString()}`
                            : "+ value"}
                        </button>
                      )}
                      {editingProbability === deal.id ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={100}
                          value={probabilityDraft}
                          onChange={(e) => setProbabilityDraft(e.target.value)}
                          onBlur={() =>
                            saveProbability(deal.id, probabilityDraft)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveProbability(deal.id, probabilityDraft);
                            if (e.key === "Escape") setEditingProbability(null);
                          }}
                          placeholder="0–100"
                          className="mt-1 w-full rounded border border-primary/40 bg-card px-1.5 py-0.5 text-xs focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProbabilityDraft(
                              deal.probability != null
                                ? String(deal.probability)
                                : "",
                            );
                            setEditingProbability(deal.id);
                          }}
                          className="mt-1 w-full text-left text-xs text-muted-foreground hover:text-foreground"
                        >
                          {deal.probability != null
                            ? `${deal.probability}% prob`
                            : "+ probability"}
                        </button>
                      )}
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isStale
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {staleDays === 0
                          ? "Moved today"
                          : `${staleDays}d in stage${isStale ? " ⚠" : ""}`}
                      </p>
                      {deal.expectedCloseAt &&
                        (() => {
                          const daysUntil = Math.ceil(
                            (new Date(deal.expectedCloseAt).getTime() -
                              Date.now()) /
                              86_400_000,
                          );
                          const color =
                            daysUntil < 0
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : daysUntil <= 3
                                ? "text-orange-600 dark:text-orange-400 font-medium"
                                : "text-amber-700 dark:text-amber-300";
                          const label =
                            daysUntil < 0
                              ? `Close overdue ${Math.abs(daysUntil)}d`
                              : daysUntil === 0
                                ? "Close today!"
                                : daysUntil <= 3
                                  ? `Close in ${daysUntil}d`
                                  : `Close by ${new Date(deal.expectedCloseAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                          return (
                            <p className={`mt-0.5 text-xs ${color}`}>{label}</p>
                          );
                        })()}
                      {deal.notes && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {deal.notes}
                        </p>
                      )}
                      {editingNextAction === deal.id ? (
                        <input
                          autoFocus
                          value={nextActionDraft}
                          onChange={(e) => setNextActionDraft(e.target.value)}
                          onBlur={() =>
                            saveNextAction(deal.id, nextActionDraft)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveNextAction(deal.id, nextActionDraft);
                            if (e.key === "Escape") setEditingNextAction(null);
                          }}
                          placeholder="Next step…"
                          className="mt-1 w-full rounded border border-primary/40 bg-card px-1.5 py-0.5 text-xs focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNextActionDraft(deal.nextAction ?? "");
                            setEditingNextAction(deal.id);
                          }}
                          className="mt-1 w-full text-left text-xs text-muted-foreground hover:text-foreground truncate"
                        >
                          {deal.nextAction
                            ? `→ ${deal.nextAction}`
                            : "+ next step"}
                        </button>
                      )}
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

      <InvestorUpdate />
      <PipelineVelocity />
    </div>
  );
}
