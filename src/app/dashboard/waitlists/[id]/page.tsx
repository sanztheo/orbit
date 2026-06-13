import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Globe, Copy, TrendingUp, Download } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WaitlistDetailPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  // Fetch waitlist and verify ownership
  const [waitlist] = await db
    .select()
    .from(waitlists)
    .where(and(eq(waitlists.id, id), eq(waitlists.userId, userId)))
    .limit(1);

  if (!waitlist) notFound();

  // Fetch all subscribers ordered by position
  const waitlistSubscribers = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.waitlistId, id))
    .orderBy(subscribers.position);

  const totalSubscribers = waitlistSubscribers.length;

  // Compute total referrals
  const totalReferrals = waitlistSubscribers.reduce(
    (sum, s) => sum + s.referralCount,
    0,
  );

  // Compute status breakdown
  const waitingCount = waitlistSubscribers.filter(
    (s) => s.status === "waiting",
  ).length;
  const invitedCount = waitlistSubscribers.filter(
    (s) => s.status === "invited",
  ).length;

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/w/${waitlist.slug}`;

  function statusBadge(status: string) {
    if (status === "invited")
      return (
        <Badge
          variant="outline"
          className="border-blue-500 text-blue-600 bg-blue-50"
        >
          Invited
        </Badge>
      );
    if (status === "removed") return <Badge variant="secondary">Removed</Badge>;
    return (
      <Badge
        variant="outline"
        className="border-green-500 text-green-600 bg-green-50"
      >
        Waiting
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {waitlist.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            /w/{waitlist.slug}
          </p>
        </div>
        {waitlist.isActive ? (
          <Badge
            variant="outline"
            className="border-green-500 text-green-600 bg-green-50"
          >
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </div>

      {/* Public URL info */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Public URL</p>
          <p className="text-sm font-mono truncate">{publicUrl}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none shrink-0">
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Copy</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Subscribers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              <span className="text-2xl font-bold text-foreground">
                {totalSubscribers}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Referrals
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              <span className="text-2xl font-bold text-foreground">
                {totalReferrals}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Waiting
              </CardTitle>
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <CardDescription>
              <span className="text-2xl font-bold text-foreground">
                {waitingCount}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Invited
              </CardTitle>
              <span className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <CardDescription>
              <span className="text-2xl font-bold text-foreground">
                {invitedCount}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Subscribers table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Subscribers</h2>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/waitlists/${id}/export`} download>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </a>
          </Button>
        </div>

        {waitlistSubscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No subscribers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Share your public URL to start collecting sign-ups.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistSubscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sub.position}
                    </TableCell>
                    <TableCell className="font-medium">{sub.email}</TableCell>
                    <TableCell>
                      {sub.referralCount > 0 ? (
                        <span className="text-green-600 font-medium">
                          +{sub.referralCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {sub.joinedAt.toLocaleDateString("en-US", {
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
    </div>
  );
}
