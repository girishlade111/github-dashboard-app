/**
 * Self-check for lib/github.ts. Run:
 *   GITHUB_TOKEN=ghp_xxx npx tsx --conditions=react-server scripts/github-selfcheck.ts
 * (the react-server condition satisfies the `server-only` guard in lib/github.ts)
 * Skips silently when GITHUB_TOKEN is unset. Never commit a token.
 */
import { getPackages, getProfileAndContributions, listReposPage } from "../lib/github";

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log("GITHUB_TOKEN unset — skipping self-check.");
    return;
  }
  const page = await listReposPage(token);
  console.log(`repos page: ${page.repos.length} repos, hasNextPage=${page.pageInfo.hasNextPage}`);
  const first = page.repos[0];
  if (first) {
    console.log(`sample: ${first.nameWithOwner} stars=${first.stargazerCount} langs=${first.languages.length} topics=${first.topics.length}`);
  }
  const { profile, contributions } = await getProfileAndContributions(token);
  console.log(`profile: ${profile.login} followers=${profile.followers}, contributions days=${contributions.length}`);
  for (const t of ["npm", "container"] as const) {
    const pkgs = await getPackages(token, t, 1);
    console.log(`packages(${t}): ${pkgs.length}`);
  }
  console.log("self-check OK");
}

main().catch((err) => {
  console.error("self-check FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
