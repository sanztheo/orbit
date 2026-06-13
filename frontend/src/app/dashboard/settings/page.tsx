"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  Webhook,
  Save,
  Check,
  Building2,
  Users,
  Zap,
  Sun,
  Moon,
  Monitor,
  Download,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PLAN_LABEL: Record<string, string> = {
  solo: "Solo",
  founder: "Founder",
  studio: "Studio",
};

const AI_MONTHLY_LIMIT = 50;

interface WorkspaceInfo {
  name: string;
  plan: string;
  memberCount: number;
  seatLimit: number;
  aiActionsUsed: number;
  aiActionsResetAt: string;
}

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { theme, setTheme } = useTheme();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const [webhookRes, wsRes] = await Promise.all([
        fetch(`${API_URL}/api/webhooks`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API_URL}/api/workspace`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);
      if (webhookRes.ok) {
        const json: { webhookUrl: string | null } = await webhookRes.json();
        setWebhookUrl(json.webhookUrl ?? "");
      }
      if (wsRes.ok) {
        const json: { data: WorkspaceInfo } = await wsRes.json();
        setWorkspace(json.data);
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

  async function handleExport() {
    setExporting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/export/bundle`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const bundle = await res.json();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-xl">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-border p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-sm flex items-center">
            <Sun className="h-4 w-4 mr-2" />
            Appearance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how Orbit looks on your device.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4 mr-1.5" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4 mr-1.5" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-4 w-4 mr-1.5" />
            System
          </Button>
        </div>
      </section>

      {workspace && (
        <section className="rounded-xl border border-border p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-sm flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Workspace
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {workspace.name}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Plan
              </p>
              <p className="text-sm font-semibold capitalize">
                {PLAN_LABEL[workspace.plan] ?? workspace.plan}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Seats
              </p>
              <p className="text-sm font-semibold">
                {workspace.memberCount} / {workspace.seatLimit}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                AI this month
              </p>
              <p className="text-sm font-semibold">
                {workspace.aiActionsUsed} / {AI_MONTHLY_LIMIT}
              </p>
            </div>
          </div>
          {workspace.aiActionsUsed >= AI_MONTHLY_LIMIT && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              Monthly AI limit reached. Actions reset on the 1st of next month.
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-sm flex items-center">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook
          </h2>
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
            <Input
              type="url"
              placeholder="https://hooks.zapier.com/hooks/catch/…"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setSaved(false);
              }}
            />

            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-pulse" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              {saved && (
                <span className="text-xs text-emerald-700 flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  Saved
                </span>
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
              <p>
                <span className="text-blue-700">contact.updated</span> — id,
                name, email, company, type
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-sm flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Data export
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download all your contacts, deals, tasks, and activities as JSON.
            Your data is yours.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="self-start"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download JSON export
            </>
          )}
        </Button>
      </section>
    </div>
  );
}
