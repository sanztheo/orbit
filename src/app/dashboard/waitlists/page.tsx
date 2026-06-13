import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, List } from "lucide-react";

export default async function WaitlistsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fetch waitlists with subscriber counts in one query
  const rows = await db
    .select({
      id: waitlists.id,
      name: waitlists.name,
      slug: waitlists.slug,
      isActive: waitlists.isActive,
      createdAt: waitlists.createdAt,
      subscriberCount: sql<number>`count(${subscribers.id})::int`,
    })
    .from(waitlists)
    .leftJoin(subscribers, eq(subscribers.waitlistId, waitlists.id))
    .where(eq(waitlists.userId, userId))
    .groupBy(
      waitlists.id,
      waitlists.name,
      waitlists.slug,
      waitlists.isActive,
      waitlists.createdAt,
    )
    .orderBy(waitlists.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Waitlists</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your waitlist campaigns.
          </p>
        </div>
        <Link href="/dashboard/waitlists/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Waitlist
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <List className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No waitlists yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first waitlist to start collecting subscribers.
          </p>
          <Link href="/dashboard/waitlists/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Waitlist
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/waitlists/${w.id}`}
                      className="hover:underline text-foreground"
                    >
                      {w.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {w.slug}
                  </TableCell>
                  <TableCell>{w.subscriberCount}</TableCell>
                  <TableCell>
                    {w.isActive ? (
                      <Badge
                        variant="outline"
                        className="border-green-500 text-green-600 bg-green-50"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {w.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
