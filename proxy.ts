import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/((?!login|denied|api/auth|api/github/connect|api/github/callback|api/cron/sync|_next|favicon).*)"],
};
