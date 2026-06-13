"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface SearchContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: string;
}

interface SearchDeal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
}

interface SearchResults {
  contacts: SearchContact[];
  deals: SearchDeal[];
}

export function GlobalSearch() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ("");
      setResults(null);
      setActiveIdx(0);
    }
  }, [open]);

  const search = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_URL}/api/search?q=${encodeURIComponent(query)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  function handleInput(value: string) {
    setQ(value);
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  }

  const items: { href: string; label: string; sub: string }[] = [
    ...(results?.contacts ?? []).map((c) => ({
      href: `/dashboard/contacts/${c.id}`,
      label: c.name,
      sub: [c.company, c.email].filter(Boolean).join(" · "),
    })),
    ...(results?.deals ?? []).map((d) => ({
      href: `/dashboard/deals`,
      label: d.title,
      sub: `${d.stage.replace(/_/g, " ")}${d.value ? ` · $${d.value.toLocaleString()}` : ""}`,
    })),
  ];

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[activeIdx]) {
      navigate(items[activeIdx].href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-muted-foreground">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search contacts, deals…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <span className="text-xs text-muted-foreground">…</span>}
          <kbd className="rounded border border-border px-1 text-xs text-muted-foreground">
            Esc
          </kbd>
        </div>

        {items.length > 0 && (
          <ul className="max-h-72 overflow-y-auto py-1">
            {results && results.contacts.length > 0 && (
              <li className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contacts
              </li>
            )}
            {(results?.contacts ?? []).map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`/dashboard/contacts/${c.id}`)}
                  className={`w-full text-left px-4 py-2 text-sm flex flex-col transition-colors ${activeIdx === i ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <span className="font-medium">{c.name}</span>
                  {(c.company ?? c.email) && (
                    <span className="text-xs text-muted-foreground">
                      {[c.company, c.email].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {results && results.deals.length > 0 && (
              <li className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Deals
              </li>
            )}
            {(results?.deals ?? []).map((d, i) => {
              const idx = (results?.contacts.length ?? 0) + i;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => navigate("/dashboard/deals")}
                    className={`w-full text-left px-4 py-2 text-sm flex flex-col transition-colors ${activeIdx === idx ? "bg-muted" : "hover:bg-muted/50"}`}
                  >
                    <span className="font-medium">{d.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {d.stage.replace(/_/g, " ")}
                      {d.value ? ` · $${d.value.toLocaleString()}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {q.length >= 2 && !loading && results && items.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No results for &quot;{q}&quot;
          </p>
        )}

        {q.length < 2 && (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Type 2+ characters to search
          </p>
        )}
      </div>
    </div>
  );
}
