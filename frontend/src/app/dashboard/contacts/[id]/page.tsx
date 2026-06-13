import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FollowUpDraft } from "./follow-up-draft";
import { MeetingBrief } from "./meeting-brief";
import { AddToBacklog } from "./add-to-backlog";
import { CadencePicker } from "./cadence-picker";
import { ActivityLog } from "./activity-log";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: string;
  notes: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  cadenceDays: number | null;
  priorityScore: number | null;
  createdAt: string;
}

function fmt(val: string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/api/contacts/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!res.ok) notFound();

  const { data: contact }: { data: Contact } = await res.json();

  const tasksRes = await fetch(`${apiUrl}/api/tasks?contactId=${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const linkedTasks: {
    id: string;
    title: string;
    priority: string;
    status: string;
  }[] = tasksRes.ok ? (await tasksRes.json()).data : [];

  const activitiesRes = await fetch(
    `${apiUrl}/api/activities?contactId=${id}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  );
  const initialActivities: {
    id: string;
    type: "email" | "call" | "meeting" | "note" | "linkedin";
    subject: string | null;
    body: string | null;
    occurredAt: string;
  }[] = activitiesRes.ok ? (await activitiesRes.json()).data : [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/contacts"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Contacts
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold">{contact.name}</h1>
          <Badge variant="outline">{contact.type}</Badge>
        </div>
        <Link
          href={`/dashboard/contacts/${contact.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Edit
        </Link>
      </div>

      {/* Info grid */}
      <div className="rounded-xl border border-border p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <p>{contact.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Company</p>
          <p>{contact.company ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Last contacted</p>
          <p>{fmt(contact.lastContactedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Next follow-up</p>
          <p>{fmt(contact.nextFollowUpAt)}</p>
        </div>
        {contact.linkedinUrl && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">LinkedIn</p>
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {contact.linkedinUrl}
            </a>
          </div>
        )}
        {contact.twitterHandle && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Twitter</p>
            <p>@{contact.twitterHandle}</p>
          </div>
        )}
        {contact.notes && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Cadence */}
      <div className="rounded-xl border border-border p-5">
        <CadencePicker
          contactId={contact.id}
          initialCadence={contact.cadenceDays}
        />
      </div>

      {/* Activity timeline */}
      <ActivityLog
        contactId={contact.id}
        initialActivities={initialActivities}
      />

      {/* Pre-meeting brief */}
      <MeetingBrief contactId={contact.id} />

      {/* Backlog requests */}
      <AddToBacklog contactId={contact.id} initialTasks={linkedTasks} />

      {/* AI follow-up */}
      <FollowUpDraft contactId={contact.id} contactName={contact.name} />
    </div>
  );
}
