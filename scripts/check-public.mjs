#!/usr/bin/env node

// Asserts nothing internal to the Brollss team ships with the public plugin:
// no local address, no port of a dev or test server, no path of a machine, no
// test account, no environment variable of the app, nothing shaped like a key.
//
// The test files are checked too, except the lines of this script's own
// patterns: a public repository shows its tests.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PLUGIN_ROOT, isMain, report, walkFiles } from "./common.mjs";

/** What must never appear, with the reason given when it does. */
export const FORBIDDEN = [
  { re: /\blocalhost\b|127\.0\.0\.1|\[::1\]|0\.0\.0\.0/i, why: "a local address" },
  { re: /:(?:5171|51217|55433|3000|3100)\b/, why: "a port of a dev or test server" },
  { re: /\b[A-Za-z]:[\\/](?:Data|Users|Projects)\b|\/home\/[a-z]|\/Users\/[A-Za-z]/, why: "a path of a machine" },
  { re: /@[a-z0-9.-]+\.test\b|\be2e\.user\b/i, why: "a test account" },
  { re: /\bBROLLS{1,2}_[A-Z_]+|\bDATABASE_URL\b|\bOLLAMA_API_KEY\b/, why: "an environment variable of the app" },
  { re: /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}|\bghp_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: "something shaped like a key" },
  { re: /\.claude[\\/]worktrees|brolls-web[\\/]/, why: "a path of the app repository" },
];

const TEXT_EXTENSIONS = new Set([".json", ".md", ".mdc", ".yaml", ".yml", ".mjs", ".js", ".txt", ".svg", ""]);
const SKIPPED = new Set(["node_modules", ".git"]);

/** The errors of the plugin rooted at `root`; empty when nothing internal is in it. */
export async function checkPublic(root = PLUGIN_ROOT) {
  const errors = [];
  for (const file of await walkFiles(root, SKIPPED)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (rel === "scripts/check-public.mjs" || rel === "test/check-public.test.mjs") continue;
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { re, why } of FORBIDDEN) {
        const m = line.match(re);
        if (m) errors.push(`${rel}:${i + 1}: ${why} (${m[0]})`);
      }
    });
  }
  return errors;
}

if (isMain(import.meta.url)) {
  const errors = await checkPublic(process.argv[2] ? path.resolve(process.argv[2]) : PLUGIN_ROOT);
  process.exit(report("Public content check", errors) ? 0 : 1);
}
