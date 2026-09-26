import { auth } from "@/lib/auth/server";

/* Deferred: auth.handler() must not run at build time (env vars live only at
   request time). */
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  return auth.handler().GET(request, ctx);
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  return auth.handler().POST(request, ctx);
}
