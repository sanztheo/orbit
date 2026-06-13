"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { parseAiError } from "@/lib/ai-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function MeetingBrief({ contactId }: { contactId: string }) {
  const { getToken } = useAuth();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/meeting-brief`, {
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
      const json: { brief: string } = await res.json();
      setBrief(json.brief);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Pre-meeting brief</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated context card before a call
          </p>
        </div>
        {!brief && (
          <button
            onClick={generate}
            disabled={loading}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "disabled:opacity-50",
            )}
          >
            {loading ? "Generating…" : "⚡ Brief me"}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {brief && (
        <div className="flex flex-col gap-0.5">
          {brief.split("\n").map((line, i) => {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0 && colonIdx < 20) {
              const label = line.slice(0, colonIdx);
              const value = line.slice(colonIdx + 1).trim();
              return (
                <div key={i} className="text-sm">
                  <span className="font-semibold text-foreground">
                    {label}:{" "}
                  </span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
              );
            }
            return line.trim() ? (
              <p key={i} className="text-sm text-muted-foreground">
                {line}
              </p>
            ) : null;
          })}
          <button
            onClick={() => {
              setBrief(null);
            }}
            className="mt-2 self-start text-xs text-muted-foreground hover:text-foreground"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
