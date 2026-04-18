import definePlugin from "@utils/types";
import { Parser, useRef, useLayoutEffect, useState } from "@webpack/common";
import ErrorBoundary from "@components/ErrorBoundary";
import { installParserPatch, uninstallParserPatch } from "./patches/parser";
import { makeInlineRenderer } from "./renderer/inlineRender";
import { MarkdownView } from "./components/MarkdownView";
import { settings } from "./settings";
import "./styles/index.css";

// Heuristic: does this text "look like" markdown? Used when we don't have a
// filename at the inline-preview patch site. Loose, but a real .md file almost
// always trips at least one of these. Keep cheap — runs on every file preview.
function looksLikeMarkdown(src: string): boolean {
  if (!src || typeof src !== "string") return false;
  // Cap scan to ~8KB so we don't stall on big files.
  const head = src.length > 8192 ? src.slice(0, 8192) : src;
  return (
    /^\s{0,3}#{1,6}\s+\S/m.test(head) || // ATX heading
    /^\s{0,3}```/m.test(head) ||          // fenced code block
    /^\s{0,3}\|.*\|\s*$/m.test(head) ||   // table row
    /^\s{0,3}[-*_]{3,}\s*$/m.test(head) || // thematic break
    /^\s{0,3}>\s+/m.test(head) ||          // blockquote
    /^\s{0,3}[-*+]\s+\S/m.test(head) ||    // unordered list
    /^\s{0,3}\d+\.\s+\S/m.test(head) ||    // ordered list
    /\[.+?\]\(.+?\)/.test(head) ||         // inline link
    /^\s{0,3}\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]/mi.test(head) // GH alert
  );
}

const MD_LANGS = new Set(["markdown", "md", "mdx"]);

function isMdPreview(props: any): boolean {
  if (!props || typeof props !== "object") return false;
  const lang = typeof props.language === "string" ? props.language.toLowerCase() : "";
  if (MD_LANGS.has(lang)) return true;
  if (typeof props.text === "string" && looksLikeMarkdown(props.text)) return true;
  return false;
}

// Discord's inline preview and fullscreen overlay both call the same
// `function I` preview component. We detect which context we're in by
// measuring the parent's width on mount — inline lives inside a message
// bubble (<800px typical), modal fills a dialog (>=800px).
const InlinePreviewInner = ({ text }: { text: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isModal, setIsModal] = useState(false);
  const [raw, setRaw] = useState(settings.store.defaultView === "raw");
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const inDialog = !!parent.closest('[role="dialog"]');
    const wide = parent.getBoundingClientRect().width >= 800;
    setIsModal(inDialog || wide);
  }, []);
  return (
    <div ref={ref} className={isModal ? "vc-ghmd-modal" : "vc-ghmd-inline-cropped"}>
      <div className="vc-ghmd-toggle" role="tablist">
        <button
          className={`vc-ghmd-toggle-btn${!raw ? " vc-ghmd-toggle-active" : ""}`}
          onClick={() => setRaw(false)}
        >Rendered</button>
        <button
          className={`vc-ghmd-toggle-btn${raw ? " vc-ghmd-toggle-active" : ""}`}
          onClick={() => setRaw(true)}
        >Raw</button>
      </div>
      {raw
        ? <pre className="vc-ghmd-raw"><code>{text}</code></pre>
        : <MarkdownView
            source={text}
            enableMath={settings.store.enableMath}
            enableMermaid={settings.store.enableMermaid}
          />}
    </div>
  );
};

// Kept for future explicit modal patches. Currently unused; the above
// auto-detects via parent size.
const ModalPreviewInner = InlinePreviewInner;

export default definePlugin({
  name: "GithubMarkdown",
  description:
    "Renders Discord messages and attached .md files with full GitHub-flavored markdown (tables, task lists, alerts, math, mermaid), including the FileViewer inline preview and fullscreen modal.",
  authors: [{ name: "patrickstaarink", id: 0n }],
  settings,
  startAt: "WebpackReady" as const,

  patches: [
    {
      find: "#{intl::PREVIEW_BYTES_LEFT}",
      replacement: [
        // Inline preview: wrap the jsx call that renders fileContents+bytesLeft
        // so we can swap in our renderer when the content looks like markdown.
        // Early-return inside Discord's inline preview component. It's
        // `function X(e){let{text:t,language:i,wordWrap:s}=e,...}`.
        // We insert a check that routes markdown files to our renderer.
        // Diagnostic: simple string replacement to confirm the patch
        // infrastructure works on this module at all.
        {
          match: /"PlaintextFilePreview"/,
          replace: "\"PlaintextFilePreview_ghmdOK\""
        },
        // Zero-width insertion at the function body start. The lookahead
        // allows an optional ShikiCodeblocks `return ...;` which would have
        // already been spliced in between `{` and the `let{text:…}` destructure.
        // Our injection runs BEFORE Shiki's early-return, so for .md files we
        // take over; otherwise we fall through to Shiki (or to Discord's
        // native rendering when Shiki is disabled).
        {
          match: /(?<=function \i\((\i)\)\{)(?=(?:return [^;]+;)?let\{text:\i,language:\i,wordWrap:\i\}=\i,)/,
          replace: "const _ghmd=$self.MaybeRender($1,false);if(_ghmd)return _ghmd;"
        }
      ]
    }
  ],

  // Exposed for patch replace strings. On error or non-markdown content, the
  // inner functions return the original jsx, so we never leave the user with a
  // blank preview. The error fallback below also returns `original` so a
  // render-time crash falls back cleanly to Discord's built-in preview.
  InlinePreview: ErrorBoundary.wrap(InlinePreviewInner, { fallback: () => null as any }),
  ModalPreview: ErrorBoundary.wrap(ModalPreviewInner, { fallback: () => null as any }),

  // Called from Discord's patched preview function. Returns a React element
  // if we want to take over rendering, or null to let Discord render normally.
  MaybeRender(props: any, isModal: boolean): any {
    try {
      if (!isMdPreview(props)) return null;
      console.log("[GithubMarkdown] taking over", isModal ? "modal" : "inline", "preview for lang=", props?.language);
      const Cmp = isModal ? this.ModalPreview : this.InlinePreview;
      return (Cmp as any)({ text: props.text });
    } catch (e) {
      console.error("[GithubMarkdown] MaybeRender failed", e);
      return null;
    }
  },

  start() {
    if (settings.store.enableInlineGfm && Parser?.parse) {
      const render = makeInlineRenderer({
        enableMath: settings.store.enableMath,
        enableMermaid: settings.store.enableMermaid,
      });
      installParserPatch(Parser as any, {
        render: (src, state) => render(src, state),
        enableMath: settings.store.enableMath,
        enableMermaid: settings.store.enableMermaid,
      });
    } else if (settings.store.enableInlineGfm) {
      console.warn("[GithubMarkdown] Parser not found — inline GFM disabled.");
    }
  },

  stop() {
    if (Parser) uninstallParserPatch(Parser as any);
  },
});
