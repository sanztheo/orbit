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
import { DeleteContactButton } from "./delete-button";
import { FollowUpDatePicker } from "./follow-up-date-picker";
import { InlineNotes } from "./inline-notes";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Building2,
  Clock,
  Calendar,
  Link2,
  ExternalLink,
  Users,
  ChevronRight,
} from "lucide-react";

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

  let companyContacts: { id: string; name: string; type: string }[] = [];
  if (contact.company) {
    const ccRes = await fetch(
      `${apiUrl}/api/contacts?company=${encodeURIComponent(contact.company)}&excludeId=${id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      },
    );
    if (ccRes.ok) {
      const ccJson: { data: { id: string; name: string; type: string }[] } =
        await ccRes.json();
      companyContacts = ccJson.data.slice(0, 5);
    }
  }

  const now = new Date();
  const staleDays = contact.lastContactedAt
    ? Math.floor(
        (now.getTime() - new Date(contact.lastContactedAt).getTime()) /
          86_400_000,
      )
    : null;
  const isStale = staleDays === null || staleDays >= 180;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/contacts"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Contacts
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold">{contact.name}</h1>
          <Badge variant="outline">{contact.type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <DeleteContactButton contactId={contact.id} />
          <Link
            href={`/dashboard/contacts/${contact.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* Staleness alert */}
      {isStale && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <div>
            <span className="font-medium">Data may be stale</span>
            {" — "}
            {staleDays === null
              ? "never contacted"
              : `no activity in ${staleDays} days`}
            .{" "}
            <Link
              href={`/dashboard/contacts/${contact.id}/edit`}
              className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
            >
              Verify or update info →
            </Link>
          </div>
        </div>
      )}

      {/* Completeness indicator */}
      {(() => {
        const fields = [
          { key: "email", done: !!contact.email, label: "Email" },
          { key: "company", done: !!contact.company, label: "Company" },
          { key: "linkedin", done: !!contact.linkedinUrl, label: "LinkedIn" },
          { key: "cadence", done: !!contact.cadenceDays, label: "Cadence" },
          {
            key: "activity",
            done: initialActivities.length > 0,
            label: "Activity logged",
          },
        ];
        const score = fields.filter((f) => f.done).length;
        if (score === 5) return null;
        return (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground shrink-0">
              Profile {score}/5
            </span>
            <div className="flex gap-1">
              {fields.map((f) => (
                <span
                  key={f.key}
                  title={f.label}
                  className={`h-2 w-6 rounded-full ${f.done ? "bg-emerald-500" : "bg-muted-foreground/20"}`}
                />
              ))}
            </div>
            <Link
              href={`/dashboard/contacts/${contact.id}/edit`}
              className="text-blue-600 hover:underline shrink-0"
            >
              Fill in {5 - score} missing →
            </Link>
          </div>
        );
      })()}

      {/* Info grid */}
      <div className="rounded-xl border border-border p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Email
          </p>
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="text-blue-600 hover:underline text-sm"
            >
              {contact.email}
            </a>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Company
          </p>
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
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last contacted
          </p>
          <p>{fmt(contact.lastContactedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Next follow-up
          </p>
          <FollowUpDatePicker
            contactId={contact.id}
            initialDate={contact.nextFollowUpAt}
          />
        </div>
        {contact.linkedinUrl && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              LinkedIn
            </p>
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
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Twitter
            </p>
            <p>@{contact.twitterHandle}</p>
          </div>
        )}
        <InlineNotes contactId={contact.id} initialNotes={contact.notes} />
      </div>

      {/* Cadence */}
      <div className="rounded-xl border border-border p-5">
        <CadencePicker
          contactId={contact.id}
          initialCadence={contact.cadenceDays}
        />
      </div>

      {/* Linked deals */}
      {linkedDeals.length === 0 && (
        <Link
          href={`/dashboard/deals/new?contactId=${contact.id}`}
          className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <span>◈</span>
          <span>Create a deal for {contact.name}</span>
        </Link>
      )}
      {linkedDeals.length > 0 && (
        <div className="rounded-xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Linked deals</h2>
            <Link
              href={`/dashboard/deals/new?contactId=${contact.id}`}
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

      {/* Others at same company */}
      {companyContacts.length > 0 && contact.company && (
        <div className="rounded-xl border border-border p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Others at {contact.company}
          </p>
          <div className="flex flex-col gap-1">
            {companyContacts.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/contacts/${c.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                  {c.type}
                  <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
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
