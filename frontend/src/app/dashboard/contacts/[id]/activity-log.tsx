"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActivityType = "email" | "call" | "meeting" | "note" | "linkedin";

interface Activity {
  id: string;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  occurredAt: string;
}

const TYPE_ICONS: Record<ActivityType, string> = {
  email: "✉️",
  call: "📞",
  meeting: "🤝",
  note: "📝",
  linkedin: "💼",
};

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
  { value: "linkedin", label: "LinkedIn" },
];

function fmt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  contactId: string;
  initialActivities: Activity[];
}

export function ActivityLog({ contactId, initialActivities }: Props) {
  const { getToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contactId,
          type,
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError("Failed to log activity");
        return;
      }
      const json: { data: Activity } = await res.json();
      setActivities((prev) => [json.data, ...prev]);
      setSubject("");
      setBody("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Activity log</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          + Log activity
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 border border-border rounded-lg p-3"
        >
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                  type === t.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {TYPE_ICONS[t.value]} {t.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={`${type === "note" ? "Note title" : "Subject"} (optional)`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            placeholder="What happened? Key points, next steps…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                buttonVariants({ size: "sm" }),
                "disabled:opacity-50",
              )}
            >
              {saving ? "Saving…" : "Log"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No activity logged yet — click "Log activity" to record a call, email,
          or note.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <span className="shrink-0 text-base">{TYPE_ICONS[a.type]}</span>
              <div className="flex-1 min-w-0">
                {a.subject && (
                  <p className="font-medium leading-snug truncate">
                    {a.subject}
                  </p>
                )}
                {a.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {a.body}
                  </p>
                )}
                {!a.subject && !a.body && (
                  <p className="text-muted-foreground capitalize">{a.type}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {fmt(a.occurredAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
