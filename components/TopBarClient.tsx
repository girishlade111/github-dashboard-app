"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import TopBar from "./TopBar";

/** Client wrapper: wires the TopBar's "Sync now" button to /api/sync/trigger. */
export default function TopBarClient({ syncLabel }: { syncLabel?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const bare = pathname === "/login" || pathname === "/denied";

  async function handleSyncNow() {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/sync/trigger", { method: "POST" });
    } catch {
      // network failure — page refresh will show the real state
    } finally {
      setSyncing(false);
      router.refresh();
    }
  }

  return (
    <TopBar
      syncLabel={bare ? undefined : syncLabel}
      onSyncNow={bare ? undefined : handleSyncNow}
    />
  );
}
