#!/usr/bin/env node

// Asserts the hosted MCP server URL is the same everywhere it appears in the
// plugin: mcp.json, the docs, the skills, and the base64 Cursor deep link in
// the README.
//
// Adapted from descriptinc/descript-mcp (scripts/check-mcp-url.mjs), Apache License 2.0.
// Descript lists files with `git ls-files`; this plugin lives inside a larger
// repository, so the check walks the plugin folder instead.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { EXPECTED_URL, PLUGIN_NAME, PLUGIN_ROOT, isMain, readJson, report, walkFiles } from "./common.mjs";

/** Any address of an MCP endpoint on a brollss.com host. */
const URL_PATTERN = /https?:\/\/[a-z0-9.-]*brollss\.com\/api\/mcp[^\s)`"'<>\]]*/g;
const TEXT_EXTENSIONS = new Set([".json", ".md", ".mdc", ".yaml", ".yml", ".mjs", ".js", ".txt"]);
/** The tests hold wrong URLs on purpose; this script holds the pattern. */
const SKIPPED = new Set(["test", "node_modules"]);

/** The errors of the plugin rooted at `root`; empty when the URL is consistent. */
export async function checkMcpUrl(root = PLUGIN_ROOT) {
  const errors = [];

  const mcp = await readJson(root, "mcp.json", errors);
  const mcpUrl = mcp?.mcpServers?.[PLUGIN_NAME]?.url;
  if (mcp && mcpUrl !== EXPECTED_URL) errors.push(`mcp.json url is ${mcpUrl}`);

  let readme = "";
  try {
    readme = await fs.readFile(path.join(root, "README.md"), "utf8");
  } catch {
    errors.push("README.md is missing");
  }
  const deepLink = readme.match(/cursor-deeplink\/mcp\/install\?[^\s`]*config=([A-Za-z0-9+/=]+)/);
  if (!deepLink) {
    errors.push("README is missing the Cursor deep link");
  } else {
    try {
      const decoded = JSON.parse(Buffer.from(deepLink[1], "base64").toString("utf8"));
      if (decoded.url !== EXPECTED_URL) errors.push(`Cursor deep link decodes to ${decoded.url}`);
    } catch (e) {
      errors.push(`Cursor deep link is not base64 JSON: ${e.message}`);
    }
  }

  for (const file of await walkFiles(root, SKIPPED)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (rel === "scripts/check-mcp-url.mjs" || !TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const text = await fs.readFile(file, "utf8");
    const urls = (text.match(URL_PATTERN) ?? []).map((u) => u.replace(/[.,;:]+$/, ""));
    for (const url of new Set(urls)) {
      if (url !== EXPECTED_URL) errors.push(`${rel}: unexpected server URL ${url}`);
    }
  }

  return errors;
}

if (isMain(import.meta.url)) {
  const errors = await checkMcpUrl(process.argv[2] ? path.resolve(process.argv[2]) : PLUGIN_ROOT);
  process.exit(report(`MCP URL check (${EXPECTED_URL})`, errors) ? 0 : 1);
}
