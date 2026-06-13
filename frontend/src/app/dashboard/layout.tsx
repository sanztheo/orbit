import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { AiQuotaIndicator } from "./ai-quota-indicator";
import { QuickLog } from "./quick-log";
import { LogButton } from "./log-button";
import { ShortcutsHelp } from "./shortcuts-help";
import { MobileFab } from "./mobile-fab";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  BookOpen,
  Settings2,
  Building2,
  Calendar,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/dashboard/contacts", icon: Users },
  { label: "Companies", href: "/dashboard/companies", icon: Building2 },
  { label: "Follow-ups", href: "/dashboard/follow-ups", icon: Calendar },
  { label: "Deals", href: "/dashboard/deals", icon: Briefcase },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { label: "Backlog", href: "/dashboard/backlog", icon: BookOpen },
  { label: "Settings", href: "/dashboard/settings", icon: Settings2 },
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
      <KeyboardShortcuts />
      <GlobalSearch />
      <QuickLog />
      <ShortcutsHelp />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-muted/40 px-3 py-6">
        <div className="mb-8 px-2">
          <span className="text-lg font-semibold tracking-tight">Orbit</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-start",
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 px-2">
          <LogButton />
        </div>
        <div className="mt-auto flex flex-col gap-2 px-2 pt-4">
          <AiQuotaIndicator />
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background px-4 h-12">
        <span className="text-base font-semibold tracking-tight">Orbit</span>
        <ThemeToggle />
      </div>

      {/* Main content — extra top + bottom padding on mobile for bars */}
      <main className="flex flex-1 flex-col overflow-auto pt-12 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>

      <MobileFab />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
