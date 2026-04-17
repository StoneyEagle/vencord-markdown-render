# GithubMarkdown

A Vencord **userplugin** that upgrades Discord's markdown to full GitHub-Flavored Markdown (GFM) for message content and attached `.md` files.

## Features

- **GFM everywhere**: tables, task lists, strikethrough, autolinks, footnotes.
- **GitHub alerts**: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`.
- **Syntax highlighting** via `rehype-highlight` (highlight.js) with automatic language detection.
- **Math** (optional, opt-in): `$inline$` and `$$block$$` via `remark-math` + `rehype-katex`.
- **Mermaid diagrams** (optional, opt-in): fenced ` ```mermaid ` blocks.
- **`.md` attachment viewer** with a **Raw / Rendered** toggle.
- **Sanitization** tuned to match GitHub's output: unsafe HTML, `javascript:` URLs, and event handlers are stripped.
- **Heading anchors** using `user-content-` prefixes (matches GitHub).

## Install

1. Clone or copy the `githubMarkdown.desktop/` directory into your Vencord userplugins folder:

   ```
   src/userplugins/githubMarkdown.desktop/
   ```

2. From **inside** the plugin directory, install dependencies:

   ```bash
   cd src/userplugins/githubMarkdown.desktop
   pnpm install
   ```

3. Rebuild Vencord:

   ```bash
   pnpm build
   ```

4. Restart Discord. Enable **GithubMarkdown** in Vencord Settings → Plugins.

## Settings

| Setting | Default | Effect |
| --- | :---: | --- |
| `enableInlineGfm` | on | Render GFM in normal Discord messages (patches `Parser.parse`). Disable to keep message rendering untouched but still handle `.md` attachments. |
| `enableMdAttachments` | on | Register an accessory for `.md`/`.markdown` attachments with a Raw/Rendered toggle. |
| `enableMath` | off | Enable KaTeX math (`$...$`, `$$...$$`). Opt-in because it loads KaTeX. |
| `enableMermaid` | off | Enable mermaid diagrams in fenced code blocks. Opt-in because it dynamically imports the mermaid bundle on first use. |
| `defaultView` | `rendered` | Starting state of the attachment Raw/Rendered toggle. |

## QA / smoke testing

See [`fixtures.md`](./fixtures.md) for copy-pasteable markdown samples that exercise every feature: headings, lists, tables, highlighted code blocks, alerts, math, mermaid, sanitization.

## Development

```bash
cd githubMarkdown.desktop
pnpm install
pnpm test          # run vitest (40 tests)
pnpm exec tsc --noEmit   # type-check
```

Source layout:

- `index.tsx` — `definePlugin` entry, start/stop lifecycle.
- `renderer/` — unified pipeline (remark → rehype → jsx-runtime), sanitize schema, inline renderer adapter.
- `patches/` — `Parser.parse` monkey-patch and `.md` attachment accessory.
- `components/` — React components (`MarkdownView`, `MdAttachment`, `RawToggle`).
- `styles/` — GitHub-style CSS and plugin chrome.
- `tests/` — vitest suite covering pipeline, sanitization, components, Parser patch, feature detection.

## Safety notes

- The sanitize schema is applied **after** `rehype-raw` expands inline HTML, so any raw HTML in user content goes through the same allowlist used by GitHub's public web surface.
- Mermaid and KaTeX are off by default to keep the default bundle small and to avoid running heavy rendering on every message.
- The inline `Parser.parse` patch falls back to Discord's original parser if rendering throws, so a bad input can never take down message display.

## License

Same license as Vencord (GPL-3.0-or-later).
