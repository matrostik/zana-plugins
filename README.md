# Zana Community Plugins

This repository hosts community plugins for [Zana Command Center (ZCC)](https://github.com/salesforce/zana). Each plugin is a self-contained package under `plugins/`, and a marketplace feed lists them so ZCC users can browse and install them.

The marketplace is named `zana-community`. It is separate from the first-party `official` catalog that ships with Zana.

## Repository layout

| Path | Purpose |
| --- | --- |
| `plugins/<id>/` | One self-contained plugin per directory. Contains `package.json` with a `zcc` block, `server.ts`, optional `app.tsx`, and `skills/`. |
| `marketplace/marketplace.json` | The `zana-community` feed that ZCC reads. Lists every plugin with its install source. |
| `marketplace/schema/` | JSON Schema for the feed (planned). |
| `.gitignore` | Keeps secrets, dependencies, and build output out of git. |

The plugin id is derived from the package name. For example, `zcc-plugin-tasks` installs as `tasks`.

## Install a plugin from this marketplace

1. In ZCC, add the marketplace feed. Replace `<owner>` with the GitHub owner of this repository:

   ```bash
   zcc marketplace add https://raw.githubusercontent.com/<owner>/zana-plugins/main/marketplace/marketplace.json
   ```

2. Refresh the catalog and list it:

   ```bash
   zcc marketplace refresh
   zcc marketplace ls
   ```

3. Install a plugin by id:

   ```bash
   zcc marketplace install <plugin-id>@zana-community
   ```

Refreshing the catalog does not run plugin code. Installing records the exact git commit, so you can review what you install.

## Author a plugin

Scaffold a new plugin, then install and iterate on it from its directory:

```bash
zcc plugin new <name> --app
cd zcc-plugin-<name>
zcc plugin install .
zcc plugin dev
```

For the complete end-to-end authoring and architecture guide, see:
👉 **[Plugin Development Guide (Creation, Usage, & Best Practices)](./docs/plugin-guide.md)**

Useful checks while you develop:

```bash
zcc plugin ls              # the plugin should show as running
zcc plugin logs <id> -n 50 # diagnose backend failures
zcc plugin run <id> <cmd>  # exercise a CLI command the plugin registers
```

A minimal `package.json` looks like this:

```json
{
  "name": "zcc-plugin-notes",
  "version": "0.1.0",
  "engines": { "zcc": ">=1.0.0", "zccPluginSdk": ">=0.1.0" },
  "zcc": {
    "name": "Notes",
    "description": "Project notes",
    "branding": { "icon": "Notebook" },
    "server": "./server.ts",
    "app": "./app.tsx"
  }
}
```

Plugins can also declare `skills` (default `["skills"]`), `mcpServers`, and `requires` (other plugin ids they consume). The `zcc` block is strict: unknown keys belong under `extra`, or install fails.

## Publish a plugin to this marketplace

1. Create the plugin in `plugins/<id>/`. Verify it installs and runs locally with the steps above.
2. Add a feed entry to `marketplace/marketplace.json`:

   ```json
   {
     "id": "notes",
     "displayName": "Notes",
     "description": "Short summary shown in the browse list.",
     "overview": "Optional longer markdown for the detail pane.",
     "icon": { "lucide": "Notebook" },
     "tags": ["community"],
     "author": {
       "name": "<your name>",
       "github": "<your github handle>",
       "url": "https://github.com/<your github handle>"
     },
     "source": {
       "git": {
         "url": "https://github.com/<owner>/zana-plugins",
         "subdir": "plugins/notes",
         "ref": "main"
       }
     }
   }
   ```

3. Open a pull request. Maintainers review the code and the feed entry together.

Entry rules:

- `id` must be lowercase letters, digits, and dashes. It must match the directory name under `plugins/` and the `id` derived from the package name.
- `source` must declare `git` or `npm`. This repository uses `git` with `subdir: "plugins/<id>"`.
- `description` is required. `overview` is optional and capped at 4000 characters.

## Rules for contributors

- **Plugins are full-trust code.** After install, a plugin runs in the ZCC server process with access to the host. Review plugin code as you would any code you run.
- **No secrets in git.** Never commit tokens, API keys, or `.env` files. Use the ZCC `secrets` plugin or a local, git-ignored file instead. `.gitignore` already excludes `.env*` (except `.env.example`).
- **Keep plugins self-contained.** A plugin's directory must contain everything it needs to run, except declared dependencies.
- **Document what users must install or sign in to.** For example, a plugin that drives a CLI must say which CLI and how to sign in.

## Reference

- Zana plugin authoring guide: `docs/extensions-authoring.md` in the Zana repository.
- Zana plugin quickstart: `docs/extensions-quickstart.md` in the Zana repository.
- Zana CLI reference (`plugin` and `marketplace` commands): `docs/cli.md` in the Zana repository.
- Official marketplace structure: `marketplace/README.md` in the Zana repository.
- Zana repository: https://github.com/salesforce/zana

## Contributing

Open an issue to discuss larger plugins before writing code. Keep pull requests focused on one plugin or one change to the feed.

<!-- TODO: add contribution workflow, CI checks, and maintainers once the GitHub repository is created. -->

## License

<!-- TODO: choose a license for community plugins and add a LICENSE file. -->
