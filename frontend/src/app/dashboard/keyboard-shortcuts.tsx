"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  n: "/dashboard/contacts/new",
  d: "/dashboard/deals/new",
  b: "/dashboard/tasks/new",
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTyping(e.target)) return;

      const route = ROUTES[e.key];
      if (route) {
        e.preventDefault();
        router.push(route);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        // Focus the search box if present, else go to contacts
        const search = document.querySelector<HTMLInputElement>(
          "input[type='search'], input[placeholder*='Search']",
        );
        if (search) {
          search.focus();
        } else {
          router.push("/dashboard/contacts");
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
