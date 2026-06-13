"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const TYPES = ["lead", "customer", "investor", "advisor", "partner"] as const;

export function ContactFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/dashboard/contacts?${next.toString()}`);
    },
    [params, router],
  );

  return (
    <div className="flex items-center gap-2">
      <input
        type="search"
        placeholder="Search name, email, company…"
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
    </div>
  );
}
