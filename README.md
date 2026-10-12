# Brollss MCP

Edit talking-head videos in Brollss from your agent. Import a video, cut it, open on the strongest sentence, zoom, draw animated scenes, add captions, music and sound effects, and check the edit before you call it finished.

This repository is a plugin for Claude Code, Cursor and Codex. Installing it brings three things together: the connection to the Brollss MCP server, a rule with the working habits that held up in real editing sessions, and five skills that walk the agent through a whole edit.

> **The hosted server is in preparation.** `https://brollss.com/api/mcp` is not online yet. This plugin is published ahead of it; the setup below works as soon as the server is. Follow https://brollss.com/mcp for its opening.

Documentation of the server and its tools: https://brollss.com/mcp

## What's included

### MCP server

The plugin connects to the hosted Brollss server over streamable HTTP:

```
https://brollss.com/api/mcp
```

The tools, by family. `tools.json` lists each one with its description and its parameters, as the server declares them.

- **Account and projects.** `whoami`, `list_projects`, `get_project_state`, `clone_project`, `create_checkpoint`, `get_editing_guide`.
- **Import.** `import_media` (a file sent from your device, or a direct link), then `wait_for_job` until the transcript and the video are in the project. `get_job` reads where an import stands without waiting; `report_upload_status` stops an import whose upload failed.
- **Transcript and cuts.** `transcript_outline`, `read_transcript`, `search_transcript`, `find_hesitations`, `strike_words`, `restore_words`, `correct_words`, `move_passage`, `set_silences`.
- **Looking.** `look_at_source` returns a frame of the raw video, `look_at_montage` the final picture as the viewer sees it. `check_edit` checks the whole edit by code, `check_audio` measures the mix.
- **Zooms and marks.** `list_zooms`, `add_zoom` (with a zone of the screen), `update_zoom`, `remove_zooms`, `add_marker`.
- **Scenes.** `list_layouts`, `get_scene_contract`, `get_scene_examples`, `get_scene_brief`, `measure_scene`, `insert_scene`, `get_scene`, `set_scene_text`, `apply_layout`, `move_broll`, `set_duration`, `set_broll_pip`, `remove_brolls`.
- **Captions and audio.** `get_captions`, `set_captions`, `add_caption`, `list_music`, `set_music`, `list_sfx`, `add_sfx`, `remove_sfx`.

The server also offers a prompt, `monter_une_video`, that starts a full edit of one project.

No tool calls a Brollss model, and none spends credits. The agent you connect does the thinking and the drawing; Brollss does the cutting, the measuring and the rendering. Exporting happens in the Brollss Studio: the server has no export tool yet.

### Rule

`rules/brollss-workflows.mdc` holds the habits that matter: read the editing guide and the whole transcript first, never edit the original, pass `expectedRevision` on every write and send writes one at a time, look at the picture before claiming a result, and finish only when `check_edit` is clean. Cursor loads it. `AGENTS.md` carries the same text for agents that read that file. Claude Code has no rules, so the skills carry the same guidance.

### Skills

- **create-video** creates a project from a file or a link and waits for the transcription.
- **edit-video** runs a full edit: copy, read, cuts, hook, scenes, zooms, marks, captions, music, sound effects, then `check_edit` until clean.
- **add-scenes** draws scenes with the brief, the measure and the insert, and changes the scenes already there.
- **captions-and-audio** sets captions, music and sound effects, then measures the mix.
- **review-edit** reviews an edit without changing it and lists what to fix, with montage times.

## Setup

The server signs you in with OAuth, with no API key to copy. On the first connection your client opens a Brollss page: sign in to your Brollss account and allow the client. From then on, the agent acts as you, on the projects your account can open.

The limits are the ones the Brollss app applies to your account: the number of projects of your plan, the largest file you can import, the gestures the Studio refuses. A refusal from the server gives the same reason the app would.

Install the plugin, or add the bare server, not both. Two connections to the same server under two names mean two sessions that do not know about each other.

### Claude Code

Add this repository as a marketplace, then install the plugin:

```
/plugin marketplace add smfcoder17/brollss-mcp
/plugin install brollss@brollss
```

Claude Code registers the `brollss` server and finds the skills.

For the server alone, without the skills:

```
claude mcp add --transport http brollss https://brollss.com/api/mcp
```

Then ask: "use Brollss to import this video and make a publishable edit", or run the server's prompt `/mcp__brollss__monter_une_video`.

### Cursor

Add this repository as a plugin. Cursor registers the `brollss` server, the `brollss-workflows` rule and the skills.

To install the server alone, open this deep link:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=Brollss&config=eyJ1cmwiOiJodHRwczovL2Jyb2xsc3MuY29tL2FwaS9tY3AifQ==
```

The deep link brings the server only. The rule and the skills come with the plugin.

### Codex

This repository is a Codex marketplace (`.agents/plugins/marketplace.json`) whose one plugin, `brollss`, is the repository root. Add the marketplace, then install the plugin:

```
codex plugin marketplace add smfcoder17/brollss-mcp --ref main
codex plugin add brollss@brollss
```

The plugin signs in when it is installed. To update, refresh the marketplace with `codex plugin marketplace upgrade brollss`. From a local checkout, add the marketplace by its absolute path instead, and install the plugin again after each update: Codex keeps its own copy.

### Other MCP clients

Any client that speaks MCP over HTTP with OAuth works with the bare server at `https://brollss.com/api/mcp`. The rule and the skills do not travel with a bare connection.

## Development

The plugin is written in the Brollss app repository and copied here; changes made only here are overwritten by the next copy.

```
npm run check
```

It needs Node 22 or later and nothing else: no install, no network, no build. It runs the validators' tests (`node --test`), then:

- `scripts/validate-plugin.mjs` checks the Cursor manifest, the paths it names and the frontmatter of the rule and the skills.
- `scripts/validate-portable-plugin.mjs` checks the root manifest and its OpenAI listing, `mcp.json`, each skill's `agents/openai.yaml`, the Codex and Claude Code marketplaces, one version and one license across every manifest.
- `scripts/check-mcp-url.mjs` checks that every server address in the repository, the Cursor deep link included, is `https://brollss.com/api/mcp`.
- `scripts/check-tool-names.mjs` checks that the skills, the rule, `AGENTS.md` and this README name only tools, prompts and parameters listed in `tools.json`.
- `scripts/check-public.mjs` checks that no local address, machine path, test account, app variable or key-shaped string is in any file.

CI runs the same checks, plus `claude plugin validate`, on every push and pull request (`.github/workflows/validate.yml`). See `RELEASE.md` for the version and the publishing steps.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE): the validation scripts, their tests and the CI workflow are adapted from [descriptinc/descript-mcp](https://github.com/descriptinc/descript-mcp), also under the Apache License 2.0.

As section 6 of the license says, it grants no right to use the Brollss name or logo beyond describing where this plugin comes from.

Use of the hosted Brollss server is subject to the Brollss [terms of service](https://brollss.com/legal/terms) and [privacy policy](https://brollss.com/legal/privacy).
