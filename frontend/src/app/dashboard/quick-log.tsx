"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Mail,
  Phone,
  Video,
  StickyNote,
  Link2,
  X,
} from "lucide-react";

type ActivityType = "call" | "email" | "meeting" | "note" | "linkedin";

interface ContactHit {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

const TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: "call", label: "Call", icon: <Phone className="h-3.5 w-3.5" /> },
  { value: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
  {
    value: "meeting",
    label: "Meeting",
    icon: <Video className="h-3.5 w-3.5" />,
  },
  {
    value: "note",
    label: "Note",
    icon: <StickyNote className="h-3.5 w-3.5" />,
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    icon: <Link2 className="h-3.5 w-3.5" />,
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function QuickLog() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ContactHit[]>([]);
  const [selected, setSelected] = useState<ContactHit | null>(null);
  const [type, setType] = useState<ActivityType>("call");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setHits([]);
    setSelected(null);
    setType("call");
    setSubject("");
    setSubmitting(false);
    setDone(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent).type === "orbit:quick-log") {
        setOpen(true);
      }
    }
    window.addEventListener("orbit:quick-log", handler);
    return () => window.removeEventListener("orbit:quick-log", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (selected || !query.trim()) {
        setHits([]);
        return;
      }
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/contacts?search=${encodeURIComponent(query)}&limit=5`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) return;
      const json: { data: ContactHit[] } = await res.json();
      setHits(json.data.slice(0, 5));
    }, 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, selected, getToken]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contactId: selected.id,
          type,
          subject: subject.trim() || undefined,
          occurredAt: new Date().toISOString(),
        }),
      });
      setDone(true);
      setTimeout(close, 800);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Log activity</span>
          <button
            onClick={close}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 p-4">
          {/* Contact picker */}
          <div className="relative">
            {selected ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{selected.name}</span>
                  {selected.company && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {selected.company}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="shrink-0 ml-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search contact…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
                {hits.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                    {hits.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelected(c);
                          setHits([]);
                        }}
                        className="flex w-full flex-col items-start px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                      >
                        <span className="font-medium">{c.name}</span>
                        {(c.company ?? c.email) && (
                          <span className="text-xs text-muted-foreground">
                            {c.company ?? c.email}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  type === t.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Subject */}
          <Input
            type="text"
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <Button
            type="submit"
            disabled={!selected || submitting || done}
            className="w-full"
          >
            {done ? (
              "Logged ✓"
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging…
              </>
            ) : (
              `Log ${type}`
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
