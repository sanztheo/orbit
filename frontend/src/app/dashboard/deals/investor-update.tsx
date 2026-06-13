"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { parseAiError } from "@/lib/ai-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function InvestorUpdate() {
  const { getToken } = useAuth();
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/investor-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setError(await parseAiError(res));
        return;
      }
      const json: { draft: string } = await res.json();
      setDraft(json.draft);
      setOpen(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Investor update</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-drafted from your pipeline + backlog
          </p>
        </div>
        <div className="flex items-center gap-2">
          {draft && (
            <>
              <button
                onClick={() => setOpen((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {open ? "Collapse" : "Expand"}
              </button>
              <button
                onClick={copy}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "disabled:opacity-50",
            )}
          >
            {loading ? "Drafting…" : draft ? "Refresh" : "📧 Draft update"}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {draft && open && (
        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {draft}
          </pre>
        </div>
      )}
    </div>
  );
}
