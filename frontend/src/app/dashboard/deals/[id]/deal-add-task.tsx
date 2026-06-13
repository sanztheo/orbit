"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "p0" | "p1" | "p2" | "p3";

interface Task {
  id: string;
  title: string;
  priority: Priority;
  status: string;
  dueAt: string | null;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  p0: "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-300",
  p1: "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
  p2: "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
  p3: "bg-muted text-muted-foreground",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  dealId: string;
  initialTasks: Task[];
}

export function DealAddTask({ dealId, initialTasks }: Props) {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("p2");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          dealId,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        setError("Failed to add task");
        return;
      }
      const json: { data: Task } = await res.json();
      setTasks((prev) => [json.data, ...prev]);
      setTitle("");
      setDueAt("");
      setPriority("p2");
      setOpen(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const PRIORITIES: Priority[] = ["p0", "p1", "p2", "p3"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckSquare className="h-3.5 w-3.5" />
          Tasks
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-lg border border-border p-3"
        >
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
                    priority === p
                      ? PRIORITY_COLOR[p]
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="h-8 text-xs flex-1"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={saving || !title.trim()}
              className="h-7 text-xs"
            >
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {tasks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tasks/${t.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors text-sm"
            >
              <span
                className={cn(
                  "truncate",
                  t.status === "done" && "line-through text-muted-foreground",
                )}
              >
                {t.title}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-2 shrink-0 text-xs",
                  PRIORITY_COLOR[t.priority as Priority],
                )}
              >
                {t.priority.toUpperCase()}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {tasks.length === 0 && !open && (
        <p className="text-xs text-muted-foreground/60 italic">No tasks yet</p>
      )}
    </div>
  );
}
