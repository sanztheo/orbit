"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyCombobox } from "@/components/company-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "investor", label: "Investor" },
  { value: "advisor", label: "Advisor" },
  { value: "partner", label: "Partner" },
];

export default function EditContactPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<ContactType>("lead");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setLoadError("Contact not found");
        return;
      }
      const { data } = await res.json();
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setType(data.type ?? "lead");
      setCompany(data.company ?? "");
      setNotes(data.notes ?? "");
      setLinkedinUrl(data.linkedinUrl ?? "");
      setLoaded(true);
    }
    load();
  }, [id, getToken]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await apiClient.patch(
        `/api/contacts/${id}`,
        {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          type,
          notes: notes.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
        },
        token,
      );
      router.push(`/dashboard/contacts/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{loadError}</p>
        <Link
          href="/dashboard/contacts"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="inline h-3 w-3 mr-1" />
          Back to contacts
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/contacts/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Edit contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-4 border-t border-border pt-4">
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
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/jane"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, how you met, what they care about…"
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-11 flex-1 md:flex-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
          <Link
            href={`/dashboard/contacts/${id}`}
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
