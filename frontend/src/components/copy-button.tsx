"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  value: string;
  className?: string;
}

export function CopyButton({ value, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      title="Copy"
      className={`text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
