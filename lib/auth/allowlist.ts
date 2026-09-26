/** The only GitHub identities allowed into this dashboard. */
export const ALLOWLIST = ["girishlade111"] as const;

export function isAllowed(login: string | null | undefined): boolean {
  if (!login) return false;
  return (ALLOWLIST as readonly string[]).includes(login.toLowerCase());
}
