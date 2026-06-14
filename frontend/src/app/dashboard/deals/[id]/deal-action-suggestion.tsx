"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseAiError } from "@/lib/ai-error";
import { Sparkles, Copy, Check } from "lucide-react";
import { AIQuotaLine } from "@/app/dashboard/ai-quota-context";

interface Props {
  dealId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function DealActionSuggestion({ dealId }: Props) {
  const { getToken } = useAuth();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/suggest-deal-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dealId }),
      });
      if (!res.ok) {
        setError(await parseAiError(res));
        return;
      }
      const json: { action: string } = await res.json();
      setSuggestion(json.action);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!suggestion) return;
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">AI next action</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            One specific action to move this deal forward
          </p>
          <AIQuotaLine />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "disabled:opacity-50",
          )}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {loading ? "Thinking…" : suggestion ? "Refresh" : "Suggest action"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {suggestion && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border px-3 py-2.5">
          <p className="flex-1 text-sm leading-relaxed">{suggestion}</p>
          <button
            onClick={copy}
            className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy suggestion"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
