"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { parseAiError } from "@/lib/ai-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SECTION_KEYS: Record<string, string> = {
  ANGLE: "🎯",
  HOOK: "🪝",
  DRAFT: "✉️",
};

function parseBrief(
  text: string,
): { key: string; icon: string; body: string }[] {
  const sections: { key: string; icon: string; body: string }[] = [];
  for (const [key, icon] of Object.entries(SECTION_KEYS)) {
    const match = text.match(
      new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, "s"),
    );
    if (match) sections.push({ key, icon, body: match[1].trim() });
  }
  return sections;
}

interface Props {
  contactId: string;
}

export function ColdStart({ contactId }: Props) {
  const { getToken } = useAuth();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/cold-start`, {
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
      setOpen(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const sections = brief ? parseBrief(brief) : [];

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Cold start</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI angle + draft for first outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          {brief && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {open ? "Collapse" : "Expand"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "disabled:opacity-50",
            )}
          >
            {loading ? "Thinking…" : brief ? "Refresh" : "📋 First touch"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {brief && open && (
        <div className="flex flex-col gap-3">
          {sections.length > 0 ? (
            sections.map((s) => (
              <div key={s.key} className="flex gap-2.5">
                <span className="text-base leading-tight shrink-0">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                    {s.key}
                  </p>
                  <p className="text-sm">{s.body}</p>
                </div>
              </div>
            ))
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-sans">{brief}</pre>
          )}
        </div>
      )}
    </div>
  );
}
