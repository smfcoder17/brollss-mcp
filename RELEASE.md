# Releasing the plugin

The plugin is written in the Brollss app repository, under `plugins/brollss/`, and published as its own public repository, `smfcoder17/brollss-mcp`. Nothing in either repository publishes anything on its own.

## The version

One version and one license for the whole plugin, written in three manifests:

- `plugin.json`
- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`

`npm run check` fails when they differ. Raise the version when a skill, the rule, `tools.json` or a manifest changes in a way an installed copy should pick up. The plugin's version is not the app's.

## tools.json

`tools.json` is what the server declares: each tool's name, description, parameters and hints, and the prompts. The app repository writes it from its registry with `npm run plugin:tools`, and a test there fails when it falls behind. The plugin's own checks read it, so they run without the app's code.

A skill that names a new tool ships after the app version that serves that tool is in production, never before: an installed skill that calls a missing tool fails in front of the user.

## Publishing the public repository

From the app repository, with the public repository cloned somewhere:

```
npm run plugin:export -- <path of the public clone> --replace
```

The script copies `plugins/brollss/` and nothing else, clears what was in the clone except `.git` (with `--replace`), then runs every check on the copy. Review the diff in the clone, then commit and push it by hand. Keep the package name `brollss`: installed copies depend on it.

## Marketplace listings

The OpenAI app directory, the Cursor plugin directory and the Claude connector directory are separate submissions, each made by hand from this repository's content.
