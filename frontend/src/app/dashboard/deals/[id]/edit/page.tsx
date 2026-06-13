"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const STAGES = [
  { value: "prospect", label: "Prospect" },
  { value: "contacted", label: "Contacted" },
  { value: "meeting", label: "Meeting" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Won" },
  { value: "closed_lost", label: "Lost" },
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
  fundName: string | null;
  checkSize: number | null;
  portfolioUrl: string | null;
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
  const [pipelineType, setPipelineType] = useState<string>("sales");
  const [stage, setStage] = useState<string>("prospect");

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
      setPipelineType(dealRes.data.pipelineType ?? "sales");
      setStage(dealRes.data.stage ?? "prospect");
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
      pipelineType: pipelineType || "sales",
      stage: stage || "prospect",
      value: valueRaw ? Number(valueRaw) : null,
      probability: probabilityRaw ? Number(probabilityRaw) : null,
      expectedCloseAt: expectedCloseAtRaw || null,
      notes: (fd.get("notes") as string) || null,
      nextAction: (fd.get("nextAction") as string) || null,
      contactId: contactId || null,
      fundName: (fd.get("fundName") as string) || null,
      checkSize: fd.get("checkSize") ? Number(fd.get("checkSize")) : null,
      portfolioUrl: (fd.get("portfolioUrl") as string) || null,
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

  return (
    <div className="mx-auto w-full max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/deals")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">Edit deal</h1>
      </div>
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
          <Select
            value={pipelineType}
            onValueChange={(v) => setPipelineType(v ?? "")}
          >
            <SelectTrigger id="pipelineType">
              <SelectValue placeholder="Select pipeline type" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_TYPES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage">Stage</Label>
          <Select value={stage} onValueChange={(v) => setStage(v ?? "")}>
            <SelectTrigger id="stage">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <Select
              value={contactId}
              onValueChange={(v) => setContactId(v ?? "")}
            >
              <SelectTrigger id="contactId">
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` (${c.company})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {pipelineType === "fundraising" && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              Investor fields
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundName">Fund name</Label>
              <Input
                id="fundName"
                name="fundName"
                defaultValue={deal.fundName ?? ""}
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
                defaultValue={deal.checkSize ?? ""}
                placeholder="500000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="portfolioUrl">Portfolio / website</Label>
              <Input
                id="portfolioUrl"
                name="portfolioUrl"
                type="url"
                defaultValue={deal.portfolioUrl ?? ""}
                placeholder="https://sequoiacap.com"
              />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={deal.notes ?? ""}
            placeholder="Context, blockers…"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
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
