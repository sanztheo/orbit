"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BacklogTask {
  id: string;
  title: string;
  priority: string;
  status: string;
}

interface Props {
  contactId: string;
  initialTasks: BacklogTask[];
}

export function AddToBacklog({ contactId, initialTasks }: Props) {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<BacklogTask[]>(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"p0" | "p1" | "p2" | "p3">("p2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: title.trim(), priority, contactId }),
      });
      if (!res.ok) {
        setError("Failed to add item");
        return;
      }
      const json: { data: BacklogTask } = await res.json();
      setTasks((prev) => [json.data, ...prev]);
      setTitle("");
      setOpen(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Backlog requests</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Feature requests this contact triggered
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          + Add item
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Feature request title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "p0" | "p1" | "p2" | "p3")
              }
              className="rounded-lg border border-border px-2 py-1.5 text-xs"
            >
              <option value="p0">P0 — Critical</option>
              <option value="p1">P1 — High</option>
              <option value="p2">P2 — Medium</option>
              <option value="p3">P3 — Low</option>
            </select>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className={cn(
                buttonVariants({ size: "sm" }),
                "disabled:opacity-50",
              )}
            >
              {saving ? "Saving…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No backlog items yet — click "Add item" to link a feature request.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <span>{t.title}</span>
              <span className="text-xs text-muted-foreground uppercase">
                {t.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
