"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, AlarmClock } from "lucide-react";

function isoInDays(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

const SNOOZE_OPTIONS = [
  { label: "Tomorrow", getDate: () => isoInDays(1) },
  { label: "3 days", getDate: () => isoInDays(3) },
  { label: "1 week", getDate: () => isoInDays(7) },
  { label: "2 weeks", getDate: () => isoInDays(14) },
];

interface Props {
  contactId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function SnoozeFollowUpButton({ contactId }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function snooze(nextFollowUpAt: string) {
    setLoading(true);
    setOpen(false);
    const token = await getToken();
    await fetch(`${API_URL}/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ nextFollowUpAt }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Snooze follow-up"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <AlarmClock className="h-3.5 w-3.5" />
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-32 rounded-md border border-border bg-popover shadow-md overflow-hidden">
            {SNOOZE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => snooze(opt.getDate())}
                className="flex w-full items-center px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
