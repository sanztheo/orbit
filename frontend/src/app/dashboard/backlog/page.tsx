"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type TaskPriority = "p0" | "p1" | "p2" | "p3";

interface BacklogItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  contactId: string | null;
  dueAt: string | null;
}

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "Inbox", color: "border-gray-200" },
  { key: "in_progress", label: "This Sprint", color: "border-blue-200" },
  { key: "done", label: "Done", color: "border-green-200" },
];

const PRIORITY_BADGE: Record<TaskPriority, { label: string; cls: string }> = {
  p0: { label: "P0", cls: "bg-red-100 text-red-700" },
  p1: { label: "P1", cls: "bg-orange-100 text-orange-700" },
  p2: { label: "P2", cls: "bg-blue-100 text-blue-700" },
  p3: { label: "P3", cls: "bg-gray-100 text-gray-500" },
};

const STATUS_NEXT: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: "in_progress",
  in_progress: "done",
};

export default function BacklogPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function fetchItems() {
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
  }

  useEffect(() => {
    fetchItems();
  }, []);

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

  const byStatus = Object.fromEntries(
    COLUMNS.map(({ key }) => [key, items.filter((t) => t.status === key)]),
  ) as Record<TaskStatus, BacklogItem[]>;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading backlog…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Product Backlog</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Feature requests linked to the contacts who asked
          </p>
        </div>
        <Link
          href="/dashboard/tasks/new"
          className={buttonVariants({ size: "sm" })}
        >
          + Add item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">Backlog is empty</p>
          <p className="text-xs text-muted-foreground">
            Add items directly or link feature requests from a contact record
          </p>
          <Link
            href="/dashboard/tasks/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
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
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-white p-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">
                          {item.title}
                        </p>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${pb.cls}`}
                        >
                          {pb.label}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.contactId && (
                        <p className="mt-1 text-xs text-blue-600">
                          Linked to contact
                        </p>
                      )}
                      {STATUS_NEXT[item.status] && (
                        <button
                          onClick={() => advance(item)}
                          disabled={movingId === item.id}
                          className="mt-2 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                        >
                          → Move to{" "}
                          {STATUS_NEXT[item.status] === "in_progress"
                            ? "sprint"
                            : "done"}
                        </button>
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
