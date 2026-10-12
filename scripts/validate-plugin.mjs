#!/usr/bin/env node

// Validates the Cursor plugin: the manifest at .cursor-plugin/plugin.json,
// the paths it references, and the frontmatter of rules and skills.
// Mirrors the checks of Cursor's plugin-template validator.
//
// Adapted from descriptinc/descript-mcp (scripts/validate-plugin.mjs), Apache License 2.0.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PLUGIN_ROOT, isMain, parseFrontmatter, pathExists, readJson, report, walkFiles } from "./common.mjs";

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const PATH_FIELDS = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"];

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function pathValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(pathValues);
  if (value && typeof value === "object") return [value.path, value.file].filter((v) => typeof v === "string");
  return [];
}

/** Errors and warnings for the Cursor plugin rooted at `root`. */
export async function validateCursorPlugin(root = PLUGIN_ROOT) {
  const errors = [];
  const warnings = [];

  const manifest = await readJson(root, path.join(".cursor-plugin", "plugin.json"), errors);
  if (!manifest) return { errors, warnings };

  if (typeof manifest.name !== "string" || !NAME_PATTERN.test(manifest.name)) {
    errors.push('"name" in .cursor-plugin/plugin.json must be lowercase alphanumerics, hyphens and periods.');
  }
  if (typeof manifest.description !== "string" || manifest.description.length === 0) {
    errors.push('"description" in .cursor-plugin/plugin.json is required.');
  }
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    warnings.push('"version" in .cursor-plugin/plugin.json is recommended.');
  }
  if (typeof manifest.author?.name !== "string" || manifest.author.name.length === 0) {
    warnings.push('"author.name" in .cursor-plugin/plugin.json is recommended.');
  }

  for (const field of PATH_FIELDS) {
    for (const value of pathValues(manifest[field])) {
      if (value.startsWith("http://") || value.startsWith("https://")) continue;
      if (!isSafeRelativePath(value)) {
        errors.push(`field "${field}" has invalid path "${value}": use a relative path without ".." or an absolute prefix.`);
      } else if (!(await pathExists(path.resolve(root, value)))) {
        errors.push(`field "${field}" references missing path "${value}".`);
      }
    }
  }

  const frontmatterChecks = [
    { dir: "rules", kind: "rule", keys: ["description"], exts: [".md", ".mdc", ".markdown"], only: null },
    { dir: "agents", kind: "agent", keys: ["name", "description"], exts: [".md", ".mdc", ".markdown"], only: null },
    { dir: "commands", kind: "command", keys: ["name", "description"], exts: [".md", ".mdc", ".markdown", ".txt"], only: null },
    { dir: "skills", kind: "skill", keys: ["name", "description"], exts: [".md"], only: "SKILL.md" },
  ];
  for (const { dir, kind, keys, exts, only } of frontmatterChecks) {
    const target = path.join(root, dir);
    if (!(await pathExists(target))) continue;
    for (const file of await walkFiles(target)) {
      if (only ? path.basename(file) !== only : !exts.includes(path.extname(file).toLowerCase())) continue;
      const rel = path.relative(root, file).replace(/\\/g, "/");
      const fields = parseFrontmatter(await fs.readFile(file, "utf8"));
      if (!fields) {
        errors.push(`${kind} file missing YAML frontmatter: ${rel}`);
        continue;
      }
      for (const key of keys) {
        if (!fields[key]) errors.push(`${kind} file missing "${key}" in frontmatter: ${rel}`);
      }
    }
  }

  if (await pathExists(path.join(root, "mcp.json"))) await readJson(root, "mcp.json", errors);
  else warnings.push("no mcp.json file found.");

  return { errors, warnings };
}

if (isMain(import.meta.url)) {
  const { errors, warnings } = await validateCursorPlugin(process.argv[2] ? path.resolve(process.argv[2]) : PLUGIN_ROOT);
  process.exit(report("Cursor plugin validation", errors, warnings) ? 0 : 1);
}
