"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitMerge, ChevronRight, X, Trash2 } from "lucide-react";

interface ContactSummary {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: string;
  lastContactedAt: string | null;
}

interface Pair {
  a: ContactSummary;
  b: ContactSummary;
  reason: "email" | "name";
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function DuplicateFinder() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  async function scan() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/contacts/duplicates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json: { data: Pair[] } = await res.json();
        setPairs(json.data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteContact(id: string, pairKey: string) {
    setDeleting(id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/contacts/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setDismissed((prev) => new Set([...prev, pairKey]));
      }
    } finally {
      setDeleting(null);
    }
  }

  function dismiss(key: string) {
    setDismissed((prev) => new Set([...prev, key]));
  }

  function toggle() {
    if (!open) {
      setOpen(true);
      scan();
    } else {
      setOpen(false);
      setPairs(null);
      setDismissed(new Set());
    }
  }

  const visiblePairs = (pairs ?? []).filter(
    (p) => !dismissed.has(`${p.a.id}-${p.b.id}`),
  );

  if (!open) {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        <GitMerge className="h-3 w-3" />
        Find duplicates
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Duplicate contacts</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Same email or identical name
          </p>
        </div>
        <button
          onClick={toggle}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning…
        </div>
      )}

      {!loading && pairs !== null && visiblePairs.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 text-center">
          No duplicates found.
        </p>
      )}

      {!loading && visiblePairs.length > 0 && (
        <div className="flex flex-col gap-3">
          {visiblePairs.map((p) => {
            const key = `${p.a.id}-${p.b.id}`;
            return (
              <div
                key={key}
                className="rounded-lg border border-border p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                  >
                    {p.reason === "email" ? "Same email" : "Same name"}
                  </Badge>
                  <button
                    onClick={() => dismiss(key)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Not a duplicate"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([p.a, p.b] as ContactSummary[]).map((contact) => {
                    const days = daysSince(contact.lastContactedAt);
                    return (
                      <div
                        key={contact.id}
                        className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5 bg-background"
                      >
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="flex items-center gap-1 text-sm font-medium hover:underline truncate"
                        >
                          {contact.name}
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        </Link>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.company}
                          </p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {days === null
                            ? "Never contacted"
                            : days === 0
                              ? "Contacted today"
                              : `${days}d ago`}
                        </p>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs mt-1"
                          disabled={deleting === contact.id}
                          onClick={() => deleteContact(contact.id, key)}
                        >
                          {deleting === contact.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Delete
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
