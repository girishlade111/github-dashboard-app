import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env.local — rely on environment
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (env or .env.local)");
    process.exit(1);
  }
  const sql = neon(url);

/**
 * Split SQL into statements on semicolons, ignoring semicolons inside
 * dollar-quoted bodies (DO blocks, functions) and line comments.
 * The naive rawSql.split(";") breaks migration 002's guarded DO block.
 */
function splitStatements(rawSql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let dollarTag: string | null = null;
  let inLineComment = false;
  while (i < rawSql.length) {
    const ch = rawSql[i];
    if (inLineComment) {
      cur += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (dollarTag !== null) {
      if (rawSql.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
      } else {
        cur += ch;
        i++;
      }
      continue;
    }
    if (ch === "-" && rawSql[i + 1] === "-") {
      inLineComment = true;
      cur += "--";
      i += 2;
      continue;
    }
    const tag = rawSql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
    if (tag) {
      dollarTag = tag[0];
      cur += dollarTag;
      i += dollarTag.length;
      continue;
    }
    if (ch === ";") {
      if (cur.trim().length > 0) out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim().length > 0) out.push(cur.trim());
  return out;
}

  async function runStatements(label: string, rawSql: string): Promise<number> {
    const statements = splitStatements(rawSql);
    let failed = 0;
    for (const stmt of statements) {
      try {
        await sql.query(stmt);
        console.log(`ok [${label}]: ` + stmt.slice(0, 60).replace(/\s+/g, " "));
      } catch (err) {
        failed++;
        console.error(`FAIL [${label}]: ` + stmt.slice(0, 60).replace(/\s+/g, " "));
        console.error(err);
      }
    }
    if (failed > 0) {
      console.error(`${failed} statement(s) failed in ${label}`);
      process.exit(1);
    }
    return statements.length;
  }

  let total = 0;
  total += await runStatements("schema", readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8"));

  // Incremental migrations, applied in filename order.
  const migrationsDir = resolve(process.cwd(), "db/migrations");
  let migrationFiles: string[] = [];
  try {
    migrationFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    // no migrations dir — fine
  }
  for (const file of migrationFiles) {
    total += await runStatements(`migration ${file}`, readFileSync(resolve(migrationsDir, file), "utf8"));
  }
  console.log(`Migration complete: ${total} statements applied.`);
}

main();
