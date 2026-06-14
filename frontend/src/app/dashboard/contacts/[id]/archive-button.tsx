"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Archive, ArchiveX } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Props {
  contactId: string;
  isArchived: boolean;
}

export function ArchiveContactButton({ contactId, isArchived }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const token = await getToken();
    await fetch(`${API_URL}/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        archivedAt: isArchived ? null : new Date().toISOString(),
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      title={isArchived ? "Unarchive contact" : "Archive contact"}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isArchived ? (
        <>
          <ArchiveX className="h-3.5 w-3.5 mr-1.5" />
          Unarchive
        </>
      ) : (
        <>
          <Archive className="h-3.5 w-3.5 mr-1.5" />
          Archive
        </>
      )}
    </Button>
  );
}
