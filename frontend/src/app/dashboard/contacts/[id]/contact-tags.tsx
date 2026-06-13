"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { X, Tag, Plus } from "lucide-react";

interface Props {
  contactId: string;
  initialTags: string[];
}

export function ContactTags({ contactId, initialTags }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadTags() {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/contacts/tags`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json: { data: string[] } = await res.json();
        setSuggestions(json.data);
      }
    }
    loadTags();
  }, [getToken]);

  async function saveTags(next: string[]) {
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    await fetch(`${apiUrl}/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tags: next }),
    });
    startTransition(() => router.refresh());
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || tags.includes(tag) || tags.length >= 20) return;
    const next = [...tags, tag];
    setTags(next);
    saveTags(next);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveTags(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const filtered = input.trim()
    ? suggestions.filter(
        (s) => s.includes(input.toLowerCase()) && !tags.includes(s),
      )
    : suggestions.filter((s) => !tags.includes(s)).slice(0, 8);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Tag className="h-3 w-3" />
        Tags
      </p>
      <div
        className="flex flex-wrap gap-1.5 items-center min-h-[32px] rounded-md border border-border bg-background px-2 py-1.5 cursor-text focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) {
              addTag(input);
              setInput("");
            }
          }}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          disabled={isPending}
        />
        {tags.length === 0 && (
          <Plus className="h-3 w-3 text-muted-foreground pointer-events-none" />
        )}
      </div>
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
                setInput("");
              }}
              className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-1">
        Enter or comma to add · Backspace to remove
      </p>
    </div>
  );
}
