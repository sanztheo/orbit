"use client";

import { PenLine } from "lucide-react";

export function LogButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("orbit:quick-log"))}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
    >
      <PenLine className="h-3.5 w-3.5 shrink-0" />
      <span>Log activity</span>
      <kbd className="ml-auto rounded border border-border bg-muted px-1 text-[10px] font-mono">
        L
      </kbd>
    </button>
  );
}
