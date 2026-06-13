"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

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
  const [stage, setStage] = useState("prospect");

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
      stage: stage || "prospect",
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
      <div className="mb-6 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/deals")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
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
          <Select
            value={pipelineType}
            onValueChange={(v) => setPipelineType(v ?? "")}
          >
            <SelectTrigger id="pipelineType">
              <SelectValue />
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
              <SelectValue />
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
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Context, next steps…"
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
                Creating…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create deal
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
