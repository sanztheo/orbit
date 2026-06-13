"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "welcome" | "contact" | "deal" | "done";

const CONTACT_TYPES = [
  { value: "lead", label: "Lead", desc: "Potential customer" },
  { value: "customer", label: "Customer", desc: "Paying user" },
  { value: "investor", label: "Investor", desc: "Current or target investor" },
  { value: "partner", label: "Partner", desc: "Strategic partner" },
] as const;

const PIPELINE_TYPES = [
  { value: "sales", label: "Sales pipeline", desc: "Track customer deals" },
  {
    value: "fundraising",
    label: "Fundraising",
    desc: "Manage investor conversations",
  },
  { value: "partnership", label: "Partnerships", desc: "Track BD deals" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);

  // Contact form
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactType, setContactType] = useState<string>("lead");

  // Deal form
  const [dealTitle, setDealTitle] = useState("");
  const [dealPipelineType, setDealPipelineType] = useState<string>("sales");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  async function saveContact() {
    if (!contactName.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      await fetch(`${apiUrl}/api/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim() || undefined,
          type: contactType,
        }),
      });
      setStep("deal");
    } finally {
      setLoading(false);
    }
  }

  async function saveDeal() {
    if (!dealTitle.trim()) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      await fetch(`${apiUrl}/api/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: dealTitle.trim(),
          pipelineType: dealPipelineType,
        }),
      });
    } finally {
      setLoading(false);
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {(["welcome", "contact", "deal"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                step === s || (step === "done" && i < 3)
                  ? "bg-foreground"
                  : "bg-border",
              )}
            />
          ))}
        </div>

        {step === "welcome" && (
          <div className="flex flex-col gap-6 text-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome to Orbit</h1>
              <p className="mt-2 text-muted-foreground">
                Your solo-founder OS for contacts, deals, and product backlog.
                Let&apos;s set you up in 2 minutes.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-left">
              {[
                "📇 Unified contacts — leads, investors, partners in one place",
                "🎯 Deal pipelines — sales and fundraising with stall detection",
                "✦ AI follow-ups — contextual drafts from your conversation history",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm">
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep("contact")}
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Get started →
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip setup, go to dashboard
              </button>
            </div>
          </div>
        )}

        {step === "contact" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold">Add your first contact</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A lead, investor, or partner you&apos;re actively working with.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Name *"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="grid grid-cols-2 gap-2">
                {CONTACT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setContactType(t.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      contactType === t.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30",
                    )}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveContact}
                disabled={loading || !contactName.trim()}
                className={cn(buttonVariants(), "flex-1 disabled:opacity-50")}
              >
                {loading ? "Saving…" : "Add contact →"}
              </button>
              <button
                onClick={() => setStep("deal")}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {step === "deal" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold">Create your first deal</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A sales conversation, investor meeting, or partnership
                you&apos;re tracking.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Deal title (e.g. Acme Corp — Series A)"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <div className="flex flex-col gap-2">
                {PIPELINE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setDealPipelineType(t.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      dealPipelineType === t.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30",
                    )}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveDeal}
                disabled={loading || !dealTitle.trim()}
                className={cn(buttonVariants(), "flex-1 disabled:opacity-50")}
              >
                {loading ? "Saving…" : "Create deal →"}
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
