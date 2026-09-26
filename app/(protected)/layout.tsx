import TopBarClient from "@/components/TopBarClient";
import { requireUser } from "@/lib/auth/session";
import { getSyncState } from "@/lib/db";
import { shortAgo } from "@/lib/format";

/* Middleware keeps unauthenticated users out; this enforces the allowlist
   for every protected page. Server components using auth must be dynamic. */
export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const lastSync = await getSyncState("last_sync").catch(() => null);
  const ago = shortAgo(lastSync);
  return (
    <>
      <TopBarClient syncLabel={ago ? `${ago}` : undefined} />
      {children}
    </>
  );
}
