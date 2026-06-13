"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Search } from "lucide-react";

const TYPES = ["lead", "customer", "investor", "advisor", "partner"] as const;

const SORTS = [
  { value: "name", label: "Name A–Z" },
  { value: "stale", label: "Least recently contacted" },
  { value: "recently_contacted", label: "Recently contacted" },
  { value: "newest", label: "Newest first" },
] as const;

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
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search name, email, company…"
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => update("search", e.target.value)}
          className="pl-8 h-9 w-64 text-sm"
        />
      </div>

      <Select
        defaultValue={params.get("type") ?? "all"}
        onValueChange={(v) => {
          if (v) update("type", v === "all" ? "" : v);
        }}
      >
        <SelectTrigger className="h-9 w-36 text-sm">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={params.get("sort") ?? "name"}
        onValueChange={(v) => {
          if (v) update("sort", v);
        }}
      >
        <SelectTrigger className="h-9 w-48 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        onClick={toggleStale}
        className={cn(
          "rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors",
          staleActive
            ? "border-amber-500 bg-amber-100 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300"
            : "border-border hover:border-amber-400 hover:text-amber-700",
        )}
      >
        ⚠ Stale 180d+
      </button>
    </div>
  );
}
