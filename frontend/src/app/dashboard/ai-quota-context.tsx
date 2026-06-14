"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

interface AIQuota {
  used: number;
  limit: number;
  remaining: number;
}

const AIQuotaCtx = createContext<AIQuota | null>(null);

const AI_LIMIT = 50;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function AIQuotaProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [quota, setQuota] = useState<AIQuota | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/workspace`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok || cancelled) return;
      const json: { data?: { aiActionsUsed?: number } } = await res.json();
      const used = json.data?.aiActionsUsed ?? 0;
      if (!cancelled)
        setQuota({ used, limit: AI_LIMIT, remaining: AI_LIMIT - used });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return <AIQuotaCtx.Provider value={quota}>{children}</AIQuotaCtx.Provider>;
}

export function useAIQuota(): AIQuota | null {
  return useContext(AIQuotaCtx);
}

export function AIQuotaLine() {
  const quota = useAIQuota();
  if (!quota || quota.remaining > 10) return null;
  return (
    <p
      className={`text-xs mt-1 ${quota.remaining <= 3 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
    >
      {quota.remaining} AI action{quota.remaining !== 1 ? "s" : ""} left this
      month
    </p>
  );
}
