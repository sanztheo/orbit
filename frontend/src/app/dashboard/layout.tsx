import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "Contacts", href: "/dashboard/contacts", icon: "◎" },
  { label: "Deals", href: "/dashboard/deals", icon: "◈" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "☑" },
  { label: "Backlog", href: "/dashboard/backlog", icon: "▤" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-muted/40 px-3 py-6">
        <div className="mb-8 px-2">
          <span className="text-lg font-semibold tracking-tight">Orbit</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "justify-start",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background px-4 h-12">
        <span className="text-base font-semibold tracking-tight">Orbit</span>
      </div>

      {/* Main content — extra top + bottom padding on mobile for bars */}
      <main className="flex flex-1 flex-col overflow-auto pt-12 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
