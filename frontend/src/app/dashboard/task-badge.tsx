"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function TaskBadge() {
  const { getToken } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/tasks?overdue=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json: { total: number } = await res.json();
      setCount(json.total ?? 0);
    }
    load();
  }, [getToken]);

  if (count === 0) return null;
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
