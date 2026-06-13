import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContactLogButton } from "@/app/dashboard/contacts/contact-log-button";

interface FollowUpContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  type: string;
  nextFollowUpAt: string;
  lastContactedAt: string | null;
  cadenceDays: number | null;
  tags: string[];
}

function daysDiff(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function relativeLabel(diff: number): string {
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff}d`;
}

function healthScore(contact: FollowUpContact): number {
  const days = contact.lastContactedAt
    ? Math.floor(
        (Date.now() - new Date(contact.lastContactedAt).getTime()) / 86_400_000,
      )
    : null;
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
  const followUpDiff = daysDiff(contact.nextFollowUpAt);
  if (followUpDiff < 0) score = Math.max(0, score - 15);
  else score = Math.min(100, score + 5);
  if (contact.cadenceDays && days !== null && days > contact.cadenceDays * 1.5)
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

interface Group {
  label: string;
  contacts: (FollowUpContact & { diff: number })[];
  headerClass: string;
}

export default async function FollowUpsPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const res = await fetch(
    `${apiUrl}/api/contacts?hasFollowUp=1&sort=next_follow_up&limit=200`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  );

  let contacts: FollowUpContact[] = [];
  if (res.ok) {
    const json: { data: FollowUpContact[] } = await res.json();
    contacts = json.data;
  }

  const withDiff = contacts.map((c) => ({
    ...c,
    diff: daysDiff(c.nextFollowUpAt),
  }));

  const groups: Group[] = [
    {
      label: "Overdue",
      contacts: withDiff
        .filter((c) => c.diff < 0)
        .sort((a, b) => a.diff - b.diff),
      headerClass: "text-red-600 dark:text-red-400",
    },
    {
      label: "Today",
      contacts: withDiff.filter((c) => c.diff === 0),
      headerClass: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "This week",
      contacts: withDiff.filter((c) => c.diff >= 1 && c.diff <= 6),
      headerClass: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Later",
      contacts: withDiff.filter((c) => c.diff >= 7),
      headerClass: "text-muted-foreground",
    },
  ].filter((g) => g.contacts.length > 0);

  const overdueCount = withDiff.filter((c) => c.diff < 0).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight md:text-2xl">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Follow-ups
        </h1>
        <p className="text-sm text-muted-foreground">
          {contacts.length} scheduled
          {overdueCount > 0 && (
            <span className="ml-1 text-red-600 dark:text-red-400 font-medium">
              · {overdueCount} overdue
            </span>
          )}
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No follow-ups scheduled</p>
          <Link
            href="/dashboard/contacts"
            className="text-sm font-medium hover:underline"
          >
            Go to contacts →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2
                className={`text-xs font-semibold uppercase tracking-wider mb-2 ${group.headerClass}`}
              >
                {group.label} · {group.contacts.length}
              </h2>
              <div className="flex flex-col gap-1 rounded-xl border border-border overflow-hidden">
                {group.contacts.map((contact, i) => {
                  const score = healthScore(contact);
                  return (
                    <div
                      key={contact.id}
                      className={`group flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${
                        i > 0 ? "border-t border-border" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/contacts/${contact.id}`}
                            className="font-medium hover:underline text-sm"
                          >
                            {contact.name}
                          </Link>
                          {contact.company && (
                            <span className="text-xs text-muted-foreground">
                              {contact.company}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-4"
                          >
                            {contact.type}
                          </Badge>
                        </div>
                        {contact.tags.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {contact.tags.slice(0, 3).map((t) => (
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
                        <span
                          className={`text-xs font-medium ${
                            contact.diff < 0
                              ? "text-red-600 dark:text-red-400"
                              : contact.diff === 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {relativeLabel(contact.diff)}
                        </span>
                        <span
                          className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColor(score)}`}
                        >
                          {score}
                        </span>
                        <ContactLogButton
                          contactId={contact.id}
                          contactName={contact.name}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
