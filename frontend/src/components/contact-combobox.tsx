"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

interface ContactOption {
  id: string;
  name: string;
  company: string | null;
}

interface Props {
  id?: string;
  contactId: string | null;
  contactName: string;
  onChange: (name: string, id: string | null) => void;
  placeholder?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ContactCombobox({
  id,
  contactId: _contactId,
  contactName,
  onChange,
  placeholder = "Search contacts…",
}: Props) {
  const { getToken } = useAuth();
  const [results, setResults] = useState<ContactOption[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function search(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const token = await getToken();
    const res = await fetch(
      `${API_URL}/api/contacts?search=${encodeURIComponent(q)}&limit=8`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) return;
    const json: { data: ContactOption[] } = await res.json();
    setResults(json.data ?? []);
  }

  function handleChange(val: string) {
    onChange(val, null);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

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
        value={contactName}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (contactName) search(contactName);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c.name, c.id);
                setResults([]);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left transition-colors"
            >
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium">{c.name}</span>
              {c.company && (
                <span className="text-muted-foreground truncate">
                  · {c.company}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
