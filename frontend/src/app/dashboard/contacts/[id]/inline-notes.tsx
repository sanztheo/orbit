"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  contactId: string;
  initialNotes: string | null;
}

export function InlineNotes({ contactId, initialNotes }: Props) {
  const { getToken } = useAuth();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setDraft(notes);
    setEditing(true);
  }

  function cancel() {
    setDraft(notes);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes: draft.trim() || null }),
      });
      if (res.ok) {
        setNotes(draft.trim());
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="col-span-2 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">Notes</p>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="resize-none text-sm"
          placeholder="Context, how you met, what they care about…"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-2">
      <p className="text-xs text-muted-foreground mb-1">Notes</p>
      {notes ? (
        <p
          className="whitespace-pre-wrap text-sm cursor-pointer hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors"
          onClick={startEdit}
          title="Click to edit"
        >
          {notes}
        </p>
      ) : (
        <button
          onClick={startEdit}
          className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors italic"
        >
          Add notes…
        </button>
      )}
    </div>
  );
}
