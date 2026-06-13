"use client";

import { PenLine } from "lucide-react";

interface Props {
  contactId: string;
  contactName: string;
}

export function ContactLogButton({ contactId, contactName }: Props) {
  function dispatch(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("orbit:quick-log", {
        detail: { id: contactId, name: contactName },
      }),
    );
  }

  return (
    <button
      onClick={dispatch}
      title={`Log activity for ${contactName}`}
      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
    >
      <PenLine className="h-3.5 w-3.5" />
    </button>
  );
}
