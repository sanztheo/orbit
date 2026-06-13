"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUSES = [
  { value: "todo", label: "Inbox" },
  { value: "in_progress", label: "This Sprint" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITIES = [
  { value: "p0", label: "P0 — Critical" },
  { value: "p1", label: "P1 — High" },
  { value: "p2", label: "P2 — Medium" },
  { value: "p3", label: "P3 — Low" },
];

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  contactId: string | null;
  contactName: string | null;
  dealId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  priorityScore: number;
  createdAt: string;
}

const sel =
  "h-9 rounded-md border border-input bg-background px-3 text-sm w-full";

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await apiClient.get<{ data: Task }>(
          `/api/tasks/${id}`,
          token,
        );
        setTask(res.data);
      } catch {
        setError("Task not found");
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [getToken, id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!task) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const dueAtRaw = fd.get("dueAt") as string;
    const body = {
      title: (fd.get("title") as string).trim(),
      description: (fd.get("description") as string) || null,
      status: fd.get("status") as string,
      priority: fd.get("priority") as string,
      dueAt: dueAtRaw ? new Date(dueAtRaw).toISOString() : undefined,
    };
    if (!body.title) return;
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await apiClient.patch(`/api/tasks/${id}`, body, token);
      router.push("/dashboard/backlog");
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this backlog item?")) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await apiClient.delete(`/api/tasks/${id}`, token);
      router.push("/dashboard/backlog");
    } catch {
      setError("Failed to delete");
      setDeleting(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Item not found.</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/backlog"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Backlog
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold truncate">{task.title}</h1>
      </div>

      {/* Attribution card */}
      {task.contactId && (
        <div className="mb-6 rounded-xl border border-border p-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Requested by</p>
            <Link
              href={`/dashboard/contacts/${task.contactId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {task.contactName ?? "Contact"}
            </Link>
          </div>
          {task.priorityScore > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">
                Deal value at stake
              </p>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-700">
                ${task.priorityScore.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            defaultValue={task.title}
            required
            placeholder="Feature or task description"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={task.description ?? ""}
            placeholder="Context, acceptance criteria…"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={task.status}
              className={sel}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              name="priority"
              defaultValue={task.priority}
              className={sel}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueAt">Due date</Label>
          <Input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={
              task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ""
            }
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/backlog")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="ml-auto text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </form>
    </div>
  );
}
