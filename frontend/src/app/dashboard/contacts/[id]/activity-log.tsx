"use client";

import { useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  Video,
  StickyNote,
  Link2 as Linkedin,
  Plus,
  Loader2,
  Trash2,
  X,
  Mic,
  MicOff,
  Square,
} from "lucide-react";

type ActivityType = "email" | "call" | "meeting" | "note" | "linkedin";

interface WebSpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: { results: ArrayLike<[{ transcript: string }]> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechWin = typeof window & {
  SpeechRecognition?: new () => WebSpeechRec;
  webkitSpeechRecognition?: new () => WebSpeechRec;
};
function getSR(): (new () => WebSpeechRec) | undefined {
  const w = window as SpeechWin;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

interface Activity {
  id: string;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  occurredAt: string;
}

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
  meeting: <Video className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
  linkedin: <Linkedin className="h-3.5 w-3.5" />,
};

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
  { value: "linkedin", label: "LinkedIn" },
];

const DM_SOURCES: {
  value: string;
  label: string;
  icon: string;
  activityType: ActivityType;
}[] = [
  {
    value: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    activityType: "linkedin",
  },
  { value: "whatsapp", label: "WhatsApp", icon: "💬", activityType: "note" },
  { value: "x", label: "X / Twitter", icon: "🐦", activityType: "note" },
  { value: "sms", label: "SMS / iMessage", icon: "📱", activityType: "note" },
  { value: "other", label: "Other", icon: "📨", activityType: "note" },
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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<WebSpeechRec | null>(null);
  const [voiceSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!getSR();
  });
  const [type, setType] = useState<ActivityType>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dmSource, setDmSource] = useState("linkedin");
  const [dmText, setDmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startRecording() {
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++)
        t += e.results[i][0].transcript;
      setTranscript(t);
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function submitVoice() {
    if (!transcript.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const activity = await postActivity({
        type: "note",
        subject: "🎤 Voice note",
        body: transcript.trim(),
      });
      setActivities((prev) => [activity, ...prev]);
      setTranscript("");
      setVoiceOpen(false);
    } catch {
      setError("Failed to log voice note");
    } finally {
      setSaving(false);
    }
  }

  async function postActivity(payload: {
    type: ActivityType;
    subject?: string;
    body?: string;
  }) {
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ contactId, ...payload }),
    });
    if (!res.ok) throw new Error("Failed to log activity");
    const json: { data: Activity } = await res.json();
    return json.data;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const activity = await postActivity({
        type,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
      });
      setActivities((prev) => [activity, ...prev]);
      setSubject("");
      setBody("");
      setOpen(false);
    } catch {
      setError("Failed to log activity");
    } finally {
      setSaving(false);
    }
  }

  async function submitDm(e: React.FormEvent) {
    e.preventDefault();
    if (!dmText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const src = DM_SOURCES.find((s) => s.value === dmSource)!;
      const activity = await postActivity({
        type: src.activityType,
        subject: `${src.icon} ${src.label} DM`,
        body: dmText.trim(),
      });
      setActivities((prev) => [activity, ...prev]);
      setDmText("");
      setPasteOpen(false);
    } catch {
      setError("Failed to log activity");
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(id: string) {
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/activities/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Activity log</h2>
        <div className="flex gap-2">
          {voiceSupported && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVoiceOpen((v) => !v);
                setOpen(false);
                setPasteOpen(false);
                setError(null);
              }}
            >
              <Mic className="h-4 w-4 mr-1" />
              Voice
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPasteOpen((v) => !v);
              setOpen(false);
              setVoiceOpen(false);
              setError(null);
            }}
          >
            📋 Paste DM
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen((v) => !v);
              setPasteOpen(false);
              setVoiceOpen(false);
              setError(null);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Log activity
          </Button>
        </div>
      </div>

      {pasteOpen && (
        <form
          onSubmit={submitDm}
          className="flex flex-col gap-2 border border-border rounded-lg p-3"
        >
          <p className="text-xs text-muted-foreground">
            Paste a DM conversation to log it — no re-typing needed.
          </p>
          <div className="flex gap-2 flex-wrap">
            {DM_SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setDmSource(s.value)}
                className={[
                  "rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                  dmSource === s.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                ].join(" ")}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Paste the conversation here…"
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            rows={6}
            autoFocus
            className="resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !dmText.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Log DM"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPasteOpen(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {voiceOpen && (
        <div className="flex flex-col gap-2 border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Tap record, speak your note, stop when done — it logs instantly.
          </p>
          <div className="flex items-center gap-3">
            {recording ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopRecording}
              >
                <Square className="h-4 w-4 mr-1.5" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={startRecording}
                disabled={saving}
              >
                <Mic className="h-4 w-4 mr-1.5" />
                {transcript ? "Re-record" : "Record"}
              </Button>
            )}
            {recording && (
              <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Recording…
              </span>
            )}
          </div>
          {transcript && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
              {transcript}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!transcript.trim() || saving || recording}
              onClick={submitVoice}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4 mr-1.5" />
                  Log note
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                stopRecording();
                setVoiceOpen(false);
                setTranscript("");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

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
                className={[
                  "rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                  type === t.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-1">
                  {TYPE_ICONS[t.value]} {t.label}
                </span>
              </button>
            ))}
          </div>
          <Input
            type="text"
            placeholder={`${type === "note" ? "Note title" : "Subject"} (optional)`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            placeholder="What happened? Key points, next steps…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Log"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No activity logged yet — click &ldquo;Log activity&rdquo; to record a
          call, email, or note.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {activities.map((a) => (
            <li key={a.id} className="group flex gap-3 text-sm">
              <span className="shrink-0 flex items-center text-muted-foreground">
                {TYPE_ICONS[a.type]}
              </span>
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
              <button
                onClick={() => deleteActivity(a.id)}
                title="Delete activity"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
