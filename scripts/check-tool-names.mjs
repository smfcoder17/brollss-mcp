#!/usr/bin/env node

// Asserts the plugin's text never names a tool the Brollss MCP server does not
// offer (the server's own rule MCP25, applied to the skills, the rule,
// AGENTS.md and the README).
//
// The server's tools come from tools.json, which the Brollss app repository
// generates from its registry (`npm run plugin:tools`) and keeps in step with a
// test. A name the text cites must be a tool, a prompt, a parameter of a tool,
// a result field listed in RESULT_FIELDS, or a tool listed in PENDING with the
// reason it is not on the server yet. A PENDING name that tools.json now holds
// fails too, so the list cannot go stale.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { EXPECTED_URL, PLUGIN_ROOT, isMain, isObject, pathExists, readJson, report, walkFiles } from "./common.mjs";

/** snake_case fields the tools return, which the text cites. */
export const RESULT_FIELDS = new Set(["job_id", "project_id", "project_url", "timed_out", "upload_url", "upload_urls", "asset_id"]);

/** Tools the skills rely on before the server has them, each with its reason. Empty when the server has caught up. */
export const PENDING = new Map();

const TOOL_LIKE = /`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g;

function propertyNames(schema, out = new Set()) {
  if (Array.isArray(schema)) {
    for (const s of schema) propertyNames(s, out);
  } else if (isObject(schema)) {
    if (isObject(schema.properties)) for (const k of Object.keys(schema.properties)) out.add(k);
    for (const v of Object.values(schema)) if (typeof v === "object") propertyNames(v, out);
  }
  return out;
}

/** `{ tools, params, errors }` read from tools.json under `root`. */
export async function serverCatalog(root = PLUGIN_ROOT) {
  const errors = [];
  const doc = await readJson(root, "tools.json", errors);
  const tools = new Set();
  const params = new Set();
  if (!isObject(doc)) return { tools, params, errors };
  if (doc.server?.url !== EXPECTED_URL) errors.push(`tools.json server.url must be "${EXPECTED_URL}" (found "${doc.server?.url}").`);
  if (!Array.isArray(doc.tools) || doc.tools.length === 0) {
    errors.push("tools.json must list the server's tools.");
    return { tools, params, errors };
  }
  for (const [i, t] of doc.tools.entries()) {
    if (!isObject(t) || typeof t.name !== "string" || typeof t.description !== "string" || !isObject(t.inputSchema)) {
      errors.push(`tools.json tools[${i}] needs a name, a description and an inputSchema.`);
      continue;
    }
    tools.add(t.name);
    propertyNames(t.inputSchema, params);
  }
  for (const p of Array.isArray(doc.prompts) ? doc.prompts : []) if (typeof p?.name === "string") tools.add(p.name);
  return { tools, params, errors };
}

/** The text files of the plugin a model or a user reads. */
async function readableFiles(root) {
  const files = [];
  for (const rel of ["AGENTS.md", "README.md"]) {
    if (await pathExists(path.join(root, rel))) files.push(path.join(root, rel));
  }
  for (const dir of ["skills", "rules"]) {
    if (!(await pathExists(path.join(root, dir)))) continue;
    for (const f of await walkFiles(path.join(root, dir))) if (/\.(md|mdc)$/.test(f)) files.push(f);
  }
  return files;
}

/** The errors of the plugin rooted at `root`; empty when every tool it names is on the server. */
export async function checkToolNames(root = PLUGIN_ROOT) {
  const { tools, params, errors } = await serverCatalog(root);
  if (tools.size === 0) return errors;
  for (const [name, why] of PENDING) {
    if (tools.has(name)) errors.push(`${name} is now in tools.json: remove it from PENDING in check-tool-names.mjs (${why}).`);
  }
  for (const file of await readableFiles(root)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const text = await fs.readFile(file, "utf8");
    const cited = new Set([...text.matchAll(TOOL_LIKE)].map((m) => m[1]));
    for (const name of [...cited].sort()) {
      if (tools.has(name) || params.has(name) || RESULT_FIELDS.has(name) || PENDING.has(name)) continue;
      errors.push(`${rel} names \`${name}\`, which the Brollss MCP server does not offer.`);
    }
  }
  return errors;
}

if (isMain(import.meta.url)) {
  const errors = await checkToolNames(process.argv[2] ? path.resolve(process.argv[2]) : PLUGIN_ROOT);
  process.exit(report("Tool names check", errors) ? 0 : 1);
}
