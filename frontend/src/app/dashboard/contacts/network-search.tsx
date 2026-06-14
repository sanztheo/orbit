"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseAiError } from "@/lib/ai-error";
import { Sparkles, ChevronRight, X, Loader2 } from "lucide-react";
import { AIQuotaLine } from "@/app/dashboard/ai-quota-context";

interface Match {
  id: string;
  name: string;
  company: string | null;
  type: string;
  email: string | null;
  reason: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const EXAMPLES = [
  "who can intro me to Series A investors",
  "who works in healthcare or biotech",
  "who could be an early customer for a B2B SaaS",
];

export function NetworkSearch() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setMatches(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/network-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!res.ok) {
        setError(await parseAiError(res));
        return;
      }
      const json: { matches: Match[] } = await res.json();
      setMatches(json.matches);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setQuery("");
    setMatches(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground",
        )}
      >
        <Sparkles className="h-3 w-3" />
        Who do I know who…
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Network search</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ask anything about your contacts
          </p>
          <AIQuotaLine />
        </div>
        <button
          onClick={close}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex gap-2"
      >
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="who can intro me to investors…"
          className="flex-1 text-sm"
        />
        <Button type="submit" size="sm" disabled={loading || !query.trim()}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>

      {!matches && !loading && !error && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                search(ex);
              }}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {matches !== null && (
        <div className="flex flex-col gap-1">
          {matches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No strong matches found — try rephrasing.
            </p>
          ) : (
            matches.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/contacts/${m.id}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize shrink-0"
                    >
                      {m.type}
                    </Badge>
                  </div>
                  {m.company && (
                    <p className="text-xs text-muted-foreground truncate">
                      {m.company}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                    {m.reason}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
