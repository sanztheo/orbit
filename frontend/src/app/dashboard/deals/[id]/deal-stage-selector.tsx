"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_ORDER = [
  "prospect",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

type Stage = (typeof STAGE_ORDER)[number];

const STAGE_LABELS: Record<string, Record<Stage, string>> = {
  sales: {
    prospect: "Prospect",
    contacted: "Contacted",
    meeting: "Meeting",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Won",
    closed_lost: "Lost",
  },
  fundraising: {
    prospect: "Identified",
    contacted: "Intro Sent",
    meeting: "First Meeting",
    proposal: "Term Sheet",
    negotiation: "Negotiation",
    closed_won: "Closed",
    closed_lost: "Passed",
  },
  partnership: {
    prospect: "Prospect",
    contacted: "Reached Out",
    meeting: "Discussion",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Signed",
    closed_lost: "Declined",
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  dealId: string;
  currentStage: string;
  pipelineType: string;
}

export function DealStageSelector({
  dealId,
  currentStage,
  pipelineType,
}: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [moving, setMoving] = useState<string | null>(null);

  const labels = STAGE_LABELS[pipelineType] ?? STAGE_LABELS.sales;
  const currentIdx = STAGE_ORDER.indexOf(currentStage as Stage);

  async function moveTo(stage: Stage) {
    if (stage === currentStage) return;
    setMoving(stage);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ stage }),
      });
      router.refresh();
    } finally {
      setMoving(null);
    }
  }

  const mainStages = STAGE_ORDER.filter(
    (s) => s !== "closed_won" && s !== "closed_lost",
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Progress stages */}
      <div className="flex items-center gap-1 flex-wrap">
        {mainStages.map((stage, i) => {
          const stageIdx = STAGE_ORDER.indexOf(stage);
          const isPast =
            stageIdx < currentIdx &&
            currentStage !== "closed_won" &&
            currentStage !== "closed_lost";
          const isCurrent = stage === currentStage;
          const isLoading = moving === stage;
          return (
            <div key={stage} className="flex items-center gap-1">
              <button
                onClick={() => moveTo(stage)}
                disabled={moving !== null}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                  isCurrent
                    ? "bg-foreground text-background"
                    : isPast
                      ? "bg-muted text-muted-foreground line-through opacity-60 hover:opacity-80"
                      : "border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  labels[stage]
                )}
              </button>
              {i < mainStages.length - 1 && (
                <span className="text-muted-foreground/40 text-xs">›</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal stage buttons */}
      {currentStage !== "closed_won" && currentStage !== "closed_lost" && (
        <div className="flex gap-2">
          <button
            onClick={() => moveTo("closed_won")}
            disabled={moving !== null}
            className="flex-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 disabled:opacity-50 transition-colors"
          >
            {moving === "closed_won" ? (
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
            ) : null}
            {labels.closed_won} ✓
          </button>
          <button
            onClick={() => moveTo("closed_lost")}
            disabled={moving !== null}
            className="flex-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
          >
            {moving === "closed_lost" ? (
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
            ) : null}
            {labels.closed_lost} ✗
          </button>
        </div>
      )}

      {(currentStage === "closed_won" || currentStage === "closed_lost") && (
        <button
          onClick={() => moveTo("negotiation")}
          disabled={moving !== null}
          className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Reopen deal
        </button>
      )}
    </div>
  );
}
