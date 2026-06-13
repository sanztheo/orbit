"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Sparkles } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  dealId: string;
  initialNextAction: string | null;
}

export function DealNextAction({ dealId, initialNextAction }: Props) {
  const { getToken } = useAuth();
  const [value, setValue] = useState(initialNextAction ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function suggest() {
    setSuggesting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/suggest-deal-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dealId }),
      });
      const json: { action?: string } = await res.json();
      if (res.ok && json.action) {
        setDraft(json.action);
        setEditing(true);
      }
    } finally {
      setSuggesting(false);
    }
  }

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ nextAction: draft.trim() || null }),
      });
      if (res.ok) {
        setValue(draft.trim());
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground shrink-0">→</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="What's the next step?"
          className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <button
            onClick={save}
            className="text-xs text-primary hover:underline"
          >
            Save
          </button>
        )}
        <button
          onClick={cancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  const suggestBtn = (
    <button
      onClick={suggest}
      disabled={suggesting}
      title="AI suggest"
      className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-purple-600 disabled:opacity-40 transition-colors"
    >
      {suggesting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return value ? (
    <div className="flex items-center gap-1 group">
      <p
        className="font-medium cursor-pointer hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors flex-1"
        onClick={startEdit}
        title="Click to edit"
      >
        → {value}
      </p>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {suggestBtn}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <button
        onClick={startEdit}
        className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors italic"
      >
        Add next step…
      </button>
      {suggestBtn}
    </div>
  );
}
