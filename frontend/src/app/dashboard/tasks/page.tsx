"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type TaskPriority = "p0" | "p1" | "p2" | "p3";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  contactId: string | null;
  contactName: string | null;
}

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  p0: "bg-red-100 text-red-700",
  p1: "bg-orange-100 text-orange-700",
  p2: "bg-blue-100 text-blue-700",
  p3: "bg-gray-100 text-gray-600",
};

const STATUS_NEXT: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: "in_progress",
  in_progress: "done",
};

export default function TasksPage() {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function fetchTasks() {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await apiClient.get<{ data: Task[] }>("/api/tasks", token);
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function advance(task: Task) {
    const next = STATUS_NEXT[task.status];
    if (!next) return;
    const token = await getToken();
    if (!token) return;
    setMovingId(task.id);
    try {
      await apiClient.patch(
        `/api/tasks/${task.id}`,
        {
          status: next,
          ...(next === "done" ? { completedAt: new Date().toISOString() } : {}),
        },
        token,
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
      );
    } finally {
      setMovingId(null);
    }
  }

  const byStatus = Object.fromEntries(
    COLUMNS.map(({ key }) => [key, tasks.filter((t) => t.status === key)]),
  ) as Record<TaskStatus, Task[]>;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tasks/feature-report"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            📊 Feature report
          </Link>
          <Link
            href="/dashboard/tasks/new"
            className={buttonVariants({ size: "sm" })}
          >
            + New task
          </Link>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No tasks yet</p>
          <Link
            href="/dashboard/tasks/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Add your first task
          </Link>
        </div>
      ) : (
        <div className="flex gap-4">
          {COLUMNS.map(({ key, label }) => (
            <div key={key} className="flex w-72 flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {byStatus[key]?.length ?? 0}
                </Badge>
              </div>
              {(byStatus[key] ?? []).map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-white p-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">
                      {task.title}
                    </p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}
                    >
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  {task.contactId && (
                    <Link
                      href={`/dashboard/contacts/${task.contactId}`}
                      className="mt-1 block text-xs text-blue-600 hover:underline truncate"
                    >
                      ↗ {task.contactName ?? "Contact"}
                    </Link>
                  )}
                  {task.dueAt && (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        new Date(task.dueAt) < new Date()
                          ? "text-red-600 font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      Due{" "}
                      {new Date(task.dueAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {new Date(task.dueAt) < new Date() ? " ⚠" : ""}
                    </p>
                  )}
                  {STATUS_NEXT[task.status] && (
                    <button
                      onClick={() => advance(task)}
                      disabled={movingId === task.id}
                      className="mt-2 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      → Move to {STATUS_NEXT[task.status]?.replace("_", " ")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
