import { definePlugin } from "@utils/types";
import { Parser } from "@webpack/common";
import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { installParserPatch, uninstallParserPatch } from "./patches/parser";
import { makeInlineRenderer } from "./renderer/inlineRender";
import { MdAttachmentAccessory } from "./patches/attachment";
import { settings } from "./settings";
import "./styles/index.css";

export default definePlugin({
  name: "GithubMarkdown",
  description:
    "Renders Discord messages and attached .md files with full GitHub-flavored markdown (tables, task lists, alerts, math, mermaid) and a Raw/Rendered toggle.",
  authors: [{ name: "patrickstaarink", id: 0n }],
  dependencies: ["MessageAccessoriesAPI"],
  settings,
  startAt: "WebpackReady" as const,

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

    if (settings.store.enableMdAttachments) {
      addMessageAccessory("GithubMarkdown", MdAttachmentAccessory, 10);
    }
  },

  stop() {
    if (Parser) uninstallParserPatch(Parser as any);
    removeMessageAccessory("GithubMarkdown");
  },
});
