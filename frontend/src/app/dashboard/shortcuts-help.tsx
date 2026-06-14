"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { key: "N", label: "New contact" },
  { key: "D", label: "New deal" },
  { key: "B", label: "New task" },
  { key: "L", label: "Log activity" },
  { key: "/", label: "Search" },
  { key: "?", label: "Show shortcuts" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div className="relative w-full max-w-xs rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Keyboard shortcuts</span>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="flex flex-col gap-0.5 p-3">
          {SHORTCUTS.map(({ key, label }) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
            >
              <span className="text-muted-foreground">{label}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
                {key}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1 font-mono">
            ?
          </kbd>{" "}
          to toggle
        </p>
      </div>
    </div>
  );
}
