"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Trash2, Calendar, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");

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
        setStatus(res.data.status);
        setPriority(res.data.priority);
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
      status,
      priority,
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
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
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
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Backlog
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
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {task.contactName ?? "Contact"}
            </Link>
          </div>
          {task.priorityScore > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">
                Deal value at stake
              </p>
              <span className="rounded bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
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
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={task.description ?? ""}
            placeholder="Context, acceptance criteria…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">
              <Star className="h-3.5 w-3.5 inline mr-1 opacity-60" />
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priority">
              <Star className="h-3.5 w-3.5 inline mr-1 opacity-60" />
              Priority
            </Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v ?? "")}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueAt">
            <Calendar className="h-3.5 w-3.5 inline mr-1 opacity-60" />
            Due date
          </Label>
          <Input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={
              task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ""
            }
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
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
            variant="destructive"
            size="sm"
            className="ml-auto"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
