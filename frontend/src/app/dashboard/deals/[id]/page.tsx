import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  User,
  Link2,
  StickyNote,
  ChevronRight,
} from "lucide-react";
import { DealCloseButtons } from "./close-buttons";
import { DealActivityLog } from "./deal-activity-log";

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
  intro: "Intro",
  meeting: "Meeting",
  due_diligence: "Due Diligence",
  term_sheet: "Term Sheet",
};

const STAGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  closed_won: "default",
  closed_lost: "destructive",
  prospect: "secondary",
  qualified: "secondary",
  intro: "secondary",
};

function fmt(val: string | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  pipelineType: string;
  value: number | null;
  probability: number | null;
  expectedCloseAt: string | null;
  notes: string | null;
  nextAction: string | null;
  stageChangedAt: string;
  fundName: string | null;
  checkSize: number | null;
  portfolioUrl: string | null;
  contactId: string | null;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: string;
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(`${apiUrl}/api/deals/${id}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) notFound();

  const { data: deal }: { data: Deal } = await res.json();

  let contact: Contact | null = null;
  if (deal.contactId) {
    const cRes = await fetch(`${apiUrl}/api/contacts/${deal.contactId}`, {
      headers,
      cache: "no-store",
    });
    if (cRes.ok) {
      const cJson: { data: Contact } = await cRes.json();
      contact = cJson.data;
    }
  }

  const actsRes = await fetch(`${apiUrl}/api/activities?dealId=${id}`, {
    headers,
    cache: "no-store",
  });
  const initialActivities: {
    id: string;
    contactName: string | null;
    type: "email" | "call" | "meeting" | "note" | "linkedin";
    subject: string | null;
    body: string | null;
    occurredAt: string;
  }[] = actsRes.ok ? (await actsRes.json()).data : [];

  const stageAge = daysSince(deal.stageChangedAt);
  const isStale = stageAge !== null && stageAge >= 30;
  const isClosed = deal.stage === "closed_won" || deal.stage === "closed_lost";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/deals"
            className="text-muted-foreground hover:text-foreground mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold leading-tight">
              {deal.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STAGE_VARIANTS[deal.stage] ?? "outline"}>
                {STAGE_LABELS[deal.stage] ?? deal.stage.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {deal.pipelineType} pipeline
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/deals/${deal.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Value</p>
          <p className="font-semibold text-lg">
            {deal.value != null ? `$${deal.value.toLocaleString()}` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Probability</p>
          <p className="font-semibold text-lg">
            {deal.probability != null ? `${deal.probability}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Days in stage</p>
          <p
            className={`font-semibold text-lg ${isStale ? "text-red-600 dark:text-red-400" : ""}`}
          >
            {stageAge ?? "—"}
            {isStale && <span className="text-sm ml-1">⚠</span>}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Expected close</p>
          <p className="font-semibold text-sm">
            {deal.expectedCloseAt
              ? new Date(deal.expectedCloseAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>

      {/* Contact */}
      {contact && (
        <Link
          href={`/dashboard/contacts/${contact.id}`}
          className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{contact.name}</p>
              <p className="text-xs text-muted-foreground">
                {[contact.company, contact.email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Details */}
      <div className="rounded-xl border border-border p-5 flex flex-col gap-4 text-sm">
        {deal.nextAction && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Next step
              </p>
              <p className="font-medium">→ {deal.nextAction}</p>
            </div>
            <Separator />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Stage since
            </p>
            <p>{fmt(deal.stageChangedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created
            </p>
            <p>{fmt(deal.createdAt)}</p>
          </div>
        </div>

        {(deal.fundName || deal.checkSize || deal.portfolioUrl) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {deal.fundName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Fund
                  </p>
                  <p>{deal.fundName}</p>
                </div>
              )}
              {deal.checkSize && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Check size
                  </p>
                  <p>${deal.checkSize.toLocaleString()}</p>
                </div>
              )}
              {deal.portfolioUrl && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Portfolio
                  </p>
                  <a
                    href={deal.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    {deal.portfolioUrl}
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        {deal.notes && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                Notes
              </p>
              <p className="whitespace-pre-wrap text-sm">{deal.notes}</p>
            </div>
          </>
        )}
      </div>

      {/* Close actions */}
      {!isClosed && <DealCloseButtons dealId={deal.id} />}

      {/* Deal activity log */}
      <DealActivityLog
        dealId={deal.id}
        contactId={deal.contactId}
        initialActivities={initialActivities}
      />

      {contact && (
        <Link
          href={`/dashboard/contacts/${contact.id}`}
          className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
        >
          View full contact history for {contact.name} →
        </Link>
      )}
    </div>
  );
}
