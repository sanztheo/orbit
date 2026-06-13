import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
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

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  company: string | null;
  type: ContactType;
  notes: string | null;
  lastContactedAt: string | null;
  priorityScore: number | null;
  createdAt: string;
  updatedAt: string;
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

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContactsPage() {
  const { getToken } = await auth();
  const token = await getToken();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/api/contacts`, {
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

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
          <p className="text-muted-foreground">
            No contacts yet — import from CSV or add one manually
          </p>
          <div className="flex gap-2">
            <Link
              href="/dashboard/contacts/new"
              className={buttonVariants({ variant: "default" })}
            >
              Add contact
            </Link>
            <Link
              href="/dashboard/contacts/import"
              className={buttonVariants({ variant: "outline" })}
            >
              Import CSV
            </Link>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last Contacted</TableHead>
              <TableHead>Priority Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  <div>{contact.name}</div>
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
                <TableCell>{formatDate(contact.lastContactedAt)}</TableCell>
                <TableCell>
                  {contact.priorityScore !== null ? contact.priorityScore : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
