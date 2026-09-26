import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/* Redaction helpers: never emit raw token/cookie/secret values. */
function redactValue(v: unknown): string {
  if (typeof v === "string") return v.length > 0 ? `<present, ${v.length} chars>` : "<absent>";
  if (v === null || v === undefined) return "<absent>";
  if (typeof v === "number" || typeof v === "boolean") return `<present:${typeof v}>`;
  if (Array.isArray(v)) return `<array,len=${v.length}>`;
  if (typeof v === "object") return `<object keys=[${Object.keys(v as Record<string, unknown>).join(",")}]>`;
  return `<present:${typeof v}>`;
}

function shapeOf(v: unknown, depth = 0): unknown {
  if (depth > 3) return "<depth-cap>";
  if (v === null || v === undefined) return "<absent>";
  if (typeof v === "string") return v.length > 0 ? `<present, ${v.length} chars>` : "<absent>";
  if (typeof v === "number" || typeof v === "boolean") return typeof v;
  if (Array.isArray(v)) return v.map((e) => shapeOf(e, depth + 1));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) {
      out[k] = shapeOf((v as Record<string, unknown>)[k], depth + 1);
    }
    return out;
  }
  return typeof v;
}

export async function GET() {
  const h = await headers();
  const cookieHeader = h.get("cookie") ?? "";
  // Cookie NAMES only.
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);
  const neonCookieNames = cookieNames.filter((n) => n.startsWith("__Secure-neon-auth") || n.startsWith("neon_auth"));

  const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "";
  let baseHost = "<absent>";
  try {
    baseHost = new URL(baseUrl).host || "<absent>";
  } catch {
    baseHost = baseUrl ? "<unparseable>" : "<absent>";
  }

  // a. getSession
  let sessionOut: unknown = null;
  try {
    const res = (await auth.getSession()) as { data: unknown; error: unknown };
    sessionOut = {
      ok: true,
      dataShape: shapeOf(res.data),
      errorShape: res.error ? shapeOf(res.error) : null,
    };
  } catch (e) {
    sessionOut = { ok: false, thrown: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }

  // Extract user id (non-secret identifier) for variant (e).
  let userId: string | null = null;
  try {
    const s = (await auth.getSession()) as { data?: { user?: { id?: unknown } } | null };
    if (s?.data && typeof s.data === "object" && "user" in s.data) {
      const id = (s.data as { user?: { id?: unknown } }).user?.id;
      if (typeof id === "string" && id.length > 0) userId = id;
    }
  } catch {
    userId = null;
  }

  // b. listAccounts
  let accountsOut: unknown = null;
  try {
    const res = (await (auth as unknown as { listAccounts: () => Promise<{ data: unknown; error: unknown }> }).listAccounts()) as {
      data: unknown;
      error: unknown;
    };
    if (Array.isArray(res.data)) {
      accountsOut = {
        ok: true,
        count: res.data.length,
        perAccountShape: (res.data as unknown[]).map((a) => shapeOf(a)),
        errorShape: res.error ? shapeOf(res.error) : null,
      };
    } else {
      accountsOut = { ok: true, dataShape: shapeOf(res.data), errorShape: res.error ? shapeOf(res.error) : null };
    }
  } catch (e) {
    accountsOut = { ok: false, thrown: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }

  // Forward cookies server-side (values never logged).
  const forwardHeaders: Record<string, string> = cookieHeader ? { Cookie: cookieHeader } : {};

  // c. direct GET account-info
  let accountInfoOut: unknown = null;
  try {
    const r = await fetch(`${baseUrl}/account-info`, { headers: forwardHeaders, cache: "no-store" });
    const setCookies = r.headers.getSetCookie?.() ?? [];
    let bodyShape: unknown = null;
    try {
      bodyShape = shapeOf(await r.json());
    } catch {
      bodyShape = "<non-json-body>";
    }
    accountInfoOut = {
      status: r.status,
      bodyShape,
      setCookieHeaderNames: setCookies.length > 0 ? ["set-cookie"] : [],
      setCookieCount: setCookies.length,
    };
  } catch (e) {
    accountInfoOut = { thrown: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }

  // d. direct POST get-access-token {providerId}
  let gatPostOut: unknown = null;
  try {
    const r = await fetch(`${baseUrl}/get-access-token`, {
      method: "POST",
      headers: { ...forwardHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: "github" }),
      cache: "no-store",
    });
    const setCookies = r.headers.getSetCookie?.() ?? [];
    let bodyShape: unknown = null;
    try {
      bodyShape = shapeOf(await r.json());
    } catch {
      bodyShape = "<non-json-body>";
    }
    gatPostOut = {
      status: r.status,
      bodyShape,
      setCookieCount: setCookies.length,
    };
  } catch (e) {
    gatPostOut = { thrown: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }

  // e. POST with userId (only id length reported, never value)
  let gatPostUserOut: unknown = null;
  try {
    const body: Record<string, string> = { providerId: "github" };
    if (userId) body.userId = userId;
    const r = await fetch(`${baseUrl}/get-access-token`, {
      method: "POST",
      headers: { ...forwardHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    let bodyShape: unknown = null;
    try {
      bodyShape = shapeOf(await r.json());
    } catch {
      bodyShape = "<non-json-body>";
    }
    gatPostUserOut = {
      status: r.status,
      sentUserId: userId ? "<present>" : "<absent>",
      bodyShape,
    };
  } catch (e) {
    gatPostUserOut = { thrown: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }

  // f. header NAMES only observed on this request
  const headerNames: string[] = [];
  h.forEach((_v, k) => headerNames.push(k));

  // SDK-declared GET get-access-token via auth.getAccessToken (expected 404 upstream)
  let gatSdkOut: unknown = null;
  try {
    const fn = (auth as unknown as { getAccessToken: (a: unknown) => Promise<{ data: unknown; error: unknown }> }).getAccessToken;
    const res = await fn({ query: { providerId: "github" } });
    gatSdkOut = { ok: true, dataShape: shapeOf(res.data), errorShape: res.error ? shapeOf(res.error) : null };
  } catch (e) {
    gatSdkOut = { ok: false, thrown: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }

  void redactValue;
  return NextResponse.json({
    baseHost,
    requestCookieNames: neonCookieNames,
    allCookieNames: cookieNames,
    requestHeaderNames: headerNames.sort(),
    getSession: sessionOut,
    listAccounts: accountsOut,
    accountInfoGET: accountInfoOut,
    getAccessTokenPOST_providerOnly: gatPostOut,
    getAccessTokenPOST_withUserId: gatPostUserOut,
    getAccessTokenViaSDK_GET: gatSdkOut,
  });
}
