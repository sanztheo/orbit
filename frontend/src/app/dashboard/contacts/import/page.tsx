"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function parseCsvPreview(
  text: string,
  maxRows = 5,
): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseRow(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const headers = parseRow(lines[0]);
  const rows = lines
    .slice(1, maxRows + 1)
    .map((l) => parseRow(l))
    .filter((r) => r.some((c) => c.trim()));
  return { headers, rows };
}

type Step = "upload" | "preview" | "done";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportContactsPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
    totalRows: number;
  } | null>(null);

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function loadFile(f: File) {
    if (!f.name.endsWith(".csv") && f.type !== "text/csv") return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const { headers, rows } = parseCsvPreview(text, 5);
      setPreview({ headers, rows, totalRows: Math.max(0, lines.length - 1) });
      setStep("preview");
    };
    reader.readAsText(f);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, []);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/contacts/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const json: ImportResult & { message?: string } = await res.json();
      if (!res.ok) {
        setImportError(json.message ?? "Import failed");
        return;
      }
      setResult({
        imported: json.imported ?? 0,
        skipped: json.skipped ?? 0,
        errors: json.errors ?? [],
      });
      setStep("done");
    } catch {
      setImportError("Network error — is the backend running?");
    } finally {
      setImporting(false);
    }
  }

  const NAME_CANDIDATES = new Set([
    "name",
    "full name",
    "fullname",
    "contact name",
    "first name",
    "people",
  ]);
  const hasNameCol = preview?.headers.some((h) =>
    NAME_CANDIDATES.has(h.toLowerCase().trim()),
  );

  function detectFormat(headers: string[]): { label: string; color: string } {
    const h = new Set(headers.map((x) => x.toLowerCase().trim()));
    if (h.has("people"))
      return {
        label: "Folk",
        color:
          "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
      };
    if (h.has("connected on"))
      return {
        label: "LinkedIn",
        color:
          "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
      };
    if (h.has("given name") || h.has("family name"))
      return {
        label: "Google Contacts",
        color:
          "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
      };
    if (h.has("first name") && h.has("last name"))
      return {
        label: "HubSpot",
        color:
          "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
      };
    return {
      label: "Generic CSV",
      color: "text-muted-foreground bg-muted border-border",
    };
  }
  const detectedFormat = preview ? detectFormat(preview.headers) : null;

  return (
    <div className="mx-auto w-full max-w-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/contacts"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Contacts
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">Import CSV</h1>
      </div>

      {step === "upload" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Supports HubSpot, Folk, Notion, and generic CSV exports. The name
            column is required; email, company, type, LinkedIn are
            auto-detected.
          </p>
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,text/csv";
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) loadFile(f);
              };
              input.click();
            }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-sm">Drop your CSV here</p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Duplicate emails are automatically skipped
          </p>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name}</span>
              <span className="text-xs text-muted-foreground">
                {preview.totalRows} rows
              </span>
              {detectedFormat && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${detectedFormat.color}`}
                >
                  {detectedFormat.label}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setStep("upload");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!hasNameCol && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                No recognized name column found. Expected: <code>name</code>,{" "}
                <code>full name</code>, or <code>people</code>. Rows without a
                name will be skipped.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {preview.headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-border last:border-0"
                    >
                      {preview.headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 text-muted-foreground max-w-[160px] truncate"
                        >
                          {row[ci] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.totalRows > 5 && (
              <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                Showing 5 of {preview.totalRows} rows
              </div>
            )}
          </div>

          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing {preview.totalRows} rows…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {preview.totalRows} contacts
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setStep("upload");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h2 className="text-lg font-semibold">Import complete</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {result.imported}
                </p>
                <p className="text-xs text-muted-foreground mt-1">imported</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">{result.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  skipped (duplicates)
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-1">
                  {result.errors.length} row
                  {result.errors.length !== 1 ? "s" : ""} had errors:
                </p>
                <ul className="text-xs text-destructive/80 space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/dashboard/contacts")}>
              View contacts
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setResult(null);
                setImportError(null);
                setStep("upload");
              }}
            >
              Import another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
