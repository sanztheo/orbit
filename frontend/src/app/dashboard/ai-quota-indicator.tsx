"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Zap } from "lucide-react";

const AI_LIMIT = 50;
const WARN_AT = 40;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function AiQuotaIndicator() {
  const { getToken } = useAuth();
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch_() {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/workspace`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok || cancelled) return;
      const json: { data?: { aiActionsUsed?: number } } = await res.json();
      if (!cancelled) setUsed(json.data?.aiActionsUsed ?? 0);
    }
    fetch_();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (used === null || used < WARN_AT) return null;

  const remaining = AI_LIMIT - used;
  const isCritical = remaining <= 5;

  return (
    <Link
      href="/dashboard/settings"
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        isCritical
          ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
      }`}
    >
      <Zap className="h-3 w-3 shrink-0" />
      {remaining} AI action{remaining !== 1 ? "s" : ""} left
    </Link>
  );
}
