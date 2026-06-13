"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinFormProps {
  slug: string;
  referralCode?: string;
}

interface JoinResult {
  position: number;
  referralCode: string;
}

export function JoinForm({ slug, referralCode }: JoinFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [copied, setCopied] = useState(false);

  const referralLink = result
    ? `${window.location.origin}/w/${slug}?ref=${result.referralCode}`
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: email.trim(), referralCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult({ position: data.position, referralCode: data.referralCode });
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  if (result) {
    return (
      <div className="space-y-6 text-center">
        {/* Position badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 mb-2">
            <svg
              className="w-8 h-8 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            You&apos;re on the list!
          </h2>
          <p className="text-slate-500">
            You&apos;re{" "}
            <span className="font-semibold text-slate-900">
              #{result.position.toLocaleString()}
            </span>{" "}
            on the waitlist.
          </p>
        </div>

        {/* Referral section */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-left">
          <p className="text-sm font-medium text-slate-700">
            Share your link to move up the list
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralLink}
              className="text-xs text-slate-600 bg-white font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 min-w-[72px]"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Each person who joins using your link moves you up by one spot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="w-full"
          autoComplete="email"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !email.trim()}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Joining…
          </span>
        ) : (
          "Join the waitlist"
        )}
      </Button>

      {referralCode && (
        <p className="text-xs text-center text-slate-400">
          You were referred — you&apos;ll get a head-start position.
        </p>
      )}
    </form>
  );
}
