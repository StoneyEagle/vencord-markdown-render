# GithubMarkdown — Vencord Plugin Design

**Date:** 2026-04-17
**Status:** Approved

## Goal

A drop-in Vencord userplugin that renders Discord message content and attached `.md` files with full GitHub-Flavored Markdown (GFM) parity, matching github.com / gist.github.com rendering semantics and visual style.

## Scope

- **In:** inline chat messages, attached `.md` / `.markdown` files, full GFM (tables, task lists, strikethrough, autolinks, footnotes, alerts, math, mermaid), Raw/Rendered toggle for attachments, auto light/dark theme match to Discord.
- **Out:** editing, emoji shortcodes, image proxying, custom themes, non-desktop platforms.

## Plugin shape

Userplugin folder `src/userplugins/githubMarkdown.desktop/` following Vencord conventions (see `shikiCodeblocks.desktop` for reference).

```
githubMarkdown.desktop/
  index.tsx              # definePlugin, patches, lifecycle
  settings.ts            # definePluginSettings
  renderer/
    pipeline.ts          # unified/remark/rehype pipeline builder
    sanitize.ts          # GitHub-schema sanitizer config
    featureDetect.ts     # cheap regex pre-check
  components/
    MarkdownView.tsx     # main React component
    RawToggle.tsx        # Raw/Rendered switch
    MdAttachment.tsx     # attached .md file viewer
  patches/
    parser.ts            # monkey-patch Discord Parser.parse
    attachment.ts        # MessageAccessory registration
  styles/
    github.css           # Primer-derived stylesheet (light+dark vars)
    plugin.css           # .vc-ghmd-* container styles
  tests/
    fixtures.md          # manual QA fixture covering every feature
    pipeline.test.ts     # vitest snapshot tests
    feature-detect.test.ts
  README.md              # install + manual QA checklist
  package.json           # dependency list
```

**Delivery:** plugin folder dropped into user's Vencord fork, then `pnpm i && pnpm build && pnpm inject`.

## Rendering pipeline

Unified ecosystem (closest JS approximation of GitHub's `cmark-gfm` + html-pipeline):

- `unified` + `remark-parse` + `remark-gfm`
- `remark-github-alerts` — `> [!NOTE|TIP|WARNING|CAUTION|IMPORTANT]`
- `remark-math` + `rehype-katex`
- `remark-mermaidjs` (or `rehype-mermaid`) — mermaid fenced blocks
- `rehype-raw` — allow inline HTML (GitHub permits)
- `rehype-sanitize` with `github-schema` — match GitHub allowlist
- `rehype-slug` + `rehype-autolink-headings` — GitHub heading anchors
- `rehype-highlight` via Shiki — reuse `ShikiCodeblocks` engine if loaded, else bundled copy
- `hast-util-to-jsx-runtime` — React output, no `dangerouslySetInnerHTML`

## Integration points

### 1. Inline chat — runtime Parser monkey-patch

`startAt: WebpackReady`. Import `Parser` from `@webpack/common`. In `start()`:

```ts
const orig = Parser.parse;
Parser.parse = (content, inline, state) => {
  try {
    if (hasGfmFeature(content)) return renderGithub(content, state);
  } catch (e) { console.error("[GithubMarkdown]", e); }
  return orig.call(Parser, content, inline, state);
};
```

`stop()` restores `orig`. No esbuild `patches` entry — runtime override is more resilient to Discord updates than regex patches.

### 2. `.md` attachments — MessageAccessory API

```ts
dependencies: ["MessageAccessoriesAPI"],
start() { addMessageAccessory("GithubMarkdown", MdAttachmentAccessory, 10); },
stop()  { removeMessageAccessory("GithubMarkdown"); },
```

`MdAttachmentAccessory` inspects `props.message.attachments`, picks those matching `/\.(md|markdown)$/i`, fetches `attachment.url` (cached by `attachment.id` in a `Map`), renders `MarkdownView` + `RawToggle`. Discord's default download card remains visible; our render appears below it.

### 3. Feature-detection regex (perf gate)

```ts
const GFM_DETECT = [
  /^\s*\|.*\|.*\n\s*\|[\s\-:|]+\|/m,           // table
  /^- \[[ xX]\] /m,                              // task list
  /^> \[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]/mi, // alert
  /\$\$|\\\\\[|\\\\\(/,                          // math
  /^```mermaid/m,                                // mermaid
  /\[\^[\w-]+\]/,                                // footnote ref
];
function hasGfmFeature(s: string) { return GFM_DETECT.some(r => r.test(s)); }
```

Plain messages skip the pipeline entirely. 99% of chat has zero overhead.

## Settings

Via `definePluginSettings`:

| key | type | default |
|---|---|---|
| `enableInlineGfm` | boolean | `true` |
| `enableMdAttachments` | boolean | `true` |
| `defaultView` | `"rendered" \| "raw"` | `"rendered"` |
| `enableMath` | boolean | `true` |
| `enableMermaid` | boolean | `true` |
| `followDiscordTheme` | boolean | `true` |

## Theming

Discord CSS vars mapped to Primer-equivalent tokens inside `.vc-ghmd-root`:

```css
.vc-ghmd-root {
  --color-fg-default: var(--text-normal);
  --color-canvas-subtle: var(--background-secondary);
  --color-border-default: var(--background-modifier-accent);
  /* ...etc */
}
```

Light/dark auto-match via Discord's theme class on `<html>`.

## Error handling

- Pipeline throws → fall back to original `Parser.parse`.
- Attachment fetch fails → Discord default card + inline error banner.
- Mermaid / KaTeX parse error → render source in red-bordered error box (mirrors GitHub).
- `Parser` missing after `waitFor` → log warn, disable inline patch, keep attachments working.
- Plugin `stop()` fully reverses all side effects.

## Testing

1. **`tests/fixtures.md`** — single file exercising every GFM feature. Manual QA.
2. **`tests/pipeline.test.ts`** — vitest snapshot tests (input → HTML).
3. **`tests/feature-detect.test.ts`** — regex correctness, no false positives on plain prose / single `|` chars.
4. **Manual QA checklist** in README: enable/disable, toggle each setting, send each fixture, open .md attachment, switch Raw/Rendered, light/dark check.

No integration tests inside Vencord — follows Vencord convention (no plugin test harness exists).

## Non-goals

- Editing or submitting markdown — read-only viewer.
- Emoji shortcode expansion (`:sparkles:`) — Discord handles.
- Image proxying through GitHub Camo — Discord CDN stays.
- Non-desktop (web) build — `.desktop` suffix excludes it.
- Auto-enabling ShikiCodeblocks — user keeps independent control.

## References

- [Vencord docs — plugins](https://docs.vencord.dev/plugins/)
- [Vencord docs — custom plugins install](https://docs.vencord.dev/installing/custom-plugins/)
- [ShikiCodeblocks plugin](https://github.com/Vendicated/Vencord/tree/main/src/plugins/shikiCodeblocks.desktop) — reference for engine-heavy plugin
- [MessageLinkEmbeds plugin](https://github.com/Vendicated/Vencord/tree/main/src/plugins/messageLinkEmbeds) — reference for accessory API usage
- [`src/utils/types.ts`](https://github.com/Vendicated/Vencord/blob/main/src/utils/types.ts) — `PluginDef` shape
