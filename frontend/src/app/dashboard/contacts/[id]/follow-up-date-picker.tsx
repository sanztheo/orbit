"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Calendar, X, Loader2 } from "lucide-react";

interface Props {
  contactId: string;
  initialDate: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function toInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FollowUpDatePicker({ contactId, initialDate }: Props) {
  const { getToken } = useAuth();
  const [date, setDate] = useState<string | null>(initialDate);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(toInputValue(initialDate));
  const [saving, setSaving] = useState(false);

  async function save(val: string | null) {
    setSaving(true);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nextFollowUpAt: val ? new Date(val).toISOString() : null,
        }),
      });
      setDate(val ? new Date(val).toISOString() : null);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (saving) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  function quickDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save(inputVal || null);
              if (e.key === "Escape") setEditing(false);
            }}
            className="rounded border border-border bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <button
            onClick={() => save(inputVal || null)}
            className="text-xs text-emerald-700 hover:underline font-medium"
          >
            Save
          </button>
          {date && (
            <button
              onClick={() => save(null)}
              title="Clear date"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        <div className="flex gap-1">
          {[
            { label: "1 week", days: 7 },
            { label: "2 weeks", days: 14 },
            { label: "1 month", days: 30 },
          ].map(({ label, days }) => (
            <button
              key={days}
              onClick={() => save(quickDate(days))}
              className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-emerald-500 hover:text-emerald-700 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setInputVal(toInputValue(date));
        setEditing(true);
      }}
      className="group flex items-center gap-1 text-sm hover:text-foreground transition-colors"
      title="Set follow-up date"
    >
      {date ? (
        <span>{fmt(date)}</span>
      ) : (
        <span className="text-muted-foreground/60 group-hover:text-muted-foreground">
          Set date →
        </span>
      )}
      <Calendar className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}
