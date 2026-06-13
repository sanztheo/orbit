"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/webhooks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json: { webhookUrl: string | null } = await res.json();
        setWebhookUrl(json.webhookUrl ?? "");
      }
      setLoading(false);
    }
    load();
  }, [getToken]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/webhooks`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("Failed to save");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-xl">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-border p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-sm">Webhook</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Orbit fires a POST to this URL when a deal changes stage or a
            contact is created. Use it to trigger Zapier, Make, or your own
            automation.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="url"
              placeholder="https://hooks.zapier.com/hooks/catch/…"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setSaved(false);
              }}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saved && (
                <span className="text-xs text-emerald-700">Saved ✓</span>
              )}
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>

            <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground font-mono space-y-1">
              <p className="font-semibold text-foreground mb-1">
                Events fired:
              </p>
              <p>
                <span className="text-blue-700">deal.stage_changed</span> — deal
                id, title, stage
              </p>
              <p>
                <span className="text-blue-700">contact.created</span> — id,
                name, email, company, type
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
