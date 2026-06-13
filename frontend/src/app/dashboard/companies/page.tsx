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
import { Building2, Users } from "lucide-react";

interface CompanyRow {
  company: string | null;
  contactCount: number;
  lastContactedAt: string | null;
  dealValue: number;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function healthColor(days: number | null): string {
  if (days === null) return "text-red-500 dark:text-red-400";
  if (days <= 14) return "text-green-600 dark:text-green-400";
  if (days <= 30) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export default async function CompaniesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const res = await fetch(`${apiUrl}/api/companies`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  let companies: CompanyRow[] = [];
  if (res.ok) {
    const json: { data: CompanyRow[] } = await res.json();
    companies = json.data;
  }

  const totalDealValue = companies.reduce((s, c) => s + c.dealValue, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight md:text-2xl">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Companies
          </h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} compan{companies.length !== 1 ? "ies" : "y"} ·{" "}
            {totalDealValue > 0 && (
              <span>${totalDealValue.toLocaleString()} pipeline</span>
            )}
          </p>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No companies yet — add a company to your contacts to see them here.
          </p>
          <Link
            href="/dashboard/contacts/new"
            className="text-sm font-medium hover:underline"
          >
            Add contact →
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile list */}
          <div className="flex flex-col gap-2 md:hidden">
            {companies.map((co) => {
              const days = daysSince(co.lastContactedAt);
              return (
                <Link
                  key={co.company}
                  href={`/dashboard/companies/${encodeURIComponent(co.company ?? "")}`}
                  className="flex items-start justify-between rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{co.company}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3" />
                      {co.contactCount} contact
                      {co.contactCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                    {co.dealValue > 0 && (
                      <span className="text-xs font-medium">
                        ${co.dealValue.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ${healthColor(days)}`}
                    >
                      {days === null
                        ? "never"
                        : days === 0
                          ? "today"
                          : `${days}d ago`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Pipeline value</TableHead>
                <TableHead>Last touched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((co) => {
                const days = daysSince(co.lastContactedAt);
                return (
                  <TableRow key={co.company} className="group">
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/companies/${encodeURIComponent(co.company ?? "")}`}
                        className="hover:underline"
                      >
                        {co.company}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {co.contactCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {co.dealValue > 0 ? (
                        <span className="font-medium">
                          ${co.dealValue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${healthColor(days)}`}
                      >
                        {days === null
                          ? "Never"
                          : days === 0
                            ? "Today"
                            : `${days}d ago`}
                      </span>
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
