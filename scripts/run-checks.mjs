#!/usr/bin/env node
/**
 * Finds every `*.check.ts` under src/ and runs it with tsx, one process per
 * file (matches how each check documents running itself: `npx tsx <file>`).
 * Fails the whole run (non-zero exit) if any single check throws.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, "..", "src");

const checks = readdirSync(srcDir, { recursive: true })
  .filter((f) => f.endsWith(".check.ts"))
  .map((f) => path.join(srcDir, f))
  .sort();

if (checks.length === 0) {
  console.error("No *.check.ts files found under src/");
  process.exit(1);
}

let failed = 0;
for (const file of checks) {
  const rel = path.relative(root, file);
  console.log(`\n> tsx ${rel}`);
  const result = spawnSync("npx", ["tsx", file], { stdio: "inherit", shell: true });
  if (result.status !== 0) failed++;
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exit(1);
