import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ArrowLeft, Briefcase, Plus } from "lucide-react";

interface CompanyContact {
  id: string;
  name: string;
  email: string | null;
  type: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  cadenceDays: number | null;
  tags: string[];
}

interface CompanyDeal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  contactName: string | null;
  stageChangedAt: string;
}

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function healthScore(
  lastContactedAt: string | null,
  nextFollowUpAt: string | null,
  cadenceDays: number | null,
): number {
  const days = daysSince(lastContactedAt);
  let score =
    days === null
      ? 12
      : days === 0
        ? 100
        : days <= 7
          ? 95
          : days <= 14
            ? 85
            : days <= 30
              ? 70
              : days <= 60
                ? 50
                : days <= 90
                  ? 35
                  : days <= 180
                    ? 20
                    : 8;
  if (nextFollowUpAt) {
    const diff = Math.ceil(
      (new Date(nextFollowUpAt).getTime() - Date.now()) / 86_400_000,
    );
    if (diff < 0) score = Math.max(0, score - 15);
    else score = Math.min(100, score + 5);
  }
  if (cadenceDays && days !== null && days > cadenceDays * 1.5)
    score = Math.max(0, score - 10);
  return Math.max(0, Math.min(100, score));
}

function scoreColor(score: number): string {
  if (score >= 80)
    return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
  if (score >= 60)
    return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
  if (score >= 40)
    return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
  return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
}

function stageColor(stage: string): string {
  if (stage === "closed_won")
    return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
  if (stage === "closed_lost") return "text-muted-foreground bg-muted";
  return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: encodedName } = await params;
  const companyName = decodeURIComponent(encodedName);

  const { getToken } = await auth();
  const token = await getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const [contactsRes, dealsRes] = await Promise.all([
    fetch(
      `${apiUrl}/api/contacts?company=${encodeURIComponent(companyName)}&limit=100`,
      { headers, cache: "no-store" },
    ),
    fetch(`${apiUrl}/api/deals?company=${encodeURIComponent(companyName)}`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!contactsRes.ok) notFound();

  const contacts: CompanyContact[] = contactsRes.ok
    ? (await contactsRes.json()).data
    : [];
  const allDeals: CompanyDeal[] = dealsRes.ok
    ? (await dealsRes.json()).data
    : [];

  if (contacts.length === 0) notFound();

  const openDeals = allDeals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
  );
  const wonDeals = allDeals.filter((d) => d.stage === "closed_won");
  const totalPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const totalWon = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/companies"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Companies
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight md:text-2xl">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          {companyName}
        </h1>
        <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </span>
          {totalPipeline > 0 && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />$
              {totalPipeline.toLocaleString()} open pipeline
            </span>
          )}
          {totalWon > 0 && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ${totalWon.toLocaleString()} won
            </span>
          )}
        </div>
      </div>

      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">
            Contacts · {contacts.length}
          </h2>
          <Link
            href={`/dashboard/contacts/new`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add contact
          </Link>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border overflow-hidden">
          {contacts.map((c, i) => {
            const score = healthScore(
              c.lastContactedAt,
              c.nextFollowUpAt,
              c.cadenceDays,
            );
            const days = daysSince(c.lastContactedAt);
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/contacts/${c.id}`}
                      className="font-medium text-sm hover:underline"
                    >
                      {c.name}
                    </Link>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {c.type}
                    </Badge>
                  </div>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {c.email}
                    </a>
                  )}
                  {c.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {days === null
                      ? "Never"
                      : days === 0
                        ? "Today"
                        : `${days}d ago`}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColor(score)}`}
                  >
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deals */}
      {allDeals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Deals · {allDeals.length}</h2>
            <Link
              href="/dashboard/deals/new"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New deal
            </Link>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-border overflow-hidden">
            {allDeals.map((deal, i) => (
              <Link
                key={deal.id}
                href={`/dashboard/deals/${deal.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{deal.title}</p>
                  {deal.contactName && (
                    <p className="text-xs text-muted-foreground">
                      {deal.contactName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {deal.value != null && deal.value > 0 && (
                    <span className="text-sm font-medium">
                      ${deal.value.toLocaleString()}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 ${stageColor(deal.stage)}`}
                  >
                    {STAGE_LABELS[deal.stage] ?? deal.stage}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {allDeals.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
          <Link
            href="/dashboard/deals/new"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            + Create a deal for {companyName}
          </Link>
        </div>
      )}
    </div>
  );
}
