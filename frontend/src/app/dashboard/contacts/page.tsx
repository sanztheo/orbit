import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ContactFilters } from "./contact-filters";
import { ExportButton } from "./export-button";
import { ExportAllButton } from "./export-all-button";
import { ImportButton } from "./import-button";
import {
  UserPlus,
  Users,
  Clock,
  Star,
  AlertTriangle,
  Calendar,
} from "lucide-react";

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: ContactType;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  priorityScore: number | null;
  createdAt: string;
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

interface ContactsResponse {
  data: Contact[];
  total: number;
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
  if (days <= 14) return "text-green-600";
  if (days <= 30) return "text-amber-500";
  return "text-red-500";
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

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    type?: string;
    stale?: string;
    sort?: string;
  }>;
}) {
  const { getToken } = await auth();
  const token = await getToken();
  const { search, type, stale, sort } = await searchParams;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (type) qs.set("type", type);
  if (stale === "1") qs.set("stale", "1");
  if (sort) qs.set("sort", sort);

  const [res, staleRes] = await Promise.all([
    fetch(`${apiUrl}/api/contacts?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    }),
    stale !== "1"
      ? fetch(`${apiUrl}/api/contacts?stale=1`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        })
      : null,
  ]);

  let contacts: Contact[] = [];
  if (res.ok) {
    const json: ContactsResponse = await res.json();
    contacts = json.data;
  }

  let staleCount = 0;
  if (staleRes?.ok) {
    const json: ContactsResponse = await staleRes.json();
    staleCount = json.total;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight md:text-2xl">
            <Users className="h-5 w-5 text-muted-foreground" />
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton />
          <ExportButton />
          <ExportAllButton />
          <Link
            href="/dashboard/contacts/new"
            className={buttonVariants({ size: "sm" })}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add
          </Link>
        </div>
      </div>

      <Suspense>
        <ContactFilters />
      </Suspense>

      {staleCount > 0 && stale !== "1" && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="text-amber-900">
            <span className="font-semibold">{staleCount}</span> contact
            {staleCount !== 1 ? "s" : ""} not touched in 180+ days — verify or
            reach out.
          </span>
          <Link
            href="/dashboard/contacts?stale=1"
            className="ml-4 shrink-0 text-xs font-medium text-amber-700 hover:underline"
          >
            View stale →
          </Link>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
          <p className="text-muted-foreground">
            {search || type
              ? "No contacts match your filter"
              : "No contacts yet — import from CSV or add one manually"}
          </p>
          {!search && !type && (
            <div className="flex gap-2">
              <Link
                href="/dashboard/contacts/new"
                className={buttonVariants({ variant: "default" })}
              >
                Add contact
              </Link>
              <ImportButton label="Import CSV" />
            </div>
          )}
        </div>
      ) : (
        <>
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
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 inline" /> stale
                      </span>
                    )}
                    {contact.nextFollowUpAt && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-medium ${
                          isFollowUpDue(contact.nextFollowUpAt)
                            ? "text-red-600"
                            : "text-blue-600"
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
                    <Star className="h-3.5 w-3.5" />
                    Priority
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const days = daysSince(contact.lastContactedAt);
                return (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="hover:underline"
                      >
                        {contact.name}
                      </Link>
                      {contact.email && (
                        <div className="text-xs text-muted-foreground">
                          {contact.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{contact.company ?? "—"}</TableCell>
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
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
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
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                        >
                          <Calendar className="h-3 w-3 inline" />{" "}
                          {formatFollowUpDate(contact.nextFollowUpAt)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.priorityScore !== null
                        ? contact.priorityScore
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
