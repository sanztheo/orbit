"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ExportAllButton() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/export/bundle`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "disabled:opacity-50 text-muted-foreground",
      )}
    >
      {loading ? "Exporting…" : "↓ Export all data"}
    </button>
  );
}
