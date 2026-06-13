"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  { value: "closed_won", label: "Won ✓" },
  { value: "closed_lost", label: "Lost ✗" },
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

interface Deal {
  id: string;
  title: string;
  pipelineType: string;
  stage: string;
  value: number | null;
  probability: number | null;
  expectedCloseAt: string | null;
  notes: string | null;
  nextAction: string | null;
  contactId: string | null;
}

export default function EditDealPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [contactId, setContactId] = useState<string>("");

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const [dealRes, contactsRes] = await Promise.all([
        apiClient.get<{ data: Deal }>(`/api/deals/${id}`, token),
        apiClient.get<{ data: Contact[] }>("/api/contacts", token),
      ]);
      setDeal(dealRes.data);
      setContactId(dealRes.data.contactId ?? "");
      setContacts(contactsRes.data);
      setFetching(false);
    }
    load().catch(() => setFetching(false));
  }, [getToken, id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deal) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    if (!title.trim()) return;

    const valueRaw = fd.get("value") as string;
    const probabilityRaw = fd.get("probability") as string;
    const expectedCloseAtRaw = fd.get("expectedCloseAt") as string;
    const body = {
      title: title.trim(),
      pipelineType: (fd.get("pipelineType") as string) || "sales",
      stage: (fd.get("stage") as string) || "prospect",
      value: valueRaw ? Number(valueRaw) : null,
      probability: probabilityRaw ? Number(probabilityRaw) : null,
      expectedCloseAt: expectedCloseAtRaw || null,
      notes: (fd.get("notes") as string) || null,
      nextAction: (fd.get("nextAction") as string) || null,
      contactId: contactId || null,
    };

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await apiClient.patch(`/api/deals/${id}`, body, token);
      router.push("/dashboard/deals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deal");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Deal not found.</div>
    );
  }

  const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="mx-auto w-full max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold">Edit deal</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            defaultValue={deal.title}
            placeholder="Acme Corp — Series A"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pipelineType">Pipeline type</Label>
          <select
            id="pipelineType"
            name="pipelineType"
            defaultValue={deal.pipelineType}
            className={sel}
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
            defaultValue={deal.stage}
            className={sel}
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="value">Value ($)</Label>
            <Input
              id="value"
              name="value"
              type="number"
              min="0"
              defaultValue={deal.value ?? ""}
              placeholder="25000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="probability">Probability (%)</Label>
            <Input
              id="probability"
              name="probability"
              type="number"
              min="0"
              max="100"
              defaultValue={deal.probability ?? ""}
              placeholder="50"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expectedCloseAt">Expected close date</Label>
          <Input
            id="expectedCloseAt"
            name="expectedCloseAt"
            type="date"
            defaultValue={
              deal.expectedCloseAt
                ? new Date(deal.expectedCloseAt).toISOString().slice(0, 10)
                : ""
            }
          />
        </div>
        {contacts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactId">Contact</Label>
            <select
              id="contactId"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className={sel}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nextAction">Next step</Label>
          <Input
            id="nextAction"
            name="nextAction"
            defaultValue={deal.nextAction ?? ""}
            placeholder="Schedule demo call with CTO"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={deal.notes ?? ""}
            placeholder="Context, blockers…"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
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
