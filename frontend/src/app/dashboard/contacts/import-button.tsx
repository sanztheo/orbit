"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type BtnVariant = "outline" | "default" | "ghost";
type BtnSize = "sm" | "default" | "lg";

export function ImportButton({
  label,
  variant = "outline",
  size = "sm",
}: { label?: string; variant?: BtnVariant; size?: BtnSize } = {}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!file) return;

    setLoading(true);
    setStatus(null);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/contacts/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const json: {
        imported?: number;
        skipped?: number;
        errors?: string[];
        message?: string;
      } = await res.json();
      if (!res.ok) {
        setStatus(json.message ?? "Import failed");
        return;
      }
      const msg = `Imported ${json.imported ?? 0}${json.skipped ? `, ${json.skipped} skipped` : ""}`;
      setStatus(msg);
      router.refresh();
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={buttonVariants({ variant, size }) + " disabled:opacity-50"}
      >
        {loading ? "Importing…" : (label ?? "Import CSV")}
      </button>
      {status && (
        <span className="text-xs text-muted-foreground">{status}</span>
      )}
    </div>
  );
}
