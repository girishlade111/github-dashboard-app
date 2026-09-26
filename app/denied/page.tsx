"use client";

import { authClient } from "@/lib/auth/client";

export default function DeniedPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center py-24">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-card p-8 text-center">
        <h1 className="font-display text-4xl font-normal tracking-[-0.02em] text-ink">
          Access denied
        </h1>
        <p className="mt-3 text-sm text-muted">
          This dashboard is private. The GitHub account you signed in with is not
          on the allowlist.
        </p>
        <button
          type="button"
          onClick={() => authClient.signOut()}
          className="mt-8 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary-active"
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
