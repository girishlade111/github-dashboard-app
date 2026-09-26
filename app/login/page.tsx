"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui";

function GitHubMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="GitHub"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export default function LoginPage() {
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    try {
      await authClient.signIn.social({ provider: "github", callbackURL: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center py-24">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-card p-8 text-center">
        <h1 className="font-display text-4xl font-normal tracking-[-0.02em] text-ink">
          Ledger
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your private window into your whole GitHub universe.
        </p>
        <div className="mt-8">
          <Button onClick={handleSignIn} disabled={busy} className="w-full" aria-label="Sign in with GitHub">
            <GitHubMark />
            {busy ? "Redirecting…" : "Sign in with GitHub"}
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-soft">
          Private dashboard — authorized user only.
        </p>
      </div>
    </section>
  );
}
