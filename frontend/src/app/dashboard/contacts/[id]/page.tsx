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
import { ColdStart } from "./cold-start";

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

  const [activitiesRes, dealsRes] = await Promise.all([
    fetch(`${apiUrl}/api/activities?contactId=${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    }),
    fetch(`${apiUrl}/api/deals?contactId=${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    }),
  ]);
  const initialActivities: {
    id: string;
    type: "email" | "call" | "meeting" | "note" | "linkedin";
    subject: string | null;
    body: string | null;
    occurredAt: string;
  }[] = activitiesRes.ok ? (await activitiesRes.json()).data : [];
  const linkedDeals: {
    id: string;
    title: string;
    stage: string;
    value: number | null;
    pipelineType: string;
  }[] = dealsRes.ok ? (await dealsRes.json()).data : [];

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

      {/* Staleness alert */}
      {(() => {
        const days = contact.lastContactedAt
          ? Math.floor(
              (Date.now() - new Date(contact.lastContactedAt).getTime()) /
                86_400_000,
            )
          : null;
        if (days === null || days >= 180) {
          return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <div>
                <span className="font-medium">Data may be stale</span>
                {" — "}
                {days === null
                  ? "never contacted"
                  : `no activity in ${days} days`}
                .{" "}
                <Link
                  href={`/dashboard/contacts/${contact.id}/edit`}
                  className="underline underline-offset-2 hover:text-amber-900"
                >
                  Verify or update info →
                </Link>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Info grid */}
      <div className="rounded-xl border border-border p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <p>{contact.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Company</p>
          {contact.company ? (
            <div className="flex items-center gap-2">
              <p>{contact.company}</p>
              <Link
                href={`/dashboard/contacts?search=${encodeURIComponent(contact.company)}`}
                className="text-xs text-blue-600 hover:underline shrink-0"
              >
                others →
              </Link>
            </div>
          ) : (
            <p>—</p>
          )}
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

      {/* Linked deals */}
      {linkedDeals.length > 0 && (
        <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Linked deals</h2>
            <Link
              href="/dashboard/deals/new"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + New deal
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {linkedDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{deal.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {deal.stage.replace(/_/g, " ")} · {deal.pipelineType}
                  </p>
                </div>
                {deal.value != null && (
                  <span className="shrink-0 ml-2 text-xs font-medium text-emerald-700">
                    ${deal.value.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      <ActivityLog
        contactId={contact.id}
        initialActivities={initialActivities}
      />

      {/* Cold start — first-touch outreach */}
      {initialActivities.length === 0 && <ColdStart contactId={contact.id} />}

      {/* Pre-meeting brief */}
      <MeetingBrief contactId={contact.id} />

      {/* Backlog requests */}
      <AddToBacklog contactId={contact.id} initialTasks={linkedTasks} />

      {/* AI follow-up */}
      <FollowUpDraft contactId={contact.id} contactName={contact.name} />
    </div>
  );
}
