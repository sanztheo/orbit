"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Mail,
  Video,
  StickyNote,
  Link2 as Linkedin,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";

type ActivityType = "email" | "call" | "meeting" | "note" | "linkedin";

interface Activity {
  id: string;
  contactName: string | null;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  occurredAt: string;
}

const ICON: Record<ActivityType, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
  meeting: <Video className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
  linkedin: <Linkedin className="h-3.5 w-3.5" />,
};

const COLOR: Record<ActivityType, string> = {
  email: "text-blue-600 dark:text-blue-400",
  call: "text-green-600 dark:text-green-400",
  meeting: "text-purple-600 dark:text-purple-400",
  note: "text-amber-600 dark:text-amber-400",
  linkedin: "text-sky-600 dark:text-sky-400",
};

const TYPES: { value: ActivityType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "note", label: "Note" },
  { value: "linkedin", label: "LinkedIn" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface Props {
  dealId: string;
  contactId: string | null;
  initialActivities: Activity[];
}

export function DealActivityLog({
  dealId,
  contactId,
  initialActivities,
}: Props) {
  const { getToken } = useAuth();
  const [acts, setActs] = useState<Activity[]>(initialActivities);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function log() {
    if (!contactId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contactId,
          dealId,
          type,
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
          occurredAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const json: { data: Activity } = await res.json();
        setActs((prev) => [json.data, ...prev]);
        setOpen(false);
        setSubject("");
        setBody("");
        window.dispatchEvent(new CustomEvent("orbit:activity-logged"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/activities/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) setActs((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Activity</h2>
        {contactId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            className="h-7 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Log
          </Button>
        )}
      </div>

      {open && contactId && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex gap-1 flex-wrap">
            {TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors ${
                  type === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                {ICON[value]}
                {label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-8 text-sm"
          />
          <Textarea
            placeholder="Notes…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={log}
              disabled={saving}
              className="h-7 text-xs"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {acts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No deal activities yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {acts.map((a) => (
            <li key={a.id} className="flex items-start gap-2 group text-sm">
              <span className={`mt-0.5 shrink-0 ${COLOR[a.type]}`}>
                {ICON[a.type]}
              </span>
              <div className="min-w-0 flex-1">
                {a.subject && (
                  <p className="font-medium truncate">{a.subject}</p>
                )}
                {a.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {a.body}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {relativeTime(a.occurredAt)}
                  {a.contactName && ` · ${a.contactName}`}
                </p>
              </div>
              <button
                onClick={() => del(a.id)}
                title="Delete"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
