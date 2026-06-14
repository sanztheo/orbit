"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, BarChart2, CheckCircle2, Circle } from "lucide-react";
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
  p0: "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-300",
  p1: "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
  p2: "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
  p3: "bg-muted text-muted-foreground",
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
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(
    new Set(),
  );

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

  async function moveTo(taskId: string, next: TaskStatus) {
    const token = await getToken();
    if (!token) return;
    setMovingId(taskId);
    try {
      await apiClient.patch(
        `/api/tasks/${taskId}`,
        {
          status: next,
          ...(next === "done" ? { completedAt: new Date().toISOString() } : {}),
        },
        token,
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: next } : t)),
      );
    } finally {
      setMovingId(null);
    }
  }

  function togglePriority(p: TaskPriority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  const filteredTasks = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(t.priority))
        return false;
      return true;
    });
  }, [tasks, search, priorityFilter]);

  const byStatus = Object.fromEntries(
    COLUMNS.map(({ key }) => [
      key,
      filteredTasks.filter((t) => t.status === key),
    ]),
  ) as Record<TaskStatus, Task[]>;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading tasks…
      </div>
    );
  }

  const PRIORITIES: TaskPriority[] = ["p0", "p1", "p2", "p3"];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tasks/feature-report"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BarChart2 className="h-4 w-4 mr-1.5" />
            Feature report
          </Link>
          <Link
            href="/dashboard/tasks/new"
            className={buttonVariants({ size: "sm" })}
          >
            + New task
          </Link>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                  priorityFilter.has(p)
                    ? PRIORITY_COLOR[p]
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          {(search || priorityFilter.size > 0) && (
            <button
              onClick={() => {
                setSearch("");
                setPriorityFilter(new Set());
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

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
      ) : filteredTasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tasks match your filter
        </p>
      ) : (
        <div className="flex gap-4">
          {COLUMNS.map(({ key, label }) => (
            <div
              key={key}
              className={cn(
                "flex w-72 flex-col gap-2 rounded-xl p-1 transition-colors",
                dragOverCol === key && "bg-muted/60 ring-2 ring-primary/30",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(key);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const id = dragIdRef.current;
                if (!id) return;
                const task = tasks.find((t) => t.id === id);
                if (task && task.status !== key) moveTo(id, key);
              }}
            >
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
                  draggable
                  onDragStart={() => {
                    dragIdRef.current = task.id;
                  }}
                  onDragEnd={() => {
                    dragIdRef.current = null;
                    setDragOverCol(null);
                  }}
                  className={cn(
                    "rounded-lg border border-border bg-card p-3 shadow-xs cursor-grab active:cursor-grabbing",
                    movingId === task.id && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (task.status !== "done") moveTo(task.id, "done");
                      }}
                      disabled={movingId === task.id}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-40"
                      title={task.status === "done" ? "Done" : "Mark done"}
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className={cn(
                          "text-sm font-medium leading-snug hover:underline",
                          task.status === "done" &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </Link>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}
                      >
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  {task.contactId && (
                    <Link
                      href={`/dashboard/contacts/${task.contactId}`}
                      className="mt-1 block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      ↗ {task.contactName ?? "Contact"}
                    </Link>
                  )}
                  {task.dueAt && (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        new Date(task.dueAt) < new Date()
                          ? "text-red-600 dark:text-red-400 font-medium"
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
                      onClick={() => moveTo(task.id, STATUS_NEXT[task.status]!)}
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
