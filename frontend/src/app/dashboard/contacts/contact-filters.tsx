"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

const TYPES = ["lead", "customer", "investor", "advisor", "partner"] as const;

export function ContactFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const staleActive = params.get("stale") === "1";

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/dashboard/contacts?${next.toString()}`);
    },
    [params, router],
  );

  function toggleStale() {
    const next = new URLSearchParams(params.toString());
    if (staleActive) next.delete("stale");
    else next.set("stale", "1");
    router.push(`/dashboard/contacts?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="Search name, email, company, notes…"
        defaultValue={params.get("search") ?? ""}
        onChange={(e) => update("search", e.target.value)}
        className="w-64 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        defaultValue={params.get("type") ?? ""}
        onChange={(e) => update("type", e.target.value)}
        className="rounded-lg border border-border px-2 py-1.5 text-sm"
      >
        <option value="">All types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
      <button
        onClick={toggleStale}
        className={cn(
          "rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors",
          staleActive
            ? "border-amber-500 bg-amber-100 text-amber-900"
            : "border-border hover:border-amber-400 hover:text-amber-700",
        )}
      >
        ⚠ Stale 180d+
      </button>
    </div>
  );
}
