"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "investor", label: "Investor" },
  { value: "advisor", label: "Advisor" },
  { value: "partner", label: "Partner" },
];

const INPUT =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function NewContactPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<ContactType>("lead");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDuplicateId(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_URL}/api/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          company: company.trim() || null,
          type,
          notes: notes.trim() || null,
        }),
      });
      if (res.status === 409) {
        const body: { message: string; existingId: string } = await res.json();
        setError(body.message);
        setDuplicateId(body.existingId);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? `HTTP ${res.status}`,
        );
      }
      router.push("/dashboard/contacts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/contacts"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">New contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Primary fields — always visible */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className={INPUT}
          />
        </div>

        {/* Type pill picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Type</label>
          <div className="flex flex-wrap gap-2">
            {CONTACT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  type === t.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional fields toggle */}
        {!showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="self-start text-xs text-muted-foreground hover:text-foreground"
          >
            + Company, notes, LinkedIn…
          </button>
        )}

        {showMore && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company" className="text-sm font-medium">
                Company
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className={INPUT}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context, how you met, what they care about…"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {error}
            {duplicateId && (
              <>
                {" — "}
                <Link
                  href={`/dashboard/contacts/${duplicateId}`}
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  View existing →
                </Link>
              </>
            )}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-11 flex-1 md:flex-none"
          >
            {submitting ? "Saving…" : "Add contact"}
          </Button>
          <Link
            href="/dashboard/contacts"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 flex-1 md:flex-none",
            )}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
