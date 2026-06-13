"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus, User, Briefcase, X } from "lucide-react";

export function MobileFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function logActivity() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("orbit:quick-log"));
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action menu */}
      {open && (
        <div className="md:hidden fixed bottom-20 right-4 z-50 flex flex-col gap-2 items-end">
          <button
            onClick={logActivity}
            className="flex items-center gap-2 rounded-full border border-border bg-card shadow-lg px-4 py-2 text-sm font-medium"
          >
            <PenLine className="h-4 w-4" />
            Log activity
          </button>
          <button
            onClick={() => go("/dashboard/contacts/new")}
            className="flex items-center gap-2 rounded-full border border-border bg-card shadow-lg px-4 py-2 text-sm font-medium"
          >
            <User className="h-4 w-4" />
            New contact
          </button>
          <button
            onClick={() => go("/dashboard/deals/new")}
            className="flex items-center gap-2 rounded-full border border-border bg-card shadow-lg px-4 py-2 text-sm font-medium"
          >
            <Briefcase className="h-4 w-4" />
            New deal
          </button>
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden fixed bottom-[72px] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform active:scale-95"
        aria-label="Quick actions"
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </>
  );
}
