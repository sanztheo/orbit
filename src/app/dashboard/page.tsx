import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { waitlists, subscribers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { List, Users } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fetch all waitlists owned by user
  const userWaitlists = await db
    .select({ id: waitlists.id })
    .from(waitlists)
    .where(eq(waitlists.userId, userId));

  const waitlistCount = userWaitlists.length;

  // Fetch total subscriber count across all user waitlists
  let subscriberCount = 0;
  if (waitlistCount > 0) {
    const waitlistIds = userWaitlists.map((w) => w.id);
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(
        sql`${subscribers.waitlistId} = ANY(ARRAY[${sql.join(
          waitlistIds.map((id) => sql`${id}`),
          sql`, `,
        )}]::text[])`,
      );
    subscriberCount = result?.count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your waitlists and subscribers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Waitlists
              </CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">
                {waitlistCount}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active waitlist campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Subscribers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">
                {subscriberCount}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all waitlists
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
