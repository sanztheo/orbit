"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewWaitlistPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, string> = { name, slug };
      if (description.trim()) body.description = description.trim();
      if (websiteUrl.trim()) body.websiteUrl = websiteUrl.trim();

      const res = await fetch("/api/waitlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        if (typeof data.error === "string") {
          setError(data.error);
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      router.push("/dashboard/waitlists");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Waitlist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a new waitlist to collect subscribers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waitlist details</CardTitle>
          <CardDescription>
            Give your waitlist a name and a unique slug for the public URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Product"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                maxLength={100}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex items-center rounded-md border bg-muted/40 px-3 text-sm">
                <span className="text-muted-foreground whitespace-nowrap pr-1">
                  /w/
                </span>
                <input
                  id="slug"
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="my-awesome-product"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  minLength={2}
                  maxLength={60}
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and hyphens only. Auto-generated from name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <textarea
                id="description"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                placeholder="Describe what people are waiting for..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">
                Website URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://myproduct.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading || !name || !slug}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Waitlist
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/waitlists")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
