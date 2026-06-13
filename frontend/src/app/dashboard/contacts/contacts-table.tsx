"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Activity,
  AlertTriangle,
  Calendar,
  Loader2,
  CheckSquare,
  Trash2,
} from "lucide-react";
import { ContactLogButton } from "./contact-log-button";

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

export interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: ContactType;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  cadenceDays: number | null;
  priorityScore: number | null;
  tags: string[];
  createdAt: string;
}

const TYPE_VARIANT: Record<
  ContactType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  lead: "outline",
  customer: "default",
  investor: "secondary",
  advisor: "outline",
  partner: "secondary",
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function healthColor(days: number | null): string {
  if (days === null) return "text-red-500";
  if (days <= 14) return "text-green-600 dark:text-green-400";
  if (days <= 30) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function isStale(days: number | null): boolean {
  return days === null || days >= 180;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isFollowUpDue(nextFollowUpAt: string | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt) <= new Date();
}

function formatFollowUpDate(nextFollowUpAt: string | null): string {
  if (!nextFollowUpAt) return "";
  const d = new Date(nextFollowUpAt);
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "due today";
  return `due in ${daysLeft}d`;
}

function computeHealthScore(contact: ContactRow): number {
  const days = daysSince(contact.lastContactedAt);

  // Base from recency
  let score: number;
  if (days === null) {
    score = 12;
  } else if (days === 0) {
    score = 100;
  } else if (days <= 7) {
    score = 95;
  } else if (days <= 14) {
    score = 85;
  } else if (days <= 30) {
    score = 70;
  } else if (days <= 60) {
    score = 50;
  } else if (days <= 90) {
    score = 35;
  } else if (days <= 180) {
    score = 20;
  } else {
    score = 8;
  }

  // Follow-up modifier
  if (contact.nextFollowUpAt) {
    if (isFollowUpDue(contact.nextFollowUpAt)) {
      score = Math.max(0, score - 15);
    } else {
      score = Math.min(100, score + 5);
    }
  }

  // Cadence adherence: penalise if overdue relative to cadence
  if (
    contact.cadenceDays &&
    days !== null &&
    days > contact.cadenceDays * 1.5
  ) {
    score = Math.max(0, score - 10);
  }

  return Math.max(0, Math.min(100, score));
}

function healthScoreColor(score: number): string {
  if (score >= 80)
    return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
  if (score >= 60)
    return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
  if (score >= 40)
    return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
  return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
}

interface Props {
  contacts: ContactRow[];
}

export function ContactsTable({ contacts }: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allIds = contacts.map((c) => c.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markContacted() {
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const now = new Date().toISOString();
    await Promise.all(
      [...selected].map((id) =>
        fetch(`${apiUrl}/api/contacts/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ lastContactedAt: now }),
        }),
      ),
    );
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  async function deleteSelected() {
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    await Promise.all(
      [...selected].map((id) =>
        fetch(`${apiUrl}/api/contacts/${id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ),
    );
    setSelected(new Set());
    setConfirmDelete(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      {/* Mobile card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {contacts.map((contact) => {
          const days = daysSince(contact.lastContactedAt);
          return (
            <Link
              key={contact.id}
              href={`/dashboard/contacts/${contact.id}`}
              className="flex items-start justify-between rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{contact.name}</p>
                {contact.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.email}
                  </p>
                )}
                {contact.company && (
                  <p className="text-xs text-muted-foreground">
                    {contact.company}
                  </p>
                )}
                {contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{contact.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1 ml-2">
                <Badge variant={TYPE_VARIANT[contact.type]}>
                  {contact.type}
                </Badge>
                <span className={`text-xs ${healthColor(days)}`}>
                  {days === null
                    ? "Never"
                    : days === 0
                      ? "Today"
                      : `${days}d ago`}
                </span>
                {isStale(days) && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 inline" /> stale
                  </span>
                )}
                {contact.nextFollowUpAt && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isFollowUpDue(contact.nextFollowUpAt)
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    <Calendar className="h-3 w-3 inline" />{" "}
                    {formatFollowUpDate(contact.nextFollowUpAt)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 pr-0">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-border cursor-pointer"
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Last contacted
              </span>
            </TableHead>
            <TableHead>
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Health
              </span>
            </TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const days = daysSince(contact.lastContactedAt);
            const isChecked = selected.has(contact.id);
            return (
              <TableRow
                key={contact.id}
                className={`group ${isChecked ? "bg-muted/40" : ""}`}
              >
                <TableCell className="w-8 pr-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border cursor-pointer"
                    aria-label={`Select ${contact.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/contacts/${contact.id}`}
                    className="hover:underline"
                  >
                    {contact.name}
                  </Link>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                    >
                      {contact.email}
                    </a>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contact.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{contact.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {contact.company ? (
                    <Link
                      href={`/dashboard/companies/${encodeURIComponent(contact.company)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm hover:underline text-muted-foreground hover:text-foreground"
                    >
                      {contact.company}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_VARIANT[contact.type]}>
                    {contact.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={`text-sm ${healthColor(days)}`}>
                    {days === null
                      ? "Never"
                      : days === 0
                        ? "Today"
                        : `${days}d ago`}
                  </span>
                  {isStale(days) && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 inline" /> stale
                    </span>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatDate(contact.lastContactedAt)}
                  </div>
                  {contact.nextFollowUpAt && (
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium mt-0.5 ${
                        isFollowUpDue(contact.nextFollowUpAt)
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      <Calendar className="h-3 w-3 inline" />{" "}
                      {formatFollowUpDate(contact.nextFollowUpAt)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const score = computeHealthScore(contact);
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${healthScoreColor(score)}`}
                      >
                        {score}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="w-8 pr-3">
                  <ContactLogButton
                    contactId={contact.id}
                    contactName={contact.name}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-border bg-card shadow-lg px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {selected.size} selected
          </span>
          {confirmDelete ? (
            <>
              <span className="text-sm text-destructive font-medium">
                Delete {selected.size} contact{selected.size !== 1 ? "s" : ""}?
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteSelected}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Confirm delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={markContacted} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckSquare className="h-4 w-4 mr-2" />
                )}
                Mark contacted today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                disabled={isPending}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
