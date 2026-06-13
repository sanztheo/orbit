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

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: ContactType;
  notes: string | null;
  lastContactedAt: string | null;
  priorityScore: number | null;
  createdAt: string;
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
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const { getToken } = await auth();
  const token = await getToken();
  const { search, type } = await searchParams;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (type) qs.set("type", type);

  const res = await fetch(`${apiUrl}/api/contacts?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  let contacts: Contact[] = [];
  if (res.ok) {
    const json: ContactsResponse = await res.json();
    contacts = json.data;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/contacts/new"
          className={buttonVariants({ variant: "default" })}
        >
          Add contact
        </Link>
      </div>

      <Suspense>
        <ContactFilters />
      </Suspense>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
          <p className="text-muted-foreground">
            {search || type
              ? "No contacts match your filter"
              : "No contacts yet — import from CSV or add one manually"}
          </p>
          {!search && !type && (
            <Link
              href="/dashboard/contacts/new"
              className={buttonVariants({ variant: "default" })}
            >
              Add contact
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last contacted</TableHead>
              <TableHead>Priority</TableHead>
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
                    <div className="text-xs text-muted-foreground">
                      {formatDate(contact.lastContactedAt)}
                    </div>
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
      )}
    </div>
  );
}
