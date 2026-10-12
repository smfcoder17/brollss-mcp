#!/usr/bin/env node

// Copies this plugin folder, and nothing else, into a target folder: the
// working copy of the public repository. Then runs every check on the copy,
// so what gets pushed is known to stand on its own.
//
//   node scripts/export-public.mjs <target> [--replace]
//
// The target must be empty (a `.git` folder is allowed). With --replace,
// everything in it except `.git` is removed first, so a file deleted here is
// deleted there too. Nothing is committed or pushed.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PLUGIN_ROOT, isMain, report } from "./common.mjs";
import { checkMcpUrl } from "./check-mcp-url.mjs";
import { checkPublic } from "./check-public.mjs";
import { checkToolNames } from "./check-tool-names.mjs";
import { validateCursorPlugin } from "./validate-plugin.mjs";
import { validatePortablePlugin } from "./validate-portable-plugin.mjs";

/** Never copied: installed packages, a nested repository, editor and OS debris. */
const EXCLUDED = new Set(["node_modules", ".git", ".DS_Store", "Thumbs.db"]);

const inside = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/** Copies the plugin to `target`; returns the copied paths, relative to the target. */
export async function exportPublic(target, { replace = false, source = PLUGIN_ROOT } = {}) {
  const dest = path.resolve(target);
  if (inside(dest, source) || inside(source, dest)) throw new Error(`the target ${dest} and the plugin ${source} must not contain each other`);
  await fs.mkdir(dest, { recursive: true });
  const present = (await fs.readdir(dest)).filter((n) => n !== ".git");
  if (present.length > 0) {
    if (!replace) throw new Error(`the target is not empty (${present.slice(0, 5).join(", ")}${present.length > 5 ? ", ..." : ""}); pass --replace to clear it, .git kept`);
    for (const name of present) await fs.rm(path.join(dest, name), { recursive: true, force: true });
  }
  const copied = [];
  await fs.cp(source, dest, {
    recursive: true,
    filter: (src) => {
      if (EXCLUDED.has(path.basename(src))) return false;
      const rel = path.relative(source, src);
      if (rel) copied.push(rel.replace(/\\/g, "/"));
      return true;
    },
  });
  return copied;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("usage: node scripts/export-public.mjs <target> [--replace]");
    process.exit(2);
  }
  try {
    const copied = await exportPublic(target, { replace: args.includes("--replace") });
    const dest = path.resolve(target);
    console.log(`copied ${copied.length} entries to ${dest}`);
    const cursor = await validateCursorPlugin(dest);
    const ok = [
      report("Cursor plugin validation", cursor.errors, cursor.warnings),
      report("Portable/OpenAI plugin validation", await validatePortablePlugin(dest)),
      report("MCP URL check", await checkMcpUrl(dest)),
      report("Tool names check", await checkToolNames(dest)),
      report("Public content check", await checkPublic(dest)),
    ].every(Boolean);
    if (ok) console.log("Ready: review the diff in the target, then commit and push it yourself.");
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error(`export failed: ${e.message}`);
    process.exit(1);
  }
}
