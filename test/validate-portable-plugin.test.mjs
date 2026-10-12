// Adapted from descriptinc/descript-mcp (test/validate-portable-plugin.test.mjs), Apache License 2.0.

import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../scripts/mini-yaml.mjs";
import { validatePortablePlugin } from "../scripts/validate-portable-plugin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "..");
const validFixture = path.join(here, "fixtures", "valid");
const tempDirs = [];

after(async () => {
  await Promise.all(tempDirs.map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function fixtureCopy(mutate) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brollss-plugin-"));
  tempDirs.push(dir);
  await fs.cp(validFixture, dir, { recursive: true });
  await mutate(dir);
  return dir;
}

async function editJson(dir, rel, fn) {
  const file = path.join(dir, rel);
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  fn(data);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

const iface = (data) => data.extensions["com.openai"].interface;
const SKILL_YAML = "skills/demo/agents/openai.yaml";

async function expectError(mutate, pattern) {
  const dir = await fixtureCopy(mutate);
  const errors = await validatePortablePlugin(dir);
  assert.ok(
    errors.some((e) => pattern.test(e)),
    `expected an error matching ${pattern}, got:\n${errors.join("\n") || "(none)"}`,
  );
}

describe("validatePortablePlugin", () => {
  it("accepts the documented-format fixture", async () => {
    assert.deepEqual(await validatePortablePlugin(validFixture), []);
  });

  it("accepts the Brollss plugin", async () => {
    assert.deepEqual(await validatePortablePlugin(pluginRoot), []);
  });

  it("rejects root mcpServers and skills keys", async () => {
    await expectError((d) => editJson(d, "plugin.json", (p) => (p.mcpServers = "./mcp.json")), /plugin\.json has unsupported key "mcpServers"/);
    await expectError((d) => editJson(d, "plugin.json", (p) => (p.skills = "./skills")), /plugin\.json has unsupported key "skills"/);
  });

  it("rejects another plugin name", () =>
    expectError((d) => editJson(d, "plugin.json", (p) => (p.name = "brolls")), /"name" must be "brollss"/));

  it("rejects snake_case interface fields", () =>
    expectError(
      (d) =>
        editJson(d, "plugin.json", (p) => {
          const i = iface(p);
          i.short_description = i.shortDescription;
          delete i.shortDescription;
        }),
      /unsupported key "short_description"/,
    ));

  it("rejects asset paths without ./, escaping the package, or missing", async () => {
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).logo = "assets/logo.svg")), /"logo" must be a root-relative path starting with "\.\/"/);
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).composerIcon = "./../logo.svg")), /"composerIcon" must be a root-relative path/);
    await expectError((d) => fs.rm(path.join(d, "assets", "logo.svg")), /references missing asset "\.\/assets\/logo\.svg"/);
  });

  it("rejects over-limit listing texts", async () => {
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).displayName = "D".repeat(31))), /"displayName" is 31 chars; max is 30/);
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).shortDescription = "S".repeat(31))), /"shortDescription" is 31 chars; max is 30/);
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).longDescription = "L".repeat(4001))), /"longDescription" is 4001 chars; max is 4000/);
  });

  it("rejects a non-https listing URL", () =>
    expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).supportURL = "http://brollss.com")), /"supportURL" must be an https URL/));

  it("rejects too many, duplicate, or over-long defaultPrompt entries", async () => {
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).defaultPrompt = ["a", "b", "c", "d"])), /4 defaultPrompt entries; max is 3/);
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).defaultPrompt = ["same", "same"])), /"defaultPrompt" entries must be unique/);
    await expectError((d) => editJson(d, "plugin.json", (p) => (iface(p).defaultPrompt = ["p".repeat(129)])), /defaultPrompt\[0\] is 129 chars; max is 128/);
  });

  it("rejects a skill without agents/openai.yaml, or whose name differs from its folder", async () => {
    await expectError((d) => fs.rm(path.join(d, SKILL_YAML)), /missing skills\/demo\/agents\/openai\.yaml/);
    await expectError(
      (d) => fs.writeFile(path.join(d, "skills/demo/SKILL.md"), "---\nname: other\ndescription: x\n---\n"),
      /frontmatter "name" must be "demo"/,
    );
  });

  it("rejects a hyphenated transport or another URL in a skill openai.yaml", async () => {
    await expectError(async (d) => {
      const file = path.join(d, SKILL_YAML);
      await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace('"streamable_http"', '"streamable-http"'));
    }, /"transport" must be "streamable_http" \(found "streamable-http"\)/);
    await expectError(async (d) => {
      const file = path.join(d, SKILL_YAML);
      await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace("https://brollss.com/api/mcp", "https://example.com/api/mcp"));
    }, /"url" must be "https:\/\/brollss\.com\/api\/mcp"/);
  });

  it("rejects an underscore type, another URL, or a second server in mcp.json", async () => {
    await expectError((d) => editJson(d, "mcp.json", (m) => (m.mcpServers.brollss.type = "streamable_http")), /brollss\.type must be "streamable-http"/);
    await expectError((d) => editJson(d, "mcp.json", (m) => (m.mcpServers.brollss.url = "https://example.com/api/mcp")), /brollss\.url must be/);
    await expectError(
      (d) => editJson(d, "mcp.json", (m) => (m.mcpServers["brollss-local"] = { type: "stdio", command: "node" })),
      /must define only the "brollss" server/,
    );
  });

  it("rejects Codex marketplace entries with a wrong policy, category, or unsafe source path", async () => {
    const mkt = ".agents/plugins/marketplace.json";
    await expectError((d) => editJson(d, mkt, (m) => (m.plugins[0].policy.authentication = "ON_USE")), /policy\.authentication must be "ON_INSTALL"/);
    await expectError((d) => editJson(d, mkt, (m) => delete m.plugins[0].category), /"category" must be "Creativity"/);
    await expectError((d) => editJson(d, mkt, (m) => (m.plugins[0].source.path = "../other")), /source\.path must be root-relative/);
  });

  it("rejects a Claude Code marketplace that does not point at this folder", () =>
    expectError((d) => editJson(d, ".claude-plugin/marketplace.json", (m) => (m.plugins[0].source = "./plugins/brollss")), /"source" must be "\."/));

  it("rejects manifests whose versions drift apart", () =>
    expectError((d) => editJson(d, ".claude-plugin/plugin.json", (m) => (m.version = "0.2.0")), /version "0\.2\.0" does not match plugin\.json version "0\.1\.0"/));

  it("rejects another license, a manifest without it, or a missing LICENSE or NOTICE", async () => {
    await expectError((d) => editJson(d, "plugin.json", (m) => (m.license = "MIT")), /plugin\.json "license" must be "Apache-2\.0"/);
    await expectError((d) => editJson(d, ".claude-plugin/plugin.json", (m) => delete m.license), /license "undefined" does not match plugin\.json license "Apache-2\.0"/);
    await expectError((d) => fs.rm(path.join(d, "NOTICE")), /missing file: NOTICE/);
  });
});

describe("parseYaml", () => {
  it("parses the skill dependency shape", () => {
    assert.deepEqual(
      parseYaml("dependencies:\n  tools:\n    - type: \"mcp\"\n      value: brollss # comment\n      url: 'https://x.co/a#b'\n"),
      { dependencies: { tools: [{ type: "mcp", value: "brollss", url: "https://x.co/a#b" }] } },
    );
  });

  it("rejects syntax outside the supported subset", () => {
    assert.throws(() => parseYaml("tools: [a, b]\n"), /unsupported YAML syntax/);
    assert.throws(() => parseYaml("a: 1\na: 2\n"), /duplicate key/);
    assert.throws(() => parseYaml("a:\n\tb: 1\n"), /tabs are not allowed/);
  });
});
