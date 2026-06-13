"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ActivityRefresher() {
  const router = useRouter();

  useEffect(() => {
    function onActivity() {
      router.refresh();
    }
    window.addEventListener("orbit:activity-logged", onActivity);
    return () =>
      window.removeEventListener("orbit:activity-logged", onActivity);
  }, [router]);

  return null;
}
