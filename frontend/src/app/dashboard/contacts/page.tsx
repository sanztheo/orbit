import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ContactFilters } from "./contact-filters";
import { ExportButton } from "./export-button";
import { ExportAllButton } from "./export-all-button";
import { ContactsTable } from "./contacts-table";
import { UserPlus, Users, Sparkles, Upload } from "lucide-react";

import type { ContactRow } from "./contacts-table";

interface ContactsResponse {
  data: ContactRow[];
  total: number;
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

  let contacts: ContactRow[] = [];
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
          <Link
            href="/dashboard/contacts/import"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Link>
          <ExportButton />
          <ExportAllButton />
          <Link
            href="/dashboard/contacts/from-signature"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            From signature
          </Link>
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
        <div className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-sm">
          <span className="text-amber-900 dark:text-amber-200">
            <span className="font-semibold">{staleCount}</span> contact
            {staleCount !== 1 ? "s" : ""} not touched in 180+ days — verify or
            reach out.
          </span>
          <Link
            href="/dashboard/contacts?stale=1"
            className="ml-4 shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
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
              <Link
                href="/dashboard/contacts/import"
                className={buttonVariants({ variant: "outline" })}
              >
                Import CSV
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ContactsTable contacts={contacts} />
      )}
    </div>
  );
}
