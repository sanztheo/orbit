"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Module-level cache — fetched once per session per workspace
let cached: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function loadCompanies(token: string | null): Promise<string[]> {
  if (cached) return cached;
  if (!fetchPromise) {
    fetchPromise = fetch(`${API_URL}/api/companies`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json: { data: { company: string }[] }) => {
        cached = json.data.map((r) => r.company).filter(Boolean) as string[];
        return cached;
      })
      .catch(() => {
        fetchPromise = null;
        return [];
      });
  }
  return fetchPromise;
}

export function CompanyCombobox({
  id,
  value,
  onChange,
  placeholder = "Company",
  className,
}: Props) {
  const { getToken } = useAuth();
  const [companies, setCompanies] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function ensureLoaded() {
    if (companies.length > 0) return;
    const token = await getToken();
    const list = await loadCompanies(token);
    setCompanies(list);
  }

  const suggestions = companies.filter(
    (c) =>
      c.toLowerCase().includes(value.toLowerCase()) &&
      c.toLowerCase() !== value.toLowerCase(),
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={async () => {
          await ensureLoaded();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {suggestions.slice(0, 8).map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left transition-colors"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
