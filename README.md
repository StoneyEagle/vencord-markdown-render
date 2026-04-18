# vencord-markdown-render

GitHub-flavored markdown rendering for `.md` / `.markdown` attachments inside Discord, via a Vencord userplugin.

<!-- TODO: screenshot of inline + modal render -->

## Features

- GFM tables, strikethrough, task lists, autolinks
- GitHub alerts (`> [!NOTE]`, `> [!WARNING]`, etc.)
- Math via KaTeX (inline `$...$` and block `$$...$$`)
- Mermaid diagrams (lazy-loaded)
- Syntax highlighting via `rehype-highlight`
- Heading anchors with DOM-clobbering-safe `user-content-` id prefix
- Raw / Rendered toggle on every file preview
- Works in both the inline file preview and the fullscreen file-viewer modal

## Install

```
git clone https://github.com/StoneyEagle/vencord-markdown-render.git
cd vencord-markdown-render
node install.js
cd ~/Vencord   # or wherever you installed Vencord (Windows: %USERPROFILE%\Vencord)
pnpm inject    # fully quit Discord first — tray icon too!
```

`install.js` clones Vencord (if needed), copies the plugin into `src/userplugins/`, adds the runtime deps to Vencord's `package.json`, disables Vencord's auto-updater, and runs `pnpm build`. Only `pnpm inject` is left for you because it's interactive — it asks which Discord install (Stable / PTB / Canary / custom) to patch.

## Prerequisites

- Node.js 18 or newer
- git
- pnpm

If you don't have pnpm:

```
npm install -g pnpm
```

(See https://pnpm.io/installation for platform-specific alternatives.)

## Update

```
node update.js
```

Pulls the latest plugin source, re-copies it into Vencord, and rebuilds. Re-run `pnpm inject` afterwards.

## Uninstall

```
node uninstall.js
```

Removes the plugin from `src/userplugins/`. Does not remove the markdown-rendering npm deps from Vencord's `package.json` — other userplugins may use them. The script prints the exact `pnpm remove` command if you want to strip them manually. Re-run `pnpm build && pnpm inject` to drop the plugin from the live bundle.

## Compatibility

Only works with Vencord built from source. Does **not** work with the official Vencord installer (`Vencord.exe` / `VencordInstaller`) — those bundles are immutable. If you previously used the official installer, `pnpm inject` replaces it cleanly; you can go back any time by re-running the installer.

## How it works

A Vencord patch hooks Discord's `FileViewer` module (both the inline preview and the fullscreen modal). When the attachment's filename ends in `.md` or `.markdown`, the plugin pulls the raw text and pipes it through a `unified` pipeline: `remark-parse` → `remark-gfm` + `remark-math` + `remark-mermaidjs` + `remark-github-alerts` → `remark-rehype` (with `allowDangerousHtml`) → `rehype-raw` → `rehype-sanitize` (GitHub-aligned schema) → `rehype-slug` → `rehype-autolink-headings` → `rehype-katex` → `rehype-highlight` → `hast-util-to-jsx-runtime`. A toolbar above the preview toggles between the rendered output and the raw text.

## Known limitations

- Vencord's auto-updater must be disabled or it will overwrite your dev build with the stock release. `install.js` flips the settings flags for you; you can also toggle it in Vencord's settings UI.
- The plugin bundles roughly 400 KB (gzip) of markdown tooling on top of Discord. Desktop-only — don't try to inject this into Vesktop/web where bundle size actually matters.
- Mermaid is lazy-loaded the first time a diagram appears, so the initial render of a mermaid block can have a brief delay.

## License

GPL-3.0-or-later — same as Vencord.

## Credit

Built by [@StoneyEagle](https://github.com/StoneyEagle).
