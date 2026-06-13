"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function DealCloseButtons({ dealId }: { dealId: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);

  async function close(outcome: "won" | "lost") {
    setClosing(outcome);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stage: outcome === "won" ? "closed_won" : "closed_lost",
        }),
      });
      router.refresh();
    } finally {
      setClosing(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={() => close("won")}
        disabled={closing !== null}
        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {closing === "won" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        Mark Won
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => close("lost")}
        disabled={closing !== null}
        className="flex-1 text-destructive hover:bg-destructive/10"
      >
        {closing === "lost" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        Mark Lost
      </Button>
    </div>
  );
}
