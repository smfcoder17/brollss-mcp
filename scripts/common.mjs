// Helpers shared by the plugin's validation scripts.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The plugin folder (plugins/brollss), wherever the script is run from. */
export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");


export const PLUGIN_NAME = "brollss";
export const EXPECTED_URL = "https://brollss.com/api/mcp";

export const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Reads a JSON file under `root`; pushes an error and returns null when it is missing or invalid. */
export async function readJson(root, rel, errors) {
  let raw;
  try {
    raw = await fs.readFile(path.join(root, rel), "utf8");
  } catch {
    errors.push(`missing file: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    errors.push(`invalid JSON in ${rel}: ${e.message}`);
    return null;
  }
}

/** The `key: value` lines of a Markdown file's YAML frontmatter, or null when it has none. */
export function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep > 0) fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  return fields;
}

/** Every file under `dir`, recursively, skipping the names in `skip`. */
export async function walkFiles(dir, skip = new Set()) {
  const files = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile()) files.push(p);
    }
  }
  return files.sort();
}

/** True when the module at `url` is the script node was asked to run. */
export function isMain(url) {
  return Boolean(process.argv[1]) && url === pathToFileURL(path.resolve(process.argv[1])).href;
}

/** Prints the result of one check and returns whether it passed. */
export function report(title, errors, warnings = []) {
  for (const w of warnings) console.log(`warning: ${w}`);
  if (errors.length > 0) {
    console.error(`${title} failed:`);
    for (const e of errors) console.error(`- ${e}`);
    return false;
  }
  console.log(`${title} passed.`);
  return true;
}
