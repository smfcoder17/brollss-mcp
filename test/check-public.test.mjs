// The patterns this file feeds to checkPublic are internal on purpose: check-public.mjs skips this one file.

import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkPublic } from "../scripts/check-public.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDirs = [];

after(async () => {
  await Promise.all(tempDirs.map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function pluginCopy(mutate) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brollss-plugin-"));
  tempDirs.push(dir);
  await fs.cp(pluginRoot, dir, { recursive: true, filter: (src) => !src.startsWith(path.join(pluginRoot, "test")) });
  await mutate(dir);
  return dir;
}

describe("checkPublic", () => {
  it("accepts the Brollss plugin", async () => {
    assert.deepEqual(await checkPublic(pluginRoot), []);
  });

  it("rejects a local address, a machine path, a test account and an app variable", async () => {
    const dir = await pluginCopy((d) =>
      fs.appendFile(
        path.join(d, "AGENTS.md"),
        ["", "Dev: http://127.0.0.1:5171/api/mcp", "Tree: C:\\Users\\someone\\code", "Account: someone@brollss.test", "Set BROLLSS_APP_DIR first.", ""].join("\n"),
      ),
    );
    const errors = (await checkPublic(dir)).join("\n");
    for (const why of ["a local address", "a port of a dev or test server", "a path of a machine", "a test account", "an environment variable of the app"]) {
      assert.match(errors, new RegExp(`AGENTS\\.md:\\d+: ${why}`));
    }
  });
});
