"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged server-side via the digest; no token or PII printed here.
    console.error("Page error:", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="py-24">
      <div className="rounded-xl border border-hairline bg-surface-card p-8">
        <h1 className="font-display text-3xl font-normal tracking-[-0.02em] text-error">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-muted">
          The dashboard hit an unexpected error. Your data is safe — try again.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </section>
  );
}
