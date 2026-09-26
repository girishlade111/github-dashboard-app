"use client";

import { useSearchParams } from "next/navigation";
import { Banner } from "./ui";

const MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: {
    tone: "success",
    text: "Full GitHub access connected — private repos + packages will sync.",
  },
  denied: {
    tone: "error",
    text: "GitHub connection was denied — nothing changed. You can try again anytime.",
  },
  error: {
    tone: "error",
    text: "GitHub connection failed while exchanging the token. Please try again.",
  },
  scopes: {
    tone: "error",
    text: "GitHub did not grant repository + packages access. Reconnect and approve all requested permissions.",
  },
};

/** One-line status banner for the /api/github/callback result (?github=...). */
export default function GitHubConnectStatus() {
  const status = useSearchParams().get("github");
  if (!status || !(status in MESSAGES)) return null;
  const message = MESSAGES[status];
  return (
    <div className="mt-8">
      <Banner tone={message.tone}>{message.text}</Banner>
    </div>
  );
}
