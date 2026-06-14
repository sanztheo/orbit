"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyCombobox } from "@/components/company-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "investor", label: "Investor" },
  { value: "advisor", label: "Advisor" },
  { value: "partner", label: "Partner" },
];

export default function NewContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
          phone: phone.trim() || null,
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
      const { data } = await res.json();
      router.push(`/dashboard/contacts/${data.id}`);
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
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">New contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Primary fields — always visible */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>

        {/* Type pill picker */}
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
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

        {/* Completeness nudge */}
        {name.trim() && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[!!email, !!company, !!notes].map((done, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors ${done ? "bg-emerald-500" : "bg-muted-foreground/20"}`}
                />
              ))}
            </div>
            {(!email || !company || !notes) && (
              <span className="text-xs text-muted-foreground">
                {[!email && "email", !company && "company", !notes && "notes"]
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(", ")}{" "}
                improves AI context
              </span>
            )}
          </div>
        )}

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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">Company</Label>
              <CompanyCombobox
                id="company"
                value={company}
                onChange={setCompany}
                placeholder="Acme Inc."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context, how you met, what they care about…"
                rows={3}
                className="resize-none"
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
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add contact
              </>
            )}
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
