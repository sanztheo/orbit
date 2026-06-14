"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function FollowUpBadge({ mobile }: { mobile?: boolean } = {}) {
  const { getToken } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(
        `${apiUrl}/api/contacts?overdueFollowUp=1&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const json: { total: number } = await res.json();
      setCount(json.total ?? 0);
    }
    load();
  }, [getToken]);

  if (count === 0) return null;
  return (
    <span
      className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ${mobile ? "absolute -top-1.5 -right-1.5" : "ml-auto"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
