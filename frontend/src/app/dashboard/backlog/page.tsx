"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Plus,
  BookOpen,
  Star,
  CheckCircle2,
  Circle,
  ArrowUpCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  Zap,
  Check,
  Loader2,
} from "lucide-react";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type TaskPriority = "p0" | "p1" | "p2" | "p3";

interface BacklogItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  contactId: string | null;
  contactName: string | null;
  priorityScore: number;
  dueAt: string | null;
}

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "Inbox", color: "border-border" },
  {
    key: "in_progress",
    label: "This Sprint",
    color: "border-blue-200 dark:border-blue-800",
  },
  {
    key: "done",
    label: "Done",
    color: "border-green-200 dark:border-green-800",
  },
];

const PRIORITY_BADGE: Record<TaskPriority, { label: string; cls: string }> = {
  p0: {
    label: "P0",
    cls: "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-300",
  },
  p1: {
    label: "P1",
    cls: "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
  },
  p2: {
    label: "P2",
    cls: "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
  },
  p3: { label: "P3", cls: "bg-muted text-muted-foreground" },
};

const STATUS_NEXT: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: "in_progress",
  in_progress: "done",
};

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle className="h-3 w-3 text-muted-foreground" />,
  in_progress: <ArrowUpCircle className="h-3 w-3 text-blue-500" />,
  done: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  cancelled: <XCircle className="h-3 w-3 text-muted-foreground" />,
};

const PRIORITY_ICON: Record<TaskPriority, React.ReactNode> = {
  p0: <Star className="h-3 w-3 fill-red-500 text-red-500" />,
  p1: <Star className="h-3 w-3 fill-orange-400 text-orange-400" />,
  p2: <Star className="h-3 w-3 fill-blue-400 text-blue-400" />,
  p3: <Star className="h-3 w-3 text-muted-foreground" />,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function BacklogPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [loopDrafts, setLoopDrafts] = useState<Map<string, string>>(new Map());
  const [generatingLoop, setGeneratingLoop] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await apiClient.get<{ data: BacklogItem[] }>(
        "/api/tasks",
        token,
      );
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function advance(item: BacklogItem) {
    const next = STATUS_NEXT[item.status];
    if (!next) return;
    const token = await getToken();
    if (!token) return;
    setMovingId(item.id);
    try {
      await apiClient.patch(`/api/tasks/${item.id}`, { status: next }, token);
      setItems((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, status: next } : t)),
      );
    } finally {
      setMovingId(null);
    }
  }

  async function closeTheLoop(item: BacklogItem) {
    if (!item.contactId) return;
    setGeneratingLoop(item.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/close-the-loop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ taskId: item.id }),
      });
      if (!res.ok) return;
      const json: { draft: string } = await res.json();
      setLoopDrafts((prev) => new Map(prev).set(item.id, json.draft));
    } finally {
      setGeneratingLoop(null);
    }
  }

  async function copyDraft(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const byStatus = Object.fromEntries(
    COLUMNS.map(({ key }) => [
      key,
      items
        .filter((t) => t.status === key)
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
    ]),
  ) as Record<TaskStatus, BacklogItem[]>;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex w-72 shrink-0 flex-col gap-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            Product Backlog
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Feature requests linked to the contacts who asked
          </p>
        </div>
        <Link
          href="/dashboard/tasks/new"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-muted-foreground">Backlog is empty</p>
          <p className="text-xs text-muted-foreground">
            Add items directly or link feature requests from a contact record
          </p>
          <Link
            href="/dashboard/tasks/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add backlog item
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(({ key, label, color }) => (
            <div key={key} className="flex w-72 shrink-0 flex-col gap-2">
              <div
                className={`flex items-center justify-between rounded-t-lg border-t-2 px-1 pt-2 ${color}`}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {STATUS_ICON[key]}
                  {label}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {byStatus[key]?.length ?? 0}
                </Badge>
              </div>

              {(byStatus[key] ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  Empty
                </div>
              ) : (
                (byStatus[key] ?? []).map((item) => {
                  const pb = PRIORITY_BADGE[item.priority];
                  const draft = loopDrafts.get(item.id);
                  const isDone = item.status === "done";
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-card p-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">
                          {item.title}
                        </p>
                        <span
                          className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${pb.cls}`}
                        >
                          {PRIORITY_ICON[item.priority]}
                          {pb.label}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.contactId && (
                        <div className="mt-1 flex items-center gap-2">
                          <Link
                            href={`/dashboard/contacts/${item.contactId}`}
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {item.contactName ?? "Contact"}
                          </Link>
                          {item.priorityScore > 0 && (
                            <span className="rounded bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              ${item.priorityScore.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Link
                          href={`/dashboard/tasks/${item.id}`}
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                        >
                          Edit
                        </Link>
                        {STATUS_NEXT[item.status] && (
                          <button
                            onClick={() => advance(item)}
                            disabled={movingId === item.id}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            {movingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            Move to{" "}
                            {STATUS_NEXT[item.status] === "in_progress"
                              ? "sprint"
                              : "done"}
                          </button>
                        )}
                        {isDone && item.contactId && !draft && (
                          <button
                            onClick={() => closeTheLoop(item)}
                            disabled={generatingLoop === item.id}
                            className={cn(
                              "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 disabled:opacity-40",
                            )}
                          >
                            {generatingLoop === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                            {generatingLoop === item.id
                              ? "Drafting…"
                              : "Notify requester"}
                          </button>
                        )}
                      </div>
                      {draft && (
                        <div className="mt-2 flex flex-col gap-1">
                          <Textarea
                            value={draft}
                            onChange={(e) =>
                              setLoopDrafts((prev) =>
                                new Map(prev).set(item.id, e.target.value),
                              )
                            }
                            rows={5}
                            className="w-full resize-none font-mono text-xs leading-relaxed"
                          />
                          <button
                            onClick={() => copyDraft(item.id, draft)}
                            className="flex items-center gap-1 self-end text-xs text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                Copied!
                              </>
                            ) : (
                              "Copy"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
