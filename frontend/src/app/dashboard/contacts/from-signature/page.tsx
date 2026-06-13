"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ContactType = "lead" | "customer" | "investor" | "advisor" | "partner";
const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "investor", label: "Investor" },
  { value: "advisor", label: "Advisor" },
  { value: "partner", label: "Partner" },
];

interface Extracted {
  name: string;
  email: string;
  title: string;
  company: string;
  linkedinUrl: string;
}

export default function FromSignaturePage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [type, setType] = useState<ContactType>("lead");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleExtract() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/ai/parse-signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: rawText.trim() }),
      });
      const json: { extracted?: Extracted; message?: string } =
        await res.json();
      if (!res.ok) {
        setExtractError(json.message ?? "Extraction failed");
        return;
      }
      const e: Partial<Extracted> = json.extracted ?? {};
      setName((e.name ?? "").trim());
      setEmail((e.email ?? "").trim());
      setTitle((e.title ?? "").trim());
      setCompany((e.company ?? "").trim());
      setLinkedinUrl((e.linkedinUrl ?? "").trim());
      setStep("review");
    } catch {
      setExtractError("Network error — is the backend running?");
    } finally {
      setExtracting(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const notes = title.trim() ? title.trim() : null;
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
          notes,
          linkedinUrl: linkedinUrl.trim() || null,
        }),
      });
      const body: { data?: { id: string }; message?: string } =
        await res.json();
      if (!res.ok) {
        setCreateError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      router.push(`/dashboard/contacts/${body.data!.id}`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create contact",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/contacts"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Contacts
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">From signature</h1>
      </div>

      {step === "input" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Paste an email signature, email body, or LinkedIn bio — Claude will
            extract the contact details.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig">Email / signature text</Label>
            <Textarea
              id="sig"
              rows={8}
              autoFocus
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Jane Doe\nVP of Engineering at Acme Corp\njane@acme.com | linkedin.com/in/janedoe\n\n—\nSent from my iPhone`}
            />
          </div>
          {extractError && (
            <p className="text-sm text-destructive">{extractError}</p>
          )}
          <Button
            onClick={handleExtract}
            disabled={extracting || !rawText.trim()}
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract contact info
              </>
            )}
          </Button>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Review and edit the extracted fields before creating the contact.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="title">Title (saved as notes)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VP of Engineering"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
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

          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create contact
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep("input");
                setCreateError(null);
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
