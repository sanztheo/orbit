"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseAiError } from "@/lib/ai-error";

interface Props {
  contactId: string;
  contactName: string;
}

export function FollowUpDraft({ contactId, contactName }: Props) {
  const { getToken } = useAuth();
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/ai/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        setError(await parseAiError(res));
        return;
      }
      const json: { draft: string } = await res.json();
      setDraft(json.draft);
    } catch {
      setError("Network error — is the backend running?");
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
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">AI follow-up draft</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Claude reads conversation history → drafts a contextual email to{" "}
            {contactName}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(buttonVariants({ size: "sm" }), "disabled:opacity-50")}
        >
          {loading ? "Drafting…" : draft ? "Re-draft" : "✦ Draft follow-up"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {draft && (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={copy}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "self-end",
            )}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
