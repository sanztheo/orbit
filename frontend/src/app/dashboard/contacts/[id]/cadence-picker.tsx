"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { label: "None", value: null },
  { label: "Weekly", value: 7 },
  { label: "Bi-weekly", value: 14 },
  { label: "Monthly", value: 30 },
  { label: "Quarterly", value: 90 },
];

interface Props {
  contactId: string;
  initialCadence: number | null;
}

export function CadencePicker({ contactId, initialCadence }: Props) {
  const { getToken } = useAuth();
  const [cadence, setCadence] = useState<number | null>(initialCadence);
  const [saving, setSaving] = useState(false);

  async function update(value: number | null) {
    setSaving(true);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      await fetch(`${apiUrl}/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cadenceDays: value }),
      });
      setCadence(value);
    } finally {
      setSaving(false);
    }
  }

  const current = OPTIONS.find((o) => o.value === cadence) ?? OPTIONS[0];

  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Follow-up cadence</p>
        <p className="text-sm font-medium">
          {current.label}
          {cadence && (
            <span className="ml-1 text-xs text-muted-foreground">
              (every {cadence}d)
            </span>
          )}
        </p>
      </div>
      <select
        value={cadence ?? ""}
        disabled={saving}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          update(v);
        }}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer disabled:opacity-50",
        )}
      >
        {OPTIONS.map((o) => (
          <option key={o.value ?? "none"} value={o.value ?? ""}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
