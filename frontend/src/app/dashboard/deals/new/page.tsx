"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STAGES = [
  { value: "prospect", label: "Prospect" },
  { value: "contacted", label: "Contacted" },
  { value: "meeting", label: "Meeting" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

const PIPELINE_TYPES = [
  { value: "sales", label: "Sales" },
  { value: "fundraising", label: "Fundraising" },
  { value: "partnership", label: "Partnership" },
];

interface Contact {
  id: string;
  name: string;
  company: string | null;
}

export default function NewDealPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<string>(
    searchParams.get("contactId") ?? "",
  );
  const [pipelineType, setPipelineType] = useState("sales");

  useEffect(() => {
    getToken().then((token) => {
      if (!token) return;
      apiClient
        .get<{ data: Contact[] }>("/api/contacts", token)
        .then((res) => setContacts(res.data))
        .catch(() => {});
    });
  }, [getToken]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    if (!title.trim()) return;

    const valueRaw = fd.get("value") as string;
    const checkSizeRaw = fd.get("checkSize") as string;
    const body = {
      title: title.trim(),
      pipelineType: pipelineType || "sales",
      stage: (fd.get("stage") as string) || "prospect",
      ...(valueRaw ? { value: Number(valueRaw) } : {}),
      notes: (fd.get("notes") as string) || undefined,
      ...(contactId ? { contactId } : {}),
      ...(pipelineType === "fundraising"
        ? {
            fundName: (fd.get("fundName") as string) || undefined,
            checkSize: checkSizeRaw ? Number(checkSizeRaw) : undefined,
            portfolioUrl: (fd.get("portfolioUrl") as string) || undefined,
          }
        : {}),
    };

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await apiClient.post("/api/deals", body, token);
      router.push("/dashboard/deals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold">New deal</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            placeholder="Acme Corp — Series A"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pipelineType">Pipeline type</Label>
          <select
            id="pipelineType"
            name="pipelineType"
            value={pipelineType}
            onChange={(e) => setPipelineType(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PIPELINE_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage">Stage</Label>
          <select
            id="stage"
            name="stage"
            defaultValue="prospect"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">Value ($)</Label>
          <Input
            id="value"
            name="value"
            type="number"
            min="0"
            placeholder="25000"
          />
        </div>
        {contacts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactId">Contact (optional)</Label>
            <select
              id="contactId"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— None —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {pipelineType === "fundraising" && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Investor fields
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundName">Fund name</Label>
              <Input
                id="fundName"
                name="fundName"
                placeholder="Sequoia Capital"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkSize">Target check size ($)</Label>
              <Input
                id="checkSize"
                name="checkSize"
                type="number"
                min="0"
                placeholder="500000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="portfolioUrl">Portfolio / website</Label>
              <Input
                id="portfolioUrl"
                name="portfolioUrl"
                type="url"
                placeholder="https://sequoiacap.com"
              />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Context, next steps…"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create deal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/deals")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
