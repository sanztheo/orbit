"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Loader2, X, ListTodo } from "lucide-react";

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
          <h2 className="font-semibold text-sm flex items-center">
            <ListTodo className="h-4 w-4 mr-2" />
            Backlog requests
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Feature requests this contact triggered
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          Add item
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Input
            type="text"
            placeholder="Feature request title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as "p0" | "p1" | "p2" | "p3")}
            >
              <SelectTrigger className="w-[160px] text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p0">P0 — Critical</SelectItem>
                <SelectItem value="p1">P1 — High</SelectItem>
                <SelectItem value="p2">P2 — Medium</SelectItem>
                <SelectItem value="p3">P3 — Low</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={saving || !title.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Add"
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
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No backlog items yet — click &ldquo;Add item&rdquo; to link a feature
          request.
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
