import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkMcpUrl } from "../scripts/check-mcp-url.mjs";
import { checkPublic } from "../scripts/check-public.mjs";
import { PENDING, checkToolNames, serverCatalog } from "../scripts/check-tool-names.mjs";
import { exportPublic } from "../scripts/export-public.mjs";
import { validateCursorPlugin } from "../scripts/validate-plugin.mjs";
import { validatePortablePlugin } from "../scripts/validate-portable-plugin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "..");
const tempDirs = [];

after(async () => {
  await Promise.all(tempDirs.map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function tempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brollss-plugin-"));
  tempDirs.push(dir);
  return dir;
}

/** A copy of the real plugin, without its tests, changed by `mutate`. */
async function pluginCopy(mutate) {
  const dir = await tempDir();
  await fs.cp(pluginRoot, dir, { recursive: true, filter: (src) => !src.startsWith(path.join(pluginRoot, "test")) });
  await mutate(dir);
  return dir;
}

async function editJson(dir, rel, fn) {
  const file = path.join(dir, rel);
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  fn(data);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

describe("validateCursorPlugin", () => {
  it("accepts the Brollss plugin", async () => {
    assert.deepEqual((await validateCursorPlugin(pluginRoot)).errors, []);
  });

  it("rejects a skill without frontmatter and a manifest path that escapes", async () => {
    const dir = await pluginCopy(async (d) => {
      await fs.writeFile(path.join(d, "skills/review-edit/SKILL.md"), "# Review edit\n");
      await editJson(d, ".cursor-plugin/plugin.json", (m) => (m.logo = "../logo.svg"));
    });
    const { errors } = await validateCursorPlugin(dir);
    assert.ok(errors.some((e) => /skill file missing YAML frontmatter: skills\/review-edit\/SKILL\.md/.test(e)), errors.join("\n"));
    assert.ok(errors.some((e) => /field "logo" has invalid path "\.\.\/logo\.svg"/.test(e)), errors.join("\n"));
  });
});

describe("checkMcpUrl", () => {
  it("accepts the Brollss plugin", async () => {
    assert.deepEqual(await checkMcpUrl(pluginRoot), []);
  });

  it("rejects another endpoint in a skill, and a deep link to another server", async () => {
    const dir = await pluginCopy(async (d) => {
      await fs.appendFile(path.join(d, "skills/edit-video/SKILL.md"), "\nConnect to https://staging.brollss.com/api/mcp first.\n");
      const readme = path.join(d, "README.md");
      const other = Buffer.from(JSON.stringify({ url: "https://brollss.com/api/mcp/v2" })).toString("base64");
      await fs.writeFile(readme, (await fs.readFile(readme, "utf8")).replace(/config=[A-Za-z0-9+/=]+/, `config=${other}`));
    });
    const errors = await checkMcpUrl(dir);
    assert.ok(errors.some((e) => /skills\/edit-video\/SKILL\.md: unexpected server URL https:\/\/staging\.brollss\.com\/api\/mcp/.test(e)), errors.join("\n"));
    assert.ok(errors.some((e) => /Cursor deep link decodes to https:\/\/brollss\.com\/api\/mcp\/v2/.test(e)), errors.join("\n"));
  });
});

describe("checkToolNames", () => {
  it("reads the server's tools, prompts and parameters from tools.json", async () => {
    const { tools, params, errors } = await serverCatalog(pluginRoot);
    assert.deepEqual(errors, []);
    for (const n of ["get_project_state", "strike_words", "import_media", "wait_for_job", "insert_scene", "check_edit", "monter_une_video"]) {
      assert.ok(tools.has(n), `${n} is in tools.json`);
    }
    for (const p of ["expectedRevision", "add_media", "wait_seconds"]) assert.ok(params.has(p), `${p} is a parameter in tools.json`);
  });

  it("accepts the Brollss plugin on its own", async () => {
    assert.deepEqual(await checkToolNames(pluginRoot), []);
  });

  it("rejects a tool the server does not offer", async () => {
    // `generate_image` served here until the server offered it (#514, step 3); a made-up name keeps the case true.
    const dir = await pluginCopy((d) => fs.appendFile(path.join(d, "skills/add-scenes/SKILL.md"), "\nThen call `make_thumbnail` for a cover.\n"));
    const errors = await checkToolNames(dir);
    assert.ok(errors.some((e) => /skills\/add-scenes\/SKILL\.md names `make_thumbnail`/.test(e)), errors.join("\n"));
  });

  it("rejects a skill that still names a tool once tools.json drops it", async () => {
    const dir = await pluginCopy((d) => editJson(d, "tools.json", (doc) => (doc.tools = doc.tools.filter((t) => t.name !== "check_audio"))));
    const errors = await checkToolNames(dir);
    assert.ok(errors.some((e) => /names `check_audio`/.test(e)), errors.join("\n"));
  });

  it("rejects a tools.json pointing at another server", async () => {
    const dir = await pluginCopy((d) => editJson(d, "tools.json", (doc) => (doc.server.url = "https://example.com/api/mcp")));
    assert.ok((await checkToolNames(dir)).some((e) => /tools\.json server\.url must be/.test(e)));
  });

  it("keeps no pending tool that tools.json already has", async () => {
    const { tools } = await serverCatalog(pluginRoot);
    assert.deepEqual([...PENDING.keys()].filter((n) => tools.has(n)), []);
  });
});

describe("exportPublic", () => {
  it("copies the plugin alone into an empty target, which then passes every check", async () => {
    const target = path.join(await tempDir(), "brollss-mcp");
    const copied = await exportPublic(target);
    for (const rel of ["LICENSE", "NOTICE", "tools.json", "package.json", ".github/workflows/validate.yml", "skills/edit-video/SKILL.md"]) {
      assert.ok(copied.includes(rel), `${rel} is copied`);
    }
    assert.deepEqual((await validateCursorPlugin(target)).errors, []);
    assert.deepEqual(await validatePortablePlugin(target), []);
    assert.deepEqual(await checkMcpUrl(target), []);
    assert.deepEqual(await checkToolNames(target), []);
    assert.deepEqual(await checkPublic(target), []);
  });

  it("refuses a target that is not empty, and with replace keeps only .git", async () => {
    const target = await tempDir();
    await fs.mkdir(path.join(target, ".git"));
    await fs.writeFile(path.join(target, ".git", "HEAD"), "ref: refs/heads/main\n");
    await fs.writeFile(path.join(target, "stale.md"), "old\n");
    await assert.rejects(exportPublic(target), /not empty/);
    await exportPublic(target, { replace: true });
    await assert.rejects(fs.access(path.join(target, "stale.md")));
    assert.equal(await fs.readFile(path.join(target, ".git", "HEAD"), "utf8"), "ref: refs/heads/main\n");
  });

  it("refuses a target inside the plugin", async () => {
    await assert.rejects(exportPublic(path.join(pluginRoot, "out")), /must not contain each other/);
  });
});
