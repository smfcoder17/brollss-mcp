#!/usr/bin/env node

// Runs every check of the plugin: `npm run validate` in the plugin's own
// repository, `npm run plugin:check` in the Brollss app repository.

import process from "node:process";
import { report } from "./common.mjs";
import { checkMcpUrl } from "./check-mcp-url.mjs";
import { checkPublic } from "./check-public.mjs";
import { checkToolNames } from "./check-tool-names.mjs";
import { validateCursorPlugin } from "./validate-plugin.mjs";
import { validatePortablePlugin } from "./validate-portable-plugin.mjs";

const cursor = await validateCursorPlugin();

const results = [
  report("Cursor plugin validation", cursor.errors, cursor.warnings),
  report("Portable/OpenAI plugin validation", await validatePortablePlugin()),
  report("MCP URL check", await checkMcpUrl()),
  report("Tool names check", await checkToolNames()),
  report("Public content check", await checkPublic()),
];
process.exit(results.every(Boolean) ? 0 : 1);
