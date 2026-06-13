"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Zap, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SECTION_LABELS: Record<string, string> = {
  "FOCUS TODAY": "🎯",
  "DEALS AT RISK": "🔥",
  "REACH OUT TO": "📬",
  "QUICK WINS": "⚡",
};

function parseBrief(
  text: string,
): { label: string; icon: string; body: string }[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const sections: { label: string; icon: string; body: string }[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const label = line.slice(0, colonIdx).trim().toUpperCase();
      const body = line.slice(colonIdx + 1).trim();
      const icon = SECTION_LABELS[label] ?? "•";
      if (body) sections.push({ label, icon, body });
    }
  }
  return sections;
}

export function MorningBrief() {
  const { getToken } = useAuth();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/daily-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setError("Failed to generate brief");
        return;
      }
      const json: { brief: string } = await res.json();
      setBrief(json.brief);
      setOpen(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const sections = brief ? parseBrief(brief) : [];

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Today&apos;s brief</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated daily priority list
          </p>
        </div>
        <div className="flex items-center gap-2">
          {brief && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              {open ? "Collapse" : "Expand"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {loading ? "Generating…" : brief ? "Refresh" : "Brief me"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {brief && open && (
        <div className="mt-4 flex flex-col gap-3">
          {sections.length > 0 ? (
            sections.map((s) => (
              <div key={s.label} className="flex gap-2.5">
                <span className="text-base leading-tight shrink-0">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                    {s.label}
                  </p>
                  <p className="text-sm">{s.body}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {brief}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
