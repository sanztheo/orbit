"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  dealId: string;
  field: "value" | "probability";
  initialValue: number | null;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}

export function DealMetricEditor({
  dealId,
  field,
  initialValue,
  prefix = "",
  suffix = "",
  min,
  max,
}: Props) {
  const { getToken } = useAuth();
  const [value, setValue] = useState<number | null>(initialValue);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value != null ? String(value) : "");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, value]);

  async function save() {
    const num = draft.trim() === "" ? null : Number(draft);
    if (draft.trim() !== "" && isNaN(num!)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [field]: num }),
      });
      if (res.ok) {
        setValue(num);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        {prefix && (
          <span className="text-sm text-muted-foreground">{prefix}</span>
        )}
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={save}
          min={min}
          max={max}
          className="w-24 rounded border border-ring bg-background px-2 py-0.5 text-lg font-semibold focus:outline-none"
        />
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
    );
  }

  return (
    <p
      className="font-semibold text-lg cursor-pointer hover:bg-muted/40 rounded px-1 -mx-1 transition-colors mt-0.5"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value != null ? `${prefix}${value.toLocaleString()}${suffix}` : "—"}
    </p>
  );
}
