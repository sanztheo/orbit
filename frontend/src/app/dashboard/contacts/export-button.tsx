"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExportButton() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();

  async function download() {
    setLoading(true);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const qs = new URLSearchParams();
      const search = params.get("search");
      const type = params.get("type");
      const stale = params.get("stale");
      const tag = params.get("tag");
      if (search) qs.set("search", search);
      if (type) qs.set("type", type);
      if (stale === "1") qs.set("stale", "1");
      if (tag) qs.set("tag", tag);
      const res = await fetch(`${apiUrl}/api/contacts/export?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contacts.csv";
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
        buttonVariants({ variant: "outline", size: "sm" }),
        "disabled:opacity-50",
      )}
    >
      {loading ? "Exporting…" : "Export CSV"}
    </button>
  );
}
